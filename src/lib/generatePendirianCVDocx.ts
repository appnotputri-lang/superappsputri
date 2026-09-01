import JSZip from "jszip";
import { saveAs } from "file-saver";
import { CVProfile, Address } from "../../types";
import {
  formatNumber,
  terbilang,
  formatDateStr,
  dateToWords,
  formatAktaDate,
  timeToWords,
  cleanCompanyName,
  formatPersonDetails,
  toTitleCase,
} from "./formatter";
import { mapCompanyProfileToCV } from "../domain/company/mappers/companyProfileToCV";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

// -------------------------------------------------------------------------------------
// OOXML DOM HELPER FUNCTIONS (ZERO-REMOVAL / PURE XML PRESERVATION)
// -------------------------------------------------------------------------------------
function getElements(parent: Element | Document | null, localName: string): Element[] {
  if (!parent) return [];
  if (parent.getElementsByTagNameNS) {
    const res = parent.getElementsByTagNameNS(W_NS, localName);
    if (res && res.length > 0) return Array.from(res) as Element[];
  }
  const list = (parent as Element).getElementsByTagName
    ? (parent as Element).getElementsByTagName(`w:${localName}`)
    : [];
  return Array.from(list) as Element[];
}

function getDirectChildElements(parent: Element | null, localName: string): Element[] {
  if (!parent || !parent.childNodes) return [];
  const res: Element[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const node = parent.childNodes[i] as Element;
    if (node.nodeType === 1) {
      const name = node.localName || node.nodeName.replace(/^w:/, "");
      if (name === localName) {
        res.push(node);
      }
    }
  }
  return res;
}

function getSingleElement(parent: Element | Document | null, localName: string): Element | null {
  const list = getElements(parent, localName);
  return list.length > 0 ? list[0] : null;
}

function getTextContent(element: Element | null): string {
  if (!element) return "";
  return element.textContent ? element.textContent.replace(/\s+/g, " ").trim() : "";
}

// -------------------------------------------------------------------------------------
// HELPER FUNCTIONS FOR PERSON FORMATTING (ZERO DUPLICATION)
// -------------------------------------------------------------------------------------
function cleanCompanyName(name: string): string {
  if (!name) return "";
  let n = name.trim();
  n = n.replace(/^["“”']+|["“”']+$/g, "").trim();
  n = n.replace(/^(\s*CV\.?\s*|\s*PT\.?\s*)/i, "").trim();
  n = n.replace(/^[\.\,\-\s]+/, "").trim();
  return n;
}

function cleanPersonNameUpper(name: string): string {
  if (!name) return "";
  let n = name.trim().toUpperCase();
  n = n.replace(/^(TUAN|NYONYA|NONA|SDR|SDRI|BPK|IBU)\.?\s+/i, "").trim();
  return n;
}

function formatPersonWithSalutation(person: { name: string; salutation?: string }): string {
  if (!person || !person.name) return "";
  const nameTrimmed = person.name.trim();
  const nameUpper = nameTrimmed.toUpperCase();
  if (/^(TUAN|NYONYA|NONA|SDR|SDRI|BPK|IBU)\s+/i.test(nameUpper)) {
    return nameUpper;
  }
  const sal = (person.salutation || "Tuan").trim();
  return `${sal} ${cleanPersonNameUpper(nameTrimmed)}`;
}

// -------------------------------------------------------------------------------------
// SEMANTIC TEXT-SLOT REPLACEMENT ENGINE (RUN-LEVEL PRESERVATION)
// -------------------------------------------------------------------------------------

/**
 * Slot Replacement: Header CV Title (P_1)
 * Preserves quotes (r0, r3) and "CV. " prefix (r1), only updates company name in r2.
 */
function setCVTitleSlots(p: Element, cleanNameUpper: string): void {
  const runs = getDirectChildElements(p, "r");
  for (const r of runs) {
    const t = getSingleElement(r, "t");
    if (!t) continue;
    const txt = t.textContent || "";
    if (
      txt.includes("DWIJAYA") ||
      txt.includes("TRIBAROKAH") ||
      (!txt.includes("CV.") && !txt.includes('"') && !txt.includes("”") && txt.trim().length > 1)
    ) {
      t.textContent = cleanNameUpper;
    }
  }
}

/**
 * Slot Replacement: Nomor Akta (P_2)
 * Preserves "Nomor : " label runs and only updates numeric akta slot.
 */
function setAktaNomorSlots(p: Element, nomorAktaStr: string): void {
  const runs = getDirectChildElements(p, "r");
  for (const r of runs) {
    const t = getSingleElement(r, "t");
    if (!t) continue;
    const txt = t.textContent || "";
    if (/\d+/.test(txt) || txt === "02") {
      t.textContent = nomorAktaStr;
    }
  }
}

/**
 * Slot Replacement: Hari & Tanggal Preamble (P_4)
 * Places Day in r2, Words Date in r4, Numeric Date in r10; clears redundant template word fragments.
 * Output: "Pada hari ini, [Hari], tanggal [Words Date] ([Numeric Date])."
 */
function setPreambleDateSlots(
  p: Element,
  hariStr: string,
  tglHurufStr: string,
  tglAngkaStr: string
): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = "Pada hari ini, ";
    } else if (idx === 1) {
      t.textContent = "";
    } else if (idx === 2) {
      t.textContent = hariStr;
    } else if (idx === 3) {
      t.textContent = ", tanggal ";
    } else if (idx === 4) {
      t.textContent = tglHurufStr;
    } else if (idx >= 5 && idx <= 8) {
      t.textContent = "";
    } else if (idx === 9) {
      t.textContent = " (";
    } else if (idx === 10) {
      t.textContent = tglAngkaStr;
    } else if (idx === 11) {
      t.textContent = ").";
    }
  });
}

