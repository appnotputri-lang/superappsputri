import React from 'react';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { AhuSection } from '../components/CompanyForm';
import { formatInputNumber } from '../../../../utils/formatters';

interface ShareholderSectionProps {
  data: any;
  updateData: (fields: any) => void;
  openShareholderEditor: (type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham', sh?: any, dismissalId?: string) => void;
  deleteShareholder: (id: string, type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham') => void;
}

export const ShareholderSection: React.FC<ShareholderSectionProps> = ({
  data,
  updateData,
  openShareholderEditor,
  deleteShareholder,
}) => {
  const isCv = data.companyType === 'CV';
  const shareholders = data.shareholders || [];

  if (isCv) {
    return (
      <AhuSection title="PESERO PENGURUS & KOMANDITER *">
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => openShareholderEditor('lama')} 
              className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Tambah Data
            </button>
          </div>
          <div className="border border-slate-200 overflow-x-auto rounded-sm bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                <tr>
                  <th className="p-2 border-r border-slate-200">Nama</th>
                  <th className="p-2 border-r border-slate-200">Status Pesero</th>
                  <th className="p-2 border-r border-slate-200">Jabatan</th>
                  <th className="p-2 border-r border-slate-200">Nilai Pemasukan (Modal)</th>
                  <th className="p-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shareholders.map((s: any) => (
                  <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                    <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                    <td className="p-2 border-r border-slate-200">
                      {s.managementPosition?.toUpperCase().includes('KOMANDITER') ? 'KOMANDITER' : 'PENGURUS (KOMPLEMENTER)'}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.managementPosition || (s.isManagement ? 'DIREKTUR' : 'PESERO')}</td>
                    <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber(s.sharesOwned || 0)}</td>
                    <td className="p-2 text-center text-blue-600 flex items-center justify-center gap-2">
                      <button onClick={() => openShareholderEditor('lama', s)} className="hover:underline flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> Edit
                      </button>
                      <span className="text-slate-300">|</span>
                      <button onClick={() => deleteShareholder(s.id, 'lama')} className="hover:underline text-red-500 flex items-center gap-0.5">
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </td>
                  </tr>
                ))}
                {shareholders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">Belum ada data pesero pengurus & komanditer.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="text-[13px] font-bold text-slate-800 space-y-1 uppercase">
            <div>TOTAL MODAL PENYERTAAN Rp {formatInputNumber(shareholders.reduce((sum: number, s: any) => sum + (s.sharesOwned || 0), 0))}</div>
          </div>
        </div>
      </AhuSection>
    );
  }

  // PT Shareholder Section
  const shareholdingMembers = shareholders.filter((s: any) => (s.sharesOwned || 0) > 0);

  return (
    <AhuSection title="PEMEGANG SAHAM LAMA *">
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => openShareholderEditor('lama')} 
            className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Tambah Data
          </button>
        </div>
        <div className="border border-slate-200 overflow-x-auto rounded-sm bg-white">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
              <tr>
                <th className="p-2 border-r border-slate-200">Nama Pemegang Saham</th>
                <th className="p-2 border-r border-slate-200">Klasifikasi Saham</th>
                <th className="p-2 border-r border-slate-200">Jumlah Lembar Saham</th>
                <th className="p-2 border-r border-slate-200">Total Nilai Saham</th>
                <th className="p-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {shareholdingMembers.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                  <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                  <td className="p-2 border-r border-slate-200">Tanpa Klasifikasi</td>
                  <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned || 0)}</td>
                  <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber((s.sharesOwned || 0) * (data.originalSharePrice || 0))}</td>
                  <td className="p-2 text-center text-blue-600 flex items-center justify-center gap-2">
                    <button onClick={() => openShareholderEditor('lama', s)} className="hover:underline flex items-center gap-0.5">
                      <Eye className="w-3 h-3" /> Edit
                    </button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => deleteShareholder(s.id, 'lama')} className="hover:underline text-red-500 flex items-center gap-0.5">
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {shareholdingMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400 italic">Belum ada data pemegang saham lama.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[13px] font-bold text-slate-800 space-y-1 uppercase">
          <div>TOTAL LEMBAR SAHAM {formatInputNumber(shareholders.reduce((sum: number, s: any) => sum + (s.sharesOwned || 0), 0))}</div>
          <div>TOTAL MODAL DITEMPATKAN DAN DISETOR Rp {formatInputNumber(shareholders.reduce((sum: number, s: any) => sum + (s.sharesOwned || 0), 0) * (data.originalSharePrice || 0))}</div>
          {shareholders.reduce((sum: number, s: any) => sum + (s.sharesOwned || 0), 0) < (data.originalTotalShares || 0) && (
            <div className="text-red-500 font-normal text-xs normal-case mt-1 bg-red-50 p-2 rounded border border-red-100">
              * Total lembar saham ({formatInputNumber(shareholders.reduce((sum: number, s: any) => sum + (s.sharesOwned || 0), 0))}) kurang dari Modal Ditempatkan & Disetor Lama ({formatInputNumber(data.originalTotalShares || 0)} lembar)
            </div>
          )}
        </div>
      </div>
    </AhuSection>
  );
};
