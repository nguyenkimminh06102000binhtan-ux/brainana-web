/**
 * Recalculates learner_count for all courses from user_courses.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (bypasses RLS).
 *
 * Usage: node --env-file=.env.local scripts/fix-learner-counts.mjs
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: rows, error } = await supabase
  .from("user_courses")
  .select("course_id");

if (error) { console.error("Failed to fetch user_courses:", error.message); process.exit(1); }

const counts = {};
for (const { course_id } of rows) {
  counts[course_id] = (counts[course_id] ?? 0) + 1;
}

// Zero out courses with no learners too
const { data: allCourses } = await supabase.from("courses").select("id");
for (const { id } of allCourses ?? []) {
  if (!(id in counts)) counts[id] = 0;
}

let updated = 0;
for (const [course_id, learner_count] of Object.entries(counts)) {
  const { error: e } = await supabase
    .from("courses")
    .update({ learner_count })
    .eq("id", course_id);
  if (e) console.error(`Failed to update ${course_id}:`, e.message);
  else updated++;
}

console.log(`Updated learner_count for ${updated} courses.`);
