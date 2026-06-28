import {
  AlignmentType,
  Document,
  Footer,
  IParagraphOptions,
  LeaderType,
  LevelFormat,
  PageNumber,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";
import { CompanyData } from "../../types";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { Block, generateRupstAktaBlocks } from "./rupsTahunanAktaContentBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";

// ─── Tab stop & font constants ────────────────────────────────────────────────
const TAB_KANAN = {
  type: TabStopType.RIGHT,
  position: 9020,
  leader: LeaderType.HYPHEN,
};

const NOTARIS_TAB_STOPS = [
  { type: TabStopType.LEFT, position: 4395 },
  TAB_KANAN,
];

const FONT_NAME = "Century Gothic";
const FONT_SIZE = 20;

// ─── Text-wrap widths ─────────────────────────────────────────────────────────
// Calculated from: available = (9020 - ind.left) / (9020/44.0)
// Content width = 11906 - 2268 - 618 = 9020 DXA ; 1 char ≈ 204.9 DXA
const W = {
  normal:         44.0,
  indent284:      41.5,
  indent426:      41.0,
  // Preamble dashes  (numId2 ilvl2 ind=426)
  preambleDash:   41.0,   // (9020-426)/204.9 = 41.9 → use slightly less for safety
  // Attendance
  attendeeNum:    39.5,   // numId3 ilvl0  no extra ind
  attendeeDash:   37.5,   // numId3 ilvl2 ind=1134
  attendeeLetter: 36.0,   // numId7 ilvl0 ind=1418
  // General zone — 4 distinct variants (from corrected docx XML)
  generalBahwaDari:   37.8,   // numId4 ilvl2 ind.left=1134  (Bahwa dari semua saham)
  generalMenurut:     39.5,   // numId4 ilvl2 ind.left=709 hanging=425  (Bahwa menurut)
  generalBerdasarkan: 39.5,   // numId4 ilvl2 ind.left=709  (Berdasarkan ketentuan)
  generalDalamAcara:  39.5,   // numId4 ilvl2 ind.left=709  (Bahwa dalam acara)
  agendaItem:         37.5,   // numId4 ilvl2 ind.left=1134  (agenda sub-items)
  // Decisions
  decisionNum:    39.5,   // numId5 ilvl0 ind=426 hanging=426
  decisionLetter: 37.8,   // numId5 ilvl1 ind=851
  decisionDash:   37.8,   // numId5 ilvl2 ind=851 hanging=425
  // Saksi
  saksiNum:       41.5,   // numId9 ilvl0 ind=425 hanging=425
  saksiDash:      39.0,   // numId9 ilvl2 ind=850 hanging=425
};

// ─── Numbering references ─────────────────────────────────────────────────────
const NUM = {
  PREAMBLE_DASH:  "num-2",   // abstractNum 5
  ATTENDANCE:     "num-3",   // abstractNum 1
  ATTENDANCE_LTR: "num-7",   // abstractNum 0
  GENERAL:        "num-4",   // abstractNum 2
  DECISIONS:      "num-5",   // abstractNum 3
  SAKSI:          "num-9",   // abstractNum 4
};

const DASH_LEVEL = {
  level: 2,
  format: LevelFormat.BULLET,
  text: "-",
  alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: 720, hanging: 360 } } },
};

