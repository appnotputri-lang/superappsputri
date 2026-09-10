import { UserAvatar } from '../types/avatar';

// Import generated 3D corporate character assets (Transparent PNGs)
import avatarManNavy from '../assets/images/avatar_man_navy.png';
import avatarManGlasses from '../assets/images/avatar_man_glasses.png';
import avatarManGreySuit from '../assets/images/avatar_man_grey_suit.png';
import avatarManExec from '../assets/images/avatar_man_exec.png';
import avatarManDarkSuit from '../assets/images/avatar_man_dark_suit.png';

import avatarWomanLong from '../assets/images/avatar_woman_long.png';
import avatarWomanBob from '../assets/images/avatar_woman_bob.png';
import avatarWomanShort from '../assets/images/avatar_woman_short.png';
import avatarWomanWavy from '../assets/images/avatar_woman_wavy.png';
import avatarWomanSmartSuit from '../assets/images/avatar_woman_smart_suit.png';

export const AVATAR_ALIASES: Record<string, string> = {
  man_navy: 'male_01',
  man_glasses: 'male_02',
  man_grey_suit: 'male_03',
  man_exec: 'male_04',
  man_dark_suit: 'male_05',
  woman_long: 'female_01',
  woman_bob: 'female_02',
  woman_short: 'female_03',
  woman_wavy: 'female_04',
  woman_smart_suit: 'female_05'
};

