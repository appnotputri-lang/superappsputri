/**
 * Fetches the next recommended deed number (nomorAkta) and order number
 * (nomorUrut) from the D1-backed API.
 *
 * IMPORTANT: this used to silently fall back to hardcoded '01' / '1300'
 * whenever the request failed (timeout, network error, D1 cold start, etc).
 * That meant a notary could save a real akta using fake placeholder numbers
 * without ever seeing an error — risking duplicate/incorrect deed numbers.
 *
 * Now it throws instead, so callers can decide how to handle the failure
 * (retry, block saving, show a visible warning) rather than silently
 * continuing with numbers that were never actually verified against D1.
 */
export const fetchLatestDeedNumbers = async (targetDate: string) => {
  const res = await fetch(`/api/deeds/next-numbers?date=${encodeURIComponent(targetDate || '')}`);

  if (!res.ok) {
    throw new Error(`Gagal mengambil nomor akta terbaru dari server (status ${res.status}).`);
  }

  const data = await res.json();

  if (!data || data.nextDeedNumber == null || data.nextOrderNumber == null) {
    throw new Error('Respon nomor akta terbaru dari server tidak lengkap.');
  }

  return {
    nextDeedNumber: String(data.nextDeedNumber).padStart(2, '0'),
    nextOrderNumber: String(data.nextOrderNumber).padStart(3, '0')
  };
};