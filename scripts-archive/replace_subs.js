import fs from 'fs';
import path from 'path';

const filesToUpdate = [
  'components/ShareholderEditor.tsx',
  'components/StockTransferEditor.tsx',
  'components/CompositionEditor.tsx', 
  'components/ManagementEditor.tsx',
  'components/AddressFields.tsx'
];

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/text-\[10px\]/g, 'text-xs');
    code = code.replace(/text-\[11px\]/g, 'text-sm');
    code = code.replace(/rounded-2xl/g, 'rounded-3xl');
    code = code.replace(/text-\[9px\]/g, 'text-xs');
    fs.writeFileSync(file, code);
  }
}
console.log('Update subcomponents done');
