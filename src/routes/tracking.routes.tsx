import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProjectList, ProjectDetail } from '../features/project-engine';

export const TrackingRouteContainer: React.FC<{ props: any }> = ({ props }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const parts = location.pathname.split('/').filter(Boolean);
  const lastPart = parts[parts.length - 1];

  let selectedProjectId = props.selectedProjectId;
  if (parts.length >= 2 && !['projects', 'projects-detail', 'new'].includes(lastPart)) {
    selectedProjectId = lastPart;
  }

  if (selectedProjectId && props.userProfile) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        currentUser={props.userProfile}
        onBack={() => {
          if (props.setSelectedProjectId) props.setSelectedProjectId(null);
          navigate('/projects');
        }}
      />
    );
  }

  return (
    <ProjectList
      onSelectProject={(id) => {
        if (props.setSelectedProjectId) props.setSelectedProjectId(id);
        navigate(`/projects/${id}`);
      }}
      currentUser={props.userProfile}
    />
  );
};

export const renderTrackingRoute = (currentTab: string, props: any) => {
  return <TrackingRouteContainer props={props} />;
};
