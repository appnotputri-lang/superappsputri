import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageLayout';
import { PrivateDeed } from '../../../types';
import { NotaryService } from '../../services/NotaryService';
import { isRecordLocked, getLockDeadlineMessage } from '../../utils/lockUtils';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Edit2, Trash2, Lock, ShieldCheck, X, Check } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const PrivateDeedBook: React.FC = () => {
  const { user } = useAuth();
  const [privateDeeds, setPrivateDeeds] = useState<PrivateDeed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [number, setNumber] = useState<string>('');
  const [registrationDate, setRegistrationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<string>('Legalisasi');
  const [description, setDescription] = useState<string>('');
  const [parties, setParties] = useState<string[]>(['']);
  const [picName, setPicName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Subscribe to private_deeds
  useEffect(() => {
    setLoading(true);
    const unsubscribe = NotaryService.subscribePrivateDeeds((data) => {
      setPrivateDeeds(data || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    privateDeeds.forEach((d) => {
      if (d.registrationDate && d.registrationDate.length >= 4) {
        yearsSet.add(d.registrationDate.substring(0, 4));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [privateDeeds]);

  // Filtered
  const filteredDeeds = useMemo(() => {
    return privateDeeds.filter((deed) => {
      // Filter Year
      if (selectedYear !== 'ALL') {
        if (!deed.registrationDate || !deed.registrationDate.startsWith(selectedYear)) return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNumber = deed.number?.toLowerCase().includes(query);
        const matchType = deed.type?.toLowerCase().includes(query);
        const matchDesc = deed.description?.toLowerCase().includes(query);
        const matchNotes = deed.notes?.toLowerCase().includes(query);
        const matchParties = deed.parties?.some((p) => p?.toLowerCase().includes(query));

        return matchNumber || matchType || matchDesc || matchNotes || matchParties;
      }

      return true;
    });
  }, [privateDeeds, selectedYear, searchTerm]);

  // Grouped by Month
  const groupedDeeds = useMemo(() => {
    const groups: { [key: string]: { year: number; month: number; monthName: string; deeds: PrivateDeed[] } } = {};

    filteredDeeds.forEach((deed) => {
      if (!deed.registrationDate) return;
      const parts = deed.registrationDate.split('-');
      if (parts.length < 2) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const groupKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          year,
          month,
          monthName: MONTH_NAMES[month - 1] || `Bulan ${month}`,
          deeds: []
        };
      }
      groups[groupKey].deeds.push(deed);
    });

    const sortedKeys = Object.keys(groups).sort().reverse();

    return sortedKeys.map((key) => {
      const grp = groups[key];
      grp.deeds.sort((a, b) => {
        if (a.registrationDate !== b.registrationDate) return b.registrationDate.localeCompare(a.registrationDate);
        return (parseInt(b.number, 10) || 0) - (parseInt(a.number, 10) || 0);
      });
      return grp;
    });
  }, [filteredDeeds]);

  const handleOpenModal = (deed?: PrivateDeed) => {
    if (deed) {
      setEditingId(deed.id);
      setNumber(deed.number || '');
      setRegistrationDate(deed.registrationDate || new Date().toISOString().split('T')[0]);
      setType(deed.type || 'Legalisasi');
      setDescription(deed.description || '');
      setParties(deed.parties && deed.parties.length > 0 ? deed.parties : ['']);
      setPicName(deed.picName || '');
      setNotes(deed.notes || '');
    } else {
      setEditingId(null);
      setNumber('');
      setRegistrationDate(new Date().toISOString().split('T')[0]);
      setType('Legalisasi');
      setDescription('');
      setParties(['']);
      setPicName('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationDate || !description.trim()) {
      alert('Tanggal Pembukuan dan Isi Singkat Surat wajib diisi!');
      return;
    }

    const cleanParties = parties.map((p) => p.trim()).filter((p) => p !== '');

    setIsSaving(true);
    try {
      const deedData: Omit<PrivateDeed, 'id'> = {
        number: number.trim(),
        registrationDate,
        type: type as any,
        description: description.trim(),
        parties: cleanParties,
        picName: picName.trim() || undefined,
        notes: notes.trim() || undefined
      };

      if (editingId) {
        await NotaryService.updatePrivateDeed(editingId, deedData);
      } else {
        await NotaryService.addPrivateDeed(deedData);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save private deed:', err);
      alert('Gagal menyimpan data legalisasi/waarmerking.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (deed: PrivateDeed) => {
    if (isRecordLocked(deed.registrationDate, user?.email)) {
      alert(`Record ini terkunci secara otomatis setelah tanggal ${getLockDeadlineMessage(deed.registrationDate)}.`);
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus pencatatan ${deed.type} No. ${deed.number}?`)) {
      try {
        await NotaryService.deletePrivateDeed(deed.id);
      } catch (err) {
        console.error('Failed to delete private deed:', err);
        alert('Gagal menghapus data.');
      }
    }
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      const d = parts[2];
      return `${d} ${MONTH_NAMES[m] || ''} ${y}`;
    }
    return dateStr;
  };

  const getTypeBadge = (typeStr: string) => {
    const t = typeStr?.toUpperCase() || '';
    if (t.includes('LEGALISASI')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          LEGALISASI
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        WAARMERKING
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Buku Legalisasi & Waarmerking"
        description="Pencatatan surat di bawah tangan yang dilegalisasi atau didaftarkan (waarmerking)."
        actions={
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus size={16} />
            Catat Legalisasi / Waarmerking
          </button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor, perihal, nama pihak..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Tahun:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 bg-white"
          >
            <option value="ALL">Semua Tahun</option>
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200">
          Memuat data legalisasi & waarmerking...
        </div>
      ) : groupedDeeds.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200 italic">
          Tidak ada data legalisasi / waarmerking ditemukan.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedDeeds.map((group) => (
            <div key={`${group.year}-${group.month}`} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Group Header */}
              <div className="bg-indigo-900 text-white px-5 py-3 flex items-center justify-between">
                <span className="font-bold text-sm tracking-wide uppercase">
                  {group.monthName} {group.year}
                </span>
                <span className="text-xs bg-indigo-800/80 px-2.5 py-1 rounded-full text-indigo-100 font-medium">
                  {group.deeds.length} Surat
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-[1000px] w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px]">
                      <th className="p-3 w-16 text-center border-r border-slate-200">NO. URUT</th>
                      <th className="p-3 w-28 text-center border-r border-slate-200">NO. REGISTRASI</th>
                      <th className="p-3 w-32 text-center border-r border-slate-200">TANGGAL</th>
                      <th className="p-3 w-28 text-center border-r border-slate-200">JENIS</th>
                      <th className="p-3 min-w-[220px] border-r border-slate-200">ISI SINGKAT / PERIHAL</th>
                      <th className="p-3 min-w-[200px] border-r border-slate-200">YANG MENANDATANGANI</th>
                      <th className="p-3 w-24 text-center">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {group.deeds.map((deed, idx) => {
                      const locked = isRecordLocked(deed.registrationDate, user?.email);
                      const lockMsg = locked ? `Terkunci otomatis setelah ${getLockDeadlineMessage(deed.registrationDate)}` : '';

                      return (
                        <tr key={deed.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center border-r border-slate-200 font-medium text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="p-3 text-center border-r border-slate-200 font-bold text-slate-900">
                            {deed.number || '-'}
                          </td>
                          <td className="p-3 text-center border-r border-slate-200 text-slate-600 whitespace-nowrap">
                            {formatDateIndo(deed.registrationDate)}
                          </td>
                          <td className="p-3 text-center border-r border-slate-200">
                            {getTypeBadge(deed.type)}
                          </td>
                          <td className="p-3 border-r border-slate-200 font-medium text-slate-900 leading-snug">
                            {deed.description}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-slate-800 leading-snug">
                            {deed.parties && deed.parties.length > 0 ? (
                              <div className="space-y-0.5">
                                {deed.parties.map((party, i) => (
                                  <div key={i} className="text-slate-900 font-medium">
                                    • {party}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {locked ? (
                              <div className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-1 rounded text-[11px]" title={lockMsg}>
                                <Lock size={12} className="text-amber-600" />
                                <span>Terkunci</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenModal(deed)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(deed)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                                  title="Hapus"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-xl border border-slate-200 my-8 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingId ? 'Edit Legalisasi / Waarmerking' : 'Pencatatan Legalisasi / Waarmerking Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Jenis Pencatatan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-semibold text-slate-800"
                  >
                    <option value="Legalisasi">Legalisasi</option>
                    <option value="Waarmerking">Waarmerking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    No. Registrasi / Pendaftaran
                  </label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="Contoh: 12/L/2026"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Tanggal Pembukuan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Isi Singkat Surat / Perihal <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ringkasan isi dokumen atau perihal perjanjian di bawah tangan..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              {/* Dynamic Parties */}
              <div className="border border-slate-200 p-3 rounded-lg bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold">
                    Yang Menandatangani / Para Pihak
                  </label>
                  <button
                    type="button"
                    onClick={() => setParties([...parties, ''])}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <Plus size={14} /> Tambah Nama Pihak
                  </button>
                </div>

                {parties.map((partyName, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Nama Pihak #${index + 1}`}
                      value={partyName}
                      onChange={(e) => {
                        const updated = [...parties];
                        updated[index] = e.target.value;
                        setParties(updated);
                      }}
                      className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none text-xs"
                    />
                    {parties.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setParties(parties.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Nama PIC / Petugas (Opsional)
                  </label>
                  <input
                    type="text"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    placeholder="Nama staf pengolah"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Keterangan tambahan"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={16} />
                  {isSaving ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
