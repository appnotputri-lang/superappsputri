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
  domicile?: string;
  oldDomicile?: string;
  npwp?: string;
  kbliItems?: { id: string; code: string; name: string; description?: string; categoryLetter?: string; categoryName?: string; uraian?: string }[];
  authorizedCapital?: number; // Modal Dasar
  paidUpCapital?: number; // Modal Disetor
  originalCapitalBase?: number;
  originalCapitalPaid?: number;
  originalSharePrice?: number;
  originalAuthorizedShares?: number;
  originalTotalShares?: number;
  shareholders?: {
    id: string;
    name: string;
    sharesOwned: number;
    position?: string;
    nik?: string;
    npwp?: string;
    salutation?: string;
    birthCity?: string;
    birthDate?: string;
    nationalityType?: string;
    nationality?: string;
    occupation?: string;
    managementPosition?: string;
    isManagement?: boolean;
    passportNumber?: string;
    kitasNumber?: string;
    shareholderType?: string;
    address?: {
      rt?: string;
      rw?: string;
      kelurahan?: string;
      kecamatan?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      fullAddress?: string;
    };
  }[];
  managementItems?: {
    id: string;
    name: string;
    position: string; // Direktur, Komisaris, dsb
    nik?: string;
    npwp?: string;
    salutation?: string;
    birthCity?: string;
    birthDate?: string;
    nationalityType?: string;
    nationality?: string;
    occupation?: string;
    passportNumber?: string;
    kitasNumber?: string;
    address?: {
      rt?: string;
      rw?: string;
      kelurahan?: string;
      kecamatan?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      fullAddress?: string;
    };
  }[];
  oldManagementItems?: any[];
  newManagementItems?: any[];
  establishmentDeedNumber?: string;
  establishmentDeedDate?: string;
  establishmentNotary?: string;
  establishmentNotaryTitle?: string;
  establishmentNotaryDomicile?: string;
  establishmentSkNumber?: string;
  establishmentSkDate?: string;
  latestAmendmentDeedNumber?: string;
  latestAmendmentDeedDate?: string;
  latestAmendmentNotary?: string;
  amendmentDeeds?: any[];
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

export interface PPATParty {
  id: string;
  name: string;
  ktpName?: string; // Nama yang tertulis di KTP (jika berbeda dengan Sertipikat / Nama Pokok)
  nik?: string;
  jenisKelamin?: 'Laki-laki' | 'Perempuan' | string; // Jenis Kelamin
  statusPerkawinan?: 'Belum Menikah' | 'Menikah' | 'Cerai Hidup' | 'Cerai Mati' | string; // Status Perkawinan
  birthPlace?: string; // Tempat Lahir
  birthDate?: string; // Tanggal Lahir
  job?: string;
  address?: string;
  rt?: string;
  rw?: string;
  village?: string; // Kelurahan / Desa
  district?: string; // Kecamatan
  city?: string;
  province?: string;
  phone?: string;
  citizenship?: string; // Kewarganegaraan (e.g. Indonesia / WNI)
  isLegalEntity?: boolean; // If PT / CV / Yayasan / Badan Hukum
  companyName?: string;
  companyAddress?: string;
  companyNib?: string;
  companyNpwp?: string;
  representativeName?: string;
  representativeTitle?: string;
  // Persetujuan Suami / Istri (Spouse Consent)
  hasSpouseConsent?: boolean; // Pilihan persetujuan suami/istri
  spouseConsentType?: 'suami' | 'istri' | string; // Persetujuan dari Suami / Istri
  spouseName?: string; // Nama Suami / Istri
  spouseNik?: string; // NIK KTP Suami / Istri
  spouseBirthPlace?: string; // Tempat Lahir Suami / Istri
  spouseBirthDate?: string; // Tanggal Lahir Suami / Istri
  spouseJob?: string; // Pekerjaan Suami / Istri
  spouseAddress?: string; // Alamat Suami / Istri
  spousePhone?: string; // No. Telepon / HP Suami / Istri
}

