import { CompanyData } from "../../types";
import {
  formatDateStr,
  formatCompanyName,
  toTitleCase,
} from "./formatter";
import { Block } from "./rupsTahunanContentBlocks";

export const generateRupstPernyataanBlocks = (data: CompanyData): Block[] => {
  const blocks: Block[] = [];

  const fiscalYear = data.rupstFiscalYear || "2025";
  const notaryName = data.notaryName || "NUKANTINI PUTRI PARINCHA, S.H., M.Kn.";
  const domicile = toTitleCase(data.domicile || "");

  // 1. Title
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "KOP SURAT PERUSAHAAN", bold: true, color: "FF0000" }] },
    { type: "br" },
    { type: "p", align: "center", runs: [{ text: "SURAT PERNYATAAN", bold: true, size: 14 }] },
    { type: "br" }
  );

  // 2. Opening
  blocks.push({
    type: "p",
    runs: [
      { text: "Yang bertandatangan di bawah ini Direksi dan Dewan Komisaris " },
      { text: formatCompanyName(data.companyName), bold: true },
      { text: ", suatu perseroan terbatas yang didirikan berdasarkan hukum Negara Republik Indonesia dan berkedudukan di " },
      { text: domicile },
      { text: ", untuk selanjutnya disebut sebagai “Perseroan”, sebagai berikut:" }
    ]
  });

  // 3. Management List
  let managementMembers = data.shareholders.filter(sh => sh.isManagement).map(sh => ({
    name: sh.name,
    nik: sh.nik,
    position: sh.managementPosition || "Direktur",
    address: sh.address
  }));

  if (managementMembers.length === 0 && data.oldManagementItems && data.oldManagementItems.length > 0) {
    managementMembers = data.oldManagementItems.map(m => ({
      name: m.name,
      nik: m.nik || "-",
      position: m.position || "Direktur",
      address: m.address
    }));
  }

  // Sort management members by position (Directors first, then Commissioners)
  managementMembers.sort((a, b) => {
    const posA = (a.position || "").toUpperCase();
    const posB = (b.position || "").toUpperCase();
    if (posA.includes("DIREKTUR") && !posB.includes("DIREKTUR")) return -1;
    if (!posA.includes("DIREKTUR") && posB.includes("DIREKTUR")) return 1;
    return 0;
  });

  managementMembers.forEach((m, idx) => {
    blocks.push(
      {
        type: "p",
        runs: [
          { text: `${idx + 1}. Nama` },
          { text: `\t: ${m.name.toUpperCase()}`, bold: true }
        ]
      },
      {
        type: "p",
        runs: [
          { text: `   NIK` },
          { text: `\t: ${m.nik || "-"}` }
        ]
      },
      {
        type: "p",
        runs: [
          { text: `   Jabatan` },
          { text: `\t: ${m.position}` }
        ]
      },
      { type: "br" }
    );
  });

  blocks.push({ type: "p", runs: [{ text: "Dengan ini menyatakan sebagai berikut:" }] });

  // 4. Points
  // Point 1: Audit Status
  blocks.push({
    type: "list",
    bullet: "1.",
    runs: [
      { text: `Bahwa status perseroan ` },
      { text: formatCompanyName(data.companyName), bold: true },
      { text: ` merupakan PT. Tertutup yang Laporan Keuangannya ` },
      { text: data.rupstIsAudited ? "Memenuhi" : "Tidak Memenuhi", bold: true },
      { text: ` Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:` }
    ]
  });

  const reasons = [
    { key: 'rupstAlasanAuditA', text: `Kegiatan Usaha Perseroan ${data.rupstIsAudited ? "" : "tidak "}menghimpun dan/atau mengelola dana masyarakat.` },
    { key: 'rupstAlasanAuditB', text: `Perseroan ${data.rupstIsAudited ? "" : "tidak "}menerbitkan surat pengakuan utang kepada masyarakat.` },
    { key: 'rupstAlasanAuditC', text: `Perseroan ${data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Perseroan Terbuka (Tbk).` },
    { key: 'rupstAlasanAuditD', text: `Perseroan ${data.rupstIsAudited ? "merupakan" : "tidak merupakan"} Persero.` },
    { key: 'rupstAlasanAuditE', text: `Aset dan/atau jumlah peredaran usaha ${data.rupstIsAudited ? "lebih" : "tidak lebih"} dari 50 Milyar, atau` },
    { key: 'rupstAlasanAuditF', text: `${data.rupstIsAudited ? "" : "Tidak "}diwajibkan oleh peraturan perundang-undangan.` }
  ];

  let subIdx = 0;
  reasons.forEach(r => {
    if ((data as any)[r.key] !== false) {
      blocks.push({
        type: "list",
        bullet: `${String.fromCharCode(97 + subIdx)}.`,
        indentTabs: 1,
        runs: [{ text: r.text }]
      });
      subIdx++;
    }
  });

  // Point 2: Annual Report
  blocks.push({
    type: "list",
    bullet: "2.",
    runs: [
      { text: `Bahwa Laporan Tahunan ` },
      { text: formatCompanyName(data.companyName), bold: true },
      { text: ` tahun buku ${fiscalYear} dibuat oleh Direksi dan telah ditelaah oleh Dewan Komisaris dengan sebenar-benarnya sesuai dengan ketentuan dalam Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas sebagaimana telah diubah dengan Undang-Undang Nomor 6 Tahun 2023 tentang Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 2 Tahun 2022 tentang Cipta Kerja menjadi Undang-Undang (“UUPT”), Pasal 66 juncto Peraturan Menteri Hukum Republik Indonesia Nomor 49 Tahun 2025 tentang Syarat dan Tata Cara Pendirian, Perubahan, dan Pembubaran Badan Hukum Perseroan Terbatas.` }
    ]
  });

  // Point 3: Financial Statement
  const kapPart = (data.rupstIsAudited && data.rupstKapName) 
    ? `telah diaudit oleh Kantor Akuntan Publik ${data.rupstKapName.toUpperCase()} sebagaimana dimuat dalam laporan audit tertanggal ${data.rupstFinancialReportDate ? formatDateStr(data.rupstFinancialReportDate) : "31 Desember " + fiscalYear}`
    : `disusun berdasarkan standar akuntansi keuangan yang berlaku`;

  blocks.push({
    type: "list",
    bullet: "3.",
    runs: [
      { text: `Bahwa laporan keuangan ` },
      { text: `tahun buku ${fiscalYear}`, bold: true, color: "FF0000" },
      { text: ` yang menjadi salah satu bagian dari Laporan Tahunan disusun berdasarkan standar akuntansi keuangan yang berlaku dan ${kapPart}.` }
    ]
  });

  // Point 4: Submission
  blocks.push({
    type: "list",
    bullet: "4.",
    runs: [
      { text: `Bahwa isi penyampaian Laporan Tahunan Perseroan Tahun Buku ` },
      { text: fiscalYear, bold: true, color: "FF0000" },
      { text: ` kepada Menteri Hukum melalui Sistem Administrasi Badan Hukum Kementerian Hukum Republik Indonesia yang dilakukan oleh Notaris ` },
      { text: notaryName.toUpperCase(), bold: true },
      { text: `, sepenuhnya adalah tanggung jawab Perseroan dan karenanya membebaskan Notaris dari segala bentuk tanggung jawab maupun akibat hukum yang timbul atas penyampaian laporan tersebut.` }
    ]
  });

  blocks.push(
    { type: "br" },
    { type: "p", runs: [{ text: "Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya." }] },
    { type: "br" }
  );

  // Closing
  const signingDateStr = data.signingDate ? formatDateStr(data.signingDate).split('-').slice(1).join(' ') : "................................ 2026";
  const city = toTitleCase(data.domicile || "Bandung");

  blocks.push(
    { type: "p", runs: [{ text: `${city}, ${signingDateStr}` }] },
    { type: "p", runs: [{ text: formatCompanyName(data.companyName), bold: true, color: "FF0000" }] },
    { type: "br" },
    { type: "p", runs: [{ text: "Materai Rp10.000", size: 8, color: "FF0000" }] },
    { type: "br" }
  );

  // Signatures
  // We can use a table or floating layout. The createListP in generateRUPSTDocx doesn't support complex grids well.
  // I'll just list them.
  managementMembers.forEach(m => {
    blocks.push(
      { type: "p", runs: [{ text: m.name.toUpperCase(), bold: true, color: "FF0000" }] },
      { type: "p", runs: [{ text: m.position, size: 10 }] },
      { type: "br" }
    );
  });

  return blocks;
};
