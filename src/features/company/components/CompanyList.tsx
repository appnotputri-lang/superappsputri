import React from 'react';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Undo,
  Archive,
} from 'lucide-react';
import { CompanyAvatar } from '../../../components/common/CompanyAvatar';
import { CompanyListProps } from '../types/company.types';
import { formatCompanyName } from '../../../lib/formatter';

const clientTypeBadgeStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  PT: { bg: 'bg-blue-50/70', text: 'text-blue-700', border: 'border-blue-200', label: 'PT' },
  CV: { bg: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-200', label: 'CV' },
  YAYASAN: { bg: 'bg-emerald-50/70', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Yayasan' },
  PERKUMPULAN: { bg: 'bg-purple-50/70', text: 'text-purple-700', border: 'border-purple-200', label: 'Perkumpulan' },
  PERSEKUTUAN_FIRMA: { bg: 'bg-pink-50/70', text: 'text-pink-700', border: 'border-pink-200', label: 'Persekutuan Firma' },
  PERSEKUTUAN_PERDATA: { bg: 'bg-indigo-50/70', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Persekutuan Perdata' },
  KOPERASI: { bg: 'bg-teal-50/70', text: 'text-teal-700', border: 'border-teal-200', label: 'Koperasi' },
  PMA: { bg: 'bg-rose-50/70', text: 'text-rose-700', border: 'border-rose-200', label: 'PMA' },
  PERORANGAN: { bg: 'bg-sky-50/70', text: 'text-sky-700', border: 'border-sky-200', label: 'Perorangan' },
  LAINNYA: { bg: 'bg-slate-50/70', text: 'text-slate-700', border: 'border-slate-200', label: 'Lainnya' }
};

export const CompanyList: React.FC<CompanyListProps> = ({
  profiles,
  profileStartIndex,
  paginatedProfileResults,
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
}) => {
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

  if (profiles.length === 0) {
    return (
      <div className="bg-slate-50 text-center py-12 rounded-sm border border-dashed border-slate-300 text-slate-500 text-[13px]">
        Belum ada data klien. Klik <strong>"TAMBAH KLIEN"</strong> untuk membuat.
      </div>
    );
  }

  if (paginatedProfileResults.length === 0) {
    return (
      <div className="bg-slate-50 text-center py-8 rounded-sm border border-dashed border-slate-300 text-slate-500 text-[12px]">
        Tidak ada data klien yang cocok dengan pencarian / penyaringan saat ini.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
      {/* List count header */}
      <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <span className="text-[12px] font-semibold text-slate-500">
          Menampilkan <span className="text-slate-800 font-bold">{profileStartIndex + 1}</span> -{' '}
          <span className="text-slate-800 font-bold">
            {Math.min(profileStartIndex + paginatedProfileResults.length, totalProfileItems)}
          </span>{' '}
          dari <span className="text-slate-800 font-bold">{totalProfileItems}</span> Klien
        </span>
      </div>

      {/* Table structure */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-[#f8fafc] border-b border-slate-200 font-bold uppercase text-slate-600 text-[11px] tracking-wider select-none">
            <tr>
              <th className="p-4 text-center border-r border-slate-200 w-12 text-[#3b5998]">No</th>
              <th
                className="p-4 border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
                onClick={() => handleProfileSort('companyName')}
              >
                <div className="flex items-center justify-between">
                  <span>NAMA PERSEROAN</span>
                  {renderProfileSortArrows('companyName')}
                </div>
              </th>
              <th className="p-4 border-r border-slate-200">
                JENIS BADAN USAHA
              </th>
              <th
                className="p-4 border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
                onClick={() => handleProfileSort('domicile')}
              >
                <div className="flex items-center justify-between">
                  <span>KEDUDUKAN (KAB/KOTA)</span>
                  {renderProfileSortArrows('domicile')}
                </div>
              </th>
              <th
                className="p-4 border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
                onClick={() => handleProfileSort('establishmentDeedDate')}
              >
                <div className="flex items-center justify-between">
                  <span>TANGGAL AKTA PENDIRIAN</span>
                  {renderProfileSortArrows('establishmentDeedDate')}
                </div>
              </th>
              <th
                className="p-4 border-r border-slate-200 cursor-pointer hover:bg-slate-100/80 transition-colors"
                onClick={() => handleProfileSort('updatedAt')}
              >
                <div className="flex items-center justify-between">
                  <span>TERAKHIR DIUBAH</span>
                  {renderProfileSortArrows('updatedAt')}
                </div>
              </th>
              <th className="p-4 text-center w-16">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedProfileResults.map((p, idx) => {
              const currentNo = profileStartIndex + idx + 1;
              const city = p.domicile || p.newAddress?.city || '-';
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
                  className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setEditingProfileId(p.id);
                    setIsProfilePreview(true);
                    updateData({ ...INITIAL_STATE, ...p } as any);
                  }}
                >
                  <td className="p-4 font-bold text-center border-r border-slate-100 text-slate-500 w-12">
                    {currentNo}
                  </td>
                  <td className="p-4 font-bold text-slate-800 border-r border-slate-100 uppercase tracking-tight">
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={p.companyName || ''} />
                      <span>{formatCompanyName(p.companyName, p.clientType)}</span>
                    </div>
                    {p.kbliItems && p.kbliItems.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                        <span
                          className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-1 py-0.5 rounded leading-none shrink-0"
                          style={{ color: '#3b5998', backgroundColor: '#eef2f7' }}
                        >
                          KBLI:
                        </span>
                        {p.kbliItems.map((item) => (
                          <span
                            key={item.id || item.code}
                            className="text-[9px] font-mono font-bold bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 leading-none"
                            title={item.name}
                          >
                            {item.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-4 border-r border-slate-100">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 border-r border-slate-100 uppercase font-medium">
                    {city}
                  </td>
                  <td className="p-4 text-slate-600 border-r border-slate-100 uppercase font-medium">
                    {deedDate}
                  </td>
                  <td className="p-4 text-slate-500 border-r border-slate-100 text-[11px] font-mono">
                    {lastUpdated}
                  </td>
                  <td
                    className="p-4 text-center relative border-r border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === p.id ? null : p.id);
                        }}
                        className={`p-1.5 rounded-md border border-slate-200/45 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-500 hover:text-slate-800 transition-all shadow-sm ${
                          openDropdownId === p.id
                            ? 'opacity-100 bg-slate-50'
                            : 'opacity-100 sm:opacity-0 group-hover:opacity-100'
                        }`}
                        title="Pilihan Aksi"
                      >
                        <MoreHorizontal className="w-[18px] h-[18px] stroke-[2.25px]" />
                      </button>
                    </div>

                    {/* Dropdown popup portal */}
                    {openDropdownId === p.id && (
                      <div className="absolute right-4 top-13 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 w-40 z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            setEditingProfileId(p.id);
                            setIsProfilePreview(true);
                            updateData({ ...INITIAL_STATE, ...p } as any);
                          }}
                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-450 stroke-[2.25px] shrink-0" />
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
                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-450 stroke-[2.25px] shrink-0" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            handleDuplicateProfile(p);
                          }}
                          className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide border-b border-slate-100"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-450 stroke-[2.25px] shrink-0" />
                          <span>Duplikat</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                            handleArchiveProfile(p);
                          }}
                          className={`w-full px-3.5 py-2 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2 uppercase tracking-wide ${
                            p.isArchived
                              ? 'text-emerald-700 hover:bg-emerald-50/60'
                              : 'text-orange-700 hover:bg-orange-50/60'
                          }`}
                        >
                          {p.isArchived ? (
                            <>
                              <Undo className="w-3.5 h-3.5 text-emerald-500 stroke-[2.25px] shrink-0" />
                              <span>Pulihkan</span>
                            </>
                          ) : (
                            <>
                              <Archive className="w-3.5 h-3.5 text-orange-500 stroke-[2.25px] shrink-0" />
                              <span>Arsipkan</span>
                            </>
                          )}
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

      {/* Pagination block */}
      {totalProfilePages > 1 && (
        <div className="px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8fafc]">
          <div className="text-[12px] text-slate-500 font-medium">
            Halaman <span className="text-slate-800 font-bold">{profileCurrentPage}</span> dari{' '}
            <span className="text-slate-800 font-bold">{totalProfilePages}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* First */}
            <button
              disabled={profileCurrentPage === 1}
              onClick={() => setProfileCurrentPage(1)}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
              title="Halaman Pertama"
            >
              «
            </button>
            {/* Prev */}
            <button
              disabled={profileCurrentPage === 1}
              onClick={() => setProfileCurrentPage(profileCurrentPage - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
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
                    className="w-8 h-8 flex items-center justify-center text-slate-400 text-[12px]"
                  >
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={`page-${page}`}
                  onClick={() => setProfileCurrentPage(Number(page))}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-[12px] font-bold transition-all ${
                    profileCurrentPage === page
                      ? 'bg-[#3b5998] text-white'
                      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
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
              className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
              title="Halaman Selanjutnya"
            >
              ›
            </button>
            {/* Last */}
            <button
              disabled={profileCurrentPage === totalProfilePages}
              onClick={() => setProfileCurrentPage(totalProfilePages)}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
              title="Halaman Terakhir"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default CompanyList;
