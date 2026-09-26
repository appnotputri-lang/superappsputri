import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  MessageSquare, 
  Phone, 
  Mail, 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Edit3,
  Save,
  X,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { WebinarParticipant, WebinarLeadStatus } from '../../../../types';

const LEAD_STATUS_CONFIG: Record<WebinarLeadStatus, { label: string; bg: string; text: string; border: string }> = {
  baru: { label: 'Baru', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  dihubungi: { label: 'Dihubungi', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  follow_up: { label: 'Follow Up', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  prospek: { label: 'Prospek', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  klien: { label: 'Klien', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  tidak_dilanjutkan: { label: 'Tidak Lanjut', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' }
};

export const WebinarParticipants: React.FC = () => {
  const [participants, setParticipants] = useState<WebinarParticipant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [attendanceFilter, setAttendanceFilter] = useState('all');
  const [companyNeedFilter, setCompanyNeedFilter] = useState('all');

  // Selected Detail Modal
  const [selectedParticipant, setSelectedParticipant] = useState<WebinarParticipant | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  const [modalLeadStatus, setModalLeadStatus] = useState<WebinarLeadStatus>('baru');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchParticipants();
  }, [leadStatusFilter, attendanceFilter, companyNeedFilter]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (leadStatusFilter !== 'all') params.append('leadStatus', leadStatusFilter);
      if (attendanceFilter !== 'all') params.append('attendance', attendanceFilter);
      if (companyNeedFilter !== 'all') params.append('companyNeed', companyNeedFilter);
      params.append('limit', '500');

      const res = await fetch(`/api/webinar/participants?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setParticipants(data.participants || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching webinar participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParticipants();
  };

  const handleQuickStatusChange = async (participantId: string, newStatus: WebinarLeadStatus) => {
    try {
      const res = await fetch(`/api/webinar/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadStatus: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setParticipants(prev =>
          prev.map(p => p.id === participantId ? { ...p, leadStatus: newStatus } : p)
        );
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleOpenDetail = (participant: WebinarParticipant) => {
    setSelectedParticipant(participant);
    setModalNotes(participant.notes || '');
    setModalLeadStatus(participant.leadStatus);
  };

  const handleSaveModal = async () => {
    if (!selectedParticipant) return;
    try {
      setIsSavingNotes(true);
      const res = await fetch(`/api/webinar/participants/${selectedParticipant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: modalNotes,
          leadStatus: modalLeadStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        const updated = data.participant;
        setSelectedParticipant(updated);
        setParticipants(prev =>
          prev.map(p => p.id === updated.id ? updated : p)
        );
      }
    } catch (err) {
      console.error('Error saving participant notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data peserta "${name}"?`)) {
      return;
    }
    try {
      setDeletingId(id);
      const res = await fetch(`/api/webinar/participants/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setParticipants(prev => prev.filter(p => p.id !== id));
        setTotal(prev => Math.max(0, prev - 1));
        if (selectedParticipant?.id === id) {
          setSelectedParticipant(null);
        }
      }
    } catch (err) {
      console.error('Error deleting participant:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    if (participants.length === 0) {
      alert('Tidak ada data peserta untuk diekspor.');
      return;
    }

    const headers = [
      'ID',
      'Nama Lengkap',
      'Nomor WhatsApp',
      'Email',
      'Perusahaan',
      'Jabatan',
      'Kota',
      'Kehadiran',
      'Durasi',
      'Kebutuhan Perusahaan',
      'Topik Diminati',
      'Follow Up',
      'Waktu Kontak',
      'Status Lead',
      'Catatan Internal',
      'Waktu Pendaftaran'
    ];

    const rows = participants.map(p => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.whatsapp || ''}"`,
      `"${(p.email || '').replace(/"/g, '""')}"`,
      `"${(p.company || '').replace(/"/g, '""')}"`,
      `"${(p.position || '').replace(/"/g, '""')}"`,
      `"${(p.city || '').replace(/"/g, '""')}"`,
      `"${p.attendance || ''}"`,
      `"${p.duration || ''}"`,
      `"${(p.companyNeed || '').replace(/"/g, '""')}"`,
      `"${(p.topics || []).join('; ').replace(/"/g, '""')}"`,
      `"${p.followUp || ''}"`,
      `"${p.preferredContactTime || ''}"`,
      `"${p.leadStatus || 'baru'}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
      `"${p.createdAt || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `peserta_webinar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Database Peserta & Leads
            </span>
            <span className="text-xs text-slate-500 font-medium">• Total {total} Peserta</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Daftar Peserta Webinar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola data registrasi, hubungi via WhatsApp, dan pantau proses follow-up prospek.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchParticipants}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, WhatsApp, perusahaan, atau kota..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Filter Status Lead */}
          <div>
            <select
              value={leadStatusFilter}
              onChange={e => setLeadStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
            >
              <option value="all">Semua Status Lead</option>
              <option value="baru">Baru</option>
              <option value="dihubungi">Dihubungi</option>
              <option value="follow_up">Follow Up</option>
              <option value="prospek">Prospek</option>
              <option value="klien">Klien</option>
              <option value="tidak_dilanjutkan">Tidak Lanjut</option>
            </select>
          </div>

          {/* Filter Kehadiran */}
          <div>
            <select
              value={attendanceFilter}
              onChange={e => setAttendanceFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
            >
              <option value="all">Semua Kehadiran</option>
              <option value="Ya, mengikuti">Hadir (Ya, mengikuti)</option>
              <option value="Tidak">Tidak Hadir</option>
            </select>
          </div>

          {/* Filter Kebutuhan */}
          <div>
            <select
              value={companyNeedFilter}
              onChange={e => setCompanyNeedFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
            >
              <option value="all">Semua Kebutuhan</option>
              <option value="Ada kebutuhan dalam waktu dekat">Ada kebutuhan dekat</option>
              <option value="Sedang mencari solusi">Sedang mencari solusi</option>
              <option value="Ingin konsultasi terlebih dahulu">Ingin konsultasi</option>
              <option value="Belum ada kebutuhan">Belum ada kebutuhan</option>
            </select>
          </div>

        </form>
      </div>

      {/* PARTICIPANTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200">
                <th className="py-3 px-4">PESERTA & KONTAK</th>
                <th className="py-3 px-4">PERUSAHAAN / JABATAN</th>
                <th className="py-3 px-4">KEHADIRAN</th>
                <th className="py-3 px-4">KEBUTUHAN & TOPIK</th>
                <th className="py-3 px-4">WAKTU HUBUNGI</th>
                <th className="py-3 px-4">STATUS LEAD</th>
                <th className="py-3 px-4 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat data peserta...</span>
                  </td>
                </tr>
              ) : participants.length > 0 ? (
                participants.map(p => {
                  const statusConf = LEAD_STATUS_CONFIG[p.leadStatus] || LEAD_STATUS_CONFIG.baru;
                  const cleanWa = p.whatsapp.replace(/[^0-9]/g, '');
                  const waNumberFormatted = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
                  const waUrl = `https://wa.me/${waNumberFormatted}?text=${encodeURIComponent(`Halo Bapak/Ibu ${p.name}, kami dari Kantor Notaris & PPAT Putri Parincha ingin menindaklanjuti partisipasi Anda pada Webinar Legalitas Perusahaan.`)}`;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                        <div className="flex flex-col gap-0.5 mt-0.5 text-slate-500">
                          <a 
                            href={waUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-emerald-700 hover:text-emerald-800 font-semibold font-mono flex items-center gap-1 hover:underline"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" /> {p.whatsapp}
                          </a>
                          {p.email && (
                            <span className="text-slate-400 text-[11px] flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {p.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Company & Position */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{p.company || '-'}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.position ? `${p.position}` : ''}{p.city ? ` • ${p.city}` : ''}
                        </div>
                      </td>

                      {/* Attendance */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          p.attendance === 'Ya, mengikuti'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {p.attendance}
                        </span>
                        {p.duration && (
                          <div className="text-[10px] text-slate-500 mt-1 font-medium">{p.duration}</div>
                        )}
                      </td>

                      {/* Needs & Topics */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {p.companyNeed || '-'}
                        </div>
                        {p.topics && p.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.topics.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium truncate max-w-[140px]">
                                {t}
                              </span>
                            ))}
                            {p.topics.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                                +{p.topics.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Preferred Contact Time */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 font-medium">
                          {p.followUp === 'Ya, silakan hubungi saya' ? (
                            <span className="text-emerald-700 font-bold">Bersedia</span>
                          ) : (
                            <span className="text-slate-400">Tidak bersedia</span>
                          )}
                        </div>
                        {p.preferredContactTime && (
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            Waktu: {p.preferredContactTime}
                          </div>
                        )}
                      </td>

                      {/* Lead Status */}
                      <td className="py-3.5 px-4">
                        <select
                          value={p.leadStatus}
                          onChange={e => handleQuickStatusChange(p.id, e.target.value as WebinarLeadStatus)}
                          className={`text-xs font-bold rounded-lg border px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                        >
                          <option value="baru">Baru</option>
                          <option value="dihubungi">Dihubungi</option>
                          <option value="follow_up">Follow Up</option>
                          <option value="prospek">Prospek</option>
                          <option value="klien">Klien</option>
                          <option value="tidak_dilanjutkan">Tidak Lanjut</option>
                        </select>
                        {p.notes && (
                          <div className="text-[10px] text-slate-400 mt-1 italic truncate max-w-[120px]" title={p.notes}>
                            📝 {p.notes}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="WhatsApp Peserta"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleOpenDetail(p)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            title="Lihat Jawaban & Catatan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            disabled={deletingId === p.id}
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Hapus Peserta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs italic">
                    Tidak ditemukan data peserta sesuai filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL & NOTES MODAL */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Detail Registrasi Peserta
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedParticipant.name}</h3>
              </div>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-700">
              
              {/* Kontak & Perusahaan Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</span>
                    <p className="font-bold text-slate-900 font-mono text-sm">{selectedParticipant.whatsapp}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                    <p className="font-medium text-slate-800">{selectedParticipant.email || '-'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Perusahaan & Jabatan</span>
                    <p className="font-bold text-slate-900">
                      {selectedParticipant.company || '-'} 
                      {selectedParticipant.position ? ` (${selectedParticipant.position})` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Kota / Domisili</span>
                    <p className="font-medium text-slate-800">{selectedParticipant.city || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Questionnaire Answers */}
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-900 text-sm">Jawaban Kuesioner Webinar:</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Status Kehadiran</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{selectedParticipant.attendance}</span>
                    {selectedParticipant.duration && (
                      <span className="text-[11px] text-slate-500 block mt-0.5">Durasi: {selectedParticipant.duration}</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Kebutuhan Legalitas PT</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{selectedParticipant.companyNeed || '-'}</span>
                  </div>
                </div>

                {/* Topics */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Topik Yang Diminati</span>
                  {selectedParticipant.topics && selectedParticipant.topics.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedParticipant.topics.map((t, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-semibold text-[11px] border border-amber-200">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">Tidak ada topik spesifik yang dipilih.</p>
                  )}
                </div>

                {/* Follow up preference */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kesediaan Dihubungi</span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-bold text-slate-900">{selectedParticipant.followUp || '-'}</span>
                    {selectedParticipant.preferredContactTime && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        Waktu: {selectedParticipant.preferredContactTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Notes & Status Editor */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Tindak Lanjut & Catatan Internal:</h4>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Status Lead</label>
                  <select
                    value={modalLeadStatus}
                    onChange={e => setModalLeadStatus(e.target.value as WebinarLeadStatus)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="baru">Baru</option>
                    <option value="dihubungi">Dihubungi</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="prospek">Prospek</option>
                    <option value="klien">Klien</option>
                    <option value="tidak_dilanjutkan">Tidak Lanjut</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Catatan Staf / Notaris</label>
                  <textarea
                    rows={3}
                    placeholder="Tulis catatan hasil telepon, konsultasi, atau penawaran akta..."
                    value={modalNotes}
                    onChange={e => setModalNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
                  ></textarea>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 pt-1">
                Waktu Pendaftaran: {new Date(selectedParticipant.createdAt).toLocaleString('id-ID')}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between sticky bottom-0 z-10">
              {(() => {
                const cleanWa = selectedParticipant.whatsapp.replace(/[^0-9]/g, '');
                const waFormatted = cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa;
                const waUrl = `https://wa.me/${waFormatted}?text=${encodeURIComponent(`Halo Bapak/Ibu ${selectedParticipant.name}, kami dari Kantor Notaris & PPAT Putri Parincha ingin menindaklanjuti partisipasi Anda pada Webinar Legalitas Perusahaan.`)}`;
                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat WhatsApp</span>
                  </a>
                );
              })()}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedParticipant(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Tutup
                </button>

                <button
                  disabled={isSavingNotes}
                  onClick={handleSaveModal}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingNotes ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default WebinarParticipants;
