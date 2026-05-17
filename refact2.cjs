const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

// The block to copy starts at `1332: {/* JENIS NOTULEN */}` and ends at `2061: </div>` (inclusive).
// Wait, actually I can just extract using regex or split. Let's find exact indices.

const str1 = '{/* JENIS NOTULEN */}';
const str2 = '           </div>\n          )}'; // End of the fallback block

const startIndex = content.indexOf(str1);
// Wait, the fallback block ends at `<div className="space-y-6 pb-12"> ... </div>` and then `</div>` and then `)}`. Let's find exactly `          </div>\n          )}`.
let endIndex = content.indexOf('          </div>\n          )}', startIndex);
if (endIndex === -1) {
  console.log("Could not find endIndex, let's use the other one");
  endIndex = content.indexOf('          )\n        </main>', startIndex); // This doesn't exist maybe
}

// Let's print out what we found
console.log('startIndex:', startIndex);
console.log('endIndex:', endIndex);

const notulenBlock = content.substring(startIndex, endIndex);

// We need to inject `notulenBlock` into the `editingProfileId` block, right after `{/* AKTA PERUBAHAN */}` finishes. 
// It ends around `Tambah Akta Perubahan (Opsional) ... </button> </div> </AhuSection>` then some divs.
// It's followed by:
/*
                  </div>

                  <div className="flex justify-end gap-2 bg-white p-4 shadow-sm border border-slate-200 rounded-sm">
                     <button onClick={async () => {
*/

const targetInjectStr = `                  </div>\n\n                  <div className="flex justify-end gap-2 bg-white p-4 shadow-sm border border-slate-200 rounded-sm">\n                     <button onClick={async () => {`;
const targetIndex = content.indexOf(targetInjectStr);

console.log('targetIndex:', targetIndex);

if (startIndex !== -1 && endIndex !== -1 && targetIndex !== -1) {
  // First, we remove the extracted block from its original location!
  // BUT the fallback still needs to be syntactically valid or we completely REPLACE the whole fallback logic!
  // Since we don't need the fallback logic or `perbaikan` or `draft_akta_rups` (wait, perbaikan is still wanted? Yes, perbaikan tab is still there).
  
} else {
  console.log('Not found');
}
