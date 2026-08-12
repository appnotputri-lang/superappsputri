import React from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Undo,
  Archive,
  Trash2,
  FileDown,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import { CompanyAvatar } from '../../../components/common/CompanyAvatar';
import { CompanyListProps } from '../types/company.types';
import { formatCompanyName } from '../../../lib/formatter';
import { generateCompanyProfileSummaryPdf } from '../../../lib/generateCompanyProfileSummaryPdf';
import { CompanyService } from '../../../services/CompanyService';

const clientTypeBadgeStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  PT: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80', label: 'PT' },
  CV: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200/80', label: 'CV' },
  YAYASAN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200/80', label: 'Yayasan' },
  PERKUMPULAN: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200/80', label: 'Perkumpulan' },
  PERSEKUTUAN_FIRMA: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200/80', label: 'Persekutuan Firma' },
  PERSEKUTUAN_PERDATA: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200/80', label: 'Persekutuan Perdata' },
  KOPERASI: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200/80', label: 'Koperasi' },
  PMA: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200/80', label: 'PMA' },
  PERORANGAN: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200/80', label: 'Perorangan' },
  LAINNYA: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200/80', label: 'Lainnya' }
};

export const CompanyList: React.FC<CompanyListProps> = ({
  items = [],
  profileStartIndex,
  paginatedProfileResults = [],
  totalProfileItems,
  profileSortField,
  profileSortOrder,
  handleProfileSort,
  renderProfileSortArrows,
  openDropdownId,
  setOpenDropdownId,
  setEditingProfileId,
  setIsProfilePreview,
  updateData,
  INITIAL_STATE,
  handleDuplicateProfile,
  handleArchiveProfile,
  profileCurrentPage,
  setProfileCurrentPage,
  totalProfilePages,
  userProfile,
  deleteCompany,
  itemsPerPage = 10,
  setItemsPerPage,
}) => {
  const [dropdownCoords, setDropdownCoords] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    if (!openDropdownId) return;
    const handleOutsideClick = () => {
      setOpenDropdownId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [openDropdownId, setOpenDropdownId]);

  const formatProfileLastUpdated = (dateStr?: string, establishmentDate?: string) => {
    const dateToFormat = dateStr || establishmentDate;
    if (!dateToFormat) return '-';
    try {
      const d = new Date(dateToFormat);
      if (isNaN(d.getTime())) return dateToFormat;
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'Mei',
        'Jun',
        'Jul',
        'Agu',
        'Sep',
        'Okt',
        'Nov',
        'Des',
      ];
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year} ${hours}:${minutes}`;
    } catch (e) {
      return dateToFormat;
    }
  };

  const getProfilePageRange = () => {
    const pages: (number | string)[] = [];
    if (totalProfilePages <= 5) {
      for (let i = 1; i <= totalProfilePages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (profileCurrentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, profileCurrentPage - 1);
      const end = Math.min(totalProfilePages - 1, profileCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (profileCurrentPage < totalProfilePages - 2) {
        pages.push('...');
      }
      pages.push(totalProfilePages);
    }
    return pages;
  };

  if (items.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs font-medium shadow-xs">
        Belum ada data klien. Klik <strong className="text-slate-800 font-bold">"TAMBAH KLIEN"</strong> untuk membuat.
      </div>
    );
  }

  if (paginatedProfileResults.length === 0) {
    return (
      <div className="bg-white p-8 text-center rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs font-medium shadow-xs">
        Tidak ada data klien yang cocok dengan pencarian / penyaringan saat ini.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
      {/* List count header */}
      <div className="px-4 py-2.5 border-b border-slate-200/80 flex justify-between items-center bg-slate-50/50">
        <span className="text-xs font-semibold text-slate-500">
          Menampilkan <span className="text-slate-800 font-bold">{profileStartIndex + 1}</span> -{' '}
          <span className="text-slate-800 font-bold">
            {Math.min(profileStartIndex + paginatedProfileResults.length, totalProfileItems)}
          </span>{' '}
          dari <span className="text-slate-800 font-bold">{totalProfileItems}</span> Klien
        </span>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-[1000px] w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8fafc] border-b border-slate-200/80 font-bold uppercase text-slate-600 text-[11px] tracking-wider select-none">
            <tr>
              <th className="px-3.5 py-2.5 text-center border-r border-slate-200/60 w-12 text-[#0c2444]">NO</th>
              <th
                className="px-4 py-2.5 border-r border-slate-200/60 cursor-pointer hover:bg-slate-100/80 transition-colors"
                onClick={() => handleProfileSort('companyName')}
              >
                <div className="flex items-center justify-between">
                  <span>NAMA PERSEROAN</span>
                  {renderProfileSortArrows('companyName')}
                </div>
              </th>
              <th className="px-4 py-2.5 border-r border-slate-200/60">
                JENIS BADAN USAHA
              </th>
              <th
                className="px-4 py-2.5 border-r border-slate-200/60 cursor-pointer hover:bg-slate-100/80 transition-colors"
                onClick={() => handleProfileSort('domicile')}
              >
                <div className="flex items-center justify-between">
                  <span>KEDUDUKAN (KAB/KOTA)</span>
                  {renderProfileSortArrows('domicile')}
                </div>
              </th>
              <th
                className="px-4 py-2.5 border-r border-slate-200/60 cursor-pointer hover:bg-slate-100/80 transition-colors"
                onClick={() => handleProfileSort('establishmentDeedDate')}
              >
                <div className="flex items-center justify-between">
                  <span>TANGGAL AKTA PENDIRIAN</span>
                  {renderProfileSortArrows('establishmentDeedDate')}
                </div>
              </th>
              <th
                className="px-4 py-2.5 border-r border-slate-200/60 cursor-pointer hover:bg-slate-100/80 transition-colors"
                onClick={() => handleProfileSort('updatedAt')}
              >
                <div className="flex items-center justify-between">
                  <span>TERAKHIR DIUBAH</span>
                  {renderProfileSortArrows('updatedAt')}
                </div>
              </th>
              <th className="px-3 py-2.5 text-center w-14">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedProfileResults.map((p, idx) => {
              const currentNo = profileStartIndex + idx + 1;
              const city = p.domicile || '-';
              const deedDate = p.establishmentDeedDate
                ? new Date(p.establishmentDeedDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '-';
              const lastUpdated = formatProfileLastUpdated(p.updatedAt, p.establishmentDeedDate);
              const badge = clientTypeBadgeStyles[p.clientType || 'PT'] || clientTypeBadgeStyles.PT;

              return (
                <tr
                  key={p.id}
                  className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setEditingProfileId(p.id);
                    setIsProfilePreview(true);
                    updateData({ ...INITIAL_STATE, ...p } as any);
                  }}
                >
                  <td className="px-3.5 py-2.5 font-bold text-center border-r border-slate-100 text-slate-400 w-12">
                    {currentNo}
                  </td>
                  <td className="px-4 py-2.5 border-r border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <CompanyAvatar name={p.companyName || ''} />
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 uppercase tracking-tight text-[12px] group-hover:text-[#1890ff] transition-colors">
                          {formatCompanyName(p.companyName, p.clientType)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID Klien: {p.id ? `${p.id.slice(0, 12)}...` : '-'}
                        </span>
                      </div>
                    </div>
                    {p.kbliItems && p.kbliItems.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1 items-center pl-9">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-1 py-0.5 rounded leading-none shrink-0">
                          KBLI:
                        </span>
                        {p.kbliItems.map((item) => (
                          <span
                            key={item.code}
                            className="text-[9px] font-mono font-bold bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 leading-none"
                            title={item.name}
                          >
                            {item.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 border-r border-slate-100">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 border-r border-slate-100 uppercase font-semibold">
                    {city}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 border-r border-slate-100 uppercase font-medium">
                    {deedDate}
                  </td>
                  <td className="px-4 py-2.5 border-r border-slate-100">
                    <span className="text-slate-800 text-xs font-semibold block">{lastUpdated}</span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5 uppercase tracking-wider">oleh ADMIN</span>
                  </td>
                  <td
                    className="px-3 py-2.5 text-center relative border-r border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const top = rect.bottom + window.scrollY + 6;
                          const left = Math.max(16, rect.right + window.scrollX - 176);
                          setDropdownCoords({ top, left });
                          setOpenDropdownId(openDropdownId === p.id ? null : p.id);
                        }}
                        className={`p-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition-all shadow-xs cursor-pointer ${
                          openDropdownId === p.id
                            ? 'opacity-100 bg-slate-100 border-slate-300'
                            : 'opacity-100'
                        }`}
                        title="Pilihan Aksi"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dropdown popup portal */}
                    {openDropdownId === p.id && dropdownCoords && createPortal(
                      <div 
                        style={{
                          position: 'absolute',
                          top: `${dropdownCoords.top}px`,
                          left: `${dropdownCoords.left}px`,
                        }}
                        className="bg-white border border-slate-200 shadow-xl rounded-2xl py-1.5 w-44 z-[9999] text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            setEditingProfileId(p.id);
                            setIsProfilePreview(true);
                            updateData({ ...INITIAL_STATE, ...p } as any);
                          }}
                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Buka Profil</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            setEditingProfileId(p.id);
                            setIsProfilePreview(false);
                            updateData({ ...INITIAL_STATE, ...p } as any);
                          }}
                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            handleDuplicateProfile(p);
                          }}
                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Duplikat</span>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            try {
                              const fullProfile = await CompanyService.getCompanyProfile(p.id);
                              if (fullProfile) {
                                generateCompanyProfileSummaryPdf(fullProfile);
                              } else {
                                alert('Gagal memuat profil lengkap klien.');
                              }
                            } catch (err) {
                              console.error('Error generating PDF:', err);
                              alert('Gagal membuat ringkasan PDF.');
                            }
                          }}
                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Ringkasan (PDF)</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            handleArchiveProfile(p);
                          }}
                          className={`w-full px-3.5 py-2 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide cursor-pointer ${
                            p.isArchived
                              ? 'text-emerald-700 hover:bg-emerald-50/60'
                              : 'text-amber-700 hover:bg-amber-50/60'
                          }`}
                        >
                          {p.isArchived ? (
                            <>
                              <Undo className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Pulihkan</span>
                            </>
                          ) : (
                            <>
                              <Archive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Arsipkan</span>
                            </>
                          )}
                        </button>
                        {userProfile?.role === 'Super Admin' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(null);
                              if (deleteCompany) {
                                deleteCompany(p.id, false);
                              }
                            }}
                            className="w-full px-3.5 py-2 hover:bg-red-50 text-red-600 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-t border-slate-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>,
                      document.body
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3 pt-2">
        {paginatedProfileResults.map((p) => {
          const city = p.domicile || '-';
          const npwpText = p.npwp ? `NPWP ${p.npwp}` : 'NPWP -';

          return (
            <div 
              key={p.id} 
              className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 hover:border-slate-200 transition-all cursor-pointer"
              onClick={() => {
                setEditingProfileId(p.id);
                setIsProfilePreview(true);
                updateData({ ...INITIAL_STATE, ...p } as any);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <CompanyAvatar name={p.companyName || ''} />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 uppercase text-xs sm:text-sm tracking-tight leading-tight truncate">
                      {formatCompanyName(p.companyName, p.clientType)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block truncate">
                      {npwpText}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-1 uppercase">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{city}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(p as any).activeProjectsCount !== undefined && (
                    <span className="bg-blue-50 text-[#1e61c3] px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap">
                      {(p as any).activeProjectsCount} Proyek Aktif
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="px-5 py-3.5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8fafc]">
        {/* Rows per page dropdown on the left */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage && setItemsPerPage(Number(e.target.value))}
            className="py-1 px-2.5 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:border-[#1890ff]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>baris per halaman</span>
        </div>

        {/* Page counter and controls on the right */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Halaman <span className="text-slate-800 font-bold">{profileCurrentPage}</span> dari{' '}
            <span className="text-slate-800 font-bold">{totalProfilePages}</span>
          </span>

          <div className="flex items-center gap-1">
            {/* First */}
            <button
              disabled={profileCurrentPage === 1}
              onClick={() => setProfileCurrentPage(1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
              title="Halaman Pertama"
            >
              «
            </button>
            {/* Prev */}
            <button
              disabled={profileCurrentPage === 1}
              onClick={() => setProfileCurrentPage(profileCurrentPage - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
              title="Halaman Sebelumnya"
            >
              ‹
            </button>

            {/* Numbers */}
            {getProfilePageRange().map((page, idx) => {
              if (page === '...') {
                return (
                  <span
                    key={`dots-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-bold"
                  >
                    ...
                  </span>
                );
              }
              const isCurrent = profileCurrentPage === page;
              return (
                <button
                  key={`page-${page}`}
                  onClick={() => setProfileCurrentPage(Number(page))}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#0c2444] text-white shadow-xs'
                      : 'border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            {/* Next */}
            <button
              disabled={profileCurrentPage === totalProfilePages}
              onClick={() => setProfileCurrentPage(profileCurrentPage + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
              title="Halaman Selanjutnya"
            >
              ›
            </button>
            {/* Last */}
            <button
              disabled={profileCurrentPage === totalProfilePages}
              onClick={() => setProfileCurrentPage(totalProfilePages)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-600 text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold cursor-pointer"
              title="Halaman Terakhir"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CompanyList;

