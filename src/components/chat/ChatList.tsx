import React, { useState, useEffect } from 'react';
import { Search, Plus, MessageSquare, User } from 'lucide-react';
import { ChatService } from '../../services/ChatService';

interface ChatListProps {
  conversations: any[];
  currentUid: string;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  currentUid,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to format timestamps nicely
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    }

    // Standard date
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const filteredConversations = conversations.filter((conv) => {
    const opponentId = conv.participants.find((p: string) => p !== currentUid) || '';
    const name = conv.participantNames?.[opponentId] || 'User';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Top Section */}
      <div className="p-4 border-b border-slate-150 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Daftar Chat</h3>
          <p className="text-[10px] text-slate-500 font-medium">Hubungi admin & rekan tim</p>
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg border border-blue-700 shadow-xs transition-colors"
          id="start-new-chat-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-slate-50/50 border-b border-slate-150">
        <div className="relative">
          <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari percakapan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-400"
            id="search-conversation-list"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const opponentId = conv.participants.find((p: string) => p !== currentUid) || '';
            const name = conv.participantNames?.[opponentId] || 'User';
            const isActive = activeConversationId === conv.id;
            const unreadCount = conv.unreadCount?.[currentUid] || 0;

            return (
              <ChatListItem
                key={conv.id}
                conversation={conv}
                opponentId={opponentId}
                opponentName={name}
                isActive={isActive}
                unreadCount={unreadCount}
                formatTime={formatTime}
                onClick={() => onSelectConversation(conv.id)}
              />
            );
          })
        ) : (
          <div className="py-16 text-center text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-semibold">Tidak ada obrolan</p>
            <p className="text-[10px] opacity-75 mt-0.5">Klik 'Baru' untuk memulai</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* Child item containing its own lightweight listener for live presence dot */
interface ChatListItemProps {
  conversation: any;
  opponentId: string;
  opponentName: string;
  isActive: boolean;
  unreadCount: number;
  formatTime: (time?: string) => string;
  onClick: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  conversation,
  opponentId,
  opponentName,
  isActive,
  unreadCount,
  formatTime,
  onClick,
}) => {
  const [presence, setPresence] = useState<{ online: boolean }>({ online: false });

  useEffect(() => {
    if (!opponentId) return;
    const unsubscribe = ChatService.subscribeToPresence(opponentId, (p) => {
      setPresence(p);
    });
    return () => {
      unsubscribe();
    };
  }, [opponentId]);

  return (
    <button
      onClick={onClick}
      className={`w-full p-3.5 flex items-start gap-3 transition-colors text-left relative ${
        isActive ? 'bg-blue-50/85 hover:bg-blue-50/90' : 'hover:bg-slate-50'
      }`}
      id={`conversation-item-${conversation.id}`}
    >
      {/* Avatar with Presence Indicator */}
      <div className="relative shrink-0">
        <div className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center border transition-all ${
          isActive 
            ? 'bg-blue-600 text-white border-blue-700 shadow-xs' 
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          {opponentName.substring(0, 2).toUpperCase()}
        </div>
        
        {/* Status dot */}
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white transition-all ${
          presence.online ? 'bg-green-500' : 'bg-slate-300'
        }`} />
      </div>

      {/* Info Panel */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={`text-xs font-bold truncate transition-colors ${
            isActive ? 'text-blue-900' : 'text-slate-800'
          }`}>
            {opponentName}
          </h4>
          <span className="text-[9px] text-slate-400 font-medium shrink-0">
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>

        {/* Message preview & unread badge */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className={`text-[11px] truncate flex-1 ${
            unreadCount > 0 ? 'text-slate-800 font-extrabold' : 'text-slate-500 font-normal'
          }`}>
            {conversation.lastMessage || <span className="italic opacity-60 text-[10px]">Mulai chat...</span>}
          </p>

          {unreadCount > 0 && (
            <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-extrabold text-white flex items-center justify-center border border-white shrink-0 animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
