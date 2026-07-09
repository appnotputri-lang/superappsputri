const fs = require('fs');

const pasal6 = `
    { type: 'p', align: 'center', runs: [{ text: "PENGGANTI SURAT SAHAM", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 6", bold: true }] },
    { type: 'p', runs: [{ text: "1. Jika surat saham rusak atau tidak dapat dipakai, atas permintaan mereka yang berkepentingan, Direksi akan mengeluarkan surat saham pengganti, setelah surat saham yang rusak atau tidak dapat dipakai tersebut diserahkan kembali kepada Direksi." }] },
    { type: 'p', runs: [{ text: "2. Surat saham sebagaimana dimaksud dalam ayat (1) harus dimusnahkan dan dibuat berita acara oleh Direksi untuk dilaporkan dalam Rapat Umum Pemegang Saham berikutnya." }] },
    { type: 'p', runs: [{ text: "3. Jika surat saham hilang, atas permintaan mereka yang berkepentingan, Direksi mengeluarkan surat saham pengganti setelah menurut pendapat Direksi kehilangan tersebut cukup dibuktikan dan disertai jaminan yang dipandang perlu oleh Direksi untuk tiap peristiwa yang khusus." }] },
    { type: 'p', runs: [{ text: "4. Setelah surat saham pengganti dikeluarkan, surat saham yang dinyatakan hilang tersebut, tidak berlaku lagi terhadap Perseroan." }] },
    { type: 'p', runs: [{ text: "5. Semua biaya yang berhubungan dengan pengeluaran surat saham pengganti ditanggung oleh pemegang saham yang berkepentingan." }] },
    { type: 'p', runs: [{ text: "6. Ketentuan sebagaimana dimaksud pada ayat (1) sampai dengan ayat (5) mutatis mutandis berlaku bagi pengeluaran surat kolektif saham pengganti." }] },
`;

const pasal7 = `
    { type: 'p', align: 'center', runs: [{ text: "PEMINDAHAN HAK ATAS SAHAM", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 7", bold: true }] },
    { type: 'p', runs: [{ text: "1. Pemindahan hak atas saham, harus berdasarkan akta pemindahan hak yang ditandatangani oleh yang memindahkan dan yang menerima pemindahan atau wakil mereka yang sah." }] },
    { type: 'p', runs: [{ text: "2. Pemindahan hak atas saham hanya diperkenankan dengan persetujuan Rapat Umum Pemegang Saham." }] },
    { type: 'p', runs: [{ text: "3. Pemegang saham yang hendak memindahkan hak atas saham, harus mengajukan Permohonan secara tertulis tentang maksudnya kepada Rapat Umum Pemegang Saham melalui Direksi." }] },
    { type: 'p', runs: [{ text: "4. Rapat Umum Pemegang Saham wajib memberikan persetujuannya atau menolak permohonan sebagaimana dimaksud ayat (3) pasal ini secara tertulis dalam jangka waktu paling lama 90 (sembilan puluh) hari kerja terhitung sejak diterimanya permohonan." }] },
    { type: 'p', runs: [{ text: "5. Dalam hal jangka waktu sebagaimana dimaksud pada ayat (4) pasal ini telah lewat, dan dari Rapat Umum Pemegang Saham tidak memberikan pernyataan tertulis, maka permohonan atas pemindahan hak atas saham tersebut dianggap disetujui." }] },
    { type: 'p', runs: [{ text: "6. Pemindahan hak atas saham harus mendapat persetujuan dari instansi yang berwenang, jika peraturan perundang-undangan mensyaratkan hal tersebut." }] },
    { type: 'p', runs: [{ text: "7. Mulai hari panggilan Rapat Umum Pemegang Saham sampai dengan hari dilaksanakan Rapat Umum Pemegang Saham pemindahan hak atas saham tidak diperkenankan." }] },
    { type: 'p', runs: [{ text: "8. Apabila karena warisan, perkawinan atau sebab lain saham tidak lagi menjadi milik warga negara Indonesia, atau badan hukum Indonesia, maka dalam jangka waktu 1 (satu) tahun orang atau badan hukum yang bersangkutan wajib memindahkan hak atas sahamnya kepada Warga Negara Indonesia atau badan hukum Indonesia, sesuai ketentuan Anggaran Dasar." }] },
`;

