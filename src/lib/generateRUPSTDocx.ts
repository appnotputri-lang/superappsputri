import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType, LeaderType,
  IParagraphOptions, Footer, PageNumber,
  Table, TableRow, TableCell, WidthType, PageBreak,
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData } from "../../types";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generateRupstBlocks } from "./rupsTahunanContentBlocks";

// ─── Tab stop kanan dengan leader hyphen — dipakai di SEMUA paragraf ───────────
// XML: <w:tab w:val="right" w:leader="hyphen" w:pos="8504"/>
const TAB_KANAN = { type: TabStopType.RIGHT, position: 8504, leader: LeaderType.HYPHEN };

// ─── Lebar teks (em) untuk word-wrap, disesuaikan per level indent ─────────────
const W = {
  normal:   41.5,  // paragraf normal (tanpa indent)
  list05:   39.5,  // indentTabs=0.5 → left=284
  list10:   37.5,  // indentTabs=1.0 → left=567
  list15:   37.5,  // indentTabs=1.5 → left=567
  list20:   36.0,  // indentTabs=2.0 → left=993
  list25:   36.0,  // indentTabs=2.5 → left=993
  list30:   34.0,  // indentTabs=3.0 → left=1418
  numbered: 38.5,  // "p" number≥1   → left=284, tabLeft=720
  saksi:    39.5,  // saksi          → left=426
};

// ─── Helper: buat TextRun dari token ──────────────────────────────────────────
const makeRun = (t: FormatToken) => new TextRun({
  text: t.text,
  bold: t.bold,
  italics: t.italic,
  underline: t.underline ? {} : undefined,
  color: t.color,
  size: t.size ? t.size * 2 : undefined,
});

// ─── Paragraf normal (tanpa indent, dengan tab kanan) ─────────────────────────
// XML: <w:tabs><w:tab w:val="right" w:leader="hyphen" w:pos="8504"/></w:tabs>
const createP = (
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const isCentered = options.alignment === AlignmentType.CENTER;
  const lines = parseTextRuns(tokens, W.normal);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(makeRun(t)));
    if (!isCentered) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: isCentered ? [] : [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    ...options,
  });
};

// ─── Paragraf bernomor (keputusan 1–5 dan attendee list) ─────────────────────
// XML: <w:ind w:left="284" w:hanging="284"/>
//      <w:tab w:val="left" w:pos="720"/>
//      <w:tab w:val="right" w:leader="hyphen" w:pos="8504"/>
const createNumberedP = (
  num: number | string,
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W.numbered);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    lineTokens.forEach((t) => children.push(makeRun(t)));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [
      { type: TabStopType.LEFT, position: 720 },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 284, hanging: 284 },
    ...options,
  });
};

// ─── Paragraf bernomor — varian B: WNA / teks uraian panjang ─────────────────
// XML: <w:ind w:left="709" w:hanging="425"/>
//      <w:tab w:val="left" w:pos="720"/>
//      <w:tab w:val="right" w:leader="hyphen" w:pos="8504"/>
const createNumberedPWna = (
  num: number | string,
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W.numbered);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    lineTokens.forEach((t) => children.push(makeRun(t)));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [
      { type: TabStopType.LEFT, position: 720 },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 709, hanging: 425 },
    ...options,
  });
};

