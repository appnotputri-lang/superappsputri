import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, ShieldCheck, Upload, X } from 'lucide-react';
import {
  formatRupiah,
  getPtCapitalError,
  parseRupiah,
  PUBLIC_FORM_ENTITIES,
  PUBLIC_FORM_SERVICES,
  validatePublicFormPayload,
  type PublicFormEntity,
  type PublicFormPayload,
  type PublicFormPerson
} from '../../domain/publicForm';

type PersonRow = PublicFormPerson & { ktpFile: File | null; npwpFile: File | null };
type FoundationState = { pembina: PersonRow[]; pengurus: PersonRow[]; pengawas: PersonRow[] };

const fieldClass = 'w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-slate-800 outline-none transition focus:border-[#1e61c3] focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 20 * 1024 * 1024;

function makePerson(overrides: Partial<PersonRow> = {}): PersonRow {
  return {
    id: crypto.randomUUID(),
    name: '',
    email: '',
    phone: '',
    roles: [],
    position: '',
    shareCount: '',
    contribution: '',
    ktpFile: null,
    npwpFile: null,
    ...overrides
  };
}

function InputField({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
  hint,
  inputMode,
  readOnly = false,
  onBlur,
  className = ''
}: {
  label: string;
  value: string | number;
  onChange?: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  readOnly?: boolean;
  onBlur?: () => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}{required && <span className="ml-1 text-red-600">*</span>}</span>
      <input
        type={type}
        className={`${fieldClass} ${readOnly ? 'cursor-not-allowed bg-slate-50 text-slate-500' : ''}`}
        value={value}
        onChange={onChange ? event => onChange(event.target.value) : undefined}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        readOnly={readOnly}
      />
      {hint && <span className="mt-1.5 block text-sm text-slate-500">{hint}</span>}
    </label>
  );
}

function TextAreaField({ label, value, onChange, required = false, placeholder, rows = 3 }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}{required && <span className="ml-1 text-red-600">*</span>}</span>
      <textarea className={`${fieldClass} min-h-24 resize-y`} value={value} onChange={event => onChange(event.target.value)} required={required} placeholder={placeholder} rows={rows} />
    </label>
  );
}

function SelectField({ label, value, onChange, options, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}{required && <span className="ml-1 text-red-600">*</span>}</span>
      <select className={`${fieldClass} appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_14px_center] bg-no-repeat pr-10`} value={value} onChange={event => onChange(event.target.value)} required={required}>
        {!required && <option value="">Pilih {label.toLowerCase()}</option>}
        {options.map(option => {
          const split = option.indexOf('|');
          const optionValue = split >= 0 ? option.slice(0, split) : option;
          const optionLabel = split >= 0 ? option.slice(split + 1) : option;
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
    </label>
  );
}

function UploadField({ label, file, onChange, required = false }: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 transition hover:border-blue-400 hover:bg-blue-50/50">
      <span className="mb-1 text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-red-600">*</span>}</span>
      <span className="flex items-center gap-2 text-sm text-slate-500"><Upload size={15} />{file ? file.name : 'PDF, JPG, PNG · maksimal 5 MB'}</span>
      <input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={event => onChange(event.target.files?.[0] || null)} />
    </label>
  );
}

function IdentityFields({ person, update, title = 'Data orang' }: {
  person: PersonRow;
  update: (key: keyof PersonRow, value: any) => void;
  title?: string;
}) {
  return (
    <>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <InputField label="Nama" value={person.name} onChange={value => update('name', value)} required placeholder="Sesuai KTP" />
        <InputField label="Email" value={person.email || ''} onChange={value => update('email', value)} required type="email" placeholder="nama@email.com" />
        <InputField label="Nomor HP" value={person.phone || ''} onChange={value => update('phone', value)} required type="tel" placeholder="+62" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <UploadField label={`Unggah KTP ${title}`} file={person.ktpFile} onChange={file => update('ktpFile', file)} required />
        <UploadField label={`Unggah NPWP ${title}`} file={person.npwpFile} onChange={file => update('npwpFile', file)} required />
      </div>
    </>
  );
}

