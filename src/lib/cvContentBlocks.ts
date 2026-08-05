import { CVProfile, Pesero, KbliItem, Address } from '../../types';
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
} from './formatter';

export interface Run {
  text: string;
  bold?: boolean;
}

export type Block =
  | { type: 'p'; runs: Run[]; align?: 'center' | 'right-center'; indentTabs?: number; kbliDesc?: boolean; hanging?: number }
  | { type: 'br' }
  | { type: 'divider'; text: string }
  | { type: 'pasal-divider'; text: string }
  | { type: 'cv-name'; text: string }
  | { type: 'numbered'; num: number | string; runs: Run[]; indentTabs?: number; _numId?: string }
  | { type: 'sub-numbered'; num: number | string; runs: Run[]; indentTabs?: number; _numId?: string }
  | { type: 'list'; bullet?: string; runs: Run[]; indentTabs?: number; _numId?: string }
  | { type: 'pesero-modal'; name: string; amountText: string; rpText: string }
  | { type: 'pasal5-pengurus'; runs: Run[] }
  | { type: 'pasal5-komanditer'; runs: Run[] }
  | { type: 'saksi'; num: number | string; runs: Run[] };

// Helper to clean and format CV Name
export function formatCvNameTitle(rawName: string): string {
  const cleanName = cleanCompanyName(rawName || '').toUpperCase();
  return `"CV. ${cleanName}”`;
}

// ── 1. HEADER & OPENING ──────────────────────────────────────────────────
export function createCvOpening(data: CVProfile): Block[] {
  const blocks: Block[] = [];
  const cleanName = cleanCompanyName(data.namaCV || '').toUpperCase();
  const titleName = `"CV. ${cleanName}”`;

  const hDate = new Date(data.tanggal || new Date());
  const isDateValid = !isNaN(hDate.getTime());
  const hari = isDateValid
    ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][hDate.getDay()]
    : '............................';
  const tglHuruf = data.tanggal ? formatAktaDate(data.tanggal) : '............................';

  const notarisTempat = data.notarisTempat || data.notaryDomicile || 'Kabupaten Bandung Barat';
  const notarisNama = data.notaryName || 'R.A. NUKANTINI PUTRI PARINCHA, SH., M.Kn.';

  // Time formatting
  const waktuStr = data.waktu || '10:30 WIB';
  const waktuWords = timeToWords(waktuStr.replace(' WIB', ''));

  blocks.push(
    { type: 'p', runs: [{ text: 'PENDIRIAN PERSEROAN KOMANDITER', bold: true }], align: 'center' },
    { type: 'cv-name', text: titleName },
    { type: 'p', runs: [{ text: `Nomor : ${data.nomorAkta || '02'}`, bold: true }], align: 'center' },
    { type: 'br' },
    {
      type: 'p',
      runs: [
        {
          text: `Pada hari ini, ${hari}, tanggal ${tglHuruf}.\nPukul ${waktuStr} (${waktuWords} Waktu Indonesia Bagian Barat).\nBerhadapan dengan saya, ${notarisNama}, Notaris di ${notarisTempat}, dengan dihadiri oleh saksi-saksi yang saya, Notaris kenal dan akan disebut pada bagian akhir akta ini :`,
        },
      ],
    }
  );

  return blocks;
}

