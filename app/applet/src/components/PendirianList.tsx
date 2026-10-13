import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, FileText, ArrowRight, Edit, FileDown, ChevronDown, Building, Calendar, History } from 'lucide-react';
import { collection, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { DocumentStatusBadge } from '../../components/DocumentStatusBadge';
import { PageContainer } from './ui/PageLayout';
import { MobileEmptyState } from './ui/MobileHeader';
import { MobileDataCard } from './ui/MobileDataCard';

const PendirianList: React.FC<{
  onEdit: (record: any) => void;
  onAdd: () => void;
  onDownload: (record: any) => void;
}> = ({ onEdit, onAdd, onDownload }) => {
  const [listSearch, setListSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [sortField, setSortField] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [records, setRecords] = useState<any[]>([]);
  const [dropdownId, setDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'pendirian_projects'));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRecords(loaded);
    }, (err) => {
      console.error("Error fetching pendirian_projects:", err);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data pendirian ini?')) {
      try {
        await deleteDoc(doc(db, 'pendirian_projects', id));
        alert('Data pendirian berhasil dihapus!');
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `pendirian_projects/${id}`);
      }
    }
  };

  // Filtering
  let filtered = records.filter(rec => {
    if (!listSearch) return true;
    const q = listSearch.toLowerCase();
    const name = (rec.namaPt || rec.companyName || rec.namaCV || '').toLowerCase();
    const domicile = (rec.kotaKedudukan || rec.domicile || '').toLowerCase();
    return name.includes(q) || domicile.includes(q);
  });

  if (selectedYear !== 'all') {
    filtered = filtered.filter(rec => {
      const dateStr = rec.signingDate || rec.establishmentDeedDate || rec.updatedAt || rec.createdAt;
      if (!dateStr) return false;
      const year = new Date(dateStr).getFullYear().toString();
      return year === selectedYear;
    });
  }

  // Unique Years
  const uniqueYears = Array.from(new Set(
    records.map(rec => {
      const dateStr = rec.signingDate || rec.establishmentDeedDate || rec.updatedAt || rec.createdAt;
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '' : d.getFullYear().toString();
    }).filter(Boolean)
  )).sort((a, b) => Number(b) - Number(a));

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    let valA = '';
    let valB = '';
    if (sortField === 'companyName') {
      valA = a.namaPt || a.companyName || a.namaCV || '';
      valB = b.namaPt || b.companyName || b.namaCV || '';
    } else if (sortField === 'signingDate') {
      valA = a.signingDate || a.establishmentDeedDate || '';
      valB = b.signingDate || b.establishmentDeedDate || '';
    } else if (sortField === 'status') {
      valA = a.documentStatus || 'DRAFTING';
      valB = b.documentStatus || 'DRAFTING';
    } else {
      valA = a.updatedAt || a.createdAt || '';
      valB = b.updatedAt || b.createdAt || '';
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedResults = sorted.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const renderSortArrows = (field: string) => {
    const isActive = sortField === field;
    return (
      <span className="inline-flex flex-col text-[8px] text-slate-400 shrink-0 ml-1.5 leading-none select-none">
        <span className={`${isActive && sortOrder === 'asc' ? 'text-blue-600 font-bold' : 'text-slate-300'}`}>▲</span>
        <span className={`${isActive && sortOrder === 'desc' ? 'text-blue-600 font-bold' : 'text-slate-300'}`}>▼</span>
      </span>
    );
  };

  return (
    <PageContainer>
      <div className="w-[94%] xl:w-[92%] max-w-none mx-auto space-y-6 px-2 sm:px-4 py-4">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-5 rounded-md shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-full border border-blue-100 flex items-center justify-center shrink-0">
              <Building className="w-6 h-6 text-[#1b449c]" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold flex items-center gap-2 text-slate-800 tracking-tight leading-snug uppercase">
                PENDIRIAN PT & CV (AKTA PENDIRIAN)
              </h2>
              <p className="text-[13px] text-slate-500 font-medium">
                Kelola daftar akta dan draft pendirian badan usaha (PT / CV)
              </p>
            </div>
          </div>
          <button 
            onClick={onAdd}
            className="bg-[#1b449c] hover:bg-[#13327d] text-white px-5 py-2.5 rounded-md font-bold text-[12px] flex items-center gap-2 transition-all shadow-sm shrink-0 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> TAMBAH PENDIRIAN PT BARU
          </button>
        </div>

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama PT / CV..."
                value={listSearch}
                onChange={(e) => {
                  setListSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 border border-slate-250 rounded-md text-[13px] outline-none focus:border-[#1b449c] focus:ring-1 focus:ring-[#1b449c]/20 bg-white text-slate-800 placeholder-slate-400 transition-all font-medium"
              />
              {listSearch && (
                <button
                  onClick={() => { setListSearch(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-extrabold text-[15px]"
                  type="button"
                >
                  ×
                </button>
              )}
            </div>

            {/* Year Filter */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-250 rounded-md px-3 py-2 text-[13px] font-semibold text-slate-700 outline-none focus:border-[#1b449c] cursor-pointer"
              >
                <option value="all">Semua Tahun</option>
                {uniqueYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[12px] font-semibold text-slate-500">
            Total: <span className="text-[#1b449c] font-bold">{sorted.length}</span> data
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#fcfcfc] border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
                  <th className="px-4 py-3 text-center w-12 border-r border-slate-200">No</th>
                  <th 
                    className="px-4 py-3 border-r border-slate-200 cursor-pointer hover:bg-slate-100/70 select-none"
                    onClick={() => handleSort('companyName')}
                  >
                    <div className="flex items-center justify-between">
                      <span>Nama Badan Usaha (PT / CV)</span>
                      {renderSortArrows('companyName')}
                    </div>
                  </th>
                  <th className="px-4 py-3 border-r border-slate-200">Kedudukan</th>
                  <th 
                    className="px-4 py-3 border-r border-slate-200 text-center cursor-pointer hover:bg-slate-100/70 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Status</span>
                      {renderSortArrows('status')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 border-r border-slate-200 text-center cursor-pointer hover:bg-slate-100/70 select-none"
                    onClick={() => handleSort('signingDate')}
                  >
                    <div className="flex items-center justify-center">
                      <span>Tanggal / Update</span>
                      {renderSortArrows('signingDate')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center w-[150px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedResults.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                      {listSearch ? 'Data tidak ditemukan.' : 'Belum ada data pendirian.'}
                    </td>
                  </tr>
                ) : (
                  paginatedResults.map((rec, idx) => {
                    const displayName = rec.namaPt || rec.companyName || rec.namaCV || '-';
                    const isCvItem = Boolean(rec.namaCV || rec.jobType === 'pendirian_cv');
                    const domicile = rec.kotaKedudukan || rec.domicile || '-';
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => onEdit(rec)}>
                        <td className="px-4 py-3.5 text-center border-r border-slate-200 text-slate-500 font-bold">
                          {startIndex + idx + 1}
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-200">
                          <div className="font-bold text-[#0c2444] uppercase flex items-center gap-2">
                            <span>{displayName}</span>
                            {isCvItem && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">CV</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-200 uppercase text-slate-700">{domicile}</td>
                        <td className="px-4 py-3.5 border-r border-slate-200 text-center">
                          <DocumentStatusBadge status={rec.documentStatus || "DRAFTING"} />
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-200 text-center text-slate-500 font-mono text-[11px]">
                          {rec.updatedAt && !isNaN(new Date(rec.updatedAt).getTime()) 
                            ? new Date(rec.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) 
                            : (rec.signingDate || '-')}
                        </td>
                        <td className="px-4 py-3.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownId(dropdownId === rec.id ? null : rec.id);
                              }}
                              className={`px-3 py-1.5 rounded-md border text-[11px] font-bold uppercase transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                dropdownId === rec.id ? 'bg-[#0c2444] text-white border-[#0c2444]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                              }`}
                            >
                              <FileDown className="w-[14px] h-[14px] stroke-[2.25px]" /> Download <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownId === rec.id ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                          {dropdownId === rec.id && (
                            <div className="absolute right-4 top-13 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 w-[220px] z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDropdownId(null);
                                  onDownload(rec);
                                }}
                                className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                              >
                                <FileText className="w-[15px] h-[15px] text-blue-500 shrink-0" />
                                <div className="flex flex-col text-left">
                                  <span className="leading-tight">Akta Pendirian</span>
                                  <span className="text-[9px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
                                </div>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDropdownId(null);
                                  onEdit(rec);
                                }}
                                className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                              >
                                <Edit className="w-[15px] h-[15px] text-indigo-500 shrink-0" />
                                <span className="leading-tight">Edit Data</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDropdownId(null);
                                  handleDelete(rec.id);
                                }}
                                className="w-full px-4 py-2 text-red-600 hover:bg-red-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide cursor-pointer"
                              >
                                <Trash2 className="w-[15px] h-[15px] text-red-500 shrink-0" />
                                <span className="leading-tight">Hapus Data</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
              <div className="text-[12px] text-slate-500">
                Menampilkan halaman <span className="font-bold">{safeCurrentPage}</span> dari <span className="font-bold">{totalPages}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="block md:hidden">
          {paginatedResults.length === 0 ? (
            <MobileEmptyState message={listSearch ? 'Data tidak ditemukan.' : 'Belum ada data pendirian.'} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {paginatedResults.map((rec, idx) => (
                <MobileDataCard
                  key={rec.id}
                  number={startIndex + idx + 1}
                  title={rec.namaPt || rec.companyName || rec.namaCV || '-'}
                  subtitle={rec.kotaKedudukan || rec.domicile ? `Kedudukan: ${rec.kotaKedudukan || rec.domicile}` : undefined}
                  badges={[
                    <DocumentStatusBadge key="status" status={rec.documentStatus || "DRAFTING"} />
                  ]}
                  date={rec.updatedAt && !isNaN(new Date(rec.updatedAt).getTime()) ? new Date(rec.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
                  onDetail={() => onEdit(rec)}
                  onDelete={() => handleDelete(rec.id)}
                  extraFooterAction={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(rec);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-bold text-[10px] hover:bg-slate-200 transition-colors uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <FileDown className="w-3 h-3 text-blue-600" />
                      Docx
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default PendirianList;
