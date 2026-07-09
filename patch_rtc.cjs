const fs = require('fs');
const path = 'src/lib/rupsTahunanContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

const startStr = "const attendees: PhysicalAttendee[] = [];";
const endStr = "const totalValue = totalShares * (data.originalSharePrice || 0);";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `const configForAttendance = {
    data,
    originalSharePrice: data.originalSharePrice || 0,
    fullyDescribedNames,
    useAktaFormat: false,
    isSirkuler,
    isMinutes: true
  };
  blocks.push(...buildAttendanceBlocks(configForAttendance));

  `;
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync(path, code);
  console.log("Patched rupsTahunanContentBlocks.ts successfully.");
} else {
  console.log("Could not find start or end index.");
}
