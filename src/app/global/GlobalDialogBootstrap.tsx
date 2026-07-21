import React from 'react';
import { GlobalModalManager } from '../../components/modals/GlobalModalManager';
import { CompanyData, Shareholder, UserProfile, CompanyProfile, KbliItem } from '../../../types';

interface GlobalDialogBootstrapProps {
  editingShareholder: Shareholder | null;
  setEditingShareholder: (s: Shareholder | null) => void;
  editMode: 'lama' | 'baru' | null;
  setEditMode: (mode: 'lama' | 'baru' | null) => void;
  data: CompanyData;
  currentTargetSharesPaid: number | null;
  saveShareholder: (s: Shareholder) => void;
  isPreviewOpen: boolean;
  setIsPreviewOpen: (open: boolean) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  handlePrint: () => void;
  handleExportWord: () => void;
  activeSidebarTab: string;
  mergedData: any;
  isAddKbliModalOpen: boolean;
  setIsAddKbliModalOpen: (open: boolean) => void;
  kbliModalSearchTerm: string;
  setKbliModalSearchTerm: (term: string) => void;
  handleKbliModalKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  performKbliModalSearch: (term: string) => void;
  kbliPaginatedResults: KbliItem[];
  kbliCheckedKblis: string[];
  handleToggleAllKbliOnPage: () => void;
  handleToggleKbliChecked: (code: string) => void;
  kbliTotalPages: number;
  getKbliPageNumbers: () => number[];
  kbliCurrentPage: number;
  setKbliCurrentPage: (page: number) => void;
  handleAddKbliBatch: () => void;
  showPendirianPreview: boolean;
  setShowPendirianPreview: (open: boolean) => void;
  pendirianPreviewData: any;
  handlePendirianExportWord: () => void;
  isExportingPendirian: boolean;
  isEditProfileModalOpen: boolean;
  setIsEditProfileModalOpen: (open: boolean) => void;
  user: any;
  userProfile: UserProfile | null;
  proxyModalOpenId: string | null;
  setProxyModalOpenId: (id: string | null) => void;
  profiles: CompanyProfile[];
  updateData: (fields: Partial<CompanyData>) => void;
}

export const GlobalDialogBootstrap: React.FC<GlobalDialogBootstrapProps> = (props) => {
  return <GlobalModalManager {...(props as any)} />;
};
