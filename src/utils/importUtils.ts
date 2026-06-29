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

import { formatDateDmy, parseIndoDateString } from './dateUtils';

const excelSerialToDateString = (serial: number): string => {
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return Number.isNaN(date.getTime()) ? '' : formatDateDmy(date);
};

export interface ParseResult {
  records: Record<string, string>[];
  preview: Record<string, string>[];
  headers: string[];
  error?: string;
  headerMap?: { header: string; key: string }[];
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
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as unknown[][];

    if (!rows.length) {
      return { records: [], preview: [], headers: [], error: 'File kosong.' };
    }

    const headers = (rows[0] || []).map((h) => String(h).trim());

      const fieldMap = new Map<string, string>();
  const fieldTypeMap = new Map<string, ImportField['type']>();
  const normalizedFields = fields.map((field) => ({
    key: field.key,
    label: field.label,
    normalizedKey: normalizeHeader(field.key),
    normalizedLabel: normalizeHeader(field.label),
  }));

  fields.forEach((field) => {
    fieldMap.set(normalizeHeader(field.key), field.key);
    fieldMap.set(normalizeHeader(field.label), field.key);
    fieldTypeMap.set(field.key, field.type);
  });

  const resolveHeaderKey = (header: string) => {
    const normalizedHeader = normalizeHeader(header);
    const direct = fieldMap.get(normalizedHeader);
    if (direct) return direct;

    const partial = normalizedFields.find(
      (field) =>
        normalizedHeader.includes(field.normalizedKey) ||
        normalizedHeader.includes(field.normalizedLabel) ||
        field.normalizedKey.includes(normalizedHeader) ||
        field.normalizedLabel.includes(normalizedHeader)
    );
    return partial?.key || '';
  };

  const headerKeys = headers.map((header) => resolveHeaderKey(header));

  // Fallback: if `Nis` field wasn't detected from headers, try to auto-detect
  // a column that looks like NIS (mostly numeric or dash) and map it to `Nis`.
  const hasNis = headerKeys.some((k) => k && k.toLowerCase() === 'nis');
  if (!hasNis) {
    const nisFieldExists = fields.some((f) => f.key.toLowerCase() === 'nis');
    if (nisFieldExists) {
      const sampleRows = rows.slice(1, 11);
      const colScores: number[] = [];
      for (let c = 0; c < headers.length; c++) {
        let score = 0;
        for (const r of sampleRows) {
          const val = r && r[c] !== undefined && r[c] !== null ? String(r[c]).trim() : '';
          if (!val) continue;
          // consider valid NIS-like values: digits, digits with punctuation, or a dash
          if (/^[0-9\-\.\s]+$/.test(val)) score += 1;
        }
        colScores[c] = score;
      }
      const maxScore = Math.max(...colScores.map((s) => s || 0));
      if (maxScore > 0) {
        const bestIdx = colScores.findIndex((s) => s === maxScore);
        if (bestIdx >= 0 && (!headerKeys[bestIdx] || headerKeys[bestIdx] === '')) {
          headerKeys[bestIdx] = 'Nis';
          console.warn(`Auto-detected Nis column at index ${bestIdx} (header: "${headers[bestIdx]}")`);
        }
      }
    }
  }

  const headerMap = headers.map((h, i) => ({ header: String(h || ''), key: headerKeys[i] || '' }));

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
            if (rawValue instanceof Date) {
              value = formatDateDmy(rawValue);
            } else if (typeof rawValue === 'number') {
              value = excelSerialToDateString(rawValue);
              } else {
                const rawString = String(rawValue).trim();
                if (/^\d+(\.\d+)?$/.test(rawString)) {
                  const numericValue = Number(rawString);
                  value = Number.isNaN(numericValue) ? rawString : excelSerialToDateString(numericValue);
                } else {
                  const parsed = parseIndoDateString(rawString);
                  value = parsed ? formatDateDmy(parsed) : rawString;
                }
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
      headerMap,
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

export function generateTemplateWorkbook(fields: ImportField[], sheetName = 'Template', presetValues?: Record<string, string>): Blob {
  const headers = fields
    .filter((field) => field.key.toLowerCase() !== 'timestamp')
    .map((field) => field.key);

  const rows: string[][] = [headers];
  if (presetValues && Object.keys(presetValues).length > 0) {
    const rowValues = headers.map((header) => {
      const value = presetValues[header];
      return value || '';
    });
    rows.push(rowValues);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
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
