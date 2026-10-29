import { ManagementItem, Shareholder } from '../../../../types';

/**
 * Extracts management members (Direksi and Dewan Komisaris) from any company data source,
 * checking oldManagementItems, newManagementItems, managementItems, shareholders, and project parties.
 */
export function extractManagementFromSource(source: any): ManagementItem[] {
  if (!source) return [];

  const results: ManagementItem[] = [];
  const seenNames = new Set<string>();

  const addIfNew = (item: Partial<ManagementItem>) => {
    const rawName = (item.name || '').trim();
    if (!rawName) return;
    const key = rawName.toUpperCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);

    results.push({
      id: item.id || `mgmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      salutation: item.salutation || 'Tuan',
      name: rawName,
      position: item.position || 'Direktur',
      isPresent: item.isPresent !== false,
      ...(item.nik ? { nik: item.nik } : {}),
      ...(item.birthCity ? { birthCity: item.birthCity } : {}),
      ...(item.birthDate ? { birthDate: item.birthDate } : {}),
      ...(item.address ? { address: item.address } : {})
    });
  };

  // 1. Explicit oldManagementItems
  if (Array.isArray(source.oldManagementItems) && source.oldManagementItems.length > 0) {
    source.oldManagementItems.forEach((m: any) => addIfNew(m));
  }

  // 2. Explicit newManagementItems
  if (Array.isArray(source.newManagementItems) && source.newManagementItems.length > 0) {
    source.newManagementItems.forEach((m: any) => addIfNew(m));
  }

  // 3. Explicit managementItems
  if (Array.isArray(source.managementItems) && source.managementItems.length > 0) {
    source.managementItems.forEach((m: any) => addIfNew(m));
  }

  // 4. Extract from shareholders (Master Client stores management here)
  if (Array.isArray(source.shareholders) && source.shareholders.length > 0) {
    source.shareholders.forEach((sh: any) => {
      const pos = (sh.managementPosition || sh.position || sh.jabatan || '').trim();
      const isMgmt = sh.isManagement || /direktur|direksi|komisaris/i.test(pos);
      if (sh.name && isMgmt) {
        addIfNew({
          id: sh.id ? `mgmt-${sh.id}` : undefined,
          salutation: sh.salutation || 'Tuan',
          name: sh.name,
          position: pos || (sh.isManagement ? 'Direktur Utama' : 'Direktur'),
          isPresent: true,
          nik: sh.nik || '',
          birthCity: sh.birthCity || '',
          birthDate: sh.birthDate || '',
          address: sh.address
        });
      }
    });
  }

  // 5. Explicit boardOfDirectors / boardOfCommissioners / pengurus if present
  if (Array.isArray(source.directors)) {
    source.directors.forEach((d: any) => addIfNew({ ...d, position: d.position || 'Direktur' }));
  }
  if (Array.isArray(source.commissioners)) {
    source.commissioners.forEach((c: any) => addIfNew({ ...c, position: c.position || 'Komisaris' }));
  }
  if (Array.isArray(source.pengurus)) {
    source.pengurus.forEach((p: any) => addIfNew({ ...p, position: p.position || p.jabatan || 'Direktur' }));
  }

  // 6. Project parties (Data Personil)
  if (Array.isArray(source.parties) && source.parties.length > 0) {
    source.parties.forEach((p: any) => {
      const pos = (p.jabatan || '').trim();
      if (p.name && /direktur|direksi|komisaris/i.test(pos)) {
        addIfNew({
          id: p.id ? `mgmt-${p.id}` : undefined,
          salutation: 'Tuan',
          name: p.name,
          position: pos,
          isPresent: true,
          nik: p.nik || ''
        });
      }
    });
  }

  return results;
}
