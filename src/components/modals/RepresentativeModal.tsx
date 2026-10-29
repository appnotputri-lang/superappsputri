import React from 'react';
import { X, UserCheck, FileText, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { IndoRegionSelector } from '../../../components/AddressFields';
import { Shareholder, CompanyProfile } from '../../../types';
import { CompanyService } from '../../services/CompanyService';
import { CorporateShareholderService, CorporateStakeholderParty } from '../../services/CorporateShareholderService';

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
  onSave: (data: ProxyData, linkedProfile?: CompanyProfile | null) => void;
  onClose: () => void;
  availableParties?: any[];
  shareholder?: Shareholder;
  profiles?: CompanyProfile[];
  excludeCompanyIdOrName?: string;
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
  shareholder,
  profiles = [],
  excludeCompanyIdOrName,
}) => {
  const isCorporate = CorporateShareholderService.checkIsCorporateShareholder(shareholder);

  const [form, setForm] = React.useState<ProxyData>(() => ({
    ...emptyProxy(),
    representationType: isCorporate ? 'DIREKTUR_PT_LAIN' : (initialData?.representationType || 'KUASA'),
    ...(initialData || {}),
    address: { ...emptyProxy().address, ...(initialData?.address || {}) },
  }));

  const [activeProfileId, setActiveProfileId] = React.useState<string>('');
  const [showManualCompanySearch, setShowManualCompanySearch] = React.useState<boolean>(false);
  const [fullParentProfile, setFullParentProfile] = React.useState<CompanyProfile | null>(null);
  const [selectedPartyMissingNote, setSelectedPartyMissingNote] = React.useState<string>('');

  // Available profiles strictly excluding the meeting company
  const availableCorporateProfiles = React.useMemo(() => {
    return CorporateShareholderService.filterAvailableCorporateProfiles(
      profiles,
      excludeCompanyIdOrName
    );
  }, [profiles, excludeCompanyIdOrName]);

  // Auto-find matching corporate profile for this shareholder
  const autoParentProfile = React.useMemo(() => {
    return CorporateShareholderService.findMatchingCorporateProfile(
      shareholder,
      profiles,
      excludeCompanyIdOrName
    );
  }, [shareholder, profiles, excludeCompanyIdOrName]);

  React.useEffect(() => {
    if (autoParentProfile) {
      setActiveProfileId(autoParentProfile.id);
    } else {
      setActiveProfileId('');
    }
  }, [autoParentProfile]);

  React.useEffect(() => {
    let isMounted = true;
    if (activeProfileId) {
      CompanyService.getCompanyProfile(activeProfileId).then(p => {
        if (isMounted) setFullParentProfile(p);
      }).catch(err => {
        console.error("Error fetching parent company profile:", err);
      });
    } else {
      setFullParentProfile(null);
    }
    return () => {
      isMounted = false;
    };
  }, [activeProfileId]);

  const parentProfile = fullParentProfile || (activeProfileId ? profiles.find(p => p.id === activeProfileId) || null : autoParentProfile);

  // Extract stakeholders (Direksi, Komisaris, Pemegang Saham) from parent profile
  const parentStakeholders = React.useMemo<CorporateStakeholderParty[]>(() => {
    if (!parentProfile) return [];
    return CorporateShareholderService.extractCorporateStakeholders(parentProfile);
  }, [parentProfile]);

  const direksiList = React.useMemo(() => parentStakeholders.filter(p => p.roleCategory === 'DIREKSI'), [parentStakeholders]);
  const komisarisList = React.useMemo(() => parentStakeholders.filter(p => p.roleCategory === 'KOMISARIS'), [parentStakeholders]);
  const pemegangSahamList = React.useMemo(() => parentStakeholders.filter(p => p.roleCategory === 'PEMEGANG_SAHAM'), [parentStakeholders]);

  React.useEffect(() => {
    if (isOpen) {
      setForm({
        ...emptyProxy(),
        representationType: isCorporate ? (initialData?.representationType || 'DIREKTUR_PT_LAIN') : (initialData?.representationType || 'KUASA'),
        ...(initialData || {}),
        address: { ...emptyProxy().address, ...(initialData?.address || {}) },
      });
      setSelectedPartyMissingNote('');
    }
  }, [isOpen, shareholderName, isCorporate]);

  if (!isOpen) return null;

  const update = (updates: Partial<ProxyData>) =>
    setForm(prev => ({ ...prev, ...updates }));

  const updateAddress = (updates: Partial<ProxyData['address']>) =>
    setForm(prev => ({ ...prev, address: { ...prev.address, ...updates } }));

  const isWna = form.nationalityType === 'WNA' || form.isForeign;

  const handleApplyStakeholder = (party: CorporateStakeholderParty) => {
    if (party.missingFields.length > 0) {
      setSelectedPartyMissingNote(`Catatan: Data ${party.name} di Master Klien belum memiliki: ${party.missingFields.join(', ')}. Silakan lengkapi formulir di bawah ini.`);
    } else {
      setSelectedPartyMissingNote('');
    }

    update({
      salutation: party.salutation || 'Tuan',
      name: (party.name || '').toUpperCase().trim(),
      nik: party.nik || '',
      birthCity: party.birthCity || '',
      birthDate: party.birthDate || '',
      occupation: party.position || party.occupation || (party.roleCategory === 'PEMEGANG_SAHAM' ? 'WIRASWASTA' : 'Direktur'),
      nationalityType: party.nationalityType || 'WNI',
      isForeign: party.nationalityType === 'WNA',
      nationality: party.nationality || (party.nationalityType === 'WNA' ? 'WNA' : 'Indonesia'),
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
  };

  const handleSave = () => {
    if (!form.name.trim()) { alert('Nama pihak yang mewakili wajib diisi.'); return; }
    if (!isWna && !form.nik.trim()) { alert('NIK pihak yang mewakili wajib diisi.'); return; }
    if (isWna) {
      if (!form.nationality?.trim()) { alert('Nama Negara asal pihak yang mewakili wajib diisi.'); return; }
      if (!form.passportNumber?.trim()) { alert('Nomor Passport pihak yang mewakili wajib diisi.'); return; }
    }
    if (form.representationType !== 'DIREKTUR_PT_LAIN' && !form.proxyDeedDate) { 
      alert('Tanggal Akta/Surat Kuasa wajib diisi.'); 
      return; 
    }
    onSave(form, parentProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isCorporate ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-600'}`}>
              {isCorporate ? <Building2 className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-widest uppercase text-slate-800">
                {isCorporate ? 'Pihak yang Mewakili PT Pemegang Saham' : 'Data Penerima Kuasa'}
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isCorporate ? 'Badan Hukum PT: ' : 'Kuasa dari: '}
                <span className="font-bold text-blue-700 uppercase">{shareholderName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 bg-black/5 rounded-full transition-colors cursor-pointer">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-xs text-red-500">Kotak isian yang bertanda * wajib diisi</p>

          {/* ── SELEKTOR KAPASITAS / REPRESENTASI ── */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
              Kapasitas/Kewenangan yang Menghadap <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                form.representationType === 'DIREKTUR_PT_LAIN' 
                  ? 'bg-blue-50/80 border-blue-400 text-blue-950 font-bold shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}>
                <input 
                  type="radio" 
                  name="representationType" 
                  value="DIREKTUR_PT_LAIN"
                  checked={form.representationType === 'DIREKTUR_PT_LAIN'}
                  onChange={() => update({ representationType: 'DIREKTUR_PT_LAIN', proxyDeedDate: '' })}
                  className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Direktur / Pengurus PT</span>
                  <span className="text-[10px] text-slate-500 leading-normal">Berdasarkan AD/ART (Tanpa Akta Kuasa)</span>
                </div>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                form.representationType !== 'DIREKTUR_PT_LAIN' 
                  ? 'bg-teal-50/80 border-teal-400 text-teal-950 font-bold shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
              }`}>
                <input 
                  type="radio" 
                  name="representationType" 
                  value="KUASA"
                  checked={form.representationType !== 'DIREKTUR_PT_LAIN'}
                  onChange={() => update({ representationType: 'KUASA' })}
                  className="text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Kuasa Direksi / Penerima Kuasa</span>
                  <span className="text-[10px] text-slate-500 leading-normal">Membawa Surat / Akta Kuasa Khusus</span>
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
                value={form.proxyDeedDate || ''}
                onChange={e => update({ proxyDeedDate: e.target.value })}
                className="w-full px-3 py-2 border border-orange-300 rounded outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm bg-white"
              />
              <p className="text-[10px] text-orange-600 mt-1.5">
                Akan tercetak: "berdasarkan Surat Kuasa tertanggal [tanggal ini]"
              </p>
            </div>
          )}

          {/* ── SELEKTOR DARI PROFIL PT PEMEGANG SAHAM (DATA KLIEN) ── */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 space-y-3">
            {parentProfile && (
              <div className="bg-blue-100/70 p-3 rounded-lg border border-blue-200 space-y-1.5 text-xs text-blue-900">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold uppercase flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-700" /> PT Terhubung: {parentProfile.companyName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowManualCompanySearch(prev => !prev)}
                    className="text-[11px] text-blue-600 underline hover:text-blue-800 font-bold cursor-pointer"
                  >
                    {showManualCompanySearch ? 'Batal' : 'Ganti Profil PT'}
                  </button>
                </div>
                <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-1 pt-1 border-t border-blue-200/60">
                  <span>Kedudukan: <b>{parentProfile.domicile || parentProfile.oldDomicile || 'Belum diisi'}</b></span>
                  <span>Akta Pendirian: <b>{parentProfile.establishmentDeedNumber ? `No. ${parentProfile.establishmentDeedNumber}` : 'Belum diisi'}</b></span>
                  <span className="col-span-2 truncate">SK Kemenkumham: <b>{parentProfile.establishmentSkNumber || 'Belum diisi'}</b></span>
                </div>
              </div>
            )}

            {/* Tampilkan pencarian manual PT jika diinginkan, atau jika autoParentProfile tidak ditemukan */}
            {(!parentProfile || showManualCompanySearch) && (
              <div>
                <label className="block text-[11px] font-bold text-blue-900 mb-1">
                  Hubungkan ke Profil PT Pemegang Saham (dari Master Data Klien):
                </label>
                <select
                  value={activeProfileId}
                  onChange={e => {
                    setActiveProfileId(e.target.value);
                    setShowManualCompanySearch(false);
                  }}
                  className="w-full px-3 py-2 border border-blue-300 rounded outline-none text-xs bg-white focus:border-blue-500 font-bold text-blue-900"
                >
                  <option value="">-- Cari & Pilih Profil PT dari Database --</option>
                  {availableCorporateProfiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.companyName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* List Stakeholders dari Master Klien */}
            {parentProfile ? (
              parentStakeholders.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Ambil Data Pihak dari PT {parentProfile.companyName}:
                  </label>
                  <select
                    onChange={e => {
                      const val = e.target.value;
                      if (val && val !== 'MANUAL') {
                        const party = parentStakeholders.find(p => p.id === val);
                        if (party) {
                          handleApplyStakeholder(party);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg outline-none text-xs bg-white focus:border-blue-700 font-bold text-blue-950 focus:ring-2 focus:ring-blue-100"
                    defaultValue=""
                  >
                    <option value="">-- Pilih Pihak yang Mewakili (Direksi, Komisaris, Pemegang Saham) --</option>
                    {direksiList.length > 0 && (
                      <optgroup label="Dewan Direksi (Direksi)">
                        {direksiList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.position} {p.isComplete ? '✓ (Lengkap)' : '⚠️ (Perlu Lengkapi Data)'}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {komisarisList.length > 0 && (
                      <optgroup label="Dewan Komisaris">
                        {komisarisList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.position} {p.isComplete ? '✓ (Lengkap)' : '⚠️ (Perlu Lengkapi Data)'}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {pemegangSahamList.length > 0 && (
                      <optgroup label="Pemegang Saham PT (Perorangan)">
                        {pemegangSahamList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — Pemegang Saham {p.isComplete ? '✓ (Lengkap)' : '⚠️ (Perlu Lengkapi Data)'}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="MANUAL">-- Kuasa Direksi / Pihak Lainnya (Input Manual) --</option>
                  </select>

                  {selectedPartyMissingNote && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px] flex items-start gap-1.5 font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{selectedPartyMissingNote}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-medium space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Pemberitahuan Data Belum Lengkap
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Data Direksi, Dewan Komisaris, dan Pemegang Saham untuk <b>PT {parentProfile.companyName}</b> belum tersedia di Master Data Klien. Silakan isi data pihak yang mewakili secara manual pada formulir di bawah ini, atau lengkapi data pada menu <b>Profil Perusahaan / Master Klien</b>.
                  </p>
                </div>
              )
            ) : null}
          </div>

          {/* Atau ambil dari pihak rapat lainnya jika kuasa biasa */}
          {form.representationType !== 'DIREKTUR_PT_LAIN' && availableParties && availableParties.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
                Atau Ambil dari Pihak/Peserta Rapat Lainnya:
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
                className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none text-xs bg-white focus:border-slate-500 font-medium"
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

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-100">
            Formulir Lengkap Identitas yang Menghadap
          </div>

          {/* Form Nama & Jabatan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jabatan / Kedudukan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.occupation || ''}
                onChange={e => update({ occupation: e.target.value.toUpperCase() })}
                placeholder="CONTOH: DIREKTUR UTAMA / KUASA DIREKSI"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={form.salutation}
                  onChange={e => update({ salutation: e.target.value as any })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Tuan">Tuan</option>
                  <option value="Nyonya">Nyonya</option>
                  <option value="Nona">Nona</option>
                </select>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update({ name: e.target.value.toUpperCase() })}
                  placeholder="NAMA LENGKAP"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-bold uppercase"
                />
              </div>
            </div>
          </div>

          {/* Kewarganegaraan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kewarganegaraan</label>
              <select
                value={form.nationalityType || 'WNI'}
                onChange={e => {
                  const val = e.target.value as 'WNI' | 'WNA';
                  update({
                    nationalityType: val,
                    isForeign: val === 'WNA',
                    nationality: val === 'WNI' ? 'Indonesia' : ''
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="WNI">WNI (Indonesia)</option>
                <option value="WNA">WNA (Asing)</option>
              </select>
            </div>
            {!isWna ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIK <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nik}
                  onChange={e => update({ nik: e.target.value.replace(/\D/g, '') })}
                  placeholder="16 DIGIT NIK"
                  maxLength={16}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Paspor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.passportNumber || ''}
                  onChange={e => update({ passportNumber: e.target.value.toUpperCase() })}
                  placeholder="NOMOR PASPOR"
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm uppercase"
                />
              </div>
            )}
          </div>

          {/* Tempat & Tanggal Lahir */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tempat Lahir</label>
              <input
                type="text"
                value={form.birthCity}
                onChange={e => update({ birthCity: e.target.value.toUpperCase() })}
                placeholder="KOTA LAHIR"
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={e => update({ birthDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-slate-50"
              />
            </div>
          </div>

          {/* Alamat */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lengkap</label>
              <textarea
                value={form.address.fullAddress}
                onChange={e => updateAddress({ fullAddress: e.target.value.toUpperCase() })}
                placeholder="NAMA JALAN / GEDUNG / NOMOR"
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm min-h-[60px] uppercase"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">RT</label>
                <input
                  type="text"
                  value={form.address.rt}
                  onChange={e => updateAddress({ rt: e.target.value })}
                  placeholder="000"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">RW</label>
                <input
                  type="text"
                  value={form.address.rw}
                  onChange={e => updateAddress({ rw: e.target.value })}
                  placeholder="000"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded outline-none text-xs"
                />
              </div>
            </div>

            <IndoRegionSelector
              address={form.address}
              onUpdate={updateAddress}
              hideStreetAndRT={true}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-white transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Simpan Data Wakil
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProxyInputModal;
