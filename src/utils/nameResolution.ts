/**
 * Name Resolution & Academic/Professional Title Normalization
 * Strictly implements PILIHAN A (Conservative Policy):
 * - Normalizes titles and honorifics (S.H., M.Kn., Drs., Dr., Ir., H., Hj., etc.)
 * - Exact base name match is required for identity union.
 * - Any spelling variation in base name (e.g. Hendra Wijaya vs Hendra Widjaya)
 *   MUST NOT auto-merge and MUST enter manual review quarantine.
 */

const KNOWN_PREFIX_TITLES = [
  'dr.', 'dr', 'drs.', 'drs', 'dra.', 'dra', 'ir.', 'ir',
  'prof.', 'prof', 'h.', 'h', 'hj.', 'hj', 'k.h.', 'kh',
  'raden', 'r.', 'tb.', 'tubagus', 'st.', 'sutan'
];

const KNOWN_SUFFIX_TITLES = [
  's.h.', 'sh', 'm.kn.', 'mkn', 's.e.', 'se', 'm.m.', 'mm',
  's.t.', 'st', 'm.t.', 'mt', 's.kom.', 'skom', 'm.kom.', 'mkom',
  's.sos.', 'ssos', 'm.si.', 'msi', 's.ked.', 'sked',
  's.psi.', 'spsi', 'm.psi.', 'mpsi', 'ak.', 'ak', 'cpa', 'ca',
  'b.sc.', 'bsc', 'm.sc.', 'msc', 'ph.d.', 'phd', 'll.m.', 'llm',
  'bba', 'mba'
];

export interface ParsedNameResult {
  rawName: string;
  normalizedBaseName: string;
  detectedTitles: string[];
}

/**
 * Normalizes title punctuation (e.g. 'S H' -> 'S.H.', 'M Kn' -> 'M.Kn.')
 */
export function normalizeTitlePunctuation(title: string): string {
  const clean = title.trim().toUpperCase().replace(/\./g, '');
  if (clean === 'SH') return 'S.H.';
  if (clean === 'MKN') return 'M.Kn.';
  if (clean === 'SE') return 'S.E.';
  if (clean === 'MM') return 'M.M.';
  if (clean === 'ST') return 'S.T.';
  if (clean === 'MT') return 'M.T.';
  if (clean === 'SKOM') return 'S.Kom.';
  if (clean === 'MKOM') return 'M.Kom.';
  if (clean === 'SSOS') return 'S.Sos.';
  if (clean === 'MSI') return 'M.Si.';
  if (clean === 'DRS') return 'Drs.';
  if (clean === 'DRA') return 'Dra.';
  if (clean === 'IR') return 'Ir.';
  if (clean === 'DR') return 'Dr.';
  if (clean === 'PROF') return 'Prof.';
  if (clean === 'HJ') return 'Hj.';
  if (clean === 'H') return 'H.';
  return title.trim().toUpperCase();
}

/**
 * Parses raw person name into normalized base name and extracted titles.
 */
export function parsePersonName(rawName: string): ParsedNameResult {
  if (!rawName || typeof rawName !== 'string') {
    return { rawName: '', normalizedBaseName: '', detectedTitles: [] };
  }

  const detectedTitles: string[] = [];
  let nameStr = rawName.trim();

  // 1. Check for comma-separated suffix titles (e.g. "Hendra Wijaya, S.H., M.Kn.")
  if (nameStr.includes(',')) {
    const parts = nameStr.split(',').map(p => p.trim()).filter(Boolean);
    nameStr = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const partLower = part.toLowerCase().replace(/\./g, '');
      if (KNOWN_SUFFIX_TITLES.includes(partLower) || KNOWN_SUFFIX_TITLES.includes(part.toLowerCase())) {
        detectedTitles.push(normalizeTitlePunctuation(part));
      } else {
        // If not a known title suffix, check if it's multiple tokens
        const subTokens = part.split(/\s+/);
        for (const st of subTokens) {
          const stLower = st.toLowerCase().replace(/\./g, '');
          if (KNOWN_SUFFIX_TITLES.includes(stLower)) {
            detectedTitles.push(normalizeTitlePunctuation(st));
          } else {
            // Keep in nameStr if it wasn't a title
            nameStr += ' ' + st;
          }
        }
      }
    }
  }

  // 2. Tokenize remaining words to strip prefix and trailing suffix titles
  let tokens = nameStr.split(/\s+/).filter(Boolean);

  // Check prefix titles from the front
  while (tokens.length > 1) {
    const firstLower = tokens[0].toLowerCase().replace(/\./g, '');
    if (KNOWN_PREFIX_TITLES.includes(firstLower) || KNOWN_PREFIX_TITLES.includes(tokens[0].toLowerCase())) {
      detectedTitles.push(normalizeTitlePunctuation(tokens[0]));
      tokens.shift();
    } else {
      break;
    }
  }

  // Check suffix titles from the back
  while (tokens.length > 1) {
    const lastLower = tokens[tokens.length - 1].toLowerCase().replace(/\./g, '');
    if (KNOWN_SUFFIX_TITLES.includes(lastLower) || KNOWN_SUFFIX_TITLES.includes(tokens[tokens.length - 1].toLowerCase())) {
      detectedTitles.push(normalizeTitlePunctuation(tokens[tokens.length - 1]));
      tokens.pop();
    } else {
      break;
    }
  }

  // Clean and normalize base name
  const normalizedBaseName = tokens
    .join(' ')
    .toUpperCase()
    .replace(/[^A-Z0-9\s'’-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    rawName,
    normalizedBaseName,
    detectedTitles
  };
}

/**
 * Checks if two names can be automatically resolved under PILIHAN A:
 * - Returns match: true ONLY if normalizedBaseNames are IDENTICAL.
 * - If normalizedBaseNames differ (even slight spelling difference), returns match: false
 *   and indicates whether manual review / conflict is required.
 */
export function evaluateNameCompatibility(nameA: string, nameB: string): {
  isExactBaseMatch: boolean;
  baseA: string;
  baseB: string;
  titlesA: string[];
  titlesB: string[];
  spellingMismatch: boolean;
} {
  const parsedA = parsePersonName(nameA);
  const parsedB = parsePersonName(nameB);

  const isExactBaseMatch = parsedA.normalizedBaseName.length > 0 && 
                           parsedA.normalizedBaseName === parsedB.normalizedBaseName;

  const spellingMismatch = !isExactBaseMatch && 
                           parsedA.normalizedBaseName.length > 0 && 
                           parsedB.normalizedBaseName.length > 0;

  return {
    isExactBaseMatch,
    baseA: parsedA.normalizedBaseName,
    baseB: parsedB.normalizedBaseName,
    titlesA: parsedA.detectedTitles,
    titlesB: parsedB.detectedTitles,
    spellingMismatch
  };
}
