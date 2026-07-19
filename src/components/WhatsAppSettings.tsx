import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, Key, Shield, User, Smartphone, Send, CheckCircle2, XCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { getApiUrl } from '../lib/api';

export function WhatsAppSettings() {
  const [token, setToken] = useState('');
  const [nomorAdmin, setNomorAdmin] = useState('');
  const [nomorTujuanDefault, setNomorTujuanDefault] = useState('');
  
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'CONNECTED' | 'DISCONNECTED'>('IDLE');
  const [statusMessage, setStatusMessage] = useState('');
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load configuration from Firestore
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const docRef = doc(db, 'settings', 'whatsapp');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setToken(data.token || '');
          setNomorAdmin(data.nomorAdmin || '');
          setNomorTujuanDefault(data.nomorTujuanDefault || '');
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, 'settings/whatsapp');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Save changes to Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    
    // Simple validation of numbers
    const cleanAdmin = nomorAdmin.replace(/[^0-9]/g, '');
    const cleanDefault = nomorTujuanDefault.replace(/[^0-9]/g, '');

    try {
      await setDoc(doc(db, 'settings', 'whatsapp'), {
        token,
        nomorAdmin: cleanAdmin,
        nomorTujuanDefault: cleanDefault,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/whatsapp');
    } finally {
      setLoading(false);
    }
  };

  // Test WhatsApp Connection through Fonnte via Server Endpoint
  const handleTestConnection = async () => {
    if (!token) {
      alert('Silakan masukkan Token Fonnte terlebih dahulu untuk menguji koneksi.');
      return;
    }
    setTesting(true);
    setStatus('IDLE');
    setStatusMessage('');
    try {
      const userToken = await auth.currentUser?.getIdToken();
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }
      
      const response = await fetch(getApiUrl('/api/whatsapp-status'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ token })
      });
      const resText = await response.text();
      let data;
      try {
        data = JSON.parse(resText);
      } catch (e) {
        throw new Error("Respon server bukan format JSON yang valid. Pastikan server backend Anda terdeploy dengan benar.");
      }
      if (data.connected) {
        setStatus('CONNECTED');
        setStatusMessage(data.device_status || 'Koneksi Sukses!');
      } else {
        setStatus('DISCONNECTED');
        setStatusMessage(data.message || 'Gagal Menghubungkan Device.');
      }
    } catch (err: any) {
      setStatus('DISCONNECTED');
      setStatusMessage(err.message || 'Gagal menghubungkan ke server.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-50 rounded-full blur-3xl -mx-5 -my-5"></div>
        <div className="relative z-10 flex items-center gap-3">
          <span className="p-2.5 bg-fuchsia-100 text-fuchsia-600 rounded-lg">
            <Smartphone size={22} className="stroke-[2.5]" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">WhatsApp Gateway</h2>
            <p className="text-slate-500 text-xs font-semibold">Hubungkan dan kelola Fonnte API untuk mengirim laporan otomatis via WhatsApp</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* INPUT CONFIGURATIONS (LEFT 2 COLS) */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Pengaturan API & Kredensial</h3>
          
          <form onSubmit={handleSave} className="space-y-4">
            {/* Token */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Key size={13} className="text-slate-400" />
                Token Fonnte
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Masukkan Token Fonnte..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full pl-3 pr-20 py-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/15 focus:border-fuchsia-500 bg-slate-50/35 focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition-colors uppercase cursor-pointer"
                >
                  {showToken ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Token ini digunakan untuk memvalidasi akses ke API Fonnte pada server-side.</p>
            </div>

            {/* Admin Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Shield size={13} className="text-slate-400" />
                Nomor Admin (WhatsApp)
              </label>
              <input
                type="text"
                placeholder="Contoh: 62812345678 or 0812345678"
                value={nomorAdmin}
                onChange={(e) => setNomorAdmin(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/15 focus:border-fuchsia-500 bg-slate-50/35 focus:bg-white transition-all"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Nomor penanggung jawab sistem atau Notaris untuk log pengiriman.</p>
            </div>

            {/* Default Destination Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User size={13} className="text-slate-400" />
                Nomor Tujuan Default (WhatsApp)
              </label>
              <input
                type="text"
                placeholder="Contoh: 62812345678 or 0812345678"
                value={nomorTujuanDefault}
                onChange={(e) => setNomorTujuanDefault(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500/15 focus:border-fuchsia-500 bg-slate-50/35 focus:bg-white transition-all"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Nomor tujuan default ketika mengekspor laporan pekerjaan via WhatsApp.</p>
            </div>

            {/* Button Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 active:bg-fuchsia-800 disabled:bg-slate-200 disabled:border-slate-300 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-fuchsia-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer uppercase tracking-wider disabled:-translate-y-0"
              >
                {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save size={15} />}
                Simpan Pengaturan
              </button>

              {saveSuccess && (
                <div className="flex items-center gap-1 text-emerald-600 font-bold text-[11px] animate-fade-in uppercase">
                  <CheckCircle2 size={13} />
                  Pengaturan Berhasil Disimpan!
                </div>
              )}
            </div>
          </form>
        </div>

        {/* CONNECTION MONITOR STATUS (RIGHT 1 COL) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between" id="whatsapp_status_pnl">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Indikator Status</h3>
            
            <div className="space-y-4">
              {/* STATUS INDICATOR DISPLAY */}
              <div className="p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50">
                {status === 'CONNECTED' ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 size={32} className="stroke-[2]" />
                    </div>
                    <div>
                      <div className="text-[14px] font-black text-emerald-600 uppercase tracking-wide">🟢 Terhubung</div>
                      <div className="text-[10px] text-emerald-500 font-bold mt-0.5 uppercase tracking-wider">{statusMessage}</div>
                    </div>
                  </>
                ) : status === 'DISCONNECTED' ? (
                  <>
                    <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
                      <XCircle size={32} className="stroke-[2]" />
                    </div>
                    <div>
                      <div className="text-[14px] font-black text-rose-600 uppercase tracking-wide">🔴 Tidak Terhubung</div>
                      <div className="text-[10px] text-rose-500 font-bold mt-0.5 text-center px-1 break-all line-clamp-2 uppercase tracking-wide">{statusMessage}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <RefreshCw size={24} className="stroke-[1.5]" />
                    </div>
                    <div>
                      <div className="text-[14px] font-black text-slate-500 uppercase tracking-wide">Belum Diuji</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">Uji konektivitas nomor ke Fonnte.</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing || !token}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 active:bg-black disabled:bg-slate-100 disabled:border-slate-200 text-white disabled:text-slate-400 font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-950 shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer uppercase tracking-wider disabled:-translate-y-0"
            id="test_wa_gateway_conn_btn"
          >
            {testing ? <RefreshCw className="animate-spin w-4 h-4" /> : <Send size={14} />}
            Test Koneksi
          </button>
        </div>
      </div>
    </div>
  );
}
