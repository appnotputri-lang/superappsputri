import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType, LeaderType,
  IParagraphOptions, Footer, PageNumber,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak,
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData } from "../../types";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generateRupstBlocks } from "./rupsTahunanContentBlocks";

const W = {
  normal: 41.5,
  list1: 39.0,
  list2: 36.5,
  list3: 34.0,
};

const createP = (
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const isCentered = options.alignment === AlignmentType.CENTER;
  const lines = parseTextRuns(tokens, W.normal);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => {
      const runOptions = {
        text: "",
        bold: t.bold,
        italics: t.italic,
        underline: t.underline ? {} : undefined,
        color: t.color,
        size: t.size ? t.size * 2 : undefined
      };

      if (t.text.includes("\t")) {
        const parts = t.text.split("\t");
        parts.forEach((part, pIdx) => {
          children.push(new TextRun({ ...runOptions, text: part }));
          if (pIdx < parts.length - 1) {
            children.push(new TextRun({ text: "\t" }));
          }
        });
      } else {
        children.push(new TextRun({ ...runOptions, text: t.text }));
      }
    });
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  const tabStops = [];
  if (tokens.some((t) => t.text.includes("\t"))) {
    tabStops.push({ type: TabStopType.LEFT, position: 2400 }); // Position for colon
  }

  return new Paragraph({
    children,
    tabStops,
    alignment: AlignmentType.JUSTIFIED,
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

  if (indentTabs === 0) { leftDxa = 567; hangingDxa = 567; maxW = W.list1; }
  else if (indentTabs === 1) { leftDxa = 1134; hangingDxa = 567; maxW = W.list2; }
  else { leftDxa = 1701; hangingDxa = 567; maxW = W.list3; }

  const lines = parseTextRuns(tokens, maxW);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${bulletText}\t` }));
    lineTokens.forEach((t) => {
      children.push(new TextRun({
        text: t.text,
        bold: t.bold,
        italics: t.italic,
        underline: t.underline ? {} : undefined,
        color: t.color,
        size: t.size ? t.size * 2 : undefined
      }));
    });
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: leftDxa }],
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: leftDxa, hanging: hangingDxa },
    ...options,
  });
};

const createDividerP = (text: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text, bold: true }),
    ],
    alignment: AlignmentType.CENTER,
  });

export const generateRUPSTDocx = async (data: CompanyData) => {
  const blocks = generateRupstBlocks(data);
  const docxChildren: any[] = [];

  blocks.forEach((block) => {
    if (block.type === "p") {
      const isCentered = block.align === "center";
      docxChildren.push(createP(block.runs, { alignment: isCentered ? AlignmentType.CENTER : AlignmentType.JUSTIFIED }));
    } else if (block.type === "list") {
      docxChildren.push(createListP(block.bullet, block.runs, block.indentTabs || 0));
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
             // cell is FormatToken[]
             cellChildren = [createP(cell, { alignment: AlignmentType.LEFT })];
          } else {
             // cell is string
             const cellLines = cell.split("\n");
             cellChildren = cellLines.map(line => new Paragraph({ 
               children: [new TextRun({ text: line, size: 20 })],
               alignment: AlignmentType.CENTER
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

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Century Gothic", size: 20 },
          paragraph: {
            spacing: { line: 360, before: 0, after: 0 },
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
