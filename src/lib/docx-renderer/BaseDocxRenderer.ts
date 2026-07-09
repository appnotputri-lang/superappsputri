import { Document, Packer, Header, Footer } from "docx";
import { saveAs } from "file-saver";

export interface DocxRenderConfig {
  margins: { left: number; right: number; top: number; bottom: number };
  numbering?: any[];
  header?: Header;
  footer?: Footer;
  children: any[]; // Paragraph or Table array
  styles?: any;
}

export class BaseDocxRenderer {
  static async render(config: DocxRenderConfig, fileName: string, returnBlob?: boolean) {
    const doc = new Document({
      styles: config.styles || {
        default: {
          document: {
            run: { size: 20, font: "Century Gothic" },
            paragraph: { spacing: { line: 480, lineRule: "auto" } }
          }
        }
      },
      numbering: config.numbering ? { config: config.numbering } : undefined,
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: config.margins
          }
        },
        headers: config.header ? { default: config.header } : undefined,
        footers: config.footer ? { default: config.footer } : undefined,
        children: config.children
      }]
    });

    const blob = await Packer.toBlob(doc);
    if (returnBlob) {
      return { blob, filename: fileName }; // some return {blob, filename}
    }
    saveAs(blob, fileName);
    return { blob, filename: fileName };
  }
}
