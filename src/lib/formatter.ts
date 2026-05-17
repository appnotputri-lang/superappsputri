export function terbilang(angka: number): string {
  if (angka === 0) return "nol";
  
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
  
  return helper(angka).trim();
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
  
  // Replace JL, Jl., Jln, Jln., JLN., JLN with Jalan (case-insensitive)
  addr = addr.replace(/\bjl(?:n)?\.?\b/gi, "Jalan");
  
  // Replace GG with Gang (case-insensitive)
  addr = addr.replace(/\bgg\.?\b/gi, "Gang");
  
  // Replace No, no, No., no. with Nomor (case-insensitive)
  addr = addr.replace(/\bno\.?\b/gi, "Nomor");
  
  return addr;
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
}
