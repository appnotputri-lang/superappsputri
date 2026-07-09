import React, { createContext, useContext, ReactNode } from 'react';
import { useProjects } from '../hooks/useProjects';
import { CompanyData } from '../../types';

interface ProjectContextType {
  projects: CompanyData[];
  rupstProjects: CompanyData[];
  rupstPublicProjects: CompanyData[];
  pendirianProjects: CompanyData[];
  loading: boolean;
  error: Error | null;
  saveProject: (projectId: string, data: any, type: 'rupslb' | 'rupst' | 'rupst_public' | 'pendirian') => Promise<void>;
  deleteProject: (projectId: string, type: 'rupslb' | 'rupst' | 'rupst_public' | 'pendirian') => Promise<void>;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const projectValue = useProjects();

  return (
    <ProjectContext.Provider value={projectValue}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
