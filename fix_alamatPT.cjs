const fs = require('fs');
let content = fs.readFileSync('src/DraftAktaPendirian.tsx', 'utf8');

if (!content.includes('alamatLengkapPT')) {
  // Add to Interface
  content = content.replace('kotaKedudukan: string;', 'kotaKedudukan: string;\n  alamatLengkapPT: string;');
  
  // Add to Form default state
  content = content.replace("kotaKedudukan: '',", "kotaKedudukan: '',\n    alamatLengkapPT: '',");

  // Add field to UI
  const formHtmlOld = `<input type="text" value={data.kotaKedudukan} onChange={e => updateData('kotaKedudukan', e.target.value)} className="w-full text-sm p-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none" placeholder="Jakarta Selatan" />`;
  const formHtmlNew = formHtmlOld + `
                <div className="mt-2">
                  <label className="block text-xs text-slate-600 mb-1">Alamat Lengkap PT (Opsional)</label>
                  <textarea value={data.alamatLengkapPT || ''} onChange={e => updateData('alamatLengkapPT', e.target.value)} className="w-full text-sm p-1.5 border border-slate-300 rounded focus:border-blue-500 outline-none" rows={2} placeholder="Jalan R.A. Kartini Nomor Kav 8 Tower A..." />
                </div>`;
  content = content.replace(formHtmlOld, formHtmlNew);

  fs.writeFileSync('src/DraftAktaPendirian.tsx', content);
}

// And update pendirianContentBlocks.ts
let blocksContent = fs.readFileSync('src/lib/pendirianContentBlocks.ts', 'utf8');
blocksContent = blocksContent.replace('berkedudukan di ${data.kotaKedudukan}.`', 'berkedudukan di ${toTitleCase(data.kotaKedudukan || "")}${data.alamatLengkapPT ? ", " + data.alamatLengkapPT : ""}.`');
fs.writeFileSync('src/lib/pendirianContentBlocks.ts', blocksContent);
