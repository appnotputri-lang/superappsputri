import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, PaymentRecord } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { CompanyService } from '../../services/CompanyService';
import { SuperappsClientService } from '../../services/superappsClientService';
import { calculateInvoiceTotals } from '../../services/taxCalculator';
import { formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import {
  Plus, Edit2, Trash2, Printer, Search, X, Copy, ExternalLink,
  Check, CreditCard, DollarSign, Globe, CheckCircle2, AlertCircle, FileText, Share2,
  Building2, Database, ArrowLeft, Download, Send, MessageSquare, ChevronRight, UserPlus
} from 'lucide-react';

interface ClientOption {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  source: 'local' | 'superapps';
  clientType?: string;
}

const PRESET_PRODUCTS = [
  '-- Manual --',
  'AKTA PERUBAHAN PT SK',
  'Jasa Pembuatan Akta Notaris',
  'Pendirian PT / CV',
  'Draft Notulen Sirkuler',
  'Akta RUPSLB',
  'Surat Keputusan (SK) AHU',
  'Surat Pelaporan AHU',
  'BNRI (Berita Negara RI)',
  'Akta Hibah Saham',
  'Legalisasi & Waarmerking',
  'Sewa Ruangan Kantor'
];

export const InvoiceGenerator: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'list' | 'create' | 'edit' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Form Fields
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientSource, setSelectedClientSource] = useState<'local' | 'superapps' | undefined>(undefined);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'UNPAID' | 'PAID' | 'DRAFT' | 'CANCELLED'>('UNPAID');
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [currency, setCurrency] = useState('IDR');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Pembayaran dilakukan maksimal 14 hari setelah invoice diterbitkan.');

  // Items Form
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Jasa Pembuatan Akta Notaris', quantity: 1, unitPrice: 5000000, amount: 5000000, isTaxed: false }
  ]);

  // Add Item Temp Inputs
  const [selectedPresetProduct, setSelectedPresetProduct] = useState('-- Manual --');
  const [itemDescription, setItemDescription] = useState('');
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);
  const [itemGrossUp, setItemGrossUp] = useState(false);

  // Bank details
  const [bankName, setBankName] = useState('Bank Mandiri');
  const [accountNumber, setAccountNumber] = useState('123-00-0987654-3');
  const [accountHolder, setAccountHolder] = useState('Notaris & PPAT Putri');

  // Client Master Selection State
  const [clientSourceTab, setClientSourceTab] = useState<'all' | 'local' | 'superapps'>('all');
  const [localClients, setLocalClients] = useState<ClientOption[]>([]);
  const [superappsClients, setSuperappsClients] = useState<ClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [superappsError, setSuperappsError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // New Client Quick Modal
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientNameInput, setNewClientNameInput] = useState('');
  const [newClientEmailInput, setNewClientEmailInput] = useState('');
  const [newClientPhoneInput, setNewClientPhoneInput] = useState('');
  const [newClientAddressInput, setNewClientAddressInput] = useState('');

  // Payment Form in Detail Page
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<string>('Transfer BCA');
  const [payRefNumber, setPayRefNumber] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = InvoiceService.subscribeInvoices((data) => {
      setInvoices(data);
      // Keep selectedInvoice synced if viewing detail
      if (selectedInvoice) {
        const updated = data.find(i => i.id === selectedInvoice.id);
        if (updated) {
          setSelectedInvoice(updated);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [selectedInvoice?.id]);

  const loadClientOptions = async () => {
    setIsLoadingClients(true);
    setSuperappsError(null);

    // 1. Fetch Local Clients
    try {
      const [ptList, cvList] = await Promise.all([
        CompanyService.getCompanies().catch(() => []),
        CompanyService.getCvCompanies().catch(() => [])
      ]);

      const allLocal: ClientOption[] = [...ptList, ...cvList].map(c => {
        let fullAddr = '';
        if (c.fullAddress) {
          fullAddr = c.fullAddress;
        } else if (c.address) {
          fullAddr = typeof c.address === 'string' ? c.address : c.address.fullAddress || '';
        }

        return {
          clientId: c.id,
          name: c.companyName || 'Tanpa Nama',
          email: c.email || '',
          phone: c.phoneNumber || '',
          address: fullAddr,
          source: 'local',
          clientType: c.clientType || 'PT'
        };
      });
      setLocalClients(allLocal);
    } catch (err) {
      console.error('Error fetching local clients:', err);
    }

    // 2. Fetch Superapps Clients
    try {
      const spProfiles = await SuperappsClientService.getSuperappsProfiles();
      const mappedSp: ClientOption[] = spProfiles.map(p => ({
        clientId: p.clientId,
        name: p.name,
        email: p.email,
        phone: p.contactNumber,
        address: p.address,
        source: 'superapps',
        clientType: p.clientType || 'PT'
      }));
      setSuperappsClients(mappedSp);
    } catch (err) {
      console.warn('Gagal koneksi ke Superapps Firestore:', err);
      setSuperappsError('Data klien superapps tidak tersedia');
      setSuperappsClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  const calculateTotals = (currentItems: InvoiceItem[]) => {
    const summary = calculateInvoiceTotals(currentItems);
    return {
      sub: summary.honorarium,
      tax: summary.pphGrossUp,
      total: summary.totalTagihan
    };
  };

  const handleAddItemFromInput = () => {
    if (!itemUnitPrice && !itemDescription && selectedPresetProduct === '-- Manual --') return;

    const desc = selectedPresetProduct !== '-- Manual --'
      ? (itemDescription ? `${selectedPresetProduct}\n${itemDescription}` : selectedPresetProduct)
      : itemDescription || 'Item Tagihan Baru';

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: desc,
      quantity: 1,
      unitPrice: itemUnitPrice || 0,
      amount: itemUnitPrice || 0,
      isTaxed: itemGrossUp
    };

    setItems(prev => [...prev, newItem]);
    setItemDescription('');
    setItemUnitPrice(0);
    setItemGrossUp(false);
    setSelectedPresetProduct('-- Manual --');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    item.amount = (item.quantity || 1) * (item.unitPrice || 0);
    updated[index] = item;
    setItems(updated);
  };

  const openCreatePage = () => {
    setEditingInvoiceId(null);
    const nextNum = (invoices.length + 1).toString().padStart(3, '0');
    const generatedNum = `INV/${new Date().getFullYear()}/${nextNum}`;
    
    // Auto due date + 3 days
    const today = new Date();
    const due = new Date();
    due.setDate(today.getDate() + 3);

    setInvoiceNumber(generatedNum);
    setClientName('');
    setSelectedClientId('');
    setSelectedClientSource(undefined);
    setClientEmail('');
    setClientPhone('');
    setClientAddress('');
    setClientSearch('');
    setIssueDate(today.toISOString().split('T')[0]);
    setDueDate(due.toISOString().split('T')[0]);
    setStatus('UNPAID');
    setLanguage('id');
    setCurrency('IDR');
    setNotes('');
    setTerms('Pembayaran dilakukan maksimal 14 hari setelah invoice diterbitkan.');
    setItems([]);
    setItemDescription('');
    setItemUnitPrice(0);
    setItemGrossUp(false);
    setSelectedPresetProduct('-- Manual --');
    setBankName('Bank Mandiri');
    setAccountNumber('123-00-0987654-3');
    setAccountHolder('Notaris & PPAT Putri');
    loadClientOptions();
    setViewMode('create');
  };

  const openEditPage = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setSelectedInvoice(inv);
    setInvoiceNumber(inv.invoiceNumber || '');
    setClientName(inv.clientName || '');
    setSelectedClientId(inv.clientId || '');
    setSelectedClientSource(inv.clientSource);
    setClientEmail(inv.clientEmail || '');
    setClientPhone(inv.clientPhone || '');
    setClientAddress(inv.clientAddress || '');
    setClientSearch('');
    setIssueDate(inv.issueDate || '');
    setDueDate(inv.dueDate || '');
    setStatus(inv.status || 'UNPAID');
    setLanguage(inv.language || 'id');
    setCurrency(inv.currency || 'IDR');
    setNotes(inv.notes || '');
    setTerms(inv.terms || '');
    setItems(inv.items && inv.items.length > 0 ? inv.items : []);
    setItemDescription('');
    setItemUnitPrice(0);
    setItemGrossUp(false);
    setSelectedPresetProduct('-- Manual --');
    if (inv.bankDetails) {
      setBankName(inv.bankDetails.bankName || 'Bank Mandiri');
      setAccountNumber(inv.bankDetails.accountNumber || '');
      setAccountHolder(inv.bankDetails.accountHolder || '');
    }
    loadClientOptions();
    setViewMode('edit');
  };

  const openDetailPage = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.balanceDue ?? inv.totalAmount);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('Transfer BCA');
    const payCount = (inv.paymentHistory?.length || 0) + 1;
    const refNum = `KWT/${payCount.toString().padStart(3, '0')}/VIII/${new Date().getFullYear()}`;
    setPayRefNumber(refNum);
    setPayNotes('');
    setViewMode('detail');
  };

  const handleSaveInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!invoiceNumber || !clientName) {
      alert('Mohon isi Nomor Invoice dan Nama Klien.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { sub, tax, total } = calculateTotals(items);
      const existingPaid = selectedInvoice && editingInvoiceId === selectedInvoice.id ? selectedInvoice.paidAmount || 0 : 0;
      const balance = Math.max(0, total - existingPaid);

      const payload: Omit<Invoice, 'id'> = {
        invoiceNumber,
        clientName,
        clientId: selectedClientId || undefined,
        clientSource: selectedClientSource || undefined,
        clientEmail,
        clientPhone,
        clientAddress,
        issueDate,
        dueDate,
        status: balance <= 0 && total > 0 ? 'PAID' : status,
        items,
        subtotal: sub,
        taxAmount: tax,
        totalAmount: total,
        paidAmount: existingPaid,
        balanceDue: balance,
        currency,
        language,
        notes,
        terms,
        bankDetails: {
          bankName,
          accountNumber,
          accountHolder
        },
        paymentHistory: selectedInvoice && editingInvoiceId === selectedInvoice.id ? selectedInvoice.paymentHistory || [] : []
      };

      let targetId = editingInvoiceId;
      if (editingInvoiceId) {
        await InvoiceService.updateInvoice(editingInvoiceId, payload);
      } else {
        targetId = await InvoiceService.addInvoice(payload);
      }

      // Switch to detail view of saved invoice
      const savedInvoice: Invoice = {
        ...payload,
        id: targetId || `inv_${Date.now()}`
      };
      setSelectedInvoice(savedInvoice);
      setPayAmount(savedInvoice.balanceDue);
      setViewMode('detail');
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert('Gagal menyimpan invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus invoice ini?')) {
      try {
        await InvoiceService.deleteInvoice(id);
        if (selectedInvoice?.id === id) {
          setSelectedInvoice(null);
          setViewMode('list');
        }
      } catch (err) {
        console.error('Error deleting invoice:', err);
        alert('Gagal menghapus invoice.');
      }
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || payAmount <= 0) {
      alert('Nominal pembayaran harus lebih dari 0.');
      return;
    }

    setIsSavingPayment(true);
    try {
      await InvoiceService.addPayment(selectedInvoice.id, selectedInvoice, {
        date: payDate || new Date().toISOString().split('T')[0],
        amount: payAmount,
        method: payMethod,
        notes: `${payRefNumber ? 'Ref: ' + payRefNumber + ' - ' : ''}${payNotes}`.trim(),
        recordedBy: 'Staff Kantor'
      });

      // Update local selected state balance
      const newPaid = (selectedInvoice.paidAmount || 0) + payAmount;
      const newBalance = Math.max(0, selectedInvoice.totalAmount - newPaid);
      const updatedInv: Invoice = {
        ...selectedInvoice,
        paidAmount: newPaid,
        balanceDue: newBalance,
        status: newBalance <= 0 ? 'PAID' : 'UNPAID',
        paymentHistory: [
          ...(selectedInvoice.paymentHistory || []),
          {
            id: `pay_${Date.now()}`,
            date: payDate,
            amount: payAmount,
            method: payMethod,
            notes: payRefNumber ? `Ref: ${payRefNumber} ${payNotes}` : payNotes
          }
        ]
      };
      setSelectedInvoice(updatedInv);
      setPayAmount(newBalance);
      const nextPayCount = (updatedInv.paymentHistory?.length || 0) + 1;
      setPayRefNumber(`KWT/${nextPayCount.toString().padStart(3, '0')}/VIII/${new Date().getFullYear()}`);
      setPayNotes('');
    } catch (err) {
      console.error('Error adding payment:', err);
      alert('Gagal mencatat pembayaran.');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleCreateQuickLocalClient = () => {
    if (!newClientNameInput) {
      alert('Mohon isi nama klien.');
      return;
    }
    const newOpt: ClientOption = {
      clientId: `loc_${Date.now()}`,
      name: newClientNameInput,
      email: newClientEmailInput,
      phone: newClientPhoneInput,
      address: newClientAddressInput,
      source: 'local'
    };
    setLocalClients(prev => [newOpt, ...prev]);
    setSelectedClientId(newOpt.clientId);
    setSelectedClientSource('local');
    setClientName(newOpt.name);
    setClientEmail(newOpt.email);
    setClientPhone(newOpt.phone);
    setClientAddress(newOpt.address);
    setIsNewClientModalOpen(false);
    setNewClientNameInput('');
    setNewClientEmailInput('');
    setNewClientPhoneInput('');
    setNewClientAddressInput('');
  };

  const copyPublicLink = (inv: Invoice) => {
    const token = inv.publicToken || inv.id;
    const fullUrl = `${window.location.origin}${window.location.pathname}#/invoice/public?token=${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(inv.id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleShareWhatsApp = (inv: Invoice) => {
    const token = inv.publicToken || inv.id;
    const publicUrl = `${window.location.origin}${window.location.pathname}#/invoice/public?token=${token}`;
    const text = `Yth. Bapak/Ibu ${inv.clientName},\nBerikut adalah rincian Invoice Tagihan Nomor ${inv.invoiceNumber} sebesar Rp ${formatCurrency(inv.totalAmount)}.\n\nDetail tagihan dapat dilihat pada tautan berikut:\n${publicUrl}\n\nTerima kasih.`;
    const waUrl = `https://wa.me/${inv.clientPhone ? inv.clientPhone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Filtered invoices for list view
  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const allClientsList = [...superappsClients, ...localClients].filter(c => {
    if (clientSourceTab === 'local') return c.source === 'local';
    if (clientSourceTab === 'superapps') return c.source === 'superapps';
    return true;
  });

  const filteredClientOptions = allClientsList.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.address.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const { sub: currentSub, tax: currentTax, total: currentTotal } = calculateTotals(items);

  // =========================================================================
  // RENDER 1: LIST VIEW ("Invoice Penagihan")
  // =========================================================================
  if (viewMode === 'list') {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Invoice Penagihan</h1>
            <p className="text-xs text-slate-500 mt-0.5">Kelola dan lihat rincian tagihan klien</p>
          </div>

          <button
            onClick={openCreatePage}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} />
            Buat Invoice
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor atau nama klien..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', 'UNPAID', 'PAID', 'DRAFT', 'CANCELLED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice List Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 font-bold">
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">No. Invoice</th>
                  <th className="p-3.5">Klien</th>
                  <th className="p-3.5 text-right">Total</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      <div className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs">Memuat data invoice...</p>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 italic">
                      Belum ada data invoice. Klik tombol "+ Buat Invoice" di atas untuk membuat invoice baru.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isUnpaid = inv.status === 'UNPAID';
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => openDetailPage(inv)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="p-3.5 text-slate-600 font-medium whitespace-nowrap">
                          {formatDateIndo(inv.issueDate)}
                        </td>
                        <td className="p-3.5 font-bold text-blue-600 group-hover:underline whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {inv.clientName}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                              isUnpaid
                                ? 'bg-red-100/80 text-red-600'
                                : 'bg-emerald-100/80 text-emerald-700'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 2: DETAIL / PREVIEW VIEW ("Detil Tagihan INV/2026/138")
  // =========================================================================
  if (viewMode === 'detail' && selectedInvoice) {
    const inv = selectedInvoice;
    const isUnpaid = inv.status === 'UNPAID';

    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 print:p-0 print:max-w-none">
        {/* Top Navigation & Action Header (Hidden during browser print) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft size={16} /> Kembali
            </button>
            <h1 className="text-lg font-bold text-slate-900">
              Detil Tagihan {inv.invoiceNumber}
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleShareWhatsApp(inv)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Send size={14} /> Kirim Tagihan
            </button>

            <button
              onClick={() => copyPublicLink(inv)}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedToken === inv.id ? <Check size={14} className="text-emerald-600" /> : <Download size={14} />}
              {copiedToken === inv.id ? 'Tersalin!' : 'Download'}
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Printer size={14} /> Print
            </button>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                onClick={() => setLanguage('id')}
                className={`px-2 py-1 rounded ${language === 'id' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
              >
                ID
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded ${language === 'en' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
              >
                EN
              </button>
            </div>

            <button
              onClick={() => openEditPage(inv)}
              className="px-3 py-2 bg-white border border-slate-200 hover:bg-blue-50 text-blue-600 hover:border-blue-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Edit2 size={14} /> Edit
            </button>

            <button
              onClick={() => handleDeleteInvoice(inv.id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition-all cursor-pointer"
              title="Hapus Invoice"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Main Content Layout (2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Invoice Document Preview (7 Cols on desktop) */}
          <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Payment Status Header Banner */}
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wide ${isUnpaid ? 'text-red-500' : 'text-emerald-600'}`}>
                {isUnpaid ? 'Belum Dibayar' : 'Lunas'}
              </span>
            </div>

            {/* Client & Invoice Meta Grid */}
            <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-100 pb-6">
              <div>
                <p className="text-slate-400 mb-1">Pelanggan</p>
                <p className="font-bold text-slate-900 text-sm">{inv.clientName}</p>
                {inv.clientAddress && <p className="text-slate-500 mt-1">{inv.clientAddress}</p>}
                {inv.clientEmail && <p className="text-slate-500">{inv.clientEmail}</p>}
                {inv.clientPhone && <p className="text-slate-500">{inv.clientPhone}</p>}
              </div>

              <div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-slate-400 mb-0.5">Nomor</p>
                    <p className="font-bold text-slate-900">{inv.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-0.5">Tgl. Transaksi</p>
                    <p className="font-semibold text-slate-800">{formatDateIndo(inv.issueDate)}</p>
                  </div>
                  <div className="col-span-2 pt-2">
                    <p className="text-slate-400 mb-0.5">Tgl. Jatuh Tempo</p>
                    <p className="font-semibold text-slate-800">{formatDateIndo(inv.dueDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Items Table */}
            <div className="space-y-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-500 font-bold">
                    <th className="py-2.5 pr-4">Produk</th>
                    <th className="py-2.5 pl-4 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inv.items && inv.items.length > 0 ? (
                    inv.items.map((it, idx) => {
                      const descLines = it.description.split('\n');
                      const title = descLines[0];
                      const subLines = descLines.slice(1);

                      return (
                        <tr key={it.id || idx}>
                          <td className="py-4 pr-4 align-top">
                            <p className="font-bold text-slate-900 uppercase">{title}</p>
                            {subLines.length > 0 && (
                              <div className="mt-1 space-y-0.5 text-slate-600 text-[11px] pl-1">
                                {subLines.map((line, lIdx) => (
                                  <p key={lIdx}>{line}</p>
                                ))}
                              </div>
                            )}
                            {it.isTaxed && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-semibold border border-blue-200">
                                Gross Up PPh 21
                              </span>
                            )}
                          </td>
                          <td className="py-4 pl-4 text-right font-bold text-slate-900 align-top whitespace-nowrap">
                            {formatCurrency(it.amount || ((it.quantity || 1) * (it.unitPrice || 0)))}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-4 text-center text-slate-400 italic">
                        Tidak ada item tagihan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Honorarium</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(inv.subtotal || inv.totalAmount)}</span>
                </div>

                {inv.taxAmount && inv.taxAmount > 0 ? (
                  <div className="flex justify-between text-blue-600">
                    <span>PPh 21 (Gross Up)</span>
                    <span className="font-semibold">+ {formatCurrency(inv.taxAmount)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-bold">
                  <span className="text-slate-900">Total Tagihan</span>
                  <span className="text-slate-900">{formatCurrency(inv.totalAmount)}</span>
                </div>

                <div className="flex justify-between pt-1 text-sm font-bold">
                  <span className="text-slate-900">Sisa Tagihan</span>
                  <span className="text-slate-900">{formatCurrency(inv.balanceDue ?? inv.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Bank Details & Terms Footer */}
            {inv.bankDetails && (
              <div className="pt-6 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Metode Pembayaran Transfer:</p>
                <p>{inv.bankDetails.bankName} - No. Rek: <span className="font-bold">{inv.bankDetails.accountNumber}</span> a.n {inv.bankDetails.accountHolder}</p>
              </div>
            )}
          </div>

          {/* Right Column: Payment Recording & History (4 Cols on desktop, hidden in print) */}
          <div className="lg:col-span-4 space-y-6 print:hidden">
            {/* Form: Terima Pembayaran */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-600" />
                Terima Pembayaran
              </h3>

              <form onSubmit={handleAddPayment} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    TOTAL DIBAYAR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={payAmount ? formatInputNumber(payAmount) : '0'}
                    onChange={(e) => setPayAmount(parseFormattedNumber(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    TANGGAL TRANSAKSI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">DIBAYAR KE</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Transfer BCA">Transfer BCA</option>
                    <option value="Transfer Mandiri">Transfer Mandiri</option>
                    <option value="Transfer BRI">Transfer BRI</option>
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">NOMOR REFERENSI</label>
                  <input
                    type="text"
                    value={payRefNumber}
                    onChange={(e) => setPayRefNumber(e.target.value)}
                    placeholder="e.g. KWT/001/VIII/2026"
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CATATAN (TAG)</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="Info tambahan..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingPayment}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer mt-2"
                >
                  <Plus size={16} />
                  {isSavingPayment ? 'Menyimpan...' : 'Tambah Pembayaran'}
                </button>
              </form>
            </div>

            {/* Riwayat Pembayaran */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <FileText size={14} className="text-slate-500" />
                Riwayat Pembayaran
              </h3>

              {inv.paymentHistory && inv.paymentHistory.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {inv.paymentHistory.map((p, pIdx) => (
                    <div key={p.id || pIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>Rp {formatCurrency(p.amount)}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{formatDateIndo(p.date)}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{p.method || 'Transfer'}</p>
                      {p.notes && <p className="text-[10px] text-slate-500 italic">{p.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 text-xs italic py-4">
                  Belum ada pembayaran.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER 3: FULL PAGE FORM ("Buat Invoice Baru" / "Edit Invoice")
  // =========================================================================
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (selectedInvoice && editingInvoiceId) {
              setViewMode('detail');
            } else {
              setViewMode('list');
            }
          }}
          className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <CreditCard size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {editingInvoiceId ? `Edit Invoice ${invoiceNumber}` : 'Buat Invoice Baru'}
            </h1>
            <p className="text-xs text-slate-500">Formulir penagihan biaya jasa</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveInvoice} className="space-y-6 text-xs">
        {/* Card 1: Pilih Klien */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <label className="font-bold text-slate-900 text-xs">Pilih Klien</label>

            {/* Source filter tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setClientSourceTab('all')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  clientSourceTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({superappsClients.length + localClients.length})
              </button>
              <button
                type="button"
                onClick={() => setClientSourceTab('local')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  clientSourceTab === 'local'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lokal ({localClients.length})
              </button>
              <button
                type="button"
                onClick={() => setClientSourceTab('superapps')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  clientSourceTab === 'superapps'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Superapps ({superappsClients.length})
              </button>
            </div>
          </div>

          {/* Client Searchable Input / Dropdown */}
          <div className="relative">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama klien, email, atau alamat..."
                value={clientName || clientSearch}
                onFocus={() => setShowClientDropdown(true)}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
              {(clientName || clientSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setClientName('');
                    setClientSearch('');
                    setSelectedClientId('');
                    setSelectedClientSource(undefined);
                    setClientEmail('');
                    setClientPhone('');
                    setClientAddress('');
                  }}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Dropdown Options */}
            {showClientDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-56 overflow-y-auto p-1">
                {isLoadingClients ? (
                  <div className="p-3 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Memuat data klien...
                  </div>
                ) : filteredClientOptions.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs italic">
                    Tidak ada data klien yang cocok.
                  </div>
                ) : (
                  filteredClientOptions.map((c) => (
                    <div
                      key={`${c.source}_${c.clientId}`}
                      onClick={() => {
                        setSelectedClientId(c.clientId);
                        setSelectedClientSource(c.source);
                        setClientName(c.name);
                        setClientEmail(c.email);
                        setClientPhone(c.phone);
                        setClientAddress(c.address);
                        setShowClientDropdown(false);
                      }}
                      className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{c.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            c.source === 'superapps'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {c.source === 'superapps' ? 'Superapps' : 'Lokal'}
                          </span>
                        </div>
                        {c.address && <p className="text-[10px] text-slate-500 mt-0.5">{c.address}</p>}
                      </div>
                      {selectedClientId === c.clientId && (
                        <Check size={16} className="text-blue-600" />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsNewClientModalOpen(true)}
              className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <UserPlus size={14} /> + Input Klien Baru (Lokal)
            </button>
          </div>
        </div>

        {/* Card 2: Form Header Fields */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nomor Invoice</label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tanggal</label>
            <input
              type="date"
              required
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Jatuh Tempo</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Card 3: ITEM TAGIHAN */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">ITEM TAGIHAN</h3>

          {/* Add Item Form Controls */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="block font-bold text-slate-700 mb-1">PILIH PRODUK</label>
                <select
                  value={selectedPresetProduct}
                  onChange={(e) => {
                    setSelectedPresetProduct(e.target.value);
                    if (e.target.value === 'AKTA PERUBAHAN PT SK') {
                      setItemDescription('1. Draft Notulen Sirkuler\n2. Akta RUPSLB\n3. Surat Keputusan (SK) AHU\n4. Surat Pelaporan AHU\n5. BNRI\n6. Akta Hibah Saham');
                      setItemUnitPrice(7435897);
                      setItemGrossUp(true);
                    } else if (e.target.value === 'Jasa Pembuatan Akta Notaris') {
                      setItemUnitPrice(5000000);
                    }
                  }}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none"
                >
                  {PRESET_PRODUCTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-5">
                <label className="block font-bold text-slate-700 mb-1">DESKRIPSI</label>
                <input
                  type="text"
                  placeholder="Deskripsi rincian..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">HARGA (RP)</label>
                <input
                  type="text"
                  placeholder="0"
                  value={itemUnitPrice ? formatInputNumber(itemUnitPrice) : ''}
                  onChange={(e) => setItemUnitPrice(parseFormattedNumber(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 pb-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemGrossUp}
                    onChange={(e) => setItemGrossUp(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700 text-xs whitespace-nowrap">Gross Up PPh 21</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddItemFromInput}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus size={15} /> Tambah Item
              </button>
            </div>
          </div>

          {/* Items List Table */}
          <div className="border border-slate-200/80 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Item / Deskripsi</th>
                  <th className="p-3 w-20 text-center">Qty</th>
                  <th className="p-3 w-32 text-right">Harga (Rp)</th>
                  <th className="p-3 w-20 text-center">PPh</th>
                  <th className="p-3 w-32 text-right">Subtotal</th>
                  <th className="p-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      Belum ada item ditambahkan.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="p-3">
                        <textarea
                          rows={2}
                          value={it.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min={1}
                          value={it.quantity || 1}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-14 p-1.5 border border-slate-200 rounded text-center font-bold"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <input
                          type="text"
                          value={formatInputNumber(it.unitPrice || 0)}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFormattedNumber(e.target.value))}
                          className="w-28 p-1.5 border border-slate-200 rounded text-right font-bold"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={it.isTaxed || false}
                          onChange={(e) => handleItemChange(idx, 'isTaxed', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatCurrency((it.quantity || 1) * (it.unitPrice || 0))}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Subtotal & Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-1.5 text-right font-medium text-slate-700">
              <div className="flex justify-between">
                <span>Honorarium (Bersih):</span>
                <span className="font-bold text-slate-900">{formatCurrency(currentSub)}</span>
              </div>
              {currentTax > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>PPh 21 Gross Up:</span>
                  <span className="font-bold">+ {formatCurrency(currentTax)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Total Tagihan:</span>
                <span className="font-bold text-blue-600">{formatCurrency(currentTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Rekening & Pengaturan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">Rekening Pembayaran</h4>
            <div>
              <label className="block text-[11px] text-slate-600">Nama Bank</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600">Nomor Rekening</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600">Atas Nama</label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded bg-white font-medium"
              />
            </div>
          </div>

          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">Pengaturan & Status</h4>
            <div>
              <label className="block text-[11px] text-slate-600">Bahasa Invoice</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'id' | 'en')}
                className="w-full p-2 border border-slate-200 rounded bg-white font-medium"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600">Status Invoice</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2 border border-slate-200 rounded bg-white font-medium"
              >
                <option value="UNPAID">UNPAID (Belum Lunas)</option>
                <option value="PAID">PAID (Lunas)</option>
                <option value="DRAFT">DRAFT</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (selectedInvoice && editingInvoiceId) {
                setViewMode('detail');
              } else {
                setViewMode('list');
              }
            }}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={15} /> Cetak
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-all"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>

      {/* Modal Quick Create Local Client */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Input Klien Baru (Lokal)</h3>
              <button
                onClick={() => setIsNewClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Klien / Perusahaan *</label>
                <input
                  type="text"
                  required
                  value={newClientNameInput}
                  onChange={(e) => setNewClientNameInput(e.target.value)}
                  placeholder="e.g. PT Maju Jaya"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newClientEmailInput}
                  onChange={(e) => setNewClientEmailInput(e.target.value)}
                  placeholder="email@klien.com"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telepon</label>
                <input
                  type="text"
                  value={newClientPhoneInput}
                  onChange={(e) => setNewClientPhoneInput(e.target.value)}
                  placeholder="08123456789"
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat</label>
                <input
                  type="text"
                  value={newClientAddressInput}
                  onChange={(e) => setNewClientAddressInput(e.target.value)}
                  placeholder="Alamat lengkap..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreateQuickLocalClient}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Gunakan Klien Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
