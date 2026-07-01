export interface CopyConfig {
  useIndentLeft?: boolean;
  indentLeft?: number;
  indentTabs?: number;
  spaceAfter?: boolean;
}

export function createClosingCopy(config: CopyConfig = {}) {
  const block: any = {
    type: "p",
    runs: [
      { text: "Diberikan sebagai salinan yang sama bunyinya." },
    ],
  };

  if (config.useIndentLeft) {
    block.indentLeft = config.indentLeft ?? 993;
  } else {
    block.indentTabs = config.indentTabs ?? 2;
  }

  if (config.spaceAfter !== undefined) {
    block.spaceAfter = config.spaceAfter;
  }

  return [block];
}
