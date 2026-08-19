import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from "../ui/PageLayout";
import { MobileHeader, MobileEmptyState } from "../ui/MobileHeader";
import { Invoice, InvoiceItem, PaymentRecord, Product } from '../../../types';
import { InvoiceService } from '../../services/InvoiceService';
import { ProductService } from '../../services/ProductService';
import { CompanyService } from '../../services/CompanyService';
import { calculateInvoiceTotals, getItemSubtotal } from '../../services/taxCalculator';
import { formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import { printInvoice, downloadInvoicePdf, downloadKwitansiPdf, printKwitansi, terbilang } from '../../utils/invoiceHtmlGenerator';
import { getApiUrl, getAuthHeaders } from '../../lib/api';
import { auth, db } from '../../lib/firebase';
import { resolveClientPhone, isFuzzyNameMatch } from '../../utils/clientPhoneResolver';
import { doc, getDoc } from 'firebase/firestore';
import {
  Plus, Edit2, Trash2, Printer, Search, X, Copy, ExternalLink, Save,
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs mb-3">
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
        <div className="min-w-0 pr-2">
          <p className="font-bold text-slate-800 text-sm truncate">{invoice.clientName || 'Tanpa Nama'}</p>
          <div className="text-xs font-mono font-medium text-slate-500 mt-0.5">{invoice.invoiceNumber}</div>
          {invoice.projectTitle && (
            <div className="text-[11px] text-blue-600 font-medium truncate mt-1">
              {invoice.projectTitle}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl">
            {formatCurrency(invoice.totalAmount)}
          </div>
          <ChevronRight size={16} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
};

const getMobilePageNumbers = (current: number, total: number): (number | string)[] => {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, '...', total];
  }
  if (current >= total - 2) {
    return [1, '...', total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

// Invoice list cache: kept in-memory for instant SPA tab-switches, and
// mirrored to localStorage so the FIRST load of the invoice list in a new
// tab/session (or after a hard refresh) can also show the last-known data
// immediately instead of a blank loading state — the list is always
// re-fetched from D1 in the background afterward regardless.
const INVOICE_LIST_CACHE_KEY = 'superapp:invoices:list-cache:v1';
const INVOICE_LIST_CACHE_MAX_ENTRIES = 12;
const INVOICE_LIST_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h — just a "don't show ancient data" cap

type InvoiceCacheEntry = { invoices: Invoice[]; total: number; timestamp: number };

const invoiceCache = new Map<string, InvoiceCacheEntry>();

try {
  const raw = localStorage.getItem(INVOICE_LIST_CACHE_KEY);
  if (raw) {
    const parsed: Record<string, InvoiceCacheEntry> = JSON.parse(raw);
    const now = Date.now();
    Object.entries(parsed).forEach(([key, entry]) => {
      if (entry && now - entry.timestamp < INVOICE_LIST_CACHE_MAX_AGE_MS) {
        invoiceCache.set(key, entry);
      }
    });
  }
} catch (err) {
  console.error('Failed to hydrate invoice list cache from localStorage:', err);
}

function persistInvoiceCache() {
  try {
    const entries = Array.from(invoiceCache.entries()).sort((a, b) => b[1].timestamp - a[1].timestamp);
    const capped = entries.slice(0, INVOICE_LIST_CACHE_MAX_ENTRIES);
    const obj: Record<string, InvoiceCacheEntry> = {};
    capped.forEach(([key, val]) => { obj[key] = val; });
    localStorage.setItem(INVOICE_LIST_CACHE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.error('Failed to persist invoice list cache to localStorage:', err);
  }
}

function setInvoiceCacheEntry(key: string, invoices: Invoice[], total: number) {
  invoiceCache.set(key, { invoices, total, timestamp: Date.now() });
  persistInvoiceCache();
}

function clearInvoiceCache() {
  invoiceCache.clear();
  try {
    localStorage.removeItem(INVOICE_LIST_CACHE_KEY);
  } catch (err) {
    console.error('Failed to clear persisted invoice list cache:', err);
  }
}

interface InvoiceGeneratorProps {
  setActiveSidebarTab?: (tab: string) => void;
  [key: string]: any;
}

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = (props) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);

  // View mode: 'list' | 'create' | 'edit' | 'detail' | 'kwitansi'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail' | 'kwitansi'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [downloadingKwitansiPdf, setDownloadingKwitansiPdf] = useState(false);

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

  // Pagination State (Default 10 rows per page as per criteria)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | string>(10);

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
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isFetchingInvoiceNumber, setIsFetchingInvoiceNumber] = useState(false);
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
  const [items, setItems] = useState<InvoiceItem[]>([]);
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
  const [isBankDetailsExpanded, setIsBankDetailsExpanded] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [activeMobileItemIdx, setActiveMobileItemIdx] = useState<number | null>(null);

  // Client Master Selection State
  const [localClients, setLocalClients] = useState<ClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Cache Ref and D1 Fetch helper
  const localD1CacheRef = useRef<Record<string, ClientOption[]>>({});

  const fetchD1Clients = async (queryStr: string): Promise<ClientOption[]> => {
    const cacheKey = queryStr.toLowerCase().trim();
    if (localD1CacheRef.current[cacheKey]) {
      return localD1CacheRef.current[cacheKey];
    }

    try {
      const headers = await getAuthHeaders();
      let url = getApiUrl('/api/clients?limit=15');
      if (cacheKey) {
        url = getApiUrl(`/api/clients/search?q=${encodeURIComponent(queryStr)}&limit=15`);
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`D1 API returned status ${response.status}`);
      }
      const data = await response.json() as any;
      const results = data.clients || [];

      const mapped: ClientOption[] = results.map((d: any) => ({
        clientId: d.clientId || d.id,
        name: d.companyName || 'Tanpa Nama',
        email: d.email || '',
        phone: d.phoneNumber || d.phone || '',
        address: d.fullAddress || d.address || d.domicile || '',
        source: 'local' as const,
        clientType: d.clientType || 'PT'
      }));

      localD1CacheRef.current[cacheKey] = mapped;
      return mapped;
    } catch (err) {
      console.error('[InvoiceGenerator] D1 fetch/search error:', err);
      return [];
    }
  };

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
  const mobileClientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClientOptions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
      const target = event.target as Node;
      const isInsideDesktopClientSelector = clientDropdownRef.current?.contains(target);
      const isInsideMobileClientSelector = mobileClientDropdownRef.current?.contains(target);

      if (!isInsideDesktopClientSelector && !isInsideMobileClientSelector) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Server-side paginated loading with instant client-side cache fallback
  useEffect(() => {
    if (viewMode !== 'list') return;

    let active = true;
    const cleanSearch = searchTerm.trim();
    const cacheKey = `invoices:page=${currentPage}:size=${pageSize}:search=${cleanSearch}:status=${statusFilter}`;
    
    const cached = invoiceCache.get(cacheKey);
    if (cached) {
      setInvoices(cached.invoices);
      setTotalInvoicesCount(cached.total);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadData = async () => {
      if (cached) {
        setIsBackgroundFetching(true);
      }
      try {
        const res = await InvoiceService.getInvoicesPaginated({
          page: currentPage,
          pageSize: pageSize,
          search: cleanSearch,
          status: statusFilter
        });

        if (active && res.success) {
          const isDataChanged = !cached || JSON.stringify(cached.invoices) !== JSON.stringify(res.invoices) || cached.total !== res.total;
          if (isDataChanged) {
            setInvoices(res.invoices);
            setTotalInvoicesCount(res.total);
            setInvoiceCacheEntry(cacheKey, res.invoices, res.total);
          }
        }
      } catch (err) {
        console.error('Failed to load paginated invoices:', err);
      } finally {
        if (active) {
          setLoading(false);
          setIsBackgroundFetching(false);
        }
      }
    };

    const delayDebounce = setTimeout(() => {
      loadData();
    }, cleanSearch ? 350 : 0);

    return () => {
      active = false;
      clearTimeout(delayDebounce);
    };
  }, [viewMode, currentPage, pageSize, searchTerm, statusFilter]);

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
    try {
      const allLocal = await fetchD1Clients('');
      setLocalClients(allLocal);
    } catch (err) {
      console.error('Error fetching local clients from D1:', err);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Debounced search for D1 clients as user types
  useEffect(() => {
    const trimmedQuery = clientSearch.trim();

    const performSearch = async () => {
      setIsLoadingClients(true);
      try {
        const res = await fetchD1Clients(trimmedQuery);
        setLocalClients(res);
      } catch (err) {
        console.error('D1 debounced search error:', err);
      } finally {
        setIsLoadingClients(false);
      }
    };

    if (!trimmedQuery) {
      loadClientOptions();
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      performSearch();
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [clientSearch]);

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

  const openCreatePage = async () => {
    setEditingInvoiceId(null);
    setSelectedProjectId('');
    setSelectedProjectIds([]);

    // Auto due date + 3 days
    const today = new Date();
    const due = new Date();
    due.setDate(today.getDate() + 3);

    // NOTE: this used to be `(invoices.length + 1).toString().padStart(3, '0')`
    // — i.e. based on however many invoices happened to be loaded in the
    // CURRENT paginated page of the browser's local state, not the real
    // count in the database. That's why it always suggested a low/wrong
    // number like INV/2026/011 regardless of how many invoices actually
    // existed. The number now comes from the D1-backed
    // /api/invoices/next-number endpoint (same authoritative pattern used
    // for deed numbers) instead.
    setInvoiceNumber('');
    setIsFetchingInvoiceNumber(true);

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
    setIsBankDetailsExpanded(false);
    loadClientOptions();
    setViewMode('create');
    if (window.location.pathname !== '/invoices/new' && window.location.pathname !== '/invoice/new') {
      navigate('/invoices/new');
    }

    try {
      const nextNumber = await InvoiceService.getNextInvoiceNumber(today.getFullYear());
      setInvoiceNumber(nextNumber);
    } catch (err) {
      console.error('Error fetching next invoice number:', err);
      alert('Gagal mengambil nomor invoice terbaru dari server. Silakan isi nomor invoice secara manual, atau tutup dan buka lagi form ini untuk mencoba ulang.');
    } finally {
      setIsFetchingInvoiceNumber(false);
    }
  };

  const location = useLocation();
  const directActionHandledRef = useRef<string | null>(null);

  useEffect(() => {
    const isDirectAction = (location.state as any)?.openCreateModal || location.search.includes('action=new') || location.search.includes('create=true');
    const actionKey = `${location.pathname}_${location.search}_${location.key}`;
    if (isDirectAction && directActionHandledRef.current !== actionKey) {
      directActionHandledRef.current = actionKey;
      openCreatePage();
    }
  }, [location]);

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
    setIsBankDetailsExpanded(false);
    loadClientOptions();
    setViewMode('edit');
    if (!window.location.pathname.endsWith('/edit')) {
      navigate(`/invoices/${encodeURIComponent(inv.id)}/edit`);
    }
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
    if (window.location.pathname !== `/invoices/${encodeURIComponent(inv.id)}` && window.location.pathname !== `/invoice/${encodeURIComponent(inv.id)}`) {
      navigate(`/invoices/${encodeURIComponent(inv.id)}`);
    }
  };

  const openKwitansiDetail = (inv: Invoice, payment: PaymentRecord) => {
    const payId = payment.id || `pay_${Date.now()}`;
    const paymentWithId = { ...payment, id: payId };
    setSelectedInvoice(inv);
    setSelectedPayment(paymentWithId);
    setViewMode('kwitansi');
    const targetPath = `/invoices/${encodeURIComponent(inv.id)}/payments/${encodeURIComponent(payId)}`;
    if (window.location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const navigate = useNavigate();

  // Sync state with URL path (/invoices/:id, /invoices/new, /invoices/:id/edit, /invoices/:id/payments/:paymentId)
  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];

    if (lastPart === 'new') {
      if (viewMode !== 'create') {
        openCreatePage();
      }
    } else if (parts.length >= 4 && parts[parts.length - 2] === 'payments') {
      const invId = parts[1];
      const payId = parts[3];

      const syncKwitansi = (inv: Invoice) => {
        setSelectedInvoice(inv);
        let foundPay = inv.paymentHistory?.find(p => p.id === payId);
        if (!foundPay && inv.paymentHistory && inv.paymentHistory.length > 0) {
          const idxMatch = payId.match(/^pay_(\d+)$/);
          if (idxMatch) {
            const idx = parseInt(idxMatch[1], 10);
            if (inv.paymentHistory[idx]) {
              foundPay = inv.paymentHistory[idx];
            }
          }
          if (!foundPay) {
            foundPay = inv.paymentHistory[0];
          }
        }

        if (foundPay) {
          const finalPay = { ...foundPay, id: foundPay.id || payId };
          setSelectedPayment(finalPay);
          setViewMode('kwitansi');
        } else {
          openDetailPage(inv);
        }
      };

      if (!selectedInvoice || (selectedInvoice.id !== invId && selectedInvoice.invoiceNumber !== invId)) {
        InvoiceService.getInvoiceById(invId).then(inv => {
          if (inv) syncKwitansi(inv);
        });
      } else {
        syncKwitansi(selectedInvoice);
      }
    } else if (parts.length >= 3 && lastPart === 'edit') {
      const invId = parts[parts.length - 2];
      if (!selectedInvoice || (selectedInvoice.id !== invId && selectedInvoice.invoiceNumber !== invId)) {
        InvoiceService.getInvoiceById(invId).then(inv => {
          if (inv) openEditPage(inv);
        });
      } else if (viewMode !== 'edit') {
        openEditPage(selectedInvoice);
      }
    } else if (parts.length >= 2 && !['invoices', 'invoice', 'new', 'edit', 'public'].includes(lastPart)) {
      const invId = lastPart;
      if (!selectedInvoice || (selectedInvoice.id !== invId && selectedInvoice.invoiceNumber !== invId)) {
        InvoiceService.getInvoiceById(invId).then(inv => {
          if (inv) openDetailPage(inv);
        });
      } else if (viewMode !== 'detail') {
        openDetailPage(selectedInvoice);
      }
    } else if (parts.length <= 1 || ['invoices', 'invoice'].includes(lastPart)) {
      if (viewMode !== 'list') {
        setViewMode('list');
        setSelectedInvoice(null);
        setSelectedPayment(null);
      }
    }
  }, [location.pathname]);

  const handleSelectClient = async (client: ClientOption) => {
    setSelectedClientId(client.clientId);
    setSelectedClientSource(client.source);
    setClientName(client.name);
    setClientEmail(client.email || '');
    setClientPhone(client.phone || '');
    setClientAddress(client.address || '');
    setSelectedProjectIds([]);
    setSelectedProjectId('');
    setShowClientDropdown(false);
    // The search box's displayed value is `clientSearch || clientName` — if
    // clientSearch (whatever the admin typed to find this client, e.g.
    // "beta") isn't cleared here, it keeps winning that `||` forever, so the
    // field visually shows the leftover search text instead of the actual
    // selected client name even though selection succeeded correctly
    // underneath (wrong number, wrong client on the saved invoice, etc. were
    // never at risk — this was purely a display bug, but a confusing one).
    setClientSearch('');

    // Fetch additional profile information from Firestore profiles if available
    try {
      const docRef = doc(db, 'profiles', client.clientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data();
        setClientEmail(profileData.email || client.email || '');
        setClientPhone(profileData.phoneNumber || profileData.phone || client.phone || '');
        setClientAddress(profileData.fullAddress || profileData.address || profileData.domicile || client.address || '');
      }
    } catch (err) {
      console.warn('[InvoiceGenerator] Gagal mengambil detail profil spesifik dari Firestore:', err);
    }
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
    if (!invoiceNumber || !clientName) {
      alert('Mohon isi Nomor Invoice dan Nama Klien.');
      return;
    }

    setIsSubmitting(true);
    try {
      const projectTitles = selectedProjectIds.map(id => {
        if (selectedInvoice && selectedInvoice.projectIds?.includes(id)) {
          const idx = selectedInvoice.projectIds.indexOf(id);
          if (selectedInvoice.projectTitles && selectedInvoice.projectTitles[idx]) {
            return selectedInvoice.projectTitles[idx];
          }
        }
        return '';
      }).filter(Boolean);

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
        projectId: selectedProjectId || selectedProjectIds[0] || '',
        projectTitle: projectTitles.join(', ') || '',
        projectIds: selectedProjectIds || [],
        projectTitles: projectTitles || [],
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
      let createdPublicToken: string | undefined;
      if (editingInvoiceId) {
        await InvoiceService.updateInvoice(editingInvoiceId, payload);
      } else {
        const created = await InvoiceService.addInvoice(payload);
        targetId = created.id;
        createdPublicToken = created.publicToken;
      }

      // Switch to detail view of saved invoice
      const savedInvoice: Invoice = {
        ...payload,
        id: targetId || `inv_${Date.now()}`,
        // Preserve the real publicToken that was actually persisted for a
        // new invoice — without this, "Salin Link" / preview would fall
        // back to using the raw invoice id as the public URL (an ugly,
        // fragile substitute for the intended short random token) until
        // the next full list refresh happened to pull the correct value
        // back from D1.
        publicToken: editingInvoiceId ? (selectedInvoice?.publicToken) : createdPublicToken
      };
      setSelectedInvoice(savedInvoice);
      setPayAmount(savedInvoice.balanceDue);
      setViewMode('detail');

      // The invoice list cache (memory + localStorage) is now stale — clear
      // it so the list reflects this create/edit on the next visit instead
      // of showing outdated data.
      clearInvoiceCache();
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert('Gagal menyimpan invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus invoice ini?')) {
      const backupInvoices = [...invoices];
      const backupTotal = totalInvoicesCount;
      
      // Optimistically update the UI list state
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      setTotalInvoicesCount(prev => Math.max(0, prev - 1));
      
      if (selectedInvoice?.id === id) {
        setSelectedInvoice(null);
        setViewMode('list');
      }

      try {
        await InvoiceService.deleteInvoice(id);
        clearInvoiceCache();
      } catch (err) {
        console.error('Error deleting invoice:', err);
        alert('Gagal menghapus invoice. Mengembalikan data...');
        setInvoices(backupInvoices);
        setTotalInvoicesCount(backupTotal);
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
    const backupSelectedInvoice = { ...selectedInvoice };
    const backupInvoices = [...invoices];

    // Compute updated local state values
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

    // Optimistically update the UI states
    setSelectedInvoice(updatedInv);
    setPayAmount(newBalance);
    setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? updatedInv : inv));

    try {
      await InvoiceService.addPayment(selectedInvoice.id, selectedInvoice, {
        date: payDate || new Date().toISOString().split('T')[0],
        amount: payAmount,
        method: payMethod,
        notes: `${payRefNumber ? 'Ref: ' + payRefNumber + ' - ' : ''}${payNotes}`.trim(),
        recordedBy: 'Staff Kantor'
      });
      clearInvoiceCache();
      const nextPayCount = (updatedInv.paymentHistory?.length || 0) + 1;
      setPayRefNumber(`KWT/${nextPayCount.toString().padStart(3, '0')}/VIII/${new Date().getFullYear()}`);
      setPayNotes('');
    } catch (err) {
      console.error('Error adding payment:', err);
      alert('Gagal mencatat pembayaran. Mengembalikan data...');
      setSelectedInvoice(backupSelectedInvoice);
      setPayAmount(backupSelectedInvoice.balanceDue);
      setInvoices(backupInvoices);
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

  // Optimized fast sorting on current paginated list (maximum 10-50 rows, lightning fast)
  const sortedInvoices = React.useMemo(() => {
    return [...invoices].sort((a, b) => {
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
  }, [invoices, sortField, sortOrder]);

  const totalItems = totalInvoicesCount;
  const totalPages = Math.ceil(totalItems / (pageSize === 'Semua' ? 500 : Number(pageSize))) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedInvoices = sortedInvoices;
  const filteredInvoices = sortedInvoices;

  const filteredClientOptions = React.useMemo(() => {
    if (!clientSearch) return localClients;
    const q = clientSearch.toLowerCase().trim();
    return localClients.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [localClients, clientSearch]);

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
        <div className="md:hidden bg-slate-50 min-h-screen px-4 pt-4 pb-12">
          <MobileHeader
            title="Invoice"
            onOpenSidebar={() => {
              if (typeof window !== 'undefined') {
                const btn = document.querySelector('button[aria-label="Toggle sidebar"]') as HTMLButtonElement;
                if (btn) btn.click();
              }
            }}
            onAdd={openCreatePage}
            addTooltip="Buat Invoice Baru"
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Cari nomor invoice, klien..."
            totalItems={totalItems}
            totalLabel="Invoice"
            customSummary={
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { label: 'SEMUA', value: 'ALL' },
                  { label: 'BELUM LUNAS', value: 'UNPAID' },
                  { label: 'LUNAS', value: 'PAID' },
                  { label: 'DIBATALKAN', value: 'CANCELLED' }
                ].map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === tab.value
                        ? 'bg-white text-[#1e61c3] shadow-xs'
                        : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
            sortOptions={[
              { field: 'date', order: 'desc', label: 'Terbaru' },
              { field: 'number', order: 'asc', label: 'No. Invoice (A-Z)' },
              { field: 'number', order: 'desc', label: 'No. Invoice (Z-A)' },
              { field: 'date', order: 'asc', label: 'Terlama' },
            ]}
            currentSortLabel={
              sortField === 'number'
                ? (sortOrder === 'asc' ? 'No. Invoice A-Z' : 'No. Invoice Z-A')
                : (sortOrder === 'desc' ? 'Terbaru' : 'Terlama')
            }
            onSelectSort={(opt) => {
              setSortField(opt.field as any);
              setSortOrder(opt.order);
            }}
          />

          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
                <div className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs font-medium">Memuat data invoice...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <MobileEmptyState
                message='Belum ada data invoice. Klik "TAMBAH INVOICE" untuk membuat.'
                actionText="Buat Invoice"
                onAction={openCreatePage}
              />
            ) : (
              filteredInvoices.map(inv => (
                <MobileInvoiceRow
                  key={inv.id}
                  invoice={inv}
                  onClick={() => { setSelectedInvoice(inv); setViewMode('detail'); }}
                  onDelete={() => handleDeleteInvoice(inv.id)}
                  formatCurrency={formatCurrency}
                />
              ))
            )}
          </div>

          {/* MOBILE PAGINATION */}
          {totalItems > 0 && totalPages > 1 && (
            <div className="mt-6 mb-4 flex flex-col items-center gap-2.5">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all font-bold cursor-pointer shrink-0 shadow-2xs"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page Numbers */}
                {getMobilePageNumbers(safeCurrentPage, totalPages).map((pItem, idx) => {
                  if (pItem === '...') {
                    return (
                      <span key={`dots-${idx}`} className="w-7 h-9 flex items-center justify-center text-slate-400 text-xs font-bold select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = safeCurrentPage === pItem;
                  return (
                    <button
                      key={`page-${pItem}`}
                      type="button"
                      onClick={() => setCurrentPage(Number(pItem))}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        isCurrent
                          ? 'bg-[#1e61c3] text-white shadow-xs'
                          : 'border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                      }`}
                    >
                      {pItem}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all font-bold cursor-pointer shrink-0 shadow-2xs"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="text-[11px] font-medium text-slate-500 text-center">
                Menampilkan {Math.min(totalItems, (safeCurrentPage - 1) * (typeof pageSize === 'string' ? totalItems : pageSize) + 1)}-{Math.min(totalItems, safeCurrentPage * (typeof pageSize === 'string' ? totalItems : pageSize))} dari {totalItems} invoice
              </div>
            </div>
          )}
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
                    const limitVal = typeof pageSize === 'string' ? totalItems : pageSize;
                    const serialNumber = (safeCurrentPage - 1) * limitVal + idx + 1;
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
                    const val = e.target.value === 'Semua' ? 'Semua' : Number(e.target.value);
                    setPageSize(val);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                  <option value={50}>50</option>
                  <option value="Semua">Semua</option>
                </select>
                <span>baris. Menampilkan {totalItems === 0 ? 0 : Math.min(totalItems, (safeCurrentPage - 1) * (typeof pageSize === 'string' ? totalItems : pageSize) + 1)}-{Math.min(totalItems, safeCurrentPage * (typeof pageSize === 'string' ? totalItems : pageSize))} dari {totalItems} invoice.</span>
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
                <button onClick={() => { navigate('/invoices'); setIsMobileActionSheetOpen(false); }} className="p-2 -ml-2 rounded-full active:bg-white/10">
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
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <FileText size={16} className="text-blue-600" />
                          Riwayat Pembayaran
                        </h4>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                          {inv.paymentHistory.length} Transaksi
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {inv.paymentHistory.map((p, pIdx) => {
                          const payId = p.id || `pay_${pIdx}`;
                          const refStr = p.refNumber || (p.notes?.match(/Ref:\s*([^\s-]+)/i)?.[1]);
                          return (
                            <div
                              key={payId}
                              onClick={() => {
                                setIsMobilePaymentOpen(false);
                                openKwitansiDetail(inv, { ...p, id: payId });
                              }}
                              tabIndex={0}
                              role="button"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setIsMobilePaymentOpen(false);
                                  openKwitansiDetail(inv, { ...p, id: payId });
                                }
                              }}
                              className="group bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-400 hover:shadow-xs active:bg-slate-100/90 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    Rp {formatCurrency(p.amount)}
                                  </span>
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                    {p.method || 'Transfer BCA'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono">
                                  <span>{formatDateIndo(p.date)}</span>
                                  {refStr && <span className="text-blue-600 font-medium truncate">Ref: {refStr}</span>}
                                </div>
                                {p.notes && !p.notes.startsWith('Ref:') && (
                                  <p className="text-[11px] text-slate-500 italic truncate">{p.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-blue-600 font-semibold text-xs shrink-0">
                                <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          );
                        })}
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
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <FileText size={14} className="text-blue-600" />
                  Riwayat Pembayaran
                </h3>
                {inv.paymentHistory && inv.paymentHistory.length > 0 && (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {inv.paymentHistory.length} Pembayaran
                  </span>
                )}
              </div>

              {inv.paymentHistory && inv.paymentHistory.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {inv.paymentHistory.map((p, pIdx) => {
                    const payId = p.id || `pay_${pIdx}`;
                    const refStr = p.refNumber || (p.notes?.match(/Ref:\s*([^\s-]+)/i)?.[1]);
                    return (
                      <div
                        key={payId}
                        onClick={() => openKwitansiDetail(inv, { ...p, id: payId })}
                        tabIndex={0}
                        role="button"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openKwitansiDetail(inv, { ...p, id: payId });
                          }
                        }}
                        className="group p-3 bg-slate-50/80 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 hover:border-blue-300 text-xs space-y-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:bg-blue-100/40"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span className="text-slate-900 font-bold group-hover:text-blue-700 transition-colors">
                            Rp {formatCurrency(p.amount)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">{formatDateIndo(p.date)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span className="font-medium text-slate-700">{p.method || 'Transfer'}</span>
                          {refStr && <span className="text-[10px] font-mono text-blue-600 font-semibold">Ref: {refStr}</span>}
                        </div>
                        {p.notes && !p.notes.startsWith('Ref:') && (
                          <p className="text-[10px] text-slate-500 italic truncate">{p.notes}</p>
                        )}
                        <div className="pt-1 flex items-center justify-end text-[10px] font-bold text-blue-600 group-hover:underline">
                          <span>Buka Kwitansi</span>
                          <ChevronRight size={12} className="ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Belum ada riwayat pembayaran
                </div>
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
  // RENDER 2B: KWITANSI DETAIL VIEW
  // =========================================================================
  if (viewMode === 'kwitansi' && selectedInvoice && selectedPayment) {
    const inv = selectedInvoice;
    const pay = selectedPayment;
    const receiptNo = pay.refNumber || pay.id || `KWT/${inv.invoiceNumber}`;
    const paymentDateStr = formatDateIndo(pay.date);
    const amountWords = terbilang(pay.amount);

    return (
      <div className="p-4 md:p-6 w-[94%] xl:w-[92%] max-w-4xl mx-auto space-y-6">
        {/* Navigation & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setViewMode('detail');
                navigate(`/invoices/${encodeURIComponent(inv.id)}`);
              }}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-[0.98]"
            >
              <ArrowLeft size={16} /> Kembali ke Tagihan
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Kwitansi Pembayaran
              </h1>
              <p className="text-xs text-slate-500 font-mono">{receiptNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => printKwitansi(inv, pay)}
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <Printer size={15} /> Cetak
            </button>
            <button
              onClick={async () => {
                setDownloadingKwitansiPdf(true);
                try {
                  await downloadKwitansiPdf(inv, pay);
                } catch (e) {
                  console.error('Error downloading kwitansi pdf:', e);
                  alert('Gagal mengunduh Kwitansi PDF.');
                } finally {
                  setDownloadingKwitansiPdf(false);
                }
              }}
              disabled={downloadingKwitansiPdf}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98]"
            >
              <Download size={15} />
              {downloadingKwitansiPdf ? 'Mengunduh...' : 'Download PDF Kwitansi'}
            </button>
          </div>
        </div>

        {/* Printable / Screen Kwitansi Document Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
          {/* Kop & Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-blue-600 pb-5 gap-4">
            <div>
              <h2 className="text-blue-600 font-bold text-base sm:text-lg leading-snug tracking-tight">
                NOTARIS / PPAT<br />
                NUKANTINI PUTRI PARINCHA, S.H., M.Kn.
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Jl. Dipatiukur No. 128, Bandung | Telp: (022) 2501234
              </p>
            </div>
            <div className="sm:text-right">
              <h1 className="text-2xl font-black text-slate-900 tracking-wider">KWITANSI</h1>
              <div className="text-xs text-slate-600 mt-1 font-mono space-y-0.5">
                <div><span className="font-bold">No. Kwitansi:</span> {receiptNo}</div>
                <div><span className="font-bold">Tanggal:</span> {paymentDateStr}</div>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-start py-1">
              <div className="sm:col-span-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                Sudah Terima Dari
              </div>
              <div className="sm:col-span-8 font-bold text-slate-900 text-sm sm:text-base">
                {inv.clientName || '-'}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-center py-1">
              <div className="sm:col-span-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                Uang Sejumlah
              </div>
              <div className="sm:col-span-8">
                <div className="inline-block bg-blue-50/80 text-blue-900 border border-blue-200 rounded-xl px-4 py-2 font-black text-lg sm:text-xl shadow-2xs">
                  Rp {formatCurrency(pay.amount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-start py-1">
              <div className="sm:col-span-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                Terbilang
              </div>
              <div className="sm:col-span-8">
                <div className="bg-slate-50 border-l-4 border-blue-600 p-3 rounded-r-xl italic font-bold text-slate-800 text-xs sm:text-sm">
                  {amountWords}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-start py-1">
              <div className="sm:col-span-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                Untuk Pembayaran
              </div>
              <div className="sm:col-span-8 space-y-1">
                <div className="font-bold text-slate-900 font-mono">
                  Invoice {inv.invoiceNumber}
                </div>
                {inv.projectTitle && (
                  <div className="text-xs text-slate-600 font-medium">
                    Perihal: {inv.projectTitle}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-start py-1">
              <div className="sm:col-span-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                Metode Pembayaran
              </div>
              <div className="sm:col-span-8 font-medium text-slate-800">
                {pay.method || 'Transfer BCA'}
                {pay.refNumber && (
                  <span className="ml-2 font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    Ref: {pay.refNumber}
                  </span>
                )}
              </div>
            </div>

            {pay.notes && !pay.notes.startsWith('Ref:') && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-start py-1">
                <div className="sm:col-span-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Catatan
                </div>
                <div className="sm:col-span-8 text-xs text-slate-600 italic">
                  {pay.notes}
                </div>
              </div>
            )}
          </div>

          {/* Footer & Signature Section */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6">
            <div className="text-xs text-slate-500 space-y-1">
              <div className="font-bold text-slate-800">Ringkasan Tagihan:</div>
              <div>Total Invoice: Rp {formatCurrency(inv.totalAmount)}</div>
              <div>Sisa Tagihan Saat Ini: Rp {formatCurrency(inv.balanceDue)}</div>
              <div className="text-[10px] text-slate-400 mt-2">
                * Kwitansi ini diterbitkan resmi oleh Kantor Notaris / PPAT Nukantini Putri Parincha, S.H., M.Kn.
              </div>
            </div>

            <div className="text-center sm:text-right shrink-0">
              <div className="text-xs text-slate-600 mb-1">
                Bandung, {paymentDateStr}
              </div>
              <div className="text-xs font-bold text-slate-800 mb-2">
                Hormat kami,
              </div>
              <div className="py-2">
                <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-xl mx-auto sm:ml-auto flex items-center justify-center text-blue-600 font-bold text-[10px]">
                  [ TTD / QR ]
                </div>
              </div>
              <div className="text-xs font-bold text-slate-900 border-t border-slate-300 pt-1 mt-1">
                NOTARIS / PPAT NUKANTINI PUTRI PARINCHA, S.H., M.Kn.
              </div>
            </div>
          </div>
        </div>
      </div>
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
    <div className="p-4 md:p-6 w-[94%] xl:w-[92%] max-w-none mx-auto space-y-4 pb-24 md:pb-6">
      {/* Top Header Desktop (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-3">
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
        {/* Mobile Blue Header (block md:hidden) */}
        <div 
          className="block md:hidden bg-[#1e61c3] text-white rounded-b-[2rem] p-4.5 pb-5 shadow-sm relative overflow-hidden -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)'
          }}
        >
          {/* Decorative Circular Background Accents */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-b-[2rem]" aria-hidden="true">
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-white/5" />
            <div className="absolute top-1/2 right-1/3 w-20 h-20 rounded-full bg-white/[0.04]" />
          </div>

          <div className="relative z-10 space-y-3.5">
            {/* Top Bar: Back + Title & Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedInvoice && editingInvoiceId) {
                      setViewMode('detail');
                    } else {
                      setViewMode('list');
                    }
                  }}
                  className="p-1 -ml-1 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-base font-extrabold text-white tracking-tight leading-tight">
                    {editingInvoiceId ? `Edit Invoice` : 'Buat Invoice Baru'}
                  </h1>
                  <p className="text-[10px] text-blue-100/90 font-medium">Formulir penagihan biaya jasa</p>
                </div>
              </div>

              <span className="bg-white/20 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full border border-white/30 backdrop-blur-2xs shadow-2xs">
                {status === 'UNPAID' ? 'BELUM LUNAS' : status === 'PAID' ? 'LUNAS' : status === 'CANCELLED' ? 'BATAL' : 'DRAFT'}
              </span>
            </div>

            {/* Direct Header Fields (Full Bleed - No Inner Card Wrapper) */}
            <div className="space-y-3 pt-1">
              {/* Klien Selector */}
              <div className="space-y-1 relative" ref={mobileClientDropdownRef}>
                <label className="block font-bold text-blue-100 text-[10px] uppercase tracking-wide">
                  KLIEN <span className="text-amber-300">* WAJIB</span>
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400 z-10" />
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
                    className="w-full pl-8 pr-8 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-xs"
                  />
                  {(clientName || clientSearch) && (
                    <button
                      type="button"
                      onClick={handleClearClient}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer z-10"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {showClientDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-50 max-h-56 flex flex-col overflow-hidden p-1 text-slate-900">
                    <div className="overflow-y-auto flex-1 max-h-48">
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
                            key={c.clientId}
                            role="button"
                            tabIndex={0}
                            onPointerDown={(e) => {
                              e.preventDefault();
                              handleSelectClient(c);
                            }}
                            className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-slate-800 text-xs truncate max-w-[200px] block">{c.name}</span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {c.clientType ? `[${c.clientType}] ` : ''}{c.address || c.email || c.phone || ''}
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

              {/* Grid: Nomor Invoice, Tanggal, Jatuh Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="block font-bold text-blue-100 text-[10px] uppercase tracking-wide">NOMOR INVOICE</label>
                  <input
                    type="text"
                    required
                    disabled={isFetchingInvoiceNumber}
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder={isFetchingInvoiceNumber ? 'Memuat...' : undefined}
                    className="w-full p-2 bg-white/20 border border-white/30 rounded-xl font-bold text-white placeholder-blue-200 text-xs focus:outline-none focus:bg-white/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-blue-100 text-[10px] uppercase tracking-wide">TANGGAL INVOICE</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full p-2 bg-white/20 border border-white/30 rounded-xl font-bold text-white text-xs focus:outline-none focus:bg-white/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-blue-100 text-[10px] uppercase tracking-wide">JATUH TEMPO</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 bg-white/20 border border-white/30 rounded-xl font-bold text-white text-xs focus:outline-none focus:bg-white/30"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Header Card (hidden on mobile) */}
        <div className="hidden md:block bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
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
                  <div className="overflow-y-auto flex-1 max-h-56">
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
                          key={c.clientId}
                          onClick={() => handleSelectClient(c)}
                          className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-800 text-xs truncate max-w-[200px] block">{c.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {c.clientType ? `[${c.clientType}] ` : ''}{c.address || c.email || c.phone || ''}
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
                disabled={isFetchingInvoiceNumber}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={isFetchingInvoiceNumber ? 'Memuat nomor...' : undefined}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-xs disabled:text-slate-400"
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
        </div>

        {/* Card 3: ITEM TAGIHAN */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">ITEM TAGIHAN</h3>
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
                setItems(prev => {
                  const newIdx = prev.length;
                  setActiveMobileItemIdx(newIdx);
                  return [...prev, newItem];
                });
                
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
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-blue-100/80 shrink-0"
            >
              <Plus size={15} /> <span>Tambah Item</span>
            </button>
          </div>

          {/* Desktop Table View (hidden on mobile) */}
          <div className="hidden md:block border border-slate-200/80 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed">
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

          {/* Mobile Card Stack View (hidden on desktop) */}
          <div className="block md:hidden space-y-2.5">
            {items.length === 0 ? (
              <div className="p-6 text-center text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Belum ada item ditambahkan. Silakan klik "+ Tambah Item".
              </div>
            ) : (
              items.map((it, idx) => {
                const lines = (it.description || '').split('\n').filter(Boolean);
                const title = lines[0] || `Item ${idx + 1}`;
                const subtitle = lines.slice(1).join(' ');
                return (
                  <div
                    key={it.id || idx}
                    onClick={() => setActiveMobileItemIdx(idx)}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200/90 hover:border-blue-300 shadow-2xs active:bg-blue-50/50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="font-bold text-slate-900 text-xs truncate uppercase tracking-tight">
                        {title}
                      </h4>
                      {subtitle && (
                        <p className="text-[11px] text-slate-500 truncate font-medium">
                          {subtitle}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 font-semibold">
                        {it.quantity || 1} Pcs × Rp {formatCurrency(it.unitPrice || 0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="bg-blue-50 text-blue-700 font-extrabold text-xs px-2.5 py-1.5 rounded-xl border border-blue-100/80">
                        Rp {formatCurrency(getItemSubtotal(it))}
                      </span>
                      <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ringkasan Tagihan Card */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center text-xs text-slate-600">
            <span className="font-medium">Subtotal</span>
            <span className="font-bold text-slate-900">Rp {formatCurrency(currentSub)}</span>
          </div>
          {currentTax > 0 && (
            <div className="flex justify-between items-center text-xs text-red-600">
              <span className="font-medium">Potongan Pajak (PPh 21)</span>
              <span className="font-bold">(Rp {formatCurrency(currentTax)})</span>
            </div>
          )}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">TOTAL TAGIHAN</span>
            <span className="font-black text-blue-600 text-base md:text-lg">Rp {formatCurrency(currentTotal)}</span>
          </div>
        </div>

        {/* Card 4: Rekening Pembayaran & Pajak (Collapsible Section) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all">
          <div
            onClick={() => setIsBankDetailsExpanded(prev => !prev)}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsBankDetailsExpanded(prev => !prev);
              }
            }}
            className="p-4 md:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100/80">
                <Building2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Rekening Pembayaran & Pajak
                  </h4>
                  {!isBankDetailsExpanded && (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
                      Diciutkan
                    </span>
                  )}
                </div>
                {!isBankDetailsExpanded && (bankName || accountNumber) && (
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {[bankName, accountNumber, accountHolder].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                {isBankDetailsExpanded ? 'Sembunyikan' : 'Ubah Rekening'}
              </span>
              {isBankDetailsExpanded ? (
                <ChevronUp size={20} className="text-slate-600 transition-transform duration-200" />
              ) : (
                <ChevronDown size={20} className="text-slate-600 transition-transform duration-200" />
              )}
            </div>
          </div>

          {isBankDetailsExpanded && (
            <div className="p-4 md:p-5 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. BCA Cabang Dago - Bandung"
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. Acc. 7770673016"
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Atas Nama</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="e.g. A.n Nukantini Putri Parincha"
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">NPWP 16 Digit</label>
                  <input
                    type="text"
                    value={bankNpwp}
                    onChange={(e) => setBankNpwp(e.target.value)}
                    placeholder="e.g. 3217015610760002"
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">SWIFT BCA</label>
                  <input
                    type="text"
                    value={bankSwift}
                    onChange={(e) => setBankSwift(e.target.value)}
                    placeholder="e.g. CENAIDJA"
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 5: Catatan & Pengaturan Status (Collapsible Section) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all">
          <div
            onClick={() => setIsNotesExpanded(prev => !prev)}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsNotesExpanded(prev => !prev);
              }
            }}
            className="p-4 md:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Catatan & Pengaturan Status
                  </h4>
                  {!isNotesExpanded && (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
                      Diciutkan
                    </span>
                  )}
                </div>
                {!isNotesExpanded && (
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    Catatan, Bahasa ({language === 'id' ? 'ID' : 'EN'}) & Status ({status === 'UNPAID' ? 'BELUM LUNAS' : status === 'PAID' ? 'LUNAS' : status})
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400 shrink-0">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                {isNotesExpanded ? 'Sembunyikan' : 'Buka Catatan'}
              </span>
              {isNotesExpanded ? <ChevronUp size={20} className="text-slate-600" /> : <ChevronDown size={20} className="text-slate-600" />}
            </div>
          </div>

          {isNotesExpanded && (
            <div className="p-4 md:p-5 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Catatan Invoice (PPh 21 / Instruktur)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Tambah catatan..."
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Bahasa Invoice</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'id' | 'en')}
                      className="w-full p-2 border border-slate-200 rounded-xl bg-white font-medium text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Invoice</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full p-2 border border-slate-200 rounded-xl bg-white font-medium text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="UNPAID">BELUM LUNAS</option>
                      <option value="PAID">LUNAS</option>
                      <option value="CANCELLED">DIBATALKAN</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Action Bar (Mobile Fixed / Desktop Static) */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-xl z-40 md:static md:p-0 md:bg-transparent md:border-0 md:shadow-none">
          <div className="flex items-center justify-end gap-2.5 max-w-5xl mx-auto">
            <button
              type="button"
              onClick={() => {
                if (selectedInvoice && editingInvoiceId) {
                  setViewMode('detail');
                } else {
                  setViewMode('list');
                }
              }}
              className="hidden md:inline-flex px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="hidden md:inline-flex px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs items-center gap-1.5 cursor-pointer"
            >
              <Printer size={15} /> Cetak
            </button>

            <button
              type="button"
              onClick={() => {
                setStatus('DRAFT');
                setTimeout(() => {
                  const form = document.querySelector('form');
                  if (form) form.requestSubmit();
                }, 50);
              }}
              className="flex-1 md:flex-initial px-4 py-3 md:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-all text-center border border-slate-200/80 shadow-2xs"
            >
              Simpan Draft
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isFetchingInvoiceNumber || !invoiceNumber}
              title={isFetchingInvoiceNumber ? 'Menunggu nomor invoice dari server...' : (!invoiceNumber ? 'Nomor invoice belum terisi' : undefined)}
              className="flex-1 md:flex-initial px-6 py-3 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98] transition-all text-center disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Menyimpan...' : isFetchingInvoiceNumber ? 'Memuat nomor...' : 'Simpan Invoice'}</span>
            </button>
          </div>
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

      {/* Mobile Item Detail Form Modal */}
      {activeMobileItemIdx !== null && items[activeMobileItemIdx] && (() => {
        const idx = activeMobileItemIdx;
        const it = items[idx];
        const handleCloseModal = () => {
          if (!it.description && (!it.unitPrice || it.unitPrice === 0)) {
            handleRemoveItem(idx);
          }
          setActiveMobileItemIdx(null);
        };
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[220] flex flex-col md:hidden animate-in fade-in duration-200">
            {/* Header Modal */}
            <div 
              className="bg-[#1e61c3] text-white p-4 pb-4 flex items-center justify-between shrink-0 shadow-md"
              style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)'
              }}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 -ml-1 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">
                    {it.description || it.unitPrice ? 'Detail Item' : 'Tambah Item Baru'}
                  </h3>
                  <p className="text-[10px] text-blue-100/90 font-medium">Item {idx + 1} dari {items.length}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold border border-white/30 transition-all cursor-pointer flex items-center gap-1"
              >
                <Check size={14} /> Selesai
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 bg-slate-50 overflow-y-auto p-4 space-y-4">
              {/* Card Form */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
                {/* Produk / Layanan Combobox */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Produk / Layanan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cari atau pilih produk..."
                      value={productSearchQueries[idx] !== undefined ? productSearchQueries[idx] : (it.description.split('\n')[0] || '')}
                      onFocus={() => setActiveProductDropdownIdx(idx)}
                      onBlur={() => setTimeout(() => setActiveProductDropdownIdx(null), 250)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProductSearchQueries(prev => ({ ...prev, [idx]: val }));
                        const lines = it.description.split('\n');
                        lines[0] = val;
                        handleItemChange(idx, 'description', lines.join('\n'));
                      }}
                      className="product-combobox-input w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                    {activeProductDropdownIdx === idx && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl z-50 max-h-52 overflow-y-auto p-1 text-xs">
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
                              className="w-full text-left p-2.5 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors block border-b border-slate-50 last:border-none"
                            >
                              <div className="font-bold text-slate-900">{p.name}</div>
                              {p.unitPrice > 0 && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  Rp {formatCurrency(p.unitPrice)}
                                </div>
                              )}
                            </button>
                          ))}
                        {allAvailableProducts.filter(p => p.name.toLowerCase().includes((productSearchQueries[idx] || '').toLowerCase())).length === 0 && (
                          <div className="p-3 text-center text-slate-400 italic text-xs">
                            Produk tidak ditemukan
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Deskripsi Lengkap */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Deskripsi Detail
                  </label>
                  <AutoResizingTextarea
                    value={it.description}
                    onChange={(val) => handleItemChange(idx, 'description', val)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 min-h-[80px]"
                    placeholder="Rincian deskripsi item tagihan..."
                  />
                </div>

                {/* Qty & Harga Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Qty Stepper */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Qty <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleItemChange(idx, 'quantity', Math.max(1, (it.quantity || 1) - 1))}
                        className="w-10 h-10 flex items-center justify-center font-black text-slate-700 bg-slate-100 hover:bg-slate-200 text-lg cursor-pointer select-none border-r border-slate-200 shrink-0"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={it.quantity || 1}
                        onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                        className="w-full text-center font-bold text-slate-900 bg-transparent text-sm focus:outline-none py-2"
                      />
                      <button
                        type="button"
                        onClick={() => handleItemChange(idx, 'quantity', (it.quantity || 1) + 1)}
                        className="w-10 h-10 flex items-center justify-center font-black text-slate-700 bg-slate-100 hover:bg-slate-200 text-lg cursor-pointer select-none border-l border-slate-200 shrink-0"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Harga (Rp) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Harga (Rp) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formatInputNumber(it.unitPrice || 0)}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', parseFormattedNumber(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-right text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {/* Diskon & PPh 21 Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Diskon (Rp) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">Diskon (Rp)</label>
                    <input
                      type="text"
                      placeholder="0"
                      value={it.discount ? formatInputNumber(it.discount) : ''}
                      onChange={(e) => handleItemChange(idx, 'discount', parseFormattedNumber(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-right text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* PPh 21 Dropdown */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">PPh 21</label>
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
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value={0}>0% (Tanpa PPh)</option>
                      <option value={0.05}>5%</option>
                      <option value={0.15}>15%</option>
                      <option value={0.25}>25%</option>
                      <option value={0.30}>30%</option>
                      <option value={0.35}>35%</option>
                    </select>
                  </div>
                </div>

                {/* Subtotal Item Footer */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Subtotal Item</span>
                  <span className="text-base font-black text-blue-600">
                    Rp {formatCurrency(getItemSubtotal(it))}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  handleRemoveItem(idx);
                  setActiveMobileItemIdx(null);
                }}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-red-200/80 cursor-pointer transition-all"
              >
                <Trash2 size={16} /> Hapus
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileItemIdx(null)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Check size={16} /> Simpan Item
              </button>
            </div>
          </div>
        );
      })()}

      {renderWhatsAppModal()}
    </div>
  );
};
