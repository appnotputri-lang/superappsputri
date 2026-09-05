import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Project, PPATData, PPATDocumentItem, PPATParty } from '../../../domain/project/Project';
import { ProjectService } from '../../../services/ProjectService';
import { PPAT_DOC_TYPES } from '../../project-engine/components/ppat/ppatDocTypes';
import { PPATDocumentEditor } from '../../project-engine/components/ppat/PPATDocumentEditor';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
  cvProfiles = []
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract query params
  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlProjectId = urlParams.get('projectId');
  const urlDocId = urlParams.get('id');
  const urlDocType = urlParams.get('type');

  const effectiveProjectId = activeProjectContext || urlProjectId || null;
  const effectiveDocId = editingPPATId || urlDocId || null;

  const [loading, setLoading] = useState<boolean>(true);
  const [project, setProject] = useState<Project | null>(null);
  const [clientProfile, setClientProfile] = useState<any>(null);

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

  const handleSaveFromEditor = async (savedDoc: PPATDocumentItem, updatedPPATData: PPATData) => {
    if (!effectiveProjectId) {
      alert('Gagal menyimpan: ID Proyek tidak valid.');
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const projectRef = doc(db, 'office_projects', effectiveProjectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        alert(`Dokumen proyek (${effectiveProjectId}) tidak ditemukan di database.`);
        return;
      }
      await setDoc(projectRef, sanitizeForFirestore({
        ppatData: updatedPPATData,
        updatedAt: nowIso
      }), { merge: true });

      // Register / Sync Document to Project's documents subcollection
      const clientName = clientProfile?.companyName || clientProfile?.namaCV || clientProfile?.name || project?.title || '';
      const docName = savedDoc.title.includes(clientName)
        ? savedDoc.title
        : `${savedDoc.title} - ${clientName || 'PPAT'}`;

      await ProjectService.addDocument(effectiveProjectId, {
        name: docName,
        type: 'docx',
        url: '/ppat',
        refId: savedDoc.id,
        uploadedBy: user?.email || userProfile?.name || 'staff_ppat'
      });

      // Record Notification
      if (recordNotification) {
        recordNotification(
          savedDoc.status === 'final' ? 'Dokumen PPAT Selesai' : 'Draf Dokumen PPAT Disimpan',
          `Dokumen "${docName}" untuk proyek "${project?.title || clientName}" telah berhasil disimpan.`,
          'update_ppat_doc'
        );
      }

      setPpatData(updatedPPATData);
      setDocItem(savedDoc);
    } catch (err: any) {
      console.error("Save PPAT Document Error:", err);
      alert('Gagal menyimpan dokumen PPAT: ' + (err.message || err));
      throw err;
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

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">Memuat formulir dokumen PPAT...</p>
      </div>
    );
  }

  const effectiveProject: Project = project || {
    projectId: effectiveProjectId || 'ppat_proj_temp',
    title: 'Dokumen PPAT',
    projectType: docItem.title,
    currentStep: 'Draft',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ppatData: ppatData
  } as Project;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <PPATDocumentEditor
        project={effectiveProject}
        initialDoc={docItem}
        currentUser={user || userProfile}
        onBack={handleBack}
        onSave={handleSaveFromEditor}
      />
    </div>
  );
};

export default PPATPage;
