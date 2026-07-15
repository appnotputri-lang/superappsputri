import React from 'react';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import { CompanyHeaderProps } from '../types/company.types';

export const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  editingProfileId,
  setEditingProfileId,
  setIsProfilePreview,
  updateData,
  INITIAL_STATE,
  isCv,
  onSyncDrive,
  isSyncing,
}) => {
  return (
    <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
      <div>
        <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase">
          <Building2 className="w-5 h-5 text-[#3b5998]" /> Klien
        </h2>
        <p className="text-[12px] text-slate-500">
          Kelola daftar profil klien badan usaha untuk digunakan pada notulen, akta, dan proyek
        </p>
      </div>
      {!editingProfileId && (
        <div className="flex gap-2">
          {onSyncDrive && (
            <button
              onClick={onSyncDrive}
              disabled={isSyncing}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors uppercase shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'MENCOCOKAN...' : 'COCOKAN DRIVE'}
            </button>
          )}
          <button
            onClick={() => {
              setEditingProfileId('new');
              setIsProfilePreview(false);
              updateData({ ...INITIAL_STATE } as any);
            }}
            className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors uppercase shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> TAMBAH KLIEN
          </button>
        </div>
      )}
    </div>
  );
};
export default CompanyHeader;
