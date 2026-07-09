import { CompanyData } from "../../types";
import { generateRupstBlocks } from "./rupsTahunanContentBlocks";
import { preprocessBlocksForWordBullets } from "./formatter";
import { NotulenTemplate } from "./docx-renderer/templates/NotulenTemplate";
import { BaseDocxRenderer } from "./docx-renderer/BaseDocxRenderer";

export const generateRUPSTDocx = async (data: CompanyData, returnBlob?: boolean) => {
  const rawBlocks = generateRupstBlocks(data);
  const blocks = preprocessBlocksForWordBullets(rawBlocks);

  const template = new NotulenTemplate(blocks, data.companyName, data.domicile);
  const config = template.getRenderConfig();
  
  const filename = `Notulen RUPST ${data.companyName || 'PT Baru'}.docx`;

  return BaseDocxRenderer.render(config, filename, returnBlob);
};
