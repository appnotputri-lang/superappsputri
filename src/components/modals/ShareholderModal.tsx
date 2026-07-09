import React from 'react';
import { Modal } from '../../../components/Modal';
import ShareholderEditor from "../editors/ShareholderEditor";

interface ShareholderModalProps {
  editingShareholder: any | null;
  setEditingShareholder: (sh: any | null) => void;
  editMode: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham' | null;
  setEditMode: (mode: any) => void;
  data: any;
  currentTargetSharesPaid: number;
  saveShareholder: () => void;
}

export const ShareholderModal: React.FC<ShareholderModalProps> = ({
  editingShareholder,
  setEditingShareholder,
  editMode,
  setEditMode,
  data,
  currentTargetSharesPaid,
  saveShareholder
}) => {
  return (
    <Modal
      isOpen={Boolean(editingShareholder)}
      onClose={() => { setEditingShareholder(null); setEditMode(null); }}
      title={editMode === 'pengganti' ? "Formulir Lengkap Pengganti / Pengurus Baru" : editMode === 'pengganti_saham' ? "Formulir Lengkap Penerima Peralihan Saham Baru" : "Tambah Pemegang Saham, Komisaris dan Direksi"}
      maxWidth="max-w-4xl"
      headerColor="bg-white text-slate-800 border-b border-slate-200"
    >
      <div className="p-0 flex flex-col h-full bg-slate-50">
        {editingShareholder && (
          <div className="p-6 overflow-y-auto">
            <ShareholderEditor 
              shareholder={editingShareholder}
              onChange={(updates: any) => setEditingShareholder({ ...editingShareholder, ...updates })}
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
              hideFinancials={editMode === 'pengganti' || editMode === 'pengganti_saham' || editMode === 'baru'}
              hideManagement={editMode === 'baru'}
              availableParties={(editMode === 'pengganti' || editMode === 'pengganti_saham' || editMode === 'baru') ? data.shareholders : undefined}
            />
          </div>
        )}
        <div className="mt-auto flex justify-end gap-3 p-4 px-6 border-t border-slate-200 bg-white sticky bottom-0 z-10 shrink-0">
          <button onClick={() => { setEditingShareholder(null); setEditMode(null); }} className="px-8 py-2 border border-slate-300 bg-white text-slate-700 rounded font-bold text-sm hover:bg-slate-50 transition-all">BATAL</button>
          <button onClick={saveShareholder} className="px-8 py-2 bg-[#40bdae] text-white rounded font-bold text-sm hover:bg-[#349c8f] transition-all shadow-sm">SIMPAN DATA</button>
        </div>
      </div>
    </Modal>
  );
};
