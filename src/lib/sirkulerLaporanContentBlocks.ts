import { CompanyData } from "../../types";
import { buildAmendmentDeedBlocks } from "./sections/history/amendmentDeeds";
import { addPersonIdentificationBlocks } from "./sections/personIdentification";
import {
  formatNumber,
  toTitleCase,
  formatPersonDetails,
  formatDateStr,
  checkIsBadanHukum,
  getDayName,
  dateToWords,
  formatDateRupst,
  terbilang,
  formatCompanyName,
  formatCompanyEstablishment,
  formatCompanyEstablishmentOnly,
  formatAmendmentDeedSingle,
} from "./formatter";
import { INDENT } from "./docx-renderer/constants/indent";

// Helper for formatting blocks for DOCX
export type Block =
  | { type: "p"; runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]; align?: "center" | "right-center" | "justified"; indentLeft?: number; indentHanging?: number; spaceAfter?: boolean }
  | { type: "list"; bullet: string; runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]; indentLeft: number; indentHanging: number; ref?: string }
  | { type: "numbered"; num: string | number; runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]; indentLeft: number; indentHanging: number; ref?: string }
  | { type: "br" }
  | { type: "pageBreak" }
  | { type: "signatures"; shareholders: { id: string; name: string }[] };

function getDeedSkText(deed: any): string {
  if (deed.skSpDocuments && deed.skSpDocuments.length > 0) {
    const sks = deed.skSpDocuments.filter((d: any) => d.type === "SK");
    const sps = deed.skSpDocuments.filter((d: any) => d.type !== "SK");

    const skParts: string[] = [];
    sks.forEach((sk: any) => {
      skParts.push(
        `telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${formatDateRupst(sk.date)}, Nomor ${sk.number}`
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
        spDateText = ` tertanggal ${formatDateRupst(spDates[0] as string)}`;
      } else {
        spDateText = ` masing-masing tertanggal sebagaimana tercantum dalam surat tersebut`;
      }

      spParts.push(
        `Pemberitahuannya telah diterima dan dicatat dalam Sistem Administrasi Badan Hukum Kementerian Hukum Republik Indonesia berdasarkan ${spDescParts.join(" dan ")}${spDateText}`
      );
    }

    return [...skParts, ...spParts].join(" dan ");
  } else {
    if (!deed.skNumber) return "";
    return `telah mendapat pengesahan berdasarkan Surat Keputusan Nomor ${deed.skNumber} tanggal ${formatDateRupst(deed.skDate)}`;
  }
}

export function generateSirkulerLaporanBlocks(data: CompanyData): Block[] {
  const blocks: Block[] = [];

  const companyNameText = data.companyName || "";
  const finalCompanyName = formatCompanyName(companyNameText) || "PT ............................";
  const rawDomicile = data.domicile || "";
  const isCityOrRegency = rawDomicile.toLowerCase().startsWith("kota") || rawDomicile.toLowerCase().startsWith("kabupaten");
  const domicile = rawDomicile
    ? (isCityOrRegency ? toTitleCase(rawDomicile) : `Kota ${toTitleCase(rawDomicile)}`)
    : "Kota ............................";

  const presentShareholders = data.shareholders.filter(s => s.isPresent);
  const shareholders = presentShareholders.length > 0 ? presentShareholders : (data.finalShareholders && data.finalShareholders.length > 0 ? data.finalShareholders : data.shareholders);

  const fiscalYear = data.rupstFiscalYear || data.fiscalYear || "2025";
  const resolvedHari = data.slHari || (data.signingDate ? getDayName(data.signingDate) : "..............");
  const resolvedTanggalHuruf = data.slTanggalHuruf || (data.signingDate ? dateToWords(data.signingDate) : "............................");
  const calculatedTotalShares = (shareholders || []).reduce((sum, sh) => sum + (sh.sharesOwned || 0), 0);
  const resolvedTotalShares = data.originalTotalShares || data.totalShares || calculatedTotalShares;
  const resolvedTotalRp = resolvedTotalShares * (data.originalSharePrice || 100000);

  const getSalutationPrefix = (name: string): string => {
    const cleanName = name.trim().toUpperCase();
    const found = [
      ...(data.shareholders || []),
      ...(data.finalShareholders || [])
    ].find(s => s.name.trim().toUpperCase() === cleanName);
    
    if (found && found.salutation) {
      const s = found.salutation;
      if (s === 'Tuan') return 'Tuan ';
      if (s === 'Nyonya') return 'Nyonya ';
      if (s === 'Nona') return 'Nyonya '; 
      if (s === 'Sdr') return 'Tuan ';
      if (s === 'Sdri') return 'Nyonya ';
      return '';
    }
    return '';
  };

  const formatPercentageIndo = (pct: number): string => {
    return pct.toFixed(4).replace(/\.?0+$/, '').replace('.', ',');
  };

  const terbilangPersen = (pct: number): string => {
    const pctStr = pct.toFixed(2).replace(/\.?0+$/, '');
    if (!pctStr.includes('.')) {
      return `${terbilang(pct)} persen`;
    }
    const parts = pctStr.split('.');
    const integerPart = parseInt(parts[0], 10);
    const decimalStr = parts[1];
    const digitWords = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"];
    const decimalWords = decimalStr.split('').map(d => digitWords[parseInt(d, 10)]).join(' ');
    return `${terbilang(integerPart)} koma ${decimalWords} persen`;
  };

  // Title
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "KEPUTUSAN PARA PEMEGANG SAHAM", bold: true }] },
    { type: "p", align: "center", runs: [{ text: finalCompanyName, bold: true }] },
    { type: "br" }
  );

  const companyEstStr = formatCompanyEstablishmentOnly(data, false, true);
  const hasAmendments = data.amendmentDeeds && data.amendmentDeeds.length > 0;

  blocks.push(
    {
      type: "p", runs: [
        { text: "Kami yang bertandatangan dibawah ini, para Pemegang Saham " },
        { text: finalCompanyName },
        { text: `, berkedudukan di ${domicile}${companyEstStr}${
          hasAmendments
            ? ", dan telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut :"
            : ""
        }` }
      ]
    }
  );

  if (hasAmendments) {
    data.amendmentDeeds!.forEach((deed) => {
      blocks.push({
        type: "list",
        bullet: "-",
        ref: "sirkuler-amendment",
        indentLeft: INDENT.AMENDMENT_LIST,
        indentHanging: INDENT.AMENDMENT_LIST_HANGING,
        runs: [{ text: formatAmendmentDeedSingle(deed, false) }]
      });
    });
  }

  blocks.push(
    {
      type: "p", runs: [
        { text: `untuk selanjutnya disebut ("Perseroan"), terdiri dari:` }
      ]
    }
  );

  interface Representation {
    sharesOwned: number;
    shareholder: any;
    proxyData: any;
  }
  interface PhysicalAttendee {
    type: 'PERSON' | 'ENTITY_DIRECT';
    name: string;
    salutation: string;
    sourceObj: any;
    ownShares: { sharesOwned: number; shareholder: any } | null;
    management: { position: string } | null;
    representations: Representation[];
  }

  const attendees: PhysicalAttendee[] = [];

  shareholders.forEach(sh => {
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
          ownShares: (sh.sharesOwned || 0) > 0 ? {
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
            ownShares: (sh.sharesOwned || 0) > 0 ? {
              sharesOwned: sh.sharesOwned || 0,
              shareholder: sh
            } : null,
            management: sh.isManagement ? { position: sh.managementPosition || "Direktur" } : null,
            representations: []
          };
          attendees.push(att);
        } else {
          if ((sh.sharesOwned || 0) > 0) {
            att.ownShares = {
              sharesOwned: sh.sharesOwned || 0,
              shareholder: sh
            };
          }
        }
      }
    }
  });

  attendees.forEach(att => {
    if (att.type === 'PERSON' && !att.management) {
      const pxNameUpper = att.name.toUpperCase().trim();
      const matchedMgmt = data.shareholders?.find((s: any) => (s.name || "").toUpperCase().trim() === pxNameUpper && s.isManagement);
      if (matchedMgmt) {
        att.management = { position: matchedMgmt.managementPosition || "Direktur" };
      }
    }
  });

  const getCleanDisplayName = (name: string): string => {
    let clean = name.toUpperCase().trim();
    const cleanPrefixRegex = /^(TUAN|NYONYA|NONA|NY\.?|TN\.?|IBU|BAPAK|SDR\.?|SDRI\.?|NYONYA|TUAN)\s+/i;
    while (cleanPrefixRegex.test(clean)) {
      clean = clean.replace(cleanPrefixRegex, "").trim();
    }
    return clean;
  };

  const getDisplayNameForDocx = (person: any) => {
    let name = (person.name || "................").toUpperCase();
    while (/^(PT\b\.?|PERSEROAN\s+TERBATAS\b)\s*/i.test(name)) {
      name = name.replace(/^(PT\b\.?|PERSEROAN\s+TERBATAS\b)\s*/i, "").trim();
    }
    return getCleanDisplayName(name);
  };

  attendees.forEach((att, index) => {
    const isBadanHukum = att.type === 'ENTITY_DIRECT';
    
    let details = "";
    if (isBadanHukum) {
      details = formatPersonDetails(att.sourceObj, "", "", false, false, true);
    } else {
      const tglAngka = att.sourceObj.birthDate ? formatDateStr(att.sourceObj.birthDate) : "................";
      details = formatPersonDetails(att.sourceObj, tglAngka, "", false, false, true);
    }

    const displayName = getCleanDisplayName(att.name);

    blocks.push({
      type: "numbered",
      num: `${index + 1}.`,
      ref: "sirkuler-numbered-attendee",
      indentLeft: INDENT.NUMBERED_MAIN,
      indentHanging: INDENT.NUMBERED_MAIN_HANGING,
      runs: [
        { text: isBadanHukum ? "" : `${att.salutation} ` },
        { text: displayName, bold: true },
        { text: details + ";" }
      ]
    });

    const totalSub = (att.ownShares ? 1 : 0) + att.representations.length;

    if (totalSub === 1) {
      if (att.ownShares) {
        const parValue = data.originalSharePrice || 100000;
        const currentShares = att.ownShares.sharesOwned || 0;
        const currentValue = currentShares * parValue;
        blocks.push({
          type: "list",
          bullet: "-",
          ref: "sirkuler-bullet",
          indentLeft: INDENT.BULLET_LEVEL_2,
          indentHanging: INDENT.BULLET_LEVEL_2_HANGING,
          runs: [
            { text: "Selaku pemilik dan pemegang saham sebanyak " },
            { text: formatNumber(currentShares), bold: true },
            { text: " lembar saham atau senilai " },
            { text: `Rp. ${formatNumber(currentValue)},-`, bold: true },
            { text: "." }
          ]
        });
      } else {
        const r = att.representations[0];
        const isDirector = r.proxyData.representationType === 'DIREKTUR_PT_LAIN';
        const parValue = data.originalSharePrice || 100000;
        const currentShares = r.sharesOwned || 0;
        const currentValue = currentShares * parValue;

        let runs: any[] = [];
        if (isDirector) {
          const isAsing = r.shareholder.isForeign || r.shareholder.nationalityType === "WNA";
          const isKoperasiOrYayasanOrCV = /^(KOPERASI|YAYASAN|CV\b)/i.test(r.shareholder.name || "");
          
          let entityPrefix = "PT ";
          if (isAsing || isKoperasiOrYayasanOrCV) {
            entityPrefix = "";
          }
          
          let shDetails = formatPersonDetails(r.shareholder, "", "", false, false, true);
          let hasDeeds = checkIsBadanHukum(r.shareholder) && r.shareholder.amendmentDeeds && r.shareholder.amendmentDeeds.length > 0;
          if (hasDeeds) {
            shDetails += ", dan telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut :";
          }

          const repName = `${entityPrefix}${getDisplayNameForDocx(r.shareholder)}`;
          
          runs = [
            { text: "Direktur " },
            { text: repName, bold: true },
            { text: shDetails },
            { text: ", Selaku pemilik dan pemegang saham sebanyak " },
            { text: formatNumber(currentShares), bold: true },
            { text: " lembar saham atau senilai " },
            { text: `Rp. ${formatNumber(currentValue)},-`, bold: true },
            { text: "." }
          ];
        } else {
          const proxyDate = r.proxyData.proxyDeedDate ? formatDateRupst(r.proxyData.proxyDeedDate) : "__________";
          const repText = `Selaku kuasa dari ${r.shareholder.salutation || "Tuan"} ${getDisplayNameForDocx(r.shareholder)}${formatPersonDetails(r.shareholder, "", "", false, false, true)} berdasarkan surat kuasa tertanggal ${proxyDate}`;
          runs = [
            { text: `${repText}, yang dalam hal ini selaku pemilik dan pemegang ` },
            { text: formatNumber(currentShares), bold: true },
            { text: " lembar saham atau senilai " },
            { text: `Rp. ${formatNumber(currentValue)},-`, bold: true },
            { text: "." }
          ];
        }

        blocks.push({
          type: "list",
          bullet: "-",
          ref: "sirkuler-bullet",
          indentLeft: INDENT.BULLET_LEVEL_2,
          indentHanging: INDENT.BULLET_LEVEL_2_HANGING,
          runs: runs
        });
        
        if (checkIsBadanHukum(r.shareholder) && r.shareholder.amendmentDeeds && r.shareholder.amendmentDeeds.length > 0) {
          r.shareholder.amendmentDeeds.forEach(deed => {
            blocks.push({
              type: "list",
              bullet: "-",
              ref: "sirkuler-bullet",
              indentLeft: INDENT.BULLET_LEVEL_3,
              indentHanging: INDENT.BULLET_LEVEL_3_HANGING,
              runs: [{ text: formatAmendmentDeedSingle(deed, false) }]
            });
          });
        }
      }
    } else if (totalSub > 1) {
      if (att.ownShares) {
        const parValue = data.originalSharePrice || 100000;
        const currentShares = att.ownShares.sharesOwned || 0;
        const currentValue = currentShares * parValue;

        blocks.push({
          type: "list",
          bullet: "-",
          ref: "sirkuler-bullet",
          indentLeft: INDENT.BULLET_LEVEL_2,
          indentHanging: INDENT.BULLET_LEVEL_2_HANGING,
          runs: [
            { text: "Selaku pemilik dan pemegang saham sebanyak " },
            { text: formatNumber(currentShares), bold: true },
            { text: " lembar saham atau senilai " },
            { text: `Rp. ${formatNumber(currentValue)},-`, bold: true },
            { text: ";" }
          ]
        });
      }

      att.representations.forEach(r => {
        const isDirector = r.proxyData.representationType === 'DIREKTUR_PT_LAIN';
        const parValue = data.originalSharePrice || 100000;
        const currentShares = r.sharesOwned || 0;
        const currentValue = currentShares * parValue;

        let runs: any[] = [];
        if (isDirector) {
          const isAsing = r.shareholder.isForeign || r.shareholder.nationalityType === "WNA";
          const isKoperasiOrYayasanOrCV = /^(KOPERASI|YAYASAN|CV\b)/i.test(r.shareholder.name || "");
          
          let entityPrefix = "PT ";
          if (isAsing || isKoperasiOrYayasanOrCV) {
            entityPrefix = "";
          }
          
          let shDetails = formatPersonDetails(r.shareholder, "", "", false, false, true);
          let hasDeeds = checkIsBadanHukum(r.shareholder) && r.shareholder.amendmentDeeds && r.shareholder.amendmentDeeds.length > 0;
          if (hasDeeds) {
            shDetails += ", dan telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut :";
          }

          const repName = `${entityPrefix}${getDisplayNameForDocx(r.shareholder)}`;
          
          runs = [
            { text: "Direktur " },
            { text: repName, bold: true },
            { text: shDetails },
            { text: ", Selaku pemilik dan pemegang saham sebanyak " },
            { text: formatNumber(currentShares), bold: true },
            { text: " lembar saham atau senilai " },
            { text: `Rp. ${formatNumber(currentValue)},-`, bold: true },
            { text: ";" }
          ];
        } else {
          const proxyDate = r.proxyData.proxyDeedDate ? formatDateRupst(r.proxyData.proxyDeedDate) : "__________";
          const repText = `Selaku kuasa dari ${r.shareholder.salutation || "Tuan"} ${getDisplayNameForDocx(r.shareholder)}${formatPersonDetails(r.shareholder, "", "", false, false, true)} berdasarkan surat kuasa tertanggal ${proxyDate}`;
          runs = [
            { text: `${repText}, yang dalam hal ini selaku pemilik dan pemegang ` },
            { text: formatNumber(currentShares), bold: true },
            { text: " lembar saham atau senilai " },
            { text: `Rp. ${formatNumber(currentValue)},-`, bold: true },
            { text: ";" }
          ];
        }

        blocks.push({
          type: "list",
          bullet: "-",
          ref: "sirkuler-bullet",
          indentLeft: INDENT.BULLET_LEVEL_2,
          indentHanging: INDENT.BULLET_LEVEL_2_HANGING,
          runs: runs
        });
        
        if (checkIsBadanHukum(r.shareholder) && r.shareholder.amendmentDeeds && r.shareholder.amendmentDeeds.length > 0) {
          r.shareholder.amendmentDeeds.forEach(deed => {
            blocks.push({
              type: "list",
              bullet: "-",
              ref: "sirkuler-bullet",
              indentLeft: INDENT.BULLET_LEVEL_3,
              indentHanging: INDENT.BULLET_LEVEL_3_HANGING,
              runs: [{ text: formatAmendmentDeedSingle(deed, false) }]
            });
          });
        }
      });
    }
  });

  // TOTAL SAHAM
  blocks.push(
    {
      type: "p",
      indentLeft: INDENT.PARAGRAPH_INDENT,
      runs: [
        { text: `Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak ` },
        { text: `${formatNumber(resolvedTotalShares)}`, bold: true },
        { text: ` lembar saham atau senilai ` },
        { text: `Rp. ${formatNumber(resolvedTotalRp)},-`, bold: true },
        { text: `.` }
      ]
    },
    {
      type: "list",
      bullet: "-",
      ref: "sirkuler-bullet",
      indentLeft: INDENT.BULLET_LEVEL_1,
      indentHanging: INDENT.BULLET_LEVEL_1_HANGING,
      runs: [{ text: "Untuk selanjutnya secara bersama-sama disebut sebagai \"Para Pemegang Saham\"" }]
    }
  );

  // STATEMENT
  blocks.push(
    {
      type: "p",
      runs: [
        { text: "DENGAN INI MENYATAKAN", bold: true },
        { text: ", bahwa Para Pemegang Saham telah mengetahui mengenai :" }
      ]
    },
    {
      type: "numbered",
      num: "1.",
      ref: "sirkuler-numbered-statement",
      indentLeft: INDENT.NUMBERED_STATEMENT,
      indentHanging: INDENT.NUMBERED_STATEMENT_HANGING,
      runs: [{ text: `Bahwa sampai saat ini jumlah saham yang telah ditempatkan dan disetor penuh dalam perseroan sebanyak ${formatNumber(resolvedTotalShares)} lembar saham;` }]
    },
    {
      type: "numbered",
      num: "2.",
      ref: "sirkuler-numbered-statement",
      indentLeft: INDENT.NUMBERED_STATEMENT,
      indentHanging: INDENT.NUMBERED_STATEMENT_HANGING,
      runs: [{ text: `Bahwa sesuai dengan ketentuan Pasal 91 Undang-Undang No. 40 Tahun 2007 tentang Perseroan Terbatas, pemegang saham dapat mengambil keputusan yang mengikat di luar Rapat Umum Pemegang Saham dengan syarat semua pemegang saham dengan hak suara menyetujui secara tertulis dengan menandatangani usul yang bersangkutan;` }]
    },
    {
      type: "numbered",
      num: "3.",
      ref: "sirkuler-numbered-statement",
      indentLeft: INDENT.NUMBERED_STATEMENT,
      indentHanging: INDENT.NUMBERED_STATEMENT_HANGING,
      runs: [{ text: `Bahwa maksud dari Keputusan Sirkuler Para Pemegang Saham ini adalah untuk perubahan KBLI Perseroan.` }]
    },
    {
      type: "numbered",
      num: "4.",
      ref: "sirkuler-numbered-statement",
      indentLeft: INDENT.NUMBERED_STATEMENT,
      indentHanging: INDENT.NUMBERED_STATEMENT_HANGING,
      runs: [{ text: `Persetujuan Laporan Tahunan Perseroan Tahun Buku ${fiscalYear};` }]
    },
    {
      type: "numbered",
      num: "5.",
      ref: "sirkuler-numbered-statement",
      indentLeft: INDENT.NUMBERED_STATEMENT,
      indentHanging: INDENT.NUMBERED_STATEMENT_HANGING,
      runs: [{ text: `Pengesahan Laporan Keuangan Perseroan Tahun Buku ${fiscalYear};` }]
    },
    {
      type: "numbered",
      num: "6.",
      ref: "sirkuler-numbered-statement",
      indentLeft: INDENT.NUMBERED_STATEMENT,
      indentHanging: INDENT.NUMBERED_STATEMENT_HANGING,
      runs: [{ text: "Penetapan penggunaan laba bersih Perseroan;" }]
    },
    {
      type: "numbered",
      num: "7.",
      ref: "sirkuler-numbered-statement",
      indentLeft: INDENT.NUMBERED_STATEMENT,
      indentHanging: INDENT.NUMBERED_STATEMENT_HANGING,
      runs: [{ text: "Pemberian pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris;" }]
    }
  );

  // OLEH KARENA ITU
  blocks.push(
    {
      type: "p",
      runs: [
        { text: "OLEH KARENA ITU", bold: true },
        { text: ", para pemegang saham secara bersama-sama setuju and memutuskan hal-hal sebagai berikut:" }
      ]
    }
  );

  let currentDecisionIdx = 1;

  // 1. AUDIT STATUS
  if (data.rupstIsAudited === true) {
    const alasanAuditOptions = [];
    if (data.rupstAlasanAuditA !== false) alasanAuditOptions.push("Kegiatan Usaha Perseroan menghimpun dan/atau mengelola dana masyarakat");
    if (data.rupstAlasanAuditB !== false) alasanAuditOptions.push("Perseroan menerbitkan surat pengakuan utang kepada masyarakat");
    if (data.rupstAlasanAuditC !== false) alasanAuditOptions.push("Perseroan merupakan Perseroan Terbuka (Tbk)");
    if (data.rupstAlasanAuditD !== false) alasanAuditOptions.push("Perseroan merupakan Persero");
    if (data.rupstAlasanAuditE !== false) alasanAuditOptions.push("Aset dan/atau jumlah peredaran usaha lebih dari 50 Milyar");
    if (data.rupstAlasanAuditF !== false) alasanAuditOptions.push("diwajibkan oleh peraturan perundang-undangan");

    if (alasanAuditOptions.length === 0) {
      alasanAuditOptions.push("Aset dan/atau jumlah peredaran usaha lebih dari 50 Milyar");
    }

    if (alasanAuditOptions.length === 1) {
      blocks.push({
        type: "numbered",
        num: `${currentDecisionIdx}.`,
        ref: "sirkuler-numbered-decision",
        indentLeft: INDENT.NUMBERED_MAIN,
        indentHanging: INDENT.NUMBERED_MAIN_HANGING,
        runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${finalCompanyName} yang menyatakan bahwa status perseroan ini merupakan PT Tertutup yang Laporan Keuangannya Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan ${alasanAuditOptions[0]}.` }]
      });
    } else {
      blocks.push({
        type: "numbered",
        num: `${currentDecisionIdx}.`,
        ref: "sirkuler-numbered-decision",
        indentLeft: INDENT.NUMBERED_MAIN,
        indentHanging: INDENT.NUMBERED_MAIN_HANGING,
        runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${finalCompanyName} yang menyatakan bahwa status perseroan ini merupakan PT Tertutup yang Laporan Keuangannya Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan :` }]
      });

      alasanAuditOptions.forEach((reason, index) => {
        const isLast = index === alasanAuditOptions.length - 1;
        const isSecondLast = index === alasanAuditOptions.length - 2;
        let suffix = ";";
        if (isLast) suffix = ".";
        else if (isSecondLast) suffix = ", atau";

        blocks.push({
          type: "list",
          bullet: String.fromCharCode(97 + index) + ".",
          ref: "sirkuler-numbered-alpha-decision",
          indentLeft: INDENT.ALPHA_BULLET,
          indentHanging: INDENT.ALPHA_BULLET_HANGING,
          runs: [{ text: `${reason}${suffix}` }]
        });
      });
    }
    currentDecisionIdx++;
  } else if (data.rupstIsAudited === false) {
    const alasanAuditOptions = [];
    if (data.rupstAlasanAuditA !== false) alasanAuditOptions.push("Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat");
    if (data.rupstAlasanAuditB !== false) alasanAuditOptions.push("Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat");
    if (data.rupstAlasanAuditC !== false) alasanAuditOptions.push("Perseroan tidak merupakan Perseroan Terbuka (Tbk)");
    if (data.rupstAlasanAuditD !== false) alasanAuditOptions.push("Perseroan tidak merupakan Persero");
    if (data.rupstAlasanAuditE !== false) alasanAuditOptions.push("Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar");
    if (data.rupstAlasanAuditF !== false) alasanAuditOptions.push("Tidak diwajibkan oleh peraturan perundang-undangan");

    if (alasanAuditOptions.length === 0) {
      alasanAuditOptions.push(
        "Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat",
        "Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat",
        "Perseroan tidak merupakan Perseroan Terbuka (Tbk)",
        "Perseroan tidak merupakan Persero",
        "Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar",
        "Tidak diwajibkan oleh peraturan perundang-undangan"
      );
    }

    if (alasanAuditOptions.length === 1) {
      const formattedReason = alasanAuditOptions[0] + (data.rupstNonAuditedUseKAP ? ". Namun untuk laporan keuangan yang akurat perseroan memilih dan memutuskan untuk menggunakan Kantor Akuntan Publik." : ".");
      blocks.push({
        type: "numbered",
        num: `${currentDecisionIdx}.`,
        ref: "sirkuler-numbered-decision",
        indentLeft: INDENT.NUMBERED_MAIN,
        indentHanging: INDENT.NUMBERED_MAIN_HANGING,
        runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${finalCompanyName} yang menyatakan bahwa status perseroan ini merupakan PT Tertutup yang Laporan Keuangannya Tidak Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan ${formattedReason}` }]
      });
    } else {
      blocks.push({
        type: "numbered",
        num: `${currentDecisionIdx}.`,
        ref: "sirkuler-numbered-decision",
        indentLeft: INDENT.NUMBERED_MAIN,
        indentHanging: INDENT.NUMBERED_MAIN_HANGING,
        runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${finalCompanyName} yang menyatakan bahwa status perseroan ini merupakan PT Tertutup yang Laporan Keuangannya Tidak Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan :` }]
      });

      alasanAuditOptions.forEach((reason, index) => {
        const isLast = index === alasanAuditOptions.length - 1;
        const isSecondLast = index === alasanAuditOptions.length - 2;
        let suffix = ";";
        if (isLast) suffix = ".";
        else if (isSecondLast) suffix = ", atau";

        blocks.push({
          type: "list",
          bullet: String.fromCharCode(97 + index) + ".",
          ref: "sirkuler-numbered-alpha-decision",
          indentLeft: INDENT.ALPHA_BULLET,
          indentHanging: INDENT.ALPHA_BULLET_HANGING,
          runs: [{ text: `${reason}${suffix}` }]
        });
      });

      if (data.rupstNonAuditedUseKAP) {
        blocks.push({
          type: "p",
          indentLeft: INDENT.PARAGRAPH_INDENT,
          runs: [{ text: "Namun untuk laporan keuangan yang akurat perseroan memilih dan memutuskan untuk menggunakan Kantor Akuntan Publik." }]
        });
      }
    }
    currentDecisionIdx++;
  }

  // 2. LAPORAN TAHUNAN & LAPORAN KEUANGAN (Audited)
  if (data.rupstIsAudited) {
    const kapName = data.rupstKapName || "[NAMA KAP]";
    const kapLicense = data.rupstKapLicenseNumber || "[NOMOR IZIN KAP]";
    const kapExpiryDate = data.rupstKapExpiryDate ? formatDateRupst(data.rupstKapExpiryDate) : "[TANGGAL BERAKHIR IZIN]";
    const auditReportNum = data.rupstAuditReportNumber || "[NOMOR LAPORAN AUDIT]";
    const auditReportDate = data.rupstAuditReportDate ? formatDateRupst(data.rupstAuditReportDate) : "[TANGGAL LAPORAN AUDIT]";

    blocks.push({
      type: "numbered",
      num: `${currentDecisionIdx}.`,
      ref: "sirkuler-numbered-decision",
      indentLeft: INDENT.NUMBERED_MAIN,
      indentHanging: INDENT.NUMBERED_MAIN_HANGING,
      runs: [{ text: `Menyetujui Laporan Tahunan Perseroan untuk Tahun Buku ${fiscalYear} dan Mengesahkan Laporan Keuangan Perseroan untuk Tahun Buku yang berakhir pada tanggal 31 Desember ${fiscalYear} yang telah diajukan oleh Direksi dan diaudit oleh Kantor Akuntan Publik ${kapName}, yang telah memperoleh izin usaha dari Menteri Keuangan Republik Indonesia dengan Nomor Izin ${kapLicense} yang berlaku sampai dengan tanggal ${kapExpiryDate}, sebagaimana dimuat dalam laporannya Nomor ${auditReportNum} tanggal ${auditReportDate}. yang terdiri dari:` }]
    });

    const consistOf = [
      "Laporan Keuangan, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.",
      "Laporan mengenai Kegiatan Perseroan, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.",
      "Laporan Pelaksanaan Tanggung Jawab Sosial dan Lingkungan, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.",
      "Rincian Masalah yang timbul selama tahun buku yang mempengaruhi kegiatan usaha perseroan, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.",
      "Laporan mengenai tugas pengawasan yang telah dilaksanakan oleh Dewan Komisaris selama tahun buku yang baru lampau, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.",
      "Nama Anggota Direksi dan Anggota Dewan Komisaris, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.",
      "Gaji dan Tunjangan bagi Anggota Direksi dan Gaji atau Honorarium dan Tunjangan bagi Anggota Dewan Komisaris Perseroan untuk Tahun yang baru lampau, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.",
    ];

    consistOf.forEach((item) => {
      blocks.push({
        type: "list",
        bullet: "-",
        ref: "sirkuler-bullet",
        indentLeft: INDENT.BULLET_LEVEL_2,
        indentHanging: INDENT.BULLET_LEVEL_2_HANGING,
        runs: [{ text: item }]
      });
    });

    blocks.push({
      type: "p",
      indentLeft: INDENT.PARAGRAPH_INDENT,
      runs: [{ text: "Direksi dan Komisaris serta Para Pemegang Saham Perseroan menyatakan bertanggung jawab penuh atas Kebenaran Informasi dan Tanda Tangan pada seluruh Lampiran Laporan terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini." }]
    });
    currentDecisionIdx++;
  } else {
    // 2. Laporan Tahunan (Non-Audited)
    blocks.push({
      type: "numbered",
      num: `${currentDecisionIdx}.`,
      ref: "sirkuler-numbered-decision",
      indentLeft: INDENT.NUMBERED_MAIN,
      indentHanging: INDENT.NUMBERED_MAIN_HANGING,
      runs: [{ text: `Menyetujui dan menerima dengan baik Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${fiscalYear}.` }]
    });
    currentDecisionIdx++;

    // 3. Laporan Keuangan (Non-Audited)
    const financialDateStr = data.rupstFinancialReportDate ? formatDateRupst(data.rupstFinancialReportDate) : '............................';
    const financialPos = data.rupstFinancialReportSignatoryPosition || 'Direktur';
    let financialSignatory = (data.rupstFinancialReportSignatoryName ? data.rupstFinancialReportSignatoryName : '............................').toUpperCase();
    const signatorySh = data.shareholders?.find(s => s.name?.toUpperCase() === financialSignatory || s.name === data.rupstFinancialReportSignatoryName);
    const signatorySalutation = signatorySh?.salutation || "Tuan";
    
    const sigSalUpper = `${signatorySalutation.toUpperCase()} `;
    if (financialSignatory.startsWith(sigSalUpper)) {
      financialSignatory = financialSignatory.substring(sigSalUpper.length);
    }

    let baseApprovalText = `Mengesahkan Laporan Keuangan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${fiscalYear}, sebagaimana dimuat dalam Laporan Keuangan ${finalCompanyName} tanggal ${financialDateStr}, yang ditandatangani oleh ${financialPos} Perseroan ${signatorySalutation} ${financialSignatory}`;
    
    if (data.rupstNonAuditedUseKAP) {
      const kapName = data.rupstKapName || "[NAMA KAP]";
      const kapLicense = data.rupstKapLicenseNumber || "[NOMOR IZIN KAP]";
      const kapExpiryDate = data.rupstKapExpiryDate ? formatDateRupst(data.rupstKapExpiryDate) : "[TANGGAL BERAKHIR IZIN]";
      const auditReportNum = data.rupstAuditReportNumber || "[NOMOR LAPORAN AUDIT]";
      const auditReportDate = data.rupstAuditReportDate ? formatDateRupst(data.rupstAuditReportDate) : "[TANGGAL LAPORAN AUDIT]";
      
      baseApprovalText += ` dan diaudit oleh Kantor Akuntan Publik ${kapName}, yang telah memperoleh izin usaha dari Menteri Keuangan Republik Indonesia dengan Nomor Izin ${kapLicense} yang berlaku sampai dengan tanggal ${kapExpiryDate}, sebagaimana dimuat dalam laporannya Nomor ${auditReportNum} tanggal ${auditReportDate}`;
    }
    
    baseApprovalText += " yang terdiri dari:";

    blocks.push(
      {
        type: "numbered",
        num: `${currentDecisionIdx}.`,
        ref: "sirkuler-numbered-decision",
        indentLeft: INDENT.NUMBERED_MAIN,
        indentHanging: INDENT.NUMBERED_MAIN_HANGING,
        runs: [{ text: baseApprovalText }]
      },
      {
        type: "list",
        bullet: "-",
        ref: "sirkuler-bullet",
        indentLeft: INDENT.BULLET_LEVEL_2,
        indentHanging: INDENT.BULLET_LEVEL_2_HANGING,
        runs: [{ text: "Laporan Keuangan, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini." }]
      },
      {
        type: "p",
        indentLeft: INDENT.PARAGRAPH_INDENT,
        runs: [{ text: "Direksi dan Komisaris serta Para Pemegang Saham Perseroan menyatakan bertanggung jawab penuh atas Kebenaran Informasi dan Tanda Tangan pada seluruh Lampiran Laporan terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini." }]
      }
    );
    currentDecisionIdx++;
  }

  // 4. Laba Bersih / Dividen
  const isNetProfitNeg = (data.rupstNetProfit !== undefined) && (data.rupstNetProfit < 0);
  const netProfitAbsVal = Math.abs(data.rupstNetProfit || 0);
  const netProfitAmtStr = `Rp. ${formatNumber(netProfitAbsVal)},- (${terbilang(netProfitAbsVal)} rupiah)`;
  const prevRetProfitAbsVal = Math.abs(data.rupstRetainedProfit || 0);
  const prevRetProfitAmtStr = `Rp${formatNumber(prevRetProfitAbsVal)},- (${terbilang(prevRetProfitAbsVal)} rupiah)`;

  if (isNetProfitNeg) {
    blocks.push({
      type: "numbered",
      num: `${currentDecisionIdx}.`,
      ref: "sirkuler-numbered-decision",
      indentLeft: INDENT.NUMBERED_MAIN,
      indentHanging: INDENT.NUMBERED_MAIN_HANGING,
      runs: [{ text: `Menetapkan Perseroan mengalami rugi bersih untuk tahun buku ${fiscalYear} sebesar ${netProfitAmtStr}, dan oleh karenanya memutuskan bahwa tidak terdapat laba bersih yang dapat dibagikan sebagai dividen kepada para pemegang saham untuk Tahun Buku ${fiscalYear}. Seluruh saldo rugi tersebut akan dicatat sebagai akumulasi rugi Perseroan sesuai ketentuan peraturan perundang-undangan yang berlaku.` }]
    });
  } else {
    const showRetained = data.rupstShowRetainedProfit ?? ((data.rupstRetainedProfit !== undefined) && (data.rupstRetainedProfit !== 0));
    let mainLabaText = "";
    if (showRetained) {
      const retainedLabel = (data.rupstRetainedProfit || 0) < 0 ? "rugi" : "laba";
      mainLabaText = `Menetapkan penggunaan laba Perseroan yang tersedia, yang terdiri dari laba bersih Tahun Buku ${fiscalYear} sebesar ${netProfitAmtStr} dan saldo ${retainedLabel} ditahan tahun-tahun sebelumnya sebesar ${prevRetProfitAmtStr}, dengan penggunaan sebagai berikut:`;
    } else {
      mainLabaText = `Menetapkan penggunaan laba bersih Perseroan Tahun Buku ${fiscalYear} sebesar ${netProfitAmtStr}, dengan penggunaan sebagai berikut:`;
    }

    blocks.push({
      type: "numbered",
      num: `${currentDecisionIdx}.`,
      ref: "sirkuler-numbered-decision",
      indentLeft: INDENT.NUMBERED_MAIN,
      indentHanging: INDENT.NUMBERED_MAIN_HANGING,
      runs: [{ text: mainLabaText }]
    });

    if (data.rupstDividendAmount && data.rupstDividendAmount > 0) {
      const divAmt = data.rupstDividendAmount;
      const subTextA = `Sebesar Rp${formatNumber(divAmt)},- (${terbilang(divAmt)} rupiah) dibagikan sebagai dividen tunai kepada para pemegang saham sesuai dengan porsi kepemilikan saham masing-masing, yaitu:`;
      blocks.push({
        type: "list",
        bullet: "a.",
        ref: "sirkuler-numbered-alpha-decision",
        indentLeft: INDENT.ALPHA_BULLET,
        indentHanging: INDENT.ALPHA_BULLET_HANGING,
        runs: [{ text: subTextA }]
      });

      if (data.rupstDividends && data.rupstDividends.length > 0) {
        data.rupstDividends.forEach((div, idx) => {
          const salName = div.shareholderName || `Penerima ${idx + 1}`;
          const salPrefix = getSalutationPrefix(salName);
          const formattedName = toTitleCase(salName);
          const fullShareholderDesc = `${salPrefix}${formattedName}`;
          
          const pctFormatted = formatPercentageIndo(div.percentage);
          const pctWords = terbilangPersen(div.percentage);
          const amtFormatted = `Rp${formatNumber(div.amount)},-`;
          const amtWords = `${terbilang(div.amount)} rupiah`;
          
          const pd = div.paymentDate ? formatDateRupst(div.paymentDate) : '';
          const divLine = `${fullShareholderDesc}, pemegang ${pctFormatted}% (${pctWords}) saham dalam Perseroan, memperoleh dividen sebesar ${amtFormatted} (${amtWords})${pd ? ` yang telah dibayarkan oleh Perseroan pada tanggal ${pd}` : ''};`;
          
          blocks.push({
            type: "list",
            bullet: "-",
            ref: "sirkuler-bullet",
            indentLeft: INDENT.BULLET_LEVEL_3,
            indentHanging: INDENT.BULLET_LEVEL_3_HANGING,
            runs: [{ text: divLine }]
          });
        });
      }

      let remainderText = "Sisa laba yang tersedia setelah pembagian dividen tersebut ditetapkan sebagai saldo laba ditahan Perseroan.";
      if (showRetained) {
        const netProfit = data.rupstNetProfit || 0;
        const previousRetained = data.rupstRetainedProfit || 0;
        const totalLabaDitahan = netProfit + previousRetained - divAmt;
        const isTotalRetainedNeg = totalLabaDitahan < 0;
        const totalRetainedLabel = isTotalRetainedNeg ? "rugi" : "laba";
        const prevLabel = previousRetained < 0 ? "rugi" : "laba";

        remainderText = `Laba bersih tahun berjalan sebesar ${netProfitAmtStr} ditambah saldo ${prevLabel} ditahan tahun sebelumnya sebesar ${prevRetProfitAmtStr} menjadi sebesar Rp${formatNumber(Math.abs(totalLabaDitahan))},- (${terbilang(Math.abs(totalLabaDitahan))} rupiah) ditetapkan sebagai saldo ${totalRetainedLabel} ditahan Perseroan.`;
      }

      blocks.push(
        {
          type: "list",
          bullet: "b.",
          ref: "sirkuler-numbered-alpha-decision",
          indentLeft: INDENT.ALPHA_BULLET,
          indentHanging: INDENT.ALPHA_BULLET_HANGING,
          runs: [{ text: remainderText }]
        },
        {
          type: "list",
          bullet: "-",
          ref: "sirkuler-bullet",
          indentLeft: INDENT.BULLET_LEVEL_2,
          indentHanging: INDENT.BULLET_LEVEL_2_HANGING,
          runs: [{ text: "Memberikan persetujuan dan pengesahan atas tindakan Direksi Perseroan yang telah melakukan pembayaran dividen kepada para pemegang saham sebagaimana tersebut di atas." }]
        }
      );
    } else {
      blocks.push({
        type: "list",
        bullet: "a.",
        ref: "sirkuler-numbered-alpha-decision",
        indentLeft: INDENT.ALPHA_BULLET,
        indentHanging: INDENT.ALPHA_BULLET_HANGING,
        runs: [{ text: "Perseroan tidak membagikan dividen kepada para pemegang saham;" }]
      });

      let retainedText = "Seluruh laba bersih Perseroan dibukukan sebagai laba ditahan Perseroan.";
      if (showRetained) {
        const netProfit = data.rupstNetProfit || 0;
        const previousRetained = data.rupstRetainedProfit || 0;
        const totalLabaDitahan = netProfit + previousRetained;
        const isTotalRetainedNeg = totalLabaDitahan < 0;
        const totalRetainedLabel = isTotalRetainedNeg ? "rugi" : "laba";
        const prevLabel = previousRetained < 0 ? "rugi" : "laba";

        retainedText = `Laba bersih tahun berjalan sebesar ${netProfitAmtStr} ditambah saldo ${prevLabel} ditahan tahun sebelumnya sebesar ${prevRetProfitAmtStr} menjadi sebesar Rp${formatNumber(Math.abs(totalLabaDitahan))},- (${terbilang(Math.abs(totalLabaDitahan))} rupiah) ditetapkan sebagai saldo ${totalRetainedLabel} ditahan Perseroan.`;
      }

      const netProfitVal = data.rupstNetProfit || 0;
      const prevRetainedVal = data.rupstRetainedProfit || 0;
      if (netProfitVal !== 0 || prevRetainedVal !== 0) {
        blocks.push({
          type: "list",
          bullet: "b.",
          ref: "sirkuler-numbered-alpha-decision",
          indentLeft: INDENT.ALPHA_BULLET,
          indentHanging: INDENT.ALPHA_BULLET_HANGING,
          runs: [{ text: retainedText }]
        });
      }
    }
  }
  currentDecisionIdx++;

  // 5. Pelunasan
  blocks.push({
    type: "numbered",
    num: `${currentDecisionIdx}.`,
    ref: "sirkuler-numbered-decision",
    indentLeft: INDENT.NUMBERED_MAIN,
    indentHanging: INDENT.NUMBERED_MAIN_HANGING,
    runs: [{ text: `Memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris Perseroan atas tindakan pengurusan dan pengawasan yang telah dijalankan selama tahun buku ${fiscalYear}, sejauh tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan Perseroan.` }]
  });
  currentDecisionIdx++;

  // 6. Kuasa
  const rep = data.representativeType === "MANUAL" ? data.manualRepresentative : data.shareholders.find((s) => s.id === data.authorizedRepresentativeId);
  let repText = "";
  if (data.representativeType === "MANUAL" && rep) {
    const repName = (rep.name || "").toUpperCase();
    const salutation = rep.salutation || "Tuan";
    const tglAngka = rep.birthDate ? formatDateRupst(rep.birthDate) : "...";
    const details = formatPersonDetails(rep, tglAngka, "");
    repText = `Memberikan kuasa kepada ${salutation} ${repName}${details}, untuk melakukan segala tindakan yang diperlukan sehubungan dengan hasil keputusan ini, termasuk namun tidak terbatas pada pengurusan pelaporan kepada instansi yang berwenang.`;
  } else {
    const repName = rep ? rep.name.toUpperCase() : (data.meetingChair || (shareholders.length > 0 ? shareholders[0].name : "...")).toUpperCase();
    const foundSh = data.shareholders.find(s => s.name.toUpperCase() === repName);
    const salutation = foundSh?.salutation || "Tuan";
    repText = `Memberikan kuasa kepada ${salutation} ${repName} tersebut diatas, untuk melakukan segala tindakan yang diperlukan sehubungan dengan hasil keputusan ini, termasuk namun tidak terbatas pada pengurusan pelaporan kepada instansi yang berwenang.`;
  }

  blocks.push({
    type: "numbered",
    num: `${currentDecisionIdx}.`,
    ref: "sirkuler-numbered-decision",
    indentLeft: INDENT.NUMBERED_MAIN,
    indentHanging: INDENT.NUMBERED_MAIN_HANGING,
    runs: [{ text: repText }]
  });

  blocks.push(
    { type: "br" },
    { type: "p", runs: [{ text: "Demikian keputusan ini dibuat untuk dapat digunakan sebagaimana mestinya." }] },
    { type: "br" },
    { type: "p", runs: [{ text: "Yang Membuat Keputusan :" }] },
    { type: "p", runs: [{ text: "Meterai Rp.10.000,- + cap perusahan", italic: true }] },
    { type: "br" },
    { type: "br" },
    { type: "br" },
    { type: "signatures", shareholders: shareholders }
  );

  return blocks;
}