import JSZip from "jszip";
import { saveAs } from "file-saver";
import { CVProfile } from "../../types";
import { generatePendirianCVBlocks, Block } from "./cvContentBlocks";
import { preprocessBlocksForWordBullets, cleanCompanyName } from "./formatter";
import { mapCompanyProfileToCV } from "../domain/company/mappers/companyProfileToCV";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// -------------------------------------------------------------------------------------
// XML Helper Functions (namespace-aware)
// -------------------------------------------------------------------------------------
function getElements(parent: Element | Document, localName: string): Element[] {
  if (!parent) return [];
  if (parent.getElementsByTagNameNS) {
    const res = parent.getElementsByTagNameNS(W_NS, localName);
    if (res && res.length > 0) return Array.from(res) as Element[];
  }
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
  if (node.nodeType === 3) {
    if (node.nodeValue?.includes(search)) {
      node.nodeValue = node.nodeValue.replaceAll(search, replacement);
    }
  } else if (node.nodeType === 1) {
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
// DYNAMIC EXEMPLAR SEARCH FOR public/template_pendirian_cv.docx
// -------------------------------------------------------------------------------------
interface DynamicCVExemplars {
  titleCenter: Element;
  cvNameCenter: Element;
  nomor: Element;
  br: Element;
  normalP: Element;
  divider: Element;
  pasalHeader: Element;
  notarisLocation: Element;
  notarisName: Element;
  kbliDesc: Element;
}

function buildDynamicExemplars(paragraphs: Element[]): DynamicCVExemplars {
  function getJc(p: Element): string | null {
    const jc = getSingleElement(p, "jc");
    return jc ? jc.getAttribute("w:val") : null;
  }

  function hasTabLeader(p: Element): boolean {
    const tabs = getElements(p, "tab");
    return tabs.some((t) => t.getAttribute("w:leader") === "hyphen");
  }

  const fallback = paragraphs[0];

  const titleCenter =
    paragraphs.find((p) => getJc(p) === "center" && p.textContent?.includes("PENDIRIAN PERSEROAN")) ||
    fallback;
  const cvNameCenter =
    paragraphs.find(
      (p) => getJc(p) === "center" && (p.textContent?.includes("CV.") || p.textContent?.includes('"'))
    ) || paragraphs[1] || titleCenter;
  const nomor =
    paragraphs.find((p) => getJc(p) === "center" && p.textContent?.includes("Nomor")) ||
    paragraphs[2] ||
    titleCenter;
  const br =
    paragraphs.find((p) => !p.textContent || p.textContent.trim() === "") ||
    paragraphs[3] ||
    titleCenter;

  const divider =
    paragraphs.find(
      (p) =>
        hasTabLeader(p) &&
        (p.textContent?.includes("NAMA DAN TEMPAT") || p.textContent?.includes("M O D A L"))
    ) || titleCenter;
  const pasalHeader =
    paragraphs.find((p) => hasTabLeader(p) && p.textContent?.includes("PASAL 1")) || divider;

  const normalP =
    paragraphs.find(
      (p) => !getJc(p) && p.textContent?.includes("Pada hari ini")
    ) || paragraphs[4] || titleCenter;

  const notarisLocation =
    paragraphs.find((p) => p.textContent?.includes("Notaris di")) || titleCenter;
  const notarisName =
    paragraphs.find((p) => p.textContent?.includes("NUKANTINI")) || titleCenter;
  const kbliDesc =
    paragraphs.find((p) => p.textContent?.includes("Mencakup usaha") || p.textContent?.includes("perdagangan")) ||
    normalP;

  return {
    titleCenter,
    cvNameCenter,
    nomor,
    br,
    normalP,
    divider,
    pasalHeader,
    notarisLocation,
    notarisName,
    kbliDesc,
  };
}

function getExemplarNodeCV(exemplars: DynamicCVExemplars, block: Block): Element {
  switch (block.type) {
    case "p":
      if (block.align === "center") return exemplars.titleCenter;
      if (block.align === "right-center") {
        const text = block.runs?.map((r) => r.text || "").join("") || "";
        if (text.includes("NUKANTINI") || block.runs?.some((r) => r.bold)) {
          return exemplars.notarisName;
        }
        return exemplars.notarisLocation;
      }
      if (block.kbliDesc) return exemplars.kbliDesc;
      return exemplars.normalP;

    case "br":
      return exemplars.br;

    case "divider":
      return exemplars.divider;

    case "pasal-divider":
      return exemplars.pasalHeader;

    case "cv-name":
      return exemplars.cvNameCenter;

    case "numbered":
    case "sub-numbered":
    case "list":
    case "pesero-modal":
    case "pasal5-pengurus":
    case "pasal5-komanditer":
    case "saksi":
    default:
      return exemplars.normalP;
  }
}

// -------------------------------------------------------------------------------------
// ADJUST PARAGRAPH PROPERTIES (pPr)
// Ensures clean formatting, eliminates Word automatic numbering (numPr), and sets
// precise hanging indents, margins, spacing, and justification without artificial wrapping.
// -------------------------------------------------------------------------------------
function adjustBlockProperties(xmlDoc: Document, pNode: Element, block: Block): void {
  let pPr = getSingleElement(pNode, "pPr");
  if (!pPr) {
    pPr = xmlDoc.createElementNS(W_NS, "w:pPr");
    pNode.insertBefore(pPr, pNode.firstChild);
  }

  // 1. CRITICAL: Remove all automatic numbering to prevent double numbering (e.g. "3. 1.")
  const numPr = getSingleElement(pPr, "numPr");
  if (numPr) {
    pPr.removeChild(numPr);
  }

  // 2. Remove pStyle if it conflicts (e.g. ListParagraph)
  const pStyle = getSingleElement(pPr, "pStyle");
  if (pStyle) {
    const val = pStyle.getAttribute("w:val");
    if (val === "ListParagraph" || (val === "Heading1" && block.type !== "cv-name")) {
      pPr.removeChild(pStyle);
    }
  }

  // 3. Remove inner sectPr if accidentally cloned
  const innerSectPr = getSingleElement(pPr, "sectPr");
  if (innerSectPr) {
    pPr.removeChild(innerSectPr);
  }

  // 4. Line Spacing & Paragraph Spacing (Standard deed: 1.5 lines / line="360", 0 before, 0 after)
  let spacing = getSingleElement(pPr, "spacing");
  if (!spacing) {
    spacing = xmlDoc.createElementNS(W_NS, "w:spacing");
    pPr.appendChild(spacing);
  }
  spacing.setAttribute("w:line", "360");
  spacing.setAttribute("w:lineRule", "auto");
  if (block.type === "pasal-divider" || block.type === "divider") {
    spacing.setAttribute("w:before", "120");
    spacing.setAttribute("w:after", "60");
  } else {
    spacing.setAttribute("w:before", "0");
    spacing.setAttribute("w:after", "0");
  }

  // 5. Text Alignment
  let jc = getSingleElement(pPr, "jc");
  if (!jc) {
    jc = xmlDoc.createElementNS(W_NS, "w:jc");
    pPr.appendChild(jc);
  }

  if (block.type === "p" && block.align === "center") {
    jc.setAttribute("w:val", "center");
  } else if (block.type === "cv-name") {
    jc.setAttribute("w:val", "center");
  } else if (block.type === "p" && block.align === "right-center") {
    jc.setAttribute("w:val", "center");
  } else if (block.type === "divider" || block.type === "pasal-divider") {
    jc.setAttribute("w:val", "both");
  } else {
    jc.setAttribute("w:val", "both"); // Standard Justified alignment for deed body
  }

  // 6. Indentation and Tab Stops
  let ind = getSingleElement(pPr, "ind");
  if (!ind) {
    ind = xmlDoc.createElementNS(W_NS, "w:ind");
    pPr.appendChild(ind);
  }
  ind.removeAttribute("w:firstLine");

  switch (block.type) {
    case "numbered":
    case "saksi":
      ind.setAttribute("w:left", "851");
      ind.setAttribute("w:hanging", "284");
      break;

    case "list":
      if (block.bullet) {
        ind.setAttribute("w:left", "851");
        ind.setAttribute("w:hanging", "284");
      } else if (block.indentTabs) {
        const leftVal = 567 + Math.round(block.indentTabs * 284);
        ind.setAttribute("w:left", String(leftVal));
        ind.removeAttribute("w:hanging");
      } else {
        ind.setAttribute("w:left", "567");
        ind.removeAttribute("w:hanging");
      }
      break;

    case "sub-numbered":
      ind.setAttribute("w:left", "1134");
      ind.setAttribute("w:hanging", "284");
      break;

    case "pesero-modal":
    case "pasal5-komanditer":
      ind.setAttribute("w:left", "1134");
      ind.setAttribute("w:hanging", "284");
      break;

    case "pasal5-pengurus":
      ind.setAttribute("w:left", "567");
      ind.removeAttribute("w:hanging");
      break;

    case "cv-name":
      ind.removeAttribute("w:left");
      ind.removeAttribute("w:hanging");
      break;

    case "p":
      if (block.align === "center") {
        ind.removeAttribute("w:left");
        ind.removeAttribute("w:hanging");
      } else if (block.align === "right-center") {
        ind.setAttribute("w:left", "3600");
        ind.removeAttribute("w:hanging");
      } else if (block.kbliDesc) {
        ind.setAttribute("w:left", "851");
        ind.removeAttribute("w:hanging");
      } else if (block.indentTabs) {
        const leftVal = 567 + Math.round(block.indentTabs * 284);
        ind.setAttribute("w:left", String(leftVal));
        if (block.hanging) {
          ind.setAttribute("w:hanging", String(block.hanging));
        } else {
          ind.removeAttribute("w:hanging");
        }
      } else {
        ind.setAttribute("w:left", "567");
        ind.removeAttribute("w:hanging");
      }
      break;

    case "divider":
    case "pasal-divider":
      ind.setAttribute("w:left", "709");
      ind.removeAttribute("w:hanging");
      break;

    default:
      ind.setAttribute("w:left", "567");
      ind.removeAttribute("w:hanging");
      break;
  }
}

// -------------------------------------------------------------------------------------
// POPULATE RUNS
// Builds standard text runs without artificial w:br line breaks, allowing Word
// to wrap text naturally and format hanging indents seamlessly.
// -------------------------------------------------------------------------------------
function populateRuns(xmlDoc: Document, pNode: Element, block: any): void {
  // Clear all children of pNode except pPr
  const pPr = getSingleElement(pNode, "pPr");
  removeAllChildren(pNode);
  if (pPr) {
    pNode.appendChild(pPr);
  }

  if (block.type === "br") {
    const emptyRun = xmlDoc.createElementNS(W_NS, "w:r");
    const tNode = xmlDoc.createElementNS(W_NS, "w:t");
    tNode.setAttribute("xml:space", "preserve");
    tNode.textContent = "";
    emptyRun.appendChild(tNode);
    pNode.appendChild(emptyRun);
    return;
  }

  let logicalRuns: { text: string; bold?: boolean }[] = [];

  if (block.type === "divider" || block.type === "pasal-divider") {
    const displayText = (block.text || "").toUpperCase().trim();
    logicalRuns = [
      { text: "\t" },
      { text: ` ${displayText} `, bold: true },
      { text: "\t" },
    ];
  } else if (block.type === "cv-name") {
    logicalRuns = [{ text: block.text || "", bold: true }];
  } else if (block.type === "numbered") {
    const numPrefix =
      typeof block.num === "number"
        ? `${block.num}.`
        : block.num.endsWith(".")
        ? block.num
        : `${block.num}.`;
    logicalRuns = [
      { text: `${numPrefix}\t` },
      ...(block.runs || []),
    ];
  } else if (block.type === "sub-numbered") {
    const numPrefix =
      typeof block.num === "number"
        ? `${block.num}.`
        : block.num.endsWith(".")
        ? block.num
        : `${block.num}.`;
    logicalRuns = [
      { text: `${numPrefix}\t` },
      ...(block.runs || []),
    ];
  } else if (block.type === "list") {
    if (block.bullet) {
      const bulletPrefix = block.bullet.endsWith(".") ? block.bullet : `${block.bullet}.`;
      logicalRuns = [
        { text: `${bulletPrefix}\t` },
        ...(block.runs || []),
      ];
    } else {
      logicalRuns = block.runs && block.runs.length > 0 ? [...block.runs] : [{ text: "" }];
    }
  } else if (block.type === "pesero-modal") {
    logicalRuns = [
      { text: "-\t" },
      { text: `${block.name}: ` },
      { text: `${block.rpText} (${block.amountText} rupiah);` },
    ];
  } else if (block.type === "pasal5-komanditer") {
    logicalRuns = [
      { text: "-\t" },
      ...(block.runs || []),
    ];
  } else if (block.type === "saksi") {
    const numPrefix =
      typeof block.num === "number"
        ? `${block.num}.`
        : block.num.endsWith(".")
        ? block.num
        : `${block.num}.`;
    logicalRuns = [
      { text: `${numPrefix}\t` },
      ...(block.runs || []),
    ];
  } else if (block.runs && block.runs.length > 0) {
    logicalRuns = JSON.parse(JSON.stringify(block.runs));
  } else {
    logicalRuns = [{ text: block.text || "" }];
  }

  // Create runs and tabs naturally
  for (const logicalRun of logicalRuns) {
    const rawText = logicalRun.text || "";
    const isBold = !!logicalRun.bold;

    const parts = rawText.split("\t");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        // Tab Run
        const tabRun = xmlDoc.createElementNS(W_NS, "w:r");
        const rPr = xmlDoc.createElementNS(W_NS, "w:rPr");
        const rFonts = xmlDoc.createElementNS(W_NS, "w:rFonts");
        rFonts.setAttribute("w:ascii", "Century Gothic");
        rFonts.setAttribute("w:hAnsi", "Century Gothic");
        rFonts.setAttribute("w:cs", "Century Gothic");
        rPr.appendChild(rFonts);

        const sz = xmlDoc.createElementNS(W_NS, "w:sz");
        sz.setAttribute("w:val", "20");
        rPr.appendChild(sz);
        const szCs = xmlDoc.createElementNS(W_NS, "w:szCs");
        szCs.setAttribute("w:val", "20");
        rPr.appendChild(szCs);

        tabRun.appendChild(rPr);
        tabRun.appendChild(xmlDoc.createElementNS(W_NS, "w:tab"));
        pNode.appendChild(tabRun);
      }

      const partText = parts[i];
      if (partText.length === 0) continue;

      const runEl = xmlDoc.createElementNS(W_NS, "w:r");
      const rPr = xmlDoc.createElementNS(W_NS, "w:rPr");

      const rFonts = xmlDoc.createElementNS(W_NS, "w:rFonts");
      rFonts.setAttribute("w:ascii", "Century Gothic");
      rFonts.setAttribute("w:hAnsi", "Century Gothic");
      rFonts.setAttribute("w:cs", "Century Gothic");
      rPr.appendChild(rFonts);

      const sz = xmlDoc.createElementNS(W_NS, "w:sz");
      sz.setAttribute("w:val", "20");
      rPr.appendChild(sz);

      const szCs = xmlDoc.createElementNS(W_NS, "w:szCs");
      szCs.setAttribute("w:val", "20");
      rPr.appendChild(szCs);

      if (isBold) {
        rPr.appendChild(xmlDoc.createElementNS(W_NS, "w:b"));
        rPr.appendChild(xmlDoc.createElementNS(W_NS, "w:bCs"));
      }

      runEl.appendChild(rPr);

      const tNode = xmlDoc.createElementNS(W_NS, "w:t");
      tNode.setAttribute("xml:space", "preserve");
      tNode.textContent = partText;
      runEl.appendChild(tNode);

      pNode.appendChild(runEl);
    }
  }
}

