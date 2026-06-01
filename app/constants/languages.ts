/**
 * Single source of truth for all language lists in Brainana.
 *
 * Two tiers:
 *  SUPPORTED_LANGUAGES        — 82 languages, one per locale file in public/locales/
 *                               Used for: UI language, native language, origin language.
 *
 *  SUPPORTED_COURSE_LANGUAGES — The 82 above + 14 educational languages that have no
 *                               locale file (Latin, ASL, Sanskrit, etc.).
 *                               Used for: course source_language / target_language,
 *                               and the "Languages" subcategory in the browse filter.
 *
 * LANGUAGE_LOCALE_MAP gives the exact locale filename for each supported language so
 * i18n resolution is a direct lookup, not a fragile string transform.
 */

// ── Canonical map: display name → locale filename (without .json) ─────────────
export const LANGUAGE_LOCALE_MAP: Readonly<Record<string, string>> = {
  "Afrikaans":          "afrikaans",
  "Albanian":           "albanian",
  "Amharic":            "amharic",
  "Arabic":             "arabic",
  "Armenian":           "armenian",
  "Azerbaijani":        "azerbaijani",
  "Basque":             "basque",
  "Belarusian":         "belarusian",
  "Bengali":            "bengali",
  "Bosnian":            "bosnian",
  "Bulgarian":          "bulgarian",
  "Catalan":            "catalan",
  "Chinese (Cantonese)":"chinese-cantonese",
  "Chinese (Mandarin)": "chinese-mandarin",
  "Croatian":           "croatian",
  "Czech":              "czech",
  "Danish":             "danish",
  "Dutch":              "dutch",
  "English":            "en",
  "Estonian":           "estonian",
  "Filipino (Tagalog)": "filipino-tagalog",
  "Finnish":            "finnish",
  "French":             "french",
  "Galician":           "galician",
  "Georgian":           "georgian",
  "German":             "german",
  "Greek":              "greek",
  "Gujarati":           "gujarati",
  "Hausa":              "hausa",
  "Hebrew":             "hebrew",
  "Hindi":              "hindi",
  "Hungarian":          "hungarian",
  "Icelandic":          "icelandic",
  "Indonesian":         "indonesian",
  "Irish":              "irish",
  "Italian":            "italian",
  "Japanese":           "japanese",
  "Javanese":           "javanese",
  "Kannada":            "kannada",
  "Kazakh":             "kazakh",
  "Khmer":              "khmer",
  "Korean":             "korean",
  "Kurdish":            "kurdish",
  "Lao":                "lao",
  "Latvian":            "latvian",
  "Lithuanian":         "lithuanian",
  "Macedonian":         "macedonian",
  "Malay":              "malay",
  "Malayalam":          "malayalam",
  "Maltese":            "maltese",
  "Maori":              "maori",
  "Marathi":            "marathi",
  "Mongolian":          "mongolian",
  "Nepali":             "nepali",
  "Norwegian":          "norwegian",
  "Pashto":             "pashto",
  "Persian":            "persian",
  "Polish":             "polish",
  "Portuguese":         "portuguese",
  "Punjabi":            "punjabi",
  "Romanian":           "romanian",
  "Russian":            "russian",
  "Serbian":            "serbian",
  "Sinhala":            "sinhala",
  "Slovak":             "slovak",
  "Slovenian":          "slovenian",
  "Somali":             "somali",
  "Spanish":            "spanish",
  "Swahili":            "swahili",
  "Swedish":            "swedish",
  "Tajik":              "tajik",
  "Tamil":              "tamil",
  "Telugu":             "telugu",
  "Thai":               "thai",
  "Turkish":            "turkish",
  "Ukrainian":          "ukrainian",
  "Urdu":               "urdu",
  "Uzbek":              "uzbek",
  "Vietnamese":         "vietnamese",
  "Welsh":              "welsh",
  "Yoruba":             "yoruba",
  "Zulu":               "zulu",
};

// ── Tier 1: UI / native / origin language (must have a locale file) ───────────
// English first, rest alphabetical.
export const SUPPORTED_LANGUAGES: readonly string[] = [
  "English",
  ...Object.keys(LANGUAGE_LOCALE_MAP).filter((l) => l !== "English").sort(),
];

// For native language selection: same list + "Other" escape hatch.
export const NATIVE_LANGUAGES: readonly string[] = [...SUPPORTED_LANGUAGES, "Other"];

// ── Tier 2 additions: content-only languages (no locale file) ─────────────────
// Valid for flashcard content (source/target language) but not for the UI locale.
const COURSE_ONLY_LANGUAGES: readonly string[] = [
  "American Sign Language (ASL)",
  "Ancient Greek",
  "Biblical Hebrew",
  "British Sign Language (BSL)",
  "Burmese",
  "Classical Arabic",
  "Esperanto",
  "Hawaiian",
  "Igbo",
  "Latin",
  "Old English",
  "Samoan",
  "Sanskrit",
  "Tibetan",
];

// Tier 2: everything valid on a flashcard.
export const SUPPORTED_COURSE_LANGUAGES: readonly string[] = [
  ...SUPPORTED_LANGUAGES,
  ...COURSE_ONLY_LANGUAGES,
].sort((a, b) => a.localeCompare(b));

// ── Validation sets (built once at module load) ───────────────────────────────
export const NATIVE_LANGUAGE_SET:  ReadonlySet<string> = new Set(NATIVE_LANGUAGES);
export const COURSE_LANGUAGE_SET:  ReadonlySet<string> = new Set(SUPPORTED_COURSE_LANGUAGES);

export function isValidNativeLanguage(lang: string): boolean {
  return NATIVE_LANGUAGE_SET.has(lang);
}

export function isValidCourseLanguage(lang: string): boolean {
  return COURSE_LANGUAGE_SET.has(lang);
}

// ── Locale resolution ─────────────────────────────────────────────────────────
// Returns the locale filename for a language, falling back to "en".
export function languageToLocale(language: string | null | undefined): string {
  if (!language || language === "Other") return "en";
  return LANGUAGE_LOCALE_MAP[language] ?? "en";
}