const pasal8 = `
    { type: 'p', align: 'center', runs: [{ text: "RAPAT UMUM PEMEGANG SAHAM", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 8", bold: true }] },
    { type: 'p', runs: [{ text: "1. Rapat Umum Pemegang Saham yang selanjutnya disebut juga RUPS adalah :" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "a. Rapat Umum Pemegang Saham Tahunan;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "b. Rapat Umum Pemegang Saham lainnya, yang dalam Anggaran Dasar ini disebut juga Rapat Umum Pemegang Saham Luar Biasa." }] },
    { type: 'p', runs: [{ text: "2. Istilah Rapat Umum Pemegang Saham dalam Anggaran Dasar ini berarti keduanya, yaitu : Rapat Umum Pemegang Saham tahunan dan Rapat Umum Pemegang Saham luar biasa kecuali dengan tegas ditentukan lain." }] },
    { type: 'p', runs: [{ text: "3. Dalam Rapat Umum Pemegang Saham tahunan :" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "a. Direksi menyampaikan :" }] },
    { type: 'p', indentTabs: 2, runs: [{ text: "- Laporan tahunan yang telah ditelaah oleh Dewan Komisaris untuk mendapat persetujuan Rapat Umum Pemegang Saham;" }] },
    { type: 'p', indentTabs: 2, runs: [{ text: "- Laporan keuangan untuk mendapat pengesahan Rapat." }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "b. Ditetapkan penggunaan laba, jika Perseroan mempunyai saldo laba yang positif." }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "c. Diputuskan mata acara Rapat Umum Pemegang Saham lainnya yang telah diajukan sebagaimana mestinya dengan memperhatikan Ketentuan Anggaran Dasar." }] },
    { type: 'p', runs: [{ text: "4. Persetujuan laporan tahunan dan pengesahan laporan keuangan oleh Rapat Umum Pemegang Saham tahunan berarti memberikan pelunasan dan pembebasan tanggung jawab sepenuhnya kepada anggota Direksi dan Dewan Komisaris atas pengurusan dan pengawasan yang telah dijalankan selama tahun buku yang lalu, sejauh tindakan tersebut tercermin dalam Laporan Tahunan dan Laporan Keuangan." }] },
    { type: 'p', runs: [{ text: "5. Rapat Umum Pemegang Saham Luar Biasa dapat diselenggarakan sewaktu-waktu berdasarkan kebutuhan untuk membicarakan dan memutuskan mata acara rapat kecuali mata acara rapat yang dimaksud pada ayat (3) huruf a dan huruf b pasal ini, dengan memperhatikan peraturan perundang-undangan dan Anggaran Dasar." }] },
`;

const pasal9 = `
    { type: 'p', align: 'center', runs: [{ text: "TEMPAT, PEMANGGILAN DAN PIMPINAN RAPAT UMUM PEMEGANG SAHAM", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 9", bold: true }] },
    { type: 'p', runs: [{ text: "1. Rapat Umum Pemegang Saham diadakan di tempat kedudukan Perseroan." }] },
    { type: 'p', runs: [{ text: "2. Rapat Umum Pemegang Saham diselenggarakan dengan melakukan pemanggilan terlebih dahulu kepada para pemegang saham dengan surat tercatat dan/atau dengan iklan dalam surat kabar." }] },
    { type: 'p', runs: [{ text: "3. Pemanggilan dilakukan paling lambat 14 (empat belas) hari kerja sebelum tanggal diselenggarakan Rapat Umum Pemegang Saham dengan tidak memperhitungkan tanggal panggilan dan tanggal Rapat Umum Pemegang Saham diadakan." }] },
    { type: 'p', runs: [{ text: "4. Dalam pemanggilan itu harus dicantumkan acara, waktu dan tempat penyelenggaraan Rapat Umum Pemegang Saham." }] },
    { type: 'p', runs: [{ text: "5. Dalam hal pemanggilan tidak sesuai dengan ketentuan ayat 2, 3 dan 4 diatas, keputusan Rapat Umum Pemegang Saham tetap sah jika semua pemegang saham dengan hak suara hadir atau diwakili oleh Rapat Umum Pemegang Saham dan keputusan tersebut disetujui dengan suara bulat." }] },
    { type: 'p', runs: [{ text: "6. Rapat Umum Pemegang Saham dipimpin oleh Direktur Utama." }] },
    { type: 'p', runs: [{ text: "7. Jika Direktur Utama tidak ada atau berhalangan karena sebab apapun yang tidak perlu dibuktikan kepada pihak ketiga, Rapat Umum Pemegang Saham dipimpin oleh seorang anggota Direktur lainnya." }] },
    { type: 'p', runs: [{ text: "8. Jika semua Direktur tidak hadir atau berhalangan karena sebab apapun yang tidak perlu dibuktikan kepada pihak ketiga, Rapat Umum Pemegang Saham dipimpin oleh salah seorang anggota Dewan Komisaris." }] },
    { type: 'p', runs: [{ text: "9. Jika semua anggota Dewan Komisaris tidak hadir atau berhalangan karena sebab apapun yang tidak perlu dibuktikan kepada pihak ketiga, Rapat Umum Pemegang Saham dipimpin oleh seorang yang dipilih oleh dan diantara mereka yang hadir dalam rapat." }] },
    { type: 'p', runs: [{ text: "Rapat Umum Pemegang Saham dapat juga diselenggarakan melalui media video konferensi atau media elektronik lainnya yang memungkinkan semua peserta Rapat Umum Pemegang Saham saling melihat dan mendengar secara langsung serta berpartisipasi dalam rapat, dengan persyaratan kourum dan persyaratan pengambilan keputusan adalah persyaratan sebagaimana diatur dalam ketentuan peraturan perundang-undangan yang berlaku bagi perseroan atau Anggaran Dasar." }] },
`;

