import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  headerColor?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  title, 
  icon,
  isOpen, 
  onClose, 
  children,
  maxWidth = 'max-w-4xl',
  headerColor = 'bg-white'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white w-full h-[100dvh] sm:h-auto ${maxWidth} max-h-none sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-3xl shadow-2xl relative animate-in slide-in-from-bottom sm:slide-in-from-none sm:zoom-in-95 duration-300 sm:duration-200`}>
        <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center ${headerColor} rounded-none sm:rounded-t-3xl shrink-0`}>
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 rounded-none sm:rounded-b-3xl">
          {children}
        </div>
      </div>
    </div>
  );
};
