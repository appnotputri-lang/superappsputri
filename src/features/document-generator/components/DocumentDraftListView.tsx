import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Trash2, Edit, ExternalLink, Download, 
  ChevronDown, CheckCircle2, Clock, AlertCircle, RefreshCw,
  Building, Calendar, FileText, ArrowUpDown, Filter, ChevronLeft, ChevronRight,
  ShieldCheck, Loader2
} from 'lucide-react';
import { UnifiedDraftItem } from '../../../services/DocumentDraftService';

export interface DownloadOption {
  label: string;
  subLabel?: string;
  format: string;
  color?: string;
}

export interface DocumentDraftListViewProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badgeLabel?: string;
  items: UnifiedDraftItem[];
  loading?: boolean;
  onAdd: () => void;
  onEdit: (item: UnifiedDraftItem) => void;
  onDelete: (item: UnifiedDraftItem) => Promise<void> | void;
  onOpenDrive: (item: UnifiedDraftItem) => void;
  onSyncDrive?: (item: UnifiedDraftItem) => Promise<void> | void;
  onDownload: (item: UnifiedDraftItem, format: string) => Promise<void> | void;
  downloadOptions?: (item: UnifiedDraftItem) => DownloadOption[];
  filterYears?: string[];
  selectedYear?: string;
  onSelectYear?: (y: string) => void;
}

