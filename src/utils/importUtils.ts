import * as XLSX from 'xlsx';

export interface ImportField {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'multiselect-checkbox';
}

const normalizeHeader = (value: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[^a-z0-9]/gi, '')
    .trim();

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDateDDMMYYYY = (date: Date) =>
  `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;

const excelSerialToDateString = (serial: number): string => {
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return Number.isNaN(date.getTime()) ? '' : formatDateDDMMYYYY(date);
};

export interface ParseResult {
  records: Record<string, string>[];
  preview: Record<string, string>[];
  headers: string[];
  error?: string;
}

export async function parseSpreadsheetFile(file: File, fields: ImportField[]): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();
  if (!(fileName.endsWith('.xlsx') || fileName.endsWith('.xls'))) {
    return {
      records: [],
      preview: [],
      headers: [],
      error: 'File harus berformat Excel (.xlsx atau .xls).',
    };
  }
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { records: [], preview: [], headers: [], error: 'File tidak memiliki sheet.' };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as string[][];

    if (!rows.length) {
      return { records: [], preview: [], headers: [], error: 'File kosong.' };
    }

    const headers = (rows[0] || []).map((h) => String(h).trim());

      const fieldMap = new Map<string, string>();
  const fieldTypeMap = new Map<string, ImportField['type']>();
  fields.forEach((field) => {
    fieldMap.set(normalizeHeader(field.key), field.key);
    fieldMap.set(normalizeHeader(field.label), field.key);
    fieldTypeMap.set(field.key, field.type);
  });

  const headerKeys = headers.map((header) => fieldMap.get(normalizeHeader(header)) || '');

  const records: Record<string, string>[] = [];


    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const record: Record<string, string> = {};
      let hasValue = false;

      headerKeys.forEach((key, index) => {
        if (!key) return;
        const rawValue = row[index];
        const fieldType = fieldTypeMap.get(key);
        let value = '';
        if (rawValue !== undefined && rawValue !== null) {
          if (fieldType === 'date') {
            if (typeof rawValue === 'number') {
              value = excelSerialToDateString(rawValue);
            } else {
              const rawString = String(rawValue).trim();
              const parsed = new Date(rawString);
              value = Number.isNaN(parsed.getTime()) ? rawString : formatDateDDMMYYYY(parsed);
            }
          } else if (typeof rawValue === 'number') {
            value = String(rawValue).replace('.', ',');
          } else {
            const rawString = String(rawValue).trim();
            value = /\d+\.\d+/.test(rawString) ? rawString.replace('.', ',') : rawString;
          }
        }
        if (value) hasValue = true;
        record[key] = value;
      });

      if (hasValue) {
        records.push(record);
      }
    }

    return {
      records,
      preview: records.slice(0, 5),
      headers,
    };
  } catch (error) {
    return {
      records: [],
      preview: [],
      headers: [],
      error: error instanceof Error ? error.message : 'Gagal membaca file.',
    };
  }
}

export function generateTemplateWorkbook(fields: ImportField[], sheetName = 'Template'): Blob {
  const headers = fields
    .filter((field) => field.key.toLowerCase() !== 'timestamp')
    .map((field) => field.key);

  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function exportRecordsWorkbook(
  fields: ImportField[],
  records: Record<string, string>[],
  sheetName = 'Data'
): Blob {
  const headers = fields.map((field) => field.label);
  const data = records.map((row) => fields.map((field) => row[field.key] || ''));
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
