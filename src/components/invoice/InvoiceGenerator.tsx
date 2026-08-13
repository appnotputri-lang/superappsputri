import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from "../ui/PageLayout";
import { Invoice, InvoiceItem, PaymentRecord, Product } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { ProductService } from '../../services/ProductService';
import { CompanyService } from '../../services/CompanyService';
import { ProjectService } from '../../services/ProjectService';
import { Project } from '../../domain/project/Project';
import { SuperappsClientService, superappsDb } from '../../services/superappsClientService';
import { calculateInvoiceTotals, getItemSubtotal } from '../../services/taxCalculator';
import { formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import { printInvoice, downloadInvoicePdf } from '../../utils/invoiceHtmlGenerator';
import { getApiUrl } from '../../lib/api';
import { auth, db } from '../../lib/firebase';
import { resolveClientPhone, isFuzzyNameMatch } from '../../utils/clientPhoneResolver';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  Plus, Edit2, Trash2, Printer, Search, X, Copy, ExternalLink,
  Check, CreditCard, DollarSign, Globe, CheckCircle2, AlertCircle, FileText, Share2,
  Building2, Database, ArrowLeft, Download, Send, SendHorizontal, Smartphone, MessageSquare, ChevronLeft, ChevronRight, UserPlus,
  MoreHorizontal, Calendar, Clock, ChevronUp, ChevronDown, MoreVertical, RefreshCw, FolderOpen, Briefcase
} from 'lucide-react';

