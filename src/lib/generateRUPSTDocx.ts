import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType,
  IParagraphOptions, Footer, PageNumber, Header,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak,
  LevelFormat,
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData } from "../../types";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generateRupstBlocks } from "./rupsTahunanContentBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";

// Content widths in cm (for line-wrap estimation)
// A4 margins left=2268 right=1134 → content = 11906-2268-1134 = 8504 DXA ≈ 14.97cm
const W = {
  normal: 41.5,
  // Peserta rapat indent levels (567/1134/1701)
  peserta0: 39.5,  // left=567
  peserta1: 37.5,  // left=1134
  peserta2: 35.5,  // left=1701
  // Keputusan indent levels (426/851)
  kep0: 40.0,      // left=426
  kep1: 38.0,      // left=851
};

// Indent levels for PESERTA RAPAT and AGENDA items (567-based)
// level 0: "1." "2." "-"  → left=567, hanging=567
// level 1: "-" "a." "b."  → left=1134, hanging=567
// level 2: "a." "b."      → left=1701, hanging=567
const INDENT_PESERTA = [
  { left: 567,  hanging: 567 },
  { left: 1134, hanging: 567 },
  { left: 1701, hanging: 567 },
];

// Indent levels for KEPUTUSAN items — use MS Word numbering (numId) to match reference exactly.
// level 0: numbered "1." → numRef="kep-decimal", left=426, hanging=360
// level 1 letter: "a."  → numRef="kep-letter",  left=851, hanging=360
// level 1 dash: "-"     → numRef="kep-dash",    left=851, hanging=360
const KEP_NUM = {
  decimal: "kep-decimal",
  letter:  "kep-letter",
  dash:    "kep-dash",
  dash_inner: "kep-dash-inner",
  bullet:  "kep-bullet",
};

// Numbering config matching reference document exactly:
// - kep-decimal: 1. 2. 3.  left=426 hanging=360 (number at ~66, text at 426)
// - kep-letter:  a. b. c.  left=851 hanging=360 (letter at ~491, text at 851)
// - kep-dash:    -         left=851 hanging=360 (dash at ~491, text at 851)
const NUMBERING_CONFIG = [
  {
    reference: KEP_NUM.decimal,
    levels: [{
      level: 0,
      format: LevelFormat.DECIMAL,
      text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 426, hanging: 426 } } },
    }],
  },
  {
    reference: KEP_NUM.letter,
    levels: [{
      level: 0,
      format: LevelFormat.LOWER_LETTER,
      text: "%1.",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 852, hanging: 426 } } },
    }],
  },
  {
    reference: KEP_NUM.dash,
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: "-",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 852, hanging: 426 } } },
    }],
  },
  {
    reference: KEP_NUM.dash_inner,
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: "-",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 1278, hanging: 426 } } },
    }],
  },
  {
    reference: KEP_NUM.bullet,
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: "•",
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 1278, hanging: 426 } } },
    }],
  },
];

const createP = (
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
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
        highlight: t.highlight as any,
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

  // Single tab stop at 2400 for "Hari/Tanggal : ..." style paragraphs
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
  indentStyle?: "keputusan",
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const isKeputusan = indentStyle === "keputusan";
  const level = Math.min(indentTabs, isKeputusan ? 1 : 2);

  // Helper: build flat TextRun children from tokens (no line-splitting — let Word wrap natively)
  const buildRuns = (toks: FormatToken[]): TextRun[] =>
    toks.map(t => new TextRun({
      text: t.text,
      bold: t.bold,
      italics: t.italic,
      underline: t.underline ? {} : undefined,
      color: t.color,
      highlight: t.highlight as any,
      size: t.size ? t.size * 2 : undefined,
    }));

  // KEPUTUSAN items: use MS Word numbering (numId) — matches reference exactly
  if (isKeputusan) {
    // Empty bullet = plain paragraph with same indent as bulleted item text, no numbering
    if (!bulletText) {
      const leftDxa = 426 * (level + 1);
      return new Paragraph({
        children: buildRuns(tokens),
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: leftDxa },
        ...options,
      });
    }

    let numRef: string;
    if (level === 0) {
      numRef = KEP_NUM.decimal;
    } else if (bulletText === "-") {
      numRef = indentTabs >= 2 ? KEP_NUM.dash_inner : KEP_NUM.dash;
    } else if (bulletText === "•") {
      numRef = KEP_NUM.bullet;
    } else {
      numRef = KEP_NUM.letter;
    }

    return new Paragraph({
      children: buildRuns(tokens),
      numbering: { reference: numRef, level: 0 },
      alignment: AlignmentType.JUSTIFIED,
      ...options,
    });
  }

  // PESERTA / AGENDA items: matches reference XML exactly.
  // Structure: run("1.") → run(w:tab + "Tuan ") → run("RAJANDRAN") → ...
  // Tab stop at position=left, hanging indent so bullet starts at 0.
  const levelIdx = Math.max(0, Math.min(Math.floor(level), INDENT_PESERTA.length - 1));
  const { left: leftDxa, hanging: hangingDxa } = INDENT_PESERTA[levelIdx];
  const children: TextRun[] = [];

  // Run 1: bullet text only ("1." / "-" / "a.")
  if (bulletText) children.push(new TextRun({ text: bulletText }));

  // Run 2: tab character in its own run (separate from bullet AND from text)
  children.push(new TextRun({ text: "\t" }));

  // Run 3+: all content tokens as individual runs
  children.push(...buildRuns(tokens));

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
    children: [new TextRun({ text, bold: true })],
    alignment: AlignmentType.CENTER,
  });

