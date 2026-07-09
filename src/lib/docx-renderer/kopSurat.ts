import { Header, Paragraph, TextRun, AlignmentType } from "docx";

export function buildKopSuratHeader(
  companyName?: string,
  domicile?: string,
  enabled: boolean = true
): Header | undefined {
  if (!enabled) {
    return undefined;
  }

  const p = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: "KOP SURAT PT",
        bold: true,
        font: "Arial",
        size: 24,
        color: "E06666",
      }),
    ],
    spacing: {
      before: 0,
      after: 240,
    },
  });

  return new Header({
    children: [p],
  });
}
