import React, { useState, useRef, useEffect } from 'react';
import { Project, ProjectActivity, ProjectTask, ProjectActivityType } from '../../../domain/project/Project';
import { UserProfile } from '../../../../types';
import { MessageSquare, CheckSquare, AlertTriangle, Send, Plus, X, Calendar, User, Clock, CheckCircle2, Circle } from 'lucide-react';

export const TEAM_MEMBERS = [
  'Putri Notaris',
  'Nendi Suhendi',
  'Admin',
  'Staff Notaris'
];

export const getInitials = (name: string): string => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const formatActivityTime = (timestamp: any): string => {
  if (!timestamp) return '';
  let date: Date;
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'number' || typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date();
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  return `${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

export const renderFormattedMessage = (msg: string) => {
  if (!msg) return null;
  const parts = msg.split(/(@[\w\s]+?)(?=\s|$|[.,!?])/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <span key={i} className="font-bold text-blue-600 bg-blue-50 px-1 rounded">
              {part}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
};

export const getActivityBadge = (type: ProjectActivityType) => {
  switch (type) {
    case 'comment':
      return {
        label: 'KOMENTAR',
        className: 'bg-purple-100 text-purple-700 border-purple-200',
        dotBg: 'bg-purple-600'
      };
    case 'task_created':
      return {
        label: 'TUGAS DIBUAT',
        className: 'bg-sky-100 text-sky-700 border-sky-200',
        dotBg: 'bg-sky-600'
      };
    case 'task_completed':
      return {
        label: 'TUGAS SELESAI',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        dotBg: 'bg-emerald-600'
      };
    case 'issue':
      return {
        label: 'KENDALA',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        dotBg: 'bg-amber-600'
      };
    default:
      return {
        label: 'AKTIVITAS',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
        dotBg: 'bg-slate-500'
      };
  }
};

/* =========================================================
   1. ACTIVITY FEED IN CARD
   ========================================================= */
interface ProjectActivityFeedProps {
  activities?: ProjectActivity[];
  onOpenTimeline: () => void;
}

export const ProjectActivityFeed: React.FC<ProjectActivityFeedProps> = ({
  activities = [],
  onOpenTimeline
}) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="mt-3 pt-2.5 border-t border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Update Terbaru</span>
        </div>
        <div className="text-[11px] text-slate-400 italic py-1">Belum ada aktivitas terbaru.</div>
      </div>
    );
  }

  // Sort newest first
  const sorted = [...activities].sort((a, b) => {
    const timeA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const displayList = sorted.slice(0, 3);
  const totalCount = sorted.length;

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          Update Terbaru
        </span>
        {totalCount > 3 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTimeline();
            }}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            Lihat semua {totalCount} aktivitas &rarr;
          </button>
        )}
      </div>

      <div className="space-y-2">
        {displayList.map((act) => {
          const badge = getActivityBadge(act.type);
          return (
            <div key={act.id} className="bg-slate-50/80 rounded-lg p-2 border border-slate-100 text-[11.5px] leading-snug">
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full ${badge.dotBg} text-white font-extrabold text-[9px] flex items-center justify-center shrink-0`}>
                    {getInitials(act.userName)}
                  </span>
                  <span className="font-bold text-slate-800 truncate text-[11px]">{act.userName}</span>
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border uppercase tracking-wider shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <span className="text-[9.5px] font-mono text-slate-400 shrink-0">{formatActivityTime(act.createdAt)}</span>
              </div>
              <p className="text-slate-700 pl-6 line-clamp-2">{renderFormattedMessage(act.message)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* =========================================================
   2. BOTTOM SHEET / MODAL: TAMBAH AKTIVITAS
   ========================================================= */
interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitComment: (message: string, mentions: string[]) => Promise<void>;
  onSubmitTask: (task: { title: string; assignedTo: string; assignedToName: string; deadline: string; description: string }) => Promise<void>;
  onSubmitIssue: (message: string) => Promise<void>;
  currentUser: UserProfile | null;
}

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  onSubmitComment,
  onSubmitTask,
  onSubmitIssue,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'comment' | 'task' | 'issue'>('comment');
  const [submitting, setSubmitting] = useState(false);

  // Comment Form
  const [commentText, setCommentText] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState(TEAM_MEMBERS[0]);
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskNote, setTaskNote] = useState('');

  // Issue Form
  const [issueText, setIssueText] = useState('');

  if (!isOpen) return null;

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);

    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1) {
      const textAfterAt = val.substring(lastAtPos + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentionDropdown(true);
        setMentionQuery(textAfterAt.toLowerCase());
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const selectMention = (memberName: string) => {
    const lastAtPos = commentText.lastIndexOf('@');
    const newText = commentText.substring(0, lastAtPos) + `@${memberName} `;
    setCommentText(newText);
    setShowMentionDropdown(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const extractMentions = (text: string): string[] => {
    const matches = text.match(/@([\w\s]+?)(?=\s|$|[.,!?])/g);
    if (!matches) return [];
    return matches.map(m => m.substring(1).trim());
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const mentions = extractMentions(commentText);
      await onSubmitComment(commentText.trim(), mentions);
      setCommentText('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      alert('Judul tugas wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitTask({
        title: taskTitle.trim(),
        assignedTo: taskAssignedTo,
        assignedToName: taskAssignedTo,
        deadline: taskDeadline,
        description: taskNote.trim()
      });
      setTaskTitle('');
      setTaskNote('');
      setTaskDeadline('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim()) {
      alert('Keterangan kendala wajib diisi.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitIssue(issueText.trim());
      setIssueText('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = TEAM_MEMBERS.filter(m => m.toLowerCase().includes(mentionQuery));

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm">Tambah Aktivitas</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-300">
            <X size={18} />
          </button>
        </div>

        {/* Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('comment')}
            className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'comment' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <MessageSquare size={14} />
            <span>Komentar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('task')}
            className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'task' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckSquare size={14} />
            <span>Tugas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('issue')}
            className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'issue' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Kendala</span>
          </button>
        </div>

        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {/* TAB 1: KOMENTAR */}
          {activeTab === 'comment' && (
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pesan / Komentar <span className="text-slate-400 font-normal">(Ketik @ untuk mention karyawan)</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={handleCommentChange}
                  placeholder="Tulis komentar... (misal: @Nendi tolong follow up)"
                  rows={4}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />

                {showMentionDropdown && filteredMembers.length > 0 && (
                  <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto p-1">
                    <div className="text-[10px] font-extrabold text-slate-400 px-2 py-1 uppercase">Mention Karyawan</div>
                    {filteredMembers.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => selectMention(m)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-purple-50 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center">
                          {getInitials(m)}
                        </span>
                        <span>{m}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  <span>{submitting ? 'Sending...' : 'Kirim'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: TUGAS */}
          {activeTab === 'task' && (
            <form onSubmit={handleTaskSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Tugas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Contoh: Follow up dokumen KTP"
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ditugaskan Kepada</label>
                  <select
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
                  >
                    {TEAM_MEMBERS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan (Opsional)</label>
                <textarea
                  value={taskNote}
                  onChange={(e) => setTaskNote(e.target.value)}
                  placeholder="Tambah rincian atau catatan tugas..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !taskTitle.trim()}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare size={14} />
                  <span>{submitting ? 'Memproses...' : 'Buat Tugas'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: KENDALA */}
          {activeTab === 'issue' && (
            <form onSubmit={handleIssueSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Kendala <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  placeholder="Jelaskan kendala atau masalah yang dihadapi pada proyek ini..."
                  rows={4}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !issueText.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle size={14} />
                  <span>{submitting ? 'Memproses...' : 'Laporkan Kendala'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   3. BOTTOM SHEET / MODAL: ACTIVITY TIMELINE
   ========================================================= */
interface ActivityTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  activities?: ProjectActivity[];
  onSubmitComment: (message: string, mentions: string[]) => Promise<void>;
}

export const ActivityTimelineModal: React.FC<ActivityTimelineModalProps> = ({
  isOpen,
  onClose,
  project,
  activities = [],
  onSubmitComment
}) => {
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  if (!isOpen || !project) return null;

  const sorted = [...activities].sort((a, b) => {
    const timeA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const lastAtPos = val.lastIndexOf('@');
    if (lastAtPos !== -1) {
      const textAfterAt = val.substring(lastAtPos + 1);
      if (!textAfterAt.includes(' ')) {
        setShowMentionDropdown(true);
        setMentionQuery(textAfterAt.toLowerCase());
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const selectMention = (memberName: string) => {
    const lastAtPos = inputText.lastIndexOf('@');
    const newText = inputText.substring(0, lastAtPos) + `@${memberName} `;
    setInputText(newText);
    setShowMentionDropdown(false);
  };

  const extractMentions = (text: string): string[] => {
    const matches = text.match(/@([\w\s]+?)(?=\s|$|[.,!?])/g);
    if (!matches) return [];
    return matches.map(m => m.substring(1).trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setSubmitting(true);
    try {
      const mentions = extractMentions(inputText);
      await onSubmitComment(inputText.trim(), mentions);
      setInputText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = TEAM_MEMBERS.filter(m => m.toLowerCase().includes(mentionQuery));

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-200">
        <div className="p-4 bg-blue-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-sm">Aktivitas Proyek</h3>
            <p className="text-[11px] text-blue-200 truncate max-w-xs">{project.title}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Timeline List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              Belum ada aktivitas pada proyek ini. Tulis komentar pertama di bawah.
            </div>
          ) : (
            sorted.map((act) => {
              const badge = getActivityBadge(act.type);
              return (
                <div key={act.id} className="flex gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs">
                  <span className={`w-7 h-7 rounded-full ${badge.dotBg} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                    {getInitials(act.userName)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">{act.userName}</span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border uppercase tracking-wider ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{formatActivityTime(act.createdAt)}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{renderFormattedMessage(act.message)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 bg-slate-100 border-t border-slate-200 shrink-0 relative">
          {showMentionDropdown && filteredMembers.length > 0 && (
            <div className="absolute left-3 right-3 bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-36 overflow-y-auto p-1">
              {filteredMembers.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMention(m)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">
                    {getInitials(m)}
                  </span>
                  <span>{m}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder="Tulis komentar... (ketik @ untuk mention)"
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !inputText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Send size={13} />
              <span>Kirim</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   4. BOTTOM SHEET / MODAL: PROJECT TASKS
   ========================================================= */
interface ProjectTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  tasks?: ProjectTask[];
  onToggleTask: (taskId: string, currentStatus: 'open' | 'completed') => Promise<void>;
  onOpenAddTask: () => void;
}

export const ProjectTasksModal: React.FC<ProjectTasksModalProps> = ({
  isOpen,
  onClose,
  project,
  tasks = [],
  onToggleTask,
  onOpenAddTask
}) => {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-200">
        <div className="p-4 bg-sky-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <CheckSquare size={16} />
              Tugas Proyek
            </h3>
            <p className="text-[11px] text-sky-200 truncate max-w-xs">{project.title}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-200 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs italic">
              Belum ada tugas khusus pada proyek ini.
            </div>
          ) : (
            tasks.map((t) => {
              const isDone = t.status === 'completed';
              return (
                <div
                  key={t.id}
                  onClick={() => onToggleTask(t.id, t.status)}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    isDone ? 'bg-emerald-50/50 border-emerald-200 text-slate-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 text-slate-800'
                  }`}
                >
                  <button type="button" className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-600">
                    {isDone ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {t.title}
                    </h4>
                    {t.description && <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>}
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5 flex-wrap">
                      {t.assignedToName && (
                        <span className="flex items-center gap-1 font-semibold text-slate-600">
                          <User size={11} /> {t.assignedToName}
                        </span>
                      )}
                      {t.deadline && (
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar size={11} /> {t.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-slate-100 border-t border-slate-200 shrink-0">
          <button
            onClick={() => {
              onClose();
              onOpenAddTask();
            }}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>Buat Tugas Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};
