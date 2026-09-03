import { PPATParty, PPATObjectData } from '../../../../domain/project/Project';

/**
 * Checks if a city string represents a "Kota" (City) or "Kabupaten" (Regency).
 * Returns true if Kota, false if Kabupaten / Regency / default.
 */
export function isCityKota(city?: string): boolean {
  if (!city || !city.trim()) return false;
  const c = city.trim().toLowerCase();
  
  // If it contains "kabupaten" or "kab.", it is definitely a Kabupaten
  if (c.includes('kabupaten') || c.startsWith('kab.') || c.startsWith('kab ')) {
    return false;
  }
  
  // If it starts with or contains "kota", or is a known Indonesian Kota
  if (c.startsWith('kota') || c.includes('kota ') || c === 'kota') {
    return true;
  }
  
  // Known major Indonesian Kotas without "Kota" prefix if entered by user
  const knownKotas = [
    'cimahi', 'bandung', 'jakarta', 'surabaya', 'semarang', 'medan', 'makassar', 
    'bekasi', 'depok', 'tangerang', 'tangerang selatan', 'bogor', 'surakarta', 
    'solo', 'yogyakarta', 'jogja', 'malang', 'denpasar', 'padang', 'pekanbaru', 
    'palembang', 'batam', 'balikpapan', 'samarinda', 'pontianak', 'banjarmasin', 
    'manado', 'mataram', 'kupang', 'ambon', 'jayapura', 'cirebon', 'sukabumi', 
    'tasikmalaya', 'magelang', 'pekalongan', 'tegal', 'kediri', 'blitar', 'madiun', 
    'probolinggo', 'pasuruan', 'batu', 'salatiga'
  ];
  
  // Note: if it is "bandung barat", it is Kabupaten Bandung Barat, not Kota Bandung
  if (c.includes('bandung barat') || c.includes('bogor barat') || c.includes('bogor timur')) {
    return false;
  }
  
  return false;
}

/**
 * Returns formatted city string (e.g. "Kota Bandung" or "Kabupaten Bandung Barat")
 */
export function formatCityName(city?: string): string {
  if (!city || !city.trim()) return '';
  const trimmed = city.trim();
  const lower = trimmed.toLowerCase();

  // If already prefixed with "Kota"
  if (lower.startsWith('kota ') || lower === 'kota') {
    const clean = trimmed.replace(/^kota\s*/i, '').trim();
    return clean ? `Kota ${clean}` : 'Kota';
  }

  // If already prefixed with "Kabupaten" or "Kab."
  if (lower.startsWith('kabupaten ') || lower === 'kabupaten' || lower.startsWith('kab.') || lower.startsWith('kab ')) {
    const clean = trimmed.replace(/^(kabupaten|kab\.|kab)\s*/i, '').trim();
    return clean ? `Kabupaten ${clean}` : 'Kabupaten';
  }

  // If it's a Kota
  if (isCityKota(trimmed)) {
    return `Kota ${trimmed}`;
  }

  // Default to Kabupaten (e.g. "Bandung Barat" -> "Kabupaten Bandung Barat")
  return `Kabupaten ${trimmed}`;
}

/**
 * Formats village/kelurahan name with proper "Desa" or "Kelurahan" prefix based on city type.
 */
export function formatVillageName(village?: string, city?: string): string {
  if (!village || !village.trim()) return '';
  const trimmed = village.trim();
  const isKota = isCityKota(city);
  const prefix = isKota ? 'Kelurahan' : 'Desa';

  // Strip existing prefix if user entered "Desa Sukamaju" or "Kelurahan Dago" or "Kel. Dago"
  const clean = trimmed.replace(/^(desa|kelurahan|kel\.|kel|ds\.|ds)\s+/i, '').trim();
  return clean ? `${prefix} ${clean}` : '';
}

/**
 * Formats clean village name without prefix (for tables that already have Desa/Kelurahan label)
 */
export function formatCleanVillage(village?: string): string {
  if (!village || !village.trim()) return '';
  return village.trim().replace(/^(desa|kelurahan|kel\.|kel|ds\.|ds)\s+/i, '').trim();
}

/**
 * Formats district name with proper "Kecamatan" prefix
 */
export function formatDistrictName(district?: string): string {
  if (!district || !district.trim()) return '';
  const trimmed = district.trim();
  const clean = trimmed.replace(/^(kecamatan|kec\.|kec)\s+/i, '').trim();
  return clean ? `Kecamatan ${clean}` : '';
}

/**
 * Formats clean district name without prefix
 */
export function formatCleanDistrict(district?: string): string {
  if (!district || !district.trim()) return '';
  return district.trim().replace(/^(kecamatan|kec\.|kec)\s+/i, '').trim();
}

/**
 * Formats clean RT/RW string (e.g. "RT. 02 / RW. 05")
 */
export function formatRtRw(rt?: string, rw?: string): string {
  const cleanRt = rt ? rt.trim().replace(/^rt\.?\s*/i, '') : '';
  const cleanRw = rw ? rw.trim().replace(/^rw\.?\s*/i, '') : '';

  if (cleanRt && cleanRw) {
    return `RT. ${cleanRt} / RW. ${cleanRw}`;
  }
  if (cleanRt) {
    return `RT. ${cleanRt}`;
  }
  if (cleanRw) {
    return `RW. ${cleanRw}`;
  }
  return '';
}

/**
 * Constructs a complete formal address for a PPAT Party:
 * Format: [Jalan/Blok/No], RT [rt] / RW [rw], [Desa/Kelurahan] [Nama], Kecamatan [Nama], [Kabupaten/Kota] [Nama]
 */
export function formatFullPartyAddress(party?: PPATParty | null): string {
  if (!party) return '';

  // For Legal Entities with Company Address
  if (party.isLegalEntity && (party.companyAddress || party.address)) {
    return (party.companyAddress || party.address || '').trim();
  }

  const parts: string[] = [];

  // 1. Street / Building / House number
  if (party.address && party.address.trim()) {
    parts.push(party.address.trim());
  }

  // 2. RT / RW
  const rtRwStr = formatRtRw(party.rt, party.rw);
  if (rtRwStr) {
    parts.push(rtRwStr);
  }

  // 3. Desa / Kelurahan
  if (party.village && party.village.trim()) {
    parts.push(formatVillageName(party.village, party.city));
  }

  // 4. Kecamatan
  if (party.district && party.district.trim()) {
    parts.push(formatDistrictName(party.district));
  }

  // 5. Kabupaten / Kota
  if (party.city && party.city.trim()) {
    parts.push(formatCityName(party.city));
  }

  if (parts.length === 0) {
    return '';
  }

  return parts.join(', ');
}

/**
 * Constructs a complete formal location address for an Object (Tanah / Bangunan)
 */
export function formatFullObjectAddress(obj?: PPATObjectData | null): string {
  if (!obj) return '';

  const parts: string[] = [];

  if (obj.location && obj.location.trim()) {
    parts.push(obj.location.trim());
  }

  const rtRwStr = formatRtRw(obj.rt, obj.rw);
  if (rtRwStr) {
    parts.push(rtRwStr);
  }

  if (obj.village && obj.village.trim()) {
    parts.push(formatVillageName(obj.village, obj.city));
  }

  if (obj.district && obj.district.trim()) {
    parts.push(formatDistrictName(obj.district));
  }

  if (obj.city && obj.city.trim()) {
    parts.push(formatCityName(obj.city));
  }

  return parts.join(', ');
}