// ── 2. PENGHADAP (PESERO LIST) ──────────────────────────────────────────
export function createCvPenghadap(data: CVProfile): Block[] {
  const blocks: Block[] = [];
  const peseros = data.peseros || [];
  const notarisTempat = data.notarisTempat || data.notaryDomicile || 'Kabupaten Bandung Barat';

  peseros.forEach((p, idx) => {
    const tglLahirHuruf = dateToWords(p.birthDate || '');
    const tglLahirAngka = formatDateStr(p.birthDate || '');
    const sal = (p.salutation || 'Tuan').trim();
    const nameText = (p.name || '').toUpperCase().trim();

    const addrUnion = typeof p.address === 'object' ? p.address : null;
    const addressObj: Address = typeof p.address === 'string'
      ? {
          fullAddress: p.address,
          province: '',
          city: '',
          rt: '',
          rw: '',
          kelurahan: '',
          kecamatan: '',
        }
      : {
          fullAddress: addrUnion?.fullAddress || '',
          province: addrUnion?.province || '',
          city: addrUnion?.city || '',
          rt: addrUnion?.rt || '',
          rw: addrUnion?.rw || '',
          kelurahan: addrUnion?.kelurahan || '',
          kecamatan: addrUnion?.kecamatan || '',
        };

    // Format person details using standard formatter
    const details = formatPersonDetails(
      {
        birthCity: p.birthCity,
        birthDate: p.birthDate,
        nationalityType: p.nationalityType || 'WNI',
        nationality: p.nationality || 'Indonesia',
        occupation: p.occupation,
        address: addressObj,
        nik: p.nik,
      },
      tglLahirAngka,
      tglLahirHuruf,
      true
    );

    blocks.push({
      type: 'numbered',
      num: idx + 1,
      runs: [
        { text: `${sal} ${nameText}`, bold: true },
        { text: `${details};` },
      ],
    });
  });

  // Temporary domicile clause for appearers if applicable
  blocks.push({
    type: 'p',
    runs: [{ text: `Keduanya berada di ${notarisTempat};` }],
  });

  blocks.push({
    type: 'p',
    runs: [{ text: 'Para penghadap telah memperkenalkan diri kepada saya, Notaris.' }],
  });

  blocks.push({
    type: 'p',
    runs: [
      {
        text: 'Penghadap dengan ini menerangkan, bahwa dengan tidak mengurangi izin dari pihak yang berwenang telah sepakat dan setuju untuk bersama-sama mendirikan suatu perseroan komanditer berdasarkan akta pendirian ini yang memuat anggaran dasar dan keterangan lain yang berkaitan dengan pendirian perseroan, sebagai berikut :',
      },
    ],
  });

  return blocks;
}

// ── 3. PASAL 1: NAMA DAN TEMPAT KEDUDUKAN ─────────────────────────────
export function createCvPasal1(data: CVProfile): Block[] {
  const cleanName = cleanCompanyName(data.namaCV || '').toUpperCase();
  const cvName = `" CV. ${cleanName}”`;
  const domicile = data.kotaKedudukan || 'Kota Bandung';
  const fullAddress = data.alamatLengkapCV || 'Mekarwangi Nomor 28, Kelurahan Kebon Lega, Kecamatan Bojong Loa Kidul';

  return [
    { type: 'divider', text: 'NAMA DAN TEMPAT KEDUDUKAN' },
    { type: 'pasal-divider', text: 'PASAL 1' },
    {
      type: 'list',
      bullet: '1.',
      runs: [{ text: 'Perseroan komanditer ini bernama :' }],
    },
    { type: 'cv-name', text: cvName },
    {
      type: 'p',
      runs: [
        {
          text: `(selanjutnya disebut " Perseroan "), berkedudukan di ${domicile}, ${fullAddress};`,
        },
      ],
    },
    {
      type: 'list',
      bullet: '2.',
      runs: [
        {
          text: 'Perseroan dapat membuka kantor cabang atau kantor perwakilan, baik didalam maupun di luar wilayah Republik Indonesia sebagaimana ditetapkan oleh para pesero.',
        },
      ],
    },
  ];
}

// ── 4. PASAL 2: JANGKA WAKTU BERDIRINYA & KEDUDUKAN HUKUM ──────────────
export function createCvPasal2(data: CVProfile): Block[] {
  const durationText = data.duration || 'tidak terbatas';

  return [
    { type: 'divider', text: 'JANGKA WAKTU BERDIRINYA\nDAN KEDUDUKAN HUKUM PARA PESERO' },
    { type: 'pasal-divider', text: 'PASAL 2' },
    {
      type: 'list',
      bullet: '1.',
      runs: [
        {
          text: `Perseroan didirikan untuk jangka waktu ${durationText} dan dimulai pada tanggal ditandatanganinya akta ini.`,
        },
      ],
    },
    {
      type: 'list',
      bullet: '2.',
      runs: [
        {
          text: 'Masing-masing pesero setiap waktu berhak menjual/ mengalihkan modal/sahamnya dan mengundurkan diri atau keluar dari perseroan ini dan para pesero yang ada diprioritaskan untuk membeli modal/saham tersebut dalam waktu 30 (tigapuluh) hari dan setelah itu pihak lain yang bukan pesero dapat membelinya jika pesero yang ada menolak untuk membeli.',
        },
      ],
    },
  ];
}

