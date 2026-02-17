import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Plus, RefreshCw, Download, UploadCloud, FileDown, AlertCircle, CheckCircle, XCircle, MapPin, Filter, ChevronDown, Check, Search, X } from 'lucide-react';
import DataTable from './DataTable';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import {
  fetchAllData,
  createRecord,
  createBulkRecords,
  updateRecord,
  deleteRecord,
  isAppsScriptConfigured,
  getCacheAge,
  type SheetKey,
} from '../services/googleSheets';
import { parseSpreadsheetFile, generateTemplateWorkbook, exportRecordsWorkbook } from '../utils/importUtils';
import { useAuth } from '../contexts/AuthContext';

interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'multiselect-checkbox';
  options?: string[];
  asyncOptions?: () => Promise<string[]>;
  canCreateOption?: boolean;
  createOptionLabel?: string;
  required?: boolean;
  width?: string;
  render?: (value: string, row: Record<string, string>) => React.ReactNode;
  hideInForm?: boolean;
  colSpan?: number;
}

interface FilterConfig {
  key: string;
  label: string;
  placeholder?: string;
  options?: string[];
  asyncOptions?: () => Promise<string[]>;
  mode?: 'exact' | 'includes';
  searchable?: boolean;
}

interface CrudPageProps {
  title: string;
  sheetKey: SheetKey;
  fields: FieldConfig[];
  modalSize?: 'sm' | 'md' | 'lg' | 'xl';
  cabangField?: string;
  filters?: FilterConfig[];
  autoReplaceKeys?: string[];
  autoFillOnMatch?: boolean;
}

type ToastType = 'success' | 'error' | 'warning';

// ===================== Date Formatting Helpers =====================

const normalizeFieldKey = (key: string) =>
  key
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[^a-z0-9]/gi, '');

const findValueByKey = (row: Record<string, string>, key: string): string => {
  if (row[key]) return row[key];
  const normalizedKey = normalizeFieldKey(key);
  const match = Object.entries(row).find(([k]) => normalizeFieldKey(k) === normalizedKey);
  return match ? String(match[1] || '') : '';
};

const parseDateValue = (value: string): Date | null => {
  if (!value) return null;

  // Numeric serial date (Google Sheets)
  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = parseFloat(value);
    if (!Number.isNaN(serial) && serial > 20000) {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  // ISO or standard parse
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  // Try replacing space with T for datetime
  const alt = new Date(value.replace(' ', 'T'));
  if (!Number.isNaN(alt.getTime())) return alt;

  // dd/MM/yyyy or dd-MM-yyyy
  const match = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10) < 100 ? 2000 + parseInt(match[3], 10) : parseInt(match[3], 10);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const formatDateDisplay = (value: string, withTime = false): string => {
  const date = parseDateValue(value);
  if (!date) return '';
  const options: Intl.DateTimeFormatOptions = withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Intl.DateTimeFormat('id-ID', options).format(date);
};

const formatDateValue = (row: Record<string, string>, key: string, rawValue?: string): string => {
  const value = rawValue || findValueByKey(row, key);
  if (!value) return '';
  const withTime = /timestamp/i.test(key) || value.includes(':');
  return formatDateDisplay(value, withTime) || value;
};

const getRowDateSortValue = (row: Record<string, string>, dateKeys: string[]): number => {
  for (const key of dateKeys) {
    const value = findValueByKey(row, key);
    const parsed = parseDateValue(value);
    if (parsed) return parsed.getTime();
  }
  // fallback to row index if no date
  const rowIndex = parseInt(row['_rowIndex'] || '0', 10);
  return rowIndex ? rowIndex : 0;
};

// ===================== MultiSelectCheckbox Component =====================

interface MultiSelectCheckboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  loading: boolean;
  placeholder?: string;
  allowCreate?: boolean;
  createLabel?: string;
  onCreateOption?: (value: string) => Promise<void> | void;
}

