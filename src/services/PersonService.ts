/**
 * PersonService - Centralized People Database Service
 * Single Source of Truth: Cloudflare D1 via /api/v2/people Gateway API.
 * Cloud Firestore remains the single source of truth for company profiles & legal documents.
 */

import { collection, doc, getDoc, getDocs, runTransaction } from 'firebase/firestore';
import { db, searchShareholderByNIKClient } from '../lib/firebase';
import { getApiUrl, getAuthHeaders } from '../lib/api';
import { Person, Address, Shareholder, ManagementItem, Pesero, CompanyProfile } from '../../types';
import { sanitizeForFirestore } from '../utils/sanitize';
import { evaluateNameCompatibility, parsePersonName } from '../utils/nameResolution';
import { isProjectFinal } from './ClientProjectSyncService';

export interface MigrationConflict {
  nik?: string;
  passportNumber?: string;
  conflictType: string;
  names: string[];
  birthDates: string[];
  birthCities: string[];
  sources: Array<{ collection: string; docId: string; companyName: string }>;
}

export interface PersonMigrationReport {
  isDryRun: boolean;
  batchId?: string;
  totalDocsScanned: number;
  totalIndividualRecords: number;
  uniqueValidNiks: number;
  uniqueWnaPassports: number;
  recordsLinked: number;
  recordsWithoutNik: number;
  recordsWithInvalidNik: number;
  multiCompanyPeopleCount: number;
  conflicts: MigrationConflict[];
  migratedPeopleCount: number;
  updatedCompaniesCount: number;
  skippedFinalDocumentsCount: number;
  errors: string[];
}

/**
 * Normalizes NIK into a clean numeric string.
 */
export function normalizeNik(nik?: string | null): string {
  if (!nik) return '';
  return String(nik).trim().replace(/\D/g, '');
}

/**
 * Validates that NIK is exactly 16 digits.
 */
export function isValidNik(nik?: string | null): boolean {
  const norm = normalizeNik(nik);
  return norm.length === 16;
}

/**
 * Normalizes passport number (trimmed, uppercase, alphanumeric).
 */
