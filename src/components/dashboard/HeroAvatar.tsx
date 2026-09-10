import React from 'react';
import { UserProfile } from '../../../types';
import { UserAvatar3D } from '../common/UserAvatar3D';

interface HeroAvatarProps {
  userProfile?: UserProfile | null;
  currentUser?: any;
  onOpenAvatarSettings?: () => void;
}

export const HeroAvatar: React.FC<HeroAvatarProps> = ({
  userProfile,
  currentUser,
  onOpenAvatarSettings
}) => {
  return (
    <UserAvatar3D
      avatarId={userProfile?.avatarId || userProfile?.avatar_id}
      role={userProfile?.role || currentUser?.role}
      userKey={userProfile?.uid || currentUser?.uid || userProfile?.email || currentUser?.email}
      size="hero"
      onOpenAvatarSettings={onOpenAvatarSettings}
    />
  );
};



