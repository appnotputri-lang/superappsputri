import React, { useState } from 'react';
import { getUserAvatar, USER_AVATARS } from '../../data/userAvatars';
import { UserAvatar } from '../../types/avatar';
import { Edit3 } from 'lucide-react';

export type UserAvatarSize = 'sm' | 'md' | 'lg' | 'hero';

export interface UserAvatar3DProps {
  avatarId?: string | null;
  size?: UserAvatarSize;
  className?: string;
  role?: string | null;
  userKey?: string | null;
  alt?: string;
  onOpenAvatarSettings?: () => void;
}

export const UserAvatar3D: React.FC<UserAvatar3DProps> = ({
  avatarId,
  size = 'md',
  className = '',
  role,
  userKey,
  alt,
  onOpenAvatarSettings
}) => {
  const [hasError, setHasError] = useState(false);

  // Safely resolve avatar from master list or deterministic fallback
  const resolvedAvatar: UserAvatar = getUserAvatar(avatarId, role, userKey);
  const avatarImageSrc = (!hasError && (resolvedAvatar.imageUrl || resolvedAvatar.image_url))
    ? (resolvedAvatar.imageUrl || resolvedAvatar.image_url)
    : USER_AVATARS[0].imageUrl;

  const displayName = alt || resolvedAvatar.name || 'User Avatar 3D';

  // 1. HERO VARIANT — Khusus Hero Header Desktop (100% Transparent, menyatu langsung dengan background hero)
  if (size === 'hero') {
    return (
      <div
        className={`hidden md:flex items-end justify-center shrink-0 relative z-20 select-none self-start -mb-14 md:-mb-16 pointer-events-auto bg-transparent ${className}`}
        aria-label={`Avatar 3D: ${displayName}`}
      >
        <div className="relative flex items-end justify-center group bg-transparent">
          {/* 3D Character Image (100% Transparent PNG, langsung berdiri di atas hero biru) */}
          <div className="relative h-60 sm:h-68 md:h-76 lg:h-84 xl:h-[355px] w-auto flex items-end justify-center transition-transform duration-300 ease-out group-hover:scale-[1.02] bg-transparent">
            <img
              src={avatarImageSrc}
              alt={displayName}
              referrerPolicy="no-referrer"
              onError={() => setHasError(true)}
              className="h-full w-auto max-w-[280px] sm:max-w-[320px] md:max-w-[340px] lg:max-w-[370px] object-contain object-bottom bg-transparent"
              style={{
                // Soft vertical fade masking only the bottom edge so it blends into the bottom border
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 78%, rgba(0,0,0,0.5) 90%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 78%, rgba(0,0,0,0.5) 90%, rgba(0,0,0,0) 100%)'
              }}
            />
          </div>

          {/* Subtle Quick-Change Button on Hover */}
          {onOpenAvatarSettings && (
            <button
              onClick={onOpenAvatarSettings}
              type="button"
              className="absolute top-4 -left-2 md:-left-4 bg-white/20 hover:bg-white/35 backdrop-blur-md border border-white/30 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer z-30 select-none"
              title="Ganti Avatar 3D di Pengaturan Profil"
            >
              <Edit3 size={11} />
              <span>Ganti Avatar</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. SM VARIANT (32px - 36px)
  if (size === 'sm') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 w-8 h-8 rounded-full overflow-hidden bg-slate-100/90 border border-slate-200 shadow-2xs ${className}`}>
        <img
          src={avatarImageSrc}
          alt={displayName}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-contain object-top scale-110 translate-y-0.5"
        />
      </div>
    );
  }

  // 3. LG VARIANT (64px - 72px)
  if (size === 'lg') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 w-16 h-16 md:w-18 md:h-18 rounded-2xl overflow-hidden bg-gradient-to-b from-blue-50 to-slate-100 border border-blue-100 shadow-sm ${className}`}>
        <img
          src={avatarImageSrc}
          alt={displayName}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-contain object-bottom scale-110 translate-y-1"
        />
      </div>
    );
  }

  // 4. MD VARIANT (DEFAULT ~ 40px - 44px)
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden bg-slate-100/90 border border-slate-200 shadow-2xs ${className}`}>
      <img
        src={avatarImageSrc}
        alt={displayName}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-contain object-top scale-115 translate-y-0.5"
      />
    </div>
  );
};
