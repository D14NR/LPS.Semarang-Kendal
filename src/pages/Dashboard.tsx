import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ClipboardCheck,
  TrendingUp,
  Award,
  Clock,
  UserCheck,
  RefreshCw,
  CheckCircle,
  ExternalLink,
  Activity,
  MapPin,
  Shield,
  FileText,
} from 'lucide-react';
import { fetchAllData, isAppsScriptConfigured, getSpreadsheetUrl, invalidateCache, type SheetKey } from '../services/googleSheets';
import { useAuth } from '../contexts/AuthContext';

interface StatCard {
  label: string;
  value: number | null; // null = loading
  totalValue?: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  path: string;
  loaded: boolean;
}

const sheetConfigs: { key: SheetKey; label: string; path: string; cabangField: string }[] = [
  { key: 'siswa', label: 'Total Siswa', path: '/siswa', cabangField: 'Cabang' },
  { key: 'presensi', label: 'Data Presensi', path: '/presensi', cabangField: 'Cabang' },
  { key: 'perkembangan', label: 'Perkembangan', path: '/perkembangan', cabangField: 'Cabang' },
  { key: 'nilaiUtbk', label: 'Nilai UTBK', path: '/nilai/utbk', cabangField: 'Cabang' },
  { key: 'nilaiTkaSma', label: 'Nilai TKA SMA', path: '/nilai/tka-sma', cabangField: 'Cabang' },
  { key: 'nilaiTkaSmp', label: 'Nilai TKA SMP', path: '/nilai/tka-smp', cabangField: 'Cabang' },
  { key: 'nilaiTkaSd', label: 'Nilai TKA SD', path: '/nilai/tka-sd', cabangField: 'Cabang' },
  { key: 'nilaiTesStandar', label: 'Nilai Tes Standar', path: '/nilai/tes-standar', cabangField: 'Cabang' },
  { key: 'nilaiEvaluasi', label: 'Nilai Evaluasi', path: '/nilai/evaluasi', cabangField: 'Cabang' },
  { key: 'pelayanan', label: 'Pelayanan', path: '/pelayanan', cabangField: 'Cabang' },
  { key: 'pengajar', label: 'Pengajar', path: '/pengajar', cabangField: '' },
];

const icons = [
  <Users size={24} key="u" />,
  <ClipboardCheck size={24} key="c" />,
  <TrendingUp size={24} key="t" />,
  <Award size={24} key="a0" />,
  <Award size={24} key="a1" />,
  <Award size={24} key="a2" />,
  <Award size={24} key="a3" />,
  <Award size={24} key="a4" />,
  <Award size={24} key="a5" />,
  <Clock size={24} key="cl" />,
  <UserCheck size={24} key="uc" />,
];

