
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Search, ChevronDown, X } from 'lucide-react';
import { Address } from '../types';
import { toTitleCase } from '../utils/formatters';

// Searchable dropdown component with custom color support
export const SearchableSelect: React.FC<{
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (option: { id: string; name: string } | null) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder: string;
  accentColor?: 'indigo' | 'slate' | 'teal' | 'blue' | 'rose';
}> = ({ label, value, options, onChange, loading, disabled, placeholder, accentColor = 'indigo' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Map colors for Tailwind JIT safety
  const colors = {
    indigo: {
      ring: 'ring-indigo-500',
      border: 'border-indigo-500',
      focusBorder: 'focus:border-indigo-500',
      hover: 'hover:border-indigo-400',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      loader: 'text-indigo-500'
    },
    slate: {
      ring: 'ring-slate-500',
      border: 'border-slate-500',
      focusBorder: 'focus:border-slate-500',
      hover: 'hover:border-slate-400',
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      loader: 'text-slate-500'
    },
    teal: {
      ring: 'ring-teal-500',
      border: 'border-teal-500',
      focusBorder: 'focus:border-teal-500',
      hover: 'hover:border-teal-400',
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      loader: 'text-teal-500'
    },
    blue: {
      ring: 'ring-blue-500',
      border: 'border-blue-500',
      focusBorder: 'focus:border-blue-500',
      hover: 'hover:border-blue-400',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      loader: 'text-blue-500'
    },
    rose: {
      ring: 'ring-rose-500',
      border: 'border-rose-500',
      focusBorder: 'focus:border-rose-500',
      hover: 'hover:border-rose-400',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      loader: 'text-rose-500'
    }
  };

  const activeColor = colors[accentColor];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 100);

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex justify-between items-center px-1">
        {label} {loading && <Loader2 className={`w-3 h-3 animate-spin ${activeColor.loader}`} />}
      </label>
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 border rounded-xl flex items-center justify-between cursor-pointer transition-all bg-white shadow-sm ${
          disabled ? 'bg-slate-50 cursor-not-allowed border-slate-200' : `border-slate-300 ${activeColor.hover}`
        } ${isOpen ? `ring-2 ${activeColor.ring} ${activeColor.border}` : ''}`}
      >
        <span className={`text-sm truncate ${!value ? 'text-slate-500 italic' : 'text-slate-800 font-semibold'}`}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-[100] w-full mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-150 overflow-hidden ring-1 ring-slate-900/5">
          <div className="p-3 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                autoFocus
                type="text"
                className={`w-full pl-10 pr-10 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 ${activeColor.ring} ${activeColor.focusBorder} bg-slate-50/50`}
                placeholder="Cari..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setSearch(''); }}
                  className="absolute right-3 top-2.5 p-0.5 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt.id}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-4 py-3 text-sm rounded-xl cursor-pointer transition-all ${
                    value === opt.name ? `${activeColor.bg} ${activeColor.text} font-bold shadow-inner` : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
                >
                  {opt.name}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-xs text-slate-400 text-center italic flex flex-col items-center gap-2">
                <Search className="w-6 h-6 opacity-20" />
                Data tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// DomicileSelector fetches all cities in Indonesia for global search at City/Regency level
export const DomicileSelector: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  accentColor?: 'indigo' | 'slate' | 'teal' | 'blue' | 'rose';
}> = ({ label, value, onChange, accentColor = 'indigo' }) => {
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllRegencies = async () => {
      setLoading(true);
      try {
        const pRes = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
        const provinces = await pRes.json();
        
        const regencyPromises = provinces.map((p: any) => 
          fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${p.id}.json`).then(res => res.json())
        );
        
        const regencyResults = await Promise.all(regencyPromises);
        const allRegencies = regencyResults.flat().map((item: any) => ({
          id: item.id,
          name: toTitleCase(item.name)
        }));
        
        setOptions(allRegencies.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllRegencies();
  }, []);

  return (
    <SearchableSelect
      label={label}
      value={value}
      options={options}
      loading={loading}
      placeholder="Cari Kota/Kabupaten..."
      accentColor={accentColor}
      onChange={(opt) => onChange(opt?.name || '')}
    />
  );
};

