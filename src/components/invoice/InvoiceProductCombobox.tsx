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
  isManualOption?: boolean;
}

export const MANUAL_PRODUCT_OPTION: AvailableProductItem = {
  id: 'manual-custom-option',
  name: '-- Manual (Ketik Sendiri) --',
  description: 'Input nama, rincian, dan tarif harga secara bebas',
  unitPrice: 0,
  isTaxed: false,
  taxRate: 0.05,
  isManualOption: true
};

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
  const [searchResults, setSearchResults] = useState<AvailableProductItem[]>([MANUAL_PRODUCT_OPTION]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const debounceTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const blurTimeoutRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  // Products exclusively sourced from Menu Produk & Layanan (Database)
  const [dbProducts, setDbProducts] = useState<AvailableProductItem[]>([]);

  // Subscribe to Products & Services Menu from Database
  useEffect(() => {
    const unsubscribe = ProductService.subscribeProducts((prods) => {
      if (!isMountedRef.current) return;
      const mapped: AvailableProductItem[] = (prods || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        unitPrice: p.unitPrice || 0,
        isTaxed: !!p.isTaxed,
        taxRate: 0.05,
        category: p.category
      }));
      setDbProducts(mapped);
    });
    return () => unsubscribe();
  }, []);

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

    if (rect.width === 0 && rect.height === 0) return;

    const gap = 4;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    const PREFERRED_MAX_HEIGHT = isMobile ? 240 : 220;

    let maxHeight = PREFERRED_MAX_HEIGHT;
    let top = 0;
    let transform: string | undefined = undefined;

    if (spaceBelow < 170 && spaceAbove > spaceBelow) {
      maxHeight = Math.min(PREFERRED_MAX_HEIGHT, Math.max(100, spaceAbove - 12));
      top = rect.top - gap;
      transform = 'translateY(-100%)';
    } else {
      maxHeight = Math.min(PREFERRED_MAX_HEIGHT, Math.max(100, spaceBelow - 12));
      top = rect.bottom + gap;
    }

    let width = isMobile ? rect.width : Math.max(rect.width, 260);

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

  // Helper to execute search: strictly takes from dbProducts (Menu Produk & Layanan) + MANUAL option
  const performSearch = useCallback((queryText: string) => {
    const trimmed = queryText.trim();
    const qLower = trimmed.toLowerCase();

    // Filter dbProducts (from Menu Produk & Layanan)
    const filteredMenuProducts = trimmed
      ? dbProducts.filter(p =>
          (p.name && p.name.toLowerCase().includes(qLower)) ||
          (p.description && p.description.toLowerCase().includes(qLower)) ||
          (p.category && p.category.toLowerCase().includes(qLower))
        )
      : dbProducts;

    // Always keep MANUAL_PRODUCT_OPTION at top, followed by filtered items from Menu Produk & Layanan
    setSearchResults([MANUAL_PRODUCT_OPTION, ...filteredMenuProducts]);

    // Cancel existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Abort existing in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Debounce server search from Menu Produk database if queryText is provided
    if (trimmed.length > 0) {
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

          const seenNames = new Set(filteredMenuProducts.map(p => (p.name || '').toLowerCase()));
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

          setSearchResults([MANUAL_PRODUCT_OPTION, ...filteredMenuProducts, ...mappedApi]);
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
    }
  }, [dbProducts]);

  // Update search results whenever dbProducts is updated
  useEffect(() => {
    if (isOpen) {
      performSearch(inputValue);
    } else {
      setSearchResults([MANUAL_PRODUCT_OPTION, ...dbProducts]);
    }
  }, [dbProducts]);

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setIsOpen(true);
    performSearch(inputValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
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

    if (p.isManualOption || p.id === 'manual-custom-option') {
      // Manual option chosen
      const currentVal = (inputValue || '').trim();
      const isPlaceholder = currentVal === '-- Manual (Ketik Sendiri) --' || currentVal === 'Manual';
      const targetText = isPlaceholder ? '' : currentVal;

      onSelectProduct({
        name: targetText || 'Manual',
        description: targetText,
        unitPrice: 0,
        isTaxed: false,
        taxRate: undefined
      });
      setInputValue(targetText);
    } else {
      // Product selected from Menu Produk & Layanan
      const finalDesc = p.description ? `${p.name}\n${p.description}` : p.name;
      onSelectProduct({
        name: p.name,
        description: finalDesc,
        unitPrice: p.unitPrice,
        isTaxed: p.isTaxed,
        taxRate: p.isTaxed ? (p.taxRate || 0.05) : undefined
      });
      setInputValue(p.name);
    }
    setIsOpen(false);
  };

  const menuProductsCount = searchResults.filter(p => !p.isManualOption && p.id !== 'manual-custom-option').length;
  const isInputQuery = inputValue.trim().length > 0;

  const portalDropdown = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      onMouseDown={(e) => {
        // Prevent clicking inside dropdown from stealing focus or triggering blur on input
        e.preventDefault();
      }}
      className="bg-white border border-slate-200 shadow-2xl rounded-xl overflow-y-auto p-1.5 text-xs select-none"
    >
      {/* Opsi 1: Manual Input (Selalu tersedia di paling atas) */}
      <button
        type="button"
        onMouseDown={(e) => handleSelect(e, MANUAL_PRODUCT_OPTION)}
        onClick={(e) => handleSelect(e, MANUAL_PRODUCT_OPTION)}
        className="w-full text-left rounded-lg cursor-pointer transition-colors block bg-blue-50/90 hover:bg-blue-100 text-blue-900 p-2.5 mb-1.5 border border-blue-200"
      >
        <div className="flex items-center justify-between">
          <div className="font-extrabold text-blue-800 text-xs flex items-center gap-1.5">
            <span>✏️</span>
            <span>Manual (Ketik Bebas)</span>
          </div>
          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold tracking-wide">
            Manual
          </span>
        </div>
        <p className="text-[10px] text-blue-600/90 font-medium mt-0.5">
          Pilih ini jika produk/layanan tidak ada di menu untuk isi nama & harga manual
        </p>
      </button>

      {/* Header Pembatas Menu Produk */}
      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-t border-slate-100 pt-1.5">
        <span>Menu Produk & Layanan</span>
        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
          {menuProductsCount} Produk
        </span>
      </div>

      {/* Daftar Produk dari Menu Produk & Layanan */}
      {searchResults.map((p, pIdx) => {
        if (p.isManualOption || p.id === 'manual-custom-option') return null;

        return (
          <button
            type="button"
            key={p.id ? `menu-prod-${p.id}` : `menu-prod-${pIdx}`}
            onMouseDown={(e) => handleSelect(e, p)}
            onClick={(e) => handleSelect(e, p)}
            className={`w-full text-left rounded-lg cursor-pointer transition-colors block border-b border-slate-100 last:border-none ${
              isMobile ? 'p-2.5 hover:bg-slate-50' : 'p-2 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between gap-1.5">
              <span className="font-bold text-slate-900 leading-snug">{p.name}</span>
              {p.category && (
                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0 font-medium">
                  {p.category}
                </span>
              )}
            </div>
            {p.description && (
              <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">
                {p.description.split('\n')[0]}
              </div>
            )}
            {p.unitPrice > 0 && (
              <div className="text-[10px] text-blue-600 font-bold mt-0.5">
                Rp {formatCurrency(p.unitPrice)}
              </div>
            )}
          </button>
        );
      })}

      {/* Pesan jika tidak ada produk dari menu */}
      {menuProductsCount === 0 && !isSearching && (
        <div className={`p-3 text-center text-slate-500 bg-slate-50/70 rounded-lg m-1 border border-dashed border-slate-200 ${isMobile ? 'text-xs' : 'text-[11px]'}`}>
          {isInputQuery ? (
            <div>
              <p className="font-semibold text-slate-700">Tidak ada di Menu Produk & Layanan</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Klik opsi <strong>"Manual"</strong> di atas untuk mengetik nama & harga langsung.</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-slate-700">Belum ada produk di menu</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tambahkan di menu Produk & Layanan atau pilih <strong>"Manual"</strong> di atas.</p>
            </div>
          )}
        </div>
      )}

      {isSearching && (
        <div className="p-2 text-center text-slate-400 italic text-[10px]">
          Mencari di Menu Produk & Layanan...
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
          placeholder="Pilih dari menu atau ketik manual..."
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
        placeholder="Pilih dari menu atau ketik manual..."
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
