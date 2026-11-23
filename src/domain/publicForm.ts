export const PUBLIC_FORM_ENTITIES = {
  individual: 'Usaha Perorangan',
  ptp: 'PT Perorangan',
  pt: 'PT (Perseroan Terbatas)',
  cv: 'CV',
  foundation: 'Yayasan'
} as const;

export type PublicFormEntity = keyof typeof PUBLIC_FORM_ENTITIES;

export const PUBLIC_FORM_SERVICES: Record<PublicFormEntity, Array<{ id: string; name: string; note: string }>> = {
  individual: [{ id: 'nib', name: 'Pembuatan NIB', note: 'Untuk usaha milik orang perseorangan.' }],
  ptp: [
    { id: 'formation', name: 'Pendirian PT Perorangan', note: 'Pendaftaran Perseroan Perorangan.' },
    { id: 'nib', name: 'Penerbitan NIB', note: 'Pengurusan NIB untuk usaha.' },
    { id: 'combo', name: 'Pendirian + NIB', note: 'Pendirian Perseroan Perorangan sekaligus pengurusan NIB.' }
  ],
  pt: [
    { id: 'formation', name: 'Pendirian PT', note: 'Persiapan data dan proses pendirian PT.' },
    { id: 'nib', name: 'Penerbitan NIB', note: 'Pengurusan NIB untuk kegiatan usaha.' },
    { id: 'combo', name: 'Pendirian + NIB', note: 'Pendirian PT sekaligus pengurusan NIB.' }
  ],
  cv: [
    { id: 'formation', name: 'Pendirian CV', note: 'Persiapan data dan pendaftaran CV.' },
    { id: 'nib', name: 'Penerbitan NIB', note: 'Pengurusan NIB untuk kegiatan usaha.' },
    { id: 'combo', name: 'Pendirian + NIB', note: 'Pendirian CV sekaligus pengurusan NIB.' }
  ],
  foundation: [
    { id: 'foundation', name: 'Pendirian Yayasan', note: 'Pengesahan badan hukum dan susunan organ.' },
    { id: 'nib', name: 'Penerbitan NIB', note: 'Telaah kegiatan Yayasan dan pengurusan NIB bila diperlukan.' },
    { id: 'foundation-combo', name: 'Pendirian + NIB', note: 'Pendirian Yayasan sekaligus telaah kebutuhan NIB.' }
  ]
};

export const parseRupiah = (value: unknown): number => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

export const formatRupiah = (value: number): string =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value || 0);

export interface PublicFormPerson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  roles?: string[];
  position?: string;
  shareCount?: number | string;
  contribution?: number | string;
}

export interface PublicFormPayload {
  applicant: { name: string; email: string; phone: string; role?: string };
  entityType: PublicFormEntity;
  serviceId: string;
  business: {
    name?: string;
    nameAlternatives?: string[];
    domicile?: string;
    address?: string;
    activityAddress?: string;
    activities?: string[];
  };
  capital?: { basic: number | string; paid: number | string; nominal: number | string };
  businessCapital?: number | string;
  investment?: number | string;
  purpose?: string;
  foundationActivities?: string;
  initialAssets?: number | string;
  founder?: PublicFormPerson;
  people?: PublicFormPerson[];
  partners?: PublicFormPerson[];
  foundation?: { pembina: PublicFormPerson[]; pengurus: PublicFormPerson[]; pengawas: PublicFormPerson[] };
  documents?: Array<{ ownerKey: string; ownerName: string; kind: 'KTP' | 'NPWP'; fieldIndex: number }>;
  consent?: boolean;
  website?: string;
}

