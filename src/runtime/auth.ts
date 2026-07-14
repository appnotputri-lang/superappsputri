import { getEnv } from './env';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuthenticationError } from '../utils/errors';

interface JwksKey {
  kty: string;
  alg: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

let jwksCache: JwksKey[] | null = null;
let jwksCacheExpiry = 0;

async function getGooglePublicKeys(): Promise<JwksKey[]> {
  const now = Date.now();
  if (jwksCache && now < jwksCacheExpiry) {
    return jwksCache;
  }
  const response = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if (!response.ok) {
    throw new Error('Failed to fetch Google public JWKs for Firebase Auth');
  }
  const cacheControl = response.headers.get('cache-control');
  let maxAge = 3600 * 1000;
  if (cacheControl) {
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) {
      maxAge = parseInt(match[1], 10) * 1000;
    }
  }
  const data = await response.json() as { keys: JwksKey[] };
  jwksCache = data.keys;
  jwksCacheExpiry = now + maxAge;
  return jwksCache;
}

function base64urlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function base64urlToString(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

export async function verifyIdToken(idToken: string, env: any = {}): Promise<any> {
  if (!idToken) {
    throw new AuthenticationError('Token is required');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new AuthenticationError('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(base64urlToString(headerB64));
    payload = JSON.parse(base64urlToString(payloadB64));
  } catch (e) {
    throw new AuthenticationError('Failed to parse token payload');
  }

  // 1. Verify standard JWT header
  if (header.alg !== 'RS256') {
    throw new AuthenticationError('Invalid token algorithm, must be RS256');
  }

  const kid = header.kid;
  if (!kid) {
    throw new AuthenticationError('Token header missing "kid"');
  }

  // 2. Verify claims
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    throw new AuthenticationError('Token has expired');
  }
  if (payload.iat && payload.iat > nowSec + 300) { // allow 5 minutes clock skew
    throw new AuthenticationError('Token issued in the future');
  }

  const projectId = getEnv(env, 'FIREBASE_PROJECT_ID', firebaseConfig.projectId).trim();
  if (payload.aud !== projectId) {
    throw new AuthenticationError(`Audience mismatch. Expected: ${projectId}, got: ${payload.aud}`);
  }

  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new AuthenticationError(`Issuer mismatch. Expected: ${expectedIssuer}, got: ${payload.iss}`);
  }

  if (!payload.sub) {
    throw new AuthenticationError('Token missing subject ("sub") claim');
  }

  // 3. Cryptographic verification of signature using Web Crypto API
  try {
    const publicKeys = await getGooglePublicKeys();
    const matchingKey = publicKeys.find(k => k.kid === kid);
    if (!matchingKey) {
      throw new AuthenticationError('No matching public key found for Key ID');
    }

    const subtle = globalThis.crypto?.subtle || (await import('crypto')).webcrypto.subtle;
    if (!subtle) {
      throw new Error('Web Crypto subtle API not available in this environment');
    }

    const cryptoKey = await subtle.importKey(
      'jwk',
      matchingKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['verify']
    );

    const dataToVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64urlToBytes(signatureB64);

    const isValid = await subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      dataToVerify
    );

    if (!isValid) {
      throw new AuthenticationError('Cryptographic token signature verification failed');
    }

    // 4. Resolve Role based on priorities
    let resolvedRole = payload.role;

    if (!resolvedRole) {
      const superAdminEmailsStr = getEnv(env, 'SUPER_ADMIN_EMAILS', 'appnotputri@gmail.com');
      const superAdmins = superAdminEmailsStr.split(',').map(email => email.trim().toLowerCase());
      const userEmail = payload.email?.trim().toLowerCase();
      
      if (userEmail && superAdmins.includes(userEmail)) {
        resolvedRole = 'Super Admin';
      }
    }

    if (!resolvedRole) {
      resolvedRole = 'Staff';
    }

    return {
      uid: payload.sub,
      email: payload.email,
      email_verified: payload.email_verified,
      role: resolvedRole
    };
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(`Cryptographic verification failed: ${error.message}`);
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return null;
}

