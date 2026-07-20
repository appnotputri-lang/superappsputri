import React, { useState, useEffect } from 'react';
import { Project, ClientSnapshot } from '../../../domain/project/Project';
import { ProjectService } from '../../../services/ProjectService';
import { UserProfile, CompanyProfile } from '../../../../types';
import { db } from '../../../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Workflow } from '../../../domain/project/Workflow';
import { WorkflowService } from '../../../services/WorkflowService';
import { Plus, Search, Filter, Briefcase, User, Calendar, ExternalLink, Loader2, ArrowRight, Trash2, AlertCircle } from 'lucide-react';
import { SearchableClientSelect } from '../../../components/common/SearchableClientSelect';
import { ProjectCategory, PROJECT_TYPES, MEETING_SUBJECTS } from '../../../constants/appConstants';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [activeTab, setActiveTab] = useState<'aktif' | 'minuta' | 'selesai'>('aktif');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterJobType, setFilterJobType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const selectedClient = profiles.find((c) => c.id === newProjectData.clientId);
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

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Ensure default workflows are seeded
        await WorkflowService.seedDefaultWorkflows();
        
        const [projList, profileList, wfList] = await Promise.all([
          ProjectService.listProjects(),
          getDocs(collection(db, 'profiles')).then(snapshot => 
            snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CompanyProfile[]
          ),
          WorkflowService.listWorkflows()
        ]);

        const rawProjects = projList || [];
        const migratedProjects = await Promise.all(
          rawProjects.map(async (proj) => {
            if (proj.projectCategory === 'BODY_LEGAL') {
              let targetJobType = '';
              if (proj.projectType === 'Pendirian CV' && proj.jobType !== 'pendirian_cv') {
                targetJobType = 'pendirian_cv';
              } else if (proj.projectType === 'Perubahan CV' && proj.jobType !== 'perubahan_cv') {
                targetJobType = 'perubahan_cv';
              } else if (proj.projectType === 'Pembubaran CV' && proj.jobType !== 'pembubaran_cv') {
                targetJobType = 'pembubaran_cv';
              }

              if (targetJobType) {
                try {
                  await updateDoc(doc(db, 'office_projects', proj.projectId), {
                    jobType: targetJobType
                  });
                  return { ...proj, jobType: targetJobType };
                } catch (e) {
                  console.error('Failed to auto-migrate CV project jobType:', proj.projectId, e);
                }
              }
            }
            return proj;
          })
        );

        setProjects(migratedProjects);
        setProfiles(profileList || []);
        setWorkflows(wfList || []);
      } catch (err: any) {
        console.error(err);
        setError('Gagal memuat data draf RUPS LB. Silakan coba lagi beberapa saat lagi.');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

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

    const clientProfile = profiles.find((c) => c.id === clientId);
    const clientName = clientProfile?.companyName || '';
    const formattedClientName = formatCompanyNameWithType(clientName, clientProfile?.clientType);
    const title = `${projectType} — ${formattedClientName}`;

    const mapCompanyProfileToSnapshot = (profile: CompanyProfile): ClientSnapshot => {
      return {
        id: profile.id,
        companyName: profile.companyName || '',
        companyType: profile.companyType || 'PT',
        fullAddress: profile.fullAddress || '',
        province: profile.newAddress?.province || profile.oldAddress?.province || '',
        city: profile.newAddress?.city || profile.oldAddress?.city || '',
        kbliItems: (profile.kbliItems || []).map(k => ({
          id: k.id,
          code: k.code,
          name: k.name,
          description: k.description || ''
        })),
        authorizedCapital: profile.targetCapitalBase || profile.originalCapitalBase || 0,
        paidUpCapital: profile.targetCapitalPaid || profile.originalCapitalPaid || 0,
        shareholders: (profile.shareholders || []).map(s => ({
          id: s.id,
          name: s.name,
          sharesOwned: s.sharesOwned,
          position: s.managementPosition || '',
          nik: s.nik || '',
          npwp: s.npwp || ''
        })),
        managementItems: (profile.newManagementItems || []).map(m => ({
          id: m.id,
          name: m.name,
          position: m.position,
          nik: m.nik || ''
        })),
        establishmentDeedNumber: profile.establishmentDeedNumber || '',
        establishmentDeedDate: profile.establishmentDeedDate || '',
        establishmentNotary: profile.establishmentNotary || '',
        latestAmendmentDeedNumber: profile.latestAmendmentDeedNumber || '',
        latestAmendmentDeedDate: profile.latestAmendmentDeedDate || '',
        latestAmendmentNotary: profile.latestAmendmentNotary || ''
      };
    };

    const initialSnapshot = clientProfile ? mapCompanyProfileToSnapshot(clientProfile) : undefined;

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
        ...(jobType === 'rups_lb' 
          ? { changeSnapshot: initialSnapshot ? { before: initialSnapshot, after: initialSnapshot } : undefined }
          : { clientSnapshot: initialSnapshot }
        )
      };

      if (projectCategory === 'MEETING' && (projectType === 'RUPS-LB' || projectType === 'PKPS RUPS-LB') && meetingSubject) {
        projectPayload.meetingSubject = meetingSubject;
      }

      await ProjectService.createProject(projectPayload);

      // Refresh list
      const updatedProjects = await ProjectService.listProjects();
      setProjects(updatedProjects || []);
      
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

    if (!window.confirm(`Apakah Anda yakin ingin menghapus proyek "${title}"? Seluruh data terkait (timeline, tugas, dokumen) akan dihapus secara permanen.`)) {
      return;
    }

    try {
      await ProjectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.projectId !== projectId));
      alert('Proyek berhasil dihapus.');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus proyek.');
    }
  };

  // Filter logic
  const isProjectCompleted = (status: string) => {
    const s = status.toLowerCase();
    return s === 'completed' || s === 'archived' || s === 'selesai';
  };

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

  const filteredProjects = projects.filter((project) => {
    // Tab Filter
    const isCompleted = isProjectCompleted(project.status);
    if (activeTab === 'aktif' && isCompleted) return false;
    if (activeTab === 'minuta' && !isCompleted) return false;
    if (activeTab === 'selesai') return false; // Selesai is reserved/empty for now

    const clientName = profiles.find((c) => c.id === project.clientId)?.companyName || '';
    const matchesSearch =
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

  const getClientName = (clientId: string) => {
    const profile = profiles.find((c) => c.id === clientId);
    if (!profile) return 'Klien Tidak Diketahui';
    return formatCompanyNameWithType(profile.companyName, profile.clientType);
  };

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
      const profile = profiles.find((c) => c.id === clientId);
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

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Proyek</h1>
            <p className="text-[13px] text-slate-500 mt-1">
              Pantau kemajuan alur kerja akta dan proses administrasi hukum di satu tempat.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] transition-all flex items-center gap-2 shadow-sm shrink-0 sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Proyek Baru</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-slate-200">
          {(['aktif', 'minuta', 'selesai'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
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
                options={profiles}
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
          <div className="h-64 flex flex-col items-center justify-center bg-white border border-slate-200/80 rounded-xl shadow-sm">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-[13px] text-slate-400 mt-2">Memuat daftar proyek...</span>
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
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[800px] w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide w-12 text-center">No</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Judul Proyek / Klien</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Jenis Pekerjaan</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide max-w-[320px]">
                      {activeTab === 'minuta' ? 'Catatan Minuta' : 'Catatan Transisi Terakhir'}
                    </th>
                    <th className="pl-4 pr-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wide text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((project, index) => (
                    <tr
                      key={project.projectId}
                      onClick={() => onSelectProject(project.projectId)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3.5 text-[12px] font-medium text-slate-500 text-center">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <div className="text-[13px] font-bold text-slate-900 truncate" title={getCleanTitle(project.title, project.clientId)}>
                          {getCleanTitle(project.title, project.clientId)}
                        </div>
                        {(() => {
                          const clientName = getClientName(project.clientId);
                          const isUnknown = clientName === 'Klien Tidak Diketahui';
                          const cleanTitle = getCleanTitle(project.title, project.clientId);
                          const isRedundant = cleanTitle.toLowerCase() === clientName.toLowerCase();
                          
                          if (!isRedundant) {
                            return (
                              <div className="text-[11px] mt-0.5 truncate flex items-center gap-1" title={clientName}>
                                {isUnknown ? (
                                  <span className="italic text-slate-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {clientName}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">{clientName}</span>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-slate-600">
                        {getWorkflowName(project.jobType)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded border uppercase tracking-wider ${getStatusColor(getProjectStatusDisplay(project))}`}>
                          {getProjectStatusDisplay(project)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-slate-500 max-w-[320px] truncate" title={
                        activeTab === 'minuta'
                          ? (project.minutaNotes || 'Tidak ada catatan minuta.')
                          : (project.lastTransitionComment || `Proyek '${getCleanTitle(project.title, project.clientId)}' telah berhasil diinisialisasi.`)
                      }>
                        {activeTab === 'minuta'
                          ? (project.minutaNotes || 'Tidak ada catatan minuta.')
                          : (project.lastTransitionComment || `Proyek '${getCleanTitle(project.title, project.clientId)}' telah berhasil diinisialisasi.`)}
                      </td>
                      <td className="pl-4 pr-6 py-3.5 text-right flex items-center justify-end gap-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectProject(project.projectId); }}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-[12px]"
                        >
                          Detail <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.role === 'Super Admin' && (
                          <button
                            onClick={(e) => handleDeleteProject(e, project.projectId, project.title)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Hapus Proyek"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredProjects.map((project, index) => {
                const clientName = getClientName(project.clientId);
                const title = getCleanTitle(project.title, project.clientId);
                const isUnknown = clientName === 'Klien Tidak Diketahui';
                const lastComment = activeTab === 'minuta'
                  ? (project.minutaNotes || 'Tidak ada catatan minuta.')
                  : (project.lastTransitionComment || `Proyek '${title}' telah berhasil diinisialisasi.`);

                return (
                  <div 
                    key={project.projectId}
                    onClick={() => onSelectProject(project.projectId)}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-bold text-slate-900 leading-tight truncate uppercase" title={title}>
                          {title}
                        </h4>
                        {!isUnknown && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate uppercase">
                            {clientName}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">No. {index + 1}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center my-3">
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded">
                        {getWorkflowName(project.jobType)}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider ${getStatusColor(getProjectStatusDisplay(project))}`}>
                        {getProjectStatusDisplay(project)}
                      </span>
                    </div>

                    {lastComment && (
                      <div className="text-[11.5px] text-slate-505 bg-slate-50 p-2.5 rounded-lg border border-slate-100/60 leading-relaxed mb-3">
                        <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mb-1">Catatan Terakhir:</span>
                        <p className="line-clamp-2">{lastComment}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 mt-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] text-slate-450 font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                        {project.createdAt ? new Date(getProjectTime(project.createdAt)).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                      </span>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onSelectProject(project.projectId)}
                          className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold text-[10px] hover:bg-blue-100 transition-colors uppercase flex items-center gap-1 cursor-pointer"
                        >
                          Detail <ArrowRight className="w-3 h-3" />
                        </button>
                        {currentUser?.role === 'Super Admin' && (
                          <button 
                            onClick={(e) => handleDeleteProject(e, project.projectId, project.title)}
                            className="p-1 text-slate-450 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    options={profiles}
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

                {/* Materi RUPS */}
                {newProjectData.projectCategory === 'BODY_LEGAL' && 
                 (newProjectData.projectType === 'RUPS-LB' || newProjectData.projectType === 'PKPS RUPS-LB') && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Materi RUPS</label>
                    <select
                      value={newProjectData.meetingSubject}
                      onChange={(e) => setNewProjectData({ ...newProjectData, meetingSubject: e.target.value })}
                      className="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all cursor-pointer"
                    >
                      <option value="">-- Pilih Materi RUPS --</option>
                      {MEETING_SUBJECTS.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
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
                        const profile = profiles.find(c => c.id === newProjectData.clientId);
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

                {/* Assigned To */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Ditugaskan Kepada (Staf / Notaris / PIC)</label>
                  <input
                    type="text"
                    value={newProjectData.assignedTo}
                    onChange={(e) => setNewProjectData({ ...newProjectData, assignedTo: e.target.value })}
                    placeholder="Contoh: Putri Nabilla, S.H., M.Kn."
                    className="w-full px-4 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all"
                  />
                </div>

                {/* Status Tahapan Awal */}
                {newProjectData.projectCategory && newProjectData.projectType && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Status Tahapan Awal</label>
                    <select
                      value={newProjectData.status}
                      onChange={(e) => setNewProjectData({ ...newProjectData, status: e.target.value })}
                      className="w-full px-3 py-2.5 text-[13px] bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded-lg outline-none transition-all cursor-pointer"
                    >
                      <option value="">-- Gunakan Tahapan Pertama ({workflows.find(w => w.id === getWorkflowJobType(newProjectData.projectCategory, newProjectData.projectType))?.steps?.[0] || 'Inisialisasi'}) --</option>
                      {(workflows.find(w => w.id === getWorkflowJobType(newProjectData.projectCategory, newProjectData.projectType))?.steps || []).map((step) => (
                        <option key={step} value={step}>{step}</option>
                      ))}
                    </select>
                  </div>
                )}

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
      </div>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  );
}
