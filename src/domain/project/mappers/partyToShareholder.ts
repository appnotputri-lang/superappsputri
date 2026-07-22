import { Party } from '../Project';
import { Shareholder } from '../../../../types';

/**
 * Maps a Project Party (Data Personil) into a Partial<Shareholder> suitable for RUPS LB / RUPST forms.
 */
export function mapPartyToShareholder(party: Party): Partial<Shareholder> {
  const cleanJabatan = (party.jabatan || '').trim();
  const isManagement = /direktur|direksi|komisaris/i.test(cleanJabatan);
  const kewarganegaraanUpper = (party.kewarganegaraan || '').toUpperCase();
  const isWni = kewarganegaraanUpper.includes('WNI') || (!kewarganegaraanUpper.includes('WNA') && !kewarganegaraanUpper.includes('FOREIGN'));

  const mapped: Partial<Shareholder> = {
    id: party.id || Math.random().toString(36).substring(7),
    salutation: 'Tuan',
    name: party.name,
    nik: party.nik || '',
    occupation: party.pekerjaan || '',
    nationalityType: isWni ? 'WNI' : 'WNA',
    nationality: isWni ? 'Indonesia' : party.kewarganegaraan || 'WNA',
    isManagement: isManagement,
    managementPosition: cleanJabatan,
    linkedPartyId: party.id,
    address: {
      province: '',
      city: '',
      fullAddress: party.alamat || '',
      rt: '',
      rw: '',
      kelurahan: '',
      kecamatan: '',
    },
    sharesOwned: party.sahamPercentage ? Math.round(party.sahamPercentage) : 0,
    shareholderType: 'PERORANGAN',
  };

  return mapped;
}

/**
 * Maps an array of Project Parties to Shareholders and Management Items.
 */
export function mapPartiesToShareholdersAndManagement(parties: Party[] = []): {
  shareholders: Shareholder[];
  oldManagementItems: { id: string; name: string; position: string; nik?: string }[];
} {
  const shareholders: Shareholder[] = [];
  const oldManagementItems: { id: string; name: string; position: string; nik?: string }[] = [];

  for (const party of parties) {
    const sh = mapPartyToShareholder(party) as Shareholder;
    shareholders.push(sh);

    if (sh.isManagement && sh.managementPosition) {
      oldManagementItems.push({
        id: party.id || Math.random().toString(36).substring(7),
        name: party.name,
        position: sh.managementPosition,
        nik: party.nik || ''
      });
    }
  }

  return { shareholders, oldManagementItems };
}
