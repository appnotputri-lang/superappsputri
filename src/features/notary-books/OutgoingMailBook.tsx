import React, { useState, useEffect, useMemo } from 'react';
import { OutgoingMail } from '../../../types';
import { NotaryService } from '../../services/NotaryService';
import { isRecordLocked, getLockDeadlineMessage } from '../../utils/lockUtils';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Edit2, Trash2, Lock, Send, X, Check } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const getSuggestedMailNumber = (dateStr: string, existingMails: OutgoingMail[]): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return '';
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const romanMonth = ROMAN_MONTHS[monthIdx] || 'I';

  let maxSeq = 0;
  let codeFormat = 'NPP-NOT';

  (existingMails || []).forEach((m) => {
    if (!m.mailNumber) return;
    const str = m.mailNumber.trim();
    const match = str.match(/^(\d+)(?:\/([^\/]+))?/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
      if (match[2] && match[2].length >= 2) {
        codeFormat = match[2];
      }
    }
  });

  const nextSeq = maxSeq + 1;
  return `${nextSeq}/${codeFormat}/${romanMonth}/${year}`;
};

export const OutgoingMailBook: React.FC = () => {
  const { user } = useAuth();
  const [mails, setMails] = useState<OutgoingMail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [mailNumber, setMailNumber] = useState<string>('');
  const [mailDate, setMailDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [attachmentCount, setAttachmentCount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Subscribe to outgoing_mails
  useEffect(() => {
    setLoading(true);
    const unsubscribe = NotaryService.subscribeOutgoingMails((data) => {
      setMails(data || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    mails.forEach((m) => {
      if (m.date && m.date.length >= 4) {
        yearsSet.add(m.date.substring(0, 4));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [mails]);

  // Filtered & Sorted
  const filteredMails = useMemo(() => {
    const list = mails.filter((m) => {
      // Filter Year
      if (selectedYear !== 'ALL') {
        if (!m.date || !m.date.startsWith(selectedYear)) return false;
      }

      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNum = m.mailNumber?.toLowerCase().includes(query);
        const matchRec = m.recipient?.toLowerCase().includes(query);
        const matchSub = m.subject?.toLowerCase().includes(query);
        const matchNotes = m.notes?.toLowerCase().includes(query);

        return matchNum || matchRec || matchSub || matchNotes;
      }

      return true;
    });

    // Sort newest date first
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [mails, selectedYear, searchTerm]);

  const suggestedNumber = useMemo(() => {
    return getSuggestedMailNumber(mailDate, mails);
  }, [mailDate, mails]);

  const handleDateChange = (newDate: string) => {
    setMailDate(newDate);
    if (!editingId) {
      const suggested = getSuggestedMailNumber(newDate, mails);
      setMailNumber(suggested);
    }
  };

  const handleOpenModal = (mail?: OutgoingMail) => {
    if (mail) {
      setEditingId(mail.id);
      setMailNumber(mail.mailNumber || '');
      setMailDate(mail.date || new Date().toISOString().split('T')[0]);
      setRecipient(mail.recipient || '');
      setSubject(mail.subject || '');
      setAttachmentCount(mail.attachmentCount !== undefined ? String(mail.attachmentCount) : '');
      setNotes(mail.notes || '');
    } else {
      setEditingId(null);
      const todayStr = new Date().toISOString().split('T')[0];
      setMailDate(todayStr);
      const suggested = getSuggestedMailNumber(todayStr, mails);
      setMailNumber(suggested);
      setRecipient('');
      setSubject('');
      setAttachmentCount('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailDate || !recipient.trim() || !subject.trim()) {
      alert('Tanggal, Penerima / Kepada, dan Perihal Surat wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const mailData: Omit<OutgoingMail, 'id'> = {
        mailNumber: mailNumber.trim(),
        date: mailDate,
        recipient: recipient.trim(),
        subject: subject.trim(),
        attachmentCount: attachmentCount ? parseInt(attachmentCount, 10) : undefined,
        notes: notes.trim() || undefined
      };

      if (editingId) {
        await NotaryService.updateOutgoingMail(editingId, mailData);
      } else {
        await NotaryService.addOutgoingMail(mailData);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save outgoing mail:', err);
      alert('Gagal menyimpan data surat keluar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (mail: OutgoingMail) => {
    if (isRecordLocked(mail.date, user?.email)) {
      alert(`Record ini terkunci secara otomatis setelah tanggal ${getLockDeadlineMessage(mail.date)}.`);
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus surat keluar No. ${mail.mailNumber || '-'}?`)) {
      try {
        await NotaryService.deleteOutgoingMail(mail.id);
      } catch (err) {
        console.error('Failed to delete outgoing mail:', err);
        alert('Gagal menghapus surat keluar.');
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Send className="text-cyan-600" size={24} />
            Buku Surat Keluar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan korespondensi resmi surat keluar dari kantor Notaris / PPAT.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus size={16} />
          Catat Surat Keluar
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor surat, penerima, perihal..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Tahun:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-medium text-slate-700 bg-white"
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
          Memuat data surat keluar...
        </div>
      ) : filteredMails.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200 italic">
          Tidak ada data surat keluar ditemukan.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px]">
                  <th className="p-3 w-12 text-center border-r border-slate-200">NO</th>
                  <th className="p-3 w-32 text-center border-r border-slate-200">TANGGAL</th>
                  <th className="p-3 w-36 border-r border-slate-200">NOMOR SURAT</th>
                  <th className="p-3 min-w-[200px] border-r border-slate-200">KEPADA / PENERIMA</th>
                  <th className="p-3 min-w-[240px] border-r border-slate-200">PERIHAL</th>
                  <th className="p-3 w-28 text-center border-r border-slate-200">LAMPIRAN</th>
                  <th className="p-3 w-24 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMails.map((mail, idx) => {
                  const locked = isRecordLocked(mail.date, user?.email);
                  const lockMsg = locked ? `Terkunci otomatis setelah ${getLockDeadlineMessage(mail.date)}` : '';

                  return (
                    <tr key={mail.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center border-r border-slate-200 font-medium text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="p-3 text-center border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {formatDateIndo(mail.date)}
                      </td>
                      <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                        {mail.mailNumber || '-'}
                      </td>
                      <td className="p-3 border-r border-slate-200 font-semibold text-slate-900 leading-snug">
                        {mail.recipient}
                      </td>
                      <td className="p-3 border-r border-slate-200 text-slate-800 leading-snug">
                        {mail.subject}
                        {mail.notes && (
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                            Catatan: {mail.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center border-r border-slate-200 text-slate-600">
                        {mail.attachmentCount ? `${mail.attachmentCount} Berkas` : '-'}
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
                              onClick={() => handleOpenModal(mail)}
                              className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded transition"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(mail)}
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
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 my-8 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingId ? 'Edit Surat Keluar' : 'Catat Surat Keluar Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Tanggal Surat <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={mailDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-medium">
                      Nomor Surat Keluar
                    </label>
                    {!editingId && suggestedNumber && (
                      <button
                        type="button"
                        onClick={() => setMailNumber(suggestedNumber)}
                        className="text-[10px] font-semibold text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-2 py-0.5 rounded border border-cyan-200 transition cursor-pointer"
                        title="Klik untuk menggunakan rekomendasi nomor otomatis"
                      >
                        Saran: {suggestedNumber}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={mailNumber}
                    onChange={(e) => setMailNumber(e.target.value)}
                    placeholder="Contoh: 29/NPP-NOT/VIII/2026"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:outline-none font-mono font-medium text-xs"
                  />
                  {!editingId && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      💡 Rekomendasi otomatis (+1 nomor urut terakhir) menyesuaikan bulan/tahun surat.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Kepada / Penerima <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Contoh: Kepala Kantor Pertanahan Kab. Bandung Barat"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Perihal <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Perihal atau ringkasan isi surat..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Jumlah Lampiran (Opsional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={attachmentCount}
                    onChange={(e) => setAttachmentCount(e.target.value)}
                    placeholder="Jumlah berkas/eksemplar"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
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
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:outline-none"
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
                  className="px-4 py-2 text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={16} />
                  {isSaving ? 'Menyimpan...' : 'Simpan Surat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
