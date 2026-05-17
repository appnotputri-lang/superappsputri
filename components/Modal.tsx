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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white rounded-3xl w-full ${maxWidth} max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200`}>
        <div className={`px-6 py-5 border-b border-slate-100 flex justify-between items-center ${headerColor} rounded-t-3xl`}>
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="font-bold text-sm tracking-widest uppercase text-slate-800">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 rounded-b-3xl">
          {children}
        </div>
      </div>
    </div>
  );
};
