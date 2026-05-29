export type CategoryGroup = { label: string; items: string[] };
export type CategoryTree = CategoryGroup[];

export const CATEGORY_TREE: CategoryTree = [
  {
    label: "Languages",
    items: [
      "English (UK)", "English (US)", "Spanish", "French", "German",
      "Italian", "Portuguese", "Dutch", "Swedish", "Danish", "Norwegian",
      "Finnish", "Polish", "Czech", "Slovak", "Romanian", "Hungarian",
      "Greek", "Turkish", "Ukrainian", "Croatian", "Serbian", "Bulgarian",
      "Catalan", "Russian",
      "Arabic (Modern Standard)", "Arabic (Egyptian)", "Arabic (Gulf)", "Arabic (Levantine)",
      "Hebrew", "Persian (Farsi)", "Kurdish",
      "Hindi", "Bengali", "Urdu", "Tamil", "Telugu", "Marathi", "Gujarati",
      "Punjabi", "Sinhala", "Nepali", "Sanskrit", "Pali",
      "Vietnamese", "Thai", "Indonesian", "Malay", "Filipino (Tagalog)",
      "Burmese", "Khmer", "Lao", "Javanese",
      "Mandarin (Simplified)", "Mandarin (Traditional)", "Mandarin (Spoken Only)", "Cantonese",
      "Japanese", "Kanji", "Korean",
      "Kazakh", "Uzbek", "Mongolian", "Tibetan",
      "Swahili", "Amharic", "Yoruba", "Zulu", "Afrikaans", "Hausa", "Igbo", "Somali",
      "Hawaiian", "Maori", "Samoan", "Tongan",
      "Latin", "Ancient Greek", "Biblical Hebrew", "Classical Arabic", "Old English",
      "Esperanto", "Klingon", "High Valyrian",
      "American Sign Language (ASL)", "British Sign Language (BSL)",
      "Korean Sign Language", "Japanese Sign Language",
    ],
  },
  {
    label: "Arts & Literature",
    items: [
      "Visual Arts", "Music", "Film & TV", "Theatre & Drama", "Literature & Poetry",
      "Philosophy", "Architecture", "Photography", "Dance", "Comics & Manga",
    ],
  },
  {
    label: "Maths & Science",
    items: [
      "Mathematics", "Algebra", "Calculus", "Statistics", "Geometry",
      "Physics", "Chemistry", "Biology", "Astronomy", "Earth Science",
      "Environmental Science", "Computer Science", "Engineering",
      "Health Sciences", "Psychology", "Neuroscience",
    ],
  },
  {
    label: "The Natural World",
    items: [
      "Animals", "Birds", "Marine Life", "Insects & Bugs", "Plants & Trees",
      "Fruits & Vegetables", "Fungi & Mushrooms", "Ecology", "Weather & Climate",
      "Geology", "Astronomy & Space",
    ],
  },
  {
    label: "History & Geography",
    items: [
      "Ancient History", "Medieval History", "Modern History",
      "World War I", "World War II", "Asian History", "European History",
      "American History", "African History", "World Geography",
      "Countries & Capitals", "Maps & Flags", "Religion", "Mythology",
      "Politics & Government",
    ],
  },
  {
    label: "Memory Training",
    items: [
      "Memory Palaces", "Number Systems", "Playing Card Systems",
      "Speed Reading", "Name & Face Memory",
    ],
  },
  {
    label: "Professional & Careers",
    items: [
      "Business & Finance", "Marketing", "Law", "Medicine & Healthcare",
      "Nursing", "Dentistry", "Pharmacy", "Computer Science & IT",
      "Engineering", "Architecture", "Accounting", "Human Resources",
      "Project Management", "Real Estate", "Education & Teaching",
    ],
  },
  {
    label: "Standardised Tests",
    items: [
      "SAT", "ACT", "GRE", "GMAT", "LSAT", "MCAT", "TOEFL", "IELTS",
      "JLPT", "HSK", "TOPIK", "DELF / DALF", "Cambridge English",
      "AP Exams", "IB Exams", "Graduate School",
    ],
  },
  {
    label: "Trivia",
    items: [
      "Art, Music & Literature", "History", "Science & Nature",
      "Sports & Leisure", "Food & Drink", "People & Celebrities",
      "Sociology", "Geography", "Pop Culture", "Miscellaneous",
    ],
  },
  {
    label: "Entertainment",
    items: [
      "Movies & TV Shows", "Video Games", "Board Games", "Card Games",
      "Pokémon", "Anime & Manga", "K-Pop & K-Drama", "Sports",
      "Yoga & Wellness", "Cooking & Recipes", "Travel & Culture",
      "Fashion & Beauty",
    ],
  },
];

export const TOP_LEVEL_CATEGORIES = CATEGORY_TREE.map((g) => g.label);
export const SUPPORTED_COURSE_LANGUAGES = CATEGORY_TREE.find((g) => g.label === "Languages")?.items ?? [];

export function getCategoryItems(category: string): string[] {
  return CATEGORY_TREE.find((g) => g.label === category)?.items ?? [];
}

export function getCategoryForItem(item: string): string | null {
  return CATEGORY_TREE.find((g) => g.items.includes(item))?.label ?? null;
}
