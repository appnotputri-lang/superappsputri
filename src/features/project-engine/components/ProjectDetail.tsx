import React, { useState, useEffect } from 'react';
import { Project, DocumentReference } from '../../../domain/project/Project';
import { ProjectService } from '../../../services/ProjectService';
import { CompanyProfile, UserProfile } from '../../../../types';
import { INITIAL_STATE } from '../../../domain/company/initialCompanyData';
import { Workflow } from '../../../domain/project/Workflow';
import { WorkflowService } from '../../../services/WorkflowService';
import { Timeline } from '../../../domain/project/Timeline';
import { Task } from '../../../domain/project/Task';
import { db, cleanUndefined } from '../../../lib/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import DraftAktaPendirian from '../../../DraftAktaPendirian';
import PendirianDocumentPreview from '../../../PendirianDocumentPreview';
import { syncToUtama, getDeedTitle, formatAppearersForPendirian } from '../../../lib/syncUtama';
import { mapCompanyProfileToPendirian } from '../../../domain/company/mappers/companyProfileToPendirian';
import {
  ArrowLeft,
  Calendar,
  User,
  Briefcase,
  FileText,
  File,
  CheckSquare,
  Square,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Send,
  Trash2,
  Sparkles,
  UploadCloud
} from 'lucide-react';

const getDocKinds = (jobType: string): { kind: 'notulen' | 'pernyataan' | 'akta' | 'pendirian'; label: string }[] => {
  if (jobType === 'pendirian_pt') {
    return [{ kind: 'pendirian', label: 'Dokumen Pendirian' }];
  }
  if (jobType === 'rups_t' || jobType === 'sirkuler') {
    return [
      { kind: 'notulen', label: 'Notulen / Sirkuler RUPST' },
      { kind: 'pernyataan', label: 'Surat Pernyataan' },
      { kind: 'akta', label: 'Draft Akta RUPST' },
    ];
  }
  if (jobType === 'rups_lb' || jobType === 'sirkuler_rupslb') {
    return [
      { kind: 'notulen', label: 'Notulen / Sirkuler RUPS LB' },
      { kind: 'akta', label: 'Draft Akta RUPS LB' },
    ];
  }
  return [];
};

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  currentUser: UserProfile;
}