// ── 5. PASAL 3: MAKSUD DAN TUJUAN SERTA KEGIATAN USAHA ────────────────
export function createCvPasal3(data: CVProfile): Block[] {
  const blocks: Block[] = [
    { type: 'divider', text: 'MAKSUD DAN TUJUAN SERTA KEGIATAN USAHA' },
    { type: 'pasal-divider', text: 'PASAL 3' },
    {
      type: 'list',
      runs: [{ text: 'Maksud dan tujuan Perseroan ialah berusaha dalam bidang :' }],
    },
  ];

  // Sector or main activity category
  const mainActivity =
    data.mainActivityDescription ||
    'G - Perdagangan Besar Dan Eceran; Reparasi Dan Perawatan Mobil Dan Sepeda Motor';

  blocks.push({
    type: 'list',
    runs: [{ text: mainActivity, bold: true }],
  });

  blocks.push({
    type: 'list',
    runs: [
      {
        text: 'Untuk mencapai maksud dan tujuan tersebut di atas Perseroan dapat melaksanakan kegiatan usaha sebagai berikut :',
      },
    ],
  });

  // Dynamic KBLI items
  const kbliItems = data.kbliItems || [];
  if (kbliItems.length === 0) {
    blocks.push(
      {
        type: 'p',
        runs: [{ text: '46411 - PERDAGANGAN BESAR TEKSTIL;', bold: true }],
      },
      {
        type: 'p',
        kbliDesc: true,
        runs: [
          {
            text: 'Mencakup usaha perdagangan besar hasil industri tekstil, seperti bermacam-macam tekstil/kain, kain batik dan lain-lain. Termasuk barang linen rumah tangga (bahan kain untuk keperluan rumah tangga) dan lain-lain.',
          },
        ],
      }
    );
  } else {
    kbliItems.forEach((item) => {
      const codeStr = item.code || item.id || '';
      const titleStr = (item.name || item.description || '').toUpperCase();
      const descStr = item.description || item.uraian || '';

      blocks.push(
        {
          type: 'p',
          runs: [{ text: `${codeStr} - ${titleStr};`, bold: true }],
        },
        {
          type: 'p',
          kbliDesc: true,
          runs: [{ text: descStr }],
        }
      );
    });
  }

  return blocks;
}

// ── 6. PASAL 4: MODAL ────────────────────────────────────────────────────
export function createCvPasal4(data: CVProfile): Block[] {
  const totalCapital = data.modalTotal || 100000000;
  const totalCapitalWords = terbilang(totalCapital);
  const totalCapitalFormatted = formatNumber(totalCapital);
  const peseros = data.peseros || [];

  const blocks: Block[] = [
    { type: 'divider', text: 'M O D A L' },
    { type: 'pasal-divider', text: 'PASAL 4' },
    {
      type: 'list',
      runs: [
        {
          text: `Modal perseroan ini berjumlah Rp. ${totalCapitalFormatted},- (${totalCapitalWords} rupiah), dimana setiap waktu harus ternyata dari buku-buku perseroan.`,
        },
      ],
    },
    {
      type: 'p',
      runs: [
        {
          text: 'Bagian masing-masing pesero dalam modal perseroan setiap waktu harus ternyata dalam buku-buku perseroan. Adapun mengenai bagian dari masing-masing pesero terhadap modal perseroan ini untuk pertama kalinya dengan susunan sebagai berikut :',
        },
      ],
    },
  ];

  // Dynamic Capital Contributions per Pesero (NO shares, NO lembar)
  peseros.forEach((p) => {
    const amount = p.modalContribution || 0;
    const amountFormatted = formatNumber(amount);
    const amountWords = terbilang(amount);
    const nameFormatted = toTitleCase(p.name);

    blocks.push({
      type: 'pesero-modal',
      name: nameFormatted,
      amountText: amountWords,
      rpText: `Rp. ${amountFormatted},-`,
    });
  });

  blocks.push(
    {
      type: 'p',
      runs: [
        {
          text: 'Para pesero masing-masing dicatat dalam buku perseroan pada rekening modal mereka untuk penyetoran-penyetoran uang atau nilai pemasukan-pemasukan benda dalam perseroan yang telah dilakukan oleh mereka, dan sebagai bukti, maka untuk tiap-tiap penyetoran dan pemasukan tersebut akan diberikan suatu tanda penerimaan yang sah yang ditandatangani oleh semua pesero.',
        },
      ],
    },
    {
      type: 'p',
      runs: [
        {
          text: 'Penambahan modal kedalam perseroan dan pengambilan bagian masing-masing pesero dari modal perseroan haruslah mendapat persetujuan dari semua pesero.',
        },
      ],
    },
    {
      type: 'p',
      runs: [
        {
          text: 'Selama perseroan berdiri dan pada waktu perseroan dibubarkan, masing-masing pesero mempunyai hak dan menanggung beban-beban/hutang-hutang perseroan secara tanggung renteng menurut perbandingan jumlah-jumlah yang telah dimasukkan oleh masing-masing kedalam perseroan, demikian dengan tidak mengurangi ketentuan yang ditetapkan dalam Pasal 9 ayat 2.',
        },
      ],
    }
  );

  return blocks;
}

