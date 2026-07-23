import React, { useMemo, useState, useEffect } from 'react';
import { Search, FileText, Download, Smartphone, Send, SendHorizontal, AlertCircle, CheckCircle2, RefreshCw, X, Image } from 'lucide-react';
import { DocumentStatusBadge } from '../../components/DocumentStatusBadge';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getApiUrl } from '../lib/api';
import { toJpeg } from 'html-to-image';
import { useProjectContext } from '../contexts/ProjectContext';
import { ProjectCategory, PROJECT_TYPES } from '../constants/appConstants';
import { ProjectService } from '../services/ProjectService';

interface LaporanListProps {
  projects?: any[];
  rupstProjects?: any[];
  pendirianProjects?: any[];
}

type JobGroupFilter = 'ALL' | 'RUPS LB' | 'RUPS TAHUNAN' | 'PENDIRIAN PT';

export interface GroupedReportItem {
  pekerjaan: string;
  status: string;
  metadata?: any;
  updatedAt: any;
  id: string;
  lastTransitionComment?: string;
}

export interface GroupedReport {
  id: string;
  namaPt: string;
  items: GroupedReportItem[];
}

export function getProjectStatusDisplay(status: string, metadata?: any): string {
  const s = (status || '').toLowerCase();
  const isCompleted = s === 'completed' || s === 'archived' || s === 'selesai';
  if (isCompleted) {
    if (metadata?.minutaCheckedAll === false || !metadata?.minutaCheckedAll) {
      return 'Progres Minuta';
    }
  }
  return status;
}

export function getCleanTransitionComment(comment: string | undefined): string {
  if (!comment) return '-';
  const c = comment.trim();
  if (c.startsWith("Status proyek beralih dari") && c.includes("menuju")) {
    return '-';
  }
  if (c.startsWith("Proyek '") && c.includes("telah berhasil diinisialisasi")) {
    return '-';
  }
  return c;
}

export function getGroupedReports(reports: any[]): GroupedReport[] {
  const groupedMap = new Map<string, GroupedReport>();
  
  reports.forEach(r => {
    const key = r.namaPt.trim().toUpperCase();
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        id: r.id,
        namaPt: r.namaPt,
        items: []
      });
    }
    groupedMap.get(key)!.items.push({
      pekerjaan: r.pekerjaan,
      status: r.status,
      metadata: r.metadata,
      updatedAt: r.updatedAt,
      id: r.id,
      lastTransitionComment: r.lastTransitionComment
    });
  });
  
  return Array.from(groupedMap.values());
}

export const getStatusCategory = (status: string, metadata?: any) => {
  const displayStatus = getProjectStatusDisplay(status, metadata);
  const s = (displayStatus || '').toUpperCase().trim();
  if (s === 'PROGRES MINUTA' || s === 'SELESAI' || s === 'FINAL' || s === 'COMPLETE' || s === 'SIAP_KIRIM') {
    return 'SELESAI';
  }
  if (s === 'SUDAH INPUT AHU') {
    return 'SUDAH INPUT AHU';
  }
  if (s === 'SUDAH CETAK AKTA') {
    return 'SUDAH CETAK AKTA';
  }
  if (s === 'DRAFT NOTULEN DI KIRIM' || s === 'DRAFT NOTULEN DIKIRIM' || s === 'DRAFT AKTA DIKIRIM') {
    return 'DRAFT AKTA & NOTULEN DIKIRIM';
  }
  return 'PROSES DRAFTING';
};

export const STATUS_CATEGORIES = [
  { id: 'PROSES DRAFTING', label: 'PROSES DRAFTING' },
  { id: 'DRAFT AKTA & NOTULEN DIKIRIM', label: 'DRAFT AKTA & NOTULEN DIKIRIM' },
  { id: 'SUDAH CETAK AKTA', label: 'SUDAH CETAK AKTA' },
  { id: 'SUDAH INPUT AHU', label: 'SUDAH INPUT AHU' },
  { id: 'SELESAI', label: 'SELESAI' }
] as const;

