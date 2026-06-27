/**
 * generateRUPSDocx.ts — DIPERBAIKI sesuai contoh_6.docx
 *
 * Perbaikan dari versi sebelumnya:
 * 1. Footer "Notaris di..." menggunakan tab kiri pos 4395 (bukan indent left=4252+center)
 *    Format: \t + "Notaris di Kabupaten Bandung Barat ;"
 * 2. Nama notaris: \t + bold text, tab kiri pos 4395
 * 3. Setelah "Notaris di...": 2 baris kosong, baris apostrof "'", 1 baris kosong, nama notaris
 *    (semua dengan tab kiri 4395 + tab kanan 8504)
 * 4. Shareholder-list: DIPISAH jadi 2 paragraf — baris pertama (nama + jumlah lembar),
 *    baris kedua (Rp. ... indented dengan tab dobel)
 * 5. Management-list (susunan akhir): tabs di 1134 dan 2268, indent left=2800, hanging=2516
 * 6. "Masa jabatan" paragraf: indent left=284
 * 7. "Minuta Akta" indent left=850 (bukan indentTabs: 1 * 850)
 * 8. "Diberikan" indent left=1700 (bukan indentTabs: 2 * 850)
 */

import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType, LeaderType,
  IParagraphOptions, Footer, PageNumber,
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData, Shareholder } from "../../types";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generateRupsBlocks } from "./rupsContentBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";

// ──────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS (disamakan dengan Akta RUPS T)
// Halaman A4: w=11906, h=16838
// Margin: left=2268, right=618, top=1418, bottom=1418
// Lebar konten: 9020 DXA
// ──────────────────────────────────────────────────────────────────────────────

const TAB_KANAN_NO_LEADER = { type: TabStopType.RIGHT, position: 9020, leader: LeaderType.NONE };
const TAB_KANAN = { type: TabStopType.RIGHT, position: 9020, leader: LeaderType.HYPHEN };

const W = {
  normal:   44.0,
  list1:    42.5,   // (9020 - 284)/204.9 ≈ 42.6 -> 42.5
  list2:    41.0,   // (9020 - 567)/204.9 ≈ 41.2 -> 41.0
  list3:    39.5,   // (9020 - 851)/204.9 ≈ 39.8 -> 39.5
  numbered: 41.5,
  subnr:    41.0,
  rcenter:  20.5,
};

// ──────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/** Paragraf normal (dengan tab kanan) */
const createP = (
  tokens: FormatToken[],
  isRightCenter = false,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const isCentered = options.alignment === AlignmentType.CENTER;
  const lines = parseTextRuns(tokens, isRightCenter ? W.rcenter : W.normal);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    if (!isCentered && !isRightCenter) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  let finalOptions: any = { ...options };
  if (isRightCenter) {
    finalOptions.indent = { left: 4252 };
    finalOptions.alignment = AlignmentType.CENTER;
  }

  return new Paragraph({
    children,
    tabStops: isCentered ? [] : [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    ...finalOptions,
  });
};

/**
 * Paragraf khusus deskripsi KBLI — left=851.
 */
const createKbliDescP = (tokens: FormatToken[]): Paragraph => {
  const lines = parseTextRuns(tokens, W.list3);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    children.push(new TextRun({ text: '\t' }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 851 },
  });
};

/** Paragraf dengan indent kiri manual (tanpa numbering) */
const createIndentP = (
  tokens: FormatToken[],
  leftDxa: number,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W.normal - (leftDxa / 850) * 2.2);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa },
    ...options,
  });
};

/**
 * Bullet dash list (-).
 */
const createListP = (
  bulletText: string,
  tokens: FormatToken[],
  indentTabs: number = 0,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  let leftDxa: number, hangingDxa: number, tabKiriPos: number, maxW: number;

  if (indentTabs <= 0.6)                         { leftDxa = 284;  hangingDxa = 284; tabKiriPos = 0;    maxW = W.list1; }
  else if (indentTabs <= 1.0)                    { leftDxa = 567;  hangingDxa = 283; tabKiriPos = 284;  maxW = W.list2; }
  else if (indentTabs > 1.0 && indentTabs < 1.4){ leftDxa = 1134; hangingDxa = 360; tabKiriPos = 774;  maxW = W.list3; }
  else if (indentTabs <= 1.9)                    { leftDxa = 567;  hangingDxa = 283; tabKiriPos = 284;  maxW = W.list2; }
  else if (indentTabs === 2)                     { leftDxa = 1417; hangingDxa = 283; tabKiriPos = 1134; maxW = W.list3; }
  else                                           { leftDxa = 851;  hangingDxa = 284; tabKiriPos = 567;  maxW = W.list3; }

  const lines = parseTextRuns(tokens, maxW);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${bulletText}\t` }));
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: leftDxa }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa, hanging: hangingDxa },
    ...options,
  });
};

/**
 * Numbered decimal — untuk keputusan (1. 2. 3. …)
 * Sesuai XML contoh_6.docx: left=284, hanging=284, tab kiri di 720
 */
const createNumberedP = (
  num: number | string,
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W.numbered);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: 720 }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 284, hanging: 284 },
    ...options,
  });
};

/**
 * Sub-numbered 1) 2) — untuk sub-pasal
 */
const createSubNumberedP = (
  num: number | string,
  tokens: FormatToken[],
  indentTabs: number = 0
): Paragraph => {
  const leftDxa = 568 + Math.round(indentTabs * 425);
  const hangingDxa = 284;
  const lines = parseTextRuns(tokens, W.subnr - (indentTabs * 2.2));
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num})\t` }));
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: leftDxa }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa, hanging: hangingDxa },
  });
};

