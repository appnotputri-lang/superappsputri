const fs = require('fs');
const path = 'src/lib/sirkulerLaporanContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

// I also need to import `addPersonIdentificationBlocks`
code = code.replace(/import \{ buildAmendmentDeedBlocks \} from "\.\/sections\/history\/amendmentDeeds";/, 'import { buildAmendmentDeedBlocks } from "./sections/history/amendmentDeeds";\nimport { addPersonIdentificationBlocks } from "./sections/personIdentification";\nimport { getDisplayNameForDocx } from "./formatter";');

fs.writeFileSync(path, code);
