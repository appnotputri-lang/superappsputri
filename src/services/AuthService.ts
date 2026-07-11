import { 
  auth, 
  db, 
  loginWithGoogle as firebaseLoginWithGoogle, 
  logout as firebaseLogout,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../../types';
import { AuthenticationError, NetworkError } from '../utils/errors';
import firebaseConfig from '../../firebase-applet-config.json';

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

let oauthTokenCache: string | null = null;
let oauthTokenExpiry = 0;
let refreshPromise: Promise<string> | null = null;

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

export class AuthService {
  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  static async loginWithGoogle(): Promise<FirebaseUser> {
    return await firebaseLoginWithGoogle();
  }

  static async logout(): Promise<void> {
    await firebaseLogout();
  }

  static observeAuthState(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  static observeUserProfile(
    uid: string,
    email: string | null,
    displayName: string | null,
    onUpdate: (profile: UserProfile | null) => void,
    onError?: (err: any) => void
  ): () => void {
    const docRef = doc(db, 'user_profiles', uid);
    return onSnapshot(docRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Ensure Super Admin logic for specific email
        if (email === 'appnotputri@gmail.com' && data.role !== 'Super Admin') {
          try {
            await updateDoc(docRef, { role: 'Super Admin' });
          } catch (err) {
            console.error("Gagal memperbarui peran Super Admin:", err);
          }
          return;
        }
        onUpdate({
          ...data,
          uid,
          email: email || '',
        } as UserProfile);
      } else {
        // Initial profile creation
        const isSuperAdmin = email === 'appnotputri@gmail.com';
        const initialProfile: UserProfile = {
          uid,
          email: email || '',
          name: displayName || 'User',
          role: isSuperAdmin ? 'Super Admin' : 'Staff',
          level: isSuperAdmin ? 'Super Admin' : 'Staff',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await setDoc(docRef, initialProfile);
          onUpdate(initialProfile);
        } catch (err) {
          console.error("Gagal membuat profil pengguna baru:", err);
          if (onError) onError(err);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `user_profiles/${uid}`);
      if (onError) onError(error);
    });
  }

  // Server-side Authentication & Token Management (stateless, Cloudflare Workers compatible)
  static async verifyIdToken(idToken: string): Promise<any> {
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

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || firebaseConfig.projectId;
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

      // 4. Resolve Role based on the specified priorities:
      // Priority 1: Firebase Custom Claims (payload.role)
      // Priority 2: Environment-based Super Admin list (SUPER_ADMIN_EMAILS)
      // Priority 3: Fallback (Staff)
      let resolvedRole = payload.role;

      if (!resolvedRole) {
        const superAdminEmailsStr = process.env.SUPER_ADMIN_EMAILS || 'appnotputri@gmail.com';
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

  static async getGoogleOAuthAccessToken(): Promise<string> {
    const now = Date.now();
    // Use cached access token if valid (retaining 60s safety buffer)
    if (oauthTokenCache && now < oauthTokenExpiry - 60000) {
      return oauthTokenCache;
    }

    if (refreshPromise) {
      return refreshPromise;
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();

    if (!clientId || !clientSecret || !refreshToken) {
      const missing = [];
      if (!clientId) missing.push('GOOGLE_DRIVE_CLIENT_ID');
      if (!clientSecret) missing.push('GOOGLE_DRIVE_CLIENT_SECRET');
      if (!refreshToken) missing.push('GOOGLE_DRIVE_REFRESH_TOKEN');
      throw new AuthenticationError(`Google OAuth credentials missing in backend environment: ${missing.join(', ')}`);
    }

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    refreshPromise = (async () => {
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          body: params.toString(),
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        });

        const data = await response.json() as any;
        
        if (!response.ok) {
          console.error('[AuthService] Google OAuth token refresh response error:', data);
          throw new AuthenticationError(`Failed to refresh Google access token: ${data.error_description || data.error || 'Unknown error'}`);
        }

        if (!data.access_token) {
          throw new AuthenticationError('Google OAuth response did not contain access_token');
        }

        const expiresInSec = data.expires_in || 3600;
        oauthTokenCache = data.access_token;
        oauthTokenExpiry = Date.now() + (expiresInSec * 1000);

        return oauthTokenCache!;
      } catch (error: any) {
        if (error instanceof AuthenticationError) throw error;
        throw new NetworkError(`Google OAuth server communication failed: ${error.message}`);
      }
    })();

    try {
      const token = await refreshPromise;
      return token;
    } finally {
      refreshPromise = null;
    }
  }
}
