import type { Tables } from "@/database.types";

export type Course = Tables<"courses">;
export type Profile = Tables<"profiles">;
export type UserCourse = Tables<"user_courses">;
export type Item = Tables<"items">;
export type Level = Tables<"levels">;
export type StudySession = Tables<"study_sessions">;
export type XpLog = Tables<"xp_logs">;

export type CourseWithCreator = Course & {
  profiles: Pick<Profile, "username" | "display_name"> | null;
};
