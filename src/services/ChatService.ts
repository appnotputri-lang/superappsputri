import { db, rtdb, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  runTransaction, 
  increment 
} from 'firebase/firestore';
import { 
  ref, 
  onValue, 
  push, 
  set, 
  onDisconnect, 
  serverTimestamp, 
  query as rtdbQuery, 
  limitToLast, 
  get, 
  off, 
  endBefore, 
  orderByChild,
  runTransaction as rtdbTransaction
} from 'firebase/database';

export class ChatService {
  /**
   * Helper to derive a consistent, sorted 1-on-1 conversation ID
   */
  static getOrCreateConversationId(uidA: string, uidB: string): string {
    return [uidA, uidB].sort().join('_');
  }

  /**
   * Get an existing conversation metadata document from Firestore
   */
  static async getConversation(conversationId: string): Promise<any | null> {
    try {
      const docRef = doc(db, 'chat_conversations', conversationId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (error) {
      console.warn(`Conversation ${conversationId} check result:`, error);
      return null;
    }
  }

  /**
   * Create a new 1-on-1 conversation metadata document in Firestore
   */
  static async createConversation(
    conversationId: string, 
    participantA: { uid: string; name: string }, 
    participantB: { uid: string; name: string }
  ): Promise<void> {
    const docRef = doc(db, 'chat_conversations', conversationId);
    const data = {
      id: conversationId,
      participants: [participantA.uid, participantB.uid],
      participantNames: {
        [participantA.uid]: participantA.name,
        [participantB.uid]: participantB.name
      },
      lastMessage: '',
      lastMessageAt: new Date().toISOString(),
      lastSenderId: '',
      unreadCount: {
        [participantA.uid]: 0,
        [participantB.uid]: 0
      },
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chat_conversations/${conversationId}`);
    }
  }

  /**
   * Listen to the entire list of conversations for a user from Firestore (Single listener)
   */
  static subscribeToConversationList(uid: string, callback: (conversations: any[]) => void): () => void {
    const q = query(
      collection(db, 'chat_conversations'),
      where('participants', 'array-contains', uid)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by lastMessageAt descending
        const sorted = list.sort((a: any, b: any) => {
          const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return dateB - dateA;
        });
        callback(sorted);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chat_conversations');
      }
    );
  }

  /**
   * Listen to real-time message bubble stream for an active conversation from RTDB
   */
  static subscribeToMessages(conversationId: string, callback: (messages: any[]) => void, limit = 30): () => void {
    const messagesRef = rtdbQuery(ref(rtdb, `chats/${conversationId}/messages`), limitToLast(limit));
    const listener = onValue(messagesRef, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      callback(messages);
    });
    return () => off(messagesRef, 'value', listener);
  }

  /**
   * Load older messages using query cursor endBefore() based on timestamp
   */
  static async loadOlderMessages(conversationId: string, beforeTimestamp: number, limit = 30): Promise<any[]> {
    const messagesRef = ref(rtdb, `chats/${conversationId}/messages`);
    const q = rtdbQuery(
      messagesRef,
      orderByChild('createdAt'),
      endBefore(beforeTimestamp),
      limitToLast(limit)
    );
    const snapshot = await get(q);
    const messages: any[] = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    return messages;
  }

  /**
   * Send a text message:
   * 1. Push to RTDB /chats/{id}/messages
   * 2. Increment receiver's unread in RTDB
   * 3. Update Firestore chat_conversations/{id} summary fields atomically
   */
  static async sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
    const participants = conversationId.split('_');
    const receiverId = participants.find(p => p !== senderId) || senderId;

    // 1. Push message to RTDB
    const messagesRef = ref(rtdb, `chats/${conversationId}/messages`);
    const newMsgRef = push(messagesRef);
    const isoString = new Date().toISOString();

    await set(newMsgRef, {
      senderId,
      text: text.substring(0, 4000),
      createdAt: serverTimestamp()
    });

    // 2. Increment unread in RTDB
    const receiverUnreadRef = ref(rtdb, `chats/${conversationId}/unread/${receiverId}`);
    await rtdbTransaction(receiverUnreadRef, (current) => (current || 0) + 1);

    // 3. Sync summary fields in Firestore via transaction
    const conversationDocRef = doc(db, 'chat_conversations', conversationId);
    try {
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(conversationDocRef);
        if (sfDoc.exists()) {
          transaction.update(conversationDocRef, {
            lastMessage: text.substring(0, 100),
            lastMessageAt: isoString,
            lastSenderId: senderId,
            [`unreadCount.${receiverId}`]: increment(1)
          });
        }
      });
    } catch (error) {
      console.warn("Firestore sync in sendMessage failed or conversation was not pre-initialized:", error);
    }
  }

  /**
   * Resets the current user's unread counter in both RTDB and Firestore index
   */
  static async markConversationAsRead(conversationId: string, uid: string): Promise<void> {
    // 1. Reset RTDB
    const unreadRef = ref(rtdb, `chats/${conversationId}/unread/${uid}`);
    await set(unreadRef, 0);

    // 2. Reset Firestore
    const conversationDocRef = doc(db, 'chat_conversations', conversationId);
    try {
      const docSnap = await getDoc(conversationDocRef);
      if (docSnap.exists()) {
        await updateDoc(conversationDocRef, {
          [`unreadCount.${uid}`]: 0
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chat_conversations/${conversationId}`);
    }
  }

  /**
   * Updates typing indicator in RTDB with automatic disconnect cleanup
   */
  static async setTyping(conversationId: string, uid: string): Promise<void> {
    const typingRef = ref(rtdb, `chats/${conversationId}/typing/${uid}`);
    await set(typingRef, Date.now());
    onDisconnect(typingRef).remove();
  }

  /**
   * Clears typing indicator in RTDB
   */
  static async clearTyping(conversationId: string, uid: string): Promise<void> {
    const typingRef = ref(rtdb, `chats/${conversationId}/typing/${uid}`);
    await set(typingRef, null);
  }

  /**
   * Subscribes to typing indicator list for a conversation
   */
  static subscribeToTyping(conversationId: string, callback: (typingUsers: { [uid: string]: boolean }) => void): () => void {
    const typingRef = ref(rtdb, `chats/${conversationId}/typing`);
    const listener = onValue(typingRef, (snapshot) => {
      const typingUsers: { [uid: string]: boolean } = {};
      const now = Date.now();
      snapshot.forEach((childSnapshot) => {
        const timestamp = childSnapshot.val();
        if (timestamp && now - timestamp < 5000 && childSnapshot.key) {
          typingUsers[childSnapshot.key] = true;
        }
      });
      callback(typingUsers);
    });
    return () => off(typingRef, 'value', listener);
  }

  /**
   * Sets the user's online/offline presence in RTDB with robust disconnected detector
   */
  static setOnlinePresence(uid: string): void {
    const connectedRef = ref(rtdb, '.info/connected');
    const presenceRef = ref(rtdb, `presence/${uid}`);

    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        set(presenceRef, {
          online: true,
          lastSeen: serverTimestamp()
        });
        onDisconnect(presenceRef).set({
          online: false,
          lastSeen: serverTimestamp()
        });
      }
    });
  }

  /**
   * Subscribes to another user's real-time online/offline presence status
   */
  static subscribeToPresence(uid: string, callback: (presence: { online: boolean; lastSeen: number }) => void): () => void {
    const presenceRef = ref(rtdb, `presence/${uid}`);
    const listener = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({ online: false, lastSeen: 0 });
      }
    });
    return () => off(presenceRef, 'value', listener);
  }

  /**
   * Single list of registered user profiles (cached/retrieved via 1-time getDocs)
   */
  static async getAllUsers(): Promise<any[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'user_profiles'));
      return querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'user_profiles');
      return [];
    }
  }
}
