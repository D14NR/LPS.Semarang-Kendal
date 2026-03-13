import { useEffect, useState } from 'react';
import CrudPage from '../components/CrudPage';
import { fetchAllData } from '../services/googleSheets';

const fields = [
  { key: 'Nis', label: 'NIS', required: true, readOnly: true },
  {
    key: 'Nama Siswa',
    label: 'Nama Siswa',
    required: true,
    type: 'select' as const,
    options: [] as string[],
    onValueChange: (
      value: string,
      _form: Record<string, string>,
      setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>
    ) => {
      const parts = value.split(' - ');
      const nis = parts[0]?.trim() || '';
      const nama = parts.slice(1).join(' - ').trim() || '';
      setFormData((prev) => ({
        ...prev,
        Nis: nis,
        'Nama Siswa': nama,
      }));
    },
  },
  { key: 'Tanggal', label: 'Tanggal', type: 'date' as const },
  { key: 'Jenis Tes', label: 'Jenis Tes' },
  { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
  { key: 'Nilai', label: 'Nilai', type: 'number' as const },
  { key: 'Cabang', label: 'Cabang' },
];

type StudentRow = Record<string, string>;

const studentOption = (row: StudentRow): string => {
  const nis = row['Nis'] || row['NIS'] || '';
  const nama = row['Nama'] || row['Nama Siswa'] || '';
  return `${nis} - ${nama}`.trim();
};

export default function NilaiEvaluasi() {
  const [studentOptions, setStudentOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadStudents = async () => {
      const siswa = (await fetchAllData('siswa')) as StudentRow[];
      const options = siswa
        .map(studentOption)
        .filter((val) => val && val.includes(' - '))
        .sort();
      setStudentOptions(Array.from(new Set(options)) as string[]);
    };
    loadStudents();
  }, []);

  const resolvedFields = fields.map((field) =>
    field.key === 'Nama Siswa' ? { ...field, options: studentOptions } : field
  );

  return (
    <CrudPage
      title="Nilai Evaluasi"
      sheetKey="nilaiEvaluasi"
      fields={resolvedFields}
      modalSize="lg"
      addLabel="Tambah Nilai Evaluasi"
      autoReplaceKeys={['Nis', 'Tanggal', 'Jenis Tes', 'Mata Pelajaran', 'Cabang']}
      autoFillOnMatch
    />
  );
}
