const fs = require('fs');

const rupstPath = 'src/features/document-generator/pages/RUPSTPage.tsx';
let content = fs.readFileSync(rupstPath, 'utf8');

const methods = `
  const handleQuestionChange = (questionKey: 'rupstQuestionA' | 'rupstQuestionB' | 'rupstQuestionC' | 'rupstQuestionD' | 'rupstQuestionE' | 'rupstQuestionF', answer: 'ya' | 'tidak') => {
    updateData({
      [questionKey]: answer
    });
  };

  const updateManualRep = (updates: any) => {
    updateData({
      manualRepresentative: { ...(data.manualRepresentative || {}), ...updates }
    });
  };
`;

content = content.replace("return (() => {", methods + "\n  return (() => {");

fs.writeFileSync(rupstPath, content);
