import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectActivity, ProjectActivityType } from '../../../domain/project/Project';
import { ProjectService } from '../../../services/ProjectService';
import { CompanyService } from '../../../services/CompanyService';
import { UserProfile } from '../../../../types';
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
  FileText,
  User,
  Edit2,
  Phone
} from 'lucide-react';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface ProjectHorizontalCardProps {
  project: Project;
  currentUser: UserProfile | null;
  onSelectProject: (projectId: string) => void;
  onDeleteProject?: (e: React.MouseEvent, projectId: string, title: string) => void;
  onOpenAddActivityModal?: (project: Project, defaultType?: 'comment' | 'task' | 'issue') => void;
  onOpenTasksModal?: (project: Project) => void;
  indexNumber?: number;
  staffList?: { uid: string; name: string }[];
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
  indexNumber,
  staffList = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<{ uid: string; name: string }[]>([]);

  // Popover States
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<'smileys' | 'reactions' | 'favorites'>('smileys');
  const [activeReactionPickerCommentId, setActiveReactionPickerCommentId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time activities & comments ONLY when expanded
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

  // Resolve assigned staff from staffList
  const assignedStaff = staffList.find(
    s => s.uid === project.assignedTo || s.uid === project.assignedToUid || s.name === project.assignedTo
  );
  const staffName = assignedStaff ? assignedStaff.name : (project.assignedTo && project.assignedTo !== 'Unassigned' ? project.assignedTo : '');

  // Resolved client ID from project
  const clientId = project.clientId || project.clientSnapshot?.id;

  // Local state for PIC so edits persist and display immediately
  const [picTitleState, setPicTitleState] = useState(
    project.picTitle || project.clientSnapshot?.picTitle || (project.picName?.startsWith('Ibu ') ? 'Ibu' : 'Bapak')
  );
  const [picNameState, setPicNameState] = useState(
    project.picName || project.clientSnapshot?.picName || project.metadata?.picName || project.clientPic || ''
  );
  const [picPhoneState, setPicPhoneState] = useState(
    project.picPhone || project.clientSnapshot?.picPhone || project.clientSnapshot?.phoneNumber || project.metadata?.picPhone || (project as any).phoneNumber || project.clientContact || ''
  );

  useEffect(() => {
    let isMounted = true;
    const initialTitle = project.picTitle || project.clientSnapshot?.picTitle || (project.picName?.startsWith('Ibu ') ? 'Ibu' : 'Bapak');
    const initialName = project.picName || project.clientSnapshot?.picName || project.metadata?.picName || project.clientPic || '';
    const initialPhone = project.picPhone || project.clientSnapshot?.picPhone || project.clientSnapshot?.phoneNumber || project.metadata?.picPhone || (project as any).phoneNumber || project.clientContact || '';
    
    setPicTitleState(initialTitle);
    setPicNameState(initialName);
    setPicPhoneState(initialPhone);

    // Ambil PIC dari data master klien jika belum ada di proyek
    if (clientId && (!initialName || !initialPhone || !project.picTitle)) {
      CompanyService.getCompanyProfile(clientId).then(profile => {
        if (!isMounted || !profile) return;
        const cPicTitle = profile.picTitle || (profile.picName?.startsWith('Ibu ') ? 'Ibu' : 'Bapak');
        const cPicName = profile.picName || (profile as any).pic || '';
        const cPicPhone = profile.picPhone || profile.phoneNumber || (profile as any).phone || (profile as any).telepon || '';

        if (cPicTitle && !project.picTitle) {
          setPicTitleState(cPicTitle);
        }
        if (cPicName && !initialName) {
          setPicNameState(cPicName);
        }
        if (cPicPhone && !initialPhone) {
          setPicPhoneState(cPicPhone);
        }
      }).catch(err => {
        console.warn('[ProjectHorizontalCard] Gagal mengambil PIC dari data klien:', err);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [project.projectId, project.clientId, project.clientSnapshot, project.picTitle, project.picName, project.picPhone, project.metadata, clientId]);

  // Formatted PIC name with Bapak/Ibu prefix
  const formattedPicName = (() => {
    if (!picNameState) return '';
    const clean = picNameState.trim();
    if (clean.startsWith('Bapak ') || clean.startsWith('Ibu ')) return clean;
    const title = picTitleState || 'Bapak';
    return `${title} ${clean}`;
  })();

  // Combined PIC display name: client PIC first, fallback to assigned staff
  const displayPicName = formattedPicName || staffName;

  // Clean phone number strictly for WhatsApp wa.me direct link
  const getCleanWaNumber = (phone: string): string => {
    let clean = phone.replace(/\D/g, '');
    if (!clean) return '';
    if (clean.startsWith('0')) {
      clean = '62' + clean.substring(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
    return clean;
  };

  const cleanPhone = getCleanWaNumber(picPhoneState);
  const defaultWaMessage = `Halo ${displayPicName ? displayPicName : 'Bapak/Ibu'}, kami dari Kantor Notaris & PPAT terkait proyek *${title}*.`;
  const directWaUrl = cleanPhone && cleanPhone.length >= 7 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultWaMessage)}` 
    : '#';

  // WhatsApp modal state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [editPicTitle, setEditPicTitle] = useState('Bapak');
  const [editPicName, setEditPicName] = useState('');
  const [editPicPhone, setEditPicPhone] = useState('');
  const [editCustomMsg, setEditCustomMsg] = useState('');
  const [isSavingPic, setIsSavingPic] = useState(false);

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cleanPhone && cleanPhone.length >= 7) {
      // Direct navigation to wa.me is performed natively by the <a> tag
      return;
    }

    // If phone number is not available yet in client/project data, open modal to enter
    e.preventDefault();
    const curTitle = picTitleState || (picNameState?.startsWith('Ibu ') ? 'Ibu' : 'Bapak');
    let cleanName = picNameState || '';
    if (cleanName.startsWith('Bapak ')) cleanName = cleanName.replace(/^Bapak\s+/, '');
    if (cleanName.startsWith('Ibu ')) cleanName = cleanName.replace(/^Ibu\s+/, '');

    setEditPicTitle(curTitle);
    setEditPicName(cleanName);
    setEditPicPhone(picPhoneState || '');
    setEditCustomMsg(defaultWaMessage);
    setIsWhatsAppModalOpen(true);
  };

  const handleSaveAndRedirectWhatsApp = async () => {
    const phoneToUse = editPicPhone.trim();
    if (!phoneToUse) return;

    setIsSavingPic(true);
    try {
      const trimmedTitle = editPicTitle || 'Bapak';
      const trimmedName = editPicName.trim();
      // 1. Update project in Firestore
      await ProjectService.updateProjectPic(project.projectId, {
        picTitle: trimmedTitle,
        picName: trimmedName,
        picPhone: phoneToUse
      });

      // 2. Sync to master client profile in Firestore so future projects inherit it
      if (clientId) {
        CompanyService.updateCompany(clientId, {
          picTitle: trimmedTitle,
          picName: trimmedName,
          picPhone: phoneToUse,
          phoneNumber: phoneToUse
        }).catch(err => console.warn('[ProjectHorizontalCard] Gagal sinkron PIC ke profil klien:', err));
      }

      setPicTitleState(trimmedTitle);
      setPicNameState(trimmedName);
      setPicPhoneState(phoneToUse);

      const fullName = trimmedName ? (trimmedName.startsWith('Bapak ') || trimmedName.startsWith('Ibu ') ? trimmedName : `${trimmedTitle} ${trimmedName}`) : 'Bapak/Ibu';
      const cleanDigits = getCleanWaNumber(phoneToUse);
      const customMsg = editCustomMsg.trim() || `Halo ${fullName}, kami dari Kantor Notaris & PPAT terkait proyek *${title}*.`;
      const waUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(customMsg)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setIsWhatsAppModalOpen(false);
    } catch (err) {
      console.error('Gagal memperbarui PIC:', err);
      const cleanDigits = getCleanWaNumber(phoneToUse);
      const fullName = editPicName.trim() ? `${editPicTitle} ${editPicName.trim()}` : 'Bapak/Ibu';
      const customMsg = editCustomMsg.trim() || `Halo ${fullName}, kami dari Kantor Notaris & PPAT terkait proyek *${title}*.`;
      const waUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(customMsg)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      setIsWhatsAppModalOpen(false);
    } finally {
      setIsSavingPic(false);
    }
  };

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

            {/* PIC & TOMBOL WHATSAPP */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="mt-2.5 p-2 bg-slate-50/95 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 select-text"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 font-bold text-[10px]">
                  <User size={12} className="text-emerald-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">PIC:</span>
                    <span className="text-[11.5px] font-bold text-slate-800 truncate" title={displayPicName || 'Belum diisi'}>
                      {displayPicName || <span className="text-slate-400 font-normal italic">Belum diisi</span>}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditPicName(displayPicName || '');
                        setEditPicPhone(picPhoneState || '');
                        setEditCustomMsg(`Halo ${displayPicName ? displayPicName : 'Bapak/Ibu'}, kami dari Kantor Notaris & PPAT terkait proyek *${title}*.`);
                        setIsWhatsAppModalOpen(true);
                      }}
                      className="p-0.5 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                      title="Ubah info PIC & Nomor WhatsApp"
                    >
                      <Edit2 size={10} />
                    </button>
                  </div>
                  {picPhoneState ? (
                    <span className="text-[10px] text-slate-500 font-medium block truncate font-mono">
                      {picPhoneState}
                    </span>
                  ) : staffName && !picNameState ? (
                    <span className="text-[9.5px] text-blue-600 font-medium block truncate">
                      Staff Notaris
                    </span>
                  ) : null}
                </div>
              </div>

              {/* TOMBOL WHATSAPP DIRECT KE wa.me */}
              <a
                href={directWaUrl}
                target={cleanPhone && cleanPhone.length >= 7 ? "_blank" : undefined}
                rel={cleanPhone && cleanPhone.length >= 7 ? "noopener noreferrer" : undefined}
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[11px] shadow-2xs transition-all shrink-0 cursor-pointer hover:shadow-sm group/btn no-underline"
                title={cleanPhone ? `WhatsApp direct wa.me: ${displayPicName || 'PIC'} (${picPhoneState})` : 'Klik untuk hubungi via WhatsApp'}
              >
                <WhatsAppIcon className="w-3.5 h-3.5 fill-current transition-transform group-hover/btn:scale-110" />
                <span>WhatsApp</span>
              </a>
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

      {/* WHATSAPP & PIC QUICK MODAL */}
      {isWhatsAppModalOpen && (
        <div 
          onClick={(e) => { e.stopPropagation(); setIsWhatsAppModalOpen(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in text-left"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <WhatsAppIcon className="w-4 h-4 fill-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Hubungi PIC via WhatsApp</h4>
                  <p className="text-[11px] text-slate-500 truncate max-w-[280px]">{title}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                  Nama PIC (Penanggung Jawab Klien)
                </label>
                <div className="flex gap-2">
                  <select
                    value={editPicTitle}
                    onChange={(e) => setEditPicTitle(e.target.value)}
                    className="w-24 shrink-0 px-2.5 py-2 text-xs font-bold border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white text-slate-700 cursor-pointer"
                  >
                    <option value="Bapak">Bapak</option>
                    <option value="Ibu">Ibu</option>
                  </select>
                  <input
                    type="text"
                    value={editPicName}
                    onChange={(e) => setEditPicName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="flex-1 min-w-0 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                  Nomor WhatsApp PIC <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={editPicPhone}
                    onChange={(e) => setEditPicPhone(e.target.value)}
                    placeholder="Contoh: 081234567890 atau 628123456789"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all font-mono"
                    autoFocus
                  />
                  <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Format otomatis disesuaikan (08... otomatis dihubungkan ke 628...)</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide block mb-1">
                  Pesan Pembuka (Opsional)
                </label>
                <textarea
                  value={editCustomMsg}
                  onChange={(e) => setEditCustomMsg(e.target.value)}
                  rows={3}
                  placeholder="Tulis pesan..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!editPicPhone.trim() || isSavingPic}
                onClick={handleSaveAndRedirectWhatsApp}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                <span>{isSavingPic ? 'Menyimpan...' : 'Buka WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectHorizontalCard;
