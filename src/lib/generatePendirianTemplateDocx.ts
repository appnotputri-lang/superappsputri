import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  formatAktaDate,
  formatNumber,
  terbilang,
} from "./formatter";
import {
  generatePendirianBlocks,
  type PendirianData,
  type Run,
} from "./pendirianContentBlocks";
import { parseTextRuns } from "./notaryWrapper";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const TEMPLATE_FILE = "template_pendirian.docx";

type ParagraphElement = Element;
type RunBlock = { type?: string; text?: string; runs?: Run[]; [key: string]: any };

function directParagraphs(parent: Element): ParagraphElement[] {
  return Array.from(parent.children).filter((child) => child.namespaceURI === W_NS && child.localName === "p");
}

function textNodes(paragraph: ParagraphElement): Element[] {
  return Array.from(paragraph.getElementsByTagNameNS(W_NS, "t"));
}

function paragraphText(paragraph: ParagraphElement): string {
  return textNodes(paragraph).map((node) => node.textContent || "").join("");
}

function ensureTemplateParagraph(paragraphs: ParagraphElement[], index: number, fragment: string): ParagraphElement {
  const paragraph = paragraphs[index];
  if (!paragraph || !paragraphText(paragraph).includes(fragment)) {
    throw new Error(`Slot template Akta Pendirian tidak cocok pada paragraf ${index + 1}.`);
  }
  return paragraph;
}

function replaceTextRange(paragraph: ParagraphElement, start: number, end: number, replacement: string): void {
  const nodes = textNodes(paragraph);
  const ranges: Array<{ node: Element; start: number; end: number; text: string }> = [];
  let length = 0;
  for (const node of nodes) {
    const text = node.textContent || "";
    ranges.push({ node, start: length, end: length + text.length, text });
    length += text.length;
  }

  if (start < 0 || end < start || end > length || !nodes.length) {
    throw new Error("Rentang slot teks DOCX tidak valid.");
  }

  if (start === end) {
    const target = ranges.find((range) => start <= range.end) || ranges[ranges.length - 1];
    const localOffset = Math.max(0, Math.min(target.text.length, start - target.start));
    setTextNode(target.node, target.text.slice(0, localOffset) + replacement + target.text.slice(localOffset));
    return;
  }

  const firstIndex = ranges.findIndex((range) => range.end > start);
  let lastIndex = ranges.findIndex((range) => range.end >= end);
  if (lastIndex < 0) lastIndex = ranges.length - 1;
  if (firstIndex < 0) throw new Error("Slot teks DOCX tidak ditemukan.");

  for (let i = firstIndex; i <= lastIndex; i += 1) {
    const range = ranges[i];
    if (i === firstIndex && i === lastIndex) {
      const localStart = start - range.start;
      const localEnd = end - range.start;
      setTextNode(range.node, range.text.slice(0, localStart) + replacement + range.text.slice(localEnd));
    } else if (i === firstIndex) {
      setTextNode(range.node, range.text.slice(0, start - range.start) + replacement);
    } else if (i === lastIndex) {
      setTextNode(range.node, range.text.slice(end - range.start));
    } else {
      setTextNode(range.node, "");
    }
  }
}

function setTextNode(node: Element, text: string): void {
  node.textContent = text;
  if (/^\s|\s$/.test(text)) {
    node.setAttributeNS(XML_NS, "xml:space", "preserve");
  } else {
    node.removeAttributeNS(XML_NS, "space");
  }
}

function nthIndexOf(text: string, search: string, occurrence: number): number {
  if (!search) return 0;
  let position = -1;
  let from = 0;
  for (let i = 0; i <= occurrence; i += 1) {
    position = text.indexOf(search, from);
    if (position < 0) return -1;
    from = position + search.length;
  }
  return position;
}

function replaceBetween(
  paragraph: ParagraphElement,
  startMarker: string,
  endMarker: string,
  replacement: string,
  occurrence = 0,
): void {
  const text = paragraphText(paragraph);
  const markerIndex = startMarker ? nthIndexOf(text, startMarker, occurrence) : 0;
  if (markerIndex < 0) throw new Error(`Slot DOCX tidak ditemukan: "${startMarker}".`);
  const start = markerIndex + startMarker.length;
  const end = endMarker ? text.indexOf(endMarker, start) : text.length;
  if (end < start) throw new Error(`Batas akhir slot DOCX tidak ditemukan: "${endMarker}".`);
  replaceTextRange(paragraph, start, end, replacement);
}

