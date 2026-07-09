const fs = require('fs');
let file = 'src/lib/pendirianContentBlocks.ts';
let content = fs.readFileSync(file, 'utf8');

const replacement = `  const s1DetailText = expandAbbreviations(
    data.saksi1LahirTempat && data.saksi1LahirTanggal && data.saksi1Alamat && data.saksi1NIK
      ? \`, lahir di \${toTitleCase(data.saksi1LahirTempat)}, pada tanggal \${formatAktaDate(data.saksi1LahirTanggal)}, Warga Negara Indonesia, bertempat tinggal di \${formatAddress(data.saksi1Alamat)}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi1NIK}\`
      : ", lahir di Bandung, Pada Tanggal Limabelas Juli Seribu Sembilan Ratus Sembilan Puluh Satu (15-07-1991), Warga Negara Indonesia, bertempat tinggal di Jalan Sukaresmi Nomor 17, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi, pemegang Kartu Tanda Penduduk Nomor 3217011507910016"
  );
  const s2DetailText = expandAbbreviations(
    data.saksi2LahirTempat && data.saksi2LahirTanggal && data.saksi2Alamat && data.saksi2NIK
      ? \`, lahir di \${toTitleCase(data.saksi2LahirTempat)}, pada tanggal \${formatAktaDate(data.saksi2LahirTanggal)}, Warga Negara Indonesia, bertempat tinggal di \${formatAddress(data.saksi2Alamat)}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi2NIK}\`
      : ", lahir di Bandung, Pada Tanggal Tujuh Belas Desember Seribu Sembilan Ratus Sembilan Puluh Sembilan (17-12-1999), Warga Negara Indonesia, bertempat tinggal di Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh Rukun Tetangga 001, Rukun Warga 004, Desa Ciburial, Kecamatan Cimenyan, pemegang Kartu Tanda Penduduk Nomor 3204065712990001"
  );

  const ttdNotaryName = (data.notarisNamaSurat || "NUKANTINI PUTRI PARINCHA, SH., M.Kn.")
    .toUpperCase()
    .replace(/\\.?$/, "."); // Ensure it ends with exactly one period

  blocks.push(
    ...createPendirianClosing({
      notarisTempat: toTitleCase(notarisTempat),
      saksi1Nama: data.saksi1Nama || "Nendi Suhendi",
      saksi1Text: s1DetailText,
      saksi2Nama: data.saksi2Nama || "Siti Nur Azizah",
      saksi2Text: s2DetailText,
    })
  );
  return blocks;
}`;

// regex to find from "const s1DetailText" to the end of the file
const regex = /const s1DetailText = expandAbbreviations\([\s\S]*\}\s*$/;
if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log("Success");
} else {
  console.log("Regex not matched");
}
