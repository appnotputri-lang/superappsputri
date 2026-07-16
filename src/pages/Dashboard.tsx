// TODO:
// Sprint 7:
// Replace props dengan CompanyContext dan ProjectContext.

import React, { useState, useEffect, useMemo } from 'react';
import MigrationTool from '../features/migration/MigrationTool';
import { 
  Clock, 
  Plus, 
  Building2, 
  FileText, 
  History, 
  FileCode, 
  BookOpen, 
  ChevronRight, 
  FileCheck, 
  Save,
  Filter,
  Calendar,
  Users,
  Briefcase,
  Globe,
  Award,
  Loader2,
  RefreshCw
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
  profiles,
  projects,
  rupstProjects,
  pendirianProjects,
  compiledActivities,
  compiledDocuments,
  setActiveSidebarTab,
  setEditingProjectId,
  setEditingRupstId,
  updateData,
  INITIAL_STATE,
  handleDownloadProject,
  currentUser
}) => {
  const [officeProjects, setOfficeProjects] = useState<Project[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Date filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

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

  // 1. Pekerjaan Orang Dalam PT
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

  // 2. Statistik Jabatan
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

  // 3. Statistik Kewarganegaraan
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
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Redesigned Brand Header row inside dashboard content with Date and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-md w-fit">
            <Clock className="w-3.5 h-3.5 text-[#1890ff]" /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setEditingProjectId('new');
              updateData({ ...INITIAL_STATE } as any);
              setActiveSidebarTab('notulen');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> RUPS LB
          </button>
          <button
            onClick={() => {
              setEditingRupstId('new');
              updateData({ ...INITIAL_STATE } as any);
              setActiveSidebarTab('rupst');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> RUPST
          </button>
          <button
            onClick={() => {
              setActiveSidebarTab('pendirian');
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-xs shadow-sm hover:shadow transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Pendirian PT
          </button>
        </div>
      </div>

      {/* Stats Card Row - 4 beautiful cards matching screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Klien", val: profiles.length, desc: "Database klien perusahaan", icon: Building2, color: "text-[#1890ff] bg-blue-50/80 border-blue-100", tab: "company_profile" as const },
          { label: "Draft RUPS LB", val: projects.length, desc: "Keputusan Sirkuler & PKR LB", icon: FileText, color: "text-amber-600 bg-amber-50/85 border-amber-100/80", tab: "notulen" as const },
          { label: "Draft RUPS Tahunan", val: rupstProjects.length, desc: "Pertanggungjawaban tahun buku", icon: History, color: "text-emerald-600 bg-emerald-50/80 border-emerald-100/70", tab: "rupst" as const },
          { label: "Draft Pendirian PT", val: pendirianProjects.length, desc: "Draft akta pendirian", icon: FileCode, color: "text-purple-600 bg-purple-50/80 border-purple-100/60", tab: "pendirian" as const }
        ].map((st, i) => (
          <div 
            key={i} 
            onClick={() => setActiveSidebarTab(st.tab)}
            className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="space-y-1.5 min-w-0 flex-1 pr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{st.label}</span>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{st.val}</h2>
              <p className="text-[10px] text-slate-400 truncate leading-tight font-medium">{st.desc}</p>
            </div>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-105 ${st.color}`}>
              <st.icon size={40} className="shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard Statistik (PMPJ/SRA) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 animate-pulse" />
              <span>Dashboard Analisis &amp; Statistik PMPJ/SRA</span>
            </h2>
            <p className="text-xs text-slate-400">
              Analisis profil, pekerjaan, jabatan, dan kewarganegaraan personil di seluruh PT yang terdaftar.
            </p>
          </div>

          {/* Date range filter */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
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
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold hover:text-slate-800 transition-colors"
              >
                Reset
              </button>
            )}
            <button 
              onClick={fetchProjects}
              className="p-1.5 text-slate-500 hover:text-slate-850 hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadingStats ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-xs font-medium font-mono">Mengkalkulasi statistik personil...</span>
          </div>
        ) : totalParties === 0 ? (
          <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Belum ada data profil personil dalam periode ini</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Silakan tambahkan data direktur, komisaris, atau pemegang saham pada halaman detail proyek PT untuk mengaktifkan analisis otomatis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Pekerjaan */}
            <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>Pekerjaan Orang Dalam PT</span>
              </h3>
              <div className="space-y-4">
                {pekerjaanCounts.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-end justify-between text-xs font-mono">
                      <span className="font-bold text-slate-700 font-sans">{item.name}</span>
                      <div className="flex-1 border-b border-dotted border-slate-350 mx-2 mb-1"></div>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200 rounded shadow-3xs min-w-[2rem] text-center">
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
            <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Statistik Jabatan</span>
              </h3>
              <div className="space-y-4">
                {jabatanCounts.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-end justify-between text-xs font-mono">
                      <span className="font-bold text-slate-700 font-sans">{item.name}</span>
                      <div className="flex-1 border-b border-dotted border-slate-350 mx-2 mb-1"></div>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200 rounded shadow-3xs min-w-[2rem] text-center">
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
            <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Kewarganegaraan Personil</span>
              </h3>
              <div className="space-y-4">
                {kewarganegaraanCounts.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-end justify-between text-xs font-mono">
                      <span className="font-bold text-slate-700 font-sans">{item.name}</span>
                      <div className="flex-1 border-b border-dotted border-slate-350 mx-2 mb-1"></div>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200 rounded shadow-3xs min-w-[2rem] text-center">
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
      </div>

      {/* Quick Actions (QUICK ACCESS) workflow rows - 3 Elegant Columns */}
      <div className="space-y-3.5">
        <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pl-2.5 border-l-4 border-blue-600 select-none">
          Quick Access
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "Daftar Klien", sub: "Kelola dan lihat seluruh data klien perusahaan.", color: "text-blue-600 bg-blue-50 border-blue-104", icon: Building2, tab: "company_profile" as const },
            { title: "RUPS Tahunan", sub: "Lihat dan kelola draf RUPS Tahunan terbaru.", color: "text-amber-600 bg-amber-50 border-amber-104", icon: History, tab: "rupst" as const },
            { title: "Dokumen & Arsip", sub: "Akses semua draf dokumen dan arsip legalitas.", color: "text-teal-600 bg-teal-50 border-teal-104", icon: BookOpen, tab: "notulen" as const }
          ].map((x, i) => (
            <button
              key={i}
              onClick={() => setActiveSidebarTab(x.tab)}
              className="group border border-slate-200 hover:border-blue-400 p-4 rounded-xl text-left bg-white transition-all hover:shadow-md flex flex-col justify-between h-36"
            >
              <div className="space-y-2">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${x.color} group-hover:scale-110`}>
                  <x.icon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 text-[12px] group-hover:text-blue-600 transition-colors">{x.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-snug font-medium line-clamp-2">{x.sub}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase flex items-center gap-1 mt-2.5">
                Mulai <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Split: Dynamic Activities & Documents inside Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
        
        {/* Cell 1: Recent Activities Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
            <h3 className="text-slate-800 font-extrabold text-sm tracking-tight flex items-center gap-2 select-none">
              <span className="w-1.5 h-4 bg-blue-500 rounded-sm"></span> AKTIVITAS TERAKHIR
            </h3>
            <button 
              onClick={() => setActiveSidebarTab('notulen')} 
              className="text-[#1890ff] hover:underline text-[11px] font-bold uppercase tracking-wider select-none"
            >
              Lihat semua
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
            {compiledActivities.map(item => (
              <div 
                key={item.id} 
                className="p-3 border border-slate-100 hover:border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/50">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-[12px] truncate">{item.desc}</h4>
                    <span className="flex items-center gap-1 font-medium text-[10px] text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-300" /> {item.time}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight shrink-0 select-none ${
                  item.status === 'Selesai' ? 'bg-green-50 text-green-700 border border-green-200/50' : 
                  item.status === 'Dalam Proses' ? 'bg-blue-50 text-blue-700 border border-blue-200/50' : 
                  'bg-amber-50 text-amber-700 border border-amber-200/50'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setActiveSidebarTab('notulen')} 
            className="w-full mt-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-bold border border-slate-200/70 shrink-0 transition-all tracking-wide shadow-sm"
          >
            Lihat semua aktivitas
          </button>
        </div>

        {/* Cell 2: Latest Documents Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[400px]">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 shrink-0">
            <h3 className="text-slate-800 font-extrabold text-sm tracking-tight flex items-center gap-2 select-none">
              <span className="w-1.5 h-4 bg-teal-500 rounded-sm"></span> DOKUMEN TERBARU
            </h3>
            <button 
              onClick={() => setActiveSidebarTab('notulen')} 
              className="text-[#1890ff] hover:underline text-[11px] font-bold uppercase tracking-wider select-none"
            >
              Lihat semua
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
            {compiledDocuments.map(item => (
              <div 
                key={item.id} 
                className="p-3 border border-slate-100 hover:border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200/50">
                    <FileCheck className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-[12px] truncate">{item.name}</h4>
                    <span className="font-bold text-[10px] text-[#1890ff] block truncate leading-none mt-0.5">{item.sub}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border select-none ${
                    item.format === 'PDF' ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 'bg-blue-50 text-blue-700 border-blue-200/60'
                  }`}>
                    {item.format}
                  </span>
                  <button 
                    onClick={() => handleDownloadProject(item)}
                    title="Unduh draf akta asli" 
                    className="bg-white hover:bg-slate-100 p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200/70 transition-all shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setActiveSidebarTab('notulen')} 
            className="w-full mt-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-bold border border-slate-200/70 shrink-0 transition-all tracking-wide shadow-sm"
          >
            Lihat semua dokumen
          </button>
        </div>

      </div>
      
      {currentUser?.role === 'Super Admin' && (
        <MigrationTool />
      )}
    </div>
  );
};
