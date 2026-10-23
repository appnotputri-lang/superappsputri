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
  Check
} from 'lucide-react';
import { Invoice, PaymentRecord } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import { useNavigate } from 'react-router-dom';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const FinancialReport: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Active Tab: 'overview' | 'unpaid' | 'paid' | 'monthly_matrix'
  const [activeTab, setActiveTab] = useState<'overview' | 'unpaid' | 'paid' | 'monthly_matrix'>('overview');

  // Sub view inside Unpaid & Paid tabs
  const [unpaidSubView, setUnpaidSubView] = useState<'all' | 'monthly'>('all');
  const [paidSubView, setPaidSubView] = useState<'all' | 'monthly' | 'history'>('all');

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '0' - '11'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // for unpaid view (e.g. ALL, UNPAID, OVERDUE)

  // Payment Modal State
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Transfer Bank');
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Monthly breakdown expansion state in Unpaid/Paid per month views
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

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

  // Format IDR Currency
  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // Helper date parsing
  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') return false;
    const balance = invoice.balanceDue !== undefined ? invoice.balanceDue : (invoice.totalAmount - (invoice.paidAmount || 0));
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
    return Math.floor(diffTime / (1000 * 3600 * 24));
  };

  // Filtered Invoices according to Year & Month & Search Query
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;

      // Year Filter
      if (selectedYear !== 'all') {
        const issueYr = inv.issueDate ? inv.issueDate.split('-')[0] : '';
        if (issueYr !== selectedYear) return false;
      }

      // Month Filter
      if (selectedMonth !== 'all') {
        if (!inv.issueDate) return false;
        const monthIndex = parseInt(inv.issueDate.split('-')[1], 10) - 1;
        if (monthIndex !== parseInt(selectedMonth, 10)) return false;
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
  }, [invoices, selectedYear, selectedMonth, searchQuery]);

  // Overall Financial Metrics
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

  // Unpaid Invoices List
  const unpaidInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => {
      const balance = inv.balanceDue !== undefined ? inv.balanceDue : (inv.totalAmount - (inv.paidAmount || 0));
      if (balance <= 0 || inv.status === 'PAID') return false;

      if (statusFilter === 'overdue') {
        return isOverdue(inv);
      }
      if (statusFilter === 'unpaid_only') {
        return (inv.paidAmount || 0) === 0;
      }
      if (statusFilter === 'partial_only') {
        return (inv.paidAmount || 0) > 0;
      }
      return true;
    });
  }, [filteredInvoices, statusFilter]);

  // Paid Invoices List
  const paidInvoices = useMemo(() => {
    return filteredInvoices.filter(inv => (inv.paidAmount || 0) > 0);
  }, [filteredInvoices]);

  // All Payment Records Log
  const allPaymentHistoryRecords = useMemo(() => {
    const list: Array<{
      record: PaymentRecord;
      invoice: Invoice;
    }> = [];

    filteredInvoices.forEach(inv => {
      if (Array.isArray(inv.paymentHistory)) {
        inv.paymentHistory.forEach(rec => {
          list.push({ record: rec, invoice: inv });
        });
      }
    });

    // Sort by payment date descending
    return list.sort((a, b) => new Date(b.record.date).getTime() - new Date(a.record.date).getTime());
  }, [filteredInvoices]);

  // Monthly Breakdown Matrix Data (12 months of selected year)
  const monthlyDataMatrix = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      return {
        monthIndex: i,
        monthName: MONTH_NAMES[i],
        invoiceCount: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        totalUnpaid: 0,
        invoices: [] as Invoice[],
        unpaidInvoices: [] as Invoice[],
        paidInvoices: [] as Invoice[]
      };
    });

    invoices.forEach(inv => {
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;
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

        if (balance > 0) {
          item.unpaidInvoices.push(inv);
        }
        if (paid > 0) {
          item.paidInvoices.push(inv);
        }
      }
    });

    return months;
  }, [invoices, selectedYear]);

  // Toggle Month Expansion
  const toggleMonthExpansion = (key: string) => {
    setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Open Payment Modal
  const openPaymentModal = (inv: Invoice) => {
    setPaymentModalInvoice(inv);
    const remaining = inv.balanceDue !== undefined ? inv.balanceDue : (inv.totalAmount - (inv.paidAmount || 0));
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

  // WhatsApp Reminder Link
  const getWhatsAppReminderUrl = (inv: Invoice) => {
    const phone = inv.clientPhone ? inv.clientPhone.replace(/[^0-9]/g, '') : '';
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
    const balance = inv.balanceDue !== undefined ? inv.balanceDue : (inv.totalAmount - (inv.paidAmount || 0));
    const msg = `Halo Bapak/Ibu ${inv.clientName},\n\nKami menginformasikan mengenai Invoice *#${inv.invoiceNumber}* sebesar *${formatCurrency(inv.totalAmount)}* dengan sisa tagihan *${formatCurrency(balance)}* yang jatuh tempo pada *${inv.dueDate || '-'}*.\n\nMohon konfirmasinya jika telah melakukan pembayaran. Terima kasih!\n\n_Salam, Notaris & PPAT_`;
    
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  // CSV Export Function
  const handleExportCSV = () => {
    let csv = 'No Invoice,Klien,Proyek,Tanggal Issue,Jatuh Tempo,Status,Total Tagihan,Sudah Dibayar,Sisa Piutang\n';
    
    filteredInvoices.forEach(inv => {
      const balance = inv.balanceDue !== undefined ? inv.balanceDue : (inv.totalAmount - (inv.paidAmount || 0));
      const statusStr = balance <= 0 ? 'LUNAS' : (inv.paidAmount || 0) > 0 ? 'SEBAGIAN' : 'BELUM DIBAYAR';
      const row = [
        `"${inv.invoiceNumber || ''}"`,
        `"${(inv.clientName || '').replace(/"/g, '""')}"`,
        `"${(inv.projectTitle || '').replace(/"/g, '""')}"`,
        `"${inv.issueDate || ''}"`,
        `"${inv.dueDate || ''}"`,
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

  // Print Report Window
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Keuangan Invoice - ${selectedYear}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
          .header p { margin: 4px 0 0 0; color: #64748b; font-size: 11px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .summary-card { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background: #f8fafc; }
          .summary-card .title { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; }
          .summary-card .value { font-size: 14px; font-weight: bold; margin-top: 4px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #1e293b; color: white; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; }
          td { border-bottom: 1px solid #e2e8f0; padding: 8px; }
          .text-right { text-align: right; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
          .badge-paid { background: #dcfce7; color: #15803d; }
          .badge-unpaid { background: #fee2e2; color: #b91c1c; }
          .badge-partial { background: #fef3c7; color: #b45309; }
          .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #64748b; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LAPORAN KEUANGAN INVOICE & PEMBAYARAN</h1>
          <p>Periode Tahun: ${selectedYear} ${selectedMonth !== 'all' ? '| Bulan: ' + MONTH_NAMES[parseInt(selectedMonth, 10)] : ''} | Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="title">Total Tagihan (Omset)</div>
            <div class="value">${formatCurrency(metrics.totalInvoiced)}</div>
          </div>
          <div class="summary-card">
            <div class="title">Sudah Dibayar</div>
            <div class="value" style="color: #16a34a;">${formatCurrency(metrics.totalPaid)}</div>
          </div>
          <div class="summary-card">
            <div class="title">Sisa Piutang (Belum Dibayar)</div>
            <div class="value" style="color: #dc2626;">${formatCurrency(metrics.totalUnpaid)}</div>
          </div>
          <div class="summary-card">
            <div class="title">Tingkat Pelunasan</div>
            <div class="value" style="color: #2563eb;">${metrics.collectionRate.toFixed(1)}%</div>
          </div>
        </div>

        <h3>Daftar Rincian Invoice</h3>
        <table>
          <thead>
            <tr>
              <th>No. Invoice</th>
              <th>Nama Klien</th>
              <th>Tgl Issue</th>
              <th>Jatuh Tempo</th>
              <th>Status</th>
              <th class="text-right">Total Tagihan</th>
              <th class="text-right">Sudah Dibayar</th>
              <th class="text-right">Sisa Piutang</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInvoices.map(inv => {
              const balance = inv.balanceDue !== undefined ? inv.balanceDue : (inv.totalAmount - (inv.paidAmount || 0));
              const isP = balance <= 0;
              const isPart = (inv.paidAmount || 0) > 0 && balance > 0;
              return `
                <tr>
                  <td><b>${inv.invoiceNumber}</b></td>
                  <td>${inv.clientName}</td>
                  <td>${inv.issueDate || '-'}</td>
                  <td>${inv.dueDate || '-'}</td>
                  <td>
                    <span class="badge ${isP ? 'badge-paid' : isPart ? 'badge-partial' : 'badge-unpaid'}">
                      ${isP ? 'LUNAS' : isPart ? 'SEBAGIAN' : 'BELUM BAYAR'}
                    </span>
                  </td>
                  <td class="text-right">${formatCurrency(inv.totalAmount)}</td>
                  <td class="text-right">${formatCurrency(inv.paidAmount)}</td>
                  <td class="text-right"><b>${formatCurrency(balance)}</b></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Laporan Keuangan Notaris & PPAT — Hak Cipta Dilindungi</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Memuat Laporan Keuangan...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Laporan Keuangan & Piutang
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Live Data
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi omset, tagihan belum dibayar, dan penerimaan pembayaran dari invoice.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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

          <button
            onClick={handlePrintReport}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
          </span>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Tahun</option>
            {availableYears.map(yr => (
              <option key={yr} value={yr}>Tahun {yr}</option>
            ))}
          </select>

          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">Semua Bulan</option>
            {MONTH_NAMES.map((mName, idx) => (
              <option key={idx} value={idx.toString()}>{mName}</option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari No. Invoice, Nama Klien, atau Proyek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI METRIC CARDS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Invoiced */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Omset Tagihan</span>
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

        {/* Total Paid */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Sudah Dibayar (Masuk)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(metrics.totalPaid)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">{metrics.paidCount} Invoice Lunas</span>
            <span className="text-emerald-600 font-semibold">({metrics.collectionRate.toFixed(0)}% Lunas)</span>
          </div>
        </div>

        {/* Total Unpaid / Balance Due */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/10 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Belum Dibayar (Piutang)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
            {formatCurrency(metrics.totalUnpaid)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">{metrics.unpaidCount + metrics.partialCount} Invoice Belum Lunas</span>
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
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">{metrics.overdueCount} Invoice Terlambat</span>
          </div>
        </div>

      </div>

      {/* MAIN CONTENT TABS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs Header */}
        <div className="border-b border-slate-200/80 bg-slate-50/50 p-2 sm:p-3 flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Ikhtisar Keuangan</span>
          </button>

          <button
            onClick={() => setActiveTab('unpaid')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'unpaid'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4 text-rose-500" />
            <span>Belum Dibayar ({unpaidInvoices.length})</span>
            {metrics.totalUnpaid > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-200 text-rose-900 font-extrabold">
                {formatCurrency(metrics.totalUnpaid)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('paid')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'paid'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Sudah Dibayar ({paidInvoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('monthly_matrix')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'monthly_matrix'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Perbulan Matrix</span>
          </button>
        </div>

        {/* TAB 1: IKHTISAR KEUANGAN (OVERVIEW) */}
        {activeTab === 'overview' && (
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* Visual Progress Bar of Paid vs Unpaid */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Progres Realisasi Pembayaran Invoice</span>
                <span>{formatCurrency(metrics.totalPaid)} dari {formatCurrency(metrics.totalInvoiced)} ({metrics.collectionRate.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.collectionRate)}%` }}
                  title={`Terbayar: ${formatCurrency(metrics.totalPaid)}`}
                />
                <div 
                  className="bg-rose-400 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, 100 - metrics.collectionRate)}%` }}
                  title={`Sisa Piutang: ${formatCurrency(metrics.totalUnpaid)}`}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Lunas / Terbayar: <b>{formatCurrency(metrics.totalPaid)}</b>
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
                <span className="text-xs text-slate-500">
                  Ringkasan tagihan & pembayaran per bulan
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Bulan</th>
                      <th className="p-3 text-center">Jumlah Invoice</th>
                      <th className="p-3 text-right">Total Tagihan</th>
                      <th className="p-3 text-right">Sudah Dibayar</th>
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
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td className="p-3">TOTAL KESELURUHAN</td>
                      <td className="p-3 text-center">{metrics.totalCount}</td>
                      <td className="p-3 text-right">{formatCurrency(metrics.totalInvoiced)}</td>
                      <td className="p-3 text-right text-emerald-700">{formatCurrency(metrics.totalPaid)}</td>
                      <td className="p-3 text-right text-rose-700">{formatCurrency(metrics.totalUnpaid)}</td>
                      <td className="p-3 text-center text-blue-700">{metrics.collectionRate.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: LAPORAN BELUM DIBAYAR (UNPAID INVOICES) */}
        {activeTab === 'unpaid' && (
          <div className="p-4 sm:p-6 space-y-5">
            
            {/* Sub View Toggle & Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUnpaidSubView('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    unpaidSubView === 'all'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  Semua Invoice Belum Dibayar ({unpaidInvoices.length})
                </button>
                <button
                  onClick={() => setUnpaidSubView('monthly')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    unpaidSubView === 'monthly'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  Per Bulan
                </button>
              </div>

              {/* Status sub filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold bg-white border border-rose-200 rounded-lg px-3 py-1.5 text-rose-900 outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="all">Semua Belum Lunas</option>
                <option value="overdue">Hanya Terlambat Jatuh Tempo</option>
                <option value="unpaid_only">Belum Ada Pembayaran sama sekali</option>
                <option value="partial_only">Sudah Dicuil (Sebagian)</option>
              </select>
            </div>

            {/* UNPAID SUBVIEW 1: ALL UNPAID TABLE */}
            {unpaidSubView === 'all' && (
              <div>
                {unpaidInvoices.length === 0 ? (
                  <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-200 text-emerald-800 space-y-2">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
                    <h4 className="font-bold text-sm">Tidak Ada Invoice Belum Dibayar!</h4>
                    <p className="text-xs text-emerald-700">Semua tagihan untuk filter yang dipilih telah lunas terbayar.</p>
                  </div>
                ) : (
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
                          <th className="p-3 text-center">Status Aging</th>
                          <th className="p-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {unpaidInvoices.map((inv) => {
                          const balance = inv.balanceDue !== undefined ? inv.balanceDue : (inv.totalAmount - (inv.paidAmount || 0));
                          const overdue = isOverdue(inv);
                          const agingDays = getAgingDays(inv.dueDate);

                          return (
                            <tr key={inv.id} className="hover:bg-rose-50/30 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                                <div className="text-slate-600 font-semibold">{inv.clientName}</div>
                                {inv.projectTitle && (
                                  <div className="text-[10px] text-slate-400 italic">{inv.projectTitle}</div>
                                )}
                              </td>
                              <td className="p-3 text-slate-600 font-medium">{inv.issueDate || '-'}</td>
                              <td className="p-3 font-medium">
                                <div className={overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                  {inv.dueDate || '-'}
                                </div>
                              </td>
                              <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(inv.totalAmount)}</td>
                              <td className="p-3 text-right font-semibold text-emerald-600">{formatCurrency(inv.paidAmount)}</td>
                              <td className="p-3 text-right font-black text-rose-600 text-sm">
                                {formatCurrency(balance)}
                              </td>
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
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => openPaymentModal(inv)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                    title="Catat Pembayaran"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Bayar</span>
                                  </button>

                                  {inv.clientPhone && (
                                    <a
                                      href={getWhatsAppReminderUrl(inv)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors border border-emerald-200"
                                      title="Kirim WA Pengingat Pembayaran"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* UNPAID SUBVIEW 2: PER BULAN */}
            {unpaidSubView === 'monthly' && (
              <div className="space-y-4">
                {monthlyDataMatrix.map((m) => {
                  if (m.unpaidInvoices.length === 0) return null;
                  const isExp = expandedMonths[`unpaid_${m.monthIndex}`];

                  return (
                    <div key={m.monthIndex} className="bg-white rounded-xl border border-rose-200 shadow-xs overflow-hidden">
                      <div 
                        onClick={() => toggleMonthExpansion(`unpaid_${m.monthIndex}`)}
                        className="p-4 bg-rose-50/40 hover:bg-rose-50/80 cursor-pointer flex items-center justify-between transition-colors select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-extrabold text-xs">
                            {m.monthIndex + 1}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">{m.monthName}</h4>
                            <p className="text-xs text-rose-700 font-semibold">
                              {m.unpaidInvoices.length} Invoice Belum Lunas | Sisa Piutang: <b>{formatCurrency(m.totalUnpaid)}</b>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-rose-600 bg-white px-2.5 py-1 rounded-md border border-rose-200">
                            {formatCurrency(m.totalUnpaid)}
                          </span>
                          {isExp ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>

                      {/* Expanded Item List */}
                      {isExp && (
                        <div className="p-4 border-t border-rose-100 bg-white">
                          <div className="space-y-2">
                            {m.unpaidInvoices.map((inv) => {
                              const balance = inv.balanceDue !== undefined ? inv.balanceDue : (inv.totalAmount - (inv.paidAmount || 0));
                              return (
                                <div key={inv.id} className="p-3 rounded-lg border border-slate-200/80 hover:border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 text-xs">{inv.invoiceNumber}</span>
                                      <span className="text-xs text-slate-600 font-semibold">{inv.clientName}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      Jatuh Tempo: <b>{inv.dueDate || '-'}</b> | Total: {formatCurrency(inv.totalAmount)} | Terbayar: {formatCurrency(inv.paidAmount)}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 self-end sm:self-auto">
                                    <div className="text-right">
                                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Sisa Tagihan</span>
                                      <span className="text-xs font-black text-rose-600">{formatCurrency(balance)}</span>
                                    </div>

                                    <button
                                      onClick={() => openPaymentModal(inv)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" />
                                      <span>Bayar</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {monthlyDataMatrix.every(m => m.unpaidInvoices.length === 0) && (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    Tidak ada tunggakan invoice per bulan pada filter tahun ini.
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* TAB 3: LAPORAN SUDAH DIBAYAR (PAID INVOICES & PAYMENTS) */}
        {activeTab === 'paid' && (
          <div className="p-4 sm:p-6 space-y-5">
            
            {/* Sub View Toggle */}
            <div className="flex items-center gap-2 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 overflow-x-auto">
              <button
                onClick={() => setPaidSubView('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paidSubView === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Semua Invoice Lunas ({paidInvoices.length})
              </button>
              <button
                onClick={() => setPaidSubView('monthly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paidSubView === 'monthly'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Per Bulan
              </button>
              <button
                onClick={() => setPaidSubView('history')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paidSubView === 'history'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Log Transaksi Pembayaran ({allPaymentHistoryRecords.length})
              </button>
            </div>

            {/* PAID SUBVIEW 1: ALL PAID INVOICES */}
            {paidSubView === 'all' && (
              <div>
                {paidInvoices.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                    Belum ada invoice yang telah dilunasi untuk filter ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">No. Invoice & Klien</th>
                          <th className="p-3">Tanggal Issue</th>
                          <th className="p-3 text-right">Total Tagihan</th>
                          <th className="p-3 text-right">Sudah Dibayar</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Jumlah Angsuran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {paidInvoices.map((inv) => {
                          const historyCount = inv.paymentHistory?.length || 0;
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                                <div className="text-slate-600 font-semibold">{inv.clientName}</div>
                              </td>
                              <td className="p-3 text-slate-600 font-medium">{inv.issueDate || '-'}</td>
                              <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(inv.totalAmount)}</td>
                              <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(inv.paidAmount)}</td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  LUNAS
                                </span>
                              </td>
                              <td className="p-3 text-center text-slate-600 font-semibold">
                                {historyCount}x Pembayaran
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* PAID SUBVIEW 2: PER BULAN */}
            {paidSubView === 'monthly' && (
              <div className="space-y-4">
                {monthlyDataMatrix.map((m) => {
                  if (m.paidInvoices.length === 0) return null;
                  const isExp = expandedMonths[`paid_${m.monthIndex}`];

                  return (
                    <div key={m.monthIndex} className="bg-white rounded-xl border border-emerald-200 shadow-xs overflow-hidden">
                      <div 
                        onClick={() => toggleMonthExpansion(`paid_${m.monthIndex}`)}
                        className="p-4 bg-emerald-50/40 hover:bg-emerald-50/80 cursor-pointer flex items-center justify-between transition-colors select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-xs">
                            {m.monthIndex + 1}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">{m.monthName}</h4>
                            <p className="text-xs text-emerald-700 font-semibold">
                              {m.paidInvoices.length} Invoice Masuk | Total Diterima: <b>{formatCurrency(m.totalPaid)}</b>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-md border border-emerald-200">
                            {formatCurrency(m.totalPaid)}
                          </span>
                          {isExp ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>

                      {/* Expanded list */}
                      {isExp && (
                        <div className="p-4 border-t border-emerald-100 bg-white">
                          <div className="space-y-2">
                            {m.paidInvoices.map((inv) => (
                              <div key={inv.id} className="p-3 rounded-lg border border-slate-200/80 hover:border-emerald-300 flex items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs">{inv.invoiceNumber}</span>
                                    <span className="text-xs text-slate-600 font-semibold">{inv.clientName}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Issue: {inv.issueDate} | Total: {formatCurrency(inv.totalAmount)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Terbayar</span>
                                  <span className="text-xs font-bold text-emerald-600">{formatCurrency(inv.paidAmount)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {monthlyDataMatrix.every(m => m.paidInvoices.length === 0) && (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    Belum ada realisasi pembayaran masuk per bulan pada filter ini.
                  </div>
                )}
              </div>
            )}

            {/* PAID SUBVIEW 3: PAYMENT HISTORY LOG */}
            {paidSubView === 'history' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Tanggal Bayar</th>
                      <th className="p-3">No. Invoice & Klien</th>
                      <th className="p-3">Metode Pembayaran</th>
                      <th className="p-3">No. Referensi</th>
                      <th className="p-3">Catatan</th>
                      <th className="p-3 text-right">Jumlah Dibayar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {allPaymentHistoryRecords.map((item, idx) => (
                      <tr key={item.record.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">{item.record.date}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.invoice.invoiceNumber}</div>
                          <div className="text-slate-600">{item.invoice.clientName}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
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
                    {allPaymentHistoryRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          Belum ada riwayat angsuran / transaksi pembayaran tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* TAB 4: PERBANDINGAN & MATRIX BULANAN */}
        {activeTab === 'monthly_matrix' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Matriks Perbandingan Per Bulan ({selectedYear === 'all' ? 'Semua Tahun' : selectedYear})
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Bulan</th>
                    <th className="p-3 text-center">Inv Count</th>
                    <th className="p-3 text-right">Tagihan Kotor</th>
                    <th className="p-3 text-right">Terbayar (Masuk)</th>
                    <th className="p-3 text-right">Sisa Piutang</th>
                    <th className="p-3 text-center">Rasio Lunas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {monthlyDataMatrix.map((m) => {
                    const rate = m.totalInvoiced > 0 ? (m.totalPaid / m.totalInvoiced) * 100 : 0;
                    return (
                      <tr key={m.monthIndex} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{m.monthName}</td>
                        <td className="p-3 text-center font-semibold text-slate-600">{m.invoiceCount}</td>
                        <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(m.totalInvoiced)}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(m.totalPaid)}</td>
                        <td className="p-3 text-right font-bold text-rose-600">
                          {m.totalUnpaid > 0 ? formatCurrency(m.totalUnpaid) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rate >= 100 ? 'bg-emerald-100 text-emerald-800' : rate > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {rate.toFixed(0)}%
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

      </div>

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
                  <span className="text-sm font-black">{formatCurrency(paymentModalInvoice.balanceDue !== undefined ? paymentModalInvoice.balanceDue : (paymentModalInvoice.totalAmount - (paymentModalInvoice.paidAmount || 0)))}</span>
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
                      const remaining = paymentModalInvoice.balanceDue !== undefined ? paymentModalInvoice.balanceDue : (paymentModalInvoice.totalAmount - (paymentModalInvoice.paidAmount || 0));
                      setPaymentAmount(remaining.toString());
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                  >
                    Pelunasan Penuh ({formatCurrency(paymentModalInvoice.balanceDue !== undefined ? paymentModalInvoice.balanceDue : (paymentModalInvoice.totalAmount - (paymentModalInvoice.paidAmount || 0)))})
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
