import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  onOpen?: () => void;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih...',
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (containerRef.current && containerRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
      setSearchTerm('');
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const updateRect = () => {
      if (buttonRef.current) {
        setDropdownRect(buttonRef.current.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const selectedLabel = value || '';

  const basePadding = size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          if (disabled || loading) return;
          // notify parent before opening so it can refresh options
          if (!open && typeof onOpen === 'function') {
            try { onOpen(); } catch {}
          }
          setOpen((prev) => !prev);
        }}
        className={`w-full ${basePadding} border rounded-xl ${textSize} text-left flex items-center gap-2 transition-all relative ${
          disabled || loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:border-gray-300'
        } ${open ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'}`}
      >
        <span className={selectedLabel ? 'text-gray-700' : 'text-gray-400'}>
          {loading ? 'Memuat...' : selectedLabel || placeholder}
        </span>
        {selectedLabel && !disabled && (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onChange('');
            }}
            className="ml-auto text-gray-300 hover:text-gray-500"
          >
            <X size={14} />
          </span>
        )}
        <ChevronDown
          size={16}
          className={`ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && !disabled && !loading && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          data-select-dropdown
          style={{
            position: 'fixed',
            top: dropdownRect.bottom,
            left: dropdownRect.left,
            width: dropdownRect.width,
            zIndex: 9999,
          }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in"
        >
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
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                {searchTerm ? 'Tidak ditemukan' : 'Tidak ada opsi'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option === value;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                      setSearchTerm('');
                    }}
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
        </div>,
        document.body
      )}
    </div>
  );
}
