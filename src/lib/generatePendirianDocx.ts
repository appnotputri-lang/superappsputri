import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  LeaderType,
  LevelFormat,
  IParagraphOptions,
  Footer,
  PageNumber,
} from "docx";
import { saveAs } from "file-saver";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generatePendirianBlocks } from "./pendirianContentBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";

// ─── EXACT values measured from AKTA_PENDIRIAN.docx ───────────────────────────
//
// Page: A4 (11906 × 16838 twips)
// Margins: top=1418 right=616 bottom=1418 left=2880
//
// Body paragraph:     ind left=-851           tab @8364 (hyphen)
// Numbered (ayat):    ind left=-567 hang=284  tab @8364 (hyphen)   numFmt decimal "%1."
// Sub-numbered (a.):  ind left=-284 hang=284  tab @8364 (hyphen)   numFmt lowerLetter "%1."
// Bullet (dash):      ind left=-567 hang=284  tab @8364 (hyphen)   numFmt bullet "-"
// Bullet sub (KBLI):  ind left=-284 hang=284  tab @8364 (hyphen)   numFmt bullet "-"
//
// KEY: Each "PASAL N" line creates a new numId → numbering RESTARTS per pasal.
//      We generate a unique reference per pasal block.
//
// IMPORTANT: Do NOT use parseTextRuns / manual line-breaks for numbered/sub paragraphs.
//            Let Word do natural word-wrap. Only add a single trailing \t for hyphen leader.
// ──────────────────────────────────────────────────────────────────────────────

const TAB_KANAN = { type: TabStopType.RIGHT, position: 8364, leader: LeaderType.HYPHEN };

type POpts = Partial<IParagraphOptions>;
type Run = { text: string; bold?: boolean };

// Convert block runs → TextRun[]  (no line-break injection)
const toRuns = (runs: Run[]): TextRun[] =>
  runs.map((r) => new TextRun({ text: r.text, bold: !!r.bold }));

// ─── Body paragraph (normal / center / right-center) ─────────────────────────
// For regular paragraphs we keep parseTextRuns because these don't have
// a numbering label – the width estimate is needed for the hyphen-leader tab.
// But for simplicity, we just put all text + trailing \t in one paragraph too.
const createP = (
  runs: Run[],
  isRightCenter = false,
  options: POpts = {}
): Paragraph => {
  const isCentered = options.alignment === AlignmentType.CENTER;
  const children: TextRun[] = [
    ...toRuns(runs),
    ...(isCentered || isRightCenter ? [] : [new TextRun({ text: "\t" })]),
  ];

  if (isRightCenter) {
    return new Paragraph({
      children,
      tabStops: [
        { type: TabStopType.LEFT, position: 360 },
        { type: TabStopType.LEFT, position: 630 },
        { type: TabStopType.RIGHT, position: 8364, leader: LeaderType.HYPHEN },
        { type: TabStopType.RIGHT, position: 8800, leader: LeaderType.HYPHEN },
      ],
      alignment: AlignmentType.LEFT,
      indent: { left: 630, right: 28 },
      ...options,
    });
  }

  return new Paragraph({
    children,
    tabStops: isCentered ? [] : [TAB_KANAN],
    alignment: isCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: isCentered ? undefined : { left: -851 },
    ...options,
  });
};

// ─── Indented body paragraph (for indentTabs) ─────────────────────────────────
const createIndentP = (runs: Run[], leftDxa: number, options: POpts = {}): Paragraph =>
  new Paragraph({
    children: [...toRuns(runs), new TextRun({ text: "\t" })],
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa },
    ...options,
  });

// ─── KBLI description paragraph ───────────────────────────────────────────────
const createKbliDescP = (runs: Run[]): Paragraph =>
  new Paragraph({
    children: [...toRuns(runs), new TextRun({ text: "\t" })],
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: -284 },
  });

// ─── Numbered pasal ayat  "1. 2. 3." ─────────────────────────────────────────
// ind left=-567 hang=284 — NO manual line-breaks, Word wraps naturally
const createNumberedP = (runs: Run[], numRef: string): Paragraph =>
  new Paragraph({
    children: [...toRuns(runs), new TextRun({ text: "\t" })],
    numbering: { reference: numRef, level: 0 },
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: -567, hanging: 284 },
  });

// ─── Sub-numbered  "a. b. c." ─────────────────────────────────────────────────
// ind left=-284 hang=284
const createSubNumberedP = (runs: Run[], numRef: string): Paragraph =>
  new Paragraph({
    children: [...toRuns(runs), new TextRun({ text: "\t" })],
    numbering: { reference: numRef, level: 0 },
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: -284, hanging: 284 },
  });

