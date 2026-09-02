import React from 'react';
import { SidebarTabId } from '../../types';

export interface Menu3DIconProps {
  tabId?: SidebarTabId | string;
  size?: number | string;
  className?: string;
  active?: boolean;
}

/**
  Notaris Putri Icon Design System
  Unified 3D Squircle Icon System for PWA, Mobile, and Desktop Navigation.
  
  Visual Rules:
  - Container: Soft pastel squircle background (`x=2 y=2 w=44 h=44 rx=13`)
  - Foreground: Strong, vibrant filled 3D symbol matching the container's color family
  - Depth: Soft drop shadow filter + white highlight stroke on squircle border
  - Recognition > Decoration: Clean, legible, proportional geometry at all sizes (16px to 42px)
 */
export const Menu3DIcon: React.FC<Menu3DIconProps> = ({
  tabId,
  size = 36,
  className = '',
  active = false
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  const rawUid = React.useId();
  const uid = `ico_${rawUid.replace(/[^a-zA-Z0-9_]/g, '_')}`;

  const normalizedId = (tabId || '').toLowerCase();

  // Unified Base Container Renderer
  const renderBaseIcon = (
    bgStart: string,
    bgEnd: string,
    borderColor: string,
    shadowColor: string,
    children: React.ReactNode
  ) => (
    <svg viewBox="0 0 48 48" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={bgStart} />
          <stop offset="100%" stopColor={bgEnd} />
        </linearGradient>
        <filter id={`${uid}_shadow`} x1="-15%" y1="-15%" width="130%" height="135%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="1.8" floodColor={shadowColor} floodOpacity="0.22" />
        </filter>
      </defs>
      {/* Soft Pastel Squircle Background */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${uid}_bg)`} />
      <rect x="2.5" y="2.5" width="43" height="43" rx="12.5" stroke={borderColor} strokeOpacity="0.85" strokeWidth="1" />
      {/* Foreground 3D Symbol */}
      <g filter={`url(#${uid}_shadow)`}>
        {children}
      </g>
    </svg>
  );

  const renderIcon = () => {
    switch (normalizedId) {
      // ==========================================
      // 1. CATEGORY / SECTION HEADERS (SIDEBAR)
      // ==========================================
      case 'menu_utama':
      case 'cat_menu_utama':
      case 'sec_menu_utama':
        return renderBaseIcon('#eff6ff', '#dbeafe', '#bfdbfe', '#1e3a8a', (
          <>
            {/* 4 Dashboard Tiles */}
            <rect x="13" y="13" width="9" height="9" rx="2.5" fill="#1e61c3" />
            <rect x="26" y="13" width="9" height="9" rx="2.5" fill="#3b82f6" />
            <rect x="13" y="26" width="9" height="9" rx="2.5" fill="#3b82f6" />
            <rect x="26" y="26" width="9" height="9" rx="2.5" fill="#1e61c3" />
            {/* Subtle inner highlights */}
            <circle cx="15.5" cy="15.5" r="1" fill="#ffffff" opacity="0.6" />
            <circle cx="28.5" cy="28.5" r="1" fill="#ffffff" opacity="0.6" />
          </>
        ));

      case 'notaris_dan_akta':
      case 'cat_notaris_dan_akta':
      case 'sec_notaris_dan_akta':
        return renderBaseIcon('#f3e8ff', '#ede9fe', '#ddd6fe', '#581c87', (
          <>
            {/* Gavel & Pedestal */}
            <rect x="12" y="32" width="24" height="4" rx="1.5" fill="#7c3aed" />
            <path d="M18 20L28 10L32 14L22 24L18 20Z" fill="#9333ea" />
            <path d="M14 24L20 18L24 22L18 28L14 24Z" fill="#7c3aed" />
            <rect x="23" y="21" width="13" height="4" rx="1" transform="rotate(45 23 21)" fill="#c084fc" />
            <circle cx="20" cy="15" r="1" fill="#ffffff" opacity="0.8" />
          </>
        ));

      case 'keuangan':
      case 'cat_keuangan':
      case 'sec_keuangan':
        return renderBaseIcon('#ecfdf5', '#d1fae5', '#a7f3d0', '#064e3b', (
          <>
            {/* Wallet & Card */}
            <rect x="11" y="15" width="26" height="19" rx="4" fill="#059669" />
            <path d="M11 21H37V30C37 32.2 35.2 34 33 34H15C12.8 34 11 32.2 11 30V21Z" fill="#10b981" />
            <rect x="26" y="20" width="11" height="8" rx="2" fill="#047857" />
            <circle cx="31.5" cy="24" r="1.5" fill="#f59e0b" />
          </>
        ));

      case 'dokumen_dan_surat':
      case 'referensi_dan_alat':
      case 'cat_dokumen_dan_surat':
      case 'sec_dokumen_dan_surat':
        return renderBaseIcon('#fffbeb', '#fef3c7', '#fde68a', '#78350f', (
          <>
            {/* Book Stack */}
            <rect x="12" y="13" width="24" height="23" rx="3" fill="#d97706" />
            <rect x="12" y="13" width="5" height="23" rx="1" fill="#b45309" />
            <line x1="20" y1="18" x2="31" y2="18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="23" x2="31" y2="23" stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="20" y1="28" x2="27" y2="28" stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" />
          </>
        ));

      case 'sistem':
      case 'sistem_pengaturan':
      case 'cat_sistem':
      case 'sec_sistem':
      case 'sec_pengaturan':
        return renderBaseIcon('#f8fafc', '#f1f5f9', '#cbd5e1', '#0f172a', (
          <>
            {/* Gear */}
            <circle cx="24" cy="24" r="8" fill="#334155" />
            <circle cx="24" cy="24" r="4" fill="#f8fafc" />
            <path d="M24 12V15M24 33V36M12 24H15M33 24H36M15.5 15.5L17.6 17.6M30.4 30.4L32.5 32.5M15.5 32.5L17.6 30.4M30.4 17.6L32.5 15.5" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            <circle cx="24" cy="24" r="2" fill="#4a9fa8" />
          </>
        ));

      // ==========================================
      // 2. MENU UTAMA SUBITEMS
      // ==========================================
      case 'beranda':
      case 'home':
      case 'dashboard':
        return renderBaseIcon('#eff6ff', '#dbeafe', '#bfdbfe', '#1e3a8a', (
          <>
            {/* House Body */}
            <path d="M15 22V34C15 35.1 15.9 36 17 36H31C32.1 36 33 35.1 33 34V22L24 14L15 22Z" fill="#1e61c3" />
            {/* Roof */}
            <path d="M11.5 22.5L24 11.5L36.5 22.5C37.1 23 37.2 23.9 36.7 24.5C36.2 25.1 35.3 25.2 34.7 24.7L24 15.3L13.3 24.7C12.7 25.2 11.8 25.1 11.3 24.5C10.8 23.9 10.9 23 11.5 22.5Z" fill="#2563eb" />
            {/* Glowing Door */}
            <rect x="20" y="26" width="8" height="10" rx="2" fill="#dbeafe" />
            <rect x="22" y="28" width="4" height="8" rx="1" fill="#4a9fa8" />
          </>
        ));

      case 'company_profile':
      case 'klien':
      case 'client':
        return renderBaseIcon('#eff6ff', '#e0e7ff', '#a5b4fc', '#312e81', (
          <>
            {/* Office Building */}
            <path d="M12 36V16C12 14.9 12.9 14 14 14H26C27.1 14 28 14.9 28 16V36H12Z" fill="#1e61c3" />
            <path d="M28 36V22C28 20.9 28.9 20 30 20H34C35.1 20 36 20.9 36 22V36H28Z" fill="#2563eb" />
            {/* Windows */}
            <rect x="16" y="18" width="3" height="3" rx="0.5" fill="#eff6ff" />
            <rect x="21" y="18" width="3" height="3" rx="0.5" fill="#eff6ff" />
            <rect x="16" y="24" width="3" height="3" rx="0.5" fill="#eff6ff" />
            <rect x="21" y="24" width="3" height="3" rx="0.5" fill="#eff6ff" />
            <rect x="31" y="24" width="2" height="2.5" rx="0.5" fill="#eff6ff" />
            <rect x="31" y="29" width="2" height="2.5" rx="0.5" fill="#eff6ff" />
            {/* User Avatar Badge */}
            <circle cx="20" cy="31" r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M17 31C17 29.3 18.3 28 20 28C21.7 28 23 29.3 23 31" fill="#ffffff" />
          </>
        ));

      case 'projects':
      case 'project_detail':
      case 'proyek':
        return renderBaseIcon('#f3e8ff', '#ede9fe', '#ddd6fe', '#581c87', (
          <>
            {/* Briefcase */}
            <rect x="11" y="18" width="26" height="17" rx="3" fill="#7c3aed" />
            <path d="M11 23H37V32C37 33.7 35.7 35 34 35H14C12.3 35 11 33.7 11 32V23Z" fill="#9333ea" />
            {/* Handle */}
            <path d="M19 18V15C19 13.9 19.9 13 21 13H27C28.1 13 29 13.9 29 15V18" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
            {/* Latch */}
            <rect x="21.5" y="21" width="5" height="5" rx="1" fill="#f3e8ff" stroke="#ffffff" strokeWidth="1" />
          </>
        ));

      case 'laporan':
      case 'report':
        return renderBaseIcon('#f0fdfa', '#ccfbf1', '#99f6e4', '#134e4a', (
          <>
            {/* Base Chart Container */}
            <rect x="11" y="13" width="26" height="22" rx="3" fill="#0d9488" />
            {/* Bars */}
            <rect x="15" y="23" width="4" height="9" rx="1" fill="#ccfbf1" />
            <rect x="22" y="18" width="4" height="14" rx="1" fill="#5eead4" />
            <rect x="29" y="15" width="4" height="17" rx="1" fill="#2dd4bf" />
            {/* Trendline */}
            <path d="M14 23L21 17L27 20L34 14" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="34" cy="14" r="2" fill="#f43f5e" />
          </>
        ));

      // ==========================================
      // 3. NOTARIS DAN AKTA SUBITEMS
      // ==========================================
      case 'buat_akta':
        return renderBaseIcon('#ecfdf5', '#d1fae5', '#a7f3d0', '#064e3b', (
          <>
            {/* Deed Document Sheet with Plus */}
            <rect x="13" y="11" width="22" height="26" rx="3" fill="#059669" />
            <line x1="17" y1="16" x2="27" y2="16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="21" x2="29" y2="21" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="25" x2="25" y2="25" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            {/* Plus Badge */}
            <circle cx="28" cy="30" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M28 27.5V32.5M25.5 30H30.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          </>
        ));

      case 'deeds':
      case 'buku_akta':
        return renderBaseIcon('#ecfdf5', '#d1fae5', '#a7f3d0', '#064e3b', (
          <>
            {/* Open Book */}
            <path d="M12 16C12 14.3 13.3 13 15 13H23V34H15C13.3 34 12 32.7 12 31V16Z" fill="#059669" />
            <path d="M36 16C36 14.3 34.7 13 33 13H25V34H33C34.7 34 36 32.7 36 31V16Z" fill="#10b981" />
            <rect x="23" y="13" width="2" height="21" fill="#047857" />
            {/* Text Lines */}
            <line x1="15" y1="18" x2="20" y2="18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="15" y1="22" x2="20" y2="22" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="15" y1="26" x2="19" y2="26" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="28" y1="18" x2="33" y2="18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="28" y1="22" x2="33" y2="22" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            {/* Bookmark Ribbon */}
            <path d="M31 12V21L28.5 19L26 21V12H31Z" fill="#e11d48" />
          </>
        ));

      case 'private_deeds':
      case 'legalisasi':
        return renderBaseIcon('#f0f9ff', '#e0f2fe', '#bae6fd', '#0c4a6e', (
          <>
            {/* Document */}
            <rect x="12" y="12" width="24" height="24" rx="3" fill="#0284c7" />
            <line x1="16" y1="17" x2="24" y2="17" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="21" x2="28" y2="21" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="25" x2="22" y2="25" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" />
            {/* Verified Shield Badge */}
            <path d="M28 24C28 24 32 25 32 28C32 32.5 28 35 28 35C28 35 24 32.5 24 28C24 25 28 24 28 24Z" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
            <path d="M26 28.5L27.5 30L30 27" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ));

      case 'notary_reports':
      case 'laporan_notaris':
        return renderBaseIcon('#fffbeb', '#fef3c7', '#fde68a', '#78350f', (
          <>
            {/* Clipboard Base */}
            <rect x="13" y="14" width="22" height="23" rx="3" fill="#d97706" />
            <rect x="19" y="12" width="10" height="4" rx="1.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
            {/* Lines */}
            <line x1="17" y1="20" x2="27" y2="20" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="24" x2="31" y2="24" stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="28" x2="25" y2="28" stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" />
            {/* Stamp Badge */}
            <circle cx="28" cy="30" r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
          </>
        ));

      case 'incoming_mail':
      case 'surat_masuk':
        return renderBaseIcon('#f0fdfa', '#e0f2fe', '#99f6e4', '#0c4a6e', (
          <>
            {/* Mail Tray */}
            <path d="M11 26L14 34H34L37 26V33C37 34.7 35.7 36 34 36H14C12.3 36 11 34.7 11 33V26Z" fill="#0284c7" />
            {/* Envelope entering */}
            <rect x="15" y="13" width="18" height="13" rx="2" fill="#38bdf8" />
            <path d="M15 14L24 21L33 14" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            {/* Down Arrow */}
            <path d="M24 10V18M24 18L21 15M24 18L27 15" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ));

      case 'outgoing_mail':
      case 'surat_keluar':
        return renderBaseIcon('#fff1f2', '#ffe4e6', '#fecdd3', '#881337', (
          <>
            {/* Envelope */}
            <rect x="11" y="20" width="22" height="14" rx="2" fill="#e11d48" />
            <path d="M11 21L22 28L33 21" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            {/* Paper Plane Flying */}
            <path d="M22 20L36 12L29 26L25 21L22 20Z" fill="#ffffff" stroke="#e11d48" strokeWidth="1" />
          </>
        ));

      case 'protest_cheque':
      case 'protes_wesel':
        return renderBaseIcon('#f0fdfa', '#ccfbf1', '#99f6e4', '#134e4a', (
          <>
            <rect x="11" y="15" width="26" height="18" rx="3" fill="#0d9488" />
            <line x1="15" y1="20" x2="25" y2="20" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="15" y1="24" x2="29" y2="24" stroke="#ccfbf1" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="30" cy="28" r="4" fill="#f43f5e" stroke="#ffffff" strokeWidth="1" />
            <path d="M30 26V29M30 30.5V31" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
          </>
        ));

      case 'draft_akta_rups':
      case 'notulen':
      case 'pendirian':
      case 'rupst':
      case 'cv_profile':
        return renderBaseIcon('#f3e8ff', '#ede9fe', '#ddd6fe', '#581c87', (
          <>
            <rect x="12" y="12" width="24" height="24" rx="3" fill="#7c3aed" />
            <line x1="16" y1="17" x2="26" y2="17" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="21" x2="28" y2="21" stroke="#e9d5ff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="25" x2="22" y2="25" stroke="#e9d5ff" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M26 27L31 22L33 24L28 29L25 30L26 27Z" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
          </>
        ));

      // ==========================================
      // 4. KEUANGAN SUBITEMS
      // ==========================================
      case 'invoice':
      case 'tagihan':
        return renderBaseIcon('#ecfdf5', '#d1fae5', '#a7f3d0', '#064e3b', (
          <>
            {/* Invoice Sheet */}
            <rect x="13" y="11" width="22" height="26" rx="3" fill="#059669" />
            <line x1="17" y1="16" x2="25" y2="16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="21" x2="31" y2="21" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="25" x2="29" y2="25" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="29" x2="24" y2="29" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            {/* Checkmark Badge */}
            <circle cx="28" cy="31" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M26 31L27.5 32.5L30 29.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ));

      case 'products':
      case 'produk':
        return renderBaseIcon('#fff7ed', '#ffedd5', '#fed7aa', '#7c2d12', (
          <>
            {/* 3D Box Cube */}
            <path d="M24 12L36 18V30L24 36L12 30V18L24 12Z" fill="#ea580c" />
            <path d="M24 12L36 18L24 24L12 18L24 12Z" fill="#f97316" />
            <path d="M24 24V36L12 30V18L24 24Z" fill="#c2410c" />
            {/* Box Tape */}
            <path d="M20 14L32 20L28 22L16 16L20 14Z" fill="#ffffff" opacity="0.7" />
          </>
        ));

      case 'quotation':
      case 'penawaran':
        return renderBaseIcon('#f3e8ff', '#ede9fe', '#ddd6fe', '#581c87', (
          <>
            {/* Offer Paper */}
            <rect x="13" y="11" width="22" height="26" rx="3" fill="#7c3aed" />
            <line x1="17" y1="16" x2="26" y2="16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="21" x2="31" y2="21" stroke="#e9d5ff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="25" x2="27" y2="25" stroke="#e9d5ff" strokeWidth="1.5" strokeLinecap="round" />
            {/* Star Offer Tag */}
            <circle cx="29" cy="30" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M29 27.5L29.8 29.2L31.6 29.4L30.3 30.7L30.6 32.5L29 31.6L27.4 32.5L27.7 30.7L26.4 29.4L28.2 29.2L29 27.5Z" fill="#ffffff" />
          </>
        ));

      case 'delivery':
      case 'surat_jalan':
        return renderBaseIcon('#eff6ff', '#dbeafe', '#bfdbfe', '#1e3a8a', (
          <>
            {/* Delivery Truck Body */}
            <rect x="11" y="20" width="18" height="12" rx="2" fill="#1e61c3" />
            <path d="M29 24H35L38 28V32H29V24Z" fill="#2563eb" />
            {/* Wheels */}
            <circle cx="16" cy="33" r="3" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
            <circle cx="33" cy="33" r="3" fill="#0f172a" stroke="#ffffff" strokeWidth="1" />
            {/* Speed Lines */}
            <line x1="8" y1="23" x2="10" y2="23" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="6" y1="27" x2="9" y2="27" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
          </>
        ));

      case 'receipt':
      case 'tanda_terima':
        return renderBaseIcon('#ecfdf5', '#d1fae5', '#a7f3d0', '#064e3b', (
          <>
            {/* Handover Paper */}
            <rect x="13" y="11" width="22" height="26" rx="3" fill="#059669" />
            <line x1="17" y1="16" x2="27" y2="16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="21" x2="31" y2="21" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="25" x2="26" y2="25" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
            {/* Handover Verified Stamp */}
            <circle cx="28" cy="30" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M26 30L27.5 31.5L30 28.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ));

      case 'deposit_note':
      case 'penitipan_uang':
        return renderBaseIcon('#f0fdfa', '#ccfbf1', '#99f6e4', '#134e4a', (
          <>
            {/* Wallet Base */}
            <rect x="11" y="16" width="26" height="18" rx="4" fill="#0d9488" />
            <path d="M11 22H37V30C37 32.2 35.2 34 33 34H15C12.8 34 11 32.2 11 30V22Z" fill="#14b8a6" />
            {/* Flap */}
            <path d="M27 21H37V29H27C24.8 29 23 27.2 23 25C23 22.8 24.8 21 27 21Z" fill="#0f766e" stroke="#ffffff" strokeWidth="1" />
            <circle cx="28" cy="25" r="1.5" fill="#fef08a" />
            {/* Gold Coin */}
            <circle cx="20" cy="15" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
            <text x="20" y="16.5" textAnchor="middle" fontSize="4.5" fontWeight="extrabold" fill="#ffffff">Rp</text>
          </>
        ));

      // ==========================================
      // 5. DOKUMEN & SURAT / REFERENSI SUBITEMS
      // ==========================================
      case 'kbli_mapping':
      case 'mapping_kbli':
        return renderBaseIcon('#eff6ff', '#e0e7ff', '#a5b4fc', '#1e1b4b', (
          <>
            {/* 2020 Card */}
            <rect x="10" y="13" width="13" height="22" rx="2.5" fill="#1e61c3" />
            <text x="16.5" y="23" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#ffffff">2020</text>
            {/* 2025 Card */}
            <rect x="25" y="13" width="13" height="22" rx="2.5" fill="#4338ca" />
            <text x="31.5" y="23" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#ffffff">2025</text>
            {/* Swap Arrows */}
            <path d="M18 28H30M30 28L27 25M30 28L27 31" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ));

      case 'saran_kbli':
      case 'kbli_suggestion':
        return renderBaseIcon('#fffbeb', '#fef3c7', '#fde68a', '#78350f', (
          <>
            {/* Lightbulb */}
            <path d="M24 12C19.6 12 16 15.6 16 20C16 23.2 17.9 25.9 20.6 27.2V31C20.6 31.6 21.1 32 21.7 32H26.3C26.9 32 27.4 31.6 27.4 31V27.2C30.1 25.9 32 23.2 32 20C32 15.6 28.4 12 24 12Z" fill="#d97706" />
            <path d="M21 33H27V34C27 34.6 26.6 35 26 35H22C21.4 35 21 34.6 21 34V33Z" fill="#f59e0b" />
            <circle cx="24" cy="20" r="3" fill="#fef3c7" />
          </>
        ));

      case 'perbaikan':
      case 'surat_perbaikan':
        return renderBaseIcon('#fff1f2', '#ffedd5', '#fecdd3', '#881337', (
          <>
            {/* Paper */}
            <rect x="13" y="12" width="22" height="24" rx="3" fill="#e11d48" />
            <line x1="17" y1="17" x2="27" y2="17" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="17" y1="21" x2="29" y2="21" stroke="#fecdd3" strokeWidth="1.5" strokeLinecap="round" />
            {/* Pencil Editing */}
            <path d="M23 29L33 19L36 22L26 32L21 33L23 29Z" fill="#ea580c" stroke="#ffffff" strokeWidth="1" />
          </>
        ));

      case 'panduan':
      case 'guide':
        return renderBaseIcon('#f0f9ff', '#e0f2fe', '#bae6fd', '#0c4a6e', (
          <>
            {/* Guide Book */}
            <rect x="13" y="11" width="22" height="26" rx="3" fill="#0284c7" />
            <rect x="13" y="11" width="4" height="26" rx="1" fill="#0369a1" />
            {/* Info Badge */}
            <circle cx="26" cy="20" r="2.5" fill="#ffffff" />
            <rect x="24.5" y="24" width="3" height="8" rx="1" fill="#ffffff" />
          </>
        ));

      case 'import_kbli':
        return renderBaseIcon('#fffbeb', '#fef3c7', '#fde68a', '#78350f', (
          <>
            <rect x="12" y="14" width="24" height="22" rx="3" fill="#d97706" />
            <path d="M24 18V28M24 28L20 24M24 28L28 24" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ));

      // ==========================================
      // 6. SISTEM & PENGATURAN SUBITEMS
      // ==========================================
      case 'settings':
      case 'pengaturan':
        return renderBaseIcon('#f8fafc', '#f1f5f9', '#cbd5e1', '#0f172a', (
          <>
            <circle cx="24" cy="24" r="8" fill="#334155" />
            <circle cx="24" cy="24" r="4" fill="#f8fafc" />
            <path d="M24 12V15M24 33V36M12 24H15M33 24H36M15.5 15.5L17.6 17.6M30.4 30.4L32.5 32.5M15.5 32.5L17.6 30.4M30.4 17.6L32.5 15.5" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          </>
        ));

      case 'whatsapp_settings':
      case 'whatsapp':
        return renderBaseIcon('#ecfdf5', '#d1fae5', '#a7f3d0', '#064e3b', (
          <>
            {/* Chat Bubble */}
            <path d="M24 12C17.4 12 12 17.4 12 24C12 26.3 12.7 28.5 13.9 30.3L12.5 35.5L17.9 34.1C19.7 35.3 21.8 36 24 36C30.6 36 36 30.6 36 24C36 17.4 30.6 12 24 12Z" fill="#16a34a" />
            {/* Phone receiver */}
            <path d="M19 18C19 18 19.5 20.5 20.5 21.5C21.5 22.5 23 23 23.5 23L25.5 21.5C26 21 27 21 27.5 21.5L29 23C29.5 23.5 29.5 24.5 29 25C28 26 26.5 27.5 23 26C19.5 24.5 17.5 21 17 20C16.5 19 17.5 18 18.5 17.5L19 18Z" fill="#ffffff" />
          </>
        ));

      case 'user_management':
      case 'pengguna':
      case 'users':
        return renderBaseIcon('#eff6ff', '#e0e7ff', '#a5b4fc', '#1e1b4b', (
          <>
            {/* User Avatars */}
            <circle cx="20" cy="18" r="4.5" fill="#1e61c3" />
            <path d="M13 29C13 25.7 16.1 23 20 23C23.9 23 27 25.7 27 29" fill="#1e61c3" />
            <circle cx="30" cy="19" r="3.5" fill="#4338ca" />
            <path d="M25 29C25 26.5 27.2 24.5 30 24.5C32.8 24.5 35 26.5 35 29" fill="#4338ca" />
          </>
        ));

      case 'stamp_settings':
      case 'stempel':
        return renderBaseIcon('#f3e8ff', '#ede9fe', '#ddd6fe', '#581c87', (
          <>
            {/* Stempel Stamp Tool */}
            <path d="M20 14C20 12.9 20.9 12 22 12H26C27.1 12 28 12.9 28 14V19H20V14Z" fill="#7c3aed" />
            <path d="M16 19H32V24H16V19Z" fill="#9333ea" />
            <rect x="12" y="27" width="24" height="7" rx="2" fill="#7c3aed" />
            <line x1="12" y1="30" x2="36" y2="30" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" />
          </>
        ));

      default:
        return renderBaseIcon('#eff6ff', '#dbeafe', '#bfdbfe', '#1e3a8a', (
          <>
            <circle cx="24" cy="24" r="8" fill="#1e61c3" />
            <circle cx="24" cy="24" r="3" fill="#ffffff" />
          </>
        ));
    }
  };

  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 transition-transform duration-200 select-none ${
        active ? 'scale-105 filter drop-shadow-md' : 'hover:scale-105'
      } ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {renderIcon()}
    </div>
  );
};
