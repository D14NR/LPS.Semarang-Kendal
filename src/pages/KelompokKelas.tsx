import CrudPage from '../components/CrudPage';

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
  { key: 'Kelompok Kelas', label: 'Kelompok Kelas', required: true },
  { key: 'Cabang', label: 'Cabang', type: 'select' as const, options: CABANG_OPTIONS, required: true },
  { key: 'Timestamp', label: 'Timestamp', hideInForm: true },
];

export default function KelompokKelas() {
  return (
    <CrudPage
      title="Kelompok Kelas"
      sheetKey="kelompokKelas"
      fields={fields}
      cabangField="Cabang"
      autoReplaceKeys={['Kelompok Kelas', 'Cabang']}
    />
  );
}