// ─── List "-" dengan berbagai level indent ────────────────────────────────────
// Mapping indentTabs → nilai DXA (100% dari XML Contohrupst.docx):
//
//  0.5 → left=284,  hanging=284, tabLeft=284,  rightTab=8504
//  1.0 → left=567,  hanging=283, tabLeft=567,  rightTab=8504
//  1.5 → left=567,  hanging=284, tabLeft=284,  rightTab=8504
//  2.0 → left=993,  hanging=284, TANPA tabLeft, rightTab=8504
//  2.5 → left=993,  no-hang,    tabLeft=284,   rightTab=8504  ("Hadir selaku :")
//  3.0 → left=1418, no-hang,    tabLeft=567,   rightTab=8504  (a. b. c.)
//  0   → left=720,  hanging=360, tabLeft=720,   rightTab=8504  (numId=3/5, Laporan Keuangan / saksi footer)
const createListP = (
  bulletText: string,
  tokens: FormatToken[],
  indentTabs: number = 0.5,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  let leftDxa: number;
  let hangingDxa: number | undefined;
  let tabLeftDxa: number | undefined;
  let maxW: number;

  if (indentTabs === 0) {
    // numId=3/5 style: left=720, hanging=360, tabLeft=720
    leftDxa = 720; hangingDxa = 360; tabLeftDxa = 720; maxW = W.list10;
  } else if (indentTabs <= 0.6) {
    // 0.5 → left=284, hanging=284, tabLeft=284
    leftDxa = 284; hangingDxa = 284; tabLeftDxa = 284; maxW = W.list05;
  } else if (indentTabs <= 1.1) {
    // 1.0 → left=567, hanging=283, tabLeft=567
    leftDxa = 567; hangingDxa = 283; tabLeftDxa = 567; maxW = W.list10;
  } else if (indentTabs <= 1.6) {
    // 1.5 → left=567, hanging=284, tabLeft=284
    leftDxa = 567; hangingDxa = 284; tabLeftDxa = 284; maxW = W.list15;
  } else if (indentTabs <= 2.1) {
    // 2.0 → left=993, hanging=284, TANPA tabLeft
    leftDxa = 993; hangingDxa = 284; tabLeftDxa = undefined; maxW = W.list20;
  } else if (indentTabs <= 2.6) {
    // 2.5 → left=993, no hanging, tabLeft=284  ("Hadir selaku :")
    leftDxa = 993; hangingDxa = undefined; tabLeftDxa = 284; maxW = W.list25;
  } else {
    // 3.0 → left=1418, no hanging, tabLeft=567  (a. b. c.)
    leftDxa = 1418; hangingDxa = undefined; tabLeftDxa = 567; maxW = W.list30;
  }

  const lines = parseTextRuns(tokens, maxW);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${bulletText}\t` }));
    lineTokens.forEach((t) => children.push(makeRun(t)));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  const tabStops: any[] = [];
  if (tabLeftDxa !== undefined) {
    tabStops.push({ type: TabStopType.LEFT, position: tabLeftDxa });
  }
  tabStops.push(TAB_KANAN);

  return new Paragraph({
    children,
    tabStops,
    alignment: AlignmentType.LEFT,
    indent: {
      left: leftDxa,
      ...(hangingDxa !== undefined ? { hanging: hangingDxa } : {}),
    },
    ...options,
  });
};

// ─── Saksi (witness) paragraf ─────────────────────────────────────────────────
// XML: <w:ind w:left="426" w:hanging="360"/>
//      <w:tab w:val="right" w:leader="hyphen" w:pos="8504"/>  (TANPA tabLeft)
const createSaksiP = (
  num: number,
  tokens: FormatToken[]
): Paragraph => {
  const lines = parseTextRuns(tokens, W.saksi);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    lineTokens.forEach((t) => children.push(makeRun(t)));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 426, hanging: 360 },
  });
};

// ─── Divider "DEMIKIANLAH AKTA INI" ──────────────────────────────────────────
// XML: <w:tab w:val="center" w:leader="hyphen" w:pos="4252"/>
//      <w:tab w:val="right"  w:leader="hyphen" w:pos="8504"/>
const createDividerP = (text: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text, bold: true }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.CENTER, position: 4252, leader: LeaderType.HYPHEN },
      { type: TabStopType.RIGHT,  position: 8504, leader: LeaderType.HYPHEN },
    ],
    alignment: AlignmentType.LEFT,
  });

// ─── Tab stops untuk tanda tangan notaris ────────────────────────────────────
// XML: <w:tab w:val="left" w:pos="4395"/>
//      <w:tab w:val="right" w:leader="hyphen" w:pos="8504"/>
const NOTARIS_TAB_STOPS = [
  { type: TabStopType.LEFT, position: 4395 },
  TAB_KANAN,
];

const createNotarisEmptyP = (): Paragraph =>
  new Paragraph({ children: [], tabStops: NOTARIS_TAB_STOPS });

const createNotarisLabelP = (domicile: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: `Notaris di ${domicile};` }),
    ],
    tabStops: NOTARIS_TAB_STOPS,
  });

const createNotarisNameP = (name: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: name, bold: true }),
    ],
    tabStops: NOTARIS_TAB_STOPS,
  });

export const generateRUPSTDocx = async (data: CompanyData) => {
  const blocks = generateRupstBlocks(data);
  const docxChildren: any[] = [];

  blocks.forEach((block) => {
    if (block.type === "p") {
      if (block.number) {
        // indentTabs=-1 → Varian B: WNA/teks panjang (left=709, hang=425, tabLeft=720)
        if (block.indentTabs === -1) {
          docxChildren.push(createNumberedPWna(block.number, block.runs));
        } else {
          // Varian A: WNI/isRep (left=284, hang=284, tabLeft=720) — default keputusan & attendee WNI
          docxChildren.push(createNumberedP(block.number, block.runs));
        }
      } else if (block.align === "center") {
        docxChildren.push(createP(block.runs, { alignment: AlignmentType.CENTER }));
      } else {
        docxChildren.push(createP(block.runs));
      }
    } else if (block.type === "list") {
      docxChildren.push(createListP(block.bullet, block.runs, block.indentTabs ?? 0.5));
    } else if (block.type === "saksi") {
      docxChildren.push(createSaksiP((block as any).number, block.runs));
    } else if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
    } else if (block.type === "br") {
      docxChildren.push(new Paragraph({ children: [] }));
    } else if (block.type === "pageBreak") {
      docxChildren.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (block.type === "table") {
      const headerRow = new TableRow({
        children: block.headers.map((h, i) => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })], alignment: AlignmentType.CENTER })],
          width: block.widths ? { size: block.widths[i], type: WidthType.DXA } : undefined,
        })),
      });

      const bodyRows = block.rows.map((row) => new TableRow({
        children: row.map((cell, i) => {
          let cellChildren: Paragraph[] = [];
          if (Array.isArray(cell)) {
            cellChildren = [createP(cell, { alignment: AlignmentType.LEFT })];
          } else {
            const cellLines = cell.split("\n");
            cellChildren = cellLines.map(line => new Paragraph({
              children: [new TextRun({ text: line, size: 20 })],
              alignment: AlignmentType.CENTER,
            }));
          }
          return new TableCell({
            children: cellChildren,
            width: block.widths ? { size: block.widths[i], type: WidthType.DXA } : undefined,
          });
        }),
      }));

      docxChildren.push(new Table({
        rows: [headerRow, ...bodyRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }));
    }
  });

  // ─── Footer notaris ────────────────────────────────────────────────────────
  const domicile = data.notaryDomicile || "Kabupaten Bandung Barat";
  const notaryDisplay = (data.notaryName || "NUKANTINI PUTRI PARINCHA, SH., M.Kn.")
    .toUpperCase()
    .replace(/SARJANA HUKUM/gi, "SH.")
    .replace(/MAGISTER KENOTARIATAN/gi, "M.Kn");

  docxChildren.push(createNotarisLabelP(domicile));
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisNameP(notaryDisplay));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Century Gothic", size: 20 },
          paragraph: {
            spacing: { line: 480, before: 0, after: 0 },
            alignment: AlignmentType.LEFT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1417, bottom: 1417, left: 2268, right: 1134 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: ["- ", PageNumber.CURRENT, " -"] })],
              }),
            ],
          }),
        },
        children: docxChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Notulen RUPST ${data.companyName}.docx`);
};