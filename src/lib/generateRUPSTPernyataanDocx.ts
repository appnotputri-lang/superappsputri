import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType,
  IParagraphOptions, Footer, PageNumber,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData } from "../../types";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generateRupstPernyataanBlocks } from "./rupsTahunanPernyataanBlocks";

// A4 content width
const W_NORMAL = 41.5;

const createP = (
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W_NORMAL);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => {
      const runOptions = {
        text: "",
        bold: t.bold,
        italics: t.italic,
        underline: t.underline ? {} : undefined,
        color: t.color,
        size: t.size ? t.size * 2 : undefined,
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
    tabStops.push({ type: TabStopType.LEFT, position: 2400 });
  }

  return new Paragraph({
    children,
    tabStops,
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    ...options,
  });
};

const createListP = (
  bulletText: string,
  tokens: FormatToken[],
  indentTabs: number = 0,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const leftDxa = 567 * (indentTabs + 1);
  const hangingDxa = 567;

  const children: TextRun[] = [];
  if (bulletText) children.push(new TextRun({ text: bulletText }));
  children.push(new TextRun({ text: "\t" }));
  children.push(...tokens.map(t => new TextRun({
      text: t.text,
      bold: t.bold,
      italics: t.italic,
      underline: t.underline ? {} : undefined,
      color: t.color,
      size: t.size ? t.size * 2 : undefined,
  })));

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: leftDxa }],
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: leftDxa, hanging: hangingDxa },
    ...options,
  });
};

export const generateRUPSTPernyataanDocx = async (data: CompanyData) => {
  const blocks = generateRupstPernyataanBlocks(data);
  const docxChildren: any[] = [];

  blocks.forEach((block) => {
    if (block.type === "p") {
      const isCentered = block.align === "center";
      docxChildren.push(
        createP(block.runs, {
          alignment: isCentered ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
        })
      );
    } else if (block.type === "list") {
      docxChildren.push(
        createListP(
          block.bullet,
          block.runs,
          block.indentTabs || 0
        )
      );
    } else if (block.type === "br") {
      docxChildren.push(new Paragraph({ children: [] }));
    }
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22 },
          paragraph: {
            spacing: { line: 360, lineRule: "auto", before: 0, after: 0 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 }, // Balanced margins for Statement
          },
        },
        children: docxChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Surat Pernyataan RUPST ${data.companyName}.docx`);
};
