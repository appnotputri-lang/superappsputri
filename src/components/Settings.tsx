import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Smartphone, 
  Image as ImageIcon, 
  Users, 
  Database, 
  Shield, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  FileText, 
  Layout, 
  AlertTriangle,
  Lock,
  CheckCircle2,
  HelpCircle,
  Clock,
  Laptop,
  RefreshCw
} from 'lucide-react';
import { PageContainer, PageHeader } from './ui/PageLayout';
import { WhatsAppSettings } from './WhatsAppSettings';
import { StampSettings } from './StampSettings';
import { UserManagement } from './UserManagement';
import ImportKBLI from './ImportKBLI';
import MigrationTool from '../features/migration/MigrationTool';
import { UserProfile } from '../types';

interface SettingsProps {
  currentUser: UserProfile | null;
  activeSidebarTab?: string;
  setActiveSidebarTab?: (tab: any) => void;
}

type TabType = 'general' | 'import_kbli' | 'whatsapp' | 'stamp' | 'users' | 'migration' | 'security';

export const Settings: React.FC<SettingsProps> = ({ 
  currentUser, 
  activeSidebarTab,
  setActiveSidebarTab 
}) => {
  // Determine initial subtab based on sidebar deep link
  const getInitialTab = (): TabType => {
    if (activeSidebarTab === 'whatsapp_settings') return 'whatsapp';
    if (activeSidebarTab === 'stamp_settings') return 'stamp';
    if (activeSidebarTab === 'user_management') return 'users';
    if (activeSidebarTab === 'import_kbli') return 'import_kbli';
    return 'general';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());

  // Keep subtab in sync if deep link sidebar tab changes
  useEffect(() => {
    if (activeSidebarTab === 'whatsapp_settings') setActiveTab('whatsapp');
    else if (activeSidebarTab === 'stamp_settings') setActiveTab('stamp');
    else if (activeSidebarTab === 'user_management') setActiveTab('users');
    else if (activeSidebarTab === 'import_kbli') setActiveTab('import_kbli');
  }, [activeSidebarTab]);

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  // Umum State (with localStorage persistence)
  const [officeName, setOfficeName] = useState(() => localStorage.getItem('cfg_office_name') || 'Kantor Notaris Putri, S.H., M.Kn.');
  const [officeAddress, setOfficeAddress] = useState(() => localStorage.getItem('cfg_office_address') || 'Jl. Jenderal Sudirman No. 123, Blok M, Kebayoran Baru, Jakarta Selatan');
  const [officePhone, setOfficePhone] = useState(() => localStorage.getItem('cfg_office_phone') || '021-7254321');
  const [officeEmail, setOfficeEmail] = useState(() => localStorage.getItem('cfg_office_email') || 'info@notarisputri.co.id');
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem('cfg_date_format') || 'DD MMMM YYYY');
  const [docFormat, setDocFormat] = useState(() => localStorage.getItem('cfg_doc_format') || 'REG/{YYYY}/{MM}/{NNN}');
  const [themePref, setThemePref] = useState(() => localStorage.getItem('cfg_theme_pref') || 'system');
  const [showSaveToast, setShowSaveToast] = useState(false);

  const handleSaveUmum = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cfg_office_name', officeName);
    localStorage.setItem('cfg_office_address', officeAddress);
    localStorage.setItem('cfg_office_phone', officePhone);
    localStorage.setItem('cfg_office_email', officeEmail);
    localStorage.setItem('cfg_date_format', dateFormat);
    localStorage.setItem('cfg_doc_format', docFormat);
    localStorage.setItem('cfg_theme_pref', themePref);
    
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  // List of tabs with their labels, icons, and permissions
  const tabsList = [
    { id: 'general' as const, label: 'Umum', icon: SettingsIcon, description: 'Informasi instansi dan preferensi sistem', requiresSuperAdmin: false },
    { id: 'import_kbli' as const, label: 'Import KBLI 2025', icon: RefreshCw, description: 'Sinkronisasi database klasifikasi KBLI terbaru', requiresSuperAdmin: true },
    { id: 'whatsapp' as const, label: 'WhatsApp Gateway', icon: Smartphone, description: 'Koneksi perangkat & template pesan', requiresSuperAdmin: true },
    { id: 'stamp' as const, label: 'Stempel & TTD', icon: ImageIcon, description: 'Upload gambar cap basah & tanda tangan', requiresSuperAdmin: true },
    { id: 'users' as const, label: 'Manajemen User', icon: Users, description: 'Kelola pengguna sistem & hak akses', requiresSuperAdmin: true },
    { id: 'migration' as const, label: 'Migration & Data', icon: Database, description: 'Pemeliharaan data & sinkronisasi', requiresSuperAdmin: true },
    { id: 'security' as const, label: 'Keamanan', icon: Shield, description: 'Log aktivitas sesi & keamanan akun', requiresSuperAdmin: false },
  ];

  // Filter tabs user has permission to access
  const visibleTabs = tabsList.filter(t => !t.requiresSuperAdmin || isSuperAdmin);

  // If user somehow gets stuck on a tab they have no permission for, fallback to 'general'
  useEffect(() => {
    if (activeTab !== 'general' && activeTab !== 'security' && !isSuperAdmin) {
      setActiveTab('general');
    }
  }, [activeTab, isSuperAdmin]);

  return (
    <PageContainer>
      <PageHeader 
        title="Pusat Pengaturan" 
        description="Kelola konfigurasi, pengguna, integrasi, keamanan, dan pemeliharaan sistem dari satu kendali utama."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start mt-4">
        
        {/* Left column Settings Tab Navigation */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Desktop Navigation */}
          <div className="hidden lg:block divide-y divide-slate-100">
            <div className="p-4 bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigasi Pengaturan</span>
            </div>
            <div className="p-2 space-y-1">
              {visibleTabs.map(tab => {
                const IsActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      // Update sidebar context if supported to keep URL and side highlights in harmony
                      if (setActiveSidebarTab) {
                        if (tab.id === 'whatsapp') setActiveSidebarTab('whatsapp_settings');
                        else if (tab.id === 'stamp') setActiveSidebarTab('stamp_settings');
                        else if (tab.id === 'users') setActiveSidebarTab('user_management');
                        else if (tab.id === 'import_kbli') setActiveSidebarTab('import_kbli');
                        else setActiveSidebarTab('settings');
                      }
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg transition-all flex items-start gap-3 select-none text-xs ${
                      IsActive 
                        ? 'bg-teal-50 text-teal-800 font-semibold border border-teal-100/60 shadow-2xs' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 shrink-0 mt-0.5 ${IsActive ? 'text-teal-600' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold">{tab.label}</p>
                      <p className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5 truncate">{tab.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile UX (Segmented Tab or Dropdown) */}
          <div className="lg:hidden p-3 bg-slate-50/50 border-b border-slate-100">
            <label htmlFor="settings-tab-select" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
              Pilih Kategori Pengaturan
            </label>
            <select
              id="settings-tab-select"
              value={activeTab}
              onChange={(e) => {
                const val = e.target.value as TabType;
                setActiveTab(val);
                if (setActiveSidebarTab) {
                  if (val === 'whatsapp') setActiveSidebarTab('whatsapp_settings');
                  else if (val === 'stamp') setActiveSidebarTab('stamp_settings');
                  else if (val === 'users') setActiveSidebarTab('user_management');
                  else if (val === 'import_kbli') setActiveSidebarTab('import_kbli');
                  else setActiveSidebarTab('settings');
                }
              }}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
            >
              {visibleTabs.map(tab => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right column: Tab Content Panel */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
          
          {/* TAB 1: UMUM */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-heading">Pengaturan Umum</h3>
                  <p className="text-xs text-slate-500">Sesuaikan profil lembaga notaris dan preferensi dokumen utama</p>
                </div>
                <Building2 className="w-5 h-5 text-slate-300" />
              </div>

              {showSaveToast && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-center gap-2.5 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Konfigurasi umum berhasil disimpan ke penyimpanan lokal sistem!</span>
                </div>
              )}

              <form onSubmit={handleSaveUmum} className="space-y-5">
                
                {/* Section 1: Informasi Kantor */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-l-2 border-teal-500 pl-2">
                    Informasi Kantor Notaris
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Nama Kantor / Instansi</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                        <input
                          type="text"
                          value={officeName}
                          onChange={(e) => setOfficeName(e.target.value)}
                          className="w-full bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Nomor Telepon Resmi</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                        <input
                          type="text"
                          value={officePhone}
                          onChange={(e) => setOfficePhone(e.target.value)}
                          className="w-full bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Alamat Email Korespondensi</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                        <input
                          type="email"
                          value={officeEmail}
                          onChange={(e) => setOfficeEmail(e.target.value)}
                          className="w-full bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Alamat Kantor Lengkap</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                        <input
                          type="text"
                          value={officeAddress}
                          onChange={(e) => setOfficeAddress(e.target.value)}
                          className="w-full bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Preferensi Sistem */}
                <div className="space-y-4 pt-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-l-2 border-teal-500 pl-2">
                    Preferensi Sistem & Dokumen
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Format Tanggal</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                        <select
                          value={dateFormat}
                          onChange={(e) => setDateFormat(e.target.value)}
                          className="w-full bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        >
                          <option value="DD MMMM YYYY">12 Agustus 2026</option>
                          <option value="DD/MM/YYYY">12/08/2026</option>
                          <option value="YYYY-MM-DD">2026-08-12</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Format Nomor Dokumen</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                        <input
                          type="text"
                          value={docFormat}
                          onChange={(e) => setDocFormat(e.target.value)}
                          className="w-full bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Preferensi Tampilan</label>
                      <div className="relative">
                        <Layout className="absolute left-3 top-2.5 w-4 h-4 text-slate-300" />
                        <select
                          value={themePref}
                          onChange={(e) => setThemePref(e.target.value)}
                          className="w-full bg-slate-50/50 hover:bg-slate-50/80 focus:bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        >
                          <option value="system">Sesuai Tema Sistem OS</option>
                          <option value="light">Mode Terang (Bawaan)</option>
                          <option value="dark" disabled>Mode Gelap (Segera Hadir)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    Simpan Perubahan Umum
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: IMPORT KBLI 2025 */}
          {activeTab === 'import_kbli' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-heading">Import KBLI 2025</h3>
                  <p className="text-xs text-slate-500">Perbarui master data Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) versi terbaru</p>
                </div>
                <RefreshCw className="w-5 h-5 text-slate-300" />
              </div>
              <ImportKBLI />
            </div>
          )}

          {/* TAB 2: WHATSAPP GATEWAY */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-heading">WhatsApp Gateway</h3>
                  <p className="text-xs text-slate-500">Konfigurasi perangkat pengirim pesan otomatis dan status koneksi API</p>
                </div>
                <Smartphone className="w-5 h-5 text-slate-300" />
              </div>
              <WhatsAppSettings />
            </div>
          )}

          {/* TAB 3: STEMPEL & TTD */}
          {activeTab === 'stamp' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-heading">Stempel & Tanda Tangan</h3>
                  <p className="text-xs text-slate-500">Upload dan atur letak stempel basah serta tanda tangan notaris di draf akta</p>
                </div>
                <ImageIcon className="w-5 h-5 text-slate-300" />
              </div>
              <StampSettings />
            </div>
          )}

          {/* TAB 4: MANAJEMEN USER */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-heading">Manajemen Pengguna</h3>
                  <p className="text-xs text-slate-500">Kelola otorisasi akun staf kantor, level jabatan, dan hak akses aplikasi</p>
                </div>
                <Users className="w-5 h-5 text-slate-300" />
              </div>
              <UserManagement currentUser={currentUser} />
            </div>
          )}

          {/* TAB 5: MIGRATION & DATA */}
          {activeTab === 'migration' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-heading">Migration & Pemeliharaan Data</h3>
                  <p className="text-xs text-slate-500">Perbaikan integritas basis data, audit duplikat, tokenisasi index, dan sinkronisasi client</p>
                </div>
                <Database className="w-5 h-5 text-slate-300" />
              </div>

              {/* Administrative warning message */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg flex items-start gap-3 text-xs mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-extrabold text-amber-800 uppercase tracking-wider text-[10px]">Area Administrasi Sistem - Risiko Tinggi</p>
                  <p className="text-amber-700 leading-relaxed mt-1 text-[11px]">
                    Seluruh fungsionalitas di bawah ini memodifikasi database aktif. Mohon lakukan <strong>Dry Run (Uji Coba Tanpa Menyimpan)</strong> terlebih dahulu sebelum mengeksekusi langsung secara LIVE. Tindakan tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <MigrationTool />
              </div>
            </div>
          )}

          {/* TAB 6: KEAMANAN */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 font-heading">Keamanan & Sesi Sistem</h3>
                  <p className="text-xs text-slate-500">Lihat log perangkat yang masuk ke akun Anda serta tingkat proteksi</p>
                </div>
                <Shield className="w-5 h-5 text-slate-300" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Security Setting Placeholder */}
                <div className="bg-slate-50/50 border border-slate-200/80 p-4 rounded-xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-700 text-xs">Proteksi Keamanan Akun</span>
                  </div>
                  
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span>Metode Autentikasi</span>
                      <span className="font-semibold text-teal-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Google Single Sign-On (SSO)
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span>Batas Timeout Sesi Aktif</span>
                      <span className="text-slate-400 font-mono text-[11px]">60 Menit</span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span>Enkripsi Database</span>
                      <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono">TLS 1.3 / AES-256</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-700 leading-relaxed flex gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>Akun Anda diverifikasi melalui integrasi Google Workspace. Untuk merubah kata sandi, mohon ubah melalui portal akun Google resmi Anda.</span>
                  </div>
                </div>

                {/* Sesi Aktif Card */}
                <div className="bg-slate-50/50 border border-slate-200/80 p-4 rounded-xl space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-700 text-xs">Sesi Aktif & Log Masuk</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 border-b border-slate-100 pb-2.5">
                      <Laptop className="w-4 h-4 text-teal-600 mt-0.5" />
                      <div className="min-w-0 text-xs">
                        <p className="font-semibold text-slate-800">Chrome di Windows (Sesi Ini)</p>
                        <p className="text-[10px] text-slate-400">IP: 182.253.21.94 — Aktif Sekarang</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div className="min-w-0 text-xs">
                        <p className="font-semibold text-slate-700">Masuk Berhasil via Google SSO</p>
                        <p className="text-[10px] text-slate-400">12 Agustus 2026, 15:18</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
