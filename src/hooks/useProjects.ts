import { useState, useEffect, useCallback } from 'react';
import { CompanyData } from '../../types';
import { ProjectService } from '../services/ProjectService';

export function useProjects() {
  const [projects, setProjects] = useState<CompanyData[]>([]);
  const [rupstProjects, setRupstProjects] = useState<CompanyData[]>([]);
  const [rupstPublicProjects, setRupstPublicProjects] = useState<CompanyData[]>([]);
  const [pendirianProjects, setPendirianProjects] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    let projectsReady = false;
    let rupstReady = false;
    let pendirianReady = false;

    const checkIfLoaded = () => {
      if (projectsReady && rupstReady && pendirianReady) {
        setLoading(false);
      }
    };

    const unsubProjects = ProjectService.listenToRupsLb((list) => {
      setProjects(list);
      projectsReady = true;
      checkIfLoaded();
    });

    const unsubRupst = ProjectService.listenToRupst((list) => {
      setRupstProjects(list);
      rupstReady = true;
      checkIfLoaded();
    });

    const unsubRupstPublic = ProjectService.listenToRupstPublic((list) => {
      setRupstPublicProjects(list);
    });

    const unsubPendirian = ProjectService.listenToPendirian((list) => {
      setPendirianProjects(list);
      pendirianReady = true;
      checkIfLoaded();
    });

    return () => {
      unsubProjects();
      unsubRupst();
      unsubRupstPublic();
      unsubPendirian();
    };
  }, []);

  const saveProject = useCallback(async (
    projectId: string,
    data: any,
    type: 'rupslb' | 'rupst' | 'rupst_public' | 'pendirian'
  ) => {
    try {
      if (type === 'rupslb') {
        await ProjectService.saveRupsLb(projectId, data);
      } else if (type === 'rupst') {
        await ProjectService.saveRupst(projectId, data);
      } else if (type === 'rupst_public') {
        await ProjectService.saveRupstPublic(projectId, data);
      } else if (type === 'pendirian') {
        await ProjectService.savePendirian(projectId, data);
      }
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (
    projectId: string,
    type: 'rupslb' | 'rupst' | 'rupst_public' | 'pendirian'
  ) => {
    try {
      if (type === 'rupslb') {
        await ProjectService.deleteRupsLb(projectId);
      } else if (type === 'rupst') {
        await ProjectService.deleteRupst(projectId);
      } else if (type === 'rupst_public') {
        await ProjectService.deleteRupstPublic(projectId);
      } else if (type === 'pendirian') {
        await ProjectService.deletePendirian(projectId);
      }
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, []);

  return {
    projects,
    rupstProjects,
    rupstPublicProjects,
    pendirianProjects,
    loading,
    error,
    saveProject,
    deleteProject
  };
}