// -------------------------------------------------------------------------------------
// MAIN GENERATOR EXPORT: generatePendirianCVDocx
// -------------------------------------------------------------------------------------
export const generatePendirianCVDocx = async (
  inputData: any,
  returnBlob: boolean = false
): Promise<{ filename: string; blob: Blob } | void> => {
  if (!inputData) {
    throw new Error("Data pendirian CV tidak boleh kosong");
  }

  // Map input profile to CVProfile
  const data: CVProfile = mapCompanyProfileToCV(inputData);

  // 1. Fetch template_pendirian_cv.docx
  const response = await fetch("/template_pendirian_cv.docx");
  if (!response.ok) {
    throw new Error(`Gagal mengunduh template_pendirian_cv.docx: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  // 2. Load as ZIP
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 3. Extract word/document.xml
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Template tidak valid: word/document.xml tidak ditemukan");
  }
  const originalXml = await docXmlFile.async("text");

  // 4. Parse DOM
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(originalXml, "text/xml");

  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error("Gagal mengurai XML template: " + parseError[0].textContent);
  }

  const body = getSingleElement(xmlDoc, "body");
  if (!body) {
    throw new Error("Template tidak valid: <w:body> tidak ditemukan");
  }

  // Preserve page setup / margins / headers / footers directly from template without modifying
  const sectPr = getSingleElement(body, "sectPr");
  const sectPrClone = sectPr ? (sectPr.cloneNode(true) as Element) : null;

  // Preserve tables if any
  const tables = getElements(body, "tbl");
  const tablesClone = tables.map((t) => t.cloneNode(true) as Element);

  // Get original exemplar paragraphs
  const originalParagraphs = getElements(body, "p");
  if (originalParagraphs.length === 0) {
    throw new Error("Template tidak memiliki paragraf");
  }

  // Build dynamic exemplars by scanning originalParagraphs
  const exemplars = buildDynamicExemplars(originalParagraphs);

  // Clear body content
  removeAllChildren(body);

  // 5. Generate logical blocks & preprocess
  const rawBlocks = generatePendirianCVBlocks(data);
  const preprocessedBlocks = preprocessBlocksForWordBullets(rawBlocks);

  // Expand multi-line dividers into separate divider blocks
  const finalBlocks: Block[] = [];
  for (const block of preprocessedBlocks) {
    if (block.type === "divider" && block.text && block.text.includes("\n")) {
      const lines = block.text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          finalBlocks.push({ type: "divider", text: line.trim() });
        }
      }
    } else {
      finalBlocks.push(block);
    }
  }

  // 6. Clone exemplars dynamically, adjust properties & populate runs
  for (const block of finalBlocks) {
    const exemplar = getExemplarNodeCV(exemplars, block);

    if (!exemplar) {
      console.warn(`Exemplar tidak ditemukan untuk block type=${block.type}`);
      continue;
    }

    const cloned = exemplar.cloneNode(true) as Element;
    adjustBlockProperties(xmlDoc, cloned, block);
    populateRuns(xmlDoc, cloned, block);
    body.appendChild(cloned);
  }

  // Restore preserved tables if any
  for (const tbl of tablesClone) {
    if (data.notaryName) {
      replaceTextInNode(tbl, "R.A. NUKANTINI PUTRI PARINCHA, SH., M.Kn.", data.notaryName);
    }
    if (data.notaryDomicile) {
      replaceTextInNode(tbl, "Kabupaten Bandung Barat", data.notaryDomicile);
    }
    body.appendChild(tbl);
  }

  // Restore sectPr
  if (sectPrClone) {
    body.appendChild(sectPrClone);
  }

  // 7. Serialize and return/download
  const serializer = new XMLSerializer();
  let finalXml = serializer.serializeToString(xmlDoc);
  if (!finalXml.startsWith("<?xml")) {
    finalXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + finalXml;
  }

  zip.file("word/document.xml", finalXml);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const cleanName = cleanCompanyName(data.namaCV || "CV").toUpperCase();
  const safeName = `CV_${cleanName}`.replace(/\s+/g, "_");
  const fileName = `Akta_Pendirian_${safeName}.docx`;

  if (returnBlob) {
    return { filename: fileName, blob };
  }

  saveAs(blob, fileName);
};
