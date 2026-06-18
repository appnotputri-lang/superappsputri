import { CompanyData, Shareholder } from "../../types";
import { FormatToken } from "./notaryWrapper";
import {
  getDayName,
  dateToWords,
  formatDateStr,
  formatDateSimple,
  formatDateRupst,
  timeToWords,
  terbilang,
  toTitleCase,
  formatNumber,
  formatAddress,
  formatCompanyName,
  formatPersonDetails,
  checkIsBadanHukum,
  formatAktaDate,
  cleanDegrees,
} from "./formatter";

import { buildDividendBlocks } from "./rupsTahunanContentBlocks";

export type Block =
  | {
      type: "p";
      runs: FormatToken[];
      align?: "left" | "center" | "right" | "right-center";
      indent?: boolean;
      indentLeft?: number;
      indentTabs?: number;
      spaceAfter?: boolean;
      number?: number;
      subNumber?: number | string;
    }
  | {
      type: "list";
      bullet: string;
      runs: FormatToken[];
      indentTabs?: number;
    }
  | {
      type: "shareholder-list";
      bullet: string;
      name: string;
      sharesText: string;
      rpText: string;
    }
  | {
      type: "management-list";
      name: string;
      position: string;
    }
  | {
      type: "saksi";
      number: number;
      runs: FormatToken[];
    }
  | { type: "divider"; text: string }
  | { type: "br" }
  | { type: "pageBreak" };

