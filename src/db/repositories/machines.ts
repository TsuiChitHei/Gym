import { getDatabase } from '../database';
import type { Machine, MachineMode, MachineWithBrand } from '../../types';

export async function getMachinesByBrand(brandId: number): Promise<Machine[]> {
  const db = await getDatabase();
  return db.getAllAsync<Machine>(
    'SELECT * FROM machines WHERE brand_id = ? ORDER BY machine_name ASC',
    [brandId],
  );
}

export async function getMachineById(id: number): Promise<Machine | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Machine>('SELECT * FROM machines WHERE id = ?', [id]);
}

export async function getMachineWithBrand(id: number): Promise<MachineWithBrand | null> {
  const db = await getDatabase();
  return db.getFirstAsync<MachineWithBrand>(
    `SELECT m.*, b.name AS brand_name
     FROM machines m
     JOIN brands b ON b.id = m.brand_id
     WHERE m.id = ?`,
    [id],
  );
}

export async function createMachine(params: {
  brandId: number;
  machineName: string;
  isMultipurpose: boolean;
  imageFilename: string | null;
  modes: string[];
}): Promise<Machine> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO machines (brand_id, machine_name, is_multipurpose, image_filename)
     VALUES (?, ?, ?, ?)`,
    [params.brandId, params.machineName.trim(), params.isMultipurpose ? 1 : 0, params.imageFilename],
  );
  const machineId = result.lastInsertRowId;

  if (params.isMultipurpose) {
    for (const mode of params.modes) {
      await db.runAsync(
        'INSERT INTO machine_modes (machine_id, mode_name) VALUES (?, ?)',
        [machineId, mode.trim()],
      );
    }
  }

  const machine = await getMachineById(machineId);
  if (!machine) throw new Error('Failed to create machine');
  return machine;
}

export async function updateMachine(params: {
  id: number;
  machineName: string;
  isMultipurpose: boolean;
  imageFilename: string | null;
  modes: string[];
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE machines
     SET machine_name = ?, is_multipurpose = ?, image_filename = ?
     WHERE id = ?`,
    [params.machineName.trim(), params.isMultipurpose ? 1 : 0, params.imageFilename, params.id],
  );

  await db.runAsync('DELETE FROM machine_modes WHERE machine_id = ?', [params.id]);
  if (params.isMultipurpose) {
    for (const mode of params.modes) {
      await db.runAsync(
        'INSERT INTO machine_modes (machine_id, mode_name) VALUES (?, ?)',
        [params.id, mode.trim()],
      );
    }
  }
}

export async function deleteMachine(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM machines WHERE id = ?', [id]);
}

export async function getMachineModes(machineId: number): Promise<MachineMode[]> {
  const db = await getDatabase();
  return db.getAllAsync<MachineMode>(
    'SELECT * FROM machine_modes WHERE machine_id = ? ORDER BY mode_name ASC',
    [machineId],
  );
}

export async function getAllMachinesWithBrand(): Promise<MachineWithBrand[]> {
  const db = await getDatabase();
  return db.getAllAsync<MachineWithBrand>(
    `SELECT m.*, b.name AS brand_name
     FROM machines m
     JOIN brands b ON b.id = m.brand_id
     ORDER BY b.name ASC, m.machine_name ASC`,
  );
}
