export type AvatarGender = 'MALE' | 'FEMALE';

export interface UserAvatar {
  id: string;
  name: string;
  gender: AvatarGender;
  style: string;
  variant?: string;
  description: string;
  imageUrl: string;
  image_url?: string;
  isActive: boolean;
  is_active?: boolean;
  roleRecommended?: string[];
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}
