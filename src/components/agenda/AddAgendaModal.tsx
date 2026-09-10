import React, { useState } from 'react';
import { X, Calendar, Clock, Tag, User, FileText, CheckCircle2 } from 'lucide-react';
import { AgendaItem, AgendaType, AgendaStatus } from '../../types/agenda';
import { AgendaService } from '../../services/AgendaService';
import { Project } from '../../domain/project/Project';

interface AddAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgendaAdded?: (newItem: AgendaItem) => void;
  projects?: Project[];
}

const AGENDA_TYPES: AgendaType[] = [
  'Penandatanganan',
  'Meeting',
  'Deadline',
  'Follow Up',
  'Pemeriksaan',
  'RUPS',
  'Lainnya'
];

export const AddAgendaModal: React.FC<AddAgendaModalProps> = ({
  isOpen,
  onClose,
  onAgendaAdded,
  projects = []
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(AgendaService.getTodayDateString());
  const [time, setTime] = useState('09:00');
  const [type, setType] = useState<AgendaType>('Penandatanganan');
  const [clientOrProject, setClientOrProject] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AgendaStatus>('scheduled');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Judul agenda wajib diisi');
      return;
    }
    if (!date) {
      setError('Tanggal wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newItem = await AgendaService.createAgenda({
        title: title.trim(),
        date,
        time: time || '09:00',
        type,
        clientOrProject: clientOrProject.trim(),
        notes: notes.trim(),
        status,
        source: 'manual'
      });

      if (onAgendaAdded) {
        onAgendaAdded(newItem);
      }

      // Reset form
      setTitle('');
      setDate(AgendaService.getTodayDateString());
      setTime('09:00');
      setType('Penandatanganan');
      setClientOrProject('');
      setNotes('');
      setStatus('scheduled');
      onClose();
    } catch (err: any) {
      console.error('Failed to create agenda:', err);
      setError('Gagal menyimpan agenda. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                Tambah Agenda
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jadwalkan kegiatan operasional kantor notaris & PPAT
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          {/* Judul Agenda */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Judul Agenda <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Penandatanganan Akta Jual Beli"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Tanggal & Waktu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Tanggal <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Waktu (Jam)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Jenis Agenda & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Jenis Agenda
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AgendaType)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {AGENDA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AgendaStatus)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="scheduled">Terjadwal</option>
                <option value="in_progress">Sedang Berlangsung</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
          </div>

          {/* Klien / Proyek terkait */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Klien / Proyek Terkait
            </label>
            <input
              type="text"
              list="project-suggestions"
              value={clientOrProject}
              onChange={(e) => setClientOrProject(e.target.value)}
              placeholder="Contoh: PT Maju Bersama / Ibu Susi"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
            {projects && projects.length > 0 && (
              <datalist id="project-suggestions">
                {projects.slice(0, 20).map((p) => (
                  <option key={p.projectId} value={p.clientSnapshot?.companyName || p.title} />
                ))}
              </datalist>
            )}
          </div>

          {/* Catatan Tambahan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Catatan Singkat (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informasi tempat, dokumen yang harus disiapkan, dsb."
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-slate-400"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Agenda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
