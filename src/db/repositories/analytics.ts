import { getDatabase } from '../database';
import type { AnalyticsExerciseOption, DailyOneRepMaxPoint } from '../../types';
import { estimateOneRepMax, toKg } from '../../utils/oneRepMax';

export function exerciseOptionKey(machineId: number, machineModeId: number | null): string {
  return `${machineId}:${machineModeId ?? 'none'}`;
}

export function formatModeLabel(modeName: string | null | undefined): string {
  if (!modeName) return '';
  const trimmed = modeName.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'vbar' || lower === 'v-bar' || lower === 'v bar') return 'V-bar';
  if (lower === 'rope') return 'Rope';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatExerciseLabel(
  machineName: string,
  brandName: string,
  modeName: string | null,
): string {
  const mode = formatModeLabel(modeName);
  if (mode) return `${machineName} · ${mode} (${brandName})`;
  return `${machineName} (${brandName})`;
}

/**
 * Distinct exercises used in workouts, split by multipurpose mode/purpose.
 */
export async function getExerciseOptionsUsedInWorkouts(): Promise<AnalyticsExerciseOption[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    machine_id: number;
    machine_name: string;
    brand_name: string;
    machine_mode_id: number | null;
    mode_name: string | null;
  }>(
    `SELECT DISTINCT
        m.id AS machine_id,
        m.machine_name,
        b.name AS brand_name,
        we.machine_mode_id,
        mm.mode_name
     FROM workout_entries we
     JOIN machines m ON m.id = we.machine_id
     JOIN brands b ON b.id = m.brand_id
     LEFT JOIN machine_modes mm ON mm.id = we.machine_mode_id
     ORDER BY b.name ASC, m.machine_name ASC, mm.mode_name ASC`,
  );

  return rows.map((row) => ({
    key: exerciseOptionKey(row.machine_id, row.machine_mode_id),
    machine_id: row.machine_id,
    machine_mode_id: row.machine_mode_id,
    machine_name: row.machine_name,
    brand_name: row.brand_name,
    mode_name: row.mode_name,
    label: formatExerciseLabel(row.machine_name, row.brand_name, row.mode_name),
  }));
}

export type ExerciseSelection = {
  machineId: number;
  machineModeId: number | null;
};

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pointFromRow(
  row: {
    workout_day: string;
    reps: number;
    weight_value: number;
    weight_unit: 'kg' | 'lbs';
    estimated_1rm: number | null;
    machine_id: number;
    machine_name: string;
    brand_name: string;
    machine_mode_id: number | null;
    mode_name: string | null;
  },
  estimatedKg: number,
): DailyOneRepMaxPoint {
  return {
    date: row.workout_day,
    estimated_1rm_kg: estimatedKg,
    reps: row.reps,
    weight_value: row.weight_value,
    weight_unit: row.weight_unit,
    machine_id: row.machine_id,
    machine_name: row.machine_name,
    brand_name: row.brand_name,
    machine_mode_id: row.machine_mode_id,
    mode_name: row.mode_name,
  };
}

/**
 * When several candidates share a day, keep the one closest to the average of
 * the other days' chart values (singles first, then resolve contested days).
 */
export function pickDailyPointsClosestToAverage(
  candidatesByDay: Map<string, DailyOneRepMaxPoint[]>,
): DailyOneRepMaxPoint[] {
  const days = Array.from(candidatesByDay.keys()).sort((a, b) => a.localeCompare(b));
  const chosen = new Map<string, DailyOneRepMaxPoint>();
  const contested: string[] = [];

  for (const day of days) {
    const candidates = candidatesByDay.get(day) ?? [];
    if (candidates.length === 1) {
      chosen.set(day, candidates[0]);
    } else if (candidates.length > 1) {
      contested.push(day);
    }
  }

  const allCandidateValues = Array.from(candidatesByDay.values())
    .flat()
    .map((point) => point.estimated_1rm_kg);

  const averageExcluding = (excludeDay: string): number => {
    const others = Array.from(chosen.entries())
      .filter(([day]) => day !== excludeDay)
      .map(([, point]) => point.estimated_1rm_kg);

    if (others.length > 0) return mean(others);

    // No resolved other days yet: use mean of every candidate except this day.
    const fallback = Array.from(candidatesByDay.entries())
      .filter(([day]) => day !== excludeDay)
      .flatMap(([, points]) => points.map((point) => point.estimated_1rm_kg));

    if (fallback.length > 0) return mean(fallback);
    return mean(allCandidateValues);
  };

  for (const day of contested) {
    const candidates = candidatesByDay.get(day) ?? [];
    const target = averageExcluding(day);

    let best = candidates[0];
    let bestDistance = Math.abs(best.estimated_1rm_kg - target);

    for (let i = 1; i < candidates.length; i += 1) {
      const distance = Math.abs(candidates[i].estimated_1rm_kg - target);
      if (distance < bestDistance) {
        best = candidates[i];
        bestDistance = distance;
      }
    }

    chosen.set(day, best);
  }

  return days.map((day) => chosen.get(day)!);
}

