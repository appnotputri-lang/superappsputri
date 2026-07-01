export interface OpeningDateConfig {
  variant: "PENDIRIAN" | "RUPS" | "RUPST_AKTA";
  hari: string;
  tanggalHuruf: string;
  waktu: string; // e.g. "10:00" or "10.00"
  waktuHuruf: string; // e.g. "sepuluh lewat nol-nol menit"
  hasCustomDeedDate?: boolean;
  effectiveNotaryDate?: string;
  formatAktaDate?: (d: string) => string;
}

export function createOpeningDate(config: OpeningDateConfig) {
  const blocks: any[] = [];

  if (config.variant === "PENDIRIAN") {
    blocks.push(
      { type: "p", runs: [{ text: `Pada hari ini, ${config.hari}, ${config.tanggalHuruf}.` }] },
      { type: "p", runs: [{ text: `Pukul ${config.waktu} WIB Waktu Indonesia Barat.` }] }
    );
  } else if (config.variant === "RUPS") {
    const dateText = config.hasCustomDeedDate && config.effectiveNotaryDate && config.formatAktaDate
      ? `Pada hari ini, ${config.hari}, tanggal ${config.formatAktaDate(config.effectiveNotaryDate)}.`
      : `Pada hari ini, hari ${config.hari}, tanggal ${config.tanggalHuruf}.`;

    blocks.push(
      { type: "p", runs: [{ text: dateText }] },
      { type: "p", runs: [{ text: `Pukul ${config.waktu} (${config.waktuHuruf}).` }] }
    );
  } else if (config.variant === "RUPST_AKTA") {
    const dateText = config.hasCustomDeedDate && config.effectiveNotaryDate && config.formatAktaDate
      ? `Pada hari ini, ${config.hari}, tanggal ${config.formatAktaDate(config.effectiveNotaryDate)}.`
      : `Pada hari ini, hari ${config.hari}, tanggal ${config.tanggalHuruf}.`;

    blocks.push(
      { type: "p", runs: [{ text: dateText }] },
      { type: "p", runs: [{ text: `Pukul ${config.waktu} WIB (${config.waktuHuruf}).` }] }
    );
  }

  return blocks;
}
