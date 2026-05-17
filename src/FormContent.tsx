import React, { useState } from 'react';
import { FormData } from './constants';
import { RegionSelects } from './components/RegionSelects';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { formatNumber, parseNumber } from './lib/formatter';

interface FormContentProps {
  data: FormData;
  onChange: (e: { target: { name: string; value: any } }) => void;
  integrated?: boolean;
}

export const Section = ({ title, defaultOpen = true, children }: { title: string, defaultOpen?: boolean, children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-gray-200 shadow-sm mb-6 rounded-md overflow-hidden">
       <div 
         className="flex justify-between items-center px-6 py-4 cursor-pointer bg-slate-50 border-b border-gray-200 hover:bg-slate-100 transition-colors"
         onClick={() => setIsOpen(!isOpen)}
       >
          <div className="flex items-center">
             <div className="w-1.5 h-5 bg-[#3b5998] mr-3 rounded-sm"></div>
             <h2 className="font-bold text-[#3b5998] text-sm uppercase tracking-wide">{title}</h2>
          </div>
          {isOpen ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
       </div>
       {isOpen && (
         <div className="p-6">
           {children}
         </div>
       )}
    </div>
  )
}

export const FieldRow = ({ label, children, required = false }: { label: string, children: React.ReactNode, required?: boolean }) => (
  <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-4 py-3 items-start border-b border-gray-100 last:border-0 last:pb-0 font-sans">
    <label className="text-sm text-gray-700 font-medium py-2.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div>{children}</div>
  </div>
);

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`w-full px-4 py-2.5 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all ${className || ''}`} />
);

export const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={`w-full px-4 py-2.5 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all ${className || ''}`}>
    {props.children}
  </select>
);

export const TextArea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={`w-full px-4 py-2.5 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all min-h-[100px] ${className || ''}`} />
);

