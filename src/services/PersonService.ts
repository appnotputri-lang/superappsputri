import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  runTransaction, 
  writeBatch 
} from 'firebase/firestore';
import { db, searchShareholderByNIKClient } from '../lib/firebase';
import { Person, Address, Shareholder, ManagementItem, Pesero, CompanyProfile } from '../../types';
import { sanitizeForFirestore } from '../utils/sanitize';

export const PEOPLE_COLLECTION = 'people';
export const PEOPLE_NIK_KEYS_COLLECTION = 'people_nik_keys';

export interface MigrationConflict {
  nik: string;
  names: string[];
  birthDates: string[];
  birthCities: string[];
  sources: Array<{ collection: string; docId: string; companyName: string }>;
}

export interface PersonMigrationReport {
  isDryRun: boolean;
  totalDocsScanned: number;
  totalIndividualRecords: number;
  uniqueValidNiks: number;
  recordsLinked: number;
  recordsWithoutNik: number;
  recordsWithInvalidNik: number;
  multiCompanyPeopleCount: number;
  conflicts: MigrationConflict[];
  migratedPeopleCount: number;
  updatedCompaniesCount: number;
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
    postalCode: addr.postalCode || '',
    phoneNumber: addr.phoneNumber || addr.phone || ''
  };
}

export class PersonService {
  /**
   * Retrieves a person by their permanent personId.
   */
  static async getPersonById(personId: string): Promise<Person | null> {
    if (!personId) return null;
    try {
      const docRef = doc(db, PEOPLE_COLLECTION, personId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return snap.data() as Person;
    } catch (err) {
      console.error(`[PersonService] Failed to get person by id ${personId}:`, err);
      return null;
    }
  }

  /**
   * Retrieves a person by their 16-digit NIK.
   * Utilizes the atomic reservation key index `people_nik_keys` for fast, accurate lookup.
   */
  static async getPersonByNik(nik: string): Promise<Person | null> {
    const cleanNik = normalizeNik(nik);
    if (!cleanNik || cleanNik.length !== 16) return null;

    try {
      // 1. Try atomic key index first
      const keyRef = doc(db, PEOPLE_NIK_KEYS_COLLECTION, cleanNik);
      const keySnap = await getDoc(keyRef);
      if (keySnap.exists()) {
        const keyData = keySnap.data();
        if (keyData.personId) {
          const person = await this.getPersonById(keyData.personId);
          if (person) return person;
        }
      }

      // 2. Fallback query on people collection where nik == cleanNik
      const q = query(collection(db, PEOPLE_COLLECTION), where('nik', '==', cleanNik), limit(1));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        return qSnap.docs[0].data() as Person;
      }
    } catch (err) {
      console.error(`[PersonService] Failed to lookup person by NIK ${cleanNik}:`, err);
    }

    return null;
  }

