import React, { useState } from 'react';
import { UserProfile } from '../../../types';
import { USER_AVATARS, getUserAvatar } from '../../data/userAvatars';
import { UserAvatar, AvatarGender } from '../../types/avatar';
import { AuthService } from '../../services/AuthService';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Check, 
  RefreshCw,
  SlidersHorizontal,
  Info
} from 'lucide-react';

interface MyProfileTabProps {
  currentUser: UserProfile | null;
  onProfileUpdated?: () => void;
}

export const MyProfileTab: React.FC<MyProfileTabProps> = ({
  currentUser,
  onProfileUpdated
}) => {
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [savingAvatarId, setSavingAvatarId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const effectiveAvatarId = currentUser?.avatarId || currentUser?.avatar_id;
  const currentAvatar = getUserAvatar(
    effectiveAvatarId,
    currentUser?.role,
    currentUser?.uid || currentUser?.email
  );

  const filteredAvatars = USER_AVATARS.filter((avatar) => {
    if (selectedGenderFilter === 'ALL') return true;
    return avatar.gender === selectedGenderFilter;
  });

  const handleSelectAvatar = async (avatar: UserAvatar) => {
    if (!currentUser?.uid) {
      alert('Sesi pengguna tidak valid. Silakan muat ulang halaman.');
      return;
    }

    if (effectiveAvatarId === avatar.id) {
      // Already selected
      return;
    }

    setIsSaving(true);
    setSavingAvatarId(avatar.id);

    try {
      await AuthService.updateUserAvatar(currentUser.uid, {
        avatarId: avatar.id,
        avatar_id: avatar.id,
        avatar_gender: avatar.gender,
        gender: avatar.gender,
        avatar_style: avatar.style,
        avatar_variant: avatar.variant,
        avatar_image: avatar.imageUrl,
        imageUrl: avatar.imageUrl
      });

      setSuccessToast(`Avatar 3D "${avatar.name}" berhasil diterapkan pada profil Anda!`);
      setTimeout(() => setSuccessToast(null), 3500);

      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err: any) {
      console.error('Error saving avatar:', err);
      alert('Gagal menyimpan avatar: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsSaving(false);
      setSavingAvatarId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Header */}
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 font-heading">Profil Saya & Avatar 3D</h3>
          <p className="text-xs text-slate-500">
            Kelola data identitas dan pilih karakter avatar 3D profesional untuk dashboard Anda
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2.5 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* User Info Overview & Active Avatar Preview Card */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden">
        {/* Background Ambient Circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          
          {/* Active 3D Avatar Preview in Blue Hero Style */}
          <div className="relative shrink-0 flex flex-col items-center">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-gradient-to-b from-[#1e61c3] to-[#174fa3] p-1 shadow-inner border border-blue-400/30 relative overflow-hidden flex items-end justify-center">
              <img
                src={currentAvatar.imageUrl}
                alt={currentAvatar.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain object-bottom filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]"
              />
              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-emerald-500/90 text-[9px] font-bold text-white rounded-full uppercase tracking-wider shadow-xs">
                Aktif
              </span>
            </div>
            <span className="text-[11px] font-semibold text-blue-200 mt-2 text-center">
              {currentAvatar.name}
            </span>
          </div>

          {/* User Details */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h4 className="text-base md:text-lg font-bold text-white font-heading">
                  {currentUser?.name || 'Pengguna Sistem'}
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded-full uppercase">
                  {currentUser?.role || 'Staff'}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5 flex items-center justify-center md:justify-start gap-1.5">
                <Mail size={12} />
                <span>{currentUser?.email || '—'}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/10 text-xs">
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <span className="text-[10px] text-blue-300/70 block">Gaya Karakter</span>
                <span className="font-semibold text-white truncate block">{currentAvatar.style}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                <span className="text-[10px] text-blue-300/70 block">Varian Aktif</span>
                <span className="font-semibold text-white truncate block">{currentAvatar.variant}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-blue-300/70 block">Status Akun</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={12} /> Terverifikasi
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Avatar Selection Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-l-2 border-blue-600 pl-2">
              Koleksi Avatar 3D Profesional
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 pl-2.5">
              Pilih karakter 3D yang sesuai dengan representasi Anda untuk tampil di area Hero Dashboard
            </p>
          </div>

          {/* Gender Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedGenderFilter('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedGenderFilter === 'ALL'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({USER_AVATARS.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedGenderFilter('MALE')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedGenderFilter === 'MALE'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pria ({USER_AVATARS.filter(a => a.gender === 'MALE').length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedGenderFilter('FEMALE')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedGenderFilter === 'FEMALE'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wanita ({USER_AVATARS.filter(a => a.gender === 'FEMALE').length})
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Setiap user memiliki avatar individual yang tersimpan di profil database. Avatar Anda akan otomatis menyatu dengan latar belakang biru hero pada dashboard desktop tanpa batas kotak atau frame.
          </p>
        </div>

        {/* Avatar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pt-1">
          {filteredAvatars.map((avatar) => {
            const isSelected = currentAvatar.id === avatar.id;
            const isCurrentlySaving = isSaving && savingAvatarId === avatar.id;

            return (
              <div
                key={avatar.id}
                onClick={() => handleSelectAvatar(avatar)}
                className={`relative group rounded-xl border p-2.5 flex flex-col items-center text-center transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200/90 bg-white hover:border-blue-300 hover:bg-slate-50/70 hover:shadow-xs'
                }`}
              >
                {/* Active Badge / Selection Check */}
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}

                {/* Avatar Visual Thumbnail with Blue Backdrop Blend */}
                <div className="w-full aspect-square rounded-lg bg-gradient-to-b from-[#1e61c3] to-[#174fa3] p-1 relative overflow-hidden flex items-end justify-center mb-2 shadow-xs group-hover:scale-[1.02] transition-transform">
                  <img
                    src={avatar.imageUrl}
                    alt={avatar.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain object-bottom filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
                  />

                  {/* Gender pill */}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-xs text-[8px] font-bold text-white/90 rounded">
                    {avatar.gender === 'MALE' ? 'Pria' : 'Wanita'}
                  </span>
                </div>

                {/* Info Text */}
                <div className="w-full space-y-0.5">
                  <h5 className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                    {avatar.name}
                  </h5>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                    {avatar.description}
                  </p>
                </div>

                {/* Action Button Indicator */}
                <div className="w-full mt-2.5 pt-2 border-t border-slate-100">
                  {isSelected ? (
                    <span className="text-[10px] font-bold text-blue-700 flex items-center justify-center gap-1">
                      <Check size={11} strokeWidth={3} /> Terpilih
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isSaving}
                      className="w-full text-[10px] font-semibold text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-100/50 py-1 rounded transition-colors"
                    >
                      {isCurrentlySaving ? (
                        <span className="flex items-center justify-center gap-1">
                          <RefreshCw size={10} className="animate-spin" /> Menyimpan...
                        </span>
                      ) : (
                        'Gunakan Avatar'
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
