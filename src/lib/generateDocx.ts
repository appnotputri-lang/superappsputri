import { Document, Packer, Paragraph, TextRun, Tab } from "docx";
import { CompanyData, Shareholder, Address, ManagementItem } from "../../types";
import {
  formatCurrency,
  formatInputNumber,
  numberToWords,
  formatDateIndo,
  getDayNameIndo,
  getDayIndo,
  getMonthIndo,
  getYearIndo,
  toTitleCase,
  formatAddress,
} from "../../utils/formatters";

const saveAsNative = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const FONT_FAMILY = "Times New Roman";
const FONT_SIZE = 24; // 12pt
const LINE_SPACING = 276; // Approx 1.15 line spacing
const AFTER_SPACING = 120; // 6pt

const MARGIN_NORMAL = 1440; // 1 inch
const PAGE_WIDTH_TWIPS = 11906; // A4 width
const MARGIN_TOTAL = 2880; // Left + Right (1440 * 2)
const CONTENT_WIDTH = PAGE_WIDTH_TWIPS - MARGIN_TOTAL;

const INDENT_STEP = 720;
const HANGING_SIZE = 360;

const formatRpDot = (val: number) => formatCurrency(val).replace("Rp ", "Rp. ");

const getNationalityStr = (sh: {
  nationalityType?: string;
  nationality?: string;
}) => {
  if (sh.nationalityType === "WNA") {
    return `Warga Negara ${sh.nationality || "................"}`;
  }
  return sh.nationality || "WNI";
};

const getIdentificationStr = (sh: {
  nationalityType?: string;
  passportNumber?: string;
  hasKitas?: boolean;
  kitasNumber?: string;
  kitasType?: string;
  nik?: string;
}) => {
  if (sh.nationalityType === "WNA") {
    let idStr = `pemegang Passport No ${sh.passportNumber || "................"}`;
    if (sh.hasKitas && sh.kitasNumber) {
      idStr += `, pemegang ${sh.kitasType || "KITAS/KITAP"} No ${sh.kitasNumber}`;
    }
    return idStr;
  }
  return `pemegang KTP No ${sh.nik || "................"}`;
};

const formatFullAddressDoc = (addr?: Address): string => {
  if (!addr || !addr.fullAddress) return "................";
  const isRegency = addr.city?.toLowerCase().includes("kabupaten");
  const villagePrefix = isRegency ? "Desa" : "Kelurahan";

  const parts = [
    formatAddress(toTitleCase(addr.fullAddress)),
    addr.rt && addr.rw ? `RT. ${addr.rt} RW. ${addr.rw}` : "",
    addr.kelurahan ? `${villagePrefix} ${toTitleCase(addr.kelurahan)}` : "",
    addr.kecamatan ? `Kecamatan ${toTitleCase(addr.kecamatan)}` : "",
    addr.city ? toTitleCase(addr.city) : "",
    addr.province ? toTitleCase(addr.province) : "",
  ].filter(Boolean);
  return parts.join(", ");
};

const getAddressStr = (sh: { address?: Address }) => {
  return `bertempat tinggal di ${formatFullAddressDoc(sh.address)}`;
};

const getOccupationStr = (sh: {
  nationalityType?: string;
  occupation?: string;
}) => {
  if (sh.nationalityType === "WNA") return "";
  return `${toTitleCase(sh.occupation || "................")}, `;
};

/**
 * Common paragraph creation helper
 */
const createBodyParagraph = (options: {
  text?: string;
  children?: any[];
  numbering?: { reference: string; level: number };
  indent?: { left: number; hanging?: number };
  spacing?: { before?: number; after?: number };
  bold?: boolean;
  underline?: boolean;
  alignment?: string;
  italics?: boolean;
  tabStops?: any[];
}) => {
  return new Paragraph({
    alignment: (options.alignment as any) || "both",
    spacing: {
      line: LINE_SPACING,
      after: options.spacing?.after ?? (options.numbering ? 0 : AFTER_SPACING),
      before: options.spacing?.before ?? 0,
    },
    indent: options.indent,
    numbering: options.numbering,
    tabStops: options.tabStops,
    children: options.children || [
      new TextRun({
        text: options.text || "",
        size: FONT_SIZE,
        font: FONT_FAMILY,
        bold: options.bold,
        italics: options.italics,
        underline: options.underline ? { type: "single" } : undefined,
      }),
    ],
  });
};

