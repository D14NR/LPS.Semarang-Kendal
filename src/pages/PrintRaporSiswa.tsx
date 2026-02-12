import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Search,
  Printer,
  User,
  ClipboardCheck,
  TrendingUp,
  Award,
  Clock,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import {
  fetchAllData,
  type SheetKey,
} from '../services/googleSheets';
import { useAuth } from '../contexts/AuthContext';

interface SheetBundle {
  siswa: Record<string, string>[];
  presensi: Record<string, string>[];
  perkembangan: Record<string, string>[];
  pelayanan: Record<string, string>[];
  nilaiUtbk: Record<string, string>[];
  nilaiTkaSma: Record<string, string>[];
  nilaiTkaSmp: Record<string, string>[];
  nilaiTkaSd: Record<string, string>[];
  nilaiTesStandar: Record<string, string>[];
  nilaiEvaluasi: Record<string, string>[];
}

const sheetKeys: SheetKey[] = [
  'siswa',
  'presensi',
  'perkembangan',
  'pelayanan',
  'nilaiUtbk',
  'nilaiTkaSma',
  'nilaiTkaSmp',
  'nilaiTkaSd',
  'nilaiTesStandar',
  'nilaiEvaluasi',
];

const parseDateValue = (value: string): Date | null => {
  if (!value) return null;
  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = parseFloat(value);
    if (!Number.isNaN(serial) && serial > 20000) {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
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

const formatDate = (value: string) => {
  const parsed = parseDateValue(value);
  if (!parsed) return value || '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed);
};

const withinRange = (value: string, start?: Date | null, end?: Date | null) => {
  if (!start && !end) return true;
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  if (start && parsed < start) return false;
  if (end && parsed > end) return false;
  return true;
};

const formatNumber = (value: string) => {
  const num = parseFloat(value || '');
  if (Number.isNaN(num)) return value || '-';
  return new Intl.NumberFormat('id-ID').format(num);
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const ChartBarList = ({
  title,
  items,
  colors,
}: {
  title: string;
  items: { label: string; value: number }[];
  colors?: string[];
}) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const palette = colors || ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];

  return (
    <div className="border border-gray-100 rounded-xl p-4 chart-container">
      <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const percentage = Math.round((item.value / maxValue) * 100);
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full ${palette[idx % palette.length]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function PrintRaporSiswa() {
  const { user } = useAuth();
  const [bundle, setBundle] = useState<SheetBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCabang, setSelectedCabang] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    setLoading(true);
    try {
      const results = await Promise.all(sheetKeys.map((key) => fetchAllData(key, forceRefresh)));
      const nextBundle = sheetKeys.reduce((acc, key, idx) => {
        acc[key] = results[idx];
        return acc;
      }, {} as Record<SheetKey, Record<string, string>[]>);
      setBundle(nextBundle as SheetBundle);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const beforePrint = () => setIsPrinting(true);
    const afterPrint = () => setIsPrinting(false);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  const cabangOptions = useMemo(() => {
    if (!bundle) return [] as string[];
    const unique = new Set<string>();
    bundle.siswa.forEach((row) => {
      const cabang = (row['Cabang'] || '').trim();
      if (cabang) unique.add(cabang);
    });
    return Array.from(unique).sort();
  }, [bundle]);

  const effectiveCabang = user?.isAdmin ? selectedCabang : user?.cabang || '';

  const jenjangOptions = useMemo(() => {
    if (!bundle) return [] as string[];
    const unique = new Set<string>();
    bundle.siswa.forEach((row) => {
      if (effectiveCabang) {
        const rowCabang = (row['Cabang'] || '').trim();
        if (rowCabang.toLowerCase() !== effectiveCabang.toLowerCase()) return;
      }
      const jenjang = (row['Jenjang Studi'] || '').trim();
      if (jenjang) unique.add(jenjang);
    });
    return Array.from(unique).sort();
  }, [bundle, effectiveCabang]);

  const studentOptions = useMemo(() => {
    if (!bundle || !selectedJenjang) return [] as Record<string, string>[];
    return bundle.siswa.filter((row) => {
      const rowJenjang = (row['Jenjang Studi'] || '').trim();
      if (rowJenjang.toLowerCase() !== selectedJenjang.toLowerCase()) return false;
      if (effectiveCabang) {
        const rowCabang = (row['Cabang'] || '').trim();
        if (rowCabang.toLowerCase() !== effectiveCabang.toLowerCase()) return false;
      }
      return true;
    });
  }, [bundle, selectedJenjang, effectiveCabang]);

  const selectedStudentData = useMemo(() => {
    if (!bundle || !selectedStudent) return null;
    const nisValue = selectedStudent.split(' - ')[0] || selectedStudent;
    return bundle.siswa.find((row) => row['Nis'] === nisValue || row['Nama'] === selectedStudent);
  }, [bundle, selectedStudent]);

  const dateRange = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [startDate, endDate]);

  const filteredData = useMemo(() => {
    if (!bundle || !selectedStudentData || !searchTriggered) return null;
    const nis = selectedStudentData['Nis'];

    const presensi = bundle.presensi.filter((row) => row['Nis'] === nis)
      .filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end));
    const perkembangan = bundle.perkembangan.filter((row) => row['Nis'] === nis)
      .filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end));
    const pelayanan = bundle.pelayanan.filter((row) => row['Nis'] === nis)
      .filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end));

    const nilai = {
      UTBK: bundle.nilaiUtbk.filter((row) => row['Nis'] === nis).filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end)),
      'TKA SMA': bundle.nilaiTkaSma.filter((row) => row['Nis'] === nis).filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end)),
      'TKA SMP': bundle.nilaiTkaSmp.filter((row) => row['Nis'] === nis).filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end)),
      'TKA SD': bundle.nilaiTkaSd.filter((row) => row['Nis'] === nis).filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end)),
      'Tes Standar': bundle.nilaiTesStandar.filter((row) => row['Nis'] === nis).filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end)),
      Evaluasi: bundle.nilaiEvaluasi.filter((row) => row['Nis'] === nis).filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end)),
    };

    return { presensi, perkembangan, pelayanan, nilai };
  }, [bundle, selectedStudentData, searchTriggered, dateRange]);

  const presensiSummary = useMemo(() => {
    if (!filteredData) return null;
    const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
    filteredData.presensi.forEach((row) => {
      const status = (row['Status'] || '').trim();
      if (status in counts) counts[status as keyof typeof counts] += 1;
    });
    const total = filteredData.presensi.length;
    const hadirRate = total ? (counts.Hadir / total) * 100 : 0;
    const izinRate = total ? (counts.Izin / total) * 100 : 0;
    const sakitRate = total ? (counts.Sakit / total) * 100 : 0;
    const alphaRate = total ? (counts.Alpha / total) * 100 : 0;
    return { ...counts, total, hadirRate, izinRate, sakitRate, alphaRate };
  }, [filteredData]);

  const sortedPresensi = useMemo(() => {
    if (!filteredData) return [];
    return [...filteredData.presensi].sort((a, b) => {
      const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
      const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
      return db - da;
    });
  }, [filteredData]);

  const sortedPerkembangan = useMemo(() => {
    if (!filteredData) return [];
    return [...filteredData.perkembangan].sort((a, b) => {
      const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
      const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
      return db - da;
    });
  }, [filteredData]);

  const sortedPelayanan = useMemo(() => {
    if (!filteredData) return [];
    return [...filteredData.pelayanan].sort((a, b) => {
      const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
      const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
      return db - da;
    });
  }, [filteredData]);

  const perkembanganSummary = useMemo(() => {
    if (!filteredData) return null;
    const penguasaanCount: Record<string, number> = {};
    const penjelasanCount: Record<string, number> = {};
    const kondisiCount: Record<string, number> = {};
    filteredData.perkembangan.forEach((row) => {
      const penguasaan = (row['Penguasaan'] || '').trim();
      const penjelasan = (row['Penjelasan'] || '').trim();
      const kondisi = (row['Kondisi'] || '').trim();
      if (penguasaan) penguasaanCount[penguasaan] = (penguasaanCount[penguasaan] || 0) + 1;
      if (penjelasan) penjelasanCount[penjelasan] = (penjelasanCount[penjelasan] || 0) + 1;
      if (kondisi) kondisiCount[kondisi] = (kondisiCount[kondisi] || 0) + 1;
    });
    return {
      total: filteredData.perkembangan.length,
      penguasaanCount,
      penjelasanCount,
      kondisiCount,
    };
  }, [filteredData]);

  const nilaiSummary = useMemo(() => {
    if (!filteredData) return null;
    const result = Object.entries(filteredData.nilai)
      .map(([label, items]) => {
        const totalValues = items.map((row) => parseFloat(row['Total'] || '')).filter((v) => !Number.isNaN(v));
        const rerataValues = items.map((row) => parseFloat(row['Rerata'] || '')).filter((v) => !Number.isNaN(v));
        const sortedByDate = [...items].sort((a, b) => {
          const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
          const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
          return db - da;
        });
        const latest = sortedByDate[0];
        const previous = sortedByDate[1];
        const latestRerata = parseFloat(latest?.['Rerata'] || '');
        const previousRerata = parseFloat(previous?.['Rerata'] || '');
        const delta =
          !Number.isNaN(latestRerata) && !Number.isNaN(previousRerata)
            ? latestRerata - previousRerata
            : null;
        return {
          label,
          count: items.length,
          avgTotal: average(totalValues),
          avgRerata: average(rerataValues),
          latest,
          previous,
          delta,
        };
      })
      .filter((item) => item.count > 0);
    return result;
  }, [filteredData]);

  const sortedNilaiRows = useMemo(() => {
    if (!filteredData) return [] as { label: string; row: Record<string, string>; dateValue: number }[];
    const combined: { label: string; row: Record<string, string>; dateValue: number }[] = [];
    Object.entries(filteredData.nilai).forEach(([label, rows]) => {
      rows.forEach((row) => {
        const dateValue = parseDateValue(row['Tanggal'] || '')?.getTime() || 0;
        combined.push({ label, row, dateValue });
      });
    });
    return combined.sort((a, b) => b.dateValue - a.dateValue);
  }, [filteredData]);

  const pelayananSummary = useMemo(() => {
    if (!filteredData) return null;
    const durasiValues = filteredData.pelayanan
      .map((row) => parseFloat((row['Durasi'] || '').replace(/[^0-9.]/g, '')))
      .filter((val) => !Number.isNaN(val));

    const perMapel = filteredData.pelayanan.reduce((acc, row) => {
      const mapel = (row['Mata Pelajaran'] || 'Lainnya').trim() || 'Lainnya';
      const durasi = parseFloat((row['Durasi'] || '').replace(/[^0-9.]/g, ''));
      if (!acc[mapel]) {
        acc[mapel] = { sesi: 0, durasiTotal: 0 };
      }
      acc[mapel].sesi += 1;
      if (!Number.isNaN(durasi)) {
        acc[mapel].durasiTotal += durasi;
      }
      return acc;
    }, {} as Record<string, { sesi: number; durasiTotal: number }>);

    return {
      total: filteredData.pelayanan.length,
      avgDurasi: average(durasiValues),
      perMapel,
    };
  }, [filteredData]);

  const presensiChartItems = useMemo(() => {
    if (!presensiSummary) return [];
    return [
      { label: 'Hadir', value: presensiSummary.Hadir },
      { label: 'Izin', value: presensiSummary.Izin },
      { label: 'Sakit', value: presensiSummary.Sakit },
      { label: 'Alpha', value: presensiSummary.Alpha },
    ];
  }, [presensiSummary]);

  const perkembanganChartItems = useMemo(() => {
    const empty = {
      penguasaan: [] as { label: string; value: number }[],
      penjelasan: [] as { label: string; value: number }[],
      kondisi: [] as { label: string; value: number }[],
    };
    if (!perkembanganSummary) {
      return empty;
    }

    const buildItems = (items: Record<string, number>) =>
      Object.entries(items).map(([label, value]) => ({ label, value }));

    return {
      penguasaan: buildItems(perkembanganSummary.penguasaanCount),
      penjelasan: buildItems(perkembanganSummary.penjelasanCount || {}),
      kondisi: buildItems(perkembanganSummary.kondisiCount || {}),
    };
  }, [perkembanganSummary]);

  const nilaiChartItems = useMemo(() => {
    if (!nilaiSummary) return [];
    return nilaiSummary.map((item) => ({
      label: item.label,
      value: Number.isNaN(item.avgRerata) ? 0 : parseFloat(item.avgRerata.toFixed(2)),
    }));
  }, [nilaiSummary]);

  const nilaiComparisonItems = useMemo(() => {
    if (!sortedNilaiRows.length) return [] as { label: string; value: number }[];
    const lastRow = sortedNilaiRows[0];
    const prevRow = sortedNilaiRows[1];
    const lastValue = parseFloat(lastRow?.row['Rerata'] || '0');
    const prevValue = parseFloat(prevRow?.row['Rerata'] || '0');
    return [
      { label: `Tes Terakhir (${lastRow?.label || '-'})`, value: Number.isNaN(lastValue) ? 0 : lastValue },
      { label: `Tes Sebelumnya (${prevRow?.label || '-'})`, value: Number.isNaN(prevValue) ? 0 : prevValue },
    ];
  }, [sortedNilaiRows]);

  const pelayananChartItems = useMemo(() => {
    if (!filteredData) return [];
    const counts: Record<string, number> = {};
    filteredData.pelayanan.forEach((row) => {
      const mapel = (row['Mata Pelajaran'] || 'Lainnya').trim() || 'Lainnya';
      counts[mapel] = (counts[mapel] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [filteredData]);

  const handleSearch = () => {
    setSearchTriggered(true);
  };

  const handleRefresh = () => loadData(true);

  if (loading || !bundle) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-56 bg-white border border-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 print-container">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Print Rapor Siswa</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pilih periode, jenjang, dan siswa untuk melihat laporan lengkap.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all"
          >
            <Printer size={16} />
            Print Rapor
          </button>
        </div>
      </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Periode Mulai</label>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Periode Akhir</label>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          {user?.isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Cabang</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <SearchableSelect
                  value={selectedCabang}
                  onChange={(val: string) => {
                    setSelectedCabang(val);
                    setSelectedJenjang('');
                    setSelectedStudent('');
                    setSearchTriggered(false);
                  }}
                  options={cabangOptions}
                  placeholder="Semua Cabang"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenjang Studi</label>
            <SearchableSelect
              value={selectedJenjang}
              onChange={(val: string) => {
                setSelectedJenjang(val);
                setSelectedStudent('');
                setSearchTriggered(false);
              }}
              options={jenjangOptions}
              placeholder="Pilih Jenjang"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama / NIS</label>
            <SearchableSelect
              value={selectedStudent}
              onChange={(val: string) => {
                setSelectedStudent(val);
                setSearchTriggered(false);
              }}
              options={studentOptions.map((row) => `${row['Nis']} - ${row['Nama']}`)}
              placeholder="Pilih Siswa"
              disabled={!selectedJenjang}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            disabled={!selectedStudent}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-60"
          >
            <Search size={16} />
            Cari Data
          </button>
        </div>
      </div>

      {!searchTriggered && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-sm text-blue-700 no-print">
          Silakan pilih periode, jenjang, dan siswa lalu klik <strong>Cari Data</strong> untuk menampilkan rapor.
        </div>
      )}

      {searchTriggered && !selectedStudentData && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-sm text-amber-700 no-print">
          Data siswa tidak ditemukan. Periksa pilihan Jenjang dan Nama/NIS.
        </div>
      )}

      {searchTriggered && selectedStudentData && filteredData && (
        <div className={`space-y-6 print-area ${isPrinting ? 'print-mode' : ''}`}>
          {/* Biodata + Header */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow">
            <div className="flex flex-col items-center text-center gap-4 mb-6">
              <img
                src="https://career.amikom.ac.id/images/company/cover/1720853154.png"
                alt="Logo"
                className="h-16 w-auto"
              />
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-wide">
                  LAPORAN PERKEMBANGAN BELAJAR SISWA
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  Periode: {startDate ? formatDate(startDate) : '-'} s/d {endDate ? formatDate(endDate) : '-'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Nama: {selectedStudentData['Nama'] || '-'} • NIS: {selectedStudentData['Nis'] || '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Biodata Siswa</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'NIS', value: selectedStudentData['Nis'] },
                { label: 'Nama', value: selectedStudentData['Nama'] },
                { label: 'Tanggal Lahir', value: formatDate(selectedStudentData['Tanggal Lahir'] || '') },
                { label: 'Asal Sekolah', value: selectedStudentData['Asal Sekolah'] },
                { label: 'Jenjang Studi', value: selectedStudentData['Jenjang Studi'] },
                { label: 'Telepon', value: selectedStudentData['Tlpn'] },
                { label: 'Email', value: selectedStudentData['Email'] },
                { label: 'Kelompok Kelas', value: selectedStudentData['Kelompok Kelas'] },
                { label: 'Cabang', value: selectedStudentData['Cabang'] },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-gray-800 font-medium mt-1">{item.value || '-'}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Presensi */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck size={18} className="text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-800">Presensi Siswa</h2>
            </div>
            {presensiSummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
                {[
                  { label: 'Total', value: presensiSummary.total, color: 'bg-gray-50 text-gray-700' },
                  { label: 'Hadir', value: presensiSummary.Hadir, color: 'bg-green-50 text-green-700' },
                  { label: 'Izin', value: presensiSummary.Izin, color: 'bg-yellow-50 text-yellow-700' },
                  { label: 'Sakit', value: presensiSummary.Sakit, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Alpha', value: presensiSummary.Alpha, color: 'bg-red-50 text-red-700' },
                ].map((item) => (
                  <div key={item.label} className={`${item.color} rounded-xl p-3 border border-gray-100`}>
                    <p className="text-xs font-medium">{item.label}</p>
                    <p className="text-xl font-bold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartBarList
                title="Grafik Presensi"
                items={presensiChartItems}
                colors={['bg-green-500', 'bg-yellow-500', 'bg-blue-500', 'bg-red-500']}
              />
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Tanggal</th>
                      <th className="px-3 py-2 text-left">Mata Pelajaran</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                                      {sortedPresensi.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-gray-600">{formatDate(row['Tanggal'] || '')}</td>
                      <td className="px-3 py-2 text-gray-600">{row['Mata Pelajaran'] || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{row['Status'] || '-'}</td>
                    </tr>
                  ))}
                  {filteredData.presensi.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-gray-400">
                          Tidak ada data presensi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Perkembangan */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-800">Perkembangan Belajar</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-xs text-indigo-600">Total Catatan</p>
                <p className="text-2xl font-bold text-indigo-700 mt-1">{perkembanganSummary?.total || 0}</p>
                <p className="text-xs text-indigo-500 mt-2">Catatan perkembangan selama periode</p>
              </div>
              <ChartBarList
                title="Grafik Penguasaan"
                items={perkembanganChartItems.penguasaan.length ? perkembanganChartItems.penguasaan : [{ label: 'Belum ada', value: 0 }]}
                colors={['bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500']}
              />
              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Rekap Penguasaan</p>
                <div className="flex flex-wrap gap-2">
                  {perkembanganSummary && Object.keys(perkembanganSummary.penguasaanCount).length > 0 ? (
                    Object.entries(perkembanganSummary.penguasaanCount).map(([label, count]) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100"
                      >
                        {label} • {count}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">Belum ada catatan penguasaan.</span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <ChartBarList
                title="Grafik Penjelasan"
                items={perkembanganChartItems.penjelasan.length ? perkembanganChartItems.penjelasan : [{ label: 'Belum ada', value: 0 }]}
                colors={['bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500']}
              />
              <ChartBarList
                title="Grafik Kondisi"
                items={perkembanganChartItems.kondisi.length ? perkembanganChartItems.kondisi : [{ label: 'Belum ada', value: 0 }]}
                colors={['bg-emerald-500', 'bg-teal-500', 'bg-lime-500', 'bg-green-500']}
              />
            </div>
            <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Tanggal</th>
                    <th className="px-3 py-2 text-left">Mapel</th>
                    <th className="px-3 py-2 text-left">Materi</th>
                    <th className="px-3 py-2 text-left">Penguasaan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPerkembangan.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-gray-600">{formatDate(row['Tanggal'] || '')}</td>
                      <td className="px-3 py-2 text-gray-600">{row['Mata Pelajaran'] || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{row['Materi'] || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{row['Penguasaan'] || '-'}</td>
                    </tr>
                  ))}
                  {filteredData.perkembangan.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                        Tidak ada data perkembangan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Nilai */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Award size={18} className="text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-800">Nilai & Evaluasi</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ChartBarList
                title="Grafik Rata-rata Total Nilai"
                items={nilaiChartItems.length ? nilaiChartItems : [{ label: 'Belum ada', value: 0 }]}
                colors={['bg-amber-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-teal-500', 'bg-sky-500']}
              />
              <ChartBarList
                title="Perbandingan Tes Terakhir vs Sebelumnya"
                items={nilaiComparisonItems.length ? nilaiComparisonItems : [{ label: 'Belum ada', value: 0 }]}
                colors={['bg-emerald-500', 'bg-slate-500']}
              />
              {(nilaiSummary || []).map((item) => (
                <div key={item.label} className="border border-gray-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    <p>Jumlah Tes: <span className="font-semibold text-gray-700">{item.count}</span></p>
                    <p>Rerata: <span className="font-semibold text-gray-700">{formatNumber(item.avgRerata.toFixed(2))}</span></p>
                    <p>Total: <span className="font-semibold text-gray-700">{formatNumber(item.avgTotal.toFixed(2))}</span></p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Jenis</th>
                    <th className="px-3 py-2 text-left">Tanggal</th>
                    <th className="px-3 py-2 text-left">Tes</th>
                    <th className="px-3 py-2 text-right">Rerata</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedNilaiRows.slice(0, 10).map((item, idx) => (
                    <tr key={`${item.label}-${idx}`}>
                      <td className="px-3 py-2 text-gray-600">{item.label}</td>
                      <td className="px-3 py-2 text-gray-600">{formatDate(item.row['Tanggal'] || '')}</td>
                      <td className="px-3 py-2 text-gray-600">{item.row['Jenis Tes'] || '-'}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatNumber(item.row['Rerata'] || '-')}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatNumber(item.row['Total'] || '-')}</td>
                    </tr>
                  ))}
                  {sortedNilaiRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                        Tidak ada data nilai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pelayanan */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-rose-600" />
              <h2 className="text-lg font-semibold text-gray-800">Pelayanan / Jam Tambahan</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <p className="text-xs text-rose-600">Total Sesi</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">{pelayananSummary?.total || 0}</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-xs text-gray-500">Rata-rata Durasi</p>
                <p className="text-xl font-bold text-gray-700 mt-1">{formatNumber(pelayananSummary?.avgDurasi.toFixed(1) || '0')} menit</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-xs text-indigo-600">Keterangan</p>
                <p className="text-sm text-indigo-700 mt-1">{pelayananSummary && pelayananSummary.total > 0 ? 'Siswa aktif mengikuti jam tambahan' : 'Belum ada sesi jam tambahan'}</p>
              </div>
            </div>
            <ChartBarList
              title="Grafik Sesi Jam Tambahan per Mapel"
              items={pelayananChartItems.length ? pelayananChartItems : [{ label: 'Belum ada', value: 0 }]}
              colors={['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-pink-500', 'bg-indigo-500']}
            />
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Tanggal</th>
                    <th className="px-3 py-2 text-left">Mapel</th>
                    <th className="px-3 py-2 text-left">Pengajar</th>
                    <th className="px-3 py-2 text-left">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPelayanan.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-gray-600">{formatDate(row['Tanggal'] || '')}</td>
                      <td className="px-3 py-2 text-gray-600">{row['Mata Pelajaran'] || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{row['Pengajar'] || '-'}</td>
                      <td className="px-3 py-2 text-gray-600">{row['Durasi'] || '-'}</td>
                    </tr>
                  ))}
                  {filteredData.pelayanan.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                        Tidak ada data pelayanan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Analisa */}
          <section className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white print-page print-reset-shadow">
            <h2 className="text-lg font-semibold mb-3">Analisa & Keterangan</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-slate-200">
              <div className="bg-white/10 rounded-xl p-4 space-y-2">
                <p className="text-xs uppercase text-slate-300">Ringkasan Presensi</p>
                <p>
                  Total presensi <strong>{presensiSummary?.total || 0}</strong> dengan tingkat kehadiran{' '}
                  <strong>{presensiSummary?.total ? Math.round((presensiSummary.hadirRate || 0)) : 0}%</strong>.
                </p>
                <p>
                  Kriteria: Hadir stabil jika ≥ 85%. Izin masih wajar jika ≤ 10%, Sakit wajar jika ≤ 10%, dan Alpha
                  perlu perhatian bila &gt; 5%.
                </p>
                <p>
                  Detail: Hadir {presensiSummary?.Hadir || 0} ({Math.round(presensiSummary?.hadirRate || 0)}%), Izin{' '}
                  {presensiSummary?.Izin || 0} ({Math.round(presensiSummary?.izinRate || 0)}%), Sakit{' '}
                  {presensiSummary?.Sakit || 0} ({Math.round(presensiSummary?.sakitRate || 0)}%), Alpha{' '}
                  {presensiSummary?.Alpha || 0} ({Math.round(presensiSummary?.alphaRate || 0)}%).
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 space-y-2">
                <p className="text-xs uppercase text-slate-300">Perkembangan (Per Mata Pelajaran)</p>
                <p>
                  Mapel dominan: <strong>{sortedPerkembangan[0]?.['Mata Pelajaran'] || '-'}</strong>.
                  Penguasaan materi rata-rata: <strong>{Object.keys(perkembanganSummary?.penguasaanCount || {})[0] || '-'}</strong>.
                </p>
                <p>
                  Penjelasan (fokus/menyimak): <strong>{Object.keys(perkembanganSummary?.penjelasanCount || {})[0] || '-'}</strong>.
                </p>
                <p>
                  Kondisi keaktifan: <strong>{Object.keys(perkembanganSummary?.kondisiCount || {})[0] || '-'}</strong>.
                  Perhatikan siswa aktif bertanya dan konsisten mengikuti instruksi.
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 space-y-2">
                <p className="text-xs uppercase text-slate-300">Analisa Nilai (Rerata per Jenis Tes)</p>
                {(nilaiSummary || []).length > 0 ? (
                  (nilaiSummary || []).map((item) => {
                    const deltaText =
                      item.delta === null
                        ? 'Data sebelumnya belum ada'
                        : item.delta > 0
                        ? `Meningkat (+${item.delta.toFixed(2)})`
                        : item.delta < 0
                        ? `Menurun (${item.delta.toFixed(2)})`
                        : 'Stabil (0)';
                    return (
                      <p key={item.label}>
                        {item.label}: rerata <strong>{formatNumber(item.avgRerata.toFixed(2))}</strong> — {deltaText}.
                      </p>
                    );
                  })
                ) : (
                  <p>Belum ada data nilai pada periode ini.</p>
                )}
              </div>
              <div className="bg-white/10 rounded-xl p-4 space-y-2">
                <p className="text-xs uppercase text-slate-300">Jam Tambahan (Sesi & Durasi per Mapel)</p>
                <p>
                  Total sesi <strong>{pelayananSummary?.total || 0}</strong> dengan rata-rata durasi{' '}
                  <strong>{formatNumber(pelayananSummary?.avgDurasi.toFixed(1) || '0')} menit</strong>.
                </p>
                {pelayananSummary?.perMapel && Object.keys(pelayananSummary.perMapel).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(pelayananSummary.perMapel).map(([mapel, info]) => (
                      <p key={mapel}>
                        {mapel}: {info.sesi} sesi, total durasi {formatNumber(info.durasiTotal.toFixed(0))} menit.
                      </p>
                    ))}
                  </div>
                ) : (
                  <p>Belum ada sesi jam tambahan pada periode ini.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
