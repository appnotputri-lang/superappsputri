import { FirestoreService } from './FirestoreService';
import { db } from '../lib/firebase';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';

export class NotificationService extends FirestoreService {
  static listenNotifications(onNext: (notifications: any[]) => void): () => void {
    return FirestoreService.listenToCollection('notifications', (data) => {
      // Sort by timestamp descending
      const sorted = [...data].sort((a: any, b: any) => 
        (b.timestamp || '').localeCompare(a.timestamp || '')
      );
      onNext(sorted);
    });
  }

  static async sendNotification(user: any, title: string, description: string, type: string): Promise<void> {
    if (!user) return;
    const id = crypto.randomUUID();
    const notifData = {
      title,
      description,
      timestamp: new Date().toISOString(),
      read: false,
      type,
      userId: user.uid || user.email || 'system'
    };
    await FirestoreService.setDocument('notifications', id, notifData);
  }

  static async markAsRead(id: string): Promise<void> {
    await FirestoreService.updateDocument('notifications', id, { read: true });
  }

  static async deleteNotification(id: string): Promise<void> {
    await FirestoreService.deleteDocument('notifications', id);
  }

  static async clearAll(notifications: any[]): Promise<void> {
    const unreadNotifs = notifications.filter(n => !n.read);
    await Promise.all(
      unreadNotifs.map(n => FirestoreService.updateDocument('notifications', n.id, { read: true }))
    );
  }
}
