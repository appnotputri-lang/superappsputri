```typescript
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

const TAB_KANAN = {
  type: TabStopType.RIGHT,
  position: 8504,
  leader: LeaderType.HYPHEN,
};

const NOTARIS_TAB_STOPS = [
  { type: TabStopType.LEFT, position: 4395 },
  TAB_KANAN,
];

const FONT_NAME = "Century Gothic";
const FONT_SIZE = 20;

const W = {
  normal: 41.5,
  indent284: 40.8,
  indent426: 40.2,
  introDash: 39.8,
  amendmentDash: 38.8,
  bodyDash: 38.6,
  agendaDash: 36.5,
  attendeeNumber: 36.2,
  attendeeDash: 34.8,
  attendeeLetter: 33.0,
  decisionNumber: 38.0,
  decisionLetter: 37.2,
  saksi: 39.5,
};

const NUMBERING = {
  introDash: "akta-intro-dash",
  amendmentDash: "akta-amendment-dash",
  bodyDash: "akta-body-dash",
  agendaDash: "akta-agenda-dash",
  attendeeNumber: "akta-attendee-number",
  attendeeDash: "akta-attendee-dash",
  attendeeLetter: "akta-attendee-letter",
  decisionNumber: "akta-decision-number",
  decisionLetter: "akta-decision-letter",
  attachmentDash: "akta-attachment-dash",
  saksiNumber: "akta-saksi-number",
};

type RenderPhase = "preamble" | "attendance" | "general" | "decisions" | "closing";

const makeRun = (t: FormatToken): TextRun =>
  new TextRun({
    text: t.text,
    bold: t.bold,
    color: t.color,
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
  const maxWidth = leftDxa >= 993 ? 36.5 : leftDxa >= 426 ? W.indent426 : W.indent284;

  return new Paragraph({
    children: wrappedRuns(tokens, maxWidth),
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa },
    ...options,
  });
};

const createNumberedP = (
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {},
): Paragraph =>
  new Paragraph({
    children: wrappedRuns(tokens, W.decisionNumber),
    numbering: { reference: NUMBERING.decisionNumber, level: 0 },
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 284, hanging: 284 },
    ...options,
  });

const createListP = (
  block: Extract<Block, { type: "list" }>,
  phase: RenderPhase,
  options: Omit<IParagraphOptions, "children"> = {},
): Paragraph => {
  const indentTabs = block.indentTabs || 0;
  const bullet = block.bullet || "";

  if (!bullet) {
    return createIndentP(block.runs, 284, options);
  }

  if (/^\d+\.$/.test(bullet)) {
    return new Paragraph({
      children: wrappedRuns(block.runs, W.attendeeNumber),
      numbering: { reference: NUMBERING.attendeeNumber, level: 0 },
      tabStops: [{ type: TabStopType.LEFT, position: 850 }, TAB_KANAN],
      alignment: AlignmentType.LEFT,
      indent: { left: 851 },
      ...options,
    });
  }

  if (/^[a-z]\.$/i.test(bullet)) {
    if (indentTabs >= 1.5) {
      return new Paragraph({
        children: wrappedRuns(block.runs, W.attendeeLetter),
        numbering: { reference: NUMBERING.attendeeLetter, level: 0 },
        tabStops: [TAB_KANAN],
        alignment: AlignmentType.LEFT,
        indent: { left: 1560, hanging: 284 },
        ...options,
      });
    }

    return new Paragraph({
      children: wrappedRuns(block.runs, W.decisionLetter),
      numbering: { reference: NUMBERING.decisionLetter, level: 0 },
      tabStops: [TAB_KANAN],
      alignment: AlignmentType.LEFT,
      indent: { left: 709 },
      ...options,
    });
  }

  if (bullet === "-" && phase === "preamble" && indentTabs >= 1.0) {
    return new Paragraph({
      children: wrappedRuns(block.runs, W.amendmentDash),
      numbering: { reference: NUMBERING.amendmentDash, level: 0 },
      tabStops: [TAB_KANAN],
      alignment: AlignmentType.LEFT,
      indent: { hanging: 294 },
      ...options,
    });
  }

  if (bullet === "-" && phase === "attendance" && indentTabs >= 1.0) {
    return new Paragraph({
      children: wrappedRuns(block.runs, W.attendeeDash),
      numbering: { reference: NUMBERING.attendeeDash, level: 0 },
      tabStops: [TAB_KANAN],
      alignment: AlignmentType.LEFT,
      indent: { left: 1276 },
      ...options,
    });
  }

  if (bullet === "-" && phase === "decisions" && indentTabs >= 1.0) {
    return new Paragraph({
      children: wrappedRuns(block.runs, W.bodyDash),
      numbering: { reference: NUMBERING.attachmentDash, level: 0 },
      tabStops: [TAB_KANAN],
      alignment: AlignmentType.LEFT,
      ...options,
    });
  }

  if (bullet === "-" && phase === "closing" && indentTabs >= 1.0) {
    return new Paragraph({
      children: wrappedRuns(block.runs, W.bodyDash),
      numbering: { reference: NUMBERING.attachmentDash, level: 0 },
      tabStops: [TAB_KANAN],
      alignment: AlignmentType.LEFT,
      ...options,
    });
  }

  if (bullet === "-" && indentTabs >= 0.85) {
    return new Paragraph({
      children: wrappedRuns(block.runs, W.agendaDash),
      numbering: { reference: NUMBERING.agendaDash, level: 0 },
      tabStops: [TAB_KANAN],
      alignment: AlignmentType.LEFT,
      indent: { left: 1134, hanging: 425 },
      ...options,
    });
  }

  if (bullet === "-" && indentTabs >= 0.5) {
    return new Paragraph({
      children: wrappedRuns(block.runs, W.bodyDash),
      numbering: { reference: NUMBERING.bodyDash, level: 0 },
      tabStops: [TAB_KANAN],
      alignment: AlignmentType.LEFT,
      indent: { left: 709 },
      ...options,
    });
  }

  return new Paragraph({
    children: wrappedRuns(block.runs, W.introDash),
    numbering: { reference: NUMBERING.introDash, level: 0 },
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 426 },
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

const createSaksiP = (
  _num: number,
  tokens: FormatToken[],
): Paragraph =>
  new Paragraph({
    children: wrappedRuns(tokens, W.saksi),
    numbering: { reference: NUMBERING.saksiNumber, level: 0 },
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 284, hanging: 284 },
  });

const createNotarisEmptyP = (): Paragraph =>
  new Paragraph({
    children: [],
    tabStops: NOTARIS_TAB_STOPS,
  });

const createNotarisLabelP = (domicile: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: `Notaris di ${domicile};` }),
    ],
    tabStops: NOTARIS_TAB_STOPS,
  });

const createNotarisNameP = (name: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: name, bold: true }),
    ],
    tabStops: NOTARIS_TAB_STOPS,
  });

const buildNumberingConfig = () => ({
  config: [
    {
      reference: NUMBERING.introDash,
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "-",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.amendmentDash,
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "-",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.bodyDash,
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "-",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1636, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.agendaDash,
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "-",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1636, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.attendeeNumber,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.attendeeDash,
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "-",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1636, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.attendeeLetter,
      levels: [
        {
          level: 0,
          format: LevelFormat.LOWER_LETTER,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1570, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.decisionNumber,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.decisionLetter,
      levels: [
        {
          level: 0,
          format: LevelFormat.LOWER_LETTER,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1004, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.attachmentDash,
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "-",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: NUMBERING.saksiNumber,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
  ],
});

export const generateRUPSTAktaDocx = async (data: CompanyData) => {
  const blocks = generateRupstAktaBlocks(data);
  const docxChildren: Paragraph[] = [];
  let phase: RenderPhase = "preamble";

  const blockText = (block: Block): string => {
    if ("runs" in block) return block.runs.map((run) => run.text).join("");
    if (block.type === "divider") return block.text;
    return "";
  };

  blocks.forEach((block) => {
    const text = blockText(block);

    if (block.type === "list" && /^\d+\.$/.test(block.bullet)) {
      phase = "attendance";
    }

    if (text.startsWith("Bahwa dari semua saham")) {
      phase = "general";
    }

    if (text.startsWith("Sehubungan dengan apa yang diuraikan")) {
      phase = "decisions";
    }

    if (text.startsWith("Rapat ditutup") || text.startsWith("Dari segala sesuatu") || block.type === "divider") {
      phase = "closing";
    }

    if (block.type === "p") {
      if (block.number) {
        phase = "decisions";
        docxChildren.push(createNumberedP(block.runs));
      } else if (block.align === "center") {
        docxChildren.push(createP(block.runs, { alignment: AlignmentType.CENTER }));
      } else if (block.indentLeft !== undefined) {
        docxChildren.push(createIndentP(block.runs, block.indentLeft));
      } else if (block.indent) {
        docxChildren.push(createIndentP(block.runs, 284));
      } else {
        docxChildren.push(createP(block.runs));
      }
      return;
    }

    if (block.type === "list") {
      docxChildren.push(createListP(block, phase));
      return;
    }

    if (block.type === "saksi") {
      docxChildren.push(createSaksiP(block.number, block.runs));
      return;
    }

    if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
    }
  });

  const domicile = data.notaryDomicile || "Kabupaten Bandung Barat";
  const notaryDisplay = (data.notaryName || "NUKANTINI PUTRI PARINCHA, S.H., M.Kn.")
    .toUpperCase()
    .replace(/SARJANA HUKUM/gi, "S.H.")
    .replace(/MAGISTER KENOTARIATAN/gi, "M.Kn.");

  docxChildren.push(createNotarisLabelP(domicile));
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisNameP(notaryDisplay));

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
            margin: { top: 1417, bottom: 1417, left: 2268, right: 1134 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: ["- ", PageNumber.CURRENT, " -"],
                  }),
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
  saveAs(blob, `Draft Akta RUPST ${data.companyName}.docx`);
};
```