/**
 * Slot Replacement: Waktu Preamble (P_5)
 * Places Numeric Time in r1, Words Time in r5; preserves intro and timezone outro with trailing tab.
 * Output: "Pukul 10:00 WIB (sepuluh Waktu Indonesia Bagian Barat)."
 */
function setPreambleTimeSlots(
  p: Element,
  waktuNumStr: string,
  waktuWordsStr: string
): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = "Pukul ";
    } else if (idx === 1) {
      t.textContent = `${waktuNumStr} WIB (`;
    } else if (idx >= 2 && idx <= 4) {
      t.textContent = "";
    } else if (idx === 5) {
      t.textContent = `${waktuWordsStr} `;
    } else if (idx >= 6 && idx <= 9) {
      t.textContent = "";
    } else if (idx === 10) {
      t.textContent = "Waktu Indonesia Bagian ";
    } else if (idx === 11) {
      t.textContent = "";
    } else if (idx === 12) {
      t.textContent = "Barat).";
    }
  });
}

/**
 * Slot Replacement: Penghadap Komparisi (P_10 exemplar)
 * Preserves salutation (r0), bold uppercase name (r1), bold comma (r3),
 * normal birth/occupation/address details (r4), and trailing tab stop (r11).
 * Output: "1. Tuan RENDY, lahir di ...;[trailing tab]"
 */
function setPenghadapSlots(
  p: Element,
  salutation: string,
  nameUpper: string,
  detailsText: string
): void {
  // Strip leading comma from detailsText if present to prevent double commas like "Tuan RENDY, , lahir..."
  const cleanDetails = detailsText.replace(/^,\s*/, "").replace(/;+\s*$/, "");

  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = salutation ? `${salutation} ` : "Tuan ";
    } else if (idx === 1) {
      t.textContent = nameUpper;
    } else if (idx === 2) {
      t.textContent = "";
    } else if (idx === 3) {
      t.textContent = ", ";
    } else if (idx === 4) {
      t.textContent = cleanDetails ? `${cleanDetails};` : ";";
    } else if (idx >= 5 && idx <= 10) {
      t.textContent = "";
    }
  });
}

/**
 * Slot Replacement: Domicile Status (P_20 exemplar)
 */
function setDomicileSlots(p: Element, domisiliText: string): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = domisiliText;
    } else if (idx > 0) {
      const isTab = r.getElementsByTagNameNS(W_NS, "tab").length > 0 || r.getElementsByTagName("w:tab").length > 0;
      if (!isTab) {
        t.textContent = "";
      }
    }
  });
}

/**
 * Slot Replacement: Pasal 1 Nama CV (P_30)
 */
function setPasal1NameSlots(p: Element, cleanNameUpper: string): void {
  const runs = getDirectChildElements(p, "r");
  for (const r of runs) {
    const t = getSingleElement(r, "t");
    if (!t) continue;
    const txt = t.textContent || "";
    if (
      txt.includes("DWIJAYA") ||
      txt.includes("TRIBAROKAH") ||
      (!txt.includes("CV.") && !txt.includes('"') && !txt.includes("”") && txt.trim().length > 1)
    ) {
      t.textContent = cleanNameUpper;
    }
  }
}

/**
 * Slot Replacement: Pasal 1 Kedudukan & Alamat (P_31)
 */
function setPasal1KedudukanSlots(
  p: Element,
  kotaKedudukan: string,
  alamatCV: string
): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = `(selanjutnya disebut " Perseroan "), berkedudukan di ${kotaKedudukan}, ${alamatCV};`;
    } else if (idx >= 1 && idx <= 5) {
      t.textContent = "";
    }
  });
}

/**
 * Slot Replacement: Pasal 2 Jangka Waktu (P_39)
 */
function setPasal2DurationSlots(p: Element, durationText: string): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = `Perseroan didirikan untuk jangka waktu ${durationText} dan dimulai pada tanggal ditandatanganinya akta ini.`;
    } else if (idx >= 1 && idx <= 2) {
      t.textContent = "";
    }
  });
}

/**
 * Slot Replacement: Pasal 3 Main KBLI Category (P_49)
 */
function setPasal3MainCategorySlots(p: Element, mainActivity: string): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = mainActivity;
    } else if (idx >= 1) {
      const isTab = r.getElementsByTagNameNS(W_NS, "tab").length > 0 || r.getElementsByTagName("w:tab").length > 0;
      if (!isTab) {
        t.textContent = "";
      }
    }
  });
}

/**
 * Slot Replacement: Pasal 3 KBLI Title (P_53 exemplar)
 * Preserves bold code (r0), bold uppercase title (r1), semicolon (r2), and bold tab (r3).
 */
function setKbliTitleSlots(p: Element, codeStr: string, titleStr: string): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = codeStr ? `${codeStr} - ` : "";
    } else if (idx === 1) {
      t.textContent = titleStr;
    } else if (idx === 2) {
      t.textContent = ";";
    }
  });
}

/**
 * Slot Replacement: Pasal 3 KBLI Description (P_54 exemplar)
 * Preserves normal font description run and tab stop.
 */
function setKbliDescSlots(p: Element, descStr: string): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = "";
    } else if (idx === 1) {
      t.textContent = descStr;
    }
  });
}

/**
 * Slot Replacement: Pasal 4 Total Capital (P_60)
 * Preserves prefix (r0..4), "Rp. " (r5), bold amount (r6), terbilang (r9), and suffix (r11).
 * Output: "Modal perseroan ini berjumlah Rp. [TotalCapitalFormatted],- ([TotalCapitalWords] rupiah), dimana setiap"
 */
