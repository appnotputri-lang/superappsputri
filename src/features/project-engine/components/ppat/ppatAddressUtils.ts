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

/**
 * Determines honorific ("Tuan", "Nyonya", "Nona") based on gender and marital status.
 * Rules:
 * - Legal Entity (Badan Hukum) -> ""
 * - Laki-laki -> "Tuan"
 * - Perempuan:
 *   - Belum Menikah -> "Nona"
 *   - Menikah / Cerai / Default -> "Nyonya"
 * - Returns "" if unknown / entity
 */
export function getPersonHonorific(party?: Partial<PPATParty> | null): string {
  if (!party) return '';
  if (party.isLegalEntity) return '';

  const rawGender = (party.jenisKelamin || (party as any).gender || '').trim().toLowerCase();
  const rawStatus = (party.statusPerkawinan || (party as any).maritalStatus || '').trim().toLowerCase();

  // Check Laki-laki
  if (
    rawGender === 'laki-laki' ||
    rawGender === 'laki - laki' ||
    rawGender === 'laki-laki (tuan)' ||
    rawGender.includes('laki') ||
    rawGender.includes('pria') ||
    rawGender === 'male' ||
    rawGender === 'l'
  ) {
    return 'Tuan';
  }

  // Check Perempuan
  if (
    rawGender === 'perempuan' ||
    rawGender === 'perempuan (nona / nyonya)' ||
    rawGender.includes('perempuan') ||
    rawGender.includes('wanita') ||
    rawGender === 'female' ||
    rawGender === 'p'
  ) {
    if (
      rawStatus.includes('belum') ||
      rawStatus.includes('lajang') ||
      rawStatus.includes('single') ||
      rawStatus.includes('gadis')
    ) {
      return 'Nona';
    }
    return 'Nyonya';
  }

  // If party has spouse consent or spouse name defined
  if (party.hasSpouseConsent || party.spouseName) {
    if (party.spouseConsentType === 'suami') {
      return 'Nyonya';
    }
    if (party.spouseConsentType === 'istri') {
      return 'Tuan';
    }
  }

  return '';
}

/**
 * Compares two names safely by trimming whitespace, normalizing multiple spaces, and case-insensitivity.
 */
export function areNamesEqual(name1?: string, name2?: string): boolean {
  if (!name1 && !name2) return true;
  if (!name1 || !name2) return false;
  const n1 = name1.trim().replace(/\s+/g, ' ').toLowerCase();
  const n2 = name2.trim().replace(/\s+/g, ' ').toLowerCase();
  return n1 === n2;
}

/**
 * Formats numeric value as Rupiah currency string.
 */
export function formatRupiah(val?: number): string {
  if (!val || isNaN(val)) return 'Rp 0';
  return `Rp ${val.toLocaleString('id-ID')},-`;
}

/**
 * Converts a number to Indonesian word representation (Terbilang).
 */
export function terbilang(n: number): string {
  if (n <= 0 || isNaN(n)) return "Nol Rupiah";
  const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  const bilang = (num: number): string => {
    num = Math.floor(num);
    if (num < 12) return satuan[num];
    if (num < 20) return bilang(num - 10) + " Belas";
    if (num < 100) return bilang(Math.floor(num / 10)) + " Puluh" + (num % 10 !== 0 ? " " + bilang(num % 10) : "");
    if (num < 200) return "Seratus" + (num % 100 !== 0 ? " " + bilang(num % 100) : "");
    if (num < 1000) return bilang(Math.floor(num / 100)) + " Ratus" + (num % 100 !== 0 ? " " + bilang(num % 100) : "");
    if (num < 2000) return "Seribu" + (num % 1000 !== 0 ? " " + bilang(num % 1000) : "");
    if (num < 1000000) return bilang(Math.floor(num / 1000)) + " Ribu" + (num % 1000 !== 0 ? " " + bilang(num % 1000) : "");
    if (num < 1000000000) return bilang(Math.floor(num / 1000000)) + " Juta" + (num % 1000000 !== 0 ? " " + bilang(num % 1000000) : "");
    if (num < 1000000000000) return bilang(Math.floor(num / 1000000000)) + " Milyar" + (num % 1000000000 !== 0 ? " " + bilang(num % 1000000000) : "");
    if (num < 1000000000000000) return bilang(Math.floor(num / 1000000000000)) + " Triliun" + (num % 1000000000000 !== 0 ? " " + bilang(num % 1000000000000) : "");
    return num.toString();
  };
  return bilang(n).trim() + " Rupiah";
}

/**
 * Constructs clean generated formal address string for Property Location.
 */
export function formatFullObjectLocationString(loc?: any): string {
  if (!loc) return '';
  const parts: string[] = [];
  if (loc.address?.trim()) parts.push(loc.address.trim());
  const rtRw = formatRtRw(loc.rt, loc.rw);
  if (rtRw) parts.push(rtRw);
  if (loc.village?.trim()) parts.push(formatVillageName(loc.village, loc.city));
  if (loc.district?.trim()) parts.push(formatDistrictName(loc.district));
  if (loc.city?.trim()) parts.push(formatCityName(loc.city));
  if (loc.province?.trim()) parts.push(loc.province.trim());
  return parts.join(', ');
}

