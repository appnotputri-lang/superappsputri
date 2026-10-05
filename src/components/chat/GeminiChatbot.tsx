import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  RefreshCw, 
  Sparkles, 
  Minimize2, 
  Maximize2, 
  Copy, 
  Check, 
  User, 
  Building2, 
  FileText, 
  PlusCircle, 
  Search,
  Zap,
  Cpu,
  ChevronDown
} from 'lucide-react';
import { getApiUrl } from '../../lib/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
  d1Clients?: {
    id: string;
    clientId: string;
    companyName: string;
    clientType?: string;
    domicile?: string;
    npwp?: string;
  }[];
}

const STORAGE_KEY = 'superapps_gemini_chat_history_v1';

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content: `Halo! Saya **Asisten Cerdas Notaris & PPAT Putri**.

Saya siap membantu Anda dalam:
1. 📂 **Memahami Proyek Kerja**: Mengetahui tahapan akta (Pendirian PT/CV, RUPS-LB, RUPST, AJB PPAT, Hibah Hak Cipta, Sewa Menyewa, dll.).
2. 🧾 **Membuat Invoice & Penawaran**: Menghitung honorarium jasa, PNBP, dan pemotongan pajak (**PPh 21**, **PPh Final 2.5%**, **BPHTB**), serta menyusun draf penawaran resmi.
3. 🔍 **Mencari Klien di Database Cloudflare D1**: Ketik nama PT, CV, atau klien untuk menemukan data profil lengkap.

Ada yang bisa saya bantu hari ini?`,
  timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
};

const SUGGESTED_PROMPTS = [
  { icon: Search, label: 'Cari data klien di Cloudflare D1', text: 'Tolong carikan data klien di database Cloudflare D1' },
  { icon: FileText, label: 'Cara buat invoice & penawaran dari proyek', text: 'Bagaimana alur membuat invoice dan penawaran dari proyek kerja?' },
  { icon: Building2, label: 'Draf penawaran Akta Hibah Hak Cipta', text: 'Buatkan draf rincian penawaran biaya pengurusan Akta Hibah Hak Cipta beserta perkiraan honorarium dan PPh 21' },
  { icon: Zap, label: 'Perhitungan Pajak PPh 21 Notaris', text: 'Jelaskan ketentuan dan perhitungan pemotongan PPh Pasal 21 untuk jasa Notaris/PPAT' },
];

