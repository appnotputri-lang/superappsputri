import React from 'react';
import { X, UserCheck, FileText } from 'lucide-react';
import { IndoRegionSelector } from './AddressFields';

export interface ProxyData {
  salutation: 'Tuan' | 'Nyonya' | 'Nona';
  name: string;
  nik: string;
  birthCity: string;
  birthDate: string;
  occupation: string;
  address: {
    fullAddress: string;
    rt: string;
    rw: string;
    kelurahan: string;
    kecamatan: string;
    city: string;
    province: string;
    postalCode?: string;
  };
  proxyDeedDate: string; // Tanggal Akta/Surat Kuasa
}

interface Props {
  isOpen: boolean;
  shareholderName: string;
  initialData?: Partial<ProxyData>;
  onSave: (data: ProxyData) => void;
  onClose: () => void;
}

const emptyProxy = (): ProxyData => ({
  salutation: 'Tuan',
  name: '',
  nik: '',
  birthCity: '',
  birthDate: '',
  occupation: '',
  address: {
    fullAddress: '',
    rt: '',
    rw: '',
    kelurahan: '',
    kecamatan: '',
    city: '',
    province: '',
  },
  proxyDeedDate: '',
});

const ProxyInputModal: React.FC<Props> = ({
  isOpen,
  shareholderName,
  initialData,
  onSave,
  onClose,
}) => {
  const [form, setForm] = React.useState<ProxyData>(() => ({
    ...emptyProxy(),
    ...(initialData || {}),
    address: { ...emptyProxy().address, ...(initialData?.address || {}) },
  }));

  React.useEffect(() => {
    if (isOpen) {
      setForm({
        ...emptyProxy(),
        ...(initialData || {}),
        address: { ...emptyProxy().address, ...(initialData?.address || {}) },
      });
    }
  }, [isOpen, shareholderName]);

  if (!isOpen) return null;

  const update = (updates: Partial<ProxyData>) =>
    setForm(prev => ({ ...prev, ...updates }));

  const updateAddress = (updates: Partial<ProxyData['address']>) =>
    setForm(prev => ({ ...prev, address: { ...prev.address, ...updates } }));

  const handleSave = () => {
    if (!form.name.trim()) { alert('Nama penerima kuasa wajib diisi.'); return; }
    if (!form.nik.trim()) { alert('NIK penerima kuasa wajib diisi.'); return; }
    if (!form.proxyDeedDate) { alert('Tanggal Akta/Surat Kuasa wajib diisi.'); return; }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <UserCheck className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-widest uppercase text-slate-800">
                Data Penerima Kuasa
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Kuasa dari: <span className="font-bold text-orange-600">{shareholderName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 bg-black/5 rounded-full transition-colors">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-xs text-red-500">Kotak isian yang bertanda * wajib diisi</p>

          {/* ── TANGGAL AKTA KUASA (diletakkan paling atas karena penting) ── */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">
                Akta / Surat Kuasa
              </span>
            </div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tanggal Akta/Surat Kuasa <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.proxyDeedDate}
              onChange={e => update({ proxyDeedDate: e.target.value })}
              className="w-full px-3 py-2 border border-orange-300 rounded outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm bg-white"
            />
            <p className="text-[10px] text-orange-600 mt-1.5">
              Akan tercetak: "berdasarkan Akta Kuasa tertanggal [tanggal ini]"
            </p>
          </div>

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-100">
            Identitas Penerima Kuasa
          </div>

          {/* Nama */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={form.salutation}
                onChange={e => update({ salutation: e.target.value as ProxyData['salutation'] })}
                className="w-24 px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="Tuan">Tuan</option>
                <option value="Nyonya">Nyonya</option>
                <option value="Nona">Nona</option>
              </select>
              <input
                type="text"
                value={form.name}
                onChange={e => update({ name: e.target.value.toUpperCase() })}
                className="flex-1 px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-bold"
                placeholder="Nama lengkap penerima kuasa"
              />
            </div>
          </div>

          {/* NIK */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              NIK <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nik}
              onChange={e => update({ nik: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              placeholder="Nomor Induk Kependudukan"
            />
          </div>

          {/* Tempat & Tanggal Lahir */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tempat Lahir <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.birthCity}
                onChange={e => update({ birthCity: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Lahir <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.birthDate}
                onChange={e => update({ birthDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-slate-50"
              />
            </div>
          </div>

          {/* Pekerjaan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pekerjaan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.occupation}
              onChange={e => update({ occupation: e.target.value.toUpperCase() })}
              placeholder="CONTOH: WIRASWASTA"
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alamat <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.address.fullAddress}
              onChange={e => updateAddress({ fullAddress: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm min-h-[72px]"
              placeholder="Nama jalan, nomor, dll."
            />
          </div>

          {/* RT / RW */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">RT</label>
              <input
                type="text"
                value={form.address.rt}
                onChange={e => updateAddress({ rt: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">RW</label>
              <input
                type="text"
                value={form.address.rw}
                onChange={e => updateAddress({ rw: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          {/* Provinsi, Kab/Kota, Kecamatan, Kelurahan */}
          <IndoRegionSelector
            address={form.address}
            onUpdate={updateAddress}
            hideStreetAndRT={true}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            BATAL
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-bold text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors"
          >
            SIMPAN DATA
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProxyInputModal;