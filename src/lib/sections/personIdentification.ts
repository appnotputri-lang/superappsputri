import { Block } from "./types";
import { FormatToken } from "../notaryWrapper";
import {
  checkIsBadanHukum,
  dateToWords,
  formatDateStr,
  formatPersonDetails,
  formatDateRupst,
  formatAktaDate,
  toTitleCase,
  expandAbbreviations,
} from "../formatter";
import { checkNotaryWording } from "./common";
import { buildAmendmentDeedBlocks } from "./history/amendmentDeeds";

export interface PersonIdentificationConfig {
  person: any;
  fullyDescribedNames: Set<string>;
  isSirkuler?: boolean;
  useAktaFormat?: boolean;
  rep?: any;
  prefixRuns?: FormatToken[];
}

export const getPersonDetailRuns = (config: PersonIdentificationConfig): FormatToken[] => {
  const { person, fullyDescribedNames, isSirkuler = false, useAktaFormat = false, rep, prefixRuns = [] } = config;
  
  let nameUpper = (person?.name || "").toUpperCase().trim();
  const isPenghadap = rep && nameUpper === (rep.name || "").toUpperCase().trim();

  const isBadanHukum = checkIsBadanHukum(person);

  const salutation = (person?.salutation || "Tuan").trim();
  const salUpper = salutation.toUpperCase();
  const stripRegex = new RegExp(
    `^(${salUpper}|TUAN|NYONYA|NONA|NY|TN|NY\\.|TN\\.|NYONYA\\.|TUAN\\.)\\s+`,
    "i",
  );
  if (stripRegex.test(nameUpper)) {
    nameUpper = nameUpper.replace(stripRegex, "").trim();
  }

  const sal = !isBadanHukum ? `${salutation} ` : "";
  const cleanName = expandAbbreviations(nameUpper);

  const normKey = cleanName
    .toUpperCase()
    .replace(/^(TUAN|NYONYA|NONA|TN|NY)\.?\s+/i, "")
    .split(",")[0]
    .replace(/[^A-Z0-9]/g, "");

  if (fullyDescribedNames.has(cleanName) || (normKey && fullyDescribedNames.has(normKey))) {
    return [
      ...prefixRuns,
      { text: sal },
      { text: cleanName, bold: true },
      {
        text: isPenghadap
          ? ", penghadap tersebut di atas"
          : ", tersebut di atas",
      },
    ];
  }

  fullyDescribedNames.add(cleanName);
  if (normKey) {
    fullyDescribedNames.add(normKey);
  }
  const tglLahirHuruf = person ? dateToWords(person.birthDate) : "";
  const tglLahirAngka = person ? formatDateStr(person.birthDate) : "";

  const detailText = person
    ? formatPersonDetails(person, tglLahirAngka, tglLahirHuruf, useAktaFormat, true, isSirkuler)
    : `, lahir di ..., pada tanggal ... (...), Warga Negara Indonesia, ..., bertempat tinggal di ..., ..., RT. ... RW. ..., Kelurahan ..., Kecamatan ..., pemegang Kartu Tanda Penduduk Nomor ...`;

  return [
    ...prefixRuns,
    { text: sal },
    { text: cleanName, bold: true },
    {
      text: expandAbbreviations(detailText),
    },
  ];
};

export const addPersonIdentificationBlocks = (
  targetBlocks: Block[],
  config: PersonIdentificationConfig & {
    bullet: string;
    indentTabs: number;
    suffixRuns?: FormatToken[];
  }
) => {
  const { person, bullet, indentTabs, suffixRuns = [], useAktaFormat = false } = config;
  const isBadanHukum = checkIsBadanHukum(person);
  const hasDeeds = isBadanHukum && person.amendmentDeeds && person.amendmentDeeds.length > 0;

  if (hasDeeds) {
    const amendmentDeeds = person.amendmentDeeds;
    const transition = `, dan anggaran dasarnya telah mengalami ${
      amendmentDeeds.length > 1 ? "beberapa kali " : ""
    }perubahan berdasarkan akta${amendmentDeeds.length > 1 ? "-akta" : ""} sebagai berikut :`;

    const baseRuns = getPersonDetailRuns({ ...config, person: { ...person, amendmentDeeds: [] } }); // Exclude deeds in base runs
    if (baseRuns.length > 0) {
      baseRuns[baseRuns.length - 1].text += transition;
    }

    targetBlocks.push({
      type: (bullet === "") ? "p" : "list",
      bullet: bullet,
      indentTabs: indentTabs,
      runs: baseRuns,
    } as any);

    targetBlocks.push(
      ...buildAmendmentDeedBlocks({
        amendmentDeeds,
        useAktaFormat: useAktaFormat,
        indentTabs: indentTabs + 0.5,
        isLastOverall: true,
        suffixRuns,
      })
    );
  } else {
    targetBlocks.push({
      type: (bullet === "") ? "p" : "list",
      bullet: bullet,
      indentTabs: indentTabs,
      runs: [...getPersonDetailRuns(config), ...suffixRuns],
    } as any);
  }
};
