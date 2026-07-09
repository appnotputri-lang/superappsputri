const fs = require('fs');
const path = 'src/lib/rupsContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/originalSharePrice: data.originalSharePrice \|\| 0,/g, 'originalSharePrice: data.originalSharePrice || 0,\n    shareholders: data.shareholders,\n    oldManagementItems: data.oldManagementItems,\n    newManagementItems: data.newManagementItems,');
fs.writeFileSync(path, code);

const path2 = 'src/lib/rupsTahunanContentBlocks.ts';
let code2 = fs.readFileSync(path2, 'utf8');

code2 = code2.replace(/originalSharePrice: data.originalSharePrice \|\| 0,/g, 'originalSharePrice: data.originalSharePrice || 0,\n    shareholders: data.shareholders,\n    oldManagementItems: data.oldManagementItems,\n    newManagementItems: data.newManagementItems,');
fs.writeFileSync(path2, code2);
