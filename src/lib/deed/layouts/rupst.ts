import { createOpeningTitle } from "../opening/title";
import { createOpeningDate } from "../opening/date";
import { createOpeningSentence } from "../opening/sentence";

import { createClosingDivider } from "../closing/divider";
import { createWitnessBlocks } from "../closing/witness";
import { createClosingReading } from "../closing/reading";
import { createClosingFingerprint } from "../closing/fingerprint";
import { createClosingNoChange } from "../closing/noChange";
import { createClosingMinuta } from "../closing/minuta";
import { createClosingCopy } from "../closing/copy";
import { createClosingSignature } from "../closing/signature";

export interface RupstOpeningConfig {
  rupstType: string;
  companyNameFormatted: string;
  effectiveNotaryNumber: string;
  hasCustomDeedDate: boolean;
  effectiveNotaryDate: string;
  tglAktaHari: string;
  tglAktaHuruf: string;
  jamStr: string;
  jamHuruf: string;
  notaryName: string;
  notaryDomicile: string;
  formatAktaDate: (d: string) => string;
}

export function createRupstOpening(config: RupstOpeningConfig) {
  const blocks: any[] = [];

  if (config.rupstType === "sirkuler") {
    blocks.push(
      ...createOpeningTitle({
        title: "PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM",
      })
    );
  } else {
    blocks.push(
      ...createOpeningTitle({
        title: "PERNYATAAN KEPUTUSAN",
        subtitle: "RAPAT UMUM PEMEGANG SAHAM TAHUNAN",
      })
    );
  }

  blocks.push(
    {
      type: "p",
      align: "center",
      runs: [{ text: config.companyNameFormatted, bold: true }],
    },
    {
      type: "p",
      align: "center",
      runs: [{ text: `Nomor : ${config.effectiveNotaryNumber}` }],
    },
    { type: "p", runs: [] },
    { type: "p", runs: [] },
    ...createOpeningDate({
      variant: "RUPST_AKTA",
      hari: config.tglAktaHari,
      tanggalHuruf: config.tglAktaHuruf,
      waktu: config.jamStr,
      waktuHuruf: config.jamHuruf,
      hasCustomDeedDate: config.hasCustomDeedDate,
      effectiveNotaryDate: config.effectiveNotaryDate,
      formatAktaDate: config.formatAktaDate,
    }),
    ...createOpeningSentence({
      variant: "BERHADAPAN_RUPST",
      notaryName: config.notaryName,
      notaryDomicile: config.notaryDomicile,
    })
  );

  return blocks;
}

export interface RupstClosingConfig {
  notaryDomicile: string;
  saksi1Nama: string;
  saksi1Text: string;
  saksi2Nama: string;
  saksi2Text: string;
}

export function createRupstClosing(config: RupstClosingConfig) {
  return [
    ...createClosingDivider("DEMIKIANLAH AKTA INI"),
    ...createWitnessBlocks({
      variant: "RUPST_AKTA",
      notarisTempat: config.notaryDomicile,
      saksi1Nama: config.saksi1Nama,
      saksi1Text: config.saksi1Text,
      saksi2Nama: config.saksi2Nama,
      saksi2Text: config.saksi2Text,
    }),
    ...createClosingReading(),
    ...createClosingFingerprint(),
    ...createClosingNoChange(),
    ...createClosingMinuta({ useIndentLeft: true, indentLeft: 426 }),
    ...createClosingCopy({ useIndentLeft: true, indentLeft: 993 }),
    ...createClosingSignature(),
  ];
}
