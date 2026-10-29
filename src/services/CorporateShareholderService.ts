import { Shareholder, CompanyProfile, Address } from '../../types';
import { CompanyService } from './CompanyService';

export interface CorporateStakeholderParty {
  id: string;
  name: string;
  salutation: 'Tuan' | 'Nyonya' | 'Nona';
  roleCategory: 'DIREKSI' | 'KOMISARIS' | 'PEMEGANG_SAHAM';
  position: string;
  nik: string;
  birthCity: string;
  birthDate: string;
  occupation: string;
  address: Address;
  nationalityType: 'WNI' | 'WNA';
  nationality: string;
  passportNumber?: string;
  kitasNumber?: string;
  kitasType?: 'NONE' | 'KITAS' | 'KITAP';
  hasKitas?: boolean;
  isComplete: boolean;
  missingFields: string[];
}

export class CorporateShareholderService {
  /**
   * Normalizes company name by removing PT/CV prefixes, salutations, punctuation, and extra whitespace
   */
  static normalizeCorporateName(name?: string): string {
    if (!name) return '';
    return name
      .toUpperCase()
      .replace(/\b(TUAN|NYONYA|NONA|BAPAK|IBU|BPK|PT|PT\.|P\.T\.|P\.T|PERSEROAN TERBATAS|CV|CV\.|KOPERASI|YAYASAN)\b/gi, '')
      .replace(/[^A-Z0-9]/g, '')
      .trim();
  }

  /**
   * Checks if a shareholder entity is a Corporate / Badan Hukum entity
   */
  static checkIsCorporateShareholder(sh: any): boolean {
    if (!sh) return false;
    if (sh.shareholderType === 'BADAN_HUKUM') return true;
    if (sh.legalEntityType && String(sh.legalEntityType).trim() !== '') return true;
    const nameUpper = (sh.name || '').toUpperCase().trim();
    return (
      nameUpper.startsWith('PT ') ||
      nameUpper.startsWith('PT.') ||
      nameUpper.startsWith('PERSEROAN TERBATAS') ||
      nameUpper.startsWith('KOPERASI ') ||
      nameUpper.startsWith('YAYASAN ') ||
      nameUpper.startsWith('CV ') ||
      nameUpper.startsWith('CV.')
    );
  }

