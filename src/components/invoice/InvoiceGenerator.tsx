import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, PaymentRecord } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { CompanyService } from '../../services/CompanyService';
import { SuperappsClientService } from '../../services/superappsClientService';
import {
  Plus, Edit2, Trash2, Printer, Search, X, Copy, ExternalLink,
  Check, CreditCard, DollarSign, Globe, CheckCircle2, AlertCircle, FileText, Share2,
  Building2, Database
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

export const InvoiceGenerator: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Record Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('Transfer Bank');
  const [payNotes, setPayNotes] = useState<string>('');

  // Form Fields
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

  // Client Master Selection State
  const [clientSourceTab, setClientSourceTab] = useState<'local' | 'superapps'>('superapps');
  const [localClients, setLocalClients] = useState<ClientOption[]>([]);
  const [superappsClients, setSuperappsClients] = useState<ClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [superappsError, setSuperappsError] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Jasa Pembuatan Akta Notaris', quantity: 1, unitPrice: 5000000, amount: 5000000, isTaxed: false }
  ]);

  // Bank details
  const [bankName, setBankName] = useState('Bank Mandiri');
  const [accountNumber, setAccountNumber] = useState('123-00-0987654-3');
  const [accountHolder, setAccountHolder] = useState('Notaris & PPAT Putri');

  // Copied alert
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = InvoiceService.subscribeInvoices((data) => {
      setInvoices(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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

    // 2. Fetch Superapps Clients (read-only from second Firestore instance)
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
    let sub = 0;
    let tax = 0;
    currentItems.forEach(it => {
      const itemSub = (it.quantity || 0) * (it.unitPrice || 0);
      sub += itemSub;
      if (it.isTaxed) {
        tax += itemSub * ((it.taxRate || 11) / 100);
      }
    });
    const total = sub + tax;
    return { sub, tax, total };
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    item.amount = (item.quantity || 0) * (item.unitPrice || 0);
    updated[index] = item;
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, amount: 0, isTaxed: false }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const openAddModal = () => {
    setEditingInvoice(null);
    const generatedNum = `INV/NTR/${new Date().getFullYear()}/${(invoices.length + 1).toString().padStart(3, '0')}`;
    setInvoiceNumber(generatedNum);
    setClientName('');
    setSelectedClientId('');
    setSelectedClientSource(undefined);
    setClientEmail('');
    setClientPhone('');
    setClientAddress('');
    setClientSearch('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setStatus('UNPAID');
    setLanguage('id');
    setCurrency('IDR');
    setNotes('');
    setTerms('Pembayaran dilakukan maksimal 14 hari setelah invoice diterbitkan.');
    setItems([
      { id: '1', description: 'Jasa Pembuatan Akta Notaris', quantity: 1, unitPrice: 5000000, amount: 5000000, isTaxed: false }
    ]);
    setBankName('Bank Mandiri');
    setAccountNumber('123-00-0987654-3');
    setAccountHolder('Notaris & PPAT Putri');
    loadClientOptions();
    setIsModalOpen(true);
  };

  const openEditModal = (inv: Invoice) => {
    setEditingInvoice(inv);
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
    if (inv.bankDetails) {
      setBankName(inv.bankDetails.bankName || 'Bank Mandiri');
      setAccountNumber(inv.bankDetails.accountNumber || '');
      setAccountHolder(inv.bankDetails.accountHolder || '');
    }
    loadClientOptions();
    setIsModalOpen(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || !clientName) {
      alert('Mohon isi Nomor Invoice dan Nama Klien.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { sub, tax, total } = calculateTotals(items);
      const paid = editingInvoice ? editingInvoice.paidAmount || 0 : 0;
      const balance = Math.max(0, total - paid);

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
        paidAmount: paid,
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
        paymentHistory: editingInvoice?.paymentHistory || []
      };

      if (editingInvoice) {
        await InvoiceService.updateInvoice(editingInvoice.id, payload);
      } else {
        await InvoiceService.addInvoice(payload);
      }

      setIsModalOpen(false);
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
      } catch (err) {
        console.error('Error deleting invoice:', err);
        alert('Gagal menghapus invoice.');
      }
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setPaymentTargetInvoice(inv);
    setPayAmount(inv.balanceDue || inv.totalAmount);
    setPayMethod('Transfer Bank');
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetInvoice || payAmount <= 0) {
      alert('Nominal pembayaran harus lebih dari 0.');
      return;
    }

    try {
      await InvoiceService.addPayment(paymentTargetInvoice.id, paymentTargetInvoice, {
        date: new Date().toISOString().split('T')[0],
        amount: payAmount,
        method: payMethod,
        notes: payNotes,
        recordedBy: 'Admin'
      });
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Gagal mencatat pembayaran.');
    }
  };

  const copyPublicLink = (inv: Invoice) => {
    const token = inv.publicToken || inv.id;
    const origin = window.location.origin;
    const path = window.location.pathname;
    const fullUrl = `${origin}${path}#/invoice/public?token=${token}`;

    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(inv.id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const openPublicViewInNewTab = (inv: Invoice) => {
    const token = inv.publicToken || inv.id;
    const url = `${window.location.origin}${window.location.pathname}#/invoice/public?token=${token}`;
    window.open(url, '_blank');
  };

  // Filtered list
  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatCurrency = (val: number, curr = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const { sub: currentSub, tax: currentTax, total: currentTotal } = calculateTotals(items);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <CreditCard size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Generator & Manajemen Invoice</h1>
            <p className="text-xs text-slate-500">
              Kelola penagihan, pajak, pembayaran, dan tautan publik untuk klien
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          Buat Invoice Baru
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor invoice atau nama klien..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['ALL', 'UNPAID', 'PAID', 'DRAFT', 'CANCELLED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
                <th className="p-3">NO. INVOICE</th>
                <th className="p-3">KLIEN</th>
                <th className="p-3">TGL TERBIT</th>
                <th className="p-3">STATUS</th>
                <th className="p-3 text-right">TOTAL</th>
                <th className="p-3 text-right">SISA TAGIHAN</th>
                <th className="p-3 text-center">TAUTAN PUBLIK</th>
                <th className="p-3 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    Belum ada data invoice. Silakan klik "Buat Invoice Baru".
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-slate-800">{inv.clientName}</p>
                        {inv.clientSource && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            inv.clientSource === 'superapps'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {inv.clientSource === 'superapps' ? 'Superapps' : 'Lokal'}
                          </span>
                        )}
                      </div>
                      {inv.clientEmail && <p className="text-[11px] text-slate-500">{inv.clientEmail}</p>}
                    </td>
                    <td className="p-3 text-slate-600">{inv.issueDate}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'UNPAID'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatCurrency(inv.totalAmount, inv.currency)}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-700">
                      {formatCurrency(inv.balanceDue, inv.currency)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => copyPublicLink(inv)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          title="Salin Link Publik Klien"
                        >
                          {copiedToken === inv.id ? (
                            <>
                              <Check size={12} className="text-emerald-600" /> Tersalin!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Salin Link
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => openPublicViewInNewTab(inv)}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                          title="Buka Tampilan Publik"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Bayar / Catat Pembayaran"
                          >
                            <DollarSign size={12} /> Bayar
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(inv)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Invoice */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-800 text-base">
                {editingInvoice ? 'Edit Invoice' : 'Buat Invoice Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-4 md:p-6 space-y-6 text-xs">
              {/* Header Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Invoice *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Terbit *</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Client Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-2">
                    <Building2 size={14} className="text-emerald-600" /> Informasi Klien
                  </h4>
                  {selectedClientId && (
                    <div className="flex items-center gap-1.5 text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      Terisi dari {selectedClientSource === 'superapps' ? 'Klien Superapps' : 'Klien Lokal'}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId('');
                          setSelectedClientSource(undefined);
                        }}
                        className="ml-1 text-slate-500 hover:text-slate-700 underline font-normal cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* Client Selection Box */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-700 text-[11px]">
                      Pilih dari Data Master Klien (Opsional):
                    </label>
                    <span className="text-[10px] text-slate-400">Pilih untuk auto-fill data</span>
                  </div>

                  {/* Tabs for Source */}
                  <div className="flex border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setClientSourceTab('superapps')}
                      className={`px-3 py-1.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                        clientSourceTab === 'superapps'
                          ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/50 rounded-t-lg'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Database size={13} className={clientSourceTab === 'superapps' ? 'text-indigo-600' : 'text-slate-400'} />
                      Klien Superapps
                      <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                        {superappsClients.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClientSourceTab('local')}
                      className={`px-3 py-1.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                        clientSourceTab === 'local'
                          ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50 rounded-t-lg'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Building2 size={13} className={clientSourceTab === 'local' ? 'text-emerald-600' : 'text-slate-400'} />
                      Klien Lokal
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-full font-bold">
                        {localClients.length}
                      </span>
                    </button>
                  </div>

                  {/* Search and List */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder={`Cari nama ${clientSourceTab === 'superapps' ? 'klien superapps' : 'klien lokal'}...`}
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                      {clientSearch && (
                        <button
                          type="button"
                          onClick={() => setClientSearch('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {isLoadingClients ? (
                      <div className="p-3 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        Memuat data klien...
                      </div>
                    ) : clientSourceTab === 'superapps' && superappsError ? (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className="text-amber-600 shrink-0" />
                          <span>{superappsError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={loadClientOptions}
                          className="text-[11px] font-semibold text-amber-900 underline hover:text-amber-950 cursor-pointer"
                        >
                          Coba lagi
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-200 rounded-lg p-1 bg-slate-50/50">
                        {((clientSourceTab === 'superapps' ? superappsClients : localClients).filter(c =>
                          c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          c.address.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          c.email.toLowerCase().includes(clientSearch.toLowerCase())
                        )).length === 0 ? (
                          <div className="p-3 text-center text-slate-400 text-xs italic">
                            Tidak ada data {clientSourceTab === 'superapps' ? 'klien superapps' : 'klien lokal'} yang cocok.
                          </div>
                        ) : (
                          (clientSourceTab === 'superapps' ? superappsClients : localClients)
                            .filter(c =>
                              c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                              c.address.toLowerCase().includes(clientSearch.toLowerCase()) ||
                              c.email.toLowerCase().includes(clientSearch.toLowerCase())
                            )
                            .map((client) => {
                              const isSelected = selectedClientId === client.clientId && selectedClientSource === client.source;
                              return (
                                <div
                                  key={`${client.source}_${client.clientId}`}
                                  onClick={() => {
                                    setSelectedClientId(client.clientId);
                                    setSelectedClientSource(client.source);
                                    setClientName(client.name);
                                    setClientEmail(client.email);
                                    setClientPhone(client.phone);
                                    setClientAddress(client.address);
                                  }}
                                  className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs ${
                                    isSelected
                                      ? 'bg-indigo-50 border border-indigo-300 text-indigo-950 font-medium shadow-sm'
                                      : 'bg-white hover:bg-slate-100/80 border border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold truncate">{client.name}</span>
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                        client.source === 'superapps'
                                          ? 'bg-indigo-100 text-indigo-700'
                                          : 'bg-emerald-100 text-emerald-700'
                                      }`}>
                                        {client.source === 'superapps' ? 'Superapps' : 'Lokal'}
                                      </span>
                                    </div>
                                    {client.address && (
                                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{client.address}</p>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />
                                  )}
                                </div>
                              );
                            })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Nama Klien / Perusahaan *</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. PT Maju Bersama / Bapak Budi"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Email Klien</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="klien@email.com"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Telepon Klien</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Alamat Klien</label>
                    <input
                      type="text"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="Alamat lengkap klien..."
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Rincian Item & Jasa</h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Tambah Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Deskripsi</th>
                        <th className="p-2.5 w-20 text-center">Qty</th>
                        <th className="p-2.5 w-32 text-right">Harga Satuan</th>
                        <th className="p-2.5 w-24 text-center">Pajak (11%)</th>
                        <th className="p-2.5 w-32 text-right">Subtotal</th>
                        <th className="p-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it, idx) => (
                        <tr key={it.id || idx}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={it.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              placeholder="Deskripsi layanan / produk"
                              className="w-full p-1.5 border border-slate-200 rounded focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-full p-1.5 border border-slate-200 rounded text-center focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={it.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                              className="w-full p-1.5 border border-slate-200 rounded text-right focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={it.isTaxed || false}
                              onChange={(e) => handleItemChange(idx, 'isTaxed', e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-800">
                            {formatCurrency((it.quantity || 0) * (it.unitPrice || 0), currency)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 space-y-1.5 text-right font-medium text-slate-700">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(currentSub, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pajak (PPN 11%):</span>
                      <span className="font-bold text-slate-900">{formatCurrency(currentTax, currency)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                      <span className="font-bold text-slate-900">Total Tagihan:</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(currentTotal, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Details & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wide">Rekening Pembayaran</h4>
                  <div>
                    <label className="block text-[11px] text-slate-600">Nama Bank</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600">Nomor Rekening</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600">Atas Nama</label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wide">Pengaturan Tampilan</h4>
                  <div>
                    <label className="block text-[11px] text-slate-600">Bahasa Invoice</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'id' | 'en')}
                      className="w-full p-1.5 border border-slate-300 rounded bg-white font-medium"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600">Status Awal</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full p-1.5 border border-slate-300 rounded bg-white font-medium"
                    >
                      <option value="UNPAID">UNPAID (Belum Lunas)</option>
                      <option value="PAID">PAID (Lunas)</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Record Payment */}
      {isPaymentModalOpen && paymentTargetInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Catat Pembayaran Invoice</h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <p><span className="font-semibold text-slate-600">Invoice:</span> {paymentTargetInvoice.invoiceNumber}</p>
              <p><span className="font-semibold text-slate-600">Klien:</span> {paymentTargetInvoice.clientName}</p>
              <p><span className="font-semibold text-slate-600">Sisa Tagihan:</span> <span className="font-bold text-amber-700">{formatCurrency(paymentTargetInvoice.balanceDue)}</span></p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Nominal Pembayaran (Rp) *</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold text-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Metode Pembayaran</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="Tunai">Tunai / Cash</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Kartu Kredit">Kartu Kredit</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan Pembayaran</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Pembayaran DP 50%"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm cursor-pointer"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
