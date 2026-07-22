export interface ChairCandidate {
  name: string;
  position: string;
}

export function getRupsLbChairCandidates(
  shareholders: any[] = [],
  oldManagementItems: any[] = []
): ChairCandidate[] {
  const shItems = (shareholders || [])
    .filter(sh => sh.name && (sh.isManagement || /direksi|direktur|komisaris/i.test(sh.managementPosition || sh.position || '')))
    .map(sh => JSON.stringify({ name: sh.name, position: sh.managementPosition || sh.position || 'Direktur' }));

  const oldMgmtItems = (oldManagementItems || [])
    .filter(m => m.name && (m.position || /direksi|direktur|komisaris/i.test(m.position || '')))
    .map(m => JSON.stringify({ name: m.name, position: m.position || 'Direktur' }));

  const proxyItems = (shareholders || [])
    .filter(sh => sh.isPresent && sh.isProxy && sh.proxyData?.name)
    .map(sh => JSON.stringify({ name: sh.proxyData!.name, position: 'Kuasa Pemegang Saham' }));

  let combined = Array.from(new Set([...shItems, ...oldMgmtItems, ...proxyItems]));

  // Fallback if regex filtering returned nothing but data exists
  if (combined.length === 0 && (oldManagementItems.length > 0 || shareholders.length > 0)) {
    const fallbackMgmt = (oldManagementItems || []).filter(m => m.name).map(m => JSON.stringify({ name: m.name, position: m.position || 'Pengurus' }));
    const fallbackSh = (shareholders || []).filter(sh => sh.name).map(sh => JSON.stringify({ name: sh.name, position: sh.managementPosition || sh.position || 'Pemegang Saham' }));
    combined = Array.from(new Set([...fallbackMgmt, ...fallbackSh]));
  }

  return combined.map(str => JSON.parse(str));
}

export function resolveRupsLbChairPosition(
  selectedName: string,
  candidates: ChairCandidate[]
): string {
  const found = candidates.find(c => c.name === selectedName);
  return found ? found.position : "";
}
