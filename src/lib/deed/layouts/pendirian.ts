import { createOpeningTitle } from "../opening/title";
import { createOpeningNumber } from "../opening/number";
import { createOpeningDate } from "../opening/date";
import { createOpeningSentence } from "../opening/sentence";
import { createDemikianlah } from "../closing/demikianlah";

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
  saksi1Nama?: string;
  saksi2Nama?: string;
}

export function createPendirianClosing(config: PendirianClosingConfig) {
  return createDemikianlah(config);
}
