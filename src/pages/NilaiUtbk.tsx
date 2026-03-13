import { useEffect, useState } from 'react';
import CrudPage from '../components/CrudPage';
import { fetchAllData } from '../services/googleSheets';

const subjectFields = ['PU', 'PPU', 'PBM', 'PK', 'LIB', 'LING', 'PM'];

const parseScore = (value: string) => {
  if (!value) return null;
  const normalized = value.replace(',', '.');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
};

const formatScore = (value: number | null) => {
  if (value === null) return '';
  const rounded = Math.round(value * 100) / 100;
  const str = rounded.toString();
  return str.includes('.') ? str.replace('.', ',') : str;
};

const calculateScores = (form: Record<string, string>) => {
  let total = 0;
  let count = 0;
  subjectFields.forEach((key) => {
    const num = parseScore(form[key] || '');
    if (num !== null) {
      total += num;
      count += 1;
    }
  });
  const rerata = count > 0 ? total / count : null;
  return {
    total: formatScore(count > 0 ? total : null),
    rerata: formatScore(rerata),
  };
};

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
    type: 'text' as const,
    onValueChange: (
      value: string,
      form: Record<string, string>,
      setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>
    ) => {
      const scores = calculateScores({ ...form, [s]: value });
      setFormData((prev) => ({
        ...prev,
        [s]: value,
        Rerata: scores.rerata,
        Total: scores.total,
      }));
    },
  })),
  { key: 'Rerata', label: 'Rerata', type: 'text' as const, readOnly: true },
  { key: 'Total', label: 'Total', type: 'text' as const, readOnly: true },
  { key: 'Cabang', label: 'Cabang' },
];

export default function NilaiUtbk() {
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
      title="Nilai UTBK"
      sheetKey="nilaiUtbk"
      fields={resolvedFields}
      modalSize="lg"
      addLabel="Tambah Nilai UTBK"
      autoReplaceKeys={['Nis', 'Tanggal', 'Jenis Tes', 'Cabang']}
      autoFillOnMatch
      defaultSortKeys={['Timestamp', 'Tanggal']}
    />
  );
}
