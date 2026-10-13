import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle
} from "docx";
import { saveAs } from "file-saver";

export interface DataCorrectionPersonnel {
  id: string;
  name: string;
  position: string;
  sharesCount: string;
  oldPhone: string;
  newPhone: string;
  oldEmail: string;
  newEmail: string;
}

export interface DataCorrectionData {
  letterNumber: string;
  date: string;
  companyName: string;
  companyAddress: string;
  recipientAddress: string;
  
  transactionType: 'SK Pendirian' | 'SK Perubahan' | 'SP Anggaran Dasar' | 'SP Perubahan Data';
  documentNumber: string;
  documentDate: string;
  deedNumber: string;
  deedDate: string;
  notaryName: string;

  signerName: string;
  signerNik: string;
  signerPosition: string;
  actingOnBehalfOf: string;

  personnel: DataCorrectionPersonnel[];

  powerLetterNumber: string;
  granteeName: string;
  granteePosition: string;
  granteePositionTitle: string;
  granteeOfficeAddress: string;
  granteeSkInfo: string;
}

export const transactionTypeMap: Record<string, string> = {
  'SK Pendirian': 'SK PENGESAHAN PENDIRIAN BADAN HUKUM PERSEROAN TERBATAS',
  'SK Perubahan': 'SK PERSETUJUAN PERUBAHAN ANGGARAN DASAR PERSEROAN TERBATAS',
  'SP Anggaran Dasar': 'SURAT PENERIMAAN PEMBERITAHUAN PERUBAHAN ANGGARAN DASAR PERSEROAN',
  'SP Perubahan Data': 'SURAT PENERIMAAN PEMBERITAHUAN PERUBAHAN DATA PERSEROAN'
};

