// Google Sheets API service via Google Apps Script Web App
// OPTIMIZED VERSION - With caching, timeout, and parallel fetching

// ===================== KONFIGURASI =====================

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJYL__OE81FMUFKbXecW3T2HFiFwM7RozLje293UQF6X6WNIqgtuJHAF3A6sCyPTNKqw/exec';

const SPREADSHEET_CONFIG = {
  siswa: {
    id: '1qN1MJ7kVRbSnsV9-WblGikHmCTzLZOTezmuUBgrZ3-k',
    sheet: 'Siswa',
  },
  kelompokKelas: {
    id: '1qN1MJ7kVRbSnsV9-WblGikHmCTzLZOTezmuUBgrZ3-k',
    sheet: 'Kelompok Kelas',
  },
  presensi: {
    id: '13oDDldQdcVBg5ai3nS9oGtYuq8ijWsloNRmXK87IHnw',
    sheet: 'Presensi',
  },
  perkembangan: {
    id: '1fZmtYB5nPslds7pjQ6sIDHfVYTf_wg1KeTXbmKeUBMw',
    sheet: 'Perkembangan',
  },
  nilaiUtbk: {
    id: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheet: 'Nilai UTBK',
  },
  nilaiTkaSma: {
    id: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheet: 'Nilai TKA SMA',
  },
  nilaiTkaSmp: {
    id: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheet: 'Nilai TKA SMP',
  },
  nilaiTkaSd: {
    id: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheet: 'Nilai TKA SD',
  },
  nilaiTesStandar: {
    id: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheet: 'Nilai Tes Standar',
  },
  nilaiEvaluasi: {
    id: '1yb_UoQKe3tgbbTmnfYUFQiNQLe9NGdWsE-fzVLGthmw',
    sheet: 'Nilai TES EVALUASI',
  },
  pelayanan: {
    id: '1KcsMCeFmGAmwKHFqnIxiUxDmLDpR6YDBZBd8Zbd-s6w',
    sheet: 'Pelayanan',
  },
  pengajar: {
    id: '1PQNdVQUJa-YQaWv-KZdIC7WE3VVlRAxpX5XT79NMJos',
    sheet: 'Pengajar',
  },
};

export type SheetKey = keyof typeof SPREADSHEET_CONFIG;

// ===================== CACHE SYSTEM =====================

