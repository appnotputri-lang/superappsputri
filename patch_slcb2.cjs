const fs = require('fs');
const path = 'src/lib/sirkulerLaporanContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

const target1 = 'const repText = `Selaku kuasa dari ${r.shareholder.salutation || "Tuan"} ${getCleanDisplayName(r.shareholder.name || "")}${formatPersonDetails(r.shareholder, "", "", false, false, true)} berdasarkan surat kuasa tertanggal ${proxyDate}`;';
const replace1 = `
          let shDetailsProxy = formatPersonDetails(r.shareholder, "", "", false, false, true);
          if (checkIsBadanHukum(r.shareholder) && r.shareholder.amendmentDeeds && r.shareholder.amendmentDeeds.length > 0) {
            shDetailsProxy += ", dan anggaran dasarnya telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut :";
          }
          const repText = \`Selaku kuasa dari \${r.shareholder.salutation || "Tuan"} \${getCleanDisplayName(r.shareholder.name || "")}\${shDetailsProxy} berdasarkan surat kuasa tertanggal \${proxyDate}\`;
`;

// It might be there twice!
code = code.split(target1).join(replace1);

fs.writeFileSync(path, code);
