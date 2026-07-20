import { getDatabase } from '../database';
import type { BodyWeightLog, Sex, UserProfile, WeightUnit } from '../../types';

export async function getUserProfile(): Promise<UserProfile | null> {
  const db = await getDatabase();
  return db.getFirstAsync<UserProfile>('SELECT * FROM user_profile WHERE id = 1');
}

export async function upsertUserProfile(params: {
  birthDate: string | null;
  sex: Sex | null;
}): Promise<UserProfile> {
  const db = await getDatabase();
  const existing = await getUserProfile();
  const now = new Date().toISOString();

  if (existing) {
    await db.runAsync(
      `UPDATE user_profile
       SET birth_date = ?, sex = ?, updated_at = ?
       WHERE id = 1`,
      [params.birthDate, params.sex, now],
    );
  } else {
    await db.runAsync(
      `INSERT INTO user_profile (id, birth_date, sex, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?)`,
      [params.birthDate, params.sex, now, now],
    );
  }

  const profile = await getUserProfile();
  if (!profile) throw new Error('Failed to save profile.');
  return profile;
}

export async function addBodyWeightLog(params: {
  weightValue: number;
  weightUnit: WeightUnit;
  recordedAt?: string;
}): Promise<BodyWeightLog> {
  const db = await getDatabase();
  const recordedAt = params.recordedAt ?? new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO body_weight_logs (weight_value, weight_unit, recorded_at)
     VALUES (?, ?, ?)`,
    [params.weightValue, params.weightUnit, recordedAt],
  );
  const log = await db.getFirstAsync<BodyWeightLog>(
    'SELECT * FROM body_weight_logs WHERE id = ?',
    [result.lastInsertRowId],
  );
  if (!log) throw new Error('Failed to save body weight.');
  return log;
}

export async function getLatestBodyWeight(): Promise<BodyWeightLog | null> {
  const db = await getDatabase();
  return db.getFirstAsync<BodyWeightLog>(
    `SELECT * FROM body_weight_logs
     ORDER BY recorded_at DESC, id DESC
     LIMIT 1`,
  );
}

export async function getAllBodyWeightLogs(): Promise<BodyWeightLog[]> {
  const db = await getDatabase();
  return db.getAllAsync<BodyWeightLog>(
    `SELECT * FROM body_weight_logs
     ORDER BY recorded_at DESC, id DESC`,
  );
}

export function calculateAge(birthDateIso: string, onDate = new Date()): number | null {
  const birth = new Date(birthDateIso);
  if (Number.isNaN(birth.getTime())) return null;
  let age = onDate.getFullYear() - birth.getFullYear();
  const monthDiff = onDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && onDate.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
