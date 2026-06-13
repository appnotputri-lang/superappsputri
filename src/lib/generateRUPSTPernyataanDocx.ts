import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  IParagraphOptions,
  LevelFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Header,
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData } from "../../types";
import { generateRupstPernyataanBlocks, RunToken } from "./rupsTahunanPernyataanBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";

// ─── Constants (matching the DOCX exactly) ───────────────────────────────────
const FONT = "Times New Roman";

// Margins: top=1440, right=1800, bottom=1440, left=1800 (from <w:pgMar> in XML)
const PAGE_MARGIN_LEFT = 1800;
const PAGE_MARGIN_RIGHT = 1800;

// Content width = 11906 - 1800 - 1800 = 8306 DXA
const CONTENT_WIDTH = 8306;

// ListNumber indent: left=360, hanging=360 (from abstractNumId=7 in numbering.xml)
const LIST_NUM_LEFT = 360;
const LIST_NUM_HANGING = 360;

// ListBullet indent: left=720, hanging=360 to indent inside ListNumber
const LIST_BULLET_LEFT = 720;
const LIST_BULLET_HANGING = 360;

// Management list indent: left=426, colons at 1500, values at 1800
const MGMT_LEFT = 426;
const MGMT_COLON_TAB = 1500;
const MGMT_VALUE_TAB = 1800;

// Signature column width
const SIG_COL_WIDTH = 4153; // Half of 8306

// ─── Helper: build TextRun children from RunToken array ──────────────────────
const buildRuns = (tokens: RunToken[]): TextRun[] => {
  const runs: TextRun[] = [];
  for (const t of tokens) {
    runs.push(
      new TextRun({
        text: t.text,
        bold: t.bold,
        italics: t.italic,
        underline: t.underline ? {} : undefined,
        color: t.color,
        size: t.size, // already in half-points
        font: FONT,
      })
    );
  }
  return runs;
};

// ─── Helper: build TextRun children, splitting \t into explicit tab runs ──────
const buildRunsWithTabs = (tokens: RunToken[]): TextRun[] => {
  const runs: TextRun[] = [];
  for (const t of tokens) {
    if (t.text === "\t") {
      runs.push(new TextRun({ text: "\t", font: FONT, bold: t.bold }));
    } else {
      runs.push(
        new TextRun({
          text: t.text,
          bold: t.bold,
          italics: t.italic,
          underline: t.underline ? {} : undefined,
          color: t.color,
          size: t.size,
          font: FONT,
        })
      );
    }
  }
  return runs;
};

// ─── Helper: normal paragraph ─────────────────────────────────────────────────
const makeP = (
  tokens: RunToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  return new Paragraph({
    children: buildRuns(tokens),
    alignment: AlignmentType.JUSTIFIED,
    ...options,
  });
};

// ─── Helper: empty paragraph ──────────────────────────────────────────────────
const makeEmpty = (): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: "", font: FONT })],
  });

// ─── Helper: management Nama bullet paragraph ─────────────────────────────────
// Uses numbering reference "mgmtBullet" (decimal %1.) with left=426
const makeMgmtNamed = (tokens: RunToken[]): Paragraph =>
  new Paragraph({
    children: buildRunsWithTabs(tokens),
    numbering: { reference: "mgmtBullet", level: 0 },
    tabStops: [
      { type: TabStopType.LEFT, position: MGMT_COLON_TAB },
      { type: TabStopType.LEFT, position: MGMT_VALUE_TAB },
    ],
    indent: { left: MGMT_LEFT },
    alignment: AlignmentType.LEFT,
  });

// ─── Helper: management NIK/Jabatan (no bullet, indent left=426) ─────────────
const makeMgmtSub = (tokens: RunToken[], spacingAfter?: number): Paragraph =>
  new Paragraph({
    children: buildRunsWithTabs(tokens),
    tabStops: [
      { type: TabStopType.LEFT, position: MGMT_COLON_TAB },
      { type: TabStopType.LEFT, position: MGMT_VALUE_TAB },
    ],
    indent: { left: MGMT_LEFT },
    alignment: AlignmentType.LEFT,
    spacing: spacingAfter !== undefined ? { after: spacingAfter } : undefined,
  });

// ─── Helper: ListNumber paragraph (1. 2. 3. 4.) ───────────────────────────────
const makeListNumber = (tokens: RunToken[]): Paragraph =>
  new Paragraph({
    children: buildRuns(tokens),
    numbering: { reference: "listNumber", level: 0 },
    alignment: AlignmentType.JUSTIFIED,
  });

// ─── Helper: ListBullet paragraph (sub-items) ────────────────────────────────
const makeListBullet = (tokens: RunToken[]): Paragraph =>
  new Paragraph({
    children: buildRuns(tokens),
    numbering: { reference: "listBullet", level: 0 },
    alignment: AlignmentType.JUSTIFIED,
  });

// ─── Helper: empty ListNumber spacer (numId=0 equivalent — just empty para) ──
const makeListNumberSpacer = (): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: "", font: FONT })],
  });

