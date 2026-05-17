const fs = require('fs');

let file = fs.readFileSync('App.tsx', 'utf8');

const startTag = '{/* DATA PERSEROAN */}';
const endTag = '{/* DOMISILI PERSEROAN */}';
const startIndex = file.indexOf(startTag);
const endIndex = file.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find extraction tags');
  process.exit(1);
}

const extractedForm = file.substring(startIndex, endIndex);

// Now remove the extracted form from its original place
// and replace it with the PT Selector

file = file.replace(extractedForm, `
            {/* DATA PERSEROAN (Pilihan dari Profil) */}
            <AhuSection title="DATA PERSEROAN">
              <div className="space-y-4">
                <label className="block text-[13px] font-medium text-slate-700 mb-1">Pilih Profil Perseroan</label>
                <select 
                  className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)]"
                  value={(data as any).id || ''}
                  onChange={e => {
                     const selected = profiles.find(p => p.id === e.target.value);
                     if (selected) {
                         // When selected, merge its properties
                         updateData({ ...selected } as any);
                     } else {
                         // Reset
                         updateData({ 
                            id: undefined, companyName: '', companyShortName: '', npwp: '', companyType: 'SWASTA NASIONAL',
                            status: 'tertutup', duration: 'TIDAK TERBATAS', newAddress: { province: '', city: '', fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '' },
                            originalAuthorizedShares: 0, originalTotalShares: 0, originalSharePrice: 0, 
                            originalCapitalBase: 0, originalCapitalPaid: 0, shareholders: [], amendmentDeeds: []
                         } as any);
                     }
                  }}
                >
                  <option value="">-- Pilih PT --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.companyName}</option>
                  ))}
                </select>
                {data.companyName && (
                   <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-sm text-[13px] text-slate-700 flex flex-col gap-2">
                     <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <div>Data <strong>{data.companyName}</strong> siap digunakan.</div>
                     </div>
                     <div className="text-slate-500 pl-7">
                        Abaikan jika Anda hanya ingin membuat Berita Acara / Akta tanpa perubahan.
                     </div>
                   </div>
                )}
              </div>
            </AhuSection>
`);

