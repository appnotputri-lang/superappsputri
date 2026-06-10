import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  LeaderType,
  IParagraphOptions,
  Footer,
  PageNumber,
} from "docx";
import { saveAs } from "file-saver";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generatePendirianBlocks } from "./pendirianContentBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";

const TAB_KANAN = { type: TabStopType.RIGHT, position: 8504, leader: LeaderType.HYPHEN };
const TAB_KANAN_NO_LEADER = { type: TabStopType.RIGHT, position: 8504, leader: LeaderType.NONE };

const W = {
  normal: 41.5,
  list1: 39.0,
  list2: 36.5,
  list3: 34.0,
  numbered: 38.0,
  subnr: 37.2,
  rcenter: 20.5,
};

type POpts = Partial<IParagraphOptions>;

const toRuns = (tokens: FormatToken[]) =>
  tokens.map((t) => new TextRun({ text: t.text, bold: !!t.bold }));

const createP = (
  tokens: FormatToken[],
  isRightCenter = false,
  options: POpts = {}
): Paragraph => {
  const isCentered = options.alignment === AlignmentType.CENTER;
  const lines = parseTextRuns(tokens, isRightCenter ? W.rcenter : W.normal);
  const children: TextRun[] = [];

  lines.forEach((lineTokens, i) => {
    children.push(...toRuns(lineTokens));
    if (!isCentered && !isRightCenter) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  const finalOptions: POpts = {
    ...options,
    ...(isRightCenter ? { indent: { left: 4252 }, alignment: AlignmentType.CENTER } : {}),
  };

  return new Paragraph({
    children,
    tabStops: isCentered ? [] : [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    ...finalOptions,
  });
};

const createIndentP = (
  tokens: FormatToken[],
  leftDxa: number,
  options: POpts = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W.normal - (leftDxa / 850) * 2.2);
  const children: TextRun[] = [];

  lines.forEach((lineTokens, i) => {
    children.push(...toRuns(lineTokens));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa },
    ...options,
  });
};

const createKbliDescP = (tokens: FormatToken[]): Paragraph => {
  const lines = parseTextRuns(tokens, 34.5);
  const children: TextRun[] = [];

  lines.forEach((lineTokens, i) => {
    children.push(...toRuns(lineTokens));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 1417 },
  });
};

const createListP = (
  bulletText: string,
  tokens: FormatToken[],
  indentTabs = 0,
  options: POpts = {}
): Paragraph => {
  let leftDxa: number;
  let hangingDxa: number;
  let maxW: number;

  if (indentTabs <= 0.6) {
    leftDxa = 284;
    hangingDxa = 284;
    maxW = W.list1;
  } else if (indentTabs <= 1.0) {
    leftDxa = 567;
    hangingDxa = 283;
    maxW = W.list2;
  } else if (indentTabs > 1.0 && indentTabs < 1.4) {
    leftDxa = 1134;
    hangingDxa = 360;
    maxW = W.list3;
  } else if (indentTabs <= 1.9) {
    leftDxa = 567;
    hangingDxa = 283;
    maxW = W.list2;
  } else if (indentTabs === 2) {
    leftDxa = 1417;
    hangingDxa = 283;
    maxW = W.list3;
  } else {
    leftDxa = 851;
    hangingDxa = 284;
    maxW = W.list3;
  }

  const lines = parseTextRuns(tokens, maxW);
  const children: TextRun[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${bulletText}\t` }));
    children.push(...toRuns(lineTokens));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: leftDxa }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa, hanging: hangingDxa },
    ...options,
  });
};

const createNumberedP = (
  num: number | string,
  tokens: FormatToken[],
  options: POpts = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, W.numbered);
  const children: TextRun[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    children.push(...toRuns(lineTokens));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: 720 }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 284, hanging: 284 },
    ...options,
  });
};

const createSubNumberedP = (
  num: number | string,
  tokens: FormatToken[],
  _indentTabs = 0
): Paragraph => {
  const leftDxa = 850;
  const hangingDxa = 425;
  const lines = parseTextRuns(tokens, W.subnr);
  const children: TextRun[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num})\t` }));
    children.push(...toRuns(lineTokens));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.LEFT, position: leftDxa }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa, hanging: hangingDxa },
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
      { type: TabStopType.RIGHT, position: 8504, leader: LeaderType.HYPHEN },
    ],
    alignment: AlignmentType.LEFT,
  });

const createPasalDividerP = (text: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text, bold: true }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.CENTER, position: 3969, leader: LeaderType.HYPHEN },
      { type: TabStopType.RIGHT, position: 8504, leader: LeaderType.HYPHEN },
    ],
    indent: { left: 284 },
    alignment: AlignmentType.LEFT,
  });

