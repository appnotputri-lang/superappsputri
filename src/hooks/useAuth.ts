import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/AuthService';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../../types';
import { checkIsEmbedMode, requestSsoTokenFromParent } from '../utils/ssoEmbed';

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEmbedMode] = useState<boolean>(() => checkIsEmbedMode());
  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    return localStorage.getItem('notaris_user_is_logged_in') === 'true';
  });

  const requestSsoToken = useCallback((reason = 'useAuth_manual') => {
    requestSsoTokenFromParent(reason);
  }, []);

  // 1. Root SSO Listener & Proactive Token Request
  useEffect(() => {
    const isEmbed = checkIsEmbedMode();
    console.log('[SSO Embed] Root useAuth listener mounted.', {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      isEmbed,
      inIframe: window.self !== window.top
    });

    const handler = async (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          // not JSON
        }
      }

      if (data?.type === 'SUPERAPPS_SSO_TOKEN') {
        const customToken = data?.customToken;
        const tokenProp = data?.token;
        const ssoToken = customToken || tokenProp;

        console.log('[SSO Embed] Received SUPERAPPS_SSO_TOKEN in root listener from origin:', event.origin, {
          hasToken: !!ssoToken,
          hasCustomToken: !!customToken,
          hasTokenProp: !!tokenProp,
          pathname: window.location.pathname,
          hash: window.location.hash
        });

        if (ssoToken) {
          try {
            console.log('[SSO Embed] Signing in with custom token to Firebase Auth...');
            const { signInWithCustomToken } = await import('firebase/auth');
            const { auth } = await import('../lib/firebase');
            const userCredential = await signInWithCustomToken(auth, ssoToken);
            console.log('[SSO Embed] Firebase Auth Sign-In SUCCESS! User UID:', userCredential.user?.uid, 'Email:', userCredential.user?.email);
            localStorage.setItem('notaris_user_is_logged_in', 'true');
            setUser(userCredential.user);
            setAuthLoading(false);
          } catch (e: any) {
            console.error('[SSO Embed] Firebase Custom Token Sign-In FAILED with primary token:', e);

            const fallbackToken = (ssoToken === customToken) ? tokenProp : customToken;
            if (fallbackToken) {
              try {
                console.log('[SSO Embed] Retrying Firebase Auth sign-in with fallback token...');
                const { signInWithCustomToken } = await import('firebase/auth');
                const { auth } = await import('../lib/firebase');
                const userCredential = await signInWithCustomToken(auth, fallbackToken);
                console.log('[SSO Embed] Firebase Auth Sign-In SUCCESS (fallback)! User UID:', userCredential.user?.uid);
                localStorage.setItem('notaris_user_is_logged_in', 'true');
                setUser(userCredential.user);
                setAuthLoading(false);
                return;
              } catch (fallbackErr: any) {
                console.error('[SSO Embed] Fallback token sign-in also failed:', fallbackErr);
              }
            }

            window.parent?.postMessage(
              { type: 'SUPERAPPS_SSO_FAILED', message: e.message || 'SSO Sign In Failed' },
              '*'
            );
          }
        } else {
          console.warn('[SSO Embed] SUPERAPPS_SSO_TOKEN message received without token string in event.data');
        }
      }
    };

    window.addEventListener('message', handler);

    if (isEmbed || window.self !== window.top) {
      requestSsoTokenFromParent('useAuth_Mount');

      const t1 = setTimeout(() => requestSsoTokenFromParent('useAuth_Retry_400ms'), 400);
      const t2 = setTimeout(() => requestSsoTokenFromParent('useAuth_Retry_1200ms'), 1200);
      const t3 = setTimeout(() => requestSsoTokenFromParent('useAuth_Retry_2500ms'), 2500);

      return () => {
        window.removeEventListener('message', handler);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }

    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  // 2. Observe Firebase Auth State
  useEffect(() => {
    let timeoutId: any;
    const unsub = AuthService.observeAuthState((currentUser) => {
      if (currentUser) {
        localStorage.setItem('notaris_user_is_logged_in', 'true');
        setUser(currentUser);
        setAuthLoading(false);
      } else {
        const wasLoggedIn = localStorage.getItem('notaris_user_is_logged_in') === 'true';
        if (wasLoggedIn) {
          timeoutId = setTimeout(() => {
            localStorage.removeItem('notaris_user_is_logged_in');
            setUser(null);
            setAuthLoading(false);
          }, 1500);
        } else {
          setUser(null);
          setAuthLoading(false);
        }
      }
    });

    return () => {
      unsub();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // 3. Listen to user profile changes
  useEffect(() => {
    if (user) {
      const unsubProfile = AuthService.observeUserProfile(
        user.uid,
        user.email,
        user.displayName,
        (profile) => {
          setUserProfile(profile);
        }
      );
      return () => unsubProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // Fail-safe to ensure loader disappears even with network failure
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthLoading(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  const loginWithGoogle = async () => {
    try {
      return await AuthService.loginWithGoogle();
    } catch (error) {
      console.error('Error in useAuth.loginWithGoogle:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('notaris_user_is_logged_in');
      setUser(null);
      setUserProfile(null);
      setAuthLoading(false);
      await AuthService.logout();
    } catch (error) {
      console.error('Error in useAuth.logout:', error);
      throw error;
    }
  };

  return {
    user,
    userProfile,
    authLoading,
    isEmbedMode,
    loginWithGoogle,
    logout,
    requestSsoToken
  };
};

