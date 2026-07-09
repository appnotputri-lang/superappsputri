import React, { useState } from 'react';
import { Modal } from './Modal';
import { User, Shield, Save, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../src/lib/firebase';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentProfile: { name: string; level?: string };
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  currentProfile,
}) => {
  const [name, setName] = useState(currentProfile.name);
  const [level, setLevel] = useState(currentProfile.level || 'Staff Kantor');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return alert('Nama harus diisi');
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'user_profiles', userId), {
        name: name.trim(),
        level: level.trim() || 'Staff Kantor',
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `user_profiles/${userId}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profil Pengguna">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center text-lg font-bold shadow-sm">
            {name.substring(0, 2).toUpperCase() || 'AZ'}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Pratinjau Profil</h4>
            <p className="text-xs text-slate-500">{level || 'Level belum diatur'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
              Jabatan / Level
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none appearance-none"
              >
                <option value="Senior Notaris">Senior Notaris</option>
                <option value="Notaris Rekan">Notaris Rekan</option>
                <option value="Staff Legal">Staff Legal</option>
                <option value="Staff Administrasi">Staff Administrasi</option>
                <option value="Staff Kantor">Staff Kantor</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
