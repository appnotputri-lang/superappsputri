/**
 * API Utility for Dynamic API Routing
 * 
 * Determines the correct backend URL depending on the deployment environment:
 * - In local / AI Studio preview mode, uses relative paths directly.
 * - When deployed on static hosting (e.g. Cloudflare Pages), routes to the Cloud Run backend automatically.
 * - Supports VITE_API_URL override.
 */
export function getApiUrl(path: string): string {
  // 1. Check if VITE_API_URL is explicitly set in environment variables
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    const cleanBase = envApiUrl.endsWith('/') ? envApiUrl.slice(0, -1) : envApiUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  // 2. Determine based on current browser window location
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // If we are already running on the Cloud Run backend (e.g. AI Studio development/preview URL),
    // we can use the relative path directly as both frontend and backend are on the same domain.
    const isCloudRun = origin.includes('run.app');
    
    if (!isCloudRun) {
      // If we are on a different domain (e.g., Cloudflare Pages),
      // we default to the production/shared Cloud Run backend domain.
      const fallbackUrl = 'https://ais-pre-donxcbjszqgkqg7o7wcqgb-331118767863.asia-southeast1.run.app';
      const cleanBase = fallbackUrl.endsWith('/') ? fallbackUrl.slice(0, -1) : fallbackUrl;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${cleanBase}${cleanPath}`;
    }
  }

  // Fallback to relative path
  return path;
}
