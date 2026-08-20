import { getApiUrl, getAuthHeaders } from '../lib/api';

/**
 * Utility to convert base64 URL safe VAPID public key string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class PushNotificationClient {
  /**
   * Check whether Web Push Notification is supported in this browser/device.
   */
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Detect device platform (Android, iOS, Desktop/Web)
   */
  static detectPlatform(): 'Android' | 'iOS' | 'Desktop' | 'Web' {
    if (typeof window === 'undefined') return 'Web';
    const userAgent = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      return 'iOS';
    }
    if (/Android/.test(userAgent)) {
      return 'Android';
    }
    if (/Macintosh|Windows|Linux/.test(userAgent)) {
      return 'Desktop';
    }
    return 'Web';
  }

  /**
   * Returns current Notification permission status.
   */
  static getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Register service worker if not already registered.
   */
  static async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.warn('[PushClient] Service Worker registration failed:', err);
      return null;
    }
  }

  /**
   * Check if current browser is already subscribed to Push Notifications.
   */
  static async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch (err) {
      console.warn('[PushClient] Error checking subscription:', err);
      return null;
    }
  }

  /**
   * Request permission and subscribe to Web Push Notifications.
   */
  static async subscribe(userId?: string): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
    if (!this.isSupported()) {
      return { success: false, error: 'Web Push tidak didukung pada browser ini.' };
    }

    try {
      // 1. Request notification permission from user
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          error: permission === 'denied'
            ? 'Izin notifikasi ditolak. Silakan aktifkan izin notifikasi di pengaturan browser Anda.'
            : 'Izin notifikasi belum diberikan.'
        };
      }

      // 2. Register Service Worker
      const reg = await this.registerServiceWorker();
      if (!reg) {
        return { success: false, error: 'Gagal mendaftarkan Service Worker.' };
      }

      // 3. Get VAPID public key from backend
      const keyRes = await fetch(getApiUrl('/api/push/vapid-public-key'));
      if (!keyRes.ok) {
        const errJson = await keyRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Push notification service is not configured');
      }
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        throw new Error('VAPID public key tidak tersedia dari server.');
      }

      // 4. Subscribe with PushManager
      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      // 5. Send subscription to server with Firebase Auth Token
      const platform = this.detectPlatform();
      const userAgent = navigator.userAgent;
      const authHeaders = await getAuthHeaders();

      const saveRes = await fetch(getApiUrl('/api/push/subscribe'), {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          platform,
          userAgent
        })
      });

      if (!saveRes.ok) {
        const errJson = await saveRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyimpan subscription ke server.');
      }

      return { success: true, subscription };
    } catch (err: any) {
      console.error('[PushClient] Error subscribing to push:', err);
      return { success: false, error: err.message || 'Gagal mengaktifkan notifikasi.' };
    }
  }

  /**
   * Unsubscribe from Web Push Notifications.
   */
  static async unsubscribe(userId?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) return { success: true };

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        if (endpoint) {
          const authHeaders = await getAuthHeaders();
          await fetch(getApiUrl('/api/push/unsubscribe'), {
            method: 'POST',
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ endpoint })
          }).catch(e => console.warn('[PushClient] Unsubscribe backend sync warning:', e));
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('[PushClient] Error unsubscribing:', err);
      return { success: false, error: err.message || 'Gagal menonaktifkan notifikasi.' };
    }
  }

  /**
   * Check status of active push subscriptions in Cloudflare D1 for current user.
   */
  static async checkStatus(endpoint?: string): Promise<{
    active: boolean;
    count: number;
    subscriptions: { id: string; platform: string; updatedAt: string }[];
  }> {
    try {
      const authHeaders = await getAuthHeaders();
      const url = endpoint 
        ? getApiUrl(`/api/push/status?endpoint=${encodeURIComponent(endpoint)}`)
        : getApiUrl('/api/push/status');
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) return { active: false, count: 0, subscriptions: [] };
      return await res.json();
    } catch (err) {
      console.warn('[PushClient] Failed to check status from server:', err);
      return { active: false, count: 0, subscriptions: [] };
    }
  }

  /**
   * Sends a self-test push notification to verify end-to-end delivery on current device.
   */
  static async sendTestNotification(): Promise<{
    success: boolean;
    message: string;
    subscriptionsFound?: number;
    dispatched?: number;
    failed?: number;
    error?: string;
  }> {
    if (!this.isSupported()) {
      return { success: false, message: 'Web Push tidak didukung pada browser ini.' };
    }

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(getApiUrl('/api/push/test'), {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          message: data.message || data.error || 'Gagal mengirim notifikasi uji coba.',
          subscriptionsFound: data.subscriptionsFound,
          dispatched: data.dispatched,
          failed: data.failed
        };
      }

      return {
        success: true,
        message: data.message || 'Notifikasi uji coba berhasil dikirim!',
        subscriptionsFound: data.subscriptionsFound,
        dispatched: data.dispatched,
        failed: data.failed
      };
    } catch (err: any) {
      console.error('[PushClient] Error sending test notification:', err);
      return {
        success: false,
        message: err.message || 'Gagal terhubung ke server notifikasi.'
      };
    }
  }

  /**
   * Triggers the backend push notification dispatcher after a comment is saved.
   * Sends { projectId, commentId, fallbackData, debugNotifySelf } with Firebase Auth Token.
   */
  static async triggerCommentPushNotification(payload: {
    projectId: string;
    commentId: string;
    debugNotifySelf?: boolean;
    fallbackData?: {
      projectTitle?: string;
      commentContent?: string;
      senderUserName?: string;
      mentions?: string[];
      parentCommentId?: string | null;
      stakeholderUserIds?: string[];
      participantUserIds?: string[];
    };
  }): Promise<void> {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(getApiUrl('/api/push/send-comment-notification'), {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId: payload.projectId,
          commentId: payload.commentId,
          fallbackData: payload.fallbackData,
          debugNotifySelf: payload.debugNotifySelf !== undefined ? payload.debugNotifySelf : true
        })
      });

      const data = await res.json().catch(() => ({}));
      console.log('[Comment Push Debug]', data);
      if (!res.ok) {
        console.warn('[PushClient] Comment push dispatch returned status:', res.status, data);
      } else {
        console.log('[PushClient] Comment push notification successfully dispatched:', data);
      }
    } catch (err) {
      console.warn('[PushClient] Non-blocking push notification trigger failed:', err);
    }
  }
}
