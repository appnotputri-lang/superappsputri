import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, X as CloseIcon } from 'lucide-react';

export interface SyncPreviewCategory {
  label: string;
  before: string;
  after: string;
}

export interface SyncPreviewModalProps {
  categories: SyncPreviewCategory[];
  warnings: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal konfirmasi yang tampil sebelum data klien (koleksi `profiles` & `company_profiles`)
 * benar-benar ditimpa oleh hasil sinkronisasi dari formulir RUPSLB/RUPST/Pendirian.
 *
 * Tujuannya: mencegah sinkronisasi gagal secara senyap. Kalau sebuah resolusi dicentang
 * di form tapi hasil kalkulasi tidak menunjukkan perubahan apa pun, modal ini akan
 * menampilkan peringatan tegas berwarna merah sehingga notaris sadar SEBELUM data
 * klien ditimpa, bukan setelah dicek manual belakangan.
 */
export const SyncPreviewModal: React.FC<SyncPreviewModalProps> = ({
  categories,
  warnings,
  onConfirm,
  onCancel
}) => {
  const hasWarnings = warnings.length > 0;
  const hasChanges = categories.length > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden animate-slideUp">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm uppercase tracking-wide">Preview Perubahan Data Klien</h3>
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-700">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
          <p className="text-[12px] text-slate-500">
            Berikut ringkasan perubahan yang akan ditulis ke data master klien (profil perusahaan).
            Periksa sebelum melanjutkan — perubahan ini akan menimpa data lama.
          </p>

          {hasWarnings && (
            <div className="border border-red-300 bg-red-50 rounded-lg p-3 space-y-2">
              {warnings.map((w, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[12px] text-red-700 font-semibold">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {hasChanges ? (
            <div className="space-y-2">
              {categories.map((cat, idx) => (
                <div key={idx} className="border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">{cat.label}</div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-slate-500 line-through">{cat.before}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-900 font-semibold">{cat.after}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded text-slate-400 text-[11px] bg-slate-50/50">
              Tidak ada perubahan data klien yang terdeteksi dari formulir ini.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 font-bold rounded-lg text-xs text-white ${
              hasWarnings ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Konfirmasi & Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncPreviewModal;
