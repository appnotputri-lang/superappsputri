const fs = require('fs');
const path = 'src/lib/rupsContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

const startStr = "const attendees: PhysicalAttendee[] = [];";
const endStr = "blocks.push({\n      type: \"list\",\n      bullet: \"-\",\n      indentTabs: 0.5,\n      runs: [\n        {\n          text: `Bahwa dari semua saham";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `const configForAttendance = {
    data,
    originalSharePrice: data.originalSharePrice || 0,
    fullyDescribedNames,
    useAktaFormat: false,
    isSirkuler: isCircular,
    isMinutes: true
  };
  blocks.push(...buildAttendanceBlocks(configForAttendance));

  `;
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync(path, code);
  console.log("Patched rupsContentBlocks.ts successfully.");
} else {
  console.log("Could not find start or end index.");
}