const buildNumberingConfig = () => ({
  config: [
    {
      // abstractNum 0 → NUM.ATTENDANCE_LTR
      reference: NUM.ATTENDANCE_LTR,
      levels: [
        {
          level: 0,
          format: LevelFormat.LOWER_LETTER,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
        },
      ],
    },
    {
      // abstractNum 1 → NUM.ATTENDANCE
      reference: NUM.ATTENDANCE,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
        {
          level: 1,
          format: LevelFormat.LOWER_LETTER,
          text: "%2.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
        },
        DASH_LEVEL,
      ],
    },
    {
      // abstractNum 2 → NUM.GENERAL
      reference: NUM.GENERAL,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
        {
          level: 1,
          format: LevelFormat.LOWER_LETTER,
          text: "%2.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
        },
        DASH_LEVEL,
      ],
    },
    {
      // abstractNum 3 → NUM.DECISIONS
      reference: NUM.DECISIONS,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
        {
          level: 1,
          format: LevelFormat.LOWER_LETTER,
          text: "%2.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
        },
        DASH_LEVEL,
      ],
    },
    {
      // abstractNum 4 → NUM.SAKSI
      reference: NUM.SAKSI,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 425, hanging: 425 } } },
        },
        {
          level: 1,
          format: LevelFormat.LOWER_LETTER,
          text: "%2.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
        },
        {
          level: 2,
          format: LevelFormat.BULLET,
          text: "-",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 850, hanging: 425 } } },
        },
      ],
    },
    {
      // abstractNum 5 → NUM.PREAMBLE_DASH
      reference: NUM.PREAMBLE_DASH,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
        {
          level: 1,
          format: LevelFormat.LOWER_LETTER,
          text: "%2.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
        },
        DASH_LEVEL,
      ],
    },
  ],
});

// ─── Text-run helpers ─────────────────────────────────────────────────────────
const makeRun = (t: FormatToken): TextRun =>
  new TextRun({
    text: t.text,
    bold: t.bold,
    color: t.color,
    highlight: t.highlight as any,
    italics: t.italic,
    underline: t.underline ? {} : undefined,
  });

const wrappedRuns = (
  tokens: FormatToken[],
  maxWidth: number,
  withRightTab = true,
): TextRun[] => {
  const lines = parseTextRuns(tokens, maxWidth);
  const children: TextRun[] = [];
  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(makeRun(t)));
    if (withRightTab) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });
  return children;
};

// ─── Paragraph factory helpers ────────────────────────────────────────────────
const createP = (
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {},
): Paragraph => {
  const isCentered = options.alignment === AlignmentType.CENTER;
  return new Paragraph({
    children: wrappedRuns(tokens, W.normal, !isCentered),
    tabStops: isCentered ? [] : [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    ...options,
  });
};

const createIndentP = (
  tokens: FormatToken[],
  leftDxa: number,
  options: Omit<IParagraphOptions, "children"> = {},
): Paragraph => {
  const maxWidth = leftDxa >= 993 ? 38.5 : leftDxa >= 426 ? W.indent426 : W.indent284;
  return new Paragraph({
    children: wrappedRuns(tokens, maxWidth),
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa },
    ...options,
  });
};

const createDividerP = (text: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text, bold: true }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.CENTER, position: 4252, leader: LeaderType.HYPHEN },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
  });

const createNotarisEmptyP = (): Paragraph =>
  new Paragraph({ children: [], tabStops: NOTARIS_TAB_STOPS });
const createNotarisLabelP = (domicile: string): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: "\t" }), new TextRun({ text: `Notaris di ${domicile};` })],
    tabStops: NOTARIS_TAB_STOPS,
  });
const createNotarisNameP = (name: string): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: "\t" }), new TextRun({ text: name, bold: true })],
    tabStops: NOTARIS_TAB_STOPS,
  });

// ─── Zone-specific paragraph builders ────────────────────────────────────────
// Each builder maps 1:1 to the exact XML in the corrected source document.

/** PREAMBLE DASH  numId=2 ilvl=2 ind.left=426 hanging=426 or deeper */
const mkPreambleDash = (t: FormatToken[], indentTabs?: number) => {
  const isDeep = indentTabs !== undefined && indentTabs >= 0.8;
  return new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.PREAMBLE_DASH, level: 2 },
    tabStops: [TAB_KANAN],
    indent: isDeep ? { left: 850, hanging: 425 } : { left: 426, hanging: 426 },
    children: wrappedRuns(t, isDeep ? 38.5 : W.preambleDash),
  });
};

/** ATTENDANCE NUMBER  numId=3 ilvl=0 */
const mkAttendanceNum = (t: FormatToken[], bulletStr: string) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.ATTENDANCE, level: 0 },
    tabStops: [TAB_KANAN],
    children: wrappedRuns(t, W.attendeeNum),
  });

