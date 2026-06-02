-- Make auth user creation resilient to profile username collisions.
--
-- Supabase Auth inserts into auth.users, then this trigger creates public.profiles.
-- The previous trigger used the email local part as username directly. If a
-- username already existed, the unique constraint on profiles.username raised
-- an error and Auth surfaced only "Database error creating new user".

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  base_username := lower(regexp_replace(
    COALESCE(
      NULLIF(new.raw_user_meta_data->>'username', ''),
      NULLIF(split_part(COALESCE(new.email, ''), '@', 1), ''),
      'user'
    ),
    '[^a-zA-Z0-9_]+',
    '-',
    'g'
  ));
  base_username := trim(both '-' from base_username);

  IF base_username = '' THEN
    base_username := 'user';
  END IF;

  final_username := left(base_username, 32);

  BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
      new.id,
      final_username,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, ''), '@', 1), final_username),
      new.raw_user_meta_data->>'avatar_url'
    );
  EXCEPTION WHEN unique_violation THEN
    final_username := left(base_username, 23) || '-' || left(new.id::text, 8);

    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
      new.id,
      final_username,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, ''), '@', 1), final_username),
      new.raw_user_meta_data->>'avatar_url'
    );
  END;

  RETURN new;
END;
$$;
