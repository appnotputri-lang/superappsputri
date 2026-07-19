export interface DocumentReference {
  id: string;
  name: string;
  url?: string;
  refId?: string;
  type: string; // e.g., 'docx', 'pdf', 'doc', 'other'
  uploadedBy?: string;
  uploadedAt: any; // Date, Firestore Timestamp, or ISO string
}

export interface ClientSnapshot {
  id: string; // Master client ID
  companyName: string;
  companyType?: string; // PT, CV, etc.
  fullAddress?: string;
  province?: string;
  city?: string;
  kbliItems?: { id: string; code: string; name: string; description?: string }[];
  authorizedCapital?: number; // Modal Dasar
  paidUpCapital?: number; // Modal Disetor
  shareholders?: {
    id: string;
    name: string;
    sharesOwned: number;
    position?: string;
    nik?: string;
    npwp?: string;
  }[];
  managementItems?: {
    id: string;
    name: string;
    position: string; // Direktur, Komisaris, dsb
    nik?: string;
  }[];
  establishmentDeedNumber?: string;
  establishmentDeedDate?: string;
  establishmentNotary?: string;
  latestAmendmentDeedNumber?: string;
  latestAmendmentDeedDate?: string;
  latestAmendmentNotary?: string;
}

export interface ProjectChangeSnapshot {
  before: ClientSnapshot;
  after: ClientSnapshot;
}

export interface Party {
  id: string; // Unique ID (usually UUID or random string)
  name: string;
  nik: string;
  jabatan: string; // Direktur, Komisaris, Pemegang Saham, Kuasa, dll.
  pekerjaan: string; // Pengusaha, Pegawai Swasta, PNS, Profesional, Pedagang, Pengajar, Petani, Lainnya
  kewarganegaraan: string; // WNI, WNA
  alamat?: string;
  sahamPercentage?: number; // Persentase Saham
  status: string; // Aktif, Nonaktif, dsb
}

export interface Project {
  projectId: string; // Unique Identifier (Document ID in Firestore)
  clientId: string;  // Reference to CompanyProfile document (profiles/{id})
  jobType: string;   // Type of job, e.g., 'rups_lb', 'rups_t', 'pendirian_pt', etc.
  title: string;     // Title of the project/company
  status: string;    // Core state of the project
  currentStep: string; // Current step name in the workflow sequence
  assignedTo?: string; // UID of the assigned user/notary
  createdAt: any;    // Timestamp when project was created
  updatedAt: any;    // Timestamp of the last status or detail update
  metadata?: Record<string, any>; // Highly extensible metadata block
  documents?: DocumentReference[]; // Associated document registry
  clientSnapshot?: ClientSnapshot; // Immutable snapshot of client state for normal projects
  changeSnapshot?: ProjectChangeSnapshot; // Immutable change snapshot for RUPS LB Before/After
  lastTransitionComment?: string; // Cache of the latest transition note/comment
  parties?: Party[]; // Profil orang-orang yang terlibat dalam PT
  projectCategory?: string; // e.g. BODY_LEGAL, MEETING, AGREEMENT, GENERAL_DEED, LEGALIZATION
  projectType?: string;     // e.g. Pendirian, RUPS-LB, RUPST, Perjanjian Sewa Menyewa, etc.
  meetingSubject?: string;  // e.g. Perubahan AD, Perubahan Data, etc.
  minutaNotes?: string;     // Catatan khusus untuk proyek minuta
}