/** ATTENDANCE DASH  numId=3 ilvl=2 sejajar angka 3 */
const mkAttendanceDash = (t: FormatToken[], indentTabs?: number) => {
  const isDearestDeep = indentTabs !== undefined && indentTabs >= 2.0;
  const isDeep = indentTabs !== undefined && indentTabs >= 1.5;

  let indent = { left: 720, hanging: 360 };
  let wrapWidth = W.attendeeDash;

  if (isDearestDeep) {
    indent = { left: 1770, hanging: 360 };
    wrapWidth = 32.0;
  } else if (isDeep) {
    indent = { left: 1080, hanging: 360 };
    wrapWidth = 36.0;
  }

  return new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.ATTENDANCE, level: 2 },
    tabStops: [TAB_KANAN],
    indent,
    children: wrappedRuns(t, wrapWidth),
  });
};

/** ATTENDANCE LETTER  manual hanging indent */
const mkAttendanceLetter = (t: FormatToken[], bulletStr: string) =>
  new Paragraph({
    tabStops: [TAB_KANAN],
    indent: { left: 1418, hanging: 284 }, // matching docx indentation roughly (1418 - 284 = 1134)
    children: [
      new TextRun({ text: `${bulletStr}\t` }),
      ...wrappedRuns(t, W.attendeeLetter)
    ],
  });

// ── General zone: 4 distinct builders matching corrected docx XML ─────────────

/** GENERAL: "Bahwa dari semua saham..."
 *  Has bullet - per user request ("harus bullet - dan posisinya sperti contoh melebihi numbering 2")
 *  Position same as "Selaku pemilik" (left 1080, hanging 360) with bullet - */
const mkGeneralBahwaDari = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.GENERAL, level: 2 },
    tabStops: [TAB_KANAN],
    indent: { left: 1080, hanging: 360 },
    children: wrappedRuns(t, W.generalBahwaDari),
  });

/** DECISIONS: "Sehubungan dengan apa..."
 *  Position same as "Bahwa para pemegang saham" (left 426, hanging 426) with bullet - */
const mkDecisionSehubungan = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.DECISIONS, level: 2 },
    tabStops: [TAB_KANAN],
    indent: { left: 426, hanging: 426 },
    children: wrappedRuns(t, W.preambleDash),
  });

/** GENERAL: "Bahwa menurut..."
 *  numId=4 ilvl=2 indent matching level 0 (sejajar angka 3) */
const mkGeneralMenurut = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.GENERAL, level: 2 },
    tabStops: [TAB_KANAN],
    indent: { left: 720, hanging: 360 },
    children: wrappedRuns(t, W.generalMenurut),
  });

/** GENERAL: "Berdasarkan ketentuan..." and "Bahwa dalam acara..."
 *  numId=4 ilvl=2 indent matching level 0 (sejajar angka 3) */
const mkGeneralInd709 = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.GENERAL, level: 2 },
    tabStops: [TAB_KANAN],
    indent: { left: 720, hanging: 360 },
    children: wrappedRuns(t, W.generalBerdasarkan),
  });

/** GENERAL: agenda sub-items (Pernyataan Direksi, Persetujuan, Pengesahan, etc.)
 *  numId=4 ilvl=2 sejajar angka 3 */
const mkAgendaItem = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.GENERAL, level: 2 },
    tabStops: [TAB_KANAN],
    indent: { left: 720, hanging: 360 },
    children: wrappedRuns(t, W.agendaItem),
  });

/** DECISION NUMBER  numId=5 ilvl=0 ind.left=720 hanging=360 */
const mkDecisionNum = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.DECISIONS, level: 0 },
    tabStops: [TAB_KANAN],
    indent: { left: 720, hanging: 360 },
    children: wrappedRuns(t, W.decisionNum),
  });

/** DECISION LETTER  numId=5 ilvl=1 ind.left=1080 hanging=360 */
const mkDecisionLetter = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.DECISIONS, level: 1 },
    tabStops: [TAB_KANAN],
    indent: { left: 1080, hanging: 360 },
    children: wrappedRuns(t, W.decisionLetter),
  });

/** DECISION DASH  sejajar letter/level 1 */
const mkDecisionDash = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.DECISIONS, level: 2 },
    tabStops: [TAB_KANAN],
    indent: { left: 1080, hanging: 360 },
    children: wrappedRuns(t, W.decisionDash),
  });

