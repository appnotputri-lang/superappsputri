const fs = require('fs');
const content = fs.readFileSync('src/app/AppShell.tsx', 'utf-8');

const mergeLogic = `
      const mergeWithMasterClient = (docData: any) => {
        if (!docData.selectedProfileId) return docData;
        const profile = profiles.find((p: any) => p.id === docData.selectedProfileId || p.clientId === docData.selectedProfileId);
        if (!profile) return docData;

        return {
          ...docData,
          companyName: profile.companyName || docData.companyName,
          companyShortName: profile.companyShortName || docData.companyShortName,
          companyType: profile.companyType || docData.companyType,
          npwp: profile.npwp || docData.npwp,
          domicile: profile.domicile || profile.oldDomicile || docData.domicile,
          oldDomicile: profile.oldDomicile || profile.domicile || docData.oldDomicile,
          fullAddress: profile.fullAddress || profile.oldFullAddress || docData.fullAddress,
          oldFullAddress: profile.oldFullAddress || profile.fullAddress || docData.oldFullAddress,
          kbliItems: (profile.kbliItems && profile.kbliItems.length > 0) ? profile.kbliItems : docData.kbliItems,
          shareholders: (profile.shareholders && profile.shareholders.length > 0) ? profile.shareholders : docData.shareholders,
          oldManagementItems: (profile.oldManagementItems || profile.newManagementItems || profile.managementItems || []).length > 0 ? (profile.oldManagementItems || profile.newManagementItems || profile.managementItems) : docData.oldManagementItems,
          managementItems: (profile.newManagementItems || profile.managementItems || profile.oldManagementItems || []).length > 0 ? (profile.newManagementItems || profile.managementItems || profile.oldManagementItems) : docData.managementItems,
          capitalBase: profile.targetCapitalBase || profile.capitalBase || profile.originalCapitalBase || docData.capitalBase,
          capitalPaid: profile.targetCapitalPaid || profile.capitalPaid || profile.originalCapitalPaid || docData.capitalPaid,
          shareValue: profile.shareValue || profile.originalSharePrice || docData.shareValue,
        };
      };
`;

let newContent = content.replace('// 1. If editing an existing RUPSLB document', mergeLogic + '\n      // 1. If editing an existing RUPSLB document');

newContent = newContent.replace(
  'if (found) {\n          updateData({\n            ...INITIAL_STATE,\n            ...found,',
  'if (found) {\n          const mergedFound = mergeWithMasterClient(found);\n          updateData({\n            ...INITIAL_STATE,\n            ...mergedFound,'
);
newContent = newContent.replace(
  'kbliItems: normalizeKblis(found.kbliItems)\n          });\n          loadedDocIdRef.current = sessionKey;\n          return;\n        }\n      }\n\n      // 2. If editing an existing RUPST document',
  'kbliItems: normalizeKblis(mergedFound.kbliItems)\n          });\n          loadedDocIdRef.current = sessionKey;\n          return;\n        }\n      }\n\n      // 2. If editing an existing RUPST document'
);

newContent = newContent.replace(
  'if (found) {\n          updateData({\n            ...INITIAL_STATE,\n            ...found,\n            kbliItems: normalizeKblis(found.kbliItems)\n          });\n          loadedDocIdRef.current = sessionKey;\n          return;\n        }\n      }\n\n      // 3. If editing an existing Pendirian document',
  'if (found) {\n          const mergedFound = mergeWithMasterClient(found);\n          updateData({\n            ...INITIAL_STATE,\n            ...mergedFound,\n            kbliItems: normalizeKblis(mergedFound.kbliItems)\n          });\n          loadedDocIdRef.current = sessionKey;\n          return;\n        }\n      }\n\n      // 3. If editing an existing Pendirian document'
);

newContent = newContent.replace(
  'if (found) {\n          updateData({\n            ...INITIAL_STATE,\n            ...found,\n            kbliItems: normalizeKblis(found.kbliItems)\n          });\n          loadedDocIdRef.current = sessionKey;\n          return;\n        }\n      }\n\n      // Reset to empty state',
  'if (found) {\n          const mergedFound = mergeWithMasterClient(found);\n          updateData({\n            ...INITIAL_STATE,\n            ...mergedFound,\n            kbliItems: normalizeKblis(mergedFound.kbliItems)\n          });\n          loadedDocIdRef.current = sessionKey;\n          return;\n        }\n      }\n\n      // Reset to empty state'
);


fs.writeFileSync('src/app/AppShell.tsx', newContent);
