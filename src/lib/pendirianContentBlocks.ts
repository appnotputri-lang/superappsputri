// ─────────────────────────────────────────────────────────────────────────────
// pendirianContentBlocks.ts  –  Builds the ordered Block[] for Akta Pendirian
// ─────────────────────────────────────────────────────────────────────────────

import {
  terbilang, toTitleCase, formatNumber, formatAddress,
  formatAktaDate, dateToWords, formatDateStr,
  formatPersonDetails, checkIsBadanHukum,
} from "./formatter";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Run {
  text: string;
  bold?: boolean;
}

export type Block =
  | { type: 'p'; runs: Run[]; align?: 'center' | 'right-center'; indentTabs?: number; kbliDesc?: boolean; hanging?: number }
  | { type: 'br' }
  | { type: 'divider'; text: string }
  | { type: 'pasal-divider'; text: string }
  | { type: 'numbered'; num: number | string; runs: Run[]; indentTabs?: number; subStartVal?: number; startVal?: number }
  | { type: 'sub-numbered'; num: number | string; runs: Run[]; indentTabs?: number }
  | { type: 'list'; bullet: string; runs: Run[]; indentTabs?: number }
  | { type: 'saksi'; num: number | string; runs: Run[] }
  | { type: 'shareholder'; name: string; sharesText: string; rpText: string; bullet?: string }
  | { type: 'management-role'; position: string; salutation: string; name: string }
  | { type: 'pt-name'; text: string };

export interface Address {
  fullAddress?: string;
  rt?: string;
  rw?: string;
  kelurahan?: string;
  kecamatan?: string;
  city?: string;
  province?: string;
}

export interface KbliItem {
  code: string;
  name: string;
  description?: string;
  categoryLetter?: string;
  categoryName?: string;
}

export interface Shareholder {
  salutation?: string;
  name: string;
  birthCity?: string;
  birthDate?: string;
  nationalityType?: "WNI" | "WNA";
  nationality?: string;
  occupation?: string;
  address?: Address;
  nik?: string;
  passportNumber?: string;
  kitasNumber?: string;
  sharesOwned: number;
  isManagement?: boolean;
  managementPosition?: string;
  shareholderType?: "PERORANGAN" | "BADAN_HUKUM";
  isForeign?: boolean;
  skNumber?: string;
  skDate?: string;
  legalEntityType?: string;
}

export interface PendirianData {
  namaPt: string;
  tanggal: string;
  waktu: string;
  nomorAkta?: string;
  notarisNamaSurat?: string;
  notarisTempat?: string;
  kotaKedudukan?: string;
  alamatLengkapPT?: string;
  modalDasar: number;
  nilaiPerLembar: number;
  modalDisetorPersen?: number;
  kuotaWaktuDireksi?: string;
  kbliItems?: KbliItem[];
  shareholders?: Shareholder[];
  saksi1Nama?: string;
  saksi1LahirTempat?: string;
  saksi1LahirTanggal?: string;
  saksi1Alamat?: string;
  saksi1NIK?: string;
  saksi2Nama?: string;
  saksi2LahirTempat?: string;
  saksi2LahirTanggal?: string;
  saksi2Alamat?: string;
  saksi2NIK?: string;
}

// ── KBLI category helper ──────────────────────────────────────────────────

const KBLI_CATEGORIES: Record<string, string> = {
  A: "Pertanian, Kehutanan Dan Perikanan",
  B: "Pertambangan Dan Penggalian",
  C: "Industri Pengolahan",
  D: "Pengadaan Listrik, Gas, Uap/Air Panas Dan Udara Dingin",
  E: "Treatment Air, Treatment Air Limbah, Treatment Dan Pemulihan Material Sampah, Dan Aktivitas Remediasi",
  F: "Konstruksi",
  G: "Perdagangan Besar Dan Eceran; Reparasi Dan Perawatan Mobil Dan Sepeda Motor",
  H: "Pengangkutan Dan Pergudangan",
  I: "Penyediaan Akomodasi Dan Penyediaan Makan Minum",
  J: "Informasi Dan Komunikasi",
  K: "Aktivitas Keuangan Dan Asuransi",
  L: "Real Estat",
  M: "Aktivitas Profesional, Ilmiah Dan Teknis",
  N: "Aktivitas Penyewaan Dan Sewa Guna Usaha Tanpa Hak Opsi, Ketenagakerjaan, Agen Perjalanan Dan Penunjang Usaha Lainnya",
  O: "Administrasi Pemerintahan, Pertahanan Dan Jaminan Sosial Wajib",
  P: "Pendidikan",
  Q: "Aktivitas Kesehatan Manusia Dan Aktivitas Sosial",
  R: "Kesenian, Hiburan Dan Rekreasi",
  S: "Aktivitas Jasa Lainnya",
  T: "Aktivitas Rumah Tangga Sebagai Pemberi Kerja",
  U: "Aktivitas Badan Internasional Dan Badan Ekstra Internasional Lainnya",
};

function formatKbliCategory(letter?: string, name?: string): string {
  if (!letter) return name || "LAIN-LAIN";
  const catName = KBLI_CATEGORIES[letter.toUpperCase()] || name || "";
  if (!catName) return letter;
  return toTitleCase(catName)
    .replace(/\bDan\b/g, "dan")
    .replace(/\bAtau\b/g, "atau")
    .replace(/\bDengan\b/g, "dengan")
    .replace(/\bUntuk\b/g, "untuk");
}

function getSectors(kbliItems: KbliItem[]): string[] {
  const letters = Array.from(
    new Set(kbliItems.map((k) => k.categoryLetter?.toUpperCase()).filter(Boolean))
  ) as string[];
  const sectors = letters
    .map((l) => {
      if (l === "G") return "Perdagangan";
      const cat = KBLI_CATEGORIES[l] || "";
      if (!cat) return "";
      return toTitleCase(cat)
        .replace(/\bDan\b/g, "dan")
        .replace(/\bAtau\b/g, "atau")
        .replace(/\bDengan\b/g, "dengan")
        .replace(/\bUntuk\b/g, "untuk");
    })
    .filter(Boolean);
  return sectors.length ? sectors : ["Perdagangan"];
}

// ── Main builder ──────────────────────────────────────────────────────────

