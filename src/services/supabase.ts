// Supabase-backed service replacing Google Sheets usage.
// Provides the same exported function names used across the app but reads/writes to Supabase tables.

import { createClient } from '@supabase/supabase-js';

const VITE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
const VITE_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.VITE_SUPABASE_KEY;

// KMB Supabase untuk data pengajar
const VITE_KMB_URL = (import.meta as any).env.VITE_SUPABASE_KMB_URL;
const VITE_KMB_KEY = (import.meta as any).env.VITE_SUPABASE_KMB_KEY;

if (!VITE_URL) {
  console.warn('VITE_SUPABASE_URL not set; Supabase calls will likely fail in runtime.');
}

if (!VITE_KMB_URL) {
  console.warn('VITE_SUPABASE_KMB_URL not set; KMB pengajar data will not be available.');
}

export const supabase = ((): any => {
  if (VITE_URL) return createClient(VITE_URL, VITE_KEY || '');

  // Provide a lightweight stub that returns predictable error results
  console.warn('VITE_SUPABASE_URL not set; creating stub supabase client to avoid crash.');
  const makeChain = () => {
    const chain: any = () => Promise.resolve({ data: null, error: new Error('Supabase not configured (VITE_SUPABASE_URL missing)') });
    chain.select = async () => ({ data: null, error: new Error('Supabase not configured (VITE_SUPABASE_URL missing)') });
    chain.insert = async () => ({ data: null, error: new Error('Supabase not configured (VITE_SUPABASE_URL missing)') });
    chain.update = async () => ({ data: null, error: new Error('Supabase not configured (VITE_SUPABASE_URL missing)') });
    chain.delete = async () => ({ data: null, error: new Error('Supabase not configured (VITE_SUPABASE_URL missing)') });
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.eq = () => chain;
    chain.not = () => chain;
    chain.single = async () => ({ data: null, error: new Error('Supabase not configured (VITE_SUPABASE_URL missing)') });
    return chain;
  };

  return {
    from: (_: string) => makeChain(),
  } as any;
})();

export const supabaseKmb = ((): any => {
  if (VITE_KMB_URL) return createClient(VITE_KMB_URL, VITE_KMB_KEY || '');

  const makeChain = () => {
    const chain: any = () => Promise.resolve({ data: null, error: new Error('KMB Supabase not configured (VITE_SUPABASE_KMB_URL missing)') });
    chain.select = async () => ({ data: null, error: new Error('KMB Supabase not configured') });
    chain.insert = async () => ({ data: null, error: new Error('KMB Supabase not configured') });
    chain.update = async () => ({ data: null, error: new Error('KMB Supabase not configured') });
    chain.delete = async () => ({ data: null, error: new Error('KMB Supabase not configured') });
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.eq = () => chain;
    chain.not = () => chain;
    chain.single = async () => ({ data: null, error: new Error('KMB Supabase not configured') });
    return chain;
  };

  return {
    from: (_: string) => makeChain(),
  } as any;
})();

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { data: Record<string, string>[]; timestamp: number }>();

export type SheetKey =
  | 'siswa'
  | 'kelompokKelas'
  | 'presensi'
  | 'perkembangan'
  | 'nilaiUtbk'
  | 'nilaiSnbtUtbk'
  | 'nilaiEvaluasi'
  | 'nilaiTesStandar'
  | 'pelayanan'
  | 'pengajar'
  | 'sekolah'
  | 'catatan_pembelajaran';

function tableForKey(key: SheetKey): string {
  switch (key) {
    case 'siswa':
      return 'data_siswa';
    case 'kelompokKelas':
      return 'kelompok_kelas';
    case 'presensi':
      return 'presensi_siswa';
    case 'perkembangan':
      return 'perkembangan_belajar';
    case 'nilaiEvaluasi':
      return 'nilai_evaluasi';
    case 'nilaiSnbtUtbk':
      return 'nilai_snbt_utbk';
    case 'nilaiTesStandar':
      return 'nilai_standar';
    case 'pelayanan':
      return 'tambahan_pelayanan';
    case 'pengajar':
      return 'pengajar';
    case 'sekolah':
      return 'sekolah';
    case 'catatan_pembelajaran':
      return 'catatan_pembelajaran';
    // Generic test/score table maps to nilai_umum
    case 'nilaiUtbk':
      return 'nilai_umum';
    default:
      return key;
  }
}

