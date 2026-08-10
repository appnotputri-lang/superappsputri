import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles, CheckCircle2 } from 'lucide-react';

export const UpdatePrompt: React.FC = () => {
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.log('[PWA] Service Worker registered successfully.');
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration failed:', error);
    },
  });

  const closeOffline = () => {
    setOfflineReady(false);
    setOfflineDismissed(true);
  };

  const closeNeedRefresh = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh && (!offlineReady || offlineDismissed)) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full space-y-3 pointer-events-none p-2 sm:p-0">
      {/* Update Available Toast */}
      {needRefresh && (
        <div className="pointer-events-auto bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl backdrop-blur-md flex flex-col space-y-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-2 text-teal-400">
              <Sparkles className="w-5 h-5 shrink-0 animate-pulse" />
              <h4 className="font-semibold text-sm text-slate-100">
                Pembaruan Sistem Available
              </h4>
            </div>
            <button
              onClick={closeNeedRefresh}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
              title="Tutup (Nanti)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Versi baru <span className="font-semibold text-white">SuperApps Putri</span> tersedia. Muat ulang untuk menerapkan pembaruan terbaru.
          </p>

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              onClick={closeNeedRefresh}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            >
              Nanti
            </button>
            <button
              onClick={() => updateServiceWorker(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all flex items-center space-x-1.5 shadow-md shadow-teal-500/20 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      )}

      {/* Offline Ready Toast */}
      {offlineReady && !offlineDismissed && !needRefresh && (
        <div className="pointer-events-auto bg-slate-900/95 border border-slate-800 text-white p-3.5 rounded-xl shadow-lg backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center space-x-2.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-slate-300 truncate">
              Aplikasi siap dipakai offline untuk halaman yang telah dibuka.
            </p>
          </div>
          <button
            onClick={closeOffline}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default UpdatePrompt;
