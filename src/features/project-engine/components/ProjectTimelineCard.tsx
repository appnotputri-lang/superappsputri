import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectActivity, ProjectActivityType } from '../../../domain/project/Project';
import { ProjectService } from '../../../services/ProjectService';
import { CompanyService } from '../../../services/CompanyService';
import { 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Paperclip, 
  Send, 
  CheckSquare, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  User, 
  FileText, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Smile, 
  AtSign, 
  Trash2,
  Phone
} from 'lucide-react';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const EMOJI_CATEGORIES = {
  smileys: ['😊', '😀', '😃', '😄', '😁', '😂', '🤣', '😭', '😢', '😡'],
  reactions: ['👍', '👎', '🎉', '🔥', '🙏', '👀', '❤️', '👏', '✨', '💯'],
  favorites: ['❤️', '👍', '🔥', '🎉', '😂', '🙏', '👀']
};

const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '🙏'];

interface ProjectTimelineCardProps {
  project: Project;
  currentUser?: any;
  onNavigateToDetail?: (projectId: string) => void;
  defaultExpanded?: boolean;
  staffList?: { uid: string; name: string }[];
}

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
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}j`;
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const formatThreadTime = (rawTime: any): string => {
  if (!rawTime) return '';
  let date: Date;
  if (typeof rawTime?.toDate === 'function') {
    date = rawTime.toDate();
  } else if (typeof rawTime?.seconds === 'number') {
    date = new Date(rawTime.seconds * 1000);
  } else {
    date = new Date(rawTime);
  }
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const getCategoryColor = (jobType: string, status: string) => {
  const lowerJob = (jobType || '').toLowerCase();
  if (lowerJob.includes('rups')) {
    return { bg: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500', badge: '🟣' };
  }
  if (lowerJob.includes('pendirian') || lowerJob.includes('pt')) {
    return { bg: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', badge: '🔵' };
  }
  if (lowerJob.includes('perjanjian') || lowerJob.includes('cv')) {
    return { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', badge: '🟢' };
  }
  if (status?.toLowerCase().includes('kendala') || status?.toLowerCase().includes('revisi')) {
    return { bg: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', badge: '🟡' };
  }
  return { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', badge: '🔵' };
};

const getActivityIcon = (type: ProjectActivityType) => {
  switch (type) {
    case 'comment':
      return { Icon: MessageSquare, bg: 'bg-blue-50 text-blue-600 border-blue-100' };
    case 'task_created':
      return { Icon: CheckSquare, bg: 'bg-purple-50 text-purple-600 border-purple-100' };
    case 'task_completed':
      return { Icon: CheckCircle, bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    case 'issue':
      return { Icon: AlertTriangle, bg: 'bg-amber-50 text-amber-600 border-amber-100' };
    case 'file_added':
      return { Icon: Paperclip, bg: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
    case 'status_changed':
    case 'system':
      return { Icon: RefreshCw, bg: 'bg-slate-100 text-slate-600 border-slate-200' };
    default:
      return { Icon: MessageSquare, bg: 'bg-blue-50 text-blue-600 border-blue-100' };
  }
};

export const ProjectTimelineCard: React.FC<ProjectTimelineCardProps> = ({
  project,
  currentUser,
  onNavigateToDetail,
  defaultExpanded = false,
  staffList: propStaffList
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<{ uid: string; name: string }[]>(propStaffList || []);
  const [mentionedUsers, setMentionedUsers] = useState<{ uid: string; name: string }[]>([]);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<'smileys' | 'reactions' | 'favorites'>('smileys');
  const [activeReactionPickerCommentId, setActiveReactionPickerCommentId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propStaffList) {
      setStaffList(propStaffList);
    }
  }, [propStaffList]);

  // Fetch staff list from user_profiles for mention autocomplete ONLY if expanded and not supplied via props
  useEffect(() => {
    if (propStaffList || !isExpanded) return;
    const unsub = ProjectService.listenToUserProfiles((profiles) => {
      setStaffList(profiles);
    });
    return () => unsub();
  }, [propStaffList, isExpanded]);

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

  // Subscribe to real-time comments & activities when expanded
  useEffect(() => {
    if (!isExpanded || !project.projectId) return;

    setIsLoadingThread(true);
    const unsubscribe = ProjectService.subscribeProjectActivitiesAndComments(
      project.projectId,
      (fetchedActivities) => {
        setActivities(fetchedActivities);
        setIsLoadingThread(false);
      },
      (error) => {
        console.error('Error fetching activities thread:', error);
        setIsLoadingThread(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isExpanded, project.projectId]);

  const category = getCategoryColor(project.jobType || project.projectType || '', project.status);
  const projectTitle = project.title || project.clientSnapshot?.companyName || 'Proyek Tanpa Judul';
  const jobStep = `${(project.projectType || project.jobType || 'Akta').toUpperCase().replace('_', ' ')} • ${(project.currentStep || project.status || 'Dalam Proses').toUpperCase()}`;

  const assignedStaff = staffList?.find(
    s => s.uid === project.assignedTo || s.uid === project.assignedToUid || s.name === project.assignedTo
  );
  const staffName = assignedStaff ? assignedStaff.name : (project.assignedTo && project.assignedTo !== 'Unassigned' ? project.assignedTo : '');

  const clientId = project.clientId || project.clientSnapshot?.id;
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

    // Ambil PIC dari data master klien jika belum ada di data proyek
    if (clientId && (!initialName || !initialPhone || !project.picTitle)) {
      CompanyService.getCompanyProfile(clientId).then(profile => {
        if (!isMounted || !profile) return;
        const cTitle = profile.picTitle || (profile.picName?.startsWith('Ibu ') ? 'Ibu' : 'Bapak');
        const cPic = profile.picName || (profile as any).pic || '';
        const cPhone = profile.picPhone || profile.phoneNumber || (profile as any).phone || (profile as any).telepon || '';
        if (cTitle && !project.picTitle) setPicTitleState(cTitle);
        if (cPic && !initialName) setPicNameState(cPic);
        if (cPhone && !initialPhone) setPicPhoneState(cPhone);
      }).catch(err => console.warn('[ProjectTimelineCard] Gagal mengambil profil klien untuk PIC:', err));
    }

    return () => { isMounted = false; };
  }, [project.projectId, project.clientId, project.clientSnapshot, project.picTitle, project.picName, project.picPhone, project.metadata, clientId]);

  const formattedPicName = (() => {
    if (!picNameState) return '';
    const clean = picNameState.trim();
    if (clean.startsWith('Bapak ') || clean.startsWith('Ibu ')) return clean;
    const title = picTitleState || 'Bapak';
    return `${title} ${clean}`;
  })();

  const displayPicName = formattedPicName || staffName;

  // Pure PIC name for button label (e.g., "Priscillia", "Sari Wahyuni", "Andi Setiawan", "Rina Oktaviani")
  const buttonPicName = (() => {
    const raw = picNameState?.trim() || project.clientPic?.trim() || staffName?.trim() || 'PIC';
    const clean = raw.replace(/^(Bapak|Ibu)\s+/i, '').trim();
    return clean || raw;
  })();

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
  const defaultWaMessage = `Halo ${displayPicName ? displayPicName : 'Bapak/Ibu'}, kami dari Kantor Notaris & PPAT terkait proyek *${projectTitle}*.`;
  const directWaUrl = cleanPhone && cleanPhone.length >= 7 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultWaMessage)}` 
    : '#';

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cleanPhone && cleanPhone.length >= 7) {
      // Direct navigation to wa.me is performed natively by <a>
      return;
    }

    e.preventDefault();
    const inputNumber = window.prompt(`Masukkan nomor WhatsApp PIC (${displayPicName || 'Klien'}):`, '08');
    if (inputNumber && inputNumber.replace(/\D/g, '').length >= 7) {
      const cleanInput = getCleanWaNumber(inputNumber);
      setPicPhoneState(inputNumber);
      ProjectService.updateProjectPic(project.projectId, {
        picPhone: inputNumber
      }).catch(err => console.warn('Gagal simpan picPhone di timeline card:', err));
      if (clientId) {
        CompanyService.updateCompany(clientId, {
          picPhone: inputNumber,
          phoneNumber: inputNumber
        }).catch(err => console.warn('Gagal simpan picPhone ke data klien:', err));
      }
      const waUrl = `https://wa.me/${cleanInput}?text=${encodeURIComponent(defaultWaMessage)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Find latest activity preview from project metadata or static fallback
  const lastActivityText = project.lastActivityText || (project.activities && project.activities[0]?.message) || 'Belum ada aktivitas terbaru.';
  const lastActivityUser = (project.activities && project.activities[0]?.userName) || 'Sistem';
  const lastActivityTime = project.lastActivityAt || project.updatedAt || project.createdAt;
  const commentsCount = project.activitiesCount || activities.length || (project.activities?.length || 0);

  const currentUserInitials = currentUser?.name
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'NE';

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

  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim()) return;

    const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Staff Notaris';
    const userId = currentUser?.uid || 'user-1';

    // Extract mentions from mentionedUsers matching the typed text
    const mentions = mentionedUsers
      .filter(u => newComment.includes(`@${u.name}`))
      .map(u => u.uid);

    setIsSubmitting(true);
    try {
      await ProjectService.addProjectTimelineComment(project.projectId, {
        userId,
        userName,
        content: newComment.trim(),
        mentions
      });

      setNewComment('');
      setMentionedUsers([]);
      setIsEmojiPickerOpen(false);

      // Auto scroll to latest comment
      setTimeout(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Gagal mengirim komentar:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentUserId = currentUser?.uid || 'user-1';

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    try {
      await ProjectService.toggleCommentReaction(project.projectId, commentId, emoji, currentUserId);
    } catch (err) {
      console.error('Gagal mengubah reaksi:', err);
    } finally {
      setActiveReactionPickerCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Hapus komentar ini?')) return;
    try {
      await ProjectService.deleteProjectComment(project.projectId, commentId);
    } catch (err) {
      console.error('Gagal menghapus komentar:', err);
    }
  };

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
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-xs mx-0.5">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="glass-card glass-card-hover rounded-2xl overflow-hidden">
      {/* CARD HEADER (CLICKABLE TO EXPAND) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer hover:bg-slate-50/70 transition-colors select-none group"
      >
        {/* MOBILE VIEW (STACKED) */}
        <div className="p-4 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-base shrink-0 leading-none">{category.badge}</span>
              <h3 className="text-sm font-extrabold text-slate-900 truncate tracking-tight font-heading">
                {projectTitle}
              </h3>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
              aria-label={isExpanded ? "Tutup Thread" : "Buka Thread"}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* JOB TYPE & WORKFLOW STAGE */}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
              {jobStep}
            </span>
            {displayPicName && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                <User size={10} className="text-emerald-600" />
                <span className="truncate max-w-[120px]">PIC: {displayPicName}</span>
              </span>
            )}
          </div>

          {/* LATEST ACTIVITY PREVIEW (COLLAPSED VIEW) */}
          {!isExpanded && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-200/60">
                {lastActivityUser.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 truncate">{lastActivityUser}</span>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0">{formatRelativeTime(lastActivityTime)}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                  {renderContentWithMentions(lastActivityText)}
                </p>
              </div>
            </div>
          )}

          {/* FOOTER COUNTER & DETAIL LINK */}
          <div className="mt-3 flex items-center justify-between pt-2 text-xs font-medium text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs shrink-0">
              <MessageSquare size={14} className="shrink-0" />
              <span>{commentsCount} komentar</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={directWaUrl}
                target={cleanPhone && cleanPhone.length >= 7 ? "_blank" : undefined}
                rel={cleanPhone && cleanPhone.length >= 7 ? "noopener noreferrer" : undefined}
                onClick={handleOpenWhatsApp}
                className="w-[110px] sm:w-[120px] h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer no-underline shrink-0 shadow-2xs"
                title={cleanPhone ? `WhatsApp direct wa.me: ${displayPicName || buttonPicName} (${picPhoneState})` : `Hubungi ${buttonPicName} via WhatsApp`}
              >
                <WhatsAppIcon className="w-3 h-3 fill-current shrink-0" />
                <span className="truncate flex-1 min-w-0 text-left leading-none">{buttonPicName}</span>
              </a>

              {onNavigateToDetail && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToDetail(project.projectId);
                  }}
                  className="w-[62px] h-7 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200/60 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shrink-0"
                >
                  <span>Detail</span>
                  <ArrowRight size={12} className="shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* DESKTOP VIEW (HORIZONTAL TIMELINE CARD) */}
        <div className="hidden md:flex items-center justify-between gap-4 p-4 lg:px-5 lg:py-3.5 min-h-[100px] max-h-[130px]">
          {/* Kolom 1: Status & Title & Stage */}
          <div className="w-[30%] lg:w-[32%] min-w-[240px] pr-4 border-r border-slate-100 flex flex-col gap-1.5 justify-center">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ${
                project.status?.toLowerCase().includes('kendala') || project.status?.toLowerCase().includes('revisi')
                  ? 'bg-rose-500'
                  : project.status?.toLowerCase().includes('selesai')
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              }`} />
              <h3 className="text-sm font-extrabold text-slate-900 truncate tracking-tight font-heading group-hover:text-blue-600 transition-colors" title={projectTitle}>
                {projectTitle}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 pl-5 flex-wrap">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase bg-slate-100 px-2.5 py-0.5 rounded-md truncate max-w-full">
                {project.projectType || project.jobType ? `${(project.projectType || project.jobType).toUpperCase()} • ${jobStep}` : jobStep}
              </span>
              {displayPicName && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-700 font-semibold bg-emerald-50/80 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                  <User size={10} className="text-emerald-600" />
                  <span className="truncate max-w-[130px]">PIC: {displayPicName}</span>
                </span>
              )}
            </div>
          </div>

          {/* Kolom 2: Latest comment / activity preview */}
          <div className="flex-1 px-3 lg:px-5 flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 border border-blue-200/60 shadow-2xs">
              {lastActivityUser.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 truncate">{lastActivityUser}</span>
                <span className="text-[10px] font-medium text-slate-400 shrink-0">{formatRelativeTime(lastActivityTime)}</span>
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5">
                {renderContentWithMentions(lastActivityText)}
              </p>
            </div>
          </div>

          {/* Kolom 3: Action Area (Komentar → WhatsApp → Detail → Dropdown) */}
          <div className="w-[356px] lg:w-[385px] shrink-0 pl-3 lg:pl-4 border-l border-slate-100 flex items-center justify-end gap-2.5 lg:gap-3">
            {/* 1. Kolom Komentar (Fixed Width) */}
            <div className="w-[88px] lg:w-[94px] shrink-0 flex items-center gap-1.5 text-blue-600 font-bold text-xs whitespace-nowrap">
              <MessageSquare size={14} className="shrink-0" />
              <span className="truncate">{commentsCount} komentar</span>
            </div>

            {/* 2. Tombol WhatsApp (Fixed Width & Identical Across Cards) */}
            <a
              href={directWaUrl}
              target={cleanPhone && cleanPhone.length >= 7 ? "_blank" : undefined}
              rel={cleanPhone && cleanPhone.length >= 7 ? "noopener noreferrer" : undefined}
              onClick={handleOpenWhatsApp}
              className="w-[124px] lg:w-[132px] h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center gap-1.5 shrink-0 shadow-2xs no-underline transition-all cursor-pointer"
              title={cleanPhone ? `WhatsApp: ${displayPicName || buttonPicName} (${picPhoneState})` : `Hubungi ${buttonPicName} via WhatsApp`}
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-current shrink-0" />
              <span className="truncate flex-1 min-w-0 text-xs font-bold text-left leading-none">
                {buttonPicName}
              </span>
            </a>

            {/* 3. Tombol Detail (Fixed Width) */}
            {onNavigateToDetail ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToDetail(project.projectId);
                }}
                className="w-[68px] lg:w-[72px] h-8 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200/60 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs"
              >
                <span>Detail</span>
                <ArrowRight size={13} className="shrink-0" />
              </button>
            ) : (
              <div className="w-[68px] lg:w-[72px] shrink-0" />
            )}

            {/* 4. Tombol Dropdown / Expand (Fixed Width) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 cursor-pointer shadow-2xs"
              aria-label={isExpanded ? "Tutup Thread" : "Buka Thread"}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* EXPANDED ACTIVITY THREAD SECTION */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Thread Aktivitas Proyek</span>
            {isLoadingThread && (
              <span className="text-[10px] text-blue-600 animate-pulse">Memuat...</span>
            )}
          </div>

          {/* TIMELINE ACTIVITY LIST */}
          <div className="relative pl-3 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activities.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                Belum ada aktivitas atau komentar. Tulis komentar pertama di bawah ini!
              </div>
            ) : (
              activities.map((act, index) => {
                const { Icon, bg } = getActivityIcon(act.type);
                const isSystem = act.type === 'system' || act.type === 'status_changed';
                const initials = act.userInitials || (act.userName ? act.userName.substring(0, 2).toUpperCase() : 'US');

                return (
                  <div key={act.id || index} className="relative flex items-start gap-3 group">
                    {/* TIMELINE DOT / ICON */}
                    <div className={`w-6 h-6 rounded-full ${bg} border flex items-center justify-center shrink-0 z-10 -ml-3.5 shadow-2xs`}>
                      <Icon size={12} />
                    </div>

                    {/* ACTIVITY CONTENT BUBBLE */}
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {!isSystem && (
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0 border border-slate-200">
                              {initials}
                            </span>
                          )}
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {act.userName || 'Sistem'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-medium text-slate-400 font-mono">
                            {formatThreadTime(act.createdAt)}
                          </span>
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

                      {/* TEXT CONTENT */}
                      <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
                        {renderContentWithMentions(act.message || act.content || '')}
                      </p>

                      {/* ATTACHMENT DISPLAY */}
                      {act.attachmentName && (
                        <div className="mt-2 flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 max-w-fit">
                          <Paperclip size={14} className="text-blue-600 shrink-0" />
                          <span className="truncate max-w-[200px]">{act.attachmentName}</span>
                        </div>
                      )}

                      {/* EMOJI REACTION BAR */}
                      <div className="pt-2 flex items-center gap-1.5 flex-wrap relative">
                        {Object.entries(act.reactions || {}).map(([emoji, uids]) => {
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
                  </div>
                );
              })
            )}
            <div ref={threadEndRef} />
          </div>

          {/* INPUT FORM DIRECTLY INSIDE CARD */}
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

            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              {/* USER AVATAR */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e61c3] to-[#174fa3] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                {currentUserInitials}
              </div>

              {/* INPUT TEXTAREA */}
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
                placeholder="Tulis komentar... (gunakan @nama atau 😊)"
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
                  <Smile size={17} />
                </button>

                {/* NON-BLOCKING EMOJI PICKER POPOVER */}
                {isEmojiPickerOpen && (
                  <div className="absolute right-0 bottom-10 z-50 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-[10px] font-bold text-slate-600">
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('smileys')}
                        className={`px-1.5 py-0.5 rounded-lg ${activeEmojiCategory === 'smileys' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        😊 Smileys
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('reactions')}
                        className={`px-1.5 py-0.5 rounded-lg ${activeEmojiCategory === 'reactions' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        👍 Reactions
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEmojiCategory('favorites')}
                        className={`px-1.5 py-0.5 rounded-lg ${activeEmojiCategory === 'favorites' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        ❤️ Favorites
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-1 pt-1 max-h-32 overflow-y-auto">
                      {EMOJI_CATEGORIES[activeEmojiCategory].map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleInsertEmoji(emoji)}
                          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-base flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
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
                <AtSign size={16} />
              </button>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="w-8 h-8 rounded-xl bg-[#1e61c3] hover:bg-[#174fa3] active:scale-95 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-2xs cursor-pointer"
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectTimelineCard;
