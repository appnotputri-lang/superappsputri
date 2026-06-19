import React from 'react';

export const documentStatusOptions = [
  'DRAFTING',
  'DRAFT NOTULEN DI KIRIM',
  'DRAFT AKTA DIKIRIM',
  'SUDAH CETAK AKTA',
  'SUDAH INPUT AHU',
  'SELESAI'
] as const;

export const DocumentStatusBadge = ({ status, className = "" }: { status?: string; className?: string }) => {
  const safeStatus = status || 'DRAFTING';
  
  let styles = "bg-slate-150 text-slate-800 border-slate-250";
  
  switch (safeStatus) {
    case 'DRAFTING':
    case 'DRAFT':
    case 'Draft':
      styles = "bg-amber-100 text-amber-800 border-amber-200";
      break;
    case 'DRAFT NOTULEN DI KIRIM':
    case 'DRAFT AKTA DIKIRIM':
      styles = "bg-blue-100 text-blue-800 border-blue-200";
      break;
    case 'SUDAH CETAK AKTA':
      styles = "bg-purple-100 text-purple-800 border-purple-200";
      break;
    case 'SUDAH INPUT AHU':
      styles = "bg-indigo-100 text-indigo-800 border-indigo-200";
      break;
    case 'SELESAI':
    case 'Final':
      styles = "bg-emerald-100 text-emerald-800 border-emerald-200";
      break;
  }
  
  return (
    <span className={`px-2 py-1 text-[10px] sm:text-[11px] font-bold rounded-md border inline-block uppercase text-center leading-tight shadow-sm whitespace-nowrap w-[150px] sm:w-[185px] transition-all duration-200 ${styles} ${className}`}>
      {safeStatus.toUpperCase()}
    </span>
  );
};
