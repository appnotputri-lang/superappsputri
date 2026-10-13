import React from 'react';
import { db } from '../../../lib/firebase';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../lib/firebase';
import { sanitizeForFirestore } from '../../../utils/sanitize';
import { ProjectService } from '../../../services/ProjectService';
import { compareCompanyDocumentDiff } from '../../../lib/diffUtils';
import { DocumentGenerationService } from '../../../services/DocumentGenerationService';
import DraftAktaPendirian from '../../../DraftAktaPendirian';
import DraftAktaPendirianCV from '../../../DraftAktaPendirianCV';
import PendirianList from '../../../components/PendirianList';
import { INITIAL_STATE } from '../../../domain/company/initialCompanyData';
import { ArrowRight, Save, Loader2, Trash2 } from 'lucide-react';

export interface PendirianPageProps {
  user: any;
  userProfile: any;
  profiles: any[];
  editingPendirianId: string | null;
  setEditingPendirianId: (id: string | null) => void;
  activeProjectContext: string | null;
  setActiveProjectContext: (id: string | null) => void;
  projects: any[];
  rupstProjects: any[];
  pendirianProjects: any[];
  isSaving: boolean;
  setIsSaving: (s: boolean) => void;
  isSyncing: boolean;
  handleManualSync: (type: string, data: any) => Promise<boolean>;
  setCurrentPendirianData: (data: any) => void;
  currentPendirianData: any;
  AutoSaveIndicatorComponent: React.ComponentType;
  recordNotification: (title: string, desc: string, type: string) => void;
  setSelectedProjectId: (id: string | null) => void;
  setActiveSidebarTab: (tab: any) => void;
  setPendirianPreviewData: (data: any) => void;
  setShowPendirianPreview: (show: boolean) => void;
  handlePendirianExportWord: (data: any) => Promise<void>;
  pendirianPreset: any;
  updateData: (data: any) => void;
}

