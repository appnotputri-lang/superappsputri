import React from 'react';
import { DocumentGeneratorPage } from '../features/document-generator';
import { DataCorrectionLetter } from '../components/editors/DataCorrectionLetter';

export const renderDocumentRoute = (currentTab: string, props: any) => {
  if (currentTab === 'perbaikan') {
    return <DataCorrectionLetter />;
  }

  const ppatProps = props.ppatProps || {
    user: props.user,
    userProfile: props.userProfile,
    profiles: props.profiles,
    cvProfiles: props.cvProfiles,
    projects: props.projects,
    editingPPATId: props.editingPPATId,
    setEditingPPATId: props.setEditingPPATId,
    activeProjectContext: props.activeProjectContext,
    setActiveProjectContext: props.setActiveProjectContext,
    setSelectedProjectId: props.setSelectedProjectId,
    setActiveSidebarTab: props.setActiveSidebarTab,
    recordNotification: props.recordNotification,
    isSaving: props.isSaving,
    setIsSaving: props.setIsSaving
  };

  return (
    <DocumentGeneratorPage
      activeSidebarTab={currentTab as any}
      rupslbProps={props.rupslbProps}
      rupstProps={props.rupstProps}
      pendirianProps={props.pendirianProps}
      ppatProps={ppatProps}
    />
  );
};
