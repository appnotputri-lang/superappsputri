import { Paragraph, TextRun, AlignmentType, IParagraphOptions, TabStopType, LeaderType } from "docx";
import { FormatToken, parseTextRuns } from "../notaryWrapper";

export class ParagraphFactory {
  constructor(
    public W: any,
    public TAB_KANAN: any,
    public TAB_KANAN_NO_LEADER: any,
    public NOTARIS_TAB_STOPS: any[]
  ) {}

  get shouldAppendTrailingTab(): boolean {
    return this.TAB_KANAN && this.TAB_KANAN.leader && this.TAB_KANAN.leader !== LeaderType.NONE;
  }

createP = (
  tokens: FormatToken[],
  isRightCenter = false,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const isCentered = options.alignment === AlignmentType.CENTER;
  const lines = parseTextRuns(tokens, isRightCenter ? this.W.rcenter : this.W.normal);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    if (!isCentered && !isRightCenter && this.shouldAppendTrailingTab) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  let finalOptions: any = { ...options };
  if (isRightCenter) {
    finalOptions.indent = { left: 4252 };
    finalOptions.alignment = AlignmentType.CENTER;
  }

  return new Paragraph({
    children,
    tabStops: isCentered ? [] : [this.TAB_KANAN],
    alignment: AlignmentType.LEFT,
    ...finalOptions,
  });
};

/**
 * Paragraf khusus deskripsi KBLI — sejajar level 1 (left=568).
 */
createKbliDescP = (tokens: FormatToken[]): Paragraph => {
  const lines = parseTextRuns(tokens, this.W.list2);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    if (this.shouldAppendTrailingTab) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [this.TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 568 },
  });
};

/** Paragraf dengan indent kiri manual (tanpa numbering) */
createIndentP = (
  tokens: FormatToken[],
  leftDxa: number,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, this.W.normal - (leftDxa / 850) * 2.2);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    if (this.shouldAppendTrailingTab) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [this.TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftDxa },
    ...options,
  });
};

/**
 * Bullet dash list (-).
 */
createListP = (
  bulletText: string,
  tokens: FormatToken[],
  indentTabs: number = 0,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  let level = 0;
  if (indentTabs <= 0.6) level = 0;
  else if (indentTabs <= 1.1) level = 1;
  else if (indentTabs <= 1.6) level = 2;
  else if (indentTabs <= 2.1) level = 3;
  else if (indentTabs <= 2.6) level = 4;
  else level = 5;

  let width = this.W.list1;
  if (level === 1) width = this.W.list2;
  else if (level === 2) width = this.W.list3;
  else if (level >= 3) width = this.W.list4;

  const useNumbering = !!(options as any).numbering;
  if (useNumbering) {
    width = indentTabs >= 0.8 ? 38.5 : 41.0;
  }

  const lines = parseTextRuns(tokens, width);
  const children: any[] = [];
  if (!useNumbering) {
    children.push(new TextRun({ text: bulletText + "\t" }));
  }

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => {
      children.push(new TextRun({
        text: t.text,
        bold: t.bold,
        italics: t.italic,
        underline: t.underline ? {} : undefined,
        color: t.color,
        highlight: t.highlight as any,
      }));
    });
    if (this.shouldAppendTrailingTab) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) {
      children.push(new TextRun({ break: 1 }));
    }
  });

  if (useNumbering) {
    return new Paragraph({
      children,
      tabStops: [this.TAB_KANAN],
      alignment: AlignmentType.LEFT,
      ...options,
    });
  }

  let leftIndent = 284;
  let hangingIndent = 284;
  if (level === 0) {
    leftIndent = 426;
    hangingIndent = 426;
  } else if (level === 1) {
    leftIndent = 568;
    hangingIndent = 284;
  } else if (level === 2) {
    leftIndent = 852;
    hangingIndent = 284;
  } else if (level === 3) {
    leftIndent = 1136;
    hangingIndent = 284;
  } else if (level === 4) {
    leftIndent = 1420;
    hangingIndent = 284;
  } else {
    leftIndent = 1704;
    hangingIndent = 284;
  }

  return new Paragraph({
    style: "Normal",
    children,
    // numbering: { reference: numRef, level: level },
    tabStops: [{ type: TabStopType.LEFT, position: leftIndent }, this.TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftIndent, hanging: hangingIndent },
    ...options,
  });
};

/**
 * Numbered decimal — untuk keputusan (1. 2. 3. …)
 * Sesuai XML contoh_6.docx: left=284, hanging=284, tab kiri di 720
 */