// ── 7. PASAL 5: PESERO PENGURUS DAN PESERO KOMANDITER ──────────────────
export function createCvPasal5(data: CVProfile): Block[] {
  const peseros = data.peseros || [];
  const pengurusList = peseros.filter((p) => p.role === 'PENGURUS');
  const komanditerList = peseros.filter((p) => p.role === 'KOMANDITER');

  const pengurusText = pengurusList
    .map((p) => `${p.salutation || 'Tuan'} ${p.name.toUpperCase()}`)
    .join(', ');

  const blocks: Block[] = [
    { type: 'divider', text: 'PESERO PENGURUS DAN PESERO KOMANDITER' },
    { type: 'pasal-divider', text: 'Pasal 5' },
    {
      type: 'pasal5-pengurus',
      runs: [
        {
          text: `Pesero ${pengurusText}, tersebut bertindak dalam perseroan  ini sebagai Pesero Pengurus (Direktur) yang diwajibkan menanggung segala kewajiban-kewajiban, hutang-hutang, dan beban-beban perseroan dengan segala harta kekayaannya, sedangkan pesero lainnya, yaitu :`,
        },
      ],
    },
  ];

  // List of Pesero Komanditer
  komanditerList.forEach((k) => {
    blocks.push({
      type: 'pasal5-komanditer',
      runs: [
        {
          text: `${k.salutation || 'Tuan'} ${k.name.toUpperCase()} tersebut di atas;`,
        },
      ],
    });
  });

  blocks.push(
    {
      type: 'p',
      runs: [
        {
          text: 'sebagai Pesero Komanditer yang hanya turut bertanggung jawab hingga jumlah sero yang dimasukkannya dalam perseroan.',
        },
      ],
    },
    {
      type: 'p',
      runs: [
        {
          text: 'Masuknya pesero baru dalam perseroan haruslah mendapat persetujuan dari semua pesero.',
        },
      ],
    }
  );

  return blocks;
}

