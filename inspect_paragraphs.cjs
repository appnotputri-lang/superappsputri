const fs = require('fs');
const xml = fs.readFileSync('temp_doc.xml', 'utf8');

// Match each paragraph
const pRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
let match;
let i = 0;
const list = [];
while ((match = pRegex.exec(xml)) !== null) {
  const pContent = match[1];
  const tMatches = pContent.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
  const text = tMatches.map(t => t.replace(/<[^>]+>/g, '')).join('');
  list.push({ idx: i, text, pXml: match[0] });
  i++;
}

fs.writeFileSync('all_paragraphs.json', JSON.stringify(list.map(x => ({ idx: x.idx, text: x.text })), null, 2));
console.log('Saved all_paragraphs.json with', list.length, 'paragraphs');
