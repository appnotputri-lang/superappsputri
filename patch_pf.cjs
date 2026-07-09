const fs = require('fs');
const path = 'src/lib/docx-renderer/ParagraphFactory.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/if \(level === 0\) \{\s*leftIndent = 284;\s*hangingIndent = 284;\s*\}/, `if (level === 0) {
    leftIndent = 426;
    hangingIndent = 426;
  }`);

fs.writeFileSync(path, code);
