import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Eye, FileText, RefreshCw, Search, X } from 'lucide-react';
import { getAuthHeaders, getApiUrl } from '../../lib/api';
import { formatRupiah, parseRupiah, PUBLIC_FORM_ENTITIES, PUBLIC_FORM_SERVICES, type PublicFormEntity } from '../../domain/publicForm';

interface Submission {
  id: string;
  referenceNo: string;
  status: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  entityType: PublicFormEntity;
  serviceId: string;
  businessNameFirst: string;
  payload: any;
  documents: Array<{ kind: string; ownerKey: string; ownerName: string; fileName: string; fileId: string; webViewLink: string }>;
  driveFolderUrl: string;
  createdAt: string;
}

const labelClass = 'text-sm font-medium text-slate-500';
const valueClass = 'mt-1 break-words text-sm font-semibold text-slate-800';

function DetailValue({ label, value }: { label: string; value: unknown }) {
  const text = value === undefined || value === null || value === '' ? '—' : String(value);
  return <div><dt className={labelClass}>{label}</dt><dd className={valueClass}>{text}</dd></div>;
}

function PersonDetail({ title, person, ownerKey, documents }: { title: string; person: any; ownerKey: string; documents: Submission['documents'] }) {
  const docs = documents.filter(document => document.ownerKey === ownerKey);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h4 className="font-bold text-slate-900">{title}{person?.name ? ` · ${person.name}` : ''}</h4>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <DetailValue label="Email" value={person?.email} />
        <DetailValue label="Nomor HP" value={person?.phone} />
        {person?.position && <DetailValue label="Jabatan / peran" value={person.position} />}
        {person?.roles?.includes('shareholder') && <DetailValue label="Lembar saham" value={person.shareCount} />}
        {person?.contribution && <DetailValue label="Kontribusi (Rp)" value={person.contribution} />}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        {docs.map((document, index) => (
          document.webViewLink ? (
            <a key={`${document.fileId}-${index}`} href={document.webViewLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-[#1e61c3] hover:bg-blue-50">
              <FileText size={15} /> {document.kind} · Buka di Drive <ExternalLink size={13} />
            </a>
          ) : <span key={index} className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">{document.kind} tersimpan</span>
        ))}
      </div>
    </div>
  );
}

function SubmissionDetails({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const payload = submission.payload || {};
  const business = payload.business || {};
  const service = (PUBLIC_FORM_SERVICES[submission.entityType] || []).find(item => item.id === submission.serviceId)?.name || submission.serviceId;
  const capital = payload.capital || {};

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="form-submission-title">
      <section className="max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
          <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{submission.referenceNo}</p><h2 id="form-submission-title" className="mt-1 text-xl font-bold text-slate-900">{submission.applicantName}</h2><p className="mt-1 text-sm text-slate-600">{PUBLIC_FORM_ENTITIES[submission.entityType]} · {service}</p></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Tutup detail"><X size={19} /></button>
        </header>
        <div className="max-h-[calc(95vh-76px)] space-y-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <section>
            <h3 className="mb-3 text-base font-bold text-slate-900">Pemohon dan layanan</h3>
            <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailValue label="Nama pemohon" value={payload.applicant?.name || submission.applicantName} />
              <DetailValue label="Email" value={payload.applicant?.email || submission.applicantEmail} />
              <DetailValue label="Nomor WhatsApp" value={payload.applicant?.phone || submission.applicantPhone} />
              <DetailValue label="Peran pemohon" value={payload.applicant?.role} />
              <DetailValue label="Bentuk usaha" value={PUBLIC_FORM_ENTITIES[submission.entityType]} />
              <DetailValue label="Layanan" value={service} />
            </dl>
          </section>

          <section>
            <h3 className="mb-3 text-base font-bold text-slate-900">Data badan usaha</h3>
            <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <DetailValue label={submission.entityType === 'pt' ? 'Nama PT pilihan pertama' : 'Nama badan usaha'} value={submission.businessNameFirst} />
              {Array.isArray(business.nameAlternatives) && business.nameAlternatives.slice(1).map((name: string, index: number) => <DetailValue key={index} label={`Alternatif nama ${index + 2}`} value={name} />)}
              <DetailValue label="Kedudukan" value={business.domicile} />
              <DetailValue label="Alamat" value={business.address} />
              <DetailValue label="Alamat kegiatan" value={business.activityAddress} />
              <DetailValue label="Kegiatan / KBLI" value={(business.activities || []).filter(Boolean).join(' · ')} />
              {payload.purpose && <DetailValue label="Maksud dan tujuan Yayasan" value={payload.purpose} />}
              {payload.foundationActivities && <DetailValue label="Kegiatan Yayasan" value={payload.foundationActivities} />}
              {payload.initialAssets && <DetailValue label="Kekayaan awal (Rp)" value={payload.initialAssets} />}
              {payload.businessCapital && <DetailValue label="Modal usaha PT Perorangan (Rp)" value={payload.businessCapital} />}
              {payload.investment && <DetailValue label="Perkiraan investasi (Rp)" value={payload.investment} />}
            </dl>
          </section>

          {submission.entityType === 'pt' && (
            <section>
              <h3 className="mb-3 text-base font-bold text-slate-900">Modal dan saham</h3>
              <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailValue label="Modal dasar (Rp)" value={capital.basic} />
                <DetailValue label="Modal ditempatkan (Rp)" value={formatRupiah((payload.people || []).filter((person: any) => person.roles?.includes('shareholder')).reduce((sum: number, person: any) => sum + parseRupiah(person.shareCount) * parseRupiah(capital.nominal), 0))} />
                <DetailValue label="Modal disetor (Rp)" value={capital.paid} />
                <DetailValue label="Nominal per lembar (Rp)" value={capital.nominal} />
              </dl>
            </section>
          )}

          {(submission.entityType === 'individual' || submission.entityType === 'ptp') && payload.founder && (
            <section><h3 className="mb-3 text-base font-bold text-slate-900">Pendiri / pemilik</h3><PersonDetail title="Pendiri / pemilik" person={payload.founder} ownerKey="founder" documents={submission.documents} /></section>
          )}
          {submission.entityType === 'pt' && (
            <section><h3 className="mb-3 text-base font-bold text-slate-900">Pemegang saham dan pengurus</h3><div className="space-y-3">{(payload.people || []).map((person: any) => <PersonDetail key={person.id} title={(person.roles || []).map((role: string) => role === 'shareholder' ? 'Pemegang saham' : 'Pengurus').join(' · ') || 'Orang'} person={person} ownerKey={`pt-${person.id}`} documents={submission.documents} />)}</div></section>
          )}
          {submission.entityType === 'cv' && (
            <section><h3 className="mb-3 text-base font-bold text-slate-900">Data sekutu</h3><div className="space-y-3">{(payload.partners || []).map((person: any) => <PersonDetail key={person.id} title={person.position || 'Sekutu'} person={person} ownerKey={`cv-${person.id}`} documents={submission.documents} />)}</div></section>
          )}
          {submission.entityType === 'foundation' && (
            <section><h3 className="mb-3 text-base font-bold text-slate-900">Organ Yayasan</h3><div className="space-y-5">{(['pembina', 'pengurus', 'pengawas'] as const).map(organ => <div key={organ}><h4 className="mb-2 text-sm font-bold capitalize text-slate-700">{organ}</h4><div className="space-y-3">{(payload.foundation?.[organ] || []).map((person: any) => <PersonDetail key={person.id} title={person.position || organ} person={person} ownerKey={`${organ}-${person.id}`} documents={submission.documents} />)}</div></div>)}</div></section>
          )}

          <section className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <div><p className="text-sm text-slate-500">Diterima {new Date(submission.createdAt).toLocaleString('id-ID')}</p><p className="mt-1 text-sm font-semibold text-slate-800">Status: {submission.status === 'baru' ? 'Baru' : submission.status}</p></div>
            {submission.driveFolderUrl && <a href={submission.driveFolderUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#1e61c3] px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">Buka folder Google Drive <ExternalLink size={15} /></a>}
          </section>
        </div>
      </section>
    </div>
  );
}

export const FormSubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(getApiUrl(`/api/form-submissions?${params}`), { headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'Gagal memuat hasil formulir.');
      setSubmissions(data.submissions || []);
      setTotal(Number(data.total || 0));
    } catch (caught: any) {
      setError(caught?.message || 'Gagal memuat hasil formulir.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void loadSubmissions(); }, [loadSubmissions]);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-bold uppercase tracking-wider text-[#1e61c3]">Data masuk</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Formulir</h1><p className="mt-1 text-base text-slate-600">Daftar hasil formulir publik dan dokumen yang diunggah pemohon.</p></div>
          <a href="/form" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-[#1e61c3]">Buka formulir publik <ExternalLink size={15} /></a>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-600">{total} pengajuan</p>
            <form className="flex w-full gap-2 sm:max-w-xl" onSubmit={event => { event.preventDefault(); setSearch(searchInput); }}>
              <label className="relative min-w-0 flex-1"><span className="sr-only">Cari pemohon, nama badan usaha, atau nomor pengajuan</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Cari pemohon, nama PT, atau nomor pengajuan" /></label>
              <button className="h-11 rounded-xl bg-[#1e61c3] px-4 text-sm font-bold text-white hover:bg-blue-700" type="submit">Cari</button>
              <button className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" type="button" title="Muat ulang" onClick={() => void loadSubmissions()}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
            </form>
          </div>
          {error && <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Pengajuan</th><th className="px-5 py-3">Pemohon</th><th className="px-5 py-3">Bentuk usaha</th><th className="px-5 py-3">Layanan</th><th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Detail</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && submissions.map(submission => (
                  <tr key={submission.id} className="transition hover:bg-blue-50/40">
                    <td className="px-5 py-4"><p className="font-mono text-xs font-bold text-[#1e61c3]">{submission.referenceNo}</p><p className="mt-1 max-w-[230px] truncate font-semibold text-slate-900">{submission.businessNameFirst}</p></td>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-900">{submission.applicantName}</p><p className="mt-1 text-xs text-slate-500">{submission.applicantPhone}</p></td>
                    <td className="px-5 py-4 text-slate-700">{PUBLIC_FORM_ENTITIES[submission.entityType] || submission.entityType}</td>
                    <td className="px-5 py-4 text-slate-700">{(PUBLIC_FORM_SERVICES[submission.entityType] || []).find(service => service.id === submission.serviceId)?.name || submission.serviceId}</td>
                    <td className="px-5 py-4 text-slate-600">{new Date(submission.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold capitalize text-blue-800">{submission.status === 'baru' ? 'Baru' : submission.status}</span></td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelected(submission)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-[#1e61c3] hover:bg-blue-50"><Eye size={16} /> Lihat</button></td>
                  </tr>
                ))}
                {!loading && submissions.length === 0 && <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">Belum ada hasil formulir yang cocok.</td></tr>}
                {loading && <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500"><RefreshCw size={20} className="mx-auto mb-2 animate-spin" />Memuat hasil formulir…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {selected && <SubmissionDetails submission={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default FormSubmissionsPage;
