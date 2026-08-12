import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from "../ui/PageLayout";
import { Quotation, InvoiceItem, Invoice, Product } from '../../../types';
import { QuotationService } from '../../services/QuotationService';
import { InvoiceService } from '../../services/InvoiceService';
import { ProductService } from '../../services/ProductService';
import { CompanyService } from '../../services/CompanyService';
import { ProjectService } from '../../services/ProjectService';
import { Project } from '../../domain/project/Project';
import { SuperappsClientService } from '../../services/superappsClientService';
import { formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import { printQuotation, downloadQuotationPdf } from '../../utils/quotationHtmlGenerator';
import { calculateInvoiceTotals, getItemSubtotal, getItemTax } from '../../services/taxCalculator';
import { getApiUrl } from '../../lib/api';
import { auth } from '../../lib/firebase';
import { resolveClientPhone } from '../../utils/clientPhoneResolver';
import {
  Plus, Edit2, Trash2, Printer, Search, X, Copy, ExternalLink,
  Check, CreditCard, DollarSign, Globe, CheckCircle2, AlertCircle, FileText, Share2,
  Building2, Database, ArrowLeft, Download, Send, SendHorizontal, Smartphone, MessageSquare, ChevronLeft, ChevronRight, UserPlus,
  MoreHorizontal, Calendar, Clock, ChevronUp, ChevronDown, MoreVertical, RefreshCw, FolderOpen, Briefcase
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

const MobileQuotationRow: React.FC<{
  quotation: Quotation;
  onClick: () => void;
  onDelete: () => void;
  formatCurrency: (val?: number) => string;
}> = ({ quotation, onClick, onDelete, formatCurrency }) => {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;
    if (diff < 0) setTranslateX(Math.max(diff, -80));
    else setTranslateX(0);
  };
  const handleTouchEnd = () => { setTranslateX(translateX < -40 ? -80 : 0); startX.current = null; };

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-y-0 right-0 w-20 bg-red-600 flex items-center justify-center text-white z-0 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 size={18} />
      </div>
      <div
        className="relative z-10 bg-white p-4 flex justify-between items-center active:bg-slate-50 transition-transform cursor-pointer"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => (translateX < -10 ? setTranslateX(0) : onClick())}
      >
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{quotation.clientName}</p>
          <div className="text-xs text-slate-500">{quotation.quotationNumber}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            Rp {formatCurrency(quotation.totalAmount)}
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </div>
    </div>
  );
};

interface QuotationGeneratorProps {
  setActiveSidebarTab?: (tab: string) => void;
  [key: string]: any;
}

