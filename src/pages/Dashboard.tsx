import React, { useState, useEffect, useMemo } from 'react';
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
  BarChart2
} from 'lucide-react';
import { ProjectService } from '../services/ProjectService';
import { Project } from '../domain/project/Project';
import { FirestoreTracker } from '../lib/firestoreTracker';

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
  setActiveSidebarTab,
  currentUser,
  setIsSidebarOpen,
  userProfile
}) => {
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);

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

  return (
    <>
      {/* ===== MOBILE-ONLY HOMESCREEN (< md) ===== */}
      <div className="md:hidden bg-[#f8fafc] px-4 py-5 pb-8 space-y-6 overflow-x-hidden">
        
        {/* 2. QUICK ACTION */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 px-1">Akses Cepat</h3>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: 'Proyek Baru', icon: FolderPlus, bg: 'bg-blue-50 text-blue-600', tab: 'projects' },
                { label: 'Klien Baru', icon: Users, bg: 'bg-amber-50 text-amber-600', tab: 'company_profile' },
                { label: 'Buat Akta', icon: FileText, bg: 'bg-emerald-50 text-emerald-600', tab: 'deeds' },
                { label: 'Buat Invoice', icon: CreditCard, bg: 'bg-purple-50 text-purple-600', tab: 'invoice' },
                { label: 'Surat Baru', icon: Mail, bg: 'bg-slate-100 text-slate-600', tab: 'outgoing_mail' },
                { label: 'Buku Akta', icon: BookOpen, bg: 'bg-blue-50 text-blue-600', tab: 'deeds' },
                { label: 'Legalisasi', icon: ShieldCheck, bg: 'bg-teal-50 text-teal-600', tab: 'private_deeds' },
                { label: 'Laporan Proyek', icon: BarChart2, bg: 'bg-amber-50 text-amber-600', tab: 'laporan' },
              ].map((qa, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveSidebarTab(qa.tab)} 
                  className="bg-white rounded-2xl border border-slate-100 shadow-xs p-2.5 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md active:scale-95 transition-all min-h-[92px]"
                >
                  <div className={`${qa.bg} p-2.5 rounded-2xl mb-1 flex items-center justify-center`}>
                    <qa.icon size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 leading-tight text-center">
                    {qa.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. AKTIVITAS TERBARU (Maksimal 5) */}
          <div className="pb-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold text-slate-900">Aktivitas Terbaru</h3>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs divide-y divide-slate-100">
              {recentActivitiesList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-medium">Belum ada aktivitas terbaru.</div>
              ) : recentActivitiesList.map((act) => {
                const { Icon, bg, color, subtitleColor } = getDetailedActivityStyles(act.type, act.desc);
                return (
                  <div key={act.id} className="flex items-center gap-3 p-3.5">
                    <div className={`${bg} ${color} p-2 rounded-xl shrink-0`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{act.desc}</p>
                      <p className={`text-[11px] truncate mt-0.5 ${subtitleColor}`}>{act.subtitle}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0">{act.time}</span>
                  </div>
                );
              })}
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
                <button
                  onClick={() => setActiveSidebarTab('company_profile')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-blue-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                    <Users size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">+ Klien Baru</span>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('projects')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-emerald-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <FolderPlus size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">+ Proyek Baru</span>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('invoice')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-purple-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-purple-50 text-purple-600 shrink-0">
                    <CreditCard size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">+ Buat Invoice</span>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('deeds')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-cyan-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Buku Daftar Akta</span>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('outgoing_mail')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-rose-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 shrink-0">
                    <Mail size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Surat Keluar</span>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('private_deeds')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-teal-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-teal-50 text-teal-600 shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Legalisasi & Waarmerking</span>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('kbli_mapping')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-indigo-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                    <FileCheck size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Mapping KBLI</span>
                </button>

                <button
                  onClick={() => setActiveSidebarTab('laporan')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-amber-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                    <BarChart2 size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Laporan Proyek</span>
                </button>
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
