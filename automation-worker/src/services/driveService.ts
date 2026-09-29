import { Env } from '../types';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

/**
 * Mendapatkan access token Google Drive menggunakan refresh token OAuth 2.0.
 * Mengikuti pola implementasi yang sama dengan src/lib/google-auth.ts aplikasi utama.
 */
export async function getGoogleDriveAccessToken(env: Env): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedTokenExpiry > now + 300000) {
    return cachedAccessToken;
  }

  const clientId = (env.GOOGLE_DRIVE_CLIENT_ID || '').trim();
  const clientSecret = (env.GOOGLE_DRIVE_CLIENT_SECRET || '').trim();
  const refreshToken = (env.GOOGLE_DRIVE_REFRESH_TOKEN || '').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    const missing: string[] = [];
    if (!clientId) missing.push('GOOGLE_DRIVE_CLIENT_ID');
    if (!clientSecret) missing.push('GOOGLE_DRIVE_CLIENT_SECRET');
    if (!refreshToken) missing.push('GOOGLE_DRIVE_REFRESH_TOKEN');
    throw new Error(`Google Drive OAuth credentials missing: ${missing.join(', ')}`);
  }

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: params.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    }
  });

  const data = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(`Google Drive token refresh failed: ${data.error_description || data.error || 'Unknown error'}`);
  }

  if (!data.access_token) {
    throw new Error('No access_token returned from Google OAuth for Google Drive');
  }

  cachedAccessToken = data.access_token;
  const expiresIn = data.expires_in || 3600;
  cachedTokenExpiry = now + expiresIn * 1000;
  return cachedAccessToken!;
}

/**
 * Mencari file atau folder di Google Drive berdasarkan query.
 * Mengikuti pola src/lib/drive-rest.ts: listFiles().
 */
export async function listDriveFiles(
  q: string,
  fields: string = 'files(id, name, webViewLink)',
  pageSize: number = 100,
  env: Env
): Promise<any[]> {
  const token = await getGoogleDriveAccessToken(env);
  const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=${pageSize}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(`Drive listFiles failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data.files || [];
}

/**
 * Membuat folder baru di Google Drive.
 * Mengikuti pola src/lib/drive-rest.ts: createFolder().
 */
export async function createDriveFolder(
  name: string,
  parents: string[] = [],
  env: Env
): Promise<{ id: string; webViewLink?: string }> {
  const token = await getGoogleDriveAccessToken(env);
  const response = await fetch(`${BASE_URL}/files?fields=id,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents
    })
  });

  const data = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(`Drive createFolder failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Menentukan atau memastikan folder tempat penyimpanan laporan harian:
 * 1. Jika GOOGLE_DRIVE_REPORT_FOLDER_ID dikonfigurasi, gunakan langsung ID tersebut.
 * 2. Jika tidak, gunakan GOOGLE_DRIVE_ROOT_FOLDER_ID sebagai parent dan cari folder "Laporan Proyek Aktif".
 * 3. Jika folder "Laporan Proyek Aktif" belum ada, buat di dalam parent tersebut (sesuai pola DriveFolderService.getOrCreateFolderByName).
 */
export async function ensureReportFolder(env: Env): Promise<string> {
  if (env.GOOGLE_DRIVE_REPORT_FOLDER_ID && env.GOOGLE_DRIVE_REPORT_FOLDER_ID.trim()) {
    return env.GOOGLE_DRIVE_REPORT_FOLDER_ID.trim();
  }

  const rootFolderId = (env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim() || 'root';
  const folderName = 'Laporan Proyek Aktif';

  const q = `'${rootFolderId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const existingFolders = await listDriveFiles(q, 'files(id, name)', 10, env);

  if (existingFolders && existingFolders.length > 0) {
    return existingFolders[0].id;
  }

  const newFolder = await createDriveFolder(folderName, rootFolderId !== 'root' ? [rootFolderId] : [], env);
  return newFolder.id;
}

export interface UploadDriveResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
}

/**
 * Mengunggah file PDF laporan ke Google Drive.
 * Mengikuti pola src/lib/drive-rest.ts: uploadFile().
 * File mewarisi izin folder (Google Drive folder inheritance) tanpa mengubah ACL secara sepihak.
 */
export async function uploadPdfToGoogleDrive(
  fileName: string,
  base64Pdf: string,
  env: Env
): Promise<UploadDriveResult> {
  const token = await getGoogleDriveAccessToken(env);
  const targetFolderId = await ensureReportFolder(env);

  const boundary = 'automation_multipart_boundary';
  const metadata = {
    name: fileName,
    parents: targetFolderId !== 'root' ? [targetFolderId] : []
  };

  const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const mediaPartHeader = `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const encoder = new TextEncoder();
  const metaArr = encoder.encode(metadataPart + mediaPartHeader);

  const rawBinary = atob(base64Pdf);
  const binaryArr = new Uint8Array(rawBinary.length);
  for (let i = 0; i < rawBinary.length; i++) {
    binaryArr[i] = rawBinary.charCodeAt(i);
  }

  const closeArr = encoder.encode(closeDelimiter);

  const bodyBuffer = new Uint8Array(metaArr.length + binaryArr.length + closeArr.length);
  bodyBuffer.set(metaArr, 0);
  bodyBuffer.set(binaryArr, metaArr.length);
  bodyBuffer.set(closeArr, metaArr.length + binaryArr.length);

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(bodyBuffer.length)
    },
    body: bodyBuffer
  });

  const resText = await uploadResponse.text();
  let uploadData: any;
  try {
    uploadData = JSON.parse(resText);
  } catch (e) {
    uploadData = { error: resText };
  }

  if (!uploadResponse.ok) {
    throw new Error(
      `Google Drive upload failed (${uploadResponse.status}): ${typeof uploadData === 'object' ? JSON.stringify(uploadData) : uploadData}`
    );
  }

  const fileId = uploadData.id;
  const webViewLink = uploadData.webViewLink;

  if (!fileId || !webViewLink) {
    throw new Error(
      `Google Drive API did not return valid fileId and webViewLink in response: ${JSON.stringify(uploadData)}`
    );
  }

  return {
    fileId,
    fileName,
    webViewLink
  };
}