// Grouped region selector for full addresses
export const IndoRegionSelector: React.FC<{
  address: Address;
  onUpdate: (updates: Partial<Address>) => void;
  accentColor?: 'indigo' | 'slate' | 'teal' | 'blue' | 'rose';
  hideStreetAndRT?: boolean;
}> = ({ address, onUpdate, accentColor = 'indigo', hideStreetAndRT = false }) => {
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [regencies, setRegencies] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [villages, setVillages] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState({ p: false, r: false, d: false, v: false });
  const [ids, setIds] = useState({ p: '', r: '', d: '' });

  const isRegency = address.city?.toLowerCase().includes('kabupaten');
  const villageLabel = isRegency ? 'Desa' : 'Kelurahan/Desa';

  // Map focus colors for standard inputs
  const focusRingClasses = {
    indigo: 'focus:ring-indigo-500',
    slate: 'focus:ring-slate-500',
    teal: 'focus:ring-teal-500',
    blue: 'focus:ring-blue-500',
    rose: 'focus:ring-rose-500'
  };

  useEffect(() => {
    const fetchProvinces = async () => {
      setLoading(prev => ({ ...prev, p: true }));
      try {
        const res = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json');
        const data = await res.json();
        setProvinces(data.map((item: any) => ({ ...item, name: toTitleCase(item.name) })));
      } catch (err) { console.error(err); } 
      finally { setLoading(prev => ({ ...prev, p: false })); }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (address.province && !ids.p && provinces.length > 0) {
      const p = provinces.find(x => x.name === address.province);
      if (p) setIds(prev => ({ ...prev, p: p.id }));
    }
  }, [address.province, provinces]);

  useEffect(() => {
    if (!ids.p) { setRegencies([]); return; }
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${ids.p}.json`)
      .then(res => res.json())
      .then(data => setRegencies(data.map((item: any) => ({ ...item, name: toTitleCase(item.name) }))));
  }, [ids.p]);

  useEffect(() => {
    if (!ids.r) { setDistricts([]); return; }
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${ids.r}.json`)
      .then(res => res.json())
      .then(data => setDistricts(data.map((item: any) => ({ ...item, name: toTitleCase(item.name) }))));
  }, [ids.r]);

  useEffect(() => {
    if (!ids.d) { setVillages([]); return; }
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${ids.d}.json`)
      .then(res => res.json())
      .then(data => setVillages(data.map((item: any) => ({ ...item, name: toTitleCase(item.name) }))));
  }, [ids.d]);

  return (
    <div className="space-y-4">
      {!hideStreetAndRT && (
        <>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 px-1">Alamat Lengkap (Jalan / No / Blok)</label>
            <input 
              type="text" 
              value={address.fullAddress} 
              onChange={e => onUpdate({ fullAddress: e.target.value })}
              placeholder="CONTOH: JL. MERDEKA NO. 17 BLOK A"
              className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-4 ${focusRingClasses[accentColor].replace('focus:', 'focus:ring-')}/10 focus:border-slate-500 outline-none text-sm font-semibold transition-all`}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">RT</label>
              <input type="text" value={address.rt} onChange={e => onUpdate({ rt: e.target.value })} placeholder="000" className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-4 ${focusRingClasses[accentColor].replace('focus:', 'focus:ring-')}/10 outline-none text-sm font-bold`} />
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">RW</label>
              <input type="text" value={address.rw} onChange={e => onUpdate({ rw: e.target.value })} placeholder="000" className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-4 ${focusRingClasses[accentColor].replace('focus:', 'focus:ring-')}/10 outline-none text-sm font-bold`} />
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <div className="space-y-1">
          <SearchableSelect 
            label="Provinsi"
            value={address.province}
            options={provinces}
            loading={loading.p}
            placeholder="Pilih Provinsi"
            accentColor={accentColor}
            onChange={(opt) => {
              setIds({ p: opt?.id || '', r: '', d: '' });
              onUpdate({ province: opt?.name || '', city: '', kecamatan: '', kelurahan: '' });
            }}
          />
        </div>

        <div className="space-y-1">
          <SearchableSelect 
            label="Kabupaten/Kota"
            value={address.city}
            disabled={!ids.p}
            options={regencies}
            placeholder="Pilih Kabupaten/Kota"
            accentColor={accentColor}
            onChange={(opt) => {
              setIds(prev => ({ ...prev, r: opt?.id || '', d: '' }));
              onUpdate({ city: opt?.name || '', kecamatan: '', kelurahan: '' });
            }}
          />
        </div>

        <div className="space-y-1">
          <SearchableSelect 
            label="Kecamatan"
            value={address.kecamatan}
            disabled={!ids.r}
            options={districts}
            placeholder="Pilih Kecamatan"
            accentColor={accentColor}
            onChange={(opt) => {
              setIds(prev => ({ ...prev, d: opt?.id || '' }));
              onUpdate({ kecamatan: opt?.name || '', kelurahan: '' });
            }}
          />
        </div>

        <div className="space-y-1">
          <SearchableSelect 
            label={villageLabel}
            value={address.kelurahan}
            disabled={!ids.d}
            options={villages}
            placeholder={`Pilih ${villageLabel}`}
            accentColor={accentColor}
            onChange={(opt) => {
              onUpdate({ kelurahan: opt?.name || '' });
            }}
          />
        </div>
      </div>
    </div>
  );
};
