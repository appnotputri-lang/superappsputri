import { CompanyData, Shareholder } from "../../types";
import { FormatToken } from "./notaryWrapper";
import {
  getDayName,
  dateToWords,
  formatDateStr,
  timeToWords,
  terbilang,
  toTitleCase,
  formatNumber,
  formatCompanyName,
  formatPersonDetails,
} from "./formatter";

export type Block =
  | {
      type: "p";
      runs: FormatToken[];
      align?: "left" | "center" | "right" | "right-center";
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
    };

export const generateRupstBlocks = (data: CompanyData): Block[] => {
  const blocks: Block[] = [];

  const tglRapatHari = getDayName(data.signingDate);
  const tglRapatHuruf = dateToWords(data.signingDate);
  const tglRapatAngka = formatDateStr(data.signingDate);

  const jamStr = data.meetingStartTime ? data.meetingStartTime.replace(":", ".") : "10.00";
  const jamPenutup = data.rupstMeetingEndTime ? data.rupstMeetingEndTime.replace(":", ".") : "11.00";

  // PESERTA RAPAT
  const attendingShareholders = data.shareholders.filter(s => s.isPresent);
  const totalShares = data.shareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0);
  const presentShares = attendingShareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0);
  const presentRp = presentShares * (data.originalSharePrice || 0);

  // 1. Title
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "NOTULEN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: "RAPAT UMUM PEMEGANG SAHAM TAHUNAN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: formatCompanyName(data.companyName), bold: true }] },
    { type: "p", align: "center", runs: [{ text: "--------------------------------------------------------------------------------------------------------------------" }] }
  );

  // I. RAPAT
  blocks.push(
    { type: "p", runs: [{ text: "I. RAPAT", bold: true }] },
    {
      type: "p",
      runs: [
        { text: `Rapat Umum Pemegang Saham Tahunan ` },
        { text: `"${formatCompanyName(data.companyName)}"`, bold: true },
        { text: ` (selanjutnya disebut sebagai "Rapat") Perseroan yang berkedudukan di ${data.domicileStyle === 'KABUPATEN' ? 'Kabupaten ' : 'Kota '}${toTitleCase(data.domicile || "...")}, demikian berdasarkan Akta Pendirian tertanggal ${dateToWords(data.establishmentDeedDate || "")} (${formatDateStr(data.establishmentDeedDate || "")}), No. ${data.establishmentDeedNumber || "..."}, yang dibuat dihadapan ${data.establishmentNotary || "..."}, Notaris di ${toTitleCase(data.establishmentNotaryDomicile || "...")} dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${dateToWords(data.establishmentSkDate || "")} (${formatDateStr(data.establishmentSkDate || "")}) Nomor ${data.establishmentSkNumber || "..."}${data.amendmentDeeds && data.amendmentDeeds.length > 0 ? ", beberapa kali telah mengalami perubahan, berdasarkan :" : "."}` }
      ]
    }
  );

  if (data.amendmentDeeds && data.amendmentDeeds.length > 0) {
    data.amendmentDeeds.forEach((deed) => {
      const skDoc = deed.skSpDocuments?.find(d => d.type === 'SK') || (deed.skNumber ? { number: deed.skNumber, date: deed.skDate } : null);
      const spDoc = deed.skSpDocuments?.find(d => d.type === 'SP' || d.type === 'SP_DATA_PERSEROAN' || d.type === 'SP_ANGGARAN_DASAR');

      let textContent = `Akta Pernyataan Keputusan Rapat Umum Para Pemegang Saham Luar Biasa tertanggal ${dateToWords(deed.date)} (${formatDateStr(deed.date)}) Nomor ${deed.number}, yang dibuat di hadapan ${deed.notary}${deed.notaryTitle ? `, ${deed.notaryTitle}` : ""}, Notaris di ${deed.notaryDomicile}`;

      if (skDoc && skDoc.number) {
        textContent += ` dan telah mendapat persetujuan dari Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${dateToWords(skDoc.date)} Nomor ${skDoc.number}`;
      }

      if (spDoc && spDoc.number) {
        textContent += `, serta telah dilaporkan ke Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${dateToWords(spDoc.date)} Nomor ${spDoc.number}`;
      } else if (!skDoc) {
        // Fallback for legacy data that might be stored in skNumber/skDate as report
        textContent += ` telah dilaporkan ke Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${dateToWords(deed.skDate)} Nomor ${deed.skNumber}`;
      }

      textContent += ".";

      blocks.push({
        type: "list",
        bullet: "-",
        runs: [{ text: textContent }]
      });
    });
  }

  blocks.push(
    {
      type: "p",
      runs: [
        { text: "Rapat ini diselenggarakan berdasarkan Surat Pemanggilan Rapat Umum Pemegang Saham Tahunan Nomor: " },
        { text: data.rupstInvitationNumber || "[nomor surat]", color: data.rupstInvitationNumber ? undefined : "FF0000" },
        { text: " tertanggal " },
        { text: data.rupstInvitationDate ? dateToWords(data.rupstInvitationDate) : "[isi tanggal surat pemanggilan]", color: data.rupstInvitationDate ? undefined : "FF0000" },
        { text: " (" },
        { text: data.rupstInvitationDate ? formatDateStr(data.rupstInvitationDate) : "[tanggal surat]", color: data.rupstInvitationDate ? undefined : "FF0000" },
        { text: ") dan diadakan pada:" }
      ]
    },
    { type: "p", runs: [{ text: "Hari/Tanggal" }, { text: "\t: " }, { text: data.signingDate ? `${tglRapatHari} / ${tglRapatAngka}` : "" }], indent: true },
    { type: "p", runs: [{ text: "Tempat" }, { text: "\t: " }, { text: data.signingPlace ? `${data.signingPlace}` : "" }], indent: true },
    { type: "p", runs: [{ text: "Waktu" }, { text: "\t: " }, { text: data.meetingStartTime ? `Pukul ${data.meetingStartTime.replace(":", ".")} WIB` : "" }], indent: true },
    { type: "br" }
  );

  // II. PESERTA RAPAT
  blocks.push(
    { type: "p", runs: [{ text: "II. PESERTA RAPAT", bold: true }] },
    { type: "p", runs: [{ text: "Bahwa dalam rapat telah hadir dan/atau mewakili antara lain :" }] }
  );

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
    blocks.push({
      type: "list",
      bullet: `${idx + 1}.`,
      runs: [
        { text: att.salutation ? `${att.salutation} ` : "" },
        { text: att.name.toUpperCase(), bold: true },
        { text: formatPersonDetails(att.sourceObj, formatDateStr(att.sourceObj.birthDate), dateToWords(att.sourceObj.birthDate)) }
      ]
    });

    let roleCount = 0;
    if (att.ownShares) roleCount++;
    if (att.management) roleCount++;
    roleCount += att.representations.length;

    if (roleCount === 1 && att.management) {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1,
        runs: [{ text: `Dalam hal ini hadir selaku ${toTitleCase(att.management.position)} Perseroan.` }]
      });
    } else {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1,
        runs: [{ text: "Dalam hal ini hadir selaku :" }]
      });

      let subBulletCode = 'a'.charCodeAt(0);

      // a. Own Shares
      if (att.ownShares) {
        const bulletChar = String.fromCharCode(subBulletCode++) + ".";
        const totalRp = att.ownShares.sharesOwned * (data.originalSharePrice || 0);
        blocks.push({
          type: "list",
          bullet: bulletChar,
          indentTabs: 2,
          runs: [
            { text: "Pemilik dan pemegang saham sebanyak " },
            { text: `${formatNumber(att.ownShares.sharesOwned)}`, bold: true },
            { text: ` (${terbilang(att.ownShares.sharesOwned)}) lembar saham atau senilai ` },
            { text: `Rp. ${formatNumber(totalRp)},-`, bold: true },
            { text: ` (${terbilang(totalRp)} rupiah) berhak mengeluarkan suara ` },
            { text: `${formatNumber(att.ownShares.sharesOwned)}`, bold: true },
            { text: ` (${terbilang(att.ownShares.sharesOwned)}) suara dalam rapat.` }
          ]
        });
      }

      // b. Management position
      if (att.management) {
        const bulletChar = String.fromCharCode(subBulletCode++) + ".";
        blocks.push({
          type: "list",
          bullet: bulletChar,
          indentTabs: 2,
          runs: [{ text: `${toTitleCase(att.management.position)} Perseroan.` }]
        });
      }

      // c. Representative roles
      att.representations.forEach(rep => {
        const bulletChar = String.fromCharCode(subBulletCode++) + ".";
        const totalRp = rep.sharesOwned * (data.originalSharePrice || 0);
        const isDirector = rep.proxyData.representationType === 'DIREKTUR_PT_LAIN';

        if (isDirector) {
          blocks.push({
            type: "list",
            bullet: bulletChar,
            indentTabs: 2,
            runs: [
              { text: "Direktur dari " },
              { text: rep.shareholder.name.toUpperCase(), bold: true },
              { text: formatPersonDetails(rep.shareholder, formatDateStr(rep.shareholder.birthDate), dateToWords(rep.shareholder.birthDate)) },
              { text: ", Pemilik dan pemegang saham sebanyak " },
              { text: `${formatNumber(rep.sharesOwned)}`, bold: true },
              { text: ` (${terbilang(rep.sharesOwned)}) lembar saham atau senilai Rp. ` },
              { text: `${formatNumber(totalRp)},-`, bold: true },
              { text: ` (${terbilang(totalRp)} rupiah) berhak mengeluarkan suara ` },
              { text: `${formatNumber(rep.sharesOwned)}`, bold: true },
              { text: ` (${terbilang(rep.sharesOwned)}) suara dalam rapat.` }
            ]
          });
        } else {
          const proxyDateWords = rep.proxyData.proxyDeedDate ? dateToWords(rep.proxyData.proxyDeedDate) : "__________";
          const proxyDateAngka = rep.proxyData.proxyDeedDate ? formatDateStr(rep.proxyData.proxyDeedDate) : "__________";
          blocks.push({
            type: "list",
            bullet: bulletChar,
            indentTabs: 2,
            runs: [
              { text: "Kuasa dari " },
              { text: rep.shareholder.name.toUpperCase(), bold: true },
              { text: formatPersonDetails(rep.shareholder, formatDateStr(rep.shareholder.birthDate), dateToWords(rep.shareholder.birthDate)) },
              { text: ` berdasarkan Surat Kuasa tertanggal ${proxyDateWords} (${proxyDateAngka}), Pemilik dan pemegang saham sebanyak ` },
              { text: `${formatNumber(rep.sharesOwned)}`, bold: true },
            { text: ` (${terbilang(rep.sharesOwned)}) lembar saham atau senilai Rp. ` },
            { text: `${formatNumber(totalRp)},-`, bold: true },
            { text: ` (${terbilang(totalRp)} rupiah) berhak mengeluarkan suara ` },
            { text: `${formatNumber(rep.sharesOwned)}`, bold: true },
            { text: ` (${terbilang(rep.sharesOwned)}) suara dalam rapat.` }
          ]
        });
      }
    });
    }
  });

  const totalRp = presentShares * (data.originalSharePrice || 0);
  blocks.push(
    {
      type: "p",
      runs: [
        { text: `Bahwa dari semua saham yang telah dikeluarkan tersebut diatas, yaitu ` },
        { text: `${formatNumber(presentShares)}`, bold: true },
        { text: ` (${terbilang(presentShares)}) lembar saham atau senilai ` },
        { text: `Rp. ${formatNumber(totalRp)},-`, bold: true },
        { text: ` (${terbilang(totalRp)} rupiah)` }
      ]
    },
    { type: "br" }
  );

  // III. KETUA RAPAT
  const chairSh = data.shareholders.find(s => (s.name || "").toUpperCase() === (data.meetingChair || "").toUpperCase());
  const effectiveChairName = (chairSh?.isProxy && chairSh.proxyData) 
    ? chairSh.proxyData.name 
    : (data.meetingChair || chairSh?.name || "...");
    
  const effectiveChairSalutation = (chairSh?.isProxy && chairSh.proxyData)
    ? chairSh.proxyData.salutation
    : (chairSh?.salutation || "Tuan");

  blocks.push(
    { type: "p", runs: [{ text: "III. KETUA RAPAT", bold: true }] },
    {
      type: "p",
      runs: [
        { text: `Berdasarkan ketentuan Anggaran Dasar Perseroan Pasal ${data.rupstAdArticle || "9"} ayat ${data.rupstAdParagraph || "4"}, maka ` },
        { text: `${effectiveChairSalutation} ` },
        { text: effectiveChairName.toUpperCase(), bold: true },
        { text: `, tersebut di atas, bertindak sebagai ketua rapat.` }
      ]
    },
    { type: "br" }
  );

  // IV. AGENDA RAPAT
  blocks.push(
    { type: "p", runs: [{ text: "IV. AGENDA RAPAT", bold: true }] },
    { type: "p", runs: [{ text: "Rapat ini diadakan dengan agenda rapat sebagai berikut :" }] },
    { type: "list", bullet: "-", runs: [{ text: `Persetujuan Laporan Tahunan Perseroan Tahun Buku ${data.rupstFiscalYear || "2025"};` }] },
    { type: "list", bullet: "-", runs: [{ text: `Pengesahan Laporan Keuangan Perseroan Tahun Buku ${data.rupstFiscalYear || "2025"};` }] },
    { type: "list", bullet: "-", runs: [{ text: `Penetapan penggunaan laba bersih Perseroan;` }] },
    { type: "list", bullet: "-", runs: [{ text: `Pemberian pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris;` }] },
    { type: "br" }
  );

  // V. JALANNYA RAPAT
  blocks.push(
    { type: "p", runs: [{ text: "V. JALANNYA RAPAT", bold: true }] },
    {
      type: "p",
      runs: [
        { text: `Ketua rapat membuka dan memimpin rapat dengan terlebih dahulu menjelaskan bahwa para pemegang saham Perseroan telah hadir dan/atau diwakili oleh ${formatNumber(presentShares)} Saham Perseroan yang telah ditempatkan dan diambil bagian-bagian hingga hari ini, oleh karena itu, sesuai dengan ketentuan Anggaran dasar Perseroan Pasal ${data.rupstQuorumArticle || "22"} ayat ${data.rupstQuorumParagraph || "1"} mengenai Kuorum, Rapat ini adalah sah sesuai dengan Kuorum dan berhak mengambil keputusan-keputusan yang sah serta mengikat mengenai hal-hal yang dibicarakan.` }
      ]
    },
    { type: "br" }
  );

  // VI. KEPUTUSAN_KEPUTUSAN
  const signatorySh = data.shareholders.find(s => s.name === data.rupstFinancialReportSignatoryName);
  const signatorySalutation = signatorySh?.salutation || "Tuan";
  const signatoryName = data.rupstFinancialReportSignatoryName || "[Nama Direktur]";
  const signatoryPosition = data.rupstFinancialReportSignatoryPosition || "Direktur";

  const hasFinReportNumber = data.rupstFinancialReportNumber && data.rupstFinancialReportNumber.trim() !== "" && data.rupstFinancialReportNumber.trim() !== "0";
  const numText = hasFinReportNumber ? ` nomor ${data.rupstFinancialReportNumber}` : "";

  blocks.push(
    { type: "p", runs: [{ text: "VI. KEPUTUSAN_KEPUTUSAN", bold: true }] },
    { type: "p", runs: [{ text: "Setelah dilakukan pembahasan dan musyawarah, Rapat memutuskan dan menyetujui hal-hal sebagai berikut:" }] },
    {
      type: "list",
      bullet: "1.",
      indentStyle: "keputusan",
      runs: [{ text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${formatCompanyName(data.companyName)} yang menyatakan bahwa status perseroan ini merupakan PT. Tertutup yang Laporan Keuangannya Tidak Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:` }]
    }
  );

  let subBulletLetter = 97; // 'a'
  const advanceLetter = () => {
    const char = String.fromCharCode(subBulletLetter);
    subBulletLetter++;
    return char + ".";
  };

  if (data.rupstAlasanAuditA !== false) {
    blocks.push({ type: "list", bullet: advanceLetter(), indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat." }] });
  }
  if (data.rupstAlasanAuditB !== false) {
    blocks.push({ type: "list", bullet: advanceLetter(), indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat." }] });
  }
  if (data.rupstAlasanAuditC !== false) {
    blocks.push({ type: "list", bullet: advanceLetter(), indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Perseroan tidak merupakan Perseroan Terbuka (Tbk)." }] });
  }
  if (data.rupstAlasanAuditD !== false) {
    blocks.push({ type: "list", bullet: advanceLetter(), indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Perseroan tidak merupakan Persero." }] });
  }
  if (data.rupstAlasanAuditE !== false) {
    blocks.push({ type: "list", bullet: advanceLetter(), indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau" }] });
  }
  if (data.rupstAlasanAuditF !== false) {
    blocks.push({ type: "list", bullet: advanceLetter(), indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Tidak diwajibkan oleh peraturan perundang-undangan." }] });
  }

  blocks.push(
    {
      type: "list",
      bullet: "2.",
      indentStyle: "keputusan",
      runs: [{ text: `Menyetujui dan menerima dengan baik Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${data.rupstFiscalYear || "2025"};` }]
    },
    {
      type: "list",
      bullet: "3.",
      indentStyle: "keputusan",
      runs: [
        { text: `Mengesahkan Laporan Keuangan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${data.rupstFiscalYear || "2025"}, sebagaimana dimuat dalam Laporan Keuangan ` },
        { text: formatCompanyName(data.companyName) },
        { text: `${numText} tanggal ${formatDateStr(data.rupstFinancialReportDate || "")}, yang ditandatangani oleh ${signatoryPosition} Perseroan ${signatorySalutation} ${signatoryName}${
          (data.rupstStatementNeraca !== false || data.rupstStatementLabaRugi !== false || data.rupstStatementPerubahanEkuitas !== false || data.rupstStatementArusKas !== false || data.rupstStatementCatatan !== false || data.rupstStatementNamaAnggota !== false || data.rupstStatementGaji !== false)
            ? " yang terdiri dari:"
            : "."
        }` }
      ]
    }
  );

  if (data.rupstStatementNeraca !== false) {
    blocks.push({ type: "list", bullet: "-", indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Laporan Keuangan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
  }
  if (data.rupstStatementLabaRugi !== false) {
    blocks.push({ type: "list", bullet: "-", indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Laporan mengenai Kegiatan Perseroan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
  }
  if (data.rupstStatementPerubahanEkuitas !== false) {
    blocks.push({ type: "list", bullet: "-", indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Laporan Pelaksanaan Tanggung Jawab Sosial dan Lingkungan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
  }
  if (data.rupstStatementArusKas !== false) {
    blocks.push({ type: "list", bullet: "-", indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Rincian Masalah yang timbul selama tahun buku yang mempengaruhi kegiatan usaha perseroan, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
  }
  if (data.rupstStatementCatatan !== false) {
    blocks.push({ type: "list", bullet: "-", indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Laporan mengenai tugas pengawasan yang telah dilaksanakan oleh Dewan Komisaris selama tahun buku yang baru lampau, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
  }
  if (data.rupstStatementNamaAnggota !== false) {
    blocks.push({ type: "list", bullet: "-", indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Nama Anggota Direksi dan Anggota Dewan Komisaris, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
  }
  if (data.rupstStatementGaji !== false) {
    blocks.push({ type: "list", bullet: "-", indentTabs: 1, indentStyle: "keputusan", runs: [{ text: "Gaji dan Tunjangan bagi Anggota Direksi dan Gaji atau Honorarium dan Tunjangan bagi Anggota Dewan Komisaris Perseroan untuk Tahun yang baru lampau, terlampir dan dilekatkan pada Notulen Rapat Umum Pemegang Saham Tahunan ini." }] });
  }

  // Moved following red block to the end of the sub-agenda list
  if (data.rupstStatementNeraca !== false || data.rupstStatementLabaRugi !== false || data.rupstStatementPerubahanEkuitas !== false || data.rupstStatementArusKas !== false || data.rupstStatementCatatan !== false || data.rupstStatementNamaAnggota !== false || data.rupstStatementGaji !== false) {
    blocks.push({
      type: "list",
      bullet: "",
      indentStyle: "keputusan",
      runs: [{ 
        text: "Direksi dan Komisaris serta Para Pemegang Saham Perseroan menyatakan bertanggung jawab penuh atas Kebenaran Informasi dan Tanda Tangan pada seluruh Lampiran Laporan terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.",
        color: "FF0000"
      }]
    });
  }

  const netProfitColor = (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null) ? undefined : "FF0000";
  let netProfitDisplay = "[ISI DENGAN NILAI LABA BERSIH DI NOTULEN RUPS TAHUNAN]";
  if (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null) {
    const isNeg = data.rupstNetProfit < 0;
    const absVal = Math.abs(data.rupstNetProfit);
    netProfitDisplay = `${isNeg ? "- Rp " : "Rp"}${formatNumber(absVal)} (${terbilang(data.rupstNetProfit)} rupiah)`;
  }

  const dividendColor = (data.rupstDividendAmount !== undefined && data.rupstDividendAmount !== null) ? undefined : "FF0000";
  let dividendDisplay = "[ISI DENGAN NILAI DEVIDEN DIBAGIKAN]";
  if (data.rupstDividendAmount !== undefined && data.rupstDividendAmount !== null) {
    const isNeg = data.rupstDividendAmount < 0;
    const absVal = Math.abs(data.rupstDividendAmount);
    dividendDisplay = `${isNeg ? "- Rp " : "Rp"}${formatNumber(absVal)} (${terbilang(data.rupstDividendAmount)} rupiah)`;
  }

  if (data.rupstNetProfit !== undefined && data.rupstNetProfit !== null && data.rupstNetProfit < 0) {
    const prevYear = data.rupstFiscalYear ? (parseInt(data.rupstFiscalYear) - 1).toString() : "2024";
    const absRetained = Math.abs(data.rupstRetainedProfit || 0);
    const isRetainedNeg = (data.rupstRetainedProfit || 0) < 0;
    const retainedLabel = isRetainedNeg ? "saldo rugi ditahan" : "saldo laba ditahan";
    const retainedDisplay = `Rp${formatNumber(absRetained)} (${terbilang(absRetained)} rupiah)`;
    const absNetProfit = Math.abs(data.rupstNetProfit);
    const netProfitDisplayPositive = `Rp${formatNumber(absNetProfit)} (${terbilang(absNetProfit)} rupiah)`;

    blocks.push({
      type: "list",
      bullet: "4.",
      indentStyle: "keputusan",
      runs: [
        { text: `Menetapkan Perseroan mengalami rugi bersih untuk tahun buku ${data.rupstFiscalYear || "2025"} sebesar ` },
        { text: netProfitDisplayPositive, color: netProfitColor },
        { text: `, dengan ${retainedLabel} Perseroan sampai dengan tahun buku ${prevYear} sebesar ` },
        { text: retainedDisplay },
        { text: `.` }
      ]
    });
    blocks.push({
      type: "list",
      bullet: "",
      indentStyle: "keputusan",
      runs: [
        { text: `sehubungan dengan hal tersebut:` }
      ]
    });
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 1,
      indentStyle: "keputusan",
      runs: [
        { text: `Perseroan tidak membagikan dividen kepada para pemegang saham;` }
      ]
    });
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 1,
      indentStyle: "keputusan",
      runs: [
        { text: `Rugi bersih tahun berjalan dicatat sebagai akumulasi kerugian/saldo rugi ditahan Perseroan.` }
      ]
    });
  } else {
    blocks.push({
      type: "list",
      bullet: "4.",
      indentStyle: "keputusan",
      runs: [
        { text: `Menetapkan penggunaan laba bersih Perseroan tahun buku ${data.rupstFiscalYear || "2025"} sebesar ` },
        { text: netProfitDisplay, color: netProfitColor },
        { text: `, dengan rincian sebagai berikut:` }
      ]
    });
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 1,
      indentStyle: "keputusan",
      runs: [
        { text: `Sebesar ` },
        { text: dividendDisplay, color: dividendColor },
        { text: ` dibagikan sebagai dividen kepada para pemegang saham;` }
      ]
    });
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 1,
      indentStyle: "keputusan",
      runs: [{ text: `Sisanya dicatat sebagai laba ditahan Perseroan untuk mendukung kegiatan usaha Perseroan.` }]
    });
  }

  blocks.push(
    {
      type: "list",
      bullet: "5.",
      indentStyle: "keputusan",
      runs: [{ text: `Memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris Perseroan atas tindakan pengurusan dan pengawasan yang telah dijalankan selama tahun buku ${data.rupstFiscalYear || "2025"}, sejauh tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan Perseroan;` }]
    },
    {
      type: "list",
      bullet: "6.",
      indentStyle: "keputusan",
      runs: [{ text: `Memberikan kuasa kepada ${effectiveChairSalutation} ${toTitleCase(effectiveChairName)} tersebut diatas, untuk melakukan segala tindakan yang diperlukan sehubungan dengan hasil keputusan RUPS Tahunan ini, termasuk namun tidak terbatas pada pengurusan pelaporan kepada instansi yang berwenang.` }]
    },
    { type: "br" }
  );

  const chairSignatureName = (chairSh?.isProxy && chairSh.proxyData)
    ? `${chairSh.proxyData.name.toUpperCase()} qq ${chairSh.name.toUpperCase()}`
    : effectiveChairName.toUpperCase();

  // VII. PENUTUP
  blocks.push(
    { type: "p", runs: [{ text: "VII. PENUTUP", bold: true }] },
    {
      type: "p",
      runs: [
        { text: `Akhirnya, oleh karena sudah tidak ada hal-hal lain yang perlu dibicarakan lagi, maka Ketua Rapat menutup Rapat ini pada jam ${jamPenutup} WIB.` }
      ]
    },
    { type: "br" },
    { type: "br" },
    { type: "p", runs: [{ text: "KETUA RAPAT,", bold: true }] },
    { type: "br" },
    { type: "p", runs: [{ text: "Meterai Rp.10.000,- + cap perusahan", size: 6, color: "FF0000" }] },
    { type: "br" },
    { type: "br" },
    { type: "br" },
    { type: "p", runs: [{ text: chairSignatureName, bold: true }] },
    { type: "p", runs: [{ text: (chairSh?.isManagement && chairSh.managementPosition) ? toTitleCase(chairSh.managementPosition) : "Ketua Rapat", bold: true }] },
    { type: "br" },
    { type: "p", runs: [{ text: "TANDA TANGAN PESERTA RAPAT :", bold: true }] },
    { type: "br" }
  );

  attendingShareholders
    .filter(sh => {
      const chairName = (data.meetingChair || "").toUpperCase();
      const isChairDirectly = sh.name.toUpperCase() === chairName;
      const isChairAsProxy = sh.isProxy && sh.proxyData?.name.toUpperCase() === chairName;
      return !isChairDirectly && !isChairAsProxy;
    })
    .forEach((sh, idx) => {
    const displayName = (sh.isProxy && sh.proxyData)
      ? `${sh.proxyData.name.toUpperCase()} qq ${sh.name.toUpperCase()}`
      : sh.name.toUpperCase();

    blocks.push({
      type: "p",
      runs: [
        { text: `${idx + 1}.  ` },
        { text: displayName, bold: true },
        { text: "\t\t\t\t...........................................".substring(0, 50) }
      ]
    });
  });

  // DAFTAR HADIR PAGE
  blocks.push({ type: "pageBreak" });
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "DAFTAR HADIR", bold: true }] },
    { type: "p", align: "center", runs: [{ text: "RAPAT UMUM PEMEGANG SAHAM TAHUNAN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: formatCompanyName(data.companyName), bold: true }] },
    { type: "p", align: "center", runs: [{ text: `TANGGAL ${formatDateStr(data.signingDate)}`, bold: true }] },
    { type: "br" }
  );

  const tableRows = attendingShareholders.map((sh, idx) => {
    const displayName = (sh.isProxy && sh.proxyData)
      ? `${sh.proxyData.name.toUpperCase()} qq ${sh.name.toUpperCase()}`
      : sh.name.toUpperCase();
    
    let kedudukan = sh.isManagement ? (sh.managementPosition || "Direktur") : "Pemegang Saham";
    if (sh.isManagement) {
      kedudukan += "\n&\npemegang saham";
    }

    return [
      `${idx + 1}.`,
      [{ text: displayName, bold: true }],
      kedudukan,
      "" // Signature
    ];
  });

  blocks.push({
    type: "table",
    headers: ["NO", "NAMA", "KEDUDUKAN", "TANDATANGAN"],
    rows: tableRows,
    widths: [500, 3000, 2500, 2500]
  });

  return blocks;
};