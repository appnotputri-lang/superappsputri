const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/features/document-generator/pages/RUPSLBPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add live listener and unified draft items to RUPSLBPage if not yet present
const marker = 'const updateManualRep = (updates: any) => {';
const newHelperCode = `  const [liveProjects, setLiveProjects] = useState<any[]>([]);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'projects'));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(d => {
        loaded.push({ id: d.id, ...d.data() });
      });
      setLiveProjects(loaded);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'projects');
    });
    return () => unsub();
  }, []);

  const combinedProjects = useMemo(() => {
    const map = new Map<string, any>();
    (projects || []).forEach(p => { if (p.id) map.set(p.id, p); });
    liveProjects.forEach(p => { if (p.id) map.set(p.id, p); });
    return Array.from(map.values());
  }, [projects, liveProjects]);

  const unifiedRupslbDraftItems = useMemo(() => {
    return combinedProjects.map(p => DocumentDraftService.mapToUnifiedDraft('rupslb', p));
  }, [combinedProjects]);

  const uniqueRupslbYears = useMemo(() => {
    return Array.from(new Set(
      combinedProjects
        .map(p => p.signingDate ? new Date(p.signingDate).getFullYear().toString() : "")
        .filter(Boolean)
    )).sort((a, b) => Number(b) - Number(a));
  }, [combinedProjects]);
`;

if (!content.includes('unifiedRupslbDraftItems')) {
  content = content.replace(marker, newHelperCode + '\n' + marker);
}

// 2. Replace the whole return block so that when !editingProjectId, it returns DocumentDraftListView,
// and when editingProjectId is present, it renders the form with the standardized action bar.
const returnMarker = '  return (() => {';
const pullModalMarker = '{/* Tarik Data Klien Terbaru Modal */}';

const returnIdx = content.indexOf(returnMarker);
const pullModalIdx = content.indexOf(pullModalMarker);