export const DocumentDraftListView: React.FC<DocumentDraftListViewProps> = ({
  title,
  subtitle,
  icon,
  badgeLabel,
  items,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onOpenDrive,
  onSyncDrive,
  onDownload,
  downloadOptions,
  filterYears = [],
  selectedYear = 'ALL',
  onSelectYear
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'updatedAt' | 'companyName' | 'createdAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownId, setDropdownId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Filter & Sort
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        (item.companyName || '').toLowerCase().includes(q) ||
        (item.documentNumber || '').toLowerCase().includes(q) ||
        (item.subTitle || '').toLowerCase().includes(q) ||
        (item.documentTypeLabel || '').toLowerCase().includes(q)
      );
    }

    // Year filter
    if (selectedYear && selectedYear !== 'ALL') {
      result = result.filter(item => {
        const dateStr = item.updatedAt || item.createdAt || '';
        return dateStr.startsWith(selectedYear) || (item.documentNumber || '').includes(selectedYear);
      });
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'updatedAt' || sortField === 'createdAt') {
        const timeA = valA ? new Date(valA).getTime() : 0;
        const timeB = valB ? new Date(valB).getTime() : 0;
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return result;
  }, [items, searchQuery, selectedYear, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleSort = (field: 'updatedAt' | 'companyName' | 'createdAt') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleTriggerSync = async (item: UnifiedDraftItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSyncDrive) return;
    setSyncingId(item.id);
    try {
      await onSyncDrive(item);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteWithConfirm = async (item: UnifiedDraftItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownId(null);
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus draft dokumen untuk "${item.companyName}"?\nTindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      await onDelete(item);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full bg-[#f8fafc] min-h-[calc(100vh-60px)] p-4 sm:p-6 space-y-5">
      {/* HEADER SECTION */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100/80 flex items-center justify-center shrink-0 text-[#1b449c] shadow-xs">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[19px] sm:text-[21px] font-extrabold text-slate-800 tracking-tight leading-snug">
                  {title}
                </h1>
                {badgeLabel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-700 uppercase tracking-wide">
                    {badgeLabel}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-slate-500 font-medium mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAdd}
              className="w-full sm:w-auto bg-[#1b449c] hover:bg-[#13327d] text-white px-5 py-2.5 rounded-lg font-bold text-[12.5px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Buat Dokumen</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama PT, no akta, kedudukan..."
            className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-lg text-[13px] font-medium text-slate-700 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters & Count */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {filterYears.length > 0 && onSelectYear && (
            <div className="flex items-center gap-1.5 text-[12.5px] text-slate-600 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  onSelectYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-slate-250 rounded-md py-1.5 px-2 bg-white text-[12.5px] font-semibold text-slate-700 focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="ALL">Semua Tahun</option>
                {filterYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          <div className="text-[12.5px] font-semibold text-slate-500">
            Total Draft: <span className="text-slate-800 font-bold">{filteredItems.length}</span>
          </div>
        </div>
      </div>

      {/* DRAFT LIST TABLE (DESKTOP) */}
      <div className="hidden md:block bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-[13px] font-medium">Memuat data draft tersimpan...</span>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center max-w-md mx-auto">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-700">
              {searchQuery ? 'Data tidak ditemukan' : 'Belum Ada Draft Dokumen'}
            </h3>
            <p className="text-[13px] text-slate-400 text-center mt-1 mb-5">
              {searchQuery 
                ? `Tidak ada dokumen yang cocok dengan kata kunci "${searchQuery}". Coba ubah filter atau pencarian Anda.`
                : 'Mulai buat draf dokumen pertama Anda dengan mengklik tombol di bawah ini.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={onAdd}
                className="bg-[#1b449c] hover:bg-[#13327d] text-white px-5 py-2.5 rounded-lg font-bold text-[12.5px] uppercase tracking-wide flex items-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Buat Dokumen</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 font-bold text-[11.5px] uppercase tracking-wider">
                  <th className="px-4 py-3.5 text-center w-12 border-r border-slate-200/70">NO</th>
                  <th 
                    onClick={() => handleSort('companyName')}
                    className="px-4 py-3.5 border-r border-slate-200/70 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>NAMA PERUSAHAAN</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-3.5 border-r border-slate-200/70 w-[200px]">JENIS DOKUMEN</th>
                  <th className="px-4 py-3.5 border-r border-slate-200/70 w-[160px]">JUDUL / NOMOR</th>
                  <th 
                    onClick={() => handleSort('updatedAt')}
                    className="px-4 py-3.5 border-r border-slate-200/70 w-[160px] cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>TERAKHIR DIUBAH</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-3.5 border-r border-slate-200/70 text-center w-[120px]">STATUS</th>
                  <th className="px-4 py-3.5 border-r border-slate-200/70 text-center w-[160px]">GOOGLE DRIVE</th>
                  <th className="px-4 py-3.5 text-center w-[210px]">TINDAKAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {paginatedItems.map((item, idx) => {
                  const overallIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const hasDrive = Boolean(item.driveFileId);
                  const isSyncing = syncingId === item.id;
                  const isDeleting = deletingId === item.id;

                  return (
                    <tr 
                      key={item.id}
                      onClick={() => onEdit(item)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer odd:bg-white even:bg-slate-50/30 group"
                    >
                      <td className="px-4 py-3.5 text-center font-bold text-slate-400 text-xs border-r border-slate-200/70">
                        {overallIdx}
                      </td>

                      {/* NAMA PERUSAHAAN */}
                      <td className="px-4 py-3.5 border-r border-slate-200/70">
                        <div className="font-extrabold text-slate-800 uppercase tracking-tight group-hover:text-blue-700 transition-colors">
                          {item.companyName}
                        </div>
                        {item.subTitle && (
                          <div className="text-[11px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                            <span>{item.subTitle}</span>
                          </div>
                        )}
                      </td>

                      {/* JENIS DOKUMEN */}
                      <td className="px-4 py-3.5 border-r border-slate-200/70">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide bg-slate-100 text-slate-700 border border-slate-200/70">
                          {item.documentTypeLabel}
                        </span>
                      </td>

                      {/* NOMOR DOKUMEN */}
                      <td className="px-4 py-3.5 border-r border-slate-200/70 text-slate-600 font-semibold text-[12px]">
                        {item.documentNumber || '-'}
                      </td>

                      {/* TERAKHIR DIUBAH */}
                      <td className="px-4 py-3.5 border-r border-slate-200/70 text-slate-500 text-[11.5px] font-medium">
                        {formatDateTime(item.updatedAt || item.createdAt)}
                      </td>

                      {/* STATUS PENYIMPANAN */}
                      <td className="px-4 py-3.5 border-r border-slate-200/70 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          item.saveStatus === 'saved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {item.saveStatus === 'saved' ? 'Tersimpan' : 'Draft'}
                        </span>
                      </td>

                      {/* STATUS GOOGLE DRIVE */}
                      <td className="px-4 py-3.5 border-r border-slate-200/70 text-center" onClick={(e) => e.stopPropagation()}>
                        {hasDrive ? (
                          <button
                            type="button"
                            onClick={() => onOpenDrive(item)}
                            title="Buka dokumen di Google Drive"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-green-50 hover:bg-green-100 text-green-700 border border-green-200/80 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                            <span>Tersinkron</span>
                            <ExternalLink className="w-3 h-3 text-green-600" />
                          </button>
                        ) : isSyncing ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-500 bg-slate-100">
                            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                            <span>Menyinkron...</span>
                          </span>
                        ) : onSyncDrive ? (
                          <button
                            type="button"
                            onClick={(e) => handleTriggerSync(item, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200/80 transition-all cursor-pointer"
                            title="Unggah dan sinkronkan dokumen ke Google Drive"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Belum Sync</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200">
                            Belum Ada File
                          </span>
                        )}
                      </td>

                      {/* TINDAKAN */}
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Button Edit Draft */}
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200/80 hover:border-blue-600 font-bold text-[11px] uppercase tracking-wide transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Edit Draft Dokumen"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Button Buka Drive (if exists) */}
                          {hasDrive && (
                            <button
                              type="button"
                              onClick={() => onOpenDrive(item)}
                              className="px-2 py-1.5 rounded-md bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200/80 hover:border-emerald-600 font-bold text-[11px] uppercase transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Buka Dokumen di Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">Drive</span>
                            </button>
                          )}

                          {/* Button Download DOCX */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownId(dropdownId === item.id ? null : item.id);
                              }}
                              className={`px-2.5 py-1.5 rounded-md border text-[11px] font-bold uppercase transition-all shadow-2xs flex items-center gap-1 cursor-pointer ${
                                dropdownId === item.id 
                                  ? 'bg-slate-800 text-white border-slate-800' 
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-250'
                              }`}
                              title="Unduh file DOCX"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <ChevronDown className={`w-3 h-3 transition-transform ${dropdownId === item.id ? 'rotate-180' : ''}`} />
                            </button>

                            {dropdownId === item.id && (
                              <div className="absolute right-0 top-9 bg-white border border-slate-200 shadow-xl rounded-xl py-1 w-56 z-50 text-left overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                {downloadOptions ? (
                                  downloadOptions(item).map((opt) => (
                                    <button
                                      key={opt.format}
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setDropdownId(null);
                                        await onDownload(item, opt.format);
                                      }}
                                      className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11.5px] font-bold flex flex-col items-start border-b border-slate-100 last:border-0 cursor-pointer text-left"
                                    >
                                      <span className="leading-tight text-slate-800">{opt.label}</span>
                                      {opt.subLabel && (
                                        <span className="text-[10px] text-slate-400 font-normal mt-0.5 lowercase">{opt.subLabel}</span>
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setDropdownId(null);
                                      await onDownload(item, 'default');
                                    }}
                                    className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11.5px] font-bold flex items-center gap-2 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Unduh Dokumen (.docx)</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Button Hapus Draft */}
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={(e) => handleDeleteWithConfirm(item, e)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-40"
                            title="Hapus Draft"
                          >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION (DESKTOP) */}
        {filteredItems.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200/90 bg-[#f8fafc] text-slate-500 text-[12.5px] font-medium">
            <div>
              Menampilkan <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> sampai <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> dari <span className="font-bold text-slate-700">{filteredItems.length}</span> data
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 border border-slate-200 rounded-md font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs"
              >
                Sebelumnya
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-md font-bold text-xs transition-all ${
                    currentPage === p
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 border border-slate-200 rounded-md font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DRAFT LIST CARDS (MOBILE) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-600 mb-2" />
            <span className="text-xs">Memuat data draft...</span>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="font-bold text-slate-700 text-sm">Belum Ada Draft</div>
            <p className="text-xs text-slate-400 mt-1 mb-4">Buat draft dokumen baru sekarang.</p>
            <button
              type="button"
              onClick={onAdd}
              className="bg-[#1b449c] text-white px-4 py-2 rounded-lg font-bold text-xs uppercase"
            >
              + Buat Dokumen
            </button>
          </div>
        ) : (
          paginatedItems.map((item, idx) => {
            const overallIdx = (currentPage - 1) * itemsPerPage + idx + 1;
            const hasDrive = Boolean(item.driveFileId);

            return (
              <div 
                key={item.id}
                onClick={() => onEdit(item)}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 cursor-pointer active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">#{overallIdx}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                      {item.documentTypeLabel}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    item.saveStatus === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {item.saveStatus === 'saved' ? 'Tersimpan' : 'Draft'}
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-800 uppercase text-sm leading-snug">
                    {item.companyName}
                  </h3>
                  {item.subTitle && (
                    <p className="text-xs text-slate-400 mt-0.5">{item.subTitle}</p>
                  )}
                  {item.documentNumber && (
                    <p className="text-xs font-semibold text-slate-600 mt-1">{item.documentNumber}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                  {hasDrive ? (
                    <span className="text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Drive OK
                    </span>
                  ) : (
                    <span className="text-slate-400">Belum di Drive</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="flex-1 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-md border border-blue-200 text-center"
                  >
                    Edit Draft
                  </button>

                  {hasDrive && (
                    <button
                      type="button"
                      onClick={() => onOpenDrive(item)}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-md border border-emerald-200 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Drive
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteWithConfirm(item, e)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DocumentDraftListView;
