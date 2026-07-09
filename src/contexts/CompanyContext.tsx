import React, { createContext, useContext, ReactNode } from 'react';
import { useCompanies } from '../hooks/useCompanies';
import { CompanyProfile } from '../../types';

interface CompanyContextType {
  profiles: CompanyProfile[];
  cvProfiles: CompanyProfile[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  save: (companyId: string, companyData: Partial<CompanyProfile>, isCv?: boolean) => Promise<void>;
  delete: (companyId: string, isCv?: boolean) => Promise<void>;
  archive: (companyId: string, currentStatus: boolean, isCv?: boolean) => Promise<boolean>;
  duplicate: (company: CompanyProfile, isCv?: boolean) => Promise<CompanyProfile>;
}

export const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const companyValue = useCompanies();

  return (
    <CompanyContext.Provider value={companyValue}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
}
