import { Shareholder } from "../../../../types";
import { Block } from "../types";
import { FormatToken } from "../../notaryWrapper";
import {
  checkIsBadanHukum,
  formatNumber,
  toTitleCase,
  formatAktaDate,
  formatDateRupst,
  terbilang,
} from "../../formatter";
import { getPosRank } from "../common";
import { getPersonDetailRuns, addPersonIdentificationBlocks } from "../personIdentification";
import { buildAmendmentDeedBlocks } from "../history/amendmentDeeds";

export interface RoleOwnShare {
  sharesOwned: number;
  shareholder: Shareholder;
}

export interface RoleManagement {
  position: string;
}

export interface RoleRepresentative {
  sharesOwned: number;
  shareholder: Shareholder;
  proxyData: any;
}

export interface PhysicalAttendee {
  type: "PERSON" | "ENTITY_DIRECT";
  name: string;
  salutation: string;
  sourceObj: any;
  ownShares: RoleOwnShare | null;
  management: RoleManagement | null;
  representations: RoleRepresentative[];
}

export interface AttendanceConfig {
  shareholders: Shareholder[];
  isMinutes: boolean;
  originalSharePrice: number;
  newManagementItems?: any[];
  oldManagementItems?: any[];
  fullyDescribedNames: Set<string>;
  useAktaFormat?: boolean;
  isSirkuler?: boolean;
  rep?: any;
}

export const buildAttendanceAttendees = (config: AttendanceConfig): PhysicalAttendee[] => {
  const { shareholders, isMinutes, newManagementItems, oldManagementItems } = config;
  const attendingShareholders = isMinutes
    ? shareholders.filter((s) => s.isPresent)
    : shareholders.filter((s) => (s.sharesOwned || 0) > 0);

  const attendees: PhysicalAttendee[] = [];

  attendingShareholders.forEach((sh) => {
    if (sh.isProxy && sh.proxyData) {
      const pxName = (sh.proxyData.name || "").trim();
      let att = attendees.find(
        (a) => a.name.toUpperCase() === pxName.toUpperCase(),
      );
      if (!att) {
        att = {
          type: "PERSON",
          name: pxName,
          salutation: sh.proxyData.salutation || "Tuan",
          sourceObj: sh.proxyData,
          ownShares: null,
          management: null,
          representations: [],
        };
        attendees.push(att);
      }
      att.representations.push({
        sharesOwned: sh.sharesOwned || 0,
        shareholder: sh,
        proxyData: sh.proxyData,
      });
    } else {
      const shName = (sh.name || "").trim();
      if (checkIsBadanHukum(sh)) {
        attendees.push({
          type: "ENTITY_DIRECT",
          name: shName,
          salutation: "",
          sourceObj: sh,
          ownShares:
            sh.sharesOwned > 0
              ? {
                  sharesOwned: sh.sharesOwned || 0,
                  shareholder: sh,
                }
              : null,
          management: sh.isManagement
            ? { position: sh.managementPosition || "Direktur" }
            : null,
          representations: [],
        });
      } else {
        let att = attendees.find(
          (a) => a.name.toUpperCase() === shName.toUpperCase(),
        );
        if (!att) {
          att = {
            type: "PERSON",
            name: shName,
            salutation: sh.salutation || "Tuan",
            sourceObj: sh,
            ownShares:
              sh.sharesOwned > 0
                ? {
                    sharesOwned: sh.sharesOwned || 0,
                    shareholder: sh,
                  }
                : null,
            management: sh.isManagement
              ? { position: sh.managementPosition || "Direktur" }
              : null,
            representations: [],
          };
          attendees.push(att);
        } else {
          if (sh.sharesOwned > 0) {
            att.ownShares = {
              sharesOwned: sh.sharesOwned || 0,
              shareholder: sh,
            };
          }
          if (sh.isManagement) {
            att.management = {
              position: sh.managementPosition || "Direktur",
            };
          }
        }
      }
    }
  });

  // Lookup management roles
  attendees.forEach((att) => {
    if (att.type === "PERSON" && !att.management) {
      const pxNameUpper = att.name.toUpperCase().trim();
      const matchedMgmt = shareholders.find(
        (s) => s.name.toUpperCase().trim() === pxNameUpper && s.isManagement,
      );
      if (matchedMgmt) {
        att.management = {
          position: matchedMgmt.managementPosition || "Direktur",
        };
      }
      if (!att.management && newManagementItems) {
        const matchedMgmtNew = newManagementItems.find(
          (m) => m.name.toUpperCase().trim() === pxNameUpper,
        );
        if (matchedMgmtNew) {
          att.management = { position: matchedMgmtNew.position };
        }
      }
      if (!att.management && oldManagementItems) {
        const matchedMgmtOld = oldManagementItems.find(
          (m) => m.name.toUpperCase().trim() === pxNameUpper,
        );
        if (matchedMgmtOld) {
          att.management = { position: matchedMgmtOld.position };
        }
      }
    }
  });

  attendees.sort((a, b) => {
    const rankA = a.management ? getPosRank(a.management.position) : 99;
    const rankB = b.management ? getPosRank(b.management.position) : 99;
    if (rankA !== rankB) return rankA - rankB;
    const aShares = a.ownShares ? a.ownShares.sharesOwned : 0;
    const bShares = b.ownShares ? b.ownShares.sharesOwned : 0;
    return bShares - aShares;
  });

  return attendees;
};

