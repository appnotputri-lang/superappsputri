import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

// Configuration for superapps project (read-only)
const SUPERAPPS_PROJECT_ID = 'gen-lang-client-0780305709';
const SUPERAPPS_DATABASE_ID = 'ai-studio-9ed678a8-09d0-44a0-9223-82537f62bf08';
const APP_NAME = 'superappsClient';

// Initialize separate Firebase App instance for read-only access to Superapps database
const getSuperappsApp = () => {
  const existingApps = getApps();
  const existing = existingApps.find(a => a.name === APP_NAME);
  if (existing) {
    return existing;
  }
  return initializeApp({ projectId: SUPERAPPS_PROJECT_ID }, APP_NAME);
};

export const superappsDb = getFirestore(getSuperappsApp(), SUPERAPPS_DATABASE_ID);

export interface SuperappsClientProfile {
  clientId: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  npwp?: string;
  clientType?: string;
  source: 'superapps';
  rawProfile?: any;
}

export class SuperappsClientService {
  private static initialCache: SuperappsClientProfile[] | null = null;
  private static searchCache: Record<string, SuperappsClientProfile[]> = {};

  /**
   * Fetch profiles from the superapps 'profiles' collection using optimized queries.
   * Uses limit() to restrict reading and caches queries for session efficiency.
   */
  static async getSuperappsProfiles(searchQuery = '', forceRefresh = false): Promise<SuperappsClientProfile[]> {
    const q = searchQuery.trim().toLowerCase();

    // 1. Return cached results if available
    if (!forceRefresh) {
      if (!q && this.initialCache) {
        console.log(`[QuotationPerformance] Cache HIT - empty search returned ${this.initialCache.length} cached profiles.`);
        return this.initialCache;
      }
      if (q && this.searchCache[q]) {
        console.log(`[QuotationPerformance] Cache HIT - search query "${q}" returned ${this.searchCache[q].length} cached profiles.`);
        return this.searchCache[q];
      }
    }

    const startTime = performance.now();
    try {
      const colRef = collection(superappsDb, 'profiles');
      const limitCount = 15;
      let snapshotDocs: any[] = [];

      if (!q) {
        // Query empty search -> limit to initial set of 15 documents
        const firestoreQuery = query(colRef, limit(limitCount));
        const snapshot = await getDocs(firestoreQuery);
        snapshotDocs = snapshot.docs;
        console.log(`[QuotationPerformance] Network READ - Loaded 15 default superapps profiles for empty search.`);
      } else {
        // Query with search term -> prefix queries with limit
        const uppercaseTerm = searchQuery.trim().toUpperCase();
        const lowercaseTerm = searchQuery.trim().toLowerCase();
        const capitalizedTerm = searchQuery.trim().charAt(0).toUpperCase() + searchQuery.trim().slice(1);

        // Run prefix queries on both 'companyName' and 'name'
        const queriesToRun = [
          // Upper case queries (very common for PT / CV names)
          query(colRef, where('companyName', '>=', uppercaseTerm), where('companyName', '<=', uppercaseTerm + '\uf8ff'), limit(limitCount)),
          query(colRef, where('name', '>=', uppercaseTerm), where('name', '<=', uppercaseTerm + '\uf8ff'), limit(limitCount)),
          
          // Capitalized queries (common for general names)
          query(colRef, where('companyName', '>=', capitalizedTerm), where('companyName', '<=', capitalizedTerm + '\uf8ff'), limit(limitCount)),
          query(colRef, where('name', '>=', capitalizedTerm), where('name', '<=', capitalizedTerm + '\uf8ff'), limit(limitCount)),

          // Raw search query as-is
          query(colRef, where('companyName', '>=', searchQuery.trim()), where('companyName', '<=', searchQuery.trim() + '\uf8ff'), limit(limitCount)),
          query(colRef, where('name', '>=', searchQuery.trim()), where('name', '<=', searchQuery.trim() + '\uf8ff'), limit(limitCount))
        ];

        // Execute all queries in parallel
        const snapshots = await Promise.all(queriesToRun.map(fq => getDocs(fq)));
        
        // Merge and deduplicate by document ID
        const seenIds = new Set<string>();
        for (const snap of snapshots) {
          for (const docSnap of snap.docs) {
            if (!seenIds.has(docSnap.id)) {
              seenIds.add(docSnap.id);
              snapshotDocs.push(docSnap);
            }
          }
        }

        // Limit final merged list size to limitCount
        snapshotDocs = snapshotDocs.slice(0, limitCount);
        console.log(`[QuotationPerformance] Network READ - Search query "${q}" loaded ${snapshotDocs.length} matching superapps profiles.`);
      }

      // Map document snapshots to profiles
      const mappedProfiles: SuperappsClientProfile[] = snapshotDocs.map((docSnap) => {
        const data = docSnap.data();
        const companyName = data.companyName || data.name || 'Tanpa Nama';

        let addressStr = '';
        if (data.fullAddress) {
          addressStr = data.fullAddress;
        } else if (typeof data.address === 'string') {
          addressStr = data.address;
        } else if (data.address && typeof data.address === 'object') {
          addressStr = data.address.fullAddress || '';
        }

        const phone = data.phoneNumber || data.contactNumber || data.phone || '';
        const email = data.email || '';
        const npwp = data.npwp || '';
        const clientType = data.clientType || 'PT';

        return {
          clientId: docSnap.id,
          name: companyName,
          address: addressStr,
          contactNumber: phone,
          email: email,
          npwp: npwp,
          clientType: clientType,
          source: 'superapps' as const,
          rawProfile: { id: docSnap.id, ...data }
        };
      });

      // Save to cache
      if (!q) {
        this.initialCache = mappedProfiles;
      } else {
        this.searchCache[q] = mappedProfiles;
      }

      const duration = (performance.now() - startTime).toFixed(2);
      console.log(`[QuotationPerformance] Finished querying superapps profiles in ${duration}ms. Results count: ${mappedProfiles.length}`);
      
      return mappedProfiles;
    } catch (error) {
      console.error('[SuperappsClientService] Gagal mengambil data profiles superapps:', error);
      throw error;
    }
  }
}
