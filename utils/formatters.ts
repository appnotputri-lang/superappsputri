
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('Rp', 'Rp ') + ',-';
};

export const formatInputNumber = (n: number | string): string => {
  if (n === '' || n === undefined || n === null) return '';
  const num = typeof n === 'string' ? parseInt(n.replace(/\D/g, '')) : n;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
};

export const parseFormattedNumber = (s: string): number => {
  if (!s) return 0;
  const clean = s.replace(/\D/g, '');
  return parseInt(clean) || 0;
};

export const numberToWords = (n: number): string => {
  const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  
  if (n === 0) return 'nol';
  if (n < 12) return units[n];
  if (n < 20) return numberToWords(n - 10) + ' belas';
  if (n < 100) return numberToWords(Math.floor(n / 10)) + ' puluh ' + (n % 10 !== 0 ? numberToWords(n % 10) : '');
  if (n < 200) return 'seratus ' + (n % 100 !== 0 ? numberToWords(n % 100) : '');
  if (n < 1000) return (Math.floor(n / 100) === 1 ? 'seratus' : units[Math.floor(n / 100)] + ' ratus') + (n % 100 !== 0 ? ' ' + numberToWords(n % 100) : '');
  if (n < 2000) return 'seribu' + (n % 1000 !== 0 ? ' ' + numberToWords(n % 1000) : '');
  if (n < 1000000) return numberToWords(Math.floor(n / 1000)) + ' ribu' + (n % 1000 !== 0 ? ' ' + numberToWords(n % 1000) : '');
  if (n < 1000000000) return numberToWords(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 !== 0 ? ' ' + numberToWords(n % 1000000) : '');
  if (n < 1000000000000) return numberToWords(Math.floor(n / 1000000000)) + ' miliar' + (n % 1000000000 !== 0 ? ' ' + numberToWords(n % 1000000000) : '');
  if (n < 1000000000000000) return numberToWords(Math.floor(n / 1000000000000)) + ' triliun' + (n % 1000000000000 !== 0 ? ' ' + numberToWords(n % 1000000000000) : '');
  
  return n.toString();
};

export function formatAddress(address?: string): string {
  if (!address) return "";
  let addr = address;
  
  // Replace JL, Jl., Jln, Jln., JLN., JLN with Jalan
  addr = addr.replace(/\bjl(?:n)?\.?\b/gi, "Jalan");
  
  // Replace GG with Gang
  addr = addr.replace(/\bgg\.?\b/gi, "Gang");

  // Replace No, no, No., no. with Nomor
  addr = addr.replace(/\bno\.?\b/gi, "Nomor");
  
  return addr;
}

export const toTitleCase = (str: string): string => {
  if (!str) return '';
  let res = str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  
  res = res.replace(/\b(I{1,3}|Iv|V|Vi{1,3}|Ix|X{1,3}|Xl|L|Xc|C|Cd|D|Cm|M)\b/gi, (match) => {
      const romans = ['I', 'Ii', 'Iii', 'Iv', 'V', 'Vi', 'Vii', 'Viii', 'Ix', 'X', 'Xi', 'Xii', 'Xiii', 'Xiv', 'Xv'];
      if (romans.includes(match)) {
          return match.toUpperCase();
      }
      return match;
  });

  return res;
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatDateIndo = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

export const getMonthIndo = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(date);
};

export const getDayNameIndo = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date);
};

export const getDayIndo = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.getDate().toString();
};

export const getYearIndo = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.getFullYear().toString();
};