function setPasal4TotalCapitalSlots(
  p: Element,
  totalCapitalFormatted: string,
  totalCapitalWords: string
): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 5) {
      t.textContent = "Rp. ";
    } else if (idx === 6) {
      t.textContent = totalCapitalFormatted;
    } else if (idx === 7) {
      t.textContent = "";
    } else if (idx === 8) {
      t.textContent = ",- (";
    } else if (idx === 9) {
      t.textContent = `${totalCapitalWords} rupiah), `;
    } else if (idx === 10) {
      t.textContent = "";
    } else if (idx === 11) {
      t.textContent = "dimana setiap";
    }
  });
}

/**
 * Slot Replacement: Pasal 4 Modal Pesero Item (P_67 exemplar)
 * Preserves exact run structure: Name (r0), tab (r1), colon (r2), bold amount (r3), terbilang (r4), trailing tab (r5).
 */
function setModalPeseroSlots(
  p: Element,
  nameTitleCase: string,
  amountFormatted: string,
  terbilangText: string
): void {
  const runs = getDirectChildElements(p, "r");
  if (runs.length >= 6) {
    runs.forEach((r, idx) => {
      const t = getSingleElement(r, "t");
      if (!t) return;
      if (idx === 0) {
        t.textContent = nameTitleCase;
      } else if (idx === 2) {
        t.textContent = ": ";
      } else if (idx === 3) {
        t.textContent = `Rp. ${amountFormatted},- `;
      } else if (idx === 4) {
        t.textContent = `(${terbilangText} rupiah);`;
      } else if (idx >= 5 && idx < runs.length - 1) {
        t.textContent = "";
      }
    });
  } else {
    // Fallback for non-standard runs
    runs.forEach((r, idx) => {
      const t = getSingleElement(r, "t");
      if (!t) return;
      if (idx === 0) {
        t.textContent = nameTitleCase;
      } else if (idx === 1) {
        t.textContent = `: Rp. ${amountFormatted},- (${terbilangText} rupiah);`;
      }
    });
  }
}

/**
 * Slot Replacement: Pasal 5 Pesero Pengurus (P_83)
 * Output: "Pesero [PengurusFormatted], tersebut bertindak dalam perseroan ini sebagai Pesero "
 */
function setPasal5PengurusSlots(p: Element, pengurusFormatted: string): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = "Pesero ";
    } else if (idx === 1) {
      t.textContent = "";
    } else if (idx === 2) {
      t.textContent = pengurusFormatted;
    } else if (idx === 3) {
      t.textContent = "";
    } else if (idx === 4) {
      t.textContent = ",";
    }
  });
}

/**
 * Slot Replacement: Pasal 5 Komanditer Item (P_86 exemplar)
 * Preserves salutation (r0), bold name (r1), suffix (r3), and tab (r4).
 * Output: "Tuan/Nyonya [NAME] tersebut di atas;[trailing tab]"
 */
function setKomanditerSlots(p: Element, salutation: string, nameUpper: string): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = salutation ? `${salutation} ` : "Tuan ";
    } else if (idx === 1) {
      t.textContent = nameUpper;
    } else if (idx === 2) {
      t.textContent = " ";
    } else if (idx === 3) {
      t.textContent = "tersebut di atas;";
    } else if (idx >= 5) {
      t.textContent = "";
    }
  });
}

/**
 * Slot Replacement: Pasal 6 Pengurusan / Direktur (P_94)
 * Output: "Perseroan ini diurus dan dipimpin oleh [PengurusFormatted], pesero pengurus dengan"
 */
function setPasal6DirekturSlots(p: Element, pengurusFormatted: string): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = "Perseroan ini diurus dan dipimpin oleh ";
    } else if (idx === 1) {
      t.textContent = "";
    } else if (idx === 2) {
      t.textContent = pengurusFormatted;
    } else if (idx >= 3 && idx <= 6) {
      t.textContent = "";
    } else if (idx === 7) {
      t.textContent = ", pesero pengurus";
    } else if (idx === 8) {
      t.textContent = " ";
    } else if (idx === 9) {
      t.textContent = "dengan";
    }
  });
}

/**
 * Slot Replacement: Pasal 8 Tahun Buku Pertama Kali Ditutup (P_130)
 * Output: "tanggal [closingDateNumeric] ([closingDateWords]);"
 */
function setPasal8TutupBukuSlots(
  p: Element,
  closingDateNumeric: string,
  closingDateWords: string
): void {
  const runs = getDirectChildElements(p, "r");
  runs.forEach((r, idx) => {
    const t = getSingleElement(r, "t");
    if (!t) return;
    if (idx === 0) {
      t.textContent = "tanggal ";
    } else if (idx === 1) {
      t.textContent = `${closingDateNumeric} `;
    } else if (idx >= 2 && idx <= 3) {
      t.textContent = "";
    } else if (idx === 4) {
      t.textContent = `(${closingDateWords});`;
    } else if (idx >= 5 && idx <= 9) {
      t.textContent = "";
    }
  });
}

