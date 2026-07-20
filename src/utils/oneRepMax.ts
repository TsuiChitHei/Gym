/** Percentage of 1RM for a given rep count (1–30). 30+ uses 50%. */
const ONE_RM_PERCENTAGE: Record<number, number> = {
  1: 1.0,
  2: 0.97,
  3: 0.94,
  4: 0.92,
  5: 0.89,
  6: 0.86,
  7: 0.83,
  8: 0.81,
  9: 0.78,
  10: 0.75,
  11: 0.73,
  12: 0.71,
  13: 0.7,
  14: 0.68,
  15: 0.67,
  16: 0.65,
  17: 0.64,
  18: 0.63,
  19: 0.61,
  20: 0.6,
  21: 0.59,
  22: 0.58,
  23: 0.57,
  24: 0.56,
  25: 0.55,
  26: 0.54,
  27: 0.53,
  28: 0.52,
  29: 0.51,
  30: 0.5,
};

export function getOneRepMaxPercentage(reps: number): number {
  if (reps <= 0) return 1;
  if (reps >= 30) return 0.5;
  return ONE_RM_PERCENTAGE[reps] ?? 0.5;
}

/** estimated_1rm = weight / (percentage of 1RM) */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || weight < 0 || !Number.isFinite(reps) || reps <= 0) {
    return 0;
  }
  const percentage = getOneRepMaxPercentage(Math.floor(reps));
  return weight / percentage;
}

export function formatOneRepMax(value: number, unit: string): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}

export function lbsToKg(lbs: number): number {
  return lbs * 0.45359237;
}

export function kgToLbs(kg: number): number {
  return kg / 0.45359237;
}

export function toKg(weight: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? lbsToKg(weight) : weight;
}
