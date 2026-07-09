const fs = require('fs');

function patchRupsLB() {
  let file = 'src/lib/rupsContentBlocks.ts';
  let content = fs.readFileSync(file, 'utf8');

  // Replace createRupsClosing call
  const target = `    ...createRupsClosing({
      notarisTempat: "Kabupaten Bandung Barat",
      saksi1Nama: expandAbbreviations(data.saksi1Nama || "Nendi Suhendi"),
      saksi1Text: expandAbbreviations(
        \`, lahir di \${data.saksi1Lahir || "Bandung, pada tanggal lima belas Juli seribu sembilan ratus sembilan puluh satu (15-07-1991)"}, Warga Negara Indonesia, bertempat tinggal di \${(data.saksi1Alamat || "Jalan Sukaresmi Nomor 17, RT. 005 RW. 005, Kecamatan Lembang, Desa Mekarwangi").replace("Sukaresmi Nomor 12", "Sukaresmi Nomor 17")}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi1NIK || "3217011507910016"};\`,
      ),
      saksi2Nama: expandAbbreviations(data.saksi2Nama || "Siti Nur Azizah"),
      saksi2Text: expandAbbreviations(
        \`, lahir di \${data.saksi2Lahir || "Bandung, pada tanggal tujuh belas Desember seribu sembilan ratus sembilan puluh sembilan (17-12-1999)"}, Warga Negara Indonesia, bertempat tinggal di \${data.saksi2Alamat || "Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh RT. 001 RW. 004, Kecamatan Cimenyan, Desa Ciburial"}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi2NIK || "3204065712990001"}.\`,
      ),
    })`;

  const replacement = `    ...createRupsClosing({
      notarisTempat: "Kabupaten Bandung Barat",
      saksi1Nama: expandAbbreviations(data.saksi1Nama || "Nendi Suhendi"),
      saksi1Text: expandAbbreviations(
        data.saksi1Lahir && data.saksi1Alamat && data.saksi1NIK
          ? \`, lahir di \${toTitleCase(data.saksi1Lahir)}, Warga Negara Indonesia, bertempat tinggal di \${formatAddress(toTitleCase(data.saksi1Alamat.replace(/Sukaresmi Nomor 12/gi, "Sukaresmi Nomor 17")))}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi1NIK}\`
          : ", lahir di Bandung, Pada Tanggal Limabelas Juli Seribu Sembilan Ratus Sembilan Puluh Satu (15-07-1991), Warga Negara Indonesia, bertempat tinggal di Jalan Sukaresmi Nomor 17, RT. 005 RW. 005, Kecamatan Lembang, Desa Mekarwangi, pemegang Kartu Tanda Penduduk Nomor 3217011507910016"
      ),
      saksi2Nama: expandAbbreviations(data.saksi2Nama || "Siti Nur Azizah"),
      saksi2Text: expandAbbreviations(
        data.saksi2Lahir && data.saksi2Alamat && data.saksi2NIK
          ? \`, lahir di \${toTitleCase(data.saksi2Lahir)}, Warga Negara Indonesia, bertempat tinggal di \${formatAddress(toTitleCase(data.saksi2Alamat))}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi2NIK}\`
          : ", lahir di Bandung, Pada Tanggal Tujuh Belas Desember Seribu Sembilan Ratus Sembilan Puluh Sembilan (17-12-1999), Warga Negara Indonesia, bertempat tinggal di Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh RT. 001 RW. 004, Desa Ciburial, Kecamatan Cimenyan, pemegang Kartu Tanda Penduduk Nomor 3204065712990001"
      ),
    })`;

  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
}

function patchPendirian() {
  let file = 'src/lib/pendirianContentBlocks.ts';
  let content = fs.readFileSync(file, 'utf8');

  const target = `  const s1DetailText = expandAbbreviations(
    \`, lahir di \${toTitleCase(data.saksi1LahirTempat || "Bandung")}, pada tanggal \${formatAktaDate(data.saksi1LahirTanggal || "1991-07-15")}, Warga Negara Indonesia, bertempat tinggal di \${formatAddress(data.saksi1Alamat || saksi1DefaultAlamat)}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi1NIK || "3217011507910016"};\`
  );
  const s2DetailText = expandAbbreviations(
    \`, lahir di \${toTitleCase(data.saksi2LahirTempat || "Bandung")}, pada tanggal \${formatAktaDate(data.saksi2LahirTanggal || "1999-12-17")}, Warga Negara Indonesia, bertempat tinggal di \${formatAddress(data.saksi2Alamat || saksi2DefaultAlamat)}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi2NIK || "3204065712990001"};\`
  );

  const ttdNotaryName = (data.notarisNamaSurat || "NUKANTINI PUTRI PARINCHA, SH., M.Kn.")
    .toUpperCase()
    .replace(/\\.?$/, "."); // Ensure it ends with exactly one period

  blocks.push(
    ...createPendirianClosing({
      notarisTempat: toTitleCase(notarisTempat),
      saksi1Text: s1DetailText,
      saksi2Text: s2DetailText,
    })
  );`;

  const replacement = `  const s1DetailText = expandAbbreviations(
    data.saksi1LahirTempat && data.saksi1LahirTanggal && data.saksi1Alamat && data.saksi1NIK
      ? \`, lahir di \${toTitleCase(data.saksi1LahirTempat)}, pada tanggal \${formatAktaDate(data.saksi1LahirTanggal)}, Warga Negara Indonesia, bertempat tinggal di \${formatAddress(data.saksi1Alamat)}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi1NIK}\`
      : ", lahir di Bandung, Pada Tanggal Limabelas Juli Seribu Sembilan Ratus Sembilan Puluh Satu (15-07-1991), Warga Negara Indonesia, bertempat tinggal di Jalan Sukaresmi Nomor 17, RT. 005 RW. 005, Kecamatan Lembang, Desa Mekarwangi, pemegang Kartu Tanda Penduduk Nomor 3217011507910016"
  );
  const s2DetailText = expandAbbreviations(
    data.saksi2LahirTempat && data.saksi2LahirTanggal && data.saksi2Alamat && data.saksi2NIK
      ? \`, lahir di \${toTitleCase(data.saksi2LahirTempat)}, pada tanggal \${formatAktaDate(data.saksi2LahirTanggal)}, Warga Negara Indonesia, bertempat tinggal di \${formatAddress(data.saksi2Alamat)}, pemegang Kartu Tanda Penduduk Nomor \${data.saksi2NIK}\`
      : ", lahir di Bandung, Pada Tanggal Tujuh Belas Desember Seribu Sembilan Ratus Sembilan Puluh Sembilan (17-12-1999), Warga Negara Indonesia, bertempat tinggal di Kabupaten Bandung, Jalan Lembah Pakar Timur II Kampung Sekebuluh RT. 001 RW. 004, Desa Ciburial, Kecamatan Cimenyan, pemegang Kartu Tanda Penduduk Nomor 3204065712990001"
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
  );`;

  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
}

patchRupsLB();
patchPendirian();
