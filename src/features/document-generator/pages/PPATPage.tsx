import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Save, FileText, CheckCircle2, Printer, 
  Download, Eye, AlertCircle, Sparkles, Building2, User, 
  MapPin, ShieldAlert, Check, Calendar, FileSignature, 
  ChevronRight, Users, Landmark, Plus, Trash2, Edit3, HelpCircle,
  Clock, ShieldCheck
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Project, PPATData, PPATDocumentItem, PPATParty, PPATObjectData } from '../../../domain/project/Project';
import { ProjectService } from '../../../services/ProjectService';
import { PPAT_DOC_TYPES, PPATDocTypeConfig } from '../../project-engine/components/ppat/ppatDocTypes';
import { PPATDocumentPreviewModal } from '../../project-engine/components/ppat/PPATDocumentPreviewModal';
import { generateAnyPPATDocx } from '../../project-engine/components/ppat/generatePPATDocx';
import { PPAT_TRANSACTION_TYPES } from '../../../constants/appConstants';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { sanitizeForFirestore } from '../../../utils/sanitize';

export interface PPATPageProps {
  user?: any;
  userProfile?: any;
  editingPPATId?: string | null;
  setEditingPPATId?: (id: string | null) => void;
  activeProjectContext?: string | null;
  setActiveProjectContext?: (id: string | null) => void;
  setSelectedProjectId?: (id: string | null) => void;
  setActiveSidebarTab?: (tab: any) => void;
  recordNotification?: (title: string, desc: string, type: string) => void;
  projects?: any[];
  profiles?: any[];
  cvProfiles?: any[];
  isSaving?: boolean;
  setIsSaving?: (s: boolean) => void;
}