export function createDefaultParty(defaultNamePrefix: string = 'Pihak'): PPATParty {
  return {
    id: 'party_' + Date.now() + '_' + Math.random().toString(36).substring(7),
    name: '',
    ktpName: '',
    nik: '',
    jenisKelamin: 'Laki-laki',
    statusPerkawinan: 'Menikah',
    birthPlace: '',
    birthDate: '',
    job: 'Swasta',
    address: '',
    rt: '',
    rw: '',
    village: '',
    district: '',
    city: 'Bandung Barat',
    province: 'Jawa Barat',
    citizenship: 'Indonesia',
    isLegalEntity: false
  };
}

export function createDefaultObject(): PPATObjectData {
  return {
    namaDalamSertipikat: '',
    certificateType: 'SHM',
    certificateNumber: '',
    measurementDocType: 'Surat Ukur',
    measurementDocNumber: '',
    nomorSuratUkur: '',
    measurementDocDate: '',
    landArea: 0,
    buildingArea: 0,
    nib: '',
    nop: '',
    spptName: '',
    njop: 0,
    location: '',
    rt: '',
    rw: '',
    village: '',
    district: '',
    city: 'Bandung Barat',
    province: 'Jawa Barat',
    landUseType: 'non_pertanian',
    landUse: 'TANAH KOSONG',
    transactionStatus: 'telah',
    transactionDate: new Date().toISOString().split('T')[0],
    transactionValue: 0
  };
}

/**
 * Normalizes PPATData to guarantee all 7 structured sections exist
 * while preserving complete two-way compatibility with legacy root properties.
 */
