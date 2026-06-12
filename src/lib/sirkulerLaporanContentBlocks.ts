import { CompanyData } from "../../types";
import { formatNumber, toTitleCase, formatPersonDetails, formatDateStr } from "./formatter";

// Helper for formatting blocks for DOCX
export type Block =
  | { type: "p"; runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]; align?: "center" | "right-center" | "justified"; indentLeft?: number }
  | { type: "list"; bullet: string; runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]; indentLeft: number; indentHanging: number }
  | { type: "numbered"; num: string | number; runs: { text: string; bold?: boolean; underline?: boolean; italic?: boolean; color?: string }[]; indentLeft: number; indentHanging: number }
  | { type: "br" }
  | { type: "pageBreak" }
  | { type: "signatures"; shareholders: { id: string; name: string }[] };

export function generateSirkulerLaporanBlocks(data: CompanyData): Block[] {
  const blocks: Block[] = [];

  const companyNameText = data.companyName || "";
  const displayCompanyName = companyNameText.toUpperCase().startsWith("PT") || companyNameText.toUpperCase().startsWith("PT.")
    ? companyNameText.toUpperCase()
    : `PT ${companyNameText.toUpperCase()}`;
  const finalCompanyName = data.companyName ? displayCompanyName : "PT. ............................";
  const domicile = data.domicile ? `Kota ${toTitleCase(data.domicile)}` : "Kota ............................";

  const shareholders = data.finalShareholders.length > 0 ? data.finalShareholders : data.shareholders;

  // Title
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "KOP SURAT PT", bold: true }] },
    { type: "br" },
    { type: "p", align: "center", runs: [{ text: "KEPUTUSAN PARA PEMEGANG SAHAM", bold: true, underline: true }] },
    { type: "p", align: "center", runs: [{ text: finalCompanyName, bold: true }] },
    { type: "br" }
  );

  blocks.push(
    {
      type: "p", runs: [
        { text: "Pada hari ini, " },
        { text: data.slHari || "..............", bold: true },
        { text: ", tanggal " },
        { text: data.slTanggalHuruf || "............................", bold: true },
        { text: "." }
      ]
    },
    { type: "br" },
    {
      type: "p", runs: [
        { text: `Para Pemegang Saham ${finalCompanyName}, berkedudukan di ${domicile}, yang anggaran dasarnya dimuat dalam : Akta Pendirian tertanggal ${data.establishmentDeedDate || '............................'}, No. ${data.establishmentDeedNumber || '..........'}, yang dibuat dihadapan ${(data.establishmentNotary && data.establishmentNotaryTitle) ? `${data.establishmentNotary}, ${data.establishmentNotaryTitle}` : data.establishmentNotary || '............................'}, ${data.establishmentNotaryTitle?.includes('Notaris di') ? '' : 'Notaris di '} ${data.establishmentNotaryDomicile ? toTitleCase(data.establishmentNotaryDomicile) : '............................'} dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${data.establishmentSkDate || '............................'} Nomor ${data.establishmentSkNumber || '............................'}.` }
      ]
    }
  );

  if (data.amendmentDeeds && data.amendmentDeeds.length > 0) {
    const lastNum = data.amendmentDeeds.length - 1;
    blocks.push(
      { type: "p", runs: [
          { text: `Akta terakhir tertanggal ${data.amendmentDeeds[lastNum]?.date}, No. ${data.amendmentDeeds[lastNum]?.number}, yang dibuat dihadapan ${(data.amendmentDeeds[lastNum]?.notaryTitle && data.amendmentDeeds[lastNum]?.notaryTitle?.includes('Notaris di')) ? `${data.amendmentDeeds[lastNum]?.notary}, ${data.amendmentDeeds[lastNum]?.notaryTitle} ${data.amendmentDeeds[lastNum]?.notaryDomicile}` : `${data.amendmentDeeds[lastNum]?.notary}, Notaris di ${data.amendmentDeeds[lastNum]?.notaryDomicile}`} dan telah mendapat persetujuan Kementerian Hukum dan Hak Asasi Manusia Nomor ${data.amendmentDeeds[lastNum]?.skSpDocuments?.[0]?.number || '...........'}.` }
        ]
      }
    );
  }

  blocks.push(
    { type: "list", bullet: "-", indentLeft: 360, indentHanging: 360, runs: [{ text: "Setelah itu belum lagi mengalami perubahan." }] },
    { type: "list", bullet: "-", indentLeft: 360, indentHanging: 360, runs: [{ text: "Untuk selanjutnya disebut “Perseroan Terbatas”." }] },
    {
      type: "list", bullet: "-", indentLeft: 360, indentHanging: 360, runs: [
        { text: `Membuat suatu keputusan yang ditandatangani oleh para pemegang saham yang mewakili sejumlah ${formatNumber(data.originalTotalShares)} (${data.originalTotalShares || "..."}) lembar saham yang merupakan seluruh saham yang dikeluarkan oleh Perseroan sampai dengan hari ini, sehingga dengan demikian sah susunannya dan berhak untuk mengambil keputusan yang mengikat mengenai segala apa yang diputuskan, yang mana berdasarkan ketentuan yang diatur dalam Pasal 91 UU No. 40 Tahun 2007 Tentang Perseroan Terbatas, mempunyai kekuatan hukum yang sama dengan Rapat Umum Pemegang Saham.` }
      ]
    },
    { type: "list", bullet: "-", indentLeft: 360, indentHanging: 360, runs: [{ text: "Keputusan tersebut ditandatangani oleh :" }] }
  );

  shareholders.forEach((sh, index) => {
    const currentSal = (sh.salutation || "Tuan").trim();
    const salUpper = currentSal.toUpperCase();
    let nameText = sh.name.toUpperCase().trim();
    
    const stripRegex = new RegExp(`^(${salUpper}|TUAN|NYONYA|NONA|NY|TN|NY\\.|TN\\.|NYONYA\\.|TUAN\\.)\\s+`, "i");
    if (nameText.startsWith(salUpper + " ") || stripRegex.test(nameText)) {
      nameText = nameText.replace(stripRegex, "").trim();
      if (nameText.startsWith(salUpper + " ")) {
        nameText = nameText.substring(salUpper.length + 1).trim();
      }
    }
    
    const personDetails = formatPersonDetails(sh, sh.birthDate ? formatDateStr(sh.birthDate) : "................", "", false);

    blocks.push(
      { type: "numbered", num: `${index + 1}.`, indentLeft: 720, indentHanging: 360, runs: [{ text: sh.shareholderType === 'BADAN_HUKUM' ? "" : `${sh.salutation} ` }, { text: nameText, bold: true }, { text: personDetails + "." }] },
      { type: "p", indentLeft: 720, runs: [{ text: "Dalam hal ini hadir selaku :" }] },
      { type: "list", bullet: "-", indentLeft: 1080, indentHanging: 360, runs: [{ text: `Pemilik dan pemegang saham sebanyak ` }, { text: `${formatNumber(sh.sharesOwned)}`, bold: true }, { text: ` (${sh.sharesOwned || "..."}) lembar saham perseroan` }] }
    );
    const mgt = data.newManagementItems.find(m => m.nik === sh.nik || m.name === sh.name);
    if (mgt) {
      blocks.push(
        { type: "list", bullet: "-", indentLeft: 1080, indentHanging: 360, runs: [{ text: `${mgt.position} Perseroan.` }] }
      );
    }
  });

  blocks.push(
    { type: "list", bullet: "-", indentLeft: 360, indentHanging: 360, runs: [{ text: "Bahwa Keputusan Para Pemegang Saham ini adalah menyangkut hal-hal sebagai berikut:" }] },
    { type: "numbered", num: "1.", indentLeft: 720, indentHanging: 360, runs: [{ text: "Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan." }] },
    { type: "numbered", num: "2.", indentLeft: 720, indentHanging: 360, runs: [{ text: "Pemberitahuan Laporan Tahunan Perseroan." }] },
    { type: "numbered", num: "3.", indentLeft: 720, indentHanging: 360, runs: [{ text: "Pelunasan dan Pembebasan Tanggung Jawab Direksi dan Komisaris Perseroan." }] },
    { type: "list", bullet: "-", indentLeft: 360, indentHanging: 360, runs: [{ text: "Bahwa segala sesuatu yang diputuskan dalam Keputusan ini telah diketahui sepenuhnya oleh para pemegang saham, maka selanjutnya Para Pemegang Saham dengan suara bulat memutuskan :" }] }
  );

  const alasanAuditOptions = [];
  if (data.slAlasanAuditA) alasanAuditOptions.push("Kegiatan Usaha Perseroan tidak menghimpun dan/atau mengelola dana masyarakat.");
  if (data.slAlasanAuditB) alasanAuditOptions.push("Perseroan tidak menerbitkan surat pengakuan utang kepada masyarakat.");
  if (data.slAlasanAuditC) alasanAuditOptions.push("Perseroan tidak merupakan Perseroan Terbuka (Tbk).");
  if (data.slAlasanAuditD) alasanAuditOptions.push("Perseroan tidak merupakan Persero.");
  if (data.slAlasanAuditE) alasanAuditOptions.push("Aset dan/atau jumlah peredaran usaha tidak lebih dari 50 Milyar, atau");
  if (data.slAlasanAuditF) alasanAuditOptions.push("Tidak diwajibkan oleh peraturan perundang-undangan.");

  blocks.push(
    {
      type: "numbered", num: "1.", indentLeft: 720, indentHanging: 360, runs: [
        { text: `Menyetujui Pernyataan Direksi dan Komisaris serta Para Pemegang Saham Perseroan ${finalCompanyName} yang menyatakan bahwa status perseroan ini merupakan PT. Tertutup yang Laporan Keuangannya Tidak Memenuhi Ketentuan Wajib Audit oleh Akuntan Publik dengan alasan sebagai berikut:` }
      ]
    }
  );

  const letters = ["a.", "b.", "c.", "d.", "e.", "f."];
  alasanAuditOptions.forEach((opt, idx) => {
    blocks.push(
      { type: "numbered", num: letters[idx], indentLeft: 1080, indentHanging: 360, runs: [{ text: opt }] }
    );
  });

  const lapNoText = data.slLaporanNomor || "................................";
  const lapTglText = data.slLaporanTanggalHuruf || "................................";

  blocks.push(
    {
      type: "numbered", num: "2.", indentLeft: 720, indentHanging: 360, runs: [
        { text: `Menyetujui Pemberitahuan Laporan Tahunan Perseroan untuk tahun buku yang berakhir pada tertanggal ` },
        { text: data.slTahunBukuAkhirHuruf || "................", bold: true },
        { text: ` pada Sistim Administrasi Badan Hukum Administrasi Hukum Umum Kementrian Hukum (SABH AHU Kemenkum), sebagaimana dimuat dalam Laporannya Nomor : ` },
        { text: lapNoText, bold: true },
        { text: ` tertanggal ` },
        { text: lapTglText, bold: true },
        { text: `, yang meliputi :` }
      ]
    },
    { type: "list", bullet: "-", indentLeft: 1080, indentHanging: 360, runs: [{ text: "Laporan Keuangan, terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini." }] },
    { type: "p", indentLeft: 720, runs: [{ text: "Direksi dan Komisaris serta Para Pemegang Saham Perseroan menyatakan bertanggung jawab penuh atas Kebenaran Informasi dan Tanda Tangan pada seluruh Lampiran Laporan terlampir dan dilekatkan pada Keputusan Para Pemegang Saham ini.", color: "FF0000" }] },
    {
      type: "numbered", num: "3.", indentLeft: 720, indentHanging: 360, runs: [
        { text: `Menyetujui Pelunasan dan Pembebasan Tanggung Jawab Direksi dan Komisaris Perseroan sepenuhnya (acquit et de charge) atas tindakan pengurusan yang telah lakukan Direksi Perseroan, dan atas tindakan pengawasan yang telah dilakukan Komisaris Perseroan selama tahun buku yang berakhir tertanggal ` },
        { text: data.slTahunBukuAkhirHuruf || "................", bold: true },
        { text: `, sepanjang tindakan-tindakan tersebut tercermin dalam Laporan Tahunan Perseroan dan Laporan Keuangan Perseroan, dan seluruh Laporan yang tercantum pada Poin (2) diatas, untuk tahun buku yang berakhir tertanggal ` },
        { text: data.slTahunBukuAkhirHuruf || "................", bold: true },
        { text: `.` }
      ]
    }
  );

  let firstSh = shareholders.length > 0 ? `${shareholders[0].salutation} ${shareholders[0].name}` : '...................................................';

  blocks.push(
    { type: "list", bullet: "-", indentLeft: 360, indentHanging: 360, runs: [{ text: "Akhirnya, para pemegang saham memutuskan dengan suara bulat sehubungan dengan apa yang telah disetujui tersebut di atas, untuk memberi kuasa dengan hak substitusi kepada :" }] },
    { type: "p", indentLeft: 720, runs: [{ text: `${firstSh}, tersebut diatas.` }] },
    { type: "list", bullet: "-", indentLeft: 360, indentHanging: 360, runs: [{ text: `Untuk mengakte notarialkan Keputusan Para Pemegang Saham Perseroan Terbatas ${finalCompanyName} ini dihadapan Notaris.` }] },
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
