import { formatNotaryName } from "./notary";
import { toTitleCase } from "../../formatter";

export interface OpeningSentenceConfig {
  variant: "TELAH_HADIR" | "BERHADAPAN" | "BERHADAPAN_RUPST";
  notaryName: string;
  notaryDomicile: string;
}

export function createOpeningSentence(config: OpeningSentenceConfig) {
  if (config.variant === "TELAH_HADIR") {
    return [
      {
        type: "p",
        runs: [
          { text: "Telah hadir di hadapan saya, " },
          {
            text: formatNotaryName(config.notaryName, false),
            bold: true,
          },
          { text: ", Notaris di " },
          {
            text: toTitleCase(config.notaryDomicile),
            bold: true,
          },
          { text: ", dengan dihadiri oleh saksi-saksi yang saya, Notaris kenal dan akan disebutkan nama-namanya pada bagian akhir akta ini :" },
        ],
      }
    ];
  } else if (config.variant === "BERHADAPAN") {
    return [
      {
        type: "p",
        runs: [
          { text: `Berhadapan dengan saya, ` },
          {
            text: config.notaryName,
            bold: true,
          },
          {
            text: `, Notaris di Kabupaten Bandung Barat, dengan di hadiri oleh saksi-saksi yang saya, Notaris kenal dan akan disebutkan nama-namanya pada bagian akhir akta ini :`,
          },
        ],
      }
    ];
  } else if (config.variant === "BERHADAPAN_RUPST") {
    return [
      {
        type: "p",
        runs: [
          { text: `Berhadapan dengan saya, ` },
          {
            text: toTitleCase(config.notaryName),
            bold: true,
          },
          { text: `, Notaris di ` },
          {
            text: toTitleCase(config.notaryDomicile),
            bold: true,
          },
          {
            text: `, dengan dihadiri oleh saksi-saksi yang saya, Notaris kenal dan akan disebutkan nama-namanya pada bagian akhir akta ini:`,
          },
        ],
      }
    ];
  }
  return [];
}