// -------------------------------------------------------------------------------------
// TEMPLATE-DRIVEN CV DEED GENERATOR (SINGLE SOURCE OF TRUTH MASTER TEMPLATE)
// -------------------------------------------------------------------------------------
export const generatePendirianCVDocx = async (
  inputData: any,
  returnBlob: boolean = false
): Promise<{ filename: string; blob: Blob } | void> => {
  if (!inputData) {
    throw new Error("Data pendirian CV tidak boleh kosong");
  }

  // 1. Map input profile to CVProfile
  const data: CVProfile = mapCompanyProfileToCV(inputData);
  const cleanName = cleanCompanyName(data.namaCV || "").toUpperCase();
  const cvTitleFormatted = `"CV. ${cleanName}”`;

  // 2. Fetch master template_pendirian_cv.docx
  const response = await fetch("/template_pendirian_cv.docx");
  if (!response.ok) {
    throw new Error(`Gagal mengunduh template_pendirian_cv.docx: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  // 3. Load OOXML as ZIP and parse word/document.xml
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Template tidak valid: word/document.xml tidak ditemukan");
  }
  const originalXml = await docXmlFile.async("text");

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(originalXml, "text/xml");

  const parseError = xmlDoc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    throw new Error("Gagal mengurai XML template: " + parseError[0].textContent);
  }

  const body = getSingleElement(xmlDoc, "body");
  if (!body) {
    throw new Error("Template tidak valid: <w:body> tidak ditemukan");
  }

  const paragraphs = getElements(body, "p");
  if (paragraphs.length === 0) {
    throw new Error("Template tidak memiliki paragraf");
  }

  // Helper to find paragraph index by content pattern
  const findPIndex = (
    predicate: (text: string, p: Element) => boolean,
    startFrom: number = 0
  ): number => {
    for (let i = startFrom; i < paragraphs.length; i++) {
      if (predicate(getTextContent(paragraphs[i]), paragraphs[i])) {
        return i;
      }
    }
    return -1;
  };

  // -----------------------------------------------------------------------------------
  // 1. DATA CV / HEADER & PREAMBLE (SEMANTIC TEXT-SLOT REPLACEMENT)
  // -----------------------------------------------------------------------------------
  // P_0: PENDIRIAN PERSEROAN KOMANDITER (Static from template)

  // P_1: CV Title Header (Slot replacement)
  const idxTitle = findPIndex((t) => t.includes("CV.") || t.includes('"'));
  if (idxTitle !== -1) {
    setCVTitleSlots(paragraphs[idxTitle], cleanName);
  }

  // P_2: Nomor Akta (Slot replacement)
  const idxNomor = findPIndex((t) => t.startsWith("Nomor :") || t.startsWith("Nomor:"));
  if (idxNomor !== -1) {
    const nomorAktaStr = data.nomorAkta || "02";
    setAktaNomorSlots(paragraphs[idxNomor], nomorAktaStr);
  }

  // P_4: Hari & Tanggal Preamble (Slot replacement)
  const idxDate = findPIndex((t) => t.startsWith("Pada hari ini"));
  if (idxDate !== -1) {
    const hDate = new Date(data.tanggal || new Date());
    const isDateValid = !isNaN(hDate.getTime());
    const hari = isDateValid
      ? ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][hDate.getDay()]
      : "............................";
    const tglHuruf = data.tanggal ? dateToWords(data.tanggal) : "............................";
    const tglAngka = data.tanggal ? formatDateStr(data.tanggal) : "............................";

    setPreambleDateSlots(paragraphs[idxDate], hari, tglHuruf, tglAngka);
  }

  // P_5: Waktu Preamble (Slot replacement)
  const idxTime = findPIndex((t) => t.startsWith("Pukul"));
  if (idxTime !== -1) {
    const rawTime = data.waktu || "10:00";
    const cleanTime = rawTime.replace(/WIB/i, "").trim() || "10:00";
    const waktuWords = timeToWords(cleanTime);
    setPreambleTimeSlots(paragraphs[idxTime], cleanTime, waktuWords);
  }

  // P_6..P_9: NOTARIS STATIS (Preserved 100% from template)

  // -----------------------------------------------------------------------------------
  // 2. DYNAMIC PENGHADAP BLOCK (KOMPARISI - CLONED FROM TEMPLATE BLOCK)
  // -----------------------------------------------------------------------------------
  const idxPenghadapIntro = findPIndex((t) =>
    t.includes("dan akan disebut pada bagian akhir akta ini")
  );
  const idxPenghadapEnd = findPIndex(
    (t) => t.includes("Para penghadap telah memperkenalkan diri"),
    idxPenghadapIntro !== -1 ? idxPenghadapIntro : 0
  );

  if (idxPenghadapIntro !== -1 && idxPenghadapEnd !== -1 && idxPenghadapEnd > idxPenghadapIntro) {
    // Exemplar paragraph structures from template
    const penghadapStartP = paragraphs[idxPenghadapIntro + 1];
    const penghadapExemplar = penghadapStartP.cloneNode(true) as Element;

    // Domicile paragraph exemplar (the one immediately preceding idxPenghadapEnd)
    const domisiliOriginalP = paragraphs[idxPenghadapEnd - 1];
    const domisiliExemplar = domisiliOriginalP.cloneNode(true) as Element;

    const notarisTempat =
      data.notarisTempat || data.notaryDomicile || "Kabupaten Bandung Barat";
    const peseros = data.peseros || [];

    const newPenghadapNodes: Element[] = [];

    // Clone and mutate PENGHADAP_BLOCK for each pesero
    peseros.forEach((p) => {
      const pNode = penghadapExemplar.cloneNode(true) as Element;
      const tglLahirHuruf = dateToWords(p.birthDate || "");
      const tglLahirAngka = formatDateStr(p.birthDate || "");
      const sal = (p.salutation || "Tuan").trim();
      const nameText = cleanPersonNameUpper(p.name || "");

      const addrUnion = typeof p.address === "object" ? p.address : null;
      const addressObj: Address =
        typeof p.address === "string"
          ? {
              fullAddress: p.address,
              province: "",
              city: "",
              rt: "",
              rw: "",
              kelurahan: "",
              kecamatan: "",
            }
          : {
              fullAddress: addrUnion?.fullAddress || "",
              province: addrUnion?.province || "",
              city: addrUnion?.city || "",
              rt: addrUnion?.rt || "",
              rw: addrUnion?.rw || "",
              kelurahan: addrUnion?.kelurahan || "",
              kecamatan: addrUnion?.kecamatan || "",
            };

      const details = formatPersonDetails(
        {
          birthCity: p.birthCity,
          birthDate: p.birthDate,
          nationalityType: p.nationalityType || "WNI",
          nationality: p.nationality || "Indonesia",
          occupation: p.occupation,
          address: addressObj,
          nik: p.nik,
        },
        tglLahirAngka,
        tglLahirHuruf,
        false
      );

      // Runs inside cloned paragraph: bold Salutation/Name + normal details + trailing tab
      setPenghadapSlots(pNode, sal, nameText, details);
      newPenghadapNodes.push(pNode);
    });

    // Domicile status paragraph
    const domisiliNode = domisiliExemplar.cloneNode(true) as Element;
    let domisiliText = `Untuk sementara berada di ${notarisTempat};`;
    if (peseros.length === 2) {
      domisiliText = `Keduanya berada di ${notarisTempat};`;
    } else if (peseros.length === 3) {
      domisiliText = `Ketiganya berada di ${notarisTempat};`;
    } else if (peseros.length >= 4) {
      domisiliText = `Para penghadap berada di ${notarisTempat};`;
    }
    setDomicileSlots(domisiliNode, domisiliText);
    newPenghadapNodes.push(domisiliNode);

    // Replace old range in body: remove template's original sample paragraphs
    const anchorNode = paragraphs[idxPenghadapEnd];
    for (let i = idxPenghadapIntro + 1; i < idxPenghadapEnd; i++) {
      if (paragraphs[i].parentNode) {
        paragraphs[i].parentNode?.removeChild(paragraphs[i]);
      }
    }
    for (const newNode of newPenghadapNodes) {
      body.insertBefore(newNode, anchorNode);
    }
  }

  // Refresh paragraph list for next sections
  const currentPs = getElements(body, "p");

  // -----------------------------------------------------------------------------------
  // 3. PASAL 1: NAMA DAN TEMPAT KEDUDUKAN (SEMANTIC TEXT-SLOT REPLACEMENT)
  // -----------------------------------------------------------------------------------
  const idxPasal1 = currentPs.findIndex((p) => getTextContent(p).includes("PASAL 1"));
  if (idxPasal1 !== -1) {
    const idxCvNamePasal1 = currentPs.findIndex(
      (p, i) =>
        i > idxPasal1 &&
        i < idxPasal1 + 8 &&
        (getTextContent(p).includes("CV.") || getTextContent(p).includes('"'))
    );
    if (idxCvNamePasal1 !== -1) {
      setPasal1NameSlots(currentPs[idxCvNamePasal1], cleanName);
    }

    const idxKedudukan = currentPs.findIndex(
      (p, i) =>
        i > idxPasal1 && i < idxPasal1 + 8 && getTextContent(p).includes("berkedudukan di")
    );
    if (idxKedudukan !== -1) {
      const kotaKedudukan = data.kotaKedudukan || "Kota Bandung";
      const alamatCV =
        data.alamatLengkapCV ||
        "Mekarwangi Nomor 28, Kelurahan Kebon Lega, Kecamatan Bojong Loa Kidul";
      setPasal1KedudukanSlots(currentPs[idxKedudukan], kotaKedudukan, alamatCV);

      // Remove template's 2nd continuation line if present so old sample address does not leak
      const nextP = currentPs[idxKedudukan + 1];
      if (
        nextP &&
        !getTextContent(nextP).includes("PASAL 2") &&
        (getTextContent(nextP).includes("Nomor 28") ||
          getTextContent(nextP).includes("Kelurahan Kebon") ||
          getTextContent(nextP).includes("Bojong Loa"))
      ) {
        if (nextP.parentNode) {
          nextP.parentNode.removeChild(nextP);
        }
      }
    }
  }

  // -----------------------------------------------------------------------------------
  // 4. PASAL 2: JANGKA WAKTU BERDIRINYA (SEMANTIC TEXT-SLOT REPLACEMENT)
  // -----------------------------------------------------------------------------------
  const idxPasal2 = currentPs.findIndex((p) => getTextContent(p).includes("PASAL 2"));
  if (idxPasal2 !== -1) {
    const idxDuration = currentPs.findIndex(
      (p, i) => i > idxPasal2 && i < idxPasal2 + 6 && getTextContent(p).includes("jangka waktu")
    );
    if (idxDuration !== -1) {
      const durationText = data.duration || "tidak terbatas";
      setPasal2DurationSlots(currentPs[idxDuration], durationText);
    }
  }

  // -----------------------------------------------------------------------------------
  // 5. DYNAMIC KBLI BLOCK (PASAL 3 - CLONED FROM TEMPLATE BLOCK)
  // -----------------------------------------------------------------------------------
  const idxPasal3 = currentPs.findIndex((p) => getTextContent(p).includes("PASAL 3"));
  const idxPasal4 = currentPs.findIndex(
    (p, i) => i > idxPasal3 && getTextContent(p).includes("PASAL 4")
  );

  if (idxPasal3 !== -1 && idxPasal4 !== -1) {
    // 1. Update KBLI main activity category header
    const idxMainCategory = currentPs.findIndex(
      (p, i) =>
        i > idxPasal3 &&
        i < idxPasal4 &&
        (getTextContent(p).includes("Perdagangan") ||
          getTextContent(p).includes(" - ") ||
          p.getElementsByTagNameNS(W_NS, "numPr").length > 0) &&
        !getTextContent(p).includes("kegiatan usaha sebagai berikut") &&
        !getTextContent(p).includes("Maksud dan tujuan")
    );

    if (idxMainCategory !== -1) {
      const mainActivity =
        data.mainActivityDescription ||
        "G - Perdagangan Besar Dan Eceran; Reparasi Dan Perawatan Mobil Dan Sepeda Motor";
      setPasal3MainCategorySlots(currentPs[idxMainCategory], mainActivity);

      // Clean template 2nd line fragment (" Motor") if present
      const nextP = currentPs[idxMainCategory + 1];
      if (
        nextP &&
        !getTextContent(nextP).includes("kegiatan usaha") &&
        !getTextContent(nextP).includes("Maksud dan tujuan") &&
        getTextContent(nextP).trim() === "Motor"
      ) {
        if (nextP.parentNode) {
          nextP.parentNode.removeChild(nextP);
        }
      }
    }

    // 2. Identify KBLI template exemplars
    const idxKbliActivityHeader = currentPs.findIndex(
      (p, i) =>
        i > idxPasal3 &&
        i < idxPasal4 &&
        getTextContent(p).includes("kegiatan usaha sebagai berikut")
    );

    const idxModalHeader = currentPs.findIndex(
      (p, i) =>
        i > idxPasal3 &&
        i <= idxPasal4 &&
        (getTextContent(p).includes("M O D A L") || getTextContent(p).includes("MODAL"))
    );

    if (idxKbliActivityHeader !== -1 && idxModalHeader !== -1) {
      const kbliStartIdx = idxKbliActivityHeader + 1;
      const kbliEndIdx = idxModalHeader;

      // Exemplars directly from master template (P_53 for title, P_54 for desc)
      const kbliTitleExemplar = currentPs[kbliStartIdx].cloneNode(true) as Element;
      const kbliDescExemplar =
        kbliStartIdx + 1 < kbliEndIdx
          ? (currentPs[kbliStartIdx + 1].cloneNode(true) as Element)
          : (kbliTitleExemplar.cloneNode(true) as Element);

      // Cloned empty separator from template (paragraph immediately preceding M O D A L)
      const templateSeparator =
        kbliEndIdx > kbliStartIdx + 1
          ? (currentPs[kbliEndIdx - 1].cloneNode(true) as Element)
          : (currentPs[kbliStartIdx].cloneNode(true) as Element);

      const kbliItems = data.kbliItems || [];
      const newKbliNodes: Element[] = [];

      if (kbliItems.length === 0) {
        const titleNode = kbliTitleExemplar.cloneNode(true) as Element;
        setKbliTitleSlots(titleNode, "46411", "PERDAGANGAN BESAR TEKSTIL");
        newKbliNodes.push(titleNode);

        const descNode = kbliDescExemplar.cloneNode(true) as Element;
        setKbliDescSlots(
          descNode,
          "Mencakup usaha perdagangan besar hasil industri tekstil, seperti bermacam-macam tekstil/kain, kain batik dan lain-lain. Termasuk barang linen rumah tangga (bahan kain untuk keperluan rumah tangga) dan lain-lain."
        );
        newKbliNodes.push(descNode);
      } else {
        kbliItems.forEach((item) => {
          const codeStr = item.code || item.id || "";
          const titleStr = (item.name || item.description || "").toUpperCase();
          const descStr = item.description || item.uraian || "";

          const titleNode = kbliTitleExemplar.cloneNode(true) as Element;
          setKbliTitleSlots(titleNode, codeStr, titleStr);
          newKbliNodes.push(titleNode);

          if (descStr) {
            const descNode = kbliDescExemplar.cloneNode(true) as Element;
            setKbliDescSlots(descNode, descStr);
            newKbliNodes.push(descNode);
          }
        });
      }

      // Append cloned template empty separator before M O D A L header
      newKbliNodes.push(templateSeparator);

      // Remove old KBLI paragraphs and insert new ones
      const anchorModal = currentPs[idxModalHeader];
      for (let i = kbliStartIdx; i < kbliEndIdx; i++) {
        if (currentPs[i].parentNode) {
          currentPs[i].parentNode?.removeChild(currentPs[i]);
        }
      }
      for (const node of newKbliNodes) {
        body.insertBefore(node, anchorModal);
      }
    }
  }

  // Refresh paragraph list for Modal & Pesero sections
  const psAfterKbli = getElements(body, "p");

  // -----------------------------------------------------------------------------------
  // 6. DYNAMIC MODAL PESERO BLOCK (PASAL 4 - CLONED FROM TEMPLATE BLOCK)
  // -----------------------------------------------------------------------------------
  const idxPasal4Updated = psAfterKbli.findIndex((p) => getTextContent(p).includes("PASAL 4"));
  const idxPasal5 = psAfterKbli.findIndex(
    (p, i) => i > idxPasal4Updated && getTextContent(p).toUpperCase().includes("PASAL 5")
  );

  if (idxPasal4Updated !== -1 && idxPasal5 !== -1) {
    const peseros = data.peseros || [];
    const calculatedSum = peseros.reduce((sum, p) => sum + (p.modalContribution || 0), 0);
    const totalCapital = data.modalTotal || calculatedSum || 100000000;
    const totalCapitalWords = terbilang(totalCapital);
    const totalCapitalFormatted = formatNumber(totalCapital);

    // 1. Update total capital paragraph in Pasal 4
    const idxTotalModal = psAfterKbli.findIndex(
      (p, i) =>
        i > idxPasal4Updated &&
        i < idxPasal5 &&
        getTextContent(p).includes("Modal perseroan ini berjumlah")
    );
    if (idxTotalModal !== -1) {
      setPasal4TotalCapitalSlots(
        psAfterKbli[idxTotalModal],
        totalCapitalFormatted,
        totalCapitalWords
      );
    }

    // 2. Identify modal list items
    const idxModalListIntro = psAfterKbli.findIndex(
      (p, i) =>
        i > idxPasal4Updated &&
        i < idxPasal5 &&
        (getTextContent(p).includes("berikut :") || getTextContent(p).includes("susunan sebagai"))
    );

    // Find the outro where the modal list ends
    const idxModalListOutro = psAfterKbli.findIndex(
      (p, i) =>
        i > (idxModalListIntro !== -1 ? idxModalListIntro : idxPasal4Updated) &&
        i < idxPasal5 &&
        getTextContent(p).includes("Para pesero masing-masing dicatat")
    );

    if (idxModalListIntro !== -1 && idxModalListOutro !== -1) {
      let modalStartIdx = idxModalListIntro + 1;
      if (getTextContent(psAfterKbli[modalStartIdx]).includes("berikut :")) {
        modalStartIdx += 1;
      }

      // Use the cleaner 6-run structure exemplar (P_67 if available, otherwise P_66)
      const modalExemplar =
        modalStartIdx + 1 < idxModalListOutro
          ? (psAfterKbli[modalStartIdx + 1].cloneNode(true) as Element)
          : (psAfterKbli[modalStartIdx].cloneNode(true) as Element);

      const newModalNodes: Element[] = [];
      peseros.forEach((p) => {
        const mNode = modalExemplar.cloneNode(true) as Element;
        const amount = p.modalContribution || 0;
        const amountFormatted = formatNumber(amount);
        const amountWords = terbilang(amount);
        const nameFormatted = toTitleCase(cleanPersonNameUpper(p.name));

        setModalPeseroSlots(mNode, nameFormatted, amountFormatted, amountWords);
        newModalNodes.push(mNode);
      });

      const anchorOutro = psAfterKbli[idxModalListOutro];
      for (let i = modalStartIdx; i < idxModalListOutro; i++) {
        if (psAfterKbli[i].parentNode) {
          psAfterKbli[i].parentNode?.removeChild(psAfterKbli[i]);
        }
      }
      for (const node of newModalNodes) {
        body.insertBefore(node, anchorOutro);
      }
    }
  }

  // Refresh paragraph list for Pasal 5 & 6
  const psAfterModal = getElements(body, "p");

  // -----------------------------------------------------------------------------------
  // 7. DYNAMIC PESERO PENGURUS & KOMANDITER BLOCK (PASAL 5)
  // -----------------------------------------------------------------------------------
  const idxPasal5Updated = psAfterModal.findIndex((p) =>
    getTextContent(p).toUpperCase().includes("PASAL 5")
  );
  const idxPasal6 = psAfterModal.findIndex(
    (p, i) => i > idxPasal5Updated && getTextContent(p).toUpperCase().includes("PASAL 6")
  );

  if (idxPasal5Updated !== -1 && idxPasal6 !== -1) {
    const peseros = data.peseros || [];
    const pengurusList = peseros.filter((p) => (p.role || "").toUpperCase() === "PENGURUS");
    const komanditerList = peseros.filter((p) => (p.role || "").toUpperCase() === "KOMANDITER");

    const effectivePengurus =
      pengurusList.length > 0 ? pengurusList : peseros.length > 0 ? [peseros[0]] : [];
    const effectiveKomanditer =
      komanditerList.length > 0
        ? komanditerList
        : peseros.length > 1
        ? peseros.slice(1)
        : peseros.length > 0
        ? [peseros[0]]
        : [];

    const pengurusFormatted =
      effectivePengurus
        .map((p) => formatPersonWithSalutation(p))
        .join(", ") || "Tuan DIREKTUR";

    // 1. Update Pesero Pengurus paragraph in Pasal 5
    const idxPeseroPengurus = psAfterModal.findIndex(
      (p, i) =>
        i > idxPasal5Updated &&
        i < idxPasal6 &&
        (getTextContent(p).includes("Pesero Tuan") ||
          getTextContent(p).includes("tersebut bertindak dalam perseroan") ||
          getTextContent(p).includes("HEDY BUDIMAN"))
    );
    if (idxPeseroPengurus !== -1) {
      setPasal5PengurusSlots(psAfterModal[idxPeseroPengurus], pengurusFormatted);
    }

    // 2. Update Pesero Komanditer list in Pasal 5
    const idxKomanditerIntro = psAfterModal.findIndex(
      (p, i) =>
        i > idxPasal5Updated &&
        i < idxPasal6 &&
        (getTextContent(p).includes("pesero lainnya, yaitu") || getTextContent(p).includes("yaitu :"))
    );

    const idxKomanditerOutro = psAfterModal.findIndex(
      (p, i) =>
        i > (idxKomanditerIntro !== -1 ? idxKomanditerIntro : idxPasal5Updated) &&
        i < idxPasal6 &&
        getTextContent(p).includes("sebagai Pesero Komanditer")
    );

    if (
      idxKomanditerIntro !== -1 &&
      idxKomanditerOutro !== -1 &&
      idxKomanditerOutro > idxKomanditerIntro
    ) {
      const komanditerStartIdx = idxKomanditerIntro + 1;
      const komanditerExemplar = psAfterModal[komanditerStartIdx].cloneNode(true) as Element;

      const newKomanditerNodes: Element[] = [];
      effectiveKomanditer.forEach((k) => {
        const kNode = komanditerExemplar.cloneNode(true) as Element;
        const sal = (k.salutation || "Tuan").trim();
        const nameUpper = cleanPersonNameUpper(k.name || "");
        setKomanditerSlots(kNode, sal, nameUpper);
        newKomanditerNodes.push(kNode);
      });

      const anchorKomanditerOutro = psAfterModal[idxKomanditerOutro];
      for (let i = komanditerStartIdx; i < idxKomanditerOutro; i++) {
        if (psAfterModal[i].parentNode) {
          psAfterModal[i].parentNode?.removeChild(psAfterModal[i]);
        }
      }
      for (const node of newKomanditerNodes) {
        body.insertBefore(node, anchorKomanditerOutro);
      }
    }
  }

  // Refresh paragraph list for Pasal 6
  const psAfterPasal5 = getElements(body, "p");

  // -----------------------------------------------------------------------------------
  // 8. PASAL 6: PENGURUSAN PERSEROAN (SEMANTIC TEXT-SLOT REPLACEMENT)
  // -----------------------------------------------------------------------------------
  const idxPasal6Updated = psAfterPasal5.findIndex((p) =>
    getTextContent(p).toUpperCase().includes("PASAL 6")
  );
  if (idxPasal6Updated !== -1) {
    const idxDirektur = psAfterPasal5.findIndex(
      (p, i) =>
        i > idxPasal6Updated &&
        i < idxPasal6Updated + 5 &&
        getTextContent(p).includes("Perseroan ini diurus dan dipimpin oleh")
    );

    if (idxDirektur !== -1) {
      const peseros = data.peseros || [];
      const pengurusList = peseros.filter((p) => (p.role || "").toUpperCase() === "PENGURUS");
      const effectivePengurus =
        pengurusList.length > 0 ? pengurusList : peseros.length > 0 ? [peseros[0]] : [];

      const pengurusFormatted =
        effectivePengurus
          .map((p) => formatPersonWithSalutation(p))
          .join(", ") || "Tuan DIREKTUR";

      setPasal6DirekturSlots(psAfterPasal5[idxDirektur], pengurusFormatted);
    }
  }

  // -----------------------------------------------------------------------------------
  // 8.5. PASAL 8: TAHUN BUKU PERTAMA KALI DITUTUP (SEMANTIC TEXT-SLOT REPLACEMENT)
  // -----------------------------------------------------------------------------------
  const psAfterPasal6 = getElements(body, "p");
  const idxPasal8 = psAfterPasal6.findIndex((p) =>
    getTextContent(p).toUpperCase().includes("PASAL 8")
  );
  if (idxPasal8 !== -1) {
    const idxTutupBuku = psAfterPasal6.findIndex(
      (p, i) =>
        i > idxPasal8 &&
        i < idxPasal8 + 15 &&
        (getTextContent(p).includes("31-12-2022") ||
          (getTextContent(p).includes("tanggal 31-12") && getTextContent(p).includes("Desember")) ||
          (getTextContent(p).startsWith("tanggal") && getTextContent(p).includes("Desember")))
    );

    if (idxTutupBuku !== -1) {
      const signingYear = data.tanggal
        ? new Date(data.tanggal).getFullYear()
        : new Date().getFullYear();
      const validYear = isNaN(signingYear) ? new Date().getFullYear() : signingYear;
      const closingDateNumeric = `31-12-${validYear}`;
      const closingDateWords = `tigapuluh satu Desember ${terbilang(validYear).replace(
        /\s+/g,
        " "
      )}`;

      setPasal8TutupBukuSlots(
        psAfterPasal6[idxTutupBuku],
        closingDateNumeric,
        closingDateWords
      );
    }
  }

  // -----------------------------------------------------------------------------------
  // 9. STATIC CONTENT PRESERVATION (PASAL 7 - 14, SAKSI, NOTARIS, SIGNATURES)
  // All remaining sections are 100% untouched and preserved directly from master template.
  // -----------------------------------------------------------------------------------

  // -----------------------------------------------------------------------------------
  // 10. PRE-OUTPUT XML VALIDATION AUDIT
  // -----------------------------------------------------------------------------------
  const finalPs = getElements(body, "p");
  if (finalPs.length < 50) {
    throw new Error("Validasi XML gagal: jumlah paragraf terlalu sedikit");
  }

  // Verify Saksi & Notaris preservation
  const hasSaksiNendi = finalPs.some((p) => getTextContent(p).includes("Nendi Suhendi"));
  const hasNotarisNukantini = finalPs.some((p) =>
    getTextContent(p).includes("NUKANTINI PUTRI PARINCHA")
  );
  if (!hasSaksiNendi || !hasNotarisNukantini) {
    throw new Error(
      "Validasi XML gagal: data Saksi atau Notaris statis template tidak boleh hilang"
    );
  }

  // 11. Serialize and output DOCX
  const serializer = new XMLSerializer();
  let finalXml = serializer.serializeToString(xmlDoc);
  if (!finalXml.startsWith("<?xml")) {
    finalXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + finalXml;
  }

  zip.file("word/document.xml", finalXml);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const safeName = `CV_${cleanName}`.replace(/\s+/g, "_");
  const fileName = `Akta_Pendirian_${safeName}.docx`;

  if (returnBlob) {
    return { filename: fileName, blob };
  }

  saveAs(blob, fileName);
};
