import { useEffect, useState } from 'react';
import CrudPage from '../components/CrudPage';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { fetchAllData, fetchPengajarFromKmb, createBulkRecords } from '../services/supabase';
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
  { key: 'Tanggal', label: 'Tanggal', type: 'date' as const, required: true },
  { key: 'Mata Pelajaran', label: 'Mata Pelajaran' },
  { key: 'Sub Bab', label: 'Sub Bab' },
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
  const { user } = useAuth();
  const [studentOptions, setStudentOptions] = useState<string[]>([]);
  const [mataPelajaranOptions, setMataPelajaranOptions] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [tanggal, setTanggal] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [subBab, setSubBab] = useState('');
  const [rows, setRows] = useState<{ Nis: string; Nama: string; Nilai: string }[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadStudents = async () => {
      const siswa = (await fetchAllData('siswa')) as StudentRow[];
      const options = siswa
        .map(studentOption)
        .filter((val) => val && val.includes(' - '))
        .sort();
      setStudentOptions(Array.from(new Set(options)) as string[]);
      const map: Record<string, string> = {};
      siswa.forEach((s) => {
        const nis = s['Nis'] || s['NIS'] || s['nis'] || '';
        const nama = s['Nama'] || s['Nama Siswa'] || s['nama'] || '';
        if (nis) map[String(nis).trim()] = String(nama).trim();
      });
      setStudentsMap(map);
    };
    const loadPengajar = async () => {
      const pengajar = await fetchPengajarFromKmb();
      const map = new Map<string, string>();
      pengajar.forEach((row) => {
        const raw = (row['bidang_studi'] || row['mata_pelajaran'] || row['Mata Pelajaran'] || row['bidang'] || row['bidang studi'] || '').trim();
        if (!raw) return;
        const parts = raw.split(/[;,|\\/]+/).map((p) => p.trim()).filter(Boolean);
        parts.forEach((p) => map.set(p.toLowerCase(), p));
      });
      setMataPelajaranOptions(Array.from(map.values()).sort((a, b) => a.localeCompare(b)));
    };

    const loadOptions = async () => {
      await Promise.all([loadStudents(), loadPengajar()]);
    };

    loadOptions();
  }, []);

  useEffect(() => {
    const handler = (ev: any) => {
      try {
        const changedKey = ev?.detail?.key;
        if (!changedKey) return;
        if (['siswa', 'pengajar', 'kelompokKelas', 'sekolah'].includes(changedKey)) {
          loadOptions();
        }
      } catch {}
    };
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('supabase:recordsChanged', handler as EventListener);
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('supabase:recordsChanged', handler as EventListener);
    };
  }, []);

  const resolvedFields = fields.map((field) => {
    if (field.key === 'Nama' || field.key === 'Nama Siswa') return { ...field, options: studentOptions };
    if (field.key === 'Mata Pelajaran') return { ...field, options: mataPelajaranOptions };
    return field;
  });

  return (
    <>
      <CrudPage
        title="Nilai Evaluasi"
        sheetKey="nilaiEvaluasi"
        fields={resolvedFields}
        modalSize="lg"
        addLabel="Tambah Nilai Evaluasi"
        autoReplaceKeys={['Nis', 'Tanggal', 'Mata Pelajaran', 'Cabang']}
        autoFillOnMatch
        onAddClick={() => setAddOpen(true)}
      />

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Tambah Nilai Evaluasi" size="lg">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!tanggal || !mataPelajaran) return;
            const effectiveCabang = user && !user.isAdmin ? (user.cabang || '') : '';
            const payloads = rows
              .filter((r) => r.Nis && r.Nilai)
              .map((r) => ({
                Nis: r.Nis,
                'Nama Siswa': r.Nama,
                Tanggal: tanggal,
                'Mata Pelajaran': mataPelajaran,
                'Sub Bab': subBab,
                Nilai: r.Nilai,
                Cabang: effectiveCabang,
              }));
            if (payloads.length === 0) return;
            setSubmitting(true);
            try {
              const res = await createBulkRecords('nilaiEvaluasi', payloads);
              if (res.success) {
                window.location.reload();
              } else {
                alert('Gagal menyimpan: ' + res.message);
              }
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal</label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mata Pelajaran</label>
              <select value={mataPelajaran} onChange={(e) => setMataPelajaran(e.target.value)} onFocus={() => loadOptions()} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Pilih Mata Pelajaran</option>
                {mataPelajaranOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sub Bab (opsional)</label>
              <input value={subBab} onChange={(e) => setSubBab(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          {tanggal && mataPelajaran && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Daftar Nilai</h3>
                <button type="button" onClick={() => setRows((prev) => [...prev, { Nis: '', Nama: '', Nilai: '' }])} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm inline-flex items-center gap-2">
                  <Plus size={14} /> Tambah Baris
                </button>
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">NIS</th>
                      <th className="px-3 py-2 text-left">Nama</th>
                      <th className="px-3 py-2 text-left">Nilai</th>
                      <th className="px-3 py-2 text-left">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">
                          <input readOnly value={r.Nis} className="w-full px-2 py-1 border rounded bg-gray-50" />
                        </td>
                        <td className="px-3 py-2">
                            <SearchableSelect
                            value={r.Nis && r.Nama ? `${r.Nis} - ${r.Nama}` : r.Nama}
                            onChange={(val) => {
                              const parts = String(val || '').split(' - ');
                              const nis = parts[0]?.trim() || '';
                              const nama = parts.slice(1).join(' - ').trim() || val;
                              setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, Nis: nis, Nama: nama } : row)));
                            }}
                            options={studentOptions}
                            onOpen={() => loadOptions()}
                            placeholder="Pilih Nama"
                          />
                            
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" value={r.Nilai} onChange={(e) => setRows((prev) => prev.map((row, i) => i === idx ? { ...row, Nilai: e.target.value } : row))} className="w-full px-2 py-1 border rounded" />
                        </td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))} className="px-2 py-1 bg-red-500 text-white rounded"><XIcon size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 border rounded">Batal</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded inline-flex items-center gap-2">
              <Save size={14} /> {submitting ? 'Menyimpan...' : 'Simpan Semua'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
