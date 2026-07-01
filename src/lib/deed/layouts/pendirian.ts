import { createOpeningTitle } from "../opening/title";
import { createOpeningNumber } from "../opening/number";
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

export interface PendirianOpeningConfig {
  cleanNamaPt: string;
  nomorAkta: string;
  hari: string;
  tglHuruf: string;
  waktu: string;
  notarisNamaSurat: string;
  notarisTempat: string;
}

export function createPendirianOpening(config: PendirianOpeningConfig) {
  return [
    ...createOpeningTitle({
      title: "PENDIRIAN PERSEROAN TERBATAS",
      subtitle: `PT. ${config.cleanNamaPt}`,
    }),
    ...createOpeningNumber(config.nomorAkta || "............................"),
    ...createOpeningDate({
      variant: "PENDIRIAN",
      hari: config.hari,
      tanggalHuruf: config.tglHuruf,
      waktu: config.waktu,
      waktuHuruf: "",
    }),
    ...createOpeningSentence({
      variant: "TELAH_HADIR",
      notaryName: config.notarisNamaSurat,
      notaryDomicile: config.notarisTempat,
    }),
  ];
}

export interface PendirianClosingConfig {
  notarisTempat: string;
  saksi1Text: string;
  saksi2Text: string;
}

export function createPendirianClosing(config: PendirianClosingConfig) {
  return [
    ...createClosingDivider("DEMIKIANLAH AKTA INI"),
    ...createWitnessBlocks({
      variant: "PENDIRIAN",
      notarisTempat: config.notarisTempat,
      saksi1Text: config.saksi1Text,
      saksi2Text: config.saksi2Text,
    }),
    ...createClosingReading(),
    ...createClosingFingerprint(),
    ...createClosingNoChange(),
    ...createClosingMinuta({ indentTabs: 1 }),
    ...createClosingCopy({ indentTabs: 2 }),
    ...createClosingSignature(),
  ];
}