function getCached(key: string) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return e.data;
}

export function getCacheAge(key: string): number | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return Date.now() - entry.timestamp;
}

function setCache(key: string, data: Record<string, string>[]) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

const extractMissingColumn = (msg: string | null | undefined): string | null => {
  if (!msg) return null;
  // Patterns: "column \"kondisi\" does not exist" or "Could not find the 'kondisi' column"
  const m1 = msg.match(/column \"?([a-z0-9_]+)\"? does not exist/i);
  if (m1) return m1[1];
  const m2 = msg.match(/Could not find the '([a-z0-9_]+)' column/i);
  if (m2) return m2[1];
  const m3 = msg.match(/column "?([a-z0-9_]+)"? of/);
  if (m3) return m3[1];
  return null;
};

const safeInsert = async (table: string, payloads: Record<string, any>[]) => {
  // try inserting; if DB complains about missing column, remove that column and retry
  let attempts = 0;
  let toInsert = payloads.map((p) => ({ ...p }));
  while (attempts < 5) {
    attempts += 1;
    const { error, data } = await supabase.from(table).insert(toInsert, { returning: 'representation' });
    if (!error) return { data, error: null };
    const col = extractMissingColumn(String(error.message || error));
    if (!col) return { data: null, error };
    // remove offending column from all payloads and retry
    toInsert.forEach((p) => delete p[col]);
  }
  return { data: null, error: new Error('Failed to insert after removing missing columns') };
};

const safeUpdate = async (table: string, mapped: Record<string, any>, applyUpdate: (mapped: Record<string, any>) => Promise<any>) => {
  let attempts = 0;
  let payload = { ...mapped };
  while (attempts < 5) {
    attempts += 1;
    const res = await applyUpdate(payload);
    if (!res || !res.error) return { success: true, result: res };
    const col = extractMissingColumn(String(res.error?.message || res.error));
    if (!col) return { success: false, result: res };
    delete payload[col];
  }
  return { success: false, result: { error: new Error('Failed to update after removing missing columns') } };
};

export function isAppsScriptConfigured(): boolean {
  return Boolean(VITE_URL && VITE_KEY);
}

export function getSpreadsheetUrl(_: SheetKey): string {
  return '';
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Try selecting by numeric id first, fallback to uid if id column doesn't exist
    let res: any = await supabase.from('data_siswa').select('id').limit(1);
    if (res.error) {
      res = await supabase.from('data_siswa').select('uid').limit(1);
      if (res.error) throw res.error;
    }
    return { success: true, message: 'Koneksi Supabase berhasil' };
  } catch (err: any) {
    return { success: false, message: String(err.message || err) };
  }
}

export async function fetchAllData(key: SheetKey, forceRefresh = false): Promise<Record<string, string>[]> {
  const table = tableForKey(key);
  if (!forceRefresh) {
    const cached = getCached(table);
    if (cached) return cached;
  }

  try {
    // Prefer ordering by numeric `id` if present; otherwise fall back to `uid`.
    let data: any = null;
    let error: any = null;
    let res: any = await supabase.from(table).select('*').order('id', { ascending: true });
    if (res.error) {
      // try ordering by uid (tables without numeric id)
      res = await supabase.from(table).select('*').order('uid', { ascending: true });
    }
    data = res.data;
    error = res.error;
    if (error) throw error;
    const normalized = (data || []).map((row: any) => {
      const out: Record<string, string> = {};
      Object.entries(row).forEach(([k, v]) => {
        const val = v === null || v === undefined ? '' : String(v);
        out[k] = val;
        // also add a human-friendly Title Case key for compatibility with legacy UI headers
        const pretty = k
          .replace(/[_\-]+/g, ' ')
          .replace(/\b([a-z])/g, (m) => m.toUpperCase());
        if (!(pretty in out)) out[pretty] = val;
      });
      out['_id'] = `sup_${row.uid || row.id}`;
      out['_rowIndex'] = String(row.id ?? row.uid ?? '');
      return out;
    });
    setCache(table, normalized);
    return normalized;
  } catch (err) {
    const stale = getCached(table);
    if (stale) return stale;
    try {
      console.error('fetchAllData error', { table, message: (err as any)?.message || err, stack: (err as any)?.stack });
    } catch {
      console.error('fetchAllData error', table, err);
    }
    return [];
  }
}

