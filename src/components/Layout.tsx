import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  TrendingUp,
  Award,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  GraduationCap,
  FileText,
  BookOpen,
  Settings,
  Wifi,
  LogOut,
  MapPin,
  Shield,
  MessageCircle,
} from 'lucide-react';
import { isAppsScriptConfigured } from '../services/googleSheets';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { name: 'Dashboard', path: '/', icon: 'dashboard' },
  { name: 'Data Siswa', path: '/siswa', icon: 'users' },
  { name: 'Presensi Siswa', path: '/presensi', icon: 'clipboard' },
  { name: 'Perkembangan Belajar', path: '/perkembangan', icon: 'trending' },
  {
    name: 'Nilai Siswa',
    path: '/nilai',
    icon: 'award',
    children: [
      { name: 'Nilai UTBK', path: '/nilai/utbk', icon: 'filetext' },
      { name: 'Nilai TKA SMA', path: '/nilai/tka-sma', icon: 'filetext' },
      { name: 'Nilai TKA SMP', path: '/nilai/tka-smp', icon: 'filetext' },
      { name: 'Nilai TKA SD', path: '/nilai/tka-sd', icon: 'filetext' },
      { name: 'Nilai Tes Standar', path: '/nilai/tes-standar', icon: 'filetext' },
      { name: 'Nilai Evaluasi', path: '/nilai/evaluasi', icon: 'bookopen' },
    ],
  },
  { name: 'Pelayanan/Jam Tambahan', path: '/pelayanan', icon: 'clock' },
  { name: 'Nama Pengajar', path: '/pengajar', icon: 'usercheck' },
  { name: 'Print Rapor Siswa', path: '/rapor', icon: 'filetext' },
  { name: 'Laporan WhatsApp', path: '/laporan-whatsapp', icon: 'message' },
];

function getIcon(icon: string, size = 20) {
  const props = { size, className: 'flex-shrink-0' };
  switch (icon) {
    case 'dashboard':
      return <LayoutDashboard {...props} />;
    case 'users':
      return <Users {...props} />;
    case 'clipboard':
      return <ClipboardCheck {...props} />;
    case 'trending':
      return <TrendingUp {...props} />;
    case 'award':
      return <Award {...props} />;
    case 'clock':
      return <Clock {...props} />;
    case 'usercheck':
      return <UserCheck {...props} />;
    case 'filetext':
      return <FileText {...props} />;
    case 'bookopen':
      return <BookOpen {...props} />;
    case 'settings':
      return <Settings {...props} />;
    case 'message':
      return <MessageCircle {...props} />;
    default:
      return <LayoutDashboard {...props} />;
  }
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Nilai Siswa']);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const apiConfigured = isAppsScriptConfigured();
  const { user, logout } = useAuth();

  const toggleMenu = (name: string) => {
    setExpandedMenus((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getPageTitle = () => {
    if (location.pathname === '/pengaturan') return 'Pengaturan';
    const flat = menuItems.flatMap((m) => (m.children ? m.children : [m]));
    const found = flat.find((m) => isActive(m.path) && m.path !== '/');
    return found?.name || 'Dashboard';
  };

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <GraduationCap size={22} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight">LPS Smrg-Kndl</h1>
              <p className="text-xs text-slate-400">Laporan Pekembangan</p>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              className="hidden lg:inline-flex p-2 hover:bg-slate-700 rounded-lg transition"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              title={sidebarCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button
              className="lg:hidden p-1 hover:bg-slate-700 rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* User Info Card */}
        {user && (
          <div className={`mx-3 mt-4 mb-2 p-3 bg-slate-700/40 rounded-xl border border-slate-600/30 ${
            sidebarCollapsed ? 'px-2' : ''
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                user.isAdmin 
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600'
              }`}>
                {user.isAdmin ? <Shield size={16} /> : user.username.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate capitalize">{user.username}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    {user.isAdmin ? (
                      <span className="flex items-center gap-1">
                        <Shield size={10} /> Administrator
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {user.role}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && !user.isAdmin && (
              <div className="mt-2 px-2 py-1 bg-blue-500/20 rounded-lg text-xs text-blue-300 text-center">
                Cabang: {user.cabang}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-4 ${sidebarCollapsed ? 'px-2' : 'px-3'} space-y-1`}>
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`w-full flex items-center gap-3 ${sidebarCollapsed ? 'px-3 justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    {getIcon(item.icon)}
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        {expandedMenus.includes(item.name) ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </>
                    )}
                  </button>
                  {expandedMenus.includes(item.name) && !sidebarCollapsed && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-700 pl-4 animate-in">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                            isActive(child.path)
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                              : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                          }`}
                        >
                          {getIcon(child.icon, 16)}
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 ${sidebarCollapsed ? 'px-3 justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  {getIcon(item.icon)}
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Settings Link & Logout */}
        <div className={`pb-2 space-y-1 ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
          {user?.isAdmin && (
            <Link
              to="/pengaturan"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 ${sidebarCollapsed ? 'px-3 justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive('/pengaturan')
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
              title={sidebarCollapsed ? 'Pengaturan' : undefined}
            >
              <Settings size={20} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>Pengaturan</span>}
            </Link>
          )}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center gap-3 ${sidebarCollapsed ? 'px-3 justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all duration-200`}
            title={sidebarCollapsed ? 'Keluar' : undefined}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Keluar</span>}
          </button>
        </div>

        {/* Footer */}
        <div className={`py-4 border-t border-slate-700/50 ${sidebarCollapsed ? 'px-3' : 'px-6'}`}>
          <div className={`flex items-center gap-2 text-xs text-slate-400 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div
              className={`w-2 h-2 rounded-full ${
                apiConfigured ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            {!sidebarCollapsed && (
              apiConfigured ? (
                <span className="flex items-center gap-1">
                  <Wifi size={12} /> API Connected — CRUD Aktif
                </span>
              ) : (
                'Read-Only Mode'
              )
            )}
          </div>
          {!sidebarCollapsed && (
            <p className="text-xs text-slate-600 mt-1">© 2026 Laporan Pekembangan Siswa (LPS) Smrg-Kndl by D14nr</p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print-wrapper">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center gap-4 shadow-sm">
          <button
            className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">{getPageTitle()}</h2>
            {user && !user.isAdmin && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin size={10} /> Data Cabang: {user.cabang}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Cabang Badge */}
            {user && !user.isAdmin && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                <MapPin size={12} />
                {user.cabang}
              </div>
            )}
            {/* API Status */}
            <div
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                apiConfigured
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  apiConfigured ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
              {apiConfigured ? 'CRUD Aktif' : 'Read-Only'}
            </div>
            {/* User Avatar */}
            {user && (
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                  user.isAdmin 
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                }`}>
                  {user.isAdmin ? <Shield size={14} /> : user.username.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={28} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Konfirmasi Keluar</h3>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin keluar dari sistem?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all shadow-md"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