export function normalizePassport(passport?: string | null): string {
  if (!passport) return '';
  return String(passport).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Formats a raw address into standard Address structure.
 */
export function normalizePersonAddress(addr: any): Address {
  if (!addr) {
    return {
      province: '',
      city: '',
      fullAddress: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kecamatan: '',
      postalCode: '',
      phoneNumber: ''
    };
  }

  if (typeof addr === 'string') {
    return {
      province: '',
      city: '',
      fullAddress: addr,
      rt: '',
      rw: '',
      kelurahan: '',
      kecamatan: '',
      postalCode: '',
      phoneNumber: ''
    };
  }

  return {
    province: addr.province || '',
    city: addr.city || addr.regency || addr.kabupaten || '',
    fullAddress: addr.fullAddress || addr.address || '',
    rt: addr.rt || '',
    rw: addr.rw || '',
    kelurahan: addr.kelurahan || addr.village || addr.desa || '',
    kecamatan: addr.kecamatan || addr.district || '',
    postalCode: addr.postalCode || addr.postal_code || '',
    phoneNumber: addr.phoneNumber || addr.phone || ''
  };
}

export class PersonService {
  /**
   * Retrieves a person by their permanent personId from D1 via /api/v2/people.
   */
  static async getPersonById(personId: string): Promise<Person | null> {
    if (!personId) return null;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(getApiUrl(`/api/v2/people/${encodeURIComponent(personId)}`), {
        headers
      });

      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      return json.success && json.person ? (json.person as Person) : null;
    } catch (err) {
      console.error(`[PersonService] Failed to get person by id ${personId}:`, err);
      return null;
    }
  }

  /**
   * Retrieves a person by their 16-digit NIK from D1 via /api/v2/people.
   */
  static async getPersonByNik(nik: string): Promise<Person | null> {
    const cleanNik = normalizeNik(nik);
    if (!cleanNik || cleanNik.length !== 16) return null;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(getApiUrl(`/api/v2/people/nik/${encodeURIComponent(cleanNik)}`), {
        headers
      });

      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      return json.success && json.person ? (json.person as Person) : null;
    } catch (err) {
      console.error(`[PersonService] Failed to lookup person by NIK ${cleanNik}:`, err);
      return null;
    }
  }

  /**
   * Retrieves a person by their passport number (both current and historical) from D1.
   */
  static async getPersonByPassport(passportNumber: string): Promise<Person | null> {
    const cleanPassport = normalizePassport(passportNumber);
    if (!cleanPassport) return null;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(getApiUrl(`/api/v2/people/passport/${encodeURIComponent(cleanPassport)}`), {
        headers
      });

      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      return json.success && json.person ? (json.person as Person) : null;
    } catch (err) {
      console.error(`[PersonService] Failed to lookup person by passport ${cleanPassport}:`, err);
      return null;
    }
  }

  /**
   * Creates or updates a Person record in Cloudflare D1 via /api/v2/people.
   */
  static async savePerson(personData: Partial<Person>): Promise<{ person: Person; isNew: boolean }> {
    const rawNik = personData.nik;
    const cleanNik = normalizeNik(rawNik);
    const isWna = personData.nationalityType === 'WNA' || (personData.nationality && personData.nationality.toUpperCase() !== 'INDONESIA');

    if (!isWna && rawNik && !isValidNik(rawNik)) {
      throw new Error(`Format NIK tidak valid: "${rawNik}". NIK harus terdiri dari 16 digit angka.`);
    }

    const headers = await getAuthHeaders();
    const res = await fetch(getApiUrl('/api/v2/people'), {
      method: 'POST',
      headers,
      body: JSON.stringify(personData)
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to save person (HTTP ${res.status})`);
    }

    return {
      person: json.person as Person,
      isNew: Boolean(json.isNew)
    };
  }

  /**
   * Submits a passport renewal for a WNA individual.
   * Deactivates previous active passport, registers new one, and preserves permanent personId.
   */
  static async renewPassport(
    personId: string,
    payload: {
      newPassportNumber: string;
      issuingCountry?: string;
      issueDate?: string;
      expiryDate?: string;
      notes?: string;
    }
  ): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/api/v2/people/${encodeURIComponent(personId)}/passport/renew`), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to renew passport (HTTP ${res.status})`);
    }

    return json;
  }

  /**
   * Verifies identity status (KTP / Passport) by an authorized Admin / Super Admin.
   */
  static async verifyIdentity(personId: string, notes?: string): Promise<any> {
    const headers = await getAuthHeaders();
    const res = await fetch(getApiUrl('/api/v2/people/verify-identity'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ personId, notes })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to verify identity (HTTP ${res.status})`);
    }

    return json;
  }

  /**
   * Links a person to a company in the derived relation index `company_person_roles`.
   */
  static async linkPersonToCompany(
    personId: string,
    roleData: {
      companyId: string;
      clientType?: string;
      companyName: string;
      roleCategory?: string;
      positionTitle?: string;
      role?: string;
      sourceRecordId?: string;
      sharesOwned?: number;
      shareCount?: number;
      shareValue?: number;
      ownershipPercentage?: number;
      relationStatus?: string;
    }
  ): Promise<void> {
    try {
      const headers = await getAuthHeaders();
      const roleCategory = roleData.roleCategory || roleData.role || 'MEMBER';
      const positionTitle = roleData.positionTitle || roleData.role || roleCategory;
      const shareCount = roleData.shareCount !== undefined ? roleData.shareCount : roleData.sharesOwned;
      await fetch(getApiUrl('/api/v2/people/link-company'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          personId,
          companyId: roleData.companyId,
          clientType: roleData.clientType,
          companyName: roleData.companyName,
          roleCategory,
          positionTitle,
          sourceRecordId: roleData.sourceRecordId,
          shareCount,
          shareValue: roleData.shareValue,
          ownershipPercentage: roleData.ownershipPercentage,
          relationStatus: roleData.relationStatus || 'ACTIVE'
        })
      });
    } catch (err) {
      console.warn(`[PersonService] Failed to link person ${personId} to company:`, err);
    }
  }

  /**
   * Retrieves company roles and shareholdings for a person from Cloudflare D1.
   */
  static async getPersonRoles(personId: string): Promise<any[]> {
    if (!personId) return [];
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(getApiUrl(`/api/v2/people/${encodeURIComponent(personId)}/roles`), { headers });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      return Array.isArray(data.roles) ? data.roles : [];
    } catch (err) {
      console.error('[PersonService] getPersonRoles error:', err);
      return [];
    }
  }

  /**
   * Fetches centralized people data with server-side pagination, multi-criteria filtering,
   * and consolidated company relation projections for the "Data Terpusat" dashboard.
   */
  static async fetchCentralizedData(options: {
    search?: string;
    page?: number;
    limit?: number;
    nationalityType?: string;
    identityStatus?: string;
    hasCompany?: string;
    roleCategory?: string;
  }): Promise<{
    people: any[];
    total: number;
    limit: number;
    offset: number;
    summary?: {
      totalPeople: number;
      totalWni: number;
      totalWna: number;
      totalRelations: number;
      totalCompaniesLinked: number;
    };
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 20);
    const offset = (page - 1) * limit;

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset)
    });

    if (options.search && options.search.trim()) {
      params.append('q', options.search.trim());
    }
    if (options.nationalityType && options.nationalityType !== 'ALL') {
      params.append('nationalityType', options.nationalityType);
    }
    if (options.identityStatus && options.identityStatus !== 'ALL') {
      params.append('identityStatus', options.identityStatus);
    }
    if (options.hasCompany && options.hasCompany !== 'ALL') {
      params.append('hasCompany', options.hasCompany);
    }
    if (options.roleCategory && options.roleCategory !== 'ALL') {
      params.append('roleCategory', options.roleCategory);
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(getApiUrl(`/api/v2/people?${params.toString()}`), { headers });
      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }
      const data = await res.json();
      return {
        people: Array.isArray(data.people) ? data.people : [],
        total: typeof data.total === 'number' ? data.total : (data.people?.length || 0),
        limit: data.limit || limit,
        offset: data.offset || offset,
        summary: data.summary
      };
    } catch (err) {
      console.error('[PersonService] fetchCentralizedData error:', err);
      return {
        people: [],
        total: 0,
        limit,
        offset,
        summary: {
          totalPeople: 0,
          totalWni: 0,
          totalWna: 0,
          totalRelations: 0,
          totalCompaniesLinked: 0
        }
      };
    }
  }

  /**
   * Search people across name, NIK, or passport number from D1.
   */
  static async searchPeople(
    queryStr: string,
    limitCount = 15,
    nationalityType?: 'WNI' | 'WNA'
  ): Promise<Person[]> {
    if (!queryStr || queryStr.trim().length === 0) return [];
    const trimmed = queryStr.trim();

    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({
        q: trimmed,
        limit: String(limitCount)
      });
      if (nationalityType) {
        params.append('nationalityType', nationalityType);
      }

      const res = await fetch(getApiUrl(`/api/v2/people/search?${params.toString()}`), {
        headers
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      const json = await res.json();
      return json.success && Array.isArray(json.people) ? (json.people as Person[]) : [];
    } catch (err) {
      console.error('[PersonService] searchPeople error:', err);
      return [];
    }
  }

  /**
   * Unified shareholder search:
   * 1. Checks centralized Cloudflare D1 via /api/v2/people first (Single Source of Truth).
   * 2. If not found in D1, falls back to scanning Firestore client collections.
   */
  static async searchShareholderByNik(nik: string): Promise<any | null> {
    if (!nik || nik.trim().length !== 16) return null;
    const cleanNik = normalizeNik(nik);

    // 1. Check centralized People Database in D1
    const person = await this.getPersonByNik(cleanNik);
    if (person) {
      return {
        personId: person.personId,
        nik: person.nik,
        name: person.name,
        salutation: person.salutation,
        birthCity: person.birthCity,
        birthDate: person.birthDate,
        nationalityType: person.nationalityType,
        nationality: person.nationality,
        occupation: person.occupation,
        address: person.address,
        passportNumber: person.passportNumber,
        hasKitas: person.hasKitas,
        kitasType: person.kitasType,
        kitasNumber: person.kitasNumber,
        npwp: person.npwp
      };
    }

    // 2. Fallback to legacy client scan
    const legacy = await searchShareholderByNIKClient(cleanNik);
    if (legacy) {
      return {
        ...legacy,
        nik: cleanNik
      };
    }

    return null;
  }

  /**
   * Comprehensive Migration & Ingestion Engine
   * Implements strict conservative rules (PILIHAN A), WNA passport support,
   * non-destructive backfill with _migrationMeta, and legal lock (isProjectFinal).
   */
  static async runPeopleMigration(
    isDryRun: boolean = true,
    addLog: (msg: string) => void = console.log
  ): Promise<PersonMigrationReport> {
    const batchId = `batch_${new Date().toISOString().replace(/[:.]/g, '-')}_${Math.random().toString(36).slice(2, 7)}`;
    addLog(`=== MEMULAI MIGRASI DATABASE ORANG (${isDryRun ? 'MODE DRY-RUN' : `EKSEKUSI BATCH ${batchId}`}) ===`);

    const report: PersonMigrationReport = {
      isDryRun,
      batchId,
      totalDocsScanned: 0,
      totalIndividualRecords: 0,
      uniqueValidNiks: 0,
      uniqueWnaPassports: 0,
      recordsLinked: 0,
      recordsWithoutNik: 0,
      recordsWithInvalidNik: 0,
      multiCompanyPeopleCount: 0,
      conflicts: [],
      migratedPeopleCount: 0,
      updatedCompaniesCount: 0,
      skippedFinalDocumentsCount: 0,
      errors: []
    };

    const collectionsToAudit = ['profiles', 'cv_profiles', 'projects', 'rupst_projects', 'pendirian_projects'];
    const candidatesByNik = new Map<string, Array<any>>();
    const candidatesByPassport = new Map<string, Array<any>>();
    const unlinkedRecords: Array<any> = [];

    // Step 1: Scan all collections
    for (const colName of collectionsToAudit) {
      try {
        addLog(`Memindai koleksi '${colName}'...`);
        const snap = await getDocs(collection(db, colName));
        report.totalDocsScanned += snap.size;
        addLog(`  -> ${snap.size} dokumen ditemukan di '${colName}'.`);

        for (const docSnap of snap.docs) {
          const d = docSnap.data();
          const docId = docSnap.id;
          const companyName = d.companyName || d.namaPt || d.namaCV || d.title || 'Unknown';
          const clientType = d.clientType || (colName === 'cv_profiles' ? 'CV' : 'PT');
          const isDocFinal = isProjectFinal(d);

          const listsToInspect = [
            { list: d.shareholders, type: 'shareholders' },
            { list: d.finalShareholders, type: 'finalShareholders' },
            { list: d.oldManagementItems, type: 'oldManagementItems' },
            { list: d.newManagementItems, type: 'newManagementItems' },
            { list: d.managementItems, type: 'managementItems' },
            { list: d.parties, type: 'parties' },
            { list: d.founders, type: 'founders' },
            { list: d.peseros, type: 'peseros' }
          ];

          if (d.manualRepresentative && d.manualRepresentative.name) {
            listsToInspect.push({ list: [d.manualRepresentative], type: 'manualRepresentative' });
          }

          for (const { list, type } of listsToInspect) {
            if (!Array.isArray(list)) continue;
            for (const item of list) {
              if (!item || (!item.name && !item.nik && !item.passportNumber)) continue;
              if (item.shareholderType === 'BADAN_HUKUM' || item.isBadanHukum) continue;

              report.totalIndividualRecords++;
              const rawNik = item.nik;
              const cleanNik = normalizeNik(rawNik);
              const isWna = item.nationalityType === 'WNA' || (item.nationality && item.nationality.toUpperCase() !== 'INDONESIA') || Boolean(item.passportNumber);
              const cleanPass = normalizePassport(item.passportNumber);

              if (isWna && cleanPass) {
                // WNA with Passport
                if (!candidatesByPassport.has(cleanPass)) {
                  candidatesByPassport.set(cleanPass, []);
                }
                candidatesByPassport.get(cleanPass)!.push({
                  sourceCol: colName,
                  sourceDocId: docId,
                  companyName,
                  clientType,
                  recordType: type,
                  rawItem: item,
                  isDocFinal
                });
              } else if (!rawNik || rawNik.trim() === '') {
                // Individual without NIK (Provisional candidate, keep separate, no auto-merge)
                report.recordsWithoutNik++;
                unlinkedRecords.push({
                  sourceCol: colName,
                  sourceDocId: docId,
                  companyName,
                  rawItem: item,
                  isDocFinal
                });
              } else if (!isValidNik(rawNik)) {
                // Invalid NIK
                report.recordsWithInvalidNik++;
                unlinkedRecords.push({
                  sourceCol: colName,
                  sourceDocId: docId,
                  companyName,
                  rawItem: item,
                  isDocFinal
                });
              } else {
                // WNI with valid 16-digit NIK
                if (!candidatesByNik.has(cleanNik)) {
                  candidatesByNik.set(cleanNik, []);
                }
                candidatesByNik.get(cleanNik)!.push({
                  sourceCol: colName,
                  sourceDocId: docId,
                  companyName,
                  clientType,
                  recordType: type,
                  rawItem: item,
                  isDocFinal
                });
              }
            }
          }
        }
      } catch (err: any) {
        const msg = `Gagal memindai koleksi ${colName}: ${err.message}`;
        addLog(`ERROR: ${msg}`);
        report.errors.push(msg);
      }
    }

    report.uniqueValidNiks = candidatesByNik.size;
    report.uniqueWnaPassports = candidatesByPassport.size;

    addLog(`\n[ANALISIS DATA SELESAI]`);
    addLog(`Total Dokumen Diperiksa: ${report.totalDocsScanned}`);
    addLog(`Total Record Individu Ditemukan: ${report.totalIndividualRecords}`);
    addLog(`Total NIK Unik Valid (WNI): ${report.uniqueValidNiks}`);
    addLog(`Total Paspor Unik (WNA): ${report.uniqueWnaPassports}`);
    addLog(`Record Tanpa NIK: ${report.recordsWithoutNik} (diberi identitas provisional terpisah, tanpa auto-merger)`);
    addLog(`Record dengan NIK Tidak Valid: ${report.recordsWithInvalidNik}`);

    // Step 2: Evaluate WNI Candidates with Conservative Matching (PILIHAN A)
    const masterPeopleToPersist: Array<{ person: Person; candidateRecords: any[] }> = [];

    for (const [nik, candidates] of candidatesByNik.entries()) {
      report.recordsLinked += candidates.length;

      const distinctCompanies = new Set(candidates.map(c => c.companyName));
      if (distinctCompanies.size > 1) {
        report.multiCompanyPeopleCount++;
      }

      // Check conflict across candidate records sharing the same NIK
      const rawNames = Array.from(new Set(candidates.map(c => (c.rawItem.name || '').trim()).filter(Boolean)));
      const birthDates = Array.from(new Set(candidates.map(c => (c.rawItem.birthDate || '').trim()).filter(Boolean)));
      const birthCities = Array.from(new Set(candidates.map(c => (c.rawItem.birthCity || c.rawItem.birthPlace || '').trim().toUpperCase()).filter(Boolean)));

      // Conservative name compatibility check
      let hasSpellingConflict = false;
      if (rawNames.length > 1) {
        for (let i = 0; i < rawNames.length; i++) {
          for (let j = i + 1; j < rawNames.length; j++) {
            const comp = evaluateNameCompatibility(rawNames[i], rawNames[j]);
            if (comp.spellingMismatch) {
              hasSpellingConflict = true;
            }
          }
        }
      }

      if (hasSpellingConflict || birthDates.length > 1) {
        report.conflicts.push({
          nik,
          conflictType: hasSpellingConflict ? 'NAME_SPELLING_VARIATION' : 'NIK_BIRTHDATE_MISMATCH',
          names: rawNames,
          birthDates,
          birthCities,
          sources: candidates.map(c => ({ collection: c.sourceCol, docId: c.sourceDocId, companyName: c.companyName }))
        });
      }

      // Merge candidates intelligently by picking most complete item
      let bestItem = candidates[0].rawItem;
      let highestScore = -1;

      for (const cand of candidates) {
        const itm = cand.rawItem;
        let score = 0;
        if (itm.name) score += 2;
        if (itm.birthDate) score += 3;
        if (itm.birthCity || itm.birthPlace) score += 2;
        if (itm.occupation) score += 2;
        if (itm.address?.fullAddress || typeof itm.address === 'string') score += 4;
        if (itm.address?.city) score += 2;
        if (itm.address?.province) score += 2;
        if (itm.npwp) score += 1;
        if (itm.passportNumber) score += 1;

        if (score > highestScore) {
          highestScore = score;
          bestItem = itm;
        }
      }

      const existingPersonId = candidates.find(c => c.rawItem.personId)?.rawItem.personId || crypto.randomUUID();
      const mergedAddress = normalizePersonAddress(bestItem.address);

      const companyRefs: Person['companyReferences'] = [];
      for (const cand of candidates) {
        const role = cand.rawItem.position || cand.rawItem.managementPosition || cand.rawItem.role || (cand.recordType.includes('shareholder') ? 'PEMEGANG_SAHAM' : 'PENGURUS');
        if (!companyRefs.some(cr => cr.companyId === cand.sourceDocId && cr.role === role)) {
          companyRefs.push({
            companyId: cand.sourceDocId,
            companyName: cand.companyName,
            clientType: cand.clientType,
            role,
            sharesOwned: cand.rawItem.sharesOwned || undefined
          });
        }
      }

      const masterPerson: Person = {
        personId: existingPersonId,
        nik,
        identityStatus: 'PROVISIONAL',
        salutation: bestItem.salutation || 'Tuan',
        sapaan: bestItem.salutation || 'Tuan',
        name: (bestItem.name || '').trim().toUpperCase(),
        birthCity: (bestItem.birthCity || bestItem.birthPlace || '').trim().toUpperCase(),
        birthPlace: (bestItem.birthCity || bestItem.birthPlace || '').trim().toUpperCase(),
        birthDate: bestItem.birthDate || '',
        nationalityType: 'WNI',
        nationality: 'INDONESIA',
        occupation: (bestItem.occupation || '').trim().toUpperCase(),
        address: mergedAddress,
        rt: mergedAddress.rt,
        rw: mergedAddress.rw,
        province: mergedAddress.province,
        regency: mergedAddress.city,
        district: mergedAddress.kecamatan,
        village: mergedAddress.kelurahan,
        npwp: bestItem.npwp || '',
        passportNumber: bestItem.passportNumber || '',
        hasKitas: false,
        kitasType: 'NONE',
        kitasNumber: '',
        phoneNumber: bestItem.phoneNumber || mergedAddress.phoneNumber || '',
        email: bestItem.email || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        companyReferences: companyRefs
      };

      masterPeopleToPersist.push({ person: masterPerson, candidateRecords: candidates });
    }

    // Step 3: Evaluate WNA Candidates with Passport
    for (const [passport, candidates] of candidatesByPassport.entries()) {
      report.recordsLinked += candidates.length;

      let bestItem = candidates[0].rawItem;
      const existingPersonId = candidates.find(c => c.rawItem.personId)?.rawItem.personId || crypto.randomUUID();
      const mergedAddress = normalizePersonAddress(bestItem.address);

      const companyRefs: Person['companyReferences'] = [];
      for (const cand of candidates) {
        const role = cand.rawItem.position || cand.rawItem.managementPosition || cand.rawItem.role || 'PENGURUS';
        if (!companyRefs.some(cr => cr.companyId === cand.sourceDocId && cr.role === role)) {
          companyRefs.push({
            companyId: cand.sourceDocId,
            companyName: cand.companyName,
            clientType: cand.clientType,
            role
          });
        }
      }

      const masterPerson: Person = {
        personId: existingPersonId,
        nik: null,
        identityStatus: 'PROVISIONAL',
        salutation: bestItem.salutation || 'Tuan',
        name: (bestItem.name || '').trim().toUpperCase(),
        birthCity: (bestItem.birthCity || bestItem.birthPlace || '').trim().toUpperCase(),
        birthDate: bestItem.birthDate || '',
        nationalityType: 'WNA',
        nationality: bestItem.nationality || 'WNA',
        occupation: (bestItem.occupation || '').trim().toUpperCase(),
        address: mergedAddress,
        passportNumber: passport,
        hasKitas: Boolean(bestItem.hasKitas),
        kitasType: bestItem.kitasType || 'NONE',
        kitasNumber: bestItem.kitasNumber || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        companyReferences: companyRefs
      };

      masterPeopleToPersist.push({ person: masterPerson, candidateRecords: candidates });
    }

    addLog(`Individu Terhubung Lintas Perusahaan: ${report.multiCompanyPeopleCount}`);
    addLog(`Konflik Identitas & Variasi Ejaan Ditemukan: ${report.conflicts.length}`);

    // Step 4: Write to Cloudflare D1 and perform non-destructive backfill
    if (!isDryRun) {
      addLog(`\n[MEMULAI PENULISAN CLOUDFLARE D1 & BACKFILL TERKONTROL]`);
      let savedCount = 0;
      const docUpdatesMap = new Map<string, { colName: string; docId: string; candidates: any[] }>();

      for (const item of masterPeopleToPersist) {
        try {
          await this.savePerson(item.person);
          savedCount++;

          for (const cand of item.candidateRecords) {
            // Check if document is final / sealed
            if (cand.isDocFinal) {
              report.skippedFinalDocumentsCount++;
              continue; // STRICT LEGAL LOCK: Do not backfill sealed deeds
            }

            const docKey = `${cand.sourceCol}:${cand.sourceDocId}`;
            if (!docUpdatesMap.has(docKey)) {
              docUpdatesMap.set(docKey, {
                colName: cand.sourceCol,
                docId: cand.sourceDocId,
                candidates: []
              });
            }
            docUpdatesMap.get(docKey)!.candidates.push({
              item: cand.rawItem,
              personId: item.person.personId
            });
          }
        } catch (err: any) {
          addLog(`Error saat menyimpan master person: ${err.message}`);
          report.errors.push(`Person ${item.person.personId}: ${err.message}`);
        }
      }

      report.migratedPeopleCount = savedCount;
      addLog(`Berhasil menyimpan ${savedCount} record ke Cloudflare D1 via API Gateway.`);

      // Controlled Non-Destructive Backfill
      addLog(`Melakukan backfill personId ke dokumen Firestore non-final...`);
      let updatedDocsCount = 0;

      for (const [docKey, entry] of docUpdatesMap.entries()) {
        try {
          const docRef = doc(db, entry.colName, entry.docId);
          const snap = await getDoc(docRef);
          if (!snap.exists()) continue;

          const docData = snap.data();
          if (isProjectFinal(docData)) {
            report.skippedFinalDocumentsCount++;
            continue; // Sealed deed protection
          }

          let modified = false;
          const modifiedItemIds: string[] = [];
          const updatedDocPayload: Record<string, any> = {};

          const arrayFields = [
            'shareholders',
            'finalShareholders',
            'oldManagementItems',
            'newManagementItems',
            'managementItems',
            'parties',
            'founders',
            'peseros'
          ];

          for (const field of arrayFields) {
            const arr = docData[field];
            if (Array.isArray(arr)) {
              const updatedArr = arr.map((rec: any) => {
                if (!rec) return rec;
                const recNik = normalizeNik(rec.nik);
                const recPass = normalizePassport(rec.passportNumber);

                // Match with master person
                const match = masterPeopleToPersist.find(p => 
                  (recNik && isValidNik(recNik) && p.person.nik === recNik) ||
                  (recPass && p.person.passportNumber === recPass)
                );

                if (match && rec.personId !== match.person.personId) {
                  modified = true;
                  const itemId = rec.id || rec.personId || `${field}_${Math.random().toString(36).slice(2, 6)}`;
                  modifiedItemIds.push(itemId);
                  return {
                    ...rec,
                    personId: match.person.personId
                  };
                }
                return rec;
              });

              if (modified) {
                updatedDocPayload[field] = updatedArr;
              }
            }
          }

          if (modified) {
            // NON-DESTRUCTIVE: Do NOT touch root updatedAt!
            // Only set array elements and isolate metadata in _migrationMeta
            await runTransaction(db, async (transaction) => {
              transaction.update(docRef, sanitizeForFirestore({
                ...updatedDocPayload,
                _migrationMeta: {
                  batchId,
                  appliedAt: new Date().toISOString(),
                  modifiedItemIds
                }
              }));
            });
            updatedDocsCount++;
          }
        } catch (err: any) {
          addLog(`Gagal backfill dokumen ${docKey}: ${err.message}`);
          report.errors.push(`Backfill ${docKey}: ${err.message}`);
        }
      }

      report.updatedCompaniesCount = updatedDocsCount;
      addLog(`Berhasil backfill personId pada ${updatedDocsCount} dokumen aktif.`);
      addLog(`Dokumen final/selesai yang dilindungi (Legal Lock): ${report.skippedFinalDocumentsCount}`);
    } else {
      addLog(`\n[DRY-RUN BERHASIL DITINJAU] Tidak ada data yang diubah di D1 maupun Firestore.`);
      addLog(`Rencana eksekusi batch ${batchId}:`);
      addLog(`- Master Person WNI (D1): ${candidatesByNik.size}`);
      addLog(`- Master Person WNA (D1): ${candidatesByPassport.size}`);
      addLog(`- Total Relasi yang akan Dihubungkan: ${report.recordsLinked}`);
      addLog(`- Record Mandiri Tanpa NIK: ${report.recordsWithoutNik}`);
      addLog(`- Dokumen Final Terlindungi dari Backfill: ${report.skippedFinalDocumentsCount}`);
    }

    addLog(`=== SELESAI ===`);
    return report;
  }
}

export default PersonService;
