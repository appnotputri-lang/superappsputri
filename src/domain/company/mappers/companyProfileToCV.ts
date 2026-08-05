import { CVProfile, Pesero, KbliItem } from '../../../../types';

export function mapCompanyProfileToCV(profile: any, prev?: Partial<CVProfile>): CVProfile {
  if (!profile) return (prev as CVProfile) || ({} as CVProfile);

  const namaCV = (profile.namaCV || profile.companyName || prev?.namaCV || '').toUpperCase().trim();
  const kotaKedudukan = profile.kotaKedudukan || profile.domicile || profile.addressDetail?.city || prev?.kotaKedudukan || '';
  const alamatLengkapCV = profile.alamatLengkapCV || profile.fullAddress || profile.addressDetail?.fullAddress || prev?.alamatLengkapCV || '';
  const modalTotal = Number(profile.modalTotal || profile.totalCapital || profile.originalCapitalPaid || prev?.modalTotal || 100000000);

  const rawPeseros = profile.peseros || profile.peseroList || profile.shareholders || prev?.peseros || [];
  const peseros: Pesero[] = rawPeseros.map((s: any) => {
    const isKomanditer = (s.role === 'KOMANDITER') || (s.managementPosition && String(s.managementPosition).toUpperCase().includes('KOMANDITER')) || (!s.isManagement && !s.role);
    const role: 'PENGURUS' | 'KOMANDITER' = isKomanditer ? 'KOMANDITER' : 'PENGURUS';
    
    let addr = s.address || '';
    if (typeof s.address === 'object' && s.address !== null) {
      addr = {
        fullAddress: s.address.fullAddress || '',
        rt: s.address.rt || '',
        rw: s.address.rw || '',
        kelurahan: s.address.kelurahan || '',
        kecamatan: s.address.kecamatan || '',
        city: s.address.city || '',
        province: s.address.province || '',
      };
    }

    return {
      id: s.id || crypto.randomUUID(),
      salutation: s.salutation || 'Tuan',
      name: (s.name || '').toUpperCase().trim(),
      birthCity: s.birthCity || '',
      birthDate: s.birthDate || '',
      nationality: s.nationality || 'WNI',
      nationalityType: s.nationalityType || 'WNI',
      occupation: s.occupation || '',
      address: addr,
      nik: s.nik || '',
      role,
      modalContribution: Number(s.modalContribution || s.capitalAmount || s.sharesOwned || 0),
    };
  });

  const rawKblis = profile.kbliItems || prev?.kbliItems || [];
  const mappedKblis: KbliItem[] = rawKblis.map((k: any) => ({
    id: k.id || crypto.randomUUID(),
    code: k.code || k.kode || '',
    name: k.name || k.judul || k.title || '',
    description: k.description || k.uraian || '',
    categoryLetter: k.categoryLetter || '',
    categoryName: k.categoryName || '',
    uraian: k.uraian || k.description || '',
  }));

  return {
    id: profile.id || prev?.id,
    updatedAt: profile.updatedAt || prev?.updatedAt || new Date().toISOString(),
    namaCV,
    kotaKedudukan,
    alamatLengkapCV,
    modalTotal,
    peseros,
    nomorAkta: profile.nomorAkta || prev?.nomorAkta || '02',
    tanggal: profile.tanggal || profile.signingDate || prev?.tanggal || new Date().toISOString().split('T')[0],
    waktu: profile.waktu || profile.aktaStartTime || prev?.waktu || '10:30 WIB',
    notarisTempat: profile.notarisTempat || profile.notaryDomicile || profile.signingPlace || prev?.notarisTempat || 'Kabupaten Bandung Barat',
    notaryName: profile.notaryName || prev?.notaryName || 'R.A. NUKANTINI PUTRI PARINCHA, SH., M.Kn.',
    notaryTitle: profile.notaryTitle || prev?.notaryTitle || 'Notaris di Kabupaten Bandung Barat',
    notaryDomicile: profile.notaryDomicile || prev?.notaryDomicile || 'Kabupaten Bandung Barat',
    duration: profile.duration || prev?.duration || 'tidak terbatas',
    kbliItems: mappedKblis,
    mainActivityDescription: profile.mainActivityDescription || prev?.mainActivityDescription,
    TutupBukuTanggal: profile.TutupBukuTanggal || prev?.TutupBukuTanggal || '31 Desember',
    saksi1Nama: profile.saksi1Nama || prev?.saksi1Nama || 'Nendi Suhendi',
    saksi1Lahir: profile.saksi1Lahir || prev?.saksi1Lahir || 'Bandung, 15 Juli 1991',
    saksi1Alamat: profile.saksi1Alamat || prev?.saksi1Alamat || 'Jalan Sukaresmi Nomor 12, Rukun Tetangga 005, Rukun Warga 005, Kecamatan Lembang, Desa Mekarwangi',
    saksi1NIK: profile.saksi1NIK || prev?.saksi1NIK || '3217011507910016',
    saksi2Nama: profile.saksi2Nama || prev?.saksi2Nama || 'Siti Nur Azizah',
    saksi2Lahir: profile.saksi2Lahir || prev?.saksi2Lahir || 'Bandung, 17 Desember 1999',
    saksi2Alamat: profile.saksi2Alamat || prev?.saksi2Alamat || 'Jalan Lembah Pakar Timur II Kampung Sekebuluh, Rukun Tetangga 001, Rukun Warga 004, Kecamatan Cimenyan, Desa Ciburial',
    saksi2NIK: profile.saksi2NIK || prev?.saksi2NIK || '3204065712990001',
    documentStatus: profile.documentStatus || prev?.documentStatus || 'DRAFTING',
  };
}
