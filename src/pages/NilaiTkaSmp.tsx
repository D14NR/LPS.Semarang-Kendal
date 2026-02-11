import CrudPage from '../components/CrudPage';

const subjectFields = [
  'MTK', 'B.INDO',
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

export default function NilaiTkaSmp() {
  return <CrudPage title="Nilai TKA SMP" sheetKey="nilaiTkaSmp" fields={fields} modalSize="lg" />;
}