export function normalizePPATData(data?: any): any {
  if (!data) data = {};

  const rawObj = data.object || {};

  const firstParties = data.firstParties?.length
    ? data.firstParties
    : (data.parties?.firstParties?.length ? data.parties.firstParties : [createDefaultParty('Pihak Pertama')]);

  const secondParties = data.secondParties?.length
    ? data.secondParties
    : (data.parties?.secondParties?.length ? data.parties.secondParties : [createDefaultParty('Pihak Kedua')]);

  // 1. DATA SERTIPIKAT
  const certData = {
    namaDalamSertipikat: data.certificate?.namaDalamSertipikat || rawObj.namaDalamSertipikat || rawObj.ownerName || rawObj.holderName || '',
    certificateType: data.certificate?.certificateType || rawObj.certificateType || rawObj.documentType || 'SHM',
    certificateNumber: data.certificate?.certificateNumber || rawObj.certificateNumber || '',
    measurementDocType: data.certificate?.measurementDocType || rawObj.measurementDocType || 'Surat Ukur',
    measurementDocNumber: data.certificate?.measurementDocNumber || rawObj.measurementDocNumber || rawObj.nomorSuratUkur || '',
    nomorSuratUkur: data.certificate?.nomorSuratUkur || rawObj.nomorSuratUkur || rawObj.measurementDocNumber || '',
    measurementDocDate: data.certificate?.measurementDocDate || rawObj.measurementDocDate || '',
    landArea: Number(data.certificate?.landArea ?? rawObj.landArea ?? 0),
    nib: data.certificate?.nib || rawObj.nib || '',
    notes: data.certificate?.notes || ''
  };

  // 2. DATA PBB
  const pbbData = {
    nop: data.pbb?.nop || rawObj.nop || '',
    spptName: data.pbb?.spptName || rawObj.spptName || certData.namaDalamSertipikat || '',
    taxYear: data.pbb?.taxYear || data.pbbTaxYear || String(new Date().getFullYear()),
    njopLand: Number(data.pbb?.njopLand ?? data.njopLand ?? 0),
    njopBuilding: Number(data.pbb?.njopBuilding ?? data.njopBuilding ?? 0),
    njop: Number(data.pbb?.njop ?? rawObj.njop ?? 0),
    totalNjop: Number(data.pbb?.totalNjop ?? data.pbb?.njop ?? rawObj.njop ?? 0),
    notes: data.pbb?.notes || ''
  };

  // 3. DATA LETAK OBJEK
  const locData = {
    address: data.propertyLocation?.address || rawObj.address || rawObj.location || '',
    rt: data.propertyLocation?.rt || rawObj.rt || '',
    rw: data.propertyLocation?.rw || rawObj.rw || '',
    village: data.propertyLocation?.village || rawObj.village || '',
    district: data.propertyLocation?.district || rawObj.district || '',
    city: data.propertyLocation?.city || rawObj.city || 'Bandung Barat',
    province: data.propertyLocation?.province || rawObj.province || 'Jawa Barat',
    persil: data.propertyLocation?.persil || rawObj.persil || '',
    kohir: data.propertyLocation?.kohir || rawObj.kohir || '',
    landUseType: data.propertyLocation?.landUseType || rawObj.landUseType || data.landUseType || 'non_pertanian',
    landUse: data.propertyLocation?.landUse || rawObj.landUse || data.landUse || 'TANAH KOSONG',
    buildingArea: Number(data.propertyLocation?.buildingArea ?? rawObj.buildingArea ?? 0),
    notes: data.propertyLocation?.notes || '',
    formatAlamatAkta: ''
  };
  locData.formatAlamatAkta = formatFullObjectLocationString(locData);

  // 4. DATA TRANSAKSI
  const transData = {
    transactionStatus: data.transaction?.transactionStatus || rawObj.transactionStatus || 'telah',
    transactionDate: data.transaction?.transactionDate || rawObj.transactionDate || new Date().toISOString().split('T')[0],
    transactionValue: Number(data.transaction?.transactionValue ?? rawObj.transactionValue ?? 0),
    paymentMethod: data.transaction?.paymentMethod || 'Tunai',
    notes: data.transaction?.notes || ''
  };

  // 5. DATA AKTA PPAT
  const aktaData = {
    jenisAkta: data.akta?.jenisAkta || data.transactionType || 'Akta Jual Beli (AJB)',
    nomorAkta: data.akta?.nomorAkta || data.nomorAkta || '',
    tahunAkta: data.akta?.tahunAkta || data.tahunAkta || String(new Date().getFullYear()),
    tanggalAkta: data.akta?.tanggalAkta || data.tanggalAkta || '',
    dasarPerolehan: data.akta?.dasarPerolehan || '',
    notes: data.akta?.notes || ''
  };

  // 6. DATA BPN / PERMOHONAN
  const bpnData = {
    nomorSuratKuasa: data.bpnApplication?.nomorSuratKuasa || data.nomorSuratKuasa || '',
    tanggalSuratKuasa: data.bpnApplication?.tanggalSuratKuasa || data.tanggalSuratKuasa || '',
    jenisPermohonan: data.bpnApplication?.jenisPermohonan || data.permohonanPerihal || 'Permohonan PERALIHAN HAK',
    permohonanNomor: data.bpnApplication?.permohonanNomor || data.permohonanNomor || '',
    permohonanTempat: data.bpnApplication?.permohonanTempat || data.permohonanTempat || 'Padalarang',
    permohonanTanggal: data.bpnApplication?.permohonanTanggal || data.permohonanTanggal || '',
    tandaBatas: data.bpnApplication?.tandaBatas || data.tandaBatas || 'PATOK',
    attachments: data.bpnApplication?.attachments || data.attachments || [],
    notes: data.bpnApplication?.notes || ''
  };

  return {
    ...data,
    parties: {
      firstParties,
      secondParties
    },
    firstParties,
    secondParties,
    certificate: certData,
    pbb: pbbData,
    propertyLocation: locData,
    transaction: transData,
    akta: aktaData,
    bpnApplication: bpnData,

    // Legacy fallback getters
    transactionType: aktaData.jenisAkta || data.transactionType || 'Akta Jual Beli (AJB)',
    object: {
      ...rawObj,
      namaDalamSertipikat: certData.namaDalamSertipikat,
      ownerName: certData.namaDalamSertipikat,
      holderName: certData.namaDalamSertipikat,
      certificateType: certData.certificateType,
      documentType: certData.certificateType,
      certificateNumber: certData.certificateNumber,
      measurementDocType: certData.measurementDocType,
      measurementDocNumber: certData.measurementDocNumber,
      nomorSuratUkur: certData.nomorSuratUkur || certData.measurementDocNumber,
      measurementDocDate: certData.measurementDocDate,
      landArea: certData.landArea,
      buildingArea: locData.buildingArea,
      nib: certData.nib,
      nop: pbbData.nop,
      spptName: pbbData.spptName,
      njop: pbbData.totalNjop || pbbData.njop,
      location: locData.address,
      address: locData.address,
      rt: locData.rt,
      rw: locData.rw,
      village: locData.village,
      district: locData.district,
      city: locData.city,
      province: locData.province,
      persil: locData.persil,
      kohir: locData.kohir,
      landUseType: locData.landUseType,
      landUse: locData.landUse,
      transactionStatus: transData.transactionStatus,
      transactionDate: transData.transactionDate,
      transactionValue: transData.transactionValue,
    },
    nomorAkta: aktaData.nomorAkta,
    tahunAkta: aktaData.tahunAkta,
    tanggalAkta: aktaData.tanggalAkta,
    nomorSuratKuasa: bpnData.nomorSuratKuasa,
    tanggalSuratKuasa: bpnData.tanggalSuratKuasa,
    permohonanNomor: bpnData.permohonanNomor,
    permohonanPerihal: bpnData.jenisPermohonan,
    permohonanTempat: bpnData.permohonanTempat,
    permohonanTanggal: bpnData.permohonanTanggal,
    tandaBatas: bpnData.tandaBatas,
    landUse: locData.landUse,
    landUseType: locData.landUseType,
    attachments: bpnData.attachments,
    documents: data.documents || []
  };
}