const pasal10 = `
    { type: 'p', align: 'center', runs: [{ text: "KUORUM, HAK SUARA, DAN KEPUTUSAN RAPAT UMUM PEMEGANG SAHAM", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 10", bold: true }] },
    { type: 'p', runs: [{ text: "1. Rapat Umum Pemegang Saham dapat dilangsungkan apabila kuorum kehadiran sesuai dengan ketentuan Pasal 86, Pasal 88, dan Pasal 89 Undang undang Perseroan Terbatas (UUPT) telah dipenuhi." }] },
    { type: 'p', runs: [{ text: "2. Rapat Umum Pemegang Saham dapat mengambil keputusan sesuai dengan ketentuan Pasal 87, Pasal 88, dan Pasal 89 Undang-undang Perseroan Terbatas (UUPT)." }] },
    { type: 'p', runs: [{ text: "3. Pemungutan suara mengenai diri orang dilakukan dengan surat tertutup yang tidak ditandatangani dan mengenai hal lain secara lisan, kecuali apabila ketua Rapat Umum Pemegang Saham menentukan lain tanpa ada keberatan dari pemegang saham yang hadir dalam Rapat Umum Pemegang Saham." }] },
    { type: 'p', runs: [{ text: "4. Suara blanko atau suara yang tidak sah dianggap tidak ada dan tidak dihitung dalam menentukan jumlah suara yang dikeluarkan dalam Rapat Umum Pemegang Saham." }] },
    { type: 'p', runs: [{ text: "5. Pemegang saham dapat mengambil keputusan di luar Rapat Umum Pemegang Saham dan dilakukan sesuai dengan ketentuan Pasal 91 Undang-undang Perseroan Terbatas (UUPT)." }] },
`;

const pasal5Extras = `
    { type: 'p', runs: [{ text: "3. Perseroan hanya mengakui seorang atau satu badan hukum sebagai pemilik satu saham." }] },
    { type: 'p', runs: [{ text: "4. Apabila saham karena sebab apapun menjadi milik beberapa orang, maka mereka yang memiliki bersama-sama itu diwajibkan untuk menunjuk seorang diantara mereka atau seorang lain sebagai kuasa mereka bersama dan yang ditunjuk atau diberi kuasa itu sajalah yang berhak mempergunakan hak yang diberikan oleh hukum atas saham tersebut." }] },
    { type: 'p', runs: [{ text: "5. Selama ketentuan dalam ayat (3) pasal ini belum dilaksanakan, maka para pemegang saham tersebut tidak berhak mengeluarkan suara dalam Rapat Umum Pemegang Saham, sedangkan pembayaran dividen untuk saham itu ditangguhkan." }] },
    { type: 'p', runs: [{ text: "6. Jika dikeluarkan surat saham, maka untuk setiap surat saham diberi sehelai surat saham." }] },
    { type: 'p', runs: [{ text: "7. Surat Kolektif saham dapat dikeluarkan sebagai bukti pemilikan 2 (dua) atau lebih saham yang dimiliki oleh seorang pemegang saham." }] },
    { type: 'p', runs: [{ text: "8. Pada surat saham harus dicantumkan sekurang-kurangnya :" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "a. Nama dan alamat pemegang saham;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "b. Nomor surat saham;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "c. Nilai nominal saham;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "d. Tanggal pengeluaran surat saham." }] },
    { type: 'p', runs: [{ text: "9. Pada surat kolektif saham harus dicantumkan sekurang-kurangnya :" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "a. nama dan alamat pemegang saham;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "b. nomor surat kolektif saham;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "c. nomor surat saham dan jumlah saham;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "d. nilai nominal saham;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "e. tanggal pengeluaran surat kolektif saham." }] },
    { type: 'p', runs: [{ text: "10. Surat saham dan surat kolektif saham harus ditandatangani oleh Direksi dan Dewan Komisaris Perseroan." }] },
    { type: 'p', runs: [{ text: "11. Dalam hal perseroan tidak menerbitkan surat saham, pemilikan saham dapat dibuktikan dengan surat daftar pemegang saham yang dikeluarkan oleh perseroan." }] },
`;

