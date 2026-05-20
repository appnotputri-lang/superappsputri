import { Document, Packer, Paragraph, TextRun } from "docx";
import { CompanyData, Shareholder, Address, ManagementItem } from "../types";
import { formatFullAddressData } from "../src/lib/formatter";
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
} from "./formatters";

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
const LINE_SPACING = 276;
const AFTER_SPACING = 120;
const MARGIN_NORMAL = 1440;

// ─── NUMBERING REFERENCES (sesuai XML contoh NOTULEN_RUPSLB.docx) ────────────
// "sh-dash"      → bullet "-", left=426, hang=426  → peserta/pemegang saham (numId 2)
// "hadir-dash"   → bullet "-", left=993, hang=284  → "Dalam hal ini hadir selaku" (numId 3)
// "letter-sub"   → lowerLetter "%1.", left=1418, hang=360 → a./b. sub items (numId 4 / restart per-sh)
// "para-dash"    → bullet "-", left=284, hang=284  → "Para Pemegang Saham" (numId 5)
// "amendment-dash"→ bullet "-", left=426           → akta perubahan (numId 6)
// "res-num"      → decimal "%1.", left=720, hang=360 → keputusan titles (numId 7)
// "kbli-sub"     → decimal "%1)", left=1429, hang=360 → pasal 3 (1) (2) (numId 8)
// "kbli-item"    → bullet "-", left=1134, hang=283 → kbli items (numId 9)
// "detail-dash"  → bullet "-", left=993, hang=284  → hibah/saham/detail (numId 10)
// "mgmt-dash"    → bullet "-", left=1146, hang=360 → new management (numId 11)
// "agenda-dash"  → decimal "%1.", left=1418, hang=360 → agenda items (numId 14)
// "section-num"  → upperRoman bold, left=720       → section headers I. II. III. (numId 15)

const INDENT_STEP = 720; // 0.5 inch

const formatRpDot = (val: number) => formatCurrency(val).replace("Rp ", "Rp. ");

const getNationalityStr = (sh: { nationalityType?: string; nationality?: string }) => {
  if (sh.nationalityType === "WNA") return `Warga Negara ${sh.nationality || "................"}`;
  return sh.nationality || "WNI";
};

