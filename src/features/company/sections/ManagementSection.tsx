import React from 'react';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { AhuSection } from '../components/CompanyForm';

interface ManagementSectionProps {
  data: any;
  updateData: (fields: any) => void;
  openShareholderEditor: (type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham', sh?: any, dismissalId?: string) => void;
  deleteShareholder: (id: string, type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham') => void;
}

export const ManagementSection: React.FC<ManagementSectionProps> = ({
  data,
  updateData,
  openShareholderEditor,
  deleteShareholder,
}) => {
  const isCv = data.companyType === 'CV';
  if (isCv) {
    // For CV, both shareholders and managers are combined in one table (Pesero Pengurus & Komanditer), so we don't render a separate management section.
    return null;
  }

  const shareholders = data.shareholders || [];
  const managementMembers = shareholders.filter((s: any) => s.isManagement || s.managementPosition);

  return (
    <AhuSection title="SUSUNAN DIREKSI DAN KOMISARIS LAMA">
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => openShareholderEditor('lama')} 
            className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Tambah Data Pengurus
          </button>
        </div>
        <div className="border border-slate-200 overflow-x-auto rounded-sm bg-white">
          <table className="min-w-[600px] w-full text-left text-[11px]">
            <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
              <tr>
                <th className="p-2 border-r border-slate-200">Nama Pengurus</th>
                <th className="p-2 border-r border-slate-200">Jabatan</th>
                <th className="p-2 border-r border-slate-200">Pemegang Saham?</th>
                <th className="p-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {managementMembers.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                  <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                  <td className="p-2 border-r border-slate-200 font-bold text-slate-700 uppercase">{s.managementPosition || 'DIREKTUR'}</td>
                  <td className="p-2 border-r border-slate-200 uppercase">{(s.sharesOwned || 0) > 0 ? 'YA' : 'TIDAK'}</td>
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
              {managementMembers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400 italic">Belum ada data pengurus (Direksi / Komisaris) lama.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AhuSection>
  );
};
