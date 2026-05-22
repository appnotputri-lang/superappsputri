const fs = require('fs');

let code = fs.readFileSync('src/DraftAktaPendirian.tsx', 'utf-8');

// 1. Remove grid-cols-2 and grid-cols-3 and grid-cols-4 and replace with grid-cols-1 or remove entirely
code = code.replace(/<div className="grid grid-cols-2 gap-2">/g, '<div className="grid grid-cols-1 gap-2">');
code = code.replace(/<div className="grid grid-cols-2 gap-3">/g, '<div className="grid grid-cols-1 gap-3">');
code = code.replace(/<div className="grid grid-cols-3 gap-3">/g, '<div className="grid grid-cols-1 gap-3">');
code = code.replace(/<div className="grid grid-cols-2 gap-2 text-xs">/g, '<div className="grid grid-cols-1 gap-2 text-xs">');
code = code.replace(/<div className="grid grid-cols-2 gap-1 col-span-2">/g, '<div className="grid grid-cols-1 gap-1 col-span-1">');
code = code.replace(/<div className="grid grid-cols-4 gap-1 col-span-2">/g, '<div className="grid grid-cols-1 gap-1 col-span-1">');
code = code.replace(/<div className="col-span-2 border-t mt-2 pt-2 grid grid-cols-2 gap-2">/g, '<div className="col-span-1 border-t mt-2 pt-2 grid grid-cols-1 gap-2">');

// 2. Fix the col-span-2 classes since it's now a 1-column layout, we should just remove them or make them col-span-1
code = code.replace(/<div className="col-span-2">/g, '<div className="col-span-1">');

// 3. Remove "Notaris Wilayah Jabatan" input
const notarisStr = `              <div>
                <label className="block text-xs font-bold text-[#333] mb-1">Notaris Wilayah Jabatan</label>
                <input type="text" value={data.notarisTempat} onChange={e => updateData('notarisTempat', e.target.value)} className="w-full text-sm p-1.5 border border-slate-300 rounded" placeholder="Kabupaten Bandung Barat" />
              </div>`;

code = code.replace(notarisStr, '');

// Also change the default notarisTempat in the initial state to "Kabupaten Bandung Barat"
code = code.replace(/notarisTempat: '',/g, `notarisTempat: 'Kabupaten Bandung Barat',`);

// 4. Update the Modal Disetor Label to show lembar
const lembarStr = `<div>
                     <label className="block text-xs text-slate-600 mb-1">Ditempatkan & Disetor (%)</label>
                     <input type="number" min="0" max="100" value={data.modalDisetorPersen || 25} onChange={e => updateData('modalDisetorPersen', parseInt(e.target.value) || 0)} className="w-full text-sm p-1.5 border border-slate-300 rounded" />
                   </div>`;

const newLembarStr = `<div>
                     <label className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>Ditempatkan & Disetor (%)</span>
                        <span className="text-blue-700 font-bold">{Math.floor((data.modalDasar / data.nilaiPerLembar) * ((data.modalDisetorPersen || 25) / 100)) || 0} Lembar</span>
                     </label>
                     <input type="number" min="0" max="100" value={data.modalDisetorPersen || 25} onChange={e => updateData('modalDisetorPersen', parseInt(e.target.value) || 0)} className="w-full text-sm p-1.5 border border-slate-300 rounded" />
                   </div>`;
code = code.replace(lembarStr, newLembarStr);

fs.writeFileSync('src/DraftAktaPendirian.tsx', code);
console.log('Fixed DraftAktaPendirian form layout');
