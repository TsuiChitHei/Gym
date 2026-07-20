import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { getDatabase } from '../../db/database';
import { TABLE_SHEETS, type TableSheetName } from '../../constants/backup';
import { ensureMachineImagesDir, getMachineImagesDir } from '../images';
import { clearAllAppData } from './export';
import {
  BACKUP_IMAGES_FOLDER,
  BACKUP_WORKBOOK_NAME,
  parseTableRows,
  validateBackupWorkbook,
  XLSX,
} from './validate';
import { estimateOneRepMax } from '../../utils/oneRepMax';

export async function importBackup(): Promise<void> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
    copyToCacheDirectory: false,
  });

  if (picked.canceled || !picked.assets[0]) {
    return;
  }

  const pickedAsset = picked.assets[0];
  const importCacheDir = `${FileSystem.cacheDirectory}imports/`;
  const safeFilename = pickedAsset.name?.trim() || `backup-${Date.now()}.zip`;
  const localZipUri = `${importCacheDir}${safeFilename}`;

  await FileSystem.deleteAsync(importCacheDir, { idempotent: true });
  await FileSystem.makeDirectoryAsync(importCacheDir, { intermediates: true });
  await FileSystem.copyAsync({
    from: pickedAsset.uri,
    to: localZipUri,
  });

  const zipBase64 = await FileSystem.readAsStringAsync(localZipUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });

  const workbookFile = zip.file(BACKUP_WORKBOOK_NAME);
  if (!workbookFile) {
    throw new Error(`Backup ZIP is missing ${BACKUP_WORKBOOK_NAME}.`);
  }

  const workbookArrayBuffer = await workbookFile.async('arraybuffer');
  const workbook = XLSX.read(workbookArrayBuffer, { type: 'array' });
  validateBackupWorkbook(workbook);

  // After restore, backfill missing 1RM values if importing an older backup.
  // (Handled by migrateSchema on next app start / getDatabase call as well.)

  const machines = parseTableRows<{
    id: number;
    brand_id: number;
    machine_name: string;
    is_multipurpose: number;
    image_filename: string | null;
    created_at: string;
  }>(workbook, 'machines');

  for (const machine of machines) {
    if (!machine.image_filename) continue;
    const imageFile = zip.file(`${BACKUP_IMAGES_FOLDER}/${machine.image_filename}`);
    if (!imageFile) {
      throw new Error(
        `Backup is missing image file for machine "${machine.machine_name}": ${machine.image_filename}`,
      );
    }
  }

  const restoreDir = `${FileSystem.cacheDirectory}gym-backup-import/`;
  await FileSystem.deleteAsync(restoreDir, { idempotent: true });
  await FileSystem.makeDirectoryAsync(`${restoreDir}${BACKUP_IMAGES_FOLDER}/`, { intermediates: true });

  const workbookBase64 = await workbookFile.async('base64');
  await FileSystem.writeAsStringAsync(`${restoreDir}${BACKUP_WORKBOOK_NAME}`, workbookBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  for (const machine of machines) {
    if (!machine.image_filename) continue;
    const imageFile = zip.file(`${BACKUP_IMAGES_FOLDER}/${machine.image_filename}`)!;
    const imageBase64 = await imageFile.async('base64');
    await FileSystem.writeAsStringAsync(
      `${restoreDir}${BACKUP_IMAGES_FOLDER}/${machine.image_filename}`,
      imageBase64,
      { encoding: FileSystem.EncodingType.Base64 },
    );
  }

  await clearAllAppData();
  await ensureMachineImagesDir();

  const db = await getDatabase();
  await db.execAsync('BEGIN IMMEDIATE');
  try {
    for (const table of TABLE_SHEETS) {
      if (!workbook.Sheets[table]) continue;
      const rows = parseTableRows<Record<string, unknown>>(workbook, table);
      for (const row of rows) {
        const columns = Object.keys(row).filter((col) => row[col] !== undefined);
        if (columns.length === 0) continue;
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((col) => row[col]);
        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          values as (string | number | null)[],
        );
      }
    }

    // Backfill estimated 1RM for older backups that lack the column/values.
    const setsNeeding1rm = await db.getAllAsync<{
      id: number;
      reps: number;
      weight_value: number;
    }>(
      `SELECT id, reps, weight_value FROM exercise_sets
       WHERE estimated_1rm IS NULL AND reps > 0`,
    );
    for (const set of setsNeeding1rm) {
      await db.runAsync('UPDATE exercise_sets SET estimated_1rm = ? WHERE id = ?', [
        estimateOneRepMax(set.weight_value, set.reps),
        set.id,
      ]);
    }

    for (const machine of machines) {
      if (!machine.image_filename) continue;
      await FileSystem.copyAsync({
        from: `${restoreDir}${BACKUP_IMAGES_FOLDER}/${machine.image_filename}`,
        to: `${getMachineImagesDir()}${machine.image_filename}`,
      });
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
