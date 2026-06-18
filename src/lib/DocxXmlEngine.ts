import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export class DocxXmlEngine {
  /**
   * Generates a DOCX blob given a base64 template and payload
   */
  static generateDocx(base64Template: string, data: Record<string, any>): Blob {
    try {
      const isDataUrl = base64Template.startsWith('data:');
      const base64Str = isDataUrl ? base64Template.split(',')[1] : base64Template;
      
      const binaryString = atob(base64Str);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      
      const zip = new PizZip(bytes);
      
      const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
      });
      
      // Inject data
      doc.render(data);
      
      // Generate output blob
      const out = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      
      return out;
    } catch (error) {
      console.error("DocxXmlEngine Error:", error);
      throw new Error("Gagal memproses template DOCX. Pastikan format tag sesuai.");
    }
  }
}