function replaceFirst(paragraph: ParagraphElement, oldText: string, newText: string): void {
  const text = paragraphText(paragraph);
  const start = text.indexOf(oldText);
  if (start < 0) throw new Error(`Teks slot DOCX tidak ditemukan: "${oldText}".`);
  replaceTextRange(paragraph, start, start + oldText.length, newText);
}

function blockText(block: RunBlock): string {
  if (Array.isArray(block.runs)) return block.runs.map((run) => run.text || "").join("");
  if (typeof block.text === "string") return block.text;
  return "";
}

function runProperties(run: Element): Element | undefined {
  return Array.from(run.children).find((child) => child.namespaceURI === W_NS && child.localName === "rPr");
}

function runIsBold(run: Element): boolean {
  const props = runProperties(run);
  const bold = props && Array.from(props.children).find((child) => child.namespaceURI === W_NS && child.localName === "b");
  if (!bold) return false;
  const value = bold.getAttributeNS(W_NS, "val");
  return !["0", "false", "off"].includes((value || "1").toLowerCase());
}

function directRuns(paragraph: ParagraphElement): Element[] {
  return Array.from(paragraph.children).filter((child) => child.namespaceURI === W_NS && child.localName === "r");
}

function makeRun(
  paragraph: ParagraphElement,
  bold: boolean,
  text?: string,
  special?: "tab",
  styleSource: ParagraphElement = paragraph,
): Element {
  const runs = directRuns(styleSource);
  const candidates = runs.filter((run) => run.getElementsByTagNameNS(W_NS, "t").length > 0);
  const prototype = candidates.find((run) => runIsBold(run) === bold) || candidates[0] || runs[0];
  const run = paragraph.ownerDocument!.createElementNS(W_NS, "w:r");
  const props = prototype && runProperties(prototype);
  if (props) run.appendChild(props.cloneNode(true));

  if (special === "tab") {
    run.appendChild(paragraph.ownerDocument!.createElementNS(W_NS, "w:tab"));
  } else {
    const textNode = paragraph.ownerDocument!.createElementNS(W_NS, "w:t");
    textNode.textContent = text || "";
    if (/^\s|\s$/.test(text || "")) textNode.setAttributeNS(XML_NS, "xml:space", "preserve");
    run.appendChild(textNode);
  }
  return run;
}

function replaceParagraphWithRuns(
  paragraph: ParagraphElement,
  runs: Run[],
  maxWidth = 41.5,
  addLeaderTabs = true,
): void {
  const paragraphProperties = Array.from(paragraph.children).find(
    (child) => child.namespaceURI === W_NS && child.localName === "pPr",
  );
  const styleSource = paragraph.cloneNode(true) as ParagraphElement;
  const keptProperties = paragraphProperties?.cloneNode(true);
  while (paragraph.firstChild) paragraph.removeChild(paragraph.firstChild);
  if (keptProperties) paragraph.appendChild(keptProperties);

  const wrapped = parseTextRuns(runs.map((run) => ({ text: run.text || "", bold: run.bold })), maxWidth);
  const lines = wrapped.length ? wrapped : [[]];
  lines.forEach((line, index) => {
    // Template text after a leader tab starts with a space. Keep that boundary
    // so Word moves the next word as a whole instead of leaving its first
    // character stranded after the leader at the far right of the line.
    if (addLeaderTabs && index > 0) {
      paragraph.appendChild(makeRun(paragraph, false, " ", undefined, styleSource));
    }
    for (const token of line) {
      if (token.text) paragraph.appendChild(makeRun(paragraph, !!token.bold, token.text, undefined, styleSource));
    }
    // The source template uses leader tabs to finish each visual line. Let Word
    // wrap the next text segment using the paragraph's existing hanging indent;
    // an explicit w:br here resets the continuation to the paragraph margin and
    // is what made generated rows drift right compared with the template.
    if (addLeaderTabs) paragraph.appendChild(makeRun(paragraph, false, undefined, "tab", styleSource));
  });
}

