import { useEffect } from 'react';

/**
 * Custom hook to dynamically synchronize iOS / mobile visual viewport height
 * into the CSS custom property `--app-height`.
 * 
 * Prevents iOS PWA standalone bottom bar / viewport mismatch glitches
 * where `100dvh` or `100vh` fails to match the actual visible viewport.
 */
export const useViewportHeight = (): void => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateAppHeight = () => {
      const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
      document.documentElement.style.setProperty('--app-height', `${height}px`);
    };

    // Initialize immediately on mount
    updateAppHeight();

    // Listen to window events
    window.addEventListener('resize', updateAppHeight, { passive: true });
    window.addEventListener('orientationchange', updateAppHeight, { passive: true });
    window.addEventListener('pageshow', updateAppHeight, { passive: true });

    // Listen to visualViewport events if supported
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', updateAppHeight, { passive: true });
      visualViewport.addEventListener('scroll', updateAppHeight, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', updateAppHeight);
      window.removeEventListener('orientationchange', updateAppHeight);
      window.removeEventListener('pageshow', updateAppHeight);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', updateAppHeight);
        visualViewport.removeEventListener('scroll', updateAppHeight);
      }
    };
  }, []);
};

export default useViewportHeight;
