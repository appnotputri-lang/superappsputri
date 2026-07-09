import { Block } from "../types";
import { FormatToken } from "../../notaryWrapper";
import {
  getGroupedAmendmentDeeds,
  formatAktaDate,
} from "../../formatter";
import { checkNotaryWording } from "../common";

export interface AmendmentDeedConfig {
  amendmentDeeds: any[];
  useAktaFormat: boolean;
  indentTabs?: number;
  isLastOverall?: boolean;
  suffixRuns?: FormatToken[];
  currentNotaryName?: string;
  isAkta?: boolean;
}

export const buildAmendmentDeedBlocks = (config: AmendmentDeedConfig): Block[] => {
  const {
    amendmentDeeds,
    useAktaFormat,
    indentTabs = 1.5,
    isLastOverall = false,
    suffixRuns = [],
    currentNotaryName,
    isAkta = false,
  } = config;

  const deedBlocks: Block[] = [];
  const groupedDeeds = getGroupedAmendmentDeeds(amendmentDeeds);
  const keWord = [
    "",
    "",
    "kedua",
    "ketiga",
    "keempat",
    "kelima",
    "keenam",
    "ketujuh",
    "kedelapan",
    "kesembilan",
    "kesepuluh",
  ];

  groupedDeeds.forEach((group, gIdx) => {
    const isLastGroup = gIdx === groupedDeeds.length - 1;

    group.forEach((deed, dIdx) => {
      const isLastInOverall = isLastOverall && isLastGroup && dIdx === group.length - 1;
      const formattedDeedDate = formatAktaDate(deed.date);

      let skText = "";
      if (deed.skSpDocuments && deed.skSpDocuments.length > 0) {
        const sks = deed.skSpDocuments.filter((d: any) => d.type === "SK");
        const sps = deed.skSpDocuments.filter((d: any) => d.type !== "SK");

        const skParts: string[] = [];
        sks.forEach((sk: any) => {
          skParts.push(
            `telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${formatAktaDate(sk.date)}, Nomor ${sk.number}`,
          );
        });

        const spParts: string[] = [];
        if (sps.length > 0) {
          const spDescParts = sps.map((sp: any) => {
            if (sp.type === "SP_DATA_PERSEROAN")
              return `Surat Penerimaan Pemberitahuan Perubahan Data Perseroan Nomor ${sp.number}`;
            if (sp.type === "SP_ANGGARAN_DASAR")
              return `Surat Penerimaan Pemberitahuan Perubahan Anggaran Dasar Nomor ${sp.number}`;
            return `Surat Penerimaan Pemberitahuan Nomor ${sp.number}`;
          });

          const spDates = Array.from(new Set(sps.map((s: any) => s.date)));
          let spDateText = "";
          if (spDates.length === 1) {
            spDateText = ` ${sps.length > 1 ? (sks.length > 0 ? "ketiganya " : "keduanya ") : ""}tertanggal ${formatAktaDate(spDates[0] as string)}`;
          } else {
            spDateText = ` masing-masing tertanggal sebagaimana tercantum dalam surat tersebut`;
          }

          spParts.push(
            `Pemberitahuannya telah diterima dan dicatat dalam Sistem Administrasi Badan Hukum Kementerian Hukum Republik Indonesia berdasarkan ${spDescParts.join(" dan ")}${spDateText}`,
          );
        }

        skText = [...skParts, ...spParts].join(" dan ");
      } else if (deed.skNumber) {
        skText = `telah mendapat pengesahan berdasarkan Surat Keputusan Nomor ${deed.skNumber} tanggal ${formatAktaDate(deed.skDate)}`;
      } else {
        skText = "telah memperoleh pengesahan/penerimaan pemberitahuan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia";
      }

      const notaryWording = checkNotaryWording(deed.notary, deed.notaryTitle, deed.notaryDomicile, {
        isAkta,
        currentNotaryName,
      });

      if (group.length === 1) {
        const baseText = `Akta tertanggal ${formattedDeedDate} Nomor ${deed.number} yang dibuat di hadapan ${notaryWording} yang ${skText}`;
        const runs: FormatToken[] =
          isLastInOverall && suffixRuns.length > 0
            ? [{ text: baseText }, ...suffixRuns]
            : [{ text: `${baseText}${isLastInOverall ? "." : ";"}` }];

        deedBlocks.push({
          type: "list",
          bullet: "-",
          indentTabs: indentTabs,
          runs,
        });
      } else {
        deedBlocks.push({
          type: "list",
          bullet: "-",
          indentTabs: indentTabs,
          runs: [
            {
              text: `Akta tertanggal ${formattedDeedDate} Nomor ${deed.number} yang ${skText};`,
            },
          ],
        });

        if (dIdx === group.length - 1) {
          const prefix = keWord[group.length] || `ke-${group.length}`;
          const baseText = `${prefix} aktanya dibuat di hadapan ${notaryWording}`;
          const runs: FormatToken[] =
            isLastInOverall && suffixRuns.length > 0
              ? [{ text: baseText }, ...suffixRuns]
              : [{ text: `${baseText}${isLastInOverall ? "." : ";"}` }];

          deedBlocks.push({
            type: "list",
            bullet: "-",
            indentTabs: indentTabs,
            runs,
          });
        }
      }
    });
  });

  return deedBlocks;
};