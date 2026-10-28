import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Search, 
  SlidersHorizontal, 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  Globe2, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  PieChart, 
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  Loader2,
  X
} from 'lucide-react';
import { PageContainer, PageHeader, EmptyState } from '../../components/ui/PageLayout';
import { MobileHeader } from '../../components/ui/MobileHeader';
import { useAuth } from '../../hooks/useAuth';
import { PersonService } from '../../services/PersonService';
import { PersonDetailModal } from './PersonDetailModal';
import { formatCurrency, formatInputNumber } from '../../../utils/formatters';

interface DataTerpusatPageProps {
  setIsSidebarOpen?: (v: boolean) => void;
}

export const DataTerpusatPage: React.FC<DataTerpusatPageProps> = ({ setIsSidebarOpen }) => {
  const { user, userProfile } = useAuth();

  // State: Data Listing & Pagination
  const [people, setPeople] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [summaryStats, setSummaryStats] = useState<{
    totalPeople: number;
    totalWni: number;
    totalWna: number;
    totalRelations: number;
    totalCompaniesLinked: number;
  }>({
    totalPeople: 0,
    totalWni: 0,
    totalWna: 0,
    totalRelations: 0,
    totalCompaniesLinked: 0
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // State: Search & Filters
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [nationalityFilter, setNationalityFilter] = useState<string>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');
  const [companyRelationFilter, setCompanyRelationFilter] = useState<string>('ALL');
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<string>('ALL');

  // State: Detail Modal
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // State: Relation Syncing
  const [isSyncingRelations, setIsSyncingRelations] = useState<boolean>(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');
  const [syncResultBanner, setSyncResultBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Debounce search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1); // Reset page on new search
    }, 350);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch Centralized Data from Cloudflare D1 via PersonService
  const loadCentralizedData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await PersonService.fetchCentralizedData({
        search: debouncedSearch,
        page: currentPage,
        limit: pageSize,
        nationalityType: nationalityFilter,
        identityStatus: verificationFilter,
        hasCompany: companyRelationFilter,
        roleCategory: roleCategoryFilter
      });

      setPeople(result.people || []);
      setTotalCount(result.total || 0);
      if (result.summary) {
        setSummaryStats(result.summary);
      }
    } catch (err) {
      console.error('[DataTerpusatPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch, 
    currentPage, 
    pageSize, 
    nationalityFilter, 
    verificationFilter, 
    companyRelationFilter, 
    roleCategoryFilter
  ]);

  useEffect(() => {
    loadCentralizedData();
  }, [loadCentralizedData]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setNationalityFilter('ALL');
    setVerificationFilter('ALL');
    setCompanyRelationFilter('ALL');
    setRoleCategoryFilter('ALL');
    setCurrentPage(1);
  };

  const isFiltered = Boolean(
    debouncedSearch || 
    nationalityFilter !== 'ALL' || 
    verificationFilter !== 'ALL' || 
    companyRelationFilter !== 'ALL' || 
    roleCategoryFilter !== 'ALL'
  );

  // Handle clicking a row to open detail modal
  const handleOpenDetail = (person: any) => {
    setSelectedPerson(person);
    setIsDetailModalOpen(true);
  };

  // Callback when identity is verified in modal
  const handleIdentityVerified = (updatedPerson: any) => {
    setPeople(prev => prev.map(p => p.personId === updatedPerson.personId ? { ...p, ...updatedPerson } : p));
    if (selectedPerson && selectedPerson.personId === updatedPerson.personId) {
      setSelectedPerson((prev: any) => ({ ...prev, ...updatedPerson }));
    }
    // Refresh summary
    loadCentralizedData();
  };

  // Handle syncing all company relations from Firestore legal profiles
  const handleSyncCompanyRelations = async () => {
    setIsSyncingRelations(true);
    setSyncProgressMsg('Menyiapkan pemindaian profil perusahaan...');
    setSyncResultBanner(null);

    try {
      const res = await PersonService.syncAllCompanyRelationsFromFirestore((current, total, msg) => {
        setSyncProgressMsg(msg);
      });

      if (res.success) {
        setSyncResultBanner({
          type: 'success',
          message: `Berhasil menyinkronkan ${res.linkedCount} relasi perusahaan dan kepemilikan saham ke Cloudflare D1!`
        });
        await loadCentralizedData();
      } else {
        setSyncResultBanner({
          type: 'error',
          message: 'Gagal menyinkronkan beberapa relasi perusahaan.'
        });
      }
    } catch (err: any) {
      setSyncResultBanner({
        type: 'error',
        message: `Terjadi kesalahan saat sinkronisasi: ${err?.message || String(err)}`
      });
    } finally {
      setIsSyncingRelations(false);
      setSyncProgressMsg('');
    }
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItemIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItemIndex = Math.min(currentPage * pageSize, totalCount);

  // Mask passport helper for table
  const maskPassportDisplay = (num?: string) => {
    if (!num) return 'Belum tersedia';
    if (num.length <= 4) return '***';
    return `${num.slice(0, 3)}****${num.slice(-2)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Mobile Header navigation */}
      <MobileHeader 
        title="Data Terpusat" 
        onOpenSidebar={() => setIsSidebarOpen?.(true)} 
      />

      <PageContainer className="pt-3 sm:pt-6">
        {/* Header Section */}
        <PageHeader
          title="Data Terpusat"
          description="Identitas, relasi perusahaan, jabatan, dan kepemilikan saham dalam satu tempat."
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSyncCompanyRelations}
                disabled={isSyncingRelations}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                title="Sinkronkan relasi perusahaan, jabatan, dan kepemilikan saham dari Firestore ke D1"
              >
                {isSyncingRelations ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Building2 className="w-3.5 h-3.5" />
                )}
                <span>{isSyncingRelations ? 'Menyinkronkan...' : 'Sinkronkan Relasi'}</span>
              </button>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/80 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                D1 Master Identity Engine
              </span>
            </div>
          }
        />

        {/* Sync Progress Indicator */}
        {isSyncingRelations && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 animate-fadeIn">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-blue-900">Sedang Memproses Sinkronisasi Relasi</h4>
              <p className="text-xs text-blue-700 mt-0.5">{syncProgressMsg}</p>
            </div>
          </div>
        )}

        {/* Sync Result Banner */}
        {syncResultBanner && (
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-fadeIn ${
            syncResultBanner.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-2.5 text-xs">
              {syncResultBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{syncResultBanner.message}</span>
            </div>
            <button
              onClick={() => setSyncResultBanner(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Informative Callout Banner when totalRelations is 0 */}
        {summaryStats.totalPeople > 0 && summaryStats.totalRelations === 0 && !isSyncingRelations && !syncResultBanner && (
          <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  Relasi Perusahaan & Kepemilikan Saham Belum Tersinkronisasi ke D1
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Database D1 telah memiliki <b>{summaryStats.totalPeople} master individu</b>, namun indeks relasi perusahaan dan saham masih 0. Klik tombol <b>"Sinkronkan Relasi Sekarang"</b> untuk memetakan seluruh relasi perusahaan, jabatan, dan kepemilikan saham dari profil legal ke Cloudflare D1.
                </p>
              </div>
            </div>
            <button
              onClick={handleSyncCompanyRelations}
              disabled={isSyncingRelations}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm shrink-0 disabled:opacity-50 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Sinkronkan Relasi Sekarang
            </button>
          </div>
        )}

        {/* Summary Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Total Orang (Master)</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
                {summaryStats.totalPeople}
              </span>
              <span className="text-xs text-slate-400">individu</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Relasi Perusahaan</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-indigo-950 font-mono">
                {summaryStats.totalRelations}
              </span>
              <span className="text-xs text-slate-400">posisi / peran</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>WNI (e-KTP)</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-emerald-950 font-mono">
                {summaryStats.totalWni}
              </span>
              <span className="text-xs text-slate-400">orang</span>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Globe2 className="w-4 h-4 text-purple-600" />
              <span>WNA (Paspor)</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-purple-950 font-mono">
                {summaryStats.totalWna}
              </span>
              <span className="text-xs text-slate-400">orang</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, NIK, nomor paspor, atau nama perusahaan..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Reset Button if filter active */}
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filter
              </button>
            )}
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
            {/* Filter Jenis Orang (WNI / WNA) */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Jenis Identitas</label>
              <select
                value={nationalityFilter}
                onChange={(e) => {
                  setNationalityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Semua (WNI & WNA)</option>
                <option value="WNI">Hanya WNI</option>
                <option value="WNA">Hanya WNA</option>
              </select>
            </div>

            {/* Filter Status Verifikasi */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Status Verifikasi</label>
              <select
                value={verificationFilter}
                onChange={(e) => {
                  setVerificationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="VERIFIED">Terverifikasi (Verified)</option>
                <option value="PROVISIONAL">Provisional</option>
              </select>
            </div>

            {/* Filter Relasi Perusahaan */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Relasi Perusahaan</label>
              <select
                value={companyRelationFilter}
                onChange={(e) => {
                  setCompanyRelationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Semua Orang</option>
                <option value="YES">Memiliki Relasi Perusahaan</option>
                <option value="NO">Mandiri (Belum ada relasi)</option>
              </select>
            </div>

            {/* Filter Jabatan */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Jabatan / Kategori</label>
              <select
                value={roleCategoryFilter}
                onChange={(e) => {
                  setRoleCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Semua Jabatan</option>
                <option value="DIREKSI">Direksi</option>
                <option value="KOMISARIS">Komisaris</option>
                <option value="PEMEGANG_SAHAM">Pemegang Saham</option>
                <option value="PENGURUS">Pengurus</option>
                <option value="PESERO">Pesero CV</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Centralized Data Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Mengambil data identitas & proyeksi relasi dari D1...
              </p>
            </div>
          ) : people.length === 0 ? (
            <div className="py-16 px-4">
              <EmptyState
                icon={<Users className="w-6 h-6 text-slate-400" />}
                title="Data tidak ditemukan"
                description={
                  isFiltered
                    ? 'Tidak ada data identitas yang cocok dengan kriteria pencarian dan filter Anda.'
                    : 'Belum ada data identitas master di database terpusat.'
                }
                action={
                  isFiltered ? (
                    <button
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Pencarian & Filter
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-4 min-w-[150px]">1. NIK</th>
                    <th className="py-3 px-4 min-w-[200px]">2. Nama Lengkap</th>
                    <th className="py-3 px-3 text-center min-w-[90px]">3. Jenis Identitas</th>
                    <th className="py-3 px-3 text-center min-w-[100px]">4. Jml Perusahaan</th>
                    <th className="py-3 px-4 min-w-[180px]">5. Perusahaan</th>
                    <th className="py-3 px-4 min-w-[140px]">6. Jabatan</th>
                    <th className="py-3 px-4 text-right min-w-[150px]">7. Jml Lembar Saham</th>
                    <th className="py-3 px-4 text-right min-w-[160px]">8. Nilai Saham</th>
                    <th className="py-3 px-3 text-center min-w-[110px]">9. Status Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {people.map((person) => {
                    const isPersonWna = person.nationalityType === 'WNA';
                    const hasCompany = person.companyCount > 0;
                    const hasShares = person.sharesRecordedCount > 0;

                    return (
                      <tr
                        key={person.personId}
                        onClick={() => handleOpenDetail(person)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                      >
                        {/* 1. NIK Column */}
                        <td className="py-3.5 px-4 font-mono">
                          {person.nik ? (
                            <span className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {person.nik}
                            </span>
                          ) : isPersonWna ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              <Globe2 className="w-3 h-3" />
                              {maskPassportDisplay(person.passportNumber)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Belum tersedia</span>
                          )}
                        </td>

                        {/* 2. Nama Lengkap */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-blue-800 transition-colors">
                            {person.salutation ? `${person.salutation} ` : ''}{person.name}
                          </div>
                          {person.occupation && (
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                              {person.occupation}
                            </div>
                          )}
                        </td>

                        {/* 3. Jenis Identitas */}
                        <td className="py-3.5 px-3 text-center">
                          {isPersonWna ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              WNA
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              WNI
                            </span>
                          )}
                        </td>

                        {/* 4. Jumlah Perusahaan Terkait */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              hasCompany
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {person.companyCount || 0}
                          </span>
                        </td>

                        {/* 5. Perusahaan (Preview) */}
                        <td className="py-3.5 px-4">
                          {!hasCompany ? (
                            <span className="text-slate-400 italic">Tidak ada relasi</span>
                          ) : person.companyCount === 1 ? (
                            <span className="font-medium text-slate-800 truncate block max-w-[180px]">
                              {person.primaryCompanyName}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-slate-800 truncate block max-w-[140px]">
                                {person.primaryCompanyName}
                              </span>
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                                +{person.companyCount - 1}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 6. Jabatan (Preview) */}
                        <td className="py-3.5 px-4 text-slate-700">
                          {hasCompany ? (
                            person.primaryPositionTitle || '-'
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 7. Jumlah Lembar Saham */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          {!hasCompany ? (
                            <span className="text-slate-400">-</span>
                          ) : !hasShares ? (
                            <span className="text-slate-400 italic text-[11px]">Belum tersinkronisasi</span>
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {formatInputNumber(person.totalShares || 0)} lbr
                            </span>
                          )}
                        </td>

                        {/* 8. Nilai Saham */}
                        <td className="py-3.5 px-4 text-right font-mono">
                          {!hasCompany ? (
                            <span className="text-slate-400">-</span>
                          ) : !hasShares || person.totalShareValue == null ? (
                            <span className="text-slate-400 italic text-[11px]">Belum tersinkronisasi</span>
                          ) : (
                            <span className="font-bold text-emerald-700">
                              {formatCurrency(Number(person.totalShareValue))}
                            </span>
                          )}
                        </td>

                        {/* 9. Status Verifikasi */}
                        <td className="py-3.5 px-3 text-center">
                          {person.identityStatus === 'VERIFIED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Terverifikasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <ShieldAlert className="w-3 h-3" />
                              Provisional
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Server-Side Pagination Bar */}
          {!loading && people.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>
                  Menampilkan <b>{startItemIndex}</b> - <b>{endItemIndex}</b> dari <b>{totalCount}</b> individu
                </span>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1">
                  <span>Per halaman:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded font-medium text-slate-700 focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageContainer>

      {/* Person Detail Modal */}
      <PersonDetailModal
        person={selectedPerson}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        currentUser={userProfile || user}
        onIdentityVerified={handleIdentityVerified}
      />
    </div>
  );
};
