import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageLayout';
import { MobileHeader, MobileEmptyState, MobilePagination } from '../../components/ui/MobileHeader';
import { MobileDataCard } from '../../components/ui/MobileDataCard';
import { IncomingMail } from '../../../types';
import { NotaryService } from '../../services/NotaryService';
import { isRecordLocked, getLockDeadlineMessage } from '../../utils/lockUtils';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Edit2, Trash2, Lock, Inbox, X, Check } from 'lucide-react';
import { AppLoader } from '../../components/ui/AppLoader';

// Global memory cache for incoming mails to enable instant page transitions
const incomingMailCache = new Map<string, { records: IncomingMail[]; total: number }>();

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const IncomingMailBook: React.FC = () => {
  const { user } = useAuth();
  const [mails, setMails] = useState<IncomingMail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalMailsCount, setTotalMailsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | string>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [mailNumber, setMailNumber] = useState<string>('');
  const [mailDate, setMailDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sender, setSender] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch incoming mails server-side with local cache fallback
  useEffect(() => {
    let active = true;
    const cleanSearch = searchTerm.trim();
    const cacheKey = `incoming-mails:page=${currentPage}:size=${pageSize}:search=${cleanSearch}:year=${selectedYear}`;

    const cached = incomingMailCache.get(cacheKey);
    if (cached) {
      setMails(cached.records);
      setTotalMailsCount(cached.total);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadData = async () => {
      try {
        const res = await NotaryService.getIncomingMailsPaginated({
          page: currentPage,
          pageSize,
          search: cleanSearch,
          year: selectedYear
        });
        if (active && res.success) {
          setMails(res.records);
          setTotalMailsCount(res.total);
          incomingMailCache.set(cacheKey, { records: res.records, total: res.total });
        }
      } catch (err) {
        console.error('Failed to load paginated incoming mails:', err);
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

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedYear]);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    const yrNum = parseInt(currentYr, 10);
    for (let i = -3; i <= 1; i++) {
      yearsSet.add(String(yrNum + i));
    }
    return Array.from(yearsSet).sort().reverse();
  }, []);

  const handleOpenModal = (mail?: IncomingMail) => {
    if (mail) {
      setEditingId(mail.id);
      setMailNumber(mail.mailNumber || '');
      setMailDate(mail.date || new Date().toISOString().split('T')[0]);
      setSender(mail.sender || '');
      setSubject(mail.subject || '');
      setNotes(mail.notes || '');
    } else {
      setEditingId(null);
      setMailNumber('');
      setMailDate(new Date().toISOString().split('T')[0]);
      setSender('');
      setSubject('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailDate || !sender.trim() || !subject.trim()) {
      alert('Tanggal, Pengirim / Surat Dari, dan Perihal Surat wajib diisi!');
      return;
    }

    const backupMails = [...mails];
    const backupTotal = totalMailsCount;

    const mailData: Omit<IncomingMail, 'id'> = {
      mailNumber: mailNumber.trim(),
      date: mailDate,
      sender: sender.trim(),
      subject: subject.trim(),
      notes: notes.trim() || undefined
    };

    // Optimistic UI Update: Close modal immediately and update state in 0ms
    setIsModalOpen(false);

    if (editingId) {
      setMails(prev => prev.map(m => m.id === editingId ? { ...m, ...mailData } : m));
    } else {
      const tempId = `temp_${Date.now()}`;
      setMails(prev => [{ ...mailData, id: tempId } as IncomingMail, ...prev]);
      setTotalMailsCount(prev => prev + 1);
    }

    try {
      if (editingId) {
        await NotaryService.updateIncomingMail(editingId, mailData);
      } else {
        await NotaryService.addIncomingMail(mailData);
      }

      // Background silent revalidation
      const cleanSearch = searchTerm.trim();
      NotaryService.getIncomingMailsPaginated({
        page: currentPage,
        pageSize,
        search: cleanSearch,
        year: selectedYear
      }).then(res => {
        if (res.success) {
          setMails(res.records);
          setTotalMailsCount(res.total);
        }
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to save incoming mail:', err);
      alert('Gagal menyimpan data surat masuk. Mengembalikan data...');
      setMails(backupMails);
      setTotalMailsCount(backupTotal);
    }
  };

  const handleDelete = async (mail: IncomingMail) => {
    if (isRecordLocked(mail.date, user?.email)) {
      alert(`Record ini terkunci secara otomatis setelah tanggal ${getLockDeadlineMessage(mail.date)}.`);
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus surat masuk dari ${mail.sender}?`)) {
      const backupMails = [...mails];
      const backupTotal = totalMailsCount;

      // Optimistic delete
      setMails(prev => prev.filter(m => m.id !== mail.id));
      setTotalMailsCount(prev => Math.max(0, prev - 1));

      try {
        await NotaryService.deleteIncomingMail(mail.id);
        incomingMailCache.clear();
      } catch (err) {
        console.error('Failed to delete incoming mail:', err);
        alert('Gagal menghapus surat masuk. Mengembalikan data...');
        setMails(backupMails);
        setTotalMailsCount(backupTotal);
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

  return (
    <div className="space-y-6">
      {!isModalOpen && (
        <MobileHeader
          title="Surat Masuk"
          onOpenSidebar={() => {
            if (typeof window !== 'undefined') {
              const btn = document.querySelector('button[aria-label="Toggle sidebar"]') as HTMLButtonElement;
              if (btn) btn.click();
            }
          }}
          onAdd={() => handleOpenModal()}
          addTooltip="Catat Surat Masuk Baru"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Cari pengirim, nomor, perihal..."
          totalItems={totalMailsCount}
          totalLabel="Surat"
        />
      )}

      {/* Top Header (DESKTOP) */}
      <div className="hidden md:block">
        <PageHeader
          title="Buku Surat Masuk"
          description="Pencatatan korespondensi resmi surat masuk ke kantor Notaris / PPAT."
          actions={
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
            >
              <Plus size={16} />
              Catat Surat Masuk
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
            placeholder="Cari pengirim, nomor surat, perihal..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Tahun:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium text-slate-700 bg-white cursor-pointer"
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
          <AppLoader variant="content" message="Memuat data surat masuk..." />
        </div>
      ) : mails.length === 0 ? (
        <MobileEmptyState
          message="Belum ada data surat masuk."
          actionText="Catat Surat Masuk"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <>
          {/* MOBILE LIST VIEW */}
          <div className="block md:hidden space-y-3">
            <div className="bg-white divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              {mails.map((mail, idx) => {
                const locked = isRecordLocked(mail.date, user?.email);
                return (
                  <MobileDataCard
                    key={mail.id}
                    number={idx + 1 + (currentPage - 1) * (typeof pageSize === 'string' ? mails.length : pageSize)}
                    title={mail.subject}
                    subtitle={mail.sender ? `Pengirim: ${mail.sender}` : undefined}
                    badges={[
                      mail.mailNumber || 'Tanpa No. Surat',
                      locked ? 'Terkunci' : null,
                    ]}
                    note={mail.notes || undefined}
                    date={formatDateIndo(mail.date)}
                    onDetail={!locked ? () => handleOpenModal(mail) : undefined}
                    detailLabel="Edit"
                    onDelete={!locked ? () => handleDelete(mail) : undefined}
                  />
                );
              })}
            </div>

            <MobilePagination
              currentPage={currentPage}
              totalItems={totalMailsCount}
              pageSize={typeof pageSize === 'number' ? pageSize : 10}
              onPageChange={(p) => setCurrentPage(p)}
              itemLabel="surat masuk"
            />
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px]">
                  <th className="p-3 w-12 text-center border-r border-slate-200">NO</th>
                  <th className="p-3 w-32 text-center border-r border-slate-200">TANGGAL</th>
                  <th className="p-3 w-36 border-r border-slate-200">NO. SURAT PENGIRIM</th>
                  <th className="p-3 min-w-[200px] border-r border-slate-200">SURAT DARI / PENGIRIM</th>
                  <th className="p-3 min-w-[240px] border-r border-slate-200">PERIHAL</th>
                  <th className="p-3 min-w-[180px] border-r border-slate-200">DISPOSISI / CATATAN</th>
                  <th className="p-3 w-24 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mails.map((mail, idx) => {
                  const locked = isRecordLocked(mail.date, user?.email);
                  const lockMsg = locked ? `Terkunci otomatis setelah ${getLockDeadlineMessage(mail.date)}` : '';

                  return (
                    <tr key={mail.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center border-r border-slate-200 font-medium text-slate-600">
                        {idx + 1 + (currentPage - 1) * (typeof pageSize === 'string' ? mails.length : pageSize)}
                      </td>
                      <td className="p-3 text-center border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {formatDateIndo(mail.date)}
                      </td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                        {mail.mailNumber || '-'}
                      </td>
                      <td className="p-3 border-r border-slate-200 font-semibold text-slate-900 leading-snug">
                        {mail.sender}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-800 leading-snug">
                        {mail.subject}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-600">
                        {mail.notes || '-'}
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
                              onClick={() => handleOpenModal(mail)}
                              className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(mail)}
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
              <span>baris. Menampilkan {mails.length === 0 ? 0 : Math.min(totalMailsCount, (currentPage - 1) * (typeof pageSize === 'string' ? totalMailsCount : pageSize) + 1)}-{Math.min(totalMailsCount, currentPage * (typeof pageSize === 'string' ? totalMailsCount : pageSize))} dari {totalMailsCount} surat masuk.</span>
            </div>

            {totalMailsCount > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  Halaman {currentPage} dari {Math.ceil(totalMailsCount / (typeof pageSize === 'string' ? 500 : pageSize)) || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalMailsCount / (typeof pageSize === 'string' ? 500 : pageSize)) || 1, prev + 1))}
                  disabled={currentPage >= (Math.ceil(totalMailsCount / (typeof pageSize === 'string' ? 500 : pageSize)) || 1)}
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto pt-safe">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 my-8 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingId ? 'Edit Surat Masuk' : 'Catat Surat Masuk Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Tanggal Surat / Terima <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={mailDate}
                    onChange={(e) => setMailDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    No. Surat Pengirim
                  </label>
                  <input
                    type="text"
                    value={mailNumber}
                    onChange={(e) => setMailNumber(e.target.value)}
                    placeholder="Contoh: 102/BPN/VI/2026"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Surat Dari / Pengirim <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="Contoh: PT Bank Central Asia Tbk / Kantor Pertanahan"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Perihal <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Perihal atau ringkasan isi surat..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Disposisi / Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instruksi disposisi / tempat penyimpanan berkas"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
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
                  className="px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={16} />
                  {isSaving ? 'Menyimpan...' : 'Simpan Surat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
