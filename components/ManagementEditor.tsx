
import React from 'react';
import { ManagementItem, ManagementChangeType, Address, Shareholder } from '../types';
import { Trash2, Plus, User, Award, Shield, ArrowRight, Copy, Calendar, RefreshCw, UserMinus, UserPlus, MapPin, CreditCard, Briefcase, ChevronDown, ChevronUp, Fingerprint } from 'lucide-react';
import { IndoRegionSelector } from './AddressFields';

interface Props {
  changeType: ManagementChangeType;
  onChangeType: (type: ManagementChangeType) => void;
  oldManagement: ManagementItem[];
  newManagement: ManagementItem[];
  onChangeOld: (items: ManagementItem[]) => void;
  onChangeNew: (items: ManagementItem[]) => void;
  effectiveUntil: string;
  onEffectiveUntilChange: (val: string) => void;
  shareholders: Shareholder[];
  finalShareholders: Shareholder[];
}

const POSITIONS = [
  'Direktur Utama',
  'Direktur',
  'Komisaris Utama',
  'Komisaris'
];

const INITIAL_ADDRESS: Address = {
  province: '', city: '', fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: ''
};

interface RenderListProps {
  items: ManagementItem[];
  target: 'old' | 'new';
  title: string;
  color: string;
  icon: any;
  onAdd: (target: 'old' | 'new') => void;
  onRemove: (target: 'old' | 'new', id: string) => void;
  onUpdate: (target: 'old' | 'new', id: string, updates: Partial<ManagementItem>) => void;
  onCopy?: () => void;
  showCopy?: boolean;
  oldOptions?: any[];
  onSelectOld?: (item: any) => void;
}

