import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Holiday } from '../../types/ppat';
import { PpatService } from '../../services/PpatService';

interface HolidayManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  onUpdate: () => void;
}

export const HolidayManagerModal: React.FC<HolidayManagerModalProps> = ({
  isOpen,
  onClose,
  year,
  onUpdate
}) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // New holiday form
  const [newDate, setNewDate] = useState(`${year}-01-01`);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'NATIONAL' | 'COLLECTIVE_LEAVE' | 'OFFICE_HOLIDAY'>('OFFICE_HOLIDAY');

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await PpatService.getHolidaysByYear(year);
      setHolidays(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHolidays();
      setNewDate(`${year}-01-01`);
    }
  }, [isOpen, year]);

  if (!isOpen) return null;

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newName.trim()) {
      alert('Tanggal dan Nama Hari Libur harus diisi');
      return;
    }

    try {
      await PpatService.createHoliday({
        date: newDate,
        name: newName.trim(),
        type: newType,
        year: parseInt(newDate.split('-')[0], 10),
        source: 'MANUAL',
        isActive: true
      });
      setNewName('');
      await loadHolidays();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan hari libur');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Hapus hari libur "${name}"?`)) {
      try {
        await PpatService.deleteHoliday(id);
        await loadHolidays();
        onUpdate();
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus hari libur');
      }
    }
  };

  const handleSyncOfficial = async () => {
    if (window.confirm(`Sinkronkan dan muat daftar hari libur resmi nasional untuk tahun ${year}?`)) {
      try {
        setSyncing(true);
        await PpatService.seedHolidays(year);
        await loadHolidays();
        onUpdate();
        alert(`Berhasil menyinkronkan hari libur nasional tahun ${year}`);
      } catch (err: any) {
        alert(err.message || 'Gagal sinkronisasi hari libur');
      } finally {
        setSyncing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Kelola Hari Libur ({year})
              </h2>
              <p className="text-xs text-slate-500">
                Daftar hari libur nasional, cuti bersama, dan hari libur kantor untuk laporan PPAT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Banner */}
        <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
          <div className="text-xs text-indigo-900">
            Libur resmi mencakup hari Minggu dan libur nasional (hari Sabtu tetap hari kerja). Ditandai abu-abu & tertulis di kolom KETERANGAN.
          </div>
          <button
            onClick={handleSyncOfficial}
            disabled={syncing}
            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Menyinkronkan...' : 'Muat Libur Nasional'}
          </button>
        </div>

        {/* Add Form */}
        <form onSubmit={handleAddHoliday} className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tanggal</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex-[2] min-w-[180px]">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nama Hari Libur / Acara</label>
            <input
              type="text"
              required
              placeholder="Contoh: Libur Cuti Kantor Akhir Tahun"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kategori</label>
            <select
              value={newType}
              onChange={(e: any) => setNewType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="NATIONAL">Nasional</option>
              <option value="COLLECTIVE_LEAVE">Cuti Bersama</option>
              <option value="OFFICE_HOLIDAY">Libur Kantor</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </form>

        {/* Holidays List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Memuat data hari libur...</div>
          ) : holidays.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada data hari libur untuk tahun {year}. Klik tombol &quot;Muat Libur Nasional&quot; di atas.
            </div>
          ) : (
            holidays.map((h) => (
              <div key={h.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {h.date}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800">{h.name}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-200/80 text-slate-600">
                      {h.type === 'NATIONAL' ? 'Nasional' : h.type === 'COLLECTIVE_LEAVE' ? 'Cuti Bersama' : 'Libur Kantor'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(h.id, h.name)}
                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Hapus Libur"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
