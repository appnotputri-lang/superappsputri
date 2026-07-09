import React from 'react';
import { Users, Plus, Eye, Trash2 } from 'lucide-react';
import { formatInputNumber } from '../../utils/formatters';
import { useDocumentRuntime } from '../domain/company/useDocumentRuntime';

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
  const { data, updateData, setProxyModalOpenId } = useDocumentRuntime();
  const shareholders = data.shareholders || [];
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
          <button 
            type="button"
            onClick={() => {
              const newList = shareholders.map(s => ({ ...s, isPresent: true }));
              updateData({ shareholders: newList });
            }}
            className="text-[10px] bg-[#3b5998] text-white px-3 py-1 rounded-sm hover:bg-black transition-colors font-bold shadow-sm uppercase cursor-pointer"
          >
            {markAllLabel}
          </button>
        </div>
      </div>
      <div className="border border-slate-200 rounded-sm overflow-hidden">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
            <tr>
              <th className="p-2 border-r border-slate-200">{nameColumnLabel}</th>
              <th className="p-2 border-r border-slate-200 font-bold">Jumlah Saham</th>
              <th className="p-2 border-r border-slate-200 text-center w-20 font-bold">{presentLabel}</th>
              <th className="p-2 border-r border-slate-200 text-center w-28 font-bold">Dikuasakan?</th>
              <th className="p-2 border-r border-slate-200 text-center font-bold">Penerima Kuasa</th>
              {showAksiColumn && <th className="p-2 text-center w-24 font-bold">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {shareholders.map(s => (
              <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="p-2 border-r border-slate-200 font-medium uppercase">{s.name}</td>
                <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned)} Saham</td>
                <td className="p-2 text-center border-r border-slate-200">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={s.isPresent || false}
                    onChange={e => {
                      const newList = shareholders.map(item =>
                        item.id === s.id
                          ? { ...item, isPresent: e.target.checked, isProxy: e.target.checked ? item.isProxy : false, proxyData: e.target.checked ? item.proxyData : undefined }
                          : item
                      );
                      updateData({ shareholders: newList });
                    }}
                  />
                </td>
                <td className="p-2 text-center border-r border-slate-200">
                  {s.isPresent && (
                    <input
                      type="checkbox"
                      className="w-4 h-4 cursor-pointer accent-orange-600"
                      checked={s.isProxy || false}
                      onChange={e => {
                        const newList = shareholders.map(item =>
                          item.id === s.id ? { ...item, isProxy: e.target.checked, proxyData: e.target.checked ? item.proxyData : undefined } : item
                        );
                        updateData({ shareholders: newList });
                      }}
                      title="Centang jika pemegang saham dikuasakan ke orang lain"
                    />
                  )}
                </td>
                <td className="p-2 text-center border-r border-slate-200">
                  {s.isPresent && s.isProxy && (
                    s.proxyData?.name ? (
                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-[11px] font-bold text-slate-700 uppercase truncate">
                          {s.proxyData.salutation} {s.proxyData.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setProxyModalOpenId(s.id);
                          }}
                          className="text-[9px] text-blue-600 hover:underline whitespace-nowrap cursor-pointer"
                        >
                          Ubah
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setProxyModalOpenId(s.id);
                        }}
                        className="text-[10px] bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors font-bold cursor-pointer"
                      >
                        + Isi Data Kuasa
                      </button>
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
            ))}
            {shareholders.length === 0 && (
              <tr>
                <td colSpan={showAksiColumn ? 6 : 5} className="p-4 text-center text-slate-400 italic">
                  Belum ada data pemegang saham. Silakan isi di bagian DATA PERSEROAN atau tambah secara langsung.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MeetingAttendanceTable;
