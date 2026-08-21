import React, { useState, useRef, useEffect } from 'react';
import { Home, Briefcase, BookOpen, CreditCard, Menu as MenuIcon, ShieldCheck, BookMarked, ChevronUp } from 'lucide-react';
import { SidebarTabId } from '../../../types';

interface BottomNavProps {
  activeSidebarTab: SidebarTabId;
  setActiveSidebarTab: (tab: SidebarTabId) => void;
  setIsSidebarOpen: (v: boolean) => void;
}

const AKTA_TABS: SidebarTabId[] = ['deeds', 'private_deeds', 'notary_reports'] as SidebarTabId[];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeSidebarTab,
  setActiveSidebarTab,
  setIsSidebarOpen
}) => {
  const [isAktaPopoverOpen, setIsAktaPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAktaPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsAktaPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAktaPopoverOpen]);

  const isAktaActive = AKTA_TABS.includes(activeSidebarTab);

  const navItemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 cursor-pointer transition-colors ${
      active ? 'text-blue-600' : 'text-slate-500'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-stretch z-[95] pb-[env(safe-area-inset-bottom)]">
      <button className={navItemClass(activeSidebarTab === 'beranda')} onClick={() => { setActiveSidebarTab('beranda' as SidebarTabId); setIsAktaPopoverOpen(false); }}>
        <Home size={20} />
        <span className="text-[10px] font-semibold">Beranda</span>
      </button>

      <button className={navItemClass(activeSidebarTab === 'projects' || activeSidebarTab === 'project_detail')} onClick={() => { setActiveSidebarTab('projects' as SidebarTabId); setIsAktaPopoverOpen(false); }}>
        <Briefcase size={20} />
        <span className="text-[10px] font-semibold">Proyek</span>
      </button>

      <div className="relative flex-1" ref={popoverRef}>
        {isAktaPopoverOpen && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 animate-in fade-in slide-in-from-bottom-1">
            <button
              onClick={() => { setActiveSidebarTab('deeds' as SidebarTabId); setIsAktaPopoverOpen(false); }}
              className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <BookOpen size={15} className="text-blue-600 shrink-0" />
              <span>Buku Daftar Akta</span>
            </button>
            <button
              onClick={() => { setActiveSidebarTab('private_deeds' as SidebarTabId); setIsAktaPopoverOpen(false); }}
              className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ShieldCheck size={15} className="text-indigo-600 shrink-0" />
              <span>Legalisasi &amp; Waarmerking</span>
            </button>
            <button
              onClick={() => { setActiveSidebarTab('notary_reports' as SidebarTabId); setIsAktaPopoverOpen(false); }}
              className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <BookMarked size={15} className="text-sky-600 shrink-0" />
              <span>Laporan Notaris</span>
            </button>
          </div>
        )}
        <button className={navItemClass(isAktaActive)} onClick={() => setIsAktaPopoverOpen(prev => !prev)}>
          <div className="relative">
            <BookOpen size={20} />
            {isAktaPopoverOpen && <ChevronUp size={10} className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-blue-600" />}
          </div>
          <span className="text-[10px] font-semibold">Akta</span>
        </button>
      </div>

      <button className={navItemClass(activeSidebarTab === 'invoice')} onClick={() => { setActiveSidebarTab('invoice' as SidebarTabId); setIsAktaPopoverOpen(false); }}>
        <CreditCard size={20} />
        <span className="text-[10px] font-semibold">Invoice</span>
      </button>

      <button className={navItemClass(false)} onClick={() => { setIsSidebarOpen(true); setIsAktaPopoverOpen(false); }}>
        <MenuIcon size={20} />
        <span className="text-[10px] font-semibold">Menu</span>
      </button>
    </nav>
  );
};

export default BottomNav;
