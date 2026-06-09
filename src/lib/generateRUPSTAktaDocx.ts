import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType, LeaderType,
  IParagraphOptions, Footer, PageNumber,
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData } from "../../types";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generateRupstAktaBlocks } from "./rupsTahunanAktaContentBlocks";

const TAB_KANAN = { type: TabStopType.RIGHT, position: 8504, leader: LeaderType.HYPHEN };

const W = {
  normal:   41.5,
  list0:    40.0,  // dash (-) left=284: bullet di margin, teks di 284 (paling dangkal)
  list1:    37.5,  // dash (-) left=568: bullet di 284, teks di 568
  list2:    35.0,  // sub-list (a.,b.) left=850
  list3:    33.0,  // deep sub-list left=851+
  numbered: 38.0,
};

const createP = (
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const isCentered = options.alignment === AlignmentType.CENTER;
  const lines = parseTextRuns(tokens, W.normal);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(new TextRun({ 
      text: t.text, 
      bold: t.bold,
      color: t.color,
      italics: t.italic,
      underline: t.underline ? {} : undefined
    })));
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

const createIndentP = (
  tokens: FormatToken[],
  leftDxa: number,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W.normal - (leftDxa / 850) * 2.2);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(new TextRun({ 
      text: t.text, 
      bold: t.bold,
      color: t.color,
      italics: t.italic,
      underline: t.underline ? {} : undefined
    })));
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

const createListP = (
  bulletText: string,
  tokens: FormatToken[],
  indentTabs: number = 0,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  let leftDxa: number, hangingDxa: number, maxW: number;

  // Match exact docx structure:
  // Level 0a (dash "-", indentTabs≤0.3): left=284, hanging=284 → bullet di 0 (margin), teks di 284
  // Level 0b (dash "-", indentTabs≤0.6): left=568, hanging=284 → bullet di 284, teks di 568
  // Level 1 (a., b., indentTabs≤1.0):   left=850, hanging=283 → bullet di 567, teks di 850
  // Level 2+:                            left=851, hanging=284
  if (indentTabs <= 0.3)      { leftDxa = 284;  hangingDxa = 284; maxW = W.list0; }
  else if (indentTabs <= 0.6) { leftDxa = 568;  hangingDxa = 284; maxW = W.list1; }
  else if (indentTabs <= 1.0) { leftDxa = 850;  hangingDxa = 283; maxW = W.list2; }
  else if (indentTabs <= 1.5) { leftDxa = 1134; hangingDxa = 284; maxW = W.list3; }
  else if (indentTabs <= 2.0) { leftDxa = 1418; hangingDxa = 284; maxW = W.list3; }
  else                        { leftDxa = 1702; hangingDxa = 284; maxW = W.list3; }

  const lines = parseTextRuns(tokens, maxW);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0 && bulletText) children.push(new TextRun({ text: `${bulletText}\t` }));
    lineTokens.forEach((t) => children.push(new TextRun({ 
      text: t.text, 
      bold: t.bold,
      color: t.color,
      italics: t.italic,
      underline: t.underline ? {} : undefined
    })));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  // Tab stop kiri di leftDxa: bullet snap ke (leftDxa-hanging), lalu \t snap ke leftDxa
  const leftTabPos = leftDxa;

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: leftTabPos }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa, hanging: bulletText ? hangingDxa : 0 },
    ...options,
  });
};

const createNumberedP = (
  num: number | string,
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W.numbered);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    lineTokens.forEach((t) => children.push(new TextRun({ 
      text: t.text, 
      bold: t.bold,
      color: t.color,
      italics: t.italic,
      underline: t.underline ? {} : undefined
    })));
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

const createSaksiP = (
  num: number,
  tokens: FormatToken[]
): Paragraph => {
  const lines = parseTextRuns(tokens, 39.5);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    lineTokens.forEach((t) => children.push(new TextRun({ 
      text: t.text, 
      bold: t.bold,
      color: t.color,
      italics: t.italic,
      underline: t.underline ? {} : undefined
    })));
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

const createNotarisNameP = (name: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: name, bold: true }),
    ],
    tabStops: NOTARIS_TAB_STOPS,
  });

// Dash "-" di level sub (indentTabs 1.0): struktur sesuai numId=3 di docx
// abstractNum left=720, hanging=360 → bullet di pos 360, teks di 720
// left tab di 720, tanpa w:ind override (pakai nilai dari numbering)
const createDashSubP = (
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W.numbered);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: "-\t" }));
    lineTokens.forEach((t) => children.push(new TextRun({ 
      text: t.text, 
      bold: t.bold,
      color: t.color,
      italics: t.italic,
      underline: t.underline ? {} : undefined
    })));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: 720 }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 720, hanging: 360 },
    ...options,
  });
};

export const generateRUPSTAktaDocx = async (data: CompanyData) => {
  const blocks = generateRupstAktaBlocks(data);
  const docxChildren: any[] = [];

  blocks.forEach((block) => {
    if (block.type === "p") {
      if (block.number) {
        docxChildren.push(createNumberedP(block.number, block.runs));
      } else if (block.align === "center") {
        docxChildren.push(createP(block.runs, { alignment: AlignmentType.CENTER }));
      } else if ((block as any).indentLeft !== undefined) {
        // Paragraf dengan indent kiri spesifik (tanpa hanging): Minuta=426, Diberikan=993
        docxChildren.push(createIndentP(block.runs, (block as any).indentLeft));
      } else if (block.indent) {
        docxChildren.push(createIndentP(block.runs, 284));
      } else {
        docxChildren.push(createP(block.runs));
      }
    } else if (block.type === "list") {
      const indentTabs = block.indentTabs || 0;
      const bullet = block.bullet;

      if (bullet === "" && indentTabs >= 1.0) {
        // Bullet kosong di level 1 → paragraf indent left=284 tanpa hanging
        // (contoh: "Direksi dan Komisaris...", "sehubungan dengan hal tersebut...")
        docxChildren.push(createIndentP(block.runs, 284));
      } else if (bullet === "-" && indentTabs >= 1.0) {
        // Dash di level 1 → left=720, hanging=360 sesuai numId=3 abstractNum=1
        // (contoh: "Laporan Keuangan...", "Laporan mengenai...")
        docxChildren.push(createDashSubP(block.runs));
      } else {
        docxChildren.push(createListP(bullet, block.runs, indentTabs));
      }
    } else if (block.type === "saksi") {
      docxChildren.push(createSaksiP((block as any).number, block.runs));
    } else if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
    }
  });

  const domicile = data.notaryDomicile || "Kabupaten Bandung Barat";
  const notaryDisplay = (data.notaryName || "NUKANTINI PUTRI PARINCHA, S.H., M.Kn.")
    .toUpperCase()
    .replace(/SARJANA HUKUM/gi, "S.H.")
    .replace(/MAGISTER KENOTARIATAN/gi, "M.Kn.");

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
  saveAs(blob, `Draft Akta RUPST ${data.companyName}.docx`);
};