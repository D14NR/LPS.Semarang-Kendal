import CrudPage from '../components/CrudPage';
import { fetchKelompokKelasOptionsByCabang, fetchSekolahOptions, fetchJenjangSekolahOptions, fetchJenjangsForSchool, JENJANG_STUDI_OPTIONS } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

type AsyncContext = {
  formData: Record<string, string>;
  user?: { isAdmin: boolean; cabang?: string | null } | null;
  filterState?: Record<string, string>;
  cabangField?: string;
};

const fetchKelompokKelasOptions = (cabang?: string, jenjangStudi?: string) => fetchKelompokKelasOptionsByCabang(cabang, jenjangStudi);

const fields = [
  { key: 'Nis', label: 'NIS', required: true },
  { key: 'Nama', label: 'Nama', required: true },
  { key: 'Tanggal Lahir', label: 'Tanggal Lahir', type: 'date' as const },
  {
    key: 'Asal Sekolah',
    label: 'Asal Sekolah',
    type: 'select' as const,
    asyncOptions: (context?: AsyncContext) => {
      const safe: AsyncContext = context || { formData: {}, user: null };
      const jenjang = safe.formData['Jenjang Studi'] || undefined;
      return fetchSekolahOptions(jenjang);
    },
    onValueChange: (value: string, nextForm, setFormData) => {
      setFormData((prev) => ({ ...prev, 'Jenjang Studi': '', 'Kelompok Kelas': '' }));
    },
  },
  {
    key: 'Jenjang Studi',
    label: 'Jenjang Studi',
    type: 'select' as const,
    asyncOptions: (context?: AsyncContext) => {
      const safe: AsyncContext = context || { formData: {}, user: null };
      const sekolah = String(safe.formData['Asal Sekolah'] || '').trim();
      if (sekolah) return fetchJenjangsForSchool(sekolah);
      return fetchJenjangSekolahOptions();
    },
    onValueChange: (value: string, nextForm, setFormData) => {
      setFormData((prev) => ({ ...prev, 'Kelompok Kelas': '' }));
    },
  },
  {
    key: 'Kelompok Kelas',
    label: 'Kelompok Kelas',
    type: 'multiselect-checkbox' as const,
    hideInForm: (formData) => !String(formData['Jenjang Studi'] || '').trim(),
    asyncOptions: (context?: AsyncContext) => {
      const safe: AsyncContext = context || { formData: {}, user: null };
      const jenjang = String(safe.formData['Jenjang Studi'] || '').trim();
      if (!jenjang) return Promise.resolve([]);
      const cabangValue = safe.user?.isAdmin
        ? safe.formData['Cabang']
        : safe.user?.cabang ?? undefined;
      return fetchKelompokKelasOptions(cabangValue, jenjang);
    },
  },
  {
    key: 'No. WhatsApp Siswa',
    label: 'No. WhatsApp Siswa',
    type: 'tel' as const,
    render: (value: string, row: Record<string, string>) =>
      value || row['No. WhatsApp Siswa'] || row['No.whatsapp siswa'] || row['No Whatsapp Siswa'] || row['Tlpn'] || row['Telepon'] || '-',
  },
  {
    key: 'No. WhatsApp Orang Tua',
    label: 'No. WhatsApp Orang Tua',
    type: 'tel' as const,
    render: (value: string, row: Record<string, string>) =>
      value || row['No. WhatsApp Orang Tua'] || row['No.whatsapp orang tua'] || row['No Whatsapp Ortu'] || '-',
  },
  { key: 'Email', label: 'Email', type: 'email' as const },
  { key: 'Cabang', label: 'Cabang' },
];

const filters = [
  {
    key: 'Cabang',
    label: 'Cabang',
    placeholder: 'Semua Cabang',
    searchable: true,
  },
  {
    key: 'Jenjang Studi',
    label: 'Jenjang Studi',
    placeholder: 'Semua Jenjang',
    options: JENJANG_STUDI_OPTIONS,
    searchable: true,
  },
];

export default function DataSiswa() {
  const { user } = useAuth();

  return (
      <CrudPage
        title="Data Siswa"
        sheetKey="siswa"
        fields={fields}
        filters={filters}
        cabangField="Cabang"
        autoReplaceKeys={['Nis']}
        showImport={user?.isAdmin ?? false}
      />
  );
}
