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

export interface RupsOpeningConfig {
  isCircular: boolean;
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

export function createRupsOpening(config: RupsOpeningConfig) {
  const blocks: any[] = [];

  if (config.isCircular) {
    blocks.push(
      ...createOpeningTitle({
        title: "PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM",
        subtitle: "YANG DIAMBIL DILUAR RAPAT",
      }),
      {
        type: "p",
        align: "center",
        runs: [
          {
            text: "SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA",
            bold: true,
          },
        ],
      }
    );
  } else {
    blocks.push(
      ...createOpeningTitle({
        title: "PERNYATAAN KEPUTUSAN",
        subtitle: "RAPAT UMUM PEMEGANG SAHAM LUAR BIASA",
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
      runs: [{ text: `Nomor : ${config.effectiveNotaryNumber}`, bold: false }],
    },
    { type: "p", runs: [{ text: "" }] },
    { type: "p", runs: [{ text: "" }] },
    ...createOpeningDate({
      variant: "RUPS",
      hari: config.tglAktaHari,
      tanggalHuruf: config.tglAktaHuruf,
      waktu: config.jamStr,
      waktuHuruf: config.jamHuruf,
      hasCustomDeedDate: config.hasCustomDeedDate,
      effectiveNotaryDate: config.effectiveNotaryDate,
      formatAktaDate: config.formatAktaDate,
    }),
    ...createOpeningSentence({
      variant: "BERHADAPAN",
      notaryName: config.notaryName,
      notaryDomicile: config.notaryDomicile,
    })
  );

  return blocks;
}

export interface RupsClosingConfig {
  notarisTempat: string;
  saksi1Nama: string;
  saksi1Text: string;
  saksi2Nama: string;
  saksi2Text: string;
}

export function createRupsClosing(config: RupsClosingConfig) {
  return [
    ...createClosingDivider("DEMIKIANLAH AKTA INI"),
    ...createWitnessBlocks({
      variant: "RUPS",
      notarisTempat: config.notarisTempat,
      saksi1Nama: config.saksi1Nama,
      saksi1Text: config.saksi1Text,
      saksi2Nama: config.saksi2Nama,
      saksi2Text: config.saksi2Text,
    }),
    ...createClosingReading(),
    ...createClosingFingerprint(),
    ...createClosingNoChange(),
    ...createClosingMinuta({ indentTabs: 1 }),
    ...createClosingCopy({ indentTabs: 2, spaceAfter: true }),
    ...createClosingSignature(),
  ];
}
