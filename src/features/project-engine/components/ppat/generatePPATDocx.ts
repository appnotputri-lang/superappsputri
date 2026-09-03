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
  convertInchesToTwip
} from "docx";
import { saveAs } from "file-saver";
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
            color: "CC0000",
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
            color: "CC0000",
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
              children: [new Paragraph({ children: [new TextRun({ text: p.name || "............................................................................................................", bold: !!p.name, font: "Times New Roman", size: 21 })] })]
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
              children: [new Paragraph({ children: [new TextRun({ text: p.nik || "............................................................................................................", bold: !!p.nik, font: "Times New Roman", size: 21 })] })]
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
              children: [new Paragraph({ children: [new TextRun({ text: p.birthPlace && p.birthDate ? `${p.birthPlace} / ${formatDateIndo(p.birthDate)}` : "................................./...................................................................", bold: !!p.birthPlace, font: "Times New Roman", size: 21 })] })]
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
                      text: formatFullPartyAddress(p) || "............................................................................................................",
                      bold: !!formatFullPartyAddress(p),
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
                    new TextRun({ text: p.phone || "............................................................................................................", bold: !!p.phone, font: "Times New Roman", size: 21 })
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
    createTableRow("Nomor Objek Pajak (NOP)", obj.nop || "........................................................................."),
    createTableRow("Dalam SPPT PBB tertulis atas nama", obj.spptName || "........................................................................."),
    createTableRow("Letak Tanah dan/atau Bangunan", obj.location || "........................................................................."),
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
          children: [new Paragraph({ children: [new TextRun({ text: obj.rt || obj.rw ? `${obj.rt || "-"}/${obj.rw || "-"}` : ".....................................................", font: "Times New Roman", size: 21 })] })]
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
          children: [new Paragraph({ children: [new TextRun({ text: formatCleanVillage(obj.village) || ".....................................................", font: "Times New Roman", size: 21 })] })]
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
          children: [new Paragraph({ children: [new TextRun({ text: formatCleanDistrict(obj.district) || ".....................................................", font: "Times New Roman", size: 21 })] })]
        })
      ]
    }),
    createTableRow("Dokumen Kepemilikan", obj.certificateNumber ? `${obj.certificateType || "SHM"} No. ${obj.certificateNumber}` : "........................................................................."),
    createTableRow("Luas Tanah", (obj.landArea !== undefined && obj.landArea !== null && obj.landArea !== 0 && String(obj.landArea).trim() !== "") ? `${obj.landArea} m²` : "-"),
    createTableRow("Luas Bangunan", (obj.buildingArea !== undefined && obj.buildingArea !== null && obj.buildingArea !== 0 && String(obj.buildingArea).trim() !== "") ? `${obj.buildingArea} m²` : "-"),
    createTableRow("Nilai NJOP", obj.njop ? formatRupiah(obj.njop) : "........................................................................."),
    createTableRow(labelTanggal, obj.transactionDate ? formatDateIndo(obj.transactionDate) : "........................................................................."),
    createTableRow(labelNilai, transactionVal ? formatRupiah(transactionVal) : ".........................................................................")
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
    }),
    new Paragraph({
      indent: { left: 400 },
      spacing: { before: 30, after: 120 },
      children: [
        new TextRun({
          text: `( ${transactionVal ? terbilang(transactionVal) : ".................................................................................."} )`,
          italics: true,
          font: "Times New Roman",
          size: 20
        })
      ]
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
      spacing: { before: 80, after: 100 },
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
    // 2 Kolom: Penjual/Pelepas Hak & Pembeli/Pemberi Hak (Lebar & lapang untuk Legal size & Materai)
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
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 60 },
                    children: [
                      new TextRun({ text: sigLabel1, bold: true, font: "Times New Roman", size: 21 })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 800, after: 0 },
                    children: [
                      new TextRun({ text: `( ${firstPartyName} )`, font: "Times New Roman", size: 21, bold: true })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: sigLabel2, bold: true, font: "Times New Roman", size: 21 })
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
                                  new TextRun({ text: "Meterai Rp", size: 16, font: "Times New Roman", color: "666666" }),
                                  new TextRun({ break: 1, text: "10.000", bold: true, size: 18, font: "Times New Roman", color: "333333" })
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
                    spacing: { before: 180 },
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
                    spacing: { before: 180 },
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

