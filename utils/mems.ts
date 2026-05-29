import type { SupabaseClient } from "@supabase/supabase-js";

export type Mem = {
  id: string;
  card_id: string;
  author_id: string;
  text: string;
  helpful_count: number;
  created_at: string;
  profiles: { username: string; display_name: string | null } | null;
};

const SELECT = "id, card_id, author_id, text, helpful_count, created_at, profiles!author_id(username, display_name)";

export async function getTopMems(supabase: SupabaseClient, cardId: string, limit = 2): Promise<Mem[]> {
  const { data } = await supabase
    .from("mems")
    .select(SELECT)
    .eq("card_id", cardId)
    .order("helpful_count", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as Mem[];
}

export async function countMems(supabase: SupabaseClient, cardId: string): Promise<number> {
  const { count } = await supabase
    .from("mems")
    .select("*", { count: "exact", head: true })
    .eq("card_id", cardId);
  return count ?? 0;
}

export async function getUserMem(supabase: SupabaseClient, cardId: string, userId: string): Promise<Mem | null> {
  const { data } = await supabase
    .from("mems")
    .select(SELECT)
    .eq("card_id", cardId)
    .eq("author_id", userId)
    .maybeSingle();
  return (data as unknown as Mem | null) ?? null;
}

export async function createMem(supabase: SupabaseClient, cardId: string, userId: string, text: string): Promise<Mem> {
  const { data, error } = await supabase
    .from("mems")
    .insert({ card_id: cardId, author_id: userId, text: text.trim().slice(0, 200) })
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Mem;
}

export async function updateMem(supabase: SupabaseClient, memId: string, userId: string, text: string): Promise<Mem> {
  const { data, error } = await supabase
    .from("mems")
    .update({ text: text.trim().slice(0, 200) })
    .eq("id", memId)
    .eq("author_id", userId)
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as unknown as Mem;
}

export async function deleteMem(supabase: SupabaseClient, memId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("mems")
    .delete()
    .eq("id", memId)
    .eq("author_id", userId);
  if (error) throw error;
}

// Returns true if vote was cast, false if already voted (duplicate PK)
export async function voteMem(supabase: SupabaseClient, memId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("mem_votes")
    .insert({ mem_id: memId, user_id: userId });
  // The DB trigger increments helpful_count automatically
  return !error;
}

// Returns true if vote was removed
export async function unvoteMem(supabase: SupabaseClient, memId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("mem_votes")
    .delete()
    .eq("mem_id", memId)
    .eq("user_id", userId);
  // The DB trigger decrements helpful_count automatically
  return !error;
}

export async function hasVoted(supabase: SupabaseClient, memId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("mem_votes")
    .select("mem_id")
    .eq("mem_id", memId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function getVotedMemIds(supabase: SupabaseClient, memIds: string[], userId: string): Promise<Set<string>> {
  if (memIds.length === 0) return new Set();
  const { data } = await supabase
    .from("mem_votes")
    .select("mem_id")
    .eq("user_id", userId)
    .in("mem_id", memIds);
  return new Set((data ?? []).map((r: { mem_id: string }) => r.mem_id));
}