// ─── Bullet list paragraph ────────────────────────────────────────────────────
const createListP = (runs: Run[], numRef: string, isSub = false): Paragraph =>
  new Paragraph({
    children: [...toRuns(runs), new TextRun({ text: "\t" })],
    numbering: { reference: numRef, level: 0 },
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: isSub ? -284 : -567, hanging: 284 },
  });

// ─── Divider  "─── TEXT ───" ──────────────────────────────────────────────────
const createDividerP = (text: string): Paragraph => {
  const upper = text.toUpperCase();
  // We use CENTER tab type at the midpoint of the document content area (-851 to 8364)
  // Midpoint = (-851 + 8364) / 2 = 3756.5
  return new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: ` ${upper} `, bold: true }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.CENTER, position: 3756, leader: LeaderType.HYPHEN },
      { type: TabStopType.RIGHT,  position: 8364, leader: LeaderType.HYPHEN },
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: -851 },
  });
};

// ─── Pasal divider  "─── PASAL N ───" ────────────────────────────────────────
// Text is used as-is (no toUpperCase) so "Pasal 14" stays "Pasal 14" to match the original docx.
const createPasalDividerP = (text: string): Paragraph => {
  return new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: ` ${text} `, bold: true }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.CENTER, position: 3756, leader: LeaderType.HYPHEN },
      { type: TabStopType.RIGHT,  position: 8364, leader: LeaderType.HYPHEN },
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: -851 },
  });
};

// ─── Management role  "Direktur : Nama;" ─────────────────────────────────────
const createManagementRoleListP = (position: string, nameText: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: `- ${position}` }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: `: ${nameText};` }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.LEFT, position: 1701 },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 0, hanging: 284 },
  });

// ─── Shareholder list ─────────────────────────────────────────────────────────
const createShareholderListParagraphs = (
  bullet: string,
  name: string,
  sharesText: string,
  rpText: string
): Paragraph[] => [
  new Paragraph({
    children: [
      new TextRun({ text: `${bullet}\t` }),
      new TextRun({ text: name }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: sharesText }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.LEFT, position: 850 },
      { type: TabStopType.LEFT, position: 2800 },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 2800, hanging: 2375 },
  }),
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: rpText }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.LEFT, position: 850 },
      { type: TabStopType.LEFT, position: 2977 },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 2835, hanging: 2375 },
  }),
];

// ─── Saksi (witness) ──────────────────────────────────────────────────────────
const createSaksiP = (runs: Run[], numRef: string): Paragraph =>
  new Paragraph({
    children: [...toRuns(runs), new TextRun({ text: "\t" })],
    numbering: { reference: numRef, level: 0 },
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: -567, hanging: 284 },
  });

// ─── Notaris block ────────────────────────────────────────────────────────────
const createNotarisEmptyP = (): Paragraph => new Paragraph({ children: [new TextRun("")] });

const createNotarisLabelP = (domicile: string): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: `Notaris di ${domicile};` })],
    tabStops: [
      { type: TabStopType.LEFT, position: 360 },
      { type: TabStopType.LEFT, position: 630 },
      { type: TabStopType.RIGHT, position: 8364, leader: LeaderType.HYPHEN },
      { type: TabStopType.RIGHT, position: 8800, leader: LeaderType.HYPHEN },
    ],
    indent: { left: 630, right: 28 },
  });

const createNotarisNameP = (name: string): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: name, bold: true })],
    tabStops: [
      { type: TabStopType.RIGHT, position: 8364, leader: LeaderType.HYPHEN },
      { type: TabStopType.RIGHT, position: 8800, leader: LeaderType.HYPHEN },
    ],
    indent: { left: 179, right: 28, firstLine: 142 },
  });

// ─── Assign per-pasal numbering references ────────────────────────────────────
// Each "PASAL N" block triggers new refs → numbering restarts per pasal.
function assignNumberingRefs(blocks: any[]): any[] {
  let pasalCounter = 0;
  let numberedRef = "numbered-p0";   // for shareholders intro / pre-pasal numbered
  let subRef      = "sub-p0";
  let bulletRef   = "bullet-p0";

  return blocks.map((block: any) => {
    const isManagementTitle = block.type === "numbered" && 
                              block.runs && 
                              block.runs[0] && 
                              block.runs[0].text === "Anggota Direksi :";

    if ((block.type === "pasal-divider" && /^PASAL\s*\d+/i.test(block.text)) || isManagementTitle) {
      pasalCounter++;
      numberedRef = `numbered-p${pasalCounter}`;
      subRef      = `sub-p${pasalCounter}`;
      bulletRef   = `bullet-p${pasalCounter}`;
      if (block.type === "pasal-divider") return block;
    }
    if (block.type === "numbered")     return { ...block, _numRef: numberedRef };
    if (block.type === "sub-numbered") return { ...block, _numRef: subRef };
    if (block.type === "list")         return { ...block, _numRef: bulletRef };
    if (block.type === "saksi")        return { ...block, _numRef: "saksi-list" };
    return block;
  });
}