/** DECISION DASH INNER */
const mkDecisionDashInner = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.DECISIONS, level: 2 },
    tabStops: [TAB_KANAN],
    indent: { left: 1440, hanging: 360 },
    children: wrappedRuns(t, W.decisionDash),
  });

/** SAKSI NUMBER  numId=9 ilvl=0 ind.left=425 hanging=425 */
const mkSaksiNum = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.SAKSI, level: 0 },
    tabStops: [TAB_KANAN],
    indent: { left: 425, hanging: 425 },
    children: wrappedRuns(t, W.saksiNum),
  });

/** SAKSI DASH  sejajar numbering 0 */
const mkSaksiDash = (t: FormatToken[]) =>
  new Paragraph({
    style: "ListParagraph",
    numbering: { reference: NUM.SAKSI, level: 2 },
    tabStops: [TAB_KANAN],
    indent: { left: 850, hanging: 425 },
    children: wrappedRuns(t, W.saksiDash),
  });

// ─── Main render function ─────────────────────────────────────────────────────

export const generateRUPSTAktaDocx = async (data: CompanyData, returnBlob?: boolean) => {
  const rawBlocks = generateRupstAktaBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);
  const docxChildren: Paragraph[] = [];

  const blockText = (block: Block): string => {
    if ("runs" in block) return block.runs.map((r) => r.text).join("");
    if (block.type === "divider") return block.text;
    return "";
  };

  // ── Zone tracker ──────────────────────────────────────────────────────────
  type Zone = "preamble" | "attendance" | "general" | "decisions" | "saksi";
  let zone: Zone = "preamble";

  // Within general zone, track which sub-type to render
  // Order of items as they appear in contentBlocks:
  //   1. Bahwa dari semua saham   → ind=1134
  //   2. Bahwa menurut            → ind=709 hanging=425
  //   3. Berdasarkan ketentuan    → ind=709
  //   4. Bahwa dalam acara Rapat  → ind=709
  //   5. agenda sub-items         → ind=1134 (Pernyataan, Persetujuan, etc.)
  type GeneralSubtype = "bahwaDari" | "menurut" | "ind709" | "agendaItem";
  let generalSubtype: GeneralSubtype = "bahwaDari";

  blocks.forEach((block) => {
    const text = blockText(block);

    // ── Zone transitions ────────────────────────────────────────────────────
    if (block.type === "list" && /^\d+\.$/.test((block as any).bullet ?? "")) {
      zone = "attendance";
    }

    if (text.startsWith("Bahwa dari semua saham")) {
      zone = "general";
      generalSubtype = "bahwaDari";
    }
    if (zone === "general") {
      if (text.startsWith("Bahwa menurut")) {
        generalSubtype = "menurut";
      } else if (
        text.startsWith("Berdasarkan ketentuan") ||
        text.startsWith("Bahwa dalam acara Rapat")
      ) {
        generalSubtype = "ind709";
      } else if (
        text.startsWith("Pernyataan Direksi") ||
        text.startsWith("Persetujuan Laporan") ||
        text.startsWith("Pengesahan Laporan") ||
        text.startsWith("Penetapan penggunaan") ||
        text.startsWith("Pemberian pelunasan")
      ) {
        generalSubtype = "agendaItem";
      }
    }

    if (text.startsWith("Sehubungan dengan apa yang diuraikan")) {
      zone = "decisions";
    }
    if (block.type === "p" && (block as any).number !== undefined && zone !== "decisions") {
      zone = "decisions";
    }
    if (block.type === "saksi") {
      zone = "saksi";
    }

    // ── Render ──────────────────────────────────────────────────────────────

    if (block.type === "p") {
      const b = block as Extract<Block, { type: "p" }>;
      if (b.number !== undefined) {
        docxChildren.push(mkDecisionNum(b.runs));
        return;
      }
      if (b.align === "center") {
        docxChildren.push(createP(b.runs, { alignment: AlignmentType.CENTER }));
        return;
      }
      if (b.indentLeft !== undefined) {
        docxChildren.push(createIndentP(b.runs, b.indentLeft));
        return;
      }
      if (b.indent) {
        docxChildren.push(createIndentP(b.runs, 284));
        return;
      }
      // Red "Direksi dan Komisaris..." plain paragraph in decisions zone
      if (zone === "decisions" && b.runs.some((r) => r.color === "FF0000")) {
        docxChildren.push(createIndentP(b.runs, 426));
        return;
      }
      docxChildren.push(createP(b.runs));
      return;
    }

    if (block.type === "list") {
      const b = block as Extract<Block, { type: "list" }>;
      const bullet = b.bullet ?? "";
      const isNumbered = /^\d+\.$/.test(bullet);
      const isLetter   = /^[a-z]\.$/i.test(bullet) && !isNumbered;

      if (zone === "preamble") {
        docxChildren.push(mkPreambleDash(b.runs, b.indentTabs));
        return;
      }

      if (zone === "attendance") {
        if (isNumbered) {
          // @ts-ignore
          docxChildren.push(mkAttendanceNum(b.runs, b.bullet));
        } else if (isLetter) {
          // @ts-ignore
          docxChildren.push(mkAttendanceLetter(b.runs, b.bullet));
        } else {
          docxChildren.push(mkAttendanceDash(b.runs, b.indentTabs));
        }
        return;
      }

      if (zone === "general") {
        switch (generalSubtype) {
          case "bahwaDari":
            docxChildren.push(mkGeneralBahwaDari(b.runs));
            break;
          case "menurut":
            docxChildren.push(mkGeneralMenurut(b.runs));
            break;
          case "ind709":
            docxChildren.push(mkGeneralInd709(b.runs));
            break;
          case "agendaItem":
            docxChildren.push(mkAgendaItem(b.runs));
            break;
        }
        return;
      }

      if (zone === "decisions") {
        if (text.startsWith("Sehubungan dengan apa yang diuraikan")) {
          docxChildren.push(mkDecisionSehubungan(b.runs));
        } else if (isLetter) {
          docxChildren.push(mkDecisionLetter(b.runs));
        } else {
          // indentTabs determines if it's an inner dash (indent 2) or outer dash (indent 1)
          if ((b.indentTabs || 0) >= 2) {
            docxChildren.push(mkDecisionDashInner(b.runs));
          } else {
            docxChildren.push(mkDecisionDash(b.runs));
          }
        }
        return;
      }

      if (zone === "saksi") {
        docxChildren.push(mkSaksiDash(b.runs));
        return;
      }
      return;
    }

    if (block.type === "saksi") {
      docxChildren.push(mkSaksiNum(block.runs));
      return;
    }

    if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
      return;
    }
  });

  // ── Notary signature block ─────────────────────────────────────────────────
  const domicile = data.notaryDomicile || "Kabupaten Bandung Barat";
  const rawNotaryName = data.notaryName || "NUKANTINI PUTRI PARINCHA, SH., M.Kn";
  const ttdNotaryName = rawNotaryName
    .toUpperCase()
    .replace(/SARJANA HUKUM/gi, "SH.")
    .replace(/S\.H\./g, "SH.")
    .replace(/MAGISTER KENOTARIATAN/gi, "M.Kn")
    .replace(/M\.KN\./g, "M.Kn")
    .replace(/M\.KN/g, "M.Kn")
    .trim();

  docxChildren.push(
    createNotarisLabelP(domicile),
    createNotarisEmptyP(),
    createNotarisEmptyP(),
    createNotarisEmptyP(),
    createNotarisEmptyP(),
    createNotarisNameP(ttdNotaryName),
  );

  // ── Document assembly ──────────────────────────────────────────────────────
  const doc = new Document({
    numbering: buildNumberingConfig(),
    styles: {
      default: {
        document: {
          run: { font: FONT_NAME, size: FONT_SIZE },
          paragraph: {
            spacing: { line: 480, before: 0, after: 0 },
            alignment: AlignmentType.LEFT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1418, bottom: 1418, left: 2268, right: 618 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: ["- ", PageNumber.CURRENT, " -"] }),
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
  const filename = `Draft Akta RUPST ${data.companyName || 'PT Baru'}.docx`;
  if (returnBlob) {
    return { blob, filename };
  }
  saveAs(blob, filename);
};