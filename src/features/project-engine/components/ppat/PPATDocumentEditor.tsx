import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, FileText, CheckCircle2,
  Download, Eye, User, Calendar, FileSignature,
  Plus, Trash2, ArrowUp, ArrowDown, Check, Building2,
  ShieldAlert, Sparkles, FileCheck
} from 'lucide-react';
import { Project, PPATData, PPATDocumentItem } from '../../../../domain/project/Project';
import { PPAT_DOC_TYPES } from './ppatDocTypes';
import { PPATDocumentPreviewModal } from './PPATDocumentPreviewModal';
import { generateAnyPPATDocx } from './generatePPATDocx';

interface PPATDocumentEditorProps {
  project: Project;
  initialDoc: PPATDocumentItem;
  currentUser?: any;
  onBack: () => void;
  onSave: (savedDoc: PPATDocumentItem, updatedPPATData: PPATData) => Promise<void>;
  onManageMasterData?: () => void;
}

export const PPATDocumentEditor: React.FC<PPATDocumentEditorProps> = ({
  project,
  initialDoc,
  currentUser,
  onBack,
  onSave,
  onManageMasterData
}) => {
  // Local document state
  const [docItem, setDocItem] = useState<PPATDocumentItem>({
    ...initialDoc,
    letterDate: initialDoc.letterDate || new Date().toISOString().split('T')[0],
    letterLocation: initialDoc.letterLocation || 'Kabupaten Bandung Barat',
    status: initialDoc.status || 'draft',
    specificData: initialDoc.specificData || {}
  });

  // PPAT Base Data (Source of Truth from project.ppatData)
  const [ppatData, setPpatData] = useState<PPATData>(() => {
    return project.ppatData || {
      transactionType: project.projectType || 'Akta Jual Beli (AJB)',
      firstParties: [],
      secondParties: [],
      object: {}
    };
  });

  // Keep ppatData updated if project.ppatData changes
  useEffect(() => {
    if (project.ppatData) {
      setPpatData(project.ppatData);
    }
  }, [project.ppatData]);

  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const currentDocType = PPAT_DOC_TYPES.find(
    t => t.id === (docItem.documentType || docItem.typeId)
  );

  const firstParty = ppatData.firstParties?.[0];
  const secondParty = ppatData.secondParties?.[0];
  const obj = ppatData.object || {};

  const handleUpdateSpecificData = (key: string, value: any) => {
    setDocItem(prev => ({
      ...prev,
      specificData: {
        ...(prev.specificData || {}),
        [key]: value
      }
    }));
  };

  const handleAddAttachment = (defaultName = '') => {
    const newAtt = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: defaultName,
      documentNumber: '',
      documentDate: ''
    };
    setPpatData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAtt]
    }));
  };

  const handleUpdateAttachment = (index: number, updates: Partial<any>) => {
    setPpatData(prev => {
      const current = [...(prev.attachments || [])];
      if (current[index]) {
        current[index] = { ...current[index], ...updates };
      }
      return { ...prev, attachments: current };
    });
  };

  const handleDeleteAttachment = (index: number) => {
    setPpatData(prev => {
      const current = [...(prev.attachments || [])];
      current.splice(index, 1);
      return { ...prev, attachments: current };
    });
  };

  const handleMoveAttachment = (index: number, direction: 'up' | 'down') => {
    setPpatData(prev => {
      const current = [...(prev.attachments || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return prev;
      const temp = current[index];
      current[index] = current[targetIndex];
      current[targetIndex] = temp;
      return { ...prev, attachments: current };
    });
  };

  const handleLoadDefaultAttachments = () => {
    const certType = obj.certificateType ? obj.certificateType.replace('Hak ', 'M ').toUpperCase() : 'M';
    const certNum = obj.certificateNumber || '651';
    const certVillage = (obj.village || 'MEKARWANGI').replace(/^(desa|kelurahan)\s+/i, '').toUpperCase();
    const ajbNum = ppatData.nomorAkta ? `${ppatData.nomorAkta}/${ppatData.tahunAkta || new Date().getFullYear()}` : '01/2026';
    const ajbDate = ppatData.tanggalAkta || '';

    setPpatData(prev => ({
      ...prev,
      attachments: [
        { id: `att_1_${Date.now()}`, name: `ASLI ${certType} ${certNum}/DESA ${certVillage}`, documentNumber: '', documentDate: '' },
        { id: `att_2_${Date.now()}`, name: 'ASLI SURAT KUASA', documentNumber: prev.nomorSuratKuasa || '', documentDate: prev.tanggalSuratKuasa || '' },
        { id: `att_3_${Date.now()}`, name: `AJB ${ajbNum}`, documentNumber: '', documentDate: ajbDate }
      ]
    }));
  };

  const handleSave = async (targetStatus: 'draft' | 'final') => {
    setSaving(true);
    try {
      const updatedDoc: PPATDocumentItem = {
        ...docItem,
        status: targetStatus,
        updatedAt: new Date().toISOString()
      };

      const masterData = project.ppatData || ppatData;
      const mergedPPATData: PPATData = {
        ...masterData,
        attachments: ppatData.attachments || masterData.attachments,
        notes: docItem.notes || masterData.notes,
        nomorSuratKuasa: ppatData.nomorSuratKuasa || masterData.nomorSuratKuasa,
        tanggalSuratKuasa: ppatData.tanggalSuratKuasa ?? masterData.tanggalSuratKuasa,
        permohonanNomor: ppatData.permohonanNomor || masterData.permohonanNomor,
        permohonanTempat: ppatData.permohonanTempat || masterData.permohonanTempat,
        tandaBatas: ppatData.tandaBatas || masterData.tandaBatas,
        landUse: ppatData.landUse || masterData.landUse,
        landUseType: ppatData.landUseType || masterData.landUseType
      };

      await onSave(updatedDoc, mergedPPATData);

      setSaveSuccessMessage(targetStatus === 'final' ? 'Dokumen berhasil difinalisasi!' : 'Draf dokumen berhasil disimpan.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Save error:', err);
      alert('Gagal menyimpan dokumen. Silakan coba kembali.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadDocx = async () => {
    try {
      await generateAnyPPATDocx(docItem, project, ppatData);
    } catch (err) {
      console.error('Download error:', err);
      alert('Gagal mengunduh file Word.');
    }
  };

  // Check if current document type requires specific input forms
  const hasSpecificFields = [
    'pakta_integritas',
    'surat_persetujuan_keluarga',
    'lampiran_13_peralihan_hak',
    'surat_pernyataan_keaslian_dokumen_pengecekan',
    'surat_kuasa_ppat',
    'surat_keterangan_nilai_pajak'
  ].includes(docItem.documentType || '');

  return (
    <div className="space-y-6">
      {/* Top sticky action header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center justify-center shrink-0"
            title="Kembali ke Dokumen Proyek"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {docItem.category.toUpperCase()} PPAT
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                docItem.status === 'final' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {docItem.status === 'final' ? 'Selesai (Final)' : 'Draft'}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-1">
              {docItem.title}
            </h1>
            <p className="text-xs text-slate-500">
              Proyek: <span className="font-semibold text-slate-700">{project.title}</span> • Klien: <span className="font-semibold text-slate-700">{(project.clientSnapshot as any)?.companyName || 'Klien'}</span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowPreview(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>Pratinjau</span>
          </button>

          <button
            onClick={handleDownloadDocx}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-amber-200"
          >
            <Download className="w-4 h-4 text-amber-700" />
            <span>Unduh Word (.docx)</span>
          </button>

          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Draft'}</span>
          </button>

          <button
            onClick={() => handleSave('final')}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan & Selesai</span>
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium p-3 rounded-xl flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Single Source of Truth Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-blue-900">
              Sumber Data Utama: Master Data PPAT Proyek
            </p>
            <p className="text-blue-700 text-[11px] mt-0.5">
              Penjual: <strong className="text-slate-800">{firstParty?.name || 'Belum diisi'}</strong> • Pembeli: <strong className="text-slate-800">{secondParty?.name || 'Belum diisi'}</strong> • Objek: <strong className="text-slate-800">{obj.certificateNumber ? `${obj.certificateType || 'SHM'} No. ${obj.certificateNumber}` : 'Sertipikat belum diisi'}</strong>
            </p>
          </div>
        </div>
        {onManageMasterData && (
          <button
            onClick={onManageMasterData}
            className="px-3 py-1.5 bg-white hover:bg-blue-100 text-blue-800 font-bold text-[11px] rounded-lg border border-blue-300 transition-colors shadow-2xs shrink-0"
          >
            Ubah Master Data
          </button>
        )}
      </div>

      {/* Editor Content Area */}
      <div className="space-y-6">
        {/* Card: Administrasi Tanggal & Nomor Surat */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Administrasi Tanggal & Nomor Surat</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Nomor Surat / Register (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: 01/SP/PPAT/IX/2026"
                value={docItem.letterNumber || ''}
                onChange={(e) => setDocItem(prev => ({ ...prev, letterNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Tanggal Dokumen
              </label>
              <input
                type="date"
                value={docItem.letterDate || ''}
                onChange={(e) => setDocItem(prev => ({ ...prev, letterDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Tempat Penandatanganan
              </label>
              <input
                type="text"
                value={docItem.letterLocation || ''}
                onChange={(e) => setDocItem(prev => ({ ...prev, letterLocation: e.target.value }))}
                placeholder="Kabupaten Bandung Barat"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Informative notice for documents with no specific extra input fields */}
        {!hasSpecificFields && (
          <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-6 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Otomatis Menggunakan Master Data PPAT Proyek</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Seluruh data Pihak Pertama (Penjual), Pihak Kedua (Pembeli), Objek Tanah (Sertipikat, Luas, Batas), dan klausul hukum untuk dokumen <strong>{docItem.title}</strong> bersumber langsung dari Master Data PPAT Proyek ini. Tidak ada formulir isian tambahan yang perlu diisi di sini.
            </p>
          </div>
        )}

        {/* Section: Specific Document Fields based on Document Type */}
        {docItem.documentType === 'pakta_integritas' && (
          <div className="bg-amber-50/40 rounded-2xl border border-amber-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2 border-b border-amber-200 pb-3">
              <FileText className="w-4 h-4 text-amber-700" />
              <span>Pengaturan Pakta Integritas (Perda KBB No. 1/2024)</span>
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Pilih status pelaksanaan transaksi jual beli atau pemindahan hak untuk dicantumkan secara otomatis pada klausul Pakta Integritas.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status Transaksi (Telah / Akan) *
                </label>
                <select
                  value={docItem.specificData?.transactionStatus || obj.transactionStatus || 'telah'}
                  onChange={(e) => {
                    handleUpdateSpecificData('transactionStatus', e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold text-slate-800"
                >
                  <option value="telah">Telah Melakukan Transaksi (telah)</option>
                  <option value="akan">Akan Melakukan Transaksi (akan)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Klausul: "Kami <span className="font-bold">{docItem.specificData?.transactionStatus === 'akan' || obj.transactionStatus === 'akan' ? 'akan' : 'telah'}</span> melakukan..."
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nilai Transaksi / Pengakuan Nilai (Rp)
                </label>
                <input
                  type="number"
                  value={docItem.specificData?.agreedPrice ?? obj.transactionValue ?? 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    handleUpdateSpecificData('agreedPrice', val);
                  }}
                  placeholder="Contoh: 500000000"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold text-slate-800"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Rp {(docItem.specificData?.agreedPrice ?? obj.transactionValue ?? 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        )}

        {docItem.documentType === 'surat_persetujuan_keluarga' && (
          <div className="bg-amber-50/40 rounded-2xl border border-amber-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2 border-b border-amber-200 pb-3">
              <User className="w-4 h-4 text-amber-700" />
              <span>Persetujuan Pasangan (Suami / Istri / Ahli Waris)</span>
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Diperlukan untuk tanah/bangunan yang diperoleh selama perkawinan (harta bersama / gono-gini) atau memerlukan persetujuan keluarga.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Pasangan Yang Menyetujui *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Siti Aminah"
                  value={docItem.specificData?.spouseConsentName || ''}
                  onChange={(e) => handleUpdateSpecificData('spouseConsentName', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  NIK Pasangan *
                </label>
                <input
                  type="text"
                  placeholder="16 Digit NIK"
                  value={docItem.specificData?.spouseConsentNik || ''}
                  onChange={(e) => handleUpdateSpecificData('spouseConsentNik', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Hubungan Keluarga
                </label>
                <select
                  value={docItem.specificData?.spouseRelation || 'Istri Sah'}
                  onChange={(e) => handleUpdateSpecificData('spouseRelation', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium text-slate-800"
                >
                  <option value="Istri Sah">Istri Sah</option>
                  <option value="Suami Sah">Suami Sah</option>
                  <option value="Ahli Waris Bersama">Ahli Waris Bersama</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {docItem.documentType === 'lampiran_13_peralihan_hak' && (
          <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-3">
              <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-amber-700" />
                <span>Pengaturan Formulir Lampiran 13 – Permohonan Peralihan Hak BPN (Format Legal)</span>
              </h3>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Ukuran Kertas: LEGAL (8.5 × 14 Inci)
              </span>
            </div>

            {/* Ketentuan Banner */}
            <div className="bg-white/95 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2 shadow-2xs">
              <p className="font-bold text-amber-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Aturan Baku Template Lampiran 13:</span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 text-[11px]">
                <li><strong>Data Kuasa (Tetap):</strong> Nama: NENDI SUHENDI (32 Thn), KTP: 3217011507910016, Alamat: JL. SUKARESMI V NO.17, MEKARWANGI, LEMBANG, HP: 08111301991. Ditandatangani di bawah "Hormat Kami".</li>
                <li><strong>Bagian "Selaku Kuasa":</strong> Diisi 100% dari <strong>Data Pembeli</strong> (Pihak Kedua).</li>
              </ul>
            </div>

            {/* SECTION 1: SURAT KUASA & ADMINISTRASI PERMOHONAN */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Dasar Surat Kuasa & Administrasi Permohonan</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor Surat Kuasa
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 01/SK-PPAT/I/2026 (kosongkan jika belum ada)"
                    value={ppatData.nomorSuratKuasa || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, nomorSuratKuasa: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Tanggal Surat Kuasa
                    </label>
                    {ppatData.tanggalSuratKuasa && (
                      <button
                        type="button"
                        onClick={() => setPpatData(prev => ({ ...prev, tanggalSuratKuasa: '' }))}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold underline"
                      >
                        Kosongkan Tanggal (...)
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={ppatData.tanggalSuratKuasa || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, tanggalSuratKuasa: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor Permohonan BPN
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 12/BPN-KBB/2026 (kosongkan jika belum ada)"
                    value={ppatData.permohonanNomor || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, permohonanNomor: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tempat / Kota Kantor BPN
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Padalarang"
                    value={ppatData.permohonanTempat || 'Padalarang'}
                    onChange={(e) => setPpatData(prev => ({ ...prev, permohonanTempat: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanda Batas Fisik
                  </label>
                  <input
                    type="text"
                    placeholder="PATOK / PATOK BETON"
                    value={ppatData.tandaBatas || 'PATOK'}
                    onChange={(e) => setPpatData(prev => ({ ...prev, tandaBatas: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-slate-800 uppercase font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: FORMULIR PENGGUNAAN TANAH */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Formulir Penggunaan Tanah (Coret Pertanian / Non Pertanian)</span>
                </h4>
                <span className="text-[10px] text-slate-500 italic">*) Coret yang tidak perlu</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kategori Penggunaan Tanah (Pilihan Coretan):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPpatData(prev => ({ ...prev, landUseType: 'non_pertanian' }))}
                      className={`px-3 py-2 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                        ppatData.landUseType !== 'pertanian'
                          ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="landUseType"
                        checked={ppatData.landUseType !== 'pertanian'}
                        onChange={() => {}}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold">Non Pertanian (Coret Pertanian)</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPpatData(prev => ({ ...prev, landUseType: 'pertanian' }))}
                      className={`px-3 py-2 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                        ppatData.landUseType === 'pertanian'
                          ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="landUseType"
                        checked={ppatData.landUseType === 'pertanian'}
                        onChange={() => {}}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold">Pertanian (Coret Non Pertanian)</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Berupa (Uraian Penggunaan Tanah):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: TANAH KOSONG atau BANGUNAN RUMAH TINGGAL"
                    value={ppatData.landUse || 'TANAH KOSONG'}
                    onChange={(e) => setPpatData(prev => ({ ...prev, landUse: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold uppercase text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: LAMPIRAN BERKAS */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Formulir Pengisian Lampiran ("Bersama Ini Kami Lampirkan")</span>
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDefaultAttachments}
                    className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>3 Berkas Standar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAttachment('')}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Lampiran</span>
                  </button>
                </div>
              </div>

              {/* List Lampiran */}
              {(!ppatData.attachments || ppatData.attachments.length === 0) ? (
                <div className="p-5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-2.5">
                  <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-medium text-slate-600">
                    Belum ada lampiran kustom. Dokumen akan menggunakan berkas standar.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadDefaultAttachments}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Muat Berkas Standar ke Formulir</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ppatData.attachments.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 transition-all"
                    >
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-[220px]">
                        <input
                          type="text"
                          value={att.name}
                          onChange={(e) => handleUpdateAttachment(idx, { name: e.target.value.toUpperCase() })}
                          placeholder="Nama Lampiran"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold uppercase"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(idx)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {docItem.documentType === 'surat_kuasa_ppat' && (
          <div className="bg-blue-50/40 rounded-2xl border border-blue-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2 border-b border-blue-200 pb-3">
              <FileSignature className="w-4 h-4 text-blue-700" />
              <span>Rincian Penerima Kuasa (Staf PPAT)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Penerima Kuasa
                </label>
                <input
                  type="text"
                  placeholder="Nama staf kantor notaris / PPAT"
                  value={docItem.specificData?.attorneyName || 'STAF KANTOR PPAT NUKANTINI PUTRI PARINCHA, S.H., M.Kn.'}
                  onChange={(e) => handleUpdateSpecificData('attorneyName', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  NIK / Identitas Penerima Kuasa
                </label>
                <input
                  type="text"
                  placeholder="16 Digit NIK staf"
                  value={docItem.specificData?.attorneyNik || ''}
                  onChange={(e) => handleUpdateSpecificData('attorneyNik', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono text-slate-800"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alamat / Kantor Penerima Kuasa
                </label>
                <input
                  type="text"
                  value={docItem.specificData?.attorneyAddress || 'Kantor PPAT Nukantini Putri Parincha, S.H., M.Kn., Kabupaten Bandung Barat'}
                  onChange={(e) => handleUpdateSpecificData('attorneyAddress', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800"
                />
              </div>
            </div>
          </div>
        )}

        {docItem.documentType === 'surat_keterangan_nilai_pajak' && (
          <div className="bg-emerald-50/40 rounded-2xl border border-emerald-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 pb-3">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              <span>Nilai Transaksi Riil & Validasi Pajak (BPHTB & PPh)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nilai Transaksi Riil Yang Disepakati (Rp) *
                </label>
                <input
                  type="number"
                  value={docItem.specificData?.agreedPrice ?? obj.transactionValue ?? 0}
                  onChange={(e) => handleUpdateSpecificData('agreedPrice', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-bold text-slate-800 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Format: Rp {(docItem.specificData?.agreedPrice ?? obj.transactionValue ?? 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nilai NJOP PBB Terakhir (Rp)
                </label>
                <input
                  type="number"
                  disabled
                  value={obj.njop || 0}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-700"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Otomatis dari Master Data PPAT Objek.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes & Custom Clauses */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Klausul Tambahan / Catatan Khusus Surat</span>
          </h3>
          <textarea
            rows={3}
            placeholder="Tambahkan klausul tambahan bila diperlukan pada surat ini..."
            value={docItem.notes || ''}
            onChange={(e) => setDocItem(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-slate-800 leading-relaxed"
          />
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PPATDocumentPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          documentItem={docItem}
          project={project}
          ppatData={ppatData}
        />
      )}
    </div>
  );
};
