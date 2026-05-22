const fs = require('fs');
let code = fs.readFileSync('src/DraftAktaPendirian.tsx', 'utf-8');

if (!code.includes('modalDisetorPersen')) {
  code = code.replace(
    'nilaiPerLembar: number;',
    'nilaiPerLembar: number;\n  modalDisetorPersen: number;'
  );
  code = code.replace(
    'modalDasar: 52000000,',
    'modalDasar: 52000000,\n    modalDisetorPersen: 25,'
  );
  
  const target = '<div>\n                     <label className="block text-xs text-slate-600 mb-1">Nilai per Saham (Rp)</label>\n                     <input type="number" value={data.nilaiPerLembar} onChange={e => updateData(\'nilaiPerLembar\', parseInt(e.target.value) || 0)} className="w-full text-sm p-1.5 border border-slate-300 rounded" />\n                   </div>';
  const newTarget = target + '\n                   <div>\n                     <label className="block text-xs text-slate-600 mb-1">Ditempatkan & Disetor (%)</label>\n                     <input type="number" min="0" max="100" value={data.modalDisetorPersen || 25} onChange={e => updateData(\'modalDisetorPersen\', parseInt(e.target.value) || 0)} className="w-full text-sm p-1.5 border border-slate-300 rounded" />\n                   </div>';
  
  code = code.replace(target, newTarget);
  code = code.replace('<div className="grid grid-cols-2 gap-3">', '<div className="grid grid-cols-3 gap-3">');

  fs.writeFileSync('src/DraftAktaPendirian.tsx', code);
  console.log('Modified DraftAktaPendirian');
}

let blocksCode = fs.readFileSync('src/lib/pendirianContentBlocks.ts', 'utf-8');
const searchBlock = '  const modalDisetorPersen = 25;\n  const modalDisetor = (data.modalDasar * 25) / 100;\n  const disetorLembar = totalLembar * 0.25;';
const replaceBlock = `  const modalDisetorPersen = data.modalDisetorPersen || 25;
  const modalDisetor = (data.modalDasar * modalDisetorPersen) / 100;
  const disetorLembar = (totalLembar * modalDisetorPersen) / 100;`;
blocksCode = blocksCode.replace(searchBlock, replaceBlock);
blocksCode = blocksCode.replace('25}% (dua puluh lima persen)', `\${modalDisetorPersen}}% (\${terbilang(modalDisetorPersen)} persen)`);
fs.writeFileSync('src/lib/pendirianContentBlocks.ts', blocksCode);
console.log('Modified blocks');
