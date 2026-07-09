export interface ChairCandidate {
  name: string;
  position: string;
}

export function getRupsLbChairCandidates(
  shareholders: any[] = [],
  oldManagementItems: any[] = []
): ChairCandidate[] {
  const shItems = (shareholders || [])
    .filter(sh => sh.isManagement && /direksi|direktur|komisaris/i.test(sh.managementPosition || ''))
    .map(sh => JSON.stringify({ name: sh.name, position: sh.managementPosition }));

  const oldMgmtItems = (oldManagementItems || [])
    .filter(m => /direksi|direktur|komisaris/i.test(m.position || ''))
    .map(m => JSON.stringify({ name: m.name, position: m.position }));

  const proxyItems = (shareholders || [])
    .filter(sh => sh.isPresent && sh.isProxy && sh.proxyData?.name)
    .map(sh => JSON.stringify({ name: sh.proxyData!.name, position: 'Kuasa Pemegang Saham' }));

  const combined = Array.from(new Set([...shItems, ...oldMgmtItems, ...proxyItems]));
  return combined.map(str => JSON.parse(str));
}

export function resolveRupsLbChairPosition(
  selectedName: string,
  candidates: ChairCandidate[]
): string {
  const found = candidates.find(c => c.name === selectedName);
  return found ? found.position : "";
}
