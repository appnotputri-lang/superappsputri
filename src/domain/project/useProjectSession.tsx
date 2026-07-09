import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ProjectSessionContextType {
  // Session States
  editingProjectId: string | null;
  setEditingProjectId: (id: string | null) => void;
  editingRupstId: string | null;
  setEditingRupstId: (id: string | null) => void;
  editingPendirianId: string | null;
  setEditingPendirianId: (id: string | null) => void;
  editingProfileId: string | null;
  setEditingProfileId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  activeProjectContext: string | null;
  setActiveProjectContext: (id: string | null) => void;
  activeProjectJobType: string | null;
  setActiveProjectJobType: (type: string | null) => void;

  // Session Actions
  openProject: (projectId: string, jobType: string) => void;
  closeProject: () => void;
  switchProject: (projectId: string, jobType: string) => void;
  activateProject: (projectId: string) => void;
  deactivateProject: () => void;
}

const ProjectSessionContext = createContext<ProjectSessionContextType | null>(null);

export function ProjectSessionProvider({ children }: { children: ReactNode }) {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingRupstId, setEditingRupstId] = useState<string | null>(null);
  const [editingPendirianId, setEditingPendirianId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeProjectContext, setActiveProjectContext] = useState<string | null>(null);
  const [activeProjectJobType, setActiveProjectJobType] = useState<string | null>(null);

  // Open Project - Sets project context & job type
  const openProject = useCallback((projectId: string, jobType: string) => {
    setActiveProjectContext(projectId);
    setActiveProjectJobType(jobType);
  }, []);

  // Close Project - Clears project context & job type
  const closeProject = useCallback(() => {
    setActiveProjectContext(null);
    setActiveProjectJobType(null);
  }, []);

  // Session Switching - Changes the current project context cleanly
  const switchProject = useCallback((projectId: string, jobType: string) => {
    setActiveProjectContext(projectId);
    setActiveProjectJobType(jobType);
  }, []);

  // Project Activation - Sets selected project for viewing details
  const activateProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
  }, []);

  // Project Deactivation - Deselects/deactivates the active selected project
  const deactivateProject = useCallback(() => {
    setSelectedProjectId(null);
  }, []);

  return (
    <ProjectSessionContext.Provider value={{
      editingProjectId,
      setEditingProjectId,
      editingRupstId,
      setEditingRupstId,
      editingPendirianId,
      setEditingPendirianId,
      editingProfileId,
      setEditingProfileId,
      selectedProjectId,
      setSelectedProjectId,
      activeProjectContext,
      setActiveProjectContext,
      activeProjectJobType,
      setActiveProjectJobType,
      openProject,
      closeProject,
      switchProject,
      activateProject,
      deactivateProject
    }}>
      {children}
    </ProjectSessionContext.Provider>
  );
}

export function useProjectSession() {
  const context = useContext(ProjectSessionContext);
  if (!context) {
    throw new Error('useProjectSession must be used within a ProjectSessionProvider');
  }
  return context;
}
