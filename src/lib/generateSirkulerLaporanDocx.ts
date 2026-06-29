import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  LeaderType,
  IParagraphOptions,
  PageNumber,
  Footer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  UnderlineType,
  Header,
  LevelFormat
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData } from "../../types";
import { generateSirkulerLaporanBlocks, Block } from "./sirkulerLaporanContentBlocks";
import { toTitleCase, preprocessBlocksForWordBullets } from "./formatter";

const FONT_FAMILY = "Arial";
const FONT_SIZE = 22; 
const LINE_SPACING = 360; // 1.5 spacing roughly

const TAB_KANAN = { type: TabStopType.RIGHT, position: 8504, leader: LeaderType.NONE };

const createDocxRun = (runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]) => {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: !!r.bold,
        underline: r.underline ? {} : undefined,
        italics: !!r.italic,
        color: r.color,
        font: FONT_FAMILY,
        size: FONT_SIZE,
      })
  );
};

export const generateSirkulerLaporanDocx = async (data: CompanyData, returnBlob?: boolean) => {
  let ptName = data.companyName ? data.companyName.trim().toUpperCase() : "PT";
  if (!ptName.startsWith("PT")) ptName = `PT ${ptName}`;

  const rawBlocks = generateSirkulerLaporanBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);
  const elements: any[] = [];
  let isDecisionSection = false;
  let isStatementSection = false;

  for (const block of blocks) {
    if (block.type === "p") {
      const isCenter = block.align === "center";
      let align: any = AlignmentType.BOTH;
      if (isCenter) align = AlignmentType.CENTER;
      
      let indentOpts = undefined;
      if (block.indentLeft) {
         indentOpts = { left: block.indentLeft, hanging: 0 };
      }

      // Track if we have entered the decision section by checking for "OLEH KARENA ITU"
      const hasOlehKarenaItu = block.runs && block.runs.some((r: any) => r.text && r.text.includes("OLEH KARENA ITU"));
      if (hasOlehKarenaItu) {
        isDecisionSection = true;
      }

      // Track if we have entered the statement section by checking for "DENGAN INI MENYATAKAN"
      const hasDenganIniMenyatakan = block.runs && block.runs.some((r: any) => r.text && r.text.includes("DENGAN INI MENYATAKAN"));
      if (hasDenganIniMenyatakan) {
        isStatementSection = true;
      }

      elements.push(
        new Paragraph({
          children: createDocxRun(block.runs),
          alignment: align,
          spacing: { line: LINE_SPACING },
          indent: indentOpts,
        })
      );
    } else if (block.type === "br") {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: "", font: FONT_FAMILY, size: FONT_SIZE })],
          spacing: { line: LINE_SPACING },
        })
      );
    } else if (block.type === "pageBreak") {
      elements.push(
        new Paragraph({
          children: [new TextRun({ break: 1 })],
        })
      );
    } else if (block.type === "list") {
      const level = Math.max(0, Math.floor(((block.indentLeft || 360) - 360) / 360));
      elements.push(
        new Paragraph({
          children: createDocxRun(block.runs),
          numbering: {
            reference: "sirkuler-bullet",
            level: level,
          },
          alignment: AlignmentType.BOTH,
          spacing: { line: LINE_SPACING },
        })
      );
    } else if (block.type === "numbered") {
      const level = Math.max(0, Math.floor(((block.indentLeft || 360) - 360) / 360));
      const isAlpha = typeof block.num === 'string' && /[a-zA-Z]/.test(block.num);
      let ref = isAlpha ? "sirkuler-numbered-alpha" : "sirkuler-numbered";
      if (isDecisionSection) {
        ref = isAlpha ? "sirkuler-numbered-alpha-decision" : "sirkuler-numbered-decision";
      } else if (isStatementSection) {
        ref = isAlpha ? "sirkuler-numbered-alpha-statement" : "sirkuler-numbered-statement";
      }
      elements.push(
        new Paragraph({
          children: createDocxRun(block.runs),
          numbering: {
            reference: ref,
            level: level,
          },
          alignment: AlignmentType.BOTH,
          spacing: { line: LINE_SPACING },
        })
      );
    } else if (block.type === "signatures") {
      block.shareholders.forEach((sh: any) => {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sh.name.toUpperCase(),
                bold: true,
                underline: { type: UnderlineType.SINGLE },
                font: FONT_FAMILY,
                size: FONT_SIZE,
              }),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { before: 1000 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Tanggal :", font: FONT_FAMILY, size: FONT_SIZE })],
            alignment: AlignmentType.LEFT,
          })
        );
      });
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "sirkuler-bullet",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "-",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: "-",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.BULLET,
              text: "-",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
            {
              level: 3,
              format: LevelFormat.BULLET,
              text: "-",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "sirkuler-numbered",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.DECIMAL,
              text: "%2.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.DECIMAL,
              text: "%3.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
            {
              level: 3,
              format: LevelFormat.DECIMAL,
              text: "%4.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "sirkuler-numbered-decision",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.DECIMAL,
              text: "%2.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.DECIMAL,
              text: "%3.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
            {
              level: 3,
              format: LevelFormat.DECIMAL,
              text: "%4.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "sirkuler-numbered-statement",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.DECIMAL,
              text: "%2.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.DECIMAL,
              text: "%3.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
            {
              level: 3,
              format: LevelFormat.DECIMAL,
              text: "%4.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "sirkuler-numbered-alpha",
          levels: [
            {
              level: 0,
              format: LevelFormat.LOWER_LETTER,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: "%2.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.LOWER_LETTER,
              text: "%3.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
            {
              level: 3,
              format: LevelFormat.LOWER_LETTER,
              text: "%4.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "sirkuler-numbered-alpha-decision",
          levels: [
            {
              level: 0,
              format: LevelFormat.LOWER_LETTER,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: "%2.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.LOWER_LETTER,
              text: "%3.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
            {
              level: 3,
              format: LevelFormat.LOWER_LETTER,
              text: "%4.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "sirkuler-numbered-alpha-statement",
          levels: [
            {
              level: 0,
              format: LevelFormat.LOWER_LETTER,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 360 } } },
            },
            {
              level: 1,
              format: LevelFormat.LOWER_LETTER,
              text: "%2.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 2,
              format: LevelFormat.LOWER_LETTER,
              text: "%3.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
            },
            {
              level: 3,
              format: LevelFormat.LOWER_LETTER,
              text: "%4.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT_FAMILY, size: FONT_SIZE },
          paragraph: {
            spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "KOP SURAT PT",
                    bold: true,
                    size: 32,
                    color: "FF0000",
                    font: FONT_FAMILY,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: elements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Keputusan_Sirkuler_${ptName}.docx`;
  if (returnBlob) {
    return { blob, filename };
  }
  saveAs(blob, filename);
};
