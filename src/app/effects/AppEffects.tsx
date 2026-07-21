import React, { useEffect, useRef } from 'react';
import { CompanyData } from '../../../types';

interface AppEffectsProps {
  data: CompanyData;
  activeProjectContext: string | null;
  activeSidebarTab: string;
  editingRupstId: string | null;
  editingProjectId: string | null;
  projects: any[];
  rupstProjects: any[];
  saveProject: (id: string, projectData: any, type: string) => Promise<any>;
  setAutoSaveStatus: (status: 'saved' | 'dirty' | 'saving' | 'error') => void;
}

export const AppEffects: React.FC<AppEffectsProps> = ({
  data,
  setAutoSaveStatus
}) => {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // When data changes after initial mount, set dirty status
    setAutoSaveStatus('dirty');
  }, [data, setAutoSaveStatus]);

  return null;
};