export const QuotationGenerator: React.FC<QuotationGeneratorProps> = (props) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'list' | 'create' | 'edit' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Convert Quotation to Invoice State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sorting State
  const [sortField, setSortField] = useState<'date' | 'number'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [quotationLimit, setQuotationLimit] = useState(50);

  // PDF Export & Language State
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [docLang, setDocLang] = useState<'id' | 'en'>('id');

  // WhatsApp Share Modal States
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waTargetPhone, setWaTargetPhone] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waSendSuccess, setWaSendSuccess] = useState<string | null>(null);
  const [waSendError, setWaSendError] = useState<string | null>(null);
  const [activeWaQuotation, setActiveWaQuotation] = useState<Quotation | null>(null);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [showDetailMoreMenu, setShowDetailMoreMenu] = useState(false);
  const [waSendMode, setWaSendMode] = useState<'NUMBER' | 'GROUP'>('GROUP');
  const [waGroups, setWaGroups] = useState<any[]>([]);
  const [selectedWaGroupId, setSelectedWaGroupId] = useState('');
  const [isLoadingWaGroups, setIsLoadingWaGroups] = useState(false);
  const [isSyncingWaGroups, setIsSyncingWaGroups] = useState(false);
  const detailMoreMenuRef = useRef<HTMLDivElement>(null);

  // Form Fields
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientSource, setSelectedClientSource] = useState<'local' | 'superapps' | undefined>(undefined);
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'>('SENT');
  const [notes, setNotes] = useState('Penawaran ini berlaku selama 14 hari sejak tanggal diterbitkan.\nPembayaran dilakukan sesuai dengan kesepakatan.');

  // Items Form
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Add Item Temp Inputs
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (viewMode === 'list') {
      return;
    }
    const startTime = performance.now();
    const unsubscribe = ProductService.subscribeProducts((data) => {
      const duration = (performance.now() - startTime).toFixed(2);
      const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setDbProducts(sorted);
      console.log(`[QuotationPerformance] Lazy load: products subscribed successfully. Items count: ${sorted.length}. Time: ${duration}ms. Source: Products Cache/Listener`);
    });
    return () => unsubscribe();
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'list') {
      return;
    }
    const startTime = performance.now();
    const isProjectCompleted = (status: string) => {
      const s = (status || '').toLowerCase();
      return s === 'completed' || s === 'archived' || s === 'selesai';
    };
    const unsubscribe = ProjectService.subscribeProjects((data) => {
      const duration = (performance.now() - startTime).toFixed(2);
      const active = data.filter(p => p && p.status && !isProjectCompleted(p.status));
      setActiveProjects(active);
      console.log(`[QuotationPerformance] Lazy load: active projects subscribed. Active projects count: ${active.length}. Time: ${duration}ms.`);
    });
    return () => unsubscribe();
  }, [viewMode]);

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

  // Load Quotations with dynamic query limit & console reports
  useEffect(() => {
    const startTime = performance.now();
    const unsub = QuotationService.subscribeQuotations((data) => {
      const duration = (performance.now() - startTime).toFixed(2);
      setQuotations(data);
      if (selectedQuotation) {
        const updated = data.find(q => q.id === selectedQuotation.id);
        if (updated) {
          setSelectedQuotation(updated);
        }
      }
      setLoading(false);
      
      // Beautiful console-level performance instrumentation report
      console.log(`
[QuotationPerformance]
====================================
Initial / Updated Page Load Complete
------------------------------------
Quotation Reads Limit: ${quotationLimit}
Quotations Loaded: ${data.length}
Load Duration: ${duration}ms
Database Network Request: YES (Realtime Listener Active)
Active Tab View: ${viewMode}
====================================`);
    }, quotationLimit);
    return () => unsub();
  }, [selectedQuotation?.id, quotationLimit, viewMode]);

  // Expand the query-level limit when near or exceeding current loaded size
  useEffect(() => {
    if (currentPage * pageSize >= quotationLimit) {
      console.log(`[QuotationPerformance] Dynamic expansion triggered. Current index (${currentPage * pageSize}) matches/exceeds limit (${quotationLimit}). Upgrading query limit to ${quotationLimit + 50}.`);
      setQuotationLimit(prev => prev + 50);
    }
  }, [currentPage, pageSize, quotationLimit]);

  // Load Invoices lazily to check linked invoice relationships
  useEffect(() => {
    if (viewMode === 'list') {
      return;
    }
    const startTime = performance.now();
    const unsub = InvoiceService.subscribeInvoices((data) => {
      const duration = (performance.now() - startTime).toFixed(2);
      setInvoices(data);
      console.log(`[QuotationPerformance] Lazy load: invoices subscribed successfully. Count: ${data.length}. Time: ${duration}ms.`);
    });
    return () => unsub();
  }, [viewMode]);

  // Listen for target quotation navigation from Invoice or URL / localStorage
  useEffect(() => {
    const checkTargetQuotation = () => {
      const targetId = localStorage.getItem('selected_quotation_id');
      if (targetId && quotations.length > 0) {
        const found = quotations.find(q => q.id === targetId || q.quotationNumber === targetId);
        if (found) {
          setSelectedQuotation(found);
          setViewMode('detail');
          localStorage.removeItem('selected_quotation_id');
        }
      }
    };
    checkTargetQuotation();

    const handleCustomEvent = (e: any) => {
      const qId = e.detail?.id;
      if (qId && quotations.length > 0) {
        const found = quotations.find(q => q.id === qId || q.quotationNumber === qId);
        if (found) {
          setSelectedQuotation(found);
          setViewMode('detail');
        }
      }
    };

    window.addEventListener('open_quotation_detail', handleCustomEvent);
    return () => window.removeEventListener('open_quotation_detail', handleCustomEvent);
  }, [quotations]);

  // Helper: Find linked invoice for a quotation
  const getLinkedInvoice = (q: Quotation | null): Invoice | null => {
    if (!q) return null;
    if (q.invoiceId) {
      const found = invoices.find(inv => inv.id === q.invoiceId);
      if (found) return found;
    }
    return invoices.find(inv => inv.quotationId === q.id || inv.quotationNumber === q.quotationNumber) || null;
  };

  // Navigation handler to open Invoice Detail
  const handleNavigateToInvoice = (invId: string) => {
    localStorage.setItem('selected_invoice_id', invId);
    window.dispatchEvent(new CustomEvent('open_invoice_detail', { detail: { id: invId } }));
    if (props.setActiveSidebarTab) {
      props.setActiveSidebarTab('invoice');
    } else {
      window.location.hash = '#/invoice';
    }
  };

  // Open Create Invoice Modal with validation
  const handleOpenCreateInvoiceModal = () => {
    if (!selectedQuotation) return;

    if (selectedQuotation.status !== 'ACCEPTED') {
      alert('Invoice hanya dapat dibuat untuk Penawaran yang sudah disetujui (status ACCEPTED).');
      return;
    }

    const existingInv = getLinkedInvoice(selectedQuotation);
    if (existingInv) {
      alert(`Penawaran ini sudah memiliki Invoice ${existingInv.invoiceNumber}.`);
      handleNavigateToInvoice(existingInv.id);
      return;
    }

    setShowConvertModal(true);
  };

  // Confirm and execute Invoice Creation from Quotation
  const handleConfirmCreateInvoice = async () => {
    if (!selectedQuotation) return;
    setIsConverting(true);

    try {
      // Re-verify against existing invoices to prevent duplicate
      const existingInv = getLinkedInvoice(selectedQuotation);
      if (existingInv) {
        alert(`Penawaran ini sudah memiliki Invoice ${existingInv.invoiceNumber}.`);
        setShowConvertModal(false);
        setIsConverting(false);
        handleNavigateToInvoice(existingInv.id);
        return;
      }

      // Generate invoice number
      const year = new Date().getFullYear();
      const countThisYear = invoices.length + 1;
      const nextNum = countThisYear.toString().padStart(3, '0');
      const generatedInvNum = `INV/${year}/${nextNum}`;

      const today = new Date();
      const due = new Date();
      due.setDate(today.getDate() + 14);
      const issueDateStr = today.toISOString().split('T')[0];
      const dueDateStr = due.toISOString().split('T')[0];

      const newInvoiceData: Omit<Invoice, 'id'> = {
        invoiceNumber: generatedInvNum,
        clientName: selectedQuotation.clientName,
        clientId: selectedQuotation.clientId || '',
        clientSource: selectedQuotation.clientSource,
        clientEmail: selectedQuotation.clientEmail || '',
        clientPhone: selectedQuotation.clientPhone || '',
        clientAddress: selectedQuotation.clientAddress || '',
        issueDate: issueDateStr,
        dueDate: dueDateStr,
        status: 'UNPAID',
        items: selectedQuotation.items ? selectedQuotation.items.map(it => ({ ...it })) : [],
        subtotal: selectedQuotation.subtotal || 0,
        taxAmount: selectedQuotation.taxAmount || 0,
        totalAmount: selectedQuotation.totalAmount || 0,
        paidAmount: 0,
        balanceDue: selectedQuotation.totalAmount || 0,
        notes: selectedQuotation.notes || 'Pemotongan pajak PPh Pasal 21 harus disetorkan paling lambat tanggal 10 bulan berikutnya, untuk mencegah sanksi Ditjen Pajak.',
        terms: 'Pembayaran dilakukan maksimal 14 hari setelah invoice diterbitkan.',
        quotationId: selectedQuotation.id,
        quotationNumber: selectedQuotation.quotationNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newInvoiceId = await InvoiceService.addInvoice(newInvoiceData);

      await QuotationService.updateQuotation(selectedQuotation.id, {
        invoiceId: newInvoiceId,
        invoiceNumber: generatedInvNum
      });

      setSelectedQuotation(prev => prev ? { ...prev, invoiceId: newInvoiceId, invoiceNumber: generatedInvNum } : null);
      setShowConvertModal(false);

      // Directly navigate user to Invoice view
      handleNavigateToInvoice(newInvoiceId);
    } catch (err) {
      console.error('Error creating invoice from quotation:', err);
      alert('Gagal membuat invoice. Silakan coba lagi.');
    } finally {
      setIsConverting(false);
    }
  };

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
    if (viewMode !== 'list' || showClientDropdown) {
      loadClientOptions();
    }
  }, [viewMode, showClientDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailMoreMenuRef.current && !detailMoreMenuRef.current.contains(event.target as Node)) {
        setShowDetailMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    setSelectedProjectId('');
    setSelectedProjectIds([]);
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
    
    setStatus('SENT');
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
    setSelectedProjectId(q.projectId || '');
    setSelectedProjectIds(q.projectIds || (q.projectId ? [q.projectId] : []));
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
    setClientEmail(c.email || '');
    setClientPhone(c.phone || '');
    setClientAddress(c.address || '');
    setSelectedProjectIds([]);
    setSelectedProjectId('');
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
      const dbProd = dbProducts.find(p => p.name === val);
      if (dbProd) {
        setItemDescription(dbProd.description || val);
        setItemUnitPrice(dbProd.unitPrice || 0);
        setItemGrossUp(!!dbProd.isTaxed);
      } else {
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

  const handleClearClient = () => {
    setSelectedClientId('');
    setSelectedClientSource(undefined);
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientAddress('');
    setSelectedProjectIds([]);
    setSelectedProjectId('');
    setClientSearch('');
  };

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => {
      const next = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      setSelectedProjectId(next[0] || '');
      return next;
    });
  };

  const handleSaveQuotation = async () => {
    if (selectedProjectIds.length === 0) {
      alert('Mohon hubungkan setidaknya satu proyek aktif terlebih dahulu.');
      return;
    }
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

    const projectTitles = selectedProjectIds.map(id => {
      const p = activeProjects.find(proj => proj.projectId === id);
      if (p) return p.title;
      if (selectedQuotation && selectedQuotation.projectIds?.includes(id)) {
        const idx = selectedQuotation.projectIds.indexOf(id);
        if (selectedQuotation.projectTitles && selectedQuotation.projectTitles[idx]) {
          return selectedQuotation.projectTitles[idx];
        }
      }
      return 'Proyek';
    });

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
      projectId: selectedProjectIds[0] || '',
      projectTitle: projectTitles.join(', '),
      projectIds: selectedProjectIds,
      projectTitles: projectTitles,
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
      await downloadQuotationPdf(q, undefined, docLang);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Gagal mengunduh file PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const fetchWaGroups = async () => {
    setIsLoadingWaGroups(true);
    try {
      const userToken = await auth?.currentUser?.getIdToken();
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
        setWaGroups(fetchedGroups);
        
        // Auto search/select for 'KANTOR NOTARIS/PPAT' case-insensitively
        const found = fetchedGroups.find((g: any) => 
          g.name && g.name.toUpperCase().includes('KANTOR NOTARIS/PPAT')
        ) || fetchedGroups.find((g: any) => 
          g.name && (g.name.toUpperCase().includes('NOTARIS') || g.name.toUpperCase().includes('PPAT'))
        );

        if (found) {
          setSelectedWaGroupId(found.id);
        } else if (fetchedGroups.length > 0) {
          setSelectedWaGroupId(fetchedGroups[0].id);
        }
      } else {
        console.warn("Gagal mendapatkan grup WhatsApp:", resData.error || "Format tidak sesuai.");
      }
    } catch (err: any) {
      console.error("Gagal memuat daftar grup WhatsApp:", err);
    } finally {
      setIsLoadingWaGroups(false);
    }
  };

  const handleSyncWaGroups = async () => {
    setIsSyncingWaGroups(true);
    try {
      const userToken = await auth?.currentUser?.getIdToken();
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
        setWaSendSuccess(resData.message || 'Sinkronisasi berhasil! Memuat ulang...');
        await fetchWaGroups();
      } else {
        setWaSendError(resData.error || 'Sinkronisasi gagal.');
      }
    } catch (err: any) {
      setWaSendError(err.message || 'Koneksi error saat menyinkronkan grup.');
    } finally {
      setIsSyncingWaGroups(false);
    }
  };

  useEffect(() => {
    if (isWaModalOpen) {
      fetchWaGroups();
    }
  }, [isWaModalOpen]);

  // WhatsApp Portal Logic
  const handleShareWhatsApp = async (q: Quotation) => {
    try {
      setActiveWaQuotation(q);
      setWaSendSuccess(null);
      setWaSendError(null);
      setWaSendMode('NUMBER');
      setIsWaModalOpen(true);
      setWaTargetPhone('');

      const resolvedPhone = await resolveClientPhone({
        clientId: q.clientId,
        clientName: q.clientName,
        clientPhone: q.clientPhone,
        clientSource: q.clientSource,
        localClients,
        superappsClients,
      });

      if (resolvedPhone) {
        setWaTargetPhone(resolvedPhone);
        
        // Auto-sync back to Quotation document in Firestore
        if (resolvedPhone !== q.clientPhone) {
          try {
            await QuotationService.updateQuotation(q.id, { clientPhone: resolvedPhone });
            console.log('[QuotationGenerator] Auto-synced clientPhone back to quotation:', resolvedPhone);
          } catch (err) {
            console.warn('[QuotationGenerator] Failed to auto-sync clientPhone to quotation:', err);
          }
        }
      } else {
        setWaTargetPhone('');
      }

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
${q.taxAmount && q.taxAmount > 0 ? `Potongan PPh 21: Rp ${formatCurrency(q.taxAmount)}\n` : ''}Total Estimasi: Rp ${formatCurrency(q.totalAmount)}
${q.validUntil ? `Berlaku Hingga: ${new Date(q.validUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n` : ''}
Untuk rincian selengkapnya serta mengunduh dokumen PDF resmi, silakan buka tautan berikut:
${publicUrl}

Jika ada pertanyaan lebih lanjut, silakan hubungi kami kembali. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.

Hormat kami,
Notaris/PPAT Nukantini Putri Parincha, SH., M.Kn`;

      setWaMessage(text);
    } catch (err) {
      console.error('Error sharing WA for quotation:', err);
    }
  };

  const handleSendFonnteApi = async () => {
    let finalTarget = '';
    let targetLabel = '';

    if (waSendMode === 'GROUP') {
      if (!selectedWaGroupId) {
        setWaSendError('Silakan pilih WhatsApp Group tujuan terlebih dahulu.');
        return;
      }
      finalTarget = selectedWaGroupId;
      const matchedGroup = waGroups.find(g => g.id === selectedWaGroupId);
      targetLabel = matchedGroup ? matchedGroup.name : 'WhatsApp Group';
    } else {
      if (!waTargetPhone.trim()) {
        setWaSendError('Nomor WhatsApp tujuan harus diisi.');
        return;
      }
      const cleanNum = waTargetPhone.replace(/[^0-9]/g, '');
      if (!cleanNum.startsWith('62') && !cleanNum.startsWith('08') && !cleanNum.startsWith('8')) {
        setWaSendError('Format nomor tujuan tidak valid. Masukkan nomor HP Indonesia yang valid.');
        return;
      }
      finalTarget = cleanNum;
      targetLabel = cleanNum;
    }

    setIsSendingWa(true);
    setWaSendSuccess(null);
    setWaSendError(null);

    try {
      const userToken = await auth?.currentUser?.getIdToken();
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }

      const response = await fetch(getApiUrl('/api/send-whatsapp'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target: finalTarget,
          message: waMessage
        })
      });

      const resText = await response.text();
      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        throw new Error("Respon dari server tidak valid.");
      }

      if (response.ok && (resData.status === true || resData.success === true || resData.status === 'success' || resData.status === 'sent')) {
        setWaSendSuccess(`Pesan WhatsApp penawaran berhasil dikirim ke ${targetLabel} via Fonnte!`);
        if (activeWaQuotation) {
          await QuotationService.updateQuotation(activeWaQuotation.id, { status: 'SENT' });
        }
      } else {
        setWaSendError(resData.message || resData.error || 'Gagal mengirim pesan via Fonnte. Silakan cek status WhatsApp Gateway.');
      }
    } catch (err: any) {
      setWaSendError(err.message || 'Terjadi kesalahan saat menghubungi server.');
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
  const filteredClientOptions = superappsClients.filter(c => 
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
    <div className="p-4 sm:p-6 lg:p-8 w-[94%] xl:w-[92%] max-w-none mx-auto space-y-6">
      
      {/* 1. LIST VIEW */}
      {viewMode === 'list' && (
        <>
          {/* Header */}
          <PageHeader
            title="Penawaran"
            description="Kelola penawaran layanan dan biaya kepada klien."
            actions={
              <button
                onClick={openCreatePage}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus size={16} />
                Buat Penawaran
              </button>
            }
          />

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
              {[
                { label: 'SEMUA', value: 'ALL' },
                { label: 'TERKIRIM', value: 'SENT' },
                { label: 'DISETUJUI', value: 'ACCEPTED' },
                { label: 'DITOLAK', value: 'REJECTED' }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === tab.value
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quotations List */}
          {paginatedQuotations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <FileText className="text-slate-400 w-6 h-6" />
              </div>
              <p className="text-slate-500 text-sm font-semibold">Tidak ada surat penawaran ditemukan.</p>
              <p className="text-slate-400 text-xs mt-1">Silakan klik tombol "Buat Penawaran" untuk merancang penawaran pertama Anda.</p>
            </div>
          ) : (
            <>
              {/* ===== MOBILE LIST (< md) ===== */}
              <div className="md:hidden border border-slate-200 rounded-2xl overflow-hidden bg-white divide-y divide-slate-100 shadow-xs">
                {paginatedQuotations.map((q) => (
                  <MobileQuotationRow
                    key={q.id}
                    quotation={q}
                    onClick={() => { setSelectedQuotation(q); setViewMode('detail'); }}
                    onDelete={() => handleDeleteQuotation(q.id)}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </div>

              {/* ===== DESKTOP LIST (md+) ===== */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="min-w-[1000px] w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 font-bold select-none">
                        <th className="p-3.5 w-12 text-center">No.</th>
                        <th
                          className="p-3.5 cursor-pointer hover:bg-slate-100/80 transition-all"
                          onClick={() => {
                            setSortField('date');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            Tanggal
                            {sortField === 'date' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-blue-600" /> : <ChevronDown size={13} className="text-blue-600" />
                            ) : (
                              <span className="text-slate-300 group-hover:text-slate-400">↕</span>
                            )}
                          </div>
                        </th>
                        <th
                          className="p-3.5 cursor-pointer hover:bg-slate-100/80 transition-all"
                          onClick={() => {
                            setSortField('number');
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            No. Penawaran
                            {sortField === 'number' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-blue-600" /> : <ChevronDown size={13} className="text-blue-600" />
                            ) : (
                              <span className="text-slate-300 group-hover:text-slate-400">↕</span>
                            )}
                          </div>
                        </th>
                        <th className="p-3.5">Klien</th>
                        <th className="p-3.5 text-right">Total</th>
                        <th className="p-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedQuotations.map((q, idx) => {
                        const qDate = new Date(q.date);
                        const formattedDateStr = `${qDate.getDate()}/${qDate.getMonth() + 1}/${qDate.getFullYear()}`;
                        return (
                          <tr
                            key={q.id}
                            onClick={() => { setSelectedQuotation(q); setViewMode('detail'); }}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                          >
                            <td className="p-3.5 text-center text-slate-500 font-semibold whitespace-nowrap">
                              {(currentPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="p-3.5 text-slate-600 font-medium whitespace-nowrap">
                              {formattedDateStr}
                            </td>
                            <td className="p-3.5 font-bold text-blue-600 group-hover:underline whitespace-nowrap">
                              {q.quotationNumber}
                            </td>
                            <td className="p-3.5 font-semibold text-slate-800">
                              <div>{q.clientName}</div>
                              {q.projectTitle && (
                                <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                                  Proyek: {q.projectTitle}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(q.totalAmount)}
                            </td>
                            <td className="p-3.5 text-center whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                                q.status === 'ACCEPTED' ? 'bg-emerald-100/80 text-emerald-700' :
                                q.status === 'REJECTED' ? 'bg-red-100/80 text-red-600' :
                                q.status === 'SENT' ? 'bg-blue-100/80 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {q.status === 'ACCEPTED' ? 'DISETUJUI' :
                                 q.status === 'REJECTED' ? 'DITOLAK' :
                                 q.status === 'SENT' ? 'TERKIRIM' : q.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-semibold select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">Tampilkan</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>baris. Menampilkan {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-{Math.min(totalItems, currentPage * pageSize)} dari {totalItems} penawaran.</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
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
                                  currentPage === page
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
                      disabled={currentPage === totalPages}
                      className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Halaman Berikutnya"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
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

              {/* Client Selection (Client-first flow) */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 relative">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase mb-1">
                  <FolderOpen size={14} className="text-blue-600" />
                  Hubungkan Proyek & Klien <span className="text-red-500">* Wajib</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal mb-2">
                  Pilih Klien terlebih dahulu, kemudian hubungkan dengan satu atau lebih proyek aktif milik Klien tersebut.
                </p>

                {/* Client Searchable Dropdown */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ketik nama klien, email, atau alamat..."
                    value={clientSearch || clientName}
                    onFocus={() => setShowClientDropdown(true)}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setClientName(e.target.value);
                      setShowClientDropdown(true);
                      if (selectedClientId) {
                        setSelectedClientId('');
                        setSelectedClientSource(undefined);
                        setSelectedProjectIds([]);
                        setSelectedProjectId('');
                      }
                    }}
                    className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {(clientName || clientSearch) && (
                    <button
                      type="button"
                      onClick={handleClearClient}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {showClientDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-48 overflow-y-auto p-1">
                      {isLoadingClients ? (
                        <div className="p-2.5 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                          <div className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                          Memuat klien...
                        </div>
                      ) : filteredClientOptions.length === 0 ? (
                        <div className="p-2.5 text-center text-slate-400 text-xs italic">
                          Tidak ada klien yang cocok.
                        </div>
                      ) : (
                        filteredClientOptions.map((c) => (
                          <div
                            key={`${c.source}_${c.clientId}`}
                            onClick={() => handleSelectClient(c)}
                            className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 text-xs truncate max-w-[160px] block">{c.name}</span>
                                <span className={`text-[8px] px-1 py-0.1 rounded font-bold uppercase ${
                                  c.source === 'superapps'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {c.source === 'superapps' ? 'SA' : 'Lokal'}
                                </span>
                              </div>
                            </div>
                            {selectedClientId === c.clientId && (
                              <Check size={14} className="text-sky-600 shrink-0" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Client Contact Inputs (Editable when selected) */}
                {selectedClientId && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/50 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-slate-800"
                          placeholder="email@klien.com"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">No. HP/WA</label>
                        <input
                          type="text"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-slate-800"
                          placeholder="08123456789"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Alamat Penerima</label>
                      <textarea
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all h-12 resize-none text-slate-800"
                        placeholder="Alamat lengkap instansi/klien..."
                      />
                    </div>
                  </div>
                )}

                {/* Project List Checkboxes */}
                {selectedClientId && (
                  <div className="pt-2 border-t border-slate-200/50 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">
                      Pilih Proyek Aktif ({activeProjects.filter(p => p.clientId === selectedClientId).length} Proyek) <span className="text-red-500">*</span>
                    </label>
                    {activeProjects.filter(p => p.clientId === selectedClientId).length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic">Klien ini tidak memiliki proyek aktif.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {activeProjects.filter(p => p.clientId === selectedClientId).map((p) => {
                          const isChecked = selectedProjectIds.includes(p.projectId);
                          return (
                            <div
                              key={p.projectId}
                              onClick={() => handleToggleProject(p.projectId)}
                              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-2 select-none ${
                                isChecked 
                                  ? 'border-sky-500 bg-sky-50/40 text-slate-900 font-medium' 
                                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by click
                                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500/20"
                              />
                              <span className="text-[11px] truncate flex-1">{p.title}</span>
                              <span className="bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded text-[8px] uppercase shrink-0 font-semibold">
                                {p.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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
                  <option value="SENT">TERKIRIM</option>
                  <option value="ACCEPTED">DISETUJUI</option>
                  <option value="REJECTED">DITOLAK</option>
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
                    <option value="-- Manual --">-- Manual --</option>
                    {dbProducts.length > 0 && (
                      <optgroup label="Produk & Layanan Anda">
                        {dbProducts.map((p) => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Template Default">
                      {PRESET_PRODUCTS.filter(p => p !== '-- Manual --').map((prod) => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </optgroup>
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
                  <span>Potongan PPh 21:</span>
                  <span className="font-bold">({formatCurrency(taxAmount)})</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                <span className="font-bold text-slate-900">Total Estimasi:</span>
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
      {viewMode === 'detail' && selectedQuotation && (() => {
        const linkedInvoice = getLinkedInvoice(selectedQuotation);
        return (
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

            <div className="flex items-center gap-2 flex-wrap relative" ref={detailMoreMenuRef}>
              {/* 1. Action Button: Lihat Invoice OR Buat Invoice */}
              {linkedInvoice ? (
                <button
                  onClick={() => handleNavigateToInvoice(linkedInvoice.id)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <FileText size={14} /> Lihat Invoice
                </button>
              ) : selectedQuotation.status === 'ACCEPTED' ? (
                <button
                  onClick={handleOpenCreateInvoiceModal}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Plus size={14} /> Buat Invoice
                </button>
              ) : null}

              {/* Language Selector */}
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 mr-1">
                <button
                  type="button"
                  onClick={() => setDocLang('id')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    docLang === 'id' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => setDocLang('en')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    docLang === 'en' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  EN
                </button>
              </div>

              {/* 2. Kirim Penawaran */}
              <button
                onClick={() => handleShareWhatsApp(selectedQuotation)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Send size={14} /> Kirim Penawaran
              </button>

              {/* 3. Download PDF */}
              <button
                onClick={() => handleDownloadPDF(selectedQuotation)}
                disabled={downloadingPdf}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download size={14} />
                {downloadingPdf ? 'Mengunduh PDF...' : 'Download PDF'}
              </button>

              {/* 4. Lainnya Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDetailMoreMenu(v => !v)}
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MoreHorizontal size={14} /> Lainnya
                </button>
                {showDetailMoreMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden">
                    <button
                      onClick={() => { copyPublicLink(selectedQuotation); setShowDetailMoreMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      {copiedToken === selectedQuotation.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      {copiedToken === selectedQuotation.id ? 'Tersalin!' : 'Salin Link'}
                    </button>
                    <button
                      onClick={() => { printQuotation(selectedQuotation, undefined, docLang); setShowDetailMoreMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Printer size={14} /> Print
                    </button>
                    <button
                      onClick={() => { openEditPage(selectedQuotation); setShowDetailMoreMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button
                      onClick={() => { setShowDetailMoreMenu(false); handleDeleteQuotation(selectedQuotation.id); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 size={14} /> Hapus Penawaran
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Linked Invoice Banner (if quotation has an invoice) */}
          {linkedInvoice && (
            <div className="max-w-4xl mx-auto bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">INVOICE TERKAIT</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-mono font-bold text-slate-900 text-sm">{linkedInvoice.invoiceNumber}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      linkedInvoice.status === 'PAID' || (linkedInvoice.paidAmount >= linkedInvoice.totalAmount)
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {linkedInvoice.status === 'PAID' || (linkedInvoice.paidAmount >= linkedInvoice.totalAmount) ? 'LUNAS' : 'BELUM LUNAS'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleNavigateToInvoice(linkedInvoice.id)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap w-full sm:w-auto justify-center"
              >
                <ExternalLink size={14} /> Lihat Invoice
              </button>
            </div>
          )}

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
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Informasi Pembayaran:</h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-600 text-xs sm:text-sm leading-relaxed">
                    <p className="font-bold text-slate-800">BCA Cabang Dago - Bandung</p>
                    <p className="font-bold text-slate-800 font-mono text-sm">Acc. 7770673016</p>
                    <p className="font-bold text-slate-800">A.n Nukantini Putri Parincha</p>
                    <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-0.5">
                      <p>NPWP 16 digit: <strong className="text-slate-700">3217015610760002</strong></p>
                      <p>SWIFT BCA: <strong className="text-slate-700">CENAIDJA</strong></p>
                    </div>
                  </div>
                </div>

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
                    <span>Potongan PPh 21</span>
                    <span className="font-mono">({formatCurrency(selectedQuotation.taxAmount)})</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-slate-950 font-black text-sm sm:text-base pt-3 border-t border-slate-100">
                  <span>Total Estimasi</span>
                  <span className="font-mono text-sky-700">Rp {formatCurrency(selectedQuotation.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-300 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <h3 className="font-bold text-[#1e293b] text-sm uppercase tracking-widest flex items-center gap-2">
                <Smartphone className="text-emerald-600 stroke-[2.5]" size={18} />
                Kirim Penawaran via WhatsApp Gateway
              </h3>
              <button
                onClick={() => setIsWaModalOpen(false)}
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
                  onClick={() => setWaSendMode('GROUP')}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    waSendMode === 'GROUP' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Grup WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setWaSendMode('NUMBER')}
                  className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    waSendMode === 'NUMBER' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Nomor Pribadi
                </button>
              </div>

              {waSendMode === 'GROUP' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                      Pilih Grup WhatsApp Tujuan
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncWaGroups}
                      disabled={isSyncingWaGroups || isLoadingWaGroups}
                      className="flex items-center gap-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 font-bold uppercase tracking-wider cursor-pointer bg-transparent border-none outline-none"
                    >
                      <RefreshCw size={11} className={`${isSyncingWaGroups ? 'animate-spin' : ''}`} />
                      {isSyncingWaGroups ? 'Menyinkronkan...' : 'Sinkronkan Daftar Grup'}
                    </button>
                  </div>
                  
                  {isLoadingWaGroups ? (
                    <div className="w-full py-4 text-center border border-dashed border-slate-200 rounded-lg flex items-center justify-center gap-2 text-slate-500 font-medium text-xs">
                      <RefreshCw className="animate-spin w-4 h-4 text-emerald-500" />
                      Memuat daftar grup WhatsApp dari Fonnte...
                    </div>
                  ) : waGroups.length === 0 ? (
                    <div className="w-full p-4 text-center border border-dashed border-slate-200 bg-amber-50/30 text-amber-700 font-medium text-xs rounded-lg space-y-2">
                      <p>Tidak ada grup WhatsApp yang ditemukan di akun Fonnte Anda.</p>
                      <button
                        type="button"
                        onClick={handleSyncWaGroups}
                        className="px-3 py-1.5 bg-[#4f1846] text-white hover:bg-[#68265d] active:scale-95 transition-all text-[10px] font-bold uppercase tracking-wider rounded-md cursor-pointer"
                      >
                        Mulai Sinkronisasi Fonnte
                      </button>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={selectedWaGroupId}
                        onChange={(e) => setSelectedWaGroupId(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs font-bold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 bg-white cursor-pointer placeholder-slate-400"
                      >
                        {waGroups.map((g) => (
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
                    required
                    value={waTargetPhone}
                    onChange={(e) => setWaTargetPhone(e.target.value)}
                    placeholder="Contoh: 628123456789"
                    className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-500 bg-slate-50/50 focus:bg-white transition-all animate-fade-in"
                  />
                  <p className="text-[9.5px] text-slate-400 font-medium">Nomor harus diawali 62, 08, atau 8. Nomor default ditarik otomatis dari nomor hp klien.</p>
                </div>
              )}

              {/* Message Format Preview */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Pratinjau Format Pesan WhatsApp
                </label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={10}
                  className="w-full p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg text-xs font-semibold font-mono text-slate-700 focus:outline-none resize-none"
                  placeholder="Isi pesan penawaran..."
                />
              </div>

              {waSendError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-[11px] flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{waSendError}</span>
                </div>
              )}

              {waSendSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[11px] flex items-start gap-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{waSendSuccess}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
              <div>
                {waSendMode === 'NUMBER' && waTargetPhone && (
                  <a
                    href={`https://wa.me/${waTargetPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-150 cursor-pointer decoration-none shadow-xs"
                    title="Kirim pesan langsung via web/app WhatsApp tanpa Fonnte"
                  >
                    <ExternalLink size={13} className="stroke-[2.5]" />
                    Kirim Manual
                  </a>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsWaModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-100 text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer"
                >
                  Batal
                </button>
                
                <button
                  type="button"
                  disabled={isSendingWa}
                  onClick={handleSendFonnteApi}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:border-slate-300 border border-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer uppercase tracking-wider disabled:-translate-y-0"
                >
                  {isSendingWa ? (
                    <RefreshCw className="animate-spin w-4 h-4" />
                  ) : (
                    <SendHorizontal size={14} className="stroke-[2.5]" />
                  )}
                  Kirim Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Menu / Sheet for Mobile */}
      {isMobileActionSheetOpen && selectedQuotation && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none md:hidden">
          <div
            className="absolute inset-0 bg-black/40 pointer-events-auto"
            onClick={() => setIsMobileActionSheetOpen(false)}
          />
          <div className="relative pointer-events-auto px-6 pb-24 space-y-3 flex flex-col items-end z-10">
            <button
              onClick={() => { handleShareWhatsApp(selectedQuotation); setIsMobileActionSheetOpen(false); }}
              className="flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm cursor-pointer active:scale-95 transition-all"
            >
              <span>Kirim Penawaran (WA)</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Send size={18} />
              </div>
            </button>

            <button
              onClick={() => { handleDownloadPDF(selectedQuotation); setIsMobileActionSheetOpen(false); }}
              className="flex items-center gap-3 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm cursor-pointer active:scale-95 transition-all"
            >
              <span>Download / Share PDF</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Download size={18} />
              </div>
            </button>

            <button
              onClick={() => { openEditPage(selectedQuotation); setIsMobileActionSheetOpen(false); }}
              className="flex items-center gap-3 bg-amber-500 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm cursor-pointer active:scale-95 transition-all"
            >
              <span>Edit Penawaran</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Edit2 size={18} />
              </div>
            </button>

            <button
              onClick={() => { setIsMobileActionSheetOpen(false); handleDeleteQuotation(selectedQuotation.id); }}
              className="flex items-center gap-3 bg-red-600 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm cursor-pointer active:scale-95 transition-all"
            >
              <span>Hapus Penawaran</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Trash2 size={18} />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Convert Quotation to Invoice Confirmation Modal */}
      {showConvertModal && selectedQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Buat Invoice dari Penawaran?
              </h3>
              <button
                onClick={() => setShowConvertModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Penawaran:</span>
                <span className="font-mono font-bold text-slate-900">{selectedQuotation.quotationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Klien:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px] text-right">{selectedQuotation.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total:</span>
                <span className="font-bold font-mono text-emerald-600">Rp {formatInputNumber(selectedQuotation.totalAmount)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic">
              Data penawaran akan disalin ke Invoice.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                disabled={isConverting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateInvoice}
                disabled={isConverting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isConverting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus size={14} />}
                {isConverting ? 'Memproses...' : 'Buat Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