interface CacheEntry {
  data: Record<string, string>[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 menit
const cache = new Map<string, CacheEntry>();

// In-flight request deduplication
const inflightRequests = new Map<string, Promise<Record<string, string>[]>>();

// Normalize data for specific sheets (e.g., Pengajar header differences)
function normalizeKey(rawKey: string): string {
  return rawKey
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRowKeys(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  Object.entries(row).forEach(([key, value]) => {
    const cleanedKey = normalizeKey(key);
    normalized[cleanedKey] = value;
    // Keep original key if different to avoid losing access
    if (cleanedKey !== key && normalized[key] === undefined) {
      normalized[key] = value;
    }
  });
  return normalized;
}

function normalizeSheetData(key: SheetKey, rows: Record<string, string>[]): Record<string, string>[] {
  const normalizedRows = rows.map(normalizeRowKeys);

  if (key === 'pengajar') {
    return normalizedRows.map((row) => {
      const normalized = { ...row };

      const findByNormalizedKey = (target: string) => {
        const targetKey = normalizeKey(target).toLowerCase();
        const found = Object.entries(row).find(([k]) => {
          const nk = normalizeKey(k).toLowerCase();
          return nk === targetKey || nk.includes(targetKey);
        });
        return found ? String(found[1] || '') : '';
      };

      const pengajar =
        row['Pengajar'] ||
        row['Nama Pengajar'] ||
        findByNormalizedKey('Pengajar') ||
        findByNormalizedKey('Nama Pengajar');

      const mataPelajaran =
        row['Mata Pelajaran'] ||
        row['Mata  Pelajaran'] ||
        findByNormalizedKey('Mata Pelajaran');

      if (pengajar) {
        normalized['Pengajar'] = pengajar;
        normalized['Nama Pengajar'] = pengajar;
      }
      if (mataPelajaran) {
        normalized['Mata Pelajaran'] = mataPelajaran;
      }
      return normalized;
    });
  }

  if (key === 'siswa') {
    return normalizedRows.map((row) => {
      const normalized = { ...row };

      const findByNormalizedKey = (target: string) => {
        const targetKey = normalizeKey(target).toLowerCase();
        const found = Object.entries(row).find(([k]) => {
          const nk = normalizeKey(k).toLowerCase();
          return nk === targetKey || nk.includes(targetKey);
        });
        return found ? String(found[1] || '') : '';
      };

      const whatsappSiswa =
        row['No.whatsapp siswa'] ||
        row['No. whatsapp siswa'] ||
        row['No Whatsapp Siswa'] ||
        row['No Whatsapp'] ||
        row['Tlpn'] ||
        row['Telepon'] ||
        findByNormalizedKey('No whatsapp siswa') ||
        findByNormalizedKey('Tlpn') ||
        findByNormalizedKey('Telepon');

      const whatsappOrtu =
        row['No.whatsapp orang tua'] ||
        row['No. whatsapp orang tua'] ||
        row['No Whatsapp Orang Tua'] ||
        row['No Whatsapp Ortu'] ||
        findByNormalizedKey('No whatsapp orang tua') ||
        findByNormalizedKey('Whatsapp orang tua');

      if (whatsappSiswa) {
        normalized['No.whatsapp siswa'] = whatsappSiswa;
        normalized['Tlpn'] = whatsappSiswa;
      }
      if (whatsappOrtu) {
        normalized['No.whatsapp orang tua'] = whatsappOrtu;
      }
      return normalized;
    });
  }

  return normalizedRows;
}

function getCached(key: string): Record<string, string>[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: Record<string, string>[]) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export function getCacheAge(key: string): number | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return Date.now() - entry.timestamp;
}

// ===================== APPS SCRIPT URL MANAGEMENT =====================

const APPS_SCRIPT_URL_KEY = 'akademik_apps_script_url';

export function getAppsScriptUrl(): string {
  const saved = localStorage.getItem(APPS_SCRIPT_URL_KEY);
  if (!saved) return DEFAULT_APPS_SCRIPT_URL;
  return saved;
}

export function setAppsScriptUrl(url: string): void {
  localStorage.setItem(APPS_SCRIPT_URL_KEY, url.trim());
}

export function resetAppsScriptUrl(): void {
  localStorage.removeItem(APPS_SCRIPT_URL_KEY);
}

export function getDefaultAppsScriptUrl(): string {
  return DEFAULT_APPS_SCRIPT_URL;
}

export function isAppsScriptConfigured(): boolean {
  const url = getAppsScriptUrl();
  return url.length > 0 && url.startsWith('https://script.google.com/');
}

// ===================== API RESPONSE TYPE =====================

interface ApiResponse {
  success: boolean;
  message: string;
  data?: Record<string, string>[] | Record<string, string>;
  headers?: string[];
  totalRows?: number;
  totalResults?: number;
  rowIndex?: number;
  deletedRow?: number;
  totalAdded?: number;
  timestamp?: string;
}

// ===================== FETCH WITH TIMEOUT =====================

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ===================== CSV FETCH (FASTER FOR READ) =====================

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current.trim());
        current = '';
        if (row.some(c => c !== '')) rows.push(row);
        row = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(c => c !== '')) rows.push(row);
  }
  return rows;
}

