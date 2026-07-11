const fs = require('fs');

let docGen = fs.readFileSync('src/features/document-generator/pages/DocumentGeneratorPage.tsx', 'utf8');
docGen = docGen.replace("activeProjectJobType,\n                handleFetchLatestNumbers", "activeProjectJobType,\n                handleFetchLatestNumbers"); // it's already there for rupstProps
fs.writeFileSync('src/features/document-generator/pages/DocumentGeneratorPage.tsx', docGen);

