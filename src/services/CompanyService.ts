import { db } from '../lib/firebase';
import { getApiUrl } from '../lib/api';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  getDocsFromCache,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  QueryConstraint,
  writeBatch,
  getCountFromServer,
  runTransaction
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { CompanyProfile } from '../../types';
import { sanitizeForFirestore, normalizeCompanyName, getUniqueClientKey } from '../utils/sanitize';
import { FirestoreTracker } from '../lib/firestoreTracker';

export interface ClientDirectoryEntry {
  id: string;
  clientId: string;
  companyName: string;
  searchName: string;
  searchTokens?: string[];
  clientType: string;
  companyType?: string;
  domicile?: string;
  establishmentDeedDate?: string;
  establishmentYear?: string;
  updatedAt?: string;
  isArchived?: boolean;
  npwp?: string;
  kbliItems?: { code: string; name?: string }[];
}

export interface ClientDirectoryPageOptions {
  clientType?: string;
  showArchived?: boolean;
  searchQuery?: string;
  establishmentYear?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  lastDoc?: any;
  page?: number;
}

export interface ClientDirectoryPageResult {
  items: ClientDirectoryEntry[];
  lastDoc: any;
  hasMore: boolean;
  fromCache: boolean;
}

export class CompanyService {
  /**
   * Migrate legacy cv_profiles to unified profiles collection
   */
  static async migrateLegacyCvProfiles(): Promise<void> {
    try {
      // 1. Migrate CV profiles from legacy 'cv_profiles' collection
      const cvSnap = await getDocs(collection(db, 'cv_profiles'));
      for (const docSnap of cvSnap.docs) {
        const data = docSnap.data();
        const id = docSnap.id;
        
        console.log(`Migrating CV profile ${id} (${data.companyName}) to unified profiles...`);
        
        // Save to 'profiles' collection with clientType: 'CV' and companyType: 'CV'
        await setDoc(doc(db, 'profiles', id), {
          ...data,
          clientType: 'CV',
          companyType: 'CV'
        }, { merge: true });
        
        // Delete from legacy 'cv_profiles' collection
        await deleteDoc(doc(db, 'cv_profiles', id));
      }

      // Load all profiles to perform checks and fixes
      const profilesSnap = await getDocs(collection(db, 'profiles'));
      
      // 2. Add clientType: 'PT' to any existing profiles that don't have it and are NOT CVs
      for (const docSnap of profilesSnap.docs) {
        const data = docSnap.data();
        if (!data.clientType) {
          const isCv = data.companyType === 'CV';
          const defaultClientType = isCv ? 'CV' : 'PT';
          console.log(`Setting default clientType: ${defaultClientType} for profile ${docSnap.id} (${data.companyName})`);
          await updateDoc(doc(db, 'profiles', docSnap.id), {
            clientType: defaultClientType
          });
        }
      }

      // 3. Auto-fix any mismatched CV fields: clientType CV and companyType CV must always match
      for (const docSnap of profilesSnap.docs) {
        const data = docSnap.data();
        const isCvByClientType = data.clientType === 'CV';
        const isCvByCompanyType = data.companyType === 'CV';
        
        if (isCvByClientType && data.companyType !== 'CV') {
          console.log(`Auto-fixing mismatched companyType -> CV for profile ${docSnap.id} (${data.companyName})`);
          await updateDoc(doc(db, 'profiles', docSnap.id), {
            companyType: 'CV'
          });
        } else if (isCvByCompanyType && data.clientType !== 'CV') {
          console.log(`Auto-fixing mismatched clientType -> CV for profile ${docSnap.id} (${data.companyName})`);
          await updateDoc(doc(db, 'profiles', docSnap.id), {
            clientType: 'CV'
          });
        }
      }
    } catch (error) {
      console.warn("[CompanyService] Error migrating cv_profiles:", error);
    }
  }

  private static profilesCache: CompanyProfile[] | null = null;
  private static directoryCache: ClientDirectoryEntry[] | null = null;
  private static pageCache = new Map<string, ClientDirectoryPageResult>();
  private static profileDocsCache = new Map<string, CompanyProfile>();
  private static activeClientsCountCache: number | null = null;

  /**
   * Resets in-memory profiles, directory, and page cache on mutation.
   */
  static clearCache(): void {
    CompanyService.profilesCache = null;
    CompanyService.directoryCache = null;
    CompanyService.pageCache.clear();
    CompanyService.profileDocsCache.clear();
    CompanyService.activeClientsCountCache = null;
  }

  /**
   * Generates search tokens for word-level substring matching in Firestore.
   */
  static generateSearchTokens(name: string): string[] {
    if (!name) return [];
    // Lowercase, remove punctuation and split by whitespace
    const cleanName = name.toLowerCase().replace(/[.,\-/\(\)]/g, ' ');
    const words = cleanName.split(/\s+/).filter(Boolean);
    const tokens = new Set<string>();

    for (const word of words) {
      // Add exact word
      tokens.add(word);
      // Add word prefixes for partial typing support
      for (let i = 1; i <= word.length; i++) {
        tokens.add(word.substring(0, i));
      }
    }
    return Array.from(tokens).filter(Boolean);
  }

