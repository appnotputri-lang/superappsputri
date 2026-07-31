const fs = require('fs');
let content = fs.readFileSync('src/app/AppShell.tsx', 'utf-8');

content = content.replace(
  'kbliItems: (profile.kbliItems && profile.kbliItems.length > 0) ? profile.kbliItems : docData.kbliItems,',
  'kbliItems: (docData.kbliItems && docData.kbliItems.length > 0) ? docData.kbliItems : profile.kbliItems,'
);
content = content.replace(
  'shareholders: (profile.shareholders && profile.shareholders.length > 0) ? profile.shareholders : docData.shareholders,',
  'shareholders: (docData.shareholders && docData.shareholders.length > 0) ? docData.shareholders : profile.shareholders,'
);
content = content.replace(
  'oldManagementItems: (profile.oldManagementItems || profile.newManagementItems || profile.managementItems || []).length > 0 ? (profile.oldManagementItems || profile.newManagementItems || profile.managementItems) : docData.oldManagementItems,',
  'oldManagementItems: (docData.oldManagementItems && docData.oldManagementItems.length > 0) ? docData.oldManagementItems : (profile.oldManagementItems || profile.newManagementItems || profile.managementItems),'
);
content = content.replace(
  'managementItems: (profile.newManagementItems || profile.managementItems || profile.oldManagementItems || []).length > 0 ? (profile.newManagementItems || profile.managementItems || profile.oldManagementItems) : docData.managementItems,',
  'managementItems: (docData.managementItems && docData.managementItems.length > 0) ? docData.managementItems : (profile.newManagementItems || profile.managementItems || profile.oldManagementItems),'
);

fs.writeFileSync('src/app/AppShell.tsx', content);
