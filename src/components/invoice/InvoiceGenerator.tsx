import React, { useState, useEffect, useRef } from 'react';
import { Invoice, InvoiceItem, PaymentRecord } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { CompanyService } from '../../services/CompanyService';
import { SuperappsClientService } from '../../services/superappsClientService';
import { calculateInvoiceTotals, getItemSubtotal } from '../../services/taxCalculator';
import { formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import { printInvoice, downloadInvoicePdf } from '../../utils/invoiceHtmlGenerator';
import {
  Plus, Edit2, Trash2, Printer, Search, X, Copy, ExternalLink,
  Check, CreditCard, DollarSign, Globe, CheckCircle2, AlertCircle, FileText, Share2,
  Building2, Database, ArrowLeft, Download, Send, MessageSquare, ChevronLeft, ChevronRight, UserPlus,
  MoreHorizontal
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset pagination when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // PDF Export State
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPDF = async (inv: Invoice) => {
    setDownloadingPdf(true);
    try {
      await downloadInvoicePdf(inv);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Gagal mengunduh file PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

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
  const [notes, setNotes] = useState('Pemotongan pajak PPh Pasal 21 harus disetorkan paling lambat tanggal 10 bulan berikutnya, untuk mencegah sanksi Ditjen Pajak.');
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
  const [itemTaxRate, setItemTaxRate] = useState<number>(0.05);

  // Bank details
  const [bankName, setBankName] = useState('BCA Cabang Dago - Bandung');
  const [accountNumber, setAccountNumber] = useState('Acc. 7770673016');
  const [accountHolder, setAccountHolder] = useState('A.n Nukantini Putri Parincha');
  const [bankNpwp, setBankNpwp] = useState('3217015610760002');
  const [bankSwift, setBankSwift] = useState('CENAIDJA');

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
  const [newClientTypeInput, setNewClientTypeInput] = useState<'PT' | 'CV'>('PT');
  const [newClientDomicileInput, setNewClientDomicileInput] = useState('');
  const [newClientPicNameInput, setNewClientPicNameInput] = useState('');
  const [newClientPicPhoneInput, setNewClientPicPhoneInput] = useState('');

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      sub: summary.grossSubtotal,
      tax: summary.taxAmount,
      total: summary.netTotal
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
      isTaxed: itemGrossUp,
      taxRate: itemGrossUp ? itemTaxRate : undefined
    };

    setItems(prev => [...prev, newItem]);
    setItemDescription('');
    setItemUnitPrice(0);
    setItemGrossUp(false);
    setItemTaxRate(0.05);
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
    setNotes('Pemotongan pajak PPh Pasal 21 harus disetorkan paling lambat tanggal 10 bulan berikutnya, untuk mencegah sanksi Ditjen Pajak.');
    setTerms('Pembayaran dilakukan maksimal 14 hari setelah invoice diterbitkan.');
    setItems([]);
    setItemDescription('');
    setItemUnitPrice(0);
    setItemGrossUp(false);
    setSelectedPresetProduct('-- Manual --');
    setBankName('BCA Cabang Dago - Bandung');
    setAccountNumber('Acc. 7770673016');
    setAccountHolder('A.n Nukantini Putri Parincha');
    setBankNpwp('3217015610760002');
    setBankSwift('CENAIDJA');
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
    setNotes(inv.notes !== undefined ? inv.notes : 'Pemotongan pajak PPh Pasal 21 harus disetorkan paling lambat tanggal 10 bulan berikutnya, untuk mencegah sanksi Ditjen Pajak.');
    setTerms(inv.terms || '');
    setItems(inv.items && inv.items.length > 0 ? inv.items : []);
    setItemDescription('');
    setItemUnitPrice(0);
    setItemGrossUp(false);
    setSelectedPresetProduct('-- Manual --');
    if (inv.bankDetails) {
      setBankName(inv.bankDetails.bankName || 'BCA Cabang Dago - Bandung');
      setAccountNumber(inv.bankDetails.accountNumber || 'Acc. 7770673016');
      setAccountHolder(inv.bankDetails.accountHolder || 'A.n Nukantini Putri Parincha');
      setBankNpwp(inv.bankDetails.npwp || '3217015610760002');
      setBankSwift(inv.bankDetails.swiftCode || 'CENAIDJA');
    } else {
      setBankName('BCA Cabang Dago - Bandung');
      setAccountNumber('Acc. 7770673016');
      setAccountHolder('A.n Nukantini Putri Parincha');
      setBankNpwp('3217015610760002');
      setBankSwift('CENAIDJA');
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
          accountHolder,
          npwp: bankNpwp,
          swiftCode: bankSwift
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

  const handleCreateQuickLocalClient = async () => {
    if (!newClientNameInput) {
      alert('Mohon isi nama klien.');
      return;
    }
    
    try {
      const clientId = crypto.randomUUID();
      const companyData = {
        id: clientId,
        companyName: newClientNameInput.toUpperCase().trim(),
        domicile: newClientDomicileInput.trim(),
        email: newClientEmailInput.trim(),
        phoneNumber: newClientPhoneInput.trim(),
        fullAddress: newClientAddressInput.trim(),
        clientType: newClientTypeInput,
        companyType: newClientTypeInput === 'CV' ? 'CV' : 'PT_LOKAL',
        picName: newClientPicNameInput.trim(),
        picPhone: newClientPicPhoneInput.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore 'profiles' collection
      await CompanyService.saveCompany(clientId, companyData, newClientTypeInput === 'CV');

      const newOpt: ClientOption = {
        clientId: clientId,
        name: companyData.companyName,
        email: companyData.email,
        phone: companyData.phoneNumber,
        address: companyData.fullAddress,
        source: 'local',
        clientType: newClientTypeInput
      };

      setLocalClients(prev => [newOpt, ...prev]);
      setSelectedClientId(clientId);
      setSelectedClientSource('local');
      setClientName(newOpt.name);
      setClientEmail(newOpt.email);
      setClientPhone(newOpt.phone);
      setClientAddress(newOpt.address);
      setIsNewClientModalOpen(false);
      
      // Reset inputs
      setNewClientNameInput('');
      setNewClientEmailInput('');
      setNewClientPhoneInput('');
      setNewClientAddressInput('');
      setNewClientDomicileInput('');
      setNewClientPicNameInput('');
      setNewClientPicPhoneInput('');
      setNewClientTypeInput('PT');

      alert(`Klien ${newClientTypeInput} baru berhasil didaftarkan dan disimpan di database!`);
    } catch (err: any) {
      console.error('[InvoiceGenerator] Gagal membuat klien baru:', err);
      alert(`Gagal membuat klien baru: ${err.message || err}`);
    }
  };

  const copyPublicLink = (inv: Invoice) => {
    const token = inv.publicToken || inv.id;
    const fullUrl = inv.legacyPublicUrl || `${window.location.origin}/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(inv.id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleShareWhatsApp = (inv: Invoice) => {
    const token = inv.publicToken || inv.id;
    const publicUrl = inv.legacyPublicUrl || `${window.location.origin}/${token}`;
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

  const totalItems = filteredInvoices.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedInvoices = filteredInvoices.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

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
                  <th className="p-3.5 w-12 text-center">No.</th>
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
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      <div className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs">Memuat data invoice...</p>
                    </td>
                  </tr>
                ) : paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                      Belum ada data invoice. Klik tombol "+ Buat Invoice" di atas untuk membuat invoice baru.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv, idx) => {
                    const isUnpaid = inv.status === 'UNPAID';
                    const serialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => openDetailPage(inv)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="p-3.5 text-slate-500 font-semibold text-center whitespace-nowrap">
                          {serialNumber}
                        </td>
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

          {/* Pagination Footer */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Tampilkan</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>baris. Menampilkan {Math.min(totalItems, (safeCurrentPage - 1) * pageSize + 1)}-{Math.min(totalItems, safeCurrentPage * pageSize)} dari {totalItems} invoice.</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1;
                    })
                    .map((page, index, array) => {
                      const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && (
                            <span className="px-2 text-slate-400 select-none">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              safeCurrentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
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

          <div className="flex items-center gap-2 flex-wrap relative" ref={moreMenuRef}>
            <button
              onClick={() => handleShareWhatsApp(inv)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Send size={14} /> Kirim Tagihan
            </button>

            <button
              onClick={() => handleDownloadPDF(inv)}
              disabled={downloadingPdf}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download size={14} />
              {downloadingPdf ? 'Mengunduh PDF...' : 'Download PDF'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(v => !v)}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MoreHorizontal size={14} /> Lainnya
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden">
                  <button
                    onClick={() => { copyPublicLink(inv); setShowMoreMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    {copiedToken === inv.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copiedToken === inv.id ? 'Tersalin!' : 'Salin Link'}
                  </button>
                  <button
                    onClick={() => { printInvoice(inv); setShowMoreMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer size={14} /> Print
                  </button>
                  <button
                    onClick={() => { openEditPage(inv); setShowMoreMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => { setShowMoreMenu(false); handleDeleteInvoice(inv.id); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={14} /> Hapus Invoice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Layout (2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Invoice Document Preview (8 Cols on desktop) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto print:border-none print:shadow-none print:p-0 print:overflow-visible">
            <InvoicePrintTemplate invoice={inv} />
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
              <UserPlus size={14} /> + Input Klien Baru
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

              <div className="md:col-span-2 flex flex-col justify-center gap-1.5 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemGrossUp}
                    onChange={(e) => setItemGrossUp(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="font-semibold text-slate-700 text-xs whitespace-nowrap">Gross Up PPh 21</span>
                </label>
                {itemGrossUp && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Tarif:</span>
                    <select
                      value={itemTaxRate}
                      onChange={(e) => setItemTaxRate(parseFloat(e.target.value))}
                      className="text-xs font-bold p-1 border border-blue-200 bg-blue-50 text-blue-800 rounded focus:outline-none"
                    >
                      <option value={0.05}>Tarif 5%</option>
                      <option value={0.15}>Tarif 15%</option>
                      <option value={0.25}>Tarif 25%</option>
                      <option value={0.30}>Tarif 30%</option>
                      <option value={0.35}>Tarif 35%</option>
                    </select>
                  </div>
                )}
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
                  <th className="p-3 w-28 text-center">PPh 21</th>
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
                        <div className="flex flex-col items-center gap-1">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={it.isTaxed || false}
                              onChange={(e) => handleItemChange(idx, 'isTaxed', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-600 font-semibold">Gross Up</span>
                          </label>
                          {it.isTaxed && (
                            <select
                              value={it.taxRate !== undefined ? it.taxRate : 0.05}
                              onChange={(e) => handleItemChange(idx, 'taxRate', parseFloat(e.target.value))}
                              className="text-[10px] font-bold p-1 border border-blue-200 bg-blue-50 text-blue-800 rounded focus:outline-none cursor-pointer"
                            >
                              <option value={0.05}>5%</option>
                              <option value={0.15}>15%</option>
                              <option value={0.25}>25%</option>
                              <option value={0.30}>30%</option>
                              <option value={0.35}>35%</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatCurrency(getItemSubtotal(it))}
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
                <span>Sub Total:</span>
                <span className="font-bold text-slate-900">{formatCurrency(currentSub)}</span>
              </div>
              {currentTax > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Potongan Pajak (PPh 21):</span>
                  <span className="font-bold">({formatCurrency(currentTax)})</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Total Tagihan:</span>
                <span className="font-bold text-blue-600">{formatCurrency(currentTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Rekening, Catatan & Pengaturan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">Rekening Pembayaran & Pajak</h4>
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600">NPWP 16 Digit</label>
                <input
                  type="text"
                  value={bankNpwp}
                  onChange={(e) => setBankNpwp(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded bg-white font-medium text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600">SWIFT BCA</label>
                <input
                  type="text"
                  value={bankSwift}
                  onChange={(e) => setBankSwift(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded bg-white font-medium text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">Catatan & Pengaturan Status</h4>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1 font-semibold">Catatan Invoice (PPh 21 / Instruktur)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded bg-white text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Tambah catatan..."
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600">Bahasa Invoice</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'id' | 'en')}
                  className="w-full p-2 border border-slate-200 rounded bg-white font-medium text-xs"
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
                  className="w-full p-2 border border-slate-200 rounded bg-white font-medium text-xs"
                >
                  <option value="UNPAID">UNPAID (Belum Lunas)</option>
                  <option value="PAID">PAID (Lunas)</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-300 rounded-sm shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-shrink-0">
              <h3 className="font-bold text-[#333] text-[13px] uppercase tracking-wider">INPUT KLIEN BARU</h3>
              <button
                onClick={() => setIsNewClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-[11px]">
              {/* Seksi Profil Klien */}
              <div>
                <div className="bg-[#f5f5f5] px-3 py-1.5 border border-slate-200 border-b-0 rounded-t-sm font-bold text-[11px] text-[#333] uppercase">
                  Profil Klien
                </div>
                <div className="p-3.5 border border-slate-200 rounded-b-sm bg-white space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase mb-1">Tipe Klien *</label>
                    <select
                      value={newClientTypeInput}
                      onChange={(e) => setNewClientTypeInput(e.target.value as 'PT' | 'CV')}
                      className="w-full text-[12px] border border-slate-300 rounded-sm p-1.5 bg-white font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="PT">PT (Perseroan Terbatas)</option>
                      <option value="CV">CV (Persekutuan Komanditer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase mb-1">Nama Klien / Perusahaan *</label>
                    <input
                      type="text"
                      required
                      value={newClientNameInput}
                      onChange={(e) => setNewClientNameInput(e.target.value)}
                      placeholder={newClientTypeInput === 'CV' ? 'e.g. CV MAJU JAYA' : 'e.g. PT MAJU JAYA'}
                      className="w-full text-[12px] border border-slate-300 rounded-sm p-1.5 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase mb-1">Kedudukan (Kab/Kota)</label>
                    <input
                      type="text"
                      value={newClientDomicileInput}
                      onChange={(e) => setNewClientDomicileInput(e.target.value)}
                      placeholder="e.g. Kota Bandung atau Kabupaten Bandung Barat"
                      className="w-full text-[12px] border border-slate-300 rounded-sm p-1.5 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi Kontak Klien */}
              <div>
                <div className="bg-[#f5f5f5] px-3 py-1.5 border border-slate-200 border-b-0 rounded-t-sm font-bold text-[11px] text-[#333] uppercase">
                  Kontak Klien
                </div>
                <div className="p-3.5 border border-slate-200 rounded-b-sm bg-white space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase mb-1">Email</label>
                    <input
                      type="email"
                      value={newClientEmailInput}
                      onChange={(e) => setNewClientEmailInput(e.target.value)}
                      placeholder="email@klien.com"
                      className="w-full text-[12px] border border-slate-300 rounded-sm p-1.5 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase mb-1">Telepon</label>
                    <input
                      type="text"
                      value={newClientPhoneInput}
                      onChange={(e) => setNewClientPhoneInput(e.target.value)}
                      placeholder="08123456789"
                      className="w-full text-[12px] border border-slate-300 rounded-sm p-1.5 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase mb-1">Alamat Lengkap</label>
                    <textarea
                      value={newClientAddressInput}
                      onChange={(e) => setNewClientAddressInput(e.target.value)}
                      placeholder="Alamat lengkap..."
                      rows={2}
                      className="w-full text-[12px] border border-slate-300 rounded-sm p-1.5 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi Informasi PIC */}
              <div>
                <div className="bg-[#f5f5f5] px-3 py-1.5 border border-slate-200 border-b-0 rounded-t-sm font-bold text-[11px] text-[#333] uppercase">
                  Informasi PIC (Tidak Wajib)
                </div>
                <div className="p-3.5 border border-slate-200 rounded-b-sm bg-white space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase mb-1">Nama PIC</label>
                    <input
                      type="text"
                      value={newClientPicNameInput}
                      onChange={(e) => setNewClientPicNameInput(e.target.value)}
                      placeholder="Nama lengkap PIC"
                      className="w-full text-[12px] border border-slate-300 rounded-sm p-1.5 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block uppercase mb-1">Telepon / WA PIC</label>
                    <input
                      type="text"
                      value={newClientPicPhoneInput}
                      onChange={(e) => setNewClientPicPhoneInput(e.target.value)}
                      placeholder="e.g. 08123456789"
                      className="w-full text-[12px] border border-slate-300 rounded-sm p-1.5 font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-sm text-[11px] font-bold uppercase transition-all hover:bg-slate-300 shadow-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateQuickLocalClient}
                className="px-4 py-2 bg-[#40bdae] text-white rounded-sm text-[11px] font-bold uppercase transition-all hover:bg-[#349c8f] shadow-sm cursor-pointer"
              >
                Simpan & Gunakan Klien
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
