/**
 * Migrates item media from the old flat `course-media` bucket to the new
 * per-visibility buckets: `course-media-public` and `course-media-private`.
 *
 * Before running, add your Supabase service role key to .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 * (Find it in Supabase dashboard → Settings → API → service_role key)
 *
 * Run from the project root:
 *   node --env-file=.env.local scripts/migrate-storage.mjs
 *
 * The script is idempotent — items already migrated (non-https URLs) are skipped.
 * Old files in course-media are preserved after migration so you can verify first.
 */

import { createClient } from "@supabase/supabase-js";

const OLD_BUCKET = "course-media";
const PUBLIC_BUCKET = "public-course-assets";
const PRIVATE_BUCKET = "private-course-assets";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env vars. Make sure .env.local has:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL=...");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=...");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function bucketForVisibility(visibility) {
  return visibility === "private" ? PRIVATE_BUCKET : PUBLIC_BUCKET;
}

function buildStoragePath(bucket, objectPath) {
  return `${bucket}:${objectPath}`;
}

// Extract the object path from a legacy public URL
// e.g. https://<project>.supabase.co/storage/v1/object/public/course-media/items/xxx.jpg
//   -> items/xxx.jpg
function extractObjectPath(publicUrl, bucket) {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

async function migrateUrl(publicUrl, courseId, visibility) {
  const oldPath = extractObjectPath(publicUrl, OLD_BUCKET);
  if (!oldPath) {
    console.warn(`  Could not parse path from URL: ${publicUrl}`);
    return null;
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(OLD_BUCKET)
    .download(oldPath);
  if (downloadError || !fileData) {
    console.warn(`  Download failed for ${oldPath}: ${downloadError?.message}`);
    return null;
  }

  const ext = oldPath.split(".").pop() ?? "bin";
  const fileId = oldPath.split("/").pop()?.replace(`.${ext}`, "") ?? crypto.randomUUID();
  const newObjectPath = `courses/${courseId}/items/${fileId}.${ext}`;
  const targetBucket = bucketForVisibility(visibility);

  const { error: uploadError } = await supabase.storage
    .from(targetBucket)
    .upload(newObjectPath, fileData, { contentType: fileData.type, upsert: true });
  if (uploadError) {
    console.warn(`  Upload failed for ${newObjectPath}: ${uploadError.message}`);
    return null;
  }

  return buildStoragePath(targetBucket, newObjectPath);
}

async function main() {
  console.log("Fetching courses...");
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, visibility");

  if (coursesError || !courses) {
    console.error("Failed to fetch courses:", coursesError?.message);
    process.exit(1);
  }

  const visibilityMap = new Map(courses.map((c) => [c.id, c.visibility]));
  console.log(`Found ${courses.length} courses.`);

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, course_id, image_url, front_audio_url, back_audio_url");

  if (itemsError || !items) {
    console.error("Failed to fetch items:", itemsError?.message);
    process.exit(1);
  }

  const legacyItems = items.filter(
    (i) =>
      (i.image_url && i.image_url.startsWith("https://")) ||
      (i.front_audio_url && i.front_audio_url.startsWith("https://")) ||
      (i.back_audio_url && i.back_audio_url.startsWith("https://"))
  );

  console.log(`Found ${legacyItems.length} items with legacy URLs to migrate.`);
  if (legacyItems.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let migrated = 0;
  let failed = 0;

  for (const item of legacyItems) {
    const visibility = visibilityMap.get(item.course_id) ?? "public";
    console.log(`\nMigrating item ${item.id} (${visibility})...`);

    const updates = {};

    if (item.image_url?.startsWith("https://")) {
      const newPath = await migrateUrl(item.image_url, item.course_id, visibility);
      if (newPath) { updates.image_url = newPath; console.log(`  image -> ${newPath}`); }
      else failed++;
    }

    if (item.front_audio_url?.startsWith("https://")) {
      const newPath = await migrateUrl(item.front_audio_url, item.course_id, visibility);
      if (newPath) { updates.front_audio_url = newPath; console.log(`  front_audio -> ${newPath}`); }
      else failed++;
    }

    if (item.back_audio_url?.startsWith("https://")) {
      const newPath = await migrateUrl(item.back_audio_url, item.course_id, visibility);
      if (newPath) { updates.back_audio_url = newPath; console.log(`  back_audio -> ${newPath}`); }
      else failed++;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("items")
        .update(updates)
        .eq("id", item.id);
      if (updateError) {
        console.error(`  DB update failed: ${updateError.message}`);
        failed++;
      } else {
        migrated++;
      }
    }
  }

  console.log(`\nDone. Migrated: ${migrated} items, Failed: ${failed} files.`);
  console.log("Old files in course-media are preserved. Delete them manually once verified.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
