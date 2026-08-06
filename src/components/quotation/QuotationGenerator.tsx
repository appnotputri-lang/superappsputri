import React, { useState, useEffect, useRef } from 'react';
import { Quotation, InvoiceItem } from '../../../types';
import { QuotationService } from '../../services/QuotationService';
import { CompanyService } from '../../services/CompanyService';
import { SuperappsClientService } from '../../services/superappsClientService';
import { formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import { printQuotation, downloadQuotationPdf } from '../../utils/quotationHtmlGenerator';
import { calculateInvoiceTotals, getItemSubtotal, getItemTax } from '../../services/taxCalculator';
import { getApiUrl } from '../../lib/api';
import { auth } from '../../lib/firebase';
import {
  Plus, Edit2, Trash2, Printer, Search, X, Copy, ExternalLink,
  Check, CreditCard, DollarSign, Globe, CheckCircle2, AlertCircle, FileText, Share2,
  Building2, Database, ArrowLeft, Download, Send, SendHorizontal, Smartphone, MessageSquare, ChevronLeft, ChevronRight, UserPlus,
  MoreHorizontal, Calendar, Clock, ChevronUp, ChevronDown, MoreVertical, RefreshCw
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

const formatCurrency = (val?: number) => {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(val || 0);
};

export const QuotationGenerator: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'list' | 'create' | 'edit' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sorting State
  const [sortField, setSortField] = useState<'date' | 'number'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // PDF Export State
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // WhatsApp Share Modal States
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waTargetPhone, setWaTargetPhone] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waSendSuccess, setWaSendSuccess] = useState<string | null>(null);
  const [waSendError, setWaSendError] = useState<string | null>(null);
  const [activeWaQuotation, setActiveWaQuotation] = useState<Quotation | null>(null);

  // Form Fields
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientSource, setSelectedClientSource] = useState<'local' | 'superapps' | undefined>(undefined);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'>('DRAFT');
  const [notes, setNotes] = useState('Penawaran ini berlaku selama 14 hari sejak tanggal diterbitkan.\nPembayaran dilakukan sesuai dengan kesepakatan.');

  // Items Form
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Add Item Temp Inputs
  const [selectedPresetProduct, setSelectedPresetProduct] = useState('-- Manual --');
  const [itemDescription, setItemDescription] = useState('');
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);
  const [itemGrossUp, setItemGrossUp] = useState(false);
  const [itemTaxRate, setItemTaxRate] = useState(0.05);

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

  // Dropdown menus
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);

  // Load Quotations
  useEffect(() => {
    const unsub = QuotationService.subscribeQuotations((data) => {
      setQuotations(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const loadClientOptions = async () => {
    setIsLoadingClients(true);
    setSuperappsError(null);

    // 1. Fetch Local Clients
    try {
      const [ptList, cvList] = await Promise.all([
        CompanyService.getCompanies().catch(() => []),
        CompanyService.getCvCompanies().catch(() => [])
      ]);

      const seenIds = new Set<string>();
      const uniqueLocal: any[] = [];
      for (const c of [...ptList, ...cvList]) {
        if (c && c.id && !seenIds.has(c.id)) {
          seenIds.add(c.id);
          uniqueLocal.push(c);
        }
      }

      const allLocal: ClientOption[] = uniqueLocal.map(c => {
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

  useEffect(() => {
    loadClientOptions();
  }, []);

  // Generate Auto-Quotation Number
  const generateSuggestedQuotationNumber = () => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Count existing quotations in current year to suggest sequential number
    const yearQuotations = quotations.filter(q => q.date && q.date.startsWith(String(year)));
    const seq = String(yearQuotations.length + 1).padStart(3, '0');
    
    return `Q/${year}/${month}/${seq}`;
  };

  const openCreatePage = () => {
    setEditingQuotationId(null);
    setQuotationNumber(generateSuggestedQuotationNumber());
    setClientName('');
    setSelectedClientId('');
    setSelectedClientSource(undefined);
    setClientEmail('');
    setClientPhone('');
    setClientAddress('');
    setDate(new Date().toISOString().split('T')[0]);
    
    // Default valid until 14 days later
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    setValidUntil(futureDate.toISOString().split('T')[0]);
    
    setStatus('DRAFT');
    setNotes('Penawaran ini berlaku selama 14 hari sejak tanggal diterbitkan.\nPembayaran dilakukan sesuai dengan kesepakatan.');
    setItems([]);
    setSelectedPresetProduct('-- Manual --');
    setItemDescription('');
    setItemUnitPrice(0);
    setItemGrossUp(false);
    setItemTaxRate(0.05);
    setViewMode('create');
  };

  const openEditPage = (q: Quotation) => {
    setEditingQuotationId(q.id);
    setQuotationNumber(q.quotationNumber);
    setClientName(q.clientName);
    setSelectedClientId(q.clientId);
    setSelectedClientSource(q.clientSource);
    setClientEmail(q.clientEmail || '');
    setClientPhone(q.clientPhone || '');
    setClientAddress(q.clientAddress || '');
    setDate(q.date);
    setValidUntil(q.validUntil || '');
    setStatus(q.status);
    setNotes(q.notes || '');
    
    const itemsWithTax = q.items.map(it => ({
      ...it,
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice || it.amount || 0,
      isTaxed: it.isTaxed !== undefined ? it.isTaxed : (!!q.taxAmount && q.taxAmount > 0 ? true : false),
      taxRate: it.taxRate !== undefined ? it.taxRate : 0.05
    }));
    setItems(itemsWithTax);
    setItemGrossUp(false);
    setItemTaxRate(0.05);
    setViewMode('edit');
  };

  const handleSelectClient = (c: ClientOption) => {
    setSelectedClientId(c.clientId);
    setSelectedClientSource(c.source);
    setClientName(c.name);
    setClientEmail(c.email);
    setClientPhone(c.phone);
    setClientAddress(c.address);
    setClientSearch('');
    setShowClientDropdown(false);
  };

  const handleCreateQuickClient = async () => {
    if (!newClientNameInput.trim()) {
      alert('Nama klien wajib diisi.');
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

      // Reset
      setNewClientNameInput('');
      setNewClientEmailInput('');
      setNewClientPhoneInput('');
      setNewClientAddressInput('');
      setNewClientDomicileInput('');
      setNewClientPicNameInput('');
      setNewClientPicPhoneInput('');
      setNewClientTypeInput('PT');

      alert(`Klien ${newClientTypeInput} baru berhasil didaftarkan dan disimpan!`);
    } catch (err: any) {
      console.error('Gagal membuat klien:', err);
      alert('Gagal membuat klien baru: ' + (err.message || err));
    }
  };

  const handleAddItem = () => {
    if (!itemDescription.trim() && selectedPresetProduct === '-- Manual --') return;

    const desc = selectedPresetProduct !== '-- Manual --'
      ? (itemDescription ? `${selectedPresetProduct}\n${itemDescription}` : selectedPresetProduct)
      : itemDescription || 'Item Penawaran Baru';

    const price = itemUnitPrice || 0;

    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: desc,
      quantity: 1,
      unitPrice: price,
      amount: price,
      isTaxed: itemGrossUp,
      taxRate: itemGrossUp ? itemTaxRate : undefined
    };

    setItems([...items, newItem]);
    setItemDescription('');
    setItemUnitPrice(0);
    setItemGrossUp(false);
    setItemTaxRate(0.05);
    setSelectedPresetProduct('-- Manual --');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    item.amount = (item.quantity || 1) * (item.unitPrice || 0);
    updated[index] = item;
    setItems(updated);
  };

  const handlePresetSelect = (val: string) => {
    setSelectedPresetProduct(val);
    if (val !== '-- Manual --') {
      setItemDescription(val);
      if (val === 'AKTA PERUBAHAN PT SK') {
        setItemDescription('1. Draft Notulen Sirkuler\n2. Akta RUPSLB\n3. Surat Keputusan (SK) AHU\n4. Surat Pelaporan AHU\n5. BNRI\n6. Akta Hibah Saham');
        setItemUnitPrice(7435897);
        setItemGrossUp(true);
      } else if (val === 'Jasa Pembuatan Akta Notaris') {
        setItemUnitPrice(5000000);
        setItemGrossUp(false);
      } else {
        setItemGrossUp(false);
        // Auto estimate cost or keep 0
        if (val.includes('PERUBAHAN PT')) setItemUnitPrice(4500000);
        else if (val.includes('Jasa Pembuatan Akta')) setItemUnitPrice(3000000);
        else if (val.includes('Pendirian PT')) setItemUnitPrice(6500000);
        else if (val.includes('Sirkuler')) setItemUnitPrice(1500000);
        else setItemUnitPrice(0);
      }
    } else {
      setItemDescription('');
      setItemUnitPrice(0);
      setItemGrossUp(false);
    }
  };

  // Totals Calculations using taxCalculator
  const totals = calculateInvoiceTotals(items);
  const subtotal = totals.grossSubtotal;
  const taxAmount = totals.taxAmount;
  const totalAmount = totals.netTotal;

  const handleSaveQuotation = async () => {
    if (!quotationNumber.trim()) {
      alert('Nomor penawaran wajib diisi.');
      return;
    }
    if (!clientName.trim()) {
      alert('Nama klien penerima penawaran wajib diisi.');
      return;
    }
    if (items.length === 0) {
      alert('Silakan tambahkan minimal satu item rincian penawaran.');
      return;
    }

    setLoading(true);

    const quotationData: Omit<Quotation, 'id'> = {
      quotationNumber: quotationNumber.trim(),
      date,
      validUntil: validUntil || undefined,
      clientId: selectedClientId || 'MANUAL_' + Date.now(),
      clientName: clientName.trim(),
      clientAddress: clientAddress.trim(),
      clientPhone: clientPhone.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      clientSource: selectedClientSource,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      status,
      notes: notes.trim()
    };

    try {
      if (editingQuotationId) {
        await QuotationService.updateQuotation(editingQuotationId, quotationData);
        alert('Penawaran berhasil diperbarui.');
      } else {
        await QuotationService.addQuotation(quotationData);
        alert('Penawaran baru berhasil disimpan.');
      }
      setViewMode('list');
      setSelectedQuotation(null);
    } catch (err) {
      console.error('Gagal menyimpan penawaran:', err);
      alert('Gagal menyimpan penawaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus penawaran ini?')) return;
    try {
      await QuotationService.deleteQuotation(id);
      alert('Penawaran telah dihapus.');
      if (selectedQuotation?.id === id) {
        setSelectedQuotation(null);
        setViewMode('list');
      }
    } catch (err) {
      console.error('Gagal menghapus penawaran:', err);
      alert('Gagal menghapus penawaran.');
    }
  };

  const copyPublicLink = (q: Quotation) => {
    const token = q.publicToken || q.id;
    const fullUrl = `${window.location.origin}/q/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(q.id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleDownloadPDF = async (q: Quotation) => {
    setDownloadingPdf(true);
    try {
      await downloadQuotationPdf(q);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Gagal mengunduh file PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // WhatsApp Portal Logic
  const handleShareWhatsApp = (q: Quotation) => {
    setActiveWaQuotation(q);
    setWaSendSuccess(null);
    setWaSendError(null);
    setWaTargetPhone(q.clientPhone || '');
    
    // Generate Whatsapp Message Format
    const itemsText = q.items.map((it) => {
      const desc = it.description || '';
      const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
      return `• ${lines[0]}: Rp ${formatCurrency(it.amount)}`;
    }).join('\n');

    const token = q.publicToken || q.id;
    const publicUrl = `${window.location.origin}/q/${token}`;

    const text = `Yth. ${q.clientName},
Dengan hormat,

Bersama ini kami sampaikan penawaran harga resmi (Quotation) ${q.quotationNumber} atas rincian layanan berikut:

${itemsText}

Subtotal: Rp ${formatCurrency(q.subtotal)}
${q.taxAmount && q.taxAmount > 0 ? `Potongan Pajak PPh 21: Rp ${formatCurrency(q.taxAmount)}\n` : ''}Total Penawaran: Rp ${formatCurrency(q.totalAmount)}
${q.validUntil ? `Berlaku Hingga: ${new Date(q.validUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n` : ''}
Untuk rincian selengkapnya serta mengunduh dokumen PDF resmi, silakan buka tautan berikut:
${publicUrl}

Jika ada pertanyaan lebih lanjut, silakan hubungi kami kembali. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.

Hormat kami,
Notaris/PPAT Nukantini Putri Parincha, SH., M.Kn`;

    setWaMessage(text);
    setIsWaModalOpen(true);
  };

  const handleSendFonnteApi = async () => {
    if (!waTargetPhone.trim()) {
      setWaSendError('Nomor WhatsApp tujuan wajib diisi.');
      return;
    }
    const cleanNum = waTargetPhone.replace(/[^0-9]/g, '');
    if (!cleanNum.startsWith('62') && !cleanNum.startsWith('08') && !cleanNum.startsWith('8')) {
      setWaSendError('Format nomor HP Indonesia tidak valid.');
      return;
    }

    setIsSendingWa(true);
    setWaSendSuccess(null);
    setWaSendError(null);

    try {
      const userToken = await auth?.currentUser?.getIdToken();
      const response = await fetch(getApiUrl('/api/send-whatsapp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userToken ? `Bearer ${userToken}` : ''
        },
        body: JSON.stringify({
          target: cleanNum,
          message: waMessage
        })
      });

      const resJson = await response.json();
      if (response.ok && resJson.status === true) {
        setWaSendSuccess('Pesan penawaran berhasil dikirim via WhatsApp Gateway!');
        // Update status to SENT
        if (activeWaQuotation) {
          await QuotationService.updateQuotation(activeWaQuotation.id, { status: 'SENT' });
        }
      } else {
        throw new Error(resJson.reason || resJson.message || 'Gagal mengirim pesan');
      }
    } catch (err: any) {
      console.error('Error sending WA:', err);
      setWaSendError(err.message || 'Gagal terhubung ke WhatsApp Gateway.');
    } finally {
      setIsSendingWa(false);
    }
  };

  // Filter & Search logic
  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && q.status === statusFilter;
  });

  // Sort logic
  const sortedQuotations = [...filteredQuotations].sort((a, b) => {
    let valA = sortField === 'date' ? a.date : a.quotationNumber;
    let valB = sortField === 'date' ? b.date : b.quotationNumber;
    
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalItems = sortedQuotations.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedQuotations = sortedQuotations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Client dropdown list filtered
  const allClientsList = [...superappsClients, ...localClients].filter(c => {
    if (clientSourceTab === 'local') return c.source === 'local';
    if (clientSourceTab === 'superapps') return c.source === 'superapps';
    return true;
  }).filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  if (loading && viewMode === 'list') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mb-2" />
        <p className="text-sm text-slate-500 font-medium">Memuat data penawaran...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="text-sky-600 w-7 h-7" />
                SURAT PENAWARAN (QUOTATION)
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">Kelola dan terbitkan surat penawaran harga resmi kepada klien Notaris.</p>
            </div>
            <button
              onClick={openCreatePage}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl shadow-md shadow-sky-600/10 font-bold text-sm transition-all duration-150 cursor-pointer"
            >
              <Plus size={16} />
              <span>Buat Penawaran</span>
            </button>
          </div>

          {/* Quick Metrics / Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Semua Penawaran', value: quotations.length, color: 'text-slate-700', bg: 'bg-slate-50' },
              { label: 'Menunggu Persetujuan', value: quotations.filter(q => q.status === 'SENT' || q.status === 'DRAFT').length, color: 'text-amber-700', bg: 'bg-amber-50/50' },
              { label: 'Disetujui Klien', value: quotations.filter(q => q.status === 'ACCEPTED').length, color: 'text-emerald-700', bg: 'bg-emerald-50/50' },
              { label: 'Total Nilai Penawaran', value: `Rp ${formatCurrency(quotations.filter(q => q.status === 'ACCEPTED').reduce((sum, q) => sum + q.totalAmount, 0))}`, color: 'text-sky-700', bg: 'bg-sky-50/50', span: true }
            ].map((m, i) => (
              <div key={i} className={`p-4 rounded-2xl border border-slate-100 ${m.bg} ${m.span ? 'col-span-2 sm:col-span-1' : ''}`}>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{m.label}</p>
                <p className={`text-xl font-extrabold mt-1 truncate ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Search, Sort, Filters */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 rounded-xl max-w-max">
              {[
                { label: 'Semua', value: 'ALL' },
                { label: 'Draft', value: 'DRAFT' },
                { label: 'Dikirim', value: 'SENT' },
                { label: 'Disetujui', value: 'ACCEPTED' },
                { label: 'Ditolak', value: 'REJECTED' }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === tab.value
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari klien atau nomor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Sort Switch */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl">
                <button
                  onClick={() => { setSortField('number'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    sortField === 'number' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  No. Penawaran
                </button>
                <button
                  onClick={() => { setSortField('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    sortField === 'date' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tanggal
                </button>
              </div>
            </div>
          </div>

          {/* Quotations List Table */}
          {paginatedQuotations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <FileText className="text-slate-400 w-6 h-6" />
              </div>
              <p className="text-slate-500 text-sm font-semibold">Tidak ada surat penawaran ditemukan.</p>
              <p className="text-slate-400 text-xs mt-1">Silakan klik tombol "Buat Penawaran" untuk merancang penawaran pertama Anda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/55 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="p-4">No. Penawaran</th>
                      <th className="p-4">Klien</th>
                      <th className="p-4">Tanggal / Berlaku</th>
                      <th className="p-4 text-right">Total Nilai</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedQuotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-900">{q.quotationNumber}</td>
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-slate-800">{q.clientName}</p>
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 mt-0.5 rounded-md text-[10px] font-bold ${
                              q.clientSource === 'superapps' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {q.clientSource === 'superapps' ? <Database size={10} /> : <Building2 size={10} />}
                              {q.clientSource === 'superapps' ? 'Superapps' : 'Lokal Notaris'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-slate-500">
                          <p className="font-semibold">{new Date(q.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          {q.validUntil ? (
                            <p className="text-[10px] text-amber-600 font-medium mt-0.5">Hingga {new Date(q.validUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">-</p>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-extrabold text-slate-800">
                          Rp {formatCurrency(q.totalAmount)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            q.status === 'ACCEPTED' ? 'bg-green-50 text-green-700 border border-green-100' :
                            q.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-100' :
                            q.status === 'SENT' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {q.status === 'ACCEPTED' ? 'DISETUJUI' :
                             q.status === 'REJECTED' ? 'DITOLAK' :
                             q.status === 'SENT' ? 'TERKIRIM' : 'DRAFT'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1.5 justify-end items-center">
                            {/* Detail */}
                            <button
                              onClick={() => { setSelectedQuotation(q); setViewMode('detail'); }}
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Lihat Detail"
                            >
                              <ExternalLink size={15} />
                            </button>

                            {/* Share WA */}
                            <button
                              onClick={() => handleShareWhatsApp(q)}
                              className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                              title="Kirim Penawaran WA"
                            >
                              <Send size={15} />
                            </button>

                            {/* Download PDF */}
                            <button
                              onClick={() => handleDownloadPDF(q)}
                              className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                              title="Download PDF"
                            >
                              <Download size={15} />
                            </button>

                            {/* Actions Dropdown */}
                            <div className="relative">
                              <button
                                onClick={() => setShowMoreMenu(showMoreMenu === q.id ? null : q.id)}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                              >
                                <MoreVertical size={15} />
                              </button>
                              {showMoreMenu === q.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden">
                                  <button
                                    onClick={() => { openEditPage(q); setShowMoreMenu(null); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit2 size={13} /> Edit Penawaran
                                  </button>
                                  <button
                                    onClick={() => { copyPublicLink(q); setShowMoreMenu(null); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    {copiedToken === q.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                    {copiedToken === q.id ? 'Tersalin!' : 'Salin Tautan'}
                                  </button>
                                  <button
                                    onClick={() => { printQuotation(q); setShowMoreMenu(null); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Printer size={13} /> Cetak / Print
                                  </button>
                                  <div className="h-px bg-slate-100 my-1"></div>
                                  <button
                                    onClick={() => { handleDeleteQuotation(q.id); setShowMoreMenu(null); }}
                                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 size={13} /> Hapus Penawaran
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-semibold">
                <div>
                  Menampilkan {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-{Math.min(totalItems, currentPage * pageSize)} dari {totalItems} penawaran
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-slate-200 hover:bg-white rounded-lg disabled:opacity-55 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span>Halaman {currentPage} dari {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-slate-200 hover:bg-white rounded-lg disabled:opacity-55 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 2. CREATE / EDIT VIEW */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {viewMode === 'create' ? 'Buat Surat Penawaran Baru' : 'Edit Surat Penawaran'}
              </h2>
              <p className="text-xs text-slate-400">Rancang dan kalkulasikan rincian penawaran harga Anda.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Metadata */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">No. Penawaran</label>
                <input
                  type="text"
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-mono"
                  placeholder="Contoh: Q/2026/08/001"
                />
              </div>

              {/* Client Selection */}
              <div className="relative">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Penerima Penawaran (Klien)</label>
                  <button
                    type="button"
                    onClick={() => setIsNewClientModalOpen(true)}
                    className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus size={12} /> Tambah Klien Baru
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari dari master klien PT/CV..."
                      value={clientSearch || clientName}
                      onFocus={() => setShowClientDropdown(true)}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setClientName(e.target.value);
                        // Clear selected client references if user types manually
                        if (selectedClientId) {
                          setSelectedClientId('');
                          setSelectedClientSource(undefined);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    />
                    {showClientDropdown && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto p-1.5">
                        <div className="flex border-b border-slate-100 mb-1 pb-1 text-[11px] font-bold text-slate-400 gap-2 px-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setClientSourceTab('all'); }}
                            className={`pb-1 ${clientSourceTab === 'all' ? 'text-sky-600 border-b-2 border-sky-600' : ''}`}
                          >
                            Semua ({superappsClients.length + localClients.length})
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setClientSourceTab('local'); }}
                            className={`pb-1 ${clientSourceTab === 'local' ? 'text-sky-600 border-b-2 border-sky-600' : ''}`}
                          >
                            Lokal ({localClients.length})
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setClientSourceTab('superapps'); }}
                            className={`pb-1 ${clientSourceTab === 'superapps' ? 'text-sky-600 border-b-2 border-sky-600' : ''}`}
                          >
                            Superapps ({superappsClients.length})
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowClientDropdown(false); }}
                            className="ml-auto text-red-500 hover:text-red-600"
                          >
                            Tutup
                          </button>
                        </div>
                        {allClientsList.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">Klien tidak ditemukan</div>
                        ) : (
                          allClientsList.map((c) => (
                            <button
                              key={`${c.source}-${c.clientId}`}
                              type="button"
                              onClick={() => handleSelectClient(c)}
                              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 truncate">{c.name}</p>
                                <p className="text-slate-400 truncate mt-0.5">{c.email || c.phone || 'No Contact'}</p>
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                c.source === 'superapps' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                              }`}>
                                {c.source === 'superapps' ? 'Superapps' : 'Lokal'}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {(clientSearch || clientName) && (
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
                      className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Phone, Email, Address info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    placeholder="email@klien.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">No. HP/WA</label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    placeholder="08123456789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alamat Penerima</label>
                <textarea
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all h-16 resize-none"
                  placeholder="Alamat lengkap instansi/klien..."
                />
              </div>
            </div>

            {/* Right Column: Dates & Status */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tanggal Penawaran</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Berlaku Hingga</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status Penawaran</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="SENT">TERKIRIM (SENT)</option>
                  <option value="ACCEPTED">DISETUJUI (ACCEPTED)</option>
                  <option value="REJECTED">DITOLAK (REJECTED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Catatan / Ketentuan Penawaran</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all h-24 resize-none leading-relaxed"
                  placeholder="Catatan ketentuan tambahan..."
                />
              </div>
            </div>
          </div>

          {/* Rincian Penawaran (Items) Editor */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Rincian Layanan Penawaran</h3>
            
            {/* Add Item Panel */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Preset Layanan</label>
                  <select
                    value={selectedPresetProduct}
                    onChange={(e) => handlePresetSelect(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none"
                  >
                    {PRESET_PRODUCTS.map((prod) => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="text"
                    value={itemUnitPrice ? formatInputNumber(itemUnitPrice) : ''}
                    onChange={(e) => setItemUnitPrice(parseFormattedNumber(e.target.value))}
                    className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none font-mono font-bold text-slate-800"
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-3 flex flex-col justify-center gap-1.5 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemGrossUp}
                      onChange={(e) => setItemGrossUp(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700 text-xs whitespace-nowrap">Gross Up PPh 21</span>
                  </label>
                  {itemGrossUp && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">Tarif:</span>
                      <select
                        value={itemTaxRate}
                        onChange={(e) => setItemTaxRate(parseFloat(e.target.value))}
                        className="text-xs font-bold p-1 border border-sky-200 bg-sky-50 text-sky-800 rounded focus:outline-none"
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

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi & Rincian Layanan (Dapat Multi-baris)</label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-xl focus:outline-none leading-relaxed"
                  placeholder="Ketik rincian pekerjaan atau layanannya di sini..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus size={14} /> Tambah Item Rincian
                </button>
              </div>
            </div>

            {/* Items Table Preview */}
            {items.length === 0 ? (
              <p className="text-slate-400 text-xs italic text-center py-6">Belum ada item layanan. Tambahkan item di atas.</p>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="p-3">Rincian Deskripsi</th>
                      <th className="p-3 text-center w-20">Qty</th>
                      <th className="p-3 text-right w-32">Harga (Rp)</th>
                      <th className="p-3 text-center w-28">PPh 21</th>
                      <th className="p-3 text-right w-32">Subtotal</th>
                      <th className="p-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
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
                                className="w-4 h-4 text-sky-600 rounded cursor-pointer"
                              />
                              <span className="text-[10px] text-slate-600 font-semibold">Gross Up</span>
                            </label>
                            {it.isTaxed && (
                              <select
                                value={it.taxRate !== undefined ? it.taxRate : 0.05}
                                onChange={(e) => handleItemChange(idx, 'taxRate', parseFloat(e.target.value))}
                                className="text-[10px] font-bold p-1 border border-sky-200 bg-sky-50 text-sky-800 rounded focus:outline-none cursor-pointer"
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
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Subtotal, Tax and Save Controls */}
          <div className="border-t border-slate-100 pt-5 flex justify-end">
            <div className="w-72 space-y-1.5 text-right font-medium text-slate-700">
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span className="font-bold text-slate-900">Rp {formatCurrency(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Potongan Pajak (PPh 21):</span>
                  <span className="font-bold">({formatCurrency(taxAmount)})</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Total Penawaran:</span>
                <span className="font-bold text-sky-600">Rp {formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveQuotation}
              disabled={loading}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/10 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check size={14} />}
              Simpan Penawaran
            </button>
          </div>
        </div>
      )}

      {/* 3. DETAIL VIEW */}
      {viewMode === 'detail' && selectedQuotation && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">Detail Penawaran</h2>
                <p className="text-xs font-mono text-slate-400">{selectedQuotation.quotationNumber}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleShareWhatsApp(selectedQuotation)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Send size={14} /> Kirim WA
              </button>
              <button
                onClick={() => handleDownloadPDF(selectedQuotation)}
                disabled={downloadingPdf}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-55 cursor-pointer"
              >
                {downloadingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download size={14} />}
                {downloadingPdf ? 'Mengunduh...' : 'Download PDF'}
              </button>
              <button
                onClick={() => printQuotation(selectedQuotation)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer size={14} /> Print
              </button>
              <button
                onClick={() => { copyPublicLink(selectedQuotation); }}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedToken === selectedQuotation.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedToken === selectedQuotation.id ? 'Tersalin!' : 'Copy Link'}
              </button>
              <button
                onClick={() => openEditPage(selectedQuotation)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit2 size={14} /> Edit
              </button>
            </div>
          </div>

          {/* Document Preview Frame */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-100">
              <div>
                <h1 className="text-lg md:text-xl font-black text-slate-950 uppercase tracking-tight text-sky-700 leading-tight">
                  NOTARIS/PPAT NUKANTINI PUTRI PARINCHA, SH. M.Kn
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang, Bandung Barat, 40391 | 08112007061
                </p>
              </div>

              <div className="text-left md:text-right space-y-1">
                <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-md text-[10px] font-black uppercase tracking-wider">
                  SURAT PENAWARAN
                </span>
                <p className="text-sm font-mono font-bold text-slate-900 mt-1">{selectedQuotation.quotationNumber}</p>
                <p className="text-xs text-slate-400">Tanggal: {new Date(selectedQuotation.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {selectedQuotation.validUntil && (
                  <p className="text-xs text-amber-600 font-semibold">Berlaku Hingga: {new Date(selectedQuotation.validUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                )}
              </div>
            </div>

            {/* Parties Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Dari</h4>
                <p className="font-extrabold text-slate-800">Notaris/PPAT Nukantini Putri Parincha</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dago Giri, Mekarwangi, Lembang, Bandung Barat<br />
                  Telp: 08112007061
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Penawaran Kepada</h4>
                <p className="font-extrabold text-slate-800">{selectedQuotation.clientName}</p>
                {selectedQuotation.clientAddress && (
                  <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{selectedQuotation.clientAddress}</p>
                )}
                {selectedQuotation.clientPhone && (
                  <p className="text-xs text-slate-500">HP: {selectedQuotation.clientPhone}</p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-100">
                    <th className="p-4 text-left">DESKRIPSI RINCIAN LAYANAN</th>
                    <th className="p-4 text-right w-36">JUMLAH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {selectedQuotation.items.map((it, idx) => {
                    const lines = (it.description || '').split('\n');
                    return (
                      <tr key={it.id || idx}>
                        <td className="p-4 text-slate-700">
                          <div className="space-y-1 font-sans">
                            {lines.map((line, lIdx) => {
                              const trimmed = line.trim();
                              const isHeader = /^[0-9]+\./.test(trimmed);
                              return (
                                <p
                                  key={lIdx}
                                  className={`${isHeader ? 'font-bold text-slate-900 text-xs sm:text-sm' : 'text-slate-600 pl-3 text-xs sm:text-sm'}`}
                                >
                                  {trimmed}
                                </p>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-800 align-top">
                          Rp {formatCurrency(it.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer Calculations & Terms */}
            <div className="flex flex-col-reverse md:flex-row justify-between gap-8 pt-4">
              <div className="md:w-1/2 space-y-4">
                {selectedQuotation.notes && (
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Catatan / Ketentuan:</h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {selectedQuotation.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="md:w-1/2 space-y-3">
                <div className="flex justify-between text-xs sm:text-sm text-slate-500 font-semibold">
                  <span>Subtotal</span>
                  <span className="font-mono">Rp {formatCurrency(selectedQuotation.subtotal || selectedQuotation.totalAmount)}</span>
                </div>
                {selectedQuotation.taxAmount && selectedQuotation.taxAmount > 0 ? (
                  <div className="flex justify-between text-xs sm:text-sm text-red-500 font-semibold">
                    <span>Potongan Pajak (PPh 21)</span>
                    <span className="font-mono">({formatCurrency(selectedQuotation.taxAmount)})</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-slate-950 font-black text-sm sm:text-base pt-3 border-t border-slate-100">
                  <span>Total Penawaran</span>
                  <span className="font-mono text-sky-700">Rp {formatCurrency(selectedQuotation.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. QUICK ADD CLIENT MODAL */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <UserPlus className="text-sky-600" size={18} /> Pendaftaran Klien Baru
              </h3>
              <button
                onClick={() => setIsNewClientModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-500 uppercase mb-1">Nama Perusahaan / Klien</label>
                <input
                  type="text"
                  placeholder="Contoh: PT MAJU MUNDUR SEJAHTERA"
                  value={newClientNameInput}
                  onChange={(e) => setNewClientNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Tipe Badan Hukum</label>
                <select
                  value={newClientTypeInput}
                  onChange={(e) => setNewClientTypeInput(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                >
                  <option value="PT">PT</option>
                  <option value="CV">CV</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Domisili Kedudukan</label>
                <input
                  type="text"
                  placeholder="Contoh: Jakarta Selatan"
                  value={newClientDomicileInput}
                  onChange={(e) => setNewClientDomicileInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Email Klien</label>
                <input
                  type="email"
                  placeholder="corporate@client.com"
                  value={newClientEmailInput}
                  onChange={(e) => setNewClientEmailInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">No. HP / WA Kantor</label>
                <input
                  type="text"
                  placeholder="0812XXXXXXXX"
                  value={newClientPhoneInput}
                  onChange={(e) => setNewClientPhoneInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-500 uppercase mb-1">Alamat Kantor Lengkap</label>
                <textarea
                  placeholder="Tuliskan jalan, kelurahan, kecamatan..."
                  value={newClientAddressInput}
                  onChange={(e) => setNewClientAddressInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white h-16 resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Nama PIC (Hubungan)</label>
                <input
                  type="text"
                  placeholder="Nama Penanggung Jawab..."
                  value={newClientPicNameInput}
                  onChange={(e) => setNewClientPicNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">No. HP PIC</label>
                <input
                  type="text"
                  placeholder="No. Telp PIC..."
                  value={newClientPicPhoneInput}
                  onChange={(e) => setNewClientPicPhoneInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateQuickClient}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                Simpan & Daftarkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. WHATSAPP SHARE MODAL */}
      {isWaModalOpen && activeWaQuotation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Smartphone className="text-emerald-600" size={18} /> Kirim Penawaran via WhatsApp
              </h3>
              <button
                onClick={() => setIsWaModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Nomor WhatsApp Tujuan</label>
                <input
                  type="text"
                  placeholder="Contoh: 0811XXXXXX"
                  value={waTargetPhone}
                  onChange={(e) => setWaTargetPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Isi Pesan Penawaran</label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={10}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white h-48 resize-none font-sans leading-relaxed"
                />
              </div>

              {waSendError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex gap-2 items-center">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{waSendError}</span>
                </div>
              )}

              {waSendSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs flex gap-2 items-center">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{waSendSuccess}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 pt-4 gap-2">
              <a
                href={`https://wa.me/${waTargetPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <MessageSquare size={14} /> Gunakan WA Web Fallback
              </a>

              <button
                type="button"
                onClick={handleSendFonnteApi}
                disabled={isSendingWa}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isSendingWa ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SendHorizontal size={14} />}
                Kirim via Gateway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
