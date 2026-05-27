import type { QType, Outcome } from "@/utils/sm2";
export type { QType, Outcome };

export interface StudyCard {
  itemId: string;
  courseId: string;
  frontText: string;
  backText: string;
  frontAudioUrl: string | null;
  backAudioUrl: string | null;
  romanization: string | null;
  acceptedAnswers: string[];
  distractors: string[];
  questionType: QType;
  progress: {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    correctCount: number;
    incorrectCount: number;
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
}

export interface SessionStats {
  correct: number;
  incorrect: number;
  xpEarned: number;
  masteredCount: number;
  updatedStreak: number;
}

export interface SessionConfig {
  count: number;
  types: QType[];
}
