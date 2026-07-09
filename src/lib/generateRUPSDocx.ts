import { CompanyData } from "../../types";
import { generateRupsBlocks } from "./rupsContentBlocks";
import { preprocessBlocksForWordBullets, toTitleCase } from "./formatter";
import { AktaTemplate } from "./docx-renderer/templates/AktaTemplate";
import { BaseDocxRenderer } from "./docx-renderer/BaseDocxRenderer";

export const generateRUPSDocx = async (data: CompanyData, returnBlob?: boolean) => {
  const rawBlocks = generateRupsBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);

  const template = new AktaTemplate(blocks);
  const notarisDomicile = toTitleCase(data.notaryDomicile || "Kabupaten Bandung Barat");
  const rawNotaryName = data.notaryName || "NUKANTINI PUTRI PARINCHA, SH., M.Kn";
  const notarisName = rawNotaryName
    .toUpperCase()
    .replace(/SARJANA HUKUM/gi, "SH.")
    .replace(/S\.H\./g, "SH.")
    .replace(/MAGISTER KENOTARIATAN/gi, "M.Kn")
    .replace(/M\.KN\./g, "M.Kn")
    .replace(/M\.KN/g, "M.Kn")
    .trim();

  const config = template.getRenderConfig(notarisDomicile, notarisName);
  
  const filename = `Draft Akta RUPS LB ${data.companyName || 'PT Baru'}.docx`;

  return BaseDocxRenderer.render(config, filename, returnBlob);
};
