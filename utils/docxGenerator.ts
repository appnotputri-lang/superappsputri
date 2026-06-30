import { Document, Packer, Paragraph, TextRun, TabStopType, AlignmentType, LeaderType, Tab, Table, TableRow, TableCell, WidthType, PageBreak, BorderStyle } from "docx";
import { CompanyData, Shareholder, Address, ManagementItem } from "../types";
import { formatFullAddressData, checkIsBadanHukum, formatPersonDetails, dateToWords, formatDateStr, formatDateRupst, formatCompanyName, formatCompanyEstablishment, formatCompanyEstablishmentOnly, formatAmendmentDeedSingle } from "../src/lib/formatter";
import { parseKbliDescription } from "../src/lib/kbliConstants";
import {
  formatCurrency,
  formatInputNumber,
  numberToWords,
  
  getDayNameIndo,
  getDayIndo,
  getMonthIndo,
  getYearIndo,
  toTitleCase,
  formatAddress,
  formatDateIndo,
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

const FONT_FAMILY = "Arial";
const FONT_SIZE = 22; // 11pt
const LINE_SPACING = 360;
const AFTER_SPACING = 0;
const MARGIN_NORMAL = 1440;

const cleanNameOfSalutation = (name: string): string => {
  if (!name) return "";
  let cleanName = name.trim();
  const cleanPrefixRegex = /^(TUAN|NYONYA|NONA|NY\.?|TN\.?|IBU|BAPAK|SDR\.?|SDRI\.?|NYONYA|TUAN)\s+/i;
  while (cleanPrefixRegex.test(cleanName)) {
    cleanName = cleanName.replace(cleanPrefixRegex, "").trim();
  }
  return cleanName;
};

const getPosRank = (pos: string | undefined): number => {
  if (!pos) return 99;
  const p = pos.trim().toUpperCase();
  if (p === "DIREKTUR UTAMA") return 1;
  if (p === "WAKIL DIREKTUR UTAMA") return 2;
  if (p === "DIREKTUR") return 3;
  if (p === "WAKIL DIREKTUR") return 4;
  if (p === "KOMISARIS UTAMA") return 5;
  if (p === "WAKIL KOMISARIS UTAMA") return 6;
  if (p === "KOMISARIS") return 7;
  return 99;
};

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

const getFormattedDateIndo = (dateStr?: string) => {
  if (!dateStr) return "...........";
  const day = getDayIndo(dateStr) || "..";
  const month = getMonthIndo(dateStr) || "........";
  const year = getYearIndo(dateStr) || "....";
  return `${day} ${month} ${year}`;
};

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
    addr.rt && addr.rw ? `Rukun Tetangga ${addr.rt}, Rukun Warga ${addr.rw}` : "",
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
    lineRule: "auto",
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
  const w = (num: number, tipe: "shares" | "rupiah") => {
    return "";
  };
  const companyName = data.companyName.trim().toUpperCase().replace(/^(PT\b\.?|PERSEROAN\s+TERBATAS\b)\s*/gi, "").trim();

  const expandAbbreviations = (str: string) => {
    if (!str) return "";
    let res = str;
    res = res.replace(/RT\.\s*([\w.-]+)\s*RW\.\s*([\w.-]+)/gi, 'Rukun Tetangga $1, Rukun Warga $2');
    res = res.replace(/RT\s+([\w.-]+)\s*RW\s+([\w.-]+)/gi, 'Rukun Tetangga $1, Rukun Warga $2');
    res = res.replace(/RT\.\s*([\w.-]+)/gi, 'Rukun Tetangga $1');
    res = res.replace(/RW\.\s*([\w.-]+)/gi, 'Rukun Warga $1');
    res = res.replace(/\bS\.H\b\.?/gi, 'Sarjana Hukum');
    res = res.replace(/\bM\.Kn\b\.?/gi, 'Magister Kenotariatan');
    res = res.replace(/\bjl(?:n)?\.?\b/gi, "Jalan");
    res = res.replace(/\bgg\.?\b/gi, "Gang");
    return res;
  };

  const getPersonDetailCircular_text = (person: any): string => {
    if (!person) return "";
    if (checkIsBadanHukum(person)) {
      const details = formatPersonDetails(person, "", "", false, false);
      return expandAbbreviations(details);
    }
    const tglLahirHuruf = dateToWords(person.birthDate);
    const tglLahirAngka = formatDateStr(person.birthDate);
    const details = formatPersonDetails(person, tglLahirAngka, tglLahirHuruf, false, false);
    return expandAbbreviations(details);
  };

  const isExistingPerson = (name: string): boolean => {
    if (!name) return false;
    const normalized = name.trim().toUpperCase();
    
    // Check shareholders
    const inShareholders = (data.shareholders || []).some(
      s => (s.name || "").trim().toUpperCase() === normalized
    );
    if (inShareholders) return true;
    
    // Check guests
    const inGuests = (data.guests || []).some(
      g => (g.name || "").trim().toUpperCase() === normalized
    );
    if (inGuests) return true;
    
    // Check old/existing management items
    const inOldManagement = (data.oldManagementItems || []).some(
      m => (m.name || "").trim().toUpperCase() === normalized
    );
    if (inOldManagement) return true;

    // Check if proxy name matches
    const inProxies = (data.shareholders || []).some(
      s => s.isProxy && s.proxyData?.name && s.proxyData.name.trim().toUpperCase() === normalized
    );
    if (inProxies) return true;

    return false;
  };

  const findPersonDetailsByName = (name: string): any => {
    if (!name) return null;
    const targetName = name.trim().toUpperCase();

    // 1. Check data.shareholders
    const fromSh = (data.shareholders || []).find((s: any) => s.name && s.name.trim().toUpperCase() === targetName);
    if (fromSh && (fromSh.birthCity || fromSh.nik || fromSh.address?.fullAddress)) {
      return fromSh;
    }

    // 2. Check data.finalShareholders
    const fromFs = (data.finalShareholders || []).find((s: any) => s.name && s.name.trim().toUpperCase() === targetName);
    if (fromFs && (fromFs.birthCity || fromFs.nik || fromFs.address?.fullAddress)) {
      return fromFs;
    }

    // 3. Check data.guests
    const fromGuest = (data.guests || []).find((g: any) => g.name && g.name.trim().toUpperCase() === targetName);
    if (fromGuest && (fromGuest.birthCity || fromGuest.nik || fromGuest.address?.fullAddress)) {
      return fromGuest;
    }

    // 4. Check data.shareTransfersNew toDetail
    if (data.shareTransfersNew) {
      for (const t of data.shareTransfersNew) {
        if (t.toName && t.toName.trim().toUpperCase() === targetName && t.toDetail) {
          return t.toDetail;
        }
      }
    }

    // 5. Check data.managementDismissals replacedByDetail
    if (data.managementDismissals) {
      for (const d of data.managementDismissals) {
        if (d.replacedByName && d.replacedByName.trim().toUpperCase() === targetName && d.replacedByDetail) {
          return d.replacedByDetail;
        }
      }
    }

    if (fromSh) return fromSh;
    if (fromFs) return fromFs;

    return null;
  };

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
      mkP({ text: "KEPUTUSAN PARA PEMEGANG SAHAM SEBAGAI PENGGANTI", bold: true, alignment: "center", spacing: { before: 0, after: 0 } }),
      mkP({ text: "RAPAT UMUM PEMEGANG SAHAM LUAR BIASA", bold: true, alignment: "center", spacing: { before: 0, after: 0 } }),
      mkP({
        alignment: "center", spacing: { before: 0, after: 0 },
        children: [mkRun(`PT ${companyName}`, true, { underline: { type: "single" } })],
      }),
    );
  } else {
    children.push(
      mkP({ text: "NOTULEN", bold: true, alignment: "center", spacing: { before: 0, after: 0 } }),
      mkP({ text: "RAPAT UMUM PEMEGANG SAHAM LUAR BIASA", bold: true, alignment: "center", spacing: { before: 0, after: 0 } }),
      mkP({
        alignment: "center", spacing: { before: 0, after: 0 },
        children: [mkRun(`PT ${companyName}`, true, { underline: { type: "single" } })],
      }),
    );
  }

  // ── SECTION HEADERS (I. RAPAT / II. PESERTA dst.) ─────────────────────────
  // numId 15 → upperRoman bold, left=0 (per contoh: ind left=142 firstLine=0)
  const mkSection = (label: string, spacingBefore = 0, spacingAfter = 0) =>
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
    const companyEstStr = formatCompanyEstablishmentOnly(data, false);
    const hasAmendments = data.amendmentDeeds && data.amendmentDeeds.length > 0;
    
    children.push(
      mkP({ 
        text: `Kami yang bertandatangan dibawah ini, para Pemegang Saham ${formatCompanyName(data.companyName)}, berkedudukan di ${preambleDomicile}${companyEstStr}${
          hasAmendments 
            ? ", dan telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut :" 
            : ""
        }`
      })
    );

    if (hasAmendments) {
      data.amendmentDeeds!.forEach((deed) => {
        children.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", before: 60, after: 60 },
            numbering: { reference: "amendment-dash", level: 0 },
            children: [
              mkRun(formatAmendmentDeedSingle(deed, false)),
            ],
          })
        );
      });
    }

    children.push(
      mkP({ text: `untuk selanjutnya disebut ("Perseroan"), terdiri dari:` })
    );
  }

  // ── I. RAPAT (hanya NOTULEN) ──────────────────────────────────────────────
  if (!isCircular) {
    const dayName2 = getDayNameIndo(data.signingDate) || "................";
    const dateText2 = formatDateRupst(data.signingDate) || "................";
    const invDateText2 = formatDateRupst(data.invitationDate) || "................";

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
        spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
        children: [
          mkRun(`Rapat Umum Pemegang Saham Luar Biasa “`),
          mkRun(`PT. ${companyName}`, true),
          mkRun(`“ (selanjutnya disebut sebagai “`),
          mkRun(`Rapat`, true),
          mkRun(`”) perseroan yang berkedudukan di ${currentCity}, demikian berdasarkan Akta Pendirian tertanggal `),
          mkRun(formatDateRupst(data.establishmentDeedDate) || "..........", true),
          mkRun(", No. "),
          mkRun(data.establishmentDeedNumber || "..........", true),
          mkRun(", yang dibuat dihadapan "),
          mkRun(`${data.establishmentNotary || ".........."}${data.establishmentNotaryTitle ? `, ${data.establishmentNotaryTitle}` : ""}`, true),
          mkRun(`, Notaris di Kabupaten Bandung Barat dan telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal `),
          mkRun(formatDateRupst(data.establishmentSkDate) || "..........", true),
          mkRun(", Nomor "),
          mkRun(data.establishmentSkNumber || "..........", true),
          mkRun(
            !hasAmendments 
              ? "." 
              : data.amendmentDeeds!.length === 1 
                ? " dan telah mengalami perubahan berdasarkan akta sebagai berikut :" 
                : " dan telah mengalami beberapa kali perubahan berdasarkan akta-akta sebagai berikut :"
          ),
        ],
      })
    );

    // Akta perubahan → manual-dash bullet
    if (hasAmendments) {
      data.amendmentDeeds!.forEach((deed) => {
        const skSpParts = (deed.skSpDocuments || []).map((doc: any, dIdx: number) =>
          `${dIdx === 0 ? "dan " : ", serta "}${doc.type === "SK" ? "telah mendapat persetujuan dari Kementrian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal " : "telah dilaporkan ke Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal "} ${formatDateRupst(doc.date) || ".........."} Nomor ${doc.number || ".........."}`
        ).join("");

        children.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
            numbering: { reference: "deed-num", level: 0 },
            indent: { left: 426 },
            children: [
              mkRun(`Akta tertanggal ${formatDateRupst(deed.date) || ".........."} Nomor ${deed.number || ".........."}, yang dibuat di hadapan ${deed.notary || ".........."}${deed.notaryTitle ? `, ${deed.notaryTitle}` : ""}, Notaris di ${deed.notaryDomicile || data.domicile || ".........."} ${skSpParts}`),
            ],
          }),
        );
      });
    }

    children.push(
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
        children: [
          mkRun(`Rapat ini diselenggarakan berdasarkan Surat Undangan Direksi PT. ${companyName} nomor `),
          mkRun(data.invitationNumber || "[nomor surat]", false, { highlight: data.invitationNumber ? undefined : "yellow" }),
          mkRun(" tanggal "),
          mkRun(data.invitationDate ? invDateText2 : "[tanggal surat]", false, { highlight: data.invitationDate ? undefined : "yellow" }),
          mkRun(`, dan diadakan pada ${dayName2} tanggal, ${dateText2} bertempat di ${data.signingPlace || "................"}, pukul `),
          mkRun(data.meetingStartTime ? data.meetingStartTime.replace(':', '.') : "00.00", false, { highlight: data.meetingStartTime ? undefined : "yellow" }),
          mkRun(" WIB."),
        ],
      })
    );

    // Now Section II. PESERTA RAPAT
    children.push(
      new Paragraph({
        alignment: "left" as any,
        spacing: { before: 0, after: 0 },
        children: [mkRun("II. PESERTA RAPAT", true)],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
        children: [mkRun("Rapat tersebut dihadiri oleh:")],
      })
    );
  }

  // Hitung saham dan persiapkan data peserta
  const attendingShareholders = isCircular
    ? data.shareholders.filter((sh) => (sh.sharesOwned || 0) > 0)
    : data.shareholders.filter((sh) => sh.isPresent);
  const totalIssuedShares = data.shareholders.reduce((sum, sh) => sum + (sh.sharesOwned || 0), 0);
  const presentShares = attendingShareholders.reduce((sum, sh) => sum + (sh.sharesOwned || 0), 0);
  const attendingPercentage = totalIssuedShares > 0 ? (presentShares / totalIssuedShares) * 100 : 0;

  // Listing peserta
  const getDisplayNameForDocx = (person: any) => {
    let name = (person.name || "................").toUpperCase();
    while (/^(PT\b\.?|PERSEROAN\s+TERBATAS\b)\s*/i.test(name)) {
      name = name.replace(/^(PT\b\.?|PERSEROAN\s+TERBATAS\b)\s*/i, "").trim();
    }
    return cleanNameOfSalutation(name);
  };

  interface PhysicalAttendee {
    type: 'PERSON' | 'ENTITY_DIRECT';
    name: string;
    salutation: string;
    sourceObj: any;
    ownShares: { sharesOwned: number; shareholder: Shareholder } | null;
    management: { position: string } | null;
    representations: { sharesOwned: number; shareholder: Shareholder; proxyData: any }[];
  }

  const attendees: PhysicalAttendee[] = [];

  attendingShareholders.forEach(sh => {
    if (sh.isProxy && sh.proxyData) {
      const pxName = (sh.proxyData.name || "").trim();
      let att = attendees.find(a => a.name.toUpperCase() === pxName.toUpperCase());
      if (!att) {
        att = {
          type: 'PERSON',
          name: pxName,
          salutation: sh.proxyData.salutation || "Tuan",
          sourceObj: sh.proxyData,
          ownShares: null,
          management: null,
          representations: []
        };
        attendees.push(att);
      }
      att.representations.push({
        sharesOwned: sh.sharesOwned || 0,
        shareholder: sh,
        proxyData: sh.proxyData
      });
    } else {
      const shName = (sh.name || "").trim();
      if (checkIsBadanHukum(sh)) {
        attendees.push({
          type: 'ENTITY_DIRECT',
          name: shName,
          salutation: '',
          sourceObj: sh,
          ownShares: sh.sharesOwned > 0 ? {
            sharesOwned: sh.sharesOwned || 0,
            shareholder: sh
          } : null,
          management: sh.isManagement ? { position: sh.managementPosition || "Direktur" } : null,
          representations: []
        });
      } else {
        let att = attendees.find(a => a.name.toUpperCase() === shName.toUpperCase());
        if (!att) {
          att = {
            type: 'PERSON',
            name: shName,
            salutation: sh.salutation || "Tuan",
            sourceObj: sh,
            ownShares: sh.sharesOwned > 0 ? {
              sharesOwned: sh.sharesOwned || 0,
              shareholder: sh
            } : null,
            management: sh.isManagement ? { position: sh.managementPosition || "Direktur" } : null,
            representations: []
          };
          attendees.push(att);
        } else {
          if (sh.sharesOwned > 0) {
            att.ownShares = {
              sharesOwned: sh.sharesOwned || 0,
              shareholder: sh
            };
          }
          if (sh.isManagement) {
            att.management = { position: sh.managementPosition || "Direktur" };
          }
        }
      }
    }
  });

  // Apply management role lookups for physical persons
  attendees.forEach(att => {
    if (att.type === 'PERSON' && !att.management) {
      const pxNameUpper = att.name.toUpperCase().trim();
      const matchedMgmt = data.shareholders.find(s => s.name.toUpperCase().trim() === pxNameUpper && s.isManagement);
      if (matchedMgmt) {
        att.management = { position: matchedMgmt.managementPosition || "Direktur" };
      }
      if (!att.management && data.newManagementItems) {
        const matchedMgmtNew = data.newManagementItems.find(m => m.name.toUpperCase().trim() === pxNameUpper);
        if (matchedMgmtNew) {
          att.management = { position: matchedMgmtNew.position };
        }
      }
      if (!att.management && data.oldManagementItems) {
        const matchedMgmtOld = data.oldManagementItems.find(m => m.name.toUpperCase().trim() === pxNameUpper);
        if (matchedMgmtOld) {
          att.management = { position: matchedMgmtOld.position };
        }
      }
    }
  });

  // Sort attendees by management role to ensure Direktur Utama is first
  attendees.sort((a, b) => {
    const getRank = (att: PhysicalAttendee) => {
      const pos = (att.management?.position || "").toLowerCase();
      if (pos.includes("direktur utama")) return 1;
      if (pos.includes("direktur")) return 2;
      return 3;
    };
    return getRank(a) - getRank(b);
  });

  if (isCircular) {
    attendees.forEach((att, idx) => {
      const isBadanHukum = att.type === 'ENTITY_DIRECT';
      
      let details = "";
      if (isBadanHukum) {
        details = formatPersonDetails(att.sourceObj, "", "", false, false);
      } else {
        const tglAngka = att.sourceObj.birthDate ? formatDateStr(att.sourceObj.birthDate) : "...";
        const tglHuruf = att.sourceObj.birthDate ? dateToWords(att.sourceObj.birthDate) : "...";
        details = formatPersonDetails(att.sourceObj, tglAngka, tglHuruf, false, false);
      }

      const cleanPrefixRegex = /^(TUAN|NYONYA|NONA|NY|TN|NY\.|TN\.|NYONYA\.|TUAN\.)\s+/i;
      let displayName = att.name.toUpperCase();
      while (cleanPrefixRegex.test(displayName)) {
        displayName = displayName.replace(cleanPrefixRegex, "").trim();
      }

      // Circular: decimal numbering
      children.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, lineRule: "auto", after: 0 },
          numbering: { reference: "peserta-num", level: 0 },
          children: [
            mkRun(isBadanHukum ? "" : `${att.salutation} `),
            mkRun(displayName, true),
            mkRun(details + ";"),
          ],
        })
      );

      // Sub bullets "Selaku pemilik/pemegang shares..."
      const totalSub = (att.ownShares ? 1 : 0) + att.representations.length;

      if (totalSub === 1) {
        if (att.ownShares) {
          const parValue = data.originalSharePrice || 0;
          const currentShares = att.ownShares.sharesOwned || 0;
          const currentValue = currentShares * parValue;
          children.push(
            mkP({
              numbering: { reference: "sh-dash", level: 0 },
              indent: { left: INDENT_STEP },
              spacing: { before: 60, after: 120 },
              children: [
                mkRun("Selaku pemilik dan pemegang saham sebanyak "),
                mkRun(currentShares.toLocaleString("id-ID"), true),
                mkRun(`${w(currentShares, "shares")} lembar saham atau senilai `),
                mkRun(formatRpDot(currentValue), true),
                mkRun(`${w(currentValue, "rupiah")}.`),
              ],
            })
          );
        } else {
          const r = att.representations[0];
          const isDirector = r.proxyData.representationType === 'DIREKTUR_PT_LAIN';
          const parValue = data.originalSharePrice || 0;
          const currentShares = r.sharesOwned || 0;
          const currentValue = currentShares * parValue;

          let runs: any[] = [];
          if (isDirector) {
            const isAsing = r.shareholder.isForeign || r.shareholder.nationalityType === "WNA";
            const isKoperasiOrYayasanOrCV = /^(KOPERASI|YAYASAN|CV\b)/i.test(r.shareholder.name || "");
            
            let entityPrefix = "PT ";
            if (isAsing || isKoperasiOrYayasanOrCV) {
              entityPrefix = "";
            }
            const shDetails = formatPersonDetails(r.shareholder, "", "", false, false);
            const repName = `${entityPrefix}${getDisplayNameForDocx(r.shareholder)}`;
            
            runs = [
              mkRun("Direktur "),
              mkRun(repName, true),
              mkRun(shDetails),
              mkRun(", Selaku pemilik dan pemegang saham sebanyak "),
              mkRun(currentShares.toLocaleString("id-ID"), true),
              mkRun(`${w(currentShares, "shares")} lembar saham atau senilai `),
              mkRun(formatRpDot(currentValue), true),
              mkRun(`${w(currentValue, "rupiah")}.`),
            ];
          } else {
            const proxyDate = r.proxyData.proxyDeedDate ? formatDateRupst(r.proxyData.proxyDeedDate) : "__________";
            const repText = `Selaku kuasa dari ${r.shareholder.salutation || "Tuan"} ${getDisplayNameForDocx(r.shareholder)}${formatPersonDetails(r.shareholder, "", "", false, false)} berdasarkan surat kuasa tertanggal ${proxyDate}`;
            runs = [
              mkRun(`${repText}, yang dalam hal ini selaku pemilik dan pemegang `),
              mkRun(currentShares.toLocaleString("id-ID"), true),
              mkRun(`${w(currentShares, "shares")} lembar saham atau senilai `),
              mkRun(formatRpDot(currentValue), true),
              mkRun(`${w(currentValue, "rupiah")}.`),
            ];
          }

          children.push(
            mkP({
              numbering: { reference: "sh-dash", level: 0 },
              indent: { left: INDENT_STEP },
              spacing: { before: 60, after: 120 },
              children: runs,
            })
          );
        }
      } else if (totalSub > 1) {
        if (att.ownShares) {
          const parValue = data.originalSharePrice || 0;
          const currentShares = att.ownShares.sharesOwned || 0;
          const currentValue = currentShares * parValue;

          children.push(
            mkP({
              numbering: { reference: "sh-dash", level: 0 },
              indent: { left: INDENT_STEP },
              spacing: { before: 60, after: 60 },
              children: [
                mkRun("Selaku pemilik dan pemegang saham sebanyak "),
                mkRun(currentShares.toLocaleString("id-ID"), true),
                mkRun(`${w(currentShares, "shares")} lembar saham atau senilai `),
                mkRun(formatRpDot(currentValue), true),
                mkRun(`${w(currentValue, "rupiah")};`),
              ]
            })
          );
        }

        att.representations.forEach(r => {
          const isDirector = r.proxyData.representationType === 'DIREKTUR_PT_LAIN';
          const parValue = data.originalSharePrice || 0;
          const currentShares = r.sharesOwned || 0;
          const currentValue = currentShares * parValue;

          let runs: any[] = [];
          if (isDirector) {
            const isAsing = r.shareholder.isForeign || r.shareholder.nationalityType === "WNA";
            const isKoperasiOrYayasanOrCV = /^(KOPERASI|YAYASAN|CV\b)/i.test(r.shareholder.name || "");
            
            let entityPrefix = "PT ";
            if (isAsing || isKoperasiOrYayasanOrCV) {
              entityPrefix = "";
            }
            const shDetails = formatPersonDetails(r.shareholder, "", "", false, false);
            const repName = `${entityPrefix}${getDisplayNameForDocx(r.shareholder)}`;
            
            runs = [
              mkRun("Direktur "),
              mkRun(repName, true),
              mkRun(shDetails),
              mkRun(", Selaku pemilik dan pemegang saham sebanyak "),
              mkRun(currentShares.toLocaleString("id-ID"), true),
              mkRun(`${w(currentShares, "shares")} lembar saham atau senilai `),
              mkRun(formatRpDot(currentValue), true),
              mkRun(`${w(currentValue, "rupiah")};`),
            ];
          } else {
            const proxyDate = r.proxyData.proxyDeedDate ? formatDateRupst(r.proxyData.proxyDeedDate) : "__________";
            const repText = `Selaku kuasa dari ${r.shareholder.salutation || "Tuan"} ${getDisplayNameForDocx(r.shareholder)}${formatPersonDetails(r.shareholder, "", "", false, false)} berdasarkan surat kuasa tertanggal ${proxyDate}`;
            runs = [
              mkRun(`${repText}, yang dalam hal ini selaku pemilik dan pemegang `),
              mkRun(currentShares.toLocaleString("id-ID"), true),
              mkRun(`${w(currentShares, "shares")} lembar saham atau senilai `),
              mkRun(formatRpDot(currentValue), true),
              mkRun(`${w(currentValue, "rupiah")};`),
            ];
          }

          children.push(
            mkP({
              numbering: { reference: "sh-dash", level: 0 },
              indent: { left: INDENT_STEP },
              spacing: { before: 60, after: 60 },
              children: runs,
            })
          );
        });
      }
    });
  } else {
    // Notulen: 1., 2. list — sub-letters a., b. reset per shareholder
    attendees.forEach((att, idx) => {
      const isBadanHukum = att.type === 'ENTITY_DIRECT';
      
      let details = "";
      if (isBadanHukum) {
        details = formatPersonDetails(att.sourceObj, "", "", false, true);
      } else {
        const tglAngka = att.sourceObj.birthDate ? formatDateStr(att.sourceObj.birthDate) : "...";
        const tglHuruf = att.sourceObj.birthDate ? dateToWords(att.sourceObj.birthDate) : "...";
        details = formatPersonDetails(att.sourceObj, tglAngka, tglHuruf, false, true);
      }

      const cleanPrefixRegex = /^(TUAN|NYONYA|NONA|NY|TN|NY\.|TN\.|NYONYA\.|TUAN\.)\s+/i;
      let displayName = att.name.toUpperCase();
      while (cleanPrefixRegex.test(displayName)) {
        displayName = displayName.replace(cleanPrefixRegex, "").trim();
      }

      // Decimal number index (1. Tuan RENDY)
      children.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, lineRule: "auto", after: 60 },
          numbering: { reference: "peserta-num", level: 0 },
          children: [
            mkRun(isBadanHukum ? "" : `${att.salutation} `),
            mkRun(displayName, true),
            mkRun(details + ";"),
          ],
        })
      );

      // Dash bullet "Dalam hal ini hadir selaku :"
      children.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, lineRule: "auto", before: 60, after: 60 },
          numbering: { reference: "hadir-dash", level: 0 },
          children: [
            mkRun("Dalam hal ini hadir selaku :"),
          ],
        })
      );

      const isUndangan = !att.management && !att.ownShares && att.representations.length === 0;

      if (isUndangan) {
        children.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 120 },
            numbering: { reference: "detail-dash", level: 0 },
            children: [
              mkRun("Undangan Rapat."),
            ],
          })
        );
      } else {
        // Sub letters code reset
        let shLetterCode = 97; // reset 'a' for each shareholder
        const getNextShLetter = () => {
          const char = String.fromCharCode(shLetterCode);
          shLetterCode++;
          return char;
        };

        // management position
        if (att.management) {
          const letter = getNextShLetter();
          const suffix = (att.ownShares || att.representations.length > 0) ? "; dan" : ";";
          children.push(
            new Paragraph({
              alignment: "both" as any,
              spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 60 },
              numbering: { reference: `letter-sub-${idx}`, level: 0 },
              children: [
                mkRun(`selaku ${toTitleCase(att.management.position || "Direktur")} Perseroan${suffix}`),
              ],
            })
          );
        }

        // own shares
        if (att.ownShares) {
          const letter = getNextShLetter();
          const parValue = data.originalSharePrice || 0;
          const currentShares = att.ownShares.sharesOwned || 0;
          const currentValue = currentShares * parValue;

          children.push(
            new Paragraph({
              alignment: "both" as any,
              spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 120 },
              numbering: { reference: `letter-sub-${idx}`, level: 0 },
              children: [
                mkRun("selaku Pemilik dan pemegang saham sebanyak "),
                mkRun(currentShares.toLocaleString("id-ID"), true),
                mkRun(`${w(currentShares, "shares")} lembar saham atau senilai `),
                mkRun(formatRpDot(currentValue), true),
                mkRun(`${w(currentValue, "rupiah")} berhak mengeluarkan suara `),
                mkRun(currentShares.toLocaleString("id-ID"), true),
                mkRun(`${w(currentShares, "shares")} suara dalam rapat.`),
              ],
            })
          );
        }

        // representations (proxy / director PT lain)
        att.representations.forEach(r => {
          const letter = getNextShLetter();
          const isDirector = r.proxyData.representationType === 'DIREKTUR_PT_LAIN';
          const parValue = data.originalSharePrice || 0;
          const currentShares = r.sharesOwned || 0;
          const currentValue = currentShares * parValue;

          let repTextRuns: any[] = [];
          if (isDirector) {
            // selaku Direktur dari PT ... [and legal details]
            repTextRuns.push(
              mkRun(`selaku Direktur dari `),
              mkRun(`PT ${getDisplayNameForDocx(r.shareholder)}`, true),
              mkRun(formatPersonDetails(r.shareholder, "", "", false, true))
            );
          } else {
            const proxyDate = r.proxyData.proxyDeedDate ? formatDateRupst(r.proxyData.proxyDeedDate) : "__________";
            repTextRuns.push(
              mkRun(`selaku penerima kuasa berdasarkan Surat Kuasa tertanggal ${proxyDate}, dari dan oleh karena itu sah bertindak untuk dan atas nama `),
              mkRun(`${r.shareholder.salutation || "Tuan"} ${getDisplayNameForDocx(r.shareholder)}`, true),
              mkRun(formatPersonDetails(r.shareholder, "", "", false, true))
            );
          }

          children.push(
            new Paragraph({
              alignment: "both" as any,
              spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 60 },
              numbering: { reference: `letter-sub-${idx}`, level: 0 },
              children: [
                ...repTextRuns,
                mkRun(`, yang dalam hal ini merupakan pemilik dan pemegang saham sebanyak `),
                mkRun(currentShares.toLocaleString("id-ID"), true),
                mkRun(`${w(currentShares, "shares")} lembar saham atau senilai `),
                mkRun(formatRpDot(currentValue), true),
                mkRun(`${w(currentValue, "rupiah")} berhak mengeluarkan suara `),
                mkRun(currentShares.toLocaleString("id-ID"), true),
                mkRun(`${w(currentShares, "shares")} suara dalam rapat.`),
              ],
            })
          );
        });
      }
    });
  }

  // Rekapitulasi saham hadir
  const totalValue = presentShares * (data.originalSharePrice || 0);
  children.push(
    new Paragraph({
      alignment: "both" as any,
      spacing: { line: LINE_SPACING, lineRule: "auto", before: 120, after: 120 },
      children: [
        mkRun(
          isCircular
            ? "Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak "
            : `Bahwa dari semua saham yang telah dikeluarkan, ditempatkan dan disetor tersebut di atas, yaitu sebanyak ${totalIssuedShares.toLocaleString("id-ID")}${w(totalIssuedShares, "shares")} lembar saham, telah hadir dan/atau diwakili dalam rapat ini sebanyak `,
        ),
        mkRun(presentShares.toLocaleString("id-ID"), true),
        mkRun(`${w(presentShares, "shares")} lembar saham atau senilai `),
        mkRun(formatRpDot(totalValue), true),
        mkRun(
          `${w(totalValue, "rupiah")}${
            !isCircular
              ? ` atau setara dengan ${attendingPercentage === 100 ? "100%" : `${attendingPercentage.toFixed(2)}%`} dari seluruh saham yang telah dikeluarkan oleh Perseroan`
              : ""
          }.`,
        ),
      ],
    }),
  );

  // "Para Pemegang Saham" → dash bullet
  if (isCircular) {
    children.push(
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
        numbering: { reference: "para-dash", level: 0 },
        children: [
          mkRun("Untuk selanjutnya secara bersama-sama disebut sebagai "),
          mkRun("\u201CPara Pemegang Saham\u201D", true),
        ],
      }),
    );
  }

  // ── CIRCULAR extra ────────────────────────────────────────────────────────
  if (isCircular) {
    children.push(
      mkP({ text: "DENGAN INI MENYATAKAN, bahwa Para Pemegang Saham telah mengetahui mengenai :", bold: true, spacing: { before: 0, after: 0 } }),
      mkP({ numbering: { reference: "res-num", level: 0 }, text: `Bahwa sampai saat ini jumlah saham yang telah ditempatkan dan disetor penuh dalam perseroan sebanyak ${data.originalTotalShares.toLocaleString("id-ID")}${w(data.originalTotalShares, "shares")} lembar saham;`, spacing: { before: 0, after: 0 } }),
      mkP({ numbering: { reference: "res-num", level: 0 }, text: "Bahwa sesuai dengan ketentuan Pasal 91 Undang-Undang No. 40 Tahun 2007 tentang Perseroan Terbatas, pemegang saham dapat mengambil keputusan yang mengikat di luar Rapat Umum Pemegang Saham dengan syarat semua pemegang saham dengan hak suara menyetujui secara tertulis dengan menandatangani usul yang bersangkutan;", spacing: { before: 0, after: 0 } }),
      mkP({ numbering: { reference: "res-num", level: 0 }, text: `Bahwa maksud dari Keputusan Sirkuler Para Pemegang Saham ini adalah untuk ${getResolutionSummary()} Perseroan.`, spacing: { before: 0, after: 0 } }),
      mkP({
        spacing: { before: 0, after: 0 },
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
        spacing: { before: 0, after: 0 },
        children: [mkRun("III. KETUA RAPAT", true)],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
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
        spacing: { before: 0, after: 0 },
        children: [mkRun("IV. AGENDA RAPAT", true)],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
        children: [mkRun("Rapat ini diadakan dengan agenda rapat sebagai berikut :")],
      })
    );

    const agendaItems = getAgendaItems();
    if (agendaItems.length > 0) {
      agendaItems.forEach((item, idx) => {
        children.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
            numbering: { reference: "agenda-dash", level: 0 },
            children: [
              mkRun(item),
            ],
          }),
        );
      });
    } else {
      children.push(
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
          numbering: { reference: "agenda-dash", level: 0 },
          children: [
            mkRun("Persetujuan Perubahan Susunan Pengurus Perseroan;"),
          ],
        }),
      );
    }

    // ── V. JALANNYA RAPAT ────────────────────────────────────────────────
    children.push(
      new Paragraph({
        alignment: "left" as any,
        spacing: { before: 0, after: 0 },
        children: [mkRun("V. JALANNYA RAPAT", true)],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, lineRule: "auto", after: 120 },
        children: [
          mkRun(`Ketua Rapat menyatakan bahwa dalam Rapat ini telah hadir dan/atau diwakili sebanyak ${presentShares.toLocaleString("id-ID")}${w(presentShares, "shares")} saham yang merupakan ${attendingPercentage === 100 ? "seluruh" : `${attendingPercentage.toFixed(2)}%`} dari total seluruh saham yang telah dikeluarkan oleh Perseroan.`),
        ],
      }),
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, lineRule: "auto", after: 120 },
        children: [
          mkRun("Oleh karena itu, Ketua Rapat menyatakan Rapat ini sah dan berhak mengambil keputusan yang sah dan mengikat Perseroan mengenai hal-hal yang dibicarakan dalam Rapat."),
        ],
      }),
    );
  }

  // ── VI. KEPUTUSAN-KEPUTUSAN ──────�    if (isCircular) {
  // ── VI. KEPUTUSAN-KEPUTUSAN ─────────────────────────────────────────────
  const resLabel = isCircular ? "KEPUTUSAN-KEPUTUSAN" : "VI. KEPUTUSAN-KEPUTUSAN";
  children.push(
    new Paragraph({
      alignment: "left" as any,
      spacing: { before: 0, after: 0 },
      children: [mkRun(resLabel, true)],
    }),
  );

  if (!isCircular) {
    children.push(
      new Paragraph({
        alignment: "both" as any,
        spacing: { line: LINE_SPACING, lineRule: "auto", after: AFTER_SPACING },
        children: [
          mkRun(
            "Oleh karena agenda rapat telah diketahui dan dipahami sepenuhnya oleh para hadirin, maka setelah memberikan penjelasan-penjelasan yang diperlukan sehubungan dengan rapat ini, ketua rapat langsung saja mengusulkan kepada rapat untuk mengambil keputusan-keputusan dan selanjutnya, Rapat dengan suara bulat memutuskan dan menetapkan sebagai berikut :"
          ),
        ],
      }),
    );
  }

  let resolutionIdx = 1;

  // Helper: body → indent left=426
  const addRes = (arg1: string | any[], arg2?: any[]) => {
    const body = Array.isArray(arg1) ? arg1 : arg2;
    if (body) {
      body.forEach((p) => children.push(p));
    }
    resolutionIdx++;
  };

  const bodyP = (opts: {
    children?: any[]; text?: string;
    indent?: { left?: number; hanging?: number };
    spacing?: { before?: number; after?: number };
    numbering?: { reference: string; level: number };
    alignment?: string;
    tabStops?: any[];
    bold?: boolean;
  }) => new Paragraph({
    alignment: (opts.alignment || "both") as any,
    spacing: { line: LINE_SPACING, lineRule: "auto", after: opts.spacing?.after ?? AFTER_SPACING, before: opts.spacing?.before ?? 0 },
    indent: opts.indent,
    numbering: opts.numbering,
    children: opts.children ?? [mkRun(opts.text ?? "", opts.bold)],
    tabStops: opts.tabStops,
  });

  if (isCircular) {
    // 1. Pengambilan Keputusan Sirkuler
    addRes([
      bodyP({
        numbering: { reference: "keputusan-num", level: 0 },
        text: `Pengambilan keputusan para pemegang saham dengan keputusan sirkuler para pemegang saham yang mempunyai kekuatan hukum yang sama dengan suatu keputusan yang diambil dalam Rapat Umum Pemegang Saham (“RUPS”).`,
        spacing: { after: 120 }
      })
    ]);

    // 2. Perubahan Nama & Kedudukan (Pasal 1)
    if (data.resolutions.companyNameChange || data.resolutions.domicile) {
      const isName = data.resolutions.companyNameChange;
      const isDomicile = data.resolutions.domicile;
      const isBoth = isName && isDomicile;

      const oldName = formatCompanyName(data.companyName);
      const newName = formatCompanyName(data.targetCompanyName || data.companyName);
      const oldDomicile = data.domicile || "..........";
      const newDomicile = data.newAddress?.city || "..........";

      const resBlocks: any[] = [];

      if (isName) {
        resBlocks.push(bodyP({
          numbering: { reference: "keputusan-num", level: 0 },
          text: `Menyetujui dan memutuskan untuk mengubah nama Perseroan, yang semula bernama : ${oldName} menjadi bernama ${newName}.`
        }));
      }

      if (isDomicile) {
        const textPrefix = isBoth ? "Serta memutuskan" : "Menyetujui dan memutuskan";
        const numbering = isBoth ? undefined : { reference: "keputusan-num", level: 0 };
        const indent = isBoth ? { left: 426 } : undefined;
        resBlocks.push(bodyP({
          numbering,
          indent,
          text: `${textPrefix} untuk mengubah tempat kedudukan Perseroan, yang semula berkedudukan di ${oldDomicile} menjadi berkedudukan di ${newDomicile}.`
        }));
      }

      let subject = "Nama dan Tempat Kedudukan Perseroan";
      if (isName && !isDomicile) subject = "Nama Perseroan";
      if (!isName && isDomicile) subject = "Tempat Kedudukan Perseroan";

      resBlocks.push(bodyP({
        indent: { left: 426 },
        text: `Sehingga mengubah ketentuan Pasal 1 ayat (1) Anggaran Dasar Perseroan mengenai ${subject}, sehingga selanjutnya menjadi berbunyi sebagai berikut :`
      }));

      // Banner Pasal 1 - Tab Line Leader
      resBlocks.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: "\t", font: FONT_FAMILY, size: FONT_SIZE }),
          new TextRun({ text: " Pasal 1 ", bold: true, font: FONT_FAMILY, size: FONT_SIZE }),
          new TextRun({ text: "\t", font: FONT_FAMILY, size: FONT_SIZE }),
        ],
        tabStops: [
          { type: TabStopType.CENTER, position: 4513, leader: LeaderType.HYPHEN },
          { type: TabStopType.RIGHT, position: 9026, leader: LeaderType.HYPHEN },
        ]
      }));
      // Article 1 Content
      const finalName = formatCompanyName(newName);
      const finalDomicile = toTitleCase(newDomicile);
      
      resBlocks.push(bodyP({
        numbering: { reference: "kbli-sub", level: 0 },
        children: [
          mkRun("Perseroan ini bernama "),
          mkRun(`"${finalName}"`, true),
          mkRun(` (selanjutnya dalam Anggaran Dasar ini cukup disebut dengan “Perseroan”), berkedudukan di `),
          mkRun(finalDomicile, true),
          mkRun(`.`),
        ]
      }));

      addRes(resBlocks);
    }

    // Standalone Address Change
    if (data.resolutions.address) {
      addRes([
        bodyP({
          numbering: { reference: "keputusan-num", level: 0 },
          children: [
            mkRun("Menyetujui dan memutuskan untuk mengubah alamat lengkap Perseroan, yang semula beralamat di "),
            mkRun(expandAbbreviations(formatAddress(formatFullAddressData(data.oldAddress)))),
            mkRun(" menjadi beralamat di "),
            mkRun(expandAbbreviations(formatAddress(formatFullAddressData(data.newAddress)))),
            mkRun("."),
          ]
        })
      ]);
    }

    // 3. KBLI/Maksud dan Tujuan (Pasal 3)
    if (data.resolutions.kbli) {
      const kbliBody: any[] = [
        bodyP({
          numbering: { reference: "keputusan-num", level: 0 },
          text: "Menyetujui dan memutuskan untuk mengubah ketentuan Pasal 3 ayat (1) dan ayat (2) Anggaran Dasar Perseroan mengenai Maksud dan Tujuan serta Kegiatan Usaha, sehingga selanjutnya menjadi berbunyi sebagai berikut :"
        }),
        bodyP({
          numbering: { reference: "kbli-sub-1", level: 0 },
          text: "Maksud dan Tujuan Perseroan adalah berusaha dalam bidang :",
        })
      ];

      const categories = Array.from(new Set((data.kbliItems || []).map((k: any) => k.categoryName))).filter(Boolean) as string[];
      categories.forEach((cat) => {
        kbliBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", after: 60 },
            numbering: { reference: "kbli-item", level: 0 },
             children: [
              mkRun(cat.toUpperCase()),
            ],
          })
        );
      });

      kbliBody.push(
        bodyP({
          numbering: { reference: "kbli-sub-2", level: 0 },
          text: "Untuk mencapai maksud dan tujuan tersebut diatas, perseroan dapat melaksanakan kegiatan usaha sebagai berikut :",
        })
      );

      (data.kbliItems || []).forEach((kbli: any) => {
        kbliBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", after: 60 },
            numbering: { reference: "kbli-item", level: 0 },
             children: [
              mkRun(`${kbli.code} - ${kbli.name};`, true),
            ],
          })
        );

        if (kbli.description) {
          const parsedLines = parseKbliDescription(kbli.description);
          parsedLines.forEach((line) => {
            if (line.isBullet) {
              kbliBody.push(
                new Paragraph({
                  alignment: "both" as any,
                  spacing: { line: LINE_SPACING, lineRule: "auto" },
                  indent: { left: 1134 + 283, hanging: 283 },
                  children: [
                    mkRun("-\t"),
                    mkRun(line.text),
                  ],
                  tabStops: [{ type: TabStopType.LEFT, position: 1134 + 283 }]
                })
              );
            } else {
              kbliBody.push(
                new Paragraph({
                  alignment: "both" as any,
                  spacing: { line: LINE_SPACING, lineRule: "auto" },
                  indent: { left: 1134 },
                  children: [
                    mkRun(line.text),
                  ],
                })
              );
            }
          });
        }
      });

      addRes("Persetujuan Perubahan Maksud dan Tujuan Perseroan", kbliBody);
    }

    // 4. Modal Dasar (Modal Dasar)
    if (data.resolutions.capitalBase || data.resolutions.capitalBaseDecrease) {
      const isIncrease = data.resolutions.capitalBase;
      const oldBase = data.originalCapitalBase;
      const newBase = data.targetCapitalBase;
      const oldShares = data.originalAuthorizedShares;
      const newShares = data.originalSharePrice > 0 ? data.targetCapitalBase / data.originalSharePrice : 0;
      
      addRes(
        isIncrease ? "Persetujuan Peningkatan Modal Dasar Perseroan" : "Persetujuan Penurunan Modal Dasar Perseroan",
        [
          bodyP({
            indent: { left: 426 },
            text: `Menyetujui untuk ${isIncrease ? "meningkatkan" : "menurunkan"} Modal Dasar Perseroan, yang semula sebesar Rp. ${formatInputNumber(oldBase)},-${w(oldBase, "rupiah")} terbagi atas ${formatInputNumber(oldShares)}${w(oldShares, "shares")} lembar saham, masing-masing saham bernilai nominal Rp. ${formatInputNumber(data.originalSharePrice)},-${w(data.originalSharePrice, "rupiah")}, menjadi sebesar Rp. ${formatInputNumber(newBase)},-${w(newBase, "rupiah")} terbagi atas ${formatInputNumber(newShares)}${w(newShares, "shares")} lembar saham, masing-masing saham bernilai nominal Rp. ${formatInputNumber(data.originalSharePrice)},-${w(data.originalSharePrice, "rupiah")}.`
          })
        ]
      );
    }

    // 5. Modal Ditempatkan / Disetor
    if (data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) {
      const isIncrease = data.resolutions.capitalPaid;
      const oldPaid = data.originalCapitalPaid;
      const newPaid = data.targetCapitalPaid;
      const oldShares = data.originalTotalShares;
      const newShares = data.originalSharePrice > 0 ? data.targetCapitalPaid / data.originalSharePrice : 0;

      const capitalBody: any[] = [
        bodyP({
          indent: { left: 426 },
          text: `Menyetujui untuk ${isIncrease ? "meningkatkan" : "menurunkan"} Modal Ditempatkan dan Disetor dalam Perseroan, yang semula sebesar Rp. ${formatInputNumber(oldPaid)},-${w(oldPaid, "rupiah")} yang terbagi menjadi sejumlah ${formatInputNumber(oldShares)}${w(oldShares, "shares")} lembar saham, menjadi sebesar Rp. ${formatInputNumber(newPaid)},-${w(newPaid, "rupiah")} yang terbagi menjadi sejumlah ${formatInputNumber(newShares)}${w(newShares, "shares")} lembar saham.`
        })
      ];

      if (isIncrease) {
        const newDeposits = data.finalShareholders
          .map((fs) => {
            const originalFs = data.shareholders.find((s) => s.id === fs.linkedPartyId || s.name === fs.name);
            const originalShares = originalFs ? originalFs.sharesOwned : 0;
            let sharesFromTransfer = 0;
            let sharesToTransfer = 0;

            if (data.shareTransfers) {
              data.shareTransfers.forEach((t) => {
                if (t.toShareholderId === fs.id || t.toShareholderId === fs.linkedPartyId) {
                  sharesFromTransfer += t.sharesTransferred;
                }
                if (t.fromShareholderId === fs.id || t.fromShareholderId === fs.linkedPartyId) {
                  sharesToTransfer += t.sharesTransferred;
                }
              });
            }

            const expectedShares = originalShares + sharesFromTransfer - sharesToTransfer;
            const newlyDepositedShares = fs.sharesOwned - expectedShares;
            const valueRp = newlyDepositedShares * data.originalSharePrice;

            return {
              name: fs.name.toUpperCase(),
              depositedShares: newlyDepositedShares,
              valueRp,
            };
          })
          .filter((d) => d.depositedShares > 0);

        if (newDeposits.length > 0) {
          capitalBody.push(
            bodyP({
              indent: { left: 426 },
              text: `Bahwa pengeluaran saham-saham baru tersebut di atas, telah diambil bagian dan disetor penuh secara tunai melalui kas Perseroan oleh masing - masing pemegang saham dengan rincian sebagai berikut :`,
              spacing: { before: 120 }
            })
          );

          newDeposits.forEach((dep) => {
            const person = findPersonDetailsByName(dep.name);
            let boldName = dep.name.toUpperCase();
            let detailsText = "";
            if (person) {
              detailsText = formatPersonDetails(person, "", "", false, true);
              const sal = (person.salutation || "Tuan").trim();
              const salUpper = sal.toUpperCase().includes("TUAN") ? "TUAN" : sal.toUpperCase().includes("NYONYA") ? "NYONYA" : sal.toUpperCase().includes("NONA") ? "NONA" : sal;
              boldName = `${salUpper} ${cleanNameOfSalutation(dep.name.toUpperCase())}`;
            }

            capitalBody.push(
              new Paragraph({
                alignment: "both" as any,
                spacing: { line: LINE_SPACING, lineRule: "auto", before: 60, after: 60 },
                numbering: { reference: "hadir-dash", level: 0 },
                children: [
                  mkRun(boldName, true),
                  mkRun(detailsText, false),
                  mkRun(`: ${formatInputNumber(dep.depositedShares)}${w(dep.depositedShares, "shares")} lembar saham atau senilai Rp. ${formatInputNumber(dep.valueRp)},-${w(dep.valueRp, "rupiah")};`),
                ],
              })
            );
          });
        }
      }

      addRes(
        isIncrease ? "Persetujuan Peningkatan Modal Ditempatkan dan Disetor Perseroan" : "Persetujuan Penurunan Modal Ditempatkan dan Disetor Perseroan",
        capitalBody
      );
    }

    // 6. Pengalihan Saham (Hibah / Jual beli)
    const hasOrigTransfers = data.shareTransfers && data.shareTransfers.length > 0;
    const hasNTransfers = data.shareTransfersNew && data.shareTransfersNew.length > 0;

    if (data.resolutions.shareholders && (hasOrigTransfers || hasNTransfers)) {
      const transferList = hasNTransfers 
        ? data.shareTransfersNew!.map(t => ({
            fromName: t.fromName,
            toName: t.toName,
            transferType: t.transferType,
            sharesTransferred: t.sharesTransferred,
            toType: t.toType,
            toDetail: t.toDetail
          }))
        : data.shareTransfers.map(t => {
            const fromSh = data.shareholders.find((s) => s.id === t.fromShareholderId);
            const toSh = data.shareholders.find((s) => s.id === t.toShareholderId) || data.finalShareholders.find((s) => s.id === t.toShareholderId);
            return {
              fromName: fromSh?.name || ".....",
              toName: toSh?.name || ".....",
              transferType: (t.type || "Jual Beli").toLowerCase().includes("hibah") ? "HIBAH" as const : "AJB" as const,
              sharesTransferred: t.sharesTransferred,
              toType: undefined,
              toDetail: undefined
            };
          });

      const getRecipientSuffix = (t: any) => {
        if (t.toType === 'NEW' && t.toDetail) {
          const isCapitalPaidActive = data.resolutions.capitalPaid;
          const inNewDeposits = isCapitalPaidActive && (
            (data.capitalSubscriptionsNew || []).some((d: any) => d.subscriberName && d.subscriberName.trim().toUpperCase() === t.toName.toUpperCase().trim()) ||
            (data.finalShareholders || []).some((fs: any) => fs.isNewDeposit && fs.newDepositShares > 0 && fs.name && fs.name.trim().toUpperCase() === t.toName.toUpperCase().trim())
          );
          if (inNewDeposits) {
            return "";
          }
          return formatPersonDetails(t.toDetail, "", "", false, true);
        }
        return "";
      };

      const totalTransferredShares = transferList.reduce((sum, t) => sum + t.sharesTransferred, 0);
      const hasHibah = transferList.some(t => t.transferType === 'HIBAH');
      const hasJualBeli = transferList.some(t => t.transferType === 'AJB');
      
      const transferText = hasHibah && hasJualBeli ? "hibah dan jual beli" : (hasHibah ? "hibah" : "jual beli");
      
      let isEntireTransfer = false;
      const totalCompanyShares = data.originalTotalShares || 0;
      if (totalTransferredShares >= totalCompanyShares && totalCompanyShares > 0) {
        isEntireTransfer = true;
      }
      const sahamText = isEntireTransfer ? "seluruh saham" : "sebagian saham";

      const transferBody: any[] = [];

      if (transferList.length === 1) {
        const t = transferList[0];
        const valueRp = t.sharesTransferred * data.originalSharePrice;
        const typeLabel = t.transferType === 'HIBAH' ? 'hibah' : 'jual beli';

        transferBody.push(
          bodyP({
            indent: { left: 426 },
            text: `Menyetujui pengalihan saham secara ${typeLabel} ${(t.fromName || ".....").toUpperCase()} sejumlah ${formatInputNumber(t.sharesTransferred)} lembar saham perseroan atau senilai Rp. ${formatInputNumber(valueRp)},- kepada ${(t.toName || ".....").toUpperCase()}${getRecipientSuffix(t)};`
          })
        );
      } else {
        let transferTypesStr = "hibah/jual beli";
        if (hasHibah && !hasJualBeli) transferTypesStr = "hibah";
        else if (!hasHibah && hasJualBeli) transferTypesStr = "jual beli";
        else transferTypesStr = "hibah dan jual beli";

        transferBody.push(bodyP({
          indent: { left: 426 },
          text: `Menyetujui pengalihan saham-saham secara ${transferTypesStr} dengan rincian sebagai berikut :`
        }));

        transferList.forEach((t) => {
          const valueRp = t.sharesTransferred * data.originalSharePrice;
          const typeLabel = t.transferType === 'HIBAH' ? 'Hibah' : 'Jual Beli';

          transferBody.push(
            new Paragraph({
              alignment: "both" as any,
              spacing: { line: LINE_SPACING, lineRule: "auto", after: 120 },
              numbering: { reference: "hadir-dash", level: 0 },
            children: [
              mkRun((t.fromName || ".....").toUpperCase(), true),
                mkRun(` mengalihkan sejumlah ${formatInputNumber(t.sharesTransferred)} saham perseroan atau senilai Rp. ${formatInputNumber(valueRp)},- dengan cara ${typeLabel} kepada `),
                mkRun((t.toName || ".....").toUpperCase(), true),
                mkRun(getRecipientSuffix(t)),
                mkRun(";"),
              ],
            })
          );
        });
      }

      let resTitle = "Persetujuan Penjualan dan Pengalihan Saham";
      if (hasHibah && !hasJualBeli) resTitle = "Persetujuan Hibah Saham";
      else if (hasHibah && hasJualBeli) resTitle = "Persetujuan Hibah dan Penjualan Saham";
      
      addRes(resTitle, transferBody);
    }

    // 7. Susunan Pemegang Saham final
    if (data.resolutions.capitalBase || data.resolutions.capitalPaid || data.resolutions.capitalBaseDecrease || data.resolutions.capitalPaidDecrease || data.resolutions.shareholders) {
      const shBody: any[] = [
        bodyP({ indent: { left: 426 }, text: "Sehingga merubah susunan pemegang saham perseroan menjadi sebagai berikut :" }),
      ];

      data.finalShareholders.filter((s) => s.sharesOwned > 0).forEach((s) => {
        const currentValue = s.sharesOwned * (data.originalSharePrice || 0);
        shBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", after: 120 },
            numbering: { reference: "hadir-dash", level: 0 },
            tabStops: [
              { type: TabStopType.LEFT, position: 2835 },
            ],
            children: [
              mkRun((s.name || ".....").toUpperCase(), true),
              mkRun("\t: "),
              mkRun(formatInputNumber(s.sharesOwned), true),
              mkRun(`${w(s.sharesOwned, "shares")} lembar saham atau senilai `),
              mkRun(`Rp. ${formatInputNumber(currentValue)},-`, true),
              mkRun(`${w(currentValue, "rupiah")};`),
            ],
          }),
        );
      });

      addRes("Persetujuan Susunan Pemegang Saham", shBody);
    }

    // 8. Perubahan/Pengangkatan Pengurus
    if (data.resolutions.management || data.resolutions.reappointment) {
      const oldManagers = [
        ...data.shareholders.filter((s) => s.isManagement).map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
        ...(data.oldManagementItems || []),
      ];

      const hasExplicitDismissals = data.managementDismissals && data.managementDismissals.length > 0;
      const hasExplicitAppointments = data.managementAppointments && data.managementAppointments.length > 0;

      let newManagers = [];
      let managersToDismiss = [];
      let managersToAppoint = [];

      if (hasExplicitDismissals || hasExplicitAppointments) {
        if (hasExplicitDismissals) {
          managersToDismiss = data.managementDismissals.map(d => {
            const person = data.shareholders?.find(s => s.name?.toUpperCase().trim() === d.name?.toUpperCase().trim());
            return {
              ...person,
              name: d.name,
              salutation: d.salutation || "Tuan",
              position: d.position
            };
          });
        }
        if (hasExplicitAppointments) {
          managersToAppoint = data.managementAppointments.map(a => {
            const person = data.shareholders?.find(s => s.name?.toUpperCase().trim() === a.name?.toUpperCase().trim());
            return {
              ...person,
              name: a.name,
              salutation: a.salutation || "Tuan",
              position: a.position
            };
          });
        }

        const dismissedNames = new Set((data.managementDismissals || []).map(d => d.name?.toUpperCase().trim()));
        newManagers = [
          ...oldManagers.filter(om => !dismissedNames.has(om.name?.toUpperCase().trim())),
          ...managersToAppoint
        ];
      } else {
        newManagers = [
          ...(data.finalShareholders && data.finalShareholders.length > 0 ? data.finalShareholders : data.shareholders)
            .filter((s) => s.isManagement)
            .map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
          ...(data.newManagementItems || []),
        ];

        const changeType = data.managementChangeType || "ALL_DISMISSED";
        if (changeType === "PARTIAL_CHANGE") {
          managersToDismiss = oldManagers.filter(
            (om) =>
              !newManagers.some(
                (nm) =>
                  (nm.name || "").toUpperCase().trim() === (om.name || "").toUpperCase().trim() &&
                  (nm.position || "").toUpperCase().trim() === (om.position || "").toUpperCase().trim()
              )
          );
          managersToAppoint = newManagers.filter(
            (nm) =>
              !oldManagers.some(
                (om) =>
                  (om.name || "").toUpperCase().trim() === (nm.name || "").toUpperCase().trim() &&
                  (om.position || "").toUpperCase().trim() === (nm.position || "").toUpperCase().trim()
              )
          );
        } else {
          managersToDismiss = oldManagers;
          managersToAppoint = newManagers;
        }
      }

      const mgmtBody: any[] = [];

      if (data.resolutions.reappointment) {
        let oldExpiredDateStr = "16 November 2025";
        if (data.reappointmentOldExpiredDate) {
          oldExpiredDateStr = formatDateIndo(data.reappointmentOldExpiredDate);
        } else if (data.signingDate) {
          oldExpiredDateStr = formatDateIndo(data.signingDate);
        }

        mgmtBody.push(
          bodyP({
            numbering: { reference: "keputusan-num", level: 0 },
            text: `Menyetujui dan memutuskan untuk menerima kinerja pengurus perseroan yang telah habis masa jabatannya pada tanggal ${oldExpiredDateStr} serta membebaskan semua tanggung jawab selama kinerja dalam perseroan (acquit et de change), dan mengangkat kembali pengurus yaitu:`
          })
        );

        const getPriorityR = (pos: string) => {
          const p = (pos || "").toUpperCase();
          if (p.includes("DIREKTUR UTAMA") || p.includes("PRESIDEN DIREKTUR")) return 1;
          if (p.includes("DIREKTUR")) return 2;
          if (p.includes("KOMISARIS UTAMA") || p.includes("PRESIDEN KOMISARIS")) return 3;
          if (p.includes("KOMISARIS")) return 4;
          return 5;
        };
        const sortedManagersR = [...newManagers].sort((a, b) => getPriorityR(a.position) - getPriorityR(b.position));

        sortedManagersR.forEach((m) => {
          mgmtBody.push(
            new Paragraph({
              alignment: "both" as any,
              spacing: { line: LINE_SPACING, lineRule: "auto", before: 60, after: 60 },
              numbering: { reference: "hadir-dash", level: 0 },
              tabStops: [
                { type: TabStopType.LEFT, position: 3968 },
              ],
              children: [
                mkRun(toTitleCase(m.position)),
                mkRun("\t: "),
                mkRun((m.name || "..........").toUpperCase(), true),
              ],
            })
          );
        });

        let startDateStr = oldExpiredDateStr;
        if (data.reappointmentStartDate) {
          startDateStr = formatDateIndo(data.reappointmentStartDate);
        }

        let endDateStr = "16 November 2030";
        if (data.reappointmentEndDate) {
          endDateStr = formatDateIndo(data.reappointmentEndDate);
        } else {
          const baseDate = data.reappointmentStartDate || data.reappointmentOldExpiredDate || data.signingDate;
          if (baseDate) {
            const d = new Date(baseDate);
            if (!isNaN(d.getTime())) {
              d.setFullYear(d.getFullYear() + 5);
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              endDateStr = formatDateIndo(`${d.getFullYear()}-${mm}-${dd}`);
            }
          }
        }

        mgmtBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", before: 120, after: 120 },
            indent: { left: 709 },
            children: [
              mkRun(`Susunan pengurus perseroan tersebut berlaku mulai tanggal ${startDateStr} sampai dengan ${endDateStr}.`),
            ],
          })
        );
      } else {
        // Dismissal
        if (managersToDismiss.length > 0) {
          const dismissedDirs = managersToDismiss.filter(m => /direktur/i.test(m.position));
          const dismissedKoms = managersToDismiss.filter(m => /komisaris/i.test(m.position));
          const hasDir = dismissedDirs.length > 0;
          const hasKom = dismissedKoms.length > 0;

          const getPersonDetailText = (person: any): string => {
            if (!person) return "";
            const nameUpper = (person.name || "").trim().toUpperCase();
            
            // Find representative name
            let repName = "";
            if (data.authorizedRepresentativeId) {
              const allReps = (data.shareholders || []).filter((s: any) => s.isProxy || s.isManagement || s.isRepresentative);
              const rep = allReps.find((s) => s.id === data.authorizedRepresentativeId);
              if (rep && rep.name) {
                repName = rep.name.toUpperCase().trim();
              }
            } else if (data.manualRepresentative && data.manualRepresentative.name) {
              repName = data.manualRepresentative.name.toUpperCase().trim();
            }
            
            const isPenghadap = repName && nameUpper === repName;
            const isSh = (data.shareholders || []).some(
              s => (s.name || "").trim().toUpperCase() === nameUpper
            );
            
            if (isSh || isPenghadap) {
              return isPenghadap ? ", penghadap tersebut diatas" : ", tersebut diatas";
            }
            
            // Fallback to full biodata
            const details = getPersonDetailCircular_text(person);
            return details ? `, ${details}` : "";
          };

          if (hasDir && hasKom) {
            children.push(
              bodyP({
                numbering: { reference: "keputusan-num", level: 0 },
                text: `Memberhentikan dengan hormat seluruh anggota Direksi dan Dewan Komisaris Perseroan, yaitu:`,
              })
            );
            resolutionIdx++;

            mgmtBody.push(
              bodyP({ indent: { left: 426 }, text: "Direksi" })
            );

            dismissedDirs.forEach((m) => {
              mgmtBody.push(
                new Paragraph({
                  alignment: "both" as any,
                  spacing: { line: LINE_SPACING, lineRule: "auto", after: 60 },
                  numbering: { reference: "hadir-dash", level: 0 },
                  children: [
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(getPersonDetailText(m) + ";"),
                  ],
                })
              );
            });

            mgmtBody.push(
              bodyP({ indent: { left: 426 }, text: "Dewan Komisaris", spacing: { before: 120 } })
            );

            dismissedKoms.forEach((m) => {
              mgmtBody.push(
                new Paragraph({
                  alignment: "both" as any,
                  spacing: { line: LINE_SPACING, lineRule: "auto", after: 60 },
                  numbering: { reference: "hadir-dash", level: 0 },
                  children: [
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(getPersonDetailText(m) + ";"),
                  ],
                })
              );
            });
          } else if (hasDir && !hasKom) {
            if (dismissedDirs.length === 1) {
              const m = dismissedDirs[0];
              children.push(
                bodyP({
                  numbering: { reference: "keputusan-num", level: 0 },
                  children: [
                    mkRun(`Memberhentikan dengan hormat `),
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(getPersonDetailText(m)),
                    mkRun(`, dari jabatannya selaku Direktur Perseroan.`),
                  ]
                })
              );
              resolutionIdx++;
            } else {
              children.push(
                bodyP({
                  numbering: { reference: "keputusan-num", level: 0 },
                  text: `Memberhentikan dengan hormat anggota Direksi Perseroan, yaitu:`,
                })
              );
              resolutionIdx++;
              dismissedDirs.forEach((m, idx) => {
                mgmtBody.push(
                  bodyP({
                    indent: { left: 852 },
                    children: [
                      mkRun(`${idx + 1}. `),
                      mkRun(`${m.salutation || "Tuan"} `),
                      mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                      mkRun(getPersonDetailText(m) + ";"),
                    ]
                  })
                );
              });
            }
          } else if (!hasDir && hasKom) {
            if (dismissedKoms.length === 1) {
              const m = dismissedKoms[0];
              children.push(
                bodyP({
                  numbering: { reference: "keputusan-num", level: 0 },
                  children: [
                    mkRun(`Memberhentikan dengan hormat `),
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(getPersonDetailText(m)),
                    mkRun(`, dari jabatannya selaku Komisaris Perseroan.`),
                  ]
                })
              );
              resolutionIdx++;
            } else {
              children.push(
                bodyP({
                  numbering: { reference: "keputusan-num", level: 0 },
                  text: `Memberhentikan dengan hormat anggota Dewan Komisaris Perseroan, yaitu:`,
                })
              );
              resolutionIdx++;
              dismissedKoms.forEach((m, idx) => {
                mgmtBody.push(
                  bodyP({
                    indent: { left: 852 },
                    children: [
                      mkRun(`${idx + 1}. `),
                      mkRun(`${m.salutation || "Tuan"} `),
                      mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                      mkRun(getPersonDetailText(m) + ";"),
                    ]
                  })
                );
              });
            }
          }

          mgmtBody.push(
            bodyP({
              indent: { left: 426 },
              text: "dengan ucapan terima kasih atas jasa-jasa dan pengabdian yang telah diberikan selama masa jabatannya dalam Perseroan, serta memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) atas tindakan pengurusan dan pengawasan yang telah dijalankan, sepanjang tindakan-tindakan tersebut tercermin dalam buku-buku serta laporan tahunan Perseroan.",
              spacing: { before: 120 }
            })
          );
        }

        // Appointment
        if (managersToAppoint.length > 0) {
          const appointedDirs = managersToAppoint.filter(m => /direktur/i.test(m.position));
          const appointedKoms = managersToAppoint.filter(m => /komisaris/i.test(m.position));

          const getPersonDetailText = (person: any): string => {
            if (!person) return "";
            const nameUpper = (person.name || "").trim().toUpperCase();
            
            // Find representative name
            let repName = "";
            if (data.authorizedRepresentativeId) {
              const allReps = (data.shareholders || []).filter((s: any) => s.isProxy || s.isManagement || s.isRepresentative);
              const rep = allReps.find((s) => s.id === data.authorizedRepresentativeId);
              if (rep && rep.name) {
                repName = rep.name.toUpperCase().trim();
              }
            } else if (data.manualRepresentative && data.manualRepresentative.name) {
              repName = data.manualRepresentative.name.toUpperCase().trim();
            }
            
            const isPenghadap = repName && nameUpper === repName;
            const isSh = (data.shareholders || []).some(
              s => (s.name || "").trim().toUpperCase() === nameUpper
            );
            
            if (isSh || isPenghadap) {
              return isPenghadap ? ", penghadap tersebut diatas" : ", tersebut diatas";
            }
            
            // Fallback to full biodata
            const details = getPersonDetailCircular_text(person);
            return details ? `, ${details}` : "";
          };

          if (appointedDirs.length > 0 && appointedKoms.length === 0) {
            if (appointedDirs.length === 1) {
              const m = appointedDirs[0];
              const isNumbered = (managersToDismiss.length === 0);
              const runP = {
                indent: isNumbered ? undefined : { left: 426 },
                numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
                children: [
                  mkRun(`Mengangkat `),
                  mkRun(`${m.salutation || "Tuan"} `),
                  mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                  mkRun(getPersonDetailText(m)),
                  mkRun(`, sebagai ${m.position.toUpperCase()} Perseroan.`),
                ],
                spacing: { before: 120 }
              };
              if (isNumbered) {
                children.push(bodyP(runP));
                resolutionIdx++;
              } else {
                mgmtBody.push(bodyP(runP));
              }
            } else {
              const isNumbered = (managersToDismiss.length === 0);
              const runHeader = {
                indent: isNumbered ? undefined : { left: 426 },
                numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
                text: `Mengangkat anggota Direksi Perseroan, dengan rincian sebagai berikut:`,
                spacing: { before: 120 }
              };
              if (isNumbered) {
                children.push(bodyP(runHeader));
                resolutionIdx++;
              } else {
                mgmtBody.push(bodyP(runHeader));
              }
              appointedDirs.forEach((m, idx) => {
                mgmtBody.push(
                  bodyP({
                    indent: { left: 852 },
                    children: [
                      mkRun(`${idx + 1}. `),
                      mkRun(`${m.salutation || "Tuan"} `),
                      mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                      mkRun(getPersonDetailText(m)),
                      mkRun(` selaku ${m.position.toUpperCase()};`),
                    ]
                  })
                );
              });
            }
          } else if (appointedDirs.length === 0 && appointedKoms.length > 0) {
            if (appointedKoms.length === 1) {
              const m = appointedKoms[0];
              const isNumbered = (managersToDismiss.length === 0);
              const runP = {
                indent: isNumbered ? undefined : { left: 426 },
                numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
                children: [
                  mkRun(`Mengangkat `),
                  mkRun(`${m.salutation || "Tuan"} `),
                  mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                  mkRun(getPersonDetailText(m)),
                  mkRun(`, sebagai ${appointedKoms[0].position.toUpperCase()} Perseroan.`),
                ],
                spacing: { before: 120 }
              };
              if (isNumbered) {
                children.push(bodyP(runP));
                resolutionIdx++;
              } else {
                mgmtBody.push(bodyP(runP));
              }
            } else {
              const isNumbered = (managersToDismiss.length === 0);
              const runHeader = {
                indent: isNumbered ? undefined : { left: 426 },
                numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
                text: `Mengangkat anggota Dewan Komisaris Perseroan, dengan rincian sebagai berikut:`,
                spacing: { before: 120 }
              };
              if (isNumbered) {
                children.push(bodyP(runHeader));
                resolutionIdx++;
              } else {
                mgmtBody.push(bodyP(runHeader));
              }
              appointedKoms.forEach((m, idx) => {
                mgmtBody.push(
                  bodyP({
                    indent: { left: 852 },
                    children: [
                      mkRun(`${idx + 1}. `),
                      mkRun(`${m.salutation || "Tuan"} `),
                      mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                      mkRun(getPersonDetailText(m)),
                      mkRun(` selaku ${m.position.toUpperCase()};`),
                    ]
                  })
                );
              });
            }
          } else {
            const isNumbered = (managersToDismiss.length === 0);
            const runHeader = {
              indent: isNumbered ? undefined : { left: 426 },
              numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
              text: `Selanjutnya menyetujui untuk mengangkat sebagai anggota Direksi /Dewan Komisaris Perseroan yang baru:`,
              spacing: { before: 120 }
            };
            if (isNumbered) {
              children.push(bodyP(runHeader));
              resolutionIdx++;
            } else {
              mgmtBody.push(bodyP(runHeader));
            }

            managersToAppoint.forEach((m) => {
              mgmtBody.push(
                bodyP({
                  numbering: { reference: "mgmt-dash", level: 0 },
                  children: [
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(`, tersebut di atas, sebagai ${m.position} Perseroan;`),
                  ]
                })
              );
            });
          }
        }

        // Final Composition Structure
        if (managersToDismiss.length > 0 || managersToAppoint.length > 0) {
          mgmtBody.push(
            bodyP({
              indent: { left: 426 },
              text: "Sehingga susunan anggota Direksi dan Dewan Komisaris Perseroan menjadi sebagai berikut :",
              spacing: { before: 120 }
            })
          );

          const sortedManagersC = [...newManagers].sort((a, b) => getPosRank(a.position) - getPosRank(b.position));

          sortedManagersC.forEach((m) => {
            mgmtBody.push(
              new Paragraph({
                alignment: "both" as any,
                spacing: { line: LINE_SPACING, lineRule: "auto", before: 60, after: 60 },
                indent: { left: 426 },
                tabStops: [
                  { type: TabStopType.LEFT, position: 3968 },
                ],
                children: [
                  mkRun(m.position.toUpperCase()),
                  mkRun("\t: "),
                  mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()) + ";", true),
                ],
              })
            );
          });

          mgmtBody.push(
            bodyP({
              indent: { left: 426 },
              text: `Masa jabatan anggota Direksi dan Dewan Komisaris tersebut di atas berlaku efektif terhitung sejak tanggal Keputusan ini ditetapkan, ${data.managementEffectiveUntil || "untuk jangka waktu sebagaimana yang ditentukan dalam Anggaran Dasar Perseroan"}, dengan tidak mengurangi hak Rapat Umum Pemegang Saham untuk memberhentikan sewaktu-waktu sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.`,
              spacing: { before: 120 }
            })
          );
        }
      }

      addRes("Persetujuan Perubahan/Pengangkatan Pengurus", mgmtBody);
    }

    // 9. Pemberian Kuasa
    let repText = "................";
    if (data.representativeType === "EXISTING") {
      const allReps = [...data.shareholders, ...data.finalShareholders];
      const rep = allReps.find((s) => s.id === data.authorizedRepresentativeId);
      repText = `${rep?.salutation || "................"} ${cleanNameOfSalutation((rep?.name || "................").toUpperCase())}`;
    } else {
      const rep = data.manualRepresentative;
      if (rep) {
        const birthStr = `lahir di ${toTitleCase(rep.birthCity || "................")}, pada tanggal ${getDayIndo(rep.birthDate) || ".."} ${getMonthIndo(rep.birthDate) || "........"} ${getYearIndo(rep.birthDate) || "...."}`;
        repText = `${rep.salutation} ${cleanNameOfSalutation(rep.name.toUpperCase() || "................")}, ${birthStr}, ${getNationalityStr(rep)}, ${getOccupationStr(rep)}${getAddressStr(rep)}, ${getIdentificationStr(rep)}`;
      }
    }
    
    repText = expandAbbreviations(repText);

    addRes("Pemberian Kuasa", [
      bodyP({
        numbering: { reference: "keputusan-num", level: 0 },
        children: [
          mkRun("Menyetujui dan memutuskan untuk memberikan kuasa dengan hak substitusi kepada "),
          mkRun(repText, true),
          mkRun(", untuk melakukan setiap dan seluruh tindakan yang diperlukan sehubungan dengan keputusan-keputusan tersebut di atas, termasuk tetapi tidak terbatas pada menghadap dihadapan pejabat yang berwenang, memberikan keterangan-keterangan, menandatangani dokumen dan akta-akta, dan melakukan pendaftaran serta mengajukan permohonan persetujuan dan/atau menyampaikan pemberitahuan atas keputusan tersebut di atas kepada Menteri Hukum dan Hak Asasi Manusia Republik Indonesia dan instansi lain yang berwenang sesuai dengan peraturan perundang-undangan yang berlaku."),
        ]
      })
    ]);
  } else {
    // MINUTES (Non-circular) - Standard simples
    // Perubahan Nama & Kedudukan
    if (data.resolutions.companyNameChange || data.resolutions.domicile) {
      const isName = data.resolutions.companyNameChange;
      const isDomicile = data.resolutions.domicile;
      const isBoth = isName && isDomicile;

      const oldName = formatCompanyName(data.companyName);
      const newName = formatCompanyName(data.targetCompanyName || data.companyName);
      const oldDomicile = data.domicile || "..........";
      const newDomicile = data.newAddress?.city || "..........";

      const resBlocks: any[] = [];

      if (isName) {
        resBlocks.push(bodyP({
          numbering: { reference: "keputusan-num", level: 0 },
          text: `Menyetujui dan memutuskan untuk mengubah nama Perseroan, yang semula bernama : ${oldName} menjadi bernama ${newName}.`
        }));
      }

      if (isDomicile) {
        const textPrefix = isBoth ? "Serta memutuskan" : "Menyetujui dan memutuskan";
        const numbering = isBoth ? undefined : { reference: "keputusan-num", level: 0 };
        const indent = isBoth ? { left: 426 } : undefined;
        resBlocks.push(bodyP({
          numbering,
          indent,
          text: `${textPrefix} untuk mengubah tempat kedudukan Perseroan, yang semula berkedudukan di ${oldDomicile} menjadi berkedudukan di ${newDomicile}.`
        }));
      }

      let subject = "Nama dan Tempat Kedudukan Perseroan";
      if (isName && !isDomicile) subject = "Nama Perseroan";
      if (!isName && isDomicile) subject = "Tempat Kedudukan Perseroan";

      resBlocks.push(bodyP({
        indent: { left: 426 },
        text: `Sehingga mengubah ketentuan Pasal 1 ayat (1) Anggaran Dasar Perseroan mengenai ${subject}, sehingga selanjutnya menjadi berbunyi sebagai berikut :`
      }));

      // Banner Pasal 1 - Tab Line Leader
      resBlocks.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: "\t", font: FONT_FAMILY, size: FONT_SIZE }),
          new TextRun({ text: " Pasal 1 ", bold: true, font: FONT_FAMILY, size: FONT_SIZE }),
          new TextRun({ text: "\t", font: FONT_FAMILY, size: FONT_SIZE }),
        ],
        tabStops: [
          { type: TabStopType.CENTER, position: 4513, leader: LeaderType.HYPHEN },
          { type: TabStopType.RIGHT, position: 9026, leader: LeaderType.HYPHEN },
        ]
      }));

      // Article 1 Content
      const finalName = formatCompanyName(newName);
      const finalDomicile = toTitleCase(newDomicile);
      
      resBlocks.push(bodyP({
        numbering: { reference: "kbli-sub", level: 0 },
        children: [
          mkRun("Perseroan ini bernama "),
          mkRun(`"${finalName}"`, true),
          mkRun(` (selanjutnya dalam Anggaran Dasar ini cukup disebut dengan “Perseroan”), berkedudukan di `),
          mkRun(finalDomicile, true),
          mkRun(`.`),
        ]
      }));

      addRes(resBlocks);
    }

    // Perubahan Alamat (Standalone)
    if (data.resolutions.address) {
      addRes([
        bodyP({ 
          numbering: { reference: "keputusan-num", level: 0 },
          text: `Menyetujui dan memutuskan untuk mengubah alamat lengkap Perseroan, yang semula beralamat di ${formatFullAddressData(data.oldAddress, data.domicile)} menjadi beralamat di ${formatFullAddressData(data.newAddress)}.` 
        })
      ]);
    }

    // KBLI
    if (data.resolutions.kbli) {
      const kbliBody: any[] = [
        bodyP({ 
          numbering: { reference: "keputusan-num", level: 0 },
          text: "Menyetujui dan memutuskan untuk mengubah ketentuan Pasal 3 ayat (1) dan ayat (2) Anggaran Dasar Perseroan mengenai Maksud dan Tujuan serta Kegiatan Usaha, sehingga selanjutnya menjadi berbunyi sebagai berikut :" 
        }),
        bodyP({
          numbering: { reference: "kbli-sub-1", level: 0 },
          text: "Maksud dan Tujuan Perseroan adalah berusaha dalam bidang :",
        })
      ];

      // "- TRANSPORTASI DAN PENYIMPANAN"
      const categories = Array.from(new Set((data.kbliItems || []).map((k: any) => k.categoryName))).filter(Boolean) as string[];
      categories.forEach((cat) => {
        kbliBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", after: 60 },
            numbering: { reference: "kbli-item", level: 0 },
             children: [
              mkRun(cat.toUpperCase()),
            ],
          })
        );
      });

      // "2) Untuk mencapai maksud dan tujuan..."
      kbliBody.push(
        bodyP({
          numbering: { reference: "kbli-sub-2", level: 0 },
          text: "Untuk mencapai maksud dan tujuan tersebut diatas, perseroan dapat melaksanakan kegiatan usaha sebagai berikut :",
        })
      );

      // KBLI items
      (data.kbliItems || []).forEach((kbli: any) => {
        kbliBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", after: 60 },
            numbering: { reference: "kbli-item", level: 0 },
             children: [
              mkRun(`${kbli.code} - ${kbli.name};`, true),
            ],
          })
        );

        if (kbli.description) {
          const parsedLines = parseKbliDescription(kbli.description);
          parsedLines.forEach((line) => {
            if (line.isBullet) {
              kbliBody.push(
                new Paragraph({
                  alignment: "both" as any,
                  spacing: { line: LINE_SPACING, lineRule: "auto" },
                  indent: { left: 1134 + 283, hanging: 283 },
                  children: [
                    mkRun("-\t"),
                    mkRun(line.text),
                  ],
                  tabStops: [{ type: TabStopType.LEFT, position: 1134 + 283 }]
                })
              );
            } else {
              kbliBody.push(
                new Paragraph({
                  alignment: "both" as any,
                  spacing: { line: LINE_SPACING, lineRule: "auto" },
                  indent: { left: 1134 },
                  children: [
                    mkRun(line.text),
                  ],
                })
              );
            }
          });
        }
      });

      kbliBody.forEach(p => children.push(p));
      resolutionIdx++;
    }

    // Modal Dasar
    if (data.resolutions.capitalBase || data.resolutions.capitalBaseDecrease) {
      const originalShares = data.originalAuthorizedShares || 0;
      const targetShares = data.targetCapitalBase / (data.originalSharePrice || 1);
      children.push(bodyP({
        numbering: { reference: "keputusan-num", level: 0 },
        text: `Menyetujui untuk ${data.resolutions.capitalBaseDecrease ? "menurunkan" : "meningkatkan"} Modal Dasar Perseroan, yang semula sebesar Rp. ${formatInputNumber(data.originalCapitalBase)},-${w(data.originalCapitalBase, "rupiah")} terbagi atas ${formatInputNumber(originalShares)}${w(originalShares, "shares")} lembar saham, masing-masing saham bernilai nominal Rp. ${formatInputNumber(data.originalSharePrice)},-${w(data.originalSharePrice, "rupiah")}, menjadi sebesar Rp. ${formatInputNumber(data.targetCapitalBase)},-${w(data.targetCapitalBase, "rupiah")} terbagi atas ${formatInputNumber(targetShares)}${w(targetShares, "shares")} lembar saham, masing-masing saham bernilai nominal Rp. ${formatInputNumber(data.originalSharePrice)},-${w(data.originalSharePrice, "rupiah")}.`
      }));
      resolutionIdx++;
    }

    // Modal Ditempatkan & Disetor
    if (data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) {
      const originalShares = data.originalTotalShares || 0;
      const targetShares = data.targetCapitalPaid / (data.originalSharePrice || 1);
      
      children.push(bodyP({ numbering: { reference: "keputusan-num", level: 0 }, text: `Menyetujui untuk ${data.resolutions.capitalPaidDecrease ? "menurunkan" : "meningkatkan"} Modal Ditempatkan dan Disetor dalam Perseroan, yang semula sebesar Rp. ${formatInputNumber(data.originalCapitalPaid)},-${w(data.originalCapitalPaid, "rupiah")} yang terbagi menjadi sejumlah ${formatInputNumber(originalShares)}${w(originalShares, "shares")} lembar saham, menjadi sebesar Rp. ${formatInputNumber(data.targetCapitalPaid)},-${w(data.targetCapitalPaid, "rupiah")} yang terbagi menjadi sejumlah ${formatInputNumber(targetShares)}${w(targetShares, "shares")} lembar saham.` }));
      resolutionIdx++;

      const capitalBody: any[] = [];

      if (data.resolutions.capitalPaid) {
        capitalBody.push(bodyP({ indent: { left: 426 }, text: "Bahwa pengeluaran saham-saham baru tersebut di atas, telah diambil bagian dan disetor penuh secara tunai melalui kas Perseroan oleh masing - masing pemegang saham dengan rincian sebagai berikut :", spacing: { before: 120 } }));

        const newDeposits = data.capitalSubscriptionsNew && data.capitalSubscriptionsNew.length > 0
          ? data.capitalSubscriptionsNew.map((item) => ({
              name: item.subscriberName,
              addedShares: item.sharesCount,
              addedValue: item.sharesCount * (data.originalSharePrice || 0)
            }))
          : data.finalShareholders
              .filter((fs) => fs.isNewDeposit && fs.newDepositShares && fs.newDepositShares > 0)
              .map((fs) => ({ name: fs.name, addedShares: fs.newDepositShares!, addedValue: fs.newDepositShares! * (data.originalSharePrice || 0) }));

        newDeposits.forEach((dep) => {
          const person = findPersonDetailsByName(dep.name);
          let boldName = dep.name.toUpperCase();
          let detailsText = "";
          if (person) {
            detailsText = formatPersonDetails(person, "", "", false, true);
            const sal = (person.salutation || "Tuan").trim();
            const salUpper = sal.toUpperCase().includes("TUAN") ? "TUAN" : sal.toUpperCase().includes("NYONYA") ? "NYONYA" : sal.toUpperCase().includes("NONA") ? "NONA" : sal;
            boldName = `${salUpper} ${dep.name.toUpperCase()}`;
          }

          capitalBody.push(
            new Paragraph({
              alignment: "both" as any,
              spacing: { line: LINE_SPACING, lineRule: "auto", before: 60, after: 60 },
              numbering: { reference: "hadir-dash", level: 0 },
              children: [
                mkRun(boldName, true),
                mkRun(detailsText, false),
                mkRun(`: ${formatInputNumber(dep.addedShares)}${w(dep.addedShares, "shares")} lembar saham atau senilai Rp. ${formatInputNumber(dep.addedValue)},-${w(dep.addedValue, "rupiah")};`),
              ],
            }),
          );
        });
      }

      capitalBody.forEach(p => children.push(p));
    }

    // Hibah / Transfer saham
    const hasOrigTransfers2 = data.shareTransfers && data.shareTransfers.length > 0;
    const hasNTransfers2 = data.shareTransfersNew && data.shareTransfersNew.length > 0;

    if (data.resolutions.shareholders && (hasOrigTransfers2 || hasNTransfers2)) {
      const transferList = hasNTransfers2 
        ? data.shareTransfersNew!.map(t => ({
            fromName: t.fromName,
            toName: t.toName,
            transferType: t.transferType,
            sharesTransferred: t.sharesTransferred,
            toType: t.toType,
            toDetail: t.toDetail
          }))
        : data.shareTransfers.map(t => {
            const fromSh = data.shareholders.find((s) => s.id === t.fromShareholderId);
            const toSh = data.shareholders.find((s) => s.id === t.toShareholderId) || data.finalShareholders.find((s) => s.id === t.toShareholderId);
            return {
              fromName: fromSh?.name || ".....",
              toName: toSh?.name || ".....",
              transferType: (t.type || "Jual Beli").toLowerCase().includes("hibah") ? "HIBAH" as const : "AJB" as const,
              sharesTransferred: t.sharesTransferred,
              toType: undefined,
              toDetail: undefined
            };
          });

      const getRecipientSuffix = (t: any) => {
        if (t.toType === 'NEW' && t.toDetail) {
          const isCapitalPaidActive = data.resolutions.capitalPaid;
          const inNewDeposits = isCapitalPaidActive && (
            (data.capitalSubscriptionsNew || []).some((d: any) => d.subscriberName && d.subscriberName.trim().toUpperCase() === t.toName.toUpperCase().trim()) ||
            (data.finalShareholders || []).some((fs: any) => fs.isNewDeposit && fs.newDepositShares > 0 && fs.name && fs.name.trim().toUpperCase() === t.toName.toUpperCase().trim())
          );
          if (inNewDeposits) {
            return "";
          }
          return formatPersonDetails(t.toDetail, "", "", false, true);
        }
        return "";
      };

      const totalTransferredShares = transferList.reduce((sum, t) => sum + t.sharesTransferred, 0);
      const hasHibah = transferList.some(t => t.transferType === 'HIBAH');
      const hasJualBeli = transferList.some(t => t.transferType === 'AJB');
      
      const transferBody: any[] = [];

      if (transferList.length === 1) {
        const t = transferList[0];
        const valueRp = t.sharesTransferred * data.originalSharePrice;
        const typeLabel = t.transferType === 'HIBAH' ? 'hibah' : 'jual beli';

        children.push(
          bodyP({
            numbering: { reference: "keputusan-num", level: 0 },
            text: `Menyetujui pengalihan saham secara ${typeLabel} ${(t.fromName || ".....").toUpperCase()} sejumlah ${formatInputNumber(t.sharesTransferred)} lembar saham perseroan atau senilai Rp. ${formatInputNumber(valueRp)},- kepada ${(t.toName || ".....").toUpperCase()}${getRecipientSuffix(t)};`
          })
        );
        resolutionIdx++;
      } else {
        let transferTypesStr = "hibah/jual beli";
        if (hasHibah && !hasJualBeli) transferTypesStr = "hibah";
        else if (!hasHibah && hasJualBeli) transferTypesStr = "jual beli";
        else transferTypesStr = "hibah dan jual beli";

        children.push(bodyP({ numbering: { reference: "keputusan-num", level: 0 }, text: `Menyetujui pengalihan saham-saham secara ${transferTypesStr} dengan rincian sebagai berikut :` }));
        resolutionIdx++;

        transferList.forEach((t) => {
          const valueRp = t.sharesTransferred * data.originalSharePrice;
          const typeLabel = t.transferType === 'HIBAH' ? 'Hibah' : 'Jual Beli';

          transferBody.push(
            new Paragraph({
              alignment: "both" as any,
              spacing: { line: LINE_SPACING, lineRule: "auto", after: 120 },
              numbering: { reference: "hadir-dash", level: 0 },
            children: [
              mkRun((t.fromName || ".....").toUpperCase(), true),
                mkRun(` mengalihkan sejumlah ${formatInputNumber(t.sharesTransferred)} saham perseroan atau senilai Rp. ${formatInputNumber(valueRp)},- dengan cara ${typeLabel} kepada `),
                mkRun((t.toName || ".....").toUpperCase(), true),
                mkRun(getRecipientSuffix(t)),
                mkRun(";"),
              ],
            }),
          );
        });

        transferBody.forEach(p => children.push(p));
      }
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
            spacing: { line: LINE_SPACING, lineRule: "auto", after: 120 },
            numbering: { reference: "hadir-dash", level: 0 },
            tabStops: [
              { type: TabStopType.LEFT, position: 2835 },
            ],
            children: [
              mkRun((s.name || ".....").toUpperCase(), true),
              mkRun("\t: "),
              mkRun(s.sharesOwned.toLocaleString("id-ID"), true),
              mkRun(`${w(s.sharesOwned, "shares")} lembar saham atau senilai `),
              mkRun(formatRpDot(currentValue), true),
              mkRun(`${w(currentValue, "rupiah")};`),
            ],
          }),
        );
      });

      shBody.forEach(p => children.push(p));
    }
    // Perubahan/Pengangkatan Pengurus
    if (data.resolutions.management || data.resolutions.reappointment) {
      const oldManagers = [
        ...data.shareholders.filter((s) => s.isManagement).map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
        ...(data.oldManagementItems || []),
      ];

      const hasExplicitDismissals = data.managementDismissals && data.managementDismissals.length > 0;
      const hasExplicitAppointments = data.managementAppointments && data.managementAppointments.length > 0;

      let newManagers = [];
      let managersToDismiss = [];
      let managersToAppoint = [];

      if (hasExplicitDismissals || hasExplicitAppointments) {
        if (hasExplicitDismissals) {
          managersToDismiss = data.managementDismissals.map(d => {
            const person = data.shareholders?.find(s => s.name?.toUpperCase().trim() === d.name?.toUpperCase().trim());
            return {
              ...person,
              name: d.name,
              salutation: d.salutation || "Tuan",
              position: d.position
            };
          });
        }
        if (hasExplicitAppointments) {
          managersToAppoint = data.managementAppointments.map(a => {
            const person = data.shareholders?.find(s => s.name?.toUpperCase().trim() === a.name?.toUpperCase().trim());
            return {
              ...person,
              name: a.name,
              salutation: a.salutation || "Tuan",
              position: a.position
            };
          });
        }

        const dismissedNames = new Set((data.managementDismissals || []).map(d => d.name?.toUpperCase().trim()));
        newManagers = [
          ...oldManagers.filter(om => !dismissedNames.has(om.name?.toUpperCase().trim())),
          ...managersToAppoint
        ];
      } else {
        newManagers = [
          ...(data.finalShareholders && data.finalShareholders.length > 0 ? data.finalShareholders : data.shareholders)
            .filter((s) => s.isManagement)
            .map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
          ...(data.newManagementItems || []),
        ];

        const changeType = data.managementChangeType || "ALL_DISMISSED";
        if (changeType === "PARTIAL_CHANGE") {
          managersToDismiss = oldManagers.filter(
            (om) =>
              !newManagers.some(
                (nm) =>
                  (nm.name || "").toUpperCase().trim() === (om.name || "").toUpperCase().trim() &&
                  (nm.position || "").toUpperCase().trim() === (om.position || "").toUpperCase().trim()
              )
          );
          managersToAppoint = newManagers.filter(
            (nm) =>
              !oldManagers.some(
                (om) =>
                  (om.name || "").toUpperCase().trim() === (nm.name || "").toUpperCase().trim() &&
                  (om.position || "").toUpperCase().trim() === (nm.position || "").toUpperCase().trim()
              )
          );
        } else {
          managersToDismiss = oldManagers;
          managersToAppoint = newManagers;
        }
      }

      const mgmtBody: any[] = [];

      if (data.resolutions.reappointment) {
        let oldExpiredDateStr = "16 November 2025";
        if (data.reappointmentOldExpiredDate) {
          oldExpiredDateStr = formatDateIndo(data.reappointmentOldExpiredDate);
        } else if (data.signingDate) {
          oldExpiredDateStr = formatDateIndo(data.signingDate);
        }

        children.push(bodyP({ 
          numbering: { reference: "keputusan-num", level: 0 }, 
          text: `Menyetujui dan memutuskan untuk menerima kinerja pengurus perseroan yang telah habis masa jabatannya pada tanggal ${oldExpiredDateStr} serta membebaskan semua tanggung jawab selama kinerja dalam perseroan (acquit et de change), dan mengangkat kembali pengurus yaitu:` 
        }));
        resolutionIdx++;

        const getPriorityR = (pos: string) => {
          const p = (pos || "").toUpperCase();
          if (p.includes("DIREKTUR UTAMA") || p.includes("PRESIDEN DIREKTUR")) return 1;
          if (p.includes("DIREKTUR")) return 2;
          if (p.includes("KOMISARIS UTAMA") || p.includes("PRESIDEN KOMISARIS")) return 3;
          if (p.includes("KOMISARIS")) return 4;
          return 5;
        };
        const sortedManagersR = [...newManagers].sort((a, b) => getPriorityR(a.position) - getPriorityR(b.position));

        sortedManagersR.forEach((m) => {
          mgmtBody.push(
            new Paragraph({
              alignment: "both" as any,
              spacing: { line: LINE_SPACING, lineRule: "auto", before: 60, after: 60 },
              numbering: { reference: "hadir-dash", level: 0 },
              tabStops: [
                { type: TabStopType.LEFT, position: 3968 },
              ],
              children: [
                mkRun(toTitleCase(m.position)),
                mkRun("\t: "),
                mkRun((m.name || "..........").toUpperCase(), true),
              ],
            })
          );
        });

        let startDateStr = oldExpiredDateStr;
        if (data.reappointmentStartDate) {
          startDateStr = formatDateIndo(data.reappointmentStartDate);
        }

        let endDateStr = "16 November 2030";
        if (data.reappointmentEndDate) {
          endDateStr = formatDateIndo(data.reappointmentEndDate);
        } else {
          const baseDate = data.reappointmentStartDate || data.reappointmentOldExpiredDate || data.signingDate;
          if (baseDate) {
            const d = new Date(baseDate);
            if (!isNaN(d.getTime())) {
              d.setFullYear(d.getFullYear() + 5);
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              endDateStr = formatDateIndo(`${d.getFullYear()}-${mm}-${dd}`);
            }
          }
        }

        mgmtBody.push(
          new Paragraph({
            alignment: "both" as any,
            spacing: { line: LINE_SPACING, lineRule: "auto", before: 120, after: 120 },
            indent: { left: 709 },
            children: [
              mkRun(`Susunan pengurus perseroan tersebut berlaku mulai tanggal ${startDateStr} sampai dengan ${endDateStr}.`),
            ],
          })
        );
      } else {
        const getPersonDetailText = (person: any): string => {
          if (!person) return "";
          const nameUpper = (person.name || "").trim().toUpperCase();
          
          // Find representative name
          let repName = "";
          if (data.authorizedRepresentativeId) {
            const allReps = (data.shareholders || []).filter((s: any) => s.isProxy || s.isManagement || s.isRepresentative);
            const rep = allReps.find((s) => s.id === data.authorizedRepresentativeId);
            if (rep && rep.name) {
              repName = rep.name.toUpperCase().trim();
            }
          } else if (data.manualRepresentative && data.manualRepresentative.name) {
            repName = data.manualRepresentative.name.toUpperCase().trim();
          }
          
          const isPenghadap = repName && nameUpper === repName;
          const isSh = (data.shareholders || []).some(
            s => (s.name || "").trim().toUpperCase() === nameUpper
          );
          
          if (isSh || isPenghadap) {
            return isPenghadap ? ", penghadap tersebut diatas" : ", tersebut diatas";
          }
          
          // Fallback to full biodata
          const details = getPersonDetailCircular_text(person);
          return details ? `, ${details}` : "";
        };

        // Dismissal
        if (managersToDismiss.length > 0) {
          const dismissedDirs = managersToDismiss.filter(m => /direktur/i.test(m.position));
          const dismissedKoms = managersToDismiss.filter(m => /komisaris/i.test(m.position));
          const hasDir = dismissedDirs.length > 0;
          const hasKom = dismissedKoms.length > 0;

          if (hasDir && hasKom) {
            children.push(bodyP({ numbering: { reference: "keputusan-num", level: 0 }, text: `Memberhentikan dengan hormat seluruh anggota Direksi dan Dewan Komisaris Perseroan, yaitu:` }));
            resolutionIdx++;

            mgmtBody.push(
              bodyP({ indent: { left: 426 }, text: "Direksi" })
            );

            dismissedDirs.forEach((m) => {
              mgmtBody.push(
                new Paragraph({
                  alignment: "both" as any,
                  spacing: { line: LINE_SPACING, lineRule: "auto", after: 60 },
                  numbering: { reference: "hadir-dash", level: 0 },
                  children: [
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(getPersonDetailText(m) + ";"),
                  ],
                })
              );
            });

            mgmtBody.push(
              bodyP({ indent: { left: 426 }, text: "Dewan Komisaris", spacing: { before: 120 } })
            );

            dismissedKoms.forEach((m) => {
              mgmtBody.push(
                new Paragraph({
                  alignment: "both" as any,
                  spacing: { line: LINE_SPACING, lineRule: "auto", after: 60 },
                  numbering: { reference: "hadir-dash", level: 0 },
                  children: [
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(getPersonDetailText(m) + ";"),
                  ],
                })
              );
            });
          } else if (hasDir && !hasKom) {
            if (dismissedDirs.length === 1) {
              const m = dismissedDirs[0];
              children.push(
                bodyP({
                  numbering: { reference: "keputusan-num", level: 0 },
                  children: [
                    mkRun(`Memberhentikan dengan hormat `),
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(getPersonDetailText(m)),
                    mkRun(`, dari jabatannya selaku Direktur Perseroan.`),
                  ]
                })
              );
              resolutionIdx++;
            } else {
              children.push(bodyP({ numbering: { reference: "keputusan-num", level: 0 }, text: `Memberhentikan dengan hormat anggota Direksi Perseroan, yaitu:` }));
              resolutionIdx++;
              dismissedDirs.forEach((m, idx) => {
                mgmtBody.push(
                  bodyP({
                    indent: { left: 852 },
                    children: [
                      mkRun(`${idx + 1}. `),
                      mkRun(`${m.salutation || "Tuan"} `),
                      mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                      mkRun(getPersonDetailText(m) + ";"),
                    ]
                  })
                );
              });
            }
          } else if (!hasDir && hasKom) {
            if (dismissedKoms.length === 1) {
              const m = dismissedKoms[0];
              children.push(
                bodyP({
                  numbering: { reference: "keputusan-num", level: 0 },
                  children: [
                    mkRun(`Memberhentikan dengan hormat `),
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(getPersonDetailText(m)),
                    mkRun(`, dari jabatannya selaku Komisaris Perseroan.`),
                  ]
                })
              );
              resolutionIdx++;
            } else {
              children.push(bodyP({ numbering: { reference: "keputusan-num", level: 0 }, text: `Memberhentikan dengan hormat anggota Dewan Komisaris Perseroan, yaitu:` }));
              resolutionIdx++;
              dismissedKoms.forEach((m, idx) => {
                mgmtBody.push(
                  bodyP({
                    indent: { left: 852 },
                    children: [
                      mkRun(`${idx + 1}. `),
                      mkRun(`${m.salutation || "Tuan"} `),
                      mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                      mkRun(getPersonDetailText(m) + ";"),
                    ]
                  })
                );
              });
            }
          }

          mgmtBody.push(
            bodyP({ indent: { left: 426 }, text: "dengan ucapan terima kasih atas jasa-jasa dan pengabdian yang telah diberikan selama masa jabatannya dalam Perseroan, serta memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) atas tindakan pengurusan dan pengawasan yang telah dijalankan, sepanjang tindakan-tindakan tersebut tercermin dalam buku-buku serta laporan tahunan Perseroan.", spacing: { before: 120 } })
          );
        }

        // Appointment
        if (managersToAppoint.length > 0) {
          const appointedDirs = managersToAppoint.filter(m => /direktur/i.test(m.position));
          const appointedKoms = managersToAppoint.filter(m => /komisaris/i.test(m.position));

          if (appointedDirs.length > 0 && appointedKoms.length === 0) {
            if (appointedDirs.length === 1) {
              const m = appointedDirs[0];
              const isNumbered = (managersToDismiss.length === 0);
              const runP = {
                indent: isNumbered ? undefined : { left: 426 },
                numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
                children: [
                  mkRun(`Mengangkat `),
                  mkRun(`${m.salutation || "Tuan"} `),
                  mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                  mkRun(getPersonDetailText(m)),
                  mkRun(`, sebagai ${m.position.toUpperCase()} Perseroan.`),
                ],
                spacing: { before: 120 }
              };
              if (isNumbered) {
                children.push(bodyP(runP));
                resolutionIdx++;
              } else {
                mgmtBody.push(bodyP(runP));
              }
            } else {
              const isNumbered = (managersToDismiss.length === 0);
              const runHeader = {
                indent: isNumbered ? undefined : { left: 426 },
                numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
                text: `Mengangkat anggota Direksi Perseroan, dengan rincian sebagai berikut:`,
                spacing: { before: 120 }
              };
              if (isNumbered) {
                children.push(bodyP(runHeader));
                resolutionIdx++;
              } else {
                mgmtBody.push(bodyP(runHeader));
              }
              appointedDirs.forEach((m, idx) => {
                mgmtBody.push(
                  bodyP({
                    indent: { left: 852 },
                    children: [
                      mkRun(`${idx + 1}. `),
                      mkRun(`${m.salutation || "Tuan"} `),
                      mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                      mkRun(getPersonDetailText(m)),
                      mkRun(` selaku ${m.position.toUpperCase()};`),
                    ]
                  })
                );
              });
            }
          } else if (appointedDirs.length === 0 && appointedKoms.length > 0) {
            if (appointedKoms.length === 1) {
              const m = appointedKoms[0];
              const isNumbered = (managersToDismiss.length === 0);
              const runP = {
                indent: isNumbered ? undefined : { left: 426 },
                numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
                children: [
                  mkRun(`Mengangkat `),
                  mkRun(`${m.salutation || "Tuan"} `),
                  mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                  mkRun(getPersonDetailText(m)),
                  mkRun(`, sebagai ${m.position.toUpperCase()} Perseroan.`),
                ],
                spacing: { before: 120 }
              };
              if (isNumbered) {
                children.push(bodyP(runP));
                resolutionIdx++;
              } else {
                mgmtBody.push(bodyP(runP));
              }
            } else {
              const isNumbered = (managersToDismiss.length === 0);
              const runHeader = {
                indent: isNumbered ? undefined : { left: 426 },
                numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
                text: `Mengangkat anggota Dewan Komisaris Perseroan, dengan rincian sebagai berikut:`,
                spacing: { before: 120 }
              };
              if (isNumbered) {
                children.push(bodyP(runHeader));
                resolutionIdx++;
              } else {
                mgmtBody.push(bodyP(runHeader));
              }
              appointedKoms.forEach((m, idx) => {
                mgmtBody.push(
                  bodyP({
                    indent: { left: 852 },
                    children: [
                      mkRun(`${idx + 1}. `),
                      mkRun(`${m.salutation || "Tuan"} `),
                      mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                      mkRun(getPersonDetailText(m)),
                      mkRun(` selaku ${m.position.toUpperCase()};`),
                    ]
                  })
                );
              });
            }
          } else {
            const isNumbered = (managersToDismiss.length === 0);
            const runHeader = {
              indent: isNumbered ? undefined : { left: 426 },
              numbering: isNumbered ? { reference: "keputusan-num", level: 0 } : undefined,
              text: `Selanjutnya menyetujui untuk mengangkat sebagai anggota Direksi /Dewan Komisaris Perseroan yang baru:`,
              spacing: { before: 120 }
            };
            if (isNumbered) {
              children.push(bodyP(runHeader));
              resolutionIdx++;
            } else {
              mgmtBody.push(bodyP(runHeader));
            }

            managersToAppoint.forEach((m) => {
              mgmtBody.push(
                bodyP({
                  numbering: { reference: "mgmt-dash", level: 0 },
                  children: [
                    mkRun(`${m.salutation || "Tuan"} `),
                    mkRun(cleanNameOfSalutation((m.name || ".....").toUpperCase()), true),
                    mkRun(`, tersebut di atas, sebagai ${m.position} Perseroan;`),
                  ]
                })
              );
            });
          }
        }

        // Final Composition Structure
        if (managersToDismiss.length > 0 || managersToAppoint.length > 0) {
          mgmtBody.push(
            bodyP({
              indent: { left: 426 },
              text: "Sehingga susunan anggota Direksi dan Dewan Komisaris Perseroan menjadi sebagai berikut :",
              spacing: { before: 120 }
            })
          );

          const sortedManagersD = [...newManagers].sort((a, b) => getPosRank(a.position) - getPosRank(b.position));

          sortedManagersD.forEach((m) => {
            mgmtBody.push(
              new Paragraph({
                alignment: "both" as any,
                spacing: { line: LINE_SPACING, lineRule: "auto", before: 60, after: 60 },
                indent: { left: 426 },
                tabStops: [
                  { type: TabStopType.LEFT, position: 3968 },
                ],
                children: [
                  mkRun(m.position.toUpperCase()),
                  mkRun("\t: "),
                  mkRun(cleanNameOfSalutation((m.name || "..........").toUpperCase()) + ";", true),
                ],
              }),
            );
          });

          mgmtBody.push(
            bodyP({
              indent: { left: 426 },
              text: `Masa jabatan anggota Direksi dan Dewan Komisaris tersebut di atas berlaku efektif terhitung sejak tanggal Keputusan ini ditetapkan, ${data.managementEffectiveUntil || "untuk jangka waktu sebagaimana yang ditentukan dalam Anggaran Dasar Perseroan"}, dengan tidak mengurangi hak Rapat Umum Pemegang Saham untuk memberhentikan sewaktu-waktu sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.`,
              spacing: { before: 120, after: 120 }
            })
          );
        }
      }

      mgmtBody.forEach(p => children.push(p));
    }

    // Pemberian Kuasa
    let repText = "................";
    if (data.representativeType === "EXISTING") {
      const allReps = [...data.shareholders, ...data.finalShareholders];
      const rep = allReps.find((s) => s.id === data.authorizedRepresentativeId);
      repText = `${rep?.salutation || "................"} ${cleanNameOfSalutation((rep?.name || "................").toUpperCase())}`;
    } else {
      const rep = data.manualRepresentative;
      if (rep) {
        const birthStr = `lahir di ${toTitleCase(rep.birthCity || "................")}, pada tanggal ${getDayIndo(rep.birthDate) || ".."} ${getMonthIndo(rep.birthDate) || "........"} ${getYearIndo(rep.birthDate) || "...."}`;
        repText = `${rep.salutation} ${cleanNameOfSalutation(rep.name.toUpperCase() || "................")}, ${birthStr}, ${getNationalityStr(rep)}, ${getOccupationStr(rep)}${getAddressStr(rep)}, ${getIdentificationStr(rep)}`;
      }
    }
    children.push(bodyP({
      numbering: { reference: "keputusan-num", level: 0 },
      children: [
        mkRun("Menyetujui dan memutuskan untuk memberikan kuasa dengan hak substitusi kepada "),
        mkRun(repText, true),
        mkRun(", untuk melakukan setiap dan seluruh tindakan yang diperlukan sehubungan dengan keputusan-keputusan tersebut di atas, termasuk tetapi tidak terbatas pada menghadap dihadapan pejabat yang berwenang, memberikan keterangan-keterangan, menandatangani dokumen dan akta-akta, dan melakukan pendaftaran serta mengajukan permohonan persetujuan dan/atau menyampaikan pemberitahuan atas keputusan tersebut di atas kepada Menteri Hukum dan Hak Asasi Manusia Republik Indonesia dan instansi lain yang berwenang sesuai dengan peraturan perundang-undangan yang berlaku."),
      ]
    }));
    resolutionIdx++;
  }

  // ── PENUTUP ──────────────────────────────────────────────────────────────
    if (isCircular) {
      children.push(
        mkP({ text: `Demikianlah keputusan para pemegang saham di luar rapat ini dibuat berdasarkan ketentuan pasal 91 Undang-Undang nomor 40 tahun 2007 tentang Perseroan Terbatas, mempunyai kekuatan yang sama yang diambil dengan sah dalam RUPS dan ditandatangani dengan sebenar-benarnya pada hari dan tanggal dimaksud pada keputusan diatas.`, spacing: { before: 0, after: 0 } }),
      );
    } else {
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [mkRun("VII. PENUTUP", true)],
        }),
        new Paragraph({
          alignment: "both" as any,
          spacing: { line: LINE_SPACING, lineRule: "auto", before: 0, after: 0 },
          children: [
            mkRun("Akhirnya, oleh karena sudah tidak ada hal-hal lain yang perlu dibicarakan lagi, maka Ketua Rapat menutup Rapat ini pada jam "),
          mkRun(data.meetingEndTime || "11:00", true),
          mkRun(" WIB."),
        ],
      }),
    );
  }

  // ── TANDA TANGAN ──────────────────────────────────────────────────────────
  if (isCircular) {
    children.push(
      new Paragraph({
        alignment: "left" as any,
        spacing: { after: 480, line: LINE_SPACING, lineRule: "auto" },
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
              spacing: { after: 480, line: LINE_SPACING, lineRule: "auto" },
              children: [mkRun("Meterai 10.000 + Cap", false, { color: "bfbfbf", size: 16 })],
            }),
          );
        } else {
          children.push(new Paragraph({ spacing: { before: 480 }, children: [] }));
        }
        children.push(
          new Paragraph({
            alignment: "left" as any,
            spacing: { after: 0, line: LINE_SPACING, lineRule: "auto" },
            children: [mkRun((sh.name || "................").toUpperCase(), true)],
          }),
          new Paragraph({
            alignment: "left" as any,
            spacing: { after: 1200, line: LINE_SPACING, lineRule: "auto" },
            children: [new TextRun({ text: "Tanggal: ....................", size: 20, font: FONT_FAMILY })],
          }),
        );
      });
  } else {
    // Notulen PKR LB Signatures (Similar to RUPST)
    children.push(
      new Paragraph({
        alignment: "left" as any,
        spacing: { after: 240, before: 480 },
        children: [mkRun("KETUA RAPAT,", true)],
      }),
      new Paragraph({
        alignment: "left" as any,
        spacing: { after: 480 },
        children: [mkRun("Meterai Rp.10.000,- + cap perusahan", false, { color: "FF0000", size: 16 })],
      }),
      new Paragraph({
        alignment: "left" as any,
        children: [mkRun((data.meetingChair || "................").toUpperCase(), true, { underline: { type: "single" } })],
      }),
      new Paragraph({
        alignment: "left" as any,
        spacing: { after: 480 },
        children: [mkRun((data.meetingChairPosition || "Direktur"), true)],
      }),
      new Paragraph({
        alignment: "left" as any,
        spacing: { after: 480, before: 480 },
        children: [mkRun("TANDA TANGAN PESERTA RAPAT :", true)],
      })
    );

    const tandaTanganChairName = (data.meetingChair || "").toUpperCase();
    const formatParticipantName = (sh: any) => {
      if (sh.isProxy && sh.proxyData && sh.proxyData.name) {
        return `${sh.proxyData.name.toUpperCase()} qq ${sh.name.toUpperCase()}`;
      }
      return sh.name.toUpperCase();
    };

    const participants = data.shareholders.filter(sh => (sh.sharesOwned > 0 || sh.isPresent) && sh.name.toUpperCase() !== tandaTanganChairName);

    const cols = 2;
    const participantRows = [];
    const borderNone = { style: BorderStyle.NONE, size: 0, color: "auto" };
    const bordersNone = { top: borderNone, bottom: borderNone, left: borderNone, right: borderNone, insideHorizontal: borderNone, insideVertical: borderNone };

    for (const participant of participants) {
      const positionText = participant.managementPosition || (participant.sharesOwned > 0 ? "pemegang saham" : "");
      participantRows.push(
        new TableRow({
          children: [
            new TableCell({
              borders: bordersNone,
              width: { size: 4252, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 120, right: 120 },
              children: [
                new Paragraph({ children: [new TextRun({ text: formatParticipantName(participant), bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: positionText })] }),
              ],
            }),
            new TableCell({
              borders: bordersNone,
              width: { size: 4252, type: WidthType.DXA },
              children: [
                new Paragraph({ children: [new TextRun({ text: "........................................................" })] }),
              ],
            }),
          ],
        }),
      );
    }

    if (participantRows.length > 0) {
      children.push(
        new Table({
          rows: participantRows,
          width: { size: 8504, type: WidthType.DXA },
          borders: bordersNone,
          cellMargin: { left: 10, right: 10 },
        })
      );
    }

    // ── DAFTAR PARA PIHAK ─────────────────────────────────────────────────────
    children.push(new Paragraph({ children: [new PageBreak()] }));
    
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [mkRun("DAFTAR HADIR", true)]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [mkRun("RAPAT UMUM PEMEGANG SAHAM LUAR BIASA", true)]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [mkRun("PT " + companyName, true)]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [mkRun(`TANGGAL ${formatDateRupst(data.signingDate || new Date().toISOString())}`, true)]
      })
    );

    const borderSingle = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
    const bordersSingle = { top: borderSingle, bottom: borderSingle, left: borderSingle, right: borderSingle, insideHorizontal: borderSingle, insideVertical: borderSingle };
    const hadirHeaders = ["NO", "NAMA", "KEDUDUKAN", "TANDATANGAN"];
    const hadirWidths = [600, 2500, 2500, 2904];

    const hadirHeaderRow = new TableRow({
      children: hadirHeaders.map((h, i) => 
        new TableCell({
          borders: bordersSingle,
          margins: { top: 120, bottom: 120, left: 120, right: 120 },
          width: { size: hadirWidths[i], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: FONT_SIZE, font: FONT_FAMILY })] })]
        })
      )
    });

    const hadirParticipants = data.shareholders.filter(sh => sh.sharesOwned > 0 || sh.isPresent);
    const hadirBodyRows = hadirParticipants.map((sh, idx) => {
      const positions = [];
      if (sh.isManagement && sh.managementPosition) {
        positions.push(sh.managementPosition);
      }
      if (sh.sharesOwned > 0) {
        positions.push("pemegang saham");
      }
      const kedudukanText = positions.length > 0 ? positions.join("\n&\n") : "-";

      return new TableRow({
        children: [
          new TableCell({
            borders: bordersSingle,
            margins: { top: 400, bottom: 400, left: 120, right: 120 },
            width: { size: hadirWidths[0], type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}.`, size: FONT_SIZE, font: FONT_FAMILY })] })]
          }),
          new TableCell({
            borders: bordersSingle,
            margins: { top: 400, bottom: 400, left: 120, right: 120 },
            width: { size: hadirWidths[1], type: WidthType.DXA },
            children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: formatParticipantName(sh), size: FONT_SIZE, font: FONT_FAMILY })] })]
          }),
          new TableCell({
            borders: bordersSingle,
            margins: { top: 400, bottom: 400, left: 120, right: 120 },
            width: { size: hadirWidths[2], type: WidthType.DXA },
            children: kedudukanText.split("\n").map(l => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: l, size: FONT_SIZE, font: FONT_FAMILY })] }))
          }),
          new TableCell({
            borders: bordersSingle,
            margins: { top: 400, bottom: 400, left: 120, right: 120 },
            width: { size: hadirWidths[3], type: WidthType.DXA },
            children: [
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] }),
              new Paragraph({ children: [] })
            ]
          })
        ]
      });
    });

    children.push(
      new Table({
        rows: [hadirHeaderRow, ...hadirBodyRows],
        width: { size: 8504, type: WidthType.DXA },
        columnWidths: hadirWidths
      })
    );
  }

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
    styles: {
      default: {
        document: {
          run: {
            size: FONT_SIZE,
            font: FONT_FAMILY,
          },
          paragraph: {
            spacing: { line: LINE_SPACING, lineRule: "auto" },
          }
        }
      }
    },
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
        // peserta-num: decimal
        {
          reference: "peserta-num",
          levels: [{
            level: 0, format: "decimal" as any, text: "%1.",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 426, hanging: 426 } } },
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
        // keputusan-num: decimal "%1." left=426 hanging=426
        {
          reference: "keputusan-num",
          levels: [{
            level: 0, format: "decimal" as any, text: "%1.",
            alignment: "left" as any,
            style: { paragraph: { indent: { left: 426, hanging: 426 } } },
          }],
        },
        // agenda-dash: decimal "%1." left=426 hang=426 — agenda items
        {
          reference: "agenda-dash",
          levels: [{
            level: 0, format: "decimal" as any, text: "%1.",
            alignment: "left" as any,
            style: {
              run: { size: FONT_SIZE, font: FONT_FAMILY },
              paragraph: { indent: { left: 426, hanging: 426 } },
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
        // kbli-sub-1: decimal
        {
          reference: "kbli-sub-1",
          levels: [{
            level: 0, format: "decimal" as any, text: "1)",
            alignment: "left" as any,
            style: {
              run: { size: FONT_SIZE, font: FONT_FAMILY },
              paragraph: { indent: { left: 851, hanging: 426 } },
            },
          }],
        },
        // kbli-sub-2: decimal
        {
          reference: "kbli-sub-2",
          levels: [{
            level: 0, format: "decimal" as any, text: "2)",
            alignment: "left" as any,
            style: {
              run: { size: FONT_SIZE, font: FONT_FAMILY },
              paragraph: { indent: { left: 851, hanging: 426 } },
            },
          }],
        },
        // kbli-sub: decimal "%1)" left=851 hang=426 — pasal 3 (1) (2)
        {
          reference: "kbli-sub",
          levels: [{
            level: 0, format: "decimal" as any, text: "%1)",
            alignment: "left" as any,
            style: {
              run: { size: FONT_SIZE, font: FONT_FAMILY },
              paragraph: { indent: { left: 851, hanging: 426 } },
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
    const safeName = data.companyName ? data.companyName.replace(/PT\.?\s*/i, "").trim() : "Draft";
    const fileName = `Draft ${isCircular ? "Sirkuler" : "Notulen"} PT ${safeName}.docx`;
    saveAsNative(blob, fileName);
  } catch (error) {
    console.error("docx error", error);
  }
};