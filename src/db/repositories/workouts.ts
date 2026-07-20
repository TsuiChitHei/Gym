import { getDatabase } from '../database';
import type { ExerciseHistoryRecord, ExerciseSet, WorkoutDraft } from '../../types';import { estimateOneRepMax } from '../../utils/oneRepMax';
import { getOrCreateGymLocation } from './gymLocations';

async function insertExercises(
  db: Awaited<ReturnType<typeof getDatabase>>,
  workoutId: number,
  exercises: WorkoutDraft['exercises'],
) {
  for (let i = 0; i < exercises.length; i++) {
    const exercise = exercises[i];
    const entryResult = await db.runAsync(
      `INSERT INTO workout_entries (workout_id, machine_id, machine_mode_id, entry_order)
       VALUES (?, ?, ?, ?)`,
      [workoutId, exercise.machineId, exercise.machineModeId ?? null, i + 1],
    );
    const entryId = entryResult.lastInsertRowId;

    for (const set of exercise.sets) {
      const reps = parseInt(set.reps, 10);
      const weight = parseFloat(set.weight);
      const estimated1rm = estimateOneRepMax(weight, reps);
      await db.runAsync(
        `INSERT INTO exercise_sets
         (workout_entry_id, set_number, reps, weight_value, weight_unit, estimated_1rm)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [entryId, set.setNumber, reps, weight, set.weightUnit, estimated1rm],
      );
    }
  }
}

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
  await insertExercises(db, workoutId, draft.exercises);
  return workoutId;
}

export async function updateWorkout(workoutId: number, draft: WorkoutDraft): Promise<void> {
  const db = await getDatabase();
  const location = draft.location.trim()
    ? await getOrCreateGymLocation(draft.location)
    : null;

  const startedAt = draft.startedAt.toISOString();
  const endedAt = draft.endedAt?.toISOString() ?? startedAt;
  const durationSeconds =
    draft.durationSeconds ??
    Math.max(0, Math.floor((draft.endedAt!.getTime() - draft.startedAt.getTime()) / 1000));

  await db.runAsync(
    `UPDATE workouts
     SET workout_name = ?, gym_location_id = ?, started_at = ?, ended_at = ?, duration_seconds = ?
     WHERE id = ?`,
    [
      draft.workoutName.trim(),
      location?.id ?? null,
      startedAt,
      endedAt,
      durationSeconds,
      workoutId,
    ],
  );

  // Cascades to exercise_sets via FK.
  await db.runAsync('DELETE FROM workout_entries WHERE workout_id = ?', [workoutId]);
  await insertExercises(db, workoutId, draft.exercises);
}

export async function deleteWorkout(workoutId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM workouts WHERE id = ?', [workoutId]);
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
    machine_id: number;
    machine_mode_id: number | null;
    machine_name: string;
    brand_name: string;
    mode_name: string | null;
    workout_entry_id: number;
  }>(
    `SELECT we.id AS workout_entry_id, we.entry_order,
            we.machine_id, we.machine_mode_id,
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
      estimated_1rm: number | null;
      created_at: string;
    }>(
      'SELECT * FROM exercise_sets WHERE workout_entry_id = ? ORDER BY set_number ASC',
      [entry.workout_entry_id],
    );
    entriesWithSets.push({
      entry_order: entry.entry_order,
      machine_id: entry.machine_id,
      machine_mode_id: entry.machine_mode_id,
      machine_name: entry.machine_name,
      brand_name: entry.brand_name,
      mode_name: entry.mode_name,
      sets,
    });
  }

  return { ...workout, entries: entriesWithSets };
}

export async function searchExerciseHistory(query: string): Promise<ExerciseHistoryRecord[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const db = await getDatabase();
  const pattern = `%${trimmed.toLowerCase()}%`;

  const entries = await db.getAllAsync<{
    workout_id: number;
    workout_name: string;
    started_at: string;
    location_name: string | null;
    entry_order: number;
    machine_id: number;
    machine_mode_id: number | null;
    machine_name: string;
    brand_name: string;
    mode_name: string | null;
    workout_entry_id: number;
  }>(
    `SELECT w.id AS workout_id, w.workout_name, w.started_at,
            gl.name AS location_name, we.entry_order,
            we.machine_id, we.machine_mode_id,
            m.machine_name, b.name AS brand_name, mm.mode_name,
            we.id AS workout_entry_id
     FROM workout_entries we
     JOIN workouts w ON w.id = we.workout_id
     JOIN machines m ON m.id = we.machine_id
     JOIN brands b ON b.id = m.brand_id
     LEFT JOIN machine_modes mm ON mm.id = we.machine_mode_id
     LEFT JOIN gym_locations gl ON gl.id = w.gym_location_id
     WHERE LOWER(m.machine_name) LIKE ?
        OR LOWER(b.name) LIKE ?
        OR LOWER(COALESCE(mm.mode_name, '')) LIKE ?
     ORDER BY w.started_at DESC, we.entry_order ASC`,
    [pattern, pattern, pattern],
  );

  if (entries.length === 0) return [];

  const entryIds = entries.map((entry) => entry.workout_entry_id);
  const placeholders = entryIds.map(() => '?').join(', ');
  const allSets = await db.getAllAsync<ExerciseSet>(
    `SELECT * FROM exercise_sets
     WHERE workout_entry_id IN (${placeholders})
     ORDER BY workout_entry_id ASC, set_number ASC`,
    entryIds,
  );

  const setsByEntry = new Map<number, ExerciseSet[]>();
  for (const set of allSets) {
    const list = setsByEntry.get(set.workout_entry_id) ?? [];
    list.push(set);
    setsByEntry.set(set.workout_entry_id, list);
  }

  return entries.map((entry) => ({
    workout_id: entry.workout_id,
    workout_name: entry.workout_name,
    started_at: entry.started_at,
    location_name: entry.location_name,
    entry_order: entry.entry_order,
    machine_id: entry.machine_id,
    machine_mode_id: entry.machine_mode_id,
    machine_name: entry.machine_name,
    brand_name: entry.brand_name,
    mode_name: entry.mode_name,
    sets: setsByEntry.get(entry.workout_entry_id) ?? [],
  }));
}

export async function workoutHasCompletedSets(draft: WorkoutDraft): Promise<boolean> {
  return draft.exercises.some((exercise) =>
    exercise.sets.some((set) => set.reps.trim() !== '' && set.weight.trim() !== ''),
  );
}
