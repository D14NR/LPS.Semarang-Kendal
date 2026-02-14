import CrudPage from '../components/CrudPage';

const subjectFields = [
  'MTK', 'B.INDO', 'B.ING', 'MTK TL', 'FIS', 'KIM', 'BIO',
  'GEO', 'SEJ', 'SOS', 'EKO', 'PP', 'IPA', 'IPS', 'PKWU',
  'IND TL', 'ING TL', 'PU', 'PPU', 'PBM', 'PK', 'LIB', 'LING', 'PM',
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

export default function NilaiTesStandar() {
  return (
    <CrudPage
      title="Nilai Tes Standar"
      sheetKey="nilaiTesStandar"
      fields={fields}
      modalSize="xl"
      autoReplaceKeys={['Nis', 'Tanggal', 'Jenis Tes', 'Cabang']}
      autoFillOnMatch
    />
  );
}
