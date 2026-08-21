import React, { useState, useEffect } from 'react';
import { RefreshCw, KeyRound } from 'lucide-react';
import { requestSsoTokenFromParent } from '../../utils/ssoEmbed';
import { useAuthContext } from '../../contexts/AuthContext';

interface EmbedSsoWaitingViewProps {
  onRetry?: () => void;
}

export const EmbedSsoWaitingView: React.FC<EmbedSsoWaitingViewProps> = ({ onRetry }) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const authCtx = useAuthContext();

  const handleManualRetry = () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    console.log('[SSO Embed] Manual retry clicked by user.', {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      retryAttempt: retryCount + 1
    });
    
    if (authCtx?.requestSsoToken) {
      authCtx.requestSsoToken(`manual_retry_click_#${retryCount + 1}`);
    } else {
      requestSsoTokenFromParent(`manual_retry_click_#${retryCount + 1}`);
    }

    if (onRetry) onRetry();

    setTimeout(() => {
      setIsRetrying(false);
    }, 1200);
  };

  // Periodic background request every 2.5 seconds to handle race conditions
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[SSO Embed] Background periodic REQUEST_SSO_TOKEN trigger...');
      if (authCtx?.requestSsoToken) {
        authCtx.requestSsoToken('periodic_background_interval');
      } else {
        requestSsoTokenFromParent('periodic_background_interval');
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [authCtx]);

  const currentRoute = `${window.location.pathname}${window.location.hash ? window.location.hash : ''}`;

  return (
    <div className="min-h-[100dvh] min-h-[var(--app-height)] flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200/80 max-w-md w-full text-center space-y-6">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-teal-100 animate-ping opacity-30" />
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center border border-teal-200/60 shadow-inner">
            <KeyRound className="w-7 h-7 animate-pulse text-teal-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-800">Menunggu Sesi dari Aplikasi Utama</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Halaman ini di-embed dalam Aplikasi Utama (Notaris Putri). Sedang menyambungkan token otentikasi SSO secara otomatis...
          </p>
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Rute: <code className="font-mono text-slate-700">{currentRoute}</code>
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-3">
          <button
            onClick={handleManualRetry}
            disabled={isRetrying}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-75 text-white py-2.5 px-4 rounded-lg font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Meminta Ulang Token...' : 'Minta Ulang Sesi (Retry SSO)'}
          </button>
          
          {retryCount > 0 && (
            <p className="text-[11px] text-slate-400">
              Mencoba meminta ulang ({retryCount}x). Apabila tetap terhenti, pastikan Anda telah login di Aplikasi Utama.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

