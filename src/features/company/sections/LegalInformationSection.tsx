import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AhuSection, AhuLabel, AhuInput, AhuSelect } from '../components/CompanyForm';

interface LegalInformationSectionProps {
  data: any;
  updateData: (fields: any) => void;
  setIsAddKbliModalOpen: (val: boolean) => void;
}

export const LegalInformationSection: React.FC<LegalInformationSectionProps> = ({
  data,
  updateData,
  setIsAddKbliModalOpen,
}) => {
  return (
    <AhuSection title="Legal Information">
      <div className="space-y-6">
        {/* AKTA PENDIRIAN */}
        <div className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50">
          <h3 className="font-bold text-[13px] text-slate-800">Akta Pendirian</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <AhuLabel label="Nomor Akta" />
            <div className="md:col-span-3">
              <AhuInput value={data.establishmentDeedNumber || ''} onChange={e => updateData({ establishmentDeedNumber: e.target.value })} placeholder="Contoh: 12" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <AhuLabel label="Tanggal Akta" />
            <div className="md:col-span-3">
              <AhuInput type="date" value={data.establishmentDeedDate || ''} onChange={e => updateData({ establishmentDeedDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <AhuLabel label="Pilih Notaris" />
            <div className="md:col-span-3">
              <AhuSelect
                value={data.establishmentNotary === 'Nukantini Putri Parincha' ? 'saya' : (data.establishmentNotary ? 'manual' : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'saya') {
                    updateData({
                      establishmentNotary: 'Nukantini Putri Parincha',
                      establishmentNotaryTitle: 'Sarjana Hukum, Magister Kenotariatan',
                      establishmentNotaryDomicile: 'Kabupaten Bandung Barat'
                    });
                  } else if (val === 'manual') {
                    updateData({
                      establishmentNotary: '',
                      establishmentNotaryTitle: '',
                      establishmentNotaryDomicile: ''
                    });
                  } else {
                    updateData({ establishmentNotary: '', establishmentNotaryTitle: '', establishmentNotaryDomicile: '' });
                  }
                }}
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
                onChange={e => updateData({ establishmentNotary: e.target.value })} 
                placeholder="Nama notaris pendirian" 
              />
              <div className="w-48 flex flex-col gap-1">
                <AhuSelect
                  value={['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(data.establishmentNotaryTitle || '') ? data.establishmentNotaryTitle : (data.establishmentNotaryTitle ? 'manual' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'manual') {
                      // Keep current title but allow editing
                    } else {
                      updateData({ establishmentNotaryTitle: val });
                    }
                  }}
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
                     onChange={e => updateData({ establishmentNotaryTitle: e.target.value })}
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
                onChange={e => updateData({ establishmentNotaryDomicile: e.target.value })} 
                placeholder="Contoh: Kabupaten Bandung Barat" 
                disabled={data.establishmentNotary === 'Nukantini Putri Parincha'}
                className={data.establishmentNotary === 'Nukantini Putri Parincha' ? 'bg-slate-100 font-bold' : ''}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <AhuLabel label="Nomor SK" />
            <div className="md:col-span-3">
              <AhuInput value={data.establishmentSkNumber || ''} onChange={e => updateData({ establishmentSkNumber: e.target.value })} placeholder="Nomor SK Kemenkumham" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <AhuLabel label="Tanggal SK" />
            <div className="md:col-span-3">
              <AhuInput type="date" value={data.establishmentSkDate || ''} onChange={e => updateData({ establishmentSkDate: e.target.value })} />
            </div>
          </div>
        </div>

        {/* AKTA PERUBAHAN */}
        {(data.amendmentDeeds || []).map((deed: any, index: number) => (
          <div key={deed.id} className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50 relative">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
              <h3 className="font-bold text-[13px] text-slate-800 uppercase tracking-tight">Akta Perubahan {index + 1}</h3>
              <button 
                onClick={() => {
                  const newList = (data.amendmentDeeds || []).filter((d: any) => d.id !== deed.id);
                  updateData({ amendmentDeeds: newList });
                }}
                className="text-red-500 hover:text-red-700 p-1 transition-colors"
                title="Hapus Akta Perubahan"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Nomor Akta" />
              <div className="md:col-span-3">
                <AhuInput 
                  value={deed.number || ''} 
                  onChange={e => {
                    const newList = [...(data.amendmentDeeds || [])];
                    newList[index] = { ...deed, number: e.target.value };
                    updateData({ amendmentDeeds: newList });
                  }} 
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
                  onChange={e => {
                    const newList = [...(data.amendmentDeeds || [])];
                    newList[index] = { ...deed, date: e.target.value };
                    updateData({ amendmentDeeds: newList });
                  }} 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <AhuLabel label="Pilih Notaris" />
              <div className="md:col-span-3">
                <AhuSelect
                  value={deed.notary === 'Nukantini Putri Parincha' ? 'saya' : (deed.notary ? 'manual' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    const newList = [...(data.amendmentDeeds || [])];
                    if (val === 'saya') {
                      newList[index] = { 
                        ...deed, 
                        notary: 'Nukantini Putri Parincha',
                        notaryTitle: 'Sarjana Hukum, Magister Kenotariatan',
                        notaryDomicile: 'Kabupaten Bandung Barat'
                      };
                    } else if (val === 'manual') {
                      newList[index] = { 
                        ...deed, 
                        notary: '',
                        notaryTitle: '',
                        notaryDomicile: ''
                      };
                    } else {
                      newList[index] = { ...deed, notary: '', notaryTitle: '', notaryDomicile: ' ' };
                    }
                    updateData({ amendmentDeeds: newList });
                  }}
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
                  onChange={e => {
                    const newList = [...(data.amendmentDeeds || [])];
                    newList[index] = { ...deed, notary: e.target.value };
                    updateData({ amendmentDeeds: newList });
                  }} 
                  placeholder="Nama notaris perubahan" 
                />
                <div className="w-48 flex flex-col gap-1">
                  <AhuSelect
                    value={['Sarjana Hukum', 'Sarjana Hukum, Magister Kenotariatan'].includes(deed.notaryTitle || '') ? deed.notaryTitle : (deed.notaryTitle ? 'manual' : '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newList = [...(data.amendmentDeeds || [])];
                      if (val === 'manual') {
                         newList[index] = { ...deed, notaryTitle: deed.notaryTitle || ' ' };
                      } else {
                         newList[index] = { ...deed, notaryTitle: val };
                      }
                      updateData({ amendmentDeeds: newList });
                    }}
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
                       onChange={e => {
                         const newList = [...(data.amendmentDeeds || [])];
                         newList[index] = { ...deed, notaryTitle: e.target.value };
                         updateData({ amendmentDeeds: newList });
                       }}
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
                  onChange={e => {
                    const newList = [...(data.amendmentDeeds || [])];
                    newList[index] = { ...deed, notaryDomicile: e.target.value };
                    updateData({ amendmentDeeds: newList });
                  }} 
                  placeholder="Contoh: Kabupaten Bogor" 
                  disabled={deed.notary === 'Nukantini Putri Parincha'}
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
                        onChange={e => {
                          const newList = [...(data.amendmentDeeds || [])];
                          const newDocs = [...(deed.skSpDocuments || [])];
                          newDocs[docIdx] = { ...doc, type: e.target.value as any };
                          newList[index] = { ...deed, skSpDocuments: newDocs };
                          updateData({ amendmentDeeds: newList });
                        }}
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
                        onChange={e => {
                          const newList = [...(data.amendmentDeeds || [])];
                          const newDocs = [...(deed.skSpDocuments || [])];
                          newDocs[docIdx] = { ...doc, number: e.target.value };
                          newList[index] = { ...deed, skSpDocuments: newDocs };
                          updateData({ amendmentDeeds: newList });
                        }}
                        placeholder="Nomor SK/SP"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <AhuLabel label="Tanggal" />
                      <AhuInput 
                        type="date"
                        value={doc.date || ''} 
                        onChange={e => {
                          const newList = [...(data.amendmentDeeds || [])];
                          const newDocs = [...(deed.skSpDocuments || [])];
                          newDocs[docIdx] = { ...doc, date: e.target.value };
                          newList[index] = { ...deed, skSpDocuments: newDocs };
                          updateData({ amendmentDeeds: newList });
                        }}
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-center pb-1">
                      <button 
                        onClick={() => {
                          const newList = [...(data.amendmentDeeds || [])];
                          const newDocs = (deed.skSpDocuments || []).filter((d: any) => d.id !== doc.id);
                          newList[index] = { ...deed, skSpDocuments: newDocs };
                          updateData({ amendmentDeeds: newList });
                        }}
                        className="text-red-400 hover:text-red-600 p-1 transition-colors"
                        title="Hapus SK/SP"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {(deed.skSpDocuments || []).length === 0 && (
                  <div className="text-[11px] text-slate-400 italic mb-2">Belum ada SK/SP yang ditambahkan.</div>
                )}

                <button 
                  onClick={() => {
                    const newList = [...(data.amendmentDeeds || [])];
                    const newDoc = { id: crypto.randomUUID(), type: 'SK' as const, number: '', date: '' };
                    newList[index] = { ...deed, skSpDocuments: [...(deed.skSpDocuments || []), newDoc] };
                    updateData({ amendmentDeeds: newList });
                  }}
                  className="bg-white border border-[#3b5998]/30 text-[#3b5998] hover:bg-[#3b5998] hover:text-white px-3 py-1 rounded-sm text-[11px] font-bold flex items-center gap-1 transition-all"
                >
                  <Plus size={12} /> TAMBAH SK / SP
                </button>
              </div>
            </div>
          </div>
        ))}

        <button 
          onClick={() => {
            const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', notaryDomicile: '', skNumber: '', skDate: '', skSpDocuments: [] };
            updateData({ amendmentDeeds: [...(data.amendmentDeeds || []), newDeed] });
          }}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-sm text-slate-400 hover:border-[#3b5998] hover:text-[#3b5998] hover:bg-slate-50 transition-all group"
        >
          <Plus size={16} className="group-hover:scale-110 transition-transform" />
          <span className="text-[13px] font-bold uppercase tracking-wider">Tambah Akta Perubahan (Opsional)</span>
        </button>

        {/* MAKSUD DAN TUJUAN (KBLI) PERSEROAN */}
        <div className="border border-slate-200 rounded-sm p-4 space-y-4 bg-white/50">
          <h3 className="font-bold text-[13px] text-slate-800">Maksud Dan Tujuan (KBLI) Perseroan</h3>
          <div className="space-y-4">
            {/* Tambah KBLI Button */}
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setIsAddKbliModalOpen(true)}
                className="px-4 py-2 bg-[#3b5998] hover:bg-[#2d4373] text-white text-[12px] font-bold rounded-sm transition-all focus:outline-none flex items-center gap-1.5 uppercase shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Data KBLI
              </button>
            </div>

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
                      <th className="px-4 py-3 text-center w-20 text-[#3b5998]">Aksi</th>
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
                            onChange={(e) => {
                              updateData({
                                kbliItems: (data.kbliItems || []).map((k: any) =>
                                  k.id === item.id ? { ...k, description: e.target.value } : k
                                )
                              });
                            }}
                            className="w-full text-[11px] p-2 border border-slate-200 rounded font-medium focus:border-[#3b5998] outline-none bg-white text-slate-800 resize-y min-h-[90px]"
                            placeholder="Edit uraian kegiatan jika diperlukan..."
                          />
                        </td>
                        <td className="px-4 py-3 text-center align-top whitespace-nowrap">
                          <button 
                            onClick={() => updateData({ kbliItems: (data.kbliItems || []).filter((k: any) => k.id !== item.id) })}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                            title="Hapus KBLI"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!data.kbliItems || data.kbliItems.length === 0) && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-slate-400 italic">
                          Belum ada data KBLI terpilih. Silakan klik tombol "Tambah Data KBLI" di atas.
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
  );
};
