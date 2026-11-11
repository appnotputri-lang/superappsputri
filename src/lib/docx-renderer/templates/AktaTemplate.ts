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
    let zone: "preamble" | "attendance" | "general" | "decisions" | "saksi" = "preamble";

    this.blocks.forEach((block) => {
      const text = block.runs ? block.runs.map((r: any) => r.text || "").join("") : "";

      // Zone transitions (matching generateRUPSTAktaDocx.ts)
      if (zone === "preamble" && block.type === "list" && /^\d+\.$/.test(block.bullet ?? "")) {
        zone = "attendance";
      } else if (zone === "attendance" && (
        (block.type === "list" && block.bullet === "-" && (block.indentTabs || 0) <= 0.6) ||
        text.startsWith("Bahwa dari semua saham")
      )) {
        zone = "general";
      }

      if (
        (block.type === "p" && block.number !== undefined && zone !== "decisions") ||
        (zone === "general" && text.includes("telah setuju dan memutuskan")) ||
        (zone === "general" && text.includes("telah diputuskan dengan suara bulat")) ||
        (zone === "general" && text.includes("memutuskan dan menetapkan")) ||
        (zone === "general" && text.includes("menyatakan keputusan"))
      ) {
        zone = "decisions";
      }

      if (block.type === "divider" && (text.includes("DEMIKIANLAH") || (block.text && block.text.includes("DEMIKIANLAH")))) {
        zone = "saksi";
      }

      if (block.type === "p") {
        const isCentered = block.align === "center";
        const isRightCenter = block.align === "right-center";
        const alignOpt = isCentered ? AlignmentType.CENTER : AlignmentType.LEFT;
        const opts: any = { alignment: alignOpt };

        if (block.number && !isCentered && !isRightCenter) {
          const numOpts: any = {
            style: "ListParagraph",
            numbering: { reference: "akta-rupst-decisions", level: 0 },
            indent: { left: 720, hanging: 720 },
            ...opts,
          };
          docxChildren.push(factory.createNumberedP(block.number, block.runs, numOpts));
        } else if (block.subNumber && !isCentered) {
          docxChildren.push(factory.createSubNumberedP(block.subNumber, block.runs, block.indentTabs || 0));
        } else if ((block.indentLeft !== undefined || block.indentTabs) && !isCentered && !isRightCenter) {
          if (block.kbliDesc) {
            docxChildren.push(factory.createKbliDescP(block.runs));
          } else {
            const leftDxa = block.indentLeft !== undefined
              ? block.indentLeft
              : Math.round((block.indentTabs || 0) * 850);
            docxChildren.push(factory.createIndentP(block.runs, leftDxa, opts));
          }
        } else if (block.indent && !isCentered && !isRightCenter) {
          docxChildren.push(factory.createIndentP(block.runs, 284, opts));
        } else {
          docxChildren.push(factory.createP(block.runs, isRightCenter, opts));
        }
      } else if (block.type === "list") {
        const bullet = block.bullet ?? "";
        const isNumbered = /^\d+\.$/.test(bullet);
        const isLetter = /^[a-z]\.$/i.test(bullet) && !isNumbered;

        if (zone === "preamble") {
          const isDeep = (block.indentTabs || 0) >= 0.8;
          const opts: any = {
            style: "ListParagraph",
            numbering: { reference: "akta-rupst-preamble", level: 2 },
            indent: isDeep ? { left: 850, hanging: 425 } : { left: 426, hanging: 426 },
          };
          docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, opts));
        } else if (zone === "attendance") {
          if (isNumbered) {
            const opts: any = {
              style: "ListParagraph",
              numbering: { reference: "akta-rupst-attendance", level: 0 },
              indent: { left: 720, hanging: 360 },
            };
            docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, opts));
          } else if (isLetter) {
            const opts: any = {
              style: "ListParagraph",
              numbering: { reference: "akta-rupst-attendance", level: 2 },
              indent: { left: 1440, hanging: 360 },
            };
            docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, opts));
          } else {
            const isDearestDeep = (block.indentTabs || 0) >= 2.0;
            let indent = { left: 1080, hanging: 360 };
            let numLvl = 1;
            if (isDearestDeep) {
              indent = { left: 1800, hanging: 360 };
              numLvl = 3;
            }
            const opts: any = {
              style: "ListParagraph",
              numbering: { reference: "akta-rupst-attendance", level: numLvl },
              indent,
            };
            docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, opts));
          }
        } else if (zone === "general") {
          const isDeep = (block.indentTabs || 0) >= 0.8;
          const opts: any = {
            style: "ListParagraph",
            numbering: { reference: "akta-rupst-general", level: 2 },
            indent: isDeep ? { left: 1080, hanging: 360 } : { left: 720, hanging: 360 },
          };
          docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, opts));
        } else if (zone === "decisions") {
          if (isNumbered) {
            const opts: any = {
              style: "ListParagraph",
              numbering: { reference: "akta-rupst-appointment", level: 0 },
              indent: { left: 1080, hanging: 360 },
            };
            docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, opts));
          } else if (isLetter) {
            const opts: any = {
              style: "ListParagraph",
              numbering: { reference: "akta-rupst-decisions", level: 1 },
              indent: { left: 1080, hanging: 360 },
            };
            docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, opts));
          } else {
            const isDeep = (block.indentTabs || 0) >= 1.5;
            const opts: any = {
              style: "ListParagraph",
              numbering: { reference: "akta-rupst-decisions", level: 2 },
              indent: isDeep ? { left: 1440, hanging: 360 } : { left: 1080, hanging: 360 },
            };
            docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, opts));
          }
        } else if (zone === "saksi") {
          const opts: any = {
            style: "ListParagraph",
            numbering: { reference: "akta-rupst-saksi", level: 2 },
            indent: { left: 850, hanging: 425 },
          };
          docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0, opts));
        } else {
          docxChildren.push(factory.createListP(block.bullet, block.runs, block.indentTabs || 0));
        }
      } else if (block.type === "shareholder-list") {
        const paragraphs = factory.createShareholderListParagraphs(block.bullet, block.name, block.sharesText, block.rpText, block.salutation);
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