function runsWithBoldPhrases(text: string, boldPhrases: string[]): Run[] {
  const phrases = boldPhrases
    .filter(Boolean)
    .map((phrase) => ({ phrase, start: text.indexOf(phrase) }))
    .filter((entry) => entry.start >= 0)
    .sort((left, right) => left.start - right.start);
  const runs: Run[] = [];
  let cursor = 0;
  for (const entry of phrases) {
    if (entry.start < cursor) continue;
    if (entry.start > cursor) runs.push({ text: text.slice(cursor, entry.start) });
    runs.push({ text: entry.phrase, bold: true });
    cursor = entry.start + entry.phrase.length;
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor) });
  return runs.length ? runs : [{ text }];
}

function setParagraphText(paragraph: ParagraphElement, text: string): void {
  replaceBetween(paragraph, "", "", text);
}

function setKeepWithNext(paragraph: ParagraphElement): void {
  let paragraphProperties = Array.from(paragraph.children).find(
    (child) => child.namespaceURI === W_NS && child.localName === "pPr",
  );
  if (!paragraphProperties) {
    paragraphProperties = paragraph.ownerDocument!.createElementNS(W_NS, "w:pPr");
    paragraph.insertBefore(paragraphProperties, paragraph.firstChild);
  }
  if (Array.from(paragraphProperties.children).some((child) => child.namespaceURI === W_NS && child.localName === "keepNext")) {
    return;
  }

  const keepNext = paragraph.ownerDocument!.createElementNS(W_NS, "w:keepNext");
  const paragraphStyle = Array.from(paragraphProperties.children).find(
    (child) => child.namespaceURI === W_NS && child.localName === "pStyle",
  );
  paragraphProperties.insertBefore(keepNext, paragraphStyle?.nextSibling || paragraphProperties.firstChild);
}

function setParagraphLeftIndentTwips(paragraph: ParagraphElement, leftIndent: number): void {
  const paragraphProperties = Array.from(paragraph.children).find(
    (child) => child.namespaceURI === W_NS && child.localName === "pPr",
  );
  if (!paragraphProperties) throw new Error("Format paragraf template Akta Pendirian tidak ditemukan.");

  let indentation = Array.from(paragraphProperties.children).find(
    (child) => child.namespaceURI === W_NS && child.localName === "ind",
  );
  if (!indentation) {
    indentation = paragraph.ownerDocument!.createElementNS(W_NS, "w:ind");
    const spacing = Array.from(paragraphProperties.children).find(
      (child) => child.namespaceURI === W_NS && child.localName === "spacing",
    );
    paragraphProperties.insertBefore(indentation, spacing?.nextSibling || null);
  }
  indentation.setAttributeNS(W_NS, "w:left", String(leftIndent));
}

function replaceParagraphRange(
  body: Element,
  oldParagraphs: ParagraphElement[],
  entries: Array<{ text: string; bold?: boolean; maxWidth?: number; prototype?: ParagraphElement; keepWithNext?: boolean }>,
  prototype: ParagraphElement,
): ParagraphElement[] {
  const anchor = oldParagraphs[oldParagraphs.length - 1]?.nextSibling || null;
  const replacements = entries.map((entry) => {
    const paragraph = (entry.prototype || prototype).cloneNode(true) as ParagraphElement;
    if (entry.bold === undefined) setParagraphText(paragraph, entry.text);
    else replaceParagraphWithRuns(paragraph, [{ text: entry.text, bold: entry.bold }], entry.maxWidth || 41.5);
    if (entry.keepWithNext) setKeepWithNext(paragraph);
    return paragraph;
  });
  oldParagraphs.forEach((paragraph) => paragraph.parentNode?.removeChild(paragraph));
  replacements.forEach((paragraph) => body.insertBefore(paragraph, anchor));
  return replacements;
}

function replaceRowsWithRuns(
  body: Element,
  oldRows: ParagraphElement[],
  entries: RunBlock[],
  extraPrototype: ParagraphElement,
  runFactory: (block: RunBlock) => Run[],
  widthFactory: (block: RunBlock) => number,
): ParagraphElement[] {
  const anchor = oldRows[oldRows.length - 1]?.nextSibling || null;
  const reused = oldRows.slice(0, entries.length);
  const rows = reused.concat(
    entries.slice(reused.length).map(() => extraPrototype.cloneNode(true) as ParagraphElement),
  );
  oldRows.slice(entries.length).forEach((row) => row.parentNode?.removeChild(row));
  rows.slice(reused.length).forEach((row) => body.insertBefore(row, anchor));
  rows.forEach((row, index) => replaceParagraphWithRuns(row, runFactory(entries[index]), widthFactory(entries[index])));
  return rows;
}

