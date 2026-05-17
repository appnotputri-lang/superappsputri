import { CompanyData, Shareholder, AmendmentDeed } from "../../types";
import { FormatToken } from "./notaryWrapper";
import {
  getDayName,
  dateToWords,
  formatDateStr,
  timeToWords,
  formatTimeStr,
  terbilang,
  toTitleCase,
  formatNumber,
  formatAddress,
} from "./formatter";

export type Block =
  | {
      type: "p";
      runs: FormatToken[];
      align?: "left" | "center" | "right" | "right-center";
      indent?: boolean;
      indentTabs?: number;
      spaceAfter?: boolean;
      number?: number;
      subNumber?: number | string;
      kbliDesc?: boolean;
    }
  | {
      type: "list";
      bullet: string;
      runs: FormatToken[];
      spaceAfter?: boolean;
      number?: number;
      indentTabs?: number;
    }
  | {
      type: "shareholder-list";
      bullet: string;
      name: string;
      sharesText: string;
      rpText: string;
    }
  | {
      type: "management-list";
      name: string;
      position: string;
    }
  | { type: "divider"; text: string }
  | { type: "saksi"; number: number; runs: FormatToken[]; spaceAfter?: boolean }
  | { type: "static"; content: string };

export const generateRupsBlocks = (data: CompanyData): Block[] => {
  const effectiveNotaryDate = data.draftAktaRupsDate || data.notaryDate || "";
  const effectiveNotaryNumber = data.draftAktaRupsNumber || data.notaryNumber || "...";
  
  const tglAktaHari = getDayName(effectiveNotaryDate);
  const tglAktaHuruf = dateToWords(effectiveNotaryDate);
  const tglAktaAngka = formatDateStr(effectiveNotaryDate);

  const jamStr = data.meetingStartTime
    ? data.meetingStartTime.replace(":", ".") + " WIBB"
    : "12.00 WIBB";
  const jamParts = (data.meetingStartTime || "12:00").split(":");
  const h = parseInt(jamParts[0]);
  const m = parseInt(jamParts[1]);
  const jamHuruf = `${terbilang(h)} lewat ${m === 0 ? "nol-nol" : terbilang(m)} menit Waktu Indonesia Bagian Barat`;

  // Rep details
  let rep: Shareholder | undefined;
  if (data.representativeType === "EXISTING") {
    rep =
      data.shareholders.find((s) => s.id === data.authorizedRepresentativeId) ||
      data.finalShareholders.find(
        (s) => s.id === data.authorizedRepresentativeId,
      );
  } else {
    rep = data.manualRepresentative;
  }

  const tglLahirRepHuruf = rep ? dateToWords(rep.birthDate) : "";
  const tglLahirRepAngka = rep ? formatDateStr(rep.birthDate) : "";

  // Helper to keep track of fully described persons
  const fullyDescribedNames = new Set<string>();
  if (rep) fullyDescribedNames.add(rep.name.toUpperCase());

  const getPersonDetailRuns = (person: any): FormatToken[] => {
    const nameUpper = (person?.name || "").toUpperCase();
    const isPenghadap = rep && nameUpper === rep.name.toUpperCase();

    if (fullyDescribedNames.has(nameUpper)) {
      return [
        { text: nameUpper, bold: true },
        {
          text: isPenghadap
            ? ", penghadap tersebut diatas"
            : ", tersebut diatas",
        },
      ];
    }

    fullyDescribedNames.add(nameUpper);
    const tglLahirHuruf = person ? dateToWords(person.birthDate) : "";
    const tglLahirAngka = person ? formatDateStr(person.birthDate) : "";

    return [
      { text: nameUpper, bold: true },
      {
        text: `, lahir di ${toTitleCase(person?.birthCity || "...")}, pada tanggal ${tglLahirAngka} (${tglLahirHuruf}), Warga Negara Indonesia, ${toTitleCase(person?.occupation || "...")}, bertempat tinggal di ${toTitleCase(person?.address?.city || "...")}, ${formatAddress(toTitleCase(person?.address?.fullAddress || "..."))}, Rukun Tetangga ${person?.address?.rt || "..."}, Rukun Warga ${person?.address?.rw || "..."}, Kelurahan ${toTitleCase(person?.address?.kelurahan || "...")}, Kecamatan ${toTitleCase(person?.address?.kecamatan || "...")}, pemegang Kartu Tanda Penduduk Nomor ${person?.nik || "..."}`,
      },
    ];
  };

  const tglSirkulerHuruf = dateToWords(data.signingDate);
  const tglSirkulerAngka = formatDateStr(data.signingDate);

  const checkNotaryWording = (name: string, title?: string, domicile?: string) => {
    const norm = (name || "").toUpperCase().trim();
    const t1 = "NUKANTINI PUTRI PARINCHA, SARJANA HUKUM, MAGISTER KENOTARIATAN";
    const t2 = "RADEN AJENG NUKANTINI PUTRI PARINCHA, SARJANA HUKUM, MAGISTER KENOTARIATAN";
    if (norm === t1 || norm === t2) {
      return "saya, Notaris";
    }
    return `${name}${title ? `, ${title}` : ""}, Notaris berkedudukan di ${toTitleCase(domicile || "...")}`;
  };

  const blocks: Block[] = [
    {
      type: "p",
      align: "center",
      runs: [{ text: `PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM`, bold: true }],
    },
    {
      type: "p",
      align: "center",
      runs: [{ text: `YANG DIAMBIL DILUAR RAPAT`, bold: true }],
    },
    {
      type: "p",
      align: "center",
      runs: [
        {
          text: `SEBAGAI PENGGANTI RAPAT UMUM PEMEGANG SAHAM LUAR BIASA`,
          bold: true,
        },
      ],
    },
    {
      type: "p",
      align: "center",
      runs: [{ text: `PT ${data.companyName.toUpperCase()}`, bold: true }],
    },
    {
      type: "p",
      align: "center",
      runs: [{ text: `Nomor : ${effectiveNotaryNumber}`, bold: false }],
    },
    { type: "p", runs: [{ text: `` }] },
    { type: "p", runs: [{ text: `` }] },

    {
      type: "p",
      runs: [
        {
          text: `Pada hari ini, ${tglAktaHari}, tanggal ${tglAktaHuruf} (${tglAktaAngka}).`,
        },
      ],
    },
    { type: "p", runs: [{ text: `Pukul ${jamStr} (${jamHuruf}).` }] },
    {
      type: "p",
      runs: [
        { text: `Berhadapan dengan saya, ` },
        {
          text:
            data.notaryName ||
            "NUKANTINI PUTRI PARINCHA, Sarjana Hukum, Magister Kenotariatan",
          bold: true,
        },
        {
          text: `, Notaris di Kabupaten Bandung Barat, dengan di hadiri oleh saksi-saksi yang saya, Notaris kenal dan akan disebutkan nama-namanya pada bagian akhir akta ini :`,
        },
      ],
    },

    {
      type: "list",
      bullet: "-",
      indentTabs: 0.5,
      runs: [
        { text: `${rep?.salutation || "Tuan"} ` },
        { text: (rep?.name || "...").toUpperCase(), bold: true },
        {
          text: `, lahir di ${toTitleCase(rep?.birthCity || "...")}, pada tanggal ${tglLahirRepAngka} (${tglLahirRepHuruf}), Warga Negara Indonesia, ${toTitleCase(rep?.occupation || "...")}, bertempat tinggal di ${toTitleCase(rep?.address.city || "...")}, ${formatAddress(toTitleCase(rep?.address.fullAddress || "..."))}, Rukun Tetangga ${rep?.address.rt || "..."}, Rukun Warga ${rep?.address.rw || "..."}, Kelurahan ${toTitleCase(rep?.address.kelurahan || "...")}, Kecamatan ${toTitleCase(rep?.address.kecamatan || "...")}, pemegang Kartu Tanda Penduduk Nomor ${rep?.nik || "..."};`,
        },
      ],
    },

    {
      type: "list",
      bullet: "-",
      indentTabs: 1.5,
      runs: [
        {
          text: `Untuk sementara berada di ${toTitleCase(data.newAddress?.city || data.domicile || "...")};`,
        },
      ],
    },
    { type: "p", runs: [{ text: `Penghadap saya, Notaris kenal.` }] },
    {
      type: "p",
      runs: [
        {
          text: `Penghadap dalam kedudukannya tersebut di atas menerangkan terlebih dahulu kepada saya, Notaris :`,
        },
      ],
    },
  ];

  const tglPendirianHuruf = dateToWords(data.establishmentDeedDate || "");
  const tglPendirianAngka = formatDateStr(data.establishmentDeedDate || "");
  const tglSKPendirianHuruf = dateToWords(data.establishmentSkDate || "");
  const tglSKPendirianAngka = formatDateStr(data.establishmentSkDate || "");

  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 0.5,
    runs: [
      {
        text: `Menurut keterangannya dalam hal ini bertindak berdasarkan kuasa yang diberikan dalam Keputusan Sirkuler Para Pemegang Saham `,
      },
      { text: `"PT. ${data.companyName.toUpperCase()}"`, bold: true },
      {
        text: ` sebagai pengganti Keputusan yang diambil pada Rapat Umum Pemegang Saham Luar Biasa yang ditandatangani terakhir tertanggal ${tglSirkulerHuruf} (${tglSirkulerAngka}), demikian sah mewakili untuk dan atas nama serta kepentingan `,
      },
      { text: `PT. ${data.companyName.toUpperCase()}`, bold: true },
      {
        text: `, perseroan berkedudukan ${toTitleCase(data.newAddress?.city || data.domicile || "...")}, demikian berdasarkan Akta Pendirian tertanggal ${tglPendirianHuruf} (${tglPendirianAngka}), Nomor ${data.establishmentDeedNumber}, telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${tglSKPendirianHuruf} (${tglSKPendirianAngka}), Nomor ${data.establishmentSkNumber}, dibuat di hadapan ${checkNotaryWording(data.establishmentNotary, data.establishmentNotaryTitle, data.establishmentNotaryDomicile)} dan telah mengalami perubahan berdasarkan akta sebagai berikut :-`,
      },
    ],
  });

  // Amendment deeds
  if (data.amendmentDeeds && data.amendmentDeeds.length > 0) {
    data.amendmentDeeds.forEach((deed, i) => {
      const isLast = i === data.amendmentDeeds.length - 1;
      const tglDeedHuruf = dateToWords(deed.date);
      const tglDeedAngka = formatDateStr(deed.date);

      let skText = "";
      if (deed.skSpDocuments && deed.skSpDocuments.length > 0) {
        const sks = deed.skSpDocuments.filter((d) => d.type === "SK");
        const sps = deed.skSpDocuments.filter((d) => d.type !== "SK");

        const skParts: string[] = [];
        sks.forEach((sk) => {
          skParts.push(
            `telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia tertanggal ${dateToWords(sk.date)} (${formatDateStr(sk.date)}), Nomor ${sk.number}`,
          );
        });

        const spParts: string[] = [];
        if (sps.length > 0) {
          const spDescParts = sps.map((sp) => {
            if (sp.type === "SP_DATA_PERSEROAN")
              return `Surat Penerimaan Pemberitahuan Perubahan Data Perseroan Nomor ${sp.number}`;
            if (sp.type === "SP_ANGGARAN_DASAR")
              return `Surat Penerimaan Pemberitahuan Perubahan Anggaran Dasar Nomor ${sp.number}`;
            return `Surat Penerimaan Pemberitahuan Nomor ${sp.number}`;
          });

          const spDates = Array.from(new Set(sps.map((s) => s.date)));
          let spDateText = "";
          if (spDates.length === 1) {
            spDateText = ` ${sps.length > 1 ? (sks.length > 0 ? "ketiganya " : "keduanya ") : ""}tertanggal ${formatDateStr(spDates[0])} (${dateToWords(spDates[0])})`;
          } else {
            spDateText = ` masing-masing tertanggal sebagaimana tercantum dalam surat tersebut`;
          }

          spParts.push(
            `Pemberitahuannya telah diterima dan dicatat dalam Sistem Administrasi Badan Hukum Kementerian Hukum Republik Indonesia berdasarkan ${spDescParts.join(" dan ")}${spDateText}`,
          );
        }

        skText = [...skParts, ...spParts].join(" dan ");
      } else {
        skText = `telah mendapat pengesahan berdasarkan Surat Keputusan Nomor ${deed.skNumber} tanggal ${formatDateStr(deed.skDate)} (${dateToWords(deed.skDate)})`;
      }

      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1.5,
        runs: [
          {
            text: `Akta Perubahan tertanggal ${tglDeedHuruf} (${tglDeedAngka}) Nomor ${deed.number} yang dibuat di hadapan ${checkNotaryWording(deed.notary, deed.notaryTitle, deed.notaryDomicile)} yang ${skText}${isLast ? "." : ";"}`,
          },
        ],
      });
    });
  }

  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 0.5,
    runs: [
      {
        text: `Bahwa para pemegang saham perseroan telah mengambil keputusan berdasarkan Keputusan Sirkuler Para Pemegang Saham `,
      },
      { text: `PT. ${data.companyName.toUpperCase()}`, bold: true },
      {
        text: ` sebagai pengganti Keputusan yang diambil pada Rapat Umum Pemegang Saham Luar Biasa yang ditandatangani secara bersama-sama dan/atau dengan cara diedarkan, yang terakhir ditandatangani pada tanggal ${tglSirkulerAngka} (${tglSirkulerHuruf}) bermeterai cukup yang aslinya dilekatkan pada minuta akta ini (selanjutnya akan disebut “Keputusan Sirkuler”);`,
      },
    ],
  });

  const totalShares = data.shareholders.reduce(
    (sum, s) => sum + s.sharesOwned,
    0,
  );
  const totalSharesHuruf = terbilang(totalShares);

  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 0.5,
    runs: [
      {
        text: `Bahwa Keputusan Sirkuler mana telah ditandatangani dan mewakili seluruh saham yang telah dikeluarkan dan disetor penuh (“para pemegang saham”) sampai dengan hari ini, yaitu sebanyak ${formatNumber(totalShares)} (${totalSharesHuruf}) lembar saham atau 100 % (seratus persen) dari saham dalam Perseroan `,
      },
      { text: `PT. ${data.companyName.toUpperCase()}`, bold: true },
      { text: ` telah memenuhi kuorum.` },
    ],
  });

  data.shareholders.forEach((sh, i) => {
    const shTotalRp = sh.sharesOwned * data.originalSharePrice;

    // Sesuai contoh_ke_2.docx: format numbered list "1." "2." dengan left=567, hanging=283
    // (numId=3, ilvl=0 di XML contoh, diemulasi sebagai type 'list' dengan bullet nomor)
    blocks.push({
      type: "list",
      bullet: `${i + 1}.`,
      indentTabs: 0.668, // leftDxa ≈ 567 (0.668 * 850 ≈ 568)
      runs: [
        { text: `${sh.salutation} ` },
        ...getPersonDetailRuns(sh),
        {
          text: `, selaku pemilik dan pemegang ${formatNumber(sh.sharesOwned)} (${terbilang(sh.sharesOwned)}) lembar saham perseroan atau senilai Rp ${formatNumber(shTotalRp)},- (${terbilang(shTotalRp)} rupiah).`,
        },
      ],
    });
  });

  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 0.5,
    runs: [
      {
        text: `Bahwa Berdasarkan ketentuan dalam Pasal 91 Undang-Undang Republik Indonesia, Nomor 40 Tahun 2007, tentang perseroan terbatas, Juncto pasal 10 ayat 1 anggaran dasar perseroan, Para Pemegang Saham dapat juga mengambil keputusan yang sah tanpa mengadakan Rapat Umum Pemegang Saham, dengan ketentuan semua pemegang saham telah diberitahu secara tertulis dan semua pemegang saham memberikan persetujuan mengenai usul yang diajukan secara tertulis serta secara tertulis menandatangani persetujuan tersebut. Keputusan yang diambil dengan cara demikian mempunyai kekuatan yang sama dengan keputusan yang diambil dengan sah dalam Rapat Umum Pemegang Saham;`,
      },
    ],
  });

  blocks.push({
    type: "list",
    bullet: "-",
    indentTabs: 0.5,
    runs: [
      {
        text: `Bahwa para pemegang saham telah menyetujui dan memutuskan untuk memberikan kuasa dengan hak substitusi kepada `,
      },
      { text: `${rep?.salutation || "Tuan"} ` },
      { text: rep?.name.toUpperCase() || "...", bold: true },
      {
        text: `, tersebut diatas untuk melakukan tindakan-tindakan yang diperlukan sehubungan dengan keputusan Rapat di atas, termasuk memberi keterangan-keterangan, membuat, minta dibuatkan dan menandatangani segala surat dan akta dihadapan Notaris dan umumnya menjalankan segala tindakan yang dianggap perlu dan berguna.`,
      },
    ],
  });

  blocks.push({
    type: "p",
    runs: [
      {
        text: `Sehubungan dengan segala sesuatu yang diuraikan di atas, penghadap bertindak dalam kedudukannya tersebut di atas dengan ini menyatakan bahwa berdasarkan Keputusan Sirkuler para pemegang saham Perseroan dengan suara bulat, antara lain, telah setuju dan memutuskan untuk menyetujui hal-hal sebagai berikut:`,
      },
    ],
  });

  // RESOLUTIONS
  blocks.push({
    type: "p",
    number: 1,
    runs: [
      {
        text: `Pengambilan keputusan para pemegang saham dengan keputusan sirkuler para pemegang saham yang mempunyai kekuatan hukum yang sama dengan suatu keputusan yang diambil dalam Rapat Umum Pemegang Saham (“RUPS”).`,
      },
    ],
  });

  let resIdx = 2;

  // Name and Domicile Changes (Pasal 1)
  if (data.resolutions.companyNameChange || data.resolutions.domicile) {
    const isBoth =
      data.resolutions.companyNameChange && data.resolutions.domicile;
    const isName = data.resolutions.companyNameChange;
    const isDomicile = data.resolutions.domicile;

    const newName = (data.targetCompanyName || data.companyName).toUpperCase();
    const areaNew = data.newAddress?.city || data.domicile || "...";

    let subject = "Nama dan Tempat Kedudukan Perseroan";
    if (isName && !isDomicile) subject = "Nama Perseroan";
    if (!isName && isDomicile) subject = "Tempat Kedudukan Perseroan";

    blocks.push({
      type: "p",
      number: resIdx++,
      runs: [
        {
          text: `Menyetujui dan memutuskan untuk mengubah ketentuan Pasal 1 ayat (1) Anggaran Dasar Perseroan mengenai ${subject}, sehingga selanjutnya menjadi berbunyi sebagai berikut :`,
        },
      ],
    });

    blocks.push({
      type: "divider",
      text: "Pasal 1",
    });

    blocks.push({
      type: "p",
      subNumber: 1,
      runs: [
        { text: `Perseroan ini bernama ` },
        { text: `"PT. ${newName}"`, bold: true },
        {
          text: ` (selanjutnya dalam Anggaran Dasar ini cukup disebut dengan “Perseroan”), berkedudukan di `,
        },
        { text: toTitleCase(areaNew), bold: true },
        { text: `.` },
      ],
    });
  }

  // Address Change
  if (data.resolutions.address) {
    blocks.push({
      type: "p",
      number: resIdx++,
      runs: [
        {
          text: `Menyetujui dan memutuskan untuk mengubah alamat lengkap Perseroan, yang semula beralamat di `,
        },
        { text: formatAddress(data.oldFullAddress || "..."), bold: true },
        { text: ` menjadi beralamat di ` },
        { text: formatAddress(data.fullAddress || "..."), bold: true },
        { text: `.` },
      ],
    });
  }

  // Maksud dan Tujuan
  if (data.resolutions.kbli) {
    blocks.push({
      type: "p",
      number: resIdx++,
      runs: [
        {
          text: `Menyetujui dan memutuskan untuk mengubah ketentuan Pasal 3 ayat (1) dan ayat (2) Anggaran Dasar Perseroan mengenai Maksud dan Tujuan serta Kegiatan Usaha, sehingga selanjutnya menjadi berbunyi sebagai berikut :`,
        },
      ],
    });

    blocks.push({
      type: "p",
      subNumber: 1,
      indentTabs: 1,
      runs: [
        { text: `Maksud dan Tujuan Perseroan adalah berusaha dalam bidang :` },
      ],
    });

    const categories = Array.from(
      new Set(data.kbliItems.map((k) => k.categoryName)),
    ).filter(Boolean) as string[];
    categories.forEach((cat) => {
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 1,
        runs: [{ text: cat.toUpperCase() }],
      });
    });

    blocks.push({
      type: "p",
      subNumber: 2,
      indentTabs: 1,
      runs: [
        {
          text: `Untuk mencapai maksud dan tujuan tersebut diatas, perseroan dapat melaksanakan kegiatan usaha sebagai berikut :`,
        },
      ],
    });

    data.kbliItems.forEach((kbli) => {
      // Nama KBLI: sesuai XML contoh_ke_2.docx menggunakan list dengan bullet '-'
      // numId=4, ilvl=0 → indentTabs: 2 (leftDxa=1417, bullet di 1134)
      blocks.push({
        type: "list",
        bullet: "-",
        indentTabs: 2,
        runs: [{ text: `${kbli.code} - ${kbli.name};`, bold: true }],
      });
      // Deskripsi KBLI: left=1417 DXA, tanpa bullet (tipe 'p')
      blocks.push({
        type: "p",
        indentTabs: 2,
        kbliDesc: true,
        runs: [{ text: kbli.description || "" }],
      });
    });
  }

  // Capital changes
  if (data.resolutions.capitalBase || data.resolutions.capitalBaseDecrease) {
    const isIncrease = data.resolutions.capitalBase;
    const oldBase = data.originalCapitalBase;
    const newBase = data.targetCapitalBase;
    const oldShares = data.originalAuthorizedShares;
    const newShares =
      data.originalSharePrice > 0
        ? data.targetCapitalBase / data.originalSharePrice
        : 0;

    blocks.push({
      type: "p",
      number: resIdx++,
      runs: [
        {
          text: `Menyetujui untuk ${isIncrease ? "meningkatkan" : "menurunkan"} Modal Dasar Perseroan, yang semula sebesar Rp. ${formatNumber(oldBase)},- (${terbilang(oldBase)} rupiah) terbagi atas ${formatNumber(oldShares)} (${terbilang(oldShares)}) lembar saham, masing-masing saham bernilai nominal Rp. ${formatNumber(data.originalSharePrice)},- (${terbilang(data.originalSharePrice)} rupiah), menjadi sebesar Rp. ${formatNumber(newBase)},- (${terbilang(newBase)} rupiah) terbagi atas ${formatNumber(newShares)} (${terbilang(newShares)}) lembar saham, masing-masing saham bernilai nominal Rp. ${formatNumber(data.originalSharePrice)},- (${terbilang(data.originalSharePrice)} rupiah).`,
        },
      ],
    });
  }

  if (data.resolutions.capitalPaid || data.resolutions.capitalPaidDecrease) {
    const isIncrease = data.resolutions.capitalPaid;
    const oldPaid = data.originalCapitalPaid;
    const newPaid = data.targetCapitalPaid;
    const oldShares = data.originalTotalShares;
    const newShares =
      data.originalSharePrice > 0
        ? data.targetCapitalPaid / data.originalSharePrice
        : 0;

    blocks.push({
      type: "p",
      number: resIdx++,
      runs: [
        {
          text: `Menyetujui untuk ${isIncrease ? "meningkatkan" : "menurunkan"} Modal Ditempatkan dan Disetor dalam Perseroan, yang semula sebesar Rp. ${formatNumber(oldPaid)},- (${terbilang(oldPaid)} rupiah) yang terbagi menjadi sejumlah ${formatNumber(oldShares)} (${terbilang(oldShares)}) lembar saham, menjadi sebesar Rp. ${formatNumber(newPaid)},- (${terbilang(newPaid)} rupiah) yang terbagi menjadi sejumlah ${formatNumber(newShares)} (${terbilang(newShares)}) lembar saham.`,
        },
      ],
    });

    if (isIncrease) {
      const newDeposits = data.finalShareholders
        .map((fs) => {
          const originalFs = data.shareholders.find(
            (s) => s.id === fs.linkedPartyId || s.name === fs.name,
          );
          const originalShares = originalFs ? originalFs.sharesOwned : 0;

          let sharesFromTransfer = 0;
          let sharesToTransfer = 0;

          if (data.shareTransfers) {
            data.shareTransfers.forEach((t) => {
              if (
                t.toShareholderId === fs.id ||
                t.toShareholderId === fs.linkedPartyId
              )
                sharesFromTransfer += t.sharesTransferred;
              if (
                t.fromShareholderId === fs.id ||
                t.fromShareholderId === fs.linkedPartyId
              )
                sharesToTransfer += t.sharesTransferred;
            });
          }

          const expectedShares =
            originalShares + sharesFromTransfer - sharesToTransfer;
          const newlyDepositedShares = fs.sharesOwned - expectedShares;
          const valueRp = newlyDepositedShares * data.originalSharePrice;

          return {
            fs,
            depositedShares: newlyDepositedShares,
            valueRp,
          };
        })
        .filter((d) => d.depositedShares > 0);

      if (newDeposits.length > 0) {
        blocks.push({
          type: "p",
          indent: true, // left=284 sesuai XML contoh_ke_2.docx
          runs: [
            {
              text: `Bahwa pengeluaran saham-saham baru tersebut di atas, telah diambil bagian dan disetor penuh secara tunai melalui kas Perseroan oleh masing - masing pemegang saham dengan rincian sebagai berikut :`,
            },
          ],
        });

        newDeposits.forEach((d) => {
          blocks.push({
            type: "shareholder-list",
            bullet: "-",
            name: d.fs.name.toUpperCase(),
            sharesText: `: ${formatNumber(d.depositedShares)} (${terbilang(d.depositedShares)}) lembar saham`,
            rpText: `atau senilai Rp. ${formatNumber(d.valueRp)},- (${terbilang(d.valueRp)} rupiah);`,
          });
        });
      }
    }
  }

  // Shareholders change
  if (data.resolutions.shareholders) {
    blocks.push({
      type: "p",
      number: resIdx++,
      runs: [
        {
          text: `Menyetujui pengalihan seluruh saham secara hibah/jual beli dengan rincian sebagai berikut :`,
        },
      ],
    });

    data.shareTransfers.forEach((t) => {
      const from = data.shareholders.find((s) => s.id === t.fromShareholderId);
      const to =
        data.shareholders.find((s) => s.id === t.toShareholderId) ||
        data.finalShareholders.find((s) => s.id === t.toShareholderId);
      const valRp = t.sharesTransferred * data.originalSharePrice;

      blocks.push({
        type: "list",
        bullet: "-",
        runs: [
          { text: `${from?.salutation} ` },
          ...getPersonDetailRuns(from),
          {
            text: ` mengalihkan ${formatNumber(t.sharesTransferred)} (${terbilang(t.sharesTransferred)}) lembar saham perseroan atau senilai Rp ${formatNumber(valRp)},- (${terbilang(valRp)} rupiah) kepada ${to?.salutation} `,
          },
          ...getPersonDetailRuns(to),
          { text: `.` },
        ],
      });
    });
  }

  // Final shareholders list (print if either shareholders or capital structure changes)
  if (
    data.resolutions.shareholders ||
    data.resolutions.capitalPaid ||
    data.resolutions.capitalPaidDecrease ||
    data.resolutions.capitalBase ||
    data.resolutions.capitalBaseDecrease
  ) {
    if (!data.resolutions.shareholders) {
      blocks.push({
        type: "p",
        number: resIdx++,
        runs: [
          {
            text: `Sehingga merubah susunan pemegang saham perseroan menjadi sebagai berikut :`,
          },
        ],
      });
    } else {
      blocks.push({
        type: "p",
        runs: [
          {
            text: `Sehingga merubah susunan pemegang saham perseroan menjadi sebagai berikut :`,
          },
        ],
      });
    }

    data.finalShareholders.forEach((fs) => {
      const fsTotal = fs.sharesOwned * data.originalSharePrice;
      blocks.push({
        type: "shareholder-list",
        bullet: "-",
        name: fs.name.toUpperCase(),
        sharesText: `: ${formatNumber(fs.sharesOwned)} (${terbilang(fs.sharesOwned)}) lembar saham`,
        rpText: `atau senilai Rp. ${formatNumber(fsTotal)},- (${terbilang(fsTotal)} rupiah);`,
      });
    });
  }

  // Management change
  if (data.resolutions.management || data.resolutions.reappointment) {
    const isReappointment = data.resolutions.reappointment;

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
        .map((s) => ({ ...s, position: s.managementPosition || "Pengurus" })),
      ...(data.newManagementItems || []),
    ];

    const changeType = data.managementChangeType || "ALL_DISMISSED";
    let managersToDismiss = [];
    let managersToAppoint = [];

    if (changeType === "PARTIAL_CHANGE") {
      // Logic from user: only dismiss those who leave or change position
      managersToDismiss = oldManagers.filter(
        (om) =>
          !newManagers.some(
            (nm) =>
              nm.name.toUpperCase().trim() === om.name.toUpperCase().trim() &&
              nm.position.toUpperCase().trim() ===
                om.position.toUpperCase().trim(),
          ),
      );
      managersToAppoint = newManagers.filter(
        (nm) =>
          !oldManagers.some(
            (om) =>
              om.name.toUpperCase().trim() === nm.name.toUpperCase().trim() &&
              om.position.toUpperCase().trim() ===
                om.position.toUpperCase().trim(),
          ),
      );
    } else {
      // ALL_DISMISSED or REAPPOINTMENT
      managersToDismiss = oldManagers;
      managersToAppoint = newManagers;
    }

    // DISMISSAL BLOCK
    if (managersToDismiss.length > 0) {
      blocks.push({
        type: "p",
        number: resIdx++,
        runs: [
          {
            text: `Menyetujui untuk memberhentikan dengan hormat ${changeType === "PARTIAL_CHANGE" ? "anggota" : "seluruh anggota"} Direksi dan Dewan Komisaris Perseroan${changeType === "PARTIAL_CHANGE" ? "" : " yang menjabat saat ini"}, yaitu :`,
          },
        ],
      });

      managersToDismiss.forEach((m) => {
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 0.8, // → left=567, hanging=283 (sesuai XML contoh_6.docx)
          runs: [
            ...getPersonDetailRuns(m as any),
            { text: ` selaku ${m.position} perseroan` },
          ],
        });
      });

      blocks.push({
        type: "p",
        indentTabs: 0.334, // → left=284 (sesuai XML: indent paragraf setelah list direksi)
        runs: [
          {
            text: `dengan ucapan terima kasih atas jasa-jasa dan pengabdian yang telah diberikan selama masa jabatannya dalam Perseroan, serta memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya (acquit et de charge) atas tindakan pengurusan dan pengawasan yang telah dijalankan, sepanjang tindakan-tindakan tersebut tercermin dalam buku-buku serta laporan tahunan Perseroan.`,
          },
        ],
      });
    }

    // APPOINTMENT BLOCK
    if (managersToAppoint.length > 0) {
      blocks.push({
        type: "p",
        number: managersToDismiss.length === 0 ? resIdx++ : undefined,
        runs: [
          {
            text: `Selanjutnya menyetujui untuk mengangkat nama-nama tersebut di bawah ini sebagai anggota Direksi dan Dewan Komisaris Perseroan yang ${changeType === "PARTIAL_CHANGE" ? "baru" : "baru"} :`,
          },
        ],
      });

      managersToAppoint.forEach((m) => {
        blocks.push({
          type: "list",
          bullet: "-",
          indentTabs: 0.8, // → left=567, hanging=283 (sesuai XML contoh_6.docx)
          runs: [
            { text: `${m.salutation} ` },
            ...getPersonDetailRuns(m as any),
            { text: `, sebagai ${m.position} Perseroan;` },
          ],
        });
      });
    }

    // FINAL COMPOSITION BLOCK
    if (managersToDismiss.length > 0 || managersToAppoint.length > 0) {
      blocks.push({
        type: "p",
        indentTabs: 0.334, // → left=284
        runs: [
          {
            text: `Sehingga susunan anggota Direksi dan Dewan Komisaris Perseroan menjadi sebagai berikut :`,
          },
        ],
      });
      newManagers.forEach((m) => {
        blocks.push({
          type: "management-list",
          position: m.position,
          name: m.name.toUpperCase(),
        });
      });

      blocks.push({
        type: "p",
        indentTabs: 0.334, // → left=284
        runs: [
          {
            text: `Masa jabatan anggota Direksi dan Dewan Komisaris tersebut di atas berlaku efektif terhitung sejak tanggal Keputusan ini ditetapkan, ${data.managementEffectiveUntil || "untuk jangka waktu sebagaimana yang ditentukan dalam Anggaran Dasar Perseroan"}, dengan tidak mengurangi hak Rapat Umum Pemegang Saham untuk memberhentikan sewaktu-waktu sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.`,
          },
        ],
      });
    }
  }

  blocks.push({
    type: "p",
    runs: [
      {
        text: `Penghadap menyatakan dengan ini menjamin akan kebenaran, keaslian dan kelengkapan identitas pihak-pihak yang namanya tersebut dalam akta ini dan seluruh dokumen yang menjadi dasar akta ini tanpa ada yang dikecualikan yang disampaikan kepada saya, Notaris, sehingga apabila dikemudian hari sejak ditandatanganinya akta ini timbul sengketa dengan nama dan dalam bentuk apapun yang disebabkan karena akta ini, maka pihak yang membuat keterangan dengan ini berjanji mengikatkan dirinya untuk bertanggung jawab dan bersedia menanggung resiko yang timbul dan dengan ini penghadap menyatakan dengan tegas membebaskan saya, Notaris, dan para saksi dari turut bertanggung jawab dan memikul baik sebagian maupun seluruhnya akibat hukum yang timbul karena sengketa tersebut.`,
      },
    ],
  });

  blocks.push({
    type: "p",
    runs: [
      {
        text: `Selanjutnya penghadap juga menyatakan telah mengerti, memahami dan menyetujui isi akta ini.`,
      },
    ],
  });

  blocks.push({
    type: "p",
    runs: [
      {
        text: `Dari segala sesuatu yang diuraikan tersebut di atas, maka saya, Notaris membuat Akta Pernyataan Keputusan Rapat ini untuk dapat dipergunakan sebagaimana mestinya.`,
      },
    ],
  });

  blocks.push({ type: "divider", text: `DEMIKIANLAH AKTA INI` });

  blocks.push({
    type: "p",
    runs: [
      {
        text: `Dibuat sebagai minuta dan dilangsungkan di Kabupaten Bandung Barat, pada hari dan tanggal serta jam sebagaimana disebutkan pada awal akta ini, dengan di hadiri oleh :`,
      },
    ],
  });

  // Saksi 1
  blocks.push({
    type: "saksi",
    number: 1,
    runs: [
      { text: (data.saksi1Nama || "Nendi Suhendi").toUpperCase(), bold: true },
      {
        text: `, lahir di ${data.saksi1Lahir || "Bandung, pada tanggal limabelas Juli seribu sembilan ratus sembilan puluh satu (15-07-1991)"}, Warga Negara Indonesia, bertempat tinggal di ${formatAddress(data.saksi1Alamat || "Jalan Sukaresmi Nomor 12, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi")}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi1NIK || "3217011507910016"};`,
      },
    ],
  });

  // Saksi 2
  blocks.push({
    type: "saksi",
    number: 2,
    runs: [
      {
        text: (data.saksi2Nama || "Siti Nur Azizah").toUpperCase(),
        bold: true,
      },
      {
        text: `, lahir di ${data.saksi2Lahir || "Bandung, pada tanggal tujuh belas Desember seribu sembilan ratus sembilan puluh sembilan (17-12-1999)"}, Warga Negara Indonesia, bertempat tinggal di ${formatAddress(data.saksi2Alamat || "Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh Rukun Tetangga 001, Rukun Warga 004, Desa Ciburial, Kecamatan Cimenyan")}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi2NIK || "3204065712990001"}.`,
      },
    ],
    spaceAfter: true,
  });

  blocks.push({
    type: "p",
    runs: [
      { text: `Keduanya karyawan kantor Notaris dan sebagai saksi-saksi.` },
    ],
  });

  blocks.push({
    type: "p",
    runs: [
      {
        text: `Segera setelah akta ini dibacakan oleh saya, Notaris kepada penghadap dan saksi-saksi, maka ditanda-tanganilah akta ini oleh penghadap, saksi-saksi dan saya, Notaris, serta penghadap membubuhkan sidik jari sebelah kanan pada lembaran tersendiri di hadapan saya, Notaris dan saksi-saksi, yang dilekatkan pada minuta akta ini.`,
      },
    ],
  });

  blocks.push({
    type: "p",
    runs: [{ text: `Dilangsungkan dengan tanpa perubahan.` }],
  });

  blocks.push({
    type: "p",
    indentTabs: 1,
    runs: [{ text: `Minuta Akta ini telah ditanda-tangani dengan sempurna.` }],
  });

  blocks.push({
    type: "p",
    indentTabs: 2,
    runs: [{ text: `Diberikan sebagai salinan yang sama bunyinya.` }],
    spaceAfter: true,
  });

  // NOTE: "Notaris di ..." dan nama notaris di-generate langsung di generateRUPSDocx.ts
  // untuk memastikan format (indent left=4252, center, border kiri tidak ada) benar.

  return blocks;
};