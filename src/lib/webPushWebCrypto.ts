/**
 * Pure Web Crypto implementation of Web Push (RFC 8291 & RFC 8292).
 * 100% compatible with Cloudflare Workers, Cloudflare Pages Functions, and modern Node.js.
 * No native Node crypto / stream / http dependencies required.
 */

function getSubtle(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API (crypto.subtle) is not available');
}

export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.byteLength;
  }
  return result;
}

/**
 * Imports a VAPID P-256 private key for ECDSA signing.
 * Accepts 32-byte raw scalar (base64url) or JWK/PKCS8.
 */
async function importVapidPrivateKey(privateKeyBase64Url: string, publicKeyBase64Url: string): Promise<CryptoKey> {
  const subtle = getSubtle();
  const privBytes = base64UrlToUint8Array(privateKeyBase64Url);
  const pubBytes = base64UrlToUint8Array(publicKeyBase64Url);

  // If private key is 32 bytes and public key is 65 bytes (0x04 + 32 + 32)
  if (privBytes.length === 32 && pubBytes.length === 65) {
    const x = uint8ArrayToBase64Url(pubBytes.slice(1, 33));
    const y = uint8ArrayToBase64Url(pubBytes.slice(33, 65));
    const d = uint8ArrayToBase64Url(privBytes);

    const jwk: JsonWebKey = {
      kty: 'EC',
      crv: 'P-256',
      x,
      y,
      d,
      ext: true
    };

    return await subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }

  // Try PKCS#8 import fallback
  return await subtle.importKey(
    'pkcs8',
    privBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

/**
 * Creates a signed VAPID JWT (RFC 8292).
 */
export async function createVapidJwt(
  audience: string,
  subject: string,
  publicKeyBase64Url: string,
  privateKeyBase64Url: string,
  expirationSeconds = 12 * 3600
): Promise<string> {
  const subtle = getSubtle();
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + expirationSeconds,
    sub: subject
  };

  const headerB64 = uint8ArrayToBase64Url(stringToUint8Array(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(stringToUint8Array(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const cryptoKey = await importVapidPrivateKey(privateKeyBase64Url, publicKeyBase64Url);
  const signatureBuffer = await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    stringToUint8Array(unsignedToken)
  );

  const signatureB64 = uint8ArrayToBase64Url(new Uint8Array(signatureBuffer));
  return `${unsignedToken}.${signatureB64}`;
}

/**
 * Encrypts a plaintext payload using RFC 8291 (Message Encryption for Web Push / aes128gcm).
 */
export async function encryptWebPushPayload(
  payloadString: string,
  clientP256dhBase64Url: string,
  clientAuthBase64Url: string
): Promise<Uint8Array> {
  const subtle = getSubtle();
  const clientP256dh = base64UrlToUint8Array(clientP256dhBase64Url);
  const clientAuth = base64UrlToUint8Array(clientAuthBase64Url);

  // 1. Generate local ephemeral ECDH keypair
  const localKeyPair = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const localPublicRaw = new Uint8Array(await subtle.exportKey('raw', localKeyPair.publicKey));

  // 2. Import client public key
  const clientPublicKey = await subtle.importKey(
    'raw',
    clientP256dh,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // 3. Derive ECDH shared secret (32 bytes)
  const ecdhSecret = new Uint8Array(
    await subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // 4. Generate 16-byte random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. HKDF Extract & Expand for IKM
  // key_info = "WebPush: info\0" + clientPublicKey + localPublicKey
  const keyInfo = concatUint8Arrays([
    stringToUint8Array('WebPush: info\0'),
    clientP256dh,
    localPublicRaw
  ]);

  const prkKey = await subtle.importKey('raw', ecdhSecret, 'HKDF', false, ['deriveBits']);
  const ikm = new Uint8Array(
    await subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: clientAuth, info: keyInfo },
      prkKey,
      256
    )
  );

  // 6. HKDF Derive Content Encryption Key (CEK - 16 bytes) and Nonce (12 bytes)
  const ikmKey = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);

  const cekBytes = new Uint8Array(
    await subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: stringToUint8Array('Content-Encoding: aes128gcm\0') },
      ikmKey,
      128
    )
  );

  const nonceBytes = new Uint8Array(
    await subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: stringToUint8Array('Content-Encoding: nonce\0') },
      ikmKey,
      96
    )
  );

  // 7. Format plaintext with delimiter (RFC 8188: 0x02 for the last/only record)
  const payloadBytes = stringToUint8Array(payloadString);
  const recordPayload = new Uint8Array(payloadBytes.length + 1);
  recordPayload.set(payloadBytes, 0);
  recordPayload[payloadBytes.length] = 0x02;

  // 8. Encrypt using AES-GCM
  const aesKey = await subtle.importKey('raw', cekBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertextBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: nonceBytes, tagLength: 128 },
    aesKey,
    recordPayload
  );
  const ciphertext = new Uint8Array(ciphertextBuffer);

  // 9. Construct RFC 8188 header + ciphertext
  // [salt (16 bytes)] + [rs = 4096 (4 bytes: 0x00, 0x00, 0x10, 0x00)] + [idlen = 65 (1 byte: 0x41)] + [localPublic (65 bytes)] + [ciphertext]
  const rsHeader = new Uint8Array([0x00, 0x00, 0x10, 0x00]);
  const idLenHeader = new Uint8Array([localPublicRaw.length]);

  return concatUint8Arrays([
    salt,
    rsHeader,
    idLenHeader,
    localPublicRaw,
    ciphertext
  ]);
}

export interface SendPushNotificationOptions {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  payload: string;
  vapid: {
    publicKey: string;
    privateKey: string;
    subject: string;
  };
  ttl?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
}

export interface SendPushResult {
  statusCode: number;
  success: boolean;
  isExpired: boolean;
  statusText?: string;
  error?: string;
}

/**
 * Dispatches a Web Push notification natively using Web Crypto & standard fetch().
 */
export async function sendWebPushNotification(options: SendPushNotificationOptions): Promise<SendPushResult> {
  const { subscription, payload, vapid, ttl = 86400, urgency = 'high' } = options;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return {
      statusCode: 400,
      success: false,
      isExpired: false,
      error: 'Invalid push subscription object: missing endpoint or keys'
    };
  }

  if (!vapid?.publicKey || !vapid?.privateKey || !vapid?.subject) {
    return {
      statusCode: 500,
      success: false,
      isExpired: false,
      error: 'Push notification service is not configured (missing VAPID credentials)'
    };
  }

  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = endpointUrl.origin;

    // 1. Generate VAPID JWT
    const jwt = await createVapidJwt(
      audience,
      vapid.subject,
      vapid.publicKey,
      vapid.privateKey
    );

    // 2. Encrypt payload with RFC 8291
    const encryptedBody = await encryptWebPushPayload(
      payload,
      subscription.keys.p256dh,
      subscription.keys.auth
    );

    // 3. Send HTTP POST request to push service
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': String(ttl),
        'Urgency': urgency,
        'Authorization': `vapid t=${jwt}, k=${vapid.publicKey}`,
        'Crypto-Key': `p256ecdsa=${vapid.publicKey}`
      },
      body: encryptedBody
    });

    const statusCode = response.status;
    const isExpired = statusCode === 404 || statusCode === 410;
    const success = response.ok;

    if (!success) {
      const errorText = await response.text().catch(() => '');
      return {
        statusCode,
        success: false,
        isExpired,
        statusText: response.statusText,
        error: errorText || response.statusText
      };
    }

    return {
      statusCode,
      success: true,
      isExpired: false
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      success: false,
      isExpired: false,
      error: err.message || String(err)
    };
  }
}
