import { Env, ProjectReportItem, GroupedReport } from '../types';

const DEFAULT_PROJECT_ID = 'gen-lang-client-0780305709';
const DEFAULT_DATABASE_ID = 'ai-studio-9ed678a8-09d0-44a0-9223-82537f62bf08';
const DEFAULT_API_KEY = 'AIzaSyARSzQPXD2AIUUyVWOxemGtqv9XT7K-I2s';

export const RUPS_LB_AGENDAS = [
  { id: 'pengurus', label: 'Perubahan Susunan Direksi / Dewan Komisaris' },
  { id: 'pemegang_saham', label: 'Peralihan Saham / Perubahan Pemegang Saham' },
  { id: 'peningkatan_modal_dasar', label: 'Peningkatan Modal Dasar' },
  { id: 'peningkatan_modal_disetor', label: 'Peningkatan Modal Ditempatkan & Disetor' },
  { id: 'penurunan_modal', label: 'Penurunan Modal Perseroan' },
  { id: 'nama_perseroan', label: 'Perubahan Nama Perseroan' },
  { id: 'kedudukan', label: 'Perubahan Tempat Kedudukan' },
  { id: 'alamat', label: 'Perubahan Alamat Lengkap' },
  { id: 'kbli', label: 'Perubahan Maksud & Tujuan (KBLI)' },
  { id: 'anggaran_dasar', label: 'Perubahan Anggaran Dasar Lainnya' },
  { id: 'pengangkatan_kembali', label: 'Pengangkatan Kembali Pengurus' },
  { id: 'perpanjangan_jangka_waktu', label: 'Perpanjangan Jangka Waktu Perseroan' },
  { id: 'pelepasan_aset', label: 'Pelepasan / Penjaminan Aset Perseroan' },
  { id: 'pemberian_kuasa', label: 'Pemberian Kuasa / Penegasan RUPS' },
  { id: 'lainnya', label: 'Agenda Perubahan Lainnya' }
];

export function formatAgendaLabel(agendaIdOrLabel: string): string {
  if (!agendaIdOrLabel) return '';
  const match = RUPS_LB_AGENDAS.find(a => a.id === agendaIdOrLabel || a.label.toLowerCase() === agendaIdOrLabel.toLowerCase());
  return match ? match.label : agendaIdOrLabel;
}

export function fromFirestore(fields: any): any {
  const result: any = {};
  if (!fields) return result;
  for (const key in fields) {
    const value = fields[key];
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue, 10);
    else if (value.doubleValue !== undefined) result[key] = parseFloat(value.doubleValue);
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
    else if (value.mapValue !== undefined) result[key] = fromFirestore(value.mapValue.fields);
    else if (value.arrayValue !== undefined) {
      result[key] = (value.arrayValue.values || []).map((v: any) => {
        const inner = fromFirestore({ item: v });
        return inner.item;
      });
    } else if (value.nullValue !== undefined) result[key] = null;
  }
  return result;
}

function base64UrlEncode(str: string): string {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function extractPemBody(rawKey: string): string {
  const normalized = rawKey.replace(/\\n/g, '\n');
  const match = normalized.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  if (!match) {
    throw new Error('Could not locate BEGIN/END PRIVATE KEY markers in FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.');
  }
  return match[1].replace(/\s+/g, '');
}

let cachedSaToken: string | null = null;
let tokenExpiry = 0;

export async function getServiceAccountToken(env: Env): Promise<string> {
  const now = Date.now();
  if (cachedSaToken && tokenExpiry > now + 300000) {
    return cachedSaToken;
  }

  const clientEmail = (env.FIREBASE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKeyPem = (env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();

  if (!clientEmail || !privateKeyPem || !privateKeyPem.includes('BEGIN PRIVATE KEY')) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_EMAIL or FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY is not configured.');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerEncoded}.${payloadEncoded}`;

  const pemContents = extractPemBody(privateKeyPem);
  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    encoder.encode(signingInput)
  );

  const jwt = `${signingInput}.${base64UrlEncodeBuffer(signatureBuffer)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString()
  });

  const resData = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(`GCP OAuth Error: ${JSON.stringify(resData)}`);
  }

  cachedSaToken = resData.access_token;
  const expiresIn = resData.expires_in || 3600;
  tokenExpiry = now + expiresIn * 1000;
  return cachedSaToken!;
}

export function getFirestoreBaseUrl(env: Env): string {
  const projectId = env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;
  const databaseId = DEFAULT_DATABASE_ID;
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
}

export async function getDocumentFromFirestore(
  collectionPath: string,
  docId: string,
  env: Env
): Promise<any | null> {
  const token = await getServiceAccountToken(env);
  const baseUrl = getFirestoreBaseUrl(env);
  const url = `${baseUrl}/${collectionPath}/${encodeURIComponent(docId)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-goog-api-key': DEFAULT_API_KEY
    }
  });

  if (res.status === 404) return null;
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(`Firestore GET ${collectionPath}/${docId} failed: ${JSON.stringify(data)}`);

  return {
    id: docId,
    ...fromFirestore(data.fields)
  };
}