async function fetchCSVData(key: SheetKey): Promise<Record<string, string>[]> {
  const config = SPREADSHEET_CONFIG[key];
  const url = `https://docs.google.com/spreadsheets/d/${config.id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(config.sheet)}`;

  try {
    const response = await fetchWithTimeout(url, {}, 12000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const rows = parseCSV(text);
    if (rows.length < 1) return [];

    const headers = rows[0].map(h => normalizeKey(h.replace(/^"|"$/g, '')));

    const headerLength = headers.length;
    const hasInvalidRows = rows.slice(1).some((row) => row.length > headerLength);
    if (hasInvalidRows) {
      console.warn(`CSV column mismatch for ${key}. Falling back to Apps Script.`);
      return [];
    }

    const normalizedHeaderMap: Record<string, string> = {};
    headers.forEach((header) => {
      normalizedHeaderMap[normalizeKey(header).toLowerCase()] = header;
    });
    const data: Record<string, string>[] = [];

    for (let i = 1; i < rows.length; i++) {
      const obj: Record<string, string> = {};
      let isEmpty = true;
      headers.forEach((header, j) => {
        const val = (rows[i][j] || '').replace(/^"|"$/g, '');
        obj[header] = val;
        if (val) isEmpty = false;
      });
      if (isEmpty) continue;
      obj['_rowIndex'] = String(i + 1);
      obj['_id'] = `csv_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      const normalizedPengajarKey = normalizedHeaderMap['pengajar'] || normalizedHeaderMap['nama pengajar'];
      const normalizedMapelKey = normalizedHeaderMap['mata pelajaran'] || normalizedHeaderMap['mata  pelajaran'];
      if (normalizedPengajarKey && !obj['Pengajar'] && obj[normalizedPengajarKey]) {
        obj['Pengajar'] = obj[normalizedPengajarKey];
      }
      if (normalizedMapelKey && !obj['Mata Pelajaran'] && obj[normalizedMapelKey]) {
        obj['Mata Pelajaran'] = obj[normalizedMapelKey];
      }

      const normalizedWhatsappSiswaKey =
        normalizedHeaderMap['nowhatsappsiswa'] ||
        normalizedHeaderMap['nowhatsappsiswa'] ||
        normalizedHeaderMap['nowhatsapp'] ||
        normalizedHeaderMap['tlpn'] ||
        normalizedHeaderMap['telepon'];
      const normalizedWhatsappOrtuKey =
        normalizedHeaderMap['nowhatsapporangtua'] ||
        normalizedHeaderMap['nowhatsapportu'];

      if (normalizedWhatsappSiswaKey && !obj['No.whatsapp siswa'] && obj[normalizedWhatsappSiswaKey]) {
        obj['No.whatsapp siswa'] = obj[normalizedWhatsappSiswaKey];
        obj['Tlpn'] = obj[normalizedWhatsappSiswaKey];
      }
      if (normalizedWhatsappOrtuKey && !obj['No.whatsapp orang tua'] && obj[normalizedWhatsappOrtuKey]) {
        obj['No.whatsapp orang tua'] = obj[normalizedWhatsappOrtuKey];
      }

      data.push(obj);
    }
    return data;
  } catch (error) {
    console.error(`Error fetching CSV ${key}:`, error);
    return [];
  }
}

// ===================== APPS SCRIPT API =====================

async function apiGet(sheetKey: SheetKey): Promise<ApiResponse> {
  const baseUrl = getAppsScriptUrl();
  const url = `${baseUrl}?action=read&sheet=${sheetKey}`;

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    redirect: 'follow',
  }, 15000);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

async function apiPost(body: Record<string, unknown>): Promise<ApiResponse> {
  const baseUrl = getAppsScriptUrl();

  const response = await fetchWithTimeout(baseUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(body),
  }, 20000);

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

// ===================== MAIN CRUD FUNCTIONS =====================

/**
 * READ - Fetch all data with caching & deduplication
 * Strategy: CSV first (faster), Apps Script as fallback for mutations
 */
export async function fetchAllData(key: SheetKey, forceRefresh = false): Promise<Record<string, string>[]> {
  const cacheKey = key;

  // 1. Return cached data if available and not forcing refresh
  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // 2. Deduplicate in-flight requests
  const inflightKey = cacheKey;
  if (!forceRefresh && inflightRequests.has(inflightKey)) {
    return inflightRequests.get(inflightKey)!;
  }

  // 3. Create the fetch promise
  const fetchPromise = (async (): Promise<Record<string, string>[]> => {
    try {
      // Try CSV first (usually faster, no cold start)
      const csvData = await fetchCSVData(key);
      if (csvData.length > 0) {
        const normalizedCsv = normalizeSheetData(key, csvData);
        setCache(cacheKey, normalizedCsv);
        return normalizedCsv;
      }

      // Fallback to Apps Script API
      if (isAppsScriptConfigured()) {
        const result = await apiGet(key);
        if (result.success && Array.isArray(result.data)) {
          const apiData = (result.data as Record<string, string>[]).map((item, i) => ({
            ...item,
            _id: `api_${item._rowIndex || i}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            _rowIndex: String(item._rowIndex || i + 2),
          }));
          const normalizedApi = normalizeSheetData(key, apiData);
          setCache(cacheKey, normalizedApi);
          return normalizedApi;
        }
      }

      return [];
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);

      // Return stale cache if available
      const stale = cache.get(cacheKey);
      if (stale) return stale.data;

      return [];
    } finally {
      inflightRequests.delete(inflightKey);
    }
  })();

  inflightRequests.set(inflightKey, fetchPromise);
  return fetchPromise;
}