/**
 * "Pasal X" divider — tab center di 4252, tab kanan
 */
const createPasalDividerP = (text: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text, bold: true }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.CENTER, position: 4252, leader: LeaderType.HYPHEN },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
  });

/**
 * "DEMIKIANLAH AKTA INI" divider — tab center di 4252
 */
const createDividerP = (text: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text, bold: true }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.CENTER, position: 4252, leader: LeaderType.HYPHEN },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
  });

/**
 * Management summary list — sesuai XML contoh_6.docx:
 * tab kiri di 1134 dan 2268, tab kanan di 8504
 * indent left=2800, hanging=2516
 * Format: POSITION[TAB]: NAME;
 */
const createManagementRoleListP = (
  position: string,
  nameText: string
): Paragraph => {
  // Sesuai XML contoh_6.docx:
  // Format: [Jabatan][TAB]: [Nama];[TAB kanan]
  // Tab kiri diperlebar (misal 3402 atau 3969) agar jabatan panjang tidak menabrak `\t` pertama.
  return new Paragraph({
    children: [
      new TextRun({ text: position }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: `: ${nameText};` }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.LEFT, position: 3969 }, // 3969 = 2.75 inches
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 284 },
  });
};

/**
 * Shareholder list — sesuai XML contoh_6.docx:
 * DIPISAH 2 paragraf:
 * Paragraf 1: -[TAB]NAMA[TAB]: xxx lembar saham atau senilai
 *   tabs: 850, 2800, kanan 8504; indent left=2800, hanging=2375
 * Paragraf 2: [TAB][TAB]Rp. xxx,-  (continuation)
 *   tabs: 850, 2800/2977, kanan 8504; indent left=2835, hanging=2375
 *
 * Fungsi ini mengembalikan ARRAY 2 paragraf.
 */
const createShareholderListParagraphs = (
  bullet: string,
  name: string,
  sharesText: string,
  rpText: string
): Paragraph[] => {
  if (name.includes(", lahir") || name.length > 80) {
    const cleanShares = sharesText.replace(/^:\s*/, "").replace(/^\s*sebanyak\s*/, "").trim();
    const fullCombinedText = `, sebanyak ${cleanShares} ${rpText}`;
    
    const firstCommaIdx = name.indexOf(",");
    let boldPart = name;
    let normalPart = "";
    if (firstCommaIdx !== -1) {
      boldPart = name.substring(0, firstCommaIdx);
      normalPart = name.substring(firstCommaIdx);
    }

    const tokens: FormatToken[] = [
      { text: boldPart, bold: true },
      { text: normalPart },
      { text: fullCombinedText }
    ];

    const lines = parseTextRuns(tokens, W.list1);
    const children: any[] = [];
    lines.forEach((lineTokens, i) => {
      if (i === 0) {
        children.push(new TextRun({ text: `${bullet}\t` }));
      }
      lineTokens.forEach((t) => {
        children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any }));
      });
      children.push(new TextRun({ text: "\t" }));
      if (i < lines.length - 1) {
        children.push(new TextRun({ break: 1 }));
      }
    });

    return [
      new Paragraph({
        children,
        tabStops: [
          { type: TabStopType.LEFT, position: 284 },
          TAB_KANAN,
        ],
        alignment: AlignmentType.LEFT,
        indent: { left: 284, hanging: 284 },
      })
    ];
  }

  const p1 = new Paragraph({
    children: [
      new TextRun({ text: `${bullet}\t` }),
      new TextRun({ text: name }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: `${sharesText}` }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.LEFT, position: 850 },
      { type: TabStopType.LEFT, position: 2800 },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 2800, hanging: 2375 },
  });

  const p2 = new Paragraph({
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
  });

  return [p1, p2];
};

/**
 * Numbered saksi (1. 2.) — left=720, hanging=360, tab kiri di 720
 */
