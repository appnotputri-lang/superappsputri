import React, { useEffect, useState } from 'react';
import { Save, Image, Trash2, Upload, CheckCircle2, Shield, AlertCircle, Info } from 'lucide-react';
import { PageContainer, PageHeader } from './ui/PageLayout';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { getSignatureImage, setSignatureImage, resetSignatureImage, DEFAULT_SIGNATURE_URL } from '../utils/signatureUtils';

export function StampSettings() {
  const [imagePreview, setImagePreview] = useState<string>(getSignatureImage());
  const [isCustom, setIsCustom] = useState<boolean>(getSignatureImage() !== DEFAULT_SIGNATURE_URL);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load stamp configuration from Firestore on mount
  useEffect(() => {
    async function loadStamp() {
      setLoading(true);
      try {
        const docRef = doc(db, 'settings', 'stamp_signature');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.signatureDataUrl) {
            setSignatureImage(data.signatureDataUrl);
            setImagePreview(data.signatureDataUrl);
            setIsCustom(true);
          }
        }
      } catch (err: any) {
        console.error('Failed to load permanent stamp settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStamp();
  }, []);

  // Image resizing & compression helper
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;
      const dataUrl = event.target.result as string;

      // Create an image element to get dimensions
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setImagePreview(dataUrl);
          setIsCustom(true);
          return;
        }

        // Set maximum dimension to 600px
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as PNG if original file is PNG to preserve transparency, otherwise JPEG
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = mimeType === 'image/png'
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.85);
        setImagePreview(compressedDataUrl);
        setIsCustom(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMsg('');
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setErrorMsg('');
      processImageFile(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveSuccess(false);
    setErrorMsg('');

    try {
      if (imagePreview === DEFAULT_SIGNATURE_URL) {
        // Saving default: just delete the custom doc
        await deleteDoc(doc(db, 'settings', 'stamp_signature'));
        resetSignatureImage();
        setIsCustom(false);
      } else {
        // Save base64 image string to Firestore permanently
        await setDoc(doc(db, 'settings', 'stamp_signature'), {
          signatureDataUrl: imagePreview,
          updatedAt: new Date().toISOString()
        });
        setSignatureImage(imagePreview);
        setIsCustom(true);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg('Gagal menyimpan stempel ke server.');
      handleFirestoreError(err, OperationType.WRITE, 'settings/stamp_signature');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Apakah Anda yakin ingin menghapus gambar stempel custom dan kembali menggunakan bawaan?')) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, 'settings', 'stamp_signature'));
        resetSignatureImage();
        setImagePreview(DEFAULT_SIGNATURE_URL);
        setIsCustom(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err: any) {
        setErrorMsg('Gagal menghapus stempel dari server.');
        handleFirestoreError(err, OperationType.DELETE, 'settings/stamp_signature');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <PageContainer>
      <PageHeader
        icon={<Image className="w-5 h-5 text-white" />}
        title="Foto Tanda Tangan & Stempel Terpusat"
        description="Kelola satu gambar stempel/tanda tangan resmi secara permanen untuk seluruh laporan notaris."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Upload Box */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Unggah Gambar Baru</h3>
            
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400/80 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-indigo-50/5 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px]"
            >
              <Upload className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-xs font-semibold text-slate-700 mb-1">
                Tarik & taruh gambar di sini, atau <span className="text-indigo-600 hover:underline">pilih file</span>
              </p>
              <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                Format PNG atau JPG. Gambar akan otomatis dioptimalkan agar ringan dan tajam saat diekspor ke PDF.
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                Pilih File Gambar
              </label>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 size={15} />
                  <span>Pengaturan berhasil disimpan!</span>
                </div>
              )}
              {errorMsg && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isCustom && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  Hapus & Reset
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-600/10"
              >
                <Save size={14} />
                {loading ? 'Menyimpan...' : 'Simpan Permanen'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Pratinjau Stempel & TTD</h3>
            
            <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 flex items-center justify-center min-h-[180px] overflow-hidden select-none">
              {imagePreview ? (
                <div className="relative max-w-full max-h-[160px] flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Signature Preview"
                    className="max-w-full max-h-[150px] object-contain mix-blend-multiply transition-transform duration-200"
                    referrerPolicy="no-referrer"
                  />
                  {imagePreview === DEFAULT_SIGNATURE_URL && (
                    <span className="absolute bottom-2 right-2 bg-slate-900/60 text-white px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider backdrop-blur-sm">
                      Bawaan / Default
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-center p-4">
                  <Image className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Belum ada gambar</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-2.5">
            <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-normal">
              Gambar stempel/tanda tangan ini akan langsung digunakan secara otomatis di seluruh 5 model laporan notaris:
              <span className="font-bold text-slate-700 block mt-1">
                • Surat Pengantar MPD<br />
                • Laporan Bulanan Akta<br />
                • Laporan Klapper Akta<br />
                • Laporan Legalisasi & Waarmerking<br />
                • Laporan Protest Cheque
              </span>
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
