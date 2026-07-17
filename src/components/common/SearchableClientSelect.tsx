import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { CompanyProfile } from '../../../types';

interface SearchableClientSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CompanyProfile[];
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  allowClear?: boolean;
}

const formatCompanyNameWithType = (name: string, clientType?: string) => {
  if (!name) return '';
  if (!clientType) return name;

  const typeMap: Record<string, string> = {
    PT: 'PT',
    CV: 'CV',
    YAYASAN: 'Yayasan',
    PERKUMPULAN: 'Perkumpulan',
    PERSEKUTUAN_FIRMA: 'Firma',
    PERSEKUTUAN_PERDATA: 'Persekutuan Perdata',
    KOPERASI: 'Koperasi',
    PMA: 'PMA',
    PERORANGAN: 'Perorangan',
  };

  const prefix = typeMap[clientType];
  if (!prefix) return name;

  const trimmedName = name.trim();
  const lowerName = trimmedName.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();

  if (
    lowerName.startsWith(lowerPrefix + ' ') ||
    lowerName.startsWith(lowerPrefix + '.') ||
    lowerName === lowerPrefix
  ) {
    return trimmedName;
  }

  return `${prefix} ${trimmedName}`;
};

export const SearchableClientSelect: React.FC<SearchableClientSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "-- Pilih Klien Registrasi --",
  className = "w-full",
  selectClassName = "w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all flex items-center justify-between cursor-pointer",
  allowClear = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const selectedOption = options.find(opt => opt.id === value);

  const filteredOptions = options.filter(opt => {
    const formatted = formatCompanyNameWithType(opt.companyName || '', opt.clientType);
    return formatted.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={selectClassName}
      >
        <span className={selectedOption ? "text-slate-800 truncate pr-2" : "text-slate-400 truncate pr-2"}>
          {selectedOption ? formatCompanyNameWithType(selectedOption.companyName, selectedOption.clientType) : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full outline-none text-[13px] bg-transparent"
              placeholder="Cari nama klien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <X
                className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600"
                onClick={() => setSearch('')}
              />
            )}
          </div>
          <div className="overflow-y-auto overflow-x-hidden flex-1 p-1">
            {allowClear && (
              <div
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`px-3 py-2 text-[13px] rounded-md cursor-pointer hover:bg-slate-100 transition-colors ${
                  value === '' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 italic'
                }`}
              >
                {placeholder}
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[13px] text-slate-500 text-center">
                Klien tidak ditemukan.
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id!);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-3 py-2 text-[13px] rounded-md cursor-pointer hover:bg-slate-100 transition-colors ${
                    value === opt.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  {formatCompanyNameWithType(opt.companyName, opt.clientType)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