function cleanPayload(payload: Record<string, string>) {
  const next: Record<string, any> = { ...payload };
  delete next._id;
  delete next._rowIndex;
  return next;
}

function coerceCommaNumericValues(payload: Record<string, any>) {
  Object.entries(payload).forEach(([k, v]) => {
    if (typeof v !== 'string') return;
    if (!v.includes(',')) return; // likely not a comma-decimal number
    // remove common thousand separators (dot) then replace comma with dot
    const cleaned = String(v).replace(/\./g, '').replace(/,/g, '.');
    const num = Number(cleaned);
    if (!Number.isNaN(num)) payload[k] = num;
  });
}

function toSnakeCaseKey(key: string) {
  return key
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
}

function mapKeysForTable(table: string, payload: Record<string, any>) {
  const out: Record<string, any> = {};
  Object.entries(payload || {}).forEach(([k, v]) => {
    const lk = (k || '').toLowerCase();
    let target = '';

    if (/\bnis\b/.test(lk)) target = 'nis';
    else if (/timestamp/.test(lk)) target = 'created_at';
    else if (/nama\s*sekolah/.test(lk)) target = 'nama_sekolah';
    else if (/\basal\b/.test(lk) || /asal\s*sekolah/.test(lk)) target = 'asal_sekolah';
    else if (/tanggal\s*lahir/.test(lk) || (/lahir/.test(lk) && !/tanggal/.test(lk))) target = 'tanggal_lahir';
    else if (/tanggal/.test(lk)) target = 'tanggal';
    else if (/jenis/.test(lk) && /tes/.test(lk)) target = 'jenis_tes';
    else if (/mata/.test(lk) && /pelajaran/.test(lk)) target = 'mata_pelajaran';
    else if (/materi/.test(lk)) target = 'materi_sub_bab';
    else if (/prosen/.test(lk) && /penguasaan/.test(lk)) target = 'prosen_penguasaan';
    else if (/prosen/.test(lk) && /penjelasan/.test(lk)) target = 'prosen_penjelasan';
    else if (/prosen/.test(lk) && /kondisi/.test(lk)) target = 'prosen_kondisi';
    else if (/penguasaan/.test(lk)) target = 'penguasaan';
    else if (/penjelasan/.test(lk)) target = 'penjelasan';
    else if (/kehadiran/.test(lk)) target = 'kehadiran';
    else if (/catatan/.test(lk)) target = table === 'catatan_pembelajaran' ? 'catatan' : 'catatan_pengajar';
    else if (/sub/.test(lk) && /bab/.test(lk)) target = 'sub_bab';
    else if (/kelompok/.test(lk) && /kelas/.test(lk)) target = 'kelompok_kelas';
    else if (/whatsapp/.test(lk) && /ortu|orang/.test(lk)) target = 'no_whatsapp_orang_tua';
    else if (/whatsapp/.test(lk) || /tlp|telepon|telp|no\.wa|no_whatsapp/.test(lk)) target = 'no_whatsapp_siswa';
    else if (/email/.test(lk)) target = 'email';
    else if (/cabang/.test(lk)) target = 'cabang';
    else if (/nama/.test(lk) && /pengajar/.test(lk)) target = table === 'tambahan_pelayanan' || table === 'catatan_pembelajaran' ? 'pengajar' : 'nama_pengajar';
    else if (/pengajar/.test(lk)) target = table === 'tambahan_pelayanan' || table === 'catatan_pembelajaran' ? 'pengajar' : 'nama_pengajar';
    else if (/jenjang/.test(lk) && /studi/.test(lk)) target = 'jenjang_studi';
    else if (/jenjang/.test(lk)) target = 'jenjang';
    else if (/\bstudi\b/.test(lk)) target = 'studi';
    else if (/nama/.test(lk)) target = 'nama';
    else if (/nilai/.test(lk)) target = 'nilai';
    else if (/rerata/.test(lk)) target = 'rerata';
    else if (/total/.test(lk)) target = 'total';

    if (!target) {
      // fallback: generate snake_case key
      target = toSnakeCaseKey(k);
    }

    out[target] = v;
  });
  return out;
}

