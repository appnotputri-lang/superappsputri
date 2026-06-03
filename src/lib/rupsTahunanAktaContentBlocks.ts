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
  formatAddress,
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
  | { type: "divider"; text: string }
  | { type: "br" }
  | { type: "pageBreak" };

export const generateRupstAktaBlocks = (data: CompanyData): Block[] => {
  const blocks: Block[] = [];

  const effectiveNotaryDate = data.signingDate || "";
  const effectiveNotaryNumber = "...";
  
  const tglAktaHari = getDayName(effectiveNotaryDate);
  const tglAktaHuruf = dateToWords(effectiveNotaryDate);
  const tglAktaAngka = formatDateStr(effectiveNotaryDate);

  const jamStr = data.meetingStartTime ? data.meetingStartTime.replace(":", ".") : "10.00";
  const jamParts = (data.meetingStartTime || "10:00").split(":");
  const h = parseInt(jamParts[0]);
  const m = parseInt(jamParts[1]);
  const jamHuruf = `${terbilang(h)} lewat ${m === 0 ? "nol-nol" : terbilang(m)} menit Waktu Indonesia Barat`;

  // Total shares and attending shares
  const totalShares = data.shareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0);
  const attendingShareholders = data.shareholders.filter(s => s.isPresent);
  const presentShares = attendingShareholders.reduce((sum, s) => sum + (s.sharesOwned || 0), 0);
  const presentPercentage = totalShares > 0 ? (presentShares / totalShares) * 100 : 0;

  // Rep details (Usually the person appearing before the Notary to state the resolutions)
  // Based on the BAR RUPST template, this person is often the Chairman/Direktur
  const chairSh = data.shareholders.find(s => (s.name || "").toUpperCase() === (data.meetingChair || "").toUpperCase());
  const rep = (chairSh?.isProxy && chairSh.proxyData) ? chairSh.proxyData : chairSh;

  const getPersonDetailRuns = (person: any): FormatToken[] => {
    const tglAngka = person?.birthDate ? formatDateStr(person.birthDate) : "...";
    const tglHuruf = person?.birthDate ? dateToWords(person.birthDate) : "...";
    return [
      { text: (person?.name || "").toUpperCase(), bold: true },
      {
        text: person ? formatPersonDetails(person, tglAngka, tglHuruf) : `, lahir di ..., pada tanggal ... (...), Warga Negara Indonesia, swasta, bertempat tinggal di ..., Rukun Tetangga ..., Rukun Warga ..., Kelurahan ..., Kecamatan ..., pemegang Kartu Tanda Penduduk Nomor ...`,
      },
    ];
  };

  // 1. Header
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "AKTA PERNYATAAN KEPUTUSAN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: "RAPAT UMUM PEMEGANG SAHAM TAHUNAN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: formatCompanyName(data.companyName), bold: true }] },
    { type: "p", align: "center", runs: [{ text: `Nomor : ${effectiveNotaryNumber}` }] },
    { type: "br" },
    { type: "br" },
    { type: "p", runs: [{ text: `Pada hari ini, ${tglAktaHari}, tanggal ${tglAktaAngka} (${tglAktaHuruf}).` }] },
    { type: "p", runs: [{ text: `Jam ${jamStr} WIB (${jamHuruf}).` }] },
    {
      type: "p",
      runs: [
        { text: `Berhadapan dengan saya, ` },
        { text: (data.notaryName || "NUKANTINI PUTRI PARINCHA, Sarjana Hukum, Magister Kenotariatan").toUpperCase(), bold: true },
        { text: `, Notaris di Kabupaten Bandung Barat, dengan dihadiri oleh saksi-saksi yang telah dikenal oleh saya, Notaris dan akan disebutkan pada bagian akhir akta ini :` },
      ],
    },
    { type: "br" }
  );

  // 2. Representative (The person reporting the BAR RUPST)
  if (rep) {
    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.5,
      runs: [
        { text: `${rep.salutation || "Tuan"} ` },
        ...getPersonDetailRuns(rep),
        { text: "." }
      ]
    });

    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.5,
      runs: [
        { text: "Menurut keterangannya dalam hal ini bertindak dalam kapasitasnya sebagai penerima kuasa pemegang saham berdasarkan Berita Acara Rapat Umum Pemegang Saham Tahunan " },
        { text: formatCompanyName(data.companyName), bold: true },
        { text: `, suatu perseroan terbatas yang akan diterangkan di bawah ini, yang dibuat di bawah tangan bermeterai cukup, tertanggal ${formatDateStr(data.signingDate)} yang aslinya turut dilekatkan dalam minuta akta ini, selanjutnya disebut ("BAR RUPST").` }
      ]
    });

    blocks.push({
      type: "list",
      bullet: "-",
      indentTabs: 0.5,
      runs: [
        { text: "Dari dan untuk itu sah mewakili " },
        { text: formatCompanyName(data.companyName), bold: true },
        { text: `, suatu perseroan terbatas yang didirikan berdasarkan hukum negara Republik Indonesia, berkedudukan di ${toTitleCase(data.domicile || "...")}, yang anggaran dasarnya telah disesuaikan dengan Undang-undang Republik Indonesia nomor 40 Tahun 2007 tentang Perseroan Terbatas sebagaimana dimuat dalam :` }
      ]
    });
  }

  // Akta Details
  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 1.5,
    runs: [{ text: `Akta Pendirian tertanggal ${dateToWords(data.establishmentDeedDate || "")} Nomor ${data.establishmentDeedNumber} yang dibuat di hadapan ${data.establishmentNotary}, Notaris di ${data.establishmentNotaryDomicile}.` }]
  });

  if (data.amendmentDeeds && data.amendmentDeeds.length > 0) {
    data.amendmentDeeds.forEach(deed => {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.5,
        runs: [{ text: `Akta Perubahan tertanggal ${dateToWords(deed.date)} Nomor ${deed.number} yang dibuat di hadapan ${deed.notary}, Notaris di ${deed.notaryDomicile}.` }]
      });
    });
  }

  blocks.push(
    { type: "p", runs: [{ text: "Untuk selanjutnya disebut “Perseroan”." }] },
    { type: "p", runs: [{ text: `Penghadap dikenal oleh saya, Notaris.` }] },
    {
      type: "p",
      runs: [
        { text: `Penghadap menerangkan kepada saya, Notaris, bahwa sesuai dengan ketentuan dalam Pasal ${data.rupstAdArticle || "9"} ayat ${data.rupstAdParagraph || "4"} Anggaran Dasar Perseroan, untuk mengadakan Rapat Umum Pemegang Saham Tahunan Tahun Buku ${data.rupstFiscalYear || "2025"}, selanjutnya disebut (“RUPST”) ini Direksi Perseroan telah diadakan pemanggilan terlebih dahulu kepada para pemegang saham Perseroan dengan mengirimkan Surat Pemanggilan tertanggal ${formatDateStr(data.rupstInvitationDate)}.` }
      ]
    },
    { type: "br" },
    {
      type: "p",
      runs: [
        { text: "Bahwa RUPST Perseroan telah diselenggarakan pada :" }
      ]
    },
    { type: "p", runs: [{ text: `Hari : ${tglAktaHari}` }] },
    { type: "p", runs: [{ text: `Tanggal : ${tglAktaAngka}` }] },
    { type: "p", runs: [{ text: `Bertempat di : ${data.signingPlace || "Kantor Perseroan"}` }] },
    { type: "br" }
  );

  // 3. Attendance
  blocks.push(
    { type: "p", runs: [{ text: "RUPST dihadiri oleh Para Pemegang Saham Perseroan atau kuasanya yang sah, yaitu :" }] }
  );

  attendingShareholders.forEach((sh, idx) => {
    let KedudukanText = "";
    if (sh.isManagement) {
      KedudukanText = `dalam hal ini bertindak dalam jabatannya sebagai ${toTitleCase(sh.managementPosition || "Direktur")} Perseroan`;
    }

    blocks.push({
      type: "list",
      bullet: `${idx + 1}.`,
      indentTabs: 0.5,
      runs: [
        { text: `${sh.salutation || "Tuan"} ` },
        ...getPersonDetailRuns(sh),
        { text: idx === attendingShareholders.length - 1 ? "." : ";" }
      ]
    });

    if (sh.isManagement) {
      blocks.push({
        type: "p",
        indent: true,
        runs: [{ text: `— ${KedudukanText}.` }]
      });
    }

    const shareRp = (sh.sharesOwned || 0) * (data.originalSharePrice || 0);
    const sharePct = totalShares > 0 ? ((sh.sharesOwned || 0) / totalShares) * 100 : 0;

    blocks.push({
      type: "p",
      indent: true,
      runs: [
        { text: `— Selaku pemilik dan pemegang hak yang sah atas ${formatNumber(sh.sharesOwned)} (${terbilang(sh.sharesOwned)}) saham atau dengan nilai nominal sebesar Rp${formatNumber(shareRp)} (${terbilang(shareRp)} modal) atau setara ${formatNumber(sharePct)}% (${terbilang(sharePct)} persen) dari seluruh saham yang telah ditempatkan dan disetor penuh dalam Perseroan.` }
      ]
    });
  });

  blocks.push(
    { type: "br" },
    { type: "p", runs: [{ text: "Pemegang Saham dan Para Undangan selanjutnya secara bersama-sama disebut sebagai \"Peserta Rapat\"." }] },
    { type: "p", runs: [{ text: "Asli daftar hadir dari RUPST adalah sebagaimana terlampir pada BAR RUPST." }] },
    { type: "p", runs: [{ text: `RUPST dipimpin oleh ${data.meetingChair || "..."} tersebut, dalam jabatannya sebagai ${data.meetingChairPosition || "Direktur Utama"} Perseroan sesuai dengan ketentuan Pasal ${data.rupstAdArticle || "9"} ayat ${data.rupstAdParagraph || "4"} Anggaran Dasar Perseroan.` }] },
    { type: "br" },
    { type: "p", runs: [{ text: `Berdasarkan ketentuan-ketentuan Pasal ${data.rupstAdArticle || "9"} ayat ${data.rupstAdParagraph || "4"} Anggaran Dasar Perseroan dan hukum yang berlaku, Pemegang Saham mengambil keputusan-keputusan sebagai berikut :` }] },
    { type: "br" }
  );

  // 4. Resolutions (I - VI)
  const netProfit = data.rupstNetProfit || 0;
  const dividend = data.rupstDividendAmount || 0;

  // I. Persetujuan Laporan Tahunan
  blocks.push(
    { type: "p", align: "left", runs: [{ text: "I. PERSETUJUAN LAPORAN TAHUNAN PERSEROAN TAHUN BUKU " + (data.rupstFiscalYear || "2025") + ".", bold: true }] },
    {
      type: "p",
      runs: [
        { text: "MEMUTUSKAN", bold: true },
        { text: ", bahwa Pemegang Saham menerima dan menyetujui Laporan Tahunan Perseroan untuk tahun buku " + (data.rupstFiscalYear || "2025") + ", yang salinannya telah diakui oleh masing-masing Pemegang Saham telah diterima." }
      ]
    },
    { type: "br" }
  );

  const finReportNumberColor = (data.rupstFinancialReportNumber === "" || data.rupstFinancialReportNumber === "0") ? "FF0000" : undefined;
  const finReportNumberDisplay = (data.rupstFinancialReportNumber === "" || data.rupstFinancialReportNumber === "0") 
    ? "[ ISI DENGAN NOMOR LAPORAN KEUANGAN]" 
    : (data.rupstFinancialReportNumber || "LP/25/2025");

  // II. Pengesahan Laporan Keuangan
  blocks.push(
    { type: "p", align: "left", runs: [{ text: "II. PENGESAHAN LAPORAN KEUANGAN TAHUNAN PERSEROAN TAHUN BUKU " + (data.rupstFiscalYear || "2025") + ".", bold: true }] },
    { type: "p", runs: [{ text: "MEMUTUSKAN", bold: true }, { text: ", bahwa Pemegang Saham :" }] },
    {
      type: "list",
      bullet: "a.",
      indentTabs: 0.5,
      runs: [
        { text: "Menerima dan mengesahkan Laporan Keuangan Tahunan Perseroan untuk tahun buku " + (data.rupstFiscalYear || "2025") + " sebagaimana dimuat dalam Laporan Keuangan nomor " },
        { text: finReportNumberDisplay, color: finReportNumberColor },
        { text: ", yang salinannya telah diakui oleh masing-masing Pemegang Saham telah diterima; dan" }
      ]
    },
    {
      type: "list",
      bullet: "b.",
      indentTabs: 0.5,
      runs: [{ text: "Memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya kepada anggota Direksi Perseroan atas tanggung jawab pengurusannya dan anggota Dewan Komisaris Perseroan atas tanggung jawab pengawasannya, yang dilakukan selama tahun buku " + (data.rupstFiscalYear || "2025") + " sepanjang tindakannya tersebut termaktub dalam Laporan Tahunan Perseroan yang telah disetujui dan dalam Laporan Keuangan Tahunan yang telah disahkan." }]
    },
    { type: "br" }
  );

  const netProfitColor = data.rupstNetProfit ? undefined : "FF0000";
  const netProfitDisplay = data.rupstNetProfit 
    ? `Rp${formatNumber(data.rupstNetProfit)} (${terbilang(data.rupstNetProfit)} rupiah)` 
    : "[ISI DENGAN NILAI LABA BERSIH DI NOTULEN RUPS TAHUNAN]";

  const dividendColor = data.rupstDividendAmount ? undefined : "FF0000";
  const dividendDisplayValue = data.rupstDividendAmount 
    ? `Rp${formatNumber(data.rupstDividendAmount)} (${terbilang(data.rupstDividendAmount)} rupiah)`
    : "[ISI DENGAN NILAI DEVIDEN DIBAGIKAN]";

  // III. Penetapan Laba
  blocks.push(
    { type: "p", align: "left", runs: [{ text: "III. PENETAPAN PENGGUNAAN LABA BERSIH PERSEROAN.", bold: true }] },
    {
      type: "p",
      runs: [
        { text: "MEMUTUSKAN", bold: true },
        { text: `, bahwa Pemegang Saham menerima dan menyetujui total laba bersih Perseroan untuk tahun buku ${data.rupstFiscalYear || "2025"} adalah sebesar ` },
        { text: netProfitDisplay, color: netProfitColor },
        { text: " dengan ketentuan " },
        data.rupstDividendAmount === 0
          ? { text: "tidak ada pembagian dividen kepada Pemegang Saham dan seluruh laba bersih menjadi laba ditahan." }
          : { text: `sebesar ${dividendDisplayValue} dibagikan sebagai dividen dan sisanya dicatat sebagai laba ditahan.` }
      ]
    }
  );

  if (data.rupstDividendAmount !== undefined && data.rupstDividendAmount !== null && data.rupstDividendAmount > 0) {
    // No need to append more if already included in the ternary above
  }

  // IV. Rencana Kerja
  blocks.push(
    { type: "p", align: "left", runs: [{ text: "IV. PERSETUJUAN RENCANA KERJA DAN ANGGARAN TAHUNAN PERSEROAN TAHUN BUKU " + (data.rupstFiscalYear || "2025") + ".", bold: true }] },
    {
      type: "p",
      runs: [
        { text: "MEMUTUSKAN", bold: true },
        { text: ", bahwa Pemegang Saham menerima dan menyetujui Rencana Kerja Dan Anggaran Tahunan Perseroan untuk tahun buku mendatang, yang salinannya telah diakui oleh masing-masing Pemegang Saham telah diterima." }
      ]
    },
    { type: "br" }
  );

  // V. Remunerasi
  blocks.push(
    { type: "p", align: "left", runs: [{ text: "V. PENETAPAN PAKET REMUNERASI BAGI ANGGOTA DEWAN KOMISARIS DAN DIREKSI PERSEROAN.", bold: true }] },
    {
      type: "p",
      runs: [
        { text: "MEMUTUSKAN", bold: true },
        { text: ", bahwa Pemegang Saham menetapkan bahwa tidak ada perubahan gaji/honor bagi anggota Direksi dan Dewan Komisaris Perseroan." }
      ]
    },
    { type: "br" }
  );

  // VI. Kuasa
  blocks.push(
    { type: "p", align: "left", runs: [{ text: "VI. DIREKSI UNTUK MENGIMPLEMENTASIKAN.", bold: true }] },
    {
      type: "p",
      runs: [
        { text: "MEMUTUSKAN", bold: true },
        { text: ", bahwa Pemegang Saham memberikan kuasa kepada Direksi Perseroan, dengan hak substitusi kepada pihak (-pihak) lain, untuk menyatakan keputusan-keputusan tersebut diatas dalam akta notaris dalam bahasa Indonesia (jika diperlukan), dan untuk tujuan tersebut hadir dihadapan notaris, untuk mempersiapkan dan menandatangani akta tersebut, dan kemudian menyampaikan permohonan kepada Menteri Hukum dan Hak Asasi Manusia Republik Indonesia." }
      ]
    },
    { type: "br" }
  );

  blocks.push(
    { type: "divider", text: "DEMIKIAN AKTA INI" },
    { type: "p", runs: [{ text: "Dibuat sebagai minuta, dibacakan dan ditanda-tangani di Kabupaten Bandung Barat, pada hari dan tanggal tersebut dalam kepala akta ini dengan dihadiri oleh :" }] },
    { type: "p", runs: [{ text: "1. ...................." }] },
    { type: "p", runs: [{ text: "2. ...................." }] },
    { type: "p", runs: [{ text: "Keduanya pegawai kantor saya, Notaris, sebagai saksi-saksi." }] }
  );

  return blocks;
};
