import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  FolderPlus, 
  Users, 
  FileText, 
  CreditCard, 
  Banknote, 
  Mail, 
  BookOpen, 
  ShieldCheck, 
  BarChart2, 
  Filter, 
  Search, 
  X, 
  Clock, 
  SlidersHorizontal,
  RefreshCw,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Zap,
  Moon
} from 'lucide-react';
import { ProjectService } from '../services/ProjectService';
import { Project } from '../domain/project/Project';
import { TAB_TO_PATH } from '../constants/tabs';
import { ProjectTimelineCard } from '../features/project-engine/components/ProjectTimelineCard';
import { RealTimeClock } from '../components/RealTimeClock';
import { PushNotificationToggle } from '../components/common/PushNotificationToggle';

interface DashboardProps {
  profiles?: any[];
  projects?: any[];
  rupstProjects?: any[];
  pendirianProjects?: any[];
  compiledActivities?: any[];
  compiledDocuments?: any[];
  setActiveSidebarTab: (tab: string) => void;
  setEditingProjectId?: (id: string | null) => void;
  setEditingRupstId?: (id: string | null) => void;
  updateData?: (data: any) => void;
  INITIAL_STATE?: any;
  handleDownloadProject?: (project: any) => void;
  currentUser?: any;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (v: boolean) => void;
  userProfile?: any;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects: initialProjectsProp,
  setActiveSidebarTab,
  currentUser,
  isSidebarOpen = true,
  setIsSidebarOpen,
  userProfile
}) => {
  const navigate = useNavigate();

  // Realtime Timeline Projects State
  const [timelineProjects, setTimelineProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShortcutsExpanded, setIsShortcutsExpanded] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Real-time listener for timeline projects
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = ProjectService.subscribeTimelineProjects(
      (projectsList) => {
        setTimelineProjects(projectsList);
        setIsLoading(false);
      },
      (err) => {
        console.error('Timeline realtime subscription error:', err);
        // Fallback to prop if error
        if (initialProjectsProp && initialProjectsProp.length > 0) {
          setTimelineProjects(initialProjectsProp as Project[]);
        }
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [initialProjectsProp]);

  // Primary Quick Actions (Row 1: 4 Main Actions)
  const PRIMARY_QUICK_ACTIONS = [
    { 
      label: 'Proyek Baru', 
      icon: FolderPlus, 
      bg: 'bg-purple-100/90 text-purple-700', 
      hoverBorder: 'hover:border-purple-300', 
      hoverBg: 'hover:bg-purple-50/40', 
      hoverText: 'group-hover:text-purple-900',
      tab: 'projects', 
      directAction: true 
    },
    { 
      label: 'Klien', 
      icon: Users, 
      bg: 'bg-blue-100/90 text-blue-700', 
      hoverBorder: 'hover:border-blue-300', 
      hoverBg: 'hover:bg-blue-50/40', 
      hoverText: 'group-hover:text-blue-900',
      tab: 'company_profile', 
      directAction: true 
    },
    { 
      label: 'Buat Akta', 
      icon: FileText, 
      bg: 'bg-emerald-100/90 text-emerald-700', 
      hoverBorder: 'hover:border-emerald-300', 
      hoverBg: 'hover:bg-emerald-50/40', 
      hoverText: 'group-hover:text-emerald-900',
      tab: 'deeds', 
      directAction: true 
    },
    { 
      label: 'Invoice', 
      icon: CreditCard, 
      bg: 'bg-amber-100/90 text-amber-700', 
      hoverBorder: 'hover:border-amber-300', 
      hoverBg: 'hover:bg-amber-50/40', 
      hoverText: 'group-hover:text-amber-900',
      tab: 'invoice', 
      directAction: true 
    }
  ];

  // Secondary Quick Actions (Row 2: 5 Additional Actions shown upon expand)
  const SECONDARY_QUICK_ACTIONS = [
    { 
      label: 'Titipan Uang', 
      icon: Banknote, 
      bg: 'bg-teal-100/90 text-teal-700', 
      hoverBorder: 'hover:border-teal-300', 
      hoverBg: 'hover:bg-teal-50/40', 
      hoverText: 'group-hover:text-teal-900',
      tab: 'deposit_note', 
      directAction: true 
    },
    { 
      label: 'Surat Baru', 
      icon: Mail, 
      bg: 'bg-rose-100/90 text-rose-700', 
      hoverBorder: 'hover:border-rose-300', 
      hoverBg: 'hover:bg-rose-50/40', 
      hoverText: 'group-hover:text-rose-900',
      tab: 'outgoing_mail', 
      directAction: true 
    },
    { 
      label: 'Buku Akta', 
      icon: BookOpen, 
      bg: 'bg-cyan-100/90 text-cyan-700', 
      hoverBorder: 'hover:border-cyan-300', 
      hoverBg: 'hover:bg-cyan-50/40', 
      hoverText: 'group-hover:text-cyan-900',
      tab: 'deeds', 
      directAction: false 
    },
    { 
      label: 'Legalisasi', 
      icon: ShieldCheck, 
      bg: 'bg-indigo-100/90 text-indigo-700', 
      hoverBorder: 'hover:border-indigo-300', 
      hoverBg: 'hover:bg-indigo-50/40', 
      hoverText: 'group-hover:text-indigo-900',
      tab: 'private_deeds', 
      directAction: true 
    },
    { 
      label: 'Laporan', 
      icon: BarChart2, 
      bg: 'bg-violet-100/90 text-violet-700', 
      hoverBorder: 'hover:border-violet-300', 
      hoverBg: 'hover:bg-violet-50/40', 
      hoverText: 'group-hover:text-violet-900',
      tab: 'laporan', 
      directAction: false 
    }
  ];

  const handleActionClick = (qa: any) => {
    const basePath = TAB_TO_PATH[qa.tab] || `/${qa.tab}`;
    if (qa.tab === 'deposit_note' && qa.directAction) {
      setActiveSidebarTab(qa.tab as any);
      navigate('/deposit_note/new');
    } else if (qa.directAction) {
      (setActiveSidebarTab as any)(qa.tab, { search: '?action=new', state: { openCreateModal: true, openNew: true } });
      navigate(`${basePath}?action=new`, { state: { openCreateModal: true, openNew: true } });
    } else {
      setActiveSidebarTab(qa.tab as any);
      navigate(basePath);
    }

    if (setIsSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleNavigateToProjectDetail = (projectId: string) => {
    setActiveSidebarTab('projects');
    navigate(`/projects/${projectId}`);
  };

  const firstName = useMemo(() => {
    if (userProfile?.name) {
      return userProfile.name.split(' ')[0].toUpperCase();
    }
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ')[0].toUpperCase();
    }
    return 'NENDI';
  }, [userProfile, currentUser]);

  // Filtered timeline projects
  const filteredProjects = useMemo(() => {
    return timelineProjects.filter((p) => {
      if ((p as any).isArchived) return false;
      const statusLower = (p.status || '').toLowerCase();
      const categoryLower = ((p as any).statusCategory || '').toLowerCase();
      if (statusLower === 'selesai' || statusLower === 'completed' || categoryLower === 'completed') return false;
      if (statusLower === 'minuta' || categoryLower === 'minuta') return false;

      const titleMatch = (p.title || p.clientSnapshot?.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const jobMatch = (p.jobType || p.projectType || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = titleMatch || jobMatch;

      if (!matchesSearch) return false;

      if (selectedStatus === 'ALL') return true;
      if (selectedStatus === 'PROCESS') return true;
      if (selectedStatus === 'ISSUE') return p.status?.toLowerCase().includes('kendala') || p.status?.toLowerCase().includes('revisi');

      return true;
    });
  }, [timelineProjects, searchQuery, selectedStatus]);

  return (
    <div 
      className="bg-[#f8fafc] min-h-full"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)' }}
    >
      {/* 1. HEADER UTAMA FULL BIRU GRADIENT */}
      <div 
        className="relative text-white pb-14 md:pb-16 px-4 sm:px-6 lg:px-8 rounded-b-[32px] md:rounded-b-[40px] shadow-lg overflow-hidden flex flex-col justify-between"
        style={{
          background: 'linear-gradient(135deg, #1e4f9a 0%, #0f3f86 50%, #082f6b 100%)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)'
        }}
      >
        {/* Abstract Translucent Decorative Shapes */}
        <div className="absolute -top-16 -right-16 w-64 md:w-80 h-64 md:h-80 rounded-full bg-white/10 pointer-events-none blur-xs" />
        <div className="absolute top-20 -left-16 w-44 md:w-56 h-44 md:h-56 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-1 right-20 md:right-48 w-32 md:w-40 h-32 md:h-40 rounded-full bg-white/5 pointer-events-none" />

        {/* TOP NAVBAR ROW */}
        <div className="relative z-10 w-full max-w-[1280px] mx-auto flex items-center justify-between py-1.5 md:py-2">
          {/* KIRI ATAS: Tombol hamburger rounded square */}
          <div className="flex items-center gap-2 relative z-30 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                setIsSidebarOpen?.(!isSidebarOpen);
              }}
              className="w-10 h-10 md:w-11 md:h-11 min-w-[40px] min-h-[40px] md:min-w-[44px] md:min-h-[44px] flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all cursor-pointer text-white shadow-2xs relative z-30 pointer-events-auto select-none"
              aria-label={isSidebarOpen ? "Tutup Menu Sidebar" : "Buka Menu Sidebar"}
              title="Menu Navigasi"
            >
              <Menu size={20} className="pointer-events-none" />
            </button>
          </div>

          {/* TENGAH ATAS: NOTARIS PUTRI Uppercase Letter-spaced */}
          <div className="flex items-center justify-center">
            <span className="text-xs md:text-[13px] font-extrabold uppercase tracking-widest text-white/95 font-heading">
              NOTARIS PUTRI
            </span>
          </div>

          {/* KANAN ATAS: Tanggal/Jam + Notifikasi + Pesan + Dark Mode */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* RealTimeClock */}
            <div className="hidden lg:block">
              <RealTimeClock variant="dark" />
            </div>

            {/* Push Notification Toggle */}
            <div className="flex items-center">
              <PushNotificationToggle 
                userId={currentUser?.uid || userProfile?.uid} 
                className="text-white hover:bg-white/15 hover:text-white"
              />
            </div>

            {/* Mail / Pesan */}
            <button 
              type="button"
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white transition-all cursor-pointer shadow-2xs"
              aria-label="Pesan & Surat"
              title="Pesan"
            >
              <Mail size={16} />
            </button>

            {/* Moon / Dark Mode */}
            <button 
              type="button"
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white transition-all cursor-pointer shadow-2xs"
              aria-label="Mode Gelap"
              title="Mode Tampilan"
            >
              <Moon size={16} />
            </button>
          </div>
        </div>

        {/* HERO GREETING CONTENT */}
        <div className="relative z-10 w-full max-w-[1280px] mx-auto mt-5 md:mt-7 mb-4 md:mb-6 px-1">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white font-heading">
            Hi NOTARIS!
          </h2>
          <p className="text-xs md:text-sm font-medium text-white/85 leading-relaxed max-w-xl mt-1 md:mt-1.5">
            Pantau perkembangan proyek dan aktivitas tim Anda di sini.
          </p>
        </div>
      </div>

      {/* 2. AKSES CEPAT MENUMPEL DI BAGIAN BAWAH HEADER (CARD OVERLAP) */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 md:-mt-10 relative z-20">
        <div className="bg-white rounded-2xl md:rounded-[24px] p-3.5 md:p-5 shadow-lg md:shadow-md border border-slate-200/80 transition-all duration-200">
          
          {/* AKSES CEPAT HEADER BADGE */}
          <div className="flex items-center gap-1.5 mb-3 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
            <Zap size={13} className="text-amber-500 fill-amber-500" />
            <span>AKSES CEPAT</span>
          </div>

          {/* DESKTOP VIEW (MD & UP): 4 PRIMARY SHORTCUTS HORIZONTAL + CHEVRON TOGGLE */}
          <div className="hidden md:block">
            {/* ROW 1: 4 ACTIONS + EXPAND CHEVRON */}
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="grid grid-cols-4 gap-3 flex-1">
                {PRIMARY_QUICK_ACTIONS.map((qa, idx) => {
                  const IconComponent = qa.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleActionClick(qa)}
                      className={`h-[68px] flex items-center gap-3.5 px-4 rounded-xl border border-slate-200/80 ${qa.hoverBorder} ${qa.hoverBg} bg-slate-50/60 hover:bg-white active:scale-[0.98] transition-all cursor-pointer group text-left shadow-2xs`}
                    >
                      <div className={`w-10 h-10 rounded-xl ${qa.bg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                        <IconComponent size={18} />
                      </div>
                      <span className={`text-[13px] font-bold text-slate-800 ${qa.hoverText} truncate`}>
                        {qa.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* EXPAND / COLLAPSE CHEVRON BUTTON */}
              <button
                type="button"
                onClick={() => setIsShortcutsExpanded(!isShortcutsExpanded)}
                className="h-[68px] w-12 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200/70 active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
                aria-label={isShortcutsExpanded ? "Tutup Akses Cepat Tambahan" : "Buka Akses Cepat Tambahan"}
                title={isShortcutsExpanded ? "Sembunyikan shortcut tambahan" : "Tampilkan shortcut tambahan"}
              >
                {isShortcutsExpanded ? (
                  <ChevronUp size={20} className="transition-transform duration-200" />
                ) : (
                  <ChevronDown size={20} className="transition-transform duration-200" />
                )}
              </button>
            </div>

            {/* ROW 2: EXPANDED SECONDARY SHORTCUTS */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isShortcutsExpanded 
                  ? 'max-h-24 opacity-100 mt-3 pt-3 border-t border-slate-100' 
                  : 'max-h-0 opacity-0 mt-0 pt-0 border-t-0 pointer-events-none'
              }`}
            >
              <div className="grid grid-cols-5 gap-2.5">
                {SECONDARY_QUICK_ACTIONS.map((qa, idx) => {
                  const IconComponent = qa.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleActionClick(qa)}
                      className={`h-[54px] flex items-center gap-2.5 px-3.5 rounded-xl border border-slate-200/80 ${qa.hoverBorder} ${qa.hoverBg} bg-slate-50/60 hover:bg-white active:scale-[0.98] transition-all cursor-pointer group text-left shadow-2xs`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${qa.bg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}>
                        <IconComponent size={15} />
                      </div>
                      <span className={`text-xs font-bold text-slate-800 ${qa.hoverText} truncate`}>
                        {qa.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MOBILE VIEW (SCREEN < MD): COMPACT GRID WITH EXPAND */}
          <div className="md:hidden">
            <div className="flex items-center justify-between gap-1 w-full">
              <div className="grid grid-cols-4 gap-1 flex-1">
                {PRIMARY_QUICK_ACTIONS.map((qa, idx) => {
                  const IconComponent = qa.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleActionClick(qa)}
                      className="flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-all py-1"
                    >
                      <div className={`w-11 h-11 rounded-2xl ${qa.bg} flex items-center justify-center mb-1 shadow-2xs group-hover:scale-105 transition-transform shrink-0`}>
                        <IconComponent size={19} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 leading-tight truncate max-w-[58px]">
                        {qa.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* MOBILE EXPAND TOGGLE */}
              <button
                type="button"
                onClick={() => setIsShortcutsExpanded(!isShortcutsExpanded)}
                className="w-8 h-11 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 transition-colors shrink-0"
                aria-label={isShortcutsExpanded ? "Tutup Akses Cepat" : "Buka Akses Cepat"}
              >
                {isShortcutsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {/* MOBILE SECONDARY ACTIONS EXPANDED */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isShortcutsExpanded 
                  ? 'max-h-36 opacity-100 mt-2.5 pt-2.5 border-t border-slate-100' 
                  : 'max-h-0 opacity-0 mt-0 pt-0 pointer-events-none'
              }`}
            >
              <div className="grid grid-cols-5 gap-1 pt-0.5">
                {SECONDARY_QUICK_ACTIONS.map((qa, idx) => {
                  const IconComponent = qa.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleActionClick(qa)}
                      className="flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-all py-1"
                    >
                      <div className={`w-9 h-9 rounded-xl ${qa.bg} flex items-center justify-center mb-1 shadow-2xs shrink-0`}>
                        <IconComponent size={16} />
                      </div>
                      <span className="text-[9px] font-bold text-slate-700 leading-tight truncate max-w-[52px]">
                        {qa.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. TIMELINE PROYEK SEBAGAI KONTEN UTAMA */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 md:mt-8 space-y-4 md:space-y-5">
        {/* SECTION HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1e61c3] flex items-center justify-center border border-blue-100">
              <Briefcase size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-extrabold text-slate-900 font-heading tracking-tight">
                  Timeline Proyek
                </h2>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredProjects.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Pantau progres dan riwayat komentar setiap berkas secara langsung
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* INLINE SEARCH BAR FOR DESKTOP */}
            <div className="hidden md:flex items-center relative w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari proyek atau klien..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 md:py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                selectedStatus !== 'ALL' || searchQuery
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filter</span>
              {(selectedStatus !== 'ALL' || searchQuery) && (
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              )}
            </button>
          </div>
        </div>

        {/* ACTIVE SEARCH BADGE INDICATOR IF SEARCHING */}
        {(searchQuery || selectedStatus !== 'ALL') && (
          <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-100 p-2.5 md:p-3 rounded-xl text-xs text-blue-800 shadow-2xs">
            <span className="font-semibold">Filter aktif:</span>
            {searchQuery && (
              <span className="bg-white px-2.5 py-0.5 rounded-md font-bold text-blue-700 border border-blue-200/60 shadow-2xs">
                "{searchQuery}"
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span className="bg-white px-2.5 py-0.5 rounded-md font-bold text-blue-700 border border-blue-200/60 shadow-2xs">
                Status: {selectedStatus}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
              }}
              className="ml-auto text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}

        {/* PROJECT TIMELINE CARDS LIST */}
        <div className="space-y-3 md:space-y-3.5 w-full">
          {isLoading ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
              <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto" />
              <p className="text-xs font-bold text-slate-600">Memuat timeline proyek terbaru...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Briefcase size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Proyek</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {searchQuery || selectedStatus !== 'ALL' 
                  ? 'Tidak ada proyek yang sesuai dengan filter pencarian.'
                  : 'Belum ada proyek pekerjaan yang terdaftar.'}
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <ProjectTimelineCard
                key={project.projectId}
                project={project}
                currentUser={currentUser}
                onNavigateToDetail={handleNavigateToProjectDetail}
              />
            ))
          )}
        </div>
      </div>

      {/* FILTER MODAL / DRAWER */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[28px] sm:rounded-2xl p-5 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 font-heading">Filter Timeline Proyek</h3>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* SEARCH INPUT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Cari Proyek / Klien</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama PT, RUPS, atau kata kunci..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* STATUS OPTIONS */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Status Pekerjaan</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'ALL', label: 'Semua Status' },
                  { id: 'PROCESS', label: 'Dalam Proses' },
                  { id: 'COMPLETED', label: 'Selesai' },
                  { id: 'ISSUE', label: 'Ada Kendala / Revisi' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedStatus(opt.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                      selectedStatus === opt.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('ALL');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Reset Filter
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#1e61c3] hover:bg-[#174fa3] text-white text-xs font-bold transition-colors shadow-2xs"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
