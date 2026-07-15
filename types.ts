export type UserRole = 'Super Admin' | 'Admin' | 'Staff';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  level?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  province: string;
  city: string;
  fullAddress: string; // The specific street/no part
  rt: string;
  rw: string;
  kelurahan: string;
  kecamatan: string;
  postalCode?: string;
  phoneNumber?: string;
}

export interface Shareholder {
  id: string;
  salutation: 'Tuan' | 'Nyonya' | 'Nona';
  name: string;
  birthCity: string;
  birthDate: string;
  nationality: string;
  nationalityType?: 'WNI' | 'WNA';
  occupation: string;
  address: Address;
  nik: string;
  passportNumber?: string;
  hasKitas?: boolean;
  kitasType?: 'KITAS' | 'KITAP' | 'NONE';
  kitasNumber?: string;
  sharesOwned: number;
  isExistingParty?: boolean;
  linkedPartyId?: string;
  isManagement?: boolean;
  managementPosition?: string;
  
  // Shareholder Type details
  shareholderType?: 'PERORANGAN' | 'BADAN_HUKUM';
  isForeign?: boolean;
  foreignCountry?: string;
  legalEntityType?: string;
  skNumber?: string;
  skDate?: string;
  skIssuer?: string;
  npwp?: string;
  linkedProfileId?: string;
  establishmentDeedNumber?: string;
  establishmentDeedDate?: string;
  establishmentNotary?: string;
  establishmentNotaryTitle?: string;
  establishmentNotaryDomicile?: string;
  establishmentSkNumber?: string;
  establishmentSkDate?: string;
  amendmentDeeds?: AmendmentDeed[];
  representativePosition?: string;
  representativeId?: string;
  
  // Acquisition details
  isAcquisition?: boolean;
  acquisitionType?: 'AJB' | 'HIBAH';
  acquisitionSourceId?: string;
  acquisitionShares?: number;

  isNewDeposit?: boolean;
  newDepositShares?: number;
  isPresent?: boolean;

  // Underage & Guardian details
  isUnderage?: boolean;
  guardianName?: string;
  guardianNik?: string;
  guardianSalutation?: 'Tuan' | 'Nyonya' | 'Nona';
  guardianRelationship?: 'AYAH KANDUNG' | 'IBU KANDUNG' | 'WALI' | string;
  guardianAddress?: Address;
  guardianBirthCity?: string;
  guardianBirthDate?: string;
  guardianNationalityType?: 'WNI' | 'WNA';
  guardianNationality?: string;
  guardianOccupation?: string;
  guardianPassportNumber?: string;
  guardianKitasNumber?: string;

  // Proxy / Kuasa fields (for RUPS LB)
  isProxy?: boolean;       // true = pemegang saham dikuasakan ke orang lain
  proxyData?: {
    salutation: 'Tuan' | 'Nyonya' | 'Nona';
    name: string;
    nik: string;
    birthCity: string;
    birthDate: string;
    occupation: string;
    address: {
      fullAddress: string;
      rt: string;
      rw: string;
      kelurahan: string;
      kecamatan: string;
      city: string;
      province: string;
      postalCode?: string;
    };
    proxyDeedDate: string;  // Tanggal Akta/Surat Kuasa
    representationType?: 'KUASA' | 'DIREKTUR_PT_LAIN';
    nationalityType?: 'WNI' | 'WNA';
    isForeign?: boolean;
    nationality?: string;
    passportNumber?: string;
    kitasNumber?: string;
    kitasType?: 'NONE' | 'KITAS' | 'KITAP';
    hasKitas?: boolean;
  };
}

export interface Guest {
  id: string;
  name: string;
  position?: string;
  salutation?: 'Tuan' | 'Nyonya' | 'Nona';
  birthCity?: string;
  birthDate?: string;
  nationalityType?: 'WNI' | 'WNA';
  nationality?: string;
  occupation?: string;
  address?: Address;
  nik?: string;
  passportNumber?: string;
  hasKitas?: boolean;
  kitasType?: 'KITAS' | 'KITAP' | 'NONE';
  kitasNumber?: string;
}

