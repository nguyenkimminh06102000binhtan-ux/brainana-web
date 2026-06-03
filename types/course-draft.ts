export type DraftItem = {
  id: number;
  dbId?: string | null;
  front: string;
  back: string;
  romanization: string;
  imagePath?: string;
  frontAudioPath?: string;
  backAudioPath?: string;
  distractors: string[];
  acceptedAnswers: string[];
  customAttributeValues: Record<string, string>;
};

export type DraftSection = {
  id: number;
  dbId?: string | null;
  title: string;
  description: string;
  customAttributes: string[];
  items: DraftItem[];
};

export type DraftState = {
  formTitle?: string;
  selectedCategory: string;
  selectedSubcategory?: string;
  selectedLevel?: string;
  selectedVisibility: string;
  selectedSourceLanguage: string;
  selectedTargetLanguage: string;
  sections: DraftSection[];
};
