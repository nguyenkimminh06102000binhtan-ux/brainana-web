-- The profile hardening migration restricted UPDATE to a safe column list, but
-- missed origin_languages. Onboarding and the origin-language switcher both
-- update this column for the authenticated user.

GRANT UPDATE (
  origin_languages
) ON profiles TO authenticated;
