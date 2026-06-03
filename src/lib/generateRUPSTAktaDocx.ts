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
  list1:    39.0,
  list2:    36.5,
  list3:    34.0,
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
  indentTabs: number = 0.5,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  // Nilai DXA 100% dari XML Contohrupst.docx
  let leftDxa: number;
  let hangingDxa: number | undefined;
  let tabLeftDxa: number | undefined;
  let maxW: number;

  if (indentTabs === 0) {
    // numId=3/5: left=720, hanging=360, tabLeft=720 (Laporan Keuangan / saksi footer)
    leftDxa = 720; hangingDxa = 360; tabLeftDxa = 720; maxW = W.list2;
  } else if (indentTabs <= 0.6) {
    // 0.5 → left=284, hanging=284, tabLeft=284
    leftDxa = 284; hangingDxa = 284; tabLeftDxa = 284; maxW = W.list1;
  } else if (indentTabs <= 1.1) {
    // 1.0 → left=567, hanging=283, tabLeft=567
    leftDxa = 567; hangingDxa = 283; tabLeftDxa = 567; maxW = W.list2;
  } else if (indentTabs <= 1.6) {
    // 1.5 → left=567, hanging=284, tabLeft=284
    leftDxa = 567; hangingDxa = 284; tabLeftDxa = 284; maxW = W.list2;
  } else if (indentTabs <= 2.1) {
    // 2.0 → left=993, hanging=284, TANPA tabLeft
    leftDxa = 993; hangingDxa = 284; tabLeftDxa = undefined; maxW = W.list3;
  } else if (indentTabs <= 2.6) {
    // 2.5 → left=993, tanpa hanging, tabLeft=284 ("Hadir selaku :")
    leftDxa = 993; hangingDxa = undefined; tabLeftDxa = 284; maxW = W.list3;
  } else {
    // 3.0 → left=1418, tanpa hanging, tabLeft=567 (a. b. c.)
    leftDxa = 1418; hangingDxa = undefined; tabLeftDxa = 567; maxW = W.list3;
  }

  const lines = parseTextRuns(tokens, maxW);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${bulletText}\t` }));
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

// Varian B: WNA / teks uraian panjang
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
    indent: { left: 709, hanging: 425 },
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

export const generateRUPSTAktaDocx = async (data: CompanyData) => {
  const blocks = generateRupstAktaBlocks(data);
  const docxChildren: any[] = [];

  blocks.forEach((block) => {
    if (block.type === "p") {
      if (block.number) {
        // indentTabs=-1 → Varian B WNA (left=709, hang=425)
        if (block.indentTabs === -1) {
          docxChildren.push(createNumberedPWna(block.number, block.runs));
        } else {
          docxChildren.push(createNumberedP(block.number, block.runs));
        }
      } else if (block.align === "center") {
        docxChildren.push(createP(block.runs, { alignment: AlignmentType.CENTER }));
      } else if (block.indent) {
        docxChildren.push(createIndentP(block.runs, 284));
      } else {
        docxChildren.push(createP(block.runs));
      }
    } else if (block.type === "list") {
      docxChildren.push(createListP(block.bullet, block.runs, block.indentTabs ?? 0.5));
    } else if (block.type === "saksi") {
      docxChildren.push(createSaksiP((block as any).number, block.runs));
    } else if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
    }
  });

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