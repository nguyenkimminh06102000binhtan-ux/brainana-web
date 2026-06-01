-- Migration 029: Normalize language values and add CHECK constraints
--
-- Part 1: Normalize old/variant language names to the canonical list
--         (e.g. "English (UK)" → "English", "Cantonese" → "Chinese (Cantonese)")
-- Part 2: Add CHECK constraints on language columns so invalid strings
--         can never enter the DB again.
--
-- Canonical list = 82 languages with locale files + 14 course-only languages.

-- ── Part 1: Normalize profiles ────────────────────────────────────────────────

-- Helper: map old name → canonical name (NULL means remove/set to null)
CREATE OR REPLACE FUNCTION _normalize_language(lang text) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lang
    WHEN 'English (UK)'              THEN 'English'
    WHEN 'English (US)'              THEN 'English'
    WHEN 'Arabic (Modern Standard)'  THEN 'Arabic'
    WHEN 'Arabic (Egyptian)'         THEN 'Arabic'
    WHEN 'Arabic (Gulf)'             THEN 'Arabic'
    WHEN 'Arabic (Levantine)'        THEN 'Arabic'
    WHEN 'Persian (Farsi)'           THEN 'Persian'
    WHEN 'Filipino/Tagalog'          THEN 'Filipino (Tagalog)'
    WHEN 'Cantonese'                 THEN 'Chinese (Cantonese)'
    WHEN 'Mandarin (Simplified)'     THEN 'Chinese (Mandarin)'
    WHEN 'Mandarin (Traditional)'    THEN 'Chinese (Mandarin)'
    WHEN 'Mandarin (Spoken Only)'    THEN 'Chinese (Mandarin)'
    WHEN 'Biblical Hebrew'           THEN 'Hebrew'
    WHEN 'Kanji'                     THEN NULL
    WHEN 'Pali'                      THEN NULL
    WHEN 'Tongan'                    THEN NULL
    WHEN 'Klingon'                   THEN NULL
    WHEN 'High Valyrian'             THEN NULL
    WHEN 'Korean Sign Language'      THEN NULL
    WHEN 'Japanese Sign Language'    THEN NULL
    ELSE lang
  END;
$$;

-- Normalize profiles.native_language
UPDATE profiles
SET native_language = _normalize_language(native_language)
WHERE native_language IS NOT NULL;

-- Normalize profiles.active_origin_language
UPDATE profiles
SET active_origin_language = _normalize_language(active_origin_language)
WHERE active_origin_language IS NOT NULL;

-- Normalize each element of profiles.origin_languages[]
UPDATE profiles
SET origin_languages = ARRAY(
  SELECT _normalize_language(lang)
  FROM unnest(origin_languages) AS lang
  WHERE _normalize_language(lang) IS NOT NULL
)
WHERE origin_languages IS NOT NULL AND array_length(origin_languages, 1) > 0;

-- ── Normalize courses ─────────────────────────────────────────────────────────

-- For course source/target we keep the course-only languages (Latin, Sanskrit, etc.)
-- but still fix the dialect variants.
CREATE OR REPLACE FUNCTION _normalize_course_language(lang text) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lang
    WHEN 'English (UK)'              THEN 'English'
    WHEN 'English (US)'              THEN 'English'
    WHEN 'Arabic (Modern Standard)'  THEN 'Arabic'
    WHEN 'Arabic (Egyptian)'         THEN 'Arabic'
    WHEN 'Arabic (Gulf)'             THEN 'Arabic'
    WHEN 'Arabic (Levantine)'        THEN 'Arabic'
    WHEN 'Persian (Farsi)'           THEN 'Persian'
    WHEN 'Filipino/Tagalog'          THEN 'Filipino (Tagalog)'
    WHEN 'Cantonese'                 THEN 'Chinese (Cantonese)'
    WHEN 'Mandarin (Simplified)'     THEN 'Chinese (Mandarin)'
    WHEN 'Mandarin (Traditional)'    THEN 'Chinese (Mandarin)'
    WHEN 'Mandarin (Spoken Only)'    THEN 'Chinese (Mandarin)'
    WHEN 'Kanji'                     THEN NULL
    WHEN 'Pali'                      THEN NULL
    WHEN 'Tongan'                    THEN NULL
    WHEN 'Klingon'                   THEN NULL
    WHEN 'High Valyrian'             THEN NULL
    WHEN 'Korean Sign Language'      THEN NULL
    WHEN 'Japanese Sign Language'    THEN NULL
    ELSE lang
  END;