if (returnIdx !== -1 && pullModalIdx !== -1) {
  const beforeReturn = content.substring(0, returnIdx);
  const afterPullModal = content.substring(pullModalIdx);

  // Extract the form content from inside editingProjectId ? (
  // The form starts after {/* ACTION BAR */} and ends before ) : (
  const formStartMarker = '{editingProjectId ? (';
  const formEndMarker = ') : (\n                <div className="space-y-6">\n                  {/* SAVED RUPS LB CARD CONTAINER */}';
  
  let formContentPart = '';
  const formStartIdx = content.indexOf(formStartMarker);
  const formEndIdx = content.indexOf(') : (');

  if (formStartIdx !== -1 && formEndIdx !== -1) {
    // We want the part starting after {editingProjectId ? (
    // up to the closing before ) : (
    formContentPart = content.substring(formStartIdx + formStartMarker.length, formEndIdx).trim();
  }

  // Build the new clean return
  const newReturnBlock = `  // 1. LIST VIEW (Default state when not editing)
  if (!editingProjectId) {
    return (
      <DocumentDraftListView
        title="RUPS LUAR BIASA (RUPS LB)"
        subtitle="Kelola daftar dokumen RUPS LB (Akta / Notulen / Sirkuler), status penyimpanan, dan sinkronisasi Google Drive."
        icon={<FileText className="w-6 h-6" />}
        badgeLabel="Modul RUPS LB"
        items={unifiedRupslbDraftItems}
        onAdd={() => {
          setEditingProjectId('new');
          setIsRupsPreview(false);
          updateData({ ...INITIAL_STATE } as any);
        }}
        onEdit={(item) => {
          setEditingProjectId(item.id);
          setIsRupsPreview(false);
          updateData({ ...INITIAL_STATE, ...item.rawData } as any);
        }}
        onDelete={async (item) => {
          try {
            await DocumentDraftService.deleteDraft('rupslb', item.id, user, userProfile);
            recordNotification(
              'Draft RUPS LB Dihapus',
              \`Draft RUPS Luar Biasa untuk "\${item.companyName}" telah berhasil dihapus oleh \${user?.email || 'Admin'}.\`,
              'delete_rupslb'
            );
            alert('✅ Draft RUPS LB berhasil dihapus.');
          } catch (e: any) {
            alert('Gagal menghapus draft: ' + (e.message || e));
          }
        }}
        onOpenDrive={(item) => {
          DocumentDraftService.openDriveDocument(item.driveFileId, item.driveFileUrl);
        }}
        onSyncDrive={async (item) => {
          const res = await DocumentDraftService.syncDraftToGoogleDrive(
            'rupslb',
            item.id,
            item.rawData,
            user,
            userProfile,
            activeProjectContext
          );
          if (res.success) {
            alert('✅ Dokumen berhasil diunggah dan disinkronkan ke Google Drive!');
          } else {
            alert('Gagal sinkron ke Google Drive: ' + (res.error || 'Terjadi kesalahan'));
          }
        }}
        onDownload={async (item, format) => {
          const p = item.rawData || {};
          const merged = { ...INITIAL_STATE, ...p } as any;
          if (format === 'notulen') {
            if (merged.documentType === 'CIRCULAR') {
              const { generateSirkulerLaporanDocx } = await import('../../../lib/generateSirkulerLaporanDocx');
              await generateSirkulerLaporanDocx(merged);
            } else {
              const { generateWordDoc } = await import('../../../../utils/docxGenerator');
              await generateWordDoc(merged);
            }
          } else if (format === 'akta') {
            const { generateRUPSDocx } = await import('../../../lib/generateRUPSDocx');
            await generateRUPSDocx(merged);
          } else if (format.startsWith('transfer_')) {
            const idx = parseInt(format.replace('transfer_', ''), 10);
            const transfers = (merged.shareTransfersNew && merged.shareTransfersNew.length > 0 ? merged.shareTransfersNew : merged.shareTransfers) || [];
            const transfer = transfers[idx];
            if (transfer) {
              const { getTransferData, getCompanyBaseData } = await import('../../../DraftAktaApp');
              const { generateDocx } = await import('../../../lib/generateDocxJualBeli');
              const { initialData } = await import('../../../constants');
              const docData = getTransferData(transfer, merged, getCompanyBaseData(merged, initialData));
              await generateDocx(docData);
            }
          }
        }}
        downloadOptions={(item) => {
          const p = item.rawData || {};
          const isCircular = p.documentType === 'CIRCULAR';
          const opts: DownloadOption[] = [
            {
              label: isCircular ? 'Sirkuler RUPS LB' : 'Notulen RUPS LB',
              subLabel: 'Format dokumen (.docx)',
              format: 'notulen'
            },
            {
              label: isCircular ? 'Akta Sirkuler RUPS LB' : 'Akta RUPS LB',
              subLabel: 'Format dokumen (.docx)',
              format: 'akta'
            }
          ];
          const transfers = (p.shareTransfersNew && p.shareTransfersNew.length > 0 ? p.shareTransfersNew : p.shareTransfers) || [];
          if (p.resolutions?.shareholders && transfers.length > 0) {
            transfers.forEach((_: any, idx: number) => {
              opts.push({
                label: \`Akta Peralihan Saham #\${idx + 1}\`,
                subLabel: 'Format dokumen (.docx)',
                format: \`transfer_\${idx}\`
              });
            });
          }
          return opts;
        }}
        filterYears={uniqueRupslbYears}
        selectedYear={selectedRupslbYear}
        onSelectYear={setSelectedRupslbYear}
      />
    );
  }

  // 2. FORM VIEW (Create or Edit Draft)
  const isEditingExisting = editingProjectId !== 'new';
  const currentCompanyName = data.companyName || 'PT Baru';

  return (
    <div className="w-[94%] xl:w-[92%] max-w-none mx-auto space-y-6 px-2 sm:px-4 py-4 pb-12">
      {formContentPart}

      ${afterPullModal}
  `;

  content = beforeReturn + newReturnBlock;

  // Now replace the action bar buttons inside formContentPart with standardized buttons
  // 1. Add mode badge
  const leftGroupMarker = '<div className="flex flex-wrap items-center gap-2.5">\n                        <button \n                          type="button"\n                          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-[12.5px] uppercase h-10 px-4 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer" \n                          onClick={() => {';
  
  const upgradedLeftGroup = `<div className="flex flex-wrap items-center gap-2.5">
                        <button 
                          type="button"
                          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-[12.5px] uppercase h-10 px-4 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer" 
                          onClick={() => {
                            const returnToProjectId = activeProjectContext;
                            setIsRupsPreview(false);
                            setEditingProjectId(null);
                            setActiveProjectContext(null);
                            if (returnToProjectId) {
                              setSelectedProjectId(returnToProjectId);
                              setActiveSidebarTab('project_detail');
                            }
                          }}
                        >
                          <ArrowRight className="w-4 h-4 rotate-180" /> Kembali ke Daftar
                        </button>

                        <span className={\`px-2.5 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 \${
                          isEditingExisting 
                            ? 'bg-amber-100/90 text-amber-900 border border-amber-300' 
                            : 'bg-blue-100/90 text-blue-900 border border-blue-300'
                        }\`}>
                          <span className={\`w-2 h-2 rounded-full \${isEditingExisting ? 'bg-amber-600' : 'bg-blue-600'}\`} />
                          {isEditingExisting ? \`Mode: Edit Draft — \${currentCompanyName}\` : 'Mode: Buat Dokumen Baru'}
                        </span>`;

  if (content.includes('<ArrowRight className="w-4 h-4 rotate-180" /> Kembali')) {
    // Replace the back button block
    const oldBackRegex = /<button[\s\S]*?<ArrowRight className="w-4 h-4 rotate-180" \/> Kembali[\s\S]*?<\/button>/;
    content = content.replace(oldBackRegex, `<button 
                          type="button"
                          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-[12.5px] uppercase h-10 px-4 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer" 
                          onClick={() => {
                            const returnToProjectId = activeProjectContext;
                            setIsRupsPreview(false);
                            setEditingProjectId(null);
                            setActiveProjectContext(null);
                            if (returnToProjectId) {
                              setSelectedProjectId(returnToProjectId);
                              setActiveSidebarTab('project_detail');
                            }
                          }}
                        >
                          <ArrowRight className="w-4 h-4 rotate-180" /> Kembali ke Daftar
                        </button>

                        <span className={\`px-2.5 py-1.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 \${
                          isEditingExisting 
                            ? 'bg-amber-100/90 text-amber-900 border border-amber-300' 
                            : 'bg-blue-100/90 text-blue-900 border border-blue-300'
                        }\`}>
                          <span className={\`w-2 h-2 rounded-full \${isEditingExisting ? 'bg-amber-600' : 'bg-blue-600'}\`} />
                          {isEditingExisting ? \`Mode: Edit Draft — \${currentCompanyName}\` : 'Mode: Buat Dokumen Baru'}
                        </span>`);
  }

  // 2. Add Google Drive buttons in the right group of action bar
  const rightGroupMarker = '<div className="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end">';
  const driveButtonsCode = `<div className="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end">
                        {/* Buka di Google Drive */}
                        {Boolean(data.driveFileId || data.driveFileUrl) && (
                          <button
                            type="button"
                            onClick={() => DocumentDraftService.openDriveDocument(data.driveFileId, data.driveFileUrl)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-semibold text-[12px] uppercase h-10 px-4 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                            title="Buka dokumen di Google Drive"
                          >
                            <ExternalLink className="w-4 h-4 text-emerald-600" />
                            <span>Buka di Google Drive</span>
                          </button>
                        )}

                        {/* Sinkronkan ke Google Drive */}
                        {isEditingExisting && (
                          <button
                            type="button"
                            disabled={isDriveSyncing}
                            onClick={async () => {
                              setIsDriveSyncing(true);
                              try {
                                const res = await DocumentDraftService.syncDraftToGoogleDrive('rupslb', editingProjectId, data, user, userProfile, activeProjectContext);
                                if (res.success) {
                                  updateData({ driveFileId: res.driveFileId, driveFileUrl: res.fileUrl, driveSyncStatus: 'synced' });
                                  alert('✅ Dokumen RUPS LB berhasil diunggah dan disinkronkan ke Google Drive!');
                                } else {
                                  alert('Gagal upload ke Drive: ' + (res.error || 'Terjadi kesalahan'));
                                }
                              } catch (e: any) {
                                alert('Gagal upload ke Drive: ' + e.message);
                              } finally {
                                setIsDriveSyncing(false);
                              }
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-[12px] uppercase h-10 px-4 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                            title="Unggah draf dokumen ke Google Drive"
                          >
                            {isDriveSyncing ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <RefreshCw className="w-4 h-4" />}
                            <span>{data.driveFileId ? 'Perbarui di Drive' : 'Upload ke Drive'}</span>
                          </button>
                        )}`;

  if (content.includes(rightGroupMarker)) {
    content = content.replace(rightGroupMarker, driveButtonsCode);
  }

  // 3. Update the Save button to use DocumentDraftService.saveDraft and prevent duplicates!
  const saveBtnRegex = /<button[\s\S]*?disabled=\{isSaving\}[\s\S]*?onClick=\{async \(\) => \{[\s\S]*?if \(!data\.companyName\) return alert\('Nama perseroan harus diisi'\);[\s\S]*?setIsSaving\(false\);[\s\S]*?\}\}[\s\S]*?>[\s\S]*?SIMPAN RUPS LB[\s\S]*?<\/button>/;

  const newSaveBtn = `<button 
                              type="button"
                              disabled={isSaving}
                              onClick={async () => {
                                if (!data.companyName) return alert('Nama perseroan harus diisi');
                                setIsSaving(true);
                                
                                const calculatedFinal = calculateFinalShareholders(data);
                                const profileData: CompanyProfile = {
                                  ...data,
                                  finalShareholders: calculatedFinal.length > 0 ? calculatedFinal : (data.finalShareholders || []),
                                  updatedAt: new Date().toISOString()
                                };
                                
                                try {
                                  const isNew = editingProjectId === 'new' || !editingProjectId;
                                  const res = await DocumentDraftService.saveDraft(
                                    'rupslb',
                                    editingProjectId,
                                    profileData,
                                    user,
                                    userProfile,
                                    activeProjectContext
                                  );

                                  if (isNew && res.id) {
                                    setEditingProjectId(res.id);
                                    updateData({ ...profileData, id: res.id, driveFileId: res.driveFileId });
                                  }

                                  recordNotification(
                                    isNew ? 'Draft RUPS LB Baru Dibuat' : 'Draft RUPS LB Diubah',
                                    \`Draft RUPS Luar Biasa untuk perusahaan "\${profileData.companyName || 'PT Baru'}" telah \${isNew ? 'berhasil dibuat' : 'diperbarui'} oleh \${user?.email || 'Admin'}.\`,
                                    isNew ? 'create_rupslb' : 'update_rupslb'
                                  );

                                  alert('✅ Data draft RUPS LB berhasil disimpan.');

                                  if (activeProjectContext) {
                                    const returnToProjectId = activeProjectContext;
                                    setEditingProjectId(null);
                                    setActiveProjectContext(null);
                                    setIsRupsPreview(false);
                                    setSelectedProjectId(returnToProjectId);
                                    setActiveSidebarTab('project_detail');
                                  }
                                } catch (e: any) {
                                  console.error("Save failed:", e);
                                  alert('Gagal menyimpan draft: ' + (e.message || e));
                                } finally {
                                  setIsSaving(false);
                                }
                              }} 
                              className="bg-[#1b449c] hover:bg-[#13327d] text-white font-bold text-[12.5px] uppercase h-10 px-5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  <span>MENYIMPAN...</span>
                                </>
                              ) : (
                                <>
                                  <Save size={16} />
                                  <span>SIMPAN DRAFT</span>
                                </>
                              )}
                            </button>`;

  content = content.replace(saveBtnRegex, newSaveBtn);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully refactored RUPSLBPage.tsx');
} else {
  console.error('Could not locate markers in RUPSLBPage.tsx', { returnIdx, pullModalIdx });
}
