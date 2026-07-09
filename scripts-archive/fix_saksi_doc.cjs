const fs = require('fs');
let content = fs.readFileSync('src/lib/pendirianContentBlocks.ts', 'utf8');

const oldSaksi1 = "{ type: 'saksi', num: 1, runs: [{ text: 'Nendi Suhendi, lahir di Bandung, pada tanggal lima belas Juli seribu sembilan ratus sembilan puluh satu (15-07-1991), Warga Negara Indonesia, bertempat tinggal di Jalan Sukaresmi Nomor 12, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi, pemegang Kartu Tanda Penduduk Nomor 3217011507910016;' }] },";
const oldSaksi2 = "{ type: 'saksi', num: 2, runs: [{ text: 'Siti Nur Azizah, lahir di Bandung, pada tanggal tujuh belas Desember seribu sembilan ratus sembilan puluh sembilan (17-12-1999), Warga Negara Indonesia, bertempat tinggal di Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh Rukun Tetangga 001, Rukun Warga 004, Kecamatan Cimenyan, Desa Ciburial, pemegang Kartu Tanda Penduduk Nomor 3204065712990001;' }] },";

const newSaksi1 = `{ type: 'saksi', num: 1, runs: [{ text: \`\${data.saksi1Nama || 'Nendi Suhendi'}, lahir di \${toTitleCase(data.saksi1LahirTempat || 'Bandung')}, pada tanggal \${formatDateIndo(data.saksi1LahirTanggal || '1991-07-15')}, Warga Negara Indonesia, \${toTitleCase(data.saksi1Pekerjaan || 'Karyawan Swasta')}, bertempat tinggal di \${formatAddress(data.saksi1Alamat || 'Jalan Sukaresmi Nomor 12, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi')}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi1NIK || '3217011507910016'};\`} ] },`;
const newSaksi2 = `{ type: 'saksi', num: 2, runs: [{ text: \`\${data.saksi2Nama || 'Siti Nur Azizah'}, lahir di \${toTitleCase(data.saksi2LahirTempat || 'Bandung')}, pada tanggal \${formatDateIndo(data.saksi2LahirTanggal || '1999-12-17')}, Warga Negara Indonesia, \${toTitleCase(data.saksi2Pekerjaan || 'Karyawan Swasta')}, bertempat tinggal di \${formatAddress(data.saksi2Alamat || 'Jalan Lembah Pakar Timur II Kampung Sekebuluh Rukun Tetangga 001, Rukun Warga 004, Kecamatan Cimenyan, Desa Ciburial')}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi2NIK || '3204065712990001'};\`} ] },`;

content = content.replace(oldSaksi1, newSaksi1);
content = content.replace(oldSaksi2, newSaksi2);

fs.writeFileSync('src/lib/pendirianContentBlocks.ts', content);