export const GeminiChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved chat history:', e);
    }
    return [INITIAL_MESSAGE];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview'>('gemini-3.5-flash');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Persist messages in sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat history:', e);
    }
  }, [messages]);

  // Listen to custom event to open chat with prefilled context
  useEffect(() => {
    const handleOpenChatEvent = (e: CustomEvent<{ message?: string; autoSend?: boolean }>) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e.detail?.message) {
        if (e.detail.autoSend) {
          handleSendMessage(e.detail.message);
        } else {
          setInputMessage(e.detail.message);
          setTimeout(() => textareaRef.current?.focus(), 100);
        }
      }
    };

    window.addEventListener('open-gemini-chat' as any, handleOpenChatEvent as any);
    return () => {
      window.removeEventListener('open-gemini-chat' as any, handleOpenChatEvent as any);
    };
  }, [messages, selectedModel]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputMessage).trim();
    if (!prompt || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      // Prepare conversation payload
      const payloadMessages = newHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: payloadMessages,
          model: selectedModel
        })
      });

      const resData = await response.json() as any;

      if (!response.ok || !resData.success) {
        throw new Error(resData?.error || 'Gagal memproses pesan.');
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: resData.reply || 'Maaf, tidak ada tanggapan yang diterima.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        model: resData.model || selectedModel,
        d1Clients: resData.d1Clients || []
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Maaf, terjadi kendala**: ${err?.message || 'Gagal menghubungi server Gemini AI'}.\n\n*Silakan periksa konfigurasi GEMINI_API_KEY atau coba sesaat lagi.*`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Bersihkan riwayat percakapan?')) {
      setMessages([INITIAL_MESSAGE]);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenQuotation = (clientName: string, clientId?: string) => {
    const targetUrl = `#/quotations/new?clientId=${encodeURIComponent(clientId || '')}&clientName=${encodeURIComponent(clientName)}`;
    window.location.hash = targetUrl;
  };

  const handleOpenInvoice = (clientName: string, clientId?: string) => {
    const targetUrl = `#/invoice?new=true&clientId=${encodeURIComponent(clientId || '')}&clientName=${encodeURIComponent(clientName)}`;
    window.location.hash = targetUrl;
  };

  // Quick markdown simple formatter (bold, lists, code)
  const renderFormattedContent = (content: string) => {
    return (
      <div className="text-xs sm:text-[13px] leading-relaxed space-y-2 select-text">
        {content.split('\n\n').map((paragraph, pIdx) => {
          // List block
          if (paragraph.startsWith('- ') || paragraph.startsWith('* ') || /^[0-9]+\.\s/.test(paragraph)) {
            const lines = paragraph.split('\n');
            return (
              <div key={pIdx} className="space-y-1 my-1">
                {lines.map((line, lIdx) => {
                  const isNumbered = /^[0-9]+\.\s/.test(line);
                  const isBullet = line.startsWith('- ') || line.startsWith('* ');
                  const cleanText = line.replace(/^([0-9]+\.\s*|[-*]\s*)/, '');
                  return (
                    <div key={lIdx} className="flex items-start gap-2 pl-1">
                      <span className="text-blue-600 font-bold shrink-0 text-[11px] mt-0.5">
                        {isNumbered ? line.match(/^[0-9]+\./)?.[0] : '•'}
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cleanText) }} />
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <p 
              key={pIdx} 
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(paragraph) }} 
            />
          );
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-blue-50 text-blue-800 px-1 py-0.5 rounded text-[11px] font-mono border border-blue-200/60">$1</code>');
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer group border border-white/20"
          title="Buka Asisten AI Gemini SuperApps"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-blue-600" />
          </div>
          <span className="font-bold text-xs tracking-wide pr-1">Asisten AI SuperApps</span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div 
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-white border border-slate-300 shadow-2xl rounded-2xl overflow-hidden ${
            isMinimized 
              ? 'bottom-5 right-5 w-80 h-14' 
              : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[460px] h-[580px] max-h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-blue-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-black tracking-wide truncate flex items-center gap-1.5">
                  <span>Asisten AI SuperApps</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </h3>
                <p className="text-[10px] text-blue-200/80 truncate">Proyek Kerja • Invoice & Penawaran • Klien D1</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400 shrink-0">
              <button
                onClick={handleClearHistory}
                className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Bersihkan riwayat percakapan"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                title={isMinimized ? 'Perbesar' : 'Kecilkan'}
              >
                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Tutup chat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Model & Status Bar */}
              <div className="bg-slate-50 border-b border-slate-200/80 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] shrink-0">
                <div className="flex items-center gap-1 text-slate-500">
                  <Cpu size={12} className="text-blue-600" />
                  <span className="font-semibold text-slate-700">Model:</span>
                </div>
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.5-flash')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      selectedModel === 'gemini-3.5-flash' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Gemini 3.5 Flash: Kecepatan & nalar tinggi untuk tugas umum"
                  >
                    Flash
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      selectedModel === 'gemini-3.1-flash-lite' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Gemini 3.1 Flash-Lite: Respons super cepat"
                  >
                    Lite
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      selectedModel === 'gemini-3.1-pro-preview' ? 'bg-indigo-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Gemini 3.1 Pro: Nalar kompleks & analisis mendalam"
                  >
                    Pro
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 no-scrollbar">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <Bot size={14} />
                        </div>
                      )}

                      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`rounded-2xl p-3.5 shadow-2xs relative group ${
                            isUser
                              ? 'bg-blue-600 text-white rounded-tr-xs'
                              : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                          }`}
                        >
                          {isUser ? (
                            <p className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap select-text">
                              {msg.content}
                            </p>
                          ) : (
                            renderFormattedContent(msg.content)
                          )}

                          {!isUser && (
                            <button
                              onClick={() => handleCopy(msg.content, msg.id)}
                              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 bg-white/80 hover:bg-white rounded border border-slate-200/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-2xs"
                              title="Salin pesan"
                            >
                              {copiedId === msg.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          )}
                        </div>

                        {/* Interactive D1 Client Cards (if clients were detected) */}
                        {msg.d1Clients && msg.d1Clients.length > 0 && (
                          <div className="bg-white border border-blue-200 rounded-xl p-3 shadow-xs space-y-2 animate-fade-in">
                            <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1">
                              <Building2 size={12} className="text-blue-600" />
                              Data Klien Terkait di Cloudflare D1
                            </div>
                            <div className="space-y-1.5">
                              {msg.d1Clients.map((cl) => (
                                <div 
                                  key={cl.id}
                                  className="p-2 bg-slate-50 hover:bg-blue-50/50 rounded-lg border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                      <span>{cl.companyName}</span>
                                      {cl.clientType && (
                                        <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                                          {cl.clientType}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      {cl.domicile || 'Domisili tidak tercatat'} {cl.npwp ? `• NPWP: ${cl.npwp}` : ''}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                                    <button
                                      onClick={() => handleOpenQuotation(cl.companyName, cl.clientId)}
                                      className="px-2 py-1 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 rounded text-[10px] font-bold text-blue-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                                      title="Buat Penawaran untuk Klien Ini"
                                    >
                                      <FileText size={10} /> Penawaran
                                    </button>
                                    <button
                                      onClick={() => handleOpenInvoice(cl.companyName, cl.clientId)}
                                      className="px-2 py-1 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded text-[10px] font-bold text-emerald-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                                      title="Buat Invoice untuk Klien Ini"
                                    >
                                      <PlusCircle size={10} /> Invoice
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className={`text-[10px] text-slate-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                          {msg.timestamp}
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-2xs flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-xs text-slate-400 ml-1">Mengetik tanggapan...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestion Chips */}
              <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
                {SUGGESTED_PROMPTS.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(p.text)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200/80 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Icon size={11} className="text-blue-600" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Input Form */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-end gap-2 bg-slate-50 border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 rounded-2xl p-2 transition-all"
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanyakan proyek, invoice, penawaran, atau cari klien D1..."
                    className="flex-1 bg-transparent border-none outline-none resize-none text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 py-1 px-1.5 max-h-28"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                    title="Kirim pesan"
                  >
                    <Send size={15} />
                  </button>
                </form>
                <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 pt-1.5">
                  <span>Enter untuk kirim, Shift+Enter untuk baris baru</span>
                  <span className="font-semibold text-blue-600">Gemini 3.5 AI</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
