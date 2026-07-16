import { CompanyData } from "../../types";
import { generateSirkulerLaporanBlocks } from "./sirkulerLaporanContentBlocks";
import { preprocessBlocksForWordBullets, formatCompanyName } from "./formatter";
import { SirkulerTemplate } from "./docx-renderer/templates/SirkulerTemplate";
import { BaseDocxRenderer } from "./docx-renderer/BaseDocxRenderer";

export const generateSirkulerLaporanDocx = async (data: CompanyData, returnBlob?: boolean) => {
  const rawBlocks = generateSirkulerLaporanBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);

  const template = new SirkulerTemplate(blocks, formatCompanyName(data.companyName, data.clientType), data.domicile);
  const config = template.getRenderConfig();
  
  const filename = `Sirkuler RUPST ${formatCompanyName(data.companyName, data.clientType)}.docx`;

  return BaseDocxRenderer.render(config, filename, returnBlob);
};
