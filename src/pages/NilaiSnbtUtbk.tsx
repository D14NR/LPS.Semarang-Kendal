import { useEffect, useState } from 'react';
import CrudPage from '../components/CrudPage';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { fetchAllData, createBulkRecords } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, Plus, X as XIcon } from 'lucide-react';

const fields = [
  { key: 'Nis', label: 'NIS', required: true, readOnly: true },
  {
    key: 'Nama',
    label: 'Nama Siswa',
    required: true,
    type: 'select' as const,
    options: [] as string[],
    readOnly: true,
    onValueChange: (value: string, _form: Record<string, string>, setFormData: React.Dispatch<React.SetStateAction<Record<string, string>>>) => {
      const parts = value.split(' - ');
      const nis = parts[0]?.trim() || '';
      const nama = parts.slice(1).join(' - ').trim() || '';
      setFormData((prev) => ({ ...prev, Nis: nis, Nama: nama }));
    },
  },
  { key: 'Tanggal', label: 'Tanggal', type: 'date' as const, required: true },
  { key: 'Jenis Tes', label: 'Jenis Tes' },
  { key: 'pu', label: 'PU', type: 'number' as const },
  { key: 'ppu', label: 'PPU', type: 'number' as const },
  { key: 'pbm', label: 'PBM', type: 'number' as const },
  { key: 'pk', label: 'PK', type: 'number' as const },
  { key: 'lib', label: 'LIB', type: 'number' as const },
  { key: 'ling', label: 'LING', type: 'number' as const },
  { key: 'pm', label: 'PM', type: 'number' as const },
  { key: 'rerata', label: 'Rerata', type: 'number' as const },
  { key: 'total', label: 'Total', type: 'number' as const },
  { key: 'Cabang', label: 'Cabang' },
];

export default function NilaiSnbtUtbk() {
  const { user } = useAuth();
  const [studentOptions, setStudentOptions] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [tanggal, setTanggal] = useState('');
  const [jenisTes, setJenisTes] = useState('');
  const [rows, setRows] = useState<{ Nis: string; Nama: string }[]>([]);

  useEffect(() => {
    const loadStudents = async () => {
      const siswa = await fetchAllData('siswa');
      const options = (siswa || []).map((s: any) => `${s['Nis'] || s['nis'] || ''} - ${s['Nama'] || s['nama'] || ''}`)
        .filter(Boolean)
        .sort();
      setStudentOptions(Array.from(new Set(options)));
    };
    loadStudents();
    const handler = (ev: any) => {
      try {
        const changedKey = ev?.detail?.key;
        if (!changedKey) return;
        if (changedKey === 'siswa') loadStudents();
      } catch {}
    };
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('supabase:recordsChanged', handler as EventListener);
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('supabase:recordsChanged', handler as EventListener);
    };
  }, []);

  const resolvedFields = fields.map((f) => (f.key === 'Nama' ? { ...f, options: studentOptions } : f));

  return (
    <>
      <CrudPage
        title="Nilai SNBT-UTBK"
        sheetKey="nilaiSnbtUtbk"
        fields={resolvedFields}
        modalSize="lg"
        addLabel="Tambah Nilai SNBT-UTBK"
        autoReplaceKeys={[ 'Nis', 'Tanggal', 'Jenis Tes', 'Cabang' ]}
        autoFillOnMatch
      />

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Tambah Nilai SNBT-UTBK" size="lg">
        <form onSubmit={async (e) => { e.preventDefault(); /* implement bulk submit if needed */ }}>
          <div className="mb-4 text-sm text-gray-600">Tambah massal SNBT dilakukan melalui fitur Tambah Nilai pada halaman ini.</div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 border rounded">Batal</button>
            <button type="button" disabled className="px-4 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-2">
              <Save size={14} /> Simpan Semua
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
