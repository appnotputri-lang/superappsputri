import React, { useState } from 'react';
import { 
  ArrowLeft, Save, FileText, CheckCircle2, Printer, 
  Download, Eye, AlertCircle, Sparkles, Building2, User, 
  MapPin, ShieldAlert, Check, Calendar, FileSignature
} from 'lucide-react';
import { Project, PPATData, PPATDocumentItem, PPATParty, PPATObjectData } from '../../../../domain/project/Project';
import { PPATDocumentPreviewModal } from './PPATDocumentPreviewModal';
import { generateAnyPPATDocx } from './generatePPATDocx';
import { formatFullPartyAddress, isCityKota } from './ppatAddressUtils';

interface PPATDocumentEditorProps {
  project: Project;
  initialDoc: PPATDocumentItem;
  currentUser?: any;
  onBack: () => void;
  onSave: (savedDoc: PPATDocumentItem, updatedPPATData: PPATData) => Promise<void>;
}

export const PPATDocumentEditor: React.FC<PPATDocumentEditorProps> = ({
  project,
  initialDoc,
  currentUser,
  onBack,
  onSave
}) => {
  // Local document state
  const [docItem, setDocItem] = useState<PPATDocumentItem>({
    ...initialDoc,
    letterDate: initialDoc.letterDate || new Date().toISOString().split('T')[0],
    letterLocation: initialDoc.letterLocation || 'Kabupaten Bandung Barat',
    status: initialDoc.status || 'draft',
    specificData: initialDoc.specificData || {}
  });

  // Local PPAT Base Data (shared across documents)
  const [ppatData, setPpatData] = useState<PPATData>(() => {
    return project.ppatData || {
      transactionType: project.projectType || 'Akta Jual Beli (AJB)',
      firstParties: [{ id: 'p1', name: '', nik: '', address: '', job: '' }],
      secondParties: [{ id: 'p2', name: '', nik: '', address: '', job: '' }],
      object: {}
    };
  });

  const [syncToBaseProject, setSyncToBaseProject] = useState(true);
  const [activeTab, setActiveTab] = useState<'document_data' | 'shared_data'>('document_data');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Helper for first and second parties
  const firstParty = ppatData.firstParties?.[0] || { id: 'p1', name: '', nik: '', address: '', job: '' };
  const secondParty = ppatData.secondParties?.[0] || { id: 'p2', name: '', nik: '', address: '', job: '' };
  const obj = ppatData.object || {};

  const handleUpdateFirstParty = (field: keyof PPATParty, value: any) => {
    const updated = [...(ppatData.firstParties || [])];
    if (updated.length === 0) {
      updated.push({ id: 'p1', name: '', nik: '', address: '', job: '', [field]: value });
    } else {
      updated[0] = { ...updated[0], [field]: value };
    }
    setPpatData(prev => ({ ...prev, firstParties: updated }));
  };

  const handleUpdateSecondParty = (field: keyof PPATParty, value: any) => {
    const updated = [...(ppatData.secondParties || [])];
    if (updated.length === 0) {
      updated.push({ id: 'p2', name: '', nik: '', address: '', job: '', [field]: value });
    } else {
      updated[0] = { ...updated[0], [field]: value };
    }
    setPpatData(prev => ({ ...prev, secondParties: updated }));
  };

  const handleUpdateObject = (field: keyof PPATObjectData, value: any) => {
    setPpatData(prev => ({
      ...prev,
      object: { ...(prev.object || {}), [field]: value }
    }));
  };

  const handleUpdateSpecificData = (key: string, value: any) => {
    setDocItem(prev => ({
      ...prev,
      specificData: {
        ...(prev.specificData || {}),
        [key]: value
      }
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

      await onSave(updatedDoc, syncToBaseProject ? ppatData : (project.ppatData || ppatData));
      
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

  return (
    <div className="space-y-6">
      {/* Top sticky action banner */}
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

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('document_data')}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeTab === 'document_data' 
              ? 'text-blue-600 font-bold' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>1. Data & Klausul Dokumen</span>
          {activeTab === 'document_data' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('shared_data')}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeTab === 'shared_data' 
              ? 'text-blue-600 font-bold' 
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. Data Bersama Proyek (Pihak & Objek)</span>
          {activeTab === 'shared_data' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
          )}
        </button>
      </div>

      {/* TAB 1: DATA & KLAUSUL KHUSUS DOKUMEN */}
      {activeTab === 'document_data' && (
        <div className="space-y-6">
          {/* Card: Header Info Dokumen */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Identitas & Administrasi Surat</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Judul Dokumen
                </label>
                <input
                  type="text"
                  value={docItem.title}
                  onChange={(e) => setDocItem(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-800"
                />
              </div>

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

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Status Dokumen
                </label>
                <select
                  value={docItem.status}
                  onChange={(e) => setDocItem(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium text-slate-800"
                >
                  <option value="draft">Draft (Draf Awal)</option>
                  <option value="final">Final (Siap Ditandatangani)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  disabled
                  value={docItem.category.toUpperCase()}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-bold"
                />
              </div>
            </div>
          </div>

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
                      handleUpdateObject('transactionStatus', e.target.value);
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
                      handleUpdateObject('transactionValue', val);
                    }}
                    placeholder="Contoh: 500000000"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Rp {(docItem.specificData?.agreedPrice ?? obj.transactionValue ?? 0).toLocaleString('id-ID')}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Transaksi / Perolehan
                  </label>
                  <input
                    type="date"
                    value={obj.transactionDate || ''}
                    onChange={(e) => handleUpdateObject('transactionDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-medium text-slate-800"
                  />
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

          {docItem.documentType === 'surat_pasal_99' && (
            <div className="bg-blue-50/40 rounded-2xl border border-blue-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2 border-b border-blue-200 pb-3">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                <span>Ketentuan Pernyataan Pasal 99 (PMNA/KaBPN No. 3/1997)</span>
              </h3>
              <p className="text-xs text-blue-800 leading-relaxed">
                Surat ini menyatakan bahwa penerima hak tidak melebihi batas maksimum kepemilikan tanah dan bukan tanah absentee (guntai). Data identitas pembeli dan objek tanah diambil otomatis dari Master Data PPAT.
              </p>
              <div className="bg-white p-4 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-blue-900">Poin Pernyataan:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Tidak melebihi batas maksimum penguasaan tanah sesuai UU Agraria.</li>
                  <li>Bukan perolehan tanah secara absentee (pemilik bertempat tinggal di luar kecamatan).</li>
                  <li>Dibuat untuk keperluan pendaftaran peralihan hak di Kantor Pertanahan setempat.</li>
                </ul>
              </div>
            </div>
          )}

          {docItem.documentType === 'surat_pasal_100' && (
            <div className="bg-emerald-50/40 rounded-2xl border border-emerald-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 pb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Ketentuan Pernyataan Pasal 100 (PMNA/KaBPN No. 3/1997)</span>
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Surat ini menyatakan penguasaan fisik tanah secara nyata beritikad baik dan tidak dalam sengketa. Batas-batas tanah (Utara, Selatan, Timur, Barat) otomatis diambil dari Master Data PPAT.
              </p>
              <div className="bg-white p-4 rounded-xl border border-emerald-100 text-xs text-slate-700 space-y-2">
                <p className="font-semibold text-emerald-900">Poin Pernyataan:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Bidang tanah benar-benar dikuasai secara fisik dengan itikad baik terus menerus.</li>
                  <li>Tidak dijadikan jaminan utang tak tercatat, bebas dari sengketa/perkara dan sita jaminan.</li>
                  <li>Tanda batas tanah jelas dan tidak diganggu gugat pihak lain.</li>
                </ul>
              </div>
            </div>
          )}

          {docItem.documentType === 'kuasa_migrasi' && (
            <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2 border-b border-amber-200 pb-3">
                <FileSignature className="w-4 h-4 text-amber-700" />
                <span>Ketentuan Template Master Docx — Kuasa Migrasi E-Sertipikat</span>
              </h3>
              <div className="text-xs text-amber-900 leading-relaxed space-y-1.5">
                <p className="font-semibold">
                  ✓ Pemetaan Otomatis Dari Master Data Proyek:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li><strong>PIHAK PERTAMA (Pemberi Kuasa):</strong> Diisi otomatis dari Data Pembeli (Second Parties) pada Master Form PPAT.</li>
                  <li><strong>PIHAK KEDUA (Penerima Kuasa):</strong> Static 100% mengikuti Template Master DOCX (R.A. NUKANTINI PUTRI PARINCHA, SH.,MKn).</li>
                  <li><strong>DATA OBJEK:</strong> Nomor Sertipikat, Jenis Hak, Luas, Terbilang Luas, dan Alamat Objek diambil langsung dari Master Data Objek.</li>
                </ul>
              </div>
            </div>
          )}

          {docItem.documentType === 'kuasa_pengecekan_sertipikat' && (
            <div className="bg-indigo-50/60 rounded-2xl border border-indigo-200 p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-200 pb-3">
                <FileSignature className="w-4 h-4 text-indigo-700" />
                <span>Ketentuan Template Master Docx — Surat Kuasa Pengecekan Sertipikat</span>
              </h3>
              <div className="text-xs text-indigo-900 leading-relaxed space-y-1.5">
                <p className="font-semibold">
                  ✓ Pemetaan Otomatis Dari Master Data Proyek:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li><strong>PIHAK PERTAMA (Pemberi Kuasa):</strong> Diisi otomatis dari Data Penjual (First Parties) pada Master Form PPAT.</li>
                  <li><strong>PIHAK KEDUA (Penerima Kuasa):</strong> Static 100% mengikuti Template Master DOCX (R.A. NUKANTINI PUTRI PARINCHA, SH.,MKn).</li>
                  <li><strong>DATA OBJEK:</strong> Nomor Sertipikat, Jenis Hak, Luas, Terbilang Luas, dan Alamat Objek diambil langsung dari Master Data Objek.</li>
                  <li><strong>TUJUAN KUASA:</strong> "Untuk menghadap, mengurus dan menandatangani proses pengurusan Pengecekan Sertipikat".</li>
                </ul>
              </div>
            </div>
          )}

          {docItem.documentType === 'kuasa_znt' && (
            <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200 p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2 border-b border-emerald-200 pb-3">
                <FileSignature className="w-4 h-4 text-emerald-700" />
                <span>Ketentuan Template Master Docx — Surat Kuasa Pengecekan Zona Nilai Tanah (ZNT)</span>
              </h3>
              <div className="text-xs text-emerald-900 leading-relaxed space-y-1.5">
                <p className="font-semibold">
                  ✓ Pemetaan Otomatis Dari Master Data Proyek:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li><strong>PIHAK PERTAMA (Pemberi Kuasa):</strong> Diisi otomatis dari Data Penjual (First Parties) pada Master Form PPAT.</li>
                  <li><strong>PIHAK KEDUA (Penerima Kuasa):</strong> Static 100% mengikuti Template Master DOCX (R.A. NUKANTINI PUTRI PARINCHA, SH.,MKn).</li>
                  <li><strong>DATA OBJEK:</strong> Nomor Sertipikat, Jenis Hak, Luas, Terbilang Luas, dan Alamat Objek diambil langsung dari Master Data Objek.</li>
                  <li><strong>TUJUAN KUASA:</strong> "Untuk menghadap, mengurus dan menandatangani proses pengurusan Pengecekan Zona Nilai Tanah (ZNT)".</li>
                </ul>
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
                    Otomatis dari data objek proyek.
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
      )}

      {/* TAB 2: DATA BERSAMA PROYEK (PIHAK & OBJEK) */}
      {activeTab === 'shared_data' && (
        <div className="space-y-6">
          {/* Synchronize checkbox indicator */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-900">
                  Data Bersama Proyek PPAT
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Data Pihak Pertama, Pihak Kedua, dan Objek di bawah ini dapat digunakan kembali oleh seluruh surat dan akta di dalam proyek ini tanpa perlu input ulang.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-blue-900 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={syncToBaseProject}
                onChange={(e) => setSyncToBaseProject(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Sinkronkan ke Proyek</span>
            </label>
          </div>

          {/* Grid: Pihak Pertama & Pihak Kedua */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PIHAK PERTAMA */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Pihak Pertama (Penjual / Pelepas Hak)</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  Pemberi Hak
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    value={firstParty.name || ''}
                    onChange={(e) => handleUpdateFirstParty('name', e.target.value)}
                    placeholder="Nama sesuai KTP"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-850"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      NIK / No. KTP
                    </label>
                    <input
                      type="text"
                      value={firstParty.nik || ''}
                      onChange={(e) => handleUpdateFirstParty('nik', e.target.value)}
                      placeholder="16 Digit NIK"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Pekerjaan
                    </label>
                    <input
                      type="text"
                      value={firstParty.job || ''}
                      onChange={(e) => handleUpdateFirstParty('job', e.target.value)}
                      placeholder="Karyawan Swasta / Wiraswasta"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={firstParty.birthPlace || ''}
                      onChange={(e) => handleUpdateFirstParty('birthPlace', e.target.value)}
                      placeholder="Kota Lahir"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={firstParty.birthDate || ''}
                      onChange={(e) => handleUpdateFirstParty('birthDate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      RT / RW
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={firstParty.rt || ''}
                        onChange={(e) => handleUpdateFirstParty('rt', e.target.value)}
                        placeholder="RT"
                        className="w-1/2 px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800"
                      />
                      <input
                        type="text"
                        value={firstParty.rw || ''}
                        onChange={(e) => handleUpdateFirstParty('rw', e.target.value)}
                        placeholder="RW"
                        className="w-1/2 px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      {isCityKota(firstParty.city) ? 'Kelurahan' : 'Desa'}
                    </label>
                    <input
                      type="text"
                      value={firstParty.village || ''}
                      onChange={(e) => handleUpdateFirstParty('village', e.target.value)}
                      placeholder={isCityKota(firstParty.city) ? 'Nama Kelurahan' : 'Nama Desa'}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Kecamatan
                    </label>
                    <input
                      type="text"
                      value={firstParty.district || ''}
                      onChange={(e) => handleUpdateFirstParty('district', e.target.value)}
                      placeholder="Kecamatan"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Kabupaten / Kota
                    </label>
                    <input
                      type="text"
                      value={firstParty.city || ''}
                      onChange={(e) => handleUpdateFirstParty('city', e.target.value)}
                      placeholder="Kota / Kab"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Alamat Jalan / Blok
                  </label>
                  <textarea
                    rows={2}
                    value={firstParty.address || ''}
                    onChange={(e) => handleUpdateFirstParty('address', e.target.value)}
                    placeholder="Jalan, Gang, Blok, No. Rumah"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                  {formatFullPartyAddress(firstParty) && (
                    <p className="text-[11px] text-amber-800 mt-1.5 p-2 bg-amber-50/70 border border-amber-200/70 rounded-lg">
                      <strong>Format Dokumen:</strong> {formatFullPartyAddress(firstParty)}
                    </p>
                  )}
                </div>

                {/* Persetujuan Suami/Istri Pihak Pertama */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(firstParty.hasSpouseConsent)}
                      onChange={(e) => handleUpdateFirstParty('hasSpouseConsent', e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Persetujuan Suami / Istri Sah</span>
                  </label>
                  {firstParty.hasSpouseConsent && (
                    <div className="mt-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Nama Pasangan</label>
                          <input
                            type="text"
                            value={firstParty.spouseName || ''}
                            onChange={(e) => handleUpdateFirstParty('spouseName', e.target.value)}
                            placeholder="Nama suami/istri"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">NIK Pasangan</label>
                          <input
                            type="text"
                            value={firstParty.spouseNik || ''}
                            onChange={(e) => handleUpdateFirstParty('spouseNik', e.target.value)}
                            placeholder="16 digit NIK"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PIHAK KEDUA */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Pihak Kedua (Pembeli / Penerima Hak)</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  Penerima Hak
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    value={secondParty.name || ''}
                    onChange={(e) => handleUpdateSecondParty('name', e.target.value)}
                    placeholder="Nama sesuai KTP"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-850"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      NIK / No. KTP
                    </label>
                    <input
                      type="text"
                      value={secondParty.nik || ''}
                      onChange={(e) => handleUpdateSecondParty('nik', e.target.value)}
                      placeholder="16 Digit NIK"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Pekerjaan
                    </label>
                    <input
                      type="text"
                      value={secondParty.job || ''}
                      onChange={(e) => handleUpdateSecondParty('job', e.target.value)}
                      placeholder="Karyawan Swasta / Wiraswasta"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={secondParty.birthPlace || ''}
                      onChange={(e) => handleUpdateSecondParty('birthPlace', e.target.value)}
                      placeholder="Kota Lahir"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={secondParty.birthDate || ''}
                      onChange={(e) => handleUpdateSecondParty('birthDate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      RT / RW
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={secondParty.rt || ''}
                        onChange={(e) => handleUpdateSecondParty('rt', e.target.value)}
                        placeholder="RT"
                        className="w-1/2 px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800"
                      />
                      <input
                        type="text"
                        value={secondParty.rw || ''}
                        onChange={(e) => handleUpdateSecondParty('rw', e.target.value)}
                        placeholder="RW"
                        className="w-1/2 px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      {isCityKota(secondParty.city) ? 'Kelurahan' : 'Desa'}
                    </label>
                    <input
                      type="text"
                      value={secondParty.village || ''}
                      onChange={(e) => handleUpdateSecondParty('village', e.target.value)}
                      placeholder={isCityKota(secondParty.city) ? 'Nama Kelurahan' : 'Nama Desa'}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Kecamatan
                    </label>
                    <input
                      type="text"
                      value={secondParty.district || ''}
                      onChange={(e) => handleUpdateSecondParty('district', e.target.value)}
                      placeholder="Kecamatan"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Kabupaten / Kota
                    </label>
                    <input
                      type="text"
                      value={secondParty.city || ''}
                      onChange={(e) => handleUpdateSecondParty('city', e.target.value)}
                      placeholder="Kota / Kab"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Alamat Jalan / Blok
                  </label>
                  <textarea
                    rows={2}
                    value={secondParty.address || ''}
                    onChange={(e) => handleUpdateSecondParty('address', e.target.value)}
                    placeholder="Jalan, Gang, Blok, No. Rumah"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                  />
                  {formatFullPartyAddress(secondParty) && (
                    <p className="text-[11px] text-emerald-800 mt-1.5 p-2 bg-emerald-50/70 border border-emerald-200/70 rounded-lg">
                      <strong>Format Dokumen:</strong> {formatFullPartyAddress(secondParty)}
                    </p>
                  )}
                </div>

                {/* Persetujuan Suami/Istri Pihak Kedua */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(secondParty.hasSpouseConsent)}
                      onChange={(e) => handleUpdateSecondParty('hasSpouseConsent', e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-700">Persetujuan Suami / Istri Sah</span>
                  </label>
                  {secondParty.hasSpouseConsent && (
                    <div className="mt-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Nama Pasangan</label>
                          <input
                            type="text"
                            value={secondParty.spouseName || ''}
                            onChange={(e) => handleUpdateSecondParty('spouseName', e.target.value)}
                            placeholder="Nama suami/istri"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">NIK Pasangan</label>
                          <input
                            type="text"
                            value={secondParty.spouseNik || ''}
                            onChange={(e) => handleUpdateSecondParty('spouseNik', e.target.value)}
                            placeholder="16 digit NIK"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded bg-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* OBJEK TRANSAKSI PPAT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>Objek Hak Atas Tanah & Bangunan</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Jenis Sertipikat
                </label>
                <select
                  value={obj.certificateType || 'SHM'}
                  onChange={(e) => handleUpdateObject('certificateType', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="SHM">Sertipikat Hak Milik (SHM)</option>
                  <option value="HGB">Hak Guna Bangunan (HGB)</option>
                  <option value="Hak Pakai">Hak Pakai</option>
                  <option value="Girik/Warkah">Girik / Warkah / Letter C</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nomor Sertipikat *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 01234/Lembang"
                  value={obj.certificateNumber || ''}
                  onChange={(e) => handleUpdateObject('certificateNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  NOP PBB (18 Digit)
                </label>
                <input
                  type="text"
                  placeholder="32.17.xxx.xxx.xxx-xxxx.x"
                  value={obj.nop || ''}
                  onChange={(e) => handleUpdateObject('nop', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  NIB (Nomor Identifikasi Bidang)
                </label>
                <input
                  type="text"
                  placeholder="10.08.01.05.00123"
                  value={obj.nib || ''}
                  onChange={(e) => handleUpdateObject('nib', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Pilih Dokumen Pengukuran
                </label>
                <select
                  value={obj.measurementDocType || 'Surat Ukur'}
                  onChange={(e) => handleUpdateObject('measurementDocType', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="Surat Ukur">Surat Ukur (SU)</option>
                  <option value="Gambar Situasi">Gambar Situasi (GS)</option>
                  <option value="Peta Bidang / NIB">Peta Bidang / NIB</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nomor & Tanggal {obj.measurementDocType || 'Surat Ukur'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nomor SU/GS"
                    value={obj.measurementDocNumber || ''}
                    onChange={(e) => handleUpdateObject('measurementDocNumber', e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  />
                  <input
                    type="date"
                    value={obj.measurementDocDate || ''}
                    onChange={(e) => handleUpdateObject('measurementDocDate', e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Luas Tanah (m²)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={obj.landArea || 0}
                  onChange={(e) => handleUpdateObject('landArea', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Desa / Kelurahan
                </label>
                <input
                  type="text"
                  placeholder="Desa"
                  value={obj.village || ''}
                  onChange={(e) => handleUpdateObject('village', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Kecamatan
                </label>
                <input
                  type="text"
                  placeholder="Kecamatan"
                  value={obj.district || ''}
                  onChange={(e) => handleUpdateObject('district', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Status Transaksi
                </label>
                <select
                  value={obj.transactionStatus || 'telah'}
                  onChange={(e) => handleUpdateObject('transactionStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                >
                  <option value="telah">Telah Melakukan Transaksi</option>
                  <option value="akan">Akan Melakukan Transaksi</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Nilai Transaksi (Rp)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={obj.transactionValue || 0}
                  onChange={(e) => handleUpdateObject('transactionValue', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={obj.transactionDate || ''}
                  onChange={(e) => handleUpdateObject('transactionDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
