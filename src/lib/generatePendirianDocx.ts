import JSZip from "jszip";
import { saveAs } from "file-saver";

// =====================================================================================
// NEW CLEAN IMPLEMENTATION - Akta Pendirian PT DOCX Generator
// Rebuilt from scratch following strict requirements:
// - Clone paragraphs from master template only
// - Preserve ALL original XML structures (styles, numbering, fonts, tabs, indents, sectPr)
// - Only modify text content inside <w:t> nodes
// - Use existing numId / abstractNumId from word/numbering.xml
// - No docx.js, no officegen, no manual paragraph creation from scratch
// =====================================================================================

import { generatePendirianBlocks } from "./pendirianContentBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// -------------------------------------------------------------------------------------
// XML Helper Functions (namespace aware)
// -------------------------------------------------------------------------------------
function getElements(parent: Element | Document, localName: string): Element[] {
  if (!parent) return [];
  if (parent.getElementsByTagNameNS) {
    const res = parent.getElementsByTagNameNS(W_NS, localName);
    if (res && res.length > 0) return Array.from(res) as Element[];
  }
  // Fallback for parsers that don't support getElementsByTagNameNS well
  return Array.from(parent.getElementsByTagName(`w:${localName}`)) as Element[];
}

function getSingleElement(parent: Element | Document, localName: string): Element | null {
  const list = getElements(parent, localName);
  return list.length > 0 ? list[0] : null;
}

function removeAllChildren(element: Element): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// -------------------------------------------------------------------------------------
// EXEMPLAR MAPPING
// These indices point to specific paragraphs in the MASTER template (PT. pendirian.docx)
// that have the exact desired formatting, numbering definition, tab stops, indents,
// alignment, fonts (Century Gothic 10pt), bold runs, etc.
// 
// DO NOT CHANGE THESE INDICES unless the master template changes.
// -------------------------------------------------------------------------------------
const EXEMPLAR = {
  // Title block (centered, bold, large)
  TITLE_CENTER: 0,                    // "PENDIRIAN PERSEROAN TERBATAS"
  PT_NAME_CENTER: 1,                  // "PT. GEMURUH MAJU MAKMUR"
  NOMOR: 2,                           // "Nomor : 10"

  // Normal body text
  NORMAL_P: 4,                        // "Pada hari ini, ..."

  // Empty spacing paragraph
  BR: 3,

  // Section divider (tab + BOLD UPPERCASE + tab)
  DIVIDER: 14,                        // " NAMA DAN TEMPAT KEDUDUKAN "

  // PASAL header (similar to divider but shorter)
  PASAL_HEADER: 15,                   // "PASAL 1"

  // Numbered list item (decimal) - first pendiri example
  NUMBERED: 7,                        // "Tuan VICTORY HENDRIO, lahir di..."

  // Sub-numbered / lettered list (a. b. c.)
  SUB_NUMBERED: 146,                  // "a. Nama dan alamat pemegang saham;"

  // Bullet list (for KBLI categories and items)
  BULLET_LIST: 129,                   // Inside RUPS section

  // Management role line (Direktur / Komisaris)
  MANAGEMENT_ROLE: 351,               // "Direktur: Tuan VICTORY HENDRIO, tersebut di atas;"

  // Saksi (witness) numbered item
  SAKSI: 360,                         // "Nendi Suhendi, lahir di Bandung..."

  // KBLI description paragraph (indented)
  KBLI_DESC: 35,

  // "Diberikan sebagai salinan..." note (indented)
  COPY_NOTE: 356,

  // Notaris location (right-center)
  NOTARIS_LOCATION: 374,              // "Notaris di Kabupaten Bandung Barat;"

  // Notaris name (right-center, bold)
  NOTARIS_NAME: 378,                  // "NUKANTINI PUTRI PARINCHA, SH., M.Kn."
};

