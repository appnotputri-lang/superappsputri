const fs = require('fs');

let file = fs.readFileSync('App.tsx', 'utf8');

const startTag = '{/* DATA PERSEROAN */}';
const endTag = '{/* DOMISILI PERSEROAN */}';

const startIndex = file.indexOf(startTag);
const endIndex = file.indexOf(endTag);

if (startIndex > -1 && endIndex > -1) {
  const extracted = file.substring(startIndex, endIndex);
  
  const modifiedFile = file.replace(extracted, 
`{/* Company Profile Form */}
{activeSidebarTab === 'company_profile' && editingProfileId && (
  <div className="space-y-4">
${extracted}
  </div>
)}

{activeSidebarTab === 'notulen' && (
   <AhuSection title="DATA PERSEROAN">
      <div className="space-y-4">
        <label className="block text-[13px] font-medium text-slate-700 mb-1">Pilih Profil Perseroan</label>
        <select 
          className="w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none bg-white focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)]"
          value={data.id || ''}
          onChange={e => {
             const selected = profiles.find(p => p.id === e.target.value);
             if (selected) {
                 updateData(selected as any);
             } else {
                 updateData({ 
                    id: '', companyName: '', companyShortName: '', npwp: '', companyType: 'SWASTA NASIONAL',
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
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Data <strong>{data.companyName}</strong> siap digunakan.
             </div>
             <div className="text-slate-500 pl-6">
                Silahkan lanjutkan dengan mengisi Agenda Perubahan.
             </div>
           </div>
        )}
      </div>
   </AhuSection>
)}
`);

  fs.writeFileSync('App.tsx', modifiedFile);
  console.log("Extraction injected");
} else {
  console.log("Tags not found");
}