$$;

UPDATE courses SET source_language = _normalize_course_language(source_language) WHERE source_language IS NOT NULL;
UPDATE courses SET target_language = _normalize_course_language(target_language) WHERE target_language IS NOT NULL;

-- Normalize subcategory for courses in the "Languages" category
UPDATE courses
SET subcategory = _normalize_course_language(subcategory)
WHERE category = 'Languages' AND subcategory IS NOT NULL;

-- ── Normalize category/subcategory renames ────────────────────────────────────

UPDATE courses SET category = CASE category
  WHEN 'Arts & Literature'    THEN 'Arts & Humanities'
  WHEN 'Maths & Science'      THEN 'Science & Mathematics'
  WHEN 'History & Geography'  THEN 'History & Society'
  WHEN 'The Natural World'    THEN 'Nature & Environment'
  WHEN 'Professional & Careers' THEN 'Business & Careers'
  WHEN 'Memory Training'      THEN 'Memory & Study Skills'
  WHEN 'Entertainment'        THEN 'Entertainment & Pop Culture'
  WHEN 'Trivia'               THEN 'Trivia & General Knowledge'
  ELSE category
END
WHERE category IS NOT NULL;

UPDATE courses SET subcategory = CASE subcategory
  -- Arts & Humanities subcategory renames
  WHEN 'Philosophy'           THEN 'Philosophy & Ethics'
  WHEN 'Film & TV'            THEN 'Film & Television'
  -- Science & Mathematics renames (remove duplicates, normalize)
  WHEN 'Earth Science'        THEN 'Earth Sciences'
  WHEN 'Statistics'           THEN 'Data Science & Statistics'
  WHEN 'Astronomy'            THEN 'Astronomy & Space'
  WHEN 'Health Sciences'      THEN 'Medicine & Healthcare'
  -- These were duplicates in old Professional; map to Science
  WHEN 'Computer Science & IT' THEN 'Computer Science'
  -- History & Society renames
  WHEN 'Religion'             THEN 'Religion & Theology'
  WHEN 'Mythology'            THEN 'Mythology & Folklore'
  WHEN 'World Geography'      THEN 'Maps & Geography'
  WHEN 'Maps & Flags'         THEN 'Maps & Geography'
  -- Nature & Environment renames
  WHEN 'Animals'              THEN 'Animals & Wildlife'
  WHEN 'Ecology'              THEN 'Ecology & Conservation'
  WHEN 'Fruits & Vegetables'  THEN 'Food & Agriculture'
  WHEN 'Astronomy & Space'    THEN 'Astronomy & Space'  -- was duplicate, now only in Science
  -- Health & Wellness renames (moved from Entertainment/Professional)
  WHEN 'Cooking & Recipes'    THEN 'Cooking & Nutrition'
  WHEN 'Sports'               THEN 'Sports & Athletics'
  -- Business & Careers renames
  WHEN 'Business & Finance'   THEN 'Business & Management'
  WHEN 'Accounting'           THEN 'Accounting & Finance'
  -- Memory & Study Skills renames
  WHEN 'Playing Card Systems' THEN 'Mnemonics'
  WHEN 'Name & Face Memory'   THEN 'Memory Palaces'
  -- Trivia renames
  WHEN 'Art, Music & Literature' THEN 'Art & Culture'
  WHEN 'Miscellaneous'        THEN 'General Knowledge'
  WHEN 'Geography'            THEN 'Geography Quiz'
  WHEN 'History'              THEN 'History Quiz'
  WHEN 'Science & Nature'     THEN 'Nature & Science Quiz'
  WHEN 'Sports & Leisure'     THEN 'Sports Quiz'
  -- Entertainment renames
  WHEN 'Board Games'          THEN 'Board & Card Games'
  WHEN 'Card Games'           THEN 'Board & Card Games'
  ELSE subcategory
