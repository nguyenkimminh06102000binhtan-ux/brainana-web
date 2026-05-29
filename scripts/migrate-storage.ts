/**
 * Migrates item media from the old flat `course-media` bucket to the new
 * per-visibility buckets: `course-media-public` and `course-media-private`.
 *
 * Run with:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> ts-node --project tsconfig.json scripts/migrate-storage.ts
 *
 * Or with tsx:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/migrate-storage.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 * Uses the service role key so it can bypass RLS and access all buckets.
 *
 * The script is idempotent — items already migrated (non-https URLs) are skipped.
 */

import { createClient } from "@supabase/supabase-js";

const OLD_BUCKET = "course-media";
const PUBLIC_BUCKET = "course-media-public";
const PRIVATE_BUCKET = "course-media-private";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function bucketForVisibility(visibility: string): string {
  return visibility === "private" ? PRIVATE_BUCKET : PUBLIC_BUCKET;
}

function buildStoragePath(bucket: string, objectPath: string): string {
  return `${bucket}:${objectPath}`;
}

// Extract the object path from a legacy public URL
// e.g. https://<project>.supabase.co/storage/v1/object/public/course-media/items/xxx.jpg
//   -> items/xxx.jpg
function extractObjectPath(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

async function migrateUrl(
  publicUrl: string,
  courseId: string,
  visibility: string,
): Promise<string | null> {
  const oldPath = extractObjectPath(publicUrl, OLD_BUCKET);
  if (!oldPath) {
    console.warn(`  Could not parse path from URL: ${publicUrl}`);
    return null;
  }

  // Download from old bucket
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(OLD_BUCKET)
    .download(oldPath);
  if (downloadError || !fileData) {
    console.warn(`  Download failed for ${oldPath}: ${downloadError?.message}`);
    return null;
  }

  // New path under organized structure
  const ext = oldPath.split(".").pop() ?? "bin";
  const fileId = oldPath.split("/").pop()?.replace(`.${ext}`, "") ?? crypto.randomUUID();
  const newObjectPath = `courses/${courseId}/items/${fileId}.${ext}`;
  const targetBucket = bucketForVisibility(visibility);

  // Upload to new bucket
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

  const visibilityMap = new Map(courses.map((c) => [c.id, c.visibility as string]));
  console.log(`Found ${courses.length} courses.`);

  // Fetch all items that still have legacy URLs (https://...)
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

  let migrated = 0;
  let failed = 0;

  for (const item of legacyItems) {
    const visibility = visibilityMap.get(item.course_id) ?? "public";
    console.log(`\nMigrating item ${item.id} (course ${item.course_id}, ${visibility})...`);

    const updates: Record<string, string | null> = {};

    if (item.image_url?.startsWith("https://")) {
      console.log(`  image_url: ${item.image_url.slice(-40)}`);
      const newPath = await migrateUrl(item.image_url, item.course_id, visibility);
      if (newPath) {
        updates.image_url = newPath;
        console.log(`  -> ${newPath}`);
      } else {
        failed++;
      }
    }

    if (item.front_audio_url?.startsWith("https://")) {
      console.log(`  front_audio_url: ${item.front_audio_url.slice(-40)}`);
      const newPath = await migrateUrl(item.front_audio_url, item.course_id, visibility);
      if (newPath) {
        updates.front_audio_url = newPath;
        console.log(`  -> ${newPath}`);
      } else {
        failed++;
      }
    }

    if (item.back_audio_url?.startsWith("https://")) {
      console.log(`  back_audio_url: ${item.back_audio_url.slice(-40)}`);
      const newPath = await migrateUrl(item.back_audio_url, item.course_id, visibility);
      if (newPath) {
        updates.back_audio_url = newPath;
        console.log(`  -> ${newPath}`);
      } else {
        failed++;
      }
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

  console.log(`\nDone. Migrated: ${migrated}, Failed: ${failed}`);
  console.log("Note: old files in course-media are preserved. Delete manually once verified.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
