import React from 'react';
import { SidebarTabId } from '../../types';

export interface Menu3DIconProps {
  tabId?: SidebarTabId | string;
  size?: number | string;
  className?: string;
  active?: boolean;
}

/**
 * Modern 3D Colorful Squircle Icon System for Mobile / PWA & Desktop Menu
 * Soft 3D, rounded, semi-flat with depth and soft shadows (Kledo-style visual language)
 */
export const Menu3DIcon: React.FC<Menu3DIconProps> = ({
  tabId,
  size = 36,
  className = '',
  active = false
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  const uid = React.useId().replace(/:/g, '_');

  const normalizedId = (tabId || '').toLowerCase();

  // Color & Vector Mapping
  const renderIcon = () => {
    switch (normalizedId) {
      // --- 5 CATEGORY / SECTION HEADERS ---
      case 'menu_utama':
      case 'cat_menu_utama':
      case 'sec_menu_utama':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#1e3a8a" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* 4 Dashboard Tiles */}
              <rect x="12" y="12" width="10" height="10" rx="3" fill="#ffffff" />
              <rect x="26" y="12" width="10" height="10" rx="3" fill="#93c5fd" />
              <rect x="12" y="26" width="10" height="10" rx="3" fill="#93c5fd" />
              <rect x="26" y="26" width="10" height="10" rx="3" fill="#ffffff" />
            </g>
          </svg>
        );

      case 'notaris_dan_akta':
      case 'cat_notaris_dan_akta':
      case 'sec_notaris_dan_akta':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#6b21a8" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#581c87" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Gavel & Pedestal */}
              <rect x="12" y="32" width="24" height="4" rx="1.5" fill="#f3e8ff" />
              <path d="M18 20L28 10L32 14L22 24L18 20Z" fill="#ffffff" />
              <path d="M14 24L20 18L24 22L18 28L14 24Z" fill="#e9d5ff" />
              <rect x="23" y="21" width="13" height="4" rx="1" transform="rotate(45 23 21)" fill="#d8b4fe" />
            </g>
          </svg>
        );

      case 'keuangan':
      case 'cat_keuangan':
      case 'sec_keuangan':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#064e3b" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Wallet & Card */}
              <rect x="11" y="15" width="26" height="19" rx="4" fill="#ecfdf5" />
              <path d="M11 21H37V30C37 32.2 35.2 34 33 34H15C12.8 34 11 32.2 11 30V21Z" fill="#a7f3d0" />
              <rect x="26" y="20" width="11" height="8" rx="2" fill="#047857" />
              <circle cx="31.5" cy="24" r="1.5" fill="#fef08a" />
            </g>
          </svg>
        );

      case 'referensi_dan_alat':
      case 'dokumen_dan_surat':
      case 'cat_dokumen_dan_surat':
      case 'sec_dokumen_dan_surat':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#78350f" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Book Stack */}
              <rect x="12" y="13" width="24" height="23" rx="3" fill="#fffbeb" />
              <rect x="12" y="13" width="5" height="23" rx="1" fill="#b45309" />
              <line x1="20" y1="18" x2="31" y2="18" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="23" x2="31" y2="23" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="20" y1="28" x2="27" y2="28" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </svg>
        );

      case 'sistem':
      case 'sistem_pengaturan':
      case 'cat_sistem':
      case 'sec_sistem':
      case 'sec_pengaturan':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Settings Gear */}
              <circle cx="24" cy="24" r="9" fill="#f8fafc" />
              <circle cx="24" cy="24" r="4.5" fill="#1e293b" />
              <path d="M24 11V14M24 34V37M11 24H14M34 24H37M14.8 14.8L16.9 16.9M31.1 31.1L33.2 33.2M14.8 33.2L16.9 31.1M31.1 16.9L33.2 14.8" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
            </g>
          </svg>
        );

      case 'beranda':
      case 'home':
      case 'dashboard':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id={`${uid}_roof`} x1="12" y1="12" x2="36" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#dbeafe" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#1e3a8a" floodOpacity="0.3" />
              </filter>
            </defs>
            {/* Squircle Background */}
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            {/* 3D House Element */}
            <g filter={`url(#${uid}_shadow)`}>
              {/* Main Body */}
              <path d="M15 22V34C15 35.1 15.9 36 17 36H31C32.1 36 33 35.1 33 34V22L24 14L15 22Z" fill="#eff6ff" />
              {/* Roof */}
              <path d="M11.5 22.5L24 11.5L36.5 22.5C37.1 23 37.2 23.9 36.7 24.5C36.2 25.1 35.3 25.2 34.7 24.7L24 15.3L13.3 24.7C12.7 25.2 11.8 25.1 11.3 24.5C10.8 23.9 10.9 23 11.5 22.5Z" fill={`url(#${uid}_roof)`} />
              {/* Glowing Door / Window */}
              <rect x="20" y="26" width="8" height="10" rx="2" fill="#2563eb" />
              <rect x="22" y="28" width="4" height="8" rx="1" fill="#60a5fa" />
            </g>
          </svg>
        );

      case 'company_profile':
      case 'klien':
      case 'client':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#312e81" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Company Building */}
              <path d="M12 36V16C12 14.9 12.9 14 14 14H26C27.1 14 28 14.9 28 16V36H12Z" fill="#e0e7ff" />
              <path d="M28 36V22C28 20.9 28.9 20 30 20H34C35.1 20 36 20.9 36 22V36H28Z" fill="#c7d2fe" />
              {/* Windows */}
              <rect x="16" y="18" width="3" height="3" rx="0.5" fill="#4f46e5" />
              <rect x="21" y="18" width="3" height="3" rx="0.5" fill="#4f46e5" />
              <rect x="16" y="24" width="3" height="3" rx="0.5" fill="#4f46e5" />
              <rect x="21" y="24" width="3" height="3" rx="0.5" fill="#4f46e5" />
              <rect x="31" y="24" width="2" height="2.5" rx="0.5" fill="#4f46e5" />
              <rect x="31" y="29" width="2" height="2.5" rx="0.5" fill="#4f46e5" />
              {/* User Avatar Badge */}
              <circle cx="20" cy="31" r="5" fill="#818cf8" stroke="#ffffff" strokeWidth="1.5" />
              <path d="M17 31C17 29.3 18.3 28 20 28C21.7 28 23 29.3 23 31" fill="#312e81" />
            </g>
          </svg>
        );

      case 'projects':
      case 'project_detail':
      case 'proyek':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#7e22ce" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#581c87" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Briefcase */}
              <rect x="11" y="18" width="26" height="17" rx="3" fill="#f3e8ff" />
              <path d="M11 23H37V32C37 33.7 35.7 35 34 35H14C12.3 35 11 33.7 11 32V23Z" fill="#e9d5ff" />
              {/* Handle */}
              <path d="M19 18V15C19 13.9 19.9 13 21 13H27C28.1 13 29 13.9 29 15V18" stroke="#f3e8ff" strokeWidth="2.5" strokeLinecap="round" />
              {/* Latch */}
              <rect x="21.5" y="21" width="5" height="5" rx="1" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
            </g>
          </svg>
        );

      case 'laporan':
      case 'report':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0f766e" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#134e4a" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Base Chart Container */}
              <rect x="11" y="13" width="26" height="22" rx="3" fill="#ecfeff" />
              {/* Bars */}
              <rect x="15" y="25" width="4" height="7" rx="1" fill="#22d3ee" />
              <rect x="22" y="20" width="4" height="12" rx="1" fill="#06b6d4" />
              <rect x="29" y="16" width="4" height="16" rx="1" fill="#0891b2" />
              {/* Trend line */}
              <path d="M14 23L21 18L27 21L34 14" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="34" cy="14" r="2" fill="#f43f5e" />
            </g>
          </svg>
        );

      case 'deeds':
      case 'buku_akta':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#064e3b" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Open Book */}
              <path d="M12 16C12 14.3 13.3 13 15 13H23V34H15C13.3 34 12 32.7 12 31V16Z" fill="#ecfdf5" />
              <path d="M36 16C36 14.3 34.7 13 33 13H25V34H33C34.7 34 36 32.7 36 31V16Z" fill="#d1fae5" />
              <rect x="23" y="13" width="2" height="21" fill="#10b981" />
              {/* Text Lines */}
              <line x1="15" y1="18" x2="20" y2="18" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="15" y1="22" x2="20" y2="22" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="15" y1="26" x2="19" y2="26" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="28" y1="18" x2="33" y2="18" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="28" y1="22" x2="33" y2="22" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
              {/* Bookmark Ribbon */}
              <path d="M31 12V21L28.5 19L26 21V12H31Z" fill="#ef4444" />
            </g>
          </svg>
        );

      case 'private_deeds':
      case 'legalisasi':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0c4a6e" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Document */}
              <rect x="12" y="12" width="24" height="24" rx="3" fill="#f0f9ff" />
              <line x1="16" y1="17" x2="24" y2="17" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="16" y1="21" x2="28" y2="21" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="16" y1="25" x2="22" y2="25" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
              {/* Verified Shield Badge */}
              <path d="M28 24C28 24 32 25 32 28C32 32.5 28 35 28 35C28 35 24 32.5 24 28C24 25 28 24 28 24Z" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
              <path d="M26 28.5L27.5 30L30 27" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        );

      case 'notary_reports':
      case 'laporan_notaris':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#78350f" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Clipboard Base */}
              <rect x="13" y="14" width="22" height="23" rx="3" fill="#fffbeb" />
              <rect x="19" y="12" width="10" height="4" rx="1.5" fill="#d97706" stroke="#ffffff" strokeWidth="1" />
              {/* Lines */}
              <line x1="17" y1="20" x2="27" y2="20" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="24" x2="31" y2="24" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="28" x2="25" y2="28" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
              {/* Stamp Badge */}
              <circle cx="28" cy="30" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            </g>
          </svg>
        );

      case 'incoming_mail':
      case 'surat_masuk':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0c4a6e" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Tray */}
              <path d="M11 26L14 34H34L37 26V33C37 34.7 35.7 36 34 36H14C12.3 36 11 34.7 11 33V26Z" fill="#e0f2fe" />
              {/* Envelope entering */}
              <rect x="15" y="13" width="18" height="13" rx="2" fill="#ffffff" />
              <path d="M15 14L24 21L33 14" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" />
              {/* Down Arrow */}
              <path d="M24 10V18M24 18L21 15M24 18L27 15" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        );

      case 'outgoing_mail':
      case 'surat_keluar':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#be123c" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#881337" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Envelope */}
              <rect x="11" y="20" width="22" height="14" rx="2" fill="#ffe4e6" />
              <path d="M11 21L22 28L33 21" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
              {/* Paper Plane Flying */}
              <path d="M22 20L36 12L29 26L25 21L22 20Z" fill="#ffffff" stroke="#f43f5e" strokeWidth="1" />
            </g>
          </svg>
        );

      case 'invoice':
      case 'tagihan':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#064e3b" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Invoice Card Sheet */}
              <rect x="13" y="11" width="22" height="26" rx="3" fill="#ecfdf5" />
              <line x1="17" y1="16" x2="25" y2="16" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
              <line x1="17" y1="21" x2="31" y2="21" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="25" x2="29" y2="25" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="29" x2="24" y2="29" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
              {/* Rp / Green Badge */}
              <circle cx="28" cy="31" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              <path d="M26 31L27.5 32.5L30 29.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        );

      case 'products':
      case 'produk':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#7c2d12" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* 3D Box Cube */}
              <path d="M24 12L36 18V30L24 36L12 30V18L24 12Z" fill="#ffedd5" />
              <path d="M24 12L36 18L24 24L12 18L24 12Z" fill="#fed7aa" />
              <path d="M24 24V36L12 30V18L24 24Z" fill="#fdba74" />
              {/* Box Tape */}
              <path d="M20 14L32 20L28 22L16 16L20 14Z" fill="#f97316" opacity="0.6" />
            </g>
          </svg>
        );

      case 'quotation':
      case 'penawaran':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#4c1d95" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Offer Paper */}
              <rect x="13" y="11" width="22" height="26" rx="3" fill="#f5f3ff" />
              <line x1="17" y1="16" x2="26" y2="16" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
              <line x1="17" y1="21" x2="31" y2="21" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="25" x2="27" y2="25" stroke="#ddd6fe" strokeWidth="1.5" strokeLinecap="round" />
              {/* Star Offer Tag */}
              <circle cx="29" cy="30" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              <path d="M29 27.5L29.8 29.2L31.6 29.4L30.3 30.7L30.6 32.5L29 31.6L27.4 32.5L27.7 30.7L26.4 29.4L28.2 29.2L29 27.5Z" fill="#ffffff" />
            </g>
          </svg>
        );

      case 'delivery':
      case 'surat_jalan':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#1e3a8a" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Delivery Truck Body */}
              <rect x="11" y="20" width="18" height="12" rx="2" fill="#eff6ff" />
              <path d="M29 24H35L38 28V32H29V24Z" fill="#dbeafe" />
              {/* Wheels */}
              <circle cx="16" cy="33" r="3" fill="#1e293b" stroke="#ffffff" strokeWidth="1" />
              <circle cx="33" cy="33" r="3" fill="#1e293b" stroke="#ffffff" strokeWidth="1" />
              {/* Speed Lines */}
              <line x1="8" y1="23" x2="10" y2="23" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="6" y1="27" x2="9" y2="27" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          </svg>
        );

      case 'receipt':
      case 'tanda_terima':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#14532d" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Handover Paper */}
              <rect x="13" y="11" width="22" height="26" rx="3" fill="#f0fdf4" />
              <line x1="17" y1="16" x2="27" y2="16" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
              <line x1="17" y1="21" x2="31" y2="21" stroke="#bbf7d0" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="25" x2="26" y2="25" stroke="#bbf7d0" strokeWidth="1.5" strokeLinecap="round" />
              {/* Handover Verified Stamp */}
              <circle cx="28" cy="30" r="5" fill="#22c55e" stroke="#ffffff" strokeWidth="1.5" />
              <path d="M26 30L27.5 31.5L30 28.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        );

      case 'deposit_note':
      case 'penitipan_uang':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#0f766e" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#134e4a" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Wallet Base */}
              <rect x="11" y="16" width="26" height="18" rx="4" fill="#ccfbf1" />
              <path d="M11 22H37V30C37 32.2 35.2 34 33 34H15C12.8 34 11 32.2 11 30V22Z" fill="#99f6e4" />
              {/* Money Flap */}
              <path d="M27 21H37V29H27C24.8 29 23 27.2 23 25C23 22.8 24.8 21 27 21Z" fill="#0d9488" stroke="#ffffff" strokeWidth="1" />
              <circle cx="28" cy="25" r="1.5" fill="#fef08a" />
              {/* Gold Coin */}
              <circle cx="20" cy="15" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
              <text x="20" y="16.5" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#ffffff">Rp</text>
            </g>
          </svg>
        );

      case 'kbli_mapping':
      case 'mapping_kbli':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#1e1b4b" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* 2020 Card */}
              <rect x="10" y="13" width="13" height="22" rx="2.5" fill="#dbeafe" />
              <text x="16.5" y="23" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#1d4ed8">2020</text>
              {/* 2025 Card */}
              <rect x="25" y="13" width="13" height="22" rx="2.5" fill="#e0e7ff" />
              <text x="31.5" y="23" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#4338ca">2025</text>
              {/* Exchange Swap Arrows */}
              <path d="M18 28H30M30 28L27 25M30 28L27 31" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        );

      case 'saran_kbli':
      case 'kbli_suggestion':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#78350f" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Lightbulb 3D */}
              <path d="M24 12C19.6 12 16 15.6 16 20C16 23.2 17.9 25.9 20.6 27.2V31C20.6 31.6 21.1 32 21.7 32H26.3C26.9 32 27.4 31.6 27.4 31V27.2C30.1 25.9 32 23.2 32 20C32 15.6 28.4 12 24 12Z" fill="#fef9c3" />
              <path d="M21 33H27V34C27 34.6 26.6 35 26 35H22C21.4 35 21 34.6 21 34V33Z" fill="#eab308" />
              {/* Rays */}
              <circle cx="24" cy="20" r="3" fill="#eab308" />
            </g>
          </svg>
        );

      case 'perbaikan':
      case 'surat_perbaikan':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#881337" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Paper */}
              <rect x="13" y="12" width="22" height="24" rx="3" fill="#fff1f2" />
              <line x1="17" y1="17" x2="27" y2="17" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="21" x2="29" y2="21" stroke="#fecdd3" strokeWidth="1.5" strokeLinecap="round" />
              {/* Pencil Editing */}
              <path d="M23 29L33 19L36 22L26 32L21 33L23 29Z" fill="#f97316" stroke="#ffffff" strokeWidth="1" />
            </g>
          </svg>
        );

      case 'panduan':
      case 'guide':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Guide Book */}
              <rect x="13" y="11" width="22" height="26" rx="3" fill="#e0f2fe" />
              <rect x="13" y="11" width="4" height="26" rx="1" fill="#0284c7" />
              {/* Info 'i' */}
              <circle cx="26" cy="20" r="2" fill="#0284c7" />
              <rect x="24.5" y="24" width="3" height="8" rx="1" fill="#0284c7" />
            </g>
          </svg>
        );

      case 'settings':
      case 'pengaturan':
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <filter id={`${uid}_shadow`} x1="0" y1="2" width="48" height="48" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.3" />
              </filter>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <g filter={`url(#${uid}_shadow)`}>
              {/* Gear */}
              <circle cx="24" cy="24" r="8" fill="#f8fafc" />
              <circle cx="24" cy="24" r="4" fill="#334155" />
              <path d="M24 12V15M24 33V36M12 24H15M33 24H36M15.5 15.5L17.6 17.6M30.4 30.4L32.5 32.5M15.5 32.5L17.6 30.4M30.4 17.6L32.5 15.5" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
            </g>
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${uid}_bg)`} />
            <rect x="2.5" y="2.5" width="43" height="43" rx="13.5" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1" />
            <circle cx="24" cy="24" r="8" fill="#ffffff" />
          </svg>
        );
    }
  };

  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 transition-transform duration-200 ${
        active ? 'scale-105 filter drop-shadow-md' : 'hover:scale-105'
      } ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {renderIcon()}
    </div>
  );
};