export function formatDateIndo(dateStr?: string): string {
  if (!dateStr) return "........................";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function formatCityDate(dateStr?: string, city = "Jakarta"): string {
  return `${city}, ${formatDateIndo(dateStr)}`;
}

// ── 1. SURAT PERMOHONAN GENERATOR ─────────────────────────────────────────────
export async function generateSuratPermohonanBlob(data: DataCorrectionData): Promise<Blob> {
  const docChildren: any[] = [];

  const defaultFont = "Times New Roman";

  // Helper for paragraphs
  const addP = (text: string, opts: { bold?: boolean; align?: any; before?: number; after?: number; indentLeft?: number } = {}) => {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text, font: defaultFont, size: 24, bold: opts.bold || false })],
        alignment: opts.align || AlignmentType.JUSTIFIED,
        spacing: { before: opts.before ?? 60, after: opts.after ?? 60, line: 360 },
        indent: opts.indentLeft ? { left: opts.indentLeft } : undefined
      })
    );
  };

  // Kop Surat
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: (data.companyName || "PT ........................").toUpperCase(), font: defaultFont, size: 32, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [new TextRun({ text: data.companyAddress || "Alamat Perseroan ........................................................", font: defaultFont, size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [new TextRun({ text: "_________________________________________________________________________________" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    })
  );

  // Date and Number
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Nomor\t: ${data.letterNumber || "........................"}`, font: defaultFont, size: 24 }),
        new TextRun({ text: `\t\t${formatCityDate(data.date, "Jakarta")}`, font: defaultFont, size: 24 })
      ],
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Hal\t: Permohonan Perbaikan Data Email dan Nomor Telepon ${data.companyName || "Perseroan"}`, font: defaultFont, size: 24, bold: true })],
      spacing: { after: 240 }
    })
  );

  // Recipient
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "Kepada Yth.", font: defaultFont, size: 24 })],
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [new TextRun({ text: "Direktur Jenderal Administrasi Hukum Umum", font: defaultFont, size: 24, bold: true })],
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [new TextRun({ text: "cq. Direktur Badan Usaha", font: defaultFont, size: 24, bold: true })],
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [new TextRun({ text: "Kementerian Hukum", font: defaultFont, size: 24, bold: true })],
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `di ${data.recipientAddress || "Jakarta"}`, font: defaultFont, size: 24 })],
      spacing: { after: 240 }
    })
  );

  // Greeting
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "Dengan Hormat,", font: defaultFont, size: 24 })],
      spacing: { after: 120 }
    })
  );

  // Signer Identity
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "Yang bertanda tangan di bawah ini:", font: defaultFont, size: 24 })],
      spacing: { after: 120 }
    })
  );

  const addIdentityRow = (label: string, val: string) => {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `  •  ${label.padEnd(25, " ")}\t: `, font: defaultFont, size: 24 }),
          new TextRun({ text: val, font: defaultFont, size: 24, bold: label.toLowerCase().includes("nama") || label.toLowerCase().includes("jabatan") })
        ],
        spacing: { after: 60, line: 360 }
      })
    );
  };

  addIdentityRow("Nama", data.signerName || "........................................");
  addIdentityRow("NIK", data.signerNik || "........................................");
  addIdentityRow("Jabatan", data.signerPosition || "Direktur Utama");
  addIdentityRow("Bertindak untuk", `Untuk dan atas nama ${data.companyName || "Perseroan"}`);
  addIdentityRow("Alamat Perseroan", data.companyAddress || "........................................");

  docChildren.push(new Paragraph({ text: "", spacing: { after: 120 } }));

  // Transaction statement
  const fullDocTypeName = transactionTypeMap[data.transactionType] || "SK PENGESAHAN PENDIRIAN BADAN HUKUM PERSEROAN TERBATAS";
  let deedInfoStr = "";
  if (data.deedNumber || data.notaryName) {
    deedInfoStr = `, berdasarkan Akta Notaris ${data.notaryName || "........................"} Nomor ${data.deedNumber || "...."} tanggal ${formatDateIndo(data.deedDate)}`;
  }

  addP(
    `Dengan ini mengajukan permohonan perbaikan data email dan/atau nomor telepon pemegang saham, direksi, dan/atau komisaris pada Sistem Administrasi Badan Hukum, Direktorat Jenderal Administrasi Hukum Umum, Kementerian Hukum. ` +
    `Adapun perbaikan data tersebut merujuk pada data yang tercatat dalam transaksi terakhir perseroan berdasarkan ${fullDocTypeName} Nomor ${data.documentNumber || "........................"}, Tanggal ${formatDateIndo(data.documentDate)}${deedInfoStr}.`
  );

  docChildren.push(new Paragraph({ text: "", spacing: { after: 120 } }));

  // Personnel List & Tables
  const personnelList = data.personnel && data.personnel.length > 0 ? data.personnel : [
    { id: "1", name: "........................................", position: "Direktur", sharesCount: "0", oldPhone: "-", newPhone: "-", oldEmail: "-", newEmail: "-" }
  ];

  personnelList.forEach((p, idx) => {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}.  Nama`, font: defaultFont, size: 24 }),
          new TextRun({ text: `\t: ${p.name.toUpperCase()}`, font: defaultFont, size: 24, bold: true })
        ],
        spacing: { before: 120, after: 40 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `    Jabatan`, font: defaultFont, size: 24 }),
          new TextRun({ text: `\t: ${p.position}`, font: defaultFont, size: 24 })
        ],
        spacing: { after: 40 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `    Jumlah Saham`, font: defaultFont, size: 24 }),
          new TextRun({ text: `\t: ${p.sharesCount || "0"} lembar saham`, font: defaultFont, size: 24 })
        ],
        spacing: { after: 80 }
      })
    );

    // Table for this personnel
    const table = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No.", bold: true, size: 22, font: defaultFont })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Keterangan", bold: true, size: 22, font: defaultFont })], alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Semula", bold: true, size: 22, font: defaultFont })], alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Menjadi", bold: true, size: 22, font: defaultFont })], alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE } }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "1", size: 22, font: defaultFont })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "No. Telp / WhatsApp", size: 22, font: defaultFont })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.oldPhone || "-", size: 22, font: defaultFont })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.newPhone || "-", size: 22, font: defaultFont, bold: true })] })] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "2", size: 22, font: defaultFont })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Alamat Email", size: 22, font: defaultFont })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.oldEmail || "-", size: 22, font: defaultFont })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.newEmail || "-", size: 22, font: defaultFont, bold: true })] })] }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
        insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
      },
    });

    docChildren.push(table);
    docChildren.push(new Paragraph({ text: "", spacing: { after: 120 } }));
  });

  // Reason & Processing
  addP(
    "Permohonan ini diajukan karena data email dan/atau nomor telepon yang tercatat sebelumnya tidak sesuai atau keliru pengisian, sehingga tidak sesuai dengan kondisi yang sebenarnya. " +
    "Adapun data yang diajukan untuk dilakukan perbaikan merupakan data yang benar, valid, aktif, dan dapat dipertanggungjawabkan, serta digunakan untuk kepentingan administrasi resmi Perseroan."
  );

  addP(
    "Sehubungan dengan hal tersebut, kami mohon kiranya Bapak/Ibu berkenan memproses permohonan perbaikan data dimaksud sesuai ketentuan peraturan perundang-undangan."
  );

  addP(
    "Demikian permohonan ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih."
  );

  docChildren.push(new Paragraph({ text: "", spacing: { after: 240 } }));

  // Signature Block
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: `${data.signerPosition || "Direktur Utama"},`, font: defaultFont, size: 24 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [new TextRun({ text: (data.companyName || "Perseroan").toUpperCase(), font: defaultFont, size: 24, bold: true })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 1200 } // Space for stamp and signature
    }),
    new Paragraph({
      children: [new TextRun({ text: `(${data.signerName || "........................................"})`, font: defaultFont, size: 24, bold: true })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 }
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch
        }
      },
      children: docChildren
    }]
  });

  return await Packer.toBlob(doc);
}

// ── 2. SURAT KUASA GENERATOR ───────────────────────────────────────────────────
export async function generateSuratKuasaBlob(data: DataCorrectionData): Promise<Blob> {
  const docChildren: any[] = [];
  const defaultFont = "Times New Roman";

  const addP = (text: string, opts: { bold?: boolean; align?: any; before?: number; after?: number } = {}) => {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text, font: defaultFont, size: 24, bold: opts.bold || false })],
        alignment: opts.align || AlignmentType.JUSTIFIED,
        spacing: { before: opts.before ?? 60, after: opts.after ?? 60, line: 360 }
      })
    );
  };

  // Kop Surat
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: (data.companyName || "PT ........................").toUpperCase(), font: defaultFont, size: 32, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [new TextRun({ text: data.companyAddress || "Alamat Perseroan ........................................................", font: defaultFont, size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({
      children: [new TextRun({ text: "_________________________________________________________________________________" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );

  // Title & Number
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "SURAT PERNYATAAN KUASA", font: defaultFont, size: 28, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Nomor : ${data.powerLetterNumber || "........................"}`, font: defaultFont, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    })
  );

  // Pemberi Kuasa
  addP("Yang bertanda tangan di bawah ini:");
  
  const addIdentityRow = (label: string, val: string) => {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `  •  ${label.padEnd(25, " ")}\t: `, font: defaultFont, size: 24 }),
          new TextRun({ text: val, font: defaultFont, size: 24, bold: label.toLowerCase().includes("nama") })
        ],
        spacing: { after: 60, line: 360 }
      })
    );
  };

  addIdentityRow("Nama", data.signerName || "........................................");
  addIdentityRow("NIK", data.signerNik || "........................................");
  addIdentityRow("Jabatan", data.signerPosition || "Direktur Utama");
  addIdentityRow("Nama Perseroan", data.companyName || "........................................");
  addIdentityRow("Alamat Perseroan", data.companyAddress || "........................................");

  addP("Selanjutnya disebut sebagai PEMBERI KUASA.", { bold: true, before: 120, after: 120 });

  // Penerima Kuasa
  addP("Dengan ini memberikan kuasa kepada:");

  addIdentityRow("Nama", data.granteeName || "........................................");
  addIdentityRow("Jabatan / Pekerjaan", data.granteePosition || "Staff Legal");
  addIdentityRow("Kedudukan", data.granteePositionTitle || "Kuasa Pengurusan");
  addIdentityRow("Alamat Kantor", data.granteeOfficeAddress || "........................................");
  addIdentityRow("Nomor / Dasar Surat", data.granteeSkInfo || "Surat Tugas / Kuasa");

  addP("Selanjutnya disebut sebagai PENERIMA KUASA.", { bold: true, before: 120, after: 200 });

  // KHUSUS
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: "— — — — — — — — — — —  K H U S U S  — — — — — — — — — — —", font: defaultFont, size: 26, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 180 }
    })
  );

  // Scope
  const fullDocTypeName = transactionTypeMap[data.transactionType] || "SK PENGESAHAN PENDIRIAN BADAN HUKUM PERSEROAN TERBATAS";
  addP(
    `Untuk dan atas nama PEMBERI KUASA melakukan tindakan administratif berupa penginputan dan/atau pengajuan permohonan perbaikan data terkait data email dan/atau nomor telepon pemegang saham, direksi, dan/atau dewan komisaris yang tercatat dalam data transaksi terakhir pada Sistem Administrasi Badan Hukum, Direktorat Jenderal Administrasi Hukum Umum, Kementerian Hukum, berdasarkan ${fullDocTypeName} Nomor ${data.documentNumber || "........................"}, Tanggal ${formatDateIndo(data.documentDate)}.`
  );

  addP(
    `Surat kuasa ini berkaitan erat dengan Surat Permohonan ${data.signerPosition || "Direktur Utama"} dari ${data.companyName || "Perseroan"} Nomor : ${data.letterNumber || "........................"}, Tanggal : ${formatDateIndo(data.date)}, perihal Permohonan Perbaikan Data Email dan Nomor Telepon.`
  );

  addP(
    "Segala akibat hukum yang timbul sehubungan dengan pelaksanaan kuasa ini sepenuhnya menjadi tanggung jawab PEMBERI KUASA, dan dengan ini PEMBERI KUASA membebaskan PENERIMA KUASA dari segala tuntutan hukum sepanjang PENERIMA KUASA melaksanakan kuasa ini sesuai dengan ketentuan peraturan perundang-undangan."
  );

  addP(
    "Surat kuasa ini diberikan dengan tanpa hak substitusi dan berlaku sejak tanggal ditandatangani sampai dengan selesainya proses perbaikan data dimaksud."
  );

  addP("Demikian surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya.");

  docChildren.push(new Paragraph({ text: "", spacing: { after: 240 } }));

  // Signatures
  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: `${formatCityDate(data.date, "Jakarta")}`, font: defaultFont, size: 24 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "PENERIMA KUASA,\t\t\t\t", font: defaultFont, size: 24, bold: true }),
        new TextRun({ text: "PEMBERI KUASA,", font: defaultFont, size: 24, bold: true })
      ],
      alignment: AlignmentType.BOTH,
      spacing: { after: 40 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "\t\t\t\t\t\t\t\t", font: defaultFont, size: 24 }),
        new TextRun({ text: `${(data.companyName || "Perseroan").toUpperCase()}`, font: defaultFont, size: 24, bold: true })
      ],
      spacing: { after: 1000 } // Space for stamp / materai
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `(${data.granteeName || "........................................"})`, font: defaultFont, size: 24, bold: true }),
        new TextRun({ text: `\t\t\t(${data.signerName || "........................................"})`, font: defaultFont, size: 24, bold: true })
      ],
      spacing: { after: 0 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "", font: defaultFont, size: 24 }),
        new TextRun({ text: `\t\t\t${data.signerPosition || "Direktur Utama"}`, font: defaultFont, size: 24 })
      ],
      spacing: { after: 0 }
    })
  );

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      children: docChildren
    }]
  });

  return await Packer.toBlob(doc);
}
