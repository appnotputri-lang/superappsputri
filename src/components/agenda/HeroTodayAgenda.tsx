import React from 'react';
import { Clock, Plus, ArrowRight, Calendar, CheckCircle2 } from 'lucide-react';
import { AgendaItem } from '../../types/agenda';

interface HeroTodayAgendaProps {
  todayAgendas: AgendaItem[];
  onOpenAddModal: () => void;
  onViewAll: () => void;
  className?: string;
}

export const HeroTodayAgenda: React.FC<HeroTodayAgendaProps> = ({
  todayAgendas,
  onOpenAddModal,
  onViewAll,
  className = ''
}) => {
  // Desktop: max 3 items, Mobile: max 2 items
  const displayAgendas = todayAgendas.slice(0, 3);

  const getSourceBadge = (agenda: AgendaItem) => {
    if (agenda.source === 'project_task') return 'Tugas Proyek';
    if (agenda.source === 'ppat_transaction') return 'PPAT';
    if (agenda.source === 'project_deadline') return 'Milestone';
    return agenda.type || 'Agenda';
  };

  return (
    <div className={`w-full text-left select-none ${className}`}>
      {/* Header Row: Title and Actions */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-sky-200 shrink-0" />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/95 font-heading">
            AGENDA HARI INI
          </span>
          {todayAgendas.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-white leading-none">
              {todayAgendas.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 active:scale-95 text-white text-[11px] font-semibold transition-all cursor-pointer border border-white/10 shadow-2xs"
            title="Tambah Agenda Baru"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span className="hidden sm:inline">Tambah Agenda</span>
            <span className="sm:hidden">Tambah</span>
          </button>

          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-0.5 text-[11px] font-semibold text-sky-200 hover:text-white transition-colors cursor-pointer group"
            title="Buka halaman agenda lengkap"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Agenda Content Box */}
      {todayAgendas.length === 0 ? (
        <div className="bg-white/[0.08] backdrop-blur-xs border border-white/15 rounded-xl px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-300/80 shrink-0" />
            <p className="text-xs font-medium text-white/85">
              Belum ada agenda untuk hari ini.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="self-start sm:self-auto text-xs font-semibold text-white bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-white/20 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Agenda</span>
          </button>
        </div>
      ) : (
        <div className="bg-white/[0.09] backdrop-blur-xs border border-white/15 rounded-xl p-1 sm:p-1.5 divide-y divide-white/10 shadow-xs">
          {displayAgendas.map((agenda, index) => {
            // Hide the 3rd item on small mobile screens to respect "Mobile: maksimal 2 agenda"
            const isThirdOnMobile = index === 2;
            return (
              <div
                key={agenda.id || index}
                onClick={onViewAll}
                className={`flex items-start gap-2.5 sm:gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer group ${
                  isThirdOnMobile ? 'hidden sm:flex' : 'flex'
                }`}
              >
                {/* [WAKTU] */}
                <div className="shrink-0 w-11 pt-0.5">
                  <span className="text-xs sm:text-[13px] font-bold tracking-tight text-sky-200 tabular-nums block font-mono group-hover:text-white transition-colors">
                    {agenda.time || '09:00'}
                  </span>
                </div>

                {/* [JUDUL AGENDA] & [Keterangan singkat] & [Status / sumber agenda] */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-[13px] font-bold text-white truncate leading-tight group-hover:text-sky-100 transition-colors">
                      {agenda.title}
                    </h4>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/15 text-sky-100 border border-white/10 leading-none shrink-0">
                      {getSourceBadge(agenda)}
                    </span>
                  </div>

                  {agenda.clientOrProject && (
                    <p className="text-[11px] text-white/80 font-medium truncate mt-0.5 leading-snug">
                      {agenda.clientOrProject}
                    </p>
                  )}

                  {agenda.notes && !agenda.clientOrProject && (
                    <p className="text-[11px] text-white/70 truncate mt-0.5 leading-snug italic">
                      {agenda.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