createNumberedP = (
  num: number | string,
  tokens: FormatToken[],
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const lines = parseTextRuns(tokens, this.W.numbered);
  const children: any[] = [];
  children.push(new TextRun({ text: num + "\t" }));

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => {
      children.push(new TextRun({
        text: t.text,
        bold: t.bold,
        italics: t.italic,
        underline: t.underline ? {} : undefined,
        color: t.color,
        highlight: t.highlight as any,
      }));
    });
    if (this.shouldAppendTrailingTab) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) {
      children.push(new TextRun({ break: 1 }));
    }
  });

  // const isAlpha = typeof num === 'string' && /[a-zA-Z]/.test(num);
  return new Paragraph({
    style: "Normal",
    children,
    // numbering: { reference: isAlpha ? "rups-letter" : "rups-decimal", level: 0 },
    tabStops: [{ type: TabStopType.LEFT, position: 284 }, this.TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 284, hanging: 284 },
    ...options,
  });
};

/**
 * Sub-numbered 1) 2) — untuk sub-pasal
 */
createSubNumberedP = (
  num: number | string,
  tokens: FormatToken[],
  indentTabs: number = 0,
  options: Omit<IParagraphOptions, "children"> = {}
): Paragraph => {
  const level = Math.max(0, Math.min(Math.round(indentTabs), 2));
  const lines = parseTextRuns(tokens, this.W.subnr);
  const children: any[] = [];
  children.push(new TextRun({ text: num + "\t" }));

  lines.forEach((lineTokens, i) => {
    lineTokens.forEach((t) => {
      children.push(new TextRun({
        text: t.text,
        bold: t.bold,
        italics: t.italic,
        underline: t.underline ? {} : undefined,
        color: t.color,
        highlight: t.highlight as any,
      }));
    });
    if (this.shouldAppendTrailingTab) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) {
      children.push(new TextRun({ break: 1 }));
    }
  });

  let leftIndent = 568;
  if (level === 0) {
    leftIndent = 568;
  } else if (level === 1) {
    leftIndent = 993;
  } else {
    leftIndent = 1418;
  }

  return new Paragraph({
    style: "Normal",
    children,
    // numbering: { reference: "rups-sub-decimal", level: level },
    tabStops: [{ type: TabStopType.LEFT, position: leftIndent }, this.TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: leftIndent, hanging: 284 },
    ...options,
  });
};

/**
 * "Pasal X" divider — tab center di 4252, tab kanan
 */
createPasalDividerP = (text: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text, bold: true }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.CENTER, position: 4252, leader: LeaderType.HYPHEN },
      this.TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
  });

/**
 * "DEMIKIANLAH AKTA INI" divider — tab center di 4252
 */
createDividerP = (text: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text, bold: true }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.CENTER, position: 4252, leader: LeaderType.HYPHEN },
      this.TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
  });

/**
 * Management summary list — sesuai XML contoh_6.docx:
 * tab kiri di 1134 dan 2268, tab kanan di 8504
 * indent left=2800, hanging=2516
 * Format: POSITION[TAB]: NAME;
 */
createManagementRoleListP = (
  position: string,
  nameText: string
): Paragraph => {
  // Sesuai XML contoh_6.docx:
  // Format: [Jabatan][TAB]: [Nama];[TAB kanan]
  // Tab kiri diperlebar (misal 3402 atau 3969) agar jabatan panjang tidak menabrak `\t` pertama.
  return new Paragraph({
    children: [
      new TextRun({ text: position }),
      new TextRun({ text: "\t" }),
      new TextRun({ text: `: ${nameText};` }),
      new TextRun({ text: "\t" }),
    ],
    tabStops: [
      { type: TabStopType.LEFT, position: 3969 }, // 3969 = 2.75 inches
      this.TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 284 },
  });
};

/**
 * Shareholder list — sesuai XML contoh_6.docx:
 * DIPISAH 2 paragraf:
 * Paragraf 1: -[TAB]NAMA[TAB]: xxx lembar saham atau senilai
 *   tabs: 850, 2800, kanan 8504; indent left=2800, hanging=2375
 * Paragraf 2: [TAB][TAB]Rp. xxx,-  (continuation)
 *   tabs: 850, 2800/2977, kanan 8504; indent left=2835, hanging=2375
 *
 * Fungsi ini mengembalikan ARRAY 2 paragraf.
 */