export interface RuangLingkupSkala {
  risiko: string;
  perizinan: string;
}

export interface RuangLingkupSkalaGroup {
  mikro: RuangLingkupSkala;
  kecil: RuangLingkupSkala;
  menengah: RuangLingkupSkala;
  besar: RuangLingkupSkala;
}

export interface RuangLingkup {
  deskripsi: string;
  skala: RuangLingkupSkalaGroup;
}

export interface KbliItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  categoryLetter?: string;
  categoryName?: string;
  // New fields
  uraian?: string;
  ruangLingkup?: RuangLingkup[];
}

export interface ManagementItem {
  id: string;
  name: string;
  position: string;
  salutation?: 'Tuan' | 'Nyonya' | 'Nona';
  birthCity?: string;
  birthDate?: string;
  nationalityType?: 'WNI' | 'WNA';
  nationality?: string;
  occupation?: string;
  address?: Address;
  nik?: string;
  passportNumber?: string;
  kitasNumber?: string;
  isPresent?: boolean;
}

export interface ResolutionFlags {
  domicile: boolean;
  address: boolean;
  capitalBase: boolean;
  capitalPaid: boolean;
  capitalBaseDecrease: boolean;
  capitalPaidDecrease: boolean;
  reappointment: boolean;
  kbli: boolean;
  management: boolean;
  shareholders: boolean;
  companyNameChange: boolean;
}

export type DocumentType = 'CIRCULAR' | 'MINUTES';
export type ManagementChangeType = 'ALL_DISMISSED' | 'PARTIAL_CHANGE' | 'REAPPOINTMENT';

export interface ShareTransfer {
  id: string;
  type: 'Jual Beli' | 'Hibah';
  fromShareholderId: string;
  toShareholderId: string;
  sharesTransferred: number;
}

export interface SkSpDocument {
  id: string;
  type: 'SK' | 'SP' | 'SP_DATA_PERSEROAN' | 'SP_ANGGARAN_DASAR';
  number: string;
  date: string;
}

export interface AmendmentDeed {
  id: string;
  number: string;
  date: string;
  notary: string;
  notaryTitle?: string;
  notaryDomicile: string;
  skNumber: string; // Keep for legacy if needed, but skSpDocuments is preferred
  skDate: string;
  skSpDocuments: SkSpDocument[];
}

export interface CompanyRevision {
  revisionId: string;
  changedAt: string; // ISO String
  changedBy: string;
  projectCauseId?: string;
  reason: string;
  changes: {
    field: string;
    before: any;
    after: any;
  }[];
  deedNumber?: string;
  skNumber?: string;
  ahuNumber?: string;
}

export interface CompanyProfile extends Partial<CompanyData> {
  id: string;
  isArchived?: boolean;
  phoneNumber?: string;
  versionHistory?: CompanyRevision[];
  clientType?: 'PT' | 'CV' | 'YAYASAN' | 'PERKUMPULAN' | 'PERSEKUTUAN_FIRMA' | 'PERSEKUTUAN_PERDATA' | 'KOPERASI' | 'PMA' | 'PERORANGAN' | 'LAINNYA';
}

export interface CompanyData {
  id?: string;
  updatedAt?: string;
  documentType: DocumentType;
  companyName: string;
  companyShortName?: string;
  targetCompanyName?: string;
  targetCompanyShortName?: string;
  companyType?: string;
  npwp?: string;
  duration?: string;
  status?: string;

  oldDomicile: string;
  kedudukanPT?: string;
  domicile: string;
  domicileStyle?: 'KABUPATEN' | 'KOTA';
  oldAddress: Address;
  newAddress: Address;
  oldFullAddress: string; // Combined string for doc
  fullAddress: string;    // Combined string for doc
  kbliItems: KbliItem[];
  
  managementChangeType: ManagementChangeType;
  oldManagementItems: ManagementItem[];
  newManagementItems: ManagementItem[];
  managementEffectiveUntil: string;
  managementEffectiveUntilType?: 'AD' | 'MANUAL';
  managementEffectiveDate?: string;
  reappointmentOldExpiredDate?: string;
  reappointmentStartDate?: string;
  reappointmentEndDate?: string;
  
