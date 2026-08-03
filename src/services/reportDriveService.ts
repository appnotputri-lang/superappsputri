import { getApiUrl, getAuthHeaders } from '../lib/api';

export const ROOT_FOLDER_ID = '0B-My1uo45zLiMy11WVdHVFJ4RU0';

export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface ReportDateInfo {
  year: number;
  monthIndex: number; // 0 - 11
  monthName: string;  // e.g. "Juli"
  formattedDate: string; // e.g. "15-07-2026"
}

export function parseReportDate(
  reportDate: string | Date | { month?: number | string; year?: number | string; day?: number | string; signatureDate?: string }
): ReportDateInfo {
  let year = new Date().getFullYear();
  let monthIndex = new Date().getMonth();
  let day = new Date().getDate();

  let hasExplicitYear = false;
  let hasExplicitMonth = false;

  if (reportDate instanceof Date) {
    year = reportDate.getFullYear();
    monthIndex = reportDate.getMonth();
    day = reportDate.getDate();
  } else if (typeof reportDate === 'object' && reportDate !== null) {
    if (reportDate.year !== undefined && reportDate.year !== null && reportDate.year !== '') {
      const yNum = Number(reportDate.year);
      if (!isNaN(yNum) && yNum > 1900) {
        year = yNum;
        hasExplicitYear = true;
      }
    }
    if (reportDate.month !== undefined && reportDate.month !== null && reportDate.month !== '') {
      if (typeof reportDate.month === 'number') {
        monthIndex = Math.max(0, Math.min(11, reportDate.month - 1));
        hasExplicitMonth = true;
      } else {
        const mStr = String(reportDate.month).trim();
        const mNum = parseInt(mStr, 10);
        if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
          monthIndex = mNum - 1;
          hasExplicitMonth = true;
        } else {
          const idx = INDONESIAN_MONTHS.findIndex(m => m.toLowerCase() === mStr.toLowerCase());
          if (idx !== -1) {
            monthIndex = idx;
            hasExplicitMonth = true;
          }
        }
      }
    }
    if (reportDate.day) {
      day = Number(reportDate.day) || day;
    } else if (reportDate.signatureDate) {
      const match = reportDate.signatureDate.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
      if (match) {
        day = parseInt(match[1], 10) || day;
        if (!hasExplicitMonth) {
          const monthMatchIdx = INDONESIAN_MONTHS.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
          if (monthMatchIdx !== -1) monthIndex = monthMatchIdx;
        }
        if (!hasExplicitYear) {
          year = parseInt(match[3], 10) || year;
        }
      }
    }
  } else if (typeof reportDate === 'string') {
    const matchIndo = reportDate.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (matchIndo) {
      day = parseInt(matchIndo[1], 10) || day;
      const monthMatchIdx = INDONESIAN_MONTHS.findIndex(m => m.toLowerCase() === matchIndo[2].toLowerCase());
      if (monthMatchIdx !== -1) monthIndex = monthMatchIdx;
      year = parseInt(matchIndo[3], 10) || year;
    } else {
      const matchIso = reportDate.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (matchIso) {
        year = parseInt(matchIso[1], 10) || year;
        monthIndex = Math.max(0, Math.min(11, parseInt(matchIso[2], 10) - 1));
        day = parseInt(matchIso[3], 10) || day;
      } else {
        const matchDMY = reportDate.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (matchDMY) {
          day = parseInt(matchDMY[1], 10) || day;
          monthIndex = Math.max(0, Math.min(11, parseInt(matchDMY[2], 10) - 1));
          year = parseInt(matchDMY[3], 10) || year;
        }
      }
    }
  }

  const dd = String(day).padStart(2, '0');
  const mm = String(monthIndex + 1).padStart(2, '0');
  const monthName = INDONESIAN_MONTHS[monthIndex];
  const formattedDate = `${dd}-${mm}-${year}`;

  return {
    year,
    monthIndex,
    monthName,
    formattedDate
  };
}

/**
 * Searches for a folder with `name` inside `parentId`.
 */
export async function findFolder(parentId: string, name: string): Promise<{ id: string; webViewLink?: string } | null> {
  const headers = await getAuthHeaders();
  const q = `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = getApiUrl(`/api/v2/drive/files?q=${encodeURIComponent(q)}`);

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to list folders in Google Drive (${response.status})`);
  }

  const data = await response.json();
  if (data.success && Array.isArray(data.files) && data.files.length > 0) {
    return { id: data.files[0].id, webViewLink: data.files[0].webViewLink };
  }
  return null;
}

