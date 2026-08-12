import { useState, useEffect, useCallback, useMemo } from 'react';
import { CompanyData } from '../../types';
import { ProjectService } from '../services/ProjectService';
import { useAuthContext } from '../contexts/AuthContext';
import { FirestoreTracker } from '../lib/firestoreTracker';

export function useProjects() {
  const { user } = useAuthContext();
  const [projects, setProjects] = useState<CompanyData[]>([]);
  const [rupstProjects, setRupstProjects] = useState<CompanyData[]>([]);
  const [rupstPublicProjects, setRupstPublicProjects] = useState<CompanyData[]>([]);
  const [pendirianProjects, setPendirianProjects] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Lazy route-driven subscription: Only listen to collection when relevant route is active
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setRupstProjects([]);
      setRupstPublicProjects([]);
      setPendirianProjects([]);
      setLoading(false);
      return;
    }

    const currentPath = window.location.pathname;
    const hashPath = window.location.hash ? window.location.hash.substring(1) : '';
    const activeRoute = hashPath || currentPath;

    let unsubRupsLb: (() => void) | null = null;
    let unsubRupst: (() => void) | null = null;
    let unsubRupstPublic: (() => void) | null = null;
    let unsubPendirian: (() => void) | null = null;

    // 1. RUPSLB Route
    if (activeRoute.includes('/rupslb')) {
      const cached = FirestoreTracker.cacheGet<CompanyData[]>('projects');
      if (cached.hit && cached.data) {
        FirestoreTracker.logMenuOpen('RUPSLB', 'HIT');
        setProjects(cached.data);
      } else {
        FirestoreTracker.logMenuOpen('RUPSLB', 'MISS', 'projects', 50);
        FirestoreTracker.logListenerStart('projects');
        unsubRupsLb = ProjectService.listenToRupsLb((list) => {
          FirestoreTracker.cacheSet('projects', list);
          FirestoreTracker.logMenuOpen('RUPSLB', 'MISS', 'projects', undefined, list.length);
          setProjects(list);
        });
      }
    }

    // 2. RUPST Route
    if (activeRoute.includes('/rupst')) {
      const cachedRupst = FirestoreTracker.cacheGet<CompanyData[]>('rupst_projects');
      if (cachedRupst.hit && cachedRupst.data) {
        FirestoreTracker.logMenuOpen('RUPST', 'HIT');
        setRupstProjects(cachedRupst.data);
      } else {
        FirestoreTracker.logMenuOpen('RUPST', 'MISS', 'rupst_projects', 50);
        FirestoreTracker.logListenerStart('rupst_projects');
        unsubRupst = ProjectService.listenToRupst((list) => {
          FirestoreTracker.cacheSet('rupst_projects', list);
          FirestoreTracker.logMenuOpen('RUPST', 'MISS', 'rupst_projects', undefined, list.length);
          setRupstProjects(list);
        });
      }

      FirestoreTracker.logListenerStart('rupst_public_projects');
      unsubRupstPublic = ProjectService.listenToRupstPublic((list) => {
        setRupstPublicProjects(list);
      });
    }

    // 3. Pendirian Route
    if (activeRoute.includes('/pendirian')) {
      const cachedPendirian = FirestoreTracker.cacheGet<CompanyData[]>('pendirian_projects');
      if (cachedPendirian.hit && cachedPendirian.data) {
        FirestoreTracker.logMenuOpen('Pendirian', 'HIT');
        setPendirianProjects(cachedPendirian.data);
      } else {
        FirestoreTracker.logMenuOpen('Pendirian', 'MISS', 'pendirian_projects', 50);
        FirestoreTracker.logListenerStart('pendirian_projects');
        unsubPendirian = ProjectService.listenToPendirian((list) => {
          FirestoreTracker.cacheSet('pendirian_projects', list);
          FirestoreTracker.logMenuOpen('Pendirian', 'MISS', 'pendirian_projects', undefined, list.length);
          setPendirianProjects(list);
        });
      }
    }

    return () => {
      if (unsubRupsLb) {
        FirestoreTracker.logListenerStop('projects');
        unsubRupsLb();
      }
      if (unsubRupst) {
        FirestoreTracker.logListenerStop('rupst_projects');
        unsubRupst();
      }
      if (unsubRupstPublic) {
        FirestoreTracker.logListenerStop('rupst_public_projects');
        unsubRupstPublic();
      }
      if (unsubPendirian) {
        FirestoreTracker.logListenerStop('pendirian_projects');
        unsubPendirian();
      }
    };
  }, [user, window.location.pathname, window.location.hash]);

  const saveProject = useCallback(async (
    projectId: string,
    data: any,
    type: 'rupslb' | 'rupst' | 'rupst_public' | 'pendirian'
  ) => {
    try {
      if (type === 'rupslb') {
        await ProjectService.saveRupsLb(projectId, data);
        FirestoreTracker.cacheInvalidate('projects');
      } else if (type === 'rupst') {
        await ProjectService.saveRupst(projectId, data);
        FirestoreTracker.cacheInvalidate('rupst_projects');
      } else if (type === 'rupst_public') {
        await ProjectService.saveRupstPublic(projectId, data);
        FirestoreTracker.cacheInvalidate('rupst_public_projects');
      } else if (type === 'pendirian') {
        await ProjectService.savePendirian(projectId, data);
        FirestoreTracker.cacheInvalidate('pendirian_projects');
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
        FirestoreTracker.cacheInvalidate('projects');
      } else if (type === 'rupst') {
        await ProjectService.deleteRupst(projectId);
        FirestoreTracker.cacheInvalidate('rupst_projects');
      } else if (type === 'rupst_public') {
        await ProjectService.deleteRupstPublic(projectId);
        FirestoreTracker.cacheInvalidate('rupst_public_projects');
      } else if (type === 'pendirian') {
        await ProjectService.deletePendirian(projectId);
        FirestoreTracker.cacheInvalidate('pendirian_projects');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, []);

  return useMemo(() => ({
    projects,
    rupstProjects,
    rupstPublicProjects,
    pendirianProjects,
    loading,
    error,
    saveProject,
    deleteProject
  }), [projects, rupstProjects, rupstPublicProjects, pendirianProjects, loading, error, saveProject, deleteProject]);
}
