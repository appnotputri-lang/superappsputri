const fs = require('fs');

let file = fs.readFileSync('App.tsx', 'utf8');

file = file.replace(/{activeSidebarTab === 'perbaikan' \? \(/g, 
`{activeSidebarTab === 'company_profile' ? (
  <div className="max-w-5xl mx-auto space-y-4">
    <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Building2 className="w-5 h-5 text-[#3b5998]" /> Profil Perusahaan</h2>
        <p className="text-sm text-slate-500">Kelola daftar profil perusahaan untuk digunakan pada notulen dan akta</p>
      </div>
      <button onClick={() => {
        setEditingProfileId('new');
        // Reset data for form
        updateData({
          companyName: '',
          companyShortName: '',
          npwp: '',
          newAddress: { ...INITIAL_ADDRESS },
          originalAuthorizedShares: 0,
          originalTotalShares: 0,
          originalSharePrice: 0,
          shareholders: [],
          amendmentDeeds: []
        });
      }} className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2">
        <Plus className="w-4 h-4" /> Tambah Profil
      </button>
    </div>

    {editingProfileId ? (
      <div className="space-y-4">
        <button className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-sm" onClick={() => setEditingProfileId(null)}>
          &larr; Kembali
        </button>
        {renderCompanyProfileForm()}
        <div className="flex justify-end gap-2 bg-white p-4 shadow-sm border border-slate-200">
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
           }} className="bg-[#40bdae] hover:bg-[#349c8f] text-white font-bold px-6 py-2 rounded text-sm flex items-center gap-2 transition-colors">
             <Save className="w-4 h-4"/> Simpan Profil
           </button>
        </div>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.length === 0 ? (
          <div className="col-span-full bg-slate-50 text-center py-12 rounded border border-dashed border-slate-300 text-slate-500">
            Belum ada data profil perusahaan. Klik "Tambah Profil" untuk membuat.
          </div>
        ) : profiles.map(p => (
           <div key={p.id} className="bg-white p-5 rounded shadow-sm border border-slate-200 hover:border-[#3b5998] transition-colors relative group">
              <h3 className="font-bold text-slate-800 text-[15px] pr-8 leading-tight">{p.companyName}</h3>
              <p className="text-[12px] text-slate-500 mb-4 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> {p.newAddress?.city || 'Area belum diisi'}</p>
              <div className="flex gap-2">
                 <button onClick={() => {
                   setEditingProfileId(p.id);
                   // Apply to data
                   updateData({ ...data, ...p } as any);
                 }} className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded text-[12px] font-bold text-slate-700 flex items-center gap-1 transition-colors">
                   <Edit className="w-3 h-3" /> Detail & Edit
                 </button>
                 <button onClick={() => {
                   if(confirm('Hapus profil ini?')) {
                     setProfiles(profiles.filter(x => x.id !== p.id));
                   }
                 }} className="text-slate-400 hover:text-red-500 bg-transparent hover:bg-red-50 px-2 py-1.5 rounded transition-colors absolute top-3 right-3 opacity-0 group-hover:opacity-100">
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>
           </div>
        ))}
      </div>
    )}
  </div>
) : activeSidebarTab === 'perbaikan' ? (`);

fs.writeFileSync('App.tsx', file);
