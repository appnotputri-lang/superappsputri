const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

// Fix spaces
content = content.replace(/generatePendirian PTDocx/g, 'generatePendirianDocx');
content = content.replace(/generatePendirian PTPernyataanDocx/g, 'generatePendirianPernyataanDocx');
content = content.replace(/generatePendirian PTAktaDocx/g, 'generatePendirianAktaDocx');

// Redirect Akta and Pernyataan to use RUPST ones for now so it compiles, or maybe delete those buttons?
// Actually, let's keep them and call the RUPST ones since I duplicated it.
content = content.replace(/import\('\.\/src\/lib\/generatePendirianPernyataanDocx'\)/g, "import('./src/lib/generateRUPSTPernyataanDocx')");
content = content.replace(/generatePendirianPernyataanDocx\(mergedData\)/g, "generateRUPSTPernyataanDocx(mergedData)");

content = content.replace(/import\('\.\/src\/lib\/generatePendirianAktaDocx'\)/g, "import('./src/lib/generateRUPSTAktaDocx')");
content = content.replace(/generatePendirianAktaDocx\(mergedData\)/g, "generateRUPSTAktaDocx(mergedData)");

// Fix some weird imports
content = content.replace(/const { generateRUPSTPernyataanDocx } = await import\('\.\/src\/lib\/generateRUPSTPernyataanDocx'\);/g, "const { generateRUPSTPernyataanDocx } = await import('./src/lib/generateRUPSTPernyataanDocx');");
content = content.replace(/const { generateRUPSTAktaDocx } = await import\('\.\/src\/lib\/generateRUPSTAktaDocx'\);/g, "const { generateRUPSTAktaDocx } = await import('./src/lib/generateRUPSTAktaDocx');");


fs.writeFileSync('App.tsx', content);
