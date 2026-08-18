import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageLayout';
import { MobileHeader, MobileEmptyState, MobilePagination } from '../../components/ui/MobileHeader';
import { MobileDataCard } from '../../components/ui/MobileDataCard';
import { PrivateDeed } from '../../../types';
import { NotaryService } from '../../services/NotaryService';
import { isRecordLocked, getLockDeadlineMessage } from '../../utils/lockUtils';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Edit2, Trash2, Lock, ShieldCheck, X, Check } from 'lucide-react';
import { AppLoader } from '../../components/ui/AppLoader';

// Global memory cache for private deeds to enable instant page transitions
const privateDeedCache = new Map<string, { records: PrivateDeed[]; total: number }>();

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const PrivateDeedBook: React.FC = () => {
  const { user } = useAuth();
  const [privateDeeds, setPrivateDeeds] = useState<PrivateDeed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalDeedsCount, setTotalDeedsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | string>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [number, setNumber] = useState<string>('');
  const [registrationDate, setRegistrationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<string>('Legalisasi');
  const [description, setDescription] = useState<string>('');
  const [parties, setParties] = useState<string[]>(['']);
  const [picName, setPicName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch private deeds with server-side pagination, search, and local cache
  useEffect(() => {
    let active = true;
    const cleanSearch = searchTerm.trim();
    const cacheKey = `private-deeds:page=${currentPage}:size=${pageSize}:search=${cleanSearch}:year=${selectedYear}`;

    const cached = privateDeedCache.get(cacheKey);
    if (cached) {
      setPrivateDeeds(cached.records);
      setTotalDeedsCount(cached.total);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadData = async () => {
      try {
        const res = await NotaryService.getPrivateDeedsPaginated({
          page: currentPage,
          pageSize,
          search: cleanSearch,
          year: selectedYear
        });
        if (active && res.success) {
          setPrivateDeeds(res.records);
          setTotalDeedsCount(res.total);
          privateDeedCache.set(cacheKey, { records: res.records, total: res.total });
        }
      } catch (err) {
        console.error('Failed to load paginated private deeds:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      loadData();
    }, cleanSearch ? 350 : 0);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
    };
  }, [currentPage, pageSize, searchTerm, selectedYear]);

  // Reset page to 1 on filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedYear]);

  // Available Years - dynamic listing helper
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    // Add adjacent years for selection
    const yrNum = parseInt(currentYr, 10);
    for (let i = -3; i <= 1; i++) {
      yearsSet.add(String(yrNum + i));
    }
    return Array.from(yearsSet).sort().reverse();
  }, []);

  // Filtered
  const filteredDeeds = useMemo(() => {
    return privateDeeds.filter((deed) => {
      // Filter Year
      if (selectedYear !== 'ALL') {
        if (!deed.registrationDate || !deed.registrationDate.startsWith(selectedYear)) return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNumber = deed.number?.toLowerCase().includes(query);
        const matchType = deed.type?.toLowerCase().includes(query);
        const matchDesc = deed.description?.toLowerCase().includes(query);
        const matchNotes = deed.notes?.toLowerCase().includes(query);
        const matchParties = deed.parties?.some((p) => p?.toLowerCase().includes(query));

        return matchNumber || matchType || matchDesc || matchNotes || matchParties;
      }

      return true;
    });
  }, [privateDeeds, selectedYear, searchTerm]);

  // Grouped by Month
  const groupedDeeds = useMemo(() => {
    const groups: { [key: string]: { year: number; month: number; monthName: string; deeds: PrivateDeed[] } } = {};

    filteredDeeds.forEach((deed) => {
      if (!deed.registrationDate) return;
      const parts = deed.registrationDate.split('-');
      if (parts.length < 2) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const groupKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          year,
          month,
          monthName: MONTH_NAMES[month - 1] || `Bulan ${month}`,
          deeds: []
        };
      }
      groups[groupKey].deeds.push(deed);
    });

    const sortedKeys = Object.keys(groups).sort().reverse();

    return sortedKeys.map((key) => {
      const grp = groups[key];
      grp.deeds.sort((a, b) => {
        if (a.registrationDate !== b.registrationDate) return b.registrationDate.localeCompare(a.registrationDate);
        return (parseInt(b.number, 10) || 0) - (parseInt(a.number, 10) || 0);
      });
      return grp;
    });
  }, [filteredDeeds]);

  const handleOpenModal = (deed?: PrivateDeed) => {
    if (deed) {
      setEditingId(deed.id);
      setNumber(deed.number || '');
      setRegistrationDate(deed.registrationDate || new Date().toISOString().split('T')[0]);
      setType(deed.type || 'Legalisasi');
      setDescription(deed.description || '');
      setParties(deed.parties && deed.parties.length > 0 ? deed.parties : ['']);
      setPicName(deed.picName || '');
      setNotes(deed.notes || '');
    } else {
      setEditingId(null);
      setNumber('');
      setRegistrationDate(new Date().toISOString().split('T')[0]);
      setType('Legalisasi');
      setDescription('');
      setParties(['']);
      setPicName('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const location = useLocation();
  const directActionHandledRef = useRef<string | null>(null);

  useEffect(() => {
    const isDirectAction = (location.state as any)?.openCreateModal || location.search.includes('action=new') || location.search.includes('create=true');
    const actionKey = `${location.pathname}_${location.search}_${location.key}`;
    if (isDirectAction && directActionHandledRef.current !== actionKey) {
      directActionHandledRef.current = actionKey;
      handleOpenModal();
    }
  }, [location]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationDate || !description.trim()) {
      alert('Tanggal Pembukuan dan Isi Singkat Surat wajib diisi!');
      return;
    }

    const cleanParties = parties.map((p) => p.trim()).filter((p) => p !== '');
    const backupDeeds = [...privateDeeds];
    const backupTotal = totalDeedsCount;

    const deedData: Omit<PrivateDeed, 'id'> = {
      number: number.trim(),
      registrationDate,
      type: type as any,
      description: description.trim(),
      parties: cleanParties,
      picName: picName.trim() || undefined,
      notes: notes.trim() || undefined
    };

    // Optimistic UI Update: Close modal immediately and update state in 0ms
    setIsModalOpen(false);

    if (editingId) {
      setPrivateDeeds(prev => prev.map(d => d.id === editingId ? { ...d, ...deedData } : d));
    } else {
      const tempId = `temp_${Date.now()}`;
      setPrivateDeeds(prev => [{ ...deedData, id: tempId } as PrivateDeed, ...prev]);
      setTotalDeedsCount(prev => prev + 1);
    }

    try {
      if (editingId) {
        await NotaryService.updatePrivateDeed(editingId, deedData);
      } else {
        await NotaryService.addPrivateDeed(deedData);
      }

      // Background silent revalidation
      const cleanSearch = searchTerm.trim();
      NotaryService.getPrivateDeedsPaginated({
        page: currentPage,
        pageSize,
        search: cleanSearch,
        year: selectedYear
      }).then(res => {
        if (res.success) {
          setPrivateDeeds(res.records);
          setTotalDeedsCount(res.total);
        }
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to save private deed:', err);
      alert('Gagal menyimpan data legalisasi/waarmerking. Mengembalikan data...');
      setPrivateDeeds(backupDeeds);
      setTotalDeedsCount(backupTotal);
    }
  };

  const handleDelete = async (deed: PrivateDeed) => {
    if (isRecordLocked(deed.registrationDate, user?.email)) {
      alert(`Record ini terkunci secara otomatis setelah tanggal ${getLockDeadlineMessage(deed.registrationDate)}.`);
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus pencatatan ${deed.type} No. ${deed.number}?`)) {
      const backupDeeds = [...privateDeeds];
      const backupTotal = totalDeedsCount;

      // Optimistic delete
      setPrivateDeeds(prev => prev.filter(d => d.id !== deed.id));
      setTotalDeedsCount(prev => Math.max(0, prev - 1));

      try {
        await NotaryService.deletePrivateDeed(deed.id);
        privateDeedCache.clear();
      } catch (err) {
        console.error('Failed to delete private deed:', err);
        alert('Gagal menghapus data. Mengembalikan data...');
        setPrivateDeeds(backupDeeds);
        setTotalDeedsCount(backupTotal);
      }
    }
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      const d = parts[2];
      return `${d} ${MONTH_NAMES[m] || ''} ${y}`;
    }
    return dateStr;
  };

  const getTypeBadge = (typeStr: string) => {
    const t = typeStr?.toUpperCase() || '';
    if (t.includes('LEGALISASI')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          LEGALISASI
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        WAARMERKING
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {!isModalOpen && (
        <MobileHeader
          title="Legalisasi & Waarmerking"
          onOpenSidebar={() => {
            if (typeof window !== 'undefined') {
              const btn = document.querySelector('button[aria-label="Toggle sidebar"]') as HTMLButtonElement;
              if (btn) btn.click();
            }
          }}
          onAdd={() => handleOpenModal()}
          addTooltip="Catat Legalisasi / Waarmerking Baru"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Cari nomor, perihal, nama..."
          totalItems={totalDeedsCount}
          totalLabel="Data"
        />
      )}

      {/* Top Header (DESKTOP) */}
      <div className="hidden md:block">
        <PageHeader
          title="Buku Legalisasi & Waarmerking"
          description="Pencatatan surat di bawah tangan yang dilegalisasi atau didaftarkan (waarmerking)."
          actions={
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <Plus size={16} />
              Catat Legalisasi / Waarmerking
            </button>
          }
        />
      </div>

      {/* Filter & Search Bar (DESKTOP) */}
      <div className="hidden md:flex bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor, perihal, nama pihak..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Tahun:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 bg-white cursor-pointer"
          >
            <option value="ALL">Semua Tahun</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <AppLoader variant="content" message="Memuat data legalisasi & waarmerking..." />
        </div>
      ) : privateDeeds.length === 0 ? (
        <MobileEmptyState
          message="Belum ada data legalisasi atau waarmerking."
          actionText="Catat Data Baru"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <>
          {/* MOBILE LIST VIEW */}
          <div className="block md:hidden space-y-3">
            <div className="bg-white divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              {privateDeeds.map((deed, idx) => {
                const locked = isRecordLocked(deed.registrationDate, user?.email);
                const partiesText = deed.parties && deed.parties.length > 0 ? deed.parties.join(', ') : undefined;

                return (
                  <MobileDataCard
                    key={deed.id}
                    number={idx + 1 + (currentPage - 1) * (typeof pageSize === 'string' ? privateDeeds.length : pageSize)}
                    title={deed.description}
                    subtitle={`No. Reg: ${deed.number || '-'}`}
                    badges={[
                      deed.type || 'WAARMERKING',
                      locked ? 'Terkunci' : null,
                    ]}
                    noteLabel="PIHAK:"
                    note={partiesText}
                    date={formatDateIndo(deed.registrationDate)}
                    onDetail={!locked ? () => handleOpenModal(deed) : undefined}
                    detailLabel="Edit"
                    onDelete={!locked ? () => handleDelete(deed) : undefined}
                  />
                );
              })}
            </div>

            <MobilePagination
              currentPage={currentPage}
              totalItems={totalDeedsCount}
              pageSize={typeof pageSize === 'number' ? pageSize : 10}
              onPageChange={(p) => setCurrentPage(p)}
              itemLabel="data"
            />
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px]">
                  <th className="p-3 w-16 text-center border-r border-slate-200">NO. URUT</th>
                  <th className="p-3 w-28 text-center border-r border-slate-200">NO. REGISTRASI</th>
                  <th className="p-3 w-32 text-center border-r border-slate-200">TANGGAL</th>
                  <th className="p-3 w-28 text-center border-r border-slate-200">JENIS</th>
                  <th className="p-3 min-w-[220px] border-r border-slate-200">ISI SINGKAT / PERIHAL</th>
                  <th className="p-3 min-w-[200px] border-r border-slate-200">YANG MENANDATANGANI</th>
                  <th className="p-3 w-24 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {privateDeeds.map((deed, idx) => {
                  const locked = isRecordLocked(deed.registrationDate, user?.email);
                  const lockMsg = locked ? `Terkunci otomatis setelah ${getLockDeadlineMessage(deed.registrationDate)}` : '';

                  return (
                    <tr key={deed.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center border-r border-slate-200 font-medium text-slate-600">
                        {idx + 1 + (currentPage - 1) * (typeof pageSize === 'string' ? privateDeeds.length : pageSize)}
                      </td>
                      <td className="p-3 text-center border-r border-slate-200 font-bold text-slate-900">
                        {deed.number || '-'}
                      </td>
                      <td className="p-3 text-center border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {formatDateIndo(deed.registrationDate)}
                      </td>
                      <td className="p-3 text-center border-r border-slate-200">
                        {getTypeBadge(deed.type)}
                      </td>
                      <td className="p-3 border-r border-slate-200 font-medium text-slate-900 leading-snug">
                        {deed.description}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-800 leading-snug">
                        {deed.parties && deed.parties.length > 0 ? (
                          <div className="space-y-0.5">
                            {deed.parties.map((party, i) => (
                              <div key={i} className="text-slate-900 font-medium">
                                • {party}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {locked ? (
                          <div className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-1 rounded text-[11px]" title={lockMsg}>
                            <Lock size={12} className="text-amber-600" />
                            <span>Terkunci</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenModal(deed)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(deed)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50/50 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-500">
              <span>Tampilkan</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value === 'Semua' ? 'Semua' : Number(e.target.value);
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
                <option value="Semua">Semua</option>
              </select>
              <span>baris. Menampilkan {privateDeeds.length === 0 ? 0 : Math.min(totalDeedsCount, (currentPage - 1) * (typeof pageSize === 'string' ? totalDeedsCount : pageSize) + 1)}-{Math.min(totalDeedsCount, currentPage * (typeof pageSize === 'string' ? totalDeedsCount : pageSize))} dari {totalDeedsCount} surat.</span>
            </div>

            {totalDeedsCount > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  Halaman {currentPage} dari {Math.ceil(totalDeedsCount / (typeof pageSize === 'string' ? 500 : pageSize)) || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalDeedsCount / (typeof pageSize === 'string' ? 500 : pageSize)) || 1, prev + 1))}
                  disabled={currentPage >= (Math.ceil(totalDeedsCount / (typeof pageSize === 'string' ? 500 : pageSize)) || 1)}
                  className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl border border-slate-200 my-8 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingId ? 'Edit Legalisasi / Waarmerking' : 'Pencatatan Legalisasi / Waarmerking Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Jenis Pencatatan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="Legalisasi">Legalisasi</option>
                    <option value="Waarmerking">Waarmerking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    No. Registrasi / Pendaftaran
                  </label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Contoh: 12/L/2026"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Tanggal Pembukuan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Isi Singkat Surat / Perihal <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ringkasan isi dokumen atau perihal perjanjian di bawah tangan..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              {/* Dynamic Parties */}
              <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold">
                    Yang Menandatangani / Para Pihak
                  </label>
                  <button
                    type="button"
                    onClick={() => setParties([...parties, ''])}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <Plus size={14} /> Tambah Nama Pihak
                  </button>
                </div>

                {parties.map((partyName, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Nama Pihak #${index + 1}`}
                      value={partyName}
                      onChange={(e) => {
                        const updated = [...parties];
                        updated[index] = e.target.value;
                        setParties(updated);
                      }}
                      className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none text-xs"
                    />
                    {parties.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setParties(parties.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Nama PIC / Petugas (Opsional)
                  </label>
                  <input
                    type="text"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    placeholder="Nama staf pengolah"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Keterangan tambahan"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={16} />
                  {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