// ── 8. PASAL 6: PENGURUSAN PERSEROAN SERTA HAK & WEWENANG PESERO PENGURUS ─
export function createCvPasal6(data: CVProfile): Block[] {
  const peseros = data.peseros || [];
  const pengurusList = peseros.filter((p) => p.role === 'PENGURUS');
  const pengurusText = pengurusList
    .map((p) => `${p.salutation || 'Tuan'} ${p.name.toUpperCase()}`)
    .join(', ');

  return [
    {
      type: 'divider',
      text: 'PENGURUSAN PERSEROAN\nSERTA HAK DAN WEWENANG PESERO PENGURUS',
    },
    { type: 'pasal-divider', text: 'Pasal 6' },
    {
      type: 'list',
      runs: [
        {
          text: `Perseroan ini diurus dan dipimpin oleh ${pengurusText}, pesero pengurus dengan jabatan DIREKTUR;`,
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'DIREKTUR, bertanggung jawab, berhak dan berkuasa mewakili perseroan dimanapun juga, baik di dalam maupun di luar Pengadilan, mengikat orang lain dengan perseroan atau sebaliknya, dan dalam menjalankan pekerjaan itu berhak melakukan untuk dan atas nama perseroan atas segala tindakan pengurusan dan segala tindakan pemilikan, tetapi dengan ketentuan bahwa untuk :',
        },
      ],
    },
    {
      type: 'sub-numbered',
      num: 'a.',
      runs: [{ text: 'Meminjamkan uang atau meminjam uang untuk dan atas nama perseroan;' }],
    },
    {
      type: 'sub-numbered',
      num: 'b.',
      runs: [{ text: 'Memperoleh, melepaskan atau memberatkan harta kekayaan untuk/kepunyaan perseroan;' }],
    },
    {
      type: 'sub-numbered',
      num: 'c.',
      runs: [{ text: 'Mengikat perseroan sebagai penjamin;' }],
    },
    {
      type: 'sub-numbered',
      num: 'd.',
      runs: [{ text: 'Menggadaikan atau dengan cara lain menjaminkan harta kekayaan perseroan.' }],
    },
    {
      type: 'p',
      runs: [
        {
          text: 'Harus mendapat persetujuan tertulis dari atau akta yang berkenaan turut ditandatanganinya oleh pesero lainnya.',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'DIREKTUR tanpa mengurangi tanggung jawabnya, berhak pula mengangkat seseorang atau beberapa orang kuasa dengan memberikan kepadanya kekuasaan atau kekuasaan-kekuasaan yang dianggap perlu dengan surat kuasa.',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Pesero pengurus dapat diberi gaji bulanan yang besarnya akan ditetapkan oleh para pesero bersama dan dapat diubah oleh mereka menurut keadaan. Dalam buku-buku perseroan gaji-gaji dan pengeluaran-pengeluaran lainnya untuk kepentingan perseroan akan dicatat  sebagai ongkos perseroan.',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Persero pengurus tidak boleh mengikat diri sebagai Borg terkecuali dengan persetujuan persero lainnya.',
        },
      ],
    },
  ];
}

// ── 9. PASAL 7: WEWENANG PESERO KOMANDITER ────────────────────────────
export function createCvPasal7(): Block[] {
  return [
    { type: 'divider', text: 'WEWENANG PESERO KOMANDITER' },
    { type: 'pasal-divider', text: 'Pasal 7' },
    {
      type: 'p',
      runs: [
        {
          text: 'Pesero komanditer setiap waktu berhak asal saja pada waktu jam dan hari kerja, melihat semua buku-buku dan surat-surat perseroan, memeriksa kas dan barang milik perseroan, serta memasuki halaman-halaman, gedung-gedung dan kantor-kantor yang dipergunakan perseroan, dan para pesero pengurus wajib memberi segala keterangan tentang perseroan yang dikehendaki oleh pesero komanditer.',
        },
      ],
    },
  ];
}

// ── 10. PASAL 8: TAHUN BUKU, NERACA, DAN PERHITUNGAN LABA RUGI ─────────
export function createCvPasal8(data: CVProfile): Block[] {
  const signingYear = data.tanggal
    ? new Date(data.tanggal).getFullYear()
    : new Date().getFullYear();
  const closingDateText = data.TutupBukuTanggal || '31 Desember';
  const closingDateStr = `${closingDateText} ${signingYear}`;

  return [
    { type: 'divider', text: 'TAHUN BUKU, NERACA, DAN PERHITUNGAN LABA RUGI' },
    { type: 'pasal-divider', text: 'Pasal 8' },
    {
      type: 'list',
      runs: [
        {
          text: `Tahun buku perseroan berjalan dari tanggal 1 (satu) Januari sampai dengan tanggal 31 (tiga puluh satu) Desember. Pada akhir bulan Desember tiap-tiap tahun, buku-buku perseroan ditutup. Untuk pertama kalinya, buku-buku perseroan akan ditutup pada tanggal ${closingDateStr};`,
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Selambat-lambatnya dalam 3 (tiga) bulan setelah buku- buku perseroan ditutup, oleh pesero pengurus harus dibuat neraca dan perhitungan labarugi, dan setelah disetujui oleh segenap para pesero, neraca tersebut, ditandatangani oleh segenap pesero sebagai tanda pengesahan;',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Pengesahan neraca dan perhitungan laba rugi itu membebaskan pesero pengurus dari tanggung jawab mereka atas nama segala tindakan yang telah mereka lakukan dalam tahun buku yang lampau, sepanjang tindakan-tindakan mereka itu ternyata dalam buku-buku perseroan;',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Bilamana tentang pengesahan neraca dan perhitungan laba rugi terdapat perselisihan antara para pesero yang tidak dapat diselesaikan oleh mereka secara musyawarah, maka:',
        },
      ],
    },
    {
      type: 'sub-numbered',
      num: 'a.',
      runs: [
        {
          text: 'Masing-masing pihak berhak memohon kepada hakim yang berwajib di tempat kedudukan perseroan untuk mengangkat 3 (tiga) orang arbiter yang akan memutuskan perselisihan itu setelah memberi  kesempatan kepada para pesero mengajukan pendapat mereka masing-masing;',
        },
      ],
    },
    {
      type: 'sub-numbered',
      num: 'b.',
      runs: [
        {
          text: 'Para arbiter itu berhak melihat semua buku-buku dan surat-surat perseroan dan memberi keputusan sebagai orang yang jujur, dan keputusan mereka adalah keputusan terakhir;',
        },
      ],
    },
    {
      type: 'sub-numbered',
      num: 'c.',
      runs: [{ text: 'Para pesero harus tunduk kepada keputusan para arbiter tersebut.' }],
    },
  ];
}

