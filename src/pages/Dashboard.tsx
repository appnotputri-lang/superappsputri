import React, { useState, useEffect, useMemo } from 'react';
import { PageContainer, EmptyState } from '../components/ui/PageLayout';
import { SimpleAreaChart, DataPoint } from '../components/ui/SimpleAreaChart';
import MigrationTool from '../features/migration/MigrationTool';
import { 
  Clock, 
  FileText, 
  ChevronRight, 
  FileCheck, 
  Calendar,
  Users,
  Briefcase,
  Globe,
  Award,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Compass,
  ArrowUpRight
} from 'lucide-react';
import { ProjectService } from '../services/ProjectService';
import { Project, Party } from '../domain/project/Project';

interface DashboardProps {
  profiles: any[];
  projects: any[];
  rupstProjects: any[];
  pendirianProjects: any[];
  compiledActivities: any[];
  compiledDocuments: any[];
  setActiveSidebarTab: (tab: string) => void;
  setEditingProjectId: (id: string | null) => void;
  setEditingRupstId: (id: string | null) => void;
  updateData: (data: any) => void;
  INITIAL_STATE: any;
  handleDownloadProject: (project: any) => void;
  currentUser?: any;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profiles = [],
  projects = [],
  rupstProjects = [],
  pendirianProjects = [],
  compiledActivities = [],
  setActiveSidebarTab,
  currentUser
}) => {
  const [officeProjects, setOfficeProjects] = useState<Project[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Date filter state for PMPJ
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showPmpjStats, setShowPmpjStats] = useState<boolean>(true);

  // Granularity selection
  const [granularity, setGranularity] = useState<string>('Bulanan');

  const fetchProjects = async () => {
    setLoadingStats(true);
    try {
      const list = await ProjectService.listProjects();
      if (list) {
        setOfficeProjects(list);
      }
    } catch (err) {
      console.error("Gagal memuat daftar proyek untuk statistik:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // 1. Klien Aktif Count
  const activeClientsCount = profiles.length;

  // Real client growth calculation (comparing created dates if present)
  const profileGrowthInfo = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;
    
    let thisMonthCount = 0;
    let lastMonthCount = 0;
    let hasDates = false;

    profiles.forEach(p => {
      const dateVal = p.createdAt || p.created_at || p.tanggal;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          hasDates = true;
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (key === thisMonthKey) thisMonthCount++;
          if (key === lastMonthKey) lastMonthCount++;
        }
      }
    });

    if (!hasDates) return null;
    const diff = thisMonthCount - lastMonthCount;
    if (diff === 0) return null;

    if (lastMonthCount < 5) {
      const sign = diff > 0 ? '+' : '';
      return {
        text: `${sign}${diff} klien dari bulan lalu`,
        isPositive: diff > 0
      };
    }

    const pct = Math.round((diff / lastMonthCount) * 100);
    if (pct > 200 || pct < -200) {
      const sign = diff > 0 ? '+' : '';
      return {
        text: `${sign}${diff} klien dari bulan lalu`,
        isPositive: diff > 0
      };
    }

    return {
      text: `${pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`} dari bulan lalu`,
      isPositive: pct >= 0
    };
  }, [profiles]);

  // 2. Proyek Berjalan Count
  const runningProjectsCount = useMemo(() => {
    if (officeProjects.length > 0) {
      return officeProjects.filter(p => p.status !== 'Selesai' && p.status !== 'Selesai & Diserahkan').length;
    }
    return projects.length + rupstProjects.length + pendirianProjects.length;
  }, [officeProjects, projects, rupstProjects, pendirianProjects]);

  // Real project growth calculation
  const projectGrowthInfo = useMemo(() => {
    if (!officeProjects || officeProjects.length === 0) return null;
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;

    let thisMonthCount = 0;
    let lastMonthCount = 0;
    let hasDates = false;

    officeProjects.forEach(p => {
      if (p.createdAt) {
        const d = new Date(p.createdAt);
        if (!isNaN(d.getTime())) {
          hasDates = true;
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (key === thisMonthKey) thisMonthCount++;
          if (key === lastMonthKey) lastMonthCount++;
        }
      }
    });

    if (!hasDates) return null;
    const diff = thisMonthCount - lastMonthCount;
    if (diff === 0) return null;

    if (lastMonthCount < 5) {
      const sign = diff > 0 ? '+' : '';
      return {
        text: `${sign}${diff} proyek dari bulan lalu`,
        isPositive: diff > 0
      };
    }

    const pct = Math.round((diff / lastMonthCount) * 100);
    if (pct > 200 || pct < -200) {
      const sign = diff > 0 ? '+' : '';
      return {
        text: `${sign}${diff} proyek dari bulan lalu`,
        isPositive: diff > 0
      };
    }

    return {
      text: `${pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`} dari bulan lalu`,
      isPositive: pct >= 0
    };
  }, [officeProjects]);

  // 3. Dokumen Perlu Ditinjau Count (Filtered directly from projects in review/approval/proses stage)
  const pendingDocsCount = useMemo(() => {
    return officeProjects.filter(p => {
      const s = (p.status || '').toLowerCase();
      return s.includes('review') || s.includes('approval') || s.includes('proses');
    }).length;
  }, [officeProjects]);

  // 4. Ringkasan Hari Ini Stats
  const todayProjectsCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return officeProjects.filter(p => p.createdAt && new Date(p.createdAt).toDateString() === todayStr).length;
  }, [officeProjects]);

  const completedLaporanCount = useMemo(() => {
    const completedProj = officeProjects.filter(p => p.status === 'Selesai' || p.status === 'Selesai & Diserahkan').length;
    const completedAct = compiledActivities.filter(a => a.status === 'Selesai').length;
    return completedProj + completedAct;
  }, [officeProjects, compiledActivities]);

  // 5. Monthly project creation trend chart data (Calculated from real officeProjects created dates)
  const monthlyChartData: DataPoint[] = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();
    const currentMonthIdx = now.getMonth();
    const currentYear = now.getFullYear();

    const countsByMonthYear: Record<string, number> = {};

    officeProjects.forEach(proj => {
      if (proj.createdAt) {
        const d = new Date(proj.createdAt);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          countsByMonthYear[key] = (countsByMonthYear[key] || 0) + 1;
        }
      }
    });

    // Generate last 7 months window
    const result: DataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonthIdx - i, 1);
      const mIdx = targetDate.getMonth();
      const yVal = targetDate.getFullYear();
      const key = `${yVal}-${mIdx}`;
      
      result.push({
        label: monthNames[mIdx],
        value: countsByMonthYear[key] || 0
      });
    }
    return result;
  }, [officeProjects]);

  // Chart derived mini-cards stats
  const totalChartDocs = useMemo(() => monthlyChartData.reduce((acc, curr) => acc + curr.value, 0), [monthlyChartData]);
  const avgChartDocs = useMemo(() => (totalChartDocs / (monthlyChartData.length || 1)).toFixed(1), [totalChartDocs, monthlyChartData]);

  const highestMonth = useMemo(() => {
    if (totalChartDocs === 0) return { label: '-', value: 0 };
    return [...monthlyChartData].sort((a, b) => b.value - a.value)[0];
  }, [monthlyChartData, totalChartDocs]);

  const lowestMonth = useMemo(() => {
    if (totalChartDocs === 0) return { label: '-', value: 0 };
    return [...monthlyChartData].sort((a, b) => a.value - b.value)[0];
  }, [monthlyChartData, totalChartDocs]);

  // 6. Recent Activities list
  const recentActivitiesList = useMemo(() => {
    const items: Array<{ id: string; desc: string; time: string; timestamp: number; user: string }> = [];

    if (compiledActivities && compiledActivities.length > 0) {
      compiledActivities.forEach(act => {
        items.push({
          id: act.id || Math.random().toString(),
          desc: act.desc || act.title || act.action || 'Aktivitas sistem',
          time: act.time || 'Baru saja',
          timestamp: act.createdAt ? new Date(act.createdAt).getTime() : Date.now(),
          user: act.user || act.createdBy || 'ADMIN'
        });
      });
    }

    officeProjects.forEach(p => {
      if (p.updatedAt || p.createdAt) {
        const d = new Date(p.updatedAt || p.createdAt);
        const timeStr = isNaN(d.getTime()) ? 'Baru saja' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        items.push({
          id: p.projectId,
          desc: `Proyek "${p.title || p.jobType}" diupdate (${p.status})`,
          time: timeStr,
          timestamp: isNaN(d.getTime()) ? 0 : d.getTime(),
          user: p.assignedTo || 'ADMIN'
        });
      }
    });

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);
  }, [compiledActivities, officeProjects]);

  // PMPJ / SRA Data processing
  const filteredProjectsForStats = useMemo(() => {
    return officeProjects.filter(p => {
      if (!p.createdAt) return true;
      const createdTime = new Date(p.createdAt).getTime();
      
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (createdTime < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (createdTime > end.getTime()) return false;
      }
      
      return true;
    });
  }, [officeProjects, startDate, endDate]);

  const allParties = useMemo(() => {
    const parties: Party[] = [];
    filteredProjectsForStats.forEach(p => {
      if (p.parties && Array.isArray(p.parties)) {
        p.parties.forEach(party => {
          parties.push(party);
        });
      }
    });
    return parties;
  }, [filteredProjectsForStats]);

  const totalParties = allParties.length;

  const pekerjaanCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Pengusaha': 0,
      'Pegawai Swasta': 0,
      'PNS': 0,
      'Profesional': 0,
      'Pedagang': 0,
      'Pengajar': 0,
      'Petani': 0,
      'Lainnya': 0
    };
    
    allParties.forEach(p => {
      if (!p.pekerjaan) {
        counts['Lainnya']++;
        return;
      }
      const job = p.pekerjaan.trim().toLowerCase();
      if (job === 'pengusaha') {
        counts['Pengusaha']++;
      } else if (job.includes('swasta') || job.includes('karyawan')) {
        counts['Pegawai Swasta']++;
      } else if (job === 'pns' || job.includes('negeri') || job.includes('sipil')) {
        counts['PNS']++;
      } else if (job.includes('dokter') || job.includes('advokat') || job.includes('notaris') || job.includes('akuntan') || job.includes('profesional') || job.includes('spesialis') || job.includes('bidan')) {
        counts['Profesional']++;
      } else if (job.includes('pedagang') || job.includes('dagang')) {
        counts['Pedagang']++;
      } else if (job.includes('guru') || job.includes('dosen') || job.includes('pengajar')) {
        counts['Pengajar']++;
      } else if (job.includes('petani') || job.includes('tani')) {
        counts['Petani']++;
      } else {
        counts['Lainnya']++;
      }
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allParties]);

  const jabatanCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Direktur': 0,
      'Komisaris': 0,
      'Pemegang Saham': 0,
      'Kuasa': 0,
      'Lainnya': 0
    };
    
    allParties.forEach(p => {
      if (!p.jabatan) {
        counts['Lainnya']++;
        return;
      }
      const role = p.jabatan.trim().toLowerCase();
      if (role.includes('direktur') || role.includes('director')) {
        counts['Direktur']++;
      } else if (role.includes('komisaris') || role.includes('commissioner')) {
        counts['Komisaris']++;
      } else if (role.includes('saham') || role.includes('shareholder')) {
        counts['Pemegang Saham']++;
      } else if (role.includes('kuasa') || role.includes('proxy')) {
        counts['Kuasa']++;
      } else {
        counts['Lainnya']++;
      }
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allParties]);

  const kewarganegaraanCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allParties.forEach(p => {
      let warganegara = (p.kewarganegaraan || 'WNI').trim().toUpperCase();
      if (warganegara === 'INDONESIA') warganegara = 'WNI';
      counts[warganegara] = (counts[warganegara] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allParties]);

  return (
    <PageContainer>
      {/* 1. Top Stats Row: 3 Gradient Cards + Ringkasan Hari Ini */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        
        {/* Stat 1: Klien Aktif (Blue Gradient) */}
        <div 
          onClick={() => setActiveSidebarTab('company_profile')}
          className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-[#1877f2] via-[#2563eb] to-[#1d4ed8] text-white shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-40"
        >
          <div className="absolute -right-3 -bottom-3 text-white/10 group-hover:scale-110 transition-transform duration-300">
            <Users size={110} />
          </div>
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">Klien Aktif</span>
            <div className="text-3xl font-extrabold font-heading tracking-tight">
              {activeClientsCount}
            </div>
            <p className="text-xs text-blue-100 font-medium">Total klien perusahaan</p>
          </div>
          
          {profileGrowthInfo && (
            <div className="relative z-10 flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-white/10 backdrop-blur-xs px-2.5 py-1 rounded-full w-fit">
              <span>{profileGrowthInfo.text}</span>
            </div>
          )}
        </div>

        {/* Stat 2: Proyek Berjalan (Indigo Gradient) */}
        <div 
          onClick={() => setActiveSidebarTab('projects')}
          className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-800 text-white shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-40"
        >
          <div className="absolute -right-3 -bottom-3 text-white/10 group-hover:scale-110 transition-transform duration-300">
            <Briefcase size={110} />
          </div>
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">Proyek Berjalan</span>
            <div className="text-3xl font-extrabold font-heading tracking-tight">
              {runningProjectsCount}
            </div>
            <p className="text-xs text-indigo-100 font-medium">Proyek dalam proses</p>
          </div>

          {projectGrowthInfo && (
            <div className="relative z-10 flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-white/10 backdrop-blur-xs px-2.5 py-1 rounded-full w-fit">
              <span>{projectGrowthInfo.text}</span>
            </div>
          )}
        </div>

        {/* Stat 3: Dokumen Perlu Ditinjau (Orange Gradient) */}
        <div 
          onClick={() => setActiveSidebarTab('laporan')}
          className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-orange-500 via-amber-600 to-amber-700 text-white shadow-md shadow-amber-500/10 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between h-40"
        >
          <div className="absolute -right-3 -bottom-3 text-white/10 group-hover:scale-110 transition-transform duration-300">
            <AlertCircle size={110} />
          </div>
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-amber-100 uppercase tracking-wider">Dokumen Perlu Ditinjau</span>
            <div className="text-3xl font-extrabold font-heading tracking-tight">
              {pendingDocsCount}
            </div>
            <p className="text-xs text-amber-100 font-medium">Menunggu review</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setActiveSidebarTab('laporan'); }}
            className="relative z-10 flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg w-fit transition-colors cursor-pointer"
          >
            <span>Lihat Dokumen</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Stat 4: Ringkasan Hari Ini (White Card) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-40">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-heading border-b border-slate-100 pb-2">
            Ringkasan Hari Ini
          </h3>
          <div className="space-y-3 text-xs my-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                  <Briefcase size={14} />
                </span>
                <span className="font-medium">Proyek Dibuat</span>
              </div>
              <span className="font-bold text-slate-900 font-mono text-sm">{todayProjectsCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                  <CheckCircle2 size={14} />
                </span>
                <span className="font-medium">Laporan Diselesaikan</span>
              </div>
              <span className="font-bold text-slate-900 font-mono text-sm">{completedLaporanCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Main Split Section: Chart Area + Agenda & Activities Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Spans): Analisis Aktivitas Proyek Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Analisis Aktivitas Proyek</h3>
                <p className="text-xs text-slate-500">Tren proyek baru dibuat per bulan</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-slate-600 font-medium">
                <Calendar size={13} className="text-slate-400" />
                <span>{monthlyChartData[0]?.label} - {monthlyChartData[monthlyChartData.length - 1]?.label} {new Date().getFullYear()}</span>
              </div>
              <select
                value={granularity}
                onChange={(e) => setGranularity(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="Bulanan">Bulanan</option>
                <option value="Mingguan">Mingguan</option>
                <option value="Harian">Harian</option>
              </select>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="py-2">
            <SimpleAreaChart data={monthlyChartData} height={200} />
          </div>

          {/* 4 Mini Cards under Chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                <RefreshCw size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-medium truncate">Total Proyek</p>
                <p className="text-sm font-extrabold text-slate-800 font-heading">{totalChartDocs}</p>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                <BarChart2 size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-medium truncate">Rata-rata/Bulan</p>
                <p className="text-sm font-extrabold text-slate-800 font-heading">{avgChartDocs}</p>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-medium truncate">Tertinggi</p>
                <p className="text-sm font-extrabold text-slate-800 font-heading truncate">
                  {highestMonth.value > 0 ? `${highestMonth.value} (${highestMonth.label})` : '0 (-)'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-medium truncate">Terendah</p>
                <p className="text-sm font-extrabold text-slate-800 font-heading truncate">
                  {lowestMonth.value > 0 ? `${lowestMonth.value} (${lowestMonth.label})` : '0 (-)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Span): Agenda Prioritas Hari Ini & Aktivitas Terbaru */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* Card: Agenda Prioritas Hari Ini (Honest Empty State) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-heading">
                <Calendar size={15} className="text-blue-600" />
                <span>Agenda Prioritas Hari Ini</span>
              </h3>
            </div>

            <div className="p-6 text-center space-y-2.5 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 my-auto">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
                <Calendar size={20} />
              </div>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                Belum ada agenda terjadwal — fitur ini akan tersedia setelah modul Kalender dibangun.
              </p>
            </div>
          </div>

          {/* Card: Aktivitas Terbaru */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-heading">
                <Clock size={15} className="text-emerald-600" />
                <span>Aktivitas Terbaru</span>
              </h3>
              {recentActivitiesList.length > 0 && (
                <button onClick={() => setActiveSidebarTab('projects')} className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">Lihat Semua</button>
              )}
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
                {recentActivitiesList.map((act) => (
                  <div key={act.id} className="flex items-start justify-between gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-0.5">
                        <FileText size={14} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{act.desc}</h4>
                        <p className="text-[10px] text-slate-400">oleh {act.user}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 shrink-0 font-mono">{act.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 4. Akses Cepat (4 Column Cards) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Compass size={16} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-heading">Akses Cepat</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveSidebarTab('company_profile')}
            className="group p-4 bg-white border border-slate-200/80 hover:border-blue-500/50 rounded-xl shadow-xs hover:shadow-md transition-all text-left flex items-start justify-between cursor-pointer"
          >
            <div className="space-y-2">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <Users size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Tambah Klien Baru</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Buat data klien perusahaan baru</p>
              </div>
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
          </button>

          <button
            onClick={() => setActiveSidebarTab('projects')}
            className="group p-4 bg-white border border-slate-200/80 hover:border-emerald-500/50 rounded-xl shadow-xs hover:shadow-md transition-all text-left flex items-start justify-between cursor-pointer"
          >
            <div className="space-y-2">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <FolderPlus size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Buat Proyek Baru</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Buat dan kelola proyek kerja</p>
              </div>
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-emerald-600 transition-colors shrink-0" />
          </button>

          <button
            onClick={() => setActiveSidebarTab('kbli_mapping')}
            className="group p-4 bg-white border border-slate-200/80 hover:border-indigo-500/50 rounded-xl shadow-xs hover:shadow-md transition-all text-left flex items-start justify-between cursor-pointer"
          >
            <div className="space-y-2">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <FileCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Mapping KBLI</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Kelola &amp; mapping KBLI 2020-2025</p>
              </div>
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors shrink-0" />
          </button>

          <button
            onClick={() => setActiveSidebarTab('laporan')}
            className="group p-4 bg-white border border-slate-200/80 hover:border-amber-500/50 rounded-xl shadow-xs hover:shadow-md transition-all text-left flex items-start justify-between cursor-pointer"
          >
            <div className="space-y-2">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors">Laporan Proyek</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Lihat &amp; buat laporan proyek kerja</p>
              </div>
            </div>
            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-amber-600 transition-colors shrink-0" />
          </button>
        </div>
      </div>

      {/* 5. Collapsible Preserved PMPJ / SRA Analysis Section */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-heading">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Analisis &amp; Statistik PMPJ/SRA</span>
            </h2>
            <p className="text-xs text-slate-500">
              Analisis profil, pekerjaan, jabatan, dan kewarganegaraan personil di seluruh PT yang terdaftar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date range filter */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-slate-700 text-xs focus:ring-0 p-0"
                  title="Tanggal Mulai"
                />
              </div>
              <span className="text-slate-400 font-bold">s/d</span>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-slate-700 text-xs focus:ring-0 p-0"
                  title="Tanggal Selesai"
                />
              </div>
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
              <button 
                onClick={fetchProjects}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={() => setShowPmpjStats(!showPmpjStats)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title={showPmpjStats ? "Sembunyikan" : "Tampilkan"}
            >
              {showPmpjStats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {showPmpjStats && (
          <>
            {loadingStats ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-xs font-medium font-mono">Mengkalkulasi statistik personil...</span>
              </div>
            ) : totalParties === 0 ? (
              <EmptyState
                icon={<Users className="w-5 h-5 text-slate-400" />}
                title="Belum ada data profil personil dalam periode ini"
                description="Silakan tambahkan data direktur, komisaris, atau pemegang saham pada halaman detail proyek PT untuk mengaktifkan analisis otomatis."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Card 1: Pekerjaan */}
                <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2 font-heading">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span>Pekerjaan Orang Dalam PT</span>
                  </h3>
                  <div className="space-y-4">
                    {pekerjaanCounts.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-end justify-between text-xs font-mono">
                          <span className="font-bold text-slate-700 font-sans">{item.name}</span>
                          <div className="flex-1 border-b border-dotted border-slate-300 mx-2 mb-1"></div>
                          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200 rounded text-[11px] min-w-[2rem] text-center">
                            {item.value}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.round((item.value / totalParties) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 2: Jabatan */}
                <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2 font-heading">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Statistik Jabatan</span>
                  </h3>
                  <div className="space-y-4">
                    {jabatanCounts.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-end justify-between text-xs font-mono">
                          <span className="font-bold text-slate-700 font-sans">{item.name}</span>
                          <div className="flex-1 border-b border-dotted border-slate-300 mx-2 mb-1"></div>
                          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200 rounded text-[11px] min-w-[2rem] text-center">
                            {item.value}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.round((item.value / totalParties) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 3: Kewarganegaraan */}
                <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2 font-heading">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>Kewarganegaraan Personil</span>
                  </h3>
                  <div className="space-y-4">
                    {kewarganegaraanCounts.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-end justify-between text-xs font-mono">
                          <span className="font-bold text-slate-700 font-sans">{item.name}</span>
                          <div className="flex-1 border-b border-dotted border-slate-300 mx-2 mb-1"></div>
                          <span className="font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200 rounded text-[11px] min-w-[2rem] text-center">
                            {item.value}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                            style={{ width: `${Math.round((item.value / totalParties) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>

      {/* 6. Migration Tool for Super Admin */}
      {currentUser?.role === 'Super Admin' && (
        <MigrationTool />
      )}
    </PageContainer>
  );
};

export default Dashboard;
