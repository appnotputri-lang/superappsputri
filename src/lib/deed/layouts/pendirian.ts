import { createOpeningTitle } from "../opening/title";
import { createOpeningNumber } from "../opening/number";
import { createOpeningDate } from "../opening/date";
import { createOpeningSentence } from "../opening/sentence";
import { createDemikianlah } from "../closing/demikianlah";

export interface PendirianOpeningConfig {
  cleanNamaPt: string;
  clientType?: string;
  nomorAkta: string;
  hari: string;
  tglHuruf: string;
  waktu: string;
  notarisNamaSurat: string;
  notarisTempat: string;
}

export function createPendirianOpening(config: PendirianOpeningConfig) {
  const typeMap: Record<string, { title: string; prefix: string }> = {
    'PT': { title: 'PENDIRIAN PERSEROAN TERBATAS', prefix: 'PT.' },
    'CV': { title: 'PENDIRIAN COMMANDITAIRE VENNOOTSCHAP', prefix: 'CV.' },
    'YAYASAN': { title: 'PENDIRIAN YAYASAN', prefix: 'YAYASAN' },
    'PERKUMPULAN': { title: 'PENDIRIAN PERKUMPULAN', prefix: 'PERKUMPULAN' },
    'KOPERASI': { title: 'PENDIRIAN KOPERASI', prefix: 'KOPERASI' },
    'PMA': { title: 'PENDIRIAN PERSEROAN TERBATAS', prefix: 'PT.' },
    'PERORANGAN': { title: 'PENDIRIAN PERSEROAN TERBATAS', prefix: 'PT.' }
  };

  const clientType = config.clientType || 'PT';
  const info = typeMap[clientType] || { title: 'PENDIRIAN PERSEROAN TERBATAS', prefix: 'PT.' };

  return [
    ...createOpeningTitle({
      title: info.title,
      subtitle: `${info.prefix} ${config.cleanNamaPt}`,
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
