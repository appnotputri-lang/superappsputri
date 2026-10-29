import React from 'react';
import { Plus, Eye, Trash2, Building2 } from 'lucide-react';
import { AhuSection } from '../components/CompanyForm';
import { formatInputNumber } from '../../../../utils/formatters';
import { CorporateShareholderService } from '../../../services/CorporateShareholderService';

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
            <table className="min-w-[600px] w-full text-left text-[11px]">
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
    <AhuSection title="PEMEGANG SAHAM">
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <button 
            type="button"
            onClick={() => openShareholderEditor('lama', {
              id: crypto.randomUUID(),
              shareholderType: 'BADAN_HUKUM',
              salutation: '',
              name: '',
              legalEntityType: 'PT Persekutuan Modal',
              sharesOwned: 0,
              address: { fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '', city: '', province: '', postalCode: '' }
            } as any)} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-4 h-4" /> + Tambah Pemegang Saham PT
          </button>
          <button 
            type="button"
            onClick={() => openShareholderEditor('lama')} 
            className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Perorangan
          </button>
        </div>
        <div className="border border-slate-200 overflow-x-auto rounded-sm bg-white">
          <table className="min-w-[600px] w-full text-left text-[11px]">
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
              {shareholdingMembers.map((s: any) => {
                const isCorp = CorporateShareholderService.checkIsCorporateShareholder(s);
                const repName = s.guardianName || (s.isProxy && s.proxyData?.name) || '';
                const repPos = s.representativePosition || s.proxyData?.occupation || s.proxyData?.position || 'Direktur';

                return (
                  <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                    <td className="p-2 border-r border-slate-200 font-bold uppercase">
                      <div className="flex flex-col">
                        <span className="text-slate-800">{s.name}</span>
                        {isCorp && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold text-[9px] rounded w-fit">
                              Badan Hukum (PT)
                            </span>
                            {repName && (
                              <span className="text-slate-500 font-normal text-[10px]">
                                • Wakil: <b className="uppercase">{repName}</b> ({repPos})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 border-r border-slate-200">Tanpa Klasifikasi</td>
                    <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned || 0)}</td>
                    <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber((s.sharesOwned || 0) * (data.originalSharePrice || 0))}</td>
                    <td className="p-2 text-center text-blue-600 flex items-center justify-center gap-2">
                      <button onClick={() => openShareholderEditor('lama', s)} className="hover:underline flex items-center gap-0.5 cursor-pointer">
                        <Eye className="w-3 h-3" /> Edit
                      </button>
                      <span className="text-slate-300">|</span>
                      <button onClick={() => deleteShareholder(s.id, 'lama')} className="hover:underline text-red-500 flex items-center gap-0.5 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
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
