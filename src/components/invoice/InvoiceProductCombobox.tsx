import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '../../../types';
import { ProductService } from '../../services/ProductService';

export interface AvailableProductItem {
  id?: string;
  name: string;
  description: string;
  unitPrice: number;
  isTaxed: boolean;
  taxRate?: number;
  category?: string;
}

export const PRESET_PRODUCT_ITEMS: AvailableProductItem[] = [
  {
    name: 'AKTA PERUBAHAN PT SK',
    description: '1. Draft Notulen Sirkuler\n2. Akta RUPSLB\n3. Surat Keputusan (SK) AHU\n4. Surat Pelaporan AHU\n5. BNRI\n6. Akta Hibah Saham',
    unitPrice: 7435897,
    isTaxed: true,
    taxRate: 0.05
  },
  {
    name: 'Jasa Pembuatan Akta Notaris',
    description: '',
    unitPrice: 5000000,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Pendirian PT / CV',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Draft Notulen Sirkuler',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Akta RUPSLB',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Surat Keputusan (SK) AHU',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Surat Pelaporan AHU',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'BNRI (Berita Negara RI)',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Akta Hibah Saham',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Perjanjian Sewa Menyewa',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Perjanjian Kerjasama',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Legalisasi Dokumen',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  },
  {
    name: 'Warmerking Dokumen',
    description: '',
    unitPrice: 0,
    isTaxed: false,
    taxRate: 0.05
  }
];

export interface InvoiceProductComboboxProps {
  idx: number;
  description: string;
  onSelectProduct: (product: {
    name: string;
    description: string;
    unitPrice: number;
    isTaxed: boolean;
    taxRate?: number;
  }) => void;
  onDescriptionChange: (description: string) => void;
  formatCurrency: (val?: number) => string;
  isMobile?: boolean;
}

export const InvoiceProductCombobox: React.FC<InvoiceProductComboboxProps> = memo(({
  description,
  onSelectProduct,
  onDescriptionChange,
  formatCurrency,
  isMobile = false
}) => {
  const currentFirstLine = (description || '').split('\n')[0] || '';
  const [inputValue, setInputValue] = useState<string>(currentFirstLine);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<AvailableProductItem[]>(() => PRESET_PRODUCT_ITEMS);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const debounceTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const blurTimeoutRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  // Sync input value if description changes externally
  useEffect(() => {
    const firstLine = (description || '').split('\n')[0] || '';
    setInputValue(firstLine);
  }, [description]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Calculate and update dropdown fixed positioning with auto-flip
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();

    // If input is detached or invisible
    if (rect.width === 0 && rect.height === 0) return;

    const gap = 4;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    const PREFERRED_MAX_HEIGHT = isMobile ? 220 : 200;

    let maxHeight = PREFERRED_MAX_HEIGHT;
    let top = 0;
    let transform: string | undefined = undefined;

    // Auto flip: if space below is limited (< 170px) and above has more space
    if (spaceBelow < 170 && spaceAbove > spaceBelow) {
      maxHeight = Math.min(PREFERRED_MAX_HEIGHT, Math.max(100, spaceAbove - 12));
      top = rect.top - gap;
      transform = 'translateY(-100%)';
    } else {
      maxHeight = Math.min(PREFERRED_MAX_HEIGHT, Math.max(100, spaceBelow - 12));
      top = rect.bottom + gap;
    }

    // Width: match input width, with minimum 240px on desktop table so product names are clear
    let width = isMobile ? rect.width : Math.max(rect.width, 240);

    // Keep horizontally within viewport boundaries
    let left = rect.left;
    if (left + width > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - width - 8);
    }
    if (left < 8) {
      left = 8;
    }
    if (width > viewportWidth - 16) {
      width = viewportWidth - 16;
    }

    setDropdownStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
      transform,
      zIndex: 99999
    });
  }, [isMobile]);

  // Recalculate position on scroll (capture: true for container/table scroll) and resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScroll = () => {
      updatePosition();
    };
    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  // Re-calculate position when search results or searching state change
  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [searchResults, isSearching, isOpen, updatePosition]);

  // Close dropdown on click / touch outside both input and portal dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isOpen]);

  // Helper to execute search with debounce & abort
  const performSearch = useCallback((queryText: string) => {
    const trimmed = queryText.trim();
    const qLower = trimmed.toLowerCase();

    // 1. Instant match for presets
    const matchedPresets = trimmed
      ? PRESET_PRODUCT_ITEMS.filter(p => p.name.toLowerCase().includes(qLower))
      : PRESET_PRODUCT_ITEMS;

    // Show instant presets first while debounce is waiting
    setSearchResults(matchedPresets);

    // Cancel existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Abort existing in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Debounce API search by ~250ms
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsSearching(true);

      try {
        const apiProducts: Product[] = await ProductService.searchProducts(trimmed, {
          limit: 25,
          signal: controller.signal
        });

        if (!isMountedRef.current || abortControllerRef.current !== controller) {
          return;
        }

        const seenNames = new Set(matchedPresets.map(p => p.name.toLowerCase()));
        const mappedApi: AvailableProductItem[] = [];

        for (const p of apiProducts) {
          const pNameLower = (p.name || '').toLowerCase();
          if (!seenNames.has(pNameLower)) {
            seenNames.add(pNameLower);
            mappedApi.push({
              id: p.id,
              name: p.name,
              description: p.description || '',
              unitPrice: p.unitPrice || 0,
              isTaxed: !!p.isTaxed,
              taxRate: 0.05,
              category: p.category
            });
          }
        }

        setSearchResults([...matchedPresets, ...mappedApi]);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('[InvoiceProductCombobox] Search error:', err);
        }
      } finally {
        if (isMountedRef.current && abortControllerRef.current === controller) {
          setIsSearching(false);
        }
      }
    }, 250);
  }, []);

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setIsOpen(true);
    performSearch(inputValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If the focus moved inside the dropdown, do not close
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    blurTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsOpen(false);
      }
    }, 200);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setIsOpen(true);

    // Update parent's item description first line
    const lines = (description || '').split('\n');
    lines[0] = val;
    onDescriptionChange(lines.join('\n'));

    // Trigger debounced search
    performSearch(val);
  };

  const handleSelect = (e: React.SyntheticEvent, p: AvailableProductItem) => {
    e.preventDefault();
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    const finalDesc = p.description ? `${p.name}\n${p.description}` : p.name;
    onSelectProduct({
      name: p.name,
      description: finalDesc,
      unitPrice: p.unitPrice,
      isTaxed: p.isTaxed,
      taxRate: p.isTaxed ? (p.taxRate || 0.05) : undefined
    });
    setInputValue(p.name);
    setIsOpen(false);
  };

  const portalDropdown = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      onMouseDown={(e) => {
        // Prevent clicking inside dropdown from stealing focus or triggering blur on input
        e.preventDefault();
      }}
      className="bg-white border border-slate-200 shadow-2xl rounded-xl overflow-y-auto p-1 text-xs select-none"
    >
      {searchResults.map((p, pIdx) => (
        <button
          type="button"
          key={p.id ? `${p.id}-${pIdx}` : `preset-${pIdx}`}
          onMouseDown={(e) => handleSelect(e, p)}
          onClick={(e) => handleSelect(e, p)}
          className={`w-full text-left rounded-lg cursor-pointer transition-colors block border-b border-slate-50 last:border-none ${
            isMobile ? 'p-2.5 hover:bg-blue-50' : 'p-2 hover:bg-blue-50'
          }`}
        >
          <div className="font-bold text-slate-900">{p.name}</div>
          {p.unitPrice > 0 && (
            <div className="text-[10px] text-slate-500 font-medium">
              Rp {formatCurrency(p.unitPrice)}
            </div>
          )}
        </button>
      ))}
      {searchResults.length === 0 && !isSearching && (
        <div className={`p-2.5 text-center text-slate-400 italic ${isMobile ? 'text-xs' : 'text-[10px]'}`}>
          Produk tidak ditemukan
        </div>
      )}
      {isSearching && searchResults.length === 0 && (
        <div className={`p-2.5 text-center text-slate-400 italic ${isMobile ? 'text-xs' : 'text-[10px]'}`}>
          Mencari produk...
        </div>
      )}
    </div>,
    document.body
  ) : null;

  if (isMobile) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Cari atau pilih produk..."
          value={inputValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          className="product-combobox-input w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
        />
        {portalDropdown}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder="Cari atau ketik produk..."
        value={inputValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false);
        }}
        className="product-combobox-input w-full p-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
      />
      {portalDropdown}
    </div>
  );
});

InvoiceProductCombobox.displayName = 'InvoiceProductCombobox';
