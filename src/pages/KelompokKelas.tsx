import CrudPage from '../components/CrudPage';
import { JENJANG_STUDI_OPTIONS } from '../services/supabase';

const CABANG_OPTIONS = [
  'Semarang 1',
  'Semarang 2',
  'Semarang 3',
  'Semarang 4',
  'Semarang 5',
  'Semarang 6',
  'Kendal',
];

const fields = [
  {
    key: 'Jenjang Studi',
    label: 'Jenjang Studi',
    type: 'select' as const,
    options: JENJANG_STUDI_OPTIONS,
  },
  { key: 'Kelompok Kelas', label: 'Kelompok Kelas', required: true },
  { key: 'Cabang', label: 'Cabang', type: 'select' as const, options: CABANG_OPTIONS, required: true },
];

export default function KelompokKelas() {
  return (
    <CrudPage
      title="Kelompok Kelas"
      sheetKey="kelompokKelas"
      fields={fields}
      cabangField="Cabang"
      autoReplaceKeys={['Jenjang Studi', 'Kelompok Kelas', 'Cabang']}
      showImport={false}
    />
  );
}
