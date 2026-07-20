import React from 'react';
import { Shareholder, CompanyProfile } from '../../../types';
import { User, Banknote, Globe, ShieldCheck, MapPin, Coins, History, Zap, Info, Briefcase, UserPlus, ArrowRightLeft, Users, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, numberToWords, formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import { IndoRegionSelector } from '../../../components/AddressFields';
import { searchShareholderByNIKClient } from '../../lib/firebase';
import { useDocumentRuntime } from '../../domain/company/useDocumentRuntime';

interface Props {
  shareholder: Shareholder;
  onChange: (updates: Partial<Shareholder>) => void;
  globalSharePrice?: number;
  totalSharesAllowed: number;
  otherAllocated: number;
  existingData?: any[];
  allShareholders?: Shareholder[];
  oldSharesOwned?: number;
  hideManagement?: boolean;
  hideFinancials?: boolean;
  isOld?: boolean;
  hasTransferAgenda?: boolean;
  hasManagementAgenda?: boolean;
  hasCapitalChange?: boolean;
  profiles?: CompanyProfile[];
  availableParties?: Shareholder[];
  disabled?: boolean;
}

const ShareholderEditor: React.FC<Props> = ({ 
  shareholder, 
  onChange, 
  globalSharePrice, 
  totalSharesAllowed,
  otherAllocated,
  existingData = [],
  allShareholders = [],
  oldSharesOwned = 0,
  hideManagement = false,
  hideFinancials = false,
  isOld = false,
  hasTransferAgenda = false,
  hasManagementAgenda = false,
  hasCapitalChange = false,
  profiles = [],
  availableParties,
  disabled = false
}) => {
  const runtime = useDocumentRuntime();
  const { data: runtimeData, profiles: contextProfiles } = runtime;

  const activeProfiles = (profiles && profiles.length > 0) ? profiles : (contextProfiles || []);
  const activeGlobalSharePrice = globalSharePrice !== undefined ? globalSharePrice : (runtimeData?.originalSharePrice || 0);
  const activeAllShareholders = (allShareholders && allShareholders.length > 0) ? allShareholders : (runtimeData?.shareholders || []);

  const [showLookup, setShowLookup] = React.useState(false);
  const [searchStatus, setSearchStatus] = React.useState('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [profileSearchQuery, setProfileSearchQuery] = React.useState('');
  const maxPossible = totalSharesAllowed - otherAllocated;
  
  const searchShareholderByNIK = async (nik: string) => {
    if (nik.length !== 16) return;
    try {
      setSearchStatus('Mencari...');
      const found = await searchShareholderByNIKClient(nik);
      if (found) {
        onChange({
          nik: found.nik || nik,
          name: found.name,
          birthCity: found.birthCity,
          birthDate: found.birthDate,
          occupation: found.occupation,
          address: found.address,
          // Assuming npwp and other fields might be available
          npwp: found.npwp || shareholder.npwp
        });
        setSearchStatus('Data ditemukan dari database');
      } else {
        setSearchStatus('');
      }
    } catch (e) {
      console.error("Error searching shareholder:", e);
      setSearchStatus('');
    }
  };
  
  const currentShares = shareholder.sharesOwned || 0;
  const transferAmount = Math.max(0, currentShares - oldSharesOwned);
  const isAcquisitionPossible = currentShares > oldSharesOwned || !shareholder.isExistingParty;

  // Derive disabled states
  const disableManagement = !isOld && !hasManagementAgenda;
  const disableFinancials = !isOld && !hasTransferAgenda && !hasCapitalChange;

  const handleLookupSelect = (item: any) => {
    onChange({
      ...shareholder,
      name: (item.name || '').toUpperCase(),
      salutation: item.salutation || 'Tuan',
      birthCity: item.birthCity || '',
      birthDate: item.birthDate || '',
      nationalityType: item.nationalityType || 'WNI',
      nationality: item.nationality || 'WNI',
      occupation: item.occupation || '',
      address: item.address ? { ...item.address } : {
        province: '',
        city: '',
        fullAddress: '',
        rt: '',
        rw: '',
        kelurahan: '',
        kecamatan: ''
      },
      nik: item.nik || '',
      passportNumber: item.passportNumber || '',
      managementPosition: item.position || item.managementPosition || 'Direktur',
      isManagement: item.isManagement || (item.position ? true : false),
      linkedPartyId: item.id,
      isExistingParty: true,
      sharesOwned: disableFinancials ? 0 : shareholder.sharesOwned
    });
    setShowLookup(false);
  };
  const currentTotalValue = shareholder.sharesOwned * activeGlobalSharePrice;
  const canQuickFill = totalSharesAllowed > 0 && shareholder.sharesOwned < maxPossible && !disableFinancials;
  const isWna = shareholder.nationalityType === 'WNA' || shareholder.isForeign;
  const isBadanHukum = shareholder.shareholderType === 'BADAN_HUKUM';

  const matchedProfile = React.useMemo(() => {
    if (!isBadanHukum || !activeProfiles || activeProfiles.length === 0) return null;
    return activeProfiles.find(p => 
      (shareholder.linkedProfileId && p.id === shareholder.linkedProfileId) ||
      (shareholder.name && p.companyName && p.companyName.trim().toUpperCase() === shareholder.name.trim().toUpperCase())
    );
  }, [isBadanHukum, activeProfiles, shareholder.linkedProfileId, shareholder.name]);

  const managementListForWakil = React.useMemo<any[]>(() => {
    if (!matchedProfile) return [];
    return matchedProfile.newManagementItems?.length > 0 ? matchedProfile.newManagementItems : 
         (matchedProfile.oldManagementItems?.length > 0 ? matchedProfile.oldManagementItems : 
         (matchedProfile.shareholders || []).filter(s => s.isManagement));
  }, [matchedProfile]);

  // Helper to remove PT prefix variation for sorting/filtering
  const cleanPT = (name: string): string => {
    if (!name) return "";
    const regex = /^(PT|PT\.|P\.T\.|P\.T)\s*/i;
    return name.replace(regex, "").trim().toLowerCase();
  };

  // Sort profiles alphabetically ignoring "PT" prefix and filter based on search query
  const sortedAndFilteredProfiles = React.useMemo(() => {
    const sorted = [...activeProfiles].sort((a, b) => {
      const nameA = cleanPT(a.companyName || "");
      const nameB = cleanPT(b.companyName || "");
      return nameA.localeCompare(nameB, "id", { sensitivity: "base" });
    });

    if (!profileSearchQuery.trim()) {
      return sorted;
    }
    const q = profileSearchQuery.toLowerCase();
    return sorted.filter(p => (p.companyName || '').toLowerCase().includes(q));
  }, [activeProfiles, profileSearchQuery]);

  const selectedProfile = React.useMemo(() => {
    if (!shareholder.linkedProfileId) return null;
    return activeProfiles.find(p => p.id === shareholder.linkedProfileId);
  }, [shareholder.linkedProfileId, activeProfiles]);

  const handleSharesChange = (inputValue: string) => {
    let val = parseFormattedNumber(inputValue);
    if (totalSharesAllowed === 0) {
      alert("Harap isi Jumlah Lembar Modal Disetor di tab Profil terlebih dahulu.");
      return;
    }
    if (val > maxPossible) {
      val = maxPossible;
      alert(`Batas Terlampaui! Maksimal sisa lembar yang tersedia adalah ${maxPossible.toLocaleString('id-ID')} lembar.`);
    }
    onChange({ sharesOwned: val });
  };

  const quickFillRemaining = () => {
    onChange({ sharesOwned: maxPossible });
  };

  const updateAddress = (updates: Partial<Shareholder['address']>) => {
    onChange({ address: { ...shareholder.address, ...updates } });
  };

  // Automatically pull 'Kedudukan' (city) and representative from company profile if shareholder is BADAN_HUKUM
  React.useEffect(() => {
    if (isBadanHukum && activeProfiles && activeProfiles.length > 0) {
      const matchedProfile = activeProfiles.find(p => 
        (shareholder.linkedProfileId && p.id === shareholder.linkedProfileId) ||
        (shareholder.name && p.companyName && p.companyName.trim().toUpperCase() === shareholder.name.trim().toUpperCase())
      );

      if (matchedProfile) {
        const updates: Partial<Shareholder> = {};
        
        const profileCity = (matchedProfile.domicile || matchedProfile.oldDomicile || matchedProfile.newAddress?.city || matchedProfile.oldAddress?.city || matchedProfile.kedudukanPT || (matchedProfile as any).city || '').toUpperCase();
        if (profileCity && (!shareholder.address || shareholder.address.city !== profileCity)) {
          updates.address = {
            ...(shareholder.address || {
              fullAddress: '',
              rt: '',
              rw: '',
              kelurahan: '',
              kecamatan: '',
              province: ''
            }),
            city: profileCity
          };
        }

        // Try to populate representative if not set
        if (!shareholder.guardianName) {
          const managementList: any[] = matchedProfile.newManagementItems?.length > 0 ? matchedProfile.newManagementItems : 
                               (matchedProfile.oldManagementItems?.length > 0 ? matchedProfile.oldManagementItems : 
                               (matchedProfile.shareholders || []).filter(s => s.isManagement));
          
          if (managementList && managementList.length > 0) {
             let rep = managementList.find(m => String(m.position || m.managementPosition || '').toLowerCase() === 'direktur utama');
             if (!rep) {
               rep = managementList.find(m => String(m.position || m.managementPosition || '').toLowerCase() === 'direktur');
             }
             if (!rep) {
               rep = managementList[0];
             }
             if (rep) {
                updates.representativeId = rep.id;
                updates.representativePosition = rep.position || rep.managementPosition || 'Direktur Utama';
                updates.guardianName = (rep.name || '').toUpperCase();
                updates.guardianSalutation = rep.salutation || 'Tuan';
                
                // Populate all other representative details
                if (rep.nik) updates.guardianNik = rep.nik;
                if (rep.occupation) updates.guardianOccupation = rep.occupation;
                if (rep.birthCity) updates.guardianBirthCity = rep.birthCity;
                if (rep.birthDate) updates.guardianBirthDate = rep.birthDate;
                if (rep.address) updates.guardianAddress = rep.address;
                if (rep.nationality) updates.guardianNationality = rep.nationality;
                if (rep.nationalityType) updates.guardianNationalityType = rep.nationalityType;
                if (rep.passportNumber) updates.guardianPassportNumber = rep.passportNumber;
                if (rep.kitasNumber) updates.guardianKitasNumber = rep.kitasNumber;
             }
          }
        }
        
        if (Object.keys(updates).length > 0) {
          onChange(updates);
        }
      }
    }
  }, [isBadanHukum, shareholder.linkedProfileId, shareholder.name, activeProfiles]);

  const handleProfileSelect = (p: CompanyProfile) => {
    const targetAddress = p.newAddress && p.newAddress.fullAddress ? { ...p.newAddress } : (p.oldAddress && p.oldAddress.fullAddress ? { ...p.oldAddress } : {
      fullAddress: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kecamatan: '',
      city: '',
      province: ''
    });

    const profileCity = (p.domicile || p.oldDomicile || p.newAddress?.city || p.oldAddress?.city || p.kedudukanPT || (p as any).city || targetAddress.city || '').toUpperCase();
    targetAddress.city = profileCity;

    const updates: Partial<Shareholder> = {
      name: (p.companyName || '').toUpperCase(),
      legalEntityType: p.companyType || 'PT Persekutuan Modal',
      npwp: p.npwp || '',
      address: targetAddress,
      skNumber: p.establishmentSkNumber || '',
      skDate: p.establishmentSkDate || '',
      establishmentDeedNumber: p.establishmentDeedNumber || '',
      establishmentDeedDate: p.establishmentDeedDate || '',
      establishmentNotary: p.establishmentNotary || '',
      establishmentNotaryTitle: p.establishmentNotaryTitle || '',
      establishmentNotaryDomicile: p.establishmentNotaryDomicile || '',
      establishmentSkNumber: p.establishmentSkNumber || '',
      establishmentSkDate: p.establishmentSkDate || '',
      amendmentDeeds: p.amendmentDeeds || [],
      linkedProfileId: p.id
    };

    const managementList: any[] = p.newManagementItems?.length > 0 ? p.newManagementItems : 
                         (p.oldManagementItems?.length > 0 ? p.oldManagementItems : 
                         (p.shareholders || []).filter(s => s.isManagement));
                         
    if (managementList && managementList.length > 0) {
       let rep = managementList.find(m => String(m.position || m.managementPosition || '').toLowerCase() === 'direktur utama');
       if (!rep) {
         rep = managementList.find(m => String(m.position || m.managementPosition || '').toLowerCase() === 'direktur');
       }
       if (!rep) {
         rep = managementList[0];
       }
       if (rep) {
          updates.representativeId = rep.id;
          updates.representativePosition = rep.position || rep.managementPosition || 'Direktur Utama';
          updates.guardianName = (rep.name || '').toUpperCase();
          updates.guardianSalutation = rep.salutation || 'Tuan';
          if (rep.nik) updates.guardianNik = rep.nik;
          if (rep.occupation) updates.guardianOccupation = rep.occupation;
          if (rep.birthCity) updates.guardianBirthCity = rep.birthCity;
          if (rep.birthDate) updates.guardianBirthDate = rep.birthDate;
          if (rep.address) updates.guardianAddress = rep.address;
          if (rep.nationality) updates.guardianNationality = rep.nationality;
          if (rep.nationalityType) updates.guardianNationalityType = rep.nationalityType;
          if (rep.passportNumber) updates.guardianPassportNumber = rep.passportNumber;
          if (rep.kitasNumber) updates.guardianKitasNumber = rep.kitasNumber;
       }
    }

    onChange(updates);
  };

  return (
    <fieldset disabled={disabled} className="contents">
      <div className="space-y-4">
        {availableParties ? (
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Pilih dari Daftar Hadir <span className="text-red-500">*</span></label>
          <select
            value={shareholder.name || ''}
            onChange={e => {
              const selected = availableParties.find(p => p.name === e.target.value);
              if (selected) {
                const copy = { ...selected };
                delete copy.isManagement;
                delete copy.managementPosition;
                delete copy.sharesOwned;
                delete copy.id;
                delete copy.isAcquisition;
                onChange({ ...copy, name: selected.name?.toUpperCase() });
              } else {
                onChange({ name: e.target.value });
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 font-bold uppercase transition-colors hover:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="">-- Pilih Nama --</option>
            {availableParties.map(p => (
              <option key={p.id || p.name} value={p.name}>{p.name} {p.shareholderType === 'BADAN_HUKUM' ? '(BADAN HUKUM)' : ''}</option>
            ))}
          </select>
        </div>
      ) : (
        <>
          {/* Quick Lookup Button */}
          {existingData.length > 0 && (
        <div className="relative mb-4">
          <button 
            type="button"
            onClick={() => setShowLookup(!showLookup)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded font-bold text-xs hover:bg-amber-100 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Ambil Data dari Pengurus/Pihak Tersedia
          </button>
          
          {showLookup && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded shadow-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {existingData.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => handleLookupSelect(item)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-50 border-b border-slate-100 last:border-0 text-left"
                  >
                    <div className="p-1.5 bg-slate-100 rounded">
                      <User className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-700 truncate">{item.name || '(Tanpa Nama)'}</div>
                      <div className="text-[10px] text-slate-500 uppercase truncate">{item.position || item.managementPosition || 'PIHAK'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-red-500">Kotak isian yang bertanda * wajib diisi</p>

      <label className="flex items-center gap-2 cursor-pointer mt-4">
        <input 
          type="checkbox" 
          checked={!!shareholder.isForeign || isWna}
          onChange={e => onChange({ 
            isForeign: e.target.checked,
            nationalityType: e.target.checked ? 'WNA' : 'WNI', 
            nationality: e.target.checked ? '' : 'WNI' 
          })}
          className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
        />
        <span className="text-sm text-slate-700 font-bold">Asing</span>
      </label>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Pemegang Saham</label>
        <select 
          value={shareholder.shareholderType || 'PERORANGAN'}
          onChange={e => onChange({ shareholderType: e.target.value as any })}
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        >
          <option value="PERORANGAN">PERORANGAN</option>
          <option value="BADAN_HUKUM">BADAN HUKUM</option>
        </select>
      </div>

      {isBadanHukum && !isWna && (
        <>
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Badan Hukum</label>
            <select 
              value={shareholder.legalEntityType || 'PT Persekutuan Modal'} 
              onChange={e => onChange({ legalEntityType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white"
            >
              <option value="PT Persekutuan Modal">PT Persekutuan Modal</option>
              <option value="PT Perorangan">PT Perorangan</option>
              <option value="Koperasi">Koperasi</option>
              <option value="Yayasan">Yayasan</option>
              <option value="CV">CV</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {activeProfiles && activeProfiles.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50/50 rounded border border-blue-200">
              <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center justify-between">
                <span>Hubungkan / Ambil dari Profil Perusahaan</span>
                {shareholder.linkedProfileId && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ linkedProfileId: undefined });
                      setProfileSearchQuery('');
                    }}
                    className="text-[11px] text-red-650 hover:text-red-800 font-extrabold uppercase transition-colors cursor-pointer"
                  >
                    Putuskan Hubungan
                  </button>
                )}
              </label>
              
              <div className="relative mt-1">
                {/* Visual Select Button */}
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-blue-300 rounded text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-left shadow-sm transition-all cursor-pointer min-h-[38px]"
                >
                  <span className={selectedProfile ? "text-slate-850 font-bold uppercase" : "text-slate-400"}>
                    {selectedProfile ? selectedProfile.companyName : "-- Cari & Pilih Profil Perusahaan --"}
                  </span>
                  <span className="text-slate-500 ml-2 text-xs">▼</span>
                </button>

                {/* Dropdown Popover */}
                {isProfileDropdownOpen && (
                  <>
                    {/* Fixed full-screen transparent overlay to close on outside click */}
                    <div 
                      className="fixed inset-0 z-[90] bg-transparent" 
                      onClick={() => setIsProfileDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white border border-slate-200 rounded shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* Search Input Box */}
                      <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ketik untuk mencari profil PT..."
                          value={profileSearchQuery}
                          onChange={e => setProfileSearchQuery(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                        {profileSearchQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileSearchQuery('');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Options List */}
                      <div className="max-h-60 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => {
                            onChange({ linkedProfileId: undefined });
                            setIsProfileDropdownOpen(false);
                            setProfileSearchQuery('');
                          }}
                          className="w-full px-4 py-2 text-left text-xs font-bold text-red-650 hover:bg-slate-50 border-b border-slate-100 uppercase transition-colors cursor-pointer"
                        >
                          -- Kosongkan Pilihan / Lewati --
                        </button>

                        {sortedAndFilteredProfiles.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-slate-400 italic text-center">
                            Profil perusahaan tidak ditemukan
                          </div>
                        ) : (
                          sortedAndFilteredProfiles.map(p => {
                            const isSelected = p.id === shareholder.linkedProfileId;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  handleProfileSelect(p);
                                  setIsProfileDropdownOpen(false);
                                  setProfileSearchQuery('');
                                }}
                                className={`w-full px-4 py-2.5 text-left text-xs uppercase font-extrabold transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? 'bg-blue-50 text-blue-700 font-extrabold shadow-sm' 
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className="truncate">{p.companyName}</span>
                                {isSelected && <span className="text-blue-600 text-xs font-bold">✓ Terpilih</span>}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!isBadanHukum && !isWna && (
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">NIK <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            value={shareholder.nik || ''} 
            onChange={e => {
              const nik = e.target.value;
              onChange({ nik });
              if (nik.length === 16) {
                searchShareholderByNIK(nik);
              } else {
                setSearchStatus('');
              }
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
            maxLength={16}
          />
          {searchStatus && (
            <div className="text-[10px] text-teal-600 font-bold mt-1">{searchStatus}</div>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Nama <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          {!isBadanHukum && (
            <select 
              value={shareholder.salutation || 'Tuan'} 
              onChange={e => onChange({ salutation: e.target.value as any })}
              className="w-24 px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="Tuan">Tuan</option>
              <option value="Nyonya">Nyonya</option>
              <option value="Nona">Nona</option>
            </select>
          )}
          <input 
            type="text"
            value={shareholder.name || ''}
            onChange={e => onChange({ name: e.target.value.toUpperCase() })}
            className="flex-1 w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-bold"
          />
        </div>
      </div>

      {!isBadanHukum && (
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input 
              type="checkbox" 
              checked={!!shareholder.isUnderage}
              onChange={e => {
                const checked = e.target.checked;
                onChange({ 
                  isUnderage: checked,
                  guardianSalutation: checked ? (shareholder.guardianSalutation || 'Tuan') : undefined,
                  guardianRelationship: checked ? (shareholder.guardianRelationship || 'AYAH KANDUNG') : undefined,
                  guardianName: checked ? (shareholder.guardianName || '') : undefined,
                  guardianNik: checked ? (shareholder.guardianNik || '') : undefined,
                  guardianAddress: checked ? (shareholder.guardianAddress || { province: '', city: '', fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '' }) : undefined
                });
              }}
              className="rounded border-slate-300 text-teal-500 focus:ring-teal-500" 
            />
            <span className="text-sm text-slate-700 font-bold">Di bawah umur</span>
          </label>
        </div>
      )}

      {!isBadanHukum && shareholder.isUnderage && (
        <div className="mt-3 p-4 bg-orange-50/60 rounded border border-orange-200 space-y-3">
          <div className="text-xs font-bold text-orange-850 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-orange-650" /> DATA ORANG TUA / WALI (MEWAKILI ANAK DI BAWAH UMUR)
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Anak di bawah umur belum sah melakukan perbuatan hukum secara mandiri. Harap isi identitas orang tua kandung atau wali yang sah yang bertindak selaku perwakilan di bawah ini.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hubungan dengan Anak <span className="text-red-500">*</span></label>
              <select 
                value={shareholder.guardianRelationship || 'AYAH KANDUNG'} 
                onChange={e => onChange({ guardianRelationship: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="AYAH KANDUNG">AYAH KANDUNG</option>
                <option value="IBU KANDUNG">IBU KANDUNG</option>
                <option value="WALI">WALI / WALI HAKIM</option>
                <option value="LAINNYA">LAINNYA</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">NIK Orang Tua / Wali <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                maxLength={16}
                value={shareholder.guardianNik || ''} 
                onChange={e => onChange({ guardianNik: e.target.value })}
                placeholder="CONTOH: 320123XXXXXXXXXX"
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-medium"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Orang Tua / Wali <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select 
                  value={shareholder.guardianSalutation || 'Tuan'} 
                  onChange={e => onChange({ guardianSalutation: e.target.value as any })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Tuan">Tuan</option>
                  <option value="Nyonya">Nyonya</option>
                  <option value="Nona">Nona</option>
                </select>
                <input 
                  type="text" 
                  value={shareholder.guardianName || ''} 
                  onChange={e => onChange({ guardianName: e.target.value.toUpperCase() })}
                  placeholder="NAMA WALI SESUAI KTP"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-bold uppercase"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-orange-100/80">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700">Alamat Orang Tua / Wali <span className="text-red-500">*</span></label>
              <button
                type="button"
                className="text-[10px] text-teal-600 hover:text-teal-800 font-extrabold cursor-pointer select-none"
                onClick={() => {
                  onChange({
                    guardianAddress: {
                      fullAddress: shareholder.address.fullAddress || '',
                      rt: shareholder.address.rt || '',
                      rw: shareholder.address.rw || '',
                      kelurahan: shareholder.address.kelurahan || '',
                      kecamatan: shareholder.address.kecamatan || '',
                      city: shareholder.address.city || '',
                      province: shareholder.address.province || '',
                      postalCode: shareholder.address.postalCode || ''
                    }
                  });
                }}
              >
                (Salin Alamat Dari Anak)
              </button>
            </div>
            <textarea 
              value={shareholder.guardianAddress?.fullAddress || ''} 
              onChange={e => onChange({
                guardianAddress: {
                  ...(shareholder.guardianAddress || { province: '', city: '', fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '' }),
                  fullAddress: e.target.value.toUpperCase()
                }
              })}
              placeholder="CONTOH: JALAN MEWAR NO. 10"
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm min-h-[50px] font-medium"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {isBadanHukum ? (
          isWna ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Negara <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={shareholder.foreignCountry || shareholder.nationality || ''} 
                  onChange={e => onChange({ foreignCountry: e.target.value, nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Pengesahan</label>
                <input 
                  type="text" 
                  value={shareholder.skNumber || ''} 
                  onChange={e => onChange({ skNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pengesahan</label>
                <input 
                  type="date" 
                  value={shareholder.skDate || ''} 
                  onChange={e => onChange({ skDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pihak yang Mengeluarkan</label>
                <input 
                  type="text" 
                  value={shareholder.skIssuer || ''} 
                  onChange={e => onChange({ skIssuer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor SK Terbaru / Terakhir</label>
                <input 
                  type="text" 
                  value={shareholder.skNumber || ''} 
                  onChange={e => onChange({ skNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                  placeholder="Contoh: AHU-00123.AH.01.01.Tahun 2024"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal SK Terbaru</label>
                <input 
                  type="date" 
                  value={shareholder.skDate || ''} 
                  onChange={e => onChange({ skDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-slate-50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">NPWP <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={shareholder.npwp || ''} 
                  onChange={e => onChange({ npwp: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                  placeholder="00.000.000.0-000.000"
                />
              </div>

              {/* Akta Pendirian expander */}
              <div className="md:col-span-2 border border-slate-200 rounded p-4 bg-white mt-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-3 uppercase">
                  <ShieldCheck className="w-4 h-4 text-slate-500" /> Detail Akta Pendirian Badan Hukum Sh. (Opsional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nomor Akta Pendirian</label>
                    <input 
                      type="text" 
                      value={shareholder.establishmentDeedNumber || ''} 
                      onChange={e => onChange({ establishmentDeedNumber: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Akta Pendirian</label>
                    <input 
                      type="date" 
                      value={shareholder.establishmentDeedDate || ''} 
                      onChange={e => onChange({ establishmentDeedDate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Notaris Pendirian</label>
                    <input 
                      type="text" 
                      value={shareholder.establishmentNotary || ''} 
                      onChange={e => onChange({ establishmentNotary: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Gelar Notaris (Contoh: S.H., M.Kn.)</label>
                    <input 
                      type="text" 
                      value={shareholder.establishmentNotaryTitle || ''} 
                      onChange={e => onChange({ establishmentNotaryTitle: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Kedudukan Notaris Pendirian</label>
                    <input 
                      type="text" 
                      value={shareholder.establishmentNotaryDomicile || ''} 
                      onChange={e => onChange({ establishmentNotaryDomicile: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nomor SK Pendirian</label>
                    <input 
                      type="text" 
                      value={shareholder.establishmentSkNumber || ''} 
                      onChange={e => onChange({ establishmentSkNumber: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal SK Pendirian</label>
                    <input 
                      type="date" 
                      value={shareholder.establishmentSkDate || ''} 
                      onChange={e => onChange({ establishmentSkDate: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Histori Perubahan Anggaran Dasar Editor */}
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-slate-500" /> Histori Perubahan Anggaran Dasar Badan Hukum Pemegang Saham:
                  </h5>
                  
                  <div className="space-y-4">
                    {(shareholder.amendmentDeeds || []).map((deed, index) => (
                      <div key={deed.id || index} className="p-3.5 bg-slate-50 border border-slate-200 rounded relative space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                          <span className="text-[11px] font-bold text-slate-700">AKTA PERUBAHAN #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newList = (shareholder.amendmentDeeds || []).filter((_, idx) => idx !== index);
                              onChange({ amendmentDeeds: newList });
                            }}
                            className="text-red-500 hover:text-red-700 p-1 transition-colors"
                            title="Hapus Akta Perubahan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Nomor Akta</label>
                            <input 
                              type="text"
                              value={deed.number || ''} 
                              onChange={e => {
                                const newList = [...(shareholder.amendmentDeeds || [])];
                                newList[index] = { ...deed, number: e.target.value };
                                onChange({ amendmentDeeds: newList });
                              }} 
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 bg-white"
                              placeholder="Contoh: 05" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Tanggal Akta</label>
                            <input 
                              type="date" 
                              value={deed.date || ''} 
                              onChange={e => {
                                const newList = [...(shareholder.amendmentDeeds || [])];
                                newList[index] = { ...deed, date: e.target.value };
                                onChange({ amendmentDeeds: newList });
                              }} 
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Nama Notaris Perubahan</label>
                            <input 
                              type="text" 
                              value={deed.notary || ''} 
                              onChange={e => {
                                const newList = [...(shareholder.amendmentDeeds || [])];
                                newList[index] = { ...deed, notary: e.target.value };
                                onChange({ amendmentDeeds: newList });
                              }} 
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 bg-white"
                              placeholder="Nama Notaris"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Kedudukan Notaris Perubahan</label>
                            <input 
                              type="text" 
                              value={deed.notaryDomicile || ''} 
                              onChange={e => {
                                const newList = [...(shareholder.amendmentDeeds || [])];
                                newList[index] = { ...deed, notaryDomicile: e.target.value };
                                onChange({ amendmentDeeds: newList });
                              }} 
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 bg-white"
                              placeholder="Contoh: Jakarta Selatan"
                            />
                          </div>
                        </div>

                        {/* SK/SP child documents list */}
                        <div className="bg-white p-3 border border-slate-200 rounded space-y-2 mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SK / SP Penerimaan Perubahan</span>
                          </div>

                          <div className="space-y-2">
                            {(deed.skSpDocuments || []).map((doc, docIdx) => (
                              <div key={doc.id || docIdx} className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end border-b border-slate-100 pb-2 last:border-0 last:pb-0 font-medium font-sans">
                                <div className="md:col-span-3">
                                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Tipe</label>
                                  <select 
                                    value={doc.type} 
                                    onChange={e => {
                                      const newList = [...(shareholder.amendmentDeeds || [])];
                                      const newDocs = [...(deed.skSpDocuments || [])];
                                      newDocs[docIdx] = { ...doc, type: e.target.value as any };
                                      newList[index] = { ...deed, skSpDocuments: newDocs };
                                      onChange({ amendmentDeeds: newList });
                                    }}
                                    className="w-full px-1.5 py-1 border border-slate-300 rounded text-[11px] outline-none focus:border-teal-500 bg-white"
                                  >
                                    <option value="SK">SK (Keputusan)</option>
                                    <option value="SP_DATA_PERSEROAN">SP (Perubahan Data Perseroan)</option>
                                    <option value="SP_ANGGARAN_DASAR">SP (Perubahan Anggaran Dasar)</option>
                                    <option value="SP">SP (Lainnya)</option>
                                  </select>
                                </div>
                                <div className="md:col-span-4">
                                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Nomor</label>
                                  <input 
                                    type="text"
                                    value={doc.number || ''} 
                                    onChange={e => {
                                      const newList = [...(shareholder.amendmentDeeds || [])];
                                      const newDocs = [...(deed.skSpDocuments || [])];
                                      newDocs[docIdx] = { ...doc, number: e.target.value };
                                      newList[index] = { ...deed, skSpDocuments: newDocs };
                                      onChange({ amendmentDeeds: newList });
                                    }}
                                    className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-[11px] outline-none focus:border-teal-500 bg-white font-semibold text-slate-800"
                                    placeholder="Nomor Dokumen"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">Tanggal</label>
                                  <input 
                                    type="date"
                                    value={doc.date || ''} 
                                    onChange={e => {
                                      const newList = [...(shareholder.amendmentDeeds || [])];
                                      const newDocs = [...(deed.skSpDocuments || [])];
                                      newDocs[docIdx] = { ...doc, date: e.target.value };
                                      newList[index] = { ...deed, skSpDocuments: newDocs };
                                      onChange({ amendmentDeeds: newList });
                                    }}
                                    className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-[11px] outline-none focus:border-teal-500 bg-white"
                                  />
                                </div>
                                <div className="md:col-span-1 flex justify-center pb-1">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newList = [...(shareholder.amendmentDeeds || [])];
                                      const newDocs = (deed.skSpDocuments || []).filter((_, dIdx) => dIdx !== docIdx);
                                      newList[index] = { ...deed, skSpDocuments: newDocs };
                                      onChange({ amendmentDeeds: newList });
                                    }}
                                    className="text-red-400 hover:text-red-600 p-1 transition-colors"
                                    title="Hapus SK/SP"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {(!deed.skSpDocuments || deed.skSpDocuments.length === 0) && (
                              <div className="text-[10px] text-slate-400 italic py-1">Belum ada SK atau SP yang ditambahkan.</div>
                            )}

                            <button 
                              type="button"
                              onClick={() => {
                                const newList = [...(shareholder.amendmentDeeds || [])];
                                const newDoc = { id: crypto.randomUUID(), type: 'SK' as const, number: '', date: '' };
                                newList[index] = { ...deed, skSpDocuments: [...(deed.skSpDocuments || []), newDoc] };
                                onChange({ amendmentDeeds: newList });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-sm mt-1 transition-colors uppercase"
                            >
                              <Plus size={10} /> TAMBAH SK / SP
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!shareholder.amendmentDeeds || shareholder.amendmentDeeds.length === 0) && (
                      <p className="text-xs text-slate-400 italic">Belum ada detail Akta Perubahan untuk Badan Hukum ini.</p>
                    )}

                    <button 
                      type="button"
                      onClick={() => {
                        const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', notaryDomicile: '', skNumber: '', skDate: '', skSpDocuments: [] };
                        onChange({ amendmentDeeds: [...(shareholder.amendmentDeeds || []), newDeed] });
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded text-slate-500 hover:border-[#3b5998] hover:text-[#3b5998] hover:bg-slate-10/50 transition-all text-xs font-bold uppercase mt-1"
                    >
                      <Plus size={14} /> Tambah Akta Perubahan Badan Hukum S.H.
                    </button>
                  </div>
                </div>
                {/* End Histori Perubahan Editor */}
              </div>
            </>
          )
        ) : (
          isWna && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Negara <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={shareholder.nationality || ''} 
                  onChange={e => onChange({ nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Passport <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={shareholder.passportNumber || ''} 
                  onChange={e => onChange({ passportNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Izin Tinggal (Kitas Nomor)</label>
                <input 
                  type="text" 
                  value={shareholder.kitasNumber || ''} 
                  onChange={e => onChange({ kitasNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                  placeholder="Contoh: 24E28A410488"
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Izin Tinggal</label>
                  <select 
                    value={shareholder.kitasType || 'NONE'}
                    onChange={e => onChange({ 
                      kitasType: e.target.value as any, 
                      hasKitas: e.target.value !== 'NONE' 
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="NONE">-- Opsional --</option>
                    <option value="KITAS">KITAS</option>
                    <option value="KITAP">KITAP</option>
                  </select>
                </div>
                {shareholder.kitasType && shareholder.kitasType !== 'NONE' && (
                  <div>
                     <label className="block text-xs font-bold text-slate-700 mb-1">Nomor {shareholder.kitasType}</label>
                     <input 
                      type="text" 
                      value={shareholder.kitasNumber || ''} 
                      onChange={e => onChange({ kitasNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                    />
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
      </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {(!hideFinancials || !hideManagement) && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Sebagai <span className="text-red-500">*</span></label>
            <div className="space-y-3 pl-2">
              {!hideFinancials && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    disabled={disableFinancials}
                    checked={disableFinancials ? false : (shareholder.sharesOwned > 0)} 
                    onChange={e => {
                      if (!e.target.checked) {
                        onChange({ sharesOwned: 0 });
                      } else if (shareholder.sharesOwned <= 0) {
                        onChange({ sharesOwned: 1 });
                      }
                    }}
                    className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 disabled:opacity-50"
                  />
                  <span className={`text-sm ${disableFinancials ? 'text-slate-400' : 'text-slate-700'}`}>Pemegang Saham</span>
                </label>
              )}
              {!hideManagement && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    disabled={disableManagement}
                    checked={shareholder.isManagement || false}
                    onChange={e => onChange({ isManagement: e.target.checked, managementPosition: e.target.checked ? (shareholder.managementPosition || 'Direktur') : undefined })}
                    className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 disabled:opacity-50"
                  />
                  <span className={`text-sm ${disableManagement ? 'text-slate-400' : 'text-slate-700'}`}>Direksi/Komisaris</span>
                </label>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {!hideFinancials && (shareholder.sharesOwned > 0 || disableFinancials) && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Klasifikasi Saham <span className="text-red-500">*</span></label>
                <select disabled={disableFinancials} className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100 disabled:opacity-50">
                  <option>Tanpa Klasifikasi</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Lembar Saham <span className="text-red-500">*</span></label>
                  {canQuickFill && isOld && (
                    <button 
                      onClick={quickFillRemaining}
                      className="text-[10px] text-teal-600 hover:underline"
                    >
                      (Ambil Sisa Saldo)
                    </button>
                  )}
                </div>
                <input 
                  type="text" 
                  disabled={totalSharesAllowed === 0 || disableFinancials || !isOld}
                  value={disableFinancials ? '0' : formatInputNumber(shareholder.sharesOwned)} 
                  onChange={e => handleSharesChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm disabled:bg-slate-100 disabled:opacity-50"
                />
                {!disableFinancials && (
                <div className="mt-1 flex flex-col gap-1 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-800 font-bold italic">{formatCurrency(currentTotalValue)}</span>
                  </div>
                  {!isOld && (hasTransferAgenda || hasCapitalChange) && (
                    <div className="text-blue-600 font-medium bg-blue-50 p-1.5 rounded border border-blue-100 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Gunakan bagian <strong>Peralihan</strong> atau <strong>Setor Modal Baru</strong> di bawah untuk mengubah jumlah saham.
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* Transfer Details Section */}
              {!isOld && hasTransferAgenda && !disableFinancials && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={shareholder.isAcquisition || false}
                    onChange={e => onChange({ isAcquisition: e.target.checked, acquisitionShares: e.target.checked ? shareholder.acquisitionShares : 0, sharesOwned: oldSharesOwned + (e.target.checked ? (shareholder.acquisitionShares || 0) : 0) + (shareholder.newDepositShares || 0) })}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-tight flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Dapat Saham dari Peralihan
                  </span>
                </label>

                {shareholder.isAcquisition && (
                  <div className="bg-amber-50 rounded p-3 space-y-3 border border-amber-100">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Jenis Peralihan <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input 
                            type="radio" 
                            name="acqType"
                            checked={shareholder.acquisitionType === 'AJB'} 
                            onChange={() => onChange({ acquisitionType: 'AJB' })} 
                          />
                          <span>AJB (Jual Beli)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input 
                            type="radio" 
                            name="acqType"
                            checked={shareholder.acquisitionType === 'HIBAH'} 
                            onChange={() => onChange({ acquisitionType: 'HIBAH' })} 
                          />
                          <span>HIBAH</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {shareholder.acquisitionType === 'AJB' ? 'Penjual' : 'Pemberi'} Saham <span className="text-red-500">*</span>
                      </label>
                      <select 
                        value={shareholder.acquisitionSourceId || ''}
                        onChange={e => onChange({ acquisitionSourceId: e.target.value })}
                        className="w-full px-2 py-1.5 border border-amber-200 rounded text-xs bg-white outline-none focus:border-amber-400"
                      >
                        <option value="">-- Pilih {shareholder.acquisitionType === 'AJB' ? 'Penjual' : 'Pemberi'} --</option>
                        {activeAllShareholders
                          .filter(s => s.id !== shareholder.id && (s.sharesOwned > 0 || (s as any).oldSharesOwned > 0))
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.name} (Tersedia: {formatInputNumber(s.sharesOwned)} lembar)</option>
                          ))
                        }
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                        Jumlah Peralihan <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formatInputNumber(shareholder.acquisitionShares || 0)} 
                        onChange={e => {
                          const val = parseFormattedNumber(e.target.value);
                          const sourceSh = activeAllShareholders.find(s => s.id === shareholder.acquisitionSourceId);
                          let safeVal = val;
                          if (sourceSh && safeVal > sourceSh.sharesOwned) {
                            alert("Jumlah peralihan tidak boleh melebihi saham yang dimiliki " + (shareholder.acquisitionType === 'AJB' ? 'penjual' : 'pemberi'));
                            safeVal = sourceSh.sharesOwned;
                          }
                          onChange({ 
                            acquisitionShares: safeVal, 
                            sharesOwned: oldSharesOwned + safeVal + (shareholder.newDepositShares || 0)
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-amber-200 rounded text-xs bg-white outline-none focus:border-amber-400"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* New Deposit Details Section */}
              {!isOld && hasCapitalChange && !disableFinancials && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={shareholder.isNewDeposit || false}
                    onChange={e => onChange({ isNewDeposit: e.target.checked, newDepositShares: e.target.checked ? shareholder.newDepositShares : 0, sharesOwned: oldSharesOwned + (shareholder.acquisitionShares || 0) + (e.target.checked ? (shareholder.newDepositShares || 0) : 0) })}
                    className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-tight flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Setor Modal Baru
                  </span>
                </label>

                {shareholder.isNewDeposit && (
                  <div className="bg-blue-50 rounded p-3 space-y-3 border border-blue-100">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                        Jumlah Setoran (Lembar Saham) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formatInputNumber(shareholder.newDepositShares || 0)} 
                        onChange={e => {
                          const val = parseFormattedNumber(e.target.value);
                          onChange({ 
                            newDepositShares: val,
                            sharesOwned: oldSharesOwned + (shareholder.acquisitionShares || 0) + val
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-blue-200 rounded text-xs bg-white outline-none focus:border-blue-400"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>
              )}
            </>
          )}

          {shareholder.isManagement && !hideManagement && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan Pengurus <span className="text-red-500">*</span></label>
              <select 
                disabled={disableManagement}
                value={shareholder.managementPosition || 'Direktur'}
                onChange={e => onChange({ managementPosition: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100 disabled:opacity-50"
              >
                <option value="Direktur Utama">DIREKTUR UTAMA</option>
                <option value="Direktur">DIREKTUR</option>
                <option value="Komisaris Utama">KOMISARIS UTAMA</option>
                <option value="Komisaris">KOMISARIS</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {isBadanHukum && (
        <div className="mt-4 p-4 bg-teal-50/60 rounded border border-teal-200 space-y-3">
          <div className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-teal-600" /> DATA WAKIL BADAN HUKUM (YANG MENGHADAP)
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Pilih wakil yang sah dari badan hukum ini (berdasarkan data pengurus), atau pilih Kuasa Direksi untuk input manual.
          </p>
          
          <div className="mb-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Wakil <span className="text-red-500">*</span></label>
            <select 
              value={shareholder.representativeId || 'MANUAL'} 
              onChange={e => {
                const val = e.target.value;
                if (val === 'MANUAL') {
                  onChange({ representativeId: 'MANUAL', representativePosition: 'Kuasa Direksi' });
                } else {
                  const rep = managementListForWakil.find((m: any) => m.id === val);
                  if (rep) {
                    const updates: Partial<Shareholder> = {
                      representativeId: rep.id,
                      representativePosition: rep.position || rep.managementPosition || 'Direktur Utama',
                      guardianName: (rep.name || '').toUpperCase(),
                      guardianSalutation: rep.salutation || 'Tuan',
                      guardianNik: rep.nik || '',
                      guardianOccupation: rep.occupation || '',
                      guardianBirthCity: rep.birthCity || '',
                      guardianBirthDate: rep.birthDate || '',
                      guardianAddress: rep.address || undefined,
                      guardianNationality: rep.nationality || '',
                      guardianNationalityType: rep.nationalityType || 'WNI',
                      guardianPassportNumber: rep.passportNumber || '',
                      guardianKitasNumber: rep.kitasNumber || ''
                    };
                    onChange(updates);
                  }
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
            >
              {managementListForWakil.length > 0 && <option value="" disabled>-- Pilih Pengurus --</option>}
              {managementListForWakil.map((m: any, idx: number) => (
                <option key={m.id || idx} value={m.id}>
                  {m.name} - {m.position || m.managementPosition}
                </option>
              ))}
              <option value="MANUAL">{managementListForWakil.length > 0 ? 'Kuasa Direksi / Lainnya (Input Manual)' : 'Input Manual'}</option>
            </select>
          </div>

          {(!shareholder.representativeId || shareholder.representativeId === 'MANUAL') && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan Wakil <span className="text-red-500">*</span></label>
                  <select 
                    value={(shareholder as any).representativePosition || 'Kuasa Direksi'} 
                    onChange={e => onChange({ representativePosition: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="Direktur Utama">DIREKTUR UTAMA</option>
                    <option value="Direktur">DIREKTUR</option>
                    <option value="Kuasa Direksi">KUASA DIREKSI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <select 
                      value={shareholder.guardianSalutation || 'Tuan'} 
                      onChange={e => onChange({ guardianSalutation: e.target.value as any })}
                      className="w-24 px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="Tuan">Tuan</option>
                      <option value="Nyonya">Nyonya</option>
                      <option value="Nona">Nona</option>
                    </select>
                    <input 
                      type="text" 
                      value={shareholder.guardianName || ''} 
                      onChange={e => onChange({ guardianName: e.target.value.toUpperCase() })}
                      placeholder="NAMA WAKIL"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-bold uppercase"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIK Wakil <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={shareholder.guardianNik || ''} 
                    onChange={e => onChange({ guardianNik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                    placeholder="16 DIGIT NIK"
                    className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pekerjaan Wakil <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={shareholder.guardianOccupation || ''} 
                    onChange={e => onChange({ guardianOccupation: e.target.value.toUpperCase() })}
                    placeholder="CONTOH: KARYAWAN SWASTA"
                    className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tempat Lahir Wakil <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={shareholder.guardianBirthCity || ''} 
                    onChange={e => onChange({ guardianBirthCity: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Lahir Wakil <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    value={shareholder.guardianBirthDate || ''} 
                    onChange={e => onChange({ guardianBirthDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-slate-50"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-teal-100/80 mt-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Alamat Wakil <span className="text-red-500">*</span></label>
                </div>
                <textarea 
                  value={shareholder.guardianAddress?.fullAddress || ''} 
                  onChange={e => onChange({ guardianAddress: { ...(shareholder.guardianAddress || { rt: '', rw: '', kelurahan: '', kecamatan: '', city: '', province: '' }), fullAddress: e.target.value.toUpperCase() } })}
                  placeholder="NAMA JALAN / GEDUNG"
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm min-h-[60px] uppercase"
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">RT</label>
                    <input 
                      type="text" 
                      value={shareholder.guardianAddress?.rt || ''} 
                      onChange={e => onChange({ guardianAddress: { ...(shareholder.guardianAddress || { fullAddress: '', rw: '', kelurahan: '', kecamatan: '', city: '', province: '' }), rt: e.target.value } })}
                      placeholder="000"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">RW</label>
                    <input 
                      type="text" 
                      value={shareholder.guardianAddress?.rw || ''} 
                      onChange={e => onChange({ guardianAddress: { ...(shareholder.guardianAddress || { fullAddress: '', rt: '', kelurahan: '', kecamatan: '', city: '', province: '' }), rw: e.target.value } })}
                      placeholder="000"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <IndoRegionSelector 
                    address={shareholder.guardianAddress || { fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '', city: '', province: '' }} 
                    onUpdate={(upd) => onChange({ guardianAddress: { ...(shareholder.guardianAddress || { fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '', city: '', province: '' }), ...upd } })}
                    hideStreetAndRT={true}
                    disabled={disabled}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!isBadanHukum && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tempat Lahir <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={shareholder.birthCity || ''} 
              onChange={e => onChange({ birthCity: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Lahir <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              value={shareholder.birthDate || ''} 
              onChange={e => onChange({ birthDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pekerjaan <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={shareholder.occupation || ''} 
              onChange={e => onChange({ occupation: e.target.value.toUpperCase() })}
              placeholder="CONTOH: WIRASWASTA"
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
            />
          </div>
        </div>
      )}

      {!isBadanHukum && (
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">Alamat <span className="text-red-500">*</span></label>
          <textarea 
            value={shareholder.address.fullAddress || ''} 
            onChange={e => updateAddress({ fullAddress: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm min-h-[80px]"
          />
        </div>
      )}

      {isBadanHukum && !isWna && (
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">Kedudukan <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            value={shareholder.address.city || ''} 
            onChange={e => updateAddress({ city: e.target.value.toUpperCase() })}
            placeholder="CONTOH: JAKARTA SELATAN"
            className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
          />
        </div>
      )}

      {!isBadanHukum && !isWna && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rt</label>
              <input 
                type="text" 
                value={shareholder.address.rt || ''} 
                onChange={e => updateAddress({ rt: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rw</label>
              <input 
                type="text" 
                value={shareholder.address.rw || ''} 
                onChange={e => updateAddress({ rw: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          <div className="mt-2">
            <IndoRegionSelector 
              address={shareholder.address} 
              onUpdate={updateAddress} 
              hideStreetAndRT={true}
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
    </fieldset>
  );
};

export default ShareholderEditor;
