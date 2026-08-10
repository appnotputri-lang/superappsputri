import { db, rtdb, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc,
  collection, 
  query, 
  where, 
  orderBy,
  limit,
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
   * Listen to real-time message stream for an active conversation from Firestore with RTDB fallback
   */
  static subscribeToMessages(conversationId: string, callback: (messages: any[]) => void, limitCount = 50): () => void {
    const messagesCol = collection(db, 'chat_conversations', conversationId, 'messages');
    
    let hasReceivedFirestore = false;

    const unsubscribeFirestore = onSnapshot(
      messagesCol,
      (snapshot) => {
        hasReceivedFirestore = true;
        const rawMessages: any[] = snapshot.docs.map(doc => {
          const data = doc.data();
          let createdAtNum = Date.now();
          if (typeof data.createdAt === 'number') {
            createdAtNum = data.createdAt;
          } else if (data.createdAt?.toMillis) {
            createdAtNum = data.createdAt.toMillis();
          } else if (typeof data.createdAt === 'string') {
            const parsed = new Date(data.createdAt).getTime();
            if (!isNaN(parsed)) createdAtNum = parsed;
          }
          return {
            id: doc.id,
            senderId: data.senderId,
            text: data.text,
            createdAt: createdAtNum
          };
        });

        rawMessages.sort((a, b) => a.createdAt - b.createdAt);
        const messages = rawMessages.slice(-limitCount);
        callback(messages);
      },
      (error) => {
        console.warn("Firestore message snapshot error:", error);
        if (!hasReceivedFirestore) {
          callback([]);
        }
      }
    );

    // Also try RTDB if available
    let unsubscribeRtdb: (() => void) | null = null;
    try {
      const messagesRef = rtdbQuery(ref(rtdb, `chats/${conversationId}/messages`), limitToLast(limitCount));
      const listener = onValue(
        messagesRef,
        (snapshot) => {
          if (snapshot.exists() && snapshot.size > 0) {
            const messages: any[] = [];
            snapshot.forEach((childSnapshot) => {
              const val = childSnapshot.val();
              let createdAtNum = Date.now();
              if (typeof val.createdAt === 'number') {
                createdAtNum = val.createdAt;
              } else if (typeof val.createdAt === 'string') {
                const parsed = new Date(val.createdAt).getTime();
                if (!isNaN(parsed)) createdAtNum = parsed;
              }
              messages.push({
                id: childSnapshot.key,
                senderId: val.senderId,
                text: val.text,
                createdAt: createdAtNum
              });
            });
            messages.sort((a, b) => a.createdAt - b.createdAt);
            callback(messages);
          }
        },
        (error) => {
          console.warn("RTDB subscribeToMessages error:", error);
        }
      );
      unsubscribeRtdb = () => off(messagesRef, 'value', listener);
    } catch (e) {
      // ignore
    }

    return () => {
      unsubscribeFirestore();
      if (unsubscribeRtdb) unsubscribeRtdb();
    };
  }

  /**
   * Load older messages using query cursor based on timestamp
   */
  static async loadOlderMessages(conversationId: string, beforeTimestamp: number, limitCount = 30): Promise<any[]> {
    try {
      const messagesCol = collection(db, 'chat_conversations', conversationId, 'messages');
      const q = query(
        messagesCol,
        where('createdAt', '<', beforeTimestamp),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        let createdAtNum = Date.now();
        if (typeof data.createdAt === 'number') {
          createdAtNum = data.createdAt;
        } else if (data.createdAt?.toMillis) {
          createdAtNum = data.createdAt.toMillis();
        } else if (typeof data.createdAt === 'string') {
          createdAtNum = new Date(data.createdAt).getTime();
        }
        return {
          id: doc.id,
          senderId: data.senderId,
          text: data.text,
          createdAt: createdAtNum
        };
      }).reverse();
      return messages;
    } catch (e) {
      console.warn("loadOlderMessages error:", e);
      return [];
    }
  }

  /**
   * Send a text message:
   * 1. Push to Firestore subcollection /chat_conversations/{id}/messages
   * 2. Push to RTDB /chats/{id}/messages (best-effort)
   * 3. Update Firestore chat_conversations/{id} summary fields
   */
  static async sendMessage(conversationId: string, senderId: string, text: string): Promise<void> {
    const participants = conversationId.split('_');
    const receiverId = participants.find(p => p !== senderId) || senderId;
    const isoString = new Date().toISOString();
    const nowTimestamp = Date.now();

    // 1. Write message to Firestore subcollection
    try {
      const messagesCol = collection(db, 'chat_conversations', conversationId, 'messages');
      await addDoc(messagesCol, {
        senderId,
        text: text.substring(0, 4000),
        createdAt: nowTimestamp
      });
    } catch (err) {
      console.error("Error writing message to Firestore:", err);
    }

    // 2. Write to RTDB (optimistic / best-effort)
    try {
      const messagesRef = ref(rtdb, `chats/${conversationId}/messages`);
      const newMsgRef = push(messagesRef);
      set(newMsgRef, {
        senderId,
        text: text.substring(0, 4000),
        createdAt: nowTimestamp
      }).catch(() => {});

      const receiverUnreadRef = ref(rtdb, `chats/${conversationId}/unread/${receiverId}`);
      rtdbTransaction(receiverUnreadRef, (current) => (current || 0) + 1).catch(() => {});
    } catch (e) {
      // ignore RTDB errors
    }

    // 3. Sync summary fields in Firestore (creates doc if not exists, updates if exists)
    const conversationDocRef = doc(db, 'chat_conversations', conversationId);
    try {
      await setDoc(conversationDocRef, {
        id: conversationId,
        participants: participants,
        lastMessage: text.substring(0, 100),
        lastMessageAt: isoString,
        lastSenderId: senderId,
        [`unreadCount.${receiverId}`]: increment(1)
      }, { merge: true });
    } catch (error) {
      console.warn("Firestore sync in sendMessage warning:", error);
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
