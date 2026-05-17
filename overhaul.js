import fs from 'fs';

let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Ensure all icons are imported
const icons = ['HelpCircle', 'Plus', 'Menu', 'ChevronDown', 'Mail', 'User', 'Search', 'Bell', 'X', 'FileCheck', 'MapPin', 'Briefcase', 'Globe', 'Clock', 'ChevronRight', 'Trash2', 'ListChecks', 'Users', 'Save', 'Printer', 'FileCode'];
icons.forEach(icon => {
  if (!code.includes(icon) && !code.includes(`import { ${icon}`)) {
    code = code.replace('import {', `import { ${icon},`);
  }
});

// Remove existing sidebar and main content structure
// We want to replace the whole content of the root div

const layoutStartMarker = '<div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100">';
const rootDivStart = code.indexOf(layoutStartMarker);
if (rootDivStart === -1) {
    console.error('Could not find root div start');
    process.exit(1);
}

const contentStart = rootDivStart + layoutStartMarker.length;
const contentEnd = code.lastIndexOf('</div>'); // The last closing div of App component

const mainLayout = `
      {/* Header AHU Style */}
      <header className="bg-[#3b5998] text-white flex justify-between items-center px-4 py-2 sticky top-0 z-50 shadow-sm text-sm border-b border-black/10 h-[50px]">
        <div className="flex items-center gap-6">
          <button className="p-1 hover:bg-white/10 rounded transition-colors"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <span className="text-xl">≡</span>
            <span className="text-[14px]">DITJEN AHU ONLINE</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-[11px] font-medium text-white/90">
            <button className="flex items-center gap-1 hover:text-white transition-colors relative">
              <Mail className="w-4 h-4" /> 
              Pesan 
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full border border-[#3b5998]">40</span>
            </button>
            <button className="flex items-center gap-1 hover:text-white transition-colors uppercase">
              <HelpCircle className="w-4 h-4" /> 
              PEMBAYARAN PNBP SECARA ONLINE
            </button>
          </div>
          <div className="flex items-center gap-1 bg-black/10 px-3 py-1.5 rounded text-[11px] font-bold">
            SABH <ChevronDown className="w-3 h-3" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar AHU Style */}
        <aside className="w-64 bg-[#2c3b41] text-slate-400 flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
          <div className="py-4 space-y-0 text-[13px]">
            {[
              { label: 'Informasi Formasi', active: false },
              { label: 'Beranda Notaris', active: false },
              { label: 'Fidusia', active: false },
              { label: 'Wasiat', active: true },
              { label: 'Notaris Pengganti', active: false },
              { label: 'Perseroan Terbatas', active: false },
              { label: 'Upload Bukti Setoran', active: false },
              { label: 'Yayasan', active: false },
              { label: 'Perkumpulan', active: false },
              { label: 'Daftar Voucher', active: false },
              { label: 'Perbaikan Data', active: false },
              { label: 'Timeline', active: false }
            ].map((item, idx) => (
              <button key={idx} className={\`w-full text-left px-4 py-2 border-l-4 transition-all flex justify-between items-center \${item.active ? 'bg-[#1e282c] text-white border-blue-500' : 'border-transparent hover:bg-black/10 hover:text-white'}\`}>
                <span className="flex items-center gap-3">{item.label}</span>
                {['Wasiat', 'Notaris Pengganti', 'Perseroan Terbatas', 'Yayasan', 'Perkumpulan', 'Perbaikan Data'].includes(item.label) && <Plus className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#ecf0f5] p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-[24px] font-normal text-slate-800">Format Isian Perubahan Perseroan Terbatas</h1>
              <p className="text-red-500 text-[12px] mt-1">Kotak isian yang bertanda * wajib diisi</p>
            </div>

            {/* DATA PERSEROAN */}
            <AhuSection title="DATA PERSEROAN">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Nama Perseroan" />
                  <div className="md:col-span-3"><AhuInput value={data.companyName} onChange={e => updateData({ companyName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Nama Singkatan" />
                  <div className="md:col-span-3"><AhuInput value={data.companyShortName} onChange={e => updateData({ companyShortName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Jenis Perseroan" />
                  <div className="md:col-span-3">
                    <AhuSelect value={data.companyType} onChange={e => updateData({ companyType: e.target.value })}>
                      <option value="SWASTA NASIONAL">SWASTA NASIONAL</option>
                    </AhuSelect>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="NPWP Perseroan" required />
                  <div className="md:col-span-3"><AhuInput value={data.npwp} onChange={e => updateData({ npwp: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Jangka Waktu Perseroan" />
                  <div className="md:col-span-3"><AhuInput value={data.duration} onChange={e => updateData({ duration: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Status Perseroan" />
                  <div className="md:col-span-3"><AhuInput value={data.status} onChange={e => updateData({ status: e.target.value })} /></div>
                </div>
              </div>
            </AhuSection>

            {/* KEDUDUKAN PERSEROAN */}
            <AhuSection title="KEDUDUKAN PERSEROAN">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <div>
                  <AhuLabel label="Provinsi" />
                  <AhuInput value={data.newAddress.province} readOnly />
                </div>
                <div>
                  <AhuLabel label="Kabupaten" />
                  <AhuInput value={data.newAddress.city} readOnly />
                </div>
              </div>
            </AhuSection>

             {/* DOMISILI PERSEROAN */}
            <AhuSection title="DOMISILI PERSEROAN">
              <div className="space-y-4">
                <div>
                  <AhuLabel label="Alamat Perseroan" />
                  <AhuInput className="bg-slate-100" value={data.newAddress.street} onChange={e => updateAddress('newAddress', { street: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><AhuLabel label="RT" /><AhuInput value={data.newAddress.rt} onChange={e => updateAddress('newAddress', { rt: e.target.value })} /></div>
                    <div><AhuLabel label="RW" /><AhuInput value={data.newAddress.rw} onChange={e => updateAddress('newAddress', { rw: e.target.value })} /></div>
                  </div>
                  <div>
                    <AhuLabel label="Kecamatan" />
                    <AhuInput value={data.newAddress.kecamatan} onChange={e => updateAddress('newAddress', { kecamatan: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <div>
                    <AhuLabel label="Kelurahan" />
                    <AhuInput value={data.newAddress.kelurahan} onChange={e => updateAddress('newAddress', { kelurahan: e.target.value })} />
                  </div>
                  <div>
                    <AhuLabel label="Kode Pos" />
                    <AhuInput value={data.newAddress.postalCode} onChange={e => updateAddress('newAddress', { postalCode: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                   <div>
                    <AhuLabel label="Nomor Telepon" />
                    <AhuInput value={data.newAddress.phoneNumber} onChange={e => updateAddress('newAddress', { phoneNumber: e.target.value })} />
                  </div>
                </div>
              </div>
            </AhuSection>

            {/* MAKSUD DAN TUJUAN */}
            <AhuSection title="Maksud dan Tujuan">
               <div className="space-y-4">
                  <button onClick={() => setActiveTab('kbli')} className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors">Tambah Data</button>
                  <div className="text-[11px] text-slate-500">Data KBLI Tahun : 2020</div>
                  <div className="border border-slate-200 overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#f9f9f9] border-b border-slate-200">
                        <tr>
                          <th className="p-2 border-r border-slate-200 w-10 text-center">No</th>
                          <th className="p-2 border-r border-slate-200 w-20">Kode KBLI</th>
                          <th className="p-2 border-r border-slate-200 w-40">Judul KBLI</th>
                          <th className="p-2 border-r border-slate-200">Uraian KBLI</th>
                          <th className="p-2 w-10 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.kbliItems.map((item, idx) => (
                           <tr key={item.id} className="border-b border-slate-200 last:border-0">
                             <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                             <td className="p-2 border-r border-slate-200">{item.code}</td>
                             <td className="p-2 border-r border-slate-200">{item.name}</td>
                             <td className="p-2 border-r border-slate-200 text-slate-600 leading-relaxed">{item.description}</td>
                             <td className="p-2 text-center"><button onClick={() => updateData({ kbliItems: data.kbliItems.filter(k => k.id !== item.id) })} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
            </AhuSection>

            {/* AKTA NOTARIS */}
            <AhuSection title="AKTA NOTARIS">
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Nama Notaris" />
                  <div className="md:col-span-3"><AhuInput value={data.notaryName} onChange={e => updateData({ notaryName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                   <div>
                    <AhuLabel label="Nomor Akta" />
                    <AhuInput value={data.notaryNumber} onChange={e => updateData({ notaryNumber: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <AhuLabel label="Tanggal Akta" />
                    <AhuInput type="date" value={data.notaryDate} onChange={e => updateData({ notaryDate: e.target.value })} />
                  </div>
                </div>
              </div>
            </AhuSection>

            {/* MODAL DASAR */}
            <AhuSection title="MODAL DASAR *">
               <div className="space-y-4">
                  <div className="border border-slate-200 overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-3 border-r border-slate-200">Klasifikasi Saham</th>
                          <th className="p-3 border-r border-slate-200">Harga Per Lembar</th>
                          <th className="p-3 border-r border-slate-200">Jumlah Lembar Saham</th>
                          <th className="p-3">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                         <tr className="border-b border-slate-200">
                           <td className="p-3 border-r border-slate-200">Tanpa Klasifikasi</td>
                           <td className="p-3 border-r border-slate-200">Rp. {formatInputNumber(data.originalSharePrice)}</td>
                           <td className="p-3 border-r border-slate-200">{formatInputNumber(data.targetCapitalBase / data.originalSharePrice)}</td>
                           <td className="p-3">Rp. {formatInputNumber(data.targetCapitalBase)}</td>
                         </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="italic font-bold text-slate-700 text-[13px]">Total modal dasar Rp. {formatInputNumber(data.targetCapitalBase)}</div>
               </div>
            </AhuSection>

            {/* MODAL DITEMPATKAN */}
            <AhuSection title="MODAL DITEMPATKAN *">
               <div className="space-y-4">
                  <div className="border border-slate-200 overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-3 border-r border-slate-200">Klasifikasi Saham</th>
                          <th className="p-3 border-r border-slate-200">Harga Per Lembar</th>
                          <th className="p-3 border-r border-slate-200">Jumlah Lembar Saham</th>
                          <th className="p-3">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                         <tr className="border-b border-slate-200">
                           <td className="p-3 border-r border-slate-200">Tanpa Klasifikasi</td>
                           <td className="p-3 border-r border-slate-200">Rp. {formatInputNumber(data.originalSharePrice)}</td>
                           <td className="p-3 border-r border-slate-200">{formatInputNumber(data.targetCapitalPaid / data.originalSharePrice)}</td>
                           <td className="p-3">Rp. {formatInputNumber(data.targetCapitalPaid)}</td>
                         </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="italic font-bold text-slate-700 text-[13px]">Total modal ditempatkan Rp. {formatInputNumber(data.targetCapitalPaid)}</div>
               </div>
            </AhuSection>

            {/* MODAL DISETOR */}
            <AhuSection title="MODAL DISETOR *">
               <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <AhuInput value={formatInputNumber(data.targetCapitalPaid)} readOnly />
                  </div>
                  <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
                    <input type="checkbox" checked={true} readOnly /> Dalam bentuk uang.
                  </label>
               </div>
            </AhuSection>

             {/* PENGURUS DAN PEMEGANG SAHAM */}
            <AhuSection title="PENGURUS DAN PEMEGANG SAHAM *">
               <div className="space-y-4">
                  <div className="flex justify-end">
                    <button onClick={() => setActiveTab('shareholders')} className="bg-[#222d32] text-white px-3 py-1.5 rounded-sm text-[12px] font-bold shadow hover:bg-black transition-colors">Tambah Data</button>
                  </div>
                  <div className="border border-slate-200 overflow-x-auto rounded-sm">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-2 border-r border-slate-200">Penanggung Jawab</th>
                          <th className="p-2 border-r border-slate-200">Nama</th>
                          <th className="p-2 border-r border-slate-200">Klasifikasi Saham</th>
                          <th className="p-2 border-r border-slate-200">Jumlah Lembar Saham</th>
                          <th className="p-2 border-r border-slate-200">Jabatan</th>
                          <th className="p-2 border-r border-slate-200">Total</th>
                          <th className="p-2 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.finalShareholders.map((s, idx) => (
                           <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                             <td className="p-2 border-r border-slate-200">{idx === 0 ? 'Ya' : 'tidak'}</td>
                             <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                             <td className="p-2 border-r border-slate-200">Tanpa Klasifikasi</td>
                             <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned)}</td>
                             <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.isManagement ? (s.managementPosition || 'PENGURUS') : '-'}</td>
                             <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber(s.sharesOwned * data.originalSharePrice)}</td>
                             <td className="p-2 text-center text-blue-600">
                               <button onClick={() => setActiveTab('shareholders')} className="hover:underline">Perbaharui</button> | <button onClick={() => updateData({ finalShareholders: data.finalShareholders.filter(p => p.id !== s.id) })} className="hover:underline">Hapus</button>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[13px] font-bold text-slate-800 space-y-1">
                    <div>TOTAL LEMBAR SAHAM {formatInputNumber(data.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0))}</div>
                    <div>TOTAL MODAL DITEMPATKAN DAN DISETOR Rp {formatInputNumber(data.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0) * data.originalSharePrice)}</div>
                  </div>
               </div>
            </AhuSection>

            {/* PEMILIK MANFAAT */}
            <AhuSection title="Pemilik Manfaat">
               <div className="space-y-4">
                  <div className="text-red-500 text-[11px] font-semibold italic">* Wajib Diisi</div>
                  <div className="bg-[#ffffcc] border border-[#ffcc00] p-4 rounded-sm text-[11px] text-[#333] space-y-3">
                    <p className="font-bold">Kementerian Hukum dan HAM dalam mendukung pemberantasan tindak pidana pencucian uang dan Tindak Pidana Pendanaan Terorisme melalui korporasi, menerapkan kewajiban pelaporan pemilik manfaat, sesuai ketentuan:</p>
                    <ul className="text-blue-600 space-y-1">
                      <li>- Peraturan Presiden Nomor 13 Tahun 2018 ( <button className="underline">Unduh</button> )</li>
                      <li>- Peraturan Menteri Hukum dan HAM Nomor 15 Tahun 2019 ( <button className="underline">Unduh</button> )</li>
                      <li>- Peraturan Menteri Hukum dan HAM Nomor 21 Tahun 2019 ( <button className="underline">Unduh</button> )</li>
                    </ul>
                    <label className="flex items-start gap-2 pt-2 text-black cursor-pointer">
                      <input type="checkbox" checked={data.beneficialOwnerConsent} onChange={e => updateData({ beneficialOwnerConsent: e.target.checked })} className="mt-0.5" />
                      <span className="font-bold">Saya mengerti, memahami dan bersedia melaksanakan sebagaimana ketentuan mengenai pelaporan pemilik manfaat pada korporasi.</span>
                    </label>
                  </div>
               </div>
            </AhuSection>

            {/* NOTARIS PENGGANTI */}
            <AhuSection title="Notaris Pengganti">
               <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={data.isReplacementNotary} onChange={e => updateData({ isReplacementNotary: e.target.checked })} />
                    <span>Apakah Anda Notaris Pengganti?</span>
                  </label>
               </div>
            </AhuSection>

            {/* PERSYARATAN */}
            <AhuSection title="PERSYARATAN">
               <div className="space-y-4">
                  <h4 className="text-[18px] font-semibold text-slate-800">Sesuai Undang-undang Jabatan Notaris, Saya menyatakan :</h4>
                  <div className="space-y-3 text-[12px] text-slate-700">
                    {[
                      "Bahwa Data yang diisi pada format isian pendirian Perseroan sudah benar.",
                      "Bahwa Akta Perseroan yang saya buat sebelum mengisi format isian pendirian Perseroan telah sesuai dengan ketentuan peraturan perundang-undangan.",
                      "Bahwa Data Perseroan yang diisi dengan dokumen fisik yang disimpan pada kantor saya telah sesuai.",
                      "Bahwa dokumen-dokumen for pendirian Perseroan telah lengkap sebelum saya mengisi format isian pendirian Perseroan.",
                      "Jika saya dalam proses pengisian data pada format isian tidak sesuai dengan data yang sebenarnya maka saya bersedia menerima sanksi pidana, perdata dan administratif sesuai dengan peraturan perundang-undangan."
                    ].map((text, idx) => (
                      <label key={idx} className="flex items-start gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors group">
                        <input type="checkbox" className="mt-1" defaultChecked />
                        <span className="group-hover:text-black">{idx + 1}. {text}</span>
                      </label>
                    ))}
                  </div>
               </div>
            </AhuSection>

            {/* Action Buttons */}
            <div className="flex gap-2 py-8 pt-4 border-t border-slate-300">
               <button onClick={() => setIsPreviewOpen(true)} className="px-5 py-2 bg-[#d9534f] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#c9302c] shadow-sm uppercase">KEMBALI</button>
               <button onClick={() => setIsPreviewOpen(true)} className="px-5 py-2 bg-[#5cb85c] text-white rounded-md text-[13px] font-bold transition-all hover:bg-[#449d44] shadow-sm uppercase">LANJUTKAN</button>
            </div>
          </div>
        </main>
      </div>
`;

code = code.substring(0, contentStart) + mainLayout + code.substring(contentEnd);

fs.writeFileSync('App.tsx', code);
console.log('App.tsx fully overhauled');
