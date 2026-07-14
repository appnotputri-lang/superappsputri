import { getAuth } from "firebase/auth";

/**
 * Helper to get the correct API URL based on the runtime environment.
 * If VITE_API_URL is provided in the environment variables, it uses that.
 * Otherwise, it uses same-origin relative paths (ideal for Cloudflare Pages Functions same-origin routing).
 */
export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // 1. Check if explicit API URL is configured
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    const cleanBase = envApiUrl.endsWith('/') ? envApiUrl.slice(0, -1) : envApiUrl;
    return `${cleanBase}${cleanPath}`;
  }

  // 2. Default to same-origin relative path
  return cleanPath;
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const auth = getAuth();
  const user = auth.currentUser;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (user) {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}
