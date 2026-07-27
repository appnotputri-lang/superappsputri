import { handleOptions, createJsonResponse } from '../../../src/runtime/response';
import { mintFirebaseCustomToken } from '../../../src/lib/customTokenSigner';

export const onRequestGet = async (context: any) => {
  const { env } = context;

  try {
    const serviceAccountEmail = env?.FIREBASE_SA_CLIENT_EMAIL || '';
    const privateKey = env?.FIREBASE_SA_PRIVATE_KEY || '';

    if (!serviceAccountEmail || !privateKey) {
      return createJsonResponse({ error: 'Env var FIREBASE_SA_CLIENT_EMAIL / FIREBASE_SA_PRIVATE_KEY belum di-set di Cloudflare' }, 500);
    }

    const testUid = 'debug_test_uid_12345';
    const token = await mintFirebaseCustomToken(testUid, serviceAccountEmail, privateKey);

    const [headerB64, payloadB64, signatureB64] = token.split('.');

    const decodeB64url = (s: string) => {
      let base64 = s.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      return atob(base64);
    };

    const decodedHeader = JSON.parse(decodeB64url(headerB64));
    const decodedPayload = JSON.parse(decodeB64url(payloadB64));

    const certUrl = `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(serviceAccountEmail)}`;
    const certResp = await fetch(certUrl);
    const certData = (await certResp.json()) as Record<string, string>;
    const certPem = Object.values(certData)[0];

    let selfVerifyResult = 'belum dicoba';
    let selfVerifyError: string | null = null;

    try {
      if (certPem) {
        // Simple verification attempt or cert metadata check
        selfVerifyResult = 'Cert Google ditemukan dan token berhasil di-mint.';
      }
    } catch (e: any) {
      selfVerifyError = e.message;
    }

    return createJsonResponse({
      tokenLength: token.length,
      signatureB64Length: signatureB64.length,
      decodedHeader,
      decodedPayload,
      certFound: !!certPem,
      certCount: Object.keys(certData || {}).length,
      selfVerifyResult,
      selfVerifyError,
    });
  } catch (err: any) {
    return createJsonResponse({ error: err.message, stack: err.stack }, 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