// -------------------------------------------------------------------------------------
// Determine which exemplar paragraph to clone for a given logical block
// -------------------------------------------------------------------------------------
function getExemplarIndex(block: any): number {
  switch (block.type) {
    case "p":
      if (block.align === "center") return EXEMPLAR.TITLE_CENTER;
      if (block.align === "right-center") {
        const text = block.runs?.map((r: any) => r.text || "").join("") || "";
        if (text.includes("NUKANTINI") || block.runs?.some((r: any) => r.bold)) {
          return EXEMPLAR.NOTARIS_NAME;
        }
        return EXEMPLAR.NOTARIS_LOCATION;
      }
      if (block.kbliDesc) return EXEMPLAR.KBLI_DESC;
      if (block.indentTabs === 2) return EXEMPLAR.COPY_NOTE;
      if (block.indentTabs === 1) return EXEMPLAR.KBLI_DESC; // fallback
      return EXEMPLAR.NORMAL_P;

    case "br":
      return EXEMPLAR.BR;

    case "divider":
    case "pasal-divider":
      // Both use similar tab + bold uppercase style
      return EXEMPLAR.DIVIDER;

    case "numbered":
      return EXEMPLAR.NUMBERED;

    case "sub-numbered":
      return EXEMPLAR.SUB_NUMBERED;

    case "list":
      return EXEMPLAR.BULLET_LIST;

    case "management-role":
      return EXEMPLAR.MANAGEMENT_ROLE;

    case "saksi":
      return EXEMPLAR.SAKSI;

    default:
      return EXEMPLAR.NORMAL_P;
  }
}

// -------------------------------------------------------------------------------------
// Adjust numbering properties on cloned paragraph
// We reuse existing numId values from the template's word/numbering.xml
// Different numId values allow independent restarting of numbering sequences.
// -------------------------------------------------------------------------------------
function adjustNumbering(clonedP: Element, block: any, currentNumId: string): void {
  const isNumbered = ["numbered", "sub-numbered", "list", "saksi"].includes(block.type);
  if (!isNumbered) {
    // Remove any existing numPr so it becomes normal paragraph
    const pPr = getSingleElement(clonedP, "pPr");
    if (pPr) {
      const numPr = getSingleElement(pPr, "numPr");
      if (numPr) pPr.removeChild(numPr);
    }
    return;
  }

  // Ensure pPr exists
  let pPr = getSingleElement(clonedP, "pPr");
  if (!pPr) {
    pPr = clonedP.ownerDocument.createElementNS(W_NS, "w:pPr");
    clonedP.insertBefore(pPr, clonedP.firstChild);
  }

  // Ensure numPr exists
  let numPr = getSingleElement(pPr, "numPr");
  if (!numPr) {
    numPr = clonedP.ownerDocument.createElementNS(W_NS, "w:numPr");
    pPr.appendChild(numPr);
  }

  // Set numId
  let numIdEl = getSingleElement(numPr, "numId");
  if (!numIdEl) {
    numIdEl = clonedP.ownerDocument.createElementNS(W_NS, "w:numId");
    numPr.appendChild(numIdEl);
  }
  numIdEl.setAttribute("w:val", block._numId || currentNumId || "7");

  // Set ilvl
  let ilvlEl = getSingleElement(numPr, "ilvl");
  if (!ilvlEl) {
    ilvlEl = clonedP.ownerDocument.createElementNS(W_NS, "w:ilvl");
    numPr.appendChild(ilvlEl);
  }

  if (block.type === "sub-numbered" || (block.type === "list" && (block.indentTabs || 0) > 0)) {
    ilvlEl.setAttribute("w:val", "1");
  } else {
    ilvlEl.setAttribute("w:val", "0");
  }
}

