const fs = require('fs');

const content = fs.readFileSync('App.tsx', 'utf8');

let braces = 0;
let parens = 0;
let lineNum = 1;
let inString = false;
let stringChar = '';
let inComment = false;
let inSlashComment = false;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '\n') {
    lineNum++;
    if (inSlashComment) {
      inSlashComment = false;
    }
  }

  if (inComment) {
    if (char === '*' && content[i + 1] === '/') {
      inComment = false;
      i++;
    }
    continue;
  }

  if (inSlashComment) {
    continue;
  }

  if (inString) {
    if (char === '\\') {
      i++; // skip next char
    } else if (char === stringChar) {
      inString = false;
    }
    continue;
  }

  // Check strings
  if (char === '"' || char === "'" || char === '`') {
    inString = true;
    stringChar = char;
    continue;
  }

  // Check comments
  if (char === '/' && content[i + 1] === '*') {
    inComment = true;
    i++;
    continue;
  }
  if (char === '/' && content[i + 1] === '/') {
    inSlashComment = true;
    i++;
    continue;
  }

  if (char === '{') {
    braces++;
  } else if (char === '}') {
    braces--;
    if (braces < 0) {
      console.log(`Extra closing brace } at line ${lineNum}`);
      braces = 0; // reset
    }
  } else if (char === '(') {
    parens++;
  } else if (char === ')') {
    parens--;
    if (parens < 0) {
      console.log(`Extra closing paren ) at line ${lineNum}`);
      parens = 0; // reset
    }
  }
}

console.log(`Final braces count: ${braces}`);
console.log(`Final parens count: ${parens}`);
