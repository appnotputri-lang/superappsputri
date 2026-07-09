import { Table, TableRow, TableCell, Paragraph, TextRun, AlignmentType, BorderStyle, WidthType } from "docx";
import { FONT_FAMILY, FONT_SIZE } from "./constants";

const borderNone = { style: BorderStyle.NONE, size: 0, color: "auto" };
const borders = {
  top: borderNone, bottom: borderNone, left: borderNone, right: borderNone,
  insideHorizontal: borderNone, insideVertical: borderNone,
} as any;

export const createParticipantSigsTable = (participants: any[], tableWidth: number = 8504, font: string = FONT_FAMILY, size: number = FONT_SIZE) => {
  const columnsWidth = [5300, 3204];
  const formatParticipantName = (sh: any) => {
    if (sh.isProxy && sh.proxyData && sh.proxyData.name) {
      return `${sh.proxyData.name.toUpperCase()} qq ${sh.name.toUpperCase()}`;
    }
    return sh.name.toUpperCase();
  };

  const rows = participants.map((sh: any, idx: number) => {
    const numAndName = `${idx + 1}. ${formatParticipantName(sh)}`;
    return new TableRow({
      children: [
        new TableCell({
          borders,
          margins: { top: 120, bottom: 120, left: 0, right: 120 },
          width: { size: columnsWidth[0], type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: numAndName, bold: false, font: font, size: size })],
              alignment: AlignmentType.LEFT,
              spacing: { line: 480, after: 240 },
            }),
          ],
        }),
        new TableCell({
          borders,
          margins: { top: 120, bottom: 120, left: 120, right: 0 },
          width: { size: columnsWidth[1], type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: "........................................................", bold: false, font: font, size: size })],
              alignment: AlignmentType.LEFT,
              spacing: { line: 480, after: 240 },
            }),
          ],
        }),
      ],
    });
  });

  return new Table({
    rows,
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: columnsWidth,
    borders,
  });
};

export const createGenericTable = (headers: string[], widths: number[], rows: string[][], tableWidth: number = 8504, font: string = FONT_FAMILY, size: number = FONT_SIZE) => {
  const borderSingle = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const bordersSingle = {
    top: borderSingle, bottom: borderSingle, left: borderSingle, right: borderSingle,
    insideHorizontal: borderSingle, insideVertical: borderSingle,
  } as any;

  const headerRow = new TableRow({
    children: headers.map((headerText, idx) => {
      return new TableCell({
        borders: bordersSingle,
        margins: { top: 120, bottom: 120, left: 120, right: 120 },
        width: { size: widths[idx] || 1500, type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: headerText, bold: true, size: size, font: font })
            ]
          })
        ]
      });
    })
  });

  const bodyRows = rows.map((row) => {
    return new TableRow({
      children: row.map((cellText, idx) => {
        const lines = (cellText || "").split("\n");
        const paragraphs = lines.map((line) => {
          return new Paragraph({
            alignment: idx === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
            children: [
              new TextRun({ text: line, size: size, font: font })
            ]
          });
        });

        if (idx === 3 && (!cellText || cellText.trim() === "")) {
          return new TableCell({
            borders: bordersSingle,
            margins: { top: 400, bottom: 400, left: 120, right: 120 },
            width: { size: widths[idx] || 1500, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] })
            ]
          });
        }

        return new TableCell({
          borders: bordersSingle,
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          width: { size: widths[idx] || 1500, type: WidthType.DXA },
          children: paragraphs
        });
      })
    });
  });

  return new Table({
    rows: [headerRow, ...bodyRows],
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: widths
  });
};

export const createShareholderSigsTable = (attendingShareholders: any[], proxyDataList: any[], repData: any, tableWidth: number = 8504, font: string = FONT_FAMILY, size: number = FONT_SIZE) => {
  const borderSingle = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const bordersSingle = {
    top: borderSingle, bottom: borderSingle, left: borderSingle, right: borderSingle,
    insideHorizontal: borderSingle, insideVertical: borderSingle,
  } as any;
  const hadirWidths = [500, 3100, 2904, 2000];

  const hadirHeaderRow = new TableRow({
    children: [
      new TableCell({ borders: bordersSingle, margins: { top: 120, bottom: 120, left: 120, right: 120 }, width: { size: hadirWidths[0], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", bold: true, size: size, font: font })] })] }),
      new TableCell({ borders: bordersSingle, margins: { top: 120, bottom: 120, left: 120, right: 120 }, width: { size: hadirWidths[1], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nama", bold: true, size: size, font: font })] })] }),
      new TableCell({ borders: bordersSingle, margins: { top: 120, bottom: 120, left: 120, right: 120 }, width: { size: hadirWidths[2], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Kedudukan", bold: true, size: size, font: font })] })] }),
      new TableCell({ borders: bordersSingle, margins: { top: 120, bottom: 120, left: 120, right: 120 }, width: { size: hadirWidths[3], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tanda Tangan", bold: true, size: size, font: font })] })] }),
    ]
  });

  const formatParticipantName = (sh: any) => {
    if (sh.isProxy && sh.proxyData && sh.proxyData.name) {
      return `${sh.proxyData.name.toUpperCase()} qq ${sh.name.toUpperCase()}`;
    }
    return sh.name.toUpperCase();
  };

  const allAttendees = [...attendingShareholders, ...proxyDataList];
  if (repData && repData.name && !allAttendees.find(a => a.name === repData.name)) {
    allAttendees.push(repData);
  }

  const hadirBodyRows = allAttendees.map((sh, idx) => {
    const isKuasa = !!sh.isProxy;
    const isDireksi = !!(repData && repData.name === sh.name);
    let kedudukanText = "Pemegang Saham";
    if (isKuasa) kedudukanText = "Kuasa Pemegang Saham";
    else if (isDireksi) kedudukanText = "Direksi / Wakil Perseroan";

    return new TableRow({
      children: [
        new TableCell({ borders: bordersSingle, margins: { top: 400, bottom: 400, left: 120, right: 120 }, width: { size: hadirWidths[0], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}.`, size: size, font: font })] })] }),
        new TableCell({ borders: bordersSingle, margins: { top: 400, bottom: 400, left: 120, right: 120 }, width: { size: hadirWidths[1], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: formatParticipantName(sh), size: size, font: font })] })] }),
        new TableCell({ borders: bordersSingle, margins: { top: 400, bottom: 400, left: 120, right: 120 }, width: { size: hadirWidths[2], type: WidthType.DXA }, children: kedudukanText.split("\n").map(l => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: l, size: size, font: font })] })) }),
        new TableCell({ borders: bordersSingle, margins: { top: 400, bottom: 400, left: 120, right: 120 }, width: { size: hadirWidths[3], type: WidthType.DXA }, children: [new Paragraph({ children: [] }), new Paragraph({ children: [] }), new Paragraph({ children: [] })] })
      ]
    });
  });

  return new Table({
    rows: [hadirHeaderRow, ...hadirBodyRows],
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: hadirWidths
  });
};
