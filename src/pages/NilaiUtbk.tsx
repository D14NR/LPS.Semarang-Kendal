import CrudPage from '../components/CrudPage';

const subjectFields = [
  'PU', 'PPU', 'PBM', 'PK', 'LIB', 'LING', 'PM',
];

const fields = [
  { key: 'Nis', label: 'NIS', required: true },
  { key: 'Nama Siswa', label: 'Nama Siswa', required: true },
  { key: 'Tanggal', label: 'Tanggal', type: 'date' as const },
  { key: 'Jenis Tes', label: 'Jenis Tes' },
  ...subjectFields.map(s => ({
    key: s,
    label: s,
    type: 'number' as const,
  })),
  { key: 'Rerata', label: 'Rerata', type: 'number' as const },
  { key: 'Total', label: 'Total', type: 'number' as const },
  { key: 'Cabang', label: 'Cabang' },
];

export default function NilaiUtbk() {
  return <CrudPage title="Nilai UTBK" sheetKey="nilaiUtbk" fields={fields} modalSize="lg" />;
}
