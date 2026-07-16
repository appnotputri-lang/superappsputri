import React from 'react';
import { 
  Menu, 
  Bell, 
  BellOff, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Mail, 
  Moon, 
  ChevronDown, 
  User, 
  Home, 
  Building2, 
  Lock 
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { RealTimeClock } from '../RealTimeClock';
import { SidebarTabId, UserProfile } from '../../../types';

interface HeaderProps {
  user: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  userProfile: UserProfile | null;
  notifications: any[];
  isNotificationOpen: boolean;
  setIsNotificationOpen: (val: boolean) => void;
  isUserDropdownOpen: boolean;
  setIsUserDropdownOpen: (val: boolean) => void;
  setIsEditProfileModalOpen: (val: boolean) => void;
  setActiveSidebarTab: (tab: SidebarTabId) => void;
  loginWithGoogle: () => void;
  logout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isSidebarOpen,
  setIsSidebarOpen,
  userProfile,
  notifications,
  isNotificationOpen,
  setIsNotificationOpen,
  isUserDropdownOpen,
  setIsUserDropdownOpen,
  setIsEditProfileModalOpen,
  setActiveSidebarTab,
  loginWithGoogle,
  logout
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white border-b border-slate-200/80 flex justify-between items-center px-6 sticky top-0 z-50 h-16 shrink-0 shadow-sm">
      {/* Left: Greeting + Sidebar toggle */}
      <div className="flex items-center gap-4">
        {user && (
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-slate-100/90 text-slate-500 hover:text-slate-800 rounded transition-colors shrink-0">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-slate-800">
            {(() => {
              const hour = new Date().getHours();
              let greeting = 'Selamat malam';
              if (hour >= 4 && hour < 11) greeting = 'Selamat pagi';
              else if (hour >= 11 && hour < 15) greeting = 'Selamat siang';
              else if (hour >= 15 && hour < 19) greeting = 'Selamat sore';
              return greeting;
            })()}, {userProfile?.name?.split(' ')[0] || 'Azizah'} 👋
          </span>
          <span className="text-[10px] text-slate-500 font-medium tracking-tight">PUSAT KENDALI KANTOR</span>
        </div>
      </div>
      
      {/* Right: Date/Time + Notifications + Profile */}
      <div className="flex items-center gap-4">
        <RealTimeClock />

        <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
          {/* Notification Logic */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                setIsUserDropdownOpen(false);
              }}
              className={`p-2 rounded-full transition-all shrink-0 cursor-pointer outline-none relative ${
                isNotificationOpen 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
            </button>
            
            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2.5 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-600" /> Notifikasi
                  </span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={async () => {
                        try {
                          const unreadNotifs = notifications.filter(n => !n.read);
                          await Promise.all(
                            unreadNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }))
                          );
                        } catch (err) {
                          console.error("Gagal tandai semua dibaca:", err);
                        }
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                    >
                      Tandai semua dibaca
                    </button>
                  )}
                </div>
                
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                      <BellOff className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs text-slate-500 font-medium">Tidak ada notifikasi baru</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Semua info terbaru dari sistem akan muncul di sini</p>
                    </div>
                  ) : (
                    [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((notif) => (
                      <div key={notif.id} className={`p-3 transition-colors hover:bg-slate-50/50 flex gap-2.5 items-start text-left ${!notif.read ? 'bg-blue-50/20' : ''}`}>
                        {/* Status Type Icon */}
                        <div className={`mt-0.5 p-1 rounded-lg shrink-0 ${
                          notif.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                          notif.type === 'ERROR' ? 'bg-rose-50 text-rose-600' :
                          notif.type === 'WARNING' ? 'bg-amber-50 text-amber-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {notif.type === 'SUCCESS' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           notif.type === 'ERROR' ? <AlertCircle className="w-3.5 h-3.5" /> :
                           notif.type === 'WARNING' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                           <Info className="w-3.5 h-3.5" />}
                        </div>

                        {/* Notification content */}
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <div className="flex items-start justify-between gap-1.5">
                            <span className={`text-xs block leading-tight truncate ${!notif.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                              {notif.title}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                              {(() => {
                                try {
                                  const diffMs = Date.now() - new Date(notif.timestamp).getTime();
                                  const diffMins = Math.floor(diffMs / 60000);
                                  if (diffMins < 1) return 'Baru saja';
                                  if (diffMins < 60) return `${diffMins}m lalu`;
                                  const diffHours = Math.floor(diffMins / 60);
                                  if (diffHours < 24) return `${diffHours}j lalu`;
                                  return new Date(notif.timestamp).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
                                } catch {
                                  return 'Baru saja';
                                }
                              })()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-normal break-words">{notif.description}</p>
                          
                          {/* Actions row */}
                          <div className="flex gap-2.5 pt-1">
                            {!notif.read && (
                              <button 
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                                  } catch (err) {
                                    console.error("Gagal tandai dibaca:", err);
                                  }
                                }}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                              >
                                Tandai Dibaca
                              </button>
                            )}
                            <button 
                              onClick={async () => {
                                try {
                                  await deleteDoc(doc(db, 'notifications', notif.id));
                                } catch (err) {
                                  console.error("Gagal menghapus notifikasi:", err);
                                }
                              }}
                              className="text-[10px] text-slate-400 hover:text-red-600 font-medium hover:underline cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <Mail className="w-5 h-5 text-slate-500" />
          </button>
          <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <Moon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Profile Logic */}
        <div className="relative">
          <button 
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
              setIsNotificationOpen(false);
            }}
            className="flex items-center gap-3 text-left hover:bg-slate-50 p-1 rounded-lg transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-bold shadow-inner">
              {(userProfile?.name || 'AZ').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-800">{userProfile?.name || 'Azizah'}</span>
              <span className="text-[10px] text-slate-500 leading-none">{userProfile?.level || 'Staff Kantor'}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          
          {/* User Profile Dropdown Menu */}
          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 divide-y divide-slate-100">
              <div className="px-4 py-2.5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Masuk Sebagai</p>
                <p className="text-xs font-bold text-slate-800 truncate mt-1">{userProfile?.name || 'Azizah'}</p>
                <p className="text-[10px] text-slate-505 truncate font-mono mt-0.5">{user?.email || 'admin@legalnotaris.id'}</p>
              </div>
              
              <div className="py-1 text-left row">
                <button 
                  onClick={() => {
                    setIsEditProfileModalOpen(true);
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edit Profil</span>
                </button>

                <button 
                  onClick={() => {
                    setActiveSidebarTab('beranda');
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dashboard Utama</span>
                </button>

                <button 
                  onClick={() => {
                    if (!user) {
                      if (confirm('Anda harus login terlebih dahulu untuk mengakses menu "Klien".')) {
                        loginWithGoogle();
                      }
                    } else {
                      setActiveSidebarTab('company_profile');
                    }
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Database Klien</span>
                </button>
              </div>

              <div className="py-1 text-left">
                <button 
                  onClick={() => {
                    if (user) {
                      logout();
                    } else {
                      loginWithGoogle();
                    }
                    setIsUserDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                    user ? 'text-red-600 hover:bg-red-50/50' : 'text-blue-600 hover:bg-blue-50/55'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{user ? 'Keluar Aplikasi' : 'Login / Masuk Google'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