function PersonCard({
  title,
  person,
  update,
  onRemove,
  showRemove,
  roleOptions,
  showPtRoles = false,
  showContribution = false,
  shareValue,
  onRoleToggle
}: {
  title: string;
  person: PersonRow;
  update: (key: keyof PersonRow, value: any) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  roleOptions?: string[];
  showPtRoles?: boolean;
  showContribution?: boolean;
  shareValue?: string;
  onRoleToggle?: (role: 'shareholder' | 'manager', checked: boolean) => void;
}) {
  return (
    <section className="border-t border-slate-200 py-5 first:border-t-0 first:pt-1">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {showRemove && onRemove && <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700" onClick={onRemove}>Hapus</button>}
      </div>
      {showPtRoles && (
        <div className="mb-4 flex flex-wrap gap-3">
          {([['shareholder', 'Pemegang saham'], ['manager', 'Pengurus']] as const).map(([role, label]) => (
            <label key={role} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={(person.roles || []).includes(role)} onChange={event => onRoleToggle?.(role, event.target.checked)} className="h-4 w-4 accent-[#1e61c3]" />{label}
            </label>
          ))}
        </div>
      )}
      <IdentityFields person={person} update={update} title={title.toLowerCase()} />
      {showPtRoles && (person.roles || []).includes('shareholder') && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <InputField label="Jumlah lembar saham" value={person.shareCount || ''} onChange={value => update('shareCount', value)} type="number" inputMode="numeric" required placeholder="Isi jumlah lembar" />
          <div className="self-end rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">Nilai saham orang ini: {shareValue || 'Rp 0'}</div>
        </div>
      )}
      {showPtRoles && (person.roles || []).includes('manager') && (
        <div className="mt-4 max-w-md"><SelectField label="Jabatan pengurus" value={person.position || ''} onChange={value => update('position', value)} options={['Direktur', 'Direktur Utama', 'Komisaris', 'Komisaris Utama']} required /></div>
      )}
      {roleOptions && <div className="mt-4 max-w-md"><SelectField label="Jabatan" value={person.position || ''} onChange={value => update('position', value)} options={roleOptions} required /></div>}
      {showContribution && <div className="mt-4 max-w-md"><InputField label="Kontribusi sekutu (Rp)" value={person.contribution || ''} onChange={value => update('contribution', value.replace(/\D/g, ''))} onBlur={() => update('contribution', person.contribution ? formatRupiah(parseRupiah(person.contribution)) : '')} inputMode="numeric" placeholder="Contoh: 2.000.000" /></div>}
    </section>
  );
}

function cleanPerson(person: PersonRow): PublicFormPerson {
  return {
    id: person.id,
    name: person.name.trim(),
    email: person.email?.trim() || '',
    phone: person.phone?.trim() || '',
    roles: person.roles || [],
    position: person.position || '',
    shareCount: person.shareCount || '',
    contribution: person.contribution || ''
  };
}

