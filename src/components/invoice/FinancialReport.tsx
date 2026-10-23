import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  Search, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Send, 
  FileSpreadsheet, 
  Building2, 
  BarChart3, 
  Eye, 
  X, 
  MessageSquare, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Tag,
  Check,
  FileText,
  ListFilter,
  Layers,
  Users,
  Briefcase,
  History,
  FileCheck,
  ShieldCheck,
  Info,
  ArrowLeft,
  ChevronLeft,
  LayoutGrid
} from 'lucide-react';
import { Invoice, PaymentRecord } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import { useNavigate } from 'react-router-dom';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Helper to format date strings into Indonesian format (e.g., "1 Januari 2026")
 */
const formatIndonesianDate = (dateStr?: string): string => {
  if (!dateStr || dateStr.trim() === '') return '-';
  
  // Handle ISO string or YYYY-MM-DD
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  
  if (parts.length === 3) {
    const y = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    
    if (!isNaN(d) && mIdx >= 0 && mIdx < 12 && y.length === 4) {
      return `${d} ${MONTH_NAMES[mIdx]} ${y}`;
    }
  }

  // Fallback to standard Date parsing
  const dt = new Date(dateStr);
  if (!isNaN(dt.getTime())) {
    return `${dt.getDate()} ${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  return dateStr;
};

export type ReportViewType = 
  | 'hub'
  | 'overview' 
  | 'rekap_invoice' 
  | 'laporan_pembayaran' 
  | 'laporan_piutang' 
  | 'rekap_pendapatan' 
  | 'laporan_bulanan' 
  | 'laporan_tahunan' 
  | 'laporan_klien' 
  | 'riwayat_transaksi'
  | 'pdf_merger';

export const FinancialReport: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Selected Dedicated Report View ('hub' = Main Cards Dashboard)
  const [activeReportView, setActiveReportView] = useState<ReportViewType>('hub');

  // Filter States
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '0' - '11'
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all'); // 'all', 'PAID', 'UNPAID', 'DRAFT', 'CANCELLED'
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all'); // 'all', 'LUNAS', 'SEBAGIAN', 'BELUM_DIBAYAR'
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Payment Modal State
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Transfer Bank');
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // PDF Merger / Multi-Report Export Selection State
  const [selectedReportsForPDF, setSelectedReportsForPDF] = useState<Record<string, boolean>>({
    rekap_invoice: true,
    laporan_pembayaran: true,
    laporan_piutang: true,
    rekap_pendapatan: false,
    laporan_bulanan: false,
    laporan_klien: false,
    riwayat_transaksi: false
  });
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  // Single Tab PDF Preview Modal
  const [previewTabModal, setPreviewTabModal] = useState<ReportViewType | null>(null);

  // Fetch invoices
  const loadInvoices = async () => {
    try {
      setRefreshing(true);
      const result = await InvoiceService.getInvoicesPaginated({ page: 1, pageSize: 1000, status: 'ALL' });
      if (result && result.invoices) {
        setInvoices(result.invoices);
      }
    } catch (err) {
      console.error('[FinancialReport] Failed to load invoices:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    const unsubscribe = InvoiceService.subscribeInvoices(() => {
      loadInvoices();
    });
    return () => unsubscribe();
  }, []);

  // Format IDR Currency
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Helper date parsing for overdue
  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') return false;
    const balance = invoice.balanceDue !== undefined ? invoice.balanceDue : ((invoice.totalAmount || 0) - (invoice.paidAmount || 0));
    if (balance <= 0) return false;
    if (!invoice.dueDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(invoice.dueDate);
    return due < today;
  };

  const getAgingDays = (dueDateStr?: string) => {
    if (!dueDateStr) return 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueDateStr);
    const diffTime = today.getTime() - due.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 3600 * 24)));
  };

  // Unique Clients List
  const availableClients = useMemo(() => {
    const clientsSet = new Set<string>();
    invoices.forEach(inv => {
      if (inv.clientName && inv.clientName.trim()) {
        clientsSet.add(inv.clientName.trim());
      }
    });
    return Array.from(clientsSet).sort();
  }, [invoices]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYr = new Date().getFullYear().toString();
    years.add(currentYr);

    invoices.forEach(inv => {
      if (inv.issueDate) {
        const y = inv.issueDate.split('-')[0];
        if (y && y.length === 4) years.add(y);
      }
    });

    return Array.from(years).sort().reverse();
  }, [invoices]);

  // Master Filtered Invoices according to all active filter controls
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;

      // Custom Date Range Filter
      if (startDate) {
        if (!inv.issueDate || inv.issueDate < startDate) return false;
      }
      if (endDate) {
        if (!inv.issueDate || inv.issueDate > endDate) return false;
      }

      // Year Filter (if no custom dates set)
      if (!startDate && !endDate && selectedYear !== 'all') {
        const issueYr = inv.issueDate ? inv.issueDate.split('-')[0] : '';
        if (issueYr !== selectedYear) return false;
      }

      // Month Filter (if no custom dates set)
      if (!startDate && !endDate && selectedMonth !== 'all') {
        if (!inv.issueDate) return false;
        const monthIndex = parseInt(inv.issueDate.split('-')[1], 10) - 1;
        if (monthIndex !== parseInt(selectedMonth, 10)) return false;
      }

      // Client Filter
      if (selectedClient !== 'all') {
        if ((inv.clientName || '').trim() !== selectedClient.trim()) return false;
      }

      // Invoice Status Filter
      if (invoiceStatusFilter !== 'all') {
        if (inv.status !== invoiceStatusFilter) return false;
      }

      // Payment Status Filter
      const balance = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
      const paid = inv.paidAmount || 0;

      if (paymentStatusFilter === 'LUNAS') {
        if (balance > 0) return false;
      } else if (paymentStatusFilter === 'SEBAGIAN') {
        if (paid === 0 || balance <= 0) return false;
      } else if (paymentStatusFilter === 'BELUM_DIBAYAR') {
        if (paid > 0) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchClient = inv.clientName?.toLowerCase().includes(q);
        const matchProj = inv.projectTitle?.toLowerCase().includes(q);
        if (!matchNum && !matchClient && !matchProj) return false;
      }

      return true;
    });
  }, [invoices, selectedYear, selectedMonth, startDate, endDate, selectedClient, invoiceStatusFilter, paymentStatusFilter, searchQuery]);

  // Financial Metrics Calculation
  const metrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    filteredInvoices.forEach(inv => {
      const total = inv.totalAmount || 0;
      const paid = inv.paidAmount || 0;
      const balance = inv.balanceDue !== undefined ? inv.balanceDue : Math.max(0, total - paid);

      totalInvoiced += total;
      totalPaid += paid;
      totalUnpaid += balance;

      if (balance <= 0 || inv.status === 'PAID') {
        paidCount++;
      } else {
        if (paid > 0) {
          partialCount++;
        } else {
          unpaidCount++;
        }

        if (isOverdue(inv)) {
          overdueCount++;
          overdueAmount += balance;
        }
      }
    });

    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    return {
      totalInvoiced,
      totalPaid,
      totalUnpaid,
      paidCount,
      unpaidCount,
      partialCount,
      overdueCount,
      overdueAmount,
      collectionRate,
      totalCount: filteredInvoices.length
    };
  }, [filteredInvoices]);

  // Filtered Unpaid Invoices
  const unpaidInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => {
      const balance = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
      return balance > 0;
    });
  }, [filteredInvoices]);

  // Filtered Paid Invoices
  const paidInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => (inv.paidAmount || 0) > 0);
  }, [filteredInvoices]);

  // Payment Records Log (Sourced strictly from actual payment history transaction dates)
  const paymentRecordsLog = useMemo(() => {
    const list: Array<{ record: PaymentRecord; invoice: Invoice }> = [];

    filteredInvoices.forEach(inv => {
      if (Array.isArray(inv.paymentHistory)) {
        inv.paymentHistory.forEach(rec => {
          // Check payment date against start/end date if set
          if (startDate && rec.date < startDate) return;
          if (endDate && rec.date > endDate) return;

          list.push({ record: rec, invoice: inv });
        });
      }
    });

    return list.sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime());
  }, [filteredInvoices, startDate, endDate]);

  // Total Payments Collected in filtered period
  const totalActualPaymentsReceived = useMemo(() => {
    return paymentRecordsLog.reduce((sum, item) => sum + (item.record.amount || 0), 0);
  }, [paymentRecordsLog]);

  // Validation Integrity Check
  const validationInfo = useMemo(() => {
    const sumInvoicePaidAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const sumHistoryPayments = totalActualPaymentsReceived;
    const diff = Math.abs(sumInvoicePaidAmount - sumHistoryPayments);
    const isConsistent = diff < 100;

    return {
      sumInvoicePaidAmount,
      sumHistoryPayments,
      diff,
      isConsistent
    };
  }, [filteredInvoices, totalActualPaymentsReceived]);

  // Revenue by Service/Product Category
  const revenueByServices = useMemo(() => {
    const serviceMap: Record<string, { serviceName: string; count: number; totalInvoiced: number; totalPaid: number }> = {};

    filteredInvoices.forEach(inv => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      const totalInv = inv.totalAmount || 1;
      const paidInv = inv.paidAmount || 0;
      const paidRatio = paidInv / totalInv;

      if (items.length === 0) {
        const cat = inv.projectTitle || 'Jasa Kenotariatan & PPAT Umum';
        if (!serviceMap[cat]) {
          serviceMap[cat] = { serviceName: cat, count: 0, totalInvoiced: 0, totalPaid: 0 };
        }
        serviceMap[cat].count++;
        serviceMap[cat].totalInvoiced += inv.totalAmount || 0;
        serviceMap[cat].totalPaid += inv.paidAmount || 0;
      } else {
        items.forEach(it => {
          const cat = it.description || (it as any).name || 'Jasa Kenotariatan & PPAT';
          if (!serviceMap[cat]) {
            serviceMap[cat] = { serviceName: cat, count: 0, totalInvoiced: 0, totalPaid: 0 };
          }
          const itemAmt = it.amount || ((it.quantity || 1) * (it.unitPrice || 0));
          serviceMap[cat].count++;
          serviceMap[cat].totalInvoiced += itemAmt;
          serviceMap[cat].totalPaid += itemAmt * paidRatio;
        });
      }
    });

    return Object.values(serviceMap).sort((a, b) => b.totalInvoiced - a.totalInvoiced);
  }, [filteredInvoices]);

  // Client Financial Summaries
  const clientFinancialSummaries = useMemo(() => {
    const map: Record<string, {
      clientName: string;
      invoiceCount: number;
      totalInvoiced: number;
      totalPaid: number;
      totalUnpaid: number;
      invoices: Invoice[];
    }> = {};

    filteredInvoices.forEach(inv => {
      const cName = (inv.clientName || 'Klien Tanpa Nama').trim();
      if (!map[cName]) {
        map[cName] = {
          clientName: cName,
          invoiceCount: 0,
          totalInvoiced: 0,
          totalPaid: 0,
          totalUnpaid: 0,
          invoices: []
        };
      }

      const total = inv.totalAmount || 0;
      const paid = inv.paidAmount || 0;
      const balance = inv.balanceDue !== undefined ? inv.balanceDue : Math.max(0, total - paid);

      map[cName].invoiceCount++;
      map[cName].totalInvoiced += total;
      map[cName].totalPaid += paid;
      map[cName].totalUnpaid += balance;
      map[cName].invoices.push(inv);
    });

    return Object.values(map).sort((a, b) => b.totalInvoiced - a.totalInvoiced);
  }, [filteredInvoices]);

  // Monthly Data Matrix
  const monthlyDataMatrix = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      return {
        monthIndex: i,
        monthName: MONTH_NAMES[i],
        invoiceCount: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        invoices: [] as Invoice[]
      };
    });

    invoices.forEach(inv => {
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') return;
      if (!inv.issueDate) return;

      const [y, m] = inv.issueDate.split('-');
      if (selectedYear !== 'all' && y !== selectedYear) return;

      const monthIdx = parseInt(m, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        const item = months[monthIdx];
        const total = inv.totalAmount || 0;
        const paid = inv.paidAmount || 0;
        const balance = inv.balanceDue !== undefined ? inv.balanceDue : Math.max(0, total - paid);

        item.invoiceCount++;
        item.totalInvoiced += total;
        item.totalPaid += paid;
        item.totalUnpaid += balance;
        item.invoices.push(inv);
      }
    });

    return months;
  }, [invoices, selectedYear]);

  // Yearly Data Matrix
  const yearlyDataMatrix = useMemo(() => {
    const yearMap: Record<string, {
      year: string;
      invoiceCount: number;
      totalInvoiced: number;
      totalPaid: number;
      totalUnpaid: number;
    }> = {};

    invoices.forEach(inv => {
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') return;
      const yr = inv.issueDate ? inv.issueDate.split('-')[0] : 'Lainnya';

      if (!yearMap[yr]) {
        yearMap[yr] = { year: yr, invoiceCount: 0, totalInvoiced: 0, totalPaid: 0, totalUnpaid: 0 };
      }

      const total = inv.totalAmount || 0;
      const paid = inv.paidAmount || 0;
      const balance = inv.balanceDue !== undefined ? inv.balanceDue : Math.max(0, total - paid);

      yearMap[yr].invoiceCount++;
      yearMap[yr].totalInvoiced += total;
      yearMap[yr].totalPaid += paid;
      yearMap[yr].totalUnpaid += balance;
    });

    return Object.values(yearMap).sort((a, b) => b.year.localeCompare(a.year));
  }, [invoices]);

  // Open Payment Modal
  const openPaymentModal = (inv: Invoice) => {
    setPaymentModalInvoice(inv);
    const remaining = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
    setPaymentAmount(remaining.toString());
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Transfer Bank');
    setPaymentRefNumber('');
    setPaymentNotes('');
  };

  // Submit Payment
  const handleSavePayment = async () => {
    if (!paymentModalInvoice) return;
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Masukkan nominal pembayaran yang valid.');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await InvoiceService.addPayment(paymentModalInvoice.id, paymentModalInvoice, {
        date: paymentDate,
        amount: amountNum,
        method: paymentMethod,
        refNumber: paymentRefNumber,
        notes: paymentNotes,
        recordedBy: 'Admin'
      });

      setPaymentModalInvoice(null);
      await loadInvoices();
    } catch (err: any) {
      alert('Gagal mencatat pembayaran: ' + (err.message || 'Error'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setSelectedYear(new Date().getFullYear().toString());
    setSelectedMonth('all');
    setStartDate('');
    setEndDate('');
    setSelectedClient('all');
    setInvoiceStatusFilter('all');
    setPaymentStatusFilter('all');
    setSearchQuery('');
  };

  // CSV Export Function
  const handleExportCSV = () => {
    let csv = 'No Invoice,Klien,Proyek,Tanggal Issue,Jatuh Tempo,Status,Total Tagihan,Sudah Dibayar,Sisa Piutang\n';
    
    filteredInvoices.forEach(inv => {
      const balance = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
      const statusStr = balance <= 0 ? 'LUNAS' : (inv.paidAmount || 0) > 0 ? 'SEBAGIAN' : 'BELUM DIBAYAR';
      const row = [
        `"${inv.invoiceNumber || ''}"`,
        `"${(inv.clientName || '').replace(/"/g, '""')}"`,
        `"${(inv.projectTitle || '').replace(/"/g, '""')}"`,
        `"${formatIndonesianDate(inv.issueDate)}"`,
        `"${formatIndonesianDate(inv.dueDate)}"`,
        `"${statusStr}"`,
        inv.totalAmount || 0,
        inv.paidAmount || 0,
        balance
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Keuangan_Invoice_${selectedYear}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate HTML string for PDF Export or Live Preview
  const buildCombinedReportHTML = () => {
    const todayStr = formatIndonesianDate(new Date().toISOString().split('T')[0]);
    
    let periodText = 'Keseluruhan Periode';
    if (startDate || endDate) {
      periodText = `${startDate ? formatIndonesianDate(startDate) : 'Awal'} s/d ${endDate ? formatIndonesianDate(endDate) : 'Hari Ini'}`;
    } else if (selectedYear !== 'all') {
      periodText = `Tahun ${selectedYear}${selectedMonth !== 'all' ? ' — Bulan ' + MONTH_NAMES[parseInt(selectedMonth, 10)] : ''}`;
    }

    let sectionsHTML = '';

    // Determine target sections based on active single preview or multi-selection
    const targetSelection = previewTabModal ? { [previewTabModal]: true } : selectedReportsForPDF;

    // 1. REKAP INVOICE
    if (targetSelection.rekap_invoice) {
      sectionsHTML += `
        <div class="report-section">
          <div class="section-title">REKAPITULASI INVOICE TERBIT (${filteredInvoices.length} DOKUMEN)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 120px;">No. Invoice</th>
                <th>Nama Klien & Proyek</th>
                <th style="width: 100px;">Tgl Issue</th>
                <th style="width: 100px;">Jatuh Tempo</th>
                <th style="width: 90px;">Status</th>
                <th style="width: 110px;" class="text-right">Total Tagihan</th>
                <th style="width: 110px;" class="text-right">Sudah Dibayar</th>
                <th style="width: 110px;" class="text-right">Sisa Piutang</th>
              </tr>
            </thead>
            <tbody>
              ${filteredInvoices.map(inv => {
                const balance = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
                const isP = balance <= 0;
                const isPart = (inv.paidAmount || 0) > 0 && balance > 0;
                return `
                  <tr>
                    <td><b>${inv.invoiceNumber}</b></td>
                    <td><b>${inv.clientName}</b>${inv.projectTitle ? '<br/><span style="font-size:10px; color:#64748b;">' + inv.projectTitle + '</span>' : ''}</td>
                    <td>${formatIndonesianDate(inv.issueDate)}</td>
                    <td>${formatIndonesianDate(inv.dueDate)}</td>
                    <td><span class="badge ${isP ? 'badge-paid' : isPart ? 'badge-partial' : 'badge-unpaid'}">${isP ? 'LUNAS' : isPart ? 'SEBAGIAN' : 'BELUM BAYAR'}</span></td>
                    <td class="text-right">${formatCurrency(inv.totalAmount)}</td>
                    <td class="text-right" style="color:#16a34a; font-weight:bold;">${formatCurrency(inv.paidAmount)}</td>
                    <td class="text-right" style="color:#dc2626; font-weight:bold;">${formatCurrency(balance)}</td>
                  </tr>
                `;
              }).join('')}
              ${filteredInvoices.length === 0 ? '<tr><td colSpan="8" style="text-align:center; color:#94a3b8;">Tidak ada data invoice.</td></tr>' : ''}
            </tbody>
            <tfoot>
              <tr style="background:#f1f5f9; font-weight:bold;">
                <td colSpan="5">TOTAL (${metrics.totalCount} INVOICE)</td>
                <td class="text-right">${formatCurrency(metrics.totalInvoiced)}</td>
                <td class="text-right" style="color:#16a34a;">${formatCurrency(metrics.totalPaid)}</td>
                <td class="text-right" style="color:#dc2626;">${formatCurrency(metrics.totalUnpaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    // 2. LAPORAN PEMBAYARAN
    if (targetSelection.laporan_pembayaran) {
      sectionsHTML += `
        <div class="report-section">
          <div class="section-title">LAPORAN PEMBAYARAN MASUK (${paymentRecordsLog.length} TRANSAKSI)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 110px;">Tgl Bayar</th>
                <th style="width: 120px;">No. Invoice</th>
                <th>Nama Klien</th>
                <th style="width: 110px;">Metode</th>
                <th>No. Referensi / Catatan</th>
                <th style="width: 120px;" class="text-right">Jumlah Diterima</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRecordsLog.map(item => `
                <tr>
                  <td><b>${formatIndonesianDate(item.record.date)}</b></td>
                  <td>${item.invoice.invoiceNumber}</td>
                  <td><b>${item.invoice.clientName}</b></td>
                  <td><span class="badge badge-paid">${item.record.method || 'Transfer Bank'}</span></td>
                  <td>${item.record.refNumber ? 'Ref: ' + item.record.refNumber : ''} ${item.record.notes ? ' (' + item.record.notes + ')' : ''}</td>
                  <td class="text-right" style="color:#16a34a; font-weight:bold;">${formatCurrency(item.record.amount)}</td>
                </tr>
              `).join('')}
              ${paymentRecordsLog.length === 0 ? '<tr><td colSpan="6" style="text-align:center; color:#94a3b8;">Belum ada riwayat pembayaran masuk.</td></tr>' : ''}
            </tbody>
            <tfoot>
              <tr style="background:#f1f5f9; font-weight:bold;">
                <td colSpan="5">TOTAL KAS PEMBAYARAN DITERIMA</td>
                <td class="text-right" style="color:#16a34a;">${formatCurrency(totalActualPaymentsReceived)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    // 3. LAPORAN PIUTANG
    if (targetSelection.laporan_piutang) {
      sectionsHTML += `
        <div class="report-section">
          <div class="section-title">LAPORAN PIUTANG INVOICE BELUM LUNAS (${unpaidInvoices.length} DOKUMEN)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 120px;">No. Invoice</th>
                <th>Nama Klien</th>
                <th style="width: 100px;">Tgl Issue</th>
                <th style="width: 100px;">Jatuh Tempo</th>
                <th style="width: 110px;">Status Aging</th>
                <th style="width: 110px;" class="text-right">Total Tagihan</th>
                <th style="width: 110px;" class="text-right">Sudah Dibayar</th>
                <th style="width: 110px;" class="text-right">Sisa Piutang</th>
              </tr>
            </thead>
            <tbody>
              ${unpaidInvoices.map(inv => {
                const balance = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
                const overdue = isOverdue(inv);
                const agingDays = getAgingDays(inv.dueDate);
                return `
                  <tr>
                    <td><b>${inv.invoiceNumber}</b></td>
                    <td><b>${inv.clientName}</b></td>
                    <td>${formatIndonesianDate(inv.issueDate)}</td>
                    <td>${formatIndonesianDate(inv.dueDate)}</td>
                    <td>
                      <span class="badge ${overdue ? 'badge-unpaid' : 'badge-partial'}">
                        ${overdue ? 'Terlambat ' + agingDays + ' Hari' : 'Akan Jatuh Tempo'}
                      </span>
                    </td>
                    <td class="text-right">${formatCurrency(inv.totalAmount)}</td>
                    <td class="text-right" style="color:#16a34a;">${formatCurrency(inv.paidAmount)}</td>
                    <td class="text-right" style="color:#dc2626; font-weight:bold;">${formatCurrency(balance)}</td>
                  </tr>
                `;
              }).join('')}
              ${unpaidInvoices.length === 0 ? '<tr><td colSpan="8" style="text-align:center; color:#15803d; font-weight:bold;">Tidak ada tunggakan piutang! Semua lunas.</td></tr>' : ''}
            </tbody>
            <tfoot>
              <tr style="background:#fee2e2; font-weight:bold; color:#991b1b;">
                <td colSpan="7">TOTAL SISA PIUTANG MURNI</td>
                <td class="text-right">${formatCurrency(metrics.totalUnpaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    // 4. REKAP PENDAPATAN
    if (targetSelection.rekap_pendapatan) {
      sectionsHTML += `
        <div class="report-section">
          <div class="section-title">REKAPITULASI PENDAPATAN PER KATEGORI JASA / PRODUK</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align:center;">No</th>
                <th>Kategori / Deskripsi Layanan</th>
                <th style="width: 90px; text-align:center;">Frekuensi</th>
                <th style="width: 140px;" class="text-right">Total Tagihan</th>
                <th style="width: 140px;" class="text-right">Estimasi Kas Diterima</th>
              </tr>
            </thead>
            <tbody>
              ${revenueByServices.map((srv, idx) => `
                <tr>
                  <td style="text-align:center;">${idx + 1}</td>
                  <td><b>${srv.serviceName}</b></td>
                  <td style="text-align:center;">${srv.count}x</td>
                  <td class="text-right">${formatCurrency(srv.totalInvoiced)}</td>
                  <td class="text-right" style="color:#16a34a; font-weight:bold;">${formatCurrency(srv.totalPaid)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // 5. LAPORAN BULANAN
    if (targetSelection.laporan_bulanan || targetSelection.laporan_tahunan || targetSelection.overview) {
      sectionsHTML += `
        <div class="report-section">
          <div class="section-title">LAPORAN REKAPITULASI PER BULAN (${selectedYear === 'all' ? 'SEMUA TAHUN' : 'TAHUN ' + selectedYear})</div>
          <table>
            <thead>
              <tr>
                <th>Bulan</th>
                <th style="text-align:center;">Jumlah Inv</th>
                <th class="text-right">Total Omset Tagihan</th>
                <th class="text-right">Sudah Dibayar</th>
                <th class="text-right">Sisa Piutang</th>
                <th style="text-align:center;">Tingkat Pelunasan</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyDataMatrix.map(m => {
                const rate = m.totalInvoiced > 0 ? (m.totalPaid / m.totalInvoiced) * 100 : 0;
                return `
                  <tr>
                    <td><b>${m.monthName}</b></td>
                    <td style="text-align:center;">${m.invoiceCount}</td>
                    <td class="text-right">${formatCurrency(m.totalInvoiced)}</td>
                    <td class="text-right" style="color:#16a34a; font-weight:bold;">${formatCurrency(m.totalPaid)}</td>
                    <td class="text-right" style="color:#dc2626; font-weight:bold;">${m.totalUnpaid > 0 ? formatCurrency(m.totalUnpaid) : '-'}</td>
                    <td style="text-align:center;"><b>${rate.toFixed(0)}%</b></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // 6. LAPORAN KLIEN
    if (targetSelection.laporan_klien) {
      sectionsHTML += `
        <div class="report-section">
          <div class="section-title">LAPORAN REKAPITULASI PER KLIEN (${clientFinancialSummaries.length} KLIEN)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align:center;">No</th>
                <th>Nama Klien</th>
                <th style="width: 90px; text-align:center;">Jumlah Inv</th>
                <th style="width: 120px;" class="text-right">Total Tagihan</th>
                <th style="width: 120px;" class="text-right">Sudah Dibayar</th>
                <th style="width: 120px;" class="text-right">Sisa Piutang</th>
              </tr>
            </thead>
            <tbody>
              ${clientFinancialSummaries.map((cli, idx) => `
                <tr>
                  <td style="text-align:center;">${idx + 1}</td>
                  <td><b>${cli.clientName}</b></td>
                  <td style="text-align:center;">${cli.invoiceCount} Inv</td>
                  <td class="text-right">${formatCurrency(cli.totalInvoiced)}</td>
                  <td class="text-right" style="color:#16a34a; font-weight:bold;">${formatCurrency(cli.totalPaid)}</td>
                  <td class="text-right" style="color:#dc2626; font-weight:bold;">${cli.totalUnpaid > 0 ? formatCurrency(cli.totalUnpaid) : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // 7. RIWAYAT TRANSAKSI ITEM
    if (targetSelection.riwayat_transaksi) {
      sectionsHTML += `
        <div class="report-section">
          <div class="section-title">RIWAYAT TRANSAKSI & DETAIL INVOICE ITEM</div>
          ${filteredInvoices.map((inv, idx) => {
            const balance = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
            const isP = balance <= 0;
            const isPart = (inv.paidAmount || 0) > 0 && balance > 0;
            const items = Array.isArray(inv.items) ? inv.items : [];
            const history = Array.isArray(inv.paymentHistory) ? inv.paymentHistory : [];

            return `
              <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                  <div>
                    <b>#${idx + 1}. Invoice ${inv.invoiceNumber}</b> — ${inv.clientName}
                    ${inv.projectTitle ? '<br/><span style="font-size: 10px; color: #64748b;">Proyek: ' + inv.projectTitle + '</span>' : ''}
                  </div>
                  <div style="text-align: right;">
                    <span class="badge ${isP ? 'badge-paid' : isPart ? 'badge-partial' : 'badge-unpaid'}">
                      ${isP ? 'LUNAS' : isPart ? 'SEBAGIAN' : 'BELUM BAYAR'}
                    </span>
                    <br/><span style="font-size: 10px; color: #64748b;">Issue: ${formatIndonesianDate(inv.issueDate)}</span>
                  </div>
                </div>

                <table style="margin-top: 6px; margin-bottom: 6px;">
                  <thead>
                    <tr>
                      <th style="width: 30px; text-align:center;">No</th>
                      <th>Produk / Layanan</th>
                      <th style="width: 50px; text-align:center;">Qty</th>
                      <th style="width: 100px; text-align:right;">Harga</th>
                      <th style="width: 100px; text-align:right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map((it, iIdx) => `
                      <tr>
                        <td style="text-align:center;">${iIdx + 1}</td>
                        <td>${it.description || (it as any).name || '-'}</td>
                        <td style="text-align:center;">${it.quantity || 1}</td>
                        <td style="text-align:right;">${formatCurrency(it.unitPrice)}</td>
                        <td style="text-align:right; font-weight:bold;">${formatCurrency(it.amount || ((it.quantity || 1) * (it.unitPrice || 0)))}</td>
                      </tr>
                    `).join('')}
                    ${items.length === 0 ? '<tr><td colSpan="5" style="text-align:center; color:#94a3b8;">Item tidak dirinci.</td></tr>' : ''}
                  </tbody>
                </table>

                <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 6px 10px; border-radius: 4px; font-size: 11px;">
                  <div>
                    ${history.length > 0 ? `
                      <b>Histori Angsuran:</b>
                      <ul style="margin: 2px 0 0 14px; padding: 0; font-size: 10px;">
                        ${history.map(h => `<li>${formatIndonesianDate(h.date)}: ${formatCurrency(h.amount)} (${h.method || 'Transfer'})</li>`).join('')}
                      </ul>
                    ` : '<span>Belum ada angsuran.</span>'}
                  </div>
                  <div style="text-align: right;">
                    Total: <b>${formatCurrency(inv.totalAmount)}</b> | Terbayar: <b style="color:#16a34a;">${formatCurrency(inv.paidAmount)}</b> | Sisa: <b style="color:#dc2626;">${formatCurrency(balance)}</b>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Keuangan Notaris & PPAT</title>
        <style>
          @page {
            size: A4 ${pdfOrientation};
            margin: 12mm;
          }
          body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            padding: 16px; 
            color: #0f172a; 
            font-size: 11px; 
            line-height: 1.4; 
          }
          .office-header { 
            text-align: center; 
            border-bottom: 2.5px solid #0f172a; 
            padding-bottom: 10px; 
            margin-bottom: 16px; 
          }
          .office-header h2 { 
            margin: 0; 
            font-size: 16px; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            color: #0f172a; 
          }
          .office-header h1 { 
            margin: 2px 0; 
            font-size: 18px; 
            font-weight: 900; 
            text-transform: uppercase; 
            color: #1e3a8a; 
          }
          .office-header p { 
            margin: 2px 0 0 0; 
            color: #475569; 
            font-size: 10px; 
            font-weight: 600; 
          }
          
          .summary-kpi-bar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .kpi-card {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            border-radius: 6px;
            background: #f8fafc;
          }
          .kpi-card .title { font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; }
          .kpi-card .val { font-size: 14px; font-weight: 900; margin-top: 3px; color: #0f172a; }

          .report-section {
            margin-bottom: 24px;
            page-break-inside: auto;
          }
          .section-title {
            font-size: 12px;
            font-weight: 900;
            color: #0f172a;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 4px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 10px; }
          thead { display: table-header-group; }
          th { background: #0f172a; color: white; text-align: left; padding: 6px 8px; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; font-size: 10.5px; }
          .text-right { text-align: right; }
          
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8.5px; font-weight: bold; }
          .badge-paid { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
          .badge-unpaid { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
          .badge-partial { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

          .footer-note {
            margin-top: 30px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: #64748b;
          }

          @media print {
            body { padding: 0; }
            .report-section { page-break-inside: auto; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
        <div class="office-header">
          <h2>NOTARIS & PPAT NUKANTINI PUTRI PARINCHA, S.H., M.Kn.</h2>
          <h1>LAPORAN KEUANGAN KEGIATAN KANTOR</h1>
          <p>Periode: <b>${periodText}</b> | Dicetak: <b>${todayStr}</b></p>
        </div>

        <div class="summary-kpi-bar">
          <div class="kpi-card">
            <div class="title">Total Tagihan (Omset)</div>
            <div class="val">${formatCurrency(metrics.totalInvoiced)}</div>
          </div>
          <div class="kpi-card">
            <div class="title">Total Kas Masuk</div>
            <div class="val" style="color:#16a34a;">${formatCurrency(metrics.totalPaid)}</div>
          </div>
          <div class="kpi-card">
            <div class="title">Sisa Piutang</div>
            <div class="val" style="color:#dc2626;">${formatCurrency(metrics.totalUnpaid)}</div>
          </div>
          <div class="kpi-card">
            <div class="title">Tingkat Pelunasan</div>
            <div class="val" style="color:#2563eb;">${metrics.collectionRate.toFixed(1)}%</div>
          </div>
        </div>

        ${sectionsHTML}

        <div class="footer-note">
          <span>Laporan Keuangan Otomatis — Superapps Notaris Putri Office System</span>
          <span>Dicetak Tanggal: ${todayStr}</span>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
  };

  // Direct Execute Print Function
  const handleDirectPrintPDF = () => {
    const html = buildCombinedReportHTML();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Single Tab PDF Preview Handler
  const openSingleTabPreview = (tab: ReportViewType) => {
    setPreviewTabModal(tab);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Memuat Modul Laporan Keuangan...</p>
      </div>
    );
  }

  // Define Report Metadata Cards for the Main Hub
  const reportCards = [
    {
      id: 'overview',
      title: 'Ringkasan Keuangan',
      icon: BarChart3,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeText: 'Dashboard Utama',
      desc: 'Ikhtisar eksekutif omset tagihan, realisasi penerimaan kas, sisa piutang, dan tingkat pelunasan.',
      statLabel: 'Total Omset',
      statVal: formatCurrency(metrics.totalInvoiced)
    },
    {
      id: 'rekap_invoice',
      title: 'Rekap Invoice',
      icon: FileText,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      badgeText: `${filteredInvoices.length} Invoice`,
      desc: 'Seluruh daftar invoice yang diterbitkan, tanggal jatuh tempo, total tagihan, dan sisa piutang.',
      statLabel: 'Jumlah Invoice',
      statVal: `${filteredInvoices.length} Dokumen`
    },
    {
      id: 'laporan_pembayaran',
      title: 'Pembayaran Masuk',
      icon: CheckCircle2,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeText: `${paymentRecordsLog.length} Transaksi`,
      desc: 'Laporan kas penerimaan pembayaran aktual berdasarkan tanggal transaksi penerimaan uang.',
      statLabel: 'Kas Diterima',
      statVal: formatCurrency(totalActualPaymentsReceived)
    },
    {
      id: 'laporan_piutang',
      title: 'Laporan Piutang',
      icon: Clock,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      badgeText: `${unpaidInvoices.length} Tunggakan`,
      desc: 'Daftar invoice belum lunas atau dibayar sebagian beserta analisis status keterlambatan jatuh tempo.',
      statLabel: 'Total Sisa Piutang',
      statVal: formatCurrency(metrics.totalUnpaid)
    },
    {
      id: 'laporan_bulanan',
      title: 'Rekap Per Bulan',
      icon: Calendar,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      badgeText: '12 Bulan',
      desc: 'Matriks perbandingan kinerja keuangan, nilai penerbitan invoice, dan kas diterima per bulan.',
      statLabel: 'Tahun Aktif',
      statVal: selectedYear === 'all' ? 'Semua Tahun' : `Tahun ${selectedYear}`
    },
    {
      id: 'laporan_tahunan',
      title: 'Rekap Tahunan',
      icon: TrendingUp,
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
      badgeText: 'Multi-Tahun',
      desc: 'Perbandingan pertumbuhan total omset tagihan, penerimaan kas, dan piutang antar tahun.',
      statLabel: 'Total Tahun',
      statVal: `${yearlyDataMatrix.length} Tahun Record`
    },
    {
      id: 'laporan_klien',
      title: 'Rekap Per Klien',
      icon: Users,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      badgeText: `${clientFinancialSummaries.length} Klien`,
      desc: 'Analisis rekapitulasi jumlah invoice, total tagihan, dan sisa piutang dikelompokkan per nama klien.',
      statLabel: 'Klien Aktif',
      statVal: `${clientFinancialSummaries.length} Klien`
    },
    {
      id: 'rekap_pendapatan',
      title: 'Rekap Kategori Jasa',
      icon: PieChart,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      badgeText: `${revenueByServices.length} Kategori`,
      desc: 'Rincian omset dan estimasi kas diterima berdasarkan klasifikasi layanan kenotariatan & PPAT.',
      statLabel: 'Kategori Layanan',
      statVal: `${revenueByServices.length} Kategori`
    },
    {
      id: 'riwayat_transaksi',
      title: 'Riwayat Transaksi Item',
      icon: History,
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      badgeText: 'Itemized Details',
      desc: 'Rincian detail produk/layanan per invoice beserta log histori angsuran pembayaran.',
      statLabel: 'Total Itemized',
      statVal: `${filteredInvoices.length} Invoice`
    },
    {
      id: 'pdf_merger',
      title: 'Pusat Cetak & Merger PDF',
      icon: Layers,
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      badgeText: 'PDF Custom',
      desc: 'Fitur penggabungan beberapa laporan terpilih menjadi satu dokumen PDF A4 siap cetak.',
      statLabel: 'Multi-Report',
      statVal: 'A4 Portrait/Landscape'
    }
  ];

  // Helper for rendered report title / subtitle
  const currentReportMeta = reportCards.find(c => c.id === activeReportView);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* GLOBAL HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          {activeReportView !== 'hub' ? (
            <button
              onClick={() => setActiveReportView('hub')}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              title="Kembali ke Utama Laporan"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          )}

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {activeReportView === 'hub' ? 'Laporan Keuangan Notaris & PPAT' : currentReportMeta?.title || 'Laporan Keuangan'}
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Data Real
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeReportView === 'hub' 
                ? 'Pilih jenis laporan keuangan yang ingin diakses, ditinjau, atau diekspor ke PDF.' 
                : currentReportMeta?.desc || 'Sistem laporan keuangan berdasarkan transaksi invoice & pembayaran aktual.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {activeReportView !== 'hub' && (
            <button
              onClick={() => setActiveReportView('hub')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Semua Laporan</span>
            </button>
          )}

          <button
            onClick={loadInvoices}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold border border-slate-200 hover:border-emerald-200 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {activeReportView !== 'hub' && activeReportView !== 'pdf_merger' && (
            <button
              onClick={() => openSingleTabPreview(activeReportView)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Pratinjau / Cetak PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* VALIDATION INTEGRITY STATUS ALERT */}
      <div className={`p-4 rounded-2xl border text-xs flex items-start sm:items-center justify-between gap-3 ${
        validationInfo.isConsistent 
          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-start gap-2.5">
          <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 sm:mt-0 ${validationInfo.isConsistent ? 'text-emerald-600' : 'text-amber-600'}`} />
          <div>
            <div className="font-extrabold flex items-center gap-2">
              <span>{validationInfo.isConsistent ? 'Validasi Perhitungan Integritas Data Sesuai' : 'Informasi Perbedaan Tanggal Kas & Invoice'}</span>
            </div>
            <p className="text-[11px] mt-0.5 leading-relaxed text-slate-600">
              {validationInfo.isConsistent ? (
                <>Total penerimaan kas dari histori transaksi (<b>{formatCurrency(validationInfo.sumHistoryPayments)}</b>) 100% konsisten dengan akumulasi pembayaran pada invoice.</>
              ) : (
                <>Terdapat selisih <b>{formatCurrency(validationInfo.diff)}</b> antara transaksi pembayaran aktual pada histori kas ({formatCurrency(validationInfo.sumHistoryPayments)}) dengan nilai pembayaran terakumulasi pada invoice ({formatCurrency(validationInfo.sumInvoicePaidAmount)}). Hal ini dikarenakan adanya pembayaran yang tanggal penerimaannya berbeda dari tanggal penerbitan invoice.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ADVANCED FILTER CONTROLS PANEL */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Filter Periode & Klien</span>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-emerald-600 font-semibold cursor-pointer transition-colors"
          >
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Rentang Tanggal Custom / Tahun */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Tahun & Bulan
            </label>
            <div className="flex gap-1.5">
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setStartDate(''); setEndDate(''); }}
                className="w-1/2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Semua Thn</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              <select
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setStartDate(''); setEndDate(''); }}
                className="w-1/2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Semua Bln</option>
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={idx} value={idx.toString()}>{mName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Periode Tanggal Custom
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-1/2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500"
                placeholder="Awal"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-1/2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500"
                placeholder="Akhir"
              />
            </div>
          </div>

          {/* Filter Klien */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Filter Klien
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Klien ({availableClients.length})</option>
              {availableClients.map(cli => (
                <option key={cli} value={cli}>{cli}</option>
              ))}
            </select>
          </div>

          {/* Status Pembayaran */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Status Pembayaran
            </label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Status Bayar</option>
              <option value="LUNAS">Hanya Lunas</option>
              <option value="SEBAGIAN">Sebagian (Piutang Ada)</option>
              <option value="BELUM_DIBAYAR">Belum Ada Bayar</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Cari No / Proyek
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

        </div>
      </div>

      {/* KPI METRIC CARDS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Invoiced */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tagihan (Omset)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(metrics.totalInvoiced)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">{metrics.totalCount} Invoice</span>
            <span>periode dipilih</span>
          </div>
        </div>

        {/* Total Paid / Cash Received */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Kas Masuk Diterima</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(metrics.totalPaid)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">{metrics.paidCount} Invoice Lunas</span>
            <span className="text-emerald-600 font-semibold">({metrics.collectionRate.toFixed(0)}% Realisasi)</span>
          </div>
        </div>

        {/* Total Unpaid / Balance Due */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/10 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Sisa Piutang Tagihan</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
            {formatCurrency(metrics.totalUnpaid)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">{metrics.unpaidCount + metrics.partialCount} Belum Lunas</span>
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/10 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Jatuh Tempo / Terlambat</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
            {formatCurrency(metrics.overdueAmount)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">{metrics.overdueCount} Terlambat</span>
          </div>
        </div>

      </div>

      {/* VIEW 1: MAIN HUB VIEW (CARD GRID) */}
      {activeReportView === 'hub' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-emerald-600" />
              Pilih Jenis Laporan Keuangan
            </h2>
            <span className="text-xs text-slate-500">
              Klik salah satu kartu untuk membuka halaman laporan khusus
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportCards.map((card) => {
              const IconComp = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => setActiveReportView(card.id as ReportViewType)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-700 flex items-center justify-center transition-colors">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${card.badgeColor}`}>
                        {card.badgeText}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">{card.statLabel}</span>
                      <span className="font-bold text-slate-800">{card.statVal}</span>
                    </div>

                    <div className="flex items-center gap-1 font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                      <span>Buka Laporan</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED REPORT VIEWS WITH BACK BUTTON */}
      {activeReportView !== 'hub' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Top Back Navigation Banner */}
          <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveReportView('hub')}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Utama Laporan</span>
            </button>

            <span className="text-xs font-bold text-slate-600 hidden sm:block">
              Halaman Khusus: <b>{currentReportMeta?.title}</b>
            </span>
          </div>

          {/* DEDICATED VIEW: RINGKASAN KEUANGAN */}
          {activeReportView === 'overview' && (
            <div className="p-4 sm:p-6 space-y-6">
              
              {/* Visual Progress Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Realisasi Kas Pembayaran Diterima</span>
                  <span>{formatCurrency(metrics.totalPaid)} dari {formatCurrency(metrics.totalInvoiced)} ({metrics.collectionRate.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, metrics.collectionRate)}%` }}
                  />
                  <div 
                    className="bg-rose-400 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, 100 - metrics.collectionRate)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Kas Diterima: <b>{formatCurrency(metrics.totalPaid)}</b>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Belum Dibayar: <b>{formatCurrency(metrics.totalUnpaid)}</b>
                  </span>
                </div>
              </div>

              {/* Monthly Summary Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Rekapitulasi Keuangan Per Bulan ({selectedYear === 'all' ? 'Semua Tahun' : selectedYear})
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Bulan</th>
                        <th className="p-3 text-center">Jumlah Invoice</th>
                        <th className="p-3 text-right">Total Tagihan</th>
                        <th className="p-3 text-right">Kas Diterima</th>
                        <th className="p-3 text-right">Sisa Piutang</th>
                        <th className="p-3 text-center">Tingkat Pelunasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {monthlyDataMatrix.map((m) => {
                        const rate = m.totalInvoiced > 0 ? (m.totalPaid / m.totalInvoiced) * 100 : 0;
                        return (
                          <tr key={m.monthIndex} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3 font-bold text-slate-800">{m.monthName}</td>
                            <td className="p-3 text-center font-semibold text-slate-600">{m.invoiceCount}</td>
                            <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(m.totalInvoiced)}</td>
                            <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(m.totalPaid)}</td>
                            <td className="p-3 text-right font-bold text-rose-600">
                              {m.totalUnpaid > 0 ? formatCurrency(m.totalUnpaid) : '-'}
                            </td>
                            <td className="p-3 text-center">
                              {m.invoiceCount > 0 ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, rate)}%` }} />
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-700">{rate.toFixed(0)}%</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* DEDICATED VIEW: REKAP INVOICE */}
          {activeReportView === 'rekap_invoice' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Daftar Rekapitulasi Invoice ({filteredInvoices.length} Dokumen)
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">No. Invoice</th>
                      <th className="p-3">Klien</th>
                      <th className="p-3">Proyek / Layanan</th>
                      <th className="p-3">Tgl Issue</th>
                      <th className="p-3">Jatuh Tempo</th>
                      <th className="p-3 text-right">Total Tagihan</th>
                      <th className="p-3 text-right">Kas Diterima</th>
                      <th className="p-3 text-right">Sisa Piutang</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredInvoices.map((inv) => {
                      const balance = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
                      const isP = balance <= 0;
                      const isPart = (inv.paidAmount || 0) > 0 && balance > 0;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="p-3 font-semibold text-slate-800">{inv.clientName}</td>
                          <td className="p-3 text-slate-600">{inv.projectTitle || '-'}</td>
                          <td className="p-3 text-slate-600">{formatIndonesianDate(inv.issueDate)}</td>
                          <td className="p-3 text-slate-600">{formatIndonesianDate(inv.dueDate)}</td>
                          <td className="p-3 text-right font-medium text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(inv.paidAmount)}</td>
                          <td className="p-3 text-right font-bold text-rose-600">{formatCurrency(balance)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isP ? 'bg-emerald-100 text-emerald-800' : isPart ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isP ? 'LUNAS' : isPart ? 'SEBAGIAN' : 'BELUM BAYAR'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredInvoices.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 italic">Tidak ada invoice sesuai filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEDICATED VIEW: LAPORAN PEMBAYARAN */}
          {activeReportView === 'laporan_pembayaran' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Laporan Kas Pembayaran Diterima ({paymentRecordsLog.length} Transaksi)
                </h3>

                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  Kas Diterima: {formatCurrency(totalActualPaymentsReceived)}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Tgl Pembayaran</th>
                      <th className="p-3">No. Invoice</th>
                      <th className="p-3">Nama Klien</th>
                      <th className="p-3">Metode Bayar</th>
                      <th className="p-3">No. Referensi / Bukti</th>
                      <th className="p-3">Catatan</th>
                      <th className="p-3 text-right">Jumlah Diterima (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paymentRecordsLog.map((item, idx) => (
                      <tr key={item.record.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">{formatIndonesianDate(item.record.date)}</td>
                        <td className="p-3 font-bold text-slate-900">{item.invoice.invoiceNumber}</td>
                        <td className="p-3 font-semibold text-slate-800">{item.invoice.clientName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                            {item.record.method || 'Transfer Bank'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-mono">{item.record.refNumber || '-'}</td>
                        <td className="p-3 text-slate-500 italic">{item.record.notes || '-'}</td>
                        <td className="p-3 text-right font-black text-emerald-600 text-sm">
                          {formatCurrency(item.record.amount)}
                        </td>
                      </tr>
                    ))}
                    {paymentRecordsLog.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">Belum ada riwayat transaksi pembayaran masuk.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEDICATED VIEW: LAPORAN PIUTANG */}
          {activeReportView === 'laporan_piutang' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-600" />
                  Laporan Piutang Invoice Belum Lunas ({unpaidInvoices.length} Dokumen)
                </h3>

                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                  Total Sisa Piutang: {formatCurrency(metrics.totalUnpaid)}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">No. Invoice & Klien</th>
                      <th className="p-3">Tgl Issue</th>
                      <th className="p-3">Jatuh Tempo</th>
                      <th className="p-3 text-right">Total Tagihan</th>
                      <th className="p-3 text-right">Sudah Dibayar</th>
                      <th className="p-3 text-right">Sisa Piutang</th>
                      <th className="p-3 text-center">Aging Status</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {unpaidInvoices.map((inv) => {
                      const balance = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
                      const overdue = isOverdue(inv);
                      const agingDays = getAgingDays(inv.dueDate);

                      return (
                        <tr key={inv.id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                            <div className="text-slate-600 font-semibold">{inv.clientName}</div>
                          </td>
                          <td className="p-3 text-slate-600">{formatIndonesianDate(inv.issueDate)}</td>
                          <td className="p-3 font-medium">
                            <div className={overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                              {formatIndonesianDate(inv.dueDate)}
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(inv.totalAmount)}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(inv.paidAmount)}</td>
                          <td className="p-3 text-right font-black text-rose-600 text-sm">{formatCurrency(balance)}</td>
                          <td className="p-3 text-center">
                            {overdue ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                Terlambat {agingDays} Hari
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Akan Jatuh Tempo
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Bayar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {unpaidInvoices.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-emerald-700 font-bold bg-emerald-50">
                          Tidak ada tunggakan piutang! Semua invoice telah dilunasi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEDICATED VIEW: REKAP PENDAPATAN */}
          {activeReportView === 'rekap_pendapatan' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  Rekapitulasi Omset & Kas Diterima Per Kategori Layanan
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3">Kategori / Deskripsi Layanan</th>
                      <th className="p-3 text-center">Frekuensi (Item)</th>
                      <th className="p-3 text-right">Nilai Tagihan (Omset)</th>
                      <th className="p-3 text-right">Estimasi Kas Diterima</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {revenueByServices.map((srv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{srv.serviceName}</td>
                        <td className="p-3 text-center font-semibold text-slate-600">{srv.count}x</td>
                        <td className="p-3 text-right font-medium text-slate-900">{formatCurrency(srv.totalInvoiced)}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(srv.totalPaid)}</td>
                      </tr>
                    ))}
                    {revenueByServices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">Tidak ada data klasifikasi layanan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEDICATED VIEW: REKAP BULANAN */}
          {activeReportView === 'laporan_bulanan' && (
            <div className="p-4 sm:p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Laporan Per Bulan ({selectedYear === 'all' ? 'Semua Tahun' : selectedYear})
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Bulan</th>
                        <th className="p-3 text-center">Total Inv</th>
                        <th className="p-3 text-right">Nilai Tagihan</th>
                        <th className="p-3 text-right">Kas Diterima</th>
                        <th className="p-3 text-right">Sisa Piutang</th>
                        <th className="p-3 text-center">Rasio Lunas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {monthlyDataMatrix.map((m) => {
                        const rate = m.totalInvoiced > 0 ? (m.totalPaid / m.totalInvoiced) * 100 : 0;
                        return (
                          <tr key={m.monthIndex} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-800">{m.monthName}</td>
                            <td className="p-3 text-center font-semibold text-slate-600">{m.invoiceCount}</td>
                            <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(m.totalInvoiced)}</td>
                            <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(m.totalPaid)}</td>
                            <td className="p-3 text-right font-bold text-rose-600">{m.totalUnpaid > 0 ? formatCurrency(m.totalUnpaid) : '-'}</td>
                            <td className="p-3 text-center font-bold text-slate-700">{rate.toFixed(0)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED VIEW: REKAP TAHUNAN */}
          {activeReportView === 'laporan_tahunan' && (
            <div className="p-4 sm:p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Laporan Tahunan (Multi-Tahun)
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Tahun</th>
                        <th className="p-3 text-center">Total Invoice</th>
                        <th className="p-3 text-right">Total Omset Tagihan</th>
                        <th className="p-3 text-right">Total Kas Diterima</th>
                        <th className="p-3 text-right">Total Sisa Piutang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {yearlyDataMatrix.map((yItem) => (
                        <tr key={yItem.year} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-extrabold text-slate-900 text-sm">Tahun {yItem.year}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{yItem.invoiceCount}</td>
                          <td className="p-3 text-right font-medium text-slate-900">{formatCurrency(yItem.totalInvoiced)}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(yItem.totalPaid)}</td>
                          <td className="p-3 text-right font-bold text-rose-600">{formatCurrency(yItem.totalUnpaid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED VIEW: LAPORAN KLIEN */}
          {activeReportView === 'laporan_klien' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Laporan Keuangan & Piutang Per Klien ({clientFinancialSummaries.length} Klien)
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3">Nama Klien</th>
                      <th className="p-3 text-center">Jumlah Invoice</th>
                      <th className="p-3 text-right">Total Tagihan</th>
                      <th className="p-3 text-right">Total Sudah Dibayar</th>
                      <th className="p-3 text-right">Sisa Piutang</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {clientFinancialSummaries.map((cli, idx) => {
                      const isAllPaid = cli.totalUnpaid <= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{cli.clientName}</td>
                          <td className="p-3 text-center font-semibold text-slate-600">{cli.invoiceCount} Inv</td>
                          <td className="p-3 text-right font-medium text-slate-900">{formatCurrency(cli.totalInvoiced)}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(cli.totalPaid)}</td>
                          <td className="p-3 text-right font-bold text-rose-600">{cli.totalUnpaid > 0 ? formatCurrency(cli.totalUnpaid) : '-'}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isAllPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isAllPaid ? 'LUNAS SEMUA' : 'MEMILIKI PIUTANG'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEDICATED VIEW: RIWAYAT TRANSAKSI */}
          {activeReportView === 'riwayat_transaksi' && (
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                Riwayat Transaksi Detail Invoice & Angsuran Pembayaran
              </h3>

              <div className="space-y-4">
                {filteredInvoices.map((inv) => {
                  const balance = inv.balanceDue !== undefined ? inv.balanceDue : ((inv.totalAmount || 0) - (inv.paidAmount || 0));
                  const items = Array.isArray(inv.items) ? inv.items : [];
                  const history = Array.isArray(inv.paymentHistory) ? inv.paymentHistory : [];

                  return (
                    <div key={inv.id} className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">#{inv.invoiceNumber}</span>
                            <span className="font-semibold text-xs text-slate-700">— {inv.clientName}</span>
                          </div>
                          {inv.projectTitle && <p className="text-xs text-slate-500">{inv.projectTitle}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Issue: <b>{formatIndonesianDate(inv.issueDate)}</b></span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            balance <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {balance <= 0 ? 'LUNAS' : 'SISA PIUTANG'}
                          </span>
                        </div>
                      </div>

                      {/* Itemized list */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                        <span className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px]">Rincian Item Invoice:</span>
                        <div className="space-y-1">
                          {items.map((it, iIdx) => (
                            <div key={iIdx} className="flex justify-between text-slate-700">
                              <span>• {it.description || (it as any).name} (x{it.quantity || 1})</span>
                              <span className="font-medium">{formatCurrency(it.amount || ((it.quantity || 1) * (it.unitPrice || 0)))}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payments Log */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs pt-1">
                        <div>
                          <span className="font-bold text-slate-700 text-[11px] block">Angsuran Pembayaran ({history.length}x):</span>
                          {history.map((h, hIdx) => (
                            <span key={hIdx} className="text-slate-600 text-[11px] mr-3">
                              [{formatIndonesianDate(h.date)}: <b>{formatCurrency(h.amount)}</b> via {h.method || 'Transfer'}]
                            </span>
                          ))}
                          {history.length === 0 && <span className="text-slate-400 italic text-[11px]">Belum ada angsuran.</span>}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-slate-500 text-[11px]">Total: {formatCurrency(inv.totalAmount)} | </span>
                          <span className="text-emerald-600 font-bold text-[11px]">Terbayar: {formatCurrency(inv.paidAmount)} | </span>
                          <span className="text-rose-600 font-black text-xs">Sisa: {formatCurrency(balance)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DEDICATED VIEW: CETAK PDF & MERGER MULTI-REPORT */}
          {activeReportView === 'pdf_merger' && (
            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-emerald-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-600" />
                    Pusat Cetak & Penggabungan Laporan PDF
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Pilih beberapa jenis laporan untuk digabungkan menjadi satu dokumen PDF siap cetak berukuran A4.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfOrientation(pdfOrientation === 'portrait' ? 'landscape' : 'portrait')}
                    className="px-3.5 py-2 bg-white text-slate-800 font-bold border border-slate-300 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Orientasi: <b>{pdfOrientation === 'portrait' ? 'Portrait' : 'Landscape'}</b></span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectPrintPDF}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak / Ekspor PDF sekarang</span>
                  </button>
                </div>
              </div>

              {/* Checkbox Multi-Report Selector */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Pilih Jenis Laporan yang Digabungkan:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'rekap_invoice', label: '1. Rekap Invoice' },
                    { id: 'laporan_pembayaran', label: '2. Laporan Pembayaran' },
                    { id: 'laporan_piutang', label: '3. Laporan Piutang' },
                    { id: 'rekap_pendapatan', label: '4. Rekap Pendapatan' },
                    { id: 'laporan_bulanan', label: '5. Laporan Bulanan' },
                    { id: 'laporan_klien', label: '6. Laporan Klien' },
                    { id: 'riwayat_transaksi', label: '7. Riwayat Transaksi Item' },
                  ].map(rep => (
                    <label 
                      key={rep.id}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        selectedReportsForPDF[rep.id] 
                          ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-bold' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedReportsForPDF[rep.id]}
                        onChange={(e) => setSelectedReportsForPDF(prev => ({ ...prev, [rep.id]: e.target.checked }))}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs">{rep.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Live In-App Document Preview Sheet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    Pratinjau Dokumen PDF (Live Preview)
                  </span>
                  <span className="text-xs text-slate-500">
                    Ukuran Kertas: <b>A4 ({pdfOrientation.toUpperCase()})</b>
                  </span>
                </div>

                <div className="bg-slate-100 p-4 sm:p-8 rounded-2xl border border-slate-300 overflow-x-auto flex justify-center">
                  <div 
                    className="bg-white text-slate-900 shadow-2xl p-6 sm:p-10 rounded-sm border border-slate-200"
                    style={{
                      width: pdfOrientation === 'portrait' ? '210mm' : '297mm',
                      minHeight: '297mm',
                      fontSize: '11px'
                    }}
                    dangerouslySetInnerHTML={{ __html: buildCombinedReportHTML() }}
                  />
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* MODAL: SINGLE TAB PDF PREVIEW MODAL */}
      {previewTabModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[200] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    Pratinjau PDF Laporan Keuangan
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Standar Kertas A4 — Siap Dicetak / Diunduh
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPdfOrientation(pdfOrientation === 'portrait' ? 'landscape' : 'portrait')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{pdfOrientation === 'portrait' ? 'Portrait' : 'Landscape'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTabModal(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable A4 Document Sheet */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/80 flex justify-center flex-1">
              <div 
                className="bg-white text-slate-900 shadow-xl p-6 sm:p-10 rounded-sm border border-slate-300 w-full"
                style={{
                  maxWidth: pdfOrientation === 'portrait' ? '210mm' : '297mm',
                  minHeight: '297mm',
                  fontSize: '11px'
                }}
                dangerouslySetInnerHTML={{ __html: buildCombinedReportHTML() }}
              />
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Laporan Keuangan Notaris & PPAT Putri
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTabModal(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={handleDirectPrintPDF}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Unduh PDF</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CATAT PEMBAYARAN INVOICE */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Catat Pembayaran Invoice</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Invoice #{paymentModalInvoice.invoiceNumber} — {paymentModalInvoice.clientName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Invoice Summary Banner */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Total Tagihan:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(paymentModalInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Sudah Terbayar:</span>
                  <span className="font-bold">{formatCurrency(paymentModalInvoice.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold pt-1.5 border-t border-slate-200">
                  <span>Sisa Tagihan (Sisa Piutang):</span>
                  <span className="text-sm font-black">{formatCurrency(paymentModalInvoice.balanceDue !== undefined ? paymentModalInvoice.balanceDue : ((paymentModalInvoice.totalAmount || 0) - (paymentModalInvoice.paidAmount || 0)))}</span>
                </div>
              </div>

              {/* Form Input: Tanggal Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tanggal Pembayaran
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Form Input: Jumlah Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nominal Dibayar (Rp)
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Masukkan nominal rupiah..."
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg outline-none focus:border-emerald-500 text-emerald-700"
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const remaining = paymentModalInvoice.balanceDue !== undefined ? paymentModalInvoice.balanceDue : ((paymentModalInvoice.totalAmount || 0) - (paymentModalInvoice.paidAmount || 0));
                      setPaymentAmount(remaining.toString());
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                  >
                    Pelunasan Penuh ({formatCurrency(paymentModalInvoice.balanceDue !== undefined ? paymentModalInvoice.balanceDue : ((paymentModalInvoice.totalAmount || 0) - (paymentModalInvoice.paidAmount || 0)))})
                  </button>
                </div>
              </div>

              {/* Form Input: Metode Pembayaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-medium bg-white"
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="Tunai / Cash">Tunai / Cash</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Cek / Giro">Cek / Giro</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Form Input: No. Referensi / Struk */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nomor Referensi / Bukti Transfer (Opsional)
                </label>
                <input
                  type="text"
                  value={paymentRefNumber}
                  onChange={(e) => setPaymentRefNumber(e.target.value)}
                  placeholder="Contoh: TRX-98812301"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Form Input: Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan Pembayaran (Opsional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Contoh: Titipan DP 50%, pelunasan sisanya minggu depan"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                disabled={isSubmittingPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmittingPayment ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Pembayaran</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default FinancialReport;