const RenderList: React.FC<RenderListProps> = ({ 
  items, 
  target, 
  title, 
  color, 
  icon: Icon, 
  onAdd, 
  onRemove, 
  onUpdate, 
  onCopy, 
  showCopy,
  oldOptions = [],
  onSelectOld
}) => {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showOldDropdown, setShowOldDropdown] = React.useState(false);

  return (
    <div className={`p-6 bg-white rounded-3xl border ${color} shadow-sm space-y-4`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          {title}
        </h4>
        <div className="flex gap-2">
          {target === 'old' && (
            <button 
              onClick={onCopy}
              className="px-4 py-1.5 bg-amber-100 text-amber-600 rounded-2xl hover:bg-amber-200 flex items-center gap-2 text-xs font-bold transition-all"
              title="Otomatis deteksi pengurus lama yang tidak ada di susunan baru"
            >
              <RefreshCw className="w-3 h-3" /> Deteksi Otomatis
            </button>
          )}
          {showCopy && onCopy && target === 'new' && (
             <button 
              onClick={onCopy}
              className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 flex items-center gap-2 text-xs font-bold transition-all"
             >
               <Copy className="w-3 h-3" /> Salin Semua
             </button>
          )}
          {target === 'new' && (
            <div className="relative">
              <button 
                onClick={() => setShowOldDropdown(!showOldDropdown)}
                className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 flex items-center gap-2 text-xs font-bold transition-all border border-amber-200"
              >
                <UserPlus className="w-3 h-3" /> Ambil dari Semula
                <ChevronDown className={`w-3 h-3 transition-transform ${showOldDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showOldDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-2 animate-in fade-in zoom-in duration-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Data Pengurus/Pihak Tersedia</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {oldOptions.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-400 italic text-center">
                        Tidak ada data pihak yang tersedia.
                      </div>
                    ) : (
                      oldOptions.map((item, idx) => (
                        <button
                          key={item.id || idx}
                          onClick={() => {
                            if (onSelectOld) onSelectOld(item);
                            setShowOldDropdown(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
                        >
                          <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-indigo-100 transition-colors">
                            <User className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                          </div>
                          <div className="truncate">
                            <div className="truncate">{item.name || '(TANPA NAMA)'}</div>
                            <div className="text-[9px] text-slate-400 font-normal uppercase mt-0.5">
                              {item.position || item.managementPosition || 'PIHAK'} 
                              {item.isManagement ? ' (EKSISTING)' : ''}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <button 
            onClick={() => onAdd(target)}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 flex items-center gap-2 text-xs font-bold transition-all"
          >
            <Plus className="w-3 h-3" /> Tambah Pengurus
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 text-xs italic">
            Belum ada data pengurus. Klik "Tambah Pengurus" untuk memulai.
          </div>
        ) : (
          items.map((m) => (
            <div key={m.id} className="bg-white rounded-3xl border border-slate-200 relative group shadow-sm hover:border-indigo-300 transition-all">
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => onRemove(target, m.id)}
                  className="absolute -top-2 -right-2 p-2 bg-white text-red-400 border border-slate-200 rounded-full hover:text-red-600 hover:bg-red-50 transition-all z-10 shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nama Pengurus & Sapaan</label>
                  <div className="flex gap-2">
                    <select 
                      value={m.salutation || 'Tuan'} 
                      onChange={e => onUpdate(target, m.id, { salutation: e.target.value as any })}
                      className="px-2 py-3 border border-slate-300 rounded-2xl text-xs font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Tuan">Tn</option><option value="Nyonya">Ny</option><option value="Nona">Nn</option>
                    </select>
                    <input 
                      type="text" 
                      value={m.name || ''} 
                      onChange={e => onUpdate(target, m.id, { name: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="NAMA LENGKAP PENGURUS"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase">Jabatan Perseroan</label>
                    {target === 'new' && (
                      <button 
                        onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                        className={`text-xs font-bold flex items-center gap-1 transition-all px-2 py-0.5 rounded-full ${expandedId === m.id ? 'bg-indigo-100 text-indigo-700' : 'text-indigo-500 hover:bg-indigo-50'}`}
                      >
                        {expandedId === m.id ? <ChevronUp className="w-3 h-3"/> : <Fingerprint className="w-3 h-3"/>}
                        {expandedId === m.id ? 'Sembunyikan' : 'Detail Identitas'}
                      </button>
                    )}
                  </div>
                  <select 
                    value={m.position || 'Direktur'} 
                    onChange={e => onUpdate(target, m.id, { position: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {target === 'new' && expandedId === m.id && (
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl space-y-6 animate-in slide-in-from-top duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="md:col-span-1 lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Tempat Lahir</label>
                      <input type="text" value={m.birthCity || ''} onChange={e => onUpdate(target, m.id, { birthCity: e.target.value.toUpperCase() })} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="KOTA KELAHIRAN" />
                    </div>
                    <div className="md:col-span-1 lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal Lahir</label>
                      <input type="date" value={m.birthDate || ''} onChange={e => onUpdate(target, m.id, { birthDate: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                    </div>
                    <div className="md:col-span-1 lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> NIK (Nomor KTP)</label>
                      <input type="text" value={m.nik || ''} onChange={e => onUpdate(target, m.id, { nik: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm outline-none font-mono focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="16 DIGIT NIK" />
                    </div>
                    <div className="md:col-span-1 lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Pekerjaan</label>
                      <input type="text" value={m.occupation || ''} onChange={e => onUpdate(target, m.id, { occupation: e.target.value.toUpperCase() })} className="w-full px-4 py-3 border border-slate-300 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="CONTOH: KARYAWAN SWASTA" />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-indigo-50 rounded-2xl">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                      </div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alamat Domisili Lengkap</label>
                    </div>
                    <IndoRegionSelector 
                      address={m.address || INITIAL_ADDRESS} 
                      onUpdate={(addr) => onUpdate(target, m.id, { address: { ...(m.address || INITIAL_ADDRESS), ...addr } })} 
                      accentColor="indigo"
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ManagementEditor: React.FC<Props> = ({ 
  changeType,
  onChangeType,
  oldManagement, 
  newManagement, 
  onChangeOld, 
  onChangeNew,
  effectiveUntil,
  onEffectiveUntilChange,
  shareholders = [],
  finalShareholders = []
}) => {
  const autoDetectDismissed = () => {
    // Current managers from shareholders list
    const currentMng = shareholders.filter(s => s.isManagement);
    
    // Those NOT in new management with SAME NAME AND POSITION
    const dismissed = currentMng.filter(cm => {
      const name = (cm.name || '').toUpperCase();
      const pos = (cm.managementPosition || 'Direktur').toUpperCase();
      
      const inExplicit = newManagement.some(nm => 
        (nm.name || '').toUpperCase() === name && 
        (nm.position || '').toUpperCase() === pos
      );
      
      const inFinal = finalShareholders.some(fs => 
        fs.isManagement && 
        (fs.name || '').toUpperCase() === name && 
        (fs.managementPosition || '').toUpperCase() === pos
      );
      
      return !inExplicit && !inFinal;
    });
    
    const mapped: ManagementItem[] = dismissed.map(dm => ({
      id: crypto.randomUUID(),
      name: dm.name || '',
      position: dm.managementPosition || 'Direktur',
      salutation: dm.salutation,
      birthCity: dm.birthCity,
      birthDate: dm.birthDate,
      nationalityType: dm.nationalityType,
      nationality: dm.nationality,
      occupation: dm.occupation,
      address: dm.address,
      nik: dm.nik
    }));
    
    if (mapped.length > 0) {
      onChangeOld(mapped);
    } else {
      alert("Tidak ditemukan pengurus lama yang berhenti (semua pengurus lama ada di susunan baru).");
    }
  };

  const addMember = (target: 'old' | 'new') => {
    const newItem: ManagementItem = {
      id: crypto.randomUUID(),
      name: '',
      position: 'Direktur',
      salutation: 'Tuan',
      address: { ...INITIAL_ADDRESS },
      nationalityType: 'WNI',
      nationality: 'WNI'
    };
    if (target === 'old') onChangeOld([...oldManagement, newItem]);
    else onChangeNew([...newManagement, newItem]);
  };

  const removeMember = (target: 'old' | 'new', id: string) => {
    if (target === 'old') onChangeOld(oldManagement.filter(m => m.id !== id));
    else onChangeNew(newManagement.filter(m => m.id !== id));
  };

  const handleSelectOldMember = (item: any) => {
    const newItem: ManagementItem = {
      id: crypto.randomUUID(),
      name: item.name || '',
      position: item.position || item.managementPosition || 'Direktur',
      salutation: item.salutation || 'Tuan',
      birthCity: item.birthCity,
      birthDate: item.birthDate,
      nationalityType: item.nationalityType || 'WNI',
      nationality: item.nationality || 'WNI',
      occupation: item.occupation,
      address: item.address ? { ...item.address } : { ...INITIAL_ADDRESS },
      nik: item.nik
    };
    onChangeNew([...newManagement, newItem]);
  };

  const updateMember = (target: 'old' | 'new', id: string, updates: Partial<ManagementItem>) => {
    if (target === 'old') {
      onChangeOld(oldManagement.map(m => m.id === id ? { ...m, ...updates } : m));
    } else {
      onChangeNew(newManagement.map(m => m.id === id ? { ...m, ...updates } : m));
    }
  };

  const copyOldToNew = () => {
    const copied = oldManagement.map(m => ({ ...m, id: crypto.randomUUID() }));
    onChangeNew(copied);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-top duration-300">
      <div className="bg-white p-1.5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-1">
        <button 
          onClick={() => onChangeType('ALL_DISMISSED')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${changeType === 'ALL_DISMISSED' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <UserMinus className="w-4 h-4" /> Berhentikan Seluruhnya
        </button>
        <button 
          onClick={() => onChangeType('PARTIAL_CHANGE')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${changeType === 'PARTIAL_CHANGE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <RefreshCw className="w-4 h-4" /> Perubahan Parsial
        </button>
        <button 
          onClick={() => onChangeType('REAPPOINTMENT')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${changeType === 'REAPPOINTMENT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Shield className="w-4 h-4" /> Angkat Kembali
        </button>
      </div>

      <div className="p-4 bg-amber-50 rounded-3xl border border-amber-100 flex gap-3 items-center">
        <div className="p-2 bg-amber-100 rounded-full">
          <Award className="w-5 h-5 text-amber-600 flex-shrink-0" />
        </div>
        <p className="text-sm text-amber-800 font-medium leading-relaxed">
          {changeType === 'ALL_DISMISSED' && "Mode: Memberhentikan seluruh pengurus lama dan mengangkat pengurus baru."}
          {changeType === 'PARTIAL_CHANGE' && "Mode: Memberhentikan pengurus tertentu (satu/beberapa) dan/atau mengangkat pengurus baru."}
          {changeType === 'REAPPOINTMENT' && "Mode: Mengangkat kembali pengurus yang masa jabatannya berakhir."}
        </p>
      </div>

      <div className="space-y-8 relative">
        {changeType !== 'REAPPOINTMENT' && (
          <RenderList 
            items={oldManagement} 
            target="old" 
            title={changeType === 'ALL_DISMISSED' ? "Pengurus Yang Diberhentikan (Seluruhnya)" : "Pengurus Yang Diberhentikan (Tertentu)"}
            color="border-slate-200" 
            icon={UserMinus}
            onAdd={addMember}
            onRemove={removeMember}
            onUpdate={updateMember}
            onCopy={autoDetectDismissed}
          />
        )}
        
        {changeType !== 'REAPPOINTMENT' && (
          <div className="flex justify-center relative py-4">
             <div className="h-px bg-slate-200 w-full absolute top-1/2 -translate-y-1/2" />
             <div className="h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl ring-8 ring-slate-50 relative z-10 animate-bounce">
                <ArrowRight className="w-6 h-6 rotate-90" />
             </div>
          </div>
        )}
        
        <RenderList 
          items={newManagement} 
          target="new" 
          title={changeType === 'REAPPOINTMENT' ? "Daftar Pengurus Yang Diangkat Kembali" : "Susunan Pengurus Baru (Yang Diangkat)"}
          color="border-indigo-200" 
          icon={changeType === 'REAPPOINTMENT' ? Shield : UserPlus}
          onAdd={addMember}
          onRemove={removeMember}
          onUpdate={updateMember}
          onCopy={copyOldToNew}
          showCopy={changeType !== 'REAPPOINTMENT' && oldManagement.length > 0}
          oldOptions={[
            ...shareholders.filter(s => s.name),
            ...oldManagement.filter(m => m.name && !shareholders.some(s => (s.name || '').toUpperCase() === m.name.toUpperCase()))
          ]}
          onSelectOld={handleSelectOldMember}
        />
      </div>

      <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <label className="block text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" /> Masa Jabatan Pengurus Baru (Masa Berlaku)
        </label>
        <div className="relative">
           <input 
            type="text" 
            value={effectiveUntil || ''} 
            onChange={e => onEffectiveUntilChange(e.target.value)}
            className="w-full px-5 py-3.5 border border-slate-300 rounded-3xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all bg-slate-50/30"
            placeholder="Contoh: Penutupan RUPS Tahunan tahun buku 2028"
          />
        </div>
        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-2xl border border-slate-100">Keterangan ini akan otomatis dicantumkan dalam akta sebagai klausul masa berakhirnya jabatan pengurus.</p>
      </div>
    </div>
  );
};

export default ManagementEditor;
