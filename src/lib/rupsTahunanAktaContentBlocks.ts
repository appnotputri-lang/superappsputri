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
  formatAktaDate,
  cleanDegrees,
} from "./formatter";

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

  const effectiveNotaryDate = data.draftAktaRupsDate || data.notaryDate || data.signingDate || "";
  const effectiveNotaryNumber = data.draftAktaRupsNumber || data.notaryNumber || "...";
  
  const tglAktaHari = getDayName(effectiveNotaryDate) || "Jum'at";
  const tglAktaRupst = formatDateRupst(effectiveNotaryDate) || "08 Mei 2026";
  const tglAktaHuruf = dateToWords(effectiveNotaryDate);
  const tglAktaAngka = formatDateStr(effectiveNotaryDate);

  const jamStr = data.meetingStartTime ? data.meetingStartTime.replace(":", ".") : "11.00";
  const jamParts = (data.meetingStartTime || "11:00").split(":");
  const h = parseInt(jamParts[0]);
  const m = parseInt(jamParts[1]);
  const jamHuruf = `${terbilang(h)} lewat ${m === 0 ? "nol-nol" : terbilang(m)} menit Waktu Indonesia Barat`;

  // Meeting Dates
  const tglRapatHari = getDayName(data.signingDate || "") || "Rabu";
  const tglRapatRupst = formatDateRupst(data.signingDate || "") || "06 Mei 2026";

  const jamRapatStr = data.meetingStartTime ? data.meetingStartTime.replace(":", ".") : "13.00";
  const jamRapatParts = (data.meetingStartTime || "13:00").split(":");
  const hr = parseInt(jamRapatParts[0]);
  const mr = parseInt(jamRapatParts[1]);
  const jamRapatHuruf = `${terbilang(hr)} lewat ${mr === 0 ? "nol-nol" : terbilang(mr)} menit Waktu Indonesia Barat`;

  // Total shares and attending shares
  const totalShares = data.shareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0) || 1010;
  const attendingShareholders = data.shareholders.filter(s => s.isPresent) || [];
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
    const expandedName = expandAbbreviations(rawName);
    const nameUpper = expandedName.toUpperCase();
    const isPenghadap = rep && nameUpper === (rep.name || "").toUpperCase().trim();
    const isBadanHukum = person?.shareholderType === 'BADAN_HUKUM' || person?.legalEntityType;

    if (fullyDescribedNames.has(nameUpper) && nameUpper !== "") {
      return [
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
    { type: "p", runs: [{ text: `Pada hari ini, ${tglAktaHari}, tanggal ${formatAktaDate(effectiveNotaryDate)}.` }] },
    { type: "p", runs: [{ text: `Pukul ${jamStr} WIB (${jamHuruf}).` }] },
    {
      type: "p",
      runs: [
        { text: `Berhadapan dengan saya, ` },
        { text: toTitleCase(data.notaryName || "Nukantini Putri Parincha, Sarjana Hukum, Magister Kenotariatan"), bold: true },
        { text: `, Notaris di ` },
        { text: toTitleCase(data.notaryDomicile || "Kabupaten Bandung Barat"), bold: true },
        { text: `, dengan dihadiri oleh saksi-saksi yang saya, Notaris kenal and akan disebutkan nama-namanya pada bagian akhir akta ini :` },
      ],
    }
  );

  // 2. Representative (The person reporting the BAR RUPST)
  if (rep) {
    blocks.push({
      type: "p",
      runs: [
        { text: `${rep.salutation || "Tuan"} ` },
        ...getPersonDetailRuns(rep),
        { text: ";" }
      ]
    });

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
      return `telah mendapat pengesahan berdasarkan Surat Keputusan Nomor ${deed.skNumber} tanggal ${formatAktaDate(deed.skDate)}`;
    }
  };

  let foundationSentence = `Bahwa pada hari ${tglRapatHari}, tanggal ${formatAktaDate(data.signingDate || "")}, bertempat di ${data.signingPlace || "Kantor Perseroan"}, pukul ${jamRapatStr} WIB (${jamRapatHuruf}) telah diadakan Rapat Umum Pemegang Saham Tahunan Perseroan Terbatas ${formatCompanyName(data.companyName)} (selanjutnya disebut sebagai “Rapat”) Perseroan berkedudukan di ${toTitleCase(data.domicile || "...")}, demikian berdasarkan Akta Pendirian tertanggal ${establishmentDeedDateText}, Nomor ${data.establishmentDeedNumber || "02"} dibuat dihadapan ${checkNotaryWording(data.establishmentNotary || "............................", data.establishmentNotaryTitle, data.establishmentNotaryDomicile)} dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${getSkFormattedNumber()} tertanggal ${formatAktaDate(data.establishmentSkDate || "")}`;

  if (!hasAmendments) {
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.3,
      runs: [{ text: `${foundationSentence};` }]
    });
  } else if (isSingleAmendment) {
    const deed = data.amendmentDeeds![0];
    const skText = getDeedSkText(deed);
    const amendmentSentence = ` dan telah mengalami perubahan berdasarkan Akta Perubahan tertanggal ${formatAktaDate(deed.date)} Nomor ${deed.number} yang dibuat di hadapan ${checkNotaryWording(deed.notary, deed.notaryTitle, deed.notaryDomicile)} yang ${skText};`;
    
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.3,
      runs: [{ text: `${foundationSentence}${amendmentSentence}` }]
    });
  } else {
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.3,
      runs: [{ text: `${foundationSentence} dan telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut : -` }]
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
            text: `Akta Perubahan tertanggal ${formatAktaDate(deed.date)} Nomor ${deed.number} yang dibuat di hadapan ${checkNotaryWording(deed.notary, deed.notaryTitle, deed.notaryDomicile)} yang ${skText}${isLast ? ";" : ";"}`,
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
      if (sh.shareholderType === 'BADAN_HUKUM') {
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

  attendees.forEach((att, idx) => {
    const isRep = (att.name || "").toUpperCase().trim() === (rep.name || "").toUpperCase().trim();
    const runsList: FormatToken[] = [{ text: att.salutation ? `${att.salutation} ` : "" }];

    if (isRep) {
      runsList.push(
        { text: (att.name || "").toUpperCase(), bold: true },
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

  const chairNameValue = (data.meetingChair || rep?.name || "RAJANDRAN SHUNMUGAM").trim().toUpperCase();
  let chairSalutation = "Tuan";
  if (chairNameValue) {
    const foundSh = data.shareholders.find(s => (s.name || "").trim().toUpperCase() === chairNameValue);
    if (foundSh) {
      if (foundSh.isProxy && foundSh.proxyData) {
        chairSalutation = foundSh.proxyData.salutation || "Tuan";
      } else {
        chairSalutation = foundSh.salutation || "Tuan";
      }
    } else {
      const foundNewMgmt = data.newManagementItems?.find(m => (m.name || "").trim().toUpperCase() === chairNameValue);
      if (foundNewMgmt) {
        chairSalutation = foundNewMgmt.salutation || "Tuan";
      } else {
        const foundOldMgmt = data.oldManagementItems?.find(m => (m.name || "").trim().toUpperCase() === chairNameValue);
        if (foundOldMgmt) {
          chairSalutation = foundOldMgmt.salutation || "Tuan";
        }
      }
    }
  }

  blocks.push(
    {
      type: "list",
      bullet: "-",
      indentTabs: 0.5,
      runs: [
        { text: `Berdasarkan ketentuan Pasal ${data.rupstAdArticle || "9"} ayat (${data.rupstAdParagraph || "6"}) Anggaran Dasar Perseroan, ${chairSalutation} ` },
        { text: chairNameValue, bold: true },
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
  blocks.push({
    type: "p",
    number: 1,
    runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${formatCompanyName(data.companyName)} yang menyatakan bahwa status perseroan ini merupakan PT. Tertutup yang Laporan Keuangannya ${data.rupstIsAudited ? "Memenuhi" : "Tidak Memenuhi"} Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:` }]
  });

  if (data.rupstAlasanAuditA !== false) {
    blocks.push({ 
      type: "list", 
      bullet: "a.", 
      indentTabs: 1.5, 
      runs: [{ text: `Kegiatan Usaha Perseroan ${data.rupstIsAudited ? "" : "tidak "}menghimpun dan/atau mengelola dana masyarakat.` }] 
    });
  }
  if (data.rupstAlasanAuditB !== false) {
    blocks.push({ 
      type: "list", 
      bullet: "a.", 
      indentTabs: 1.5, 
      runs: [{ text: `Perseroan ${data.rupstIsAudited ? "" : "tidak "}menerbitkan surat pengakuan utang kepada masyarakat.` }] 
    });
  }
  if (data.rupstAlasanAuditC !== false) {
    blocks.push({ 
      type: "list", 
      bullet: "a.", 
      indentTabs: 1.5, 
      runs: [{ text: `Perseroan ${data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Perseroan Terbuka (Tbk).` }] 
    });
  }
  if (data.rupstAlasanAuditD !== false) {
    blocks.push({ 
      type: "list", 
      bullet: "a.", 
      indentTabs: 1.5, 
      runs: [{ text: `Perseroan ${data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Persero.` }] 
    });
  }
  if (data.rupstAlasanAuditE !== false) {
    blocks.push({ 
      type: "list", 
      bullet: "a.", 
      indentTabs: 1.5, 
      runs: [{ text: `Aset dan/atau jumlah peredaran usaha ${data.rupstIsAudited ? "lebih" : "tidak lebih"} dari 50 Milyar, atau` }] 
    });
  }
  if (data.rupstAlasanAuditF !== false) {
    blocks.push({ 
      type: "list", 
      bullet: "a.", 
      indentTabs: 1.5, 
      runs: [{ text: `${data.rupstIsAudited ? "" : "Tidak "}diwajibkan oleh peraturan perundang-undangan.` }] 
    });
  }

  if (!data.rupstIsAudited) {
    blocks.push({
      type: "list",
      bullet: "",
      indentTabs: 1.0,
      runs: [{ text: "Direksi dan Komisaris serta Para Pemegang Saham Perseroan menyatakan bertanggung jawab penuh atas Kebenaran Informasi dan Tanda Tangan pada seluruh Lampiran Laporan terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini." }]
    });
  }

  // Decision 2
  blocks.push({
    type: "p",
    number: 2,
    runs: [{ text: `Menyetujui dan menerima dengan baik Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${data.rupstFiscalYear || "2025"};` }]
  });

  // Decision 3
  const signatorySh = data.shareholders.find(s => s.name === data.rupstFinancialReportSignatoryName);
  const signatorySalutation = signatorySh?.salutation || "Tuan";
  const signatoryName = data.rupstFinancialReportSignatoryName || rep?.name || "RAJANDRAN SHUNMUGAM";
  const signatoryPosition = data.rupstFinancialReportSignatoryPosition || "Direktur";

  const financialRepDate = data.rupstFinancialReportDate ? formatDateRupst(data.rupstFinancialReportDate) : "29 April 2026";

  blocks.push({
    type: "p",
    number: 3,
    runs: [
      { text: `Mengesahkan Laporan Keuangan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${data.rupstFiscalYear || "2025"}, sebagaimana dimuat dalam Laporan Keuangan ${formatCompanyName(data.companyName)} tertanggal ${financialRepDate}, yang ditandatangani ${signatoryPosition} Perseroan ${signatorySalutation} ` },
      { text: signatoryName.toUpperCase(), bold: true },
      { text: `${(data.rupstStatementNeraca === true || data.rupstStatementLabaRugi === true || data.rupstStatementPerubahanEkuitas === true || data.rupstStatementArusKas === true || data.rupstStatementCatatan === true || data.rupstStatementNamaAnggota === true || data.rupstStatementGaji === true) ? " yang terdiri dari:" : "."}` }
    ]
  });

  if (data.rupstStatementNeraca === true) {
    if (data.rupstIsAudited && data.rupstKapName) {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.0,
        runs: [
          { text: `Laporan Keuangan yang telah diaudit oleh Kantor Akuntan Publik ` },
          { text: data.rupstKapName.toUpperCase(), bold: true },
          { text: ` No. Izin KAP: ${data.rupstKapLicenseNumber || "-"} yang berlaku sampai dengan tanggal ${data.rupstKapExpiryDate ? formatAktaDate(data.rupstKapExpiryDate) : "-"}, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini.` }
        ]
      });
    } else {
      blocks.push({ type: "list", bullet: "-", indentTabs: 1.0, runs: [{ text: "Laporan Keuangan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
    }
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

  // Moved following red block to the end of the sub-agenda list
  if (data.rupstStatementNeraca === true || data.rupstStatementLabaRugi === true || data.rupstStatementPerubahanEkuitas === true || data.rupstStatementArusKas === true || data.rupstStatementCatatan === true || data.rupstStatementNamaAnggota === true || data.rupstStatementGaji === true) {
    blocks.push({
      type: "list",
      bullet: "",
      indentTabs: 1.0,
      runs: [{ 
        text: "Direksi dan Komisaris serta Para Pemegang Saham Perseroan menyatakan bertanggung jawab penuh atas Kebenaran Informasi dan Tanda Tangan pada seluruh Lampiran Laporan terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.",
        color: "FF0000"
      }]
    });
  }

  // Decision 4 - Net profit/dividend distribution
  const netProfitColor = (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null) ? undefined : "FF0000";
  let netProfitDisplay = "[ISI DENGAN NILAI LABA BERSIH DI NOTULEN RUPS TAHUNAN]";
  if (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null) {
    const isNeg = data.rupstNetProfit < 0;
    const absVal = Math.abs(data.rupstNetProfit);
    netProfitDisplay = `${isNeg ? "- Rp " : "Rp "}${formatNumber(absVal)} (${terbilang(data.rupstNetProfit)} rupiah)`;
  }

  const dividendColor = (data.rupstDividendAmount !== undefined && data.rupstDividendAmount !== null) ? undefined : "FF0000";
  let dividendDisplayValue = "[ISI DENGAN NILAI DEVIDEN DIBAGIKAN]";
  if (data.rupstDividendAmount !== undefined && data.rupstDividendAmount !== null) {
    const isNeg = data.rupstDividendAmount < 0;
    const absVal = Math.abs(data.rupstDividendAmount);
    dividendDisplayValue = `${isNeg ? "- Rp " : "Rp "}${formatNumber(absVal)} (${terbilang(data.rupstDividendAmount)} rupiah)`;
  }

  if (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null && data.rupstNetProfit < 0) {
    const absNetProfit = Math.abs(data.rupstNetProfit);
    const netProfitDisplayPositive = `Rp ${formatNumber(absNetProfit)} (${terbilang(absNetProfit)} rupiah)`;

    blocks.push({
      type: "p",
      number: 4,
      runs: [
        { text: `Menetapkan Perseroan mengalami rugi bersih untuk tahun buku ${data.rupstFiscalYear || "2025"} sebesar ` },
        { text: netProfitDisplayPositive, color: netProfitColor },
        { text: `, dan oleh karenanya memutuskan bahwa tidak terdapat laba bersih yang dapat dibagikan sebagai dividen kepada para pemegang saham untuk Tahun Buku ${data.rupstFiscalYear || "2025"}. Seluruh saldo rugi tersebut akan dicatat sebagai akumulasi rugi Perseroan sesuai ketentuan peraturan perundang-undangan yang berlaku.` }
      ]
    });
  } else {
    blocks.push({
      type: "p",
      number: 4,
      runs: [
        { text: `Menetapkan penggunaan laba bersih Perseroan tahun buku ${data.rupstFiscalYear || "2025"} sebesar ` },
        { text: netProfitDisplay, color: netProfitColor },
        { text: `, dengan rincian sebagai berikut:` }
      ]
    });

    blocks.push(
      {
        type: "list",
        bullet: "-",
        indentTabs: 1.0,
        runs: [
          { text: "Sebesar " },
          { text: dividendDisplayValue, color: dividendColor },
          { text: " dibagikan sebagai dividen kepada para pemegang saham;" }
        ]
      },
      {
        type: "list",
        bullet: "-",
        indentTabs: 1.0,
        runs: [{ text: "Sisanya dicatat sebagai laba ditahan Perseroan untuk mendukung kegiatan usaha Perseroan." }]
      }
    );
  }

  // Decision 5
  blocks.push({
    type: "p",
    number: 5,
    runs: [{ text: `Memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris Perseroan atas tindakan pengurusan dan pengawasan yang telah dijalankan selama tahun buku ${data.rupstFiscalYear || "2025"}, sejauh tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan Perseroan.` }]
  });

  // Closure Section
  const meetingEndHourNum = data.rupstMeetingEndTime ? data.rupstMeetingEndTime.replace(":", ".") : "14.00";
  const endParts = (data.rupstMeetingEndTime || "14:00").split(":");
  const eh = parseInt(endParts[0]);
  const em = parseInt(endParts[1]);
  const meetingEndHourWords = `${terbilang(eh)} lewat ${em === 0 ? "nol-nol" : terbilang(em)} menit Waktu Indonesia Barat`;

  blocks.push(
    {
      type: "p",
      runs: [{ text: `Rapat ditutup pada pukul ${meetingEndHourNum} WIB (${meetingEndHourWords}) oleh Ketua Rapat, Setelah semua agenda rapat dibahas dan menghasilkan Keputusan sebagaimana telah diputuskan peserta rapat yang hadir.` }]
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