const fs = require('fs');
const file = 'src/features/project-engine/components/ProjectDocumentUpload.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /Berikut adalah link dokumen proyek "\$\{project\.nama\}":/g,
  'Berikut adalah link dokumen proyek "${project.title}":'
);

content = content.replace(
  /const auth = AuthService\.getInstance\(\);\s*const userToken = await auth\.getCurrentUser\(\)\?\.getIdToken\(\);/g,
  'const userToken = await AuthService.getToken();'
);

fs.writeFileSync(file, content);
