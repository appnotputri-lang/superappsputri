import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  Share2,
  Check,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building,
  User,
  Users,
  CheckSquare,
  Square,
  AlertCircle,
  Eye,
  Edit3,
  Lock,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  DASAR_BO_OPTIONS,
  DASAR_GROUP_123,
  HUBUNGAN_KORPORASI_OPTIONS,
  PENERIMA_KUASA_FIXED,
  getTodayFormalIndonesianDate
} from './constants';
import { SuratBoFormData, HubunganKorporasiType } from './types';
import { SuratBoPrintDocument } from './SuratBoPrintDocument';
import { printElement } from '../../utils/printHelper';
import { exportToPDF } from '../../utils/pdfExport';

interface SuratBoGeneratorProps {
  isPublic?: boolean;
  user?: any;
}

const INITIAL_FORM_DATA: SuratBoFormData = {
  pemberiKuasa: {
    nama: '',
    alamat: '',
    noKtp: '',
    jabatan: '',
    namaPt: ''
  },
  bo: {
    nama: '',
    alamat: '',
    nik: '',
    npwp: '',
    hubungan: 'Pemilik Modal'
  },
  selectedDasarIds: ['dasar_1', 'dasar_2', 'dasar_3'],
  tempat: 'Bandung',
  tanggal: getTodayFormalIndonesianDate()
};

