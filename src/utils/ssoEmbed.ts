/**
 * SSO Embed Helper Utility for handling iframe postMessage authentication.
 */

export const checkIsEmbedMode = (): boolean => {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  const hasEmbedQuery = urlParams.get('embed') === '1';
  const hasEmbedHash = window.location.hash.includes('embed=1');

  if (hasEmbedQuery || hasEmbedHash) {
    try {
      sessionStorage.setItem('is_embed_mode', 'true');
    } catch (e) {
      // Ignore storage errors
    }
    return true;
  }

  // Clear stored embed mode if URL does not contain embed=1
  try {
    sessionStorage.removeItem('is_embed_mode');
  } catch (e) {
    // Ignore
  }

  return false;
};

export const requestSsoTokenFromParent = (reason = 'manual/mount') => {
  if (typeof window === 'undefined') return;
  const inIframe = window.self !== window.top;

  console.log(`[SSO Embed] Outgoing REQUEST_SSO_TOKEN & SUPERAPPS_EMBED_READY to parent window.`, {
    reason,
    inIframe,
    pathname: window.location.pathname,
    hash: window.location.hash,
    search: window.location.search
  });

  const reqObj = { type: 'REQUEST_SSO_TOKEN' };
  const readyObj = { type: 'SUPERAPPS_EMBED_READY' };
  const reqStr = JSON.stringify(reqObj);
  const readyStr = JSON.stringify(readyObj);

  if (window.parent) {
    window.parent.postMessage(reqObj, '*');
    window.parent.postMessage(readyObj, '*');
    window.parent.postMessage(reqStr, '*');
    window.parent.postMessage(readyStr, '*');
  }
  if (window.top && window.top !== window.parent) {
    window.top.postMessage(reqObj, '*');
    window.top.postMessage(readyObj, '*');
    window.top.postMessage(reqStr, '*');
    window.top.postMessage(readyStr, '*');
  }
};

