const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src/features/project-engine/components/ProjectDetail.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const syncStart = content.indexOf('const syncDeedInfoAndClientProfile = async () => {');
const syncEnd = content.indexOf('const handleSaveDeedInfoOnly = async () => {');
fs.writeFileSync('sync-func.txt', content.slice(syncStart, syncEnd));
