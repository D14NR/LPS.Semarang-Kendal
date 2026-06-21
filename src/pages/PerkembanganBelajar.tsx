import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  BookOpen,
  RefreshCw,
  Save,
  Plus,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  UploadCloud,
  FileDown,
  Search,
  TrendingUp,
  MapPin,
  ClipboardCheck,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import {
  fetchAllData,
  createBulkRecords,
  updateRecord,
  deleteRecord,
  isAppsScriptConfigured,
} from '../services/supabase';
import { fetchPengajarFromKmb } from '../services/supabase';
import { parseSpreadsheetFile, generateTemplateWorkbook, exportRecordsWorkbook } from '../utils/importUtils';
import { useAuth } from '../contexts/AuthContext';
import { parseIndoDateString, formatDateDmy } from '../utils/dateUtils';

const importFields = [
  { key: 'Nis', label: 'NIS' },
  { key: 'Nama', label: 'Nama' },
  { key: 'Tanggal', label: 'Tanggal' },
  { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
  { key: 'Materi', label: 'Materi' },
  { key: 'Kehadiran', label: 'Kehadiran' },
  { key: 'Prosen Penguasaan', label: 'Prosen Penguasaan' },
  { key: 'Prosen Penjelasan', label: 'Prosen Penjelasan' },
  { key: 'Prosen Kondisi', label: 'Prosen Kondisi' },
  { key: 'Penguasaan', label: 'Penguasaan' },
  { key: 'Penjelasan', label: 'Penjelasan' },
  { key: 'Kondisi', label: 'Kondisi' },
  { key: 'Catatan', label: 'Catatan' },
  { key: 'Cabang', label: 'Cabang' },
];

const getTemplateFields = (isAdmin: boolean) =>
  (isAdmin ? importFields : importFields.filter((field) => field.key !== 'Cabang'));

const penguasaanOptions = [
  'Sangat Menguasai Materi',
  'Cukup Menguasai Materi',
  'Kurang Menguasai Materi',
  'Sangat Kurang Menguasai Materi',
];

const penjelasanOptions = [
  'Sangat Fokus',
  'Cukup Fokus',
  'Kurang Fokus',
  'Sangat Kurang Fokus',
];

const kondisiOptions = [
  'Sangat Aktif',
  'Cukup Aktif',
  'Kurang Aktif',
  'Sangat Kurang Aktif',
];

const penguasaanToPercent: Record<string, number> = {
  'Sangat Menguasai Materi': 90,
  'Cukup Menguasai Materi': 65,
  'Kurang Menguasai Materi': 25,
  'Sangat Kurang Menguasai Materi': 10,
};

const penjelasanToPercent: Record<string, number> = {
  'Sangat Fokus': 90,
  'Cukup Fokus': 65,
  'Kurang Fokus': 25,
  'Sangat Kurang Fokus': 10,
};

const kondisiToPercent: Record<string, number> = {
  'Sangat Aktif': 90,
  'Cukup Aktif': 65,
  'Kurang Aktif': 25,
  'Sangat Kurang Aktif': 10,
};

const mapSelectionToPercent = (selection: any, mapping: Record<string, number>) => {
  if (selection == null) return null;
  const s = String(selection).trim();
  if (!s) return null;
  // if selection is already a numeric string, prefer numeric
  const n = Number(s);
  if (Number.isFinite(n)) return n;
  // try parse numeric inside strings like "90%"
  const parsed = parseNumericPercent(s);
  if (parsed != null) return parsed;
  return mapping[s] ?? null;
};

const percentToSelection = (percent: any, mapping: Record<string, number>) => {
  if (percent == null || String(percent).trim() === '') return '';
  const n = Number(percent);
  let numeric = Number.isFinite(n) ? n : null;
  if (numeric == null) numeric = parseNumericPercent(String(percent));
  if (numeric == null) return '';
  // exact match
  for (const [label, val] of Object.entries(mapping)) {
    if (Number(val) === Number(numeric)) return label;
  }
  // nearest match fallback
  let bestLabel = '';
  let bestDiff = Infinity;
  for (const [label, val] of Object.entries(mapping)) {
    const diff = Math.abs(Number(val) - Number(numeric));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestLabel = label;
    }
  }
  // only accept nearest if reasonably close (<=30)
  return bestDiff <= 30 ? bestLabel : '';
};

const parseNumericPercent = (s: string): number | null => {
  if (!s) return null;
  const m = String(s).trim().match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
};

const formatDateDisplay = (value: string): string => {
  if (!value) return '-';
  const parsed = parseIndoDateString(value);
  return parsed ? formatDateDmy(parsed) : value;
};

const parseDateValue = (value: string): Date | null => {
  if (!value) return null;
  return parseIndoDateString(value);
};

const normalizePerkembanganRecord = (row: Record<string, string>) => ({
  ...row,
  Nis: row['Nis'] || row['nis'] || '',
  Nama: row['Nama'] || row['nama'] || '',
  Tanggal: row['Tanggal'] || row['tanggal'] || '',
  'Mata Pelajaran':
    row['Mata Pelajaran'] || row['mata_pelajaran'] || row['mata pelajaran'] || '',
  Materi: row['Materi'] || row['materi_sub_bab'] || row['materi'] || '',
  Kehadiran: row['Kehadiran'] || row['kehadiran'] || '',
  Penguasaan: row['Penguasaan'] || row['prosen_penguasaan'] || row['penguasaan'] || '',
  'Prosen Penguasaan': row['Prosen Penguasaan'] || row['prosen_penguasaan'] || '',
  'Prosen Penjelasan': row['Prosen Penjelasan'] || row['prosen_penjelasan'] || '',
  'Prosen Kondisi': row['Prosen Kondisi'] || row['prosen_kondisi'] || '',
  Penjelasan: row['Penjelasan'] || row['prosen_penjelasan'] || row['penjelasan'] || '',
  Kondisi: row['Kondisi'] || row['prosen_kondisi'] || row['kondisi'] || '',
  Catatan: row['Catatan'] || row['catatan_pengajar'] || row['catatan'] || '',
  Cabang: row['Cabang'] || row['cabang'] || '',
});

