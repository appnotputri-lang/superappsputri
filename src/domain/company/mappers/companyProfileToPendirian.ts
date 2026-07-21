export function mapCompanyProfileToPendirian(profile: any, prev?: any): any {
  if (!profile) return prev || {};

  const baseData = prev || {
    namaPt: '',
    kotaKedudukan: '',
    alamatLengkapPT: '',
    kuotaWaktuDireksi: '5',
    tanggal: new Date().toISOString().split('T')[0],
    waktu: '10:00',
    nomorAkta: '',
    nomorUrut: '',
    notarisTempat: 'Kabupaten Bandung Barat',
    notarisNamaSurat: '',
    kbliItems: [],
    modalDasar: 50000000,
    modalDisetorPersen: 25,
    nilaiPerLembar: 50000,
    saksi1Nama: 'Nendi Suhendi',
    saksi1LahirTempat: 'Bandung',
    saksi1LahirTanggal: '1991-07-15',
    saksi1Pekerjaan: 'Karyawan Swasta',
    saksi1Alamat: 'Jalan Sukaresmi Nomor 17, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi',
    saksi1NIK: '3217011507910016',
    saksi2Nama: 'Siti Nur Azizah',
    saksi2LahirTempat: 'Bandung',
    saksi2LahirTanggal: '1999-12-17',
    saksi2Pekerjaan: 'Karyawan Swasta',
    saksi2Alamat: 'Jalan Lembah Pakar Timur II Kampung Sekebuluh Rukun Tetangga 001, Rukun Warga 004, Kecamatan Cimenyan, Desa Ciburial',
    saksi2NIK: '3204065712990001',
    shareholders: []
  };

  const mappedShareholders = (profile.shareholders || []).map((s: any) => ({
    id: crypto.randomUUID(),
    salutation: s.salutation || 'Tuan',
    name: (s.name || '').toUpperCase(),
    birthCity: s.birthCity || '',
    birthDate: s.birthDate || '',
    nationality: s.nationality || 'WNI',
    nationalityType: s.nationalityType || 'WNI',
    occupation: s.occupation || '',
    address: {
      fullAddress: s.address?.fullAddress || '',
      rt: s.address?.rt || '',
      rw: s.address?.rw || '',
      kelurahan: s.address?.kelurahan || '',
      kecamatan: s.address?.kecamatan || '',
      city: s.address?.city || '',
      province: s.address?.province || '',
    },
    nik: s.nik || '',
    shareholderType: s.shareholderType || 'PERORANGAN',
    isForeign: s.isForeign || false,
    npwp: s.npwp || '',
    passportNumber: s.passportNumber || '',
    establishmentDeedNumber: s.establishmentDeedNumber || '',
    establishmentDeedDate: s.establishmentDeedDate || '',
    sharesOwned: s.sharesOwned || 0,
    managementPosition: s.managementPosition || 'Direktur',
    isManagement: typeof s.isManagement !== 'undefined' ? s.isManagement : true
  }));

  const mappedKblis = (profile.kbliItems || []).map((k: any) => ({
    id: k.id || crypto.randomUUID(),
    code: k.code || k.kode || '',
    name: k.name || k.judul || k.title || '',
    description: k.description || k.uraian || '',
    categoryLetter: k.categoryLetter || '',
    categoryName: k.categoryName || '',
    uraian: k.uraian || k.description || ''
  }));

  const alamatLengkap = profile.fullAddress || profile.oldFullAddress || (profile.newAddress?.fullAddress ? 
    `${profile.newAddress.fullAddress}, RT ${profile.newAddress.rt}/${profile.newAddress.rw}, Kel. ${profile.newAddress.kelurahan}, Kec. ${profile.newAddress.kecamatan}` 
    : '');

  return {
    ...baseData,
    selectedProfileId: profile.id,
    namaPt: (profile.companyName || '').toUpperCase(),
    kotaKedudukan: profile.newAddress?.city || profile.oldAddress?.city || profile.domicile || profile.oldDomicile || '',
    alamatLengkapPT: alamatLengkap || baseData.alamatLengkapPT,
    modalDasar: profile.originalCapitalBase || baseData.modalDasar,
    modalDasarLembar: profile.originalAuthorizedShares || baseData.modalDasarLembar,
    modalDisetorLembar: profile.originalTotalShares || baseData.modalDisetorLembar,
    nilaiPerLembar: profile.originalSharePrice || baseData.nilaiPerLembar,
    modalDisetorPersen: profile.originalCapitalBase ? 
      Math.round((profile.originalCapitalPaid / profile.originalCapitalBase) * 100) : baseData.modalDisetorPersen,
    kbliItems: mappedKblis.length > 0 ? mappedKblis : baseData.kbliItems,
    shareholders: mappedShareholders.length > 0 ? mappedShareholders : baseData.shareholders
  };
}
