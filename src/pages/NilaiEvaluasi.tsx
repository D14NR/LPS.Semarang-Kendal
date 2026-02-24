import CrudPage from '../components/CrudPage';

const fields = [
  { key: 'Nis', label: 'NIS', required: true },
  { key: 'Nama Siswa', label: 'Nama Siswa', required: true },
  { key: 'Tanggal', label: 'Tanggal', type: 'date' as const },
  { key: 'Jenis Tes', label: 'Jenis Tes' },
  { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
  { key: 'Nilai', label: 'Nilai', type: 'number' as const },
  { key: 'Cabang', label: 'Cabang' },
];

export default function NilaiEvaluasi() {
  return (
    <CrudPage
      title="Nilai Evaluasi"
      sheetKey="nilaiEvaluasi"
      fields={fields}
      modalSize="lg"
      autoReplaceKeys={['Nis', 'Tanggal', 'Jenis Tes', 'Mata Pelajaran', 'Cabang']}
      autoFillOnMatch
    />
  );
}
