import JSZip from "jszip";
import { saveAs } from "file-saver";
import { generatePendirianBlocks, Block } from "./pendirianContentBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";

const wNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

function getElements(parent: Element | Document, localName: string): Element[] {
  if ((parent as any).getElementsByTagNameNS) {
    return Array.from((parent as any).getElementsByTagNameNS(wNamespace, localName));
  }
  return Array.from((parent as any).getElementsByTagName(`w:${localName}`));
}

function getSingleElement(parent: Element | Document, localName: string): Element | null {
  const list = getElements(parent, localName);
  return list.length > 0 ? list[0] : null;
}

// =====================================================
// PROTOTYPE PILIHAN (dari template asli)
// =====================================================
const NUMBERED_PROTOTYPES = [7, 13, 22]; // numId berbeda → numbering bisa restart
let numberedCycle = 0;

function getPrototypeIndex(block: Block): number {
  if (block.type === "p") {
    if (block.align === "center") return 0;
    if (block.align === "right-center") return 374;
    if (block.kbliDesc || block.indentTabs === 1) return 35;
    if (block.indentTabs === 2) return 356;
    return 4;
  }
  if (block.type === "br") return 3;
  if (block.type === "divider" || block.type === "pasal-divider") return 14;
  
  if (block.type === "numbered") {
    if ((block as any).num === 1 || (block as any).num === "1") {
      numberedCycle = (numberedCycle + 1) % NUMBERED_PROTOTYPES.length;
    }
    return NUMBERED_PROTOTYPES[numberedCycle];
  }
  
  if (block.type === "sub-numbered") return 146;
  if (block.type === "list") return 129;
  
  if (block.type === "management-role") {
    const pos = String((block as any).position || "").toLowerCase();
    return pos.includes("direktur") ? 351 : 353;
  }
  if (block.type === "saksi") return 360;
  
  return 4;
}

// =====================================================
// Isi teks — versi lebih pintar (jaga struktur run & tab)
// =====================================================
function fillTextInClonedParagraph(clonedP: Element, block: Block) {
  const textNodes = getElements(clonedP, "t");
  if (textNodes.length === 0) return;

  let newText = "";

  if (block.type === "p" || block.type === "numbered" || block.type === "sub-numbered" || block.type === "list" || block.type === "saksi") {
    newText = block.runs?.map(r => r.text || "").join("") || "";
  } 
  else if (block.type === "divider" || block.type === "pasal-divider") {
    newText = ` ${block.text.toUpperCase()} `;
  } 
  else if (block.type === "management-role") {
    newText = `${(block as any).position}: ${(block as any).nameText};`;
  }

  // Isi teks ke node pertama
  textNodes[0].textContent = newText;
  textNodes[0].setAttribute("xml:space", "preserve");

  // Untuk divider & pasal-divider: pastikan ada trailing tab (supaya leader muncul)
  if (block.type === "divider" || block.type === "pasal-divider") {
    const runs = getElements(clonedP, "r");
    const hasTabAtEnd = runs.length > 0 && getSingleElement(runs[runs.length - 1], "tab") !== null;

    if (!hasTabAtEnd) {
      // Tambah tab run di akhir (hanya untuk divider, biar garis muncul)
      const lastRun = runs[runs.length - 1];
      if (lastRun) {
        const tabRun = clonedP.ownerDocument.createElementNS(wNamespace, "w:r");
        const rPr = getSingleElement(lastRun, "rPr");
        if (rPr) tabRun.appendChild(rPr.cloneNode(true));
        tabRun.appendChild(clonedP.ownerDocument.createElementNS(wNamespace, "w:tab"));
        clonedP.appendChild(tabRun);
      }
    }
  }
}

// =====================================================
// Main Generator
// =====================================================
export const generatePendirianDocx = async (data: any) => {
  numberedCycle = 0;

  const response = await fetch("/api/template-pendirian");
  if (!response.ok) throw new Error("Template tidak ditemukan");
  const arrayBuffer = await response.arrayBuffer();

  const zip = await JSZip.loadAsync(arrayBuffer);
  const docXml = await zip.file("word/document.xml")?.async("text");
  if (!docXml) throw new Error("document.xml corrupt");

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXml, "application/xml");

  const body = getSingleElement(xmlDoc, "body");
  if (!body) throw new Error("Body tidak ditemukan");

  const originalParagraphs = getElements(body, "p");
  const sectPr = getSingleElement(body, "sectPr");
  const sectPrClone = sectPr ? sectPr.cloneNode(true) : null;

  while (body.firstChild) body.removeChild(body.firstChild);

  const rawBlocks = generatePendirianBlocks(data);
  const blocks: Block[] = preprocessBlocksForWordBullets(rawBlocks);

  for (const block of blocks) {
    const protoIdx = getPrototypeIndex(block);
    if (!originalParagraphs[protoIdx]) continue;

    const cloned = originalParagraphs[protoIdx].cloneNode(true) as Element;
    fillTextInClonedParagraph(cloned, block);
    body.appendChild(cloned);
  }

  if (sectPrClone) body.appendChild(sectPrClone);

  const serializer = new XMLSerializer();
  zip.file("word/document.xml", serializer.serializeToString(xmlDoc));

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const safeName = data?.namaPt ? String(data.namaPt).replace(/PT\.?\s*/i, "").trim() : "Draft";
  saveAs(blob, `Akta_Pendirian_${safeName}.docx`);
};