import { CompanyData } from '../../types';
import { PendirianData } from '../DraftAktaPendirian';
import { NotaryService } from '../services/NotaryService';

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

export interface SyncResult {
  success: boolean;
  orderNumber: string;
  deedNumber: string;
  deedId?: string;
}

export const generateRandomId = () => Math.random().toString(36).substr(2, 9);

export const syncToUtama = async (data: SyncDeedData): Promise<SyncResult> => {
  if (!data.deedNumber || !data.deedDate) {
    console.warn("Nomor Akta atau Tanggal Akta kosong. Sinkronisasi dibatalkan.");
    throw new Error("Nomor Akta dan Tanggal Akta harus diisi.");
  }

  try {
    const payload = {
      orderNumber: data.orderNumber || '',
      deedNumber: data.deedNumber,
      number: data.deedNumber,
      deedDate: data.deedDate,
      date: data.deedDate,
      clientName: data.clientName,
      deedTitle: data.deedTitle,
      title: data.deedTitle,
      clientId: "external_draft",
      appearers: data.appearers as any,
      grantors: []
    };

    let savedDeed: any = null;

    // Check if deed with same number exists in D1
    const res = await fetch(`/api/deeds?search=${encodeURIComponent(data.deedNumber)}`);
    if (res.ok) {
      const json = await res.json();
      const records = json.records || [];
      const match = records.find((r: any) => String(r.number || r.deedNumber).trim() === String(data.deedNumber).trim());
      if (match) {
        savedDeed = await NotaryService.updateDeed(match.id, payload);
        console.log("Sync: Updated existing deed in D1 deeds collection", data.deedNumber);
      }
    }

    if (!savedDeed) {
      savedDeed = await NotaryService.addDeed(payload);
      console.log("Sync: Created new deed in D1 deeds collection", data.deedNumber);
    }

    const finalOrderNumber = String(
      savedDeed?.orderNumber || savedDeed?.order_number || data.orderNumber || ''
    );

    return {
      success: true,
      orderNumber: finalOrderNumber,
      deedNumber: data.deedNumber,
      deedId: savedDeed?.id
    };
  } catch (error) {
    console.error("Sync to deeds failed:", error);
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
    return `PERNYATAAN KEPUTUSAN\nRAPAT UMUM PEMEGANG SAHAM TAHUNAN\n${ptName}`;
  }

  return '';
};

export const formatAppearersForRups = (data: CompanyData): SyncAppearer[] => {
  const appearers: SyncAppearer[] = [];
  const validShareholders = data.rupstType === 'sirkuler'
    ? (data.shareholders || []).filter(s => (Number(s.sharesOwned) || 0) > 0)
    : (data.shareholders || []);
  
  if (data.representativeType === 'MANUAL' && data.manualRepresentative?.name) {
    const representedParties = validShareholders.filter(s => s.isPresent !== false);
    appearers.push({
      id: generateRandomId(),
      name: data.manualRepresentative.name,
      role: 'Proxy',
      bertindakSebagai: 'Kuasa',
      grantors: representedParties.map(s => ({ id: s.id, name: s.name })),
      mewakili: representedParties.map(s => s.name)
    });
  } else if (data.representativeType === 'EXISTING' && data.authorizedRepresentativeId) {
    const allCandidates = [
      ...validShareholders,
      ...(data.finalShareholders || []),
      ...(data.shareholders || []),
      ...(data.oldManagementItems || []),
      ...(data.newManagementItems || [])
    ];
    const rep = allCandidates.find(s => s.id === data.authorizedRepresentativeId || (s.name && s.name.toUpperCase() === data.authorizedRepresentativeId?.toUpperCase()));
    if (rep) {
      const representedParties = validShareholders.filter(s => s.isPresent !== false && s.id !== rep.id);
      const isRepPresent = validShareholders.some(s => s.id === rep.id && s.isPresent !== false);
      
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
    (validShareholders || []).filter(s => s.isPresent !== false).forEach(s => {
      if (s.isProxy) {
        const repName = s.guardianName || s.representativeName || s.proxyData?.name || '';
        if (repName) {
          const isDir = s.proxyData?.representationType === 'DIREKTUR_PT_LAIN';
          appearers.push({
            id: generateRandomId(),
            name: repName,
            role: 'Proxy',
            bertindakSebagai: isDir ? `Direktur ${s.name}` : `Kuasa ${s.name}`,
            grantors: [{ id: s.id, name: s.name }],
            mewakili: [s.name]
          });
        }
      } else {
        appearers.push({
          id: generateRandomId(),
          name: s.name,
          role: 'Self',
          bertindakSebagai: 'Diri Sendiri',
          grantors: [],
          mewakili: [s.name]
        });
      }
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

export const formatAppearersForPendirianCV = (data: any): SyncAppearer[] => {
  return (data.peseros || []).map((p: any) => ({
    id: generateRandomId(),
    name: p.salutation ? `${p.salutation} ${p.name}` : p.name,
    role: 'Self' as const,
    bertindakSebagai: 'Diri Sendiri',
    grantors: [],
    mewakili: [p.name]
  }));
};
