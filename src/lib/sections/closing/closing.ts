import { Block } from "../types";

export interface ClosingConfig {
  meetingTimeEnd: string;
  isCircular?: boolean;
}

export const buildClosingBlocks = (config: ClosingConfig): Block[] => {
  const { meetingTimeEnd, isCircular } = config;
  const blocks: Block[] = [];

  if (isCircular) {
    blocks.push({
      type: "p",
      runs: [
        {
          text: "Demikianlah Keputusan Para Pemegang Saham ini dibuat untuk dapat dipergunakan sebagaimana mestinya.",
        },
      ],
    });
  } else {
    blocks.push({
      type: "p",
      runs: [
        {
          text: `Oleh karena tidak ada lagi hal-hal yang dibicarakan, maka Ketua menutup Rapat pada pukul ${meetingTimeEnd || "__________"} WIB.`,
        },
      ],
    });
    blocks.push({
      type: "p",
      runs: [
        {
          text: "Demikian Notulen Rapat ini dibuat untuk dapat dipergunakan sebagaimana mestinya.",
        },
      ],
    });
  }

  return blocks;
};