// ─── Helper: inline-break paragraph ─────────────────────────────────────────
// Converts \n in runs to TextRun({ break: 1 })
const makeInlineBr = (tokens: RunToken[], align?: string): Paragraph => {
  const children: TextRun[] = [];
  for (const t of tokens) {
    if (t.text === "\n") {
      children.push(new TextRun({ break: 1, font: FONT }));
    } else {
      children.push(
        new TextRun({
          text: t.text,
          bold: t.bold,
          italics: t.italic,
          underline: t.underline ? {} : undefined,
          color: t.color,
          size: t.size,
          font: FONT,
        })
      );
    }
  }
  
  let alignment: any = AlignmentType.JUSTIFIED;
  if (align === "left") alignment = AlignmentType.LEFT;
  if (align === "center") alignment = AlignmentType.CENTER;
  
  return new Paragraph({ children, alignment });
};

// ─── Helper: signature table ──────────────────────────────────────────────────
const makeSigTable = (columns: { name: string; position: string }[]): Table => {
  // MS Word dashed gridlines look like BorderStyle.DASHED, but normally we use NONE.
  // The screenshot shows a dashed border, which seems like MS Word's gridlines. Let's use dashed borders to match it visually.
  const tblBorder = { style: BorderStyle.DASHED, size: 4, color: "888888" };
  const borders = {
    top: tblBorder, bottom: tblBorder, left: tblBorder, right: tblBorder,
    insideHorizontal: tblBorder, insideVertical: tblBorder,
  };

  const makeCell = (name: string, position: string): TableCell =>
    new TableCell({
      borders: {
        top: tblBorder, bottom: tblBorder, left: tblBorder, right: tblBorder,
      },
      width: { size: SIG_COL_WIDTH, type: WidthType.DXA },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: name, bold: true, font: FONT })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: position, font: FONT })],
        }),
      ],
    });

  return new Table({
    width: { size: SIG_COL_WIDTH * 2, type: WidthType.DXA },
    columnWidths: [SIG_COL_WIDTH, SIG_COL_WIDTH],
    borders,
    rows: [
      new TableRow({
        children: [
          makeCell(columns[0]?.name || "", columns[0]?.position || ""),
          makeCell(columns[1]?.name || "", columns[1]?.position || ""),
        ],
      }),
    ],
  });
};

// ─── Helper: single signature (komisaris below table) ────────────────────────
const makeSigSingle = (name: string, position: string): Paragraph[] => [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: name, bold: true, font: FONT })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: position, font: FONT })],
    spacing: { after: 240 },
  }),
];

// ─── Main export ──────────────────────────────────────────────────────────────
export const generateRUPSTPernyataanDocx = async (data: CompanyData, returnBlob?: boolean) => {
  const rawBlocks = generateRupstPernyataanBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);
  const docxChildren: any[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "p":
        docxChildren.push(
          makeP(block.runs, {
            alignment:
              block.align === "center"
                ? AlignmentType.CENTER
                : (block.align === "left" ? AlignmentType.LEFT : AlignmentType.JUSTIFIED),
            spacing: block.spacingAfter ? { after: block.spacingAfter } : undefined,
          })
        );
        break;

      case "br":
        docxChildren.push(makeListNumberSpacer());
        break;

      case "inlineBr":
        docxChildren.push(makeInlineBr(block.runs, (block as any).align));
        break;

      case "managementNamed":
        docxChildren.push(makeMgmtNamed(block.runs));
        break;

      case "managementSub":
        docxChildren.push(makeMgmtSub(block.runs, block.spacingAfter));
        break;

      case "listNumber":
        docxChildren.push(makeListNumber(block.runs));
        break;

      case "listBullet":
        docxChildren.push(makeListBullet(block.runs));
        break;

      case "sigTable":
        docxChildren.push(makeSigTable(block.columns));
        break;

      case "sigSingle":
        docxChildren.push(makeSigTable([{ name: block.name, position: block.position }])); 
        // Using table for single signers too to maintain exact same centered cell format and borders
        break;
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        // Management list: decimal %1. left=426 hanging=426 (matches numId=10 abstractNumId=10 in DOCX)
        {
          reference: "mgmtBullet",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: MGMT_LEFT, hanging: MGMT_LEFT },
                },
              },
            },
          ],
        },
        // ListNumber: decimal %1. left=360 hanging=360 (matches abstractNumId=7/ListNumber style)
        {
          reference: "listNumber",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: LIST_NUM_LEFT, hanging: LIST_NUM_HANGING },
                },
              },
            },
          ],
        },
        // ListBullet: bullet char left=360 hanging=360 (matches abstractNumId=8/ListBullet)
        {
          reference: "listBullet",
          levels: [
            {
              level: 0,
              format: LevelFormat.LOWER_LETTER,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: {
                    left: LIST_BULLET_LEFT,
                    hanging: LIST_BULLET_HANGING,
                  },
                },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: 22, // 11pt default body — DOCX uses ~22 (11pt) for body, title uses explicit 28
          },
          paragraph: {
            // line: 360 = exact 1.5× at 12pt; matches <w:docGrid w:linePitch="360"/>
            spacing: { line: 240, lineRule: "auto", before: 0, after: 0 },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: {
              top: 1440,
              bottom: 1440,
              left: PAGE_MARGIN_LEFT,
              right: PAGE_MARGIN_RIGHT,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "KOP SURAT", bold: true, font: FONT, size: 24 }),
                ],
              }),
            ],
          }),
        },
        children: docxChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Surat Pernyataan RUPST ${data.companyName || 'PT Baru'}.docx`;
  if (returnBlob) {
    return { blob, filename };
  }
  saveAs(blob, filename);
};