/**
 * Strength Level (strengthlevel.com) does not publish a public developer API.
 * This app uses the free FitnessVolt Strength Standards API (FVSS) for
 * percentile comparisons, which provides a similar "how do I rank" assessment.
 *
 * Docs: https://fitnessvolt.com/strength-standards/developers/
 */

const FVSS_BASE = 'https://fitnessvolt.com/wp-json/fvss/v1';

export interface StrengthLiftOption {
  slug: string;
  label: string;
}

export interface PercentileResult {
  lift: string;
  unit: 'kg' | 'lb';
  estimated_1rm?: number;
  e1rm_is_estimated?: boolean;
  verified?: {
    percentile: number;
    tier?: string;
    sample_size?: number;
    source_label?: string;
  } | null;
  gym?: {
    percentile: number;
    tier?: string;
    sample_size?: number;
    source_label?: string;
  } | null;
  attribution?: {
    text?: string;
  };
}

let cachedLifts: StrengthLiftOption[] | null = null;

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function fetchSupportedLifts(): Promise<StrengthLiftOption[]> {
  if (cachedLifts) return cachedLifts;

  const response = await fetch(`${FVSS_BASE}/standards`);
  if (!response.ok) {
    throw new Error(`Failed to load lift list (${response.status}).`);
  }

  const data = (await response.json()) as {
    lifts?: { gym?: string[]; verified?: string[] };
  };

  const gym = data.lifts?.gym ?? [];
  const verified = data.lifts?.verified ?? [];
  const slugs = Array.from(new Set([...gym, ...verified])).sort();

  cachedLifts = slugs.map((slug) => ({ slug, label: slugToLabel(slug) }));
  return cachedLifts;
}

export async function fetchStrengthPercentile(params: {
  lift: string;
  weight: number;
  reps: number;
  bodyweight: number;
  sex: 'male' | 'female';
  unit: 'kg' | 'lbs';
  age?: number;
}): Promise<PercentileResult> {
  const unit = params.unit === 'lbs' ? 'lb' : 'kg';
  const body: Record<string, string | number> = {
    lift: params.lift,
    weight: params.weight,
    reps: Math.min(12, Math.max(1, Math.floor(params.reps))),
    bodyweight: params.bodyweight,
    sex: params.sex,
    unit,
  };
  if (params.age != null && params.age >= 10 && params.age <= 90) {
    body.age = params.age;
  }

  const response = await fetch(`${FVSS_BASE}/percentile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Strength standards request failed (${response.status}).`);
  }

  return (await response.json()) as PercentileResult;
}
