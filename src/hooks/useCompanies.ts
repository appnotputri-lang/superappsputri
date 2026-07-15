import { useState, useEffect, useCallback } from 'react';
import { CompanyProfile } from '../../types';
import { CompanyService } from '../services/CompanyService';

export function useCompanies() {
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [cvProfiles, setCvProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
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
  }, []);

  // Listen in real-time
  useEffect(() => {
    setLoading(true);
    let unsubPT = () => {};
    let unsubCV = () => {};

    CompanyService.migrateLegacyCvProfiles().finally(() => {
      unsubPT = CompanyService.listenCompanies((ptList) => {
        setProfiles(ptList);
        setLoading(false);
      });
      unsubCV = CompanyService.listenCvCompanies((cvList) => {
        setCvProfiles(cvList);
        setLoading(false);
      });
    });

    return () => {
      unsubPT();
      unsubCV();
    };
  }, []);

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

  return {
    profiles,
    cvProfiles,
    loading,
    error,
    refresh,
    save,
    delete: remove, // exposing as delete
    archive,
    duplicate,
  };
}