// -------------------------------------------------------------------------------------
// Populate / replace text inside the cloned paragraph
// Strategy:
// - Take the FIRST existing <w:r> as style template (it has correct rFonts, sz, rPr)
// - Remove ALL existing <w:r> elements
// - Rebuild runs according to block.runs (supporting per-run bold flag)
// - Handle \t by inserting <w:tab> elements between text parts
// - Add trailing <w:tab> for most paragraph types (matches original template behavior)
// -------------------------------------------------------------------------------------
function populateRuns(
  xmlDoc: Document,
  pNode: Element,
  block: any
): void {
  // Find a good run template (first run that has rPr or t)
  const existingRuns = getElements(pNode, "r");
  let runTemplate: Element | null = null;

  if (existingRuns.length > 0) {
    runTemplate = existingRuns[0].cloneNode(true) as Element;
  } else {
    // Fallback minimal run (should rarely happen)
    const fallbackXml = 
      `<w:r xmlns:w="${W_NS}"><w:rPr><w:rFonts w:ascii="Century Gothic" w:hAnsi="Century Gothic"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve"/></w:r>`;
    const tmpDoc = new DOMParser().parseFromString(fallbackXml, "application/xml");
    runTemplate = tmpDoc.documentElement.cloneNode(true) as Element;
  }

  // Remove all existing runs
  const childNodes = Array.from(pNode.childNodes);
  for (const child of childNodes) {
    if (child.nodeType === 1) {
      const el = child as Element;
      const local = el.localName || el.tagName.replace(/^w:/, "");
      if (local === "r") {
        pNode.removeChild(el);
      }
    }
  }

  if (block.type === "br") {
    // Keep paragraph empty for spacing
    return;
  }

  // Determine logical runs for this block
  let logicalRuns: { text: string; bold?: boolean }[] = [];

  if (block.type === "management-role") {
    logicalRuns = [{ text: `${block.position}: ${block.nameText};` }];
  } else if (block.type === "divider" || block.type === "pasal-divider") {
    const displayText = block.type === "pasal-divider" 
      ? block.text 
      : block.text.toUpperCase();
    logicalRuns = [
      { text: "\t" },
      { text: ` ${displayText} `, bold: true },
      { text: "\t" }
    ];
  } else if (block.runs && block.runs.length > 0) {
    logicalRuns = block.runs;
  } else {
    logicalRuns = [{ text: block.text || "" }];
  }

  // Rebuild runs
  for (const logicalRun of logicalRuns) {
    const rawText = logicalRun.text || "";
    const shouldBold = !!logicalRun.bold;

    // Split by tab to support mixed tab + text in one logical run
    const parts = rawText.split("\t");

    for (let i = 0; i < parts.length; i++) {
      // Insert tab element between parts
      if (i > 0) {
        const tabRun = xmlDoc.createElementNS(W_NS, "w:r");
        const rPr = getSingleElement(runTemplate, "rPr");
        if (rPr) {
          tabRun.appendChild(rPr.cloneNode(true));
        }
        tabRun.appendChild(xmlDoc.createElementNS(W_NS, "w:tab"));
        pNode.appendChild(tabRun);
      }

      const partText = parts[i];
      if (!partText) continue;

      // Clone the run template
      const newRun = runTemplate.cloneNode(true) as Element;

      // Apply bold if needed
      const rPr = getSingleElement(newRun, "rPr");
      if (rPr) {
        const hasB = getSingleElement(rPr, "b");
        const hasBCs = getSingleElement(rPr, "bCs");

        if (shouldBold) {
          if (!hasB) {
            const b = xmlDoc.createElementNS(W_NS, "w:b");
            rPr.appendChild(b);
          }
          if (!hasBCs) {
            const bCs = xmlDoc.createElementNS(W_NS, "w:bCs");
            rPr.appendChild(bCs);
          }
        } else {
          if (hasB) rPr.removeChild(hasB);
          if (hasBCs) rPr.removeChild(hasBCs);
        }
      }

      // Set text
      let tNode = getSingleElement(newRun, "t");
      if (!tNode) {
        tNode = xmlDoc.createElementNS(W_NS, "w:t");
        newRun.appendChild(tNode);
      }
      tNode.setAttribute("xml:space", "preserve");
      tNode.textContent = partText;

      pNode.appendChild(newRun);
    }
  }

  // Add trailing tab for paragraphs that need it (matches original template layout)
  const needsTrailingTab =
    (block.type === "p" && block.align !== "center") ||
    block.type === "numbered" ||
    block.type === "sub-numbered" ||
    block.type === "list" ||
    block.type === "saksi" ||
    block.type === "management-role";

  if (needsTrailingTab) {
    const trailing = xmlDoc.createElementNS(W_NS, "w:r");
    const rPr = getSingleElement(runTemplate, "rPr");
    if (rPr) {
      trailing.appendChild(rPr.cloneNode(true));
    }
    trailing.appendChild(xmlDoc.createElementNS(W_NS, "w:tab"));
    pNode.appendChild(trailing);
  }
}

