import { getEnv } from '../runtime/env';

let subtle: SubtleCrypto;

async function getSubtleCrypto(): Promise<SubtleCrypto> {
  if (subtle) return subtle;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    subtle = crypto.subtle;
    return subtle;
  }
  
  try {
    const nodeCrypto = await import('crypto');
    if (nodeCrypto && nodeCrypto.webcrypto) {
      subtle = nodeCrypto.webcrypto.subtle as SubtleCrypto;
      return subtle;
    }
  } catch (e) {
    // Ignore error
  }
  
  throw new Error('Web Crypto API (subtle) is not available in this environment');
}

function base64UrlEncode(str: string): string {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// FIX: Extract PEM body strictly between BEGIN/END markers instead of naive
// .replace() on header/footer strings. This tolerates stray characters that
// commonly leak in when copying a private_key value out of a downloaded
// service-account JSON file: literal "\n" escape sequences, surrounding
// double-quotes, trailing commas, or a leftover `"private_key":` prefix.
// Any of those, left uncleaned, produce non-base64 characters that make
// crypto.subtle.importKey() reject the key with "Invalid keyData".
function extractPemBody(rawKey: string): string {
  // Normalize literal backslash-n sequences into real newlines first.
  const normalized = rawKey.replace(/\\n/g, "\n");

  const match = normalized.match(
    /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/
  );

  if (!match) {
    throw new Error(
      "[ConfigWarning] Could not locate '-----BEGIN PRIVATE KEY-----' / '-----END PRIVATE KEY-----' markers in " +
      "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY. Check that the full PEM value (not the whole JSON key file) " +
      "was pasted into the secret, and that it is PKCS8 format (starts with 'BEGIN PRIVATE KEY', not 'BEGIN RSA PRIVATE KEY')."
    );
  }

  // Strip all whitespace from the body, leaving only valid base64 characters.
  return match[1].replace(/\s+/g, "");
}

async function signJwt(
  payload: Record<string, any>,
  privateKeyPem: string
): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerEncoded}.${payloadEncoded}`;

  const pemContents = extractPemBody(privateKeyPem);

  // Diagnostic log: safe to keep, does NOT leak the actual key material.
  console.log(
    `[ServiceAccountAuth] Parsed private key body length: ${pemContents.length} chars, ` +
    `starts with "${pemContents.slice(0, 8)}", ends with "${pemContents.slice(-8)}"`
  );

  let binaryDerString: string;
  try {
    binaryDerString = atob(pemContents);
  } catch (e: any) {
    throw new Error(
      `Failed to base64-decode private key body (invalid characters present): ${e.message}`
    );
  }

  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const subtleCrypto = await getSubtleCrypto();
  const privateKey = await subtleCrypto.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signingInputBuffer = encoder.encode(signingInput);

  const signatureBuffer = await subtleCrypto.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    signingInputBuffer
  );

  const signatureEncoded = base64UrlEncodeBuffer(signatureBuffer);
  return `${signingInput}.${signatureEncoded}`;
}

let cachedToken: string | null = null;
let tokenExpiryTime = 0;

export async function getFirestoreServiceAccountToken(env: any = {}): Promise<string> {
  const now = Date.now();
  // Return cached token if it's still valid for at least 5 more minutes
  if (cachedToken && tokenExpiryTime > now + 300000) {
    return cachedToken;
  }

  const clientEmail = getEnv(env, 'FIREBASE_SERVICE_ACCOUNT_EMAIL').trim();
  const privateKey = getEnv(env, 'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY').trim();

  const isEmailPlaceholder = !clientEmail || clientEmail.includes('YOUR_') || clientEmail.includes('EXAMPLE');
  const isKeyPlaceholder = !privateKey || privateKey.length < 100 || !privateKey.includes('-----BEGIN PRIVATE KEY-----');

  if (isEmailPlaceholder || isKeyPlaceholder) {
    throw new Error(
      "[ConfigWarning] Google Service Account credentials are not configured or contain placeholder values. " +
      "Server-side automation (Google Drive Syncing) is currently paused. Please configure " +
      "FIREBASE_SERVICE_ACCOUNT_EMAIL and FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY in your settings to enable this feature."
    );
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;

  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  };

  try {
    const jwt = await signJwt(payload, privateKey);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    });

    const resData = await response.json() as any;
    if (!response.ok) {
      throw new Error(`GCP OAuth Error: ${JSON.stringify(resData)}`);
    }

    cachedToken = resData.access_token;
    const expiresIn = resData.expires_in || 3600;
    tokenExpiryTime = now + expiresIn * 1000;

    return cachedToken!;
  } catch (error: any) {
    console.error("[ServiceAccountAuth] Error generating service account token:", error.message);
    throw error;
  }
}
