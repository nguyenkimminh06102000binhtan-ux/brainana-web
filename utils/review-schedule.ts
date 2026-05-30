export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfNextDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function reviewDayCutoff(date = new Date()) {
  return startOfNextDay(date);
}

export function nextReviewDay(date: Date, intervalDays: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + intervalDays);
}