  /**
   * Creates or updates a Person record in the master `people` collection.
   * Enforces atomic uniqueness for NIK using the `people_nik_keys` reservation document.
   */
  static async savePerson(personData: Partial<Person>): Promise<{ person: Person; isNew: boolean }> {
    const rawNik = personData.nik;
    const cleanNik = normalizeNik(rawNik);

    if (rawNik && !isValidNik(rawNik)) {
      throw new Error(`Format NIK tidak valid: "${rawNik}". NIK harus terdiri dari 16 digit angka.`);
    }

    const personId = personData.personId || crypto.randomUUID();
    let isNew = false;
    let savedPerson: Person;

    const personDocRef = doc(db, PEOPLE_COLLECTION, personId);

    await runTransaction(db, async (transaction) => {
      const existingPersonSnap = await transaction.get(personDocRef);
      const oldPersonData = existingPersonSnap.exists() ? (existingPersonSnap.data() as Person) : null;
      isNew = !existingPersonSnap.exists();

      const oldNik = oldPersonData?.nik ? normalizeNik(oldPersonData.nik) : '';

      // Atomic NIK Uniqueness Reservation
      if (cleanNik) {
        const keyDocRef = doc(db, PEOPLE_NIK_KEYS_COLLECTION, cleanNik);
        const keyDocSnap = await transaction.get(keyDocRef);

        if (keyDocSnap.exists()) {
          const keyData = keyDocSnap.data();
          if (keyData.personId && keyData.personId !== personId) {
            throw new Error(`NIK_EXISTS: NIK ${cleanNik} sudah terdaftar untuk individu lain (ID: ${keyData.personId})`);
          }
        }

        // Claim the NIK key atomically
        transaction.set(keyDocRef, {
          personId,
          nik: cleanNik,
          updatedAt: new Date().toISOString(),
          createdAt: keyDocSnap.exists() ? keyDocSnap.data().createdAt : new Date().toISOString()
        });

        // If NIK changed, release the old NIK key
        if (oldNik && oldNik !== cleanNik) {
          const oldKeyDocRef = doc(db, PEOPLE_NIK_KEYS_COLLECTION, oldNik);
          transaction.delete(oldKeyDocRef);
        }
      }

      // Merge and sanitize data
      const normAddr = normalizePersonAddress(personData.address || oldPersonData?.address);
      const now = new Date().toISOString();

      const prepared: Person = {
        personId,
        nik: cleanNik || oldPersonData?.nik || '',
        salutation: personData.salutation || personData.sapaan || oldPersonData?.salutation || 'Tuan',
        sapaan: personData.salutation || personData.sapaan || oldPersonData?.salutation || 'Tuan',
        name: (personData.name || oldPersonData?.name || '').trim().toUpperCase(),
        birthCity: (personData.birthCity || personData.birthPlace || oldPersonData?.birthCity || '').trim().toUpperCase(),
        birthPlace: (personData.birthCity || personData.birthPlace || oldPersonData?.birthCity || '').trim().toUpperCase(),
        birthDate: personData.birthDate || oldPersonData?.birthDate || '',
        nationalityType: personData.nationalityType || oldPersonData?.nationalityType || 'WNI',
        nationality: personData.nationality || oldPersonData?.nationality || 'WNI',
        occupation: (personData.occupation || oldPersonData?.occupation || '').trim().toUpperCase(),
        address: normAddr,
        rt: normAddr.rt,
        rw: normAddr.rw,
        province: normAddr.province,
        regency: normAddr.city,
        district: normAddr.kecamatan,
        village: normAddr.kelurahan,
        npwp: personData.npwp || oldPersonData?.npwp || '',
        passportNumber: personData.passportNumber || oldPersonData?.passportNumber || '',
        hasKitas: personData.hasKitas ?? oldPersonData?.hasKitas ?? false,
        kitasType: personData.kitasType || oldPersonData?.kitasType || 'NONE',
        kitasNumber: personData.kitasNumber || oldPersonData?.kitasNumber || '',
        phoneNumber: personData.phoneNumber || normAddr.phoneNumber || oldPersonData?.phoneNumber || '',
        email: personData.email || oldPersonData?.email || '',
        createdAt: oldPersonData?.createdAt || now,
        updatedAt: now,
        companyReferences: personData.companyReferences || oldPersonData?.companyReferences || []
      };

      transaction.set(personDocRef, sanitizeForFirestore(prepared), { merge: true });
      savedPerson = prepared;
    });

    return { person: savedPerson!, isNew };
  }

  /**
   * Links a person to a company record without duplicating company entries.
   */
  static async linkPersonToCompany(
    personId: string, 
    companyRef: { companyId: string; companyName: string; clientType: string; role: string; sharesOwned?: number }
  ): Promise<void> {
    if (!personId || !companyRef.companyId) return;

    try {
      const person = await this.getPersonById(personId);
      if (!person) return;

      const existingRefs = person.companyReferences || [];
      const matchIndex = existingRefs.findIndex(r => r.companyId === companyRef.companyId && r.role === companyRef.role);

      let updatedRefs: typeof existingRefs;
      if (matchIndex >= 0) {
        updatedRefs = existingRefs.map((r, i) => i === matchIndex ? { ...r, ...companyRef } : r);
      } else {
        updatedRefs = [...existingRefs, companyRef];
      }

      const docRef = doc(db, PEOPLE_COLLECTION, personId);
      await runTransaction(db, async (transaction) => {
        transaction.update(docRef, {
          companyReferences: sanitizeForFirestore(updatedRefs),
          updatedAt: new Date().toISOString()
        });
      });
    } catch (err) {
      console.warn(`[PersonService] Failed to link person ${personId} to company:`, err);
    }
  }