export default function ProjectDetail({ projectId, onBack, currentUser }: ProjectDetailProps) {
  const currentUserEmail = currentUser.email;
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<CompanyProfile | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<DocumentReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction States
  const [transitionStatus, setTransitionStatus] = useState('');
  const [transitionComment, setTransitionComment] = useState('');
  const [transitionStrict, setTransitionStrict] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  // New Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // New Document State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    name: '',
    type: 'docx',
    url: ''
  });
  const [addingDoc, setAddingDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64Str = (reader.result as string).split(',')[1];
        resolve(base64Str);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Pendirian Work Mode States
  const [workMode, setWorkMode] = useState<'default' | 'pendirian'>('default');
  const [workingPendirianId, setWorkingPendirianId] = useState<string | null>(null);
  const [workingPendirianData, setWorkingPendirianData] = useState<any>(null);
  const [pendirianProfiles, setPendirianProfiles] = useState<any[]>([]);
  
  const [showPendirianPreview, setShowPendirianPreview] = useState(false);
  const [pendirianPreviewData, setPendirianPreviewData] = useState<any>(null);
  const [isExportingPendirian, setIsExportingPendirian] = useState(false);

  const [exportingDocId, setExportingDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDocRecordData = async (docRef: DocumentReference): Promise<any | null> => {
    let collectionName = '';
    if (project?.jobType === 'rups_lb' || project?.jobType === 'sirkuler_rupslb') {
      collectionName = 'projects';
    } else if (project?.jobType === 'rups_t' || project?.jobType === 'sirkuler') {
      collectionName = 'rupst_projects';
    } else if (project?.jobType === 'pendirian_pt') {
      collectionName = 'pendirian_projects';
    } else {
      alert('Jenis dokumen ini belum didukung untuk download otomatis.');
      return null;
    }

    if (docRef.refId) {
      const snap = await getDoc(doc(db, collectionName, docRef.refId));
      if (snap.exists()) {
        return snap.data();
      }
    }

    // Fallback search by title / PT name
    try {
      const colRef = collection(db, collectionName);
      
      const cleanTitle = project?.title?.includes(' — ') 
        ? project.title.split(' — ')[1].trim() 
        : project?.title?.includes(' - ') 
          ? project.title.split(' - ')[1].trim() 
          : project?.title || '';

      // First try to match by selectedProfileId/clientId if available
      if (project?.clientId) {
        let qClient;
        if (collectionName === 'pendirian_projects') {
          qClient = query(colRef, where('selectedProfileId', '==', project.clientId));
        } else {
          qClient = query(colRef, where('clientId', '==', project.clientId)); // Assuming others might have clientId, if not it might fail safely or just return empty
        }
        try {
          const qSnapClient = await getDocs(qClient);
          if (!qSnapClient.empty) return qSnapClient.docs[0].data();
        } catch(e) {}
      }

      let q;
      if (collectionName === 'pendirian_projects') {
        q = query(colRef, where('namaPt', '==', cleanTitle));
      } else {
        q = query(colRef, where('companyName', '==', cleanTitle));
      }
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return qSnap.docs[0].data();
      }

      // Brute-force local/trimmed fallback if exact match query failed
      const allSnap = await getDocs(colRef);
      const projectTitleUpper = cleanTitle.toUpperCase();
      for (const d of allSnap.docs) {
        const data = d.data();
        const docTitle = (data.namaPt || data.companyName || '').toUpperCase().trim();
        if (docTitle === projectTitleUpper && projectTitleUpper !== '') {
          return data;
        }
      }
    } catch (e) {
      console.error('Fallback query failed:', e);
    }

    alert('Dokumen ini dibuat sebelum fitur download otomatis tersedia. Silakan buka manual lewat menu lama untuk mengunduhnya.');
    return null;
  };

  const handleGenerate = async (docRef: DocumentReference, kind: 'notulen' | 'pernyataan' | 'akta' | 'pendirian', rowKey: string) => {
    setExportingDocId(rowKey);
    try {
      const rawData = await fetchDocRecordData(docRef);
      if (!rawData) return;

      if (kind === 'pendirian') {
        const { generatePendirianDocx } = await import('../../../lib/generatePendirianDocx');
        await generatePendirianDocx(rawData);
        return;
      }

      const mergedData = { ...INITIAL_STATE, ...rawData } as any;

      if (project?.jobType === 'rups_t' || project?.jobType === 'sirkuler') {
        if (kind === 'notulen') {
          if (mergedData.rupstType === 'sirkuler') {
            const { generateSirkulerLaporanDocx } = await import('../../../lib/generateSirkulerLaporanDocx');
            await generateSirkulerLaporanDocx(mergedData);
          } else {
            const { generateRUPSTDocx } = await import('../../../lib/generateRUPSTDocx');
            await generateRUPSTDocx(mergedData);
          }
        } else if (kind === 'pernyataan') {
          const { generateRUPSTPernyataanDocx } = await import('../../../lib/generateRUPSTPernyataanDocx');
          await generateRUPSTPernyataanDocx(mergedData);
        } else if (kind === 'akta') {
          const { generateRUPSTAktaDocx } = await import('../../../lib/generateRUPSTAktaDocx');
          await generateRUPSTAktaDocx(mergedData);
        }
      } else {
        // RUPS LB / sirkuler_rupslb
        if (kind === 'notulen') {
          const { generateWordDoc } = await import('../../../../utils/docxGenerator');
          await generateWordDoc(mergedData);
        } else if (kind === 'akta') {
          const { generateRUPSDocx } = await import('../../../lib/generateRUPSDocx');
          await generateRUPSDocx(mergedData);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengunduh dokumen: ' + err.message);
    } finally {
      setExportingDocId(null);
    }
  };

  const handleWorkHere = async () => {
    setLoading(true);
    try {
      const profSnap = await getDocs(collection(db, 'company_profiles'));
      setPendirianProfiles(profSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const pendSnap = await getDocs(collection(db, 'pendirian_projects'));
      const pendData = pendSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      
      // Look for an existing document reference with url '/pendirian' in the project
      const pendirianDocRef = documents.find(d => d.url === '/pendirian');
      
      let existing;
      if (pendirianDocRef && pendirianDocRef.refId) {
        existing = pendData.find(p => p.id === pendirianDocRef.refId);
      } else {
        // Fallback: match by selectedProfileId (clientId) or a clean name
        const cleanTitle = project?.title.includes(' — ') 
          ? project.title.split(' — ')[1].trim() 
          : project?.title.includes(' - ') 
            ? project.title.split(' - ')[1].trim() 
            : project?.title;
            
        existing = pendData.find(p => p.selectedProfileId === project?.clientId || p.namaPt === cleanTitle || p.namaPt === project?.title);
      }
      
      if (existing) {
        setWorkingPendirianId(existing.id);
        setWorkingPendirianData(existing);
      } else {
        setWorkingPendirianId('new');
        if (client) {
          const defaultClientData = mapCompanyProfileToPendirian(client);
          setWorkingPendirianData(defaultClientData);
        } else {
          setWorkingPendirianData(null);
        }
      }
      
      setWorkMode('pendirian');
    } catch (e) {
      console.error(e);
      alert('Gagal memuat form pendirian.');
    } finally {
      setLoading(false);
    }
  };

  const handlePendirianExportWord = async (d: any) => {
    setIsExportingPendirian(true);
    try {
      const { generatePendirianDocx } = await import('../../../lib/generatePendirianDocx');
      await generatePendirianDocx(d);
    } catch (e) {
      console.error(e);
      alert('Gagal membuat dokumen pendirian');
    } finally {
      setIsExportingPendirian(false);
    }
  };

  useEffect(() => {
    fetchProjectFullDetails();
  }, [projectId]);

  const handleDeleteProject = async () => {
    if (currentUser.role !== 'Super Admin') {
      alert('Hanya Super Admin yang dapat menghapus proyek permanen!');
      return;
    }

    const confirm1 = window.confirm('Apakah Anda yakin ingin MENGHAPUS PERMANEN proyek ini? Tindakan ini tidak dapat dibatalkan.');
    if (!confirm1) return;

    const confirm2 = window.prompt('Ketik "HAPUS" untuk mengonfirmasi penghapusan permanen:');
    if (confirm2 !== 'HAPUS') return;

    setIsDeleting(true);
    try {
      await ProjectService.deleteProject(projectId);
      alert('Proyek berhasil dihapus secara permanen.');
      onBack();
    } catch (err: any) {
      console.error(err);
      alert('Gagal menghapus proyek: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchProjectFullDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const proj = await ProjectService.getProject(projectId);
      if (!proj) {
        setError('Proyek tidak ditemukan.');
        setLoading(false);
        return;
      }

      setProject(proj);

      // Parallel queries for children and linked entities
      const [cli, wf, tlList, tkList, docList] = await Promise.all([
        getDoc(doc(db, 'profiles', proj.clientId)).then(snapshot => {
          if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as CompanyProfile;
          }
          return null;
        }),
        WorkflowService.getWorkflow(proj.jobType),
        ProjectService.getProjectTimelines(projectId),
        ProjectService.getProjectTasks(projectId),
        ProjectService.getProjectDocuments(projectId)
      ]);

      setClient(cli);
      setWorkflow(wf);
      setTimelines(tlList || []);
      setTasks(tkList || []);
      setDocuments(docList || []);

      // Pre-populate status transition select
      if (wf && wf.steps) {
        const currentIndex = wf.steps.indexOf(proj.status);
        if (currentIndex !== -1 && currentIndex + 1 < wf.steps.length) {
          setTransitionStatus(wf.steps[currentIndex + 1]);
        } else {
          setTransitionStatus(wf.steps[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat detail proyek.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transitionStatus) return;

    setTransitioning(true);
    try {
      await ProjectService.updateStatus(
        projectId,
        transitionStatus,
        currentUserEmail || 'staff_notaris',
        transitionComment.trim() || undefined,
        transitionStrict
      );

      setTransitionComment('');
      // Reload everything
      await fetchProjectFullDetails();
      alert('Status proyek berhasil diperbarui!');
    } catch (err: any) {
      console.error(err);
      alert(`Gagal memperbarui status: ${err.message || 'Pelanggaran transisi status berurutan (Strict Guard).'}`);
    } finally {
      setTransitioning(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      await ProjectService.updateTaskStatus(projectId, taskId, !currentCompleted);
      // Update local state smoothly
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: !currentCompleted ? 'completed' : 'pending' } : t)));
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui checklist tugas.');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setAddingTask(true);
    try {
      const newTask = await ProjectService.createTask(projectId, {
        title: newTaskTitle.trim(),
        status: 'pending'
      });

      if (newTask) {
        setTasks([...tasks, newTask]);
        setNewTaskTitle('');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menambahkan tugas baru.');
    } finally {
      setAddingTask(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.name.trim()) {
      alert('Nama dokumen wajib diisi.');
      return;
    }
    if (!selectedFile) {
      alert('Silakan pilih atau seret file yang ingin diunggah.');
      return;
    }

    setAddingDoc(true);
    try {
      const base64 = await getBase64(selectedFile);
      
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          name: docForm.name.trim(),
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/octet-stream',
          base64,
          uploadedBy: currentUser.email || 'staff_notaris'
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Gagal mengunggah dokumen.');
      }

      // Refresh documents and clear states
      setIsDocModalOpen(false);
      setSelectedFile(null);
      setDocForm({ name: '', type: 'docx', url: '' });
      
      // Fetch details again to refresh UI
      await fetchProjectFullDetails();
      
      alert('Dokumen administrasi berhasil diunggah dan disimpan ke Google Drive!');
    } catch (err: any) {
      console.error(err);
      alert('Gagal mengunggah dokumen: ' + err.message);
    } finally {
      setAddingDoc(false);
    }
  };

  const getRedirectPath = (jobType: string) => {
    switch (jobType) {
      case 'rups_lb':
        return '/rupslb';
      case 'rups_t':
        return '/rupst';
      case 'sirkuler':
        return '/rupst';
      case 'sirkuler_rupslb':
        return '/rupslb';
      case 'pendirian_pt':
        return '/pendirian';
      default:
        return '/';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-[13px] text-slate-400 mt-2">Memuat detail proyek...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 p-6 bg-slate-50">
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Terjadi Kesalahan</h2>
          <p className="text-[13px] text-slate-500 mt-1">{error || 'Proyek gagal dimuat.'}</p>
          <button
            onClick={onBack}
            className="mt-6 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Daftar Proyek</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back and Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                  ID: {project.projectId.substring(0, 10)}
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                  {workflow?.name || project.jobType}
                </span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-1.5 leading-snug">
                {project.title}
              </h1>
            </div>
          </div>

          {/* Quick link buttons to existing forms */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <a
              href={getRedirectPath(project.jobType)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all shadow-sm"
            >
              <span>Buka Modul Form Existing</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            {(() => {
              const path = getRedirectPath(project.jobType);
              const existingDoc = documents.find(d => d.url === path);
              
              if (existingDoc && existingDoc.refId) {
                return (
                  <a
                    href={`${path}?id=${existingDoc.refId}&projectId=${project.projectId}`}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all shadow-sm"
                  >
                    <span>Edit Dokumen</span>
                    <FileText className="w-4 h-4" />
                  </a>
                );
              }

              return (
                <a
                  href={`${path}?projectId=${project.projectId}`}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all shadow-sm"
                >
                  <span>Buat Dokumen Baru</span>
                  <Plus className="w-4 h-4" />
                </a>
              );
            })()}
            {project.jobType === 'pendirian_pt' && (
              <button
                onClick={handleWorkHere}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all shadow-sm"
              >
                <span>Kerjakan di Sini</span>
                <Sparkles className="w-4 h-4" />
              </button>
            )}
            {currentUser.role === 'Super Admin' && (
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-semibold rounded-lg text-[13px] flex items-center gap-2 transition-all border border-red-200"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Hapus Proyek</span>
              </button>
            )}
          </div>
        </div>

        {workMode === 'pendirian' ? (
          <div className="mt-6">
            <button 
              onClick={() => setWorkMode('default')}
              className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-700 font-semibold text-sm transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Detail Proyek
            </button>
            <DraftAktaPendirian
                profiles={pendirianProfiles}
                initialData={workingPendirianData}
                isSaving={addingDoc}
                isSyncing={false}
                onSync={async (finalData) => {
                  const deedNumber = finalData.nomorAkta;
                  const deedDate = finalData.tanggal;
                  if (!deedNumber || !deedDate) {
                    alert("Nomor Akta dan Tanggal Akta harus diisi sebelum sinkronisasi.");
                    return;
                  }
                  let rawClientName = finalData.namaPt;
                  if (finalData.selectedProfileId) {
                    const profile = pendirianProfiles.find(p => p.id === finalData.selectedProfileId);
                    if (profile && profile.companyName) rawClientName = profile.companyName;
                  }
                  const clientName = (rawClientName || '').toUpperCase().startsWith('PT') 
                    ? (rawClientName || '') : `PT ${(rawClientName || '')}`;
                  const syncData = {
                    deedNumber,
                    orderNumber: finalData.nomorUrut,
                    deedDate,
                    clientName,
                    deedTitle: getDeedTitle('PENDIRIAN', finalData, rawClientName),
                    appearers: formatAppearersForPendirian(finalData)
                  };
                  try {
                    const success = await syncToUtama(syncData);
                    if (success) {
                      alert("Berhasil disimpan ke laporan!");
                    }
                  } catch (err: any) {
                    console.error(err);
                    alert("Gagal melakukan sinkronisasi: " + err.message);
                  }
                }}
                onChange={(d) => {
                  setWorkingPendirianData(d);
                }}
                autoSaveIndicator={<span className="text-xs text-slate-500">Mode Embed (Auto-save nonaktif)</span>}
                onSave={async (pendirianData) => {
                  setAddingDoc(true);
                  if (!currentUserEmail) {
                    setAddingDoc(false);
                    return alert('Anda harus login terlebih dahulu!');
                  }
                  
                  const isNew = workingPendirianId === 'new';
                  const id = isNew ? crypto.randomUUID() : workingPendirianId;
                  const finalData = {
                    ...pendirianData,
                    id,
                    updatedAt: new Date().toISOString()
                  };
                  try {
                    await setDoc(doc(db, 'pendirian_projects', id as string), cleanUndefined(finalData));
                    
                    if (isNew) {
                      await ProjectService.addDocument(projectId, {
                        name: `Draft Pendirian PT - ${finalData.namaPt || 'PT Baru'}`,
                        type: 'docx',
                        url: `/pendirian`,
                        refId: id as string,
                        uploadedBy: currentUserEmail
                      });
                    }
                    
                    alert('Data pendirian berhasil disimpan dan dilink ke proyek!');
                    fetchProjectFullDetails();
                    setWorkingPendirianId(id as string);
                    setWorkingPendirianData(finalData);
                  } catch (e: any) {
                    console.error(e);
                    alert("Error: " + e.message);
                  } fillly: {
                    setAddingDoc(false);
                  }
                }}
                onCancel={() => {
                  setWorkMode('default');
                }}
                onDelete={async (id) => {
                  if (confirm('Apakah Anda yakin ingin menghapus data pendirian ini?')) {
                    try {
                      await deleteDoc(doc(db, 'pendirian_projects', id));
                      await ProjectService.deleteDocumentByRefId(projectId, id);
                      fetchProjectFullDetails();
                      setWorkMode('default');
                      alert('Data pendirian berhasil dihapus!');
                    } catch (e: any) {
                      console.error(e);
                      alert(e.message);
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
            {showPendirianPreview && pendirianPreviewData && (
              <PendirianDocumentPreview
                data={pendirianPreviewData}
                onExport={() => handlePendirianExportWord(pendirianPreviewData)}
                onClose={() => setShowPendirianPreview(false)}
                isExporting={isExportingPendirian}
              />
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Main Details & Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Metadata Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
                Informasi & Metadata Proyek
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Klien Registrasi</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold">{client ? client.companyName : 'Memuat...'}</span>
                  </div>
                  {client && (
                    <span className="text-xs text-slate-400 block ml-6">
                      {client.domicile || '-'}{client.phoneNumber ? ` | ${client.phoneNumber}` : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Ditugaskan Kepada</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{project.assignedTo || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Tanggal Dibuat</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      {project.createdAt ? new Date(project.createdAt.seconds ? project.createdAt.toDate() : project.createdAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      }) : '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Status Tahapan Saat Ini</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                      {project.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {project.metadata?.driveFolderUrl && (
                  <div className="space-y-1 col-span-1 sm:col-span-2 mt-2">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Google Drive Proyek (Auto-generated)</span>
                    <a 
                      href={project.metadata.driveFolderUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-lg border border-blue-200 transition-all shadow-sm group"
                    >
                      <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      Buka Folder Drive Proyek
                    </a>
                  </div>
                )}
              </div>

              {/* Display Custom Metadata */}
              {project.metadata && Object.keys(project.metadata).length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">Kunci Metadata Kustom</span>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 font-mono text-xs text-slate-600 max-h-32 overflow-y-auto">
                    {JSON.stringify(project.metadata, null, 2)}
                  </div>
                </div>
              )}
            </div>

            {/* Task Checklist Section */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide">
                  Daftar Checklist Tugas ({tasks.filter((t) => t.status === 'completed').length}/{tasks.length})
                </h2>
              </div>

              {/* Tasks List */}
              {tasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-[13px]">
                  Belum ada checklist tugas kustom untuk proyek ini.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id, task.status === 'completed')}
                      className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50/50 cursor-pointer transition-all select-none group"
                    >
                      <div className="flex items-center gap-3">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-slate-300 group-hover:border-blue-500 shrink-0 transition-colors" />
                        )}
                        <span className={`text-[13px] ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {task.updatedAt ? new Date(task.updatedAt.seconds ? task.updatedAt.toDate() : task.updatedAt).toLocaleDateString('id-ID') : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Quick Task Form */}
              <form onSubmit={handleAddTask} className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ketik tugas administratif baru di sini..."
                  className="flex-1 px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={addingTask}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </form>
            </div>

            {/* Subcollection Document Listing */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide">
                  Arsip Dokumen Administrasi ({documents.length})
                </h2>
                <button
                  onClick={() => setIsDocModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Dokumen</span>
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-[13px]">
                  Belum ada dokumen yang terdaftar dalam proyek ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {documents.map((doc) => {
                    // Check if it's an uploaded file (no refId or has external URL)
                    const isUploadedFile = !doc.refId || (doc.url && doc.url.startsWith('http'));
                    
                    if (isUploadedFile) {
                      return (
                        <div key={doc.id} className="py-3.5 flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-[13px]">{doc.name}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Format: {doc.type ? doc.type.toUpperCase() : 'PDF'} | Diunggah oleh: {doc.uploadedBy || 'Staf'}
                                {' '}| {doc.uploadedAt ? new Date(doc.uploadedAt.seconds ? doc.uploadedAt.toDate() : doc.uploadedAt).toLocaleDateString('id-ID') : ''}
                              </p>
                            </div>
                          </div>
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Buka di Google Drive</span>
                            </a>
                          )}
                        </div>
                      );
                    }

                    // Otherwise, it's a template reference
                    const kinds = getDocKinds(project?.jobType || '');
                    if (kinds.length === 0) return null;
                    return (
                      <div key={doc.id} className="divide-y divide-slate-50 border-b border-slate-100 last:border-0">
                        {kinds.map(({ kind, label }) => {
                          const rowKey = `${doc.id}-${kind}`;
                          const isExporting = exportingDocId === rowKey;
                          return (
                            <div key={rowKey} className="py-3.5 flex items-center justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-[13px]">{label}</h4>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Dari: {doc.name} | Diunggah oleh: {doc.uploadedBy || 'Sistem'}
                                    {' '}| {doc.uploadedAt ? new Date(doc.uploadedAt.seconds ? doc.uploadedAt.toDate() : doc.uploadedAt).toLocaleDateString('id-ID') : ''}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleGenerate(doc, kind, rowKey)}
                                disabled={isExporting}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
                              >
                                {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                                <span>{isExporting ? 'Mengunduh...' : 'Download DOCX'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Transition Engine Guard & Chronological Timeline */}
          <div className="space-y-6">
            {/* Status Transition Engine Guard Form */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
                Transisi Status Guard
              </h2>

              <form onSubmit={handleStatusTransition} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pilih Tahap Tujuan</label>
                  <select
                    value={transitionStatus}
                    onChange={(e) => setTransitionStatus(e.target.value)}
                    className="w-full px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all focus:bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    {workflow?.steps.map((step) => (
                      <option key={step} value={step}>
                        {step.toUpperCase()} {step === project.status ? '(Aktif Saat Ini)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Catatan Transisi</label>
                  <textarea
                    value={transitionComment}
                    onChange={(e) => setTransitionComment(e.target.value)}
                    placeholder="Masukkan alasan atau catatan peralihan status hukum..."
                    rows={2}
                    className="w-full px-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Sequential Guard (Strict)</span>
                    <span className="text-[10px] text-slate-400">Hanya izinkan transisi berurutan</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={transitionStrict}
                    onChange={(e) => setTransitionStrict(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={transitioning || transitionStatus === project.status}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {transitioning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Terapkan Transisi</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Chronological Vertical Timeline Log */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-[14px] font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
                Riwayat Jejak Proyek ({timelines.length})
              </h2>

              {timelines.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-[13px]">
                  Belum ada catatan riwayat aktivitas.
                </div>
              ) : (
                <div className="relative border-l border-slate-200 pl-4 space-y-5 ml-1.5">
                  {timelines.map((timeline) => (
                    <div key={timeline.id} className="relative">
                      {/* Timeline Dot Indicator */}
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 border border-white" />
                      
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {timeline.createdAt ? new Date(timeline.createdAt.seconds ? timeline.createdAt.toDate() : timeline.createdAt).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </span>
                        <h4 className="text-[13px] font-bold text-slate-800 leading-tight">
                          {timeline.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-normal">
                          {timeline.description}
                        </p>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          Oleh: {timeline.createdBy}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Register Document Metadata Dialog */}
        {isDocModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-slideUp">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-[15px]">Upload Dokumen Administrasi</h3>
                <button
                  onClick={() => {
                    setIsDocModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="p-1 text-slate-400 rounded hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddDocument} className="p-6 space-y-4">
                {/* Drag and Drop Zone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">File Dokumen (PDF, JPG, PNG, DOCX, dll)</label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragActive(true);
                    }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setSelectedFile(file);
                        // Auto-populate document name with file name (without extension) if empty
                        if (!docForm.name.trim()) {
                          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                          setDocForm(prev => ({ ...prev, name: baseName }));
                        }
                      }
                    }}
                    onClick={() => {
                      document.getElementById('file-picker')?.click();
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDragActive 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : selectedFile 
                        ? 'border-emerald-500 bg-emerald-50/10' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <input
                      id="file-picker"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setSelectedFile(file);
                          // Auto-populate document name with file name (without extension) if empty
                          if (!docForm.name.trim()) {
                            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                            setDocForm(prev => ({ ...prev, name: baseName }));
                          }
                        }
                      }}
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-1">
                        <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                          <File className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-emerald-800 line-clamp-1">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Klik untuk ganti file</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Seret file ke sini atau Klik untuk memilih</p>
                        <p className="text-[10px] text-slate-400">Mendukung format PDF, JPG, PNG, DOCX, dll.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nama / Judul Dokumen</label>
                  <input
                    type="text"
                    required
                    value={docForm.name}
                    onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                    placeholder="Contoh: Akta Pendirian Final, SK Kemenkumham, KTP Direktur"
                    className="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDocModalOpen(false);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-lg text-[13px] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={addingDoc || !selectedFile}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {addingDoc ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Unggah Dokumen</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple close helper
function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  );
}