// -------------------------------------------------------------------------------------
// Main export
// -------------------------------------------------------------------------------------
export const generatePendirianDocx = async (data: any): Promise<void> => {
  if (!data) {
    throw new Error("Data pendirian tidak boleh kosong");
  }

  // 1. Fetch master template (served from /api/template-pendirian or local for testing)
  const response = await fetch("/api/template-pendirian");
  if (!response.ok) {
    throw new Error(`Gagal memuat template master: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  // 2. Load as ZIP
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 3. Extract document.xml
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Template tidak valid: word/document.xml tidak ditemukan");
  }
  const originalXml = await docXmlFile.async("text");

  // 4. Parse
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(originalXml, "application/xml");

  const body = getSingleElement(xmlDoc, "body");
  if (!body) {
    throw new Error("Template tidak valid: <w:body> tidak ditemukan");
  }

  // Preserve sectPr (page setup, margins, headers/footers)
  const sectPr = getSingleElement(body, "sectPr");
  const sectPrClone = sectPr ? (sectPr.cloneNode(true) as Element) : null;

  // Get all original paragraphs (these are our style exemplars)
  const originalParagraphs = getElements(body, "p");
  if (originalParagraphs.length < 380) {
    console.warn(`Template hanya memiliki ${originalParagraphs.length} paragraf (diharapkan ~381)`);
  }

  // Clear body
  removeAllChildren(body);

  // 5. Generate logical blocks + preprocess (for bullet splitting)
  const rawBlocks = generatePendirianBlocks(data);
  const preprocessedBlocks = preprocessBlocksForWordBullets(rawBlocks);

  // 6. Assign numId values for independent numbered lists
  // We cycle through a pool of decimal numIds defined in the template's numbering.xml
  const DECIMAL_NUM_ID_POOL = [
    "7", "27", "34", "18", "23", "6", "12", "25", "15", "19",
    "9", "3", "28", "4", "8", "22", "2", "11", "13", "26",
    "16", "1", "46", "20"
  ];

  let poolIndex = -1;
  let activeNumId = "7";

  const blocksWithNum = preprocessedBlocks.map((block: any) => {
    if (block.type === "numbered") {
      if (block.num === 1 || block.num === "1") {
        poolIndex = (poolIndex + 1) % DECIMAL_NUM_ID_POOL.length;
        activeNumId = DECIMAL_NUM_ID_POOL[poolIndex];
      }
      return { ...block, _numId: activeNumId };
    }
    if (block.type === "sub-numbered") {
      return { ...block, _numId: activeNumId };
    }
    if (block.type === "list") {
      return { ...block, _numId: "5" }; // bullet numId from template
    }
    if (block.type === "saksi") {
      return { ...block, _numId: "14" }; // saksi numId from template
    }
    return block;
  });

  // 7. Clone + populate each block
  for (const block of blocksWithNum) {
    const exemplarIdx = getExemplarIndex(block);
    const exemplar = originalParagraphs[exemplarIdx];

    if (!exemplar) {
      console.warn(`Exemplar index ${exemplarIdx} tidak ditemukan untuk block type=${block.type}`);
      continue;
    }

    // Deep clone the entire paragraph (preserves ALL pPr, rPr, tabs, indents, etc.)
    const cloned = exemplar.cloneNode(true) as Element;

    // Adjust numbering if this is a list item
    adjustNumbering(cloned, block, activeNumId);

    // Replace text content while preserving formatting
    populateRuns(xmlDoc, cloned, block);

    // Append to body
    body.appendChild(cloned);
  }

  // 8. Restore sectPr at the very end of body (required by OOXML spec)
  if (sectPrClone) {
    body.appendChild(sectPrClone);
  }

  // 9. Serialize back
  const serializer = new XMLSerializer();
  let finalXml = serializer.serializeToString(xmlDoc);

  // Ensure proper XML declaration (some parsers drop it)
  if (!finalXml.startsWith("<?xml")) {
    finalXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + finalXml;
  }

  zip.file("word/document.xml", finalXml);

  // 10. Generate and download
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const safeName = data?.namaPt
    ? String(data.namaPt).replace(/^PT\.?\s*/i, "").trim().replace(/\s+/g, "_")
    : "Draft";

  saveAs(blob, `Akta_Pendirian_${safeName}.docx`);
};
