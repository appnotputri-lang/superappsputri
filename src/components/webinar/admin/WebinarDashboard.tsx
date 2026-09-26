import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Target, 
  PhoneCall, 
  Award, 
  TrendingUp, 
  Calendar, 
  Clock, 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  MessageSquare, 
  ChevronRight, 
  Building2, 
  Sparkles,
  Search,
  CheckCircle,
  HelpCircle,
  Briefcase,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { WebinarStats, WebinarParticipant, WebinarLeadStatus } from '../../../../types';

interface WebinarDashboardProps {
  onNavigateTab?: (tabId: string) => void;
}

const LEAD_STATUS_CONFIG: Record<WebinarLeadStatus, { label: string; bg: string; text: string; border: string }> = {
  baru: { label: 'Baru', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  dihubungi: { label: 'Dihubungi', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  follow_up: { label: 'Follow Up', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  prospek: { label: 'Prospek', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  klien: { label: 'Klien', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  tidak_dilanjutkan: { label: 'Tidak Lanjut', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' }
};

export const WebinarDashboard: React.FC<WebinarDashboardProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<WebinarStats | null>(null);
  const [recentParticipants, setRecentParticipants] = useState<WebinarParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/webinar/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentParticipants(data.recentParticipants || []);
      }
    } catch (err) {
      console.error('Error fetching webinar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (participantId: string, newStatus: WebinarLeadStatus) => {
    try {
      setUpdatingId(participantId);
      const res = await fetch(`/api/webinar/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadStatus: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setRecentParticipants(prev => 
          prev.map(p => p.id === participantId ? { ...p, leadStatus: newStatus } : p)
        );
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-500 font-medium text-sm">Memuat dashboard webinar...</p>
      </div>
    );
  }

  const totalPeserta = stats?.total || 0;
  const hadir = stats?.hadir || 0;
  const tidakHadir = stats?.tidakHadir || 0;
  const leads = stats?.leads || 0;
  const dihubungi = stats?.dihubungi || 0;
  const prospek = stats?.prospek || 0;
  const klien = stats?.klien || 0;

  const attendanceRate = totalPeserta > 0 ? Math.round((hadir / totalPeserta) * 100) : 0;
  const conversionRate = totalPeserta > 0 ? Math.round((prospek + klien) / totalPeserta * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Webinar & Lead Management
            </span>
            <span className="text-xs text-slate-400">• Cloudflare D1 Backend</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard Webinar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Analisis absensi kehadiran, survei kebutuhan legalitas, dan konversi calon klien Notaris Putri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigateTab?.('webinar_participants')}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Kelola Peserta</span>
          </button>

          <a
            href="/webinar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Form Publik</span>
          </a>
        </div>
      </div>

      {/* STATS METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
        
        {/* Total Peserta */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Peserta</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{totalPeserta}</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Terdaftar di Form</p>
        </div>

        {/* Hadir */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-xs bg-gradient-to-b from-white to-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold">Peserta Hadir</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">{hadir}</div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">{attendanceRate}% Kehadiran</p>
        </div>

        {/* Tidak Hadir */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Tidak Hadir</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700 tracking-tight">{tidakHadir}</div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Absen</p>
        </div>

        {/* Calon Klien (Lead Baru) */}
        <div className="bg-white rounded-2xl border border-blue-200/80 p-4 shadow-xs bg-gradient-to-b from-white to-blue-50/20">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-semibold">Lead Baru</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 tracking-tight">{leads}</div>
          <p className="text-[11px] text-blue-600 mt-1 font-medium">Belum Dihubungi</p>
        </div>

        {/* Sudah Dihubungi */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-xs bg-gradient-to-b from-white to-amber-50/20">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold">Dihubungi</span>
            <PhoneCall className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">{dihubungi}</div>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">Follow-Up Aktif</p>
        </div>

        {/* Prospek */}
        <div className="bg-white rounded-2xl border border-purple-200/80 p-4 shadow-xs bg-gradient-to-b from-white to-purple-50/20">
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-xs font-semibold">Prospek</span>
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 tracking-tight">{prospek}</div>
          <p className="text-[11px] text-purple-600 mt-1 font-medium">Minat Tinggi</p>
        </div>

        {/* Menjadi Klien */}
        <div className="bg-white rounded-2xl border border-teal-200/80 p-4 shadow-xs bg-gradient-to-b from-white to-teal-50/20">
          <div className="flex items-center justify-between text-teal-700 mb-2">
            <span className="text-xs font-semibold">Klien</span>
            <Award className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-700 tracking-tight">{klien}</div>
          <p className="text-[11px] text-teal-600 mt-1 font-medium">{conversionRate}% Konversi</p>
        </div>

      </div>

      {/* BREAKDOWN SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Kebutuhan Legalitas Perusahaan */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Kebutuhan Legalitas Perusahaan</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Survei Peserta</span>
          </div>

          <div className="space-y-3">
            {[
              { key: 'Ada kebutuhan dalam waktu dekat', label: 'Ada kebutuhan dalam waktu dekat', color: 'bg-emerald-500' },
              { key: 'Sedang mencari solusi', label: 'Sedang mencari solusi', color: 'bg-blue-500' },
              { key: 'Ingin konsultasi terlebih dahulu', label: 'Ingin konsultasi terlebih dahulu', color: 'bg-purple-500' },
              { key: 'Belum ada kebutuhan', label: 'Belum ada kebutuhan', color: 'bg-slate-400' }
            ].map(item => {
              const count = stats?.byNeed[item.key] || 0;
              const pct = totalPeserta > 0 ? Math.round((count / totalPeserta) * 100) : 0;
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="text-slate-900 font-bold">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Topik Yang Paling Diminati */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Topik Yang Diminati Peserta</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Multi-Select</span>
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {stats?.byTopic && Object.keys(stats.byTopic).length > 0 ? (
              Object.entries(stats.byTopic)
                .sort((a, b) => b[1] - a[1])
                .map(([topic, count]) => {
                  const pct = totalPeserta > 0 ? Math.round((count / totalPeserta) * 100) : 0;
                  return (
                    <div key={topic} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-semibold text-slate-800 line-clamp-1">{topic}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                          {count} peserta
                        </span>
                        <span className="text-slate-400 font-medium">{pct}%</span>
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center">Belum ada data topik yang dipilih.</p>
            )}
          </div>
        </div>

      </div>

      {/* RECENT PARTICIPANTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Pendaftaran & Absensi Terbaru</h3>
            <p className="text-xs text-slate-500">10 peserta terakhir yang mengisi formulir.</p>
          </div>
          
          <button
            onClick={() => onNavigateTab?.('webinar_participants')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            <span>Lihat Semua Peserta</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                <th className="py-3 px-4">NAMA & KONTAK</th>
                <th className="py-3 px-4">PERUSAHAAN / KOTA</th>
                <th className="py-3 px-4">KEHADIRAN</th>
                <th className="py-3 px-4">KEBUTUHAN</th>
                <th className="py-3 px-4">STATUS LEAD</th>
                <th className="py-3 px-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentParticipants.length > 0 ? (
                recentParticipants.map(participant => {
                  const statusConf = LEAD_STATUS_CONFIG[participant.leadStatus] || LEAD_STATUS_CONFIG.baru;
                  const cleanWa = participant.whatsapp.replace(/[^0-9]/g, '');
                  const waUrl = `https://wa.me/${cleanWa.startsWith('0') ? '62' + cleanWa.slice(1) : cleanWa}?text=${encodeURIComponent(`Halo Bapak/Ibu ${participant.name}, terima kasih telah mengikuti Webinar Notaris Putri. Kami dari tim legal ingin menanyakan terkait kebutuhan legalitas perusahaan Anda.`)}`;

                  return (
                    <tr key={participant.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{participant.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{participant.whatsapp}</span>
                          {participant.email && <span>• {participant.email}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{participant.company || '-'}</div>
                        <div className="text-[11px] text-slate-500">
                          {participant.position ? `${participant.position}, ` : ''}{participant.city || '-'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          participant.attendance === 'Ya, mengikuti' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {participant.attendance}
                        </span>
                        {participant.duration && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{participant.duration}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="text-slate-700 font-medium truncate">{participant.companyNeed || '-'}</div>
                        {participant.topics && participant.topics.length > 0 && (
                          <div className="text-[10px] text-amber-700 mt-0.5 truncate">
                            {participant.topics.slice(0, 2).join(', ')}{participant.topics.length > 2 ? ` +${participant.topics.length - 2}` : ''}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={participant.leadStatus}
                          disabled={updatingId === participant.id}
                          onChange={e => handleUpdateStatus(participant.id, e.target.value as WebinarLeadStatus)}
                          className={`text-xs font-bold rounded-lg border px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                        >
                          <option value="baru">Baru</option>
                          <option value="dihubungi">Dihubungi</option>
                          <option value="follow_up">Follow Up</option>
                          <option value="prospek">Prospek</option>
                          <option value="klien">Klien</option>
                          <option value="tidak_dilanjutkan">Tidak Lanjut</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-xs"
                          title="Hubungi via WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat WA</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs italic">
                    Belum ada data pendaftaran webinar yang masuk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default WebinarDashboard;
