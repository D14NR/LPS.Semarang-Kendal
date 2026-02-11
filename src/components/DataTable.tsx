import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit2, Trash2, Eye } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  width?: string;
  render?: (value: string, row: Record<string, string>) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, string>[];
  onEdit?: (row: Record<string, string>) => void;
  onDelete?: (row: Record<string, string>) => void;
  onView?: (row: Record<string, string>) => void;
  loading?: boolean;
}

export default function DataTable({ columns, data, onEdit, onDelete, onView, loading }: DataTableProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const perPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortField, sortDir]);

  const filtered = useMemo(() => {
    let result = data;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(row =>
        columns.some(col => (row[col.key] || '').toLowerCase().includes(s))
      );
    }
    if (sortField) {
      result = [...result].sort((a, b) => {
        const va = (a[sortField] || '').toLowerCase();
        const vb = (b[sortField] || '').toLowerCase();
        const cmp = va.localeCompare(vb, 'id');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, sortField, sortDir, columns]);

  const displayData = filtered;

  const totalPages = Math.max(1, Math.ceil(displayData.length / perPage));
  const paginated = displayData.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortDir('asc');
    }
  };

  // Show max 5 columns in skeleton to save space
  const skeletonCols = Math.min(columns.length, 5);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Search skeleton */}
        <div className="h-10 w-64 bg-gray-100 rounded-xl animate-pulse" />

        {/* Table skeleton */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left"><div className="h-3 w-6 bg-gray-200 rounded animate-pulse" /></th>
                {Array.from({ length: skeletonCols }).map((_, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                  </th>
                ))}
                <th className="px-4 py-3 text-center"><div className="h-3 w-12 bg-gray-200 rounded animate-pulse mx-auto" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="px-4 py-3"><div className="h-4 w-6 bg-gray-100 rounded animate-pulse" /></td>
                  {Array.from({ length: skeletonCols }).map((_, colIdx) => (
                    <td key={colIdx} className="px-4 py-3">
                      <div
                        className="h-4 bg-gray-100 rounded animate-pulse"
                        style={{ width: `${60 + Math.random() * 60}px`, animationDelay: `${(rowIdx * skeletonCols + colIdx) * 50}ms` }}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                      <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center py-2">
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            Memuat data dari spreadsheet...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Cari data..."
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                No
              </th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                  style={col.width ? { width: col.width } : {}}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortField === col.key && (
                      <span className="text-blue-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
              {(onEdit || onDelete || onView) && (
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Search size={40} className="text-gray-200" />
                    <p>Tidak ada data ditemukan</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr key={row['_id'] || idx} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">
                    {(currentPage - 1) * perPage + idx + 1}
                  </td>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                      {col.render ? col.render(row[col.key] || '', row) : (row[col.key] || '-')}
                    </td>
                  ))}
                  {(onEdit || onDelete || onView) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {onView && (
                          <button
                            onClick={() => onView(row)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Lihat"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <p className="text-gray-500">
          Menampilkan {displayData.length === 0 ? 0 : (currentPage - 1) * perPage + 1} - {Math.min(currentPage * perPage, displayData.length)} dari {displayData.length} data
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page: number;
            if (totalPages <= 5) {
              page = i + 1;
            } else if (currentPage <= 3) {
              page = i + 1;
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + i;
            } else {
              page = currentPage - 2 + i;
            }
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
