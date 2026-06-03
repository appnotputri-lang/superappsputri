import { Address } from '../../types';

export const formatFullAddressData = (addr?: Address, fallbackCity?: string): string => {
  if (!addr || !addr.fullAddress) return "................";
  const city = addr.city || fallbackCity;
  const isRegency = city?.toLowerCase().includes("kabupaten");
  const villagePrefix = isRegency ? "Desa" : "Kelurahan";

  const parts = [
    addr.fullAddress,
    addr.rt && addr.rw ? `Rukun Tetangga ${addr.rt}, Rukun Warga ${addr.rw}` : "",
    addr.kelurahan ? `${villagePrefix} ${toTitleCase(addr.kelurahan)}` : "",
    addr.kecamatan ? `Kecamatan ${toTitleCase(addr.kecamatan)}` : "",
    city ? toTitleCase(city) : "",
    addr.province ? toTitleCase(addr.province) : ""
  ].filter(Boolean);
  return parts.join(", ");
};

export function terbilang(angka: number): string {
  if (angka === 0) return "nol";
  
  let isNegative = false;
  let val = angka;
  if (val < 0) {
    isNegative = true;
    val = Math.abs(val);
  }
  
  const huruf = [
    "", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", 
    "sepuluh", "sebelas"
  ];
  
  function helper(n: number): string {
    if (n === 0) return "";
    let res = "";
    if (n < 12) {
      res = " " + huruf[n];
    } else if (n < 20) {
      res = helper(n - 10) + " belas";
    } else if (n < 100) {
      res = helper(Math.floor(n / 10)) + " puluh" + helper(n % 10);
    } else if (n < 200) {
      res = " seratus" + helper(n - 100);
    } else if (n < 1000) {
      res = helper(Math.floor(n / 100)) + " ratus" + helper(n % 100);
    } else if (n < 2000) {
      res = " seribu" + helper(n - 1000);
    } else if (n < 1000000) {
      res = helper(Math.floor(n / 1000)) + " ribu" + helper(n % 1000);
    } else if (n < 1000000000) {
      res = helper(Math.floor(n / 1000000)) + " juta" + helper(n % 1000000);
    } else if (n < 1000000000000) {
      res = helper(Math.floor(n / 1000000000)) + " miliar" + helper(n % 1000000000);
    } else if (n < 1000000000000000) {
      res = helper(Math.floor(n / 1000000000000)) + " triliun" + helper(n % 1000000000000);
    }
    return res;
  }
  
  return (isNegative ? "minus " : "") + helper(val).trim();
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const HARI = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
];

export function dateToWords(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  
  const tanggal = d.getDate();
  const bulan = d.getMonth();
  const tahun = d.getFullYear();
  
  return `${terbilang(tanggal)} ${BULAN[bulan]} ${terbilang(tahun)}`;
}

export function formatDateStr(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function getDayName(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return HARI[d.getDay()];
}

export function timeToWords(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length !== 2) return timeStr;
  
  const hour = parseInt(parts[0], 10);
  const min = parseInt(parts[1], 10);
  
  if (isNaN(hour) || isNaN(min)) return timeStr;
  
  let res = terbilang(hour);
  if (min > 0) {
    res += " lewat " + terbilang(min) + " menit";
  }
  return res;
}

export function formatTimeStr(timeStr: string): string {
  if (!timeStr) return "";
  return timeStr.replace(':', '.') + ' WIB';
}

export function formatNumber(num: number | string): string {
  if (num === "" || num === undefined || num === null) return "";
  const val = typeof num === "string" ? parseFloat(num.replace(/\./g, "").replace(/,/g, ".")) : num;
  if (isNaN(val)) return String(num);
  return val.toLocaleString("id-ID");
}

export function parseNumber(formattedStr: string): string {
  return formattedStr.replace(/\./g, "");
}

export function formatAddress(address: string): string {
  if (!address) return "";
  let addr = address;
  
  // Replace JL, Jl., Jln, Jln., JLN., JLN with Jalan
  addr = addr.replace(/\bjl(?:n)?\.?\b/gi, "Jalan");
  
  // Replace GG with Gang (case-insensitive)
  addr = addr.replace(/\bgg\.?\b/gi, "Gang");
  
  // Replace No, no, No., no. with Nomor (case-insensitive)
  addr = addr.replace(/\bno\.?\b/gi, "Nomor");
  
  return addr;
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  let res = str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  
  res = res.replace(/\b(I{1,3}|Iv|V|Vi{1,3}|Ix|X{1,3}|Xl|L|Xc|C|Cd|D|Cm|M)\b/gi, (match) => {
      const romans = ['I', 'Ii', 'Iii', 'Iv', 'V', 'Vi', 'Vii', 'Viii', 'Ix', 'X', 'Xi', 'Xii', 'Xiii', 'Xiv', 'Xv'];
      if (romans.includes(match)) {
          return match.toUpperCase();
      }
      return match;
  });

  return res;
}