export interface PublicFormDocumentOwner {
  key: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

function asDocumentOwner(key: string, person: PublicFormPerson, role: string): PublicFormDocumentOwner {
  return {
    key,
    name: String(person.name || ''),
    role,
    email: String(person.email || ''),
    phone: String(person.phone || '')
  };
}

export function collectPublicFormDocumentOwners(payload: PublicFormPayload): PublicFormDocumentOwner[] {
  if (payload.entityType === 'individual' || payload.entityType === 'ptp') {
    const founder = payload.founder;
    return founder ? [asDocumentOwner('founder', founder, 'Pendiri / pemilik')] : [];
  }

  if (payload.entityType === 'pt') {
    return (payload.people || []).map(person => asDocumentOwner(
      `pt-${person.id}`,
      person,
      (person.roles || []).map(role => role === 'shareholder' ? 'Pemegang saham' : 'Pengurus').join(', ')
    ));
  }

  if (payload.entityType === 'cv') {
    return (payload.partners || []).map(person => asDocumentOwner(`cv-${person.id}`, person, String(person.position || 'Sekutu')));
  }

  const organs = payload.foundation || { pembina: [], pengurus: [], pengawas: [] };
  return (['pembina', 'pengurus', 'pengawas'] as const).flatMap(organ =>
    (organs[organ] || []).map(person => asDocumentOwner(
      `${organ}-${person.id}`,
      person,
      `${organ[0].toUpperCase()}${organ.slice(1)}${person.position ? ` · ${person.position}` : ''}`
    ))
  );
}

export function getFirstBusinessName(payload: PublicFormPayload): string {
  if (payload.entityType === 'pt') {
    return String(payload.business?.nameAlternatives?.[0] || '').trim();
  }
  if (payload.entityType === 'individual') {
    return String(payload.business?.name || '').trim() || PUBLIC_FORM_ENTITIES.individual;
  }
  return String(payload.business?.name || '').trim();
}

export function getPtCapitalError(
  capital: { basic?: unknown; paid?: unknown; nominal?: unknown } | undefined,
  people: PublicFormPerson[] = []
): string | null {
  const basic = parseRupiah(capital?.basic);
  const paid = parseRupiah(capital?.paid);
  const nominal = parseRupiah(capital?.nominal);

  if (!basic || !paid || !nominal) return 'Isi modal dasar, modal disetor, dan nominal per lembar saham.';
  if (basic % nominal !== 0) return 'Modal dasar harus dapat dibagi nominal per lembar tanpa sisa.';
  if (paid > basic) return 'Modal disetor tidak boleh melebihi modal dasar.';

  const minimum = Math.ceil(basic * 0.25);
  if (paid < minimum) return `Modal disetor harus minimal 25% dari modal dasar (Rp ${formatRupiah(minimum)}).`;

  const shareholders = people.filter(person => (person.roles || []).includes('shareholder'));
  if (shareholders.length < 2) return 'PT memerlukan minimal dua pemegang saham.';
  if (shareholders.some(person => !/^\d+$/.test(String(person.shareCount || '').trim()) || Number(person.shareCount) <= 0)) {
    return 'Isi jumlah lembar saham untuk setiap pemegang saham.';
  }

  const placed = shareholders.reduce((sum, person) => sum + Number(person.shareCount) * nominal, 0);
  if (placed > basic) return 'Total nilai saham melebihi modal dasar. Kurangi alokasi saham per orang.';
  if (placed < minimum) return `Modal ditempatkan harus minimal 25% dari modal dasar (Rp ${formatRupiah(minimum)}).`;
  if (paid !== placed) return `Modal disetor harus sama dengan modal ditempatkan otomatis (Rp ${formatRupiah(placed)}).`;
  return null;
}

export function validatePublicFormPayload(payload: PublicFormPayload): string[] {
  const errors: string[] = [];
  if (!payload.applicant?.name?.trim() || payload.applicant.name.trim().length < 2) errors.push('Nama pemohon wajib diisi.');
  if (!payload.applicant?.email?.includes('@')) errors.push('Email pemohon tidak valid.');
  if (String(payload.applicant?.phone || '').replace(/\D/g, '').length < 8) errors.push('Nomor HP pemohon tidak valid.');
  if (!['Pendiri / pemilik', 'Pengurus', 'Kuasa pemohon'].includes(String(payload.applicant?.role || ''))) errors.push('Pilih peran pemohon.');
  if (!payload.entityType || !PUBLIC_FORM_ENTITIES[payload.entityType]) errors.push('Bentuk badan usaha tidak valid.');
  const allowedServices = payload.entityType ? PUBLIC_FORM_SERVICES[payload.entityType] || [] : [];
  if (!allowedServices.some(service => service.id === payload.serviceId)) errors.push('Jenis layanan tidak sesuai bentuk badan usaha.');
  if (!payload.business?.address?.trim()) errors.push('Alamat usaha wajib diisi.');
  if (!(payload.business?.activities || []).some(activity => String(activity || '').trim())) errors.push('Isi minimal satu kegiatan usaha / KBLI.');
  if (!getFirstBusinessName(payload)) errors.push('Nama badan usaha atau alternatif nama pertama wajib diisi.');
  if (payload.entityType !== 'individual' && String(payload.business?.domicile || '').trim().length < 2) errors.push('Kedudukan badan usaha wajib diisi.');

  if (payload.entityType === 'pt') {
    if ((payload.business?.nameAlternatives || []).filter(name => String(name || '').trim()).length < 1) errors.push('Isi nama PT pilihan pertama.');
    if ((payload.people || []).length < 2) errors.push('PT wajib memiliki data minimal dua orang.');
    if ((payload.people || []).length > 20) errors.push('Jumlah data orang PT maksimal 20 orang.');
    if ((payload.people || []).some(person => !person.roles?.length || person.roles.some(role => !['shareholder', 'manager'].includes(role)))) errors.push('Pilih peran setiap orang di PT.');
    if ((payload.people || []).some(person => person.roles?.includes('manager') && !['Direktur', 'Direktur Utama', 'Komisaris', 'Komisaris Utama'].includes(String(person.position || '')))) errors.push('Pilih jabatan untuk setiap pengurus.');
    const managers = (payload.people || []).filter(person => person.roles?.includes('manager'));
    if (!managers.some(person => ['Direktur', 'Direktur Utama'].includes(String(person.position || '')))) errors.push('Isi minimal satu Direktur atau Direktur Utama.');
    if (!managers.some(person => ['Komisaris', 'Komisaris Utama'].includes(String(person.position || '')))) errors.push('Isi minimal satu Komisaris atau Komisaris Utama.');
    const capitalError = getPtCapitalError(payload.capital, payload.people || []);
    if (capitalError) errors.push(capitalError);
  }

  if (payload.entityType === 'individual' || payload.entityType === 'ptp') {
    if (!payload.founder?.name?.trim()) errors.push('Nama pemilik / pendiri wajib diisi.');
  }

  if (payload.entityType === 'foundation') {
    if (!String(payload.purpose || '').trim()) errors.push('Maksud dan tujuan Yayasan wajib diisi.');
    if (!String(payload.initialAssets || '').trim()) errors.push('Kekayaan awal yang dipisahkan wajib diisi.');
  }

  if (payload.entityType === 'cv') {
    const partners = payload.partners || [];
    if (partners.length < 2) errors.push('CV memerlukan sekutu aktif dan sekutu pasif.');
    if (partners.length > 20) errors.push('Jumlah sekutu CV maksimal 20 orang.');
    if (partners.some(person => !['Sekutu aktif', 'Sekutu pasif'].includes(String(person.position || '')))) errors.push('Pilih peran setiap sekutu CV.');
    if (partners.some(person => parseRupiah(person.contribution) <= 0)) errors.push('Isi kontribusi setiap sekutu CV.');
    if (!partners.some(person => person.position === 'Sekutu aktif')) errors.push('Tambahkan minimal satu sekutu aktif.');
    if (!partners.some(person => person.position === 'Sekutu pasif')) errors.push('Tambahkan minimal satu sekutu pasif.');
  }

  if (payload.entityType === 'foundation') {
    const organs = payload.foundation;
    if (!organs?.pembina?.length) errors.push('Isi minimal satu Pembina Yayasan.');
    if (!organs?.pengurus?.length) errors.push('Isi minimal satu Pengurus Yayasan.');
    if (!organs?.pengawas?.length) errors.push('Isi minimal satu Pengawas Yayasan.');
    if (['pembina', 'pengurus', 'pengawas'].some(organ => ((organs as any)?.[organ] || []).length > 20)) errors.push('Setiap organ Yayasan maksimal 20 orang.');
    if ((organs?.pembina || []).some(person => !['Ketua Pembina', 'Anggota Pembina'].includes(String(person.position || '')))) errors.push('Pilih jabatan setiap Pembina Yayasan.');
    if ((organs?.pengawas || []).some(person => !['Ketua Pengawas', 'Anggota Pengawas'].includes(String(person.position || '')))) errors.push('Pilih jabatan setiap Pengawas Yayasan.');
    const managementPositions = ['Ketua Umum', 'Ketua 1', 'Ketua 2', 'Wakil Ketua 1', 'Wakil Ketua 2', 'Sekretaris Umum', 'Sekretaris', 'Bendahara Umum', 'Bendahara'];
    if ((organs?.pengurus || []).some(person => !managementPositions.includes(String(person.position || '')))) errors.push('Pilih jabatan setiap Pengurus Yayasan.');
  }

  const owners = collectPublicFormDocumentOwners(payload);
  if (owners.length > 30) errors.push('Jumlah orang dalam formulir melebihi batas yang diizinkan.');
  if (owners.some(owner => owner.name.trim().length < 2)) errors.push('Nama setiap orang dalam formulir wajib diisi.');
  if (owners.some(owner => !owner.email.includes('@'))) errors.push('Email setiap orang wajib diisi dengan benar.');
  if (owners.some(owner => owner.phone.replace(/\D/g, '').length < 8)) errors.push('Nomor HP setiap orang wajib diisi dengan benar.');

  if (!payload.consent) errors.push('Persetujuan penggunaan data wajib dicentang.');
  return [...new Set(errors)];
}
