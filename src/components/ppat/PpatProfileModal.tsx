import React, { useState, useEffect } from 'react';
import { X, Save, Building, MapPin, Phone, User } from 'lucide-react';
import { PpatProfileConfig, DEFAULT_PPAT_PROFILE } from '../../types/ppat';
import { PpatService } from '../../services/PpatService';

interface PpatProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PpatProfileConfig;
  onSave: (config: PpatProfileConfig) => void;
}

export const PpatProfileModal: React.FC<PpatProfileModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave
}) => {
  const [formData, setFormData] = useState<PpatProfileConfig>({
    ...DEFAULT_PPAT_PROFILE,
    ...config,
    city: config.city || 'Bandung Barat',
    npwp: config.npwp || '3217015610760002'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      ...DEFAULT_PPAT_PROFILE,
      ...config,
      city: config.city || 'Bandung Barat',
      npwp: config.npwp || '3217015610760002'
    });
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const submissionData = {
        ...formData,
        skNumber: '',
        city: formData.city || 'Bandung Barat',
        npwp: formData.npwp || '3217015610760002',
        workingArea: formData.workingArea || 'KABUPATEN BANDUNG BARAT'
      };
      const updated = await PpatService.savePpatSettings(submissionData);
      onSave(updated);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengaturan PPAT');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Pengaturan Profil PPAT
              </h2>
              <p className="text-xs text-slate-500">
                Data identitas PPAT untuk kepala dan penutup laporan resmi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap PPAT & Gelar
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={formData.ppatName}
                onChange={(e) => setFormData({ ...formData, ppatName: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NPWP PPAT
              </label>
              <input
                type="text"
                placeholder="3217015610760002"
                value={formData.npwp || ''}
                onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Daerah Kerja (Wilayah Jabatan PPAT)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="KABUPATEN BANDUNG BARAT"
                  value={formData.workingArea}
                  onChange={(e) => setFormData({ ...formData, workingArea: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alamat Kantor
            </label>
            <textarea
              rows={2}
              value={formData.officeAddress}
              onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempat Penandatanganan
              </label>
              <input
                type="text"
                placeholder="Bandung Barat"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Telepon Kantor
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instansi Tujuan / Tembusan (Kepada Yth)
            </label>
            <textarea
              rows={4}
              placeholder={"1. Kepala Kantor Pertanahan...\n2. Kepala Kantor Pelayanan Pajak Pratama\n3) Kepala Kantor BPKAD...\n4) Kepala Kantor KPP Pratama..."}
              value={formData.reportRecipients || ''}
              onChange={(e) => setFormData({ ...formData, reportRecipients: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Tulis 1 baris per instansi penerima. Jika dikosongkan, sistem otomatis memakai format baku sesuai wilayah kerja.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