// Builds the block(s) describing a single representation (proxy / director of another PT),
// including the sub-bullet list of amendment deeds when the represented entity has a
// deed history. Returns one block when there is no deed history to show, or multiple
// blocks (base identification + deed bullets) when there is.
const buildRepresentationBlocks = (
  r: RoleRepresentative,
  config: AttendanceConfig,
  bullet: string,
  indentTabs: number,
  endingText: string,
): Block[] => {
  const { originalSharePrice, useAktaFormat, isSirkuler } = config;
  const isDirector = r.proxyData.representationType === "DIREKTUR_PT_LAIN";
  const shareRp = (r.sharesOwned || 0) * originalSharePrice;

  const prefixRuns: FormatToken[] = [];
  if (isDirector) {
    prefixRuns.push({ text: `selaku Direktur dari ` });
  } else {
    const proxyDate = r.proxyData.proxyDeedDate
      ? useAktaFormat
        ? formatAktaDate(r.proxyData.proxyDeedDate)
        : formatDateRupst(r.proxyData.proxyDeedDate)
      : "__________";
    prefixRuns.push({
      text: `selaku penerima kuasa berdasarkan Surat Kuasa tertanggal ${proxyDate}, dari dan oleh karena itu sah bertindak untuk dan atas nama `,
    });
  }

  const suffixText = `, yang dalam hal ini merupakan pemilik dan pemegang saham sebanyak ${formatNumber(r.sharesOwned)} lembar saham atau senilai Rp. ${formatNumber(shareRp)},- berhak mengeluarkan suara ${formatNumber(r.sharesOwned)} suara dalam rapat${endingText}`;

  const hasDeeds =
    isDirector &&
    checkIsBadanHukum(r.shareholder) &&
    r.shareholder.amendmentDeeds &&
    r.shareholder.amendmentDeeds.length > 0;

  if (!hasDeeds) {
    return [
      {
        type: "list",
        bullet,
        indentTabs,
        runs: [
          ...prefixRuns,
          ...getPersonDetailRuns({ ...config, person: r.shareholder }),
          { text: suffixText },
        ],
      },
    ];
  }

  const amendmentDeeds = r.shareholder.amendmentDeeds;
  const lastDeed = amendmentDeeds[amendmentDeeds.length - 1];
  const lastDateStr = lastDeed.date
    ? useAktaFormat
      ? formatAktaDate(lastDeed.date)
      : formatDateRupst(lastDeed.date)
    : "...";
  const actaNumWord = useAktaFormat ? "akta Nomor" : "Akta Nomor";
  const transition = `, dan anggaran dasarnya telah mengalami ${
    amendmentDeeds.length > 1 ? "beberapa kali " : ""
  }perubahan${
    amendmentDeeds.length > 1
      ? `, terakhir dengan ${actaNumWord} ${lastDeed.number || "..."} tertanggal ${lastDateStr} dibuat dihadapan ${lastDeed.notary || "..."}, Notaris di ${lastDeed.notaryDomicile ? toTitleCase(lastDeed.notaryDomicile) : "..."}`
      : ""
  } berdasarkan akta${amendmentDeeds.length > 1 ? "-akta" : ""} sebagai berikut :`;

  // Exclude deeds from the base identification runs (they will be listed as bullets below),
  // same convention as addPersonIdentificationBlocks.
  const baseRuns: FormatToken[] = [
    ...prefixRuns,
    ...getPersonDetailRuns({ ...config, person: { ...r.shareholder, amendmentDeeds: [] } }),
  ];
  if (baseRuns.length > 0) {
    baseRuns[baseRuns.length - 1] = {
      ...baseRuns[baseRuns.length - 1],
      text: baseRuns[baseRuns.length - 1].text + transition,
    };
  }

  return [
    { type: "list", bullet, indentTabs, runs: baseRuns },
    ...buildAmendmentDeedBlocks({
      amendmentDeeds,
      useAktaFormat: !!useAktaFormat,
      indentTabs: indentTabs + 0.5,
      isLastOverall: true,
      suffixRuns: [{ text: suffixText }],
    }),
  ];
};

