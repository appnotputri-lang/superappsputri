import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, MoreVertical, MessageSquare, History, Check } from 'lucide-react';
import { useChat } from '../../hooks/useChat';

interface ChatWindowProps {
  conversationId: string;
  conversation: any;
  currentUid: string;
  onBack: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  conversation,
  currentUid,
  onBack,
}) => {
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    opponentPresence,
    opponentTyping,
    sendMessage,
    handleUserTyping,
    loadMoreMessages,
  } = useChat(conversationId, currentUid);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Derive opponent's name and ID
  const opponentId = conversation.participants.find((p: string) => p !== currentUid) || '';
  const opponentName = conversation.participantNames?.[opponentId] || 'User';

  // Format time for message bubbles
  const formatMsgTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Format date header
  const getMessageDateHeader = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Human-readable presence text
  const getPresenceText = () => {
    if (opponentPresence.online) {
      return 'Online';
    }
    if (!opponentPresence.lastSeen) {
      return 'Offline';
    }
    
    const date = new Date(opponentPresence.lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Baru saja terlihat';
    if (diffMins < 60) return `Aktif ${diffMins} menit yang lalu`;
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return `Aktif hari ini pukul ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return `Aktif pada ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
  };

  // Auto-scroll logic to snap bottom
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, opponentTyping, shouldAutoScroll]);

  // Track scroll position to determine if we should autoscroll and detect top for infinite history
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // If we're within 150px of bottom, autoScroll = true
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShouldAutoScroll(isAtBottom);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    try {
      setShouldAutoScroll(true);
      const textToSend = inputText;
      setInputText(''); // optimistic clear
      await sendMessage(textToSend);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Handle Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    handleUserTyping();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden transition-colors mr-1"
            id="back-to-chatlist-btn"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs border border-slate-200 text-slate-600">
              {opponentName.substring(0, 2).toUpperCase()}
            </div>
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
              opponentPresence.online ? 'bg-green-500' : 'bg-slate-300'
            }`} />
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-800 leading-tight">{opponentName}</h4>
            <p className="text-[9px] text-slate-400 mt-0.5 font-medium flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${opponentPresence.online ? 'bg-green-500' : 'bg-slate-300'}`} />
              {getPresenceText()}
            </p>
          </div>
        </div>

        <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Canvas */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Load History Button */}
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadMoreMessages}
              disabled={loadingMore}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-blue-600 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition-all disabled:opacity-50"
              id="load-older-messages-btn"
            >
              {loadingMore ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <History className="w-3.5 h-3.5" />
              )}
              <span>{loadingMore ? 'Memuat...' : 'Lihat Pesan Terdahulu'}</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-16">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-[11px] text-slate-500 font-semibold">Memuat riwayat chat...</span>
          </div>
        ) : messages.length > 0 ? (
          <>
            {messages.map((msg, index) => {
              const isMe = msg.senderId === currentUid;
              const showDateHeader = index === 0 || 
                (new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString());

              return (
                <div key={msg.id} className="space-y-2">
                  {showDateHeader && (
                    <div className="flex justify-center my-4">
                      <span className="text-[9px] bg-slate-200/80 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
                        {getMessageDateHeader(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-2xs text-xs relative ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 rounded-tl-none border border-slate-200/85'
                    }`}>
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                      
                      <div className="flex items-center justify-end gap-1 mt-1 text-[8px] opacity-75 select-none">
                        <span>{formatMsgTime(msg.createdAt)}</span>
                        {isMe && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-2xs mb-3 text-slate-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold">Belum ada percakapan</p>
            <p className="text-[10px] opacity-75 mt-0.5">Tulis pesan pertama Anda di bawah ini</p>
          </div>
        )}

        {/* Live Typing bubble */}
        {opponentTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200/80 text-slate-500 rounded-2xl rounded-tl-none px-4 py-3 shadow-2xs text-xs flex items-center gap-2">
              <span className="font-semibold text-[10px] text-slate-500">{opponentName} sedang mengetik</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-slate-200 flex items-end gap-2 shrink-0 z-10"
      >
        <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
          <textarea
            value={inputText}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Tulis pesan..."
            className="w-full pl-3 pr-3 py-2 text-xs bg-transparent border-0 focus:outline-hidden focus:ring-0 text-slate-700 placeholder-slate-400 resize-none max-h-24 min-h-[34px]"
            id="chat-message-textarea"
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 border border-blue-700 transition-colors disabled:opacity-50 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 shadow-sm flex items-center justify-center shrink-0"
          id="send-chat-message-btn"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
