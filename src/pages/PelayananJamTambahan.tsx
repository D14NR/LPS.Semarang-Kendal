import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  BookOpen,
  UserCheck,
  RefreshCw,
  Save,
  Plus,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
  Clock,
  Download,
  UploadCloud,
  FileDown,
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
import { parseSpreadsheetFile, generateTemplateCSV } from '../utils/importUtils';
import { useAuth } from '../contexts/AuthContext';

const importFields = [
  { key: 'Nis', label: 'NIS' },
  { key: 'Nama Siswa', label: 'Nama Siswa' },
  { key: 'Tanggal', label: 'Tanggal' },
  { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
  { key: 'Materi', label: 'Materi' },
  { key: 'Durasi', label: 'Durasi' },
  { key: 'Pengajar', label: 'Pengajar' },
  { key: 'Cabang', label: 'Cabang' },
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

export default function PelayananJamTambahan() {
  const { user } = useAuth();
  const [siswaData, setSiswaData] = useState<Record<string, string>[]>([]);
  const [pelayananData, setPelayananData] = useState<Record<string, string>[]>([]);
  const [pengajarData, setPengajarData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const [inputOpen, setInputOpen] = useState(false);
  const [tanggal, setTanggal] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [pengajar, setPengajar] = useState('');
  const [materi, setMateri] = useState('');
  const [durasi, setDurasi] = useState('');
  const [jenjang, setJenjang] = useState('');
  const [selectedCabang, setSelectedCabang] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

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
      const [siswa, pelayanan, pengajarSheet] = await Promise.all([
        fetchAllData('siswa', forceRefresh),
        fetchAllData('pelayanan', forceRefresh),
        fetchAllData('pengajar', forceRefresh),
      ]);
      setSiswaData(siswa);
      setPelayananData(pelayanan);
      setPengajarData(pengajarSheet);
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

  const pengajarOptions = useMemo(() => {
    if (!mataPelajaran) return [] as string[];
    const unique = new Set<string>();
    pengajarData.forEach((row) => {
      const mapel = (row['Mata Pelajaran'] || row['Mata  Pelajaran'] || '').trim();
      if (mapel.toLowerCase() !== mataPelajaran.toLowerCase()) return;
      const nama = (row['Pengajar'] || row['Nama Pengajar'] || '').trim();
      if (nama) unique.add(nama);
    });
    return Array.from(unique).sort();
  }, [pengajarData, mataPelajaran]);

  const jenjangOptions = useMemo(() => {
    const unique = new Set<string>();
    siswaData.forEach((row) => {
      const jenjangVal = (row['Jenjang Studi'] || '').trim();
      if (jenjangVal) unique.add(jenjangVal);
    });
    return Array.from(unique).sort();
  }, [siswaData]);

  const effectiveCabang = user?.isAdmin ? selectedCabang : user?.cabang || '';

  const canShowTable = Boolean(
    tanggal && mataPelajaran && pengajar && durasi && jenjang && (user?.isAdmin ? effectiveCabang : true)
  );

  const filteredSiswa = useMemo(() => {
    if (!jenjang) return [];
    const keyword = searchTerm.trim().toLowerCase();
    return siswaData.filter((row) => {
      const rowJenjang = (row['Jenjang Studi'] || '').trim();
      if (rowJenjang.toLowerCase() !== jenjang.toLowerCase()) return false;
      if (effectiveCabang) {
        const rowCabang = (row['Cabang'] || '').trim();
        if (rowCabang.toLowerCase() !== effectiveCabang.toLowerCase()) return false;
      }
      if (!keyword) return true;
      const nis = (row['Nis'] || '').toLowerCase();
      const nama = (row['Nama'] || '').toLowerCase();
      return nis.includes(keyword) || nama.includes(keyword);
    });
  }, [siswaData, jenjang, effectiveCabang, searchTerm]);

  const selectedCount = useMemo(() => Object.values(selectedSiswa).filter(Boolean).length, [selectedSiswa]);

  const toggleSiswa = (nis: string) => {
    setSelectedSiswa((prev) => ({ ...prev, [nis]: !prev[nis] }));
  };

  const resetInputModal = () => {
    setTanggal('');
    setMataPelajaran('');
    setPengajar('');
    setMateri('');
    setDurasi('');
    setJenjang('');
    setSelectedCabang('');
    setSelectedSiswa({});
    setSearchTerm('');
  };

  const handleOpenInput = () => {
    if (!apiConfigured) {
      showToast('warning', 'Apps Script belum dikonfigurasi.');
      return;
    }
    resetInputModal();
    setInputOpen(true);
  };

  const handleSubmitPelayanan = async () => {
    if (!apiConfigured) {
      showToast('warning', 'Apps Script belum dikonfigurasi.');
      return;
    }
    if (!canShowTable) {
      showToast('warning', 'Lengkapi Tanggal, Mata Pelajaran, Pengajar, Durasi, Cabang, dan Jenjang Studi.');
      return;
    }

    const records = siswaData
      .filter((row) => selectedSiswa[row['Nis']])
      .map((row) => ({
        Nis: row['Nis'] || '',
        'Nama Siswa': row['Nama'] || '',
        Tanggal: tanggal,
        'Mata Pelajaran': mataPelajaran,
        Materi: materi,
        Durasi: durasi,
        Pengajar: pengajar,
        Cabang: effectiveCabang || row['Cabang'] || '',
      }));

    if (records.length === 0) {
      showToast('warning', 'Tidak ada siswa yang dicentang.');
      return;
    }

    setSubmitting(true);
    const result = await createBulkRecords('pelayanan', records);
    if (result.success) {
      showToast('success', `✅ ${result.totalAdded || records.length} data pelayanan berhasil disimpan!`);
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
    const csv = generateTemplateCSV(importFields);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'Template_Pelayanan_Jam_Tambahan.csv';
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
    const result = await createBulkRecords('pelayanan', importRecords);
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
    if (sortedPelayanan.length === 0) return;
    const headers = importFields.map((f) => f.label);
    const rows = sortedPelayanan.map((row) =>
      importFields.map((f) => `"${(row[f.key] || '').replace(/"/g, '""')}"`)
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Pelayanan_Jam_Tambahan_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const openEditModal = (row: Record<string, string>) => {
    setEditingRecord(row);
    setFormData({
      Nis: row['Nis'] || '',
      'Nama Siswa': row['Nama Siswa'] || '',
      Tanggal: (() => {
        const parsed = parseDateValue(row['Tanggal'] || '');
        return parsed ? parsed.toISOString().slice(0, 10) : '';
      })(),
      'Mata Pelajaran': row['Mata Pelajaran'] || '',
      Materi: row['Materi'] || '',
      Durasi: row['Durasi'] || '',
      Pengajar: row['Pengajar'] || '',
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
    const result = await updateRecord('pelayanan', rowIndex, formData);
    if (result.success) {
      showToast('success', '✅ Data pelayanan diperbarui');
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
    const result = await deleteRecord('pelayanan', rowIndex);
    if (result.success) {
      showToast('success', '✅ Data pelayanan dihapus');
      setDeleteConfirm(null);
      await loadData(true);
    } else {
      showToast('error', result.message);
    }
    setSubmitting(false);
  };

  const sortedPelayanan = useMemo(() => {
    let rows = [...pelayananData];
    if (user && !user.isAdmin) {
      rows = rows.filter((row) => (row['Cabang'] || '').trim().toLowerCase() === (user.cabang || '').trim().toLowerCase());
    }
    rows.sort((a, b) => {
      const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
      const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
      return db - da;
    });
    return rows;
  }, [pelayananData, user]);

  const columns = [
    { key: 'Nis', label: 'NIS' },
    { key: 'Nama Siswa', label: 'Nama Siswa' },
    { key: 'Tanggal', label: 'Tanggal', render: (value: string) => formatDateDisplay(value) },
    { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
    { key: 'Materi', label: 'Materi' },
    { key: 'Durasi', label: 'Durasi' },
    { key: 'Pengajar', label: 'Pengajar' },
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
          <h1 className="text-2xl font-bold text-gray-800">Pelayanan / Jam Tambahan</h1>
          <p className="text-gray-500 text-sm mt-1">
            Input siswa yang mengikuti jam tambahan berdasarkan jenjang studi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Loading...' : 'Refresh'}
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
            Input Pelayanan/Jam Tambahan
          </button>
        </div>
      </div>

      {/* Riwayat Pelayanan */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Riwayat Pelayanan</h2>
        <DataTable
          columns={columns}
          data={sortedPelayanan}
          loading={loading}
          onEdit={apiConfigured ? openEditModal : undefined}
          onDelete={apiConfigured ? (row) => setDeleteConfirm(row) : undefined}
        />
      </div>

      {/* Import Modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Data Pelayanan"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium">Panduan Import:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Gunakan template CSV yang sudah disediakan.</li>
              <li>Pastikan header sesuai dengan kolom pada spreadsheet.</li>
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
            accept=".xlsx,.xls,.csv"
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

      {/* Input Pelayanan Modal */}
      <Modal
        isOpen={inputOpen}
        onClose={() => setInputOpen(false)}
        title="Input Pelayanan / Jam Tambahan"
        size="xl"
        contentClassName="overflow-visible"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal</label>
              <div className="relative">
                <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mata Pelajaran</label>
              <div className="relative">
                <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <div className="ml-6">
                  <SearchableSelect
                    value={mataPelajaran}
                    onChange={(val) => {
                      setMataPelajaran(val);
                      setPengajar('');
                    }}
                    options={mataPelajaranOptions}
                    placeholder="Pilih Mata Pelajaran"
                  />
                </div>
              </div>
              {mataPelajaranOptions.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Data Mata Pelajaran belum tersedia di menu Nama Pengajar.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pengajar</label>
              <div className="relative">
                <UserCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <div className="ml-6">
                  <SearchableSelect
                    value={pengajar}
                    onChange={(val) => setPengajar(val)}
                    options={pengajarOptions}
                    placeholder="Pilih Pengajar"
                    disabled={!mataPelajaran}
                  />
                </div>
              </div>
              {mataPelajaran && pengajarOptions.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Belum ada pengajar untuk mata pelajaran ini.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Durasi</label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={durasi}
                  onChange={(e) => setDurasi(e.target.value)}
                  placeholder="Contoh: 90 menit"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Materi (Opsional)</label>
              <input
                type="text"
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Materi pembelajaran tambahan"
              />
            </div>
            {user?.isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cabang</label>
                <SearchableSelect
                  value={selectedCabang}
                  onChange={(val) => {
                    setSelectedCabang(val);
                    setSelectedSiswa({});
                  }}
                  options={cabangOptions}
                  placeholder="Pilih Cabang"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenjang Studi</label>
              <SearchableSelect
                value={jenjang}
                onChange={(val) => {
                  setJenjang(val);
                  setSelectedSiswa({});
                }}
                options={jenjangOptions}
                placeholder="Pilih Jenjang Studi"
                disabled={user?.isAdmin ? !selectedCabang : false}
              />
            </div>
          </div>

          {!canShowTable && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <AlertCircle size={16} />
              Lengkapi Tanggal, Mata Pelajaran, Pengajar, Durasi, Cabang, dan Jenjang Studi untuk menampilkan daftar siswa.
            </div>
          )}

          {canShowTable && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Total siswa: <strong>{filteredSiswa.length}</strong> • Dipilih: <strong>{selectedCount}</strong>
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
                  onClick={handleSubmitPelayanan}
                  disabled={submitting || selectedCount === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                >
                  <Save size={16} />
                  {submitting ? 'Menyimpan...' : 'Simpan Pelayanan'}
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Pilih</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">NIS</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nama</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Jenjang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSiswa.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                          Tidak ada siswa pada jenjang ini.
                        </td>
                      </tr>
                    ) : (
                      filteredSiswa.map((row) => (
                        <tr key={row['Nis']} className="hover:bg-blue-50/50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={!!selectedSiswa[row['Nis']]}
                              onChange={() => toggleSiswa(row['Nis'])}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{row['Nis']}</td>
                          <td className="px-4 py-3 text-gray-700">{row['Nama']}</td>
                          <td className="px-4 py-3 text-gray-500">{row['Jenjang Studi'] || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title="Edit Pelayanan"
        size="md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          {[
            { key: 'Nis', label: 'NIS' },
            { key: 'Nama Siswa', label: 'Nama Siswa' },
            { key: 'Tanggal', label: 'Tanggal', type: 'date' },
            { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
            { key: 'Materi', label: 'Materi' },
            { key: 'Durasi', label: 'Durasi' },
            { key: 'Pengajar', label: 'Pengajar' },
            { key: 'Cabang', label: 'Cabang' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
              <input
                type={field.type === 'date' ? 'date' : 'text'}
                value={formData[field.key] || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
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
              Apakah Anda yakin ingin menghapus data pelayanan ini?
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
