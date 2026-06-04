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
    };

export const generateRupstBlocks = (data: CompanyData): Block[] => {
  const blocks: Block[] = [];

  const fiscalYear = data.rupstFiscalYear || "2025";
  const signingDate = data.signingDate || "";
  const tglRapatHari = getDayName(signingDate) || "...";
  const tglRapatHuruf = dateToWords(signingDate) || "...";
  const tglRapatAngka = formatDateStr(signingDate) || "...";

  const jamRapatStr = data.meetingStartTime ? data.meetingStartTime.replace(":", ".") : "09.00";
  const jamRapatWords = timeToWords(data.meetingStartTime || "09:00");

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
  blocks.push({
    type: "p",
    runs: [
      { text: `Pada hari ini, ${tglRapatHari}, tanggal ${tglRapatAngka} (${tglRapatHuruf}), bertempat di ${data.signingPlace || "Kantor Perseroan"}, telah diselenggarakan Rapat Umum Pemegang Saham Tahunan (selanjutnya disebut "Rapat") dari Perseroan Terbatas ` },
      { text: formatCompanyName(data.companyName), bold: true },
      { text: `, berkedudukan di ${toTitleCase(data.domicile || "...")}.` }
    ]
  });

  blocks.push({
    type: "p",
    runs: [{ text: `Rapat dimulai pada pukul ${jamRapatStr} WIB (${jamRapatWords} Waktu Indonesia Barat).` }]
  });

  blocks.push({ type: "br" });

  // 3. Attendance
  blocks.push({ type: "p", runs: [{ text: "I. HADIR DALAM RAPAT", bold: true }] });
  blocks.push({
    type: "p",
    runs: [{ text: `Dalam Rapat ini telah hadir atau diwakili pemegang saham yang mewakili ${formatNumber(presentShares)} (${terbilang(presentShares)}) saham, atau setara dengan ${formatNumber(presentPercentage)}% dari seluruh saham yang telah ditempatkan dan disetor penuh dalam Perseroan, yaitu sebanyak ${formatNumber(totalShares)} (${terbilang(totalShares)}) saham.` }]
  });

  const fullyDescribedNames = new Set<string>();

  const getPersonDetailRuns = (person: any): FormatToken[] => {
    const nameUpper = (person?.name || "").toUpperCase().trim();
    if (fullyDescribedNames.has(nameUpper)) {
      return [{ text: nameUpper, bold: true }, { text: ", tersebut diatas" }];
    }
    fullyDescribedNames.add(nameUpper);
    const tglAngka = person?.birthDate ? formatDateStr(person.birthDate) : "...";
    const tglHuruf = person?.birthDate ? dateToWords(person.birthDate) : "...";
    return [
      { text: nameUpper, bold: true },
      { text: formatPersonDetails(person, tglAngka, tglHuruf) }
    ];
  };

  attendingShareholders.forEach((sh, idx) => {
    const shareRp = sh.sharesOwned * (data.originalSharePrice || 0);
    blocks.push({
      type: "list",
      bullet: `${idx + 1}.`,
      runs: [
        ...getPersonDetailRuns(sh),
        { text: `, pemilik dan pemegang ${formatNumber(sh.sharesOwned)} (${terbilang(sh.sharesOwned)}) lembar saham dengan total nilai nominal sebesar Rp. ${formatNumber(shareRp)},- (${terbilang(shareRp)} rupiah).` }
      ]
    });
  });

  blocks.push({ type: "br" });

  // 4. Chair
  const chairName = (data.meetingChair || "...").toUpperCase();
  const chairSalutation = data.shareholders.find(s => s.name === data.meetingChair)?.salutation || "Tuan";
  blocks.push({
    type: "p",
    runs: [
      { text: `Rapat dipimpin oleh ${chairSalutation} ` },
      { text: chairName, bold: true },
      { text: `, dalam jabatannya selaku ${data.meetingChairPosition || "Ketua Rapat"} (selanjutnya disebut "Ketua Rapat").` }
    ]
  });

  blocks.push({ type: "br" });

  // 5. Agenda
  blocks.push({ type: "p", runs: [{ text: "II. ACARA RAPAT", bold: true }] });
  const agendas = [
    `Persetujuan Laporan Tahunan Perseroan Tahun Buku ${fiscalYear};`,
    `Pengesahan Laporan Keuangan Perseroan Tahun Buku ${fiscalYear};`,
    "Penetapan penggunaan laba bersih Perseroan;",
    "Pemberian pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada Direksi dan Komisaris.",
    `Pernyataan bahwa Laporan Keuangan Perseroan ${data.rupstIsAudited ? "Memenuhi" : "Tidak Memenuhi"} ketentuan wajib audit.`
  ];

  agendas.forEach((agenda, idx) => {
    blocks.push({
      type: "list",
      bullet: `${idx + 1}.`,
      runs: [{ text: agenda }]
    });
  });

  blocks.push({ type: "br" });

  // 6. Resolutions
  blocks.push({ type: "p", runs: [{ text: "III. KEPUTUSAN RAPAT", bold: true }] });
  blocks.push({
    type: "p",
    runs: [{ text: "Setelah laporan-laporan dan usul-usul tersebut dibicarakan dan dibahas dalam Rapat, maka Rapat dengan suara bulat memutuskan hal-hal sebagai berikut:" }]
  });

  blocks.push({ type: "br" });

  // Resolution 1 & 2
  blocks.push({
    type: "list",
    bullet: "1.",
    indentStyle: "keputusan",
    runs: [{ text: `Menyetujui Laporan Tahunan Perseroan Tahun Buku ${fiscalYear} dan Mengesahkan Laporan Keuangan Perseroan Tahun Buku ${fiscalYear} yang telah diajukan oleh Direksi.` }]
  });

  // Resolution 3
  let netProfitText = "";
  if (data.rupstNetProfit !== undefined) {
    const isNeg = data.rupstNetProfit < 0;
    const absVal = Math.abs(data.rupstNetProfit);
    const amtStr = `Rp. ${formatNumber(absVal)},- (${terbilang(data.rupstNetProfit)} rupiah)`;
    if (isNeg) {
      netProfitText = `Menetapkan bahwa Perseroan mengalami rugi bersih sebesar ${amtStr}, sehingga tidak ada pembagian dividen.`;
    } else {
      const divAmt = data.rupstDividendAmount || 0;
      netProfitText = `Menetapkan penggunaan laba bersih sebesar ${amtStr}, dimana sebesar Rp. ${formatNumber(divAmt)},- dibagikan sebagai dividen dan sisanya sebagai laba ditahan.`;
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

  // Resolution 4
  blocks.push({
    type: "list",
    bullet: "3.",
    indentStyle: "keputusan",
    runs: [{ text: `Memberikan pembebasan tanggung jawab sepenuhnya (acquit et de charge) kepada para anggota Direksi dan Dewan Komisaris atas tindakan pengurusan dan pengawasan yang telah mereka lakukan selama tahun buku tersebut, sepanjang tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan.` }]
  });

  // Resolution 5 (Audit)
  blocks.push({
    type: "list",
    bullet: "4.",
    indentStyle: "keputusan",
    runs: [{ text: `Menyatakan bahwa Laporan Keuangan Perseroan untuk tahun buku tersebut ${data.rupstIsAudited ? "telah diaudit oleh Akuntan Publik" : "tidak memenuhi kriteria wajib audit berdasarkan ketentuan yang berlaku"}.` }]
  });

  // 7. Closing
  blocks.push({ type: "br" });
  blocks.push({
    type: "p",
    runs: [{ text: "VII. PENUTUP", bold: true }]
  });

  const jamTutup = data.rupstMeetingEndTime ? data.rupstMeetingEndTime.replace(":", ".") : "00.00";
  blocks.push({
    type: "p",
    runs: [{ text: `Akhirnya, oleh karena sudah tidak ada hal-hal lain yang perlu dibicarakan lagi, maka Ketua Rapat menutup Rapat ini pada jam ${jamTutup} WIB.` }]
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
  const participants = data.shareholders.filter(sh => (sh.sharesOwned > 0 || sh.isPresent) && sh.name.toUpperCase() !== tandaTanganChairName);
  participants.forEach((sh, idx) => {
    blocks.push({
      type: "p",
      runs: [{ text: `${idx + 1}. ${sh.name.toUpperCase()} \t........................................................` }]
    });
    if (idx !== participants.length - 1) {
      blocks.push({ type: "br" });
      blocks.push({ type: "br" });
    }
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
    runs: [{ text: `PT. ${data.companyName.toUpperCase()}`, bold: true }]
  });
  blocks.push({
    type: "p",
    align: "center",
    runs: [{ text: `TANGGAL ${tglRapatAngka}`, bold: true }]
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
        sh.name.toUpperCase(),
        kedudukanLines,
        ""
      ];
    })
  });

  return blocks;
};
