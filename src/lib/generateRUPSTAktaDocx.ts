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
  indentTabs: number = 0,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  let leftDxa: number, hangingDxa: number, maxW: number;

  if (indentTabs <= 0.6)      { leftDxa = 284;  hangingDxa = 284; maxW = W.list1; }
  else if (indentTabs <= 1.0) { leftDxa = 567;  hangingDxa = 283; maxW = W.list2; }
  else                        { leftDxa = 851;  hangingDxa = 284; maxW = W.list3; }

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

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: leftDxa }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa, hanging: hangingDxa },
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

export const generateRUPSTAktaDocx = async (data: CompanyData) => {
  const blocks = generateRupstAktaBlocks(data);
  const docxChildren: any[] = [];

  blocks.forEach((block) => {
    if (block.type === "p") {
      if (block.number) {
        docxChildren.push(createNumberedP(block.number, block.runs));
      } else if (block.align === "center") {
        docxChildren.push(createP(block.runs, { alignment: AlignmentType.CENTER }));
      } else if (block.indent) {
        docxChildren.push(createIndentP(block.runs, 284));
      } else {
        docxChildren.push(createP(block.runs));
      }
    } else if (block.type === "list") {
      docxChildren.push(createListP(block.bullet, block.runs, block.indentTabs || 0));
    } else if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
    }
  });

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
