import { getDatabase } from '../database';
import type { WorkoutDraft } from '../../types';
import { getOrCreateGymLocation } from './gymLocations';

export async function saveWorkout(draft: WorkoutDraft): Promise<number> {
  const db = await getDatabase();
  const location = draft.location.trim()
    ? await getOrCreateGymLocation(draft.location)
    : null;

  const startedAt = draft.startedAt.toISOString();
  const endedAt = draft.endedAt?.toISOString() ?? startedAt;
  const durationSeconds =
    draft.durationSeconds ??
    Math.max(0, Math.floor((draft.endedAt!.getTime() - draft.startedAt.getTime()) / 1000));

  const workoutResult = await db.runAsync(
    `INSERT INTO workouts (workout_name, gym_location_id, started_at, ended_at, duration_seconds)
     VALUES (?, ?, ?, ?, ?)`,
    [draft.workoutName.trim(), location?.id ?? null, startedAt, endedAt, durationSeconds],
  );
  const workoutId = workoutResult.lastInsertRowId;

  for (let i = 0; i < draft.exercises.length; i++) {
    const exercise = draft.exercises[i];
    const entryResult = await db.runAsync(
      `INSERT INTO workout_entries (workout_id, machine_id, machine_mode_id, entry_order)
       VALUES (?, ?, ?, ?)`,
      [workoutId, exercise.machineId, exercise.machineModeId ?? null, i + 1],
    );
    const entryId = entryResult.lastInsertRowId;

    for (const set of exercise.sets) {
      await db.runAsync(
        `INSERT INTO exercise_sets (workout_entry_id, set_number, reps, weight_value, weight_unit)
         VALUES (?, ?, ?, ?, ?)`,
        [entryId, set.setNumber, parseInt(set.reps, 10), parseFloat(set.weight), set.weightUnit],
      );
    }
  }

  return workoutId;
}

export async function getAllWorkouts() {
  const db = await getDatabase();
  return db.getAllAsync<{
    id: number;
    workout_name: string;
    gym_location_id: number | null;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    created_at: string;
    location_name: string | null;
  }>(
    `SELECT w.*, gl.name AS location_name
     FROM workouts w
     LEFT JOIN gym_locations gl ON gl.id = w.gym_location_id
     ORDER BY w.started_at DESC`,
  );
}

export async function getWorkoutDetail(workoutId: number) {
  const db = await getDatabase();
  const workout = await db.getFirstAsync<{
    id: number;
    workout_name: string;
    gym_location_id: number | null;
    started_at: string;
    ended_at: string | null;
    duration_seconds: number | null;
    created_at: string;
    location_name: string | null;
  }>(
    `SELECT w.*, gl.name AS location_name
     FROM workouts w
     LEFT JOIN gym_locations gl ON gl.id = w.gym_location_id
     WHERE w.id = ?`,
    [workoutId],
  );

  if (!workout) return null;

  const entries = await db.getAllAsync<{
    entry_order: number;
    machine_name: string;
    brand_name: string;
    mode_name: string | null;
    workout_entry_id: number;
  }>(
    `SELECT we.id AS workout_entry_id, we.entry_order,
            m.machine_name, b.name AS brand_name, mm.mode_name
     FROM workout_entries we
     JOIN machines m ON m.id = we.machine_id
     JOIN brands b ON b.id = m.brand_id
     LEFT JOIN machine_modes mm ON mm.id = we.machine_mode_id
     WHERE we.workout_id = ?
     ORDER BY we.entry_order ASC`,
    [workoutId],
  );

  const entriesWithSets = [];
  for (const entry of entries) {
    const sets = await db.getAllAsync<{
      id: number;
      workout_entry_id: number;
      set_number: number;
      reps: number;
      weight_value: number;
      weight_unit: 'kg' | 'lbs';
      created_at: string;
    }>(
      'SELECT * FROM exercise_sets WHERE workout_entry_id = ? ORDER BY set_number ASC',
      [entry.workout_entry_id],
    );
    entriesWithSets.push({
      entry_order: entry.entry_order,
      machine_name: entry.machine_name,
      brand_name: entry.brand_name,
      mode_name: entry.mode_name,
      sets,
    });
  }

  return { ...workout, entries: entriesWithSets };
}

export async function workoutHasCompletedSets(draft: WorkoutDraft): Promise<boolean> {
  return draft.exercises.some((exercise) =>
    exercise.sets.some((set) => set.reps.trim() !== '' && set.weight.trim() !== ''),
  );
}
