import { useState, useCallback, useMemo } from 'react';
import { CompanyProfile } from '../../types';
import { CompanyService, ClientDirectoryPageOptions, ClientDirectoryPageResult } from '../services/CompanyService';
import { useAuthContext } from '../contexts/AuthContext';

export function useCompanies() {
  const { user } = useAuthContext();
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [cvProfiles, setCvProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDirectoryPage = useCallback(async (options?: ClientDirectoryPageOptions): Promise<ClientDirectoryPageResult> => {
    return await CompanyService.getClientDirectoryPage(options);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      CompanyService.clearCache();
      const directoryItems = await CompanyService.getClientDirectory({ limit: 'all' });
      const mappedProfiles: CompanyProfile[] = directoryItems.map(d => ({
        id: d.clientId || d.id,
        companyName: d.companyName,
        clientType: d.clientType,
        companyType: d.companyType || 'PT_LOKAL',
        domicile: d.domicile,
        establishmentDeedDate: d.establishmentDeedDate,
        updatedAt: d.updatedAt,
        isArchived: d.isArchived,
        npwp: d.npwp,
        kbliItems: (d.kbliItems || []).map(k => ({ id: k.code, code: k.code, name: k.name || '', description: '', categoryLetter: '', categoryName: '' }))
      } as CompanyProfile));

      const pt = mappedProfiles.filter(p => p.clientType !== 'CV' && p.companyType !== 'CV');
      const cv = mappedProfiles.filter(p => p.clientType === 'CV' || p.companyType === 'CV');
      setProfiles(pt);
      setCvProfiles(cv);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getProfile = useCallback(async (clientId: string): Promise<CompanyProfile | null> => {
    return await CompanyService.getCompanyProfile(clientId);
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

  const merge = useCallback(async (targetId: string, sourceIds: string[]) => {
    return await CompanyService.mergeCompanies(targetId, sourceIds);
  }, []);

  return useMemo(() => ({
    profiles,
    cvProfiles,
    loading,
    error,
    refresh,
    fetchDirectoryPage,
    getProfile,
    save,
    delete: remove, // exposing as delete
    archive,
    duplicate,
    merge,
  }), [profiles, cvProfiles, loading, error, refresh, fetchDirectoryPage, getProfile, save, remove, archive, duplicate, merge]);
}

