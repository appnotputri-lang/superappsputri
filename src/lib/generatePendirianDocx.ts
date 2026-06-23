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
import { FormatToken, parseTextRuns } from "./notaryWrapper";

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

function replaceTextInNode(node: Node, search: string, replacement: string): void {
  if (node.nodeType === 3) { // Text node
    if (node.nodeValue?.includes(search)) {
      node.nodeValue = node.nodeValue.replaceAll(search, replacement);
    }
  } else if (node.nodeType === 1) { // Element node
    const el = node as Element;
    if (el.localName === "t" || el.tagName.replace(/^w:/, "") === "t") {
      if (el.textContent?.includes(search)) {
        el.textContent = el.textContent.replaceAll(search, replacement);
      }
    } else {
      for (const child of Array.from(el.childNodes)) {
        replaceTextInNode(child, search, replacement);
      }
    }
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
  DIVIDER: 11,                        // " NAMA DAN TEMPAT KEDUDUKAN " (Index 11 in new template)

  // PASAL header (similar to divider but shorter)
  PASAL_HEADER: 12,                   // "PASAL 1" (Index 12 in new template)

  // Numbered list item (decimal) - first pendiri example
  NUMBERED: 7,                        // "Tuan VICTORY HENDRIO, lahir di..." (Index 7)

  // Sub-numbered / lettered list (a. b. c.)
  SUB_NUMBERED: 46,                  // "Nama dan alamat pemegang saham;" (Index 46 in new template)

  // Bullet list (for KBLI categories and items)
  BULLET_LIST: 23,                   // Inside RUPS section (Index 23 in new template)

  // Management role line (Direktur / Komisaris)
  MANAGEMENT_ROLE: 217,               // "Direktur: Tuan VICTORY HENDRIO, tersebut di atas;" (Index 217 in new template)

  // Saksi (witness) numbered item
  SAKSI: 224,                         // "Nendi Suhendi, lahir di Bandung..." (Index 224 in new template)

  // KBLI description paragraph (indented)
  KBLI_DESC: 28,                      // (Index 28 in new template)

  // "Diberikan sebagai salinan..." note (indented)
  COPY_NOTE: 231,                     // (Index 231 in new template)

  // Notaris location (right-center)
  NOTARIS_LOCATION: 232,              // "Notaris di Kabupaten Bandung Barat;" (Index 232 in new template)

  // Notaris name (right-center, bold)
  NOTARIS_NAME: 236,                  // "NUKANTINI PUTRI PARINCHA, SH., M.Kn." (Index 236 in new template)
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
// Helper to insert <w:tabs> in the correct order inside <w:pPr> (OOXML schema-compliant)
// -------------------------------------------------------------------------------------
function insertTabsInOrder(pPr: Element, tabs: Element): void {
  // Elements that must come AFTER w:tabs inside w:pPr
  const afterTags = ["spacing", "ind", "contextualSpacing", "mirrorIndents", "shd", "rPr"];
  let insertBeforeNode: Node | null = null;
  
  for (const child of Array.from(pPr.childNodes)) {
    if (child.nodeType === 1) {
      const el = child as Element;
      const localName = el.localName || el.tagName.replace(/^w:/, "");
      if (afterTags.includes(localName)) {
        insertBeforeNode = child;
        break;
      }
    }
  }
  
  if (insertBeforeNode) {
    pPr.insertBefore(tabs, insertBeforeNode);
  } else {
    pPr.appendChild(tabs);
  }
}

// -------------------------------------------------------------------------------------
// Get exact tab stop position for custom divider titles based on physical template sizes
// -------------------------------------------------------------------------------------
function getDividerTabPos(text: string): number {
  const normalized = text.trim().toUpperCase().replace(/\s+/g, " ");
  
  const exactMap: Record<string, number> = {
    "NAMA DAN TEMPAT KEDUDUKAN": 2268,
    "PASAL 1": 3402,
    "JANGKA WAKTU BERDIRINYA PERSEROAN": 2268,
    "PASAL 2": 3402,
    "MAKSUD DAN TUJUAN SERTA KEGIATAN USAHA": 1985,
    "PASAL 3": 3402,
    "M O D A L": 3402,
    "PASAL 4": 3402,
    "S A H A M": 3402,
    "PASAL 5": 3402,
    "PENGGANTI SURAT SAHAM": 2268,
    "PASAL 6": 3402,
    "PEMINDAHAN HAK ATAS SAHAM": 1985,
    "PASAL 7": 3119,
    "RAPAT UMUM PEMEGANG SAHAM": 1985,
    "PASAL 8": 3119,
    "TEMPAT, PEMANGGILAN DAN PIMPINAN RAPAT UMUM": 1701,
    "PEMEGANG SAHAM": 2835,
    "PASAL 9": 3402,
    "KUORUM, HAK SUARA, DAN KEPUTUSAN RAPAT UMUM": 1276,
    "PASAL10": 3402,
    "D I R E K S I": 3402,
    "PASAL 11": 3402,
    "TUGAS DAN WEWENANG DIREKSI": 1843,
    "PASAL 12": 3119,
    "RAPAT DIREKSI": 3119,
    "PASAL 13": 3402,
    "DEWAN KOMISARIS": 2835,
    "PASAL 14": 3402,
    "TUGAS DAN WEWENANG DEWAN KOMISARIS": 1843,
    "PASAL 15": 3402,
    "RAPAT DEWAN KOMISARIS": 2835,
    "PASAL 16": 3544,
    "RENCANA KERJA, TAHUN BUKU DAN LAPORAN TAHUNAN": 1710,
    "PASAL 17": 3686,
    "PENGGUNAAN LABA DAN PEMBAGIAN DEVIDEN": 1843,
    "PASAL 18": 3402,
    "PENGGUNAAN CADANGAN": 2268,
    "PASAL 19": 3119,
    "KETENTUAN PENUTUP": 2835,
    "PASAL 20": 3402,
    "DEMIKIANLAH AKTA INI": 3119
  };

  if (exactMap[normalized] !== undefined) {
    return exactMap[normalized];
  }

  // Fallback calculation based on string length to dynamically keep it centered
  const len = normalized.length;
  if (len < 10) return 3402;
  if (len < 16) return 2835;
  if (len < 34) return 2268;
  if (len < 40) return 1985;
  return 1276;
}

// -------------------------------------------------------------------------------------
// Adjust custom tab stops for divider title paragraphs (Tab 1 centers the title, Tab 2 goes to the margin)
// -------------------------------------------------------------------------------------
function adjustDividerTabStops(clonedP: Element, text: string): void {
  let pPr = getSingleElement(clonedP, "pPr");
  if (!pPr) {
    pPr = clonedP.ownerDocument.createElementNS(W_NS, "w:pPr");
    clonedP.insertBefore(pPr, clonedP.firstChild);
  }

  // Remove existing tabs to reconstruct clean, schema-compliant tab stops
  const existingTabs = getSingleElement(pPr, "tabs");
  if (existingTabs) {
    pPr.removeChild(existingTabs);
  }

  const tabs = clonedP.ownerDocument.createElementNS(W_NS, "w:tabs");
  
  // Tab 1: Left-aligned at calculated centering position, draws hyphens
  const pos1 = getDividerTabPos(text);
  const tab1 = clonedP.ownerDocument.createElementNS(W_NS, "w:tab");
  tab1.setAttribute("w:val", "left");
  tab1.setAttribute("w:leader", "hyphen");
  tab1.setAttribute("w:pos", pos1.toString());
  tabs.appendChild(tab1);

  // Tab 2: Left-aligned at 8364, draws hyphens to exact right margin boundary
  const tab2 = clonedP.ownerDocument.createElementNS(W_NS, "w:tab");
  tab2.setAttribute("w:val", "left");
  tab2.setAttribute("w:leader", "hyphen");
  tab2.setAttribute("w:pos", "8364");
  tabs.appendChild(tab2);
  
  insertTabsInOrder(pPr, tabs);
}

// -------------------------------------------------------------------------------------
// Ensure tab stops exist and have hyphen leader on normal body paragraphs
// -------------------------------------------------------------------------------------
function adjustTabStops(clonedP: Element): void {
  let pPr = getSingleElement(clonedP, "pPr");
  if (!pPr) {
    pPr = clonedP.ownerDocument.createElementNS(W_NS, "w:pPr");
    clonedP.insertBefore(pPr, clonedP.firstChild);
  }

  // Remove existing tabs to reconstruct clean, schema-compliant tab stops
  const existingTabs = getSingleElement(pPr, "tabs");
  if (existingTabs) {
    pPr.removeChild(existingTabs);
  }

  const tabs = clonedP.ownerDocument.createElementNS(W_NS, "w:tabs");
  
  // Single left-aligned tab stop at 8364 (exact left tab stop alignment from the original notary PT. pendirian template)
  const tab = clonedP.ownerDocument.createElementNS(W_NS, "w:tab");
  tab.setAttribute("w:val", "left");
  tab.setAttribute("w:leader", "hyphen");
  tab.setAttribute("w:pos", "8364");
  
  tabs.appendChild(tab);
  
  insertTabsInOrder(pPr, tabs);
}

// -------------------------------------------------------------------------------------
// -------------------------------------------------------------------------------------
// Determine the appropriate wrapping printable character width for each block type
// -------------------------------------------------------------------------------------
function getMaxWidthForBlock(block: any): number {
  switch (block.type) {
    case "p":
      if (block.align === "center" || block.align === "right-center") return 100;
      if (block.kbliDesc) return 36.5;
      if (block.indentTabs === 2) return 33.0;
      if (block.indentTabs === 1) return 36.5;
      return 41.5;
    case "numbered":
      return 38.0;
    case "sub-numbered":
      return 36.0;
    case "list":
      return 38.0;
    case "management-role":
      return 38.0;
    case "saksi":
      return 38.0;
    default:
      return 41.5;
  }
}

// -------------------------------------------------------------------------------------
// Populate / replace text inside the cloned paragraph
// Strategy:
// - Take the FIRST existing <w:r> as style template (it has correct rFonts, sz, rPr)
// - Remove ALL existing <w:r> elements
// - Rebuild runs according to block.runs, utilizing parseTextRuns for programmatic wrapping
// - For paragraphs requiring trailing tabs, wrap lines at maxWidth and append <w:tab/> on every line
// - Put a soft line break <w:br/> between wrapped lines
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
    // Clean it up: keep only w:rPr, discard any other children (like w:t, w:tab, w:br)
    const rPr = getSingleElement(runTemplate, "rPr");
    removeAllChildren(runTemplate);
    if (rPr) {
      runTemplate.appendChild(rPr);
    }
    // Create an empty fresh w:t element on it
    const t = xmlDoc.createElementNS(W_NS, "w:t");
    t.setAttribute("xml:space", "preserve");
    runTemplate.appendChild(t);
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

  const needsTrailingTab =
    (block.type === "p" && block.align !== "center") ||
    block.type === "numbered" ||
    block.type === "sub-numbered" ||
    block.type === "list" ||
    block.type === "saksi" ||
    block.type === "management-role";

  if (needsTrailingTab) {
    // Perform programmatic wrapping and add trailing tab lines to each line
    const tokens: FormatToken[] = logicalRuns.map(run => ({
      text: run.text || "",
      bold: !!run.bold
    }));

    const maxWidth = getMaxWidthForBlock(block);
    const lines = parseTextRuns(tokens, maxWidth);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineTokens = lines[lineIdx];

      for (const token of lineTokens) {
        const newRun = runTemplate.cloneNode(true) as Element;

        // Apply bold properties if the token is bold
        const rPr = getSingleElement(newRun, "rPr");
        if (rPr) {
          const hasB = getSingleElement(rPr, "b");
          const hasBCs = getSingleElement(rPr, "bCs");

          if (token.bold) {
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

        let tNode = getSingleElement(newRun, "t");
        if (!tNode) {
          tNode = xmlDoc.createElementNS(W_NS, "w:t");
          newRun.appendChild(tNode);
        }
        tNode.setAttribute("xml:space", "preserve");
        tNode.textContent = token.text;

        pNode.appendChild(newRun);
      }

      // Append tab stop character to fill the line up to the right margin
      const tabRun = xmlDoc.createElementNS(W_NS, "w:r");
      const rPrTab = getSingleElement(runTemplate, "rPr");
      if (rPrTab) {
        tabRun.appendChild(rPrTab.cloneNode(true));
      }
      tabRun.appendChild(xmlDoc.createElementNS(W_NS, "w:tab"));
      pNode.appendChild(tabRun);

      // Append a soft carriage return/break if there are more lines remaining
      if (lineIdx < lines.length - 1) {
        const brRun = xmlDoc.createElementNS(W_NS, "w:r");
        const rPrBr = getSingleElement(runTemplate, "rPr");
        if (rPrBr) {
          brRun.appendChild(rPrBr.cloneNode(true));
        }
        brRun.appendChild(xmlDoc.createElementNS(W_NS, "w:br"));
        pNode.appendChild(brRun);
      }
    }
  } else {
    // Non-wrapping pathways (e.g. divider, centered title)
    for (const logicalRun of logicalRuns) {
      const rawText = logicalRun.text || "";
      const shouldBold = !!logicalRun.bold;

      const parts = rawText.split("\t");

      for (let i = 0; i < parts.length; i++) {
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

        const newRun = runTemplate.cloneNode(true) as Element;

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
  const xmlDoc = parser.parseFromString(originalXml, "text/xml");

  // Check for parser errors (browsers return a document with <parsererror>)
  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    console.error("DOMParser Error:", parseError[0].textContent);
    throw new Error("Gagal mengurai XML template: " + parseError[0].textContent);
  }

  const body = getSingleElement(xmlDoc, "body");
  if (!body) {
    throw new Error("Template tidak valid: <w:body> tidak ditemukan");
  }

  // Preserve sectPr (page setup, margins, headers/footers)
  const sectPr = getSingleElement(body, "sectPr");
  const sectPrClone = sectPr ? (sectPr.cloneNode(true) as Element) : null;

  if (sectPrClone) {
    // Tiru page size dan margin agar identik dengan template PT. pendirian asli:
    // Page size: width = 11906, height = 16838 (A4)
    // Margins dari template master asli: top = 1418, bottom = 1418, left = 2268, right = 1134
    let pgSz = getSingleElement(sectPrClone, "pgSz");
    if (!pgSz) {
      pgSz = sectPrClone.ownerDocument.createElementNS(W_NS, "w:pgSz");
      sectPrClone.appendChild(pgSz);
    }
    pgSz.setAttribute("w:w", "11906");
    pgSz.setAttribute("w:h", "16838");
    pgSz.setAttribute("w:code", "9");

    let pgMar = getSingleElement(sectPrClone, "pgMar");
    if (!pgMar) {
      pgMar = sectPrClone.ownerDocument.createElementNS(W_NS, "w:pgMar");
      sectPrClone.appendChild(pgMar);
    }
    pgMar.setAttribute("w:top", "1418");
    pgMar.setAttribute("w:bottom", "1418");
    pgMar.setAttribute("w:left", "2268");
    pgMar.setAttribute("w:right", "1134");
    pgMar.setAttribute("w:header", "720");
    pgMar.setAttribute("w:footer", "578");
    pgMar.setAttribute("w:gutter", "0");
  }

  // Preserve any tables (e.g. signature blocks table at the end of DRAFT PENDIRIAN PT.docx)
  const tables = getElements(body, "tbl");
  const tablesClone = tables.map(t => t.cloneNode(true) as Element);

  // Get all original paragraphs (these are our style exemplars)
  const originalParagraphs = getElements(body, "p");
  if (originalParagraphs.length < 230) {
    console.warn(`Template hanya memiliki ${originalParagraphs.length} paragraf (diharapkan ~239)`);
  }

  // Clear body
  removeAllChildren(body);

  // 5. Generate logical blocks + preprocess (for bullet splitting)
  const rawBlocks = generatePendirianBlocks(data);
  const preprocessedBlocks = preprocessBlocksForWordBullets(rawBlocks);

  // 6. Assign numId values for independent numbered lists
  // We cycle through a pool of decimal-at-lvl0, lowerLetter-at-lvl1 numIds defined in the template's numbering.xml
  const DECIMAL_NUM_ID_POOL = [
    "3", "4", "6", "7", "9", "12", "13", "16", "18", "26", "27", "29", "30", "34", "37", "46"
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

    const needsTrailingTab =
      (block.type === "p" && block.align !== "center") ||
      block.type === "numbered" ||
      block.type === "sub-numbered" ||
      block.type === "list" ||
      block.type === "saksi" ||
      block.type === "management-role";

    if (needsTrailingTab) {
      adjustTabStops(cloned);
    }

    if (block.type === "divider" || block.type === "pasal-divider") {
      adjustDividerTabStops(cloned, block.text);
    }

    // Replace text content while preserving formatting
    populateRuns(xmlDoc, cloned, block);

    // Append to body
    body.appendChild(cloned);
  }

  // 7.5. Append preserved and updated tables back to the end of the body
  for (const tbl of tablesClone) {
    if (data.notarisNamaSurat) {
      replaceTextInNode(tbl, "NUKANTINI PUTRI PARINCHA, SH., M.Kn.", data.notarisNamaSurat);
    }
    if (data.notarisTempat) {
      replaceTextInNode(tbl, "Kabupaten Bandung Barat", data.notarisTempat);
    }
    body.appendChild(tbl);
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
