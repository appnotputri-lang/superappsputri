import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/ui/PageLayout';
import { 
  Menu, 
  Bell, 
  FolderPlus, 
  Users, 
  FileText, 
  CreditCard, 
  MoreHorizontal, 
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
  Briefcase
} from 'lucide-react';
import { ProjectService } from '../services/ProjectService';
import { Project } from '../domain/project/Project';
import { TAB_TO_PATH } from '../constants/tabs';
import { ProjectTimelineCard } from '../features/project-engine/components/ProjectTimelineCard';

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
  setIsSidebarOpen?: (v: boolean) => void;
  userProfile?: any;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects: initialProjectsProp,
  setActiveSidebarTab,
  currentUser,
  setIsSidebarOpen,
  userProfile
}) => {
  const navigate = useNavigate();

  // Realtime Timeline Projects State
  const [timelineProjects, setTimelineProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLainnyaOpen, setIsLainnyaOpen] = useState(false);
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

  // Primary Quick Actions (1 Row Horizontal)
  const PRIMARY_QUICK_ACTIONS = [
    { label: 'Proyek', icon: FolderPlus, bg: 'bg-purple-100 text-purple-700', tab: 'projects', directAction: false },
    { label: 'Klien', icon: Users, bg: 'bg-blue-100 text-blue-700', tab: 'company_profile', directAction: true },
    { label: 'Buat Akta', icon: FileText, bg: 'bg-emerald-100 text-emerald-700', tab: 'deeds', directAction: true },
    { label: 'Invoice', icon: CreditCard, bg: 'bg-amber-100 text-amber-700', tab: 'invoice', directAction: true },
    { label: 'Lainnya', icon: MoreHorizontal, bg: 'bg-slate-100 text-slate-700', isMore: true }
  ];

  // Secondary Quick Actions (Bottom Sheet / Drawer for "Lainnya")
  const SECONDARY_QUICK_ACTIONS = [
    { label: 'Titipan Uang', icon: Banknote, bg: 'bg-teal-100 text-teal-700', tab: 'deposit_note', directAction: true },
    { label: 'Surat Baru', icon: Mail, bg: 'bg-rose-100 text-rose-700', tab: 'outgoing_mail', directAction: true },
    { label: 'Buku Akta', icon: BookOpen, bg: 'bg-cyan-100 text-cyan-700', tab: 'deeds', directAction: false },
    { label: 'Legalisasi', icon: ShieldCheck, bg: 'bg-indigo-100 text-indigo-700', tab: 'private_deeds', directAction: true },
    { label: 'Laporan', icon: BarChart2, bg: 'bg-violet-100 text-violet-700', tab: 'laporan', directAction: false }
  ];

  const handleActionClick = (qa: any) => {
    if (qa.isMore) {
      setIsLainnyaOpen(true);
      return;
    }

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

    setIsLainnyaOpen(false);
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
      const titleMatch = (p.title || p.clientSnapshot?.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const jobMatch = (p.jobType || p.projectType || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = titleMatch || jobMatch;

      if (!matchesSearch) return false;

      if (selectedStatus === 'ALL') return true;
      if (selectedStatus === 'PROCESS') return p.status !== 'completed' && p.status !== 'selesai';
      if (selectedStatus === 'COMPLETED') return p.status === 'completed' || p.status === 'selesai';
      if (selectedStatus === 'ISSUE') return p.status?.toLowerCase().includes('kendala') || p.status?.toLowerCase().includes('revisi');

      return true;
    });
  }, [timelineProjects, searchQuery, selectedStatus]);

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-16">
      {/* 1. HEADER BIRU */}
      <div 
        className="relative bg-gradient-to-b from-[#1e61c3] to-[#174fa3] text-white pb-14 px-5 rounded-b-[36px] shadow-md overflow-hidden"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)'
        }}
      >
        {/* Subtle Decorative Blue-on-Blue Accents */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute top-28 -left-16 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-2 right-10 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

        {/* HEADER TOP ROW */}
        <div className="relative z-10 flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => {
              if (setIsSidebarOpen) setIsSidebarOpen(true);
            }}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all cursor-pointer text-white shadow-2xs"
            aria-label="Buka Menu Sidebar"
          >
            <Menu size={20} />
          </button>

          <h1 className="text-base font-bold tracking-wide text-white font-heading">
            Notaris Putri
          </h1>

          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white/90">
            <Bell size={19} />
          </div>
        </div>

        {/* GREETING BLOCK */}
        <div className="relative z-10 space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-heading">
            Hi {firstName}!
          </h2>
          <p className="text-xs font-medium text-white/90 leading-relaxed max-w-[320px]">
            Pantau perkembangan proyek dan aktivitas tim Anda di sini.
          </p>
        </div>
      </div>

      {/* 2. QUICK ACTION — HANYA SATU BARIS HORIZONTAL */}
      <div className="px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl p-3 shadow-lg border border-slate-100/90 overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-between gap-2 min-w-full">
            {PRIMARY_QUICK_ACTIONS.map((qa, idx) => {
              const IconComponent = qa.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleActionClick(qa)}
                  className="flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-all flex-1 min-w-[62px] py-1"
                >
                  <div className={`w-11 h-11 rounded-2xl ${qa.bg} flex items-center justify-center mb-1 shadow-2xs group-hover:scale-105 transition-transform shrink-0`}>
                    <IconComponent size={20} />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 leading-none truncate max-w-[64px]">
                    {qa.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. TIMELINE PROYEK SEBAGAI KONTEN UTAMA */}
      <div className="px-4 mt-6 space-y-4 max-w-4xl mx-auto">
        {/* SECTION HEADER */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-[#1e61c3]" />
            <h2 className="text-base font-extrabold text-slate-900 font-heading tracking-tight">
              Timeline Proyek
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
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

        {/* ACTIVE SEARCH BADGE INDICATOR IF SEARCHING */}
        {(searchQuery || selectedStatus !== 'ALL') && (
          <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-100 p-2.5 rounded-xl text-xs text-blue-800">
            <span className="font-semibold">Filter aktif:</span>
            {searchQuery && (
              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-blue-700 shadow-2xs">
                "{searchQuery}"
              </span>
            )}
            {selectedStatus !== 'ALL' && (
              <span className="bg-white px-2 py-0.5 rounded-md font-bold text-blue-700 shadow-2xs">
                Status: {selectedStatus}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('ALL');
              }}
              className="ml-auto text-blue-600 font-bold hover:underline"
            >
              Reset
            </button>
          </div>
        )}

        {/* PROJECT TIMELINE CARDS LIST */}
        <div className="space-y-3">
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

      {/* MODAL BOTTOM SHEET FOR "LAINNYA" SHORTCUTS */}
      {isLainnyaOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[28px] sm:rounded-2xl p-5 space-y-4 shadow-2xl border border-slate-100 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 font-heading">Shortcut Lainnya</h3>
              <button
                type="button"
                onClick={() => setIsLainnyaOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              {SECONDARY_QUICK_ACTIONS.map((qa, idx) => {
                const IconComponent = qa.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleActionClick(qa)}
                    className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100 active:scale-95 rounded-2xl border border-slate-200/60 transition-all text-center cursor-pointer"
                  >
                    <div className={`w-11 h-11 rounded-2xl ${qa.bg} flex items-center justify-center mb-1.5 shadow-2xs shrink-0`}>
                      <IconComponent size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {qa.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
