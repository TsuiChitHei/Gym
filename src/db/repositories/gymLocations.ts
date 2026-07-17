import { getDatabase } from '../database';
import type { GymLocation } from '../../types';

export async function getOrCreateGymLocation(name: string): Promise<GymLocation> {
  const trimmed = name.trim();
  const db = await getDatabase();
  const existing = await db.getFirstAsync<GymLocation>(
    'SELECT * FROM gym_locations WHERE name = ?',
    [trimmed],
  );
  if (existing) return existing;

  const result = await db.runAsync('INSERT INTO gym_locations (name) VALUES (?)', [trimmed]);
  const created = await db.getFirstAsync<GymLocation>(
    'SELECT * FROM gym_locations WHERE id = ?',
    [result.lastInsertRowId],
  );
  if (!created) throw new Error('Failed to create gym location');
  return created;
}

export async function getAllGymLocations(): Promise<GymLocation[]> {
  const db = await getDatabase();
  return db.getAllAsync<GymLocation>('SELECT * FROM gym_locations ORDER BY name ASC');
}
