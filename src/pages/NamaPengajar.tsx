import CrudPage from '../components/CrudPage';

const fields = [
  {
    key: 'Pengajar',
    label: 'Nama Pengajar',
    required: true,
    render: (value: string, row: Record<string, string>) =>
      value ||
      row['Nama Pengajar'] ||
      row['Pengajar '] ||
      row[' Nama Pengajar'] ||
      row['Pengajar'] ||
      row['Pengajar'] ||
      '-',
  },
  {
    key: 'Mata Pelajaran',
    label: 'Mata Pelajaran',
    required: true,
    render: (value: string, row: Record<string, string>) =>
      value ||
      row['Mata  Pelajaran'] ||
      row['Mata Pelajaran '] ||
      row['Mata Pelajaran'] ||
      row['Mata Pelajaran'] ||
      '-',
  },
];

export default function NamaPengajar() {
  return <CrudPage title="Nama Pengajar" sheetKey="pengajar" fields={fields} modalSize="sm" />;
}
