import React from 'react';
import { Building2, Plus, RefreshCw, Users } from 'lucide-react';
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
    <div className="bg-white px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0c2444] shrink-0 shadow-xs">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight font-heading uppercase flex items-center gap-2 leading-none">
            KLIEN
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Kelola daftar profil klien badan usaha untuk digunakan pada notulen, akta, dan proyek
          </p>
        </div>
      </div>
      {!editingProfileId && (
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
          {onSyncDrive && (
            <button
              onClick={onSyncDrive}
              disabled={isSyncing}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all uppercase shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'MENCOCOKAN...' : 'COCOKAN DRIVE'}
            </button>
          )}
          <button
            onClick={() => {
              setEditingProfileId('new');
              setIsProfilePreview(false);
              updateData({ ...INITIAL_STATE } as any);
            }}
            className="bg-[#0c2444] hover:bg-[#1890ff] text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all uppercase shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> TAMBAH KLIEN
          </button>
        </div>
      )}
    </div>
  );
};
export default CompanyHeader;

