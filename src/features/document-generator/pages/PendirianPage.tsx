import React from 'react';
import { db } from '../../../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../lib/firebase';
import { sanitizeForFirestore } from '../../../utils/sanitize';
import { ProjectService } from '../../../services/ProjectService';
import { DocumentGenerationService } from '../../../services/DocumentGenerationService';
import DraftAktaPendirian from '../../../DraftAktaPendirian';
import PendirianList from '../../../components/PendirianList';
import { INITIAL_STATE } from '../../../domain/company/initialCompanyData';

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
  return (
    editingPendirianId ? (
      <DraftAktaPendirian 
        profiles={profiles}
        initialData={editingPendirianId === 'new' ? pendirianPreset : pendirianProjects.find(p => p.id === editingPendirianId) as any}
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
        onSave={async (pendirianData) => {
          setIsSaving(true);
          if (!user) {
            setIsSaving(false);
            return alert('Anda harus login terlebih dahulu!');
          }
          
          const id = editingPendirianId === 'new' ? crypto.randomUUID() : editingPendirianId;
          const finalData = {
            ...pendirianData,
            id,
            updatedAt: new Date().toISOString()
          };

          try {
            const isNewPendirian = editingPendirianId === 'new';
             await setDoc(doc(db, 'pendirian_projects', id), sanitizeForFirestore(finalData));
             
             if (activeProjectContext) {
               await ProjectService.addDocument(activeProjectContext, {
                 name: `Draft Pendirian PT - ${finalData.namaPt || 'PT Baru'}`,
                 type: 'docx',
                 url: `/pendirian`,
                 refId: id,
                 uploadedBy: user?.email || 'staff_notaris'
               });

               await DocumentGenerationService.generateAndUploadAllForProject(
                 activeProjectContext,
                 finalData,
                 user?.email,
                 userProfile?.name
               );
             }

             // Sync to Utama
             if (finalData.nomorAkta && finalData.tanggal) {
               await handleManualSync('PENDIRIAN', finalData);
             }

             recordNotification(
               isNewPendirian ? 'Pendirian PT Baru Dibuat' : 'Pendirian PT Diubah',
               `Data Pendirian PT untuk perusahaan "${finalData.namaPt || 'PT Baru'}" telah ${isNewPendirian ? 'berhasil didaftarkan' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
               isNewPendirian ? 'create_pendirian' : 'update_pendirian'
             );
            const returnToProjectId = activeProjectContext;
            setEditingPendirianId(null);
            setActiveProjectContext(null);
            alert('✅ Data berhasil disimpan dan dokumen berhasil diperbarui.');
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
        }}
        onCancel={() => {
          setEditingPendirianId(null);
          setActiveProjectContext(null);
        }}
        onDelete={async (id) => {
          if (userProfile?.role !== 'Super Admin') return alert('Hanya Super Admin yang dapat menghapus proyek!');
          if (confirm('Apakah Anda yakin ingin menghapus data pendirian ini?')) {
            try {
              await deleteDoc(doc(db, 'pendirian_projects', id));
              recordNotification(
                'Pendirian PT Dihapus',
                `Data Pendirian PT untuk perusahaan "${currentPendirianData?.namaPt || 'PT'}" telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
                'delete_pendirian'
              );
              setEditingPendirianId(null);
              setActiveProjectContext(null);
              alert('Data pendirian berhasil dihapus!');
            } catch (e) {
              handleFirestoreError(e, OperationType.DELETE, `pendirian_projects/${id}`);
            }
          }
        }}
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
    ) : (
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
    )
  );
};

export default PendirianPage;
