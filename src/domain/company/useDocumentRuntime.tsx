import { useState, useCallback, createContext, useContext, ReactNode, useEffect, useRef, useMemo } from 'react';
import { CompanyData, Address, CompanyProfile, Shareholder } from '../../../types';
import { INITIAL_STATE, INITIAL_MANUAL_REP } from './initialCompanyData';
import { toTitleCase } from '../../../utils/formatters';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { syncToUtama, getDeedTitle, formatAppearersForRups, formatAppearersForPendirian } from '../../lib/syncUtama';

interface DocumentRuntimeContextType {
  data: CompanyData;
  setData: React.Dispatch<React.SetStateAction<CompanyData>>;
  updateData: (updates: Partial<CompanyData>) => void;
  resetData: () => void;
  isAutoSaving: boolean;
  lastAutoSavedAt: string | null;
  setAutosaveParams: (params: {
    activeSidebarTab: string | null;
    editingProjectId: string | null;
    setEditingProjectId: (id: string | null) => void;
    editingRupstId: string | null;
    setEditingRupstId: (id: string | null) => void;
    editingPendirianId: string | null;
    setEditingPendirianId: (id: string | null) => void;
    currentPendirianData: any;
    user: any;
    profiles: CompanyProfile[];
  }) => void;
  isSyncing: boolean;
  mergedData: CompanyData;
  syncCompanyDataToRupst: () => void;
  handleManualSync: (type: 'PENDIRIAN' | 'RUPSLB' | 'RUPST', deedData: any) => Promise<boolean>;
  proxyModalOpenId: string | null;
  setProxyModalOpenId: (id: string | null) => void;
  editingShareholder: Shareholder | null;
  setEditingShareholder: (sh: Shareholder | null) => void;
  profiles: CompanyProfile[];
}

const DocumentRuntimeContext = createContext<DocumentRuntimeContextType | null>(null);