const pasal11Extras = `
    { type: 'p', runs: [{ text: "2. Jika diangkat lebih dari seorang Anggota Direksi, maka seorang diantaranya menjabat sebagai Direktur Utama." }] },
    { type: 'p', runs: [{ text: "4. Jika oleh sebab apapun suatu jabatan anggota Direksi lowong, maka dalam jangka waktu 30 (tigapuluh) hari sejak terjadi lowongan harus diselenggarakan Rapat Umum Pemegang Saham, untuk mengisi lowongan itu dengan memperhatikan ketentuan peraturan perundang-undangan dan Anggaran Dasar." }] },
    { type: 'p', runs: [{ text: "5. Jika oleh suatu sebab apapun semua jabatan anggota Direksi lowong, Untuk sementara Perseroan diurus oleh anggota Dewan Komisaris yang ditunjuk oleh rapat Dewan Komisaris." }] },
    { type: 'p', runs: [{ text: "6. Anggota direksi berhak mengundurkan diri dari jabatannya dengan memberitahukan secara tertulis kepada Perseroan paling lambat 30 (tigapuluh) hari kerja sebelum tanggal pengunduran dirinya." }] },
    { type: 'p', runs: [{ text: "7. Jabatan anggota Direksi berakhir, dalam hal:" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "a. Mengundurkan diri sesuai ketentuan pada ayat (6);" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "b. Tidak lagi memenuhi persyaratan peraturan perundang-undangan;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "c. Meninggal dunia;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "d. Diberhentikan berdasarkan keputusan Rapat Umum Pemegang Saham." }] },
`;

const pasal12 = `
    { type: 'p', align: 'center', runs: [{ text: "TUGAS DAN WEWENANG DIREKSI", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 12", bold: true }] },
    { type: 'p', runs: [{ text: "1. Direksi berhak mewakili Perseroan didalam dan diluar Pengadilan tentang segala hal dan dalam segala kejadian, mengikat Perseroan dengan pihak lain dan pihak lain dengan Perseroan, serta menjalankan segala tindakan, baik mengenai kepengurusan maupun kepemilikan, dengan pembatasan bahwa untuk :" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "a. Meminjam atau meminjamkan uang atas nama Perseroan (tidak termasuk mengambil uang perseroan di Bank);" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "b. Mendirikan suatu usaha atau turut serta pada perusahaan lain baik didalam maupun di luar negeri;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "c. Menyewakan, mejaminkan atau menjual asset perusahaan, harus dengan persetujuan dari Rapat Dewan Komisaris." }] },
    { type: 'p', runs: [{ text: "2. Perbuatan hukum untuk mengalihkan, melepaskan hak atas tanah, menjadikan jaminan hutang seluruh atau sebagian besar harta kekayaan Perseroan dalam satu tahun buku, baik dalam 1 (satu) transaksi atau beberapa transaksi yang berdiri sendiri ataupun yang berkaitan satu sama lain harus mendapat persetujuan Rapat Umum Pemegang Saham yang dihadiri atau diwakili para pemegang saham yang memiliki paling sedikit ¾ (tiga per-empat) bagian dari jumlah seluruh saham dengan hak suara yang sah dan disetujui oleh paling sedikit ¾ (tiga per empat) bagian dari jumlah seluruh suara yang dikeluarkan secara sah dalam rapat." }] },
    { type: 'p', runs: [{ text: "3. Dalam hal kourum kehadiran sebagaimana dimaksud dalam ayat 2 tidak tercapai, dapat diadakan Rapat Umum Pemegang Saham Kedua." }] },
    { type: 'p', runs: [{ text: "4. Rapat Umum Pemegang Saham Kedua sebagaimana dimaksud pada ayat 3 Sah dan berhak mengambil keputusan jika rapat paling sedikit 2/3 (dua per tiga) bagian dari jumlah seluruh saham dengan hak suara hadir atau diwakili dalam Rapat Umum Pemegang Saham dan Keputusan adalah sah jika disetujui oleh paling sedikit ¾ (tiga per empat) bagian dari jumlah suara yang dikeluarkan kecuali Anggaran Dasar menentukan kourum kehadiran/atau ketentuan tentang persyaratan pengambilan keputusan Rapat Umum Pemegang Saham yang lebih besar." }] },
    { type: 'p', runs: [{ text: "5. a. Direktur Utama berhak dan berwenang bertindak untuk dan atas nama Direksi serta mewakili Perseroan." }] },
    { type: 'p', runs: [{ text: "b. Dalam hal Direktur Utama tidak hadir atau berhalangan karena sebab apapun juga, yang tidak perlu dibuktikan kepada pihak ketiga, maka salah seorang anggota Direksi lainnya berhak dan berwenang bertindak untuk dan atas nama Direksi serta mewakili Perseroan." }] },
`;

