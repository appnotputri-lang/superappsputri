import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatService } from '../services/ChatService';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
}

export interface Presence {
  online: boolean;
  lastSeen: number;
}

export function useChat(conversationId: string | null, currentUid: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [opponentPresence, setOpponentPresence] = useState<Presence>({ online: false, lastSeen: 0 });
  const [opponentTyping, setOpponentTyping] = useState<boolean>(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingTimeRef = useRef<number>(0);

  // Derive opponent UID from conversationId (format: uidA_uidB)
  const getOpponentId = useCallback(() => {
    if (!conversationId || !currentUid) return null;
    const parts = conversationId.split('_');
    return parts.find(uid => uid !== currentUid) || null;
  }, [conversationId, currentUid]);

  const opponentId = getOpponentId();

  // 1. Subscribe to real-time message stream for the active conversation
  useEffect(() => {
    if (!conversationId || !currentUid) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasMore(true);

    // Timeout safety fallback so loading indicator never hangs indefinitely
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 1500);

    // Subscribe to last 50 messages
    const unsubscribeMessages = ChatService.subscribeToMessages(
      conversationId,
      (newMessages) => {
        clearTimeout(timeoutId);
        setMessages(newMessages);
        setLoading(false);
        if (newMessages.length < 30) {
          setHasMore(false);
        }
      },
      50
    );

    // Reset unread count upon opening conversation
    ChatService.markConversationAsRead(conversationId, currentUid);

    return () => {
      clearTimeout(timeoutId);
      unsubscribeMessages();
    };
  }, [conversationId, currentUid]);

  // 2. Subscribe to opponent's typing indicators
  useEffect(() => {
    if (!conversationId || !opponentId) {
      setOpponentTyping(false);
      return;
    }

    const unsubscribeTyping = ChatService.subscribeToTyping(conversationId, (typingUsers) => {
      setOpponentTyping(!!typingUsers[opponentId]);
    });

    return () => {
      unsubscribeTyping();
    };
  }, [conversationId, opponentId]);

  // 3. Subscribe to opponent's presence
  useEffect(() => {
    if (!opponentId) {
      setOpponentPresence({ online: false, lastSeen: 0 });
      return;
    }

    const unsubscribePresence = ChatService.subscribeToPresence(opponentId, (presence) => {
      setOpponentPresence(presence);
    });

    return () => {
      unsubscribePresence();
    };
  }, [opponentId]);

  // 4. Load older messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore || messages.length === 0) return;

    setLoadingMore(true);
    const oldestMessage = messages[0];
    const oldestTimestamp = oldestMessage.createdAt;

    try {
      const older = await ChatService.loadOlderMessages(conversationId, oldestTimestamp, 30);
      if (older.length < 30) {
        setHasMore(false);
      }
      if (older.length > 0) {
        // Prepend older messages
        setMessages(prev => {
          // Prevent duplicates
          const existingIds = new Set(prev.map(m => m.id));
          const filteredOlder = older.filter(m => !existingIds.has(m.id));
          return [...filteredOlder, ...prev];
        });
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading older messages:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, loadingMore, hasMore, messages]);

  // 5. Send message wrapper
  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId || !currentUid || !text.trim()) return;
    const cleanText = text.trim();
    
    // Stop typing indicator immediately when sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    await ChatService.clearTyping(conversationId, currentUid);
    lastTypingTimeRef.current = 0;

    await ChatService.sendMessage(conversationId, currentUid, cleanText);
  }, [conversationId, currentUid]);

  // 6. Handle typing indicator triggers with smart 2s debounce and auto-clear
  const handleUserTyping = useCallback(() => {
    if (!conversationId || !currentUid) return;

    const now = Date.now();
    // Debounce: only write to RTDB once every 2.5 seconds
    if (now - lastTypingTimeRef.current > 2500) {
      ChatService.setTyping(conversationId, currentUid);
      lastTypingTimeRef.current = now;
    }

    // Reset timeout to clear typing after 4 seconds of silence
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      ChatService.clearTyping(conversationId, currentUid);
      lastTypingTimeRef.current = 0;
    }, 4000);
  }, [conversationId, currentUid]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    opponentPresence,
    opponentTyping,
    sendMessage,
    handleUserTyping,
    loadMoreMessages
  };
}
