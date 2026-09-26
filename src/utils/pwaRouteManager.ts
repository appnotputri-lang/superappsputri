import { isReservedPath } from '../constants/tabs';

/**
 * Checks if a given pathname / url is a public route (not part of the internal PWA app)
 */
export function isPublicUrlPath(pathname: string, hash: string = ''): boolean {
  const normalizedPath = pathname.toLowerCase();
  const normalizedHash = hash.toLowerCase();

  // 1. Webinar Public Form (exclude admin dashboard/peserta/pengaturan)
  const isWebinarAdmin =
    normalizedPath.startsWith('/webinar/dashboard') ||
    normalizedPath.startsWith('/webinar/peserta') ||
    normalizedPath.startsWith('/webinar/pengaturan') ||
    normalizedHash.includes('/webinar/dashboard') ||
    normalizedHash.includes('/webinar/peserta') ||
    normalizedHash.includes('/webinar/pengaturan');

  const isWebinarPublic =
    !isWebinarAdmin &&
    (normalizedPath === '/webinar' ||
      normalizedPath.startsWith('/webinar/') ||
      normalizedHash.includes('/webinar') ||
      normalizedHash.includes('#/webinar'));

  if (isWebinarPublic) return true;

  // 2. Surat BO Public Form
  const isSuratBo =
    normalizedPath === '/surat-bo' ||
    normalizedPath === '/surat_bo' ||
    normalizedPath.startsWith('/surat-bo/') ||
    normalizedPath.startsWith('/surat_bo/') ||
    normalizedHash.includes('/surat-bo') ||
    normalizedHash.includes('/surat_bo');

  if (isSuratBo) return true;

  // 3. Public Document / Delivery Note / Tanda Terima
  const isPublicDoc =
    normalizedPath.startsWith('/doc/') ||
    normalizedPath.startsWith('/delivery/') ||
    normalizedPath === '/delivery' ||
    normalizedPath === '/tanda-terima' ||
    normalizedPath.startsWith('/tanda-terima/') ||
    normalizedHash.includes('/doc/') ||
    normalizedHash.includes('/delivery') ||
    normalizedHash.includes('/tanda-terima');

  if (isPublicDoc) return true;

  // 4. Public Invoice & Quotation
  const isPublicInvoice =
    normalizedPath.startsWith('/inv/') ||
    normalizedPath.includes('/invoice/public') ||
    normalizedHash.includes('/inv/') ||
    normalizedHash.includes('/invoice/public');

  if (isPublicInvoice) return true;

  const isPublicQuotation =
    normalizedPath.startsWith('/q/') ||
    normalizedHash.includes('/q/');

  if (isPublicQuotation) return true;

  // 5. Short Token Routes (e.g. /abc123xyz)
  const isSingleSegment = /^\/[A-Za-z0-9_-]+\/?$/.test(pathname) && pathname !== '/';
  if (isSingleSegment && !isReservedPath(pathname)) {
    return true;
  }

  return false;
}

let storedManifestHref: string = '/manifest.webmanifest';
let installPromptBlocker: ((e: Event) => void) | null = null;

/**
 * Dynamically toggles PWA features (manifest, apple-touch, install prompt)
 * based on whether the current route is public or private.
 */
export function applyPwaRoutePolicy(pathname?: string, hash?: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const currentPath = pathname ?? window.location.pathname;
  const currentHash = hash ?? window.location.hash;
  const isPublic = isPublicUrlPath(currentPath, currentHash);

  const head = document.head;
  const manifestLink = head.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;

  if (isPublic) {
    // -------------------------------------------------------------
    // PUBLIC ROUTE: DISABLE PWA
    // -------------------------------------------------------------
    if (manifestLink) {
      if (manifestLink.href) {
        storedManifestHref = manifestLink.getAttribute('href') || '/manifest.webmanifest';
      }
      manifestLink.remove();
    }

    // Adjust meta tags to regular web page
    const appleMeta = head.querySelector('meta[name="apple-mobile-web-app-capable"]') as HTMLMetaElement | null;
    if (appleMeta) appleMeta.content = 'no';

    const mobileMeta = head.querySelector('meta[name="mobile-web-app-capable"]') as HTMLMetaElement | null;
    if (mobileMeta) mobileMeta.content = 'no';

    // Suppress browser PWA beforeinstallprompt on public links
    if (!installPromptBlocker) {
      installPromptBlocker = (e: Event) => {
        e.preventDefault();
      };
      window.addEventListener('beforeinstallprompt', installPromptBlocker);
    }
  } else {
    // -------------------------------------------------------------
    // NON-PUBLIC / INTERNAL APP ROUTE: MAINTAIN FULL PWA
    // -------------------------------------------------------------
    if (!manifestLink) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = storedManifestHref || '/manifest.webmanifest';
      head.appendChild(link);
    }

    const appleMeta = head.querySelector('meta[name="apple-mobile-web-app-capable"]') as HTMLMetaElement | null;
    if (appleMeta) appleMeta.content = 'yes';

    const mobileMeta = head.querySelector('meta[name="mobile-web-app-capable"]') as HTMLMetaElement | null;
    if (mobileMeta) mobileMeta.content = 'yes';

    // Remove blocker so internal users can install PWA
    if (installPromptBlocker) {
      window.removeEventListener('beforeinstallprompt', installPromptBlocker);
      installPromptBlocker = null;
    }
  }
}
