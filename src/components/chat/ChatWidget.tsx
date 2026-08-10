import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, ChevronDown, MessageSquare } from 'lucide-react';
import { ChatService } from '../../services/ChatService';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { NewChatModal } from './NewChatModal';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const ChatWidget: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  // 1. Subscribe to Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 2. Register Presence & Listen to Conversations when logged in
  useEffect(() => {
    if (!currentUser) {
      setConversations([]);
      return;
    }

    // Set user online presence
    ChatService.setOnlinePresence(currentUser.uid);

    // Listen to conversation index
    const unsubscribeConversations = ChatService.subscribeToConversationList(
      currentUser.uid,
      (list) => {
        setConversations(list);
      }
    );

    return () => {
      unsubscribeConversations();
    };
  }, [currentUser]);

  if (!currentUser) return null;

  const currentUid = currentUser.uid;

  // Calculate total unread count
  const totalUnread = conversations.reduce(
    (sum, conv) => sum + (conv.unreadCount?.[currentUid] || 0),
    0
  );

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleSelectUser = async (opponent: { uid: string; name: string }) => {
    setIsNewChatOpen(false);
    const convId = ChatService.getOrCreateConversationId(currentUid, opponent.uid);

    let existing = await ChatService.getConversation(convId);
    if (!existing) {
      let myName = currentUser.displayName || 'Staff';
      try {
        const myProfileSnap = await getDoc(doc(db, 'user_profiles', currentUid));
        if (myProfileSnap.exists()) {
          myName = myProfileSnap.data().name || myName;
        }
      } catch (err) {
        console.warn('Failed to fetch my name for chat setup, using fallback:', err);
      }

      await ChatService.createConversation(
        convId,
        { uid: currentUid, name: myName },
        { uid: opponent.uid, name: opponent.name }
      );
    }
    setActiveConversationId(convId);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none font-sans">
      {/* Floating Widget Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-20 sm:right-0 bg-white border border-slate-200 shadow-2xl rounded-none sm:rounded-2xl w-full sm:w-[410px] h-full sm:h-[620px] overflow-hidden flex flex-col"
            id="chat-widget-panel"
          >
            {/* Widget Body */}
            <div className="flex-1 overflow-hidden relative">
              {activeConversationId && activeConversation ? (
                <ChatWindow
                  conversationId={activeConversationId}
                  conversation={activeConversation}
                  currentUid={currentUid}
                  onBack={() => setActiveConversationId(null)}
                />
              ) : (
                <ChatList
                  conversations={conversations}
                  currentUid={currentUid}
                  activeConversationId={activeConversationId}
                  onSelectConversation={(id) => {
                    setActiveConversationId(id);
                    // clear unread right away
                    ChatService.markConversationAsRead(id, currentUid);
                  }}
                  onNewChat={() => setIsNewChatOpen(true)}
                />
              )}
            </div>

            {/* Desktop-only Widget Mini Header Footer */}
            <div className="hidden sm:flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 font-bold">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-slate-400" />
                <span>SuperApps Putri Chat</span>
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-0.5 text-slate-500 hover:text-slate-700 font-extrabold transition-colors"
                id="close-chat-widget-btn"
              >
                <span>Tutup</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating action circle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white border transition-all cursor-pointer shadow-lg relative ${
          isOpen
            ? 'bg-slate-800 hover:bg-slate-900 border-slate-900'
            : 'bg-blue-600 hover:bg-blue-700 border-blue-700'
        }`}
        id="toggle-chat-widget-btn"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close-icon"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat-icon"
              initial={{ rotate: 45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -45, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <MessageCircle className="w-6 h-6" />
              
              {/* Unread badge over the button */}
              {totalUnread > 0 && (
                <span className="absolute -top-3 -right-3 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 border-2 border-white text-[10px] font-black text-white flex items-center justify-center shadow-md animate-bounce">
                  {totalUnread}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* New Chat Picker dialog */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        currentUid={currentUid}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
};
export default ChatWidget;
