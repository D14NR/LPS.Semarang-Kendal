import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  MessageCircle,
  Send,
  RefreshCw,
  AlertCircle,
  FileText,
  Copy,
} from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { fetchAllData } from '../services/googleSheets';
import { useAuth } from '../contexts/AuthContext';

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

const normalizePhone = (value: string) => {
  if (!value) return '';
  let digits = value.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  }
  if (!digits.startsWith('62')) {
    digits = `62${digits}`;
  }
  return digits;
};

export default function LaporanWhatsapp() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [siswaData, setSiswaData] = useState<Record<string, string>[]>([]);
  const [presensiData, setPresensiData] = useState<Record<string, string>[]>([]);
  const [perkembanganData, setPerkembanganData] = useState<Record<string, string>[]>([]);
  const [nilaiUtbkData, setNilaiUtbkData] = useState<Record<string, string>[]>([]);
  const [nilaiTkaSmaData, setNilaiTkaSmaData] = useState<Record<string, string>[]>([]);
  const [nilaiTkaSmpData, setNilaiTkaSmpData] = useState<Record<string, string>[]>([]);
  const [nilaiTkaSdData, setNilaiTkaSdData] = useState<Record<string, string>[]>([]);
  const [nilaiTesStandarData, setNilaiTesStandarData] = useState<Record<string, string>[]>([]);
  const [nilaiEvaluasiData, setNilaiEvaluasiData] = useState<Record<string, string>[]>([]);
  const [pelayananData, setPelayananData] = useState<Record<string, string>[]>([]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCabang, setSelectedCabang] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    setLoading(true);
    try {
      const [siswa, presensi, perkembangan, nilaiUtbk, nilaiTkaSma, nilaiTkaSmp, nilaiTkaSd, nilaiTesStandar, nilaiEvaluasi, pelayanan] = await Promise.all([
        fetchAllData('siswa', forceRefresh),
        fetchAllData('presensi', forceRefresh),
        fetchAllData('perkembangan', forceRefresh),
        fetchAllData('nilaiUtbk', forceRefresh),
        fetchAllData('nilaiTkaSma', forceRefresh),
        fetchAllData('nilaiTkaSmp', forceRefresh),
        fetchAllData('nilaiTkaSd', forceRefresh),
        fetchAllData('nilaiTesStandar', forceRefresh),
        fetchAllData('nilaiEvaluasi', forceRefresh),
        fetchAllData('pelayanan', forceRefresh),
      ]);
      setSiswaData(siswa);
      setPresensiData(presensi);
      setPerkembanganData(perkembangan);
      setNilaiUtbkData(nilaiUtbk);
      setNilaiTkaSmaData(nilaiTkaSma);
      setNilaiTkaSmpData(nilaiTkaSmp);
      setNilaiTkaSdData(nilaiTkaSd);
      setNilaiTesStandarData(nilaiTesStandar);
      setNilaiEvaluasiData(nilaiEvaluasi);
      setPelayananData(pelayanan);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const effectiveCabang = user?.isAdmin ? selectedCabang : user?.cabang || '';

  const jenjangOptions = useMemo(() => {
    const unique = new Set<string>();
    siswaData.forEach((row) => {
      if (effectiveCabang) {
        const rowCabang = (row['Cabang'] || '').trim();
        if (rowCabang.toLowerCase() !== effectiveCabang.toLowerCase()) return;
      }
      const jenjang = (row['Jenjang Studi'] || '').trim();
      if (jenjang) unique.add(jenjang);
    });
    return Array.from(unique).sort();
  }, [siswaData, effectiveCabang]);

  const studentOptions = useMemo(() => {
    if (!selectedJenjang) return [] as Record<string, string>[];
    return siswaData.filter((row) => {
      const rowJenjang = (row['Jenjang Studi'] || '').trim();
      if (rowJenjang.toLowerCase() !== selectedJenjang.toLowerCase()) return false;
      if (effectiveCabang) {
        const rowCabang = (row['Cabang'] || '').trim();
        if (rowCabang.toLowerCase() !== effectiveCabang.toLowerCase()) return false;
      }
      return true;
    });
  }, [siswaData, selectedJenjang, effectiveCabang]);

  const selectedStudentData = useMemo(() => {
    if (!selectedStudent) return null;
    const nisValue = selectedStudent.split(' - ')[0];
    return siswaData.find((row) => row['Nis'] === nisValue);
  }, [siswaData, selectedStudent]);

  const dateRange = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [startDate, endDate]);

  const presensiFiltered = useMemo(() => {
    if (!selectedStudentData) return [] as Record<string, string>[];
    return presensiData
      .filter((row) => row['Nis'] === selectedStudentData['Nis'])
      .filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end))
      .sort((a, b) => {
        const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
        const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
        return db - da;
      });
  }, [presensiData, selectedStudentData, dateRange]);

  const perkembanganFiltered = useMemo(() => {
    if (!selectedStudentData) return [] as Record<string, string>[];
    return perkembanganData
      .filter((row) => row['Nis'] === selectedStudentData['Nis'])
      .filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end))
      .sort((a, b) => {
        const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
        const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
        return db - da;
      });
  }, [perkembanganData, selectedStudentData, dateRange]);

  const nilaiBundle = useMemo(() => {
    if (!selectedStudentData) {
      return {
        utbk: [],
        tkaSma: [],
        tkaSmp: [],
        tkaSd: [],
        tesStandar: [],
        evaluasi: [],
      } as Record<string, Record<string, string>[]>;
    }
    const nis = selectedStudentData['Nis'];
    const filterRows = (rows: Record<string, string>[]) =>
      rows
        .filter((row) => row['Nis'] === nis)
        .filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end))
        .sort((a, b) => {
          const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
          const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
          return db - da;
        });

    return {
      utbk: filterRows(nilaiUtbkData),
      tkaSma: filterRows(nilaiTkaSmaData),
      tkaSmp: filterRows(nilaiTkaSmpData),
      tkaSd: filterRows(nilaiTkaSdData),
      tesStandar: filterRows(nilaiTesStandarData),
      evaluasi: filterRows(nilaiEvaluasiData),
    };
  }, [selectedStudentData, dateRange, nilaiUtbkData, nilaiTkaSmaData, nilaiTkaSmpData, nilaiTkaSdData, nilaiTesStandarData, nilaiEvaluasiData]);

  const pelayananFiltered = useMemo(() => {
    if (!selectedStudentData) return [] as Record<string, string>[];
    return pelayananData
      .filter((row) => row['Nis'] === selectedStudentData['Nis'])
      .filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end))
      .sort((a, b) => {
        const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
        const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
        return db - da;
      });
  }, [pelayananData, selectedStudentData, dateRange]);

  const weekAbsenceList = useMemo(() => {
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(now.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(now);
    yesterdayEnd.setDate(now.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const statusMap: Record<string, string> = {
      h: 'Hadir',
      hadir: 'Hadir',
      i: 'Izin',
      izin: 'Izin',
      s: 'Sakit',
      sakit: 'Sakit',
      a: 'Alpha',
      alpha: 'Alpha',
    };

    const absensiMap = new Map<
      string,
      {
        nis: string;
        name: string;
        cabang: string;
        counts: Record<string, number>;
        dates: string[];
        lastDate: Date | null;
        phone: string;
        parentPhone: string;
      }
    >();

    const cabangFilter = user?.isAdmin ? selectedCabang : user?.cabang || '';

    presensiData.forEach((row) => {
      const parsed = parseDateValue(row['Tanggal'] || '');
      if (!parsed || parsed < yesterdayStart || parsed > yesterdayEnd) return;

      const rawStatus = (row['Status'] || '').trim();
      const normalizedStatus = statusMap[rawStatus.toLowerCase()] || rawStatus;
      if (!normalizedStatus || normalizedStatus === 'Hadir') return;

      const nis = (row['Nis'] || '').trim();
      if (!nis) return;

      const siswa = siswaData.find((item) => (item['Nis'] || '').trim() === nis);
      if (!siswa) return;

      const cabang = (siswa['Cabang'] || '').trim();
      if (cabangFilter && cabang.toLowerCase() !== cabangFilter.toLowerCase()) return;

      if (!absensiMap.has(nis)) {
        const parentRaw =
          siswa['No.whatsapp orang tua'] ||
          siswa['No. whatsapp orang tua'] ||
          siswa['No Whatsapp Orang Tua'] ||
          '';
        const studentRaw =
          siswa['No.whatsapp siswa'] ||
          siswa['No. whatsapp siswa'] ||
          siswa['No Whatsapp Siswa'] ||
          siswa['Tlpn'] ||
          siswa['Telepon'] ||
          '';
        absensiMap.set(nis, {
          nis,
          name: siswa['Nama'] || '-',
          cabang: cabang || '-',
          counts: { Izin: 0, Sakit: 0, Alpha: 0 },
          dates: [],
          lastDate: null,
          phone: normalizePhone(studentRaw),
          parentPhone: normalizePhone(parentRaw),
        });
      }

      const entry = absensiMap.get(nis)!;
      if (!entry.counts[normalizedStatus]) {
        entry.counts[normalizedStatus] = 0;
      }
      entry.counts[normalizedStatus] += 1;
      const formattedDate = formatDate(row['Tanggal'] || '');
      entry.dates.push(`${formattedDate} (${normalizedStatus})`);
      if (!entry.lastDate || parsed > entry.lastDate) {
        entry.lastDate = parsed;
      }
    });

    return Array.from(absensiMap.values()).sort((a, b) => {
      const da = a.lastDate ? a.lastDate.getTime() : 0;
      const db = b.lastDate ? b.lastDate.getTime() : 0;
      return db - da;
    });
  }, [presensiData, siswaData, user, selectedCabang]);

  const buildAbsensiMessage = (item: {
    name: string;
    nis: string;
    cabang: string;
    dates: string[];
    counts: Record<string, number>;
  }) => {
    const header = '📌 *LAPORAN KETIDAKHADIRAN KEMARIN*\n';
    const info = `Nama: ${item.name}\nNIS: ${item.nis}\nCabang: ${item.cabang}\n\n`;
    const summary = `Ringkasan:\n• Izin: ${item.counts.Izin || 0}\n• Sakit: ${item.counts.Sakit || 0}\n• Alpha: ${item.counts.Alpha || 0}\n\n`;
    const details = item.dates.length ? `Tanggal: \n${item.dates.map((d) => `• ${d}`).join('\n')}\n\n` : '';
    return `${header}${info}${summary}${details}Terima kasih atas perhatiannya.`;
  };

  const handleSendAbsensi = (item: {
    parentPhone: string;
    phone: string;
    name: string;
    nis: string;
    cabang: string;
    dates: string[];
    counts: Record<string, number>;
    lastDate: Date | null;
  }) => {
    const phone = item.parentPhone || item.phone;
    if (!phone) return;
    const message = buildAbsensiMessage(item);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const lastPerkembangan = perkembanganFiltered[0];
  const totalCatatan = perkembanganFiltered.length;
  const totalNilaiCount =
    nilaiBundle.utbk.length +
    nilaiBundle.tkaSma.length +
    nilaiBundle.tkaSmp.length +
    nilaiBundle.tkaSd.length +
    nilaiBundle.tesStandar.length +
    nilaiBundle.evaluasi.length;

  const whatsappNumber = useMemo(() => {
    if (!selectedStudentData) return '';
    const parentRaw =
      selectedStudentData['No.whatsapp orang tua'] ||
      selectedStudentData['No. whatsapp orang tua'] ||
      selectedStudentData['No Whatsapp Orang Tua'] ||
      '';
    const studentRaw =
      selectedStudentData['No.whatsapp siswa'] ||
      selectedStudentData['No. whatsapp siswa'] ||
      selectedStudentData['No Whatsapp Siswa'] ||
      selectedStudentData['Tlpn'] ||
      selectedStudentData['Telepon'] ||
      '';
    return normalizePhone(parentRaw || studentRaw);
  }, [selectedStudentData]);

  const messageText = useMemo(() => {
    if (!selectedStudentData) return '';
    const periode = `${startDate ? formatDate(startDate) : '-'} s/d ${endDate ? formatDate(endDate) : '-'}`;
    const header = `📌 *LAPORAN PERKEMBANGAN BELAJAR SISWA*\nPeriode: ${periode}\n`;
    const biodata = `\n👤 *Biodata*\n• Nama: ${selectedStudentData['Nama'] || '-'}\n• NIS: ${selectedStudentData['Nis'] || '-'}\n• Jenjang: ${selectedStudentData['Jenjang Studi'] || '-'}\n• Cabang: ${selectedStudentData['Cabang'] || '-'}\n`;

    const statusMap: Record<string, string> = {
      h: 'Hadir',
      hadir: 'Hadir',
      i: 'Izin',
      izin: 'Izin',
      s: 'Sakit',
      sakit: 'Sakit',
      a: 'Alpha',
      alpha: 'Alpha',
    };

    const presensiCounts = presensiFiltered.reduce(
      (acc, row) => {
        const rawStatus = (row['Status'] || '').trim();
        const normalized = statusMap[rawStatus.toLowerCase()] || rawStatus;
        if (normalized) {
          acc[normalized] = (acc[normalized] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    const recentPresensiDates = presensiFiltered
      .filter((row) => {
        const parsed = parseDateValue(row['Tanggal'] || '');
        return parsed ? parsed >= weekAgo && parsed <= now : false;
      })
      .map((row) => formatDate(row['Tanggal'] || ''));
    const uniqueRecentDates = Array.from(new Set(recentPresensiDates));
    const recentDatesText = uniqueRecentDates.length
      ? uniqueRecentDates.join(', ')
      : 'Tidak ada data presensi 7 hari terakhir.';

    const presensiSummary = `\n🗓️ *Laporan Presensi*\n• Total: ${presensiFiltered.length}\n• Hadir: ${presensiCounts['Hadir'] || 0}\n• Izin: ${presensiCounts['Izin'] || 0}\n• Sakit: ${presensiCounts['Sakit'] || 0}\n• Alpha: ${presensiCounts['Alpha'] || 0}\n• Tanggal 7 Hari Terakhir: ${recentDatesText}\n`;

    const ringkasanPerkembangan = `\n📘 *Laporan Perkembangan*\n• Total Catatan: ${totalCatatan}\n`;
    const lastInfo = lastPerkembangan
      ? `• Terakhir: ${formatDate(lastPerkembangan['Tanggal'] || '')} (${lastPerkembangan['Mata Pelajaran'] || '-'})\n• Penguasaan: ${lastPerkembangan['Penguasaan'] || '-'}\n• Penjelasan: ${lastPerkembangan['Penjelasan'] || '-'}\n• Kondisi: ${lastPerkembangan['Kondisi'] || '-'}\n• Catatan: ${lastPerkembangan['Catatan'] || '-'}\n`
      : '• Belum ada catatan perkembangan pada periode ini.\n';

    const formatNilaiLine = (label: string, rows: Record<string, string>[]) => {
      if (!rows.length) return '';
      const latest = rows[0];
      const tanggal = formatDate(latest['Tanggal'] || '');
      const jenis = latest['Jenis Tes'] || '-';
      if (label === 'Evaluasi') {
        const mapel = latest['Mata Pelajaran'] || '-';
        const nilai = latest['Nilai'] || '-';
        return `• ${label}: ${tanggal} (${jenis}) | Mapel: ${mapel} | Nilai: ${nilai}`;
      }
      const rerata = latest['Rerata'] || '-';
      const total = latest['Total'] || '-';
      return `• ${label}: ${tanggal} (${jenis}) | Rerata: ${rerata} | Total: ${total}`;
    };

    const nilaiLines = [
      formatNilaiLine('UTBK', nilaiBundle.utbk),
      formatNilaiLine('TKA SMA', nilaiBundle.tkaSma),
      formatNilaiLine('TKA SMP', nilaiBundle.tkaSmp),
      formatNilaiLine('TKA SD', nilaiBundle.tkaSd),
      formatNilaiLine('Tes Standar', nilaiBundle.tesStandar),
      formatNilaiLine('Evaluasi', nilaiBundle.evaluasi),
    ].filter(Boolean);

    const nilaiSummary = nilaiLines.length
      ? `\n🏆 *Laporan Nilai*\n${nilaiLines.join('\n')}\n`
      : '';

    const pelayananSummary = `\n⏱️ *Laporan Pelayanan/Jam Tambahan*\n• Total Sesi: ${pelayananFiltered.length}\n`;

    const footer = `\nTerima kasih atas perhatian Bapak/Ibu. 🙏`;
    return `${header}${biodata}${presensiSummary}${ringkasanPerkembangan}${lastInfo}${nilaiSummary}${pelayananSummary}${footer}`;
  }, [selectedStudentData, startDate, endDate, totalCatatan, lastPerkembangan, presensiFiltered, nilaiBundle, pelayananFiltered]);

  const handleCopy = async () => {
    if (!messageText) return;
    await navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsapp = () => {
    if (!whatsappNumber || !messageText) return;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const canPreview = !!selectedStudentData && (!!startDate || !!endDate || totalCatatan > 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-56 bg-white border border-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Laporan WhatsApp Orang Tua</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kirim laporan perkembangan belajar langsung ke WhatsApp orang tua siswa.
          </p>
          {(loading || refreshing) && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-blue-600">
              <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              Memuat data...
            </div>
          )}
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Memuat...' : 'Refresh Data'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
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
              <SearchableSelect
                value={selectedCabang}
                onChange={(val) => {
                  setSelectedCabang(val);
                  setSelectedJenjang('');
                  setSelectedStudent('');
                }}
                options={cabangOptions}
                placeholder="Pilih Cabang"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Jenjang Studi</label>
            <SearchableSelect
              value={selectedJenjang}
              onChange={(val) => {
                setSelectedJenjang(val);
                setSelectedStudent('');
              }}
              options={jenjangOptions}
              placeholder="Pilih Jenjang"
              disabled={user?.isAdmin ? !selectedCabang : false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama / NIS</label>
                          <SearchableSelect
              value={selectedStudent}
              onChange={(val) => setSelectedStudent(val)}
              options={studentOptions.map((row) => `${row['Nis']} - ${row['Nama']}`)}
              placeholder="Pilih Siswa"
              disabled={!selectedJenjang}
            />
          </div>
        </div>


      </div>

      {!selectedStudentData && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-sm text-blue-700">
          Pilih jenjang dan siswa untuk menampilkan laporan WhatsApp.
        </div>
      )}

      {selectedStudentData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">Preview Laporan</h2>
            </div>
            {!canPreview ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <AlertCircle size={16} />
                Lengkapi periode untuk menampilkan preview.
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-gray-50 border border-gray-100 rounded-xl p-4 min-h-[240px]">
                  {messageText}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <Copy size={16} />
                    {copied ? 'Tersalin' : 'Copy Pesan'}
                  </button>
                  <button
                    onClick={handleSendWhatsapp}
                    disabled={!whatsappNumber}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    <Send size={16} />
                    Kirim WhatsApp
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedStudentData?.['No.whatsapp orang tua'] || selectedStudentData?.['No. whatsapp orang tua'] || selectedStudentData?.['No Whatsapp Orang Tua']
                    ? 'Laporan dikirim ke nomor WhatsApp orang tua.'
                    : 'Nomor WhatsApp orang tua kosong, laporan akan dikirim ke nomor WhatsApp siswa.'}
                </p>
                {!whatsappNumber && (
                  <p className="text-xs text-red-600 mt-2">
                    Nomor WhatsApp orang tua/siswa belum tersedia.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={18} className="text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-800">Ringkasan Laporan</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs text-emerald-600">Total Catatan Perkembangan</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{totalCatatan}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-xs text-blue-600">Presensi (Total)</p>
                  <p className="text-lg font-bold text-blue-700 mt-1">{presensiFiltered.length}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs text-amber-600">Pelayanan (Total)</p>
                  <p className="text-lg font-bold text-amber-700 mt-1">{pelayananFiltered.length}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="text-xs text-purple-600">Nilai (Total Data)</p>
                  <p className="text-lg font-bold text-purple-700 mt-1">
                    {totalNilaiCount}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Perkembangan Terakhir</p>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{lastPerkembangan ? formatDate(lastPerkembangan['Tanggal'] || '') : '-'}</p>
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Tanggal</th>
                      <th className="px-3 py-2 text-left">Mapel</th>
                      <th className="px-3 py-2 text-left">Penguasaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {perkembanganFiltered.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-600">{formatDate(row['Tanggal'] || '')}</td>
                        <td className="px-3 py-2 text-gray-600">{row['Mata Pelajaran'] || '-'}</td>
                        <td className="px-3 py-2 text-gray-600">{row['Penguasaan'] || '-'}</td>
                      </tr>
                    ))}
                    {perkembanganFiltered.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-gray-400">
                          Tidak ada data perkembangan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalNilaiCount > 0 && (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Jenis Nilai</th>
                        <th className="px-3 py-2 text-left">Tanggal</th>
                        <th className="px-3 py-2 text-left">Tes</th>
                        <th className="px-3 py-2 text-right">Rerata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ...nilaiBundle.utbk.map((row) => ({ type: 'UTBK', row })),
                        ...nilaiBundle.tkaSma.map((row) => ({ type: 'TKA SMA', row })),
                        ...nilaiBundle.tkaSmp.map((row) => ({ type: 'TKA SMP', row })),
                        ...nilaiBundle.tkaSd.map((row) => ({ type: 'TKA SD', row })),
                        ...nilaiBundle.tesStandar.map((row) => ({ type: 'Tes Standar', row })),
                        ...nilaiBundle.evaluasi.map((row) => ({ type: 'Evaluasi', row })),
                      ]
                        .sort((a, b) => {
                          const da = parseDateValue(a.row['Tanggal'] || '')?.getTime() || 0;
                          const db = parseDateValue(b.row['Tanggal'] || '')?.getTime() || 0;
                          return db - da;
                        })
                        .slice(0, 5)
                        .map((item, idx) => (
                          <tr key={`${item.type}-${idx}`}>
                            <td className="px-3 py-2 text-gray-600">{item.type}</td>
                            <td className="px-3 py-2 text-gray-600">{formatDate(item.row['Tanggal'] || '')}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {item.type === 'Evaluasi'
                                ? item.row['Mata Pelajaran'] || '-'
                                : item.row['Jenis Tes'] || '-'}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {item.type === 'Evaluasi'
                                ? item.row['Nilai'] || '-'
                                : item.row['Rerata'] || '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              {totalNilaiCount === 0 && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500">
                  Tidak ada data nilai pada periode ini.
                </div>
              )}

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
                    {pelayananFiltered.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-600">{formatDate(row['Tanggal'] || '')}</td>
                        <td className="px-3 py-2 text-gray-600">{row['Mata Pelajaran'] || '-'}</td>
                        <td className="px-3 py-2 text-gray-600">{row['Pengajar'] || '-'}</td>
                        <td className="px-3 py-2 text-gray-600">{row['Durasi'] || '-'}</td>
                      </tr>
                    ))}
                    {pelayananFiltered.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                          Tidak ada data pelayanan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-500">
                Laporan diambil dari sheet Presensi, Perkembangan, Nilai, dan Pelayanan sesuai periode.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle size={18} className="text-red-500" />
          <h2 className="text-lg font-semibold text-gray-800">Siswa Tidak Hadir Kemarin</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Menampilkan siswa dengan status Izin, Sakit, atau Alpha pada hari kemarin. Klik tombol WhatsApp untuk menghubungi orang tua.
        </p>
        {weekAbsenceList.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-500">
            Tidak ada siswa yang tercatat tidak hadir pada hari kemarin.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-3 text-left">Siswa</th>
                  <th className="px-3 py-3 text-left">Cabang</th>
                  <th className="px-3 py-3 text-left">Ringkasan</th>
                  <th className="px-3 py-3 text-left">Tanggal Terakhir</th>
                  <th className="px-3 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weekAbsenceList.map((item) => (
                  <tr key={item.nis} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-gray-700">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-gray-400">NIS: {item.nis}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{item.cabang}</td>
                    <td className="px-3 py-3 text-gray-600">
                      Izin: {item.counts.Izin || 0} • Sakit: {item.counts.Sakit || 0} • Alpha: {item.counts.Alpha || 0}
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      {item.lastDate ? formatDate(item.lastDate.toISOString()) : '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleSendAbsensi(item)}
                        disabled={!item.parentPhone && !item.phone}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Send size={14} />
                        WhatsApp
                      </button>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {item.parentPhone ? 'Ke WA Orang Tua' : 'Ke WA Siswa'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