export const PublicBusinessForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [entityType, setEntityType] = useState<PublicFormEntity>('individual');
  const [serviceId, setServiceId] = useState(PUBLIC_FORM_SERVICES.individual[0].id);
  const [applicant, setApplicant] = useState({ name: '', email: '', phone: '', role: 'Pendiri / pemilik' });
  const [business, setBusiness] = useState({ name: '', nameAlternatives: ['', '', ''], domicile: '', address: '', activityAddress: '', activities: [''] });
  const [capital, setCapital] = useState({ basic: '', paid: '', nominal: '' });
  const [founder, setFounder] = useState<PersonRow>(makePerson());
  const [people, setPeople] = useState<PersonRow[]>([
    makePerson({ roles: ['shareholder', 'manager'], position: 'Direktur' }),
    makePerson({ roles: ['shareholder', 'manager'], position: 'Komisaris' })
  ]);
  const [partners, setPartners] = useState<PersonRow[]>([
    makePerson({ position: 'Sekutu aktif' }),
    makePerson({ position: 'Sekutu pasif' })
  ]);
  const [foundation, setFoundation] = useState<FoundationState>({
    pembina: [makePerson({ position: 'Ketua Pembina' })],
    pengurus: [makePerson({ position: 'Ketua Umum' })],
    pengawas: [makePerson({ position: 'Ketua Pengawas' })]
  });
  const [purpose, setPurpose] = useState('');
  const [foundationActivities, setFoundationActivities] = useState('');
  const [initialAssets, setInitialAssets] = useState('');
  const [businessCapital, setBusinessCapital] = useState('');
  const [investment, setInvestment] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');

  const services = PUBLIC_FORM_SERVICES[entityType];
  const shareholders = people.filter(person => (person.roles || []).includes('shareholder'));
  const nominal = parseRupiah(capital.nominal);
  const placed = shareholders.reduce((sum, person) => sum + parseRupiah(person.shareCount) * nominal, 0);
  const capitalError = entityType === 'pt' ? getPtCapitalError(capital, people) : null;
  const activeService = services.find(service => service.id === serviceId) || services[0];
  const selectedEntityName = PUBLIC_FORM_ENTITIES[entityType];

  const documentOwners = useMemo(() => {
    if (entityType === 'individual' || entityType === 'ptp') return [{ key: 'founder', person: founder }];
    if (entityType === 'pt') return people.map(person => ({ key: `pt-${person.id}`, person }));
    if (entityType === 'cv') return partners.map(person => ({ key: `cv-${person.id}`, person }));
    return (['pembina', 'pengurus', 'pengawas'] as const).flatMap(organ =>
      foundation[organ].map(person => ({ key: `${organ}-${person.id}`, person }))
    );
  }, [entityType, founder, people, partners, foundation]);

  const updateApplicant = (key: keyof typeof applicant, value: string) => setApplicant(current => ({ ...current, [key]: value }));
  const updateBusiness = (key: keyof typeof business, value: any) => setBusiness(current => ({ ...current, [key]: value }));
  const updatePerson = (setter: React.Dispatch<React.SetStateAction<PersonRow[]>>, index: number, key: keyof PersonRow, value: any) => {
    setter(current => current.map((person, itemIndex) => itemIndex === index ? { ...person, [key]: value } : person));
  };
  const updateFoundationPerson = (organ: keyof FoundationState, index: number, key: keyof PersonRow, value: any) => {
    setFoundation(current => ({ ...current, [organ]: current[organ].map((person, itemIndex) => itemIndex === index ? { ...person, [key]: value } : person) }));
  };
  const updatePersonRole = (index: number, role: 'shareholder' | 'manager', checked: boolean) => {
    setPeople(current => current.map((person, itemIndex) => {
      if (itemIndex !== index) return person;
      const roles = new Set(person.roles || []);
      if (checked) roles.add(role); else roles.delete(role);
      return { ...person, roles: [...roles] };
    }));
  };

  const setMoney = (setter: (value: string) => void, value: string) => setter(value.replace(/\D/g, ''));
  const formatMoneyOnBlur = (setter: (value: string) => void, value: string) => setter(value ? formatRupiah(parseRupiah(value)) : '');

  const makePayload = (): PublicFormPayload => ({
    applicant: { ...applicant, name: applicant.name.trim(), email: applicant.email.trim(), phone: applicant.phone.trim() },
    entityType,
    serviceId,
    business: {
      ...business,
      name: business.name.trim(),
      nameAlternatives: business.nameAlternatives.map(name => name.trim()),
      domicile: business.domicile.trim(),
      address: business.address.trim(),
      activityAddress: business.activityAddress.trim(),
      activities: business.activities.map(activity => activity.trim()).filter(Boolean)
    },
    capital: entityType === 'pt' ? { ...capital } : undefined,
    businessCapital: entityType === 'ptp' ? businessCapital : undefined,
    investment: entityType === 'individual' ? investment : undefined,
    purpose: entityType === 'foundation' ? purpose.trim() : undefined,
    foundationActivities: entityType === 'foundation' ? foundationActivities.trim() : undefined,
    initialAssets: entityType === 'foundation' ? initialAssets : undefined,
    founder: entityType === 'individual' || entityType === 'ptp' ? cleanPerson(founder) : undefined,
    people: entityType === 'pt' ? people.map(cleanPerson) : undefined,
    partners: entityType === 'cv' ? partners.map(cleanPerson) : undefined,
    foundation: entityType === 'foundation' ? {
      pembina: foundation.pembina.map(cleanPerson),
      pengurus: foundation.pengurus.map(cleanPerson),
      pengawas: foundation.pengawas.map(cleanPerson)
    } : undefined,
    consent,
    website: honeypot,
  });

  const validateClientForm = (payload: PublicFormPayload): string[] => {
    const errors = validatePublicFormPayload(payload);
    if (entityType === 'ptp' && !business.name.trim()) errors.push('Nama PT Perorangan wajib diisi.');
    if (entityType === 'cv' && !business.name.trim()) errors.push('Nama CV wajib diisi.');
    if (entityType === 'foundation' && !business.name.trim()) errors.push('Nama Yayasan wajib diisi.');
    if (entityType === 'foundation' && !initialAssets) errors.push('Kekayaan awal yang dipisahkan wajib diisi.');
    if (entityType === 'pt' && capitalError) errors.push(capitalError);
    if (documentOwners.length > 30) errors.push('Jumlah orang yang dapat dikirim maksimal 30.');
    if (documentOwners.some(owner => !owner.person.name.trim())) errors.push('Lengkapi nama setiap pemegang saham, sekutu, atau organ Yayasan.');
    if (documentOwners.some(owner => !owner.person.ktpFile)) errors.push('Unggah KTP untuk setiap orang yang tercantum dalam formulir.');
    if (documentOwners.some(owner => !owner.person.npwpFile)) errors.push('Unggah NPWP untuk setiap orang yang tercantum dalam formulir.');
    const files = documentOwners.flatMap(owner => [owner.person.ktpFile, owner.person.npwpFile]).filter(Boolean) as File[];
    if (files.length > 60) errors.push('Jumlah dokumen yang dapat diunggah maksimal 60 file.');
    if (files.some(file => file.size > MAX_FILE_SIZE)) errors.push('Ukuran setiap dokumen maksimal 5 MB.');
    if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) errors.push('Ukuran total dokumen maksimal 20 MB.');
    if (entityType === 'cv' && partners.some(person => !person.contribution)) errors.push('Isi kontribusi setiap sekutu CV.');
    if (entityType === 'pt' && people.some(person => (person.roles || []).includes('manager') && !person.position)) errors.push('Pilih jabatan untuk setiap pengurus.');
    return [...new Set(errors)];
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    const payload = makePayload();
    const validation = validateClientForm(payload);
    if (validation.length) {
      setErrorMessage(validation[0]);
      if (entityType === 'pt' && capitalError) document.getElementById('form-capital-validation')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const formData = new FormData();
    const documents: NonNullable<PublicFormPayload['documents']> = [];
    let fieldIndex = 0;
    documentOwners.forEach(({ key, person }) => {
      for (const kind of ['KTP', 'NPWP'] as const) {
        const file = kind === 'KTP' ? person.ktpFile : person.npwpFile;
        if (!file) continue;
        documents.push({ ownerKey: key, ownerName: person.name.trim(), kind, fieldIndex });
        formData.append(`document_${fieldIndex}`, file, file.name);
        fieldIndex += 1;
      }
    });
    payload.documents = documents;
    formData.append('payload', JSON.stringify(payload));

    try {
      setSubmitting(true);
      const response = await fetch('/api/public/form-submissions', { method: 'POST', body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Pengajuan gagal dikirim.');
      setReferenceNo(String(data.referenceNo || ''));
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* Ignore scroll errors */ }
    } catch (error: any) {
      setErrorMessage(error?.message || 'Terjadi kendala saat mengirim formulir.');
    } finally {
      setSubmitting(false);
    }
  };

  const addPerson = () => setPeople(current => current.length >= 20 ? current : [...current, makePerson()]);
  const addPartner = () => setPartners(current => current.length >= 20 ? current : [...current, makePerson()]);
  const addFoundationPerson = (organ: keyof FoundationState, firstPosition: string) => setFoundation(current => ({
    ...current,
    [organ]: current[organ].length >= 20 ? current[organ] : [...current[organ], makePerson({ position: firstPosition })]
  }));
  const removeFoundationPerson = (organ: keyof FoundationState, index: number) => setFoundation(current => ({
    ...current,
    [organ]: current[organ].length <= 1 ? current[organ] : current[organ].filter((_, itemIndex) => itemIndex !== index)
  }));

  if (referenceNo) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <header className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#1e61c3] font-black text-white">NP</div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Notaris Putri · Formulir Publik</p><p className="font-semibold text-slate-900">Layanan legalitas usaha</p></div>
          </header>
          <section className={`${cardClass} py-10 text-center sm:py-14`}>
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={34} /></div>
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-emerald-700">Pengajuan diterima</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Terima kasih, {applicant.name.trim()}.</h1>
            <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-slate-600">Data dan dokumen Anda sudah tersimpan. Tim kami akan menghubungi Anda untuk memeriksa kebutuhan layanan.</p>
            <div className="mx-auto mt-7 max-w-md rounded-2xl bg-slate-50 p-5 text-left">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><FileText size={16} /> Nomor pengajuan</div>
              <p className="mt-1 font-mono text-xl font-bold text-slate-900">{referenceNo}</p>
              <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Bentuk usaha</dt><dd className="text-right font-semibold text-slate-800">{selectedEntityName}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Layanan</dt><dd className="text-right font-semibold text-slate-800">{activeService.name}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Nama usaha</dt><dd className="text-right font-semibold text-slate-800">{entityType === 'pt' ? business.nameAlternatives[0] : business.name || selectedEntityName}</dd></div>
              </dl>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500"><ShieldCheck size={16} /> KTP dan NPWP disimpan pada folder pengajuan yang terbatas.</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 text-slate-800 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#1e61c3] font-black text-white shadow-sm">NP</div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Notaris Putri · Formulir Publik</p><p className="font-semibold text-slate-900">Layanan legalitas usaha</p></div>
          </div>
          <span className="hidden text-sm font-semibold text-slate-500 sm:block">Formulir publik</span>
        </header>

        <main className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-br from-white to-blue-50/60 px-5 py-7 sm:px-9 sm:py-9">
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-[#1e61c3]">Layanan legalitas / Formulir publik</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Ajukan layanan badan usaha</h1>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600">Lengkapi informasi awal. Tim kami akan memeriksa kebutuhan dan dokumen sebelum proses dimulai.</p>
            <div className="mt-7 grid max-w-lg grid-cols-2 gap-3" aria-label="Tahapan formulir">
              {[['1', 'Pilih layanan'], ['2', 'Data usaha']].map(([number, label], index) => (
                <div key={number} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${step === index + 1 ? 'bg-[#1e61c3] text-white' : step > index + 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-white text-slate-500'}`}>
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs ${step === index + 1 ? 'bg-white/20' : step > index + 1 ? 'bg-emerald-100' : 'bg-slate-100'}`}>{step > index + 1 ? '✓' : number}</span>{label}
                </div>
              ))}
            </div>
          </div>

          {step === 1 ? (
            <section className="px-5 py-7 sm:px-9 sm:py-9">
              <div className="mb-6"><h2 className="text-xl font-bold text-slate-900">Pilih bentuk badan usaha</h2><p className="mt-1 text-base text-slate-600">Pilih bentuk yang paling sesuai dengan kondisi usaha Anda.</p></div>
              <div className="max-w-xl">
                <SelectField
                  label="Bentuk badan usaha"
                  value={entityType}
                  onChange={value => {
                    const selected = value as PublicFormEntity;
                    setEntityType(selected);
                    setServiceId(PUBLIC_FORM_SERVICES[selected][0].id);
                  }}
                  options={Object.entries(PUBLIC_FORM_ENTITIES).map(([key, name]) => `${key}|${name}`)}
                  required
                />
                <span className="mt-1.5 block text-sm text-slate-500">{Object.entries(PUBLIC_FORM_ENTITIES).find(([key]) => key === entityType)?.[1]} dipilih.</span>
              </div>
              <div className="mt-8">
                <h3 className="text-base font-bold text-slate-900">Layanan yang dibutuhkan</h3>
                <p className="mt-1 text-base text-slate-600">Pilihan menyesuaikan bentuk badan usaha.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {services.map(service => (
                    <label key={service.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${serviceId === service.id ? 'border-[#1e61c3] bg-blue-50/70 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}>
                      <input className="mt-1 h-4 w-4 accent-[#1e61c3]" type="radio" name="service" value={service.id} checked={serviceId === service.id} onChange={() => setServiceId(service.id)} />
                      <span><span className="block text-base font-bold text-slate-900">{service.name}</span><span className="mt-1 block text-sm text-slate-600">{service.note}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-8 flex justify-end border-t border-slate-200 pt-5">
                <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#1e61c3] px-5 font-bold text-white shadow-sm transition hover:bg-blue-700">Lanjut ke data usaha <ArrowRight size={17} /></button>
              </div>
            </section>
          ) : (
            <form onSubmit={submitForm} className="space-y-6 px-5 py-7 sm:px-9 sm:py-9">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <div><span className="font-bold text-slate-900">{selectedEntityName}</span><span className="mx-2 text-slate-400">·</span><span className="text-slate-600">{activeService.name}</span></div>
                <button type="button" className="font-semibold text-[#1e61c3] hover:underline" onClick={() => setStep(1)}>Ubah pilihan</button>
              </div>

              <section className={cardClass}>
                <div className="mb-5"><h2 className="text-xl font-bold text-slate-900">Data pemohon</h2><p className="mt-1 text-base text-slate-600">Kontak ini akan digunakan untuk klarifikasi permohonan.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField label="Nama lengkap" value={applicant.name} onChange={value => updateApplicant('name', value)} required placeholder="Sesuai identitas" />
                  <InputField label="Nomor WhatsApp" value={applicant.phone} onChange={value => updateApplicant('phone', value)} required type="tel" placeholder="+62" />
                  <InputField label="Email" value={applicant.email} onChange={value => updateApplicant('email', value)} required type="email" placeholder="nama@email.com" />
                  <SelectField label="Peran Anda" value={applicant.role} onChange={value => updateApplicant('role', value)} options={['Pendiri / pemilik', 'Pengurus', 'Kuasa pemohon']} required />
                </div>
              </section>

              <section className={cardClass}>
                <div className="mb-5"><h2 className="text-xl font-bold text-slate-900">Data badan usaha</h2><p className="mt-1 text-base text-slate-600">Alamat kedudukan dan lokasi kegiatan dapat berbeda.</p></div>
                {entityType === 'pt' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {business.nameAlternatives.map((name, index) => (
                      <InputField key={index} label={`Alternatif nama PT ${index + 1}`} value={name} onChange={value => updateBusiness('nameAlternatives', business.nameAlternatives.map((current, i) => i === index ? value : current))} required={index === 0} placeholder={index === 0 ? 'Nama pilihan utama' : 'Nama alternatif'} />
                    ))}
                    <InputField label="Kedudukan (kabupaten / kota)" value={business.domicile} onChange={value => updateBusiness('domicile', value)} required placeholder="Contoh: Kota Bekasi" />
                  </div>
                ) : entityType !== 'individual' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label={entityType === 'ptp' ? 'Nama PT Perorangan' : entityType === 'cv' ? 'Nama CV' : 'Nama Yayasan'} value={business.name} onChange={value => updateBusiness('name', value)} required placeholder="Masukkan nama yang diusulkan" />
                    <InputField label="Kedudukan (kabupaten / kota)" value={business.domicile} onChange={value => updateBusiness('domicile', value)} required placeholder="Contoh: Kota Bekasi" />
                  </div>
                ) : (
                  <InputField label="Nama usaha (bila ada)" value={business.name} onChange={value => updateBusiness('name', value)} placeholder="Contoh: Toko Sinar Jaya" className="mb-4" />
                )}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextAreaField label={entityType === 'individual' ? 'Alamat lokasi usaha' : 'Alamat lengkap'} value={business.address} onChange={value => updateBusiness('address', value)} required placeholder="Jalan, nomor, RT/RW, kelurahan, kecamatan, kota" />
                  <TextAreaField label="Alamat lokasi kegiatan" value={business.activityAddress} onChange={value => updateBusiness('activityAddress', value)} placeholder="Isi bila berbeda dari alamat di atas" />
                </div>
                <div className="mt-6">
                  <div className="mb-3 flex items-start justify-between gap-4"><div><h3 className="text-base font-bold text-slate-900">Kegiatan usaha / KBLI</h3><p className="mt-1 text-sm text-slate-600">Uraikan kegiatan yang dijalankan atau masukkan kode KBLI.</p></div><button type="button" className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => updateBusiness('activities', [...business.activities, ''])}>+ Tambah kegiatan</button></div>
                  <div className="space-y-3">{business.activities.map((activity, index) => (
                    <div key={index} className="flex gap-2"><input className={fieldClass} value={activity} onChange={event => updateBusiness('activities', business.activities.map((current, i) => i === index ? event.target.value : current))} required={index === 0} placeholder={index === 0 ? 'Kegiatan usaha utama / KBLI' : 'Kegiatan usaha tambahan / KBLI'} />{index > 0 && <button type="button" className="rounded-lg px-3 text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label="Hapus kegiatan" onClick={() => updateBusiness('activities', business.activities.filter((_, i) => i !== index))}><X size={18} /></button>}</div>
                  ))}</div>
                </div>
              </section>

              {entityType === 'pt' && (
                <section className={cardClass}>
                  <div className="mb-5"><h2 className="text-xl font-bold text-slate-900">Modal dan saham</h2><p className="mt-1 text-base text-slate-600">Modal ditempatkan dihitung otomatis dari jumlah lembar saham tiap orang × nominal per lembar. Modal disetor harus sama dengan modal ditempatkan.</p></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label="Modal dasar (Rp)" value={capital.basic} onChange={value => setMoney(next => setCapital(current => ({ ...current, basic: next })), value)} onBlur={() => formatMoneyOnBlur(next => setCapital(current => ({ ...current, basic: next })), capital.basic)} required inputMode="numeric" placeholder="Contoh: 2.000.000" />
                    <InputField label="Modal ditempatkan otomatis (Rp)" value={placed ? formatRupiah(placed) : ''} readOnly placeholder="Terisi dari alokasi saham" hint={`${formatRupiah(shareholders.reduce((sum, person) => sum + parseRupiah(person.shareCount), 0))} lembar saham dialokasikan`} />
                    <InputField label="Modal disetor (Rp)" value={capital.paid} onChange={value => setMoney(next => setCapital(current => ({ ...current, paid: next })), value)} onBlur={() => formatMoneyOnBlur(next => setCapital(current => ({ ...current, paid: next })), capital.paid)} required inputMode="numeric" placeholder="Contoh: 2.000.000" />
                    <InputField label="Nilai nominal per lembar (Rp)" value={capital.nominal} onChange={value => setMoney(next => setCapital(current => ({ ...current, nominal: next })), value)} onBlur={() => formatMoneyOnBlur(next => setCapital(current => ({ ...current, nominal: next })), capital.nominal)} required inputMode="numeric" placeholder="Contoh: 1.000.000" />
                  </div>
                  <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">Ketentuan umum: modal ditempatkan dan disetor penuh paling sedikit 25% dari modal dasar. Persyaratan modal minimum khusus dapat berlaku untuk bidang usaha tertentu.</div>
                  <div id="form-capital-validation" className={`mt-3 rounded-xl px-4 py-3 text-sm font-semibold ${capitalError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`} aria-live="polite">
                    {capitalError || 'Modal ditempatkan cocok dengan alokasi saham. Modal disetor sama dan batas minimum terpenuhi.'}
                    <p className="mt-1 font-normal">Alokasi saat ini: {formatRupiah(shareholders.reduce((sum, person) => sum + parseRupiah(person.shareCount), 0))} lembar · Rp {formatRupiah(placed)}</p>
                  </div>
                  <div className="mt-6 flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">Pemegang saham dan pengurus</h3><p className="mt-1 text-sm text-slate-600">PT dimulai dengan dua pemegang saham. Isi setiap orang sekali meskipun memiliki beberapa peran.</p></div><button type="button" onClick={addPerson} disabled={people.length >= 20} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">+ Tambah orang</button></div>
                  {people.map((person, index) => (
                    <PersonCard key={person.id} title={`Orang ${index + 1}`} person={person} update={(key, value) => updatePerson(setPeople, index, key, value)} showRemove={index > 1} onRemove={() => setPeople(current => current.filter((_, itemIndex) => itemIndex !== index))} showPtRoles onRoleToggle={(role, checked) => updatePersonRole(index, role, checked)} shareValue={`Rp ${formatRupiah(parseRupiah(person.shareCount) * nominal)}`} />
                  ))}
                </section>
              )}

              {(entityType === 'individual' || entityType === 'ptp') && (
                <section className={cardClass}>
                  <div className="mb-5"><h2 className="text-xl font-bold text-slate-900">{entityType === 'individual' ? 'Data pemilik usaha' : 'Data pendiri / pemilik'}</h2><p className="mt-1 text-base text-slate-600">Unggah KTP pemilik; NPWP dapat disertakan bila tersedia.</p></div>
                  <PersonCard title={entityType === 'individual' ? 'Pemilik usaha' : 'Pendiri'} person={founder} update={(key, value) => setFounder(current => ({ ...current, [key]: value }))} />
                  {entityType === 'ptp' && <div className="mt-5 max-w-md"><InputField label="Perkiraan modal usaha (Rp)" value={businessCapital} onChange={value => setMoney(setBusinessCapital, value)} onBlur={() => formatMoneyOnBlur(setBusinessCapital, businessCapital)} inputMode="numeric" placeholder="Contoh: 2.000.000" /></div>}
                  {entityType === 'individual' && <div className="mt-5 max-w-md"><InputField label="Perkiraan investasi (Rp)" value={investment} onChange={value => setMoney(setInvestment, value)} onBlur={() => formatMoneyOnBlur(setInvestment, investment)} inputMode="numeric" placeholder="Contoh: 2.000.000" /></div>}
                </section>
              )}

              {entityType === 'cv' && (
                <section className={cardClass}>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Data sekutu</h2><p className="mt-1 text-base text-slate-600">CV memerlukan sekutu aktif dan sekutu pasif.</p></div><button type="button" onClick={addPartner} disabled={partners.length >= 20} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">+ Tambah sekutu</button></div>
                  {partners.map((person, index) => <PersonCard key={person.id} title={`Sekutu ${index + 1}`} person={person} update={(key, value) => updatePerson(setPartners, index, key, value)} showRemove={index > 1} onRemove={() => setPartners(current => current.length > 2 ? current.filter((_, itemIndex) => itemIndex !== index) : current)} roleOptions={['Sekutu aktif', 'Sekutu pasif']} showContribution />)}
                </section>
              )}

              {entityType === 'foundation' && (
                <section className={cardClass}>
                  <div className="mb-5"><h2 className="text-xl font-bold text-slate-900">Tujuan dan kekayaan awal Yayasan</h2><p className="mt-1 text-base text-slate-600">Yayasan tidak memiliki pemegang saham.</p></div>
                  <div className="grid gap-4">
                    <TextAreaField label="Maksud dan tujuan" value={purpose} onChange={setPurpose} required placeholder="Sosial, keagamaan, kemanusiaan, atau sesuai kebutuhan" />
                    <TextAreaField label="Kegiatan untuk mencapai tujuan" value={foundationActivities} onChange={setFoundationActivities} placeholder="Uraikan kegiatan utama" />
                    <InputField label="Kekayaan awal yang dipisahkan (Rp)" value={initialAssets} onChange={value => setMoney(setInitialAssets, value)} onBlur={() => formatMoneyOnBlur(setInitialAssets, initialAssets)} required inputMode="numeric" placeholder="Contoh: 2.000.000" />
                  </div>
                  <div className="mt-7"><h2 className="text-xl font-bold text-slate-900">Organ Yayasan</h2><p className="mt-1 text-base text-slate-600">Data Pembina, Pengurus, dan Pengawas dicatat terpisah.</p></div>
                  {([
                    ['pembina', 'Pembina', ['Ketua Pembina', 'Anggota Pembina'], 'Ketua Pembina'],
                    ['pengurus', 'Pengurus', ['Ketua Umum', 'Ketua 1', 'Ketua 2', 'Wakil Ketua 1', 'Wakil Ketua 2', 'Sekretaris Umum', 'Sekretaris', 'Bendahara Umum', 'Bendahara'], 'Ketua Umum'],
                    ['pengawas', 'Pengawas', ['Ketua Pengawas', 'Anggota Pengawas'], 'Ketua Pengawas']
                  ] as const).map(([organ, title, options, defaultRole]) => (
                    <div key={organ} className="mt-6">
                      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-600">Isi nama, jabatan, KTP, dan NPWP masing-masing.</p></div><button type="button" onClick={() => addFoundationPerson(organ, defaultRole)} disabled={foundation[organ].length >= 20} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">+ Tambah {title}</button></div>
                      {foundation[organ].map((person, index) => <PersonCard key={person.id} title={`${title} ${index + 1}`} person={person} update={(key, value) => updateFoundationPerson(organ, index, key, value)} showRemove={index > 0} onRemove={() => removeFoundationPerson(organ, index)} roleOptions={[...options]} />)}
                    </div>
                  ))}
                </section>
              )}

              <section className={cardClass}>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
                  <input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#1e61c3]" />
                  <span>Saya menyatakan data yang diberikan benar dan setuju data serta dokumen digunakan untuk memproses permohonan layanan ini.</span>
                </label>
                <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label>Website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={event => setHoneypot(event.target.value)} /></label>
                </div>
                {errorMessage && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{errorMessage}</div>}
                <div className="mt-6 flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                  <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft size={17} /> Kembali</button>
                  <button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1e61c3] px-5 font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Menyimpan pengajuan…' : 'Kirim pengajuan'} <ArrowRight size={17} /></button>
                </div>
              </section>
              <p className="mx-auto flex max-w-3xl items-start justify-center gap-2 px-3 text-center text-sm leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 shrink-0" size={16} />KTP dan NPWP disimpan di Google Drive pada folder pengajuan yang terbatas. Mohon unggah dokumen yang jelas; maksimal 5 MB per file dan 20 MB total.</p>
            </form>
          )}
        </main>
        <p className="py-5 text-center text-sm text-slate-500">Notaris Putri · Layanan legalitas usaha</p>
      </div>
    </div>
  );
};

export default PublicBusinessForm;
