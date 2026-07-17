import * as XLSX from 'xlsx';
import {
  APP_VERSION,
  BACKUP_FORMAT_VERSION,
  BACKUP_IMAGES_FOLDER,
  BACKUP_WORKBOOK_NAME,
  SCHEMA_VERSION,
  TABLE_COLUMNS,
  TABLE_SHEETS,
  type TableSheetName,
} from '../../constants/backup';

export interface BackupMeta {
  backup_format_version: number;
  app_version: string;
  schema_version: number;
  export_timestamp: string;
}

/** Preserve blank cells as null so nullable columns still appear as keys. */
const SHEET_PARSE_OPTS: XLSX.Sheet2JSONOpts = { defval: null };

function getSheetHeaders(sheet: XLSX.WorkSheet): string[] {
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
  });
  const headerRow = rows[0];
  if (!headerRow || !Array.isArray(headerRow)) return [];
  return headerRow
    .map((cell) => (cell == null ? '' : String(cell).trim()))
    .filter((header) => header.length > 0);
}

export function validateBackupWorkbook(workbook: XLSX.WorkBook): BackupMeta {
  const metaSheet = workbook.Sheets.meta;
  if (!metaSheet) {
    throw new Error('Backup is missing the meta sheet.');
  }

  const metaRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(metaSheet, SHEET_PARSE_OPTS);
  const metaRow = metaRows[0];
  if (!metaRow) {
    throw new Error('Backup meta sheet is empty.');
  }

  const backupFormatVersion = Number(metaRow.backup_format_version);
  const schemaVersion = Number(metaRow.schema_version);

  if (backupFormatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup format version: ${backupFormatVersion}. Expected ${BACKUP_FORMAT_VERSION}.`,
    );
  }

  if (schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schema version: ${schemaVersion}. Expected ${SCHEMA_VERSION}.`,
    );
  }

  for (const sheetName of TABLE_SHEETS) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Backup is missing required sheet: ${sheetName}`);
    }

    const headers = getSheetHeaders(sheet);
    const columns = TABLE_COLUMNS[sheetName];
    for (const column of columns) {
      if (!headers.includes(column)) {
        throw new Error(`Sheet "${sheetName}" is missing column: ${column}`);
      }
    }
  }

  return {
    backup_format_version: backupFormatVersion,
    app_version: String(metaRow.app_version ?? ''),
    schema_version: schemaVersion,
    export_timestamp: String(metaRow.export_timestamp ?? ''),
  };
}

export function parseTableRows<T extends Record<string, unknown>>(
  workbook: XLSX.WorkBook,
  sheetName: TableSheetName,
): T[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<T>(sheet, SHEET_PARSE_OPTS);
}

export function buildWorkbookFromTables(
  tables: Record<TableSheetName, Record<string, unknown>[]>,
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  const meta: BackupMeta = {
    backup_format_version: BACKUP_FORMAT_VERSION,
    app_version: APP_VERSION,
    schema_version: SCHEMA_VERSION,
    export_timestamp: new Date().toISOString(),
  };
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([meta]), 'meta');

  for (const sheetName of TABLE_SHEETS) {
    const rows = tables[sheetName];
    const sheet =
      rows.length > 0
        ? XLSX.utils.json_to_sheet(rows)
        : XLSX.utils.aoa_to_sheet([TABLE_COLUMNS[sheetName]]);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  return workbook;
}

export { BACKUP_WORKBOOK_NAME, BACKUP_IMAGES_FOLDER, XLSX };
