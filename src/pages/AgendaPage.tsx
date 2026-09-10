import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  CheckCircle2, 
  Trash2, 
  ChevronLeft, 
  Tag, 
  User, 
  FileText,
  Filter,
  AlertCircle
} from 'lucide-react';
import { AgendaItem, AgendaType, AgendaStatus } from '../types/agenda';
import { AgendaService } from '../services/AgendaService';
import { AddAgendaModal } from '../components/agenda/AddAgendaModal';
import { Project } from '../domain/project/Project';

interface AgendaPageProps {
  projects?: Project[];
  onNavigateToDashboard?: () => void;
  setActiveSidebarTab?: (tab: string) => void;
}

export const AgendaPage: React.FC<AgendaPageProps> = ({
  projects = [],
  onNavigateToDashboard,
  setActiveSidebarTab
}) => {
  const [manualAgendas, setManualAgendas] = useState<AgendaItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'today' | 'upcoming' | 'all' | 'completed'>('today');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Realtime subscription for manual agendas
  useEffect(() => {
    const unsubscribe = AgendaService.subscribeAgendas((items) => {
      setManualAgendas(items);
    });
    return () => unsubscribe();
  }, []);

  const todayStr = AgendaService.getTodayDateString();

  // Combine manual agendas with extracted agendas from projects
  const allAgendas = useMemo(() => {
    const extracted = AgendaService.extractAgendasFromProjects(projects);
    const combinedMap = new Map<string, AgendaItem>();

    manualAgendas.forEach((item) => combinedMap.set(item.id, item));
    extracted.forEach((item) => {
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    });

    return Array.from(combinedMap.values());
  }, [manualAgendas, projects]);

  // Filtered agendas
  const filteredAgendas = useMemo(() => {
    return allAgendas.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          (item.clientOrProject && item.clientOrProject.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // 2. Type Filter
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }

      // 3. Tab Filter
      if (activeFilter === 'today') {
        return item.date === todayStr && item.status !== 'completed' && item.status !== 'cancelled';
      }
      if (activeFilter === 'upcoming') {
        return item.date > todayStr && item.status !== 'completed' && item.status !== 'cancelled';
      }
      if (activeFilter === 'completed') {
        return item.status === 'completed';
      }
      // 'all' tab: shows all non-cancelled agendas
      return item.status !== 'cancelled';
    }).sort((a, b) => {
      // Sort date then time
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  }, [allAgendas, searchQuery, selectedType, activeFilter, todayStr]);

  // Statistics counts
  const stats = useMemo(() => {
    const todayCount = allAgendas.filter(
      (i) => i.date === todayStr && i.status !== 'completed' && i.status !== 'cancelled'
    ).length;
    const upcomingCount = allAgendas.filter(
      (i) => i.date > todayStr && i.status !== 'completed' && i.status !== 'cancelled'
    ).length;
    const completedCount = allAgendas.filter((i) => i.status === 'completed').length;

    return { todayCount, upcomingCount, completedCount, totalCount: allAgendas.length };
  }, [allAgendas, todayStr]);

  const handleToggleComplete = async (agenda: AgendaItem) => {
    const nextStatus: AgendaStatus = agenda.status === 'completed' ? 'scheduled' : 'completed';
    await AgendaService.updateAgenda(agenda.id, { status: nextStatus });
  };

  const handleDelete = async (agendaId: string) => {
    if (window.confirm('Hapus agenda ini?')) {
      await AgendaService.deleteAgenda(agendaId);
    }
  };

  const handleBack = () => {
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    } else if (setActiveSidebarTab) {
      setActiveSidebarTab('beranda');
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Banner / Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Kembali ke Dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">
                  Agenda & Jadwal Kegiatan
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Notaris & PPAT
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola jadwal pertemuan klien, penandatanganan akta, deadline, dan agenda kantor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Agenda</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Metric / Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div 
            onClick={() => setActiveFilter('today')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'today'
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Hari Ini
              </span>
              <CalendarIcon className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">
              {stats.todayCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Kegiatan aktif hari ini</p>
          </div>

          <div 
            onClick={() => setActiveFilter('upcoming')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'upcoming'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Mendatang
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">
              {stats.upcomingCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Jadwal hari berikutnya</p>
          </div>

          <div 
            onClick={() => setActiveFilter('completed')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'completed'
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Selesai
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">
              {stats.completedCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Agenda terselesaikan</p>
          </div>

          <div 
            onClick={() => setActiveFilter('all')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Semua Agenda
              </span>
              <Filter className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 font-heading">
              {stats.totalCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Total seluruh agenda</p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari agenda, klien, atau catatan..."
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* Filter Pills & Type Select */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveFilter('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
                activeFilter === 'today'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('upcoming')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
                activeFilter === 'upcoming'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Mendatang
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('completed')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors shrink-0 ${
                activeFilter === 'completed'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Selesai
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            >
              <option value="all">Semua Jenis</option>
              <option value="Penandatanganan">Penandatanganan</option>
              <option value="Meeting">Meeting</option>
              <option value="Deadline">Deadline</option>
              <option value="Follow Up">Follow Up</option>
              <option value="Pemeriksaan">Pemeriksaan</option>
              <option value="RUPS">RUPS</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>

        {/* Agenda List */}
        <div className="space-y-3">
          {filteredAgendas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 font-heading">
                {activeFilter === 'today'
                  ? 'Belum ada agenda untuk hari ini.'
                  : 'Tidak ada agenda yang sesuai filter.'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Jadwalkan kegiatan baru untuk memantau aktivitas kantor secara teratur.
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Agenda Baru</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredAgendas.map((agenda) => {
                const isToday = agenda.date === todayStr;
                const isCompleted = agenda.status === 'completed';

                return (
                  <div
                    key={agenda.id}
                    className={`bg-white rounded-xl border transition-all p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs ${
                      isCompleted 
                        ? 'opacity-60 bg-slate-50/70 border-slate-200' 
                        : isToday 
                        ? 'border-blue-200 ring-1 ring-blue-50' 
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Left: Time & Information */}
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      {/* Time Badge */}
                      <div className="shrink-0 flex flex-col items-center justify-center w-14 sm:w-16 py-1.5 px-1 rounded-xl bg-slate-100 border border-slate-200/80 text-center">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-800 font-mono">
                          {agenda.time || '09:00'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                          {agenda.date}
                        </span>
                      </div>

                      {/* Main Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-sm sm:text-base font-bold text-slate-900 leading-tight ${isCompleted ? 'line-through text-slate-500' : ''}`}>
                            {agenda.title}
                          </h3>

                          {/* Category Badge */}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                            {agenda.type}
                          </span>

                          {/* Source Badge */}
                          {agenda.source === 'project_task' && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              Deadline Tugas
                            </span>
                          )}
                          {agenda.source === 'ppat_transaction' && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                              PPAT
                            </span>
                          )}

                          {isToday && !isCompleted && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                              Hari Ini
                            </span>
                          )}
                        </div>

                        {/* Client / Project Info */}
                        {agenda.clientOrProject && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{agenda.clientOrProject}</span>
                          </div>
                        )}

                        {/* Notes */}
                        {agenda.notes && (
                          <div className="flex items-start gap-1.5 mt-1 text-xs text-slate-500">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{agenda.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(agenda)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          isCompleted
                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isCompleted ? 'Batal Selesai' : 'Selesai'}</span>
                      </button>

                      {agenda.source === 'manual' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(agenda.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Agenda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Agenda Modal */}
      <AddAgendaModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        projects={projects}
        onAgendaAdded={(item) => {
          setManualAgendas((prev) => [item, ...prev]);
        }}
      />
    </div>
  );
};
