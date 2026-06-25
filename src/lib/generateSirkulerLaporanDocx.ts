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
  Header
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

  for (const block of blocks) {
    if (block.type === "p") {
      const isCenter = block.align === "center";
      let align: any = AlignmentType.BOTH;
      if (isCenter) align = AlignmentType.CENTER;
      
      let indentOpts = undefined;
      if (block.indentLeft) {
         indentOpts = { left: block.indentLeft, hanging: 0 };
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
      const children = [];
      if (block.bullet) {
         children.push(new TextRun({ text: `${block.bullet}\t`, font: FONT_FAMILY, size: FONT_SIZE }));
      }
      children.push(...createDocxRun(block.runs));

      elements.push(
        new Paragraph({
          children,
          indent: {
            left: block.indentLeft,
            hanging: block.indentHanging,
          },
          alignment: AlignmentType.BOTH,
          spacing: { line: LINE_SPACING },
        })
      );
    } else if (block.type === "numbered") {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${block.num}\t`, font: FONT_FAMILY, size: FONT_SIZE }),
            ...createDocxRun(block.runs)
          ],
          indent: {
            left: block.indentLeft,
            hanging: block.indentHanging,
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
