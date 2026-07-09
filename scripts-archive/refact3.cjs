const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

const startIndex = content.indexOf('{/* JENIS NOTULEN */}');
const endIndex = content.indexOf('          </div>\n          )}', startIndex);

// Exclude the PILIH PROFIL section
const pilihStart = content.indexOf('{/* DATA PERSEROAN (Pilihan dari Profil) */}', startIndex);
const pilihEnd = content.indexOf('{/* AGENDA PERUBAHAN */}', startIndex);
let notulenBlock = content.substring(startIndex, endIndex);
if (pilihStart !== -1 && pilihEnd !== -1) {
  const sectionToRemove = content.substring(pilihStart, pilihEnd);
  notulenBlock = notulenBlock.replace(sectionToRemove, '');
}

const targetInjectStr = `                  </div>\n\n                  <div className="flex justify-end gap-2 bg-white p-4 shadow-sm border border-slate-200 rounded-sm">`;
const targetIndex = content.indexOf(targetInjectStr);

const nextElseIndex = content.indexOf('              ) : (', targetIndex);
const blockToReplace = content.substring(targetIndex, nextElseIndex);

// Add the 2 ending divs back!
content = content.replace(blockToReplace, "\n" + notulenBlock + "\n                  </div>\n                </div>\n");

// Now remove the old fallback block
const fallbackStart = content.indexOf(") : activeSidebarTab === 'perbaikan' ? (");
let fallbackEnd = content.indexOf("          )}\n        </main>", fallbackStart);
if (fallbackEnd === -1) {
  fallbackEnd = content.indexOf("        </main>", fallbackStart);
}
// We want to replace everything from fallbackStart to just before `</main>` with the corrected perbaikan block.
const strToReplace2 = content.substring(fallbackStart, fallbackEnd);

let fallbackReplacement = `) : activeSidebarTab === 'perbaikan' ? (\n            <DataCorrectionLetter />\n          ) : null}\n`;

content = content.replace(strToReplace2, fallbackReplacement);

fs.writeFileSync('App.tsx', content);