export const generateRUPSTDocx = async (data: CompanyData, returnBlob?: boolean) => {
  const rawBlocks = generateRupstBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);
  const docxChildren: any[] = [];

  blocks.forEach((block) => {
    if (block.type === "p") {
      const isCentered = block.align === "center";
      const isLeft = block.align === "left";
      docxChildren.push(
        createP(block.runs, {
          alignment: isCentered 
            ? AlignmentType.CENTER 
            : (isLeft ? AlignmentType.LEFT : AlignmentType.JUSTIFIED),
        })
      );
    } else if (block.type === "list") {
      docxChildren.push(
        createListP(
          block.bullet,
          block.runs,
          block.indentTabs || 0,
          (block as any).indentStyle
        )
      );
    } else if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
    } else if (block.type === "br") {
      docxChildren.push(new Paragraph({ children: [] }));
    } else if (block.type === "participantSigs") {
      const TABLE_WIDTH = 8504;
      const borderNone = { style: BorderStyle.NONE, size: 0, color: "auto" };
      const borders = {
        top: borderNone, bottom: borderNone, left: borderNone, right: borderNone,
        insideHorizontal: borderNone, insideVertical: borderNone,
      };

      const columnsWidth = [5300, 3204];

      const formatParticipantName = (sh: any) => {
        if (sh.isProxy && sh.proxyData && sh.proxyData.name) {
          return `${sh.proxyData.name.toUpperCase()} qq ${sh.name.toUpperCase()}`;
        }
        return sh.name.toUpperCase();
      };

      const rows = block.participants.map((sh: any, idx: number) => {
        const numAndName = `${idx + 1}. ${formatParticipantName(sh)}`;
        return new TableRow({
          children: [
            new TableCell({
              borders,
              margins: { top: 120, bottom: 120, left: 0, right: 120 },
              width: { size: columnsWidth[0], type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: numAndName, bold: false })],
                  alignment: AlignmentType.LEFT,
                  spacing: { line: 360, after: 240 },
                }),
              ],
            }),
            new TableCell({
              borders,
              margins: { top: 120, bottom: 120, left: 120, right: 0 },
              width: { size: columnsWidth[1], type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "........................................................", bold: false })],
                  alignment: AlignmentType.LEFT,
                  spacing: { line: 360, after: 240 },
                }),
              ],
            }),
          ],
        });
      });

      docxChildren.push(
        new Table({
          rows: rows,
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: columnsWidth,
          borders,
        })
      );
    } else if (block.type === "pageBreak") {
      docxChildren.push(new Paragraph({ children: [new PageBreak()] }));
    } else if (block.type === "table") {
      // Content width for A4 with reference margins: 11906-2268-1134 = 8504 DXA
      const TABLE_WIDTH = 8504;
      const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
      const borders = {
        top: border, bottom: border, left: border, right: border,
        insideHorizontal: border, insideVertical: border,
      };

      const colCount = block.headers.length;
      const colWidths = block.widths
        ? block.widths
        : block.headers.map(() => Math.floor(TABLE_WIDTH / colCount));

      const headerRow = new TableRow({
        children: block.headers.map((h, i) =>
          new TableCell({
            borders,
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            width: { size: colWidths[i], type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [new TextRun({ text: h, bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          })
        ),
      });

      const bodyRows = block.rows.map((row) =>
        new TableRow({
          children: row.map((cell, i) => {
            let cellChildren: Paragraph[] = [];
            if (Array.isArray(cell)) {
              cellChildren = [createP(cell, { alignment: AlignmentType.LEFT })];
            } else {
              const cellLines = cell.split("\n");
              cellChildren = cellLines.map(
                (line) =>
                  new Paragraph({
                    children: [new TextRun({ text: line })],
                    alignment: AlignmentType.CENTER,
                  })
              );
            }
            return new TableCell({
              borders,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              width: { size: colWidths[i], type: WidthType.DXA },
              children: cellChildren,
            });
          }),
        })
      );

      docxChildren.push(
        new Table({
          rows: [headerRow, ...bodyRows],
          width: { size: TABLE_WIDTH, type: WidthType.DXA },
          columnWidths: colWidths,
        })
      );
    }
  });

  const doc = new Document({
    numbering: {
      config: NUMBERING_CONFIG,
    },
    styles: {
      default: {
        document: {
          // Font Arial, size 11pt (22 half-points)
          run: { font: "Arial", size: 22 },
          paragraph: {
            // 1.5× line spacing (line=360) matching reference docPrDefault
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
            // A4: 11906 × 16838 twips
            size: { width: 11906, height: 16838 },
            // Margins matching reference: top=1417 right=1134 bottom=1417 left=2268
            margin: { top: 1417, bottom: 1417, left: 2268, right: 1134 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "KOP SURAT",
                    bold: true,
                    color: "FF0000",
                    font: "Arial",
                    size: 24,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: ["- ", PageNumber.CURRENT, " -"] }),
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
  const filename = `Notulen RUPST ${data.companyName || 'PT Baru'}.docx`;
  if (returnBlob) {
    return { blob, filename };
  }
  saveAs(blob, filename);
};