export async function listAllDocumentsFromFirestore(
  collectionPath: string,
  env: Env
): Promise<any[]> {
  const token = await getServiceAccountToken(env);
  const baseUrl = getFirestoreBaseUrl(env);
  let allDocs: any[] = [];
  let pageToken: string | undefined = undefined;

  do {
    let url = `${baseUrl}/${collectionPath}?pageSize=100`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-goog-api-key': DEFAULT_API_KEY
      }
    });

    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(`Firestore LIST ${collectionPath} failed: ${JSON.stringify(data)}`);

    if (data.documents && Array.isArray(data.documents)) {
      const parsed = data.documents.map((doc: any) => ({
        id: doc.name.split('/').pop(),
        ...fromFirestore(doc.fields)
      }));
      allDocs = allDocs.concat(parsed);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return allDocs;
}

export function getProjectPicName(p: any, clientProfile?: any): string {
  if (!p) return '-';
  const rawPic =
    p.picName ||
    p.clientPic ||
    p.pic ||
    p.clientSnapshot?.picName ||
    p.clientSnapshot?.pic ||
    p.clientSnapshot?.namaPic ||
    clientProfile?.picName ||
    clientProfile?.pic ||
    clientProfile?.namaPic ||
    '';

  const cleanPic = (typeof rawPic === 'string' ? rawPic : '').trim();
  if (!cleanPic || cleanPic === '-') return '-';

  if (/^(bapak|ibu|pak|bu)\b/i.test(cleanPic)) {
    return cleanPic;
  }

  let picTitle =
    p.picTitle ||
    p.clientSnapshot?.picTitle ||
    clientProfile?.picTitle ||
    '';

  if (!picTitle && clientProfile?.picName) {
    if (/^ibu\b/i.test(clientProfile.picName)) picTitle = 'Ibu';
    else if (/^bapak\b/i.test(clientProfile.picName)) picTitle = 'Bapak';
  }

  if (/^(sdr|sdri|dr|dra|drs|ir|h\.|hj\.)\b/i.test(cleanPic)) {
    return cleanPic;
  }

  if (picTitle && typeof picTitle === 'string' && picTitle.trim() !== '' && picTitle !== 'Tanpa Sapaan' && picTitle !== '-') {
    return `${picTitle.trim()} ${cleanPic}`.trim();
  }

  return cleanPic;
}

export function getProjectStatusDisplay(status: string, metadata?: any): string {
  const s = (status || '').toLowerCase();
  const isCompleted = s === 'completed' || s === 'archived' || s === 'selesai';
  if (isCompleted) {
    if (metadata?.minutaCheckedAll === false || !metadata?.minutaCheckedAll) {
      return 'Progres Minuta';
    }
  }
  return status;
}

export function getStatusCategory(status: string, metadata?: any): string {
  const displayStatus = getProjectStatusDisplay(status, metadata);
  const s = (displayStatus || '').toUpperCase().trim();
  if (s === 'PROGRES MINUTA' || s === 'SELESAI' || s === 'FINAL' || s === 'COMPLETE' || s === 'SIAP_KIRIM') {
    return 'SELESAI';
  }
  if (s === 'SUDAH INPUT AHU') {
    return 'SUDAH INPUT AHU';
  }
  if (s === 'SUDAH CETAK AKTA') {
    return 'SUDAH CETAK AKTA';
  }
  if (s === 'DRAFT NOTULEN DI KIRIM' || s === 'DRAFT NOTULEN DIKIRIM' || s === 'DRAFT AKTA DIKIRIM') {
    return 'DRAFT AKTA & NOTULEN DIKIRIM';
  }
  return 'PROSES DRAFTING';
}

