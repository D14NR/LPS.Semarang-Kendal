import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookMarked,
  RefreshCw,
  Save,
  Plus,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
  Download,
  UploadCloud,
  FileDown,
  Trash2,
  Edit2,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import {
  fetchAllData,
  fetchPengajarFromKmb,
  createBulkRecords,
  updateRecord,
  deleteRecord,
  isAppsScriptConfigured,
} from '../services/supabase';
import { parseSpreadsheetFile, generateTemplateWorkbook, exportRecordsWorkbook } from '../utils/importUtils';
import { useAuth } from '../contexts/AuthContext';

const importFields = [
  { key: 'nis', label: 'NIS' },
  { key: 'nama', label: 'Nama' },
  { key: 'mata_pelajaran', label: 'Mata Pelajaran' },
  { key: 'pengajar', label: 'Pengajar' },
  { key: 'catatan', label: 'Catatan' },
  { key: 'Cabang', label: 'Cabang' },
];

const getTemplateFields = (isAdmin: boolean) =>
  isAdmin ? importFields : importFields.filter((field) => field.key !== 'Cabang');

export default function CatatanPembelajaran() {
  const { user } = useAuth();

  // Helper functions for flexible field extraction
  function toTitleCase(s: string) {
    return s
      .replace(/[_\-]+/g, ' ')
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());
  }

  function toSnakeCase(s: string) {
    return s
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  }

  const getRowValue = (row: Record<string, string>, ...keys: string[]) => {
    for (const k of keys) {
      const v = (row[k] || row[toTitleCase(k)] || row[toSnakeCase(k)] || '').trim();
      if (v) return v;
    }
    return '';
  };

  const getNisValue = (row: Record<string, string>) => getRowValue(row, 'Nis', 'nis', 'NIS');
  const getNamaValue = (row: Record<string, string>) =>
    getRowValue(row, 'Nama', 'nama', 'Nama Siswa', 'nama_siswa', 'nama_lengkap', 'Nama Lengkap', 'name', 'Name', 'full_name', 'Full Name');

  // State management
  const [siswaData, setSiswaData] = useState<Record<string, string>[]>([]);
  const [catatanData, setCatatanData] = useState<Record<string, string>[]>([]);
  const [pengajarData, setPengajarData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const [inputOpen, setInputOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importRecords, setImportRecords] = useState<Record<string, string>[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [nisValue, setNisValue] = useState('');
  const [namaValue, setNamaValue] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [pengajar, setPengajar] = useState('');
  const [catatan, setCatatan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [cabang, setCabang] = useState('');
  const [presentasi, setPresentasi] = useState('');
  const [selectedCabang, setSelectedCabang] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const cabangOptions = useMemo(
    () =>
      Array.from(
        new Set(
          siswaData
            .map((s) => getRowValue(s, 'Cabang', 'cabang') || '')
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'id')),
    [siswaData]
  );

  const pengajarOptions = useMemo(() => {
    const map = new Map<string, string>();
    pengajarData.forEach((p) => {
      const nama = (p['nama'] || p['Nama'] || '').trim();
      if (nama) map.set(nama.toLowerCase(), nama);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'id'));
  }, [pengajarData]);

  const siswaOptions = useMemo(() => {
    let filtered = siswaData;
    if (selectedCabang) {
      filtered = filtered.filter((s) => getRowValue(s, 'Cabang', 'cabang') === selectedCabang);
    }
    return filtered.map((s) => `${getNisValue(s)} - ${getNamaValue(s)}`).sort((a, b) => a.localeCompare(b, 'id'));
  }, [siswaData, selectedCabang]);

  const handleSiswaSelect = (value: string) => {
    if (!value) {
      setNisValue('');
      setNamaValue('');
      setCabang('');
      return;
    }
    const [nis, nama] = value.split(' - ');
    setNisValue(nis.trim());
    setNamaValue(nama.trim());
    const selected = siswaData.find(
      (s) => getNisValue(s) === nis.trim() && getNamaValue(s) === nama.trim()
    );
    setCabang(selected ? getRowValue(selected, 'Cabang', 'cabang') : '');
  };

  const mataPelajaranOptions = useMemo(() => {
    const map = new Map<string, string>();
    pengajarData.forEach((row) => {
      const raw = getRowValue(
        row,
        'bidang_studi',
        'mata_pelajaran',
        'Mata Pelajaran',
        'Mata  Pelajaran',
        'bidang',
        'bidang studi'
      ).trim();
      if (!raw) return;
      // split entries that were stored as comma/semicolon/pipe/backslash separated lists
      const parts = raw.split(/[;,|\\/]+/).map((p) => p.trim()).filter(Boolean);
      parts.forEach((p) => map.set(p.toLowerCase(), p));
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'id'));
  }, [pengajarData]);

  const filteredCatatan = useMemo(() => {
    return catatanData.filter((item) => {
      // Filter by cabang: non-admin users only see their cabang; admins can optionally filter by selectedCabang
      const rowCabang = String(item['cabang'] || item['Cabang'] || '').trim();
      if (user && !user.isAdmin) {
        const userCab = String(user.cabang || '').trim();
        if (!userCab) return false;
        if (rowCabang.toLowerCase() !== userCab.toLowerCase()) return false;
      } else if (selectedCabang) {
        if (rowCabang !== selectedCabang) return false;
      }

      const searchLower = searchTerm.toLowerCase();
      return (
        (item['nis'] || '').toLowerCase().includes(searchLower) ||
        (item['nama'] || '').toLowerCase().includes(searchLower) ||
        (item['mata_pelajaran'] || '').toLowerCase().includes(searchLower) ||
        (item['pengajar'] || '').toLowerCase().includes(searchLower) ||
        (rowCabang || '').toLowerCase().includes(searchLower) ||
        (item['tanggal'] || '').toLowerCase().includes(searchLower) ||
        (item['catatan'] || '').toLowerCase().includes(searchLower) ||
        (item['presentasi'] || '').toLowerCase().includes(searchLower)
      );
    });
  }, [catatanData, searchTerm, user, selectedCabang]);

  const tableColumns = useMemo(
    () => [
      { key: 'nis', label: 'NIS' },
      { key: 'nama', label: 'Nama' },
      { key: 'mata_pelajaran', label: 'Mata Pelajaran' },
      { key: 'pengajar', label: 'Pengajar' },
      { key: 'cabang', label: 'Cabang' },
      { key: 'tanggal', label: 'Tanggal', isDate: true },
      { key: 'presentasi', label: 'Presentasi' },
      { key: 'catatan', label: 'Catatan' },
      { key: 'created_at', label: 'Dibuat', isDate: true },
    ],
    []
  );

  const loadData = useCallback(async (forceRefresh = false) => {
    setRefreshing(true);
    try {
      const [siswa, catatan, pengajar] = await Promise.all([
        fetchAllData('siswa', forceRefresh),
        fetchAllData('catatan_pembelajaran', forceRefresh),
        fetchPengajarFromKmb(),
      ]);
      setSiswaData(siswa || []);
      setCatatanData(catatan || []);
      setPengajarData(pengajar || []);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Gagal memuat data';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Use modal flow: parse and show preview, do not immediately submit
    try {
      setImportLoading(true);
      setImportError('');
      const result = await parseSpreadsheetFile(file, importFields);
      if (result.error) {
        setImportError(result.error);
        setImportPreview([]);
        setImportRecords([]);
      } else {
        setImportPreview(result.preview || []);
        setImportRecords(result.records || []);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal memproses file');
      setImportPreview([]);
      setImportRecords([]);
    } finally {
      setImportLoading(false);
      // clear the input element value handled by caller if applicable
    }
  };

  const handleOpenImport = () => {
    if (!isAppsScriptConfigured()) {
      setToast({ type: 'warning', message: 'Database belum terhubung.' });
      return;
    }
    setImportError('');
    setImportPreview([]);
    setImportRecords([]);
    setImportOpen(true);
  };

  const handleImportSubmit = async () => {
    if (!isAppsScriptConfigured()) {
      setToast({ type: 'warning', message: 'Database belum terhubung.' });
      return;
    }
    if (!importRecords.length) {
      setImportError('Tidak ada data untuk diimport.');
      return;
    }
    try {
      setImportLoading(true);
      const recordsToImport = user && !user.isAdmin
        ? importRecords.map((r) => ({ ...r, Cabang: user.cabang || r.Cabang || r.cabang || '' }))
        : importRecords;

      const createResult = await createBulkRecords('catatan_pembelajaran', recordsToImport);
      if (createResult.success) {
        const totalAdded = createResult.totalAdded || recordsToImport.length;
        setToast({ type: 'success', message: `${totalAdded} catatan berhasil ditambahkan` });
        setImportOpen(false);
        setImportRecords([]);
        setImportPreview([]);
        await loadData(true);
      } else {
        setImportError(createResult.message || 'Gagal mengimpor data');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal mengimpor data');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportRecordsWorkbook(filteredCatatan, 'catatan_pembelajaran', tableColumns);
      setToast({ type: 'success', message: 'Data berhasil diunduh' });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Gagal mengekspor data';
      setToast({ type: 'error', message: errMsg });
    }
  };

  const handleAddCatatan = async () => {
    if (!nisValue || !namaValue || !tanggal || !mataPelajaran || !pengajar || !cabang) {
      setToast({ type: 'warning', message: 'Semua field harus diisi' });
      return;
    }

    try {
      setSubmitting(true);
      const record: Record<string, string> = {
        nis: nisValue,
        nama: namaValue,
        tanggal,
        mata_pelajaran: mataPelajaran,
        pengajar: pengajar,
        cabang,
      };
      if (catatan) record.catatan = catatan;
      if (presentasi) record.presentasi = presentasi;

      if (editingId) {
        await updateRecord('catatan_pembelajaran', editingId, record);
        setToast({ type: 'success', message: 'Catatan berhasil diperbarui' });
      } else {
        await createBulkRecords('catatan_pembelajaran', [record]);
        setToast({ type: 'success', message: 'Catatan berhasil ditambahkan' });
      }

      setNisValue('');
      setNamaValue('');
      setMataPelajaran('');
      setPengajar('');
      setCatatan('');
      setEditingId(null);
      setInputOpen(false);
      await loadData(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Gagal menyimpan catatan';
      setToast({ type: 'error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCatatan = (item: Record<string, string>) => {
    setEditingId(item.id || null);
    setNisValue(item['nis'] || '');
    setNamaValue(item['nama'] || '');
    setTanggal(item['tanggal'] || '');
    setMataPelajaran(item['mata_pelajaran'] || '');
    setPengajar(item['pengajar'] || '');
    setCabang(item['cabang'] || '');
    setPresentasi(item['presentasi'] || '');
    setCatatan(item['catatan'] || '');
    setInputOpen(true);
  };

  const handleDeleteCatatan = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus catatan ini?')) return;
    try {
      await deleteRecord('catatan_pembelajaran', id);
      setToast({ type: 'success', message: 'Catatan berhasil dihapus' });
      await loadData(true);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Gagal menghapus catatan';
      setToast({ type: 'error', message: errMsg });
    }
  };

  const handleCloseModal = () => {
    setInputOpen(false);
    setNisValue('');
    setNamaValue('');
    setTanggal('');
    setMataPelajaran('');
    setPengajar('');
    setCabang('');
    setPresentasi('');
    setCatatan('');
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookMarked size={32} className="text-blue-600" />
            Catatan Pembelajaran Siswa
          </h1>
          <p className="text-gray-600 text-sm mt-1">Kelola catatan pembelajaran siswa</p>
        </div>
        <button
          onClick={() => setInputOpen(true)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md ${submitting ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
          disabled={submitting}
        >
          <Plus size={18} />
          Tambah Catatan
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : toast.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error' && <XCircle size={20} />}
          {toast.type === 'warning' && <AlertCircle size={20} />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-auto text-sm font-medium opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tools */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Cari catatan..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {user && user.isAdmin && (
          <div className="w-44">
            <select
              value={selectedCabang}
              onChange={(e) => setSelectedCabang(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Cabang</option>
              {cabangOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className={`inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm`}
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Memuat...' : 'Refresh'}
        </button>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
        >
          <Download size={18} />
          Ekspor
        </button>
        <button
          onClick={handleOpenImport}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md ${submitting ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'}`}
        >
          <UploadCloud size={18} />
          Impor
        </button>
      </div>

      {/* Import Modal */}
      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Import Data Catatan Pembelajaran">
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2">Panduan Import (Excel):</h4>
            <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
              <li>Gunakan template Excel (.xlsx) yang sudah disediakan.</li>
              <li>Pastikan header sesuai dengan kolom pada server database.</li>
              <li>Kolom Timestamp tidak perlu diisi.</li>
            </ul>
            <div className="mt-3">
              <button
                onClick={() => {
                  const blob = generateTemplateWorkbook(getTemplateFields(Boolean(user && user.isAdmin)), 'Template_Catatan_Pembelajaran');
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'Template_Catatan_Pembelajaran.xlsx';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm"
              >
                <FileDown size={16} />
                Download Template
              </button>
            </div>
          </div>

          <div>
            <label className="inline-flex items-center gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={() => document.getElementById('catatan-import-file')?.click()}>
                Pilih File
              </button>
              <span className="text-sm text-gray-500">{importFileName || 'Tidak ada file yang dipilih'}</span>
            </label>
            <input id="catatan-import-file" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { setImportFileName(e.target.files?.[0]?.name || ''); handleImportFile(e as any); }} className="hidden" />
          </div>

          {importError && (
            <div className="p-3 bg-red-50 text-red-800 rounded-md border border-red-100 text-sm">{importError}</div>
          )}

          {importPreview && importPreview.length > 0 && (
            <div className="max-h-48 overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                  <tr>
                    {Object.keys(importPreview[0]).map((h) => (
                      <th key={h} className="px-3 py-2 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importPreview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {Object.keys(importPreview[0]).map((h) => (
                        <td key={h} className="px-3 py-2 text-gray-600">{row[h] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => { setImportOpen(false); setImportPreview([]); setImportRecords([]); setImportFileName(''); setImportError(''); }} className="px-4 py-2 border border-gray-300 rounded-md">Batal</button>
            <button onClick={handleImportSubmit} disabled={importLoading} className={`px-4 py-2 rounded-md ${importLoading ? 'bg-gray-400 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
              {importLoading ? 'Memproses...' : 'Import Data'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal */}
      <Modal isOpen={inputOpen} onClose={handleCloseModal} title={editingId ? 'Edit Catatan' : 'Tambah Catatan Baru'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Siswa</label>
            <SearchableSelect
              options={siswaOptions}
              placeholder="Pilih siswa..."
              onChange={handleSiswaSelect}
              value={nisValue && namaValue ? `${nisValue} - ${namaValue}` : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
            <select
              value={mataPelajaran}
              onChange={(e) => setMataPelajaran(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Pilih Mata Pelajaran</option>
              {mataPelajaranOptions.map((mp) => (
                <option key={mp} value={mp}>
                  {mp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pengajar</label>
              <select
                value={pengajar}
                onChange={(e) => setPengajar(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih Pengajar</option>
                {pengajarOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Masukkan catatan pembelajaran..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {catatan.trim().length > 0 && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Berapa Presentasi menurutnya</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={presentasi}
                onChange={(e) => setPresentasi(e.target.value)}
                placeholder="Misal 85.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAddCatatan}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save size={18} />
              {editingId ? 'Perbarui' : 'Tambah'}
            </button>
            <button
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
          </div>
        </div>
      </Modal>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">NIS</th>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Mata Pelajaran</th>
                <th className="px-4 py-3 text-left">Pengajar</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">Presentasi</th>
                <th className="px-4 py-3 text-left">Catatan</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCatatan.length > 0 ? (
                filteredCatatan.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{item['nis'] || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item['nama'] || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item['mata_pelajaran'] || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item['pengajar'] || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item['tanggal'] ? new Date(item['tanggal']).toLocaleDateString('id-ID') : '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{item['presentasi'] || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-md truncate">{item['catatan'] || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEditCatatan(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCatatan(item.id || '')}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Belum ada catatan pembelajaran.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
