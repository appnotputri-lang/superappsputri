const fs = require('fs');
const path = 'src/lib/sirkulerLaporanContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/import \{ getDisplayNameForDocx \} from "\.\/formatter";\n/g, "");

fs.writeFileSync(path, code);
