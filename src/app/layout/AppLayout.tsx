import React from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { ALLOWED_EMAILS } from '../../constants/appConstants';
import { UserProfile, SidebarTabId } from '../../../types';
import { EmbedSsoWaitingView } from '../../components/auth/EmbedSsoWaitingView';
import { isReservedPath } from '../../constants/tabs';
import { UpdatePrompt } from '../../components/common/UpdatePrompt';
import { FirestoreQuotaBanner } from '../../components/common/FirestoreQuotaBanner';
import { AppLoader } from '../../components/ui/AppLoader';

export type { SidebarTabId };

interface AppLayoutProps {
  isEmbedMode?: boolean;
  user: any;
  userProfile: UserProfile | null;
  authLoading: boolean;
  loginWithGoogle: () => void;
  logout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  activeSidebarTab: SidebarTabId;
  setActiveSidebarTab: (tab: SidebarTabId) => void;
  isUserDropdownOpen: boolean;
  setIsUserDropdownOpen: (v: boolean) => void;
  setIsEditProfileModalOpen: (v: boolean) => void;
  children: React.ReactNode;
}

const TABS_WITH_MOBILE_HERO: SidebarTabId[] = ['company_profile'];

export const AppLayout: React.FC<AppLayoutProps> = ({
  isEmbedMode = false,
  user,
  userProfile,
  authLoading,
  loginWithGoogle,
  logout,
  isSidebarOpen,
  setIsSidebarOpen,
  activeSidebarTab,
  setActiveSidebarTab,
  isUserDropdownOpen,
  setIsUserDropdownOpen,
  setIsEditProfileModalOpen,
  children
}) => {
  const isSingleSegmentPath = /^\/[A-Za-z0-9_-]+\/?$/.test(window.location.pathname) && window.location.pathname !== '/';
  const isPossibleTokenRoute = isSingleSegmentPath && !isReservedPath(window.location.pathname);
  const isLegacyInvRoute = /^\/inv\/[A-Za-z0-9_-]+\/?$/i.test(window.location.pathname);

  const isPublicRoute = 
    window.location.pathname === '/rupst' || 
    (window.location.hash && window.location.hash.includes('/rupst')) ||
    window.location.pathname.includes('/invoice/public') ||
    (window.location.hash && window.location.hash.includes('/invoice/public')) ||
    isPossibleTokenRoute ||
    isLegacyInvRoute;

  if (authLoading) {
    if (isEmbedMode) {
      return <EmbedSsoWaitingView />;
    }
    return <AppLoader isLoading={true} message="Memuat aplikasi Notaris..." delayMs={100} />;
  }

  if (isEmbedMode && !user) {
    return <EmbedSsoWaitingView />;
  }

  if (!isPublicRoute && !isEmbedMode && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            NP
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-800">Notaris Putri SuperApp</h1>
            <p className="text-xs text-slate-500">Silakan login menggunakan akun Google terdaftar untuk mengakses sistem.</p>
          </div>
          <button
            onClick={loginWithGoogle}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-md font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
          >
            Masuk dengan Google
          </button>
        </div>
      </div>
    );
  }

  if (!isPublicRoute && !isEmbedMode && user && user.email && !ALLOWED_EMAILS.includes(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-800">Akses Ditolak</h1>
            <p className="text-xs text-slate-500">
              Email <span className="font-semibold text-slate-700">{user.email}</span> tidak terdaftar dalam sistem izin akses.
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2.5 px-4 rounded-md font-bold text-sm transition-all shadow-sm"
          >
            Keluar / Ganti Akun
          </button>
        </div>
      </div>
    );
  }

  if (isEmbedMode) {
    return (
      <div className="h-screen w-full overflow-y-auto bg-[#f8fafc] no-scrollbar">
        {children}
      </div>
    );
  }

  if (isPublicRoute) {
    return (
      <div className="h-screen w-full overflow-y-auto bg-[#f8fafc] no-scrollbar">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <UpdatePrompt />
      {user && (
        <Sidebar
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeSidebarTab={activeSidebarTab}
          setActiveSidebarTab={setActiveSidebarTab}
          userProfile={userProfile}
          loginWithGoogle={loginWithGoogle}
          isUserDropdownOpen={isUserDropdownOpen}
          setIsUserDropdownOpen={setIsUserDropdownOpen}
          setIsEditProfileModalOpen={setIsEditProfileModalOpen}
          logout={logout}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <FirestoreQuotaBanner />
        <div className="hidden md:block">
          <Header
            user={user}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            userProfile={userProfile}
            isUserDropdownOpen={isUserDropdownOpen}
            setIsUserDropdownOpen={setIsUserDropdownOpen}
            setIsEditProfileModalOpen={setIsEditProfileModalOpen}
            setActiveSidebarTab={setActiveSidebarTab}
            loginWithGoogle={loginWithGoogle}
            logout={logout}
          />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f8fafc] scroll-smooth pb-0 no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};