  originalTotalShares: number; // Paid-up share count
  originalAuthorizedShares: number; // New: Total base share count
  originalSharePrice: number;
  originalCapitalBase: number; // Total Authorized IDR
  originalCapitalPaid: number; // Total Paid-up IDR
  
  targetCapitalBase: number;
  targetCapitalPaid: number;
  capitalArticleNumber: string; // e.g. "4"
  domicileArticleNumber: string; // e.g. "1"
  
  representativeType: 'EXISTING' | 'MANUAL';
  authorizedRepresentativeId: string;
  manualRepresentative?: Shareholder;
  
  signingPlace: string;
  signingDate: string;
  
  aktaStartTime: string;
  meetingStartTime: string;
  meetingEndTime: string;
  meetingChair: string;
  meetingChairPosition?: string;
  invitationNumber?: string;
  invitationDate?: string;
  meetingAgenda: string;
  
  // Akta Pendirian
  establishmentDeedNumber: string;
  establishmentDeedDate: string;
  establishmentNotary: string;
  establishmentNotaryTitle?: string;
  establishmentNotaryDomicile: string;
  establishmentSkNumber: string;
  establishmentSkDate: string;

  // Akta Perubahan (legacy - to be replaced by amendmentDeeds)
  latestAmendmentDeedNumber: string;
  latestAmendmentDeedDate: string;
  latestAmendmentNotary: string;
  latestAmendmentSkNumber: string;
  latestAmendmentSkDate: string;

  // Multiple Amendment Deeds
  amendmentDeeds: AmendmentDeed[];

  shareholders: Shareholder[];
  guests: Guest[];
  selectedProfileId?: string;
  shareTransfers: ShareTransfer[]; // <--- NEW!
  finalShareholders: Shareholder[]; // Structure after change
  resolutions: ResolutionFlags;

  createDraftAktaRups?: boolean;
  draftAktaRupsNumber?: string;
  draftAktaRupsOrderNumber?: string;
  draftAktaRupsDate?: string;
  draftAktaRupsTime?: string;
  
  notarySelectionType?: 'saya' | 'manual';
  notaryName?: string;
  notaryTitle?: string;
  notaryDomicile?: string;
  notaryNumber?: string;
  notaryDate?: string;
  isReplacementNotary?: boolean;
  beneficialOwnerConsent?: boolean;
  
  documentStatus?: 'DRAFTING' | 'DRAFT NOTULEN DI KIRIM' | 'DRAFT AKTA DIKIRIM' | 'SUDAH CETAK AKTA' | 'SUDAH INPUT AHU' | 'SELESAI';

  // RUPST Extra Fields
  rupslbStatus?: 'Draft' | 'Final';
  rupstStatus?: 'Draft' | 'Final';
  rupstStreet?: string;
  rupstRt?: string;
  rupstRw?: string;
  rupstKelurahan?: string;
  rupstKecamatan?: string;
  rupstFiscalYear?: string;
  rupstNetProfit?: number;
  rupstDividendAmount?: number;
  rupstRetainedProfit?: number;
  rupstShowRetainedProfit?: boolean;
  rupstFinancialReportNumber?: string;
  rupstFinancialReportDate?: string;
  rupstFinancialReportSignatoryName?: string;
  rupstFinancialReportSignatoryPosition?: string;
  rupstStatementNeraca?: boolean;
  rupstStatementLabaRugi?: boolean;
  rupstStatementPerubahanEkuitas?: boolean;
  rupstStatementArusKas?: boolean;
  rupstStatementCatatan?: boolean;
  rupstStatementNamaAnggota?: boolean;
  rupstStatementGaji?: boolean;
  rupstNotulenNumber?: string;
  rupstMeetingEndTime?: string;
  rupstInvitationNumber?: string;
  rupstInvitationDate?: string;
  rupstAdArticle?: string;
  rupstAdParagraph?: string;
  rupstQuorumArticle?: string;
  rupstQuorumParagraph?: string;
  rupstAlasanAuditA?: boolean;
  rupstAlasanAuditB?: boolean;
  rupstAlasanAuditC?: boolean;
  rupstAlasanAuditD?: boolean;
  rupstAlasanAuditE?: boolean;
  rupstAlasanAuditF?: boolean;
  rupstIsAudited?: boolean;
  rupstNonAuditedUseKAP?: boolean;
  rupstQuestionA?: 'ya' | 'tidak';
  rupstQuestionB?: 'ya' | 'tidak';
  rupstQuestionC?: 'ya' | 'tidak';
  rupstQuestionD?: 'ya' | 'tidak';
  rupstQuestionE?: 'ya' | 'tidak';
  rupstQuestionF?: 'ya' | 'tidak';
  rupstKapName?: string;
  rupstKapLicenseNumber?: string;
  rupstKapExpiryDate?: string;
  rupstAuditReportNumber?: string;
  rupstAuditReportDate?: string;

