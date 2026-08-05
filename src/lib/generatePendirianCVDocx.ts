import JSZip from "jszip";
import { saveAs } from "file-saver";
import { CVProfile } from "../../types";
import { generatePendirianCVBlocks, Block } from "./cvContentBlocks";
import { preprocessBlocksForWordBullets, cleanCompanyName } from "./formatter";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { mapCompanyProfileToCV } from "../domain/company/mappers/companyProfileToCV";

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
// Dynamically finds matching paragraphs from template rather than hardcoding P[x] indices
// -------------------------------------------------------------------------------------
interface DynamicCVExemplars {
  titleCenter: Element;
  cvNameCenter: Element;
  nomor: Element;
  br: Element;
  normalP: Element;
  divider: Element;
  pasalHeader: Element;
  numbered: Element;
  subNumbered: Element;
  list: Element;
  peseroModal: Element;
  pasal5Pengurus: Element;
  pasal5Komanditer: Element;
  saksi: Element;
  notarisLocation: Element;
  notarisName: Element;
  kbliDesc: Element;
}

function buildDynamicExemplars(paragraphs: Element[]): DynamicCVExemplars {
  function getJc(p: Element): string | null {
    const jc = getSingleElement(p, "jc");
    return jc ? jc.getAttribute("w:val") : null;
  }

  function hasNumPr(p: Element): boolean {
    return getSingleElement(p, "numPr") !== null;
  }

  function getIlvl(p: Element): string | null {
    const numPr = getSingleElement(p, "numPr");
    if (!numPr) return null;
    const ilvl = getSingleElement(numPr, "ilvl");
    return ilvl ? ilvl.getAttribute("w:val") : null;
  }

  function hasTabLeader(p: Element): boolean {
    const tabs = getElements(p, "tab");
    return tabs.some((t) => t.getAttribute("w:leader") === "hyphen");
  }

  const fallback = paragraphs[0];

  const titleCenter = paragraphs.find((p) => getJc(p) === "center" && p.textContent?.includes("PENDIRIAN PERSEROAN")) || fallback;
  const cvNameCenter = paragraphs.find((p) => getJc(p) === "center" && (p.textContent?.includes("CV.") || p.textContent?.includes('"'))) || paragraphs[1] || titleCenter;
  const nomor = paragraphs.find((p) => getJc(p) === "center" && p.textContent?.includes("Nomor")) || paragraphs[2] || titleCenter;
  const br = paragraphs.find((p) => !p.textContent || p.textContent.trim() === "") || paragraphs[3] || titleCenter;

  const divider = paragraphs.find((p) => hasTabLeader(p) && (p.textContent?.includes("NAMA DAN TEMPAT") || p.textContent?.includes("M O D A L"))) || titleCenter;
  const pasalHeader = paragraphs.find((p) => hasTabLeader(p) && p.textContent?.includes("PASAL 1")) || divider;

  const normalP = paragraphs.find((p) => !getJc(p) && !hasNumPr(p) && p.textContent?.includes("Pada hari ini")) || paragraphs[4] || titleCenter;

  const numbered = paragraphs.find((p) => hasNumPr(p) && getIlvl(p) === "0") || titleCenter;
  const list = paragraphs.find((p) => hasNumPr(p) || p.textContent?.includes("Maksud dan tujuan")) || normalP;
  const subNumbered = list;

  const peseroModal = paragraphs.find((p) => p.textContent?.includes("Rp.") && p.textContent?.includes("-")) || titleCenter;
  const pasal5Pengurus = paragraphs.find((p) => p.textContent?.includes("Pesero Tuan") || p.textContent?.includes("Pesero Pengurus") || p.textContent?.includes("DIREKTUR")) || titleCenter;
  const pasal5Komanditer = paragraphs.find((p) => p.textContent?.includes("tersebut di atas;") || p.textContent?.includes("Komanditer")) || titleCenter;
  const saksi = paragraphs.find((p) => p.textContent?.includes("Nendi Suhendi") || p.textContent?.includes("lahir di Bandung")) || titleCenter;
  const notarisLocation = paragraphs.find((p) => p.textContent?.includes("Notaris di")) || titleCenter;
  const notarisName = paragraphs.find((p) => p.textContent?.includes("NUKANTINI")) || titleCenter;
  const kbliDesc = paragraphs.find((p) => p.textContent?.includes("Mencakup usaha") || p.textContent?.includes("perdagangan")) || titleCenter;

  return {
    titleCenter,
    cvNameCenter,
    nomor,
    br,
    normalP,
    divider,
    pasalHeader,
    numbered,
    subNumbered,
    list,
    peseroModal,
    pasal5Pengurus,
    pasal5Komanditer,
    saksi,
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
      return exemplars.numbered;

    case "sub-numbered":
      return exemplars.subNumbered;

    case "list":
      return exemplars.list;

    case "pesero-modal":
      return exemplars.peseroModal;

    case "pasal5-pengurus":
      return exemplars.pasal5Pengurus;

    case "pasal5-komanditer":
      return exemplars.pasal5Komanditer;

    case "saksi":
      return exemplars.saksi;

    default:
      return exemplars.normalP;
  }
}