// ── 11. PASAL 9: KEUNTUNGAN, DANA CADANGAN, DAN KERUGIAN ──────────────
export function createCvPasal9(): Block[] {
  return [
    { type: 'divider', text: 'KEUNTUNGAN, DANA CADANGAN, DAN KERUGIAN' },
    { type: 'pasal-divider', text: 'Pasal 9' },
    {
      type: 'list',
      runs: [
        {
          text: 'Keuntungan bersih dari perseroan setelah dipotong biaya-biaya eksploitasi dan biaya-biaya lainnya akan dibagikan antara para persero tersebut menurut pertimbangan modal mereka dalam perseroan.',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Bilamana dianggap perlu akan diadakan uang persediaan (reservefond) yang besarnya akan ditetapkan oleh semua persero.',
        },
      ],
    },
    {
      type: 'list',
      runs: [{ text: 'Uang persediaan akan dianggap sebagai keuntungan yang belum dibagikan.' }],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Pembagian keuntungan dilakukan dalam waktu sebulan setelah surat-surat yang dimaksud dalam pasal 8 disahkan.',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Kerugian perseroan dipikul oleh masing-masing pesero menurut perbandingan pemasukan mereka dalam modal perseroan, demikian dengan ketentuan bahwa para pesero komanditer tidak akan memikul rugi yang melebihi pemasukannya dalam modal perseroan.',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Jika ada kerugian, para persero tidak perlu menambah modalnya, cukup dikurangkan dari uang persediaan jika tidak cukup dari modalnya masing-masing, kecuali jika para persero dengan suara bulat  memutuskan untuk menambah modalnya guna menutupi kerugian tersebut.',
        },
      ],
    },
  ];
}

// ── 12. PASAL 10: MENINGGAL DUNIA, PAILIT, PENGAMPUAN ────────────────
export function createCvPasal10(): Block[] {
  return [
    {
      type: 'divider',
      text: 'MENINGGAL DUNIA, PAILIT, PENGAMPUAN\nATAU PENGUNDURAN DIRI PESERO',
    },
    { type: 'pasal-divider', text: 'Pasal 10' },
    {
      type: 'list',
      runs: [
        {
          text: 'Bilamana salah seorang pesero meninggal dunia, perseroan tidak berakhir, akan tetapi diteruskan oleh para pesero lainnya bersama-sama dengan ahli waris pesero yang meninggal dunia yang setuju untuk melanjutkan perseroan ini :',
        },
      ],
    },
    {
      type: 'sub-numbered',
      num: 'a.',
      runs: [
        {
          text: 'Jika ada lebih dari seorang ahli waris, maka mereka dalam waktu 3 (tiga) bulan setelah persero yang bersangkutan meninggal dunia harus menunjuk seorang kuasa untuk menjalankan kewajiban-kewajiban dan hak-haknya dalam perseroan;',
        },
      ],
    },
    {
      type: 'sub-numbered',
      num: 'b.',
      runs: [
        {
          text: 'Jika dalam waktu tersebut mereka tidak menunjuk seorang kuasa atau tidak menyatakan bahwa mereka bersetuju untuk turut dalam perseroan, maka mereka dianggap telah keluar dari perseroan pada waktu persero yang bersangkutan meninggal dunia.',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Bilamana yang meninggal adalan persero pengurus, maka (para) ahli warisnya dapat ikut serta dalam perseroan ini sebagai persero komanditer, kecuali apabila disetujui lain oleh persero lainnya;',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Bilamana salah seorang pesero dinyatakan pailit, diperkenankan menunda pembayaran atau ditaruh dibawah pengampunan (curatele) maka ia dianggap telah keluar dari perseroan sehari sebelum peristiwa itu terjadi, sampai waktu tersebut, buku perseroan harus ditutup dengan segera dan selekas mungkin dalam waktu 3 (tiga) bulan harus dibuat perhitungan tentang keadaan perseroan, perhitungan mana harus berdasarkan angka-angka dari daftar-daftar perhitungan yang berakhir dan harus diajukan dan diselesaikan (bagian dari yang keluar atau dianggap keluar dibayarkan).',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Perhitungan bagian sebagai dimaksud dalam ayat 1, 2, dan 3 pasal ini, harus berdasarkan atas angka-angka dan daftar perhitungan terakhir.',
        },
      ],
    },
  ];
}

