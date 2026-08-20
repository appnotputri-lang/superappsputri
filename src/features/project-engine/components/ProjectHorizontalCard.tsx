import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectActivity, ProjectActivityType } from '../../../domain/project/Project';
import { ProjectService } from '../../../services/ProjectService';
import { UserProfile } from '../../../../types';
import { db } from '../../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Calendar, 
  MessageSquare, 
  CheckSquare, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Paperclip, 
  Send, 
  Smile, 
  AtSign, 
  Settings, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  MoreVertical,
  X,
  FileText
} from 'lucide-react';

interface ProjectHorizontalCardProps {
  project: Project;
  currentUser: UserProfile | null;
  onSelectProject: (projectId: string) => void;
  onDeleteProject?: (e: React.MouseEvent, projectId: string, title: string) => void;
  onOpenAddActivityModal?: (project: Project, defaultType?: 'comment' | 'task' | 'issue') => void;
  onOpenTasksModal?: (project: Project) => void;
  indexNumber?: number;
}

const EMOJI_CATEGORIES = {
  smileys: ['😊', '😀', '😃', '😄', '😁', '😂', '🤣', '😭', '😢', '😡'],
  reactions: ['👍', '👎', '🎉', '🔥', '🙏', '👀', '❤️', '👏', '✨', '💯'],
  favorites: ['❤️', '👍', '🔥', '🎉', '😂', '🙏', '👀']
};

const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '🙏'];

