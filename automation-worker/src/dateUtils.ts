/**
 * Date utilities for SuperApps Putri Automation Worker
 * Timezone of Truth: Asia/Jakarta (WIB)
 */

export const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
] as const;

export interface JakartaDateComponents {
  /** Format YYYY-MM-DD (e.g. 2026-09-30) */
  ymd: string;
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  dayOfWeek: number; // 0 (Minggu) - 6 (Sabtu)
  dayName: string; // e.g. 'Rabu'
  monthName: string; // e.g. 'September'
  /** Format: 'Rabu, 30 September 2026' */
  formattedDate: string;
  /** Jam 2 digit format WIB (e.g. '08' atau '02') */
  hour: string;
  /** Menit 2 digit format WIB (e.g. '00' atau '03') */
  minute: string;
  /** Format cetak lengkap (e.g. 'Rabu, 30 September 2026 pukul 08.00 WIB') */
  formattedDateTime: string;
}

/**
 * Mengambil komponen tanggal & waktu berdasarkan timezone 'Asia/Jakarta' (WIB).
 * Aman dari perbedaan timezone runtime Cloudflare Worker (UTC) vs WIB.
 */
export function getJakartaDateComponents(date: Date = new Date()): JakartaDateComponents {
  // Gunakan 'en-CA' untuk mendapatkan representasi YYYY-MM-DD yang standar di zona waktu Asia/Jakarta
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);

  const [yearStr, monthStr, dayStr] = ymd.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Parsing UTC date dari YYYY-MM-DD menghasilkan hari dalam seminggu yang benar untuk tanggal kalender tersebut di Jakarta
  const utcDate = new Date(`${ymd}T00:00:00Z`);
  const dayOfWeek = utcDate.getUTCDay();
  const dayName = INDONESIAN_DAYS[dayOfWeek] || 'Senin';
  const monthName = INDONESIAN_MONTHS[month - 1] || 'Januari';

  // Format jam dan menit di Asia/Jakarta
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const [hour, minute] = timeFormatter.format(date).split(':');

  const formattedDate = `${dayName}, ${day} ${monthName} ${year}`;
  const formattedDateTime = `${formattedDate} pukul ${hour}.${minute} WIB`;

  return {
    ymd,
    year,
    month,
    day,
    dayOfWeek,
    dayName,
    monthName,
    formattedDate,
    hour: (hour || '08').padStart(2, '0'),
    minute: (minute || '00').padStart(2, '0'),
    formattedDateTime
  };
}

/**
 * Mendapatkan tanggal string format YYYY-MM-DD berdasarkan timezone Asia/Jakarta (WIB).
 * Contoh: '2026-09-30'
 */
export function getJakartaDateString(date: Date = new Date()): string {
  return getJakartaDateComponents(date).ymd;
}

/**
 * Mendapatkan tanggal terformat bahasa Indonesia di Asia/Jakarta.
 * Contoh: 'Rabu, 30 September 2026'
 */
export function getJakartaFormattedDate(date: Date = new Date()): string {
  return getJakartaDateComponents(date).formattedDate;
}

/**
 * Mendapatkan string tanggal dan jam cetak laporan di Asia/Jakarta.
 * Contoh: 'Rabu, 30 September 2026 pukul 08.00 WIB'
 */
export function formatJakartaPrintDate(date: Date = new Date()): string {
  return getJakartaDateComponents(date).formattedDateTime;
}
