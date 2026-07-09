const fs = require('fs');
const path = 'src/lib/sirkulerLaporanContentBlocks.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/if \(isDirector && checkIsBadanHukum\(r\.shareholder\)/g, 'if (checkIsBadanHukum(r.shareholder)');

// Also for !isDirector I need to add "dan telah mengalami beberapa kali perubahan" to the details!
// In my previous patch, I only added it to the `isDirector` branch.
const repTextMatch = "const proxyDate = r.proxyData.proxyDeedDate ? formatDateRupst(r.proxyData.proxyDeedDate) : \"__________\";\n          const repText = `Selaku kuasa dari ${r.shareholder.salutation || \"Tuan\"} ${getCleanDisplayName(r.shareholder.name || \"\")}${formatPersonDetails(r.shareholder, \"\", \"\", false, false, true)} berdasarkan surat kuasa tertanggal ${proxyDate}`;";

// I'll just use string replacement on the block
