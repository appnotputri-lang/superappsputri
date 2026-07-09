import { useState, useEffect } from 'react';
import { AuthService } from '../services/AuthService';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../../types';

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    return localStorage.getItem('notaris_user_is_logged_in') === 'true';
  });

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

  // Listen to user profile changes
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
    loginWithGoogle,
    logout
  };
};
