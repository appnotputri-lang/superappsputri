import { AlignmentType, PageNumber, Footer, Paragraph, TextRun } from "docx";
import { DOCX_CONSTANTS } from "../constants";
import { ParagraphFactory } from "../ParagraphFactory";
import { buildAktaNumberingConfig } from "../numbering";
import { createParticipantSigsTable, createShareholderSigsTable } from "../tables";

export class AktaTemplate {
  constructor(public blocks: any[]) {}

  buildDocxChildren() {
    const factory = new ParagraphFactory(
      DOCX_CONSTANTS.AKTA.W,
      DOCX_CONSTANTS.AKTA.TAB_KANAN,
      DOCX_CONSTANTS.AKTA.TAB_KANAN_NO_LEADER,
      DOCX_CONSTANTS.AKTA.NOTARIS_TAB_STOPS
    );

    const docxChildren: any[] = [];

    this.blocks.forEach((block) => {
      if (block.type === "p") {
        const isCentered = block.align === "center";
        const isRightCenter = block.align === "right-center";
        const alignOpt = isCentered ? AlignmentType.CENTER : AlignmentType.LEFT;
        const opts: any = { alignment: alignOpt };

        if (block.number && !isCentered && !isRightCenter) {
          docxChildren.push(factory.createNumberedP(block.number, block.runs, opts));
        } else if (block.subNumber && !isCentered) {
          docxChildren.push(factory.createSubNumberedP(block.subNumber, block.runs, block.indentTabs || 0));
        } else if (block.indentTabs && !isCentered && !isRightCenter) {
          if (block.kbliDesc) {
            docxChildren.push(factory.createKbliDescP(block.runs));
          } else {
            const leftDxa = Math.round((block.indentTabs || 0) * 850);
            docxChildren.push(factory.createIndentP(block.runs, leftDxa, opts));
          }
        } else if (block.indent && !isCentered && !isRightCenter) {
          docxChildren.push(factory.createIndentP(block.runs, 284, opts));
        } else {
          docxChildren.push(factory.createP(block.runs, isRightCenter, opts));
        }
      } else if (block.type === "list") {
        docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0));
      } else if (block.type === "shareholder-list") {
        const paragraphs = factory.createShareholderListParagraphs(block.bullet, block.name, block.sharesText, block.rpText);
        paragraphs.forEach((p: any) => docxChildren.push(p));
      } else if (block.type === "management-list") {
        docxChildren.push(factory.createManagementRoleListP(block.position, block.name));
      } else if (block.type === "saksi") {
        docxChildren.push(factory.createSaksiP(block.num, block.runs));
      } else if (block.type === "divider") {
        docxChildren.push(factory.createDividerP(block.text));
      } else if (block.type === "br") {
        docxChildren.push(factory.createP([], false, {}));
      } else if (block.type === "notaris") {
        docxChildren.push(factory.createNotarisEmptyP());
        docxChildren.push(factory.createNotarisLabelP(block.domicile));
        docxChildren.push(factory.createNotarisEmptyP());
        docxChildren.push(factory.createNotarisEmptyP());
        docxChildren.push(factory.createNotarisSignP());
        docxChildren.push(factory.createNotarisEmptyP());
        docxChildren.push(factory.createNotarisNameP(block.name));
      }
    });

    return docxChildren;
  }

  getRenderConfig(notarisDomicile: string, notarisName: string) {
    const children = this.buildDocxChildren();
    
    // Only append if there isn't already a "notaris" block in the blocks
    const hasNotarisBlock = this.blocks.some((b) => b.type === "notaris");
    if (!hasNotarisBlock) {
      // Append the notaris signature block at the end of the document
      // (since it was removed from the footer)
      const factory = new ParagraphFactory(
        DOCX_CONSTANTS.AKTA.W,
        DOCX_CONSTANTS.AKTA.TAB_KANAN,
        DOCX_CONSTANTS.AKTA.TAB_KANAN_NO_LEADER,
        DOCX_CONSTANTS.AKTA.NOTARIS_TAB_STOPS
      );
      
      children.push(factory.createNotarisEmptyP());
      children.push(factory.createNotarisLabelP(notarisDomicile));
      children.push(factory.createNotarisEmptyP());
      children.push(factory.createNotarisEmptyP());
      children.push(factory.createNotarisSignP());
      children.push(factory.createNotarisEmptyP());
      children.push(factory.createNotarisNameP(notarisName));
    }

    return {
      margins: DOCX_CONSTANTS.AKTA.MARGINS,
      numbering: buildAktaNumberingConfig(),
      children: children,
      footer: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ children: ["- ", PageNumber.CURRENT, " -"], font: "Century Gothic", size: 20 }),
            ],
          }),
        ],
      })
    };
  }
}
