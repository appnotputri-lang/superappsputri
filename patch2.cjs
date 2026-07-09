const fs = require('fs');
const path = 'src/lib/sections/attendance/physicalAttendee.ts';
let code = fs.readFileSync(path, 'utf8');

const regex1 = /let repTextRuns: FormatToken\[\] = \[\];\s*if \(isDirector\) \{\s*repTextRuns\.push\(\{ text: `selaku Direktur dari ` \}\);\s*repTextRuns\.push\(\.\.\.getPersonDetailRuns\(\{ \.\.\.config, person: r\.shareholder \}\)\);\s*\} else \{\s*const proxyDate = [^}]+\s*repTextRuns\.push\(\{\s*text: `selaku penerima kuasa [^`]+`,\s*\}\);\s*repTextRuns\.push\(\.\.\.getPersonDetailRuns\(\{ \.\.\.config, person: r\.shareholder \}\)\);\s*\}\s*repTextRuns\.push\(\{\s*text: `, yang dalam hal ini merupakan pemilik[^`]+`,\s*\}\);\s*blocks\.push\(\{\s*type: "list",\s*bullet: "-",\s*indentTabs: 1\.5,\s*runs: repTextRuns,\s*\}\);/g;

code = code.replace(regex1, `
        let prefixRuns: FormatToken[] = [];
        if (isDirector) {
          prefixRuns.push({ text: \`selaku Direktur dari \` });
        } else {
          const proxyDate = r.proxyData.proxyDeedDate
            ? (useAktaFormat ? formatAktaDate(r.proxyData.proxyDeedDate) : formatDateRupst(r.proxyData.proxyDeedDate))
            : "__________";
          prefixRuns.push({
            text: \`selaku penerima kuasa berdasarkan Surat Kuasa tertanggal \${proxyDate}, dari dan oleh karena itu sah bertindak untuk dan atas nama \`,
          });
        }
        const suffixRuns: FormatToken[] = [{
          text: \`, yang dalam hal ini merupakan pemilik dan pemegang saham sebanyak \${formatNumber(r.sharesOwned)} lembar saham atau senilai Rp. \${formatNumber(shareRp)},- berhak mengeluarkan suara \${formatNumber(r.sharesOwned)} suara dalam rapat.\`,
        }];

        addPersonIdentificationBlocks(blocks, {
          ...config,
          person: r.shareholder,
          prefixRuns,
          suffixRuns,
          bullet: "-",
          indentTabs: 1.5,
        });
`);

const regex2 = /let repTextRuns: FormatToken\[\] = \[\];\s*if \(isDirector\) \{\s*repTextRuns\.push\(\{ text: `selaku Direktur dari ` \}\);\s*repTextRuns\.push\(\.\.\.getPersonDetailRuns\(\{ \.\.\.config, person: r\.shareholder \}\)\);\s*\} else \{\s*const proxyDate = [^}]+\s*repTextRuns\.push\(\{\s*text: `selaku penerima kuasa [^`]+`,\s*\}\);\s*repTextRuns\.push\(\.\.\.getPersonDetailRuns\(\{ \.\.\.config, person: r\.shareholder \}\)\);\s*\}\s*repTextRuns\.push\(\{\s*text: `, yang dalam hal ini merupakan pemilik[^`]+`,\s*\}\);\s*blocks\.push\(\{\s*type: "list",\s*bullet: String\.fromCharCode\(subBulletCode \+ bulletIdx - 1\) \+ "\.",\s*indentTabs: 2\.0,\s*runs: repTextRuns,\s*\}\);/g;

code = code.replace(regex2, `
        let prefixRuns: FormatToken[] = [];
        if (isDirector) {
          prefixRuns.push({ text: \`selaku Direktur dari \` });
        } else {
          const proxyDate = r.proxyData.proxyDeedDate
            ? (useAktaFormat ? formatAktaDate(r.proxyData.proxyDeedDate) : formatDateRupst(r.proxyData.proxyDeedDate))
            : "__________";
          prefixRuns.push({
            text: \`selaku penerima kuasa berdasarkan Surat Kuasa tertanggal \${proxyDate}, dari dan oleh karena itu sah bertindak untuk dan atas nama \`,
          });
        }
        const suffixRuns: FormatToken[] = [{
          text: \`, yang dalam hal ini merupakan pemilik dan pemegang saham sebanyak \${formatNumber(r.sharesOwned)} lembar saham atau senilai Rp. \${formatNumber(shareRp)},- berhak mengeluarkan suara \${formatNumber(r.sharesOwned)} suara dalam rapat\${getEnding(bulletIdx)}\`,
        }];

        addPersonIdentificationBlocks(blocks, {
          ...config,
          person: r.shareholder,
          prefixRuns,
          suffixRuns,
          bullet: String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
          indentTabs: 2.0,
        });
`);

fs.writeFileSync(path, code);
