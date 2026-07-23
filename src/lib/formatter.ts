import { Address, CompanyData } from '../../types';

export const extractStreetAddress = (addrStr?: string): string => {
  if (!addrStr) return '';
  const str = String(addrStr).trim();
  const commaIdx = str.search(/,\s*(RT[\s.]|RW[\s.]|Desa|Kel[\s.]|Kelurahan|Kec[\s.]|Kecamatan|Kab[\s.]|Kabupaten|Kota|Prov[\s.]|Provinsi)/i);
  if (commaIdx !== -1) {
    return str.substring(0, commaIdx).trim();
  }
  return str;
};

export const formatFullAddressData = (addr?: Address, fallbackCity?: string): string => {
  if (!addr || !addr.fullAddress) return "................";
  const street = extractStreetAddress(addr.fullAddress);
  const city = addr.city || fallbackCity;
  const isRegency = city?.toLowerCase().includes("kabupaten");
  const villagePrefix = isRegency ? "Desa" : "Kelurahan";

  const parts = [
    street,
    addr.rt && addr.rw ? `RT. ${addr.rt} RW. ${addr.rw}` : "",
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

export function formatDateSimple(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const dd = d.getDate();
  const mm = d.getMonth();
  const yyyy = d.getFullYear();
  return `${dd} ${BULAN[mm]} ${yyyy}`;
}

export function formatDateRupst(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = BULAN[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
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

export const expandAbbreviations = (str: string) => {
  if (!str) return "";
  let res = str;
  res = res.replace(
    /RT\.\s*(\d+)\s*RW\.\s*(\d+)/gi,
    "Rukun Tetangga $1, Rukun Warga $2",
  );
  res = res.replace(
    /RT\s+(\d+)\s*RW\s+(\d+)/gi,
    "Rukun Tetangga $1, Rukun Warga $2",
  );
  res = res.replace(/RT\.\s*(\d+)/gi, "Rukun Tetangga $1");
  res = res.replace(/RW\.\s*(\d+)/gi, "Rukun Warga $1");
  res = res.replace(/\bS\.H\b\.?/gi, "Sarjana Hukum");
  res = res.replace(/\bM\.Kn\b\.?/gi, "Magister Kenotariatan");
  res = res.replace(/\bjl(?:n)?\.?\b/gi, "Jalan");
  res = res.replace(/\bgg\.?\b/gi, "Gang");
  return res;
};

export function formatAddress(address: string): string {
  if (!address) return "";
  let addr = address;
  
  // Replace No, no, No., no. with Nomor (case-insensitive)
  addr = addr.replace(/\bno\.?\b/gi, "Nomor");
  
  // Expand other abbreviations like RT/RW, Jl, etc.
  return expandAbbreviations(addr);
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

export function cleanDegrees(str: string): string {
  if (!str) return "";
  let res = str;
  // Expand degrees to long form for Akta
  res = res.replace(/\bS\.H\b\.?/gi, "Sarjana Hukum");
  res = res.replace(/\bM\.Kn\b\.?/gi, "Magister Kenotariatan");
  return res;
}

export function formatCompanyName(name: string, clientType: string = 'PT'): string {
  if (!name) return "";
  let cleanName = name.trim();
  
  // Normalize types for mapping
  const typeMap: Record<string, string> = {
    'PT': 'PT',
    'CV': 'CV',
    'YAYASAN': 'YAYASAN',
    'PERKUMPULAN': 'PERKUMPULAN',
    'PERSEKUTUAN_FIRMA': 'FIRMA',
    'PERSEKUTUAN_PERDATA': 'PERSEKUTUAN PERDATA',
    'KOPERASI': 'KOPERASI',
    'PMA': 'PT',
    'PERORANGAN': 'PT',
    'LAINNYA': ''
  };

  const prefix = typeMap[clientType] || 'PT';

  // Remove existing prefixes recursively to handle "PT PT name" or "PT. PT name" etc
  const allPrefixes = [
    'PT', 'PT\\.', 'P\\.T\\.', 'P\\.T', 'PERSEROAN TERBATAS',
    'CV', 'CV\\.', 'C\\.V\\.', 'C\\.V', 'COMMANDITAIRE VENNOOTSCHAP',
    'YAYASAN', 'KOPERASI', 'FIRMA', 'PERKUMPULAN'
  ];
  
  const prefixRegex = new RegExp(`^(${allPrefixes.join('|')})\\s*`, 'i');
  
  while (prefixRegex.test(cleanName)) {
    cleanName = cleanName.replace(prefixRegex, "").trim();
  }
  
  if (!prefix) return cleanName.toUpperCase();
  return `${prefix} ${cleanName}`.toUpperCase();
}

export function cleanCompanyName(name: string): string {
  if (!name) return "";
  let cleanName = name.trim();
  
  const allPrefixes = [
    'PT', 'PT\\.', 'P\\.T\\.', 'P\\.T', 'PERSEROAN TERBATAS',
    'CV', 'CV\\.', 'C\\.V\\.', 'C\\.V', 'COMMANDITAIRE VENNOOTSCHAP',
    'YAYASAN', 'KOPERASI', 'FIRMA', 'PERKUMPULAN'
  ];
  
  const prefixRegex = new RegExp(`^(${allPrefixes.join('|')})\\s*`, 'i');
  
  while (prefixRegex.test(cleanName)) {
    cleanName = cleanName.replace(prefixRegex, "").trim();
  }
  
  return cleanName;
}

export function formatAktaDate(dateStr: string): string {
  if (!dateStr) return "";
  const words = dateToWords(dateStr);
  const numeric = formatDateStr(dateStr);
  if (!words || !numeric) return dateStr;
  return `${words} (${numeric})`;
}

export function checkIsBadanHukum(person: any): boolean {
  if (!person) return false;
  const nameUpper = (person.name || "").toUpperCase().trim();
  const looksLikePT = nameUpper.startsWith("PT ") || nameUpper.startsWith("PT.") || nameUpper.startsWith("PERSEROAN TERBATAS") || nameUpper.startsWith("KOPERASI ") || nameUpper.startsWith("YAYASAN ") || nameUpper.startsWith("CV ") || nameUpper.startsWith("CV.");
  return person.shareholderType === "BADAN_HUKUM" || looksLikePT || !!person.legalEntityType;
}

export function getGroupedAmendmentDeeds(amendmentDeeds: any[]): any[][] {
  const groupedDeeds: any[][] = [];
  for (const deed of amendmentDeeds) {
    if (groupedDeeds.length === 0) {
      groupedDeeds.push([deed]);
    } else {
      const lastGroup = groupedDeeds[groupedDeeds.length - 1];
      const lastDeedInGroup = lastGroup[0];
      if (
        deed.notary === lastDeedInGroup.notary &&
        deed.notaryTitle === lastDeedInGroup.notaryTitle &&
        deed.notaryDomicile === lastDeedInGroup.notaryDomicile
      ) {
        lastGroup.push(deed);
      } else {
        groupedDeeds.push([deed]);
      }
    }
  }
  return groupedDeeds;
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
    linkedProfileId?: string;
    establishmentDeedNumber?: string;
    establishmentDeedDate?: string;
    establishmentNotary?: string;
    establishmentNotaryTitle?: string;
    establishmentNotaryDomicile?: string;
    establishmentSkNumber?: string;
    establishmentSkDate?: string;
    amendmentDeeds?: any[];
  },
  tglLahirAngka: string,
  tglLahirHuruf: string,
  useAktaFormat: boolean = false,
  excludeAmendmentDeeds: boolean = false,
  isSirkuler: boolean = false
): string {
  let finalAngka = tglLahirAngka;
  let finalHuruf = tglLahirHuruf;

  if ((!finalAngka || finalAngka.trim() === "") && person.birthDate) {
    finalAngka = formatDateStr(person.birthDate);
  }
  if ((!finalHuruf || finalHuruf.trim() === "") && person.birthDate) {
    finalHuruf = dateToWords(person.birthDate);
  }

  const birthDateWording = useAktaFormat 
    ? (finalHuruf && finalAngka ? `${finalHuruf} (${finalAngka})` : finalAngka || finalHuruf || "...")
    : (person.birthDate ? formatDateRupst(person.birthDate) : `${finalAngka}${finalHuruf ? ` (${finalHuruf})` : ""}`);

  const isBadanHukum = checkIsBadanHukum(person);

  if (isBadanHukum) {
    const isAsing = person.isForeign || person.nationalityType === "WNA";
    if (isAsing) {
      const countryStr = person.foreignCountry || person.nationality || "...";
      const skNum = person.skNumber || "...";
      const issuer = person.skIssuer || "...";
      const skDateFormatted = person.skDate ? (useAktaFormat ? formatAktaDate(person.skDate) : formatDateRupst(person.skDate)) : "";
      const skDateWording = skDateFormatted ? ` tertanggal ${skDateFormatted}` : "";
      return `, sebuah badan hukum asing yang didirikan berdasarkan hukum negara ${toTitleCase(countryStr)}, dengan nomor pengesahan ${skNum}${skDateWording} yang dikeluarkan oleh ${toTitleCase(issuer)}`;
    } else {
      const entityType = person.legalEntityType || "badan hukum";
      const candidates = [
        person.address?.city,
        (person as any).newAddress?.city,
        (person as any).oldAddress?.city,
        (person as any).domicile,
        (person as any).oldDomicile,
        (person as any).city,
        (person as any).birthCity,
        (person as any).kedudukanPT
      ];
      let rawCity = candidates.find(c => c && typeof c === 'string' && c.trim() !== "" && c.replace(/[.\s]/g, '') !== "") || "";
      const city = rawCity ? toTitleCase(rawCity) : "...";
      const fullAddr = formatFullAddressData(person.address, city);
      const skNum = person.skNumber || "...";
      const skDateFormatted = person.skDate ? (useAktaFormat ? formatAktaDate(person.skDate) : formatDateRupst(person.skDate)) : "";
      const skDateWording = skDateFormatted ? ` tertanggal ${skDateFormatted}` : "";
      
      const cityPrefix = city.toLowerCase().startsWith('kota') || city.toLowerCase().startsWith('kabupaten') ? '' : (person.address?.province?.toLowerCase().includes('jakarta') || city.toLowerCase().includes('jakarta') ? 'Kota ' : '');
      let baseString = `, berkedudukan di ${cityPrefix}${city}`;
      
      if (person.establishmentDeedNumber) {
        const estDateStr = person.establishmentDeedDate ? (useAktaFormat ? formatAktaDate(person.establishmentDeedDate) : (isSirkuler ? formatDateSimple(person.establishmentDeedDate) : formatDateRupst(person.establishmentDeedDate))) : "...";
        const estNotary = person.establishmentNotary || "...";
        const estNotaryTitle = person.establishmentNotaryTitle ? `, ${person.establishmentNotaryTitle}` : "";
        const estNotaryDomicile = person.establishmentNotaryDomicile ? toTitleCase(person.establishmentNotaryDomicile) : "...";
        const estSkNumber = person.establishmentSkNumber || person.skNumber || "...";
        const estSkDateStr = person.establishmentSkDate ? (useAktaFormat ? formatAktaDate(person.establishmentSkDate) : formatDateRupst(person.establishmentSkDate)) : (person.skDate ? (useAktaFormat ? formatAktaDate(person.skDate) : formatDateRupst(person.skDate)) : "...");
        
        if (useAktaFormat) {
          baseString += `, yang didirikan berdasarkan Akta Pendirian Nomor ${person.establishmentDeedNumber} tertanggal ${estDateStr}, dibuat dihadapan ${estNotary}${estNotaryTitle}, Notaris di ${estNotaryDomicile}, dan telah memperoleh pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${estSkNumber} tertanggal ${estSkDateStr}`;
        } else if (isSirkuler) {
          baseString += `, yang didirikan berdasarkan Akta Pendirian tertanggal ${estDateStr} Nomor ${person.establishmentDeedNumber}, dibuat dihadapan ${estNotary}${estNotaryTitle}, Notaris di ${estNotaryDomicile}, dan telah memperoleh pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${estSkNumber} tertanggal ${estSkDateStr}`;
        } else {
          baseString += `, yang didirikan berdasarkan Akta Pendirian Nomor ${person.establishmentDeedNumber} tertanggal ${estDateStr}, dibuat dihadapan ${estNotary}${estNotaryTitle}, Notaris di ${estNotaryDomicile}, dan telah memperoleh pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${estSkNumber} tertanggal ${estSkDateStr}`;
        }
      } else {
        baseString += `, berdasarkan Surat Keputusan/Akta Nomor ${skNum}${skDateWording}`;
      }

      if (!excludeAmendmentDeeds && person.amendmentDeeds && person.amendmentDeeds.length > 0) {
        if (person.amendmentDeeds.length === 1) {
          const amd = person.amendmentDeeds[0];
          const amdDateStr = amd.date ? (useAktaFormat ? formatAktaDate(amd.date) : formatDateRupst(amd.date)) : "...";
          const actaNumWord = useAktaFormat ? "akta Nomor" : "Akta Nomor";
          baseString += `, dan anggaran dasarnya telah mengalami perubahan berdasarkan ${actaNumWord} ${amd.number || "..."} tertanggal ${amdDateStr} dibuat dihadapan ${amd.notary || "..."}, Notaris di ${amd.notaryDomicile ? toTitleCase(amd.notaryDomicile) : "..."}`;
        } else {
          const actaNumWord = useAktaFormat ? "akta Nomor" : "Akta Nomor";
          const lastDeed = person.amendmentDeeds[person.amendmentDeeds.length - 1];
          const lastDateStr = lastDeed.date ? (useAktaFormat ? formatAktaDate(lastDeed.date) : formatDateRupst(lastDeed.date)) : "...";
          baseString += `, dan anggaran dasarnya telah mengalami beberapa kali perubahan, terakhir dengan ${actaNumWord} ${lastDeed.number || "..."} tertanggal ${lastDateStr} dibuat dihadapan ${lastDeed.notary || "..."}, Notaris di ${lastDeed.notaryDomicile ? toTitleCase(lastDeed.notaryDomicile) : "..."} berdasarkan akta-akta sebagai berikut:`;

          const groupedDeeds = getGroupedAmendmentDeeds(person.amendmentDeeds);
          const keWord = ["", "", "kedua", "ketiga", "keempat", "kelima", "keenam", "ketujuh", "kedelapan", "kesembilan", "kesepuluh"];

          groupedDeeds.forEach((group) => {
            group.forEach((amd, dIdx) => {
              const amdDateStr = amd.date ? (useAktaFormat ? formatAktaDate(amd.date) : formatDateRupst(amd.date)) : "...";
              const amdNotary = amd.notary || "...";
              const amdNotaryTitle = amd.notaryTitle ? `, ${amd.notaryTitle}` : "";
              const amdNotaryDomicile = amd.notaryDomicile ? toTitleCase(amd.notaryDomicile) : "...";
              const amdSkNumber = amd.skNumber || (amd.skSpDocuments && (amd.skSpDocuments[0]?.number || amd.skSpDocuments[0]?.skNumber)) || person.skNumber || "...";
              const amdSkDateStr = amd.skDate ? (useAktaFormat ? formatAktaDate(amd.skDate) : formatDateRupst(amd.skDate)) : (amd.skSpDocuments && (amd.skSpDocuments[0]?.date || amd.skSpDocuments[0]?.skDate) ? (useAktaFormat ? formatAktaDate(amd.skSpDocuments[0].date || amd.skSpDocuments[0].skDate) : formatDateRupst(amd.skSpDocuments[0].date || amd.skSpDocuments[0].skDate)) : (person.skDate ? (useAktaFormat ? formatAktaDate(person.skDate) : formatDateRupst(person.skDate)) : "..."));
              
              if (group.length === 1) {
                baseString += `\n- Akta Nomor ${amd.number || "..."} tertanggal ${amdDateStr}, dibuat dihadapan ${amdNotary}${amdNotaryTitle}, Notaris di ${amdNotaryDomicile}, yang pemberitahuannya telah diterima dan dicatat dalam Sistem Administrasi Badan Hukum Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan/Penerimaan Surat Pemberitahuan Nomor ${amdSkNumber} tertanggal ${amdSkDateStr}`;
              } else {
                baseString += `\n- Akta Nomor ${amd.number || "..."} tertanggal ${amdDateStr}, yang pemberitahuannya telah diterima dan dicatat dalam Sistem Administrasi Badan Hukum Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan/Penerimaan Surat Pemberitahuan Nomor ${amdSkNumber} tertanggal ${amdSkDateStr}`;
                if (dIdx === group.length - 1) {
                  const prefix = keWord[group.length] || `ke-${group.length}`;
                  baseString += `\n  - ${prefix} aktanya dibuat dihadapan ${amdNotary}${amdNotaryTitle}, Notaris di ${amdNotaryDomicile}`;
                }
              }
            });
          });
        }
      }
      return baseString;
    }
  }

  const birthCity = toTitleCase(person.birthCity || "...");
  const occupation = cleanDegrees(toTitleCase(person.occupation || "..."));

  if (person.nationalityType === "WNA" || person.isForeign) {
    // For WNA: Warga Negara Asing, uses passport instead of NIK, and generic address without RT/RW.
    const addressStr = person.address?.fullAddress
      ? toTitleCase(person.address.fullAddress)
      : "...";
    const pass = person.passportNumber || "...";
    const nat = person.nationality ? toTitleCase(person.nationality) : "...";
    
    let wnaDetails = `, lahir di ${birthCity}, pada tanggal ${birthDateWording}, Warga Negara ${nat}, ${occupation}, bertempat tinggal di ${addressStr}, pemegang Paspor Nomor ${pass}`;
    
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

    const addrText = useAktaFormat
      ? `${fullAddr}, Rukun Tetangga ${rt}, Rukun Warga ${rw}, Kelurahan ${kel}, Kecamatan ${kec}`
      : `${fullAddr}, RT. ${rt} RW. ${rw}, Kelurahan ${kel}, Kecamatan ${kec}`;

    let details = `, lahir di ${birthCity}, pada tanggal ${birthDateWording}, Warga Negara Indonesia, ${occupation}, bertempat tinggal di ${city}, ${addrText}`;

    if ((person as any).isUnderage) {
      const gSal = (person as any).guardianSalutation || "Tuan/Nyonya";
      const gName = ((person as any).guardianName || "................").toUpperCase();
      const gNik = (person as any).guardianNik || "................";
      const gRel = (person as any).guardianRelationship || "orang tua";
      let gAddrStr = "alamat yang sama";
      if ((person as any).guardianAddress?.fullAddress) {
        gAddrStr = formatFullAddressData((person as any).guardianAddress, toTitleCase((person as any).guardianAddress.city || "..."));
      }
      details += ` - anak di bawah umur yang dalam hal ini diwakili oleh kekuasaan orang tua oleh ${gRel.toLowerCase()}nya, yaitu ${gSal} ${gName}, pemegang Kartu Tanda Penduduk Nomor ${gNik}, bertempat tinggal di ${gAddrStr}`;
    } else {
      details += `, pemegang Kartu Tanda Penduduk Nomor ${nik}`;
    }

    return details;
  }
}

export function formatCompanyEstablishmentOnly(data: Partial<CompanyData>, useAktaFormat: boolean = false, isSirkuler: boolean = false): string {
  const estDeedNumber = data.establishmentDeedNumber || "................";
  const estDateStr = data.establishmentDeedDate ? (useAktaFormat ? formatAktaDate(data.establishmentDeedDate) : (isSirkuler ? formatDateSimple(data.establishmentDeedDate) : formatDateRupst(data.establishmentDeedDate))) : "................";
  const estNotary = data.establishmentNotary || "................";
  const estNotaryTitle = data.establishmentNotaryTitle ? `, ${data.establishmentNotaryTitle}` : "";
  const estNotaryDomicile = data.establishmentNotaryDomicile ? toTitleCase(data.establishmentNotaryDomicile) : "................";
  const estSkNumber = data.establishmentSkNumber || "................";
  const estSkDateStr = data.establishmentSkDate ? (useAktaFormat ? formatAktaDate(data.establishmentSkDate) : formatDateRupst(data.establishmentSkDate)) : "................";
  
  if (useAktaFormat) {
    return `, yang didirikan berdasarkan Akta Pendirian Nomor ${estDeedNumber} tertanggal ${estDateStr}, dibuat dihadapan ${estNotary}${estNotaryTitle}, Notaris di ${estNotaryDomicile}, dan telah memperoleh pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${estSkNumber} tertanggal ${estSkDateStr}`;
  } else if (isSirkuler) {
    return `, yang didirikan berdasarkan Akta Pendirian tertanggal ${estDateStr} Nomor ${estDeedNumber}, dibuat dihadapan ${estNotary}${estNotaryTitle}, Notaris di ${estNotaryDomicile}, dan telah memperoleh pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${estSkNumber} tertanggal ${estSkDateStr}`;
  } else {
    return `, yang didirikan berdasarkan Akta Pendirian Nomor ${estDeedNumber} tertanggal ${estDateStr}, dibuat dihadapan ${estNotary}${estNotaryTitle}, Notaris di ${estNotaryDomicile}, dan telah memperoleh pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${estSkNumber} tertanggal ${estSkDateStr}`;
  }
}

export function formatAmendmentDeedSingle(deed: any, useAktaFormat: boolean = false): string {
  const dateStr = deed.date ? (useAktaFormat ? formatAktaDate(deed.date) : formatDateRupst(deed.date)) : "................";
  const numStr = deed.number || "................";
  const notaryStr = deed.notary || "................";
  const notaryTitleStr = deed.notaryTitle ? `, ${deed.notaryTitle}` : "";
  const notaryDomicileStr = deed.notaryDomicile ? toTitleCase(deed.notaryDomicile) : "................";
  
  let base = `Akta tertanggal ${dateStr} Nomor ${numStr}, yang dibuat di hadapan ${notaryStr}${notaryTitleStr}, Notaris di ${notaryDomicileStr}`;

  if (deed.skSpDocuments && deed.skSpDocuments.length > 0) {
    const skDocs = deed.skSpDocuments.filter((d: any) => d.type === "SK");
    const spDocs = deed.skSpDocuments.filter((d: any) => d.type !== "SK");

    if (skDocs.length > 0 && spDocs.length > 0) {
      const sk = skDocs[0];
      const sp = spDocs[0];
      const skDate = sk.date ? (useAktaFormat ? formatAktaDate(sk.date) : formatDateRupst(sk.date)) : "................";
      const spDate = sp.date ? (useAktaFormat ? formatAktaDate(sp.date) : formatDateRupst(sp.date)) : "................";
      base += ` dan telah mendapat persetujuan dari Kementrian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${skDate} Nomor ${sk.number || "................"}, serta telah dilaporkan ke Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${spDate} Nomor ${sp.number || "................"}`;
    } else if (skDocs.length > 0) {
      const sk = skDocs[0];
      const skDate = sk.date ? (useAktaFormat ? formatAktaDate(sk.date) : formatDateRupst(sk.date)) : "................";
      base += ` dan telah mendapat persetujuan dari Kementrian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${skDate} Nomor ${sk.number || "................"}`;
    } else if (spDocs.length > 0) {
      const sp = spDocs[0];
      const spDate = sp.date ? (useAktaFormat ? formatAktaDate(sp.date) : formatDateRupst(sp.date)) : "................";
      base += ` dan telah dilaporkan ke Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${spDate} Nomor ${sp.number || "................"}`;
    }
  } else {
    if (deed.skNumber) {
      const skDateStr = deed.skDate ? (useAktaFormat ? formatAktaDate(deed.skDate) : formatDateRupst(deed.skDate)) : "................";
      base += ` dan telah mendapat persetujuan dari Kementrian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${skDateStr} Nomor ${deed.skNumber}`;
    }
  }

  return base;
}

export function formatCompanyEstablishment(data: Partial<CompanyData>, useAktaFormat: boolean = false): string {
  const estDeedNumber = data.establishmentDeedNumber || "................";
  const estDateStr = data.establishmentDeedDate ? (useAktaFormat ? formatAktaDate(data.establishmentDeedDate) : formatDateSimple(data.establishmentDeedDate)) : "................";
  const estNotary = data.establishmentNotary || "................";
  const estNotaryTitle = data.establishmentNotaryTitle ? `, ${data.establishmentNotaryTitle}` : "";
  const estNotaryDomicile = data.establishmentNotaryDomicile ? toTitleCase(data.establishmentNotaryDomicile) : "................";
  const estSkNumber = data.establishmentSkNumber || "................";
  const estSkDateStr = data.establishmentSkDate ? (useAktaFormat ? formatAktaDate(data.establishmentSkDate) : formatDateRupst(data.establishmentSkDate)) : "................";
  
  let baseString = "";
  if (useAktaFormat) {
    baseString = `, yang didirikan berdasarkan Akta Pendirian Nomor ${estDeedNumber} tertanggal ${estDateStr}, dibuat dihadapan ${estNotary}${estNotaryTitle}, Notaris di ${estNotaryDomicile}, dan telah memperoleh pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${estSkNumber} tertanggal ${estSkDateStr}`;
  } else {
    baseString = `, yang didirikan berdasarkan Akta Pendirian tertanggal ${estDateStr} Nomor ${estDeedNumber}, dibuat dihadapan ${estNotary}${estNotaryTitle}, Notaris di ${estNotaryDomicile}, dan telah memperoleh pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${estSkNumber} tertanggal ${estSkDateStr}`;
  }

  if (data.amendmentDeeds && data.amendmentDeeds.length > 0) {
    if (data.amendmentDeeds.length === 1) {
      const amd = data.amendmentDeeds[0];
      const amdDateStr = amd.date ? (useAktaFormat ? formatAktaDate(amd.date) : formatDateRupst(amd.date)) : "................";
      const actaNumWord = useAktaFormat ? "akta Nomor" : "Akta Nomor";
      baseString += `, dan anggaran dasarnya telah mengalami perubahan berdasarkan ${actaNumWord} ${amd.number || "................"} tertanggal ${amdDateStr} dibuat dihadapan ${amd.notary || "................"}, Notaris di ${amd.notaryDomicile ? toTitleCase(amd.notaryDomicile) : "................"}`;
    } else {
      const actaNumWord = useAktaFormat ? "akta Nomor" : "Akta Nomor";
      const lastDeed = data.amendmentDeeds[data.amendmentDeeds.length - 1];
      const lastDateStr = lastDeed.date ? (useAktaFormat ? formatAktaDate(lastDeed.date) : formatDateRupst(lastDeed.date)) : "................";
      baseString += `, dan anggaran dasarnya telah mengalami beberapa kali perubahan, terakhir dengan ${actaNumWord} ${lastDeed.number || "................"} tertanggal ${lastDateStr} dibuat dihadapan ${lastDeed.notary || "................"}, Notaris di ${lastDeed.notaryDomicile ? toTitleCase(lastDeed.notaryDomicile) : "................"}`;
    }
  } else {
    const actaNumWord = useAktaFormat ? "akta Nomor" : "Akta Nomor";
    baseString += `, dan anggaran dasarnya telah mengalami beberapa kali perubahan, terakhir dengan ${actaNumWord} ................ tertanggal ................ dibuat dihadapan ................, Notaris di ................`;
  }

  return baseString;
}

/**
 * Preprocesses flat blocks array for MS Office Word DOCX generation.
 * Any block run containing manual bullet list (e.g. newline followed by dash "\n-")
 * is split into distinct native list blocks so that they render as native MS Word bullets.
 */
export function preprocessBlocksForWordBullets(blocks: any[]): any[] {
  const result: any[] = [];
  for (const block of blocks) {
    if (!block || !block.runs || block.runs.length === 0) {
      result.push(block);
      continue;
    }

    // Skip KBLI description blocks to let generateRUPSDocx handle newlines and bullets specially
    if (block.kbliDesc) {
      result.push(block);
      continue;
    }

    const hasManualBullets = block.runs.some((run: any) => run && run.text && /\r?\n\s*-\s*/.test(run.text));

    if (!hasManualBullets) {
      result.push(block);
      continue;
    }

    // Clone the block structure but clear the runs to start fresh
    let currentBlock = { ...block, runs: [] as any[] };
    result.push(currentBlock);

    for (const run of block.runs) {
      const text = run.text || "";
      if (!/\r?\n\s*-\s*/.test(text)) {
        currentBlock.runs.push(run);
        continue;
      }

      // Split the text of this run!
      const parts = text.split(/\r?\n\s*-\s*/);
      
      // Clean up parent run's trailing manual hyphens when splitting
      let firstPart = parts[0];
      if (parts.length > 1) {
        firstPart = firstPart.replace(/\s*:\s*-\s*$/, ":");
        firstPart = firstPart.replace(/\s*;\s*-\s*$/, ";");
        firstPart = firstPart.replace(/\s*-\s*$/, "");
      }

      if (firstPart) {
        currentBlock.runs.push({ ...run, text: firstPart });
      }

      // Determine the next block's indentTabs or standard levels.
      // If currentBlock is already a list, make the nested sub-bullet deeper than parent.
      let nextBlockIndent = 1.0;
      if (currentBlock.type === "list") {
        nextBlockIndent = ((currentBlock as any).indentTabs || 1.0) + 0.5;
      } else if (block.type === "list") {
        nextBlockIndent = (block.indentTabs || 1.0) + 0.5;
      } else if (block.kbliDesc) {
        // KBLI description text starts at 1cm (567 dxa). 
        // To align the bullet at 1cm, we need leftDxa = 851 (hanging 283).
        // indentTabs 1.5 triggers the 851 dxa logic in generatePendirianDocx.ts
        nextBlockIndent = 1.5;
      }

      for (let i = 1; i < parts.length; i++) {
        const cleanText = parts[i].trim();
        if (!cleanText) continue;

        currentBlock = {
          type: "list",
          bullet: "-",
          indentTabs: nextBlockIndent,
          runs: [{ ...run, text: cleanText }]
        };
        
        if (block.type === "list" && (block as any).indentStyle) {
          (currentBlock as any).indentStyle = (block as any).indentStyle;
        }

        result.push(currentBlock);
      }
    }
  }
  return result;
}

