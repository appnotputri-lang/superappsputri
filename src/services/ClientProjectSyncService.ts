import { db, cleanUndefined, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { CompanyService } from './CompanyService';
import { ProjectService } from './ProjectService';
import { CompanyProfile, KbliItem, Shareholder, ManagementItem, AmendmentDeed } from '../../types';
import { ClientSnapshot, Project } from '../domain/project/Project';
import { mapCompanyProfileToPendirian } from '../domain/company/mappers/companyProfileToPendirian';
import { mapCompanyProfileToCV } from '../domain/company/mappers/companyProfileToCV';

export interface ClientSyncSelection {
  // DATA PERUSAHAAN
  companyName?: boolean;
  companyShortName?: boolean;
  companyType?: boolean;
  npwp?: boolean;
  email?: boolean;
  phoneNumber?: boolean;
  status?: boolean;
  duration?: boolean;

  // DOMISILI & ALAMAT
  address?: boolean;
  rtRw?: boolean;
  kelurahan?: boolean;
  kecamatan?: boolean;
  city?: boolean;
  province?: boolean;
  postalCode?: boolean;
  domicile?: boolean;
  oldDomicile?: boolean;

  // KEGIATAN USAHA
  kbli?: boolean;

  // PERMODALAN
  modalDasar?: boolean;
  modalDitempatkan?: boolean;
  modalDisetor?: boolean;

  // PEMEGANG SAHAM
  shareholders?: boolean;

  // PENGURUS
  direksi?: boolean;
  komisaris?: boolean;
  oldManagement?: boolean;
  newManagement?: boolean;

  // AKTA PERUSAHAAN
  establishmentDeed?: boolean;
  amendmentHistory?: boolean;
  latestAmendment?: boolean;
}

export const SYNC_CATEGORIES = [
  {
    id: 'company',
    title: 'DATA PERUSAHAAN',
    icon: 'Building',
    fields: [
      { key: 'companyName', label: 'Nama Perusahaan' },
      { key: 'companyShortName', label: 'Nama Singkatan' },
      { key: 'companyType', label: 'Bentuk Badan Usaha' },
      { key: 'npwp', label: 'NPWP' },
      { key: 'email', label: 'Email' },
      { key: 'phoneNumber', label: 'Nomor Telepon' },
      { key: 'status', label: 'Status Perusahaan' },
      { key: 'duration', label: 'Jangka Waktu' }
    ]
  },
  {
    id: 'domicile',
    title: 'DOMISILI & ALAMAT',
    icon: 'MapPin',
    fields: [
      { key: 'address', label: 'Alamat' },
      { key: 'rtRw', label: 'RT/RW' },
      { key: 'kelurahan', label: 'Kelurahan/Desa' },
      { key: 'kecamatan', label: 'Kecamatan' },
      { key: 'city', label: 'Kota/Kabupaten' },
      { key: 'province', label: 'Provinsi' },
      { key: 'postalCode', label: 'Kode Pos' },
      { key: 'domicile', label: 'Domisili' },
      { key: 'oldDomicile', label: 'Domisili Lama' }
    ]
  },
  {
    id: 'business',
    title: 'KEGIATAN USAHA',
    icon: 'Briefcase',
    fields: [
      { key: 'kbli', label: 'KBLI' }
    ]
  },
  {
    id: 'capital',
    title: 'PERMODALAN',
    icon: 'Coins',
    fields: [
      { key: 'modalDasar', label: 'Modal Dasar' },
      { key: 'modalDitempatkan', label: 'Modal Ditempatkan' },
      { key: 'modalDisetor', label: 'Modal Disetor' }
    ]
  },
  {
    id: 'shareholders',
    title: 'PEMEGANG SAHAM',
    icon: 'Users',
    fields: [
      { key: 'shareholders', label: 'Pemegang Saham' }
    ]
  },
  {
    id: 'management',
    title: 'PENGURUS',
    icon: 'UserCheck',
    fields: [
      { key: 'direksi', label: 'Pengurus/Direksi' },
      { key: 'komisaris', label: 'Komisaris' },
      { key: 'oldManagement', label: 'Pengurus Lama' },
      { key: 'newManagement', label: 'Pengurus Baru' }
    ]
  },
  {
    id: 'deeds',
    title: 'AKTA PERUSAHAAN',
    icon: 'FileText',
    fields: [
      { key: 'establishmentDeed', label: 'Akta Pendirian' },
      { key: 'amendmentHistory', label: 'Riwayat Akta Perubahan' },
      { key: 'latestAmendment', label: 'Akta Perubahan Terakhir' }
    ]
  }
] as const;

export function getAllSelectedSync(): ClientSyncSelection {
  const all: any = {};
  SYNC_CATEGORIES.forEach(cat => {
    cat.fields.forEach(f => {
      all[f.key] = true;
    });
  });
  return all as ClientSyncSelection;
}

export function getNoneSelectedSync(): ClientSyncSelection {
  const none: any = {};
  SYNC_CATEGORIES.forEach(cat => {
    cat.fields.forEach(f => {
      none[f.key] = false;
    });
  });
  return none as ClientSyncSelection;
}

/**
 * Checks if a project is final/completed.
 * Historical snapshots of final projects are strictly protected and immutable.
 */
export function isProjectFinal(project: any): boolean {
  if (!project) return false;
  const status = String(project.status || '').toLowerCase().trim();
  return (
    status === 'completed' ||
    status === 'selesai' ||
    status === 'archived' ||
    status === 'selesai & diserahkan' ||
    status.includes('selesai')
  );
}

/**
 * Normalizes KBLI items from any profile format.
 */
export function normalizeKblis(items: any[]): KbliItem[] {
  return (items || []).map((k: any) => ({
    id: k.id || crypto.randomUUID(),
    code: k.code || k.kode || '',
    name: k.name || k.judul || k.title || '',
    description: k.description || k.uraian || '',
    categoryLetter: k.categoryLetter || '',
    categoryName: k.categoryName || '',
    uraian: k.uraian || k.description || '',
    ruangLingkup: k.ruangLingkup || []
  }));
}

/**
 * Maps a CompanyProfile to the ClientSnapshot structure.
 */
export function mapCompanyProfileToSnapshot(profile: CompanyProfile): ClientSnapshot {
  return {
    id: profile.id,
    companyName: profile.companyName || '',
    companyType: profile.companyType || profile.clientType || 'PT',
    fullAddress: profile.fullAddress || profile.oldFullAddress || '',
    province: profile.newAddress?.province || profile.oldAddress?.province || '',
    city: profile.newAddress?.city || profile.oldAddress?.city || profile.domicile || '',
    domicile: profile.domicile || profile.oldDomicile || profile.newAddress?.city || profile.oldAddress?.city || '',
    oldDomicile: profile.domicile || profile.oldDomicile || profile.newAddress?.city || profile.oldAddress?.city || '',
    npwp: profile.npwp || '',
    kbliItems: (profile.kbliItems || []).map(k => ({
      id: k.id || Math.random().toString(36).substring(7),
      code: k.code || (k as any).kode || '',
      name: k.name || (k as any).judul || '',
      description: k.description || (k as any).uraian || '',
      categoryLetter: k.categoryLetter || '',
      categoryName: k.categoryName || '',
      uraian: (k as any).uraian || k.description || ''
    })),
    authorizedCapital: profile.targetCapitalBase || profile.originalCapitalBase || 0,
    paidUpCapital: profile.targetCapitalPaid || profile.originalCapitalPaid || 0,
    originalCapitalBase: profile.originalCapitalBase || profile.targetCapitalBase || 0,
    originalCapitalPaid: profile.originalCapitalPaid || profile.targetCapitalPaid || 0,
    originalSharePrice: profile.originalSharePrice || 0,
    originalAuthorizedShares: profile.originalAuthorizedShares || 0,
    originalTotalShares: profile.originalTotalShares || 0,
    shareholders: (profile.shareholders || []).map(s => ({
      id: s.id,
      salutation: s.salutation || 'Tuan',
      name: s.name || '',
      birthCity: s.birthCity || '',
      birthDate: s.birthDate || '',
      nationalityType: s.nationalityType || 'WNI',
      nationality: s.nationality || 'WNI',
      occupation: s.occupation || '',
      sharesOwned: s.sharesOwned || 0,
      position: s.managementPosition || (s as any).position || '',
      managementPosition: s.managementPosition || (s as any).position || '',
      isManagement: s.isManagement ?? !!(s.managementPosition || (s as any).position),
      nik: s.nik || '',
      npwp: s.npwp || '',
      passportNumber: s.passportNumber || '',
      kitasNumber: s.kitasNumber || '',
      shareholderType: s.shareholderType || 'PERORANGAN',
      address: s.address ? {
        rt: s.address.rt || '',
        rw: s.address.rw || '',
        kelurahan: s.address.kelurahan || '',
        kecamatan: s.address.kecamatan || '',
        city: s.address.city || '',
        province: s.address.province || '',
        postalCode: s.address.postalCode || '',
        fullAddress: s.address.fullAddress || (typeof s.address === 'string' ? s.address : '')
      } : undefined
    })),
    managementItems: (profile.oldManagementItems || profile.newManagementItems || (profile as any).managementItems || []).map(m => ({
      id: m.id,
      salutation: (m as any).salutation || '',
      name: m.name || '',
      birthCity: (m as any).birthCity || '',
      birthDate: (m as any).birthDate || '',
      nationalityType: (m as any).nationalityType || '',
      nationality: (m as any).nationality || '',
      occupation: (m as any).occupation || '',
      position: m.position || '',
      nik: m.nik || '',
      npwp: (m as any).npwp || '',
      passportNumber: (m as any).passportNumber || '',
      kitasNumber: (m as any).kitasNumber || '',
      address: (m as any).address ? {
        rt: (m as any).address.rt || '',
        rw: (m as any).address.rw || '',
        kelurahan: (m as any).address.kelurahan || '',
        kecamatan: (m as any).address.kecamatan || '',
        city: (m as any).address.city || '',
        province: (m as any).address.province || '',
        postalCode: (m as any).address.postalCode || '',
        fullAddress: (m as any).address.fullAddress || (typeof (m as any).address === 'string' ? (m as any).address : '')
      } : undefined
    })),
    oldManagementItems: (profile.oldManagementItems || profile.newManagementItems || (profile as any).managementItems || []),
    newManagementItems: profile.newManagementItems || [],
    establishmentDeedNumber: profile.establishmentDeedNumber || '',
    establishmentDeedDate: profile.establishmentDeedDate || '',
    establishmentNotary: profile.establishmentNotary || '',
    establishmentNotaryTitle: profile.establishmentNotaryTitle || '',
    establishmentNotaryDomicile: profile.establishmentNotaryDomicile || '',
    establishmentSkNumber: profile.establishmentSkNumber || '',
    establishmentSkDate: profile.establishmentSkDate || '',
    latestAmendmentDeedNumber: profile.latestAmendmentDeedNumber || '',
    latestAmendmentDeedDate: profile.latestAmendmentDeedDate || '',
    latestAmendmentNotary: profile.latestAmendmentNotary || '',
    amendmentDeeds: profile.amendmentDeeds || []
  };
}

/**
 * Selectively updates an existing ClientSnapshot ONLY for the selected categories/fields.
 */
export function applySelectiveSnapshotUpdates(
  existingSnapshot: ClientSnapshot | undefined,
  freshClient: CompanyProfile,
  selection: ClientSyncSelection
): ClientSnapshot {
  const base = existingSnapshot ? { ...existingSnapshot } : mapCompanyProfileToSnapshot(freshClient);

  if (selection.companyName) {
    base.companyName = freshClient.companyName || '';
  }
  if (selection.companyType) {
    base.companyType = freshClient.companyType || freshClient.clientType || 'PT';
  }
  if (selection.npwp) {
    base.npwp = freshClient.npwp || '';
  }

  // Address & Domicile
  if (selection.address) {
    base.fullAddress = freshClient.fullAddress || freshClient.oldFullAddress || '';
  }
  if (selection.domicile) {
    base.domicile = freshClient.domicile || freshClient.oldDomicile || freshClient.newAddress?.city || '';
  }
  if (selection.oldDomicile) {
    base.oldDomicile = freshClient.oldDomicile || freshClient.domicile || '';
  }
  if (selection.city) {
    base.city = freshClient.newAddress?.city || freshClient.oldAddress?.city || freshClient.domicile || '';
  }
  if (selection.province) {
    base.province = freshClient.newAddress?.province || freshClient.oldAddress?.province || '';
  }

  // KBLI: copy full array (even if empty [])
  if (selection.kbli) {
    base.kbliItems = (freshClient.kbliItems || []).map(k => ({
      id: k.id || Math.random().toString(36).substring(7),
      code: k.code || (k as any).kode || '',
      name: k.name || (k as any).judul || '',
      description: k.description || (k as any).uraian || '',
      categoryLetter: k.categoryLetter || '',
      categoryName: k.categoryName || '',
      uraian: (k as any).uraian || k.description || ''
    }));
  }

  // Capital
  if (selection.modalDasar) {
    base.authorizedCapital = freshClient.targetCapitalBase || freshClient.originalCapitalBase || 0;
    base.originalCapitalBase = freshClient.originalCapitalBase || freshClient.targetCapitalBase || 0;
    base.originalAuthorizedShares = freshClient.originalAuthorizedShares || 0;
  }
  if (selection.modalDisetor || selection.modalDitempatkan) {
    base.paidUpCapital = freshClient.targetCapitalPaid || freshClient.originalCapitalPaid || 0;
    base.originalCapitalPaid = freshClient.originalCapitalPaid || freshClient.targetCapitalPaid || 0;
    base.originalSharePrice = freshClient.originalSharePrice || 0;
    base.originalTotalShares = freshClient.originalTotalShares || 0;
  }

  // Shareholders: copy full array (even if empty [])
  if (selection.shareholders) {
    base.shareholders = (freshClient.shareholders || []).map(s => ({
      id: s.id,
      salutation: s.salutation || 'Tuan',
      name: s.name || '',
      birthCity: s.birthCity || '',
      birthDate: s.birthDate || '',
      nationalityType: s.nationalityType || 'WNI',
      nationality: s.nationality || 'WNI',
      occupation: s.occupation || '',
      sharesOwned: s.sharesOwned || 0,
      position: s.managementPosition || (s as any).position || '',
      managementPosition: s.managementPosition || (s as any).position || '',
      isManagement: s.isManagement ?? !!(s.managementPosition || (s as any).position),
      nik: s.nik || '',
      npwp: s.npwp || '',
      passportNumber: s.passportNumber || '',
      kitasNumber: s.kitasNumber || '',
      shareholderType: s.shareholderType || 'PERORANGAN',
      address: s.address ? {
        rt: s.address.rt || '',
        rw: s.address.rw || '',
        kelurahan: s.address.kelurahan || '',
        kecamatan: s.address.kecamatan || '',
        city: s.address.city || '',
        province: s.address.province || '',
        postalCode: s.address.postalCode || '',
        fullAddress: s.address.fullAddress || (typeof s.address === 'string' ? s.address : '')
      } : undefined
    }));
  }

  // Management
  if (selection.direksi || selection.komisaris || selection.oldManagement) {
    const rawMgmt = freshClient.oldManagementItems || (freshClient as any).managementItems || [];
    base.oldManagementItems = rawMgmt;
    base.managementItems = rawMgmt.map(m => ({
      id: m.id,
      salutation: (m as any).salutation || '',
      name: m.name || '',
      birthCity: (m as any).birthCity || '',
      birthDate: (m as any).birthDate || '',
      nationalityType: (m as any).nationalityType || '',
      nationality: (m as any).nationality || '',
      occupation: (m as any).occupation || '',
      position: m.position || '',
      nik: m.nik || '',
      npwp: (m as any).npwp || '',
      passportNumber: (m as any).passportNumber || '',
      kitasNumber: (m as any).kitasNumber || '',
      address: (m as any).address ? {
        rt: (m as any).address.rt || '',
        rw: (m as any).address.rw || '',
        kelurahan: (m as any).address.kelurahan || '',
        kecamatan: (m as any).address.kecamatan || '',
        city: (m as any).address.city || '',
        province: (m as any).address.province || '',
        postalCode: (m as any).address.postalCode || '',
        fullAddress: (m as any).address.fullAddress || (typeof (m as any).address === 'string' ? (m as any).address : '')
      } : undefined
    }));
  }
  if (selection.newManagement) {
    base.newManagementItems = freshClient.newManagementItems || [];
  }

  // Deeds
  if (selection.establishmentDeed) {
    base.establishmentDeedNumber = freshClient.establishmentDeedNumber || '';
    base.establishmentDeedDate = freshClient.establishmentDeedDate || '';
    base.establishmentNotary = freshClient.establishmentNotary || '';
    base.establishmentNotaryTitle = freshClient.establishmentNotaryTitle || '';
    base.establishmentNotaryDomicile = freshClient.establishmentNotaryDomicile || '';
    base.establishmentSkNumber = freshClient.establishmentSkNumber || '';
    base.establishmentSkDate = freshClient.establishmentSkDate || '';
  }
  if (selection.amendmentHistory) {
    base.amendmentDeeds = (freshClient.amendmentDeeds || []).map(d => ({ ...d }));
  }
  if (selection.latestAmendment) {
    base.latestAmendmentDeedNumber = freshClient.latestAmendmentDeedNumber || '';
    base.latestAmendmentDeedDate = freshClient.latestAmendmentDeedDate || '';
    base.latestAmendmentNotary = freshClient.latestAmendmentNotary || '';
  }

  return base;
}

/**
 * Explicitly updates MASTER CLIENT fields onto a project form based on user selection,
 * STRICTLY PRESERVING all PROJECT-SPECIFIC fields.
 */
export function syncClientMasterToFormData(
  currentForm: any,
  client: CompanyProfile,
  jobType: string,
  selection: ClientSyncSelection = getAllSelectedSync()
): any {
  if (!client) return currentForm;
  const current = currentForm || {};
  const result: any = { ...current };

  // For Pendirian PT
  if (jobType === 'pendirian_pt' || jobType === 'pendirian') {
    if (selection.companyName) {
      result.namaPt = (client.companyName || '').toUpperCase();
    }
    if (selection.city || selection.domicile) {
      result.kotaKedudukan = client.newAddress?.city || client.oldAddress?.city || client.domicile || '';
    }
    if (selection.address) {
      const alamat = client.fullAddress || client.oldFullAddress || (client.newAddress?.fullAddress ? 
        `${client.newAddress.fullAddress}, RT ${client.newAddress.rt}/${client.newAddress.rw}, Kel. ${client.newAddress.kelurahan}, Kec. ${client.newAddress.kecamatan}` : '');
      if (alamat) result.alamatLengkapPT = alamat;
    }
    if (selection.modalDasar) {
      result.modalDasar = client.originalCapitalBase ?? current.modalDasar;
      result.modalDasarLembar = client.originalAuthorizedShares ?? current.modalDasarLembar;
    }
    if (selection.modalDisetor || selection.modalDitempatkan) {
      result.modalDisetorLembar = client.originalTotalShares ?? current.modalDisetorLembar;
      result.nilaiPerLembar = client.originalSharePrice ?? current.nilaiPerLembar;
      if (client.originalCapitalBase) {
        result.modalDisetorPersen = Math.round((client.originalCapitalPaid / client.originalCapitalBase) * 100);
      }
    }
    if (selection.kbli) {
      result.kbliItems = normalizeKblis(client.kbliItems || []);
    }
    if (selection.shareholders) {
      result.shareholders = (client.shareholders || []).map((s: any) => ({
        id: crypto.randomUUID(),
        salutation: s.salutation || 'Tuan',
        name: (s.name || '').toUpperCase(),
        birthCity: s.birthCity || '',
        birthDate: s.birthDate || '',
        nationality: s.nationality || 'WNI',
        nationalityType: s.nationalityType || 'WNI',
        occupation: s.occupation || '',
        address: {
          fullAddress: s.address?.fullAddress || '',
          rt: s.address?.rt || '',
          rw: s.address?.rw || '',
          kelurahan: s.address?.kelurahan || '',
          kecamatan: s.address?.kecamatan || '',
          city: s.address?.city || '',
          province: s.address?.province || '',
        },
        nik: s.nik || '',
        shareholderType: s.shareholderType || 'PERORANGAN',
        isForeign: s.isForeign || false,
        npwp: s.npwp || '',
        passportNumber: s.passportNumber || '',
        establishmentDeedNumber: s.establishmentDeedNumber || '',
        establishmentDeedDate: s.establishmentDeedDate || '',
        sharesOwned: s.sharesOwned || 0,
        managementPosition: s.managementPosition || 'Direktur',
        isManagement: typeof s.isManagement !== 'undefined' ? s.isManagement : true
      }));
    }
    result.selectedProfileId = client.id || current.selectedProfileId;
    return result;
  }

  // For Pendirian CV
  if (jobType === 'pendirian_cv') {
    const clientAny = client as any;
    if (selection.companyName) {
      result.namaCV = (clientAny.namaCV || client.companyName || current.namaCV || '').toUpperCase().trim();
    }
    if (selection.city || selection.domicile) {
      result.kotaKedudukan = clientAny.kotaKedudukan || client.domicile || clientAny.addressDetail?.city || current.kotaKedudukan || '';
    }
    if (selection.address) {
      result.alamatLengkapCV = clientAny.alamatLengkapCV || client.fullAddress || clientAny.addressDetail?.fullAddress || current.alamatLengkapCV || '';
    }
    if (selection.modalDasar || selection.modalDisetor || selection.modalDitempatkan) {
      result.modalTotal = Number(clientAny.modalTotal || clientAny.totalCapital || client.originalCapitalPaid || current.modalTotal || 100000000);
    }
    if (selection.shareholders) {
      const rawPeseros = clientAny.peseros || clientAny.peseroList || client.shareholders || [];
      result.peseros = rawPeseros.map((s: any) => {
        const isKomanditer = (s.role === 'KOMANDITER') || (s.managementPosition && String(s.managementPosition).toUpperCase().includes('KOMANDITER')) || (!s.isManagement && !s.role);
        const role: 'PENGURUS' | 'KOMANDITER' = isKomanditer ? 'KOMANDITER' : 'PENGURUS';
        return {
          id: s.id || crypto.randomUUID(),
          salutation: s.salutation || 'Tuan',
          name: (s.name || '').toUpperCase().trim(),
          birthCity: s.birthCity || '',
          birthDate: s.birthDate || '',
          nationality: s.nationality || 'WNI',
          nationalityType: s.nationalityType || 'WNI',
          occupation: s.occupation || '',
          address: typeof s.address === 'object' && s.address !== null ? { ...s.address } : (s.address || ''),
          nik: s.nik || '',
          role,
          modalContribution: Number(s.modalContribution || s.capitalAmount || s.sharesOwned || 0),
        };
      });
    }
    if (selection.kbli) {
      result.kbliItems = normalizeKblis(client.kbliItems || []);
    }
    result.selectedProfileId = client.id || current.selectedProfileId;
    return result;
  }

  // For RUPS LB / Sirkuler / RUPS-T / Corporate Forms
  result.selectedProfileId = client.id || current.selectedProfileId;

  // 1. DATA PERUSAHAAN
  if (selection.companyName) {
    result.companyName = client.companyName || '';
  }
  if (selection.companyShortName) {
    result.companyShortName = client.companyShortName || '';
  }
  if (selection.companyType) {
    result.companyType = client.companyType || client.clientType || 'PT';
    result.clientType = client.clientType || client.companyType || 'PT';
  }
  if (selection.npwp) {
    result.npwp = client.npwp || '';
  }
  if (selection.email) {
    result.email = client.email || '';
  }
  if (selection.phoneNumber) {
    result.phoneNumber = client.phoneNumber || '';
  }
  if (selection.status) {
    result.status = client.status || '';
  }
  if (selection.duration) {
    result.duration = client.duration || 'tidak terbatas';
  }

  // 2. DOMISILI & ALAMAT
  if (selection.domicile) {
    const dom = client.domicile || client.oldDomicile || client.newAddress?.city || '';
    result.domicile = dom;
    result.kedudukanPT = client.kedudukanPT || dom;
  }
  if (selection.oldDomicile) {
    result.oldDomicile = client.oldDomicile || client.domicile || '';
  }
  if (selection.address) {
    const fullAddr = client.fullAddress || client.oldFullAddress || 
      (client.newAddress?.fullAddress ? `${client.newAddress.fullAddress}, RT ${client.newAddress.rt || '-'}/${client.newAddress.rw || '-'}, Kel. ${client.newAddress.kelurahan || '-'}, Kec. ${client.newAddress.kecamatan || '-'}` : '');
    result.fullAddress = fullAddr;
    result.oldFullAddress = fullAddr;
    if (client.newAddress) {
      result.newAddress = { ...(result.newAddress || {}), fullAddress: client.newAddress.fullAddress || fullAddr };
    }
  }
  if (selection.city) {
    const cityVal = client.newAddress?.city || client.oldAddress?.city || client.domicile || '';
    result.newAddress = { ...(result.newAddress || {}), city: cityVal };
    result.oldAddress = { ...(result.oldAddress || {}), city: cityVal };
  }
  if (selection.province) {
    const provVal = client.newAddress?.province || client.oldAddress?.province || '';
    result.newAddress = { ...(result.newAddress || {}), province: provVal };
    result.oldAddress = { ...(result.oldAddress || {}), province: provVal };
  }
  if (selection.rtRw) {
    result.newAddress = {
      ...(result.newAddress || {}),
      rt: client.newAddress?.rt || '',
      rw: client.newAddress?.rw || ''
    };
    result.oldAddress = {
      ...(result.oldAddress || {}),
      rt: client.oldAddress?.rt || client.newAddress?.rt || '',
      rw: client.oldAddress?.rw || client.newAddress?.rw || ''
    };
  }
  if (selection.kelurahan) {
    result.newAddress = { ...(result.newAddress || {}), kelurahan: client.newAddress?.kelurahan || '' };
    result.oldAddress = { ...(result.oldAddress || {}), kelurahan: client.oldAddress?.kelurahan || client.newAddress?.kelurahan || '' };
  }
  if (selection.kecamatan) {
    result.newAddress = { ...(result.newAddress || {}), kecamatan: client.newAddress?.kecamatan || '' };
    result.oldAddress = { ...(result.oldAddress || {}), kecamatan: client.oldAddress?.kecamatan || client.newAddress?.kecamatan || '' };
  }
  if (selection.postalCode) {
    result.newAddress = { ...(result.newAddress || {}), postalCode: client.newAddress?.postalCode || '' };
    result.oldAddress = { ...(result.oldAddress || {}), postalCode: client.oldAddress?.postalCode || client.newAddress?.postalCode || '' };
  }

  // 3. KEGIATAN USAHA (KBLI)
  // Copy full array directly without length fallback. Even if [], Project becomes []
  if (selection.kbli) {
    result.kbliItems = normalizeKblis(client.kbliItems || []);
  }

  // 4. PERMODALAN
  if (selection.modalDasar) {
    result.originalCapitalBase = client.originalCapitalBase ?? client.targetCapitalBase ?? 0;
    result.originalAuthorizedShares = client.originalAuthorizedShares ?? 0;
  }
  if (selection.modalDitempatkan) {
    result.originalCapitalPaid = client.originalCapitalPaid ?? client.targetCapitalPaid ?? 0;
    result.originalTotalShares = client.originalTotalShares ?? 0;
  }
  if (selection.modalDisetor) {
    result.originalCapitalPaid = client.originalCapitalPaid ?? client.targetCapitalPaid ?? 0;
    result.originalSharePrice = client.originalSharePrice ?? 0;
  }

  // 5. PEMEGANG SAHAM
  // Copy full array directly without length fallback. Even if [], Project becomes []
  if (selection.shareholders) {
    result.shareholders = (client.shareholders || []).map((s: any) => ({ ...s }));
  }

  // 6. PENGURUS
  if (selection.direksi || selection.komisaris || selection.oldManagement) {
    const rawMgmt = client.oldManagementItems || (client as any).managementItems || [];
    result.oldManagementItems = rawMgmt.map((m: any) => ({ ...m }));
  }
  if (selection.newManagement) {
    result.newManagementItems = (client.newManagementItems || []).map((m: any) => ({ ...m }));
  }

  // 7. AKTA PERUSAHAAN
  if (selection.establishmentDeed) {
    result.establishmentDeedNumber = client.establishmentDeedNumber || '';
    result.establishmentDeedDate = client.establishmentDeedDate || '';
    result.establishmentNotary = client.establishmentNotary || '';
    result.establishmentNotaryTitle = client.establishmentNotaryTitle || '';
    result.establishmentNotaryDomicile = client.establishmentNotaryDomicile || '';
    result.establishmentSkNumber = client.establishmentSkNumber || '';
    result.establishmentSkDate = client.establishmentSkDate || '';
  }
  if (selection.amendmentHistory) {
    result.amendmentDeeds = (client.amendmentDeeds || []).map((d: any) => ({ ...d }));
  }
  if (selection.latestAmendment) {
    result.latestAmendmentDeedNumber = client.latestAmendmentDeedNumber || '';
    result.latestAmendmentDeedDate = client.latestAmendmentDeedDate || '';
    result.latestAmendmentNotary = client.latestAmendmentNotary || '';
    result.latestAmendmentSkNumber = client.latestAmendmentSkNumber || '';
    result.latestAmendmentSkDate = client.latestAmendmentSkDate || '';
  }

  // STRICTLY PRESERVE ALL PROJECT-SPECIFIC FIELDS:
  result.nomorAkta = current.nomorAkta;
  result.nomorUrut = current.nomorUrut;
  result.tanggal = current.tanggal;
  result.waktu = current.waktu;
  result.signingPlace = current.signingPlace;
  result.signingDate = current.signingDate;
  result.aktaStartTime = current.aktaStartTime;
  result.meetingStartTime = current.meetingStartTime;
  result.meetingEndTime = current.meetingEndTime;
  result.meetingChair = current.meetingChair;
  result.meetingChairPosition = current.meetingChairPosition;
  result.invitationNumber = current.invitationNumber;
  result.invitationDate = current.invitationDate;
  result.meetingAgenda = current.meetingAgenda;
  result.resolutions = current.resolutions;
  result.selectedResolutions = current.selectedResolutions;
  result.shareTransfers = current.shareTransfers;
  result.finalShareholders = current.finalShareholders;
  result.targetCompanyName = current.targetCompanyName;
  result.targetCompanyShortName = current.targetCompanyShortName;
  result.targetCapitalBase = current.targetCapitalBase;
  result.targetCapitalPaid = current.targetCapitalPaid;
  result.capitalArticleNumber = current.capitalArticleNumber;
  result.domicileArticleNumber = current.domicileArticleNumber;
  result.managementChangeType = current.managementChangeType;
  result.managementEffectiveUntil = current.managementEffectiveUntil;
  result.managementEffectiveUntilType = current.managementEffectiveUntilType;
  result.managementEffectiveDate = current.managementEffectiveDate;
  result.reappointmentOldExpiredDate = current.reappointmentOldExpiredDate;
  result.reappointmentStartDate = current.reappointmentStartDate;
  result.reappointmentEndDate = current.reappointmentEndDate;
  result.draftAktaRupsNumber = current.draftAktaRupsNumber;
  result.draftAktaRupsOrderNumber = current.draftAktaRupsOrderNumber;
  result.draftAktaRupsDate = current.draftAktaRupsDate;
  result.draftAktaRupsTime = current.draftAktaRupsTime;
  result.notarySelectionType = current.notarySelectionType;
  result.notaryName = current.notaryName;
  result.notaryTitle = current.notaryTitle;
  result.notaryDomicile = current.notaryDomicile;
  result.notaryNumber = current.notaryNumber;
  result.notaryDate = current.notaryDate;
  result.saksi1Nama = current.saksi1Nama;
  result.saksi1LahirTempat = current.saksi1LahirTempat;
  result.saksi1LahirTanggal = current.saksi1LahirTanggal;
  result.saksi1Pekerjaan = current.saksi1Pekerjaan;
  result.saksi1Alamat = current.saksi1Alamat;
  result.saksi1NIK = current.saksi1NIK;
  result.saksi2Nama = current.saksi2Nama;
  result.saksi2LahirTempat = current.saksi2LahirTempat;
  result.saksi2LahirTanggal = current.saksi2LahirTanggal;
  result.saksi2Pekerjaan = current.saksi2Pekerjaan;
  result.saksi2Alamat = current.saksi2Alamat;
  result.saksi2NIK = current.saksi2NIK;
  result.documentStatus = current.documentStatus;
  result.minutaNotes = current.minutaNotes;

  return result;
}

export interface PullClientDataResult {
  success: boolean;
  message: string;
  updatedClient: CompanyProfile | null;
  updatedProject: Project | null;
  updatedFormData: any;
  syncedFieldsSummary: string[];
}

export class ClientProjectSyncService {
  /**
   * Fetches fresh client profile directly from Firestore, bypassing any local cache.
   */
  static async getFreshClientProfile(clientId: string): Promise<CompanyProfile | null> {
    if (!clientId) return null;
    return await CompanyService.getCompanyProfile(clientId, true);
  }

  /**
   * Pulls latest client data selectively and updates the project and its underlying document form.
   *
   * Guards:
   * - If project is completed/final, historical snapshots are protected and will NOT be modified.
   * - changeSnapshot.before and changeSnapshot.after are strictly immutable.
   * - project.title is NEVER auto-renamed.
   */
  static async pullLatestClientData(params: {
    projectId: string;
    clientId: string;
    jobType?: string;
    currentProject?: Project | null;
    currentFormData?: any;
    refId?: string;
    selection?: ClientSyncSelection;
  }): Promise<PullClientDataResult> {
    const { projectId, clientId, currentProject, currentFormData, refId } = params;
    const selection = params.selection || getAllSelectedSync();

    if (!clientId) {
      throw new Error('ID Klien tidak ditemukan pada proyek ini.');
    }

    // 1. Fetch project if not supplied
    let project = currentProject;
    if (!project && projectId) {
      project = await ProjectService.getProject(projectId);
    }

    // 2. Immutability guard for final / completed documents
    if (project && isProjectFinal(project)) {
      throw new Error(
        'Project ini sudah final sehingga data historis tidak dapat diperbarui dari Master Client.'
      );
    }

    // 3. Fetch latest fresh profile from profiles/{clientId}
    const freshClient = await this.getFreshClientProfile(clientId);
    if (!freshClient) {
      throw new Error(`Profil Klien dengan ID ${clientId} tidak ditemukan di database.`);
    }

    const effectiveJobType = project?.jobType || params.jobType || 'rups_lb';

    // 4. Resolve collection name for document form
    let collectionName = '';
    if (effectiveJobType === 'rups_lb' || effectiveJobType === 'sirkuler_rupslb') {
      collectionName = 'projects';
    } else if (effectiveJobType === 'rups_t' || effectiveJobType === 'sirkuler') {
      collectionName = 'rupst_projects';
    } else if (effectiveJobType === 'pendirian_pt' || effectiveJobType === 'pendirian' || effectiveJobType === 'pendirian_cv') {
      collectionName = 'pendirian_projects';
    }

    // 5. Fetch existing form data if not supplied
    let formData = currentFormData;
    const formDocId = refId || (project as any)?.metadata?.refId || projectId;

    if (!formData && collectionName && formDocId) {
      try {
        const formSnap = await getDoc(doc(db, collectionName, formDocId));
        if (formSnap.exists()) {
          formData = formSnap.data();
        }
      } catch (err) {
        console.warn(`[ClientProjectSyncService] Unable to load form doc from ${collectionName}/${formDocId}:`, err);
      }
    }

    // 6. Explicitly map Master Client fields to form data based on user selection
    const updatedFormData = syncClientMasterToFormData(formData, freshClient, effectiveJobType, selection);

    // 7. Save updated form data to Firestore if collection is defined
    if (collectionName && formDocId && updatedFormData) {
      const formDocRef = doc(db, collectionName, formDocId);
      const snap = await getDoc(formDocRef);
      if (snap.exists()) {
        await updateDoc(formDocRef, cleanUndefined(updatedFormData));
      } else {
        await setDoc(formDocRef, cleanUndefined(updatedFormData), { merge: true });
      }
    }

    // 8. Update project clientSnapshot in office_projects (ONLY for active projects and ONLY selected fields)
    let updatedProject: Project | null = project;
    if (projectId) {
      try {
        const projectRef = doc(db, 'office_projects', projectId);
        const projectDocSnap = await getDoc(projectRef);

        if (projectDocSnap.exists()) {
          const currentProjData = projectDocSnap.data() as Project;

          // Strictly protect final projects
          if (!isProjectFinal(currentProjData)) {
            const updatedSnapshot = applySelectiveSnapshotUpdates(
              currentProjData.clientSnapshot,
              freshClient,
              selection
            );

            // Note: We DO NOT auto-rename project.title
            // Note: We DO NOT touch changeSnapshot.before or changeSnapshot.after (they are immutable)
            const projectUpdates: any = {
              clientSnapshot: updatedSnapshot,
              updatedAt: new Date().toISOString()
            };

            await updateDoc(projectRef, cleanUndefined(projectUpdates));

            updatedProject = {
              ...currentProjData,
              ...projectUpdates
            } as Project;
          }
        }
      } catch (err) {
        console.warn(`[ClientProjectSyncService] Error updating project snapshot:`, err);
      }
    }

    // 9. Invalidate caches
    CompanyService.clearCache();
    ProjectService.clearCache();

    // 10. Prepare summary of synced fields
    const syncedFieldsSummary: string[] = [];
    if (selection.companyName) syncedFieldsSummary.push(`Nama Perusahaan: ${freshClient.companyName || '-'}`);
    if (selection.address || selection.domicile) syncedFieldsSummary.push(`Alamat / Domisili: ${freshClient.domicile || '-'}`);
    if (selection.kbli) syncedFieldsSummary.push(`KBLI: ${(freshClient.kbliItems || []).length} bidang usaha`);
    if (selection.shareholders) syncedFieldsSummary.push(`Pemegang Saham: ${(freshClient.shareholders || []).length} entitas`);
    if (selection.direksi || selection.komisaris || selection.oldManagement) syncedFieldsSummary.push(`Pengurus: ${(freshClient.oldManagementItems || []).length} orang`);
    if (selection.establishmentDeed) syncedFieldsSummary.push(`Akta Pendirian: No. ${freshClient.establishmentDeedNumber || '-'}`);
    if (selection.amendmentHistory) syncedFieldsSummary.push(`Riwayat Akta: ${(freshClient.amendmentDeeds || []).length} akta`);

    return {
      success: true,
      message: 'Data Klien berhasil diperbarui dari Profil Klien terbaru sesuai pilihan.',
      updatedClient: freshClient,
      updatedProject,
      updatedFormData,
      syncedFieldsSummary
    };
  }
}