export interface PPATObjectData {
  namaDalamSertipikat?: string; // Nama Pemegang Hak / Pemilik yang tertulis pada Sertipikat
  ownerName?: string; // Alias nama pemegang hak sertipikat
  nop?: string; // Nomor Objek Pajak (NOP)
  nib?: string; // Nomor Identifikasi Bidang Tanah (NIB)
  spptName?: string; // Nama yang tercantum pada SPPT PBB
  holderName?: string; // Nama Pemegang Hak
  location?: string; // Letak tanah dan/atau bangunan
  rt?: string;
  rw?: string;
  village?: string; // Desa / Kelurahan
  district?: string; // Kecamatan
  city?: string; // Kabupaten / Kota (e.g. Bandung Barat)
  regency?: string; // Kabupaten
  province?: string; // Provinsi
  blok?: string; // Blok
  documentType?: string; // SHM, HGB, Hak Pakai, Girik / Warkah, dll.
  certificateType?: string; // SHM, HGB, Hak Pakai, Girik, dll.
  certificateNumber?: string; // Nomor Sertifikat / Dokumen
  // Surat Ukur / Gambar Situasi
  measurementDocType?: 'Surat Ukur' | 'Gambar Situasi' | 'NIB / Peta Bidang' | string; // Pilihan Surat Ukur / Gambar Situasi
  measurementDocNumber?: string; // Nomor Surat Ukur / Gambar Situasi
  nomorSuratUkur?: string; // Nomor Surat Ukur khusus (e.g. 00557/Cikahuripan/2019)
  measurementDocDate?: string; // Tanggal Surat Ukur / Gambar Situasi
  landArea?: number; // Luas Tanah (m2)
  buildingArea?: number; // Luas Bangunan (m2)
  landUseType?: 'non_pertanian' | 'pertanian' | string;
  landUse?: string;
  njop?: number; // Nilai NJOP (Rp)
  transactionDate?: string; // Tanggal Transaksi / Perolehan
  transactionStatus?: 'telah' | 'akan' | string; // Status Transaksi (Telah / Akan)
  transactionValue?: number; // Nilai Transaksi / Pengakuan Nilai Perolehan (Rp)
  persil?: string; // Persil (Girik/Warkah)
  kohir?: string; // Kohir (Girik/Warkah)
  courtDecisionNumber?: string; // Nomor Putusan Pengadilan / Lelang / Surat Keputusan
  courtDecisionDate?: string;
  boundaries?: {
    north?: string;
    south?: string;
    east?: string;
    west?: string;
  };
  northBoundary?: string;
  southBoundary?: string;
  eastBoundary?: string;
  westBoundary?: string;
}

export type PPATDocumentCategory = 'surat' | 'akta' | 'lainnya';

export interface PPATDocumentItem {
  id: string;
  projectId?: string;
  title: string;
  category: PPATDocumentCategory;
  documentType: string; // e.g. 'surat_pernyataan', 'pakta_integritas', 'surat_persetujuan_keluarga', 'surat_kuasa_ppat', 'surat_tidak_sengketa', 'surat_keterangan_nilai_pajak', 'akta_ajb', etc.
  typeId?: string;
  status: 'draft' | 'final';
  createdAt: string;
  updatedAt: string;
  letterNumber?: string;
  letterDate?: string;
  letterLocation?: string;
  notes?: string;
  // Specific document custom metadata or clause overrides:
  specificData?: {
    purpose?: string;
    specialClauses?: string;
    agreedPrice?: number;
    spouseConsentName?: string;
    spouseConsentNik?: string;
    spouseRelation?: string;
    attorneyName?: string;
    attorneyNik?: string;
    attorneyAddress?: string;
    witnesses?: Array<{ name: string; nik: string; address?: string }>;
    customBodyText?: string;
    [key: string]: any;
  };
}

export interface PPATAttachmentItem {
  id: string;
  name: string; // Nama / Jenis Lampiran
  documentNumber?: string; // Nomor Dokumen (jika ada)
  documentDate?: string; // Tanggal Dokumen (jika ada)
}

export interface PPATCertificateData {
  namaDalamSertipikat?: string; // Nama pemegang hak sesuai Sertipikat / Buku Tanah (FIELD MASTER TERSENDIRI)
  certificateType?: string; // SHM, HGB, Hak Pakai, Hak Pengelolaan, Girik / Warkah, dll.
  certificateNumber?: string; // Nomor Sertipikat / Nomor Hak
  measurementDocType?: 'Surat Ukur' | 'Gambar Situasi' | 'NIB / Peta Bidang' | string;
  measurementDocNumber?: string; // Nomor Surat Ukur
  nomorSuratUkur?: string;
  measurementDocDate?: string; // Tanggal Surat Ukur
  landArea?: number; // Luas Tanah (m2)
  nib?: string; // NIB
  notes?: string; // Catatan Sertipikat
}

export interface PPATPbbData {
  nop?: string; // Nomor Objek Pajak (NOP)
  spptName?: string; // SPPT PBB Atas Nama
  taxYear?: string; // Tahun Pajak
  njopLand?: number; // NJOP Tanah (Rp / m2)
  njopBuilding?: number; // NJOP Bangunan (Rp / m2)
  njop?: number; // Total NJOP (Rp)
  totalNjop?: number; // Total Nilai NJOP
  notes?: string; // Catatan PBB
}

export interface PPATPropertyLocationData {
  address?: string; // Alamat / Jalan / Blok / No
  rt?: string;
  rw?: string;
  village?: string; // Desa / Kelurahan
  district?: string; // Kecamatan
  city?: string; // Kabupaten / Kota
  province?: string; // Provinsi
  persil?: string; // Persil
  kohir?: string; // Kohir
  landUseType?: 'non_pertanian' | 'pertanian' | string; // Pertanian / Non Pertanian
  landUse?: string; // Penggunaan Tanah (TANAH KOSONG, RUMAH TINGGAL, dll)
  buildingArea?: number; // Luas Bangunan (m2)
  notes?: string; // Keterangan Objek
  formatAlamatAkta?: string; // Format Alamat Akta (Generated Display)
}