export function getCleanTransitionComment(comment: string | undefined): string {
  if (!comment) return '-';
  const c = comment.trim();
  if (c.startsWith('Status proyek beralih dari') && c.includes('menuju')) {
    return '-';
  }
  if (c.startsWith("Proyek '") && c.includes('telah berhasil diinisialisasi')) {
    return '-';
  }
  return c;
}

export function getGroupedReports(reports: ProjectReportItem[]): GroupedReport[] {
  const groupedMap = new Map<string, GroupedReport>();

  reports.forEach(r => {
    const key = r.namaPt.trim().toUpperCase();
    const pic = r.picName || '-';
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        id: r.id,
        namaPt: r.namaPt,
        picName: pic,
        items: []
      });
    } else {
      const existing = groupedMap.get(key)!;
      if ((!existing.picName || existing.picName === '-') && pic && pic !== '-') {
        existing.picName = pic;
      }
    }

    groupedMap.get(key)!.items.push({
      pekerjaan: r.pekerjaan,
      status: r.status,
      metadata: r.metadata,
      updatedAt: r.updatedAt,
      id: r.id,
      lastTransitionComment: r.lastTransitionComment,
      picName: pic,
      changeAgendas: r.changeAgendas,
      meetingSubject: r.meetingSubject
    });
  });

  return Array.from(groupedMap.values());
}

/**
 * Fetches active projects from Firestore and returns formatted report items
 */
export async function fetchActiveProjectReports(env: Env): Promise<ProjectReportItem[]> {
  const allProjects = await listAllDocumentsFromFirestore('office_projects', env);

  // Filter only active projects (exclude completed/archived/selesai)
  const isCompleted = (status: string) => {
    const s = (status || '').toLowerCase();
    return s === 'completed' || s === 'archived' || s === 'selesai';
  };

  const activeProjects = allProjects.filter(p => !isCompleted(p.status));

  // Collect client IDs to fetch client profiles
  const clientIdsToFetch = Array.from(
    new Set(
      activeProjects
        .map(p => p.clientId || p.clientSnapshot?.id)
        .filter(Boolean)
    )
  );

  const clientProfilesMap: Record<string, any> = {};
  await Promise.all(
    clientIdsToFetch.map(async cid => {
      try {
        const profile = await getDocumentFromFirestore('company_profiles', cid, env);
        if (profile) clientProfilesMap[cid] = profile;
      } catch (err) {
        console.warn(`[FirestoreService] Could not fetch profile ${cid}:`, err);
      }
    })
  );

  const reports: ProjectReportItem[] = activeProjects.map(p => {
    let companyName = p.title || '';
    if (p.title && p.title.includes(' — ')) {
      companyName = p.title.split(' — ').slice(1).join(' — ');
    } else if (p.title && p.title.includes(' - ')) {
      companyName = p.title.split(' - ').slice(1).join(' - ');
    }

    const clientProfile = p.clientId ? clientProfilesMap[p.clientId] : undefined;
    const picName = getProjectPicName(p, clientProfile);
    const agendas = p.changeAgendas || p.metadata?.changeAgendas || p.metadata?.agendas || [];
    const comment = getCleanTransitionComment(p.lastTransitionComment);

    return {
      id: p.projectId || p.id,
      namaPt: companyName || '-',
      picName,
      pekerjaan: p.projectType || 'Perubahan',
      projectCategory: p.projectCategory || 'BODY_LEGAL',
      projectType: p.projectType || 'Perubahan',
      status: p.status || 'DRAFT',
      metadata: p.metadata || {},
      updatedAt: p.updatedAt || p.createdAt || 0,
      lastTransitionComment: comment,
      changeAgendas: agendas,
      meetingSubject: p.meetingSubject || ''
    };
  });

  // Sort by recent update
  return reports.sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeB - timeA;
  });
}
