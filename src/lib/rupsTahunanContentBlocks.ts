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
    { type: "p", align: "center", runs: [{ text: `PT. ${data.companyName.toUpperCase()}`, bold: true }] },
    { type: "p", align: "center", runs: [{ text: "--------------------------------------------------------------------------------------------------------------------" }] }
  );

  // I. RAPAT
  blocks.push(
    { type: "p", runs: [{ text: "I. RAPAT", bold: true }] },
    {
      type: "p",
      runs: [
        { text: `Rapat Umum Pemegang Saham Tahunan ` },
        { text: `“PT. ${data.companyName.toUpperCase()}“`, bold: true },
        { text: ` (selanjutnya disebut sebagai “Rapat”) perseroan yang berkedudukan di ${data.domicileStyle === 'KABUPATEN' ? 'Kabupaten ' : 'Kota '}${toTitleCase(data.domicile || "...")}, demikian berdasarkan Akta Pendirian tertanggal ${dateToWords(data.establishmentDeedDate || "")} (${formatDateStr(data.establishmentDeedDate || "")}), No. ${data.establishmentDeedNumber || "..."}, yang dibuat dihadapan ${data.establishmentNotary || "..."}, Notaris di ${toTitleCase(data.establishmentNotaryDomicile || "...")} dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${dateToWords(data.establishmentSkDate || "")} (${formatDateStr(data.establishmentSkDate || "")}) Nomor ${data.establishmentSkNumber || "..."}${data.amendmentDeeds && data.amendmentDeeds.length > 0 ? ", beberapa kali telah mengalami perubahan, berdasarkan :" : "."}` }
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
        { text: `Rapat ini diselenggarakan berdasarkan Surat Pemanggilan Rapat Umum Pemegang Saham Tahunan Nomor: ${data.rupstInvitationNumber || "[nomor surat]"} tertanggal ${data.rupstInvitationDate ? dateToWords(data.rupstInvitationDate) : "[isi tanggal surat pemanggilan]"} (${data.rupstInvitationDate ? formatDateStr(data.rupstInvitationDate) : "[tanggal surat]"}) dan diadakan pada:` }
      ]
    },
    { type: "p", runs: [{ text: "Hari/Tanggal" }, { text: "\t: " }, { text: `${tglRapatHari} / ${tglRapatAngka}` }], indent: true },
    { type: "p", runs: [{ text: "Tempat" }, { text: "\t: " }, { text: `${data.signingPlace || "Kantor Perseroan"}` }], indent: true },
    { type: "p", runs: [{ text: "Waktu" }, { text: "\t: " }, { text: `Pukul ${jamStr} WIB` }], indent: true },
    { type: "br" }
  );

  // II. PESERTA RAPAT
  blocks.push(
    { type: "p", runs: [{ text: "II. PESERTA RAPAT", bold: true }] },
    { type: "p", runs: [{ text: "Bahwa dalam rapat telah hadir dan/atau mewakili antara lain :" }] }
  );

  attendingShareholders.forEach((sh, idx) => {
    const shTotalRp = sh.sharesOwned * (data.originalSharePrice || 0);
    
    if (sh.isProxy && sh.proxyData) {
      const px = sh.proxyData;
      const proxyDateWords = px.proxyDeedDate ? dateToWords(px.proxyDeedDate) : "__________";
      const proxyDateAngka = px.proxyDeedDate ? formatDateStr(px.proxyDeedDate) : "__________";

      blocks.push(
        {
          type: "list",
          bullet: `${idx + 1}.`,
          runs: [
            { text: `${px.salutation} ` },
            { text: px.name.toUpperCase(), bold: true },
            { text: `, lahir di ${toTitleCase(px.birthCity || "...")}, pada tanggal ${formatDateStr(px.birthDate)} (${dateToWords(px.birthDate)}), Warga Negara Indonesia, ${toTitleCase(px.occupation || "...")}, bertempat tinggal di ${px.address.fullAddress}, RT ${px.address.rt}, RW ${px.address.rw}, Kelurahan ${px.address.kelurahan}, Kecamatan ${px.address.kecamatan}, pemegang Kartu Tanda Penduduk.` }
          ]
        },
        {
          type: "list",
          bullet: "-",
          indentTabs: 1,
          runs: [
            { text: "Dalam hal ini bertindak berdasarkan Surat Kuasa tertanggal " },
            { text: proxyDateWords, bold: true },
            { text: ` (${proxyDateAngka}), selaku Kuasa dari dan oleh karena itu sah bertindak untuk dan atas nama: ` }
          ]
        },
        {
          type: "list",
          bullet: "-",
          indentTabs: 2,
          runs: [
            { text: `${sh.salutation} ` },
            { text: sh.name.toUpperCase(), bold: true },
            { text: `, lahir di ${toTitleCase(sh.birthCity || "...")}, pada tanggal ${formatDateStr(sh.birthDate)} (${dateToWords(sh.birthDate)}), Warga Negara Indonesia, ${toTitleCase(sh.occupation || "...")}, bertempat tinggal di ${sh.address.fullAddress}, RT ${sh.address.rt}, RW ${sh.address.rw}, Kelurahan ${sh.address.kelurahan}, Kecamatan ${sh.address.kecamatan}, pemegang Kartu Tanda Penduduk.` }
          ]
        },
        {
          type: "list",
          bullet: "-",
          indentTabs: 3,
          runs: [{ text: "merupakan :" }]
        },
        {
          type: "list",
          bullet: "a.",
          indentTabs: 4,
          runs: [
            { text: "Pemilik dan pemegang saham sebanyak " },
            { text: `${formatNumber(sh.sharesOwned)}`, bold: true },
            { text: ` (${terbilang(sh.sharesOwned)}) lembar saham atau senilai ` },
            { text: `Rp. ${formatNumber(shTotalRp)},-`, bold: true },
            { text: ` (${terbilang(shTotalRp)} rupiah) berhak mengeluarkan suara ` },
            { text: `${formatNumber(sh.sharesOwned)}`, bold: true },
            { text: ` (${terbilang(sh.sharesOwned)}) suara dalam rapat.` }
          ]
        }
      );

      if (sh.isManagement) {
        blocks.push({
          type: "list",
          bullet: "b.",
          indentTabs: 4,
          runs: [{ text: `${toTitleCase(sh.managementPosition || "Direktur")} perseroan.` }]
        });
      }
    } else {
      blocks.push(
        {
          type: "list",
          bullet: `${idx + 1}.`,
          runs: [
            { text: `${sh.salutation} ` },
            { text: sh.name.toUpperCase(), bold: true },
            { text: `, lahir di ${toTitleCase(sh.birthCity || "...")}, pada tanggal ${formatDateStr(sh.birthDate)} (${dateToWords(sh.birthDate)}), Warga Negara Indonesia, ${toTitleCase(sh.occupation || "...")}, bertempat tinggal di ${sh.address.fullAddress}, RT ${sh.address.rt}, RW ${sh.address.rw}, Kelurahan ${sh.address.kelurahan}, Kecamatan ${sh.address.kecamatan}, pemegang Kartu Tanda Penduduk.` }
          ]
        },
        { type: "list", bullet: "-", indentTabs: 1, runs: [{ text: "Dalam hal ini hadir selaku :" }] }
      );

      blocks.push({
        type: "list",
        bullet: "a.",
        indentTabs: 2,
        runs: [
          { text: "Pemilik dan pemegang saham sebanyak " },
          { text: `${formatNumber(sh.sharesOwned)}`, bold: true },
          { text: ` (${terbilang(sh.sharesOwned)}) lembar saham atau senilai ` },
          { text: `Rp. ${formatNumber(shTotalRp)},-`, bold: true },
          { text: ` (${terbilang(shTotalRp)} rupiah) berhak mengeluarkan suara ` },
          { text: `${formatNumber(sh.sharesOwned)}`, bold: true },
          { text: ` (${terbilang(sh.sharesOwned)}) suara dalam rapat.` }
        ]
      });

      if (sh.isManagement) {
        blocks.push({
          type: "list",
          bullet: "b.",
          indentTabs: 2,
          runs: [{ text: `${toTitleCase(sh.managementPosition || "Direktur")} perseroan.` }]
        });
      }
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
        { text: `Berdasarkan ketentuan anggaran dasar perseroan, maka ` },
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
        { text: `Ketua rapat membuka dan memimpin rapat dengan terlebih dahulu menjelaskan bahwa para pemegang saham perseroan telah hadir dan/atau diwakili oleh ${formatNumber(presentShares)} Saham perseroan yang telah ditempatkan dan diambil bagian-bagian hingga hari ini, oleh karena itu, sesuai dengan ketentuan Anggaran dasar Perseroan mengenai Kuorum, Rapat ini adalah sah sesuai dengan Kuorum dan berhak mengambil keputusan-keputusan yang sah serta mengikat mengenai hal-hal yang dibicarakan.` }
      ]
    },
    { type: "br" }
  );

  // VI. KEPUTUSAN_KEPUTUSAN
  blocks.push(
    { type: "p", runs: [{ text: "VI. KEPUTUSAN_KEPUTUSAN", bold: true }] },
    { type: "p", runs: [{ text: "Setelah dilakukan pembahasan dan musyawarah, Rapat memutuskan dan menyetujui hal-hal sebagai berikut:" }] },
    {
      type: "list",
      bullet: "1.",
      runs: [{ text: `Menyetujui dan menerima dengan baik Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${data.rupstFiscalYear || "2025"};` }]
    },
    {
      type: "list",
      bullet: "2.",
      runs: [
        { text: `Mengesahkan Laporan Keuangan Perseroan untuk tahun buku yang berakhir pada tanggal 31 Desember ${data.rupstFiscalYear || "2025"}, sebagaimana dimuat dalam Laporan Keuangan PT ${data.companyName.toUpperCase()} nomor ${data.rupstFinancialReportNumber || "LP/25/2025"} tanggal ${formatDateStr(data.rupstFinancialReportDate || "")} yang terdiri dari:` }
      ]
    },
    { type: "list", bullet: "-", indentTabs: 1, runs: [{ text: "Laporan Posisi Keuangan (Neraca);" }] },
    { type: "list", bullet: "-", indentTabs: 1, runs: [{ text: "Laporan Laba Rugi;" }] },
    { type: "list", bullet: "-", indentTabs: 1, runs: [{ text: "Laporan Perubahan Ekuitas;" }] },
    { type: "list", bullet: "-", indentTabs: 1, runs: [{ text: "Laporan Arus Kas;" }] },
    { type: "list", bullet: "-", indentTabs: 1, runs: [{ text: "Catatan Atas Laporan Keuangan." }] }
  );

  const netProfit = data.rupstNetProfit || 90000000;
  const dividend = data.rupstDividendAmount || 50000000;
  blocks.push({
    type: "list",
    bullet: "3.",
    runs: [
      { text: `Menetapkan penggunaan laba bersih Perseroan tahun buku ${data.rupstFiscalYear || "2025"} sebesar Rp${formatNumber(netProfit)} (${terbilang(netProfit)} rupiah), dengan rincian sebagai berikut:` }
    ]
  });
  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 1,
    runs: [{ text: `Sebesar Rp${formatNumber(dividend)} (${terbilang(dividend)} rupiah) dibagikan sebagai dividen kepada para pemegang saham;` }]
  });
  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 1,
    runs: [{ text: `Sisanya dicatat sebagai laba ditahan Perseroan untuk mendukung kegiatan usaha Perseroan.` }]
  });

  blocks.push(
    {
      type: "list",
      bullet: "4.",
      runs: [{ text: `Memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris Perseroan atas tindakan pengurusan dan pengawasan yang telah dijalankan selama tahun buku ${data.rupstFiscalYear || "2025"}, sejauh tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan Perseroan;` }]
    },
    {
      type: "list",
      bullet: "5.",
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
    { type: "p", runs: [{ text: chairSignatureName, bold: true, underline: true }] },
    { type: "p", runs: [{ text: data.meetingChairPosition || "Direktur Utama", bold: true }] },
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
        { text: "\t..........................................." }
      ]
    });
  });

  // DAFTAR HADIR PAGE
  blocks.push({ type: "pageBreak" });
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "DAFTAR HADIR", bold: true }] },
    { type: "p", align: "center", runs: [{ text: "RAPAT UMUM PEMEGANG SAHAM TAHUNAN", bold: true }] },
    { type: "p", align: "center", runs: [{ text: `PT. ${data.companyName.toUpperCase()}`, bold: true }] },
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