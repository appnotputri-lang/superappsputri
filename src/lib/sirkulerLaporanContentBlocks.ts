import { CompanyData } from "../../types";
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
  formatAmendmentDeedSingle
} from "./formatter";

// Helper for formatting blocks for DOCX
export type Block =
  | { type: "p"; runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]; align?: "center" | "right-center" | "justified"; indentLeft?: number }
  | { type: "list"; bullet: string; runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]; indentLeft: number; indentHanging: number }
  | { type: "numbered"; num: string | number; runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]; indentLeft: number; indentHanging: number }
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
    const pctStr = pct.toFixed(2).replace(/\.?0+$/, ''); // e.g. "53.5" or "7"
    if (!pctStr.includes('.')) {
      return `${terbilang(pct)} persen`;
    }
    const parts = pctStr.split('.');
    const integerPart = parseInt(parts[0], 10);
    const decimalStr = parts[1]; // e.g. "5"
    
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

  const companyEstStr = formatCompanyEstablishmentOnly(data, false);
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
        indentLeft: 426,
        indentHanging: 426,
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

  // Group shareholders by physical attendee
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

  // Apply management role lookups for physical persons
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
      details = formatPersonDetails(att.sourceObj, "", "", false, false);
    } else {
      const tglAngka = att.sourceObj.birthDate ? formatDateRupst(att.sourceObj.birthDate) : "................";
      details = formatPersonDetails(att.sourceObj, tglAngka, "", false, false);
    }

    const displayName = getCleanDisplayName(att.name);

    blocks.push({
      type: "numbered",
      num: `${index + 1}.`,
      indentLeft: 360,
      indentHanging: 360,
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
          indentLeft: 720,
          indentHanging: 360,
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
          const shDetails = formatPersonDetails(r.shareholder, "", "", false, false);
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
          const repText = `Selaku kuasa dari ${r.shareholder.salutation || "Tuan"} ${getDisplayNameForDocx(r.shareholder)}${formatPersonDetails(r.shareholder, "", "", false, false)} berdasarkan surat kuasa tertanggal ${proxyDate}`;
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
          indentLeft: 720,
          indentHanging: 360,
          runs: runs
        });
      }
    } else if (totalSub > 1) {
      if (att.ownShares) {
        const parValue = data.originalSharePrice || 100000;
        const currentShares = att.ownShares.sharesOwned || 0;
        const currentValue = currentShares * parValue;

        blocks.push({
          type: "list",
          bullet: "-",
          indentLeft: 720,
          indentHanging: 360,
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
          const shDetails = formatPersonDetails(r.shareholder, "", "", false, false);
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
          const repText = `Selaku kuasa dari ${r.shareholder.salutation || "Tuan"} ${getDisplayNameForDocx(r.shareholder)}${formatPersonDetails(r.shareholder, "", "", false, false)} berdasarkan surat kuasa tertanggal ${proxyDate}`;
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
          indentLeft: 720,
          indentHanging: 360,
          runs: runs
        });
      });
    }
  });

  blocks.push(
    { type: "p", runs: [{ text: `Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak ` }, { text: `${formatNumber(resolvedTotalShares)}`, bold: true }, { text: ` lembar saham atau senilai ` }, { text: `Rp. ${formatNumber(resolvedTotalRp)},-`, bold: true }, { text: `.` }] },
    { type: "list", bullet: "-", indentLeft: 360, indentHanging: 360, runs: [{ text: "Untuk selanjutnya secara bersama-sama disebut sebagai “Para Pemegang Saham”" }] },
    { type: "p", runs: [{ text: "DENGAN INI MENYATAKAN", bold: true }, { text: ", bahwa Para Pemegang Saham telah mengetahui mengenai :" }] },
    { type: "numbered", num: "1.", indentLeft: 360, indentHanging: 360, runs: [{ text: `Persetujuan Laporan Tahunan Perseroan Tahun Buku ${fiscalYear};` }] },
    { type: "numbered", num: "2.", indentLeft: 360, indentHanging: 360, runs: [{ text: `Pengesahan Laporan Keuangan Perseroan Tahun Buku ${fiscalYear};` }] },
    { type: "numbered", num: "3.", indentLeft: 360, indentHanging: 360, runs: [{ text: "Penetapan penggunaan laba bersih Perseroan;" }] },
    { type: "numbered", num: "4.", indentLeft: 360, indentHanging: 360, runs: [{ text: "Pemberian pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris;" }] },
    { type: "p", runs: [{ text: "OLEH KARENA ITU", bold: true }, { text: ", para pemegang saham secara bersama-sama setuju dan memutuskan hal-hal sebagai berikut:" }] }
  );

  let currentDecisionIdx = 1;

  // 1. Audit Status (if non-audited)
  if (data.rupstIsAudited === false) {
    const alasanAuditOptions = [];
    if (data.rupstAlasanAuditA !== false) alasanAuditOptions.push("Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.");
    if (data.rupstAlasanAuditB !== false) alasanAuditOptions.push("Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.");
    if (data.rupstAlasanAuditC !== false) alasanAuditOptions.push("Perseroan tidak merupakan Perseroan Terbuka (Tbk).");
    if (data.rupstAlasanAuditD !== false) alasanAuditOptions.push("Perseroan tidak merupakan Persero.");
    if (data.rupstAlasanAuditE !== false) alasanAuditOptions.push("Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau");
    if (data.rupstAlasanAuditF !== false) alasanAuditOptions.push("Tidak diwajibkan oleh peraturan perundang-undangan.");

    if (alasanAuditOptions.length === 0) {
      alasanAuditOptions.push(
        "Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.",
        "Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.",
        "Perseroan tidak merupakan Perseroan Terbuka (Tbk).",
        "Perseroan tidak merupakan Persero.",
        "Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau",
        "Tidak diwajibkan oleh peraturan perundang-undangan."
      );
    }

    if (alasanAuditOptions.length === 1) {
      const formattedReason = alasanAuditOptions[0].replace(", atau", "") + (data.rupstNonAuditedUseKAP ? ". Namun untuk laporan keuangan yang akurat perseroan memilih dan memutuskan untuk menggunakan Kantor Akuntan Publik." : ".");
      blocks.push({
        type: "numbered",
        num: `${currentDecisionIdx}.`,
        indentLeft: 360,
        indentHanging: 360,
        runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${finalCompanyName} yang menyatakan bahwa status perseroan ini merupakan PT Tertutup yang Laporan Keuangannya Tidak Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan ${formattedReason}` }]
      });
    } else {
      blocks.push({
        type: "numbered",
        num: `${currentDecisionIdx}.`,
        indentLeft: 360,
        indentHanging: 360,
        runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${finalCompanyName} yang menyatakan bahwa status perseroan ini merupakan PT Tertutup yang Laporan Keuangannya Tidak Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:` }]
      });

      alasanAuditOptions.forEach((reason, index) => {
        blocks.push({
          type: "list",
          bullet: String.fromCharCode(97 + index) + ".", // a., b., c.
          indentLeft: 720,
          indentHanging: 360,
          runs: [{ text: reason }]
        });
      });

      if (data.rupstNonAuditedUseKAP) {
        blocks.push({
          type: "p",
          indentLeft: 720,
          runs: [{ text: "Namun untuk laporan keuangan yang akurat perseroan memilih dan memutuskan untuk menggunakan Kantor Akuntan Publik." }]
        });
      }
    }
    currentDecisionIdx++;
  }

  // 2. Laporan Tahunan
  blocks.push({
    type: "numbered",
    num: `${currentDecisionIdx}.`,
    indentLeft: 360,
    indentHanging: 360,
    runs: [{ text: `Menyetujui dan menerima dengan baik Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${fiscalYear}.` }]
  });
  currentDecisionIdx++;

  // 3. Laporan Keuangan
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
  
  if (data.rupstIsAudited || data.rupstNonAuditedUseKAP) {
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
      indentLeft: 360,
      indentHanging: 360,
      runs: [{ text: baseApprovalText }]
    },
    { type: "list", bullet: "-", indentLeft: 720, indentHanging: 360, runs: [{ text: "Laporan Keuangan, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini." }] },
    { type: "p", indentLeft: 360, runs: [{ text: "Direksi dan Komisaris serta Para Pemegang Saham Perseroan menyatakan bertanggung jawab penuh atas Kebenaran Informasi dan Tanda Tangan pada seluruh Lampiran Laporan terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini." }] }
  );
  currentDecisionIdx++;

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
      indentLeft: 360,
      indentHanging: 360,
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
      indentLeft: 360,
      indentHanging: 360,
      runs: [{ text: mainLabaText }]
    });

    if (data.rupstDividendAmount && data.rupstDividendAmount > 0) {
      const divAmt = data.rupstDividendAmount;
      const subTextA = `Sebesar Rp${formatNumber(divAmt)},- (${terbilang(divAmt)} rupiah) dibagikan sebagai dividen tunai kepada para pemegang saham sesuai dengan porsi kepemilikan saham masing-masing, yaitu:`;
      blocks.push({
        type: "list",
        bullet: "a.",
        indentLeft: 720,
        indentHanging: 360,
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
            indentLeft: 1080,
            indentHanging: 360,
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
          indentLeft: 720,
          indentHanging: 360,
          runs: [{ text: remainderText }]
        },
        {
          type: "list",
          bullet: "-",
          indentLeft: 720,
          indentHanging: 360,
          runs: [{ text: "Memberikan persetujuan dan pengesahan atas tindakan Direksi Perseroan yang telah melakukan pembayaran dividen kepada para pemegang saham sebagaimana tersebut di atas." }]
        }
      );
    } else {
      blocks.push({
        type: "list",
        bullet: "a.",
        indentLeft: 720,
        indentHanging: 360,
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

      blocks.push({
        type: "list",
        bullet: "b.",
        indentLeft: 720,
        indentHanging: 360,
        runs: [{ text: retainedText }]
      });
    }
  }
  currentDecisionIdx++;

  // 5. Pelunasan
  blocks.push({
    type: "numbered",
    num: `${currentDecisionIdx}.`,
    indentLeft: 360,
    indentHanging: 360,
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
    indentLeft: 360,
    indentHanging: 360,
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
