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
  Lock, 
  Gavel,
  X,
  BookMarked,
  CreditCard,
  ShieldCheck,
  Send,
  Inbox,
  Package,
  FileCheck,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  HelpCircle,
  User
} from 'lucide-react';
import { SidebarTabId, UserProfile } from '../../../types';

interface SidebarProps {
  user: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen?: (val: boolean) => void;
  activeSidebarTab: SidebarTabId;
  setActiveSidebarTab: (tab: SidebarTabId) => void;
  userProfile: UserProfile | null;
  loginWithGoogle: () => void;
  isUserDropdownOpen?: boolean;
  setIsUserDropdownOpen?: (val: boolean) => void;
  setIsEditProfileModalOpen?: (val: boolean) => void;
  logout?: () => void;
}

interface MenuItem {
  label: string;
  id: SidebarTabId;
  icon: React.ComponentType<any>;
  requiresAuth?: boolean;
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  isSidebarOpen,
  setIsSidebarOpen,
  activeSidebarTab,
  setActiveSidebarTab,
  userProfile,
  loginWithGoogle,
  isUserDropdownOpen = false,
  setIsUserDropdownOpen,
  setIsEditProfileModalOpen,
  logout
}) => {
  const handleTabClick = (tabId: SidebarTabId) => {
    setActiveSidebarTab(tabId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen?.(false);
    }
  };

  const isSectionActive = (sectionId: string, activeTab: string) => {
    if (sectionId === 'menu_utama') {
      return ['beranda', 'company_profile', 'projects', 'project_detail', 'laporan'].includes(activeTab);
    }
    if (sectionId === 'notaris_dan_akta') {
      return ['deeds', 'private_deeds', 'notary_reports', 'incoming_mail', 'outgoing_mail'].includes(activeTab);
    }
    if (sectionId === 'keuangan') {
      return ['invoice', 'products', 'quotation', 'delivery', 'receipt'].includes(activeTab);
    }
    if (sectionId === 'referensi_dan_alat') {
      return ['kbli_mapping', 'saran_kbli', 'perbaikan', 'panduan'].includes(activeTab);
    }
    if (sectionId === 'sistem') {
      return ['settings', 'whatsapp_settings', 'stamp_settings', 'user_management', 'import_kbli'].includes(activeTab);
    }
    return false;
  };

  const checkIsActive = (itemId: SidebarTabId) => {
    if (itemId === 'projects') {
      return activeSidebarTab === 'projects' || activeSidebarTab === 'project_detail';
    }
    if (itemId === 'settings') {
      return ['settings', 'whatsapp_settings', 'stamp_settings', 'user_management', 'import_kbli'].includes(activeSidebarTab);
    }
    return activeSidebarTab === itemId;
  };

  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>(() => ({
    menu_utama: !isSectionActive('menu_utama', activeSidebarTab),
    notaris_dan_akta: !isSectionActive('notaris_dan_akta', activeSidebarTab),
    keuangan: !isSectionActive('keuangan', activeSidebarTab),
    referensi_dan_alat: !isSectionActive('referensi_dan_alat', activeSidebarTab),
    sistem: !isSectionActive('sistem', activeSidebarTab),
  }));

  React.useEffect(() => {
    setCollapsedSections(prev => {
      const next = { ...prev };
      if (isSectionActive('menu_utama', activeSidebarTab)) next.menu_utama = false;
      if (isSectionActive('notaris_dan_akta', activeSidebarTab)) next.notaris_dan_akta = false;
      if (isSectionActive('keuangan', activeSidebarTab)) next.keuangan = false;
      if (isSectionActive('referensi_dan_alat', activeSidebarTab)) next.referensi_dan_alat = false;
      if (isSectionActive('sistem', activeSidebarTab)) next.sistem = false;
      return next;
    });
  }, [activeSidebarTab]);

  const menuSections: MenuSection[] = [
    {
      id: 'menu_utama',
      title: 'Menu utama',
      items: [
        { label: 'Beranda', id: 'beranda', icon: Home, requiresAuth: false },
        { label: 'Klien', id: 'company_profile', icon: Building2, requiresAuth: true },
        { label: 'Proyek Kerja', id: 'projects', icon: Briefcase, requiresAuth: true },
        { label: 'Laporan Proyek Kerja', id: 'laporan', icon: FileText, requiresAuth: true },
      ]
    },
    {
      id: 'notaris_dan_akta',
      title: 'Notaris dan akta',
      items: [
        { label: 'Buku Daftar Akta', id: 'deeds', icon: BookOpen, requiresAuth: true },
        { label: 'Buku Legalisasi & Waarmerking', id: 'private_deeds', icon: ShieldCheck, requiresAuth: true },
        { label: 'Laporan Notaris', id: 'notary_reports', icon: BookMarked, requiresAuth: true },
        { label: 'Surat Masuk', id: 'incoming_mail', icon: Inbox, requiresAuth: true },
        { label: 'Surat Keluar', id: 'outgoing_mail', icon: Send, requiresAuth: true },
      ]
    },
    {
      id: 'keuangan',
      title: 'Keuangan',
      items: [
        { label: 'Invoice', id: 'invoice', icon: CreditCard, requiresAuth: true },
        { label: 'Produk & Layanan', id: 'products', icon: Package, requiresAuth: true },
        { label: 'Penawaran', id: 'quotation', icon: FileText, requiresAuth: true },
        { label: 'Surat Jalan', id: 'delivery', icon: Package, requiresAuth: true },
        { label: 'Tanda Terima', id: 'receipt', icon: FileCheck, requiresAuth: true },
      ]
    },
    {
      id: 'referensi_dan_alat',
      title: 'Referensi dan alat',
      items: [
        { label: 'Mapping KBLI 2020-2025', id: 'kbli_mapping', icon: ArrowRightLeft, requiresAuth: true },
        { label: 'Saran KBLI', id: 'saran_kbli', icon: Lightbulb, requiresAuth: true },
        { label: 'Surat Perbaikan Data', id: 'perbaikan', icon: Mail, requiresAuth: true },
        { label: 'Panduan Penggunaan', id: 'panduan', icon: BookOpen, requiresAuth: true },
      ]
    }
  ];

  if (user) {
    menuSections.push({
      id: 'sistem',
      title: 'Sistem',
      items: [
        { label: 'Pengaturan', id: 'settings', icon: SettingsIcon, requiresAuth: true }
      ]
    });
  }

  return (
    <>
      {/* Dark backdrop overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen?.(false)}
        />
      )}

      <aside className={`bg-surface-sidebar border-r border-slate-200/80 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out fixed md:relative top-0 bottom-0 left-0 ${
        isSidebarOpen 
          ? 'w-[260px] translate-x-0 z-[100] shadow-2xl md:shadow-none' 
          : 'w-[260px] -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden z-0'
      }`}>
        
        {/* Logo container at top left */}
        <div className="h-16 px-5 flex items-center justify-between shrink-0 select-none border-b border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Gavel size={18} className="text-white shrink-0" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[13px] tracking-tight font-extrabold text-slate-800 leading-tight">Notaris Putri</span>
              <span className="text-[10px] tracking-wider font-semibold text-blue-600 leading-none">SuperApp</span>
            </div>
          </div>
          {/* Close button for mobile drawer */}
          <button 
            onClick={() => setIsSidebarOpen?.(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Menu Items */}
        <div className="flex-1 py-4 space-y-4 text-[13px] overflow-y-auto">
          {menuSections.map((section) => {
            const isCollapsed = collapsedSections[section.id];
            
            return (
              <div key={section.id} className="space-y-1 px-3">
                {/* Header category selector */}
                <button
                  onClick={() => {
                    setCollapsedSections(prev => ({
                      ...prev,
                      [section.id]: !prev[section.id]
                    }));
                  }}
                  className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <span>{section.title}</span>
                  {isCollapsed ? (
                    <ChevronRight size={12} className="text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown size={12} className="text-slate-400 shrink-0" />
                  )}
                </button>

                {/* Items */}
                {!isCollapsed && (
                  <div className="space-y-0.5 mt-1 transition-all">
                    {section.items.map((item) => {
                      const isActive = checkIsActive(item.id);
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
                          className={`relative w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between select-none cursor-pointer ${
                            isActive 
                              ? 'bg-surface-sidebar-active text-blue-600 font-semibold shadow-xs' 
                              : 'text-slate-600 hover:bg-surface-sidebar-hover hover:text-slate-900'
                          }`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1.5 bottom-1.5 w-[3.5px] rounded-r-md bg-blue-600" />
                          )}
                          <span className="flex items-center gap-3">
                            <item.icon 
                              size={18} 
                              strokeWidth={isActive ? 2.25 : 2.0}
                              className={`shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`} 
                            />
                            <span>{item.label}</span>
                          </span>
                          {item.requiresAuth && !user && (
                            <Lock size={12} className="text-slate-400/50 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Profile Container */}
        {user && (
          <div className="p-3 border-t border-slate-200/60 bg-surface-sidebar shrink-0 relative">
            <button 
              onClick={() => {
                setIsUserDropdownOpen?.(!isUserDropdownOpen);
              }}
              className="flex items-center gap-3 text-left hover:bg-surface-sidebar-hover p-2 rounded-lg transition-all cursor-pointer w-full"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {(userProfile?.name || 'AZ').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-slate-800 truncate">{userProfile?.name || 'Azizah'}</span>
                <span className="text-[10px] text-slate-400 leading-none truncate">{userProfile?.level || 'Staff Kantor'}</span>
              </div>
              <ChevronDown size={14} className="text-slate-400 ml-auto shrink-0" />
            </button>

            {/* User Profile Dropup Menu */}
            {isUserDropdownOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-1 divide-y divide-slate-100">
                <div className="px-4 py-2.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Masuk Sebagai</p>
                  <p className="text-xs font-bold text-slate-800 truncate mt-1">{userProfile?.name || 'Azizah'}</p>
                  <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{user?.email || 'admin@legalnotaris.id'}</p>
                </div>
                
                <div className="py-1 text-left">
                  <button 
                    onClick={() => {
                      setIsEditProfileModalOpen?.(true);
                      setIsUserDropdownOpen?.(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <User size={14} className="text-slate-400" />
                    <span>Profil Saya</span>
                  </button>

                  <button 
                    onClick={() => {
                      setActiveSidebarTab('settings');
                      setIsUserDropdownOpen?.(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <SettingsIcon size={14} className="text-slate-400" />
                    <span>Pengaturan</span>
                  </button>

                  <button 
                    onClick={() => {
                      setActiveSidebarTab('panduan');
                      setIsUserDropdownOpen?.(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <HelpCircle size={14} className="text-slate-400" />
                    <span>Bantuan</span>
                  </button>
                </div>

                <div className="py-1 text-left">
                  <button 
                    onClick={() => {
                      if (user) {
                        logout?.();
                      } else {
                        loginWithGoogle();
                      }
                      setIsUserDropdownOpen?.(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors flex items-center gap-2.5 cursor-pointer ${
                      user ? 'text-red-600 hover:bg-red-50/50' : 'text-blue-600 hover:bg-blue-50/55'
                    }`}
                  >
                    <Lock size={14} />
                    <span>{user ? 'Keluar' : 'Login / Masuk Google'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
