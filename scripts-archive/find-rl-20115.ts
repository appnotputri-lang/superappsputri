import fs from 'fs';
const raw = fs.readFileSync('20115.json', 'utf8');
const obj = JSON.parse(raw);
const lines = obj.html.split(/<\/div>/);
lines.forEach((l: string, i: number) => {
    if (l.includes("Ruang Lingkup")) {
        console.log(`Line ${i}: ${l}`);
    }
});
