import { handleOptions, createJsonResponse, createErrorResponse } from '../../../src/runtime/response';
import { verifyForeignFirebaseIdToken } from '../../../src/lib/foreignTokenVerify';
import { mintFirebaseCustomToken } from '../../../src/lib/customTokenSigner';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  try {
    const origin = request.headers.get('origin') || request.headers.get('Origin') || '';

    const APP2_PROJECT_ID = env?.APP2_PROJECT_ID || 'notarisputri-cecab';
    const DEFAULT_ALLOWED_EMAILS = [
      'notarisppatputri@gmail.com',
      'rdyndi@gmail.com',
      'appnotputri@gmail.com'
    ];
    const envAllowedEmails = (env?.ALLOWED_EMAILS || env?.APP2_ALLOWED_EMAILS || '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);
    const COMBINED_ALLOWED_EMAILS = Array.from(new Set([...DEFAULT_ALLOWED_EMAILS, ...envAllowedEmails]));

    const DEFAULT_SSO_ORIGINS = [
      'https://notarisputri.web.id',
      'https://app.notarisputri.web.id',
      'https://notarisputri-cecab.web.app',
      'https://notarisputri-cecab.firebaseapp.com',
      'https://appsputri.pages.dev'
    ];
    const envOrigins = (env?.ALLOWED_SSO_ORIGINS || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    const ALLOWED_SSO_ORIGINS = Array.from(new Set([...DEFAULT_SSO_ORIGINS, ...envOrigins]));

    const isAllowedOrigin =
      !origin ||
      ALLOWED_SSO_ORIGINS.includes('*') ||
      ALLOWED_SSO_ORIGINS.includes(origin) ||
      origin.endsWith('.run.app') ||
      origin.endsWith('.web.id') ||
      origin.endsWith('.web.app') ||
      origin.endsWith('.firebaseapp.com') ||
      origin.endsWith('.pages.dev');

    if (!isAllowedOrigin) {
      console.warn(`[SSO Exchange] Origin ditolak: ${origin}`);
      return createErrorResponse('Origin tidak diizinkan untuk SSO exchange.', 403);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid JSON body', 400);
    }

    const { idToken } = body || {};
    if (!idToken || typeof idToken !== 'string') {
      return createErrorResponse('idToken wajib diisi.', 400);
    }

    const { email, uid } = await verifyForeignFirebaseIdToken(idToken, APP2_PROJECT_ID);
    const userEmailLower = (email || '').toLowerCase();
    const isEmailAllowed =
      COMBINED_ALLOWED_EMAILS.includes('*') ||
      COMBINED_ALLOWED_EMAILS.includes(userEmailLower);

    if (!isEmailAllowed) {
      console.warn(`[SSO Exchange] Email tidak di allowlist: ${email}`);
      return createErrorResponse(`Email (${email}) tidak terdaftar untuk mengakses superappsputri.`, 403);
    }

    const serviceAccountEmail = env?.FIREBASE_SA_CLIENT_EMAIL;
    const privateKey = env?.FIREBASE_SA_PRIVATE_KEY;
    if (!serviceAccountEmail || !privateKey) {
      console.error('[SSO Exchange] FIREBASE_SA_CLIENT_EMAIL / FIREBASE_SA_PRIVATE_KEY belum di-set.');
      return createErrorResponse('Konfigurasi server SSO belum lengkap (Service Account belum di-set). Hubungi admin.', 500);
    }

    const targetUid = `app2_${uid}`;
    const customToken = await mintFirebaseCustomToken(targetUid, serviceAccountEmail, privateKey);

    return createJsonResponse({ customToken });
  } catch (err: any) {
    console.error('[SSO Exchange] Error:', err.message);
    return createErrorResponse(err.message || 'Gagal melakukan SSO exchange.', 401);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
