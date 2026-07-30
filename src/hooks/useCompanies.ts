import { useState, useEffect, useCallback, useMemo } from 'react';
import { CompanyProfile } from '../../types';
import { CompanyService } from '../services/CompanyService';
import { useAuthContext } from '../contexts/AuthContext';

export function useCompanies() {
  const { user } = useAuthContext();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [cvProfiles, setCvProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [pt, cv] = await Promise.all([
        CompanyService.getCompanies(),
        CompanyService.getCvCompanies(),
      ]);
      setProfiles(pt);
      setCvProfiles(cv);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Listen in real-time
  useEffect(() => {
    if (!user) {
      setProfiles([]);
      setCvProfiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let isMounted = true;
    let unsubPT = () => {};
    let unsubCV = () => {};

    CompanyService.migrateLegacyCvProfiles().finally(() => {
      if (!isMounted) return;
      unsubPT = CompanyService.listenCompanies((ptList) => {
        if (!isMounted) return;
        setProfiles(ptList);
        setLoading(false);
      });
      unsubCV = CompanyService.listenCvCompanies((cvList) => {
        if (!isMounted) return;
        setCvProfiles(cvList);
        setLoading(false);
      });
    });

    return () => {
      isMounted = false;
      unsubPT();
      unsubCV();
    };
  }, [user]);

  const save = useCallback(async (companyId: string, companyData: Partial<CompanyProfile>, isCv?: boolean) => {
    await CompanyService.saveCompany(companyId, companyData, isCv);
  }, []);

  const remove = useCallback(async (companyId: string, isCv?: boolean) => {
    await CompanyService.deleteCompany(companyId, isCv);
  }, []);

  const archive = useCallback(async (companyId: string, currentStatus: boolean, isCv?: boolean) => {
    return await CompanyService.archiveCompany(companyId, currentStatus, isCv);
  }, []);

  const duplicate = useCallback(async (company: CompanyProfile, isCv?: boolean) => {
    return await CompanyService.duplicateCompany(company, isCv);
  }, []);

  const merge = useCallback(async (targetId: string, sourceIds: string[]) => {
    return await CompanyService.mergeCompanies(targetId, sourceIds);
  }, []);

  return useMemo(() => ({
    profiles,
    cvProfiles,
    loading,
    error,
    refresh,
    save,
    delete: remove, // exposing as delete
    archive,
    duplicate,
    merge,
  }), [profiles, cvProfiles, loading, error, refresh, save, remove, archive, duplicate, merge]);
}
