import { AlignmentType, PageNumber, Footer, Paragraph, TextRun, TabStopType, PageBreak } from "docx";
import { DOCX_CONSTANTS } from "../constants";
import { ParagraphFactory } from "../ParagraphFactory";
import { buildNotulenNumberingConfig } from "../numbering";
import { createParticipantSigsTable, createShareholderSigsTable, createGenericTable } from "../tables";
import { buildKopSuratHeader } from "../kopSurat";

export class NotulenTemplate {
  constructor(public blocks: any[], private companyName?: string, private domicile?: string) {}

  buildDocxChildren() {
    const factory = new ParagraphFactory(
      DOCX_CONSTANTS.NOTULEN.W,
      DOCX_CONSTANTS.NOTULEN.TAB_KANAN,
      DOCX_CONSTANTS.NOTULEN.TAB_KANAN, // No leader for Notulen
      []
    );

    const docxChildren: any[] = [];

    this.blocks.forEach((block) => {
      if (block.type === "p") {
        const isCentered = block.align === "center";
        const alignOpt = isCentered ? AlignmentType.CENTER : AlignmentType.BOTH;
        const opts: any = { alignment: alignOpt };

        if (block.number && !isCentered) {
          docxChildren.push(factory.createNumberedP(block.number, block.runs, opts));
        } else if (block.subNumber && !isCentered) {
          docxChildren.push(factory.createSubNumberedP(block.subNumber, block.runs, block.indentTabs || 0, opts));
        } else if (block.indentTabs && !isCentered) {
          if (block.kbliDesc) {
            docxChildren.push(factory.createKbliDescP(block.runs));
          } else {
            const leftDxa = Math.round((block.indentTabs || 0) * 850);
            docxChildren.push(factory.createIndentP(block.runs, leftDxa, opts));
          }
        } else if (block.indent && !isCentered) {
          docxChildren.push(factory.createIndentP(block.runs, 284, opts));
        } else {
          const hasTab = block.runs && block.runs.some((r: any) => r.text && r.text.includes("\t"));
          if (hasTab && !isCentered) {
            opts.tabStops = [{ type: TabStopType.LEFT, position: 2000 }, factory.TAB_KANAN];
          }
          docxChildren.push(factory.createP(block.runs, false, opts));
        }
      } else if (block.type === "list") {
        docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, { alignment: AlignmentType.BOTH }));
      } else if (block.type === "divider") {
        docxChildren.push(factory.createDividerP(block.text));
      } else if (block.type === "br") {
        docxChildren.push(factory.createP([], false, {}));
      } else if (block.type === "pageBreak") {
        docxChildren.push(new Paragraph({ children: [new PageBreak()] }));
      } else if (block.type === "participantSigs") {
        docxChildren.push(createParticipantSigsTable(block.participants, DOCX_CONSTANTS.NOTULEN.WIDTH, "Arial", 22));
      } else if (block.type === "shSigs") {
        docxChildren.push(createShareholderSigsTable(block.attendingShareholders, block.proxyDataList, block.repData, DOCX_CONSTANTS.NOTULEN.WIDTH, "Arial", 22));
      } else if (block.type === "table") {
        docxChildren.push(createGenericTable(block.headers, block.widths, block.rows, DOCX_CONSTANTS.NOTULEN.WIDTH, "Arial", 22));
      }
    });

    return docxChildren;
  }

  getRenderConfig() {
    return {
      margins: DOCX_CONSTANTS.NOTULEN.MARGINS,
      numbering: buildNotulenNumberingConfig([], "Arial", 22),
      children: this.buildDocxChildren(),
      styles: {
        default: {
          document: {
            run: { size: 22, font: "Arial" },
            paragraph: { spacing: { line: 360, lineRule: "auto" } }
          }
        }
      },
      header: buildKopSuratHeader(this.companyName, this.domicile, (import.meta as any).env?.VITE_ENABLE_KOP_SURAT !== 'false'),
      footer: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: ["- ", PageNumber.CURRENT, " -"], font: "Arial", size: 22 })],
          }),
        ],
      })
    };
  }
}