/**
 * Across one or more exercise selections, build one point per calendar day.
 * Within a selection, the day's best est. 1RM is the candidate. If several
 * selections land on the same day, keep the candidate closest to the average
 * of the other chart points.
 */
export async function getDailyMaxOneRepMax(params: {
  selections: ExerciseSelection[];
  startDate: string;
  endDate: string;
}): Promise<DailyOneRepMaxPoint[]> {
  if (params.selections.length === 0) return [];

  const db = await getDatabase();

  const clauses: string[] = [];
  const values: (string | number | null)[] = [];

  for (const selection of params.selections) {
    if (selection.machineModeId == null) {
      clauses.push('(we.machine_id = ? AND we.machine_mode_id IS NULL)');
      values.push(selection.machineId);
    } else {
      clauses.push('(we.machine_id = ? AND we.machine_mode_id = ?)');
      values.push(selection.machineId, selection.machineModeId);
    }
  }

  values.push(params.startDate, params.endDate);

  const rows = await db.getAllAsync<{
    workout_day: string;
    reps: number;
    weight_value: number;
    weight_unit: 'kg' | 'lbs';
    estimated_1rm: number | null;
    machine_id: number;
    machine_name: string;
    brand_name: string;
    machine_mode_id: number | null;
    mode_name: string | null;
  }>(
    `SELECT date(w.started_at) AS workout_day,
            es.reps,
            es.weight_value,
            es.weight_unit,
            es.estimated_1rm,
            m.id AS machine_id,
            m.machine_name,
            b.name AS brand_name,
            we.machine_mode_id,
            mm.mode_name
     FROM exercise_sets es
     JOIN workout_entries we ON we.id = es.workout_entry_id
     JOIN workouts w ON w.id = we.workout_id
     JOIN machines m ON m.id = we.machine_id
     JOIN brands b ON b.id = m.brand_id
     LEFT JOIN machine_modes mm ON mm.id = we.machine_mode_id
     WHERE (${clauses.join(' OR ')})
       AND date(w.started_at) >= date(?)
       AND date(w.started_at) <= date(?)
     ORDER BY workout_day ASC`,
    values,
  );

  // Best set per day per selection (machine + mode).
  const byDaySelection = new Map<string, Map<string, DailyOneRepMaxPoint>>();

  for (const row of rows) {
    const estimatedRaw =
      row.estimated_1rm != null
        ? row.estimated_1rm
        : estimateOneRepMax(row.weight_value, row.reps);
    const estimatedKg = toKg(estimatedRaw, row.weight_unit);
    const dayMap = byDaySelection.get(row.workout_day) ?? new Map();
    const key = exerciseOptionKey(row.machine_id, row.machine_mode_id);
    const current = dayMap.get(key);

    if (current == null || estimatedKg > current.estimated_1rm_kg) {
      dayMap.set(key, pointFromRow(row, estimatedKg));
      byDaySelection.set(row.workout_day, dayMap);
    }
  }

  const candidatesByDay = new Map<string, DailyOneRepMaxPoint[]>();
  for (const [day, selectionMap] of byDaySelection) {
    candidatesByDay.set(day, Array.from(selectionMap.values()));
  }

  return pickDailyPointsClosestToAverage(candidatesByDay);
}