export async function createRecord(key: SheetKey, data: Record<string, string>): Promise<{ success: boolean; message: string; data?: Record<string, string> }> {
  const table = tableForKey(key);
  try {
    const payload = cleanPayload(data);
    coerceCommaNumericValues(payload);
    const mapped = mapKeysForTable(table, payload);
    const r = await safeInsert(table, [mapped]);
    if (r.error) throw r.error;
    const inserted = r.data && r.data[0] ? r.data[0] : null;
    // Even if the client didn't return the inserted row representation, consider the insert successful
    invalidateCache(table);
    // Notify the app in the browser that records for this key changed so other components can refresh
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        console.debug('supabase.createRecord: dispatching recordsChanged', { key, table });
        window.dispatchEvent(new CustomEvent('supabase:recordsChanged', { detail: { key } }));
      }
    } catch (err) {
      console.error('supabase.createRecord: dispatch error', err);
    }
    if (!inserted) {
      return { success: true, message: 'Inserted' };
    }
    const out: Record<string, string> = {};
    Object.entries(inserted).forEach(([k, v]) => (out[k] = v === null || v === undefined ? '' : String(v)));
    out['_id'] = `sup_${inserted.uid || inserted.id}`;
    out['_rowIndex'] = String(inserted.id ?? inserted.uid ?? '');
    return { success: true, message: 'Inserted', data: out };
  } catch (err: any) {
    return { success: false, message: String(err.message || err) };
  }
}

export async function createBulkRecords(key: SheetKey, dataArray: Record<string, string>[]): Promise<{ success: boolean; message: string; totalAdded?: number }> {
  const table = tableForKey(key);
  try {
    const payload = dataArray.map((d) => {
      const p = cleanPayload(d);
      coerceCommaNumericValues(p);
      return mapKeysForTable(table, p);
    });
    const r = await safeInsert(table, payload);
    if (r.error) throw r.error;
    invalidateCache(table);
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        console.debug('supabase.createBulkRecords: dispatching recordsChanged', { key, table });
        window.dispatchEvent(new CustomEvent('supabase:recordsChanged', { detail: { key } }));
      }
    } catch (err) {
      console.error('supabase.createBulkRecords: dispatch error', err);
    }
    return { success: true, message: 'Bulk insert queued', totalAdded: payload.length };
  } catch (err: any) {
    return { success: false, message: String(err.message || err) };
  }
}

export async function updateRecord(key: SheetKey, rowIdentifier: string | number, data: Record<string, string>): Promise<{ success: boolean; message: string }> {
  const table = tableForKey(key);
  try {
    const payload = cleanPayload(data);
    coerceCommaNumericValues(payload);
    const mapped = mapKeysForTable(table, payload);
    const idStr = String(rowIdentifier || '').trim();
    const isNumeric = /^\d+$/.test(idStr);
    const baseQuery = supabase.from(table).update(mapped);
    // Try numeric id first, then try id as string (for UUID primary keys), then fallback to uid column
    if (isNumeric) {
      const apply = (m: Record<string, any>) => supabase.from(table).update(m).eq('id', Number(idStr));
      const handled = await safeUpdate(table, mapped, apply);
      if (!handled.success) throw handled.result.error || handled.result;
    } else {
        // try id = uuid
        let res: any = await baseQuery.eq('id', idStr);
        if (res.error) {
          // check whether table has a 'uid' column before attempting to update by uid
          const check = await supabase.from(table).select('uid').limit(1);
          if (check.error) {
            // table likely doesn't have uid column — rethrow original error
            throw res.error;
          }
          // safe to try updating by uid (use safeUpdate to remove missing columns)
          const applyUid = (m: Record<string, any>) => supabase.from(table).update(m).eq('uid', idStr);
          const handledUid = await safeUpdate(table, mapped, applyUid);
          if (!handledUid.success) throw handledUid.result.error || handledUid.result;
        }
    }
    invalidateCache(table);
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        console.debug('supabase.updateRecord: dispatching recordsChanged', { key, table });
        window.dispatchEvent(new CustomEvent('supabase:recordsChanged', { detail: { key } }));
      }
    } catch (err) {
      console.error('supabase.updateRecord: dispatch error', err);
    }
    return { success: true, message: 'Updated' };
  } catch (err: any) {
    return { success: false, message: String(err.message || err) };
  }
}

