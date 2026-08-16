import React from 'react';
import { 
  Menu, 
  Mail, 
  Moon, 
  ChevronDown, 
  User, 
  Home, 
  Building2, 
  Lock,
  Settings as SettingsIcon,
  HelpCircle
} from 'lucide-react';
import { RealTimeClock } from '../RealTimeClock';
import { SidebarTabId, UserProfile } from '../../../types';

interface HeaderProps {
  user: any;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  userProfile: UserProfile | null;
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
  isUserDropdownOpen,
  setIsUserDropdownOpen,
  setIsEditProfileModalOpen,
  setActiveSidebarTab,
  loginWithGoogle,
  logout
}) => {
  return (
    <header className="hidden md:flex bg-white border-b border-slate-200/80 justify-between items-center px-4 md:px-6 sticky top-0 z-40 h-13 md:h-14 shrink-0 shadow-xs">
      {/* Left: Greeting + Sidebar toggle */}
      <div className="flex items-center gap-2 md:gap-3">
        {user && (
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100/90 active:scale-95 rounded-lg transition-all shrink-0 cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4 md:w-4.5 md:h-4.5" />
          </button>
        )}
        <div className="flex flex-col">
          <span className="font-bold text-xs md:text-[13px] text-slate-800 leading-tight">
            {(() => {
              const hour = new Date().getHours();
              let greeting = 'Selamat malam';
              if (hour >= 4 && hour < 11) greeting = 'Selamat pagi';
              else if (hour >= 11 && hour < 15) greeting = 'Selamat siang';
              else if (hour >= 15 && hour < 19) greeting = 'Selamat sore';
              return greeting;
            })()}, {userProfile?.name?.split(' ')[0] || 'ADMIN'} 👋
          </span>
          <span className="hidden sm:block text-[9.5px] text-slate-400 font-medium tracking-wide">PUSAT KENDALI KANTOR</span>
        </div>
      </div>
      
      {/* Right: Date/Time + Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden md:block">
          <RealTimeClock />
        </div>

        <div className="flex items-center gap-1 md:gap-1.5 pr-2 md:pr-3 border-r border-slate-200/80">
          <button className="hidden sm:flex w-11 h-11 items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <Mail className="w-5 h-5 text-slate-500" />
          </button>
          <button className="hidden sm:flex w-11 h-11 items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <Moon className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>
    </header>
  );
};