function ensureRowCount(
  body: Element,
  oldRows: ParagraphElement[],
  count: number,
  extraPrototype: ParagraphElement,
): ParagraphElement[] {
  const anchor = oldRows[oldRows.length - 1]?.nextSibling || null;
  const reused = oldRows.slice(0, count);
  const rows = reused.concat(
    Array.from({ length: Math.max(0, count - reused.length) }, () => extraPrototype.cloneNode(true) as ParagraphElement),
  );
  oldRows.slice(count).forEach((row) => row.parentNode?.removeChild(row));
  rows.slice(reused.length).forEach((row) => body.insertBefore(row, anchor));
  return rows;
}

function managementRoleRuns(block: RunBlock): Run[] {
  return [
    { text: `${block.position || ""}: ${block.salutation ? `${block.salutation} ` : ""}` },
    { text: String(block.name || ""), bold: true },
    { text: ", tersebut di atas;" },
  ];
}

function fillShareAllocationRow(
  paragraph: ParagraphElement,
  shareholder: any,
  nominal: number,
): void {
  const isLegalEntity = shareholder.shareholderType === "BADAN_HUKUM" || !!shareholder.legalEntityType;
  const salutation = isLegalEntity ? "" : String(shareholder.salutation || "Tuan").trim();
  const name = String(shareholder.name || "").toUpperCase().trim();
  const shares = Number(shareholder.sharesOwned || 0);
  const sharesText = formatNumber(shares);
  const nominalText = formatNumber(nominal);

  if (isLegalEntity) {
    replaceBetween(paragraph, "", " ", "");
    replaceBetween(paragraph, " ", ",", name);
  } else {
    replaceBetween(paragraph, "", " ", salutation);
    replaceBetween(paragraph, `${salutation} `, ",", name);
  }
  replaceBetween(paragraph, "sejumlah ", " (", sharesText);
  replaceBetween(paragraph, `sejumlah ${sharesText} (`, ") lembar saham", terbilang(shares));
  replaceBetween(paragraph, "Rp. ", ",-", nominalText);
  replaceBetween(paragraph, `Rp. ${nominalText},- (`, " rupiah)", terbilang(nominal));

  const text = paragraphText(paragraph);
  replaceParagraphWithRuns(paragraph, runsWithBoldPhrases(text, [name, sharesText, `Rp. ${nominalText},-`]), 37.5);
}

function fillShareTotalParagraph(paragraph: ParagraphElement, shareholders: any[], nilaiPerLembar: number): void {
  const totalShares = shareholders.reduce((sum, shareholder) => sum + Number(shareholder.sharesOwned || 0), 0);
  const totalNominal = totalShares * nilaiPerLembar;
  const sharesText = formatNumber(totalShares);
  const nominalText = formatNumber(totalNominal);
  replaceBetween(paragraph, "Sehingga seluruhnya berjumlah ", " (", sharesText);
  replaceBetween(paragraph, `Sehingga seluruhnya berjumlah ${sharesText} (`, ") lembar saham", terbilang(totalShares));
  replaceBetween(paragraph, "nominal seluruhnya sebesar Rp. ", ",-", nominalText);
  replaceBetween(paragraph, `nominal seluruhnya sebesar Rp. ${nominalText},- (`, " rupiah)", terbilang(totalNominal));

  const text = paragraphText(paragraph);
  replaceParagraphWithRuns(paragraph, runsWithBoldPhrases(text, [sharesText, `Rp. ${nominalText},-`]), 41.5);
}

function templateSignatureName(rawName: string): string {
  return rawName
    .trim()
    .toUpperCase()
    .replace(/\bSARJANA HUKUM\b/g, "SH.")
    .replace(/\bMAGISTER KENOTARIATAN\b/g, "M.Kn.")
    .replace(/\bM\.KN\./g, "M.Kn.");
}

