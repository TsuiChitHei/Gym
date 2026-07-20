export type WeightUnit = 'kg' | 'lbs';
export type Sex = 'male' | 'female';

export interface Brand {
  id: number;
  name: string;
  created_at: string;
}

export interface MachineMode {
  id: number;
  machine_id: number;
  mode_name: string;
  created_at: string;
}

export interface Machine {
  id: number;
  brand_id: number;
  machine_name: string;
  is_multipurpose: number;
  image_filename: string | null;
  created_at: string;
}

export interface MachineWithBrand extends Machine {
  brand_name: string;
}

export interface GymLocation {
  id: number;
  name: string;
  created_at: string;
}

export interface Workout {
  id: number;
  workout_name: string;
  gym_location_id: number | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface WorkoutEntry {
  id: number;
  workout_id: number;
  machine_id: number;
  machine_mode_id: number | null;
  entry_order: number;
  created_at: string;
}

export interface ExerciseSet {
  id: number;
  workout_entry_id: number;
  set_number: number;
  reps: number;
  weight_value: number;
  weight_unit: WeightUnit;
  estimated_1rm: number | null;
  created_at: string;
}

export interface SetDraft {
  setNumber: number;
  reps: string;
  weight: string;
  weightUnit: WeightUnit;
}

export interface ExerciseDraft {
  machineId: number;
  machineModeId?: number;
  machineName: string;
  brandName: string;
  modeName?: string;
  sets: SetDraft[];
}

export interface WorkoutDraft {
  id?: number;
  workoutName: string;
  location: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  isManual?: boolean;
  exercises: ExerciseDraft[];
}

export interface WorkoutListItem extends Workout {
  location_name: string | null;
}

export interface WorkoutDetailEntry {
  entry_order: number;
  machine_id: number;
  machine_mode_id: number | null;
  machine_name: string;
  brand_name: string;
  mode_name: string | null;
  sets: ExerciseSet[];
}

export interface WorkoutDetail extends Workout {
  location_name: string | null;
  entries: WorkoutDetailEntry[];
}

export interface ExerciseHistoryRecord {
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
  sets: ExerciseSet[];
}

export interface UserProfile {
  id: number;
  birth_date: string | null;
  sex: Sex | null;
  created_at: string;
  updated_at: string;
}

export interface BodyWeightLog {
  id: number;
  weight_value: number;
  weight_unit: WeightUnit;
  recorded_at: string;
  created_at: string;
}

export interface DailyOneRepMaxPoint {
  date: string;
  estimated_1rm_kg: number;
  reps: number;
  weight_value: number;
  weight_unit: WeightUnit;
  machine_id: number;
  machine_name: string;
  brand_name: string;
  machine_mode_id: number | null;
  mode_name: string | null;
}

export interface AnalyticsExerciseOption {
  /** Stable key: `${machineId}:${modeId ?? 'none'}` */
  key: string;
  machine_id: number;
  machine_mode_id: number | null;
  machine_name: string;
  brand_name: string;
  mode_name: string | null;
  label: string;
}

export type WorkoutFlowStep =
  | 'idle'
  | 'session-setup'
  | 'manual-session-setup'
  | 'exercise-recap'
  | 'exercise-select'
  | 'set-logging';