const formatRelativeTime = (rawTime: any): string => {
  if (!rawTime) return 'Baru saja';
  let date: Date;
  if (typeof rawTime?.toDate === 'function') {
    date = rawTime.toDate();
  } else if (typeof rawTime?.seconds === 'number') {
    date = new Date(rawTime.seconds * 1000);
  } else {
    date = new Date(rawTime);
  }
  if (isNaN(date.getTime())) return 'Baru saja';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes}m lalu`;
  if (diffHours < 24) return `${diffHours}j lalu`;
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays}d lalu`;
  
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const formatShortDate = (rawTime: any): string => {
  if (!rawTime) return '-';
  let date: Date;
  if (typeof rawTime?.toDate === 'function') {
    date = rawTime.toDate();
  } else if (typeof rawTime?.seconds === 'number') {
    date = new Date(rawTime.seconds * 1000);
  } else {
    date = new Date(rawTime);
  }
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const getCategoryBadge = (jobType: string, projectType?: string) => {
  const combined = ((jobType || '') + ' ' + (projectType || '')).toLowerCase();
  if (combined.includes('rups')) {
    return { badge: '🟣', bg: 'bg-purple-100 text-purple-700 border-purple-200' };
  }
  if (combined.includes('pendirian') || combined.includes('pt')) {
    return { badge: '🔵', bg: 'bg-blue-100 text-blue-700 border-blue-200' };
  }
  if (combined.includes('cv') || combined.includes('perjanjian')) {
    return { badge: '🟢', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }
  return { badge: '🟡', bg: 'bg-amber-100 text-amber-700 border-amber-200' };
};

export const ProjectHorizontalCard: React.FC<ProjectHorizontalCardProps> = ({
  project,
  currentUser,
  onSelectProject,
  onDeleteProject,
  onOpenAddActivityModal,
  onOpenTasksModal,
  indexNumber
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<{ uid: string; name: string }[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<{ uid: string; name: string }[]>([]);

  // Popover States
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<'smileys' | 'reactions' | 'favorites'>('smileys');
  const [activeReactionPickerCommentId, setActiveReactionPickerCommentId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  // Fetch staff list from user_profiles for mention autocomplete
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'user_profiles'), (snapshot) => {
      const profiles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name || data.displayName || data.email?.split('@')[0] || 'User'
        };
      });
      setStaffList(profiles);
    }, (err) => {
      console.warn('Error fetching staff list for mentions:', err);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time activities & comments when expanded
  useEffect(() => {
    if (!isExpanded || !project.projectId) return;

    setIsLoadingThread(true);
    const unsubscribe = ProjectService.subscribeProjectActivitiesAndComments(
      project.projectId,
      (fetchedActivities) => {
        setActivities(fetchedActivities);
        setIsLoadingThread(false);
      },
      (err) => {
        console.error('Error fetching activities:', err);
        setIsLoadingThread(false);
      }
    );

    return () => unsubscribe();
  }, [isExpanded, project.projectId]);

  // Deep Link Auto-expansion & Smooth Scroll to targeted comment
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const targetCommentId = urlParams.get('comment');
    if (!targetCommentId) return;

    const isCurrentProject = window.location.pathname.includes(project.projectId);
    if (isCurrentProject && !isExpanded) {
      setIsExpanded(true);
    }
  }, [project.projectId, isExpanded]);

  useEffect(() => {
    if (!isExpanded || activities.length === 0) return;
    const urlParams = new URLSearchParams(window.location.search);
    const targetCommentId = urlParams.get('comment');
    if (!targetCommentId) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`comment-${targetCommentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/80');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/80');
        }, 4000);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isExpanded, activities]);

  // Click outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setActiveReactionPickerCommentId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const category = getCategoryBadge(project.jobType, project.projectType);
  const clientName = project.clientSnapshot?.companyName || 'Klien Tidak Diketahui';
  const title = project.title || clientName;
  const lastNote = project.minutaNotes || project.lastTransitionComment || `Proyek '${title}' telah berhasil diinisialisasi.`;

  const commentsCount = project.activitiesCount || (project.activities ? project.activities.length : activities.length);
  const tasksCount = project.activeTasksCount ?? (project.tasks ? project.tasks.filter(t => t.status === 'open').length : 0);

  const currentUserId = currentUser?.uid || 'user-1';
  const currentUserName = currentUser?.name || (currentUser as any)?.displayName || 'Staff Notaris';
  const currentUserInitials = currentUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getActiveMentionQuery = () => {
    const cursorPos = inputRef.current?.selectionStart ?? newComment.length;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\- ]*)$/);
    if (!match) return null;
    const q = match[1];
    if (q.includes('  ')) return null;
    return q;
  };

  const activeQuery = getActiveMentionQuery();
  const mentionCandidates = activeQuery !== null
    ? staffList.filter(s => s.name.toLowerCase().includes(activeQuery.toLowerCase())).slice(0, 5)
    : [];

  const handleSelectMention = (user: { uid: string; name: string }) => {
    const cursorPos = inputRef.current?.selectionStart ?? newComment.length;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const textAfterCursor = newComment.slice(cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const replacement = `@${user.name} `;
      const updated = textBeforeCursor.slice(0, lastAtIdx) + replacement + textAfterCursor;
      setNewComment(updated);

      setMentionedUsers(prev => {
        if (prev.some(u => u.uid === user.uid)) return prev;
        return [...prev, { uid: user.uid, name: user.name }];
      });

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursor = lastAtIdx + replacement.length;
          inputRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 10);
    }
  };

  // Add Comment Submission
  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim()) return;

    const mentions = mentionedUsers
      .filter(u => newComment.includes(`@${u.name}`))
      .map(u => u.uid);

    setIsSubmitting(true);
    try {
      await ProjectService.addProjectTimelineComment(project.projectId, {
        userId: currentUserId,
        userName: currentUserName,
        content: newComment.trim(),
        mentions
      });

      setNewComment('');
      setMentionedUsers([]);
      setIsEmojiPickerOpen(false);
    } catch (err) {
      console.error('Gagal memposting komentar:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Reaction Emoji
  const handleToggleReaction = async (commentId: string, emoji: string) => {
    try {
      await ProjectService.toggleCommentReaction(project.projectId, commentId, emoji, currentUserId);
    } catch (err) {
      console.error('Gagal mengubah reaksi:', err);
    } finally {
      setActiveReactionPickerCommentId(null);
    }
  };

  // Delete comment handler
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Hapus komentar ini?')) return;
    try {
      await ProjectService.deleteProjectComment(project.projectId, commentId);
    } catch (err) {
      console.error('Gagal menghapus komentar:', err);
    }
  };

  // Insert Emoji into input at cursor
  const handleInsertEmoji = (emoji: string) => {
    if (!inputRef.current) {
      setNewComment(prev => prev + emoji);
      return;
    }
    const input = inputRef.current;
    const start = input.selectionStart || newComment.length;
    const end = input.selectionEnd || newComment.length;
    const updated = newComment.substring(0, start) + emoji + newComment.substring(end);
    setNewComment(updated);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  };

  const renderContentWithMentions = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[a-zA-Z0-9_\-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-xs mx-0.5">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Extract up to 2 latest activities for card summary
  const recentActivitiesPreview = (project.activities || activities || []).slice(0, 2);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all overflow-hidden group">
      {/* CARD MAIN SECTION (HORIZONTAL DESKTOP / STACKED MOBILE) */}
      <div className="md:grid md:grid-cols-12 md:divide-x md:divide-slate-100 items-stretch">
        
        {/* COLUMN 1: IDENTITAS PROYEK (~35% -> md:col-span-4) */}
        <div 
          onClick={() => onSelectProject(project.projectId)}
          className="p-4 space-y-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors md:col-span-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{category.badge}</span>
                <h3 className="text-xs font-extrabold text-slate-900 leading-snug truncate uppercase font-heading group-hover:text-blue-600 transition-colors">
                  {title}
                </h3>
              </div>
              {indexNumber !== undefined && (
                <span className="text-[10px] text-slate-400 font-mono shrink-0">#{indexNumber}</span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 font-medium truncate uppercase mt-0.5">
              {clientName}
            </p>

            {/* BADGES */}
            <div className="flex flex-wrap gap-1.5 items-center mt-2">
              <span className="px-2 py-0.5 text-[9.5px] font-bold bg-slate-100 text-slate-700 rounded-md uppercase">
                {project.projectType || project.jobType || 'Akta'}
              </span>
              <span className={`px-2 py-0.5 text-[9.5px] font-bold rounded-md border uppercase tracking-wider ${category.bg}`}>
                {project.currentStep || project.status || 'Dalam Proses'}
              </span>
            </div>
          </div>

          {/* CATATAN TERAKHIR */}
          <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100/80 leading-relaxed mt-2">
            <span className="block text-[8px] text-slate-400 font-extrabold uppercase tracking-widest mb-0.5">
              CATATAN TERAKHIR:
            </span>
            <p className="line-clamp-2">{lastNote}</p>
          </div>
        </div>

        {/* COLUMN 2: TIMELINE / AKTIVITAS TERBARU (~45% -> md:col-span-5) */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4 space-y-2 cursor-pointer hover:bg-slate-50/50 transition-colors md:col-span-5 border-t md:border-t-0 border-slate-100 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                UPDATE TERBARU
              </span>
            </div>

            {/* PREVIEW OF 2 LATEST ACTIVITIES */}
            {recentActivitiesPreview.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">Belum ada aktivitas terbaru.</p>
            ) : (
              <div className="space-y-2">
                {recentActivitiesPreview.map((act, idx) => {
                  const isSystem = act.type === 'system' || act.type === 'status_changed';
                  const initials = act.userInitials || (act.userName ? act.userName.substring(0, 2).toUpperCase() : 'US');

                  return (
                    <div key={act.id || idx} className="text-xs text-slate-700 flex items-start gap-2 bg-white/80 p-1.5 rounded-lg border border-slate-100/60">
                      {isSystem ? (
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Settings size={12} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-800 text-[11px] truncate">
                            {act.userName || 'Sistem'}
                          </span>
                          <span className="text-[9.5px] font-medium text-slate-400 shrink-0">
                            {formatRelativeTime(act.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          {renderContentWithMentions(act.message || act.content || '')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* VIEW ALL COMMENTS LINK */}
          <div className="pt-2 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-blue-600 font-bold hover:text-blue-800 text-xs flex items-center gap-1 transition-colors"
            >
              <MessageSquare size={13} />
              <span>Lihat semua {commentsCount} komentar &rarr;</span>
            </button>
          </div>
        </div>

        {/* COLUMN 3: QUICK ACTIONS (~20% -> md:col-span-3) */}
        <div className="p-4 bg-slate-50/40 border-t md:border-t-0 border-slate-100 md:col-span-3 flex md:flex-col justify-between items-center md:items-end gap-3">
          {/* DATE */}
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
            <Calendar size={13} className="text-slate-400" />
            <span>{formatShortDate(project.createdAt)}</span>
          </div>

          {/* COUNTER BUTTONS */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 border border-purple-100"
              title="Komentar"
            >
              <MessageSquare size={13} />
              <span>{commentsCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenTasksModal?.(project)}
              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 border border-sky-100"
              title="Tugas"
            >
              <CheckSquare size={13} />
              <span>{tasksCount}</span>
            </button>
          </div>

          {/* BOTTOM RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-2 relative">
            {/* DETAIL BUTTON */}
            <button
              type="button"
              onClick={() => onSelectProject(project.projectId)}
              className="px-3 py-1.5 rounded-xl bg-[#0c2444] hover:bg-[#16365f] text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <span>DETAIL</span>
              <ArrowRight size={13} />
            </button>

            {/* DELETE BUTTON (ADMIN ONLY) */}
            {currentUser?.role === 'Super Admin' && onDeleteProject && (
              <button
                type="button"
                onClick={(e) => onDeleteProject(e, project.projectId, title)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Hapus Proyek"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EXPANDABLE INLINE COMMENTS & ACTIVITIES SECTION */}
      {isExpanded && (
        <div className="border-t border-slate-200/80 bg-slate-50/70 p-4 md:p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider font-heading">
              Semua Aktivitas & Komentar ({activities.length})
            </h4>
            {isLoadingThread && (
              <span className="text-[10px] font-bold text-blue-600 animate-pulse">Memuat data Firestore...</span>
            )}
          </div>

          {/* CHRONOLOGICAL THREAD LIST */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                Belum ada komentar atau aktivitas. Tulis komentar pertama Anda di bawah!
              </div>
            ) : (
              activities.map((act) => {
                const isSystem = act.type === 'system' || act.type === 'status_changed';
                const initials = act.userInitials || (act.userName ? act.userName.substring(0, 2).toUpperCase() : 'US');
                const reactions = act.reactions || {};

                return (
                  <div
                    key={act.id}
                    id={`comment-${act.id}`}
                    className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2 transition-all duration-700"
                  >
                    {/* COMMENT HEADER */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isSystem ? (
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <Settings size={13} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1e61c3] to-[#174fa3] text-white flex items-center justify-center font-extrabold text-[10px] shrink-0">
                            {initials}
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-900">{act.userName || 'Sistem'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{formatRelativeTime(act.createdAt)}</span>
                        {!isSystem && act.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(act.id)}
                            className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-red-600 active:text-red-700 transition-opacity p-1 -m-1 rounded cursor-pointer"
                            title="Hapus Komentar"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* COMMENT BODY */}
                    <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap pl-8">
                      {renderContentWithMentions(act.message || act.content || '')}
                    </p>

                    {/* ATTACHMENT DISPLAY */}
                    {act.attachmentName && (
                      <div className="ml-8 flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 max-w-fit">
                        <Paperclip size={13} className="text-blue-600 shrink-0" />
                        <span className="truncate max-w-[200px]">{act.attachmentName}</span>
                      </div>
                    )}

                    {/* EMOJI REACTION BAR */}
                    <div className="ml-8 pt-1 flex items-center gap-1.5 flex-wrap relative">
                      {Object.entries(reactions).map(([emoji, uids]) => {
                        const userList = Array.isArray(uids) ? uids : [];
                        const count = userList.length;
                        if (count === 0) return null;
                        const hasReacted = userList.includes(currentUserId);

                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(act.id, emoji)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                              hasReacted
                                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        );
                      })}

                      {/* ADD REACTION EMOJI BUTTON */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReactionPickerCommentId(
                              activeReactionPickerCommentId === act.id ? null : act.id
                            );
                          }}
                          className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
                          title="Tambah Reaksi Emoji"
                        >
                          <Smile size={13} />
                        </button>

                        {/* REACTION EMOJI POPOVER */}
                        {activeReactionPickerCommentId === act.id && (
                          <div 
                            ref={reactionPickerRef}
                            className="absolute left-0 bottom-8 z-40 bg-white p-2 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-1 animate-fade-in"
                          >
                            {DEFAULT_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(act.id, emoji)}
                                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-base flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* INLINE COMMENT INPUT BAR */}
          <form onSubmit={handlePostComment} className="pt-2 relative">
            {/* MENTION AUTOCOMPLETE DROPDOWN */}
            {mentionCandidates.length > 0 && (
              <div className="absolute left-10 bottom-14 z-50 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1 space-y-0.5 animate-fade-in max-h-48 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Pilih Staf (@)
                </div>
                {mentionCandidates.map(u => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => handleSelectMention(u)}
                    className="w-full px-3 py-1.5 text-left hover:bg-blue-50 text-xs font-semibold text-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                      {u.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate">{u.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* INPUT FIELD BAR */}
            <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl border border-slate-300 shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e61c3] to-[#174fa3] text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                {currentUserInitials}
              </div>

              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePostComment();
                  }
                }}
                placeholder="Tulis komentar... Gunakan @nama atau 😊"
                className="flex-1 text-xs text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none border-none py-1"
                disabled={isSubmitting}
              />

              {/* EMOJI PICKER BUTTON */}
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Pilih Emoji"
                >
                  <Smile size={18} />
                </button>

                {/* NON-BLOCKING EMOJI PICKER POPOVER */}
                {isEmojiPickerOpen && (
                  <div className="absolute right-0 bottom-10 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 space-y-2 animate-fade-in">
                    {/* EMOJI CATEGORY TABS */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-[11px] font-bold text-slate-600">
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('smileys')}
                        className={`px-2 py-0.5 rounded-lg ${activeEmojiCategory === 'smileys' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        😊 Smileys
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('reactions')}
                        className={`px-2 py-0.5 rounded-lg ${activeEmojiCategory === 'reactions' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        👍 Reactions
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('favorites')}
                        className={`px-2 py-0.5 rounded-lg ${activeEmojiCategory === 'favorites' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        ❤️ Favorites
                      </button>
                    </div>

                    {/* EMOJI GRID */}
                    <div className="grid grid-cols-5 gap-1 pt-1 max-h-36 overflow-y-auto">
                      {EMOJI_CATEGORIES[activeEmojiCategory].map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleInsertEmoji(emoji)}
                          className="w-9 h-9 rounded-xl hover:bg-slate-100 text-lg flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* MENTION BUTTON */}
              <button
                type="button"
                onClick={() => handleInsertEmoji(' @')}
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Mention User"
              >
                <AtSign size={17} />
              </button>

              {/* SEND BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="px-3 py-1.5 rounded-xl bg-[#0c2444] hover:bg-[#16365f] text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <span>Kirim</span>
                <Send size={12} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectHorizontalCard;