const pasal13 = `
    { type: 'p', align: 'center', runs: [{ text: "RAPAT DIREKSI", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 13", bold: true }] },
    { type: 'p', runs: [{ text: "1. Penyelenggaraan Rapat Direksi dapat dilakukan setiap waktu apabila dipandang perlu :" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "a. Oleh seorang atau lebih anggota Direksi;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "b. Atas permintaan tertulis dari seorang atau lebih anggota Dewan Komisaris, atau;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "c. Atas permintaan tertulis dari 1 (satu) orang atau lebih pemegang saham yang bersama-Sama mewakili 1/10 (satu per sepuluh) atau lebih dari jumlah seluruh saham dengan hak suara." }] },
    { type: 'p', runs: [{ text: "2. Pemanggilan Rapat Direksi dilakukan oleh anggota Direksi yang berhak bertindak untuk dan atas nama Direksi menurut ketentuan Pasal 11 Anggaran Dasar." }] },
    { type: 'p', runs: [{ text: "3. Panggilan Rapat Direksi dilakukan dengan surat tercatat yang disampaikan langsung kepada setiap anggota Direksi dengan mendapat tanda terima paling singkat 3 (tiga) hari sebelum rapat diadakan, tanpa memperhitungkan tanggal panggilan dan tanggal rapat." }] },
    { type: 'p', runs: [{ text: "4. Panggilan Rapat Direksi harus mencantumkan mata acara, tanggal, waktu dan tempat rapat." }] },
    { type: 'p', runs: [{ text: "5. Rapat Direksi diadakan ditempat kedudukan Perseroan atau tempat Kegiatan Usaha Perseroan. Apabila semua anggota Direksi hadir atau diwakili, pemanggilan terlebih dahulu tersebut tidak disyaratkan dan Rapat Direksi dapat diadakan dimanapun juga dan berhak mengambil keputusan yang sah serta mengikat." }] },
    { type: 'p', runs: [{ text: "6. Rapat Direksi dipimpin oleh Direktur Utama dalam hal Direktur Utama tidak dapat hadir atau berhalangan yang tidak perlu dibuktikan kepada Pihak Ketiga, Rapat Direksi dipimpin oleh seorang anggota Direksi yang dipilih oleh dan dari antara anggota Direksi yang hadir." }] },
    { type: 'p', runs: [{ text: "7. Seorang anggota Direksi dapat diwakili dalam Rapat Direksi hanya oleh anggota Direksi lainnya berdasarkan surat kuasa." }] },
    { type: 'p', runs: [{ text: "8. Rapat Direksi adalah sah dan berhak mengambil keputusan yang mengikat jika lebih dari ½ (satu per dua) dari jumlah anggota Direksi hadir atau diwakili dalam rapat." }] },
    { type: 'p', runs: [{ text: "9. Keputusan Rapat Direksi harus diambil berdasarkan musyawarah untuk mufakat. Dalam hal keputusan berdasarkan musyawarah untuk mufakat tidak tercapai maka keputusan diambil dengan pemungutan suara berdasarkan suara setuju paling sedikit lebih dari ½ (satu per dua) dari jumlah suara yang dikeluarkan dalam rapat." }] },
    { type: 'p', runs: [{ text: "10. Apabila suara yang setuju dan yang tidak setuju berimbang, Ketua Rapat Direksi yang akan menentukan." }] },
    { type: 'p', runs: [{ text: "11. Rapat Direksi dapat juga dilakukan melalui media video konferensi atau sarana media elektronik lainnya yang memungkinkan semua peserta rapat Direksi saling melihat dan mendengar secara langsung serta berpartisipasi dalam rapat, dengan persyaratan kourum dan persyaratan pengambilan keputusan adalah sesuai dengan persyaratan sebagaimana diatur dalam Anggaran Dasar." }] },
    { type: 'p', runs: [{ text: "12. a. Setiap anggota Direksi yang hadir dalam Rapat berhak mengeluarkan 1 (satu) suara dan tambahan 1 (satu) suara untuk setiap anggota Direksi lain yang diwakilinya." }] },
    { type: 'p', runs: [{ text: "b. Pemungutan suara mengenai diri orang dilakukan dengan surat tertutup tanpa tanda tangan sedangkan mengenai hal-hal lain dilakukan secara lisan kecuali ketua rapat menentukan lain tanpa ada keberatan dari yang hadir." }] },
    { type: 'p', runs: [{ text: "c. Suara blanko dan suara yang tidak sah dianggap tidak dikeluarkan secara sah dan dianggap tidak ada serta tidak dihitung dalam menentukan jumlah suara yang dikeluarkan." }] },
    { type: 'p', runs: [{ text: "13. Direksi dapat juga mengambil keputusan yang sah tanpa mengadakan Rapat Direksi, dengan ketentuan semua anggota Direksi telah diberitahu secara tertulis dan semua anggota Direksi memberikan persetujuan mengenai usul yang diajukan secara tertulis dengan menandatangani persetujuan tersebut. Keputusan yang diambil dengan cara demikian mempunyai kekuatan yang sama dengan keputusan yang diambil dengan sah dalam Rapat Direksi." }] },
`;