export const buildAttendanceBlocks = (config: AttendanceConfig): Block[] => {
  const { originalSharePrice, fullyDescribedNames, useAktaFormat, isSirkuler, rep } = config;
  const attendees = buildAttendanceAttendees(config);
  const blocks: Block[] = [];

  attendees.forEach((att, idx) => {
    const isSirkulerMode = isSirkuler;
    const endChar = ";";

    addPersonIdentificationBlocks(blocks, {
      person: att.sourceObj,
      fullyDescribedNames,
      useAktaFormat,
      isSirkuler: isSirkulerMode,
      rep,
      bullet: `${idx + 1}.`,
      indentTabs: config.isMinutes ? 0.668 : 1.0,
      suffixRuns: [{ text: endChar }],
    });

    const totalSubBullets =
      (att.management ? 1 : 0) +
      (att.ownShares ? 1 : 0) +
      att.representations.length;

    if (isSirkulerMode) {
      if (att.ownShares) {
        const shareRp = (att.ownShares.sharesOwned || 0) * originalSharePrice;
        const formattedAmt = formatNumber(shareRp);
        const terbilangAmt = terbilang(shareRp);
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: config.isMinutes ? 1.0 : 1.5,
          runs: [
            {
              text: `selaku pemilik dan pemegang ${formatNumber(att.ownShares.sharesOwned)} (${terbilang(att.ownShares.sharesOwned)}) lembar saham atau senilai Rp. ${formattedAmt},- (${terbilangAmt} rupiah).`,
            },
          ],
        });
      }
      att.representations.forEach((r) => {
        blocks.push(...buildRepresentationBlocks(r, config, "-", config.isMinutes ? 1.0 : 1.5, "."));
      });
      return;
    }

    const selakuText = "Dalam hal ini hadir selaku :";

    if (totalSubBullets === 0) {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.5,
        runs: [{ text: selakuText }],
      });
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.5,
        runs: [{ text: "selaku Undangan Rapat." }],
      });
    } else if (totalSubBullets === 1) {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.5,
        runs: [{ text: selakuText }],
      });

      if (att.management) {
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1.5,
          runs: [{ text: `selaku ${toTitleCase(att.management.position)} Perseroan.` }],
        });
      } else if (att.ownShares) {
        const shareRp = (att.ownShares.sharesOwned || 0) * originalSharePrice;
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1.5,
          runs: [
            {
              text: `selaku Pemilik dan pemegang saham sebanyak ${formatNumber(att.ownShares.sharesOwned)} lembar saham atau senilai Rp. ${formatNumber(shareRp)},- berhak mengeluarkan suara ${formatNumber(att.ownShares.sharesOwned)} suara dalam rapat.`,
            },
          ],
        });
      } else if (att.representations.length === 1) {
        const r = att.representations[0];
        blocks.push(...buildRepresentationBlocks(r, config, "-", 1.5, "."));
      }
    } else if (totalSubBullets > 1) {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.5,
        runs: [{ text: selakuText }],
      });

      let subBulletCode = "a".charCodeAt(0);
      let bulletIdx = 0;

      const getEnding = (idx: number) => {
        if (idx === totalSubBullets) return ".";
        if (idx === totalSubBullets - 1) return "; dan";
        return ";";
      };

      if (att.management) {
        bulletIdx++;
        blocks.push({
          type: "list",
          bullet: String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
          indentTabs: 2.0,
          runs: [
            {
              text: `selaku ${toTitleCase(att.management.position)} Perseroan${getEnding(bulletIdx)}`,
            },
          ],
        });
      }

      if (att.ownShares) {
        bulletIdx++;
        const shareRp = (att.ownShares.sharesOwned || 0) * originalSharePrice;
        blocks.push({
          type: "list",
          bullet: String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
          indentTabs: 2.0,
          runs: [
            {
              text: `selaku Pemilik dan pemegang saham sebanyak ${formatNumber(att.ownShares.sharesOwned)} lembar saham atau senilai Rp. ${formatNumber(shareRp)},- berhak mengeluarkan suara ${formatNumber(att.ownShares.sharesOwned)} suara dalam rapat${getEnding(bulletIdx)}`,
            },
          ],
        });
      }

      att.representations.forEach((r) => {
        bulletIdx++;
        blocks.push(
          ...buildRepresentationBlocks(
            r,
            config,
            String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
            2.0,
            getEnding(bulletIdx),
          ),
        );
      });
    }
  });

  return blocks;
};