const createSaksiP = (
  num: number,
  tokens: FormatToken[]
): Paragraph => {
  // Sesuai XML contoh_7.docx: left=426, hanging=360, hanya tab kanan di 8504
  // Format: 1.[TAB]NENDI SUHENDI, lahir di...
  // Teks wrap mulai di left=426 (sejajar dengan nama setelah nomor)
  const lines = parseTextRuns(tokens, 39.5);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
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

// ──────────────────────────────────────────────────────────────────────────────
// FOOTER NOTARIS HELPERS
// ──────────────────────────────────────────────────────────────────────────────

const NOTARIS_TAB_STOPS = [
  { type: TabStopType.LEFT, position: 4395 },
  TAB_KANAN,
];

const createNotarisEmptyP = (): Paragraph =>
  new Paragraph({
    children: [],
    tabStops: NOTARIS_TAB_STOPS,
  });

const createNotarisLabelP = (domicile: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: `Notaris di ${domicile};` }),
    ],
    tabStops: NOTARIS_TAB_STOPS,
  });

const createNotarisSignP = (): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
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

// ──────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ──────────────────────────────────────────────────────────────────────────────

export const generateRUPSDocx = async (data: CompanyData) => {
  const rawBlocks = generateRupsBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);
  const docxChildren: any[] = [];

  blocks.forEach((block) => {
    if (block.type === "p") {
      const isCentered    = block.align === "center";
      const isRightCenter = block.align === "right-center";
      const alignOpt      = isCentered ? AlignmentType.CENTER : AlignmentType.LEFT;
      const opts: Omit<IParagraphOptions, "children"> = { alignment: alignOpt };

      if (block.number && !isCentered && !isRightCenter) {
        docxChildren.push(createNumberedP(block.number, block.runs, opts));
      } else if ((block as any).subNumber && !isCentered) {
        docxChildren.push(createSubNumberedP((block as any).subNumber, block.runs, block.indentTabs || 0));
      } else if (block.indentTabs && !isCentered && !isRightCenter) {
        if ((block as any).kbliDesc) {
          docxChildren.push(createKbliDescP(block.runs));
        } else {
          // "Minuta Akta" indentTabs=1 → left=850
          // "Diberikan"   indentTabs=2 → left=1700
          const leftDxa = Math.round((block.indentTabs || 0) * 850);
          docxChildren.push(createIndentP(block.runs, leftDxa, opts));
        }
      } else if ((block as any).indent && !isCentered && !isRightCenter) {
        // indent:true → left=284
        docxChildren.push(createIndentP(block.runs, 284, opts));
      } else {
        docxChildren.push(createP(block.runs, isRightCenter, opts));
      }
    } else if (block.type === "list") {
      docxChildren.push(createListP(block.bullet, block.runs, block.indentTabs || 0));
    } else if (block.type === "shareholder-list") {
      // PERBAIKAN UTAMA: 2 paragraf terpisah sesuai contoh_6.docx
      const paragraphs = createShareholderListParagraphs(
        block.bullet,
        block.name,
        block.sharesText,
        block.rpText
      );
      paragraphs.forEach((p) => docxChildren.push(p));
    } else if (block.type === "management-list") {
      // PERBAIKAN: tabs di 1134 dan 2268, indent left=2800 hanging=2516
      docxChildren.push(createManagementRoleListP(block.position, block.name));
    } else if (block.type === "saksi") {
      docxChildren.push(createSaksiP((block as any).number, (block as any).runs));
    } else if (block.type === "divider") {
      if (block.text && block.text.toLowerCase().includes("pasal")) {
        docxChildren.push(createPasalDividerP(block.text));
      } else {
        docxChildren.push(createDividerP(block.text));
      }
    }
  });

  const domicile = data.newAddress?.city || data.domicile || "Kabupaten Bandung Barat";
  const notaryDisplay = (data.notaryName || "NUKANTINI PUTRI PARINCHA, SH., M.Kn")
    .toUpperCase()
    .replace(/SARJANA HUKUM/gi, "SH.")
    .replace(/S\.H\./g, "SH.")
    .replace(/MAGISTER KENOTARIATAN/gi, "M.Kn")
    .replace(/M\.KN\./g, "M.Kn")
    .replace(/M\.KN/g, "M.Kn")
    .trim();

  docxChildren.push(createNotarisLabelP("Kabupaten Bandung Barat"));
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisNameP(notaryDisplay));

  // ── BUILD DOCUMENT
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Century Gothic", size: 20 },
          paragraph: {
            spacing: { line: 480, before: 0, after: 0 },
            indent: { left: 0, right: 0, firstLine: 0 },
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
            margin: { top: 1418, bottom: 1418, left: 2268, right: 618 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: ["- ", PageNumber.CURRENT, " -"],
                  }),
                ],
              }),
            ],
          }),
        },
        children: docxChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = data.companyName ? data.companyName.replace(/PT\.?\s*/i, "").trim() : "Draft";
  const fileName = `Draft Akta RUPS PT ${safeName}`;
  saveAs(blob, `${fileName}.docx`);
};