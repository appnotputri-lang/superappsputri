
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
  
  let isNegative = false;
  let numStr = n.toString();
  if (numStr.startsWith('-')) {
    isNegative = true;
    numStr = numStr.substring(1);
  }
  
  const parsed = parseInt(numStr.replace(/\D/g, ''));
  if (isNaN(parsed)) {
    return isNegative ? '-' : '';
  }
  
  return (isNegative ? '-' : '') + new Intl.NumberFormat('id-ID').format(parsed);
};

export const parseFormattedNumber = (s: string): number => {
  if (!s) return 0;
  let isNegative = false;
  let clean = s;
  if (s.startsWith('-')) {
    isNegative = true;
    clean = s.substring(1);
  }
  clean = clean.replace(/\D/g, '');
  const parsed = parseInt(clean) || 0;
  return isNegative ? -parsed : parsed;
};

export const numberToWords = (n: number): string => {
  if (n === 0) return 'nol';
  
  let isNegative = false;
  let val = n;
  if (val < 0) {
    isNegative = true;
    val = Math.abs(val);
  }
  
  const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  
  function helper(num: number): string {
    if (num < 12) return units[num];
    if (num < 20) return helper(num - 10) + ' belas';
    if (num < 100) return helper(Math.floor(num / 10)) + ' puluh ' + (num % 10 !== 0 ? helper(num % 10) : '');
    if (num < 200) return 'seratus ' + (num % 100 !== 0 ? helper(num % 100) : '');
    if (num < 1000) return (Math.floor(num / 100) === 1 ? 'seratus' : units[Math.floor(num / 100)] + ' ratus') + (num % 100 !== 0 ? ' ' + helper(num % 100) : '');
    if (num < 2000) return 'seribu' + (num % 1000 !== 0 ? ' ' + helper(num % 1000) : '');
    if (num < 1000000) return helper(Math.floor(num / 1000)) + ' ribu' + (num % 1000 !== 0 ? ' ' + helper(num % 1000) : '');
    if (num < 1000000000) return helper(Math.floor(num / 1000000)) + ' juta' + (num % 1000000 !== 0 ? ' ' + helper(num % 1000000) : '');
    if (num < 1000000000000) return helper(Math.floor(num / 1000000000)) + ' miliar' + (num % 1000000000 !== 0 ? ' ' + helper(num % 1000000000) : '');
    if (num < 1000000000000000) return helper(Math.floor(num / 1000000000000)) + ' triliun' + (num % 1000000000000 !== 0 ? ' ' + helper(num % 1000000000000) : '');
    
    return num.toString();
  }
  
  return (isNegative ? 'minus ' : '') + helper(val).trim().replace(/\s+/g, ' ');
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