export default function PerkembanganBelajar() {
  const { user } = useAuth();
  const [siswaData, setSiswaData] = useState<Record<string, string>[]>([]);
  const [perkembanganData, setPerkembanganData] = useState<Record<string, string>[]>([]);
  const [pengajarData, setPengajarData] = useState<Record<string, string>[]>([]);
  const [kelompokData, setKelompokData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const [inputOpen, setInputOpen] = useState(false);
  const [tanggal, setTanggal] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [materi, setMateri] = useState('');
  const [jenjangStudi, setJenjangStudi] = useState('');
  const [kelompokKelas, setKelompokKelas] = useState('');
  const [selectedCabang, setSelectedCabang] = useState('');
  const [rowInputs, setRowInputs] = useState<Record<string, { Kehadiran: string; 'Prosen Penguasaan': string; 'Prosen Penjelasan': string; 'Prosen Kondisi': string; Catatan: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [editingRecord, setEditingRecord] = useState<Record<string, string> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, string> | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importRecords, setImportRecords] = useState<Record<string, string>[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');

  const apiConfigured = isAppsScriptConfigured();

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    setLoading(true);
    try {
      const [siswa, perkembangan, pengajar, kelompok] = await Promise.all([
        fetchAllData('siswa', forceRefresh),
        fetchAllData('perkembangan', forceRefresh),
        // nama pengajar comes from KMB (external supabase). Use dedicated fetch so it matches NamaPengajar page
        fetchPengajarFromKmb(),
        fetchAllData('kelompokKelas', forceRefresh),
      ]);
      setSiswaData(siswa);
      setPerkembanganData(perkembangan.map(normalizePerkembanganRecord));
      setPengajarData(pengajar);
      setKelompokData(kelompok);
    } catch {
      showToast('error', 'Gagal memuat data');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handler = (ev: any) => {
      try {
        const changedKey = ev?.detail?.key;
        if (!changedKey) return;
        if (['siswa', 'kelompokKelas', 'pengajar', 'sekolah'].includes(changedKey)) {
          loadData(true);
        }
      } catch {}
    };
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('supabase:recordsChanged', handler as EventListener);
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('supabase:recordsChanged', handler as EventListener);
    };
  }, [loadData]);

  const getStudentCabang = (row: Record<string, string>) =>
    ((row['Cabang'] || row['cabang'] || row['CABANG'] || '') as string).trim();

  const getStudentJenjang = (row: Record<string, string>) =>
    ((row['Jenjang Studi'] || row['jenjang_studi'] || row['jenjang'] || '') as string).trim();

  const getStudentKelompok = (row: Record<string, string>) =>
    ((row['Kelompok Kelas'] || row['kelompok_kelas'] || row['Kelompok  Kelas'] || row['Kelompok'] || '') as string).trim();

  const getPengajarMataPelajaran = (row: Record<string, string>) =>
    (
      row['bidang_studi'] ||
      row['studi'] ||
      row['Studi'] ||
      row['Bidang Studi'] ||
      row['Bidang_Studi'] ||
      row['bidang studi'] ||
      row['mata_pelajaran'] ||
      row['mata pelajaran'] ||
      row['Mata Pelajaran'] ||
      row['Mata  Pelajaran'] ||
      row['Mata_Pelajaran'] ||
      row['mataPelajaran'] ||
      row['mapel'] ||
      row['Mapel'] ||
      ''
    ).trim();


  const splitMataPelajaranValues = (value: string) =>
    value
      .split(/\s*[;,]\s*/)
      .map((item) => item.trim())
      .filter(Boolean);

  const cabangOptions = useMemo(() => {
    const unique = new Set<string>();
    [...siswaData, ...kelompokData, ...pengajarData].forEach((row) => {
      const cabang = getStudentCabang(row);
      if (cabang) unique.add(cabang);
    });
    return Array.from(unique).sort();
  }, [siswaData, kelompokData, pengajarData]);

  // Mata Pelajaran options should come from Menu Nama Pengajar -> bidang_studi
  const mataPelajaranOptions = useMemo(() => {
    const unique = new Set<string>();
    pengajarData.forEach((row) => {
      const mapelValue = getPengajarMataPelajaran(row);
      splitMataPelajaranValues(mapelValue).forEach((mapel) => unique.add(mapel));
    });
    return Array.from(unique).sort();
  }, [pengajarData]);

  const effectiveCabang = user?.isAdmin ? selectedCabang : user?.cabang || '';

  const jenjangOptions = useMemo(() => {
    const unique = new Set<string>();
    siswaData.forEach((row) => {
      const rowCabang = getStudentCabang(row);
      if (effectiveCabang && rowCabang.toLowerCase() !== effectiveCabang.toLowerCase()) return;
      const jenjang = getStudentJenjang(row);
      if (jenjang) unique.add(jenjang);
    });
    return Array.from(unique).sort();
  }, [siswaData, effectiveCabang]);

  const kelompokOptions = useMemo(() => {
    const unique = new Set<string>();
    [...siswaData, ...kelompokData].forEach((row) => {
      const rowCabang = getStudentCabang(row);
      if (effectiveCabang && rowCabang && rowCabang.toLowerCase() !== effectiveCabang.toLowerCase()) return;
      const jenjang = getStudentJenjang(row);
      if (jenjangStudi && jenjang && jenjang.toLowerCase() !== jenjangStudi.toLowerCase()) return;
      const kelompokRaw = getStudentKelompok(row);
      if (kelompokRaw) {
        // split comma/semicolon-separated kelompok values
        kelompokRaw
          .split(/\s*[,;]\s*/)
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((k) => unique.add(k));
      }
    });
    return Array.from(unique).sort();
  }, [siswaData, kelompokData, effectiveCabang, jenjangStudi]);

  const canShowTable = Boolean(
    tanggal &&
      mataPelajaran &&
      jenjangStudi &&
      kelompokKelas &&
      (user?.isAdmin ? effectiveCabang : true)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [jenjangStudi, kelompokKelas, searchTerm, effectiveCabang]);

  useEffect(() => {
    if (!tanggal || !mataPelajaran || !jenjangStudi || !kelompokKelas) {
      setRowInputs({});
      return;
    }

    const normalizedDate = tanggal.trim();
    const normalizedMapel = mataPelajaran.trim().toLowerCase();
    const normalizedCabang = (effectiveCabang || '').trim().toLowerCase();

    const allowedNis = new Set<string>();
    siswaData.forEach((row) => {
      const rowJenjang = getStudentJenjang(row).toLowerCase();
      if (!jenjangStudi || rowJenjang !== jenjangStudi.trim().toLowerCase()) return;
      if (normalizedCabang) {
        const rowCabang = getStudentCabang(row).toLowerCase();
        if (rowCabang !== normalizedCabang) return;
      }
      // Only include students who belong to the selected kelompokKelas (supports multiple kelompok stored
      // as comma-separated values in the student's row)
      const kelompokRaw = getStudentKelompok(row);
      const kelompokParts = kelompokRaw ? kelompokRaw.split(/\s*[,;]\s*/).map((s) => s.trim()).filter(Boolean) : [];
      if (kelompokKelas && kelompokKelas.trim()) {
        const matched = kelompokParts.some((p) => p.toLowerCase() === kelompokKelas.trim().toLowerCase());
        if (!matched) return;
      }
      const nis = (row['Nis'] || row['nis'] || '').trim();
      if (nis) allowedNis.add(nis);
    });

    const nextInputs: Record<string, { Kehadiran: string; 'Prosen Penguasaan': string; 'Prosen Penjelasan': string; 'Prosen Kondisi': string; Catatan: string }> = {};
    let existingMateri = '';

    perkembanganData.forEach((row) => {
      const rowDate = (row['Tanggal'] || row['tanggal'] || '').trim();
      const rowMapel = ((row['Mata Pelajaran'] || row['mata_pelajaran'] || '') as string).trim().toLowerCase();
      const rowCabang = getStudentCabang(row).toLowerCase();

      if (rowDate !== normalizedDate) return;
      if (rowMapel !== normalizedMapel) return;
      if (normalizedCabang && rowCabang !== normalizedCabang) return;

      const nis = ((row['Nis'] || row['nis'] || '') as string).trim();
      if (!nis) return;
      if (allowedNis.size > 0 && !allowedNis.has(nis)) return;

      nextInputs[nis] = {
        Kehadiran: row['Kehadiran'] || row['kehadiran'] || '',
        'Prosen Penguasaan': row['Prosen Penguasaan'] || row['prosen_penguasaan'] || row['Penguasaan'] || '',
        'Prosen Penjelasan': row['Prosen Penjelasan'] || row['prosen_penjelasan'] || row['Penjelasan'] || '',
        'Prosen Kondisi': row['Prosen Kondisi'] || row['prosen_kondisi'] || row['Kondisi'] || '',
        Catatan: row['Catatan'] || row['catatan_pengajar'] || '',
      };

      if (!existingMateri && (row['Materi'] || row['materi_sub_bab'] || '').trim()) {
        existingMateri = row['Materi'] || row['materi_sub_bab'] || '';
      }
    });

    const inputsEqual = (
      a: Record<string, { Kehadiran: string; 'Prosen Penguasaan': string; 'Prosen Penjelasan': string; 'Prosen Kondisi': string; Catatan: string }>,
      b: Record<string, { Kehadiran: string; 'Prosen Penguasaan': string; 'Prosen Penjelasan': string; 'Prosen Kondisi': string; Catatan: string }>
    ) => {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      for (const k of aKeys) {
        const av = a[k];
        const bv = b[k];
        if (!av && !bv) continue;
        if (!av || !bv) return false;
        if (
          av.Kehadiran !== bv.Kehadiran ||
          av['Prosen Penguasaan'] !== bv['Prosen Penguasaan'] ||
          av['Prosen Penjelasan'] !== bv['Prosen Penjelasan'] ||
          av['Prosen Kondisi'] !== bv['Prosen Kondisi'] ||
          av.Catatan !== bv.Catatan
        )
          return false;
      }
      return true;
    };

    setRowInputs((prev) => {
      const merged = { ...prev, ...nextInputs };
      if (inputsEqual(prev, merged)) return prev;
      return merged;
    });
    if (!materi && existingMateri) {
      setMateri(existingMateri);
    }
  }, [tanggal, mataPelajaran, jenjangStudi, kelompokKelas, effectiveCabang, perkembanganData, materi, siswaData]);

  const filteredSiswa = useMemo(() => {
    if (!jenjangStudi) return [];
    const keyword = searchTerm.trim().toLowerCase();
    return siswaData.filter((row) => {
      const rowJenjang = getStudentJenjang(row).toLowerCase();
      if (rowJenjang !== jenjangStudi.trim().toLowerCase()) return false;
      if (effectiveCabang) {
        const rowCabang = getStudentCabang(row).toLowerCase();
        if (rowCabang !== effectiveCabang.toLowerCase()) return false;
      }
      if (!keyword) return true;
      const nis = (row['Nis'] || row['nis'] || '').toLowerCase();
      const nama = (row['Nama'] || row['nama'] || '').toLowerCase();
      return nis.includes(keyword) || nama.includes(keyword);
    });
  }, [siswaData, jenjangStudi, effectiveCabang, searchTerm]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredSiswa.length / perPage)), [filteredSiswa.length, perPage]);
  const paginatedSiswa = useMemo(
    () => filteredSiswa.slice((currentPage - 1) * perPage, currentPage * perPage),
    [filteredSiswa, currentPage, perPage]
  );

  const filledCount = useMemo(() => {
    return Object.values(rowInputs).filter((val) => {
      return val.Kehadiran || val['Prosen Penguasaan'] || val['Prosen Penjelasan'] || val['Prosen Kondisi'] || val.Catatan;
    }).length;
  }, [rowInputs]);

  const resetInputModal = () => {
    setTanggal('');
    setMataPelajaran('');
    setMateri('');
    setJenjangStudi('');
    setKelompokKelas('');
    setSelectedCabang('');
    setRowInputs({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleOpenInput = () => {
    if (!apiConfigured) {
      showToast('warning', 'Apps Script belum dikonfigurasi.');
      return;
    }
    resetInputModal();
    setInputOpen(true);
  };

  const handleRowChange = (
    nis: string,
    key: 'Kehadiran' | 'Prosen Penguasaan' | 'Prosen Penjelasan' | 'Prosen Kondisi' | 'Catatan',
    value: string
  ) => {
    setRowInputs((prev) => ({
      ...prev,
      [nis]: {
        Kehadiran: prev[nis]?.Kehadiran || '',
        'Prosen Penguasaan': prev[nis]?.['Prosen Penguasaan'] || '',
        'Prosen Penjelasan': prev[nis]?.['Prosen Penjelasan'] || '',
        'Prosen Kondisi': prev[nis]?.['Prosen Kondisi'] || '',
        Catatan: prev[nis]?.Catatan || '',
        [key]: value,
      },
    }));
  };

  const handleSubmitPerkembangan = async () => {
    if (!apiConfigured) {
      showToast('warning', 'Apps Script belum dikonfigurasi.');
      return;
    }
    if (!canShowTable) {
      showToast('warning', 'Lengkapi Tanggal, Mata Pelajaran, Jenjang Studi, Cabang, dan Kelompok Kelas.');
      return;
    }

    const records = filteredSiswa
      .map((row) => {
        const nis = (row['Nis'] || row['nis'] || '').trim();
        const input = rowInputs[nis] || { Kehadiran: '', 'Prosen Penguasaan': '', 'Prosen Penjelasan': '', 'Prosen Kondisi': '', Catatan: '' };
        if (!input.Kehadiran && !input['Prosen Penguasaan'] && !input['Prosen Penjelasan'] && !input['Prosen Kondisi'] && !input.Catatan) return null;

        const prosenPenguasaan = mapSelectionToPercent(input['Prosen Penguasaan'], penguasaanToPercent);
        const prosenPenjelasan = mapSelectionToPercent(input['Prosen Penjelasan'], penjelasanToPercent);
        const prosenKondisi = mapSelectionToPercent(input['Prosen Kondisi'], kondisiToPercent);

        return {
          Nis: nis,
          Nama: (row['Nama'] || row['nama'] || '') as string,
          Tanggal: tanggal,
          'Mata Pelajaran': mataPelajaran,
          Materi: materi,
          Kehadiran: input.Kehadiran,
          // store numeric prosen fields only; do not send plain label columns
          'Prosen Penguasaan': input.Kehadiran === 'Hadir' ? prosenPenguasaan : null,
          'Prosen Penjelasan': input.Kehadiran === 'Hadir' ? prosenPenjelasan : null,
          'Prosen Kondisi': input.Kehadiran === 'Hadir' ? prosenKondisi : null,
          Catatan: input.Catatan || null,
          Cabang: effectiveCabang || getStudentCabang(row) || '',
        };
      })
      .filter(Boolean) as Record<string, any>[];

    if (records.length === 0) {
      showToast('warning', 'Tidak ada siswa yang diisi.');
      return;
    }

    // presensi is now merged into perkembangan; no separate presensi payload

    const existingMap = new Map<string, Record<string, string>>();
    perkembanganData.forEach((row) => {
      const key = [
        (row['Nis'] || '').trim(),
        (row['Tanggal'] || '').trim(),
        (row['Mata Pelajaran'] || '').trim(),
        (row['Cabang'] || '').trim(),
      ].join('|');
      if (key) existingMap.set(key, row);
    });

    const toUpdate: { rowIndex: string; data: Record<string, string> }[] = [];
    const toCreate: Record<string, string>[] = [];

    records.forEach((record) => {
      const key = [
        (record['Nis'] || '').trim(),
        (record['Tanggal'] || '').trim(),
        (record['Mata Pelajaran'] || '').trim(),
        (record['Cabang'] || '').trim(),
      ].join('|');
      const existing = existingMap.get(key);
      if (existing && (existing['_rowIndex'] || existing['_id'])) {
        const identifier = (existing['_rowIndex'] || existing['_id']).toString();
        toUpdate.push({ rowIndex: identifier, data: record });
        return;
      }
      toCreate.push(record);
    });

    // presensi handling removed — presensi values stored within perkembangan

    setSubmitting(true);
    try {
      const updateResults = await Promise.all(
        toUpdate.map((item) => updateRecord('perkembangan', item.rowIndex, item.data))
      );
      const updatedCount = updateResults.filter((res) => res.success).length;
      let createdCount = 0;
      if (toCreate.length > 0) {
        const createResult = await createBulkRecords('perkembangan', toCreate);
        if (!createResult.success) {
          showToast('error', createResult.message);
          setSubmitting(false);
          return;
        }
        createdCount = createResult.totalAdded || toCreate.length;
      }

      showToast('success', `✅ Perkembangan tersimpan. Baru: ${createdCount}, Terupdate: ${updatedCount}.`);
      setInputOpen(false);
      resetInputModal();
      await loadData(true);
    } catch (error) {
      showToast('error', `Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setSubmitting(false);
  };

  const handleOpenImport = () => {
    if (!apiConfigured) {
      showToast('warning', 'Apps Script belum dikonfigurasi.');
      return;
    }
    setImportError('');
    setImportPreview([]);
    setImportRecords([]);
    setImportOpen(true);
  };

  const handleTemplateDownload = () => {
    const blob = generateTemplateWorkbook(getTemplateFields(!!user?.isAdmin), 'Template Perkembangan');
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'Template_Perkembangan_Belajar.xlsx';
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleImportFileChange = async (file: File | null) => {
    if (!file) return;
    setImportLoading(true);
    setImportError('');
    const result = await parseSpreadsheetFile(file, importFields);
    if (result.error) {
      setImportError(result.error);
      setImportPreview([]);
      setImportRecords([]);
    } else {
      setImportPreview(result.preview);
      setImportRecords(result.records);
    }
    setImportLoading(false);
  };

  const handleImportSubmit = async () => {
    if (!apiConfigured) {
      showToast('warning', 'Apps Script belum dikonfigurasi.');
      return;
    }
    if (importRecords.length === 0) {
      setImportError('Tidak ada data untuk diimport.');
      return;
    }
    setImportLoading(true);

    const recordsToImport = user && !user.isAdmin
      ? importRecords.map((record) => ({
          ...record,
          Cabang: user.cabang || record.Cabang || '',
        }))
      : importRecords;

    const normalizeKey = (record: Record<string, string>) =>
      [
        record['Nis'],
        record['Tanggal'],
        record['Mata Pelajaran'],
        record['Cabang'],
      ]
        .map((value) => String(value || '').trim().toLowerCase())
        .join('|');

    const dedupedMap = new Map<string, Record<string, string>>();
    recordsToImport.forEach((record) => {
      const key = normalizeKey(record);
      if (key) dedupedMap.set(key, record);
    });
    const dedupedRecords = Array.from(dedupedMap.values());

    const existingMap = new Map<string, Record<string, string>>();
    perkembanganData.forEach((row) => {
      const key = normalizeKey(row);
      if (key) existingMap.set(key, row);
    });

    const toCreate: Record<string, string>[] = [];
    let skipped = 0;

    dedupedRecords.forEach((record) => {
      const key = normalizeKey(record);
      if (key && existingMap.has(key)) {
        skipped += 1;
        return;
      }
      toCreate.push(record);
    });

    if (toCreate.length === 0) {
      setImportLoading(false);
      showToast('warning', `Tidak ada data baru. ${skipped} data sudah ada dan dilewati.`);
      return;
    }

    const result = await createBulkRecords('perkembangan', toCreate);
    if (result.success) {
      showToast('success', `✅ ${result.totalAdded || toCreate.length} data ditambahkan, ${skipped} dilewati.`);
      setImportOpen(false);
      setImportRecords([]);
      setImportPreview([]);
      await loadData(true);
    } else {
      setImportError(result.message);
    }
    setImportLoading(false);
  };

  const handleExportCSV = () => {
    if (sortedPerkembangan.length === 0) return;
    const blob = exportRecordsWorkbook(importFields, sortedPerkembangan, 'Perkembangan Belajar');
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Perkembangan_Belajar_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const openEditModal = (row: Record<string, string>) => {
    // debug: log stored fields to help map values when opening edit modal
    // eslint-disable-next-line no-console
    console.debug('openEditModal row values', {
      Penguasaan: row['Penguasaan'],
      ProsenPenguasaan: row['Prosen Penguasaan'] || row['prosen_penguasaan'],
      Penjelasan: row['Penjelasan'],
      ProsenPenjelasan: row['Prosen Penjelasan'] || row['prosen_penjelasan'],
      Kondisi: row['Kondisi'],
      ProsenKondisi: row['Prosen Kondisi'] || row['prosen_kondisi'],
    });
    setEditingRecord(row);
    // normalize possible numeric values stored in label columns
    const rawPeng = (row['Penguasaan'] || row['penguasaan'] || '').toString();
    const rawPen = (row['Penjelasan'] || row['penjelasan'] || '').toString();
    const rawKond = (row['Kondisi'] || row['kondisi'] || '').toString();
    const fallbackPeng = percentToSelection(row['Prosen Penguasaan'] || row['prosen_penguasaan'] || '', penguasaanToPercent) || '';
    const fallbackPen = percentToSelection(row['Prosen Penjelasan'] || row['prosen_penjelasan'] || '', penjelasanToPercent) || '';
    const fallbackKond = percentToSelection(row['Prosen Kondisi'] || row['prosen_kondisi'] || '', kondisiToPercent) || '';
    const penguasaanVal = parseNumericPercent(rawPeng) != null ? percentToSelection(rawPeng, penguasaanToPercent) : (rawPeng || fallbackPeng);
    const penjelasanVal = parseNumericPercent(rawPen) != null ? percentToSelection(rawPen, penjelasanToPercent) : (rawPen || fallbackPen);
    const kondisiVal = parseNumericPercent(rawKond) != null ? percentToSelection(rawKond, kondisiToPercent) : (rawKond || fallbackKond);

    setFormData({
      Nis: (row['Nis'] || row['nis'] || '') as string,
      Nama: (row['Nama'] || row['nama'] || '') as string,
      Tanggal: (() => {
        const parsed = parseDateValue(row['Tanggal'] || row['tanggal'] || '');
        return parsed ? parsed.toISOString().slice(0, 10) : '';
      })(),
      'Mata Pelajaran': (row['Mata Pelajaran'] || row['mata_pelajaran'] || '') as string,
      Materi: (row['Materi'] || row['materi_sub_bab'] || '') as string,
      'Prosen Penguasaan': String(mapSelectionToPercent(penguasaanVal || row['Prosen Penguasaan'] || row['prosen_penguasaan'] || '', penguasaanToPercent) ?? ''),
      'Prosen Penjelasan': String(mapSelectionToPercent(penjelasanVal || row['Prosen Penjelasan'] || row['prosen_penjelasan'] || '', penjelasanToPercent) ?? ''),
      'Prosen Kondisi': String(mapSelectionToPercent(kondisiVal || row['Prosen Kondisi'] || row['prosen_kondisi'] || '', kondisiToPercent) ?? ''),
      Catatan: (row['Catatan'] || row['catatan_pengajar'] || '') as string,
      Kehadiran: (row['Kehadiran'] || row['kehadiran'] || '') as string,
      Cabang: row['Cabang'] || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const identifier = (editingRecord['_rowIndex'] || editingRecord['_id'] || '').toString();
    if (!identifier) {
      showToast('error', 'Identifier baris tidak valid');
      return;
    }
    setSubmitting(true);
    const payload: Record<string, any> = { ...formData };
    // Ensure Prosen fields are numeric or null; do not send separate label columns
    const toNumberOrNull = (v: any) => {
      const s = String(v ?? '').trim();
      if (!s) return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };
    if (formData['Kehadiran'] === 'Hadir') {
      payload['Prosen Penguasaan'] = toNumberOrNull(formData['Prosen Penguasaan']);
      payload['Prosen Penjelasan'] = toNumberOrNull(formData['Prosen Penjelasan']);
      payload['Prosen Kondisi'] = toNumberOrNull(formData['Prosen Kondisi']);
    } else {
      payload['Prosen Penguasaan'] = null;
      payload['Prosen Penjelasan'] = null;
      payload['Prosen Kondisi'] = null;
    }
    // remove any plain label keys to avoid sending non-existent columns
    delete payload['Penguasaan'];
    delete payload['Penjelasan'];
    delete payload['Kondisi'];

    const result = await updateRecord('perkembangan', identifier, payload);
    if (result.success) {
      showToast('success', '✅ Data perkembangan diperbarui');
      setEditingRecord(null);
      await loadData(true);
    } else {
      showToast('error', result.message);
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const identifier = (deleteConfirm['_rowIndex'] || deleteConfirm['_id'] || '').toString();
    if (!identifier) {
      showToast('error', 'Identifier baris tidak valid');
      return;
    }
    setSubmitting(true);
    const result = await deleteRecord('perkembangan', identifier);
    if (result.success) {
      showToast('success', '✅ Data perkembangan dihapus');
      setDeleteConfirm(null);
      await loadData(true);
    } else {
      showToast('error', result.message);
    }
    setSubmitting(false);
  };

  const sortedPerkembangan = useMemo(() => {
    let rows = [...perkembanganData];
    if (user && !user.isAdmin) {
      rows = rows.filter((row) => (row['Cabang'] || '').trim().toLowerCase() === (user.cabang || '').trim().toLowerCase());
    }
    rows.sort((a, b) => {
      const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
      const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
      return db - da;
    });
    return rows;
  }, [perkembanganData, user]);

  const columns = [
    { key: 'Nis', label: 'Nis' },
    { key: 'Nama', label: 'Nama' },
    {
      key: 'Tanggal',
      label: 'Tanggal',
      render: (value: string) => formatDateDisplay(value),
    },
    { key: 'Mata Pelajaran', label: 'Mata pelajaran' },
    { key: 'Materi', label: 'Materi' },
    { key: 'Kehadiran', label: 'Kehadiran' },
    {
      key: 'Prosen Penguasaan',
      label: 'Prosen Penguasaan',
      render: (value: string) => (value ? `${value}%` : '-'),
    },
    {
      key: 'Prosen Penjelasan',
      label: 'Prosen Penjelasan',
      render: (value: string) => (value ? `${value}%` : '-'),
    },
    {
      key: 'Prosen Kondisi',
      label: 'Prosen Kondisi',
      render: (value: string) => (value ? `${value}%` : '-'),
    },
    { key: 'Catatan', label: 'Catatan' },
    { key: 'Cabang', label: 'Cabang' },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[200] max-w-md animate-in flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={20} className="flex-shrink-0" />
          ) : toast.type === 'error' ? (
            <XCircle size={20} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0" />
          )}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Perkembangan Belajar Siswa</h1>
          <p className="text-gray-500 text-sm mt-1">
            Input perkembangan per siswa berdasarkan kelompok kelas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Memuat...' : 'Refresh'}
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={handleOpenImport}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md ${
              apiConfigured ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
          >
            <UploadCloud size={16} />
            Import
          </button>
          <button
            onClick={handleOpenInput}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md ${
              apiConfigured ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
          >
            <Plus size={16} />
            Input Perkembangan
          </button>
        </div>
      </div>

      {/* Riwayat Perkembangan */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Riwayat Perkembangan</h2>
          {(loading || refreshing) && (
            <span className="inline-flex items-center gap-2 text-xs text-blue-600">
              <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              Memuat data...
            </span>
          )}
        </div>
        <DataTable
          columns={columns}
          data={sortedPerkembangan}
          loading={loading || refreshing}
          onEdit={apiConfigured ? openEditModal : undefined}
          onDelete={apiConfigured ? (row) => setDeleteConfirm(row) : undefined}
        />
      </div>

      {/* Import Modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Data Perkembangan"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium">Panduan Import (Excel):</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Gunakan template Excel (.xlsx) yang sudah disediakan.</li>
              <li>Pastikan header sesuai dengan kolom pada server database.</li>
              <li>Kolom Timestamp tidak perlu diisi.</li>
            </ul>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleTemplateDownload}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                <FileDown size={14} />
                Download Template
              </button>
            </div>
          </div>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleImportFileChange(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium hover:file:bg-blue-700"
          />

          {importLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              Membaca file...
            </div>
          )}

          {importError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={16} />
              {importError}
            </div>
          )}

          {importPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Preview data (5 baris pertama):</p>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {Object.keys(importPreview[0]).map((key) => (
                        <th key={key} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importPreview.map((row, idx) => (
                      <tr key={idx}>
                        {Object.keys(importPreview[0]).map((key) => (
                          <td key={key} className="px-3 py-2 text-gray-600">
                            {row[key] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">Total data terdeteksi: {importRecords.length}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={importLoading || importRecords.length === 0}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-md disabled:opacity-60"
            >
              Import Data
            </button>
          </div>
        </div>
      </Modal>

      {/* Input Perkembangan Modal */}
      <Modal
        isOpen={inputOpen}
        onClose={() => setInputOpen(false)}
        title="Input Perkembangan Belajar"
        size="xl"
        contentClassName="overflow-y-auto"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[120px]">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <CalendarDays size={16} className="text-gray-400" /> Tanggal
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <BookOpen size={16} className="text-gray-400" /> Mata Pelajaran
              </label>
              <div className="flex items-center gap-2">
                {mataPelajaranOptions.length > 0 ? (
                  <div className="flex-1">
                    <SearchableSelect
                      value={mataPelajaran}
                      onChange={(val) => setMataPelajaran(val)}
                      options={mataPelajaranOptions}
                      placeholder="Pilih Mata Pelajaran"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <input
                      type="text"
                      value={mataPelajaran}
                      onChange={(e) => setMataPelajaran(e.target.value)}
                      placeholder="Ketik Mata Pelajaran jika tidak ada di daftar"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <p className="text-xs text-amber-600 mt-1">Data Mata Pelajaran belum tersedia — Anda dapat mengetik mata pelajaran secara manual atau coba muat ulang daftar.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  title="Muat ulang daftar Mata Pelajaran"
                  className="inline-flex items-center justify-center p-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <ClipboardCheck size={16} className="text-gray-400" /> Jenjang Studi
              </label>
              <SearchableSelect
                value={jenjangStudi}
                onChange={(val) => {
                  setJenjangStudi(val);
                  setRowInputs({});
                  setSearchTerm('');
                }}
                options={jenjangOptions}
                placeholder="Pilih Jenjang Studi"
                disabled={user?.isAdmin ? !selectedCabang : false}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <TrendingUp size={16} className="text-gray-400" /> Materi (Opsional)
              </label>
              <input
                type="text"
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Materi pembelajaran"
              />
            </div>
            {user?.isAdmin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" /> Cabang
                </label>
                <SearchableSelect
                  value={selectedCabang}
                  onChange={(val) => {
                    setSelectedCabang(val);
                    setJenjangStudi('');
                    setKelompokKelas('');
                    setRowInputs({});
                    setSearchTerm('');
                  }}
                  options={cabangOptions}
                  placeholder="Pilih Cabang"
                />
              </div>
            )}
            <div className={user?.isAdmin ? 'space-y-1.5' : 'md:col-span-2 lg:col-span-2 space-y-1.5'}>
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <ClipboardCheck size={16} className="text-gray-400" /> Kelompok Kelas
              </label>
              <SearchableSelect
                value={kelompokKelas}
                onChange={(val) => {
                  setKelompokKelas(val);
                  setRowInputs({});
                }}
                options={kelompokOptions}
                placeholder="Pilih Kelompok Kelas"
                disabled={user?.isAdmin ? !selectedCabang : false}
              />
            </div>
          </div>

          {!canShowTable && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <AlertCircle size={16} />
              Lengkapi Tanggal, Mata Pelajaran, Jenjang Studi, Cabang, dan Kelompok Kelas untuk menampilkan daftar siswa.
            </div>
          )}

                      {canShowTable && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Total siswa: <strong>{filteredSiswa.length}</strong> • Terisi: <strong>{filledCount}</strong>
                  </p>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari nama/NIS"
                      className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSubmitPerkembangan}
                  disabled={submitting || filledCount === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                >
                  <Save size={16} />
                  {submitting ? 'Menyimpan...' : 'Simpan Perkembangan'}
                </button>
              </div>

              <div className="max-h-[420px] overflow-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">NIS</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nama</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kehadiran</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Prosen Penguasaan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Prosen Penjelasan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Prosen Kondisi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedSiswa.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                          {searchTerm ? 'Tidak ada siswa sesuai pencarian.' : 'Tidak ada siswa pada jenjang ini.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedSiswa.map((row) => {
                        const nis = (row['Nis'] || row['nis'] || '').trim();
                        const input = rowInputs[nis] || { Kehadiran: '', 'Prosen Penguasaan': '', 'Prosen Penjelasan': '', 'Prosen Kondisi': '', Catatan: '' };
                        return (
                          <tr key={nis} className="hover:bg-blue-50/50">
                            <td className="px-4 py-3 text-gray-700 font-medium">{nis}</td>
                            <td className="px-4 py-3 text-gray-700">{(row['Nama'] || row['nama'] || '')}</td>
                            <td className="px-4 py-3">
                              <select
                                value={input.Kehadiran}
                                onChange={(e) => handleRowChange(nis, 'Kehadiran', e.target.value)}
                                onFocus={() => loadData(true)}
                                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                              >
                                <option value="">Pilih</option>
                                <option value="Hadir">Hadir</option>
                                <option value="Izin">Izin</option>
                                <option value="Sakit">Sakit</option>
                                <option value="Alpha">Alpha</option>
                              </select>
                            </td>
                            {input.Kehadiran === 'Hadir' ? (
                              <>
                                <td className="px-4 py-3">
                                  <select
                                    value={percentToSelection(input['Prosen Penguasaan'], penguasaanToPercent) || input['Prosen Penguasaan'] || ''}
                                    onChange={(e) => handleRowChange(nis, 'Prosen Penguasaan', e.target.value)}
                                    onFocus={() => loadData(true)}
                                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                  >
                                    <option value="">Pilih</option>
                                    {penguasaanOptions.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={percentToSelection(input['Prosen Penjelasan'], penjelasanToPercent) || input['Prosen Penjelasan'] || ''}
                                    onChange={(e) => handleRowChange(nis, 'Prosen Penjelasan', e.target.value)}
                                    onFocus={() => loadData(true)}
                                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                  >
                                    <option value="">Pilih</option>
                                    {penjelasanOptions.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={percentToSelection(input['Prosen Kondisi'], kondisiToPercent) || input['Prosen Kondisi'] || ''}
                                    onChange={(e) => handleRowChange(nis, 'Prosen Kondisi', e.target.value)}
                                    onFocus={() => loadData(true)}
                                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                  >
                                    <option value="">Pilih</option>
                                    {kondisiOptions.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={input.Catatan}
                                    onChange={(e) => handleRowChange(nis, 'Catatan', e.target.value)}
                                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="Catatan"
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-6 text-center text-sm text-gray-400">-</td>
                                <td className="px-4 py-6 text-center text-sm text-gray-400">-</td>
                                <td className="px-4 py-6 text-center text-sm text-gray-400">-</td>
                                <td className="px-4 py-6 text-center text-sm text-gray-400">-</td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredSiswa.length > perPage && (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                  <p>
                    Menampilkan {(currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, filteredSiswa.length)} dari {filteredSiswa.length} siswa
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="text-xs">Hal {currentPage} / {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title="Edit Perkembangan"
        size="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">NIS</label>
              <input
                type="text"
                value={formData['Nis'] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, Nis: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama</label>
              <input
                type="text"
                value={formData['Nama'] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, Nama: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal</label>
              <input
                type="date"
                value={formData['Tanggal'] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, Tanggal: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mata Pelajaran</label>
              <input
                type="text"
                value={formData['Mata Pelajaran'] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, 'Mata Pelajaran': e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Materi</label>
              <input
                type="text"
                value={formData['Materi'] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, Materi: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Kehadiran</label>
              <select
                value={formData['Kehadiran'] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, Kehadiran: e.target.value }))}
                onFocus={() => loadData(true)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="">Pilih</option>
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
                <option value="Alpha">Alpha</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Penguasaan</label>
              <select
                value={percentToSelection(formData['Prosen Penguasaan'], penguasaanToPercent) || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, 'Prosen Penguasaan': String(mapSelectionToPercent(e.target.value, penguasaanToPercent) ?? '') }))}
                onFocus={() => loadData(true)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="">Pilih</option>
                {penguasaanOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Penjelasan</label>
              <select
                value={percentToSelection(formData['Prosen Penjelasan'], penjelasanToPercent) || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, 'Prosen Penjelasan': String(mapSelectionToPercent(e.target.value, penjelasanToPercent) ?? '') }))}
                onFocus={() => loadData(true)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="">Pilih</option>
                {penjelasanOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Kondisi</label>
              <select
                value={percentToSelection(formData['Prosen Kondisi'], kondisiToPercent) || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, 'Prosen Kondisi': String(mapSelectionToPercent(e.target.value, kondisiToPercent) ?? '') }))}
                onFocus={() => loadData(true)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
              >
                <option value="">Pilih</option>
                {kondisiOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan</label>
              <input
                type="text"
                value={formData['Catatan'] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, Catatan: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cabang</label>
              <input
                type="text"
                value={formData['Cabang'] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, Cabang: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setEditingRecord(null)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-md disabled:opacity-60"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Konfirmasi Hapus"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle size={22} className="text-red-600" />
            </div>
            <p className="text-sm text-red-700">
              Apakah Anda yakin ingin menghapus data perkembangan ini?
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 shadow-md disabled:opacity-60"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
