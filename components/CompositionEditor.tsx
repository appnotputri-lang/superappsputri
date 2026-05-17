import React from 'react';
import { Shareholder } from '../types';
import { Trash2, Plus, Info, CheckCircle2, UserPlus, Users, MapPin, CreditCard, Briefcase, Calendar, Globe, ShieldCheck } from 'lucide-react';
import { formatCurrency, numberToWords, formatInputNumber, parseFormattedNumber, toTitleCase } from '../utils/formatters';
import { IndoRegionSelector } from './AddressFields';

interface Props {
  parties: Shareholder[];
  finalShareholders: Shareholder[];
  onChange: (shareholders: Shareholder[]) => void;
  globalSharePrice: number;
  totalSharesAllowed: number;
}

const CompositionEditor: React.FC<Props> = ({ parties, finalShareholders, onChange, globalSharePrice, totalSharesAllowed }) => {
  const currentAllocated = finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0);
  const remainingTotal = totalSharesAllowed - currentAllocated;
  const isBalanced = currentAllocated === totalSharesAllowed && totalSharesAllowed > 0;

  const addEmptyEntry = (isExisting: boolean) => {
    const newSh: Shareholder = {
      id: crypto.randomUUID(),
      salutation: 'Tuan',
      name: '',
      birthCity: '',
      birthDate: '',
      nationality: 'WNI',
      nationalityType: 'WNI',
      occupation: '',
      address: {
        province: '', city: '', fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: ''
      },
      nik: '',
      sharesOwned: 0,
      isExistingParty: isExisting,
      kitasType: 'NONE'
    };
    onChange([...finalShareholders, newSh]);
  };

  const removeEntry = (id: string) => {
    onChange(finalShareholders.filter(s => s.id !== id));
  };

  const updateEntry = (id: string, updates: Partial<Shareholder>) => {
    onChange(finalShareholders.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleLinkParty = (entryId: string, partyId: string) => {
    const party = parties.find(p => p.id === partyId);
    if (party) {
      updateEntry(entryId, {
        linkedPartyId: party.id,
        name: party.name,
        salutation: party.salutation,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ALLOCATION STATUS */}
      <div className={`p-4 rounded-3xl border transition-all ${isBalanced ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-rose-50 border-rose-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            Target Struktur Akhir
          </h4>
          <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/80 border border-current shadow-sm">
            Limit: {totalSharesAllowed.toLocaleString('id-ID')} Lembar
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
           <div className="p-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Sudah Input</p>
              <p className="text-sm font-black text-slate-700">{currentAllocated.toLocaleString('id-ID')}</p>
           </div>
           <div className="p-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase">Sisa Kuota</p>
              <p className={`text-sm font-black ${remainingTotal === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{remainingTotal.toLocaleString('id-ID')}</p>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        {finalShareholders.map((sh, idx) => {
          const isWna = sh.nationalityType === 'WNA';
          return (
            <div key={sh.id} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm relative group hover:border-indigo-300 transition-all">
              <button 
                onClick={() => removeEntry(sh.id)} 
                className="absolute -top-2 -right-2 p-1.5 bg-white text-red-400 border border-slate-200 rounded-full shadow-md hover:bg-red-50 hover:text-red-600 transition-all z-10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
                <button 
                  onClick={() => updateEntry(sh.id, { isExistingParty: true, linkedPartyId: '', name: '' })}
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${sh.isExistingParty ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Users className="w-3.5 h-3.5" /> Pihak Di Notulen
                </button>
                <button 
                  onClick={() => updateEntry(sh.id, { isExistingParty: false, linkedPartyId: '', name: '' })}
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${!sh.isExistingParty ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <UserPlus className="w-3.5 h-3.5" /> Pemegang Baru
                </button>
              </div>

              {sh.isExistingParty ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Pilih Pihak</label>
                      <select 
                        value={sh.linkedPartyId || ''} 
                        onChange={e => handleLinkParty(sh.id, e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">-- Pilih Nama Pihak --</option>
                        {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-indigo-600 uppercase mb-1">Jumlah Saham Akhir</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={formatInputNumber(sh.sharesOwned)} 
                          onChange={e => updateEntry(sh.id, { sharesOwned: parseFormattedNumber(e.target.value) })}
                          className="w-full px-4 py-3 border border-indigo-200 rounded-xl text-sm font-bold pr-14 bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500 outline-none" 
                          placeholder="0" 
                        />
                        <span className="absolute right-3 top-2 text-xs text-indigo-400 font-bold uppercase">Lembar</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nama Lengkap & Sapaan</label>
                      <div className="flex gap-2">
                        <select 
                          value={sh.salutation} 
                          onChange={e => updateEntry(sh.id, { salutation: e.target.value as any })}
                          className="px-2 py-3 border border-slate-300 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-rose-500"
                        >
                          <option value="Tuan">Tn</option>
                          <option value="Nyonya">Ny</option>
                          <option value="Nona">Nn</option>
                        </select>
                        <input 
                          type="text" 
                          value={sh.name} 
                          onChange={e => updateEntry(sh.id, { name: e.target.value.toUpperCase() })}
                          className="flex-1 px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500" 
                          placeholder="NAMA LENGKAP"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Kewarganegaraan</label>
                      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                        <button 
                          onClick={() => updateEntry(sh.id, { nationalityType: 'WNI', nationality: 'WNI' })}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${!isWna ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >WNI</button>
                        <button 
                          onClick={() => updateEntry(sh.id, { nationalityType: 'WNA', nationality: '' })}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${isWna ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                        >WNA</button>
                      </div>
                    </div>

                    {isWna ? (
                      <>
                        <div className="animate-in fade-in duration-200">
                          <label className="block text-xs font-bold text-rose-600 uppercase mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Nama Negara</label>
                          <input 
                            type="text" 
                            value={sh.nationality} 
                            onChange={e => updateEntry(sh.id, { nationality: e.target.value })}
                            className="w-full px-4 py-3 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-medium" 
                            placeholder="Contoh: Amerika"
                          />
                        </div>
                        <div className="animate-in fade-in duration-200">
                          <label className="block text-xs font-bold text-rose-600 uppercase mb-1 flex items-center gap-1">Nomor Passport</label>
                          <input 
                            type="text" 
                            value={sh.passportNumber || ''} 
                            onChange={e => updateEntry(sh.id, { passportNumber: e.target.value })}
                            className="w-full px-4 py-3 border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-medium" 
                            placeholder="ABC123456"
                          />
                        </div>
                        <div className="md:col-span-2 p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-rose-700 uppercase mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Tipe Izin Tinggal</label>
                            <select 
                              value={sh.kitasType || 'NONE'}
                              onChange={e => updateEntry(sh.id, { 
                                kitasType: e.target.value as any, 
                                hasKitas: e.target.value !== 'NONE' 
                              })}
                              className="w-full px-4 py-3 border border-rose-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                            >
                              <option value="NONE">-- Pilih Izin Tinggal (Opsional) --</option>
                              <option value="KITAS">KITAS</option>
                              <option value="KITAP">KITAP</option>
                            </select>
                          </div>
                          {sh.kitasType && sh.kitasType !== 'NONE' && (
                            <div className="animate-in zoom-in duration-200">
                               <label className="block text-xs font-bold text-rose-400 uppercase mb-1">Nomor {sh.kitasType}</label>
                               <input 
                                type="text" 
                                value={sh.kitasNumber || ''} 
                                onChange={e => updateEntry(sh.id, { kitasNumber: e.target.value })}
                                className="w-full px-4 py-1.5 border border-rose-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-400 outline-none"
                                placeholder={`Masukkan nomor ${sh.kitasType}...`}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="md:col-span-2 animate-in fade-in duration-200">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> NIK (KTP)</label>
                          <input type="text" value={sh.nik} onChange={e => updateEntry(sh.id, { nik: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500" placeholder="327..." />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Pekerjaan</label>
                          <input type="text" value={sh.occupation} onChange={e => updateEntry(sh.id, { occupation: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500" placeholder="Pekerjaan..." />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tempat Lahir</label>
                      <input type="text" value={sh.birthCity} onChange={e => updateEntry(sh.id, { birthCity: e.target.value.toUpperCase() })} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500" placeholder="KOTA LAHIR" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal Lahir</label>
                      <input type="date" value={sh.birthDate} onChange={e => updateEntry(sh.id, { birthDate: e.target.value })} className="w-full px-4 py-3 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500" />
                    </div>
                    
                    <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-3 border-b border-slate-200 pb-2">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alamat Domisili</label>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Alamat Lengkap</label>
                          <input 
                            type="text" 
                            value={sh.address.fullAddress} 
                            onChange={e => updateEntry(sh.id, { address: { ...sh.address, fullAddress: e.target.value } })}
                            placeholder="Contoh: Street Name, House No, Block"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                          />
                        </div>
                        {!isWna && (
                          <IndoRegionSelector 
                            address={sh.address} 
                            onUpdate={(updates) => updateEntry(sh.id, { address: { ...sh.address, ...updates } })} 
                            accentColor="blue" 
                          />
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-rose-600 uppercase mb-1">Jumlah Saham Akhir</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={formatInputNumber(sh.sharesOwned)} 
                          onChange={e => updateEntry(sh.id, { sharesOwned: parseFormattedNumber(e.target.value) })}
                          className="w-full px-4 py-3 border border-rose-200 rounded-xl text-sm font-bold pr-14 bg-rose-50/30 focus:ring-2 focus:ring-rose-500 outline-none" 
                          placeholder="0" 
                        />
                        <span className="absolute right-3 top-2 text-xs text-rose-400 font-bold uppercase">Lembar</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => addEmptyEntry(true)} className="py-4 border-2 border-dashed border-indigo-200 text-indigo-500 rounded-3xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-400 transition-all active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Tambah Pihak
        </button>
        <button onClick={() => addEmptyEntry(false)} className="py-4 border-2 border-dashed border-rose-200 text-rose-500 rounded-3xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-50 hover:border-rose-400 transition-all active:scale-[0.98]">
          <Plus className="w-4 h-4" /> Pemegang Baru
        </button>
      </div>
    </div>
  );
};

export default CompositionEditor;