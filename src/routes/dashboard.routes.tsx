import React from 'react';
import { Dashboard } from '../pages/Dashboard';
import { INITIAL_STATE } from '../domain/company/initialCompanyData';

export const renderDashboardRoute = (props: any) => {
  return (
    <Dashboard
      profiles={props.profiles}
      projects={props.projects}
      rupstProjects={props.rupstProjects}
      pendirianProjects={props.pendirianProjects}
      compiledActivities={props.compiledActivities || []}
      compiledDocuments={props.compiledDocuments || []}
      setActiveSidebarTab={props.setActiveSidebarTab || (() => {})}
      setEditingProjectId={props.setEditingProjectId || (() => {})}
      setEditingRupstId={props.setEditingRupstId || (() => {})}
      updateData={props.updateData}
      INITIAL_STATE={INITIAL_STATE}
      handleDownloadProject={props.handleDownloadProject || (() => {})}
      currentUser={props.userProfile}
    />
  );
};
