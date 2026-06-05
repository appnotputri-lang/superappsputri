const fs = require('fs');
let content = fs.readFileSync('src/DraftAktaPendirian.tsx', 'utf8');
if (!content.includes('Saksi Notaris')) {
  const insertionPoint = '</AhuSection>\n        </div>\n\n        <div>\n          <AhuSection title="Struktur Pendirian">';
  const saksiBlock = `</AhuSection>
        </div>

        <div>
           <AhuSection title="Saksi Notaris (Saksi Akta)">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2 border border-slate-200 p-3 rounded">
                    <h4 className="font-bold text-xs text-slate-700">Saksi 1</h4>
                    <input type="text" placeholder="Nama Lengkap" value={data.saksi1Nama || ''} onChange={e => updateData('saksi1Nama', e.target.value)} className="w-full text-xs p-1.5 border rounded" />
                    <input type="text" placeholder="Tempat Lahir" value={data.saksi1LahirTempat || ''} onChange={e => updateData('saksi1LahirTempat', e.target.value)} className="w-full text-xs p-1.5 border rounded" />
                    <input type="date" value={data.saksi1LahirTanggal || ''} onChange={e => updateData('saksi1LahirTanggal', e.target.value)} className="w-full text-xs p-1.5 border rounded" />
                    <input type="text" placeholder="NIK" value={data.saksi1NIK || ''} onChange={e => updateData('saksi1NIK', e.target.value)} className="w-full text-xs p-1.5 border rounded" />
                    <textarea placeholder="Alamat Lengkap" value={data.saksi1Alamat || ''} onChange={e => updateData('saksi1Alamat', e.target.value)} className="w-full text-xs p-1.5 border rounded" rows={3} />
                 </div>
                 <div className="space-y-2 border border-slate-200 p-3 rounded">
                    <h4 className="font-bold text-xs text-slate-700">Saksi 2</h4>
                    <input type="text" placeholder="Nama Lengkap" value={data.saksi2Nama || ''} onChange={e => updateData('saksi2Nama', e.target.value)} className="w-full text-xs p-1.5 border rounded" />
                    <input type="text" placeholder="Tempat Lahir" value={data.saksi2LahirTempat || ''} onChange={e => updateData('saksi2LahirTempat', e.target.value)} className="w-full text-xs p-1.5 border rounded" />
                    <input type="date" value={data.saksi2LahirTanggal || ''} onChange={e => updateData('saksi2LahirTanggal', e.target.value)} className="w-full text-xs p-1.5 border rounded" />
                    <input type="text" placeholder="NIK" value={data.saksi2NIK || ''} onChange={e => updateData('saksi2NIK', e.target.value)} className="w-full text-xs p-1.5 border rounded" />
                    <textarea placeholder="Alamat Lengkap" value={data.saksi2Alamat || ''} onChange={e => updateData('saksi2Alamat', e.target.value)} className="w-full text-xs p-1.5 border rounded" rows={3} />
                 </div>
              </div>
           </AhuSection>
        </div>

        <div>
          <AhuSection title="Struktur Pendirian">`;
  content = content.replace(insertionPoint, saksiBlock);
  fs.writeFileSync('src/DraftAktaPendirian.tsx', content);
}
