import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PUBLIC_BUCKET, isLegacyUrl, parseStoragePath } from "./storage";

const SIGNED_URL_EXPIRY = 7200; // 2 hours

export async function resolveMediaUrl(
  value: string | null,
  supabase: SupabaseClient,
): Promise<string | null> {
  if (!value) return null;
  if (isLegacyUrl(value)) return value;

  const parsed = parseStoragePath(value);
  if (!parsed) return null;

  const { bucket, objectPath } = parsed;

  if (bucket === PUBLIC_BUCKET) {
    return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  }

  const { data } = await supabase.storage.from(bucket).createSignedUrl(objectPath, SIGNED_URL_EXPIRY);
  return data?.signedUrl ?? null;
}
