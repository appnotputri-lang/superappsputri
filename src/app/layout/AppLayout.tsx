import React from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { ALLOWED_EMAILS } from '../../constants/appConstants';
import { UserProfile } from '../../../types';

export type SidebarTabId = 'beranda' | 'company_profile' | 'cv_profile' | 'notulen' | 'pendirian' | 'rupst' | 'perbaikan' | 'draft_akta_rups' | 'panduan' | 'kbli_mapping' | 'saran_kbli' | 'import_kbli' | 'laporan' | 'whatsapp_settings' | 'projects' | 'project_detail' | 'user_management';

interface AppLayoutProps {
  user: any;
  userProfile: UserProfile | null;
  authLoading: boolean;
  loginWithGoogle: () => void;
  logout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  activeSidebarTab: SidebarTabId;
  setActiveSidebarTab: (tab: SidebarTabId) => void;
  notifications: any[];
  isNotificationOpen: boolean;
  setIsNotificationOpen: (v: boolean) => void;
  isUserDropdownOpen: boolean;
  setIsUserDropdownOpen: (v: boolean) => void;
  setIsEditProfileModalOpen: (v: boolean) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  userProfile,
  authLoading,
  loginWithGoogle,
  logout,
  isSidebarOpen,
  setIsSidebarOpen,
  activeSidebarTab,
  setActiveSidebarTab,
  notifications,
  isNotificationOpen,
  setIsNotificationOpen,
  isUserDropdownOpen,
  setIsUserDropdownOpen,
  setIsEditProfileModalOpen,
  children
}) => {
  const isPublicRoute = window.location.pathname === '/rupst';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-medium text-sm">
        Memuat aplikasi...
      </div>
    );
  }

  if (!isPublicRoute && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            LD
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-800">LegalDraft Engine</h1>
            <p className="text-xs text-slate-500">Silakan login menggunakan akun Google terdaftar untuk mengakses sistem.</p>
          </div>
          <button
            onClick={loginWithGoogle}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-4 rounded-md font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
          >
            Masuk dengan Google
          </button>
        </div>
      </div>
    );
  }

  if (!isPublicRoute && user && user.email && !ALLOWED_EMAILS.includes(user.email)) {
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

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {user && (
        <Sidebar
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeSidebarTab={activeSidebarTab}
          setActiveSidebarTab={setActiveSidebarTab}
          userProfile={userProfile}
          loginWithGoogle={loginWithGoogle}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          userProfile={userProfile}
          notifications={notifications}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          isUserDropdownOpen={isUserDropdownOpen}
          setIsUserDropdownOpen={setIsUserDropdownOpen}
          setIsEditProfileModalOpen={setIsEditProfileModalOpen}
          setActiveSidebarTab={setActiveSidebarTab}
          loginWithGoogle={loginWithGoogle}
          logout={logout}
        />
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 md:p-8 pb-24 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
};