  /**
   * Retrieves active clients count using Firestore aggregation count on client_directory.
   */
  static async getActiveClientsCount(): Promise<number> {
    if (CompanyService.activeClientsCountCache !== null) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Dashboard]');
        console.log(`activeClients: ${CompanyService.activeClientsCountCache}`);
        console.log('source: client_directory');
        console.log('query: isArchived == false');
        console.log('aggregation: count');
        console.log('cache HIT: YES');
        console.log('network: NO');
        console.log('writes: 0');
      }
      return CompanyService.activeClientsCountCache;
    }

    try {
      const colRef = collection(db, 'client_directory');
      const q = query(colRef, where('isArchived', '==', false));
      const snapshot = await getCountFromServer(q);
      const count = snapshot.data().count;
      CompanyService.activeClientsCountCache = count;

      if (process.env.NODE_ENV !== 'production') {
        console.log('[Dashboard]');
        console.log(`activeClients: ${count}`);
        console.log('source: client_directory');
        console.log('query: isArchived == false');
        console.log('aggregation: count');
        console.log('cache HIT: NO');
        console.log('network: YES');
        console.log('writes: 0');
      }
      return count;
    } catch (error) {
      console.error('[CompanyService] Error counting active clients:', error);
      throw error;
    }
  }

  /**
   * Sync single lightweight directory document to client_directory/{clientId}
   */
  static async syncClientDirectoryEntry(clientId: string, data?: Partial<CompanyProfile>): Promise<void> {
    try {
      // Fetch complete, master profile document to build the directory entry
      const docRef = doc(db, 'profiles', clientId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;

      const p = { id: snap.id, ...snap.data() } as CompanyProfile;

      const isCv = p.clientType === 'CV' || p.companyType === 'CV';
      const clientType = isCv ? 'CV' : (p.clientType || 'PT');
      const companyName = p.companyName ? this.formatCompanyName(p.companyName, clientType) : '';
      const searchName = companyName.toLowerCase().trim();
      const city = p.domicile || p.newAddress?.city || '';

      const establishmentYear = p.establishmentDeedDate
        ? new Date(p.establishmentDeedDate).getFullYear().toString()
        : ((p as any).establishmentYear || '');

      const entry: ClientDirectoryEntry = {
        id: clientId,
        clientId: clientId,
        companyName,
        searchName,
        searchTokens: CompanyService.generateSearchTokens(companyName),
        clientType,
        companyType: isCv ? 'CV' : (p.companyType || 'PT_LOKAL'),
        domicile: city,
        establishmentDeedDate: p.establishmentDeedDate || '',
        establishmentYear,
        updatedAt: p.updatedAt || new Date().toISOString(),
        isArchived: !!p.isArchived,
        npwp: p.npwp || '',
        kbliItems: (p.kbliItems || []).map((k: any) => ({
          code: k.code || k.kode || (typeof k === 'string' ? k : ''),
          name: k.name || k.judul || ''
        }))
      };

      await setDoc(doc(db, 'client_directory', clientId), sanitizeForFirestore(entry), { merge: true });
      CompanyService.clearCache();
    } catch (err) {
      console.warn('[CompanyService] Error syncing client_directory entry:', err);
    }
  }

  /**
   * Fetch a single full company profile from profiles/{clientId}
   */
  static async getCompanyProfile(clientId: string): Promise<CompanyProfile | null> {
    if (CompanyService.profileDocsCache.has(clientId)) {
      console.log(
        `[ClientProfile]\n` +
        `clientId: ${clientId}\n` +
        `cache: HIT\n` +
        `network: NO\n` +
        `reads: 0`
      );
      return CompanyService.profileDocsCache.get(clientId)!;
    }

    console.log(
      `[ClientProfile]\n` +
      `clientId: ${clientId}\n` +
      `cache: MISS\n` +
      `network: YES\n` +
      `reads: 1`
    );

    try {
      const ref = doc(db, 'profiles', clientId);
      const snap = await getDoc(ref);
      let profile: CompanyProfile | null = null;
      if (snap.exists()) {
        profile = { id: snap.id, ...snap.data() } as CompanyProfile;
      } else {
        const cpSnap = await getDoc(doc(db, 'company_profiles', clientId));
        if (cpSnap.exists()) {
          profile = { id: cpSnap.id, ...cpSnap.data() } as CompanyProfile;
        }
      }
      if (profile) {
        CompanyService.profileDocsCache.set(clientId, profile);
      }
      return profile;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `profiles/${clientId}`);
      return null;
    }
  }

  /**
   * Explicit migration tool runner for client_directory backfill
   */
  static async runClientDirectoryMigration(isDryRun: boolean = false, addLog?: (msg: string) => void): Promise<{
    existingProfilesCount: number;
    dirBeforeCount: number;
    dirAfterCount: number;
    syncedCount: number;
  }> {
    const log = (msg: string) => {
      console.log(`[ClientDirectory Migration] ${msg}`);
      if (addLog) addLog(msg);
    };

    log(`=== MIGRATION CLIENT DIRECTORY (${isDryRun ? 'DRY RUN' : 'EXECUTE'}) ===`);

    const profilesSnap = await getDocs(collection(db, 'profiles'));
    const existingProfilesCount = profilesSnap.size;
    log(`Jumlah profile existing: ${existingProfilesCount}`);

    const dirBeforeSnap = await getDocs(collection(db, 'client_directory'));
    const dirBeforeCount = dirBeforeSnap.size;
    log(`Jumlah client_directory sebelum migration: ${dirBeforeCount}`);

    if (isDryRun) {
      log(`[DRY RUN] Would sync ${existingProfilesCount} profiles to client_directory.`);
      return {
        existingProfilesCount,
        dirBeforeCount,
        dirAfterCount: dirBeforeCount,
        syncedCount: existingProfilesCount
      };
    }

    let syncedCount = 0;
    const chunks: any[][] = [];
    let currentChunk: any[] = [];

    profilesSnap.forEach(d => {
      currentChunk.push({ id: d.id, ...d.data() });
      if (currentChunk.length >= 400) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    });
    if (currentChunk.length > 0) chunks.push(currentChunk);

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const p of chunk) {
        const isCv = p.clientType === 'CV' || p.companyType === 'CV';
        const clientType = isCv ? 'CV' : (p.clientType || 'PT');
        const companyName = p.companyName ? this.formatCompanyName(p.companyName, clientType) : '';
        const searchName = companyName.toLowerCase().trim();
        const city = p.domicile || p.newAddress?.city || '';

        const establishmentYear = p.establishmentDeedDate
          ? new Date(p.establishmentDeedDate).getFullYear().toString()
          : (p.establishmentYear || '');

        const dirDocRef = doc(db, 'client_directory', p.id);
        const entry: ClientDirectoryEntry = {
          id: p.id,
          clientId: p.id,
          companyName,
          searchName,
          searchTokens: CompanyService.generateSearchTokens(companyName),
          clientType,
          companyType: isCv ? 'CV' : (p.companyType || 'PT_LOKAL'),
          domicile: city,
          establishmentDeedDate: p.establishmentDeedDate || '',
          establishmentYear,
          updatedAt: p.updatedAt || new Date().toISOString(),
          isArchived: !!p.isArchived,
          npwp: p.npwp || '',
          kbliItems: (p.kbliItems || []).map((k: any) => ({
            code: k.code || k.kode || (typeof k === 'string' ? k : ''),
            name: k.name || k.judul || ''
          }))
        };

        batch.set(dirDocRef, sanitizeForFirestore(entry), { merge: true });
        syncedCount++;
      }
      await batch.commit();
    }

    const dirAfterSnap = await getDocs(collection(db, 'client_directory'));
    const dirAfterCount = dirAfterSnap.size;

    log(`Jumlah client_directory setelah migration: ${dirAfterCount}`);
    log(`Jumlah data yang berhasil disinkronkan: ${syncedCount}`);

    CompanyService.clearCache();
    return {
      existingProfilesCount,
      dirBeforeCount,
      dirAfterCount,
      syncedCount
    };
  }

  /**
   * One-time backfill utility to populate searchTokens for existing client_directory entries.
   */
  static async backfillSearchTokens(isDryRun: boolean = false, addLog?: (msg: string) => void): Promise<{
    total: number;
    backfilled: number;
    alreadyOk: number;
    failed: number;
  }> {
    const log = (msg: string) => {
      console.log(`[Backfill SearchTokens] ${msg}`);
      if (addLog) addLog(msg);
    };

    log(`=== BACKFILL SEARCH TOKENS (${isDryRun ? 'DRY RUN' : 'EXECUTE'}) ===`);

    try {
      const colRef = collection(db, 'client_directory');
      const snap = await getDocs(colRef);
      const totalDocs = snap.size;
      log(`Total documents in client_directory: ${totalDocs}`);

      let alreadyOk = 0;
      let backfilled = 0;
      let failed = 0;

      const docsToUpdate: { docId: string; tokens: string[]; name: string }[] = [];

      snap.forEach(docSnap => {
        const data = docSnap.data() as ClientDirectoryEntry;
        const companyName = data.companyName || '';
        const existingTokens = data.searchTokens;
        const expectedTokens = CompanyService.generateSearchTokens(companyName);

        let isCorrect = Array.isArray(existingTokens) && existingTokens.length === expectedTokens.length;
        if (isCorrect && existingTokens) {
          const existingSet = new Set(existingTokens);
          for (const t of expectedTokens) {
            if (!existingSet.has(t)) {
              isCorrect = false;
              break;
            }
          }
        }

        if (isCorrect) {
          alreadyOk++;
        } else {
          docsToUpdate.push({
            docId: docSnap.id,
            tokens: expectedTokens,
            name: companyName
          });
        }
      });

      log(`Documents already having correct searchTokens: ${alreadyOk}`);
      log(`Documents needing backfill update: ${docsToUpdate.length}`);

      if (isDryRun) {
        log(`[DRY RUN] Would update ${docsToUpdate.length} documents.`);
        if (docsToUpdate.length > 0) {
          log(`Sample document backfill: ID ${docsToUpdate[0].docId} ("${docsToUpdate[0].name}") -> ${JSON.stringify(docsToUpdate[0].tokens.slice(0, 8))}...`);
        }
        return {
          total: totalDocs,
          backfilled: 0,
          alreadyOk,
          failed: 0
        };
      }

      // Execute updates in batches of 400 (safe limit is 500)
      const batchSize = 400;
      for (let i = 0; i < docsToUpdate.length; i += batchSize) {
        const chunk = docsToUpdate.slice(i, i + batchSize);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const docRef = doc(db, 'client_directory', item.docId);
          batch.update(docRef, { searchTokens: item.tokens });
        }

        try {
          await batch.commit();
          backfilled += chunk.length;
          log(`Successfully updated batch: ${backfilled} / ${docsToUpdate.length}`);
        } catch (batchErr: any) {
          console.error('[CompanyService] Batch commit failed during backfill:', batchErr);
          failed += chunk.length;
          log(`FAILED batch of ${chunk.length} documents. Error: ${batchErr?.message || batchErr}`);
        }
      }

      log(`=== BACKFILL SUMMARY ===`);
      log(`Total processed: ${totalDocs}`);
      log(`Already correct: ${alreadyOk}`);
      log(`Successfully backfilled: ${backfilled}`);
      log(`Failed: ${failed}`);

      CompanyService.clearCache();

      return {
        total: totalDocs,
        backfilled,
        alreadyOk,
        failed
      };
    } catch (err: any) {
      log(`FATAL ERROR during backfill: ${err?.message || err}`);
      throw err;
    }
  }

  /**
   * Fetch lightweight client directory entries
   */
  static async getClientDirectory(options?: {
    clientType?: string;
    isArchived?: boolean;
    searchQuery?: string;
  }): Promise<ClientDirectoryEntry[]> {
    try {
      let items: ClientDirectoryEntry[] = [];
      if (CompanyService.directoryCache && CompanyService.directoryCache.length > 0) {
        FirestoreTracker.logMenuOpen('Direktori Klien', 'HIT');
        items = [...CompanyService.directoryCache];
      } else {
        FirestoreTracker.logMenuOpen('Direktori Klien', 'MISS', 'client_directory', 50);
        const colRef = collection(db, 'client_directory');
        const snap = await getDocs(colRef);

        snap.forEach(docSnap => {
          items.push({ id: docSnap.id, clientId: docSnap.id, ...docSnap.data() } as ClientDirectoryEntry);
        });
        CompanyService.directoryCache = items;
        FirestoreTracker.logMenuOpen('Direktori Klien', 'MISS', 'client_directory', undefined, snap.size);
      }

      if (options?.clientType && options.clientType !== 'all') {
        items = items.filter(item => (item.clientType || 'PT') === options.clientType);
      }

      if (options?.isArchived !== undefined) {
        items = items.filter(item => !!item.isArchived === options.isArchived);
      }

      if (options?.searchQuery) {
        const q = options.searchQuery.toLowerCase().trim();
        items = items.filter(item => {
          const formatted = (item.companyName || '').toLowerCase();
          const searchN = (item.searchName || '').toLowerCase();
          return formatted.includes(q) || searchN.includes(q);
        });
      }

      return items;
    } catch (err) {
      console.warn('[CompanyService] Error reading client_directory:', err);
      return [];
    }
  }

  /**
   * Fetch paginated client directory entries using server-side queries and cache
   */
  static async getClientDirectoryPage(options?: ClientDirectoryPageOptions): Promise<ClientDirectoryPageResult> {
    const clientType = options?.clientType || 'all';
    const showArchived = !!options?.showArchived;
    const searchQuery = (options?.searchQuery || '').trim().toLowerCase();
    const establishmentYear = options?.establishmentYear || 'all';
    const sortField = options?.sortField || 'companyName';
    const sortOrder = options?.sortOrder || 'asc';
    const pageSize = options?.pageSize || 50;
    const cursorId = options?.lastDoc ? options.lastDoc.id : 'first';
    const pageNum = options?.page || 1;

    const cacheKey = `${clientType}_${showArchived ? 'archived' : 'active'}_${searchQuery}_${establishmentYear}_${sortField}_${sortOrder}_${pageSize}_${pageNum}_${cursorId}`;

    if (CompanyService.pageCache.has(cacheKey)) {
      const cached = CompanyService.pageCache.get(cacheKey)!;
      return { ...cached, fromCache: true };
    }

    try {
      const colRef = collection(db, 'client_directory');
      const constraints: QueryConstraint[] = [];

      // 1. Archive status filter
      constraints.push(where('isArchived', '==', showArchived));

      // 2. Client type filter if not 'all'
      if (clientType !== 'all') {
        constraints.push(where('clientType', '==', clientType));
      }

      // 3. Establishment year filter if not 'all'
      if (establishmentYear !== 'all') {
        constraints.push(where('establishmentYear', '==', establishmentYear));
      }

      // 4. Search query word tokens (array-contains)
      let queryToken = '';
      if (searchQuery !== '') {
        const words = searchQuery.split(/\s+/).filter(Boolean);
        // Take the first search word as the Firestore server-side filter token
        queryToken = words[0] || '';
        if (queryToken) {
          constraints.push(where('searchTokens', 'array-contains', queryToken));
        }
      } else {
        constraints.push(orderBy(sortField, sortOrder));
      }

      // 5. Cursor pagination
      if (options?.lastDoc) {
        constraints.push(startAfter(options.lastDoc));
      }

      // 6. Page size limit
      constraints.push(limit(pageSize));

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const items: ClientDirectoryEntry[] = [];
      let lastVisibleDoc: any = null;
      let needsBackfill = false;
      const backfillPromises: Promise<any>[] = [];

      snap.forEach(docSnap => {
        const data = docSnap.data() as ClientDirectoryEntry;
        const companyName = data.companyName || '';
        const searchTokens = data.searchTokens || CompanyService.generateSearchTokens(companyName);

        if (!data.searchTokens && companyName) {
          needsBackfill = true;
          backfillPromises.push(
            updateDoc(doc(db, 'client_directory', docSnap.id), {
              searchTokens
            }).catch(e => console.warn('[CompanyService] Lazy backfill failed:', e))
          );
        }

        const entry: ClientDirectoryEntry = {
          id: docSnap.id,
          clientId: docSnap.id,
          ...data,
          searchTokens
        };
        items.push(entry);
        lastVisibleDoc = docSnap;
      });

      if (needsBackfill) {
        Promise.all(backfillPromises).then(() => {
          CompanyService.clearCache();
        });
      }

      // Additional client-side filtering if there are multiple search words
      let resultItems = [...items];
      if (searchQuery !== '') {
        const searchWords = searchQuery.split(/\s+/).filter(Boolean);
        resultItems = resultItems.filter(item => {
          const name = (item.companyName || '').toLowerCase();
          return searchWords.every(word => name.includes(word));
        });

        // In-memory sorting for search results (since Firestore query was index-free and did not order)
        if (sortField) {
          resultItems.sort((a, b) => {
            const valA = String(a[sortField as keyof ClientDirectoryEntry] || '').toLowerCase();
            const valB = String(b[sortField as keyof ClientDirectoryEntry] || '').toLowerCase();
            if (sortOrder === 'desc') {
              return valB.localeCompare(valA);
            }
            return valA.localeCompare(valB);
          });
        }
      }

      const result: ClientDirectoryPageResult = {
        items: resultItems,
        lastDoc: lastVisibleDoc,
        hasMore: items.length >= pageSize,
        fromCache: false
      };

      CompanyService.pageCache.set(cacheKey, result);

      if (process.env.NODE_ENV !== 'production') {
        console.log('[ClientList]');
        console.log(`search: ${searchQuery}`);
        console.log(`normalizedSearch: ${queryToken}`);
        console.log('queryType: searchTokens');
        console.log(`documents: ${resultItems.length}`);
        console.log('cache: MISS');
        console.log('network: YES');
        console.log('profileReads: 0');
        console.log('writes: 0');
      }

      return result;
    } catch (err: any) {
      console.error('[CompanyService] Firestore query error in getClientDirectoryPage:', err?.message || err);
      return { items: [], lastDoc: null, hasMore: false, fromCache: false };
    }
  }

  /**
   * Fast profiles loader prioritizing memory cache and Firestore SDK cache.
   * Prevents unnecessary network collection scans.
   */
  static async getCompaniesFast(options?: { cacheOnly?: boolean }): Promise<CompanyProfile[]> {
    if (CompanyService.profilesCache && CompanyService.profilesCache.length > 0) {
      return CompanyService.profilesCache;
    }

    try {
      const snap = await getDocsFromCache(collection(db, 'profiles'));
      if (!snap.empty) {
        const loaded: CompanyProfile[] = [];
        snap.forEach(docSnap => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as CompanyProfile);
        });
        CompanyService.profilesCache = loaded;
        return loaded;
      }
    } catch (e) {
      // SDK Cache miss
    }

    if (options?.cacheOnly) {
      return CompanyService.profilesCache || [];
    }

    return CompanyService.getCompanies();
  }

  /**
   * Fetch all PT (Company) Profiles
   */
  static async getCompanies(forceRefresh = false): Promise<CompanyProfile[]> {
    if (CompanyService.profilesCache && CompanyService.profilesCache.length > 0 && !forceRefresh) {
      console.log(`[QuotationPerformance] Cache HIT - getCompanies returned ${CompanyService.profilesCache.length} cached profiles.`);
      return CompanyService.profilesCache;
    }

    const startTime = performance.now();
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      const loaded: CompanyProfile[] = [];
      snap.forEach(docSnap => {
        loaded.push({ id: docSnap.id, ...docSnap.data() } as CompanyProfile);
      });
      CompanyService.profilesCache = loaded;
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`[QuotationPerformance] Network READ - getCompanies loaded ${loaded.length} profiles from network. Time: ${duration}ms. Reads: ${loaded.length}. Status: SUCCESS`);
      return loaded;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
      throw error;
    }
  }

  /**
   * Fetch all CV Profiles (now loaded from profiles collection for backward compatibility)
   */
  static async getCvCompanies(forceRefresh = false): Promise<CompanyProfile[]> {
    if (CompanyService.profilesCache && CompanyService.profilesCache.length > 0 && !forceRefresh) {
      const loaded = CompanyService.profilesCache.filter(p => p.clientType === 'CV' || p.companyType === 'CV');
      console.log(`[QuotationPerformance] Cache HIT - getCvCompanies filtered ${loaded.length} cached CV profiles.`);
      return loaded;
    }

    const startTime = performance.now();
    try {
      const snap = await getDocs(collection(db, 'profiles'));
      const loaded: CompanyProfile[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.clientType === 'CV' || data.companyType === 'CV') {
          loaded.push({ id: docSnap.id, ...data } as CompanyProfile);
        }
      });
      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`[QuotationPerformance] Network READ - getCvCompanies loaded ${loaded.length} CV profiles from network. Time: ${duration}ms. Reads: ${loaded.length}. Status: SUCCESS`);
      return loaded;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
      throw error;
    }
  }

  /**
   * Listen to PT (Company) Profiles
   */
  static listenCompanies(callback: (profiles: CompanyProfile[]) => void): () => void {
    return onSnapshot(
      collection(db, 'profiles'),
      (snapshot) => {
        const loaded: CompanyProfile[] = [];
        snapshot.forEach(docSnap => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as CompanyProfile);
        });
        callback(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'profiles');
      }
    );
  }

  /**
   * Listen to CV Profiles (now listened from profiles collection for backward compatibility)
   */
  static listenCvCompanies(callback: (profiles: CompanyProfile[]) => void): () => void {
    return onSnapshot(
      collection(db, 'profiles'),
      (snapshot) => {
        const loaded: CompanyProfile[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.clientType === 'CV' || data.companyType === 'CV') {
            loaded.push({ id: docSnap.id, ...data } as CompanyProfile);
          }
        });
        callback(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'profiles');
      }
    );
  }

  /**
   * Helper to format company name: Uppercase and add type prefix if needed
   */
  static formatCompanyName(name: string, clientType: string): string {
    if (!name) return '';
    return name.toUpperCase().trim();
  }

  /**
    * Save (set with merge) a Company Profile
    */
  static async saveCompany(companyId: string, data: Partial<CompanyProfile>, isCv?: boolean): Promise<void> {
    const isCvCompany = isCv || data.clientType === 'CV' || data.companyType === 'CV';
    const collectionName = 'profiles';
    try {
      const clientType = isCvCompany ? 'CV' : (data.clientType || 'PT');
      const companyType = isCvCompany ? 'CV' : (data.companyType || 'PT_LOKAL');
      const preparedData = {
        ...data,
        clientType,
        companyType,
        companyName: data.companyName ? this.formatCompanyName(data.companyName, clientType) : undefined
      };

      const docRef = doc(db, collectionName, companyId);
      let oldCompanyName: string | undefined;

      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);
        const oldData = docSnap.exists() ? docSnap.data() as CompanyProfile : null;
        oldCompanyName = oldData?.companyName;
        const oldClientType = oldData?.clientType || 'PT';

        const qName = preparedData.companyName ? preparedData.companyName.trim().toUpperCase() : '';

        if (qName) {
          const isNameUnchanged = oldCompanyName && oldCompanyName.trim().toUpperCase() === qName && oldClientType === clientType;

          if (!isNameUnchanged) {
            const oldKey = oldCompanyName ? getUniqueClientKey(oldClientType, oldCompanyName) : '';
            const newKey = getUniqueClientKey(clientType, qName);

            // Fetch the new key's claim state
            const keyDocRef = doc(db, 'client_unique_keys', newKey);
            const keyDocSnap = await transaction.get(keyDocRef);

            if (keyDocSnap.exists()) {
              const keyData = keyDocSnap.data();
              if (keyData.clientId !== companyId) {
                throw new Error(`KLIEN_NAME_EXISTS:${preparedData.companyName}`);
              }
            } else {
              // Lock the new key
              transaction.set(keyDocRef, {
                clientId: companyId,
                clientType: clientType,
                normalizedName: normalizeCompanyName(qName),
                companyName: qName,
                createdAt: new Date().toISOString()
              });

              // Release the old key if we were renaming
              if (oldCompanyName && oldKey && oldKey !== newKey) {
                const oldKeyDocRef = doc(db, 'client_unique_keys', oldKey);
                transaction.delete(oldKeyDocRef);
              }
            }
          }
        }

        // Save company profile in transaction
        transaction.set(docRef, sanitizeForFirestore(preparedData), { merge: true });
      });

      // After transaction commits successfully, sync directory and handle Drive
      await this.syncClientDirectoryEntry(companyId, preparedData);
      CompanyService.clearCache();
      
      // Ensure or Rename the Google Drive folder for this client
      if (preparedData.companyName) {
        await this.handleRenameOrEnsureFolder(companyId, oldCompanyName, preparedData.companyName, clientType);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('KLIEN_NAME_EXISTS:')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Helper to rename or ensure Google Drive folder
   */
  private static async handleRenameOrEnsureFolder(companyId: string, oldCompanyName: string | undefined, newCompanyName: string, clientType: string) {
    try {
      const { auth } = await import('../lib/firebase');
      let token = '';
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const formattedNewName = this.formatCompanyName(newCompanyName, clientType);
      const formattedOldName = oldCompanyName ? this.formatCompanyName(oldCompanyName, clientType) : undefined;

      if (formattedOldName && formattedOldName !== formattedNewName) {
        console.log(`[CompanyService] Renaming Drive folder from "${formattedOldName}" to "${formattedNewName}"`);
        await fetch(getApiUrl('/api/v2/drive/rename-client-folder'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            oldCompanyName: formattedOldName,
            newCompanyName: formattedNewName,
            clientType
          })
        });
      } else {
        console.log(`[CompanyService] Ensuring Drive folder for "${formattedNewName}"`);
        await fetch(getApiUrl('/api/v2/drive/ensure-client-folder'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            clientId: companyId,
            companyName: formattedNewName,
            clientType
          })
        });
      }
    } catch (e) {
      console.warn("[CompanyService] Failed to rename or ensure drive folder:", e);
    }
  }

  /**
   * Update a Company Profile
   */
  static async updateCompany(companyId: string, data: Partial<CompanyProfile>, isCv?: boolean): Promise<void> {
    const collectionName = 'profiles';
    try {
      const updateData = { ...data };
      
      const docRef = doc(db, collectionName, companyId);
      const snap = await getDoc(docRef);
      const currentData = (snap.exists() ? snap.data() : {}) as any;
      const oldCompanyName = currentData.companyName;

      const finalType = updateData.clientType || currentData.clientType || 'PT';
      const finalName = updateData.companyName || currentData.companyName || '';
      
      if (finalName) {
        updateData.companyName = this.formatCompanyName(finalName, finalType);
      }

      if (updateData.companyName) {
        const qName = updateData.companyName.trim().toUpperCase();
        const isNameUnchanged = oldCompanyName && oldCompanyName.trim().toUpperCase() === qName;

        if (!isNameUnchanged) {
          const profilesColl = collection(db, collectionName);
          const q = query(profilesColl, where('companyName', '==', qName));
          const querySnap = await getDocs(q);
          
          const duplicate = querySnap.docs.find(docSnap => {
            if (docSnap.id === companyId) return false;
            const docData = docSnap.data();
            return docData.clientType === finalType;
          });

          if (duplicate) {
            throw new Error(`KLIEN_NAME_EXISTS:${updateData.companyName}`);
          }
        }
      }

      await updateDoc(docRef, sanitizeForFirestore(updateData));
      await this.syncClientDirectoryEntry(companyId, { ...currentData, ...updateData });

      if (updateData.companyName) {
        await this.handleRenameOrEnsureFolder(companyId, oldCompanyName, updateData.companyName, finalType);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('KLIEN_NAME_EXISTS:')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Archive/unarchive a Profile
   */
  static async archiveCompany(companyId: string, currentStatus: boolean, isCv?: boolean): Promise<boolean> {
    const nextStatus = !currentStatus;
    const collectionName = 'profiles';
    try {
      await updateDoc(doc(db, collectionName, companyId), {
        isArchived: nextStatus
      });
      await updateDoc(doc(db, 'client_directory', companyId), {
        isArchived: nextStatus
      }).catch(() => {});
      CompanyService.clearCache();
      return nextStatus;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Duplicate a Profile
   */
  static async duplicateCompany(company: CompanyProfile, isCv?: boolean): Promise<CompanyProfile> {
    const clientType = company.clientType || 'PT';
    const duplicatedName = this.formatCompanyName(`${company.companyName} (Salinan)`, clientType);
    const newId = crypto.randomUUID();
    const duplicatedProfile: CompanyProfile = {
      ...company,
      id: newId,
      companyName: duplicatedName,
      updatedAt: new Date().toISOString()
    };
    try {
      await this.saveCompany(newId, duplicatedProfile, isCv);
      return duplicatedProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `profiles/${newId}`);
      throw error;
    }
  }

  /**
   * Delete a Profile, all associated projects and uploaded documents,
   * all Firestore records, and its Google Drive folders.
   */
  static async deleteCompany(companyId: string, isCv?: boolean): Promise<void> {
    const collectionName = 'profiles';
    try {
      // 1. Fetch profile to get driveFolderId, companyName, clientType
      let companyName = '';
      let clientType = 'PT';
      let driveFolderId = '';
      try {
        const companySnap = await getDoc(doc(db, collectionName, companyId));
        if (companySnap.exists()) {
          const data = companySnap.data();
          companyName = data.companyName || '';
          clientType = data.clientType || (isCv ? 'CV' : 'PT');
          driveFolderId = data.driveFolderId || '';
        } else {
          const cpSnap = await getDoc(doc(db, 'company_profiles', companyId));
          if (cpSnap.exists()) {
            const data = cpSnap.data();
            companyName = data.companyName || '';
            clientType = data.clientType || 'PT';
            driveFolderId = data.driveFolderId || '';
          }
        }
      } catch (e) {
        console.warn("[CompanyService] Could not pre-fetch profile before delete:", e);
      }

      // 2. Scan and gather ALL project IDs associated with this client
      const projectIdsToDelete = new Set<string>();
      
      const projectCollections = [
        'office_projects',
        'projects',
        'rupst_projects',
        'rupst_public_projects',
        'pendirian_projects'
      ];

      for (const colName of projectCollections) {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef);
          snap.forEach(d => {
            const data = d.data();
            if (
              d.id === companyId ||
              data.clientId === companyId ||
              data.selectedProfileId === companyId ||
              data.companyId === companyId ||
              data.metadata?.clientId === companyId
            ) {
              projectIdsToDelete.add(d.id);
            }
          });
        } catch (e) {
          console.warn(`[CompanyService] Error scanning collection ${colName} for client projects:`, e);
        }
      }

      // 3. Delete each associated project (and its subcollections, drive folders, uploaded docs)
      const { ProjectService } = await import('./ProjectService');
      for (const projId of projectIdsToDelete) {
        try {
          console.log(`[CompanyService] Deleting associated project ${projId} for client ${companyId}...`);
          await ProjectService.deleteProject(projId);
        } catch (projErr) {
          console.warn(`[CompanyService] Error deleting project ${projId}:`, projErr);
        }
      }

      // 4. Clean up any remaining records in project_uploaded_documents for this client ID
      try {
        const uploadedDocsCol = collection(db, 'project_uploaded_documents');
        const docRefsToDelete = new Set<string>();

        // Query by clientId
        const qClient = query(uploadedDocsCol, where('clientId', '==', companyId));
        const qClientSnap = await getDocs(qClient);
        qClientSnap.forEach(d => docRefsToDelete.add(d.id));

        // Query by selectedProfileId
        const qSel = query(uploadedDocsCol, where('selectedProfileId', '==', companyId));
        const qSelSnap = await getDocs(qSel);
        qSelSnap.forEach(d => docRefsToDelete.add(d.id));

        // Query by companyId
        const qComp = query(uploadedDocsCol, where('companyId', '==', companyId));
        const qCompSnap = await getDocs(qComp);
        qCompSnap.forEach(d => docRefsToDelete.add(d.id));

        // Query for each projectId to delete
        for (const projId of Array.from(projectIdsToDelete)) {
          const qProj = query(uploadedDocsCol, where('projectId', '==', projId));
          const qProjSnap = await getDocs(qProj);
          qProjSnap.forEach(d => docRefsToDelete.add(d.id));
        }

        // Perform deletions
        for (const docId of Array.from(docRefsToDelete)) {
          await deleteDoc(doc(db, 'project_uploaded_documents', docId));
        }
      } catch (e) {
        console.warn("[CompanyService] Error cleaning project_uploaded_documents for client:", e);
      }

      // 5. Call backend API to delete client folder from Google Drive
      try {
        const { auth } = await import('../lib/firebase');
        let token = '';
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
        await fetch(getApiUrl('/api/v2/drive/delete-client-folder'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            clientId: companyId,
            companyName,
            clientType,
            driveFolderId
          })
        });
      } catch (e) {
        console.warn("[CompanyService] Error deleting Google Drive folder:", e);
      }

      // 6. Delete client documents from Firestore and release unique locks
      if (companyName) {
        const key = getUniqueClientKey(clientType, companyName);
        await deleteDoc(doc(db, 'client_unique_keys', key)).catch(() => {});
      }
      await deleteDoc(doc(db, 'profiles', companyId)).catch(() => {});
      await deleteDoc(doc(db, 'company_profiles', companyId)).catch(() => {});
      await deleteDoc(doc(db, 'cv_profiles', companyId)).catch(() => {});
      await deleteDoc(doc(db, 'client_directory', companyId)).catch(() => {});
      CompanyService.clearCache();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${companyId}`);
      throw error;
    }
  }

  /**
   * Merge one or more source companies into a target company
   * without losing associated projects or key profiles data.
   */
  static async mergeCompanies(targetId: string, sourceIds: string[]): Promise<{ projectsMerged: number }> {
    const collectionName = 'profiles';
    let projectsMerged = 0;
    try {
      // 1. Fetch Target Profile
      const targetRef = doc(db, collectionName, targetId);
      const targetSnap = await getDoc(targetRef);
      if (!targetSnap.exists()) {
        throw new Error('Klien utama (target) tidak ditemukan.');
      }
      const targetData = targetSnap.data() as CompanyProfile;

      // 2. Fetch Source Profiles & Merge Fields
      const mergedFields: Partial<CompanyProfile> = {};
      
      for (const sourceId of sourceIds) {
        if (sourceId === targetId) continue;
        const sourceRef = doc(db, collectionName, sourceId);
        const sourceSnap = await getDoc(sourceRef);
        if (!sourceSnap.exists()) continue;
        const sourceData = sourceSnap.data() as CompanyProfile;

        // Loop through keys and fill empty target fields with source fields
        Object.keys(sourceData).forEach((key) => {
          const k = key as keyof CompanyProfile;
          const targetVal = targetData[k];
          const sourceVal = sourceData[k];

          if (sourceVal !== undefined && sourceVal !== null && sourceVal !== '') {
            // If target value is missing/empty, adopt the source value
            if (targetVal === undefined || targetVal === null || targetVal === '' || (Array.isArray(targetVal) && targetVal.length === 0)) {
              (mergedFields as any)[k] = sourceVal;
            } else if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
              // For arrays like shareholders or kblis, combine unique items
              if (k === 'shareholders') {
                const targetSH = targetVal as any[];
                const sourceSH = sourceVal as any[];
                // Basic deduplication of shareholders based on name or id
                const combinedSH = [...targetSH];
                sourceSH.forEach(sh => {
                  const exists = targetSH.some(t => t.name === sh.name || t.id === sh.id);
                  if (!exists) combinedSH.push(sh);
                });
                (mergedFields as any)[k] = combinedSH;
              } else if (k === 'kbliItems') {
                const targetKbli = targetVal as any[];
                const sourceKbli = sourceVal as any[];
                const combinedKbli = [...targetKbli];
                sourceKbli.forEach(kb => {
                  const exists = targetKbli.some(t => (t.kode || t) === (kb.kode || kb));
                  if (!exists) combinedKbli.push(kb);
                });
                (mergedFields as any)[k] = combinedKbli;
              }
            }
          }
        });
      }

      // Save updated Target profile
      if (Object.keys(mergedFields).length > 0) {
        await updateDoc(targetRef, sanitizeForFirestore(mergedFields));
        await this.syncClientDirectoryEntry(targetId, { ...targetData, ...mergedFields });
      }

      // 3. Scan & Reassociate Project Collections
      const projectCollections = [
        'office_projects',
        'projects',
        'rupst_projects',
        'rupst_public_projects',
        'pendirian_projects'
      ];

      for (const colName of projectCollections) {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef);
          
          for (const d of snap.docs) {
            const data = d.data();
            const projId = d.id;
            
            // Check if this project matches any of the source IDs
            const matchesSource = sourceIds.some(sourceId => 
              projId === sourceId ||
              data.clientId === sourceId ||
              data.selectedProfileId === sourceId ||
              data.companyId === sourceId ||
              data.metadata?.clientId === sourceId
            );

            if (matchesSource) {
              const updates: any = {};
              if (data.clientId && sourceIds.includes(data.clientId)) updates.clientId = targetId;
              if (data.selectedProfileId && sourceIds.includes(data.selectedProfileId)) updates.selectedProfileId = targetId;
              if (data.companyId && sourceIds.includes(data.companyId)) updates.companyId = targetId;
              if (data.metadata?.clientId && sourceIds.includes(data.metadata?.clientId)) {
                updates.metadata = { ...data.metadata, clientId: targetId };
              }
              
              if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, colName, projId), sanitizeForFirestore(updates));
                projectsMerged++;
              }
            }
          }
        } catch (e) {
          console.warn(`[CompanyService] Error updating projects in ${colName} during merge:`, e);
        }
      }

      // 4. Reassociate project_uploaded_documents
      try {
        const uploadedDocsCol = collection(db, 'project_uploaded_documents');
        const docsToUpdate = new Map<string, { ref: any, data: any }>();

        for (const sourceId of sourceIds) {
          // Query by clientId
          const qClient = query(uploadedDocsCol, where('clientId', '==', sourceId));
          const qClientSnap = await getDocs(qClient);
          qClientSnap.forEach(d => {
            docsToUpdate.set(d.id, { ref: d.ref, data: d.data() });
          });

          // Query by selectedProfileId
          const qSel = query(uploadedDocsCol, where('selectedProfileId', '==', sourceId));
          const qSelSnap = await getDocs(qSel);
          qSelSnap.forEach(d => {
            docsToUpdate.set(d.id, { ref: d.ref, data: d.data() });
          });

          // Query by companyId
          const qComp = query(uploadedDocsCol, where('companyId', '==', sourceId));
          const qCompSnap = await getDocs(qComp);
          qCompSnap.forEach(d => {
            docsToUpdate.set(d.id, { ref: d.ref, data: d.data() });
          });
        }

        for (const { ref, data } of Array.from(docsToUpdate.values())) {
          const updates: any = {};
          if (data.clientId && sourceIds.includes(data.clientId)) updates.clientId = targetId;
          if (data.selectedProfileId && sourceIds.includes(data.selectedProfileId)) updates.selectedProfileId = targetId;
          if (data.companyId && sourceIds.includes(data.companyId)) updates.companyId = targetId;
          
          if (Object.keys(updates).length > 0) {
            await updateDoc(ref, sanitizeForFirestore(updates));
          }
        }
      } catch (e) {
        console.warn("[CompanyService] Error updating project_uploaded_documents during merge:", e);
      }

      // 5. Delete source profile documents
      for (const sourceId of sourceIds) {
        if (sourceId === targetId) continue;
        
        try {
          const sourceSnap = await getDoc(doc(db, collectionName, sourceId));
          if (sourceSnap.exists()) {
            const sData = sourceSnap.data();
            const sName = sData.companyName;
            const sType = sData.clientType || 'PT';
            if (sName) {
              const sKey = getUniqueClientKey(sType, sName);
              await deleteDoc(doc(db, 'client_unique_keys', sKey)).catch(() => {});
            }
          }
        } catch (e) {
          console.warn(`[CompanyService] Failed to release unique key for source ${sourceId} during merge:`, e);
        }

        await deleteDoc(doc(db, collectionName, sourceId)).catch(() => {});
        await deleteDoc(doc(db, 'company_profiles', sourceId)).catch(() => {});
        await deleteDoc(doc(db, 'cv_profiles', sourceId)).catch(() => {});
        await deleteDoc(doc(db, 'client_directory', sourceId)).catch(() => {});
      }
      CompanyService.clearCache();

      return { projectsMerged };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${targetId}`);
      throw error;
    }
  }

  /**
   * Find duplicate clients in the profiles collection.
   * Returns an array of duplicate groups.
   */
  static async findDuplicateClients(): Promise<{ key: string; profiles: CompanyProfile[] }[]> {
    const profilesColl = collection(db, 'profiles');
    const snap = await getDocs(profilesColl);
    const groups = new Map<string, CompanyProfile[]>();

    snap.forEach((docSnap) => {
      const data = docSnap.data() as CompanyProfile;
      const profile = { id: docSnap.id, ...data };
      if (profile.companyName) {
        const key = getUniqueClientKey(profile.clientType || 'PT', profile.companyName);
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(profile);
      }
    });

    const duplicates: { key: string; profiles: CompanyProfile[] }[] = [];
    for (const [key, profiles] of groups.entries()) {
      if (profiles.length > 1) {
        duplicates.push({ key, profiles });
      }
    }
    return duplicates;
  }

  /**
   * Automatically resolve duplicates by merging them into the oldest profile.
   */
  static async resolveDuplicates(
    duplicateGroups: { key: string; profiles: CompanyProfile[] }[],
    isDryRun = false,
    log?: (msg: string) => void
  ): Promise<{ resolvedCount: number; mergedProjectsCount: number }> {
    let resolvedCount = 0;
    let mergedProjectsCount = 0;

    for (const group of duplicateGroups) {
      // Sort by createdAt ascending (oldest first). If createdAt is missing, fall back to id.
      const sorted = [...group.profiles].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });

      const survivor = sorted[0];
      const itemsToMerge = sorted.slice(1);
      const sourceIds = itemsToMerge.map((p) => p.id);

      const msg = `[Auto-Merge] Grup "${group.key}": Menetapkan survivor ${survivor.companyName} (${survivor.id}) dan me-merge ${itemsToMerge.length} duplikat: ${itemsToMerge.map(p => `${p.companyName} (${p.id})`).join(', ')}`;
      if (log) log(msg);

      if (!isDryRun) {
        const res = await this.mergeCompanies(survivor.id, sourceIds);
        mergedProjectsCount += res.projectsMerged;
        resolvedCount += itemsToMerge.length;
      }
    }

    return { resolvedCount, mergedProjectsCount };
  }

  /**
   * Run the duplicate audit, merge duplicates, and backfill client_unique_keys for all remaining profiles.
   */
  static async runDuplicateAuditAndBackfill(isDryRun = false, log?: (msg: string) => void): Promise<void> {
    const logger = log || console.log;
    logger(`[Audit] Memulai proses audit duplikat & backfill unique locks...`);

    // 1. Audit and resolve duplicates
    const duplicates = await this.findDuplicateClients();
    logger(`[Audit] Menemukan ${duplicates.length} grup klien duplikat.`);

    if (duplicates.length > 0) {
      if (isDryRun) {
        logger(`[Dry Run] Akan me-merge otomatis ${duplicates.length} grup duplikat.`);
        for (const group of duplicates) {
          logger(`  - Grup "${group.key}": ${group.profiles.length} dokumen.`);
        }
      } else {
        logger(`[Live] Menjalankan auto-merge untuk ${duplicates.length} grup duplikat...`);
        const { resolvedCount, mergedProjectsCount } = await this.resolveDuplicates(duplicates, false, logger);
        logger(`[Live] Auto-merge selesai. Berhasil me-merge ${resolvedCount} dokumen duplikat dan ${mergedProjectsCount} project.`);
      }
    }

    // 2. Backfill client_unique_keys for all profiles
    logger(`[Backfill] Memulai pengisian (backfill) client_unique_keys...`);
    const profilesColl = collection(db, 'profiles');
    const snap = await getDocs(profilesColl);
    let backfillCount = 0;
    let existingCount = 0;

    for (const docSnap of snap.docs) {
      const profile = docSnap.data() as CompanyProfile;
      const pId = docSnap.id;
      if (!profile.companyName) continue;

      const key = getUniqueClientKey(profile.clientType || 'PT', profile.companyName);
      const keyDocRef = doc(db, 'client_unique_keys', key);
      const keySnap = await getDoc(keyDocRef);

      if (keySnap.exists()) {
        existingCount++;
      } else {
        if (!isDryRun) {
          await setDoc(keyDocRef, {
            clientId: pId,
            clientType: profile.clientType || 'PT',
            normalizedName: normalizeCompanyName(profile.companyName),
            companyName: profile.companyName,
            createdAt: profile.createdAt || new Date().toISOString()
          });
        }
        backfillCount++;
      }
    }

    logger(`[Backfill] Selesai. Pengisian berhasil untuk ${backfillCount} dokumen${isDryRun ? ' (Dry Run)' : ''}. ${existingCount} dokumen sudah memiliki kunci.`);
  }
}
