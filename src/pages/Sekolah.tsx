import CrudPage from '../components/CrudPage';
import { fetchJenjangSekolahOptions } from '../services/supabase';

const fields = [
  {
    key: 'Jenjang Studi',
    label: 'Jenjang Studi',
    type: 'multiselect-checkbox' as const,
    asyncOptions: () => fetchJenjangSekolahOptions(),
    required: true,
  },
  { key: 'Nama Sekolah', label: 'Nama Sekolah', required: true },
];

export default function Sekolah() {
  return (
    <CrudPage
      title="Sekolah"
      sheetKey="sekolah"
      fields={fields}
      modalSize="xl"
      autoReplaceKeys={['Nama Sekolah']}
      showImport={false}
    />
  );
}