function MultiSelectCheckbox({
  value,
  onChange,
  options,
  loading,
  placeholder,
  allowCreate,
  createLabel,
  onCreateOption,
}: MultiSelectCheckboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newOption, setNewOption] = useState('');
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value: stored as comma-separated string
  const selectedItems = useMemo(() => {
    if (!value) return [] as string[];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  useEffect(() => {
    if (!searchTerm) {
      setNewOption('');
      return;
    }
    if (filteredOptions.length === 0) {
      setNewOption(searchTerm);
    }
  }, [searchTerm, filteredOptions.length]);

  const toggleItem = (item: string) => {
    let newSelected: string[];
    if (selectedItems.includes(item)) {
      newSelected = selectedItems.filter(s => s !== item);
    } else {
      newSelected = [...selectedItems, item];
    }
    onChange(newSelected.join(', '));
  };

  const removeItem = (item: string) => {
    const newSelected = selectedItems.filter(s => s !== item);
    onChange(newSelected.join(', '));
  };

  const selectAll = () => {
    onChange(options.join(', '));
  };

  const clearAll = () => {
    onChange('');
  };

  const handleCreate = async () => {
    if (!onCreateOption) return;
    const trimmed = newOption.trim();
    if (!trimmed) return;
    try {
      setCreating(true);
      await onCreateOption(trimmed);
      setNewOption('');
      setSearchTerm('');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-gray-400">Memuat opsi...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[44px] px-3 py-2 border rounded-xl text-sm cursor-pointer transition-all flex items-center gap-2 flex-wrap ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {selectedItems.length === 0 ? (
          <span className="text-gray-400">{placeholder || 'Pilih...'}</span>
        ) : (
          <>
            {selectedItems.map(item => (
              <span
                key={item}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200"
              >
                {item}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item);
                  }}
                  className="text-blue-400 hover:text-blue-700 transition-colors ml-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </>
        )}
        <ChevronDown
          size={16}
          className={`ml-auto text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[120] mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">
              {selectedItems.length} dari {options.length} dipilih
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Pilih Semua
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Hapus Semua
              </button>
            </div>
          </div>

          {allowCreate && onCreateOption && filteredOptions.length === 0 && searchTerm && (
            <div className="px-3 py-3 border-b border-gray-100 bg-white">
              <p className="text-xs text-gray-500 mb-2">Opsi tidak ditemukan. Tambahkan baru:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder={createLabel ? `Tambah ${createLabel}...` : 'Tambah opsi...'}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !newOption.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {creating ? 'Menyimpan...' : 'Tambah'}
                </button>
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                {searchTerm ? 'Tidak ditemukan' : 'Tidak ada opsi'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedItems.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleItem(option)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all text-left ${
                      isSelected
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className={isSelected ? 'font-medium' : ''}>{option}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== CrudPage Component =====================

export default function CrudPage({ title, sheetKey, fields, modalSize = 'md', cabangField = 'Cabang', filters = [], autoReplaceKeys = [], autoFillOnMatch = false }: CrudPageProps) {
  const [data, setData] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, string> | null>(null);
  const [editingRecord, setEditingRecord] = useState<Record<string, string> | null>(null);
  const [viewRecord, setViewRecord] = useState<Record<string, string> | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [cachedInfo, setCachedInfo] = useState<string>('');
  const [asyncOptionsMap, setAsyncOptionsMap] = useState<Record<string, string[]>>({});
  const [asyncOptionsLoading, setAsyncOptionsLoading] = useState<Record<string, boolean>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importRecords, setImportRecords] = useState<Record<string, string>[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [filterOptionsMap, setFilterOptionsMap] = useState<Record<string, string[]>>({});
  const [filterOptionsLoading, setFilterOptionsLoading] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { user } = useAuth();

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const updateCacheInfo = useCallback(() => {
    const age = getCacheAge(sheetKey);
    if (age !== null) {
      const seconds = Math.floor(age / 1000);
      if (seconds < 60) {
        setCachedInfo(`${seconds}d lalu`);
      } else if (seconds < 3600) {
        setCachedInfo(`${Math.floor(seconds / 60)}m lalu`);
      } else {
        setCachedInfo('');
      }
    } else {
      setCachedInfo('');
    }
  }, [sheetKey]);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const result = await fetchAllData(sheetKey, forceRefresh);
      setData(result);
      updateCacheInfo();
      if (forceRefresh) {
        showToast('success', `Data berhasil di-refresh (${result.length} data)`);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal memuat data');
    }
    setLoading(false);
    setRefreshing(false);
  }, [sheetKey, updateCacheInfo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!filters.length) return;
    const initialFilters: Record<string, string> = {};
    filters.forEach((filter) => {
      initialFilters[filter.key] = '';
    });
    setFilterState((prev) => ({ ...initialFilters, ...prev }));
  }, [filters]);

  // Filter data based on user role
  const filteredData = useMemo(() => {
    if (!user || user.isAdmin) return data;
    if (sheetKey === 'pengajar') return data;

    return data.filter((row) => {
      const rowCabang = (row[cabangField] || '').trim().toLowerCase();
      const userCabang = (user.cabang || '').trim().toLowerCase();
      return rowCabang === userCabang;
    });
  }, [data, user, cabangField, sheetKey]);

  const loadFilterOptions = useCallback(async () => {
    if (!filters.length) return;
    const loadingState: Record<string, boolean> = {};
    filters.forEach((filter) => {
      if (filter.asyncOptions) {
        loadingState[filter.key] = true;
      }
    });
    if (Object.keys(loadingState).length) {
      setFilterOptionsLoading((prev) => ({ ...prev, ...loadingState }));
    }

    await Promise.all(
      filters.map(async (filter) => {
        if (!filter.asyncOptions) {
          if (filter.options) {
            setFilterOptionsMap((prev) => ({ ...prev, [filter.key]: filter.options || [] }));
          }
          return;
        }
        try {
          const options = await filter.asyncOptions();
          setFilterOptionsMap((prev) => ({ ...prev, [filter.key]: options }));
        } catch (err) {
          console.error(`Failed to load filter options for ${filter.key}:`, err);
          setFilterOptionsMap((prev) => ({ ...prev, [filter.key]: filter.options || [] }));
        } finally {
          setFilterOptionsLoading((prev) => ({ ...prev, [filter.key]: false }));
        }
      })
    );
  }, [filters]);

  const filterOptionsFilteredByCabang = useMemo(() => {
    if (!filters.length) return filterOptionsMap;

    const cabangKey = cabangField;
    const cabangValue = user?.isAdmin
      ? (filterState[cabangKey] || '')
      : (user?.cabang || '');

    const baseData = cabangValue
      ? filteredData.filter((row) => (row[cabangKey] || '').trim().toLowerCase() === cabangValue.toLowerCase())
      : filteredData;

    const next: Record<string, string[]> = {};
    filters.forEach((filter) => {
      if (filter.key === cabangKey) {
        if (user && !user.isAdmin) {
          next[filter.key] = cabangValue ? [cabangValue] : [];
          return;
        }
        const cabangSet = new Set<string>();
        filteredData.forEach((row) => {
          const cabang = (row[cabangKey] || '').trim();
          if (cabang) cabangSet.add(cabang);
        });
        next[filter.key] = Array.from(cabangSet).sort();
        return;
      }
      if (filter.key === 'Kelompok Kelas' || filter.key.toLowerCase().includes('kelompok')) {
        const kelasSet = new Set<string>();
        baseData.forEach((row) => {
          const kelasValues = (row['Kelompok Kelas'] || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
          kelasValues.forEach((item) => kelasSet.add(item));
        });
        next[filter.key] = Array.from(kelasSet).sort();
        return;
      }
      if (filter.key === 'Jenjang Studi' || filter.key.toLowerCase().includes('jenjang')) {
        const jenjangSet = new Set<string>();
        baseData.forEach((row) => {
          const jenjangValue = (row['Jenjang Studi'] || '').trim();
          if (jenjangValue) jenjangSet.add(jenjangValue);
        });
        next[filter.key] = Array.from(jenjangSet).sort();
        return;
      }
      next[filter.key] = filterOptionsMap[filter.key] || filter.options || [];
    });
    return next;
  }, [filterOptionsMap, filters, user, cabangField, filteredData, filterState]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // Update cache info every 30 seconds
  useEffect(() => {
    const interval = setInterval(updateCacheInfo, 30000);
    return () => clearInterval(interval);
  }, [updateCacheInfo]);

  const filterableData = useMemo(() => {
    if (!filters.length) return filteredData;
    return filteredData.filter((row) => {
      return filters.every((filter) => {
        const selectedValue = (filterState[filter.key] || '').trim();
        if (!selectedValue) return true;
        const rowValue = findValueByKey(row, filter.key);
        if (!rowValue) return false;
        if (filter.mode === 'includes') {
          return rowValue.toLowerCase().includes(selectedValue.toLowerCase());
        }
        return rowValue.trim().toLowerCase() === selectedValue.toLowerCase();
      });
    });
  }, [filteredData, filters, filterState]);

  const dateKeys = useMemo(() => {
    const keys = fields
      .filter((f) => f.type === 'date')
      .map((f) => f.key);
    const hasTimestamp = fields.some((f) => /timestamp/i.test(f.key));
    if (hasTimestamp) {
      keys.push('Timestamp');
    }
    if (!keys.includes('Timestamp')) {
      keys.push('Timestamp');
    }
    return keys;
  }, [fields]);

  const sortedData = useMemo(() => {
    const rows = [...filterableData];
    rows.sort((a, b) => getRowDateSortValue(b, dateKeys) - getRowDateSortValue(a, dateKeys));
    return rows;
  }, [filterableData, dateKeys]);

  const handleRefresh = () => loadData(true);

  const handleOpenImport = () => {
    if (!apiConfigured) {
      showToast('warning', 'Apps Script belum dikonfigurasi.');
      return;
    }
    setImportError('');
    setImportRecords([]);
    setImportPreview([]);
    setImportOpen(true);
  };

  const templateFields = useMemo(
    () => (user && !user.isAdmin ? fields.filter((field) => field.key !== cabangField) : fields),
    [fields, user, cabangField]
  );

  const handleTemplateDownload = () => {
    const blob = generateTemplateWorkbook(templateFields, `Template_${title}`);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Template_${title.replace(/\s+/g, '_')}.xlsx`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleImportFileChange = async (file: File | null) => {
    if (!file) return;
    setImportLoading(true);
    setImportError('');
    const result = await parseSpreadsheetFile(file, fields);
    if (result.error) {
      setImportError(result.error);
      setImportPreview([]);
      setImportRecords([]);
    } else {
      setImportPreview(result.preview);
      setImportRecords(result.records);
    }
    setImportLoading(false);
  };

  const handleImportSubmit = async () => {
    if (!apiConfigured) {
      showToast('warning', 'Apps Script belum dikonfigurasi.');
      return;
    }
    if (importRecords.length === 0) {
      setImportError('Tidak ada data untuk diimport.');
      return;
    }
    setImportLoading(true);

    const recordsToImport = user && !user.isAdmin && cabangField
      ? importRecords.map((record) => ({
          ...record,
          [cabangField]: user.cabang || record[cabangField] || '',
        }))
      : importRecords;

    const result = await createBulkRecords(sheetKey, recordsToImport);
    if (result.success) {
      showToast('success', `✅ ${result.totalAdded || recordsToImport.length} data berhasil diimport!`);
      setImportOpen(false);
      setImportRecords([]);
      setImportPreview([]);
      await loadData(true);
    } else {
      setImportError(result.message);
    }
    setImportLoading(false);
  };

  // Load async options when modal opens
  const loadAsyncOptions = useCallback(async () => {
    const asyncFields = fields.filter(f => f.type === 'multiselect-checkbox' && f.asyncOptions);
    if (asyncFields.length === 0) return;

    const loadingState: Record<string, boolean> = {};
    asyncFields.forEach(f => { loadingState[f.key] = true; });
    setAsyncOptionsLoading(prev => ({ ...prev, ...loadingState }));

    await Promise.all(
      asyncFields.map(async (field) => {
        try {
          const options = await field.asyncOptions!();
          setAsyncOptionsMap(prev => ({ ...prev, [field.key]: options }));
        } catch (err) {
          console.error(`Failed to load options for ${field.key}:`, err);
          setAsyncOptionsMap(prev => ({ ...prev, [field.key]: field.options || [] }));
        } finally {
          setAsyncOptionsLoading(prev => ({ ...prev, [field.key]: false }));
        }
      })
    );
  }, [fields]);

  const openAddModal = () => {
    if (!isAppsScriptConfigured()) {
      showToast('warning', 'Apps Script belum dikonfigurasi. Buka Pengaturan.');
      return;
    }
    setEditingRecord(null);
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      if (!f.hideInForm) {
        if (f.key === cabangField && user && !user.isAdmin && user.cabang) {
          initial[f.key] = user.cabang;
        } else {
          initial[f.key] = '';
        }
      }
    });
    setFormData(initial);
    setModalOpen(true);
    loadAsyncOptions();
  };

  const handleAutoFillOnMatch = useCallback((nextFormData: Record<string, string>) => {
    if (!autoFillOnMatch || !autoReplaceKeys.length) return;

    const match = data.find((row) =>
      autoReplaceKeys.every((key) =>
        String(row[key] || '').trim().toLowerCase() ===
          String(nextFormData[key] || '').trim().toLowerCase()
      )
    );

    if (!match) return;

    const filled: Record<string, string> = { ...nextFormData };
    fields.forEach((field) => {
      if (field.type === 'date') {
        const dateValue = formatDateValue(match, field.key, match[field.key]);
        const parsed = parseDateValue(dateValue) || parseDateValue(match[field.key] || '');
        filled[field.key] = parsed ? parsed.toISOString().slice(0, 10) : '';
      } else {
        filled[field.key] = match[field.key] || '';
      }
    });
    setFormData(filled);
    showToast('warning', 'Data sudah ada. Form otomatis terisi untuk pembaruan.');
  }, [autoFillOnMatch, autoReplaceKeys, data, fields]);

  const openEditModal = (row: Record<string, string>) => {
    if (!isAppsScriptConfigured()) {
      showToast('warning', 'Apps Script belum dikonfigurasi. Buka Pengaturan.');
      return;
    }
    setEditingRecord(row);
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.type === 'date') {
        const dateValue = formatDateValue(row, f.key, row[f.key]);
        const parsed = parseDateValue(dateValue) || parseDateValue(row[f.key] || '');
        initial[f.key] = parsed ? parsed.toISOString().slice(0, 10) : '';
      } else {
        initial[f.key] = row[f.key] || '';
      }
    });
    setFormData(initial);
    setModalOpen(true);
    loadAsyncOptions();
  };

  const openViewModal = (row: Record<string, string>) => {
    setViewRecord(row);
    setViewModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingRecord) {
        const rowIndex = parseInt(editingRecord['_rowIndex'] || '0');
        if (rowIndex < 2) {
          showToast('error', 'Row index tidak valid untuk update');
          setSubmitting(false);
          return;
        }
        const result = await updateRecord(sheetKey, rowIndex, formData);
        if (result.success) {
          showToast('success', '✅ Data berhasil diperbarui!');
          setModalOpen(false);
          await loadData(true);
        } else {
          showToast('error', result.message);
        }
      } else {
        if (autoReplaceKeys.length > 0) {
          const match = data.find((row) =>
            autoReplaceKeys.every((key) =>
              String(row[key] || '').trim().toLowerCase() ===
                String(formData[key] || '').trim().toLowerCase()
            )
          );
          if (match && match['_rowIndex']) {
            const rowIndex = parseInt(match['_rowIndex'] || '0');
            if (rowIndex >= 2) {
              const result = await updateRecord(sheetKey, rowIndex, formData);
              if (result.success) {
                showToast('success', '✅ Data sudah ada, diperbarui otomatis!');
                setModalOpen(false);
                await loadData(true);
              } else {
                showToast('error', result.message);
              }
              setSubmitting(false);
              return;
            }
          }
        }

        const result = await createRecord(sheetKey, formData);
        if (result.success) {
          showToast('success', '✅ Data berhasil ditambahkan!');
          setModalOpen(false);
          await loadData(true);
        } else {
          showToast('error', result.message);
        }
      }
    } catch (err) {
      showToast('error', `Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    if (!isAppsScriptConfigured()) {
      showToast('warning', 'Apps Script belum dikonfigurasi.');
      setDeleteConfirm(null);
      return;
    }

    setSubmitting(true);
    try {
      const rowIndex = parseInt(deleteConfirm['_rowIndex'] || '0');
      if (rowIndex < 2) {
        showToast('error', 'Row index tidak valid untuk hapus');
        setSubmitting(false);
        setDeleteConfirm(null);
        return;
      }
      const result = await deleteRecord(sheetKey, rowIndex);
      if (result.success) {
        showToast('success', '✅ Data berhasil dihapus!');
        setDeleteConfirm(null);
        await loadData(true);
      } else {
        showToast('error', result.message);
      }
    } catch (err) {
      showToast('error', `Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
    setSubmitting(false);
  };

  const handleExportCSV = () => {
    if (sortedData.length === 0) return;
    const blob = exportRecordsWorkbook(fields, sortedData, title);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const columns = fields.map((f) => ({
    key: f.key,
    label: f.label,
    width: f.width,
    render: f.render
      ? f.render
      : f.type === 'date'
        ? (value: string, row: Record<string, string>) => formatDateValue(row, f.key, value) || '-'
        : undefined,
  }));

  const formFields = fields.filter((f) => !f.hideInForm);
  const apiConfigured = isAppsScriptConfigured();
  const isFiltered = user && !user.isAdmin && sheetKey !== 'pengajar';

  useEffect(() => {
    if (!modalOpen || editingRecord) return;
    handleAutoFillOnMatch(formData);
  }, [formData, modalOpen, editingRecord, handleAutoFillOnMatch]);

  const handleAddOption = async (field: FieldConfig, newValueParam?: string) => {
    if (!field.canCreateOption) return;
    if (!field.asyncOptions && (!field.options || field.options.length === 0)) return;
    const inputValue = newValueParam ?? window.prompt(`Tambah ${field.createOptionLabel || field.label} baru:`) ?? '';
    const newValue = inputValue ? inputValue.trim() : '';
    if (!newValue) return;

    try {
      const result = await createRecord('kelompokKelas', { 'Kelompok Kelas': newValue });
      if (result.success) {
        if (field.asyncOptions) {
          const refreshed = await field.asyncOptions();
          setAsyncOptionsMap((prev) => {
            const current = prev[field.key] || [];
            const merged = Array.from(new Set([...(current || []), ...(refreshed || []), newValue])).sort();
            return { ...prev, [field.key]: merged };
          });
        } else {
          setAsyncOptionsMap((prev) => ({
            ...prev,
            [field.key]: Array.from(new Set([...(prev[field.key] || []), newValue])).sort(),
          }));
        }
        showToast('success', `Kelompok Kelas "${newValue}" berhasil ditambahkan.`);
        return;
      }
      showToast('error', result.message);
    } catch (error) {
      showToast('error', `Gagal menambahkan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[200] max-w-md animate-in flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={20} className="flex-shrink-0" />
          ) : toast.type === 'error' ? (
            <XCircle size={20} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0" />
          )}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-current opacity-60 hover:opacity-100 text-lg leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <p className="text-gray-500 text-sm">
              Total: {sortedData.length} data
              {isFiltered && data.length !== sortedData.length && (
                <span className="text-gray-400"> (dari {data.length} total)</span>
              )}
            </p>
            {cachedInfo && (
              <span className="text-gray-400 text-xs">📦 cache {cachedInfo}</span>
            )}
            {(loading || refreshing) && (
              <span className="inline-flex items-center gap-2 text-xs text-blue-600">
                <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                Memuat data...
              </span>
            )}
            {apiConfigured && (
              <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                <CheckCircle size={12} /> CRUD
              </span>
            )}
            {isFiltered && (
              <span className="inline-flex items-center gap-1 text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded-full">
                <Filter size={12} /> {user?.cabang}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={sortedData.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={handleOpenImport}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md ${
              apiConfigured
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                : 'bg-gray-400 text-white cursor-not-allowed shadow-gray-200'
            }`}
          >
            <UploadCloud size={16} />
            Import
          </button>
          <button
            onClick={openAddModal}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md ${
              apiConfigured
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                : 'bg-gray-400 text-white cursor-not-allowed shadow-gray-200'
            }`}
          >
            <Plus size={16} />
            Tambah Data
          </button>
        </div>
      </div>

      {/* Cabang Filter Info */}
      {isFiltered && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <MapPin size={18} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Menampilkan data cabang <strong>{user?.cabang}</strong>.
          </p>
        </div>
      )}

      {filters.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">Filter Data</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => {
              const options = filterOptionsFilteredByCabang[filter.key] || filterOptionsMap[filter.key] || filter.options || [];
              const loadingOptions = filterOptionsLoading[filter.key];
              return (
                <div key={filter.key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{filter.label}</label>
                  <SearchableSelect
                    value={filterState[filter.key] || ''}
                    onChange={(val) => setFilterState((prev) => ({ ...prev, [filter.key]: val }))}
                    options={options}
                    placeholder={filter.placeholder || `Semua ${filter.label}`}
                    disabled={loadingOptions}
                    size="sm"
                  />
                  {loadingOptions && (
                    <p className="text-xs text-gray-400 mt-1">Memuat opsi...</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>Menampilkan {sortedData.length} data setelah filter.</span>
            <button
              type="button"
              onClick={() => setFilterState(() => {
                const reset: Record<string, string> = {};
                filters.forEach((filter) => { reset[filter.key] = ''; });
                return reset;
              })}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset Filter
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-6 shadow-sm">
        <DataTable
          columns={columns}
          data={sortedData}
          loading={loading || refreshing}
          onView={openViewModal}
          onEdit={apiConfigured ? openEditModal : undefined}
          onDelete={apiConfigured ? (row) => setDeleteConfirm(row) : undefined}
        />
      </div>

      {/* Import Modal */}
      <Modal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title={`Import Data ${title}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium">Panduan Import (Excel):</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Gunakan template Excel (.xlsx) yang sudah disediakan.</li>
              <li>Pastikan header sesuai dengan kolom pada server database.</li>
              <li>Kolom Timestamp tidak perlu diisi.</li>
            </ul>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleTemplateDownload}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                <FileDown size={14} />
                Download Template
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => handleImportFileChange(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium hover:file:bg-blue-700"
          />

          {importLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              Membaca file...
            </div>
          )}

          {importError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={16} />
              {importError}
            </div>
          )}

          {importPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Preview data (5 baris pertama):</p>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {Object.keys(importPreview[0]).map((key) => (
                        <th key={key} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importPreview.map((row, idx) => (
                      <tr key={idx}>
                        {Object.keys(importPreview[0]).map((key) => (
                          <td key={key} className="px-3 py-2 text-gray-600">
                            {row[key] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">Total data terdeteksi: {importRecords.length}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={importLoading || importRecords.length === 0}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-md disabled:opacity-60"
            >
              Import Data
            </button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRecord ? `Edit ${title}` : `Tambah ${title}`}
        size={modalSize}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields.map((field) => {
              const isCabangFieldForNonAdmin = field.key === cabangField && user && !user.isAdmin;

              return (
                <div key={field.key} className={field.colSpan === 2 || field.type === 'multiselect-checkbox' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    {isCabangFieldForNonAdmin && (
                      <span className="text-blue-500 text-xs ml-2">(otomatis)</span>
                    )}
                    {field.type === 'multiselect-checkbox' && (
                      <span className="text-gray-400 text-xs ml-2">(bisa pilih lebih dari 1)</span>
                    )}
                  </label>
                  {field.type === 'multiselect-checkbox' ? (
                    <div className="space-y-2">
                      <MultiSelectCheckbox
                        value={formData[field.key] || ''}
                        onChange={(val) => setFormData((prev) => ({ ...prev, [field.key]: val }))}
                        options={asyncOptionsMap[field.key] || field.options || []}
                        loading={asyncOptionsLoading[field.key] || false}
                        placeholder={`Pilih ${field.label}...`}
                        allowCreate={field.canCreateOption && apiConfigured}
                        createLabel={field.createOptionLabel || field.label}
                        onCreateOption={field.canCreateOption && apiConfigured ? (val) => handleAddOption(field, val) : undefined}
                      />
                    </div>
                  ) : field.type === 'select' ? (
                    <div className="space-y-2">
                      <SearchableSelect
                        value={formData[field.key] || ''}
                        onChange={(val) => setFormData((prev) => ({ ...prev, [field.key]: val }))}
                        options={field.options || []}
                        placeholder={`Pilih ${field.label}`}
                        disabled={!!isCabangFieldForNonAdmin}
                      />
                      {field.required && (
                        <input
                          type="text"
                          value={formData[field.key] || ''}
                          onChange={() => undefined}
                          required
                          className="hidden"
                          readOnly
                        />
                      )}
                    </div>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      required={field.required}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      required={field.required}
                      readOnly={!!isCabangFieldForNonAdmin}
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                        isCabangFieldForNonAdmin ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {editingRecord ? 'Simpan Perubahan' : 'Tambah Data'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModal}
        onClose={() => setViewModal(false)}
        title={`Detail ${title}`}
        size={modalSize}
      >
        {viewRecord && (
          <div className="space-y-3">
            {fields.map((field) => (
              <div
                key={field.key}
                className="flex flex-col sm:flex-row sm:items-start gap-1 py-2.5 border-b border-gray-50 last:border-0"
              >
                <span className="text-sm font-medium text-gray-500 sm:w-48 flex-shrink-0">{field.label}</span>
                <span className="text-sm text-gray-800 break-all">
                  {field.type === 'date'
                    ? formatDateValue(viewRecord, field.key) || '-'
                    : viewRecord[field.key] || '-'}
                </span>
              </div>
            ))}
            {viewRecord['Timestamp'] && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2.5 bg-gray-50 rounded-lg px-3">
                <span className="text-sm font-medium text-gray-500 sm:w-48 flex-shrink-0">Timestamp</span>
                <span className="text-sm text-gray-600">{viewRecord['Timestamp']}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Konfirmasi Hapus"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle size={22} className="text-red-600" />
            </div>
            <p className="text-sm text-red-700">
              Apakah Anda yakin ingin menghapus data ini? Data <strong>tidak dapat dikembalikan</strong>.
            </p>
          </div>
          {deleteConfirm && (
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1.5">
              {fields.slice(0, 4).map((f) => (
                <div key={f.key} className="flex gap-2">
                  <span className="font-medium text-gray-500 min-w-[80px]">{f.label}:</span>
                  <span className="text-gray-700">{deleteConfirm[f.key] || '-'}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteConfirm(null)}
              disabled={submitting}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all shadow-md disabled:opacity-60 inline-flex items-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