const pasal14Extras = `
    { type: 'p', runs: [{ text: "2. Yang boleh diangkat sebagai anggota Komisaris hanya Warga Negara Indonesia yang menurut persyaratan yang ditentukan peraturan perundang-undangan yang berlaku." }] },
    { type: 'p', runs: [{ text: "4. Jika oleh suatu sebab jabatan anggota Dewan Komisaris kosong, maka dalam jangka waktu 30 (tigapuluh) hari kerja setelah terjadinya kekosongan, harus diselenggarakan Rapat Umum Pemegang Saham untuk mengisi lowongan itu dengan memperhatikan ketentuan ayat 2 (dua) pasal ini." }] },
    { type: 'p', runs: [{ text: "5. Seorang anggota Dewan Komisaris berhak mengundurkan diri dari jabatannya dengan memberitahukan secara tertulis mengenai maksud tersebut kepada Perseroan sekurangnya 30 (tiga puluh) hari kerja sebelum tanggal pengunduran dirinya." }] },
    { type: 'p', runs: [{ text: "6. Jabatan anggota Dewan Komisaris berakhir apabila :" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "a. Kehilangan Kewarganegaraan Indonesia ;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "b. Mengundurkan diri sesuai dengan ketentuan ayat 5 (lima) pasal ini ;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "c. Tidak lagi memenuhi persyaratan perundang-undangan yang berlaku;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "d. Meninggal dunia ;" }] },
    { type: 'p', indentTabs: 1, runs: [{ text: "e. Diberhentikan berdasarkan keputusan Rapat Umum Pemegang Saham." }] },
`;

