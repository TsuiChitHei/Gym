export const BACKUP_FORMAT_VERSION = 2;
export const SCHEMA_VERSION = 2;
export const APP_VERSION = '1.0.0';

export const BACKUP_WORKBOOK_NAME = 'backup.xlsx';
export const BACKUP_IMAGES_FOLDER = 'images';

export const TABLE_SHEETS = [
  'gym_locations',
  'brands',
  'machines',
  'machine_modes',
  'workouts',
  'workout_entries',
  'exercise_sets',
  'user_profile',
  'body_weight_logs',
] as const;

export type TableSheetName = (typeof TABLE_SHEETS)[number];

export const TABLE_COLUMNS: Record<TableSheetName, string[]> = {
  gym_locations: ['id', 'name', 'created_at'],
  brands: ['id', 'name', 'created_at'],
  machines: ['id', 'brand_id', 'machine_name', 'is_multipurpose', 'image_filename', 'created_at'],
  machine_modes: ['id', 'machine_id', 'mode_name', 'created_at'],
  workouts: [
    'id',
    'workout_name',
    'gym_location_id',
    'started_at',
    'ended_at',
    'duration_seconds',
    'created_at',
  ],
  workout_entries: ['id', 'workout_id', 'machine_id', 'machine_mode_id', 'entry_order', 'created_at'],
  exercise_sets: [
    'id',
    'workout_entry_id',
    'set_number',
    'reps',
    'weight_value',
    'weight_unit',
    'estimated_1rm',
    'created_at',
  ],
  user_profile: ['id', 'birth_date', 'sex', 'created_at', 'updated_at'],
  body_weight_logs: ['id', 'weight_value', 'weight_unit', 'recorded_at', 'created_at'],
};
