interface JwksKey { kty: string; n: string; e: string; kid: string; alg: string; }

let jwksCache: JwksKey[] | null = null;
let jwksCacheExpiry = 0;

async function getGooglePublicKeys(): Promise<JwksKey[]> {
  const now = Date.now();
  if (jwksCache && now < jwksCacheExpiry) return jwksCache;
  const response = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if (!response.ok) throw new Error('Gagal mengambil public key Google untuk verifikasi Firebase ID token');
  const cacheControl = response.headers.get('cache-control');
  let maxAge = 3600 * 1000;
  const match = cacheControl?.match(/max-age=(\d+)/);
  if (match) maxAge = parseInt(match[1], 10) * 1000;
  const data = await response.json() as { keys: JwksKey[] };
  jwksCache = data.keys;
  jwksCacheExpiry = now + maxAge;
  return jwksCache;
}

function base64urlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function base64urlToString(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

export interface ForeignTokenPayload { email: string; uid: string; }

/** @param idToken ID token dari app2 (project lain). @param expectedProjectId project ID app2, mis. "notarisputri-cecab" */
export async function verifyForeignFirebaseIdToken(idToken: string, expectedProjectId: string): Promise<ForeignTokenPayload> {
  if (!idToken) throw new Error('Token tidak boleh kosong');
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Format token tidak valid');
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(base64urlToString(headerB64));
  const payload = JSON.parse(base64urlToString(payloadB64));
  if (header.alg !== 'RS256') throw new Error('Algoritma token tidak didukung');
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) throw new Error('Token sudah kedaluwarsa');
  if (payload.iat && payload.iat > nowSec + 300) throw new Error('Token belum berlaku (iat di masa depan)');
  if (payload.aud !== expectedProjectId) throw new Error(`Audience token tidak cocok. Diharapkan: ${expectedProjectId}, didapat: ${payload.aud}`);
  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
  if (payload.iss !== expectedIssuer) throw new Error(`Issuer token tidak cocok. Diharapkan: ${expectedIssuer}`);
  if (!payload.email) throw new Error('Token tidak memiliki klaim email');
  const publicKeys = await getGooglePublicKeys();
  const matchingKey = publicKeys.find(k => k.kid === header.kid);
  if (!matchingKey) throw new Error('Public key untuk token ini tidak ditemukan (kid tidak cocok)');
  const subtle = globalThis.crypto?.subtle || (typeof crypto !== 'undefined' ? crypto.subtle : undefined);
  if (!subtle) throw new Error('Web Crypto subtle API tidak tersedia di lingkungan ini');
  const cryptoKey = await subtle.importKey('jwk', matchingKey as any, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const dataToVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64urlToBytes(signatureB64);
  const isValid = await subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signatureBytes, dataToVerify);
  if (!isValid) throw new Error('Tanda tangan token tidak valid');
  return { email: payload.email, uid: payload.user_id || payload.sub };
}