// ── 13. PASAL 11: MELEPASKAN ATAU MEMBEBANI BAGIAN DALAM PERSEROAN ──────
export function createCvPasal11(): Block[] {
  return [
    {
      type: 'divider',
      text: 'MELEPASKAN ATAU MEMBEBANI\nBAGIAN DALAM PERSEROAN',
    },
    { type: 'pasal-divider', text: 'Pasal 11' },
    {
      type: 'list',
      runs: [
        {
          text: 'Masing-masing pesero dilarang untuk menjual atau melepaskan haknya atau dengan cara lain membebani bagian mereka dalam modal perseroan baik seluruhnya maupun sebagian, kecuali dengan persetujuan para pesero lainnya;',
        },
      ],
    },
    {
      type: 'list',
      runs: [
        {
          text: 'Demikian pula mengenai penerimaan persero baru harus disetujui terlebih dahulu oleh semua persero dengan ketentuan bahwa yang dapat diterima dan boleh menjalankan hak-haknya sebagai persero dalam perseroan ini hanyalan Warga Negara Indonesia.',
        },
      ],
    },
  ];
}

// ── 14. PASAL 12: PEMBUBARAN DAN LIKUIDASI ────────────────────────────
export function createCvPasal12(): Block[] {
  return [
    { type: 'divider', text: 'PEMBUBARAN DAN LIKUIDASI' },
    { type: 'pasal-divider', text: 'Pasal 12' },
    {
      type: 'p',
      runs: [
        {
          text: 'Jika perseroan ini dibubarkan, maka likuidasinya akan dilakukan oleh pesero pengurus, kecuali jika para pesero mengambil keputusan lain.',
        },
      ],
    },
  ];
}

// ── 15. PASAL 13: PERATURAN PENUTUP ────────────────────────────────────
export function createCvPasal13(): Block[] {
  return [
    { type: 'divider', text: 'PERATURAN PENUTUP' },
    { type: 'pasal-divider', text: 'Pasal 13' },
    {
      type: 'p',
      runs: [
        {
          text: 'Hal-hal yang tidak diatur atau belum sempurna diatur dalam akta ini akan diputuskan oleh para pesero secara musyawarah dan mufakat.',
        },
      ],
    },
  ];
}

// ── 16. PASAL 14: DOMISILI HUKUM ───────────────────────────────────────
export function createCvPasal14(data: CVProfile): Block[] {
  const domicile = data.kotaKedudukan || 'Kota Bandung';

  return [
    { type: 'divider', text: 'DOMISILI HUKUM' },
    { type: 'pasal-divider', text: 'Pasal 14' },
    {
      type: 'p',
      runs: [
        {
          text: `Mengenai akta ini dengan segala akibat dan pelaksanaannya- para pesero memilih domisili hukum yang umum dan tetap di Kantor Panitera Pengadilan Negeri di ${domicile}.`,
        },
      ],
    },
  ];
}

