const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/project-engine/components/ProjectDetail.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const syncStart = content.indexOf('const syncDeedInfoAndClientProfile = async () => {');
const syncEnd = content.indexOf('const handleSaveDeedInfoOnly = async () => {');

if (syncStart !== -1 && syncEnd !== -1) {
  let funcBody = content.slice(syncStart, syncEnd);

  // We want to wrap the actual db updates inside the onConfirm callback of the modal
  
  // Find where updates start
  // 1. office_projects: await updateDoc(doc(db, 'office_projects', projectId), { metadata: updatedMetadata });
  // 2. targetCollection: await updateDoc(doc(db, targetCollection, refIdToUse), cleanUndefined(formUpdatePayload));
  // 3. profiles: await setDoc(doc(db, 'profiles', project.clientId), cleanUndefined(profileUpdate), { merge: true });
  // 4. company_profiles: await setDoc(doc(db, 'company_profiles', project.clientId), ...

  console.log("Found function bounds", syncStart, syncEnd);
}
