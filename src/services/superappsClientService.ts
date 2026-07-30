import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
  /**
   * Fetch all profile documents from the superapps 'profiles' collection.
   * Maps fields:
   * - doc.id -> clientId
   * - companyName / name -> name
   * - fullAddress / address -> address
   * - phoneNumber / phone -> contactNumber
   * - email -> email
   * - npwp -> npwp
   * Flagged with source: 'superapps'
   */
  static async getSuperappsProfiles(): Promise<SuperappsClientProfile[]> {
    try {
      const colRef = collection(superappsDb, 'profiles');
      const snapshot = await getDocs(colRef);

      return snapshot.docs.map((docSnap) => {
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
          source: 'superapps',
          rawProfile: { id: docSnap.id, ...data }
        };
      });
    } catch (error) {
      console.error('[SuperappsClientService] Gagal mengambil data profiles superapps:', error);
      throw error;
    }
  }
}
