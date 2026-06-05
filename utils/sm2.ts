export interface SM2Result {
  interval: number;
  repetitions: number;
  easeFactor: number;
}

export function calculateSM2(
  quality: number,
  easeFactor: number,
  interval: number,
  repetitions: number,
): SM2Result {
  if (quality < 2) {
    return {
      interval: 1,
      repetitions: 0,
      easeFactor: Math.max(1.3, easeFactor - 0.2),
    };
  }
  const newEase = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );
  const newInterval =
    repetitions === 0 ? 1 : repetitions === 1 ? 3 : Math.round(interval * newEase);
  return {
    interval: newInterval,
    repetitions: repetitions + 1,
    easeFactor: newEase,
  };
}

export type QType = "flashcard" | "multiple_choice" | "audio_type" | "speed_match" | "type_answer";
export type Outcome = "correct" | "hesitant" | "incorrect";

export function getQualityScore(outcome: Outcome, mode: QType): number {
  if (outcome === "incorrect") return 1;
  if (mode === "speed_match") return 3;
  if (outcome === "hesitant") return 3;
  if (mode === "multiple_choice") return 4;
  return 5; // flashcard, audio_type, type_answer correct
}

export function formatInterval(days: number): string {
  if (days < 1) return "< 1d";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}