export async function deleteRecord(key: SheetKey, rowIdentifier: string | number): Promise<{ success: boolean; message: string }> {
  const table = tableForKey(key);
  try {
    const idStr = String(rowIdentifier || '').trim();
    const isNumeric = /^\d+$/.test(idStr);
    const baseQuery = supabase.from(table).delete();
    if (isNumeric) {
      const { error } = await baseQuery.eq('id', Number(idStr));
      if (error) throw error;
    } else {
      // try id = uuid
      let res: any = await baseQuery.eq('id', idStr);
      if (res.error) {
        // check whether table has a 'uid' column before attempting to delete by uid
        const check = await supabase.from(table).select('uid').limit(1);
        if (check.error) {
          throw res.error;
        }
        const res2 = await supabase.from(table).delete().eq('uid', idStr);
        if (res2.error) throw res2.error;
      }
    }
    invalidateCache(table);
    try {
      if (typeof window !== 'undefined' && window?.dispatchEvent) {
        console.debug('supabase.deleteRecord: dispatching recordsChanged', { key, table });
        window.dispatchEvent(new CustomEvent('supabase:recordsChanged', { detail: { key } }));
      }
    } catch (err) {
      console.error('supabase.deleteRecord: dispatch error', err);
    }
    return { success: true, message: 'Deleted' };
  } catch (err: any) {
    return { success: false, message: String(err.message || err) };
  }
}

export async function fetchSheetOptions(sheetKey: SheetKey, columnHeader?: string): Promise<string[]> {
  const table = tableForKey(sheetKey);
  const column = columnHeader ? String(columnHeader) : 'nama';
  try {
    const { data, error } = await supabase.from(table).select(column).not(column, 'is', null);
    if (error) throw error;
    const opts = Array.from(new Set((data || []).map((r: any) => String(r[column] || '').trim()).filter(Boolean))).sort();
    return opts as string[];
  } catch (err) {
    console.error('fetchSheetOptions', err);
    return [];
  }
}

export async function fetchKelompokKelasOptionsByCabang(cabang?: string, jenjangStudi?: string): Promise<string[]> {
  try {
    let query = supabase.from('kelompok_kelas').select('kelompok_kelas, cabang, jenjang_studi');
    if (cabang) query = query.eq('cabang', cabang);
    if (jenjangStudi) query = query.eq('jenjang_studi', jenjangStudi);
    const { data, error } = await query;
    if (error) throw error;
    const normalizedCabang = (cabang || '').trim().toLowerCase();
    const set = new Set<string>();
    (data || []).forEach((r: any) => {
      const rowCabang = String(r.cabang || '').trim().toLowerCase();
      if (normalizedCabang && rowCabang && rowCabang !== normalizedCabang) return;
      if (normalizedCabang && !rowCabang) return;
      if (r.kelompok_kelas) {
        const raw = String(r.kelompok_kelas || '');
        // split comma-separated values and add individually
        raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((item) => set.add(item));
      }
    });
    return Array.from(set).sort() as string[];
  } catch (err) {
    console.error('fetchKelompokKelasOptionsByCabang', err);
    return [];
  }
}

