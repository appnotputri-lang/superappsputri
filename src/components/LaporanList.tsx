import React, { useMemo, useState, useEffect } from 'react';
import { Search, FileText, Download, Smartphone, Send, SendHorizontal, AlertCircle, CheckCircle2, RefreshCw, X, Image } from 'lucide-react';
import { DocumentStatusBadge } from '../../components/DocumentStatusBadge';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toJpeg } from 'html-to-image';

interface LaporanListProps {
  projects: any[];
  rupstProjects: any[];
  pendirianProjects: any[];
}

type JobGroupFilter = 'ALL' | 'RUPS LB' | 'RUPS TAHUNAN' | 'PENDIRIAN PT';

export const LaporanList: React.FC<LaporanListProps> = ({ projects, rupstProjects, pendirianProjects }) => {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<JobGroupFilter>('ALL');

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

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  // Compile all data records
  const allReports = useMemo(() => {
    const list: any[] = [];
    
    projects.forEach(p => list.push({
      id: p.id,
      namaPt: p.companyName || '-',
      pekerjaan: 'RUPS LB',
      status: p.documentStatus || p.rupslbStatus || 'DRAFTING',
      updatedAt: p.updatedAt || p.createdAt || 0
    }));

    rupstProjects.forEach(p => list.push({
      id: p.id,
      namaPt: p.companyName || '-',
      pekerjaan: 'RUPS TAHUNAN',
      status: p.documentStatus || p.rupstStatus || 'DRAFTING',
      updatedAt: p.updatedAt || p.createdAt || 0
    }));

    pendirianProjects.forEach(p => list.push({
      id: p.id,
      namaPt: p.namaPt || p.companyName || '-',
      pekerjaan: 'PENDIRIAN PT',
      status: p.documentStatus || 'DRAFTING',
      updatedAt: p.updatedAt || p.createdAt || 0
    }));

    // Sort by recent update
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [projects, rupstProjects, pendirianProjects]);

  // Apply grouping and search filters
  const filteredReports = useMemo(() => {
    let result = allReports;

    // Apply grouping filter
    if (selectedGroup !== 'ALL') {
      result = result.filter(r => r.pekerjaan === selectedGroup);
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
  }, [allReports, selectedGroup, search]);

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
      const response = await fetch('/api/whatsapp-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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
      const response = await fetch('/api/whatsapp-groups-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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
    let draftingCount = 0;
    let draftCount = 0;
    let finalCount = 0;
    let draftNotulenCount = 0;

    filteredReports.forEach(r => {
      const statusUpper = (r.status || '').toUpperCase();
      if (statusUpper === 'DRAFTING') {
        draftingCount++;
      } else if (statusUpper === 'DRAFT') {
        draftCount++;
      } else if (statusUpper === 'FINAL' || statusUpper === 'SELESAI') {
        finalCount++;
      } else if (statusUpper === 'DRAFT NOTULEN DI KIRIM' || statusUpper === 'DRAFT NOTULEN DIKIRIM') {
        draftNotulenCount++;
      } else {
        if (statusUpper.includes('DRAFTING')) {
          draftingCount++;
        } else if (statusUpper.includes('NOTULEN')) {
          draftNotulenCount++;
        } else if (statusUpper.includes('DRAFT')) {
          draftCount++;
        } else {
          finalCount++;
        }
      }
    });

    let msg = `📋 LAPORAN PEKERJAAN\n\n`;
    msg += `Tanggal: ${todayStr}\n\n`;
    msg += `📊 RINGKASAN\n\n`;
    msg += `• Total Pekerjaan : ${total}\n`;
    msg += `• Drafting : ${draftingCount}\n`;
    msg += `• Draft : ${draftCount}\n`;
    msg += `• Final : ${finalCount}\n`;
    msg += `• Draft Notulen Dikirim : ${draftNotulenCount}\n\n`;
    msg += `📌 DAFTAR PEKERJAAN\n\n`;

    filteredReports.forEach((r, idx) => {
      msg += `${idx + 1}. ${r.namaPt.toUpperCase()}\n`;
      msg += `   ${r.pekerjaan.toUpperCase()}\n`;
      msg += `   Status: ${r.status.toUpperCase()}\n\n`;
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
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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

      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
    
    // Header Style
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(12, 36, 68); // #0c2444 color
    doc.text('LAPORAN STATUS PEKERJAAN', 14, 16);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105); // Elegant slate gray (#475569) instead of pink
    doc.text('KANTOR NOTARIS NUKANTINI PUTRI PARINCHA SH.,M.Kn', 14, 22);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Filter Kategori: ${selectedGroup} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 28);
    
    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);
    
    // PDF Columns
    const tableColumn = ["No", "Nama PT", "Jenis Pekerjaan", "Status Dokumen", "Terakhir Update"];
    
    // PDF Rows
    const tableRows = filteredReports.map((rec, idx) => [
      (idx + 1).toString(),
      rec.namaPt.toUpperCase(),
      rec.pekerjaan.toUpperCase(),
      rec.status.toUpperCase(),
      rec.updatedAt && !isNaN(new Date(rec.updatedAt).getTime()) 
        ? new Date(rec.updatedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) 
        : '-'
    ]);
    
    // Generate Beautiful AutoTable
    autoTable(doc, {
      startY: 37,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 3.5,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [12, 36, 68], // Navy/Slate theme matching the applet's color
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 65, fontStyle: 'bold' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 47, halign: 'center' },
        4: { cellWidth: 23, halign: 'center' },
      },
      didDrawPage: (data) => {
        // Footer page counter
        const str = `Halaman ${data.pageNumber}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });
    
    doc.save(`Laporan_Dokumen_PT_${new Date().toISOString().slice(0, 10)}.pdf`);
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
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
          },
          backgroundColor: '#ffffff'
        });

        const link = document.createElement('a');
        link.download = `Laporan_Pekerjaan_Notaris_${new Date().toISOString().slice(0, 10)}.jpg`;
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
              <div className="text-xl font-black text-slate-800 tracking-tight">LAPORAN STATUS PEKERJAAN</div>
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

      {/* FILTER, SEARCH, & TABS */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Grouping Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100/80 p-1 rounded-lg border border-slate-200/50 max-w-max">
            {([
              { key: 'ALL', label: 'Semua Pekerjaan' },
              { key: 'RUPS LB', label: 'RUPS LB' },
              { key: 'RUPS TAHUNAN', label: 'RUPS Tahunan' },
              { key: 'PENDIRIAN PT', label: 'Pendirian PT' }
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedGroup(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 uppercase tracking-wide cursor-pointer ${
                  selectedGroup === tab.key
                    ? 'bg-fuchsia-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
                <th className="px-4 py-3 text-center border-r border-slate-200">Terakhir Update</th>
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
                filteredReports.map((rec, idx) => (
                  <tr key={idx + '-' + rec.id} className="hover:bg-fuchsia-50/25 transition-colors group">
                    <td className="px-4 py-3.5 text-center border-r border-slate-200 text-slate-500 font-bold">{idx + 1}</td>
                    <td className="px-5 py-3.5 border-r border-slate-200 font-bold text-[#0c2444] uppercase text-[13px] tracking-wide">{rec.namaPt}</td>
                    
                    {/* Aligned, identical size badges */}
                    <td className="px-4 py-3.5 border-r border-slate-200 text-center">
                      <span className="inline-block px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase whitespace-nowrap w-[150px] sm:w-[185px] text-center shadow-sm">
                        {rec.pekerjaan}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 border-r border-slate-200 text-center">
                      <DocumentStatusBadge status={rec.status} />
                    </td>
                    
                    <td className="px-4 py-3.5 border-r border-slate-200 text-center text-slate-500 font-mono text-[11px]">
                      {rec.updatedAt && !isNaN(new Date(rec.updatedAt).getTime()) 
                        ? new Date(rec.updatedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : '-'}
                    </td>
                  </tr>
                ))
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
        className="absolute top-0 left-0 w-[1200px] bg-white text-slate-800 p-12 space-y-8 flex flex-col pointer-events-none opacity-0 -z-[9999] overflow-hidden"
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
              Laporan Status Pekerjaan
            </div>
            <div className="text-[11px] text-slate-500 font-bold tracking-wider uppercase mt-2">
              Sistem Notariatan Terintegrasi
            </div>
          </div>
        </div>

        {/* Metadata Infobox Grid */}
        <div className="grid grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kategori Filter
            </div>
            <div className="text-sm font-black text-slate-800 mt-1 uppercase">
              {selectedGroup === 'ALL' ? 'Semua Pekerjaan' : selectedGroup}
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
              {filteredReports.length} Berkas Aktif
            </div>
          </div>
        </div>

        {/* Table list */}
        <table className="w-full text-left border-collapse border border-slate-300">
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
              filteredReports.map((rec, idx) => {
                // Determine status styling for static canvas layout
                let statusBg = 'bg-slate-100 text-slate-800 border-slate-300';
                let statusLabel = rec.status;
                
                const cleanStatus = (rec.status || '').toUpperCase();
                if (cleanStatus.includes('SELESAI') || cleanStatus.includes('COMPLETE') || cleanStatus.includes('SIAP_KIRIM')) {
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
                  <tr key={'highres-' + idx} className="text-slate-800 text-[12.5px]">
                    <td className="px-4 py-4 text-center border border-slate-300 font-bold bg-slate-50/50">{idx + 1}</td>
                    <td className="px-6 py-4 border border-slate-300 font-black text-[#0c2444] uppercase tracking-wide">{rec.namaPt}</td>
                    <td className="px-5 py-4 border border-slate-300 text-center font-bold">
                      <span className="inline-block px-3 py-1.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase whitespace-nowrap min-w-[160px]">
                        {rec.pekerjaan}
                      </span>
                    </td>
                    <td className="px-5 py-4 border border-slate-300 text-center font-extrabold">
                      <span className={`inline-block px-4 py-1.5 text-[10.5px] font-bold rounded-lg border uppercase whitespace-nowrap tracking-wider min-w-[140px] text-center ${statusBg}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 border border-slate-300 text-center text-slate-500 font-mono text-[11px] font-bold">
                      {rec.updatedAt && !isNaN(new Date(rec.updatedAt).getTime()) 
                        ? new Date(rec.updatedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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
