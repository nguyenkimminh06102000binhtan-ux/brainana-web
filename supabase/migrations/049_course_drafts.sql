-- Cloud-backed course drafts for create/edit autosave.
-- Drafts are private to the owning user and keyed by workflow
-- (for example: "create" or "edit:<course_id>").

CREATE TABLE IF NOT EXISTS public.course_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_key text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT course_drafts_user_key_unique UNIQUE (user_id, draft_key),
  CONSTRAINT course_drafts_key_length_check CHECK (char_length(draft_key) BETWEEN 1 AND 160),
  CONSTRAINT course_drafts_payload_object_check CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS course_drafts_user_updated_idx
  ON public.course_drafts (user_id, updated_at DESC);

ALTER TABLE public.course_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own course drafts" ON public.course_drafts;
DROP POLICY IF EXISTS "Users can insert own course drafts" ON public.course_drafts;
DROP POLICY IF EXISTS "Users can update own course drafts" ON public.course_drafts;
DROP POLICY IF EXISTS "Users can delete own course drafts" ON public.course_drafts;

CREATE POLICY "Users can read own course drafts"
  ON public.course_drafts
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own course drafts"
  ON public.course_drafts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own course drafts"
  ON public.course_drafts
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own course drafts"
  ON public.course_drafts
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

COMMENT ON TABLE public.course_drafts IS
  'Private cloud autosave payloads for create/edit course forms.';
