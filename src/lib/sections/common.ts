import { toTitleCase, cleanDegrees, expandAbbreviations } from "../formatter";

export const stripSalutation = (name: string): string => {
  let nameUpper = (name || "").toUpperCase().trim();
  const prefixRegex =
    /^(TUAN|NYONYA|NONA|NY|TN|NY\.|TN\.|NYONYA\.|TUAN\.)\s+/i;
  while (prefixRegex.test(nameUpper)) {
    nameUpper = nameUpper.replace(prefixRegex, "").trim();
  }
  return expandAbbreviations(nameUpper);
};

export function checkNotaryWording(
  name: string,
  title?: string,
  domicile?: string,
  options?: { isAkta?: boolean; currentNotaryName?: string }
) {
  const norm = (name || "").toUpperCase().trim();
  if (options?.isAkta && options?.currentNotaryName) {
    const notaryNorm = options.currentNotaryName.toUpperCase().trim();
    if (norm.includes(notaryNorm) || notaryNorm.includes(norm)) {
        return `saya, Notaris berkedudukan di ${toTitleCase(domicile || "...")},`;
    }
  }
  
  const cleanName = cleanDegrees(name || "");
  const cleanTitle = cleanDegrees(title || "");
  return `${cleanName}${cleanTitle ? `, ${cleanTitle}` : ""}, Notaris di ${toTitleCase(domicile || "...")}`;
}

export const getPosRank = (pos: string | undefined): number => {
  if (!pos) return 99;
  const p = pos.trim().toUpperCase();
  if (p === "DIREKTUR UTAMA") return 1;
  if (p === "WAKIL DIREKTUR UTAMA") return 2;
  if (p === "DIREKTUR") return 3;
  if (p === "WAKIL DIREKTUR") return 4;
  if (p === "KOMISARIS UTAMA") return 5;
  if (p === "WAKIL KOMISARIS UTAMA") return 6;
  if (p === "KOMISARIS") return 7;
  if (p === "WAKIL KOMISARIS") return 8;
  return 10;
};