END
WHERE subcategory IS NOT NULL;

-- ── Part 2: CHECK constraints ─────────────────────────────────────────────────

-- Valid native/origin language values (82 locale-backed languages + "Other")
ALTER TABLE profiles
  ADD CONSTRAINT check_native_language CHECK (
    native_language IS NULL OR native_language = ANY(ARRAY[
      'Afrikaans','Albanian','Amharic','Arabic','Armenian','Azerbaijani',
      'Basque','Belarusian','Bengali','Bosnian','Bulgarian',
      'Catalan','Chinese (Cantonese)','Chinese (Mandarin)','Croatian','Czech',
      'Danish','Dutch','English','Estonian',
      'Filipino (Tagalog)','Finnish','French',
      'Galician','Georgian','German','Greek','Gujarati',
      'Hausa','Hebrew','Hindi','Hungarian',
      'Icelandic','Indonesian','Irish','Italian',
      'Japanese','Javanese',
      'Kannada','Kazakh','Khmer','Korean','Kurdish',
      'Lao','Latvian','Lithuanian',
      'Macedonian','Malay','Malayalam','Maltese','Maori','Marathi','Mongolian',
      'Nepali','Norwegian',
      'Pashto','Persian','Polish','Portuguese','Punjabi',
      'Romanian','Russian',
      'Serbian','Sinhala','Slovak','Slovenian','Somali','Spanish','Swahili','Swedish',
      'Tajik','Tamil','Telugu','Thai','Turkish',
      'Ukrainian','Urdu','Uzbek',
      'Vietnamese','Welsh','Yoruba','Zulu',
      'Other'
    ])
  );

ALTER TABLE profiles
  ADD CONSTRAINT check_active_origin_language CHECK (
    active_origin_language IS NULL OR active_origin_language = ANY(ARRAY[
      'Afrikaans','Albanian','Amharic','Arabic','Armenian','Azerbaijani',
      'Basque','Belarusian','Bengali','Bosnian','Bulgarian',
      'Catalan','Chinese (Cantonese)','Chinese (Mandarin)','Croatian','Czech',
      'Danish','Dutch','English','Estonian',
      'Filipino (Tagalog)','Finnish','French',
      'Galician','Georgian','German','Greek','Gujarati',
      'Hausa','Hebrew','Hindi','Hungarian',
      'Icelandic','Indonesian','Irish','Italian',
      'Japanese','Javanese',
      'Kannada','Kazakh','Khmer','Korean','Kurdish',
      'Lao','Latvian','Lithuanian',
      'Macedonian','Malay','Malayalam','Maltese','Maori','Marathi','Mongolian',
      'Nepali','Norwegian',
      'Pashto','Persian','Polish','Portuguese','Punjabi',
      'Romanian','Russian',
      'Serbian','Sinhala','Slovak','Slovenian','Somali','Spanish','Swahili','Swedish',
      'Tajik','Tamil','Telugu','Thai','Turkish',
      'Ukrainian','Urdu','Uzbek',
      'Vietnamese','Welsh','Yoruba','Zulu',
      'Other'
    ])
  );

ALTER TABLE profiles
  ADD CONSTRAINT check_origin_languages CHECK (
    origin_languages IS NULL OR origin_languages <@ ARRAY[
      'Afrikaans','Albanian','Amharic','Arabic','Armenian','Azerbaijani',
      'Basque','Belarusian','Bengali','Bosnian','Bulgarian',
      'Catalan','Chinese (Cantonese)','Chinese (Mandarin)','Croatian','Czech',
      'Danish','Dutch','English','Estonian',
      'Filipino (Tagalog)','Finnish','French',
      'Galician','Georgian','German','Greek','Gujarati',
      'Hausa','Hebrew','Hindi','Hungarian',
      'Icelandic','Indonesian','Irish','Italian',
      'Japanese','Javanese',
      'Kannada','Kazakh','Khmer','Korean','Kurdish',
      'Lao','Latvian','Lithuanian',
      'Macedonian','Malay','Malayalam','Maltese','Maori','Marathi','Mongolian',
      'Nepali','Norwegian',
      'Pashto','Persian','Polish','Portuguese','Punjabi',
      'Romanian','Russian',
      'Serbian','Sinhala','Slovak','Slovenian','Somali','Spanish','Swahili','Swedish',
      'Tajik','Tamil','Telugu','Thai','Turkish',
      'Ukrainian','Urdu','Uzbek',
      'Vietnamese','Welsh','Yoruba','Zulu',
      'Other'
    ]::text[]
  );

