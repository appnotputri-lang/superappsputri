import React from 'react';
import { 
  Home, 
  Building2, 
  Briefcase, 
  FileText, 
  ArrowRightLeft, 
  Lightbulb, 
  Mail, 
  BookOpen, 
  RefreshCw, 
  Smartphone, 
  Users, 
  Lock, 
  Gavel,
  X
} from 'lucide-react';
import { TAB_ACCENTS } from '../../constants/tabs';
import { SidebarTabId, UserProfile } from '../../../types';

interface SidebarProps {
  user: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen?: (val: boolean) => void;
  activeSidebarTab: SidebarTabId;
  setActiveSidebarTab: (tab: SidebarTabId) => void;
  userProfile: UserProfile | null;
  loginWithGoogle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  isSidebarOpen,
  setIsSidebarOpen,
  activeSidebarTab,
  setActiveSidebarTab,
  userProfile,
  loginWithGoogle
}) => {
  const handleTabClick = (tabId: SidebarTabId) => {
    setActiveSidebarTab(tabId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen?.(false);
    }
  };

  return (
    <>
      {/* Dark backdrop overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen?.(false)}
        />
      )}

      <aside className={`bg-white border-r border-slate-200/80 flex flex-col h-full shrink-0 overflow-y-auto transition-all duration-300 ease-in-out fixed md:relative top-0 bottom-0 left-0 ${
        isSidebarOpen 
          ? 'w-[260px] translate-x-0 z-[100] shadow-2xl md:shadow-none' 
          : 'w-[260px] -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden z-0'
      }`}>
        
        {/* Logo container at top left */}
        <div className="h-16 bg-[#001529] px-5 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Gavel size={18} className="text-white shrink-0" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] tracking-wider font-bold text-blue-400/90 leading-none">SISTEM DRAFT</span>
              <span className="text-[13px] tracking-tight font-extrabold text-white leading-tight">NOTARIS PUTRI</span>
            </div>
          </div>
          {/* Close button for mobile drawer */}
          <button 
            onClick={() => setIsSidebarOpen?.(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

      <div className="flex-1 py-4 space-y-1 text-[13px]">
        {/* Core Menu Group */}
        {[
          { label: 'Beranda', id: 'beranda' as const, icon: Home, requiresAuth: false },
          { label: 'Klien', id: 'company_profile' as const, icon: Building2, requiresAuth: true },
          { label: 'Proyek Kerja', id: 'projects' as const, icon: Briefcase, requiresAuth: true },
          { label: 'Laporan Proyek Kerja', id: 'laporan' as const, icon: FileText, requiresAuth: true },
        ].map((item) => {
          const isActive = activeSidebarTab === item.id || (item.id === 'projects' && activeSidebarTab === 'project_detail');
          const acc = TAB_ACCENTS[item.id] || TAB_ACCENTS.beranda;
          return (
            <button 
              key={item.id} 
              onClick={() => {
                if (item.requiresAuth && !user) {
                  if (confirm(`Anda harus login terlebih dahulu untuk mengakses menu "${item.label}".`)) {
                    loginWithGoogle();
                  }
                  return;
                }
                handleTabClick(item.id);
              }} 
              className={`relative w-full text-left px-5 py-2.5 transition-all flex items-center justify-between select-none ${
                isActive 
                  ? `${acc.bgColor} ${acc.textColor} font-semibold` 
                  : `text-slate-600 ${acc.hoverBg}`
              }`}
            >
              {isActive && (
                <div className={`absolute left-0 top-1.5 bottom-1.5 w-[4.5px] rounded-r-md ${acc.indicatorBg}`} />
              )}
              <span className="flex items-center gap-3.5">
                <item.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.25 : 2.0}
                  className={`shrink-0 transition-colors ${isActive ? acc.iconColor : 'text-slate-400'}`} 
                />
                <span>{item.label}</span>
              </span>
              {item.requiresAuth && !user && (
                <Lock size={12} className="text-slate-400/50 shrink-0" />
              )}
            </button>
          );
        })}

        {/* Menu Header: DOKUMEN & DATA */}
        <div className="px-5 pt-6 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
          Dokumen & Data
        </div>

        {[
          { label: 'Mapping KBLI 2020-2025', id: 'kbli_mapping' as const, icon: ArrowRightLeft },
          { label: 'Saran KBLI', id: 'saran_kbli' as const, icon: Lightbulb },
          { label: 'Surat Perbaikan Data', id: 'perbaikan' as const, icon: Mail },
          { label: 'Panduan Penggunaan', id: 'panduan' as const, icon: BookOpen },
        ].map((item) => {
          const isActive = activeSidebarTab === item.id;
          const acc = TAB_ACCENTS[item.id] || TAB_ACCENTS.beranda;
          return (
            <button 
              key={item.id} 
              onClick={() => {
                if (!user) {
                  if (confirm(`Anda harus login terlebih dahulu untuk mengakses menu "${item.label}".`)) {
                    loginWithGoogle();
                  }
                  return;
                }
                handleTabClick(item.id);
              }} 
              className={`relative w-full text-left px-5 py-2.5 transition-all flex items-center justify-between select-none ${
                isActive 
                  ? `${acc.bgColor} ${acc.textColor} font-semibold` 
                  : `text-slate-600 ${acc.hoverBg}`
              }`}
            >
              {isActive && (
                <div className={`absolute left-0 top-1.5 bottom-1.5 w-[4.5px] rounded-r-md ${acc.indicatorBg}`} />
              )}
              <span className="flex items-center gap-3">
                <item.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.25 : 2.0}
                  className={`shrink-0 transition-colors ${isActive ? acc.iconColor : 'text-slate-400'}`} 
                />
                <span>{item.label}</span>
              </span>
              {!user && (
                <Lock size={12} className="text-slate-400/55 shrink-0" />
              )}
            </button>
          );
        })}

        {userProfile?.role === 'Super Admin' && (() => {
          const isActive = activeSidebarTab === 'import_kbli';
          const acc = TAB_ACCENTS.import_kbli;
          return (
            <div className="pt-2 px-5">
              <button 
                onClick={() => handleTabClick('import_kbli')} 
                className={`relative w-full text-left px-4 py-2.5 rounded-lg transition-all flex items-center gap-3 select-none ${
                  isActive 
                    ? `${acc.bgColor} ${acc.textColor} font-semibold border border-transparent` 
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <RefreshCw 
                  size={15} 
                  strokeWidth={isActive ? 2.25 : 2.00}
                  className={`shrink-0 transition-colors ${isActive ? acc.iconColor : 'text-slate-500'}`} 
                />
                <span>Import KBLI 2025</span>
              </button>
            </div>
          );
        })()}

        {/* Menu Header: PENGATURAN */}
        {userProfile?.role === 'Super Admin' && (
          <>
            <div className="px-5 pt-6 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
              Pengaturan
            </div>

            {[
              { label: 'WhatsApp Gateway', id: 'whatsapp_settings' as const, icon: Smartphone },
              { label: 'Manajemen User', id: 'user_management' as const, icon: Users },
            ].map((item) => {
              const isActive = activeSidebarTab === item.id;
              const acc = TAB_ACCENTS[item.id] || TAB_ACCENTS.beranda;
              return (
                <button 
                  key={item.id} 
                  onClick={() => handleTabClick(item.id)} 
                  className={`relative w-full text-left px-5 py-2.5 transition-all flex items-center gap-3.5 select-none ${
                    isActive 
                      ? `${acc.bgColor} ${acc.textColor} font-semibold` 
                      : `text-slate-600 ${acc.hoverBg}`
                  }`}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-1.5 bottom-1.5 w-[4.5px] rounded-r-md ${acc.indicatorBg}`} />
                  )}
                  <item.icon 
                    size={20} 
                    strokeWidth={isActive ? 2.25 : 2.0}
                    className={`shrink-0 transition-colors ${isActive ? acc.iconColor : 'text-slate-400'}`} 
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </>
        )}
      </div>
    </aside>
    </>
  );
};