createShareholderListParagraphs = (
  bullet: string,
  name: string,
  sharesText: string,
  rpText: string
): Paragraph[] => {
  if (name.includes(", lahir") || name.length > 80) {
    const cleanShares = sharesText.replace(/^:\s*/, "").replace(/^\s*sebanyak\s*/, "").trim();
    const fullCombinedText = `, sebanyak ${cleanShares} ${rpText}`;
    
    const firstCommaIdx = name.indexOf(",");
    let boldPart = name;
    let normalPart = "";
    if (firstCommaIdx !== -1) {
      boldPart = name.substring(0, firstCommaIdx);
      normalPart = name.substring(firstCommaIdx);
    }

    const tokens: FormatToken[] = [
      { text: boldPart, bold: true },
      { text: normalPart },
      { text: fullCombinedText }
    ];

    const lines = parseTextRuns(tokens, this.W.list1);
    const children: any[] = [];
    lines.forEach((lineTokens, i) => {
      if (i === 0) {
        children.push(new TextRun({ text: `${bullet}\t` }));
      }
      lineTokens.forEach((t) => {
        children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any }));
      });
      if (this.shouldAppendTrailingTab) children.push(new TextRun({ text: "\t" }));
      if (i < lines.length - 1) {
        children.push(new TextRun({ break: 1 }));
      }
    });

    return [
      new Paragraph({
        children,
        tabStops: [
          { type: TabStopType.LEFT, position: 284 },
          this.TAB_KANAN,
        ],
        alignment: AlignmentType.LEFT,
        indent: { left: 284, hanging: 284 },
      })
    ];
  }

  const p1Children: any[] = [
    new TextRun({ text: `${bullet}\t` }),
    new TextRun({ text: name }),
    new TextRun({ text: "\t" }),
    new TextRun({ text: `${sharesText}` }),
  ];
  if (this.shouldAppendTrailingTab) {
    p1Children.push(new TextRun({ text: "\t" }));
  }

  const p1 = new Paragraph({
    children: p1Children,
    tabStops: [
      { type: TabStopType.LEFT, position: 850 },
      { type: TabStopType.LEFT, position: 4200 },
      this.TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 4200, hanging: 3775 },
  });

  const p2Children: any[] = [
    new TextRun({ text: "\t" }),
    new TextRun({ text: "\t" }),
    new TextRun({ text: rpText }),
  ];
  if (this.shouldAppendTrailingTab) {
    p2Children.push(new TextRun({ text: "\t" }));
  }

  const p2 = new Paragraph({
    children: p2Children,
    tabStops: [
      { type: TabStopType.LEFT, position: 850 },
      { type: TabStopType.LEFT, position: 4377 },
      this.TAB_KANAN,
    ],
    alignment: AlignmentType.LEFT,
    indent: { left: 4235, hanging: 3775 },
  });

  return [p1, p2];
};

/**
 * Numbered saksi (1. 2.) — left=720, hanging=360, tab kiri di 720
 */
createSaksiP = (
  num: number,
  tokens: FormatToken[]
): Paragraph => {
  // Sesuai XML contoh_7.docx: left=426, hanging=360, hanya tab kanan di 8504
  // Format: 1.[TAB]NENDI SUHENDI, lahir di...
  // Teks wrap mulai di left=426 (sejajar dengan nama setelah nomor)
  const lines = parseTextRuns(tokens, 39.5);
  const children: any[] = [];

  lines.forEach((lineTokens, i) => {
    if (i === 0) children.push(new TextRun({ text: `${num}.\t` }));
    lineTokens.forEach((t) => children.push(new TextRun({ text: t.text, bold: t.bold, highlight: t.highlight as any })));
    if (this.shouldAppendTrailingTab) children.push(new TextRun({ text: "\t" }));
    if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
  });

  return new Paragraph({
    children,
    tabStops: [this.TAB_KANAN],
    alignment: AlignmentType.LEFT,
    indent: { left: 426, hanging: 360 },
  });
};

// ──────────────────────────────────────────────────────────────────────────────
// FOOTER NOTARIS HELPERS
// ──────────────────────────────────────────────────────────────────────────────



createNotarisEmptyP = (): Paragraph =>
  new Paragraph({
    children: [],
    tabStops: this.NOTARIS_TAB_STOPS,
  });

createNotarisLabelP = (domicile: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: `Notaris di ${domicile};` }),
    ],
    tabStops: this.NOTARIS_TAB_STOPS,
  });

createNotarisSignP = (): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
    ],
    tabStops: this.NOTARIS_TAB_STOPS,
  });

createNotarisNameP = (name: string): Paragraph =>
  new Paragraph({
    children: [
      new TextRun({ text: "\t" }),
      new TextRun({ text: name, bold: true }),
    ],
    tabStops: this.NOTARIS_TAB_STOPS,
  });


}
