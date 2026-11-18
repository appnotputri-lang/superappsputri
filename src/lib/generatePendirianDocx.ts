import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  LeaderType,
  TabStopType
} from "docx";
import { saveAs } from "file-saver";
import { generatePendirianBlocks, PendirianData } from "./pendirianContentBlocks";
import { FormatToken, parseTextRuns } from "./notaryWrapper";

const FONT = "Century Gothic";
const FONT_SIZE = 20; // 10pt, matching public/template_pendirian.docx
const TAB_LINE_END = 8364; // template's right edge leader tab, in twips
const HYPHEN_TAB = {
  type: TabStopType.RIGHT,
  position: TAB_LINE_END,
  leader: LeaderType.HYPHEN,
};

function makeTextRun(token: FormatToken): TextRun {
  return new TextRun({
    text: token.text || "",
    font: FONT,
    size: FONT_SIZE,
    bold: !!token.bold,
    italics: !!token.italic,
    underline: token.underline ? {} : undefined,
  });
}

function makeWrappedRuns(tokens: FormatToken[], maxWidth: number, withLeader = true): TextRun[] {
  const lines = parseTextRuns(tokens, maxWidth);
  const children: TextRun[] = [];

  lines.forEach((line, index) => {
    line.forEach(token => children.push(makeTextRun(token)));
    if (withLeader) children.push(new TextRun({ text: "\t", font: FONT, size: FONT_SIZE }));
    if (index < lines.length - 1) children.push(new TextRun({ break: 1, font: FONT, size: FONT_SIZE }));
  });

  return children;
}

function getBlockLineWidth(block: any): number {
  if (block.type === "sub-numbered" || block.type === "management-role") return 37.1;
  if (block.type === "list") return 39.3;
  return 41.5;
}

export async function generatePendirianDocx(data: PendirianData, returnBlob?: boolean): Promise<any> {
  if (!data) {
    throw new Error("Data pendirian tidak boleh kosong");
  }

  const blocks = generatePendirianBlocks(data);
  const docChildren: Paragraph[] = [];
  const defaultFont = FONT;

  for (const block of blocks) {
    if (block.type === 'br') {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: "\t", font: defaultFont, size: FONT_SIZE })],
          tabStops: [HYPHEN_TAB],
          spacing: { before: 0, after: 0, line: 480 }
        })
      );
      continue;
    }

    if (block.type === 'divider' || block.type === 'pasal-divider') {
      const text = block.type === 'pasal-divider' ? block.text : block.text.toUpperCase();
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "\t", font: defaultFont, size: FONT_SIZE }),
            new TextRun({ text, font: defaultFont, size: FONT_SIZE, bold: true }),
            new TextRun({ text: "\t", font: defaultFont, size: FONT_SIZE }),
          ],
          tabStops: [
            { type: TabStopType.CENTER, position: TAB_LINE_END / 2, leader: LeaderType.HYPHEN },
            HYPHEN_TAB,
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: 480 }
        })
      );
      continue;
    }

    if (block.type === 'pt-name') {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: "\t", font: defaultFont, size: FONT_SIZE }),
            new TextRun({ text: block.text.toUpperCase(), font: defaultFont, size: FONT_SIZE, bold: true }),
            new TextRun({ text: "\t", font: defaultFont, size: FONT_SIZE }),
          ],
          tabStops: [
            { type: TabStopType.CENTER, position: TAB_LINE_END / 2, leader: LeaderType.HYPHEN },
            HYPHEN_TAB,
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: 480 }
        })
      );
      continue;
    }

    if (block.type === 'management-role') {
      docChildren.push(
        new Paragraph({
          children: [
            ...makeWrappedRuns([
              { text: `-   ${block.position}\t: ` },
              { text: block.salutation ? `${block.salutation} ` : "" },
              { text: block.name, bold: true },
              { text: ", tersebut di atas;" },
            ], getBlockLineWidth(block)),
          ],
          tabStops: [
            { type: TabStopType.LEFT, position: 1701 },
            HYPHEN_TAB,
          ],
          alignment: AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: 480 },
          indent: { left: 720, hanging: 360 }
        })
      );
      continue;
    }

    let prefixText: string = "";
    let indentOpts: any = {};

    if (block.type === 'appearer') {
      prefixText = `${block.num}. `;
      indentOpts.left = 284;
      indentOpts.hanging = 284;
    } else if (block.type === 'numbered') {
      prefixText = `${block.num}.  `;
      indentOpts.left = 720;
      indentOpts.hanging = 360;
    } else if (block.type === 'sub-numbered') {
      prefixText = `${block.num}. `;
      indentOpts.left = 1080;
      indentOpts.hanging = 360;
    } else if (block.type === 'list') {
      prefixText = `-   `;
      indentOpts.left = 720;
      indentOpts.hanging = 360;
    } else if (block.type === 'saksi') {
      prefixText = `${block.num}. `;
      indentOpts.left = 720;
      indentOpts.hanging = 360;
    } else if (block.type === 'shareholder') {
      const bVal: string = String((block as any).bullet || '-');
      prefixText = `${bVal}  `;
      indentOpts.left = 720;
      indentOpts.hanging = 360;
    }

    const tokens: FormatToken[] = [];
    if (prefixText) {
      tokens.push({ text: prefixText, bold: true });
    }

    if ('runs' in block && block.runs && (block as any).runs.length > 0) {
      for (const r of (block as any).runs) {
        tokens.push({ text: r.text || "", bold: !!r.bold });
      }
    } else if ('text' in block && typeof (block as any).text === 'string') {
      tokens.push({ text: (block as any).text });
    } else if (block.type === 'shareholder') {
      tokens.push(
        { text: block.name, bold: true },
        { text: `: ${block.sharesText} (${block.rpText})` }
      );
    }

    const isCentered = block.type === 'p' && (block.align === 'center' || block.align === 'right-center');
    const textRuns = makeWrappedRuns(tokens, getBlockLineWidth(block), !isCentered);

    docChildren.push(
      new Paragraph({
        children: textRuns,
        tabStops: isCentered ? [] : [HYPHEN_TAB],
        alignment: isCentered ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 480 },
        indent: indentOpts.left ? { left: indentOpts.left, hanging: indentOpts.hanging } : undefined
      })
    );
  }

  // Add signature section / notary block if data has notary info
  if (data.notarisNamaSurat) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "", font: defaultFont, size: FONT_SIZE })],
        spacing: { before: 240, after: 120 }
      })
    );
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: "BERDASARKAN AKTA TERSEBUT,", font: defaultFont, size: FONT_SIZE, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 }
      })
    );
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Notaris: ", font: defaultFont, size: FONT_SIZE, bold: true }),
          new TextRun({ text: data.notarisNamaSurat, font: defaultFont, size: FONT_SIZE })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 60 }
      })
    );
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Kedudukan: ", font: defaultFont, size: FONT_SIZE, bold: true }),
          new TextRun({ text: data.notarisTempat || "Kabupaten Bandung Barat", font: defaultFont, size: FONT_SIZE })
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
              top: 1418,
              right: 1134,
              bottom: 1418,
              left: 2268,
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
