import React from 'react';
import { AhuSection, AhuLabel, AhuInput } from '../components/common/AhuComponents';
import { Briefcase, Plus, ArrowRight, Edit, Trash2, Eye, MapPin, Search } from 'lucide-react';
import { formatDateIndo, formatInputNumber, parseFormattedNumber } from '../../utils/formatters';
import { INITIAL_STATE } from '../domain/company/initialCompanyData';
import { OperationType, handleFirestoreError } from '../lib/firebase';

export const renderClientRoute = (props: any) => {
  const {
    user,
    userProfile,
    data,
    updateData,
    resetData,
    saveCompany,
    deleteCompany,
    cvProfiles
  } = props;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
        <div>
          <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><Briefcase className="w-5 h-5 text-teal-600" /> Klien CV</h2>
          <p className="text-[12px] text-slate-500">Kelola daftar profil klien CV (Persekutuan Komanditer)</p>
        </div>
        {!props.editingCvProfileId && (
          <button onClick={() => {
            if (props.setEditingCvProfileId) props.setEditingCvProfileId('new');
            if (props.setIsProfilePreview) props.setIsProfilePreview(false);
            updateData({ ...INITIAL_STATE, companyType: 'CV' } as any);
          }} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> TAMBAH KLIEN CV
          </button>
        )}
      </div>

      {props.editingCvProfileId ? (
        <div className="space-y-4 pb-20">
          <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-2 rounded-md border border-slate-200">
            <button className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-[12px] uppercase bg-white px-3 py-2 rounded-sm border border-slate-200 shadow-sm" onClick={() => props.setEditingCvProfileId && props.setEditingCvProfileId(null)}>
              <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
            </button>
            
            <div className="h-6 w-px bg-slate-300 mx-1"></div>

            {props.isProfilePreview ? (
              <>
                <button 
                  onClick={(e) => { e.preventDefault(); if (props.setIsProfilePreview) props.setIsProfilePreview(false); }}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[13px] font-bold transition-all border border-slate-200 shadow-sm flex items-center gap-2 uppercase">
                  <Edit className="w-4 h-4" /> Edit
                </button>
                {userProfile?.role !== 'Staff' && (
                  <button 
                    disabled={props.isSaving}
                    onClick={async (e) => {
                      e.preventDefault();
                      if(confirm('Hapus profil CV ' + data.companyName + '?')) {
                        if (!user) return alert('Anda harus login!');
                        if (props.setIsSaving) props.setIsSaving(true);
                        try {
                          const deletedName = data.companyName || 'CV Baru';
                          await deleteCompany(props.editingCvProfileId, true);
                          if (props.recordNotification) {
                            props.recordNotification(
                              'Klien CV Dihapus',
                              `Profil klien CV "${deletedName}" telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
                              'delete_profile'
                            );
                          }
                          alert('Profil CV berhasil dihapus');
                          if (props.setEditingCvProfileId) props.setEditingCvProfileId(null);
                        } catch (err) {
                          handleFirestoreError(err, OperationType.DELETE, `cv_profiles/${props.editingCvProfileId}`);
                        } finally {
                          if (props.setIsSaving) props.setIsSaving(false);
                        }
                      }
                    }}
                    className="px-5 py-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-md font-bold transition-all text-[13px] border border-red-100 hover:border-red-500 shadow-sm flex items-center gap-2 uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" /> Hapus
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={resetData} className="px-5 py-2 bg-[#d9534f] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#c9302c] shadow-sm uppercase">RISET</button>
                <button 
                  disabled={props.isSaving}
                  onClick={async () => {
                    if (!data.companyName) return alert('Nama CV harus diisi');
                    if (props.setIsSaving) props.setIsSaving(true);
                    const isNew = props.editingCvProfileId === 'new' || !props.editingCvProfileId;
                    const newId = props.editingCvProfileId && props.editingCvProfileId !== 'new' ? props.editingCvProfileId : crypto.randomUUID();
                    const profileData = {
                        ...data,
                        id: newId,
                        companyType: 'CV',
                        updatedAt: new Date().toISOString()
                    };
                    if (!user) {
                      if (props.setIsSaving) props.setIsSaving(false);
                      return alert('Anda harus login terlebih dahulu!');
                    }
                    
                    try {
                        await saveCompany(profileData.id, profileData, true);
                        if (props.recordNotification) {
                          props.recordNotification(
                            isNew ? 'Klien CV Baru Dibuat' : 'Profil Klien CV Diubah',
                            `Profil klien CV "${profileData.companyName}" telah ${isNew ? 'berhasil didaftarkan' : 'diperbarui'} oleh ${user?.email || 'Admin'}.`,
                            isNew ? 'create_profile' : 'update_profile'
                          );
                        }
                        if (props.setEditingCvProfileId) props.setEditingCvProfileId(null);
                        alert('Profil CV berhasil disimpan!');
                    } catch (e) {
                        handleFirestoreError(e, OperationType.WRITE, `cv_profiles/${profileData.id}`);
                    } finally {
                        if (props.setIsSaving) props.setIsSaving(false);
                    }
                }} className="px-5 py-2 bg-teal-600 text-white rounded-md text-[13px] font-bold transition-all hover:bg-teal-700 shadow-sm uppercase disabled:opacity-50 disabled:cursor-not-allowed">
                  {props.isSaving ? 'MENYIMPAN...' : 'SIMPAN PROFIL'}
                </button>
              </>
            )}
          </div>
          
          <fieldset disabled={props.isProfilePreview} className="space-y-4">
            {/* DATA CV */}
            <AhuSection title="DATA CV (PERSEKUTUAN KOMANDITER)">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Nama CV" />
                  <div className="md:col-span-3"><AhuInput value={data.companyName || ''} onChange={e => updateData({ companyName: e.target.value })} placeholder="Contoh: CV MAJU JAYA" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Kedudukan (Kab/Kota)" />
                  <div className="md:col-span-3">
                    <AhuInput 
                      placeholder="Contoh: Kota Bandung atau Kabupaten Bandung Barat"
                      value={data.domicile || ''}
                      onChange={e => updateData({ domicile: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Modal CV (Total)" />
                  <div className="md:col-span-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
                      <AhuInput 
                        className="pl-10"
                        value={data.originalCapitalPaid === 0 ? '' : formatInputNumber(data.originalCapitalPaid)} 
                        onChange={e => updateData({ originalCapitalPaid: parseFormattedNumber(e.target.value) })} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </AhuSection>

            {/* PESERO PENGURUS & KOMANDITER */}
            <AhuSection title="PESERO PENGURUS & KOMANDITER *">
              <div className="space-y-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => props.openShareholderEditor && props.openShareholderEditor('lama')} className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1"><Plus className="w-4 h-4" /> Tambah Data</button>
                  </div>
                  <div className="border border-slate-200 overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                        <tr>
                          <th className="p-2 border-r border-slate-200">Nama</th>
                          <th className="p-2 border-r border-slate-200">Status Pesero</th>
                          <th className="p-2 border-r border-slate-200">Jabatan</th>
                          <th className="p-2 border-r border-slate-200">Nilai Pemasukan (Modal)</th>
                          <th className="p-2 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.shareholders || []).map((s: any) => (
                            <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                              <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                              <td className="p-2 border-r border-slate-200">
                                {s.managementPosition?.toUpperCase().includes('KOMANDITER') ? 'KOMANDITER' : 'PENGURUS (KOMPLEMENTER)'}
                              </td>
                              <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.managementPosition || (s.isManagement ? 'DIREKTUR' : 'PESERO')}</td>
                              <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber(s.sharesOwned)}</td>
                              <td className="p-2 text-center text-blue-600 flex items-center justify-center gap-2">
                                <button onClick={() => props.openShareholderEditor && props.openShareholderEditor('lama', s)} className="hover:underline flex items-center gap-0.5"><Eye className="w-3 h-3" /> Edit</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => props.deleteShareholder && props.deleteShareholder(s.id, 'lama')} className="hover:underline text-red-500 flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Hapus</button>
                              </td>
                            </tr>
                        ))}
                        {(!data.shareholders || data.shareholders.length === 0) && (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400 italic">Belum ada data pesero.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </AhuSection>

            {/* AKTA PENDIRIAN CV */}
            <AhuSection title="AKTA PENDIRIAN DAN PERUBAHAN CV">
              <div className="space-y-4">
                  <div className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50">
                    <h3 className="font-bold text-[13px] text-slate-800">Akta Pendirian CV</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Nomor Akta" />
                      <div className="md:col-span-3">
                        <AhuInput value={data.establishmentDeedNumber || ''} onChange={e => updateData({ establishmentDeedNumber: e.target.value })} placeholder="Contoh: 12" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Tanggal Akta" />
                      <div className="md:col-span-3">
                        <AhuInput type="date" value={data.establishmentDeedDate || ''} onChange={e => updateData({ establishmentDeedDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Nama Notaris" />
                      <div className="md:col-span-3 flex gap-2">
                        <AhuInput 
                          className="flex-1"
                          value={data.establishmentNotary || ''} 
                          onChange={e => updateData({ establishmentNotary: e.target.value })} 
                          placeholder="Nama notaris pendirian CV" 
                        />
                        <AhuInput 
                          className="w-48"
                          value={data.establishmentNotaryTitle || ''} 
                          onChange={e => updateData({ establishmentNotaryTitle: e.target.value })} 
                          placeholder="Gelar (SH., M.Kn.)" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Kedudukan Notaris" />
                      <div className="md:col-span-3">
                        <AhuInput 
                          value={data.establishmentNotaryDomicile || ''} 
                          onChange={e => updateData({ establishmentNotaryDomicile: e.target.value })} 
                          placeholder="Contoh: Kota Bandung" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                      <AhuLabel label="Nomor SK (SABU)" />
                      <div className="md:col-span-3">
                        <AhuInput value={data.establishmentSkNumber || ''} onChange={e => updateData({ establishmentSkNumber: e.target.value })} placeholder="Nomor SK SABU Kemenkumham" />
                      </div>
                    </div>
                  </div>

                  {(data.amendmentDeeds || []).map((deed: any, index: number) => (
                    <div key={deed.id} className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50 relative">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                        <h3 className="font-bold text-[13px] text-slate-800 uppercase tracking-tight">Akta Perubahan {index + 1}</h3>
                        <button 
                          onClick={() => {
                            const newList = (data.amendmentDeeds || []).filter((d: any) => d.id !== deed.id);
                            updateData({ amendmentDeeds: newList });
                          }}
                          className="text-red-500 hover:text-red-700 p-1 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <AhuLabel label="Nomor Akta" />
                        <div className="md:col-span-3">
                          <AhuInput 
                            value={deed.number || ''} 
                            onChange={e => {
                              const newList = [...(data.amendmentDeeds || [])];
                              newList[index] = { ...deed, number: e.target.value };
                              updateData({ amendmentDeeds: newList });
                            }} 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <AhuLabel label="Tanggal Akta" />
                        <div className="md:col-span-3">
                          <AhuInput 
                            type="date" 
                            value={deed.date || ''} 
                            onChange={e => {
                              const newList = [...(data.amendmentDeeds || [])];
                              newList[index] = { ...deed, date: e.target.value };
                              updateData({ amendmentDeeds: newList });
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button 
                    onClick={() => {
                      const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', notaryDomicile: '', skNumber: '', skDate: '', skSpDocuments: [] };
                      updateData({ amendmentDeeds: [...(data.amendmentDeeds || []), newDeed] });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-sm text-slate-400 hover:border-teal-600 hover:text-teal-600 hover:bg-slate-50 transition-all group"
                  >
                    <Plus size={16} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[13px] font-bold uppercase tracking-wider">Tambah Akta Perubahan CV</span>
                  </button>
              </div>
            </AhuSection>

            {/* KBLI CV */}
            <AhuSection title="MAKSUD DAN TUJUAN (KBLI) CV">
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => props.setIsAddKbliModalOpen && props.setIsAddKbliModalOpen(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[12px] font-bold rounded-sm transition-all flex items-center gap-1.5 uppercase"
                >
                  <Plus className="w-4 h-4" /> Tambah KBLI
                </button>
                <div className="border border-slate-200 rounded-sm overflow-hidden">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-[#f8fafc] border-b border-slate-200 uppercase font-semibold">
                      <tr>
                        <th className="p-3 w-12 text-center border-r">No</th>
                        <th className="p-3 w-24 text-center border-r">Kode</th>
                        <th className="p-3 border-r">Judul KBLI</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.kbliItems || []).map((item: any, idx: number) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="p-3 text-center border-r text-slate-500">{idx + 1}</td>
                          <td className="p-3 text-center border-r font-mono font-bold">{item.code}</td>
                          <td className="p-3 border-r font-bold uppercase">{item.name}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => updateData({ kbliItems: (data.kbliItems || []).filter((k: any) => k.id !== item.id) })} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </AhuSection>
          </fieldset>
        </div>
      ) : (() => {
          let filteredCvProfileResults = (cvProfiles || []).filter((p: any) => !p.isArchived);
          filteredCvProfileResults = filteredCvProfileResults.filter((p: any) => {
            if (!props.cvProfileSearchQuery) return true;
            const q = props.cvProfileSearchQuery.toLowerCase();
            return (p.companyName || '').toLowerCase().includes(q) || (p.domicile || '').toLowerCase().includes(q);
          });

          const totalCvProfiles = filteredCvProfileResults.length;
          const profilesCvPerPage = 10;
          const totalCvProfilePages = Math.ceil(totalCvProfiles / profilesCvPerPage);
          const safeCvProfileCurrentPage = Math.min(props.cvProfileCurrentPage || 1, totalCvProfilePages || 1);
          const currentCvProfiles = filteredCvProfileResults.slice(
            (safeCvProfileCurrentPage - 1) * profilesCvPerPage,
            safeCvProfileCurrentPage * profilesCvPerPage
          );

          return (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Cari nama CV atau kedudukan..." 
                    value={props.cvProfileSearchQuery || ''}
                    onChange={(e) => { 
                      if (props.setCvProfileSearchQuery) props.setCvProfileSearchQuery(e.target.value); 
                      if (props.setCvProfileCurrentPage) props.setCvProfileCurrentPage(1); 
                    }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-sm text-[13px] focus:bg-white focus:ring-1 focus:ring-teal-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentCvProfiles.map((p: any) => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-sm p-4 hover:shadow-md transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-teal-50 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Briefcase className="w-5 h-5" /></div>
                        <div className="flex gap-1">
                          <button onClick={() => { if (props.setEditingCvProfileId) props.setEditingCvProfileId(p.id); if (props.setIsProfilePreview) props.setIsProfilePreview(true); updateData({ ...INITIAL_STATE, ...p } as any); }} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-teal-600 rounded-md transition-colors"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => { if (props.setEditingCvProfileId) props.setEditingCvProfileId(p.id); if (props.setIsProfilePreview) props.setIsProfilePreview(false); updateData({ ...INITIAL_STATE, ...p } as any); }} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-md transition-colors"><Edit className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <h3 className="font-bold text-slate-800 text-[14px] uppercase mb-1 truncate leading-tight" title={p.companyName}>{p.companyName || 'Tanpa Nama'}</h3>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-3">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate uppercase font-medium">{p.domicile || 'Kedudukan belum diatur'}</span>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <div className="text-slate-400">Update: {formatDateIndo(p.updatedAt || '')}</div>
                        <div className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase">KLIEN CV</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalCvProfiles === 0 && (
                <div className="bg-white border border-dashed border-slate-300 rounded-lg p-12 text-center">
                  <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-slate-600 font-bold mb-1">Belum ada klien CV</h3>
                  <p className="text-slate-400 text-sm mb-6">Mulai dengan menambahkan profil CV pertama Anda.</p>
                  <button onClick={() => { if (props.setEditingCvProfileId) props.setEditingCvProfileId('new'); if (props.setIsProfilePreview) props.setIsProfilePreview(false); updateData({ ...INITIAL_STATE, companyType: 'CV' } as any); }} className="bg-teal-600 text-white px-6 py-2 rounded-md font-bold text-sm shadow-sm hover:bg-teal-700 transition-all">TAMBAH CV SEKARANG</button>
                </div>
              )}

              {totalCvProfilePages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-sm">
                  <div className="text-[12px] text-slate-500">Menampilkan <b>{currentCvProfiles.length}</b> dari <b>{totalCvProfiles}</b> profil</div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalCvProfilePages }).map((_, i) => (
                      <button key={i} onClick={() => props.setCvProfileCurrentPage && props.setCvProfileCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-[12px] font-bold transition-all ${safeCvProfileCurrentPage === i + 1 ? 'bg-teal-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>{i + 1}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
      })()}
    </div>
  );
};