  /**
   * Extracts all relevant parties (Direksi, Dewan Komisaris, and individual Pemegang Saham)
   * from a CompanyProfile according to database structure.
   */
  static extractCorporateStakeholders(profile: CompanyProfile | null | undefined): CorporateStakeholderParty[] {
    if (!profile) return [];

    const rawList: CorporateStakeholderParty[] = [];

    // Helper to evaluate completeness
    const evaluateParty = (raw: any, category: 'DIREKSI' | 'KOMISARIS' | 'PEMEGANG_SAHAM', defaultPos: string): CorporateStakeholderParty => {
      const isWna = raw.nationalityType === 'WNA' || raw.isForeign;
      const missing: string[] = [];

      if (!raw.name || !String(raw.name).trim()) missing.push('Nama');
      if (!isWna && (!raw.nik || String(raw.nik).trim().length < 16)) missing.push('NIK (16 digit)');
      if (isWna && !raw.passportNumber) missing.push('Nomor Paspor');
      if (!raw.birthCity || !String(raw.birthCity).trim()) missing.push('Tempat Lahir');
      if (!raw.birthDate || !String(raw.birthDate).trim()) missing.push('Tanggal Lahir');
      if (!raw.occupation || !String(raw.occupation).trim()) missing.push('Pekerjaan');
      if (!raw.address?.fullAddress && !raw.address?.city) missing.push('Alamat Lengkap');

      const addr: Address = {
        fullAddress: raw.address?.fullAddress || '',
        rt: raw.address?.rt || '',
        rw: raw.address?.rw || '',
        kelurahan: raw.address?.kelurahan || '',
        kecamatan: raw.address?.kecamatan || '',
        city: raw.address?.city || '',
        province: raw.address?.province || '',
        postalCode: raw.address?.postalCode || '',
        phoneNumber: raw.address?.phoneNumber || ''
      };

      return {
        id: raw.id || crypto.randomUUID(),
        name: (raw.name || '').toUpperCase().trim(),
        salutation: raw.salutation || 'Tuan',
        roleCategory: category,
        position: raw.position || raw.managementPosition || defaultPos,
        nik: raw.nik || '',
        birthCity: raw.birthCity || '',
        birthDate: raw.birthDate || '',
        occupation: raw.occupation || (category === 'PEMEGANG_SAHAM' ? 'WIRASWASTA' : defaultPos),
        address: addr,
        nationalityType: isWna ? 'WNA' : 'WNI',
        nationality: raw.nationality || (isWna ? 'WNA' : 'Indonesia'),
        passportNumber: raw.passportNumber || '',
        kitasNumber: raw.kitasNumber || '',
        kitasType: raw.kitasType || 'NONE',
        hasKitas: raw.hasKitas || false,
        isComplete: missing.length === 0,
        missingFields: missing
      };
    };

    // 1. Gather from Management Items (newManagementItems, oldManagementItems, managementItems)
    const mgmtPool = [
      ...(profile.newManagementItems || []),
      ...(profile.oldManagementItems || []),
      ...((profile as any).managementItems || [])
    ];

    mgmtPool.forEach(m => {
      if (m && m.name && String(m.name).trim()) {
        const pos = (m.position || m.managementPosition || 'Direktur').trim();
        const isKom = /komisaris/i.test(pos);
        const category: 'DIREKSI' | 'KOMISARIS' = isKom ? 'KOMISARIS' : 'DIREKSI';
        rawList.push(evaluateParty(m, category, isKom ? 'Komisaris' : 'Direktur'));
      }
    });

    // 2. Gather from Shareholders (individual shareholders of this holding company)
    (profile.shareholders || []).forEach(s => {
      if (s && s.name && String(s.name).trim() && !this.checkIsCorporateShareholder(s)) {
        const isMgr = s.isManagement || !!s.managementPosition;
        const pos = s.managementPosition || '';
        let category: 'DIREKSI' | 'KOMISARIS' | 'PEMEGANG_SAHAM' = 'PEMEGANG_SAHAM';
        if (isMgr) {
          category = /komisaris/i.test(pos) ? 'KOMISARIS' : 'DIREKSI';
        }
        rawList.push(evaluateParty(s, category, isMgr ? (category === 'KOMISARIS' ? 'Komisaris' : 'Direktur') : 'Pemegang Saham'));
      }
    });

    // 3. Deduplicate by normalized name and role priority
    const categoryPriority = { DIREKSI: 1, KOMISARIS: 2, PEMEGANG_SAHAM: 3 };
    const uniqueMap = new Map<string, CorporateStakeholderParty>();

    rawList.forEach(item => {
      const normKey = this.normalizeCorporateName(item.name);
      if (!normKey) return;

      if (!uniqueMap.has(normKey)) {
        uniqueMap.set(normKey, item);
      } else {
        const existing = uniqueMap.get(normKey)!;
        // Prioritize more senior role (DIREKSI over KOMISARIS over PEMEGANG_SAHAM)
        // or more complete record
        const existingRank = categoryPriority[existing.roleCategory];
        const newRank = categoryPriority[item.roleCategory];

        if (newRank < existingRank || (!existing.isComplete && item.isComplete)) {
          uniqueMap.set(normKey, {
            ...existing,
            ...item,
            // Preserve non-empty fields from existing if new is empty
            nik: item.nik || existing.nik,
            birthCity: item.birthCity || existing.birthCity,
            birthDate: item.birthDate || existing.birthDate,
            occupation: item.occupation || existing.occupation,
            address: item.address?.fullAddress ? item.address : existing.address
          });
        }
      }
    });

    // 4. Sort: Direksi first (Direktur Utama, Direktur), then Dewan Komisaris (Komisaris Utama, Komisaris), then Pemegang Saham
    const positionRank = (p: CorporateStakeholderParty): number => {
      const pos = p.position.toLowerCase();
      if (p.roleCategory === 'DIREKSI') {
        if (pos.includes('utama')) return 1;
        return 2;
      }
      if (p.roleCategory === 'KOMISARIS') {
        if (pos.includes('utama')) return 3;
        return 4;
      }
      return 5;
    };

    return Array.from(uniqueMap.values()).sort((a, b) => positionRank(a) - positionRank(b));
  }

