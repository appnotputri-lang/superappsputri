
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
  
  // Acquisition details
  isAcquisition?: boolean;
  acquisitionType?: 'AJB' | 'HIBAH';
  acquisitionSourceId?: string;
  acquisitionShares?: number;

  isNewDeposit?: boolean;
  newDepositShares?: number;
}

export interface KbliItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  categoryLetter?: string;
  categoryName?: string;
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

export interface CompanyProfile extends Partial<CompanyData> {
  id: string;
}

export interface CompanyData {
  id?: string;
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
  
  meetingStartTime: string;
  meetingEndTime: string;
  meetingChair: string;
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
  selectedProfileId?: string;
  shareTransfers: ShareTransfer[]; // <--- NEW!
  finalShareholders: Shareholder[]; // Structure after change
  resolutions: ResolutionFlags;

  createDraftAktaRups?: boolean;
  draftAktaRupsNumber?: string;
  draftAktaRupsDate?: string;
  
  notarySelectionType?: 'saya' | 'manual';
  notaryName?: string;
  notaryTitle?: string;
  notaryDomicile?: string;
  notaryNumber?: string;
  notaryDate?: string;
  isReplacementNotary?: boolean;
  beneficialOwnerConsent?: boolean;

  // Saksi
  saksi1Nama?: string;
  saksi1Lahir?: string;
  saksi1Alamat?: string;
  saksi1NIK?: string;
  saksi2Nama?: string;
  saksi2Lahir?: string;
  saksi2Alamat?: string;
  saksi2NIK?: string;
}