export interface PPATTransactionData {
  transactionStatus?: 'telah' | 'akan' | string; // Status Transaksi PPAT
  transactionDate?: string; // Tanggal Transaksi / Perolehan
  transactionValue?: number; // Nilai Transaksi / Perolehan (Numeric)
  paymentMethod?: string; // Metode / Cara Pembayaran
  notes?: string; // Keterangan Transaksi
}

export interface PPATAktaData {
  jenisAkta?: string; // Jenis Akta (Akta Jual Beli, Hibah, APHB, dll)
  nomorAkta?: string; // Nomor Akta
  tahunAkta?: string; // Tahun Akta
  tanggalAkta?: string; // Tanggal Akta
  dasarPerolehan?: string; // Dasar Perolehan
  notes?: string; // Keterangan Akta
}

export interface PPATBpnApplicationData {
  nomorSuratKuasa?: string; // Nomor Surat Kuasa
  tanggalSuratKuasa?: string; // Tanggal Surat Kuasa
  jenisPermohonan?: string; // Jenis Permohonan BPN
  permohonanNomor?: string; // Nomor Permohonan
  permohonanTempat?: string; // Tempat / Kota Kantor BPN
  permohonanTanggal?: string; // Tanggal Permohonan
  tandaBatas?: string; // Tanda Batas Fisik
  attachments?: PPATAttachmentItem[]; // Daftar Berkas / Lampiran
  notes?: string; // Keterangan Permohonan
}

export interface PPATData {
  // 1. DATA PARA PIHAK
  parties?: {
    firstParties: PPATParty[];
    secondParties: PPATParty[];
  };
  firstParties: PPATParty[]; // Pihak Pertama / Penjual / Pelepas Hak / Pewaris
  secondParties: PPATParty[]; // Pihak Kedua / Pembeli / Penerima Hak / Ahli Waris

  // 2. DATA SERTIPIKAT
  certificate?: PPATCertificateData;

  // 3. DATA PBB
  pbb?: PPATPbbData;

  // 4. DATA LETAK OBJEK
  propertyLocation?: PPATPropertyLocationData;

  // 5. DATA TRANSAKSI
  transaction?: PPATTransactionData;

  // 6. DATA AKTA PPAT
  akta?: PPATAktaData;

  // 7. DATA BPN / PERMOHONAN
  bpnApplication?: PPATBpnApplicationData;

  // Root & Legacy Compatibility Properties
  transactionType: string; // Jual Beli, Hibah, Waris, Tukar-Menukar, Inbreng, dll.
  object: PPATObjectData;
  notes?: string;
  nomorAkta?: string;
  tahunAkta?: string;
  tanggalAkta?: string;
  // Permohonan BPN (Lampiran 13) & Surat Kuasa
  nomorSuratKuasa?: string;
  tanggalSuratKuasa?: string;
  permohonanNomor?: string;
  permohonanLampiran?: string;
  permohonanPerihal?: string;
  permohonanTempat?: string;
  permohonanTanggal?: string;
  tandaBatas?: string;
  landUse?: string;
  landUseType?: 'non_pertanian' | 'pertanian' | string; // Opsi Pertanian / Non Pertanian
  // Surat Pernyataan Keaslian Dokumen Pengecekan
  tanggalSuratPernyataanKeaslian?: string;
  tempatSuratPernyataanKeaslian?: string;
  attachments?: PPATAttachmentItem[];
  documents?: PPATDocumentItem[]; // Multi-document storage per PPAT project
  updatedAt?: string;
}

export type ProjectActivityType = 'comment' | 'task_created' | 'task_completed' | 'issue' | 'file_added' | 'status_changed' | 'system' | 'mention';

export interface ProjectActivity {
  id: string;
  projectId: string;
  type: ProjectActivityType;
  message: string;
  content?: string; // Alias for content
  userId: string;
  userName: string;
  userInitials?: string;
  createdAt: any;
  updatedAt?: any;
  mentions?: string[];
  parentCommentId?: string | null;
  attachmentUrl?: string;
  attachmentName?: string;
  reactions?: Record<string, string[]>;
  taskId?: string;
  taskTitle?: string;
  assignedTo?: string;
  assignedToName?: string;
  deadline?: string;
  status?: 'open' | 'completed' | 'resolved';
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedToName?: string;
  deadline?: string;
  status: 'open' | 'completed';
  createdBy?: string;
  createdByName?: string;
  createdAt: any;
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
  participantUserIds?: string[]; // Array of unique Firebase UIDs involved in this project
  createdBy?: string;       // Firebase UID of project creator
  ownerId?: string;         // Firebase UID of project owner
  assignedToUid?: string;   // Firebase UID of assignee
  assignedToUserId?: string;// Firebase UID of assignee
  activities?: ProjectActivity[];
  tasks?: ProjectTask[];
  activitiesCount?: number;
  activeTasksCount?: number;
  lastActivityAt?: any;
  lastActivityType?: string;
  lastActivityText?: string;
  ppatData?: PPATData;
}
