import { CompanyData } from "../../types";
import {
  formatDateStr,
  formatDateRupst,
  formatCompanyName,
  toTitleCase,
} from "./formatter";

// Block types matching the DOCX structure exactly
export type Block =
  | { type: "p"; align?: "center" | "both" | "left"; runs: RunToken[]; spacingAfter?: number }
  | { type: "br" }
  | { type: "inlineBr"; align?: "center" | "both" | "left"; runs: RunToken[] } // paragraph with internal <w:br/> line breaks (for closing section)
  | { type: "managementNamed"; runs: RunToken[] }   // ListParagraph with bullet numId
  | { type: "managementSub"; runs: RunToken[]; spacingAfter?: number } // ListParagraph no bullet, indent left=426
  | { type: "listNumber"; runs: RunToken[] }        // ListNumber style (1. 2. 3. 4.)
  | { type: "listBullet"; runs: RunToken[] }        // ListBullet style (sub-items a. b. c.)
  | { type: "sigTable"; columns: { name: string; position: string }[] } // 2-column signature table
  | { type: "sigSingle"; name: string; position: string };              // single name+position below table

export interface RunToken {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  size?: number; // half-points (e.g. 28 = 14pt)
}

export const generateRupstPernyataanBlocks = (data: CompanyData): Block[] => {
  const blocks: Block[] = [];

  const fiscalYear = data.rupstFiscalYear || "2025";
  const notaryName = data.notaryName || "NUKANTINI PUTRI PARINCHA, SH., M.Kn";
  const domicile =
    data.domicileStyle === "KABUPATEN"
      ? `Kabupaten ${toTitleCase(data.domicile || "")}`
      : `Kota ${toTitleCase(data.domicile || "")}`;

  // 1. Title — centered, bold, size 24 (12pt)
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "SURAT PERNYATAAN", bold: true, size: 24 }] },
    { type: "p", runs: [] }
  );

  // 2. Opening paragraph (no blank line between title and this — DOCX has them adjacent)
  blocks.push({
    type: "p",
    align: "both",
    runs: [
      { text: "Yang bertandatangan di bawah ini Direksi dan Dewan Komisaris " },
      { text: formatCompanyName(data.companyName) },
      {
        text:
          `, suatu perseroan terbatas yang didirikan berdasarkan hukum Negara Republik Indonesia dan berkedudukan di ${domicile}, untuk selanjutnya disebut sebagai \u201cPerseroan\u201d, sebagai berikut:`,
      },
    ],
  });

  // 3. Management list — each person: Nama (bullet), NIK (no bullet), Jabatan (no bullet, spacingAfter=240)
  const management = data.shareholders.filter((sh) => sh.isManagement);

  management.forEach((m) => {
    // Nama — uses numId (bullet/decimal marker from numId 10)
    blocks.push({
      type: "managementNamed",
      runs: [
        { text: "Nama" },
        { text: "\t" },
        { text: ":" },
        { text: "\t" },
        { text: m.name.toUpperCase() },
      ],
    });
    let idLabel = "NIK";
    let idValue = m.nik || "-";

    if (m.nationalityType === "WNA" || m.isForeign) {
      if (m.hasKitas && m.kitasNumber) {
        idLabel = "KITAS";
        idValue = m.kitasNumber;
      } else if (m.passportNumber) {
        idLabel = "Paspor";
        idValue = m.passportNumber;
      } else {
        idLabel = "KITAS / Paspor";
      }
    }

    // NIK / KITAS / Paspor — sub (no bullet)
    blocks.push({
      type: "managementSub",
      runs: [
        { text: idLabel },
        { text: "\t" },
        { text: ":" },
        { text: "\t" },
        { text: idValue },
      ],
    });
    // Jabatan — sub with spacingAfter=240
    blocks.push({
      type: "managementSub",
      spacingAfter: 240,
      runs: [
        { text: "Jabatan" },
        { text: "\t" },
        { text: ":" },
        { text: "\t" },
        { text: m.managementPosition || "Direktur Utama" },
      ],
    });
  });

  // 4. "Dengan ini menyatakan..."
  blocks.push({
    type: "p",
    runs: [{ text: "Dengan ini menyatakan sebagai berikut:" }],
  });

  // 5. Point 1 — ListNumber
  blocks.push({
    type: "listNumber",
    runs: [
      { text: "Bahwa status perseroan " },
      { text: formatCompanyName(data.companyName) },
      { text: " merupakan PT. Tertutup yang Laporan Keuangannya " },
      {
        text: data.rupstIsAudited ? "Memenuhi" : "Tidak Memenuhi",
        bold: true,
      },
      {
        text: " Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:",
      },
    ],
  });

  // Sub-items a. b. c. etc. — ListBullet (from DOCX these are simple bullet paragraphs)
  const reasons = [
    {
      key: "rupstAlasanAuditA",
      text: `Kegiatan Usaha Perseroan ${data.rupstIsAudited ? "" : "tidak "}menghimpun dan/atau mengelola dana masyarakat.`,
    },
    {
      key: "rupstAlasanAuditB",
      text: `Perseroan ${data.rupstIsAudited ? "" : "tidak "}menerbitkan surat pengakuan utang kepada masyarakat.`,
    },
    {
      key: "rupstAlasanAuditC",
      text: `Perseroan ${data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Perseroan Terbuka (Tbk).`,
    },
    {
      key: "rupstAlasanAuditD",
      text: `Perseroan ${data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Persero.`,
    },
    {
      key: "rupstAlasanAuditE",
      text: `Aset dan/atau jumlah peredaran usaha ${data.rupstIsAudited ? "lebih" : "tidak lebih"} dari 50 Milyar, atau`,
    },
    {
      key: "rupstAlasanAuditF",
      text: `${data.rupstIsAudited ? "" : "Tidak "}diwajibkan oleh peraturan perundang-undangan.`,
    },
  ];

  reasons.forEach((r) => {
    if ((data as any)[r.key] !== false) {
      blocks.push({
        type: "listBullet",
        runs: [{ text: r.text }],
      });
    }
  });

  blocks.push({
    type: "listNumber",
    runs: [
      { text: "Bahwa Laporan Tahunan " },
      { text: formatCompanyName(data.companyName) },
      { text: ` tahun buku ${fiscalYear} ` },
      {
        text:
          'dibuat oleh Direksi dan telah ditelaah oleh Dewan Komisaris dengan sebenar-benarnya sesuai dengan ketentuan dalam Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas sebagaimana telah diubah dengan Undang-Undang Nomor 6 Tahun 2023 tentang Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 2 Tahun 2022 tentang Cipta Kerja menjadi Undang-Undang (\u201cUUPT\u201d), Pasal 66 juncto Peraturan Menteri Hukum Republik Indonesia Nomor 49 Tahun 2025 tentang Syarat dan Tata Cara Pendirian, Perubahan, dan Pembubaran Badan Hukum Perseroan Terbatas.',
      },
    ],
  });

  const kapPart =
    data.rupstIsAudited && data.rupstKapName
      ? `telah diaudit oleh Kantor Akuntan Publik ${data.rupstKapName.toUpperCase()} sebagaimana dimuat dalam laporan audit tertanggal ${
          data.rupstFinancialReportDate
            ? formatDateStr(data.rupstFinancialReportDate)
            : "31 Desember " + fiscalYear
        }`
      : `disusun berdasarkan standar akuntansi keuangan yang berlaku`;

  // Parse kapPart into runs: if audited, the date at end should be red
  const point3Runs: RunToken[] = [
    { text: "Bahwa laporan keuangan " },
    { text: `tahun buku ${fiscalYear} ` },
    {
      text: `yang menjadi salah satu bagian dari Laporan Tahunan disusun berdasarkan standar akuntansi keuangan yang berlaku and `,
    },
  ];

  if (data.rupstIsAudited && data.rupstKapName) {
    const auditDateStr = data.rupstFinancialReportDate
      ? formatDateRupst(data.rupstFinancialReportDate)
      : "31 Desember " + fiscalYear;
    // Split date: "31 Desember 2022" — month+year part is red in DOCX
    const dateparts = auditDateStr.split(" ");
    const dayPart = dateparts[0]; // "31"
    const rest = dateparts.slice(1).join(" "); // "Desember 2022"
    point3Runs.push({
      text: `telah diaudit oleh Kantor Akuntan Publik ${data.rupstKapName.toUpperCase()} sebagaimana dimuat dalam laporan audit tertanggal ${dayPart} `,
    });
    point3Runs.push({ text: rest });
    point3Runs.push({ text: "." });
  } else {
    point3Runs.push({ text: `${kapPart}.` });
  }

  blocks.push({ type: "listNumber", runs: point3Runs });

  blocks.push({
    type: "listNumber",
    runs: [
      { text: "Bahwa isi penyampaian Laporan Tahunan Perseroan Tahun Buku " },
      { text: fiscalYear },
      {
        text: ` kepada Menteri Hukum melalui Sistem Administrasi Badan Hukum Kementerian Hukum Republik Indonesia yang dilakukan oleh Notaris ${notaryName.toUpperCase()}, sepenuhnya adalah tanggung jawab Perseroan dan karenanya membebaskan Notaris dari segala bentuk tanggung jawab maupun akibat hukum yang timbul atas penyampaian laporan tersebut.`,
      },
    ],
  });

  blocks.push({ type: "p", runs: [] });

  // 6. Closing — "Demikian..." with spacingAfter = 120 (6pt)
  blocks.push({
    type: "p",
    align: "left",
    spacingAfter: 120,
    runs: [
      { text: "Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya." },
    ],
  });

  // 7. Signing block — city, company name, materai, then table, then solo komisaris
  const signingDateStr = data.signingDate
    ? formatDateRupst(data.signingDate)
    : "................................ 2026";
  const city = toTitleCase(data.domicile || "Bandung");

  // Signing paragraph: city+date, company name, blank line, Materai — align left
  blocks.push({
    type: "inlineBr",
    align: "left",
    runs: [
      { text: `${city}, ${signingDateStr}` },
      { text: "\n" },
      { text: formatCompanyName(data.companyName) },
      { text: "\n" },
      { text: "\n" },
      { text: "Materai Rp10.000" },
      { text: "\n" },
      { text: "\n" },
    ],
  });

  // 8. Signature table — pair everyone up
  const tablePairs: { name: string; position: string }[][] = [];
  for (let i = 0; i < management.length; i += 2) {
    const pair = [
      { name: management[i].name.toUpperCase(), position: management[i].managementPosition || "" },
    ];
    if (management[i + 1]) {
      pair.push({
        name: management[i + 1].name.toUpperCase(),
        position: management[i + 1].managementPosition || "",
      });
    } else {
      pair.push({ name: "", position: "" });
    }
    tablePairs.push(pair);
  }

  for (const pair of tablePairs) {
    blocks.push({ type: "sigTable", columns: pair });
  }

  return blocks;
};
