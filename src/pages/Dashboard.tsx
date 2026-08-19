import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/ui/PageLayout';
import { 
  Clock, 
  FileText, 
  FileCheck, 
  Users,
  Briefcase,
  AlertCircle,
  ShieldCheck,
  FolderPlus,
  Compass,
  ArrowUpRight,
  BookOpen,
  AlertTriangle,
  Info,
  CreditCard,
  Mail,
  BarChart2,
  Banknote,
  Menu,
  Bell,
  ChevronRight
} from 'lucide-react';
import { ProjectService } from '../services/ProjectService';
import { Project } from '../domain/project/Project';
import { FirestoreTracker } from '../lib/firestoreTracker';
import { TAB_TO_PATH } from '../constants/tabs';

const getDetailedActivityStyles = (type: 'proyek' | 'akta' | 'invoice' | 'surat', desc: string) => {
  const isInvoiceUnpaid = type === 'invoice' && desc.toLowerCase().includes('belum dibayar');
  
  if (isInvoiceUnpaid) {
    return {
      Icon: AlertTriangle,
      bg: 'bg-amber-50',
      color: 'text-amber-600',
      subtitleColor: 'text-amber-600 font-medium'
    };
  }

  switch (type) {
    case 'surat':
      return {
        Icon: ArrowUpRight,
        bg: 'bg-blue-50',
        color: 'text-blue-600',
        subtitleColor: 'text-slate-400'
      };
    case 'akta':
      return {
        Icon: FileCheck,
        bg: 'bg-emerald-50',
        color: 'text-emerald-600',
        subtitleColor: 'text-slate-400'
      };
    case 'proyek':
      return {
        Icon: Briefcase,
        bg: 'bg-indigo-50',
        color: 'text-indigo-600',
        subtitleColor: 'text-slate-400'
      };
    default:
      return {
        Icon: FileText,
        bg: 'bg-slate-100',
        color: 'text-slate-600',
        subtitleColor: 'text-slate-400'
      };
  }
};

const getMobileShortcutLabel = (label: string): string => {
  switch (label) {
    case 'Proyek Baru': return 'Proyek Kerja';
    case 'Klien Baru': return 'Klien';
    case 'Buat Invoice': return 'Invoice';
    case 'Laporan Proyek': return 'Laporan';
    case 'Surat Baru': return 'Surat Baru';
    default: return label;
  }
};