export const PPATPage: React.FC<PPATPageProps> = ({
  user,
  userProfile,
  editingPPATId,
  setEditingPPATId,
  activeProjectContext,
  setActiveProjectContext,
  setSelectedProjectId,
  setActiveSidebarTab,
  recordNotification,
  projects = [],
  profiles = [],
  cvProfiles = [],
  isSaving: externalSaving,
  setIsSaving: setExternalSaving
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract query params as fallback
  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlProjectId = urlParams.get('projectId');
  const urlDocId = urlParams.get('id');
  const urlDocType = urlParams.get('type');

  const effectiveProjectId = activeProjectContext || urlProjectId || null;
  const effectiveDocId = editingPPATId || urlDocId || null;

  const [loading, setLoading] = useState<boolean>(true);
  const [project, setProject] = useState<Project | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [internalSaving, setInternalSaving] = useState<boolean>(false);
  const saving = externalSaving ?? internalSaving;
  const setSaving = setExternalSaving ?? setInternalSaving;

  const [activeTab, setActiveTab] = useState<'document_data' | 'shared_data' | 'preview'>('document_data');
  const [sharedSubTab, setSharedSubTab] = useState<'firstParty' | 'secondParty' | 'object'>('firstParty');
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Document & Base Data state
  const initialMatchedType = urlDocType
    ? PPAT_DOC_TYPES.find(t => t.id === urlDocType)
    : PPAT_DOC_TYPES[0];

  const [docItem, setDocItem] = useState<PPATDocumentItem>({
    id: 'ppat_doc_' + Math.random().toString(36).substring(2, 9),
    documentType: initialMatchedType?.id || 'akta_ajb',
    typeId: initialMatchedType?.id || 'akta_ajb',
    title: initialMatchedType?.defaultTitle || initialMatchedType?.title || 'Akta Jual Beli (AJB)',
    category: initialMatchedType?.category || 'akta',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    letterDate: new Date().toISOString().split('T')[0],
    letterLocation: 'Kabupaten Bandung Barat',
    specificData: {}
  });

  const [ppatData, setPpatData] = useState<PPATData>({
    transactionType: 'Akta Jual Beli (AJB)',
    firstParties: [{ id: 'p1', name: '', isLegalEntity: false, nik: '', address: '', job: '' }],
    secondParties: [{ id: 'p2', name: '', isLegalEntity: false, nik: '', address: '', job: '' }],
    object: {},
    notes: '',
    documents: []
  });

  const [syncToBaseProject, setSyncToBaseProject] = useState<boolean>(true);

  // 1. Fetch & Initialize Project Data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!effectiveProjectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Find in props or fetch from Firestore
        let loadedProject: Project | null = projects.find(p => p.projectId === effectiveProjectId || p.id === effectiveProjectId) || null;
        if (!loadedProject) {
          loadedProject = await ProjectService.getProject(effectiveProjectId);
        }

        if (!loadedProject) {
          // Direct fallback query from firestore
          const docSnap = await getDoc(doc(db, 'office_projects', effectiveProjectId));
          if (docSnap.exists()) {
            loadedProject = { projectId: docSnap.id, ...docSnap.data() } as Project;
          }
        }

        if (!isMounted) return;

        if (loadedProject) {
          setProject(loadedProject);

          // Find client profile
          let clientData = null;
          if (loadedProject.clientId) {
            clientData = profiles.find(p => p.id === loadedProject?.clientId) ||
                         cvProfiles.find(p => p.id === loadedProject?.clientId);
            if (!clientData) {
              try {
                const cSnap = await getDoc(doc(db, 'company_profiles', loadedProject.clientId));
                if (cSnap.exists()) {
                  clientData = { id: cSnap.id, ...cSnap.data() };
                } else {
                  const cvSnap = await getDoc(doc(db, 'cv_profiles', loadedProject.clientId));
                  if (cvSnap.exists()) {
                    clientData = { id: cvSnap.id, ...cvSnap.data() };
                  }
                }
              } catch (err) {
                console.warn("Client profile lookup error:", err);
              }
            }
          }

          if (clientData) {
            setClientProfile(clientData);
          }

          // Initialize PPAT Base Data from project or construct from client profile
          let baseData: PPATData = loadedProject.ppatData ? { ...loadedProject.ppatData } : {
            transactionType: loadedProject.projectType || 'Akta Jual Beli (AJB)',
            firstParties: [],
            secondParties: [],
            object: {},
            notes: '',
            documents: []
          };

          // If firstParties empty, prefill from client / snapshot
          if (!baseData.firstParties || baseData.firstParties.length === 0) {
            const snap = (loadedProject.clientSnapshot as any) || clientData || {};
            const isCorp = Boolean(snap?.companyType && snap.companyType !== 'PERORANGAN') || Boolean(snap?.namaCV);
            const clientName = snap?.companyName || snap?.namaCV || snap?.name || loadedProject.title || '';
            const rep = (snap?.newManagementItems && snap.newManagementItems[0]) || 
                        (snap?.shareholders && snap.shareholders[0]) || null;

            const initFirstParty: PPATParty = {
              id: 'party_1_' + Math.random().toString(36).substring(7),
              name: clientName,
              isLegalEntity: isCorp,
              companyName: isCorp ? clientName : undefined,
              companyAddress: isCorp ? (snap?.fullAddress || '') : undefined,
              companyNib: isCorp ? (snap?.npwp || snap?.nib || '') : undefined,
              companyNpwp: isCorp ? (snap?.npwp || '') : undefined,
              address: snap?.fullAddress || snap?.address || '',
              phone: snap?.phoneNumber || snap?.phone || '',
              rt: snap?.newAddress?.rt || snap?.oldAddress?.rt || '',
              rw: snap?.newAddress?.rw || snap?.oldAddress?.rw || '',
              village: snap?.newAddress?.kelurahan || snap?.oldAddress?.kelurahan || '',
              district: snap?.newAddress?.kecamatan || snap?.oldAddress?.kecamatan || '',
              city: snap?.domicile || snap?.city || 'Bandung Barat',
              representativeName: isCorp && rep ? rep.name : '',
              representativeTitle: isCorp && rep ? (rep.position || 'Direktur') : (isCorp ? 'Direktur' : '')
            };

            baseData.firstParties = [initFirstParty];
          }

          if (!baseData.secondParties || baseData.secondParties.length === 0) {
            baseData.secondParties = [{
              id: 'party_2_' + Math.random().toString(36).substring(7),
              name: '',
              isLegalEntity: false,
              nik: '',
              address: '',
              job: ''
            }];
          }

          if (!baseData.object) {
            baseData.object = {};
          }

          setPpatData(baseData);

          // Now determine active document to edit
          const existingDocs = baseData.documents || [];
          let targetDoc: PPATDocumentItem | null = null;

          if (effectiveDocId && effectiveDocId !== 'new') {
            targetDoc = existingDocs.find(d => d.id === effectiveDocId) || null;
          }

          if (targetDoc) {
            const normDocType = targetDoc.documentType || targetDoc.typeId || 'akta_ajb';
            const normTypeId = targetDoc.typeId || targetDoc.documentType || normDocType;
            const matchedCfg = PPAT_DOC_TYPES.find(t => t.id === normDocType || t.id === normTypeId);

            setDocItem({
              ...targetDoc,
              documentType: normDocType,
              typeId: normTypeId,
              title: targetDoc.title || matchedCfg?.defaultTitle || matchedCfg?.title || 'Dokumen PPAT',
              category: targetDoc.category || matchedCfg?.category || 'surat'
            });
          } else {
            // Priority: 1. URL type, 2. projectType match, 3. PPAT_DOC_TYPES[0]
            const requestedDocType = urlDocType
              ? PPAT_DOC_TYPES.find(t => t.id === urlDocType)
              : null;

            const matchedType =
              requestedDocType ||
              PPAT_DOC_TYPES.find(t =>
                t.title.toLowerCase().includes((loadedProject?.projectType || '').toLowerCase()) ||
                (loadedProject?.projectType || '').toLowerCase().includes(t.title.toLowerCase())
              ) ||
              PPAT_DOC_TYPES[0];

            const newDoc: PPATDocumentItem = {
              id: effectiveDocId && effectiveDocId !== 'new' ? effectiveDocId : 'ppat_doc_' + Math.random().toString(36).substring(2, 9),
              documentType: matchedType.id,
              typeId: matchedType.id,
              title: matchedType.defaultTitle || matchedType.title,
              category: matchedType.category,
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              letterDate: new Date().toISOString().split('T')[0],
              letterLocation: baseData.object?.city || 'Kabupaten Bandung Barat',
              specificData: {}
            };
            setDocItem(newDoc);
          }
        }
      } catch (err) {
        console.error("Error loading PPAT project data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [effectiveProjectId, effectiveDocId, urlDocType, projects, profiles, cvProfiles]);

  // First & Second party references for quick access
  const firstParty = ppatData.firstParties?.[0] || { id: 'p1', name: '', isLegalEntity: false, nik: '', address: '', job: '' };
  const secondParty = ppatData.secondParties?.[0] || { id: 'p2', name: '', isLegalEntity: false, nik: '', address: '', job: '' };
  const obj = ppatData.object || {};

  // Handlers for PPAT Document Item
  const handleDocTypeChange = (typeId: string) => {
    const config = PPAT_DOC_TYPES.find(t => t.id === typeId);
    if (!config) return;

    setDocItem(prev => ({
      ...prev,
      documentType: config.id,
      typeId: config.id,
      title: config.defaultTitle || config.title,
      category: config.category
    }));
  };

  const handleUpdateSpecificData = (key: string, value: any) => {
    setDocItem(prev => ({
      ...prev,
      specificData: {
        ...(prev.specificData || {}),
        [key]: value
      }
    }));
  };

  // Handlers for Base Shared Data
  const handleUpdateFirstParty = (index: number, field: keyof PPATParty, value: any) => {
    setPpatData(prev => {
      const parties = [...(prev.firstParties || [])];
      if (!parties[index]) {
        parties[index] = { id: 'p1', name: '', isLegalEntity: false, [field]: value };
      } else {
        parties[index] = { ...parties[index], [field]: value };
      }
      return { ...prev, firstParties: parties };
    });
  };

  const handleUpdateSecondParty = (index: number, field: keyof PPATParty, value: any) => {
    setPpatData(prev => {
      const parties = [...(prev.secondParties || [])];
      if (!parties[index]) {
        parties[index] = { id: 'p2', name: '', isLegalEntity: false, [field]: value };
      } else {
        parties[index] = { ...parties[index], [field]: value };
      }
      return { ...prev, secondParties: parties };
    });
  };

  const handleUpdateObject = (field: keyof PPATObjectData, value: any) => {
    setPpatData(prev => ({
      ...prev,
      object: {
        ...(prev.object || {}),
        [field]: value
      }
    }));
  };

  // Save Document and Sync with Project
  const handleSave = async (targetStatus: 'draft' | 'final' = 'draft') => {
    if (!effectiveProjectId) {
      alert('Gagal menyimpan: Project ID tidak terdeteksi. Silakan buka melalui menu Proyek.');
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const finalDocItem: PPATDocumentItem = {
        ...docItem,
        status: targetStatus,
        updatedAt: nowIso,
        createdAt: docItem.createdAt || nowIso
      };

      // Update documents array in ppatData
      const existingDocs = [...(ppatData.documents || [])];
      const docIndex = existingDocs.findIndex(d => d.id === finalDocItem.id);
      if (docIndex >= 0) {
        existingDocs[docIndex] = finalDocItem;
      } else {
        existingDocs.push(finalDocItem);
      }

      const updatedPpatData: PPATData = {
        ...ppatData,
        documents: existingDocs
      };

      // 1. Update Project in Firestore
      const projectRef = doc(db, 'office_projects', effectiveProjectId);
      await updateDoc(projectRef, sanitizeForFirestore({
        ppatData: updatedPpatData,
        updatedAt: nowIso
      }));

      // 2. Register / Sync Document to Project's documents subcollection
      const clientName = clientProfile?.companyName || clientProfile?.namaCV || clientProfile?.name || project?.title || '';
      const docName = finalDocItem.title.includes(clientName)
        ? finalDocItem.title
        : `${finalDocItem.title} - ${clientName || 'PPAT'}`;

      await ProjectService.addDocument(effectiveProjectId, {
        name: docName,
        type: 'docx',
        url: '/ppat',
        refId: finalDocItem.id,
        uploadedBy: user?.email || userProfile?.name || 'staff_ppat'
      });

      // 3. Record Notification
      if (recordNotification) {
        recordNotification(
          targetStatus === 'final' ? 'Dokumen PPAT Selesai' : 'Draf Dokumen PPAT Disimpan',
          `Dokumen "${docName}" untuk proyek "${project?.title || clientName}" telah berhasil disimpan.`,
          'update_ppat_doc'
        );
      }

      setPpatData(updatedPpatData);
      setDocItem(finalDocItem);

      setSaveSuccessMsg(targetStatus === 'final' ? '✅ Dokumen berhasil difinalisasi dan terhubung ke proyek!' : '✅ Draf dokumen berhasil disimpan.');
      setTimeout(() => setSaveSuccessMsg(null), 3500);

      // Return smoothly to project detail if user requested
      return true;
    } catch (err: any) {
      console.error("Save PPAT Document Error:", err);
      alert('Gagal menyimpan dokumen PPAT: ' + (err.message || err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndReturn = async () => {
    const success = await handleSave(docItem.status || 'draft');
    if (success && effectiveProjectId) {
      if (setSelectedProjectId && setActiveSidebarTab) {
        setSelectedProjectId(effectiveProjectId);
        setActiveSidebarTab('project_detail');
      }
      navigate(`/projects-detail?id=${effectiveProjectId}`);
    }
  };

  const handleBack = () => {
    if (effectiveProjectId) {
      if (setSelectedProjectId && setActiveSidebarTab) {
        setSelectedProjectId(effectiveProjectId);
        setActiveSidebarTab('project_detail');
      }
      navigate(`/projects-detail?id=${effectiveProjectId}`);
    } else {
      if (setActiveSidebarTab) setActiveSidebarTab('projects');
      navigate('/projects');
    }
  };

  const handleDownloadWord = async () => {
    try {
      await generateAnyPPATDocx(docItem, project || { title: 'Proyek PPAT' } as Project, ppatData);
    } catch (err: any) {
      console.error("Download Word error:", err);
      alert('Gagal mengunduh dokumen Word: ' + (err.message || err));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">Memuat formulir dokumen PPAT...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center justify-center shrink-0"
            title="Kembali ke Detail Proyek"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {docItem.category === 'akta' ? 'AKTA PPAT' : 'SURAT PPAT'}
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                docItem.status === 'final'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {docItem.status === 'final' ? 'Status: Selesai / Final' : 'Status: Draf Aktif'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <span>{docItem.title}</span>
              {project?.title && (
                <span className="text-xs font-normal text-slate-500 hidden sm:inline">
                  • {project.title}
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
            title="Pratinjau naskah dokumen"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            <span>Pratinjau</span>
          </button>

          <button
            onClick={handleDownloadWord}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
            title="Unduh file dokumen format Microsoft Word (.docx)"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Unduh Word</span>
          </button>

          <button
            onClick={() => handleSave(docItem.status || 'draft')}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
          </button>

          <button
            onClick={handleSaveAndReturn}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Simpan & Kembali</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-6 pt-3 gap-8 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('document_data')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'document_data'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>Formulir Naskah Dokumen</span>
        </button>

        <button
          onClick={() => setActiveTab('shared_data')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'shared_data'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Data Pihak & Objek Tanah</span>
          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Shared</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'preview'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Pratinjau Teks</span>
        </button>
      </div>

      {/* Tab 1: Specific Document Editor */}
      {activeTab === 'document_data' && (
        <div className="bg-white border border-slate-200 rounded-b-2xl p-6 shadow-xs space-y-6">
          {/* Document Configuration Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Jenis Dokumen PPAT
              </label>
              <select
                value={docItem.typeId}
                onChange={(e) => handleDocTypeChange(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Akta PPAT">
                  {PPAT_DOC_TYPES.filter(t => t.category === 'akta').map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </optgroup>
                <optgroup label="Surat-Surat PPAT">
                  {PPAT_DOC_TYPES.filter(t => t.category === 'surat').map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Judul Dokumen
              </label>
              <input
                type="text"
                value={docItem.title}
                onChange={(e) => setDocItem(prev => ({ ...prev, title: e.target.value }))}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Akta Jual Beli (AJB)"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status Dokumen
              </label>
              <select
                value={docItem.status || 'draft'}
                onChange={(e) => setDocItem(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draf (Penyusunan)</option>
                <option value="final">Selesai / Final (Siap Cetak)</option>
              </select>
            </div>
          </div>

          {/* Form Fields: General Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {docItem.category === 'akta' ? 'Nomor Akta PPAT' : 'Nomor Surat'}
              </label>
              <input
                type="text"
                value={docItem.letterNumber || ''}
                onChange={(e) => setDocItem(prev => ({ ...prev, letterNumber: e.target.value }))}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Misal: 12/2026 atau 05/PPAT-KBB/X/2026"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Pembuatan / Penandatanganan
              </label>
              <input
                type="date"
                value={docItem.letterDate || ''}
                onChange={(e) => setDocItem(prev => ({ ...prev, letterDate: e.target.value }))}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tempat Pembuatan
              </label>
              <input
                type="text"
                value={docItem.letterLocation || ''}
                onChange={(e) => setDocItem(prev => ({ ...prev, letterLocation: e.target.value }))}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Kabupaten Bandung Barat"
              />
            </div>
          </div>

          {/* Conditional Specific Fields by Document Type */}
          {docItem.category === 'akta' ? (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600" />
                <span>Klausul Transaksi & Pembayaran Akta</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nilai / Harga Transaksi (Rp)
                  </label>
                  <input
                    type="text"
                    value={docItem.specificData?.transactionPrice || ppatData.object?.transactionValue || ''}
                    onChange={(e) => {
                      handleUpdateSpecificData('transactionPrice', e.target.value);
                      handleUpdateObject('transactionValue', e.target.value);
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="Contoh: 500.000.000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Terbilang Nilai Transaksi
                  </label>
                  <input
                    type="text"
                    value={docItem.specificData?.transactionPriceWords || ''}
                    onChange={(e) => handleUpdateSpecificData('transactionPriceWords', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Lima Ratus Juta Rupiah"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Metode / Cara Pembayaran
                  </label>
                  <input
                    type="text"
                    value={docItem.specificData?.paymentMethod || 'Tunai / Transfer Lunas pada saat penandatanganan akta ini'}
                    onChange={(e) => handleUpdateSpecificData('paymentMethod', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Saksi I (Staf Kantor Notaris/PPAT)
                  </label>
                  <input
                    type="text"
                    value={docItem.specificData?.witness1Name || ''}
                    onChange={(e) => handleUpdateSpecificData('witness1Name', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama lengkap saksi pertama"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Saksi II (Staf Kantor Notaris/PPAT)
                  </label>
                  <input
                    type="text"
                    value={docItem.specificData?.witness2Name || ''}
                    onChange={(e) => handleUpdateSpecificData('witness2Name', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama lengkap saksi kedua"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Klausul / Catatan Tambahan Khusus
                </label>
                <textarea
                  rows={3}
                  value={docItem.specificData?.specialClauses || ''}
                  onChange={(e) => handleUpdateSpecificData('specialClauses', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  placeholder="Klausul penyerahan fisik tanah, kesepakatan beban pajak, atau ketentuan khusus lainnya..."
                />
              </div>
            </div>
          ) : docItem.documentType === 'pakta_integritas' ? (
            /* Specific Fields for Pakta Integritas */
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-emerald-600" />
                <span>Ketentuan Format Baku Pakta Integritas (Bapenda / PPAT KBB)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jenis Peralihan Hak
                  </label>
                  <select
                    value={docItem.specificData?.transferType || 'Jual Beli'}
                    onChange={(e) => handleUpdateSpecificData('transferType', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Jual Beli">Jual Beli</option>
                    <option value="Hibah">Hibah</option>
                    <option value="Hibah Wasiat">Hibah Wasiat</option>
                    <option value="Waris">Waris</option>
                    <option value="Tukar Menukar">Tukar Menukar</option>
                    <option value="Pemasukan Ke Dalam Perusahaan (Inbreng)">Pemasukan Ke Dalam Perusahaan (Inbreng)</option>
                    <option value="Pemberian Hak Baru">Pemberian Hak Baru</option>
                    <option value="Lelang">Lelang</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Status Pelaksanaan Transaksi
                  </label>
                  <select
                    value={docItem.specificData?.transferStatus || 'akan'}
                    onChange={(e) => handleUpdateSpecificData('transferStatus', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="akan">Akan dilakukan pengalihan hak</option>
                    <option value="telah">Telah dilakukan pengalihan hak</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <p className="font-semibold mb-1">Informasi Format Dokumen Pakta Integritas:</p>
                <p>
                  Seluruh data identitas Pihak I (Penjual/Pelepas Hak), Pihak II (Pembeli/Penerima Hak), serta Objek Tanah diambil langsung secara otomatis dari Data Bersama (Shared Master Data).
                </p>
              </div>
            </div>
          ) : docItem.documentType === 'surat_persetujuan_keluarga' ? (
            /* Specific Fields for Persetujuan Pasangan / Keluarga */
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Data Pasangan / Ahli Waris Pemberi Persetujuan</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Lengkap Pasangan / Ahli Waris
                  </label>
                  <input
                    type="text"
                    value={docItem.specificData?.spouseConsentName || ''}
                    onChange={(e) => handleUpdateSpecificData('spouseConsentName', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama istri / suami sah"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    NIK Pasangan / Ahli Waris
                  </label>
                  <input
                    type="text"
                    value={docItem.specificData?.spouseConsentNik || ''}
                    onChange={(e) => handleUpdateSpecificData('spouseConsentNik', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="16 digit NIK KTP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Hubungan Keluarga
                  </label>
                  <select
                    value={docItem.specificData?.spouseRelation || 'Istri Sah'}
                    onChange={(e) => handleUpdateSpecificData('spouseRelation', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Istri Sah">Istri Sah</option>
                    <option value="Suami Sah">Suami Sah</option>
                    <option value="Ahli Waris Sah">Ahli Waris Sah</option>
                    <option value="Anak Kandung">Anak Kandung</option>
                  </select>
                </div>
              </div>
            </div>
          ) : docItem.documentType === 'surat_kuasa_ppat' ? (
            /* Specific Fields for Surat Kuasa PPAT */
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Penerima Kuasa / Petugas Pengurus PPAT</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Lengkap Penerima Kuasa
                  </label>
                  <input
                    type="text"
                    value={docItem.specificData?.attorneyName || 'STAF KANTOR PPAT NUKANTINI PUTRI PARINCHA, S.H., M.Kn.'}
                    onChange={(e) => handleUpdateSpecificData('attorneyName', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama staf penerima kuasa"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Alamat / Kantor Penerima Kuasa
                  </label>
                  <input
                    type="text"
                    value={docItem.specificData?.attorneyAddress || 'Kantor PPAT Nukantini Putri Parincha, S.H., M.Kn.'}
                    onChange={(e) => handleUpdateSpecificData('attorneyAddress', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Specific Fields for General Surat Pernyataan */
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Isi dan Klausul Surat Pernyataan</span>
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Maksud / Keperluan Surat
                </label>
                <input
                  type="text"
                  value={docItem.specificData?.purpose || ''}
                  onChange={(e) => handleUpdateSpecificData('purpose', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Persyaratan Pengecekan Sertipikat dan Balik Nama di Kantor Pertanahan KBB"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Poin-Poin Pernyataan Tambahan
                </label>
                <textarea
                  rows={4}
                  value={docItem.specificData?.customStatement || ''}
                  onChange={(e) => handleUpdateSpecificData('customStatement', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                  placeholder="1. Bahwa tanah tersebut diperoleh secara sah...&#10;2. Bahwa sampai saat ini tanah tidak dalam sengketa atau sitaan..."
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Shared Base Data (Pihak & Objek) */}
      {activeTab === 'shared_data' && (
        <div className="bg-white border border-slate-200 rounded-b-2xl p-6 shadow-xs space-y-6">
          {/* Sub Tab Navigation */}
          <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
            <button
              onClick={() => setSharedSubTab('firstParty')}
              className={`pb-2 border-b-2 transition-all ${
                sharedSubTab === 'firstParty'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Pihak Pertama (Penjual / Pemberi Hak)
            </button>
            <button
              onClick={() => setSharedSubTab('secondParty')}
              className={`pb-2 border-b-2 transition-all ${
                sharedSubTab === 'secondParty'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Pihak Kedua (Pembeli / Penerima Hak)
            </button>
            <button
              onClick={() => setSharedSubTab('object')}
              className={`pb-2 border-b-2 transition-all ${
                sharedSubTab === 'object'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Objek Tanah & Sertipikat
            </button>
          </div>

          {/* SubTab 1: Pihak Pertama */}
          {sharedSubTab === 'firstParty' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-850">
                  Data Pihak Pertama (Penjual / Pemilik Hak Asal)
                </h4>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(firstParty.isLegalEntity)}
                    onChange={(e) => handleUpdateFirstParty(0, 'isLegalEntity', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pihak Merupakan Badan Usaha / PT / CV / Koperasi</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {firstParty.isLegalEntity ? 'Nama Perusahaan / Badan' : 'Nama Lengkap'}
                  </label>
                  <input
                    type="text"
                    value={firstParty.name || ''}
                    onChange={(e) => handleUpdateFirstParty(0, 'name', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama lengkap atau PT"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {firstParty.isLegalEntity ? 'NPWP / NIB Badan' : 'NIK (KTP)'}
                  </label>
                  <input
                    type="text"
                    value={firstParty.nik || firstParty.companyNpwp || ''}
                    onChange={(e) => {
                      handleUpdateFirstParty(0, 'nik', e.target.value);
                      if (firstParty.isLegalEntity) handleUpdateFirstParty(0, 'companyNpwp', e.target.value);
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="16 digit NIK atau NPWP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pekerjaan / Jabatan
                  </label>
                  <input
                    type="text"
                    value={firstParty.job || ''}
                    onChange={(e) => handleUpdateFirstParty(0, 'job', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Karyawan Swasta / Wiraswasta"
                  />
                </div>
              </div>

              {firstParty.isLegalEntity && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div>
                    <label className="block text-xs font-medium text-blue-900 mb-1">
                      Nama Pejabat Yang Mewakili (Direktur / Kuasa)
                    </label>
                    <input
                      type="text"
                      value={firstParty.representativeName || ''}
                      onChange={(e) => handleUpdateFirstParty(0, 'representativeName', e.target.value)}
                      className="w-full text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nama direktur penandatangan"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-blue-900 mb-1">
                      Jabatan Representatif
                    </label>
                    <input
                      type="text"
                      value={firstParty.representativeTitle || 'Direktur Utama'}
                      onChange={(e) => handleUpdateFirstParty(0, 'representativeTitle', e.target.value)}
                      className="w-full text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat Lengkap KTP / Domisili
                </label>
                <textarea
                  rows={2}
                  value={firstParty.address || ''}
                  onChange={(e) => handleUpdateFirstParty(0, 'address', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jalan, Nomor, RT, RW, Kelurahan, Kecamatan, Kota/Kabupaten"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">RT / RW</label>
                  <input
                    type="text"
                    value={firstParty.rt && firstParty.rw ? `${firstParty.rt} / ${firstParty.rw}` : (firstParty.rt || firstParty.rw || '')}
                    onChange={(e) => {
                      const parts = e.target.value.split('/');
                      handleUpdateFirstParty(0, 'rt', parts[0]?.trim() || '');
                      handleUpdateFirstParty(0, 'rw', parts[1]?.trim() || '');
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    placeholder="001 / 005"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Kelurahan / Desa</label>
                  <input
                    type="text"
                    value={firstParty.village || ''}
                    onChange={(e) => handleUpdateFirstParty(0, 'village', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={firstParty.district || ''}
                    onChange={(e) => handleUpdateFirstParty(0, 'district', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={firstParty.city || ''}
                    onChange={(e) => handleUpdateFirstParty(0, 'city', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SubTab 2: Pihak Kedua */}
          {sharedSubTab === 'secondParty' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-850">
                  Data Pihak Kedua (Pembeli / Penerima Hak)
                </h4>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(secondParty.isLegalEntity)}
                    onChange={(e) => handleUpdateSecondParty(0, 'isLegalEntity', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pihak Merupakan Badan Usaha / PT / CV / Koperasi</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {secondParty.isLegalEntity ? 'Nama Perusahaan / Badan' : 'Nama Lengkap'}
                  </label>
                  <input
                    type="text"
                    value={secondParty.name || ''}
                    onChange={(e) => handleUpdateSecondParty(0, 'name', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama lengkap pembeli"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {secondParty.isLegalEntity ? 'NPWP / NIB Badan' : 'NIK (KTP)'}
                  </label>
                  <input
                    type="text"
                    value={secondParty.nik || secondParty.companyNpwp || ''}
                    onChange={(e) => {
                      handleUpdateSecondParty(0, 'nik', e.target.value);
                      if (secondParty.isLegalEntity) handleUpdateSecondParty(0, 'companyNpwp', e.target.value);
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="16 digit NIK atau NPWP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pekerjaan / Jabatan
                  </label>
                  <input
                    type="text"
                    value={secondParty.job || ''}
                    onChange={(e) => handleUpdateSecondParty(0, 'job', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Karyawan Swasta / Wiraswasta"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alamat Lengkap KTP / Domisili
                </label>
                <textarea
                  rows={2}
                  value={secondParty.address || ''}
                  onChange={(e) => handleUpdateSecondParty(0, 'address', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jalan, Nomor, RT, RW, Kelurahan, Kecamatan, Kota/Kabupaten"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">RT / RW</label>
                  <input
                    type="text"
                    value={secondParty.rt && secondParty.rw ? `${secondParty.rt} / ${secondParty.rw}` : (secondParty.rt || secondParty.rw || '')}
                    onChange={(e) => {
                      const parts = e.target.value.split('/');
                      handleUpdateSecondParty(0, 'rt', parts[0]?.trim() || '');
                      handleUpdateSecondParty(0, 'rw', parts[1]?.trim() || '');
                    }}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    placeholder="001 / 005"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Kelurahan / Desa</label>
                  <input
                    type="text"
                    value={secondParty.village || ''}
                    onChange={(e) => handleUpdateSecondParty(0, 'village', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={secondParty.district || ''}
                    onChange={(e) => handleUpdateSecondParty(0, 'district', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={secondParty.city || ''}
                    onChange={(e) => handleUpdateSecondParty(0, 'city', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SubTab 3: Objek Tanah */}
          {sharedSubTab === 'object' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-850">
                Data Objek Tanah, Bangunan & Sertipikat
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jenis Hak Atas Tanah
                  </label>
                  <select
                    value={obj.certificateType || 'Hak Milik (SHM)'}
                    onChange={(e) => handleUpdateObject('certificateType', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  >
                    <option value="Hak Milik (SHM)">Hak Milik (SHM)</option>
                    <option value="Hak Guna Bangunan (HGB)">Hak Guna Bangunan (HGB)</option>
                    <option value="Hak Pakai">Hak Pakai</option>
                    <option value="Hak Milik Atas Satuan Rumah Susun (HMSRS)">HMSRS</option>
                    <option value="Tanah Adat / Girik / Petok">Tanah Adat / Girik</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nomor Sertipikat / Hak
                  </label>
                  <input
                    type="text"
                    value={obj.certificateNumber || ''}
                    onChange={(e) => handleUpdateObject('certificateNumber', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono"
                    placeholder="Contoh: SHM No. 1234/Lembang"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    NIB (Nomor Identifikasi Bidang)
                  </label>
                  <input
                    type="text"
                    value={obj.nib || ''}
                    onChange={(e) => handleUpdateObject('nib', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono"
                    placeholder="13 digit NIB"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    NOP PBB (Nomor Objek Pajak)
                  </label>
                  <input
                    type="text"
                    value={obj.nop || ''}
                    onChange={(e) => handleUpdateObject('nop', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-mono"
                    placeholder="32.XX.XXX.XXX.XXX-XXXX.X"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Luas Tanah (M²)
                  </label>
                  <input
                    type="text"
                    value={obj.landArea || ''}
                    onChange={(e) => handleUpdateObject('landArea', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    placeholder="Contoh: 250 m2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Luas Bangunan (M²)
                  </label>
                  <input
                    type="text"
                    value={obj.buildingArea || ''}
                    onChange={(e) => handleUpdateObject('buildingArea', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    placeholder="Contoh: 150 m2 (jika ada)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Atas Nama Pemegang Hak (Sertipikat)
                  </label>
                  <input
                    type="text"
                    value={obj.holderName || firstParty.name || ''}
                    onChange={(e) => handleUpdateObject('holderName', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                    placeholder="Nama yang tercantum di buku tanah"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Letak / Alamat Lokasi Tanah
                </label>
                <textarea
                  rows={2}
                  value={obj.location || ''}
                  onChange={(e) => handleUpdateObject('location', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 text-slate-800"
                  placeholder="Jalan, Blok, Kampung, Desa/Kelurahan, Kecamatan, Kabupaten/Kota"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Batas Sebelah Utara</label>
                  <input
                    type="text"
                    value={obj.boundaries?.north || ''}
                    onChange={(e) => handleUpdateObject('boundaries', { ...(obj.boundaries || {}), north: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    placeholder="Contoh: Tanah Milik Bapak A"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Batas Sebelah Timur</label>
                  <input
                    type="text"
                    value={obj.boundaries?.east || ''}
                    onChange={(e) => handleUpdateObject('boundaries', { ...(obj.boundaries || {}), east: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    placeholder="Contoh: Jalan Desa"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Batas Sebelah Selatan</label>
                  <input
                    type="text"
                    value={obj.boundaries?.south || ''}
                    onChange={(e) => handleUpdateObject('boundaries', { ...(obj.boundaries || {}), south: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    placeholder="Contoh: Saluran Air"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Batas Sebelah Barat</label>
                  <input
                    type="text"
                    value={obj.boundaries?.west || ''}
                    onChange={(e) => handleUpdateObject('boundaries', { ...(obj.boundaries || {}), west: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5"
                    placeholder="Contoh: Tanah Milik Ibu B"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Text Preview */}
      {activeTab === 'preview' && (
        <div className="bg-white border border-slate-200 rounded-b-2xl p-8 shadow-xs space-y-6">
          <div className="max-w-3xl mx-auto space-y-6 text-slate-800 text-sm leading-relaxed border p-8 rounded-xl shadow-xs bg-slate-50/40">
            <div className="text-center space-y-1 pb-4 border-b border-slate-300">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900">
                {docItem.title}
              </h2>
              {docItem.letterNumber && (
                <p className="text-xs font-mono text-slate-600">
                  Nomor: {docItem.letterNumber}
                </p>
              )}
            </div>

            <p>
              Pada hari ini, tanggal <strong>{docItem.letterDate || '...'}</strong>, bertempat di <strong>{docItem.letterLocation || 'Kabupaten Bandung Barat'}</strong>, kami yang bertanda tangan di bawah ini:
            </p>

            <div className="pl-4 space-y-2 border-l-2 border-blue-400">
              <p><strong>I. PIHAK PERTAMA (PENJUAL / PEMBERI HAK):</strong></p>
              <p>Nama: <strong>{firstParty.name || '(Nama Pihak Pertama)'}</strong></p>
              <p>Identitas: {firstParty.isLegalEntity ? `NPWP/NIB: ${firstParty.companyNpwp || '-'}` : `NIK: ${firstParty.nik || '-'}`}</p>
              <p>Alamat: {firstParty.address || '-'}</p>
              {firstParty.isLegalEntity && firstParty.representativeName && (
                <p className="text-xs text-blue-700">Didaftarkan & diwakili sah oleh: {firstParty.representativeName} ({firstParty.representativeTitle || 'Direktur'})</p>
              )}
            </div>

            <div className="pl-4 space-y-2 border-l-2 border-emerald-400">
              <p><strong>II. PIHAK KEDUA (PEMBELI / PENERIMA HAK):</strong></p>
              <p>Nama: <strong>{secondParty.name || '(Nama Pihak Kedua)'}</strong></p>
              <p>Identitas: {secondParty.isLegalEntity ? `NPWP/NIB: ${secondParty.companyNpwp || '-'}` : `NIK: ${secondParty.nik || '-'}`}</p>
              <p>Alamat: {secondParty.address || '-'}</p>
            </div>

            <div className="space-y-2 pt-2">
              <p className="font-bold text-slate-900">OBJEK TRANSAKSI / HAK ATAS TANAH:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
                <li>Jenis Hak: {obj.certificateType || 'Hak Milik (SHM)'}</li>
                <li>Nomor Sertipikat: {obj.certificateNumber || '-'}</li>
                <li>NIB / NOP: {obj.nib || '-'} / {obj.nop || '-'}</li>
                <li>Luas Tanah / Bangunan: {obj.landArea || '-'} / {obj.buildingArea || '-'}</li>
                <li>Letak Tanah: {obj.location || '-'}</li>
                {obj.boundaries && (
                  <li>Batas-Batas: U: {obj.boundaries.north || '-'}, T: {obj.boundaries.east || '-'}, S: {obj.boundaries.south || '-'}, B: {obj.boundaries.west || '-'}</li>
                )}
              </ul>
            </div>

            {docItem.category === 'akta' && (
              <div className="space-y-2 pt-2">
                <p className="font-bold text-slate-900">NILAI KESEPAKATAN:</p>
                <p className="text-xs text-slate-700">
                  Harga disepakati sebesar: <strong>Rp {docItem.specificData?.transactionPrice || obj.transactionValue || '0'}</strong> ({docItem.specificData?.transactionPriceWords || '-'}), dibayarkan dengan metode: {docItem.specificData?.paymentMethod || 'Tunai/Lunas'}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal Component */}
      {showPreviewModal && (
        <PPATDocumentPreviewModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          documentItem={docItem}
          project={project || { title: 'Proyek PPAT' } as Project}
          ppatData={ppatData}
        />
      )}
    </div>
  );
};

export default PPATPage;
