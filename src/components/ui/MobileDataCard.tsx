import React from 'react';
import { Calendar, ArrowRight, Trash2 } from 'lucide-react';

export interface MobileDataCardBadge {
  label: string;
  variant?: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan' | 'custom';
  customClass?: string;
}

export interface MobileDataCardProps {
  number?: string | number;
  title: string;
  subtitle?: string;
  badges?: (MobileDataCardBadge | string | React.ReactNode | null | undefined)[];
  noteLabel?: string;
  note?: React.ReactNode;
  date?: string;
  dateIcon?: React.ReactNode;
  onDetail?: () => void;
  detailLabel?: string;
  onDelete?: () => void;
  onClick?: () => void;
  extraFooterAction?: React.ReactNode;
  children?: React.ReactNode;
}

export const MobileDataCard: React.FC<MobileDataCardProps> = ({
  number,
  title,
  subtitle,
  badges = [],
  noteLabel = "CATATAN TERAKHIR:",
  note,
  date,
  dateIcon,
  onDetail,
  detailLabel = "Detail",
  onDelete,
  onClick,
  extraFooterAction,
  children,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 hover:bg-slate-50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Header: Title, Subtitle, Number */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-bold text-slate-900 leading-tight truncate uppercase" title={typeof title === 'string' ? title : undefined}>
            {title || '-'}
          </h4>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5 truncate uppercase">
              {subtitle}
            </p>
          )}
        </div>
        {number !== undefined && (
          <span className="text-[10px] text-slate-400 font-mono shrink-0">No. {number}</span>
        )}
      </div>

      {/* Badges */}
      {badges && badges.filter(Boolean).length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center my-2.5">
          {badges.filter(Boolean).map((b, i) => {
            if (React.isValidElement(b)) return <React.Fragment key={i}>{b}</React.Fragment>;
            if (typeof b === 'string') {
              return (
                <span key={i} className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded-full uppercase">
                  {b}
                </span>
              );
            }
            const badgeObj = b as MobileDataCardBadge;
            let colorClass = 'bg-slate-100 text-slate-600';
            if (badgeObj.customClass) {
              colorClass = badgeObj.customClass;
            } else if (badgeObj.variant === 'blue') {
              colorClass = 'bg-blue-50 text-blue-700 border border-blue-200';
            } else if (badgeObj.variant === 'green') {
              colorClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            } else if (badgeObj.variant === 'amber') {
              colorClass = 'bg-amber-50 text-amber-700 border border-amber-200';
            } else if (badgeObj.variant === 'red') {
              colorClass = 'bg-rose-50 text-rose-700 border border-rose-200';
            } else if (badgeObj.variant === 'purple') {
              colorClass = 'bg-purple-50 text-purple-700 border border-purple-200';
            } else if (badgeObj.variant === 'cyan') {
              colorClass = 'bg-cyan-50 text-cyan-700 border border-cyan-200';
            }
            return (
              <span key={i} className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${colorClass}`}>
                {badgeObj.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Custom Body / Extra children */}
      {children}

      {/* Catatan / Note Box */}
      {note && (
        <div className="text-[11.5px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100/60 leading-relaxed mb-3">
          {noteLabel && (
            <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">{noteLabel}</span>
          )}
          <div className="line-clamp-2">{note}</div>
        </div>
      )}

      {/* Footer: Date & Actions */}
      {(date || onDetail || onDelete || extraFooterAction) && (
        <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            {dateIcon || <Calendar className="w-3.5 h-3.5 text-slate-300" />}
            {date || '-'}
          </span>
          
          <div className="flex items-center gap-2">
            {extraFooterAction}
            {onDetail && (
              <button 
                type="button"
                onClick={onDetail}
                className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold text-[10px] hover:bg-blue-100 transition-colors uppercase flex items-center gap-1 cursor-pointer"
              >
                {detailLabel} <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {onDelete && (
              <button 
                type="button"
                onClick={onDelete}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
