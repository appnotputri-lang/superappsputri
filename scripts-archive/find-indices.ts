import fs from 'fs';

const content = fs.readFileSync('all_paragraphs.txt', 'utf8');
const paragraphs = content.split('\n\n').map(p => {
  const idxMatch = p.match(/^Index: (\d+)/);
  const textMatch = p.match(/Text: "([^"]*)"/);
  const pPrMatch = p.match(/pPr: (.*)/);
  return {
    idx: idxMatch ? parseInt(idxMatch[1]) : -1,
    text: textMatch ? textMatch[1] : '',
    pPr: pPrMatch ? pPrMatch[1] : '',
    raw: p
  };
}).filter(p => p.idx !== -1);

console.log(`Loaded ${paragraphs.length} paragraphs.\n`);

const findExactOne = (label: string, query: string, filter?: (p: any) => boolean) => {
  const matches = paragraphs.filter(p => {
    const textMatch = p.text.toLowerCase().includes(query.toLowerCase());
    if (!textMatch) return false;
    if (filter) return filter(p);
    return true;
  });
  console.log(`=== Matches for ${label} (Query: "${query}") ===`);
  matches.forEach(m => {
    console.log(`Index ${m.idx}: "${m.text}"`);
    console.log(`  pPr: ${m.pPr}\n`);
  });
};

// 1. Divider can be "NAMA DAN TEMPAT KEDUDUKAN" or "MODAL" or "PENGURUSAN"
findExactOne("DIVIDER", "NAMA DAN TEMPAT KEDUDUKAN");

// 2. Pasal Header
findExactOne("PASAL_HEADER", "PASAL 1");

// 3. Numbered
findExactOne("NUMBERED (Victory)", "VICTORY HENDRIO", p => p.idx < 50);

// 4. Sub-numbered (Check list paragraphs with letter a., b. etc.)
findExactOne("SUB_NUMBERED (capital letter / lower letter list)", "a. Nama dan alamat pemegang saham");
findExactOne("SUB_NUMBERED or letter list inside doc", "a. ", p => p.text.trim().startsWith("a.") && p.pPr.includes("numId"));

// 5. Bullet list in RUPS / KBLI
findExactOne("BULLET_LIST", "Perdagangan;", p => p.pPr.includes("numId"));

// 6. Management role
findExactOne("MANAGEMENT_ROLE (e.g. Direktur)", "Direktur : Tuan");
findExactOne("MANAGEMENT_ROLE general search", "Direktur :", p => p.text.includes("tersebut di atas"));
findExactOne("MANAGEMENT_ROLE general search 2", "Komisaris :", p => p.text.includes("tersebut di atas"));

// 7. Saksi
findExactOne("SAKSI (Nendi Suhendi)", "Nendi Suhendi");

// 8. KBLI Desc
findExactOne("KBLI_DESC (Kelompok ini)", "Kelompok ini mencakup");

// 9. Copy Note
findExactOne("COPY_NOTE (Diberikan sebagai)", "Diberikan sebagai salinan");

// 10. Notaris Location
findExactOne("NOTARIS_LOCATION (Notaris di)", "Notaris di Kabupaten");

// 11. Notaris Name
findExactOne("NOTARIS_NAME", "NUKANTINI");
