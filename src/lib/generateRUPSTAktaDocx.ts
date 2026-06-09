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

const buildNumberingConfig = (refs: string[]) => ({
  config: refs.map(ref => ({
    reference: ref,
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
      {
        level: 2,
        format: LevelFormat.BULLET,
        text: "-",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
      }
    ],
  })),
});

export const generateRUPSTAktaDocx = async (data: CompanyData) => {
  const blocks = generateRupstAktaBlocks(data);
  const docxChildren: Paragraph[] = [];
  let phase: RenderPhase = "preamble";

  // Dynamic numbering instances for restarts
  let listCounter = 1;
  let currentNumRef = `list-${listCounter}`;
  const usedRefs: string[] = [currentNumRef];

  const nextList = () => {
    listCounter++;
    currentNumRef = `list-${listCounter}`;
    usedRefs.push(currentNumRef);
  };

  const blockText = (block: Block): string => {
    if ("runs" in block) return block.runs.map((run) => run.text).join("");
    if (block.type === "divider") return block.text;
    return "";
  };

  blocks.forEach((block) => {
    const text = blockText(block);

    // Section Phase Detection & Restarts
    if (block.type === "list" && /^\d+\.$/.test(block.bullet)) {
      if (phase !== "attendance") {
        phase = "attendance";
        nextList();
      }
    }

    if (text.startsWith("Bahwa dari semua saham")) {
      phase = "general";
      nextList();
    }

    if (text.startsWith("Sehubungan dengan apa yang diuraikan")) {
      phase = "decisions";
      nextList();
    }

    if (block.type === "p" && block.number !== undefined) {
      if (phase !== "decisions") {
        phase = "decisions";
        nextList();
      }
    }

    if (text.startsWith("Rapat ditutup") || text.startsWith("Dari segala sesuatu") || block.type === "divider") {
      phase = "closing";
    }

    if (block.type === "p") {
      if (block.number) {
        docxChildren.push(new Paragraph({
          children: wrappedRuns(block.runs, W.decisionNumber),
          numbering: { reference: currentNumRef, level: 0 },
          tabStops: [TAB_KANAN],
          alignment: AlignmentType.LEFT,
          indent: { left: 720, hanging: 360 },
        }));
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
      let level = 1; // Default dash
      const bullet = block.bullet || "";
      if (/^\d+\.$/.test(bullet)) level = 0;
      else if (/^[a-z]\.$/i.test(bullet)) level = 1;
      else if (bullet === "-") level = 2;

      docxChildren.push(new Paragraph({
        children: wrappedRuns(block.runs, W.attendeeNumber),
        numbering: { reference: currentNumRef, level },
        tabStops: [TAB_KANAN],
        alignment: AlignmentType.LEFT,
        // Numbering level styling in buildNumberingConfig handles indents
      }));
      return;
    }

    if (block.type === "saksi") {
      docxChildren.push(new Paragraph({
        children: wrappedRuns(block.runs, W.saksi),
        numbering: { reference: currentNumRef, level: 0 },
        tabStops: [TAB_KANAN],
        alignment: AlignmentType.LEFT,
        indent: { left: 720, hanging: 360 },
      }));
      return;
    }

    if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
    }
  });

  const domicile = data.notaryDomicile || "Kabupaten Bandung Barat";
  const rawNotaryName = (data.notaryName || "NUKANTINI PUTRI PARINCHA, S.H., M.Kn.");
  const expandedNotaryName = rawNotaryName.replace(/\bS\.H\b\.?/gi, "Sarjana Hukum").replace(/\bM\.Kn\b\.?/gi, "Magister Kenotariatan");
  const notaryDisplay = expandedNotaryName.toUpperCase();

  docxChildren.push(createNotarisLabelP(domicile));
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisEmptyP());
  docxChildren.push(createNotarisNameP(notaryDisplay));

  const doc = new Document({
    numbering: buildNumberingConfig(usedRefs),
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
