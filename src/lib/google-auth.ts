import { getEnv } from '../runtime/env';

export async function getGoogleAccessToken(env: any = {}) {
  const clientId = getEnv(env, 'GOOGLE_DRIVE_CLIENT_ID').trim();
  const clientSecret = getEnv(env, 'GOOGLE_DRIVE_CLIENT_SECRET').trim();
  const refreshToken = getEnv(env, 'GOOGLE_DRIVE_REFRESH_TOKEN').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    const missing = [];
    if (!clientId) missing.push('GOOGLE_DRIVE_CLIENT_ID');
    if (!clientSecret) missing.push('GOOGLE_DRIVE_CLIENT_SECRET');
    if (!refreshToken) missing.push('GOOGLE_DRIVE_REFRESH_TOKEN');
    throw new Error(`Google OAuth credentials missing: ${missing.join(', ')}`);
  }

  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

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
      console.error('[GoogleAuth] Refresh Token Error Response:', data);
      throw new Error(`Failed to refresh Google access token: ${data.error_description || data.error || 'Unknown error'}`);
    }

    if (!data.access_token) {
      throw new Error('No access_token returned from Google OAuth');
    }

    return data.access_token as string;
  } catch (error) {
    console.error('[GoogleAuth] Network or Parsing Error:', error);
    throw error;
  }
}
