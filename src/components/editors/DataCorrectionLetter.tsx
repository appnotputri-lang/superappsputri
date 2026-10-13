import React, { useState } from 'react';
import { Mail, Printer, Download, FileText, Plus, Trash2, CheckCircle2, User, Building, ShieldCheck } from 'lucide-react';
import { PageContainer, PageHeader } from '../ui/PageLayout';
import { 
  DataCorrectionData, 
  DataCorrectionPersonnel, 
  generateSuratPermohonanBlob, 
  generateSuratKuasaBlob, 
  transactionTypeMap,
  formatCityDate,
  formatDateIndo
} from '../../lib/generateDataCorrectionDocx';
import { saveAs } from 'file-saver';

export const DataCorrectionLetter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'form' | 'permohonan' | 'kuasa'>('form');
  const [isGenerating, setIsGenerating] = useState(false);

  const [data, setData] = useState<DataCorrectionData>({
    letterNumber: '01/PERBAIKAN-DATA/X/2026',
    date: new Date().toISOString().split('T')[0],
    companyName: 'PT MAJU SEJAHTERA ABADI',
    companyAddress: 'Jl. Jend. Sudirman Kav. 21-23, RT. 004 / RW. 003, Kel. Karet Semanggi, Kec. Setiabudi, Kota Administrasi Jakarta Selatan, DKI Jakarta',
    recipientAddress: 'Gedung Direktorat Jenderal AHU, Jl. H.R. Rasuna Said Kav. 4-5, Kuningan, Jakarta Selatan',
    
    transactionType: 'SK Pendirian',
    documentNumber: 'AHU-00123.AH.01.01.TANGGAL 2024',
    documentDate: '2024-05-18',
    deedNumber: '15',
    deedDate: '2024-05-18',
    notaryName: 'NUKANTINI PUTRI PARINCHA, S.H., M.Kn.',

    signerName: 'VICTORY HENDRIO',
    signerNik: '3171012345670001',
    signerPosition: 'Direktur Utama',
    actingOnBehalfOf: 'PT MAJU SEJAHTERA ABADI',

    personnel: [
      {
        id: '1',
        name: 'VICTORY HENDRIO',
        position: 'Direktur Utama',
        sharesCount: '500',
        oldPhone: '081234567890',
        newPhone: '081299998888',
        oldEmail: 'victory.old@maju.com',
        newEmail: 'victory@majus sejahtera.com'
      },
      {
        id: '2',
        name: 'DONI MALVINO',
        position: 'Komisaris Utama',
        sharesCount: '300',
        oldPhone: '081398765432',
        newPhone: '081388887777',
        oldEmail: 'doni.old@maju.com',
        newEmail: 'doni@majus sejahtera.com'
      }
    ],

    powerLetterNumber: '02/KUASA-PERBAIKAN/X/2026',
    granteeName: 'NENDI SUHENDI',
    granteePosition: 'Staff Legal & Perizinan',
    granteePositionTitle: 'Kuasa Pengurusan',
    granteeOfficeAddress: 'Komp. PPR ITB Kav. F-5, Mekarwangi, Lembang, Kabupaten Bandung Barat',
    granteeSkInfo: 'Surat Tugas No. 05/ST/X/2026 tanggal 10 Oktober 2026'
  });

  const updateField = (field: keyof DataCorrectionData, val: any) => {
    setData(prev => ({ ...prev, [field]: val }));
  };

  const handlePersonnelChange = (id: string, field: keyof DataCorrectionPersonnel, val: string) => {
    setData(prev => ({
      ...prev,
      personnel: prev.personnel.map(p => p.id === id ? { ...p, [field]: val } : p)
    }));
  };

  const addPersonnel = () => {
    const newPerson: DataCorrectionPersonnel = {
      id: Date.now().toString(),
      name: '',
      position: 'Pemegang Saham / Direksi',
      sharesCount: '100',
      oldPhone: '',
      newPhone: '',
      oldEmail: '',
      newEmail: ''
    };
    setData(prev => ({ ...prev, personnel: [...prev.personnel, newPerson] }));
  };

  const removePersonnel = (id: string) => {
    setData(prev => ({ ...prev, personnel: prev.personnel.filter(p => p.id !== id) }));
  };

  const downloadPermohonan = async () => {
    try {
      setIsGenerating(true);
      const blob = await generateSuratPermohonanBlob(data);
      const safeName = (data.companyName || 'Perseroan').toUpperCase().replace(/[^A-Z0-9]/g, '_');
      saveAs(blob, `Surat_Permohonan_Perbaikan_Data_${safeName}.docx`);
    } catch (err) {
      console.error(err);
      alert('Gagal menghasilkan dokumen Surat Permohonan.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadKuasa = async () => {
    try {
      setIsGenerating(true);
      const blob = await generateSuratKuasaBlob(data);
      const safeName = (data.companyName || 'Perseroan').toUpperCase().replace(/[^A-Z0-9]/g, '_');
      saveAs(blob, `Surat_Kuasa_Perbaikan_Data_${safeName}.docx`);
    } catch (err) {
      console.error(err);
      alert('Gagal menghasilkan dokumen Surat Kuasa.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadBoth = async () => {
    await downloadPermohonan();
    await downloadKuasa();
  };

  const fullDocTypeName = transactionTypeMap[data.transactionType] || 'SK PENGESAHAN PENDIRIAN';

  return (
    <PageContainer>
      <PageHeader
        icon={<Mail className="w-5 h-5 text-white" />}
        title="Surat Perbaikan Data (Kemenkumham)"
        description="Generator Surat Permohonan Perbaikan Data & Surat Kuasa Resmi AHU Kemenkumham"
        actions={
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadBoth}
              disabled={isGenerating}
              className="px-4 py-2 bg-[#3b5998] hover:bg-[#324b82] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {isGenerating ? 'Memproses...' : 'Unduh Kedua Dokumen (DOCX)'}
            </button>
            <button 
              onClick={() => window.print()} 
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-2 border border-slate-200 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> CETAK
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 bg-white rounded-t-xl px-4 pt-2">
        <button
          onClick={() => setActiveTab('form')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'form' ? 'border-[#3b5998] text-[#3b5998]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> 1. Form & Data Perbaikan
        </button>
        <button
          onClick={() => setActiveTab('permohonan')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'permohonan' ? 'border-[#3b5998] text-[#3b5998]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" /> 2. Preview Surat Permohonan
        </button>
        <button
          onClick={() => setActiveTab('kuasa')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'kuasa' ? 'border-[#3b5998] text-[#3b5998]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> 3. Preview Surat Kuasa
        </button>
      </div>

      {activeTab === 'form' && (
        <div className="space-y-6">
          {/* Card 1: Informasi Surat & Perseroan */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#3b5998]" /> Informasi Perseroan & Surat
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Perseroan (PT)</label>
                <input 
                  type="text" 
                  value={data.companyName} 
                  onChange={e => updateField('companyName', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Surat Permohonan</label>
                <input 
                  type="text" 
                  value={data.letterNumber} 
                  onChange={e => updateField('letterNumber', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Surat</label>
                <input 
                  type="date" 
                  value={data.date} 
                  onChange={e => updateField('date', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Lengkap Perseroan</label>
                <input 
                  type="text" 
                  value={data.companyAddress} 
                  onChange={e => updateField('companyAddress', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Tujuan (Kementerian Hukum)</label>
                <input 
                  type="text" 
                  value={data.recipientAddress} 
                  onChange={e => updateField('recipientAddress', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Dasar Transaksi Terakhir */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3b5998]" /> Dasar Transaksi Terakhir (SK / SP)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Dokumen Dasar</label>
                <select
                  value={data.transactionType}
                  onChange={e => updateField('transactionType', e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold bg-white"
                >
                  <option value="SK Pendirian">SK Pendirian</option>
                  <option value="SK Perubahan">SK Perubahan</option>
                  <option value="SP Anggaran Dasar">SP Anggaran Dasar</option>
                  <option value="SP Perubahan Data">SP Perubahan Data</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 italic">{fullDocTypeName}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor SK / Surat Penerimaan</label>
                <input 
                  type="text" 
                  value={data.documentNumber} 
                  onChange={e => updateField('documentNumber', e.target.value)}
                  placeholder="Contoh: AHU-00123..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal SK / Surat Penerimaan</label>
                <input 
                  type="date" 
                  value={data.documentDate} 
                  onChange={e => updateField('documentDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Akta Notaris (Opsional)</label>
                <input 
                  type="text" 
                  value={data.deedNumber} 
                  onChange={e => updateField('deedNumber', e.target.value)}
                  placeholder="Contoh: 15"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Akta Notaris</label>
                <input 
                  type="date" 
                  value={data.deedDate} 
                  onChange={e => updateField('deedDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama & Kedudukan Notaris</label>
                <input 
                  type="text" 
                  value={data.notaryName} 
                  onChange={e => updateField('notaryName', e.target.value)}
                  placeholder="Contoh: NUKANTINI PUTRI PARINCHA, S.H., M.Kn."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Identitas Penandatangan (Pemohon / Direktur) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-[#3b5998]" /> Identitas Penandatangan (Direksi / Pemohon)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Penandatangan</label>
                <input 
                  type="text" 
                  value={data.signerName} 
                  onChange={e => updateField('signerName', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">NIK Penandatangan</label>
                <input 
                  type="text" 
                  value={data.signerNik} 
                  onChange={e => updateField('signerNik', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jabatan Penandatangan</label>
                <input 
                  type="text" 
                  value={data.signerPosition} 
                  onChange={e => updateField('signerPosition', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Daftar Personel yang Diperbaiki Datanya */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2">
                <User className="w-4 h-4 text-[#3b5998]" /> Daftar Personel & Perubahan Data ({data.personnel.length})
              </h2>
              <button
                onClick={addPersonnel}
                className="px-3 py-1.5 bg-[#3b5998] text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-[#324b82] cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Personel
              </button>
            </div>

            <div className="space-y-4">
              {data.personnel.map((p, idx) => (
                <div key={p.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Personel #{idx + 1}</span>
                    {data.personnel.length > 1 && (
                      <button 
                        onClick={() => removePersonnel(p.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 cursor-pointer"
                        title="Hapus Personel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Lengkap</label>
                      <input 
                        type="text" 
                        value={p.name} 
                        onChange={e => handlePersonnelChange(p.id, 'name', e.target.value)}
                        placeholder="Nama Personel"
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jabatan di Perusahaan</label>
                      <input 
                        type="text" 
                        value={p.position} 
                        onChange={e => handlePersonnelChange(p.id, 'position', e.target.value)}
                        placeholder="Direktur / Komisaris / Pemegang Saham"
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jumlah Saham (jika ada)</label>
                      <input 
                        type="text" 
                        value={p.sharesCount} 
                        onChange={e => handlePersonnelChange(p.id, 'sharesCount', e.target.value)}
                        placeholder="Contoh: 500"
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">No. Telp / WhatsApp Lama</label>
                      <input 
                        type="text" 
                        value={p.oldPhone} 
                        onChange={e => handlePersonnelChange(p.id, 'oldPhone', e.target.value)}
                        placeholder="Nomor lama (boleh kosong)"
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 text-blue-700">No. Telp / WhatsApp Baru (Menjadi)</label>
                      <input 
                        type="text" 
                        value={p.newPhone} 
                        onChange={e => handlePersonnelChange(p.id, 'newPhone', e.target.value)}
                        placeholder="Nomor baru yang valid"
                        className="w-full px-3 py-1.5 text-xs border border-blue-300 rounded-lg bg-blue-50/30 font-semibold"
                      />
                    </div>
                    <div></div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email Lama</label>
                      <input 
                        type="text" 
                        value={p.oldEmail} 
                        onChange={e => handlePersonnelChange(p.id, 'oldEmail', e.target.value)}
                        placeholder="Email lama (boleh kosong)"
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1 text-blue-700">Email Baru (Menjadi)</label>
                      <input 
                        type="text" 
                        value={p.newEmail} 
                        onChange={e => handlePersonnelChange(p.id, 'newEmail', e.target.value)}
                        placeholder="Email baru yang valid"
                        className="w-full px-3 py-1.5 text-xs border border-blue-300 rounded-lg bg-blue-50/30 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 5: Surat Kuasa Details */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3b5998]" /> Informasi Surat Kuasa
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Surat Kuasa</label>
                <input 
                  type="text" 
                  value={data.powerLetterNumber} 
                  onChange={e => updateField('powerLetterNumber', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Penerima Kuasa</label>
                <input 
                  type="text" 
                  value={data.granteeName} 
                  onChange={e => updateField('granteeName', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jabatan / Pekerjaan Penerima</label>
                <input 
                  type="text" 
                  value={data.granteePosition} 
                  onChange={e => updateField('granteePosition', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Kantor Penerima</label>
                <input 
                  type="text" 
                  value={data.granteeOfficeAddress} 
                  onChange={e => updateField('granteeOfficeAddress', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor / Dasar Surat Tugas Penerima</label>
                <input 
                  type="text" 
                  value={data.granteeSkInfo} 
                  onChange={e => updateField('granteeSkInfo', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Surat Permohonan */}
      {activeTab === 'permohonan' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={downloadPermohonan}
              className="px-4 py-2 bg-[#3b5998] hover:bg-[#324b82] text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Unduh Surat Permohonan (.docx)
            </button>
          </div>

          <div className="bg-white p-12 rounded-xl border border-slate-300 shadow-md max-w-4xl mx-auto font-serif text-slate-900 leading-relaxed text-sm space-y-6">
            {/* Kop */}
            <div className="text-center border-b-2 border-black pb-4 space-y-1">
              <h1 className="font-bold text-xl uppercase tracking-wider">{data.companyName}</h1>
              <p className="text-xs text-slate-700">{data.companyAddress}</p>
            </div>

            {/* Nomor & Tanggal */}
            <div className="flex justify-between text-sm pt-2">
              <div>
                <p>Nomor : {data.letterNumber}</p>
                <p className="font-bold">Hal : Permohonan Perbaikan Data Email dan Nomor Telepon {data.companyName}</p>
              </div>
              <div className="text-right">
                <p>{formatCityDate(data.date, "Jakarta")}</p>
              </div>
            </div>

            {/* Tujuan */}
            <div className="space-y-0.5 text-sm pt-2">
              <p>Kepada Yth.</p>
              <p className="font-bold">Direktur Jenderal Administrasi Hukum Umum</p>
              <p className="font-bold">cq. Direktur Badan Usaha</p>
              <p className="font-bold">Kementerian Hukum</p>
              <p>di {data.recipientAddress}</p>
            </div>

            <p className="pt-2">Dengan Hormat,</p>

            <div className="space-y-1 text-justify">
              <p>Yang bertanda tangan di bawah ini:</p>
              <div className="pl-6 space-y-1">
                <p><span className="inline-block w-40">Nama</span>: <span className="font-bold">{data.signerName}</span></p>
                <p><span className="inline-block w-40">NIK</span>: {data.signerNik}</p>
                <p><span className="inline-block w-40">Jabatan</span>: <span className="font-bold">{data.signerPosition}</span></p>
                <p><span className="inline-block w-40">Bertindak Untuk</span>: Untuk dan atas nama {data.companyName}</p>
                <p><span className="inline-block w-40">Alamat Perseroan</span>: {data.companyAddress}</p>
              </div>
            </div>

            <p className="text-justify leading-relaxed">
              Dengan ini mengajukan permohonan perbaikan data email dan/atau nomor telepon pemegang saham, direksi, dan/atau komisaris pada Sistem Administrasi Badan Hukum, Direktorat Jenderal Administrasi Hukum Umum, Kementerian Hukum. 
              Adapun perbaikan data tersebut merujuk pada data yang tercatat dalam transaksi terakhir perseroan berdasarkan <b>{fullDocTypeName}</b> Nomor <b>{data.documentNumber}</b>, Tanggal <b>{formatDateIndo(data.documentDate)}</b>{data.deedNumber ? `, berdasarkan Akta Notaris ${data.notaryName} Nomor ${data.deedNumber} tanggal ${formatDateIndo(data.deedDate)}` : ''}.
            </p>

            {/* Personnel & Tables */}
            <div className="space-y-6 pt-2">
              {data.personnel.map((p, idx) => (
                <div key={p.id} className="space-y-2">
                  <div className="space-y-1">
                    <p className="font-bold">{idx + 1}. Nama &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {p.name.toUpperCase()}</p>
                    <p>&nbsp;&nbsp;&nbsp;Jabatan &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {p.position}</p>
                    <p>&nbsp;&nbsp;&nbsp;Jumlah Saham &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {p.sharesCount} lembar saham</p>
                  </div>

                  <table className="w-full border-collapse border border-black text-xs my-3">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-1.5 w-10 text-center">No.</th>
                        <th className="border border-black p-1.5 text-left">Keterangan</th>
                        <th className="border border-black p-1.5 text-left">Semula</th>
                        <th className="border border-black p-1.5 text-left">Menjadi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-1.5 text-center">1</td>
                        <td className="border border-black p-1.5">No. Telp / WhatsApp</td>
                        <td className="border border-black p-1.5">{p.oldPhone || '-'}</td>
                        <td className="border border-black p-1.5 font-bold text-blue-800">{p.newPhone || '-'}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-1.5 text-center">2</td>
                        <td className="border border-black p-1.5">Alamat Email</td>
                        <td className="border border-black p-1.5">{p.oldEmail || '-'}</td>
                        <td className="border border-black p-1.5 font-bold text-blue-800">{p.newEmail || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <p className="text-justify leading-relaxed pt-2">
              Permohonan ini diajukan karena data email dan/atau nomor telepon yang tercatat sebelumnya tidak sesuai atau keliru pengisian, sehingga tidak sesuai dengan kondisi yang sebenarnya. Adapun data yang diajukan untuk dilakukan perbaikan merupakan data yang benar, valid, aktif, dan dapat dipertanggungjawabkan, serta digunakan untuk kepentingan administrasi resmi Perseroan.
            </p>

            <p className="text-justify leading-relaxed">
              Sehubungan dengan hal tersebut, kami mohon kiranya Bapak/Ibu berkenan memproses permohonan perbaikan data dimaksud sesuai ketentuan peraturan perundang-undangan.
            </p>

            <p className="text-justify leading-relaxed">
              Demikian permohonan ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.
            </p>

            {/* Signer Block */}
            <div className="pt-8 flex justify-end">
              <div className="text-right space-y-16 w-72">
                <div>
                  <p>{data.signerPosition},</p>
                  <p className="font-bold uppercase">{data.companyName}</p>
                </div>
                <div>
                  <p className="font-bold underline">({data.signerName})</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Surat Kuasa */}
      {activeTab === 'kuasa' && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <button
              onClick={downloadKuasa}
              className="px-4 py-2 bg-[#3b5998] hover:bg-[#324b82] text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" /> Unduh Surat Kuasa (.docx)
            </button>
          </div>

          <div className="bg-white p-12 rounded-xl border border-slate-300 shadow-md max-w-4xl mx-auto font-serif text-slate-900 leading-relaxed text-sm space-y-6">
            {/* Kop */}
            <div className="text-center border-b-2 border-black pb-4 space-y-1">
              <h1 className="font-bold text-xl uppercase tracking-wider">{data.companyName}</h1>
              <p className="text-xs text-slate-700">{data.companyAddress}</p>
            </div>

            {/* Title */}
            <div className="text-center space-y-1 pt-2">
              <h2 className="font-bold text-lg uppercase">SURAT PERNYATAAN KUASA</h2>
              <p className="text-xs">Nomor : {data.powerLetterNumber}</p>
            </div>

            <div className="space-y-1 text-justify pt-2">
              <p>Yang bertanda tangan di bawah ini:</p>
              <div className="pl-6 space-y-1">
                <p><span className="inline-block w-40">Nama</span>: <span className="font-bold">{data.signerName}</span></p>
                <p><span className="inline-block w-40">NIK</span>: {data.signerNik}</p>
                <p><span className="inline-block w-40">Jabatan</span>: <span className="font-bold">{data.signerPosition}</span></p>
                <p><span className="inline-block w-40">Nama Perseroan</span>: {data.companyName}</p>
                <p><span className="inline-block w-40">Alamat Perseroan</span>: {data.companyAddress}</p>
              </div>
              <p className="font-bold pt-2">Selanjutnya disebut sebagai PEMBERI KUASA.</p>
            </div>

            <div className="space-y-1 text-justify pt-2">
              <p>Dengan ini memberikan kuasa kepada:</p>
              <div className="pl-6 space-y-1">
                <p><span className="inline-block w-40">Nama</span>: <span className="font-bold">{data.granteeName}</span></p>
                <p><span className="inline-block w-40">Jabatan / Pekerjaan</span>: {data.granteePosition}</p>
                <p><span className="inline-block w-40">Kedudukan</span>: {data.granteePositionTitle}</p>
                <p><span className="inline-block w-40">Alamat Kantor</span>: {data.granteeOfficeAddress}</p>
                <p><span className="inline-block w-40">Dasar Surat / Tugas</span>: {data.granteeSkInfo}</p>
              </div>
              <p className="font-bold pt-2">Selanjutnya disebut sebagai PENERIMA KUASA.</p>
            </div>

            <div className="text-center font-bold tracking-widest py-3">
              — — — — — — — — — — —  K H U S U S  — — — — — — — — — — —
            </div>

            <p className="text-justify leading-relaxed">
              Untuk dan atas nama PEMBERI KUASA melakukan tindakan administratif berupa penginputan dan/atau pengajuan permohonan perbaikan data terkait data email dan/atau nomor telepon pemegang saham, direksi, dan/atau dewan komisaris yang tercatat dalam data transaksi terakhir pada Sistem Administrasi Badan Hukum, Direktorat Jenderal Administrasi Hukum Umum, Kementerian Hukum, berdasarkan <b>{fullDocTypeName}</b> Nomor <b>{data.documentNumber}</b>, Tanggal <b>{formatDateIndo(data.documentDate)}</b>.
            </p>

            <p className="text-justify leading-relaxed">
              Surat kuasa ini berkaitan erat dengan Surat Permohonan {data.signerPosition} dari {data.companyName} Nomor : {data.letterNumber}, Tanggal : {formatDateIndo(data.date)}, perihal Permohonan Perbaikan Data Email dan Nomor Telepon.
            </p>

            <p className="text-justify leading-relaxed">
              Segala akibat hukum yang timbul sehubungan dengan pelaksanaan kuasa ini sepenuhnya menjadi tanggung jawab PEMBERI KUASA, dan dengan ini PEMBERI KUASA membebaskan PENERIMA KUASA dari segala tuntutan hukum sepanjang PENERIMA KUASA melaksanakan kuasa ini sesuai dengan ketentuan peraturan perundang-undangan.
            </p>

            <p className="text-justify leading-relaxed">
              Surat kuasa ini diberikan dengan tanpa hak substitusi dan berlaku sejak tanggal ditandatangani sampai dengan selesainya proses perbaikan data dimaksud.
            </p>

            <p className="text-justify leading-relaxed">
              Demikian surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya.
            </p>

            {/* Signatures */}
            <div className="pt-8 space-y-4">
              <div className="text-right">
                <p>{formatCityDate(data.date, "Jakarta")}</p>
              </div>
              <div className="flex justify-between pt-4">
                <div className="text-center space-y-16 w-72">
                  <div>
                    <p className="font-bold">PENERIMA KUASA,</p>
                  </div>
                  <div>
                    <p className="font-bold underline">({data.granteeName})</p>
                  </div>
                </div>
                <div className="text-center space-y-16 w-72">
                  <div>
                    <p className="font-bold">PEMBERI KUASA,</p>
                    <p className="font-bold uppercase">{data.companyName}</p>
                  </div>
                  <div>
                    <p className="font-bold underline">({data.signerName})</p>
                    <p>{data.signerPosition}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default DataCorrectionLetter;