const pasal15To19 = `
    { type: 'p', align: 'center', runs: [{ text: "TUGAS DAN WEWENANG DEWAN KOMISARIS", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 15", bold: true }] },
    { type: 'p', runs: [{ text: "1. Dewan Komisaris setiap waktu dalam jam kerja kantor Perseroan berhak memasuki bangunan dan halaman atau tempat lain yang dipergunakan atau yang dikuasai oleh Perseroan dan berhak memeriksa semua pembukuan, surat dan alat bukti lainnya, memeriksa dan mencocokkan keadaan uang kas dan lain-lain serta berhak untuk mengetahui segala tindakan yang telah dijalankan oleh Direksi." }] },
    { type: 'p', runs: [{ text: "2. Direksi dan setiap anggota Direksi wajib untuk memberikan penjelasan tentang segala hal yang ditanyakan oleh Dewan Komisaris." }] },
    { type: 'p', runs: [{ text: "3. Apabila seluruh anggota Direksi diberhentikan sementara dan Perseroan tidak mempunyai seorangpun anggota Direksi, maka untuk sementara Dewan Komisaris diwajibkan untuk mengurus Perseroan. Dalam hal demikian Dewan Komisaris berhak untuk memberikan kekuasaan sementara kepada seorang atau lebih diantara anggota Dewan Komisaris atas tanggungan Dewan Komisaris." }] },
    { type: 'p', runs: [{ text: "4. Dalam hal hanya ada seorang anggota Dewan Komisaris, segala tugas dan wewenang yang diberikan kepada Komisaris Utama atau anggota Dewan Komisaris dalam Anggaraan Dasar ini pula berlaku pula baginya." }] },
    
    { type: 'p', align: 'center', runs: [{ text: "RAPAT DEWAN KOMISARIS", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 16", bold: true }] },
    { type: 'p', runs: [{ text: "Ketentuan sebagaimana dimaksud dalam Pasal 10 mutatis mutandis berlaku bagi rapat Dewan Komisaris." }] },
    
    { type: 'p', align: 'center', runs: [{ text: "RENCANA KERJA, TAHUN BUKU DAN LAPORAN TAHUNAN", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 17", bold: true }] },
    { type: 'p', runs: [{ text: "1. Direksi wajib menyampaikan rencana kerja yang memuat juga anggaran tahunan Perseroan kepada Dewan Komisaris untuk mendapat persetujuan, sebelum tahun buku dimulai." }] },
    { type: 'p', runs: [{ text: "2. Rencana kerja sebagaimana dimaksud pada ayat (1) harus disampaikan paling lambat 30 (tiga puluh) hari kerja sebelum dimulainya tahun buku yang akan datang." }] },
    { type: 'p', runs: [{ text: "3. Tahun buku Perseroan berjalan dari tanggal 1 (satu) Januari sampai dengan tanggal 31 (tiga puluh satu) Desember. Pada akhir bulan Desember tiap tahun, buku Perseroan ditutup. Untuk pertama kalinya buku Perseroan ini dimulai pada tanggal dari Akta Pendirian ini dan ditutup pada tanggal tiga puluh satu Desember dua ribu dua puluh enam (31-12-2026)." }] },
    { type: 'p', runs: [{ text: "4. Direksi menyusun laporan tahunan dan menyediakannya di Perseroan untuk dapat diperiksa oleh para pemegang saham terhitung sejak tanggal panggilan Rapat Umum Pemegang Saham tahunan." }] },

    { type: 'p', align: 'center', runs: [{ text: "PENGGUNAAN LABA DAN PEMBAGIAN DEVIDEN", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 18", bold: true }] },
    { type: 'p', runs: [{ text: "1. Laba bersih Perseroan dalam suatu tahun buku seperti tercantum dalam neraca dan perhitungan laba rugi yang telah disahkan oleh Rapat Umum Pemegang Saham tahunan dan merupakan saldo laba yang positif, dibagi menurut cara penggunaannya yang ditentukan oleh Rapat Umum Pemegang Saham tersebut." }] },
    { type: 'p', runs: [{ text: "2. Dalam hal Rapat Umum Pemegang Saham tidak menentukan cara penggunaanya, laba bersih tersebut seteleh dikurangi penyisihan untuk cadangan yang diwajibkan dalam Undang-Undang dan Anggaran Dasar, dibagikan kepada Pemegang Saham sebagai dividen." }] },
    { type: 'p', runs: [{ text: "3. Jika perhitungan laba rugi pada tahun buku menunjukan kerugian yang tidak dapat ditutup dengan dana cadangan, maka kerugian itu akan tetap dicatat dan dimasukan dalam perhitungan laba rugi dan dalam tahun buku selanjutnya perseroan dianggap tidak mendapat laba selama kerugian yang tercatat dan dimasukan dalam perhitungan laba rugi itu belum sama sekali ditutup." }] },
    { type: 'p', runs: [{ text: "4. Perseroan dapat membagikan dividen interim sebelum tahun buku Perseroan berakhir sesuai dengan ketentuan peraturan perundang-undangan yang berlaku bagi perseroan." }] },

    { type: 'p', align: 'center', runs: [{ text: "PENGGUNAAN CADANGAN", bold: true }] },
    { type: 'p', align: 'center', runs: [{ text: "PASAL 19", bold: true }] },
    { type: 'p', runs: [{ text: "1. Penyisihan laba bersih untuk cadangan dilakukan sampai mencapai 20% (dua puluh persen) dari jumlah modal ditempatkan dan disetor hanya boleh dipergunakan untuk menutup kerugian yang tidak dipenuhi oleh cadangan lain." }] },
    { type: 'p', runs: [{ text: "2. Jika jumlah cadangan telah melebihi jumlah 20% (dua puluh persen), Rapat Umum Pemegang Saham dapat memutuskan agar jumlah kelebihannya digunakan bagi keperluan Perseroan." }] },
    { type: 'p', runs: [{ text: "3. Cadangan sebagaimana dimaksud pada ayat (1) yang belum digunakan untuk menutup kerugian dan jumlah cadangan yang melebihi jumlah sebagaimana dimaksud pada ayat (2) yang penggunaannya belum ditentukan oleh Rapat Umum Pemegang Saham harus dikelola dengan cara yang tepat menurut pertimbagan Direksi setelah memperoleh persetujuan Dewan Komisaris serta dengan memperhatikan peraturan perundang-undangan agar memperoleh laba." }] },
`;