-- Valid course language values (82 locale-backed + 14 course-only educational languages)
ALTER TABLE courses
  ADD CONSTRAINT check_source_language CHECK (
    source_language IS NULL OR source_language = ANY(ARRAY[
      'Afrikaans','Albanian','Amharic','Arabic','Armenian','Azerbaijani',
      'Basque','Belarusian','Bengali','Bosnian','Bulgarian',
      'Catalan','Chinese (Cantonese)','Chinese (Mandarin)','Croatian','Czech',
      'Danish','Dutch','English','Estonian',
      'Filipino (Tagalog)','Finnish','French',
      'Galician','Georgian','German','Greek','Gujarati',
      'Hausa','Hebrew','Hindi','Hungarian',
      'Icelandic','Indonesian','Irish','Italian',
      'Japanese','Javanese',
      'Kannada','Kazakh','Khmer','Korean','Kurdish',
      'Lao','Latvian','Lithuanian',
      'Macedonian','Malay','Malayalam','Maltese','Maori','Marathi','Mongolian',
      'Nepali','Norwegian',
      'Pashto','Persian','Polish','Portuguese','Punjabi',
      'Romanian','Russian',
      'Serbian','Sinhala','Slovak','Slovenian','Somali','Spanish','Swahili','Swedish',
      'Tajik','Tamil','Telugu','Thai','Turkish',
      'Ukrainian','Urdu','Uzbek',
      'Vietnamese','Welsh','Yoruba','Zulu',
      -- Course-only educational languages (no locale file)
      'American Sign Language (ASL)','Ancient Greek','Biblical Hebrew',
      'British Sign Language (BSL)','Burmese','Classical Arabic',
      'Esperanto','Hawaiian','Igbo','Latin','Old English','Samoan','Sanskrit','Tibetan'
    ])
  );

ALTER TABLE courses
  ADD CONSTRAINT check_target_language CHECK (
    target_language IS NULL OR target_language = ANY(ARRAY[
      'Afrikaans','Albanian','Amharic','Arabic','Armenian','Azerbaijani',
      'Basque','Belarusian','Bengali','Bosnian','Bulgarian',
      'Catalan','Chinese (Cantonese)','Chinese (Mandarin)','Croatian','Czech',
      'Danish','Dutch','English','Estonian',
      'Filipino (Tagalog)','Finnish','French',
      'Galician','Georgian','German','Greek','Gujarati',
      'Hausa','Hebrew','Hindi','Hungarian',
      'Icelandic','Indonesian','Irish','Italian',
      'Japanese','Javanese',
      'Kannada','Kazakh','Khmer','Korean','Kurdish',
      'Lao','Latvian','Lithuanian',
      'Macedonian','Malay','Malayalam','Maltese','Maori','Marathi','Mongolian',
      'Nepali','Norwegian',
      'Pashto','Persian','Polish','Portuguese','Punjabi',
      'Romanian','Russian',
      'Serbian','Sinhala','Slovak','Slovenian','Somali','Spanish','Swahili','Swedish',
      'Tajik','Tamil','Telugu','Thai','Turkish',
      'Ukrainian','Urdu','Uzbek',
      'Vietnamese','Welsh','Yoruba','Zulu',
      'American Sign Language (ASL)','Ancient Greek','Biblical Hebrew',
      'British Sign Language (BSL)','Burmese','Classical Arabic',
      'Esperanto','Hawaiian','Igbo','Latin','Old English','Samoan','Sanskrit','Tibetan'
    ])
  );

-- Drop helper functions (no longer needed after migration)
DROP FUNCTION _normalize_language(text);
DROP FUNCTION _normalize_course_language(text);
