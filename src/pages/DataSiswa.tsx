import CrudPage from '../components/CrudPage';
import { fetchSheetOptions } from '../services/googleSheets';

const fetchKelompokKelasOptions = () => fetchSheetOptions('kelompokKelas');

const fields = [
  { key: 'Nis', label: 'NIS', required: true },
  { key: 'Nama', label: 'Nama', required: true },
  { key: 'Tanggal Lahir', label: 'Tanggal Lahir', type: 'date' as const },
  { key: 'Asal Sekolah', label: 'Asal Sekolah' },
  { key: 'Jenjang Studi', label: 'Jenjang Studi', type: 'select' as const, options: ['SD', 'SMP', 'SMA', 'SMK', 'D3', 'S1', 'S2'] },
  {
    key: 'No.whatsapp siswa',
    label: 'No. WhatsApp Siswa',
    type: 'tel' as const,
    render: (value: string, row: Record<string, string>) =>
      value || row['No. whatsapp siswa'] || row['No Whatsapp Siswa'] || row['Tlpn'] || row['Telepon'] || '-',
  },
  {
    key: 'No.whatsapp orang tua',
    label: 'No. WhatsApp Orang Tua',
    type: 'tel' as const,
    render: (value: string, row: Record<string, string>) =>
      value || row['No. whatsapp orang tua'] || row['No Whatsapp Orang Tua'] || row['No Whatsapp Ortu'] || '-',
  },
  { key: 'Email', label: 'Email', type: 'email' as const },
  {
    key: 'Kelompok Kelas',
    label: 'Kelompok Kelas',
    type: 'multiselect-checkbox' as const,
    asyncOptions: fetchKelompokKelasOptions,
    canCreateOption: true,
    createOptionLabel: 'Kelompok Kelas',
    colSpan: 2,
    render: (value: string) => {
      if (!value) return <span className="text-gray-400">-</span>;
      const items = value.split(',').map(s => s.trim()).filter(Boolean);
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-md border border-purple-200"
            >
              {item}
            </span>
          ))}
        </div>
      );
    },
  },
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
    options: ['SD', 'SMP', 'SMA', 'SMK', 'D3', 'S1', 'S2'],
    searchable: true,
  },
  {
    key: 'Kelompok Kelas',
    label: 'Kelompok Kelas',
    placeholder: 'Semua Kelompok',
    asyncOptions: fetchKelompokKelasOptions,
    mode: 'includes' as const,
    searchable: true,
  },
];

export default function DataSiswa() {
  return <CrudPage title="Data Siswa" sheetKey="siswa" fields={fields} filters={filters} />;
}
