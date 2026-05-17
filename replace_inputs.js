import fs from 'fs';

const filesToUpdate = [
  'App.tsx',
  'components/ShareholderEditor.tsx',
  'components/StockTransferEditor.tsx',
  'components/CompositionEditor.tsx', 
  'components/ManagementEditor.tsx',
  'components/AddressFields.tsx'
];

for (const file of filesToUpdate) {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    // make inputs taller and pads wider where standard py-2 is used
    code = code.replace(/py-2(?!\S)/g, 'py-3');
    code = code.replace(/py-2\.5(?!\S)/g, 'py-3');
    code = code.replace(/px-3(?!\S)/g, 'px-4');
    
    // adjust specific rounded sizes more modern
    code = code.replace(/rounded-md/g, 'rounded-xl');
    code = code.replace(/rounded-lg/g, 'rounded-2xl');
    
    fs.writeFileSync(file, code);
  }
}
console.log('Update input sizes done');