// ── 17. PENUTUP, SAKSI & NOTARIS ───────────────────────────────────────
export function createCvPenutup(data: CVProfile): Block[] {
  const blocks: Block[] = [];
  const signingPlace = data.notarisTempat || data.notaryDomicile || 'Kabupaten Bandung Barat';

  const saksi1Text =
    data.saksi1Nama
      ? `${data.saksi1Nama}, lahir di ${data.saksi1Lahir || 'Bandung'}, Warga Negara Indonesia, bertempat tinggal di ${data.saksi1Alamat || ''}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi1NIK || ''};`
      : 'Nendi Suhendi, lahir di Bandung, pada tanggal limabelas Juli seribu sembilanratus sembilanpuluh satu (15-07-1991), Warga Negara Indonesia, bertempat tinggal di Jalan Sukaresmi Nomor 12, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi, pemegang Kartu Tanda Penduduk Nomor 3217011507910016;';

  const saksi2Text =
    data.saksi2Nama
      ? `${data.saksi2Nama}, lahir di ${data.saksi2Lahir || 'Bandung'}, Warga Negara Indonesia, bertempat tinggal di ${data.saksi2Alamat || ''}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi2NIK || ''}.`
      : 'Siti Nur Azizah, lahir di Bandung, pada tanggal tujuhbelas Desember seribu sembilanratus sembilanpuluh sembilan (17-12-1999), Warga Negara Indonesia, bertempat tinggal di Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh, Rukun Tetangga 001, Rukun Warga 004, Kecamatan Cimenyan, Desa Ciburial, pemegang Kartu Tanda Penduduk Nomor 3204065712990001.';

  blocks.push(
    { type: 'divider', text: 'DEMIKIAN AKTA INI' },
    {
      type: 'p',
      runs: [
        {
          text: `Dibuat sebagai minuta dan dilangsungkan di ${signingPlace}, pada hari dan tanggal serta jam sebagaimana disebutkan pada kepala akta ini dengan dihadiri oleh :`,
        },
      ],
    },
    {
      type: 'saksi',
      num: 1,
      runs: [{ text: saksi1Text }],
    },
    {
      type: 'saksi',
      num: 2,
      runs: [{ text: saksi2Text }],
    },
    {
      type: 'p',
      runs: [{ text: `Untuk sementara berada di ${signingPlace};` }],
    },
    {
      type: 'p',
      runs: [{ text: 'Keduanya pegawai Kantor Notaris, sebagai saksi-saksi.' }],
    },
    {
      type: 'p',
      runs: [
        {
          text: 'Segera setelah akta ini dibacakan oleh saya, Notaris kepada penghadap dan saksi-saksi, maka ditanda-tanganilah akta ini oleh penghadap, saksi-saksi dan saya, Notaris. Serta penghadap membubuhkan sidik jari sebelah kanan pada lembaran tersendiri di hadapan saya, Notaris dan saksi-saksi, yang dilekatkan pada minuta akta ini.',
        },
      ],
    },
    {
      type: 'p',
      runs: [{ text: 'Dilangsungkan dengan tanpa perubahan.' }],
    },
    {
      type: 'p',
      runs: [{ text: 'Minuta Akta ini telah ditanda-tangani dengan sempurna.' }],
    },
    {
      type: 'p',
      runs: [{ text: 'Diberikan sebagai salinan yang sama bunyinya.' }],
    },
    {
      type: 'p',
      align: 'right-center',
      runs: [
        {
          text: `Notaris di ${data.notarisTempat || data.notaryDomicile || 'Kabupaten Bandung Barat'} ;`,
        },
      ],
    },
    {
      type: 'p',
      align: 'right-center',
      runs: [
        {
          text: data.notaryName || 'R.A. NUKANTINI PUTRI PARINCHA, SH., M.Kn.',
          bold: true,
        },
      ],
    }
  );

  return blocks;
}

// ── MAIN BUILDER: generatePendirianCVBlocks ─────────────────────────────
export function generatePendirianCVBlocks(data: CVProfile): Block[] {
  const blocks: Block[] = [];

  blocks.push(...createCvOpening(data));
  blocks.push(...createCvPenghadap(data));
  blocks.push(...createCvPasal1(data));
  blocks.push(...createCvPasal2(data));
  blocks.push(...createCvPasal3(data));
  blocks.push(...createCvPasal4(data));
  blocks.push(...createCvPasal5(data));
  blocks.push(...createCvPasal6(data));
  blocks.push(...createCvPasal7());
  blocks.push(...createCvPasal8(data));
  blocks.push(...createCvPasal9());
  blocks.push(...createCvPasal10());
  blocks.push(...createCvPasal11());
  blocks.push(...createCvPasal12());
  blocks.push(...createCvPasal13());
  blocks.push(...createCvPasal14(data));
  blocks.push(...createCvPenutup(data));

  return blocks;
}