export async function fetchSekolahOptions(jenjangStudi?: string): Promise<string[]> {
  try {
    // Fetch rows and filter client-side to support schools that have multiple jenjang stored
    const { data, error } = await supabase.from('sekolah').select('nama_sekolah, jenjang_studi');
    if (error) throw error;
    const set = new Set<string>();
    const requested = (jenjangStudi || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    (data || []).forEach((r: any) => {
      const name = String(r.nama_sekolah || '').trim();
      if (!name) return;
      if (requested.length === 0) {
        set.add(name);
        return;
      }
      const rowJenjang = String(r.jenjang_studi || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const matches = requested.some((req) => rowJenjang.includes(req));
      if (matches) set.add(name);
    });
    return Array.from(set).sort() as string[];
  } catch (err) {
    console.error('fetchSekolahOptions', err);
    return [];
  }
}

export const JENJANG_STUDI_OPTIONS = [
  '3 SMA',
  '2 SMA',
  '1 SMA',
  '3 SMP',
  '2 SMP',
  '1 SMP',
  '6 SD',
  '5 SD',
  '4 SD',
  'D3',
  'S1',
  'UMUM',
];

export async function fetchJenjangSekolahOptions(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('sekolah').select('jenjang_studi');
    if (error) throw error;
    const set = new Set<string>();
    (data || []).forEach((r: any) => {
      const raw = String(r.jenjang_studi || '').trim();
      if (!raw) return;
      raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((p) => set.add(p));
    });
    if (set.size === 0) return JENJANG_STUDI_OPTIONS;
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  } catch (err) {
    console.error('fetchJenjangSekolahOptions error, falling back to constants', err);
    return JENJANG_STUDI_OPTIONS;
  }
}

export async function fetchJenjangsForSchool(namaSekolah?: string): Promise<string[]> {
  try {
    if (!namaSekolah) return fetchJenjangSekolahOptions();
    const nameClean = String(namaSekolah).trim();
    // Try exact match first
    let res: any = await supabase.from('sekolah').select('jenjang_studi').eq('nama_sekolah', nameClean);
    if (!res || !res.data || res.data.length === 0) {
      // Try case-insensitive partial match
      res = await supabase.from('sekolah').select('jenjang_studi').ilike('nama_sekolah', `%${nameClean}%`);
    }
    if (!res || res.error) {
      console.error('fetchJenjangsForSchool query error', res?.error || res);
      return [];
    }
    const jenjangs = new Set<string>();
    (res.data || []).forEach((r: any) => {
      const parts = String(r.jenjang_studi || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      parts.forEach((p: string) => jenjangs.add(p));
    });
    // If no jenjangs found for that school, return empty (do not fallback to global list)
    if (jenjangs.size === 0) return [];
    return Array.from(jenjangs).sort();
  } catch (err) {
    console.error('fetchJenjangsForSchool', err);
    return [];
  }
}

// --- KMB Pengajar Data (separate Supabase instance)
export async function fetchPengajarFromKmb(): Promise<Record<string, string>[]> {
  try {
    // Prefer KMB Supabase instance if configured
    if ((import.meta as any).env.VITE_SUPABASE_KMB_URL) {
      const { data, error } = await supabaseKmb.from('pengajar').select('*').order('id', { ascending: true });
      if (error) throw error;
      const normalized = (data || []).map((row: any) => {
        const mapped = mapKeysForTable('pengajar', row);
        const out: Record<string, string> = {};
        Object.entries(mapped).forEach(([k, v]) => {
          out[k] = v === null || v === undefined ? '' : String(v);
        });
        out['_id'] = `kmb_${row.id}`;
        out['_rowIndex'] = String(row.id || '0');
        return out;
      });
      return normalized;
    }

    // Fallback: try main Supabase if KMB URL not configured
    console.warn('VITE_SUPABASE_KMB_URL not set; falling back to main Supabase for pengajar data.');
    const { data, error } = await supabase.from('pengajar').select('*').order('id', { ascending: true });
    if (error) throw error;
    const normalized = (data || []).map((row: any) => {
      const mapped = mapKeysForTable('pengajar', row);
      const out: Record<string, string> = {};
      Object.entries(mapped).forEach(([k, v]) => {
        const val = v === null || v === undefined ? '' : String(v);
        out[k] = val;
        const pretty = k
          .replace(/[_\-]+/g, ' ')
          .replace(/\b([a-z])/g, (m) => m.toUpperCase());
        if (!(pretty in out)) out[pretty] = val;
      });
      out['_id'] = `sup_${row.id}`;
      out['_rowIndex'] = String(row.id || '0');
      return out;
    });
    return normalized;
  } catch (err) {
    console.error('fetchPengajarFromKmb error', err);
    return [];
  }
}

// --- Apps Script / Web App URL helpers (kept for compatibility with original app)
export function getDefaultAppsScriptUrl(): string {
  return (import.meta as any).env.VITE_APPS_SCRIPT_URL || '';
}

export function getAppsScriptUrl(): string {
  try {
    const v = localStorage.getItem('appsScriptUrl');
    return v || getDefaultAppsScriptUrl();
  } catch {
    return getDefaultAppsScriptUrl();
  }
}

export function setAppsScriptUrl(url: string) {
  try {
    localStorage.setItem('appsScriptUrl', String(url || ''));
  } catch {
    // ignore
  }
}

export function resetAppsScriptUrl() {
  try {
    localStorage.removeItem('appsScriptUrl');
  } catch {
    // ignore
  }
}

