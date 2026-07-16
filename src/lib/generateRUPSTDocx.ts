import { CompanyData } from "../../types";
import { generateRupstBlocks } from "./rupsTahunanContentBlocks";
import { preprocessBlocksForWordBullets, formatCompanyName } from "./formatter";
import { NotulenTemplate } from "./docx-renderer/templates/NotulenTemplate";
import { BaseDocxRenderer } from "./docx-renderer/BaseDocxRenderer";

export const generateRUPSTDocx = async (data: CompanyData, returnBlob?: boolean) => {
  const rawBlocks = generateRupstBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);

  const template = new NotulenTemplate(blocks, formatCompanyName(data.companyName, data.clientType), data.domicile);
  const config = template.getRenderConfig();
  
  const filename = `Notulen RUPST ${formatCompanyName(data.companyName, data.clientType)}.docx`;

  return BaseDocxRenderer.render(config, filename, returnBlob);
};