/**
 * Ensures or creates a folder with `name` inside `parentId`.
 */
export async function createFolder(parentId: string, name: string): Promise<{ id: string; webViewLink?: string }> {
  const headers = await getAuthHeaders();
  const url = getApiUrl('/api/v2/drive/ensure-folder');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ parentId, name })
  });

  if (!response.ok) {
    throw new Error(`Failed to create folder in Google Drive (${response.status})`);
  }

  const data = await response.json();
  if (data.success && data.folder && data.folder.id) {
    return { id: data.folder.id, webViewLink: data.folder.webViewLink };
  }
  throw new Error(data.error || 'Failed to obtain folder ID from Google Drive response');
}

/**
 * Searches for or creates "LAPORAN NOTARIS [Year]" inside Root Folder.
 */
export async function getOrCreateYearFolder(
  year: number | string,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Mencari folder tahun...');
  const folderName = `LAPORAN NOTARIS ${year}`;

  const existing = await findFolder(ROOT_FOLDER_ID, folderName);
  if (existing) {
    return existing.id;
  }

  onProgress?.('Membuat folder...');
  const created = await createFolder(ROOT_FOLDER_ID, folderName);
  return created.id;
}

/**
 * Searches for or creates "[Month]" folder inside Year Folder.
 */
export async function getOrCreateMonthFolder(
  yearFolderId: string,
  month: number | string,
  onProgress?: (msg: string) => void
): Promise<string> {
  onProgress?.('Mencari folder bulan...');
  let monthName = '';
  if (typeof month === 'number') {
    const idx = Math.max(0, Math.min(11, month - 1));
    monthName = INDONESIAN_MONTHS[idx];
  } else {
    const mStr = String(month).trim();
    const mNum = parseInt(mStr, 10);
    if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
      monthName = INDONESIAN_MONTHS[mNum - 1];
    } else {
      const idx = INDONESIAN_MONTHS.findIndex(m => m.toLowerCase() === mStr.toLowerCase());
      monthName = idx !== -1 ? INDONESIAN_MONTHS[idx] : mStr;
    }
  }

  const existing = await findFolder(yearFolderId, monthName);
  if (existing) {
    return existing.id;
  }

  onProgress?.('Membuat folder...');
  const created = await createFolder(yearFolderId, monthName);
  return created.id;
}

/**
 * Helper to convert Blob to Base64 string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads a PDF Blob to specified Google Drive parent folder.
 */
export async function uploadPdf(
  pdfBlob: Blob,
  fileName: string,
  parentId: string,
  onProgress?: (msg: string) => void
): Promise<{ id: string; webViewLink?: string }> {
  onProgress?.('Mengunggah PDF...');

  const base64 = await blobToBase64(pdfBlob);
  const headers = await getAuthHeaders();
  const url = getApiUrl('/api/v2/drive/upload-file');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fileName,
      mimeType: 'application/pdf',
      parentFolderId: parentId,
      base64
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file to Google Drive (${response.status})`);
  }

  const data = await response.json();
  if (data.success && data.file && data.file.id) {
    return { id: data.file.id, webViewLink: data.file.webViewLink };
  }

  throw new Error(data.error || 'Failed to upload PDF file to Google Drive');
}

/**
 * Orchestrates saving a PDF report to Google Drive under Root -> LAPORAN NOTARIS [Year] -> [Month]
 */
export async function saveReportToDrive(
  pdfBlob: Blob,
  reportDate: string | Date | { month?: number | string; year?: number | string; day?: number | string; signatureDate?: string },
  reportType: string,
  onProgress?: (msg: string) => void,
  customFileName?: string
): Promise<{ fileId: string; fileName: string; webViewLink?: string }> {
  const dateInfo = parseReportDate(reportDate);

  const yearFolderId = await getOrCreateYearFolder(dateInfo.year, onProgress);
  const monthFolderId = await getOrCreateMonthFolder(yearFolderId, dateInfo.monthName, onProgress);

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hh}.${min}.${ss}`;

  const fileName = customFileName || `${reportType} - ${dateInfo.formattedDate} ${timeStr}.pdf`;

  const uploaded = await uploadPdf(pdfBlob, fileName, monthFolderId, onProgress);

  onProgress?.('Selesai.');

  return {
    fileId: uploaded.id,
    fileName,
    webViewLink: uploaded.webViewLink
  };
}
