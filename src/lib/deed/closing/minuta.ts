export interface MinutaConfig {
  useIndentLeft?: boolean;
  indentLeft?: number;
  indentTabs?: number;
}

export function createClosingMinuta(config: MinutaConfig = {}) {
  const block: any = {
    type: "p",
    runs: [
      { text: "Minuta Akta ini telah ditanda-tangani dengan sempurna." },
    ],
  };

  if (config.useIndentLeft) {
    block.indentLeft = config.indentLeft ?? 426;
  } else {
    block.indentTabs = config.indentTabs ?? 1;
  }

  return [block];
}