export const FormContent: React.FC<FormContentProps> = ({ data, onChange, integrated = false }) => {
  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let actualValue: any = value;
    
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      actualValue = e.target.checked;
    }

    onChange({ target: { name, value: actualValue } });

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
      Object.entries(syncFields).forEach(([fieldName, val]) => {
        onChange({ target: { name: fieldName, value: val } });
      });
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
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 flex items-center">
             <span className="font-semibold mr-2">Info:</span> Data Perseroan, Saham, Pihak Pertama dan Pihak Kedua sudah ditarik secara otomatis dari Draft Notulen. Silakan lengkapi data tambahan di bawah ini untuk pembuatan Draft Akta {(data.tipeAkta || 'Jual Beli').toUpperCase()}.
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
        <div className="flex flex-col">
          <FieldRow label="Nomor Akta">
            <Input name="nomorAkta" value={data.nomorAkta} onChange={onChange} />
          </FieldRow>
          <FieldRow label="Tanggal Akta">
            <Input name="tanggalAkta" type="date" value={data.tanggalAkta} onChange={onChange} />
          </FieldRow>
          <FieldRow label="Jam">
            <Input name="jamAkta" type="time" value={data.jamAkta} onChange={onChange} />
          </FieldRow>
          <FieldRow label="Notaris">
            <div className="space-y-3">
              <Select 
                name="notarisSelection" 
                value={data.notarisNama === 'Nukantini Putri Parincha' ? 'Saya' : (data.notarisNama === 'NUKANTINI PUTRI PARINCHA, Sarjana Hukum, Magister Kenotariatan' ? 'Saya' : 'Lainnya')} 
                onChange={(e) => {
                  if (e.target.value === 'Saya') {
                    onChange({ target: { name: 'notarisNama', value: 'Nukantini Putri Parincha' } });
                    onChange({ target: { name: 'notarisKedudukan', value: 'Kabupaten Bandung Barat' } });
                  } else {
                    onChange({ target: { name: 'notarisNama', value: '' } });
                  }
                }}
              >
                <option value="Saya">Saya (Nukantini Putri Parincha)</option>
                <option value="Lainnya">Lainnya (Input Manual)</option>
              </Select>
              
              {(data.notarisNama !== 'Nukantini Putri Parincha' && data.notarisNama !== 'NUKANTINI PUTRI PARINCHA, Sarjana Hukum, Magister Kenotariatan') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input 
                    name="notarisNama" 
                    placeholder="Nama Notaris..." 
                    value={data.notarisNama} 
                    onChange={onChange} 
                  />
                  <Input 
                    name="notarisKedudukan" 
                    placeholder="Kedudukan Notaris..." 
                    value={data.notarisKedudukan} 
                    onChange={onChange} 
                  />
                </div>
              )}
            </div>
          </FieldRow>
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
        <div className="flex flex-col">
          {!integrated && (
            <>
              <FieldRow label="Nama">
                <div className="flex gap-2">
                  <select name="pihak1Gelar" value={data.pihak1Gelar} onChange={onChange} className="w-1/4 min-w-[100px] px-4 py-2.5 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all">
                    <option value="Tuan">Tuan</option>
                    <option value="Nyonya">Nyonya</option>
                    <option value="Nona">Nona</option>
                  </select>
                  <Input name="pihak1Nama" value={data.pihak1Nama} onChange={onChange} className="flex-1 px-4 py-2.5 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" />
                </div>
              </FieldRow>
              <FieldRow label="Tempat Lahir">
                <Input name="pihak1TempatLahir" value={data.pihak1TempatLahir} onChange={onChange} />
              </FieldRow>
              <FieldRow label="Tanggal Lahir">
                <Input name="pihak1TanggalLahir" type="date" value={data.pihak1TanggalLahir} onChange={onChange} />
              </FieldRow>
              <FieldRow label="Pekerjaan">
                <Input name="pihak1Pekerjaan" value={data.pihak1Pekerjaan} onChange={onChange} />
              </FieldRow>
              <FieldRow label="NIK">
                <Input name="pihak1NIK" value={data.pihak1NIK} onChange={onChange} />
              </FieldRow>
              <FieldRow label="Alamat / Jalan / No">
                <Input name="pihak1AlamatJalan" value={data.pihak1AlamatJalan} onChange={handleLocalChange} />
              </FieldRow>
              <FieldRow label="RT / RW">
                <div className="flex gap-4">
                  <div className="w-1/2 flex items-center gap-2">
                    <span className="text-sm text-gray-500">RT</span>
                    <Input name="pihak1RT" value={data.pihak1RT} onChange={handleLocalChange} />
                  </div>
                  <div className="w-1/2 flex items-center gap-2">
                    <span className="text-sm text-gray-500">RW</span>
                    <Input name="pihak1RW" value={data.pihak1RW} onChange={handleLocalChange} />
                  </div>
                </div>
              </FieldRow>
              <RegionSelects prefix="pihak1" data={data} onChange={(e) => handleLocalChange({ target: e.target } as any)} FieldRow={FieldRow} Select={Select} />
            </>
          )}

          <div className={`${integrated ? 'mt-2' : 'mt-8'} border border-[#eab308]/30 rounded-lg overflow-hidden bg-[#fefce8]`}>
            <div className="px-4 py-3 border-b border-[#eab308]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="font-bold text-sm text-[#854d0e]">Status Persetujuan Istri/Suami</h3>
              <div className="w-full md:w-64">
                <Select name="pihak1StatusPersetujuan" value={data.pihak1StatusPersetujuan} onChange={onChange}>
                  <option value="Suami">Persetujuan Suami</option>
                  <option value="Istri">Persetujuan Istri</option>
                  <option value="Tidak Ada">Tidak Ada (Berdiri Sendiri)</option>
                </Select>
              </div>
            </div>
            
            {(data.pihak1StatusPersetujuan === 'Suami' || data.pihak1StatusPersetujuan === 'Istri') && (
              <div className="p-4">
                <div className="flex flex-col">
                  <FieldRow label="Nama Pasangan">
                    <Input name="suamiNama" value={data.suamiNama} onChange={onChange} />
                  </FieldRow>
                  <FieldRow label="Tempat Lahir">
                    <Input name="suamiTempatLahir" value={data.suamiTempatLahir} onChange={onChange} />
                  </FieldRow>
                  <FieldRow label="Tanggal Lahir">
                    <Input name="suamiTanggalLahir" type="date" value={data.suamiTanggalLahir} onChange={onChange} />
                  </FieldRow>
                  <FieldRow label="Pekerjaan">
                    <Input name="suamiPekerjaan" value={data.suamiPekerjaan} onChange={onChange} />
                  </FieldRow>
                  <FieldRow label="NIK">
                    <Input name="suamiNIK" value={data.suamiNIK} onChange={onChange} />
                  </FieldRow>

                  <div className="flex items-center gap-2 mt-2 mb-4 px-1 py-3 bg-blue-50/50 rounded-md border border-blue-100">
                    <input 
                      type="checkbox" 
                      id="suamiAlamatSama"
                      name="suamiAlamatSama" 
                      checked={data.suamiAlamatSama} 
                      onChange={handleLocalChange}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="suamiAlamatSama" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Alamat sama dengan Pihak Pertama ({data.tipeAkta === 'Hibah' ? 'Pemberi Hibah' : 'Penjual'})
                    </label>
                  </div>

                  {!data.suamiAlamatSama && (
                    <>
                      <FieldRow label="Alamat / Jalan / No">
                        <Input name="suamiAlamatJalan" value={data.suamiAlamatJalan} onChange={handleLocalChange} />
                      </FieldRow>
                      <FieldRow label="RT / RW">
                        <div className="flex gap-4">
                          <div className="w-1/2 flex items-center gap-2">
                            <span className="text-sm text-gray-500">RT</span>
                            <Input name="suamiRT" value={data.suamiRT} onChange={handleLocalChange} />
                          </div>
                          <div className="w-1/2 flex items-center gap-2">
                            <span className="text-sm text-gray-500">RW</span>
                            <Input name="suamiRW" value={data.suamiRW} onChange={handleLocalChange} />
                          </div>
                        </div>
                      </FieldRow>
                      <RegionSelects prefix="suami" data={data} onChange={(e) => handleLocalChange({ target: e.target } as any)} FieldRow={FieldRow} Select={Select} />
                    </>
                  )}
                  
                  <FieldRow label="Tanggal Persetujuan Bawah Tangan">
                    <Input name="tglPersetujuanSuami" type="date" value={data.tglPersetujuanSuami} onChange={onChange} />
                  </FieldRow>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 5. PIHAK KEDUA */}
      {!integrated && (
      <Section title={`Pihak Kedua (${data.tipeAkta === 'Hibah' ? 'Penerima Hibah' : 'Pembeli'})`}>
        <div className="flex flex-col">
          <FieldRow label="Nama">
            <div className="flex gap-2">
              <select name="pihak2Gelar" value={data.pihak2Gelar} onChange={onChange} className="w-1/4 min-w-[100px] px-4 py-2.5 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all">
                <option value="Tuan">Tuan</option>
                <option value="Nyonya">Nyonya</option>
                <option value="Nona">Nona</option>
              </select>
              <Input name="pihak2Nama" value={data.pihak2Nama} onChange={onChange} className="flex-1 px-4 py-2.5 rounded border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" />
            </div>
          </FieldRow>
          <FieldRow label="Tempat Lahir">
            <Input name="pihak2TempatLahir" value={data.pihak2TempatLahir} onChange={onChange} />
          </FieldRow>
          <FieldRow label="Tanggal Lahir">
            <Input name="pihak2TanggalLahir" type="date" value={data.pihak2TanggalLahir} onChange={onChange} />
          </FieldRow>
          <FieldRow label="Pekerjaan">
            <Input name="pihak2Pekerjaan" value={data.pihak2Pekerjaan} onChange={onChange} />
          </FieldRow>
          <FieldRow label="NIK">
            <Input name="pihak2NIK" value={data.pihak2NIK} onChange={onChange} />
          </FieldRow>
          <FieldRow label="Alamat / Jalan / No">
            <Input name="pihak2AlamatJalan" value={data.pihak2AlamatJalan} onChange={handleLocalChange} />
          </FieldRow>
          <FieldRow label="RT / RW">
            <div className="flex gap-4">
              <div className="w-1/2 flex items-center gap-2">
                <span className="text-sm text-gray-500">RT</span>
                <Input name="pihak2RT" value={data.pihak2RT} onChange={handleLocalChange} />
              </div>
              <div className="w-1/2 flex items-center gap-2">
                <span className="text-sm text-gray-500">RW</span>
                <Input name="pihak2RW" value={data.pihak2RW} onChange={handleLocalChange} />
              </div>
            </div>
          </FieldRow>
          <RegionSelects prefix="pihak2" data={data} onChange={(e) => handleLocalChange({ target: e.target } as any)} FieldRow={FieldRow} Select={Select} />
        </div>
      </Section>
      )}

      {/* 6. DATA SAHAM */}
      <Section title={integrated ? "Data Tambahan Akta" : "Data Saham & Keputusan"}>
        <div className="flex flex-col">
          {!integrated && (
            <>
              <FieldRow label="Total Saham PT">
                <Input 
                  name="jumlahSahamPT" 
                  type="text" 
                  value={formatNumber(data.jumlahSahamPT)} 
                  onChange={handleNumberChange} 
                />
              </FieldRow>
              <FieldRow label={`Saham Di ${data.tipeAkta === 'Hibah' ? 'Hibahkan' : 'Jual'} (Lembar)`}>
                <Input 
                  name="jumlahSahamHibah" 
                  type="text" 
                  value={formatNumber(data.jumlahSahamHibah)} 
                  onChange={handleNumberChange} 
                />
              </FieldRow>
              {data.tipeAkta === 'Jual Beli' && (
                <FieldRow label="Harga Jual Beli Saham (Rp)">
                  <Input 
                    name="hargaJualSaham" 
                    type="text" 
                    value={formatNumber(data.hargaJualSaham)} 
                    onChange={handleNumberChange} 
                  />
                </FieldRow>
              )}
              <FieldRow label="Nilai Nominal Per Saham (Rp)">
                <Input 
                  name="nilaiNominalSaham" 
                  type="text" 
                  value={formatNumber(data.nilaiNominalSaham)} 
                  onChange={handleNumberChange} 
                />
              </FieldRow>
            </>
          )}

          <FieldRow label="Tanggal Keputusan Sirkuler RUPS">
            <Input name="tglSirkuler" type="date" value={data.tglSirkuler} onChange={onChange} />
          </FieldRow>

          <FieldRow label="Nama Pengadilan (Domisili)">
            <Input name="namaPengadilan" value={data.namaPengadilan} onChange={onChange} />
          </FieldRow>
        </div>
      </Section>

    </div>
  );
};
