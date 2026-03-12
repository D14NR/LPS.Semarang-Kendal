import { useEffect, useState } from 'react';
import CrudPage from '../components/CrudPage';
import { fetchAllData } from '../services/googleSheets';

const subjectFields = ['MTK', 'B.INDO'];

type StudentRow = Record<string, string>;

const studentOption = (row: StudentRow): string => {
  const nis = row['Nis'] || row['NIS'] || '';
  const nama = row['Nama'] || row['Nama Siswa'] || '';
  return `${nis} - ${nama}`.trim();
};

const parseStudentOption = (value: string) => {
  const parts = value.split(' - ');
  return {
    nis: parts[0]?.trim() || '',
    nama: parts.slice(1).join(' - ').trim() || '',
  };
};

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
      const parsed = parseStudentOption(value);
      setFormData((prev) => ({
        ...prev,
        Nis: parsed.nis,
        'Nama Siswa': parsed.nama,
      }));
    },
  },
  { key: 'Tanggal', label: 'Tanggal', type: 'date' as const },
  { key: 'Jenis Tes', label: 'Jenis Tes' },
  ...subjectFields.map((s) => ({
    key: s,
    label: s,
    type: 'number' as const,
  })),
  { key: 'Rerata', label: 'Rerata', type: 'number' as const },
  { key: 'Total', label: 'Total', type: 'number' as const },
  { key: 'Cabang', label: 'Cabang' },
];

export default function NilaiTkaSd() {
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
      title="Nilai TKA SD"
      sheetKey="nilaiTkaSd"
      fields={resolvedFields}
      modalSize="lg"
      autoReplaceKeys={['Nis', 'Tanggal', 'Jenis Tes', 'Cabang']}
      autoFillOnMatch
    />
  );
}
