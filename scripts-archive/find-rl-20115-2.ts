import fs from 'fs';
const raw = fs.readFileSync('20115.json', 'utf8');
const obj = JSON.parse(raw);
const lines = obj.html.split(/<\/div>/);
for(let i=35; i<45; i++) {
    console.log(`Div Line ${i}:`, lines[i]);
}
