const CUSTOM_TOKEN_AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

function base64urlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') bytes = new TextEncoder().encode(data);
  else if (data instanceof Uint8Array) bytes = data;
  else bytes = new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle || (typeof crypto !== 'undefined' ? crypto.subtle : undefined);
  if (!subtle) throw new Error('Web Crypto subtle API tidak tersedia di lingkungan ini');
  return subtle;
}

async function importPrivateKeyFromPem(pem: string): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const pemContents = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const binaryDer = atob(pemContents);
  const bytes = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) bytes[i] = binaryDer.charCodeAt(i);
  return subtle.importKey('pkcs8', bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

/** @param uid UID target di project superapps sendiri. @param serviceAccountEmail client_email dari service account JSON superapps. @param privateKeyPem private_key dari service account JSON superapps (boleh literal \n). */
export async function mintFirebaseCustomToken(uid: string, serviceAccountEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: serviceAccountEmail, sub: serviceAccountEmail, aud: CUSTOM_TOKEN_AUDIENCE, iat: now, exp: now + 3600, uid };
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const normalizedPem = privateKeyPem.replace(/\\n/g, '\n');
  const cryptoKey = await importPrivateKeyFromPem(normalizedPem);
  const subtle = getSubtleCrypto();
  const signature = await subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  const signatureB64 = base64urlEncode(signature);
  return `${signingInput}.${signatureB64}`;
}
