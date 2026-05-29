export type RomanizationSystem = {
  system: string;
  placeholder: string;
};

export const ROMANIZATION_SYSTEMS: Record<string, RomanizationSystem> = {
  "Japanese":            { system: "Romaji",               placeholder: "e.g. nihongo" },
  "Chinese (Simplified)": { system: "Pinyin",              placeholder: "e.g. nǐ hǎo" },
  "Chinese (Traditional)": { system: "Pinyin",             placeholder: "e.g. nǐ hǎo" },
  "Korean":              { system: "Revised Romanization",  placeholder: "e.g. annyeonghaseyo" },
  "Hindi":               { system: "Hunterian",             placeholder: "e.g. namaste" },
  "Arabic":              { system: "ALA-LC",                placeholder: "e.g. marḥaban" },
  "Thai":                { system: "RTGS",                  placeholder: "e.g. sawatdi" },
  "Russian":             { system: "BGN/PCGN",              placeholder: "e.g. privet" },
  "Greek":               { system: "ISO 843",               placeholder: "e.g. yia sas" },
  "Hebrew":              { system: "Academy Romanization",  placeholder: "e.g. shalom" },
  "Georgian":            { system: "National",              placeholder: "e.g. gamarjoba" },
  "Armenian":            { system: "ALA-LC",                placeholder: "e.g. barev" },
  "Ukrainian":           { system: "BGN/PCGN",              placeholder: "e.g. pryvit" },
  "Persian":             { system: "EI Romanization",       placeholder: "e.g. salâm" },
  "Amharic":             { system: "EAL",                   placeholder: "e.g. selam" },
  "Tibetan":             { system: "Wylie",                 placeholder: "e.g. tashi delek" },
  "Burmese":             { system: "MLC Transcription",     placeholder: "e.g. mingalabar" },
  "Khmer":               { system: "UN Romanization",       placeholder: "e.g. choum reap suor" },
  "Tamil":               { system: "ISO 15919",             placeholder: "e.g. vaṇakkam" },
  "Telugu":              { system: "ISO 15919",             placeholder: "e.g. namaskāram" },
  "Kannada":             { system: "ISO 15919",             placeholder: "e.g. namaskāra" },
  "Malayalam":           { system: "ISO 15919",             placeholder: "e.g. namaskāraṁ" },
  "Sinhala":             { system: "National Romanization", placeholder: "e.g. āyubōvan" },
  "Mongolian":           { system: "MNS 5217",              placeholder: "e.g. sain uu" },
  "Lao":                 { system: "PCGN",                  placeholder: "e.g. sabai di" },
  "Nepali":              { system: "Hunterian",              placeholder: "e.g. namaste" },
  "Punjabi":             { system: "ISO 15919",             placeholder: "e.g. sat srī akāl" },
  "Gujarati":            { system: "ISO 15919",             placeholder: "e.g. kem cho" },
  "Bengali":             { system: "ISO 15919",             placeholder: "e.g. namaskar" },
  "Urdu":                { system: "ALA-LC",                placeholder: "e.g. assalamu alaikum" },
  "Pashto":              { system: "ALA-LC",                placeholder: "e.g. salam" },
};

export function getRomanizationSystem(language: string | null | undefined): RomanizationSystem | null {
  if (!language) return null;
  return ROMANIZATION_SYSTEMS[language] ?? null;
}