// -------------------------------------------------------------------------------------
// OOXML Schema Helpers
// -------------------------------------------------------------------------------------


function getMaxWidthForBlock(block: any): number {
  switch (block.type) {
    case "p":
      if (block.align === "center" || block.align === "right-center") return 100;
      if (block.kbliDesc) return 42.0;
      return 45.5;
    case "numbered":
      return 42.0;
    case "sub-numbered":
      return 40.0;
    case "list":
      return 42.0;
    case "pesero-modal":
      return 42.0;
    case "pasal5-pengurus":
    case "pasal5-komanditer":
      return 42.0;
    case "saksi":
      return 42.0;
    default:
      return 45.5;
  }
}

function populateRuns(xmlDoc: Document, pNode: Element, block: any): void {
  const existingRuns = getElements(pNode, "r");
  let runTemplate: Element | null = null;

  if (existingRuns.length > 0) {
    runTemplate = existingRuns[0].cloneNode(true) as Element;
    const rPr = getSingleElement(runTemplate, "rPr");
    removeAllChildren(runTemplate);
    if (rPr) {
      runTemplate.appendChild(rPr);
    }
    const t = xmlDoc.createElementNS(W_NS, "w:t");
    t.setAttribute("xml:space", "preserve");
    runTemplate.appendChild(t);
  } else {
    const fallbackXml =
      `<w:r xmlns:w="${W_NS}"><w:rPr><w:rFonts w:ascii="Century Gothic" w:hAnsi="Century Gothic"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve"/></w:r>`;
    const tmpDoc = new DOMParser().parseFromString(fallbackXml, "application/xml");
    runTemplate = tmpDoc.documentElement.cloneNode(true) as Element;
  }

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
    return;
  }

  let logicalRuns: { text: string; bold?: boolean }[] = [];

  if (block.type === "divider" || block.type === "pasal-divider") {
    const displayText = block.type === "pasal-divider" ? block.text : block.text.toUpperCase();
    logicalRuns = [
      { text: "\t" },
      { text: ` ${displayText} `, bold: true },
      { text: "\t" },
    ];
  } else if (block.type === "cv-name") {
    logicalRuns = [{ text: block.text, bold: true }];
  } else if (block.type === "pesero-modal") {
    logicalRuns = [
      { text: "-\t" },
      { text: `${block.name}: ` },
      { text: `${block.rpText} (${block.amountText} rupiah);` },
    ];
  } else if (block.type === "pasal5-komanditer") {
    logicalRuns = [{ text: "-\t" }, ...(block.runs || [])];
  } else if (block.type === "list" && block.bullet) {
    logicalRuns = [{ text: `${block.bullet}\t` }, ...(block.runs || [])];
  } else if (block.type === "sub-numbered") {
    logicalRuns = [{ text: `${block.num}\t` }, ...(block.runs || [])];
  } else if (block.runs && block.runs.length > 0) {
    logicalRuns = JSON.parse(JSON.stringify(block.runs));
  } else {
    logicalRuns = [{ text: block.text || "" }];
  }

  const needsTrailingTab =
    (block.type === "p" && block.align !== "center") ||
    block.type === "numbered" ||
    block.type === "sub-numbered" ||
    block.type === "list" ||
    block.type === "pesero-modal" ||
    block.type === "pasal5-pengurus" ||
    block.type === "pasal5-komanditer" ||
    block.type === "saksi";

  if (needsTrailingTab) {
    const tokens: FormatToken[] = logicalRuns.map((run) => ({
      text: run.text || "",
      bold: !!run.bold,
    }));

    const maxWidth = getMaxWidthForBlock(block);
    const lines = parseTextRuns(tokens, maxWidth);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineTokens = lines[lineIdx];

      for (const token of lineTokens) {
        const newRun = runTemplate.cloneNode(true) as Element;
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

        const parts = token.text.split("\t");
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) {
            const runClone = newRun.cloneNode(true) as Element;
            let tNode = getSingleElement(runClone, "t");
            if (!tNode) {
              tNode = xmlDoc.createElementNS(W_NS, "w:t");
              runClone.appendChild(tNode);
            }
            tNode.setAttribute("xml:space", "preserve");
            tNode.textContent = parts[i];
            pNode.appendChild(runClone);
          }

          if (i < parts.length - 1) {
            const tabRun = xmlDoc.createElementNS(W_NS, "w:r");
            if (rPr) {
              tabRun.appendChild(rPr.cloneNode(true));
            }
            tabRun.appendChild(xmlDoc.createElementNS(W_NS, "w:tab"));
            pNode.appendChild(tabRun);
          }
        }
      }

      const tabRun = xmlDoc.createElementNS(W_NS, "w:r");
      const rPrTab = getSingleElement(runTemplate, "rPr");
      if (rPrTab) {
        tabRun.appendChild(rPrTab.cloneNode(true));
      }
      tabRun.appendChild(xmlDoc.createElementNS(W_NS, "w:tab"));
      pNode.appendChild(tabRun);

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
            if (!hasB) rPr.appendChild(xmlDoc.createElementNS(W_NS, "w:b"));
            if (!hasBCs) rPr.appendChild(xmlDoc.createElementNS(W_NS, "w:bCs"));
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

  // 6. Setup numbering restart dynamically in word/numbering.xml
  let activeNumId = "15";
  const numberingXmlFile = zip.file("word/numbering.xml");
  let blocksWithNum = preprocessedBlocks;

  if (numberingXmlFile) {
    const numXmlText = await numberingXmlFile.async("text");
    const numDoc = parser.parseFromString(numXmlText, "text/xml");
    const numberingNode = getSingleElement(numDoc, "numbering") || numDoc.documentElement;

    let nextNumId = 200;
    const ABSTRACT_NUM_ID_DECIMAL = "12";

    blocksWithNum = preprocessedBlocks.map((block: any) => {
      if (block.type === "numbered") {
        if (block.num === 1 || block.num === "1") {
          activeNumId = String(nextNumId++);

          const numNode = numDoc.createElementNS(W_NS, "w:num");
          numNode.setAttribute("w:numId", activeNumId);

          const abstractNumIdNode = numDoc.createElementNS(W_NS, "w:abstractNumId");
          abstractNumIdNode.setAttribute("w:val", ABSTRACT_NUM_ID_DECIMAL);
          numNode.appendChild(abstractNumIdNode);

          const lvlOverrideNode = numDoc.createElementNS(W_NS, "w:lvlOverride");
          lvlOverrideNode.setAttribute("w:ilvl", "0");
          const startOverrideNode = numDoc.createElementNS(W_NS, "w:startOverride");
          startOverrideNode.setAttribute(
            "w:val",
            String(block.num !== undefined ? block.num : "1")
          );
          lvlOverrideNode.appendChild(startOverrideNode);
          numNode.appendChild(lvlOverrideNode);

          numberingNode.appendChild(numNode);
        }
        return { ...block, _numId: activeNumId };
      }
      if (block.type === "sub-numbered") {
        return { ...block, _numId: activeNumId };
      }
      if (block.type === "saksi") {
        return { ...block, _numId: "13" };
      }
      return block;
    });

    const serializer = new XMLSerializer();
    let finalNumXml = serializer.serializeToString(numDoc);
    if (!finalNumXml.startsWith("<?xml")) {
      finalNumXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + finalNumXml;
    }
    zip.file("word/numbering.xml", finalNumXml);
  }

  // 7. Clone exemplars dynamically & populate runs
  for (const block of blocksWithNum) {
    const exemplar = getExemplarNodeCV(exemplars, block);

    if (!exemplar) {
      console.warn(`Exemplar tidak ditemukan untuk block type=${block.type}`);
      continue;
    }

    const cloned = exemplar.cloneNode(true) as Element;
    const pPrCloned = getSingleElement(cloned, "pPr");
    if (pPrCloned) {
      const innerSectPr = getSingleElement(pPrCloned, "sectPr");
      if (innerSectPr) {
        pPrCloned.removeChild(innerSectPr);
      }
    }

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

  // 8. Serialize and return/download
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
