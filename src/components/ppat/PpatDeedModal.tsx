import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar, FileText, User, MapPin, DollarSign, Building } from 'lucide-react';
import { PpatDeed, LEGAL_ACT_TYPES } from '../../types/ppat';

interface PpatDeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (deed: Partial<PpatDeed>) => Promise<void>;
  initialData?: PpatDeed | null;
  defaultDate?: string;
}

export const PpatDeedModal: React.FC<PpatDeedModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate
}) => {
  const [formData, setFormData] = useState<Partial<PpatDeed>>({
    legalActType: 'Jual Beli',
    date: defaultDate || new Date().toISOString().split('T')[0],
    orderNumber: '',
    deedNumber: '',
    grantorName: '',
    grantorAddress: '',
    grantorNpwp: '',
    transfereeName: '',
    transfereeAddress: '',
    transfereeNpwp: '',
    rightTypeAndNumber: '',
    landLocation: '',
    landArea: 0,
    buildingArea: 0,
    transactionValue: 0,
    spptPbbNopYear: '',
    spptPbbNjop: 0,
    sspDate: '',
    sspAmount: 0,
    ssbDate: '',
    ssbAmount: 0,
    notes: 'Lengkap'
  });

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'parties' | 'property' | 'tax'>('general');

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        legalActType: 'Jual Beli',
        date: defaultDate || new Date().toISOString().split('T')[0],
        orderNumber: '',
        deedNumber: '',
        grantorName: '',
        grantorAddress: '',
        grantorNpwp: '',
        transfereeName: '',
        transfereeAddress: '',
        transfereeNpwp: '',
        rightTypeAndNumber: '',
        landLocation: '',
        landArea: 0,
        buildingArea: 0,
        transactionValue: 0,
        spptPbbNopYear: '',
        spptPbbNjop: 0,
        sspDate: '',
        sspAmount: 0,
        ssbDate: '',
        ssbAmount: 0,
        notes: 'Lengkap'
      });
    }
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deedNumber || !formData.date) {
      alert('Nomor Akta dan Tanggal wajib diisi.');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan data akta');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {initialData ? 'Edit Data Akta PPAT' : 'Tambah Akta PPAT Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                Formulir pendaftaran pembuatan akta PPAT untuk Buku Laporan Bulanan
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/40 gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'general'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" /> Informasi Akta
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parties')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'parties'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" /> Para Pihak
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('property')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'property'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" /> Objek Tanah & Nilai
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'tax'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Pajak (PBB, SSP, SSB)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Urut Buku Register
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 01 atau 1395"
                  value={formData.orderNumber || ''}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Akta PPAT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 01/2026 atau 12/PPAT/2026"
                  value={formData.deedNumber || ''}
                  onChange={(e) => setFormData({ ...formData, deedNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Akta <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bentuk Perbuatan Hukum <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.legalActType || 'Jual Beli'}
                  onChange={(e) => setFormData({ ...formData, legalActType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  {LEGAL_ACT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Tambahan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Berkas Lengkap / Dalam Proses Validasi BPN"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'parties' && (
            <div className="space-y-6">
              {/* Pihak Pengalih */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-700" /> Pihak yang Mengalihkan / Memberikan (Penjual / Pemberi Hak)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      placeholder="Nama Pihak Pertama"
                      value={formData.grantorName || ''}
                      onChange={(e) => setFormData({ ...formData, grantorName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">NPWP</label>
                    <input
                      type="text"
                      placeholder="Contoh: 01.234.567.8-123.000"
                      value={formData.grantorNpwp || ''}
                      onChange={(e) => setFormData({ ...formData, grantorNpwp: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                    <input
                      type="text"
                      placeholder="Alamat sesuai KTP/Identitas"
                      value={formData.grantorAddress || ''}
                      onChange={(e) => setFormData({ ...formData, grantorAddress: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Pihak Penerima */}
              <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-200 space-y-3">
                <h3 className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-700" /> Pihak yang Menerima (Pembeli / Penerima Hak)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      placeholder="Nama Pihak Kedua"
                      value={formData.transfereeName || ''}
                      onChange={(e) => setFormData({ ...formData, transfereeName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">NPWP</label>
                    <input
                      type="text"
                      placeholder="Contoh: 09.876.543.2-123.000"
                      value={formData.transfereeNpwp || ''}
                      onChange={(e) => setFormData({ ...formData, transfereeNpwp: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                    <input
                      type="text"
                      placeholder="Alamat sesuai KTP/Identitas"
                      value={formData.transfereeAddress || ''}
                      onChange={(e) => setFormData({ ...formData, transfereeAddress: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'property' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis & Nomor Hak Atas Tanah
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SHM No. 1234/Condongcatur"
                  value={formData.rightTypeAndNumber || ''}
                  onChange={(e) => setFormData({ ...formData, rightTypeAndNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Letak Tanah & Bangunan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jl. Ringroad Utara, Depok, Sleman"
                  value={formData.landLocation || ''}
                  onChange={(e) => setFormData({ ...formData, landLocation: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Luas Tanah (M²)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formData.landArea || ''}
                  onChange={(e) => setFormData({ ...formData, landArea: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Luas Bangunan (M²)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formData.buildingArea || ''}
                  onChange={(e) => setFormData({ ...formData, buildingArea: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Harga Transaksi / Nilai Perolehan (Rp)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={formData.transactionValue || ''}
                  onChange={(e) => setFormData({ ...formData, transactionValue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-4">
              {/* SPPT PBB */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-600" /> SPPT PBB
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">NOP & Tahun Pajak</label>
                    <input
                      type="text"
                      placeholder="Contoh: 34.04.010.001.002-0001.0 / 2026"
                      value={formData.spptPbbNopYear || ''}
                      onChange={(e) => setFormData({ ...formData, spptPbbNopYear: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">NJOP Total (Rp)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formData.spptPbbNjop || ''}
                      onChange={(e) => setFormData({ ...formData, spptPbbNjop: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SSP (PPh) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> SSP (Surat Setoran Pajak / PPh Final)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Validasi / Bayar SSP</label>
                    <input
                      type="date"
                      value={formData.sspDate || ''}
                      onChange={(e) => setFormData({ ...formData, sspDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah PPh Disetor (Rp)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formData.sspAmount || ''}
                      onChange={(e) => setFormData({ ...formData, sspAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SSB (BPHTB) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" /> SSB (Surat Setoran Bea / BPHTB)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Validasi / Bayar BPHTB</label>
                    <input
                      type="date"
                      value={formData.ssbDate || ''}
                      onChange={(e) => setFormData({ ...formData, ssbDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah BPHTB Disetor (Rp)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0"
                      value={formData.ssbAmount || ''}
                      onChange={(e) => setFormData({ ...formData, ssbAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Menyimpan...' : 'Simpan Data Akta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
