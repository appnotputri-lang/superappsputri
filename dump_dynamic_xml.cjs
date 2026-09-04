const fs = require('fs');
const xml = fs.readFileSync('temp_doc.xml', 'utf8');

const pRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
let match;
let i = 0;
const targetIndices = [11, 14, 16, 17, 18, 20, 24, 25, 27, 28, 29, 30, 31, 32, 35, 72, 76, 80];

while ((match = pRegex.exec(xml)) !== null) {
  if (targetIndices.includes(i)) {
    console.log(`\n================== PARAGRAPH #${i} ==================`);
    console.log(match[0]);
  }
  i++;
}
