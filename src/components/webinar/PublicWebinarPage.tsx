import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Send, 
  User, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  AlertCircle, 
  ShieldCheck, 
  RotateCcw,
  Check,
  Clock,
  Calendar,
  Video,
  FileText,
  ChevronDown
} from 'lucide-react';
import { WebinarPublicInfo } from '../../../types';

export const PublicWebinarPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [materialUrl, setMaterialUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [info, setInfo] = useState<WebinarPublicInfo | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [city, setCity] = useState('');

  const [attendance, setAttendance] = useState<'Ya, mengikuti' | 'Tidak'>('Ya, mengikuti');
  const [duration, setDuration] = useState<string>('Sampai selesai');

  const [companyNeed, setCompanyNeed] = useState<string>('Belum ada kebutuhan');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['RUPST / RUPSLB', 'Perubahan Direksi / Komisaris']);
  const [otherTopicText, setOtherTopicText] = useState('');

  const [followUp, setFollowUp] = useState<'Ya, silakan hubungi saya' | 'Tidak untuk saat ini'>('Ya, silakan hubungi saya');
  const [preferredContactTime, setPreferredContactTime] = useState<string>('Siang');

  // Honeypot fields for anti-spam (invisible to normal users)
  const [honeypotWebsite, setHoneypotWebsite] = useState('');
  const [honeypotFax, setHoneypotFax] = useState('');

  useEffect(() => {
    fetchWebinarInfo();
  }, []);

  const fetchWebinarInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/public/webinar/info');
      const data = await res.json();
      if (data.success && data.settings) {
        setInfo(data.settings);
        if (data.materialUrl) {
          setMaterialUrl(data.materialUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching webinar info:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic client validation
    if (!name.trim()) {
      setErrorMessage('Silakan isi Nama Lengkap Anda.');
      return;
    }
    const cleanWa = whatsapp.replace(/[^0-9]/g, '');
    if (!cleanWa || cleanWa.length < 8) {
      setErrorMessage('Silakan isi Nomor WhatsApp yang valid (minimal 8 digit).');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Format email tidak valid.');
      return;
    }

    const finalTopics = [...selectedTopics];
    if (selectedTopics.includes('Lainnya') && otherTopicText.trim()) {
      const idx = finalTopics.indexOf('Lainnya');
      finalTopics[idx] = `Lainnya: ${otherTopicText.trim()}`;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        whatsapp: cleanWa,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        position: position.trim() || undefined,
        city: city.trim() || undefined,
        attendance,
        duration: attendance === 'Ya, mengikuti' ? duration : undefined,
        companyNeed,
        topics: finalTopics,
        followUp,
        preferredContactTime: followUp === 'Ya, silakan hubungi saya' ? preferredContactTime : undefined,
        // Anti-spam honeypot
        website: honeypotWebsite,
        fax: honeypotFax
      };

      const res = await fetch('/api/public/webinar/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim pendaftaran.');
      }

      setIsSuccess(true);
      if (data.materialUrl) {
        setMaterialUrl(data.materialUrl);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses pendaftaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIsSuccess(false);
    setName('');
    setWhatsapp('');
    setEmail('');
    setCompany('');
    setPosition('');
    setCity('');
    setAttendance('Ya, mengikuti');
    setDuration('Sampai selesai');
    setCompanyNeed('Belum ada kebutuhan');
    setSelectedTopics(['RUPST / RUPSLB']);
    setOtherTopicText('');
    setFollowUp('Ya, silakan hubungi saya');
    setPreferredContactTime('Siang');
    setErrorMessage(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-slate-300 border-t-[#0a2342] rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium text-xs sm:text-sm">Memuat formulir webinar...</p>
      </div>
    );
  }

  // If closed
  if (info && !info.isActive && !isSuccess) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2 font-serif">Pendaftaran Ditutup</h1>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Terima kasih atas antusiasme Anda. Pendaftaran dan absensi untuk webinar saat ini telah ditutup.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500">
            Untuk informasi layanan dan konsultasi hukum, hubungi kantor Notaris & PPAT Putri.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-slate-800 font-sans antialiased flex flex-col justify-between">
      
      {/* TOP HEADER (64px - 72px) */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 md:px-10 h-16 sm:h-18 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-[#0a2342] to-[#123966] text-[#e0b96b] font-serif font-black text-base sm:text-lg flex items-center justify-center shadow-xs border border-amber-500/20">
              NP
            </div>
            <div>
              <span className="font-serif font-black tracking-wider text-slate-900 text-xs sm:text-sm uppercase block leading-none">
                NOTARIS PUTRI
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-wide block leading-tight mt-0.5">
                Notaris & PPAT
              </span>
            </div>
          </div>

          {/* Right Header Navigation Indicator */}
          <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-1 px-1">
            <Video className="w-4 h-4 text-slate-900" />
            <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide">Webinar</span>
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER (DESKTOP 2-COLUMN LAYOUT: 35% / 65%) */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-10">
        
        {isSuccess ? (
          /* SUCCESS VIEW */
          <div className="max-w-2xl mx-auto bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl p-6 sm:p-10 md:p-12 shadow-sm text-center animate-fade-in my-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 md:mb-5 shadow-2xs">
              <CheckCircle2 className="w-9 h-9 md:w-11 md:h-11" />
            </div>
            
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-slate-900 mb-1">
              Terima Kasih!
            </h2>
            <p className="text-emerald-700 font-semibold text-sm sm:text-base md:text-lg mb-3">
              Kehadiran Anda telah tercatat.
            </p>
            <p className="text-slate-600 text-xs sm:text-sm md:text-base max-w-md md:max-w-lg mx-auto mb-6 md:mb-8 leading-relaxed">
              Konfirmasi kehadiran atas nama <strong>{name}</strong> telah berhasil disimpan dalam sistem Notaris Putri.
            </p>

            {/* DOWNLOAD MATERI BUTTON */}
            {materialUrl ? (
              <div className="mb-6 md:mb-8 p-4 sm:p-6 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200 max-w-md md:max-w-lg mx-auto">
                <p className="text-xs sm:text-sm text-slate-600 mb-3 md:mb-4 font-medium">
                  Materi presentasi webinar dapat diunduh melalui tombol di bawah ini:
                </p>
                <a
                  href={materialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#0a2342] hover:bg-[#123966] text-white font-bold px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-base transition-all shadow-xs hover:shadow-md active:scale-[0.99]"
                >
                  <Download className="w-4 h-4 md:w-5 md:h-5 text-amber-400" /> 
                  <span>Download Materi Webinar</span>
                </a>
              </div>
            ) : (
              <div className="mb-6 md:mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto text-xs text-slate-600">
                Materi webinar akan dikirimkan melalui WhatsApp/Email yang telah Anda daftarkan.
              </div>
            )}

            <button
              onClick={handleResetForm}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2 px-4 rounded-lg hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 
              <span>Isi Formulir Baru</span>
            </button>
          </div>
        ) : (
          /* 2-COLUMN DESKTOP LAYOUT (35% Left, 65% Right) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* ======================================================== */}
            {/* LEFT PANEL — INFORMASI WEBINAR (35% on Desktop)          */}
            {/* ======================================================== */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl p-6 sm:p-7 md:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between">
                
                <div className="space-y-5">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-bold tracking-wider uppercase">
                    <Video className="w-3.5 h-3.5 text-amber-700" />
                    <span>WEBINAR</span>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                      {info?.eventTitle || 'Laporan Tahunan PT'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">
                      {info?.description || 'Kewajiban, Alur, dan Dokumen yang Dibutuhkan'}
                    </p>
                  </div>

                  {/* Date, Time, Platform Meta */}
                  <div className="space-y-3 pt-2 text-xs sm:text-sm text-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-slate-800" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none mb-0.5">Tanggal</span>
                        <span className="font-semibold text-slate-900">{info?.dateTime || 'Sabtu, 28 September 2026'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-slate-800" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none mb-0.5">Waktu</span>
                        <span className="font-semibold text-slate-900">09.00 – 12.00 WIB</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4 text-slate-800" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none mb-0.5">Platform</span>
                        <span className="font-semibold text-slate-900">Online (Zoom)</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-100 my-4"></div>

                  {/* 3 Key Points (No Certificate mention!) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800">
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span>Materi webinar</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800">
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span>Sesi tanya jawab</span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800">
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span>Informasi dan referensi dokumen</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Quote Box */}
                <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-[#0a2342] to-[#123966] text-white border border-slate-800 relative shadow-sm">
                  <div className="text-amber-400 text-2xl font-serif leading-none mb-1">“</div>
                  <p className="text-xs italic text-slate-200 leading-relaxed font-serif">
                    Memudahkan langkah hukum untuk pertumbuhan bisnis Anda
                  </p>
                </div>

              </div>
            </div>

            {/* ======================================================== */}
            {/* RIGHT PANEL — FORM PENDAFTARAN & ABSENSI (65% on Desktop) */}
            {/* ======================================================== */}
            <div className="lg:col-span-8">
              <div className="bg-white border border-slate-200/90 rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm space-y-7 md:space-y-8">
                
                {/* Form Header */}
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
                    Pendaftaran & Absensi Webinar
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Silakan isi data berikut untuk konfirmasi kehadiran dan mendapatkan materi webinar.
                  </p>
                </div>

                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-7">
                  
                  {/* HONEYPOT ANTI-SPAM (Hidden) */}
                  <div className="hidden" aria-hidden="true">
                    <input 
                      type="text" 
                      name="website" 
                      value={honeypotWebsite} 
                      onChange={e => setHoneypotWebsite(e.target.value)} 
                      tabIndex={-1} 
                      autoComplete="off" 
                    />
                    <input 
                      type="text" 
                      name="fax" 
                      value={honeypotFax} 
                      onChange={e => setHoneypotFax(e.target.value)} 
                      tabIndex={-1} 
                      autoComplete="off" 
                    />
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* SECTION 1: DATA PESERTA                            */}
                  {/* -------------------------------------------------- */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">1</span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide uppercase">Data Peserta</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      {/* Row 1: Nama & WhatsApp */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            placeholder="Masukkan nama lengkap peserta"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0a2342] focus:ring-1 focus:ring-[#0a2342] transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Nomor WhatsApp <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            placeholder="Contoh: 081234567890"
                            value={whatsapp}
                            onChange={e => setWhatsapp(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0a2342] focus:ring-1 focus:ring-[#0a2342] transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Row 2: Email & Nama PT */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Email <span className="text-slate-400 font-normal text-[11px]">(opsional)</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            placeholder="email@perusahaan.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0a2342] focus:ring-1 focus:ring-[#0a2342] transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Nama PT / Perusahaan
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Masukkan nama perusahaan"
                            value={company}
                            onChange={e => setCompany(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0a2342] focus:ring-1 focus:ring-[#0a2342] transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Row 3: Jabatan & Kota */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Jabatan
                        </label>
                        <div className="relative">
                          <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Contoh: Direktur, Legal, Staf"
                            value={position}
                            onChange={e => setPosition(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0a2342] focus:ring-1 focus:ring-[#0a2342] transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Kota / Kabupaten
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Contoh: Bandung, Jakarta"
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0a2342] focus:ring-1 focus:ring-[#0a2342] transition-all placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* SECTION 2: KEHADIRAN WEBINAR                       */}
                  {/* -------------------------------------------------- */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">2</span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide uppercase">Kehadiran Webinar</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
                      {/* Left: Radio Kehadiran */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          Apakah Anda mengikuti webinar ini? <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {[
                            { val: 'Ya, mengikuti', label: 'Ya, mengikuti' },
                            { val: 'Tidak', label: 'Tidak' }
                          ].map(opt => {
                            const isSelected = attendance === opt.val;
                            return (
                              <label
                                key={opt.val}
                                className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-800 select-none py-1"
                              >
                                <input
                                  type="radio"
                                  name="attendance"
                                  value={opt.val}
                                  checked={isSelected}
                                  onChange={() => setAttendance(opt.val as any)}
                                  className="w-4 h-4 text-[#0a2342] focus:ring-[#0a2342] border-slate-300"
                                />
                                <span>{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Dropdown Durasi */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          Berapa lama Anda mengikuti webinar?
                        </label>
                        <div className="relative">
                          <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <select
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0a2342] focus:ring-1 focus:ring-[#0a2342] transition-all appearance-none cursor-pointer"
                          >
                            <option value="Sampai selesai">Sampai selesai</option>
                            <option value="Lebih dari 1 jam">Lebih dari 1 jam</option>
                            <option value="Kurang dari 1 jam">Kurang dari 1 jam</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* SECTION 3: KEBUTUHAN PERUSAHAAN                    */}
                  {/* -------------------------------------------------- */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">3</span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide uppercase">Kebutuhan Perusahaan</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* Kiri: Radio Kebutuhan */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2 leading-relaxed">
                          Apakah perusahaan Anda memiliki kebutuhan terkait legalitas atau administrasi perusahaan?
                        </label>
                        <div className="space-y-2.5 pt-1">
                          {[
                            'Belum ada kebutuhan',
                            'Ada kebutuhan dalam waktu dekat',
                            'Sedang mencari solusi',
                            'Ingin konsultasi terlebih dahulu'
                          ].map(need => {
                            const isSelected = companyNeed === need;
                            return (
                              <label
                                key={need}
                                className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-800 select-none py-0.5"
                              >
                                <input
                                  type="radio"
                                  name="companyNeed"
                                  value={need}
                                  checked={isSelected}
                                  onChange={() => setCompanyNeed(need)}
                                  className="w-4 h-4 text-[#0a2342] focus:ring-[#0a2342] border-slate-300"
                                />
                                <span>{need}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Kanan: Checkbox Topik (2 Kolom Compact) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 leading-relaxed">
                          Topik yang diminati <span className="text-slate-400 font-normal text-[11px]">(boleh pilih lebih dari satu)</span>
                        </label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2 pt-2">
                          {/* Column 1 */}
                          <div className="space-y-2">
                            {[
                              'RUPST / RUPSLB',
                              'Laporan Tahunan Perseroan',
                              'Perubahan Direksi / Komisaris',
                              'Perubahan Pemegang Saham',
                              'Perubahan Anggaran Dasar'
                            ].map(topic => {
                              const isChecked = selectedTopics.includes(topic);
                              return (
                                <label
                                  key={topic}
                                  className="flex items-start gap-2 cursor-pointer text-xs text-slate-800 select-none"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTopicToggle(topic)}
                                    className="w-3.5 h-3.5 mt-0.5 rounded text-[#0a2342] focus:ring-[#0a2342] border-slate-300 cursor-pointer"
                                  />
                                  <span className="leading-snug">{topic}</span>
                                </label>
                              );
                            })}
                          </div>

                          {/* Column 2 */}
                          <div className="space-y-2">
                            {[
                              'Pendirian PT',
                              'PPAT / Pertanahan',
                              'Legalitas perusahaan lainnya',
                              'Lainnya'
                            ].map(topic => {
                              const isChecked = selectedTopics.includes(topic);
                              return (
                                <label
                                  key={topic}
                                  className="flex items-start gap-2 cursor-pointer text-xs text-slate-800 select-none"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTopicToggle(topic)}
                                    className="w-3.5 h-3.5 mt-0.5 rounded text-[#0a2342] focus:ring-[#0a2342] border-slate-300 cursor-pointer"
                                  />
                                  <span className="leading-snug">{topic}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {selectedTopics.includes('Lainnya') && (
                          <div className="mt-3">
                            <input
                              type="text"
                              placeholder="Sebutkan kebutuhan lainnya..."
                              value={otherTopicText}
                              onChange={e => setOtherTopicText(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#0a2342] focus:bg-white placeholder:text-slate-400"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* -------------------------------------------------- */}
                  {/* SECTION 4: FOLLOW-UP                               */}
                  {/* -------------------------------------------------- */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">4</span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide uppercase">Follow-up</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-start">
                      {/* Kiri: Kesediaan Hubungi */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2 leading-relaxed">
                          Apakah Anda bersedia dihubungi oleh tim Notaris Putri terkait kebutuhan tersebut?
                        </label>
                        <div className="space-y-2">
                          {[
                            'Ya, silakan hubungi saya',
                            'Tidak untuk saat ini'
                          ].map(fu => {
                            const isSelected = followUp === fu;
                            return (
                              <label
                                key={fu}
                                className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-800 select-none py-1"
                              >
                                <input
                                  type="radio"
                                  name="followUp"
                                  value={fu}
                                  checked={isSelected}
                                  onChange={() => setFollowUp(fu as any)}
                                  className="w-4 h-4 text-[#0a2342] focus:ring-[#0a2342] border-slate-300"
                                />
                                <span>{fu}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Kanan: Dropdown Waktu Kontak */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          Waktu yang nyaman untuk dihubungi
                        </label>
                        <div className="relative">
                          <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <select
                            value={preferredContactTime}
                            onChange={e => setPreferredContactTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#0a2342] focus:ring-1 focus:ring-[#0a2342] transition-all appearance-none cursor-pointer"
                          >
                            <option value="Pagi">Pagi</option>
                            <option value="Siang">Siang</option>
                            <option value="Sore">Sore</option>
                            <option value="Bebas">Bebas</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#0a2342] hover:bg-[#123966] text-white font-bold py-3.5 px-6 rounded-xl text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                          <span>Mengirim Pendaftaran...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-amber-400" />
                          <span>Kirim Pendaftaran</span>
                        </>
                      )}
                    </button>
                    
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Privasi data Anda terjaga dan terlindungi bersama Notaris & PPAT Putri</span>
                    </div>
                  </div>

                </form>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-200/80 bg-white/70 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-[1380px] mx-auto px-4">
          <p className="font-semibold text-slate-700">Kantor Notaris & PPAT Nukantini Putri Parincha, SH. M.Kn</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sistem Pendaftaran & Absensi Digital</p>
        </div>
      </footer>

    </div>
  );
};

export default PublicWebinarPage;
