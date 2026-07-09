const fs = require('fs');

const code = `import { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { CompanyData, Address } from '../../../types';
import { INITIAL_STATE } from './initialCompanyData';
import { toTitleCase } from '../../../utils/formatters';

interface DocumentRuntimeContextType {
  data: CompanyData;
  setData: React.Dispatch<React.SetStateAction<CompanyData>>;
  updateData: (updates: Partial<CompanyData>) => void;
  resetData: () => void;
}

const DocumentRuntimeContext = createContext<DocumentRuntimeContextType | null>(null);

export function DocumentRuntimeProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CompanyData>(() => {
    const saved = localStorage.getItem('legal-draft-data-v25-final');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_STATE, ...parsed };
      } catch (e) {
        console.error("Failed to parse saved data:", e);
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });

  const formatFullAddress = (addr: Address): string => {
    if (!addr.fullAddress) return '';
    const isRegency = addr.city?.toLowerCase().includes('kabupaten');
    const villagePrefix = isRegency ? 'Desa' : 'Kelurahan';
    const parts = [
      addr.fullAddress,
      addr.rt && addr.rw ? \`RT. \${addr.rt} RW. \${addr.rw}\` : '',
      addr.kelurahan ? \`\${villagePrefix} \${toTitleCase(addr.kelurahan)}\` : '',
      addr.kecamatan ? \`Kecamatan \${toTitleCase(addr.kecamatan)}\` : '',
      addr.city ? toTitleCase(addr.city) : '',
      addr.province ? toTitleCase(addr.province) : ''
    ].filter(Boolean);
    return parts.join(', ');
  };

  const updateData = useCallback((updates: Partial<CompanyData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };
      if (updates.originalSharePrice !== undefined || updates.originalAuthorizedShares !== undefined) {
        newData.originalCapitalBase = (newData.originalSharePrice || 0) * (newData.originalAuthorizedShares || 0);
        if (!newData.resolutions?.capitalBase && !newData.resolutions?.capitalBaseDecrease) {
          newData.targetCapitalBase = newData.originalCapitalBase;
        }
      }
      if (updates.originalSharePrice !== undefined || updates.originalTotalShares !== undefined) {
        newData.originalCapitalPaid = (newData.originalSharePrice || 0) * (newData.originalTotalShares || 0);
        if (!newData.resolutions?.capitalPaid && !newData.resolutions?.capitalPaidDecrease) {
          newData.targetCapitalPaid = newData.originalCapitalPaid;
        }
      }
      if (updates.newAddress) {
        newData.fullAddress = formatFullAddress(newData.newAddress);
      }
      if (updates.oldAddress) {
        newData.oldFullAddress = formatFullAddress(newData.oldAddress);
      }
      if (
        updates.rupstStreet !== undefined ||
        updates.rupstRt !== undefined ||
        updates.rupstRw !== undefined ||
        updates.rupstKelurahan !== undefined ||
        updates.rupstKecamatan !== undefined
      ) {
        const street = updates.rupstStreet !== undefined ? updates.rupstStreet : (prev.rupstStreet || '');
        const rt = updates.rupstRt !== undefined ? updates.rupstRt : (prev.rupstRt || '');
        const rw = updates.rupstRw !== undefined ? updates.rupstRw : (prev.rupstRw || '');
        const kelurahan = updates.rupstKelurahan !== undefined ? updates.rupstKelurahan : (prev.rupstKelurahan || '');
        const kecamatan = updates.rupstKecamatan !== undefined ? updates.rupstKecamatan : (prev.rupstKecamatan || '');
        
        const parts = [
          street,
          rt && rw ? \`RT. \${rt} RW. \${rw}\` : (rt ? \`RT. \${rt}\` : (rw ? \`RW. \${rw}\` : '')),
          kelurahan ? \`Kelurahan/Desa \${kelurahan}\` : '',
          kecamatan ? \`Kecamatan \${kecamatan}\` : ''
        ].filter(Boolean);
        
        newData.fullAddress = parts.join(', ');
      }
      return newData;
    });
  }, []);

  const resetData = useCallback(() => {
    setData(INITIAL_STATE);
    localStorage.removeItem('legal-draft-data-v25-final');
  }, []);

  return (
    <DocumentRuntimeContext.Provider value={{ data, setData, updateData, resetData }}>
      {children}
    </DocumentRuntimeContext.Provider>
  );
}

export function useDocumentRuntime(onReset?: () => void) {
  const context = useContext(DocumentRuntimeContext);
  if (!context) {
    throw new Error("useDocumentRuntime must be used within a DocumentRuntimeProvider");
  }

  const { resetData: contextResetData, ...rest } = context;

  const resetData = useCallback(() => {
    if (window.confirm("Reset semua data?")) {
      contextResetData();
      if (onReset) onReset();
    }
  }, [contextResetData, onReset]);

  return { ...rest, resetData };
}
`;

fs.writeFileSync('src/domain/company/useDocumentRuntime.ts', code);
console.log("Patched useDocumentRuntime.ts");