const AutoResizingTextarea = ({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${className} resize-none overflow-y-hidden`}
      style={{ minHeight: '34px' }}
    />
  );
};

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

const MobileInvoiceRow: React.FC<{
  invoice: Invoice;
  onClick: () => void;
  onDelete: () => void;
  formatCurrency: (val?: number) => string;
}> = ({ invoice, onClick, onDelete, formatCurrency }) => {
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
        className="absolute inset-y-0 right-0 w-20 bg-red-600 flex items-center justify-center text-white z-0"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 size={18} />
      </div>
      <div
        className="relative z-10 bg-white p-4 flex justify-between items-center active:bg-slate-50 transition-transform"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => (translateX < -10 ? setTranslateX(0) : onClick())}
      >
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{invoice.clientName}</p>
          <div className="text-xs text-slate-500">{invoice.invoiceNumber}</div>
          {invoice.projectTitle && (
            <div className="text-[10px] text-blue-600 font-medium truncate mt-0.5">
              Proyek: {invoice.projectTitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            {formatCurrency(invoice.totalAmount)}
          </div>
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      </div>
    </div>
  );
};

interface InvoiceGeneratorProps {
  setActiveSidebarTab?: (tab: string) => void;
  [key: string]: any;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = (props) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'list' | 'create' | 'edit' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sorting State
  const [sortField, setSortField] = useState<'date' | 'number'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'date' | 'number') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset pagination when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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
  const [activeWaInvoice, setActiveWaInvoice] = useState<Invoice | null>(null);
  const [waSendMode, setWaSendMode] = useState<'NUMBER' | 'GROUP'>('GROUP');
  const [waGroups, setWaGroups] = useState<any[]>([]);
  const [selectedWaGroupId, setSelectedWaGroupId] = useState('');
  const [isLoadingWaGroups, setIsLoadingWaGroups] = useState(false);
  const [isSyncingWaGroups, setIsSyncingWaGroups] = useState(false);

  const handleDownloadPDF = async (inv: Invoice) => {
    setDownloadingPdf(true);
    try {
      await downloadInvoicePdf(inv, undefined, docLang);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Gagal mengunduh file PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Form Fields
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
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
    { id: '1', description: '', quantity: 1, unitPrice: 0, amount: 0, isTaxed: false }
  ]);
  const [activeProductDropdownIdx, setActiveProductDropdownIdx] = useState<number | null>(null);
  const [productSearchQueries, setProductSearchQueries] = useState<Record<number, string>>({});

  // Add Item Temp Inputs
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (viewMode === 'list') return;
    const unsubscribe = ProductService.subscribeProducts((data) => {
      // Sort alphabetically
      const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setDbProducts(sorted);
    });
    return () => unsubscribe();
  }, [viewMode]);

  useEffect(() => {
    if (!selectedClientId) {
      setActiveProjects([]);
      return;
    }
    let isMounted = true;
    ProjectService.getActiveProjectsForSelect({ clientId: selectedClientId, limitCount: 20 }).then(active => {
      if (isMounted) setActiveProjects(active);
    });
    return () => { isMounted = false; };
  }, [selectedClientId]);

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
  const [isMobilePaymentOpen, setIsMobilePaymentOpen] = useState(false);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const clientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClientOptions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
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

  // Listen for target invoice navigation from Quotation or URL / localStorage
  useEffect(() => {
    const checkTargetInvoice = () => {
      const targetId = localStorage.getItem('selected_invoice_id');
      if (targetId && invoices.length > 0) {
        const found = invoices.find(i => i.id === targetId || i.invoiceNumber === targetId);
        if (found) {
          setSelectedInvoice(found);
          setViewMode('detail');
          localStorage.removeItem('selected_invoice_id');
        }
      }
    };
    checkTargetInvoice();

    const handleCustomEvent = (e: any) => {
      const invId = e.detail?.id;
      if (invId && invoices.length > 0) {
        const found = invoices.find(i => i.id === invId || i.invoiceNumber === invId);
        if (found) {
          setSelectedInvoice(found);
          setViewMode('detail');
        }
      }
    };

    window.addEventListener('open_invoice_detail', handleCustomEvent);
    return () => window.removeEventListener('open_invoice_detail', handleCustomEvent);
  }, [invoices]);

  // Navigation handler to open Quotation Detail
  const handleNavigateToQuotation = (qIdOrNum: string) => {
    localStorage.setItem('selected_quotation_id', qIdOrNum);
    window.dispatchEvent(new CustomEvent('open_quotation_detail', { detail: { id: qIdOrNum } }));
    if (props.setActiveSidebarTab) {
      props.setActiveSidebarTab('quotation');
    } else {
      window.location.hash = '#/quotation';
    }
  };

  const loadClientOptions = async () => {
    setIsLoadingClients(true);
    setSuperappsError(null);

    // 1. Fetch Local Clients from lightweight client_directory
    try {
      const directoryEntries = await CompanyService.getClientDirectory({ isArchived: false }).catch(() => []);

      const allLocal: ClientOption[] = directoryEntries.map(c => {
        return {
          clientId: c.clientId || c.id,
          name: c.companyName || 'Tanpa Nama',
          email: (c as any).email || '',
          phone: (c as any).phoneNumber || (c as any).phone || '',
          address: (c as any).fullAddress || (c as any).address || c.domicile || '',
          source: 'local' as const,
          clientType: c.clientType || 'PT'
        };
      });
      setLocalClients(allLocal);
    } catch (err) {
      console.error('Error fetching local clients from client_directory:', err);
    }

    // 2. Fetch Initial Superapps Clients (Empty query, limited to 15)
    try {
      const spProfiles = await SuperappsClientService.getSuperappsProfiles('');
      const mappedSp: ClientOption[] = spProfiles.map(p => ({
        clientId: p.clientId,
        name: p.name,
        email: p.email,
        phone: p.contactNumber,
        address: p.address,
        source: 'superapps' as const,
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

  // Debounced search for Superapps profiles as user types
  useEffect(() => {
    if (clientSourceTab === 'local' || !clientSearch.trim()) {
      if (!clientSearch.trim()) {
        // Fallback to initial 15 cached profiles
        SuperappsClientService.getSuperappsProfiles('').then(spProfiles => {
          const mappedSp: ClientOption[] = spProfiles.map(p => ({
            clientId: p.clientId,
            name: p.name,
            email: p.email,
            phone: p.contactNumber,
            address: p.address,
            source: 'superapps' as const,
            clientType: p.clientType || 'PT'
          }));
          setSuperappsClients(mappedSp);
        }).catch(() => {});
      }
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoadingClients(true);
      try {
        const spProfiles = await SuperappsClientService.getSuperappsProfiles(clientSearch);
        const mappedSp: ClientOption[] = spProfiles.map(p => ({
          clientId: p.clientId,
          name: p.name,
          email: p.email,
          phone: p.contactNumber,
          address: p.address,
          source: 'superapps' as const,
          clientType: p.clientType || 'PT'
        }));
        setSuperappsClients(mappedSp);
      } catch (err) {
        console.warn('Gagal koneksi ke Superapps Firestore:', err);
      } finally {
        setIsLoadingClients(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [clientSearch, clientSourceTab]);

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

  const handleItemChange = (
    index: number,
    fieldOrUpdates: keyof InvoiceItem | Partial<InvoiceItem>,
    value?: any
  ) => {
    setItems((prevItems) => {
      const updated = [...prevItems];
      if (!updated[index]) return prevItems;
      let item = { ...updated[index] };
      if (typeof fieldOrUpdates === 'object') {
        item = { ...item, ...fieldOrUpdates };
      } else {
        item = { ...item, [fieldOrUpdates]: value };
      }
      item.amount = (item.quantity || 1) * (item.unitPrice || 0);
      updated[index] = item;
      return updated;
    });
  };

  const openCreatePage = () => {
    setEditingInvoiceId(null);
    setSelectedProjectId('');
    setSelectedProjectIds([]);
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
    setItems([
      { id: '1', description: '', quantity: 1, unitPrice: 0, amount: 0, isTaxed: false }
    ]);
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
    setSelectedProjectId(inv.projectId || '');
    setSelectedProjectIds(inv.projectIds || (inv.projectId ? [inv.projectId] : []));
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

  const handleSelectClient = (client: ClientOption) => {
    setSelectedClientId(client.clientId);
    setSelectedClientSource(client.source);
    setClientName(client.name);
    setClientEmail(client.email || '');
    setClientPhone(client.phone || '');
    setClientAddress(client.address || '');
    setSelectedProjectIds([]);
    setSelectedProjectId('');
    setShowClientDropdown(false);
  };

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

  const handleSaveInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedProjectIds.length === 0) {
      alert('Mohon hubungkan setidaknya satu proyek aktif terlebih dahulu.');
      return;
    }
    if (!invoiceNumber || !clientName) {
      alert('Mohon isi Nomor Invoice dan Nama Klien.');
      return;
    }

    setIsSubmitting(true);
    try {
      const projectTitles = selectedProjectIds.map(id => {
        const p = activeProjects.find(proj => proj.projectId === id);
        if (p) return p.title;
        if (selectedInvoice && selectedInvoice.projectIds?.includes(id)) {
          const idx = selectedInvoice.projectIds.indexOf(id);
          if (selectedInvoice.projectTitles && selectedInvoice.projectTitles[idx]) {
            return selectedInvoice.projectTitles[idx];
          }
        }
        return 'Proyek';
      });

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
        projectId: selectedProjectIds[0] || '',
        projectTitle: projectTitles.join(', '),
        projectIds: selectedProjectIds,
        projectTitles: projectTitles,
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
      if (err instanceof Error && err.message.startsWith('KLIEN_NAME_EXISTS:')) {
        const dupName = err.message.split('KLIEN_NAME_EXISTS:')[1];
        alert(`Gagal menyimpan: Klien dengan nama "${dupName}" sudah ada!`);
      } else {
        alert(`Gagal membuat klien baru: ${err.message || err}`);
      }
    }
  };

  const copyPublicLink = (inv: Invoice) => {
    const token = inv.publicToken || inv.id;
    const fullUrl = inv.legacyPublicUrl || `${window.location.origin}/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(inv.id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const formatPhoneForFonnte = (phone: string): string => {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  const formatInvoiceMessage = (inv: Invoice) => {
    const itemsText = (inv.items || []).map((item) => {
      if (!item) return '';
      const desc = item.description || '';
      const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return '';
      if (lines.length === 1) {
        return `•  ${lines[0]}: Rp ${formatCurrency(item.amount || (item.quantity * item.unitPrice))}`;
      } else {
        const firstLine = `•  ${lines[0]}`;
        const middleLines = lines.slice(1, -1);
        const lastLine = `${lines[lines.length - 1]}: Rp ${formatCurrency(item.amount || (item.quantity * item.unitPrice))}`;
        return [firstLine, ...middleLines, lastLine].join('\n');
      }
    }).filter(Boolean).join('\n\n');

    const bName = inv.bankDetails?.bankName || 'BCA Cabang Dago - Bandung';
    const bNumberRaw = String(inv.bankDetails?.accountNumber || '7770673016');
    const bNumber = bNumberRaw.replace(/Acc\.\s*/i, '').replace(/No\.\s*Rek\s*/i, '').trim();
    const bHolder = inv.bankDetails?.accountHolder || 'A.n Nukantini Putri Parincha';
    const bNpwp = inv.bankDetails?.npwp || '3217015610760002';

    const token = inv.publicToken || inv.id;
    const publicUrl = inv.legacyPublicUrl || `${window.location.origin}/${token}`;

    return `Yth. ${inv.clientName || 'Klien'},
Dengan hormat,

Bersama ini kami sampaikan rincian tagihan Invoice ${inv.invoiceNumber || ''} atas layanan di Kantor Notaris/PPAT Nukantini Putri Parincha.,SH.,M.Kn:

${itemsText}

Sub Total: Rp ${formatCurrency(inv.subtotal || 0)}
${(inv.taxAmount || 0) > 0 ? `Potongan Pajak: Rp ${formatCurrency(inv.taxAmount)}\n` : ''}Total Tagihan: Rp ${formatCurrency(inv.totalAmount || 0)}

Informasi Pembayaran:
${bName}
No. Rekening: ${bNumber}
${bHolder}

Informasi Pajak:
NPWP 16 digit: ${bNpwp}

Tautan Detail & PDF:
${publicUrl}

Atas perhatiannya, kami ucapkan terima kasih.

Hormat kami,
Notaris/PPAT Nukantini Putri Parincha.,SH.,M.Kn`;
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

  // Load Groups in Modal
  useEffect(() => {
    if (isWaModalOpen) {
      fetchWaGroups();
    }
  }, [isWaModalOpen]);

  const handleShareWhatsApp = async (inv: Invoice) => {
    console.log('[WA DEBUG] handleShareWhatsApp START, inv:', inv, 'inv?.id:', inv?.id);
    try {
      setActiveWaInvoice(inv);
      setWaSendSuccess(null);
      setWaSendError(null);
      setWaSendMode('NUMBER');
      setIsWaModalOpen(true);
      console.log('[WA DEBUG] setIsWaModalOpen(true) dipanggil');
      setWaTargetPhone(''); // Reset first while loading

      const resolvedPhone = await resolveClientPhone({
        clientId: inv.clientId,
        clientName: inv.clientName,
        clientPhone: inv.clientPhone,
        clientSource: inv.clientSource,
        localClients,
        superappsClients,
      });

      if (resolvedPhone) {
        setWaTargetPhone(resolvedPhone);
        
        // Auto-sync/persist back to the Invoice document in Firestore so they never have to edit again!
        if (resolvedPhone !== inv.clientPhone) {
          try {
            await InvoiceService.updateInvoice(inv.id, { clientPhone: resolvedPhone });
            console.log('[InvoiceGenerator] Auto-synced clientPhone back to invoice:', resolvedPhone);
          } catch (err) {
            console.warn('[InvoiceGenerator] Failed to auto-sync clientPhone to invoice:', err);
          }
        }
      } else {
        setWaTargetPhone('');
      }
      setWaMessage(formatInvoiceMessage(inv));
      console.log('[WA DEBUG] handleShareWhatsApp SELESAI, waMessage ter-set');
    } catch (err) {
      console.error('[WA DEBUG] ERROR di handleShareWhatsApp:', err);
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
        setWaSendSuccess(`Pesan WhatsApp tagihan berhasil dikirim ke ${targetLabel} via Fonnte!`);
      } else {
        setWaSendError(resData.message || resData.error || 'Gagal mengirim pesan via Fonnte. Silakan cek status WhatsApp Gateway.');
      }
    } catch (err: any) {
      setWaSendError(err.message || 'Terjadi kesalahan saat menghubungi server.');
    } finally {
      setIsSendingWa(false);
    }
  };

  const handleSendManualWa = () => {
    const waUrl = `https://wa.me/${waTargetPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`;
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
  const filteredInvoices = invoices
    .filter(inv => {
      const matchSearch = inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortField === 'date') {
        const dateA = a.issueDate || '';
        const dateB = b.issueDate || '';
        return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      } else {
        const numA = a.invoiceNumber || '';
        const numB = b.invoiceNumber || '';
        return sortOrder === 'asc'
          ? numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' })
          : numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
      }
    });

  const totalItems = filteredInvoices.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedInvoices = filteredInvoices.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const allClientsList = React.useMemo(() => {
    if (clientSourceTab === 'local') return localClients;
    if (clientSourceTab === 'superapps') return superappsClients;

    const seen = new Set<string>();
    const list: ClientOption[] = [];
    for (const c of [...localClients, ...superappsClients]) {
      if (c && c.clientId && !seen.has(`${c.source}_${c.clientId}`)) {
        seen.add(`${c.source}_${c.clientId}`);
        list.push(c);
      }
    }
    return list;
  }, [clientSourceTab, localClients, superappsClients]);

  const filteredClientOptions = React.useMemo(() => {
    if (!clientSearch) return allClientsList;
    const q = clientSearch.toLowerCase().trim();
    return allClientsList.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [allClientsList, clientSearch]);

  const { sub: currentSub, tax: currentTax, total: currentTotal } = calculateTotals(items);

  const renderWhatsAppModal = () => {
    if (!isWaModalOpen || !activeWaInvoice) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
        <div className="bg-slate-50 border border-slate-300 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
            <h3 className="font-bold text-[#1e293b] text-sm uppercase tracking-widest flex items-center gap-2">
              <Smartphone className="text-emerald-600 stroke-[2.5]" size={18} />
              Kirim Tagihan via WhatsApp Gateway
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
                placeholder="Isi pesan tagihan..."
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
    );
  };

  // =========================================================================
  // RENDER 1: LIST VIEW ("Invoice Penagihan")
  // =========================================================================
  if (viewMode === 'list') {
    return (
      <>
        {/* ===== MOBILE LIST (< md) ===== */}
        <div className="md:hidden bg-slate-50 min-h-full">
          <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 pt-4 pb-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Invoice</h1>
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              AZ
            </div>
          </div>
          <div className="px-4 pt-3 pb-2 space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Urutkan:</span>
              <div className="flex items-center gap-1 bg-slate-150 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSort('number')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    sortField === 'number'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  No. Invoice {sortField === 'number' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSort('date')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    sortField === 'date'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Tanggal {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 bg-white">
            {filteredInvoices.map(inv => (
              <MobileInvoiceRow
                key={inv.id}
                invoice={inv}
                onClick={() => { setSelectedInvoice(inv); setViewMode('detail'); }}
                onDelete={() => handleDeleteInvoice(inv.id)}
                formatCurrency={formatCurrency}
              />
            ))}
            {filteredInvoices.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                Belum ada invoice ditemukan.
              </div>
            )}
          </div>
          <button
            onClick={openCreatePage}
            className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 rounded-full text-white shadow-xl flex items-center justify-center active:scale-90 transition-all z-40"
          >
            <Plus size={26} />
          </button>
        </div>

        {/* ===== DESKTOP LIST (existing, md+) ===== */}
        <div className="hidden md:block p-4 md:p-6 w-[94%] xl:w-[92%] max-w-none mx-auto space-y-6">
          {/* Header */}
          <PageHeader
            title="Invoice"
            description="Kelola dan lihat rincian tagihan klien"
            actions={
              <button
                onClick={openCreatePage}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus size={16} />
                Buat Invoice
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
              { label: 'BELUM LUNAS', value: 'UNPAID' },
              { label: 'LUNAS', value: 'PAID' },
              { label: 'DIBATALKAN', value: 'CANCELLED' }
            ].map(tab => (
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

        {/* Invoice List Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 font-bold select-none">
                  <th className="p-3.5 w-12 text-center">No.</th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-slate-100/80 transition-all"
                    onClick={() => handleSort('date')}
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
                    onClick={() => handleSort('number')}
                  >
                    <div className="flex items-center gap-1.5">
                      No. Invoice
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
                          <div>{inv.clientName}</div>
                          {inv.projectTitle && (
                            <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                              Proyek: {inv.projectTitle}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                              inv.status === 'UNPAID'
                                ? 'bg-red-100/80 text-red-600'
                                : inv.status === 'PAID'
                                ? 'bg-emerald-100/80 text-emerald-700'
                                : inv.status === 'CANCELLED'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-amber-100/80 text-amber-700'
                            }`}
                          >
                            {inv.status === 'UNPAID' ? 'BELUM LUNAS' :
                             inv.status === 'PAID' ? 'LUNAS' :
                             inv.status === 'CANCELLED' ? 'DIBATALKAN' : inv.status}
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
        {renderWhatsAppModal()}
      </>
    );
  }

  // =========================================================================
  // RENDER 2: DETAIL / PREVIEW VIEW ("Detil Tagihan INV/2026/138")
  // =========================================================================
  if (viewMode === 'detail' && selectedInvoice) {
    const inv = selectedInvoice;
    const isUnpaid = inv.status === 'UNPAID';

    return (
      <>
        {/* ===== MOBILE DETAIL (< md) ===== */}
        <div className="md:hidden fixed inset-0 z-[100] bg-[#eaeff3] flex flex-col">
          <div className="flex-1 overflow-y-auto pb-[calc(140px+env(safe-area-inset-bottom))]">
            <div className="bg-[#1e61c3] text-white rounded-b-[2rem] pt-[calc(env(safe-area-inset-top)+16px)] pb-6 px-4 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => { setViewMode('list'); setIsMobileActionSheetOpen(false); }} className="p-2 -ml-2 rounded-full active:bg-white/10">
                  <ArrowLeft size={22} />
                </button>
                <h1 className="text-xl font-medium">Tagihan</h1>
                <button onClick={() => setIsMobileActionSheetOpen(prev => !prev)} className="p-2 -mr-2 rounded-full active:bg-white/10">
                  <MoreVertical size={22} />
                </button>
              </div>
              <div className="text-center flex flex-col items-center mb-5">
                <h2 className="text-2xl tracking-widest font-normal mb-2">{inv.invoiceNumber}</h2>
                <h3 className="text-xl font-bold uppercase mb-4">{inv.clientName}</h3>
                <div className="inline-flex items-center bg-white rounded-full pl-3 pr-5 py-2 text-slate-800">
                  <div className={`w-5 h-5 rounded-full mr-3 ${!isUnpaid ? 'bg-green-400' : 'bg-[#f7949d]'}`}></div>
                  <span className="font-medium text-[15px]">{!isUnpaid ? 'Lunas' : 'Belum Dibayar'}</span>
                </div>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-4 px-2">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="opacity-90" />
                  <span className="text-sm">{formatDateIndo(inv.issueDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="opacity-90" />
                  <span className="text-sm">{inv.dueDate ? formatDateIndo(inv.dueDate) : '-'}</span>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              {/* Linked Quotation Banner (Mobile) */}
              {(inv.quotationId || inv.quotationNumber) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-100 text-sky-700 rounded-lg shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Penawaran Terkait</span>
                      <p className="font-mono font-bold text-slate-900 text-xs mt-0.5">{inv.quotationNumber || inv.quotationId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleNavigateToQuotation(inv.quotationId || inv.quotationNumber || '')}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <ExternalLink size={12} /> Lihat
                  </button>
                </div>
              )}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 bg-[#f2f4f7] flex justify-between text-sm border-b border-gray-200">
                  <span className="font-medium text-[15px]">Jumlah Items</span>
                  <span className="text-blue-600 font-medium text-[15px]">{inv.items.length} items</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {inv.items.map((item, idx) => (
                    <div key={idx} className="p-5 flex items-center justify-between bg-white">
                      <div className="min-w-0 pr-3">
                        <div className="font-medium text-[#111] text-[15px] whitespace-pre-wrap">{item.description}</div>
                        <div className="text-[13px] text-gray-500 mt-1">
                          {item.quantity} Pcs x {formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="bg-[#fda4af] text-white font-medium text-sm px-4 py-1.5 rounded-full">
                          {formatCurrency(item.amount || (item.quantity * item.unitPrice))}
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3 text-[15px]">
                <div className="flex justify-between items-center text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-bold text-black">{formatCurrency(inv.subtotal)}</span>
                </div>
                {inv.taxAmount > 0 && (
                  <div className="flex justify-between items-center text-red-600">
                    <span>Pajak</span>
                    <span className="font-bold">({formatCurrency(inv.taxAmount)})</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 pb-1 border-t border-gray-100">
                  <span className="font-bold text-lg text-black">Total</span>
                  <span className="font-bold text-xl text-black">{formatCurrency(inv.totalAmount)}</span>
                </div>
                {inv.paidAmount > 0 && (
                  <div className="flex justify-between items-center pt-1 text-green-600">
                    <span className="font-medium">Total Terbayar</span>
                    <span className="font-bold">{formatCurrency(inv.paidAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-gray-700">Sisa Tagihan</span>
                  <span className="font-bold text-[#f43f5e]">{formatCurrency(inv.balanceDue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Action Menu / Sheet */}
          {isMobileActionSheetOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
              <div
                className="absolute inset-0 bg-black/40 pointer-events-auto"
                onClick={() => setIsMobileActionSheetOpen(false)}
              />
              <div className="relative pointer-events-auto px-6 pb-24 space-y-3 flex flex-col items-end z-10">
                <button
                  onClick={() => { handleShareWhatsApp(inv); setIsMobileActionSheetOpen(false); }}
                  className="flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm cursor-pointer active:scale-95 transition-all"
                >
                  <span>Kirim Tagihan (WA)</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Send size={18} />
                  </div>
                </button>

                <button
                  onClick={() => { handleDownloadPDF(inv); setIsMobileActionSheetOpen(false); }}
                  className="flex items-center gap-3 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm cursor-pointer active:scale-95 transition-all"
                >
                  <span>Download / Share PDF</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Download size={18} />
                  </div>
                </button>

                <button
                  onClick={() => { openEditPage(inv); setIsMobileActionSheetOpen(false); }}
                  className="flex items-center gap-3 bg-amber-500 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm cursor-pointer active:scale-95 transition-all"
                >
                  <span>Edit Invoice</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Edit2 size={18} />
                  </div>
                </button>

                <button
                  onClick={() => { setIsMobileActionSheetOpen(false); handleDeleteInvoice(inv.id); }}
                  className="flex items-center gap-3 bg-red-600 text-white px-5 py-3 rounded-full shadow-lg font-bold text-sm cursor-pointer active:scale-95 transition-all"
                >
                  <span>Hapus Invoice</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Trash2 size={18} />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Trigger Bar */}
          {!isMobilePaymentOpen && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#1e61c3] rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.2)] pb-[env(safe-area-inset-bottom)]">
              <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mt-3 mb-1"></div>
              <button onClick={() => setIsMobilePaymentOpen(true)} className="w-full flex justify-between items-center px-6 pb-6 pt-2 text-white">
                <span className="font-bold text-lg">Terima pembayaran</span>
                <ChevronUp size={26} />
              </button>
            </div>
          )}

          {/* Bottom Sheet Payment */}
          {isMobilePaymentOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/60" onClick={() => setIsMobilePaymentOpen(false)}></div>
              <div className="relative bg-white w-full max-h-[85vh] rounded-t-3xl flex flex-col shadow-2xl">
                <div className="bg-[#1e61c3] text-white rounded-t-3xl shrink-0">
                  <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mt-3 mb-1"></div>
                  <button onClick={() => setIsMobilePaymentOpen(false)} className="w-full flex justify-between items-center px-6 pb-5 pt-2">
                    <span className="font-bold text-lg">Terima pembayaran</span>
                    <ChevronDown size={28} />
                  </button>
                </div>
                <form
                  onSubmit={(e) => { handleAddPayment(e); setIsMobilePaymentOpen(false); }}
                  className="bg-slate-50 flex-1 overflow-y-auto px-5 py-6 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Dibayar</label>
                    <input
                      type="text"
                      value={payAmount || ''}
                      onChange={(e) => setPayAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 bg-white text-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal</label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dibayar Ke</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-800"
                    >
                      <option value="Transfer BCA">Transfer BCA</option>
                      <option value="Transfer Mandiri">Transfer Mandiri</option>
                      <option value="Transfer BRI">Transfer BRI</option>
                      <option value="Tunai">Tunai / Cash</option>
                      <option value="QRIS">QRIS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Referensi</label>
                    <input
                      type="text"
                      value={payRefNumber}
                      onChange={(e) => setPayRefNumber(e.target.value)}
                      placeholder="No. Kwitansi / Ref"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl font-mono text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catatan</label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="Opsional"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingPayment}
                    className="w-full bg-[#2563EB] text-white py-3.5 rounded-xl font-bold mt-4 shadow-md flex items-center justify-center text-lg disabled:opacity-50"
                  >
                    {isSavingPayment ? 'Menyimpan...' : 'Simpan Pembayaran'}
                  </button>

                  {inv.paymentHistory && inv.paymentHistory.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <h4 className="font-bold text-slate-800 mb-4">Riwayat</h4>
                      <div className="space-y-3">
                        {inv.paymentHistory.map((p, pIdx) => (
                          <div key={p.id || pIdx} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-800">Rp {formatCurrency(p.amount)}</span>
                              <span className="text-xs text-slate-500">{formatDateIndo(p.date)}</span>
                            </div>
                            <p className="text-xs text-slate-500">{p.method || 'Transfer'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ===== DESKTOP DETAIL (existing, md+) ===== */}
        <div className="hidden md:block p-4 md:p-6 w-[94%] xl:w-[92%] max-w-none mx-auto space-y-6 print:p-0 print:max-w-none">
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
                    onClick={() => { printInvoice(inv, undefined, docLang); setShowMoreMenu(false); }}
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

        {/* Linked Quotation Banner (Desktop) */}
        {(inv.quotationId || inv.quotationNumber) && (
          <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-xs shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">PENAWARAN TERKAIT</span>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{inv.quotationNumber || inv.quotationId}</p>
              </div>
            </div>
            <button
              onClick={() => handleNavigateToQuotation(inv.quotationId || inv.quotationNumber || '')}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap w-full sm:w-auto justify-center"
            >
              <ExternalLink size={14} /> Lihat Penawaran
            </button>
          </div>
        )}

        {/* Main Content Layout (2 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Invoice Document Preview (8 Cols on desktop) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto print:border-none print:shadow-none print:p-0 print:overflow-visible">
            <InvoicePrintTemplate invoice={inv} lang={docLang} />
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
        {renderWhatsAppModal()}
      </>
    );
  }

  // =========================================================================
  // RENDER 3: FULL PAGE FORM ("Buat Invoice Baru" / "Edit Invoice")
  // =========================================================================
  const allAvailableProducts = [
    ...dbProducts.map(p => ({
      name: p.name,
      description: p.description || '',
      unitPrice: p.unitPrice || 0,
      isTaxed: !!p.isTaxed,
      taxRate: 0.05
    })),
    ...PRESET_PRODUCTS.filter(p => p !== '-- Manual --').map(p => {
      let description = '';
      let unitPrice = 0;
      let isTaxed = false;
      if (p === 'AKTA PERUBAHAN PT SK') {
        description = '1. Draft Notulen Sirkuler\n2. Akta RUPSLB\n3. Surat Keputusan (SK) AHU\n4. Surat Pelaporan AHU\n5. BNRI\n6. Akta Hibah Saham';
        unitPrice = 7435897;
        isTaxed = true;
      } else if (p === 'Jasa Pembuatan Akta Notaris') {
        unitPrice = 5000000;
      }
      return {
        name: p,
        description,
        unitPrice,
        isTaxed,
        taxRate: 0.05
      };
    })
  ];

  return (
    <div className="p-4 md:p-6 w-[94%] xl:w-[92%] max-w-none mx-auto space-y-4">
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

      <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
        {/* Unified Compact Header: Client, Invoice No, Issue Date, Due Date */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {/* Klien */}
            <div className="space-y-1 relative" ref={clientDropdownRef}>
              <label className="block font-bold text-slate-700 text-[10px] uppercase tracking-wide">Klien <span className="text-red-500">* Wajib</span></label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari atau pilih klien..."
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
                  className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
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
              </div>

              {showClientDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-64 flex flex-col overflow-hidden p-1">
                  {/* Source tabs */}
                  <div className="flex border-b border-slate-100 p-1 mb-1 gap-1 shrink-0 bg-slate-50/50 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setClientSourceTab('all')}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-colors ${clientSourceTab === 'all' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Semua ({localClients.length + superappsClients.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientSourceTab('local')}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-colors ${clientSourceTab === 'local' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Lokal ({localClients.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientSourceTab('superapps')}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-colors ${clientSourceTab === 'superapps' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Superapps ({superappsClients.length})
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1">
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
                          onClick={() => handleSelectClient(c)}
                          className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[200px] block">{c.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {c.clientType ? `[${c.clientType}] ` : ''}{c.address || c.email || c.phone || (c.source === 'superapps' ? 'Superapps' : 'Lokal')}
                            </span>
                          </div>
                          {selectedClientId === c.clientId && (
                            <Check size={14} className="text-blue-600 shrink-0" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Nomor Invoice */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 text-[10px] uppercase tracking-wide">Nomor Invoice</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-xs"
              />
            </div>

            {/* Tanggal */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 text-[10px] uppercase tracking-wide">Tanggal</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
              />
            </div>

            {/* Jatuh Tempo */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 text-[10px] uppercase tracking-wide">Jatuh Tempo</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Connected Active Projects (Compact & inline if client is selected) */}
          {selectedClientId && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5">
                <Briefcase size={14} className="text-blue-600" />
                <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wide">
                  Hubungkan Proyek Aktif ({activeProjects.filter(p => p.clientId === selectedClientId).length} Proyek) <span className="text-red-500">*</span>
                </h4>
              </div>
              
              {activeProjects.filter(p => p.clientId === selectedClientId).length === 0 ? (
                <div className="p-2.5 text-slate-500 text-xs italic bg-slate-50 rounded-xl border border-slate-100">
                  Klien ini tidak memiliki proyek aktif.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeProjects.filter(p => p.clientId === selectedClientId).map((p) => {
                    const isChecked = selectedProjectIds.includes(p.projectId);
                    return (
                      <button
                        type="button"
                        key={p.projectId}
                        onClick={() => handleToggleProject(p.projectId)}
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isChecked 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold shadow-xs' 
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by button click
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/10 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>{p.title}</span>
                        <span className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                          p.status === 'ACTIVE' || p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 3: ITEM TAGIHAN */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">ITEM TAGIHAN</h3>
          </div>

          {/* Items List Table */}
          <div className="border border-slate-200/80 rounded-xl overflow-x-auto md:overflow-visible">
            <table className="w-full text-left text-xs table-fixed min-w-[950px] md:min-w-0 md:w-full">
              <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-[15%] min-w-[140px]">Produk / Layanan</th>
                  <th className="p-3 w-[33%] min-w-[220px]">Deskripsi</th>
                  <th className="p-3 w-[5%] min-w-[50px] text-center">Qty</th>
                  <th className="p-3 w-[14%] min-w-[110px] text-right">Harga (Rp)</th>
                  <th className="p-3 w-[11%] min-w-[100px] text-right">Discount (Rp)</th>
                  <th className="p-3 w-[10%] min-w-[95px] text-center">PPh 21</th>
                  <th className="p-3 w-[10%] min-w-[100px] text-right">Subtotal</th>
                  <th className="p-3 w-[2%] min-w-[35px] text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Belum ada item ditambahkan. Silakan klik "+ Tambah Item".
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50/40">
                      {/* Produk */}
                      <td className="p-3 relative align-top overflow-visible">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Cari atau ketik produk..."
                            value={productSearchQueries[idx] !== undefined ? productSearchQueries[idx] : (it.description.split('\n')[0] || '')}
                            onFocus={() => setActiveProductDropdownIdx(idx)}
                            onBlur={() => setTimeout(() => setActiveProductDropdownIdx(null), 250)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProductSearchQueries(prev => ({ ...prev, [idx]: val }));
                              
                              // Update first line of description
                              const lines = it.description.split('\n');
                              lines[0] = val;
                              handleItemChange(idx, 'description', lines.join('\n'));
                            }}
                            className="product-combobox-input w-full p-2 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                          />
                          {activeProductDropdownIdx === idx && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 max-h-48 overflow-y-auto p-1 text-xs">
                              {allAvailableProducts
                                .filter(p => p.name.toLowerCase().includes((productSearchQueries[idx] || '').toLowerCase()))
                                .map((p, pIdx) => (
                                  <button
                                    type="button"
                                    key={pIdx}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      const finalDesc = p.description ? `${p.name}\n${p.description}` : p.name;
                                      handleItemChange(idx, {
                                        description: finalDesc,
                                        unitPrice: p.unitPrice,
                                        isTaxed: p.isTaxed,
                                        taxRate: p.isTaxed ? (p.taxRate || 0.05) : undefined
                                      });
                                      setProductSearchQueries(prev => {
                                        const copy = { ...prev };
                                        delete copy[idx];
                                        return copy;
                                      });
                                      setActiveProductDropdownIdx(null);
                                    }}
                                    className="w-full text-left p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors block border-b border-slate-50 last:border-none"
                                  >
                                    <div className="font-bold text-slate-900">{p.name}</div>
                                    {p.unitPrice > 0 && (
                                      <div className="text-[10px] text-slate-500 font-medium">Rp {formatCurrency(p.unitPrice)}</div>
                                    )}
                                  </button>
                                ))}
                              {allAvailableProducts.filter(p => p.name.toLowerCase().includes((productSearchQueries[idx] || '').toLowerCase())).length === 0 && (
                                <div className="p-2 text-center text-slate-400 italic text-[10px]">
                                  Produk tidak ditemukan
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Deskripsi */}
                      <td className="p-3 align-top">
                        <AutoResizingTextarea
                          value={it.description}
                          onChange={(val) => handleItemChange(idx, 'description', val)}
                          className="w-full p-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white animate-none duration-0"
                          placeholder="Ketik rincian atau deskripsi di sini..."
                        />
                      </td>

                      {/* Qty */}
                      <td className="p-3 text-center align-top">
                        <input
                          type="number"
                          min={1}
                          value={it.quantity || 1}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full p-2 border border-slate-200 rounded-xl text-center font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </td>

                      {/* Harga */}
                      <td className="p-3 text-right align-top">
                        <input
                          type="text"
                          value={formatInputNumber(it.unitPrice || 0)}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFormattedNumber(e.target.value))}
                          className="w-full p-2 border border-slate-200 rounded-xl text-right font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </td>

                      {/* Discount */}
                      <td className="p-3 text-right align-top">
                        <input
                          type="text"
                          placeholder="0"
                          value={it.discount ? formatInputNumber(it.discount) : ''}
                          onChange={(e) => handleItemChange(idx, 'discount', parseFormattedNumber(e.target.value))}
                          className="w-full p-2 border border-slate-200 rounded-xl text-right font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </td>

                      {/* PPh 21 */}
                      <td className="p-3 text-center align-top">
                        <select
                          value={it.isTaxed ? (it.taxRate !== undefined ? it.taxRate : 0.05) : 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val === 0) {
                              handleItemChange(idx, { isTaxed: false, taxRate: undefined });
                            } else {
                              handleItemChange(idx, { isTaxed: true, taxRate: val });
                            }
                          }}
                          className="w-full p-2 border border-slate-200 bg-white text-xs font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer text-center"
                        >
                          <option value={0}>0% (Tanpa PPh)</option>
                          <option value={0.05}>5%</option>
                          <option value={0.15}>15%</option>
                          <option value={0.25}>25%</option>
                          <option value={0.30}>30%</option>
                          <option value={0.35}>35%</option>
                        </select>
                      </td>

                      {/* Subtotal */}
                      <td className="p-3 text-right font-bold text-slate-900 align-top pt-4">
                        {formatCurrency(getItemSubtotal(it))}
                      </td>

                      {/* Aksi */}
                      <td className="p-3 text-center align-top pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add Item Trigger & Total summaries */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <button
              type="button"
              onClick={() => {
                const newItem: InvoiceItem = {
                  id: Date.now().toString(),
                  description: '',
                  quantity: 1,
                  unitPrice: 0,
                  amount: 0,
                  isTaxed: false
                };
                setItems(prev => [...prev, newItem]);
                
                // Autofocus on the last product-combobox-input
                setTimeout(() => {
                  const inputs = document.querySelectorAll('.product-combobox-input');
                  if (inputs && inputs.length > 0) {
                    const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                    if (lastInput) {
                      lastInput.focus();
                    }
                  }
                }, 100);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
            >
              <Plus size={15} /> Tambah Item
            </button>

            {/* Subtotal & Totals Summary */}
            <div className="w-full sm:w-72 space-y-1.5 text-right font-medium text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <div className="flex justify-between text-xs">
                <span>Sub Total:</span>
                <span className="font-bold text-slate-900">{formatCurrency(currentSub)}</span>
              </div>
              {currentTax > 0 && (
                <div className="flex justify-between text-xs text-red-600">
                  <span>Potongan Pajak (PPh 21):</span>
                  <span className="font-bold">({formatCurrency(currentTax)})</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-xs">
                <span className="font-bold text-slate-900">Total Tagihan:</span>
                <span className="font-bold text-blue-600 text-sm">{formatCurrency(currentTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Rekening, Catatan & Pengaturan */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option value="UNPAID">BELUM LUNAS</option>
                  <option value="PAID">LUNAS</option>
                  <option value="CANCELLED">DIBATALKAN</option>
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

      {renderWhatsAppModal()}
    </div>
  );
};
