import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  LeaderType,
} from "docx";
import { saveAs } from "file-saver";
import { LeaseProjectData } from "../features/lease-agreement/types";
import { formatCurrency, numberToWords, formatDateIndo } from "../../utils/formatters";

export const generateLeaseDocxBlob = async (data: LeaseProjectData): Promise<Blob> => {
  const docxChildren: Paragraph[] = [];

  // Helper to add centered bold heading
  const addHeader = (text: string) => {
    docxChildren.push(
      new Paragraph({
        children: [new TextRun({ text, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
      })
    );
  };

  // Helper to add centered sub-heading
  const addSubHeader = (text: string) => {
    docxChildren.push(
      new Paragraph({
        children: [new TextRun({ text, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 120 },
      })
    );
  };

  // Helper to add normal paragraph
  const addParagraph = (text: string, options: { bold?: boolean; justify?: boolean; before?: number; after?: number } = {}) => {
    docxChildren.push(
      new Paragraph({
        children: [new TextRun({ text, bold: options.bold || false })],
        alignment: options.justify !== false ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
        spacing: { before: options.before ?? 60, after: options.after ?? 60 },
      })
    );
  };

  // Title Block
  addHeader("PERJANJIAN SEWA MENYEWA");
  
  docxChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "Nomor : [Draf Akta]", bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 120 },
    })
  );

  // Opening Statement
  addParagraph(
    "Pada hari ini, _______________, Tanggal ____________________, Pukul _________ WIB. " +
    "Berhadapan dengan saya, NUKANTINI PUTRI PARINCHA, Sarjana Hukum, Magister Kenotariatan, " +
    "Notaris di Kabupaten Bandung Barat, dengan dihadiri oleh saksi-saksi yang nama-namanya akan disebutkan pada bagian akhir akta ini:"
  );

  // Parties
  data.parties.forEach((p, idx) => {
    const roleLabel = idx === 0 ? "PIHAK PERTAMA" : idx === 1 ? "PIHAK KEDUA" : `PIHAK KETIGA (${p.role})`;
    addParagraph(`- ${roleLabel} :`, { bold: true, before: 120, after: 60 });
    
    let partyText = `Nama: ${p.name || "____________________"} | Tipe: ${p.clientType || "PERORANGAN"}\n` +
      `Alamat: ${p.alamat || "____________________"}\n` +
      `NIK: ${p.nik || "____________________"} | NPWP: ${p.npwp || "____________________"}`;
    
    if (p.maritalStatus) {
      partyText += `\nStatus Perkawinan: ${p.maritalStatus}`;
    }
    if (p.position) {
      partyText += `\nJabatan: ${p.position}`;
    }
    if (p.authorityBasis) {
      partyText += `\nKewenangan/Dasar Bertindak: ${p.authorityBasis}`;
    }
    if (p.spouseApproval) {
      partyText += `\nPersetujuan Pasangan: ${p.spouseApproval}`;
    }

    // Split into individual lines to keep formatting neat
    partyText.split("\n").forEach((line) => {
      addParagraph("  " + line, { justify: false, before: 20, after: 20 });
    });
  });

  // Recital
  addParagraph(
    "Para Pihak dengan ini menerangkan terlebih dahulu bahwa Pihak Pertama sepakat untuk menyewakan kepada Pihak Kedua " +
    "dan Pihak Kedua sepakat untuk menerima sewa dari Pihak Pertama, selanjutnya Para Pihak sepakat untuk melangsungkan " +
    "Perjanjian ini dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut :",
    { before: 180, after: 120 }
  );

  // Articles List
  const articles: { title: string; content: string[] }[] = [];

  // Pasal 1
  articles.push({
    title: "PASAL 1 - OBYEK SEWA",
    content: [
      `Obyek Sewa yang dimaksud dalam akta Perjanjian ini adalah sebuah ${data.leaseObject.objectType || "Bangunan"} bernama ${data.leaseObject.objectName || "____________________"} dengan luas bangunan sekitar ${data.leaseObject.buildingArea || "___"} m², berdasarkan Sertifikat Hak Milik (SHM) Nomor ${data.leaseObject.shm || "___________"} dengan luas tanah sekitar ${data.leaseObject.landArea || "___"} m².`,
      `Obyek terletak di alamat: ${data.leaseObject.alamat || "____________________"}`,
      `Nomor Identifikasi Bidang (NIB): ${data.leaseObject.nib || "___________"}`,
      `Surat Ukur: ${data.leaseObject.surveyCertificate || "___________"}`,
      `IMB/PBG: ${data.leaseObject.imb || "___________"}`,
      `SPPT PBB: ${data.leaseObject.spptPbb || "___________"}`,
      `Tercatat atas nama Pemilik: ${data.leaseObject.ownerName || "____________________"}`
    ]
  });

  // Pasal 2
  articles.push({
    title: "PASAL 2 - JANGKA WAKTU SEWA",
    content: [
      `Perjanjian ini dilangsungkan untuk jangka waktu ${data.durationYears || 0} tahun ${data.durationMonths || 0} bulan ${data.durationDays || 0} hari.`,
      `Masa sewa dimulai pada tanggal ${data.startDate ? formatDateIndo(data.startDate) : "___________"} dan akan berakhir pada tanggal ${data.endDate ? formatDateIndo(data.endDate) : "___________"}.`
    ]
  });

  // Pasal 3
  articles.push({
    title: "PASAL 3 - HARGA SEWA",
    content: [
      `Harga sewa disepakati sebesar ${formatCurrency(data.annualPrice || 0)} (${numberToWords(data.annualPrice || 0)} rupiah) per tahun.`,
      `Total harga sewa untuk jangka waktu sewa keseluruhan sebesar ${formatCurrency(data.totalPrice || 0)} (${numberToWords(data.totalPrice || 0)} rupiah).`
    ]
  });

  // Pasal 4
  articles.push({
    title: "PASAL 4 - PEMBAYARAN HARGA SEWA",
    content: [
      "Jumlah Harga Sewa sebagaimana dimaksud dalam Pasal sebelumnya akan dibayarkan oleh Pihak Kedua kepada Pihak Pertama dengan ketentuan rincian pembayaran sebagai berikut:",
      ...data.payments.map((pm, pmIdx) => (
        `- Pembayaran ke-${pmIdx + 1} (${pm.paymentType}): Sebesar ${formatCurrency(pm.amount)} paling lambat dibayarkan pada tanggal ${pm.paymentDate ? formatDateIndo(pm.paymentDate) : "___________"}. (${pm.description || "Tanpa keterangan"})`
      )),
      `Pihak Kedua juga memberikan uang deposit sebesar ${formatCurrency(data.depositAmount || 0)} kepada Pihak Pertama sebagai jaminan kelalaian perbaikan aset atau tunggakan di akhir sewa.`,
      `Pembayaran dilakukan melalui transfer rekening ke Bank: ${data.bankName || "___________"}, Nomor Rekening: ${data.bankAccountNumber || "___________"}, atas nama: ${data.bankAccountOwner || "___________"}.`,
      `Pembayaran biaya jasa notaris penyusunan akta ini sepenuhnya menjadi tanggung jawab: ${data.notaryFeeResponsible || "Kedua Belah Pihak"}.`
    ]
  });

  // Pasal 5
  articles.push({
    title: "PASAL 5 - SERAH TERIMA OBYEK SEWA",
    content: [
      `1) Pihak Pertama menyerahkan kunci dan Obyek Sewa kepada Pihak Kedua pada tanggal ${data.handoverDate ? formatDateIndo(data.handoverDate) : "___________"} dalam keadaan ${data.buildingCondition || "Baik dan Layak Pakai"}.`,
      `2) Pihak Kedua dengan ini menyatakan menerima penyerahan kunci obyek sewa tersebut. Catatan tambahan penyerahan: ${data.handoverNotes || "Tidak ada catatan khusus."}`
    ]
  });

  // Pasal 6
  articles.push({
    title: "PASAL 6 - KEWAJIBAN PIHAK PERTAMA",
    content: data.firstPartyObligations.map((ob, obIdx) => `(${obIdx + 1}) ${ob}`)
  });

  // Pasal 7
  articles.push({
    title: "PASAL 7 - KEWAJIBAN PIHAK KEDUA",
    content: data.secondPartyObligations.map((ob, obIdx) => `(${obIdx + 1}) ${ob}`)
  });

  // Pasal 8
  articles.push({
    title: "PASAL 8 - KEWAJIBAN MEMELIHARA DAN MEMPERBAIKI OBYEK SEWA",
    content: data.maintenanceClauses.map((mc, mcIdx) => `(${mcIdx + 1}) ${mc}`)
  });

  // Pasal 9 (Optional sublease)
  if (data.allowTransfer) {
    articles.push({
      title: "PASAL 9 - PENGALIHAN HAK SEWA",
      content: [data.transferConditions || "Pihak Kedua dilarang memindahkan hak sewa baik sebagian maupun seluruhnya tanpa persetujuan tertulis dari Pihak Pertama."]
    });
  }

  // Pasal 10
  articles.push({
    title: "PASAL 10 - PEMUTUSAN PERJANJIAN SEWA MENYEWA",
    content: data.terminationReasons.map((tr, trIdx) => `(${trIdx + 1}) ${tr}`)
  });

  // Pasal 11
  articles.push({
    title: "PASAL 11 - PAJAK-PAJAK",
    content: [
      `Pajak Bumi dan Bangunan (PBB) selama masa sewa berlangsung menjadi tanggung jawab: ${data.pbbResponsible || "Pihak Pertama"}.`,
      `Pajak Penghasilan (PPh) atas sewa bangunan ini ditanggung oleh: ${data.pphResponsible || "Pihak Kedua"} dengan nominal sebesar ${formatCurrency(data.pphAmount || 0)}.`,
      `Ketentuan pajak lainnya: ${data.otherTaxes || "Tidak ada."}`
    ]
  });

  // Pasal 12 (Optional Option Right)
  if (data.hasOptionRight) {
    articles.push({
      title: "PASAL 12 - HAK OPSI UNTUK MENYEWA KEMBALI",
      content: [data.optionRightSettings || "Pihak Kedua memiliki hak opsi untuk memperpanjang masa sewa dengan ketentuan yang akan disepakati bersama."]
    });
  }

  // Pasal 13
  articles.push({
    title: "PASAL 13 - PENYERAHAN KEMBALI OBYEK SEWA PADA SAAT PERJANJIAN BERAKHIR",
    content: [data.returnConditions || "Pihak Kedua wajib mengosongkan dan menyerahkan kembali obyek sewa dalam keadaan baik dan bersih pada saat masa sewa berakhir."]
  });

  // Pasal 14
  articles.push({
    title: "PASAL 14 - DENDA PENYERAHAN OBYEK SEWA",
    content: [
      "1) Pihak Kedua berkewajiban mengosongkan obyek sewa tepat waktu di akhir masa sewa.",
      `2) Apabila terlambat melakukan pengosongan, Pihak Kedua dikenakan denda harian sebesar ${formatCurrency(data.fineAmountPerDay || 0)} per hari keterlambatan, dengan batas denda maksimal sebesar ${formatCurrency(data.fineMaxAmount || 0)} atau batas keterlambatan hingga ${data.delayDurationLimitDays || 0} hari.`,
      "3) Jika keterlambatan melewati batas hari yang diperbolehkan, Pihak Pertama berhak melakukan pengosongan sepihak secara sah."
    ]
  });

  // Pasal 15 (Optional Force Majeure)
  if (data.useForceMajeure) {
    articles.push({
      title: "PASAL 15 - FORCE MAJEUR",
      content: data.forceMajeureEvents.map((fm, fmIdx) => `(${fmIdx + 1}) ${fm}`)
    });
  }

  // Pasal 16
  articles.push({
    title: "PASAL 16 - KETENTUAN LAIN-LAIN",
    content: data.additionalClauses.map((ac, acIdx) => `(${acIdx + 1}) ${ac}`)
  });

  // Pasal 17
  articles.push({
    title: "PASAL 17 - PENYELESAIAN PERSELISIHAN",
    content: [
      `Apabila terjadi perselisihan di antara kedua belah pihak, maka kedua belah pihak sepakat untuk menyelesaikan secara kekeluargaan atau musyawarah. Apabila tidak tercapai mufakat, maka penyelesaian sengketa diselesaikan melalui ${data.disputeResolution || "Musyawarah"}.`
    ]
  });

  // Render all articles in document
  articles.forEach((art, idx) => {
    addHeader(`PASAL ${idx + 1}`);
    addSubHeader(art.title.replace(/^PASAL \d+\s*-\s*/i, ""));
    
    art.content.forEach((paragraphText) => {
      addParagraph(paragraphText, { justify: true });
    });
  });

  // Closing
  addHeader("DEMIKIANLAH AKTA INI");
  addParagraph(
    "Dibuat dan diresmikan di Kabupaten Bandung Barat, pada hari, tanggal, bulan, tahun, dan pukul tersebut di atas, " +
    "dengan dihadiri oleh saksi-saksi yang sah, serta ditandatangani oleh para penghadap, saksi-saksi, dan saya, Notaris."
  );

  // Pack document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24, // 12pt
          },
          paragraph: {
            spacing: {
              line: 360, // 1.5 line spacing
              before: 80,
              after: 80,
            },
            alignment: AlignmentType.JUSTIFIED,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: docxChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
};

export const generateLeaseDocx = async (data: LeaseProjectData) => {
  const blob = await generateLeaseDocxBlob(data);
  const fileName = `Draf Perjanjian Sewa - ${data.leaseObject.objectName || "Obyek Sewa"}`;
  saveAs(blob, `${fileName}.docx`);
};
