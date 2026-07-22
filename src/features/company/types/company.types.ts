import { CompanyProfile } from '../../../../types';

export interface CompanyHeaderProps {
  editingProfileId: string | null;
  setEditingProfileId: (id: string | null) => void;
  setIsProfilePreview: (val: boolean) => void;
  updateData: (updates: any) => void;
  INITIAL_STATE: any;
  isCv?: boolean;
  onSyncDrive?: () => Promise<void>;
  isSyncing?: boolean;
}

export interface CompanyToolbarProps {
  profiles: CompanyProfile[];
  showArchivedProfiles: boolean;
  setShowArchivedProfiles: (val: boolean) => void;
  setProfileCurrentPage: (page: number) => void;
  profileSearchQuery: string;
  setProfileSearchQuery: (query: string) => void;
  selectedProfileYear: string;
  setSelectedProfileYear: (year: string) => void;
  uniqueProfileYears: string[];
  selectedClientType: string;
  setSelectedClientType: (type: string) => void;
}

export interface CompanyListProps {
  profiles: CompanyProfile[];
  profileStartIndex: number;
  paginatedProfileResults: CompanyProfile[];
  totalProfileItems: number;
  profileSortField: string;
  profileSortOrder: 'asc' | 'desc';
  handleProfileSort: (field: string) => void;
  renderProfileSortArrows: (field: string) => React.ReactNode;
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  setEditingProfileId: (id: string | null) => void;
  setIsProfilePreview: (val: boolean) => void;
  updateData: (updates: any) => void;
  INITIAL_STATE: any;
  handleDuplicateProfile: (profile: CompanyProfile) => void;
  handleArchiveProfile: (profile: CompanyProfile) => void;
  profileCurrentPage: number;
  setProfileCurrentPage: (page: number) => void;
  totalProfilePages: number;
  userProfile?: any;
  deleteCompany?: (id: string, redirect: boolean) => Promise<any>;
}

export interface CompanyDetailProps {
  data: any;
  isProfilePreview: boolean;
  setIsProfilePreview: (val: boolean) => void;
  user: any;
  userProfile: any;
  deleteCompany: (id: string, redirect: boolean) => Promise<any>;
  editingProfileId: string | null;
  setEditingProfileId: (id: string | null) => void;
  recordNotification: (title: string, desc: string, type: string) => void;
  handleFirestoreError: (err: any, type: any, path: string) => void;
  openShareholderEditor: (type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham', sh?: any, dismissalId?: string) => void;
  deleteShareholder: (id: string, type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham') => void;
}

export interface CompanyFormProps {
  data: any;
  isProfilePreview: boolean;
  setIsProfilePreview: (val: boolean) => void;
  updateData: (updates: any) => void;
  resetData: () => void;
  isSaving: boolean;
  setIsSaving: (val: boolean) => void;
  saveCompany: (id: string, data: any, redirect: boolean) => Promise<any>;
  editingProfileId: string | null;
  setEditingProfileId: (id: string | null) => void;
  user: any;
  recordNotification: (title: string, desc: string, type: string) => void;
  handleFirestoreError: (err: any, type: any, path: string) => void;
  isAddKbliModalOpen: boolean;
  setIsAddKbliModalOpen: (val: boolean) => void;
  openShareholderEditor: (type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham', sh?: any, dismissalId?: string) => void;
  deleteShareholder: (id: string, type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham') => void;
}

export interface CompanyPageProps {
  profiles?: CompanyProfile[];
  editingProfileId?: string | null;
  setEditingProfileId?: (id: string | null) => void;
  setIsProfilePreview?: (val: boolean) => void;
  updateData?: (updates: any) => void;
  INITIAL_STATE?: any;
  showArchivedProfiles?: boolean;
  setShowArchivedProfiles?: (val: boolean) => void;
  profileCurrentPage?: number;
  setProfileCurrentPage?: (page: number) => void;
  profileSearchQuery?: string;
  setProfileSearchQuery?: (query: string) => void;
  selectedProfileYear?: string;
  setSelectedProfileYear?: (year: string) => void;
  profileSortField?: string;
  setProfileSortField?: (field: string) => void;
  profileSortOrder?: 'asc' | 'desc';
  setProfileSortOrder?: (order: 'asc' | 'desc') => void;
  openDropdownId?: string | null;
  setOpenDropdownId?: (id: string | null) => void;
  handleDuplicateProfile?: (profile: CompanyProfile) => void;
  handleArchiveProfile?: (profile: CompanyProfile) => void;
  
  // New props for Detail & Form
  isProfilePreview?: boolean;
  data?: any;
  user?: any;
  userProfile?: any;
  deleteCompany?: (id: string, redirect: boolean) => Promise<any>;
  recordNotification?: (title: string, desc: string, type: string) => void;
  handleFirestoreError?: (err: any, type: any, path: string) => void;
  resetData?: () => void;
  isSaving?: boolean;
  setIsSaving?: (val: boolean) => void;
  saveCompany?: (id: string, data: any, redirect: boolean) => Promise<any>;
  isAddKbliModalOpen?: boolean;
  setIsAddKbliModalOpen?: (val: boolean) => void;
  openShareholderEditor?: (type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham', sh?: any, dismissalId?: string) => void;
  deleteShareholder?: (id: string, type: 'lama' | 'baru' | 'pengganti' | 'pengganti_saham') => void;
}

