export interface WitnessConfig {
  variant: "PENDIRIAN" | "RUPS" | "RUPST_AKTA";
  notarisTempat: string;
  saksi1Text: string;
  saksi2Text: string;
  saksi1Nama?: string;
  saksi2Nama?: string;
}

export function createWitnessBlocks(config: WitnessConfig) {
  const blocks: any[] = [];

  // Header paragraph
  blocks.push({
    type: "p",
    runs: [
      {
        text: `Dibuat sebagai minuta dan dilangsungkan di ${config.notarisTempat}, pada hari dan tanggal serta jam sebagaimana disebutkan pada kepala akta ini dengan dihadiri oleh :`,
      },
    ],
  });

  if (config.variant === "PENDIRIAN") {
    blocks.push(
      {
        type: "saksi",
        num: 1,
        runs: [{ text: config.saksi1Text }],
      },
      {
        type: "saksi",
        num: 2,
        runs: [{ text: config.saksi2Text }],
      },
      {
        type: "list",
        bullet: "-",
        indentTabs: 1.0,
        runs: [
          { text: `Untuk sementara berada di ${config.notarisTempat};` },
        ],
      }
    );
  } else {
    // RUPS or RUPST_AKTA
    blocks.push(
      {
        type: "saksi",
        number: 1,
        runs: [
          {
            text: config.saksi1Nama || "",
            bold: false,
          },
          {
            text: config.saksi1Text,
          },
        ],
      },
      {
        type: "saksi",
        number: 2,
        runs: [
          {
            text: config.saksi2Nama || "",
            bold: false,
          },
          {
            text: config.saksi2Text,
          },
        ],
        ...(config.variant === "RUPS" ? { spaceAfter: false } : {}),
      },
      {
        type: "list",
        indentTabs: config.variant === "RUPS" ? 0 : 1,
        bullet: "-",
        runs: [{ text: `Untuk sementara berada di ${config.notarisTempat};` }],
        ...(config.variant === "RUPS" ? { spaceAfter: true } : {}),
      }
    );
  }

  return blocks;
}
