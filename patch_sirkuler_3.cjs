const fs = require('fs');
const path = 'src/lib/sirkulerLaporanContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

const regex1 = /const shDetails = formatPersonDetails\(r\.shareholder, "", "", false, false, true\);/g;

code = code.replace(regex1, `
          let shDetails = formatPersonDetails(r.shareholder, "", "", false, false, true);
          let hasDeeds = checkIsBadanHukum(r.shareholder) && r.shareholder.amendmentDeeds && r.shareholder.amendmentDeeds.length > 0;
          if (hasDeeds) {
            shDetails += ", dan telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut :";
          }
`);

const regex2 = /blocks\.push\(\{\s*type: "list",\s*bullet: "-",\s*indentLeft: 720,\s*indentHanging: 360,\s*runs: runs\s*\}\);/g;

code = code.replace(regex2, `
        blocks.push({
          type: "list",
          bullet: "-",
          indentLeft: 720,
          indentHanging: 360,
          runs: runs
        });
        
        if (isDirector && checkIsBadanHukum(r.shareholder) && r.shareholder.amendmentDeeds && r.shareholder.amendmentDeeds.length > 0) {
          r.shareholder.amendmentDeeds.forEach(deed => {
            blocks.push({
              type: "list",
              bullet: "-",
              indentLeft: 1080,
              indentHanging: 360,
              runs: [{ text: formatAmendmentDeedSingle(deed, false) }]
            });
          });
        }
`);

fs.writeFileSync(path, code);