const getIdentificationStr = (sh: {
  nationalityType?: string; passportNumber?: string;
  hasKitas?: boolean; kitasNumber?: string; kitasType?: string; nik?: string;
}) => {
  if (sh.nationalityType === "WNA") {
    let idStr = `pemegang Passport No ${sh.passportNumber || "................"}`;
    if (sh.hasKitas && sh.kitasNumber) idStr += `, pemegang ${sh.kitasType || "KITAS/KITAP"} No ${sh.kitasNumber}`;
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

const getAddressStr = (sh: { address?: Address }) =>
  `bertempat tinggal di ${formatFullAddressDoc(sh.address)}`;

const getOccupationStr = (sh: { nationalityType?: string; occupation?: string }) => {
  if (sh.nationalityType === "WNA") return "";
  return `${toTitleCase(sh.occupation || "................")}, `;
};

// ─── PARAGRAPH HELPERS ──────────────────────────────────────────────────────

const mkRun = (text: string, bold?: boolean, extra?: object) =>
  new TextRun({ text, bold, size: FONT_SIZE, font: FONT_FAMILY, ...extra });

const mkP = (opts: {
  children?: any[];
  text?: string;
  numbering?: { reference: string; level: number };
  indent?: { left?: number; hanging?: number; firstLine?: number };
  spacing?: { before?: number; after?: number; line?: number };
  alignment?: "both" | "center" | "left";
  bold?: boolean;
  tabStops?: any[];
}) => new Paragraph({
  alignment: opts.alignment ?? "both",
  spacing: {
    line: opts.spacing?.line ?? LINE_SPACING,
    after: opts.spacing?.after ?? AFTER_SPACING,
    before: opts.spacing?.before ?? 0,
  },
  indent: opts.indent,
  numbering: opts.numbering,
  tabStops: opts.tabStops,
  children: opts.children ?? [mkRun(opts.text ?? "", opts.bold)],
});

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────

export const generateWordDoc = async (data: CompanyData) => {
  const isCircular = data.documentType === "CIRCULAR";
  const companyName = data.companyName.toUpperCase();

  const getResolutionSummary = () => {
    const agendaOrder = [
      "companyNameChange","domicile","address","kbli","capitalBase","capitalPaid",
      "capitalBaseDecrease","capitalPaidDecrease","shareholders","management","reappointment",
    ] as const;
    const active = agendaOrder
      .filter((k) => data.resolutions[k as keyof typeof data.resolutions])
      .map((k) => {
        switch (k) {
          case "companyNameChange": return "perubahan nama perseroan";
          case "domicile": return "perubahan kedudukan";
          case "address": return "perubahan alamat";
          case "kbli": return "perubahan KBLI";
          case "capitalBase": return "peningkatan modal dasar";
          case "capitalPaid": return "peningkatan modal disetor";
          case "capitalBaseDecrease": return "penurunan modal dasar";
          case "capitalPaidDecrease": return "penurunan modal disetor";
          case "shareholders": return "perubahan struktur pemegang saham";
          case "management": return "perubahan susunan pengurus";
          case "reappointment": return "pengangkatan kembali pengurus";
          default: return "";
        }
      }).filter(Boolean);
    if (active.length === 0) return "perubahan";
    if (active.length === 1) return active[0];
    const last = active.pop();
    return `${active.join(", ")} dan ${last}`;
  };

  const children: any[] = [];

  // ── HEADER ────────────────────────────────────────────────────────────────
  if (isCircular) {
    children.push(
      mkP({ text: "KEPUTUSAN PARA PEMEGANG SAHAM SEBAGAI PENGGANTI", bold: true, alignment: "center", spacing: { after: 0 } }),
      mkP({ text: "RAPAT UMUM PEMEGANG SAHAM LUAR BIASA", bold: true, alignment: "center", spacing: { after: 0 } }),
      mkP({
        alignment: "center", spacing: { after: 480 },
        children: [mkRun(`PT ${companyName}`, true, { underline: { type: "single" } })],
      }),
    );
  } else {
    children.push(
      mkP({ text: "NOTULEN", bold: true, alignment: "center", spacing: { after: 0 } }),
      mkP({ text: "RAPAT UMUM PEMEGANG SAHAM LUAR BIASA", bold: true, alignment: "center", spacing: { after: 0 } }),
      mkP({
        alignment: "center", spacing: { after: 480 },
        children: [mkRun(`PT ${companyName}`, true, { underline: { type: "single" } })],
      }),
    );
  }

  // ── SECTION HEADERS (I. RAPAT / II. PESERTA dst.) ─────────────────────────
  // numId 15 → upperRoman bold, left=0 (per contoh: ind left=142 firstLine=0)
  const mkSection = (label: string, spacingBefore = 480, spacingAfter = 240) =>
    new Paragraph({
      alignment: "left" as any,
      spacing: { before: spacingBefore, after: spacingAfter },
      numbering: { reference: "section-num", level: 0 },
      indent: { left: 142, firstLine: 0 },
      children: [mkRun(label, true)],
    });

  // ── CIRCULAR: preamble ────────────────────────────────────────────────────
  if (isCircular) {
    const preambleDomicile = data.domicile || "................";
    children.push(
      mkP({ text: `Kami yang bertandatangan dibawah ini, para Pemegang Saham PT ${data.companyName || "................"}, berkedudukan di ${preambleDomicile} ("Perseroan"), terdiri dari:` }),
    );
  }

  // ── I. RAPAT (hanya NOTULEN) ──────────────────────────────────────────────
  if (!isCircular) {
    const dayName2 = getDayNameIndo(data.signingDate) || "................";
    const dateText2 = formatDateIndo(data.signingDate) || "................";
    const invDateText2 = formatDateIndo(data.invitationDate) || "................";

    children.push(
      new Paragraph({
        alignment: "left" as any,
        spacing: { before: 0, after: 240 },
        children: [mkRun("I. RAPAT", true)],
      })
    );

    const hasAmendments = data.amendmentDeeds && data.amendmentDeeds.length > 0;
    const currentCity = data.domicile || '................';
    
    children.push(
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, after: 120 },
        children: [
          mkRun(`Rapat Umum Pemegang Saham Luar Biasa “`),
          mkRun(`PT. ${companyName}`, true),
          mkRun(`“ (selanjutnya disebut sebagai “`),
          mkRun(`Rapat`, true),
          mkRun(`”) perseroan yang berkedudukan di ${currentCity}, demikian berdasarkan Akta Pendirian tertanggal `),
          mkRun(formatDateIndo(data.establishmentDeedDate) || "..........", true),
          mkRun(", No. "),
          mkRun(data.establishmentDeedNumber || "..........", true),
          mkRun(", yang dibuat dihadapan "),
          mkRun(`${data.establishmentNotary || ".........."}${data.establishmentNotaryTitle ? `, ${data.establishmentNotaryTitle}` : ""}`, true),
          mkRun(`, Notaris di Kabupaten Bandung Barat dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal `),
          mkRun(formatDateIndo(data.establishmentSkDate) || "..........", true),
          mkRun(", Nomor "),
          mkRun(data.establishmentSkNumber || "..........", true),
          mkRun(
            !hasAmendments 
              ? "." 
              : data.amendmentDeeds!.length === 1 
                ? " telah mengalami perubahan, berdasarkan :" 
                : " beberapa kali telah mengalami perubahan, berdasarkan :"
          ),
        ],
      })
    );

    // Akta perubahan → manual-dash bullet
    if (hasAmendments) {
      data.amendmentDeeds!.forEach((deed) => {
        const skSpParts = (deed.skSpDocuments || []).map((doc: any, dIdx: number) =>
          `${dIdx === 0 ? "dan " : ", serta "}${doc.type === "SK" ? "telah mendapat persetujuan dari Kementrian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal " : "telah dilaporkan ke Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal "} ${formatDateIndo(doc.date) || ".........."} Nomor ${doc.number || ".........."}`
        ).join("");

        children.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, after: 120 },
            numbering: { reference: "deed-num", level: 0 },
            indent: { left: 426 },
            children: [
              mkRun(`Akta Pernyataan Keputusan Rapat Umum Para Pemegang Saham Luar Biasa tertanggal ${formatDateIndo(deed.date) || ".........."} Nomor ${deed.number || ".........."}, yang dibuat di hadapan ${deed.notary || ".........."}${deed.notaryTitle ? `, ${deed.notaryTitle}` : ""}, Notaris di ${deed.notaryDomicile || data.domicile || ".........."} ${skSpParts}`),
            ],
          }),
        );
      });
    }

    children.push(
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, after: 120 },
        children: [
          mkRun(`Rapat ini diselenggarakan berdasarkan Surat Undangan Direksi PT. ${companyName} Nomor : `),
          mkRun(data.invitationNumber || "................", false),
          mkRun(" tanggal "),
          mkRun(invDateText2, false),
          mkRun(`, dan diadakan pada ${dayName2} tanggal, ${dateText2} bertempat di ${data.signingPlace || "................"}, pukul ${data.meetingStartTime ? data.meetingStartTime.replace(':', '.') : "09.00"} WIB.`),
        ],
      })
    );

    // Now Section II. PESERTA RAPAT
    children.push(
      new Paragraph({
        alignment: "left" as any,
        spacing: { before: 480, after: 240 },
        children: [mkRun("II. PESERTA RAPAT", true)],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, after: 120 },
        children: [mkRun("Rapat tersebut dihadiri oleh:")],
      })
    );
  }

  // Hitung saham dan persiapkan data peserta
  const attendingShareholders = isCircular
    ? data.shareholders.filter((sh) => (sh.sharesOwned || 0) > 0)
    : data.shareholders.filter((sh) => (sh.sharesOwned || 0) > 0 && sh.isPresent);
  const totalIssuedShares = data.shareholders.reduce((sum, sh) => sum + (sh.sharesOwned || 0), 0);
  const presentShares = attendingShareholders.reduce((sum, sh) => sum + (sh.sharesOwned || 0), 0);
  const attendingPercentage = totalIssuedShares > 0 ? (presentShares / totalIssuedShares) * 100 : 0;

  // Listing peserta
  if (isCircular) {
    attendingShareholders.forEach((sh, idx) => {
      const parValue = data.originalSharePrice || 0;
      const currentShares = sh.sharesOwned || 0;
      const currentValue = currentShares * parValue;

      // Circular: bullet dash sh-dash
      children.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, after: 0 },
          numbering: { reference: "sh-dash", level: 0 },
          indent: { left: 426 },
          children: [
            mkRun(`${sh.salutation} `),
            mkRun((sh.name || "................").toUpperCase(), true),
            mkRun(`, lahir di ${toTitleCase(sh.birthCity || "................")}, pada tanggal ${getDayIndo(sh.birthDate) || ".."} ${getMonthIndo(sh.birthDate) || "........"} ${getYearIndo(sh.birthDate) || "...."}, ${getNationalityStr(sh)}, ${getOccupationStr(sh)}${getAddressStr(sh)}, ${getIdentificationStr(sh)};`),
          ],
        }),
        mkP({
          numbering: { reference: "sh-dash", level: 0 },
          indent: { left: INDENT_STEP },
          spacing: { before: 60, after: 120 },
          children: [
            mkRun("Selaku pemilik dan pemegang "),
            mkRun(currentShares.toLocaleString("id-ID"), true),
            mkRun(` (${numberToWords(currentShares)}) lembar saham atau senilai `),
            mkRun(formatRpDot(currentValue), true),
            mkRun(` (${numberToWords(currentValue)} rupiah).`),
          ],
        }),
      );
    });
  } else {
    // Notulen: 1., 2. list — sub-letters a., b. reset per shareholder
    attendingShareholders.forEach((sh, idx) => {
      let shLetterCode = 97; // reset 'a' for each shareholder
      const getNextShLetter = () => {
        const char = String.fromCharCode(shLetterCode);
        shLetterCode++;
        return char;
      };
      const parValue = data.originalSharePrice || 0;
      const currentShares = sh.sharesOwned || 0;
      const currentValue = currentShares * parValue;

      // Decimal number index (1. Tuan RENDY)
      children.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, after: 60 },
          indent: { left: 426, hanging: 426 },
          children: [
            mkRun(`${idx + 1}. `, false),
            mkRun(`${sh.salutation} `),
            mkRun((sh.name || "................").toUpperCase(), true),
            mkRun(`, lahir di ${toTitleCase(sh.birthCity || "................")}, pada tanggal ${getDayIndo(sh.birthDate) || ".."} ${getMonthIndo(sh.birthDate) || "........"} ${getYearIndo(sh.birthDate) || "...."}, ${getNationalityStr(sh)}, ${getOccupationStr(sh)}${getAddressStr(sh)}, ${getIdentificationStr(sh)};`),
          ],
        })
      );

      // Dash bullet "Dalam hal ini hadir selaku :"
      children.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, before: 60, after: 60 },
          indent: { left: 709, hanging: 283 },
          children: [
            mkRun("- "),
            mkRun("Dalam hal ini hadir selaku :"),
          ],
        })
      );

      // Lettered sub items: a., b., c. continuing
      if (sh.isManagement) {
        const letter = getNextShLetter();
        children.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, before: 0, after: 60 },
            indent: { left: 993, hanging: 284 },
            children: [
              mkRun(`${letter}. `),
              mkRun(`${toTitleCase(sh.managementPosition || "Direktur")} Perseroan; dan`),
            ],
          })
        );
      }

      const letterShares = getNextShLetter();
      children.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, before: 0, after: 120 },
          indent: { left: 993, hanging: 284 },
          children: [
            mkRun(`${letterShares}. `),
            mkRun("Pemilik dan pemegang saham sebanyak "),
            mkRun(currentShares.toLocaleString("id-ID"), true),
            mkRun(` (${numberToWords(currentShares)}) lembar saham atau senilai `),
            mkRun(formatRpDot(currentValue), true),
            mkRun(` (${numberToWords(currentValue)} rupiah) berhak mengeluarkan suara `),
            mkRun(currentShares.toLocaleString("id-ID"), true),
            mkRun(` (${numberToWords(currentShares)}) suara dalam rapat.`),
          ],
        })
      );
    });
  }

  // Rekapitulasi saham hadir
  const totalValue = presentShares * (data.originalSharePrice || 0);
  children.push(
    new Paragraph({
      alignment: "both" as any,
      spacing: { line: LINE_SPACING, before: 120, after: 120 },
      children: [
        mkRun(
          isCircular
            ? "Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak "
            : `Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak ${totalIssuedShares.toLocaleString("id-ID")} (${numberToWords(totalIssuedShares)}) lembar saham, telah hadir dan/atau diwakili dalam rapat ini sebanyak `,
        ),
        mkRun(presentShares.toLocaleString("id-ID"), true),
        mkRun(` (${numberToWords(presentShares)}) lembar saham atau senilai `),
        mkRun(formatRpDot(totalValue), true),
        mkRun(
          ` (${numberToWords(totalValue)} rupiah)${
            !isCircular
              ? ` atau setara dengan ${attendingPercentage === 100 ? "100%" : `${attendingPercentage.toFixed(2)}%`} dari seluruh saham yang telah dikeluarkan oleh Perseroan`
              : ""
          }.`,
        ),
      ],
    }),
  );

  // "Para Pemegang Saham" → dash bullet
  children.push(
    new Paragraph({
      alignment: "both" as any,
      spacing: { line: LINE_SPACING, before: 120, after: 120 },
      indent: { left: 284, hanging: 284 },
      children: [
        mkRun("- "),
        mkRun("Untuk selanjutnya secara bersama-sama disebut sebagai "),
        mkRun("\u201CPara Pemegang Saham\u201D", true),
      ],
    }),
  );

  // ── CIRCULAR extra ────────────────────────────────────────────────────────
  if (isCircular) {
    children.push(
      mkP({ text: "DENGAN INI MENYATAKAN, bahwa Para Pemegang Saham telah mengetahui mengenai :", bold: true, spacing: { before: 240, after: 120 } }),
      mkP({ numbering: { reference: "res-num", level: 0 }, text: `Bahwa sampai saat ini jumlah saham yang telah ditempatkan dan disetor penuh dalam perseroan sebanyak ${data.originalTotalShares.toLocaleString("id-ID")} (${numberToWords(data.originalTotalShares)}) lembar saham;` }),
      mkP({ numbering: { reference: "res-num", level: 0 }, text: "Bahwa sesuai dengan ketentuan Pasal 91 Undang-Undang No. 40 Tahun 2007 tentang Perseroan Terbatas, pemegang saham dapat mengambil keputusan yang mengikat di luar Rapat Umum Pemegang Saham dengan syarat semua pemegang saham dengan hak suara menyetujui secara tertulis dengan menandatangani usul yang bersangkutan;" }),
      mkP({ numbering: { reference: "res-num", level: 0 }, text: `Bahwa maksud dari Keputusan Sirkuler Para Pemegang Saham ini adalah untuk ${getResolutionSummary()} Perseroan.`, spacing: { after: 240 } }),
      mkP({
        spacing: { after: 240 },
        children: [
          mkRun("OLEH KARENA ITU,", true),
          mkRun(" para pemegang saham secara bersama-sama setuju dan memutuskan hal-hal sebagai berikut:"),
        ],
      }),
    );
  } else {
    // ── III. KETUA RAPAT ──────────────────────────────────────────────────
    children.push(
      new Paragraph({
        alignment: "left" as any,
        spacing: { before: 480, after: 240 },
        children: [mkRun("III. KETUA RAPAT", true)],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, after: 240 },
        children: [
          mkRun("Berdasarkan ketentuan pasal 21 ayat (1) anggaran dasar perseroan, maka "),
          mkRun((data.meetingChair || "................").toUpperCase(), true),
          mkRun(", tersebut di atas, bertindak sebagai ketua rapat."),
        ],
      }),
    );

    // ── IV. AGENDA RAPAT ─────────────────────────────────────────────────
    const getAgendaItems = (): string[] => {
      const agendaOrder = [
        "companyNameChange", "domicile", "address", "kbli",
        "capitalBase", "capitalPaid", "capitalBaseDecrease", "capitalPaidDecrease",
        "shareholders", "management", "reappointment"
      ];
      return agendaOrder
        .filter(k => data.resolutions[k as keyof typeof data.resolutions])
        .map(k => {
          switch(k) {
            case "companyNameChange":    return "Persetujuan Perubahan Nama Perseroan;";
            case "domicile":             return "Persetujuan Perubahan Tempat Kedudukan Perseroan;";
            case "address":              return "Persetujuan Perubahan Alamat Lengkap Perseroan;";
            case "kbli":                 return "Persetujuan Perubahan Maksud dan Tujuan (KBLI) Perseroan;";
            case "capitalBase":          return "Persetujuan Peningkatan Modal Dasar Perseroan;";
            case "capitalPaid":          return "Persetujuan Peningkatan Modal Ditempatkan dan Disetor Perseroan;";
            case "capitalBaseDecrease":  return "Persetujuan Penurunan Modal Dasar Perseroan;";
            case "capitalPaidDecrease":  return "Persetujuan Penurunan Modal Ditempatkan dan Disetor Perseroan;";
            case "shareholders":         return "Persetujuan Perubahan Susunan Pemegang Saham Perseroan;";
            case "management":           return "Persetujuan Perubahan Susunan Pengurus Perseroan;";
            case "reappointment":        return "Persetujuan Pengangkatan Kembali Pengurus Perseroan;";
            default: return "";
          }
        })
        .filter(Boolean);
    };

    children.push(
      new Paragraph({
        alignment: "left" as any,
        spacing: { before: 480, after: 240 },
        children: [mkRun("IV. AGENDA RAPAT", true)],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, after: 120 },
        children: [mkRun("Rapat ini diadakan dengan agenda rapat sebagai berikut :")],
      })
    );

    const agendaItems = getAgendaItems();
    if (agendaItems.length > 0) {
      agendaItems.forEach((item, idx) => {
        children.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, after: 60 },
            indent: { left: 720, hanging: 360 },
            children: [
              mkRun(`${idx + 1}.`, true),
              new TextRun({ text: "\t" }),
              mkRun(item),
            ],
          }),
        );
      });
    } else {
      children.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, after: 120 },
          indent: { left: 720, hanging: 360 },
          children: [
            mkRun("1.", true),
            new TextRun({ text: "\t" }),
            mkRun("Persetujuan Perubahan Susunan Pengurus Perseroan;"),
          ],
        }),
      );
    }

    // ── V. JALANNYA RAPAT ────────────────────────────────────────────────
    children.push(
      new Paragraph({
        alignment: "left" as any,
        spacing: { before: 480, after: 240 },
        children: [mkRun("V. JALANNYA RAPAT", true)],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, after: 120 },
        children: [
          mkRun(`Ketua Rapat menyatakan bahwa dalam Rapat ini telah hadir dan/atau diwakili sebanyak ${presentShares.toLocaleString("id-ID")} (${numberToWords(presentShares)}) saham yang merupakan ${attendingPercentage === 100 ? "seluruh" : `${attendingPercentage.toFixed(2)}%`} dari total seluruh saham yang telah dikeluarkan oleh Perseroan.`),
        ],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, after: 120 },
        children: [
          mkRun("Oleh karena itu, Ketua Rapat menyatakan Rapat ini sah dan berhak mengambil keputusan yang sah dan mengikat Perseroan mengenai hal-hal yang dibicarakan dalam Rapat."),
        ],
      }),
    );
  }

  // ── VI. KEPUTUSAN-KEPUTUSAN ─────────────────────────────────────────────
  const resLabel = isCircular ? "KEPUTUSAN-KEPUTUSAN" : "VI. KEPUTUSAN-KEPUTUSAN";
  children.push(
    new Paragraph({
      alignment: "left" as any,
      spacing: { before: 480, after: 240 },
      children: [mkRun(resLabel, true)],
    }),
  );

  // Helper: judul keputusan → manual numbering, body → indent left=426
  let resolutionIdx = 1;
  const addRes = (title: string, body: any[]) => {
    children.push(
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, before: 120, after: 60 },
        indent: { left: 426, hanging: 426 },
        children: [
          mkRun(`${resolutionIdx}. `, true),
          mkRun(title, true),
        ],
      }),
    );
    resolutionIdx++;
    body.forEach((p) => children.push(p));
  };

  const bodyP = (opts: {
    children?: any[]; text?: string;
    indent?: { left?: number; hanging?: number };
    spacing?: { before?: number; after?: number };
  }) => new Paragraph({
    alignment: "both" as any,
    spacing: { line: LINE_SPACING, after: opts.spacing?.after ?? AFTER_SPACING, before: opts.spacing?.before ?? 0 },
    indent: opts.indent,
    children: opts.children ?? [mkRun(opts.text ?? "")],
  });

  // Perubahan Nama
  if (data.resolutions.companyNameChange) {
    addRes("Persetujuan Perubahan Nama Perseroan", [
      bodyP({ indent: { left: 426 }, text: `Menyetujui dan memutuskan untuk mengubah nama Perseroan, yang semula bernama : PT ${data.companyName.toUpperCase()} menjadi bernama : PT ${data.targetCompanyName.toUpperCase()}.` }),
    ]);
  }

  // Perubahan Kedudukan/Alamat
  if (data.resolutions.domicile || data.resolutions.address) {
    const resBlocks = [];
    
    if (data.resolutions.domicile) {
      resBlocks.push(bodyP({ 
        indent: { left: 426 }, 
        text: `Menyetujui dan memutuskan untuk mengubah tempat kedudukan Perseroan, yang semula berkedudukan di ${data.domicile || ".........."} menjadi berkedudukan di ${data.newAddress?.city || ".........."}.` 
      }));
    }
    
    if (data.resolutions.address) {
      resBlocks.push(bodyP({ 
        indent: { left: 426 }, 
        text: `Menyetujui dan memutuskan untuk mengubah alamat lengkap Perseroan, yang semula beralamat di ${formatFullAddressData(data.oldAddress)} menjadi beralamat di ${formatFullAddressData(data.newAddress)}.` 
      }));
    }

    addRes("Persetujuan Perubahan Kedudukan/Alamat Perseroan", resBlocks);
  }

  // KBLI
  if (data.resolutions.kbli) {
    const kbliBody: any[] = [];
    
    // "Menyetujui dan memutuskan..."
    kbliBody.push(
      bodyP({ indent: { left: 426 }, text: "Menyetujui dan memutuskan untuk mengubah ketentuan Pasal 3 ayat (1) dan ayat (2) Anggaran Dasar Perseroan mengenai Maksud dan Tujuan serta Kegiatan Usaha, sehingga selanjutnya menjadi berbunyi sebagai berikut :" })
    );

    // "1) Maksud dan Tujuan Perseroan adalah berusaha dalam bidang :"
    kbliBody.push(
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, after: 60 },
        indent: { left: 851, hanging: 426 },
        children: [
          mkRun("1) "),
          mkRun("Maksud dan Tujuan Perseroan adalah berusaha dalam bidang :"),
        ],
      })
    );

    // "- PENYEDIAAN AKOMODASI DAN PENYEDIAAN MAKAN MINUM"
    const categories = Array.from(new Set((data.kbliItems || []).map((k: any) => k.categoryName))).filter(Boolean) as string[];
    categories.forEach((cat) => {
      kbliBody.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, after: 60 },
          indent: { left: 1134, hanging: 283 },
          children: [
            mkRun("- "),
            mkRun(cat.toUpperCase()),
          ],
        })
      );
    });

    // "2) Untuk mencapai maksud dan tujuan..."
    kbliBody.push(
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, before: 60, after: 60 },
        indent: { left: 851, hanging: 426 },
        children: [
          mkRun("2) "),
          mkRun("Untuk mencapai maksud dan tujuan tersebut diatas, perseroan dapat melaksanakan kegiatan usaha sebagai berikut :"),
        ],
      })
    );

    // KBLI items
    (data.kbliItems || []).forEach((kbli: any) => {
      kbliBody.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, after: 60 },
          indent: { left: 1134, hanging: 283 },
          children: [
            mkRun("- "),
            mkRun(`${kbli.code} - ${kbli.name};`, true),
          ],
        })
      );

      if (kbli.description) {
        kbliBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, after: 120 },
            indent: { left: 1418 },
            children: [
              mkRun(kbli.description),
            ],
          })
        );
      }
    });

    addRes("Persetujuan Perubahan Maksud dan Tujuan Perseroan", kbliBody);
  }

  // Modal Dasar
  if (data.resolutions.capitalBase || data.resolutions.capitalBaseDecrease) {
    const originalShares = data.originalAuthorizedShares || 0;
    const targetShares = data.targetCapitalBase / (data.originalSharePrice || 1);
    addRes(
      data.resolutions.capitalBaseDecrease ? "Persetujuan Penurunan Modal Dasar Perseroan" : "Persetujuan Peningkatan Modal Dasar Perseroan",
      [bodyP({ indent: { left: 426 }, text: `Menyetujui untuk ${data.resolutions.capitalBaseDecrease ? "menurunkan" : "meningkatkan"} Modal Dasar Perseroan, yang semula sebesar Rp. ${formatInputNumber(data.originalCapitalBase)},- (${numberToWords(data.originalCapitalBase)} rupiah) terbagi atas ${formatInputNumber(originalShares)} (${numberToWords(originalShares)}) lembar saham, masing-masing saham bernilai nominal Rp. ${formatInputNumber(data.originalSharePrice)},- (${numberToWords(data.originalSharePrice)} rupiah), menjadi sebesar Rp. ${formatInputNumber(data.targetCapitalBase)},- (${numberToWords(data.targetCapitalBase)} rupiah) terbagi atas ${formatInputNumber(targetShares)} (${numberToWords(targetShares)}) lembar saham, masing-masing saham bernilai nominal Rp. ${formatInputNumber(data.originalSharePrice)},- (${numberToWords(data.originalSharePrice)} rupiah).` })],
    );
  }

  // Modal Ditempatkan & Disetor
  if (data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) {
    const originalShares = data.originalTotalShares || 0;
    const targetShares = data.targetCapitalPaid / (data.originalSharePrice || 1);
    const capitalBody: any[] = [
      bodyP({ indent: { left: 426 }, text: `Menyetujui untuk ${data.resolutions.capitalPaidDecrease ? "menurunkan" : "meningkatkan"} Modal Ditempatkan dan Disetor dalam Perseroan, yang semula sebesar Rp. ${formatInputNumber(data.originalCapitalPaid)},- (${numberToWords(data.originalCapitalPaid)} rupiah) yang terbagi menjadi sejumlah ${formatInputNumber(originalShares)} (${numberToWords(originalShares)}) lembar saham, menjadi sebesar Rp. ${formatInputNumber(data.targetCapitalPaid)},- (${numberToWords(data.targetCapitalPaid)} rupiah) yang terbagi menjadi sejumlah ${formatInputNumber(targetShares)} (${numberToWords(targetShares)}) lembar saham.` }),
    ];

    if (data.resolutions.capitalPaid) {
      capitalBody.push(bodyP({ indent: { left: 426 }, text: "Bahwa pengeluaran saham-saham baru tersebut di atas, telah diambil bagian dan disetor penuh secara tunai melalui kas Perseroan oleh masing - masing pemegang saham dengan rincian sebagai berikut :", spacing: { before: 120 } }));

      const newDeposits = data.finalShareholders
        .filter((fs) => fs.isNewDeposit && fs.newDepositShares && fs.newDepositShares > 0)
        .map((fs) => ({ name: fs.name, addedShares: fs.newDepositShares!, addedValue: fs.newDepositShares! * (data.originalSharePrice || 0) }));

      newDeposits.forEach((dep) => {
        capitalBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, before: 60, after: 60 },
            indent: { left: 709, hanging: 283 },
            children: [
              mkRun("- "),
              mkRun(`${dep.name.toUpperCase()} `, true),
              mkRun(`: ${formatInputNumber(dep.addedShares)} (${numberToWords(dep.addedShares)}) lembar saham atau senilai Rp. ${formatInputNumber(dep.addedValue)},- (${numberToWords(dep.addedValue)} rupiah);`),
            ],
          }),
        );
      });
    }

    addRes(
      data.resolutions.capitalPaidDecrease ? "Persetujuan Penurunan Modal Ditempatkan dan Disetor Perseroan" : "Persetujuan Peningkatan Modal Ditempatkan dan Disetor Perseroan",
      capitalBody,
    );
  }

  // Hibah / Transfer saham
  if (data.resolutions.shareholders && data.shareTransfers && data.shareTransfers.length > 0) {
    const transferBody: any[] = [
      bodyP({ indent: { left: 426 }, text: "Menyetujui pengalihan seluruh saham secara hibah/jual beli dengan rincian sebagai berikut :" }),
    ];

    data.shareTransfers.forEach((t) => {
      const fromSh = data.shareholders.find((s) => s.id === t.fromShareholderId);
      const toSh = data.shareholders.find((s) => s.id === t.toShareholderId) || data.finalShareholders.find((s) => s.id === t.toShareholderId);
      if (fromSh && toSh) {
        transferBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, after: 120 },
            indent: { left: 709, hanging: 283 },
            children: [
              mkRun("- "),
              mkRun((fromSh.name || ".....").toUpperCase(), true),
              mkRun(` mengalihkan sejumlah ${t.sharesTransferred.toLocaleString("id-ID")} (${numberToWords(t.sharesTransferred)}) saham perseroan atau senilai Rp. ${formatInputNumber(t.sharesTransferred * data.originalSharePrice)},- (${numberToWords(t.sharesTransferred * data.originalSharePrice)} rupiah) kepada `),
              mkRun((toSh.name || ".....").toUpperCase(), true),
              mkRun(";"),
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
    else if (hasHibah && hasJualBeli) resTitle = "Persetujuan Hibah dan Penjualan Saham";
    addRes(resTitle, transferBody);
  }

  // Susunan Pemegang Saham final
  if (data.resolutions.capitalBase || data.resolutions.capitalPaid || data.resolutions.capitalBaseDecrease || data.resolutions.capitalPaidDecrease || data.resolutions.shareholders) {
    const shBody: any[] = [
      bodyP({ indent: { left: 426 }, text: "Sehingga merubah susunan pemegang saham perseroan menjadi sebagai berikut :" }),
    ];

    data.finalShareholders.filter((s) => s.sharesOwned > 0).forEach((s) => {
      const currentValue = s.sharesOwned * (data.originalSharePrice || 0);
      shBody.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, after: 120 },
          indent: { left: 709, hanging: 283 },
          children: [
            mkRun("- "),
            mkRun((s.name || ".....").toUpperCase(), true),
            mkRun(" : "),
            mkRun(s.sharesOwned.toLocaleString("id-ID"), true),
            mkRun(` (${numberToWords(s.sharesOwned)}) lembar saham atau senilai `),
            mkRun(formatRpDot(currentValue), true),
            mkRun(` (${numberToWords(currentValue)} rupiah);`),
          ],
        }),
      );
    });

    addRes("Persetujuan Susunan Pemegang Saham", shBody);
  }

  // Perubahan/Pengangkatan Pengurus
  if (data.resolutions.management || data.resolutions.reappointment) {
    const oldManagers = [
      ...data.shareholders.filter((s) => s.isManagement).map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
      ...(data.oldManagementItems || []),
    ];
    const newManagers = [
      ...(data.finalShareholders && data.finalShareholders.length > 0 ? data.finalShareholders : data.shareholders)
        .filter((s) => s.isManagement)
        .map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
      ...(data.newManagementItems || []),
    ];

    const mgmtBody: any[] = [
      bodyP({ indent: { left: 426 }, text: "Menyetujui untuk memberhentikan dengan hormat seluruh anggota Direksi dan Dewan Komisaris Perseroan yang menjabat saat ini, yaitu :" }),
    ];

    oldManagers.forEach((m) => {
      mgmtBody.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, after: 0 },
          indent: { left: 709, hanging: 283 },
          children: [
            mkRun("- "),
            mkRun((m.name || "..........").toUpperCase(), true),
            mkRun(`, selaku ${m.position} perseroan;`),
          ],
        }),
      );
    });

    mgmtBody.push(
      bodyP({ indent: { left: 426 }, text: "Dengan ucapan terima kasih atas jasa-jasa dan pengabdian yang telah diberikan selama masa jabatannya dalam Perseroan, serta memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) atas tindakan pengurusan dan pengawasan yang telah dijalankan, sepanjang tindakan-tindakan tersebut tercermin dalam buku-buku serta laporan tahunan Perseroan.", spacing: { before: 120 } }),
      bodyP({ indent: { left: 426 }, text: "Selanjutnya menyetujui untuk mengangkat nama-nama tersebut di bawah ini sebagai anggota Direksi dan Dewan Komisaris Perseroan yang baru :", spacing: { before: 120 } }),
    );

    newManagers.forEach((m) => {
      mgmtBody.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, before: 60, after: 60 },
          indent: { left: 709, hanging: 283 },
          children: [
            mkRun("- "),
            mkRun((m.name || "..........").toUpperCase(), true),
            mkRun(`, sebagai ${toTitleCase(m.position)} perseroan;`),
          ],
        }),
      );
    });

    addRes("Persetujuan Perubahan/Pengangkatan Pengurus", mgmtBody);
  }

  // Pemberian Kuasa
  let repText = "................";
  if (data.representativeType === "EXISTING") {
    const allReps = [...data.shareholders, ...data.finalShareholders];
    const rep = allReps.find((s) => s.id === data.authorizedRepresentativeId);
    repText = `${rep?.salutation || "................"} ${(rep?.name || "................").toUpperCase()}`;
  } else {
    const rep = data.manualRepresentative;
    if (rep) {
      const birthStr = `lahir di ${toTitleCase(rep.birthCity || "................")}, pada tanggal ${getDayIndo(rep.birthDate) || ".."} ${getMonthIndo(rep.birthDate) || "........"} ${getYearIndo(rep.birthDate) || "...."}`;
      repText = `${rep.salutation} ${rep.name.toUpperCase() || "................"}, ${birthStr}, ${getNationalityStr(rep)}, ${getOccupationStr(rep)}${getAddressStr(rep)}, ${getIdentificationStr(rep)}`;
    }
  }
  addRes("Pemberian Kuasa", [
    new Paragraph({
      alignment: "both" as any,
      spacing: { line: LINE_SPACING, after: AFTER_SPACING },
      indent: { left: 426 },
      children: [
        mkRun("Menyetujui dan memutuskan untuk memberikan kuasa dengan hak substitusi kepada "),
        mkRun(repText, true),
        mkRun(", untuk melakukan tindakan-tindakan yang diperlukan sehubungan dengan keputusan Rapat di atas, termasuk memberi keterangan-keterangan, membuat, minta dibuatkan dan menandatangani segala surat dan akta dihadapan Notaris dan umumnya menjalankan segala tindakan yang dianggap perlu dan berguna, tidak ada tindakan yang dikecualikan."),
      ],
    }),
  ]);

  // ── PENUTUP ──────────────────────────────────────────────────────────────
  if (isCircular) {
    children.push(
      mkP({ text: `Demikianlah keputusan para pemegang saham di luar rapat ini dibuat berdasarkan ketentuan pasal 91 Undang-Undang nomor 40 tahun 2007 tentang Perseroan Terbatas, mempunyai kekuatan yang sama yang diambil dengan sah dalam RUPS dan ditandatangani dengan sebenar-benarnya pada hari dan tanggal dimaksud pada keputusan diatas.`, spacing: { before: 480, after: 720 } }),
    );
  } else {
    children.push(
      new Paragraph({
        spacing: { after: 240, before: 480 },
        children: [mkRun("VII. PENUTUP", true)],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, after: 720 },
        children: [
          mkRun("Akhirnya, oleh karena sudah tidak ada hal-hal lain yang perlu dibicarakan lagi, maka Ketua Rapat menutup Rapat ini pada jam "),
          mkRun(data.meetingEndTime || "11:00", true),
          mkRun(" WIB."),
        ],
      }),
    );
  }

  // ── TANDA TANGAN ──────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      alignment: "left" as any,
      spacing: { after: 480, line: LINE_SPACING },
      children: [mkRun("TANDA TANGAN PARA PEMEGANG SAHAM,", true)],
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
            children: [mkRun("Meterai 10.000 + Cap", false, { color: "bfbfbf", size: 16 })],
          }),
        );
      } else {
        children.push(new Paragraph({ spacing: { before: 480 }, children: [] }));
      }
      children.push(
        new Paragraph({
          alignment: "left" as any,
          spacing: { after: 0, line: LINE_SPACING },
          children: [mkRun((sh.name || "................").toUpperCase(), true)],
        }),
        new Paragraph({
          alignment: "left" as any,
          spacing: { after: 1200, line: LINE_SPACING },
          children: [new TextRun({ text: "Tanggal: ....................", size: 20, font: FONT_FAMILY })],
        }),
      );
    });

  // ── BUILD DOCUMENT ─────────────────────────────────────────────────────────
  // Buat referensi letter-sub unik untuk setiap shareholder
  const letterSubConfigs = attendingShareholders.map((_, idx) => ({
    reference: `letter-sub-${idx}`,
    levels: [{
      level: 0,
      format: "lowerLetter" as any,
      text: "%1.",
      alignment: "left" as any,
      style: { paragraph: { indent: { left: 993, hanging: 284 } } },
    }],
  }));

  const doc = new Document({
    numbering: {
      config: [
        // section-num: upperRoman bold (I. II. III...) — headers seksi
        {
          reference: "section-num",
          levels: [{
            level: 0, format: "upperRoman" as any, text: "%1.",
            alignment: "right" as any,
            style: {
              run: { bold: true, size: FONT_SIZE, font: FONT_FAMILY },
              paragraph: { indent: { left: 720, hanging: 360 } },
            },
          }],
        },
        // sh-dash: bullet "-", left=426 — daftar pemegang saham
        {
          reference: "sh-dash",
          levels: [{
            level: 0, format: "bullet" as any, text: "-",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 426, hanging: 426 } } },
          }],
        },
        // hadir-dash: bullet "-", left=709 hang=283 — "Dalam hal ini hadir selaku"
        {
          reference: "hadir-dash",
          levels: [{
            level: 0, format: "bullet" as any, text: "-",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 709, hanging: 283 } } },
          }],
        },
        // para-dash: bullet "-", left=284 hang=284 — "Para Pemegang Saham"
        {
          reference: "para-dash",
          levels: [{
            level: 0, format: "bullet" as any, text: "-",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 284, hanging: 284 } } },
          }],
        },
        // agenda-dash: decimal "%1." left=1418 hang=360 — agenda items
        {
          reference: "agenda-dash",
          levels: [{
            level: 0, format: "decimal" as any, text: "%1.",
            alignment: "left" as any,
            style: {
              run: { size: FONT_SIZE, font: FONT_FAMILY },
              paragraph: { indent: { left: 1418, hanging: 360 } },
            },
          }],
        },
        // amendment-dash: bullet "-", left=426 — akta perubahan
        {
          reference: "amendment-dash",
          levels: [{
            level: 0, format: "bullet" as any, text: "-",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 426, hanging: 426 } } },
          }],
        },
        // deed-num: bullet "-", left=720 hang=360 — akta perubahan (persis contoh numId=2)
        {
          reference: "deed-num",
          levels: [{
            level: 0, format: "bullet" as any, text: "-",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }],
        },
        // res-num: decimal "%1." left=720 hang=360 — judul keputusan
        {
          reference: "res-num",
          levels: [{
            level: 0, format: "decimal" as any, text: "%1.",
            alignment: "left" as any,
            style: {
              run: { size: FONT_SIZE, font: FONT_FAMILY },
              paragraph: { indent: { left: 720, hanging: 360 } },
            },
          }],
        },
        // kbli-sub: decimal "%1)" left=1429 hang=360 — pasal 3 (1) (2)
        {
          reference: "kbli-sub",
          levels: [{
            level: 0, format: "decimal" as any, text: "%1)",
            alignment: "left" as any,
            style: {
              run: { size: FONT_SIZE, font: FONT_FAMILY },
              paragraph: { indent: { left: 1429, hanging: 360 } },
            },
          }],
        },
        // kbli-item: bullet "-" left=1134 hang=283 — kbli items
        {
          reference: "kbli-item",
          levels: [{
            level: 0, format: "bullet" as any, text: "-",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 1134, hanging: 283 } } },
          }],
        },
        // detail-dash: bullet "-" left=993 hang=284 — saham detail, hibah, susunan
        {
          reference: "detail-dash",
          levels: [{
            level: 0, format: "bullet" as any, text: "-",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 993, hanging: 284 } } },
          }],
        },
        // mgmt-dash: bullet "-" left=1146 hang=360 — susunan pengurus baru
        {
          reference: "mgmt-dash",
          levels: [{
            level: 0, format: "bullet" as any, text: "-",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 1146, hanging: 360 } } },
          }],
        },
        // letter-sub per shareholder (reset counter per sh)
        ...letterSubConfigs,
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: MARGIN_NORMAL, bottom: MARGIN_NORMAL, left: MARGIN_NORMAL, right: MARGIN_NORMAL },
        },
      },
      children,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const fileName = `Draft_${isCircular ? "Sirkuler" : "Notulen"}_PT_${(data.companyName || "Draft").replace(/\s+/g, "_")}.docx`;
    saveAsNative(blob, fileName);
  } catch (error) {
    console.error("docx error", error);
  }
};