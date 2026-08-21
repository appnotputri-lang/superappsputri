import React, { useState } from 'react';
import { 
  Menu, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  ChevronDown, 
  X,
  FileText
} from 'lucide-react';

export interface SortOption {
  field: string;
  order: 'asc' | 'desc';
  label: string;
}

export { MobilePagination } from './MobilePagination';
export type { MobilePaginationProps } from './MobilePagination';

export interface MobileHeaderProps {
  title?: string;
  onOpenSidebar?: () => void;
  onAdd?: () => void;
  addTooltip?: string;
  addIcon?: React.ReactNode;
  
  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filter
  onOpenFilter?: () => void;
  hasActiveFilter?: boolean;
  
  // Stats & Sort
  totalItems?: number;
  totalLabel?: string;
  sortOptions?: SortOption[];
  currentSortLabel?: string;
  onSelectSort?: (option: SortOption) => void;
  
  // Extra elements
  customSummary?: React.ReactNode;
  children?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  onOpenSidebar,
  onAdd,
  addTooltip,
  addIcon,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  onOpenFilter,
  hasActiveFilter = false,
  totalItems,
  totalLabel = 'Data',
  sortOptions,
  currentSortLabel,
  onSelectSort,
  customSummary,
  children,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false);

  const handleOpenSidebar = () => {
    if (onOpenSidebar) {
      onOpenSidebar();
    } else if (typeof window !== 'undefined') {
      const btn = document.querySelector('button[aria-label="Toggle sidebar"]') as HTMLButtonElement;
      if (btn) btn.click();
    }
  };

  return (
    <div 
      className="md:hidden bg-[#1e61c3] text-white rounded-b-[2rem] p-4.5 pb-5 shadow-sm -mx-3 sm:-mx-6 -mt-3 sm:-mt-5 mb-4 relative overflow-hidden"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)'
      }}
    >
      {/* Decorative Blue-on-Blue Circular Background Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-b-[2rem]" aria-hidden="true">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-1/3 w-20 h-20 rounded-full bg-white/[0.04]" />
      </div>

      <div className="relative z-10 space-y-3.5">
        {/* 1. Baris Atas: Hamburger Menu + Judul + Tombol Plus/Aksi */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenSidebar}
              className="p-1 -ml-1 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Buka Menu Sidebar"
              type="button"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white tracking-tight leading-tight">{title}</h1>
          </div>

          {onAdd && (
            <button
              onClick={onAdd}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0"
              title={addTooltip || `Tambah ${title}`}
              type="button"
            >
              {addIcon || <Plus className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* 2. Baris Search + Filter Button (jika search didukung) */}
        {(onSearchChange !== undefined || searchValue !== undefined) && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-9.5 pr-8 py-2.5 bg-white text-slate-800 placeholder-slate-400 text-xs rounded-xl border-0 outline-none shadow-xs font-medium"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {onOpenFilter && (
              <button
                type="button"
                onClick={onOpenFilter}
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition-colors ${
                  hasActiveFilter 
                    ? 'bg-amber-400 text-slate-900 font-bold' 
                    : 'bg-white text-[#1e61c3] hover:bg-blue-50'
                }`}
                title="Filter"
              >
                <SlidersHorizontal className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        )}

        {/* 3. Baris Custom Summary (Filter chips / Status tabs / dll) */}
        {customSummary}

        {/* 4. Baris Info Total Data & Dropdown Urutkan */}
        {(totalItems !== undefined || (sortOptions && sortOptions.length > 0)) && (
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-xs font-medium text-white/90">
              {totalItems !== undefined ? `Total ${totalItems} ${totalLabel}` : ''}
            </span>

            {sortOptions && sortOptions.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white cursor-pointer bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <span>Urutkan: {currentSortLabel || sortOptions[0]?.label}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {isSortOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          onSelectSort?.(opt);
                          setIsSortOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between font-medium cursor-pointer"
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. Custom children slot */}
        {children}
      </div>
    </div>
  );
};

export interface MobileEmptyStateProps {
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const MobileEmptyState: React.FC<MobileEmptyStateProps> = ({
  title,
  message = 'Belum ada data.',
  actionText,
  onAction,
  icon
}) => {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center my-4 space-y-3 shadow-xs">
      {icon && (
        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          {icon}
        </div>
      )}
      <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-xs mx-auto">
        {message}
      </p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {actionText}
        </button>
      )}
    </div>
  );
};
