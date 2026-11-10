import React from 'react';
import { Users, Plus, Eye, Trash2, Info } from 'lucide-react';
import { formatInputNumber } from '../../utils/formatters';
import { useDocumentRuntime } from '../domain/company/useDocumentRuntime';
import { CorporateShareholderService } from '../services/CorporateShareholderService';

interface MeetingAttendanceTableProps {
  sectionTitle: string;
  presentLabel: string; // "Hadir?" atau "Terlibat?"
  markAllLabel: string; // "Tandai Semua Hadir" atau "Tandai Semua Terlibat"
  nameColumnLabel: string; // "Nama Pemegang Saham" atau "Nama Pihak"
  showAksiColumn?: boolean;
  onAddParticipant?: () => void;
  addParticipantLabel?: string;
  openShareholderEditor?: (mode: 'lama' | 'baru', shareholder?: any) => void;
  deleteShareholder?: (id: string, mode: 'lama' | 'baru') => void;
}

export const MeetingAttendanceTable: React.FC<MeetingAttendanceTableProps> = ({
  sectionTitle,
  presentLabel,
  markAllLabel,
  nameColumnLabel,
  showAksiColumn = false,
  onAddParticipant,
  addParticipantLabel,
  openShareholderEditor,
  deleteShareholder,
}) => {
  const { data, mergedData, updateData, setProxyModalOpenId } = useDocumentRuntime();
  const actualData = (mergedData || data) as any;
  const isCircular = actualData.rupstType === 'sirkuler' || actualData.documentType === 'CIRCULAR' || actualData.jobType === 'sirkuler' || actualData.jobType === 'sirkuler_rupslb';

  // Kumpulkan seluruh pengurus perseroan (dari oldManagementItems, newManagementItems, managementItems)
  const allManagementItems = React.useMemo(() => {
    const sourceMgmts: any[] = [
      ...(Array.isArray(actualData.oldManagementItems) ? actualData.oldManagementItems : []),
      ...(Array.isArray(actualData.newManagementItems) ? actualData.newManagementItems : []),
      ...(Array.isArray(actualData.managementItems) ? actualData.managementItems : []),
    ];
    return sourceMgmts;
  }, [actualData.oldManagementItems, actualData.newManagementItems, actualData.managementItems]);

  // Apabila RUPS LB memilih PKR LB (bukan sirkuler), kumpulkan pengurus yang belum ada di daftar shareholders (direksi/komisaris yang tidak memiliki saham)
  const missingManagementItems = React.useMemo(() => {
    if (isCircular) return [];
    const currentList = actualData.shareholders || [];
    const existingNames = new Set(
      currentList.map((s: any) => (s.name || '').trim().toUpperCase())
    );

    const results: any[] = [];
    allManagementItems.forEach((m: any) => {
      const rawName = (m.name || '').trim();
      if (!rawName) return;
      const key = rawName.toUpperCase();
      if (!existingNames.has(key)) {
        existingNames.add(key);
        results.push({
          id: m.id || `mgmt-${key.replace(/\s+/g, '_')}`,
          name: rawName,
          salutation: m.salutation || 'Tuan',
          nik: m.nik || '',
          position: m.position || 'Direktur',
          managementPosition: m.position || 'Direktur',
          isManagement: true,
          sharesOwned: 0,
          isPresent: m.isPresent !== undefined ? m.isPresent : true,
          isProxy: false,
          proxyData: undefined,
          isOtherParty: false,
          isNonShareholderManagement: true,
          address: m.address ? { ...m.address } : undefined,
          birthCity: m.birthCity || '',
          birthDate: m.birthDate || '',
          occupation: m.occupation || ''
        });
      }
    });

    return results;
  }, [isCircular, actualData.shareholders, allManagementItems]);

  // Sinkronkan ke actualData.shareholders agar pengurus tanpa saham otomatis tersimpan di data rapat PKR LB
  React.useEffect(() => {
    if (!isCircular && missingManagementItems.length > 0) {
      updateData({
        shareholders: [...(actualData.shareholders || []), ...missingManagementItems]
      });
    }
  }, [isCircular, missingManagementItems]);

  const isPihakLain = (s: any) => {
    if (s.isOtherParty) return true;
    const isMgmt = allManagementItems.some(
      (m: any) => (m.name || '').trim().toUpperCase() === (s.name || '').trim().toUpperCase()
    ) || s.isManagement;
    if (showAksiColumn && (Number(s.sharesOwned) || 0) <= 0 && !isMgmt) {
      return true;
    }
    return false;
  };

  const shareholders = React.useMemo(() => {
    let list = [...(actualData.shareholders || [])];
    if (!isCircular && missingManagementItems.length > 0) {
      list = [...list, ...missingManagementItems];
    }
    if (isCircular) {
      return list.filter((s: any) => (Number(s.sharesOwned) || 0) > 0 || isPihakLain(s));
    }
    return list;
  }, [isCircular, actualData.shareholders, missingManagementItems]);

  // Pastikan dalam mode sirkuler seluruh pemegang saham otomatis tercatat hadir (100% kuorum/persetujuan)
  React.useEffect(() => {
    if (isCircular && actualData?.shareholders && actualData.shareholders.length > 0) {
      const needsUpdate = actualData.shareholders.some((s: any) => !s.isPresent);
      if (needsUpdate) {
        const updated = actualData.shareholders.map((s: any) => ({
          ...s,
          isPresent: true
        }));
        updateData({ shareholders: updated });
      }
    }
  }, [isCircular, actualData?.shareholders?.length]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[12px] font-bold text-slate-500 flex items-center gap-2 uppercase">
          <Users className="w-3 h-3" /> {sectionTitle}
        </h4>
        <div className="flex items-center gap-2">
          {onAddParticipant && addParticipantLabel && (
            <button 
              type="button"
              onClick={onAddParticipant}
              className="text-[10px] bg-[#222d32] text-white px-3 py-1 rounded-sm hover:bg-black transition-colors font-bold shadow-sm uppercase flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> {addParticipantLabel}
            </button>
          )}
          {!isCircular && (
            <button 
              type="button"
              onClick={() => {
                const ids = new Set(shareholders.map(s => s.id));
                const newList = (actualData.shareholders || []).map((s: any) =>
                  ids.has(s.id) ? { ...s, isPresent: true } : s
                );
                updateData({ shareholders: newList });
              }}
              className="text-[10px] bg-[#3b5998] text-white px-3 py-1 rounded-sm hover:bg-black transition-colors font-bold shadow-sm uppercase cursor-pointer"
            >
              {markAllLabel}
            </button>
          )}
        </div>
      </div>
      <div className="border border-slate-200 rounded-sm overflow-x-auto">
        <table className="min-w-[750px] w-full text-left text-[11px]">
          <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
            <tr>
              <th className="p-2 border-r border-slate-200">{nameColumnLabel}</th>
              <th className="p-2 border-r border-slate-200 font-bold">Jumlah Saham</th>
              {!isCircular && <th className="p-2 border-r border-slate-200 text-center w-20 font-bold">{presentLabel}</th>}
              <th className="p-2 border-r border-slate-200 text-center w-28 font-bold">Dikuasakan?</th>
              <th className="p-2 border-r border-slate-200 text-center font-bold">Penerima Kuasa</th>
              {showAksiColumn && <th className="p-2 text-center w-24 font-bold">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {shareholders.map((s, idx) => {
              const isCorp = CorporateShareholderService.checkIsCorporateShareholder(s);
              const pihakLain = isPihakLain(s);
              const repName = s.guardianName || (s.isProxy && s.proxyData?.name) || '';
              const repPos = s.representativePosition || s.proxyData?.occupation || s.proxyData?.position || (isCorp ? 'Direktur' : 'Penerima Kuasa');
              const repSal = s.proxyData?.salutation || s.guardianSalutation || 'Tuan';

              const mgmtMatch = allManagementItems.find(
                (m: any) => (m.name || '').trim().toUpperCase() === (s.name || '').trim().toUpperCase()
              );
              const mgmtPos = s.managementPosition || s.position || (s.isManagement ? 'Pengurus' : '') || mgmtMatch?.position || '';
              const isZeroShares = (Number(s.sharesOwned) || 0) <= 0;

              return (
                <tr key={s.id ? `sh-${s.id}-${idx}` : `sh-idx-${idx}`} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="p-2 border-r border-slate-200 font-medium uppercase">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">
                        {s.salutation ? `${s.salutation} ` : ''}{s.name}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {isCorp && (
                          <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold text-[9px] rounded w-fit tracking-wide">
                            Badan Hukum (PT)
                          </span>
                        )}
                        {mgmtPos && (
                          <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[9px] rounded w-fit tracking-wide uppercase">
                            {mgmtPos}
                          </span>
                        )}
                        {!mgmtPos && pihakLain && (
                          <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px] rounded w-fit tracking-wide">
                            Pihak Lain
                          </span>
                        )}
                        {!mgmtPos && !pihakLain && (
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[9px] rounded w-fit tracking-wide">
                            Pemegang Saham
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-2 border-r border-slate-200 font-semibold">
                    {isZeroShares ? (
                      <span className="text-slate-400 text-[11px] font-normal italic">
                        - (Tidak memiliki saham)
                      </span>
                    ) : (
                      `${formatInputNumber(s.sharesOwned)} Saham`
                    )}
                  </td>
                  {!isCircular && (
                    <td className="p-2 text-center border-r border-slate-200">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer"
                        checked={s.isPresent !== false}
                        onChange={e => {
                          const isChecked = e.target.checked;
                          const newList = (actualData.shareholders || []).map((item: any) =>
                            item.id === s.id
                              ? {
                                  ...item,
                                  isPresent: isChecked,
                                  isProxy: isChecked ? (isCorp ? true : (pihakLain ? false : item.isProxy)) : false,
                                  proxyData: isChecked ? (pihakLain ? undefined : item.proxyData) : undefined
                                }
                              : item
                          );
                          updateData({ shareholders: newList });
                        }}
                      />
                    </td>
                  )}
                  <td className="p-2 text-center border-r border-slate-200">
                    {(isCircular || s.isPresent) && (
                      pihakLain ? (
                        <span className="text-slate-400 text-[11px]">-</span>
                      ) : isCorp ? (
                        <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold rounded">
                          Diwakili
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          className="w-4 h-4 cursor-pointer accent-orange-600"
                          checked={s.isProxy || false}
                          onChange={e => {
                            const newList = (actualData.shareholders || []).map((item: any) =>
                              item.id === s.id ? { ...item, isProxy: e.target.checked, proxyData: e.target.checked ? item.proxyData : undefined } : item
                            );
                            updateData({ shareholders: newList });
                          }}
                          title="Centang jika pemegang saham dikuasakan ke orang lain"
                        />
                      )
                    )}
                  </td>
                  <td className="p-2 text-center border-r border-slate-200">
                    {(isCircular || s.isPresent) && (
                      pihakLain ? (
                        <span className="text-slate-400 text-[10px]">-</span>
                      ) : (
                        (() => {
                          if (repName) {
                            return (
                              <div className="flex items-center justify-between gap-2 px-1">
                                <span className={`text-[11px] font-bold uppercase truncate px-2 py-0.5 rounded border ${
                                  isCorp
                                    ? 'text-blue-900 bg-blue-50 border-blue-200'
                                    : 'text-orange-900 bg-orange-50 border-orange-200'
                                }`}>
                                  {isCorp ? '🏢 ' : ''}{repSal} {repName} ({repPos})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProxyModalOpenId(s.id);
                                  }}
                                  className="text-[9px] text-blue-600 hover:underline whitespace-nowrap cursor-pointer font-bold ml-1"
                                >
                                  Ubah
                                </button>
                              </div>
                            );
                          }

                          if (isCorp) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = (actualData.shareholders || []).map((item: any) =>
                                    item.id === s.id ? { ...item, isProxy: true } : item
                                  );
                                  updateData({ shareholders: newList });
                                  setProxyModalOpenId(s.id);
                                }}
                                className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded transition-colors font-bold cursor-pointer shadow-xs"
                              >
                                + Pilih Wakil PT (Direksi/Komisaris)
                              </button>
                            );
                          }

                          if (s.isProxy) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setProxyModalOpenId(s.id);
                                }}
                                className="text-[10px] bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors font-bold cursor-pointer"
                              >
                                + Isi Data Kuasa
                              </button>
                            );
                          }

                          return <span className="text-slate-400 text-[10px]">-</span>;
                        })()
                      )
                    )}
                  </td>
                {showAksiColumn && (
                  <td className="p-2 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openShareholderEditor && openShareholderEditor('lama', s)}
                        className="p-1 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                        title="Edit data"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteShareholder && deleteShareholder(s.id, 'lama')}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
            {shareholders.length === 0 && (
              <tr>
                <td colSpan={isCircular ? (showAksiColumn ? 5 : 4) : (showAksiColumn ? 6 : 5)} className="p-4 text-center text-slate-400 italic">
                  {isCircular 
                    ? "Belum ada data pemegang saham. Silakan isi di bagian DATA PERSEROAN atau tambah pihak lain."
                    : "Belum ada data para pihak (pemegang saham, direksi, komisaris, atau pihak lain)."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isCircular && (
        <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-sm flex items-center gap-2 text-[11px] text-blue-800 font-medium">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Pada Keputusan Sirkuler (Pasal 91 UU PT), 100% pemegang saham wajib menyetujui dan menandatangani keputusan tanpa perlu mencentang kehadiran.
          </span>
        </div>
      )}
    </div>
  );
};

export default MeetingAttendanceTable;