  /**
   * Filters available client profiles for PT pemegang saham selection,
   * strictly excluding the company holding the RUPS to prevent accidental mix-up.
   */
  static filterAvailableCorporateProfiles(
    profiles: CompanyProfile[] = [],
    excludeCompanyIdOrName?: string,
    searchQuery: string = ''
  ): CompanyProfile[] {
    const cleanPT = (name: string): string => {
      if (!name) return '';
      return name.replace(/^(PT|PT\.|P\.T\.|P\.T)\s*/i, '').trim().toLowerCase();
    };

    const normExclude = excludeCompanyIdOrName ? this.normalizeCorporateName(excludeCompanyIdOrName) : '';

    const filtered = profiles.filter(p => {
      if (!p || !p.companyName) return false;
      // Exclude by ID
      if (excludeCompanyIdOrName && p.id === excludeCompanyIdOrName) return false;
      // Exclude by normalized name
      if (normExclude && this.normalizeCorporateName(p.companyName) === normExclude) return false;
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (p.companyName || '').toLowerCase().includes(q);
      }
      return true;
    });

    return filtered.sort((a, b) => {
      const nameA = cleanPT(a.companyName || '');
      const nameB = cleanPT(b.companyName || '');
      return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    });
  }

  /**
   * Finds matching Corporate Profile from database using linkedProfileId or company name,
   * strictly ignoring the meeting company itself.
   */
  static findMatchingCorporateProfile(
    sh: Partial<Shareholder> | undefined | null,
    profiles: CompanyProfile[] = [],
    excludeCompanyIdOrName?: string
  ): CompanyProfile | null {
    if (!sh || !profiles || profiles.length === 0) return null;

    const normExclude = excludeCompanyIdOrName ? this.normalizeCorporateName(excludeCompanyIdOrName) : '';

    // 1. Match by linkedProfileId
    if (sh.linkedProfileId) {
      const found = profiles.find(p => p.id === sh.linkedProfileId);
      if (found) {
        if (excludeCompanyIdOrName && found.id === excludeCompanyIdOrName) return null;
        if (normExclude && this.normalizeCorporateName(found.companyName) === normExclude) return null;
        return found;
      }
    }

    // 2. Match by normalized name
    if (sh.name) {
      const shNorm = this.normalizeCorporateName(sh.name);
      if (shNorm && shNorm !== normExclude) {
        const found = profiles.find(p => p.companyName && this.normalizeCorporateName(p.companyName) === shNorm);
        if (found) {
          if (excludeCompanyIdOrName && found.id === excludeCompanyIdOrName) return null;
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Applies PT data and representative party to a Shareholder record,
   * ensuring both guardian* fields and proxyData are completely synchronized.
   */
  static applyCorporateProfileToShareholder(
    sh: Partial<Shareholder>,
    profile: CompanyProfile,
    chosenParty?: CorporateStakeholderParty | null,
    representationType: 'DIREKTUR_PT_LAIN' | 'KUASA' = 'DIREKTUR_PT_LAIN',
    proxyDeedDate: string = ''
  ): Partial<Shareholder> {
    const targetAddress = profile.newAddress && profile.newAddress.fullAddress
      ? { ...profile.newAddress }
      : (profile.oldAddress && profile.oldAddress.fullAddress
        ? { ...profile.oldAddress }
        : {
            fullAddress: '',
            rt: '',
            rw: '',
            kelurahan: '',
            kecamatan: '',
            city: '',
            province: '',
            postalCode: ''
          });

    const profileCity = (
      profile.domicile ||
      profile.oldDomicile ||
      profile.newAddress?.city ||
      profile.oldAddress?.city ||
      profile.kedudukanPT ||
      (profile as any).city ||
      targetAddress.city ||
      ''
    ).toUpperCase();
    targetAddress.city = profileCity;

    const updates: Partial<Shareholder> = {
      ...sh,
      shareholderType: 'BADAN_HUKUM',
      salutation: '' as any,
      isManagement: false,
      managementPosition: undefined,
      name: (profile.companyName || sh.name || '').replace(/^(TUAN|NYONYA|NONA|BAPAK|IBU|BPK)\s+/i, '').toUpperCase().trim(),
      legalEntityType: profile.companyType || sh.legalEntityType || 'PT Persekutuan Modal',
      npwp: profile.npwp || sh.npwp || '',
      address: targetAddress,
      skNumber: profile.establishmentSkNumber || sh.skNumber || '',
      skDate: profile.establishmentSkDate || sh.skDate || '',
      establishmentDeedNumber: profile.establishmentDeedNumber || sh.establishmentDeedNumber || '',
      establishmentDeedDate: profile.establishmentDeedDate || sh.establishmentDeedDate || '',
      establishmentNotary: profile.establishmentNotary || sh.establishmentNotary || '',
      establishmentNotaryTitle: profile.establishmentNotaryTitle || sh.establishmentNotaryTitle || '',
      establishmentNotaryDomicile: profile.establishmentNotaryDomicile || sh.establishmentNotaryDomicile || '',
      establishmentSkNumber: profile.establishmentSkNumber || sh.establishmentSkNumber || '',
      establishmentSkDate: profile.establishmentSkDate || sh.establishmentSkDate || '',
      amendmentDeeds: profile.amendmentDeeds || sh.amendmentDeeds || [],
      linkedProfileId: profile.id
    };

    if (chosenParty) {
      const isDirectorOrKomisaris = chosenParty.roleCategory === 'DIREKSI' || chosenParty.roleCategory === 'KOMISARIS';
      const finalRepType = representationType || (isDirectorOrKomisaris ? 'DIREKTUR_PT_LAIN' : 'KUASA');

      updates.representativeId = chosenParty.id;
      updates.representativePosition = chosenParty.position || (isDirectorOrKomisaris ? 'Direktur' : 'Kuasa Direksi');
      updates.guardianName = (chosenParty.name || '').toUpperCase().trim();
      updates.guardianSalutation = chosenParty.salutation || 'Tuan';
      updates.guardianNik = chosenParty.nik || '';
      updates.guardianOccupation = chosenParty.occupation || chosenParty.position || '';
      updates.guardianBirthCity = chosenParty.birthCity || '';
      updates.guardianBirthDate = chosenParty.birthDate || '';
      updates.guardianAddress = chosenParty.address ? { ...chosenParty.address } : undefined;
      updates.guardianNationality = chosenParty.nationality || 'Indonesia';
      updates.guardianNationalityType = chosenParty.nationalityType || 'WNI';
      updates.guardianPassportNumber = chosenParty.passportNumber || '';
      updates.guardianKitasNumber = chosenParty.kitasNumber || '';

      updates.isProxy = true;
      updates.proxyData = {
        salutation: chosenParty.salutation || 'Tuan',
        name: (chosenParty.name || '').toUpperCase().trim(),
        nik: chosenParty.nik || '',
        birthCity: chosenParty.birthCity || '',
        birthDate: chosenParty.birthDate || '',
        occupation: chosenParty.position || chosenParty.occupation || 'Direktur',
        position: chosenParty.position || chosenParty.occupation || 'Direktur',
        address: chosenParty.address ? { ...chosenParty.address } : {
          fullAddress: '',
          rt: '',
          rw: '',
          kelurahan: '',
          kecamatan: '',
          city: '',
          province: '',
          postalCode: ''
        },
        proxyDeedDate: proxyDeedDate || '',
        representationType: finalRepType,
        nationalityType: chosenParty.nationalityType || 'WNI',
        isForeign: chosenParty.nationalityType === 'WNA',
        nationality: chosenParty.nationality || 'Indonesia',
        passportNumber: chosenParty.passportNumber || '',
        kitasNumber: chosenParty.kitasNumber || '',
        kitasType: chosenParty.kitasType || 'NONE',
        hasKitas: chosenParty.hasKitas || false
      };
    }

    return updates;
  }

  /**
   * Two-way sync between guardian* fields and proxyData to ensure all DOCX
   * generators read consistent data whether reading guardian or proxyData.
   */
  static syncShareholderRepresentative(sh: Partial<Shareholder>): Partial<Shareholder> {
    if (!sh) return {};
    const updated = { ...sh };

    if (updated.proxyData && (updated.proxyData.name || updated.proxyData.nik)) {
      const px = updated.proxyData;
      updated.guardianName = (px.name || '').toUpperCase().trim();
      updated.guardianNik = px.nik || '';
      updated.guardianSalutation = px.salutation || 'Tuan';
      updated.guardianBirthCity = px.birthCity || '';
      updated.guardianBirthDate = px.birthDate || '';
      updated.guardianOccupation = px.position || px.occupation || '';
      updated.guardianAddress = px.address ? { ...px.address } : undefined;
      updated.representativePosition = px.position || px.occupation || (px.representationType === 'KUASA' ? 'Kuasa Direksi' : 'Direktur');
      updated.representativeName = (px.name || '').toUpperCase().trim();
      updated.guardianNationality = px.nationality || 'Indonesia';
      updated.guardianNationalityType = px.nationalityType || 'WNI';
      updated.guardianPassportNumber = px.passportNumber || '';
      updated.guardianKitasNumber = px.kitasNumber || '';
      updated.guardianKitasType = px.kitasType || 'NONE';
      updated.isProxy = true;
    } else if (updated.guardianName && !updated.proxyData) {
      updated.proxyData = {
        salutation: updated.guardianSalutation || 'Tuan',
        name: updated.guardianName.toUpperCase().trim(),
        nik: updated.guardianNik || '',
        birthCity: updated.guardianBirthCity || '',
        birthDate: updated.guardianBirthDate || '',
        occupation: updated.representativePosition || updated.guardianOccupation || 'Direktur',
        position: updated.representativePosition || updated.guardianOccupation || 'Direktur',
        address: updated.guardianAddress || {
          fullAddress: '',
          rt: '',
          rw: '',
          kelurahan: '',
          kecamatan: '',
          city: '',
          province: '',
          postalCode: ''
        },
        proxyDeedDate: '',
        representationType: updated.representativePosition === 'Kuasa Direksi' ? 'KUASA' : 'DIREKTUR_PT_LAIN',
        nationalityType: updated.guardianNationalityType || 'WNI',
        isForeign: updated.guardianNationalityType === 'WNA',
        nationality: updated.guardianNationality || 'Indonesia',
        passportNumber: updated.guardianPassportNumber || '',
        kitasNumber: updated.guardianKitasNumber || '',
        kitasType: 'NONE',
        hasKitas: false
      };
      updated.isProxy = true;
    }

    return updated;
  }

  /**
   * When a corporate shareholder is manually entered or updated, this method ensures
   * that it is also registered/saved as an official Client PT in the Master Clients database,
   * completely following all PT client storage rules (Firestore `profiles`, `client_unique_keys`,
   * SQLite/D1 directory index, centralized people collection, and normalized naming).
   */
  static async saveOrSyncCorporateClientProfile(
    sh: Shareholder,
    availableProfiles: CompanyProfile[] = [],
    excludeCompanyIdOrName?: string
  ): Promise<{ updatedShareholder: Shareholder; savedProfile: CompanyProfile | null }> {
    if (!this.checkIsCorporateShareholder(sh)) {
      return { updatedShareholder: sh, savedProfile: null };
    }

    const rawName = (sh.name || '').trim();
    if (!rawName) {
      return { updatedShareholder: sh, savedProfile: null };
    }

    // Format according to standard PT naming rules (e.g. "PT NAMA PERUSAHAAN")
    const formattedName = CompanyService.formatCompanyName(rawName, 'PT').toUpperCase().trim();
    const normalized = this.normalizeCorporateName(formattedName);
    if (!normalized) {
      return { updatedShareholder: sh, savedProfile: null };
    }

    // Prevent overwriting or mix-up with the currently edited meeting/client company
    const normExclude = excludeCompanyIdOrName ? this.normalizeCorporateName(excludeCompanyIdOrName) : '';
    if (excludeCompanyIdOrName && (sh.linkedProfileId === excludeCompanyIdOrName || normalized === normExclude)) {
      return { updatedShareholder: sh, savedProfile: null };
    }

    try {
      // 1. Check if profile already exists in available profiles or directory
      let existingProfile: CompanyProfile | null = null;
      let targetId = sh.linkedProfileId;

      if (targetId) {
        existingProfile = await CompanyService.getCompanyProfile(targetId);
      }

      if (!existingProfile) {
        // Search in availableProfiles
        const foundInAvailable = availableProfiles.find(
          p => p.id !== excludeCompanyIdOrName && this.normalizeCorporateName(p.companyName) === normalized
        );
        if (foundInAvailable) {
          targetId = foundInAvailable.id;
          existingProfile = (await CompanyService.getCompanyProfile(foundInAvailable.id)) || foundInAvailable;
        }
      }

      if (!existingProfile) {
        // Search in directory
        try {
          const dirResults = await CompanyService.searchClientDirectory(formattedName, 5);
          const matchedDir = dirResults.find(
            d => (d.clientId || d.id) !== excludeCompanyIdOrName && this.normalizeCorporateName(d.companyName) === normalized
          );
          if (matchedDir) {
            targetId = matchedDir.clientId || matchedDir.id;
            existingProfile = await CompanyService.getCompanyProfile(targetId);
          }
        } catch (dirErr) {
          console.warn('[CorporateShareholderService] Directory search warning:', dirErr);
        }
      }

      if (!targetId) {
        targetId = crypto.randomUUID();
      }

      // 2. Prepare full profile payload adhering to PT storage rules
      const profileCity = (
        sh.address?.city ||
        existingProfile?.domicile ||
        existingProfile?.oldDomicile ||
        sh.establishmentNotaryDomicile ||
        ''
      ).toUpperCase().trim();

      const targetAddress: Address = {
        fullAddress: sh.address?.fullAddress || existingProfile?.newAddress?.fullAddress || existingProfile?.oldAddress?.fullAddress || '',
        rt: sh.address?.rt || existingProfile?.newAddress?.rt || existingProfile?.oldAddress?.rt || '',
        rw: sh.address?.rw || existingProfile?.newAddress?.rw || existingProfile?.oldAddress?.rw || '',
        kelurahan: sh.address?.kelurahan || existingProfile?.newAddress?.kelurahan || existingProfile?.oldAddress?.kelurahan || '',
        kecamatan: sh.address?.kecamatan || existingProfile?.newAddress?.kecamatan || existingProfile?.oldAddress?.kecamatan || '',
        city: profileCity,
        province: sh.address?.province || existingProfile?.newAddress?.province || existingProfile?.oldAddress?.province || '',
        postalCode: sh.address?.postalCode || existingProfile?.newAddress?.postalCode || existingProfile?.oldAddress?.postalCode || ''
      };

      // 3. Assemble management items (Direksi / Pengurus) from the person representing this PT
      const existingMgmt: any[] = [
        ...(existingProfile?.newManagementItems || existingProfile?.oldManagementItems || [])
      ];

      if (sh.guardianName && sh.guardianName.trim()) {
        const repName = sh.guardianName.toUpperCase().trim();
        const normRepName = this.normalizeCorporateName(repName);
        const repPos = sh.representativePosition || 'Direktur';
        const repNik = sh.guardianNik || '';

        const repIdx = existingMgmt.findIndex(m => 
          (repNik && m.nik === repNik) || (m.name && this.normalizeCorporateName(m.name) === normRepName)
        );

        const repItem: any = {
          id: repIdx >= 0 ? existingMgmt[repIdx].id : (sh.representativeId && sh.representativeId !== 'MANUAL' ? sh.representativeId : crypto.randomUUID()),
          name: repName,
          salutation: sh.guardianSalutation || (repIdx >= 0 ? existingMgmt[repIdx].salutation : 'Tuan'),
          position: repPos,
          managementPosition: repPos,
          isManagement: true,
          nik: repNik || (repIdx >= 0 ? existingMgmt[repIdx].nik : ''),
          birthCity: (sh.guardianBirthCity || (repIdx >= 0 ? existingMgmt[repIdx].birthCity : '')).toUpperCase().trim(),
          birthDate: sh.guardianBirthDate || (repIdx >= 0 ? existingMgmt[repIdx].birthDate : ''),
          occupation: (sh.guardianOccupation || repPos).toUpperCase().trim(),
          address: sh.guardianAddress && sh.guardianAddress.fullAddress ? sh.guardianAddress : (repIdx >= 0 && existingMgmt[repIdx].address ? existingMgmt[repIdx].address : targetAddress),
          nationalityType: sh.guardianNationalityType || (repIdx >= 0 ? existingMgmt[repIdx].nationalityType : 'WNI'),
          nationality: sh.guardianNationality || (repIdx >= 0 ? existingMgmt[repIdx].nationality : 'Indonesia')
        };

        if (repIdx >= 0) {
          existingMgmt[repIdx] = { ...existingMgmt[repIdx], ...repItem };
        } else {
          existingMgmt.push(repItem);
        }
      }

      const clientType = 'PT';
      const companyType = sh.legalEntityType === 'PT Perorangan' ? 'PT_PERORANGAN' : (existingProfile?.companyType || 'PT_LOKAL');

      const profilePayload: Partial<CompanyProfile> = {
        ...existingProfile,
        id: targetId,
        companyName: formattedName,
        clientType: clientType,
        companyType: companyType,
        domicile: profileCity,
        oldDomicile: profileCity,
        newAddress: targetAddress,
        oldAddress: targetAddress,
        npwp: sh.npwp || existingProfile?.npwp || '',
        establishmentDeedNumber: sh.establishmentDeedNumber || existingProfile?.establishmentDeedNumber || '',
        establishmentDeedDate: sh.establishmentDeedDate || existingProfile?.establishmentDeedDate || '',
        establishmentNotary: sh.establishmentNotary || existingProfile?.establishmentNotary || '',
        establishmentNotaryTitle: sh.establishmentNotaryTitle || existingProfile?.establishmentNotaryTitle || '',
        establishmentNotaryDomicile: sh.establishmentNotaryDomicile || existingProfile?.establishmentNotaryDomicile || profileCity,
        establishmentSkNumber: sh.establishmentSkNumber || sh.skNumber || existingProfile?.establishmentSkNumber || '',
        establishmentSkDate: sh.establishmentSkDate || sh.skDate || existingProfile?.establishmentSkDate || '',
        amendmentDeeds: (sh.amendmentDeeds && sh.amendmentDeeds.length > 0) ? sh.amendmentDeeds : (existingProfile?.amendmentDeeds || []),
        newManagementItems: existingMgmt,
        oldManagementItems: existingMgmt
      };

      // 4. Save to Master Client via CompanyService (handles Firestore transaction, D1 sync, people sync, unique keys)
      try {
        await CompanyService.saveCompany(targetId, profilePayload, false);
      } catch (saveErr: any) {
        if (saveErr instanceof Error && saveErr.message.startsWith('KLIEN_NAME_EXISTS:')) {
          const dirEntries = await CompanyService.searchClientDirectory(formattedName, 5);
          const matchedDir = dirEntries.find(d => this.normalizeCorporateName(d.companyName) === normalized);
          if (matchedDir && matchedDir.clientId) {
            targetId = matchedDir.clientId;
            await CompanyService.saveCompany(targetId, { ...profilePayload, id: targetId }, false);
          } else {
            console.warn('[CorporateShareholderService] Name exists collision could not resolve clientId:', saveErr);
          }
        } else {
          throw saveErr;
        }
      }

      const updatedShareholder: Shareholder = {
        ...sh,
        name: formattedName,
        linkedProfileId: targetId,
        address: targetAddress,
        isManagement: false,
        managementPosition: undefined
      };

      return {
        updatedShareholder,
        savedProfile: { ...profilePayload, id: targetId } as CompanyProfile
      };
    } catch (err) {
      console.error('[CorporateShareholderService] Error auto-saving corporate client PT profile:', err);
      return {
        updatedShareholder: {
          ...sh,
          name: formattedName,
          isManagement: false,
          managementPosition: undefined
        },
        savedProfile: null
      };
    }
  }
}
