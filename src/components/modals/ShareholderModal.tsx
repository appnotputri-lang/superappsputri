import React from 'react';
import { Modal } from '../../../components/Modal';
import ShareholderEditor from "../editors/ShareholderEditor";
import { Loader2 } from 'lucide-react';

interface ShareholderModalProps {
  editingShareholder: any | null;
  setEditingShareholder: (sh: any | null) => void;
  editMode: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham' | null;
  setEditMode: (mode: any) => void;
  data: any;
  currentTargetSharesPaid: number;
  saveShareholder: (s: any) => void;
  profiles?: any[];
  excludeCompanyIdOrName?: string;
  globalSharePrice?: number;
}

export const ShareholderModal: React.FC<ShareholderModalProps> = ({
  editingShareholder,
  setEditingShareholder,
  editMode,
  setEditMode,
  data,
  currentTargetSharesPaid,
  saveShareholder,
  profiles,
  excludeCompanyIdOrName,
  globalSharePrice
}) => {
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    if (!editingShareholder || isSaving) return;
    setIsSaving(true);
    try {
      await saveShareholder(editingShareholder);
    } catch (err) {
      console.error('Error saving shareholder:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(editingShareholder)}
      onClose={() => { if (!isSaving) { setEditingShareholder(null); setEditMode(null); } }}
      title={editingShareholder?.isOtherParty ? "Formulir Lengkap Pihak Lain" : editMode === 'pengganti' ? "Formulir Lengkap Pengganti / Pengurus Baru" : editMode === 'pengganti_saham' ? "Formulir Lengkap Penerima Peralihan Saham Baru" : "Tambah Pemegang Saham, Komisaris dan Direksi"}
      maxWidth="max-w-3xl"
      headerColor="bg-white text-slate-800 border-b border-slate-200"
      footer={
        <div className="flex justify-end gap-3">
          <button 
            type="button" 
            disabled={isSaving} 
            onClick={() => { setEditingShareholder(null); setEditMode(null); }} 
            className="px-6 py-2.5 border border-slate-300 bg-white text-slate-700 rounded-lg font-bold text-xs sm:text-sm hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
          >
            BATAL
          </button>
          <button 
            type="button" 
            disabled={isSaving} 
            onClick={handleSave} 
            className="px-7 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSaving ? "MENYIMPAN DATA..." : "SIMPAN DATA"}</span>
          </button>
        </div>
      }
    >
      {editingShareholder && (
        <ShareholderEditor 
          shareholder={editingShareholder}
          onChange={(updates: any) => {
            setEditingShareholder((prev: any) => ({
              ...(prev || editingShareholder),
              ...updates
            }));
          }}
          globalSharePrice={globalSharePrice !== undefined ? globalSharePrice : (data?.originalSharePrice || data?.nilaiPerLembar || 0)}
          totalSharesAllowed={editMode === 'lama' ? data.originalTotalShares : (data.resolutions?.capitalPaid || data.resolutions?.capitalPaidDecrease ? currentTargetSharesPaid : data.originalTotalShares)}
          otherAllocated={(editMode === 'lama' ? (data.shareholders || []) : (data.finalShareholders || []))
            .filter((s: any) => s.id !== editingShareholder.id)
            .reduce((sum: number, s: any) => {
              let shares = s.sharesOwned;
              if (editMode === 'baru' && editingShareholder.isAcquisition && (editingShareholder.acquisitionSourceId === s.id || (s.linkedPartyId && editingShareholder.acquisitionSourceId === s.linkedPartyId))) {
                shares = Math.max(0, shares - (editingShareholder.acquisitionShares || 0));
              }
              return sum + shares;
            }, 0)
          }
          existingData={editMode === 'lama' ? [] : [
            ...(data.shareholders || []),
            ...(data.oldManagementItems || []).filter((m: any) => !(data.shareholders || []).some((s: any) => (s.name || '').toUpperCase() === (m.name || '').toUpperCase()))
          ]}
          oldSharesOwned={(data.shareholders || []).find((s: any) => (s.name || '').trim().toUpperCase() === (editingShareholder.name || '').trim().toUpperCase())?.sharesOwned || 0}
          isOld={editMode === 'lama' || editMode === 'pengganti' || editMode === 'pengganti_saham'}
          hasTransferAgenda={(editMode === 'pengganti' || editMode === 'pengganti_saham') ? false : data.resolutions?.shareholders}
          hasManagementAgenda={(editMode === 'pengganti' || editMode === 'pengganti_saham') ? true : data.resolutions?.management}
          hasCapitalChange={(editMode === 'pengganti' || editMode === 'pengganti_saham') ? false : (data.resolutions?.capitalBase || data.resolutions?.capitalPaid || data.resolutions?.capitalBaseDecrease || data.resolutions?.capitalPaidDecrease)}
          hideFinancials={Boolean(editingShareholder?.isOtherParty) || editMode === 'pengganti' || editMode === 'pengganti_saham' || editMode === 'baru'}
          hideManagement={Boolean(editingShareholder?.isOtherParty) || editMode === 'baru'}
          availableParties={(editMode === 'pengganti' || editMode === 'pengganti_saham' || editMode === 'baru') ? data.shareholders : undefined}
          profiles={profiles}
          excludeCompanyIdOrName={excludeCompanyIdOrName || data?.selectedProfileId || data?.id || data?.companyName}
        />
      )}
    </Modal>
  );
};
