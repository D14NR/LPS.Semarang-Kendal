import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { fetchPengajarFromKmb } from '../services/supabase';

export default function NamaPengajar() {
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'kode_pengajar' | 'nama' | 'bidang_studi'>('nama');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handler = (ev: any) => {
      try {
        const changedKey = ev?.detail?.key;
        if (!changedKey) return;
        if (changedKey === 'pengajar') loadData();
      } catch {}
    };
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('supabase:recordsChanged', handler as EventListener);
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('supabase:recordsChanged', handler as EventListener);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchPengajarFromKmb();
      console.debug('fetchPengajarFromKmb result count:', Array.isArray(result) ? result.length : typeof result, result);
      setFetchError(null);
      setData(result);
    } catch (err) {
      console.error('Failed to load pengajar data:', err);
      setFetchError(String(err || 'Unknown error'));
      setData([]);
    }
    setLoading(false);
  };

  const filtered = data.filter(row => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (row['kode_pengajar'] || '').toLowerCase().includes(s) ||
      (row['nama'] || '').toLowerCase().includes(s) ||
      (row['bidang_studi'] || '').toLowerCase().includes(s)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const va = (a[sortField] || '').toLowerCase();
    const vb = (b[sortField] || '').toLowerCase();
    const cmp = va.localeCompare(vb, 'id');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: 'kode_pengajar' | 'nama' | 'bidang_studi') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nama Pengajar</h1>
          <p className="text-gray-500 text-sm mt-1">
            Total: {sorted.length} data
            {search && data.length !== filtered.length && (
              <span className="text-gray-400"> (dari {data.length} total)</span>
            )}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      {/* Debug panel removed */}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari kode, nama, atau bidang studi..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Memuat data dari Supabase KMB...</p>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-6">
            <div className="text-center text-sm text-gray-500 mb-4">Tidak ada data ditemukan.</div>
            <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3 text-sm">
              <p className="font-medium">Penyebab umum:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                <li>Variabel lingkungan <code>VITE_SUPABASE_KMB_URL</code> / <code>VITE_SUPABASE_KMB_KEY</code> belum diset.</li>
                <li>Tabel <em>pengajar</em> di Supabase kosong atau tidak tersedia.</li>
                <li>Masalah koneksi / CORS antara aplikasi dan Supabase.</li>
              </ul>
              <div className="mt-3 flex justify-center">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-50"
                >
                  Coba Ulang
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Lihat console browser untuk pesan error lebih detail.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    No
                  </th>
                  <th
                    onClick={() => handleSort('kode_pengajar')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      Kode Pengajar
                      {sortField === 'kode_pengajar' && (
                        <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('nama')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      Nama Pengajar
                      {sortField === 'nama' && (
                        <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('bidang_studi')}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">
                      Bidang Studi
                      {sortField === 'bidang_studi' && (
                        <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((row, idx) => (
                  <tr key={row['_id'] || idx} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{row['kode_pengajar'] || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{row['nama'] || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{row['bidang_studi'] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
