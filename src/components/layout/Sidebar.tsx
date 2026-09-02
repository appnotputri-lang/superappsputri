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
  Banknote,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HelpCircle,
  User
} from 'lucide-react';
import { SidebarTabId, UserProfile } from '../../../types';
import { Menu3DIcon } from '../ui/Menu3DIcon';

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
  groupIcon: React.ComponentType<any>;
  badgeColor: string;
  badgeTextColor: string;
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
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen?.(false);
    }
    setActiveSidebarTab(tabId);
  };

  const isSectionActive = (sectionId: string, activeTab: string) => {
    if (sectionId === 'menu_utama') {
      return ['beranda', 'company_profile', 'projects', 'project_detail', 'laporan'].includes(activeTab);
    }
    if (sectionId === 'notaris_dan_akta') {
      return ['deeds', 'private_deeds', 'notary_reports', 'incoming_mail', 'outgoing_mail'].includes(activeTab);
    }
    if (sectionId === 'keuangan') {
      return ['invoice', 'products', 'quotation', 'delivery', 'receipt', 'deposit_note'].includes(activeTab);
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

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const isCurrentlyCollapsed = prev[sectionId];
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        const next: Record<string, boolean> = {
          menu_utama: true,
          notaris_dan_akta: true,
          keuangan: true,
          referensi_dan_alat: true,
          sistem: true,
        };
        next[sectionId] = !isCurrentlyCollapsed;
        return next;
      }
      return {
        ...prev,
        [sectionId]: !isCurrentlyCollapsed
      };
    });
  };

  const menuSections: MenuSection[] = [
    {
      id: 'menu_utama',
      title: 'MENU UTAMA',
      groupIcon: Home,
      badgeColor: 'bg-blue-50 border border-blue-100',
      badgeTextColor: 'text-[#1e61c3]',
      items: [
        { label: 'Beranda', id: 'beranda', icon: Home, requiresAuth: false },
        { label: 'Klien', id: 'company_profile', icon: Building2, requiresAuth: true },
        { label: 'Proyek Kerja', id: 'projects', icon: Briefcase, requiresAuth: true },
        { label: 'Laporan Proyek Kerja', id: 'laporan', icon: FileText, requiresAuth: true },
      ]
    },
    {
      id: 'notaris_dan_akta',
      title: 'NOTARIS DAN AKTA',
      groupIcon: Gavel,
      badgeColor: 'bg-purple-50 border border-purple-100',
      badgeTextColor: 'text-purple-600',
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
      title: 'KEUANGAN',
      groupIcon: CreditCard,
      badgeColor: 'bg-emerald-50 border border-emerald-100',
      badgeTextColor: 'text-emerald-600',
      items: [
        { label: 'Invoice', id: 'invoice', icon: CreditCard, requiresAuth: true },
        { label: 'Produk & Layanan', id: 'products', icon: Package, requiresAuth: true },
        { label: 'Penawaran', id: 'quotation', icon: FileText, requiresAuth: true },
        { label: 'Surat Jalan', id: 'delivery', icon: Package, requiresAuth: true },
        { label: 'Tanda Terima', id: 'receipt', icon: FileCheck, requiresAuth: true },
        { label: 'Penitipan Uang', id: 'deposit_note', icon: Banknote, requiresAuth: true },
      ]
    },
    {
      id: 'referensi_dan_alat',
      title: 'DOKUMEN & SURAT',
      groupIcon: BookOpen,
      badgeColor: 'bg-amber-50 border border-amber-100',
      badgeTextColor: 'text-amber-600',
      items: [
        { label: 'Mapping KBLI 2020-2025', id: 'kbli_mapping', icon: ArrowRightLeft, requiresAuth: true },
        { label: 'Saran KBLI', id: 'saran_kbli', icon: Lightbulb, requiresAuth: true },
        { label: 'Surat Perbaikan Data', id: 'perbaikan', icon: Mail, requiresAuth: true },
        { label: 'Panduan Penggunaan', id: 'panduan', icon: BookOpen, requiresAuth: true },
      ]
    },
    {
      id: 'sistem',
      title: 'PENGATURAN',
      groupIcon: SettingsIcon,
      badgeColor: 'bg-slate-100 border border-slate-200',
      badgeTextColor: 'text-slate-600',
      items: [
        { label: 'Pengaturan Sistem', id: 'settings', icon: SettingsIcon, requiresAuth: true },
      ]
    }
  ];

  return (
    <>
      {/* Dark backdrop overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[90] md:hidden"
          onClick={() => setIsSidebarOpen?.(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`bg-white border-r border-slate-200/80 flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out fixed md:relative top-0 bottom-0 left-0 ${
        isSidebarOpen 
          ? 'w-[85vw] max-w-[300px] md:w-[260px] translate-x-0 z-[100] shadow-2xl md:shadow-none rounded-r-3xl md:rounded-none overflow-hidden' 
          : 'w-[85vw] max-w-[300px] -translate-x-full md:w-[68px] md:translate-x-0 z-0 md:rounded-none'
      }`}>
        
        {/* Header Drawer */}
        {isSidebarOpen ? (
          <div 
            className="relative overflow-hidden border-b border-slate-100 bg-white p-4 shrink-0 select-none"
            style={{
              paddingTop: 'calc(var(--ios-safe-top) + 1rem)'
            }}
          >
            {/* Subtle Decorative Blue-on-Blue Circular Accents */}
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-blue-500/10 pointer-events-none" aria-hidden="true" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-blue-500/5 pointer-events-none" aria-hidden="true" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Monogram NP */}
                <div className="w-10 h-10 rounded-xl bg-header-gradient text-white flex items-center justify-center font-black text-sm tracking-tight shadow-xs shrink-0" style={{ background: 'var(--primary-header-gradient)' }}>
                  NP
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-[13.5px] font-extrabold text-slate-800 leading-tight tracking-tight">Notaris Putri</span>
                  <span className="text-[10px] font-bold text-[#1e61c3] tracking-wide leading-none mt-0.5">Office System</span>
                </div>
              </div>

              {/* Close Button Mobile */}
              <button 
                type="button"
                onClick={() => setIsSidebarOpen?.(false)}
                className="md:hidden w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-[#1e61c3] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Tutup menu"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center shrink-0 border-b border-slate-100/80 px-2">
            <button 
              type="button"
              onClick={() => setIsSidebarOpen?.(true)}
              className="w-10 h-10 rounded-xl bg-header-gradient flex items-center justify-center text-white shrink-0 shadow-xs hover:bg-blue-700 transition-colors cursor-pointer group relative"
              style={{ background: 'var(--primary-header-gradient)' }}
              title="Perluas Menu"
            >
              <Gavel size={20} className="text-white shrink-0" />
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900/90 backdrop-blur-xs text-white text-xs font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap hidden md:block">
                Notaris Putri Office System
              </div>
            </button>
          </div>
        )}

        {/* Scrollable Menu Items */}
        <div 
          className="flex-1 py-3 px-3 space-y-2 text-[13px] overflow-y-auto overflow-x-hidden no-scrollbar"
        >
          {menuSections.map((section, idx) => {
            const isCollapsed = collapsedSections[section.id];
            
            return (
              <div key={section.id} className="space-y-1">
                {/* Header category selector */}
                {isSidebarOpen ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-all select-none cursor-pointer group ${
                      !isCollapsed ? 'bg-slate-50 text-slate-900' : 'hover:bg-slate-50/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Menu3DIcon tabId={section.id} size={28} />
                      <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-800 truncate">
                        {section.title}
                      </span>
                    </div>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 group-hover:text-slate-600 shrink-0">
                      {isCollapsed ? (
                        <ChevronRight size={14} className="transition-transform duration-200" />
                      ) : (
                        <ChevronDown size={14} className="transition-transform duration-200" />
                      )}
                    </div>
                  </button>
                ) : (
                  idx > 0 && <div className="my-2 border-t border-slate-200/60 w-8 mx-auto" />
                )}

                {/* Items */}
                {(isSidebarOpen ? !isCollapsed : true) && (
                  <div className="space-y-1 mt-1 pl-1 pr-1">
                    {section.items.map((item) => {
                      const isActive = checkIsActive(item.id);

                      if (!isSidebarOpen) {
                        // Collapsed mini-rail view (Desktop)
                        return (
                          <button 
                            key={item.id} 
                            type="button"
                            title={item.label}
                            onClick={() => {
                              if (item.requiresAuth && !user) {
                                if (confirm(`Anda harus login terlebih dahulu untuk mengakses menu "${item.label}".`)) {
                                  loginWithGoogle();
                                }
                                return;
                              }
                              handleTabClick(item.id);
                            }} 
                            className={`relative group w-10 h-10 mx-auto rounded-xl transition-all flex items-center justify-center select-none cursor-pointer ${
                              isActive 
                                ? 'bg-blue-50/80 shadow-2xs' 
                                : 'hover:bg-slate-100'
                            }`}
                          >
                            {isActive && (
                              <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-[#1e61c3]" />
                            )}
                            <Menu3DIcon tabId={item.id} size={26} active={isActive} />
                            {/* Hover tooltip */}
                            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900/90 backdrop-blur-xs text-white text-xs font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap hidden md:block">
                              {item.label}
                            </div>
                          </button>
                        );
                      }

                      // Expanded full view (Mobile Drawer & Expanded Desktop Sidebar)
                      return (
                        <button 
                          key={item.id} 
                          type="button"
                          onClick={() => {
                            if (item.requiresAuth && !user) {
                              if (confirm(`Anda harus login terlebih dahulu untuk mengakses menu "${item.label}".`)) {
                                loginWithGoogle();
                              }
                              return;
                            }
                            handleTabClick(item.id);
                          }} 
                          className={`relative w-full text-left px-2.5 py-1.5 rounded-2xl transition-all flex items-center justify-between select-none cursor-pointer ${
                            isActive 
                              ? 'bg-blue-50/80 text-[#1e61c3] font-bold shadow-2xs ring-1 ring-blue-200/50' 
                              : 'text-slate-700 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-[#1e61c3]" />
                          )}
                          <span className="flex items-center gap-3 min-w-0 pr-2">
                            <Menu3DIcon tabId={item.id} size={28} active={isActive} />
                            <span className="text-[13px] tracking-tight truncate">{item.label}</span>
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

        {/* Bottom Profile Container Sticky */}
        {user && (
          <div className="p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] border-t border-slate-100 bg-blue-50/40 shrink-0 relative sticky bottom-0 z-20">
            {isSidebarOpen ? (
              /* Expanded Bottom Profile */
              <div>
                <button 
                  type="button"
                  onClick={() => {
                    setIsUserDropdownOpen?.(!isUserDropdownOpen);
                  }}
                  className="flex items-center gap-3 text-left bg-white/90 hover:bg-white p-2.5 rounded-2xl transition-all cursor-pointer w-full border border-blue-100/80 shadow-xs"
                >
                  <div className="w-9 h-9 rounded-full bg-[#1e61c3] text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                    {(userProfile?.name || 'AD').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col truncate min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800 truncate">{userProfile?.name || 'Admin'}</span>
                    <span className="text-[10px] font-semibold text-[#1e61c3] leading-none truncate mt-0.5">{userProfile?.level || 'Super Admin'}</span>
                  </div>
                  <ChevronUp size={14} className={`text-slate-400 ml-auto shrink-0 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropup Menu (Expanded Sidebar) */}
                {isUserDropdownOpen && (
                  <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 divide-y divide-slate-100 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50/50">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Masuk Sebagai</p>
                      <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{userProfile?.name || 'Admin'}</p>
                      <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{user?.email || 'admin@legalnotaris.id'}</p>
                    </div>
                    
                    <div className="py-1 text-left">
                      <button 
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.innerWidth < 768) {
                            setIsSidebarOpen?.(false);
                          }
                          setIsEditProfileModalOpen?.(true);
                          setIsUserDropdownOpen?.(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <User size={14} className="text-slate-400" />
                        <span>Profil Saya</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.innerWidth < 768) {
                            setIsSidebarOpen?.(false);
                          }
                          setActiveSidebarTab('settings');
                          setIsUserDropdownOpen?.(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <SettingsIcon size={14} className="text-slate-400" />
                        <span>Pengaturan</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.innerWidth < 768) {
                            setIsSidebarOpen?.(false);
                          }
                          setActiveSidebarTab('panduan');
                          setIsUserDropdownOpen?.(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <HelpCircle size={14} className="text-slate-400" />
                        <span>Bantuan</span>
                      </button>
                    </div>

                    <div className="py-1 text-left">
                      <button 
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.innerWidth < 768) {
                            setIsSidebarOpen?.(false);
                          }
                          if (user) {
                            logout?.();
                          } else {
                            loginWithGoogle();
                          }
                          setIsUserDropdownOpen?.(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors flex items-center gap-2.5 cursor-pointer ${
                          user ? 'text-rose-600 hover:bg-rose-50/50' : 'text-blue-600 hover:bg-blue-50/55'
                        }`}
                      >
                        <Lock size={14} />
                        <span>{user ? 'Keluar' : 'Login / Masuk Google'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Collapsed Mini-Rail Profile */
              <div className="relative flex justify-center">
                <button 
                  type="button"
                  onClick={() => setIsUserDropdownOpen?.(!isUserDropdownOpen)}
                  className="w-10 h-10 rounded-full bg-[#1e61c3] text-white flex items-center justify-center text-xs font-bold shadow-xs hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer group"
                  title={userProfile?.name || 'Profil Saya'}
                >
                  {(userProfile?.name || 'AD').substring(0, 2).toUpperCase()}
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900/90 backdrop-blur-xs text-white text-xs font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap hidden md:block">
                    {userProfile?.name || 'Profil Saya'}
                  </div>
                </button>

                {/* Floating Dropup Menu for Collapsed Sidebar */}
                {isUserDropdownOpen && (
                  <div className="absolute bottom-0 left-full ml-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-left-2 divide-y divide-slate-100 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50/50">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Masuk Sebagai</p>
                      <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{userProfile?.name || 'Admin'}</p>
                      <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{user?.email || 'admin@legalnotaris.id'}</p>
                    </div>
                    
                    <div className="py-1 text-left">
                      <button 
                        type="button"
                        onClick={() => {
                          setIsEditProfileModalOpen?.(true);
                          setIsUserDropdownOpen?.(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <User size={14} className="text-slate-400" />
                        <span>Profil Saya</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setActiveSidebarTab('settings');
                          setIsUserDropdownOpen?.(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <SettingsIcon size={14} className="text-slate-400" />
                        <span>Pengaturan</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setActiveSidebarTab('panduan');
                          setIsUserDropdownOpen?.(false);
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2.5 cursor-pointer font-medium"
                      >
                        <HelpCircle size={14} className="text-slate-400" />
                        <span>Bantuan</span>
                      </button>
                    </div>

                    <div className="py-1 text-left">
                      <button 
                        type="button"
                        onClick={() => {
                          if (user) {
                            logout?.();
                          } else {
                            loginWithGoogle();
                          }
                          setIsUserDropdownOpen?.(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors flex items-center gap-2.5 cursor-pointer ${
                          user ? 'text-rose-600 hover:bg-rose-50/50' : 'text-blue-600 hover:bg-blue-50/55'
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
          </div>
        )}
      </aside>
    </>
  );
};

