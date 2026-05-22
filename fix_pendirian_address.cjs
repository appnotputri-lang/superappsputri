const fs = require('fs');

let code = fs.readFileSync('src/DraftAktaPendirian.tsx', 'utf-8');

// 1. Add AddressSelects import
if (!code.includes('AddressSelects')) {
  code = code.replace("import { Eye, Printer, Users, Building2, Banknote, HelpCircle, Save } from 'lucide-react';", "import { Eye, Printer, Users, Building2, Banknote, HelpCircle, Save } from 'lucide-react';\nimport { AddressSelects } from './components/AddressSelects';");
}

// 2. Add provinsi to Pendiri interface
code = code.replace(/kecamatan: string;\n\s*nik: string;/g, "kecamatan: string;\n  provinsi: string;\n  nik: string;");

// 3. Add provinsi to default state for pendiri
code = code.replace(/alamatJalan: '', kota: '', rt: '', rw: '', kelurahan: '', kecamatan: '',/g, "alamatJalan: '', kota: '', rt: '', rw: '', kelurahan: '', kecamatan: '', provinsi: '',");

// 4. Replace Pendiri address inputs with AddressSelects
// Find where these inputs are rendered
const targetDiv = `                            <label className="block text-slate-500 mb-0.5">Kota / Kabupaten</label>
                             <input type="text" value={p.kota} onChange={e => handlePendiriChange(p.id, 'kota', e.target.value)} className="w-full p-1 border rounded w-full" />
                           </div>
                           <div className="col-span-1">
                             <label className="block text-slate-500 mb-0.5">Alamat Jalan</label>
                             <input type="text" value={p.alamatJalan} onChange={e => handlePendiriChange(p.id, 'alamatJalan', e.target.value)} className="w-full p-1 border rounded" />
                           </div>
                           <div className="grid grid-cols-1 gap-1 col-span-1">
                              <div><label className="block text-slate-500 mb-0.5">RT</label><input type="text" value={p.rt} onChange={e => handlePendiriChange(p.id, 'rt', e.target.value)} className="w-full p-1 border rounded" /></div>
                              <div><label className="block text-slate-500 mb-0.5">RW</label><input type="text" value={p.rw} onChange={e => handlePendiriChange(p.id, 'rw', e.target.value)} className="w-full p-1 border rounded" /></div>
                              <div><label className="block text-slate-500 mb-0.5">Kelurahan</label><input type="text" value={p.kelurahan} onChange={e => handlePendiriChange(p.id, 'kelurahan', e.target.value)} className="w-full p-1 border rounded" /></div>
                              <div><label className="block text-slate-500 mb-0.5">Kecamatan</label><input type="text" value={p.kecamatan} onChange={e => handlePendiriChange(p.id, 'kecamatan', e.target.value)} className="w-full p-1 border rounded" /></div>
                           </div>`;

const replacementDiv = `                            <label className="block text-slate-500 mb-0.5">Alamat Jalan</label>
                             <input type="text" value={p.alamatJalan} onChange={e => handlePendiriChange(p.id, 'alamatJalan', e.target.value)} className="w-full p-1 border rounded" />
                           </div>
                           <div className="grid grid-cols-2 gap-1 col-span-1">
                              <div><label className="block text-slate-500 mb-0.5">RT</label><input type="text" value={p.rt} onChange={e => handlePendiriChange(p.id, 'rt', e.target.value)} className="w-full p-1 border rounded" /></div>
                              <div><label className="block text-slate-500 mb-0.5">RW</label><input type="text" value={p.rw} onChange={e => handlePendiriChange(p.id, 'rw', e.target.value)} className="w-full p-1 border rounded" /></div>
                           </div>
                           <div className="col-span-1">
                             <AddressSelects 
                               provinsi={p.provinsi || ''}
                               kota={p.kota}
                               kecamatan={p.kecamatan}
                               kelurahan={p.kelurahan}
                               onChange={(field, value) => handlePendiriChange(p.id, field as keyof Pendiri, value)}
                             />
                           </div>`;

code = code.replace(targetDiv, replacementDiv);

fs.writeFileSync('src/DraftAktaPendirian.tsx', code);
console.log('Fixed Pendirian Address');
