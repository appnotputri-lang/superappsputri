import React, { useState, useEffect } from 'react';
import { FormData } from './constants';
import { RegionSelects } from './components/RegionSelects';
import { ChevronDown, ChevronUp, Trash2, Plus, Save, Loader2, RefreshCw } from 'lucide-react';
import { formatNumber, parseNumber } from './lib/formatter';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { CompanyData } from '../types';
import { fetchLatestDeedNumbers } from './lib/deedUtils';
import { syncToUtama, generateRandomId } from './lib/syncUtama';

interface FormContentProps {
  data: FormData;
  onChange: (e: { target: { name: string; value: any } }, batchUpdates?: Record<string, any>) => void;
  integrated?: boolean;
  companyData?: CompanyData;
  transferId?: string;
}

export const Section = ({ title, defaultOpen = true, children }: { title: string, defaultOpen?: boolean, children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-slate-200/90 shadow-xs mb-4 rounded-lg overflow-hidden">
       <div 
         className="flex justify-between items-center px-4 py-2.5 cursor-pointer bg-slate-50/90 border-b border-slate-200 hover:bg-slate-100/80 transition-colors select-none"
         onClick={() => setIsOpen(!isOpen)}
       >
          <div className="flex items-center">
             <div className="w-1.5 h-4 bg-[#3b5998] mr-2.5 rounded-xs"></div>
             <h2 className="font-bold text-[#3b5998] text-[13px] uppercase tracking-wide">{title}</h2>
          </div>
          {isOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
       </div>
       {isOpen && (
         <div className="p-4 sm:p-5">
           {children}
         </div>
       )}
    </div>
  );
};

export const FieldRow = ({ label, children, required = false, className = "" }: { label: string, children: React.ReactNode, required?: boolean, className?: string }) => (
  <div className={`flex flex-col gap-1 font-sans ${className}`}>
    <label className="text-[12px] font-semibold text-slate-700 block">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div>{children}</div>
  </div>
);

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className={`w-full h-9 px-3 py-1.5 rounded border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-[13px] text-slate-800 transition-all ${className || ''}`} 
  />
);

export const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    {...props} 
    className={`w-full h-9 px-3 py-1.5 rounded border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-[13px] text-slate-800 transition-all ${className || ''}`}
  >
    {props.children}
  </select>
);

const AhuLabel = ({ label, required = false }: { label: string, required?: boolean }) => (
  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
    {label} {required && <span className="text-red-500">*</span>}
  </label>
);

const AhuInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className={`w-full h-9 px-3 py-1.5 rounded border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-[13px] text-slate-800 transition-all ${className}`} 
  />
);

export const TextArea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea 
    {...props} 
    className={`w-full px-3 py-2 rounded border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-[13px] text-slate-800 transition-all min-h-[80px] ${className || ''}`} 
  />
);