/**
 * CREATE - Add new record (always via Apps Script)
 */
export async function createRecord(key: SheetKey, data: Record<string, string>): Promise<{ success: boolean; message: string; data?: Record<string, string> }> {
  const cleanData = { ...data };
  delete cleanData['_id'];
  delete cleanData['_rowIndex'];
  delete cleanData['Timestamp'];

  if (isAppsScriptConfigured()) {
    try {
      const result = await apiPost({
        action: 'create',
        sheet: key,
        data: cleanData,
      });

      if (result.success) {
        // Invalidate cache so next fetch gets fresh data
        invalidateCache(key);
        if (key === 'kelompokKelas') {
          invalidateOptionsCache('kelompokKelas');
        }
        const newRecord = (result.data as Record<string, string>) || {};
        return {
          success: true,
          message: result.message,
          data: {
            ...newRecord,
            _id: `api_${newRecord._rowIndex || Date.now()}_${Date.now()}`,
            _rowIndex: String(newRecord._rowIndex || result.rowIndex || 0),
          },
        };
      }
      return { success: false, message: result.message };
    } catch (error) {
      return { success: false, message: `Error koneksi: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  return { success: false, message: 'Google Apps Script belum dikonfigurasi.' };
}

/**
 * BULK CREATE - Add multiple records at once (Apps Script)
 */
export async function createBulkRecords(key: SheetKey, dataArray: Record<string, string>[]): Promise<{ success: boolean; message: string; totalAdded?: number }> {
  const cleaned = dataArray.map((item) => {
    const cleanData = { ...item };
    delete cleanData['_id'];
    delete cleanData['_rowIndex'];
    delete cleanData['Timestamp'];
    return cleanData;
  });

  if (isAppsScriptConfigured()) {
    try {
      const result = await apiPost({
        action: 'bulkCreate',
        sheet: key,
        data: cleaned,
      });

      if (result.success) {
        invalidateCache(key);
        if (key === 'kelompokKelas') {
          invalidateOptionsCache('kelompokKelas');
        }
        return { success: true, message: result.message, totalAdded: result.totalAdded };
      }
      return { success: false, message: result.message };
    } catch (error) {
      return { success: false, message: `Error koneksi: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  return { success: false, message: 'Google Apps Script belum dikonfigurasi.' };
}

/**
 * UPDATE - Update existing record
 */
export async function updateRecord(key: SheetKey, rowIndex: number, data: Record<string, string>): Promise<{ success: boolean; message: string }> {
  const cleanData = { ...data };
  delete cleanData['_id'];
  delete cleanData['_rowIndex'];
  delete cleanData['Timestamp'];

  if (isAppsScriptConfigured()) {
    try {
      const result = await apiPost({
        action: 'update',
        sheet: key,
        row: rowIndex,
        data: cleanData,
      });
      if (result.success) {
        invalidateCache(key);
      }
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `Error koneksi: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  return { success: false, message: 'Google Apps Script belum dikonfigurasi.' };
}

/**
 * DELETE - Delete a record
 */
export async function deleteRecord(key: SheetKey, rowIndex: number): Promise<{ success: boolean; message: string }> {
  if (isAppsScriptConfigured()) {
    try {
      const result = await apiPost({
        action: 'delete',
        sheet: key,
        row: rowIndex,
      });
      if (result.success) {
        invalidateCache(key);
      }
      return { success: result.success, message: result.message };
    } catch (error) {
      return { success: false, message: `Error koneksi: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  return { success: false, message: 'Google Apps Script belum dikonfigurasi.' };
}

/**
 * Test connection to Apps Script
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  if (!isAppsScriptConfigured()) {
    return { success: false, message: 'URL Google Apps Script belum diatur.' };
  }

  try {
    const result = await apiGet('pengajar');
    if (result.success !== undefined) {
      return { success: true, message: `Koneksi berhasil! ${result.message}` };
    }
    return { success: false, message: 'Response tidak valid dari server.' };
  } catch (error) {
    return { success: false, message: `Gagal terhubung: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// ===================== UTILITY =====================

export function getSpreadsheetUrl(key: SheetKey): string {
  const config = SPREADSHEET_CONFIG[key];
  return `https://docs.google.com/spreadsheets/d/${config.id}/edit`;
}

// ===================== FETCH OPTIONS FROM SHEET COLUMN =====================

/**
 * Fetch a list of options from a single column in a spreadsheet sheet.
 * Used for dynamic dropdowns/checklists (e.g., Kelompok Kelas).
 * Caches results for 10 minutes.
 */
const optionsCache = new Map<string, { data: string[]; timestamp: number }>();
const OPTIONS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function invalidateOptionsCache(sheetKey?: SheetKey) {
  if (!sheetKey) {
    optionsCache.clear();
    return;
  }
  const prefix = `options_${sheetKey}_`;
  Array.from(optionsCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) {
      optionsCache.delete(key);
    }
  });
}

export async function fetchSheetOptions(sheetKey: SheetKey, columnHeader?: string): Promise<string[]> {
  const cacheKey = `options_${sheetKey}_${columnHeader || 'A'}`;

  // Check cache
  const cached = optionsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < OPTIONS_CACHE_TTL) {
    return cached.data;
  }

  try {
    const config = SPREADSHEET_CONFIG[sheetKey];
    const url = `https://docs.google.com/spreadsheets/d/${config.id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(config.sheet)}`;

    const response = await fetchWithTimeout(url, {}, 10000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const rows = parseCSV(text);

    if (rows.length < 2) return [];

    // Find column index
    const headers = rows[0].map(h => h.replace(/^"|"$/g, '').trim());
    let colIndex = 0; // default to first column
    if (columnHeader) {
      const idx = headers.findIndex(h => h.toLowerCase() === columnHeader.toLowerCase());
      if (idx >= 0) colIndex = idx;
    }

    // Extract unique non-empty values from that column (skip header row)
    const options: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const val = (rows[i][colIndex] || '').replace(/^"|"$/g, '').trim();
      if (val && !options.includes(val)) {
        options.push(val);
      }
    }

    // Cache results
    optionsCache.set(cacheKey, { data: options, timestamp: Date.now() });
    return options;
  } catch (error) {
    console.error(`Error fetching options for ${sheetKey}:`, error);
    // Return stale cache if available
    const stale = optionsCache.get(cacheKey);
    if (stale) return stale.data;
    return [];
  }
}
