import React from 'react';
import { SlidersHorizontal, Search } from 'lucide-react';
import { CompanyToolbarProps } from '../types/company.types';

export const CompanyToolbar: React.FC<CompanyToolbarProps> = ({
  profiles,
  showArchivedProfiles,
  setShowArchivedProfiles,
  setProfileCurrentPage,
  profileSearchQuery,
  setProfileSearchQuery,
  selectedProfileYear,
  setSelectedProfileYear,
  uniqueProfileYears,
}) => {
  const handleSearchChange = (val: string) => {
    setProfileSearchQuery(val);
    setProfileCurrentPage(1);
  };

  const archivedCount = profiles.filter((p) => p.isArchived).length;

  if (profiles.length === 0) return null;

  return (
    <div className="bg-white p-5 rounded-md shadow-sm border border-slate-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#3b5998]" />
            <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-tight">
              Saring & Cari Klien
            </h3>
          </div>
          {/* Active vs Archived Segmented Control */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200/60">
            <button
              onClick={() => {
                setShowArchivedProfiles(false);
                setProfileCurrentPage(1);
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all uppercase tracking-wider ${
                !showArchivedProfiles
                  ? 'bg-white text-[#3b5998] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => {
                setShowArchivedProfiles(true);
                setProfileCurrentPage(1);
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all uppercase tracking-wider flex items-center gap-1.5 ${
                showArchivedProfiles
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Arsip</span>
              {archivedCount > 0 && (
                <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 h-4 rounded-full flex items-center justify-center font-bold">
                  {archivedCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama PT atau Kedudukan..."
              value={profileSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-md text-[12px] outline-none focus:border-[#3b5998] bg-white text-slate-800 placeholder-slate-400 transition-all shadow-sm"
            />
            {profileSearchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-[14px]"
              >
                ×
              </button>
            )}
          </div>

          {/* Year Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedProfileYear}
              onChange={(e) => {
                setSelectedProfileYear(e.target.value);
                setProfileCurrentPage(1);
              }}
              className="w-full py-2 px-3 border border-slate-300 rounded-md text-[12px] text-slate-700 font-medium outline-none focus:border-[#3b5998] transition-all bg-white"
            >
              <option value="all">Semua Tahun Pendirian</option>
              {uniqueProfileYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          {(profileSearchQuery !== '' || selectedProfileYear !== 'all') && (
            <button
              onClick={() => {
                setProfileSearchQuery('');
                setSelectedProfileYear('all');
                setProfileCurrentPage(1);
              }}
              className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[12px] font-bold transition-all border border-slate-200 uppercase tracking-wider"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default CompanyToolbar;
