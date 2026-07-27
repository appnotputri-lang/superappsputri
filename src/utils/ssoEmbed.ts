/**
 * SSO Embed Helper Utility for handling iframe postMessage authentication.
 */

export const checkIsEmbedMode = (): boolean => {
  if (typeof window === 'undefined') return false;

  const inIframe = window.self !== window.top;
  const urlParams = new URLSearchParams(window.location.search);
  const hasEmbedQuery = urlParams.get('embed') === '1';
  const hasEmbedHash = window.location.hash.includes('embed=1');
  const storedEmbed = sessionStorage.getItem('is_embed_mode') === 'true';

  const isEmbed = inIframe || hasEmbedQuery || hasEmbedHash || storedEmbed;

  if (isEmbed) {
    try {
      sessionStorage.setItem('is_embed_mode', 'true');
    } catch (e) {
      // Ignore storage errors
    }
  }

  return isEmbed;
};

export const requestSsoTokenFromParent = (reason = 'manual/mount') => {
  if (typeof window === 'undefined') return;
  const inIframe = window.self !== window.top;

  console.log(`[SSO Embed] Sending REQUEST_SSO_TOKEN & SUPERAPPS_EMBED_READY to parent window (Reason: ${reason}, inIframe: ${inIframe})`);

  if (window.parent) {
    window.parent.postMessage({ type: 'REQUEST_SSO_TOKEN' }, '*');
    window.parent.postMessage({ type: 'SUPERAPPS_EMBED_READY' }, '*');
  }
};