const sanitizeForFirestore = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          newObj[key] = sanitizeForFirestore(val);
        }
      }
    }
    return newObj;
  }
  return obj;
};

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

  const [lastAutoSavedAt] = useState<string | null>(null);
  const [isAutoSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [proxyModalOpenId, setProxyModalOpenId] = useState<string | null>(null);
  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);

  const [autosaveParams, setAutosaveParamsState] = useState<{
    activeSidebarTab: string | null;
    editingProjectId: string | null;
    setEditingProjectId: (id: string | null) => void;
    editingRupstId: string | null;
    setEditingRupstId: (id: string | null) => void;
    editingPendirianId: string | null;
    setEditingPendirianId: (id: string | null) => void;
    currentPendirianData: any;
    user: any;
    profiles: CompanyProfile[];
  } | null>(null);

  const setAutosaveParams = useCallback((params: any) => {
    setAutosaveParamsState(params);
  }, []);

  const formatFullAddress = (addr: Address): string => {
    if (!addr.fullAddress) return '';
    const isRegency = addr.city?.toLowerCase().includes('kabupaten');
    const villagePrefix = isRegency ? 'Desa' : 'Kelurahan';
    const parts = [
      addr.fullAddress,
      addr.rt && addr.rw ? `RT. ${addr.rt} RW. ${addr.rw}` : '',
      addr.kelurahan ? `${villagePrefix} ${toTitleCase(addr.kelurahan)}` : '',
      addr.kecamatan ? `Kecamatan ${toTitleCase(addr.kecamatan)}` : '',
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
          rt && rw ? `RT. ${rt} RW. ${rw}` : (rt ? `RT. ${rt}` : (rw ? `RW. ${rw}` : '')),
          kelurahan ? `Kelurahan/Desa ${kelurahan}` : '',
          kecamatan ? `Kecamatan ${kecamatan}` : ''
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

  // Sync state & properties
  const profiles = useMemo(() => autosaveParams?.profiles || [], [autosaveParams?.profiles]);
  const activeSidebarTab = useMemo(() => autosaveParams?.activeSidebarTab || null, [autosaveParams?.activeSidebarTab]);

  const mergedData = useMemo(() => {
    let baseData = data;
    if ((activeSidebarTab === 'notulen' || activeSidebarTab === 'rupst') && data.selectedProfileId) {
      const profile = profiles.find(p => p.id === data.selectedProfileId);
      if (profile) {
        baseData = {
          ...data,
          companyName: profile.companyName,
          companyShortName: profile.companyShortName,
          companyType: profile.companyType,
          npwp: profile.npwp,
          duration: profile.duration,
          status: profile.status,
          oldFullAddress: profile.oldFullAddress,
          
          establishmentDeedNumber: profile.establishmentDeedNumber,
          establishmentDeedDate: profile.establishmentDeedDate,
          establishmentNotary: profile.establishmentNotary,
          establishmentNotaryTitle: profile.establishmentNotaryTitle,
          establishmentNotaryDomicile: profile.establishmentNotaryDomicile,
          establishmentSkNumber: profile.establishmentSkNumber,
          establishmentSkDate: profile.establishmentSkDate,
          originalTotalShares: profile.originalTotalShares,
          originalAuthorizedShares: profile.originalAuthorizedShares,
          originalSharePrice: profile.originalSharePrice,
          originalCapitalBase: profile.originalCapitalBase,
          originalCapitalPaid: profile.originalCapitalPaid,
        };
      }
    }

    if (baseData.shareholders && profiles.length > 0) {
      baseData = {
        ...baseData,
        shareholders: baseData.shareholders.map(sh => {
          let patchedSh = { ...sh };
          if (patchedSh.shareholderType === 'BADAN_HUKUM') {
            const prof = profiles.find(p => 
              (patchedSh.linkedProfileId && p.id === patchedSh.linkedProfileId) ||
              (p.companyName && patchedSh.name && p.companyName.trim().toUpperCase() === patchedSh.name.trim().toUpperCase())
            );
            if (prof) {
              const fallbackCity = (prof.domicile || prof.oldDomicile || prof.newAddress?.city || prof.oldAddress?.city || prof.kedudukanPT || (prof as any).city || '').toUpperCase();
              if (fallbackCity && (!patchedSh.address || !patchedSh.address.city)) {
                patchedSh.address = {
                  ...(patchedSh.address || {}),
                  city: fallbackCity,
                  fullAddress: patchedSh.address?.fullAddress || '',
                  rt: patchedSh.address?.rt || '',
                  rw: patchedSh.address?.rw || '',
                  kelurahan: patchedSh.address?.kelurahan || '',
                  kecamatan: patchedSh.address?.kecamatan || '',
                  province: patchedSh.address?.province || '',
                };
              }
            }
          }
          return patchedSh;
        })
      };
    }

    return baseData;
  }, [data, profiles, activeSidebarTab]);

  const syncCompanyDataToRupst = useCallback(() => {
    if (!data.selectedProfileId) {
      alert("Pilih Klien PT terlebih dahulu.");
      return;
    }
        
    if (!confirm("Sinkronkan data terbaru dari Klien PT?\n\nData manual RUPST tidak akan diubah.")) {
      return;
    }
    const latestProfile = profiles.find(p => p.id === data.selectedProfileId);
    if (!latestProfile) {
      alert("Gagal mengambil data terbaru dari Klien PT.");
      return;
    }
    try {
      const updates: any = {
        companyName: latestProfile.companyName,
        domicile: latestProfile.domicile,
        establishmentDeedNumber: latestProfile.establishmentDeedNumber,
        establishmentDeedDate: latestProfile.establishmentDeedDate,
        establishmentNotary: latestProfile.establishmentNotary,
        establishmentNotaryTitle: latestProfile.establishmentNotaryTitle,
        establishmentNotaryDomicile: latestProfile.establishmentNotaryDomicile,
        establishmentSkNumber: latestProfile.establishmentSkNumber,
        establishmentSkDate: latestProfile.establishmentSkDate,
        amendmentDeeds: latestProfile.amendmentDeeds || [],
        shareholders: latestProfile.shareholders || [],
        kbliItems: latestProfile.kbliItems || [],
        originalSharePrice: latestProfile.originalSharePrice,
        oldFullAddress: latestProfile.fullAddress || latestProfile.oldFullAddress,
        oldAddress: latestProfile.newAddress || latestProfile.oldAddress,
        oldDomicile: latestProfile.domicile || latestProfile.oldDomicile,
      };

      if (data.representativeType !== 'MANUAL') {
        updates.authorizedRepresentativeId = latestProfile.authorizedRepresentativeId || '';
        updates.manualRepresentative = latestProfile.manualRepresentative || { ...INITIAL_MANUAL_REP };
        updates.representativeType = latestProfile.representativeType || 'EXISTING';
      }

      updateData(updates);
      alert("Data PT berhasil disinkronkan.");
    } catch (e) {
      alert("Gagal mengambil data terbaru dari Klien PT.");
    }
  }, [data.selectedProfileId, data.representativeType, profiles, updateData]);

  const handleManualSync = useCallback(async (type: 'PENDIRIAN' | 'RUPSLB' | 'RUPST', deedData: any) => {
    const deedNumber = type === 'PENDIRIAN' ? deedData.nomorAkta : deedData.draftAktaRupsNumber;
    const deedDate = type === 'PENDIRIAN' ? deedData.tanggal : deedData.draftAktaRupsDate;

    if (!deedNumber || !deedDate) {
      alert("Nomor Akta dan Tanggal Akta harus diisi sebelum sinkronisasi.");
      return false;
    }

    setIsSyncing(true);
    try {
      let rawClientName = type === 'PENDIRIAN' ? (deedData as any).namaPt : (deedData as any).companyName;
      if (deedData.selectedProfileId) {
        const profile = profiles.find(p => p.id === deedData.selectedProfileId);
        if (profile && profile.companyName) {
          rawClientName = profile.companyName;
        }
      }
      
      const clientName = (rawClientName || '').toUpperCase().startsWith('PT') ? (rawClientName || '') : `PT ${(rawClientName || '')}`;

      const syncData = {
        deedNumber,
        orderNumber: type === 'PENDIRIAN' ? (deedData as any).nomorUrut : (deedData as any).draftAktaRupsOrderNumber,
        deedDate,
        clientName,
        deedTitle: getDeedTitle(type, deedData, rawClientName),
        appearers: type === 'PENDIRIAN' ? (formatAppearersForPendirian as any)(deedData) : formatAppearersForRups(deedData)
      };
      await syncToUtama(syncData);
      return true;
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Gagal sinkronisasi ke Aplikasi Utama.");
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [profiles]);

  return (
    <DocumentRuntimeContext.Provider value={{
      data,
      setData,
      updateData,
      resetData,
      isAutoSaving,
      lastAutoSavedAt,
      setAutosaveParams,
      isSyncing,
      mergedData,
      syncCompanyDataToRupst,
      handleManualSync,
      proxyModalOpenId,
      setProxyModalOpenId,
      editingShareholder,
      setEditingShareholder,
      profiles
    }}>
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
