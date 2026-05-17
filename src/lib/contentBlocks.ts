import { FormData } from '../constants';
import { FormatToken } from './notaryWrapper';
import { getDayName, dateToWords, formatDateStr, timeToWords, formatTimeStr, terbilang, toTitleCase, formatNumber } from './formatter';

export type Block = 
  | { type: 'p', runs: FormatToken[], align?: 'left' | 'center' | 'right' | 'right-center', indent?: boolean, indentTabs?: number, spaceAfter?: boolean, number?: number }
  | { type: 'list', bullet: string, runs: FormatToken[], spaceAfter?: boolean, number?: number, indentTabs?: number }
  | { type: 'shareholder-list', bullet: string, name: string, sharesText: string, rpText: string }
  | { type: 'divider', text: string }
  | { type: 'static', content: string };

export const generateBlocks = (data: FormData): Block[] => {
  const tglAktaHari = getDayName(data.tanggalAkta);
  const tglAktaHuruf = dateToWords(data.tanggalAkta);
  const tglAktaAngka = formatDateStr(data.tanggalAkta);

  const jamStr = data.jamAkta ? formatTimeStr(data.jamAkta) : "";
  const jamHuruf = data.jamAkta ? timeToWords(data.jamAkta) + ' Waktu Indonesia Barat' : "";

  // Akta Pendirian
  const tglPendirianHuruf = dateToWords(data.tglPendirianPT);
  const tglPendirianAngka = formatDateStr(data.tglPendirianPT);
  const tglSKPendirianHuruf = dateToWords(data.tglSKPengesahan);
  const tglSKPendirianAngka = formatDateStr(data.tglSKPengesahan);

  function checkNotaryWording(name: string, title?: string, domicile?: string) {
    const norm = (name || "").toUpperCase().trim();
    const t1 = "NUKANTINI PUTRI PARINCHA, SARJANA HUKUM, MAGISTER KENOTARIATAN";
    const t2 = "RADEN AJENG NUKANTINI PUTRI PARINCHA, SARJANA HUKUM, MAGISTER KENOTARIATAN";
    if (norm === t1 || norm === t2) {
      return "saya,";
    }
    return `${name}${title ? `, ${title}` : ''}, Notaris di ${toTitleCase(domicile || "...")}`;
  }

  let aktaPerubahanRuns: FormatToken[] = [];
  if (data.aktaPerubahan && data.aktaPerubahan.length > 0) {
    aktaPerubahanRuns.push({ text: ` telah mengalami perubahan Anggaran Dasar ` });
    data.aktaPerubahan.forEach((perubahan, index) => {
      const isLast = index === data.aktaPerubahan.length - 1;
      const tglRapatHuruf = dateToWords(perubahan.tglRapat);
      const tglRapatAngka = formatDateStr(perubahan.tglRapat);
      const tglSKPerubahanHuruf = dateToWords(perubahan.tglSKPerubahan);
      const tglSKPerubahanAngka = formatDateStr(perubahan.tglSKPerubahan);

      aktaPerubahanRuns.push({ text: `berdasarkan Akta Pernyataan Keputusan Rapat tertanggal ${tglRapatAngka} (${tglRapatHuruf}) Nomor ${perubahan.nomorRapat} yang dibuat dihadapan ${checkNotaryWording(perubahan.notaris, perubahan.notarisTitle, perubahan.kedudukanNotaris)} yang Pemberitahuannya telah diterima dan dicatat dalam Sistem Administrasi Badan Hukum Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat ${perubahan.jenisSK} Data Perseroan tertanggal ${tglSKPerubahanAngka} (${tglSKPerubahanHuruf}) Nomor ${perubahan.skPerubahan}` });
      if (!isLast) {
        aktaPerubahanRuns.push({ text: `, dan ` });
      }
    });
  }

  const jumlahSaham = formatNumber(data.jumlahSahamPT);
  const jumlahSahamHuruf = data.jumlahSahamPT ? terbilang(Number(data.jumlahSahamPT)) : "";
  const jumlahSahamHibah = formatNumber(data.jumlahSahamHibah);
  const jumlahSahamHibahHuruf = data.jumlahSahamHibah ? terbilang(Number(data.jumlahSahamHibah)) : "";

  const nominalSaham = data.nilaiNominalSaham || "0";
  const nominalNumber = parseFloat(nominalSaham) || 0;
  // Calculate total nilai saham hibah
  const totalNilaiSaham = (parseFloat(jumlahSahamHibah) || 0) * nominalNumber;
  
  const formatRupiah = (angka: number) => {
    const formatted = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(angka);
    return `Rp. ${formatted},-`;
  }
  const nilaiSahamStr = formatRupiah(totalNilaiSaham);
  const nilaiSahamHurufStr = totalNilaiSaham > 0 ? terbilang(totalNilaiSaham) + " rupiah" : "";

  const hargaJual = parseFloat(data.hargaJualSaham) || 0;
  const hargaJualStr = formatRupiah(hargaJual);
  const hargaJualHuruf = hargaJual > 0 ? terbilang(hargaJual) + " rupiah" : "";

  const isHibah = data.tipeAkta === 'Hibah';
  const termPihak1 = isHibah ? 'Pemberi Hibah' : 'Penjual';
  const termPihak2 = isHibah ? 'Penerima Hibah' : 'Pembeli';
  const termTindakan = isHibah ? 'Hibah' : 'Jual Beli';

  const tglSirkulerHuruf = dateToWords(data.tglSirkuler);
  const tglSirkulerAngka = formatDateStr(data.tglSirkuler);

  const tglLahirPihak1Huruf = dateToWords(data.pihak1TanggalLahir);
  const tglLahirPihak1Angka = formatDateStr(data.pihak1TanggalLahir);
  
  const tglLahirSuamiHuruf = dateToWords(data.suamiTanggalLahir);
  const tglLahirSuamiAngka = formatDateStr(data.suamiTanggalLahir);

  const tglLahirPihak2Huruf = dateToWords(data.pihak2TanggalLahir);
  const tglLahirPihak2Angka = formatDateStr(data.pihak2TanggalLahir);

  const tglPersetujuanSuamiHuruf = dateToWords(data.tglPersetujuanSuami);
  const tglPersetujuanSuamiAngka = formatDateStr(data.tglPersetujuanSuami);

  return [
    { type: 'p', runs: [{ text: `Pada hari ini, ${tglAktaHari}, tanggal ${tglAktaHuruf} (${tglAktaAngka}).` }] },
    { type: 'p', runs: [{ text: `Pukul ${jamStr} (${jamHuruf}).` }] },
    { type: 'p', runs: [
       { text: `Berhadapan dengan saya, ` },
       ...(data.notarisNama === 'Nukantini Putri Parincha' ? [] : [
         { text: data.notarisNama, bold: true } as FormatToken,
         { text: `, ` } as FormatToken
       ]),
       { text: `Notaris di ${toTitleCase(data.notarisKedudukan)}, dengan di hadiri oleh saksi-saksi yang saya, Notaris kenal dan akan disebutkan nama-namanya pada bagian akhir akta ini :` }
    ] },

    { type: 'p', runs: [
      { text: `${data.pihak1Gelar} ` },
      { text: data.pihak1Nama, bold: true },
      { text: `, lahir di ${toTitleCase(data.pihak1TempatLahir)}, pada tanggal ${tglLahirPihak1Huruf} (${tglLahirPihak1Angka}), Warga Negara Indonesia, ${data.pihak1Pekerjaan}, bertempat tinggal di ${toTitleCase(data.pihak1Kota)}, ${toTitleCase(data.pihak1AlamatJalan)}, Rukun Tetangga ${data.pihak1RT}, Rukun Warga ${data.pihak1RW}, Kelurahan ${toTitleCase(data.pihak1Kelurahan)}, Kecamatan ${toTitleCase(data.pihak1Kecamatan)}, pemegang Kartu Tanda Penduduk Nomor ${data.pihak1NIK};` }
    ] },

    ...(data.pihak1StatusPersetujuan === 'Suami' || data.pihak1StatusPersetujuan === 'Istri' ? [
      { type: 'list', bullet: '-', runs: [
        { text: `Dalam melakukan tindakan hukum di bawah ini telah mendapat persetujuan dari ${data.pihak1StatusPersetujuan.toLowerCase()}nya yaitu ` },
        { text: data.pihak1StatusPersetujuan === 'Suami' ? 'Tuan ' : 'Nyonya ' },
        { text: data.suamiNama, bold: true },
        { text: `, lahir di ${toTitleCase(data.suamiTempatLahir)}, pada tanggal ${tglLahirSuamiHuruf} (${tglLahirSuamiAngka}), Warga Negara Indonesia, ${data.suamiPekerjaan}, ` },
        { text: data.suamiAlamatSama 
            ? `bertempat tinggal sama dengan ${data.pihak1StatusPersetujuan === 'Suami' ? 'istrinya' : 'suaminya'} tersebut`
            : `bertempat tinggal di ${toTitleCase(data.suamiKota)}, ${toTitleCase(data.suamiAlamatJalan)}, Rukun Tetangga ${data.suamiRT}, Rukun Warga ${data.suamiRW}, Kelurahan ${toTitleCase(data.suamiKelurahan)}, Kecamatan ${toTitleCase(data.suamiKecamatan)}` 
        },
        { text: `, pemegang Kartu Tanda Penduduk Nomor ${data.suamiNIK} berdasarkan Surat Persetujuan dan Kuasa yang dibuat dibawah tangan tertanggal ${tglPersetujuanSuamiHuruf} (${tglPersetujuanSuamiAngka}) yang aslinya dilekatkan pada minuta akta ini.` }
      ] as FormatToken[] }
    ].map(item => ({ ...item, type: 'list' as const, bullet: '-' })) : []),

    ...(data.pihak1Kota.trim().toUpperCase() !== "KABUPATEN BANDUNG BARAT" ? [{ type: 'list', bullet: '-', runs: [{ text: `Untuk sementara berada di ${toTitleCase(data.notarisKedudukan)}.` }], spaceAfter: true } as Block] : []),

    { type: 'p', runs: [{ text: `Untuk selanjutnya disebut :` }] },
    { type: 'divider', text: `PIHAK PERTAMA` },

    { type: 'p', runs: [
      { text: `${data.pihak2Gelar} ` },
      { text: data.pihak2Nama, bold: true },
      { text: `, lahir di ${toTitleCase(data.pihak2TempatLahir)}, pada tanggal ${tglLahirPihak2Huruf} (${tglLahirPihak2Angka}), Warga Negara Indonesia, ${data.pihak2Pekerjaan}, bertempat tinggal di ${toTitleCase(data.pihak2Kota)}, ${toTitleCase(data.pihak2AlamatJalan)}, Rukun Tetangga ${data.pihak2RT}, Rukun Warga ${data.pihak2RW}, Kelurahan ${toTitleCase(data.pihak2Kelurahan)}, Kecamatan ${toTitleCase(data.pihak2Kecamatan)}, pemegang Kartu Tanda Penduduk Nomor ${data.pihak2NIK};` }
    ] },

    { type: 'list', bullet: '-', runs: [{ text: `Dalam melakukan tindakan hukum di bawah ini bertindak untuk dirinya sendiri.` }] },
    ...(data.pihak2Kota.trim().toUpperCase() !== "KABUPATEN BANDUNG BARAT" ? [{ type: 'list', bullet: '-', runs: [{ text: `Untuk sementara berada di ${toTitleCase(data.notarisKedudukan)}.` }], spaceAfter: true } as Block] : []),

    { type: 'p', runs: [{ text: `Untuk selanjutnya disebut :` }] },
    { type: 'divider', text: `PIHAK KEDUA` },

    { type: 'p', runs: [{ text: `Para pihak dengan ini menerangkan (memberitahukan) terlebih dahulu :` }] },
    
    { type: 'list', bullet: '-', runs: [
      { text: `Bahwa Pihak Pertama adalah selaku pemilik ${jumlahSaham} (${jumlahSahamHuruf}) lembar saham Perseroan Terbatas ` },
      { text: `PT ${data.namaPT.toUpperCase()}`, bold: true },
      { text: ` Perseroan yang berkedudukan di ${toTitleCase(data.kedudukanPT)}, demikian berdasarkan Akta Pendirian tertanggal ${tglPendirianAngka} (${tglPendirianHuruf}), Nomor ${data.nomorPendirian} dibuat dihadapan ${checkNotaryWording(data.notarisPT, data.notarisPTTitle, data.kedudukanNotarisPT)} telah mendapat pengesahan dari Menteri Hukum dan Hak Asasi Manusia Republik Indonesia berdasarkan Surat Keputusan Nomor ${data.skPengesahan} tanggal ${tglSKPendirianAngka} (${tglSKPendirianHuruf})` },
      ...aktaPerubahanRuns,
      { text: `;` }
    ] },

    ...(isHibah ? [
      { type: 'list', bullet: '-', runs: [{ text: `Bahwa Pihak Pertama bermaksud untuk menghibahkan ${jumlahSahamHibah} (${jumlahSahamHibahHuruf}) lembar saham Perseroan atau senilai ${nilaiSahamStr} (${nilaiSahamHurufStr}) yang dimilikinya tersebut kepada Pihak Kedua yang juga menerangkan telah menerima hibah saham dari Pihak Pertama atas ${jumlahSahamHibah} (${jumlahSahamHibahHuruf}) lembar saham Perseroan yang dimiliki oleh Pihak Pertama tersebut, demikian berikut tanda-tanda bukti pemilikan saham dan talon yang berkenaan;` }] },
      { type: 'list', bullet: '-', runs: [
         { text: `Bahwa Hibah Saham ini telah mendapat persetujuan dari para pemegang saham Perseroan berdasarkan Keputusan Sirkuler Para Pemegang Saham ` },
         { text: `PT ${data.namaPT.toUpperCase()}`, bold: true },
         { text: `, Sebagai Pengganti Rapat Umum Pemegang Saham Luar Biasa tertanggal ${tglSirkulerAngka} (${tglSirkulerHuruf});` }
      ] },
      { type: 'list', bullet: '-', runs: [
         { text: `Bahwa Pihak Pertama selanjutnya akan disebut juga Sebagai Pemberi Hibah menerangkan dengan ini menghibahkan saham kepada Pihak Kedua, yaitu ${data.pihak1Gelar} ` },
         { text: data.pihak1Nama, bold: true },
         { text: ` hak hibah atas ${jumlahSahamHibah} (${jumlahSahamHibahHuruf}) lembar saham tersebut di atas kepada ${data.pihak2Gelar} ` },
         { text: data.pihak2Nama, bold: true },
         { text: `, sebanyak ${jumlahSahamHibah} (${jumlahSahamHibahHuruf}) lembar saham;` }
      ] },
      { type: 'list', bullet: '-', runs: [{ text: `Bahwa Pihak Kedua selanjutnya akan disebut juga sebagai Penerima Hibah menerangkan dengan ini telah menerima hibah dari Pemberi Hibah saham-saham Pihak Pertama, sebagaimana telah disebut diatas, bahwa Hibah Saham tersebut telah terjadi dan diterima.` }] },
      { type: 'list', bullet: '-', runs: [{ text: `Bahwa selanjutnya para pihak bertindak sebagaimana tersebut diatas menerangkan dengan ini, bahwa Hibah Saham ini diterima dan disetujui oleh kedua belah pihak dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut :` }] },
    ] : [
      { type: 'list', bullet: '-', runs: [{ text: `Bahwa Pihak Pertama bermaksud untuk menjual ${jumlahSahamHibah} (${jumlahSahamHibahHuruf}) lembar saham Perseroan atau senilai ${hargaJualStr} (${hargaJualHuruf}) yang dimilikinya tersebut kepada Pihak Kedua yang juga menerangkan telah membeli dan menerima penyerahan dari Pihak Pertama atas ${jumlahSahamHibah} (${jumlahSahamHibahHuruf}) lembar saham Perseroan yang dimiliki oleh Pihak Pertama tersebut, demikian berikut tanda-tanda bukti pemilikan saham dan talon yang berkenaan;` }] },
      { type: 'list', bullet: '-', runs: [
         { text: `Bahwa Jual Beli Saham ini telah mendapat persetujuan dari para pemegang saham Perseroan berdasarkan Keputusan Sirkuler Para Pemegang Saham ` },
         { text: `PT ${data.namaPT.toUpperCase()}`, bold: true },
         { text: `, Sebagai Pengganti Rapat Umum Pemegang Saham Luar Biasa tertanggal ${tglSirkulerAngka} (${tglSirkulerHuruf});` }
      ] },
      { type: 'list', bullet: '-', runs: [
         { text: `Bahwa Pihak Pertama selanjutnya akan disebut juga Sebagai Penjual menerangkan dengan ini menjual kepada Pihak Kedua, yaitu ${data.pihak2Gelar} ` },
         { text: data.pihak2Nama, bold: true },
         { text: ` hak penjual atas ${jumlahSahamHibah} (${jumlahSahamHibahHuruf}) lembar saham tersebut di atas kepada ${data.pihak1Gelar} ` },
         { text: data.pihak1Nama, bold: true },
         { text: ` sebanyak ${jumlahSahamHibah} (${jumlahSahamHibahHuruf}) lembar saham;` }
      ] },
      { type: 'list', bullet: '-', runs: [{ text: `Bahwa Pihak Kedua selanjutnya akan disebut juga sebagai Pembeli menerangkan dengan ini telah membeli dari Penjual saham Pihak Pertama, sebagaimana telah disebut diatas, bahwa Jual Beli Saham tersebut telah terjadi dan diterima dengan harga ${hargaJualStr} (${hargaJualHuruf}), jumlah uang mana telah diterima oleh Pihak Pertama dari Pihak Kedua sebelum penandatanganan surat jual beli saham ini sehingga untuk penerimaan jumlah uang tersebut, surat jual beli saham ini dinyatakan berlaku pula sebagai kwitansinya yang sah.` }] },
      { type: 'list', bullet: '-', runs: [{ text: `Bahwa selanjutnya para pihak bertindak sebagaimana tersebut diatas menerangkan dengan ini, bahwa Jual Beli Saham ini diterima dan disetujui oleh kedua belah pihak dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut :` }] },
    ]) as Block[],

    { type: 'divider', text: `Pasal 1` },
    { type: 'p', runs: [{ text: `Segala hak atas saham-saham tersebut di atas dari Pihak Pertama kepada Pihak Kedua telah beralih sejak penanda-tanganan Akta ${termTindakan} Saham ini hingga mulai sejak saat ini segala keuntungan dan kerugian mengenai saham-saham tersebut menjadi hak dan tanggungan Pihak Kedua.` }] },
    
    { type: 'divider', text: `Pasal 2` },
    { type: 'p', runs: [{ text: `Pihak Pertama menjamin Pihak Kedua bahwa :` }] },
    { type: 'list', bullet: 'a.', runs: [{ text: `Penjualan saham-saham tersebut tidak bertentangan dengan anggaran dasar Perseroan dan ketentuan hukum yang berlaku; dan` }] },
    { type: 'list', bullet: 'b.', runs: [{ text: `Saham-saham tersebut telah disetor penuh, tidak dalam keadaan sengketa, tidak dikenakan sesuatu sitaan atau sedang digadaikan, atau dibebani dengan/secara apapun, sehingga Pihak Kedua tidak akan mendapat gugatan atau tuntutan dari siapapun, baik mengenai hak pemilikan atas saham-saham tersebut maupun mengenai saham-saham itu sendiri.` }] },
    { type: 'list', bullet: 'c.', runs: [{ text: `Saham-saham tersebut di atas adalah benar miliknya atau haknya Pihak Pertama dan hanya dapat dijual atau dipindahtangankan oleh Pihak Pertama dan Pihak Kedua tidak akan mendapat sesuatu tuntutan dari pihak lain yang menyatakan mempunyai hak terlebih dahulu atau turut mempunyai hak atasnya;` }] },
    { type: 'list', bullet: 'd.', runs: [{ text: `Apabila di kemudian hari pasangan hidup dan atau pihak Ketiga mengajukan gugatan sehubungan dengan saham ini, maka hal tersebut menjadi tanggungjawab Pihak Pertama.` }] },

    { type: 'divider', text: `Pasal 3` },
    { type: 'p', runs: [{ text: `Penyerahan (surat bukti) saham-saham tersebut di atas dari Pihak Pertama kepada Pihak Kedua akan dilakukan pada saat akta ini ditandatangani, untuk seperlunya Pihak Pertama dengan ini memberi kuasa kepada Pihak Kedua untuk menjalankan apa yang diperlukan menurut anggaran dasar Perseroan, berkenaan dengan balik nama saham-saham tersebut ke atas nama Pihak Kedua. Dan selama saham-saham itu belum dibalik nama ke atas nama Pihak Kedua, maka Pihak Kedua secara bersama-sama maupun sendiri-sendiri,dengan ini pula diberi kuasa oleh Pihak Pertama, untuk bertindak atas nama Pihak Pertama sebagai yang berhak penuh atas saham-saham itu dalam segala hal, tindakan dan urusan, baik di dalam maupun di luar Pengadilan, sehingga Pihak Kedua berhak untuk melakukan dan mengerjakan segala sesuatu yang Pihak Pertama sebagai yang berhak atas saham-saham tersebut dapat dan berwenang untuk melakukannya, satu dan lain atas resiko dan tanggungjawab Pihak Kedua sendiri, di antaranya akan tetapi tidak terbatas pada tindakan-tindakan untuk menjual, menggadaikan, memindahkan kepada siapapun juga dan mewakili Pihak Pertama dalam rapat-rapat pemegang saham Perseroan, mengajukan usul-usul, menolak dan menerima usul-usul, mengeluarkan suara, dan melakukan apa saja yang dianggap perlu, tidak ada tindakan yang dikecualikan.` }] },

    { type: 'divider', text: `Pasal 4` },
    { type: 'p', runs: [{ text: `Kuasa-kuasa dalam akta ini merupakan kuasa-kuasa yang tidak dapat dicabut kembali dan tidak akan berakhir karena sebab-sebab yang tercantum dalam pasal 1813 Kitab Undang-undang Hukum Perdata atau karena alasan apapun juga.` }] },

    { type: 'divider', text: `Pasal 5` },
    { type: 'p', runs: [
       { text: `Sejak beralihnya kepemilikan saham-saham tersebut diatas, Pihak Pertama tidak akan memanfaatkan dan/atau mengambil keuntungan dengan cara apapun baik untuk kepentingan sendiri maupun kelompok dengan menggunakan nama perseroan terbatas ` },
       { text: `PT ${data.namaPT.toUpperCase()}`, bold: true },
       { text: `.` }
    ] },

    { type: 'divider', text: `Pasal 6` },
    { type: 'p', runs: [{ text: `Segala pajak-pajak yang timbul berkenaan dengan ${termTindakan} Saham tersebut, akan ditanggung oleh para pihak sesuai peraturan yang berlaku.` }] },

    { type: 'divider', text: `Pasal 7` },
    { type: 'p', runs: [{ text: `${isHibah ? 'Biaya untuk pembuatan akta ini menjadi tanggungan Pihak Kedua.' : 'Biaya untuk pembuatan akta ini menjadi tanggungan dan akan dibayar oleh Pihak Kedua.'}` }] },

    { type: 'divider', text: `Pasal 8` },
    { type: 'p', runs: [{ text: `Untuk segala urusan mengenai ${termTindakan} Saham ini dengan segala akibatnya, para pihak memilih domisili yang tetap dan umum di Kepaniteraan ${data.namaPengadilan}.` }] },

    { type: 'divider', text: `DEMIKIANLAH AKTA INI` },
    { type: 'p', runs: [{ text: `Dibuat sebagai minuta dan dilangsungkan di ${toTitleCase(data.notarisKedudukan)}, pada hari dan tanggal serta jam sebagaimana disebutkan pada kepala akta ini dengan di hadiri oleh:` }] },

    { type: 'p', number: 1, runs: [
      { text: (data.saksi1Nama || '').toUpperCase(), bold: true },
      { text: `, lahir di ${toTitleCase(data.saksi1Lahir)}, Warga Negara Indonesia, bertempat tinggal di ${toTitleCase(data.saksi1Alamat)}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi1NIK};` }
    ] },
    { type: 'p', number: 2, runs: [
      { text: (data.saksi2Nama || '').toUpperCase(), bold: true },
      { text: `, lahir di ${toTitleCase(data.saksi2Lahir)}, Warga Negara Indonesia, bertempat tinggal di ${toTitleCase(data.saksi2Alamat)}, pemegang Kartu Tanda Penduduk Nomor ${data.saksi2NIK}.` }
    ], spaceAfter: true },
    
    { type: 'p', runs: [{ text: `Keduanya karyawan kantor Notaris dan sebagai saksi-saksi.` }] },
    { type: 'p', runs: [{ text: `Segera setelah akta ini dibacakan oleh saya, Notaris kepada penghadap dan saksi-saksi, maka ditanda-tanganilah akta ini oleh penghadap, saksi-saksi dan saya, Notaris, serta penghadap membubuhkan sidik jari sebelah kanan pada lembaran tersendiri di hadapan saya, Notaris dan saksi-saksi, yang dilekatkan pada minuta akta ini.` }] },
    { type: 'p', runs: [{ text: `Dilangsungkan dengan tanpa perubahan.` }] },

    { type: 'p', indentTabs: 1, runs: [{ text: `Minuta Akta ini telah ditanda-tangani dengan sempurna.` }] },
    { type: 'p', indentTabs: 2, runs: [{ text: `Diberikan sebagai salinan yang sama bunyinya.` }], spaceAfter: true },

    { type: 'p', align: 'right-center', runs: [{ text: `Notaris di ${toTitleCase(data.notarisKedudukan)} ;` }] },
  ];
};
