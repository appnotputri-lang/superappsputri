import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType
} from "docx";
import { saveAs } from "file-saver";
import { generatePendirianBlocks, PendirianData } from "./pendirianContentBlocks";

export async function generatePendirianDocx(data: PendirianData, returnBlob?: boolean): Promise<any> {
  if (!data) {
    throw new Error("Data pendirian tidak boleh kosong");
  }

  const blocks = generatePendirianBlocks(data);
  const docChildren: Paragraph[] = [];
  const defaultFont = "Times New Roman";

  for (const block of blocks) {
    if (block.type === 'br') {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "", font: defaultFont, size: 24 })],
          spacing: { before: 60, after: 60, line: 360 }
        })
      );
      continue;
    }

    if (block.type === 'divider' || block.type === 'pasal-divider') {
      const text = block.type === 'pasal-divider' ? block.text : block.text.toUpperCase();
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text, font: defaultFont, size: 24, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 120, line: 360 }
        })
      );
      continue;
    }

    if (block.type === 'pt-name') {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: block.text.toUpperCase(), font: defaultFont, size: 24, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 180, after: 120, line: 360 }
        })
      );
      continue;
    }

    if (block.type === 'management-role') {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "-   ", font: defaultFont, size: 24 }),
            new TextRun({ text: `${block.position}\t: `, font: defaultFont, size: 24 }),
            new TextRun({ text: block.salutation ? `${block.salutation} ` : "", font: defaultFont, size: 24 }),
            new TextRun({ text: block.name, font: defaultFont, size: 24, bold: true }),
            new TextRun({ text: ", tersebut di atas;", font: defaultFont, size: 24 })
          ],
          alignment: AlignmentType.BOTH,
          spacing: { before: 60, after: 60, line: 360 },
          indent: { left: 720, hanging: 360 }
        })
      );
      continue;
    }

    let prefixText: string = "";
    let indentOpts: any = { before: 60, after: 60, line: 360 };
    let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.BOTH;

    if (block.type === 'numbered') {
      prefixText = `${block.num}.  `;
      indentOpts.left = 720;
      indentOpts.hanging = 360;
    } else if (block.type === 'sub-numbered') {
      prefixText = `${block.num}.\t`;
      indentOpts.left = 1080;
      indentOpts.hanging = 360;
    } else if (block.type === 'list') {
      prefixText = `-   `;
      indentOpts.left = 720;
      indentOpts.hanging = 360;
    } else if (block.type === 'saksi') {
      prefixText = `${block.num}.\t`;
      indentOpts.left = 720;
      indentOpts.hanging = 360;
    } else if (block.type === 'shareholder') {
      const bVal: string = String((block as any).bullet || '-');
      prefixText = (bVal + '\t') as string;
      indentOpts.left = 720;
      indentOpts.hanging = 360;
    } else if (block.type === 'p') {
      if (block.align === 'center') {
        alignment = AlignmentType.CENTER;
      }
    }

    const textRuns: TextRun[] = [];
    if (prefixText) {
      textRuns.push(new TextRun({ text: prefixText, font: defaultFont, size: 24, bold: true }));
    }

    if ('runs' in block && block.runs && (block as any).runs.length > 0) {
      for (const r of (block as any).runs) {
        textRuns.push(
          new TextRun({
            text: r.text || "",
            font: defaultFont,
            size: 24,
            bold: !!r.bold
          })
        );
      }
    } else if ('text' in block && typeof (block as any).text === 'string') {
      textRuns.push(
        new TextRun({
          text: (block as any).text,
          font: defaultFont,
          size: 24
        })
      );
    } else if (block.type === 'shareholder') {
      textRuns.push(
        new TextRun({ text: block.name, font: defaultFont, size: 24, bold: true }),
        new TextRun({ text: `: ${block.sharesText} (${block.rpText})`, font: defaultFont, size: 24 })
      );
    }

    docChildren.push(
      new Paragraph({
        children: textRuns,
        alignment,
        spacing: indentOpts,
        indent: indentOpts.left ? { left: indentOpts.left, hanging: indentOpts.hanging } : undefined
      })
    );
  }

  // Add signature section / notary block if data has notary info
  if (data.notarisNamaSurat) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "", font: defaultFont, size: 24 })],
        spacing: { before: 240, after: 120 }
      })
    );
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "BERDASARKAN AKTA TERSEBUT,", font: defaultFont, size: 24, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 }
      })
    );
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Notaris: ", font: defaultFont, size: 24, bold: true }),
          new TextRun({ text: data.notarisNamaSurat, font: defaultFont, size: 24 })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 60 }
      })
    );
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Kedudukan: ", font: defaultFont, size: 24, bold: true }),
          new TextRun({ text: data.notarisTempat || "Kabupaten Bandung Barat", font: defaultFont, size: 24 })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 60 }
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  const typeMap: Record<string, string> = {
    'PT': 'PT',
    'CV': 'CV',
    'YAYASAN': 'YAYASAN',
    'PERKUMPULAN': 'PERKUMPULAN',
    'PERSEKUTUAN_FIRMA': 'FIRMA',
    'PERSEKUTUAN_PERDATA': 'PERSEKUTUAN PERDATA',
    'KOPERASI': 'KOPERASI',
    'PMA': 'PT',
    'PERORANGAN': 'PT',
    'LAINNYA': ''
  };

  const clientType = data.clientType || 'PT';
  const prefix = typeMap[clientType] || 'PT';
  const cleanName = (data.namaPt || "").trim().replace(/^(PT\.?|PERSEROAN TERBATAS)\s*/i, "");
  const fullName = prefix ? `${prefix} ${cleanName}` : cleanName;
  const safeName = fullName.toUpperCase().replace(/\s+/g, "_");
  const fileName = `Akta_Pendirian_${safeName}.docx`;

  if (returnBlob) {
    return { filename: fileName, blob };
  }

  saveAs(blob, fileName);
}