export const PendirianPage: React.FC<PendirianPageProps> = ({
  user,
  userProfile,
  profiles,
  editingPendirianId,
  setEditingPendirianId,
  activeProjectContext,
  setActiveProjectContext,
  projects,
  rupstProjects,
  pendirianProjects,
  isSaving,
  setIsSaving,
  isSyncing,
  handleManualSync,
  setCurrentPendirianData,
  currentPendirianData,
  AutoSaveIndicatorComponent,
  recordNotification,
  setSelectedProjectId,
  setActiveSidebarTab,
  setPendirianPreviewData,
  setShowPendirianPreview,
  handlePendirianExportWord,
  pendirianPreset,
  updateData
}) => {
  const editingData = editingPendirianId === 'new' ? pendirianPreset : pendirianProjects.find(p => p.id === editingPendirianId) as any;
  const isCVData = Boolean(editingData && (editingData.namaCV || editingData.peseros || editingData.jobType === 'pendirian_cv'));

  const handleSaveData = async (dataToSave: any) => {
    setIsSaving(true);
    if (!user) {
      setIsSaving(false);
      return alert('Anda harus login terlebih dahulu!');
    }
    
    const id = editingPendirianId === 'new' ? crypto.randomUUID() : editingPendirianId;
    const isNewPendirian = editingPendirianId === 'new';
    
    const finalData = {
      ...dataToSave,
      id,
      jobType: isCVData ? 'pendirian_cv' : (dataToSave.jobType || 'pendirian_pt'),
      updatedAt: new Date().toISOString()
    };

    try {
      let changes: any[] = [];
      if (!isNewPendirian && id) {
        try {
          const oldSnap = await getDoc(doc(db, 'pendirian_projects', id));
          if (oldSnap.exists()) {
            changes = compareCompanyDocumentDiff(oldSnap.data(), finalData);
          }
        } catch (err) {
          console.warn("Gagal mengambil data lama Pendirian untuk diffing:", err);
        }
      }

      await setDoc(doc(db, 'pendirian_projects', id), sanitizeForFirestore(finalData));
       
      let driveSuccess = false;
      if (activeProjectContext) {
        try {
          await ProjectService.addDocument(activeProjectContext, {
            name: isCVData 
              ? `Draft Pendirian CV - ${finalData.namaCV || 'CV Baru'}`
              : `Draft Pendirian PT - ${finalData.namaPt || 'PT Baru'}`,
            type: 'docx',
            url: `/pendirian`,
            refId: id,
            uploadedBy: user?.email || 'staff_notaris',
            changes: changes.length > 0 ? changes : undefined
          });

          await DocumentGenerationService.generateAndUploadAllForProject(
            activeProjectContext,
            finalData,
            user?.email,
            userProfile?.name
          );
          driveSuccess = true;
        } catch (uploadErr: any) {
          console.error("Drive upload failed:", uploadErr);
          driveSuccess = false;
        }
      }

      if (finalData.nomorAkta && finalData.tanggal) {
        await handleManualSync('PENDIRIAN', finalData);
      }

      recordNotification(
        isNewPendirian ? (isCVData ? 'Pendirian CV Baru Dibuat' : 'Pendirian PT Baru Dibuat') : (isCVData ? 'Pendirian CV Diubah' : 'Pendirian PT Diubah'),
        `Data Pendirian ${isCVData ? 'CV' : 'PT'} "${isCVData ? (finalData.namaCV || 'CV') : (finalData.namaPt || 'PT Baru')}" telah ${isNewPendirian ? 'berhasil didaftarkan' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
        isNewPendirian ? 'create_pendirian' : 'update_pendirian'
      );

      const returnToProjectId = activeProjectContext;
      setEditingPendirianId(null);
      setActiveProjectContext(null);

      if (activeProjectContext) {
        if (driveSuccess) {
          alert('✅ Data berhasil disimpan dan dokumen berhasil diperbarui di Google Drive.');
        } else {
          alert('⚠️ Data berhasil disimpan ke database (Firestore), namun proses unggah ke Google Drive gagal atau tidak dijalankan.');
        }
      } else {
        alert('✅ Data pendirian berhasil disimpan sebagai draft.');
      }

      if (returnToProjectId) {
        setSelectedProjectId(returnToProjectId);
        setActiveSidebarTab('project_detail');
      }
    } catch (e: any) {
      console.error("Save & Generate failed:", e);
      alert('Gagal menyimpan atau memperbarui dokumen: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteData = async (idToDel: string) => {
    if (userProfile?.role !== 'Super Admin') return alert('Hanya Super Admin yang dapat menghapus proyek!');
    if (confirm('Apakah Anda yakin ingin menghapus data pendirian ini?')) {
      try {
        await deleteDoc(doc(db, 'pendirian_projects', idToDel));
        recordNotification(
          isCVData ? 'Pendirian CV Dihapus' : 'Pendirian PT Dihapus',
          `Data Pendirian telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
          'delete_pendirian'
        );
        setEditingPendirianId(null);
        setActiveProjectContext(null);
        alert('Data pendirian berhasil dihapus!');
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `pendirian_projects/${idToDel}`);
      }
    }
  };

  if (!editingPendirianId) {
    return (
      <PendirianList 
        onEdit={(rec) => {
          setEditingPendirianId(rec.id);
          updateData({ ...INITIAL_STATE, ...rec } as any);
        }}
        onAdd={() => {
          setEditingPendirianId('new');
          updateData({ ...INITIAL_STATE } as any);
        }}
        onDownload={(rec) => {
          handlePendirianExportWord({ ...INITIAL_STATE, ...rec } as any);
        }}
      />
    );
  }

  const handleBack = () => {
    const returnToProjectId = activeProjectContext;
    setEditingPendirianId(null);
    setActiveProjectContext(null);
    if (returnToProjectId) {
      setSelectedProjectId(returnToProjectId);
      setActiveSidebarTab('project_detail');
    }
  };

  return (
    <div className="w-[94%] xl:w-[92%] max-w-none mx-auto space-y-4 pb-6 px-2 sm:px-4 py-4">
      {/* RUPS LB PATTERN ACTION BAR */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* LEFT GROUP */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button 
              type="button"
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-[12.5px] uppercase h-10 px-4 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              onClick={handleBack}
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
            </button>

            <button 
              type="button"
              className="bg-[#3b5998] hover:bg-[#2d4373] text-white font-semibold text-[12px] uppercase h-10 px-4 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer" 
              onClick={async () => {
                const success = await handleManualSync('PENDIRIAN', currentPendirianData || editingData);
                if (success) {
                  alert("Berhasil disimpan ke laporan!");
                }
              }}
              disabled={isSyncing}
            >
              {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Simpan ke Laporan</span>
            </button>
            
            <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1"></div>
            <AutoSaveIndicatorComponent />
          </div>

          {/* RIGHT GROUP */}
          <div className="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end">
            <button 
              type="button"
              onClick={() => updateData({ ...INITIAL_STATE })} 
              className="bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200 font-semibold text-[12px] uppercase h-10 px-4 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              RISET
            </button>
            <button 
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveData(currentPendirianData || editingData)} 
              className="bg-[#1b449c] hover:bg-[#13327d] text-white font-bold text-[12.5px] uppercase h-10 px-5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>MENYIMPAN...</span>
                </>
              ) : (
                <span>{isCVData ? 'SIMPAN PENDIRIAN CV' : 'SIMPAN PENDIRIAN PT'}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* COMPONENT CONTENT */}
      {isCVData ? (
        <DraftAktaPendirianCV 
          profiles={profiles}
          initialData={editingData}
          projectName={((projects.find(p => p.id === activeProjectContext) as any) || (rupstProjects.find(p => p.id === activeProjectContext) as any) || (pendirianProjects.find(p => p.id === activeProjectContext) as any))?.title}
          activeProjectContext={activeProjectContext}
          isSaving={isSaving}
          isSyncing={isSyncing}
          onSync={async (finalData) => {
            const success = await handleManualSync('PENDIRIAN', finalData);
            if (success) {
              alert("Berhasil disimpan ke laporan!");
            }
          }}
          onChange={setCurrentPendirianData}
          autoSaveIndicator={<AutoSaveIndicatorComponent />}
          onSave={handleSaveData}
          onCancel={handleBack}
          onDelete={handleDeleteData}
          onShowPreview={(d) => {
            setPendirianPreviewData(d); 
            setShowPendirianPreview(true); 
          }}
          onExportWord={async (d) => {
            try {
              const { generatePendirianCVDocx } = await import('../../../lib/generatePendirianCVDocx');
              await generatePendirianCVDocx(d);
            } catch (e: any) {
              alert('Gagal export dokumen CV: ' + e.message);
            }
          }}
        />
      ) : (
        <DraftAktaPendirian 
          profiles={profiles}
          initialData={editingData}
          projectName={((projects.find(p => p.id === activeProjectContext) as any) || (rupstProjects.find(p => p.id === activeProjectContext) as any) || (pendirianProjects.find(p => p.id === activeProjectContext) as any))?.title}
          activeProjectContext={activeProjectContext}
          isSaving={isSaving}
          isSyncing={isSyncing}
          onSync={async (finalData) => {
            const success = await handleManualSync('PENDIRIAN', finalData);
            if (success) {
              alert("Berhasil disimpan ke laporan!");
            }
          }}
          onChange={setCurrentPendirianData}
          autoSaveIndicator={<AutoSaveIndicatorComponent />}
          onSave={handleSaveData}
          onCancel={handleBack}
          onDelete={handleDeleteData}
          onShowPreview={(d) => {
            const mapped = {
              ...d,
              modalDasar: (d.modalDasarLembar && d.nilaiPerLembar) ? (d.modalDasarLembar * d.nilaiPerLembar) : d.modalDasar,
              modalDisetorPersen: (d.modalDisetorLembar && d.modalDasarLembar) ? ((d.modalDisetorLembar / d.modalDasarLembar) * 100) : d.modalDisetorPersen,
            };
            setPendirianPreviewData(mapped); 
            setShowPendirianPreview(true); 
          }}
          onExportWord={(d) => { handlePendirianExportWord(d); }}
        />
      )}
    </div>
  );
};

export default PendirianPage;