export function formatCompanyName(name: string): string {
  if (!name) return "";
  let cleanName = name.trim();
  
  // Remove any existing PT prefix recursively to handle "PT PT name"
  while (/^pt\.?\b/i.test(cleanName)) {
    cleanName = cleanName.replace(/^pt\.?\b\s*/i, "").trim();
  }
  
  return `PT. ${cleanName}`.toUpperCase();
}

export function formatPersonDetails(
  person: {
    birthCity?: string;
    birthDate?: string;
    nationalityType?: "WNI" | "WNA";
    nationality?: string;
    occupation?: string;
    address?: Address;
    nik?: string;
    passportNumber?: string;
    kitasNumber?: string;
    
    // Legal Entity fields
    shareholderType?: "PERORANGAN" | "BADAN_HUKUM";
    isForeign?: boolean;
    foreignCountry?: string;
    legalEntityType?: string;
    skNumber?: string;
    skDate?: string;
    skIssuer?: string;
    npwp?: string;
    name?: string;
  },
  tglLahirAngka: string,
  tglLahirHuruf: string
): string {
  if (person.shareholderType === "BADAN_HUKUM") {
    const isAsing = person.isForeign || person.nationalityType === "WNA";
    if (isAsing) {
      const countryStr = person.foreignCountry || person.nationality || "...";
      const skNum = person.skNumber || "...";
      const issuer = person.skIssuer || "...";
      const skDateFormatted = person.skDate ? formatDateStr(person.skDate) : "";
      const skDateWording = skDateFormatted ? ` tertanggal ${skDateFormatted}` : "";
      return `, sebuah badan hukum asing yang didirikan berdasarkan hukum negara ${toTitleCase(countryStr)}, dengan nomor pengesahan ${skNum}${skDateWording} yang dikeluarkan oleh ${toTitleCase(issuer)}`;
    } else {
      const entityType = person.legalEntityType || "badan hukum";
      const city = person.address?.city ? toTitleCase(person.address.city) : "...";
      const fullAddr = formatFullAddressData(person.address, city);
      const skNum = person.skNumber || "...";
      const skDateFormatted = person.skDate ? formatDateStr(person.skDate) : "";
      const skDateWording = skDateFormatted ? ` tertanggal ${skDateFormatted}` : "";
      const npwpNum = person.npwp || "...";
      
      return `, suatu ${entityType.toLowerCase()} yang didirikan berdasarkan hukum Negara Republik Indonesia, berkedudukan di ${city}, bertempat tinggal di ${fullAddr}, berdasarkan Surat Keputusan/Akta Nomor ${skNum}${skDateWording}, dengan Nomor Pokok Wajib Pajak (NPWP) ${npwpNum}`;
    }
  }

  const birthCity = toTitleCase(person.birthCity || "...");
  const occupation = toTitleCase(person.occupation || "...");

  if (person.nationalityType === "WNA" || person.isForeign) {
    // For WNA: Warga Negara Asing, uses passport instead of NIK, and generic address without RT/RW.
    const addressStr = person.address?.fullAddress
      ? toTitleCase(person.address.fullAddress)
      : "...";
    const pass = person.passportNumber || "...";
    const nat = person.nationality ? toTitleCase(person.nationality) : "...";
    
    let wnaDetails = `, lahir di ${birthCity}, pada tanggal ${tglLahirAngka} (${tglLahirHuruf}), Warga Negara ${nat}, ${occupation}, bertempat tinggal di ${addressStr}, pemegang Paspor Nomor ${pass}`;
    
    if (person.kitasNumber && person.kitasNumber.trim() !== "") {
      wnaDetails += `, serta pemegang Kitas Nomor ${person.kitasNumber}`;
    }
    
    return wnaDetails;
  } else {
    // For WNI (Default)
    const city = toTitleCase(person.address?.city || "...");
    const fullAddr = formatAddress(toTitleCase(person.address?.fullAddress || "..."));
    const rt = person.address?.rt || "...";
    const rw = person.address?.rw || "...";
    const kel = toTitleCase(person.address?.kelurahan || "...");
    const kec = toTitleCase(person.address?.kecamatan || "...");
    const nik = person.nik || "...";

    return `, lahir di ${birthCity}, pada tanggal ${tglLahirAngka} (${tglLahirHuruf}), Warga Negara Indonesia, ${occupation}, bertempat tinggal di ${city}, ${fullAddr}, Rukun Tetangga ${rt}, Rukun Warga ${rw}, Kelurahan ${kel}, Kecamatan ${kec}, pemegang Kartu Tanda Penduduk Nomor ${nik}`;
  }
}