export const generateRupstAktaBlocks = (data: CompanyData): Block[] => {
  const blocks: Block[] = [];

  const hasCustomDeedDate = !!(data.draftAktaRupsDate || data.notaryDate);
  const effectiveNotaryDate = data.draftAktaRupsDate || data.notaryDate || "";
  
  let effectiveNotaryNumber = (data.draftAktaRupsNumber || data.notaryNumber || "").trim();
  if (effectiveNotaryNumber === "" || effectiveNotaryNumber === "...") {
    effectiveNotaryNumber = "0";
  }
  
  const tglAktaHari = hasCustomDeedDate && effectiveNotaryDate ? (getDayName(effectiveNotaryDate) || "Jum'at") : "............................";
  const tglAktaRupst = hasCustomDeedDate && effectiveNotaryDate ? (formatDateRupst(effectiveNotaryDate) || "08 Mei 2026") : "............................";
  const tglAktaHuruf = hasCustomDeedDate && effectiveNotaryDate ? dateToWords(effectiveNotaryDate) : "............................";
  const tglAktaAngka = hasCustomDeedDate && effectiveNotaryDate ? formatDateStr(effectiveNotaryDate) : "............................";

  const hasCustomDeedTime = !!data.draftAktaRupsTime;
  const effectiveNotaryTime = data.draftAktaRupsTime || "";
  
  const jamStr = hasCustomDeedTime && effectiveNotaryTime ? effectiveNotaryTime.replace(":", ".") : "............................";
  const jamParts = (effectiveNotaryTime || "11:00").split(":");
  const h = parseInt(jamParts[0]) || 0;
  const m = parseInt(jamParts[1]) || 0;
  const jamHuruf = hasCustomDeedTime && effectiveNotaryTime 
    ? `${terbilang(h)} lewat ${m === 0 ? "nol-nol" : terbilang(m)} menit Waktu Indonesia Barat`
    : "............................";

  // Meeting Dates
  const tglRapatHari = getDayName(data.signingDate || "") || "Rabu";
  const tglRapatRupst = formatDateRupst(data.signingDate || "") || "06 Mei 2026";

  const stTime = data.meetingStartTime;
  const jamRapatStr = stTime ? stTime.replace(":", ".") : "00.00";
  const jamRapatParts = (stTime || "00:00").split(":");
  const hr = parseInt(jamRapatParts[0]);
  const mr = parseInt(jamRapatParts[1]);
  const jamRapatHuruf = `${terbilang(hr)} lewat ${mr === 0 ? "nol-nol" : terbilang(mr)} menit Waktu Indonesia Barat`;
  const isTimeDefault = !stTime;

  const getPosRank = (pos: string | undefined): number => {
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

  // Total shares and attending shares
  const totalShares = data.shareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0) || 1010;
  const attendingShareholders = data.shareholders.filter(s => s.isPresent) || [];
  
  attendingShareholders.sort((a, b) => {
    const rankA = a.isManagement ? getPosRank(a.managementPosition) : 99;
    const rankB = b.isManagement ? getPosRank(b.managementPosition) : 99;
    if (rankA !== rankB) return rankA - rankB;
    return (b.sharesOwned || 0) - (a.sharesOwned || 0);
  });

  const presentShares = attendingShareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0);
  const presentPercentage = totalShares > 0 ? (presentShares / totalShares) * 100 : 100;

  // Rep details (Usually the person appearing before the Notary to state the resolutions)
  let rep: any;
  if (data.representativeType === "EXISTING") {
    const found = data.shareholders.find((s) => s.id === data.authorizedRepresentativeId);
    if (found) {
      rep = (found.isProxy && found.proxyData) ? found.proxyData : found;
    } else {
      const chairSh = data.shareholders.find(s => (s.name || "").toUpperCase() === (data.meetingChair || "").toUpperCase());
      rep = (chairSh?.isProxy && chairSh.proxyData) ? chairSh.proxyData : (chairSh || data.shareholders[0]);
    }
  } else {
    rep = data.manualRepresentative;
  }

  const fullyDescribedNames = new Set<string>();

  const expandAbbreviations = (str: string) => {
    if (!str) return "";
    let res = str;
    res = res.replace(/RT\.\s*(\d+)\s*RW\.\s*(\d+)/gi, 'Rukun Tetangga $1, Rukun Warga $2');
    res = res.replace(/RT\s+(\d+)\s*RW\s+(\d+)/gi, 'Rukun Tetangga $1, Rukun Warga $2');
    res = res.replace(/RT\.\s*(\d+)/gi, 'Rukun Tetangga $1');
    res = res.replace(/RW\.\s*(\d+)/gi, 'Rukun Warga $1');
    res = res.replace(/\bS\.H\b\.?/gi, 'Sarjana Hukum');
    res = res.replace(/\bM\.Kn\b\.?/gi, 'Magister Kenotariatan');
    res = res.replace(/\bjl(?:n)?\.?\b/gi, "Jalan");
    res = res.replace(/\bgg\.?\b/gi, "Gang");
    return res;
  };

  const getPersonDetailRuns = (person: any): FormatToken[] => {
    const rawName = (person?.name || "").trim();
    let nameUpper = expandAbbreviations(rawName).toUpperCase();
    const isBadanHukum = checkIsBadanHukum(person);
    
    // Avoid double salutations if name already starts with the salutation
    const currentSal = (!isBadanHukum) ? (person?.salutation || "Tuan").trim() : "";
    
    // Clean nameUpper of any leading salutations completely!
    const cleanPrefixRegex = /^(TUAN|NYONYA|NONA|NY|TN|NY\.|TN\.|NYONYA\.|TUAN\.)\s+/i;
    while (cleanPrefixRegex.test(nameUpper)) {
      nameUpper = nameUpper.replace(cleanPrefixRegex, "").trim();
    }
    
    const isPenghadap = rep && nameUpper === (rep.name || "").toUpperCase().trim();

    if (fullyDescribedNames.has(nameUpper) && nameUpper !== "") {
      return [
        { text: currentSal ? currentSal + " " : "" },
        { text: nameUpper, bold: true },
        { text: isPenghadap ? ", penghadap tersebut diatas" : ", tersebut diatas" }
      ];
    }

    fullyDescribedNames.add(nameUpper);
    const tglAngka = person?.birthDate ? formatDateStr(person.birthDate) : "...";
    const tglHuruf = person?.birthDate ? dateToWords(person.birthDate) : "";
    
    let detailText = person ? formatPersonDetails(person, tglAngka, tglHuruf, true) : `, lahir di ..., pada tanggal ... (...), Warga Negara Indonesia, swasta, bertempat tinggal di ..., Rukun Tetangga ..., Rukun Warga ..., Kelurahan ..., Kecamatan ..., pemegang Kartu Tanda Penduduk Nomor ...`;
    detailText = expandAbbreviations(detailText);

    return [
      { text: currentSal ? currentSal + " " : "" },
      { text: nameUpper, bold: true },
      { text: detailText },
    ];
  };

  // 1. Header (Centered, no "AKTA" prefix to match PDF exactly)
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "PERNYATAAN KEPUTUSAN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: "RAPAT UMUM PEMEGANG SAHAM TAHUNAN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: formatCompanyName(data.companyName), bold: true }] },
    { type: "p", align: "center", runs: [{ text: `Nomor : ${effectiveNotaryNumber}` }] },
    { type: "p", runs: [] },
    { type: "p", runs: [] },
    {
      type: "p",
      runs: [{
        text: hasCustomDeedDate && effectiveNotaryDate
          ? `Pada hari ini, ${tglAktaHari}, tanggal ${formatAktaDate(effectiveNotaryDate)}.`
          : `Pada hari ini, hari ${tglAktaHari}, tanggal ${tglAktaHuruf}.`
      }]
    },
    { type: "p", runs: [{ text: `Pukul ${jamStr} WIB (${jamHuruf}).` }] },
    {
      type: "p",
      runs: [
        { text: `Berhadapan dengan saya, ` },
        { text: toTitleCase(data.notaryName || "Nukantini Putri Parincha, Sarjana Hukum, Magister Kenotariatan"), bold: true },
        { text: `, Notaris di ` },
        { text: toTitleCase(data.notaryDomicile || "Kabupaten Bandung Barat"), bold: true },
        { text: `, dengan dihadiri oleh saksi-saksi yang saya, Notaris kenal dan akan disebutkan nama-namanya pada bagian akhir akta ini :` },
      ],
    }
  );

  // 2. Representative (The person reporting the BAR RUPST)
  if (rep) {
    const currentSal = rep.salutation || "Tuan";
    const salUpper = `${currentSal.toUpperCase()} `;
    let displayName = (rep.name || "").toUpperCase();
    if (displayName.startsWith(salUpper)) {
      displayName = displayName.substring(salUpper.length);
    }

    blocks.push({
      type: "p",
      runs: [
        { text: `${currentSal} ` },
        { text: displayName, bold: true },
        { text: expandAbbreviations(formatPersonDetails(rep, rep.birthDate ? formatDateStr(rep.birthDate) : "...", rep.birthDate ? dateToWords(rep.birthDate) : "", true)) },
        { text: ";" }
      ]
    });
    fullyDescribedNames.add(displayName);

    const isForeignRep = rep.nationalityType === 'WNA' || rep.isForeign;
    if (isForeignRep) {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 0.3,
        runs: [{ text: `Untuk sementara berada di ${toTitleCase(data.notaryDomicile || "Kabupaten Bandung Barat")};` }]
      });
    }

    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.3,
      runs: [{ text: "Hadir selaku" }, { text: " kuasa sebagaimana yang tertera dalam risalah Rapat Perseroan yang akan diuraikan di bawah ini." }]
    });

    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.3,
      runs: [{ text: "Penghadap telah memperkenalkan diri kepada saya, Notaris." }]
    });
  }

  blocks.push(
    {
      type: "p",
      runs: [
        { text: "Penghadap dalam kedudukannya tersebut di atas menerangkan terlebih dahulu kepada saya, Notaris :" }
      ]
    }
  );

  // Preamble - Meeting Statement & Foundation Deed
  const establishmentDeedDateText = formatAktaDate(data.establishmentDeedDate || "");

  const getSkFormattedNumber = () => {
    const rawSk = data.establishmentSkNumber || "0071719.AH.01.01.Tahun 2024";
    const upperRaw = rawSk.toUpperCase().trim();
    if (upperRaw.startsWith("AHU-")) {
      return upperRaw;
    }
    return "AHU-" + rawSk;
  };

  function checkNotaryWording(name: string, title?: string, domicile?: string) {
    const norm = (name || "").toUpperCase().trim();
    const t1 = "NUKANTINI PUTRI PARINCHA";
    const t2 = "RADEN AJENG NUKANTINI PUTRI PARINCHA";
    if (norm.startsWith(t1) || norm.startsWith(t2)) {
      return `saya, Notaris berkedudukan di ${toTitleCase(domicile || "...")},`;
    }
    const cleanName = cleanDegrees(name || "");
    const cleanTitle = cleanDegrees(title || "");
    return `${cleanName}${cleanTitle ? `, ${cleanTitle}` : ""}, Notaris di ${toTitleCase(domicile || "...")}`;
  }

  const hasAmendments = data.amendmentDeeds && data.amendmentDeeds.length > 0;
  const isSingleAmendment = data.amendmentDeeds && data.amendmentDeeds.length === 1;

  const getDeedSkText = (deed: any) => {
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
          spDateText = ` ${sps.length > 1 ? (sks.length > 0 ? (sks.length + sps.length === 3 ? "ketiganya " : "keduanya ") : (sps.length === 2 ? "keduanya " : "")) : ""}tertanggal ${formatAktaDate(spDates[0] as string)}`;
        } else {
          spDateText = ` masing-masing tertanggal sebagaimana tercantum dalam surat tersebut`;
        }

        spParts.push(
          `Pemberitahuannya telah diterima dan dicatat dalam Sistem Administrasi Badan Hukum Kementerian Hukum Republik Indonesia berdasarkan ${spDescParts.join(" dan ")}${spDateText}`,
        );
      }

      return [...skParts, ...spParts].join(" dan ");
    } else {
      if (!deed.skNumber) return "";
      return `telah mendapat pengesahan berdasarkan Surat Keputusan Nomor ${deed.skNumber} tanggal ${formatAktaDate(deed.skDate)}`;
    }
  };

  const isVenueDefault = !data.signingPlace;
  const isDateDefault = !data.signingDate;

  const getFoundationRuns = (suffix: string = ""): FormatToken[] => [
    { text: `Bahwa pada hari ` },
    { text: tglRapatHari, highlight: isDateDefault ? "yellow" : undefined },
    { text: `, tanggal ` },
    { text: formatAktaDate(data.signingDate || ""), highlight: isDateDefault ? "yellow" : undefined },
    { text: `, bertempat di ` },
    { text: data.signingPlace || "Kantor Perseroan", highlight: isVenueDefault ? "yellow" : undefined },
    { text: `, pukul ` },
    { text: `${jamRapatStr} WIB`, highlight: isTimeDefault ? "yellow" : undefined },
    { text: ` telah diadakan Rapat Umum Pemegang Saham Tahunan Perseroan Terbatas ${formatCompanyName(data.companyName)} (selanjutnya disebut sebagai “Rapat”) Perseroan berkedudukan di ${toTitleCase(data.domicile || "...")}, demikian berdasarkan Akta Pendirian tertanggal ${establishmentDeedDateText}, Nomor ${data.establishmentDeedNumber || "02"} dibuat dihadapan ${checkNotaryWording(data.establishmentNotary || "............................", data.establishmentNotaryTitle, data.establishmentNotaryDomicile)} dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${getSkFormattedNumber()} tertanggal ${formatAktaDate(data.establishmentSkDate || "")}${suffix}` }
  ];

  if (!hasAmendments) {
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.3,
      runs: getFoundationRuns(";")
    });
  } else if (isSingleAmendment) {
    const deed = data.amendmentDeeds![0];
    const skText = getDeedSkText(deed);
    const amendmentSentence = ` dan telah mengalami perubahan berdasarkan Akta tertanggal ${formatAktaDate(deed.date)} Nomor ${deed.number} yang dibuat di hadapan ${checkNotaryWording(deed.notary, deed.notaryTitle, deed.notaryDomicile)}${skText ? " yang " + skText : ""};`;
    
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.3,
      runs: getFoundationRuns(amendmentSentence)
    });
  } else {
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.3,
      runs: getFoundationRuns(" dan telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut :")
    });

    data.amendmentDeeds!.forEach((deed, i) => {
      const isLast = i === data.amendmentDeeds!.length - 1;
      const skText = getDeedSkText(deed);
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.0,
        runs: [
          {
            text: `Akta tertanggal ${formatAktaDate(deed.date)} Nomor ${deed.number} yang dibuat di hadapan ${checkNotaryWording(deed.notary, deed.notaryTitle, deed.notaryDomicile)}${skText ? " yang " + skText : ""};`,
          },
        ],
      });
    });
  }

  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 0.5,
    runs: [
      { text: `Bahwa sesuai ketentuan Pasal ${data.rupstAdArticle || "9"} ayat (${data.rupstAdParagraph || "6"}) Anggaran Dasar Perseroan, pada tanggal ${formatAktaDate(data.signingDate || "")} seluruh pemegang saham telah menandatangani risalah rapat yang dimuat dalam "Risalah rapat Pemegang Saham Tahunan" yang dibuat di bawah tangan, yang ditandatangani oleh:` }
    ]
  });

  // 3. Attendance - Grouped Physical Attendees to prevent duplicate listings of proxies / directors of corporate shareholders.
  interface RoleOwnShare {
    sharesOwned: number;
    shareholder: Shareholder;
  }

  interface RoleManagement {
    position: string;
  }

  interface RoleRepresentative {
    sharesOwned: number;
    shareholder: Shareholder;
    proxyData: any;
  }

  interface PhysicalAttendee {
    type: 'PERSON' | 'ENTITY_DIRECT';
    name: string;
    salutation: string;
    sourceObj: any;
    ownShares: RoleOwnShare | null;
    management: RoleManagement | null;
    representations: RoleRepresentative[];
  }

  const attendees: PhysicalAttendee[] = [];

  attendingShareholders.forEach(sh => {
    if (sh.isProxy && sh.proxyData) {
      const pxName = (sh.proxyData.name || "").trim();
      let att = attendees.find(a => a.name.toUpperCase() === pxName.toUpperCase());
      if (!att) {
        att = {
          type: 'PERSON',
          name: pxName,
          salutation: sh.proxyData.salutation || "Tuan",
          sourceObj: sh.proxyData,
          ownShares: null,
          management: null,
          representations: []
        };
        attendees.push(att);
      }
      att.representations.push({
        sharesOwned: sh.sharesOwned || 0,
        shareholder: sh,
        proxyData: sh.proxyData
      });
    } else {
      const shName = (sh.name || "").trim();
      if (checkIsBadanHukum(sh)) {
        attendees.push({
          type: 'ENTITY_DIRECT',
          name: shName,
          salutation: '',
          sourceObj: sh,
          ownShares: sh.sharesOwned > 0 ? {
            sharesOwned: sh.sharesOwned || 0,
            shareholder: sh
          } : null,
          management: sh.isManagement ? { position: sh.managementPosition || "Direktur" } : null,
          representations: []
        });
      } else {
        let att = attendees.find(a => a.name.toUpperCase() === shName.toUpperCase());
        if (!att) {
          att = {
            type: 'PERSON',
            name: shName,
            salutation: sh.salutation || "Tuan",
            sourceObj: sh,
            ownShares: sh.sharesOwned > 0 ? {
              sharesOwned: sh.sharesOwned || 0,
              shareholder: sh
            } : null,
            management: sh.isManagement ? { position: sh.managementPosition || "Direktur" } : null,
            representations: []
          };
          attendees.push(att);
        } else {
          if (sh.sharesOwned > 0) {
            att.ownShares = {
              sharesOwned: sh.sharesOwned || 0,
              shareholder: sh
            };
          }
          if (sh.isManagement) {
            att.management = { position: sh.managementPosition || "Direktur" };
          }
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

  attendees.forEach((att, idx) => {
    // Lookup and attach company management role if they are a person and don't have one set yet
    if (att.type === 'PERSON' && !att.management) {
      const pxNameUpper = att.name.toUpperCase().trim();
      const matchedMgmt = data.shareholders.find(s => s.name.toUpperCase().trim() === pxNameUpper && s.isManagement);
      if (matchedMgmt) {
        att.management = { position: matchedMgmt.managementPosition || "Direktur" };
      }
      if (!att.management && data.newManagementItems) {
        const matchedMgmtNew = data.newManagementItems.find(m => m.name.toUpperCase().trim() === pxNameUpper);
        if (matchedMgmtNew) {
          att.management = { position: matchedMgmtNew.position };
        }
      }
      if (!att.management && data.oldManagementItems) {
        const matchedMgmtOld = data.oldManagementItems.find(m => m.name.toUpperCase().trim() === pxNameUpper);
        if (matchedMgmtOld) {
          att.management = { position: matchedMgmtOld.position };
        }
      }
    }

    const isRep = (att.name || "").toUpperCase().trim() === (rep.name || "").toUpperCase().trim();
    const currentSal = (att.salutation || "Tuan").trim();
    let displayName = (att.name || "").toUpperCase().trim();
    
    // Clean displayName of any leading salutations completely!
    const cleanPrefixRegex = /^(TUAN|NYONYA|NONA|NY|TN|NY\.|TN\.|NYONYA\.|TUAN\.)\s+/i;
    while (cleanPrefixRegex.test(displayName)) {
      displayName = displayName.replace(cleanPrefixRegex, "").trim();
    }

    const runsList: FormatToken[] = [];

    if (isRep) {
      if (att.salutation) {
        runsList.push({ text: `${att.salutation} ` });
      }
      runsList.push(
        { text: displayName, bold: true },
        { text: ", penghadap tersebut diatas;" }
      );
    } else {
      runsList.push(...getPersonDetailRuns(att.sourceObj), { text: ";" });
    }

    blocks.push({
      type: "list",
      bullet: `${idx + 1}.`,
      indentTabs: 1.0,
      runs: runsList
    });

    const totalSubBullets = (att.management ? 1 : 0) + (att.ownShares ? 1 : 0) + att.representations.length;

    if (totalSubBullets === 1) {
      if (att.management) {
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1.0,
          runs: [
            { text: "Hadir selaku" },
            { text: ` ${toTitleCase(att.management.position)} Perseroan.` }
          ]
        });
      } else if (att.ownShares) {
        const shareRp = (att.ownShares.sharesOwned || 0) * (data.originalSharePrice || 10000000);
        const formattedAmt = formatNumber(shareRp);
        const terbilangAmt = terbilang(shareRp);
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1.0,
          runs: [
            { text: "Hadir selaku" },
            { text: ` pemilik dan pemegang ${formatNumber(att.ownShares.sharesOwned)} (${terbilang(att.ownShares.sharesOwned)}) lembar saham atau senilai ` },
            { text: `Rp. ${formattedAmt},- (${terbilangAmt} rupiah).` }
          ]
        });
      } else if (att.representations.length === 1) {
        const r = att.representations[0];
        const isDirector = r.proxyData.representationType === 'DIREKTUR_PT_LAIN';
        const shareRp = (r.sharesOwned || 0) * (data.originalSharePrice || 10000000);
        const formattedAmt = formatNumber(shareRp);
        const terbilangAmt = terbilang(shareRp);

        let repTextRuns: FormatToken[] = [];
        repTextRuns.push({ text: "Hadir selaku" });
        if (isDirector) {
          repTextRuns.push({ text: " Direktur dari " });
          repTextRuns.push(...getPersonDetailRuns(r.shareholder));
        } else {
          const proxyDate = r.proxyData.proxyDeedDate ? formatAktaDate(r.proxyData.proxyDeedDate) : "__________ (__________)";
          repTextRuns.push({ text: " Kuasa dari " });
          repTextRuns.push(...getPersonDetailRuns(r.shareholder));
          repTextRuns.push({ text: ` berdasarkan Surat Kuasa tertanggal ${proxyDate}` });
        }

        repTextRuns.push({
          text: `, selaku pemilik dan pemegang ${formatNumber(r.sharesOwned)} (${terbilang(r.sharesOwned)}) lembar saham atau senilai `
        });
        repTextRuns.push({ text: `Rp. ${formattedAmt},- (${terbilangAmt} rupiah).` });

        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1.0,
          runs: repTextRuns
        });
      }
    } else if (totalSubBullets > 1) {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.0,
        runs: [{ text: "Hadir selaku" }]
      });

      let subBulletCode = 'a'.charCodeAt(0);
      let bulletIdx = 0;

      // a. Management position
      if (att.management) {
        bulletIdx++;
        const isLast = bulletIdx === totalSubBullets;
        blocks.push({
          type: "list",
          bullet: String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
          indentTabs: 1.5,
          runs: [{ text: `${toTitleCase(att.management.position)} Perseroan${isLast ? "." : ";"}` }]
        });
      }

      // b. Own Shares
      if (att.ownShares) {
        bulletIdx++;
        const isLast = bulletIdx === totalSubBullets;
        const shareRp = (att.ownShares.sharesOwned || 0) * (data.originalSharePrice || 10000000);
        const formattedAmt = formatNumber(shareRp);
        const terbilangAmt = terbilang(shareRp);
        blocks.push({
          type: "list",
          bullet: String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
          indentTabs: 1.5,
          runs: [
            { text: `Selaku pemilik dan pemegang ${formatNumber(att.ownShares.sharesOwned)} (${terbilang(att.ownShares.sharesOwned)}) lembar saham atau senilai ` },
            { text: `Rp. ${formattedAmt},- (${terbilangAmt} rupiah)${isLast ? "." : ";"}` }
          ]
        });
      }

      // c. Representations: Proxy / Director of other PT
      att.representations.forEach(r => {
        bulletIdx++;
        const isLast = bulletIdx === totalSubBullets;
        const isDirector = r.proxyData.representationType === 'DIREKTUR_PT_LAIN';
        const shareRp = (r.sharesOwned || 0) * (data.originalSharePrice || 10000000);
        const formattedAmt = formatNumber(shareRp);
        const terbilangAmt = terbilang(shareRp);

        let repTextRuns: FormatToken[] = [];
        if (isDirector) {
          repTextRuns.push({ text: `Direktur dari ` });
          repTextRuns.push(...getPersonDetailRuns(r.shareholder));
        } else {
          const proxyDate = r.proxyData.proxyDeedDate ? formatAktaDate(r.proxyData.proxyDeedDate) : "__________ (__________)";
          repTextRuns.push({ text: `Kuasa dari ` });
          repTextRuns.push(...getPersonDetailRuns(r.shareholder));
          repTextRuns.push({ text: ` berdasarkan Surat Kuasa tertanggal ${proxyDate}` });
        }

        repTextRuns.push({
          text: `, selaku pemilik dan pemegang ${formatNumber(r.sharesOwned)} (${terbilang(r.sharesOwned)}) lembar saham atau senilai `
        });
        repTextRuns.push({ text: `Rp. ${formattedAmt},- (${terbilangAmt} rupiah)${isLast ? "." : ";"}` });

        blocks.push({
          type: "list",
          bullet: String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
          indentTabs: 1.5,
          runs: repTextRuns
        });
      });
    }
  });

  // Quorum and Chair
  const sharePrice = (data.originalSharePrice || 10000000);
  const totalNominal = totalShares * sharePrice;

  blocks.push(
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.5,
      runs: [
        { text: `Bahwa dari semua saham yang telah dikeluarkan tersebut di atas, yaitu ` },
        { text: `${formatNumber(totalShares)} (${terbilang(totalShares)})`, bold: true },
        { text: ` lembar saham perseroan atau dengan nominal seluruhnya sebesar ` },
        { text: `Rp. ${formatNumber(totalNominal)},- (${terbilang(totalNominal)} rupiah)`, bold: true },
        { text: ` atau ` },
        { text: `${formatNumber(presentPercentage)}%`, bold: true },
        { text: ` telah hadir dalam rapat ini.` }
      ]
    },
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.5,
      runs: [
        { text: `Bahwa menurut ` },
        { text: `Pasal ${data.rupstQuorumArticle || "10"} ayat ${data.rupstQuorumParagraph || "1"} Anggaran Dasar Perseroan`, color: "FF0000" },
        { text: ` mengenai Kuorum, Rapat ini adalah sah sesuai dengan Kuorum dan berhak mengambil keputusan-keputusan yang sah serta mengikat mengenai hal-hal yang dibicarakan;` }
      ]
    }
  );

  const stripSalutation = (name: string) => name.replace(/^(TUAN|NYONYA|NONA|NY|TN|NY\.|TN\.|NYONYA\.|TUAN\.)\s+/i, "").trim();

  let chairNameValue = (data.meetingChair || rep?.name || "RAJANDRAN SHUNMUGAM").trim().toUpperCase();
  let chairSalutation = "Tuan";
  if (chairNameValue) {
    const foundSh = data.shareholders.find(s => stripSalutation((s.name || "").toUpperCase()) === stripSalutation(chairNameValue));
    if (foundSh) {
      if (foundSh.isProxy && foundSh.proxyData) {
        chairSalutation = foundSh.proxyData.salutation || "Tuan";
      } else {
        chairSalutation = foundSh.salutation || "Tuan";
      }
    } else {
      const foundNewMgmt = data.newManagementItems?.find(m => stripSalutation((m.name || "").toUpperCase()) === stripSalutation(chairNameValue));
      if (foundNewMgmt) {
        chairSalutation = foundNewMgmt.salutation || "Tuan";
      } else {
        const foundOldMgmt = data.oldManagementItems?.find(m => stripSalutation((m.name || "").toUpperCase()) === stripSalutation(chairNameValue));
        if (foundOldMgmt) {
          chairSalutation = foundOldMgmt.salutation || "Tuan";
        }
      }
    }
  }

  const chairNameStripped = stripSalutation(chairNameValue);
  const chairSalUpper = `${chairSalutation.toUpperCase()} `;
  // Only strip the salutation if it exactly matches the one found (or if it was already part of the name)
  let chairNameDisplay = chairNameStripped; 

  blocks.push(
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.5,
      runs: [
        { text: `Berdasarkan ketentuan Pasal ${data.rupstAdArticle || "9"} ayat (${data.rupstAdParagraph || "6"}) Anggaran Dasar Perseroan, ${chairSalutation} ` },
        { text: chairNameDisplay, bold: true },
        { text: `, penghadap tersebut di atas, ` },
        { text: "Hadir selaku" },
        { text: ` ${toTitleCase(data.meetingChairPosition || "Kuasa Direktur")} perseroan, bertindak sebagai Ketua Rapat.` }
      ]
    }
  );

  // Agenda list
  blocks.push(
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.5,
      runs: [{ text: "Bahwa dalam acara Rapat telah diputuskan dengan suara bulat, sebagaimana tercantum dalam agenda rapat, yaitu mengenai :" }]
    },
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.9,
      runs: [{ text: `${data.rupstIsAudited ? "Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan mengenai status Perseroan yang Laporan Keuangannya memenuhi ketentuan wajib audit oleh Akuntan Publik;" : "Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan mengenai status Perseroan yang Laporan Keuangannya tidak memenuhi ketentuan wajib audit oleh Akuntan Publik;"}` }]
    },
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.9,
      runs: [{ text: `Persetujuan Laporan Tahunan Perseroan Tahun Buku ${data.rupstFiscalYear || "2025"};` }]
    },
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.9,
      runs: [{ text: `Pengesahan Laporan Keuangan Perseroan Tahun Buku ${data.rupstFiscalYear || "2025"};` }]
    },
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.9,
      runs: [{ text: "Penetapan penggunaan laba bersih Perseroan;" }]
    },
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.9,
      runs: [{ text: "Pemberian pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris." }]
    }
  );

  // 4. Decisions
  blocks.push(
    {
      type: "p",
      runs: [{ text: "Sehubungan dengan apa yang diuraikan di atas, penghadap bertindak dalam kedudukannya sebagaimana tersebut di atas dengan ini menyatakan keputusan acara Rapat yang telah diputuskan dengan suara bulat memutuskan dan menetapkan sebagai berikut:" }]
    }
  );

  // Decision 1
  const reasonsAudit = [];
  if (data.rupstAlasanAuditA !== false) reasonsAudit.push(`Kegiatan Usaha Perseroan ${data.rupstIsAudited ? "" : "tidak "}menghimpun dan/atau mengelola dana masyarakat.`);
  if (data.rupstAlasanAuditB !== false) reasonsAudit.push(`Perseroan ${data.rupstIsAudited ? "" : "tidak "}menerbitkan surat pengakuan utang kepada masyarakat.`);
  if (data.rupstAlasanAuditC !== false) reasonsAudit.push(`Perseroan ${data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Perseroan Terbuka (Tbk).`);
  if (data.rupstAlasanAuditD !== false) reasonsAudit.push(`Perseroan ${data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Persero.`);
  if (data.rupstAlasanAuditE !== false) reasonsAudit.push(`Aset dan/atau jumlah peredaran usaha ${data.rupstIsAudited ? "lebih" : "tidak lebih"} dari 50 Milyar, atau`);
  if (data.rupstAlasanAuditF !== false) reasonsAudit.push(`${data.rupstIsAudited ? "" : "Tidak "}diwajibkan oleh peraturan perundang-undangan.`);

  if (reasonsAudit.length === 0) {
    if (data.rupstIsAudited) {
      reasonsAudit.push("Aset dan/atau jumlah peredaran usaha lebih dari 50 Milyar.");
    } else {
      reasonsAudit.push(
        "Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.",
        "Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.",
        "Perseroan tidak merupakan Perseroan Terbuka (Tbk).",
        "Perseroan tidak merupakan Persero.",
        "Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau",
        "Tidak diwajibkan oleh peraturan perundang-undangan."
      );
    }
  }

  if (reasonsAudit.length === 1) {
    const formattedReason = reasonsAudit[0].replace(", atau", "");
    blocks.push({
      type: "p",
      number: 1,
      runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${formatCompanyName(data.companyName)} yang menyatakan bahwa status perseroan ini merupakan PT. Tertutup yang Laporan Keuangannya ${data.rupstIsAudited ? "Memenuhi" : "Tidak Memenuhi"} Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan ${formattedReason}` }]
    });
  } else {
    blocks.push({
      type: "p",
      number: 1,
      runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${formatCompanyName(data.companyName)} yang menyatakan bahwa status perseroan ini merupakan PT. Tertutup yang Laporan Keuangannya ${data.rupstIsAudited ? "Memenuhi" : "Tidak Memenuhi"} Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:` }]
    });

    reasonsAudit.forEach((reason, idx) => {
      blocks.push({ 
        type: "list", 
        bullet: String.fromCharCode(97 + idx) + ".", 
        indentTabs: 1.5, 
        runs: [{ text: reason }] 
      });
    });
  }

  const kapName = data.rupstKapName || "[NAMA KAP]";
  const kapLicense = data.rupstKapLicenseNumber || "[NOMOR IZIN KAP]";
  const kapExpiryDate = data.rupstKapExpiryDate ? formatDateRupst(data.rupstKapExpiryDate) : "[TANGGAL BERAKHIR IZIN]";
  const auditReportNum = data.rupstAuditReportNumber || "[NOMOR LAPORAN AUDIT]";
  const auditReportDate = data.rupstAuditReportDate ? formatDateRupst(data.rupstAuditReportDate) : "[TANGGAL LAPORAN AUDIT]";

  let decisionIndex = 2;

  if (data.rupstIsAudited) {
    blocks.push({
      type: "p",
      number: decisionIndex,
      runs: [{ text: `Menyetujui Laporan Tahunan Perseroan untuk Tahun Buku ${data.rupstFiscalYear || "2025"} dan Mengesahkan Laporan Keuangan Perseroan untuk Tahun Buku yang berakhir pada tanggal 31 Desember ${data.rupstFiscalYear || "2025"} yang telah diajukan oleh Direksi dan diaudit oleh Kantor Akuntan Publik ${kapName}, yang telah memperoleh izin usaha dari Menteri Keuangan Republik Indonesia dengan Nomor Izin ${kapLicense} yang berlaku sampai dengan tanggal ${kapExpiryDate}, sebagaimana dimuat dalam laporannya Nomor ${auditReportNum} tanggal ${auditReportDate}.` }]
    });

    blocks.push({
      type: "p",
      indentLeft: 426,
      runs: [{ text: "yang terdiri dari:" }]
    });

    const consistOf = [
      "Laporan Keuangan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.",
      "Laporan mengenai Kegiatan Perseroan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.",
      "Laporan Pelaksanaan Tanggung Jawab Sosial dan Lingkungan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.",
      "Rincian Masalah yang timbul selama tahun buku yang mempengaruhi kegiatan usaha perseroan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.",
      "Laporan mengenai tugas pengawasan yang telah dilaksanakan oleh Dewan Komisaris selama tahun buku yang baru lampau, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.",
      "Nama Anggota Direksi dan Anggota Dewan Komisaris, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.",
      "Gaji dan Tunjangan bagi Anggota Direksi dan Gaji atau Honorarium dan Tunjangan bagi Anggota Dewan Komisaris Perseroan untuk Tahun yang baru lampau, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini."
    ];

    consistOf.forEach((item) => {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.0,
        runs: [{ text: item }]
      });
    });
    decisionIndex++;
  } else {
    // Decision 2
    blocks.push({
      type: "p",
      number: decisionIndex,
      runs: [{ text: `Menyetujui dan menerima dengan baik Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${data.rupstFiscalYear || "2025"};` }]
    });
    decisionIndex++;

    // Decision 3
    const signatorySh = data.shareholders.find(s => s.name === data.rupstFinancialReportSignatoryName);
    const signatorySalutation = signatorySh?.salutation || "Tuan";
    let signatoryName = (data.rupstFinancialReportSignatoryName || rep?.name || "RAJANDRAN SHUNMUGAM").toUpperCase();
    const signatoryPosition = data.rupstFinancialReportSignatoryPosition || "Direktur";

    const sigSalUpper = `${signatorySalutation.toUpperCase()} `;
    if (signatoryName.startsWith(sigSalUpper)) {
      signatoryName = signatoryName.substring(sigSalUpper.length);
    }

    const financialRepDate = data.rupstFinancialReportDate ? formatDateRupst(data.rupstFinancialReportDate) : "29 April 2026";

    blocks.push({
      type: "p",
      number: decisionIndex,
      runs: [
        { text: `Mengesahkan Laporan Keuangan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${data.rupstFiscalYear || "2025"}, sebagaimana dimuat dalam Laporan Keuangan ${formatCompanyName(data.companyName)} tertanggal ${financialRepDate}, yang ditandatangani ${signatoryPosition} Perseroan ${signatorySalutation} ` },
        { text: signatoryName, bold: true },
        { text: `${(data.rupstStatementNeraca === true || data.rupstStatementLabaRugi === true || data.rupstStatementPerubahanEkuitas === true || data.rupstStatementArusKas === true || data.rupstStatementCatatan === true || data.rupstStatementNamaAnggota === true || data.rupstStatementGaji === true) ? " yang terdiri dari:" : "."}` }
      ]
    });
    decisionIndex++;

    if (data.rupstStatementNeraca === true) {
      blocks.push({ type: "list", bullet: "-", indentTabs: 1.0, runs: [{ text: "Laporan Keuangan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
    }
    if (data.rupstStatementLabaRugi === true) {
      blocks.push({ type: "list", bullet: "-", indentTabs: 1.0, runs: [{ text: "Laporan mengenai Kegiatan Perseroan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
    }
    if (data.rupstStatementPerubahanEkuitas === true) {
      blocks.push({ type: "list", bullet: "-", indentTabs: 1.0, runs: [{ text: "Laporan Pelaksanaan Tanggung Jawab Sosial dan Lingkungan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
    }
    if (data.rupstStatementArusKas === true) {
      blocks.push({ type: "list", bullet: "-", indentTabs: 1.0, runs: [{ text: "Rincian Masalah yang timbul selama tahun buku yang mempengaruhi kegiatan usaha perseroan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
    }
    if (data.rupstStatementCatatan === true) {
      blocks.push({ type: "list", bullet: "-", indentTabs: 1.0, runs: [{ text: "Laporan mengenai tugas pengawasan yang telah dilaksanakan oleh Dewan Komisaris selama tahun buku yang baru lampau, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
    }
    if (data.rupstStatementNamaAnggota === true) {
      blocks.push({ type: "list", bullet: "-", indentTabs: 1.0, runs: [{ text: "Nama Anggota Direksi dan Anggota Dewan Komisaris, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
    }
    if (data.rupstStatementGaji === true) {
      blocks.push({ type: "list", bullet: "-", indentTabs: 1.0, runs: [{ text: "Gaji dan Tunjangan bagi Anggota Direksi dan Gaji atau Honorarium dan Tunjangan bagi Anggota Dewan Komisaris Perseroan untuk Tahun yang baru lampau, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
    }
  }

  if (data.rupstIsAudited) {
    // === AUDITED PROFIT / LOSS LOGIC (From Notulen) ===
    const isNeg = (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null) && (data.rupstNetProfit < 0);
    const fiscalYear = data.rupstFiscalYear || "2025";
    
    if (!isNeg && data.rupstDividendAmount && data.rupstDividendAmount > 0) {
      const divBlocks = buildDividendBlocks(`${decisionIndex}.`, data, fiscalYear);
      // Convert list items from Notulen format to Akta list formats
      const aktaDivBlocks: Block[] = divBlocks.map(b => {
        if (b.type === "list") {
          // The main number (e.g. 4. or 6.) should become a paragraph numbered decision in Akta
          if (/^\d+\.$/.test(b.bullet)) {
             return {
               type: "p",
               number: parseInt((b.bullet || "0").replace(".", "")),
               runs: b.runs
             } as Block;
          }
          // The children bullets (a., b., -, •) can stay a list but ensure indentTabs matches
          if (b.runs.length > 0 && b.runs[0].text.includes("Memberikan persetujuan dan pengesahan atas tindakan Direksi")) {
             return {
               type: "p",
               indentLeft: 426,
               runs: b.runs
             } as Block;
          }

          let newIndent = b.indentTabs || 1.0;
          if (/^[a-z]\.$/i.test(b.bullet)) {
             newIndent = 1.0; // a., b.
          } else if (b.bullet === "•") {
             newIndent = 2.0; // • inside a.
             b.bullet = "-"; // Word might prefer dash for Akta RUPST
          } else if (b.bullet === "") {
             b.bullet = "-";  // Convert the "Memberikan persetujuan..." into a dash bullet
             newIndent = 1.0; // Same indent level as a. and b. as per screenshot
          }

          return {
            type: "list",
            bullet: b.bullet,
            indentTabs: newIndent,
            runs: b.runs
          } as Block;
        }
        return b as Block;
      });
      blocks.push(...aktaDivBlocks);
      decisionIndex++;
    } else {
      let netProfitText = "";
      if (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null) {
        const absVal = Math.abs(data.rupstNetProfit);
        const amtStr = `Rp. ${formatNumber(absVal)},- (${terbilang(absVal)} rupiah)`;
        if (isNeg) {
          netProfitText = `Menetapkan Perseroan mengalami rugi bersih untuk tahun buku ${fiscalYear} sebesar ${amtStr}, dan oleh karenanya memutuskan bahwa tidak terdapat laba bersih yang dapat dibagikan sebagai dividen kepada para pemegang saham untuk Tahun Buku ${fiscalYear}. Seluruh saldo rugi tersebut akan dicatat sebagai akumulasi rugi Perseroan sesuai ketentuan peraturan perundang-undangan yang berlaku.`;
        } else {
          const netProfit = data.rupstNetProfit || 0;
          const previousRetained = data.rupstRetainedProfit || 0;
          const divAmt = data.rupstDividendAmount || 0;
          const totalLabaDitahan = netProfit + previousRetained - divAmt;
          netProfitText = `Menetapkan penggunaan laba bersih sebesar ${amtStr}, dimana sebesar Rp. ${formatNumber(divAmt)},- (${terbilang(divAmt)} rupiah) dibagikan sebagai dividen dan sisanya setelah ditambah saldo laba ditahan tahun sebelumnya sebesar Rp. ${formatNumber(previousRetained)},- (${terbilang(previousRetained)} rupiah) menjadi sebesar Rp. ${formatNumber(totalLabaDitahan)},- (${terbilang(totalLabaDitahan)} rupiah) ditetapkan sebagai saldo laba ditahan Perseroan.`;
        }
      } else {
        netProfitText = "Menetapkan penggunaan laba bersih Perseroan sebagaimana diusulkan dalam Rapat.";
      }

      blocks.push({
        type: "p",
        number: decisionIndex,
        runs: [{ text: netProfitText }]
      });
      decisionIndex++;
    }

    blocks.push({
      type: "p",
      number: decisionIndex,
      runs: [{ text: `Memberikan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada para anggota Direksi dan Dewan Komisaris atas tindakan pengurusan dan pengawasan yang telah mereka lakukan selama tahun buku tersebut, sepanjang tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan.` }]
    });
    decisionIndex++;

    let auditText = `Menyatakan bahwa Laporan Keuangan Perseroan untuk tahun buku tersebut telah diaudit oleh Akuntan Publik ${kapName}, yang telah memperoleh izin usaha dari Menteri Keuangan Republik Indonesia dengan Nomor Izin ${kapLicense} yang berlaku sampai dengan tanggal ${kapExpiryDate}.`;

    blocks.push({
      type: "p",
      number: decisionIndex,
      runs: [{ text: auditText }]
    });
    decisionIndex++;

  } else {
    // === NON-AUDITED PROFIT / LOSS LOGIC (Original Akta) ===
    const netProfitColor = (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null) ? undefined : "FF0000";
    const dividendColor = (data.rupstDividendAmount !== undefined && data.rupstDividendAmount !== null) ? undefined : "FF0000";
  
    if (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null && data.rupstNetProfit < 0) {
      const absNetProfit = Math.abs(data.rupstNetProfit);
      const netProfitDisplayPositive = `Rp. ${formatNumber(absNetProfit)},- (${terbilang(absNetProfit)} rupiah)`;
  
      blocks.push({
        type: "p",
        number: decisionIndex,
        runs: [
          { text: `Menetapkan Perseroan mengalami rugi bersih untuk tahun buku ${data.rupstFiscalYear || "2025"} sebesar ` },
          { text: netProfitDisplayPositive, color: netProfitColor },
          { text: `, dan oleh karenanya memutuskan bahwa tidak terdapat laba bersih yang dapat dibagikan sebagai dividen kepada para pemegang saham untuk Tahun Buku ${data.rupstFiscalYear || "2025"}. Seluruh saldo rugi tersebut akan dicatat sebagai akumulasi rugi Perseroan sesuai ketentuan peraturan perundang-undangan yang berlaku.` }
        ]
      });
      decisionIndex++;
    } else {
      const netProfit = data.rupstNetProfit || 0;
      const previousRetained = data.rupstRetainedProfit || 0;
      const divAmt = data.rupstDividendAmount || 0;
      const totalLabaDitahan = netProfit + previousRetained - divAmt;
  
      const amtStr = `Rp. ${formatNumber(netProfit)},- (${terbilang(netProfit)} rupiah)`;
      const divAmtStr = `Rp. ${formatNumber(divAmt)},- (${terbilang(divAmt)} rupiah)`;
      const previousRetainedStr = `Rp. ${formatNumber(previousRetained)},- (${terbilang(previousRetained)} rupiah)`;
      const totalLabaDitahanStr = `Rp. ${formatNumber(Math.abs(totalLabaDitahan))},- (${terbilang(Math.abs(totalLabaDitahan))} rupiah)`;
  
      const fiscalYear = data.rupstFiscalYear || "2025";
      const prevYear = String(Number(fiscalYear) - 1);
  
      blocks.push({
        type: "p",
        number: decisionIndex,
        runs: [
          { text: `Menetapkan Perseroan mengalami laba bersih untuk tahun buku ${fiscalYear} sebesar ` },
          { text: amtStr, color: netProfitColor },
          { text: `, dengan saldo laba ditahan Perseroan sampai dengan tahun buku ${prevYear} sebesar ` },
          { text: previousRetainedStr },
          { text: `. sehubungan dengan hal tersebut:` }
        ]
      });
      decisionIndex++;
  
      if (divAmt > 0) {
        blocks.push(
          {
            type: "list",
            bullet: "-",
            indentTabs: 1.0,
            runs: [
              { text: "Sebesar " },
              { text: divAmtStr, color: dividendColor },
              { text: " dibagikan sebagai dividen kepada para pemegang saham;" }
            ]
          },
          {
            type: "list",
            bullet: "-",
            indentTabs: 1.0,
            runs: [
              { text: "Laba bersih tahun berjalan sebesar " },
              { text: amtStr, color: netProfitColor },
              { text: " ditambah saldo laba ditahan tahun sebelumnya sebesar " },
              { text: previousRetainedStr },
              { text: " setelah dikurangi dividen, maka total saldo laba ditahan Perseroan menjadi sebesar " },
              { text: totalLabaDitahanStr },
              { text: " ditetapkan sebagai saldo laba ditahan Perseroan." }
            ]
          }
        );
      } else {
        blocks.push(
          {
            type: "list",
            bullet: "-",
            indentTabs: 1.0,
            runs: [{ text: "Perseroan tidak membagikan dividen kepada para pemegang saham;" }]
          },
          ...(
            !data.rupstIsAudited && (netProfit === 0 || netProfit === undefined)
              ? []
              : [
                  {
                    type: "list" as const,
                    bullet: "-",
                    indentTabs: 1.0,
                    runs: [{ text: "Seluruh laba bersih Perseroan dibukukan sebagai laba ditahan Perseroan." }]
                  }
                ]
          )
        );
      }
    }
  
    // Decision 5 (Non-Audited)
    blocks.push({
      type: "p",
      number: decisionIndex,
      runs: [{ text: `Memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris Perseroan atas tindakan pengurusan dan pengawasan yang telah dijalankan selama tahun buku ${data.rupstFiscalYear || "2025"}, sejauh tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan Perseroan.` }]
    });
    decisionIndex++;
  }

  // Closure Section
  const endStTime = data.rupstMeetingEndTime;
  const meetingEndHourNum = endStTime ? endStTime.replace(":", ".") : "00.00";
  const endParts = (endStTime || "00:00").split(":");
  const eh = parseInt(endParts[0]);
  const em = parseInt(endParts[1]);
  const meetingEndHourWords = `${terbilang(eh)} lewat ${em === 0 ? "nol-nol" : terbilang(em)} menit Waktu Indonesia Barat`;
  const isEndDefault = !endStTime;

  blocks.push(
    {
      type: "p",
      runs: [
        { text: "Rapat ditutup pada pukul " },
        { text: `${meetingEndHourNum} WIB`, highlight: isEndDefault ? "yellow" : undefined },
        { text: " oleh Ketua Rapat, Setelah semua agenda rapat dibahas dan menghasilkan Keputusan sebagaimana telah diputuskan peserta rapat yang hadir." }
      ]
    },
    {
      type: "p",
      runs: [{ text: "Dari segala sesuatu yang diuraikan tersebut di atas, maka saya, Notaris Membuat Akta Pernyataan Keputusan Rapat ini untuk dapat dipergunakan Sebagaimana mestinya." }]
    },
    { type: "divider", text: "DEMIKIANLAH AKTA INI" },
    {
      type: "p",
      runs: [{ text: "Dibuat sebagai minuta dan dilangsungkan di Kabupaten Bandung Barat, pada hari dan tanggal serta jam sebagaimana disebutkan pada kepala akta ini dengan dihadiri oleh :" }]
    }
  );

  // Witness 1
  const s1Nama = data.saksi1Nama || "Nendi Suhendi";
  const overrideS1Alamat = (data.saksi1Alamat || "Jalan Sukaresmi Nomor 17, RT. 005 RW. 005, Kecamatan Lembang, Desa Mekarwangi").replace(/Sukaresmi Nomor 12/gi, "Sukaresmi Nomor 17");
  const s1DetailRaw = data.saksi1Nama && data.saksi1Lahir && data.saksi1Alamat && data.saksi1NIK
    ? `, lahir di ${toTitleCase(data.saksi1Lahir)}, Warga Negara Indonesia, bertempat tinggal di ${formatAddress(toTitleCase(overrideS1Alamat))}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi1NIK}`
    : ", lahir di Bandung, Pada Tanggal Limabelas Juli Seribu Sembilan Ratus Sembilan Puluh Satu (15-07-1991), Warga Negara Indonesia, bertempat tinggal di Jalan Sukaresmi Nomor 17, RT. 005 RW. 005, Kecamatan Lembang, Desa Mekarwangi, pemegang Kartu Tanda Penduduk Nomor 3217011507910016";
  const s1Detail = expandAbbreviations(s1DetailRaw);

  blocks.push({
    type: "saksi",
    number: 1,
    runs: [
      { text: s1Nama, bold: true },
      { text: s1Detail + ";" }
    ]
  });

  // Witness 2
  const s2Nama = data.saksi2Nama || "Siti Nur Azizah";
  const s2DetailRaw = data.saksi2Nama && data.saksi2Lahir && data.saksi2Alamat && data.saksi2NIK
    ? `, lahir di ${toTitleCase(data.saksi2Lahir)}, Warga Negara Indonesia, bertempat tinggal di ${formatAddress(toTitleCase(data.saksi2Alamat))}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi2NIK}`
    : ", lahir di Bandung, Pada Tanggal Tujuh Belas Desember Seribu Sembilan Ratus Sembilan Puluh Sembilan (17-12-1999), Warga Negara Indonesia, bertempat tinggal di Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh RT. 001 RW. 004, Desa Ciburial, Kecamatan Cimenyan, pemegang Kartu Tanda Penduduk Nomor 3204065712990001";
  const s2Detail = expandAbbreviations(s2DetailRaw);

  blocks.push({
    type: "saksi",
    number: 2,
    runs: [
      { text: s2Nama, bold: true },
      { text: s2Detail + "." }
    ]
  });

  const notaryDomicileStr = data.notaryDomicile || "Kabupaten Bandung Barat";

  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 1.0,
    runs: [{ text: `Untuk sementara berada di ${toTitleCase(notaryDomicileStr)};` }]
  });

  blocks.push(
    {
      type: "p",
      runs: [{ text: "Keduanya pegawai Kantor Notaris, sebagai saksi-saksi." }]
    },
    {
      type: "p",
      runs: [{ text: "Segera setelah akta ini dibacakan oleh saya, Notaris kepada penghadap dan saksi-saksi, maka ditanda-tanganilah akta ini oleh penghadap, saksi-saksi dan saya, Notaris. Serta penghadap membubuhkan sidik jari sebelah kanan pada lembaran tersendiri di hadapan saya, Notaris dan saksi-saksi, yang dilekatkan pada minuta akta ini." }]
    },
    {
      type: "p",
      runs: [{ text: "Dilangsungkan dengan tanpa perubahan." }]
    },
    {
      type: "p",
      indentLeft: 426,
      runs: [{ text: "Minuta Akta ini telah ditanda-tangani dengan sempurna." }]
    },
    {
      type: "p",
      indentLeft: 993,
      runs: [{ text: "Diberikan sebagai salinan yang sama bunyinya." }]
    }
  );

  return blocks;
};