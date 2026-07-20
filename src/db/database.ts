import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { estimateOneRepMax } from '../utils/oneRepMax';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('gym.db');
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
    await dbInstance.execAsync(SCHEMA_SQL);
    await migrateSchema(dbInstance);
    await seedDefaultBrand(dbInstance);
  }
  return dbInstance;
}

async function tableHasColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some((col) => col.name === column);
}

async function migrateSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  if (!(await tableHasColumn(db, 'exercise_sets', 'estimated_1rm'))) {
    await db.execAsync(
      'ALTER TABLE exercise_sets ADD COLUMN estimated_1rm REAL CHECK (estimated_1rm IS NULL OR estimated_1rm >= 0)',
    );
  }

  // Backfill missing 1RM estimates for existing sets.
  const sets = await db.getAllAsync<{
    id: number;
    reps: number;
    weight_value: number;
    estimated_1rm: number | null;
  }>('SELECT id, reps, weight_value, estimated_1rm FROM exercise_sets WHERE estimated_1rm IS NULL');

  for (const set of sets) {
    if (set.reps <= 0) continue;
    const estimated = estimateOneRepMax(set.weight_value, set.reps);
    await db.runAsync('UPDATE exercise_sets SET estimated_1rm = ? WHERE id = ?', [
      estimated,
      set.id,
    ]);
  }
}

async function seedDefaultBrand(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM brands WHERE name = ?',
    ['Free weights'],
  );
  if (!existing) {
    await db.runAsync('INSERT INTO brands (name) VALUES (?)', ['Free weights']);
  }
}

export async function withTransaction<T>(fn: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    const result = await fn(db);
    await db.execAsync('COMMIT');
    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