// ─── Build docx numbering config from annotated blocks ───────────────────────
function buildNumberingConfig(blocks: any[]): any[] {
  const numberedRefs = new Set<string>();
  const subRefs      = new Set<string>();
  const bulletRefs   = new Set<string>();

  blocks.forEach((b: any) => {
    if (!b._numRef) return;
    if (b.type === "numbered" || b.type === "saksi") numberedRefs.add(b._numRef);
    else if (b.type === "sub-numbered")              subRefs.add(b._numRef);
    else if (b.type === "list")                      bulletRefs.add(b._numRef);
  });

  const config: any[] = [];

  numberedRefs.forEach((ref) => config.push({
    reference: ref,
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.START,
      style: { paragraph: { indent: { left: -567, hanging: 284 } } } }],
  }));

  subRefs.forEach((ref) => config.push({
    reference: ref,
    levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "%1.",
      alignment: AlignmentType.START,
      style: { paragraph: { indent: { left: -284, hanging: 284 } } } }],
  }));

  bulletRefs.forEach((ref) => config.push({
    reference: ref,
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "-",
      alignment: AlignmentType.START,
      style: { paragraph: { indent: { left: -567, hanging: 284 } } } }],
  }));

  // saksi always uses decimal, same indent as numbered
  config.push({
    reference: "saksi-list",
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.START,
      style: { paragraph: { indent: { left: -567, hanging: 284 } } } }],
  });

  return config;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export const generatePendirianDocx = async (data: any) => {
  const rawBlocks    = generatePendirianBlocks(data);
  const preprocessed = preprocessBlocksForWordBullets(rawBlocks);
  const blocks       = assignNumberingRefs(preprocessed);
  const numbering    = buildNumberingConfig(blocks);

  const docxChildren: Paragraph[] = [];

  blocks.forEach((block: any) => {
    switch (block.type) {
      case "p": {
        const isCentered    = block.align === "center";
        const isRightCenter = block.align === "right-center";
        const alignOpt      = isCentered ? AlignmentType.CENTER : AlignmentType.LEFT;
        if (block.kbliDesc) {
          docxChildren.push(createKbliDescP(block.runs));
        } else if (block.indentTabs && !isCentered && !isRightCenter) {
          const leftDxa = Math.round((block.indentTabs || 0) * 850);
          docxChildren.push(createIndentP(block.runs, leftDxa, { alignment: alignOpt }));
        } else {
          docxChildren.push(createP(block.runs, isRightCenter, { alignment: alignOpt }));
        }
        break;
      }
      case "divider":
        docxChildren.push(createDividerP(block.text));
        break;
      case "pasal-divider":
        docxChildren.push(createPasalDividerP(block.text));
        break;
      case "list":
        docxChildren.push(createListP(block.runs, block._numRef, (block.indentTabs || 0) > 0));
        break;
      case "numbered":
        docxChildren.push(createNumberedP(block.runs, block._numRef));
        break;
      case "sub-numbered":
        docxChildren.push(createSubNumberedP(block.runs, block._numRef));
        break;
      case "management-role":
        docxChildren.push(createManagementRoleListP(block.position, block.nameText));
        break;
      case "shareholder":
        docxChildren.push(...createShareholderListParagraphs(
          block.bullet || "-", block.name, block.sharesText, block.rpText
        ));
        break;
      case "saksi":
        docxChildren.push(createSaksiP(block.runs, block._numRef));
        break;
      case "br":
        docxChildren.push(new Paragraph({ children: [new TextRun("")] }));
        break;
    }
  });

  // Append notaris block if not already present in content
  const hasNotarisBottom = blocks.some(
    (b: any) => b.type === "p" && b.align === "right-center"
  );
  if (!hasNotarisBottom) {
    docxChildren.push(createNotarisLabelP("Kabupaten Bandung Barat"));
    docxChildren.push(createNotarisEmptyP());
    docxChildren.push(createNotarisEmptyP());
    docxChildren.push(createNotarisNameP("NUKANTINI PUTRI PARINCHA, SH., M.KN."));
  }

  const doc = new Document({
    numbering: { config: numbering },
    styles: {
      default: {
        document: {
          run: { font: "Century Gothic", size: 20 },
          paragraph: {
            spacing: { line: 480, before: 0, after: 0 },
            indent:  { left: 0, right: 0, firstLine: 0 },
            alignment: AlignmentType.LEFT,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size:   { width: 11906, height: 16838 },
          margin: { top: 1418, bottom: 1418, left: 2880, right: 616 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT] })],
          })],
        }),
      },
      children: docxChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = data?.namaPt
    ? String(data.namaPt).replace(/PT\.?\s*/i, "").trim()
    : "Draft";
  saveAs(blob, `Akta_Pendirian_${safeName}.docx`);
};