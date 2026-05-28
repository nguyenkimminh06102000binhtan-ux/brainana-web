-- Add subcategory column to courses
-- category = top-level group (e.g. "Languages")
-- subcategory = specific item within that group (e.g. "Japanese")
ALTER TABLE courses ADD COLUMN IF NOT EXISTS subcategory text;
