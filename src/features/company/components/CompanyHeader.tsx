import React from 'react';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageLayout';
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
    <PageHeader
      icon={<Building2 className="w-5 h-5 text-white" />}
      title="Klien"
      description="Kelola daftar profil klien badan usaha untuk digunakan pada notulen, akta, dan proyek"
      actions={
        !editingProfileId ? (
          <div className="flex flex-wrap items-center gap-2">
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
              className="bg-[#0c2444] hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all uppercase shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> TAMBAH KLIEN
            </button>
          </div>
        ) : undefined
      }
    />
  );
};

export default CompanyHeader;

