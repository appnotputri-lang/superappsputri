import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageContainer, PageHeader } from '../../../components/ui/PageLayout';
import { MobileHeader, MobileEmptyState } from '../../../components/ui/MobileHeader';
import { Project, ClientSnapshot } from '../../../domain/project/Project';
import { ProjectService, isProjectCompletedStatus } from '../../../services/ProjectService';
import { UserProfile, CompanyProfile } from '../../../../types';
import { Workflow } from '../../../domain/project/Workflow';
import { WorkflowService } from '../../../services/WorkflowService';
import { CompanyService } from '../../../services/CompanyService';
import { getApiUrl, getAuthHeaders } from '../../../lib/api';
import { Plus, Search, Filter, Briefcase, User, Calendar, ExternalLink, Loader2, ArrowRight, Trash2, AlertCircle, MessageSquare, CheckSquare } from 'lucide-react';
import { AppLoader } from '../../../components/ui/AppLoader';
import { SearchableClientSelect } from '../../../components/common/SearchableClientSelect';
import { ProjectCategory, PROJECT_TYPES, MEETING_SUBJECTS } from '../../../constants/appConstants';
import {
  ProjectActivityFeed,
  AddActivityModal,
  ActivityTimelineModal,
  ProjectTasksModal
} from './ProjectActivityComponents';
import { ProjectHorizontalCard } from './ProjectHorizontalCard';

const formatCompanyNameWithType = (name: string, clientType?: string) => {
  if (!name) return '';
  if (!clientType) return name;

  const typeMap: Record<string, string> = {
    PT: 'PT',
    CV: 'CV',
    YAYASAN: 'Yayasan',
    PERKUMPULAN: 'Perkumpulan',
    PERSEKUTUAN_FIRMA: 'Firma',
    PERSEKUTUAN_PERDATA: 'Persekutuan Perdata',
    KOPERASI: 'Koperasi',
    PMA: 'PMA',
    PERORANGAN: 'Perorangan',
  };

  const prefix = typeMap[clientType];
  if (!prefix) return name;

  const trimmedName = name.trim();
  const lowerName = trimmedName.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();

  if (
    lowerName.startsWith(lowerPrefix + ' ') ||
    lowerName.startsWith(lowerPrefix + '.') ||
    lowerName === lowerPrefix
  ) {
    return trimmedName;
  }

  return `${prefix} ${trimmedName}`;
};

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  currentUser: UserProfile | null;
}

