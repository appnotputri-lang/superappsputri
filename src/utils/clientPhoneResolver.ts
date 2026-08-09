import { db } from '../lib/firebase';
import { superappsDb } from '../services/superappsClientService';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';

export interface ClientOption {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  source: 'local' | 'superapps';
  clientType?: string;
}

export const cleanNameForFuzzyMatch = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(pt|cv|tbk|pma|yayasan|koperasi|firma|perkumpulan|perseroan|perorangan)\b/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
};

export const isFuzzyNameMatch = (name1: string, name2: string): boolean => {
  const n1 = cleanNameForFuzzyMatch(name1);
  const n2 = cleanNameForFuzzyMatch(name2);
  if (!n1 || !n2) return false;
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
};

export const formatPhoneForFonnte = (phone: string): string => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
};

export interface ResolvePhoneParams {
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientSource?: 'local' | 'superapps';
  localClients: ClientOption[];
  superappsClients: ClientOption[];
}

export async function resolveClientPhone({
  clientId,
  clientName,
  clientPhone,
  clientSource,
  localClients,
  superappsClients,
}: ResolvePhoneParams): Promise<string> {
  let phoneNum = clientPhone || '';
  if (phoneNum) {
    return formatPhoneForFonnte(phoneNum);
  }

  // 1. Try finding by ID in preloaded lists
  let matchedClient = null;
  if (clientId) {
    matchedClient =
      localClients.find(c => c.clientId === clientId) ||
      superappsClients.find(c => c.clientId === clientId);
  }

  // 2. Try finding by Name in preloaded lists (case-insensitive)
  if (!matchedClient && clientName) {
    const targetName = clientName.toLowerCase().trim();
    matchedClient =
      localClients.find(c => c.name?.toLowerCase().trim() === targetName) ||
      superappsClients.find(c => c.name?.toLowerCase().trim() === targetName);

    // 2b. Fuzzy name matching fallback
    if (!matchedClient) {
      matchedClient =
        localClients.find(c => isFuzzyNameMatch(c.name, clientName)) ||
        superappsClients.find(c => isFuzzyNameMatch(c.name, clientName));
    }
  }

  if (matchedClient && matchedClient.phone) {
    phoneNum = matchedClient.phone;
  } else {
    // 3. Direct Firestore lookup by clientId if present
    try {
      if (clientId) {
        if (clientSource === 'superapps') {
          const clientDoc = await getDoc(doc(superappsDb, 'profiles', clientId));
          if (clientDoc.exists()) {
            const clientData = clientDoc.data();
            phoneNum = clientData.phoneNumber || clientData.contactNumber || clientData.phone || '';
          }
        } else {
          // Local profiles
          const clientDoc = await getDoc(doc(db, 'profiles', clientId));
          if (clientDoc.exists()) {
            const clientData = clientDoc.data();
            phoneNum = clientData.phoneNumber || clientData.phone || '';
          } else {
            // Legacy local company profiles
            const companyDoc = await getDoc(doc(db, 'company_profiles', clientId));
            if (companyDoc.exists()) {
              const companyData = companyDoc.data();
              phoneNum = companyData.phoneNumber || companyData.phone || '';
            }
          }
        }
      }

      // 4. Fallback to direct Firestore lookup by clientName if still not resolved
      if (!phoneNum && clientName) {
        const targetName = clientName.trim().toUpperCase();

        // Try local profiles companyName
        const localSnap = await getDocs(query(collection(db, 'profiles'), where('companyName', '==', targetName)));
        if (!localSnap.empty) {
          const clientData = localSnap.docs[0].data();
          phoneNum = clientData.phoneNumber || clientData.phone || '';
        } else {
          // Try local profiles name
          const localSnap2 = await getDocs(query(collection(db, 'profiles'), where('name', '==', targetName)));
          if (!localSnap2.empty) {
            const clientData = localSnap2.docs[0].data();
            phoneNum = clientData.phoneNumber || clientData.phone || '';
          } else {
            // Try superapps profiles companyName
            const spSnap = await getDocs(query(collection(superappsDb, 'profiles'), where('companyName', '==', targetName)));
            if (!spSnap.empty) {
              const clientData = spSnap.docs[0].data();
              phoneNum = clientData.phoneNumber || clientData.contactNumber || clientData.phone || '';
            } else {
              // Try superapps profiles name
              const spSnap2 = await getDocs(query(collection(superappsDb, 'profiles'), where('name', '==', targetName)));
              if (!spSnap2.empty) {
                const clientData = spSnap2.docs[0].data();
                phoneNum = clientData.phoneNumber || clientData.contactNumber || clientData.phone || '';
              }
            }
          }
        }

        // 5. If still not resolved, load all profiles from Firestore and do fuzzy matching
        if (!phoneNum) {
          // Fuzzy search in local profiles
          const localProfilesSnap = await getDocs(collection(db, 'profiles'));
          let foundLocal = localProfilesSnap.docs.find(doc => {
            const data = doc.data();
            const name = data.companyName || data.name || '';
            return isFuzzyNameMatch(name, clientName);
          });
          if (foundLocal) {
            const clientData = foundLocal.data();
            phoneNum = clientData.phoneNumber || clientData.phone || '';
          } else {
            // Fuzzy search in superapps profiles
            const spProfilesSnap = await getDocs(collection(superappsDb, 'profiles'));
            let foundSp = spProfilesSnap.docs.find(doc => {
              const data = doc.data();
              const name = data.companyName || data.name || '';
              return isFuzzyNameMatch(name, clientName);
            });
            if (foundSp) {
              const clientData = foundSp.data();
              phoneNum = clientData.phoneNumber || clientData.contactNumber || clientData.phone || '';
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to auto-fetch client phone number from Firestore:', err);
    }
  }

  return formatPhoneForFonnte(phoneNum);
}
