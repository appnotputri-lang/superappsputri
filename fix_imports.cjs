const fs = require('fs');

function addImports(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  const importsToAdd = `
import { History, Archive, Coins, Users, FileSignature, CheckSquare, XCircle, Search, Calendar, Play } from 'lucide-react';
import JSZip from 'jszip';
import { formatInputNumber, parseFormattedNumber } from '../../../src/utils/formatters';
import { MeetingFormShell } from '../../../src/components/MeetingFormShell';
import { ShareholderEditor } from '../../../src/components/editors/ShareholderEditor';
import { CompositionEditor } from '../../../src/components/editors/CompositionEditor';
import { ManagementEditor } from '../../../src/components/editors/ManagementEditor';
import { generateRUPSTDocx } from '../../../src/lib/generateRUPSTDocx';
import { generateRUPSTAktaDocx } from '../../../src/lib/generateRUPSTAktaDocx';
import { generateSirkulerLaporanDocx } from '../../../src/lib/generateSirkulerLaporanDocx';
import { generateRUPSTPernyataanDocx } from '../../../src/lib/generateRUPSTPernyataanDocx';
import { generateWordDoc } from '../../../src/utils/docxGenerator';
import { fetchLatestDeedNumbers } from '../../../src/lib/deedUtils';
import { KBLI_2020_SUGGESTIONS } from '../../../src/constants/appConstants';
import { ImportKBLI } from '../../../src/components/ImportKBLI';
import { generateDataCorrectionLetter } from '../../../src/lib/generateDataCorrectionLetter';
`;

  // insert after 'lucide-react' import
  content = content.replace("import { INITIAL_STATE } from '../../../src/domain/company/initialCompanyData';", "import { INITIAL_STATE } from '../../../src/domain/company/initialCompanyData';\n" + importsToAdd);
  
  fs.writeFileSync(file, content);
}

addImports('src/features/document-generator/pages/RUPSLBPage.tsx');
addImports('src/features/document-generator/pages/RUPSTPage.tsx');
