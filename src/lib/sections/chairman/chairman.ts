import { Block } from "../types";
import { toTitleCase } from "../../formatter";
import { getPersonDetailRuns } from "../personIdentification";

export interface ChairmanConfig {
  chairmanType: "DIREKTUR" | "PEMEGANG_SAHAM" | "UNDANGAN";
  chairmanName: string;
  chairmanPosition?: string;
  chairmanSourceObj?: any;
  fullyDescribedNames: Set<string>;
  useAktaFormat?: boolean;
  isSirkuler?: boolean;
}

export const buildChairmanBlocks = (config: ChairmanConfig): Block[] => {
  const { chairmanType, chairmanName, chairmanPosition, chairmanSourceObj, fullyDescribedNames, useAktaFormat, isSirkuler } = config;
  const blocks: Block[] = [];

  const nameUpper = chairmanName.toUpperCase().trim();
  const positionStr = chairmanPosition ? toTitleCase(chairmanPosition) : "Direktur";

  blocks.push({
    type: "p",
    runs: [
      { text: "Ketua Rapat :", bold: true },
    ],
  });

  const detailRuns = getPersonDetailRuns({
    person: chairmanSourceObj || { name: chairmanName },
    fullyDescribedNames,
    useAktaFormat,
    isSirkuler,
  });

  let introductoryText = "";
  if (chairmanType === "DIREKTUR") {
    introductoryText = `- Rapat dipimpin oleh ${positionStr} Perseroan, yaitu `;
  } else if (chairmanType === "PEMEGANG_SAHAM") {
    introductoryText = `- Rapat dipimpin oleh salah satu pemegang saham Perseroan, yaitu `;
  } else {
    introductoryText = `- Rapat dipimpin oleh `;
  }

  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 0.5,
    runs: [
      { text: introductoryText },
      ...detailRuns,
      { text: "." },
    ],
  });

  return blocks;
};
