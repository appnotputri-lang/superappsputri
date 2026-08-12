export const sanitizeForFirestore = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          newObj[key] = sanitizeForFirestore(val);
        }
      }
    }
    return newObj;
  }
  return obj;
};

export function normalizeCompanyName(name: string): string {
  if (!name) return 'unknown';
  
  // Normalize spaces and case for processing
  let processed = name.toUpperCase().replace(/\s+/g, ' ').trim();
  
  // Strip common prefixes (case-insensitive via upperCase)
  // Longest strings first to avoid partial matches
  processed = processed.replace(/^(PERSEKUTUAN FIRMA|PERSEKUTUAN PERDATA)\.?\s+/g, '');
  processed = processed.replace(/^(PT|CV|YAYASAN|PERKUMPULAN|KOPERASI|PMA|PERORANGAN)\.?\s+/g, '');

  return processed.toLowerCase().trim();
}

export function getUniqueClientKey(clientType: string, companyName: string): string {
  const norm = normalizeCompanyName(companyName);
  const type = (clientType || 'PT').toLowerCase().trim();
  return `${type}:${norm}`;
}

