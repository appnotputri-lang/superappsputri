import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  User, 
  Briefcase, 
  MapPin, 
  CreditCard, 
  Globe, 
  Percent, 
  Activity,
  AlertCircle,
  Loader2,
  RefreshCw,
  Send
} from 'lucide-react';
import { Party } from '../../../domain/project/Project';

interface PartiesManagerProps {
  parties: Party[];
  onSaveParties: (updatedParties: Party[]) => Promise<void>;
  onPullFromForm?: () => Promise<Party[]>;
  onPushToForm?: () => Promise<void>;
}

const LIST_JABATAN = [
  'Direktur',
  'Komisaris',
  'Pemegang Saham',
  'Kuasa',
  'Direktur Utama',
  'Komisaris Utama',
  'Lainnya'
];

const LIST_PEKERJAAN = [
  'Pengusaha',
  'Pegawai Swasta',
  'PNS',
  'Profesional',
  'Pedagang',
  'Pengajar',
  'Petani',
  'Lainnya'
];

export const PartiesManager: React.FC<PartiesManagerProps> = ({ parties = [], onSaveParties, onPullFromForm, onPushToForm }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPartyId, setEditingPartyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [nik, setNik] = useState('');
  const [jabatan, setJabatan] = useState('Direktur');
  const [pekerjaan, setPekerjaan] = useState('Pengusaha');
  const [kewarganegaraan, setKewarganegaraan] = useState('WNI');
  const [alamat, setAlamat] = useState('');
  const [sahamPercentage, setSahamPercentage] = useState<number>(0);
  const [status, setStatus] = useState('Aktif');
  const [error, setError] = useState('');

  const openAddForm = () => {
    setName('');
    setNik('');
    setJabatan('Direktur');
    setPekerjaan('Pengusaha');
    setKewarganegaraan('WNI');
    setAlamat('');
    setSahamPercentage(0);
    setStatus('Aktif');
    setError('');
    setEditingPartyId(null);
    setIsFormOpen(true);
  };

  const openEditForm = (party: Party) => {
    setName(party.name || '');
    setNik(party.nik || '');
    setJabatan(party.jabatan || 'Direktur');
    setPekerjaan(party.pekerjaan || 'Pengusaha');
    setKewarganegaraan(party.kewarganegaraan || 'WNI');
    setAlamat(party.alamat || '');
    setSahamPercentage(party.sahamPercentage || 0);
    setStatus(party.status || 'Aktif');
    setError('');
    setEditingPartyId(party.id);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Nama wajib diisi.');
    if (!nik.trim()) return setError('NIK wajib diisi.');
    if (nik.trim().length !== 16 && !isNaN(Number(nik.trim()))) {
      return setError('NIK harus berupa 16 digit angka.');
    }

    setSaving(true);
    setError('');

    try {
      const newParty: Party = {
        id: editingPartyId || crypto.randomUUID(),
        name: name.trim(),
        nik: nik.trim(),
        jabatan,
        pekerjaan,
        kewarganegaraan,
        alamat: alamat.trim() || undefined,
        sahamPercentage: jabatan === 'Pemegang Saham' ? Number(sahamPercentage) : undefined,
        status
      };

      let updatedParties: Party[];
      if (editingPartyId) {
        updatedParties = parties.map(p => p.id === editingPartyId ? newParty : p);
      } else {
        updatedParties = [...parties, newParty];
      }

      await onSaveParties(updatedParties);
      setIsFormOpen(false);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data personil.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (partyId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data personil ini?')) return;
    
    try {
      const updatedParties = parties.filter(p => p.id !== partyId);
      await onSaveParties(updatedParties);
    } catch (err: any) {
      alert('Gagal menghapus personil: ' + err.message);
    }
  };

  const handlePullClick = async () => {
    if (!onPullFromForm) return;
    setPulling(true);
    setError('');
    try {
      const pulled = await onPullFromForm();
      if (pulled.length === 0) {
        alert('Tidak ada data personil, pemegang saham, atau kuasa yang ditemukan di formulir.');
        return;
      }

      const confirmImport = confirm(
        `Ditemukan ${pulled.length} personil dari formulir:\n` +
        pulled.map(p => `- ${p.name} (${p.jabatan})`).join('\n') +
        `\n\nApakah Anda ingin mengimpor dan menggabungkan data ini dengan profil personil saat ini?`
      );

      if (!confirmImport) return;

      // Merge logic: NIK as unique key. If NIK is empty, we can use Name
      const merged = [...parties];
      pulled.forEach(newP => {
        const matchIdx = merged.findIndex(p => {
          if (p.nik && newP.nik) return p.nik === newP.nik;
          return p.name.trim().toLowerCase() === newP.name.trim().toLowerCase();
        });

        if (matchIdx !== -1) {
          // Update existing with new details, keeping existing id
          merged[matchIdx] = {
            ...merged[matchIdx],
            ...newP,
            id: merged[matchIdx].id, // retain original ID
            jabatan: newP.jabatan || merged[matchIdx].jabatan,
            alamat: newP.alamat || merged[matchIdx].alamat,
            sahamPercentage: newP.sahamPercentage !== undefined ? newP.sahamPercentage : merged[matchIdx].sahamPercentage
          };
        } else {
          merged.push(newP);
        }
      });

      await onSaveParties(merged);
      alert(`Berhasil mengimpor dan menggabungkan ${pulled.length} data personil!`);
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil data dari formulir.');
      alert(err.message || 'Gagal mengambil data dari formulir.');
    } finally {
      setPulling(false);
    }
  };

  const handlePushClick = async () => {
    if (!onPushToForm) return;
    setPushing(true);
    setError('');
    try {
      await onPushToForm();
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim data ke formulir.');
      alert(err.message || 'Gagal mengirim data ke formulir.');
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
        <h2 className="text-[14px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span>Profil Personil PT (Pelaporan PMPJ / SRA)</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {onPullFromForm && (
            <button
              type="button"
              onClick={handlePullClick}
              disabled={pulling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs shadow-sm transition-all active:scale-95 border border-slate-200 disabled:opacity-50 cursor-pointer"
            >
              {pulling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                  <span>Mengambil...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ambil dari Kehadiran / Parapihak Formulir</span>
                </>
              )}
            </button>
          )}
          {onPushToForm && (
            <button
              type="button"
              onClick={handlePushClick}
              disabled={pushing || parties.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xs shadow-sm transition-all active:scale-95 border border-emerald-200 disabled:opacity-50 cursor-pointer"
            >
              {pushing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Impor ke Formulir RUPS</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Personil
          </button>
        </div>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {editingPartyId ? 'Edit Data Personil' : 'Tambah Data Personil Baru'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama sesuai KTP"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">NIK (16 Digit)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  maxLength={16}
                  required
                  value={nik}
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nomor Induk Kependudukan"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Jabatan di PT</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={jabatan}
                  onChange={(e) => {
                    setJabatan(e.target.value);
                    if (e.target.value !== 'Pemegang Saham') {
                      setSahamPercentage(0);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                >
                  {LIST_JABATAN.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Pekerjaan</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={pekerjaan}
                  onChange={(e) => setPekerjaan(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                >
                  {LIST_PEKERJAAN.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Kewarganegaraan</label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={kewarganegaraan}
                  onChange={(e) => setKewarganegaraan(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                >
                  <option value="WNI">WNI (Warga Negara Indonesia)</option>
                  <option value="WNA">WNA (Warga Negara Asing)</option>
                </select>
              </div>
            </div>

            {jabatan === 'Pemegang Saham' && (
              <div className="space-y-1 animate-fadeIn">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Persentase Saham (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    required
                    value={sahamPercentage}
                    onChange={(e) => setSahamPercentage(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 35.5"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Status Keaktifan</label>
              <div className="relative">
                <Activity className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Alamat Lengkap (KTP)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Alamat jalan, RT/RW, kelurahan, kecamatan, kota, provinsi"
                  rows={2}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Personil'}</span>
            </button>
          </div>
        </form>
      )}

      {parties.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">Belum ada profil personil yang ditambahkan.</p>
          <p className="text-[10px] text-slate-400 mt-1">Tambahkan data Direktur, Komisaris, Pemegang Saham, dsb. untuk analisis SRA/PMPJ.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-150 rounded-xl bg-slate-50/20">
          <table className="min-w-[600px] w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">NIK</th>
                <th className="px-4 py-3">Jabatan</th>
                <th className="px-4 py-3">Pekerjaan</th>
                <th className="px-4 py-3">Kewarganegaraan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {parties.map((p) => (
                <tr key={p.id} className="hover:bg-slate-55/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    <div>{p.name}</div>
                    {p.alamat && (
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1" title={p.alamat}>
                        {p.alamat}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{p.nik}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.jabatan.includes('Direktur') ? 'bg-blue-50 text-blue-700 border border-blue-200/50' :
                      p.jabatan.includes('Komisaris') ? 'bg-purple-50 text-purple-700 border border-purple-200/50' :
                      p.jabatan === 'Pemegang Saham' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' :
                      'bg-amber-50 text-amber-700 border border-amber-200/50'
                    }`}>
                      {p.jabatan}
                      {p.jabatan === 'Pemegang Saham' && p.sahamPercentage !== undefined && (
                        <span className="font-mono">({p.sahamPercentage}%)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-650 font-medium">{p.pekerjaan}</td>
                  <td className="px-4 py-3 text-slate-500 font-medium">{p.kewarganegaraan}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      p.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-650'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditForm(p)}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Edit Data"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Hapus Data"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
