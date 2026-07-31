const fs = require('fs');
let content = fs.readFileSync('src/domain/company/useDocumentRuntime.tsx', 'utf-8');

content = content.replace(
  'let patchedSh = { ...sh };',
  'let patchedSh = { ...sh };\n          if (patchedSh.isPresent === undefined) {\n            patchedSh.isPresent = true;\n          }'
);

fs.writeFileSync('src/domain/company/useDocumentRuntime.tsx', content);
