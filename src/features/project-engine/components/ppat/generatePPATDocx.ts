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
  BorderStyle,
  VerticalAlign,
  convertInchesToTwip,
  TabStopType,
  LeaderType
} from "docx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { Project, PPATData, PPATParty, PPATDocumentItem } from "../../../../domain/project/Project";
import { formatFullPartyAddress, isCityKota, formatCleanVillage, formatCleanDistrict } from "./ppatAddressUtils";

const formatDateIndo = (dateStr?: string): string => {
  if (!dateStr) {
    const now = new Date();
    return now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const formatRupiah = (val?: number): string => {
  if (!val) return "Rp 0";
  return `Rp ${val.toLocaleString("id-ID")}`;
};

export const terbilang = (n: number): string => {
  if (n <= 0 || isNaN(n)) return "Nol Rupiah";
  const satuan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  const bilang = (num: number): string => {
    num = Math.floor(num);
    if (num < 12) return satuan[num];
    if (num < 20) return bilang(num - 10) + " Belas";
    if (num < 100) return bilang(Math.floor(num / 10)) + " Puluh" + (num % 10 !== 0 ? " " + bilang(num % 10) : "");
    if (num < 200) return "Seratus" + (num % 100 !== 0 ? " " + bilang(num % 100) : "");
    if (num < 1000) return bilang(Math.floor(num / 100)) + " Ratus" + (num % 100 !== 0 ? " " + bilang(num % 100) : "");
    if (num < 2000) return "Seribu" + (num % 1000 !== 0 ? " " + bilang(num % 1000) : "");
    if (num < 1000000) return bilang(Math.floor(num / 1000)) + " Ribu" + (num % 1000 !== 0 ? " " + bilang(num % 1000) : "");
    if (num < 1000000000) return bilang(Math.floor(num / 1000000)) + " Juta" + (num % 1000000 !== 0 ? " " + bilang(num % 1000000) : "");
    if (num < 1000000000000) return bilang(Math.floor(num / 1000000000)) + " Milyar" + (num % 1000000000 !== 0 ? " " + bilang(num % 1000000000) : "");
    if (num < 1000000000000000) return bilang(Math.floor(num / 1000000000000)) + " Triliun" + (num % 1000000000000 !== 0 ? " " + bilang(num % 1000000000000) : "");
    return num.toString();
  };
  return bilang(n).trim() + " Rupiah";
};

export const generatePaktaIntegritasDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  const transferType = docItem?.specificData?.transferType || ppatData.transactionType || "Jual Beli";
  const obj = ppatData.object || {};
  const statusTransaksi = docItem?.specificData?.transactionStatus || docItem?.specificData?.transferStatus || obj.transactionStatus || "telah"; // 'telah' | 'akan'
  const firstParties = ppatData.firstParties && ppatData.firstParties.length > 0 ? ppatData.firstParties : [{} as PPATParty];
  const secondParties = ppatData.secondParties && ppatData.secondParties.length > 0 ? ppatData.secondParties : [{} as PPATParty];
  const letterLoc = docItem?.letterLocation || "Bandung Barat";
  const letterDate = docItem?.letterDate && docItem.letterDate.trim()
    ? formatDateIndo(docItem.letterDate)
    : ".......................................................";
  const transactionVal = Number(docItem?.specificData?.agreedPrice || obj.transactionValue || 0);

  // Klasifikasi Varian Pakta Integritas sesuai 14 Halaman PDF Resmi
  const tTypeLower = transferType.toLowerCase();
  
  let variant: 'jual_beli' | 'tukar_hibah' | 'waris' | 'hibah_wasiat' | 'putusan_hakim' | 'hak_baru' | 'lelang' = 'jual_beli';
  if (tTypeLower.includes("hibah wasiat")) {
    variant = 'hibah_wasiat';
  } else if (tTypeLower.includes("waris")) {
    variant = 'waris';
  } else if (tTypeLower.includes("putusan") || tTypeLower.includes("hakim")) {
    variant = 'putusan_hakim';
  } else if (tTypeLower.includes("hak baru") || tTypeLower.includes("pelepasan hak")) {
    variant = 'hak_baru';
  } else if (tTypeLower.includes("lelang")) {
    variant = 'lelang';
  } else if (
    tTypeLower.includes("hibah") ||
    tTypeLower.includes("tukar") ||
    tTypeLower.includes("inbreng") ||
    tTypeLower.includes("perseroan") ||
    tTypeLower.includes("hadiah") ||
    tTypeLower.includes("pemisahan") ||
    tTypeLower.includes("penggabungan") ||
    tTypeLower.includes("peleburan") ||
    tTypeLower.includes("pemekaran")
  ) {
    variant = 'tukar_hibah';
  } else {
    variant = 'jual_beli';
  }

  // Parameter teks spesifik sesuai template PDF
  const childrenElements: (Paragraph | Table)[] = [];

  // 1. JUDUL & SUB-JUDUL
  if (variant === 'jual_beli') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "PAKTA INTEGRITAS", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA JUAL BELI", bold: true, size: 22, font: "Times New Roman" })
        ]
      })
    );
  } else if (variant === 'tukar_hibah') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "PAKTA INTEGRITAS", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA", bold: true, size: 22, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: "TUKAR-MENUKAR/ HIBAH/ HIBAH WASIAT/ PEMASUKAN DALAM PERSEROAN ATAU BADAN HUKUM LAINNYA/ PEMISAHAN HAK YANG MENGAKIBATKAN PERALIHAN/ PENGGABUNGAN USAHA/ PELEBURAN USAHA/ PEMEKARAN USAHA/ HADIAH",
            bold: true,
            size: 20,
            font: "Times New Roman"
          })
        ]
      })
    );
  } else if (variant === 'waris') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "PAKTA INTEGRITAS", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA WARIS", bold: true, size: 22, font: "Times New Roman" })
        ]
      })
    );
  } else if (variant === 'hibah_wasiat') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "PAKTA INTEGRITAS", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA HIBAH WASIAT", bold: true, size: 22, font: "Times New Roman" })
        ]
      })
    );
  } else if (variant === 'putusan_hakim') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "PAKTA INTEGRITAS", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA PELAKSANAAN PUTUSAN HAKIM YANG MEMPUNYAI KEKUATAN HUKUM TETAP", bold: true, size: 21, font: "Times New Roman" })
        ]
      })
    );
  } else if (variant === 'hak_baru') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "PAKTA INTEGRITAS", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: "PEMINDAHAN HAK KARENA PEMBERIAN HAK BARU ATAS TANAH SEBAGAI KELANJUTAN DARI PELEPASAN HAK/ PEMBERIAN HAK BARU ATAS TANAH DI LUAR PELEPASAN HAK",
            bold: true,
            size: 20,
            font: "Times New Roman"
          })
        ]
      })
    );
  } else if (variant === 'lelang') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "PAKTA INTEGRITAS", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 30 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA", bold: true, size: 22, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PENUNJUKAN PEMBELI DALAM LELANG", bold: true, size: 22, font: "Times New Roman" })
        ]
      })
    );
  }

  // Kalimat Pengantar
  childrenElements.push(
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Sehubungan dengan adanya peralihan hak atas tanah dan/atau bangunan, dengan uraian sebagai berikut:",
          font: "Times New Roman",
          size: 21
        })
      ]
    })
  );

  // 2. BAGIAN IDENTITAS PIHAK
  const isDualParty = variant === 'jual_beli' || variant === 'tukar_hibah';
  const labelP1 = variant === 'tukar_hibah' ? "Pelepas Hak" : "Penjual";
  const labelP2 = variant === 'tukar_hibah' ? "Penerima Hak" : "Pembeli";

  // Helper untuk baris identitas
  const renderPartyRows = (parties: PPATParty[], isFirstSection: boolean) => {
    parties.forEach((p, idx) => {
      const numLabel = parties.length > 1 || !isDualParty ? `${idx + 1}. ` : "1. ";
      const tRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: `${numLabel}Nama`, font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 66, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: p.name || "-", font: "Times New Roman", size: 21 })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "NIK", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 66, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: p.nik || "-", font: "Times New Roman", size: 21 })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Tmpt/Tgl Lahir", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 66, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: p.birthPlace && p.birthDate ? `${p.birthPlace} / ${formatDateIndo(p.birthDate)}` : "-", font: "Times New Roman", size: 21 })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Alamat", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 66, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: formatFullPartyAddress(p) || "-",
                      font: "Times New Roman",
                      size: 21
                    })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "No. Tlp", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 66, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: p.phone || "-", font: "Times New Roman", size: 21 })
                  ]
                })
              ]
            })
          ]
        })
      ];

      childrenElements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
          },
          rows: tRows
        })
      );
    });
  };

  if (isDualParty) {
    // Section I. Penjual / Pelepas Hak
    childrenElements.push(
      new Paragraph({
        spacing: { before: 60, after: 40 },
        children: [
          new TextRun({ text: `I.   ${labelP1}`, bold: true, font: "Times New Roman", size: 21 })
        ]
      })
    );
    renderPartyRows(firstParties, true);

    // Section II. Pembeli / Penerima Hak
    childrenElements.push(
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: `II.  ${labelP2}`, bold: true, font: "Times New Roman", size: 21 })
        ]
      })
    );
    renderPartyRows(secondParties, false);
  } else {
    // Single list of parties (Waris, Hibah Wasiat, Putusan Hakim, Hak Baru, Lelang)
    renderPartyRows(secondParties.length > 0 && secondParties[0]?.name ? secondParties : firstParties, true);
  }

  // 3. INTRO TRANSAKSI SESUAI VARIAN
  const statusWord = statusTransaksi === 'akan' ? "akan" : "telah";
  let introParagraph: Paragraph;
  if (variant === 'jual_beli') {
    introParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({ text: `Kami ${statusWord} melakukan transaksi jual beli, dengan uraian sebagai berikut:`, font: "Times New Roman", size: 21 })
      ]
    });
  } else if (variant === 'tukar_hibah') {
    introParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: `Kami ${statusWord} melakukan pemindahan hak karena Tukar-Menukar/ Hibah/ Hibah Wasiat/ Pemasukan Dalam Perseroan Atau Badan Hukum Lainnya/ Pemisahan Hak Yang Mengakibatkan Peralihan/ Penggabungan Usaha/ Peleburan Usaha/ Pemekaran Usaha/ Hadiah, dengan uraian sebagai berikut:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else if (variant === 'waris') {
    introParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: `Saya/Kami ${statusWord} melakukan pemindahan hak karena Waris, dengan uraian sebagai berikut:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else if (variant === 'hibah_wasiat') {
    introParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: `Saya/Kami ${statusWord} melakukan pemindahan hak karena Hibah Wasiat, dengan uraian sebagai berikut:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else if (variant === 'putusan_hakim') {
    introParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: `Saya/Kami ${statusWord} melakukan pemindahan hak karena Pelaksanaan Putusan Hakim Yang Mempunyai Kekuatan Hukum Tetap, dengan uraian sebagai berikut:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else if (variant === 'hak_baru') {
    introParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: `Saya/Kami ${statusWord} melakukan pemindahan hak karena Pemberian Hak Baru Atas Tanah Sebagai Kelanjutan Dari Pelepasan Hak/ Pemberian Hak Baru Atas Tanah Di Luar Pelepasan Hak, dengan uraian sebagai berikut:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else {
    // Lelang
    introParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: `Saya/Kami ${statusWord} melakukan pemindahan hak karena Penunjukan Pembeli Dalam Lelang, dengan uraian sebagai berikut:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  }
  childrenElements.push(introParagraph);

  // 4. TABEL OBJEK TRANSAKSI
  const isPerolehanLabel = variant === 'tukar_hibah' || variant === 'waris' || variant === 'hibah_wasiat';
  const labelTanggal = isPerolehanLabel ? "Tanggal Perolehan" : "Tanggal Transaksi";
  const labelNilai = variant === 'jual_beli' ? "Nilai Transaksi" : "Pengakuan Nilai Perolehan";

  const objRows: TableRow[] = [
    createTableRow("Nomor Objek Pajak (NOP)", obj.nop || "-"),
    createTableRow("Dalam SPPT PBB tertulis atas nama", obj.spptName || "-"),
    createTableRow("Letak Tanah dan/atau Bangunan", obj.location || "-"),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: "RT/RW", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 61, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: obj.rt || obj.rw ? `${obj.rt || "-"}/${obj.rw || "-"}` : "-", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: isCityKota(obj.city) ? "Kelurahan" : "Desa", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 61, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: formatCleanVillage(obj.village) || "-", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ indent: { left: 400 }, children: [new TextRun({ text: "Kecamatan", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 61, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: formatCleanDistrict(obj.district) || "-", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    createTableRow("Dokumen Kepemilikan", obj.certificateNumber ? `${obj.certificateType || "SHM"} No. ${obj.certificateNumber}` : "-"),
    createTableRow("Luas Tanah", (obj.landArea !== undefined && obj.landArea !== null && obj.landArea !== 0 && String(obj.landArea).trim() !== "") ? `${obj.landArea} m²` : "-"),
    createTableRow("Luas Bangunan", (obj.buildingArea !== undefined && obj.buildingArea !== null && obj.buildingArea !== 0 && String(obj.buildingArea).trim() !== "") ? `${obj.buildingArea} m²` : "-"),
    createTableRow("Nilai NJOP", obj.njop ? formatRupiah(obj.njop) : "-"),
    createTableRow(labelTanggal, obj.transactionDate ? formatDateIndo(obj.transactionDate) : "-"),
    createTableRow(labelNilai, transactionVal ? `${formatRupiah(transactionVal)},- (${terbilang(transactionVal).trim()})` : "-")
  ];

  childrenElements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
      },
      rows: objRows
    })
  );

  // 5. BUTIR PERNYATAAN RESMI
  const isSimplePernyataanIntro = variant === 'jual_beli' || variant === 'tukar_hibah';
  if (isSimplePernyataanIntro) {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({
            text: "Bersama ini kami menyatakan bahwa:",
            font: "Times New Roman",
            size: 21
          })
        ]
      })
    );
  } else {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: "Bersama ini saya/kami menyatakan bahwa:", font: "Times New Roman", size: 21 })
        ]
      })
    );
  }

  // Poin 1
  childrenElements.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 30, after: 30 },
      indent: { left: 400, hanging: 240 },
      children: [
        new TextRun({ text: "1. ", font: "Times New Roman", size: 21 }),
        new TextRun({
          text: "status tanah dan/atau bangunan tersebut tidak dalam status sengketa dan kami menjamin tidak akan ada gugatan/tuntutan dari pihak manapun juga, dan bilamana dikemudian hari timbul permasalahan terkait pemalsuan data, kesalahan data atau gugatan/tuntutan berkaitan hal-hal tersebut di atas, maka sepenuhnya menjadi tanggung jawab kami;",
          font: "Times New Roman",
          size: 21
        })
      ]
    })
  );

  // Poin 2 (Perhatikan variasi Jual Beli / Tukar Hibah vs Waris / Hibah Wasiat / dll)
  if (variant === 'jual_beli' || variant === 'tukar_hibah') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 30, after: 30 },
        indent: { left: 400, hanging: 240 },
        children: [
          new TextRun({ text: "2. ", font: "Times New Roman", size: 21 }),
          new TextRun({
            text: "telah diberikan penjelasan oleh PPAT dan memahami ketentuan Peraturan Daerah Kabupaten Bandung Barat Nomor 1 Tahun 2024 tentang Pajak Daerah dan Retribusi Daerah;",
            font: "Times New Roman",
            size: 21
          })
        ]
      })
    );
  } else {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 30, after: 30 },
        indent: { left: 400, hanging: 240 },
        children: [
          new TextRun({ text: "2. ", font: "Times New Roman", size: 21 }),
          new TextRun({
            text: "telah memahami ketentuan Peraturan Daerah Kabupaten Bandung Barat Nomor 1 Tahun 2024 tentang Pajak Daerah dan Retribusi Daerah;",
            font: "Times New Roman",
            size: 21
          })
        ]
      })
    );
  }

  // Poin 3, 4, 5
  childrenElements.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 30, after: 30 },
      indent: { left: 400, hanging: 240 },
      children: [
        new TextRun({ text: "3. ", font: "Times New Roman", size: 21 }),
        new TextRun({
          text: "bersedia untuk hadir memberikan keterangan dan data pendukung atas peralihan hak dimaksud apabila dikemudian hari diperlukan;",
          font: "Times New Roman",
          size: 21
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 30, after: 30 },
      indent: { left: 400, hanging: 240 },
      children: [
        new TextRun({ text: "4. ", font: "Times New Roman", size: 21 }),
        new TextRun({
          text: "bersedia untuk melakukan pembayaran kembali atas kurang bayar dari jumlah pembayaran BPHTB yang seharusnya apabila dikemudian hari ditemukan selisih atau ketidaksesuaian pembayaran; dan",
          font: "Times New Roman",
          size: 21
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 30, after: 80 },
      indent: { left: 400, hanging: 240 },
      children: [
        new TextRun({ text: "5. ", font: "Times New Roman", size: 21 }),
        new TextRun({
          text: "apabila terbukti melanggar hal-hal yang telah kami nyatakan dalam pernyataan ini, kami bersedia diproses sesuai ketentuan peraturan perundang-undangan.",
          font: "Times New Roman",
          size: 21
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 60, after: 120 },
      children: [
        new TextRun({
          text: "Demikian Pakta Integritas ini dibuat dengan sebenar-benarnya dan saya bersedia menerima segala konsekuensi hukum yang ditimbulkan apabila dikemudian hari terbukti pernyataan dalam Pakta Integritas ini tidak benar.",
          font: "Times New Roman",
          size: 21
        })
      ]
    })
  );

  // 6. LOKASI, TANGGAL & TANDA TANGAN
  childrenElements.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 480, after: 180 },
      children: [
        new TextRun({
          text: `${letterLoc}, ${letterDate}`,
          font: "Times New Roman",
          size: 21
        })
      ]
    })
  );

  const firstPartyName = firstParties[0]?.name || ".....................................";
  const secondPartyName = secondParties[0]?.name || "........................................";

  if (isDualParty) {
    // 2 Kolom: Penjual/Pelepas Hak & Pembeli/Pemberi Hak (Tinggi sama & lapang untuk Legal size & Meterai)
    const sigLabel1 = variant === 'tukar_hibah' ? "Pelepas Hak," : "Penjual,";
    const sigLabel2 = variant === 'tukar_hibah' ? "Pemberi Hak," : "Pembeli,";

    childrenElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "auto" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
          left: { style: BorderStyle.NONE, size: 0, color: "auto" },
          right: { style: BorderStyle.NONE, size: 0, color: "auto" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
        },
        rows: [
          // Baris 1: Judul Penjual & Pembeli (Kolom Tengah Kosong)
          new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [
                      new TextRun({ text: sigLabel1, bold: true, font: "Times New Roman", size: 21 })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [] })
                ]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [
                      new TextRun({ text: sigLabel2, bold: true, font: "Times New Roman", size: 21 })
                    ]
                  })
                ]
              })
            ]
          }),
          // Baris 2: Ruang Tanda Tangan & Kotak Meterai di Tengah
          new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240, after: 240 },
                    children: []
                  })
                ]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Table({
                    width: { size: 90, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.CENTER,
                    borders: {
                      top: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      bottom: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      left: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      right: { style: BorderStyle.DASHED, size: 1, color: "999999" }
                    },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            margins: { top: 100, bottom: 100, left: 60, right: 60 },
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                  new TextRun({ text: "Meterai Rp", size: 15, font: "Times New Roman", color: "666666" }),
                                  new TextRun({ break: 1, text: "10.000", bold: true, size: 17, font: "Times New Roman", color: "333333" })
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240, after: 240 },
                    children: []
                  })
                ]
              })
            ]
          }),
          // Baris 3: Nama Terang Penjual & Pembeli (Kolom Tengah Kosong)
          new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240, after: 0 },
                    children: [
                      new TextRun({ text: `( ${firstPartyName} )`, font: "Times New Roman", size: 21, bold: true })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({ children: [] })
                ]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240, after: 0 },
                    children: [
                      new TextRun({ text: `( ${secondPartyName} )`, font: "Times New Roman", size: 21, bold: true })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  } else {
    // 1 Tanda Tangan: Penerima Hak
    const signerName = secondParties.length > 0 && secondParties[0]?.name ? secondParties[0].name : firstPartyName;

    childrenElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "auto" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
          left: { style: BorderStyle.NONE, size: 0, color: "auto" },
          right: { style: BorderStyle.NONE, size: 0, color: "auto" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: "Penerima Hak,", bold: true, font: "Times New Roman", size: 21 })
                    ]
                  }),
                  new Table({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.CENTER,
                    borders: {
                      top: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      bottom: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      left: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      right: { style: BorderStyle.DASHED, size: 1, color: "999999" }
                    },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            margins: { top: 120, bottom: 120, left: 100, right: 100 },
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                  new TextRun({ text: "Meterai", size: 16, font: "Times New Roman", color: "666666" }),
                                  new TextRun({ break: 1, text: "Rp10.000", bold: true, size: 18, font: "Times New Roman", color: "333333" })
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 280 },
                    children: [
                      new TextRun({ text: `( ${signerName} )`, font: "Times New Roman", size: 21, bold: true })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.5), // Legal Width: 8.5 in (12240 dxa)
              height: convertInchesToTwip(14)  // Legal Height: 14.0 in (20160 dxa)
            },
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children: childrenElements
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Pakta_Integritas_${variant.toUpperCase()}_${secondPartyName.replace(/\./g, "").trim() || "Klien"}.docx`);
};

export const generateSuratPernyataanDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  const transferType = docItem?.specificData?.transferType || ppatData.transactionType || "Jual Beli";
  const obj = ppatData.object || {};
  const statusTransaksi = docItem?.specificData?.transactionStatus || docItem?.specificData?.transferStatus || obj.transactionStatus || "telah";
  const firstParties = ppatData.firstParties && ppatData.firstParties.length > 0 ? ppatData.firstParties : [{} as PPATParty];
  const secondParties = ppatData.secondParties && ppatData.secondParties.length > 0 ? ppatData.secondParties : [{} as PPATParty];
  const letterLoc = docItem?.letterLocation || "Bandung Barat";
  const letterDate = docItem?.letterDate && docItem.letterDate.trim()
    ? formatDateIndo(docItem.letterDate)
    : "-";
  const transactionVal = Number(docItem?.specificData?.agreedPrice || obj.transactionValue || 0);

  // Klasifikasi Varian Surat Pernyataan Pemindahan Hak
  const tTypeLower = transferType.toLowerCase();
  let variant: 'jual_beli' | 'tukar_hibah' | 'waris' | 'hibah_wasiat' | 'putusan_hakim' | 'hak_baru' | 'lelang' = 'jual_beli';
  if (tTypeLower.includes("hibah wasiat")) {
    variant = 'hibah_wasiat';
  } else if (tTypeLower.includes("waris")) {
    variant = 'waris';
  } else if (tTypeLower.includes("putusan") || tTypeLower.includes("hakim")) {
    variant = 'putusan_hakim';
  } else if (tTypeLower.includes("hak baru") || tTypeLower.includes("pelepasan hak")) {
    variant = 'hak_baru';
  } else if (tTypeLower.includes("lelang")) {
    variant = 'lelang';
  } else if (
    tTypeLower.includes("hibah") ||
    tTypeLower.includes("tukar") ||
    tTypeLower.includes("inbreng") ||
    tTypeLower.includes("perseroan") ||
    tTypeLower.includes("hadiah") ||
    tTypeLower.includes("pemisahan") ||
    tTypeLower.includes("penggabungan") ||
    tTypeLower.includes("peleburan") ||
    tTypeLower.includes("pemekaran")
  ) {
    variant = 'tukar_hibah';
  } else {
    variant = 'jual_beli';
  }

  const childrenElements: (Paragraph | Table)[] = [];

  // 1. JUDUL & SUB-JUDUL
  if (variant === 'jual_beli') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "SURAT PERNYATAAN", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA JUAL BELI", bold: true, size: 22, font: "Times New Roman" })
        ]
      })
    );
  } else if (variant === 'tukar_hibah') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "SURAT PERNYATAAN", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: "PEMINDAHAN HAK KARENA TUKAR-MENUKAR/ HIBAH/ PEMASUKAN DALAM PERSEROAN ATAU BADAN HUKUM LAINNYA/ PEMISAHAN HAK YANG MENGAKIBATKAN PERALIHAN/ PENGGABUNGAN USAHA/ PELEBURAN USAHA/ PEMEKARAN USAHA/ HADIAH",
            bold: true,
            size: 20,
            font: "Times New Roman"
          })
        ]
      })
    );
  } else if (variant === 'waris') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "SURAT PERNYATAAN", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA WARIS", bold: true, size: 22, font: "Times New Roman" })
        ]
      })
    );
  } else if (variant === 'hibah_wasiat') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "SURAT PERNYATAAN", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA HIBAH WASIAT", bold: true, size: 22, font: "Times New Roman" })
        ]
      })
    );
  } else if (variant === 'putusan_hakim') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "SURAT PERNYATAAN", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA PELAKSANAAN PUTUSAN HAKIM YANG MEMPUNYAI KEKUATAN HUKUM TETAP", bold: true, size: 21, font: "Times New Roman" })
        ]
      })
    );
  } else if (variant === 'hak_baru') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "SURAT PERNYATAAN", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: "PEMINDAHAN HAK KARENA PEMBERIAN HAK BARU ATAS TANAH SEBAGAI KELANJUTAN DARI PELEPASAN HAK/ PEMBERIAN HAK BARU ATAS TANAH DI LUAR PELEPASAN HAK",
            bold: true,
            size: 20,
            font: "Times New Roman"
          })
        ]
      })
    );
  } else if (variant === 'lelang') {
    childrenElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({ text: "SURAT PERNYATAAN", bold: true, size: 24, font: "Times New Roman" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({ text: "PEMINDAHAN HAK KARENA PENUNJUKAN PEMBELI DALAM LELANG", bold: true, size: 22, font: "Times New Roman" })
        ]
      })
    );
  }

  // Kalimat Pengantar
  childrenElements.push(
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Yang bertanda tangan dibawah ini :",
          font: "Times New Roman",
          size: 21
        })
      ]
    })
  );

  // 2. BAGIAN IDENTITAS PIHAK
  const isDualParty = variant === 'jual_beli' || variant === 'tukar_hibah';
  const labelP1 = variant === 'tukar_hibah' ? "Pelepas Hak" : "Penjual";
  const labelP2 = variant === 'tukar_hibah' ? "Penerima Hak" : "Pembeli";

  const renderPartyRows = (parties: PPATParty[]) => {
    parties.forEach((p, idx) => {
      const numLabel = parties.length > 1 ? `${idx + 1}. ` : "1. ";
      const tRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: `${numLabel}Nama`, font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 71, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: p.name || "-", font: "Times New Roman", size: 21 })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "NIK", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 71, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: p.nik || "-", font: "Times New Roman", size: 21 })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Tmpt/Tgl Lahir", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 71, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: p.birthPlace && p.birthDate ? `${p.birthPlace} / ${formatDateIndo(p.birthDate)}` : "-", font: "Times New Roman", size: 21 })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Alamat", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 71, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: formatFullPartyAddress(p) || "-",
                      font: "Times New Roman",
                      size: 21
                    })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "No. Tlp", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
            }),
            new TableCell({
              width: { size: 71, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: p.phone || "-", font: "Times New Roman", size: 21 })
                  ]
                })
              ]
            })
          ]
        })
      ];

      childrenElements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
          },
          rows: tRows
        })
      );
    });
  };

  if (isDualParty) {
    // Section Pihak Pertama
    renderPartyRows(firstParties);
    childrenElements.push(
      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({ text: `Selaku ${labelP1}, untuk selanjutnya disebut " PIHAK PERTAMA"`, font: "Times New Roman", size: 21 })
        ]
      })
    );

    // Section Pihak Kedua
    renderPartyRows(secondParties);
    childrenElements.push(
      new Paragraph({
        spacing: { before: 40, after: 120 },
        children: [
          new TextRun({ text: `Selaku ${labelP2}, untuk selanjutnya disebut " PIHAK KEDUA"`, font: "Times New Roman", size: 21 })
        ]
      })
    );
  } else {
    // Single list (Waris, Hibah Wasiat, Putusan Hakim, Hak Baru, Lelang)
    renderPartyRows(secondParties.length > 0 && secondParties[0]?.name ? secondParties : firstParties);
  }

  // 3. KALIMAT DEKLARASI TRANSAKSI
  const statusWord = statusTransaksi === 'akan' ? "akan" : "telah";
  let declParagraph: Paragraph;

  if (variant === 'jual_beli') {
    declParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: `Bersama ini kami menyatakan bahwa antara PIHAK PERTAMA dan PIHAK KEDUA ${statusWord} melakukan transaksi jual beli pada tanggal ${obj.transactionDate ? formatDateIndo(obj.transactionDate) : "-"} dengan harga Rp. ${transactionVal ? transactionVal.toLocaleString("id-ID") : "-"} (${transactionVal ? terbilang(transactionVal).trim() : "terbilang rupiah"}) atas sebidang:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else if (variant === 'tukar_hibah') {
    declParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: `Bersama ini kami menyatakan bahwa antara PIHAK PERTAMA dan PIHAK KEDUA ${statusWord} memindahkan hak karena Tukar-Menukar/ Hibah/ Pemasukan Dalam Perseroan Atau Badan Hukum Lainnya/ Pemisahan Hak Yang Mengakibatkan Peralihan/ Penggabungan Usaha/ Peleburan Usaha/ Pemekaran Usaha/ Hadiah atas sebidang:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else if (variant === 'waris') {
    const isPlural = secondParties.length > 1;
    declParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: `Bersama ini ${isPlural ? "kami" : "saya"} menyatakan bahwa telah menerima hak karena Waris atas sebidang:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else if (variant === 'hibah_wasiat') {
    const isPlural = secondParties.length > 1;
    declParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: `Bersama ini ${isPlural ? "kami" : "saya"} menyatakan bahwa telah menerima hak karena Hibah Wasiat atas sebidang:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else if (variant === 'putusan_hakim') {
    const isPlural = secondParties.length > 1;
    declParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: `Bersama ini ${isPlural ? "kami" : "saya"} menyatakan bahwa telah menerima hak karena Pelaksanaan Putusan Hakim Yang Mempunyai Kekuatan Hukum Tetap atas sebidang:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else if (variant === 'hak_baru') {
    const isPlural = secondParties.length > 1;
    declParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: `Bersama ini ${isPlural ? "kami" : "saya"} menyatakan bahwa telah menerima hak karena Pemberian Hak Baru Atas Tanah Sebagai Kelanjutan Dari Pelepasan Hak/ Pemberian Hak Baru Atas Tanah Di Luar Pelepasan Hak atas sebidang:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  } else {
    const isPlural = secondParties.length > 1;
    declParagraph = new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 100, after: 80 },
      children: [
        new TextRun({
          text: `Bersama ini ${isPlural ? "kami" : "saya"} menyatakan bahwa telah menerima hak karena Penunjukan Pembeli Dalam Lelang atas sebidang:`,
          font: "Times New Roman",
          size: 21
        })
      ]
    });
  }
  childrenElements.push(declParagraph);

  // 4. DAFTAR OBJEK 1-7
  const objLocationStr = obj.location || (obj.village ? `Desa/Kel. ${obj.village}, Kec. ${obj.district || "-"}, ${obj.regency || "Kab. Bandung Barat"}` : "-");
  const objListRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "1. Tanah seluas", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 66, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: obj.landArea ? `${obj.landArea} m2` : "-", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "2. Bangunan seluas", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 66, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: obj.buildingArea ? `${obj.buildingArea} m2` : "-", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "3. Bukti kepemilikan", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 66, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: obj.certificateNumber ? `${obj.certificateType || "SHM"} No. ${obj.certificateNumber}` : "-", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "4. Persil", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 66, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: obj.persil ? `No. ${obj.persil}` : "-", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "5. Kohir", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 66, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: obj.kohir ? `No. ${obj.kohir}` : "-", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "6. NOP", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 66, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: obj.nop || "-", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: "7. Letak Objek Pajak", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 66, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: objLocationStr, font: "Times New Roman", size: 21 })] })]
        })
      ]
    })
  ];

  childrenElements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "auto" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
        left: { style: BorderStyle.NONE, size: 0, color: "auto" },
        right: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
      },
      rows: objListRows
    })
  );

  // 5. KALIMAT SPPT & DEMIKIAN
  let spptSuffix = "";
  if (variant === 'waris') {
    const warisNo = docItem?.specificData?.warisNo || "-";
    spptSuffix = ` berdasarkan surat keterangan ahli waris atau sejenis No ${warisNo}`;
  } else if (variant === 'hibah_wasiat') {
    const hwNo = docItem?.specificData?.hibahWasiatNo || "-";
    spptSuffix = ` berdasarkan akta hibah wasiat atau sejenis No. ${hwNo}`;
  } else if (variant === 'putusan_hakim') {
    const pNo = docItem?.specificData?.putusanNo || "-";
    spptSuffix = ` berdasarkan Putusan Pengadilan atau sejenis No. ${pNo}`;
  } else if (variant === 'hak_baru') {
    const skNo = docItem?.specificData?.skHakBaruNo || "-";
    spptSuffix = ` berdasarkan surat keputusan pemberian hak untuk pemberian hak baru atas tanah No. ${skNo}`;
  } else if (variant === 'lelang') {
    const lNo = docItem?.specificData?.risalahLelangNo || "-";
    spptSuffix = ` berdasarkan salinan risalah lelang No. ${lNo}`;
  }

  childrenElements.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({
          text: `dalam SPPT PBB tertulis atas nama ${obj.spptName || "-"} adalah benar objek yang dilakukan pemindahan hak${spptSuffix}.`,
          font: "Times New Roman",
          size: 21
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 60, after: 180 },
      children: [
        new TextRun({
          text: "Demikian surat pernyataan ini kami buat dengan sebenarnya.",
          font: "Times New Roman",
          size: 21
        })
      ]
    })
  );

  // 6. LOKASI, TANGGAL & TANDA TANGAN
  childrenElements.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: `${letterLoc}, ${letterDate}`,
          font: "Times New Roman",
          size: 21
        })
      ]
    })
  );

  const firstPartyName = firstParties[0]?.name || "-";
  const secondPartyName = secondParties[0]?.name || "-";

  if (isDualParty) {
    const sigLabel1 = variant === 'tukar_hibah' ? "Pelepas Hak," : "Penjual,";
    const sigLabel2 = variant === 'tukar_hibah' ? "Pembeli," : "Pembeli,";

    childrenElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "auto" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
          left: { style: BorderStyle.NONE, size: 0, color: "auto" },
          right: { style: BorderStyle.NONE, size: 0, color: "auto" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
        },
        rows: [
          // Baris 1: Penjual & Pembeli
          new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [
                      new TextRun({ text: sigLabel1, bold: true, font: "Times New Roman", size: 21 })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 120 },
                    children: [
                      new TextRun({ text: sigLabel2, bold: true, font: "Times New Roman", size: 21 })
                    ]
                  })
                ]
              })
            ]
          }),
          // Baris 2: Meterai di Tengah
          new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240, after: 240 },
                    children: []
                  })
                ]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Table({
                    width: { size: 90, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.CENTER,
                    borders: {
                      top: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      bottom: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      left: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      right: { style: BorderStyle.DASHED, size: 1, color: "999999" }
                    },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            margins: { top: 100, bottom: 100, left: 60, right: 60 },
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                  new TextRun({ text: "Meterai Rp", size: 15, font: "Times New Roman", color: "666666" }),
                                  new TextRun({ break: 1, text: "10.000", bold: true, size: 17, font: "Times New Roman", color: "333333" })
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240, after: 240 },
                    children: []
                  })
                ]
              })
            ]
          }),
          // Baris 3: Nama Terang
          new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 0 },
                    children: [
                      new TextRun({ text: `( ${firstPartyName} )`, font: "Times New Roman", size: 21, bold: true })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 0 },
                    children: [
                      new TextRun({ text: `( ${secondPartyName} )`, font: "Times New Roman", size: 21, bold: true })
                    ]
                  })
                ]
              })
            ]
          }),
          // Baris 4: Mengetahui PPAT
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 3,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 280, after: 0 },
                    children: [
                      new TextRun({ text: "Mengetahui PPAT,", font: "Times New Roman", size: 21, bold: true }),
                      new TextRun({ break: 5, text: `( ${(ppatData as any).ppatName || "NUKANTINI PUTRI PARINCHA, S.H., M.Kn."} )`, font: "Times New Roman", size: 21, bold: true })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  } else {
    // 1 Tanda Tangan: Penerima Hak
    const signerName = secondParties.length > 0 && secondParties[0]?.name ? secondParties[0].name : firstPartyName;

    childrenElements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "auto" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
          left: { style: BorderStyle.NONE, size: 0, color: "auto" },
          right: { style: BorderStyle.NONE, size: 0, color: "auto" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [] })]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: "Penerima Hak,", bold: true, font: "Times New Roman", size: 21 })
                    ]
                  }),
                  new Table({
                    width: { size: 45, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.CENTER,
                    borders: {
                      top: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      bottom: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      left: { style: BorderStyle.DASHED, size: 1, color: "999999" },
                      right: { style: BorderStyle.DASHED, size: 1, color: "999999" }
                    },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            margins: { top: 100, bottom: 100, left: 60, right: 60 },
                            children: [
                              new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                  new TextRun({ text: "Meterai", size: 15, font: "Times New Roman", color: "666666" }),
                                  new TextRun({ break: 1, text: "Rp10.000", bold: true, size: 17, font: "Times New Roman", color: "333333" })
                                ]
                              })
                            ]
                          })
                        ]
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 240 },
                    children: [
                      new TextRun({ text: `( ${signerName} )`, font: "Times New Roman", size: 21, bold: true })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.5), // Legal Width: 8.5 in
              height: convertInchesToTwip(14)  // Legal Height: 14.0 in
            },
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children: childrenElements
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Surat_Pernyataan_Pemindahan_Hak_${variant.toUpperCase()}_${secondPartyName.replace(/\./g, "").trim() || "Klien"}.docx`);
};

function createTableRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: label,
                font: "Times New Roman",
                size: 20
              })
            ]
          })
        ]
      }),
      new TableCell({
        width: { size: 5, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: ":",
                font: "Times New Roman",
                size: 20
              })
            ]
          })
        ]
      }),
      new TableCell({
        width: { size: 60, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: value || "-",
                font: "Times New Roman",
                size: 20
              })
            ]
          })
        ]
      })
    ]
  });
}

