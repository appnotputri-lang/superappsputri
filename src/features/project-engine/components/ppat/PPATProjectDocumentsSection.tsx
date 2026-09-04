import React, { useState } from 'react';
import { 
  FileText, Plus, Edit3, Eye, Printer, Download, 
  Trash2, FilePlus, Sparkles, Building2, User, 
  CheckCircle2, Clock, X, ChevronRight, MapPin, AlertCircle
} from 'lucide-react';
import { Project, PPATData, PPATDocumentItem } from '../../../../domain/project/Project';
import { PPAT_DOC_TYPES, PPATDocTypeConfig } from './ppatDocTypes';
import { PPATDocumentPreviewModal } from './PPATDocumentPreviewModal';
import { generateAnyPPATDocx } from './generatePPATDocx';

interface PPATProjectDocumentsSectionProps {
  project: Project;
  currentUser?: any;
  onOpenCreateDocument: (docType: PPATDocTypeConfig) => void;
  onEditDocument: (doc: PPATDocumentItem) => void;
  onDeleteDocument: (docId: string) => void;
  onManageBaseData: () => void;
  isSelectModalOpenExternal?: boolean;
  setIsSelectModalOpenExternal?: (open: boolean) => void;
}

export const PPATProjectDocumentsSection: React.FC<PPATProjectDocumentsSectionProps> = ({
  project,
  currentUser,
  onOpenCreateDocument,
  onEditDocument,
  onDeleteDocument,
  onManageBaseData,
  isSelectModalOpenExternal,
  setIsSelectModalOpenExternal
}) => {
  const ppatData: PPATData = project.ppatData || {
    transactionType: project.projectType || 'Akta Jual Beli (AJB)',
    firstParties: [],
    secondParties: [],
    object: {},
    documents: []
  };

  const documents: PPATDocumentItem[] = ppatData.documents || [];

  const [docFilterCategory, setDocFilterCategory] = useState<'all' | 'surat' | 'akta'>('all');
  const [internalSelectModalOpen, setInternalSelectModalOpen] = useState(false);
  const isSelectTypeModalOpen = isSelectModalOpenExternal !== undefined ? isSelectModalOpenExternal : internalSelectModalOpen;
  const setIsSelectTypeModalOpen = (open: boolean) => {
    if (setIsSelectModalOpenExternal) {
      setIsSelectModalOpenExternal(open);
    }
    setInternalSelectModalOpen(open);
  };
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | 'surat' | 'akta'>('surat');
  const [previewDoc, setPreviewDoc] = useState<PPATDocumentItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const firstParty = ppatData.firstParties?.[0];
  const secondParty = ppatData.secondParties?.[0];
  const obj = ppatData.object || {};

  const isBaseDataReady = Boolean(firstParty?.name && secondParty?.name && (obj.certificateNumber || obj.nop));

  // Count docs by category
  const suratDocsCount = documents.filter(d => (d.category || 'surat') === 'surat').length;
  const aktaDocsCount = documents.filter(d => d.category === 'akta').length;

  const displayedDocuments = documents.filter(d => {
    if (docFilterCategory === 'all') return true;
    return (d.category || 'surat') === docFilterCategory;
  });

  const filteredDocTypes = PPAT_DOC_TYPES.filter(type => {
    if (selectedCategoryTab === 'all') return true;
    return type.category === selectedCategoryTab;
  });

  const handleDownloadDocx = async (docItem: PPATDocumentItem) => {
    setDownloadingId(docItem.id);
    try {
      await generateAnyPPATDocx(docItem, project, ppatData);
    } catch (err) {
      console.error('Download error:', err);
      alert('Gagal mengunduh dokumen Word.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* 1. KARTU RINGKASAN DATA DASAR PROYEK (CONTAINER LEVEL) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs transition-all hover:border-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Data Dasar Proyek (Pihak & Objek Transaksi)
              </h3>
              <p className="text-[11px] text-slate-500">
                Data bersama yang digunakan otomatis oleh seluruh surat & akta dalam proyek ini.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isBaseDataReady 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isBaseDataReady ? '✓ Data Dasar Siap' : '⚠️ Perlu Dilengkapi'}
            </span>
            <button
              onClick={onManageBaseData}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-600" />
              <span>Kelola Data Pihak & Objek</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3.5 text-xs">
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pihak Pertama (Penjual)
            </span>
            <p className="font-bold text-slate-800 text-[13px] truncate">
              {firstParty?.name || <span className="text-slate-400 italic">Belum diisi</span>}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {firstParty?.nik ? `NIK: ${firstParty.nik}` : '-'}
            </p>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pihak Kedua (Pembeli)
            </span>
            <p className="font-bold text-slate-800 text-[13px] truncate">
              {secondParty?.name || <span className="text-slate-400 italic">Belum diisi</span>}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {secondParty?.nik ? `NIK: ${secondParty.nik}` : '-'}
            </p>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Objek Tanah & Transaksi
            </span>
            <p className="font-bold text-slate-800 text-[13px] truncate">
              {obj.certificateNumber ? `${obj.certificateType || 'SHM'} No. ${obj.certificateNumber}` : <span className="text-slate-400 italic">Sertipikat belum diisi</span>}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {obj.village ? `${obj.village}, ${obj.district || ''}` : obj.nop ? `NOP: ${obj.nop}` : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. SECTION DOKUMEN PROYEK (MAIN HUB) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  DOKUMEN PROYEK
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {documents.length} Dokumen
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Surat-surat resmi dan akta PPAT yang dibuat dalam proyek ini.
              </p>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => setIsSelectTypeModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>+ Buat Dokumen</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        {documents.length > 0 && (
          <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 flex-wrap">
            <div className="bg-slate-200/70 p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setDocFilterCategory('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  docFilterCategory === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({documents.length})
              </button>
              <button
                onClick={() => setDocFilterCategory('surat')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  docFilterCategory === 'surat'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Surat ({suratDocsCount})
              </button>
              <button
                onClick={() => setDocFilterCategory('akta')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  docFilterCategory === 'akta'
                    ? 'bg-white text-amber-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Akta ({aktaDocsCount})
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {documents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <FilePlus className="w-6 h-6" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-sm font-bold text-slate-800">
                Belum ada dokumen
              </h3>
              <p className="text-xs text-slate-500">
                Mulai buat dokumen PPAT dari Master Data proyek.
              </p>
            </div>
            <button
              onClick={() => setIsSelectTypeModalOpen(true)}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Dokumen</span>
            </button>
          </div>
        ) : displayedDocuments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Tidak ada dokumen dalam kategori <strong>{docFilterCategory.toUpperCase()}</strong>.
          </div>
        ) : (
          /* List of Document Rows */
          <div className="divide-y divide-slate-100 bg-white">
            {displayedDocuments.map((doc) => {
              const isAkta = doc.category === 'akta';
              return (
                <div 
                  key={doc.id}
                  className="px-5 py-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* KIRI & TENGAH: Badge Tipe + Nama Dokumen + Metadata */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <span className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                      isAkta
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {isAkta ? 'AKTA' : 'SURAT'}
                    </span>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {doc.title}
                        </h4>
                        {doc.status && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                            doc.status === 'final'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {doc.status === 'final' ? 'SELESAI' : 'DRAFT'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {doc.letterNumber && (
                          <span className="font-mono text-slate-600 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                            No: {doc.letterNumber}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Terakhir diubah: {formatDateIndo(doc.updatedAt || doc.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* KANAN: Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      onClick={() => onEditDocument(doc)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                      title="Edit Dokumen"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                      title="Lihat Dokumen"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Lihat</span>
                    </button>

                    <button
                      onClick={() => handleDownloadDocx(doc)}
                      disabled={downloadingId === doc.id}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 border border-amber-300 shadow-2xs"
                      title="Unduh File DOCX"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-700" />
                      <span>{downloadingId === doc.id ? '...' : 'DOCX'}</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus dokumen "${doc.title}"?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Dokumen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MODAL: PILIH JENIS DOKUMEN PPAT */}
      {isSelectTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    Pilih Jenis Dokumen PPAT
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih dokumen yang ingin dibuat untuk proyek ini.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSelectTypeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2">
              <button
                onClick={() => setSelectedCategoryTab('surat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCategoryTab === 'surat'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Surat (Fokus Utama)
              </button>
              <button
                onClick={() => setSelectedCategoryTab('akta')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCategoryTab === 'akta'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Akta PPAT
              </button>
              <button
                onClick={() => setSelectedCategoryTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCategoryTab === 'all'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Dokumen
              </button>
            </div>

            {/* Master Data Helper Note if not complete */}
            {!isBaseDataReady && (
              <div className="mx-5 mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Master Data PPAT belum lengkap. Dokumen tetap bisa dibuat dan akan otomatis tersinkronisasi setelah Master Data dilengkapi.</span>
                </div>
                <button
                  onClick={() => {
                    setIsSelectTypeModalOpen(false);
                    onManageBaseData();
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg shrink-0 transition-colors"
                >
                  Lengkapi Master Data
                </button>
              </div>
            )}

            {/* Document Types List */}
            <div className="p-5 overflow-y-auto space-y-2.5">
              {filteredDocTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => {
                    setIsSelectTypeModalOpen(false);
                    onOpenCreateDocument(type);
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        type.category === 'akta' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {type.category}
                      </span>
                      <h4 className="font-bold text-xs text-slate-850 group-hover:text-blue-600 transition-colors">
                        {type.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {type.shortDesc}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <PPATDocumentPreviewModal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          documentItem={previewDoc}
          project={project}
          ppatData={ppatData}
        />
      )}
    </div>
  );
};