export const SuratBoGenerator: React.FC<SuratBoGeneratorProps> = ({
  isPublic = false,
  user
}) => {
  const [formData, setFormData] = useState<SuratBoFormData>(INITIAL_FORM_DATA);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const previewDocRef = useRef<HTMLDivElement>(null);

  // Auto update Jabatan when Nama PT changes if user hasn't typed a custom one
  const handleNamaPtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ptVal = e.target.value;
    setFormData((prev) => {
      const cleanPt = ptVal.trim();
      const formattedPt = cleanPt.toUpperCase().startsWith('PT')
        ? cleanPt
        : cleanPt
        ? `PT.${cleanPt}`
        : '';
      
      const newJabatan = formattedPt ? `Direktur “${formattedPt}”` : '';

      return {
        ...prev,
        pemberiKuasa: {
          ...prev.pemberiKuasa,
          namaPt: ptVal,
          jabatan: newJabatan
        }
      };
    });
  };

  const isGroup123Checked =
    formData.selectedDasarIds.includes('dasar_1') &&
    formData.selectedDasarIds.includes('dasar_2') &&
    formData.selectedDasarIds.includes('dasar_3');

  // Toggle Dasar BO 1, 2, 3 (tercentang serentak, dan eksklusif terhadap poin lain)
  const toggleGroup123 = () => {
    setFormData((prev) => {
      const all123Checked =
        prev.selectedDasarIds.includes('dasar_1') &&
        prev.selectedDasarIds.includes('dasar_2') &&
        prev.selectedDasarIds.includes('dasar_3');

      let updated: string[];
      if (all123Checked) {
        // Jika sudah aktif, uncheck ketiga butir
        updated = [];
      } else {
        // Jika dipilih: aktifkan 1, 2, 3 dan HAPUS semua poin lain (tidak bisa pilih poin lain)
        updated = ['dasar_1', 'dasar_2', 'dasar_3'];
      }
      return { ...prev, selectedDasarIds: updated };
    });
  };

  // Toggle Dasar BO checkbox (jika pilih poin lain, poin 123 otomatis dibatalkan dan sebaliknya)
  const toggleDasarItem = (id: string) => {
    if (['dasar_1', 'dasar_2', 'dasar_3'].includes(id)) {
      toggleGroup123();
      return;
    }
    setFormData((prev) => {
      // Menghapus poin 1, 2, 3 (karena tidak bisa dipilih bersamaan dengan poin lain)
      const without123 = prev.selectedDasarIds.filter(
        (item) => !['dasar_1', 'dasar_2', 'dasar_3'].includes(item)
      );
      const exists = without123.includes(id);
      const updated = exists
        ? without123.filter((item) => item !== id)
        : [...without123, id];
      return { ...prev, selectedDasarIds: updated };
    });
  };

  // Quick preset selector: 123 atau 4 atau 5 atau 6 atau 7
  const handleSelectPreset = (preset: '123' | '4' | '5' | '6' | '7') => {
    if (preset === '123') {
      setFormData((prev) => ({
        ...prev,
        selectedDasarIds: ['dasar_1', 'dasar_2', 'dasar_3']
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedDasarIds: [`dasar_${preset}`]
      }));
    }
  };

  const handleDeselectAllDasar = () => {
    setFormData((prev) => ({
      ...prev,
      selectedDasarIds: []
    }));
  };

  const handleSelectDefaultDasar = () => {
    setFormData((prev) => ({
      ...prev,
      selectedDasarIds: ['dasar_1', 'dasar_2', 'dasar_3']
    }));
  };

  // Form Validation
  const validateForm = (): boolean => {
    const { pemberiKuasa, bo, selectedDasarIds } = formData;
    const errors: string[] = [];

    if (!pemberiKuasa.nama.trim()) errors.push('Nama Pemberi Kuasa wajib diisi');
    if (!pemberiKuasa.alamat.trim()) errors.push('Alamat Pemberi Kuasa wajib diisi');
    if (!pemberiKuasa.noKtp.trim()) errors.push('No. KTP Pemberi Kuasa wajib diisi');
    if (!pemberiKuasa.namaPt.trim()) errors.push('Nama PT wajib diisi');
    if (!pemberiKuasa.jabatan.trim()) errors.push('Jabatan Pemberi Kuasa wajib diisi');

    if (!bo.nama.trim()) errors.push('Nama Beneficial Owner wajib diisi');
    if (!bo.alamat.trim()) errors.push('Alamat Beneficial Owner wajib diisi');
    if (!bo.nik.trim()) errors.push('NIK Beneficial Owner wajib diisi');
    if (!bo.npwp.trim()) errors.push('NPWP Beneficial Owner wajib diisi');

    if (!bo.hubungan) errors.push('Pilih hubungan korporasi dengan pemilik manfaat');
    if (selectedDasarIds.length === 0) errors.push('Pilih minimal 1 Dasar Beneficial Owner');

    if (errors.length > 0) {
      setValidationError(errors[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleGenerate = () => {
    if (validateForm()) {
      setActiveTab('preview');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Print Handler
  const handlePrint = () => {
    const element = document.getElementById('surat-bo-printable-area');
    if (element) {
      printElement(element, `Surat Kuasa BO - ${formData.pemberiKuasa.namaPt || 'PT'}`);
    } else {
      window.print();
    }
  };

  // PDF Export Handler
  const handleDownloadPdf = async () => {
    const element = document.getElementById('surat-bo-printable-area');
    if (!element) return;

    try {
      setIsExporting(true);
      const safePtName = (formData.pemberiKuasa.namaPt || 'Perusahaan')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Surat_Kuasa_BO_${safePtName}.pdf`;

      await exportToPDF(element, {
        filename,
        margin: [15, 15, 15, 15],
        orientation: 'portrait'
      });
    } catch (err) {
      console.error('PDF export error:', err);
      // Fallback to print
      handlePrint();
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Public Share Link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/surat-bo`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Fill sample data for convenience
  const handleFillSample = () => {
    setFormData({
      pemberiKuasa: {
        nama: 'HENDRA WIJAYA',
        alamat: 'Jl. Surya Sumantri No. 88, Kota Bandung, Jawa Barat',
        noKtp: '3273011205840003',
        namaPt: 'CAHAYA ABADI SEJAHTERA',
        jabatan: 'Direktur “PT. CAHAYA ABADI SEJAHTERA”'
      },
      bo: {
        nama: 'HENDRA WIJAYA',
        alamat: 'Jl. Surya Sumantri No. 88, Kota Bandung, Jawa Barat',
        nik: '3273011205840003',
        npwp: '01.234.567.8-428.000',
        hubungan: 'Pemilik Modal'
      },
      selectedDasarIds: [
        'dasar_1',
        'dasar_2',
        'dasar_3'
      ],
      tempat: 'Bandung',
      tanggal: getTodayFormalIndonesianDate()
    });
    setValidationError(null);
  };

  const handleResetForm = () => {
    if (window.confirm('Kosongkan semua data dan buat formulir baru?')) {
      setFormData(INITIAL_FORM_DATA);
      setActiveTab('form');
      setValidationError(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 pb-28 sm:pb-16 font-sans">
      {/* TOP NOTARY HEADER BAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-blue-500/20">
              BO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Surat Kuasa Beneficial Owner (BO)
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                  bo.ahu.go.id
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">
                Kantor Notaris {PENERIMA_KUASA_FIXED.nama}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Share / Copy Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              title="Salin Tautan Formulir Publik untuk Klien"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition border border-slate-200"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tautan Disalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Bagikan Link Publik</span>
                  <span className="sm:hidden">Share</span>
                </>
              )}
            </button>

            {/* Quick Sample Button */}
            <button
              type="button"
              onClick={handleFillSample}
              title="Isi contoh data cepat"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50/80 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Contoh Data</span>
            </button>
          </div>
        </div>

        {/* SUB-NAV TABS: FORM vs PREVIEW */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 py-2.5 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all ${
                activeTab === 'form'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Formulir Data
            </button>
            <button
              type="button"
              onClick={() => {
                validateForm();
                setActiveTab('preview');
              }}
              className={`flex items-center gap-2 py-2.5 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all ${
                activeTab === 'preview'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview & Cetak Dokumen
              {formData.pemberiKuasa.nama && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* VALIDATION ERROR BANNER */}
        {validationError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-sm flex items-start gap-3 shadow-xs animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Mohon lengkapi formulir:</p>
              <p className="text-red-600 text-xs mt-0.5">{validationError}</p>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-xs text-red-500 hover:text-red-800 underline font-medium"
            >
              Tutup
            </button>
          </div>
        )}

        {/* TAB 1: FORMULIR INPUT */}
        {activeTab === 'form' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* 1. INFORMASI RESMI PENERIMA KUASA (TETAP / READ-ONLY) */}
            <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-200/70 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Penerima Kuasa
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-blue-100/70 text-blue-800 rounded-full border border-blue-200/60">
                        <Lock className="w-2.5 h-2.5" /> Data Resmi Tetap (Read-Only)
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Identitas Notaris berwenang untuk pelaporan BO di bo.ahu.go.id
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-blue-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-blue-100">
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                    Nama Penerima Kuasa
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {PENERIMA_KUASA_FIXED.nama}
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-blue-100">
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                    Pekerjaan / Jabatan
                  </span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {PENERIMA_KUASA_FIXED.pekerjaan}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. DATA PEMBERI KUASA */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    1. Data Pemberi Kuasa (Direksi Perseroan)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pihak Direksi yang bertindak atas nama Perseroan Terbatas
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Pemberi Kuasa */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Nama Lengkap Pemberi Kuasa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: HENDRA WIJAYA"
                    value={formData.pemberiKuasa.nama}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pemberiKuasa: { ...prev.pemberiKuasa, nama: e.target.value }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition uppercase"
                  />
                </div>

                {/* No. KTP */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    No. KTP / NIK <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="16 digit NIK KTP"
                    value={formData.pemberiKuasa.noKtp}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pemberiKuasa: {
                          ...prev.pemberiKuasa,
                          noKtp: e.target.value.replace(/[^0-9]/g, '')
                        }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition font-mono"
                  />
                </div>

                {/* Nama PT */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Nama PT (Perseroan Terbatas) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Contoh: CAHAYA ABADI SEJAHTERA"
                      value={formData.pemberiKuasa.namaPt}
                      onChange={handleNamaPtChange}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition uppercase"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Nama perusahaan yang didaftarkan pada bo.ahu.go.id
                  </span>
                </div>

                {/* Jabatan (Otomatis terformat) */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      Jabatan Pemberi Kuasa <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-blue-600 font-medium">
                      Format standar: Direktur “PT.Nama PT”
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder='Contoh: Direktur “PT. CAHAYA ABADI SEJAHTERA”'
                    value={formData.pemberiKuasa.jabatan}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pemberiKuasa: { ...prev.pemberiKuasa, jabatan: e.target.value }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>

                {/* Alamat Pemberi Kuasa */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Alamat Lengkap (Sesuai KTP) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Alamat domisili / KTP Pemberi Kuasa..."
                    value={formData.pemberiKuasa.alamat}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pemberiKuasa: { ...prev.pemberiKuasa, alamat: e.target.value }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* 3. DATA BENEFICIAL OWNER (PEMILIK MANFAAT) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    2. Data Beneficial Owner (Pemilik Manfaat)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Identitas orang perseorangan yang dilaporkan sebagai Pemilik Manfaat
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama BO */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Nama Lengkap Pemilik Manfaat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap sesuai KTP"
                    value={formData.bo.nama}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bo: { ...prev.bo, nama: e.target.value }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition uppercase"
                  />
                </div>

                {/* NIK BO */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    NIK Pemilik Manfaat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    placeholder="16 digit NIK KTP"
                    value={formData.bo.nik}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bo: { ...prev.bo, nik: e.target.value.replace(/[^0-9]/g, '') }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition font-mono"
                  />
                </div>

                {/* NPWP BO */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    NPWP Pemilik Manfaat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 01.234.567.8-428.000"
                    value={formData.bo.npwp}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bo: { ...prev.bo, npwp: e.target.value }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition font-mono"
                  />
                </div>

                {/* Alamat BO */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Alamat Lengkap Pemilik Manfaat <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Alamat domisili / KTP Pemilik Manfaat..."
                    value={formData.bo.alamat}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bo: { ...prev.bo, alamat: e.target.value }
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>

                {/* Hubungan Korporasi dengan Pemilik Manfaat (Radio / Select) */}
                <div className="space-y-2 sm:col-span-2 pt-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>
                      Hubungan Korporasi dengan Pemilik Manfaat <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Pilih salah satu sesuai kondisi riil
                    </span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {HUBUNGAN_KORPORASI_OPTIONS.map((item) => {
                      const isSelected = formData.bo.hubungan === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              bo: { ...prev.bo, hubungan: item.id }
                            }))
                          }
                          className={`cursor-pointer rounded-xl p-3.5 border transition-all relative ${
                            isSelected
                              ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                              {item.label}
                            </span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                              isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. DASAR BENEFICIAL OWNER (CHECKLIST KRITERIA) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      3. Dasar Penetapan Beneficial Owner <span className="text-red-500">*</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilihan kriteria: <strong>Poin 1, 2, 3</strong> (saham &gt; 25%), atau <strong>4</strong>, atau <strong>5</strong>, atau <strong>6</strong>
                    </p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectDefaultDasar}
                    className="px-2.5 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                  >
                    Pilih 1, 2, 3
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllDasar}
                    className="px-2.5 py-1 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              {/* Aturan Pilihan Eksklusif Info Box */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs">
                <span className="font-bold text-blue-700 shrink-0">ℹ️ Ketentuan:</span>
                <span>
                  Memilih <strong>Poin 1, 2, 3</strong> tidak dapat digabungkan dengan poin lain, dan begitu juga sebaliknya.
                </span>
              </div>

              {/* Tombol Pilihan Cepat: 123 / 4 / 5 / 6 / 7 */}
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-semibold text-slate-700">
                  Pilihan Cepat Kriteria (Klik untuk memilih langsung):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('123')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex flex-col justify-between ${
                      isGroup123Checked && formData.selectedDasarIds.length === 3
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      Poin 1, 2, 3
                      {isGroup123Checked && formData.selectedDasarIds.length === 3 && (
                        <Check className="w-3.5 h-3.5 inline stroke-[3]" />
                      )}
                    </span>
                    <span className="text-[10px] opacity-80 mt-0.5">
                      Saham &gt; 25% (Paket 1, 2, 3)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset('4')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex flex-col justify-between ${
                      formData.selectedDasarIds.length === 1 && formData.selectedDasarIds[0] === 'dasar_4'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      Poin 4
                      {formData.selectedDasarIds.length === 1 && formData.selectedDasarIds[0] === 'dasar_4' && (
                        <Check className="w-3.5 h-3.5 inline stroke-[3]" />
                      )}
                    </span>
                    <span className="text-[10px] opacity-80 mt-0.5">
                      Kewenangan Direksi/Komisaris
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset('5')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex flex-col justify-between ${
                      formData.selectedDasarIds.length === 1 && formData.selectedDasarIds[0] === 'dasar_5'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      Poin 5
                      {formData.selectedDasarIds.length === 1 && formData.selectedDasarIds[0] === 'dasar_5' && (
                        <Check className="w-3.5 h-3.5 inline stroke-[3]" />
                      )}
                    </span>
                    <span className="text-[10px] opacity-80 mt-0.5">
                      Pengendali Perseroan
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset('6')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex flex-col justify-between ${
                      formData.selectedDasarIds.length === 1 && formData.selectedDasarIds[0] === 'dasar_6'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      Poin 6
                      {formData.selectedDasarIds.length === 1 && formData.selectedDasarIds[0] === 'dasar_6' && (
                        <Check className="w-3.5 h-3.5 inline stroke-[3]" />
                      )}
                    </span>
                    <span className="text-[10px] opacity-80 mt-0.5">
                      Menerima Manfaat
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset('7')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex flex-col justify-between col-span-2 sm:col-span-1 ${
                      formData.selectedDasarIds.length === 1 && formData.selectedDasarIds[0] === 'dasar_7'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      Poin 7
                      {formData.selectedDasarIds.length === 1 && formData.selectedDasarIds[0] === 'dasar_7' && (
                        <Check className="w-3.5 h-3.5 inline stroke-[3]" />
                      )}
                    </span>
                    <span className="text-[10px] opacity-80 mt-0.5">
                      Pemilik Sebenarnya Dana
                    </span>
                  </button>
                </div>
              </div>

              {/* Checklist items */}
              <div className="space-y-3 pt-2">
                {/* PAKET 1, 2, 3 (TERCENTANG BERSAMAAN) */}
                <div
                  onClick={toggleGroup123}
                  className={`cursor-pointer rounded-xl border p-3.5 sm:p-4 transition-all select-none ${
                    isGroup123Checked
                      ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300 text-slate-900'
                      : 'bg-white border-slate-200/90 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-200/70">
                    <div className="flex items-center gap-2.5">
                      <div className="shrink-0">
                        {isGroup123Checked ? (
                          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-slate-300 bg-white" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          Pilihan 1, 2, & 3: Kepemilikan Saham & Hak Keuangan (&gt; 25%)
                        </span>
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                          Tercentang Bersamaan
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-blue-700 shrink-0">
                      {isGroup123Checked ? '3 butir aktif ✓' : 'Klik untuk pilih'}
                    </span>
                  </div>

                  {/* Sub-butir 1, 2, 3 */}
                  <div className="space-y-2 pl-7 text-xs sm:text-sm leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-500 shrink-0">1.</span>
                      <span className={isGroup123Checked ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                        Memiliki saham lebih dari 25% (dua puluh lima persen) pada perseroan terbatas sebagaimana tercantum dalam anggaran dasar;
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-500 shrink-0">2.</span>
                      <span className={isGroup123Checked ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                        Memiliki hak suara lebih dari 25% (dua puluh lima persen) pada perseroan terbatas sebagaimana tercantum dalam anggaran dasar;
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-500 shrink-0">3.</span>
                      <span className={isGroup123Checked ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                        Menerima keuntungan atau laba lebih dari 25% (dua puluh lima persen) dari keuntungan atau laba yang diperoleh perseroan terbatas per tahun;
                      </span>
                    </div>
                  </div>
                </div>

                {/* BUTIR 4, 5, 6, 7 */}
                {DASAR_BO_OPTIONS.filter((item) => !DASAR_GROUP_123.includes(item.id as any)).map((item, idx) => {
                  const itemNum = idx + 4;
                  const isChecked = formData.selectedDasarIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleDasarItem(item.id)}
                      className={`cursor-pointer rounded-xl p-3 sm:p-3.5 border transition-all flex items-start gap-3 select-none ${
                        isChecked
                          ? 'bg-blue-50/50 border-blue-300/80 text-slate-900 ring-1 ring-blue-200'
                          : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-slate-300 bg-white" />
                        )}
                      </div>
                      <div className="text-xs sm:text-sm leading-relaxed flex-1">
                        <span className="font-bold text-slate-500 mr-1.5">
                          {itemNum}.
                        </span>
                        {item.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {formData.selectedDasarIds.length === 0 && (
                <p className="text-xs text-red-500 font-medium">
                  * Minimal pilih 1 dasar kriteria penetapan Beneficial Owner (Pilihan 1, 2, 3 atau 4 atau 5 atau 6)
                </p>
              )}
            </div>

            {/* 5. TITIMANGSA (TEMPAT & TANGGAL SURAT) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                4. Tempat & Tanggal Penandatanganan Surat
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Tempat Pembuatan
                  </label>
                  <input
                    type="text"
                    value={formData.tempat}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tempat: e.target.value }))
                    }
                    placeholder="Contoh: Bandung"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Tanggal Surat (Bahasa Indonesia Formal)
                  </label>
                  <input
                    type="text"
                    value={formData.tanggal}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tanggal: e.target.value }))
                    }
                    placeholder="Contoh: 15 September 2026"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* ACTION BUTTON: BUAT SURAT BO */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Formulir
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl font-bold text-sm sm:text-base shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Buat Surat BO</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIEW & CETAK DOKUMEN */}
        {activeTab === 'preview' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* ACTION TOOLBAR */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Kembali Data</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Print Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Surat</span>
                </button>

                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Memproses PDF...' : 'Download PDF'}</span>
                </button>
              </div>
            </div>

            {/* DOCUMENT SIMULATOR CONTAINER (A4 LOOK) */}
            <div className="overflow-x-auto flex justify-center py-4 bg-slate-200/60 rounded-2xl border border-slate-300/80 p-2 sm:p-6">
              <div
                ref={previewDocRef}
                className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-xl rounded-sm p-8 sm:p-14 print:p-0 print:shadow-none print:w-full"
              >
                <SuratBoPrintDocument data={formData} />
              </div>
            </div>

            {/* HELPER INFO / INSTRUCTION */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Petunjuk Penandatanganan:</p>
                <p className="text-amber-800 mt-0.5">
                  1. Cetak surat menggunakan kertas ukuran A4 atau F4 (HVS 80gr).<br />
                  2. Bubuhkan materai Rp 10.000 pada kolom Pemberi Kuasa, lalu ditandatangani oleh Direktur.<br />
                  3. Bawa atau serahkan surat kuasa asli ke kantor Notaris {PENERIMA_KUASA_FIXED.nama} untuk proses pelaporan pada sistem AHU BO (bo.ahu.go.id).
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FLOATING ACTION DOCK FOR MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-3 sm:hidden shadow-lg">
        {activeTab === 'form' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="flex-[2] py-2.5 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Buat Surat BO</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
