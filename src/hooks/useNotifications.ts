import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/NotificationService';
import { useAuthContext } from '../contexts/AuthContext';
import { FirestoreTracker } from '../lib/firestoreTracker';

export function useNotifications() {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    FirestoreTracker.logListenerStart('notifications');
    const unsubscribe = NotificationService.listenNotifications((data) => {
      setNotifications(data);
      setLoading(false);
    });

    return () => {
      FirestoreTracker.logListenerStop('notifications');
      unsubscribe();
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const refresh = useCallback(async () => {
    // Listening is real-time, no manual refresh needed for Firestore
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await NotificationService.deleteNotification(id);
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await NotificationService.clearAll(notifications);
    } catch (err: any) {
      setError(err);
      throw err;
    }
  }, [notifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refresh,
    markAsRead,
    deleteNotification,
    clearAll
  };
}