export const LaporanList: React.FC<LaporanListProps> = ({ projects: propsProjects, rupstProjects: propsRupst, pendirianProjects: propsPendirian }) => {
  const { projects: contextProjects, rupstProjects: contextRupst, pendirianProjects: contextPendirian } = useProjectContext();
  const projects = propsProjects || contextProjects || [];
  const rupstProjects = propsRupst || contextRupst || [];
  const pendirianProjects = propsPendirian || contextPendirian || [];

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [officeProjects, setOfficeProjects] = useState<any[]>([]);
  const [activeReportTab, setActiveReportTab] = useState<'aktif' | 'minuta'>('aktif');
  const [projectCommentsMap, setProjectCommentsMap] = useState<Record<string, string>>({});

  // WhatsApp States
  const [modalOpen, setModalOpen] = useState(false);
  const [targetNumber, setTargetNumber] = useState('');
  const [adminNumber, setAdminNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [testingStatus, setTestingStatus] = useState(false);

  // New Group-based WhatsApp States
  const [sendMode, setSendMode] = useState<'NUMBER' | 'GROUP'>('GROUP');
  const [groups, setGroups] = useState<{ id: string; name: string; member?: number }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [syncingGroups, setSyncingGroups] = useState(false);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  
  // Toast Notification States
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load office_projects
  useEffect(() => {
    const loadOfficeProjects = async () => {
      try {
        const list = await ProjectService.listProjects();
        setOfficeProjects(list || []);

        // Fetch timelines for all projects in parallel to populate the custom comments map
        const commentsMap: Record<string, string> = {};
        await Promise.all(
          (list || []).map(async (p) => {
            try {
              const timelines = await ProjectService.getProjectTimelines(p.projectId);
              if (timelines && timelines.length > 0) {
                // Find the latest custom transition comment from newest to oldest
                for (const t of timelines) {
                  const clean = getCleanTransitionComment(t.description);
                  if (clean && clean !== '-') {
                    commentsMap[p.projectId] = clean;
                    break;
                  }
                }
              }
            } catch (err) {
              console.warn(`Gagal memuat timeline untuk proyek ${p.projectId}:`, err);
            }
          })
        );
        setProjectCommentsMap(commentsMap);
      } catch (err) {
        console.error("Gagal memuat office_projects untuk laporan:", err);
      }
    };
    loadOfficeProjects();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  // Compile all data records (only showing projects from the "Proyek Kerja" menu as requested)
  const allReports = useMemo(() => {
    const list: any[] = [];
    
    // Modern office_projects (Proyek Kerja menu)
    officeProjects.forEach(p => {
      let companyName = p.title || '';
      if (p.title && p.title.includes(' — ')) {
        companyName = p.title.split(' — ').slice(1).join(' — ');
      } else if (p.title && p.title.includes(' - ')) {
        companyName = p.title.split(' - ').slice(1).join(' - ');
      }

      const customComment = projectCommentsMap[p.projectId] || p.lastTransitionComment || '-';

      list.push({
        id: p.projectId,
        namaPt: companyName || '-',
        pekerjaan: p.projectType || 'Perubahan',
        projectCategory: p.projectCategory || 'BODY_LEGAL',
        projectType: p.projectType || 'Perubahan',
        status: p.status || 'DRAFT',
        metadata: p.metadata || {},
        updatedAt: p.updatedAt || p.createdAt || 0,
        lastTransitionComment: customComment
      });
    });

    // Sort by recent update
    return list.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [officeProjects, projectCommentsMap]);

  // Apply grouping, search, and tab filters (Proyek Aktif vs Minuta)
  const filteredReports = useMemo(() => {
    let result = allReports;

    // Apply tab filter: Proyek Aktif vs Minuta
    const isProjectCompleted = (status: string) => {
      const s = (status || '').toLowerCase();
      return s === 'completed' || s === 'archived' || s === 'selesai';
    };

    if (activeReportTab === 'aktif') {
      result = result.filter(r => !isProjectCompleted(r.status));
    } else if (activeReportTab === 'minuta') {
      result = result.filter(r => isProjectCompleted(r.status));
    }

    // Apply category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter(r => r.projectCategory === selectedCategory);
    }

    // Apply specific projectType filter
    if (selectedType !== 'ALL') {
      result = result.filter(r => r.projectType === selectedType);
    }

    // Apply status category filter
    if (selectedStatus !== 'ALL') {
      result = result.filter(r => getStatusCategory(r.status, r.metadata) === selectedStatus);
    }

    // Apply search query filter
    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter(r => 
        r.namaPt.toLowerCase().includes(lower) || 
        r.pekerjaan.toLowerCase().includes(lower) ||
        r.status.toLowerCase().includes(lower)
      );
    }

    return result;
  }, [allReports, activeReportTab, selectedCategory, selectedType, selectedStatus, search]);

  // Load WhatsApp configurations from Firestore when component loads or modal opens
  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'settings', 'whatsapp');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const sData = docSnap.data();
          setTargetNumber(sData.nomorTujuanDefault || '');
          setAdminNumber(sData.nomorAdmin || '');
        }
      } catch (err) {
        console.warn("LaporanList failing to load WhatsApp settings from Firestore: ", err);
      }
    }
    loadSettings();
  }, [modalOpen]);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const userToken = await auth.currentUser?.getIdToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      const response = await fetch(getApiUrl('/api/whatsapp-groups'), {
        method: 'POST',
        headers
      });
      const resText = await response.text();
      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        throw new Error("Respon server tidak valid atau format data API terganggu. Pastikan integrasi Fonnte Anda aktif.");
      }
      if (response.ok && resData.groups) {
        const fetchedGroups = resData.groups;
        setGroups(fetchedGroups);
        
        // Auto search/select for 'KANTOR NOTARIS/PPAT' case-insensitively
        const found = fetchedGroups.find((g: any) => 
          g.name && g.name.toUpperCase().includes('KANTOR NOTARIS/PPAT')
        ) || fetchedGroups.find((g: any) => 
          g.name && (g.name.toUpperCase().includes('NOTARIS') || g.name.toUpperCase().includes('PPAT'))
        );

        if (found) {
          setSelectedGroupId(found.id);
          setSendMode('GROUP');
        } else if (fetchedGroups.length > 0) {
          setSelectedGroupId(fetchedGroups[0].id);
          setSendMode('GROUP');
        } else {
          setSendMode('NUMBER');
        }
      } else {
        console.warn("Gagal mendapatkan grup WhatsApp:", resData.error || "Format tidak sesuai.");
      }
    } catch (err: any) {
      console.error("Gagal memuat daftar grup WhatsApp:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Load Groups in Modal
  useEffect(() => {
    if (modalOpen) {
      fetchGroups();
    }
  }, [modalOpen]);

  const handleSyncGroups = async () => {
    setSyncingGroups(true);
    try {
      const userToken = await auth.currentUser?.getIdToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      const response = await fetch(getApiUrl('/api/whatsapp-groups-sync'), {
        method: 'POST',
        headers
      });
      const resText = await response.text();
      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        throw new Error("Respon sinkronisasi tidak valid dari server backend.");
      }
      if (response.ok && resData.success) {
        showToast('success', resData.message || 'Sinkronisasi berhasil! Memuat ulang...');
        await fetchGroups();
      } else {
        showToast('error', resData.error || 'Sinkronisasi gagal.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Koneksi error saat menyinkronkan grup.');
    } finally {
      setSyncingGroups(false);
    }
  };

  // Build formatted WhatsApp message matching exact client request layout
  const generateWhatsAppMessage = () => {
    const todayStr = new Date().toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Calculate totals
    const total = filteredReports.length;
    let selesaiCount = 0;
    let ahuCount = 0;
    let aktaCount = 0;
    let dikirimCount = 0;
    let draftingCount = 0;

    filteredReports.forEach(r => {
      const cat = getStatusCategory(r.status, r.metadata);
      if (cat === 'SELESAI') selesaiCount++;
      else if (cat === 'SUDAH INPUT AHU') ahuCount++;
      else if (cat === 'SUDAH CETAK AKTA') aktaCount++;
      else if (cat === 'DRAFT AKTA & NOTULEN DIKIRIM') dikirimCount++;
      else draftingCount++;
    });

    let msg = `📋 LAPORAN PROYEK KERJA (${activeReportTab === 'aktif' ? 'PROYEK AKTIF' : 'MINUTA'})\n\n`;
    msg += `Tanggal: ${todayStr}\n\n`;
    msg += `📊 RINGKASAN STATUS\n\n`;
    msg += `• Total Pekerjaan : ${total}\n`;
    msg += `• Selesai : ${selesaiCount}\n`;
    msg += `• Sudah Input AHU : ${ahuCount}\n`;
    msg += `• Sudah Cetak Akta : ${aktaCount}\n`;
    msg += `• Draft Akta/Notulen Dikirim : ${dikirimCount}\n`;
    msg += `• Proses Drafting : ${draftingCount}\n\n`;
    msg += `📌 DAFTAR PEKERJAAN BERDASARKAN STATUS\n\n`;

    STATUS_CATEGORIES.forEach(cat => {
      const catReports = filteredReports.filter(r => getStatusCategory(r.status, r.metadata) === cat.id);
      if (catReports.length === 0) return;

      const groupedCatReports = getGroupedReports(catReports);

      msg += `📁 STATUS: ${cat.label}\n`;
      groupedCatReports.forEach((g, idx) => {
        msg += `${idx + 1}. ${g.namaPt.toUpperCase()}\n`;
        g.items.forEach(it => {
          const displayStatus = getProjectStatusDisplay(it.status, it.metadata);
          msg += `   - ${it.pekerjaan.toUpperCase()} (Status: ${displayStatus.toUpperCase()})\n`;
        });
      });
      msg += `\n`;
    });

    return msg.trim();
  };

  // Submit report sending via Fonnte Proxied Endpoint
  const handleSendWhatsApp = async () => {
    let finalTarget = '';
    let targetLabel = '';

    if (sendMode === 'GROUP') {
      if (!selectedGroupId) {
        showToast('error', 'Silakan pilih WhatsApp Group tujuan terlebih dahulu.');
        return;
      }
      finalTarget = selectedGroupId;
      
      const matchedGroup = groups.find(g => g.id === selectedGroupId);
      targetLabel = matchedGroup ? matchedGroup.name : 'WhatsApp Group';
    } else {
      if (!targetNumber) {
        showToast('error', 'Silakan tentukan nomor WhatsApp tujuan terlebih dahulu.');
        return;
      }
      const cleanNum = targetNumber.replace(/[^0-9]/g, '');
      if (!cleanNum.startsWith('62') && !cleanNum.startsWith('08') && !cleanNum.startsWith('8')) {
        showToast('error', 'Format nomor tujuan tidak valid. Masukkan nomor HP Indonesia yang valid.');
        return;
      }
      finalTarget = cleanNum;
      targetLabel = cleanNum;
    }

    setSending(true);
    try {
      const userToken = await auth.currentUser?.getIdToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      const response = await fetch(getApiUrl('/api/send-whatsapp'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target: finalTarget,
          message: generateWhatsAppMessage()
        })
      });

      const resText = await response.text();
      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        throw new Error("Respon server tidak valid atau format data API terganggu ketika mengirim WhatsApp.");
      }

      if (response.ok && resData.success) {
        showToast('success', `Laporan berhasil dikirim ke ${targetLabel}!`);
        setModalOpen(false);
      } else {
        showToast('error', resData.error || 'WhatsApp Gateway gagal mengirimkan laporan.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal tersambung ke jaringan server.');
    } finally {
      setSending(false);
    }
  };

  // Test WhatsApp endpoint targeting configured Admin number
  const handleTestWhatsApp = async () => {
    if (!adminNumber) {
      showToast('error', 'Nomor Admin belum diatur di Pengaturan. Silakan buka menu Pengaturan → WhatsApp Gateway.');
      return;
    }

    setTestingStatus(true);
    try {
      const timestamp = new Date().toLocaleString('id-ID');
      const testMsg = `🧪 UJI KONEKTIVITAS WHATSAPP GATEWAY\n\nGateway Fonnte berhasil terhubung secara penuh dengan Notaris Putri Office System!\n\nWaktu Tes: ${timestamp}\nStatus Gateway: SEHAT / AKTIF`;

      const userToken = await auth.currentUser?.getIdToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      const response = await fetch(getApiUrl('/api/send-whatsapp'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target: adminNumber,
          message: testMsg
        })
      });

      const resText = await response.text();
      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        throw new Error("Respon server tidak valid saat mencoba pengiriman uji coba WhatsApp.");
      }

      if (response.ok && resData.success) {
        showToast('success', `Koneksi sehat! Pesan uji coba dikirim ke nomor Admin (${adminNumber}) dengan sukses!`);
      } else {
        showToast('error', resData.error || 'Server menolak mengirim pesan uji coba.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal tersambung dengan server gateway.');
    } finally {
      setTestingStatus(false);
    }
  };

  // Export report to highly polished PDF Document
  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const formatPrintDate = () => {
      const d = new Date();
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const dayName = days[d.getDay()];
      const dateNum = d.getDate();
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${dayName}, ${dateNum} ${monthName} ${year} pukul ${hours}.${minutes}`;
    };

    const mapStatusToDisplay = (status: string, metadata?: any): string => {
      const displayStatus = getProjectStatusDisplay(status, metadata);
      const cleanS = (displayStatus || '').toUpperCase().trim();
      
      if (cleanS === 'PROGRES MINUTA') {
        return 'PROGRES MINUTA';
      }
      if (cleanS.includes('SELESAI') || cleanS.includes('FINAL') || cleanS.includes('COMPLETE') || cleanS.includes('SIAP_KIRIM')) {
        return 'SELESAI';
      }
      if (cleanS.includes('PERBAIKAN') || cleanS.includes('REVISION') || cleanS.includes('DIKEMBALIKAN')) {
        return 'PERBAIKAN';
      }
      if (cleanS.includes('DRAFTING') || cleanS.includes('PROSES') || cleanS.includes('KOREKSI')) {
        return 'PROSES DRAFTING';
      }
      if (cleanS === 'DRAFT NOTULEN DI KIRIM' || cleanS === 'DRAFT NOTULEN DIKIRIM' || cleanS === 'DRAFT AKTA DIKIRIM' || cleanS === 'REVIEW NOTULEN' || cleanS === 'DRAFT AKTA & NOTULEN DIKIRIM') {
        return 'REVIEW NOTULEN';
      }
      if (cleanS === 'SUDAH CETAK AKTA' || cleanS === 'NIB SEDANG DI INPUT') {
        return 'NIB SEDANG DI INPUT';
      }
      if (cleanS === 'SUDAH INPUT AHU' || cleanS === 'INPUT AHU') {
        return 'INPUT AHU';
      }
      return displayStatus;
    };

    const getStatusColors = (status: string) => {
      const s = (status || '').toUpperCase().trim();
      if (s === 'PROSES DRAFTING' || s === 'DRAFTING' || s === 'DRAFT') {
        return {
          bg: [254, 243, 199], // amber-100
          text: [180, 83, 9],   // amber-700
        };
      }
      if (s === 'REVIEW NOTULEN' || s === 'DRAFT NOTULEN DI KIRIM' || s === 'DRAFT NOTULEN DIKIRIM' || s === 'DRAFT AKTA DIKIRIM') {
        return {
          bg: [219, 234, 254], // blue-100
          text: [29, 78, 216],  // blue-700
        };
      }
      if (s === 'NIB SEDANG DI INPUT' || s === 'SUDAH CETAK AKTA') {
        return {
          bg: [243, 232, 255], // purple-100
          text: [107, 33, 168], // purple-800
        };
      }
      if (s === 'INPUT AHU' || s === 'SUDAH INPUT AHU') {
        return {
          bg: [204, 251, 241], // teal-100
          text: [15, 118, 110], // teal-700
        };
      }
      if (s === 'PROGRES MINUTA') {
        return {
          bg: [254, 243, 199], // amber-100
          text: [120, 53, 4],   // amber-900
        };
      }
      if (s === 'SELESAI' || s === 'FINAL' || s === 'COMPLETE' || s === 'SIAP_KIRIM') {
        return {
          bg: [209, 250, 229], // emerald-100
          text: [4, 120, 87],   // emerald-700
        };
      }
      if (s === 'PERBAIKAN' || s === 'REVISION' || s === 'DIKEMBALIKAN') {
        return {
          bg: [254, 226, 226], // red-100
          text: [185, 28, 28],  // red-700
        };
      }
      return {
        bg: [241, 245, 249], // slate-100
        text: [71, 85, 105],  // slate-600
      };
    };

    // Header Style
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(12, 36, 68); // #0c2444 color
    const titleText = activeReportTab === 'aktif' ? 'LAPORAN PROYEK AKTIF' : 'LAPORAN MINUTA PROYEK';
    doc.text(titleText, 14, 16);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(12, 36, 68);
    doc.text('KANTOR NOTARIS NUKANTINI PUTRI PARINCHA SH.,M.Kn', 14, 22);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    
    const catLabel = selectedCategory === 'ALL' ? 'Semua Kategori' : selectedCategory;
    const typeLabel = selectedType === 'ALL' ? 'Semua Jenis' : selectedType;
    const statusLabelFilter = selectedStatus === 'ALL' ? 'Semua Status' : selectedStatus;
    doc.text(`Kategori: ${catLabel} | Jenis: ${typeLabel} | Status: ${statusLabelFilter} | Tanggal Cetak: ${formatPrintDate()}`, 14, 28);
    
    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);
    
    let currentY = 40;
    
    // Construct dynamic PDF Groups
    interface PdfCategoryGroup {
      id: string;
      label: string;
      reports: any[];
    }
    
    const pdfGroups: PdfCategoryGroup[] = [];

    if (activeReportTab === 'aktif') {
      const activeReports = filteredReports.filter(r => {
        const cat = getStatusCategory(r.status, r.metadata);
        return cat !== 'SELESAI';
      });

      if (activeReports.length > 0) {
        pdfGroups.push({
          id: 'SEDANG_BERJALAN',
          label: 'SEDANG BERJALAN',
          reports: activeReports,
        });
      }
    } else {
      const selesaiReports = filteredReports.filter(r => {
        const cat = getStatusCategory(r.status, r.metadata);
        return cat === 'SELESAI';
      });

      if (selesaiReports.length > 0) {
        pdfGroups.push({
          id: 'SELESAI',
          label: 'SELESAI',
          reports: selesaiReports,
        });
      }
    }

    pdfGroups.forEach((group) => {
      const groupedCatReports = getGroupedReports(group.reports);

      // Check page break for section header
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      // Draw vertical orange bar
      doc.setFillColor(245, 158, 11); // Amber-500 (#f59e0b)
      doc.rect(14, currentY - 4.5, 2.5, 5.5, 'F');

      // Draw Group title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // Slate-900 (#0f172a)
      doc.text(`KATEGORI STATUS: ${group.label} (${groupedCatReports.length} Klien / ${group.reports.length} Berkas)`, 18.5, currentY);
      
      // Draw status legend pills
      const uniqueStatusInGroup = Array.from(
        new Set(
          group.reports.map(r => mapStatusToDisplay(r.status, r.metadata))
        )
      );

      let pillX = 14;
      const pillY = currentY + 4;
      const pillHeight = 5.2;
      const textPadding = 4.5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);

      uniqueStatusInGroup.forEach(statusName => {
        const colors = getStatusColors(statusName);
        const textWidth = doc.getTextWidth(statusName);
        const pillWidth = textWidth + textPadding * 2;

        // Draw pill background
        doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
        doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 1.2, 1.2, 'F');

        // Draw text
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(statusName, pillX + textPadding, pillY + 3.6);

        pillX += pillWidth + 3.5; // gap between pills
      });

      // Space table below the legends
      currentY = pillY + pillHeight + 5;

      // PDF Columns
      const tableColumn = ["No", "Nama PT / Klien", "Jenis Pekerjaan", "Status Terakhir", "Catatan Transisi"];
      
      // Build Rows
      const tableRows: any[] = [];
      groupedCatReports.forEach((rec, idx) => {
        const rowSpanVal = rec.items.length;
        
        rec.items.forEach((item, itemIdx) => {
          const displayStatus = mapStatusToDisplay(item.status, item.metadata);
          
          const noteText = getCleanTransitionComment(item.lastTransitionComment);

          if (itemIdx === 0) {
            tableRows.push([
              { content: (idx + 1).toString(), rowSpan: rowSpanVal, styles: { halign: 'center' as const, valign: 'middle' as const } },
              { content: rec.namaPt.toUpperCase(), rowSpan: rowSpanVal, styles: { valign: 'middle' as const } },
              item.pekerjaan.toUpperCase(),
              displayStatus.toUpperCase(),
              noteText
            ]);
          } else {
            tableRows.push([
              item.pekerjaan.toUpperCase(),
              displayStatus.toUpperCase(),
              noteText
            ]);
          }
        });
      });

      // Generate Table for this category
      autoTable(doc, {
        startY: currentY,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
          valign: 'middle',
          lineColor: [226, 232, 240], // slate-200 border lines
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [12, 36, 68], // Navy/Slate (#0c2444)
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left',
          fontSize: 8,
          cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50 background for alternate rows
        },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center' },
          1: { cellWidth: 46, fontStyle: 'bold', halign: 'left' },
          2: { cellWidth: 34, halign: 'left' },
          3: { cellWidth: 38, halign: 'center' },
          4: { cellWidth: 50, halign: 'left' },
        },
        willDrawCell: (data) => {
          if (data.column.index === 3 && data.cell.section === 'body') {
            (data.cell as any).rawStatusText = data.cell.text.join(' ') || '';
            data.cell.text = [];
          }
        },
        didDrawCell: (data) => {
          if (data.column.index === 3 && data.cell.section === 'body') {
            const statusText = (data.cell as any).rawStatusText || '';
            if (statusText) {
              const colors = getStatusColors(statusText);
              const cell = data.cell;
              
              // Calculate pill dimensions
              const pillWidth = 35; // optimal width to prevent truncation and center perfectly
              const pillHeight = 5;  // nice slim height
              const pillX = cell.x + (cell.width - pillWidth) / 2;
              const pillY = cell.y + (cell.height - pillHeight) / 2;
              
              // Draw rounded rectangle for the pill background
              doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
              doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 1.2, 1.2, 'F');
              
              // Draw text centered inside the pill
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(7);
              doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
              doc.text(statusText, cell.x + cell.width / 2, pillY + 3.5, { align: 'center' });
            }
          }
        },
        didDrawPage: (data) => {
          const pageHeight = doc.internal.pageSize.height;
          const pageWidth = doc.internal.pageSize.width;
          
          // Draw thin footer separator line
          doc.setDrawColor(241, 245, 249); // slate-100
          doc.setLineWidth(0.3);
          doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
          
          // Footer page counter
          const pageStr = `Halaman ${data.pageNumber}`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // slate-400
          doc.text(pageStr, 14, pageHeight - 10);
          
          // Footer branding
          const brandingStr = `SuperApps Putri \u2014 Sistem Manajemen Proyek Notaris`;
          doc.text(brandingStr, pageWidth - 14, pageHeight - 10, { align: 'right' });
        }
      });

      // Update currentY for next potential elements
      currentY = (doc as any).lastAutoTable.finalY + 12;
    });

    if (pdfGroups.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('Tidak ada laporan dokumen pekerjaan yang ditemukan.', 14, currentY);
    }
    
    doc.save(`Laporan_Proyek_Kerja_${activeReportTab === 'aktif' ? 'Aktif' : 'Minuta'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Export report to high-resolution JPG Document using html-to-image
  const handleExportJPG = async () => {
    if (filteredReports.length === 0) {
      showToast('error', 'Tidak ada data laporan untuk diekspor.');
      return;
    }
    
    setIsExportingJpg(true);
    showToast('success', 'Mempersiapkan pembuatan gambar laporan resolusi tinggi...');

    // Wait for the DOM to render the high-res template
    setTimeout(async () => {
      try {
        const element = document.getElementById('high-res-jpg-capture-target');
        if (!element) {
          showToast('error', 'Gagal menemukan penampung gambar laporan.');
          setIsExportingJpg(false);
          return;
        }

        // Render high-res JPEG using browser SVG ForeignObject rendering (natively supports oklch, grid, fonts, etc.)
        const dataUrl = await toJpeg(element, {
          quality: 0.95,
          pixelRatio: 3, // Premium ultra-high resolution (3x density rendering)
          cacheBust: true,
          skipFonts: true,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
          },
          backgroundColor: '#ffffff'
        });

        const link = document.createElement('a');
        link.download = `Laporan_Pekerjaan_Notaris_${activeReportTab === 'aktif' ? 'Aktif' : 'Minuta'}_${new Date().toISOString().slice(0, 10)}.jpg`;
        link.href = dataUrl;
        link.click();

        showToast('success', 'Laporan berhasil diekspor menjadi JPG resolusi tinggi!');
      } catch (err: any) {
        console.error("Gagal melakukan ekspor gambar:", err);
        showToast('error', `Gagal mengekspor gambar: ${err.message || 'Error tidak diketahui'}`);
      } finally {
        setIsExportingJpg(false);
      }
    }, 200);
  };

  return (
    <div className="space-y-4">
      {/* TOAST NOTIFICATION BANNER */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-3 rounded-xl border font-bold text-xs shadow-md uppercase tracking-wide animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-fuchsia-50 rounded-full blur-3xl -mx-10 -my-10 z-0"></div>
        <div className="relative z-10 flex-1">
          <h2 className="text-xl font-bold flex items-start sm:items-center gap-3 text-slate-800 tracking-tight">
            <span className="p-2 bg-fuchsia-100 text-fuchsia-600 rounded-lg shrink-0">
              <FileText size={22} className="stroke-[2.5]" />
            </span>
            <div>
              <div className="text-xl font-black text-slate-800 tracking-tight">LAPORAN PROYEK KERJA</div>
              <div className="text-[12px] sm:text-xs font-bold text-fuchsia-600 tracking-wide uppercase mt-0.5">
                KANTOR NOTARIS NUKANTINI PUTRI PARINCHA SH.,M.Kn
              </div>
            </div>
          </h2>
          <p className="text-slate-500 text-[13px] font-medium mt-2">Daftar laporan seluruh pekerjaan dan status terakhir</p>
        </div>

        {/* INTEGRATED CONFIGURATION BUTTONS */}
        <div className="relative z-10 w-full xl:w-auto flex flex-col sm:flex-row items-center gap-2">
          {/* TEST WHATSAPP BUTTON */}
          <button
            onClick={handleTestWhatsApp}
            disabled={testingStatus}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:text-slate-400 font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer uppercase tracking-wider disabled:-translate-y-0"
            title="Klik untuk menguji konektivitas WhatsApp Gateway dengan mengirim pesan uji coba ke Nomor Admin."
          >
            {testingStatus ? (
              <RefreshCw className="animate-spin w-3.5 h-3.5" />
            ) : (
              <Smartphone size={14} className="stroke-[2]" />
            )}
            Test WhatsApp
          </button>

          {/* KIRIM WHATSAPP BUTTON */}
          <button
            onClick={() => setModalOpen(true)}
            disabled={filteredReports.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 hover:text-white border border-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer uppercase tracking-wider disabled:-translate-y-0"
          >
            <Send size={14} className="stroke-[2.5]" />
            Kirim WhatsApp ({filteredReports.length})
          </button>

          {/* EXCEL/PDF EXPORT */}
          <button
            onClick={handleExportPDF}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 active:bg-fuchsia-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-fuchsia-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer uppercase tracking-wider"
          >
            <Download size={15} className="stroke-[2.5]" />
            Ekspor PDF
          </button>

          {/* HIGH RES JPG EXPORT */}
          <button
            onClick={handleExportJPG}
            disabled={isExportingJpg || filteredReports.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-indigo-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer uppercase tracking-wider disabled:-translate-y-0"
          >
            {isExportingJpg ? (
              <RefreshCw className="animate-spin w-4 h-4" />
            ) : (
              <Image size={15} className="stroke-[2.5]" />
            )}
            {isExportingJpg ? 'Grup Gambar HD...' : 'Ekspor JPG (HD)'}
          </button>
        </div>
      </div>

      {/* TAB SELECTOR (PROYEK AKTIF & MINUTA) */}
      <div className="flex space-x-1 border-b border-slate-200 mt-4 select-none">
        {(['aktif', 'minuta'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveReportTab(tab);
            }}
            className={`px-5 py-3 text-xs sm:text-sm font-black transition-all border-b-2 uppercase tracking-wider cursor-pointer ${
              activeReportTab === tab
                ? 'border-fuchsia-600 text-fuchsia-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab === 'aktif' ? '📁 Proyek Aktif' : '📋 Minuta'}
          </button>
        ))}
      </div>

      {/* FILTER, SEARCH, & TABS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
            <div className="flex flex-wrap items-center gap-4">
              {/* Category Dropdown Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Kategori:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedType('ALL');
                  }}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/15 focus:border-fuchsia-500 bg-white cursor-pointer shadow-sm"
                >
                  <option value="ALL">Semua Kategori</option>
                  <option value="BODY_LEGAL">Badan Hukum (BODY_LEGAL)</option>
                  <option value="MEETING">Rapat / RUPS (MEETING)</option>
                  <option value="AGREEMENT">Perjanjian (AGREEMENT)</option>
                  <option value="GENERAL_DEED">Akta Umum (GENERAL_DEED)</option>
                  <option value="LEGALIZATION">Legalisasi (LEGALIZATION)</option>
                </select>
              </div>
              {/* Dynamic Project Type Dropdown */}
              {selectedCategory !== 'ALL' && (
                <div className="flex items-center gap-2 animate-fadeIn">
                  <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Jenis:</span>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/15 focus:border-fuchsia-500 bg-white cursor-pointer shadow-sm"
                  >
                    <option value="ALL">Semua Jenis Pekerjaan</option>
                    {(PROJECT_TYPES[selectedCategory as ProjectCategory] || []).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    {/* Support legacy mappings */}
                    {selectedCategory === 'MEETING' && (
                      <>
                        <option value="RUPS-LB">RUPS-LB (Legacy)</option>
                        <option value="RUPST">RUPST (Legacy)</option>
                      </>
                    )}
                    {selectedCategory === 'BODY_LEGAL' && (
                      <option value="Pendirian">Pendirian (Legacy)</option>
                    )}
                  </select>
                </div>
              )}

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/15 focus:border-fuchsia-500 bg-white cursor-pointer shadow-sm"
                >
                  <option value="ALL">Semua Status</option>
                  {STATUS_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Cari PT atau Jenis Pekerjaan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/15 focus:border-fuchsia-500 transition-all font-medium bg-slate-50/50 focus:bg-white"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-lg border border-slate-200/80">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-center w-12 border-r border-slate-200">No</th>
                <th className="px-5 py-3 border-r border-slate-200">Nama PT</th>
                <th className="px-4 py-3 border-r border-slate-200 text-center">Jenis Pekerjaan</th>
                <th className="px-4 py-3 border-r border-slate-200 text-center">Status Terakhir</th>
                <th className="px-4 py-3 border-r border-slate-200">Catatan Transisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 italic font-medium bg-slate-50/20">
                    Tidak ada laporan dokumen yang ditemukan sesuai filter/pencarian Anda.
                  </td>
                </tr>
              ) : (
                STATUS_CATEGORIES.map(cat => {
                  const catReports = filteredReports.filter(r => getStatusCategory(r.status, r.metadata) === cat.id);
                  if (catReports.length === 0) return null;

                  return (
                    <React.Fragment key={cat.id}>
                      {/* Section Header Row */}
                      <tr className="bg-slate-50 border-y border-slate-200/80">
                        <td colSpan={5} className="px-5 py-2.5 text-[#0c2444] font-black text-xs uppercase tracking-wider bg-slate-100/30 select-none">
                          <div className="flex items-center gap-2">
                            <span className="text-fuchsia-600 text-sm">📂</span>
                            <span>KATEGORI: {cat.label}</span>
                            <span className="ml-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-200/80 text-slate-600">
                              {getGroupedReports(catReports).length} Klien / {catReports.length} Berkas
                            </span>
                          </div>
                        </td>
                      </tr>
                      {getGroupedReports(catReports).map((rec, idx) => (
                        <tr key={idx + '-' + rec.id} className="hover:bg-fuchsia-50/25 transition-colors group">
                          <td className="px-4 py-3.5 text-center border-r border-slate-200 text-slate-500 font-bold bg-slate-50/10">{idx + 1}</td>
                          <td className="px-5 py-3.5 border-r border-slate-200 font-black text-[#0c2444] uppercase text-[13px] tracking-wide bg-slate-50/5 max-w-[250px] break-words">{rec.namaPt}</td>
                          
                          {/* Aligned, identical size badges */}
                          <td className="border-r border-slate-200 p-0">
                            <div className="flex flex-col divide-y divide-slate-200/80 h-full justify-stretch">
                              {rec.items.map((it, i) => (
                                <div key={i} className="px-4 py-3 flex items-center justify-center sm:justify-start min-h-[48px] flex-1">
                                  {rec.items.length > 1 && (
                                    <span className="text-fuchsia-500 font-bold text-xs shrink-0 mr-1.5">•</span>
                                  )}
                                  <span className="inline-block px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase truncate w-[150px] sm:w-[185px] text-center shadow-xs">
                                    {it.pekerjaan}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 p-0 text-center">
                            <div className="flex flex-col divide-y divide-slate-200/80 h-full justify-stretch items-stretch">
                              {rec.items.map((it, i) => (
                                <div key={i} className="px-4 py-3 flex items-center justify-center min-h-[48px] flex-1">
                                  <DocumentStatusBadge status={getProjectStatusDisplay(it.status, it.metadata)} />
                                </div>
                              ))}
                            </div>
                          </td>
                          
                          <td className="border-r border-slate-200 p-0 text-left text-slate-600 font-medium text-[11px]">
                            <div className="flex flex-col divide-y divide-slate-200/80 h-full justify-stretch items-stretch">
                              {rec.items.map((it, i) => (
                                <div key={i} className="px-4 py-3 flex items-center justify-start min-h-[48px] flex-1 max-w-[250px] break-words whitespace-normal leading-relaxed">
                                  {getCleanTransitionComment(it.lastTransitionComment)}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WHATSAPP CONFIRMATION AND PREVIEW MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md">
                  <Smartphone size={16} className="stroke-[2.5]" />
                </span>
                <span className="font-black text-sm text-slate-800 uppercase tracking-tight">Kirim Laporan via WhatsApp Gateway</span>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg p-1.5 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Recipient Mode Tab Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSendMode('GROUP')}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    sendMode === 'GROUP' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Grup WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setSendMode('NUMBER')}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    sendMode === 'NUMBER' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Nomor Pribadi
                </button>
              </div>

              {sendMode === 'GROUP' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      Pilih Grup WhatsApp Tujuan
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncGroups}
                      disabled={syncingGroups || loadingGroups}
                      className="flex items-center gap-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 font-bold uppercase tracking-wider cursor-pointer"
                    >
                      <RefreshCw size={11} className={`${syncingGroups ? 'animate-spin' : ''}`} />
                      {syncingGroups ? 'Menyinkronkan...' : 'Sinkronkan Daftar Grup'}
                    </button>
                  </div>
                  
                  {loadingGroups ? (
                    <div className="w-full py-4 text-center border border-dashed border-slate-200 rounded-lg flex items-center justify-center gap-2 text-slate-500 font-medium text-xs">
                      <RefreshCw className="animate-spin w-4 h-4 text-emerald-500" />
                      Memuat daftar grup WhatsApp dari Fonnte...
                    </div>
                  ) : groups.length === 0 ? (
                    <div className="w-full p-4 text-center border border-dashed border-slate-200 bg-amber-50/30 text-amber-700 font-medium text-xs rounded-lg space-y-2">
                      <p>Tidak ada grup WhatsApp yang ditemukan di akun Fonnte Anda.</p>
                      <button
                        type="button"
                        onClick={handleSyncGroups}
                        className="px-3 py-1.5 bg-[#4f1846] text-white hover:bg-[#68265d] active:scale-95 transition-all text-[10px] font-bold uppercase tracking-wider rounded-md"
                      >
                        Mulai Sinkronisasi Fonnte
                      </button>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 bg-white cursor-pointer placeholder-slate-400"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} (ID: {g.id}) {g.member !== undefined ? ` - ${g.member} Anggota` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[9.5px] mt-1 text-slate-400 font-medium">
                        * Secara otomatis mencari dan memprioritaskan grup <strong className="text-slate-700">KANTOR NOTARIS/PPAT</strong> jika tersedia.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Nomor WhatsApp Tujuan (Pribadi)
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan nomor WhatsApp tujuan (contoh: 628123456789)..."
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition-all animate-fade-in"
                    required
                  />
                  <p className="text-[9.5px] text-slate-400 font-medium">Nomor harus diawali 62, 08, atau 8. Nomor default ditarik otomatis dari menu Pengaturan.</p>
                </div>
              )}

              {/* Message format preview */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Pratinjau Format Pesan WhatsApp
                </label>
                <textarea
                  readOnly
                  value={generateWhatsAppMessage()}
                  rows={10}
                  className="w-full p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg text-xs font-semibold font-mono text-slate-700 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-150 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-100 text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer"
              >
                Batal
              </button>
              
              <button
                onClick={handleSendWhatsApp}
                disabled={sending}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:border-slate-300 border border-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer uppercase tracking-wider disabled:-translate-y-0"
              >
                {sending ? (
                  <RefreshCw className="animate-spin w-4 h-4" />
                ) : (
                  <SendHorizontal size={14} className="stroke-[2.5]" />
                )}
                Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target capture container for JPG exports - permanently in DOM and fully painted, but invisible to user */}
      <div 
        id="high-res-jpg-capture-target"
        className="absolute top-0 -left-[9999px] w-[1200px] bg-white text-slate-800 p-12 space-y-8 flex flex-col pointer-events-none overflow-hidden"
        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* Letterhead Header */}
        <div className="border-b-4 border-slate-900 pb-6 flex justify-between items-end">
          <div>
            <div className="text-[11px] font-black text-fuchsia-600 tracking-widest uppercase">
              Kantor Notaris & PPAT
            </div>
            <div className="text-3xl font-black text-[#0c2444] tracking-tight leading-none mt-1.5">
              NUKANTINI PUTRI PARINCHA SH., M.Kn
            </div>
            <div className="text-[11px] text-slate-500 font-bold tracking-wide mt-2 uppercase">
              Gedung Menara Office, Lt. 12 • Jakarta Selatan • Telp: (021) 500-1234 • Email: info@notarisputri.id
            </div>
          </div>
          <div className="text-right">
            <div className="text-[22px] font-black text-slate-900 tracking-tight leading-none uppercase">
              {activeReportTab === 'aktif' ? 'Laporan Proyek Aktif' : 'Laporan Minuta Proyek'}
            </div>
            <div className="text-[11px] text-slate-500 font-bold tracking-wider uppercase mt-2">
              Sistem Notariatan Terintegrasi
            </div>
          </div>
        </div>

        {/* Metadata Infobox Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kategori Filter
            </div>
            <div className="text-sm font-black text-slate-800 mt-1 uppercase">
              {selectedCategory === 'ALL' ? 'Semua Kategori' : `${selectedCategory} (${selectedType === 'ALL' ? 'Semua Jenis' : selectedType})`}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Tanggal Ekspor Gambar
            </div>
            <div className="text-sm font-black text-slate-800 mt-1">
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              })}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kriteria Pencarian
            </div>
            <div className="text-sm font-black text-slate-800 mt-1 truncate">
              {search ? `"${search}"` : 'Tidak ada (Semua)'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Jumlah Pekerjaan
            </div>
            <div className="text-sm font-black text-slate-800 mt-1">
              {filteredReports.length} Berkas {activeReportTab === 'aktif' ? 'Aktif' : 'Minuta'}
            </div>
          </div>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-[#0c2444] text-white text-[11px] font-bold uppercase tracking-wider">
              <th className="px-4 py-4 text-center w-16 border border-slate-300">No</th>
              <th className="px-6 py-4 border border-slate-300">Nama Badan Hukum / PT</th>
              <th className="px-5 py-4 border border-slate-300 text-center w-60">Jenis Layanan Pekerjaan</th>
              <th className="px-5 py-4 border border-slate-300 text-center w-52">Status Berkas</th>
              <th className="px-5 py-4 border border-slate-300 text-center w-48">Tanggal Diperbarui</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 bg-white">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400 italic font-semibold">
                  Tidak ada laporan dokumen pekerjaan yang ditemukan.
                </td>
              </tr>
            ) : (
              STATUS_CATEGORIES.map(cat => {
                const catReports = filteredReports.filter(r => getStatusCategory(r.status, r.metadata) === cat.id);
                if (catReports.length === 0) return null;

                return (
                  <React.Fragment key={'highres-cat-' + cat.id}>
                    {/* Category Section Header Row */}
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={5} className="px-6 py-3 border border-slate-300 text-[#0c2444] font-black text-[13px] tracking-wide uppercase">
                        📂 Kategori Status: {cat.label} ({getGroupedReports(catReports).length} Klien / {catReports.length} Berkas)
                      </td>
                    </tr>
                    {getGroupedReports(catReports).map((rec, idx) => (
                      <tr key={'highres-' + idx} className="text-slate-800 text-[12.5px]">
                        <td className="px-4 py-4 text-center border border-slate-300 font-bold bg-slate-50/50">{idx + 1}</td>
                        <td className="px-6 py-4 border border-slate-300 font-black text-[#0c2444] uppercase tracking-wide bg-slate-50/5 max-w-[250px] break-words">{rec.namaPt}</td>
                        <td className="border border-slate-300 p-0">
                          <div className="flex flex-col divide-y divide-slate-300 h-full justify-stretch">
                            {rec.items.map((it, i) => (
                              <div key={i} className="px-5 py-3.5 flex items-center justify-center sm:justify-start min-h-[52px] flex-1">
                                {rec.items.length > 1 && (
                                  <span className="text-fuchsia-600 font-bold text-sm shrink-0 mr-1.5">•</span>
                                )}
                                <span className="inline-block px-3 py-1 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase whitespace-nowrap min-w-[160px] text-center shadow-xs">
                                  {it.pekerjaan}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="border border-slate-300 p-0 text-center font-extrabold">
                          <div className="flex flex-col divide-y divide-slate-300 h-full justify-stretch items-stretch">
                            {rec.items.map((it, i) => {
                              const displayStatus = getProjectStatusDisplay(it.status, it.metadata);
                              let statusBg = 'bg-slate-100 text-slate-800 border-slate-300';
                              let statusLabel = displayStatus;
                              
                              const cleanStatus = (displayStatus || '').toUpperCase();
                              if (cleanStatus === 'PROGRES MINUTA') {
                                statusBg = 'bg-amber-100 text-amber-950 border-amber-300';
                                statusLabel = 'PROGRES MINUTA';
                              } else if (cleanStatus.includes('SELESAI') || cleanStatus.includes('FINAL') || cleanStatus.includes('COMPLETE') || cleanStatus.includes('SIAP_KIRIM')) {
                                statusBg = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                                statusLabel = 'SELESAI';
                              } else if (cleanStatus.includes('PERBAIKAN') || cleanStatus.includes('REVISION') || cleanStatus.includes('DIKEMBALIKAN')) {
                                statusBg = 'bg-rose-100 text-rose-900 border-rose-300';
                                statusLabel = 'PERBAIKAN';
                              } else if (cleanStatus.includes('DRAFTING') || cleanStatus.includes('PROSES') || cleanStatus.includes('KOREKSI')) {
                                statusBg = 'bg-blue-100 text-blue-900 border-blue-300';
                                statusLabel = 'PROSES DRAFTING';
                              } else {
                                statusBg = 'bg-violet-100 text-violet-900 border-violet-300';
                              }

                              return (
                                <div key={i} className="px-5 py-3.5 flex items-center justify-center min-h-[52px] flex-1">
                                  <span className={`inline-block px-4 py-1 text-[10.5px] font-bold rounded-lg border uppercase whitespace-nowrap tracking-wider min-w-[140px] text-center ${statusBg}`}>
                                    {statusLabel}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="border border-slate-300 p-0 text-center text-slate-500 font-mono text-[11px] font-bold">
                          <div className="flex flex-col divide-y divide-slate-300 h-full justify-stretch items-stretch font-bold">
                            {rec.items.map((it, i) => (
                              <div key={i} className="px-5 py-3.5 flex items-center justify-center min-h-[52px] flex-1 font-bold">
                                {it.updatedAt && !isNaN(new Date(it.updatedAt).getTime()) 
                                  ? new Date(it.updatedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                                  : '-'}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Signature and Approval Area */}
        <div className="flex justify-between items-end pt-12 mt-auto">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Diunduh Melalui</div>
            <div className="text-[11px] font-bold text-[#0c2444] mt-1">PORTAL INTEGRASI ADMINISTRASI NOTARIS PUTRI</div>
          </div>
          <div className="text-center w-72">
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-12">
              Jakarta, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="text-xs font-black text-slate-900 border-b border-slate-400 pb-1 uppercase">
              Nukantini Putri Parincha S.H., M.Kn
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Notaris & PPAT Jakarta Selatan
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