export const generateSuratPernyataanDocx = async (project: Project, ppatData: PPATData): Promise<void> => {
  const transactionType = ppatData.transactionType || "Jual Beli";
  const firstParty = ppatData.firstParties[0] || ({} as PPATParty);
  const secondParty = ppatData.secondParties[0] || ({} as PPATParty);
  const obj = ppatData.object || {};

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
                text: "SURAT PERNYATAAN",
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
                text: `PEMINDAHAN HAK KARENA ${transactionType.toUpperCase()}`,
                bold: true,
                size: 24,
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

          // Table Pihak Pertama
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({
                text: "1. PIHAK PERTAMA (PENJUAL / PELEPAS HAK):",
                bold: true,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
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
              createTableRow("Nama", firstParty.name || "-"),
              createTableRow("NIK", firstParty.nik || "-"),
              createTableRow("Pekerjaan", firstParty.job || "-"),
              createTableRow("Alamat", firstParty.address || "-")
            ]
          }),

          // Table Pihak Kedua
          new Paragraph({
            spacing: { before: 160, after: 60 },
            children: [
              new TextRun({
                text: "2. PIHAK KEDUA (PEMBELI / PENERIMA HAK):",
                bold: true,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
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
              createTableRow("Nama", secondParty.name || "-"),
              createTableRow("NIK", secondParty.nik || "-"),
              createTableRow("Pekerjaan", secondParty.job || "-"),
              createTableRow("Alamat", secondParty.address || "-")
            ]
          }),

          // Objek
          new Paragraph({
            spacing: { before: 160, after: 60 },
            children: [
              new TextRun({
                text: "3. DATA OBJEK DAN NILAI TRANSAKSI:",
                bold: true,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
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
              createTableRow("Luas Tanah", `${obj.landArea ? obj.landArea.toLocaleString("id-ID") : "0"} m²`),
              createTableRow("Luas Bangunan", `${obj.buildingArea ? obj.buildingArea.toLocaleString("id-ID") : "0"} m²`),
              createTableRow(
                "Bukti Kepemilikan",
                `${obj.documentType || "SHM"} Nomor: ${obj.certificateNumber || "-"}${
                  obj.persil ? `, Persil: ${obj.persil}` : ""
                }${obj.kohir ? `, Kohir: ${obj.kohir}` : ""}`
              ),
              createTableRow("Nomor Objek Pajak (NOP)", obj.nop || "-"),
              createTableRow(
                "Letak Objek Pajak",
                `${obj.location || ""}, RT ${obj.rt || "-"}/RW ${obj.rw || "-"}, Desa ${obj.village || "-"}, Kec. ${
                  obj.district || "-"
                }, ${obj.city || "Bandung Barat"}`
              ),
              createTableRow("SPPT PBB Atas Nama", obj.spptName || "-"),
              createTableRow("Tanggal Transaksi", formatDateIndo(obj.transactionDate)),
              createTableRow("Harga Transaksi / Nilai Perolehan", formatRupiah(obj.transactionValue))
            ]
          }),

          new Paragraph({
            spacing: { before: 160, after: 120 },
            children: [
              new TextRun({
                text: "Dengan ini menyatakan dengan sesungguhnya bahwa harga / nilai transaksi yang tercantum di atas adalah benar-benar nilai yang disepakati bersama dan dibayarkan secara sah tanpa ada pengurangan atau rekayasa nilai.",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Demikian Surat Pernyataan ini kami buat dengan penuh kesadaran dan tanggung jawab untuk dipergunakan sebagaimana mestinya.",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),

          // Tanda Tangan 3 Kolom
          new Paragraph({
            spacing: { before: 100, after: 100 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `${obj.city || "Bandung Barat"}, ${formatDateIndo(obj.transactionDate)}`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),

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
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "Yang Membuat Pernyataan,", font: "Times New Roman", size: 20 }),
                          new TextRun({ break: 1, text: "PIHAK KEDUA (PEMBELI)", bold: true, font: "Times New Roman", size: 22 }),
                          new TextRun({ break: 1, text: "(Meterai Rp 10.000)", size: 18, color: "666666", font: "Times New Roman" }),
                          new TextRun({ break: 4, text: `( ${secondParty.name || "...................................."} )`, bold: true, font: "Times New Roman", size: 22 })
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
                          new TextRun({ text: "Yang Membuat Pernyataan,", font: "Times New Roman", size: 20 }),
                          new TextRun({ break: 1, text: "PIHAK PERTAMA (PENJUAL)", bold: true, font: "Times New Roman", size: 22 }),
                          new TextRun({ break: 1, text: "(Meterai Rp 10.000)", size: 18, color: "666666", font: "Times New Roman" }),
                          new TextRun({ break: 4, text: `( ${firstParty.name || "...................................."} )`, bold: true, font: "Times New Roman", size: 22 })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 240 },
                        children: [
                          new TextRun({ text: "Mengetahui,", font: "Times New Roman", size: 20 }),
                          new TextRun({ break: 1, text: "PEJABAT PEMBUAT AKTA TANAH (PPAT)", bold: true, font: "Times New Roman", size: 22 }),
                          new TextRun({ break: 4, text: "NUKANTINI PUTRI PARINCHA, S.H., M.Kn.", bold: true, underline: {}, font: "Times New Roman", size: 22 }),
                          new TextRun({ break: 1, text: "Daerah Kerja: Kabupaten Bandung Barat", font: "Times New Roman", size: 20 })
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
  saveAs(blob, `Surat_Pernyataan_${transactionType}_${secondParty.name || "Klien"}.docx`);
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
                bold: true,
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
  const firstParty = ppatData.firstParties[0] || ({} as PPATParty);
  const secondParty = ppatData.secondParties[0] || ({} as PPATParty);
  const obj = ppatData.object || {};
  const attorneyName = docItem?.specificData?.attorneyName || "STAF KANTOR PPAT";
  const attorneyNik = docItem?.specificData?.attorneyNik || "-";
  const attorneyAddress = docItem?.specificData?.attorneyAddress || "Kantor PPAT Nukantini Putri Parincha, S.H., M.Kn.";
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
                text: "SURAT KUASA KHUSUS",
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
                text: "PENGURUSAN DOKUMEN PPAT & PENDAFTARAN PERTANAHAN (BPN)",
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
                text: "Yang bertanda tangan di bawah ini:",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nama Lengkap", secondParty.name || firstParty.name || "-"),
              createTableRow("NIK / No. KTP", secondParty.nik || firstParty.nik || "-"),
              createTableRow("Alamat", secondParty.address || firstParty.address || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: "Selanjutnya disebut sebagai PEMBERI KUASA.",
                bold: true,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Dengan ini memberi kuasa khusus kepada:",
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Nama Lengkap", attorneyName),
              createTableRow("NIK / Identitas", attorneyNik),
              createTableRow("Alamat / Instansi", attorneyAddress)
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: "Selanjutnya disebut sebagai PENERIMA KUASA.",
                bold: true,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 },
            children: [
              new TextRun({
                text: "-------------------------------- KHUSUS --------------------------------",
                bold: true,
                font: "Times New Roman",
                size: 20
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `Untuk dan atas nama Pemberi Kuasa mewakili dalam pengurusan pengecekan sertipikat elektronik, validasi pajak daerah (BPHTB di Bapenda), validasi PPh Final di Kantor Pelayanan Pajak Pratama, serta pendaftaran peralihan hak (balik nama) di Kantor Pertanahan setempat atas objek:`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Jenis & No. Hak", `${obj.certificateType || "SHM"} No. ${obj.certificateNumber || "-"}`),
              createTableRow("Letak Tanah", `${obj.village || "-"}, Kec. ${obj.district || "-"}, ${obj.regency || "KBB"}`),
              createTableRow("Luas Tanah", `${obj.landArea || 0} m²`),
              createTableRow("NOP PBB", obj.nop || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 160, after: 240 },
            children: [
              new TextRun({
                text: "Demikian Surat Kuasa ini dibuat untuk dipergunakan dengan sebenarnya tanpa hak substitusi kecuali disetujui secara tertulis.",
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
                          new TextRun({ text: "Penerima Kuasa,", font: "Times New Roman", size: 20 }),
                          new TextRun({ break: 4, text: `( ${attorneyName} )`, bold: true, font: "Times New Roman", size: 22 })
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
                          new TextRun({ text: "Pemberi Kuasa,", font: "Times New Roman", size: 20 }),
                          new TextRun({ break: 1, text: "(Meterai Rp 10.000)", size: 18, color: "666666", font: "Times New Roman" }),
                          new TextRun({ break: 4, text: `( ${secondParty.name || firstParty.name || "...................."} )`, bold: true, font: "Times New Roman", size: 22 })
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
  saveAs(blob, `Surat_Kuasa_${secondParty.name || "Klien"}.docx`);
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

// === GENERATE SURAT PERNYATAAN PASAL 99 ===
export const generateSuratPasal99Docx = async (
  project: Project,
  ppatData: PPATData,
  docItem: PPATDocumentItem
): Promise<void> => {
  const firstParty = ppatData.firstParties[0] || ({} as PPATParty);
  const secondParty = ppatData.secondParties[0] || ({} as PPATParty);
  const obj = ppatData.object || {};
  const letterDate = formatDateIndo(docItem.letterDate);
  const letterLoc = docItem.letterLocation || "Kabupaten Bandung Barat";

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
              new TextRun({
                text: "SURAT PERNYATAAN",
                bold: true,
                size: 26,
                font: "Times New Roman"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "MEMENUHI KETENTUAN PASAL 99 PMNA/Ka.BPN NO. 3 TAHUN 1997",
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
              createTableRow("Nama Lengkap", secondParty.name || "-"),
              createTableRow("NIK / No. KTP", secondParty.nik || "-"),
              createTableRow("Tempat / Tgl Lahir", secondParty.birthDate ? `${secondParty.birthPlace || "-"}, ${formatDateIndo(secondParty.birthDate)}` : "-"),
              createTableRow("Pekerjaan", secondParty.job || "-"),
              createTableRow("Alamat KTP", secondParty.address || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: `Dengan ini menyatakan dengan sebenarnya dan sanggup dituntut di muka pengadilan apabila di kemudian hari ternyata pernyataan ini tidak benar:`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `1. Bahwa dengan perolehan hak atas tanah ${obj.certificateType || "SHM"} No. ${obj.certificateNumber || "-"}, NIB: ${obj.nib || "-"}, seluas ${obj.landArea || 0} m², terletak di Desa/Kelurahan ${obj.village || "-"}, Kecamatan ${obj.district || "-"}, ${obj.regency || "Kabupaten Bandung Barat"}, pihak yang memperoleh hak TIDAK AKAN menjadi pemegang hak atas tanah yang melebihi batas maksimum penguasaan tanah menurut ketentuan peraturan perundang-undangan yang berlaku.`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `2. Bahwa perolehan hak atas tanah tersebut di atas BUKAN merupakan perolehan tanah secara absentee (guntai) yang dilarang oleh peraturan perundang-undangan agraria.`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: `3. Bahwa surat pernyataan ini dibuat dengan itikad baik dan penuh tanggung jawab untuk dipergunakan sebagaimana mestinya dalam proses pendaftaran peralihan hak di Kantor Pertanahan setempat.`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 120, after: 200 },
            children: [
              new TextRun({
                text: `${letterLoc}, ${letterDate}`,
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
                        children: [new TextRun({ text: "Mengetahui / Menyetujui,", font: "Times New Roman", size: 22 })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "PIHAK PERTAMA (PENJUAL)", bold: true, font: "Times New Roman", size: 22 })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 500 },
                        children: [new TextRun({ text: `( ${firstParty.name || "..........................."} )`, bold: true, font: "Times New Roman", size: 22 })]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "Yang Membuat Pernyataan,", font: "Times New Roman", size: 22 })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "PIHAK KEDUA (PEMBELI)", bold: true, font: "Times New Roman", size: 22 })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 500 },
                        children: [
                          new TextRun({ text: "Materai Rp 10.000\n", size: 16, font: "Times New Roman", italics: true }),
                          new TextRun({ text: `( ${secondParty.name || "..........................."} )`, bold: true, font: "Times New Roman", size: 22 })
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
  saveAs(blob, `Surat_Pernyataan_Pasal_99_${secondParty.name || "Klien"}.docx`);
};

// === GENERATE SURAT PERNYATAAN PASAL 100 ===
export const generateSuratPasal100Docx = async (
  project: Project,
  ppatData: PPATData,
  docItem: PPATDocumentItem
): Promise<void> => {
  const firstParty = ppatData.firstParties[0] || ({} as PPATParty);
  const secondParty = ppatData.secondParties[0] || ({} as PPATParty);
  const obj = ppatData.object || {};
  const letterDate = formatDateIndo(docItem.letterDate);
  const letterLoc = docItem.letterLocation || "Kabupaten Bandung Barat";

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
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "MEMENUHI KETENTUAN PASAL 100 PMNA/Ka.BPN NO. 3 TAHUN 1997",
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
              createTableRow("Alamat KTP", firstParty.address || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: `Dengan ini menyatakan dengan sesungguhnya bahwa atas sebidang tanah:`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow("Jenis & Nomor Hak", `${obj.certificateType || "SHM"} Nomor ${obj.certificateNumber || "-"}`),
              createTableRow("Nomor Identifikasi Bidang (NIB)", obj.nib || "-"),
              createTableRow("Nomor Objek Pajak (NOP)", obj.nop || "-"),
              createTableRow("Luas Tanah", `${obj.landArea || 0} m²`),
              createTableRow("Letak / Alamat Tanah", `${obj.village ? "Desa/Kel. " + obj.village : ""}, Kec. ${obj.district || "-"}, ${obj.regency || "Kab. Bandung Barat"}`),
              createTableRow("Batas Utara", obj.northBoundary || "-"),
              createTableRow("Batas Timur", obj.eastBoundary || "-"),
              createTableRow("Batas Selatan", obj.southBoundary || "-"),
              createTableRow("Batas Barat", obj.westBoundary || "-")
            ]
          }),
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: `1. Bahwa tanah tersebut benar-benar dikuasai secara fisik dengan itikad baik secara terus menerus dan tidak ada keberatan atau klaim dari pihak manapun.`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `2. Bahwa tanah tersebut tidak dijadikan jaminan utang yang tidak tercatat, tidak tersangkut perkara/sengketa di Pengadilan, dan bebas dari sita jaminan (conservatoir beslag).`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: `3. Surat pernyataan ini dibuat dengan penuh kesadaran dan tanggung jawab hukum untuk melengkapi pendaftaran akta PPAT dan peralihan hak di Kantor Pertanahan.`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 120, after: 200 },
            children: [
              new TextRun({
                text: `${letterLoc}, ${letterDate}`,
                font: "Times New Roman",
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
            children: [
              new TextRun({ text: "Yang Membuat Pernyataan,\n", font: "Times New Roman", size: 22 }),
              new TextRun({ text: "Materai Rp 10.000\n\n\n\n", size: 16, font: "Times New Roman", italics: true }),
              new TextRun({ text: `( ${firstParty.name || "..........................."} )`, bold: true, font: "Times New Roman", size: 22 })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Surat_Pernyataan_Pasal_100_${firstParty.name || "Klien"}.docx`);
};

// === DISPATCHER UNTUK SETIAP DOKUMEN PPAT ===
export const generateAnyPPATDocx = async (
  docItem: PPATDocumentItem,
  project: Project,
  ppatData: PPATData
): Promise<void> => {
  const docType = docItem.documentType || docItem.typeId || 'surat_pernyataan';
  switch (docType) {
    case 'pakta_integritas':
      await generatePaktaIntegritasDocx(project, ppatData, docItem);
      break;
    case 'surat_pernyataan':
      await generateSuratPernyataanDocx(project, ppatData);
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
      await generateSuratPernyataanDocx(project, ppatData);
      break;
  }
};