const getMobileShortcutTileStyle = (label: string) => {
  switch (label) {
    case 'Klien Baru':
    case 'Klien':
      return { tileBg: 'bg-blue-50', textColor: 'text-blue-600' };
    case 'Proyek Baru':
    case 'Proyek Kerja':
      return { tileBg: 'bg-purple-50', textColor: 'text-purple-600' };
    case 'Buat Invoice':
    case 'Invoice':
      return { tileBg: 'bg-emerald-50', textColor: 'text-emerald-600' };
    case 'Buat Akta':
    case 'Buku Akta':
      return { tileBg: 'bg-amber-50', textColor: 'text-amber-600' };
    case 'Surat Baru':
      return { tileBg: 'bg-rose-50', textColor: 'text-rose-600' };
    case 'Titipan Uang':
      return { tileBg: 'bg-teal-50', textColor: 'text-teal-600' };
    case 'Laporan Proyek':
    case 'Laporan':
      return { tileBg: 'bg-violet-50', textColor: 'text-violet-600' };
    case 'Legalisasi':
      return { tileBg: 'bg-cyan-50', textColor: 'text-cyan-600' };
    default:
      return { tileBg: 'bg-blue-50', textColor: 'text-blue-600' };
  }
};

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
  profiles,
  projects,
  rupstProjects,
  pendirianProjects,
  compiledActivities,
  compiledDocuments,
  setActiveSidebarTab,
  currentUser,
  setIsSidebarOpen,
  userProfile
}) => {
  const navigate = useNavigate();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

  const QUICK_ACTIONS = useMemo(() => [
    { label: 'Proyek Baru', icon: FolderPlus, bg: 'bg-blue-50 text-blue-600', tab: 'projects', directAction: true },
    { label: 'Klien Baru', icon: Users, bg: 'bg-amber-50 text-amber-600', tab: 'company_profile', directAction: true },
    { label: 'Buat Akta', icon: FileText, bg: 'bg-emerald-50 text-emerald-600', tab: 'deeds', directAction: true },
    { label: 'Buat Invoice', icon: CreditCard, bg: 'bg-purple-50 text-purple-600', tab: 'invoice', directAction: true },
    { label: 'Titipan Uang', icon: Banknote, bg: 'bg-emerald-50 text-emerald-600', tab: 'deposit_note', directAction: true },
    { label: 'Surat Baru', icon: Mail, bg: 'bg-rose-50 text-rose-600', tab: 'outgoing_mail', directAction: true },
    { label: 'Buku Akta', icon: BookOpen, bg: 'bg-cyan-50 text-cyan-600', tab: 'deeds', directAction: false },
    { label: 'Legalisasi', icon: ShieldCheck, bg: 'bg-teal-50 text-teal-600', tab: 'private_deeds', directAction: true },
    { label: 'Laporan Proyek', icon: BarChart2, bg: 'bg-amber-50 text-amber-600', tab: 'laporan', directAction: false },
  ], []);

  const handleQuickAction = (qa: typeof QUICK_ACTIONS[0]) => {
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

  // Fetch max 5 recent projects for activities section
  const fetchRecentData = async () => {
    try {
      const recentData = await FirestoreTracker.fetchCached<any>(
        'dashboard_recent',
        'Beranda (Recent Projects)',
        'office_projects',
        async () => {
          const recentProjectsList = await ProjectService.listRecentProjects(5).catch(() => []);
          return { recentProjects: recentProjectsList };
        },
        10 * 60 * 1000 // 10 mins TTL
      );

      setRecentProjects(recentData.recentProjects || []);
    } catch (err) {
      console.error("Gagal memuat data aktivitas dashboard:", err);
    }
  };

  useEffect(() => {
    fetchRecentData();
  }, []);

  // 5 Recent Activities (Max 5 items)
  const recentActivitiesList = useMemo(() => {
    const items: Array<{ id: string; desc: string; subtitle: string; time: string; timestamp: number; type: 'proyek' | 'akta' | 'invoice' | 'surat' }> = [];

    // 1. From recent projects (max 5)
    recentProjects.forEach(p => {
      if (p.updatedAt || p.createdAt) {
        const d = new Date(p.updatedAt || p.createdAt);
        items.push({
          id: `proj_${p.projectId}`,
          desc: `Proyek "${p.title || p.jobType}"`,
          subtitle: `Status: ${p.status}`,
          time: isNaN(d.getTime()) ? 'Baru saja' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          timestamp: isNaN(d.getTime()) ? 0 : d.getTime(),
          type: 'proyek'
        });
      }
    });

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [recentProjects]);

  const firstName = useMemo(() => {
    if (userProfile?.name) {
      return userProfile.name.split(' ')[0].toUpperCase();
    }
    return 'ADMIN';
  }, [userProfile]);

  return (
    <>
      {/* ===== MOBILE-ONLY HOMESCREEN (< md) ===== */}
      <div className="md:hidden bg-[#f8fafc] min-h-screen pb-12 overflow-x-hidden">
        {/* HERO BIRU */}
        <div 
          className="relative bg-gradient-to-b from-[#1e61c3] to-[#174fa3] text-white pb-16 px-5 rounded-b-[36px] shadow-md overflow-hidden"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)'
          }}
        >
          {/* Subtle Decorative Blue-on-Blue Accents */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-28 -left-16 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute bottom-2 right-10 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          {/* HEADER HERO */}
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

          {/* GREETING */}
          <div className="relative z-10 space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-white font-heading">
              Hi {firstName}!
            </h2>
            <p className="text-xs font-medium text-white/90 leading-relaxed max-w-[280px]">
              Kelola pekerjaan notaris Anda dengan mudah dan cepat.
            </p>
          </div>
        </div>

        {/* QUICK ACCESS FLOATING CARD (OVERLAPPING HERO) */}
        <div className="px-4 -mt-10 relative z-20">
          <div className="bg-white rounded-[28px] p-5 shadow-lg border border-slate-100/90">
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {QUICK_ACTIONS.map((qa, idx) => {
                const displayLabel = getMobileShortcutLabel(qa.label);
                const tileStyle = getMobileShortcutTileStyle(qa.label);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickAction(qa)}
                    className="flex flex-col items-center justify-start text-center cursor-pointer group active:scale-95 transition-all"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${tileStyle.tileBg} ${tileStyle.textColor} flex items-center justify-center mb-1.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0`}>
                      <qa.icon size={22} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 leading-tight text-center px-0.5 max-w-full truncate">
                      {displayLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CONTENT SECTION: AKTIVITAS TERBARU & RINGKASAN */}
        <div className="px-4 mt-6 space-y-6">
          {/* 1. AKTIVITAS TERBARU */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-900 font-heading">Aktivitas Terbaru</h3>
              <button
                type="button"
                onClick={() => {
                  setActiveSidebarTab('projects');
                  navigate(TAB_TO_PATH['projects'] || '/projects');
                }}
                className="text-xs font-bold text-[#1e61c3] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Lihat All</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              {recentActivitiesList.length === 0 ? (
                <div className="p-6 text-center text-xs font-medium text-slate-400">
                  Belum ada aktivitas terbaru.
                </div>
              ) : (
                recentActivitiesList.map((act) => {
                  const { Icon, bg, color, subtitleColor } = getDetailedActivityStyles(act.type, act.desc);
                  return (
                    <div
                      key={act.id}
                      onClick={() => {
                        if (act.type === 'proyek') {
                          setActiveSidebarTab('projects');
                          navigate(TAB_TO_PATH['projects'] || '/projects');
                        }
                      }}
                      className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}>
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate leading-snug">{act.desc}</p>
                          <p className={`text-[11px] truncate mt-0.5 ${subtitleColor}`}>{act.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <span className="text-[10px] font-medium text-slate-400 font-mono">{act.time}</span>
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== DESKTOP HOMESCREEN (md+) ===== */}
      <div className="hidden md:block">
        <PageContainer>
          <div className="space-y-6">
            
            {/* 2. Akses Cepat */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Compass size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Akses Cepat</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {QUICK_ACTIONS.map((qa, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(qa)}
                    className="p-4 bg-white border border-slate-200/80 hover:border-blue-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                  >
                    <div className={`w-[30px] h-[30px] flex items-center justify-center rounded-lg ${qa.bg} shrink-0`}>
                      <qa.icon size={16} />
                    </div>
                    <span className="text-xs font-bold text-slate-800 truncate">{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Aktivitas Terbaru (Maksimal 5) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-heading">
                  <Clock size={15} className="text-emerald-600" />
                  <span>Aktivitas Terbaru</span>
                </h3>
              </div>

              {recentActivitiesList.length === 0 ? (
                <div className="p-6 text-center space-y-2 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Clock size={20} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Belum ada aktivitas terbaru.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivitiesList.map((act) => {
                    const { Icon, bg, color, subtitleColor } = getDetailedActivityStyles(act.type, act.desc);
                    return (
                      <div key={act.id} className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`p-1.5 ${bg} ${color} rounded-lg shrink-0 mt-0.5`}>
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{act.desc}</h4>
                            <p className={`text-[10px] truncate ${subtitleColor}`}>{act.subtitle}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0 font-mono">{act.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </PageContainer>
      </div>
    </>
  );
};

export default Dashboard;
