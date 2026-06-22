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
  Target,
  CheckCircle2,
  AlertCircle,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  BookOpen,
  Lightbulb,
  Star,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import SearchableSelect from '../components/SearchableSelect';
import {
  fetchAllData,
  type SheetKey,
} from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDateDmy, parseIndoDateString } from '../utils/dateUtils';

interface SheetBundle {
  siswa: Record<string, string>[];
  presensi: Record<string, string>[];
  perkembangan: Record<string, string>[];
  pelayanan: Record<string, string>[];
  catatan_pembelajaran: Record<string, string>[];
  nilaiTesStandar: Record<string, string>[];
  nilaiSnbtUtbk: Record<string, string>[];
  nilaiEvaluasi: Record<string, string>[];
}

const sheetKeys: SheetKey[] = [
  'siswa',
  'presensi',
  'perkembangan',
  'pelayanan',
  'catatan_pembelajaran',
  'nilaiSnbtUtbk',
  'nilaiTesStandar',
  'nilaiEvaluasi',
];

const parseDateValue = (value: string): Date | null => {
  if (!value) return null;
  return parseIndoDateString(value);
};

const formatDate = (value: string) => {
  const parsed = parseDateValue(value);
  if (!parsed) return value || '-';
  return formatDateDmy(parsed);
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

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Komponen MetricCard untuk KPI
const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  progress,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  color: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'indigo' | 'rose';
  progress?: number;
}) => {
  const progressBarClasses = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow print-reset-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && <Icon size={20} className={`text-${color}-600 opacity-50`} />}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressBarClasses[color]} transition-all`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Komponen untuk chart bar dengan styling profesional
const BarChartComponent = ({
  title,
  data,
  dataKey,
}: {
  title: string;
  data: any[];
  dataKey: string;
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8 shadow-sm print-reset-shadow flex flex-col items-center justify-center h-80">
        <BarChart3 size={48} className="text-gray-300 mb-3" />
        <p className="text-gray-400 text-center font-medium">Belum ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition-shadow print-reset-shadow overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
          {title}
        </h3>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#1e40af" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(31, 41, 55, 0.95)',
                border: '1px solid #374151',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => [
                typeof value === 'number' ? value.toFixed(1) : value,
                dataKey,
              ]}
            />
            <Bar
              dataKey={dataKey}
              fill="url(#colorBar)"
              radius={[12, 12, 0, 0]}
              animationDuration={800}
              animationBegin={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Komponen untuk pie chart dengan styling profesional
const PieChartComponent = ({
  title,
  data,
  dataKey,
}: {
  title: string;
  data: any[];
  dataKey: string;
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8 shadow-sm print-reset-shadow flex flex-col items-center justify-center h-80">
        <BarChart3 size={48} className="text-gray-300 mb-3" />
        <p className="text-gray-400 text-center font-medium">Belum ada data untuk ditampilkan</p>
      </div>
    );
  }

  const statusColorMap: Record<string, string> = {
    Hadir: '#10b981',
    Izin: '#f59e0b',
    Sakit: '#ec4899',
    Alpha: '#ef4444',
  };
  const total = data.reduce((sum, item) => sum + item[dataKey], 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition-shadow print-reset-shadow overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full" />
          {title}
        </h3>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={data}
              cx="45%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${percent && percent > 10 ? `${(percent * 100).toFixed(0)}%` : ''}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey={dataKey}
              animationDuration={800}
              animationBegin={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={statusColorMap[entry.name] || COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(31, 41, 55, 0.95)',
                border: '1px solid #374151',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: any) => [
                value,
                `${((value / total) * 100).toFixed(1)}%`,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((item, _idx) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: statusColorMap[item.name] || COLORS[_idx % COLORS.length] }}
              />
              <span className="text-gray-600">{item.name}</span>
              <span className="font-semibold text-gray-800">({item[dataKey]})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Komponen untuk line chart (trend) dengan styling profesional
const LineChartComponent = ({
  title,
  data,
  dataKey,
  dataKeys,
}: {
  title: string;
  data: any[];
  dataKey?: string;
  dataKeys?: { key: string; color: string; label: string }[];
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8 shadow-sm print-reset-shadow flex flex-col items-center justify-center h-80">
        <LineChartIcon size={48} className="text-gray-300 mb-3" />
        <p className="text-gray-400 text-center font-medium">Belum ada data untuk ditampilkan</p>
      </div>
    );
  }

  const isMultiLine = dataKeys && dataKeys.length > 0;
  const keysToDisplay = isMultiLine ? dataKeys : [{ key: dataKey || '', color: '#f59e0b', label: dataKey || '' }];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition-shadow print-reset-shadow overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <div className="w-1 h-5 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full" />
          {title}
        </h3>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(31, 41, 55, 0.95)',
                border: '1px solid #374151',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => [
                typeof value === 'number' ? (isMultiLine ? value.toFixed(1) : `${value.toFixed(1)}%`) : value,
              ]}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#6b7280' }}
              iconType="line"
            />
            {keysToDisplay.map((item, _idx) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stroke={item.color}
                strokeWidth={2.5}
                name={item.label}
                dot={{
                  fill: item.color,
                  r: 4,
                  strokeWidth: 2,
                  stroke: '#fff',
                }}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                }}
                animationDuration={800}
                animationBegin={0}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Komponen untuk analisis per mata pelajaran
const SubjectAnalysisCard = ({
  subject,
  data,
}: {
  subject: string;
  data: {
    totalNotes: number;
    avgPenguasaan: number;
    avgPenjelasan: number;
    avgKondisi: number;
    hadirRate: number;
    avgPresentasi: number;
    notes: string[];
    lastNoteDate: string;
    avgScore: number;
    avgTestScore: number;
    pelayananSessions: number;
    pelayananDuration: number;
    presensiData?: { hadir: number; total: number };
    // Legacy fields for backward compatibility
    masteryLevels?: Record<string, number>;
    focusLevels?: Record<string, number>;
    conditions?: Record<string, number>;
  };
}) => {
  // Tentukan status berdasarkan metrik persentase
  const learningCondition =
    data.avgKondisi >= 75
      ? 'excellent'
      : data.avgKondisi >= 50
      ? 'good'
      : 'needsImprovement';

  const masteryStatus =
    data.avgPenguasaan >= 75
      ? 'strong'
      : data.avgPenguasaan >= 50
      ? 'moderate'
      : 'weak';

  const focusStatus =
    data.avgPenjelasan >= 75
      ? 'strong'
      : data.avgPenjelasan >= 50
      ? 'moderate'
      : 'weak';

  // Generate kelebihan
  const strengths = [];
  if (data.avgPenguasaan >= 75) strengths.push(`Penguasaan materi: ${data.avgPenguasaan.toFixed(1)}% (sangat baik)`);
  if (data.avgPenjelasan >= 75) strengths.push(`Fokus belajar: ${data.avgPenjelasan.toFixed(1)}% (sangat fokus)`);
  if (data.hadirRate >= 85) strengths.push(`Kehadiran: ${Math.round(data.hadirRate)}% (sangat baik)`);
  if (data.avgKondisi >= 75) strengths.push(`Kondisi aktif: ${data.avgKondisi.toFixed(1)}% (sangat aktif)`);

  // Generate kekurangan
  const weaknesses = [];
  if (data.avgPenguasaan < 50) weaknesses.push(`Penguasaan materi: ${data.avgPenguasaan.toFixed(1)}% (perlu ditingkatkan)`);
  if (data.avgPenjelasan < 50) weaknesses.push(`Fokus belajar: ${data.avgPenjelasan.toFixed(1)}% (perlu ditingkatkan)`);
  if (data.hadirRate < 75 && data.hadirRate > 0) weaknesses.push(`Kehadiran: ${Math.round(data.hadirRate)}% (perlu ditingkatkan)`);
  if (data.avgKondisi < 50) weaknesses.push(`Kondisi aktif: ${data.avgKondisi.toFixed(1)}% (perlu ditingkatkan)`);

  // Generate saran
  const recommendations = [];
  if (masteryStatus === 'weak') {
    recommendations.push('Tingkatkan pemahaman konsep dasar melalui review materi');
  }
  if (focusStatus === 'weak') {
    recommendations.push('Tingkatkan konsentrasi dan perhatian saat pembelajaran');
  }
  if (learningCondition === 'needsImprovement') {
    recommendations.push('Lebih aktif bertanya dan berpartisipasi di kelas');
  }
  if (data.hadirRate < 75) {
    recommendations.push('Tingkatkan kehadiran untuk hasil belajar optimal');
  }
  if (data.totalNotes < 5) {
    recommendations.push('Tingkatkan frekuensi belajar dan konsultasi dengan pengajar');
  }
  if (masteryStatus === 'strong' && focusStatus === 'strong') {
    recommendations.push('Pertahankan konsistensi belajar dan manfaatkan jam tambahan untuk pendalaman');
  }
  if (recommendations.length === 0) {
    recommendations.push('Terus tingkatkan prestasi dan pertahankan konsistensi');
  }

  // Calculate progress as average of multiple percentage metrics:
  // penguasaan, penjelasan, kondisi, kehadiran, presentasi catatan,
  // rata-rata nilai (test), dan persentase jam tambahan (dinormalisasi terhadap 3 sesi)
  const pelayananPercent = data.pelayananSessions >= 3
    ? 100
    : data.pelayananSessions > 0
    ? Math.min(100, (data.pelayananSessions / 3) * 100)
    : 0;

  const metrics = [
    data.avgPenguasaan || 0,
    data.avgPenjelasan || 0,
    data.avgKondisi || 0,
    data.hadirRate || 0,
    data.avgPresentasi || 0,
    data.avgTestScore || 0,
    pelayananPercent,
  ];

  const progressPercent = average(metrics);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      {/* Header: Subject name and main score */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">{subject}</h3>
        <div className="text-right">
          <p className="text-lg font-bold text-blue-600">{data.avgPenguasaan.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">penguasaan</p>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-200">
        <div className="text-xs">
          <p className="text-gray-600">Penjelasan</p>
          <p className="font-semibold text-purple-600">{data.avgPenjelasan.toFixed(1)}%</p>
        </div>
        <div className="text-xs">
          <p className="text-gray-600">Kondisi</p>
          <p className="font-semibold text-emerald-600">{data.avgKondisi.toFixed(1)}%</p>
        </div>
        <div className="text-xs">
          <p className="text-gray-600">Kehadiran</p>
          <p className="font-semibold text-blue-600">{Math.round(data.hadirRate)}%</p>
        </div>
        {data.totalNotes > 0 && (
          <div className="text-xs col-span-3">
            <p className="text-gray-600">Presentasi Catatan</p>
            <p className="font-semibold text-sky-600">{data.avgPresentasi > 0 ? `${data.avgPresentasi.toFixed(1)}%` : '-'}</p>
            <p className="text-[10px] text-gray-500">{data.totalNotes} catatan • terakhir {data.lastNoteDate}</p>
          </div>
        )}
        <div className="text-xs">
          <p className="text-gray-600">Rata-rata Nilai</p>
          <p className="font-semibold text-indigo-600">{data.avgTestScore > 0 ? data.avgTestScore.toFixed(1) : '-'}</p>
        </div>
        <div className="text-xs">
          <p className="text-gray-600">Jam Tambahan</p>
          <p className="font-semibold text-rose-600">{data.pelayananSessions > 0 ? `${data.pelayananSessions} sesi` : 'Belum'}</p>
        </div>
      </div>

      {/* Content sections */}
      <div className="space-y-2.5 text-xs">
        {/* Kelebihan */}
        {strengths.length > 0 && (
          <div>
            <p className="font-semibold text-gray-900 mb-1 flex items-center gap-1">
              <Star size={14} className="text-emerald-600" />
              Kelebihan:
            </p>
            <div className="ml-5 space-y-0.5">
              {strengths.map((strength, idx) => (
                <p key={idx} className="text-emerald-700">✓ {strength}</p>
              ))}
            </div>
          </div>
        )}

        {/* Kekurangan */}
        {weaknesses.length > 0 && (
          <div>
            <p className="font-semibold text-gray-900 mb-1 flex items-center gap-1">
              <AlertCircle size={14} className="text-amber-600" />
              Kekurangan:
            </p>
            <div className="ml-5 space-y-0.5">
              {weaknesses.map((weakness, idx) => (
                <p key={idx} className="text-amber-700">⚠ {weakness}</p>
              ))}
            </div>
          </div>
        )}

        {/* Pelayanan (jam tambahan di luar kelas) */}
              {data.pelayananSessions > 0 && (
                <div>
                  <p className="font-semibold text-gray-900 mb-1 flex items-center gap-1">
                    <Clock size={14} className="text-rose-600" />
                    Pelayanan (jam tambahan di luar kelas):
                  </p>
                  <div className="ml-5 space-y-0.5 text-rose-700">
                    <p>• Total sesi: {data.pelayananSessions} kali</p>
                    <p>• Total durasi: {data.pelayananDuration.toFixed(0)} menit</p>
                    {data.isAktif ? (
                      <p>✓ Siswa aktif mengikuti program pendalaman materi</p>
                    ) : (
                      <p>→ Siswa mengikuti jam tambahan namun belum mencapai frekuensi aktif (3+ sesi dalam 7 hari)</p>
                    )}
                  </div>
                </div>
              )}

        {/* Rekomendasi */}
        <div>
          <p className="font-semibold text-gray-900 mb-1 flex items-center gap-1">
            <Lightbulb size={14} className="text-indigo-600" />
            Rekomendasi:
          </p>
          <div className="ml-5 space-y-0.5">
            {recommendations.slice(0, 2).map((rec, idx) => (
              <p key={idx} className="text-indigo-700">– {rec}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-gray-600">Progress Pembelajaran</p>
          <p className="text-xs font-semibold text-gray-700">{progressPercent.toFixed(0)}%</p>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              progressPercent >= 75
                ? 'bg-green-500'
                : progressPercent >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
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
    const handler = (ev: any) => {
      try {
        const changedKey = ev?.detail?.key;
        if (!changedKey) return;
        if (sheetKeys.includes(changedKey as any) || ['kelompokKelas', 'sekolah'].includes(changedKey)) {
          loadData(true);
        }
      } catch {}
    };
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('supabase:recordsChanged', handler as EventListener);
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('supabase:recordsChanged', handler as EventListener);
    };
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
    const start = startDate ? parseIndoDateString(startDate) : null;
    const end = endDate ? parseIndoDateString(endDate) : null;
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
    const catatan = (bundle.catatan_pembelajaran || [])
      .filter((row) => row['Nis'] === nis)
      .filter((row) => withinRange(row['tanggal'] || row['Tanggal'], dateRange.start, dateRange.end));

    const standarCombined = [...(bundle.nilaiTesStandar || [])];

    const nilai = {
      Standar: standarCombined.filter((row) => row['Nis'] === nis).filter((row) => withinRange(row['Tanggal'], dateRange.start, dateRange.end)),
      'SNBT-UTBK': (bundle.nilaiSnbtUtbk || []).filter((row: Record<string, string>) => row['Nis'] === nis)
        .filter((row: Record<string, string>) => withinRange(row['Tanggal'], dateRange.start, dateRange.end)),
      Evaluasi: (bundle.nilaiEvaluasi || []).filter((row: Record<string, string>) => row['Nis'] === nis)
        .filter((row: Record<string, string>) => withinRange(row['Tanggal'], dateRange.start, dateRange.end)),
    };

    return { presensi, perkembangan, pelayanan, catatan, nilai };
  }, [bundle, selectedStudentData, searchTriggered, dateRange]);

  const catatanBySubject = useMemo(() => {
    if (!filteredData) return {} as Record<string, Record<string, string>[]>;
    const groups: Record<string, Record<string, string>[]> = {};
    filteredData.catatan.forEach((row) => {
      const mapel = (row['mata_pelajaran'] || row['Mata Pelajaran'] || 'Lainnya').trim() || 'Lainnya';
      if (!groups[mapel]) groups[mapel] = [];
      groups[mapel].push(row);
    });
    return groups;
  }, [filteredData]);

  const presensiSummary = useMemo(() => {
    if (!filteredData) return null;
    const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
    
    // Count from presensi_siswa table
    filteredData.presensi.forEach((row) => {
      const status = (row['Status'] || '').trim();
      if (status in counts) counts[status as keyof typeof counts] += 1;
    });
    
    // Count from perkembangan_belajar kehadiran column
    filteredData.perkembangan.forEach((row) => {
      const kehadiran = (row['kehadiran'] || '').trim();
      if (kehadiran in counts) counts[kehadiran as keyof typeof counts] += 1;
    });
    
    const total = filteredData.presensi.length + filteredData.perkembangan.length;
    const hadirRate = total ? (counts.Hadir / total) * 100 : 0;
    const izinRate = total ? (counts.Izin / total) * 100 : 0;
    const sakitRate = total ? (counts.Sakit / total) * 100 : 0;
    const alphaRate = total ? (counts.Alpha / total) * 100 : 0;
    return { ...counts, total, hadirRate, izinRate, sakitRate, alphaRate };
  }, [filteredData]);

  const sortedPresensi = useMemo(() => {
    if (!filteredData) return [];
    
    // Combine presensi_siswa records with perkembangan kehadiran records
    const combined: Record<string, any>[] = [];
    
    // Add records from presensi_siswa table
    filteredData.presensi.forEach((row) => {
      combined.push({
        ...row,
        Tanggal: row['Tanggal'],
        'Mata Pelajaran': row['Mata Pelajaran'],
        Status: row['Status'],
        source: 'presensi',
      });
    });
    
    // Add records from perkembangan_belajar with kehadiran status
    filteredData.perkembangan.forEach((row) => {
      const kehadiran = (row['kehadiran'] || '').trim();
      if (kehadiran) {
        combined.push({
          ...row,
          Tanggal: row['Tanggal'],
          'Mata Pelajaran': row['Mata Pelajaran'] || row['mata_pelajaran'],
          Status: kehadiran,
          source: 'perkembangan',
        });
      }
    });
    
    return combined.sort((a, b) => {
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
    const penguasaanValues: number[] = [];
    const penjelasanValues: number[] = [];
    const kondisiValues: number[] = [];
    const kehadiranCount: Record<string, number> = {};
    
    filteredData.perkembangan.forEach((row) => {
      // Handle percentage fields (prosen_penguasaan, prosen_penjelasan, prosen_kondisi)
      const penguasaan = parseFloat(row['prosen_penguasaan'] || row['Penguasaan'] || '0');
      const penjelasan = parseFloat(row['prosen_penjelasan'] || row['Penjelasan'] || '0');
      const kondisi = parseFloat(row['prosen_kondisi'] || row['Kondisi'] || '0');
      
      if (penguasaan > 0) penguasaanValues.push(penguasaan);
      if (penjelasan > 0) penjelasanValues.push(penjelasan);
      if (kondisi > 0) kondisiValues.push(kondisi);
      
      // Handle attendance
      const kehadiran = (row['kehadiran'] || '').trim();
      if (kehadiran) kehadiranCount[kehadiran] = (kehadiranCount[kehadiran] || 0) + 1;
    });
    
    return {
      total: filteredData.perkembangan.length,
      penguasaanAvg: penguasaanValues.length > 0 ? average(penguasaanValues) : 0,
      penjelasanAvg: penjelasanValues.length > 0 ? average(penjelasanValues) : 0,
      kondisiAvg: kondisiValues.length > 0 ? average(kondisiValues) : 0,
      kehadiranCount,
    };
  }, [filteredData]);

  const nilaiSummary = useMemo(() => {
    if (!filteredData) return null;
    const result = Object.entries(filteredData.nilai)
      .filter(([label]) => label === 'Standar' || label === 'Evaluasi')
      .map(([label, items]) => {
        const totalValues = items.map((row) => parseFloat(row['Total'] || '')).filter((v) => !Number.isNaN(v));
        const rerataValues = items.map((row) => parseFloat(row['Rerata'] || '')).filter((v) => !Number.isNaN(v));
        const nilaiValues = items
          .map((row) => {
            const val = row['nilai'] ?? row['Nilai'] ?? row['Rerata'] ?? '';
            return parseFloat(String(val || ''));
          })
          .filter((v) => !Number.isNaN(v));
        const sortedByDate = [...items].sort((a, b) => {
          const da = parseDateValue(a['Tanggal'] || '')?.getTime() || 0;
          const db = parseDateValue(b['Tanggal'] || '')?.getTime() || 0;
          return db - da;
        });
        const latest = sortedByDate[0];
        const previous = sortedByDate[1];
        const isEvaluasi = label === 'Evaluasi';
        // prefer 'nilai' column per provided schema
        const latestScore = parseFloat((latest?.['nilai'] || latest?.['Nilai'] || latest?.['Rerata'] || '') as any || '');
        const previousScore = parseFloat((previous?.['nilai'] || previous?.['Nilai'] || previous?.['Rerata'] || '') as any || '');
        const delta =
          !Number.isNaN(latestScore) && !Number.isNaN(previousScore)
            ? latestScore - previousScore
            : null;
        return {
          label,
          count: items.length,
          avgTotal: average(totalValues),
          avgRerata: average(rerataValues),
          avgNilai: average(nilaiValues),
          latest,
          previous,
          delta,
          isEvaluasi,
        };
      })
      .filter((item) => item.count > 0);
    return result;
  }, [filteredData]);

  const nilaiCounts = useMemo(() => {
    if (!filteredData) return { Standar: 0, Evaluasi: 0 };
    return {
      Standar: (filteredData.nilai?.Standar || []).length,
      Evaluasi: (filteredData.nilai?.Evaluasi || []).length,
      SNBT: (filteredData.nilai?.['SNBT-UTBK'] || []).length,
    };
  }, [filteredData]);

  const snbtSummary = useMemo(() => {
    if (!filteredData) return null;
    const rows = filteredData.nilai?.['SNBT-UTBK'] || [];
    const rerataVals = rows.map((r) => parseFloat(String(r['rerata'] ?? r['Rerata'] ?? r['Rerata'] ?? ''))).filter((v) => !Number.isNaN(v));
    const totalVals = rows.map((r) => parseFloat(String(r['total'] ?? r['Total'] ?? r['total'] ?? ''))).filter((v) => !Number.isNaN(v));
    return {
      total: rows.length,
      avgRerata: average(rerataVals),
      avgTotal: average(totalVals),
      rows: [...rows].sort((a, b) => {
        const da = parseDateValue(a['Tanggal'] || a['tanggal'] || '')?.getTime() || 0;
        const db = parseDateValue(b['Tanggal'] || b['tanggal'] || '')?.getTime() || 0;
        return db - da;
      }),
    };
  }, [filteredData]);

  const sortedNilaiRows = useMemo(() => {
    if (!filteredData) return [] as { label: string; row: Record<string, string>; dateValue: number }[];
    const combined: { label: string; row: Record<string, string>; dateValue: number }[] = [];
    Object.entries(filteredData.nilai)
      .filter(([label]) => label === 'Standar' || label === 'Evaluasi')
      .forEach(([label, rows]) => {
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

    // Build list of session timestamps
    const timestamps: number[] = [];
    filteredData.pelayanan.forEach((row) => {
      const date = parseDateValue(row['Tanggal'] || '');
      if (date) timestamps.push(date.getTime());
    });
    timestamps.sort((a, b) => a - b);

    // Sliding 7-day window: check if there are >=3 sessions within any 7-day period
    let isAktif = false;
    for (let i = 0; i < timestamps.length; i++) {
      const start = timestamps[i];
      const endWindow = start + 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      // find rightmost index within window
      let j = i;
      while (j + 1 < timestamps.length && timestamps[j + 1] < endWindow) j++;
      const count = j - i + 1;
      if (count >= 3) {
        isAktif = true;
        break;
      }
    }

    // Also generate weekly counts (calendar week) for display/debug if needed
    const weeklyCount: Record<string, number> = {};
    filteredData.pelayanan.forEach((row) => {
      const date = parseDateValue(row['Tanggal'] || '');
      if (date) {
        const firstDay = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
        const yearWeek = `${date.getFullYear()}-${weekNum}`;
        weeklyCount[yearWeek] = (weeklyCount[yearWeek] || 0) + 1;
      }
    });

    return {
      total: filteredData.pelayanan.length,
      avgDurasi: average(durasiValues),
      perMapel,
      isAktif,
      weeklyCount,
    };
  }, [filteredData]);

  const presensiChartItems = useMemo(() => {
    if (!presensiSummary) return [];
    return [
      { name: 'Hadir', value: presensiSummary.Hadir },
      { name: 'Izin', value: presensiSummary.Izin },
      { name: 'Sakit', value: presensiSummary.Sakit },
      { name: 'Alpha', value: presensiSummary.Alpha },
    ];
  }, [presensiSummary]);

  const presensiTrendData = useMemo(() => {
    if (!filteredData) return [];
    const grouped: Record<string, { Hadir: number; Izin: number; Sakit: number; Alpha: number }> = {};
    
    // Add trend from presensi_siswa
    filteredData.presensi.forEach((row) => {
      const dateStr = formatDate(row['Tanggal'] || '');
      if (!grouped[dateStr]) {
        grouped[dateStr] = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
      }
      const status = (row['Status'] || '').trim();
      if (status === 'Hadir' || status === 'Izin' || status === 'Sakit' || status === 'Alpha') {
        grouped[dateStr][status] += 1;
      }
    });
    
    // Add trend from perkembangan_belajar kehadiran
    filteredData.perkembangan.forEach((row) => {
      const dateStr = formatDate(row['Tanggal'] || '');
      if (!grouped[dateStr]) {
        grouped[dateStr] = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
      }
      const kehadiran = (row['kehadiran'] || '').trim();
      if (kehadiran === 'Hadir' || kehadiran === 'Izin' || kehadiran === 'Sakit' || kehadiran === 'Alpha') {
        grouped[dateStr][kehadiran] += 1;
      }
    });
    
    return Object.entries(grouped)
      .map(([date, data]) => ({
        name: date.split(' ')[0],
        ...data,
      }))
      .reverse()
      .slice(0, 30);
  }, [filteredData]);

  const perkembanganChartItems = useMemo(() => {
    const empty = {
      penguasaan: [] as { label: string; value: number }[],
      penjelasan: [] as { label: string; value: number }[],
      kondisi: [] as { label: string; value: number }[],
      kehadiran: [] as { label: string; value: number }[],
    };
    if (!perkembanganSummary) {
      return empty;
    }

    return {
      penguasaan: [{ label: 'Rata-rata', value: Math.round(perkembanganSummary.penguasaanAvg) }],
      penjelasan: [{ label: 'Rata-rata', value: Math.round(perkembanganSummary.penjelasanAvg) }],
      kondisi: [{ label: 'Rata-rata', value: Math.round(perkembanganSummary.kondisiAvg) }],
      kehadiran: Object.entries(perkembanganSummary.kehadiranCount).map(([label, value]) => ({ label, value })),
    };
  }, [perkembanganSummary]);

  // Rata-rata nilai per mata pelajaran
  const nilaiBySubjectAverage = useMemo(() => {
    if (!filteredData) return [];
    
    const bySubject: Record<string, { values: number[]; label: string }> = {};
    
    Object.entries(filteredData.nilai).forEach(([jenisTes, rows]) => {
      if (!rows) return;
      
      rows.forEach((row) => {
        // Coba ambil mata pelajaran dari berbagai field yang mungkin
        let mapel = (row['Mata Pelajaran'] || '').trim();
        if (!mapel) {
          mapel = (row['Mapel'] || '').trim();
        }
        if (!mapel) {
          mapel = (row['Subjek'] || '').trim();
        }
        if (!mapel) {
          mapel = (row['Tes'] || '').trim();
        }
        if (!mapel) {
          mapel = (row['Jenis Tes'] || '').trim();
        }
        
        const tes = (row['Tes'] || '').trim();
        
        if (!mapel) {
          mapel = jenisTes;
        }
        if (!mapel) return;
        
        // Buat key yang lebih unik dengan menggabungkan mapel dan tes jika tersedia
        let key = mapel;
        if (tes && tes !== mapel) {
          key = `${mapel} - ${tes}`;
        }
        
        const nilai = parseFloat(row['nilai'] ?? row['Nilai'] ?? row['Rerata'] ?? '0');
        
        if (!Number.isNaN(nilai) && nilai > 0) {
          if (!bySubject[key]) {
            bySubject[key] = { values: [], label: key };
          }
          bySubject[key].values.push(nilai);
        }
      });
    });
    
    return Object.entries(bySubject)
      .map(([, data]) => ({
        name: data.label,
        value: parseFloat((data.values.reduce((a, b) => a + b, 0) / data.values.length).toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const pelayananChartItems = useMemo(() => {
    if (!filteredData) return [];
    const counts: Record<string, number> = {};
    filteredData.pelayanan.forEach((row) => {
      const mapel = (row['Mata Pelajaran'] || 'Lainnya').trim() || 'Lainnya';
      counts[mapel] = (counts[mapel] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [filteredData]);

  // Analisis per mata pelajaran
  const subjectAnalysis = useMemo(() => {
    if (!filteredData) return [];

    // Collect all subjects dari perkembangan_belajar primarily
    const subjectsSet = new Set<string>();
    filteredData.perkembangan.forEach((row) => {
      const mapel = (row['Mata Pelajaran'] || row['mata_pelajaran'] || '').trim();
      if (mapel) subjectsSet.add(mapel);
    });
    filteredData.catatan.forEach((row) => {
      const mapel = (row['mata_pelajaran'] || row['Mata Pelajaran'] || '').trim();
      if (mapel) subjectsSet.add(mapel);
    });

    const analysis: Record<
      string,
      {
        totalNotes: number;
        avgPenguasaan: number;
        avgPenjelasan: number;
        avgKondisi: number;
        avgPresentasi: number;
        kehadiranCount: Record<string, number>;
        notes: string[];
        scores: number[];
        presentasiValues: number[];
        latestNote?: { text: string; date: Date };
        testScores: number[];
        pelayananSessions: number;
        pelayananDuration: number;
        __penguasaanValues?: number[];
        __penjelasanValues?: number[];
        __kondisiValues?: number[];
      }
    > = {};

    // Initialize untuk setiap mapel
    subjectsSet.forEach((subject) => {
      analysis[subject] = {
        totalNotes: 0,
        avgPenguasaan: 0,
        avgPenjelasan: 0,
        avgKondisi: 0,
        avgPresentasi: 0,
        kehadiranCount: {},
        notes: [],
        scores: [],
        presentasiValues: [],
        testScores: [],
        pelayananSessions: 0,
        pelayananDuration: 0,
        pelayananTimestamps: [],
      };
    });

    // Collect data dari perkembangan_belajar
    filteredData.perkembangan.forEach((row) => {
      const mapel = (row['Mata Pelajaran'] || row['mata_pelajaran'] || '').trim();
      if (mapel && analysis[mapel]) {
        // Collect percentage values
        const penguasaan = parseFloat(row['prosen_penguasaan'] || '0');
        const penjelasan = parseFloat(row['prosen_penjelasan'] || '0');
        const kondisi = parseFloat(row['prosen_kondisi'] || '0');

        if (penguasaan > 0) {
          analysis[mapel].scores.push(penguasaan);
        }

        // Collect kehadiran (attendance)
        const kehadiran = (row['kehadiran'] || '').trim();
        if (kehadiran) {
          analysis[mapel].kehadiranCount[kehadiran] = (analysis[mapel].kehadiranCount[kehadiran] || 0) + 1;
        }

        // Store for later calculation
        if (!analysis[mapel].__penguasaanValues) analysis[mapel].__penguasaanValues = [];
        if (!analysis[mapel].__penjelasanValues) analysis[mapel].__penjelasanValues = [];
        if (!analysis[mapel].__kondisiValues) analysis[mapel].__kondisiValues = [];
        
        if (penguasaan > 0) analysis[mapel].__penguasaanValues.push(penguasaan);
        if (penjelasan > 0) analysis[mapel].__penjelasanValues.push(penjelasan);
        if (kondisi > 0) analysis[mapel].__kondisiValues.push(kondisi);
      }
    });

    // Collect data dari catatan_pembelajaran
    filteredData.catatan.forEach((row) => {
      const mapel = (row['mata_pelajaran'] || row['Mata Pelajaran'] || '').trim();
      if (mapel && analysis[mapel]) {
        analysis[mapel].totalNotes += 1;

        const presentasi = parseFloat(String(row['presentasi'] || row['Presentasi'] || '0').replace(/[^0-9.]/g, ''));
        if (!Number.isNaN(presentasi)) {
          analysis[mapel].presentasiValues.push(presentasi);
        }

        const noteText = (row['catatan'] || row['Catatan'] || '').trim();
        if (noteText) {
          const noteDate = parseDateValue(row['tanggal'] || row['Tanggal'] || '');
          if (noteDate) {
            if (!analysis[mapel].latestNote || noteDate.getTime() > analysis[mapel].latestNote.date.getTime()) {
              analysis[mapel].latestNote = { text: noteText, date: noteDate };
            }
          } else if (!analysis[mapel].latestNote) {
            analysis[mapel].latestNote = { text: noteText, date: new Date(0) };
          }
        }
      }
    });

    // Collect test scores from combined 'Standar' and 'Evaluasi'
    Object.entries(filteredData.nilai).forEach(([label, nilaiArray]) => {
      const isEvaluasi = label === 'Evaluasi';
      const isStandard = label === 'Standar';
      if (!isEvaluasi && !isStandard) return;

      nilaiArray.forEach((row) => {
        const mapel = (row['Mata Pelajaran'] || row['mata_pelajaran'] || '').trim();
        if (mapel && analysis[mapel]) {
          const score = parseFloat(String(row['nilai'] ?? row['Nilai'] ?? row['Rerata'] ?? ''));
          if (!Number.isNaN(score) && score > 0) {
            analysis[mapel].testScores.push(score);
          }
        }
      });
    });

    // Collect pelayanan (jam tambahan) sessions by subject
    filteredData.pelayanan.forEach((row) => {
      const mapel = (row['Mata Pelajaran'] || 'Lainnya').trim() || 'Lainnya';
      if (analysis[mapel]) {
        analysis[mapel].pelayananSessions += 1;
        const durasi = parseFloat((row['Durasi'] || '').replace(/[^0-9.]/g, ''));
        if (!Number.isNaN(durasi)) {
          analysis[mapel].pelayananDuration += durasi;
        }
        const date = parseDateValue(row['Tanggal'] || '');
        if (date) {
          (analysis[mapel].pelayananTimestamps as number[]).push(date.getTime());
        }
      }
    });

    // Calculate averages
    Object.entries(analysis).forEach(([_subject, data]) => {
      const anyData = data as any;
      data.avgPenguasaan = anyData.__penguasaanValues?.length > 0 ? average(anyData.__penguasaanValues) : 0;
      data.avgPenjelasan = anyData.__penjelasanValues?.length > 0 ? average(anyData.__penjelasanValues) : 0;
      data.avgKondisi = anyData.__kondisiValues?.length > 0 ? average(anyData.__kondisiValues) : 0;
      // determine active status per subject: >=3 sessions in any 7-day window
      const ts = (anyData.pelayananTimestamps || []).slice().sort((a: number, b: number) => a - b);
      let isAktif = false;
      for (let i = 0; i < ts.length; i++) {
        const start = ts[i];
        const endWindow = start + 7 * 24 * 60 * 60 * 1000;
        let j = i;
        while (j + 1 < ts.length && ts[j + 1] < endWindow) j++;
        const count = j - i + 1;
        if (count >= 3) { isAktif = true; break; }
      }
      (data as any).isAktif = isAktif;
    });

    // Convert to array dengan sorting
    return Array.from(subjectsSet)
      .map((subject) => {
        const data = analysis[subject];
        const totalKehadiran = Object.values(data.kehadiranCount).reduce((a, b) => a + b, 0);
        const hadirCount = data.kehadiranCount['Hadir'] || 0;
        const hadirRate = totalKehadiran > 0 ? (hadirCount / totalKehadiran) * 100 : 0;

        return {
          subject,
          totalNotes: data.totalNotes,
          avgPenguasaan: data.avgPenguasaan,
          avgPenjelasan: data.avgPenjelasan,
          avgKondisi: data.avgKondisi,
          avgPresentasi: data.presentasiValues.length > 0 ? average(data.presentasiValues) : 0,
          kehadiranCount: data.kehadiranCount,
          hadirRate,
          notes: data.latestNote ? [data.latestNote.text] : [],
          lastNoteDate: data.latestNote ? formatDateDmy(data.latestNote.date) : '',
          avgScore: data.scores.length > 0 ? average(data.scores) : 0,
          avgTestScore: data.testScores.length > 0 ? average(data.testScores) : 0,
          pelayananSessions: data.pelayananSessions,
          pelayananDuration: data.pelayananDuration,
          // Legacy fields for compatibility
          masteryLevels: {},
          focusLevels: {},
          conditions: {},
          presensiData: { hadir: hadirCount, total: totalKehadiran },
        };
      })
      .sort((a, b) => {
        // Sort by average test score (Standar + Evaluasi) descending
        return b.avgTestScore - a.avgTestScore;
      });
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
          {(loading || refreshing) && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-blue-600">
              <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              Memuat data...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Memuat...' : 'Refresh'}
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
          {/* Header & Biodata Combined */}
          <section className="bg-white border border-gray-200 rounded-2xl shadow-sm print-page print-reset-shadow overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <h1 className="text-2xl font-bold mb-1">LAPORAN PERKEMBANGAN BELAJAR</h1>
                  <p className="text-blue-100 text-sm mb-3">Siswa LPS Semarang - Kendal</p>
                  <div className="space-y-1 text-xs">
                    <p className="flex items-center gap-2">
                      <User size={14} />
                      <span><strong>Nama:</strong> {selectedStudentData['Nama'] || '-'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <ClipboardCheck size={14} />
                      <span><strong>NIS:</strong> {selectedStudentData['Nis'] || '-'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span><strong>Jenjang:</strong> {selectedStudentData['Jenjang Studi'] || '-'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col justify-between space-y-2">
                  <div className="bg-white/20 rounded-lg p-3">
                    <p className="text-blue-100 text-xs">Periode Laporan</p>
                    <p className="text-sm font-semibold">
                      {startDate ? formatDate(startDate) : '-'} <br /> s/d <br /> {endDate ? formatDate(endDate) : '-'}
                    </p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3">
                    <p className="text-blue-100 text-xs">Tanggal Cetak</p>
                    <p className="text-sm font-semibold">{formatDateDmy(new Date())}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Biodata Section */}
            <div className="p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-4">
                <User size={18} className="text-blue-600" />
                <h2 className="text-lg font-bold text-gray-800">Data Siswa</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'NIS', value: selectedStudentData['Nis'] },
                  { label: 'NAMA', value: selectedStudentData['Nama'] },
                  { label: 'TANGGAL LAHIR', value: formatDate(selectedStudentData['Tanggal Lahir'] || '') },
                  { label: 'ASAL SEKOLAH', value: selectedStudentData['Asal Sekolah'] },
                  { label: 'JENJANG STUDI', value: selectedStudentData['Jenjang Studi'] },
                  { label: 'TELEPON', value: selectedStudentData['Tlpn'] },
                  { label: 'EMAIL', value: selectedStudentData['Email'] },
                  { label: 'KELOMPOK KELAS', value: selectedStudentData['Kelompok Kelas'] },
                  { label: 'CABANG', value: selectedStudentData['Cabang'] },
                ].map((item) => (
                  <div key={item.label} className="bg-white border border-gray-200 rounded p-3">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{item.value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          

          

          {/* Presensi */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow">
            <div className="flex items-center gap-2 mb-6">
              <ClipboardCheck size={20} className="text-emerald-600" />
              <h2 className="text-xl font-bold text-gray-800">Presensi Siswa</h2>
            </div>

            {/* KPI Cards */}
            {presensiSummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                <MetricCard
                  title="Total Kehadiran"
                  value={presensiSummary.total}
                  color="blue"
                  progress={100}
                />
                <MetricCard
                  title="Hadir"
                  value={presensiSummary.Hadir}
                  subtitle={`${Math.round(presensiSummary.hadirRate)}%`}
                  color="emerald"
                  progress={presensiSummary.hadirRate}
                />
                <MetricCard
                  title="Izin"
                  value={presensiSummary.Izin}
                  subtitle={`${Math.round(presensiSummary.izinRate)}%`}
                  color="amber"
                  progress={presensiSummary.izinRate}
                />
                <MetricCard
                  title="Sakit"
                  value={presensiSummary.Sakit}
                  subtitle={`${Math.round(presensiSummary.sakitRate)}%`}
                  color="rose"
                  progress={presensiSummary.sakitRate}
                />
                <MetricCard
                  title="Alpha"
                  value={presensiSummary.Alpha}
                  subtitle={`${Math.round(presensiSummary.alphaRate)}%`}
                  color="red"
                  progress={presensiSummary.alphaRate}
                />
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1">
                <PieChartComponent
                  title="Distribusi Presensi"
                  data={presensiChartItems}
                  dataKey="value"
                />
              </div>
              <div className="lg:col-span-2">
                <LineChartComponent
                  title="Tren Tingkat Kehadiran (30 Hari Terakhir)"
                  data={presensiTrendData}
                  dataKeys={[
                    { key: 'Hadir', color: '#10b981', label: 'Hadir' },
                    { key: 'Izin', color: '#f59e0b', label: 'Izin' },
                    { key: 'Sakit', color: '#ec4899', label: 'Sakit' },
                    { key: 'Alpha', color: '#ef4444', label: 'Alpha' },
                  ]}
                />
              </div>
            </div>

            {/* Data Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Mata Pelajaran</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPresensi.slice(0, 15).map((row, idx) => {
                    const statusKey = (row['Status'] || '').trim() as 'Hadir' | 'Izin' | 'Sakit' | 'Alpha' | '';
                    const statusColorMap: Record<string, string> = {
                      'Hadir': 'bg-emerald-50 text-emerald-700',
                      'Izin': 'bg-amber-50 text-amber-700',
                      'Sakit': 'bg-pink-50 text-pink-700',
                      'Alpha': 'bg-red-50 text-red-700',
                    };
                    const statusColor = statusColorMap[statusKey] || 'bg-gray-50 text-gray-700';
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{formatDate(row['Tanggal'] || '')}</td>
                        <td className="px-4 py-3 text-gray-600">{row['Mata Pelajaran'] || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {row['Status'] || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.presensi.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                        Tidak ada data presensi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Perkembangan */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={20} className="text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-800">Perkembangan Belajar</h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <MetricCard
                title="Total Catatan"
                value={perkembanganSummary?.total || 0}
                color="indigo"
                icon={Target}
              />
              <MetricCard
                title="Rata-rata Penguasaan"
                value={`${Math.round(perkembanganSummary?.penguasaanAvg || 0)}%`}
                subtitle="materi"
                color="purple"
              />
              <MetricCard
                title="Rata-rata Penjelasan"
                value={`${Math.round(perkembanganSummary?.penjelasanAvg || 0)}%`}
                subtitle="fokus"
                color="blue"
              />
              <MetricCard
                title="Rata-rata Kondisi"
                value={`${Math.round(perkembanganSummary?.kondisiAvg || 0)}%`}
                subtitle="keaktifan"
                color="emerald"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-lg transition-shadow print-reset-shadow overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-indigo-600 rounded-full" />
                    Perkembangan Penguasaan Materi
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {perkembanganSummary ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">Rata-rata Penguasaan</p>
                            <p className="text-lg font-bold text-purple-600">{Math.round(perkembanganSummary.penguasaanAvg)}%</p>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all"
                              style={{ width: `${Math.min(perkembanganSummary.penguasaanAvg, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">Rata-rata Penjelasan</p>
                            <p className="text-lg font-bold text-blue-600">{Math.round(perkembanganSummary.penjelasanAvg)}%</p>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 transition-all"
                              style={{ width: `${Math.min(perkembanganSummary.penjelasanAvg, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">Rata-rata Kondisi</p>
                            <p className="text-lg font-bold text-emerald-600">{Math.round(perkembanganSummary.kondisiAvg)}%</p>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                              style={{ width: `${Math.min(perkembanganSummary.kondisiAvg, 100)}%` }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-400 text-center">Belum ada data</p>
                    )}
                  </div>
                </div>
              </div>
              
              {perkembanganChartItems.kehadiran.length > 0 && (
                <PieChartComponent
                  title="Distribusi Kehadiran Pembelajaran"
                  data={perkembanganChartItems.kehadiran}
                  dataKey="value"
                />
              )}
            </div>

            {/* Data Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Mapel</th>
                    <th className="px-4 py-3 text-left">Materi/Sub-bab</th>
                    <th className="px-4 py-3 text-center">Kehadiran</th>
                    <th className="px-4 py-3 text-center">Penguasaan</th>
                    <th className="px-4 py-3 text-center">Penjelasan</th>
                    <th className="px-4 py-3 text-center">Kondisi</th>
                    <th className="px-4 py-3 text-left">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPerkembangan.slice(0, 20).map((row, idx) => {
                    const kehadiran = (row['kehadiran'] || '').trim();
                    const penguasaan = parseFloat(row['prosen_penguasaan'] || row['Penguasaan'] || '0');
                    const penjelasan = parseFloat(row['prosen_penjelasan'] || row['Penjelasan'] || '0');
                    const kondisi = parseFloat(row['prosen_kondisi'] || row['Kondisi'] || '0');
                    const catatan = (row['catatan_pengajar'] || '').trim();
                    
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(row['Tanggal'] || '')}</td>
                        <td className="px-4 py-3 text-gray-600">{row['Mata Pelajaran'] || row['mata_pelajaran'] || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{row['Materi'] || row['materi_sub_bab'] || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          {kehadiran ? (
                            (() => {
                              const kehadiranColorMap: Record<string, string> = {
                                'Hadir': 'bg-emerald-50 text-emerald-700',
                                'Izin': 'bg-amber-50 text-amber-700',
                                'Sakit': 'bg-pink-50 text-pink-700',
                                'Alpha': 'bg-red-50 text-red-700',
                              };
                              const badgeClass = kehadiranColorMap[kehadiran] || 'bg-gray-50 text-gray-700';
                              return (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                                  {kehadiran}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {penguasaan > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                              {penguasaan}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {penjelasan > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {penjelasan}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {kondisi > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                              {kondisi}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">{catatan || '-'}</td>
                      </tr>
                    );
                  })}
                  {filteredData.perkembangan.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-center text-gray-400">
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
            <div className="flex items-center gap-2 mb-6">
              <Award size={20} className="text-amber-600" />
              <h2 className="text-xl font-bold text-gray-800">Nilai Tes Standar & Tes Evaluasi</h2>
            </div>

          {/* Nilai SNBT-UTBK */}
          {(snbtSummary?.rows || []).length > 0 && (
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow">
            <div className="flex items-center gap-2 mb-6">
              <Award size={20} className="text-amber-600" />
              <h2 className="text-xl font-bold text-gray-800">Nilai SNBT-UTBK</h2>
            </div>

            {/* Summary Cards */}
            {snbtSummary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <MetricCard title="Total Tes" value={snbtSummary.total} color="purple" />
                <MetricCard title="Rata-rata Rerata" value={`${Math.round(snbtSummary.avgRerata * 10) / 10}%`} color="blue" />
                <MetricCard title="Rata-rata Total" value={`${Math.round(snbtSummary.avgTotal * 10) / 10}`} color="emerald" />
              </div>
            )}

            {/* Data Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Nis</th>
                    <th className="px-4 py-3 text-left">Nama</th>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Jenis Tes</th>
                    <th className="px-4 py-3 text-left">Mata Pelajaran</th>
                    <th className="px-4 py-3 text-right">PU</th>
                    <th className="px-4 py-3 text-right">PPU</th>
                    <th className="px-4 py-3 text-right">PBM</th>
                    <th className="px-4 py-3 text-right">PK</th>
                    <th className="px-4 py-3 text-right">LIB</th>
                    <th className="px-4 py-3 text-right">LING</th>
                    <th className="px-4 py-3 text-right">PM</th>
                    <th className="px-4 py-3 text-right">Rerata</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(snbtSummary?.rows || []).slice(0, 30).map((row, idx) => {
                    const nis = row['Nis'] ?? row['nis'] ?? '';
                    const nama = row['Nama'] ?? row['nama'] ?? '';
                    const tanggal = formatDate(row['Tanggal'] || row['tanggal'] || '');
                    const jenisTes = row['jenis_tes'] ?? row['Jenis Tes'] ?? '';
                    const mapel = row['mata_pelajaran'] ?? row['Mata Pelajaran'] ?? '';
                    const pu = parseFloat(String(row['pu'] ?? row['Pu'] ?? '')) || 0;
                    const ppu = parseFloat(String(row['ppu'] ?? row['Ppu'] ?? '')) || 0;
                    const pbm = parseFloat(String(row['pbm'] ?? row['Pbm'] ?? '')) || 0;
                    const pk = parseFloat(String(row['pk'] ?? row['Pk'] ?? '')) || 0;
                    const lib = parseFloat(String(row['lib'] ?? row['Lib'] ?? '')) || 0;
                    const ling = parseFloat(String(row['ling'] ?? row['Ling'] ?? '')) || 0;
                    const pm = parseFloat(String(row['pm'] ?? row['Pm'] ?? '')) || 0;
                    const rerata = parseFloat(String(row['rerata'] ?? row['Rerata'] ?? '')) || 0;
                    const total = parseFloat(String(row['total'] ?? row['Total'] ?? '')) || 0;

                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{nis || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{nama || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{tanggal}</td>
                        <td className="px-4 py-3 text-gray-600">{jenisTes || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{mapel || '-'}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(String(pu || '-'))}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(String(ppu || '-'))}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(String(pbm || '-'))}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(String(pk || '-'))}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(String(lib || '-'))}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(String(ling || '-'))}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(String(pm || '-'))}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(String(rerata || '-'))}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(String(total || '-'))}</td>
                      </tr>
                    );
                  })}
                  {(snbtSummary?.rows || []).length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-4 py-4 text-center text-gray-400">Tidak ada data SNBT-UTBK.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}

            {/* Summary Cards */}
            {(nilaiSummary || []).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                {(nilaiSummary || []).map((item) => (
                  <MetricCard
                    key={item.label}
                    title={item.label}
                    value={formatNumber((item.avgNilai || item.avgRerata || 0).toFixed(1))}
                    subtitle={`${item.count} tes`}
                    color="amber"
                    progress={((item.avgNilai || item.avgRerata || 0) / 100) * 100}
                  />
                ))}
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <BarChartComponent
                  title="Rata-rata Nilai per Jenis Tes"
                  data={
                    (nilaiSummary || []).map((item) => ({
                      name: item.label,
                      value: parseFloat((item.avgNilai || item.avgRerata || 0).toFixed(2)),
                    }))
                  }
                  dataKey="value"
                />
              <BarChartComponent
                title="Rata-rata Nilai per Mata Pelajaran"
                data={nilaiBySubjectAverage}
                dataKey="value"
              />
            </div>

            {/* Diagnostic counts for Standar vs Evaluasi */}
            <div className="mb-4 text-sm text-gray-600">
              <p>Jumlah entri Nilai Standar: <strong>{nilaiCounts.Standar}</strong></p>
              <p>Jumlah entri Nilai Evaluasi: <strong>{nilaiCounts.Evaluasi}</strong></p>
            </div>

            {/* Data Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Nis</th>
                    <th className="px-4 py-3 text-left">Nama</th>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Jenis Tes</th>
                    <th className="px-4 py-3 text-left">Mata Pelajaran</th>
                    <th className="px-4 py-3 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedNilaiRows.slice(0, 15).map((item, idx) => {
                    const row = item.row || {};
                    const nis = row['Nis'] ?? row['nis'] ?? '';
                    const nama = row['Nama'] ?? row['nama'] ?? '';
                    const tanggal = formatDate(row['Tanggal'] || row['tanggal'] || '');
                    const jenisTes = (row['jenis_tes'] || row['Jenis Tes'] || item.label || '').trim();
                    const mapel = row['mata_pelajaran'] ?? row['Mata Pelajaran'] ?? row['Tes'] ?? '';
                    const nilaiVal = parseFloat(String(row['nilai'] ?? row['Nilai'] ?? row['Rerata'] ?? '')) || 0;
                    let badgeColor = 'bg-red-50 text-red-700';
                    if (nilaiVal >= 85) badgeColor = 'bg-emerald-50 text-emerald-700';
                    else if (nilaiVal >= 70) badgeColor = 'bg-amber-50 text-amber-700';
                    else if (nilaiVal >= 60) badgeColor = 'bg-blue-50 text-blue-700';

                    return (
                      <tr key={`${item.label}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600">{nis || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{nama || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{tanggal}</td>
                        <td className="px-4 py-3 text-gray-600">{jenisTes || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{mapel || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                            {formatNumber(String(nilaiVal || '-'))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedNilaiRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-center text-gray-400">
                        Tidak ada data nilai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pelayanan */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-reset-shadow">
            <div className="flex items-center gap-2 mb-6">
              <Clock size={20} className="text-rose-600" />
              <h2 className="text-xl font-bold text-gray-800">Pelayanan (jam tambahan di luar kelas)</h2>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
              <MetricCard
                title="Total Sesi"
                value={pelayananSummary?.total || 0}
                color="rose"
                icon={Zap}
              />
              <MetricCard
                title="Rata-rata Durasi"
                value={`${formatNumber(pelayananSummary?.avgDurasi.toFixed(1) || '0')} min`}
                subtitle="per sesi"
                color="indigo"
              />
              <MetricCard
                title="Mata Pelajaran"
                value={Object.keys(pelayananSummary?.perMapel || {}).length}
                subtitle="berbeda"
                color="amber"
              />
              <MetricCard
                title="Status"
                value={pelayananSummary?.isAktif ? 'Aktif' : 'Belum'}
                subtitle={pelayananSummary?.isAktif ? '3+ sesi/minggu' : 'kurang sesi'}
                color={pelayananSummary?.isAktif ? 'emerald' : 'blue'}
                icon={pelayananSummary?.isAktif ? CheckCircle2 : AlertCircle}
              />
            </div>

            {/* Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <BarChartComponent
                title="Sesi Jam Tambahan per Mata Pelajaran"
                data={pelayananChartItems}
                dataKey="value"
              />
              <PieChartComponent
                title="Distribusi Durasi per Mapel"
                data={
                  pelayananSummary?.perMapel
                    ? Object.entries(pelayananSummary.perMapel).map(([mapel, info]) => ({
                        name: mapel,
                        value: Math.round(info.durasiTotal),
                      }))
                    : []
                }
                dataKey="value"
              />
            </div>

            {/* Summary Box */}
            {pelayananSummary && (pelayananSummary.total > 0) && (
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-gray-800 mb-3">Rincian per Mata Pelajaran</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(pelayananSummary.perMapel).map(([mapel, info]) => (
                    <div key={mapel} className="bg-white rounded-lg p-3 border border-rose-100">
                      <p className="text-sm font-semibold text-gray-700">{mapel}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{info.sesi} sesi •</span>
                        <span className="text-xs font-medium text-rose-600">{formatNumber(info.durasiTotal.toFixed(0))} menit</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Mapel</th>
                    <th className="px-4 py-3 text-left">Pengajar</th>
                    <th className="px-4 py-3 text-right">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedPelayanan.slice(0, 15).map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{formatDate(row['Tanggal'] || '')}</td>
                      <td className="px-4 py-3 text-gray-600">{row['Mata Pelajaran'] || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{row['Pengajar'] || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                          {row['Durasi'] || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredData.pelayanan.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                        Tidak ada data pelayanan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Analisis Per Mata Pelajaran */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen size={20} className="text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">Analisis Per Mata Pelajaran</h2>
            </div>

            {subjectAnalysis && subjectAnalysis.length > 0 ? (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  <MetricCard
                    title="Total Mapel"
                    value={subjectAnalysis.length}
                    subtitle="mata pelajaran"
                    color="purple"
                  />
                  <MetricCard
                    title="Rata-rata Nilai"
                    value={
                      (() => {
                        const scores = subjectAnalysis.map((s) => s.avgTestScore).filter((v) => v > 0);
                        if (scores.length === 0) return '0';
                        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                        return avg.toFixed(1);
                      })()
                    }
                    color="blue"
                  />
                  <MetricCard
                    title="Mapel Terbaik"
                    value={subjectAnalysis[0]?.subject || '-'}
                    subtitle={subjectAnalysis[0]?.avgTestScore ? `${subjectAnalysis[0].avgTestScore.toFixed(1)}` : '-'}
                    color="emerald"
                  />
                  <MetricCard
                    title="Total Catatan"
                    value={subjectAnalysis.reduce((sum, s) => sum + s.totalNotes, 0)}
                    subtitle="pembelajaran"
                    color="amber"
                  />
                </div>

                {/* Detail Cards per Mapel */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', pageBreakInside: 'avoid' }} className="print-reset-shadow">
                  {subjectAnalysis.map((subject) => (
                    <div key={subject.subject} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      <SubjectAnalysisCard
                        subject={subject.subject}
                        data={{
                          totalNotes: subject.totalNotes,
                          avgPenguasaan: subject.avgPenguasaan,
                          avgPenjelasan: subject.avgPenjelasan,
                          avgKondisi: subject.avgKondisi,
                          avgPresentasi: subject.avgPresentasi,
                          lastNoteDate: subject.lastNoteDate || '',
                          hadirRate: subject.hadirRate,
                          notes: subject.notes,
                          avgScore: subject.avgScore,
                          avgTestScore: subject.avgTestScore,
                          pelayananSessions: subject.pelayananSessions,
                          pelayananDuration: subject.pelayananDuration,
                          presensiData: subject.presensiData,
                          masteryLevels: subject.masteryLevels,
                          focusLevels: subject.focusLevels,
                          conditions: subject.conditions,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Belum ada data analisis per mata pelajaran</p>
              </div>
            )}
          </section>

          {/* Catatan Pembelajaran per Mata Pelajaran */}
          <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm print-page print-reset-shadow mt-6">
            <div className="flex items-center gap-2 mb-6">
              <BookOpen size={20} className="text-teal-600" />
              <h2 className="text-xl font-bold text-gray-800">Catatan Pembelajaran per Mata Pelajaran</h2>
            </div>

            {catatanBySubject && Object.keys(catatanBySubject).length > 0 ? (
              <div className="space-y-4">
                {(subjectAnalysis && subjectAnalysis.length > 0
                  ? subjectAnalysis.map((s) => s.subject)
                  : Object.keys(catatanBySubject)
                ).map((subject) => {
                  const notes = catatanBySubject[subject] || [];
                  if (!notes || notes.length === 0) return null;
                  const sorted = [...notes].sort((a, b) => {
                    const da = parseDateValue(a['tanggal'] || a['Tanggal'] || '')?.getTime() || 0;
                    const db = parseDateValue(b['tanggal'] || b['Tanggal'] || '')?.getTime() || 0;
                    return db - da;
                  });
                  return (
                    <div key={subject} className="p-4 border rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">{subject}</h3>
                      <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                        {sorted.map((row, idx) => (
                          <li key={idx} className="bg-gray-50 p-2 rounded">
                            <div className="text-xs text-gray-500">{formatDate(row['tanggal'] || row['Tanggal'] || '')} • {row['pengajar'] || row['Pengajar'] || '-'}</div>
                            <div className="mt-1 text-gray-800">{(row['catatan'] || row['Catatan'] || '').trim() || '-'}</div>
                            {((row['presentasi'] || row['Presentasi']) && String(row['presentasi'] || row['Presentasi']).trim() !== '') && (
                              <div className="mt-1 text-xs text-gray-600">Berapa Presentasi menurutnya: {String(row['presentasi'] || row['Presentasi']).trim()}%</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Belum ada catatan pembelajaran untuk siswa ini</p>
              </div>
            )}
          </section>

          {/* Analisa & Kesimpulan */}
          <section className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-8 text-white shadow-lg print-page print-reset-shadow">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 size={24} />
              Analisa & Kesimpulan
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Presensi Analysis */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardCheck size={18} className="text-emerald-400" />
                  <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide">Analisa Kehadiran</p>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Total Kehadiran:</strong> {presensiSummary?.total || 0} kali
                  </p>
                  <p>
                    <strong className="text-white">Tingkat Kehadiran:</strong>{' '}
                    {presensiSummary?.total
                      ? Math.round((presensiSummary.hadirRate || 0)) + '%'
                      : '0%'}
                  </p>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10 mt-3">
                    <p className="text-xs text-gray-400 mb-2">Breakdown:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <p>✓ Hadir: {presensiSummary?.Hadir} ({Math.round(presensiSummary?.hadirRate || 0)}%)</p>
                      <p>⊘ Izin: {presensiSummary?.Izin} ({Math.round(presensiSummary?.izinRate || 0)}%)</p>
                      <p>◊ Sakit: {presensiSummary?.Sakit} ({Math.round(presensiSummary?.sakitRate || 0)}%)</p>
                      <p>✕ Alpha: {presensiSummary?.Alpha} ({Math.round(presensiSummary?.alphaRate || 0)}%)</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 italic">
                    {presensiSummary && presensiSummary.hadirRate >= 85
                      ? '✓ Kehadiran sangat baik, siswa konsisten dan disiplin'
                      : presensiSummary && presensiSummary.hadirRate >= 70
                      ? '→ Kehadiran cukup baik, perlu ditingkatkan'
                      : '⚠ Kehadiran rendah, perlu perhatian khusus'}
                  </p>
                </div>
              </div>

              {/* Nilai Analysis */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Award size={18} className="text-amber-400" />
                  <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide">Analisa Nilai</p>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  {(nilaiSummary || []).length > 0 ? (
                    (nilaiSummary || []).slice(0, 2).map((item) => {
                      const avgScore = item.avgNilai || item.avgRerata || 0;
                      const status =
                        avgScore >= 85 ? 'Excellent' : avgScore >= 70 ? 'Good' : 'Needs Improvement';
                      return (
                        <div key={item.label}>
                          <p>
                            <strong className="text-white">{item.label}:</strong> {avgScore.toFixed(1)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  avgScore >= 85
                                    ? 'bg-emerald-400'
                                    : avgScore >= 70
                                    ? 'bg-amber-400'
                                    : 'bg-red-400'
                                }`}
                                style={{ width: `${Math.min(avgScore, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{status}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p>Belum ada data nilai pada periode ini.</p>
                  )}
                </div>
              </div>

              {/* Perkembangan Analysis */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={18} className="text-indigo-400" />
                  <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide">Perkembangan Belajar</p>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Total Catatan:</strong> {perkembanganSummary?.total || 0}
                  </p>
                  <p>
                    <strong className="text-white">Rata-rata Penguasaan:</strong>{' '}
                    {perkembanganSummary?.penguasaanAvg.toFixed(1) || '-'}%
                  </p>
                  <p>
                    <strong className="text-white">Rata-rata Penjelasan:</strong>{' '}
                    {perkembanganSummary?.penjelasanAvg.toFixed(1) || '-'}%
                  </p>
                  <p className="text-xs text-gray-400 mt-3 italic">
                    Siswa menunjukkan konsistensi dalam mengikuti pembelajaran dengan catatan berkala.
                  </p>
                </div>
              </div>

              {/* Pelayanan Analysis */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={18} className="text-rose-400" />
                  <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide">Jam Tambahan</p>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Total Sesi:</strong> {pelayananSummary?.total || 0}
                  </p>
                  <p>
                    <strong className="text-white">Durasi Rata-rata:</strong>{' '}
                    {formatNumber(pelayananSummary?.avgDurasi.toFixed(1) || '0')} menit
                  </p>
                  <p>
                    <strong className="text-white">Mapel yang Diambil:</strong>{' '}
                    {Object.keys(pelayananSummary?.perMapel || {}).length}
                  </p>
                  <p className="text-xs text-gray-400 mt-3 italic">
                    {pelayananSummary?.isAktif
                      ? '✓ Siswa aktif mengikuti program jam tambahan (3+ sesi per minggu) untuk pendalaman materi'
                      : pelayananSummary && pelayananSummary.total > 0
                      ? '→ Siswa mengikuti jam tambahan namun kurang konsisten (belum 3+ sesi per minggu)'
                      : '→ Belum ada sesi jam tambahan pada periode ini'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <p className="text-sm font-semibold text-gray-100 uppercase tracking-wide mb-3">Rekomendasi</p>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                  <span>Pertahankan konsistensi kehadiran untuk hasil belajar yang optimal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold mt-0.5">•</span>
                  <span>Manfaatkan program jam tambahan untuk memperkuat pemahaman materi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold mt-0.5">•</span>
                  <span>Tingkatkan partisipasi aktif dalam pembelajaran untuk hasil maksimal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold mt-0.5">•</span>
                  <span>Lakukan komunikasi rutin dengan pendidik untuk monitoring perkembangan</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
