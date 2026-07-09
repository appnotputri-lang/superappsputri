import { Block } from "../types";

export interface SignatureConfig {
  signatories: {
    name: string;
    position?: string;
    isChairman?: boolean;
    isSecretary?: boolean;
  }[];
  signingDate: string;
  signingPlace: string;
}

export const buildSignatureBlocks = (config: SignatureConfig): Block[] => {
  const { signatories, signingDate, signingPlace } = config;
  const blocks: Block[] = [];

  blocks.push({ type: "br" });
  blocks.push({
    type: "p",
    align: "right-center",
    runs: [{ text: `${signingPlace}, ${signingDate}` }],
  });
  blocks.push({ type: "br" });

  if (signatories.length === 1) {
    const s = signatories[0];
    blocks.push({
      type: "p",
      align: "right-center",
      runs: [{ text: s.position || "Ketua Rapat", bold: true }],
    });
    blocks.push({ type: "br" });
    blocks.push({ type: "br" });
    blocks.push({ type: "br" });
    blocks.push({
      type: "p",
      align: "right-center",
      runs: [{ text: s.name.toUpperCase(), bold: true, underline: true }],
    });
  } else if (signatories.length === 2) {
    // Side by side using a simple table or participantSigs layout
    // For now, let's use a table-like structure or participantSigs if supported by renderer
    blocks.push({
        type: "participantSigs",
        participants: signatories.map(s => ({
            name: s.name,
            role: s.position || (s.isChairman ? "Ketua Rapat" : "Sekretaris Rapat")
        }))
    });
  } else {
    // Vertical list for many signatories
    signatories.forEach((s) => {
      blocks.push({
        type: "p",
        align: "right-center",
        runs: [{ text: s.position || (s.isChairman ? "Ketua Rapat" : "Sekretaris Rapat"), bold: true }],
      });
      blocks.push({ type: "br" });
      blocks.push({ type: "br" });
      blocks.push({
        type: "p",
        align: "right-center",
        runs: [{ text: s.name.toUpperCase(), bold: true, underline: true }],
      });
      blocks.push({ type: "br" });
    });
  }

  return blocks;
};
