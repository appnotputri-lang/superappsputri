import React, { useState, useEffect, useMemo } from 'react';
import { PageContainer, EmptyState } from '../components/ui/PageLayout';
import { SimpleAreaChart, DataPoint } from '../components/ui/SimpleAreaChart';
import { 
  Clock, 
  FileText, 
  ChevronRight, 
  FileCheck, 
  Calendar,
  Users,
  Briefcase,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart2,
  ShieldCheck,
  FolderPlus,
  Compass,
  ArrowUpRight,
  BookOpen,
  Menu,
  Bell,
  BellOff,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { ProjectService, COMPLETED_STATUS_LIST } from '../services/ProjectService';
import { Project } from '../domain/project/Project';
import { CompanyService } from '../services/CompanyService';
import { NotaryService } from '../services/NotaryService';
import { FirestoreTracker } from '../lib/firestoreTracker';
import { InvoiceService } from '../services/InvoiceService';
import { Deed, Invoice, OutgoingMail } from '../../types';
import { Mail, CreditCard } from 'lucide-react';

const getActivityIcon = (type: 'proyek' | 'akta' | 'invoice' | 'surat') => {
  switch (type) {
    case 'proyek': return { Icon: Briefcase, bg: 'bg-blue-50', color: 'text-blue-600' };
    case 'akta': return { Icon: FileText, bg: 'bg-emerald-50', color: 'text-emerald-600' };
    case 'invoice': return { Icon: CreditCard, bg: 'bg-red-50', color: 'text-red-600' };
    case 'surat': return { Icon: Mail, bg: 'bg-blue-50', color: 'text-blue-600' };
  }
};

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
  profiles: any[];
  projects: any[];
  rupstProjects: any[];
  pendirianProjects: any[];
  compiledActivities: any[];
  compiledDocuments: any[];
  setActiveSidebarTab: (tab: string) => void;
  setEditingProjectId?: (id: string | null) => void;
  setEditingRupstId?: (id: string | null) => void;
  updateData?: (data: any) => void;
  INITIAL_STATE?: any;
  handleDownloadProject?: (project: any) => void;
  currentUser?: any;
  setIsSidebarOpen?: (v: boolean) => void;
  notifications?: any[];
  userProfile?: any;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profiles = [],
  projects = [],
  rupstProjects = [],
  pendirianProjects = [],
  compiledActivities = [],
  setActiveSidebarTab,
  currentUser,
  setIsSidebarOpen,
  notifications = [],
  userProfile
}) => {
  const [officeProjects, setOfficeProjects] = useState<Project[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [outgoingMails, setOutgoingMails] = useState<OutgoingMail[]>([]);

  // Granularity selection
  const [granularity, setGranularity] = useState<string>('Bulanan');

  // Aggregated/Count states
  const [activeClientsCount, setActiveClientsCount] = useState<number | null>(null);
  const [runningProjectsCount, setRunningProjectsCount] = useState<number | null>(null);
  const [pendingDocsCount, setPendingDocsCount] = useState<number | null>(null);
  const [invoiceBelumDibayarCount, setInvoiceBelumDibayarCount] = useState<number | null>(null);
  const [completedProjectsCount, setCompletedProjectsCount] = useState<number | null>(null);

  // Fetch count aggregations using getCountFromServer with TTL Cache & Deduplication
  const fetchDashboardStats = async () => {
    try {
      const stats = await FirestoreTracker.fetchCached<any>(
        'dashboard_stats',
        'Beranda (Stats)',
        'office_projects, invoices, companies',
        async () => {
          const activeClientsCountValue = await CompanyService.getActiveClientsCount();

          const activeProjectsQuery = query(collection(db, 'office_projects'), where('status', 'not-in', COMPLETED_STATUS_LIST));
          const activeProjectsSnap = await getCountFromServer(activeProjectsQuery);
          const activeProjectsCountValue = activeProjectsSnap.data().count;

          const uniqueReviewStatuses = [
            "Review Draft Notulen/Sirkuler",
            "Review Notulen",
            "Review Draft Akta",
            "Review Draft Perjanjian",
            "Review Draft Akta Pendirian CV",
            "Review Draft",
            "Review Draft Akta Pembubaran CV",
            "Review Draft Akta PPAT",
            "Akta Sedang di Review",
            "AHU sedang di Tinjau",
            "Review Draft Notulen/Sirkuler".toUpperCase(),
            "Review Notulen".toUpperCase(),
            "Review Draft Akta".toUpperCase(),
            "Review Draft".toUpperCase(),
            "Akta Sedang di Review".toUpperCase(),
            "AHU sedang di Tinjau".toUpperCase()
          ];
          const pendingDocsQuery = query(collection(db, 'office_projects'), where('status', 'in', uniqueReviewStatuses));
          const pendingDocsSnap = await getCountFromServer(pendingDocsQuery);
          const pendingDocsCountValue = pendingDocsSnap.data().count;

          const unpaidInvoicesQuery = query(collection(db, 'invoices'), where('status', '==', 'UNPAID'));
          const unpaidInvoicesSnap = await getCountFromServer(unpaidInvoicesQuery);
          const unpaidInvoicesCountValue = unpaidInvoicesSnap.data().count;

          const completedProjectsQuery = query(collection(db, 'office_projects'), where('status', 'in', ['Selesai', 'Selesai & Diserahkan', 'selesai', 'Selesai & Diserahkan'.toUpperCase()]));
          const completedProjectsSnap = await getCountFromServer(completedProjectsQuery);
          const completedProjectsCountValue = completedProjectsSnap.data().count;

          return {
            activeClientsCount: activeClientsCountValue,
            runningProjectsCount: activeProjectsCountValue,
            pendingDocsCount: pendingDocsCountValue,
            invoiceBelumDibayarCount: unpaidInvoicesCountValue,
            completedProjectsCount: completedProjectsCountValue
          };
        },
        5 * 60 * 1000
      );

      setActiveClientsCount(stats.activeClientsCount);
      setRunningProjectsCount(stats.runningProjectsCount);
      setPendingDocsCount(stats.pendingDocsCount);
      setInvoiceBelumDibayarCount(stats.invoiceBelumDibayarCount);
      setCompletedProjectsCount(stats.completedProjectsCount);
    } catch (err) {
      console.error("Gagal memuat statistik dashboard:", err);
      setActiveClientsCount(null);
      setRunningProjectsCount(null);
      setPendingDocsCount(null);
      setInvoiceBelumDibayarCount(null);
      setCompletedProjectsCount(null);
    }
  };

  // Fetch secondary widget data (recent deeds, recent invoices, recent outgoing mails) with TTL Cache & Deduplication
  const fetchSecondaryWidgetData = async () => {
    try {
      const recentData = await FirestoreTracker.fetchCached<any>(
        'dashboard_recent',
        'Beranda (Recent)',
        'office_projects, deeds, invoices, outgoing_mails',
        async () => {
          const [recentProjectsRes, recentDeedsData, recentInvoicesData, recentMailsData] = await Promise.all([
            ProjectService.listRecentProjects(5),
            NotaryService.getRecentDeeds(5),
            InvoiceService.getRecentInvoices(5),
            NotaryService.getRecentOutgoingMails(5)
          ]);

          const recentProjectsList = recentProjectsRes || [];

          return {
            recentProjects: recentProjectsList,
            recentDeeds: recentDeedsData,
            recentInvoices: recentInvoicesData,
            recentMails: recentMailsData
          };
        },
        5 * 60 * 1000
      );

      setOfficeProjects(recentData.recentProjects || []);
      setDeeds(recentData.recentDeeds || []);
      setRecentInvoices(recentData.recentInvoices || []);
      setOutgoingMails(recentData.recentMails || []);

      return {
        deedsCount: recentData.recentDeeds?.length || 0,
        recentInvoicesCount: recentData.recentInvoices?.length || 0,
        mailsCount: recentData.recentMails?.length || 0
      };
    } catch (err) {
      console.error("Gagal memuat data sekunder dashboard:", err);
      return { deedsCount: 0, recentInvoicesCount: 0, mailsCount: 0 };
    }
  };

  // Main project data fetcher for Dashboard widgets
  const fetchProjects = async () => {
    setLoadingStats(true);
    try {
      const statsCached = FirestoreTracker.cacheGet('dashboard_stats');
      const recentCached = FirestoreTracker.cacheGet('dashboard_recent');

      if (statsCached.hit && recentCached.hit) {
        FirestoreTracker.logMenuOpen('Beranda', 'HIT');
        await Promise.all([fetchSecondaryWidgetData(), fetchDashboardStats()]);
      } else {
        FirestoreTracker.logMenuOpen('Beranda', 'MISS', 'office_projects, deeds, invoices', 25);
        await Promise.all([
          fetchSecondaryWidgetData(),
          fetchDashboardStats()
        ]);
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

  // profileGrowthInfo is null as dashboard does not load full profiles collection
  const profileGrowthInfo = null;

  // projectGrowthInfo calculated from recent projects if available
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

  // 4. Ringkasan Hari Ini Stats
  const todayProjectsCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return officeProjects.filter(p => p.createdAt && new Date(p.createdAt).toDateString() === todayStr).length;
  }, [officeProjects]);

  const completedLaporanCount = useMemo(() => {
    if (completedProjectsCount === null) return "—";
    const completedAct = compiledActivities.filter(a => a.status === 'Selesai').length;
    return completedProjectsCount + completedAct;
  }, [completedProjectsCount, compiledActivities]);

  const aktaBulanIniCount = useMemo(() => {
    const now = new Date();
    return deeds.filter(d => {
      const dateVal = d.deedDate || d.date;
      if (!dateVal) return false;
      const dt = new Date(dateVal);
      return !isNaN(dt.getTime()) && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    }).length;
  }, [deeds]);

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
      
      const isCurrentMonth = mIdx === now.getMonth() && yVal === now.getFullYear();
      
      result.push({
        label: monthNames[mIdx],
        value: countsByMonthYear[key] || 0,
        isCurrentMonth
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
    const items: Array<{ id: string; desc: string; subtitle: string; time: string; timestamp: number; type: 'proyek' | 'akta' | 'invoice' | 'surat' }> = [];

    officeProjects.forEach(p => {
      if (p.updatedAt || p.createdAt) {
        const d = new Date(p.updatedAt || p.createdAt);
        items.push({
          id: `proj_${p.projectId}`,
          desc: `Proyek "${p.title || p.jobType}"`,
          subtitle: `${p.status}`,
          time: isNaN(d.getTime()) ? 'Baru saja' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          timestamp: isNaN(d.getTime()) ? 0 : d.getTime(),
          type: 'proyek'
        });
      }
    });

    deeds.forEach(deed => {
      const dateVal = deed.createdAt || deed.deedDate || deed.date;
      if (dateVal) {
        const d = new Date(dateVal);
        items.push({
          id: `deed_${deed.id}`,
          desc: `Akta No. ${deed.deedNumber || deed.number} telah selesai dibuat`,
          subtitle: 'Disimpan ke Buku Daftar Akta',
          time: isNaN(d.getTime()) ? 'Baru saja' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          timestamp: isNaN(d.getTime()) ? 0 : d.getTime(),
          type: 'akta'
        });
      }
    });

    recentInvoices.forEach(inv => {
      const dateVal = inv.createdAt || inv.issueDate;
      if (dateVal) {
        const d = new Date(dateVal);
        const isUnpaid = inv.status === 'UNPAID';
        items.push({
          id: `inv_${inv.id}`,
          desc: `Invoice ${inv.invoiceNumber} ${isUnpaid ? 'belum dibayar' : 'telah lunas'}`,
          subtitle: isUnpaid && inv.dueDate ? `Jatuh tempo ${new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : inv.clientName,
          time: isNaN(d.getTime()) ? 'Baru saja' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          timestamp: isNaN(d.getTime()) ? 0 : d.getTime(),
          type: 'invoice'
        });
      }
    });

    outgoingMails.forEach(mail => {
      const dateVal = mail.createdAt || mail.date;
      if (dateVal) {
        const d = new Date(dateVal);
        items.push({
          id: `mail_${mail.id}`,
          desc: `Surat Keluar No. ${mail.mailNumber}`,
          subtitle: `Terkirim ke ${mail.recipient}`,
          time: isNaN(d.getTime()) ? 'Baru saja' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          timestamp: isNaN(d.getTime()) ? 0 : d.getTime(),
          type: 'surat'
        });
      }
    });

    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
  }, [officeProjects, deeds, recentInvoices, outgoingMails]);

  const [isMobileNotifOpen, setIsMobileNotifOpen] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 19) return 'Selamat sore';
    return 'Selamat malam';
  };

  const unreadCount = useMemo(() => {
    return (notifications || []).filter((n: any) => !n.read).length;
  }, [notifications]);

  const firstName = userProfile?.name?.split(' ')[0] || currentUser?.name?.split(' ')[0] || 'ADMIN';

  return (
    <>
      {/* ===== MOBILE-ONLY HOMESCREEN (< md) ===== */}
      <div className="md:hidden -m-4 sm:-m-6 bg-[#f8fafc] pb-8 overflow-x-hidden">
        {/* Mobile Notification Bottom Sheet - Rendered outside hero to cover full screen & avoid clipping */}
        {isMobileNotifOpen && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end pointer-events-none">
            <div 
              className="fixed inset-0 bg-black/60 pointer-events-auto backdrop-blur-xs transition-opacity" 
              onClick={() => setIsMobileNotifOpen(false)} 
            />
            <div className="relative pointer-events-auto w-full bg-white rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" /> Notifikasi
                </span>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button 
                      onClick={async () => {
                        try {
                          const unreadNotifs = (notifications || []).filter((n: any) => !n.read);
                          await Promise.all(
                            unreadNotifs.map((n: any) => updateDoc(doc(db, 'notifications', n.id), { read: true }))
                          );
                        } catch (err) {
                          console.error("Gagal tandai semua dibaca:", err);
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                    >
                      Tandai semua dibaca
                    </button>
                  )}
                  <button 
                    onClick={() => setIsMobileNotifOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
                {(!notifications || notifications.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <BellOff className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-600 font-semibold">Tidak ada notifikasi baru</p>
                    <p className="text-xs text-slate-400 mt-1">Semua info terbaru dari sistem akan muncul di sini</p>
                  </div>
                ) : (
                  [...notifications].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((notif: any) => (
                    <div key={notif.id} className={`p-4 transition-colors flex gap-3 items-start text-left ${!notif.read ? 'bg-blue-50/40' : 'bg-white'}`}>
                      {/* Status Type Icon */}
                      <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                        notif.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                        notif.type === 'ERROR' ? 'bg-rose-50 text-rose-600' :
                        notif.type === 'WARNING' ? 'bg-amber-50 text-amber-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {notif.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4" /> :
                         notif.type === 'ERROR' ? <AlertCircle className="w-4 h-4" /> :
                         notif.type === 'WARNING' ? <AlertTriangle className="w-4 h-4" /> :
                         <Info className="w-4 h-4" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs block leading-tight truncate ${!notif.read ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                            {(() => {
                              try {
                                const diffMs = Date.now() - new Date(notif.timestamp).getTime();
                                const diffMins = Math.floor(diffMs / 60000);
                                if (diffMins < 1) return 'Baru saja';
                                if (diffMins < 60) return `${diffMins}m lalu`;
                                const diffHours = Math.floor(diffMins / 60);
                                if (diffHours < 24) return `${diffHours}j lalu`;
                                return new Date(notif.timestamp).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
                              } catch {
                                return 'Baru saja';
                              }
                            })()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-normal break-words">{notif.description}</p>
                        
                        {/* Actions */}
                        <div className="flex gap-4 pt-2">
                          {!notif.read && (
                            <button 
                              onClick={async () => {
                                try {
                                  await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                                } catch (err) {
                                  console.error("Gagal tandai dibaca:", err);
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                            >
                              Tandai Dibaca
                            </button>
                          )}
                          <button 
                            onClick={async () => {
                              try {
                                await deleteDoc(doc(db, 'notifications', notif.id));
                              } catch (err) {
                                console.error("Gagal menghapus notifikasi:", err);
                              }
                            }}
                            className="text-xs text-slate-400 hover:text-red-600 font-medium cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 1. HERO HEADER BIRU */}
        <div className="relative bg-[#1e61c3] text-white pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-10 px-5 rounded-b-[2rem] shadow-md overflow-hidden">
          {/* Top Row: Hamburger + Superapps Putri + Bell */}
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen?.(true)} 
                className="p-1.5 -ml-1.5 rounded-xl text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                aria-label="Open menu"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-lg font-bold text-white tracking-tight">Superapps Putri</h1>
            </div>

            <button 
              onClick={() => setIsMobileNotifOpen(prev => !prev)} 
              className="p-2 -mr-1 rounded-full text-white hover:bg-white/10 active:scale-95 relative transition-all cursor-pointer"
              aria-label="Notifications"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-[9px] font-extrabold text-white rounded-full flex items-center justify-center border border-[#1e61c3]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Greeting & Headline */}
          <div className="relative z-10 pt-3 pb-2 space-y-1.5 max-w-xs">
            <p className="text-xs text-blue-100 font-medium tracking-wide">{getGreeting()},</p>
            <h2 className="text-2xl font-black text-white tracking-wide leading-tight">
              {userProfile?.name || currentUser?.name || 'ADMIN'} 👋
            </h2>
            <p className="text-[12px] text-blue-100/90 leading-snug pt-1 font-normal">
              Kelola pekerjaan dan arsip notaris/PPAT lebih mudah dalam satu aplikasi.
            </p>
          </div>

          {/* Dots Grid Decorative Pattern */}
          <div className="absolute right-4 top-14 grid grid-cols-5 gap-2 opacity-25 pointer-events-none">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
            ))}
          </div>
        </div>

        {/* Content Section (Overlapping rounded top card) */}
        <div className="relative z-10 -mt-4 bg-[#f8fafc] rounded-t-[2.5rem] pt-5 px-4 space-y-6">
          
          {/* 2. RINGKASAN HARI INI (3 cards in grid-cols-3) */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold text-slate-900">Ringkasan Hari Ini</h3>
              <span className="text-xs font-medium text-slate-400">
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Proyek Aktif */}
              <button 
                onClick={() => setActiveSidebarTab('projects')} 
                className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs text-left flex flex-col justify-between hover:shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl w-fit mb-2.5">
                    <Briefcase size={18} />
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 leading-none">{runningProjectsCount}</p>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">Proyek Aktif</p>
                </div>
                <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 mt-2.5">
                  Lihat detail <ChevronRight size={12} />
                </span>
              </button>

              {/* Akta Bulan Ini */}
              <button 
                onClick={() => setActiveSidebarTab('deeds')} 
                className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs text-left flex flex-col justify-between hover:shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <div>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-2.5">
                    <FileText size={18} />
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 leading-none">{aktaBulanIniCount}</p>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">Akta Bulan Ini</p>
                </div>
                <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 mt-2.5">
                  Lihat detail <ChevronRight size={12} />
                </span>
              </button>

              {/* Invoice Belum Dibayar */}
              <button 
                onClick={() => setActiveSidebarTab('invoice')} 
                className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs text-left flex flex-col justify-between hover:shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <div>
                  <div className="p-2 bg-rose-50 text-rose-500 rounded-xl w-fit mb-2.5">
                    <CreditCard size={18} />
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 leading-none">{invoiceBelumDibayarCount}</p>
                  <p className="text-[11px] font-bold text-slate-700 mt-1">Invoice Belum Dibayar</p>
                </div>
                <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 mt-2.5">
                  Lihat detail <ChevronRight size={12} />
                </span>
              </button>
            </div>
          </div>

          {/* 3. QUICK ACTION (8 items, grid-cols-4, 2 rows) */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 px-1">Quick Action</h3>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: 'Proyek Baru', icon: FolderPlus, bg: 'bg-blue-50 text-blue-600', tab: 'projects' },
                { label: 'Klien Baru', icon: Users, bg: 'bg-amber-50 text-amber-600', tab: 'company_profile' },
                { label: 'Buat Akta', icon: FileText, bg: 'bg-emerald-50 text-emerald-600', tab: 'deeds' },
                { label: 'Buat Invoice', icon: CreditCard, bg: 'bg-purple-50 text-purple-600', tab: 'invoice' },
                { label: 'Surat Baru', icon: Mail, bg: 'bg-slate-100 text-slate-600', tab: 'outgoing_mail' },
                { label: 'Buku Akta', icon: BookOpen, bg: 'bg-blue-50 text-blue-600', tab: 'deeds' },
                { label: 'Legalisasi & Waarmerking', icon: ShieldCheck, bg: 'bg-teal-50 text-teal-600', tab: 'private_deeds' },
                { label: 'Laporan Bulanan', icon: BarChart2, bg: 'bg-amber-50 text-amber-600', tab: 'notary_reports' },
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

          {/* 4. AKTIVITAS TERBARU */}
          <div className="pb-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-bold text-slate-900">Aktivitas Terbaru</h3>
              <button 
                onClick={() => setActiveSidebarTab('projects')} 
                className="text-xs font-bold text-blue-600 flex items-center gap-0.5 cursor-pointer"
              >
                Lihat semua <ChevronRight size={14} />
              </button>
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
                    <ChevronRight size={14} className="text-slate-300 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ===== DESKTOP HOMESCREEN (existing, md+) ===== */}
      <div className="hidden md:block">
        <PageContainer>
          <div className="space-y-6">
            
            {/* 1. Top Stats Row: 3 Flat Soft Tint Cards + Ringkasan Hari Ini */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              
              {/* Stat 1: Klien Aktif (Blue Tint) */}
              <div 
                onClick={() => setActiveSidebarTab('company_profile')}
                className="p-5 rounded-xl bg-blue-50/80 border border-blue-100 text-slate-800 hover:bg-blue-100/50 hover:border-blue-200 transition-all cursor-pointer flex flex-col justify-between h-32"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Klien Aktif</span>
                  <Users size={18} className="text-blue-600" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[26px] font-medium tracking-tight text-slate-900 leading-none">
                      {activeClientsCount !== null ? activeClientsCount : '—'}
                    </span>
                    {profileGrowthInfo && (
                      <span className={`text-[11px] font-bold ${profileGrowthInfo.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ({profileGrowthInfo.text})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">Total klien perusahaan</p>
                </div>
              </div>

              {/* Stat 2: Proyek Berjalan (Green Tint) */}
              <div 
                onClick={() => setActiveSidebarTab('projects')}
                className="p-5 rounded-xl bg-emerald-50/80 border border-emerald-100 text-slate-800 hover:bg-emerald-100/50 hover:border-emerald-200 transition-all cursor-pointer flex flex-col justify-between h-32"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Proyek Berjalan</span>
                  <Briefcase size={18} className="text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[26px] font-medium tracking-tight text-slate-900 leading-none">
                      {runningProjectsCount !== null ? runningProjectsCount : '—'}
                    </span>
                    {projectGrowthInfo && (
                      <span className={`text-[11px] font-bold ${projectGrowthInfo.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ({projectGrowthInfo.text})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">Proyek dalam proses</p>
                </div>
              </div>

              {/* Stat 3: Dokumen Perlu Ditinjau (Amber Tint) */}
              <div 
                onClick={() => setActiveSidebarTab('laporan')}
                className="p-5 rounded-xl bg-amber-50/80 border border-amber-100 text-slate-800 hover:bg-amber-100/50 hover:border-amber-200 transition-all cursor-pointer flex flex-col justify-between h-32"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Dokumen Perlu Ditinjau</span>
                  <AlertCircle size={18} className="text-amber-600" />
                </div>
                <div>
                  <div className="text-[26px] font-medium tracking-tight text-slate-900 leading-none">
                    {pendingDocsCount !== null ? pendingDocsCount : '—'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">Menunggu review</p>
                </div>
              </div>

              {/* Stat 4: Ringkasan Hari Ini (White Card) */}
              <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs flex flex-col justify-between h-32">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-heading border-b border-slate-100 pb-2">
                  Ringkasan Hari Ini
                </h3>
                <div className="space-y-2 text-xs my-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                        <Briefcase size={12} />
                      </span>
                      <span className="font-medium">Proyek Dibuat</span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono text-sm">{todayProjectsCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                        <CheckCircle2 size={12} />
                      </span>
                      <span className="font-medium">Laporan Diselesaikan</span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono text-sm">{completedLaporanCount}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* 2. Akses Cepat */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Compass size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-heading">Akses Cepat</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Button 1: Tambah Klien */}
                <button
                  onClick={() => setActiveSidebarTab('company_profile')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-blue-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                    <Users size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Klien Baru</span>
                </button>

                {/* Button 2: Proyek Baru */}
                <button
                  onClick={() => setActiveSidebarTab('projects')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-emerald-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <FolderPlus size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Proyek Baru</span>
                </button>

                {/* Button 3: Buat Akta */}
                <button
                  onClick={() => setActiveSidebarTab('deeds')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-cyan-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 shrink-0">
                    <FileText size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Buat Akta</span>
                </button>

                {/* Button 4: Buat Invoice */}
                <button
                  onClick={() => setActiveSidebarTab('invoice')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-purple-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-purple-50 text-purple-600 shrink-0">
                    <CreditCard size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Buat Invoice</span>
                </button>

                {/* Button 5: Surat Baru */}
                <button
                  onClick={() => setActiveSidebarTab('outgoing_mail')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-rose-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 shrink-0">
                    <Mail size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Surat Baru</span>
                </button>

                {/* Button 6: Mapping KBLI */}
                <button
                  onClick={() => setActiveSidebarTab('kbli_mapping')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-indigo-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                    <FileCheck size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Mapping KBLI</span>
                </button>

                {/* Button 7: Legalisasi */}
                <button
                  onClick={() => setActiveSidebarTab('private_deeds')}
                  className="p-4 bg-white border border-slate-200/80 hover:border-teal-500/50 hover:bg-slate-50/50 rounded-xl shadow-xs hover:shadow-sm transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24"
                >
                  <div className="w-[30px] h-[30px] flex items-center justify-center rounded-lg bg-teal-50 text-teal-600 shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">Legalisasi</span>
                </button>

                {/* Button 8: Laporan Proyek */}
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

            {/* 3. Main Split Section: Chart Area + Agenda & Activities Column */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left Column (2 Spans): Analisis Aktivitas Proyek Chart & Agenda Prioritas */}
              <div className="lg:col-span-2 space-y-6 self-start">
                {/* Card: Analisis Aktivitas Proyek */}
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-heading">Analisis Aktivitas Proyek</h3>
                        <p className="text-[11px] text-slate-500">Tren proyek baru dibuat per bulan</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded text-slate-600 font-medium">
                        <Calendar size={11} className="text-slate-400" />
                        <span>{monthlyChartData[0]?.label} - {monthlyChartData[monthlyChartData.length - 1]?.label} {new Date().getFullYear()}</span>
                      </div>
                      <select
                        value={granularity}
                        onChange={(e) => setGranularity(e.target.value)}
                        className="bg-slate-50 border border-slate-200/80 rounded px-1.5 py-0.5 text-slate-700 font-medium focus:outline-none cursor-pointer"
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
                    <div className="bg-slate-50/80 border border-slate-200/70 p-2 rounded-lg flex items-center gap-2 h-[56px]">
                      <div className="p-1 bg-blue-100 text-blue-600 rounded shrink-0">
                        <RefreshCw size={12} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-slate-400 font-medium truncate">Total Proyek</p>
                        <p className="text-xs font-extrabold text-slate-800 font-heading leading-tight">{totalChartDocs}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50/80 border border-slate-200/70 p-2 rounded-lg flex items-center gap-2 h-[56px]">
                      <div className="p-1 bg-emerald-100 text-emerald-600 rounded shrink-0">
                        <BarChart2 size={12} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-slate-400 font-medium truncate">Rata-rata/Bulan</p>
                        <p className="text-xs font-extrabold text-slate-800 font-heading leading-tight">{avgChartDocs}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50/80 border border-slate-200/70 p-2 rounded-lg flex items-center gap-2 h-[56px]">
                      <div className="p-1 bg-indigo-100 text-indigo-600 rounded shrink-0">
                        <ShieldCheck size={12} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-slate-400 font-medium truncate">Tertinggi</p>
                        <p className="text-xs font-extrabold text-slate-800 font-heading leading-tight truncate">
                          {highestMonth.value > 0 ? `${highestMonth.value} (${highestMonth.label})` : '0 (-)'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50/80 border border-slate-200/70 p-2 rounded-lg flex items-center gap-2 h-[56px]">
                      <div className="p-1 bg-amber-100 text-amber-600 rounded shrink-0">
                        <FileText size={12} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-slate-400 font-medium truncate">Terendah</p>
                        <p className="text-xs font-extrabold text-slate-800 font-heading leading-tight truncate">
                          {lowestMonth.value > 0 ? `${lowestMonth.value} (${lowestMonth.label})` : '0 (-)'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card: Agenda Prioritas Hari Ini (Moved directly under Analisis Aktivitas Proyek) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-heading">
                      <Calendar size={15} className="text-blue-600" />
                      <span>Agenda Prioritas Hari Ini</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200/50 text-xs">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span>Belum ada agenda terjadwal hari ini.</span>
                  </div>
                </div>
              </div>

              {/* Right Column (1 Span): Aktivitas Terbaru */}
              <div className="space-y-6 flex flex-col justify-start">
                
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

            </div>

          </div>
        </PageContainer>
      </div>
    </>
  );
};

export default Dashboard;
