import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  ExternalLink, 
  Copy, 
  Check, 
  QrCode, 
  ToggleLeft, 
  ToggleRight, 
  Download, 
  Sparkles, 
  Calendar, 
  User, 
  FileText, 
  RefreshCw,
  Share2,
  ShieldAlert
} from 'lucide-react';
import { WebinarSettings } from '../../../../types';

export const WebinarSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<WebinarSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [description, setDescription] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/webinar/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s: WebinarSettings = data.settings;
        setSettings(s);
        setTitle(s.title || '');
        setSubtitle(s.subtitle || '');
        setEventTitle(s.eventTitle || '');
        setSpeaker(s.speaker || '');
        setDateTime(s.dateTime || '');
        setDescription(s.description || '');
        setMaterialUrl(s.materialUrl || '');
        setIsActive(Boolean(s.isActive));
      }
    } catch (err) {
      console.error('Error fetching webinar settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      setSaving(true);
      const payload: Partial<WebinarSettings> = {
        id: settings?.id || 'default',
        slug: settings?.slug || 'default',
        title: title.trim(),
        subtitle: subtitle.trim(),
        eventTitle: eventTitle.trim(),
        speaker: speaker.trim(),
        dateTime: dateTime.trim(),
        description: description.trim(),
        materialUrl: materialUrl.trim(),
        isActive
      };

      const res = await fetch('/api/webinar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan pengaturan.');
      }

      setSettings(data.settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/webinar`
    : 'https://app.notarisputri.web.id/webinar';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}&bgcolor=ffffff&color=0f172a&margin=2`;

  if (loading && !settings) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-500 font-medium text-sm">Memuat pengaturan webinar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* HEADER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Konfigurasi Webinar
            </span>
            <span className="text-xs text-slate-500 font-medium">• Pengaturan Form & Akses</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan Webinar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Atur informasi acara, status pembukaan formulir, dan tautan materi download untuk peserta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/webinar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Lihat Form Publik</span>
          </a>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2 font-medium">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan webinar berhasil disimpan ke database Cloudflare D1.</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs sm:text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SETTINGS FORM */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-xs">
          <form onSubmit={handleSave} className="space-y-5">
            
            {/* STATUS PENDAFTARAN SWITCH */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Status Formulir Pendaftaran</span>
                <span className="text-[11px] text-slate-500">
                  {isActive 
                    ? 'Formulir saat ini TERBUKA dan dapat diisi oleh peserta.' 
                    : 'Formulir saat ini DITUTUP (peserta akan melihat pesan pendaftaran selesai).'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                {isActive ? (
                  <>
                    <ToggleRight className="w-4 h-4" />
                    <span>Pendaftaran Buka</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4" />
                    <span>Pendaftaran Tutup</span>
                  </>
                )}
              </button>
            </div>

            {/* EVENT TITLE & SPEAKER */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                Informasi Acara Webinar
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Acara Webinar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tata Kelola Perusahaan, RUPS & Kepatuhan Hukum Notaris"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Pembicara / Notaris
                  </label>
                  <input
                    type="text"
                    placeholder="Nukantini Putri Parincha, SH. M.Kn"
                    value={speaker}
                    onChange={e => setSpeaker(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hari, Tanggal & Waktu Acara
                  </label>
                  <input
                    type="text"
                    placeholder="Kamis, 24 Oktober 2025 | 13.30 - 15.30 WIB"
                    value={dateTime}
                    onChange={e => setDateTime(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Ringkasan Materi
                </label>
                <textarea
                  rows={2}
                  placeholder="Webinar edukasi hukum mengenai tata kelola perseroan..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>
            </div>

            {/* FORM HEADINGS & MATERIAL URL */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                Pengaturan Teks Formulir & Unduhan
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Judul Utama Formulir
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subjudul / Petunjuk Pengisian
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tautan Download Materi Webinar (Google Drive / PDF URL)
                </label>
                <div className="relative">
                  <Download className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={materialUrl}
                    onChange={e => setMaterialUrl(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tombol "Download Materi Webinar" pada halaman konfirmasi peserta akan mengarahkan ke tautan ini.
                </p>
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* PUBLIC LINK & QR CODE CARD */}
        <div className="space-y-6">
          
          {/* Link Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Share2 className="w-4 h-4 text-amber-600" />
              <span>Tautan Form Publik</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Bagikan tautan ini kepada peserta saat webinar berlangsung melalui Chat Zoom, Google Meet, atau slide presentasi.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Public URL</span>
              <p className="text-xs font-mono font-bold text-blue-700 break-all select-all">
                {publicUrl}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
              </button>

              <a
                href="/webinar"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 px-3 rounded-xl text-xs font-bold transition-all text-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Form</span>
              </a>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-slate-900 font-bold text-sm">
              <QrCode className="w-4 h-4 text-slate-700" />
              <span>QR Code Slide Webinar</span>
            </div>

            <p className="text-xs text-slate-500">
              Scan dengan kamera HP untuk langsung membuka form pendaftaran & absensi.
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <img 
                src={qrCodeUrl} 
                alt="QR Code Form Webinar" 
                className="w-44 h-44 mx-auto rounded-lg"
              />
            </div>

            <div>
              <a
                href={qrCodeUrl}
                download="qr_webinar_notaris_putri.png"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Gambar QR Code</span>
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default WebinarSettingsView;