const colorsList = [
  { color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-100' },
  { color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-100' },
  { color: 'text-violet-600', bgColor: 'bg-violet-50 border-violet-100' },
  { color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-100' },
  { color: 'text-rose-600', bgColor: 'bg-rose-50 border-rose-100' },
  { color: 'text-cyan-600', bgColor: 'bg-cyan-50 border-cyan-100' },
  { color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-100' },
  { color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-100' },
  { color: 'text-sky-600', bgColor: 'bg-sky-50 border-sky-100' },
  { color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-100' },
  { color: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-100' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<StatCard[]>(() =>
    sheetConfigs.map((cfg, i) => ({
      label: cfg.label,
      value: null,
      icon: icons[i],
      path: cfg.path,
      loaded: false,
      ...colorsList[i],
    }))
  );
  const [refreshing, setRefreshing] = useState(false);
  const apiConfigured = isAppsScriptConfigured();
  const { user } = useAuth();

  // Load each sheet independently - progressive loading
  const loadStat = useCallback(async (index: number, forceRefresh = false) => {
    const cfg = sheetConfigs[index];
    try {
      const allData = await fetchAllData(cfg.key, forceRefresh);
      let filteredData = allData;
      const totalValue = allData.length;

      // Filter by cabang for non-admin users
      if (user && !user.isAdmin && cfg.cabangField) {
        filteredData = allData.filter((row) => {
          const rowCabang = (row[cfg.cabangField] || '').trim().toLowerCase();
          const userCabang = (user.cabang || '').trim().toLowerCase();
          return rowCabang === userCabang;
        });
      }

      setStats(prev => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          value: filteredData.length,
          totalValue: user && !user.isAdmin ? totalValue : undefined,
          loaded: true,
        };
        return next;
      });
    } catch {
      setStats(prev => {
        const next = [...prev];
        next[index] = { ...next[index], value: 0, loaded: true };
        return next;
      });
    }
  }, [user]);

  useEffect(() => {
    // Load all stats in parallel - each updates independently
    sheetConfigs.forEach((_, index) => {
      loadStat(index);
    });
  }, [loadStat]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Reset all to loading state
    setStats(prev => prev.map(s => ({ ...s, value: null, loaded: false })));
    // Invalidate all caches
    invalidateCache();
    // Reload all in parallel
    await Promise.all(sheetConfigs.map((_, index) => loadStat(index, true)));
    setRefreshing(false);
  };

  const allLoaded = stats.every(s => s.loaded);
  const loadedCount = stats.filter(s => s.loaded).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Selamat datang, <span className="font-medium text-gray-700 capitalize">{user?.username}</span>
            {user && !user.isAdmin && (
              <span className="inline-flex items-center gap-1 ml-2 text-blue-600">
                <MapPin size={12} /> {user.cabang}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!allLoaded && (
            <span className="text-xs text-gray-400 animate-pulse">
              Memuat {loadedCount}/{sheetConfigs.length}...
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Menyegarkan...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Role Info Banner */}
      <div
        className={`rounded-2xl border p-4 flex items-center gap-3 ${
          user?.isAdmin
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
        }`}
      >
        {user?.isAdmin ? (
          <>
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Login sebagai Administrator</p>
              <p className="text-xs text-amber-600 mt-0.5">Akses penuh ke semua data dari seluruh cabang.</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-800">Cabang: {user?.cabang}</p>
              <p className="text-xs text-blue-600 mt-0.5">Data yang ditampilkan hanya untuk cabang <strong>{user?.cabang}</strong>.</p>
            </div>
          </>
        )}
      </div>

      {/* API Status */}
      {apiConfigured && (
        <div className="rounded-2xl border p-4 flex items-center gap-3 bg-green-50 border-green-200">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Server Database Terhubung — Mode CRUD Aktif</p>
            <p className="text-xs text-green-600 mt-0.5">Semua operasi Create, Read, Update, Delete terhubung langsung ke server database.</p>
          </div>
          <Activity size={20} className="text-green-400 animate-pulse flex-shrink-0" />
        </div>
      )}

      {/* Stats Cards - Progressive Loading */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Link
            key={i}
            to={stat.path}
            className={`${stat.bgColor} border rounded-2xl p-5 transition-all hover:shadow-md hover:-translate-y-0.5 block group`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                {stat.value !== null ? (
                  <>
                    <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
                    {stat.totalValue !== undefined && stat.totalValue !== stat.value && (
                      <p className="text-xs text-gray-400 mt-1">dari {stat.totalValue} total</p>
                    )}
                  </>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="h-8 w-16 bg-gray-200/60 rounded-lg animate-pulse" />
                  </div>
                )}
              </div>
              <div
                className={`p-3 rounded-xl bg-white/80 shadow-sm ${stat.color} group-hover:scale-110 transition-transform ${
                  !stat.loaded ? 'animate-pulse' : ''
                }`}
              >
                {stat.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Guide */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Menu Aplikasi</h3>
          <div className="space-y-3">
            {[
              { icon: <Users size={16} />, label: 'Data Siswa', desc: 'Kelola data siswa (NIS, nama, sekolah, dll)', path: '/siswa' },
              { icon: <ClipboardCheck size={16} />, label: 'Presensi Siswa', desc: 'Rekap kehadiran siswa', path: '/presensi' },
              { icon: <TrendingUp size={16} />, label: 'Perkembangan Belajar', desc: 'Catat progress belajar siswa', path: '/perkembangan' },
              { icon: <Award size={16} />, label: 'Nilai Siswa', desc: 'UTBK, TKA, Tes Standar & Evaluasi', path: '/nilai/utbk' },
              { icon: <Clock size={16} />, label: 'Pelayanan/Jam Tambahan', desc: 'Catat sesi bimbingan tambahan', path: '/pelayanan' },
              { icon: <UserCheck size={16} />, label: 'Nama Pengajar', desc: 'Data pengajar dan mata pelajaran', path: '/pengajar' },
              { icon: <FileText size={16} />, label: 'Print Rapor Siswa', desc: 'Rekap rapor siswa per periode', path: '/rapor' },
            ].map((item, i) => (
              <Link
                key={i}
                to={item.path}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Spreadsheet Links / Account Info */}
        {user?.isAdmin ? (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-4">🔗 Server Database Terhubung</h3>
            <ul className="space-y-2.5 text-sm text-blue-100">
              {sheetConfigs.map((cfg) => (
                <li key={cfg.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    {cfg.label}
                  </div>
                  <a
                    href={getSpreadsheetUrl(cfg.key)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Buka Spreadsheet"
                  >
                    <ExternalLink size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-lg font-semibold mb-4">ℹ️ Informasi Akun</h3>
            <div className="space-y-4">
              <div className="bg-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Username</span>
                  <span className="text-sm font-medium capitalize">{user?.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Role</span>
                  <span className="text-sm font-medium">{user?.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Cabang</span>
                  <span className="text-sm font-medium">{user?.cabang}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <p>• Anda hanya dapat melihat data cabang <strong>{user?.cabang}</strong>.</p>
                <p>• Kolom Cabang otomatis terisi saat menambah data baru.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
