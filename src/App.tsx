import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DataSiswa from './pages/DataSiswa';
import PresensiSiswa from './pages/PresensiSiswa';
import PerkembanganBelajar from './pages/PerkembanganBelajar';
import NilaiTesStandar from './pages/NilaiTesStandar';
import NilaiEvaluasi from './pages/NilaiEvaluasi';
import NilaiSnbtUtbk from './pages/NilaiSnbtUtbk';
import PelayananJamTambahan from './pages/PelayananJamTambahan';
import CatatanPembelajaran from './pages/CatatanPembelajaran';
import NamaPengajar from './pages/NamaPengajar';
import KelompokKelas from './pages/KelompokKelas';
import Sekolah from './pages/Sekolah';
import PrintRaporSiswa from './pages/PrintRaporSiswa';
import LaporanWhatsapp from './pages/LaporanWhatsapp';
import Pengaturan from './pages/Pengaturan';

function AppContent() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/siswa" element={<DataSiswa />} />
          <Route path="/presensi" element={<PresensiSiswa />} />
          <Route path="/perkembangan" element={<PerkembanganBelajar />} />
          <Route path="/nilai/standar" element={<NilaiTesStandar />} />
          <Route path="/nilai/snbt-utbk" element={<NilaiSnbtUtbk />} />
          <Route path="/nilai/evaluasi" element={<NilaiEvaluasi />} />
          <Route path="/pelayanan" element={<PelayananJamTambahan />} />
          <Route path="/catatan" element={<CatatanPembelajaran />} />
          <Route path="/pengajar" element={<NamaPengajar />} />
          <Route path="/rapor" element={<PrintRaporSiswa />} />
          <Route path="/laporan-whatsapp" element={<LaporanWhatsapp />} />
          <Route path="/kelompok-kelas" element={<KelompokKelas />} />
          <Route path="/sekolah" element={<Sekolah />} />
          {user?.isAdmin && <Route path="/pengaturan" element={<Pengaturan />} />}
          {/* Fallback - redirect non-admin from pengaturan to dashboard */}
          <Route path="/pengaturan" element={<Dashboard />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
