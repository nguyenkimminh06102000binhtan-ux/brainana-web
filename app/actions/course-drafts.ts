"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { DraftState } from "@/types/course-draft";

const DRAFT_KEY_RE = /^(create|edit:[0-9a-fA-F-]{36})$/;
const MAX_DRAFT_BYTES = 1_000_000;

export type CloudDraft = DraftState & { savedAt: number };

function validateDraftKey(draftKey: string) {
  if (!DRAFT_KEY_RE.test(draftKey)) {
    throw new Error("Invalid draft key");
  }
}

function validateDraftPayload(payload: DraftState) {
  const encoded = JSON.stringify(payload);
  if (encoded.length > MAX_DRAFT_BYTES) {
    throw new Error("Draft is too large to autosave");
  }
  if (!Array.isArray(payload.sections)) {
    throw new Error("Invalid draft payload");
  }
}

export async function loadCourseDraft(draftKey: string): Promise<CloudDraft | null> {
  validateDraftKey(draftKey);

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("course_drafts")
    .select("payload, updated_at")
    .eq("user_id", user.id)
    .eq("draft_key", draftKey)
    .maybeSingle();

  if (error) throw new Error(`Failed to load draft: ${error.message}`);
  if (!data) return null;

  return {
    ...(data.payload as DraftState),
    savedAt: new Date(data.updated_at as string).getTime(),
  };
}

export async function saveCourseDraft(draftKey: string, payload: DraftState): Promise<{ savedAt: number }> {
  validateDraftKey(draftKey);
  validateDraftPayload(payload);

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("course_drafts")
    .upsert({
      user_id: user.id,
      draft_key: draftKey,
      payload,
      updated_at: now,
    }, { onConflict: "user_id,draft_key" })
    .select("updated_at")
    .single();

  if (error) throw new Error(`Failed to save draft: ${error.message}`);
  return { savedAt: new Date((data?.updated_at as string | undefined) ?? now).getTime() };
}

export async function deleteCourseDraft(draftKey: string): Promise<void> {
  validateDraftKey(draftKey);

  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("course_drafts")
    .delete()
    .eq("user_id", user.id)
    .eq("draft_key", draftKey);

  if (error) throw new Error(`Failed to delete draft: ${error.message}`);
}
