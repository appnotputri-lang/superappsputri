import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, User, MessageSquare } from 'lucide-react';
import { ChatService } from '../../services/ChatService';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUid: string;
  onSelectUser: (user: { uid: string; name: string }) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  currentUid,
  onSelectUser,
}) => {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const list = await ChatService.getAllUsers();
        // Filter out current user
        const filtered = list.filter((u) => u.uid !== currentUid);
        setUsers(filtered);
      } catch (err) {
        console.error('Failed to load user profiles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, currentUid]);

  const filteredUsers = users.filter((u) => {
    const nameMatch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="new-chat-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-150">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Mulai Percakapan Baru</h3>
                  <p className="text-[11px] text-slate-500">Pilih staf atau admin untuk dihubungi</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                id="close-new-chat-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-150">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-700 placeholder-slate-400"
                  id="search-chat-users-input"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-[11px] text-slate-500 font-medium">Memuat staf...</span>
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => onSelectUser({ uid: user.uid, name: user.name || 'Staff' })}
                    className="w-full p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between transition-all group text-left border border-transparent hover:border-slate-100"
                    id={`chat-user-item-${user.uid}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all">
                        {user.name ? user.name.substring(0, 2).toUpperCase() : <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                          {user.name || 'User'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {user.role || 'Staff'} • {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] bg-slate-100 group-hover:bg-blue-600 group-hover:text-white px-2 py-0.5 rounded-full text-slate-500 font-bold transition-all">
                      Chat
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">Tidak ada staf yang ditemukan</p>
                  <p className="text-[10px] opacity-70">Coba kata kunci pencarian lain</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
