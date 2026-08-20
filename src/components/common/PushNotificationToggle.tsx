import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, BellRing, Loader2, CheckCircle2, AlertCircle, Send, ShieldCheck, RefreshCw } from 'lucide-react';
import { PushNotificationClient } from '../../services/PushNotificationClient';

interface PushNotificationToggleProps {
  userId?: string;
  className?: string;
  variant?: 'icon' | 'button' | 'card';
}

export const PushNotificationToggle: React.FC<PushNotificationToggleProps> = ({
  userId,
  className = '',
  variant = 'icon'
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supported = PushNotificationClient.isSupported();
    setIsSupported(supported);

    if (supported) {
      const perm = PushNotificationClient.getPermissionState();
      setPermissionState(perm);

      // Check browser subscription & verify with D1
      PushNotificationClient.getExistingSubscription().then(async (sub) => {
        setIsSubscribed(!!sub);
        if (userId) {
          try {
            const status = await PushNotificationClient.checkStatus(sub?.endpoint);
            setServerCount(status.count);
            // If browser is subscribed but server D1 has 0 records, auto re-sync
            if (sub && status.count === 0) {
              console.log('[PushToggle] Browser has subscription but D1 has 0 records. Auto re-syncing...');
              await PushNotificationClient.subscribe(userId);
            }
          } catch (e) {
            console.warn('[PushToggle] Status check error:', e);
          }
        }
      });
    }
  }, [userId]);

  // Click outside to close icon dropdown menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleToggle = async () => {
    if (!userId) {
      setMessage({ type: 'error', text: 'Silakan login terlebih dahulu untuk mengaktifkan notifikasi.' });
      return;
    }

    if (!isSupported) {
      const platform = PushNotificationClient.detectPlatform();
      if (platform === 'iOS') {
        setMessage({
          type: 'info',
          text: 'Untuk iOS, tambahkan aplikasi ke Layar Utama (Add to Home Screen) di Safari untuk mengaktifkan Web Push.'
        });
      } else {
        setMessage({ type: 'error', text: 'Browser ini belum mendukung Web Push Notifications.' });
      }
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isSubscribed) {
        // Unsubscribe
        const res = await PushNotificationClient.unsubscribe(userId);
        if (res.success) {
          setIsSubscribed(false);
          setServerCount(0);
          setMessage({ type: 'info', text: 'Push Notifikasi telah dinonaktifkan.' });
        } else {
          setMessage({ type: 'error', text: res.error || 'Gagal menonaktifkan notifikasi.' });
        }
      } else {
        // Subscribe
        const res = await PushNotificationClient.subscribe(userId);
        if (res.success) {
          setIsSubscribed(true);
          setPermissionState('granted');
          setServerCount(1);
          setMessage({ type: 'success', text: 'Push Notifikasi aktif! Anda akan menerima update komentar proyek.' });
        } else {
          setMessage({ type: 'error', text: res.error || 'Gagal mengaktifkan notifikasi.' });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem notifikasi.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 6000);
    }
  };

  const handleSendTestNotification = async () => {
    if (!userId) {
      setMessage({ type: 'error', text: 'Silakan login terlebih dahulu.' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const res = await PushNotificationClient.sendTestNotification();
      if (res.success) {
        setMessage({
          type: 'success',
          text: res.message || 'Notifikasi percobaan berhasil dikirim ke perangkat Anda!'
        });
      } else {
        setMessage({
          type: 'error',
          text: res.message || 'Gagal mengirim notifikasi percobaan.'
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal terhubung ke server notifikasi.' });
    } finally {
      setTesting(false);
      setTimeout(() => setMessage(null), 7000);
    }
  };

  if (!isSupported && variant === 'icon') {
    return null;
  }

  if (variant === 'button' || variant === 'card') {
    return (
      <div className={`flex flex-col gap-2.5 ${className}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isSubscribed
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
            }`}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isSubscribed ? (
              <BellRing className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            <span>{isSubscribed ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}</span>
          </button>

          {isSubscribed && (
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={testing || loading}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
              title="Kirim notifikasi percobaan ke perangkat ini"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Send className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>Kirim Notifikasi Percobaan</span>
            </button>
          )}
        </div>

        {message && (
          <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 animate-fadeIn ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            message.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span className="leading-relaxed">{message.text}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          if (isSubscribed) {
            setShowMenu(!showMenu);
          } else {
            handleToggle();
          }
        }}
        disabled={loading}
        title={isSubscribed ? 'Pengaturan Push Notifikasi (Klik untuk opsi)' : 'Aktifkan Push Notifikasi Komentar'}
        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer relative ${
          isSubscribed
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 shadow-2xs'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
        } ${className}`}
        aria-label="Push Notification Toggle"
      >
        {loading ? (
          <Loader2 className="w-4.5 h-4.5 animate-spin text-blue-600" />
        ) : isSubscribed ? (
          <>
            <BellRing className="w-4.5 h-4.5 text-blue-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </>
        ) : (
          <Bell className="w-4.5 h-4.5" />
        )}
      </button>

      {/* Popover Menu for Subscribed User */}
      {showMenu && isSubscribed && (
        <div className="absolute right-0 top-11 z-50 p-3 w-72 rounded-2xl shadow-xl bg-white border border-slate-200 text-slate-800 text-xs flex flex-col gap-2.5 animate-slideUp">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Push Notifikasi Aktif</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-medium rounded-full">
              D1 Terhubung
            </span>
          </div>

          <p className="text-slate-500 text-[11px] leading-relaxed">
            Perangkat ini terdaftar untuk menerima notifikasi komentar, balasan, dan mention pada proyek.
          </p>

          <div className="flex flex-col gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium transition-colors cursor-pointer"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Kirim Notifikasi Percobaan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                handleToggle();
              }}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-[11px]"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>Nonaktifkan Notifikasi</span>
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`absolute right-0 top-11 z-50 p-3 w-64 rounded-xl shadow-lg text-xs flex items-start gap-2 animate-slideUp backdrop-blur-md border ${
          message.type === 'success' ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700' :
          message.type === 'error' ? 'bg-rose-900/95 text-rose-100 border-rose-700' :
          'bg-slate-900/95 text-slate-100 border-slate-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-snug">{message.text}</div>
        </div>
      )}
    </div>
  );
};