function createNumberPoint(num: number, text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 400, hanging: 240 },
    children: [
      new TextRun({
        text: `${num}. `,
        bold: true,
        font: "Times New Roman",
        size: 20
      }),
      new TextRun({
        text: text,
        font: "Times New Roman",
        size: 20
      })
    ]
  });
}

// === SURAT PERSETUJUAN SUAMI / ISTRI ===
export const generateSuratPersetujuanDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  const transactionType = ppatData.transactionType || "Jual Beli";
  const firstParty = ppatData.firstParties[0] || ({} as PPATParty);
  const secondParty = ppatData.secondParties[0] || ({} as PPATParty);
  const obj = ppatData.object || {};
  
  // Ambil data pasangan dari party yang mengaktifkan consent atau dari docItem
  const partyWithSpouse = firstParty.hasSpouseConsent ? firstParty : (secondParty.hasSpouseConsent ? secondParty : firstParty);
  const spouseName = docItem?.specificData?.spouseConsentName || partyWithSpouse.spouseName || "(Nama Suami / Istri)";
  const spouseNik = docItem?.specificData?.spouseConsentNik || partyWithSpouse.spouseNik || "-";
  const spouseRelation = docItem?.specificData?.spouseRelation || (partyWithSpouse.spouseConsentType === 'suami' ? "Suami Sah" : "Istri Sah");
  const spouseBirth = partyWithSpouse.spouseBirthPlace && partyWithSpouse.spouseBirthDate 
    ? `${partyWithSpouse.spouseBirthPlace}, ${formatDateIndo(partyWithSpouse.spouseBirthDate)}` 
    : partyWithSpouse.spouseBirthPlace || "-";
  const spouseJob = partyWithSpouse.spouseJob || "-";
  const spouseAddress = partyWithSpouse.spouseAddress || partyWithSpouse.address || "-";
  
  const letterDate = docItem?.letterDate || new Date().toISOString();
  const letterLocation = docItem?.letterLocation || obj.city || "Kabupaten Bandung Barat";

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "SURAT PERSETUJUAN SUAMI / ISTRI",
                bold: true,
                size: 26,
                font: "Times New Roman"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `PERALIHAN HAK KARENA ${transactionType.toUpperCase()}`,
                bold: true,
                size: 22,
                font: "Times New Roman"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Yang bertanda tangan di bawah ini:",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nama Lengkap", spouseName),
              createTableRow("NIK / No. KTP", spouseNik),
              createTableRow("Tempat/Tgl Lahir", spouseBirth),
              createTableRow("Pekerjaan", spouseJob),
              createTableRow("Hubungan Keluarga", spouseRelation),
              createTableRow("Alamat Tempat Tinggal", spouseAddress)
            ]
          }),
          new Paragraph({
            spacing: { before: 160, after: 120 },
            children: [
              new TextRun({
                text: `Dengan ini menyatakan dengan sadar dan sesungguhnya memberi PERSETUJUAN SEPENUHNYA kepada suami/istri saya:`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nama Pasangan", partyWithSpouse.name || "-"),
              createTableRow("NIK / No. KTP", partyWithSpouse.nik || "-"),
              createTableRow("Tempat/Tgl Lahir", partyWithSpouse.birthPlace && partyWithSpouse.birthDate ? `${partyWithSpouse.birthPlace}, ${formatDateIndo(partyWithSpouse.birthDate)}` : "-"),
              createTableRow("Pekerjaan", partyWithSpouse.job || "-"),
              createTableRow("Alamat", partyWithSpouse.address || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 160, after: 120 },
            children: [
              new TextRun({
                text: `Untuk melakukan perbuatan hukum pengalihan hak (${transactionType}) atas sebidang tanah dan/atau bangunan yang merupakan harta bersama, dengan rincian:`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nomor Sertipikat", `${obj.certificateType || "SHM"} No. ${obj.certificateNumber || "-"}`),
              createTableRow("NIB", obj.nib || "-"),
              createTableRow("Dokumen Pengukuran", obj.measurementDocNumber ? `${obj.measurementDocType || "Surat Ukur"} No. ${obj.measurementDocNumber}${obj.measurementDocDate ? ` Tgl ${formatDateIndo(obj.measurementDocDate)}` : ""}` : "-"),
              createTableRow("Desa / Kelurahan", obj.village || "-"),
              createTableRow("Kecamatan", obj.district || "-"),
              createTableRow("Kabupaten / Kota", obj.city || obj.regency || "Kabupaten Bandung Barat"),
              createTableRow("Luas Tanah", `${obj.landArea || 0} m²`),
              createTableRow("NOP PBB", obj.nop || "-"),
              createTableRow("Pihak Pembeli/Penerima", secondParty.name || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 160, after: 240 },
            children: [
              new TextRun({
                text: `Surat persetujuan ini saya berikan tanpa adanya paksaan dari pihak manapun dan dibuat dengan itikad baik untuk dipergunakan sebagaimana mestinya di hadapan Pejabat Pembuat Akta Tanah (PPAT).`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `${letterLocation}, ${formatDateIndo(letterDate)}`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "Menyetujui,", font: "Times New Roman", size: 20 }),
                          new TextRun({ break: 1, text: "PASANGAN (SUAMI / ISTRI)", bold: true, font: "Times New Roman", size: 22 }),
                          new TextRun({ break: 1, text: "(Meterai Rp 10.000)", size: 18, color: "666666", font: "Times New Roman" }),
                          new TextRun({ break: 4, text: `( ${spouseName} )`, bold: true, font: "Times New Roman", size: 22 })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "Yang Diberi Persetujuan,", font: "Times New Roman", size: 20 }),
                          new TextRun({ break: 1, text: "PIHAK YANG MENGALIHKAN", bold: true, font: "Times New Roman", size: 22 }),
                          new TextRun({ break: 4, text: `( ${partyWithSpouse.name || "............................"} )`, bold: true, font: "Times New Roman", size: 22 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Surat_Persetujuan_${partyWithSpouse.name || "Penjual"}.docx`);
};

// === SURAT KUASA PPAT & BPN ===
export const generateSuratKuasaPPATDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  const transactionType = ppatData.transactionType || "Jual Beli";
  const firstParties = ppatData.firstParties && ppatData.firstParties.length > 0 ? ppatData.firstParties : [({} as PPATParty)];
  const obj = ppatData.object || {};
  const attorneyName = docItem?.specificData?.attorneyName || "Nendi Suhendi";
  const attorneyAddress = docItem?.specificData?.attorneyAddress || "Jl.Sukaresmi V No.12 RT 05/RW 05,Kecamatan Lembang,Desa Mekarwangi, Kabupaten Bandung Barat";
  const attorneyJob = docItem?.specificData?.attorneyJob || "Karyawan PPAT";
  const letterDate = docItem?.letterDate || new Date().toISOString();
  const letterLocation = docItem?.letterLocation || "Bandung Barat";

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
  };

  // Pihak Pertama Table Rows
  const firstPartyRows: TableRow[] = [];
  firstParties.forEach((p, idx) => {
    const numPrefix = firstParties.length > 1 ? `${idx + 1}. ` : "1. ";
    const birthStr = p.birthPlace && p.birthDate 
      ? `${p.birthPlace}, ${formatDateIndo(p.birthDate)}`
      : (p.birthPlace || (p.birthDate ? formatDateIndo(p.birthDate) : "-"));
    
    firstPartyRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: `${numPrefix}Nama`, font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: p.name || "-", font: "Times New Roman", size: 21 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Tempat/Tgl. Lahir", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: birthStr, font: "Times New Roman", size: 21 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Pekerjaan", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: p.job || "-", font: "Times New Roman", size: 21 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Alamat", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: formatFullPartyAddress(p) || p.address || "-", font: "Times New Roman", size: 21 })] })]
          })
        ]
      })
    );
  });

  // Pihak Kedua Table Rows
  const secondPartyRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Nama", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: attorneyName, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Alamat", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: attorneyAddress, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: "Pekerjaan", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: attorneyJob, font: "Times New Roman", size: 21 })] })]
        })
      ]
    })
  ];

  // Land details
  const certType = obj.certificateType || "Sertipikat Hak Milik";
  const certNum = obj.certificateNumber || "-";
  const villageName = formatCleanVillage(obj.village) || "Mekarwangi";
  const districtName = formatCleanDistrict(obj.district) || "Lembang";
  const regencyName = obj.regency || "Bandung Barat";
  const provinceName = obj.province || "Jawa Barat";
  const blokName = obj.blok || obj.persil || obj.kohir || "Bengkok";
  const landArea = obj.landArea || 0;
  const landAreaInWords = landArea ? terbilang(Number(landArea)).trim() : "-";

  const locationSubRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Propinsi", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${provinceName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Kabupaten", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${regencyName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Kecamatan", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${districtName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Desa", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${villageName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Blok", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${blokName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    })
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children: [
          // JUDUL
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "SURAT KUASA",
                bold: true,
                size: 24,
                font: "Times New Roman"
              })
            ]
          }),
          // YANG BERTANDA TANGAN
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Yang bertandatangan di bawah ini :",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // PIHAK PERTAMA TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: firstPartyRows
          }),
          // LABEL PIHAK PERTAMA
          new Paragraph({
            spacing: { before: 80, after: 120 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: "Selanjutnya disebut sebagai PIHAK PERTAMA \t",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // PIHAK KEDUA TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: secondPartyRows
          }),
          // LABEL PIHAK KEDUA
          new Paragraph({
            spacing: { before: 80, after: 120 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: "Selanjutnya disebut sebagai PIHAK KEDUA \t",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // DELEGATION LINE
          new Paragraph({
            spacing: { after: 60 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: "Dengan ini Pihak Pertama memberi kuasa kepada Pihak Kedua \t",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            tabStops: [
              {
                type: TabStopType.CENTER,
                position: 4680,
                leader: LeaderType.HYPHEN
              },
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: "\t KHUSUS \t",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // PURPOSE PARAGRAPH
          new Paragraph({
            spacing: { after: 80 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: `Untuk menghadap, mengurus dan menandatangani proses pengurusan Peralihak Hak atas ${transactionType} dan pengambilan ${certType} ${certNum}/Desa ${villageName} seluas kurang lebih ${landArea} m2 ( ${landAreaInWords} meter persegi), yang terletak di :\t`,
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // LOCATION SUB TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: locationSubRows
          }),
          // DEMIKIAN
          new Paragraph({
            spacing: { before: 120, after: 180 },
            children: [
              new TextRun({
                text: "Demikian surat kuasa ini kami buat tanpa paksaan dengan sebenarnya tanpa ada yang dikecualikan untuk dapat dipergunakan sebagaimana mestinya.",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // DATE
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: `${letterLocation}, ${formatDateIndo(letterDate)}`,
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Yang membuat pernyataan;",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // SIGNATURES TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: noBorder,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "PIHAK KEDUA", bold: true, font: "Times New Roman", size: 21 }),
                          new TextRun({ break: 5, text: attorneyName, bold: true, font: "Times New Roman", size: 21 })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: noBorder,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "PIHAK PERTAMA", bold: true, font: "Times New Roman", size: 21 }),
                          new TextRun({ break: 5, text: firstParties[0]?.name || "-", bold: true, font: "Times New Roman", size: 21 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `Surat_Kuasa_${firstParties[0]?.name ? firstParties[0].name.replace(/\s+/g, "_") : "PPAT"}.docx`;
  saveAs(blob, fileName);
};

// === SURAT KUASA MIGRASI E-SERTIPIKAT, KUASA PENGECEKAN SERTIPIKAT, & KUASA PENGECEKAN ZNT (SHARED BASE TEMPLATE) ===
export const generateKuasaBaseDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem: PPATDocumentItem | undefined,
  targetDocType: 'kuasa_migrasi' | 'kuasa_pengecekan_sertipikat' | 'kuasa_znt' | string
): Promise<void> => {
  const isSellerFirstParty = targetDocType === 'kuasa_pengecekan_sertipikat' || targetDocType === 'kuasa_znt';

  // PIHAK PERTAMA:
  // For Kuasa Migrasi: Pembeli (secondParties from Master Form PPAT), fallback to firstParties
  // For Kuasa Pengecekan Sertipikat & ZNT: Penjual (firstParties from Master Form PPAT), fallback to secondParties
  const partyList = isSellerFirstParty
    ? (ppatData.firstParties && ppatData.firstParties.length > 0 && ppatData.firstParties[0]?.name
        ? ppatData.firstParties
        : (ppatData.secondParties && ppatData.secondParties.length > 0 ? ppatData.secondParties : [({} as PPATParty)]))
    : (ppatData.secondParties && ppatData.secondParties.length > 0 && ppatData.secondParties[0]?.name
        ? ppatData.secondParties
        : (ppatData.firstParties && ppatData.firstParties.length > 0 ? ppatData.firstParties : [({} as PPATParty)]));

  const obj = ppatData.object || {};
  const letterDate = docItem?.letterDate || new Date().toISOString();
  const letterLocation = docItem?.letterLocation || "Bandung Barat";

  const purposeActionText = targetDocType === 'kuasa_znt'
    ? "Untuk menghadap, mengurus dan menandatangani proses pengurusan Pengecekan Zona Nilai Tanah (ZNT)"
    : targetDocType === 'kuasa_pengecekan_sertipikat'
    ? "Untuk menghadap, mengurus dan menandatangani proses pengurusan Pengecekan Sertipikat"
    : "Untuk menghadap, mengurus dan menandatangani proses pengurusan Migrasi Sertipikat Elektronik";

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
  };

  // PIHAK PERTAMA Table Rows (Dynamic from Data Penjual / Pembeli)
  const firstPartyRows: TableRow[] = [];
  partyList.forEach((p, idx) => {
    const numPrefix = partyList.length > 1 ? `${idx + 1}. ` : "";
    const birthStr = (p as any).birthPlaceAndDate || (p.birthPlace && p.birthDate 
      ? `${p.birthPlace}, ${formatDateIndo(p.birthDate)}`
      : (p.birthPlace || (p.birthDate ? formatDateIndo(p.birthDate) : "-")));
    const fullAddress = formatFullPartyAddress(p) || p.address || "-";

    firstPartyRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: `${numPrefix}Nama`, font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: p.name || "-", font: "Times New Roman", size: 21 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: "Tempat/Tgl. Lahir", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: birthStr, font: "Times New Roman", size: 21 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: "Pekerjaan", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: p.job || "-", font: "Times New Roman", size: 21 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 28, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: "Alamat", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
          }),
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [new Paragraph({ children: [new TextRun({ text: fullAddress, font: "Times New Roman", size: 21 })] })]
          })
        ]
      })
    );
  });

  // PIHAK KEDUA Table Rows (STRICTLY STATIC 100% FROM MASTER TEMPLATE)
  const secondPartyRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Nama", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "R.A. NUKANTINI PUTRI PARINCHA, SH.,MKn", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Alamat", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Jl Pertani III No.36 Kav 9A, Rt/Rw 009/003,  Kelurahan Duren Tiga, Kecamatan Pancoran,   Kota Jakarta Selatan", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Pekerjaan", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Pejabat Pembuat Akta Tanah (PPAT)", font: "Times New Roman", size: 21 })] })]
        })
      ]
    })
  ];

  // DATA SERTIPIKAT / OBJEK TANAH (DYNAMIC FROM MASTER DATA)
  const certType = obj.certificateType || obj.documentType || "Sertipikat Hak Milik";
  const certNum = obj.certificateNumber || "-";
  const villageName = formatCleanVillage(obj.village) || "-";
  const landArea = obj.landArea || 0;
  const landAreaInWords = landArea ? terbilang(Number(landArea)).trim() + " meter persegi" : "nol meter persegi";
  const provinceName = obj.province || "Jawa Barat";
  const regencyName = obj.regency || obj.city || "Bandung Barat";
  const districtName = formatCleanDistrict(obj.district) || "-";
  const blokName = obj.blok || obj.persil || obj.kohir || "-";

  // Location Sub Rows
  const locationSubRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Propinsi", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${provinceName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Kabupaten", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${regencyName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Kecamatan", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${districtName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Desa", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${villageName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: "Blok", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 4, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: ":", font: "Times New Roman", size: 21 })] })]
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [new Paragraph({ children: [new TextRun({ text: `${blokName};`, font: "Times New Roman", size: 21 })] })]
        })
      ]
    })
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children: [
          // JUDUL
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "SURAT KUASA",
                bold: true,
                size: 24,
                font: "Times New Roman"
              })
            ]
          }),
          // YANG BERTANDA TANGAN
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Yang bertandatangan di bawah ini :",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // PIHAK PERTAMA TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: firstPartyRows
          }),
          // LABEL PIHAK PERTAMA
          new Paragraph({
            spacing: { before: 80, after: 120 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: "Selanjutnya disebut sebagai PIHAK PERTAMA \t",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // PIHAK KEDUA TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: secondPartyRows
          }),
          // LABEL PIHAK KEDUA
          new Paragraph({
            spacing: { before: 80, after: 120 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: "Selanjutnya disebut sebagai PIHAK KEDUA \t",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // DELEGATION LINE
          new Paragraph({
            spacing: { after: 60 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: "Dengan ini Pihak Pertama memberi kuasa kepada Pihak Kedua \t",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            tabStops: [
              {
                type: TabStopType.CENTER,
                position: 4680,
                leader: LeaderType.HYPHEN
              },
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: "\t KHUSUS \t",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // PURPOSE PARAGRAPH
          new Paragraph({
            spacing: { after: 80 },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: 9360,
                leader: LeaderType.HYPHEN
              }
            ],
            children: [
              new TextRun({
                text: `${purposeActionText} untuk ${certType} ${certNum}/Desa ${villageName} seluas kurang lebih ${landArea} m2 ( ${landAreaInWords} ), yang terletak di :\t`,
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // LOCATION SUB TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: locationSubRows
          }),
          // DEMIKIAN
          new Paragraph({
            spacing: { before: 120, after: 180 },
            children: [
              new TextRun({
                text: "Demikian surat kuasa ini kami buat tanpa paksaan dengan sebenarnya tanpa ada yang dikecualikan untuk dapat dipergunakan sebagaimana mestinya.",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // DATE
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: `${letterLocation}, ${formatDateIndo(letterDate)}`,
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Yang membuat pernyataan;",
                font: "Times New Roman",
                size: 21
              })
            ]
          }),
          // SIGNATURES TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorder,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: noBorder,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "PIHAK KEDUA", bold: true, font: "Times New Roman", size: 21 }),
                          new TextRun({ break: 5, text: "R.A. NUKANTINI PUTRI PARINCHA, SH.,MKn", bold: true, font: "Times New Roman", size: 21 })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: noBorder,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "PIHAK PERTAMA", bold: true, font: "Times New Roman", size: 21 }),
                          new TextRun({ break: 5, text: partyList[0]?.name || "-", bold: true, font: "Times New Roman", size: 21 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const signerName = partyList[0]?.name || "Klien";
  const docTitlePrefix = targetDocType === 'kuasa_znt'
    ? "Surat_Kuasa_Pengecekan_ZNT"
    : targetDocType === 'kuasa_pengecekan_sertipikat'
    ? "Surat_Kuasa_Pengecekan_Sertipikat"
    : "Surat_Kuasa_Migrasi_E_Sertipikat";
  saveAs(blob, `${docTitlePrefix}_${signerName.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
};

export const generateKuasaMigrasiDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  return generateKuasaBaseDocx(project, ppatData, docItem, 'kuasa_migrasi');
};

export const generateKuasaPengecekanSertipikatDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  return generateKuasaBaseDocx(project, ppatData, docItem, 'kuasa_pengecekan_sertipikat');
};

export const generateKuasaZNTDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  return generateKuasaBaseDocx(project, ppatData, docItem, 'kuasa_znt');
};

// === SURAT PERNYATAAN TANAH TIDAK SENGKETA ===
export const generateSuratTidakSengketaDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  const firstParty = ppatData.firstParties[0] || ({} as PPATParty);
  const obj = ppatData.object || {};
  const letterDate = docItem?.letterDate || new Date().toISOString();
  const letterLocation = docItem?.letterLocation || "Kabupaten Bandung Barat";

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "SURAT PERNYATAAN PENGUASAAN FISIK BIDANG TANAH",
                bold: true,
                size: 26,
                font: "Times New Roman"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: "(TIDAK DALAM KEADAAN SENGKETA / PERKARA)",
                bold: true,
                size: 22,
                font: "Times New Roman"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Yang bertanda tangan di bawah ini:",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nama Lengkap", firstParty.name || "-"),
              createTableRow("NIK / No. KTP", firstParty.nik || "-"),
              createTableRow("Pekerjaan", firstParty.job || "-"),
              createTableRow("Alamat", firstParty.address || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 160, after: 120 },
            children: [
              new TextRun({
                text: "Dengan ini menyatakan dengan sebenarnya dan bertanggung jawab penuh secara perdata maupun pidana bahwa sebidang tanah dengan keterangan:",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nomor Sertipikat", `${obj.certificateType || "SHM"} No. ${obj.certificateNumber || "-"}`),
              createTableRow("Luas Tanah", `${obj.landArea || 0} m²`),
              createTableRow("Letak Bidang", `${obj.village || "-"}, Kec. ${obj.district || "-"}, ${obj.regency || "KBB"}`),
              createTableRow("NOP PBB", obj.nop || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: "Adalah benar-benar:",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          createNumberPoint(1, "Dikuasai secara fisik oleh Yang Membuat Pernyataan secara beritikad baik dan terus menerus."),
          createNumberPoint(2, "Tidak sedang dalam keadaan sengketa hak, batas, atau klaim dengan pihak manapun."),
          createNumberPoint(3, "Bebas dari segala sita perdata, sita pidana, dan tidak sedang dijadikan jaminan utang kepada pihak lain."),
          createNumberPoint(4, "Apabila pernyataan ini tidak benar, saya bersedia dituntut di hadapan pengadilan sesuai dengan ketentuan undang-undang yang berlaku."),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 180, after: 120 },
            children: [
              new TextRun({
                text: `${letterLocation}, ${formatDateIndo(letterDate)}`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "Yang Membuat Pernyataan,", font: "Times New Roman", size: 20 }),
                          new TextRun({ break: 1, text: "(Meterai Rp 10.000)", size: 18, color: "666666", font: "Times New Roman" }),
                          new TextRun({ break: 4, text: `( ${firstParty.name || "............................"} )`, bold: true, font: "Times New Roman", size: 22 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Surat_Pernyataan_Tidak_Sengketa_${firstParty.name || "Penjual"}.docx`);
};

// === SURAT KETERANGAN NILAI TRANSAKSI (PAJAK) ===
export const generateSuratNilaiPajakDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  const transactionType = ppatData.transactionType || "Jual Beli";
  const firstParty = ppatData.firstParties[0] || ({} as PPATParty);
  const secondParty = ppatData.secondParties[0] || ({} as PPATParty);
  const obj = ppatData.object || {};
  const letterDate = docItem?.letterDate || new Date().toISOString();
  const letterLocation = docItem?.letterLocation || "Kabupaten Bandung Barat";
  const transValue = docItem?.specificData?.agreedPrice || obj.transactionValue || 0;
  const njopValue = obj.njop || 0;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: "SURAT PERNYATAAN KESEPAKATAN NILAI TRANSAKSI RIIL",
                bold: true,
                size: 26,
                font: "Times New Roman"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: "UNTUK VALIDASI PAJAK DAERAH (BPHTB) DAN PPh FINAL",
                bold: true,
                size: 20,
                font: "Times New Roman"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Kami yang bertanda tangan di bawah ini:",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("1. Pihak Pertama (Penjual)", firstParty.name || "-"),
              createTableRow("   NIK", firstParty.nik || "-"),
              createTableRow("   Alamat", firstParty.address || "-"),
              createTableRow("2. Pihak Kedua (Pembeli)", secondParty.name || "-"),
              createTableRow("   NIK", secondParty.nik || "-"),
              createTableRow("   Alamat", secondParty.address || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 160, after: 120 },
            children: [
              new TextRun({
                text: `Menyatakan dengan sesungguhnya bahwa nilai peralihan hak atas tanah dan/atau bangunan:`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nomor Hak", `${obj.certificateType || "SHM"} No. ${obj.certificateNumber || "-"}`),
              createTableRow("Letak Objek", `${obj.village || "-"}, Kec. ${obj.district || "-"}, ${obj.regency || "KBB"}`),
              createTableRow("Luas Tanah / Bangunan", `${obj.landArea || 0} m² / ${obj.buildingArea || 0} m²`),
              createTableRow("NOP PBB", obj.nop || "-"),
              createTableRow("Nilai NJOP PBB", formatRupiah(njopValue)),
              createTableRow("Nilai Transaksi Riil", formatRupiah(transValue))
            ]
          }),
          new Paragraph({
            spacing: { before: 160, after: 240 },
            children: [
              new TextRun({
                text: "Adalah benar merupakan nilai transaksi yang sebenarnya disepakati. Apabila kemudian hari terdapat ketetapan pajak kurang bayar (SKPDKB) dari Badan Pendapatan Daerah atau Kantor Pelayanan Pajak, kami bersedia melunasi tanpa melibatkan Pejabat Pembuat Akta Tanah (PPAT).",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `${letterLocation}, ${formatDateIndo(letterDate)}`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "PIHAK KEDUA (PEMBELI)", bold: true, font: "Times New Roman", size: 22 }),
                          new TextRun({ break: 1, text: "(Meterai Rp 10.000)", size: 18, color: "666666", font: "Times New Roman" }),
                          new TextRun({ break: 4, text: `( ${secondParty.name || "...................."} )`, bold: true, font: "Times New Roman", size: 22 })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "PIHAK PERTAMA (PENJUAL)", bold: true, font: "Times New Roman", size: 22 }),
                          new TextRun({ break: 1, text: "(Meterai Rp 10.000)", size: 18, color: "666666", font: "Times New Roman" }),
                          new TextRun({ break: 4, text: `( ${firstParty.name || "...................."} )`, bold: true, font: "Times New Roman", size: 22 })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Surat_Pernyataan_Nilai_Pajak_${secondParty.name || "Klien"}.docx`);
};

// === DRAF AKTA JUAL BELI (AJB) AWAL ===
export const generateAktaAJBDocx = async (
  project: Project,
  ppatData: PPATData,
  docItem?: PPATDocumentItem
): Promise<void> => {
  const firstParty = ppatData.firstParties[0] || ({} as PPATParty);
  const secondParty = ppatData.secondParties[0] || ({} as PPATParty);
  const obj = ppatData.object || {};
  const letterDate = docItem?.letterDate || new Date().toISOString();
  const transValue = docItem?.specificData?.agreedPrice || obj.transactionValue || 0;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "AKTA JUAL BELI", bold: true, size: 28, font: "Times New Roman" })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "Nomor : ......... / ............ / ..........", bold: true, size: 22, font: "Times New Roman" })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Pada hari ini, menghadap kepada saya, NUKANTINI PUTRI PARINCHA, Sarjana Hukum, Magister Kenotariatan, yang berdasarkan Surat Keputusan Kepala Badan Pertanahan Nasional Republik Indonesia diangkat sebagai Pejabat Pembuat Akta Tanah (PPAT), dengan daerah kerja Kabupaten Bandung Barat, dengan dihadiri oleh saksi-saksi:",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({ text: "I. PIHAK PERTAMA (PENJUAL):", bold: true, font: "Times New Roman", size: 22 })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nama", firstParty.name || "-"),
              createTableRow("NIK", firstParty.nik || "-"),
              createTableRow("Pekerjaan", firstParty.job || "-"),
              createTableRow("Alamat", firstParty.address || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({ text: "II. PIHAK KEDUA (PEMBELI):", bold: true, font: "Times New Roman", size: 22 })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nama", secondParty.name || "-"),
              createTableRow("NIK", secondParty.nik || "-"),
              createTableRow("Pekerjaan", secondParty.job || "-"),
              createTableRow("Alamat", secondParty.address || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: `Pihak Pertama menjual kepada Pihak Kedua, dan Pihak Kedua membeli dari Pihak Pertama hak atas sebidang tanah: ${obj.certificateType || "SHM"} Nomor ${obj.certificateNumber || "-"}, terletak di ${obj.village || "-"}, Kec. ${obj.district || "-"}, ${obj.regency || "KBB"}, seluas ${obj.landArea || 0} m², dengan harga yang disepakati sebesar ${formatRupiah(transValue)}.`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240 },
            children: [
              new TextRun({ text: "PEJABAT PEMBUAT AKTA TANAH (PPAT)", bold: true, font: "Times New Roman", size: 22 }),
              new TextRun({ break: 4, text: "NUKANTINI PUTRI PARINCHA, S.H., M.Kn.", bold: true, underline: {}, font: "Times New Roman", size: 22 })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Draf_Akta_AJB_${secondParty.name || "Klien"}.docx`);
};

// Helper to set paragraph text in XML DOM while preserving run properties
function setParagraphText(p: Element, newText: string) {
  const doc = p.ownerDocument;
  const firstR = p.getElementsByTagName("w:r")[0];
  const rPr = firstR ? firstR.getElementsByTagName("w:rPr")[0] : null;

  const children = Array.from(p.childNodes);
  children.forEach(child => {
    if (child.nodeName !== "w:pPr") {
      p.removeChild(child);
    }
  });

  const newR = doc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:r");
  if (rPr) {
    newR.appendChild(rPr.cloneNode(true));
  }
  const newT = doc.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:t");
  newT.setAttribute("xml:space", "preserve");
  newT.textContent = newText;
  newR.appendChild(newT);
  p.appendChild(newR);
}

// === GENERATE SURAT PERNYATAAN PASAL 99 ===
export const generateSuratPasal99Docx = async (
  project: Project,
  ppatData: PPATData,
  docItem: PPATDocumentItem
): Promise<void> => {
  // Pihak Pertama di Pasal 99 = PEMBELI (secondParties)
  // Pihak Kedua di Pasal 99 = PENJUAL (firstParties)
  const pembeli = (ppatData.secondParties && ppatData.secondParties.length > 0 && ppatData.secondParties[0]?.name)
    ? ppatData.secondParties[0]
    : (ppatData.firstParties && ppatData.firstParties[0]) || ({} as PPATParty);

  const penjual = (ppatData.firstParties && ppatData.firstParties.length > 0 && ppatData.firstParties[0]?.name)
    ? ppatData.firstParties[0]
    : (ppatData.secondParties && ppatData.secondParties[0]) || ({} as PPATParty);

  const obj = ppatData.object || {};
  const letterDate = docItem.letterDate ? formatDateIndo(docItem.letterDate) : formatDateIndo(new Date().toISOString());
  const letterLoc = docItem.letterLocation || "Bandung Barat";

  const certType = obj.certificateType || "Hak Milik";
  const certNo = obj.certificateNumber || "651";
  const cleanVillage = formatCleanVillage(obj.village) || "Mekarwangi";
  const landArea = obj.landArea || 167;
  const terbilangArea = obj.landArea ? terbilang(Number(obj.landArea)).trim() + " meter persegi" : "seratus enam puluh tujuh meter persegi";
  const province = obj.province || "Jawa Barat";
  const regency = obj.regency || obj.city || "Bandung Barat";
  const district = formatCleanDistrict(obj.district) || "Lembang";
  const block = obj.blok || obj.persil || obj.kohir || "Bengkok";

  const nomorAkta = ppatData.nomorAkta || "01";
  const tahunAkta = ppatData.tahunAkta || String(new Date().getFullYear());
  const tanggalAkta = ppatData.tanggalAkta ? formatDateIndo(ppatData.tanggalAkta) : formatDateIndo(new Date().toISOString());

  // Fetch template PASAL 99 AJB.docx
  const response = await fetch("/PASAL 99 AJB.docx");
  if (!response.ok) {
    throw new Error(`Gagal memuat template PASAL 99 AJB.docx: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Template tidak valid: word/document.xml tidak ditemukan");
  }
  const xmlText = await docXmlFile.async("string");

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const ps = Array.from(xmlDoc.getElementsByTagName("w:p"));

  let section = "";
  ps.forEach(p => {
    const text = p.textContent ? p.textContent.trim() : "";
    if (text.includes("Yang bertandatangan di bawah ini")) { section = "P1"; return; }
    if (text.includes("menerima peralihan hak")) { section = "P2"; return; }
    if (text.startsWith("Atas")) { section = "OBJ"; return; }
    if (text.includes("Yang membuat pernyataan")) { section = "SIGN"; return; }

    if (section === "P1") {
      if (text.startsWith("Nama:")) setParagraphText(p, `Nama: ${pembeli.name || "-"}`);
      if (text.startsWith("Tempat/Tgl. Lahir:")) {
        const ttl = pembeli.birthPlace
          ? `${pembeli.birthPlace}, ${pembeli.birthDate ? formatDateIndo(pembeli.birthDate) : ""}`
          : (pembeli.birthDate ? formatDateIndo(pembeli.birthDate) : "-");
        setParagraphText(p, `Tempat/Tgl. Lahir: ${ttl}`);
      }
      if (text.startsWith("Pekerjaan:")) setParagraphText(p, `Pekerjaan: ${pembeli.job || "-"}`);
      if (text.startsWith("Alamat:")) setParagraphText(p, `Alamat: ${formatFullPartyAddress(pembeli) || "-"}`);
    } else if (section === "P2") {
      if (text.startsWith("Nama:")) setParagraphText(p, `Nama: ${penjual.name || "-"}`);
      if (text.startsWith("Tempat/Tgl. Lahir:")) {
        const ttl = penjual.birthPlace
          ? `${penjual.birthPlace}, ${penjual.birthDate ? formatDateIndo(penjual.birthDate) : ""}`
          : (penjual.birthDate ? formatDateIndo(penjual.birthDate) : "-");
        setParagraphText(p, `Tempat/Tgl. Lahir: ${ttl}`);
      }
      if (text.startsWith("Pekerjaan:")) setParagraphText(p, `Pekerjaan: ${penjual.job || "-"}`);
      if (text.startsWith("Alamat:")) setParagraphText(p, `Alamat: ${formatFullPartyAddress(penjual) || "-"}`);
    } else if (section === "OBJ") {
      if (text.includes("Sebidang tanah")) {
        setParagraphText(p, `Atas Sebidang tanah ${certType} ${certNo}/Desa ${cleanVillage} seluas kurang lebih ${landArea} m2 ( ${terbilangArea} ), yang terletak di :`);
      }
      if (text.startsWith("Propinsi:")) setParagraphText(p, `Propinsi: ${province};`);
      if (text.startsWith("Kabupaten:")) setParagraphText(p, `Kabupaten: ${regency};`);
      if (text.startsWith("Kecamatan:")) setParagraphText(p, `Kecamatan: ${district};`);
      if (text.startsWith("Desa:")) setParagraphText(p, `Desa: ${cleanVillage};`);
      if (text.startsWith("Blok:")) setParagraphText(p, `Blok: ${block};`);
      if (text.startsWith("Berdasarkan:")) setParagraphText(p, `Berdasarkan: Akta Jual Beli Nomor ${nomorAkta} Tahun ${tahunAkta} tanggal ${tanggalAkta}.`);
    } else if (section === "SIGN") {
      if (text.includes("Bandung Barat") || text.includes(",")) {
        setParagraphText(p, `${letterLoc}, ${letterDate}`);
      } else if (text && !text.includes("Yang membuat")) {
        setParagraphText(p, pembeli.name || "PEMBELI");
      }
    }
  });

  const serializer = new XMLSerializer();
  const finalXml = serializer.serializeToString(xmlDoc);
  zip.file("word/document.xml", finalXml);

  const outBuf = await zip.generateAsync({ type: "blob" });
  saveAs(outBuf, `Surat_Pernyataan_Pasal_99_${pembeli.name || "Klien"}.docx`);
};

// === GENERATE SURAT PERNYATAAN PASAL 100 ===
export const generateSuratPasal100Docx = async (
  project: Project,
  ppatData: PPATData,
  docItem: PPATDocumentItem
): Promise<void> => {
  // Pihak Pertama di Pasal 100 = PENJUAL (firstParties)
  // Pihak Kedua di Pasal 100 = PEMBELI (secondParties)
  const penjual = (ppatData.firstParties && ppatData.firstParties.length > 0 && ppatData.firstParties[0]?.name)
    ? ppatData.firstParties[0]
    : (ppatData.secondParties && ppatData.secondParties[0]) || ({} as PPATParty);

  const pembeli = (ppatData.secondParties && ppatData.secondParties.length > 0 && ppatData.secondParties[0]?.name)
    ? ppatData.secondParties[0]
    : (ppatData.firstParties && ppatData.firstParties[0]) || ({} as PPATParty);

  const obj = ppatData.object || {};
  const letterDate = docItem.letterDate ? formatDateIndo(docItem.letterDate) : formatDateIndo(new Date().toISOString());
  const letterLoc = docItem.letterLocation || "Bandung Barat";

  const certType = obj.certificateType || "Hak Milik";
  const certNo = obj.certificateNumber || "651";
  const cleanVillage = formatCleanVillage(obj.village) || "Mekarwangi";
  const landArea = obj.landArea || 167;
  const terbilangArea = obj.landArea ? terbilang(Number(obj.landArea)).trim() + " meter persegi" : "seratus enam puluh tujuh meter persegi";
  const province = obj.province || "Jawa Barat";
  const regency = obj.regency || obj.city || "Bandung Barat";
  const district = formatCleanDistrict(obj.district) || "Lembang";
  const block = obj.blok || obj.persil || obj.kohir || "Bengkok";

  const nomorAkta = ppatData.nomorAkta || "01";
  const tahunAkta = ppatData.tahunAkta || String(new Date().getFullYear());
  const tanggalAkta = ppatData.tanggalAkta ? formatDateIndo(ppatData.tanggalAkta) : formatDateIndo(new Date().toISOString());

  // Fetch template PASAL 100 AJB.docx
  const response = await fetch("/PASAL 100 AJB.docx");
  if (!response.ok) {
    throw new Error(`Gagal memuat template PASAL 100 AJB.docx: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Template tidak valid: word/document.xml tidak ditemukan");
  }
  const xmlText = await docXmlFile.async("string");

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const ps = Array.from(xmlDoc.getElementsByTagName("w:p"));

  let section = "";
  ps.forEach(p => {
    const text = p.textContent ? p.textContent.trim() : "";
    if (text.includes("Yang bertandatangan di bawah ini")) { section = "P1"; return; }
    if (text.includes("mengalihkan hak")) { section = "P2"; return; }
    if (text.startsWith("Atas")) { section = "OBJ"; return; }
    if (text.includes("Yang membuat pernyataan")) { section = "SIGN"; return; }

    if (section === "P1") {
      if (text.startsWith("Nama:")) setParagraphText(p, `Nama: ${penjual.name || "-"}`);
      if (text.startsWith("Tempat/Tgl. Lahir:")) {
        const ttl = penjual.birthPlace
          ? `${penjual.birthPlace}, ${penjual.birthDate ? formatDateIndo(penjual.birthDate) : ""}`
          : (penjual.birthDate ? formatDateIndo(penjual.birthDate) : "-");
        setParagraphText(p, `Tempat/Tgl. Lahir: ${ttl}`);
      }
      if (text.startsWith("Pekerjaan:")) setParagraphText(p, `Pekerjaan: ${penjual.job || "-"}`);
      if (text.startsWith("Alamat:")) setParagraphText(p, `Alamat: ${formatFullPartyAddress(penjual) || "-"}`);
    } else if (section === "P2") {
      if (text.startsWith("Nama:")) setParagraphText(p, `Nama: ${pembeli.name || "-"}`);
      if (text.startsWith("Tempat/Tgl. Lahir:")) {
        const ttl = pembeli.birthPlace
          ? `${pembeli.birthPlace}, ${pembeli.birthDate ? formatDateIndo(pembeli.birthDate) : ""}`
          : (pembeli.birthDate ? formatDateIndo(pembeli.birthDate) : "-");
        setParagraphText(p, `Tempat/Tgl. Lahir: ${ttl}`);
      }
      if (text.startsWith("Pekerjaan:")) setParagraphText(p, `Pekerjaan: ${pembeli.job || "-"}`);
      if (text.startsWith("Alamat:")) setParagraphText(p, `Alamat: ${formatFullPartyAddress(pembeli) || "-"}`);
    } else if (section === "OBJ") {
      if (text.includes("Sebidang tanah")) {
        setParagraphText(p, `Sebidang tanah Hak ${certType} ${certNo}/Desa ${cleanVillage} seluas kurang lebih ${landArea} m2 ( ${terbilangArea} ), yang terletak di :`);
      }
      if (text.startsWith("Propinsi:")) setParagraphText(p, `Propinsi: ${province};`);
      if (text.startsWith("Kabupaten:")) setParagraphText(p, `Kabupaten: ${regency};`);
      if (text.startsWith("Kecamatan:")) setParagraphText(p, `Kecamatan: ${district};`);
      if (text.startsWith("Desa:")) setParagraphText(p, `Desa: ${cleanVillage};`);
      if (text.startsWith("Blok:")) setParagraphText(p, `Blok: ${block};`);
      if (text.startsWith("Berdasarkan:")) setParagraphText(p, `Berdasarkan: Akta Jual Beli Nomor ${nomorAkta} Tahun ${tahunAkta} tanggal ${tanggalAkta}`);
    } else if (section === "SIGN") {
      if (text.includes("Bandung Barat") || text.includes(",")) {
        setParagraphText(p, `${letterLoc}, ${letterDate}`);
      } else if (text && !text.includes("Yang membuat")) {
        setParagraphText(p, penjual.name || "PENJUAL");
      }
    }
  });

  const serializer = new XMLSerializer();
  const finalXml = serializer.serializeToString(xmlDoc);
  zip.file("word/document.xml", finalXml);

  const outBuf = await zip.generateAsync({ type: "blob" });
  saveAs(outBuf, `Surat_Pernyataan_Pasal_100_${penjual.name || "Klien"}.docx`);
};

// === DISPATCHER UNTUK SETIAP DOKUMEN PPAT ===
export const generateAnyPPATDocx = async (
  docItem: PPATDocumentItem,
  project: Project,
  ppatData: PPATData
): Promise<void> => {
  const docType = docItem.documentType || docItem.typeId || 'surat_pernyataan';
  switch (docType) {
    case 'kuasa_migrasi':
      await generateKuasaMigrasiDocx(project, ppatData, docItem);
      break;
    case 'kuasa_pengecekan_sertipikat':
      await generateKuasaPengecekanSertipikatDocx(project, ppatData, docItem);
      break;
    case 'kuasa_znt':
      await generateKuasaZNTDocx(project, ppatData, docItem);
      break;
    case 'pakta_integritas':
      await generatePaktaIntegritasDocx(project, ppatData, docItem);
      break;
    case 'surat_pernyataan':
      await generateSuratPernyataanDocx(project, ppatData, docItem);
      break;
    case 'surat_persetujuan_keluarga':
      await generateSuratPersetujuanDocx(project, ppatData, docItem);
      break;
    case 'surat_kuasa_ppat':
      await generateSuratKuasaPPATDocx(project, ppatData, docItem);
      break;
    case 'surat_pasal_99':
      await generateSuratPasal99Docx(project, ppatData, docItem);
      break;
    case 'surat_pasal_100':
      await generateSuratPasal100Docx(project, ppatData, docItem);
      break;
    case 'surat_tidak_sengketa':
      await generateSuratTidakSengketaDocx(project, ppatData, docItem);
      break;
    case 'surat_keterangan_nilai_pajak':
      await generateSuratNilaiPajakDocx(project, ppatData, docItem);
      break;
    case 'akta_ajb':
      await generateAktaAJBDocx(project, ppatData, docItem);
      break;
    default:
      if (docType === 'surat_kustom') {
        await generateSuratPernyataanDocx(project, ppatData, docItem);
      } else {
        alert('Template dokumen PPAT tidak ditemukan.');
        throw new Error('Template dokumen PPAT tidak ditemukan.');
      }
      break;
  }
};

