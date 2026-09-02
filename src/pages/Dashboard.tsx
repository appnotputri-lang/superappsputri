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
import { useAuthContext } from '../contexts/AuthContext';
import { Menu3DIcon } from '../components/ui/Menu3DIcon';

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

  // Real-time Timeline Projects State
  const [timelineProjects, setTimelineProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShortcutsExpanded, setIsShortcutsExpanded] = useState(true);
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
      iconTab: 'projects',
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
      iconTab: 'company_profile',
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
      iconTab: 'buat_akta',
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
      iconTab: 'invoice',
      tab: 'invoice', 
      directAction: true 
    }
  ];

  // Secondary Quick Actions (Row 2: 4 Actions)
  const SECONDARY_QUICK_ACTIONS = [
    { 
      label: 'Titipan Uang', 
      icon: Banknote, 
      bg: 'bg-teal-100/90 text-teal-700', 
      hoverBorder: 'hover:border-teal-300', 
      hoverBg: 'hover:bg-teal-50/40', 
      hoverText: 'group-hover:text-teal-900',
      iconTab: 'deposit_note',
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
      iconTab: 'outgoing_mail',
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
      iconTab: 'deeds',
      tab: 'deeds', 
      directAction: false 
    },
    { 
      label: 'Laporan', 
      icon: BarChart2, 
      bg: 'bg-violet-100/90 text-violet-700', 
      hoverBorder: 'hover:border-violet-300', 
      hoverBg: 'hover:bg-violet-50/40', 
      hoverText: 'group-hover:text-violet-900',
      iconTab: 'laporan',
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

  let authCtx: any = null;
  try {
    authCtx = useAuthContext();
  } catch {
    authCtx = null;
  }

  const activeUserProfile = userProfile || authCtx?.userProfile;
  const activeUser = currentUser || authCtx?.user;

  const profileDisplayName = useMemo(() => {
    if (activeUserProfile?.name && activeUserProfile.name.trim() !== '') {
      return activeUserProfile.name.toUpperCase();
    }
    if (activeUser?.displayName && activeUser.displayName.trim() !== '') {
      return activeUser.displayName.toUpperCase();
    }
    if (activeUserProfile?.role && activeUserProfile.role.trim() !== '') {
      return activeUserProfile.role.toUpperCase();
    }
    if (activeUser?.email) {
      return activeUser.email.split('@')[0].toUpperCase();
    }
    return 'ADMIN';
  }, [activeUserProfile, activeUser]);

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
    <div className="bg-[#f8fafc] min-h-full pb-8">
      {/* 1. HEADER UTAMA FULL BIRU */}
      <div 
        className="relative text-white bg-header-gradient pb-14 md:pb-16 px-4 sm:px-6 lg:px-8 rounded-b-[32px] md:rounded-b-[40px] shadow-lg overflow-hidden flex flex-col justify-between"
        style={{
          background: 'var(--primary-header-gradient)',
          paddingTop: 'calc(var(--ios-safe-top) + 0.625rem)'
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
            Hi {profileDisplayName}!
          </h2>
          <p className="text-xs md:text-sm font-medium text-white/85 leading-relaxed max-w-xl mt-1 md:mt-1.5">
            Pantau perkembangan proyek dan aktivitas tim Anda di sini.
          </p>
        </div>
      </div>

      {/* 2. AKSES CEPAT MENUMPEL DI BAGIAN BAWAH HEADER (CARD OVERLAP) */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 md:-mt-10 relative z-20">
        <div className="glass-card rounded-2xl md:rounded-[24px] p-3.5 md:p-5 transition-all duration-200">
          
          {/* AKSES CEPAT HEADER: BADGE DI KIRI & TOMBOL EXPAND/COLLAPSE DI KANAN ATAS */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
              <Zap size={13} className="text-amber-500 fill-amber-500" />
              <span>AKSES CEPAT</span>
            </div>

            {/* EXPAND / COLLAPSE BUTTON DI KANAN ATAS */}
            <button
              type="button"
              onClick={() => setIsShortcutsExpanded(!isShortcutsExpanded)}
              className="w-7 h-7 flex items-center justify-center rounded-lg glass-item hover:bg-white text-slate-500 hover:text-slate-900 border border-white/80 active:scale-95 transition-all cursor-pointer shadow-2xs"
              aria-label={isShortcutsExpanded ? "Sembunyikan baris kedua" : "Tampilkan baris kedua"}
              title={isShortcutsExpanded ? "Sembunyikan baris kedua" : "Tampilkan baris kedua"}
            >
              {isShortcutsExpanded ? (
                <ChevronUp size={16} className="transition-transform duration-200" />
              ) : (
                <ChevronDown size={16} className="transition-transform duration-200" />
              )}
            </button>
          </div>

          {/* DESKTOP VIEW (MD & UP): 4 COLUMNS X 2 ROWS (FULL WIDTH) */}
          <div className="hidden md:block">
            {/* ROW 1: 4 ACTIONS */}
            <div className="grid grid-cols-4 gap-3.5 w-full">
              {PRIMARY_QUICK_ACTIONS.map((qa, idx) => {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleActionClick(qa)}
                    className={`h-[72px] flex items-center gap-3.5 px-4 rounded-2xl border border-white/80 ${qa.hoverBorder} ${qa.hoverBg} glass-item hover:bg-white active:scale-[0.98] transition-all cursor-pointer group text-left shadow-2xs`}
                  >
                    <Menu3DIcon tabId={qa.iconTab || qa.tab} size={46} className="group-hover:scale-105 transition-transform shrink-0" />
                    <span className={`text-[13.5px] font-bold text-slate-800 ${qa.hoverText} truncate`}>
                      {qa.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ROW 2: 4 SECONDARY SHORTCUTS */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isShortcutsExpanded 
                  ? 'max-h-28 opacity-100 mt-3 pt-3 border-t border-slate-100/80' 
                  : 'max-h-0 opacity-0 mt-0 pt-0 border-t-0 pointer-events-none'
              }`}
            >
              <div className="grid grid-cols-4 gap-3.5 w-full">
                {SECONDARY_QUICK_ACTIONS.map((qa, idx) => {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleActionClick(qa)}
                      className={`h-[72px] flex items-center gap-3.5 px-4 rounded-2xl border border-white/80 ${qa.hoverBorder} ${qa.hoverBg} glass-item hover:bg-white active:scale-[0.98] transition-all cursor-pointer group text-left shadow-2xs`}
                    >
                      <Menu3DIcon tabId={qa.iconTab || qa.tab} size={46} className="group-hover:scale-105 transition-transform shrink-0" />
                      <span className={`text-[13.5px] font-bold text-slate-800 ${qa.hoverText} truncate`}>
                        {qa.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MOBILE VIEW (SCREEN < MD): COMPACT 4x2 GRID (FULL WIDTH) */}
          <div className="md:hidden">
            {/* ROW 1: 4 ACTIONS */}
            <div className="grid grid-cols-4 gap-2 w-full">
              {PRIMARY_QUICK_ACTIONS.map((qa, idx) => {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleActionClick(qa)}
                    className="flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-all py-1.5 px-1 rounded-xl glass-item hover:bg-white border border-white/60 shadow-2xs"
                  >
                    <div className="mb-1.5 group-hover:scale-105 transition-transform">
                      <Menu3DIcon tabId={qa.iconTab || qa.tab} size={46} />
                    </div>
                    <span className="text-[10.5px] font-bold text-slate-800 leading-tight truncate w-full px-0.5">
                      {qa.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ROW 2: 4 SECONDARY SHORTCUTS */}
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isShortcutsExpanded 
                  ? 'max-h-36 opacity-100 mt-2.5 pt-2.5 border-t border-slate-100/80' 
                  : 'max-h-0 opacity-0 mt-0 pt-0 pointer-events-none'
              }`}
            >
              <div className="grid grid-cols-4 gap-2 w-full">
                {SECONDARY_QUICK_ACTIONS.map((qa, idx) => {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleActionClick(qa)}
                      className="flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-all py-1.5 px-1 rounded-xl glass-item hover:bg-white border border-white/60 shadow-2xs"
                    >
                      <div className="mb-1.5 group-hover:scale-105 transition-transform">
                        <Menu3DIcon tabId={qa.iconTab || qa.tab} size={46} />
                      </div>
                      <span className="text-[10.5px] font-bold text-slate-800 leading-tight truncate w-full px-0.5">
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