export async function generatePendirianTemplateDocx(data: PendirianData, returnBlob = false): Promise<any> {
  if (!data) throw new Error("Data pendirian tidak boleh kosong");

  const baseUrl = (import.meta as any).env?.BASE_URL || "/";
  const response = await fetch(`${baseUrl.replace(/\/?$/, "/")}${TEMPLATE_FILE}`);
  if (!response.ok) throw new Error("Template Akta Pendirian tidak dapat dimuat.");

  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) throw new Error("Bagian isi template Akta Pendirian tidak ditemukan.");
  const xml = await documentFile.async("string");
  const xmlDocument = new DOMParser().parseFromString(xml, "application/xml");
  if (xmlDocument.getElementsByTagName("parsererror").length) {
    throw new Error("Isi template Akta Pendirian tidak dapat dibaca.");
  }

  const body = xmlDocument.getElementsByTagNameNS(W_NS, "body")[0];
  if (!body) throw new Error("Bagian isi template Akta Pendirian tidak ditemukan.");
  const paragraphs = directParagraphs(body);
  const p = (index: number, expected: string) => ensureTemplateParagraph(paragraphs, index, expected);
  const blocks = generatePendirianBlocks(data) as RunBlock[];

  // Keep Pasal 9 item 2 as one numbered paragraph so its first continuation
  // word does not get stranded alone on the following line.
  const meetingNotice = p(99, "Rapat Umum Pemegang Saham diselenggarakan dengan melakukan");
  const meetingNoticeContinuation = p(100, "terlebih dahulu kepada para pemegang saham");
  const meetingNoticeText = `${paragraphText(meetingNotice).trim()} ${paragraphText(meetingNoticeContinuation).trim()}`;
  replaceParagraphWithRuns(meetingNotice, [{ text: meetingNoticeText }], 37.5);
  meetingNoticeContinuation.parentNode?.removeChild(meetingNoticeContinuation);

  // Opening: replace only the fields that come from the form.
  replaceParagraphWithRuns(p(0, "PENDIRIAN PERSEROAN TERBATAS"), blocks[0].runs || [{ text: blockText(blocks[0]), bold: true }], 41.5, false);
  replaceParagraphWithRuns(p(1, "GEMURUH MAJU MAKMUR"), blocks[1].runs || [{ text: blockText(blocks[1]), bold: true }], 41.5, false);
  replaceParagraphWithRuns(p(2, "Nomor :"), blocks[2].runs || [{ text: blockText(blocks[2]) }], 41.5, false);
  replaceParagraphWithRuns(p(4, "Pada hari ini"), blocks[3].runs || [{ text: blockText(blocks[3]) }], 41.5);
  const timeRaw = String(data.waktu || "11.00").replace(/\s*WIB.*$/i, "");
  const timeValue = timeRaw.replace(":", ".");
  const timeParts = timeValue.replace(".", ":").split(":");
  const hourPart = timeParts[0] || "11";
  const minutePart = timeParts[1] || "00";
  const hourWords = /^\d+$/.test(hourPart) ? terbilang(Number(hourPart)) : hourPart;
  const minuteWords = /^\d+$/.test(minutePart) ? terbilang(Number(minutePart)) : minutePart;
  const minutePhrase = minutePart === "00" ? "nol-nol" : `${minuteWords} menit`;
  const timeWords = `${hourWords} lewat ${minutePhrase} Waktu Indonesia Barat`;
  replaceParagraphWithRuns(p(5, "Pukul "), [{ text: `Pukul ${timeValue} WIB (${timeWords}).` }], 41.5);

  const openingSentence = blocks[5];
  const boldOpeningRuns = (openingSentence.runs || []).filter((run) => run.bold);
  const notaryName = boldOpeningRuns[0]?.text || data.notarisNamaSurat || "Nukantini Putri Parincha, Sarjana Hukum, Magister Kenotariatan";
  const notaryDomicile = boldOpeningRuns[1]?.text || data.notarisTempat || "Kabupaten Bandung Barat";
  replaceParagraphWithRuns(p(6, "Telah hadir di hadapan saya"), [
    { text: "Telah hadir di hadapan saya " },
    { text: notaryName, bold: true },
    { text: ", Notaris di " },
    { text: notaryDomicile, bold: true },
    { text: ", dengan dihadiri oleh saksi-saksi yang saya, Notaris kenal dan akan disebutkan nama-namanya pada bagian akhir akta ini :" },
  ]);

  const agreementIndex = blocks.findIndex((block) => blockText(block).startsWith("Para Penghadap bertindak"));
  if (agreementIndex < 0) throw new Error("Klausa pembuka template Akta Pendirian tidak ditemukan.");
  const openingBlocks = blocks.slice(6, agreementIndex);
  const appearanceBlocks = openingBlocks.filter((block) => {
    const text = blockText(block);
    return (block.type === "appearer" || block.type === "p") && !text.startsWith("-\tUntuk sementara");
  });
  const openingDomicileBlock = openingBlocks.find((block) => blockText(block).startsWith("-\tUntuk sementara"));
  const openingRows = [p(7, "VICTORY HENDRIO"), p(8, "DONI MALVINO")];
  replaceRowsWithRuns(
    body,
    openingRows,
    appearanceBlocks,
    openingRows[openingRows.length - 1],
    (block) => block.runs || [{ text: blockText(block) }],
    () => 36.5,
  );
  const openingDomicileParagraph = p(9, "Untuk sementara berada di");
  if (openingDomicileBlock) {
    const domicileText = blockText(openingDomicileBlock).replace(/^-\s*\t?/, "").trim();
    replaceParagraphWithRuns(openingDomicileParagraph, [{ text: domicileText }], 41.5);
  } else {
    openingDomicileParagraph.parentNode?.removeChild(openingDomicileParagraph);
  }

  // Company name and domicile in Pasal 1.
  const companyNameParagraph = p(14, "GEMURUH MAJU MAKMUR");
  setParagraphText(companyNameParagraph, blockText(blocks.find((block) => block.type === "pt-name") || { text: "" }));
  const addressBlock = blocks.find((block) => block.type === "p" && blockText(block).includes("berkedudukan di "));
  if (addressBlock) {
    const addressText = blockText(addressBlock).match(/berkedudukan di ([\s\S]*?)\.$/)?.[1];
    if (addressText !== undefined) {
      const addressParagraph = p(15, "berkedudukan di");
      const templateText = paragraphText(addressParagraph);
      const addressMarker = "berkedudukan di ";
      const markerIndex = templateText.indexOf(addressMarker);
      if (markerIndex < 0) throw new Error("Slot kedudukan Perseroan pada template tidak ditemukan.");
      const fixedPrefix = templateText.slice(0, markerIndex);
      replaceParagraphWithRuns(
        addressParagraph,
        [{ text: `${fixedPrefix}${addressMarker}${addressText};` }],
        41.5,
      );
    }
  }

  // KBLI categories and activity lines are variable-length form fields. The two
  // standard explanatory paragraphs around them remain the original template text.
  const purposeIndex = blocks.findIndex((block) => blockText(block).startsWith("Maksud dan Tujuan Perseroan adalah berusaha dalam bidang"));
  const achieveIndex = blocks.findIndex((block) => blockText(block).startsWith("Untuk mencapai maksud dan tujuan tersebut"));
  const categoryBlocks = purposeIndex >= 0 && achieveIndex > purposeIndex ? blocks.slice(purposeIndex + 1, achieveIndex) : [];
  replaceParagraphRange(
    body,
    [p(23, "Perdagangan"), p(24, "Aktivitas Keuangan")],
    categoryBlocks.map((block, index) => ({ text: `${blockText(block)}${index < categoryBlocks.length - 1 ? ";" : ""}` })),
    p(23, "Perdagangan"),
  );

  p(29, "M O D A L");
  const kbliCodeParagraph = p(27, "47914");
  const kbliDescriptionParagraph = p(28, "Kelompok ini mencakup");
  // The description starts at the same text indent as the code paragraph's
  // continuation line (for example, "ATAU KONTRAK;").
  setParagraphLeftIndentTwips(kbliDescriptionParagraph, 284);
  const kbliBulletParagraph = p(23, "Perdagangan");
  const kbliEndIndex = blocks.findIndex(
    (block, index) => index > achieveIndex && block.type === "pasal-divider" && blockText(block) === "M O D A L",
  );
  const kbliBlocks = achieveIndex >= 0 && kbliEndIndex > achieveIndex
    ? blocks.slice(achieveIndex + 1, kbliEndIndex)
    : [];
  const kbliEntries: Array<{ text: string; bold?: boolean; maxWidth?: number; prototype?: ParagraphElement; keepWithNext?: boolean }> = [];
  for (let index = 0; index < kbliBlocks.length; index += 1) {
    const block = kbliBlocks[index];
    const text = blockText(block).trim();
    if (!text) continue;

    if (block.type === "list" && block.indentTabs === 1.0) {
      kbliEntries.push({ text, bold: true, maxWidth: 36.5, prototype: kbliCodeParagraph });
    } else if (block.type === "list") {
      // Keep activity bullets as separate indented list paragraphs, matching
      // the structure already produced by the form content builder.
      kbliEntries.push({ text, bold: false, maxWidth: 34.5, prototype: kbliBulletParagraph });
    } else if (block.type === "p" && block.kbliDesc) {
      const nextBlock = kbliBlocks[index + 1];
      const followedByActivityBullet = nextBlock?.type === "list" && nextBlock.indentTabs === 1.5;
      const introMatch = followedByActivityBullet
        ? text.match(/\s+(Kelompok ini (?:juga )?(?:tidak )?mencakup)$/i)
        : null;
      if (introMatch && introMatch.index !== undefined) {
        const leadInText = text.slice(0, introMatch.index).trim();
        const introText = introMatch[1].trim();
        if (leadInText) kbliEntries.push({ text: leadInText, bold: false, maxWidth: 37.5, prototype: kbliDescriptionParagraph });
        kbliEntries.push({ text: introText, bold: false, maxWidth: 37.5, prototype: kbliDescriptionParagraph, keepWithNext: true });
      } else {
        kbliEntries.push({ text, bold: false, maxWidth: 37.5, prototype: kbliDescriptionParagraph });
      }
    }
  }
  replaceParagraphRange(body, [kbliCodeParagraph, kbliDescriptionParagraph], kbliEntries, kbliCodeParagraph);

  // Capital amounts: replace the numeric and terbilang slots in the existing
  // template paragraphs, leaving their fixed wording and run formatting intact.
  const modalDasar = Number(data.modalDasar || 0);
  const nilaiPerLembar = Number(data.nilaiPerLembar || 0);
  const persen = Number(data.modalDisetorPersen ?? 25);
  const totalLembar = nilaiPerLembar ? modalDasar / nilaiPerLembar : 0;
  const modalDisetor = (modalDasar * persen) / 100;
  const disetorLembar = (totalLembar * persen) / 100;
  const baseText = formatNumber(modalDasar);
  const shareTotalText = formatNumber(totalLembar);
  const priceText = formatNumber(nilaiPerLembar);
  const paidText = formatNumber(modalDisetor);
  const paidSharesText = formatNumber(disetorLembar);
  const capitalOne = p(31, "Modal Dasar Perseroan");
  replaceBetween(capitalOne, "berjumlah Rp. ", ",-", baseText);
  replaceBetween(capitalOne, `berjumlah Rp. ${baseText},- (`, " rupiah)", terbilang(modalDasar));
  replaceBetween(capitalOne, "terbagi atas ", " (", shareTotalText);
  replaceBetween(capitalOne, `terbagi atas ${shareTotalText} (`, ") lembar saham", terbilang(totalLembar));
  replaceBetween(capitalOne, "nominal Rp. ", ",-", priceText);
  replaceBetween(capitalOne, `nominal Rp. ${priceText},- (`, " rupiah)", terbilang(nilaiPerLembar));

  const capitalTwo = p(32, "modal dasar tersebut telah ditempatkan");
  replaceBetween(capitalTwo, "disetor ", "% (", String(persen));
  replaceBetween(capitalTwo, "% (", " persen)", terbilang(persen));
  replaceBetween(capitalTwo, "atau sejumlah ", " (", paidSharesText);
  replaceBetween(capitalTwo, `atau sejumlah ${paidSharesText} (`, ") lembar saham", terbilang(disetorLembar));
  replaceBetween(capitalTwo, "sebesar Rp. ", ",-", paidText);
  replaceBetween(capitalTwo, `sebesar Rp. ${paidText},- (`, " rupiah)", terbilang(modalDisetor));

  // Tenure and first fiscal year.
  const termYears = parseInt(String(data.kuotaWaktuDireksi || "5"), 10) || 5;
  const termText = String(termYears);
  const termWords = terbilang(termYears);
  for (const index of [121, 170]) {
    const paragraph = p(index, index === 121 ? "jangka waktu" : "jangka waktu");
    replaceBetween(paragraph, "jangka waktu ", " tahun", `${termText} (${termWords})`);
  }
  const yearDate = new Date(data.tanggal);
  if (!Number.isNaN(yearDate.getTime())) {
    const year = yearDate.getFullYear();
    const fiscalDate = formatAktaDate(`${year}-12-31`);
    replaceBetween(p(192, "ditutup pada tanggal"), "ditutup pada tanggal ", ".", fiscalDate);

    const termEndDate = new Date(yearDate);
    termEndDate.setFullYear(termEndDate.getFullYear() + termYears);
    const formattedStart = formatAktaDate(data.tanggal);
    const formattedEnd = formatAktaDate(termEndDate.toISOString());
    const managementTermParagraph = p(215, "masa jabatan");
    replaceBetween(managementTermParagraph, "masa jabatan ", " (", termText);
    replaceBetween(managementTermParagraph, `masa jabatan ${termText} (`, ") tahun", termWords);
    replaceBetween(managementTermParagraph, "terhitung sejak tanggal ", " sampai dengan tanggal", formattedStart);
    replaceBetween(managementTermParagraph, "sampai dengan tanggal ", ", adalah sebagai berikut", formattedEnd);
  }

  // Initial share allocation. Keep the template's wording, bullet numbering,
  // and character formatting; only replace each shareholder's data slots.
  const shareholders = data.shareholders || [];
  const allocationRows = [p(212, "VICTORY HENDRIO"), p(213, "DONI MALVINO")];
  const allocationRowsFilled = ensureRowCount(body, allocationRows, shareholders.length, allocationRows[allocationRows.length - 1]);
  allocationRowsFilled.forEach((row, index) => {
    const shareholder = shareholders[index];
    fillShareAllocationRow(row, shareholder, Number(shareholder.sharesOwned || 0) * nilaiPerLembar);
  });
  const totalAllocationParagraph = p(214, "Sehingga seluruhnya berjumlah");
  fillShareTotalParagraph(totalAllocationParagraph, shareholders, nilaiPerLembar);

  // Management appointments.
  const roles = blocks.filter((block) => block.type === "management-role");
  const directors = roles.filter((block) => String(block.position || "").toLowerCase().includes("direktur"));
  const commissioners = roles.filter((block) => String(block.position || "").toLowerCase().includes("komisaris"));
  const directorHeading = p(216, "Anggota Direksi");
  const directorRows = [p(217, "VICTORY HENDRIO")];
  replaceRowsWithRuns(body, directorRows, directors, directorRows[0], managementRoleRuns, () => 37.1);
  if (directors.length) setKeepWithNext(directorHeading);
  else directorHeading.parentNode?.removeChild(directorHeading);

  const commissionerHeading = p(218, "Anggota Komisaris");
  const commissionerRows = [p(219, "DONI MALVINO")];
  replaceRowsWithRuns(body, commissionerRows, commissioners, commissionerRows[0], managementRoleRuns, () => 37.1);
  if (commissioners.length) setKeepWithNext(commissionerHeading);
  else commissionerHeading.parentNode?.removeChild(commissionerHeading);

  // Closing: domicile, witnesses and notary signature fields.
  const closingDomicile = [...blocks].reverse().find((block) => block.type === "list" && blockText(block).includes("Untuk sementara berada di"));
  const witnessBlocks = blocks.filter((block) => block.type === "saksi");
  const deedPlaceParagraph = p(223, "Dibuat sebagai minuta dan dilangsungkan di");
  replaceBetween(deedPlaceParagraph, "Dibuat sebagai minuta dan dilangsungkan di ", ", pada hari", notaryDomicile);
  const witnessRows = [p(224, "Nendi Suhendi"), p(225, "Siti Nur Azizah")];
  replaceRowsWithRuns(body, witnessRows, witnessBlocks, witnessRows[1], (block) => block.runs || [], () => 41.5);
  const closingDomicileParagraph = p(226, "Untuk sementara berada di");
  if (closingDomicile) {
    setParagraphText(closingDomicileParagraph, blockText(closingDomicile).replace(/^-\s*\t?/, "").trim());
  }

  const signatureParagraph = Array.from(xmlDocument.getElementsByTagNameNS(W_NS, "p"))
    .find((paragraph) => paragraphText(paragraph).includes("NUKANTINI PUTRI PARINCHA, SH., M.Kn."));
  if (signatureParagraph && data.notarisNamaSurat) {
    replaceFirst(signatureParagraph, "NUKANTINI PUTRI PARINCHA, SH., M.Kn.", templateSignatureName(data.notarisNamaSurat));
  }

  const updatedXml = new XMLSerializer().serializeToString(xmlDocument);
  zip.file("word/document.xml", updatedXml);
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

  const safeName = String(data.namaPt || "PERSEROAN")
    .trim()
    .replace(/^(PT\.?|PERSEROAN TERBATAS)\s*/i, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  const fileName = `Akta_Pendirian_PT_${safeName}.docx`;
  if (returnBlob) return { filename: fileName, blob };
  saveAs(blob, fileName);
}
