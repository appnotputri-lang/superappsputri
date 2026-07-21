import React from 'react';
import { ProjectList, ProjectDetail } from '../features/project-engine';

export const renderTrackingRoute = (currentTab: string, props: any) => {
  if (currentTab === 'projects') {
    return (
      <ProjectList
        onSelectProject={(id) => {
          if (props.setSelectedProjectId) props.setSelectedProjectId(id);
          if (props.setActiveSidebarTab) props.setActiveSidebarTab('project_detail');
        }}
        currentUser={props.userProfile}
      />
    );
  }

  if (currentTab === 'project_detail' && props.selectedProjectId && props.userProfile) {
    return (
      <ProjectDetail
        projectId={props.selectedProjectId}
        currentUser={props.userProfile}
        onBack={() => {
          if (props.setSelectedProjectId) props.setSelectedProjectId(null);
          if (props.setActiveSidebarTab) props.setActiveSidebarTab('projects');
        }}
      />
    );
  }

  return null;
};
