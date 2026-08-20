import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const supported = PushNotificationClient.isSupported();
    setIsSupported(supported);

    if (supported) {
      const perm = PushNotificationClient.getPermissionState();
      setPermissionState(perm);

      PushNotificationClient.getExistingSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    }
  }, [userId]);

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

  if (!isSupported && variant === 'icon') {
    return null;
  }

  if (variant === 'button') {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isSubscribed
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
          } ${className}`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            <BellRing className="w-4 h-4 text-emerald-600" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          <span>{isSubscribed ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}</span>
        </button>

        {message && (
          <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 animate-fadeIn ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            message.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        title={isSubscribed ? 'Push Notifikasi Aktif (Klik untuk menonaktifkan)' : 'Aktifkan Push Notifikasi Komentar'}
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
