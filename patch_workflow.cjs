const fs = require('fs');
const file = 'src/services/WorkflowService.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'name: "Keputusan Sirkuler RUPST",',
  'name: "RUPST",'
);

fs.writeFileSync(file, content);