export function generatePendirianBlocks(data: PendirianData): Block[] {
  const blocks: Block[] = [];
  const hDate = new Date(data.tanggal);
  const isDateValid = !isNaN(hDate.getTime());
  const hari = isDateValid
    ? ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][hDate.getDay()]
    : "............................";
  const tglHuruf = data.tanggal ? formatAktaDate(data.tanggal) : "............................";
  const shareholders = data.shareholders || [];
  const kbliItems = data.kbliItems || [];
  const termYears = parseInt(data.kuotaWaktuDireksi || "5") || 5;

  const cleanNamaPt = (data.namaPt || "").replace(/^PT\.?\s*/i, "").trim().toUpperCase();

  // ── HEADER ──────────────────────────────────────────────────────────────
  blocks.push(
    { type: "p", align: "center", runs: [{ text: "PENDIRIAN PERSEROAN TERBATAS", bold: true }] },
    { type: "p", align: "center", runs: [{ text: `PT. ${cleanNamaPt}`, bold: true }] },
    { type: "p", align: "center", runs: [{ text: `Nomor : ${data.nomorAkta || "............................"}` }] },
  );

  // ── OPENING ─────────────────────────────────────────────────────────────
  const notarisTempat = data.notarisTempat || "Kabupaten Bandung Barat";

  blocks.push(
    { type: "p", runs: [{ text: `Pada hari ini, ${hari}, ${tglHuruf}.` }] },
    { type: "p", runs: [{ text: `Pukul ${data.waktu} WIB Waktu Indonesia Barat.` }] },
    {
      type: "p",
      runs: [
        { text: "Telah hadir di hadapan saya, " },
        {
          text: toTitleCase(
            (data.notarisNamaSurat || "Nukantini Putri Parincha, Sarjana Hukum, Magister Kenotariatan")
              .replace(/\bSH\b\.?/gi, "Sarjana Hukum")
              .replace(/\bM\b\.?\s*\bKn\b\.?/gi, "Magister Kenotariatan")
          ),
          bold: true,
        },
        { text: ", Notaris di " },
        {
          text: toTitleCase(notarisTempat),
          bold: true,
        },
        { text: ", dengan dihadiri oleh saksi-saksi yang saya, Notaris kenal dan akan disebutkan nama-namanya pada bagian akhir akta ini :" },
      ],
    },
  );

  // ── SHAREHOLDERS (penghadap) ─────────────────────────────────────────────
  const shareholderDetails = shareholders.map((p) => {
    const tglLahirHuruf = dateToWords(p.birthDate || "");
    const tglLahirAngka = formatDateStr(p.birthDate || "");

    const sal = (p.salutation || "Tuan").trim();
    const salUpper = sal.toUpperCase();
    let nameText = p.name.toUpperCase().trim();
    const stripRe = new RegExp(`^(${salUpper}|TUAN|NYONYA|NONA|NY|TN|NY\\.|TN\\.|NYONYA\\.|TUAN\\.)\\s+`, "i");
    nameText = nameText.replace(stripRe, "").trim();

    const isBH = checkIsBadanHukum(p);
    let namePrefix = isBH ? "" : `${sal} `;
    let details = "";

    let customRuns: Run[] | undefined = undefined;

    let repDetailsStr: string | undefined = undefined;

    if (isBH) {
      // Determine representative position: "Direktur Utama" if no "Direktur" is present in the structure
      const repPosition = (p as any).representativePosition;
      let finalPosition = "Direktur Utama";
      if (repPosition) {
        finalPosition = String(repPosition);
      } else {
        const hasDirektur = shareholders.some(s => s.isManagement && String(s.managementPosition || "").toLowerCase() === "direktur");
        finalPosition = hasDirektur ? "Direktur" : "Direktur Utama";
      }

      const repName = (p as any).guardianName || (p as any).representativeName || (p as any).proxyData?.name || "................";
      const repSal = (p as any).guardianSalutation || (p as any).representativeSalutation || (p as any).proxyData?.salutation || "Tuan";
      
      const repPerson = {
        birthCity: (p as any).guardianBirthCity || "",
        birthDate: (p as any).guardianBirthDate || "",
        nationalityType: (p as any).guardianNationalityType || "WNI",
        nationality: (p as any).guardianNationality || "Indonesia",
        occupation: (p as any).guardianOccupation || "WIRASWASTA",
        address: (p as any).guardianAddress,
        nik: (p as any).guardianNik || "",
        passportNumber: (p as any).guardianPassportNumber || "",
        kitasNumber: (p as any).guardianKitasNumber || "",
        isForeign: (p as any).guardianNationalityType === "WNA",
      };
      
      const repDetails = formatPersonDetails(repPerson as any, formatDateStr(repPerson.birthDate), dateToWords(repPerson.birthDate), true);
      repDetailsStr = repDetails;
      const ptDetails = formatPersonDetails(p as any, tglLahirAngka, tglLahirHuruf, true);
      
      namePrefix = `${repSal} `;
      nameText = repName.toUpperCase();
      
      // We don't want the ptDetails to have "yang dalam hal ini diwakili oleh...", we already handled it. 
      // ptDetails for BADAN_HUKUM starts with `, berkedudukan di...` or `, sebuah badan hukum asing...`
      const ptName = `PT ${p.name.toUpperCase().replace(/^(PT|PT\.|P\.T\.|P\.T|PERSEROAN TERBATAS)\s*/i, "")}`;
      
      customRuns = [
        { text: `${namePrefix}${nameText}`, bold: true },
        { text: `${repDetails};\n- Hadir selaku ${finalPosition} dari` },
        { text: ` ${ptName}`, bold: true },
        { text: `${ptDetails}.` }
      ];
    } else {
      details = formatPersonDetails(p as any, tglLahirAngka, tglLahirHuruf, true);
    }

    return {
      p,
      namePrefix,
      nameText,
      details,
      isBH,
      repDetails: repDetailsStr,
      customRuns
    };
  });

  shareholderDetails.forEach((sd, idx) => {
    blocks.push({
      type: "numbered",
      num: idx + 1,
      runs: sd.customRuns || [
        { text: `${sd.namePrefix}${sd.nameText}`, bold: true },
        { text: `${sd.details}.` },
      ],
    });
  });

  // ── TEMPORARY DOMICILE CLAUSE (Untuk sementara...) ─────────────────────
  const outsideCount = shareholderDetails.filter(sd => {
    // Extract city name directly from formatted "bertempat tinggal di [city]," text to ensure perfect sync
    const detailsStr = sd.isBH ? (sd.repDetails || "") : sd.details;
    const marker = "bertempat tinggal di ";
    const markerIdx = detailsStr.indexOf(marker);
    if (markerIdx === -1) return false;
    
    const start = markerIdx + marker.length;
    const end = detailsStr.indexOf(",", start);
    const cityStr = end === -1 
      ? detailsStr.substring(start).trim() 
      : detailsStr.substring(start, end).trim();

    if (!cityStr) return false;

    // Compare with notary domicile robustly
    const clean = (str: string) => {
      return str
        .toLowerCase()
        .replace(/\bkabupaten\b/gi, "")
        .replace(/\bkab\b\.?/gi, "")
        .replace(/\bkota\b/gi, "")
        .replace(/\bpropinsi\b/gi, "")
        .replace(/\bprovinsi\b/gi, "")
        .replace(/\bdaerah khusus ibukota\b/gi, "")
        .replace(/\bdki\b/gi, "")
        .replace(/\badministrasi\b/gi, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
    };

    const c = clean(cityStr);
    const n = clean(notarisTempat);

    if (!c || !n) return false;
    if (c === n) return false;
    if ((c === "kbb" && n === "bandungbarat") || (c === "bandungbarat" && n === "kbb")) return false;
    
    return true;
  }).length;

  if (outsideCount > 0) {
    let stayText = "";
    if (outsideCount === 1) {
      stayText = `-\tUntuk sementara berada di ${toTitleCase(notarisTempat)};`;
    } else if (outsideCount === 2) {
      stayText = `-\tUntuk sementara keduanya berada di ${toTitleCase(notarisTempat)};`;
    } else if (outsideCount === 3) {
      stayText = `-\tUntuk sementara ketiganya berada di ${toTitleCase(notarisTempat)};`;
    } else if (outsideCount === 4) {
      stayText = `-\tUntuk sementara keempatnya berada di ${toTitleCase(notarisTempat)};`;
    } else {
      stayText = `-\tUntuk sementara semuanya berada di ${toTitleCase(notarisTempat)};`;
    }

    blocks.push({
      type: "p",
      indentTabs: 1,
      hanging: 284,
      runs: [{ text: stayText }],
    });
  }

  // ── PARA PENGHADAP CLAUSE ────────────────────────────────────────────────
  blocks.push({
    type: "p",
    runs: [
      { text: "Para Penghadap bertindak dalam kedudukannya tersebut di atas, menerangkan, bahwa\n" },
      { text: "dengan tidak mengurangi izin dari pihak yang berwenang telah sepakat dan setuju untuk\n" },
      { text: "bersama-sama mendirikan suatu perseroan terbatas dengan anggaran dasar\n" },
      { text: "sebagaimana yang termuat dalam akta pendirian ini, (untuk selanjutnya cukup disingkat\n" },
      { text: "dengan \"" },
      { text: "Anggaran Dasar", bold: true },
      { text: "\") sebagai berikut :" }
    ],
  });

  // ── PASAL 1 – NAMA DAN TEMPAT KEDUDUKAN ─────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "NAMA DAN TEMPAT KEDUDUKAN" },
    { type: "pasal-divider", text: "PASAL 1" },
    {
      type: "numbered", num: 1,
      runs: [{ text: "Perseroan Terbatas ini bernama Perseroan Terbatas :" }],
    },
    { type: "pt-name", text: `PT. ${cleanNamaPt}` },
    {
      type: "p", indentTabs: 0.5,
      runs: [
        { text: '(selanjutnya dalam Anggaran Dasar ini cukup disingkat dengan "' },
        { text: 'Perseroan', bold: true },
        { text: `"), berkedudukan di ${toTitleCase(data.kotaKedudukan || "")}${data.alamatLengkapPT ? ", " + data.alamatLengkapPT : ""}.` }
      ]
    },
    {
      type: "numbered", num: 2,
      runs: [{ text: "Perseroan dapat membuka kantor cabang atau kantor perwakilan, baik di dalam maupun di luar wilayah Republik Indonesia sebagaimana ditetapkan oleh Direksi, dengan persetujuan Rapat Umum Pemegang Saham." }],
    },
  );

  // ── PASAL 2 – JANGKA WAKTU ──────────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "JANGKA WAKTU BERDIRINYA PERSEROAN" },
    { type: "pasal-divider", text: "PASAL 2" },
    { type: "p", runs: [{ text: "Perseroan didirikan untuk jangka waktu yang tidak terbatas." }] },
  );

  // ── PASAL 3 – MAKSUD & TUJUAN ────────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "MAKSUD DAN TUJUAN SERTA KEGIATAN USAHA" },
    { type: "pasal-divider", text: "PASAL 3" },
    { type: "numbered", num: 1, runs: [{ text: "Maksud dan Tujuan Perseroan adalah berusaha dalam bidang :" }] },
  );
  
  const categoryNames = Array.from(
    new Set(kbliItems.map(k => {
      if (k.categoryName) return k.categoryName;
      if (k.categoryLetter && KBLI_CATEGORIES[k.categoryLetter.toUpperCase()]) {
        return KBLI_CATEGORIES[k.categoryLetter.toUpperCase()];
      }
      return "Lain-lain";
    }))
  ).map(cat => toTitleCase(cat).replace(/\bDan\b/g, "dan").replace(/\bAtau\b/g, "atau"));

  categoryNames.forEach((cat) => {
    blocks.push({ type: "list", bullet: "-", runs: [{ text: `${cat}` }] });
  });

  blocks.push({
    type: "numbered", num: 2,
    runs: [{ text: "Untuk mencapai maksud dan tujuan tersebut diatas, perseroan dapat melaksanakan kegiatan usaha sebagai berikut :" }],
  });

  kbliItems.forEach((kbli) => {
    blocks.push({
      type: "list", bullet: "-",
      runs: [{ text: `${kbli.code} - ${kbli.name};`, bold: true }],
    });
    if (kbli.description) {
      blocks.push({ type: "p", kbliDesc: true, indentTabs: 0.5, runs: [{ text: kbli.description }] });
    }
  });


  // ── PASAL 4 – MODAL ──────────────────────────────────────────────────────
  const totalLembar = data.modalDasar / data.nilaiPerLembar;
  const persen = data.modalDisetorPersen ?? 25;
  const modalDisetor = (data.modalDasar * persen) / 100;
  const disetorLembar = (totalLembar * persen) / 100;

  blocks.push(
    { type: "pasal-divider", text: "M O D A L" },
    { type: "pasal-divider", text: "PASAL 4" },
    {
      type: "numbered", num: 1,
      runs: [
        { text: "Modal Dasar Perseroan berjumlah " },
        { text: `Rp. ${formatNumber(data.modalDasar)},-`, bold: true },
        { text: ` (${terbilang(data.modalDasar)} rupiah), terbagi atas ${formatNumber(totalLembar)} (${terbilang(totalLembar)}) lembar saham, masing-masing saham bernilai nominal ` },
        { text: `Rp. ${formatNumber(data.nilaiPerLembar)},-`, bold: true },
        { text: ` (${terbilang(data.nilaiPerLembar)} rupiah).` }
      ],
    },
    {
      type: "numbered", num: 2,
      runs: [
        { text: "Dari modal dasar tersebut telah ditempatkan dan disetor " },
        { text: `${persen}%`, bold: true },
        { text: ` (${terbilang(persen)} persen) atau sejumlah ${formatNumber(disetorLembar)} (${terbilang(disetorLembar)}) lembar saham dengan nilai nominal seluruhnya sebesar ` },
        { text: `Rp. ${formatNumber(modalDisetor)},-`, bold: true },
        { text: ` (${terbilang(modalDisetor)} rupiah), oleh Para Pendiri yang telah mengambil bagian saham dan rincian serta nilai nominal saham yang disebutkan pada bagian akhir sebelum penutup akta.` }
      ],
    },
    {
      type: "numbered", num: 3,
      runs: [{ text: "Saham-saham yang masih dalam simpanan akan dikeluarkan oleh Perseroan menurut keperluan modal kerja Perseroan, dengan persetujuan Rapat Umum Pemegang Saham. Para pemegang saham yang namanya tercatat dalam Daftar Pemegang Saham mempunyai hak terlebih dahulu untuk mengambil bagian atas saham yang hendak dikeluarkan itu dalam jangka waktu 14 (empatbelas) hari sejak tanggal penawaran dilakukan dan masing-masing pemegang saham berhak mengambil bagian seimbang dengan jumlah saham yang mereka miliki (proporsional) baik terhadap saham yang menjadi bagiannya maupun terhadap sisa saham yang tidak diambil oleh pemegang saham lainnya." }],
    },
    {
      type: "p", indentTabs: 0.5,
      runs: [{ text: "Apabila jangka waktu penawaran 14 (empatbelas) hari tersebut telah lewat dan ternyata masih ada sisa saham yang belum diambil bagian maka Direksi berhak menawarkan sisa saham tersebut kepada Pihak Lain." }],
    },
  );

  // ── PASAL 5 – SAHAM ──────────────────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "S A H A M" },
    { type: "pasal-divider", text: "PASAL 5" },
    { type: "numbered", num: 1, runs: [{ text: "Semua saham yang dikeluarkan oleh Perseroan adalah saham atas nama, dan harus sesuai dengan ketentuan perundang-undangan yang berlaku bagi perseroan." }] },
    { type: "numbered", num: 2, runs: [{ text: "Yang boleh memiliki dan mempergunakan hak atas saham hanyalah Warga Negara Indonesia atau Badan Hukum Indonesia." }] },
    { type: "numbered", num: 3, runs: [{ text: "Perseroan hanya mengakui seorang atau satu badan hukum sebagai pemilik satu saham." }] },
    { type: "numbered", num: 4, runs: [{ text: "Apabila saham karena sebab apapun menjadi milik beberapa orang, maka mereka yang memiliki bersama-sama itu diwajibkan untuk menunjuk seorang diantara mereka atau seorang lain sebagai kuasa mereka bersama dan yang ditunjuk atau diberi kuasa itu sajalah yang berhak mempergunakan hak yang diberikan oleh hukum atas saham tersebut." }] },
    { type: "numbered", num: 5, runs: [{ text: "Selama ketentuan dalam ayat (3) pasal ini belum dilaksanakan, maka para pemegang saham tersebut tidak berhak mengeluarkan suara dalam Rapat Umum Pemegang Saham, sedangkan pembayaran dividen untuk saham itu ditangguhkan." }] },
    { type: "numbered", num: 6, runs: [{ text: "Jika dikeluarkan surat saham, maka untuk setiap surat saham diberi sehelai surat saham." }] },
    { type: "numbered", num: 7, runs: [{ text: "Surat Kolektif saham dapat dikeluarkan sebagai bukti pemilikan 2 (dua) atau lebih saham yang dimiliki oleh seorang pemegang saham." }] },
    { type: "numbered", num: 8, runs: [{ text: "Pada surat saham harus dicantumkan sekurang-kurangnya :" }] },
    { type: "sub-numbered", num: "a", indentTabs: 1, runs: [{ text: "Nama dan alamat pemegang saham;" }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "Nomor surat saham;" }] },
    { type: "sub-numbered", num: "c", indentTabs: 1, runs: [{ text: "Nilai nominal saham;" }] },
    { type: "sub-numbered", num: "d", indentTabs: 1, runs: [{ text: "Tanggal pengeluaran surat saham." }] },
    { type: "numbered", num: 9, runs: [{ text: "Pada surat kolektif saham harus dicantumkan sekurang-kurangnya :" }] },
    { type: "sub-numbered", num: "a", indentTabs: 1, runs: [{ text: "nama dan alamat pemegang saham;" }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "nomor surat kolektif saham;" }] },
    { type: "sub-numbered", num: "c", indentTabs: 1, runs: [{ text: "nomor surat saham dan jumlah saham;" }] },
    { type: "sub-numbered", num: "d", indentTabs: 1, runs: [{ text: "nilai nominal saham;" }] },
    { type: "sub-numbered", num: "e", indentTabs: 1, runs: [{ text: "tanggal pengeluaran surat kolektif saham." }] },
    { type: "numbered", num: 10, runs: [{ text: "Surat saham dan surat kolektif saham harus ditandatangani oleh Direksi dan Dewan Komisaris Perseroan." }] },
    { type: "numbered", num: 11, runs: [{ text: "Dalam hal perseroan tidak menerbitkan surat saham, pemilikan saham dapat dibuktikan dengan surat daftar pemegang saham yang dikeluarkan oleh perseroan." }] },
  );

  // ── PASAL 6 – PENGGANTI SURAT SAHAM ─────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "PENGGANTI SURAT SAHAM" },
    { type: "pasal-divider", text: "PASAL 6" },
    { type: "numbered", num: 1, runs: [{ text: "Jika surat saham rusak atau tidak dapat dipakai, atas permintaan mereka yang berkepentingan, Direksi akan mengeluarkan surat saham pengganti, setelah surat saham yang rusak atau tidak dapat dipakai tersebut diserahkan kembali kepada Direksi." }] },
    { type: "numbered", num: 2, runs: [{ text: "Surat saham sebagaimana dimaksud dalam ayat (1) harus dimusnahkan dan dibuat berita acara oleh Direksi untuk dilaporkan dalam Rapat Umum Pemegang Saham berikutnya." }] },
    { type: "numbered", num: 3, runs: [{ text: "Jika surat saham hilang, atas permintaan mereka yang berkepentingan, Direksi mengeluarkan surat saham pengganti setelah menurut pendapat Direksi kehilangan tersebut cukup dibuktikan dan disertai jaminan yang dipandang perlu oleh Direksi untuk tiap peristiwa yang khusus." }] },
    { type: "numbered", num: 4, runs: [{ text: "Setelah surat saham pengganti dikeluarkan, surat saham yang dinyatakan hilang tersebut, tidak berlaku lagi terhadap Perseroan." }] },
    { type: "numbered", num: 5, runs: [{ text: "Semua biaya yang berhubungan dengan pengeluaran surat saham pengganti ditanggung oleh pemegang saham yang berkepentingan." }] },
    { type: "numbered", num: 6, runs: [{ text: "Ketentuan sebagaimana dimaksud pada ayat (1) sampai dengan ayat (5) mutatis mutandis berlaku bagi pengeluaran surat kolektif saham pengganti." }] },
  );

  // ── PASAL 7 – PEMINDAHAN HAK ATAS SAHAM ─────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "PEMINDAHAN HAK ATAS SAHAM" },
    { type: "pasal-divider", text: "PASAL 7" },
    { type: "numbered", num: 1, runs: [{ text: "Pemindahan hak atas saham, harus berdasarkan akta pemindahan hak yang ditandatangani oleh yang memindahkan dan yang menerima pemindahan atau wakil mereka yang sah." }] },
    { type: "numbered", num: 2, runs: [{ text: "Pemindahan hak atas saham hanya diperkenankan dengan persetujuan Rapat Umum Pemegang Saham." }] },
    { type: "numbered", num: 3, runs: [{ text: "Pemegang saham yang hendak memindahkan hak atas saham, harus mengajukan Permohonan secara tertulis tentang maksudnya kepada Rapat Umum Pemegang Saham melalui Direksi." }] },
    { type: "numbered", num: 4, runs: [{ text: "Rapat Umum Pemegang Saham wajib memberikan persetujuannya atau menolak permohonan sebagaimana dimaksud ayat (3) pasal ini secara tertulis dalam jangka waktu paling lama 90 (sembilan puluh) hari kerja terhitung sejak diterimanya permohonan." }] },
    { type: "numbered", num: 5, runs: [{ text: "Dalam hal jangka waktu sebagaimana dimaksud pada ayat (4) pasal ini telah lewat, dan dari Rapat Umum Pemegang Saham tidak memberikan pernyataan tertulis, maka permohonan atas pemindahan hak atas saham tersebut dianggap disetujui." }] },
    { type: "numbered", num: 6, runs: [{ text: "Pemindahan hak atas saham harus mendapat persetujuan dari instansi yang berwenang, jika peraturan perundang-undangan mensyaratkan hal tersebut." }] },
    { type: "numbered", num: 7, runs: [{ text: "Mulai hari panggilan Rapat Umum Pemegang Saham sampai dengan hari dilaksanakan Rapat Umum Pemegang Saham pemindahan hak atas saham tidak diperkenankan." }] },
    { type: "numbered", num: 8, runs: [{ text: "Apabila karena warisan, perkawinan atau sebab lain saham tidak lagi menjadi milik warga negara Indonesia, atau badan hukum Indonesia, maka dalam jangka waktu 1 (satu) tahun orang atau badan hukum yang bersangkutan wajib memindahkan hak atas sahamnya kepada Warga Negara Indonesia atau badan hukum Indonesia, sesuai ketentuan Anggaran Dasar." }] },
  );

  // ── PASAL 8 – RUPS ───────────────────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "RAPAT UMUM PEMEGANG SAHAM" },
    { type: "pasal-divider", text: "PASAL 8" },
    { type: "numbered", num: 1, runs: [{ text: "Rapat Umum Pemegang Saham yang selanjutnya disebut juga RUPS adalah :" }] },
    { type: "sub-numbered", num: "a", indentTabs: 1, runs: [{ text: "Rapat Umum Pemegang Saham Tahunan;" }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "Rapat Umum Pemegang Saham lainnya, yang dalam Anggaran Dasar ini disebut juga Rapat Umum Pemegang Saham Luar Biasa." }] },
    { type: "numbered", num: 2, runs: [
      { text: "Istilah Rapat Umum Pemegang Saham dalam Anggaran Dasar ini berarti keduanya,\n" },
      { text: "yaitu :\n" },
      { text: "Rapat Umum Pemegang Saham tahunan dan Rapat Umum Pemegang Saham luar\n" },
      { text: "biasa kecuali dengan tegas ditentukan lain." }
    ] },
    { type: "numbered", num: 3, runs: [{ text: "Dalam Rapat Umum Pemegang Saham tahunan :" }] },
    { type: "sub-numbered", num: "a", indentTabs: 1, runs: [{ text: "Direksi menyampaikan :" }] },
    { type: "list", bullet: "-", indentTabs: 2, runs: [{ text: "Laporan tahunan yang telah ditelaah oleh Dewan Komisaris untuk mendapat persetujuan Rapat Umum Pemegang Saham;" }] },
    { type: "list", bullet: "-", indentTabs: 2, runs: [{ text: "Laporan keuangan untuk mendapat pengesahan Rapat." }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "Ditetapkan penggunaan laba, jika Perseroan mempunyai saldo laba yang positif." }] },
    { type: "sub-numbered", num: "c", indentTabs: 1, runs: [{ text: "Diputuskan mata acara Rapat Umum Pemegang Saham lainnya yang telah diajukan sebagaimana mestinya dengan memperhatikan Ketentuan Anggaran Dasar." }] },
    { type: "numbered", num: 4, runs: [{ text: "Persetujuan laporan tahunan dan pengesahan laporan keuangan oleh Rapat Umum Pemegang Saham tahunan berarti memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya kepada anggota Direksi dan Dewan Komisaris atas pengurusan dan pengawasan yang telah dijalankan selama tahun buku yang lalu, sejauh tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan." }] },
    { type: "numbered", num: 5, runs: [{ text: "Rapat Umum Pemegang Saham Luar Biasa dapat diselenggarakan sewaktu-waktu berdasarkan kebutuhan untuk membicarakan dan memutuskan mata acara rapat kecuali mata acara rapat yang dimaksud pada ayat (3) huruf a dan huruf b pasal ini, dengan memperhatikan peraturan perundang-undangan dan Anggaran Dasar." }] },
  );

  // ── PASAL 9 – TEMPAT, PEMANGGILAN, PIMPINAN RUPS ────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "TEMPAT, PEMANGGILAN DAN PIMPINAN RAPAT UMUM" },
    { type: "pasal-divider", text: "PEMEGANG SAHAM" },
    { type: "pasal-divider", text: "PASAL 9" },
    { type: "numbered", num: 1, runs: [{ text: "Rapat Umum Pemegang Saham diadakan di tempat kedudukan Perseroan." }] },
    { type: "numbered", num: 2, runs: [{ text: "Rapat Umum Pemegang Saham diselenggarakan dengan melakukan pemanggilan terlebih dahulu kepada para pemegang saham dengan surat tercatat dan/atau dengan iklan dalam surat kabar." }] },
    { type: "numbered", num: 3, runs: [{ text: "Pemanggilan dilakukan paling lambat 14 (empat belas) hari kerja sebelum tanggal diselenggarakan Rapat Umum Pemegang Saham dengan tidak memperhitungkan tanggal panggilan dan tanggal Rapat Umum Pemegang Saham diadakan." }] },
    { type: "numbered", num: 4, runs: [{ text: "Dalam pemanggilan itu harus dicantumkan acara, waktu dan tempat penyelenggaraan Rapat Umum Pemegang Saham." }] },
    { type: "numbered", num: 5, runs: [{ text: "Dalam hal pemanggilan tidak sesuai dengan ketentuan ayat 2, 3 dan 4 diatas, keputusan Rapat Umum Pemegang Saham tetap sah jika semua pemegang saham dengan hak suara hadir atau diwakili oleh Rapat Umum Pemegang Saham dan keputusan tersebut disetujui dengan suara bulat." }] },
    { type: "numbered", num: 6, runs: [{ text: "Rapat Umum Pemegang Saham dipimpin oleh Direktur Utama." }] },
    { type: "numbered", num: 7, runs: [{ text: "Jika Direktur Utama tidak ada atau berhalangan karena sebab apapun yang tidak perlu dibuktikan kepada pihak ketiga, Rapat Umum Pemegang Saham dipimpin oleh seorang anggota Direktur lainnya." }] },
    { type: "numbered", num: 8, runs: [{ text: "Jika semua Direktur tidak hadir atau berhalangan karena sebab apapun yang tidak perlu dibuktikan kepada pihak ketiga, Rapat Umum Pemegang Saham dipimpin oleh salah seorang anggota Dewan Komisaris." }] },
    { type: "numbered", num: 9, runs: [{ text: "Jika semua anggota Dewan Komisaris tidak hadir atau berhalangan karena sebab apapun yang tidak perlu dibuktikan kepada pihak ketiga, Rapat Umum Pemegang Saham dipimpin oleh seorang yang dipilih oleh dan diantara mereka yang hadir dalam rapat." }] },
    { type: "p", indentTabs: 0.5, runs: [{ text: "Rapat Umum Pemegang Saham dapat juga diselenggarakan melalui media video konferensi atau media elektronik lainnya yang memungkinkan semua peserta Rapat Umum Pemegang Saham saling melihat dan mendengar secara langsung serta berpartisipasi dalam rapat, dengan persyaratan kourum dan persyaratan pengambilan keputusan adalah persyaratan sebagaimana diatur dalam ketentuan peraturan perundang-undangan yang berlaku bagi perseroan atau Anggaran Dasar." }] },
  );

  // ── PASAL 10 – KUORUM ────────────────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "KUORUM, HAK SUARA, DAN KEPUTUSAN RAPAT UMUM" },
    { type: "pasal-divider", text: "PEMEGANG SAHAM" },
    { type: "pasal-divider", text: "PASAL10" },
    { type: "numbered", num: 1, runs: [{ text: "Rapat Umum Pemegang Saham dapat dilangsungkan apabila kuorum kehadiran sesuai dengan ketentuan Pasal 86, Pasal 88, dan Pasal 89 Undang undang Perseroan Terbatas (UUPT) telah dipenuhi." }] },
    { type: "numbered", num: 2, runs: [{ text: "Rapat Umum Pemegang Saham dapat mengambil keputusan sesuai dengan ketentuan Pasal 87, Pasal 88, dan Pasal 89 Undang-undang Perseroan Terbatas (UUPT)." }] },
    { type: "numbered", num: 3, runs: [{ text: "Pemungutan suara mengenai diri orang dilakukan dengan surat tertutup yang tidak ditandatangani dan mengenai hal lain secara lisan, kecuali apabila ketua Rapat Umum Pemegang Saham menentukan lain tanpa ada keberatan dari pemegang saham yang hadir dalam Rapat Umum Pemegang Saham." }] },
    { type: "numbered", num: 4, runs: [{ text: "Suara blanko atau suara yang tidak sah dianggap tidak ada dan tidak dihitung dalam menentukan jumlah suara yang dikeluarkan dalam Rapat Umum Pemegang Saham." }] },
    { type: "numbered", num: 5, runs: [{ text: "Pemegang saham dapat mengambil keputusan di luar Rapat Umum Pemegang Saham dan dilakukan sesuai dengan ketentuan Pasal 91 Undang-undang Perseroan Terbatas (UUPT)." }] },
  );

  // ── PASAL 11 – DIREKSI ───────────────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "D I R E K S I" },
    { type: "pasal-divider", text: "PASAL 11" },
    { type: "numbered", num: 1, runs: [{ text: "Perseroan diurus dan dipimpin oleh Direksi yang terdiri dari seorang anggota Direksi atau lebih." }] },
    { type: "numbered", num: 2, runs: [{ text: "Jika diangkat lebih dari seorang Anggota Direksi, maka seorang diantaranya menjabat sebagai Direktur Utama." }] },
    { type: "numbered", num: 3, runs: [{ text: `Anggota Direksi diangkat oleh Rapat Umum Pemegang Saham, untuk jangka waktu ${termYears} (${terbilang(termYears)}) tahun dengan tidak mengurangi hak Rapat Umum Pemegang Saham untuk memberhentikannya sewaktu-waktu.` }] },
    { type: "numbered", num: 4, runs: [{ text: "Jika oleh sebab apapun suatu jabatan anggota Direksi lowong, maka dalam jangka waktu 30 (tigapuluh) hari sejak terjadi lowongan harus diselenggarakan Rapat Umum Pemegang Saham, untuk mengisi lowongan itu dengan memperhatikan ketentuan peraturan perundang-undangan dan Anggaran Dasar." }] },
    { type: "numbered", num: 5, runs: [{ text: "Jika oleh suatu sebab apapun semua jabatan anggota Direksi lowong, Untuk sementara Perseroan diurus oleh anggota Dewan Komisaris yang ditunjuk oleh rapat Dewan Komisaris." }] },
    { type: "numbered", num: 6, runs: [{ text: "Anggota direksi berhak mengundurkan diri dari jabatannya dengan memberitahukan secara tertulis kepada Perseroan paling lambat 30 (tigapuluh) hari kerja sebelum tanggal pengunduran dirinya." }] },
    { type: "numbered", num: 7, runs: [{ text: "Jabatan anggota Direksi berakhir, dalam hal:" }] },
    { type: "sub-numbered", num: "a", indentTabs: 1, runs: [{ text: "Mengundurkan diri sesuai ketentuan pada ayat (6);" }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "Tidak lagi memenuhi persyaratan peraturan perundang-undangan;" }] },
    { type: "sub-numbered", num: "c", indentTabs: 1, runs: [{ text: "Meninggal dunia;" }] },
    { type: "sub-numbered", num: "d", indentTabs: 1, runs: [{ text: "Diberhentikan berdasarkan keputusan Rapat Umum Pemegang Saham." }] },
  );

  // ── PASAL 12 – TUGAS & WEWENANG DIREKSI ─────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "TUGAS DAN WEWENANG DIREKSI" },
    { type: "pasal-divider", text: "PASAL 12" },
    { type: "numbered", num: 1, runs: [{ text: "Direksi berhak mewakili Perseroan didalam dan diluar Pengadilan tentang segala hal dan dalam segala kejadian, mengikat Perseroan dengan pihak lain dan pihak lain dengan Perseroan, serta menjalankan segala tindakan, baik mengenai kepengurusan maupun kepemilikan, dengan pembatasan bahwa untuk :" }] },
    { type: "sub-numbered", num: "a", indentTabs: 1, runs: [{ text: "Meminjam atau meminjamkan uang atas nama Perseroan (tidak termasuk mengambil uang perseroan di Bank);" }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "Mendirikan suatu usaha atau turut serta pada perusahaan lain baik didalam maupun di luar negeri;" }] },
    { type: "sub-numbered", num: "c", indentTabs: 1, runs: [{ text: "Menyewakan, mejaminkan atau menjual asset perusahaan, harus dengan persetujuan dari Rapat Dewan Komisaris." }] },
    { type: "numbered", num: 2, runs: [{ text: "Perbuatan hukum untuk mengalihkan, melepaskan hak atas tanah, menjadikan jaminan hutang seluruh atau sebagian besar harta kekayaan Perseroan dalam satu tahun buku, baik dalam 1 (satu) transaksi atau beberapa transaksi yang berdiri sendiri ataupun yang berkaitan satu sama lain harus mendapat persetujuan Rapat Umum Pemegang Saham yang dihadiri atau diwakili para pemegang saham yang memiliki paling sedikit ¾ (tiga per-empat) bagian dari jumlah seluruh saham dengan hak suara yang sah dan disetujui oleh paling sedikit ¾ (tiga per empat) bagian dari jumlah seluruh suara yang dikeluarkan secara sah dalam rapat." }] },
    { type: "numbered", num: 3, runs: [{ text: "Dalam hal kourum kehadiran sebagaimana dimaksud dalam ayat 2 tidak tercapai, dapat diadakan Rapat Umum Pemegang Saham Kedua." }] },
    { type: "numbered", num: 4, runs: [{ text: "Rapat Umum Pemegang Saham Kedua sebagaimana dimaksud pada ayat 3 Sah dan berhak mengambil keputusan jika rapat paling sedikit 2/3 (dua per tiga) bagian dari jumlah seluruh saham dengan hak suara hadir atau diwakili dalam Rapat Umum Pemegang Saham dan Keputusan adalah sah jika disetujui oleh paling sedikit ¾ (tiga per empat) bagian dari jumlah suara yang dikeluarkan kecuali Anggaran Dasar menentukan kourum kehadiran/atau ketentuan tentang persyaratan pengambilan keputusan Rapat Umum Pemegang Saham yang lebih besar." }] },
    { type: "numbered", num: 5, runs: [{ text: "Direksi bertindak menurut ketentuan berikut :" }] },
    { type: "sub-numbered", num: "a", indentTabs: 1, runs: [{ text: "Direktur Utama berhak dan berwenang bertindak untuk dan atas nama Direksi serta mewakili Perseroan." }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "Dalam hal Direktur Utama tidak hadir atau berhalangan karena sebab apapun juga, yang tidak perlu dibuktikan kepada pihak ketiga, maka salah seorang anggota Direksi lainnya berhak dan berwenang bertindak untuk dan atas nama Direksi serta mewakili Perseroan." }] },
  );

  // ── PASAL 13 – RAPAT DIREKSI ─────────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "RAPAT DIREKSI" },
    { type: "pasal-divider", text: "PASAL 13" },
    { type: "numbered", num: 1, runs: [{ text: "Penyelenggaraan Rapat Direksi dapat dilakukan setiap waktu apabila dipandang perlu :" }] },
    { type: "sub-numbered", num: "a", indentTabs: 1, runs: [{ text: "Oleh seorang atau lebih anggota Direksi;" }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "Atas permintaan tertulis dari seorang atau lebih anggota Dewan Komisaris, atau;" }] },
    { type: "sub-numbered", num: "c", indentTabs: 1, runs: [{ text: "Atas permintaan tertulis dari 1 (satu) orang atau lebih pemegang saham yang bersama-Sama mewakili 1/10 (satu per sepuluh) atau lebih dari jumlah seluruh saham dengan hak suara." }] },
    { type: "numbered", num: 2, runs: [{ text: "Pemanggilan Rapat Direksi dilakukan oleh anggota Direksi yang berhak bertindak untuk dan atas nama Direksi menurut ketentuan Pasal 11 Anggaran Dasar." }] },
    { type: "numbered", num: 3, runs: [{ text: "Panggilan Rapat Direksi dilakukan dengan surat tercatat yang disampaikan langsung kepada setiap anggota Direksi dengan mendapat tanda terima paling singkat 3 (tiga) hari sebelum rapat diadakan, tanpa memperhitungkan tanggal panggilan dan tanggal rapat." }] },
    { type: "numbered", num: 4, runs: [{ text: "Panggilan Rapat Direksi harus mencantumkan mata acara, tanggal, waktu dan tempat rapat." }] },
    { type: "numbered", num: 5, runs: [{ text: "Rapat Direksi diadakan ditempat kedudukan Perseroan atau tempat Kegiatan Usaha Perseroan. Apabila semua anggota Direksi hadir atau diwakili, pemanggilan terlebih dahulu tersebut tidak disyaratkan dan Rapat Direksi dapat diadakan dimanapun juga dan berhak mengambil keputusan yang sah serta mengikat." }] },
    { type: "numbered", num: 6, runs: [{ text: "Rapat Direksi dipimpin oleh Direktur Utama dalam hal Direktur Utama tidak dapat hadir atau berhalangan yang tidak perlu dibuktikan kepada Pihak Ketiga, Rapat Direksi dipimpin oleh seorang anggota Direksi yang dipilih oleh dan dari antara anggota Direksi yang hadir." }] },
    { type: "numbered", num: 7, runs: [{ text: "Seorang anggota Direksi dapat diwakili dalam Rapat Direksi hanya oleh anggota Direksi lainnya berdasarkan surat kuasa." }] },
    { type: "numbered", num: 8, runs: [{ text: "Rapat Direksi adalah sah dan berhak mengambil keputusan yang mengikat jika lebih dari ½ (satu per dua) dari jumlah anggota Direksi hadir atau diwakili dalam rapat." }] },
    { type: "numbered", num: 9, runs: [{ text: "Keputusan Rapat Direksi harus diambil berdasarkan musyawarah untuk mufakat. Dalam hal keputusan berdasarkan musyawarah untuk mufakat tidak tercapai maka keputusan diambil dengan pemungutan suara berdasarkan suara setuju paling sedikit lebih dari ½ (satu per dua) dari jumlah suara yang dikeluarkan dalam rapat." }] },
    { type: "numbered", num: 10, runs: [{ text: "Apabila suara yang setuju dan yang tidak setuju berimbang, Ketua Rapat Direksi yang akan menentukan." }] },
    { type: "numbered", num: 11, runs: [{ text: "Rapat Direksi dapat juga dilakukan melalui media video konferensi atau sarana media elektronik lainnya yang memungkinkan semua peserta rapat Direksi saling melihat dan mendengar secara langsung serta berpartisipasi dalam rapat, dengan persyaratan kourum dan persyaratan pengambilan keputusan adalah sesuai dengan persyaratan sebagaimana diatur dalam Anggaran Dasar." }] },
    { type: "numbered", num: 12, subStartVal: 2, runs: [{ text: "a. Setiap anggota Direksi yang hadir dalam Rapat berhak mengeluarkan 1 satu suara dan tambahan 1 satu suara untuk setiap anggota Direksi lain yang diwakilinya." }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "Pemungutan suara mengenai diri orang dilakukan dengan surat tertutup tanpa tanda tangan sedangkan mengenai hal-hal lain dilakukan secara lisan kecuali ketua rapat menentukan lain tanpa ada keberatan dari yang hadir." }] },
    { type: "sub-numbered", num: "c", indentTabs: 1, runs: [{ text: "Suara blanko dan suara yang tidak sah dianggap tidak dikeluarkan secara sah dan dianggap tidak ada serta tidak dihitung dalam menentukan jumlah suara yang dikeluarkan." }] },
    { type: "numbered", num: 13, runs: [{ text: "Direksi dapat juga mengambil keputusan yang sah tanpa mengadakan Rapat Direksi, dengan ketentuan semua anggota Direksi telah diberitahu secara tertulis dan semua anggota Direksi memberikan persetujuan mengenai usul yang diajukan secara tertulis dengan menandatangani persetujuan tersebut. Keputusan yang diambil dengan cara demikian mempunyai kekuatan yang sama dengan keputusan yang diambil dengan sah dalam Rapat Direksi." }] },
  );

  // ── PASAL 14 – DEWAN KOMISARIS ───────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "DEWAN KOMISARIS" },
    { type: "pasal-divider", text: "Pasal 14" },
    { type: "numbered", num: 1, runs: [{ text: "Dewan Komisaris terdiri dari seorang atau lebih anggota Komisaris, apabila diangkat lebih dari seorang anggota Dewan Komisaris, maka seorang di antaranya dapat diangkat sebagai Komisaris Utama." }] },
    { type: "numbered", num: 2, runs: [{ text: "Yang boleh diangkat sebagai anggota Komisaris hanya Warga Negara Indonesia yang menurut persyaratan yang ditentukan peraturan perundang-undangan yang berlaku." }] },
    { type: "numbered", num: 3, runs: [{ text: `Anggota Dewan Komisaris diangkat oleh Rapat Umum Pemegang Saham untuk jangka waktu ${termYears} (${terbilang(termYears)}) tahun, dengan tidak mengurangi hak Rapat Umum Pemegang Saham untuk memberhentikan sewaktu-waktu.` }] },
    { type: "numbered", num: 4, runs: [{ text: "Jika oleh suatu sebab jabatan anggota Dewan Komisaris kosong, maka dalam jangka waktu 30 (tigapuluh) hari kerja setelah terjadinya kekosongan, harus diselenggarakan Rapat Umum Pemegang Saham untuk mengisi lowongan itu dengan memperhatikan ketentuan ayat 2 (dua) pasal ini." }] },
    { type: "numbered", num: 5, runs: [{ text: "Seorang anggota Dewan Komisaris berhak mengundurkan diri dari jabatannya dengan memberitahukan secara tertulis mengenai maksud tersebut kepada Perseroan sekurangnya 30 (tiga puluh) hari kerja sebelum tanggal pengunduran dirinya." }] },
    { type: "numbered", num: 6, runs: [{ text: "Jabatan anggota Dewan Komisaris berakhir apabila :" }] },
    { type: "sub-numbered", num: "a", indentTabs: 1, runs: [{ text: "Kehilangan Kewarganegaraan Indonesia ;" }] },
    { type: "sub-numbered", num: "b", indentTabs: 1, runs: [{ text: "Mengundurkan diri sesuai dengan ketentuan ayat 5 (lima) pasal ini ;" }] },
    { type: "sub-numbered", num: "c", indentTabs: 1, runs: [{ text: "Tidak lagi memenuhi persyaratan perundang-undangan yang berlaku;" }] },
    { type: "sub-numbered", num: "d", indentTabs: 1, runs: [{ text: "Meninggal dunia ;" }] },
    { type: "sub-numbered", num: "e", indentTabs: 1, runs: [{ text: "Diberhentikan berdasarkan keputusan Rapat Umum Pemegang Saham." }] },
  );

  // ── PASAL 15 – TUGAS & WEWENANG DEWAN KOMISARIS ─────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "TUGAS DAN WEWENANG DEWAN KOMISARIS" },
    { type: "pasal-divider", text: "Pasal 15" },
    { type: "numbered", num: 1, runs: [{ text: "Dewan Komisaris setiap waktu dalam jam kerja kantor Perseroan berhak memasuki bangunan dan halaman atau tempat lain yang dipergunakan atau yang dikuasai oleh Perseroan dan berhak memeriksa semua pembukuan, surat dan alat bukti lainnya, memeriksa dan mencocokkan keadaan uang kas dan lain-lain serta berhak untuk mengetahui segala tindakan yang telah dijalankan oleh Direksi." }] },
    { type: "numbered", num: 2, runs: [{ text: "Direksi dan setiap anggota Direksi wajib untuk memberikan penjelasan tentang segala hal yang ditanyakan oleh Dewan Komisaris." }] },
    { type: "numbered", num: 3, runs: [{ text: "Apabila seluruh anggota Direksi diberhentikan sementara dan Perseroan tidak mempunyai seorangpun anggota Direksi, maka untuk sementara Dewan Komisaris diwajibkan untuk mengurus Perseroan. Dalam hal demikian Dewan Komisaris berhak untuk memberikan kekuasaan sementara kepada seorang atau lebih diantara anggota Dewan Komisaris atas tanggungan Dewan Komisaris." }] },
    { type: "numbered", num: 4, runs: [{ text: "Dalam hal hanya ada seorang anggota Dewan Komisaris, segala tugas dan wewenang yang diberikan kepada Komisaris Utama atau anggota Dewan Komisaris dalam Anggaraan Dasar ini pula berlaku pula baginya." }] },
  );

  // ── PASAL 16 – RAPAT DEWAN KOMISARIS ────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "RAPAT DEWAN KOMISARIS" },
    { type: "pasal-divider", text: "Pasal 16" },
    { type: "p", runs: [{ text: "Ketentuan sebagaimana dimaksud dalam Pasal 10 mutatis mutandis berlaku bagi rapat Dewan Komisaris." }] },
  );

  // ── PASAL 17 – RENCANA KERJA ─────────────────────────────────────────────
  const docDate = new Date(data.tanggal);
  const isDocDateValid = !isNaN(docDate.getTime());
  let endTglHuruf = "............................";
  let firstYearTitle = "............";
  let firstYearNumber = "............";

  if (isDocDateValid) {
    const endDate = new Date(docDate);
    endDate.setFullYear(endDate.getFullYear() + termYears);
    endTglHuruf = formatAktaDate(endDate.toISOString());
    const fullYear = docDate.getFullYear();
    firstYearTitle = terbilang(fullYear);
    firstYearNumber = String(fullYear);
  }

  blocks.push(
    { type: "pasal-divider", text: "RENCANA KERJA, TAHUN BUKU DAN LAPORAN TAHUNAN" },
    { type: "pasal-divider", text: "Pasal 17" },
    { type: "numbered", num: 1, runs: [{ text: "Direksi wajib menyampaikan rencana kerja yang memuat juga anggaran tahunan Perseroan kepada Dewan Komisaris untuk mendapat persetujuan, sebelum tahun buku dimulai." }] },
    { type: "numbered", num: 2, runs: [{ text: "Rencana kerja sebagaimana dimaksud pada ayat (1) harus disampaikan paling lambat 30 (tiga puluh) hari kerja sebelum dimulainya tahun buku yang akan datang." }] },
    { type: "numbered", num: 3, runs: [{ text: `Tahun buku Perseroan berjalan dari tanggal 1 (satu) Januari sampai dengan tanggal 31 (tiga puluh satu) Desember. Pada akhir bulan Desember tiap tahun, buku Perseroan ditutup. Untuk pertama kalinya buku Perseroan ini dimulai pada tanggal dari Akta Pendirian ini dan ditutup pada tanggal tiga puluh satu Desember ${firstYearTitle} (31-12-${firstYearNumber}).` }] },
    { type: "numbered", num: 4, runs: [{ text: "Direksi menyusun laporan tahunan dan menyediakannya di Perseroan untuk dapat diperiksa oleh para pemegang saham terhitung sejak tanggal panggilan Rapat Umum Pemegang Saham tahunan." }] },
  );

  // ── PASAL 18 – PENGGUNAAN LABA ───────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "PENGGUNAAN LABA DAN PEMBAGIAN DEVIDEN" },
    { type: "pasal-divider", text: "PASAL 18" },
    { type: "numbered", num: 1, runs: [{ text: "Laba bersih Perseroan dalam suatu tahun buku seperti tercantum dalam neraca dan perhitungan laba rugi yang telah disahkan oleh Rapat Umum Pemegang Saham tahunan dan merupakan saldo laba yang positif, dibagi menurut cara penggunaannya yang ditentukan oleh Rapat Umum Pemegang Saham tersebut." }] },
    { type: "numbered", num: 2, runs: [{ text: "Dalam hal Rapat Umum Pemegang Saham tidak menentukan cara penggunaanya, laba bersih tersebut seteleh dikurangi penyisihan untuk cadangan yang diwajibkan dalam Undang-Undang dan Anggaran Dasar, dibagikan kepada Pemegang Saham sebagai dividen." }] },
    { type: "numbered", num: 3, runs: [{ text: "Jika perhitungan laba rugi pada tahun buku menunjukan kerugian yang tidak dapat ditutup dengan dana cadangan, maka kerugian itu akan tetap dicatat dan dimasukan dalam perhitungan laba rugi dan dalam tahun buku selanjutnya perseroan dianggap tidak mendapat laba selama kerugian yang tercatat dan dimasukan dalam perhitungan laba rugi itu belum sama sekali ditutup." }] },
    { type: "numbered", num: 4, runs: [{ text: "Perseroan dapat membagikan dividen interim sebelum tahun buku Perseroan berakhir sesuai dengan ketentuan peraturan perundang-undangan yang berlaku bagi perseroan." }] },
  );

  // ── PASAL 19 – PENGGUNAAN CADANGAN ──────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "PENGGUNAAN CADANGAN" },
    { type: "pasal-divider", text: "PASAL 19" },
    { type: "numbered", num: 1, runs: [{ text: "Penyisihan laba bersih untuk cadangan dilakukan sampai mencapai 20% (dua puluh persen) dari jumlah modal ditempatkan dan disetor hanya boleh dipergunakan untuk menutup kerugian yang tidak dipenuhi oleh cadangan lain." }] },
    { type: "numbered", num: 2, runs: [{ text: "Jika jumlah cadangan telah melebihi jumlah 20% (dua puluh persen), Rapat Umum Pemegang Saham dapat memutuskan agar jumlah kelebihannya digunakan bagi keperluan Perseroan." }] },
    { type: "numbered", num: 3, runs: [{ text: "Cadangan sebagaimana dimaksud pada ayat (1) yang belum digunakan untuk menutup kerugian dan jumlah cadangan yang melebihi jumlah sebagaimana dimaksud pada ayat (2) yang penggunaannya belum ditentukan oleh Rapat Umum Pemegang Saham harus dikelola dengan cara yang tepat menurut pertimbagan Direksi setelah memperoleh persetujuan Dewan Komisaris serta dengan memperhatikan peraturan perundang-undangan agar memperoleh laba." }] },
  );

  // ── PASAL 20 – KETENTUAN PENUTUP ────────────────────────────────────────
  blocks.push(
    { type: "pasal-divider", text: "KETENTUAN PENUTUP" },
    { type: "pasal-divider", text: "PASAL 20" },
    { type: "p", runs: [{ text: "Sepanjang tidak diatur tersendiri dalam Anggaran Dasar ini berlaku Undang-Undang tentang Perseroan Terbatas dan peraturan Perundang-undangan lainnya." }] },
    { type: "p", runs: [{ text: "Segala sesuatu yang tidak atau belum cukup diatur dalam Anggaran Dasar ini, akan diputuskan dalam Rapat Umum Pemegang Saham dengan memperhatikan peraturan perundang-undangan." }] },
    { type: "p", runs: [{ text: "Akhirnya, para penghadap bertindak dalam kedudukannya sebagaimana tersebut di atas menerangkan bahwa :" }] },
    {
      type: "numbered", num: 1,
      runs: [{ text: "Modal ditempatkan sebagaimana dimaksud dalam pasal 4 ayat 2 telah diambil bagian dan disetor penuh dengan uang tunai melalui kas Perseroan oleh para pendiri :" }],
    },
  );

  // Shareholder saham detail (sub-numbered a, b, c…)
  let tSaham = 0;
  shareholders.forEach((p, i) => {
    tSaham += p.sharesOwned;
    const nominal = p.sharesOwned * data.nilaiPerLembar;
    const isBH = checkIsBadanHukum(p);
    const prefix = isBH ? "" : `${p.salutation || "Tuan"} `;
    blocks.push({
      type: "sub-numbered",
      num: String.fromCharCode(97 + i),
      indentTabs: 1,
      runs: [
        { text: prefix },
        { text: `${p.name.toUpperCase()}`, bold: true },
        { text: `, tersebut di atas, sejumlah ` },
        { text: `${formatNumber(p.sharesOwned)}`, bold: true },
        { text: ` (${terbilang(p.sharesOwned)}) lembar saham, dengan nilai nominal seluruhnya sebesar ` },
        { text: `Rp. ${formatNumber(nominal)},-`, bold: true },
        { text: ` (${terbilang(nominal)} rupiah);` }
      ],
    });
  });

  const totNominal = tSaham * data.nilaiPerLembar;
  blocks.push(
    {
      type: "p", indentTabs: 0.5,
      runs: [
        { text: "Sehingga seluruhnya berjumlah " },
        { text: `${formatNumber(tSaham)}`, bold: true },
        { text: ` (${terbilang(tSaham)}) lembar saham, dengan nilai nominal seluruhnya sebesar ` },
        { text: `Rp. ${formatNumber(totNominal)},-`, bold: true },
        { text: ` (${terbilang(totNominal)} rupiah).` }
      ],
    },
    {
      type: "numbered", num: 2,
      runs: [
        { text: "Menyimpang dari ketentuan dalam pasal 11 ayat 3 dan pasal 14 ayat 3 Anggaran Dasar ini mengenai tata cara pengangkatan Anggota Direksi dan Dewan Komisaris, telah diangkat anggota Direksi dan Dewan Komisaris Perseroan dengan masa jabatan " },
        { text: `${termYears}`, bold: true },
        { text: ` (${terbilang(termYears)}) ` },
        { text: "tahun", bold: true },
        { text: `, terhitung sejak tanggal ${tglHuruf} sampai dengan tanggal ${endTglHuruf}, adalah sebagai berikut :` }
      ],
    },
  );

  const getManagementRank = (pos: string) => {
    const p = pos.toLowerCase();
    if (p.includes("utama")) return 1;
    if (p.includes("wakil")) return 2;
    return 3;
  };

  // Management list – Direksi
  blocks.push({ type: "numbered", num: 1, indentTabs: 1, runs: [{ text: "Anggota Direksi :" }] });
  shareholders
    .filter((p) => p.isManagement && String(p.managementPosition || "").includes("Direktur"))
    .sort((a, b) => getManagementRank(a.managementPosition || "") - getManagementRank(b.managementPosition || ""))
    .forEach((p) => {
      blocks.push({
        type: "management-role",
        position: p.managementPosition || "Direktur",
        salutation: p.salutation || "",
        name: p.name.toUpperCase(),
      });
    });

  // Management list – Komisaris
  blocks.push({ type: "numbered", num: 2, indentTabs: 1, runs: [{ text: "Anggota Komisaris :" }] });
  shareholders
    .filter((p) => p.isManagement && String(p.managementPosition || "").includes("Komisaris"))
    .sort((a, b) => getManagementRank(a.managementPosition || "") - getManagementRank(b.managementPosition || ""))
    .forEach((p) => {
      blocks.push({
        type: "management-role",
        position: p.managementPosition || "Komisaris",
        salutation: p.salutation || "",
        name: p.name.toUpperCase(),
      });
    });

  // Para penghadap telah memperkenalkan diri kepada saya, Notaris.
  blocks.push({
    type: "p",
    indentTabs: 1,
    hanging: 284,
    runs: [{ text: "-\tPara penghadap telah memperkenalkan diri kepada saya, Notaris." }]
  });

  // ── PENUTUP ──────────────────────────────────────────────────────────────
  const expandAbbreviations = (str: string) => {
    if (!str) return "";
    let res = str;
    res = res.replace(
      /RT\.\s*(\d+)\s*RW\.\s*(\d+)/gi,
      "Rukun Tetangga $1, Rukun Warga $2",
    );
    res = res.replace(
      /RT\s+(\d+)\s*RW\s+(\d+)/gi,
      "Rukun Tetangga $1, Rukun Warga $2",
    );
    res = res.replace(/RT\.\s*(\d+)/gi, "Rukun Tetangga $1");
    res = res.replace(/RW\.\s*(\d+)/gi, "Rukun Warga $1");
    res = res.replace(/\bS\.H\b\.?/gi, "Sarjana Hukum");
    res = res.replace(/\bM\.Kn\b\.?/gi, "Magister Kenotariatan");
    res = res.replace(/\bjl(?:n)?\.?\b/gi, "Jalan");
    res = res.replace(/\bgg\.?\b/gi, "Gang");
    return res;
  };

  blocks.push(
    {
      type: "p",
      runs: [
        {
          text: "Penghadap menyatakan dengan ini menjamin akan kebenaran, keaslian dan\n" +
                "kelengkapan identitas pihak-pihak yang namanya tersebut dalam akta ini dan seluruh\n" +
                "dokumen yang menjadi dasar akta ini tanpa ada yang dikecualikan yang disampaikan\n" +
                "kepada saya, Notaris, sehingga apabila dikemudian hari sejak ditandatanganinya akta\n" +
                "ini timbul sengketa dengan nama dan dalam bentuk apapun yang disebabkan karena\n" +
                "akta ini, maka pihak yang membuat keterangan dengan ini berjanji mengikatkan dirinya\n" +
                "untuk bertanggung jawab dan bersedia menanggung resiko yang timbul dan dengan ini\n" +
                "penghadap menyatakan dengan tegas membebaskan saya, Notaris, dan para saksi\n" +
                "dari turut bertanggung jawab dan memikul baik sebagian maupun seluruhnya akibat\n" +
                "hukum yang timbul karena sengketa tersebut.",
        },
      ],
    },
    {
      type: "p",
      runs: [
        {
          text: "Selanjutnya penghadap juga menyatakan telah mengerti, memahami and menyetujui isi\n" +
                "akta ini.",
        },
      ],
    },
    {
      type: "p",
      runs: [
        {
          text: "Dari segala sesuatu yang diuraikan tersebut di atas, maka saya, Notaris membuat Akta\n" +
                "Pendirian Perseroan Terbatas ini untuk dapat dipergunakan sebagaimana mestinya.",
        },
      ],
    },
    { type: "divider", text: "DEMIKIANLAH AKTA INI" },
    {
      type: "p",
      runs: [
        {
          text: `Dibuat sebagai minuta dan dilangsungkan di ${notarisTempat}, pada hari dan tanggal serta jam sebagaimana disebutkan pada kepala akta ini dengan dihadiri oleh :`,
        },
      ],
    },
  );

  // Saksi
  const saksi1DefaultAlamat = "Jalan Sukaresmi Nomor 12, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi";
  const saksi2DefaultAlamat = "Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh Rukun Tetangga 001, Rukun Warga 004, Kecamatan Cimenyan, Desa Ciburial";

  const s1DetailText = expandAbbreviations(
    `${data.saksi1Nama || "Nendi Suhendi"}, lahir di ${toTitleCase(data.saksi1LahirTempat || "Bandung")}, pada tanggal ${formatAktaDate(data.saksi1LahirTanggal || "1991-07-15")}, Warga Negara Indonesia, bertempat tinggal di ${formatAddress(data.saksi1Alamat || saksi1DefaultAlamat)}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi1NIK || "3217011507910016"};`
  );

  const s2DetailText = expandAbbreviations(
    `${data.saksi2Nama || "Siti Nur Azizah"}, lahir di ${toTitleCase(data.saksi2LahirTempat || "Bandung")}, pada tanggal ${formatAktaDate(data.saksi2LahirTanggal || "1999-12-17")}, Warga Negara Indonesia, bertempat tinggal di ${formatAddress(data.saksi2Alamat || saksi2DefaultAlamat)}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi2NIK || "3204065712990001"};`
  );

  const ttdNotaryName = (data.notarisNamaSurat || "NUKANTINI PUTRI PARINCHA, SH., M.Kn.")
    .toUpperCase()
    .replace(/\.?$/, "."); // Ensure it ends with exactly one period

  blocks.push(
    {
      type: "saksi", num: 1,
      runs: [{ text: s1DetailText }],
    },
    {
      type: "saksi", num: 2,
      runs: [{ text: s2DetailText }],
    },
    {
      type: "list",
      bullet: "-",
      indentTabs: 1.0,
      runs: [
        { text: `Untuk sementara berada di ${toTitleCase(notarisTempat)};` },
      ],
    },
    { type: "p", runs: [{ text: "Keduanya pegawai Kantor Notaris, sebagai saksi-saksi." }] },
    { type: "p", runs: [{ text: "Segera setelah akta ini dibacakan oleh saya, Notaris kepada penghadap dan saksi-saksi, maka ditanda-tanganilah akta ini oleh penghadap, saksi-saksi dan saya, Notaris. Serta penghadap membubuhkan sidik jari sebelah kanan pada lembaran tersendiri di hadapan saya, Notaris dan saksi-saksi, yang dilekatkan pada minuta akta ini." }] },
    { type: "p", runs: [{ text: "Dilangsungkan dengan tanpa perubahan." }] },
    { type: "p", indentTabs: 1, runs: [{ text: "Minuta Akta ini telah ditanda-tangani dengan sempurna." }] },
    { type: "p", indentTabs: 2, runs: [{ text: "Diberikan sebagai salinan yang sama bunyinya." }] },
  );

  return blocks;
}