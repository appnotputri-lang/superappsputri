// SirkulerTemplate.ts
import { AlignmentType, PageNumber, Footer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { DOCX_CONSTANTS } from "../constants";
import { buildSirkulerNumberingConfig } from "../numbering";
import { createShareholderSigsTable } from "../tables";
import { buildKopSuratHeader } from "../kopSurat";
import { INDENT, getLevelFromIndent } from "../constants/indent";

const createDocxRun = (runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]) => {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: !!r.bold,
        underline: r.underline ? {} : undefined,
        italics: !!r.italic,
        color: r.color,
        font: "Arial",
        size: 22,
      })
  );
};

export class SirkulerTemplate {
  constructor(public blocks: any[], private companyName?: string, private domicile?: string) {}
  private lastBlockType: string | null = null;

  buildDocxChildren() {
    const elements: any[] = [];
    let isDecisionSection = false;
    let isStatementSection = false;
    const TAB_KANAN = DOCX_CONSTANTS.SIRKULER.TAB_KANAN;

    for (const block of this.blocks) {
      if (block.type === "p") {
        const isCenter = block.align === "center";
        let align: any = AlignmentType.BOTH;
        if (isCenter) align = AlignmentType.CENTER;

        let indentOpts = undefined;
        if (block.indentLeft !== undefined) {
          indentOpts = { left: block.indentLeft, hanging: block.indentHanging || 0 };
        }

        const hasOlehKarenaItu = block.runs && block.runs.some((r: any) => r.text && r.text.includes("OLEH KARENA ITU"));
        if (hasOlehKarenaItu) {
          isDecisionSection = true;
        }

        const hasDenganIniMenyatakan = block.runs && block.runs.some((r: any) => r.text && r.text.includes("DENGAN INI MENYATAKAN"));
        if (hasDenganIniMenyatakan) {
          isStatementSection = true;
        }

        elements.push(
          new Paragraph({
            children: createDocxRun(block.runs),
            alignment: align,
            spacing: { line: 480, after: block.spaceAfter ? 240 : 0 },
            indent: indentOpts,
            tabStops: isCenter ? undefined : [TAB_KANAN],
          })
        );
        this.lastBlockType = "p";
      } else if (block.type === "list") {
        // Gunakan ref dari block jika ada, atau tentukan berdasarkan konteks
        let ref: string;
        if (block.ref) {
          ref = block.ref;
        } else {
          const isAlpha = /^[a-z]\.$/.test(block.bullet);
          if (isAlpha) {
            ref = isDecisionSection ? "sirkuler-numbered-alpha-decision" : "sirkuler-numbered-alpha-statement";
          } else {
            ref = "sirkuler-bullet";
          }
        }

        let level = getLevelFromIndent(block.indentLeft);
        if (ref === "sirkuler-amendment") {
          level = 0;
        }

        elements.push(
          new Paragraph({
            children: createDocxRun(block.runs),
            alignment: AlignmentType.BOTH,
            numbering: {
              reference: ref,
              level: level,
            },
            indent: block.indentLeft !== undefined ? { left: block.indentLeft, hanging: block.indentHanging || 0 } : undefined,
            spacing: { line: 480 },
          })
        );
        this.lastBlockType = "list";
      } else if (block.type === "numbered") {
        let ref: string;
        if (block.ref) {
          ref = block.ref;
        } else {
          if (isDecisionSection) ref = "sirkuler-numbered-decision";
          else if (isStatementSection) ref = "sirkuler-numbered-statement";
          else ref = "sirkuler-numbered-attendee";
        }

        const level = getLevelFromIndent(block.indentLeft);

        elements.push(
          new Paragraph({
            children: createDocxRun(block.runs),
            alignment: AlignmentType.BOTH,
            numbering: {
              reference: ref,
              level: level,
            },
            indent: block.indentLeft !== undefined ? { left: block.indentLeft, hanging: block.indentHanging || 0 } : undefined,
            spacing: { line: 480 },
          })
        );
        this.lastBlockType = "numbered";
      } else if (block.type === "signatures") {
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
          } as any,
          rows: block.shareholders.map((sh: any) => {
            return new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: sh.name, font: "Arial", size: 22, bold: true })],
                      spacing: { line: 480, before: 1000 },
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: "........................................................", font: "Arial", size: 22 })],
                      spacing: { line: 480, before: 1000 },
                    }),
                  ],
                }),
              ],
            });
          }),
        });
        elements.push(table);
        this.lastBlockType = "signatures";
      } else if (block.type === "br") {
        elements.push(new Paragraph({ text: "", spacing: { line: 480 } }));
        this.lastBlockType = "br";
      }
    }
    return elements;
  }

  getRenderConfig() {
    return {
      margins: DOCX_CONSTANTS.SIRKULER.MARGINS,
      numbering: [...buildSirkulerNumberingConfig("Arial", 22)],
      children: this.buildDocxChildren(),
      styles: {
        default: {
          document: {
            run: { size: 22, font: "Arial" },
            paragraph: { spacing: { line: 360, lineRule: "auto" } },
          },
        },
      },
      header: buildKopSuratHeader(
        this.companyName,
        this.domicile,
        (import.meta as any).env?.VITE_ENABLE_KOP_SURAT !== "false"
      ),
      footer: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: ["- ", PageNumber.CURRENT, " -"], font: "Arial", size: 22 })],
          }),
        ],
      }),
    };
  }
}