import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Banknote, Plus, Search, Calendar, User, CreditCard, 
  Trash2, Edit, Eye, ArrowLeft, Printer, Check, 
  X, AlertCircle, RefreshCw, FileText, Building2, CheckCircle2
} from 'lucide-react';
import { DepositNote, DepositNoteItem, SidebarTabId, CompanyProfile } from '../../../types';
import { MobileHeader, MobileEmptyState, MobilePagination } from '../ui/MobileHeader';
import { MobileDataCard } from '../ui/MobileDataCard';
import { DepositNoteService } from '../../services/DepositNoteService';
import { CompanyService } from '../../services/CompanyService';
import { SearchableClientSelect } from '../common/SearchableClientSelect';
import { printDepositNoteHtml, formatCurrencyIDR, formatDateIndonesian } from '../../utils/depositNoteHtmlGenerator';
import { useAuthContext } from '../../contexts/AuthContext';

interface DepositNoteManagerProps {
  setActiveSidebarTab?: (tab: SidebarTabId) => void;
}

export const DepositNoteManager: React.FC<DepositNoteManagerProps> = ({ setActiveSidebarTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const authCtx = useAuthContext();

  // State
  const [depositNotes, setDepositNotes] = useState<DepositNote[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clients list for client selector
  const [clientOptions, setClientOptions] = useState<CompanyProfile[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Active view & Selected Item
  const [selectedNote, setSelectedNote] = useState<DepositNote | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<DepositNote>>({
    depositNumber: '',
    date: new Date().toISOString().slice(0, 10),
    clientName: '',
    clientAddress: '',
    recipientName: '',
    paymentMethod: 'Transfer BCA',
    notes: '',
    hideQr: false,
    items: [
      { id: '1', description: 'Titipan Biaya PNBP & Hasil Cek Sertipikat', amount: 500000 },
      { id: '2', description: 'Titipan Biaya Pajak BPHTB / PPh', amount: 15000000 }
    ]
  });

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(prev => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  // Sync route mode from URL path
  const routeMode = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.includes('/deposit_note/new')) return 'new';
    if (pathname.match(/\/deposit_note\/[^\/]+\/edit/)) return 'edit';
    if (pathname.match(/\/deposit_note\/[^\/]+/)) return 'detail';
    return 'list';
  }, [location.pathname]);

  // Extract route ID
  const routeId = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'deposit_note' && parts[1] !== 'new') {
      return parts[1];
    }
    return null;
  }, [location.pathname]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load list data
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      const res = await DepositNoteService.getDepositNotes({
        search: debouncedSearch,
        limit: pageSize,
        offset
      });
      setDepositNotes(res.depositNotes);
      setTotalCount(res.total);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal memuat data titipan uang.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, showToast]);

  // Fetch clients on mount
  useEffect(() => {
    setLoadingClients(true);
    CompanyService.getCompaniesFast()
      .then(profiles => {
        setClientOptions(profiles || []);
      })
      .catch(err => {
        console.error('Failed to load clients:', err);
      })
      .finally(() => {
        setLoadingClients(false);
      });
  }, []);

  // Fetch detail data when routeId changes
  useEffect(() => {
    if (routeId) {
      setLoading(true);
      DepositNoteService.getDepositNoteById(routeId)
        .then(note => {
          setSelectedNote(note);
          if (routeMode === 'edit') {
            setFormData({
              id: note.id,
              depositNumber: note.depositNumber,
              date: note.date,
              clientId: note.clientId,
              clientName: note.clientName,
              clientAddress: note.clientAddress,
              recipientName: note.recipientName,
              paymentMethod: note.paymentMethod || 'Transfer BCA',
              notes: note.notes || '',
              hideQr: Boolean(note.hideQr),
              items: note.items?.length ? note.items : [{ id: '1', description: '', amount: 0 }]
            });
          }
        })
        .catch(err => {
          showToast('error', err.message || 'Gagal memuat detail titipan.');
          navigate('/deposit_note');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (routeMode === 'new') {
      // Auto-fetch next deposit number for new form
      const defaultUser = authCtx?.user?.displayName || authCtx?.user?.email?.split('@')[0] || 'Staff Notaris';
      DepositNoteService.getNextDepositNumber()
        .then(nextNum => {
          setFormData({
            depositNumber: nextNum,
            date: new Date().toISOString().slice(0, 10),
            clientName: '',
            clientAddress: '',
            recipientName: defaultUser,
            paymentMethod: 'Transfer BCA',
            notes: '',
            hideQr: false,
            items: [
              { id: '1', description: 'Titipan Biaya PNBP & Hasil Cek Sertipikat', amount: 500000 },
              { id: '2', description: 'Titipan Biaya Pajak BPHTB / PPh', amount: 15000000 }
            ]
          });
        })
        .catch(() => {
          setFormData({
            depositNumber: `TTP/${new Date().getFullYear()}/001`,
            date: new Date().toISOString().slice(0, 10),
            recipientName: defaultUser,
            paymentMethod: 'Transfer BCA',
            items: [{ id: '1', description: '', amount: 0 }]
          });
        });
    } else {
      fetchList();
    }
  }, [routeId, routeMode, authCtx, navigate, showToast, fetchList]);

  // Client Selection Change Handler
  const handleClientSelect = (clientId: string) => {
    const found = clientOptions.find(c => c.id === clientId);
    if (found) {
      setFormData(prev => ({
        ...prev,
        clientId: found.id,
        clientName: found.companyName || '',
        clientAddress: found.domicile || (found as any).address || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        clientId: undefined
      }));
    }
  };

  // Item management in Form
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...(prev.items || []),
        { id: `item_${Date.now()}`, description: '', amount: 0 }
      ]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => {
      const updated = [...(prev.items || [])];
      updated.splice(index, 1);
      return { ...prev, items: updated };
    });
  };

  const handleItemChange = (index: number, field: 'description' | 'amount', value: any) => {
    setFormData(prev => {
      const updated = [...(prev.items || [])];
      updated[index] = {
        ...updated[index],
        [field]: field === 'amount' ? (parseFloat(value) || 0) : value
      };
      return { ...prev, items: updated };
    });
  };

  // Total amount calculation
  const computedTotal = useMemo(() => {
    return (formData.items || []).reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [formData.items]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName?.trim()) {
      showToast('error', 'Nama Klien wajib diisi.');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      showToast('error', 'Minimal satu item titipan wajib ditambahkan.');
      return;
    }

    setIsSaving(true);
    try {
      if (routeMode === 'edit' && routeId) {
        const updated = await DepositNoteService.updateDepositNote(routeId, formData);
        showToast('success', 'Data titipan uang berhasil diperbarui!');
        navigate(`/deposit_note/${updated.id}`);
      } else {
        const created = await DepositNoteService.createDepositNote(formData);
        showToast('success', 'Data titipan uang berhasil dicatat!');
        navigate(`/deposit_note/${created.id}`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyimpan data titipan.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Action
  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan titipan uang ini? Action ini tidak dapat dibatalkan.')) {
      return;
    }

    setDeletingId(id);
    try {
      await DepositNoteService.deleteDepositNote(id);
      showToast('success', 'Catatan titipan uang berhasil dihapus.');
      if (routeMode === 'detail' || routeMode === 'edit') {
        navigate('/deposit_note');
      } else {
        fetchList();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus data titipan.');
    } finally {
      setDeletingId(null);
    }
  };

  // Print Action
  const handlePrint = (noteToPrint: DepositNote) => {
    printDepositNoteHtml(noteToPrint);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-900 text-emerald-100 border-emerald-700' 
            : 'bg-rose-900 text-rose-100 border-rose-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* ==================== 1. LIST VIEW (/deposit_note) ==================== */}
      {routeMode === 'list' && (
        <>
          <div className="md:hidden px-4 pt-4">
            <MobileHeader
              title="Penitipan Uang"
              onOpenSidebar={() => {
                if (typeof window !== 'undefined') {
                  const btn = document.querySelector('button[aria-label="Toggle sidebar"]') as HTMLButtonElement;
                  if (btn) btn.click();
                }
              }}
              onAdd={() => navigate('/deposit_note/new')}
              addTooltip="Catat Titipan Baru"
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Cari no. TTP, klien, penerima..."
              totalItems={totalCount}
              totalLabel="Titipan"
            />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            {/* Header DESKTOP */}
            <div className="hidden md:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">Penitipan Uang</h1>
                </div>
                <p className="mt-1 text-sm text-slate-500 ml-10">
                  Kelola tanda terima titipan uang & titipan biaya notaris/PPAT
                </p>
              </div>
              <button
                onClick={() => navigate('/deposit_note/new')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Titipan</span>
              </button>
            </div>

            {/* Filters & Search DESKTOP */}
            <div className="hidden md:flex bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm mb-6 items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari no. TTP, klien, penerima..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end text-xs text-slate-500">
              <span>Tampilkan:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              >
                <option value={10}>10 per halaman</option>
                <option value={20}>20 per halaman</option>
                <option value={50}>50 per halaman</option>
              </select>
            </div>
          </div>

          {/* MOBILE LIST VIEW (< md) */}
          <div className="block md:hidden space-y-3 mt-4">
            {loading ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold">Memuat data titipan uang...</p>
              </div>
            ) : depositNotes.length === 0 ? (
              <MobileEmptyState
                message="Belum ada transaksi titipan uang yang dicatat."
                actionText="Catat Titipan Baru"
                onAction={() => navigate('/deposit_note/new')}
                icon={<Banknote size={24} />}
              />
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                  {depositNotes.map((note, idx) => {
                    const serialNum = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <MobileDataCard
                        key={note.id}
                        number={serialNum}
                        title={note.clientName}
                        subtitle={`No. TTP: ${note.depositNumber}`}
                        amount={formatCurrencyIDR(note.totalAmount)}
                        badges={[
                          note.paymentMethod || 'Transfer'
                        ]}
                        date={formatDateIndonesian(note.date)}
                        onDetail={() => navigate(`/deposit_note/${note.id}`)}
                        detailLabel="Detail"
                        onDelete={() => handleDelete(note.id)}
                      />
                    );
                  })}
                </div>

                <MobilePagination
                  currentPage={currentPage}
                  totalItems={totalCount}
                  pageSize={pageSize}
                  onPageChange={(p) => setCurrentPage(p)}
                  itemLabel="titipan"
                />
              </>
            )}
          </div>

          {/* DESKTOP TABLE VIEW (md+) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden mt-6">
            {loading ? (
              <div className="py-20 text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Memuat data titipan uang...</p>
              </div>
            ) : depositNotes.length === 0 ? (
              <div className="py-16 text-center px-4">
                <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 mb-1">Belum Ada Titipan Uang</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mb-5">
                  {debouncedSearch ? 'Tidak ada transaksi titipan yang sesuai dengan pencarian Anda.' : 'Belum ada transaksi titipan uang yang dicatat dalam sistem.'}
                </p>
                <button
                  onClick={() => navigate('/deposit_note/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catat Titipan Baru</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">No. TTP</th>
                      <th className="py-3 px-4">Klien</th>
                      <th className="py-3 px-4">Metode</th>
                      <th className="py-3 px-4 text-right">Total Titipan</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {depositNotes.map(note => (
                      <tr key={note.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-xs">
                          {formatDateIndonesian(note.date)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-emerald-800 whitespace-nowrap text-xs">
                          {note.depositNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          <div>{note.clientName}</div>
                          {note.clientAddress && (
                            <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">{note.clientAddress}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                            {note.paymentMethod || 'Transfer'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-emerald-700 text-sm whitespace-nowrap">
                          {formatCurrencyIDR(note.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/deposit_note/${note.id}`)}
                              title="Lihat Detail"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/deposit_note/${note.id}/edit`)}
                              title="Edit"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrint(note)}
                              title="Cetak Tanda Terima"
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(note.id)}
                              disabled={deletingId === note.id}
                              title="Hapus"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {totalCount > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Menampilkan <span className="font-semibold text-slate-700">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-semibold text-slate-700">{Math.min(currentPage * pageSize, totalCount)}</span> dari <span className="font-semibold text-slate-700">{totalCount}</span> data
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-2 py-1 font-medium text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* ==================== 2. FORM VIEW (/deposit_note/new & /deposit_note/:id/edit) ==================== */}
      {(routeMode === 'new' || routeMode === 'edit') && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/deposit_note')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar</span>
            </button>
            <h1 className="text-xl font-bold text-slate-900">
              {routeMode === 'edit' ? 'Edit Titipan Uang' : 'Catat Titipan Uang Baru'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card 1: Data Titipan & Klien */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              <h2 className="text-base font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Informasi Dasar Titipan</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* No. TTP */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Tanda Terima (TTP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.depositNumber || ''}
                    onChange={e => setFormData(prev => ({ ...prev, depositNumber: e.target.value }))}
                    placeholder="Contoh: TTP/2026/001"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono font-medium"
                  />
                </div>

                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Terima <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Pilih Klien */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Klien Registrasi / Ketik Nama Manual
                  </label>
                  <SearchableClientSelect
                    value={formData.clientId || ''}
                    onChange={handleClientSelect}
                    options={clientOptions}
                    placeholder="-- Pilih dari daftar klien terdaftar (opsional) --"
                    allowClear
                  />
                </div>

                {/* Nama Klien Manual / Edit */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Klien (Telah Terima Dari) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientName || ''}
                    onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Masukkan nama klien / PT / perorangan"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Alamat Klien */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alamat Klien (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.clientAddress || ''}
                    onChange={e => setFormData(prev => ({ ...prev, clientAddress: e.target.value }))}
                    placeholder="Jl. Raya Klien No. 123, Surabaya"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Staff Penerima */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Penerima / Staff Notaris
                  </label>
                  <input
                    type="text"
                    value={formData.recipientName || ''}
                    onChange={e => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                    placeholder="Nama staff penerima titipan"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Metode Pembayaran */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={formData.paymentMethod || 'Transfer BCA'}
                    onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Transfer BCA">Transfer BCA</option>
                    <option value="Transfer Mandiri">Transfer Bank Mandiri</option>
                    <option value="Transfer BRI">Transfer BRI</option>
                    <option value="Transfer BNI">Transfer BNI</option>
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="Cek / Bilyet Giro">Cek / Bilyet Giro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 2: Rincian Item Titipan */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Rincian Item Titipan Uang</span>
                </h2>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {(formData.items || []).map((item, index) => (
                  <div key={item.id || index} className="flex items-center gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200/70">
                    <span className="text-xs font-semibold text-slate-400 w-6 text-center">{index + 1}</span>
                    
                    {/* Description */}
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        placeholder="Rincian titipan (misal: Biaya PNBP, Pajak BPHTB, Honorarium Akta)"
                        value={item.description}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Amount */}
                    <div className="w-44">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">Rp</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="1000"
                          placeholder="0"
                          value={item.amount || ''}
                          onChange={e => handleItemChange(index, 'amount', e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-medium text-right"
                        />
                      </div>
                    </div>

                    {/* Delete item button */}
                    {(formData.items || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Total Titipan Uang:</span>
                <span className="text-lg font-bold text-emerald-700">
                  {formatCurrencyIDR(computedTotal)}
                </span>
              </div>
            </div>

            {/* Card 3: Opsi & Catatan */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
                Opsi Cetak & Catatan
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Catatan khusus transaksi titipan ini..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="hideQr"
                  checked={Boolean(formData.hideQr)}
                  onChange={e => setFormData(prev => ({ ...prev, hideQr: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="hideQr" className="text-xs text-slate-700 cursor-pointer select-none">
                  Sembunyikan QR Code Validasi di TTD Penerima saat cetak
                </label>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/deposit_note')}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Simpan Titipan Uang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== 3. DETAIL VIEW (/deposit_note/:id) ==================== */}
      {routeMode === 'detail' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <button
              onClick={() => navigate('/deposit_note')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar</span>
            </button>

            {selectedNote && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/deposit_note/${selectedNote.id}/edit`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handlePrint(selectedNote)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Tanda Terima</span>
                </button>
                <button
                  onClick={() => handleDelete(selectedNote.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>

          {/* Content Card */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Memuat detail titipan uang...</p>
            </div>
          ) : !selectedNote ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">Data titipan tidak ditemukan.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-8 space-y-6">
              {/* Document Header */}
              <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md mb-2">
                    TANDA TERIMA TITIPAN UANG
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 font-mono">
                    {selectedNote.depositNumber}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Tanggal: {formatDateIndonesian(selectedNote.date)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Titipan</span>
                  <span className="text-2xl font-extrabold text-emerald-700">
                    {formatCurrencyIDR(selectedNote.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Telah Terima Dari (Klien)</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedNote.clientName}</span>
                  {selectedNote.clientAddress && (
                    <p className="text-slate-500 mt-0.5">{selectedNote.clientAddress}</p>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Penerima & Pembayaran</span>
                  <p className="text-slate-700 font-medium">Penerima: {selectedNote.recipientName || 'Staff Notaris'}</p>
                  <p className="text-slate-700 font-medium">Metode: {selectedNote.paymentMethod || 'Transfer'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Rincian Item Titipan
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 w-12 text-center">No</th>
                        <th className="py-2.5 px-4">Rincian Titipan / Keterangan</th>
                        <th className="py-2.5 px-4 text-right w-44">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedNote.items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 px-4 text-center text-xs text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-4 text-slate-800 font-medium">{item.description}</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-slate-900">{formatCurrencyIDR(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={2} className="py-3 px-4 text-right font-semibold text-slate-700 text-xs">
                          TOTAL TITIPAN:
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 text-base">
                          {formatCurrencyIDR(selectedNote.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedNote.notes && (
                <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-xs text-amber-900">
                  <strong className="block mb-0.5">Catatan:</strong>
                  {selectedNote.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
