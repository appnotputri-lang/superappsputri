import React, { useState } from 'react';
import { ArrowRight, Edit, Trash2, ChevronDown, ChevronRight, Plus, Eye } from 'lucide-react';
import { CompanyDetailProps } from '../types/company.types';
import { OperationType } from '../../../../src/lib/firebase';
import { formatInputNumber, parseFormattedNumber } from '../../../../utils/formatters';

const AhuSection = ({ title, children, isOpen = true }: { title: string, children: React.ReactNode, isOpen?: boolean }) => {
  const [open, setOpen] = useState(isOpen);
  return (
    <div className="bg-white border border-slate-200 rounded-sm mb-4 shadow-sm">
      <div 
        onClick={() => setOpen(!open)}
        className="bg-[#f5f5f5] px-4 py-2 flex justify-between items-center cursor-pointer border-b border-slate-200 group"
      >
        <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
          <span className="w-1.5 h-4 bg-[#3b5998]"></span>
          {title}
        </h3>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </div>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
};

const AhuLabel = ({ label, required = false }: { label: string, required?: boolean }) => (
  <label className="block text-[13px] font-medium text-slate-700 mb-1">
    {label} {required && <span className="text-red-500">*</span>}
  </label>
);

const AhuInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 ${className}`} 
  />
);

const AhuSelect = ({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    {...props} 
    className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[13px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 appearance-none ${className}`}
  >
    {children}
  </select>
);

