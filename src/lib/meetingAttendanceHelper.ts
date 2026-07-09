export function getPhysicallyPresentShareholders(shareholders: any[]): any[] {
  return (shareholders || []).filter((s) => s.isPresent);
}
