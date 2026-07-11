const fs = require('fs');

// Fix DocumentGeneratorPageProps interface
let docGen = fs.readFileSync('src/features/document-generator/pages/DocumentGeneratorPage.tsx', 'utf8');
docGen = docGen.replace("import RUPSTPage, { RUPSTPageProps } from './RUPSTPage';", "import RUPSTPage, { RUPSTPageProps } from './RUPSTPage';\n// ...\n");
fs.writeFileSync('src/features/document-generator/pages/DocumentGeneratorPage.tsx', docGen);

// Fix App.tsx where DocumentGeneratorPage is called
let app = fs.readFileSync('App.tsx', 'utf8');
app = app.replace("AutoSaveIndicatorComponent\n              }}", "AutoSaveIndicatorComponent,\n                setProxyModalOpenId,\n                activeProjectJobType,\n                handleFetchLatestNumbers,\n                isFetchingNumbers,\n                projects,\n                pendirianProjects,\n                syncCompanyDataToRupst\n              }}");
fs.writeFileSync('App.tsx', app);