export const USER_AVATARS: UserAvatar[] = [
  // PRIA (male_01 s/d male_05)
  {
    id: 'male_01',
    name: 'Pria Jas Navy',
    gender: 'MALE',
    style: '3D Professional Corporate',
    variant: 'Short Dark Hair / Navy Suit',
    description: 'Pria rambut hitam pendek rapi, setelan jas navy dan kemeja putih berdasi',
    imageUrl: avatarManNavy,
    image_url: avatarManNavy,
    isActive: true,
    is_active: true,
    roleRecommended: ['Super Admin', 'Admin'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'male_02',
    name: 'Pria Berkacamata',
    gender: 'MALE',
    style: '3D Professional Corporate',
    variant: 'Glasses / White Shirt & Tie',
    description: 'Pria cerdas berkacamata modern, kemeja putih rapi, rompi dan dasi navy',
    imageUrl: avatarManGlasses,
    image_url: avatarManGlasses,
    isActive: true,
    is_active: true,
    roleRecommended: ['Admin', 'Staff'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'male_03',
    name: 'Pria Blazer Abu-abu',
    gender: 'MALE',
    style: '3D Professional Corporate',
    variant: 'Wavy Hair / Charcoal Blazer',
    description: 'Pria rambut sedikit bergelombang, blazer abu-abu modern dan kemeja biru muda',
    imageUrl: avatarManGreySuit,
    image_url: avatarManGreySuit,
    isActive: true,
    is_active: true,
    roleRecommended: ['Staff'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'male_04',
    name: 'Pria Eksekutif',
    gender: 'MALE',
    style: '3D Professional Corporate',
    variant: 'Side-part Hair / Navy Blazer',
    description: 'Pria gaya rambut side-part rapi, blazer navy modern dengan kemeja kerah terbuka',
    imageUrl: avatarManExec,
    image_url: avatarManExec,
    isActive: true,
    is_active: true,
    roleRecommended: ['Super Admin', 'Admin'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'male_05',
    name: 'Pria Setelan Midnight',
    gender: 'MALE',
    style: '3D Professional Corporate',
    variant: 'Classic Comb / Midnight Suit',
    description: 'Pria rambut belah samping rapi, setelan jas midnight blue dengan dasi biru muda',
    imageUrl: avatarManDarkSuit,
    image_url: avatarManDarkSuit,
    isActive: true,
    is_active: true,
    roleRecommended: ['Admin', 'Staff'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },

  // WANITA (female_01 s/d female_05 — Tidak ada yang berkerudung)
  {
    id: 'female_01',
    name: 'Wanita Rambut Panjang',
    gender: 'FEMALE',
    style: '3D Professional Corporate',
    variant: 'Straight Long Hair / Navy Blazer',
    description: 'Wanita rambut panjang lurus terurai rapi, setelan blazer navy dan blus sutra',
    imageUrl: avatarWomanLong,
    image_url: avatarWomanLong,
    isActive: true,
    is_active: true,
    roleRecommended: ['Super Admin', 'Notaris', 'Admin'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'female_02',
    name: 'Wanita Rambut Sebahu',
    gender: 'FEMALE',
    style: '3D Professional Corporate',
    variant: 'Chic Bob Hair / Sapphire Blazer',
    description: 'Wanita rambut sebahu chic bob, blazer biru safir elegan dengan senyum ramah',
    imageUrl: avatarWomanBob,
    image_url: avatarWomanBob,
    isActive: true,
    is_active: true,
    roleRecommended: ['Admin', 'Staff'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'female_03',
    name: 'Wanita Rambut Pendek',
    gender: 'FEMALE',
    style: '3D Professional Corporate',
    variant: 'Pixie Cut / Charcoal Blazer',
    description: 'Wanita modern rambut pendek rapi, blazer abu-abu elegan dan kemeja putih',
    imageUrl: avatarWomanShort,
    image_url: avatarWomanShort,
    isActive: true,
    is_active: true,
    roleRecommended: ['Staff'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'female_04',
    name: 'Wanita Rambut Bergelombang',
    gender: 'FEMALE',
    style: '3D Professional Corporate',
    variant: 'Long Wavy Hair / Navy Suit',
    description: 'Wanita anggun rambut panjang bergelombang, blazer navy dan kemeja berkerah putih',
    imageUrl: avatarWomanWavy,
    image_url: avatarWomanWavy,
    isActive: true,
    is_active: true,
    roleRecommended: ['Notaris', 'Admin', 'Staff'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: 'female_05',
    name: 'Wanita Sanggul Modern',
    gender: 'FEMALE',
    style: '3D Professional Corporate',
    variant: 'Modern Updo / Formal Blazer',
    description: 'Wanita rapi gaya sanggul modern berponi samping, blazer formal aksen sutra',
    imageUrl: avatarWomanSmartSuit,
    image_url: avatarWomanSmartSuit,
    isActive: true,
    is_active: true,
    roleRecommended: ['Notaris', 'Super Admin'],
    createdAt: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

/**
 * Mendapatkan avatar berdasarkan avatarId yang tersimpan di user profile.
 * Jika belum ada, gunakan deterministic fallback berdasarkan identitas/role user
 * sehingga setiap user awal tetap memiliki avatar yang berbeda secara konsisten.
 */
export function getUserAvatar(
  avatarId?: string | null,
  role?: string | null,
  emailOrUid?: string | null
): UserAvatar {
  // 1. Jika ada avatarId eksplisit yang valid (dukung ID baru atau alias lama)
  if (avatarId && avatarId.trim() !== '') {
    const resolvedId = AVATAR_ALIASES[avatarId] || avatarId;
    const found = USER_AVATARS.find((a) => a.id === resolvedId);
    if (found) return found;
  }

  // 2. Deterministic Fallback jika belum memilih:
  // Menggunakan hash dari email / UID agar User A dan User B yang belum memilih avatar
  // tetap konsisten mendapatkan avatar yang BERBEDA dan tidak berubah saat refresh.
  if (emailOrUid && emailOrUid.trim() !== '') {
    const cleanKey = emailOrUid.toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < cleanKey.length; i++) {
      hash = (hash << 5) - hash + cleanKey.charCodeAt(i);
      hash |= 0;
    }
    const positiveIndex = Math.abs(hash) % USER_AVATARS.length;
    return USER_AVATARS[positiveIndex];
  }

  // 3. Role fallback jika email/uid tidak tersedia
  const roleLower = (role || '').toLowerCase();
  if (roleLower.includes('super admin')) {
    return USER_AVATARS[0]; // male_01 (Pria Jas Navy)
  }
  if (roleLower.includes('notaris')) {
    return USER_AVATARS[5]; // female_01 (Wanita Rambut Panjang)
  }
  if (roleLower.includes('admin')) {
    return USER_AVATARS[1]; // male_02 (Pria Berkacamata)
  }

  // Default staff
  return USER_AVATARS[2]; // male_03 (Pria Blazer Abu-abu)
}
