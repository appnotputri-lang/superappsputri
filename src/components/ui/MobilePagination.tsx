import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface MobilePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export const MobilePagination: React.FC<MobilePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemLabel = 'data'
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize || totalPages <= 1) return null;

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safeCurrentPage * pageSize);

  return (
    <div className="mt-6 mb-4 flex flex-col items-center gap-2.5">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage === 1}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all font-bold cursor-pointer shrink-0 shadow-2xs"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>

        {getPageNumbers().map((pItem, idx) => {
          if (pItem === '...') {
            return (
              <span key={`dots-${idx}`} className="w-7 h-9 flex items-center justify-center text-slate-400 text-xs font-bold select-none">
                ...
              </span>
            );
          }
          const isCurrent = safeCurrentPage === pItem;
          return (
            <button
              key={`page-${pItem}`}
              type="button"
              onClick={() => onPageChange(Number(pItem))}
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isCurrent
                  ? 'bg-[#1e61c3] text-white shadow-xs'
                  : 'border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
              }`}
            >
              {pItem}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage === totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all font-bold cursor-pointer shrink-0 shadow-2xs"
          title="Halaman Selanjutnya"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="text-[11px] font-medium text-slate-500 text-center">
        Menampilkan {startItem}-{endItem} dari {totalItems} {itemLabel}
      </div>
    </div>
  );
};
