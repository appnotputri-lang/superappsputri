const fs = require('fs');

const path = 'src/features/document-generator/pages/RUPSLBPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const methods = `
  const updateAddress = (type: 'oldAddress' | 'newAddress', updates: any) => {
    updateData({
      [type]: { ...(data[type] || {}), ...updates }
    });
  };

  const openShareholderEditor = (sh: any) => {
    // If you need it, add setEditingShareholder to props and call it.
    // Or just alert.
  };

  const deleteShareholder = (id: string) => {
    if (confirm('Are you sure?')) {
      updateData({
        shareholders: (data.shareholders || []).filter((s: any) => s.id !== id)
      });
    }
  };

  const updateManualRep = (updates: any) => {
    updateData({
      manualRepresentative: { ...(data.manualRepresentative || {}), ...updates }
    });
  };
`;

content = content.replace("return (() => {", methods + "\n  return (() => {");

fs.writeFileSync(path, content);
