import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  LeaderType,
  IParagraphOptions,
} from "docx";
import { saveAs } from "file-saver";
import { FormData } from "../constants";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generateBlocks } from "./contentBlocks";

export const generateDocxBlob = async (data: FormData): Promise<Blob> => {
  const defaultTab = {
    type: TabStopType.RIGHT,
    position: 8504, // 15 cm width
    leader: LeaderType.HYPHEN,
  };

  const createP = (
    tokens: FormatToken[],
    indentTabs: number = 0,
    isRightCenter: boolean = false,
    options: Omit<IParagraphOptions, "children"> = {},
  ) => {
    let indentReduction = 0;
    const isIndented =
      options.indent && (options.indent.left || options.indent.firstLine);
    if (isIndented) indentReduction += 2.2;
    if (indentTabs) indentReduction += indentTabs * 4.4;
    if (isRightCenter) indentReduction += 21;

    const lines = parseTextRuns(tokens, 41.5 - indentReduction);
    const children: any[] = [];
    const isCentered = options.alignment === AlignmentType.CENTER;

    lines.forEach((lineTokens, i) => {
      lineTokens.forEach((t) =>
        children.push(new TextRun({ text: t.text, bold: t.bold })),
      );

      if (!isCentered) {
        children.push(new TextRun({ text: "\t" }));
      }

      if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
    });

    let finalOptions: any = { ...options };
    if (indentTabs) {
      finalOptions.indent = { left: indentTabs * 850, hanging: 0 };
    }
    if (isRightCenter) {
      finalOptions.indent = { left: 4252 };
      finalOptions.alignment = AlignmentType.CENTER;
    }

    return new Paragraph({
      children,
      tabStops: isCentered ? [] : [defaultTab],
      alignment: AlignmentType.LEFT,
      ...finalOptions,
    });
  };

  const createListP = (
    bulletText: string,
    tokens: FormatToken[],
    indentTabs: number = 0,
    options: Omit<IParagraphOptions, "children"> = {},
  ) => {
    let indentReduction = 2.2;
    if (indentTabs) indentReduction += indentTabs * 4.4;

    const lines = parseTextRuns(tokens, 41.5 - indentReduction);
    const children: any[] = [];
    lines.forEach((lineTokens, i) => {
      if (i === 0) {
        children.push(new TextRun({ text: `${bulletText}\t` }));
      }
      lineTokens.forEach((t) =>
        children.push(new TextRun({ text: t.text, bold: t.bold })),
      );
      children.push(new TextRun({ text: "\t" }));
      if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
    });
    const leftBase = indentTabs * 425;
    const textStart = leftBase + 425;

    return new Paragraph({
      children,
      tabStops: [{ type: TabStopType.LEFT, position: textStart }, defaultTab],
      alignment: AlignmentType.LEFT,
      indent: { left: textStart, hanging: 425 },
      ...options,
    });
  };

  const createDividerP = (text: string) => {
    return new Paragraph({
      children: [
        new TextRun({ text: "\t" }),
        new TextRun({ text: text, bold: true }),
        new TextRun({ text: "\t" }),
      ],
      tabStops: [
        { type: TabStopType.CENTER, position: 4252, leader: LeaderType.HYPHEN },
        { type: TabStopType.RIGHT, position: 8504, leader: LeaderType.HYPHEN },
      ],
      alignment: AlignmentType.LEFT,
    });
  };

  const createNumberedP = (
    num: number,
    tokens: FormatToken[],
    indentTabs: number = 0,
    options: Omit<IParagraphOptions, "children"> = {},
  ) => {
    let indentReduction = 4.4;
    if (indentTabs) indentReduction += indentTabs * 4.4;

    const lines = parseTextRuns(tokens, 41.5 - indentReduction);
    const children: any[] = [];
    lines.forEach((lineTokens, i) => {
      if (i === 0) {
        children.push(new TextRun({ text: `${num}.\t` }));
      }
      lineTokens.forEach((t) =>
        children.push(new TextRun({ text: t.text, bold: t.bold })),
      );
      children.push(new TextRun({ text: "\t" }));
      if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
    });

    const textStart = indentTabs * 425 + 425;

    return new Paragraph({
      children,
      tabStops: [{ type: TabStopType.LEFT, position: textStart }, defaultTab],
      alignment: AlignmentType.LEFT,
      indent: { left: textStart, hanging: 425 },
      ...options,
    });
  };

  const blocks = generateBlocks(data);
  const docxChildren: any[] = [];

  blocks.forEach((block, index) => {
    if (block.type === "p") {
      let align: any = AlignmentType.LEFT;
      let isRightCenter = false;
      if (block.align === "center") align = AlignmentType.CENTER;
      if (block.align === "right") align = AlignmentType.RIGHT;
      if (block.align === "right-center") isRightCenter = true;

      let options: Omit<IParagraphOptions, "children"> = { alignment: align };

      if (block.number && !isRightCenter) {
        docxChildren.push(
          createNumberedP(
            block.number as number,
            block.runs,
            block.indentTabs || 0,
            options,
          ),
        );
      } else {
        docxChildren.push(
          createP(block.runs, block.indentTabs || 0, isRightCenter, options),
        );
      }
    } else if (block.type === "list") {
      docxChildren.push(
        createListP(block.bullet, block.runs, block.indentTabs || 0),
      );
    } else if (block.type === "shareholder-list") {
      const leftIndent = 4800; // colon base position
      const hangingIndent = 4375; // 4800 - 425 (bullet start)
      const combinedText = `${block.sharesText} ${block.rpText}`;
      const tokens: FormatToken[] = [{ text: combinedText }];
      const lines = parseTextRuns(tokens, 28);

      const children: any[] = [];
      lines.forEach((lineTokens, i) => {
        if (i === 0) {
          children.push(
            new TextRun({ text: `${block.bullet}\t${block.name}\t` }),
          );
        }
        lineTokens.forEach((t) =>
          children.push(new TextRun({ text: t.text, bold: t.bold })),
        );
        children.push(new TextRun({ text: "\t" }));
        if (i < lines.length - 1) children.push(new TextRun({ break: 1 }));
      });

      docxChildren.push(
        new Paragraph({
          children,
          tabStops: [
            { type: TabStopType.LEFT, position: 850 },
            { type: TabStopType.LEFT, position: leftIndent },
            defaultTab,
          ],
          alignment: AlignmentType.LEFT,
          indent: { left: leftIndent, hanging: hangingIndent },
        }),
      );
    } else if (block.type === "divider") {
      docxChildren.push(createDividerP(block.text));
    }
  });

  for (let i = 0; i < 4; i++) {
    docxChildren.push(new Paragraph({ text: "" }));
  }

  docxChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.notarisNama
            .replace(/Sarjana Hukum/gi, "SH.")
            .replace(/Magister Kenotariatan/gi, "M.Kn"),
          bold: true,
        }),
      ],
      indent: { left: 4252 },
      alignment: AlignmentType.CENTER,
    }),
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Century Gothic",
            size: 20,
          },
          paragraph: {
            spacing: {
              line: 480,
              before: 0,
              after: 0,
            },
            indent: {
              left: 0,
              right: 0,
              firstLine: 0,
            },
            alignment: AlignmentType.LEFT,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1417,
              bottom: 1417,
              left: 2268,
              right: 1134,
            },
          },
        },
        children: docxChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
};

export const generateDocx = async (data: FormData) => {
  const blob = await generateDocxBlob(data);
  const fileName =
    data.tipeAkta === "Hibah"
      ? `Akta Hibah Saham ${data.nomorAkta || ""}`.trim()
      : `Akta Jual Beli Saham ${data.nomorAkta || ""}`.trim();
  saveAs(blob, `${fileName}.docx`);
};
