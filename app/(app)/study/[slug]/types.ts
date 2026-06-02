import type { QType, Outcome } from "@/utils/sm2";
export type { QType, Outcome };

export interface StudyCard {
  itemId: string;
  courseId: string;
  frontText: string;
  backText: string;
  imageUrl: string | null;
  frontAudioUrl: string | null;
  backAudioUrl: string | null;
  romanization: string | null;
  acceptedAnswers: string[];
  distractors: string[];
  customAttributes: Record<string, string> | null;
  questionType: QType;
  progress: {
    easeFactor: number;
    intervalDays: number;
      repetitions: number;
      correctCount: number;
      incorrectCount: number;
      hard: boolean;
      ignored: boolean;
  } | null;
}

export interface CardAnswer {
  itemId: string;
  outcome: Outcome;
  quality: number;
  questionType: QType;
  wasSpeedMatch: boolean;
  newEaseFactor: number;
  newInterval: number;
  newRepetitions: number;
  newlyMastered: boolean;
  hard?: boolean;
  ignored?: boolean;
}

export interface SessionStats {
  correct: number;
  incorrect: number;
  xpEarned: number;
  masteredCount: number;
  updatedStreak: number;
}
