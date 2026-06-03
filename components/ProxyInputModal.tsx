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
  representationType?: 'KUASA' | 'DIREKTUR_PT_LAIN';

  // WNA fields
  nationalityType?: 'WNI' | 'WNA';
  isForeign?: boolean;
  nationality?: string;
  passportNumber?: string;
  kitasNumber?: string;
  kitasType?: 'NONE' | 'KITAS' | 'KITAP';
  hasKitas?: boolean;
}

interface Props {
  isOpen: boolean;
  shareholderName: string;
  initialData?: Partial<ProxyData>;
  onSave: (data: ProxyData) => void;
  onClose: () => void;
  availableParties?: any[];
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
  representationType: 'KUASA',
  nationalityType: 'WNI',
  isForeign: false,
  nationality: 'WNI',
  passportNumber: '',
  kitasNumber: '',
  kitasType: 'NONE',
  hasKitas: false,
});

const ProxyInputModal: React.FC<Props> = ({
  isOpen,
  shareholderName,
  initialData,
  onSave,
  onClose,
  availableParties,
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

  const isWna = form.nationalityType === 'WNA' || form.isForeign;

  const handleSave = () => {
    if (!form.name.trim()) { alert('Nama penerima kuasa wajib diisi.'); return; }
    if (!isWna && !form.nik.trim()) { alert('NIK penerima kuasa wajib diisi.'); return; }
    if (isWna) {
      if (!form.nationality?.trim()) { alert('Nama Negara asal penerima kuasa wajib diisi.'); return; }
      if (!form.passportNumber?.trim()) { alert('Nomor Passport penerima kuasa wajib diisi.'); return; }
    }
    if (form.representationType !== 'DIREKTUR_PT_LAIN' && !form.proxyDeedDate) { 
      alert('Tanggal Akta/Surat Kuasa wajib diisi.'); 
      return; 
    }
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

          {/* ── SELEKTOR KAPASITAS / REPRESENTASI ── */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Kapasitas/Kewenangan Penerima Kuasa <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                form.representationType !== 'DIREKTUR_PT_LAIN' 
                  ? 'bg-teal-50/50 border-teal-300 text-teal-900' 
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}>
                <input 
                  type="radio" 
                  name="representationType" 
                  value="KUASA"
                  checked={form.representationType !== 'DIREKTUR_PT_LAIN'}
                  onChange={() => update({ representationType: 'KUASA' })}
                  className="text-teal-500 focus:ring-teal-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Penerima Kuasa</span>
                  <span className="text-[10px] text-slate-500 leading-normal">Membawa Surat / Akta Kuasa</span>
                </div>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                form.representationType === 'DIREKTUR_PT_LAIN' 
                  ? 'bg-teal-50/50 border-teal-300 text-teal-900' 
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}>
                <input 
                  type="radio" 
                  name="representationType" 
                  value="DIREKTUR_PT_LAIN"
                  checked={form.representationType === 'DIREKTUR_PT_LAIN'}
                  onChange={() => update({ representationType: 'DIREKTUR_PT_LAIN', proxyDeedDate: '' })}
                  className="text-teal-500 focus:ring-teal-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Direktur PT Lain</span>
                  <span className="text-[10px] text-slate-500 leading-normal">Direktur/Pengurus Badan Hukum</span>
                </div>
              </label>
            </div>
          </div>

          {/* ── TANGGAL AKTA KUASA (hanya jika sebagai Kuasa biasa) ── */}
          {form.representationType !== 'DIREKTUR_PT_LAIN' && (
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
          )}

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-100">
            Identitas Penerima Kuasa
          </div>

          {availableParties && availableParties.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                Ambil Data dari Pihak/Pengurus yang Sudah Ada:
              </label>
              <select
                onChange={e => {
                  const idxStr = e.target.value;
                  if (idxStr !== '') {
                    const party = availableParties[parseInt(idxStr, 10)];
                    update({
                      salutation: party.salutation || 'Tuan',
                      name: party.name || '',
                      nik: party.nik || '',
                      birthCity: party.birthCity || '',
                      birthDate: party.birthDate || '',
                      occupation: party.occupation || '',
                      nationalityType: party.nationalityType || 'WNI',
                      isForeign: party.isForeign || false,
                      nationality: party.nationality || '',
                      passportNumber: party.passportNumber || '',
                      kitasNumber: party.kitasNumber || '',
                      kitasType: party.kitasType || 'NONE',
                      hasKitas: party.hasKitas || false,
                      address: {
                        fullAddress: party.address?.fullAddress || '',
                        rt: party.address?.rt || '',
                        rw: party.address?.rw || '',
                        kelurahan: party.address?.kelurahan || '',
                        kecamatan: party.address?.kecamatan || '',
                        city: party.address?.city || '',
                        province: party.address?.province || '',
                        postalCode: party.address?.postalCode || '',
                      }
                    });
                  }
                }}
                className="w-full px-3 py-1.5 border border-amber-300 rounded outline-none text-xs bg-white focus:border-amber-500 font-medium"
                defaultValue=""
              >
                <option value="">-- Pilih Pihak / Pengurus --</option>
                {availableParties.map((p, idx) => (
                  <option key={idx} value={idx}>
                    {p.name} ({p.occupation || 'Pihak'})
                  </option>
                ))}
              </select>
            </div>
          )}

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

          {/* Checkbox Asing */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isWna}
                onChange={e => {
                  const check = e.target.checked;
                  update({ 
                    isForeign: check,
                    nationalityType: check ? 'WNA' : 'WNI', 
                    nationality: check ? '' : 'WNI',
                    nik: check ? '' : form.nik,
                    passportNumber: check ? form.passportNumber : ''
                  });
                }}
                className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 w-4 h-4"
              />
              <span className="text-xs text-slate-700 font-bold">Penerima Kuasa Asing (WNA)</span>
            </label>
          </div>

          {/* NIK or WNA credentials */}
          {!isWna ? (
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
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Negara <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={form.nationality || ''} 
                  onChange={e => update({ nationality: e.target.value.toUpperCase() })}
                  placeholder="CONTOH: AMERIKA SERIKAT"
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-ring focus:ring-1 focus:border-teal-500 focus:ring-teal-500 text-sm bg-white"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Passport <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={form.passportNumber || ''} 
                  onChange={e => update({ passportNumber: e.target.value.toUpperCase() })}
                  placeholder="Nomor Passport"
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-ring focus:ring-1 focus:border-teal-500 focus:ring-teal-500 text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Izin Tinggal</label>
                  <select 
                    value={form.kitasType || 'NONE'}
                    onChange={e => update({ 
                      kitasType: e.target.value as any, 
                      hasKitas: e.target.value !== 'NONE' 
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="NONE">-- Tidak Ada --</option>
                    <option value="KITAS">KITAS</option>
                    <option value="KITAP">KITAP</option>
                  </select>
                </div>
                {form.kitasType && form.kitasType !== 'NONE' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor {form.kitasType}</label>
                    <input 
                      type="text" 
                      value={form.kitasNumber || ''} 
                      onChange={e => update({ kitasNumber: e.target.value.toUpperCase() })}
                      placeholder={`Nomor ${form.kitasType}`}
                      className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

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