  // Sirkuler Laporan Tahunan Extra Fields
  slHari?: string;
  slTanggalHuruf?: string;
  slAlasanAuditA?: boolean;
  slAlasanAuditB?: boolean;
  slAlasanAuditC?: boolean;
  slAlasanAuditD?: boolean;
  slAlasanAuditE?: boolean;
  slAlasanAuditF?: boolean;
  slLaporanNomor?: string;
  slLaporanTanggalHuruf?: string;
  slTahunBukuAkhirHuruf?: string;

  // Saksi
  saksi1Nama?: string;
  saksi1Lahir?: string;
  saksi1Alamat?: string;
  saksi1NIK?: string;
  saksi2Nama?: string;
  saksi2Lahir?: string;
  saksi2Alamat?: string;
  saksi2NIK?: string;

  managementDismissals?: ManagementDismissal[];
  managementAppointments?: ManagementAppointment[];
  shareTransfersNew?: ShareTransferItem[];
  capitalSubscriptionsNew?: CapitalSubscriptionItem[];
  rupstDividends?: RupstDividendDistribution[];
  rupstDividendPaymentDate?: string;
  rupstType?: 'sirkuler' | 'rapat';
  totalShares?: number;
  rupstReceiptNumber?: string;
  rupstReceiptDate?: string;
  fiscalYear?: number;
}

export interface RupstDividendDistribution {
  id: string;
  shareholderName: string;
  percentage: number;
  amount: number;
  paymentDate?: string;
}

export interface ManagementDismissal {
  id: string;
  salutation: 'Tuan' | 'Nyonya' | 'Nona';
  name: string;
  position: string;
  reason: 'DIBERHENTIKAN_DENGAN_HORMAT' | 'MENGUNDURKAN_DIRI';
  resignationDate?: string;
  replacementType?: 'PRESENT' | 'MANUAL';
  replacedByName?: string;
  replacedByPosition?: string;
  replacedBySalutation?: 'Tuan' | 'Nyonya' | 'Nona';
  replacedByNik?: string;
  replacedByDetail?: Shareholder;
}

export interface ManagementAppointment {
  id: string;
  salutation: 'Tuan' | 'Nyonya' | 'Nona';
  name: string;
  position: string;
  nik?: string;
  detail?: Shareholder;
}

export interface ShareTransferItem {
  id: string;
  fromName: string;
  transferType: 'AJB' | 'HIBAH';
  toName: string;
  sharesTransferred: number;
  toType?: 'EXISTING' | 'PRESENT' | 'NEW';
  toSalutation?: 'Tuan' | 'Nyonya' | 'Nona';
  toNik?: string;
  toDetail?: Shareholder;
}

export interface CapitalSubscriptionItem {
  id: string;
  subscriberName: string;
  sharesCount: number;
}

export type SidebarTabId = 'beranda' | 'company_profile' | 'cv_profile' | 'notulen' | 'pendirian' | 'rupst' | 'perbaikan' | 'draft_akta_rups' | 'panduan' | 'kbli_mapping' | 'saran_kbli' | 'import_kbli' | 'laporan' | 'whatsapp_settings' | 'projects' | 'project_detail' | 'user_management';
