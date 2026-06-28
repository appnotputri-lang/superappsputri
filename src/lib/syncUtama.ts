import { dbUtama } from './firebaseUtama';
import { collection, query, where, getDocs, setDoc, doc, addDoc } from 'firebase/firestore';
import { CompanyData } from '../../types';
import { PendirianData } from '../DraftAktaPendirian';

export interface SyncAppearer {
  id: string;
  name: string;
  role: 'Self' | 'Proxy' | 'SelfAndProxy';
  grantors: { id: string; name: string }[];
  bertindakSebagai: string;
  mewakili: string[];
}

export interface SyncDeedData {
  orderNumber?: string;
  deedNumber: string;
  deedDate: string;
  clientName: string;
  deedTitle: string;
  appearers: SyncAppearer[];
}

export const generateRandomId = () => Math.random().toString(36).substr(2, 9);

export const syncToUtama = async (data: SyncDeedData) => {
  if (!data.deedNumber || !data.deedDate) {
    console.warn("Nomor Akta atau Tanggal Akta kosong. Sinkronisasi dibatalkan.");
    return;
  }

  try {
    const deedsRef = collection(dbUtama, "deeds");
    // Use deedNumber as identifier
    const q = query(deedsRef, where("deedNumber", "==", data.deedNumber));
    const querySnapshot = await getDocs(q);

    const payload = {
      ...data,
      clientId: "external_draft",
      syncAt: Date.now(),
      createdAt: Date.now()
    };

    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      const docRef = doc(dbUtama, "deeds", existingDoc.id);
      const existingData = existingDoc.data();
      
      const finalPayload = {
        ...payload,
        createdAt: existingData.createdAt || payload.createdAt
      };
      
      await setDoc(docRef, finalPayload, { merge: true });
      console.log("Sync: Updated existing deed in dbUtama", data.deedNumber);
    } else {
      await addDoc(deedsRef, payload);
      console.log("Sync: Created new deed in dbUtama", data.deedNumber);
    }
    return true;
  } catch (error) {
    console.error("Sync to Utama failed:", error);
    throw error;
  }
};

export const getDeedTitle = (type: 'PENDIRIAN' | 'RUPSLB' | 'RUPST', data: any, overrideCompanyName?: string): string => {
  const companyName = overrideCompanyName || (type === 'PENDIRIAN' ? data.namaPt : data.companyName) || data.namaPT || '';
  
  if (!companyName) return '';

  // Ensure it starts with PT
  const ptName = companyName.toUpperCase().startsWith('PT') ? companyName.toUpperCase() : `PT ${companyName.toUpperCase()}`;

  if (type === 'PENDIRIAN') {
    return `PENDIRIAN PERSEROAN TERBATAS\n${ptName}`;
  }

  if (type === 'RUPSLB') {
    if (data.documentType === 'CIRCULAR') {
      return `PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM\nYANG DIAMBIL DI LUAR RAPAT\nSEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA\n${ptName}`;
    }
    return `PERNYATAAN KEPUTUSAN\nRAPAT UMUM PEMEGANG SAHAM LUAR BIASA\n${ptName}`;
  }

  if (type === 'RUPST') {
    if (data.rupstType === 'sirkuler') {
      return `PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM\n${ptName}`;
    }
    // Match the requested format: PERNYATAAN KEPUTUSAN\nRAPAT UMUM PEMEGANG SAHAM TAHUNAN\nPT ...
    return `PERNYATAAN KEPUTUSAN\nRAPAT UMUM PEMEGANG SAHAM TAHUNAN\n${ptName}`;
  }

  return '';
};

export const formatAppearersForRups = (data: CompanyData): SyncAppearer[] => {
  const appearers: SyncAppearer[] = [];
  
  if (data.representativeType === 'MANUAL' && data.manualRepresentative.name) {
    const representedParties = data.shareholders.filter(s => s.isPresent);
    appearers.push({
      id: generateRandomId(),
      name: data.manualRepresentative.name,
      role: 'Proxy',
      bertindakSebagai: 'Kuasa',
      grantors: representedParties.map(s => ({ id: s.id, name: s.name })),
      mewakili: representedParties.map(s => s.name)
    });
  } else if (data.representativeType === 'EXISTING' && data.authorizedRepresentativeId) {
    const rep = data.shareholders.find(s => s.id === data.authorizedRepresentativeId) || 
                data.finalShareholders.find(s => s.id === data.authorizedRepresentativeId);
    if (rep) {
      const representedParties = data.shareholders.filter(s => s.isPresent && s.id !== rep.id);
      const isRepPresent = data.shareholders.some(s => s.id === rep.id && s.isPresent);
      
      let role: 'Self' | 'Proxy' | 'SelfAndProxy' = 'Proxy';
      if (isRepPresent && representedParties.length > 0) {
        role = 'SelfAndProxy';
      } else if (isRepPresent) {
        role = 'Self';
      }

      const bertindakSebagai = role === 'SelfAndProxy' 
        ? `Diri Sendiri & Kuasa ${representedParties.map(p => p.name).join(', ')}` 
        : (role === 'Self' ? 'Diri Sendiri' : `Kuasa ${representedParties.map(p => p.name).join(', ')}`);

      appearers.push({
        id: generateRandomId(),
        name: rep.name,
        role: role,
        bertindakSebagai: bertindakSebagai,
        grantors: representedParties.map(s => ({ id: s.id, name: s.name })),
        mewakili: isRepPresent ? [rep.name, ...representedParties.map(s => s.name)] : representedParties.map(s => s.name)
      });
    }
  } else {
    data.shareholders.filter(s => s.isPresent && !s.isProxy).forEach(s => {
      appearers.push({
        id: generateRandomId(),
        name: s.name,
        role: 'Self',
        bertindakSebagai: 'Diri Sendiri',
        grantors: [],
        mewakili: [s.name]
      });
    });
  }

  return appearers;
};

export const formatAppearersForPendirian = (data: PendirianData): SyncAppearer[] => {
  return data.shareholders.map(s => ({
    id: generateRandomId(),
    name: s.name,
    role: 'Self',
    bertindakSebagai: 'Diri Sendiri',
    grantors: [],
    mewakili: [s.name]
  }));
};
