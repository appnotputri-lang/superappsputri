import React from 'react';
import { 
  Filter, 
  Search, 
  Grid, 
  Building, 
  Briefcase, 
  HeartHandshake, 
  Users, 
  Coins, 
  Scale, 
  FileText, 
  Globe, 
  User, 
  Layers,
  GitMerge
} from 'lucide-react';
import { CompanyToolbarProps } from '../types/company.types';

const CLIENT_TYPE_CATEGORIES = [
  { id: 'all', label: 'SEMUA', icon: Grid },
  { id: 'PT', label: 'PT', icon: Building },
  { id: 'CV', label: 'CV', icon: Briefcase },
  { id: 'YAYASAN', label: 'YAYASAN', icon: HeartHandshake },
  { id: 'PERKUMPULAN', label: 'PERKUMPULAN', icon: Users },
  { id: 'KOPERASI', label: 'KOPERASI', icon: Coins },
  { id: 'FIRMA', label: 'FIRMA', icon: Scale },
  { id: 'PERDATA', label: 'PERDATA', icon: FileText },
  { id: 'PMA', label: 'PMA', icon: Globe },
  { id: 'PERORANGAN', label: 'PERORANGAN', icon: User },
  { id: 'LAINNYA', label: 'LAINNYA', icon: Layers }
];

export const CompanyToolbar: React.FC<CompanyToolbarProps> = ({
  items = [],
  showArchivedProfiles,
  setShowArchivedProfiles,
  setProfileCurrentPage,
  profileSearchQuery,
  setProfileSearchQuery,
  selectedProfileYear,
  setSelectedProfileYear,
  uniqueProfileYears,
  selectedClientType,
  setSelectedClientType,
  onOpenMergeModal,
}) => {
  const handleSearchChange = (val: string) => {
    setProfileSearchQuery(val);
    setProfileCurrentPage(1);
  };

  const archivedCount = (items || []).filter((p) => p.isArchived).length;

  return (
    <div className="bg-white p-4 sm:p-4.5 rounded-xl shadow-xs border border-slate-200/80 space-y-3.5">
      {/* Top Filter & Search Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Title & Active/Archive Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-[#0c2444] rounded-lg">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight font-heading">
              Saring & Cari Klien
            </h3>
          </div>

          {/* Active vs Archived Segmented Control */}
          <div className="bg-slate-100/80 p-0.5 rounded-lg flex items-center border border-slate-200/80">
            <button
              onClick={() => {
                setShowArchivedProfiles(false);
                setProfileCurrentPage(1);
              }}
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all uppercase tracking-wider cursor-pointer ${
                !showArchivedProfiles
                  ? 'bg-white text-[#0c2444] shadow-xs'
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
              className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                showArchivedProfiles
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Arsip</span>
              {archivedCount > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {archivedCount}
                </span>
              )}
            </button>
          </div>

          {/* Merge Clients Button */}
          {onOpenMergeModal && (
            <button
              onClick={onOpenMergeModal}
              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-[#0c2444] text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 uppercase tracking-wider border border-blue-200/50 cursor-pointer"
            >
              <GitMerge className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>Gabungkan Duplikat</span>
            </button>
          )}
        </div>

        {/* Search Input & Year Dropdown */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center w-full lg:w-auto">
          <div className="relative w-full sm:w-80 lg:w-96">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama klien..."
              value={profileSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8.5 pr-7 py-1.5 border border-slate-200/80 rounded-lg text-xs outline-none focus:border-[#1890ff] focus:ring-2 focus:ring-blue-50 bg-slate-50/50 focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
            />
            {profileSearchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Year Filter Dropdown */}
          <div className="w-full sm:w-48">
            <select
              value={selectedProfileYear}
              onChange={(e) => {
                setSelectedProfileYear(e.target.value);
                setProfileCurrentPage(1);
              }}
              className="w-full py-1.5 px-3 border border-slate-200/80 rounded-lg text-xs text-slate-700 font-medium outline-none focus:border-[#1890ff] focus:ring-2 focus:ring-blue-50 transition-all bg-slate-50/50 focus:bg-white"
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
          {(profileSearchQuery !== '' || selectedProfileYear !== 'all' || selectedClientType !== 'all') && (
            <button
              onClick={() => {
                setProfileSearchQuery('');
                setSelectedProfileYear('all');
                setSelectedClientType('all');
                setProfileCurrentPage(1);
              }}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all border border-slate-200 uppercase tracking-wider shrink-0 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Category Chips Bar */}
      <div className="pt-2.5 border-t border-slate-100 overflow-x-auto">
        <div className="flex items-center gap-1.5 pb-0.5 min-w-max">
          {CLIENT_TYPE_CATEGORIES.map((cat) => {
            const IconComponent = cat.icon;
            const isActive = selectedClientType === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedClientType(cat.id);
                  setProfileCurrentPage(1);
                }}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1.5 uppercase tracking-wider border cursor-pointer ${
                  isActive
                    ? 'bg-[#0c2444] text-white border-[#0c2444] shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:border-blue-300 hover:text-[#0c2444] hover:bg-slate-50/50'
                }`}
              >
                <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-blue-300' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default CompanyToolbar;

