import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('gym.db');
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
    await dbInstance.execAsync(SCHEMA_SQL);
    await seedDefaultBrand(dbInstance);
  }
  return dbInstance;
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
