import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  headerColor?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  title, 
  icon,
  isOpen, 
  onClose, 
  children,
  footer,
  maxWidth = 'max-w-4xl',
  headerColor = 'bg-white'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`bg-white w-full h-[95dvh] sm:h-auto ${maxWidth} max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden`}>
        <div className={`px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center ${headerColor} rounded-t-2xl sm:rounded-t-3xl shrink-0`}>
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="shrink-0">{icon}</div>}
            <h2 className="font-bold text-xs sm:text-sm tracking-wider sm:tracking-widest uppercase text-slate-800 truncate" title={typeof title === 'string' ? title : undefined}>
              {title}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center hover:bg-black/5 bg-black/5 rounded-full transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className={`p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 ${!footer ? 'rounded-b-2xl sm:rounded-b-3xl' : ''}`}>
          {children}
        </div>
        {footer && (
          <div className="border-t border-slate-200 bg-white px-5 sm:px-6 py-3.5 sm:py-4 shrink-0 rounded-b-2xl sm:rounded-b-3xl z-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