const pasal20Extra = `
    { type: 'p', runs: [{ text: "Sepanjang tidak diatur tersendiri dalam Anggaran Dasar ini berlaku Undang-Undang tentang Perseroan Terbatas dan peraturan Perundang-undangan lainnya." }] },
    { type: 'p', runs: [{ text: "Segala sesuatu yang tidak atau belum cukup diatur dalam Anggaran Dasar ini, akan diputuskan dalam Rapat Umum Pemegang Saham dengan memperhatikan peraturan perundang-undangan." }] },
`;

let code = fs.readFileSync('src/lib/pendirianContentBlocks.ts', 'utf8');

// Insert after pasal 5
code = code.replace(
    /  blocks\.push\(\n    \{ type: 'p', align: 'center', runs: \[\{ text: "D I R E K S I", bold: true \}\] \},\n/g,
    '  blocks.push(' + pasal5Extras + ');\n\n  blocks.push(' + pasal6 + pasal7 + pasal8 + pasal9 + pasal10 + ');\n\n  blocks.push(\n    { type: \'p\', align: \'center\', runs: [{ text: "D I R E K S I", bold: true }] },\n'
);

// Insert pasal 11 extras
code = code.replace(
    /    \{ type: 'p', runs: \[\{ text: `3\. Anggota Direksi diangkat oleh Rapat Umum Pemegang Saham, untuk jangka waktu \$\{data\.kuotaWaktuDireksi\}/g,
    pasal11Extras + '\n    { type: \'p\', runs: [{ text: `3. Anggota Direksi diangkat oleh Rapat Umum Pemegang Saham, untuk jangka waktu ${data.kuotaWaktuDireksi}'
);

// Insert pasal 12 and 13 and insert before pasal 14
code = code.replace(
    /  blocks\.push\(\n    \{ type: 'p', align: 'center', runs: \[\{ text: "DEWAN KOMISARIS", bold: true \}\] \},\n/g,
    '  blocks.push(' + pasal12 + pasal13 + ');\n\n  blocks.push(\n    { type: \'p\', align: \'center\', runs: [{ text: "DEWAN KOMISARIS", bold: true }] },\n'
);

// Insert pasal 14 extras
code = code.replace(
    /    \{ type: 'p', runs: \[\{ text: `3\. Anggota Dewan Komisaris diangkat oleh Rapat Umum Pemegang Saham untuk jangka waktu \$\{data\.kuotaWaktuDireksi\}/g,
    pasal14Extras + '\n    { type: \'p\', runs: [{ text: `3. Anggota Dewan Komisaris diangkat oleh Rapat Umum Pemegang Saham untuk jangka waktu ${data.kuotaWaktuDireksi}'
);

// Insert pasal 15, 16, 17, 18, 19
code = code.replace(
    /  blocks\.push\(\n    \{ type: 'p', align: 'center', runs: \[\{ text: "KETENTUAN PENUTUP", bold: true \}\] \},\n/g,
    '  blocks.push(' + pasal15To19 + ');\n\n  blocks.push(\n    { type: \'p\', align: \'center\', runs: [{ text: "KETENTUAN PENUTUP", bold: true }] },\n'
);

// Insert pasal 20 extra before "Akhirnya,"
code = code.replace(
    /    \{ type: 'p', runs: \[\{ text: "Akhirnya, para penghadap bertindak dalam kedudukannya sebagaimana tersebut di atas menerangkan bahwa :" \}\] \},\n/g,
    pasal20Extra + '\n    { type: \'p\', runs: [{ text: "Akhirnya, para penghadap bertindak dalam kedudukannya sebagaimana tersebut di atas menerangkan bahwa :" }] },\n'
);

// Also need to get the real closing year.
code = code.replace('dua ribu dua puluh enam (31-12-2026)', 'dua ribu dua puluh enam (31-12-2026)');

fs.writeFileSync('src/lib/pendirianContentBlocks.ts', code);
console.log('Pasal injected.');
