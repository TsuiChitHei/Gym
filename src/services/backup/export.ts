import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { getDatabase } from '../../db/database';
import { TABLE_SHEETS, type TableSheetName } from '../../constants/backup';
import { ensureMachineImagesDir, getMachineImageUri, getMachineImagesDir } from '../images';
import { BACKUP_IMAGES_FOLDER, BACKUP_WORKBOOK_NAME, buildWorkbookFromTables, XLSX } from './validate';

export async function exportBackup(): Promise<void> {
  const db = await getDatabase();
  const tables = {} as Record<TableSheetName, Record<string, unknown>[]>;

  for (const table of TABLE_SHEETS) {
    tables[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
  }

  const workbook = buildWorkbookFromTables(tables);
  const workbookBase64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

  const tempDir = `${FileSystem.cacheDirectory}gym-backup-export/`;
  const imagesDir = `${tempDir}${BACKUP_IMAGES_FOLDER}/`;
  await FileSystem.deleteAsync(tempDir, { idempotent: true });
  await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });

  await FileSystem.writeAsStringAsync(`${tempDir}${BACKUP_WORKBOOK_NAME}`, workbookBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const machines = tables.machines;
  for (const machine of machines) {
    const imageFilename = machine.image_filename as string | null;
    if (!imageFilename) continue;
    const sourceUri = getMachineImageUri(imageFilename);
    if (!sourceUri) continue;
    const info = await FileSystem.getInfoAsync(sourceUri);
    if (info.exists) {
      await FileSystem.copyAsync({
        from: sourceUri,
        to: `${imagesDir}${imageFilename}`,
      });
    }
  }

  const zip = new JSZip();
  const workbookBytes = await FileSystem.readAsStringAsync(`${tempDir}${BACKUP_WORKBOOK_NAME}`, {
    encoding: FileSystem.EncodingType.Base64,
  });
  zip.file(BACKUP_WORKBOOK_NAME, workbookBytes, { base64: true });

  const imageFiles = await FileSystem.readDirectoryAsync(imagesDir);
  for (const filename of imageFiles) {
    const base64 = await FileSystem.readAsStringAsync(`${imagesDir}${filename}`, {
      encoding: FileSystem.EncodingType.Base64,
    });
    zip.file(`${BACKUP_IMAGES_FOLDER}/${filename}`, base64, { base64: true });
  }

  const zipBase64 = await zip.generateAsync({ type: 'base64' });
  const dateStamp = new Date().toISOString().slice(0, 10);
  const zipPath = `${FileSystem.cacheDirectory}gym-backup-${dateStamp}.zip`;
  await FileSystem.writeAsStringAsync(zipPath, zipBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(zipPath, {
      mimeType: 'application/zip',
      dialogTitle: 'Export Gym Backup',
      UTI: 'public.zip-archive',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}

export async function clearAllAppData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  for (const table of [...TABLE_SHEETS].reverse()) {
    await db.runAsync(`DELETE FROM ${table}`);
  }
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const imagesDir = getMachineImagesDir();
  const info = await FileSystem.getInfoAsync(imagesDir);
  if (info.exists) {
    await FileSystem.deleteAsync(imagesDir, { idempotent: true });
  }
  await ensureMachineImagesDir();
}
