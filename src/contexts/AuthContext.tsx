import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  authLoading: boolean;
  loginWithGoogle: () => Promise<FirebaseUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const authVal = useAuth();

  return (
    <AuthContext.Provider value={authVal}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
