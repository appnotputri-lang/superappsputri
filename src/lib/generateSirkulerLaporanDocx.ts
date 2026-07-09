import { CompanyData } from "../../types";
import { generateSirkulerLaporanBlocks } from "./sirkulerLaporanContentBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";
import { SirkulerTemplate } from "./docx-renderer/templates/SirkulerTemplate";
import { BaseDocxRenderer } from "./docx-renderer/BaseDocxRenderer";

export const generateSirkulerLaporanDocx = async (data: CompanyData, returnBlob?: boolean) => {
  const rawBlocks = generateSirkulerLaporanBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);

  const template = new SirkulerTemplate(blocks, data.companyName, data.domicile);
  const config = template.getRenderConfig();
  
  const filename = `Sirkuler RUPST ${data.companyName || 'PT Baru'}.docx`;

  return BaseDocxRenderer.render(config, filename, returnBlob);
};