export const FormContent: React.FC<FormContentProps> = ({ data, onChange, integrated = false, companyData, transferId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingNumbers, setIsFetchingNumbers] = useState(false);

  useEffect(() => {
    if (integrated) {
      handleFetchLatestNumbers(data.tanggalAkta, true);
    }
  }, []);

  const handleFetchLatestNumbers = async (targetDate: string, auto = false) => {
    setIsFetchingNumbers(true);
    try {
      const numbers = await fetchLatestDeedNumbers(targetDate);
      
      // If auto-fetch, only fill if current values are default or empty
      if (auto) {
        if (numbers.nextDeedNumber && (data.nomorAkta === '' || data.nomorAkta === '05')) {
          onChange({ target: { name: 'nomorAkta', value: numbers.nextDeedNumber } });
        }
        if (numbers.nextOrderNumber && (data.nomorUrut === '' || data.nomorUrut === '1')) {
          onChange({ target: { name: 'nomorUrut', value: numbers.nextOrderNumber } });
        }
      } else {
        // Manual fetch: always update
        onChange({ target: { name: 'nomorAkta', value: numbers.nextDeedNumber } });
        onChange({ target: { name: 'nomorUrut', value: numbers.nextOrderNumber } });
      }
    } catch (error) {
      console.error("Error fetching latest numbers:", error);
      // Do NOT fall back to a hardcoded number here (auto or manual) — an
      // unfilled field is an obvious, visible problem; a silently-wrong
      // fallback number ('01'/'1300') is not, and risks duplicate deed
      // numbering. Always surface the failure so the notary knows the
      // suggested number was not actually verified against the database.
      alert("Gagal mengambil nomor akta/urut terbaru dari server. Silakan coba lagi (tombol refresh nomor) sebelum menyimpan — jangan lanjut menyimpan dengan nomor yang belum terverifikasi.");
    } finally {
      setIsFetchingNumbers(false);
    }
  };

  const simpanKeUtama = async () => {
    setIsSaving(true);
    try {
      // Re-fetch latest numbers just in case to ensure accuracy before save.
      // If this fails, we must NOT fall back to a fake number and save
      // anyway — abort the save and let the notary retry instead.
      let numbers;
      try {
        numbers = await fetchLatestDeedNumbers(data.tanggalAkta);
      } catch (numberError) {
        console.error("Error fetching latest numbers before save:", numberError);
        alert("Gagal memverifikasi nomor akta/urut terbaru ke server. Dokumen TIDAK disimpan agar nomor akta tidak salah/dobel. Silakan coba simpan lagi.");
        setIsSaving(false);
        return;
      }

      const generatedDeedNumber = numbers.nextDeedNumber;
      const generatedOrderNumber = numbers.nextOrderNumber;

      // Format appearers
      const appearers: any[] = [];

      // Find parties in companyData if available
      const activeTransfers = (companyData?.shareTransfersNew && companyData.shareTransfersNew.length > 0)
        ? companyData.shareTransfersNew
        : (companyData?.shareTransfers || []);
      const transfer = activeTransfers.find(t => t.id === transferId);
      const fromSh = companyData?.shareholders.find(s => (transfer?.fromShareholderId && s.id === transfer.fromShareholderId) || (transfer?.fromName && s.name && s.name.trim().toUpperCase() === transfer.fromName.trim().toUpperCase()));
      const toSh = companyData?.shareholders.find(s => (transfer?.toShareholderId && s.id === transfer.toShareholderId) || (transfer?.toName && s.name && s.name.trim().toUpperCase() === transfer.toName.trim().toUpperCase())) || companyData?.finalShareholders?.find(s => (transfer?.toShareholderId && s.id === transfer.toShareholderId) || (transfer?.toName && s.name && s.name.trim().toUpperCase() === transfer.toName.trim().toUpperCase()));

      // Appearer 1: Pihak Pertama
      const p1Grantors = [];
      const isP1SelfAndProxy = data.appearer1Role === 'SelfAndProxy' || data.pihak1StatusPersetujuan === 'Kuasa';
      if ((data.appearer1Role === 'Proxy' || isP1SelfAndProxy) && fromSh) {
        p1Grantors.push({ id: generateRandomId(), name: fromSh.name });
      }
      if (data.pihak1StatusPersetujuan === 'Kuasa' && data.suamiNama) {
        if (!p1Grantors.some(g => g.name === data.suamiNama)) {
          p1Grantors.push({ id: generateRandomId(), name: data.suamiNama });
        }
      }

      const p1Role = isP1SelfAndProxy ? 'SelfAndProxy' : data.appearer1Role;

      appearers.push({
        id: generateRandomId(),
        name: data.pihak1Nama,
        role: p1Role,
        bertindakSebagai: p1Role === 'SelfAndProxy' ? 'Diri Sendiri & Kuasa' : (p1Role === 'Proxy' ? 'Kuasa' : 'Diri Sendiri'),
        grantors: p1Grantors
      });

      // Appearer 2: Pihak Kedua
      const p2Grantors = [];
      if ((data.appearer2Role === 'Proxy' || data.appearer2Role === 'SelfAndProxy') && toSh) {
        p2Grantors.push({ id: generateRandomId(), name: toSh.name });
      }

      appearers.push({
        id: generateRandomId(),
        name: data.pihak2Nama,
        role: data.appearer2Role,
        grantors: p2Grantors
      });

      // Appearer 3: Spouse / Consent Provider / Proxy Grantor
      if (data.pihak1StatusPersetujuan === 'Suami' || data.pihak1StatusPersetujuan === 'Istri' || data.pihak1StatusPersetujuan === 'Kuasa') {
        if (data.suamiNama) {
          appearers.push({
            id: generateRandomId(),
            name: data.suamiNama,
            role: 'Self',
            grantors: []
          });
        }
      }

      const syncPayload = {
        orderNumber: generatedOrderNumber,
        deedNumber: generatedDeedNumber,
        clientName: data.namaPT,
        deedDate: data.tanggalAkta,
        deedTitle: data.judulAkta,
        appearers: appearers
      };

      await syncToUtama(syncPayload);
      
      // Update form numbers to reflect what was actually saved
      onChange({ target: { name: 'nomorAkta', value: generatedDeedNumber } });
      onChange({ target: { name: 'nomorUrut', value: generatedOrderNumber } });

      alert(`Data berhasil disimpan ke Buku Daftar Akta!\nNomor Akta: ${generatedDeedNumber}\nNomor Urut: ${generatedOrderNumber}`);
    } catch (error) {
      console.error("Error saving to deeds:", error);
      alert("Gagal menyimpan data: " + (error instanceof Error ? error.message : "Terjadi kesalahan"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocalChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | { target: { name: string; value: any } },
    batchUpdates?: Record<string, any>
  ) => {
    const { name, value } = e.target;
    let actualValue: any = value;
    
    if ('type' in e.target && e.target.type === 'checkbox') {
      actualValue = (e.target as HTMLInputElement).checked;
    }

    (onChange as any)(e, batchUpdates);

    // Sync logic for spouse address
    if (name === 'suamiAlamatSama' && actualValue === true) {
      const syncFields = {
        suamiAlamatJalan: data.pihak1AlamatJalan,
        suamiRT: data.pihak1RT,
        suamiRW: data.pihak1RW,
        suamiProvinsi: data.pihak1Provinsi,
        suamiKota: data.pihak1Kota,
        suamiKecamatan: data.pihak1Kecamatan,
        suamiKelurahan: data.pihak1Kelurahan,
      };
      (onChange as any)({ target: { name, value: actualValue } }, syncFields);
    }

    // Auto-update spouse address if sync is on and pihak1 address changes
    if (data.suamiAlamatSama) {
      const pihak1Fields = [
        'pihak1AlamatJalan', 'pihak1RT', 'pihak1RW', 
        'pihak1Provinsi', 'pihak1Kota', 'pihak1Kecamatan', 'pihak1Kelurahan'
      ];
      if (pihak1Fields.includes(name)) {
        const spouseFieldName = name.replace('pihak1', 'suami');
        onChange({ target: { name: spouseFieldName, value: actualValue } });
      }
    }
  };
  
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Remove formatting dots for state
    const cleanValue = parseNumber(value);
    // Only update if it's numeric
    if (cleanValue === "" || /^\d+$/.test(cleanValue)) {
      onChange({ target: { name, value: cleanValue } });
    }
  };

  const handlePerubahanChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newPerubahan = [...data.aktaPerubahan];
    newPerubahan[index] = { ...newPerubahan[index], [e.target.name]: e.target.value };
    onChange({ target: { name: 'aktaPerubahan', value: newPerubahan } });
  };

  const addPerubahan = () => {
    onChange({
      target: {
        name: 'aktaPerubahan',
        value: [...data.aktaPerubahan, {
          id: Date.now().toString(),
          tglRapat: '',
          nomorRapat: '',
          notaris: data.notarisPT,
          kedudukanNotaris: data.kedudukanNotarisPT,
          skPerubahan: '',
          tglSKPerubahan: '',
          jenisSK: 'SK'
        }]
      }
    });
  };

  const removePerubahan = (index: number) => {
    const newPerubahan = [...data.aktaPerubahan];
    newPerubahan.splice(index, 1);
    onChange({ target: { name: 'aktaPerubahan', value: newPerubahan } });
  };

  return (
    <div className="w-full">
      {integrated && (
        <div className="mb-4 p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
           <span className="font-semibold shrink-0">Info:</span>
           <span>Data Perseroan, Saham, Pihak Pertama dan Pihak Kedua sudah ditarik secara otomatis dari Draft Notulen. Silakan lengkapi data tambahan di bawah ini untuk pembuatan Draft Akta {(data.tipeAkta || 'Jual Beli').toUpperCase()}.</span>
        </div>
      )}

      {/* 0. TIPE AKTA */}
      {!integrated && (
        <div className="bg-blue-600 p-1 mb-6 rounded-md shadow-md">
        <div className="bg-white flex rounded-[4px] p-1">
          <button 
            onClick={() => onChange({ target: { name: 'tipeAkta', value: 'Hibah' } })}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-[3px] ${data.tipeAkta === 'Hibah' ? 'bg-blue-600 text-white shadow-inner' : 'bg-transparent text-blue-600 hover:bg-blue-50'}`}
          >
            HIBAH SAHAM
          </button>
          <button 
            onClick={() => onChange({ target: { name: 'tipeAkta', value: 'Jual Beli' } })}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all rounded-[3px] ${data.tipeAkta === 'Jual Beli' ? 'bg-blue-600 text-white shadow-inner' : 'bg-transparent text-blue-600 hover:bg-blue-50'}`}
          >
            JUAL BELI SAHAM (AJB)
          </button>
        </div>
      </div>
      )}
      
      {/* 1. DATA AKTA */}
      <Section title="Data Akta" defaultOpen={true}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <FieldRow label="Judul Akta">
                <Input name="judulAkta" value={data.judulAkta || ''} onChange={onChange} placeholder="Contoh: Akta Jual Beli Saham" />
              </FieldRow>
            </div>
            <div className="md:col-span-3">
              <FieldRow label="Nomor Akta">
                <div className="flex gap-1.5">
                  <Input name="nomorAkta" value={data.nomorAkta || ''} onChange={onChange} />
                  <button
                    type="button"
                    onClick={() => handleFetchLatestNumbers(data.tanggalAkta)}
                    disabled={isFetchingNumbers}
                    className="px-2.5 h-9 bg-[#3b5998] hover:bg-[#2d4373] text-white rounded transition-all disabled:opacity-50 shrink-0 flex items-center justify-center cursor-pointer"
                    title="Ambil Nomor Terakhir"
                  >
                    {isFetchingNumbers ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  </button>
                </div>
              </FieldRow>
            </div>
            <div className="md:col-span-3">
              <FieldRow label="Nomor Urut">
                <div className="flex gap-1.5">
                  <Input name="nomorUrut" value={data.nomorUrut || ''} onChange={onChange} />
                  <button
                    type="button"
                    onClick={() => handleFetchLatestNumbers(data.tanggalAkta)}
                    disabled={isFetchingNumbers}
                    className="px-2.5 h-9 bg-[#3b5998] hover:bg-[#2d4373] text-white rounded transition-all disabled:opacity-50 shrink-0 flex items-center justify-center cursor-pointer"
                    title="Ambil Nomor Terakhir"
                  >
                    {isFetchingNumbers ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  </button>
                </div>
              </FieldRow>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FieldRow label="Tanggal Akta">
              <Input name="tanggalAkta" type="date" value={data.tanggalAkta || ''} onChange={onChange} />
            </FieldRow>
            <FieldRow label="Jam">
              <Input name="jamAkta" type="time" value={data.jamAkta || ''} onChange={onChange} />
            </FieldRow>
          </div>
        </div>
      </Section>

      {/* 2. DATA PERSEROAN */}
      {!integrated && (
      <Section title="Data Perseroan">
        <div className="flex flex-col">
          <FieldRow label="Nama PT" required>
            <Input name="namaPT" value={data.namaPT} onChange={handleLocalChange} />
          </FieldRow>
          <FieldRow label="Tempat Kedudukan PT">
            <Input name="kedudukanPT" value={data.kedudukanPT} onChange={handleLocalChange} />
          </FieldRow>
        </div>
      </Section>
      )}

      {/* 3. AKTA PENDIRIAN DAN PERUBAHAN */}
      {!integrated && (
      <Section title="Akta Pendirian dan Perubahan">
        <div className="flex flex-col">
          <h3 className="font-bold text-[13px] text-slate-800 mb-4 uppercase">Akta Pendirian</h3>
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-md mb-6 space-y-0">
            <FieldRow label="Nomor Akta Pendirian">
              <Input name="nomorPendirian" value={data.nomorPendirian} onChange={handleLocalChange} />
            </FieldRow>
            <FieldRow label="Tanggal Akta Pendirian">
              <Input name="tglPendirianPT" type="date" value={data.tglPendirianPT} onChange={handleLocalChange} />
            </FieldRow>
            <FieldRow label="Notaris Pendirian">
              <Input name="notarisPT" value={data.notarisPT} onChange={handleLocalChange} />
            </FieldRow>
            <FieldRow label="Kedudukan Notaris Pendirian">
              <Input name="kedudukanNotarisPT" value={data.kedudukanNotarisPT} onChange={handleLocalChange} />
            </FieldRow>
            <FieldRow label="Nomor SK Pengesahan">
              <Input name="skPengesahan" value={data.skPengesahan} onChange={handleLocalChange} />
            </FieldRow>
            <FieldRow label="Tanggal SK Pengesahan">
              <Input name="tglSKPengesahan" type="date" value={data.tglSKPengesahan} onChange={handleLocalChange} />
            </FieldRow>
          </div>

          <h3 className="font-bold text-[13px] text-slate-800 mb-4 uppercase">Daftar Akta Perubahan</h3>
          <div className="space-y-4">
            {data.aktaPerubahan.map((p, i) => (
              <div key={p.id} className="p-4 rounded-md border border-gray-200 bg-gray-50 relative">
                <div className="absolute top-4 right-4">
                   <button onClick={() => removePerubahan(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-md transition-colors flex items-center gap-1 text-xs">
                      <Trash2 size={14}/> Hapus
                   </button>
                </div>
                <div className="flex flex-col mr-24">
                  <FieldRow label={`Nomor Akta Perubahan ${i + 1}`}>
                    <Input name="nomorRapat" value={p.nomorRapat} onChange={(e) => handlePerubahanChange(i, Object.assign(e, { target: { name: 'nomorRapat', value: e.target.value } }))} />
                  </FieldRow>
                  <FieldRow label="Tanggal Akta">
                    <Input name="tglRapat" type="date" value={p.tglRapat} onChange={(e) => handlePerubahanChange(i, Object.assign(e, { target: { name: 'tglRapat', value: e.target.value } }))} />
                  </FieldRow>
                  <FieldRow label="Notaris">
                    <Input name="notaris" value={p.notaris} onChange={(e) => handlePerubahanChange(i, Object.assign(e, { target: { name: 'notaris', value: e.target.value } }))} />
                  </FieldRow>
                  <FieldRow label="Kedudukan Notaris">
                    <Input name="kedudukanNotaris" value={p.kedudukanNotaris} onChange={(e) => handlePerubahanChange(i, Object.assign(e, { target: { name: 'kedudukanNotaris', value: e.target.value } }))} />
                  </FieldRow>
                  <FieldRow label="Jenis Surat Bukti">
                    <Select name="jenisSK" value={p.jenisSK} onChange={(e) => handlePerubahanChange(i, e)}>
                      <option value="SK">Keputusan (SK)</option>
                      <option value="SP">Persetujuan (SP)</option>
                      <option value="Penerimaan Pemberitahuan">Penerimaan Pemberitahuan</option>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Nomor SK/SP">
                    <Input name="skPerubahan" value={p.skPerubahan} onChange={(e) => handlePerubahanChange(i, Object.assign(e, { target: { name: 'skPerubahan', value: e.target.value } }))} />
                  </FieldRow>
                  <FieldRow label="Tanggal SK/SP">
                    <Input name="tglSKPerubahan" type="date" value={p.tglSKPerubahan} onChange={(e) => handlePerubahanChange(i, Object.assign(e, { target: { name: 'tglSKPerubahan', value: e.target.value } }))} />
                  </FieldRow>
                </div>
              </div>
            ))}
            <div className="flex justify-center mt-2">
              <button onClick={addPerubahan} className="flex items-center gap-2 px-4 py-2 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 transition-colors text-sm font-semibold">
                <Plus size={16}/> Tambah Akta Perubahan
              </button>
            </div>
          </div>
        </div>
      </Section>
      )}

      {/* 4. PIHAK PERTAMA */}
      <Section title={integrated ? `Status Persetujuan Pihak Pertama (${data.tipeAkta === 'Hibah' ? 'Pemberi Hibah' : 'Penjual'})` : `Pihak Pertama (${data.tipeAkta === 'Hibah' ? 'Pemberi Hibah' : 'Penjual'})`}>
        <div className="flex flex-col gap-3.5">
          {!integrated && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="md:col-span-2">
                <FieldRow label="Nama">
                  <div className="flex gap-2">
                    <select name="pihak1Gelar" value={data.pihak1Gelar} onChange={onChange} className="w-28 h-9 px-3 py-1.5 rounded border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-[13px] text-slate-800">
                      <option value="Tuan">Tuan</option>
                      <option value="Nyonya">Nyonya</option>
                      <option value="Nona">Nona</option>
                    </select>
                    <Input name="pihak1Nama" value={data.pihak1Nama} onChange={onChange} className="flex-1" />
                  </div>
                </FieldRow>
              </div>
              <div>
                <FieldRow label="Tempat Lahir">
                  <Input name="pihak1TempatLahir" value={data.pihak1TempatLahir} onChange={onChange} />
                </FieldRow>
              </div>
              <div>
                <FieldRow label="Tanggal Lahir">
                  <Input name="pihak1TanggalLahir" type="date" value={data.pihak1TanggalLahir} onChange={onChange} />
                </FieldRow>
              </div>
              <div>
                <FieldRow label="Pekerjaan">
                  <Input name="pihak1Pekerjaan" value={data.pihak1Pekerjaan} onChange={onChange} />
                </FieldRow>
              </div>
              <div>
                <FieldRow label="NIK">
                  <Input name="pihak1NIK" value={data.pihak1NIK} onChange={onChange} />
                </FieldRow>
              </div>
              <div className="md:col-span-2">
                <FieldRow label="Alamat / Jalan / No">
                  <Input name="pihak1AlamatJalan" value={data.pihak1AlamatJalan} onChange={handleLocalChange} />
                </FieldRow>
              </div>
              <div>
                <FieldRow label="RT">
                  <Input name="pihak1RT" value={data.pihak1RT} onChange={handleLocalChange} />
                </FieldRow>
              </div>
              <div>
                <FieldRow label="RW">
                  <Input name="pihak1RW" value={data.pihak1RW} onChange={handleLocalChange} />
                </FieldRow>
              </div>
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <RegionSelects prefix="pihak1" data={data} onChange={(e) => handleLocalChange({ target: e.target } as any)} FieldRow={FieldRow} Select={Select} />
                </div>
              </div>
          
              <div className="md:col-span-2 mt-1 p-3 bg-slate-50 border border-slate-200 rounded-md">
                <FieldRow label="Bertindak Sebagai (Opsi Utama)">
                  <Select name="appearer1Role" value={data.appearer1Role} onChange={onChange}>
                    <option value="Self">Diri Sendiri (Self)</option>
                    <option value="Proxy">Kuasa (Proxy)</option>
                    <option value="SelfAndProxy">Diri Sendiri & Kuasa (SelfAndProxy)</option>
                  </Select>
                </FieldRow>
              </div>
            </div>
          )}

          <div className={`${integrated ? 'mt-0' : 'mt-4'} border border-amber-300/70 rounded-lg overflow-hidden bg-amber-50/30 shadow-xs`}>
            <div className="px-3.5 py-2.5 border-b border-amber-300/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-100/60">
              <h3 className="font-bold text-[13px] text-amber-900 flex items-center gap-2">
                Status Persetujuan Istri/Suami / Kuasa
              </h3>
              <div className="w-full sm:w-72">
                <Select name="pihak1StatusPersetujuan" value={data.pihak1StatusPersetujuan || ''} onChange={onChange} className="bg-white">
                  <option value="">-- Pilih Status Persetujuan --</option>
                  <option value="Suami">Persetujuan Suami</option>
                  <option value="Istri">Persetujuan Istri</option>
                  <option value="Kuasa">Kuasa (Surat Kuasa & Persetujuan)</option>
                  <option value="Tidak Ada">Tidak Ada (Berdiri Sendiri)</option>
                </Select>
              </div>
            </div>
            
            {(data.pihak1StatusPersetujuan === 'Suami' || data.pihak1StatusPersetujuan === 'Istri' || data.pihak1StatusPersetujuan === 'Kuasa') && (
              <div className="p-4 bg-white/80">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="md:col-span-2">
                    <FieldRow label="Nama Pasangan / Pemberi Kuasa">
                      <Input name="suamiNama" value={data.suamiNama} onChange={onChange} placeholder="Nama lengkap..." />
                    </FieldRow>
                  </div>
                  <div>
                    <FieldRow label="Tempat Lahir">
                      <Input name="suamiTempatLahir" value={data.suamiTempatLahir} onChange={onChange} placeholder="Kota lahir..." />
                    </FieldRow>
                  </div>
                  <div>
                    <FieldRow label="Tanggal Lahir">
                      <Input name="suamiTanggalLahir" type="date" value={data.suamiTanggalLahir} onChange={onChange} />
                    </FieldRow>
                  </div>
                  <div>
                    <FieldRow label="Pekerjaan">
                      <Input name="suamiPekerjaan" value={data.suamiPekerjaan} onChange={onChange} placeholder="Contoh: Wiraswasta" />
                    </FieldRow>
                  </div>
                  <div>
                    <FieldRow label="NIK">
                      <Input name="suamiNIK" value={data.suamiNIK} onChange={onChange} placeholder="16 digit NIK..." />
                    </FieldRow>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/70 rounded-md border border-blue-200/70">
                      <input 
                        type="checkbox" 
                        id="suamiAlamatSama"
                        name="suamiAlamatSama" 
                        checked={data.suamiAlamatSama} 
                        onChange={handleLocalChange}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="suamiAlamatSama" className="text-[12.5px] font-medium text-slate-700 cursor-pointer select-none">
                        Alamat sama dengan Pihak Pertama ({data.tipeAkta === 'Hibah' ? 'Pemberi Hibah' : 'Penjual'})
                      </label>
                    </div>
                  </div>

                  {!data.suamiAlamatSama && (
                    <>
                      <div className="md:col-span-2">
                        <FieldRow label="Alamat / Jalan / No">
                          <Input name="suamiAlamatJalan" value={data.suamiAlamatJalan} onChange={handleLocalChange} placeholder="Nama jalan, nomor rumah..." />
                        </FieldRow>
                      </div>
                      <div>
                        <FieldRow label="RT">
                          <Input name="suamiRT" value={data.suamiRT} onChange={handleLocalChange} placeholder="001" />
                        </FieldRow>
                      </div>
                      <div>
                        <FieldRow label="RW">
                          <Input name="suamiRW" value={data.suamiRW} onChange={handleLocalChange} placeholder="002" />
                        </FieldRow>
                      </div>
                      <div className="md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <RegionSelects prefix="suami" data={data} onChange={(e) => handleLocalChange({ target: e.target } as any)} FieldRow={FieldRow} Select={Select} />
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="md:col-span-2">
                    <FieldRow label="Tanggal Surat Persetujuan dan Kuasa">
                      <Input 
                        name="tglPersetujuanSuami" 
                        type="date" 
                        value={data.tglPersetujuanSuami || data.tglSuratKuasa || ''} 
                        onChange={(e) => {
                          handleLocalChange(e, { tglSuratKuasa: e.target.value });
                        }} 
                      />
                    </FieldRow>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 5. PIHAK KEDUA */}
      {!integrated && (
      <Section title={`Pihak Kedua (${data.tipeAkta === 'Hibah' ? 'Penerima Hibah' : 'Pembeli'})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="md:col-span-2">
            <FieldRow label="Nama">
              <div className="flex gap-2">
                <select name="pihak2Gelar" value={data.pihak2Gelar} onChange={onChange} className="w-28 h-9 px-3 py-1.5 rounded border border-slate-300 bg-white focus:ring-1 focus:ring-blue-500 outline-none text-[13px] text-slate-800">
                  <option value="Tuan">Tuan</option>
                  <option value="Nyonya">Nyonya</option>
                  <option value="Nona">Nona</option>
                </select>
                <Input name="pihak2Nama" value={data.pihak2Nama} onChange={onChange} className="flex-1" />
              </div>
            </FieldRow>
          </div>
          <div>
            <FieldRow label="Tempat Lahir">
              <Input name="pihak2TempatLahir" value={data.pihak2TempatLahir} onChange={onChange} />
            </FieldRow>
          </div>
          <div>
            <FieldRow label="Tanggal Lahir">
              <Input name="pihak2TanggalLahir" type="date" value={data.pihak2TanggalLahir} onChange={onChange} />
            </FieldRow>
          </div>
          <div>
            <FieldRow label="Pekerjaan">
              <Input name="pihak2Pekerjaan" value={data.pihak2Pekerjaan} onChange={onChange} />
            </FieldRow>
          </div>
          <div>
            <FieldRow label="NIK">
              <Input name="pihak2NIK" value={data.pihak2NIK} onChange={onChange} />
            </FieldRow>
          </div>
          <div className="md:col-span-2">
            <FieldRow label="Alamat / Jalan / No">
              <Input name="pihak2AlamatJalan" value={data.pihak2AlamatJalan} onChange={handleLocalChange} />
            </FieldRow>
          </div>
          <div>
            <FieldRow label="RT">
              <Input name="pihak2RT" value={data.pihak2RT} onChange={handleLocalChange} />
            </FieldRow>
          </div>
          <div>
            <FieldRow label="RW">
              <Input name="pihak2RW" value={data.pihak2RW} onChange={handleLocalChange} />
            </FieldRow>
          </div>
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <RegionSelects prefix="pihak2" data={data} onChange={(e) => handleLocalChange({ target: e.target } as any)} FieldRow={FieldRow} Select={Select} />
            </div>
          </div>

          <div className="md:col-span-2 mt-1 p-3 bg-slate-50 border border-slate-200 rounded-md">
            <FieldRow label="Bertindak Sebagai (Opsi Utama)">
              <Select name="appearer2Role" value={data.appearer2Role} onChange={onChange}>
                <option value="Self">Diri Sendiri (Self)</option>
                <option value="Proxy">Kuasa (Proxy)</option>
                <option value="SelfAndProxy">Diri Sendiri & Kuasa (SelfAndProxy)</option>
              </Select>
            </FieldRow>
          </div>
        </div>
      </Section>
      )}

      {/* 6. DATA SAHAM */}
      <Section title={integrated ? "Data Tambahan Akta" : "Data Saham & Keputusan"}>
        <div className="flex flex-col gap-3.5">
          {!integrated && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <FieldRow label="Jumlah Saham Dimiliki Pihak Pertama (Lembar)">
                  <Input 
                    name="pihak1SahamDimiliki" 
                    type="text" 
                    value={formatNumber(data.pihak1SahamDimiliki)} 
                    onChange={handleNumberChange} 
                  />
                </FieldRow>
              </div>
              <div>
                <FieldRow label="Total Saham PT">
                  <Input 
                    name="jumlahSahamPT" 
                    type="text" 
                    value={formatNumber(data.jumlahSahamPT)} 
                    onChange={handleNumberChange} 
                  />
                </FieldRow>
              </div>
              <div>
                <FieldRow label={`Saham Di ${data.tipeAkta === 'Hibah' ? 'Hibahkan' : 'Jual'} (Lembar)`}>
                  <Input 
                    name="jumlahSahamHibah" 
                    type="text" 
                    value={formatNumber(data.jumlahSahamHibah)} 
                    onChange={handleNumberChange} 
                  />
                </FieldRow>
              </div>
              {data.tipeAkta === 'Jual Beli' && (
                <div>
                  <FieldRow label="Harga Jual Beli Saham (Rp)">
                    <Input 
                      name="hargaJualSaham" 
                      type="text" 
                      value={formatNumber(data.hargaJualSaham)} 
                      onChange={handleNumberChange} 
                    />
                  </FieldRow>
                </div>
              )}
              <div>
                <FieldRow label="Nilai Nominal Per Saham (Rp)">
                  <Input 
                    name="nilaiNominalSaham" 
                    type="text" 
                    value={formatNumber(data.nilaiNominalSaham)} 
                    onChange={handleNumberChange} 
                  />
                </FieldRow>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <FieldRow label="Tanggal Keputusan Sirkuler RUPS">
                <Input name="tglSirkuler" type="date" value={data.tglSirkuler} onChange={onChange} />
              </FieldRow>
            </div>
            <div>
              <FieldRow label="Nama Pengadilan (Domisili)">
                <Input name="namaPengadilan" value={data.namaPengadilan} onChange={onChange} />
              </FieldRow>
            </div>
          </div>
        </div>
      </Section>

      {integrated && (
        <div className="mt-6 flex justify-center pb-6">
          <button 
            onClick={simpanKeUtama}
            disabled={isSaving}
            className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 rounded-lg shadow-xs flex items-center justify-center gap-2 text-[12.5px] uppercase transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            SIMPAN KE BUKU DAFTAR AKTA
          </button>
        </div>
      )}

    </div>
  );
};
