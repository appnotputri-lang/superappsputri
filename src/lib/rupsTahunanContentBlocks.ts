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
  cleanDegrees,
} from "./formatter";

export type Block =
  | {
      type: "p";
      runs: FormatToken[];
      align?: "left" | "center" | "both";
      indent?: boolean;
      indentTabs?: number;
      spaceAfter?: boolean;
    }
  | {
      type: "list";
      bullet: string;
      runs: FormatToken[];
      indentTabs?: number;
      indentStyle?: "keputusan";
    }
  | { type: "divider"; text: string }
  | { type: "br" }
  | { type: "pageBreak" }
  | {
      type: "table";
      headers: string[];
      rows: (FormatToken[] | string)[][];
      widths?: number[];
    }
  | {
      type: "participantSigs";
      participants: any[];
    };

export const generateRupstBlocks = (data: CompanyData): Block[] => {
  const blocks: Block[] = [];

  const fiscalYear = data.rupstFiscalYear || "2025";
  const signingDate = data.signingDate || "";
  const tglRapatHari = getDayName(signingDate) || "...";
  const tglRapatRupst = formatDateRupst(signingDate) || "...";

  const stTime = data.meetingStartTime;
  const jamRapatStr = stTime ? stTime.replace(":", ".") : "00.00";
  const jamRapatWords = timeToWords(stTime || "00:00");
  const isTimeDefault = !stTime;

  const totalShares = data.shareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0);
  const attendingShareholders = data.shareholders.filter(s => s.isPresent);
  const presentShares = attendingShareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0);
  const presentPercentage = totalShares > 0 ? (presentShares / totalShares) * 100 : 100;

  // 1. Title
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "NOTULEN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: "RAPAT UMUM PEMEGANG SAHAM TAHUNAN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: formatCompanyName(data.companyName), bold: true }] }
  );

  blocks.push({ type: "br" });

  // 2. Opening
  blocks.push({ type: "p", runs: [{ text: "I. RAPAT", bold: true }] });

  function checkNotaryWording(name: string, title?: string, domicile?: string) {
    const cleanName = cleanDegrees(name || "");
    const cleanTitle = cleanDegrees(title || "");
    return `${cleanName}${cleanTitle ? `, ${cleanTitle}` : ""}, Notaris di ${toTitleCase(domicile || "...")}`;
  }

  const hasAmendments = data.amendmentDeeds && data.amendmentDeeds.length > 0;

  const tglPendirianRupst = formatDateRupst(data.establishmentDeedDate || "");
  const tglSKPendirianRupst = formatDateRupst(data.establishmentSkDate || "");

  blocks.push({
    type: "p",
    runs: [
      { text: `Rapat Umum Pemegang Saham Tahunan "` },
      { text: formatCompanyName(data.companyName).toUpperCase(), bold: true },
      {
        text: `" (selanjutnya disebut sebagai "Rapat") perseroan yang berkedudukan di ${data.domicile || "..."}, demikian berdasarkan Akta Pendirian tertanggal ${tglPendirianRupst}, Nomor ${data.establishmentDeedNumber || "..."}, yang dibuat dihadapan ${checkNotaryWording(data.establishmentNotary || "............................", data.establishmentNotaryTitle, data.establishmentNotaryDomicile)} dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${tglSKPendirianRupst}, Nomor ${data.establishmentSkNumber || "..."}${hasAmendments ? (data.amendmentDeeds!.length === 1 ? " dan telah mengalami perubahan berdasarkan akta sebagai berikut :" : " dan telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut :") : "."}`
      }
    ]
  });

  // Amendment deeds
  if (hasAmendments) {
    data.amendmentDeeds!.forEach((deed, i) => {
      const isLast = i === data.amendmentDeeds!.length - 1;
      const tglDeedFormatted = formatDateRupst(deed.date);

      let skText = "";
      if (deed.skSpDocuments && deed.skSpDocuments.length > 0) {
        const sks = deed.skSpDocuments.filter((d) => d.type === "SK");
        const sps = deed.skSpDocuments.filter((d) => d.type !== "SK");

        const skParts: string[] = [];
        sks.forEach((sk) => {
          skParts.push(
            `telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${formatDateRupst(sk.date)}, Nomor ${sk.number}`,
          );
        });

        const spParts: string[] = [];
        if (sps.length > 0) {
          const spDescParts = sps.map((sp) => {
            if (sp.type === "SP_DATA_PERSEROAN")
              return `Surat Penerimaan Pemberitahuan Perubahan Data Perseroan Nomor ${sp.number}`;
            if (sp.type === "SP_ANGGARAN_DASAR")
              return `Surat Penerimaan Pemberitahuan Perubahan Anggaran Dasar Nomor ${sp.number}`;
            return `Surat Penerimaan Pemberitahuan Nomor ${sp.number}`;
          });

          const spDates = Array.from(new Set(sps.map((s) => s.date)));
          let spDateText = "";
          if (spDates.length === 1) {
            spDateText = ` ${sps.length > 1 ? (sks.length > 0 ? "ketiganya " : "keduanya ") : ""}tertanggal ${formatDateRupst(spDates[0])}`;
          } else {
            spDateText = ` masing-masing tertanggal sebagaimana tercantum dalam surat tersebut`;
          }

          spParts.push(
            `Pemberitahuannya telah diterima dan dicatat dalam Sistem Administrasi Badan Hukum Kementerian Hukum Republik Indonesia berdasarkan ${spDescParts.join(" dan ")}${spDateText}`,
          );
        }

        skText = [...skParts, ...spParts].join(" dan ");
      } else {
        skText = `telah mendapat pengesahan berdasarkan Surat Keputusan Nomor ${deed.skNumber} tanggal ${formatDateRupst(deed.skDate)}`;
      }

      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 0.5,
        runs: [
          {
            text: `Akta tertanggal ${tglDeedFormatted} Nomor ${deed.number} yang dibuat di hadapan ${checkNotaryWording(deed.notary, deed.notaryTitle, deed.notaryDomicile)} yang ${skText}${isLast ? "." : ";"}`,
          },
        ],
      });
    });
  }

  const invitationNum = data.rupstInvitationNumber;
  const invitationDate = data.rupstInvitationDate;
  const tglUndanganValue = formatDateRupst(invitationDate || "");

  const invitationRuns: FormatToken[] = [
    { text: "Rapat Umum Pemegang Saham Tahunan Nomor: " }
  ];

  if (invitationNum) {
    invitationRuns.push({ text: invitationNum });
  } else {
    invitationRuns.push({ text: "[nomor surat]", highlight: "yellow" });
  }

  invitationRuns.push({ text: " tertanggal " });

  if (invitationDate) {
    invitationRuns.push({ text: tglUndanganValue });
  } else {
    invitationRuns.push({ text: "[tanggal surat]", highlight: "yellow" });
  }

  invitationRuns.push({ text: " dan diadakan pada:" });

  blocks.push({
    type: "p",
    runs: invitationRuns
  });

  const isVenueDefault = !data.signingPlace;
  const isDateDefault = !signingDate;

  blocks.push(
    { 
      type: "p", 
      runs: [
        { text: "Hari/Tanggal\t: " },
        { text: `${tglRapatHari}, tanggal ${tglRapatRupst}`, highlight: isDateDefault ? "yellow" : undefined }
      ] 
    },
    { 
      type: "p", 
      runs: [
        { text: "Tempat\t: " },
        { text: data.signingPlace || "Kantor Perseroan", highlight: isVenueDefault ? "yellow" : undefined }
      ] 
    },
    { 
      type: "p", 
      runs: [
        { text: "Waktu\t: " },
        { text: isTimeDefault ? `${jamRapatStr} WIB` : `${jamRapatStr} WIB (${jamRapatWords})`, highlight: isTimeDefault ? "yellow" : undefined }
      ] 
    }
  );

  blocks.push({ type: "br" });

  // 3. Attendance
  blocks.push({ type: "p", runs: [{ text: "II. PESERTA RAPAT", bold: true }] });
  blocks.push({
    type: "p",
    runs: [{ text: "Bahwa dalam rapat telah hadir dan/atau mewakili antara lain :" }]
  });

  const fullyDescribedNames = new Set<string>();

  const getPersonDetailRuns = (person: any): FormatToken[] => {
    let nameUpper = (person?.name || "").toUpperCase().trim();
    const isBadanHukum = person?.shareholderType === 'BADAN_HUKUM' || person?.legalEntityType;
    let salutation = (person?.salutation || "Tuan").trim();
    
    // Improved salutation stripping (handles multiple spaces and common variations)
    const salUpper = salutation.toUpperCase();
    const stripRegex = new RegExp(`^(${salUpper}|TUAN|NYONYA|NONA|NY|TN|NY\\.|TN\\.|NYONYA\\.|TUAN\\.)\\s+`, "i");
    if (stripRegex.test(nameUpper)) {
      nameUpper = nameUpper.replace(stripRegex, "").trim();
    }

    const sal = (!isBadanHukum) ? `${salutation} ` : "";
    
    if (fullyDescribedNames.has(nameUpper)) {
      return [{ text: sal }, { text: nameUpper, bold: true }, { text: ", tersebut diatas" }];
    }
    
    fullyDescribedNames.add(nameUpper);
    const tglAngka = person?.birthDate ? formatDateRupst(person.birthDate) : "...";
    const tglHuruf = "";
    return [
      { text: sal },
      { text: nameUpper, bold: true },
      { text: formatPersonDetails(person, tglAngka, tglHuruf) }
    ];
  };

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
    const runsList: FormatToken[] = [];
    runsList.push(...getPersonDetailRuns(att.sourceObj));

    blocks.push({
      type: "list",
      bullet: `${idx + 1}.`,
      indentTabs: 0,
      runs: runsList
    });

    // - Dalam hal ini hadir selaku :
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 1,
      runs: [{ text: "Dalam hal ini hadir selaku :" }]
    });

    const totalSubBullets = (att.management ? 1 : 0) + (att.ownShares ? 1 : 0) + att.representations.length;

    if (totalSubBullets === 1) {
      if (att.management) {
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1,
          runs: [
            { text: ` selaku ` },
            { text: `${toTitleCase(att.management.position)} Perseroan.` }
          ]
        });
      } else if (att.ownShares) {
        const shareRp = (att.ownShares.sharesOwned || 0) * (data.originalSharePrice || 0);
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1,
          runs: [{ text: ` selaku Pemilik dan pemegang saham sebanyak ${formatNumber(att.ownShares.sharesOwned)} (${terbilang(att.ownShares.sharesOwned)}) lembar saham atau senilai Rp. ${formatNumber(shareRp)},- (${terbilang(shareRp)} rupiah) berhak mengeluarkan suara ${formatNumber(att.ownShares.sharesOwned)} (${terbilang(att.ownShares.sharesOwned)}) suara dalam rapat.` }]
        });
      } else if (att.representations.length === 1) {
        const r = att.representations[0];
        const isDirector = r.proxyData.representationType === 'DIREKTUR_PT_LAIN';
        const shareRp = (r.sharesOwned || 0) * (data.originalSharePrice || 0);

        let repTextRuns: FormatToken[] = [];
        if (isDirector) {
          repTextRuns.push({ text: `selaku Direktur dari ` });
          repTextRuns.push(...getPersonDetailRuns(r.shareholder));
        } else {
          const proxyDate = r.proxyData.proxyDeedDate ? formatDateRupst(r.proxyData.proxyDeedDate) : "__________";
          repTextRuns.push({ text: `selaku penerima kuasa berdasarkan Surat Kuasa tertanggal ${proxyDate}, dari dan oleh karena itu sah bertindak untuk dan atas nama ` });
          repTextRuns.push(...getPersonDetailRuns(r.shareholder));
        }

        repTextRuns.push({
          text: `, yang dalam hal ini merupakan pemilik dan pemegang saham sebanyak ${formatNumber(r.sharesOwned)} (${terbilang(r.sharesOwned)}) lembar saham atau senilai Rp. ${formatNumber(shareRp)},- (${terbilang(shareRp)} rupiah) berhak mengeluarkan suara ${formatNumber(r.sharesOwned)} (${terbilang(r.sharesOwned)}) suara dalam rapat.`
        });

        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1,
          runs: repTextRuns
        });
      }
    } else if (totalSubBullets > 1) {
      let subBulletCode = 'a'.charCodeAt(0);
      let bulletIdx = 0;

      // a. Management position
      if (att.management) {
        bulletIdx++;
        blocks.push({
          type: "list",
          bullet: String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
          indentTabs: 2,
          runs: [{ text: `selaku ${att.management.position} Perseroan.` }]
        });
      }

      // b. Own Shares
      if (att.ownShares) {
        bulletIdx++;
        const shareRp = (att.ownShares.sharesOwned || 0) * (data.originalSharePrice || 0);
        blocks.push({
          type: "list",
          bullet: String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
          indentTabs: 2,
          runs: [{ text: `selaku Pemilik dan pemegang saham sebanyak ${formatNumber(att.ownShares.sharesOwned)} (${terbilang(att.ownShares.sharesOwned)}) lembar saham atau senilai Rp. ${formatNumber(shareRp)},- (${terbilang(shareRp)} rupiah) berhak mengeluarkan suara ${formatNumber(att.ownShares.sharesOwned)} (${terbilang(att.ownShares.sharesOwned)}) suara dalam rapat.` }]
        });
      }

      // c. Representations: Proxy / Director of other PT
      att.representations.forEach(r => {
        bulletIdx++;
        const isDirector = r.proxyData.representationType === 'DIREKTUR_PT_LAIN';
        const shareRp = (r.sharesOwned || 0) * (data.originalSharePrice || 0);

        let repTextRuns: FormatToken[] = [];
        if (isDirector) {
          repTextRuns.push({ text: `selaku Direktur dari ` });
          repTextRuns.push(...getPersonDetailRuns(r.shareholder));
        } else {
          const proxyDate = r.proxyData.proxyDeedDate ? formatDateRupst(r.proxyData.proxyDeedDate) : "__________";
          repTextRuns.push({ text: `selaku penerima kuasa berdasarkan Surat Kuasa tertanggal ${proxyDate}, dari dan oleh karena itu sah bertindak untuk dan atas nama ` });
          repTextRuns.push(...getPersonDetailRuns(r.shareholder));
        }

        repTextRuns.push({
          text: `, yang dalam hal ini merupakan pemilik dan pemegang saham sebanyak ${formatNumber(r.sharesOwned)} (${terbilang(r.sharesOwned)}) lembar saham atau senilai Rp. ${formatNumber(shareRp)},- (${terbilang(shareRp)} rupiah) berhak mengeluarkan suara ${formatNumber(r.sharesOwned)} (${terbilang(r.sharesOwned)}) suara dalam rapat.`
        });

        blocks.push({
          type: "list",
          bullet: String.fromCharCode(subBulletCode + bulletIdx - 1) + ".",
          indentTabs: 2,
          runs: repTextRuns
        });
      });
    }
  });

  const totalValue = totalShares * (data.originalSharePrice || 0);
  blocks.push({
    type: "p",
    runs: [{ text: `Bahwa dari semua saham yang telah dikeluarkan tersebut diatas, yaitu ${formatNumber(totalShares)} (${terbilang(totalShares)}) lembar saham atau senilai Rp. ${formatNumber(totalValue)},- (${terbilang(totalValue)} rupiah).` }]
  });

  blocks.push({ type: "br" });

  // 4. Chair
  const chairName = (data.meetingChair || "...").toUpperCase();
  // const chairSalutation = data.shareholders.find(s => s.name === data.meetingChair)?.salutation || "Tuan";
  blocks.push({ type: "p", runs: [{ text: "III. KETUA RAPAT", bold: true }] });
  blocks.push({
    type: "p",
    runs: [
      { text: `Berdasarkan ketentuan anggaran dasar perseroan Pasal ${data.rupstAdArticle || "9"} ayat ${data.rupstAdParagraph || "6"}, maka ` },
      { text: chairName, bold: true },
      { text: `, tersebut di atas, bertindak sebagai ketua rapat.` }
    ]
  });

  blocks.push({ type: "br" });

  // 5. Agenda
  blocks.push({ type: "p", runs: [{ text: "IV. AGENDA RAPAT", bold: true }] });
  blocks.push({ type: "p", runs: [{ text: "Rapat ini diadakan dengan agenda rapat sebagai berikut :" }] });
  const agendas = [
    `Persetujuan Laporan Tahunan Perseroan Tahun Buku ${fiscalYear};`,
    `Pengesahan Laporan Keuangan Perseroan Tahun Buku ${fiscalYear};`,
    "Penetapan penggunaan laba bersih Perseroan;",
    "Pemberian pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris;"
  ];

  agendas.forEach((agenda, idx) => {
    blocks.push({
      type: "list",
      bullet: "-",
      runs: [{ text: agenda }]
    });
  });

  blocks.push({ type: "br" });

  // V. JALANNYA RAPAT
  blocks.push({ type: "p", runs: [{ text: "V. JALANNYA RAPAT", bold: true }] });
  blocks.push({
    type: "p",
    runs: [{ text: `Ketua rapat membuka dan memimpin rapat dengan terlebih dahulu menjelaskan bahwa para pemegang saham perseroan telah hadir dan/atau diwakili oleh ${formatNumber(presentShares)} Saham perseroan yang telah ditempatkan dan diambil bagian-bagian hingga hari ini, oleh karena itu, sesuai dengan ketentuan Anggaran dasar Perseroan Pasal ${data.rupstQuorumArticle || "10"} ayat ${data.rupstQuorumParagraph || "1"} mengenai Kuorum, Rapat ini adalah sah sesuai dengan Kuorum dan berhak mengambil keputusan-keputusan yang sah serta mengikat mengenai hal-hal yang dibicarakan.` }]
  });

  blocks.push({ type: "br" });

  // 6. Resolutions
  blocks.push({ type: "p", runs: [{ text: "VI. KEPUTUSAN_KEPUTUSAN", bold: true }] });
  blocks.push({
    type: "p",
    runs: [{ text: "Setelah laporan-laporan dan usul-usul tersebut dibicarakan dan dibahas dalam Rapat, maka Rapat dengan suara bulat memutuskan hal-hal sebagai berikut:" }]
  });

  // Resolution 6 (Kuasa) Helper (Common for both)
  const rep = data.representativeType === "MANUAL" ? data.manualRepresentative : data.shareholders.find((s) => s.id === data.authorizedRepresentativeId);
  let repRuns: FormatToken[] = [];
  if (data.representativeType === "MANUAL" && rep) {
    const repName = (rep.name || "").toUpperCase();
    const salutation = rep.salutation || "Tuan";
    const tglAngka = rep.birthDate ? formatDateRupst(rep.birthDate) : "...";
    const details = formatPersonDetails(rep, tglAngka, "");
    repRuns = [
      { text: `Memberikan kuasa kepada ` },
      { text: `${salutation} ` },
      { text: repName, bold: true },
      { text: `${details}, ` },
      { text: `untuk melakukan segala tindakan yang diperlukan sehubungan dengan hasil keputusan RUPS Tahunan ini, termasuk namun tidak terbatas pada pengurusan pelaporan kepada instansi yang berwenang.` }
    ];
  } else {
    const repName = rep ? rep.name.toUpperCase() : (data.meetingChair || "RAJANDRAN SHUNMUGAM").toUpperCase();
    const foundSh = data.shareholders.find(s => s.name.toUpperCase() === repName);
    const salutation = foundSh?.salutation || "Tuan";
    repRuns = [
      { text: `Memberikan kuasa kepada ` },
      { text: `${salutation} ` },
      { text: repName, bold: true },
      { text: ` tersebut diatas, untuk melakukan segala tindakan yang diperlukan sehubungan dengan hasil keputusan RUPS Tahunan ini, termasuk namun tidak terbatas pada pengurusan pelaporan kepada instansi yang berwenang.` }
    ];
  }

  if (data.rupstIsAudited === false) {
    // === NON-AUDIT GENERATION ===
    blocks.push({
      type: "list",
      bullet: "1.",
      indentStyle: "keputusan",
      runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${formatCompanyName(data.companyName)} yang menyatakan bahwa status perseroan ini merupakan PT. Tertutup yang Laporan Keuangannya Tidak Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:` }]
    });

    const reasonsAudit = [];
    if (data.rupstAlasanAuditA !== false) reasonsAudit.push("Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.");
    if (data.rupstAlasanAuditB !== false) reasonsAudit.push("Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.");
    if (data.rupstAlasanAuditC !== false) reasonsAudit.push("Perseroan tidak merupakan Perseroan Terbuka (Tbk).");
    if (data.rupstAlasanAuditD !== false) reasonsAudit.push("Perseroan tidak merupakan Persero.");
    if (data.rupstAlasanAuditE !== false) reasonsAudit.push("Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau");
    if (data.rupstAlasanAuditF !== false) reasonsAudit.push("Tidak diwajibkan oleh peraturan perundang-undangan.");

    if (reasonsAudit.length === 0) {
      reasonsAudit.push(
        "Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.",
        "Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.",
        "Perseroan tidak merupakan Perseroan Terbuka (Tbk).",
        "Perseroan tidak merupakan Persero.",
        "Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau",
        "Tidak diwajibkan oleh peraturan perundang-undangan."
      );
    }

    reasonsAudit.forEach((reason, index) => {
      blocks.push({
        type: "list",
        bullet: String.fromCharCode(97 + index) + ".", // a., b., c.
        indentTabs: 1, 
        indentStyle: "keputusan",
        runs: [{ text: reason }]
      });
    });

    blocks.push({
      type: "list",
      bullet: "",
      indentStyle: "keputusan",
      runs: [{ text: "Direksi dan Komisaris serta Para Pemegang Saham Perseroan menyatakan bertanggung jawab penuh atas Kebenaran Informasi dan Tanda Tangan pada seluruh Lampiran Laporan terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini." }]
    });

    blocks.push({
      type: "list",
      bullet: "2.",
      indentStyle: "keputusan",
      runs: [{ text: `Menyetujui dan menerima dengan baik Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${fiscalYear}.` }]
    });

    const financialDateStr = data.rupstFinancialReportDate ? formatDateRupst(data.rupstFinancialReportDate) : '............................';
    const financialPos = data.rupstFinancialReportSignatoryPosition || 'Direktur';
    let financialSignatory = (data.rupstFinancialReportSignatoryName ? data.rupstFinancialReportSignatoryName : '............................').toUpperCase();
    const signatorySh = data.shareholders?.find(s => s.name?.toUpperCase() === financialSignatory || s.name === data.rupstFinancialReportSignatoryName);
    const signatorySalutation = signatorySh?.salutation || "Tuan";
    
    const sigSalUpper = `${signatorySalutation.toUpperCase()} `;
    if (financialSignatory.startsWith(sigSalUpper)) {
      financialSignatory = financialSignatory.substring(sigSalUpper.length);
    }

    blocks.push({
      type: "list",
      bullet: "3.",
      indentStyle: "keputusan",
      runs: [{ text: `Mengesahkan Laporan Keuangan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${fiscalYear}, sebagaimana dimuat dalam Laporan Keuangan ${formatCompanyName(data.companyName)} tanggal ${financialDateStr}, yang ditandatangani oleh ${financialPos} Perseroan ${signatorySalutation} ${financialSignatory} yang terdiri dari:` }]
    });

    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 1,
      indentStyle: "keputusan",
      runs: [{ text: "Laporan Keuangan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }]
    });

    let netProfitText1 = "";
    const isNeg = (data.rupstNetProfit !== undefined) && (data.rupstNetProfit < 0);
    const absVal = Math.abs(data.rupstNetProfit || 0);
    const amtStr = `Rp. ${formatNumber(absVal)},- (${terbilang(absVal)} rupiah)`;
    const retProfStr = `Rp. ${formatNumber(Math.abs(data.rupstRetainedProfit || 0))},- (${terbilang(Math.abs(data.rupstRetainedProfit || 0))} rupiah)`;

    if (isNeg) {
      netProfitText1 = `Menetapkan Perseroan mengalami rugi bersih untuk tahun buku ${fiscalYear} sebesar ${amtStr}, dan oleh karenanya memutuskan bahwa tidak terdapat laba bersih yang dapat dibagikan sebagai dividen kepada para pemegang saham untuk Tahun Buku ${fiscalYear}. Seluruh saldo rugi tersebut akan dicatat sebagai akumulasi rugi Perseroan sesuai ketentuan peraturan perundang-undangan yang berlaku.`;
    } else {
      netProfitText1 = `Menetapkan Perseroan mengalami laba bersih untuk tahun buku ${fiscalYear} sebesar ${amtStr}, dengan saldo laba ditahan Perseroan sampai dengan tahun buku ${Number(fiscalYear)-1} sebesar ${retProfStr}.\nsehubungan dengan hal tersebut:`;
    }

    blocks.push({
      type: "list",
      bullet: "4.",
      indentStyle: "keputusan",
      runs: [{ text: netProfitText1 }]
    });

    if (!isNeg) {
      if (data.rupstDividendAmount && data.rupstDividendAmount > 0) {
        const divAmt = data.rupstDividendAmount || 0;
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1,
          indentStyle: "keputusan",
          runs: [{ text: `Sebesar Rp. ${formatNumber(divAmt)},- (${terbilang(divAmt)} rupiah) dibagikan sebagai dividen.` }]
        });
        const netProfit = data.rupstNetProfit || 0;
        const previousRetained = data.rupstRetainedProfit || 0;
        const totalLabaDitahan = netProfit + previousRetained - divAmt;
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1,
          indentStyle: "keputusan",
          runs: [{ text: `Laba bersih tahun berjalan sebesar Rp. ${formatNumber(netProfit)},- (${terbilang(netProfit)} rupiah) ditambah saldo laba ditahan tahun sebelumnya sebesar Rp. ${formatNumber(previousRetained)},- (${terbilang(previousRetained)} rupiah) setelah dikurangi dividen, maka total saldo laba ditahan Perseroan menjadi sebesar Rp. ${formatNumber(totalLabaDitahan)},- (${terbilang(totalLabaDitahan)} rupiah).` }]
        });
      } else {
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1,
          indentStyle: "keputusan",
          runs: [{ text: "Perseroan tidak membagikan dividen kepada para pemegang saham;" }]
        });
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 1,
          indentStyle: "keputusan",
          runs: [{ text: `Laba bersih tahun berjalan sebesar Rp. ${formatNumber(data.rupstNetProfit || 0)},- (${terbilang(data.rupstNetProfit || 0)} rupiah) ditambah saldo laba ditahan tahun sebelumnya sebesar Rp. ${formatNumber(data.rupstRetainedProfit || 0)},- (${terbilang(data.rupstRetainedProfit || 0)} rupiah) sehingga total saldo laba ditahan Perseroan menjadi sebesar Rp. ${formatNumber((data.rupstNetProfit || 0) + (data.rupstRetainedProfit || 0))},- (${terbilang((data.rupstNetProfit || 0) + (data.rupstRetainedProfit || 0))} rupiah).` }]
        });
      }
    }

    blocks.push({
      type: "list",
      bullet: "5.",
      indentStyle: "keputusan",
      runs: [{ text: `Memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris Perseroan atas tindakan pengurusan dan pengawasan yang telah dijalankan selama tahun buku ${fiscalYear}, sejauh tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan Perseroan;` }]
    });

    // Kuasa is item 6
    blocks.push({
      type: "list",
      bullet: "6.",
      indentStyle: "keputusan",
      runs: repRuns
    });

  } else {
    // === AUDITED / ORIGINAL GENERATION ===
    blocks.push({
      type: "list",
      bullet: "1.",
      indentStyle: "keputusan",
      runs: [{ text: `Menyetujui Laporan Tahunan Perseroan Tahun Buku ${fiscalYear} dan Mengesahkan Laporan Keuangan Perseroan Tahun Buku ${fiscalYear} yang telah diajukan oleh Direksi.` }]
    });

    let netProfitText = "";
    if (data.rupstNetProfit !== undefined) {
      const isNeg = data.rupstNetProfit < 0;
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
      type: "list",
      bullet: "2.",
      indentStyle: "keputusan",
      runs: [{ text: netProfitText }]
    });

    blocks.push({
      type: "list",
      bullet: "3.",
      indentStyle: "keputusan",
      runs: [{ text: `Memberikan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada para anggota Direksi dan Dewan Komisaris atas tindakan pengurusan dan pengawasan yang telah mereka lakukan selama tahun buku tersebut, sepanjang tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan.` }]
    });

    blocks.push({
      type: "list",
      bullet: "4.",
      indentStyle: "keputusan",
      runs: [{ text: `Menyatakan bahwa Laporan Keuangan Perseroan untuk tahun buku tersebut ${data.rupstIsAudited ? "telah diaudit oleh Akuntan Publik" : "tidak memenuhi kriteria wajib audit berdasarkan ketentuan yang berlaku"}.` }]
    });

    blocks.push({
      type: "list",
      bullet: "5.",
      indentStyle: "keputusan",
      runs: repRuns
    });
  }

  // 7. Closing
  blocks.push({ type: "br" });
  blocks.push({
    type: "p",
    runs: [{ text: "VII. PENUTUP", bold: true }]
  });

  const endStTime = data.rupstMeetingEndTime;
  const jamTutup = endStTime ? endStTime.replace(":", ".") : "00.00";
  const isEndDefault = !endStTime;
  blocks.push({
    type: "p",
    runs: [
      { text: `Akhirnya, oleh karena sudah tidak ada hal-hal lain yang perlu dibicarakan lagi, maka Ketua Rapat menutup Rapat ini pada jam ` },
      { text: `${jamTutup} WIB`, highlight: isEndDefault ? "yellow" : undefined },
      { text: "." }
    ]
  });

  blocks.push({ type: "br" });

  blocks.push({
    type: "p",
    runs: [{ text: "KETUA RAPAT,", bold: true }]
  });

  blocks.push({ type: "br" });

  blocks.push({
    type: "p",
    runs: [{ text: "Meterai Rp.10.000,- + cap perusahan", color: "FF0000", size: 12 }]
  });

  blocks.push({ type: "br" });
  blocks.push({ type: "br" });
  blocks.push({ type: "br" });

  blocks.push({
    type: "p",
    runs: [{ text: (data.meetingChair || "").toUpperCase(), bold: true, underline: true }]
  });

  blocks.push({
    type: "p",
    runs: [{ text: (data.meetingChairPosition || "Direktur"), bold: true }]
  });

  // Tanda Tangan Peserta Rapat
  blocks.push({ type: "br" });

  blocks.push({
    type: "p",
    runs: [{ text: "TANDA TANGAN PESERTA RAPAT :", bold: true }]
  });

  blocks.push({ type: "br" });

  const tandaTanganChairName = (data.meetingChair || "").toUpperCase();
  const formatParticipantName = (sh: any) => {
    if (sh.isProxy && sh.proxyData && sh.proxyData.name) {
      return `${sh.proxyData.name.toUpperCase()} qq ${sh.name.toUpperCase()}`;
    }
    return sh.name.toUpperCase();
  };

  const participants = data.shareholders.filter(sh => (sh.sharesOwned > 0 || sh.isPresent) && sh.name.toUpperCase() !== tandaTanganChairName);
  blocks.push({
    type: "participantSigs",
    participants
  });

  // Daftar Hadir
  blocks.push({ type: "pageBreak" });

  blocks.push({
    type: "p",
    align: "center",
    runs: [{ text: "DAFTAR HADIR", bold: true }]
  });
  blocks.push({
    type: "p",
    align: "center",
    runs: [{ text: "RAPAT UMUM PEMEGANG SAHAM TAHUNAN", bold: true }]
  });
  blocks.push({
    type: "p",
    align: "center",
    runs: [{ text: formatCompanyName(data.companyName), bold: true }]
  });
  blocks.push({
    type: "p",
    align: "center",
    runs: [{ text: `TANGGAL ${tglRapatRupst}`, bold: true }]
  });

  blocks.push({ type: "br" });

  blocks.push({
    type: "table",
    headers: ["NO", "NAMA", "KEDUDUKAN", "TANDATANGAN"],
    widths: [800, 3000, 3000, 1704],
    rows: data.shareholders.filter(sh => sh.sharesOwned > 0 || sh.isPresent).map((sh, idx) => {
      const positions = [];
      if (sh.isManagement && sh.managementPosition) {
        positions.push(sh.managementPosition);
      }
      if (sh.sharesOwned > 0) {
        positions.push("pemegang saham");
      }
      const kedudukanLines = positions.length > 0 ? positions.join("\n&\n") : "-";

      return [
        `${idx + 1}.`,
        formatParticipantName(sh),
        kedudukanLines,
        ""
      ];
    })
  });

  return blocks;
};