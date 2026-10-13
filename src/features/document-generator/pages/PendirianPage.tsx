import React, { useState, useMemo } from 'react';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../lib/firebase';
import { DocumentDraftService, UnifiedDraftItem } from '../../../services/DocumentDraftService';
import DraftAktaPendirian from '../../../DraftAktaPendirian';
import DraftAktaPendirianCV from '../../../DraftAktaPendirianCV';
import { DocumentDraftListView, DownloadOption } from '../components/DocumentDraftListView';
import { INITIAL_STATE } from '../../../domain/company/initialCompanyData';
import { Building2, ArrowLeft, Save, RefreshCw, ExternalLink, Eye, Printer, Loader2, CheckCircle2 } from 'lucide-react';

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
  pendirianPreset?: any;
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
  // Live listener to pendirian_projects to keep list instantly up to date
  const [livePendirianRecords, setLivePendirianRecords] = useState<any[]>([]);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'PT' | 'CV'>('PT');

  React.useEffect(() => {
    const q = query(collection(db, 'pendirian_projects'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach(d => {
        docs.push({ id: d.id, ...d.data() });
      });
      setLivePendirianRecords(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'pendirian_projects');
    });
    return () => unsub();
  }, []);

  const mergedRecords = useMemo(() => {
    const baseMap = new Map<string, any>();
    pendirianProjects.forEach(p => { if (p.id) baseMap.set(p.id, p); });
    livePendirianRecords.forEach(p => { if (p.id) baseMap.set(p.id, p); });
    return Array.from(baseMap.values());
  }, [pendirianProjects, livePendirianRecords]);

  // Unified items
  const unifiedDraftItems = useMemo(() => {
    return mergedRecords.map(rec => DocumentDraftService.mapToUnifiedDraft('pendirian', rec));
  }, [mergedRecords]);

  // When editing, find the target data
  const editingData = useMemo(() => {
    if (!editingPendirianId) return null;
    if (editingPendirianId === 'new') {
      return pendirianPreset || null;
    }
    return mergedRecords.find(p => p.id === editingPendirianId) || null;
  }, [editingPendirianId, pendirianPreset, mergedRecords]);

  const isCVData = Boolean(
    (editingData && (editingData.namaCV || editingData.peseros || editingData.jobType === 'pendirian_cv')) ||
    (editingPendirianId === 'new' && selectedDocType === 'CV')
  );

  // Common Save Handler using DocumentDraftService
  const handleSaveDraft = async (formPayload: any) => {
    setIsSaving(true);
    if (!user) {
      setIsSaving(false);
      return alert('Anda harus login terlebih dahulu!');
    }

    try {
      const isNew = editingPendirianId === 'new';
      const result = await DocumentDraftService.saveDraft(
        'pendirian',
        editingPendirianId,
        formPayload,
        user,
        userProfile,
        activeProjectContext
      );

      // Prevent duplicate draft creation on subsequent saves by updating active draft ID
      if (isNew && result.id) {
        setEditingPendirianId(result.id);
      }

      const entityName = formPayload.namaCV ? `CV. ${formPayload.namaCV}` : (formPayload.namaPt ? `PT. ${formPayload.namaPt}` : 'Perusahaan Baru');
      recordNotification(
        isNew ? 'Draft Pendirian Baru Dibuat' : 'Draft Pendirian Diperbarui',
        `Data Pendirian untuk "${entityName}" telah ${isNew ? 'berhasil dibuat' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
        isNew ? 'create_pendirian' : 'update_pendirian'
      );

      alert(`✅ Draft Pendirian berhasil disimpan.`);

      if (activeProjectContext) {
        const returnId = activeProjectContext;
        setEditingPendirianId(null);
        setActiveProjectContext(null);
        setSelectedProjectId(returnId);
        setActiveSidebarTab('project_detail');
      }
    } catch (e: any) {
      console.error('[PendirianPage] Error saving draft:', e);
      alert('Gagal menyimpan draft: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  // Sync to Drive Handler
  const handleSyncToDrive = async (draftId: string, payload: any) => {
    setIsDriveSyncing(true);
    try {
      const res = await DocumentDraftService.syncDraftToGoogleDrive(
        'pendirian',
        draftId,
        payload,
        user,
        userProfile,
        activeProjectContext
      );
      if (res.success) {
        alert('✅ Dokumen berhasil diunggah dan disinkronkan ke Google Drive!');
      } else {
        alert('Gagal sinkron ke Google Drive: ' + (res.error || 'Terjadi kesalahan'));
      }
    } catch (e: any) {
      alert('Gagal sinkron ke Google Drive: ' + e.message);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  // Delete Draft Handler
  const handleDeleteDraft = async (id: string, name?: string) => {
    try {
      await DocumentDraftService.deleteDraft('pendirian', id, user, userProfile);
      recordNotification(
        'Draft Pendirian Dihapus',
        `Data Pendirian "${name || 'Perusahaan'}" telah dihapus oleh ${user?.email || 'Admin'}.`,
        'delete_pendirian'
      );
      setEditingPendirianId(null);
      alert('✅ Draft pendirian berhasil dihapus.');
    } catch (e: any) {
      alert('Gagal menghapus draft: ' + (e.message || e));
    }
  };

  // Download options for Pendirian
  const getDownloadOptions = (item: UnifiedDraftItem): DownloadOption[] => {
    const isCV = item.documentTypeLabel.includes('CV');
    return [
      {
        label: isCV ? 'Akta Pendirian CV' : 'Akta Pendirian PT',
        subLabel: 'Format Dokumen Word (.docx)',
        format: isCV ? 'pendirian_cv' : 'pendirian_pt'
      }
    ];
  };

  const handleDownloadDoc = async (item: UnifiedDraftItem, format: string) => {
    try {
      const dataToExport = { ...INITIAL_STATE, ...item.rawData };
      if (format === 'pendirian_cv' || item.documentTypeLabel.includes('CV')) {
        const { generatePendirianCVDocx } = await import('../../../lib/generatePendirianCVDocx');
        await generatePendirianCVDocx(dataToExport);
      } else {
        await handlePendirianExportWord(dataToExport);
      }
    } catch (err: any) {
      alert('Gagal mengunduh dokumen: ' + err.message);
    }
  };

  // 1. LIST VIEW (Default state when not editing)
  if (!editingPendirianId) {
    return (
      <DocumentDraftListView
        title="PENDIRIAN PERSEROAN TERBATAS (PT) & CV"
        subtitle="Kelola draf dokumen akta pendirian PT dan CV, sinkronisasi Google Drive, dan unduhan file."
        icon={<Building2 className="w-6 h-6" />}
        badgeLabel="Modul Pendirian"
        items={unifiedDraftItems}
        onAdd={() => {
          setEditingPendirianId('new');
          setCurrentPendirianData(null);
          updateData({ ...INITIAL_STATE } as any);
        }}
        onEdit={(item) => {
          setEditingPendirianId(item.id);
          const fullData = { ...INITIAL_STATE, ...item.rawData };
          updateData(fullData as any);
          setCurrentPendirianData(fullData);
        }}
        onDelete={async (item) => {
          await handleDeleteDraft(item.id, item.companyName);
        }}
        onOpenDrive={(item) => {
          DocumentDraftService.openDriveDocument(item.driveFileId, item.driveFileUrl);
        }}
        onSyncDrive={async (item) => {
          await handleSyncToDrive(item.id, item.rawData);
        }}
        onDownload={handleDownloadDoc}
        downloadOptions={getDownloadOptions}
      />
    );
  }

  // 2. FORM VIEW (Create or Edit Draft)
  const isEditingExisting = editingPendirianId !== 'new';
  const currentCompanyName = editingData?.namaPt || editingData?.namaCV || editingData?.companyName || (isCVData ? 'CV Baru' : 'PT Baru');

  return (
    <div className="w-full bg-[#f8fafc] min-h-[calc(100vh-60px)] pb-12">
      {/* UNIFIED TOP ACTION BAR */}
      <div className="bg-white border-b border-slate-200/90 sticky top-0 z-30 px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* LEFT: BACK BUTTON & MODE BADGE */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingPendirianId(null);
                setActiveProjectContext(null);
              }}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer uppercase"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Daftar</span>
            </button>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${
                isEditingExisting 
                  ? 'bg-amber-100/80 text-amber-900 border border-amber-300' 
                  : 'bg-blue-100/80 text-blue-900 border border-blue-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isEditingExisting ? 'bg-amber-600' : 'bg-blue-600'}`} />
                {isEditingExisting ? `Mode: Edit Draft — ${currentCompanyName}` : `Mode: Buat Dokumen Baru (${isCVData ? 'CV' : 'PT'})`}
              </span>
            </div>

            <AutoSaveIndicatorComponent />
          </div>

          {/* RIGHT: ACTION BUTTONS */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* If new draft, option to toggle PT or CV */}
            {!isEditingExisting && (
              <div className="flex items-center border border-slate-300 rounded-lg p-0.5 bg-slate-100 text-xs font-bold mr-1">
                <button
                  type="button"
                  onClick={() => setSelectedDocType('PT')}
                  className={`px-3 py-1 rounded-md transition-all ${selectedDocType === 'PT' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Perseroan (PT)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDocType('CV')}
                  className={`px-3 py-1 rounded-md transition-all ${selectedDocType === 'CV' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  CV
                </button>
              </div>
            )}

            {/* Buka di Google Drive (if exists) */}
            {editingData?.driveFileId && (
              <button
                type="button"
                onClick={() => DocumentDraftService.openDriveDocument(editingData.driveFileId, editingData.driveFileUrl)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer uppercase shadow-2xs"
                title="Buka file draft di Google Drive"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka di Google Drive</span>
              </button>
            )}

            {/* Sinkronkan ke Google Drive */}
            {isEditingExisting && (
              <button
                type="button"
                disabled={isDriveSyncing}
                onClick={() => handleSyncToDrive(editingPendirianId, currentPendirianData || editingData)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer uppercase shadow-2xs disabled:opacity-50"
                title="Unggah atau perbarui file Word ke Google Drive"
              >
                {isDriveSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{editingData?.driveFileId ? 'Perbarui di Drive' : 'Upload ke Drive'}</span>
              </button>
            )}

            {/* Tombol Simpan Draft Utama */}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveDraft(currentPendirianData || editingData || {})}
              className="px-4 py-2 bg-[#1b449c] hover:bg-[#13327d] text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer uppercase hover:shadow disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Draft</span>
            </button>
          </div>
        </div>
      </div>

      {/* FORM CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
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
              if (success) alert("Berhasil disimpan ke laporan!");
            }}
            onChange={setCurrentPendirianData}
            autoSaveIndicator={<AutoSaveIndicatorComponent />}
            onSave={handleSaveDraft}
            onCancel={() => {
              setEditingPendirianId(null);
              setActiveProjectContext(null);
            }}
            onDelete={async (id) => {
              if (confirm('Apakah Anda yakin ingin menghapus data pendirian CV ini?')) {
                await handleDeleteDraft(id, editingData?.namaCV);
              }
            }}
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
              if (success) alert("Berhasil disimpan ke laporan!");
            }}
            onChange={setCurrentPendirianData}
            autoSaveIndicator={<AutoSaveIndicatorComponent />}
            onSave={handleSaveDraft}
            onCancel={() => {
              setEditingPendirianId(null);
              setActiveProjectContext(null);
            }}
            onDelete={async (id) => {
              if (confirm('Apakah Anda yakin ingin menghapus data pendirian ini?')) {
                await handleDeleteDraft(id, editingData?.namaPt);
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
        )}
      </div>
    </div>
  );
};

export default PendirianPage;
