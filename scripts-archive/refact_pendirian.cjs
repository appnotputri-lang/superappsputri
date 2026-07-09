const fs = require('fs');

const rupsCode = fs.readFileSync('src/lib/generateRUPSDocx.ts', 'utf-8');

const helpersMatch = rupsCode.match(/\/\/ ─+[\s\S]*?\/\/ MAIN EXPORT/);
const stylesMatch = rupsCode.match(/const doc = new Document\(\{[\s\S]*?\}\);/);

if (helpersMatch && stylesMatch) {
  let pendirianCode = `import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, TabStopType, LeaderType,
  IParagraphOptions, Footer, PageNumber,
} from "docx";
import { saveAs } from "file-saver";
import { FormatToken, parseTextRuns } from "./notaryWrapper";
import { generatePendirianBlocks } from "./pendirianContentBlocks";

${helpersMatch[0].replace('// MAIN EXPORT', '')}

export const generatePendirianDocx = async (data: any) => {
  const blocks = generatePendirianBlocks(data);
  const docxChildren: any[] = [];

  blocks.forEach((block: any) => {
    if (block.type === "p") {
      const isCentered    = block.align === "center";
      const isRightCenter = block.align === "right-center";
      const alignOpt      = isCentered ? AlignmentType.CENTER : AlignmentType.LEFT;
      const opts: Omit<IParagraphOptions, "children"> = { alignment: alignOpt };

      if (block.indentTabs && !isCentered && !isRightCenter) {
        if (block.kbliDesc) {
          docxChildren.push(createKbliDescP(block.runs));
        } else {
          const leftDxa = Math.round((block.indentTabs || 0) * 850);
          docxChildren.push(createIndentP(block.runs, leftDxa, opts));
        }
      } else {
        docxChildren.push(createP(block.runs, isRightCenter, opts));
      }
    } else if (block.type === "list") {
      docxChildren.push(createListP(block.bullet, block.runs, block.indentTabs || 0));
    } else if (block.type === "br") {
      docxChildren.push(new Paragraph({ children: [new TextRun("")] }));
    }
  });

  ${stylesMatch[0]}

  const blob = await Packer.toBlob(doc);
  const safeName = data.namaPt ? data.namaPt.replace(/PT\\.?\\s*/i, "").trim() : "Draft";
  const fileName = \`Akta_Pendirian_\${safeName}\`;
  saveAs(blob, \`\${fileName}.docx\`);
};
`;

  fs.writeFileSync('src/lib/generatePendirianDocx.ts', pendirianCode);
  console.log('Modified success');
} else {
  console.log('Failed to match');
}