  /**
   * Search for people by name or NIK query.
   */
  static async searchPeople(queryStr: string, limitCount = 15): Promise<Person[]> {
    if (!queryStr || queryStr.trim().length === 0) return [];
    const trimmed = queryStr.trim();
    const cleanNik = normalizeNik(trimmed);

    // If query is an exact 16-digit NIK, fetch directly
    if (cleanNik.length === 16) {
      const p = await this.getPersonByNik(cleanNik);
      return p ? [p] : [];
    }

    try {
      // General name search on people collection
      const q = query(
        collection(db, PEOPLE_COLLECTION),
        limit(100)
      );
      const snap = await getDocs(q);
      const qUpper = trimmed.toUpperCase();

      const matches = snap.docs
        .map(d => d.data() as Person)
        .filter(p => {
          const nameMatch = (p.name || '').toUpperCase().includes(qUpper);
          const nikMatch = (p.nik || '').includes(trimmed);
          return nameMatch || nikMatch;
        })
        .slice(0, limitCount);

      return matches;
    } catch (err) {
      console.error('[PersonService] searchPeople error:', err);
      return [];
    }
  }

  /**
   * Unified search: queries the centralized `people` database first.
   * If not found, falls back seamlessly to scanning legacy client collections,
   * guaranteeing 100% backward compatibility.
   */
  static async searchShareholderByNik(nik: string): Promise<any | null> {
    if (!nik || nik.trim().length !== 16) return null;
    const cleanNik = normalizeNik(nik);

    // 1. Check centralized People Database
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
   * Comprehensive Migration Engine:
   * Migrates all individual identities from PT, CV, Yayasan, and related projects
   * into the centralized `people` collection.
   *
   * Features:
   * - Dry-run mode for safety
   * - Intelligent candidate merging (preserves the most complete fields)
   * - Conflict detection (identifies divergent identities sharing the same NIK)
   * - Preserves local IDs, shares, and roles
   * - Backfills `personId` into company records idempotently
   */
  static async runPeopleMigration(
    isDryRun: boolean = true,
    addLog: (msg: string) => void = console.log
  ): Promise<PersonMigrationReport> {
    addLog(`=== MEMULAI MIGRASI DATABASE ORANG (${isDryRun ? 'MODE DRY-RUN' : 'MODE EKSEKUSI'}) ===`);

    const report: PersonMigrationReport = {
      isDryRun,
      totalDocsScanned: 0,
      totalIndividualRecords: 0,
      uniqueValidNiks: 0,
      recordsLinked: 0,
      recordsWithoutNik: 0,
      recordsWithInvalidNik: 0,
      multiCompanyPeopleCount: 0,
      conflicts: [],
      migratedPeopleCount: 0,
      updatedCompaniesCount: 0,
      errors: []
    };

    const collectionsToAudit = ['profiles', 'cv_profiles', 'projects', 'rupst_projects', 'pendirian_projects'];
    const candidatesByNik = new Map<string, Array<{
      sourceCol: string;
      sourceDocId: string;
      companyName: string;
      clientType: string;
      recordType: string;
      rawItem: any;
    }>>();

    const unlinkedRecords: Array<{ sourceCol: string; sourceDocId: string; companyName: string; rawItem: any }> = [];

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
              if (!item || (!item.name && !item.nik)) continue;
              if (item.shareholderType === 'BADAN_HUKUM' || item.isBadanHukum) continue;

              report.totalIndividualRecords++;
              const rawNik = item.nik;
              const cleanNik = normalizeNik(rawNik);

              if (!rawNik || rawNik.trim() === '') {
                report.recordsWithoutNik++;
                unlinkedRecords.push({ sourceCol: colName, sourceDocId: docId, companyName, rawItem: item });
              } else if (!isValidNik(rawNik)) {
                report.recordsWithInvalidNik++;
                unlinkedRecords.push({ sourceCol: colName, sourceDocId: docId, companyName, rawItem: item });
              } else {
                if (!candidatesByNik.has(cleanNik)) {
                  candidatesByNik.set(cleanNik, []);
                }
                candidatesByNik.get(cleanNik)!.push({
                  sourceCol: colName,
                  sourceDocId: docId,
                  companyName,
                  clientType,
                  recordType: type,
                  rawItem: item
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
    addLog(`\n[ANALISIS DATA SELESAI]`);
    addLog(`Total Dokumen Diperiksa: ${report.totalDocsScanned}`);
    addLog(`Total Record Individu Ditemukan: ${report.totalIndividualRecords}`);
    addLog(`Total NIK Unik Valid: ${report.uniqueValidNiks}`);
    addLog(`Record Tanpa NIK: ${report.recordsWithoutNik} (dipertahankan mandiri, tidak digabung)`);
    addLog(`Record dengan NIK Tidak Valid (< 16 digit): ${report.recordsWithInvalidNik}`);

    // Step 2: Merge candidates per NIK and check conflicts
    const masterPeopleToPersist: Array<{ person: Person; candidateRecords: any[] }> = [];

    for (const [nik, candidates] of candidatesByNik.entries()) {
      report.recordsLinked += candidates.length;

      const distinctCompanies = new Set(candidates.map(c => c.companyName));
      if (distinctCompanies.size > 1) {
        report.multiCompanyPeopleCount++;
      }

      // Check conflict
      const names = Array.from(new Set(candidates.map(c => (c.rawItem.name || '').trim().toUpperCase()).filter(Boolean)));
      const birthDates = Array.from(new Set(candidates.map(c => (c.rawItem.birthDate || '').trim()).filter(Boolean)));
      const birthCities = Array.from(new Set(candidates.map(c => (c.rawItem.birthCity || c.rawItem.birthPlace || '').trim().toUpperCase()).filter(Boolean)));

      if (names.length > 1 || birthDates.length > 1) {
        report.conflicts.push({
          nik,
          names,
          birthDates,
          birthCities,
          sources: candidates.map(c => ({ collection: c.sourceCol, docId: c.sourceDocId, companyName: c.companyName }))
        });
      }

      // Merge candidates intelligently: pick the one with most complete information
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

      // Derive or preserve existing personId
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
        salutation: bestItem.salutation || 'Tuan',
        sapaan: bestItem.salutation || 'Tuan',
        name: (bestItem.name || '').trim().toUpperCase(),
        birthCity: (bestItem.birthCity || bestItem.birthPlace || '').trim().toUpperCase(),
        birthPlace: (bestItem.birthCity || bestItem.birthPlace || '').trim().toUpperCase(),
        birthDate: bestItem.birthDate || '',
        nationalityType: bestItem.nationalityType || 'WNI',
        nationality: bestItem.nationality || 'WNI',
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
        hasKitas: bestItem.hasKitas || false,
        kitasType: bestItem.kitasType || 'NONE',
        kitasNumber: bestItem.kitasNumber || '',
        phoneNumber: bestItem.phoneNumber || mergedAddress.phoneNumber || '',
        email: bestItem.email || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        companyReferences: companyRefs
      };

      masterPeopleToPersist.push({ person: masterPerson, candidateRecords: candidates });
    }

    addLog(`Individu Terhubung Lintas Perusahaan: ${report.multiCompanyPeopleCount}`);
    addLog(`Konflik Data Identitas Ditemukan: ${report.conflicts.length}`);

    if (report.conflicts.length > 0) {
      addLog(`⚠️ Daftar NIK dengan Konflik (diselesaikan dengan aturan resolusi aman):`);
      report.conflicts.slice(0, 5).forEach((c, idx) => {
        addLog(`   ${idx + 1}. NIK: ${c.nik} | Nama: [${c.names.join(' vs ')}] | Perusahaan: [${c.sources.map(s => s.companyName).join(', ')}]`);
      });
      if (report.conflicts.length > 5) {
        addLog(`   ...dan ${report.conflicts.length - 5} konflik lainnya tercatat di laporan.`);
      }
    }

    // Step 3: Write to Database if not Dry Run
    if (!isDryRun) {
      addLog(`\n[MEMULAI PENULISAN DATABASE MASTER ORANG]`);
      let savedCount = 0;

      // Map of (colName + ':' + docId) -> updates to apply
      const docUpdatesMap = new Map<string, { colName: string; docId: string; updates: Record<string, any> }>();

      for (const item of masterPeopleToPersist) {
        try {
          await this.savePerson(item.person);
          savedCount++;

          // Prepare backfill of personId to source documents
          for (const cand of item.candidateRecords) {
            const docKey = `${cand.sourceCol}:${cand.sourceDocId}`;
            if (!docUpdatesMap.has(docKey)) {
              docUpdatesMap.set(docKey, {
                colName: cand.sourceCol,
                docId: cand.sourceDocId,
                updates: {}
              });
            }
          }
        } catch (err: any) {
          addLog(`Error saat menyimpan master person NIK ${item.person.nik}: ${err.message}`);
          report.errors.push(`Person NIK ${item.person.nik}: ${err.message}`);
        }
      }

      report.migratedPeopleCount = savedCount;
      addLog(`Berhasil menyimpan ${savedCount} data individu ke koleksi 'people' & indeks unik 'people_nik_keys'.`);

      // Backfill personId into company profiles
      addLog(`Melakukan backfill relasi personId ke dokumen perusahaan...`);
      let updatedDocsCount = 0;

      for (const [docKey, entry] of docUpdatesMap.entries()) {
        try {
          const docRef = doc(db, entry.colName, entry.docId);
          const snap = await getDoc(docRef);
          if (!snap.exists()) continue;

          const docData = snap.data();
          let modified = false;

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

          const updatedDocPayload: Record<string, any> = {};

          for (const field of arrayFields) {
            const arr = docData[field];
            if (Array.isArray(arr)) {
              const updatedArr = arr.map((rec: any) => {
                if (!rec) return rec;
                const recNik = normalizeNik(rec.nik);
                if (recNik && isValidNik(recNik)) {
                  const master = masterPeopleToPersist.find(p => p.person.nik === recNik);
                  if (master && rec.personId !== master.person.personId) {
                    modified = true;
                    return { ...rec, personId: master.person.personId };
                  }
                }
                return rec;
              });

              if (modified) {
                updatedDocPayload[field] = updatedArr;
              }
            }
          }

          if (modified) {
            await runTransaction(db, async (transaction) => {
              transaction.update(docRef, sanitizeForFirestore({
                ...updatedDocPayload,
                updatedAt: new Date().toISOString()
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
      addLog(`Berhasil memperbarui relasi personId pada ${updatedDocsCount} dokumen profil/proyek.`);
    } else {
      addLog(`\n[DRY-RUN BERHASIL] Tidak ada data yang diubah di database.`);
      addLog(`Rencana eksekusi:`);
      addLog(`- Akan membuat/memperbarui: ${masterPeopleToPersist.length} record di koleksi 'people'`);
      addLog(`- Akan mendaftarkan: ${masterPeopleToPersist.length} NIK di 'people_nik_keys'`);
      addLog(`- Akan menghubungkan: ${report.recordsLinked} peran pemegang saham/pengurus/pesero`);
      addLog(`- Menjaga terpisah: ${report.recordsWithoutNik} record tanpa NIK`);
    }

    addLog(`=== SELESAI ===`);
    return report;
  }
}

export default PersonService;
