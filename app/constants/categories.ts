import { SUPPORTED_COURSE_LANGUAGES } from "./languages";

export type CategoryGroup = { label: string; items: string[] };
export type CategoryTree = CategoryGroup[];

export const CATEGORY_TREE: CategoryTree = [
  {
    label: "Languages",
    // Authoritative list lives in app/constants/languages.ts
    items: [...SUPPORTED_COURSE_LANGUAGES],
  },
  {
    // Renamed from "Arts & Literature" — broader and more accurate
    label: "Arts & Humanities",
    items: [
      "Architecture", "Comics & Manga", "Creative Writing", "Dance",
      "Film & Television", "Literature & Poetry", "Music",
      "Philosophy & Ethics", "Photography", "Theatre & Drama", "Visual Arts",
    ],
  },
  {
    // Renamed from "Maths & Science" — clearer order, no Astronomy duplicate,
    // no Engineering/Computer Science duplicates from Professional
    label: "Science & Mathematics",
    items: [
      "Algebra", "Astronomy & Space", "Biology", "Calculus", "Chemistry",
      "Computer Science", "Data Science & Statistics", "Earth Sciences",
      "Ecology", "Engineering", "Environmental Science", "Geometry",
      "Mathematics", "Neuroscience", "Physics", "Psychology",
    ],
  },
  {
    // Renamed from "History & Geography" — includes society/culture
    label: "History & Society",
    items: [
      "African History", "American History", "Ancient History", "Asian History",
      "Countries & Capitals", "European History", "Maps & Geography",
      "Medieval History", "Middle Eastern History", "Modern History",
      "Mythology & Folklore", "Politics & Government",
      "Religion & Theology", "Sociology", "World War I", "World War II",
    ],
  },
  {
    // Renamed from "The Natural World" — more descriptive
    label: "Nature & Environment",
    items: [
      "Animals & Wildlife", "Birds", "Ecology & Conservation",
      "Food & Agriculture", "Fungi & Mushrooms", "Geology",
      "Insects & Bugs", "Marine Life", "Plants & Trees", "Weather & Climate",
    ],
  },
  {
    // New top-level — Health topics were scattered across Entertainment and Professional
    label: "Health & Wellness",
    items: [
      "Cooking & Nutrition", "Dentistry", "Exercise & Fitness",
      "Medicine & Healthcare", "Mental Health", "Nursing",
      "Pharmacy", "Sports & Athletics", "Yoga & Wellness",
    ],
  },
  {
    // Renamed from "Professional & Careers" — Engineering/CS/Architecture moved to their
    // correct academic categories; duplicates removed
    label: "Business & Careers",
    items: [
      "Accounting & Finance", "Business & Management", "Education & Teaching",
      "Human Resources", "Law", "Marketing", "Project Management",
      "Real Estate", "Technology & IT",
    ],
  },
  {
    label: "Standardised Tests",
    items: [
      "SAT", "ACT", "GRE", "GMAT", "LSAT", "MCAT", "TOEFL", "IELTS",
      "JLPT", "HSK", "TOPIK", "DELF / DALF", "Cambridge English",
      "AP Exams", "IB Exams",
    ],
  },
  {
    // Renamed from "Memory Training" — more inclusive of study habits
    label: "Memory & Study Skills",
    items: [
      "Learning Techniques", "Memory Palaces", "Mnemonics",
      "Number Systems", "Speed Reading", "Study Methods",
    ],
  },
  {
    // Entertainment: pure media & pop culture; lifestyle/health moved to Health & Wellness
    label: "Entertainment & Pop Culture",
    items: [
      "Anime & Manga", "Board & Card Games", "Fashion & Beauty",
      "K-Pop & K-Drama", "Movies & TV Shows", "Music & Artists",
      "Pokémon", "Travel & Culture", "Video Games",
    ],
  },
  {
    // Trivia: general knowledge quizzing; Sociology moved to History & Society
    label: "Trivia & General Knowledge",
    items: [
      "Art & Culture", "Food & Drink", "General Knowledge",
      "Geography Quiz", "History Quiz", "Nature & Science Quiz",
      "People & Celebrities", "Pop Culture", "Sports Quiz",
    ],
  },
];

export const TOP_LEVEL_CATEGORIES = CATEGORY_TREE.map((g) => g.label);
export { SUPPORTED_COURSE_LANGUAGES } from "./languages";

export function getCategoryItems(category: string): string[] {
  return CATEGORY_TREE.find((g) => g.label === category)?.items ?? [];
}

export function getCategoryForItem(item: string): string | null {
  return CATEGORY_TREE.find((g) => g.items.includes(item))?.label ?? null;
}
