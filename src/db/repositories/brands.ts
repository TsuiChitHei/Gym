import { getDatabase } from '../database';
import type { Brand } from '../../types';

export async function getAllBrands(): Promise<Brand[]> {
  const db = await getDatabase();
  return db.getAllAsync<Brand>('SELECT * FROM brands ORDER BY name ASC');
}

export async function getBrandById(id: number): Promise<Brand | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Brand>('SELECT * FROM brands WHERE id = ?', [id]);
}

export async function createBrand(name: string): Promise<Brand> {
  const db = await getDatabase();
  const result = await db.runAsync('INSERT INTO brands (name) VALUES (?)', [name.trim()]);
  const brand = await getBrandById(result.lastInsertRowId);
  if (!brand) throw new Error('Failed to create brand');
  return brand;
}

export async function updateBrand(id: number, name: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE brands SET name = ? WHERE id = ?', [name.trim(), id]);
}

export async function deleteBrand(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM brands WHERE id = ?', [id]);
}