const createManagementRoleListP = (
  position: string,
  nameText: string
): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: position }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: `: ${nameText};` }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [{ type: TabStopType.LEFT, position: 2268 }, TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 284 },
  });

const createShareholderListParagraphs = (
  bullet: string,
  name: string,
  sharesText: string,
  rpText: string
): Paragraph[] => {
  const p1 = new Paragraph({
    children: [
      new TextRun({ text: `${bullet}\t` }),
      new TextRun({ text: name }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: sharesText }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.LEFT, position: 850 },
      { type: TabStopType.LEFT, position: 2800 },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 2800, hanging: 2375 },
  });

  const p2 = new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: rpText }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.LEFT, position: 850 },
      { type: TabStopType.LEFT, position: 2977 },
      TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 2835, hanging: 2375 },
  });

  return [p1, p2];
};

const createSaksiP = (num: number, tokens: FormatToken[]): Paragraph => {
  const lines = parseTextRuns(tokens, 39.5);
  const children: TextRun[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    children.push(...toRuns(lineTokens));
    children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 426, hanging: 360 },
  });
};

const NOTARIS_TAB_STOPS = [
  { type: TabStopType.LEFT, position: 4395 },
  TAB_KANAN_NO_LEADER,
];

const createNotarisEmptyP = (): Paragraph =>
  new Paragraph({
    children: [],
    tabStops: NOTARIS_TAB_STOPS,
  });

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

export const generatePendirianDocx = async (data: any) => {
  const rawBlocks = generatePendirianBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);
  const docxChildren: Paragraph[] = [];

  blocks.forEach((block: any) => {
    if (block.type === "p") {
      const isCentered = block.align === "center";
      const isRightCenter = block.align === "right-center";
      const alignOpt = isCentered ? AlignmentType.CENTER : AlignmentType.LEFT;
      const opts: POpts = { alignment: alignOpt };

      if (block.kbliDesc) {
        docxChildren.push(createKbliDescP(block.runs));
      } else if (block.indentTabs && !isCentered && !isRightCenter) {
        const leftDxa = Math.round((block.indentTabs || 0) * 850);
        docxChildren.push(createIndentP(block.runs, leftDxa, opts));
      } else {
        docxChildren.push(createP(block.runs, isRightCenter, opts));
      }
      return;
    }

    if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
      return;
    }

    if (block.type === "pasal-divider") {
      docxChildren.push(createPasalDividerP(block.text));
      return;
    }

    if (block.type === "list") {
      docxChildren.push(createListP(block.bullet || "-", block.runs, block.indentTabs || 0));
      return;
    }

    if (block.type === "numbered") {
      docxChildren.push(createNumberedP(block.num, block.runs));
      return;
    }

    if (block.type === "sub-numbered") {
      docxChildren.push(createSubNumberedP(block.num, block.runs, block.indentTabs || 0));
      return;
    }

    if (block.type === "management-role") {
      docxChildren.push(createManagementRoleListP(block.position, block.nameText));
      return;
    }

    if (block.type === "shareholder") {
      docxChildren.push(
        ...createShareholderListParagraphs(
          block.bullet || "-",
          block.name,
          block.sharesText,
          block.rpText
        )
      );
      return;
    }

    if (block.type === "saksi") {
      docxChildren.push(createSaksiP(block.num, block.runs));
      return;
    }

    if (block.type === "br") {
      docxChildren.push(new Paragraph({ children: [new TextRun("")] }));
    }
  });

  const hasNotarisBottom = blocks.some(
    (b: any) => b.type === "p" && b.align === "right-center"
  );

  if (!hasNotarisBottom) {
    docxChildren.push(createNotarisLabelP("Kabupaten Bandung Barat"));
    docxChildren.push(createNotarisEmptyP());
    docxChildren.push(createNotarisEmptyP());
    docxChildren.push(createNotarisNameP("NUKANTINI PUTRI PARINCHA, SH., M.KN."));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Century Gothic",
            size: 20,
          },
          paragraph: {
            spacing: { line: 480, before: 0, after: 0 },
            indent: { left: 0, right: 0, firstLine: 0 },
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
                children: [new TextRun({ children: ["- ", PageNumber.CURRENT, " -"] })],
              }),
            ],
          }),
        },
        children: docxChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = data?.namaPt
    ? String(data.namaPt).replace(/PT\\.?\\s*/i, "").trim()
    : "Draft";

  saveAs(blob, `Akta_Pendirian_${safeName}.docx`);
};