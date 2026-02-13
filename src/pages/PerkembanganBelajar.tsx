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
} from '../services/googleSheets';
import { parseSpreadsheetFile, generateTemplateWorkbook, exportRecordsWorkbook } from '../utils/importUtils';
import { useAuth } from '../contexts/AuthContext';

const importFields = [
  { key: 'Nis', label: 'NIS' },
  { key: 'Nama', label: 'Nama' },
  { key: 'Tanggal', label: 'Tanggal' },
  { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
  { key: 'Materi', label: 'Materi' },
  { key: 'Penguasaan', label: 'Penguasaan' },
  { key: 'Penjelasan', label: 'Penjelasan' },
  { key: 'Kondisi', label: 'Kondisi' },
  { key: 'Catatan', label: 'Catatan' },
  { key: 'Cabang', label: 'Cabang' },
];

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

const formatDateDisplay = (value: string): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
  }
  return value;
};

const parseDateValue = (value: string): Date | null => {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10) < 100 ? 2000 + parseInt(match[3], 10) : parseInt(match[3], 10);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export default function PerkembanganBelajar() {
  const { user } = useAuth();
  const [siswaData, setSiswaData] = useState<Record<string, string>[]>([]);
  const [perkembanganData, setPerkembanganData] = useState<Record<string, string>[]>([]);
  const [pengajarData, setPengajarData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const [inputOpen, setInputOpen] = useState(false);
  const [tanggal, setTanggal] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [materi, setMateri] = useState('');
  const [kelompokKelas, setKelompokKelas] = useState('');
  const [selectedCabang, setSelectedCabang] = useState('');
  const [rowInputs, setRowInputs] = useState<Record<string, { Penguasaan: string; Penjelasan: string; Kondisi: string; Catatan: string }>>({});
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
      const [siswa, perkembangan, pengajar] = await Promise.all([
        fetchAllData('siswa', forceRefresh),
        fetchAllData('perkembangan', forceRefresh),
        fetchAllData('pengajar', forceRefresh),
      ]);
      setSiswaData(siswa);
      setPerkembanganData(perkembangan);
      setPengajarData(pengajar);
    } catch {
      showToast('error', 'Gagal memuat data');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cabangOptions = useMemo(() => {
    const unique = new Set<string>();
    siswaData.forEach((row) => {
      const cabang = (row['Cabang'] || '').trim();
      if (cabang) unique.add(cabang);
    });
    return Array.from(unique).sort();
  }, [siswaData]);

  const mataPelajaranOptions = useMemo(() => {
    const unique = new Set<string>();
    pengajarData.forEach((row) => {
      const mapel = (row['Mata Pelajaran'] || row['Mata  Pelajaran'] || '').trim();
      if (mapel) unique.add(mapel);
    });
    return Array.from(unique).sort();
  }, [pengajarData]);

  const effectiveCabang = user?.isAdmin ? selectedCabang : user?.cabang || '';

  const kelompokOptions = useMemo(() => {
    const unique = new Set<string>();
    siswaData.forEach((row) => {
      const rowCabang = (row['Cabang'] || '').trim();
      if (effectiveCabang && rowCabang.toLowerCase() !== effectiveCabang.toLowerCase()) return;
      const kelasValue = (row['Kelompok Kelas'] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      kelasValue.forEach((item) => unique.add(item));
    });
    return Array.from(unique).sort();
  }, [siswaData, effectiveCabang]);

  const canShowTable = Boolean(tanggal && mataPelajaran && kelompokKelas && (user?.isAdmin ? effectiveCabang : true));

  useEffect(() => {
    setCurrentPage(1);
  }, [kelompokKelas, searchTerm, effectiveCabang]);

  const filteredSiswa = useMemo(() => {
    if (!kelompokKelas) return [];
    const keyword = searchTerm.trim().toLowerCase();
    return siswaData.filter((row) => {
      const kelasValue = (row['Kelompok Kelas'] || '').split(',').map((s) => s.trim());
      const matchesKelas = kelasValue.includes(kelompokKelas);
      if (!matchesKelas) return false;
      if (effectiveCabang) {
        const rowCabang = (row['Cabang'] || '').trim().toLowerCase();
        if (rowCabang !== effectiveCabang.toLowerCase()) return false;
      }
      if (!keyword) return true;
      const nis = (row['Nis'] || '').toLowerCase();
      const nama = (row['Nama'] || '').toLowerCase();
      return nis.includes(keyword) || nama.includes(keyword);
    });
  }, [siswaData, kelompokKelas, effectiveCabang, searchTerm]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredSiswa.length / perPage)), [filteredSiswa.length, perPage]);
  const paginatedSiswa = useMemo(
    () => filteredSiswa.slice((currentPage - 1) * perPage, currentPage * perPage),
    [filteredSiswa, currentPage, perPage]
  );

  const filledCount = useMemo(() => {
    return Object.values(rowInputs).filter((val) => {
      return val.Penguasaan || val.Penjelasan || val.Kondisi || val.Catatan;
    }).length;
  }, [rowInputs]);

  const resetInputModal = () => {
    setTanggal('');
    setMataPelajaran('');
    setMateri('');
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

  const handleRowChange = (nis: string, key: 'Penguasaan' | 'Penjelasan' | 'Kondisi' | 'Catatan', value: string) => {
    setRowInputs((prev) => ({
      ...prev,
      [nis]: {
        Penguasaan: prev[nis]?.Penguasaan || '',
        Penjelasan: prev[nis]?.Penjelasan || '',
        Kondisi: prev[nis]?.Kondisi || '',
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
      showToast('warning', 'Lengkapi Tanggal, Mata Pelajaran, Cabang, dan Kelompok Kelas.');
      return;
    }

    const records = filteredSiswa
      .map((row) => {
        const input = rowInputs[row['Nis']] || { Penguasaan: '', Penjelasan: '', Kondisi: '', Catatan: '' };
        if (!input.Penguasaan && !input.Penjelasan && !input.Kondisi && !input.Catatan) return null;
        return {
          Nis: row['Nis'] || '',
          Nama: row['Nama'] || '',
          Tanggal: tanggal,
          'Mata Pelajaran': mataPelajaran,
          Materi: materi,
          Penguasaan: input.Penguasaan,
          Penjelasan: input.Penjelasan,
          Kondisi: input.Kondisi,
          Catatan: input.Catatan,
          Cabang: effectiveCabang || row['Cabang'] || '',
        };
      })
      .filter(Boolean) as Record<string, string>[];

    if (records.length === 0) {
      showToast('warning', 'Tidak ada siswa yang diisi.');
      return;
    }

    setSubmitting(true);
    const result = await createBulkRecords('perkembangan', records);
    if (result.success) {
      showToast('success', `✅ ${result.totalAdded || records.length} data perkembangan berhasil disimpan!`);
      setInputOpen(false);
      resetInputModal();
      await loadData(true);
    } else {
      showToast('error', result.message);
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
    const blob = generateTemplateWorkbook(importFields, 'Template Perkembangan');
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
    const result = await createBulkRecords('perkembangan', importRecords);
    if (result.success) {
      showToast('success', `✅ ${result.totalAdded || importRecords.length} data berhasil diimport!`);
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
    setEditingRecord(row);
    setFormData({
      Nis: row['Nis'] || '',
      Nama: row['Nama'] || '',
      Tanggal: (() => {
        const parsed = parseDateValue(row['Tanggal'] || '');
        return parsed ? parsed.toISOString().slice(0, 10) : '';
      })(),
      'Mata Pelajaran': row['Mata Pelajaran'] || '',
      Materi: row['Materi'] || '',
      Penguasaan: row['Penguasaan'] || '',
      Penjelasan: row['Penjelasan'] || '',
      Kondisi: row['Kondisi'] || '',
      Catatan: row['Catatan'] || '',
      Cabang: row['Cabang'] || '',
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const rowIndex = parseInt(editingRecord['_rowIndex'] || '0');
    if (rowIndex < 2) {
      showToast('error', 'Row index tidak valid');
      return;
    }
    setSubmitting(true);
    const result = await updateRecord('perkembangan', rowIndex, formData);
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
    const rowIndex = parseInt(deleteConfirm['_rowIndex'] || '0');
    if (rowIndex < 2) {
      showToast('error', 'Row index tidak valid');
      return;
    }
    setSubmitting(true);
    const result = await deleteRecord('perkembangan', rowIndex);
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
    { key: 'Nis', label: 'NIS' },
    { key: 'Nama', label: 'Nama' },
    {
      key: 'Tanggal',
      label: 'Tanggal',
      render: (value: string) => formatDateDisplay(value),
    },
    { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
    { key: 'Materi', label: 'Materi' },
    {
      key: 'Penguasaan',
      label: 'Penguasaan',
      render: (value: string) => {
        const colors: Record<string, string> = {
          'Sangat Baik': 'bg-emerald-100 text-emerald-700',
          'Baik': 'bg-green-100 text-green-700',
          'Cukup': 'bg-yellow-100 text-yellow-700',
          'Kurang': 'bg-orange-100 text-orange-700',
          'Sangat Kurang': 'bg-red-100 text-red-700',
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100 text-gray-600'}`}>
            {value || '-'}
          </span>
        );
      },
    },
    { key: 'Penjelasan', label: 'Penjelasan' },
    { key: 'Kondisi', label: 'Kondisi' },
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
              <SearchableSelect
                value={mataPelajaran}
                onChange={(val) => setMataPelajaran(val)}
                options={mataPelajaranOptions}
                placeholder="Pilih Mata Pelajaran"
              />
              {mataPelajaranOptions.length === 0 && (
                <p className="text-xs text-amber-600">Data Mata Pelajaran belum tersedia di menu Nama Pengajar.</p>
              )}
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
                    setKelompokKelas('');
                    setRowInputs({});
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
              Lengkapi Tanggal, Mata Pelajaran, Cabang, dan Kelompok Kelas untuk menampilkan daftar siswa.
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Penguasaan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Penjelasan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kondisi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedSiswa.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                          {searchTerm ? 'Tidak ada siswa sesuai pencarian.' : 'Tidak ada siswa pada kelompok ini.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedSiswa.map((row) => {
                        const input = rowInputs[row['Nis']] || { Penguasaan: '', Penjelasan: '', Kondisi: '', Catatan: '' };
                        return (
                          <tr key={row['Nis']} className="hover:bg-blue-50/50">
                            <td className="px-4 py-3 text-gray-700 font-medium">{row['Nis']}</td>
                            <td className="px-4 py-3 text-gray-700">{row['Nama']}</td>
                            <td className="px-4 py-3">
                              <select
                                value={input.Penguasaan}
                                onChange={(e) => handleRowChange(row['Nis'], 'Penguasaan', e.target.value)}
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
                                value={input.Penjelasan}
                                onChange={(e) => handleRowChange(row['Nis'], 'Penjelasan', e.target.value)}
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
                                value={input.Kondisi}
                                onChange={(e) => handleRowChange(row['Nis'], 'Kondisi', e.target.value)}
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
                                onChange={(e) => handleRowChange(row['Nis'], 'Catatan', e.target.value)}
                                className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="Catatan"
                              />
                            </td>
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
          {[
            { key: 'Nis', label: 'NIS' },
            { key: 'Nama', label: 'Nama' },
            { key: 'Tanggal', label: 'Tanggal', type: 'date' },
            { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
            { key: 'Materi', label: 'Materi' },
            { key: 'Penguasaan', label: 'Penguasaan', type: 'select', options: penguasaanOptions },
            { key: 'Penjelasan', label: 'Penjelasan', type: 'select', options: penjelasanOptions },
            { key: 'Kondisi', label: 'Kondisi', type: 'select', options: kondisiOptions },
            { key: 'Catatan', label: 'Catatan' },
            { key: 'Cabang', label: 'Cabang' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
              {field.type === 'select' ? (
                <select
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Pilih</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'date' ? 'date' : 'text'}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              )}
            </div>
          ))}
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
