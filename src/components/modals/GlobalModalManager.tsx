import React from 'react';
import { ShareholderModal } from './ShareholderModal';
import { DraftPreviewModal } from './DraftPreviewModal';
import { KbliModal } from './KbliModal';
import { EditProfileModal } from '../../../components/EditProfileModal';
import PendirianDocumentPreview from '../../PendirianDocumentPreview';

interface GlobalModalManagerProps {
  // Shareholder Modal Props
  editingShareholder: any;
  setEditingShareholder: (sh: any) => void;
  editMode: any;
  setEditMode: (mode: any) => void;
  data: any;
  currentTargetSharesPaid: number;
  saveShareholder: () => void;

  // Draft Preview Modal Props
  isPreviewOpen: boolean;
  setIsPreviewOpen: (val: boolean) => void;
  zoom: number;
  setZoom: (val: number | ((prev: number) => number)) => void;
  handlePrint: () => void;
  handleExportWord: () => void;
  activeSidebarTab: string;
  mergedData: any;

  // KBLI Modal Props
  isAddKbliModalOpen: boolean;
  setIsAddKbliModalOpen: (val: boolean) => void;
  kbliModalSearchTerm: string;
  setKbliModalSearchTerm: (val: string) => void;
  handleKbliModalKeyDown: (e: React.KeyboardEvent) => void;
  performKbliModalSearch: () => void;
  kbliPaginatedResults: any[];
  kbliCheckedKblis: string[];
  handleToggleAllKbliOnPage: () => void;
  handleToggleKbliChecked: (kode: string) => void;
  kbliTotalPages: number;
  getKbliPageNumbers: () => number[];
  kbliCurrentPage: number;
  setKbliCurrentPage: (val: number) => void;
  handleAddKbliBatch: () => void;

  // Pendirian Preview Props
  showPendirianPreview: boolean;
  setShowPendirianPreview: (val: boolean) => void;
  pendirianPreviewData: any;
  handlePendirianExportWord: (data: any) => void;
  isExportingPendirian: boolean;

  // Edit Profile Props
  isEditProfileModalOpen: boolean;
  setIsEditProfileModalOpen: (val: boolean) => void;
  user: any;
  userProfile: any;
}

export const GlobalModalManager: React.FC<GlobalModalManagerProps> = (props) => {
  return (
    <>
      <DraftPreviewModal
        isOpen={props.isPreviewOpen}
        onClose={() => props.setIsPreviewOpen(false)}
        zoom={props.zoom}
        setZoom={props.setZoom}
        handlePrint={props.handlePrint}
        handleExportWord={props.handleExportWord}
        activeSidebarTab={props.activeSidebarTab}
        mergedData={props.mergedData}
      />

      <ShareholderModal
        editingShareholder={props.editingShareholder}
        setEditingShareholder={props.setEditingShareholder}
        editMode={props.editMode}
        setEditMode={props.setEditMode}
        data={props.data}
        currentTargetSharesPaid={props.currentTargetSharesPaid}
        saveShareholder={props.saveShareholder}
      />

      {props.showPendirianPreview && props.pendirianPreviewData && (
        <PendirianDocumentPreview
          data={props.pendirianPreviewData}
          onExport={() => props.handlePendirianExportWord(props.pendirianPreviewData)}
          onClose={() => props.setShowPendirianPreview(false)}
          isExporting={props.isExportingPendirian}
        />
      )}

      <KbliModal
        isOpen={props.isAddKbliModalOpen}
        onClose={() => props.setIsAddKbliModalOpen(false)}
        searchTerm={props.kbliModalSearchTerm}
        setSearchTerm={props.setKbliModalSearchTerm}
        onKeyDown={props.handleKbliModalKeyDown}
        onSearch={props.performKbliModalSearch}
        paginatedResults={props.kbliPaginatedResults}
        checkedKblis={props.kbliCheckedKblis}
        onToggleAllOnPage={props.handleToggleAllKbliOnPage}
        onToggleKbli={props.handleToggleKbliChecked}
        totalPages={props.kbliTotalPages}
        pageNumbers={props.getKbliPageNumbers()}
        currentPage={props.kbliCurrentPage}
        setCurrentPage={props.setKbliCurrentPage}
        onAddBatch={props.handleAddKbliBatch}
      />

      {props.isEditProfileModalOpen && props.user && props.userProfile && (
        <EditProfileModal
          isOpen={props.isEditProfileModalOpen}
          onClose={() => props.setIsEditProfileModalOpen(false)}
          userId={props.user.uid}
          currentProfile={props.userProfile}
        />
      )}
    </>
  );
};