export default function ProjectList({ onSelectProject, currentUser }: ProjectListProps) {
  // Single Source of Truth Realtime Projects State
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<{ uid: string; name: string }[]>([]);

  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [modalProfiles, setModalProfiles] = useState<CompanyProfile[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>(() => WorkflowService.getStaticWorkflows());

  // Filter States
  const [activeTab, setActiveTab] = useState<'aktif' | 'minuta' | 'selesai'>('aktif');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterJobType, setFilterJobType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Pagination States (20 items per page limit)
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Activity / Tasks Modal States
  const [selectedProjectForModal, setSelectedProjectForModal] = useState<Project | null>(null);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);

  const handleOpenAddActivity = (project: Project) => {
    setSelectedProjectForModal(project);
    setIsAddActivityOpen(true);
  };

  const handleOpenTimeline = (project: Project) => {
    setSelectedProjectForModal(project);
    setIsTimelineOpen(true);
  };

  const handleOpenTasks = (project: Project) => {
    setSelectedProjectForModal(project);
    setIsTasksOpen(true);
  };

  const updateLocalProjectState = (updatedProj: Project) => {
    setAllProjects(prev => prev.map(p => p.projectId === updatedProj.projectId ? updatedProj : p));
    if (selectedProjectForModal?.projectId === updatedProj.projectId) {
      setSelectedProjectForModal(updatedProj);
    }
  };

  const handleSubmitActivityComment = async (message: string, mentions: string[]) => {
    if (!selectedProjectForModal) return;
    const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Staff Notaris';
    const userId = currentUser?.uid || 'user-1';

    const newAct = await ProjectService.addProjectActivity(selectedProjectForModal.projectId, {
      type: 'comment',
      message,
      userId,
      userName,
      mentions
    });

    const currentActs = selectedProjectForModal.activities || [];
    const updatedActivities = [newAct, ...currentActs];
    const updatedCount = (selectedProjectForModal.activitiesCount || currentActs.length) + 1;

    const updatedProject: Project = {
      ...selectedProjectForModal,
      activities: updatedActivities,
      activitiesCount: updatedCount
    };

    updateLocalProjectState(updatedProject);
  };

  const handleSubmitActivityTask = async (taskData: { title: string; assignedTo: string; assignedToName: string; deadline: string; description: string }) => {
    if (!selectedProjectForModal) return;
    const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Staff Notaris';
    const userId = currentUser?.uid || 'user-1';

    const newTask = await ProjectService.addProjectTaskItem(selectedProjectForModal.projectId, {
      ...taskData,
      user: { uid: userId, name: userName }
    });

    const currentTasks = selectedProjectForModal.tasks || [];
    const updatedTasks = [newTask, ...currentTasks];
    const activeCount = updatedTasks.filter(t => t.status === 'open').length;

    const createdAct = {
      id: Math.random().toString(),
      projectId: selectedProjectForModal.projectId,
      type: 'task_created' as const,
      message: `Membuat tugas baru: "${newTask.title}"${newTask.assignedToName ? ` untuk ${newTask.assignedToName}` : ''}`,
      userId,
      userName,
      createdAt: new Date().toISOString()
    };

    const currentActs = selectedProjectForModal.activities || [];
    const updatedActivities = [createdAct, ...currentActs];
    const updatedCount = (selectedProjectForModal.activitiesCount || currentActs.length) + 1;

    const updatedProject: Project = {
      ...selectedProjectForModal,
      tasks: updatedTasks,
      activeTasksCount: activeCount,
      activities: updatedActivities,
      activitiesCount: updatedCount
    };

    updateLocalProjectState(updatedProject);
  };

  const handleSubmitActivityIssue = async (message: string) => {
    if (!selectedProjectForModal) return;
    const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Staff Notaris';
    const userId = currentUser?.uid || 'user-1';

    const newAct = await ProjectService.addProjectActivity(selectedProjectForModal.projectId, {
      type: 'issue',
      message,
      userId,
      userName
    });

    const currentActs = selectedProjectForModal.activities || [];
    const updatedActivities = [newAct, ...currentActs];
    const updatedCount = (selectedProjectForModal.activitiesCount || currentActs.length) + 1;

    const updatedProject: Project = {
      ...selectedProjectForModal,
      activities: updatedActivities,
      activitiesCount: updatedCount
    };

    updateLocalProjectState(updatedProject);
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: 'open' | 'completed') => {
    if (!selectedProjectForModal) return;
    const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Staff Notaris';
    const userId = currentUser?.uid || 'user-1';

    const newStatus = await ProjectService.toggleProjectTaskItem(
      selectedProjectForModal.projectId,
      taskId,
      currentStatus,
      { uid: userId, name: userName }
    );

    const currentTasks = selectedProjectForModal.tasks || [];
    const updatedTasks = currentTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    const activeCount = updatedTasks.filter(t => t.status === 'open').length;

    let updatedActivities = selectedProjectForModal.activities || [];
    let updatedCount = selectedProjectForModal.activitiesCount || updatedActivities.length;

    if (newStatus === 'completed') {
      const taskObj = currentTasks.find(t => t.id === taskId);
      const completeAct = {
        id: Math.random().toString(),
        projectId: selectedProjectForModal.projectId,
        type: 'task_completed' as const,
        message: `Menyelesaikan tugas: "${taskObj?.title || 'Tugas'}"`,
        userId,
        userName,
        createdAt: new Date().toISOString()
      };
      updatedActivities = [completeAct, ...updatedActivities];
      updatedCount += 1;
    }

    const updatedProject: Project = {
      ...selectedProjectForModal,
      tasks: updatedTasks,
      activeTasksCount: activeCount,
      activities: updatedActivities,
      activitiesCount: updatedCount
    };

    updateLocalProjectState(updatedProject);
  };

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  const directActionHandledRef = useRef<string | null>(null);

  useEffect(() => {
    const isDirectAction = (location.state as any)?.openCreateModal || location.search.includes('action=new') || location.search.includes('create=true');
    const actionKey = `${location.pathname}_${location.search}_${location.key}`;
    if (isDirectAction && directActionHandledRef.current !== actionKey) {
      directActionHandledRef.current = actionKey;
      setIsModalOpen(true);
    }
  }, [location]);

  const [newProjectData, setNewProjectData] = useState({
    clientId: '',
    projectCategory: '' as ProjectCategory | '',
    projectType: '',
    meetingSubject: '',
    projectDate: new Date().toISOString().substring(0, 10),
    assignedTo: '',
    status: '',
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Search client directory handlers
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const modalProfilesRef = React.useRef<CompanyProfile[]>([]);
  const selectedClientIdRef = React.useRef<string>('');
  const clientCacheRef = React.useRef<Record<string, CompanyProfile[]>>({});

  // Sync refs with state
  useEffect(() => {
    modalProfilesRef.current = modalProfiles;
  }, [modalProfiles]);

  useEffect(() => {
    selectedClientIdRef.current = newProjectData.clientId;
  }, [newProjectData.clientId]);

  const findCachedProfile = (clientId: string): CompanyProfile | undefined => {
    // 1. Look in modalProfiles
    const modalMatch = modalProfiles.find(p => p.id === clientId);
    if (modalMatch) return modalMatch;

    // 2. Look in clientCacheRef values
    for (const cachedList of Object.values(clientCacheRef.current)) {
      const match = cachedList.find(p => p.id === clientId);
      if (match) return match;
    }

    return undefined;
  };

  const executeClientSearch = async (queryStr: string) => {
    const cacheKey = queryStr.toLowerCase().trim();
    if (clientCacheRef.current[cacheKey]) {
      const cached = clientCacheRef.current[cacheKey];
      const currentlySelected = modalProfilesRef.current.find(p => p.id === selectedClientIdRef.current);
      const merged = [...cached];
      if (currentlySelected && !cached.some(r => r.id === currentlySelected.id)) {
        merged.unshift(currentlySelected);
      }
      setModalProfiles(merged);
      return;
    }

    try {
      const headers = await getAuthHeaders();
      let url = getApiUrl('/api/clients?limit=15');
      if (cacheKey) {
        url = getApiUrl(`/api/clients/search?q=${encodeURIComponent(queryStr)}&limit=15`);
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`D1 API returned status ${response.status}`);
      }
      const data = await response.json() as any;
      const results = data.clients || [];

      const mapped = results.map((d: any) => ({
        id: d.id,
        companyName: d.companyName,
        clientType: d.clientType,
        companyType: d.companyType || d.clientType || 'PT_LOKAL',
        domicile: d.domicile,
        establishmentDeedDate: d.establishmentDeedDate,
        updatedAt: d.updatedAt,
        isArchived: d.isArchived,
        npwp: d.npwp,
        kbliItems: (d.kbliItems || []).map((k: any) => ({
          id: k.code || k.id || Math.random().toString(),
          code: k.code || '',
          name: k.name || '',
          description: k.description || '',
          categoryLetter: k.categoryLetter || '',
          categoryName: k.categoryName || ''
        }))
      } as CompanyProfile));

      // Save to cache
      clientCacheRef.current[cacheKey] = mapped;

      // Preserve currently selected client to avoid layout/selection glitch
      const currentlySelected = modalProfilesRef.current.find(p => p.id === selectedClientIdRef.current);
      const merged = [...mapped];
      if (currentlySelected && !mapped.some(r => r.id === currentlySelected.id)) {
        merged.unshift(currentlySelected);
      }

      setModalProfiles(merged);
    } catch (e) {
      console.warn("[ProjectList] D1 client search error:", e);
    }
  };

  const handleSearchClients = React.useCallback((queryStr: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmedQuery = queryStr.trim();

    if (!trimmedQuery) {
      executeClientSearch("");
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeClientSearch(trimmedQuery);
    }, 300);
  }, []);

  const selectedClient = modalProfiles.find((c) => c.id === newProjectData.clientId);
  const clientTypeRaw = selectedClient?.clientType;

  const getClientTypeGroup = (clientType?: string): 'PT' | 'CV' | 'FIRMA' | 'YAYASAN' | 'PERKUMPULAN' | 'PERSONAL' => {
    if (!clientType) return 'PERSONAL';
    const type = clientType.toUpperCase();
    if (type === 'PT' || type === 'PMA') return 'PT';
    if (type === 'CV') return 'CV';
    if (type === 'PERSEKUTUAN_FIRMA' || type === 'PERSEKUTUAN_PERDATA' || type === 'FIRMA') return 'FIRMA';
    if (type === 'YAYASAN') return 'YAYASAN';
    if (type === 'PERKUMPULAN') return 'PERKUMPULAN';
    return 'PERSONAL';
  };

  const clientTypeGroup = getClientTypeGroup(clientTypeRaw);

  const getAvailableProjectTypes = (): string[] => {
    const category = newProjectData.projectCategory;
    if (!category) return [];

    if (category === 'BODY_LEGAL') {
      if (clientTypeGroup === 'PT') {
        return ['Pendirian PT', 'RUPST', 'RUPS-LB', 'PKPS RUPST', 'PKPS RUPS-LB'];
      }
      if (clientTypeGroup === 'CV') {
        return ['Pendirian CV', 'Perubahan CV', 'Pembubaran CV'];
      }
      if (clientTypeGroup === 'FIRMA') {
        return ['Pendirian Firma', 'Perubahan Firma', 'Pembubaran Firma'];
      }
      if (clientTypeGroup === 'YAYASAN') {
        return ['Pendirian Yayasan', 'Perubahan Yayasan', 'Pembubaran Yayasan', 'Rapat Pembina', 'Rapat Pengurus', 'Rapat Pengawas'];
      }
      if (clientTypeGroup === 'PERKUMPULAN') {
        return ['Pendirian Perkumpulan', 'Perubahan Perkumpulan', 'Pembubaran Perkumpulan', 'Rapat Anggota', 'Rapat Pengurus'];
      }
      return [];
    }

    if (category === 'PPAT') {
      return PROJECT_TYPES[ProjectCategory.PPAT] || [
        'Akta Jual Beli (AJB)',
        'Akta Hibah',
        'Akta Tukar Menukar',
        'Akta Pembagian Hak Bersama (APHB)',
        'Akta Pemberian Hak Tanggungan (APHT)',
        'Akta Surat Kuasa Memasang Hak Tanggungan (SKMHT)',
        'Akta Pemasukan Ke Dalam Perusahaan (Inbreng)',
        'Akta Pemberian HGB / Hak Pakai atas Tanah Hak Milik',
        'Akta Pelepasan Hak Atas Tanah',
        'Akta Kustom',
        'Lainnya'
      ];
    }

    if (category === 'AGREEMENT') {
      return [
        'Perjanjian Sewa Menyewa',
        'Perjanjian Kerja Sama',
        'PPJB',
        'Perjanjian Utang Piutang',
        'Akta Hibah',
        'Pengalihan Merek',
        'Lisensi Merek',
        'Waralaba',
        'Pinjam Pakai',
        'Akta Kustom',
        'Lainnya'
      ];
    }

    if (category === 'GENERAL_DEED') {
      return [
        'Akta Kuasa',
        'Akta Pernyataan',
        'Akta Pengakuan Utang',
        'Akta Kustom',
        'Lainnya'
      ];
    }

    if (category === 'LEGALIZATION') {
      return ['Legalisasi', 'Waarmerking'];
    }

    return [];
  };

  const normalizeProjects = (rawProjects: Project[]) => {
    return rawProjects.map((proj) => {
      if (proj.projectCategory === 'BODY_LEGAL') {
        if (proj.projectType === 'Pendirian CV' && proj.jobType !== 'pendirian_cv') {
          return { ...proj, jobType: 'pendirian_cv' };
        }
        if (proj.projectType === 'Perubahan CV' && proj.jobType !== 'perubahan_cv') {
          return { ...proj, jobType: 'perubahan_cv' };
        }
        if (proj.projectType === 'Pembubaran CV' && proj.jobType !== 'pembubaran_cv') {
          return { ...proj, jobType: 'pembubaran_cv' };
        }
      }
      return proj;
    });
  };

  useEffect(() => {
    if (!currentUser?.uid) return;

    setLoading(true);
    setError(null);

    const unsubscribeProjects = ProjectService.listenToOfficeProjects(
      (projects) => {
        const normalized = normalizeProjects(projects);
        setAllProjects(normalized);
        setLoading(false);
      },
      (err) => {
        console.error('[ProjectList] Realtime error:', err);
        setError('Gagal memuat daftar proyek secara realtime. Silakan periksa koneksi internet Anda.');
        setLoading(false);
      }
    );

    const unsubscribeUsers = ProjectService.listenToUserProfiles(
      (profiles) => {
        setStaffList(profiles);
      },
      (err) => {
        console.warn('[ProjectList] Error loading user profiles:', err);
      }
    );

    return () => {
      unsubscribeProjects();
      unsubscribeUsers();
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, filterClient, filterJobType, filterStatus]);

  const getWorkflowJobType = (category: string, type: string): string => {
    // Legacy support
    if (category === 'MEETING') {
      if (type === 'RUPS-LB' || type === 'PKPS RUPS-LB') {
        return 'rups_lb';
      }
      if (type === 'RUPST' || type === 'PKPS RUPST') {
        return 'rups_t';
      }
      return 'rups_lb';
    }

    if (category === 'BODY_LEGAL') {
      if (type === 'Pendirian PT') {
        return 'pendirian_pt';
      }
      if (type === 'Pendirian CV') {
        return 'pendirian_cv';
      }
      if (type === 'Perubahan CV') {
        return 'perubahan_cv';
      }
      if (type === 'Pembubaran CV') {
        return 'pembubaran_cv';
      }
      if (type.startsWith('Pendirian')) {
        return 'pendirian_pt';
      }
      if (type === 'RUPS-LB' || type === 'PKPS RUPS-LB') {
        return 'rups_lb';
      }
      if (type === 'RUPST' || type === 'PKPS RUPST') {
        return 'rups_t';
      }
      if (type.startsWith('Rapat ')) {
        return 'rups_t';
      }
      return 'rups_lb'; // default change workflow (amendment)
    }

    if (category === 'PPAT') {
      return 'akta_ppat';
    }

    if (category === 'AGREEMENT' && type === 'Perjanjian Sewa Menyewa') {
      return 'sewa_menyewa';
    }

    return 'rups_t'; // default simple workflow for agreements, legalizations, etc.
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { clientId, projectCategory, projectType, meetingSubject, projectDate, assignedTo, status, comment } = newProjectData;

    if (!clientId || !projectCategory || !projectType) {
      alert('Klien, Kategori Pekerjaan, dan Jenis Pekerjaan wajib diisi.');
      return;
    }

    const jobType = getWorkflowJobType(projectCategory, projectType);

    // Get selected workflow to find steps
    const selectedWorkflow = workflows.find((w) => w.id === jobType);
    if (!selectedWorkflow || !selectedWorkflow.steps || selectedWorkflow.steps.length === 0) {
      alert('Pencocokan alur kerja tidak ditemukan atau alur kerja kosong.');
      return;
    }

    setSubmitting(true);
    let fullProfile: CompanyProfile | null = null;
    try {
      fullProfile = await CompanyService.getCompanyProfile(clientId);
    } catch (e) {
      console.warn("[ProjectList] Failed to fetch full company profile:", e);
    }

    if (!fullProfile) {
      alert('Gagal mengambil detail profil klien untuk inisialisasi.');
      setSubmitting(false);
      return;
    }

    const clientName = fullProfile.companyName || '';
    const formattedClientName = formatCompanyNameWithType(clientName, fullProfile.clientType);
    const title = `${projectType} — ${formattedClientName}`;

    const mapCompanyProfileToSnapshot = (profile: CompanyProfile): ClientSnapshot => {
      return {
        id: profile.id,
        companyName: profile.companyName || '',
        companyType: profile.companyType || 'PT',
        fullAddress: profile.fullAddress || '',
        province: profile.newAddress?.province || profile.oldAddress?.province || '',
        city: profile.newAddress?.city || profile.oldAddress?.city || '',
        domicile: profile.domicile || profile.oldDomicile || profile.newAddress?.city || profile.oldAddress?.city || '',
        oldDomicile: profile.domicile || profile.oldDomicile || profile.newAddress?.city || profile.oldAddress?.city || '',
        npwp: profile.npwp || '',
        kbliItems: (profile.kbliItems || []).map(k => ({
          id: k.id || Math.random().toString(36).substring(7),
          code: k.code || (k as any).kode || '',
          name: k.name || (k as any).judul || '',
          description: k.description || (k as any).uraian || '',
          categoryLetter: k.categoryLetter || '',
          categoryName: k.categoryName || '',
          uraian: (k as any).uraian || k.description || ''
        })),
        authorizedCapital: profile.targetCapitalBase || profile.originalCapitalBase || 0,
        paidUpCapital: profile.targetCapitalPaid || profile.originalCapitalPaid || 0,
        originalCapitalBase: profile.originalCapitalBase || profile.targetCapitalBase || 0,
        originalCapitalPaid: profile.originalCapitalPaid || profile.targetCapitalPaid || 0,
        originalSharePrice: profile.originalSharePrice || 0,
        originalAuthorizedShares: profile.originalAuthorizedShares || 0,
        originalTotalShares: profile.originalTotalShares || 0,
        shareholders: (profile.shareholders || []).map(s => ({
          id: s.id,
          salutation: s.salutation || 'Tuan',
          name: s.name || '',
          birthCity: s.birthCity || '',
          birthDate: s.birthDate || '',
          nationalityType: s.nationalityType || 'WNI',
          nationality: s.nationality || 'WNI',
          occupation: s.occupation || '',
          sharesOwned: s.sharesOwned || 0,
          position: s.managementPosition || (s as any).position || '',
          managementPosition: s.managementPosition || (s as any).position || '',
          isManagement: s.isManagement ?? !!(s.managementPosition || (s as any).position),
          nik: s.nik || '',
          npwp: s.npwp || '',
          passportNumber: s.passportNumber || '',
          kitasNumber: s.kitasNumber || '',
          shareholderType: s.shareholderType || 'PERORANGAN',
          address: s.address ? {
            rt: s.address.rt || '',
            rw: s.address.rw || '',
            kelurahan: s.address.kelurahan || '',
            kecamatan: s.address.kecamatan || '',
            city: s.address.city || '',
            province: s.address.province || '',
            postalCode: s.address.postalCode || '',
            fullAddress: s.address.fullAddress || (typeof s.address === 'string' ? s.address : '')
          } : undefined
        })),
        managementItems: (profile.oldManagementItems || profile.newManagementItems || (profile as any).managementItems || []).map(m => ({
          id: m.id,
          salutation: (m as any).salutation || '',
          name: m.name || '',
          birthCity: (m as any).birthCity || '',
          birthDate: (m as any).birthDate || '',
          nationalityType: (m as any).nationalityType || '',
          nationality: (m as any).nationality || '',
          occupation: (m as any).occupation || '',
          position: m.position || '',
          nik: m.nik || '',
          npwp: (m as any).npwp || '',
          passportNumber: (m as any).passportNumber || '',
          kitasNumber: (m as any).kitasNumber || '',
          address: (m as any).address ? {
            rt: (m as any).address.rt || '',
            rw: (m as any).address.rw || '',
            kelurahan: (m as any).address.kelurahan || '',
            kecamatan: (m as any).address.kecamatan || '',
            city: (m as any).address.city || '',
            province: (m as any).address.province || '',
            postalCode: (m as any).address.postalCode || '',
            fullAddress: (m as any).address.fullAddress || (typeof (m as any).address === 'string' ? (m as any).address : '')
          } : undefined
        })),
        oldManagementItems: (profile.oldManagementItems || profile.newManagementItems || (profile as any).managementItems || []),
        newManagementItems: profile.newManagementItems || [],
        establishmentDeedNumber: profile.establishmentDeedNumber || '',
        establishmentDeedDate: profile.establishmentDeedDate || '',
        establishmentNotary: profile.establishmentNotary || '',
        establishmentNotaryTitle: profile.establishmentNotaryTitle || '',
        establishmentNotaryDomicile: profile.establishmentNotaryDomicile || '',
        establishmentSkNumber: profile.establishmentSkNumber || '',
        establishmentSkDate: profile.establishmentSkDate || '',
        latestAmendmentDeedNumber: profile.latestAmendmentDeedNumber || '',
        latestAmendmentDeedDate: profile.latestAmendmentDeedDate || '',
        latestAmendmentNotary: profile.latestAmendmentNotary || '',
        amendmentDeeds: profile.amendmentDeeds || []
      };
    };

    const initialSnapshot = mapCompanyProfileToSnapshot(fullProfile);

    setSubmitting(true);
    try {
      const startingStep = status || selectedWorkflow.steps[0];
      const customDate = projectDate ? new Date(projectDate) : new Date();
      const finalComment = comment.trim() || `Proyek '${title}' telah berhasil diinisialisasi.`;

      const projectPayload: any = {
        clientId,
        jobType,
        title: title.trim(),
        status: startingStep,
        currentStep: startingStep,
        assignedTo: assignedTo.trim() || 'Unassigned',
        metadata: {},
        projectCategory,
        projectType,
        projectDate,
        createdAt: customDate,
        updatedAt: customDate,
        lastTransitionComment: finalComment,
        clientSnapshot: initialSnapshot,
        ...(jobType === 'rups_lb' 
          ? { changeSnapshot: initialSnapshot ? { before: initialSnapshot, after: initialSnapshot } : undefined }
          : {}
        )
      };

      if (projectCategory === 'MEETING' && (projectType === 'RUPS-LB' || projectType === 'PKPS RUPS-LB') && meetingSubject) {
        projectPayload.meetingSubject = meetingSubject;
      }

      if (projectCategory === 'PPAT' || jobType === 'akta_ppat' || jobType === 'ppat') {
        const isCorporate = fullProfile.clientType !== 'PERORANGAN';
        const repItem = (fullProfile.newManagementItems && fullProfile.newManagementItems.length > 0)
          ? fullProfile.newManagementItems[0]
          : (fullProfile.oldManagementItems && fullProfile.oldManagementItems.length > 0
            ? fullProfile.oldManagementItems[0]
            : null);
        const initialParty = {
          id: 'party_1_' + Math.random().toString(36).substring(7),
          name: fullProfile.companyName || '',
          isLegalEntity: isCorporate,
          companyName: isCorporate ? fullProfile.companyName : undefined,
          companyAddress: isCorporate ? (fullProfile.fullAddress || '') : undefined,
          companyNib: isCorporate ? (fullProfile.npwp || '') : undefined,
          companyNpwp: isCorporate ? (fullProfile.npwp || '') : undefined,
          address: fullProfile.fullAddress || '',
          phone: fullProfile.phoneNumber || '',
          rt: (fullProfile.newAddress as any)?.rt || (fullProfile.oldAddress as any)?.rt || '',
          rw: (fullProfile.newAddress as any)?.rw || (fullProfile.oldAddress as any)?.rw || '',
          village: (fullProfile.newAddress as any)?.kelurahan || (fullProfile.oldAddress as any)?.kelurahan || '',
          district: (fullProfile.newAddress as any)?.kecamatan || (fullProfile.oldAddress as any)?.kecamatan || '',
          city: fullProfile.domicile || (fullProfile.newAddress as any)?.city || (fullProfile.oldAddress as any)?.city || 'Bandung Barat',
          representativeName: isCorporate && repItem ? repItem.name : '',
          representativeTitle: isCorporate && repItem ? (repItem.position || 'Direktur') : ''
        };

        projectPayload.ppatData = {
          transactionType: projectType || 'Akta Jual Beli (AJB)',
          firstParties: [initialParty],
          secondParties: [],
          object: {
            nop: '',
            spptName: '',
            location: '',
            rt: '',
            rw: '',
            village: '',
            district: '',
            city: 'Bandung Barat',
            documentType: 'SHM',
            certificateNumber: '',
            landArea: 0,
            buildingArea: 0,
            njop: 0,
            transactionDate: projectDate || new Date().toISOString().split('T')[0],
            transactionValue: 0
          }
        };
      }

      await ProjectService.createProject(projectPayload);

      // Invalidate cache if any
      ProjectService.clearCache();
      
      setIsModalOpen(false);
      setNewProjectData({
        clientId: '',
        projectCategory: '' as ProjectCategory | '',
        projectType: '',
        meetingSubject: '',
        projectDate: new Date().toISOString().substring(0, 10),
        assignedTo: '',
        status: '',
        comment: ''
      });
    } catch (err) {
      console.error(err);
      alert('Gagal membuat proyek baru.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string, title: string) => {
    e.stopPropagation();
    if (currentUser?.role !== 'Super Admin') return;

    if (!window.confirm(`Apakah Anda yakin ingin menghapus proyek "${title}"? Seluruh data terkait (timeline, tugas, dokumen) akan dihapus secara permanen, dan folder Google Drive proyek ini akan dipindahkan ke Trash.`)) {
      return;
    }

    try {
      await ProjectService.deleteProject(projectId);
      setAllProjects(prev => prev.filter(p => p.projectId !== projectId));
      alert('Proyek berhasil dihapus.');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus proyek.');
    }
  };

  // Filter logic
  const isProjectCompleted = (status: string) => {
    return isProjectCompletedStatus(status);
  };

  const activeProjects = React.useMemo(() => {
    return allProjects.filter((p) => !isProjectCompleted(p.status));
  }, [allProjects]);

  const minutaProjects = React.useMemo(() => {
    return allProjects.filter((p) => isProjectCompleted(p.status) && (!p.metadata?.minutaCheckedAll || p.metadata?.minutaCheckedAll === false));
  }, [allProjects]);

  const completedProjects = React.useMemo(() => {
    return allProjects.filter((p) => isProjectCompleted(p.status) && p.metadata?.minutaCheckedAll === true);
  }, [allProjects]);

  const getProjectStatusDisplay = (project: Project) => {
    const isCompleted = isProjectCompleted(project.status);
    if (isCompleted) {
      if (project.metadata?.minutaCheckedAll === false || !project.metadata?.minutaCheckedAll) {
        return 'Progres Minuta';
      }
    }
    return project.status;
  };

  const getProjectTime = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'object' && val.seconds !== undefined) {
      return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
    }
    if (val instanceof Date) {
      return val.getTime();
    }
    if (typeof val.toDate === 'function') {
      return val.toDate().getTime();
    }
    const parsed = Date.parse(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getClientName = (clientId: string, project?: Project) => {
    if (project?.clientSnapshot?.companyName) {
      return formatCompanyNameWithType(project.clientSnapshot.companyName, project.clientSnapshot.companyType);
    }
    const profile = findCachedProfile(clientId);
    if (profile) {
      return formatCompanyNameWithType(profile.companyName, profile.clientType);
    }
    if (project?.title) {
      let clean = project.title;
      if (clean.includes(' — ')) {
        clean = clean.split(' — ').slice(1).join(' — ').trim();
      } else if (clean.includes(' - ')) {
        clean = clean.split(' - ').slice(1).join(' - ').trim();
      }
      if (clean) return clean;
    }
    return 'Klien Tidak Diketahui';
  };

  const currentTabProjects = activeTab === 'aktif'
    ? activeProjects
    : activeTab === 'minuta'
    ? minutaProjects
    : completedProjects;

  const clientOptions = React.useMemo(() => {
    if (profiles.length > 0) return profiles;
    const map = new Map<string, CompanyProfile>();
    allProjects.forEach((p) => {
      if (p.clientId && !map.has(p.clientId)) {
        const name = p.clientSnapshot?.companyName || (p.title ? (p.title.includes(' — ') ? p.title.split(' — ').slice(1).join(' — ') : p.title) : '');
        map.set(p.clientId, {
          id: p.clientId,
          companyName: name,
          clientType: p.clientSnapshot?.companyType
        } as CompanyProfile);
      }
    });
    return Array.from(map.values());
  }, [profiles, allProjects]);

  const filteredProjects = React.useMemo(() => {
    return currentTabProjects.filter((project) => {
      const clientName = getClientName(project.clientId, project);
      const matchesSearch =
        !searchTerm ||
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClient = filterClient === '' || project.clientId === filterClient;
      const matchesJobType = filterJobType === '' || project.jobType === filterJobType;
      const matchesStatus = filterStatus === '' || project.status === filterStatus;

      return matchesSearch && matchesClient && matchesJobType && matchesStatus;
    }).sort((a, b) => {
      const timeA = Math.max(getProjectTime(a.updatedAt), getProjectTime(a.createdAt));
      const timeB = Math.max(getProjectTime(b.updatedAt), getProjectTime(b.createdAt));
      return timeB - timeA;
    });
  }, [currentTabProjects, searchTerm, filterClient, filterJobType, filterStatus, modalProfiles]);

  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE) || 1;
  const hasMore = currentPage < totalPages;
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const getWorkflowName = (jobType: string) => {
    return workflows.find((w) => w.id === jobType)?.name || jobType;
  };

  const getCleanTitle = (title: string, clientId?: string) => {
    let clean = title;
    if (title.includes(' — ')) {
      clean = title.split(' — ').slice(1).join(' — ').trim();
    } else if (title.includes(' - ')) {
      clean = title.split(' - ').slice(1).join(' - ').trim();
    }

    if (clientId) {
      const profile = findCachedProfile(clientId);
      if (profile) {
        return formatCompanyNameWithType(clean, profile.clientType);
      }
    }
    return clean;
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('selesai') || s.includes('completed') || s.includes('archived')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('booking_nama')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
    if (s.includes('draft') || s.includes('form_input')) return 'bg-slate-50 text-slate-700 border-slate-200';
    if (s.includes('batal') || s.includes('cancelled') || s.includes('ditolak') || s.includes('rejected')) return 'bg-red-50 text-red-700 border-red-200';
    if (s.includes('review') || s.includes('approval') || s.includes('proses')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('signing') || s.includes('print')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('ahu') || s.includes('nib') || s.includes('ahu_sk')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const handleOpenCreateModal = async () => {
    setIsModalOpen(true);
  };

  return (
    <PageContainer>
      {/* MOBILE HEADER */}
      <MobileHeader
        title="Proyek Kerja"
        onOpenSidebar={() => {
          if (typeof window !== 'undefined') {
            const btn = document.querySelector('button[aria-label="Toggle sidebar"]') as HTMLButtonElement;
            if (btn) btn.click();
          }
        }}
        onAdd={handleOpenCreateModal}
        addTooltip="Buat Proyek Baru"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari proyek, klien..."
        totalItems={filteredProjects.length}
        totalLabel="Proyek"
        customSummary={
          <div className="flex gap-1.5 pt-1">
            {(['aktif', 'minuta', 'selesai'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'bg-white/10 hover:bg-white/20 text-white/90'
                }`}
              >
                {tab === 'aktif' && 'Proyek Aktif'}
                {tab === 'minuta' && 'Minuta'}
                {tab === 'selesai' && 'Selesai'}
              </button>
            ))}
          </div>
        }
      />

      {/* DESKTOP PAGE HEADER */}
      <div className="hidden md:block">
        <PageHeader
          icon={<Briefcase className="w-5 h-5 text-white" />}
          title="Manajemen Proyek"
          description="Pantau kemajuan alur kerja akta dan proses administrasi hukum di satu tempat."
          actions={
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#0c2444] hover:bg-[#16365f] text-white font-bold rounded-lg text-xs transition-all flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Proyek Baru</span>
            </button>
          }
        />
      </div>

        {/* Tabs */}
        <div className="hidden md:flex space-x-1 border-b border-slate-200">
          {(['aktif', 'minuta', 'selesai'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab === 'aktif' && 'Proyek Aktif'}
              {tab === 'minuta' && 'Minuta'}
              {tab === 'selesai' && 'Selesai'}
            </button>
          ))}
        </div>

        {/* Filters Panel */}
        <div className="hidden md:block bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari proyek, klien, atau ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded-lg outline-none transition-all"
              />
            </div>

            {/* Filter buttons */}
            <div className="grid grid-cols-2 sm:flex gap-2">
              <SearchableClientSelect
                value={filterClient}
                onChange={setFilterClient}
                options={clientOptions}
                placeholder="Semua Klien"
                className="w-full sm:w-48"
                selectClassName="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer hover:bg-slate-100/50 transition-colors flex items-center justify-between"
                allowClear={true}
              />

              <select
                value={filterJobType}
                onChange={(e) => setFilterJobType(e.target.value)}
                className="px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer hover:bg-slate-100/50 transition-colors"
              >
                <option value="">Semua Jenis Pekerjaan</option>
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer hover:bg-slate-100/50 transition-colors"
              >
                <option value="">Semua Status</option>
                <option value="draft">Draft</option>
                <option value="review">Review</option>
                <option value="approval">Approval</option>
                <option value="signing">Signing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Project List / Cards */}
        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
            <AppLoader variant="content" message="Memuat daftar proyek..." />
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center">
            <span className="text-[13px] text-red-600 font-medium">{error}</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center bg-white border border-slate-200/80 rounded-xl shadow-sm text-center p-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Tidak ada Proyek</h3>
            <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || filterClient || filterJobType || filterStatus
                ? 'Tidak ada proyek yang sesuai dengan filter pencarian Anda.'
                : 'Buat proyek pertama Anda untuk mulai mengelola siklus pembuatan akta.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedProjects.map((project, index) => (
              <ProjectHorizontalCard
                key={project.projectId}
                project={project}
                currentUser={currentUser}
                onSelectProject={onSelectProject}
                onDeleteProject={handleDeleteProject}
                onOpenAddActivityModal={handleOpenAddActivity}
                onOpenTasksModal={handleOpenTasks}
                indexNumber={(currentPage - 1) * PAGE_SIZE + index + 1}
                staffList={staffList}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 mt-3">
          <div className="flex items-center gap-2">
            <span>Halaman <strong className="text-slate-800">{currentPage}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>

        {/* Create Project Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-slideUp">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-[15px]">Buat Proyek Baru</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Select Client */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pilih Klien</label>
                  <SearchableClientSelect
                    value={newProjectData.clientId}
                    onChange={(val) => {
                      // Reset other fields on client change
                      setNewProjectData({
                        ...newProjectData,
                        clientId: val,
                        projectCategory: '',
                        projectType: '',
                        meetingSubject: '',
                        status: ''
                      });
                    }}
                    options={modalProfiles}
                    onSearchChange={handleSearchClients}
                  />
                </div>

                {/* Kategori Pekerjaan */}
                {newProjectData.clientId && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Kategori Pekerjaan</label>
                    <select
                      required
                      value={newProjectData.projectCategory}
                      onChange={(e) => {
                        const cat = e.target.value as ProjectCategory;
                        setNewProjectData({
                          ...newProjectData,
                          projectCategory: cat,
                          projectType: '',
                          meetingSubject: '',
                          status: ''
                        });
                      }}
                      className="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all cursor-pointer"
                    >
                      <option value="">-- Pilih Kategori Pekerjaan --</option>
                      {clientTypeGroup !== 'PERSONAL' && (
                        <option value="BODY_LEGAL">Badan Hukum / Usaha (BODY LEGAL)</option>
                      )}
                      <option value="PPAT">Akta PPAT (PPAT)</option>
                      <option value="AGREEMENT">Perjanjian (AGREEMENT)</option>
                      <option value="GENERAL_DEED">Akta Umum (GENERAL DEED)</option>
                      <option value="LEGALIZATION">Legalisasi / Waarmerking (LEGALIZATION)</option>
                    </select>
                  </div>
                )}

                {/* Jenis Pekerjaan */}
                {newProjectData.projectCategory && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Jenis Pekerjaan</label>
                    <select
                      required
                      value={newProjectData.projectType}
                      onChange={(e) => {
                        const type = e.target.value;
                        setNewProjectData({
                          ...newProjectData,
                          projectType: type,
                          status: ''
                        });
                      }}
                      className="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all cursor-pointer"
                    >
                      <option value="">-- Pilih Jenis Pekerjaan --</option>
                      {getAvailableProjectTypes().map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Preview Judul Proyek (otomatis) */}
                {newProjectData.clientId && newProjectData.projectCategory && newProjectData.projectType && (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block">Judul Proyek (Otomatis)</label>
                    <div className="text-[13px] font-bold text-slate-700 mt-1">
                      {newProjectData.projectType} — {(() => {
                        const profile = modalProfiles.find(c => c.id === newProjectData.clientId);
                        return profile ? formatCompanyNameWithType(profile.companyName, profile.clientType) : '';
                      })()}
                    </div>
                  </div>
                )}

                {/* Tanggal Proyek */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tanggal Proyek</label>
                  <input
                    type="date"
                    required
                    value={newProjectData.projectDate}
                    onChange={(e) => setNewProjectData({ ...newProjectData, projectDate: e.target.value })}
                    className="w-full px-4 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all"
                  />
                </div>



                {/* Catatan Inisialisasi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Catatan Inisialisasi / Catatan Awal (Optional)</label>
                  <textarea
                    value={newProjectData.comment}
                    onChange={(e) => setNewProjectData({ ...newProjectData, comment: e.target.value })}
                    placeholder="Masukkan catatan transisi awal..."
                    rows={3}
                    className="w-full px-4 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-semibold rounded-lg text-[13px] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <span>Inisialisasi Proyek</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modals for Activity Feed, Activity Timeline, and Project Tasks */}
        <AddActivityModal
          isOpen={isAddActivityOpen}
          onClose={() => setIsAddActivityOpen(false)}
          onSubmitComment={handleSubmitActivityComment}
          onSubmitTask={handleSubmitActivityTask}
          onSubmitIssue={handleSubmitActivityIssue}
          currentUser={currentUser}
        />

        <ActivityTimelineModal
          isOpen={isTimelineOpen}
          onClose={() => setIsTimelineOpen(false)}
          project={selectedProjectForModal}
          activities={selectedProjectForModal?.activities}
          onSubmitComment={handleSubmitActivityComment}
        />

        <ProjectTasksModal
          isOpen={isTasksOpen}
          onClose={() => setIsTasksOpen(false)}
          project={selectedProjectForModal}
          tasks={selectedProjectForModal?.tasks}
          onToggleTask={handleToggleTaskStatus}
          onOpenAddTask={() => {
            setIsTasksOpen(false);
            setIsAddActivityOpen(true);
          }}
        />
    </PageContainer>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  );
}