export const CompanyDetail: React.FC<CompanyDetailProps> = ({
  data,
  isProfilePreview,
  setIsProfilePreview,
  user,
  userProfile,
  deleteCompany,
  editingProfileId,
  setEditingProfileId,
  recordNotification,
  handleFirestoreError,
  openShareholderEditor,
  deleteShareholder,
}) => {
  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-wrap items-center gap-2 bg-slate-50/50 p-2 rounded-md border border-slate-200">
        <button 
          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold text-[12px] uppercase bg-white px-3 py-2 rounded-sm border border-slate-200 shadow-sm" 
          onClick={() => setEditingProfileId(null)}
        >
          <ArrowRight className="w-4 h-4 rotate-180" /> Kembali
        </button>
        
        <div className="h-6 w-px bg-slate-300 mx-1"></div>

        <button 
          onClick={(e) => { e.preventDefault(); setIsProfilePreview(false); }}
          className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[13px] font-bold transition-all border border-slate-200 shadow-sm flex items-center gap-2 uppercase"
        >
          <Edit className="w-4 h-4" /> Edit
        </button>
        {userProfile?.role !== 'Staff' && (
          <button 
            onClick={async (e) => {
              e.preventDefault();
              if (!editingProfileId) return;
              if (confirm('Hapus profil ' + data.companyName + '?')) {
                if (!user) return alert('Anda harus login!');
                try {
                  const deletedName = data.companyName || 'PT Baru';
                  await deleteCompany(editingProfileId, false);
                  recordNotification(
                    'Klien PT Dihapus',
                    `Profil klien "${deletedName}" telah berhasil dihapus oleh ${user?.email || 'Admin'}.`,
                    'delete_profile'
                  );
                  alert('Profil berhasil dihapus');
                  setEditingProfileId(null);
                } catch (err) {
                  handleFirestoreError(err, OperationType.DELETE, `profiles/${editingProfileId}`);
                }
              }
            }}
            className="px-5 py-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-md font-bold transition-all text-[13px] border border-red-100 hover:border-red-500 shadow-sm flex items-center gap-2 uppercase"
          >
            <Trash2 className="w-4 h-4" /> Hapus
          </button>
        )}
      </div>
      
      <fieldset disabled={isProfilePreview} className="space-y-4">
        {/* DATA PERSEROAN */}
        <AhuSection title="DATA PERSEROAN">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Kedudukan (Kab/Kota)" />
              <div className="md:col-span-3 flex gap-4 items-center">
                <div className="flex-1">
                  <AhuInput 
                    placeholder="Contoh: Kota Bandung atau Kabupaten Bandung Barat"
                    value={data.domicile || ''}
                    readOnly
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Harga per Lembar" />
              <div className="md:col-span-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
                  <AhuInput 
                    className="pl-10"
                    value={data.originalSharePrice === 0 ? '' : formatInputNumber(data.originalSharePrice)} 
                    readOnly
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Modal Dasar (Lembar)" required />
              <div className="md:col-span-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <AhuInput 
                      value={data.originalAuthorizedShares === 0 ? '' : formatInputNumber(data.originalAuthorizedShares)} 
                      readOnly
                    />
                  </div>
                  <div className="text-[13px] font-bold text-slate-500 w-48">
                    Rp. {formatInputNumber(data.targetCapitalBase)}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Modal Ditempatkan & Disetor (Lembar)" required />
              <div className="md:col-span-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <AhuInput 
                      value={data.originalTotalShares === 0 ? '' : formatInputNumber(data.originalTotalShares)} 
                      readOnly
                    />
                  </div>
                  <div className="text-[13px] font-bold text-slate-500 w-48">
                    Rp. {formatInputNumber(data.targetCapitalPaid)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AhuSection>

        {/* PENGURUS DAN PEMEGANG SAHAM LAMA */}
        <AhuSection title="PENGURUS DAN PEMEGANG SAHAM LAMA *">
          <div className="space-y-4">
              <div className="border border-slate-200 overflow-x-auto rounded-sm">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                    <tr>
                      <th className="p-2 border-r border-slate-200">Nama</th>
                      <th className="p-2 border-r border-slate-200">Klasifikasi Saham</th>
                      <th className="p-2 border-r border-slate-200">Jumlah Lembar Saham</th>
                      <th className="p-2 border-r border-slate-200">Jabatan</th>
                      <th className="p-2 border-r border-slate-200">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.shareholders.map((s: any) => (
                       <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors text-[10px]">
                         <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                         <td className="p-2 border-r border-slate-200">Tanpa Klasifikasi</td>
                         <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned)}</td>
                         <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.isManagement ? (s.managementPosition || 'DIREKTUR') : '-'}</td>
                         <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber(s.sharesOwned * data.originalSharePrice)}</td>
                       </tr>
                    ))}
                    {data.shareholders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">Belum ada data pengurus/pemegang saham lama.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-[13px] font-bold text-slate-800 space-y-1 uppercase">
                <div>TOTAL LEMBAR SAHAM {formatInputNumber(data.shareholders.reduce((sum: number, s: any) => sum + s.sharesOwned, 0))}</div>
                <div>TOTAL MODAL DITEMPATKAN DAN DISETOR Rp {formatInputNumber(data.shareholders.reduce((sum: number, s: any) => sum + s.sharesOwned, 0) * data.originalSharePrice)}</div>
                {data.shareholders.reduce((sum: number, s: any) => sum + s.sharesOwned, 0) < data.originalTotalShares && (
                  <div className="text-red-500 font-normal text-xs normal-case mt-1 bg-red-50 p-2 rounded border border-red-100">
                    * Total lembar saham ({formatInputNumber(data.shareholders.reduce((sum: number, s: any) => sum + s.sharesOwned, 0))}) kurang dari Modal Ditempatkan & Disetor Lama ({formatInputNumber(data.originalTotalShares)} lembar)
                  </div>
                )}
              </div>
           </div>
        </AhuSection>

        {/* 1. GENERAL INFORMATION */}
        <AhuSection title="General Information">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Nama Perseroan" required />
              <div className="md:col-span-3">
                <AhuInput 
                  value={data.companyName || ''} 
                  readOnly
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Nama Singkat" />
              <div className="md:col-span-3">
                <AhuInput 
                  value={data.companyShortName || ''} 
                  readOnly
                  placeholder="Contoh: PT ABC"
                />
              </div>
            </div>
          </div>
        </AhuSection>

        {/* 2. COMPANY IDENTITY */}
        <AhuSection title="Company Identity">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Tipe Perseroan" />
              <div className="md:col-span-3">
                <AhuSelect 
                  value={data.companyType || 'SWASTA NASIONAL'} 
                  disabled
                >
                  <option value="SWASTA NASIONAL">SWASTA NASIONAL</option>
                  <option value="CV">CV</option>
                  <option value="PMA">PMA</option>
                </AhuSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="NPWP" />
              <div className="md:col-span-3">
                <AhuInput 
                  value={data.npwp || ''} 
                  readOnly
                  placeholder="00.000.000.0-000.000"
                />
              </div>
            </div>
          </div>
        </AhuSection>

        {/* 3. LEGAL INFORMATION */}
        <AhuSection title="Legal Information">
          <div className="space-y-6">
            {/* AKTA PENDIRIAN */}
            <div className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50">
              <h3 className="font-bold text-[13px] text-slate-800">Akta Pendirian</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <AhuLabel label="Nomor Akta" />
                <div className="md:col-span-3">
                  <AhuInput value={data.establishmentDeedNumber || ''} readOnly placeholder="Contoh: 12" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <AhuLabel label="Tanggal Akta" />
                <div className="md:col-span-3">
                  <AhuInput type="date" value={data.establishmentDeedDate || ''} readOnly />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <AhuLabel label="Pilih Notaris" />
                <div className="md:col-span-3">
                  <AhuSelect
                    value={data.establishmentNotary === 'Nukantini Putri Parincha' ? 'saya' : (data.establishmentNotary ? 'manual' : '')}
                    disabled
                  >
                    <option value="">-- Pilih Notaris --</option>
                    <option value="saya">Saya (Nukantini Putri Parincha, SH., M.Kn.)</option>
                    <option value="manual">Input Bebas</option>
                  </AhuSelect>
                </div>
              </div>
              {data.establishmentNotary !== 'Nukantini Putri Parincha' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <AhuLabel label="Nama Notaris" />
                <div className="md:col-span-3 flex gap-2">
                  <AhuInput 
                    className="flex-1"
                    value={data.establishmentNotary || ''} 
                    readOnly 
                    placeholder="Nama notaris pendirian" 
                  />
                  <div className="w-48 flex flex-col gap-1">
                    <AhuSelect
                      value={['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(data.establishmentNotaryTitle || '') ? data.establishmentNotaryTitle : (data.establishmentNotaryTitle ? 'manual' : '')}
                      disabled
                    >
                      <option value="">-- Pilih Gelar --</option>
                      <option value="Sarjana Hukum">SH.</option>
                      <option value="Sarjana Hukum, Magister Kenotariatan">SH., M.Kn.</option>
                      <option value="manual">Manual</option>
                    </AhuSelect>
                    {( !['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(data.establishmentNotaryTitle || '') || (data.establishmentNotaryTitle === 'manual')) && data.establishmentNotaryTitle !== undefined && (
                       <AhuInput 
                         placeholder="Gelar manual..." 
                         value={data.establishmentNotaryTitle === 'manual' ? '' : data.establishmentNotaryTitle}
                         readOnly
                       />
                    )}
                  </div>
                </div>
              </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <AhuLabel label="Kedudukan Notaris" />
                <div className="md:col-span-3">
                  <AhuInput 
                    value={data.establishmentNotaryDomicile || ''} 
                    readOnly 
                    placeholder="Contoh: Kabupaten Bandung Barat" 
                    disabled
                    className={data.establishmentNotary === 'Nukantini Putri Parincha' ? 'bg-slate-100 font-bold' : ''}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <AhuLabel label="Nomor SK" />
                <div className="md:col-span-3">
                  <AhuInput value={data.establishmentSkNumber || ''} readOnly placeholder="Nomor SK Kemenkumham" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <AhuLabel label="Tanggal SK" />
                <div className="md:col-span-3">
                  <AhuInput type="date" value={data.establishmentSkDate || ''} readOnly />
                </div>
              </div>
            </div>

            {/* AKTA PERUBAHAN */}
            {(data.amendmentDeeds || []).map((deed: any, index: number) => (
              <div key={deed.id} className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50 relative">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                  <h3 className="font-bold text-[13px] text-slate-800 uppercase tracking-tight">Akta Perubahan {index + 1}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Nomor Akta" />
                  <div className="md:col-span-3">
                    <AhuInput 
                      value={deed.number || ''} 
                      readOnly 
                      placeholder="Contoh: 05" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Tanggal Akta" />
                  <div className="md:col-span-3">
                    <AhuInput 
                      type="date" 
                      value={deed.date || ''} 
                      readOnly 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Pilih Notaris" />
                  <div className="md:col-span-3">
                    <AhuSelect
                      value={deed.notary === 'Nukantini Putri Parincha' ? 'saya' : (deed.notary ? 'manual' : '')}
                      disabled
                    >
                      <option value="">-- Pilih Notaris --</option>
                      <option value="saya">Saya (Nukantini Putri Parincha, SH., M.Kn.)</option>
                      <option value="manual">Input Bebas</option>
                    </AhuSelect>
                  </div>
                </div>
                {deed.notary !== 'Nukantini Putri Parincha' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Nama Notaris" />
                  <div className="md:col-span-3 flex gap-2">
                    <AhuInput 
                      className="flex-1"
                      value={deed.notary || ''} 
                      readOnly 
                      placeholder="Nama notaris perubahan" 
                    />
                    <div className="w-48 flex flex-col gap-1">
                      <AhuSelect
                        value={['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(deed.notaryTitle || '') ? deed.notaryTitle : (deed.notaryTitle ? 'manual' : '')}
                        disabled
                      >
                        <option value="">-- Pilih Gelar --</option>
                        <option value="Sarjana Hukum">SH.</option>
                        <option value="Sarjana Hukum, Magister Kenotariatan">SH., M.Kn.</option>
                        <option value="manual">Manual</option>
                      </AhuSelect>
                      {(!['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(deed.notaryTitle || '') || (deed.notaryTitle === 'manual')) && deed.notaryTitle !== undefined && (
                         <AhuInput 
                           placeholder="Gelar manual..." 
                           value={deed.notaryTitle === 'manual' ? '' : deed.notaryTitle}
                           readOnly
                         />
                      )}
                    </div>
                  </div>
                </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <AhuLabel label="Kedudukan Notaris" />
                  <div className="md:col-span-3">
                    <AhuInput 
                      value={deed.notaryDomicile || ''} 
                      readOnly 
                      placeholder="Contoh: Kabupaten Bogor" 
                      disabled
                      className={deed.notary === 'Nukantini Putri Parincha' ? 'bg-slate-100 font-bold' : ''}
                    />
                  </div>
                </div>
                
                <div className="bg-slate-50/50 p-3 border border-slate-100 rounded-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Daftar SK / SP Terkait</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {(deed.skSpDocuments || []).map((doc: any, docIdx: number) => (
                      <div key={doc.id} className="grid grid-cols-1 md:grid-cols-9 gap-2 items-end border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                        <div className="md:col-span-2">
                          <AhuLabel label="Tipe" />
                          <AhuSelect 
                            value={doc.type} 
                            disabled
                          >
                            <option value="SK">SK (Keputusan)</option>
                            <option value="SP_DATA_PERSEROAN">SP (Perubahan Data Perseroan)</option>
                            <option value="SP_ANGGARAN_DASAR">SP (Perubahan Anggaran Dasar)</option>
                            <option value="SP">SP (Lainnya)</option>
                          </AhuSelect>
                        </div>
                        <div className="md:col-span-4">
                          <AhuLabel label="Nomor" />
                          <AhuInput 
                            value={doc.number || ''} 
                            readOnly
                            placeholder="Nomor SK/SP"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <AhuLabel label="Tanggal" />
                          <AhuInput 
                            type="date"
                            value={doc.date || ''} 
                            readOnly
                          />
                        </div>
                      </div>
                    ))}
                    
                    {(deed.skSpDocuments || []).length === 0 && (
                      <div className="text-[11px] text-slate-400 italic mb-2">Belum ada SK/SP yang ditambahkan.</div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* MAKSUD DAN TUJUAN (KBLI) PERSEROAN */}
            <div className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50">
              <h3 className="font-bold text-[13px] text-slate-800">Maksud Dan Tujuan (KBLI) Perseroan</h3>
              <div className="space-y-4">
                {/* Selected KBLIs List Table */}
                <div className="w-full bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[12px]">
                      <thead>
                        <tr className="bg-[#f8fafc] border-b border-slate-200 uppercase font-semibold text-slate-600 text-[11px] tracking-wider">
                          <th className="px-4 py-3 text-center w-12 border-r border-slate-200 text-[#3b5998]">No</th>
                          <th className="px-4 py-3 text-center w-24 border-r border-slate-200">Kode KBLI</th>
                          <th className="px-4 py-3 text-left w-64 border-r border-slate-200">Judul KBLI</th>
                          <th className="px-4 py-3 text-left border-r border-slate-200">Uraian / Deskripsi Kegiatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(data.kbliItems || []).map((item: any, idx: number) => (
                          <tr key={item.id} className="hover:bg-slate-50/40">
                            <td className="px-4 py-3 text-center border-r border-slate-100 text-slate-500 font-bold align-top">{idx + 1}</td>
                            <td className="px-4 py-3 text-center border-r border-slate-100 font-mono text-slate-800 font-semibold align-top">{item.code}</td>
                            <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-800 align-top uppercase leading-tight">{item.name}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-600 align-top">
                              <textarea
                                value={item.description || ''}
                                readOnly
                                className="w-full text-[11px] p-2 border border-slate-200 rounded font-medium focus:border-[#3b5998] outline-none bg-slate-50 text-slate-800 resize-y min-h-[90px]"
                                placeholder="Uraian kegiatan..."
                              />
                            </td>
                          </tr>
                        ))}
                        {(!data.kbliItems || data.kbliItems.length === 0) && (
                          <tr>
                            <td colSpan={4} className="text-center py-10 text-slate-400 italic">
                              Belum ada data KBLI terpilih.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AhuSection>

        {/* 4. COMPANY STATUS */}
        <AhuSection title="Company Status">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Status Perseroan" />
              <div className="md:col-span-3">
                <AhuSelect 
                  value={data.status || 'tertutup'} 
                  disabled
                >
                  <option value="tertutup">Tertutup</option>
                  <option value="terbuka">Terbuka</option>
                </AhuSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Jangka Waktu Berdiri" />
              <div className="md:col-span-3">
                <AhuSelect 
                  value={data.duration || 'TIDAK TERBATAS'} 
                  disabled
                >
                  <option value="TIDAK TERBATAS">Tidak Terbatas</option>
                  <option value="TERBATAS">Terbatas</option>
                </AhuSelect>
              </div>
            </div>
          </div>
        </AhuSection>

        {/* 5. COMPANY CONTACT */}
        <AhuSection title="Company Contact">
          <div className="text-slate-400 italic text-[12px] p-2 bg-slate-50 border border-slate-100 rounded-sm">
            Detail kontak dan alamat lengkap akan dimigrasikan pada fase berikutnya.
          </div>
        </AhuSection>
      </fieldset>
    </div>
  );
};
export default CompanyDetail;
