import { db } from '../lib/firebase';
import { superappsDb, SuperappsClientService } from '../services/superappsClientService';
import { doc, getDoc } from 'firebase/firestore';
import { getApiUrl, getAuthHeaders } from '../lib/api';

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
  superappsClients?: ClientOption[];
}

// Memory cache for phone resolver to prevent redundant requests
const phoneResolverCache: Record<string, string> = {};

async function searchD1ClientsForResolver(queryStr: string): Promise<Array<{ clientId: string; companyName: string }>> {
  try {
    const headers = await getAuthHeaders();
    const url = getApiUrl(`/api/clients/search?q=${encodeURIComponent(queryStr)}&limit=15`);
    const response = await fetch(url, { headers });
    if (!response.ok) return [];
    const data = await response.json() as any;
    const results = data.clients || [];
    return results.map((d: any) => ({
      clientId: d.clientId || d.id,
      companyName: d.companyName || ''
    }));
  } catch (err) {
    console.warn('[clientPhoneResolver] D1 client search error:', err);
    return [];
  }
}

export async function resolveClientPhone({
  clientId,
  clientName,
  clientPhone,
  clientSource,
  localClients,
  superappsClients,
}: ResolvePhoneParams): Promise<string> {
  // 0. If clientPhone is explicitly provided, return formatted (0 DB reads)
  if (clientPhone && clientPhone.trim()) {
    return formatPhoneForFonnte(clientPhone);
  }

  // 1. Check preloaded localClients & superappsClients by clientId
  if (clientId) {
    const cached = phoneResolverCache[`id:${clientId}`];
    if (cached) return formatPhoneForFonnte(cached);

    const matched = (localClients || []).find(c => c.clientId === clientId) ||
                    (superappsClients || []).find(c => c.clientId === clientId);
    if (matched && matched.phone) {
      phoneResolverCache[`id:${clientId}`] = matched.phone;
      return formatPhoneForFonnte(matched.phone);
    }
  }

  // 2. Check preloaded lists by clientName
  if (clientName && clientName.trim()) {
    const normName = cleanNameForFuzzyMatch(clientName);
    const cached = phoneResolverCache[`name:${normName}`];
    if (cached) return formatPhoneForFonnte(cached);

    const targetName = clientName.toLowerCase().trim();
    let matched = (localClients || []).find(c => (c.name || '').toLowerCase().trim() === targetName) ||
                  (superappsClients || []).find(c => (c.name || '').toLowerCase().trim() === targetName);
    if (!matched) {
      matched = (localClients || []).find(c => isFuzzyNameMatch(c.name, clientName)) ||
                (superappsClients || []).find(c => isFuzzyNameMatch(c.name, clientName));
    }
    if (matched && matched.phone) {
      phoneResolverCache[`name:${normName}`] = matched.phone;
      if (matched.clientId) phoneResolverCache[`id:${matched.clientId}`] = matched.phone;
      return formatPhoneForFonnte(matched.phone);
    }
  }

  let phoneNum = '';

  // 3. Targeted read if clientId is available (Prioritize clientId)
  if (clientId) {
    try {
      if (clientSource === 'superapps') {
        const clientDoc = await getDoc(doc(superappsDb, 'profiles', clientId));
        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          phoneNum = clientData.phoneNumber || clientData.contactNumber || clientData.phone || '';
        }
      } else {
        const clientDoc = await getDoc(doc(db, 'profiles', clientId));
        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          phoneNum = clientData.phoneNumber || clientData.phone || '';
        } else {
          const companyDoc = await getDoc(doc(db, 'company_profiles', clientId));
          if (companyDoc.exists()) {
            const companyData = companyDoc.data();
            phoneNum = companyData.phoneNumber || companyData.phone || '';
          }
        }
      }

      if (phoneNum) {
        phoneResolverCache[`id:${clientId}`] = phoneNum;
        if (clientName) phoneResolverCache[`name:${cleanNameForFuzzyMatch(clientName)}`] = phoneNum;
        return formatPhoneForFonnte(phoneNum);
      }
    } catch (err) {
      console.warn('[clientPhoneResolver] Error targeted reading profile by clientId:', err);
    }
  }

  // 4. Search D1 by clientName if phone still not found
  if (clientName && clientName.trim()) {
    try {
      const d1Candidates = await searchD1ClientsForResolver(clientName);
      let matchedD1 = d1Candidates.find(c => (c.companyName || '').toLowerCase().trim() === clientName.toLowerCase().trim()) ||
                      d1Candidates.find(c => isFuzzyNameMatch(c.companyName, clientName));

      if (matchedD1 && matchedD1.clientId) {
        // Targeted read profile from D1 matched clientId (1 Firestore read)
        const clientDoc = await getDoc(doc(db, 'profiles', matchedD1.clientId));
        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          phoneNum = clientData.phoneNumber || clientData.phone || '';
        }

        if (phoneNum) {
          phoneResolverCache[`id:${matchedD1.clientId}`] = phoneNum;
          phoneResolverCache[`name:${cleanNameForFuzzyMatch(clientName)}`] = phoneNum;
          return formatPhoneForFonnte(phoneNum);
        }
      }

      // 5. Fallback to Superapps search
      if (!phoneNum) {
        const spProfiles = await SuperappsClientService.getSuperappsProfiles(clientName);
        const foundSp = spProfiles.find(p => isFuzzyNameMatch(p.name, clientName));
        if (foundSp && foundSp.contactNumber) {
          phoneNum = foundSp.contactNumber;
          phoneResolverCache[`name:${cleanNameForFuzzyMatch(clientName)}`] = phoneNum;
          if (foundSp.clientId) phoneResolverCache[`id:${foundSp.clientId}`] = phoneNum;
          return formatPhoneForFonnte(phoneNum);
        }
      }
    } catch (err) {
      console.error('[clientPhoneResolver] Error searching client by name:', err);
    }
  }

  return formatPhoneForFonnte(phoneNum);
}

