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
  BorderStyle
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData } from "../../types";
import { generateSirkulerLaporanBlocks, Block } from "./sirkulerLaporanContentBlocks";
import { toTitleCase, preprocessBlocksForWordBullets } from "./formatter";

const FONT_FAMILY = "Times New Roman";
const FONT_SIZE = 24; // 12pt
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

export const generateSirkulerLaporanDocx = async (data: CompanyData) => {
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
      const cells = block.shareholders.map(sh => (
        new TableCell({
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
          },
          children: [
            new Paragraph({
              children: [new TextRun({ text: sh.name.toUpperCase(), bold: true, underline: {}, font: FONT_FAMILY, size: FONT_SIZE })],
              alignment: AlignmentType.CENTER,
            })
          ],
          width: { size: 100 / block.shareholders.length, type: WidthType.PERCENTAGE },
        })
      ));

      // Put them into rows of 2 (if there are more than 2, it splits naturally ok, but we map simple table for all in one row here. 
      // If there are many we should wrap.
      const rows = [];
      let currentRow = [];
      for (let i = 0; i < cells.length; i++) {
        currentRow.push(cells[i]);
        if (currentRow.length === 2 || i === cells.length - 1) {
          if (currentRow.length < 2) {
             currentRow.push(new TableCell({
                 borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                },
                children: [new Paragraph({text: ""})],
                width: { size: 50, type: WidthType.PERCENTAGE }
             }));
          }
          rows.push(new TableRow({ children: currentRow }));
          // Add spacing rows between lines of sigs
          if (i < cells.length - 1) {
            const spacerRow = new TableRow({
              children: [
                new TableCell({
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
                    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
                  },
                  children: [
                    new Paragraph({text: "", spacing: {before: 1000, after: 1000}})
                  ],
                  width: {size: 100, type: WidthType.PERCENTAGE},
                  columnSpan: 2
                })
              ]
            });
            rows.push(spacerRow);
          }
          currentRow = [];
        }
      }

      elements.push(
        new Table({
          rows: rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
          },
        })
      )
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: elements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  let ptName = data.companyName ? data.companyName.trim().toUpperCase() : "PT";
  if (!ptName.startsWith("PT")) ptName = `PT ${ptName}`;
  saveAs(blob, `Keputusan_Sirkuler_${ptName}.docx`);
};
