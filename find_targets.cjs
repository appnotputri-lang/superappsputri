const fs = require('fs');
const xml = fs.readFileSync('temp_doc.xml', 'utf8');

const targets = [
  "SUKMADJAJA",
  "ACIH",
  "ROSIDAH",
  "651",
  "00039/1999",
  "167",
  "10310111.03820",
  "32.06.290.004.009-0096.0",
  "430.000.000",
  "Nomor  01",
  "01  /",
  "Jum’at",
  "09 ( sembilan )",
  "DOKTOR SUKMAJAYA",
  "SUKMAJAYA",
  "13-04-1977",
  "03-04-1952",
  "04-09-1957",
  "29-09-1999",
  "3217010304520002",
  "3523165304770005",
  "3217014409570001",
  "HARRY Z S",
  "RATIN"
];

for (const tgt of targets) {
  let count = 0;
  let pos = 0;
  while ((pos = xml.indexOf(tgt, pos)) !== -1) {
    count++;
    pos += tgt.length;
  }
  console.log(`${tgt}: ${count} occurrences`);
}
