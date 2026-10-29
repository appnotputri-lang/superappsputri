import React from 'react';
import { Shareholder, CompanyProfile } from '../../../types';
import { User, Banknote, Globe, ShieldCheck, MapPin, Coins, History, Zap, Info, Briefcase, UserPlus, ArrowRightLeft, Users, Plus, Trash2, Camera, Loader2, AlertCircle, RefreshCw, Building2, CheckCircle2, Search, X } from 'lucide-react';
import { formatCurrency, numberToWords, formatInputNumber, parseFormattedNumber } from '../../../utils/formatters';
import { IndoRegionSelector } from '../../../components/AddressFields';
import { searchShareholderByNIKClient } from '../../lib/firebase';
import { useDocumentRuntime } from '../../domain/company/useDocumentRuntime';
import { CorporateShareholderService, CorporateStakeholderParty } from '../../services/CorporateShareholderService';
import { CompanyService } from '../../services/CompanyService';

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
  excludeCompanyIdOrName?: string;
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
  disabled = false,
  excludeCompanyIdOrName
}) => {
  const runtime = useDocumentRuntime();
  const { data: runtimeData, profiles: contextProfiles } = runtime;

  const [internalProfiles, setInternalProfiles] = React.useState<CompanyProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = React.useState<boolean>(false);
  const [isLoadingProfileDetail, setIsLoadingProfileDetail] = React.useState<boolean>(false);
  const [fullProfilesCache, setFullProfilesCache] = React.useState<Record<string, CompanyProfile>>({});

  // Fallback: If corporate profiles are not provided via props or runtime context, load directly from directory
  React.useEffect(() => {
    if ((!profiles || profiles.length === 0) && (!contextProfiles || contextProfiles.length === 0)) {
      setIsLoadingProfiles(true);
      CompanyService.getClientDirectory({ clientType: 'PT', limit: 'all' })
        .then(items => {
          if (items && items.length > 0) {
            const mapped: CompanyProfile[] = items.map(d => ({
              id: d.clientId || d.id,
              companyName: d.companyName,
              clientType: d.clientType || 'PT',
              companyType: d.companyType || 'PT_LOKAL',
              domicile: d.domicile || '',
              establishmentDeedNumber: d.establishmentDeedNumber || '',
              establishmentDeedDate: d.establishmentDeedDate || '',
              establishmentNotary: d.establishmentNotary || '',
              establishmentSkNumber: d.establishmentSkNumber || '',
              establishmentSkDate: d.establishmentSkDate || '',
              npwp: d.npwp || ''
            } as CompanyProfile));
            setInternalProfiles(mapped);
          }
        })
        .catch(err => console.warn('Failed to fetch internal corporate profiles:', err))
        .finally(() => setIsLoadingProfiles(false));
    }
  }, [profiles, contextProfiles]);

  const activeProfiles = (profiles && profiles.length > 0) 
    ? profiles 
    : ((contextProfiles && contextProfiles.length > 0) ? contextProfiles : internalProfiles);
  const activeGlobalSharePrice = globalSharePrice !== undefined ? globalSharePrice : (runtimeData?.originalSharePrice || 0);
  const activeAllShareholders = (allShareholders && allShareholders.length > 0) ? allShareholders : (runtimeData?.shareholders || []);

  const [showLookup, setShowLookup] = React.useState(false);
  const [searchStatus, setSearchStatus] = React.useState('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [profileSearchQuery, setProfileSearchQuery] = React.useState('');
  const [ocrLoading, setOcrLoading] = React.useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = React.useState('');
  const [ocrErrorMsg, setOcrErrorMsg] = React.useState('');
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleKtpOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (shareholder.isForeign || (shareholder.nationalityType as string) === 'WNA') {
      return;
    }

    setOcrLoading(true);
    setOcrSuccessMsg('');
    setOcrErrorMsg('');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/ocr-ktp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data, mimeType: file.type }),
        signal: controller.signal
      });

      const json = await res.json();

      if (shareholder.isForeign || (shareholder.nationalityType as string) === 'WNA') {
        setOcrLoading(false);
        return;
      }

      if (json.success && json.data) {
        const d = json.data;
        const updates: Partial<Shareholder> = {};

        if (d.nik) updates.nik = String(d.nik).trim();
        if (d.name) updates.name = String(d.name).toUpperCase().trim();
        if (d.salutation) updates.salutation = d.salutation;
        if (d.birthCity) updates.birthCity = String(d.birthCity).toUpperCase().trim();
        if (d.birthDate) updates.birthDate = String(d.birthDate).trim();
        if (d.occupation) updates.occupation = String(d.occupation).toUpperCase().trim();

        if (d.address) {
          const currentAddr = shareholder.address || {
            fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '', city: '', province: ''
          };
          updates.address = {
            fullAddress: d.address.fullAddress ? String(d.address.fullAddress).toUpperCase().trim() : currentAddr.fullAddress,
            rt: d.address.rt ? String(d.address.rt).trim() : currentAddr.rt,
            rw: d.address.rw ? String(d.address.rw).trim() : currentAddr.rw,
            kelurahan: d.address.kelurahan ? String(d.address.kelurahan).toUpperCase().trim() : currentAddr.kelurahan,
            kecamatan: d.address.kecamatan ? String(d.address.kecamatan).toUpperCase().trim() : currentAddr.kecamatan,
            city: d.address.city ? String(d.address.city).toUpperCase().trim() : currentAddr.city,
            province: d.address.province ? String(d.address.province).toUpperCase().trim() : currentAddr.province,
            postalCode: currentAddr.postalCode || ''
          };
        }

        onChange(updates);
        setOcrSuccessMsg('✅ Data KTP berhasil diisi oleh AI!');
      } else {
        setOcrErrorMsg(json.error || 'Gagal membaca KTP. Silakan isi form secara manual.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('KTP OCR Error:', err);
        setOcrErrorMsg('Terjadi kesalahan saat membaca KTP. Silakan isi form secara manual.');
      }
    } finally {
      setOcrLoading(false);
    }
  };

  const maxPossible = totalSharesAllowed - otherAllocated;
  
  const searchShareholderByNIK = async (nik: string) => {
    if (!nik || nik.trim().length !== 16) return;
    try {
      setSearchStatus('Mencari di database...');
      const found = await searchShareholderByNIKClient(nik.trim());
      if (found) {
        const foundAddress = found.address ? {
          fullAddress: found.address.fullAddress || '',
          rt: found.address.rt || '',
          rw: found.address.rw || '',
          kelurahan: found.address.kelurahan || '',
          kecamatan: found.address.kecamatan || '',
          city: found.address.city || '',
          province: found.address.province || '',
          postalCode: found.address.postalCode || ''
        } : shareholder.address;

        onChange({
          ...shareholder,
          personId: found.personId || shareholder.personId,
          nik: found.nik || nik,
          name: (found.name || shareholder.name || '').toUpperCase(),
          salutation: found.salutation || shareholder.salutation || 'Tuan',
          birthCity: found.birthCity || shareholder.birthCity || '',
          birthDate: found.birthDate || shareholder.birthDate || '',
          nationalityType: found.nationalityType || shareholder.nationalityType || 'WNI',
          nationality: found.nationality || shareholder.nationality || 'WNI',
          occupation: found.occupation || shareholder.occupation || '',
          address: foundAddress,
          passportNumber: found.passportNumber || shareholder.passportNumber || '',
          kitasNumber: found.kitasNumber || shareholder.kitasNumber || '',
          npwp: found.npwp || shareholder.npwp || ''
        });
        setSearchStatus(found.personId ? '✅ Data terhubung dari Master Database Orang!' : '✅ Data lengkap ditemukan dari database!');
      } else {
        setSearchStatus('Data tidak ditemukan di database');
      }
    } catch (e) {
      console.error("Error searching shareholder:", e);
      setSearchStatus('');
    }
  };

  const inCompanyDuplicate = React.useMemo(() => {
    if (!shareholder.nik) return null;
    const cleanNik = shareholder.nik.trim().replace(/\D/g, '');
    if (cleanNik.length !== 16) return null;
    const match = activeAllShareholders.find((s: any) => 
      s.id !== shareholder.id && (
        (s.nik && s.nik.trim().replace(/\D/g, '') === cleanNik) ||
        (shareholder.personId && s.personId && s.personId === shareholder.personId)
      )
    );
    return match;
  }, [shareholder.id, shareholder.nik, shareholder.personId, activeAllShareholders]);
  
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
  const isBadanHukum = CorporateShareholderService.checkIsCorporateShareholder(shareholder);
  const meetingCompanyIdOrName = excludeCompanyIdOrName || runtimeData?.selectedProfileId || runtimeData?.id || runtimeData?.companyName;

  const matchedProfile = React.useMemo(() => {
    if (!isBadanHukum || !activeProfiles || activeProfiles.length === 0) return null;
    return CorporateShareholderService.findMatchingCorporateProfile(
      shareholder,
      activeProfiles,
      meetingCompanyIdOrName
    );
  }, [isBadanHukum, activeProfiles, shareholder.linkedProfileId, shareholder.name, meetingCompanyIdOrName]);

  const effectiveMatchedProfile = React.useMemo(() => {
    if (!matchedProfile) return null;
    return fullProfilesCache[matchedProfile.id]
      ? { ...matchedProfile, ...fullProfilesCache[matchedProfile.id] }
      : matchedProfile;
  }, [matchedProfile, fullProfilesCache]);

  React.useEffect(() => {
    if (matchedProfile && matchedProfile.id && !fullProfilesCache[matchedProfile.id]) {
      const hasMgmt = (matchedProfile.newManagementItems && matchedProfile.newManagementItems.length > 0) ||
                      (matchedProfile.oldManagementItems && matchedProfile.oldManagementItems.length > 0) ||
                      (matchedProfile.shareholders && matchedProfile.shareholders.length > 0);
      if (!hasMgmt) {
        CompanyService.getCompanyProfile(matchedProfile.id)
          .then(detail => {
            if (detail) {
              setFullProfilesCache(prev => ({
                ...prev,
                [matchedProfile.id]: detail
              }));
            }
          })
          .catch(e => console.warn('Could not load profile detail:', e));
      }
    }
  }, [matchedProfile?.id]);

  const stakeholdersForWakil = React.useMemo<CorporateStakeholderParty[]>(() => {
    if (!effectiveMatchedProfile) return [];
    return CorporateShareholderService.extractCorporateStakeholders(effectiveMatchedProfile);
  }, [effectiveMatchedProfile]);

  const direksiForWakil = React.useMemo(() => stakeholdersForWakil.filter(s => s.roleCategory === 'DIREKSI'), [stakeholdersForWakil]);
  const komisarisForWakil = React.useMemo(() => stakeholdersForWakil.filter(s => s.roleCategory === 'KOMISARIS'), [stakeholdersForWakil]);
  const pemegangSahamForWakil = React.useMemo(() => stakeholdersForWakil.filter(s => s.roleCategory === 'PEMEGANG_SAHAM'), [stakeholdersForWakil]);

  // Sort profiles alphabetically ignoring "PT" prefix and filter based on search query, strictly excluding meeting PT
  const sortedAndFilteredProfiles = React.useMemo(() => {
    return CorporateShareholderService.filterAvailableCorporateProfiles(
      activeProfiles,
      meetingCompanyIdOrName,
      profileSearchQuery
    );
  }, [activeProfiles, meetingCompanyIdOrName, profileSearchQuery]);

  const selectedProfile = React.useMemo(() => {
    if (!shareholder.linkedProfileId) return effectiveMatchedProfile;
    const found = activeProfiles.find(p => p.id === shareholder.linkedProfileId);
    if (!found) return effectiveMatchedProfile;
    return fullProfilesCache[found.id] ? { ...found, ...fullProfilesCache[found.id] } : found;
  }, [shareholder.linkedProfileId, activeProfiles, effectiveMatchedProfile, fullProfilesCache]);

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

  const shAddress = shareholder.address || {
    fullAddress: '',
    rt: '',
    rw: '',
    kelurahan: '',
    kecamatan: '',
    city: '',
    province: '',
    postalCode: ''
  };

  const updateAddress = (updates: Partial<Shareholder['address']>) => {
    onChange({ address: { ...shAddress, ...updates } });
  };

  // Automatically pull 'Kedudukan' (city) and representative from company profile if shareholder is BADAN_HUKUM
  React.useEffect(() => {
    if (isBadanHukum && activeProfiles && activeProfiles.length > 0) {
      const p = effectiveMatchedProfile;
      if (p) {
        const updates: Partial<Shareholder> = {};
        
        const profileCity = (p.domicile || p.oldDomicile || p.newAddress?.city || p.oldAddress?.city || p.kedudukanPT || (p as any).city || '').toUpperCase();
        if (profileCity && (!shareholder.address || shAddress.city !== profileCity)) {
          updates.address = {
            ...shAddress,
            city: profileCity
          };
        }

        if (!shareholder.linkedProfileId && p.id) {
          updates.linkedProfileId = p.id;
        }

        // Try to populate representative if not set
        if (!shareholder.guardianName && !shareholder.representativeId) {
          const stakeholders = CorporateShareholderService.extractCorporateStakeholders(p);
          const topDir = stakeholders.find(s => s.roleCategory === 'DIREKSI') || stakeholders[0];
          if (topDir) {
            const applied = CorporateShareholderService.applyCorporateProfileToShareholder(
              shareholder,
              p,
              topDir,
              'DIREKTUR_PT_LAIN'
            );
            Object.assign(updates, applied);
          }
        }
        
        if (Object.keys(updates).length > 0) {
          onChange(updates);
        }
      }
    }
  }, [isBadanHukum, shareholder.linkedProfileId, shareholder.name, activeProfiles.length, effectiveMatchedProfile]);

  const handleProfileSelect = async (p: CompanyProfile) => {
    let fullProfile = p;
    if (p.id) {
      if (fullProfilesCache[p.id]) {
        fullProfile = { ...p, ...fullProfilesCache[p.id] };
      } else {
        setIsLoadingProfileDetail(true);
        try {
          const fetched = await CompanyService.getCompanyProfile(p.id);
          if (fetched) {
            fullProfile = { ...p, ...fetched };
            setFullProfilesCache(prev => ({
              ...prev,
              [p.id]: fetched
            }));
          }
        } catch (err) {
          console.warn('Failed to fetch full company profile:', err);
        } finally {
          setIsLoadingProfileDetail(false);
        }
      }
    }

    const stakeholders = CorporateShareholderService.extractCorporateStakeholders(fullProfile);
    let defaultRep = stakeholders.find(s => s.id === shareholder.representativeId);
    if (!defaultRep && !shareholder.guardianName) {
      defaultRep = stakeholders.find(s => s.roleCategory === 'DIREKSI') || stakeholders[0];
    }
    const updates = CorporateShareholderService.applyCorporateProfileToShareholder(
      shareholder,
      fullProfile,
      defaultRep,
      (shareholder as any).representativePosition === 'Kuasa Direksi' ? 'KUASA' : 'DIREKTUR_PT_LAIN'
    );
    onChange(updates);
  };

  const refreshProfileDetail = async () => {
    const profId = shareholder.linkedProfileId || effectiveMatchedProfile?.id;
    if (!profId) return;
    setIsLoadingProfileDetail(true);
    try {
      const fetched = await CompanyService.getCompanyProfile(profId, true);
      if (fetched) {
        setFullProfilesCache(prev => ({
          ...prev,
          [profId]: fetched
        }));
        await handleProfileSelect({ ...(effectiveMatchedProfile || {}), ...fetched, id: profId });
      }
    } catch (e) {
      console.warn('Error refreshing profile detail:', e);
    } finally {
      setIsLoadingProfileDetail(false);
    }
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
          onChange={e => {
            const isChecked = e.target.checked;
            if (isChecked) {
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              setOcrLoading(false);
              setOcrSuccessMsg('');
              setOcrErrorMsg('');
            }
            onChange({ 
              isForeign: isChecked,
              nationalityType: isChecked ? 'WNA' : 'WNI', 
              nationality: isChecked ? '' : 'WNI' 
            });
          }}
          className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
        />
        <span className="text-sm text-slate-700 font-bold">Asing</span>
      </label>

      {/* Fitur Upload KTP dengan AI - HANYA jika BUKAN ASING */}
      {!isWna && !shareholder.isForeign && (
        <div className="my-3 p-3.5 bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 rounded-lg border border-teal-200 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-teal-600" /> Upload KTP dengan AI
            </span>
            {ocrLoading && (
              <span className="text-[11px] text-teal-700 font-bold animate-pulse flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" /> Memproses AI...
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 mb-2.5">
            Upload foto KTP untuk mengisi data NIK, Nama, Tanggal Lahir, Pekerjaan, dan Alamat secara otomatis.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md shadow-sm transition-all ${
              ocrLoading 
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white cursor-pointer'
            }`}>
              <Camera className="w-4 h-4" />
              <span>{ocrLoading ? 'Memproses KTP...' : '📷 Upload KTP dengan AI'}</span>
              <input 
                type="file" 
                accept="image/*" 
                disabled={ocrLoading}
                onChange={handleKtpOcrUpload}
                className="hidden" 
              />
            </label>

            {ocrSuccessMsg && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded border border-emerald-300">
                {ocrSuccessMsg}
              </span>
            )}
            {ocrErrorMsg && (
              <span className="text-xs font-bold text-red-700 bg-red-100/90 px-2.5 py-1 rounded border border-red-300">
                {ocrErrorMsg}
              </span>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Pemegang Saham</label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => {
              onChange({ 
                shareholderType: 'PERORANGAN',
                linkedProfileId: undefined
              });
            }}
            className={`py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !isBadanHukum
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-4 h-4 text-teal-600" />
            <span>Orang Perseorangan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onChange({ 
                shareholderType: 'BADAN_HUKUM',
                legalEntityType: shareholder.legalEntityType || 'PT Persekutuan Modal'
              });
            }}
            className={`py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isBadanHukum
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Badan Hukum (PT)</span>
          </button>
        </div>
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

          <div className="mb-4 p-4 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-md shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-blue-950 uppercase tracking-wide">
                    Pencarian Data PT Calon Pemegang Saham
                  </h4>
                  <p className="text-[11px] text-blue-700/80">
                    Cari data PT dari Master Klien untuk mengisi otomatis legalitas, akta pendirian, SK, dan susunan pengurus
                  </p>
                </div>
              </div>

              {(shareholder.linkedProfileId || effectiveMatchedProfile) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange({ linkedProfileId: undefined, name: '' });
                    setProfileSearchQuery('');
                  }}
                  className="text-[11px] text-red-600 hover:text-red-800 font-bold px-2 py-1 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  title="Putuskan hubungan dengan profil PT ini"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Lepas / Ganti PT</span>
                </button>
              )}
            </div>

            {/* Live Search Input with dropdown */}
            <div className="relative mt-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-blue-500 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Ketik nama PT untuk mencari dari Master Klien (contoh: PT Maju Bersama)..."
                  value={profileSearchQuery}
                  onChange={e => {
                    setProfileSearchQuery(e.target.value);
                    setIsProfileDropdownOpen(true);
                  }}
                  onFocus={() => setIsProfileDropdownOpen(true)}
                  className="w-full pl-9 pr-8 py-2.5 border border-blue-300 rounded-lg text-xs font-bold bg-white outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-2xs transition-all placeholder:font-normal placeholder:text-slate-400"
                />
                {profileSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setProfileSearchQuery('')}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete / Browse Popover */}
              {isProfileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[90] bg-transparent" 
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 max-h-64 overflow-y-auto">
                    <div className="p-2 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 flex justify-between items-center">
                      <span>Daftar PT di Master Klien ({sortedAndFilteredProfiles.length} ditemukan)</span>
                      <button
                        type="button"
                        onClick={() => {
                          onChange({ linkedProfileId: undefined });
                          setIsProfileDropdownOpen(false);
                          setProfileSearchQuery('');
                        }}
                        className="text-red-500 hover:text-red-700 text-[10px] font-bold cursor-pointer"
                      >
                        Lewati / Kosongkan
                      </button>
                    </div>

                    {isLoadingProfiles ? (
                      <div className="p-4 text-center text-xs text-blue-600 font-medium flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Memuat data PT dari database Klien...
                      </div>
                    ) : sortedAndFilteredProfiles.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        {profileSearchQuery ? `Tidak ada PT yang cocok dengan "${profileSearchQuery}"` : 'Tidak ada data PT tersedia.'}
                      </div>
                    ) : (
                      sortedAndFilteredProfiles.map(p => {
                        const isSelected = p.id === (shareholder.linkedProfileId || effectiveMatchedProfile?.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              handleProfileSelect(p);
                              setIsProfileDropdownOpen(false);
                              setProfileSearchQuery('');
                            }}
                            className={`w-full p-2.5 text-left border-b border-slate-100 last:border-0 hover:bg-blue-50 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                              isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : ''
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-extrabold uppercase text-slate-800 truncate">
                                {p.companyName}
                              </span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                <span>Kedudukan: <b>{p.domicile || p.oldDomicile || '—'}</b></span>
                                {p.establishmentDeedNumber && (
                                  <span>• Akta No. <b>{p.establishmentDeedNumber}</b></span>
                                )}
                                {p.establishmentSkNumber && (
                                  <span>• SK: <b>{p.establishmentSkNumber}</b></span>
                                )}
                              </span>
                            </div>
                            {isSelected ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded shrink-0">
                                Terpilih
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-blue-100 text-blue-700 rounded shrink-0 transition-colors">
                                Pilih PT Ini
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Selected Connected Profile Card */}
            {effectiveMatchedProfile && (
              <div className="mt-3 p-3.5 bg-white border border-blue-200 rounded-lg text-xs text-blue-950 space-y-2 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-extrabold text-sm uppercase text-blue-900 block">
                        {effectiveMatchedProfile.companyName}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        ✓ Terhubung ke Master Database Klien
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isLoadingProfileDetail}
                    onClick={refreshProfileDetail}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title="Sinkronkan data legalitas & pihak terbaru dari Master Klien"
                  >
                    <RefreshCw className={`w-3 h-3 text-blue-600 ${isLoadingProfileDetail ? 'animate-spin' : ''}`} />
                    <span>{isLoadingProfileDetail ? 'Menyinkronkan...' : 'Sinkronkan Data Terbaru'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                  <div>Kedudukan: <b className="text-slate-800">{effectiveMatchedProfile.domicile || effectiveMatchedProfile.oldDomicile || effectiveMatchedProfile.newAddress?.city || 'Belum diisi'}</b></div>
                  <div>Akta Pendirian: <b className="text-slate-800">{effectiveMatchedProfile.establishmentDeedNumber ? `No. ${effectiveMatchedProfile.establishmentDeedNumber}` : 'Belum diisi'}</b></div>
                  <div className="sm:col-span-2 truncate">SK Menkumham: <b className="text-slate-800">{effectiveMatchedProfile.establishmentSkNumber || 'Belum diisi'}</b></div>
                  {effectiveMatchedProfile.npwp && (
                    <div className="sm:col-span-2">NPWP: <b className="text-slate-800">{effectiveMatchedProfile.npwp}</b></div>
                  )}
                </div>
              </div>
            )}

            {/* Notice if stakeholders not available */}
            {effectiveMatchedProfile && stakeholdersForWakil.length === 0 && !isLoadingProfileDetail && (
              <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Pemberitahuan Data Belum Lengkap:</span>
                  <p className="mt-0.5 text-[11px] leading-normal">
                    Profil PT <b>{effectiveMatchedProfile.companyName}</b> belum memiliki susunan Direksi, Dewan Komisaris, atau Pemegang Saham di Master Data Klien. Anda dapat memilih opsi <b>Input Manual</b> pada bagian Data Wakil di bawah, atau melengkapi susunan pengurus pada menu Profil Klien.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!isBadanHukum && !isWna && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">NIK <span className="text-red-500">*</span></label>
            {shareholder.personId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Terhubung ke Master Database Orang
              </span>
            )}
          </div>
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

          {inCompanyDuplicate && (
            <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Peringatan Duplikasi Internal Perusahaan:</span>
                <p className="mt-0.5">
                  Individu dengan NIK ini sudah terdaftar dalam perusahaan ini ({inCompanyDuplicate.name}). Pastikan tidak terjadi pencatatan ganda atau sesuaikan jumlah lembar saham yang dimiliki.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          {isBadanHukum ? "Nama Badan Hukum / Perusahaan" : "Nama"} <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          {!isBadanHukum && (
            <select 
              value={shareholder.salutation || 'Tuan'} 
              onChange={e => onChange({ salutation: e.target.value as any })}
              className="w-24 px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              <option value="Tuan">Tuan</option>
              <option value="Nyonya">Nyonya</option>
              <option value="Nona">Nona</option>
            </select>
          )}
          <input 
            type="text"
            value={shareholder.name || ''}
            onChange={e => {
              const val = e.target.value;
              const nameUpper = val.toUpperCase();
              const updates: Partial<Shareholder> = { name: nameUpper };
              if (CorporateShareholderService.checkIsCorporateShareholder({ name: nameUpper })) {
                updates.shareholderType = 'BADAN_HUKUM';
                if (!shareholder.legalEntityType) {
                  updates.legalEntityType = 'PT Persekutuan Modal';
                }
              }
              onChange(updates);
            }}
            placeholder={isBadanHukum ? "CONTOH: PT NUSA JAYA ABADI" : "NAMA LENGKAP"}
            className="flex-1 w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-bold uppercase"
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
                      fullAddress: shAddress.fullAddress || '',
                      rt: shAddress.rt || '',
                      rw: shAddress.rw || '',
                      kelurahan: shAddress.kelurahan || '',
                      kecamatan: shAddress.kecamatan || '',
                      city: shAddress.city || '',
                      province: shAddress.province || '',
                      postalCode: shAddress.postalCode || ''
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
                      placeholder="Nama Notaris Pendirian"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Gelar Notaris</label>
                    <div className="flex flex-col gap-1">
                      <select
                        value={['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan', 'SH.', 'SH., M.Kn.', 'S.H.', 'S.H., M.Kn.'].some(opt => opt.toLowerCase() === (shareholder.establishmentNotaryTitle || '').toLowerCase()) ? shareholder.establishmentNotaryTitle : (shareholder.establishmentNotaryTitle ? 'manual' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'manual') {
                            // keep current or allow typing
                          } else {
                            onChange({ establishmentNotaryTitle: val });
                          }
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white"
                      >
                        <option value="">-- Pilih Gelar --</option>
                        <option value="Sarjana Hukum">SH.</option>
                        <option value="Sarjana Hukum, Magister Kenotariatan">SH., M.Kn.</option>
                        <option value="manual">Manual</option>
                      </select>
                      {(!['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan', 'SH.', 'SH., M.Kn.', 'S.H.', 'S.H., M.Kn.'].some(opt => opt.toLowerCase() === (shareholder.establishmentNotaryTitle || '').toLowerCase()) || shareholder.establishmentNotaryTitle === 'manual') && shareholder.establishmentNotaryTitle !== undefined && (
                        <input 
                          type="text" 
                          placeholder="Gelar manual (contoh: S.H., M.Kn.)..." 
                          value={shareholder.establishmentNotaryTitle === 'manual' ? '' : shareholder.establishmentNotaryTitle}
                          onChange={e => onChange({ establishmentNotaryTitle: e.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        />
                      )}
                    </div>
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
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">Gelar Notaris</label>
                            <div className="flex flex-col gap-1">
                              <select
                                value={['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan', 'SH.', 'SH., M.Kn.', 'S.H.', 'S.H., M.Kn.'].some(opt => opt.toLowerCase() === (deed.notaryTitle || '').toLowerCase()) ? deed.notaryTitle : (deed.notaryTitle ? 'manual' : '')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newList = [...(shareholder.amendmentDeeds || [])];
                                  if (val === 'manual') {
                                    // keep current or allow typing
                                  } else {
                                    newList[index] = { ...deed, notaryTitle: val };
                                    onChange({ amendmentDeeds: newList });
                                  }
                                }}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 bg-white"
                              >
                                <option value="">-- Pilih Gelar --</option>
                                <option value="Sarjana Hukum">SH.</option>
                                <option value="Sarjana Hukum, Magister Kenotariatan">SH., M.Kn.</option>
                                <option value="manual">Manual</option>
                              </select>
                              {(!['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan', 'SH.', 'SH., M.Kn.', 'S.H.', 'S.H., M.Kn.'].some(opt => opt.toLowerCase() === (deed.notaryTitle || '').toLowerCase()) || deed.notaryTitle === 'manual') && deed.notaryTitle !== undefined && (
                                <input 
                                  type="text" 
                                  value={deed.notaryTitle === 'manual' ? '' : deed.notaryTitle} 
                                  onChange={e => {
                                    const newList = [...(shareholder.amendmentDeeds || [])];
                                    newList[index] = { ...deed, notaryTitle: e.target.value };
                                    onChange({ amendmentDeeds: newList });
                                  }} 
                                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none focus:border-teal-500 bg-white"
                                  placeholder="Gelar manual (contoh: S.H., M.Kn.)" 
                                />
                              )}
                            </div>
                          </div>
                          <div className="md:col-span-2">
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
                                    <option value="SK_PENDIRIAN">SK Pendirian</option>
                                    <option value="SK_PERUBAHAN">SK Perubahan</option>
                                    <option value="SP_ANGGARAN_DASAR">SP Anggaran Dasar</option>
                                    <option value="SP_DATA_PERSEROAN">SP Perubahan Data</option>
                                    <option value="SK">SK (Lainnya / Keputusan)</option>
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
                        const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', notaryTitle: '', notaryDomicile: '', skNumber: '', skDate: '', skSpDocuments: [] };
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Pihak yang Mewakili <span className="text-red-500">*</span></label>
            <select 
              value={shareholder.representativeId || 'MANUAL'} 
              onChange={e => {
                const val = e.target.value;
                if (val === 'MANUAL') {
                  const updates = CorporateShareholderService.syncShareholderRepresentative({
                    ...shareholder,
                    representativeId: 'MANUAL',
                    representativePosition: (shareholder as any).representativePosition || 'Kuasa Direksi'
                  });
                  onChange(updates);
                } else {
                  const party = stakeholdersForWakil.find(m => m.id === val);
                  const activeProf = effectiveMatchedProfile || matchedProfile;
                  if (party && activeProf) {
                    const updates = CorporateShareholderService.applyCorporateProfileToShareholder(
                      shareholder,
                      activeProf,
                      party,
                      (party.roleCategory === 'DIREKSI' || party.roleCategory === 'KOMISARIS') ? 'DIREKTUR_PT_LAIN' : 'KUASA'
                    );
                    onChange(updates);
                  }
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
            >
              {stakeholdersForWakil.length > 0 && <option value="" disabled>-- Pilih dari Data Klien --</option>}
              {direksiForWakil.length > 0 && (
                <optgroup label="Dewan Direksi (Direksi)">
                  {direksiForWakil.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.position} {p.isComplete ? '✓' : '⚠️ (Perlu Lengkapi Data)'}
                    </option>
                  ))}
                </optgroup>
              )}
              {komisarisForWakil.length > 0 && (
                <optgroup label="Dewan Komisaris">
                  {komisarisForWakil.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.position} {p.isComplete ? '✓' : '⚠️ (Perlu Lengkapi Data)'}
                    </option>
                  ))}
                </optgroup>
              )}
              {pemegangSahamForWakil.length > 0 && (
                <optgroup label="Pemegang Saham PT (Perorangan)">
                  {pemegangSahamForWakil.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Pemegang Saham {p.isComplete ? '✓' : '⚠️ (Perlu Lengkapi Data)'}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="MANUAL">{stakeholdersForWakil.length > 0 ? 'Kuasa Direksi / Pihak Lainnya (Input Manual)' : 'Input Manual'}</option>
            </select>
          </div>

          {(() => {
            const currentSelectedParty = stakeholdersForWakil.find(m => m.id === shareholder.representativeId);
            if (currentSelectedParty && currentSelectedParty.missingFields.length > 0) {
              return (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px] flex items-start gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Catatan: Data <b>{currentSelectedParty.name}</b> di database Klien belum memiliki: {currentSelectedParty.missingFields.join(', ')}. Silakan lengkapi formulir di bawah ini agar akta dan pelaporan valid.
                  </span>
                </div>
              );
            }
            return null;
          })()}

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
            value={shAddress.fullAddress || ''} 
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
            value={shAddress.city || ''} 
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
                value={shAddress.rt || ''} 
                onChange={e => updateAddress({ rt: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rw</label>
              <input 
                type="text" 
                value={shAddress.rw || ''} 
                onChange={e => updateAddress({ rw: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          <div className="mt-2">
            <IndoRegionSelector 
              address={shAddress} 
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
