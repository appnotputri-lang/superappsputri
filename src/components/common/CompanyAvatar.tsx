import React from 'react';

export const getCompanyInitials = (name: string): string => {
  if (!name) return "PT";
  let cleanName = name.replace(/^(PT\.?\s+)/gi, "").trim();
  if (!cleanName) return "PT";

  const upper = cleanName.toUpperCase();
  if (upper.includes("CZARRE")) return "CZ";
  if (upper.includes("BINACITRA")) return "BK";

  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleanName.slice(0, 2).toUpperCase();
};

export const getPastelColor = (name: string) => {
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pastels = [
    { bg: 'bg-blue-50/80 text-blue-600 border-blue-200/60' },
    { bg: 'bg-indigo-50/80 text-indigo-600 border-indigo-200/60' },
    { bg: 'bg-purple-50/80 text-purple-600 border-purple-200/60' },
    { bg: 'bg-pink-50/80 text-pink-600 border-pink-200/60' },
    { bg: 'bg-orange-50/80 text-orange-600 border-orange-200/60' },
    { bg: 'bg-amber-50/80 text-amber-600 border-amber-200/60' },
    { bg: 'bg-emerald-50/80 text-emerald-600 border-emerald-200/60' },
    { bg: 'bg-teal-50/80 text-teal-600 border-teal-200/60' },
    { bg: 'bg-cyan-50/80 text-cyan-600 border-cyan-200/60' },
  ];
  return pastels[hash % pastels.length];
};

export interface CompanyAvatarProps {
  name: string;
}

export const CompanyAvatar = ({ name }: CompanyAvatarProps) => {
  const initials = getCompanyInitials(name);
  const colors = getPastelColor(name);
  return (
    <div className={`w-[36px] h-[36px] rounded-[12px] flex items-center justify-center font-semibold text-[12px] border shrink-0 uppercase select-none ${colors.bg}`}>
      {initials}
    </div>
  );
};
