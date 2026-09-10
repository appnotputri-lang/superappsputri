import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { UserProfile, UserRole } from '../../types';
import { PageContainer, PageHeader } from './ui/PageLayout';
import { MobileHeader, MobileEmptyState } from './ui/MobileHeader';
import { MobileDataCard } from './ui/MobileDataCard';
import { FirestoreTracker } from '../lib/firestoreTracker';
import { USER_AVATARS, getUserAvatar } from '../data/userAvatars';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  User as UserIcon,
  Shield,
  Loader2,
  X,
  Check
} from 'lucide-react';

interface UserManagementProps {
  currentUser: UserProfile;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Staff' as UserRole,
    avatar_id: 'male_01'
  });

  useEffect(() => {
    FirestoreTracker.logMenuOpen('Manajemen User', 'MISS', 'user_profiles', 20);
    FirestoreTracker.logListenerStart('user_profiles');
    const q = query(collection(db, 'user_profiles'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserProfile[];
      setUsers(userData);
      setLoading(false);
      FirestoreTracker.logMenuOpen('Manajemen User', 'MISS', 'user_profiles', undefined, snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'user_profiles');
      setLoading(false);
    });

    return () => {
      FirestoreTracker.logListenerStop('user_profiles');
      unsub();
    };
  }, []);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return alert('Nama dan Email wajib diisi');

    try {
      const userId = editingUser?.uid || `pre_${formData.email.replace(/[@.]/g, '_')}`;
      const now = new Date().toISOString();
      const selectedAvatar = USER_AVATARS.find(a => a.id === formData.avatar_id) || USER_AVATARS[0];
      
      const userProfile: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        avatarId: selectedAvatar.id,
        avatar_id: selectedAvatar.id,
        avatar_gender: selectedAvatar.gender,
        avatar_style: selectedAvatar.style,
        avatar_variant: selectedAvatar.variant,
        avatar_image: selectedAvatar.imageUrl,
        updatedAt: now,
      };

      if (!editingUser) {
        userProfile.createdAt = now;
        userProfile.uid = userId;
      }

      await setDoc(doc(db, 'user_profiles', userId), userProfile, { merge: true });
      
      setIsAddModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'Staff', avatar_id: 'male_01' });
      alert(editingUser ? 'User berhasil diperbarui' : 'User berhasil ditambahkan');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'user_profiles');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === 'appnotputri@gmail.com') return alert('Super Admin utama tidak dapat dihapus!');
    if (userId === currentUser.uid) return alert('Anda tidak dapat menghapus akun Anda sendiri!');
    
    if (!window.confirm(`Apakah Anda yakin ingin menghapus user ${userEmail}?`)) return;

    try {
      await deleteDoc(doc(db, 'user_profiles', userId));
      alert('User berhasil dihapus');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `user_profiles/${userId}`);
    }
  };

  const openEditModal = (user: UserProfile) => {
    const userAvatar = getUserAvatar(user.avatar_id, user.role, user.uid || user.email);
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_id: userAvatar.id
    });
    setIsAddModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon={<ShieldCheck className="w-5 h-5 text-white" />}
        title="Manajemen User & Akses"
        description="Kelola hak akses dan peran seluruh staf notaris."
        actions={
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({ name: '', email: '', role: 'Staff', avatar_id: 'man_navy' });
              setIsAddModalOpen(true);
            }}
            className="bg-[#0c2444] hover:bg-[#16365f] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm text-xs font-bold cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Tambah User Baru
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[13px] font-bold text-slate-600 uppercase tracking-wider">User & Avatar 3D</th>
                <th className="px-6 py-4 text-[13px] font-bold text-slate-600 uppercase tracking-wider">Role / Peran</th>
                <th className="px-6 py-4 text-[13px] font-bold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[13px] font-bold text-slate-600 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const userAvatar = getUserAvatar(user.avatar_id, user.role, user.uid || user.email);
                return (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#1e61c3] to-[#174fa3] p-0.5 shadow-inner shrink-0 overflow-hidden flex items-end justify-center">
                          <img
                            src={userAvatar.imageUrl}
                            alt={userAvatar.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain object-bottom filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            {user.name}
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                              {userAvatar.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${
                      user.role === 'Super Admin' 
                        ? 'bg-violet-100 text-violet-700' 
                        : user.role === 'Admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {user.role === 'Super Admin' ? <Shield className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[12px] ${user.uid.startsWith('pre_') ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {user.uid.startsWith('pre_') ? 'Menunggu Login First' : 'Aktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.uid, user.email)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Hapus User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    Tidak ada user yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="block md:hidden">
          {filteredUsers.length === 0 ? (
            <MobileEmptyState message="Tidak ada user yang ditemukan." />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUsers.map((user, idx) => (
                <MobileDataCard
                  key={user.uid}
                  number={idx + 1}
                  title={user.name}
                  subtitle={user.email}
                  badges={[
                    user.role,
                    user.uid.startsWith('pre_') ? 'Menunggu Login' : 'Aktif',
                  ]}
                  onDetail={() => openEditModal(user)}
                  detailLabel="Edit"
                  onDelete={() => handleDeleteUser(user.uid, user.email)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                {editingUser ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {editingUser ? 'Edit Informasi User' : 'Tambah User Baru'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg transition-all">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email (Google Account)</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="email@gmail.com"
                />
                <p className="text-[11px] text-slate-500 mt-1 italic">* Harus email Google yang digunakan untuk login.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Role / Peran Hak Akses</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all appearance-none bg-white"
                >
                  <option value="Staff">Staff (Terbatas)</option>
                  <option value="Admin">Admin (Penuh)</option>
                  <option value="Super Admin">Super Admin (Sistem)</option>
                </select>
                <div className="mt-2 p-3 bg-violet-50 rounded-lg border border-violet-100">
                  <p className="text-[11px] text-violet-700 leading-relaxed">
                    {formData.role === 'Super Admin' && '• Akses penuh ke seluruh sistem, manajemen user, dan hapus permanen.'}
                    {formData.role === 'Admin' && '• Akses manajemen proyek, klien, dan dokumen. Tidak bisa kelola user.'}
                    {formData.role === 'Staff' && '• Hanya bisa membuat dan memperbarui data yang ditugaskan.'}
                  </p>
                </div>
              </div>

              {/* Pilihan Avatar 3D User */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Pilihan Avatar 3D User</span>
                  <span className="text-[11px] text-blue-600 font-normal">Karakter 3D Berbeda</span>
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  {USER_AVATARS.map((avatar) => {
                    const isSelected = formData.avatar_id === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar_id: avatar.id })}
                        className={`p-1 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center ${
                          isSelected
                            ? 'border-blue-600 bg-blue-100/70 ring-1 ring-blue-500 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                        title={`${avatar.name} (${avatar.gender === 'MALE' ? 'Pria' : 'Wanita'})`}
                      >
                        <div className="w-10 h-10 rounded-md bg-gradient-to-b from-[#1e61c3] to-[#174fa3] p-0.5 overflow-hidden flex items-end justify-center">
                          <img
                            src={avatar.imageUrl}
                            alt={avatar.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain object-bottom filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 truncate w-full mt-1">
                          {avatar.name.replace('Pria ', 'P. ').replace('Wanita ', 'W. ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