// Now insert the company_profile branch into the ternary chain.
const sidebarTabTarget = "{activeSidebarTab === 'perbaikan' ? (";
const companyProfileBranch = `
          {activeSidebarTab === 'company_profile' ? (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-sm shadow-sm border border-slate-200">
                <div>
                  <h2 className="text-[16px] font-bold flex items-center gap-2 text-slate-800 uppercase"><Building2 className="w-5 h-5 text-[#3b5998]" /> Profil Perusahaan</h2>
                  <p className="text-[12px] text-slate-500">Kelola daftar profil perusahaan untuk digunakan pada notulen dan akta</p>
                </div>
                {!editingProfileId && (
                  <button onClick={() => {
                    setEditingProfileId('new');
                    updateData({
                      id: undefined, companyName: '', companyShortName: '', npwp: '', companyType: 'SWASTA NASIONAL',
                      status: 'tertutup', duration: 'TIDAK TERBATAS', newAddress: { province: '', city: '', fullAddress: '', rt: '', rw: '', kelurahan: '', kecamatan: '' },
                      originalAuthorizedShares: 0, originalTotalShares: 0, originalSharePrice: 0, 
                      originalCapitalBase: 0, originalCapitalPaid: 0, shareholders: [], amendmentDeeds: []
                    } as any);
                  }} className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-4 py-2 rounded-sm font-bold text-[12px] flex items-center gap-2 transition-colors">
                    <Plus className="w-4 h-4" /> TAMBAH PROFIL
                  </button>
                )}
              </div>

              {editingProfileId ? (
                <div className="space-y-4 pb-20">
                  <button className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-[12px] uppercase bg-white px-3 py-2 rounded-sm border border-slate-200 shadow-sm" onClick={() => setEditingProfileId(null)}>
                    <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
                  </button>
                  
                  <div className="space-y-4">
                    ${extractedForm}
                  </div>

                  <div className="flex justify-end gap-2 bg-white p-4 shadow-sm border border-slate-200 rounded-sm">
                     <button onClick={() => {
                        if (!data.companyName) return alert('Nama perseroan harus diisi');
                        let newProfiles = [...profiles];
                        const profileData = {
                            id: editingProfileId === 'new' ? crypto.randomUUID() : editingProfileId,
                            companyName: data.companyName,
                            companyShortName: data.companyShortName,
                            npwp: data.npwp,
                            companyType: data.companyType,
                            status: data.status,
                            duration: data.duration,
                            newAddress: data.newAddress,
                            establishmentDeedNumber: data.establishmentDeedNumber,
                            establishmentDeedDate: data.establishmentDeedDate,
                            establishmentNotary: data.establishmentNotary,
                            establishmentNotaryTitle: data.establishmentNotaryTitle,
                            establishmentNotaryDomicile: data.establishmentNotaryDomicile,
                            establishmentSkNumber: data.establishmentSkNumber,
                            establishmentSkDate: data.establishmentSkDate,
                            amendmentDeeds: data.amendmentDeeds,
                            originalAuthorizedShares: data.originalAuthorizedShares,
                            originalTotalShares: data.originalTotalShares,
                            originalSharePrice: data.originalSharePrice,
                            originalCapitalBase: data.originalCapitalBase,
                            originalCapitalPaid: data.originalCapitalPaid,
                            shareholders: data.shareholders
                        };
                        
                        if (editingProfileId === 'new') {
                           newProfiles.push(profileData);
                        } else {
                           const idx = newProfiles.findIndex(p => p.id === editingProfileId);
                           if (idx >= 0) {
                             newProfiles[idx] = profileData;
                           }
                        }
                        setProfiles(newProfiles);
                        setEditingProfileId(null);
                        alert('Profil berhasil disimpan!');
                     }} className="bg-[#40bdae] hover:bg-[#349c8f] text-white font-bold px-8 py-2.5 rounded-sm text-[13px] flex items-center gap-2 transition-colors uppercase tracking-tight shadow-md">
                       <Save className="w-4 h-4"/> SIMPAN PROFIL
                     </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profiles.length === 0 ? (
                    <div className="col-span-full bg-slate-50 text-center py-12 rounded-sm border border-dashed border-slate-300 text-slate-500 text-[13px]">
                      Belum ada data profil perusahaan. Klik <strong>"TAMBAH PROFIL"</strong> untuk membuat.
                    </div>
                  ) : profiles.map(p => (
                     <div key={p.id} className="bg-white p-5 rounded-sm shadow-sm border border-slate-200 hover:border-[#3b5998] transition-colors relative group">
                        <div className="flex items-start gap-3">
                           <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                             <Building2 className="w-5 h-5 text-indigo-500" />
                           </div>
                           <div>
                              <h3 className="font-bold text-slate-800 text-[14px] leading-tight mb-1 pr-6">{p.companyName}</h3>
                              <p className="text-[12px] text-slate-500 flex items-center gap-1 line-clamp-1"><MapPin className="w-3 h-3 text-slate-400 shrink-0"/> {p.newAddress?.city || 'Area belum diisi'}</p>
                           </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                           <button onClick={() => {
                             setEditingProfileId(p.id);
                             updateData({ ...data, ...p } as any);
                           }} className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-sm text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1 transition-colors flex-1 uppercase">
                             <Edit className="w-3 h-3" /> Detail
                           </button>
                           <button onClick={() => {
                             if(confirm('Hapus profil ' + p.companyName + '?')) {
                               setProfiles(profiles.filter(x => x.id !== p.id));
                             }
                           }} className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white px-3 py-1.5 rounded-sm text-[11px] font-bold flex items-center justify-center gap-1 transition-colors flex-1 uppercase">
                             <Trash2 className="w-3 h-3" /> Hapus
                           </button>
                        </div>
                     </div>
                  ))}
                </div>
              )}
            </div>
          ) : {activeSidebarTab === 'perbaikan' ? (`;

file = file.replace(sidebarTabTarget, companyProfileBranch);

fs.writeFileSync('App.tsx', file);
console.log('Success refactoring company profile forms');