export const generateWordDoc = async (data: CompanyData) => {
  const isCircular = data.documentType === "CIRCULAR";
  const companyName = data.companyName.toUpperCase();

  const getResolutionSummary = () => {
    const agendaOrder = [
      "companyNameChange",
      "domicile",
      "address",
      "kbli",
      "capitalBase",
      "capitalPaid",
      "capitalBaseDecrease",
      "capitalPaidDecrease",
      "shareholders",
      "management",
      "reappointment",
    ];

    const active = agendaOrder
      .filter((k) => data.resolutions[k as keyof typeof data.resolutions])
      .map((k) => {
        switch (k) {
          case "companyNameChange":
            return "perubahan nama perseroan";
          case "domicile":
            return "perubahan kedudukan";
          case "address":
            return "perubahan alamat";
          case "kbli":
            return "perubahan KBLI";
          case "capitalBase":
            return "peningkatan modal dasar";
          case "capitalPaid":
            return "peningkatan modal disetor";
          case "capitalBaseDecrease":
            return "penurunan modal dasar";
          case "capitalPaidDecrease":
            return "penurunan modal disetor";
          case "shareholders":
            return "perubahan struktur pemegang saham";
          case "management":
            return "perubahan susunan pengurus";
          case "reappointment":
            return "pengangkatan kembali pengurus";
          default:
            return "";
        }
      })
      .filter(Boolean);

    if (active.length === 0) return "perubahan";
    if (active.length === 1) return active[0];
    const last = active.pop();
    return `${active.join(", ")} dan ${last}`;
  };

  const children: any[] = [];

  // --- HEADER ---
  children.push(
    new Paragraph({
      alignment: "center" as any,
      spacing: { after: 0, line: LINE_SPACING },
      children: [
        new TextRun({
          text: isCircular
            ? "KEPUTUSAN PARA PEMEGANG SAHAM SEBAGAI PENGGANTI"
            : "NOTULEN",
          bold: true,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
      ],
    }),
    new Paragraph({
      alignment: "center" as any,
      spacing: { after: 0, line: LINE_SPACING },
      children: [
        new TextRun({
          text: "RAPAT UMUM PEMEGANG SAHAM LUAR BIASA",
          bold: true,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
      ],
    }),
    new Paragraph({
      alignment: "center" as any,
      children: [
        new TextRun({
          text: `PT ${data.companyName.toUpperCase() || "................"}`,
          bold: true,
          underline: { type: "single" },
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
      ],
      spacing: { after: 480, line: LINE_SPACING },
    }),
  );

  // --- I. RAPAT (Participants) ---
  if (!isCircular) {
    children.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: "I. RAPAT",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );
    children.push(
      createBodyParagraph({ text: "Rapat tersebut dihadiri oleh:" }),
    );
  } else {
    // Circular starts with preamble
    const preambleDomicile = data.resolutions.domicile
      ? data.oldAddress?.city || data.oldDomicile || "................"
      : data.newAddress?.city || data.domicile || "................";

    children.push(
      createBodyParagraph({
        text: `Kami yang bertandatangan dibawah ini, para Pemegang Saham PT ${data.companyName || "................"}, berkedudukan di ${preambleDomicile} (“Perseroan”), terdiri dari:`,
      }),
    );
  }

  // Participants logic
  const attendingShareholders = isCircular
    ? data.shareholders.filter((sh) => (sh.sharesOwned || 0) > 0)
    : data.shareholders.filter((sh) => (sh.sharesOwned || 0) > 0 && sh.isPresent);

  const totalIssuedShares = data.shareholders.reduce(
    (sum, sh) => sum + (sh.sharesOwned || 0),
    0
  );

  const presentShares = attendingShareholders.reduce(
    (sum, sh) => sum + (sh.sharesOwned || 0),
    0
  );

  const attendingPercentage = totalIssuedShares > 0 
    ? (presentShares / totalIssuedShares) * 100 
    : 0;

  // Listing Participants
  attendingShareholders.forEach((sh, idx) => {
    const parValue = data.originalSharePrice || 0;
    const currentShares = sh.sharesOwned || 0;
    const currentValue = currentShares * parValue;

      children.push(
        createBodyParagraph({
          numbering: { reference: "sh-num", level: 0 },
          children: [
            new TextRun({
              text: `${sh.salutation} `,
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
            new TextRun({
              text: (sh.name || "................").toUpperCase(),
              bold: true,
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
            new TextRun({
              text: `, lahir di ${toTitleCase(sh.birthCity || "................")}, pada tanggal ${getDayIndo(sh.birthDate) || ".."} ${getMonthIndo(sh.birthDate) || "........"} ${getYearIndo(sh.birthDate) || "...."}, ${getNationalityStr(sh)}, ${getOccupationStr(sh)}${getAddressStr(sh)}, ${getIdentificationStr(sh)};`,
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
          ],
        }),
        ...(isCircular 
          ? [
            createBodyParagraph({
              indent: { left: INDENT_STEP },
              children: [
                new TextRun({ text: "- ", size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: "Selaku pemilik dan pemegang ", size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: sh.sharesOwned.toLocaleString('id-ID'), bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: ` (${numberToWords(sh.sharesOwned)}) lembar saham atau senilai `, size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: formatRpDot(currentValue), bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: ` (${numberToWords(currentValue)} rupiah).`, size: FONT_SIZE, font: FONT_FAMILY }),
              ],
              spacing: { before: 60, after: 120 }
            })
          ]
          : [
            createBodyParagraph({
              indent: { left: INDENT_STEP },
              children: [
                new TextRun({
                  text: "- dalam hal ini hadir selaku :",
                  size: FONT_SIZE,
                  font: FONT_FAMILY,
                }),
              ],
              spacing: { before: 60 },
            }),
            ...(sh.isManagement 
              ? [
                  createBodyParagraph({
                    indent: { left: INDENT_STEP + HANGING_SIZE },
                    children: [
                      new TextRun({ text: "a. ", size: FONT_SIZE, font: FONT_FAMILY }),
                      new TextRun({
                        text: `${toTitleCase(sh.managementPosition || "Direktur")} Perseroan; dan`,
                        size: FONT_SIZE,
                        font: FONT_FAMILY,
                      }),
                    ],
                    spacing: { after: 0 },
                  })
                ]
              : []
            ),
            createBodyParagraph({
              indent: { left: INDENT_STEP + HANGING_SIZE },
              children: [
                new TextRun({
                  text: `${sh.isManagement ? "b. " : "a. "}`,
                  size: FONT_SIZE,
                  font: FONT_FAMILY,
                }),
                new TextRun({
                  text: "Pemilik dan pemegang saham sebanyak ",
                  size: FONT_SIZE,
                  font: FONT_FAMILY,
                }),
                new TextRun({
                  text: sh.sharesOwned.toLocaleString("id-ID"),
                  bold: true,
                  size: FONT_SIZE,
                  font: FONT_FAMILY,
                }),
                new TextRun({
                  text: ` (${numberToWords(sh.sharesOwned)}) lembar saham atau senilai `,
                  size: FONT_SIZE,
                  font: FONT_FAMILY,
                }),
                new TextRun({
                  text: formatRpDot(currentValue),
                  bold: true,
                  size: FONT_SIZE,
                  font: FONT_FAMILY,
                }),
                new TextRun({
                  text: ` (${numberToWords(currentValue)} rupiah) berhak mengeluarkan suara `,
                  size: FONT_SIZE,
                  font: FONT_FAMILY,
                }),
                new TextRun({
                  text: sh.sharesOwned.toLocaleString("id-ID"),
                  bold: true,
                  size: FONT_SIZE,
                  font: FONT_FAMILY,
                }),
                new TextRun({
                  text: ` (${numberToWords(sh.sharesOwned)}) suara dalam rapat.`,
                  size: FONT_SIZE,
                  font: FONT_FAMILY,
                }),
              ],
              spacing: { after: 120 },
            })
          ]
        )
      );
    });

  // Summary of Capital after Participants
  const totalValue = presentShares * (data.originalSharePrice || 0);

  children.push(
    createBodyParagraph({
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: isCircular 
            ? "Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak "
            : `Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak ${totalIssuedShares.toLocaleString("id-ID")} (${numberToWords(totalIssuedShares)}) lembar saham, telah hadir dan/atau diwakili dalam rapat ini sebanyak `,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: presentShares.toLocaleString("id-ID"),
          bold: true,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: ` (${numberToWords(presentShares)}) lembar saham atau senilai `,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: formatRpDot(totalValue),
          bold: true,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: ` (${numberToWords(totalValue)} rupiah)${!isCircular ? ` atau setara dengan ${attendingPercentage === 100 ? "100%" : `${attendingPercentage.toFixed(2)}%`} dari seluruh saham yang telah dikeluarkan oleh Perseroan` : ""}.`,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
      ],
    }),
  );

  children.push(
    createBodyParagraph({
      indent: { left: INDENT_STEP },
      children: [
        new TextRun({
          text: "- Untuk selanjutnya secara bersama-sama disebut sebagai ",
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: "“Para Pemegang Saham”",
          bold: true,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
      ],
      spacing: { after: 240 },
    }),
  );

  if (isCircular) {
    // --- CIRCULAR DECLARATION ---
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: "DENGAN INI MENYATAKAN, bahwa Para Pemegang Saham telah mengetahui mengenai :",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );

    children.push(
      createBodyParagraph({
        numbering: { reference: "decl-num", level: 0 },
        text: `Bahwa sampai saat ini jumlah saham yang telah ditempatkan dan disetor penuh dalam perseroan sebanyak ${data.originalTotalShares.toLocaleString("id-ID")} (${numberToWords(data.originalTotalShares)}) lembar saham;`,
      }),
      createBodyParagraph({
        numbering: { reference: "decl-num", level: 0 },
        text: "Bahwa sesuai dengan ketentuan Pasal 91 Undang-Undang No. 40 Tahun 2007 tentang Perseroan Terbatas, pemegang saham dapat mengambil keputusan yang mengikat di luar Rapat Umum Pemegang Saham dengan syarat semua pemegang saham dengan hak suara menyetujui secara tertulis dengan menandatangani usul yang bersangkutan;",
      }),
      createBodyParagraph({
        numbering: { reference: "decl-num", level: 0 },
        text: `Bahwa maksud dari Keputusan Sirkuler Para Pemegang Saham ini adalah untuk ${getResolutionSummary()} Perseroan.`,
        spacing: { after: 240 },
      }),
    );

    children.push(
      createBodyParagraph({
        children: [
          new TextRun({
            text: "OLEH KARENA ITU,",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: " para pemegang saham secara bersama-sama setuju dan memutuskan hal-hal sebagai berikut:",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
        spacing: { after: 240 },
      }),
    );
  } else {
    // --- II. KETUA RAPAT ---
    children.push(
      new Paragraph({
        spacing: { before: 480, after: 240 },
        children: [
          new TextRun({
            text: "II. KETUA RAPAT",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );
    children.push(
      createBodyParagraph({
        children: [
          new TextRun({
            text: "Berdasarkan ketentuan pasal 21 ayat (1) anggaran dasar perseroan, maka ",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: (data.meetingChair || "................").toUpperCase(),
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: ", tersebut di atas, bertindak sebagai ketua rapat.",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );

    // --- III. AGENDA RAPAT ---
    children.push(
      new Paragraph({
        spacing: { before: 480, after: 240 },
        children: [
          new TextRun({
            text: "III. AGENDA RAPAT",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );
    children.push(
      createBodyParagraph({
        text: "Rapat ini diadakan dengan agenda rapat sebagai berikut :",
      }),
    );
    children.push(
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        children: [
          new TextRun({ text: "- ", size: FONT_SIZE, font: FONT_FAMILY }),
          new TextRun({
            text: data.meetingAgenda || "Perpanjangan pengurus perseroan.",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );

    // --- IV. DETAIL RAPAT DAN AKTA PENDIRIAN/PERUBAHAN ---
    children.push(
      new Paragraph({
        spacing: { before: 480, after: 240 },
        children: [
          new TextRun({
            text: "IV. DETAIL RAPAT DAN AKTA PENDIRIAN/PERUBAHAN",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );

    const invitationDateText =
      formatDateIndo(data.invitationDate) || "................";
    children.push(
      createBodyParagraph({
        children: [
          new TextRun({
            text: `Rapat ini diselenggarakan berdasarkan Surat Undangan Direksi PT. ${data.companyName.toUpperCase()} Nomor : `,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: data.invitationNumber || "................",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: " tanggal ",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: invitationDateText,
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: ", dan diadakan pada:",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );

    const dayName = getDayNameIndo(data.signingDate);
    const dateText = formatDateIndo(data.signingDate) || "................";

    // Simple table-like layout using tabs or separate paragraphs
    children.push(
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: `Hari/Tanggal\t: ${dayName}, ${dateText}`,
        tabStops: [{ type: "left" as any, position: 2000 }],
      }),
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: `Tempat\t: ${data.signingPlace || "................"}`,
        tabStops: [{ type: "left" as any, position: 2000 }],
      }),
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: `Waktu\t: Pukul ${data.meetingStartTime || "..:.."} WIB`,
        tabStops: [{ type: "left" as any, position: 2000 }],
        spacing: { after: 240 },
      }),
    );

    children.push(
      createBodyParagraph({
        text: "Adapun Anggaran Dasar Perseroan, adalah sebagai berikut :",
      }),
    );
    children.push(
      createBodyParagraph({
        children: [
          new TextRun({
            text: "Bahwa Perseroan didirikan dengan Akta Pendirian tertanggal ",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: formatDateIndo(data.establishmentDeedDate) || "..........",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({ text: ", No. ", size: FONT_SIZE, font: FONT_FAMILY }),
          new TextRun({
            text: data.establishmentDeedNumber || "..........",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: ", yang dibuat dihadapan ",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: `${data.establishmentNotary || ".........."}${data.establishmentNotaryTitle ? `, ${data.establishmentNotaryTitle}` : ""}`,
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: `, Notaris di ${data.oldAddress?.city || ".........."} dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal `,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: formatDateIndo(data.establishmentSkDate) || "..........",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({ text: ", Nomor ", size: FONT_SIZE, font: FONT_FAMILY }),
          new TextRun({
            text: data.establishmentSkNumber || "..........",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text:
              data.amendmentDeeds && data.amendmentDeeds.length > 0
                ? " beberapa kali telah mengalami perubahan, berdasarkan :"
                : " .",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );

    if (data.amendmentDeeds && data.amendmentDeeds.length > 0) {
      data.amendmentDeeds.forEach((deed) => {
        children.push(
          createBodyParagraph({
            indent: { left: INDENT_STEP, hanging: HANGING_SIZE },
            children: [
              new TextRun({ text: "- ", size: FONT_SIZE, font: FONT_FAMILY }),
              new TextRun({
                text: "Akta Pernyataan Keputusan Rapat Umum Para Pemegang Saham Luar Biasa tertanggal ",
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: formatDateIndo(deed.date) || "..........",
                bold: true,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: " Nomor ",
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: deed.number || "..........",
                bold: true,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: ", yang dibuat di hadapan ",
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: `${deed.notary || ".........."}${deed.notaryTitle ? `, ${deed.notaryTitle}` : ""}`,
                bold: true,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: `, Notaris di ${data.oldAddress?.city || ".........."} `,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              ...(deed.skSpDocuments || []).map(
                (doc, dIdx) =>
                  new TextRun({
                    text: `${dIdx === 0 ? "dan " : ", serta "}${doc.type === "SK" ? "telah mendapat persetujuan dari Kementrian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal " : "telah dilaporkan ke Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal "} ${formatDateIndo(doc.date) || ".........."} Nomor ${doc.number || ".........."}`,
                    bold: true,
                    size: FONT_SIZE,
                    font: FONT_FAMILY,
                  }),
              ),
            ],
          }),
        );
      });
    }

    // --- V. JALANNYA RAPAT ---
    children.push(
      new Paragraph({
        spacing: { before: 480, after: 240 },
        children: [
          new TextRun({
            text: "V. JALANNYA RAPAT",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );
    children.push(
      createBodyParagraph({
        text: `Ketua Rapat menyatakan bahwa dalam Rapat ini telah hadir dan/atau diwakili sebanyak ${presentShares.toLocaleString("id-ID")} (${numberToWords(presentShares)}) saham yang merupakan ${attendingPercentage === 100 ? "seluruh" : `${attendingPercentage.toFixed(2)}%`} dari total seluruh saham yang telah dikeluarkan oleh Perseroan.`,
      }),
    );
    children.push(
      createBodyParagraph({
        text: "Oleh karena itu, Ketua Rapat menyatakan Rapat ini sah dan berhak mengambil keputusan yang sah dan mengikat Perseroan mengenai hal-hal yang dibicarakan dalam Rapat.",
      }),
    );
  }

  // --- RESOLUTIONS TITLE ---
  const resolutionsLabel = isCircular
    ? "KEPUTUSAN-KEPUTUSAN"
    : "VI. KEPUTUSAN-KEPUTUSAN";
  children.push(
    new Paragraph({
      spacing: { before: 480, after: 240 },
      children: [
        new TextRun({
          text: resolutionsLabel,
          bold: true,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
      ],
    }),
  );

  // Helper to add numbered resolution
  const addResolution = (resTitle: string, resBody: any[]) => {
    children.push(
      createBodyParagraph({
        numbering: { reference: "res-num", level: 0 },
        children: [
          new TextRun({
            text: resTitle,
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );
    resBody.forEach((p) => children.push(p));
  };

  // Logic for resolutions starts here (omitted for brevity in this snippet but I'll implement enough)
  if (data.resolutions.companyNameChange) {
    addResolution("Persetujuan Perubahan Nama Perseroan", [
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: `Menyetujui dan memutuskan untuk mengubah nama Perseroan, yang semula bernama : PT ${data.companyName.toUpperCase()} menjadi bernama : PT ${data.targetCompanyName.toUpperCase()}.`,
      }),
    ]);
  }

  if (data.resolutions.domicile || data.resolutions.address) {
    const domicileText = data.resolutions.domicile
      ? `Menyetujui dan memutuskan untuk mengubah tempat kedudukan Perseroan, yang semula berkedudukan di ${data.oldAddress.city || ".........."} menjadi berkedudukan di ${data.newAddress.city || ".........."}.`
      : `Menyetujui dan memutuskan untuk mengubah alamat lengkap Perseroan, yang semula beralamat di ${data.oldAddress.fullAddress || ".........."} menjadi beralamat di ${data.newAddress.fullAddress}.`;

    addResolution("Persetujuan Perubahan Kedudukan/Alamat Perseroan", [
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: domicileText,
      }),
    ]);
  }

  if (data.resolutions.kbli) {
    const kbliElements: any[] = [
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: "Menyetujui dan memutuskan untuk mengubah ketentuan Pasal 3 ayat (1) dan ayat (2) Anggaran Dasar Perseroan mengenai Maksud dan Tujuan serta Kegiatan Usaha, sehingga selanjutnya menjadi berbunyi sebagai berikut :",
      }),
    ];

    // Pasal 3 ayat (1) — Maksud dan Tujuan
    kbliElements.push(
      createBodyParagraph({
        indent: { left: INDENT_STEP * 2, hanging: HANGING_SIZE },
        children: [
          new TextRun({ text: "1)\t", size: FONT_SIZE, font: FONT_FAMILY }),
          new TextRun({
            text: "Maksud dan Tujuan Perseroan adalah berusaha dalam bidang :",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
        tabStops: [{ type: "left", position: INDENT_STEP * 2 }],
      }),
    );

    // Daftar kategori bidang usaha (unik berdasarkan categoryName)
    const categories = Array.from(
      new Set((data.kbliItems || []).map((k: any) => k.categoryName)),
    ).filter(Boolean) as string[];
    categories.forEach((cat) => {
      kbliElements.push(
        createBodyParagraph({
          indent: {
            left: INDENT_STEP * 2 + HANGING_SIZE,
            hanging: HANGING_SIZE,
          },
          children: [
            new TextRun({ text: "-\t", size: FONT_SIZE, font: FONT_FAMILY }),
            new TextRun({
              text: cat.toUpperCase(),
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
          ],
          tabStops: [
            { type: "left", position: INDENT_STEP * 2 + HANGING_SIZE },
          ],
        }),
      );
    });

    // Pasal 3 ayat (2) — Kegiatan Usaha
    kbliElements.push(
      createBodyParagraph({
        indent: { left: INDENT_STEP * 2, hanging: HANGING_SIZE },
        children: [
          new TextRun({ text: "2)\t", size: FONT_SIZE, font: FONT_FAMILY }),
          new TextRun({
            text: "Untuk mencapai maksud dan tujuan tersebut diatas, perseroan dapat melaksanakan kegiatan usaha sebagai berikut :",
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
        tabStops: [{ type: "left", position: INDENT_STEP * 2 }],
      }),
    );

    // Daftar KBLI: kode + nama (bold) diikuti deskripsi
    (data.kbliItems || []).forEach((kbli: any) => {
      kbliElements.push(
        createBodyParagraph({
          indent: {
            left: INDENT_STEP * 2 + HANGING_SIZE,
            hanging: HANGING_SIZE,
          },
          children: [
            new TextRun({ text: "-\t", size: FONT_SIZE, font: FONT_FAMILY }),
            new TextRun({
              text: `${kbli.code} - ${kbli.name};`,
              bold: true,
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
          ],
          tabStops: [
            { type: "left", position: INDENT_STEP * 2 + HANGING_SIZE },
          ],
        }),
      );
      if (kbli.description) {
        kbliElements.push(
          createBodyParagraph({
            indent: { left: INDENT_STEP * 2 + HANGING_SIZE },
            text: kbli.description,
          }),
        );
      }
    });

    addResolution(
      "Persetujuan Perubahan Maksud dan Tujuan Perseroan",
      kbliElements,
    );
  }

  if (data.resolutions.capitalBase || data.resolutions.capitalBaseDecrease) {
    const originalShares = data.originalAuthorizedShares || 0;
    const targetShares =
      data.targetCapitalBase / (data.originalSharePrice || 1);
    addResolution(
      data.resolutions.capitalBaseDecrease
        ? "Persetujuan Penurunan Modal Dasar Perseroan"
        : "Persetujuan Peningkatan Modal Dasar Perseroan",
      [
        createBodyParagraph({
          indent: { left: INDENT_STEP },
          text: `Menyetujui untuk ${data.resolutions.capitalBaseDecrease ? "menurunkan" : "meningkatkan"} Modal Dasar Perseroan, yang semula sebesar Rp. ${formatInputNumber(data.originalCapitalBase)},- (${numberToWords(data.originalCapitalBase)} rupiah) terbagi atas ${formatInputNumber(originalShares)} (${numberToWords(originalShares)}) lembar saham, masing-masing saham bernilai nominal Rp. ${formatInputNumber(data.originalSharePrice)},- (${numberToWords(data.originalSharePrice)} rupiah), menjadi sebesar Rp. ${formatInputNumber(data.targetCapitalBase)},- (${numberToWords(data.targetCapitalBase)} rupiah) terbagi atas ${formatInputNumber(targetShares)} (${numberToWords(targetShares)}) lembar saham, masing-masing saham bernilai nominal Rp. ${formatInputNumber(data.originalSharePrice)},- (${numberToWords(data.originalSharePrice)} rupiah).`,
        }),
      ],
    );
  }

  if (data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) {
    const originalShares = data.originalTotalShares || 0;
    const targetShares =
      data.targetCapitalPaid / (data.originalSharePrice || 1);

    const elements: any[] = [
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: `Menyetujui untuk ${data.resolutions.capitalPaidDecrease ? "menurunkan" : "meningkatkan"} Modal Ditempatkan dan Disetor dalam Perseroan, yang semula sebesar Rp. ${formatInputNumber(data.originalCapitalPaid)},- (${numberToWords(data.originalCapitalPaid)} rupiah) yang terbagi menjadi sejumlah ${formatInputNumber(originalShares)} (${numberToWords(originalShares)}) lembar saham, menjadi sebesar Rp. ${formatInputNumber(data.targetCapitalPaid)},- (${numberToWords(data.targetCapitalPaid)} rupiah) yang terbagi menjadi sejumlah ${formatInputNumber(targetShares)} (${numberToWords(targetShares)}) lembar saham.`,
      }),
    ];

    if (data.resolutions.capitalPaid) {
      elements.push(
        createBodyParagraph({
          indent: { left: INDENT_STEP },
          spacing: { before: 120 },
          text: "Bahwa pengeluaran saham-saham baru tersebut di atas, telah diambil bagian dan disetor penuh secara tunai melalui kas Perseroan oleh masing - masing pemegang saham dengan rincian sebagai berikut :",
        }),
      );

      const newDeposits = data.finalShareholders
        .filter(
          (fs) =>
            fs.isNewDeposit && fs.newDepositShares && fs.newDepositShares > 0,
        )
        .map((fs) => {
          return {
            name: fs.name,
            salutation: fs.salutation,
            addedShares: fs.newDepositShares!,
            addedValue: fs.newDepositShares! * (data.originalSharePrice || 0),
          };
        });

      newDeposits.forEach((dep, idx) => {
        elements.push(
          createBodyParagraph({
            indent: { left: INDENT_STEP + INDENT_STEP, hanging: HANGING_SIZE },
            children: [
              new TextRun({ text: "- ", size: FONT_SIZE, font: FONT_FAMILY }),
              new TextRun({
                text: `${dep.name.toUpperCase()} `,
                bold: true,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: `: ${formatInputNumber(dep.addedShares)} (${numberToWords(dep.addedShares)}) lembar saham atau senilai Rp. ${formatInputNumber(dep.addedValue)},- (${numberToWords(dep.addedValue)} rupiah);`,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
            ],
          }),
        );
      });
    }

    addResolution(
      data.resolutions.capitalPaidDecrease
        ? "Persetujuan Penurunan Modal Ditempatkan dan Disetor"
        : "Persetujuan Peningkatan Modal Ditempatkan dan Disetor",
      elements,
    );
  }

  // Management Change Logic
  if (
    data.resolutions.shareholders &&
    data.shareTransfers &&
    data.shareTransfers.length > 0
  ) {
    const transferBody: any[] = [
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: "Menyetujui pengalihan seluruh saham secara hibah/jual beli dengan rincian sebagai berikut :",
      }),
    ];

    data.shareTransfers.forEach((t, i) => {
      const fromSh = data.shareholders.find(
        (s) => s.id === t.fromShareholderId,
      );
      const toSh =
        data.shareholders.find((s) => s.id === t.toShareholderId) ||
        data.finalShareholders.find((s) => s.id === t.toShareholderId);

      if (fromSh && toSh) {
        transferBody.push(
          createBodyParagraph({
            indent: { left: INDENT_STEP * 2, hanging: HANGING_SIZE },
            children: [
              new TextRun({ text: "- ", size: FONT_SIZE, font: FONT_FAMILY }),
              new TextRun({
                text: (fromSh.name || ".....").toUpperCase(),
                bold: true,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: ` mengalihkan sejumlah ${t.sharesTransferred.toLocaleString("id-ID")} (${numberToWords(t.sharesTransferred)}) saham perseroan atau senilai Rp. ${formatInputNumber(t.sharesTransferred * data.originalSharePrice)},- (${numberToWords(t.sharesTransferred * data.originalSharePrice)} rupiah) kepada `,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: (toSh.name || ".....").toUpperCase(),
                bold: true,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({ text: `;`, size: FONT_SIZE, font: FONT_FAMILY }),
            ],
          }),
        );
      }
    });

    const isHibahTotal = data.shareTransfers.every((t) => t.type === "Hibah");
    const hasHibah = data.shareTransfers.some((t) => t.type === "Hibah");
    const hasJualBeli = data.shareTransfers.some((t) => t.type === "Jual Beli");

    let resTitle = "Persetujuan Penjualan dan Pengalihan Saham";
    if (isHibahTotal) resTitle = "Persetujuan Hibah Saham";
    else if (hasHibah && hasJualBeli)
      resTitle = "Persetujuan Hibah dan Penjualan Saham";

    addResolution(resTitle, transferBody);
  }

  if (
    data.resolutions.capitalBase ||
    data.resolutions.capitalPaid ||
    data.resolutions.capitalBaseDecrease ||
    data.resolutions.capitalPaidDecrease ||
    data.resolutions.shareholders
  ) {
    const finalCompBody: any[] = [
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: "Sehingga merubah susunan pemegang saham perseroan menjadi sebagai berikut :",
        spacing: { before: 120 },
      }),
    ];

    data.finalShareholders
      .filter((s) => s.sharesOwned > 0)
      .forEach((s) => {
        const currentValue = s.sharesOwned * (data.originalSharePrice || 0);
        finalCompBody.push(
          createBodyParagraph({
            indent: { left: INDENT_STEP * 2, hanging: HANGING_SIZE },
            children: [
              new TextRun({ text: "- ", size: FONT_SIZE, font: FONT_FAMILY }),
              new TextRun({
                text: (s.name || ".....").toUpperCase(),
                bold: true,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({ text: ` : `, size: FONT_SIZE, font: FONT_FAMILY }),
              new TextRun({
                text: s.sharesOwned.toLocaleString("id-ID"),
                bold: true,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: ` (${numberToWords(s.sharesOwned)}) lembar saham atau senilai Rp. `,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: formatRpDot(currentValue),
                bold: true,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
              new TextRun({
                text: `,- (${numberToWords(currentValue)} rupiah);`,
                size: FONT_SIZE,
                font: FONT_FAMILY,
              }),
            ],
          }),
        );
      });

    addResolution("Persetujuan Susunan Pemegang Saham", finalCompBody);
  }

  // Management Change Logic
  if (data.resolutions.management || data.resolutions.reappointment) {
    const resTitle = "Persetujuan Perubahan/Pengangkatan Pengurus";

    // Combine managers from the shareholders list (who are marked as management) + explicit management items
    const oldManagers = [
      ...data.shareholders
        .filter((s) => s.isManagement)
        .map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
      ...(data.oldManagementItems || []),
    ];

    const newManagers = [
      ...(data.finalShareholders && data.finalShareholders.length > 0
        ? data.finalShareholders
        : data.shareholders
      )
        .filter((s) => s.isManagement)
        .map((s) => ({
          ...s,
          managementPosition: s.managementPosition || "Pengurus",
          position: s.managementPosition || "Pengurus",
        })),
      ...(data.newManagementItems || []),
    ];

    const body: any[] = [
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: "Menyetujui untuk memberhentikan dengan hormat seluruh anggota Direksi dan Dewan Komisaris Perseroan yang menjabat saat ini, yaitu :",
      }),
    ];

    oldManagers.forEach((m) => {
      body.push(
        createBodyParagraph({
          indent: { left: INDENT_STEP * 2, hanging: HANGING_SIZE },
          children: [
            new TextRun({ text: "- ", size: FONT_SIZE, font: FONT_FAMILY }),
            new TextRun({
              text: (m.name || "..........").toUpperCase(),
              bold: true,
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
            new TextRun({
              text: `, selaku ${m.position} perseroan;`,
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
          ],
        }),
      );
    });

    body.push(
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: "dengan ucapan terima kasih atas jasa-jasa dan pengabdian yang telah diberikan selama masa jabatannya dalam Perseroan, serta memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) atas tindakan pengurusan dan pengawasan yang telah dijalankan, sepanjang tindakan-tindakan tersebut tercermin dalam buku-buku serta laporan tahunan Perseroan.",
        spacing: { before: 120 },
      }),
    );

    body.push(
      createBodyParagraph({
        indent: { left: INDENT_STEP },
        text: "Selanjutnya menyetujui untuk mengangkat nama-nama tersebut di bawah ini sebagai anggota Direksi dan Dewan Komisaris Perseroan yang baru :",
        spacing: { before: 120 },
      }),
    );

    newManagers.forEach((m) => {
      body.push(
        createBodyParagraph({
          indent: { left: INDENT_STEP * 2, hanging: HANGING_SIZE },
          children: [
            new TextRun({ text: "- ", size: FONT_SIZE, font: FONT_FAMILY }),
            new TextRun({
              text: (m.name || "..........").toUpperCase(),
              bold: true,
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
            new TextRun({
              text: `, sebagai ${toTitleCase(m.position)} perseroan;`,
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
          ],
        }),
      );
    });

    addResolution(resTitle, body);
  }

  // Final Power of Attorney
  let repName = "................";
  let repText: string = "";

  if (data.representativeType === "EXISTING") {
    const allPotentialReps = [...data.shareholders, ...data.finalShareholders];
    const rep = allPotentialReps.find(
      (s) => s.id === data.authorizedRepresentativeId,
    );
    repName = `${rep?.salutation || "................"} ${(rep?.name || "................").toUpperCase()}`;
    repText = repName;
  } else {
    const rep = data.manualRepresentative;
    if (rep) {
      repName = `${rep.salutation} ${rep.name.toUpperCase() || "................"}`;
      const birthStr = `lahir di ${toTitleCase(rep.birthCity || "................")}, pada tanggal ${getDayIndo(rep.birthDate) || ".."} ${getMonthIndo(rep.birthDate) || "........"} ${getYearIndo(rep.birthDate) || "...."}`;
      repText = `${repName}, ${birthStr}, ${getNationalityStr(rep)}, ${getOccupationStr(rep)}${getAddressStr(rep)}, ${getIdentificationStr(rep)}`;
    } else {
      repText = "................";
    }
  }

  addResolution("Pemberian Kuasa", [
    createBodyParagraph({
      indent: { left: INDENT_STEP },
      children: [
        new TextRun({
          text: "Menyetujui dan memutuskan untuk memberikan kuasa dengan hak substitusi kepada ",
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: repText,
          bold: true,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
        new TextRun({
          text: ", untuk melakukan tindakan-tindakan yang diperlukan sehubungan dengan keputusan Rapat di atas, termasuk memberi keterangan-keterangan, membuat, minta dibuatkan dan menandatangani segala surat dan akta dihadapan Notaris dan umumnya menjalankan segala tindakan yang dianggap perlu dan berguna, tidak ada tindakan yang dikecualikan.",
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
      ],
    }),
  ]);

  // --- CLOSING ---
  if (isCircular) {
    children.push(
      createBodyParagraph({
        text: `Demikianlah keputusan para pemegang saham di luar rapat ini dibuat berdasarkan ketentuan pasal 91 Undang-Undang nomor 40 tahun 2007 tentang Perseroan Terbatas, mempunyai kekuatan yang sama yang diambil dengan sah dalam RUPS dan ditandatangani dengan sebenar-benarnya pada hari dan tanggal dimaksud pada keputusan diatas.`,
        spacing: { before: 480, after: 720 },
      }),
    );
  } else {
    children.push(
      new Paragraph({
        spacing: { after: 240, before: 480 },
        children: [
          new TextRun({
            text: "VII. PENUTUP",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
        ],
      }),
    );

    children.push(
      createBodyParagraph({
        children: [
          new TextRun({
            text: `Akhirnya, oleh karena sudah tidak ada hal-hal lain yang perlu dibicarakan lagi, maka Ketua Rapat menutup Rapat ini pada jam `,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: data.meetingEndTime || "..:..",
            bold: true,
            size: FONT_SIZE,
            font: FONT_FAMILY,
          }),
          new TextRun({ text: ` WIB.`, size: FONT_SIZE, font: FONT_FAMILY }),
        ],
        spacing: { after: 720 },
      }),
    );
  }

  children.push(
    new Paragraph({
      alignment: "left" as any,
      spacing: { after: 480, line: LINE_SPACING },
      children: [
        new TextRun({
          text: "TANDA TANGAN PARA PEMEGANG SAHAM,",
          bold: true,
          size: FONT_SIZE,
          font: FONT_FAMILY,
        }),
      ],
    }),
  );

  data.shareholders
    .filter((sh) => sh.sharesOwned > 0)
    .forEach((sh, idx) => {
      if (idx === 0) {
        children.push(
          new Paragraph({
            alignment: "left" as any,
            spacing: { after: 480, line: LINE_SPACING },
            children: [
              new TextRun({
                text: "Meterai 10.000 + Cap",
                color: "bfbfbf",
                size: 16,
                font: FONT_FAMILY,
              }),
            ],
          }),
        );
      } else {
        children.push(
          new Paragraph({
            alignment: "left" as any,
            spacing: { before: 480 },
            children: [],
          }),
        );
      }

      children.push(
        new Paragraph({
          alignment: "left" as any,
          spacing: { after: 0, line: LINE_SPACING },
          children: [
            new TextRun({
              text: (sh.name || "................").toUpperCase(),
              bold: true,
              underline: { type: "single" },
              size: FONT_SIZE,
              font: FONT_FAMILY,
            }),
          ],
        }),
        new Paragraph({
          alignment: "left" as any,
          spacing: { after: 1200, line: LINE_SPACING },
          children: [
            new TextRun({
              text: "Tanggal: ....................",
              size: 20,
              font: FONT_FAMILY,
            }),
          ],
        }),
      );
    });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "sh-num",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "left" as any,
              style: {
                paragraph: {
                  indent: { left: INDENT_STEP, hanging: HANGING_SIZE },
                },
              },
            },
          ],
        },
        {
          reference: "decl-num",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "left" as any,
              style: {
                paragraph: {
                  indent: { left: INDENT_STEP, hanging: HANGING_SIZE },
                },
              },
            },
          ],
        },
        {
          reference: "res-num",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "left" as any,
              style: {
                paragraph: {
                  indent: { left: INDENT_STEP, hanging: HANGING_SIZE },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN_NORMAL,
              bottom: MARGIN_NORMAL,
              left: MARGIN_NORMAL,
              right: MARGIN_NORMAL,
            },
          },
        },
        children,
      },
    ],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const fileName = `Draft_${isCircular ? "Sirkuler" : "Notulen"}_PT_${(data.companyName || "Draft").replace(/\s+/g, "_")}.docx`;
    saveAsNative(blob, fileName);
  } catch (error) {
    console.error("docx error", error);
  }
};
