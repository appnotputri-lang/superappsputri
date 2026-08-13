import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from "../ui/PageLayout";
import { 
  Package, FileCheck, Plus, Search, Filter, Calendar, User, 
  MapPin, Phone, Truck, FileText, Send, Printer, Download, 
  Trash2, Edit, Eye, ArrowLeft, CheckCircle2, MessageSquare, 
  X, Check, AlertCircle, RefreshCw, Copy, ExternalLink, ShieldCheck, HelpCircle,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { GeneralDocumentData, GeneralDocumentItem, GeneralDocType, SidebarTabId } from '../../../types';
import { GeneralDocumentService } from '../../services/GeneralDocumentService';
import { resolveClientPhone, ClientOption } from '../../utils/clientPhoneResolver';
import { 
  printGeneralDocument, 
  downloadGeneralDocumentPdf, 
  getFooterText, 
  formatDate,
  formatDateIndonesian 
} from '../../utils/generalDocumentHtmlGenerator';
import { getApiUrl, getAuthHeaders } from '../../lib/api';
import { useAuthContext } from '../../contexts/AuthContext';

const DELIVERY_METHOD_OPTIONS = [
  'TANPA KURIR',
  'GOSEND',
  'GRAB EXPRESS',
  'SHOPEE EXPRESS',
  'LALAMOVE',
  'JNE',
  'TIKI',
  'J&T',
  'NINJA EXPRESS',
  'TRAVEL'
];

interface GeneralDocumentGeneratorProps {
  docType: GeneralDocType; // 'DELIVERY' | 'RECEIPT'
  setActiveSidebarTab?: (tab: SidebarTabId) => void;
}

export const GeneralDocumentGenerator: React.FC<GeneralDocumentGeneratorProps> = ({
  docType,
  setActiveSidebarTab
}) => {
  const authCtx = useAuthContext();
  const isDelivery = docType === 'DELIVERY';

  // Config & Theme according to type
  const config = {
    title: isDelivery ? 'Surat Jalan' : 'Tanda Terima',
    docTitle: isDelivery ? 'SURAT JALAN DOKUMEN' : 'TANDA TERIMA BERKAS',
    badgeIcon: isDelivery ? Package : FileCheck,
    badgeColor: isDelivery ? 'text-orange-600 bg-orange-100/80 border-orange-200' : 'text-emerald-600 bg-emerald-100/80 border-emerald-200',
    primaryBtnColor: isDelivery ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white',
    rightBoxLabel: isDelivery ? 'UNTUK' : 'PENERIMA',
    officerLabel: isDelivery ? 'Nama Petugas Pengantar' : 'Nama Petugas Penerima',
    officerShortLabel: isDelivery ? 'Petugas Pengantar' : 'Petugas Penerima',
    refPrefix: isDelivery ? 'SJ' : 'TT',
  };

  // State
  const [documents, setDocuments] = useState<GeneralDocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'form'>('list');
  const [selectedDoc, setSelectedDoc] = useState<GeneralDocumentData | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<'date' | 'referenceNo'>('referenceNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSort = (field: 'date' | 'referenceNo') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Form States
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSource, setClientSource] = useState<'local' | 'superapps' | undefined>(undefined);
  const [clientPic, setClientPic] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [destination, setDestination] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<GeneralDocumentItem[]>([
    { description: '', type: 'Asli' }
  ]);

  // Clients Master State
  const [localClients, setLocalClients] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // WhatsApp Share Modal States
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waTargetPhone, setWaTargetPhone] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waSendSuccess, setWaSendSuccess] = useState<string | null>(null);
  const [waSendError, setWaSendError] = useState<string | null>(null);
  const [waSendMode, setWaSendMode] = useState<'NUMBER' | 'GROUP'>('GROUP');
  const [waGroups, setWaGroups] = useState<any[]>([]);
  const [selectedWaGroupId, setSelectedWaGroupId] = useState('');
  const [isLoadingWaGroups, setIsLoadingWaGroups] = useState(false);

  // Load Documents from Firestore
  useEffect(() => {
    setLoading(true);
    const unsub = GeneralDocumentService.subscribeGeneralDocuments((data) => {
      // Filter for this docType
      const filtered = data.filter(d => d.docType === docType);
      setDocuments(filtered);
      
      if (selectedDoc) {
        const updated = filtered.find(d => d.id === selectedDoc.id);
        if (updated) setSelectedDoc(updated);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [docType, selectedDoc?.id]);

  // Cache Ref and D1 Fetch helper
  const localD1CacheRef = useRef<Record<string, ClientOption[]>>({});

  const fetchD1Clients = async (queryStr: string): Promise<ClientOption[]> => {
    const cacheKey = queryStr.trim().toLowerCase();
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
      console.error('[GeneralDocumentGenerator] D1 fetch/search error:', err);
      return [];
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

  useEffect(() => {
    loadClientOptions();
  }, []);

  // Debounced search for D1 clients as user types
  useEffect(() => {
    const trimmedQuery = clientSearch.trim();
    
    const delayDebounceFn = setTimeout(async () => {
      setIsLoadingClients(true);
      try {
        const res = await fetchD1Clients(trimmedQuery);
        setLocalClients(res);
      } catch (err) {
        console.warn('Failed to search D1 clients:', err);
      } finally {
        setIsLoadingClients(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [clientSearch]);

  // Set default officer name from user profile
  useEffect(() => {
    if (!officerName && authCtx?.userProfile?.name) {
      setOfficerName(authCtx.userProfile.name);
    }
  }, [authCtx?.userProfile?.name, officerName]);

  // Helper to generate reference number (3 digits only)
  const generateAutoRefNo = () => {
    const count = documents.length + 1;
    return String(count).padStart(3, '0');
  };

  // Open Create Form
  const handleOpenCreateForm = () => {
    setEditingDocId(null);
    setReferenceNo(generateAutoRefNo());
    setDate(new Date().toISOString().split('T')[0]);
    setClientId('');
    setClientName('');
    setClientSource(undefined);
    setClientPic('');
    setClientAddress('');
    setClientContact('');
    setOfficerName('SITI NUR AZIZAH');
    setDestination('');
    setDeliveryMethod(isDelivery ? 'TANPA KURIR' : '');
    setTrackingNumber('');
    setNotes('');
    setItems([{ description: '', type: 'Asli' }]);
    setViewMode('form');
  };

  // Open Edit Form
  const handleOpenEditForm = (docData: GeneralDocumentData) => {
    setEditingDocId(docData.id);
    setReferenceNo(docData.referenceNo || '');
    setDate(docData.date || new Date().toISOString().split('T')[0]);
    setClientId(docData.clientId || '');
    setClientName(docData.clientName || '');
    setClientSource(docData.clientSource);
    setClientPic(docData.clientPic || '');
    setClientAddress(docData.clientAddress || '');
    setClientContact(docData.clientContact || '');
    setOfficerName(docData.officerName || '');
    setDestination(docData.destination || '');
    setDeliveryMethod(docData.deliveryMethod || '');
    setTrackingNumber(docData.trackingNumber || '');
    setNotes(docData.notes || '');
    setItems(docData.items && docData.items.length > 0 ? [...docData.items] : [{ description: '', type: 'Asli' }]);
    setViewMode('form');
  };

  // Select Client from Dropdown
  const handleSelectClient = (c: ClientOption) => {
    setClientId(c.clientId);
    setClientName(c.name);
    setClientSource(c.source);
    setClientAddress(c.address || '');
    setClientContact(c.phone || '');
    if (isDelivery && !destination) {
      setDestination(c.address || '');
    }
    setShowClientDropdown(false);
  };

  // Items manipulation
  const handleAddItem = () => {
    setItems([...items, { description: '', type: 'Asli' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof GeneralDocumentItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Save Document
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!referenceNo.trim()) {
      alert('Nomor Referensi harus diisi.');
      return;
    }

    if (!clientName.trim()) {
      alert('Nama Klien / Penerima harus diisi.');
      return;
    }

    const validItems = items.filter(it => it.description.trim() !== '');
    if (validItems.length === 0) {
      alert('Mohon masukkan setidaknya 1 berkas/dokumen.');
      return;
    }

    const payload: Omit<GeneralDocumentData, 'id'> = {
      docType,
      referenceNo: referenceNo.trim(),
      date,
      clientId,
      clientName: clientName.trim(),
      clientSource,
      clientPic: clientPic.trim(),
      clientAddress: clientAddress.trim(),
      clientContact: clientContact.trim(),
      officerName: officerName.trim() || 'Petugas Notaris',
      items: validItems,
      destination: destination.trim(),
      deliveryMethod: deliveryMethod.trim(),
      trackingNumber: trackingNumber.trim(),
      notes: notes.trim(),
    };

    try {
      if (editingDocId) {
        await GeneralDocumentService.updateDocumentData(editingDocId, payload);
        const updatedDoc = { ...payload, id: editingDocId };
        setSelectedDoc(updatedDoc as GeneralDocumentData);
      } else {
        const newId = await GeneralDocumentService.addDocument(payload);
        const newDoc = { ...payload, id: newId };
        setSelectedDoc(newDoc as GeneralDocumentData);
      }
      setViewMode('detail');
    } catch (err) {
      console.error('Failed to save document:', err);
      alert('Gagal menyimpan dokumen. Silakan coba lagi.');
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string, refNo: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${config.title} (${refNo})?`)) return;
    try {
      await GeneralDocumentService.deleteDocumentData(id);
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
        setViewMode('list');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Gagal menghapus dokumen.');
    }
  };

  // Load WA Groups
  const fetchWaGroups = async () => {
    setIsLoadingWaGroups(true);
    try {
      const response = await fetch('/api/send-whatsapp/groups');
      if (response.ok) {
        const resData = await response.json();
        if (Array.isArray(resData.data)) {
          setWaGroups(resData.data);
          if (resData.data.length > 0 && !selectedWaGroupId) {
            setSelectedWaGroupId(resData.data[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch WA groups:', err);
    } finally {
      setIsLoadingWaGroups(false);
    }
  };

  // Open WhatsApp Share Modal
  const handleOpenWaModal = async (docData: GeneralDocumentData) => {
    setSelectedDoc(docData);
    setWaSendSuccess(null);
    setWaSendError(null);
    setWaSendMode('NUMBER');
    setIsWaModalOpen(true);
    setWaTargetPhone('');

    // Fetch WA Groups
    fetchWaGroups();

    // Resolve Phone Number
    const resolvedPhone = await resolveClientPhone({
      clientId: docData.clientId,
      clientName: docData.clientName,
      clientPhone: docData.clientContact,
      clientSource: docData.clientSource,
      localClients
    });

    if (resolvedPhone) {
      setWaTargetPhone(resolvedPhone);
    }

    // Format WA Message Text
    const itemsText = docData.items.map((it, idx) => `  ${idx + 1}. ${it.description} (${it.type})`).join('\n');
    const token = docData.publicToken || docData.id;
    const publicUrl = `${window.location.origin}/doc/${token}`;

    let message = '';
    if (isDelivery) {
      message = `Yth. ${docData.clientName},\n\n` +
        `Berikut kami sampaikan *Surat Jalan Dokumen* (No: ${docData.referenceNo}) dari Kantor Notaris/PPAT Nukantini Putri Parincha, SH. M.Kn:\n\n` +
        `*Daftar Berkas/Dokumen:*\n${itemsText}\n\n` +
        `*Petugas Pengantar:* ${docData.officerName || '-'}\n` +
        (docData.deliveryMethod ? `*Metode Pengiriman:* ${docData.deliveryMethod}\n` : '') +
        (docData.trackingNumber ? `*No. Resi/Kendaraan:* ${docData.trackingNumber}\n` : '') +
        `\nDetail dokumen PDF & cetak resmi dapat diakses di:\n${publicUrl}\n\n` +
        `Atas perhatian dan kerja samanya, kami ucapkan terima kasih.\n\n` +
        `Hormat kami,\nNotaris/PPAT Nukantini Putri Parincha, SH. M.Kn`;
    } else {
      message = `Yth. ${docData.clientName},\n\n` +
        `Berikut kami sampaikan *Tanda Terima Berkas* (No: ${docData.referenceNo}) atas penerimaan dokumen di Kantor Notaris/PPAT Nukantini Putri Parincha, SH. M.Kn:\n\n` +
        `*Daftar Berkas/Dokumen yang Diterima:*\n${itemsText}\n\n` +
        `*Petugas Penerima:* ${docData.officerName || '-'}\n\n` +
        `Detail dokumen PDF & bukti penerimaan resmi dapat diakses di:\n${publicUrl}\n\n` +
        `Atas perhatian dan kerja samanya, kami ucapkan terima kasih.\n\n` +
        `Hormat kami,\nNotaris/PPAT Nukantini Putri Parincha, SH. M.Kn`;
    }

    setWaMessage(message);
  };

  // Send WA Message via Fonnte
  const handleSendWaMessage = async () => {
    let finalTarget = '';
    let targetLabel = '';

    if (waSendMode === 'GROUP') {
      if (!selectedWaGroupId) {
        setWaSendError('Silakan pilih WhatsApp Group tujuan.');
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
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: finalTarget, message: waMessage })
      });

      const resData = await response.json();
      if (response.ok && (resData.status === true || resData.success === true || resData.status === 'sent')) {
        setWaSendSuccess(`Pesan WhatsApp ${config.title} berhasil dikirim ke ${targetLabel}!`);
      } else {
        setWaSendError(resData.message || resData.error || 'Gagal mengirim pesan via Fonnte.');
      }
    } catch (err: any) {
      setWaSendError(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsSendingWa(false);
    }
  };

  // Filtered and sorted documents for list view
  const filteredDocs = documents
    .filter(docData => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (docData.referenceNo || '').toLowerCase().includes(q) ||
        (docData.clientName || '').toLowerCase().includes(q) ||
        (docData.clientPic || '').toLowerCase().includes(q) ||
        (docData.officerName || '').toLowerCase().includes(q) ||
        (docData.deliveryMethod || '').toLowerCase().includes(q) ||
        (docData.items || []).some(it => (it.description || '').toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortField === 'date') {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
      } else {
        const numA = a.referenceNo || '';
        const numB = b.referenceNo || '';
        return sortOrder === 'asc'
          ? numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' })
          : numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
      }
    });

  const totalItems = filteredDocs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedDocs = filteredDocs.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Client dropdown items
  const filteredClientsDropdown = localClients;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* HEADER BAR */}
      <div className="w-[94%] xl:w-[92%] max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-2">
        <PageHeader
          title={config.title}
          description={isDelivery ? 'Kelola pengiriman dokumen & berkas ke klien/pihak ketiga' : 'Kelola bukti tanda terima penyerahan berkas masuk'}
          actions={
            <>
              {viewMode === 'list' && (
                <button
                  onClick={handleOpenCreateForm}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer self-start sm:self-auto ${config.primaryBtnColor}`}
                >
                  <Plus size={16} />
                  <span>Buat {config.title}</span>
                </button>
              )}

              {viewMode !== 'list' && (
                <button
                  onClick={() => setViewMode('list')}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all cursor-pointer self-start sm:self-auto"
                >
                  <ArrowLeft size={16} />
                  <span>Kembali ke Daftar</span>
                </button>
              )}
            </>
          }
        />
      </div>

      <div className="w-[94%] xl:w-[92%] max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* ================= LIST VIEW ================= */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            {/* SEARCH & CONTROLS */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Cari nomor, nama klien, atau ${config.title.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="text-xs font-semibold text-slate-500 whitespace-nowrap px-2">
                Menampilkan <span className="text-slate-900 font-bold">{filteredDocs.length}</span> dari {documents.length} {config.title.toLowerCase()}
              </div>
            </div>

            {/* TABLE LIST */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-xs font-medium">Memuat data {config.title.toLowerCase()}...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
                <config.badgeIcon size={40} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-800">Belum Ada {config.title}</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery ? 'Tidak ada data yang cocok dengan pencarian Anda.' : `Klik tombol "Buat ${config.title} Baru" untuk membuat dokumen pertama.`}
                </p>
                {!searchQuery && (
                  <button
                    onClick={handleOpenCreateForm}
                    className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs cursor-pointer ${config.primaryBtnColor}`}
                  >
                    <Plus size={16} />
                    <span>Buat Baru Sekarang</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-[1000px] w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200/80 font-bold select-none">
                        <th className="p-3.5 w-12 text-center">No.</th>
                        <th
                          className="p-3.5 cursor-pointer hover:bg-slate-100/80 transition-all group"
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
                          className="p-3.5 cursor-pointer hover:bg-slate-100/80 transition-all group"
                          onClick={() => handleSort('referenceNo')}
                        >
                          <div className="flex items-center gap-1.5">
                            No. Referensi
                            {sortField === 'referenceNo' ? (
                              sortOrder === 'asc' ? <ChevronUp size={13} className="text-blue-600" /> : <ChevronDown size={13} className="text-blue-600" />
                            ) : (
                              <span className="text-slate-300 group-hover:text-slate-400">↕</span>
                            )}
                          </div>
                        </th>
                        <th className="p-3.5">Klien / Penerima</th>
                        <th className="p-3.5">{config.officerShortLabel}</th>
                        <th className="p-3.5 text-center">Jumlah Berkas</th>
                        {isDelivery && <th className="p-3.5">Metode Pengiriman</th>}
                        <th className="p-3.5 text-right pr-6">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {paginatedDocs.map((docData, idx) => {
                        const serialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                        return (
                          <tr
                            key={docData.id}
                            onClick={() => { setSelectedDoc(docData); setViewMode('detail'); }}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                          >
                            <td className="p-3.5 text-slate-500 font-semibold text-center whitespace-nowrap">
                              {serialNumber}
                            </td>
                            <td className="p-3.5 text-slate-600 whitespace-nowrap">
                              {formatDate(docData.date)}
                            </td>
                            <td className="p-3.5 font-bold text-blue-600 group-hover:underline whitespace-nowrap">
                              {docData.referenceNo}
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900">{docData.clientName}</div>
                              {docData.clientPic && (
                                <div className="text-[11px] text-slate-500">U.p: {docData.clientPic}</div>
                              )}
                            </td>
                            <td className="p-3.5 text-slate-600">
                              {docData.officerName || '-'}
                            </td>
                            <td className="p-3.5 text-center whitespace-nowrap">
                              <span className="inline-block px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-bold text-[11px]">
                                {docData.items?.length || 0} berkas
                              </span>
                            </td>
                            {isDelivery && (
                              <td className="p-3.5 text-slate-600">
                                <div className="font-semibold">{docData.deliveryMethod || '-'}</div>
                                {docData.trackingNumber && (
                                  <div className="text-[10px] text-slate-400">Resi: {docData.trackingNumber}</div>
                                )}
                              </td>
                            )}
                            <td className="p-3.5 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  title="Lihat Detail & Cetak"
                                  onClick={() => { setSelectedDoc(docData); setViewMode('detail'); }}
                                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  title="Kirim WhatsApp"
                                  onClick={() => handleOpenWaModal(docData)}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                >
                                  <Send size={16} />
                                </button>
                                <button
                                  title="Edit Dokumen"
                                  onClick={() => handleOpenEditForm(docData)}
                                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors cursor-pointer"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  title="Hapus Dokumen"
                                  onClick={() => handleDeleteDocument(docData.id, docData.referenceNo)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
                      <span>baris. Menampilkan {Math.min(totalItems, (safeCurrentPage - 1) * pageSize + 1)}-{Math.min(totalItems, safeCurrentPage * pageSize)} dari {totalItems} {config.title.toLowerCase()}.</span>
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
                          .map((page, idx, arr) => {
                            const prevPage = arr[idx - 1];
                            const showEllipsis = prevPage && page - prevPage > 1;
                            return (
                              <React.Fragment key={page}>
                                {showEllipsis && <span className="px-2 text-slate-400">...</span>}
                                <button
                                  onClick={() => setCurrentPage(page)}
                                  className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                    safeCurrentPage === page
                                      ? 'bg-blue-600 text-white shadow-md'
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
                        title="Halaman Selanjutnya"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= FORM VIEW (CREATE / EDIT) ================= */}
        {viewMode === 'form' && (
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                {editingDocId ? `Edit ${config.title}` : `Buat ${config.title} Baru`}
              </h2>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="space-y-6">
              {/* SECTION 1: DOKUMEN INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor Referensi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="001"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Gunakan 3 digit nomor saja (contoh: 001, 002)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tanggal Dokumen <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* SECTION 2: KLIEN & PETUGAS */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-4">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Data Klien & Penerima</span>
                  <span className="text-[10px] text-slate-400 font-normal">Pilih master atau ketik manual</span>
                </div>

                {/* Client Dropdown Selector */}
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Cari Master Klien
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ketik nama klien untuk mencari..."
                      value={clientName}
                      onChange={(e) => {
                        setClientName(e.target.value);
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Dropdown Menu */}
                  {showClientDropdown && filteredClientsDropdown.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {filteredClientsDropdown.map((c) => (
                        <div
                          key={`${c.source}-${c.clientId}`}
                          onClick={() => handleSelectClient(c)}
                          className="p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900">{c.name}</span>
                          </div>
                          {c.phone && <div className="text-[10px] text-slate-500 mt-0.5">Telp: {c.phone}</div>}
                          {c.address && <div className="text-[10px] text-slate-400 truncate">{c.address}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      U.p / Penanggung Jawab Klien (PIC)
                    </label>
                    <input
                      type="text"
                      value={clientPic}
                      onChange={(e) => setClientPic(e.target.value)}
                      placeholder="Contoh: Bpk. Ahmad / Ibu Siska"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nomor Telp / WA Klien
                    </label>
                    <input
                      type="text"
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {config.officerLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <select
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer uppercase"
                    >
                      <option value="" disabled>-- PILIH {config.officerLabel.toUpperCase()} --</option>
                      <option value="SITI NUR AZIZAH">SITI NUR AZIZAH</option>
                      <option value="NENDI SUHENDI">NENDI SUHENDI</option>
                      <option value="NUKANTINI PUTRI PARINCHA, SH. M.KN">NUKANTINI PUTRI PARINCHA, SH. M.KN</option>
                      {officerName && !['SITI NUR AZIZAH', 'NENDI SUHENDI', 'NUKANTINI PUTRI PARINCHA, SH. M.KN'].includes(officerName) && (
                        <option value={officerName}>{officerName.toUpperCase()}</option>
                      )}
                    </select>

                    <input
                      type="text"
                      required
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value.toUpperCase())}
                      placeholder="Atau ketik nama petugas (Kapital)..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">Pilih Cepat:</span>
                      {[
                        'SITI NUR AZIZAH',
                        'NENDI SUHENDI',
                        'NUKANTINI PUTRI PARINCHA, SH. M.KN'
                      ].map((off) => (
                        <button
                          key={off}
                          type="button"
                          onClick={() => setOfficerName(off)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer uppercase ${
                            officerName === off
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {off}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: FIELD KHUSUS SURAT JALAN (DELIVERY) */}
              {isDelivery && (
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200/80 space-y-4">
                  <div className="text-xs font-bold text-orange-900 uppercase tracking-wider flex items-center gap-2">
                    <Truck size={16} />
                    <span>Detail Pengiriman & Kurir</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Alamat Tujuan Pengiriman
                    </label>
                    <textarea
                      rows={2}
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Alamat lengkap lokasi pengiriman berkas..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dikirim Dengan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={deliveryMethod}
                        onChange={(e) => setDeliveryMethod(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                      >
                        {DELIVERY_METHOD_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {DELIVERY_METHOD_OPTIONS.slice(0, 5).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setDeliveryMethod(tag)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                              deliveryMethod === tag
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-white hover:bg-orange-100 text-orange-800 border-orange-200'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        No. Resi / Kendaraan Tracking
                      </label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Nomor resi / plat nomor motor/mobil"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: ITEMS LIST */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Daftar Berkas / Dokumen <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>Tambah Berkas</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 mt-2.5 min-w-[20px] text-center">
                        {index + 1}.
                      </span>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-3">
                          <textarea
                            rows={2}
                            required
                            placeholder="Deskripsi nama berkas/dokumen (misal: Sertipikat Hak Milik No. 1234/Bandung Asli)"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <select
                            value={item.type}
                            onChange={(e) => handleItemChange(index, 'type', e.target.value as 'Asli' | 'Copy')}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Asli">Asli</option>
                            <option value="Copy">Copy / Salinan</option>
                          </select>
                        </div>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Hapus Baris"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5: NOTES */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan khusus terkait pengiriman/penerimaan dokumen..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${config.primaryBtnColor}`}
                >
                  {editingDocId ? 'Simpan Perubahan' : `Terbitkan ${config.title}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= DETAIL VIEW ================= */}
        {viewMode === 'detail' && selectedDoc && (
          <div className="space-y-6">
            {/* DETAIL ACTION BAR */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedDoc.referenceNo}</h2>
                  <p className="text-xs text-slate-500">{config.title} • {formatDate(selectedDoc.date)}</p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => handleOpenWaModal(selectedDoc)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <Send size={15} />
                  <span>Kirim WhatsApp</span>
                </button>

                <button
                  onClick={() => printGeneralDocument(selectedDoc)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Cetak / Print</span>
                </button>

                <button
                  onClick={() => downloadGeneralDocumentPdf(selectedDoc)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
                >
                  <Download size={15} />
                  <span>Unduh PDF</span>
                </button>

                <button
                  onClick={() => handleOpenEditForm(selectedDoc)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                  title="Edit Dokumen"
                >
                  <Edit size={16} />
                </button>
              </div>
            </div>

            {/* PRINT PREVIEW PAPER CONTAINER */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-10 max-w-4xl mx-auto">
              {/* HEADER */}
              <div className="flex justify-between items-start pb-3 border-b-2 border-slate-900 mb-6 gap-4">
                <div>
                  <div className="text-base font-extrabold text-slate-900">
                    Notaris/PPAT Nukantini Putri Parincha,SH.M.kn
                  </div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Komplek PPR ITB F5, Dago Giri, Mekarwangi, Lembang, Bandung Barat, 40391<br />
                    Email: notarisppatputri@gmail.com | Telp: 08112007061
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NOMOR</div>
                  <div className="text-2xl font-black text-slate-900 leading-none mt-0.5">{selectedDoc.referenceNo}</div>
                </div>
              </div>

              {/* TITLE & DATE */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-wide">{config.docTitle}</h1>
                <p className="text-xs text-slate-500 mt-1">Tanggal: {formatDateIndonesian(selectedDoc.date, true)}</p>
              </div>

              {/* SENDER & RECEIVER BOXES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">PENGIRIM</div>
                  <div className="text-xs font-extrabold text-slate-900 leading-snug">
                    Notaris/PPAT Nukantini Putri Parincha,SH.M.kn
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{config.rightBoxLabel}</div>
                  <div className="text-xs font-extrabold text-slate-900 uppercase leading-snug">
                    {selectedDoc.clientPic ? selectedDoc.clientPic.toUpperCase() : selectedDoc.clientName.toUpperCase()}
                  </div>
                  {selectedDoc.clientPic && selectedDoc.clientName && (
                    <div className="text-xs font-bold text-slate-600 uppercase mt-0.5">({selectedDoc.clientName})</div>
                  )}
                  {selectedDoc.deliveryMethod && (
                    <div className="text-xs text-slate-500 mt-1">Via: {selectedDoc.deliveryMethod}</div>
                  )}
                </div>
              </div>

              {/* ITEMS TABLE */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-bold">
                      <th className="py-2.5 px-4 text-center w-12">No</th>
                      <th className="py-2.5 px-4">Deskripsi Berkas / Barang</th>
                      <th className="py-2.5 px-4 text-center w-32">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {selectedDoc.items?.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4 whitespace-pre-wrap font-medium text-slate-900">{it.description}</td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-900">{it.type || 'Asli'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* DISCLAIMER BOX */}
              <div className="bg-slate-50 p-3.5 rounded-xl text-[10px] text-slate-500 italic leading-relaxed text-justify mb-8">
                {getFooterText(selectedDoc)}
              </div>

              {/* SIGNATURES */}
              <div className="grid grid-cols-2 gap-8 text-center pt-2">
                <div>
                  <div className="text-xs text-slate-500 mb-14">Diserahkan Oleh,</div>
                  <div className="w-3/4 mx-auto border-b border-slate-900 pb-0.5 text-xs font-extrabold text-slate-900 uppercase">
                    {selectedDoc.officerName || 'SITI NUR AZIZAH'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Tanda Tangan & Nama Terang</div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">{formatDateIndonesian(selectedDoc.date, false)}</div>
                  <div className="text-xs text-slate-500 mb-14">Diterima Oleh,</div>
                  <div className="w-3/4 mx-auto border-b border-slate-900 h-4"></div>
                  <div className="text-[10px] text-slate-400 mt-1">Tanda Tangan & Stempel</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= WHATSAPP SHARE MODAL ================= */}
      {isWaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
                <Send size={20} />
                <span>Kirim {config.title} via WhatsApp</span>
              </div>
              <button onClick={() => setIsWaModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* MODE TOGGLE */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setWaSendMode('GROUP')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${waSendMode === 'GROUP' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Grup WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setWaSendMode('NUMBER')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${waSendMode === 'NUMBER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Nomor HP Personal
              </button>
            </div>

            {/* INPUT FIELDS */}
            {waSendMode === 'GROUP' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih WhatsApp Group
                </label>
                {isLoadingWaGroups ? (
                  <div className="p-3 text-center text-xs text-slate-400">Memuat daftar grup...</div>
                ) : (
                  <select
                    value={selectedWaGroupId}
                    onChange={(e) => setSelectedWaGroupId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {waGroups.length === 0 ? (
                      <option value="">-- Tidak ada grup ditemukan --</option>
                    ) : (
                      waGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp Tujuan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={waTargetPhone}
                  onChange={(e) => setWaTargetPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pesan WhatsApp
              </label>
              <textarea
                rows={7}
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {waSendSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{waSendSuccess}</span>
              </div>
            )}

            {waSendError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>{waSendError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsWaModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={handleSendWaMessage}
                disabled={isSendingWa}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                {isSendingWa ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{isSendingWa ? 'Mengirim...' : 'Kirim WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralDocumentGenerator;
