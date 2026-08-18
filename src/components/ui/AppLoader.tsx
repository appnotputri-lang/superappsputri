import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type AppLoaderVariant = 'fullscreen' | 'page' | 'content';

export interface AppLoaderProps {
  isLoading?: boolean;
  message?: string;
  messages?: string[];
  delayMs?: number; // Delay before showing (anti-flicker, default 350ms)
  className?: string;
  variant?: AppLoaderVariant;
  fullScreen?: boolean; // legacy alias for variant="fullscreen"
}

const DEFAULT_MESSAGES = [
  'Menyiapkan workspace...',
  'Memuat data kantor...',
  'Menyiapkan dokumen & akta...',
  'Menyinkronkan pekerjaan...',
  'Hampir selesai...'
];

export const AppLoader: React.FC<AppLoaderProps> = ({
  isLoading = true,
  message,
  messages = DEFAULT_MESSAGES,
  delayMs = 350,
  className = '',
  variant = 'fullscreen',
  fullScreen,
}) => {
  const [visible, setVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const msgTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resolve active variant considering legacy fullScreen prop
  const activeVariant: AppLoaderVariant = fullScreen === false ? 'content' : variant;

  // Anti-flicker delay handling
  useEffect(() => {
    if (isLoading) {
      setIsExiting(false);
      // Wait delayMs before showing
      timerRef.current = setTimeout(() => {
        setVisible(true);
      }, delayMs);
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (visible) {
        setIsExiting(true);
        exitTimerRef.current = setTimeout(() => {
          setVisible(false);
          setIsExiting(false);
        }, 250); // duration of exit fade out
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [isLoading, delayMs, visible]);

  // Cycle through text messages smoothly
  useEffect(() => {
    if (!visible) return;

    msgTimerRef.current = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2200);

    return () => {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, [visible, messages.length]);

  if (!visible) return null;

  const currentMessage = message || messages[msgIndex];

  // Compact scaling for content variant vs fullscreen/page
  const isContent = activeVariant === 'content';

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.96 : 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center text-center select-none ${
        isContent ? 'p-6 py-12' : 'p-6'
      } ${isExiting ? 'pointer-events-none' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={currentMessage}
    >
      {/* 1. Monogram Badge "NP" */}
      {!isContent && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-5"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#1e61c3] to-[#0c2444] text-white flex items-center justify-center font-black text-base tracking-tight shadow-md shadow-blue-900/10 border border-blue-400/30">
            NP
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-blue-500/10 -z-10 blur-xs" />
        </motion.div>
      )}

      {/* 2. Document Shelf Loader (SVG & Animated Notary Elements) */}
      <div className={`relative flex items-end justify-center mb-4 ${isContent ? 'w-52 h-18' : 'w-64 h-22'}`}>
        {/* Animated Shelf Items */}
        <motion.div 
          className="absolute bottom-2.5 left-0 right-0 flex items-end justify-center gap-3 px-3 z-10"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Item 1: Folder Berkas (Amber/Gold) */}
          <motion.div
            initial={{ y: -25, opacity: 0, rotate: -6 }}
            animate={{ y: 0, opacity: 1, rotate: -3 }}
            transition={{ duration: 0.4, delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
            className="shrink-0"
            title="Folder Berkas"
          >
            <svg width={isContent ? "22" : "28"} height={isContent ? "30" : "38"} viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="5" width="26" height="32" rx="3" fill="#F59E0B" />
              <path d="M1 5C1 3.34315 2.34315 2 4 2H11L14 5H27C27 5 27 37 27 37H1V5Z" fill="#D97706" />
              <rect x="5" y="10" width="18" height="22" rx="1.5" fill="#FEF3C7" />
              <line x1="8" y1="15" x2="18" y2="15" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="8" y1="19" x2="15" y2="19" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.div>

          {/* Item 2: Buku Akta Notaris (Hardcover Navy) */}
          <motion.div
            initial={{ y: -30, opacity: 0, rotate: 4 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.45, delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
            className="shrink-0"
            title="Buku Akta"
          >
            <svg width={isContent ? "25" : "32"} height={isContent ? "36" : "46"} viewBox="0 0 32 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="1" width="28" height="44" rx="3" fill="#0F172A" />
              <rect x="2" y="1" width="5" height="44" rx="1" fill="#1E3A8A" />
              <line x1="2" y1="8" x2="7" y2="8" stroke="#F59E0B" strokeWidth="1" />
              <line x1="2" y1="38" x2="7" y2="38" stroke="#F59E0B" strokeWidth="1" />
              <circle cx="17" cy="18" r="5" fill="#1E61C3" stroke="#F59E0B" strokeWidth="1" />
              <rect x="10" y="27" width="14" height="1.5" rx="0.75" fill="#F59E0B" />
              <rect x="12" y="31" width="10" height="1" rx="0.5" fill="#94A3B8" />
            </svg>
          </motion.div>

          {/* Item 3: Dokumen & Akta Resmi (White Paper with Wax Stamp) */}
          <motion.div
            initial={{ y: -25, opacity: 0, rotate: -4 }}
            animate={{ y: 0, opacity: 1, rotate: 2 }}
            transition={{ duration: 0.4, delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
            className="shrink-0"
            title="Dokumen Resmi"
          >
            <svg width={isContent ? "24" : "30"} height={isContent ? "33" : "42"} viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="28" height="40" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
              <path d="M21 1L29 9H21V1Z" fill="#E2E8F0" />
              <line x1="5" y1="8" x2="17" y2="8" stroke="#1E61C3" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="5" y1="13" x2="23" y2="13" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
              <line x1="5" y1="17" x2="21" y2="17" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
              <line x1="5" y1="21" x2="23" y2="21" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
              <line x1="5" y1="25" x2="16" y2="25" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
              <circle cx="21" cy="33" r="4.5" fill="#DC2626" />
              <circle cx="21" cy="33" r="3" stroke="#F59E0B" strokeWidth="0.8" />
            </svg>
          </motion.div>

          {/* Item 4: Lembar Legalisasi / Sertifikat (Royal Blue Sheet) */}
          <motion.div
            initial={{ y: -20, opacity: 0, rotate: 5 }}
            animate={{ y: 0, opacity: 1, rotate: -1 }}
            transition={{ duration: 0.4, delay: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
            className="shrink-0"
            title="Sertifikat Legalisasi"
          >
            <svg width={isContent ? "21" : "26"} height={isContent ? "28" : "36"} viewBox="0 0 26 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="24" height="34" rx="2" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1" />
              <line x1="5" y1="7" x2="15" y2="7" stroke="#1E61C3" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="5" y1="12" x2="21" y2="12" stroke="#60A5FA" strokeWidth="1" strokeLinecap="round" />
              <line x1="5" y1="16" x2="19" y2="16" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" />
              <line x1="5" y1="20" x2="18" y2="20" stroke="#93C5FD" strokeWidth="1" strokeLinecap="round" />
              <path d="M18 28L21 34L24 28" fill="#D97706" />
              <circle cx="21" cy="27" r="3" fill="#F59E0B" />
            </svg>
          </motion.div>
        </motion.div>

        {/* The Base Shelf Bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`h-1.5 rounded-full bg-gradient-to-r from-[#1e61c3] via-[#3b82f6] to-[#f59e0b] shadow-xs relative z-20 ${
            isContent ? 'w-44' : 'w-56'
          }`}
        />
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-1 bg-slate-200/80 rounded-full blur-[1px] ${
          isContent ? 'w-36' : 'w-48'
        }`} />
      </div>

      {/* 3. Smooth Rotating Message Text */}
      <div className="h-6 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentMessage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={`font-semibold tracking-wide ${
              isContent ? 'text-xs text-slate-500' : 'text-xs text-slate-600'
            }`}
          >
            {currentMessage}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );

  if (activeVariant === 'content') {
    return (
      <div className={`w-full flex items-center justify-center bg-white/60 rounded-xl ${className}`}>
        {content}
      </div>
    );
  }

  if (activeVariant === 'page') {
    return (
      <div 
        className={`absolute inset-0 z-40 flex items-center justify-center bg-white/95 backdrop-blur-xs pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
          isExiting ? 'pointer-events-none' : ''
        } ${className}`}
      >
        {content}
      </div>
    );
  }

  // default 'fullscreen'
  return (
    <div 
      className={`fixed inset-0 z-[999] flex items-center justify-center bg-white/95 backdrop-blur-xs pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
        isExiting ? 'pointer-events-none' : ''
      } ${className}`}
    >
      {content}
    </div>
  );
};
