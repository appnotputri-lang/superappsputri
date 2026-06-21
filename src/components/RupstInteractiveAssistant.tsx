import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Eye, 
  ArrowRight, 
  Bot, 
  Smile, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Coins, 
  Scale, 
  Building2, 
  Users2, 
  Users,
  Calendar, 
  Award,
  ChevronLeft,
  ChevronRight,
  Calculator,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Shareholder } from '../../types';

interface RupstInteractiveAssistantProps {
  data: any;
  updateData: (newData: Partial<any>) => void;
  openShareholderEditor: (type: 'lama' | 'baru', sh?: Shareholder) => void;
  deleteShareholder: (id: string, mode: 'lama' | 'baru') => void;
  externalStep?: number;
  setExternalStep?: (step: number | ((prev: number) => number)) => void;
  hideHeader?: boolean;
}

// Format numbers nicely
const formatNumber = (num: number) => {
  if (!num) return '0';
  return num.toLocaleString('id-ID');
};

const parseNumber = (val: string) => {
  const clean = val.replace(/\./g, '').replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

export const RupstInteractiveAssistant: React.FC<RupstInteractiveAssistantProps> = ({
  data,
  updateData,
  openShareholderEditor,
  deleteShareholder,
  externalStep,
  setExternalStep,
  hideHeader
}) => {
  const [internalStep, setInternalStep] = useState<number>(1);
  const currentStep = externalStep !== undefined ? externalStep : internalStep;
  const setCurrentStep = setExternalStep !== undefined ? setExternalStep : setInternalStep;
  const [mascotState, setMascotState] = useState<'welcome' | 'happy' | 'thinking' | 'warning' | 'done'>('welcome');

  const totalSteps = 11;

  // Let's calculate shareholder metrics
  const totalSharesInputted = (data.shareholders || []).reduce(
    (sum: number, s: any) => sum + (s.sharesOwned || 0), 0
  );
  const isSharesMismatched = totalSharesInputted !== (data.originalTotalShares || 0);

  // Update mascot state based on current step and state inputs
  useEffect(() => {
    if (currentStep === 1) {
      if (data.companyName) {
        setMascotState('happy');
      } else {
        setMascotState('welcome');
      }
    } else if (currentStep === 2) {
      if (data.originalSharePrice > 0 && data.originalAuthorizedShares > 0) {
        setMascotState('happy');
      } else {
        setMascotState('thinking');
      }
    } else if (currentStep === 5) {
      if (isSharesMismatched && totalSharesInputted > 0) {
        setMascotState('warning');
      } else if (totalSharesInputted > 0) {
        // Quorum check: Check if attendance >= 50% + 1
        const isQuorumMet = totalSharesInputted > ((data.originalTotalShares || 0) / 2);
        if (isQuorumMet) {
          setMascotState('happy');
        } else {
          setMascotState('thinking');
        }
      } else {
        setMascotState('thinking');
      }
    } else if (currentStep === 8) {
      if (data.meetingChair) {
        setMascotState('happy');
      } else {
        setMascotState('thinking');
      }
    } else if (currentStep === totalSteps) {
      setMascotState('done');
    } else {
      setMascotState('thinking');
    }
  }, [currentStep, data.companyName, data.originalSharePrice, data.originalAuthorizedShares, isSharesMismatched, totalSharesInputted, data.meetingChair]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Render Mascot Nita (Cute CSS Notary)
  const renderMascot = () => {
    let eyeClass = "transition-all duration-300";
    let mouthPath = "M 32 38 Q 40 45 48 38"; // Smiling mouth
    let cheeksClass = "fill-pink-200 opacity-60";
    let animationClass = "animate-bounce";

    switch (mascotState) {
      case 'happy':
        mouthPath = "M 32 36 Q 40 46 48 36";
        cheeksClass = "fill-pink-300 opacity-90 animate-pulse";
        animationClass = "animate-bounce";
        break;
      case 'thinking':
        mouthPath = "M 34 39 Q 40 37 46 39"; // Curio straight line
        cheeksClass = "fill-pink-200 opacity-40";
        animationClass = "";
        break;
      case 'warning':
        mouthPath = "M 34 41 Q 40 35 46 41"; // Slight sad/concern curve
        cheeksClass = "fill-amber-200 opacity-80";
        animationClass = "animate-wiggle";
        break;
      case 'done':
        mouthPath = "M 30 35 Q 40 48 50 35"; // Broad happy grin
        cheeksClass = "fill-pink-300 opacity-100 animate-pulse";
        animationClass = "animate-bounce duration-1000";
        break;
      case 'welcome':
      default:
        mouthPath = "M 32 38 Q 40 45 48 38";
        cheeksClass = "fill-pink-200 opacity-60";
        animationClass = "animate-pulse";
        break;
    }

    return (
      <div className="flex flex-col items-center">
        {/* Animated Cute SVG Nita Mascot */}
        <div className={`w-28 h-28 relative ${animationClass}`}>
          <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-md">
            {/* Cute Notary Hair back */}
            <path d="M 12 40 C 12 15, 68 15, 68 40 C 68 55, 60 62, 50 62 C 40 62, 40 58, 30 58 C 20 58, 12 50, 12 40 Z" fill="#2d3748" />
            
            {/* Soft Skin Round Face */}
            <circle cx="40" cy="38" r="22" fill="#fed7aa" />
            
            {/* Cute Glasses Frame */}
            <circle cx="31" cy="31" r="7" fill="none" stroke="#e53e3e" strokeWidth="2.5" />
            <circle cx="49" cy="31" r="7" fill="none" stroke="#e53e3e" strokeWidth="2.5" />
            <line x1="38" y1="31" x2="42" y2="31" stroke="#e53e3e" strokeWidth="2.5" />
            
            {/* Eyes behind glasses */}
            <circle cx="31" cy="31" r="2.5" fill="#1a202c" className={eyeClass} />
            <circle cx="49" cy="31" r="2.5" fill="#1a202c" className={eyeClass} />
            
            {/* Highlights in eyes */}
            <circle cx="32" cy="30" r="0.8" fill="white" />
            <circle cx="50" cy="30" r="0.8" fill="white" />

            {/* Rosy Cheeks */}
            <ellipse cx="23" cy="38" rx="4" ry="2" className={cheeksClass} />
            <ellipse cx="57" cy="38" rx="4" ry="2" className={cheeksClass} />

            {/* Cute Mouth */}
            <path d={mouthPath} fill="none" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" />

            {/* Front Bangs (Notary Hair Cut) */}
            <path d="M 15 30 Q 30 18, 40 25 Q 50 18, 65 30 Q 64 16, 40 16 Q 16 16, 15 30 Z" fill="#1a202c" />
            
            {/* Pretty Orange Flower Clip */}
            <circle cx="60" cy="22" r="3.5" fill="#f6ad55" />
            <circle cx="63" cy="25" r="2.5" fill="#68d391" />
          </svg>
        </div>
        {/* Mascot Name Badge */}
        <span className="mt-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-yellow-200 uppercase tracking-wider shadow-sm">
          NITA (Asisten RUPST)
        </span>
      </div>
    );
  };

  // Get current speech bubble text based on step
  const getMascotSpeech = () => {
    switch (currentStep) {
      case 1:
        if (!data.companyName) {
          return "Halo! Yuk, saya bantu isi data RUPST Public kamu agar dokumen yang dihasilkan rapi dan presisi. Pertama, siapa sih nama PT (Perseroan terbatas) kamu? Jangan lupa input wilayah kedudukan dan alamat kantornya ya!";
        }
        return `Wah, PT ${data.companyName}! Nama yang luar biasa megah ✨. Sekarang isi juga dong alamat kantor lengkapnya beserta kotanya ya!`;
      case 2:
        return "Hebat! Sekarang mari kita atur nilai saham dan permodalan dasar PT-mu. Berapa nilai nominal per lembar sahamnya, serta berapa jumlah lembar saham Modal Dasar dan Modal Disetor? Saya akan hitung nominal Rupiahnya secara komputasi otomatis lho! Jangan lupa untuk mengecek datanya di Akta dan SK AHU terakhir kamu ya agar nilainya presisi!";
      case 3:
        return "Langkah berikutnya adalah data Akta Pendirian PT. Masukkan nomor akta dan tanggalnya ya. Psst.. kamu bisa klik opsi untuk memakai identitas Notaris Nukantini Putri Parincha, SH., M.Kn. atau ketik manual dengan asisten saya!";
      case 4:
        return "Nah, ini langkah penting! Apakah PT kamu memiliki atau pernah melakukan Akta Perubahan setelah Akta Pendirian dibuat? Silakan pilih jawaban di bawah ini ya!";
      case 5:
        if (isSharesMismatched && totalSharesInputted > 0) {
          return `Aduh! Total nominal saham peserta yang diinput saat ini (${formatNumber(totalSharesInputted)} lembar) belum klop dengan Modal Disetor (${formatNumber(data.originalTotalShares || 0)} lembar). Yuk disesuaikan atau edit data pesertanya!`;
        }
        if (totalSharesInputted > 0) {
          const isQuorumMet = totalSharesInputted > ((data.originalTotalShares || 0) / 2);
          if (!isQuorumMet) {
            return `Data peserta sudah masuk, tapi kelihatannya belum mencapai Korum (lebih dari 50%). Ingat ya, untuk RUPST minimal kehadiran pemegang saham wajib 50% + 1 saham dari modal disetor agar keputusan rapat sah!`;
          }
          return `Keren! Korum sudah terpenuhi (${Math.round((totalSharesInputted / (data.originalTotalShares || 1)) * 100)}%). Semua peserta yang hadir sudah dicatat dengan benar.`;
        }
        return "Keren! Di langkah ini, kita daftarkan siapa saja pengurus (Direksi / Komisaris) dan Pemegang Saham yang menghadiri rapat. Klik tombol 'TAMBAH PESERTA' di bawah ini untuk mengisinya!";
      case 6:
        return "Sekarang, beritahu saya Pasal dalam Anggaran Dasar PT kamu yang mengatur tentang Kuorum kehadiran Rapat ya! Biasanya ada di Akta Pendirian bagian Rapat Umum Pemegang Saham.";
      case 7:
        return "Selanjutnya, Pasal berapa dalam Anggaran Dasar yang mengatur tentang siapa yang berhak atau diutamakan untuk memimpin Rapat?";
      case 8:
        return "Nah, siapa nih yang akhirnya ditunjuk atau berwenang memimpin Rapat RUPST ini? Ketikkan namanya ya! Masukan nama lengkap tanpa gelar untuk formalitas akta.";
      case 9:
        return "Mari isi hasil keuangan perseroan tahun lalu. Berapa Laba Bersih yang didapat PT-mu dan berapa dividen yang dibagikan untuk pemegang saham? Sisa laba ditahan akan langsung saya hitung secara otomatis!";
      case 10:
        return "Ini bagian yang PALING penting: Kuesioner Kewajiban Audit Laporan Keuangan (UU PT No.40/2007). Jawab ke-6 pertanyaan di bawah ini dengan pilihan 'Ya' atau 'Tidak'. Tenang saja, defaultnya sekarang bersih tanpa auto-pilihan ya!";
      case 11:
        return "Langkah terakhir, sahabat! Isi detail pelaksanaan rapat (Hari, Tanggal, Jam, Tempat). Semua data waktu dan lokasi akan saya susun rapi dalam dokumen RUPST kamu.";
      default:
        return "Semua beres! Silakan pratinjau hasilnya di panel kanan dan download file DOCX dokumen RUPST kamu.";
    }
  };

  return (
    <div className={hideHeader ? "" : "bg-gradient-to-br from-slate-50 to-blue-50/40 p-3 sm:p-5 rounded-lg border border-blue-100 shadow-md"}>
      
      {/* Upper Area: Character with Speech Bubble */}
      {!hideHeader && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center mb-6 border-b border-blue-100/70 pb-5">
          <div className="md:col-span-1 flex justify-center">
            <div className="scale-90 sm:scale-100">
              {renderMascot()}
            </div>
          </div>
          <div className="md:col-span-4 relative bg-white p-4 rounded-xl border border-blue-100 shadow-sm mx-1 sm:mx-0">
            {/* Talk bubble triangle for MD screen */}
            <div className="hidden md:block absolute left-0 top-1/2 -translate-x-2 -translate-y-2 w-4 h-4 bg-white border-l border-b border-blue-100 rotate-45"></div>
            {/* Talk bubble triangle for Mobile screen */}
            <div className="block md:hidden absolute top-0 left-1/2 -translate-x-2 -translate-y-2 w-4 h-4 bg-white border-t border-l border-blue-100 rotate-45"></div>
            
            <div className="text-[13px] sm:text-[12.5px] text-slate-700 leading-relaxed font-medium">
              "{getMascotSpeech()}"
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar with steps indicator */}
      {!hideHeader && (
        <div className="mb-6 px-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[11px] font-bold text-[#3b5998] uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-yellow-500 animate-spin" /> Langkah {currentStep} <span className="hidden sm:inline">dari {totalSteps}</span>
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              {Math.floor((currentStep / totalSteps) * 100)}% <span className="hidden sm:inline">Selesai</span>
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-100 shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-[#3b5998] h-full transition-all duration-300 rounded-full"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Interactive Form Field Cards according to active steps */}
      <div className={hideHeader ? "min-h-[300px] flex flex-col justify-between" : "bg-white p-3.5 sm:p-5 rounded-md border border-slate-200 shadow-sm min-h-[300px] flex flex-col justify-between"}>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* STEP 1: IDENTITAS PT */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Building2 className="text-[#3b5998] w-4.5 h-4.5" />
                  <h4 className="font-bold text-[13px] text-slate-800 uppercase">Status & Identitas PT</h4>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nama PT (Perseroan) <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all uppercase placeholder-slate-400 font-bold"
                      placeholder="Contoh: PT SARANA MAKMUR SEJAHTERA"
                      value={data.companyName || ''}
                      onChange={e => updateData({ companyName: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Kedudukan PT (Kota/Kabupaten) <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-400"
                      placeholder="Contoh: KOTA BANDUNG atau KABUPATEN INDRAMAYU"
                      value={data.domicile || ''}
                      onChange={e => updateData({ domicile: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nama Jalan / Blok / Nomor Rumah <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-400 font-bold"
                        placeholder="Contoh: Jalan Asia Afrika Nomor 123"
                        value={data.rupstStreet || ''}
                        onChange={e => updateData({ rupstStreet: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">RT <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-400"
                          placeholder="001"
                          value={data.rupstRt || ''}
                          onChange={e => updateData({ rupstRt: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">RW <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-400"
                          placeholder="005"
                          value={data.rupstRw || ''}
                          onChange={e => updateData({ rupstRw: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Kelurahan / Desa <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-400"
                          placeholder="Braga"
                          value={data.rupstKelurahan || ''}
                          onChange={e => updateData({ rupstKelurahan: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Kecamatan <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-400"
                          placeholder="Sumur Bandung"
                          value={data.rupstKecamatan || ''}
                          onChange={e => updateData({ rupstKecamatan: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50/40 p-3.5 rounded border border-blue-100 mt-2">
                      <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">Hasil Gabungan Alamat Lengkap PT:</span>
                      <p className="text-[12px] font-bold text-[#3b5998] italic">
                        {data.fullAddress || <span className="text-slate-400 font-normal">Harap lengkapi komponen alamat di atas...</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: MODAL, NOMINAL & NILAI SAHAM */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Coins className="text-[#3b5998] w-4.5 h-4.5" />
                  <h4 className="font-bold text-[13px] text-slate-800 uppercase">Modal & Struktur Nilai Saham</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nominal per Lembar Saham <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[12px] font-bold">Rp.</span>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                          placeholder="Contoh: 100.000"
                          value={data.originalSharePrice === 0 ? '' : formatNumber(data.originalSharePrice)}
                          onChange={e => updateData({ originalSharePrice: parseNumber(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Total Modal Dasar (Lembar Saham) <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold outline-none"
                        placeholder="Contoh: 10.000"
                        value={data.originalAuthorizedShares === 0 ? '' : formatNumber(data.originalAuthorizedShares)}
                        onChange={e => updateData({ originalAuthorizedShares: parseNumber(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Total Modal Disetor (Lembar Saham) <span className="text-red-500">*</span></label>
                      <input 
                        type="text"
                        className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold outline-none"
                        placeholder="Contoh: 2.500"
                        value={data.originalTotalShares === 0 ? '' : formatNumber(data.originalTotalShares)}
                        onChange={e => updateData({ originalTotalShares: parseNumber(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Summary Card with calculations */}
                  <div className="bg-slate-50 p-4 rounded-lg flex flex-col justify-center border border-slate-200">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-3">
                      <Calculator size={13} className="text-blue-500" /> Ringkasan Permodalan Rupiah:
                    </h5>
                    
                    <div className="space-y-3">
                      <div className="p-2.5 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase leading-none mb-1">Modal Dasar (Rupiah):</span>
                        <span className="text-[13px] font-extrabold text-slate-700">
                          Rp. {formatNumber(data.originalAuthorizedShares * data.originalSharePrice)}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">({formatNumber(data.originalAuthorizedShares || 0)} lembar)</span>
                      </div>

                      <div className="p-2.5 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase leading-none mb-1">Modal Disetor (Rupiah):</span>
                        <span className="text-[13px] font-extrabold text-[#3b5998]">
                          Rp. {formatNumber(data.originalTotalShares * data.originalSharePrice)}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">({formatNumber(data.originalTotalShares || 0)} lembar)</span>
                      </div>

                      {/* Minimum capital disetor rule (25% modal dasar) */}
                      {data.originalAuthorizedShares > 0 && (
                        <div className="mt-2 text-[10.5px]">
                          <div className="flex justify-between font-bold text-slate-500">
                            <span>Rasio Disetor vs Dasar:</span>
                            <span>{Math.round(((data.originalTotalShares || 0) / data.originalAuthorizedShares) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1 rounded overflow-hidden mt-1">
                            <div 
                              className={`h-full ${((data.originalTotalShares || 0) / data.originalAuthorizedShares) >= 0.25 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(100, ((data.originalTotalShares || 0) / data.originalAuthorizedShares) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 block">
                            * Undang-Undang PT mempersyaratkan modal disetor minimal 25% dari modal dasar.
                          </span>
                        </div>
                      )}

                      {/* Reminder to check latest Akta & SK AHU */}
                      <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800 leading-relaxed">
                        <span className="font-bold uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                          <span className="animate-pulse">💡</span> REKOMENDASI TERPENTING:
                        </span>
                        Harap sesuaikan nilai nominal saham, modal dasar, dan modal disetor ini dengan records pada <strong>Akta Perubahan terakhir</strong> dan <strong>SK AHU (Persetujuan Kemenkumham) terbaru</strong> dari PT Anda!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: AKTA PENDIRIAN */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="text-[#3b5998] w-4.5 h-4.5" />
                    <h4 className="font-bold text-[13px] text-slate-800 uppercase">Data Akta Pendirian PT</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateData({
                        establishmentNotary: 'Nukantini Putri Parincha',
                        establishmentNotaryTitle: 'Sarjana Hukum, Magister Kenotariatan',
                        establishmentNotaryDomicile: 'Kabupaten Bandung Barat'
                      });
                    }}
                    className="text-[10px] bg-green-50 hover:bg-green-100 text-green-700 font-bold px-2.5 py-1 rounded border border-green-200 transition-colors uppercase tracking-wider"
                  >
                    ✨ Pakai Notaris Nukantini
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nomor Akta Pendirian</label>
                      <input 
                        type="text"
                        className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Contoh: 05"
                        value={data.establishmentDeedNumber || ''}
                        onChange={e => updateData({ establishmentDeedNumber: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tanggal Akta Pendirian</label>
                      <input 
                        type="date"
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={data.establishmentDeedDate || ''}
                        onChange={e => updateData({ establishmentDeedDate: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nama Notaris Pendirian</label>
                      <input 
                        type="text"
                        className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Contoh: Nukantini Putri Parincha"
                        value={data.establishmentNotary || ''}
                        onChange={e => updateData({ establishmentNotary: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Gelar Notaris</label>
                      <input 
                        type="text"
                        className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Contoh: Sarjana Hukum, Magister Kenotariatan"
                        value={data.establishmentNotaryTitle || ''}
                        onChange={e => updateData({ establishmentNotaryTitle: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Kedudukan Notaris</label>
                      <input 
                        type="text"
                        className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Contoh: Kabupaten Bandung Barat"
                        value={data.establishmentNotaryDomicile || ''}
                        onChange={e => updateData({ establishmentNotaryDomicile: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">No SK Menkumham</label>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded px-2.5 py-2 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="AHU-XXXXX.AH.XX"
                          value={data.establishmentSkNumber || ''}
                          onChange={e => updateData({ establishmentSkNumber: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">Tgl SK Menkumham</label>
                        <input 
                          type="date"
                          className="w-full border border-slate-300 rounded px-2 py-1.5 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          value={data.establishmentSkDate || ''}
                          onChange={e => updateData({ establishmentSkDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: AKTA PERUBAHAN */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Scale className="text-[#3b5998] w-4.5 h-4.5" />
                  <h4 className="font-bold text-[13px] text-slate-800 uppercase">Apakah Ada Akta Perubahan?</h4>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      updateData({ rupstHasAmendments: 'tidak', amendmentDeeds: [] });
                    }}
                    className={`flex-1 p-4 rounded-lg border-2 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                      data.rupstHasAmendments === 'tidak' || !data.rupstHasAmendments || (data.amendmentDeeds || []).length === 0
                        ? 'border-blue-500 bg-blue-50/40 text-[#3b5998] font-bold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[12px]">NO</div>
                    <span className="font-bold text-[12px] uppercase">Tidak, hanya ada Akta Pendirian</span>
                    <span className="text-[10px] text-slate-400">Pilih jika tidak ada perubahan anggaran dasar/pengurus sebelumnya</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateData({ rupstHasAmendments: 'ya' });
                      if ((data.amendmentDeeds || []).length === 0) {
                        const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', skNumber: '', skDate: '', skSpDocuments: [] };
                        updateData({ amendmentDeeds: [newDeed], rupstHasAmendments: 'ya' });
                      }
                    }}
                    className={`flex-1 p-4 rounded-lg border-2 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                      data.rupstHasAmendments === 'ya' && (data.amendmentDeeds || []).length > 0
                        ? 'border-blue-500 bg-blue-50/40 text-[#3b5998] font-bold shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-[#3b5998] flex items-center justify-center font-bold text-[12px]">YES</div>
                    <span className="font-bold text-[12px] uppercase">Ya, Ada Akta Perubahan</span>
                    <span className="text-[10px] text-slate-400">Pilih untuk menginput satu atau beberapa Akta Perubahan</span>
                  </button>
                </div>

                {data.rupstHasAmendments === 'ya' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Daftar Akta Perubahan</h5>
                      <button 
                        type="button"
                        onClick={() => {
                          const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', skNumber: '', skDate: '', skSpDocuments: [] };
                          updateData({ amendmentDeeds: [...(data.amendmentDeeds || []), newDeed] });
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[11px] font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Tambah Akta Perubahan
                      </button>
                    </div>

                    {(data.amendmentDeeds || []).map((deed: any, index: number) => (
                      <div key={deed.id} className="border border-slate-200 rounded p-4 space-y-4 bg-slate-50/40 relative">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                          <h3 className="font-bold text-[11px] text-slate-700 uppercase tracking-tight flex items-center gap-1">
                            <FileText size={13} className="text-blue-500" /> Akta Perubahan {index + 1}
                          </h3>
                          <button 
                            type="button"
                            onClick={() => {
                              const newList = (data.amendmentDeeds || []).filter((d: any) => d.id !== deed.id);
                              updateData({ amendmentDeeds: newList });
                              if (newList.length === 0) {
                                updateData({ rupstHasAmendments: 'tidak' });
                              }
                            }}
                            className="text-red-500 hover:text-red-700 p-1 transition-colors cursor-pointer"
                            title="Hapus Akta Perubahan"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nomor Akta Perubahan <span className="text-red-500">*</span></label>
                              <input 
                                type="text"
                                className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                placeholder="Contoh: 12"
                                value={deed.number || ''}
                                onChange={e => {
                                  const newList = [...(data.amendmentDeeds || [])];
                                  newList[index] = { ...deed, number: e.target.value };
                                  updateData({ amendmentDeeds: newList });
                                }}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tanggal Akta Perubahan <span className="text-red-500">*</span></label>
                              <input 
                                type="date"
                                className="w-full border border-slate-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                value={deed.date || ''}
                                onChange={e => {
                                  const newList = [...(data.amendmentDeeds || [])];
                                  newList[index] = { ...deed, date: e.target.value };
                                  updateData({ amendmentDeeds: newList });
                                }}
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Pilih Notaris Perubahan</label>
                              <select
                                className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                                value={deed.notary === 'Nukantini Putri Parincha' ? 'saya' : (deed.notary ? 'manual' : '')}
                                onChange={e => {
                                  const val = e.target.value;
                                  const newList = [...(data.amendmentDeeds || [])];
                                  if (val === 'saya') {
                                    newList[index] = { 
                                      ...deed, 
                                      notary: 'Nukantini Putri Parincha',
                                      notaryTitle: 'Sarjana Hukum, Magister Kenotariatan',
                                      notaryDomicile: 'Kabupaten Bandung Barat'
                                    };
                                  } else {
                                    newList[index] = { 
                                      ...deed, 
                                      notary: '',
                                      notaryTitle: '',
                                      notaryDomicile: ''
                                    };
                                  }
                                  updateData({ amendmentDeeds: newList });
                                }}
                              >
                                <option value="">-- Pilih Notaris --</option>
                                <option value="saya">Saya (Nukantini Putri Parincha, SH., M.Kn.)</option>
                                <option value="manual">Input Bebas (Lainnya)</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {deed.notary !== 'Nukantini Putri Parincha' && (
                              <>
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nama Notaris Perubahan</label>
                                  <input 
                                    type="text"
                                    className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                    placeholder="Contoh: Budi Santoso"
                                    value={deed.notary || ''}
                                    onChange={e => {
                                      const newList = [...(data.amendmentDeeds || [])];
                                      newList[index] = { ...deed, notary: e.target.value };
                                      updateData({ amendmentDeeds: newList });
                                    }}
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Gelar Notaris</label>
                                    <input 
                                      type="text"
                                      className="w-full border border-slate-300 rounded px-3 py-2 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                      placeholder="Contoh: SH., M.Kn."
                                      value={deed.notaryTitle || ''}
                                      onChange={e => {
                                        const newList = [...(data.amendmentDeeds || [])];
                                        newList[index] = { ...deed, notaryTitle: e.target.value };
                                        updateData({ amendmentDeeds: newList });
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Kedudukan Notaris</label>
                                    <input 
                                      type="text"
                                      className="w-full border border-slate-300 rounded px-3 py-2 text-[11px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                      placeholder="Contoh: Kota Bandung"
                                      value={deed.notaryDomicile || ''}
                                      onChange={e => {
                                        const newList = [...(data.amendmentDeeds || [])];
                                        newList[index] = { ...deed, notaryDomicile: e.target.value };
                                        updateData({ amendmentDeeds: newList });
                                      }}
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            {deed.notary === 'Nukantini Putri Parincha' && (
                              <div className="bg-blue-50/40 p-3.5 rounded border border-blue-100 space-y-1 text-[11px] text-blue-800">
                                <p className="font-bold">Notaris Terpilih:</p>
                                <p><strong>Nama:</strong> Nukantini Putri Parincha, SH., M.Kn.</p>
                                <p><strong>Kedudukan:</strong> Kabupaten Bandung Barat</p>
                              </div>
                            )}

                            {/* SK/SP Section */}
                            <div className="bg-slate-100/50 p-3 rounded border border-slate-200 mt-2">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-slate-600 uppercase">Dokumen SK / SP Terkait</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newList = [...(data.amendmentDeeds || [])];
                                    const newDoc = { id: crypto.randomUUID(), type: 'SK', number: '', date: '' };
                                    newList[index] = { ...deed, skSpDocuments: [...(deed.skSpDocuments || []), newDoc] };
                                    updateData({ amendmentDeeds: newList });
                                  }}
                                  className="text-[9px] bg-white border border-blue-300 text-blue-700 font-bold px-2 py-0.5 rounded shadow-xs hover:bg-blue-50 transition-colors flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Plus size={10} /> Tambah SK/SP
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(deed.skSpDocuments || []).map((doc: any, docIdx: number) => (
                                  <div key={doc.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-slate-100 relative">
                                    <div className="sm:col-span-3">
                                      <select
                                        className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] focus:border-blue-500 outline-none bg-white"
                                        value={doc.type}
                                        onChange={e => {
                                          const newList = [...(data.amendmentDeeds || [])];
                                          const newDocs = [...(deed.skSpDocuments || [])];
                                          newDocs[docIdx] = { ...doc, type: e.target.value as any };
                                          newList[index] = { ...deed, skSpDocuments: newDocs };
                                          updateData({ amendmentDeeds: newList });
                                        }}
                                      >
                                        <option value="SK">SK (Keputusan)</option>
                                        <option value="SP_DATA_PERSEROAN">SP (Perubahan Data)</option>
                                        <option value="SP_ANGGARAN_DASAR">SP (Perubahan AD)</option>
                                        <option value="SP">SP (Lainnya)</option>
                                      </select>
                                    </div>
                                    <div className="sm:col-span-4">
                                      <input 
                                        type="text"
                                        className="w-full border border-slate-200 rounded px-2 py-1 text-[10px] focus:border-blue-500 outline-none font-bold"
                                        placeholder="Nomor SK/SP"
                                        value={doc.number || ''}
                                        onChange={e => {
                                          const newList = [...(data.amendmentDeeds || [])];
                                          const newDocs = [...(deed.skSpDocuments || [])];
                                          newDocs[docIdx] = { ...doc, number: e.target.value };
                                          newList[index] = { ...deed, skSpDocuments: newDocs };
                                          updateData({ amendmentDeeds: newList });
                                        }}
                                      />
                                    </div>
                                    <div className="sm:col-span-4">
                                      <input 
                                        type="date"
                                        className="w-full border border-slate-200 rounded px-2 py-1 text-[10px] focus:border-blue-500 outline-none"
                                        value={doc.date || ''}
                                        onChange={e => {
                                          const newList = [...(data.amendmentDeeds || [])];
                                          const newDocs = [...(deed.skSpDocuments || [])];
                                          newDocs[docIdx] = { ...doc, date: e.target.value };
                                          newList[index] = { ...deed, skSpDocuments: newDocs };
                                          updateData({ amendmentDeeds: newList });
                                        }}
                                      />
                                    </div>
                                    <div className="sm:col-span-1 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newList = [...(data.amendmentDeeds || [])];
                                          const newDocs = (deed.skSpDocuments || []).filter((d: any) => d.id !== doc.id);
                                          newList[index] = { ...deed, skSpDocuments: newDocs };
                                          updateData({ amendmentDeeds: newList });
                                        }}
                                        className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {(deed.skSpDocuments || []).length === 0 && (
                                  <div className="text-[9px] text-slate-400 italic text-center py-1">Belum ada SK/SP ditambahkan</div>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* STEP 5: DAFTAR PESERTA RAPAT */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Users2 className="text-[#3b5998] w-4.5 h-4.5" />
                    <h4 className="font-bold text-[13px] text-slate-800 uppercase">Input Peserta Rapat (Korum Attendance)</h4>
                  </div>
                  <button 
                    type="button"
                    onClick={() => openShareholderEditor('lama')} 
                    className="bg-[#3b5998] hover:bg-[#2d4373] text-white px-3 py-1.5 rounded text-[11px] font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> TAMBAH PESERTA
                  </button>
                </div>

                {/* Korum Tracker Header */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-2">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-[11px] font-extrabold text-slate-600 uppercase flex items-center gap-1.5">
                      <Users size={14} className="text-blue-500" /> Status Korum Kehadiran:
                    </h5>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${totalSharesInputted > ((data.originalTotalShares || 0) / 2) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {totalSharesInputted > ((data.originalTotalShares || 0) / 2) ? 'Korum Terpenuhi' : 'Belum Korum'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Hadir (Lembar):</span>
                      <div className="text-[14px] font-extrabold text-[#3b5998]">
                        {formatNumber(totalSharesInputted)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase mb-1">Target Minimal (50%+1):</span>
                      <div className="text-[14px] font-extrabold text-slate-400">
                        {formatNumber(Math.floor((data.originalTotalShares || 0) / 2) + 1)}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden border border-slate-300">
                    <div 
                      className={`h-full transition-all duration-500 ${totalSharesInputted > ((data.originalTotalShares || 0) / 2) ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, (totalSharesInputted / (data.originalTotalShares || 1)) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px]">
                    <span className="font-bold text-slate-500">{Math.round((totalSharesInputted / (data.originalTotalShares || 1)) * 100)}% Kehadiran</span>
                    <span className="italic text-slate-400 font-medium">Wajib minimal 50% + 1 saham disetor</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="border border-slate-200 overflow-hidden rounded-md bg-slate-50/50">
                    <div className="hidden md:block">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#f1f5f9] border-b border-slate-200 font-bold uppercase text-slate-600">
                          <tr>
                            <th className="p-2 border-r border-slate-200">Nama</th>
                            <th className="p-2 border-r border-slate-200">Klasifikasi</th>
                            <th className="p-2 border-r border-slate-200 text-right">Shares Owned</th>
                            <th className="p-2 border-r border-slate-200">Jabatan Pengurus</th>
                            <th className="p-2 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.shareholders || []).map((s: any) => (
                             <tr key={s.id} className="border-b border-slate-200 bg-white last:border-0 hover:bg-slate-50 transition-colors text-[10.5px]">
                               <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                               <td className="p-2 border-r border-slate-200">Tanpa Klasifikasi</td>
                               <td className="p-2 border-r border-slate-200 font-bold text-right text-slate-700">{formatNumber(s.sharesOwned)} lembar</td>
                               <td className="p-2 border-r border-slate-200 font-bold uppercase text-blue-600">
                                 {s.isManagement ? (s.managementPosition || 'DIREKTUR') : '-'}
                               </td>
                               <td className="p-2 text-center">
                                 <div className="flex items-center justify-center gap-2">
                                   <button 
                                     onClick={() => openShareholderEditor('lama', s)} 
                                     className="text-blue-500 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                                   >
                                     <Eye size={12} /> Edit
                                   </button>
                                   <span className="text-slate-200">|</span>
                                   <button 
                                     onClick={() => deleteShareholder(s.id, 'lama')} 
                                     className="text-red-500 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                                   >
                                     <Trash2 size={12} /> Hapus
                                   </button>
                                  </div>
                               </td>
                             </tr>
                          ))}
                          {(data.shareholders || []).length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400 italic bg-white">
                                Belum ada data pengurus atau pemegang saham. Klik tombol "Tambah Peserta Rapat" untuk mulai mendata.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Mobile Card Layout for Shareholders */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {(data.shareholders || []).map((s: any) => (
                        <div key={s.id} className="p-3 bg-white space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="font-bold text-[12px] text-slate-800 uppercase">{s.name}</div>
                            <div className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {s.isManagement ? (s.managementPosition || 'DIREKTUR') : 'PEMEGANG SAHAM'}
                            </div>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Kepemilikan Saham:</span>
                            <span className="font-bold text-slate-700">{formatNumber(s.sharesOwned)} Lembar</span>
                          </div>
                          <div className="flex items-center justify-end gap-4 pt-1 border-t border-slate-50">
                            <button onClick={() => openShareholderEditor('lama', s)} className="text-blue-600 text-[11px] font-bold flex items-center gap-1 active:scale-95">
                              <Eye size={13} /> Edit Data
                            </button>
                            <button onClick={() => deleteShareholder(s.id, 'lama')} className="text-red-600 text-[11px] font-bold flex items-center gap-1 active:scale-95">
                              <Trash2 size={13} /> Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                      {(data.shareholders || []).length === 0 && (
                        <div className="p-8 text-center text-slate-400 italic bg-white text-[11px]">
                          Belum ada data pengurus atau pemegang saham.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats & Validation warning inside current step */}
                  <div className="text-[11px] font-bold text-slate-700 bg-[#f8fafc] p-3 rounded-lg border border-slate-200 space-y-1.5 uppercase">
                    <div className="flex justify-between">
                      <span>Total Saham Ter-input:</span>
                      <span className="text-slate-800">{formatNumber(totalSharesInputted)} lembar</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Modal Disetor (Target):</span>
                      <span className="text-slate-800">{formatNumber(data.originalTotalShares || 0)} lembar</span>
                    </div>

                    {isSharesMismatched && (
                      <div className="text-amber-700 font-medium normal-case/initial text-[10.5px] mt-2 bg-amber-50 p-2.5 rounded border border-amber-200 flex gap-2 items-start tracking-tight leading-relaxed">
                        <AlertTriangle size={15} className="shrink-0 text-amber-500 mt-0.5" />
                        <div>
                          <strong>Perhatian:</strong> Jumlah saham yang diinput ({formatNumber(totalSharesInputted)} lembar) 
                          berbeda dengan Modal Disetor ({formatNumber(data.originalTotalShares || 0)} lembar). 
                          Pastikan jumlahnya sama agar akurat dalam dokumen!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: PASAL KUORUM */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Scale className="text-[#3b5998] w-4.5 h-4.5" />
                  <h4 className="font-bold text-[13px] text-slate-800 uppercase">Ketentuan Anggaran Dasar - Kuorum</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Pasal Anggaran Dasar (Kuorum) <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="Contoh: 10"
                      value={data.rupstQuorumArticle || ''}
                      onChange={e => updateData({ rupstQuorumArticle: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Cek di Akta Pendirian/Perubahan terakhir bagian RUPS.</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Ayat Anggaran Dasar (Kuorum)</label>
                    <input 
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="Contoh: 1"
                      value={data.rupstQuorumParagraph || ''}
                      onChange={e => updateData({ rupstQuorumParagraph: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 7: PASAL PIMPINAN RAPAT */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Scale className="text-[#3b5998] w-4.5 h-4.5" />
                  <h4 className="font-bold text-[13px] text-slate-800 uppercase">Ketentuan Anggaran Dasar - Pimpinan Rapat</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Pasal Anggaran Dasar (Pimpinan) <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="Contoh: 9"
                      value={data.rupstAdArticle || ''}
                      onChange={e => updateData({ rupstAdArticle: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Biasanya mengatur bahwa Direktur Utama / Komisaris Utama memimpin rapat.</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Ayat Anggaran Dasar (Pimpinan)</label>
                    <input 
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="Contoh: 4"
                      value={data.rupstAdParagraph || ''}
                      onChange={e => updateData({ rupstAdParagraph: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: PILIH PIMPINAN RAPAT */}
            {currentStep === 8 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Award className="text-[#3b5998] w-4.5 h-4.5" />
                  <h4 className="font-bold text-[13px] text-slate-800 uppercase">Penentuan Pimpinan Rapat</h4>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Pilih Pimpinan Rapat <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white font-bold"
                      value={data.meetingChair || ''}
                      onChange={e => {
                        const selectedName = e.target.value;
                        const sh = (data.shareholders || []).find((s: any) => s.name === selectedName);
                        updateData({ 
                          meetingChair: selectedName,
                          meetingChairPosition: sh?.isManagement ? (sh.managementPosition || "Direktur") : "Pemegang Saham"
                        });
                      }}
                    >
                      <option value="">-- Pilih Nama Pimpinan --</option>
                      {(data.shareholders || []).map((s: any) => (
                        <option key={s.id} value={s.name}>{s.salutation} {s.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Pilih dari daftar peserta rapat yang sudah diinput sebelumnya.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Jabatan Pimpinan Rapat <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                      placeholder="Contoh: Direktur Utama"
                      value={data.meetingChairPosition || ''}
                      onChange={e => updateData({ meetingChairPosition: e.target.value })}
                    />
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800 italic">
                    Tips: Sesuai Anggaran Dasar PT pada umumnya, Rapat dipimpin oleh Direktur Utama atau Komisaris Utama. Pastikan orang yang dipilih hadir sebagai Peserta Rapat.
                  </div>
                </div>
              </div>
            )}

            {/* STEP 9: HASIL KEUANGAN & DIVIDEN */}
            {currentStep === 9 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <TrendingUp className="text-[#3b5998] w-4.5 h-4.5" />
                  <h4 className="font-bold text-[13px] text-slate-800 uppercase">Agenda Agenda RUPST & Keuangan</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Laba Bersih Tahun Buku (Rupiah) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[12px] font-bold">Rp.</span>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-[12px] font-bold focus:border-blue-500 focus:ring-1"
                          placeholder="Laba bersih tahun buku"
                          value={data.rupstNetProfit === 0 ? '' : formatNumber(data.rupstNetProfit)}
                          onChange={e => updateData({ rupstNetProfit: parseNumber(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Dividen Yang Dibagikan (Rupiah)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[12px] font-bold">Rp.</span>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-[12px] font-bold focus:border-blue-500"
                          placeholder="Nilai keseluruhan dividen yang dibagikan"
                          value={data.rupstDividendAmount === 0 ? '' : formatNumber(data.rupstDividendAmount)}
                          onChange={e => updateData({ rupstDividendAmount: parseNumber(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Saldo Laba Tahun Sebelumnya (Rupiah)</label>
                      <div className="relative mb-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[12px] font-bold">Rp.</span>
                        <input 
                          type="text"
                          className="w-full border border-slate-300 rounded pl-10 pr-3 py-2 text-[12px] font-bold focus:border-blue-500"
                          placeholder="Saldo laba ditahan tahun lalu"
                          value={data.rupstRetainedProfit === 0 ? '' : formatNumber(data.rupstRetainedProfit)}
                          onChange={e => updateData({ rupstRetainedProfit: parseNumber(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col justify-center">
                    <h5 className="text-[11.5px] font-bold text-blue-800 uppercase mb-2">Simulasi Laba Rugi:</h5>
                    
                    <div className="space-y-2 bg-white p-3 rounded-md border border-blue-100">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Laba Bersih Tahun Ini:</span>
                        <span className="font-bold text-slate-800">Rp. {formatNumber(data.rupstNetProfit || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Dikurangi Dividen:</span>
                        <span className="font-bold text-red-650">- Rp. {formatNumber(data.rupstDividendAmount || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Saldo Laba Tahun Lalu:</span>
                        <span className="font-bold text-slate-800">Rp. {formatNumber(data.rupstRetainedProfit || 0)}</span>
                      </div>
                      <div className="h-px bg-slate-200 my-1"></div>
                      <div className="flex justify-between text-[12px] font-extrabold text-[#3b5998]">
                        <span>Total Laba Ditahan:</span>
                        <span>Rp. {formatNumber(
                          (data.rupstNetProfit || 0) + (data.rupstRetainedProfit || 0) - (data.rupstDividendAmount || 0)
                        )}</span>
                      </div>
                    </div>
                    
                    <label className="flex items-center text-[10px] text-slate-600 gap-1.5 cursor-pointer mt-3 font-medium">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        checked={data.rupstShowRetainedProfit ?? (data.rupstRetainedProfit !== 0 && data.rupstRetainedProfit !== undefined)}
                        onChange={e => updateData({ rupstShowRetainedProfit: e.target.checked })}
                      />
                      <span className="mt-[2px]">Tampilkan Saldo Ditahan Tahun Sebelumnya di Akta dan Notulen (Meskipun nilainya 0)</span>
                    </label>

                    <p className="text-[9px] text-slate-400 mt-2.5">
                      * Selisih antara Laba Bersih dan Dividen akan dimasukkan sebagai Laba Ditahan yang memperkuat ekuitas perseroan.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 10: KUESIONER AUDIT LAPORAN KEUANGAN */}
            {currentStep === 10 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1">
                  <ShieldCheck className="text-emerald-650 w-4.5 h-4.5" />
                  <h4 className="font-bold text-[13px] text-slate-800 uppercase">Kuesioner Kewajiban Audit Laporan Keuangan (UU PT No. 40/2007)</h4>
                </div>
                
                <p className="text-[11px] text-orange-600 bg-orange-50 border border-orange-100 p-2 rounded leading-relaxed mb-4">
                  💡 <strong>Catatan:</strong> Bagian ini secara absolut default-nya kosong (belum terpilih ya). 
                  Silakan pilih <strong>YA</strong> atau <strong>TIDAK</strong> di setiap kuesioner di bawah ini.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                  
                  {/* Quest A */}
                  <div className="p-3 bg-white border border-slate-200. shadow-sm rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold rounded px-1.5 py-0.5 uppercase tracking-wide">Kuesioner A</span>
                      <p className="text-[11.5px] font-bold text-slate-800 mt-1 leading-tight">Apakah kegiatan usaha PT menghimpun dan/atau mengelola dana masyarakat?</p>
                      <p className="text-[9.5px] text-slate-400 leading-normal mt-0.5">(Misalnya bank, reksadana, asuransi, dll)</p>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end border-t border-slate-100 pt-2.5">
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionA: 'ya' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionA === 'ya' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        YA
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionA: 'tidak' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionA === 'tidak' 
                            ? 'bg-slate-705 bg-slate-700 text-white border-slate-700' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        TIDAK
                      </button>
                    </div>
                  </div>

                  {/* Quest B */}
                  <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold rounded px-1.5 py-0.5 uppercase tracking-wide">Kuesioner B</span>
                      <p className="text-[11.5px] font-bold text-slate-800 mt-1 leading-tight">Apakah PT menerbitkan surat pengakuan utang kepada masyarakat?</p>
                      <p className="text-[9.5px] text-slate-400 leading-normal mt-0.5">(Misalnya obligasi, surat utang komersial dll)</p>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end border-t border-slate-100 pt-2.5">
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionB: 'ya' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionB === 'ya' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        YA
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionB: 'tidak' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionB === 'tidak' 
                            ? 'bg-slate-700 text-white border-slate-700' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        TIDAK
                      </button>
                    </div>
                  </div>

                  {/* Quest C */}
                  <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold rounded px-1.5 py-0.5 uppercase tracking-wide">Kuesioner C</span>
                      <p className="text-[11.5px] font-bold text-slate-800 mt-1 leading-tight">Apakah PT merupakan Perseroan Terbuka (Tbk.)?</p>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end border-t border-slate-100 pt-2.5">
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionC: 'ya' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionC === 'ya' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        YA
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionC: 'tidak' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionC === 'tidak' 
                            ? 'bg-slate-700 text-white border-slate-700' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        TIDAK
                      </button>
                    </div>
                  </div>

                  {/* Quest D */}
                  <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold rounded px-1.5 py-0.5 uppercase tracking-wide">Kuesioner D</span>
                      <p className="text-[11.5px] font-bold text-slate-800 mt-1 leading-tight">Apakah PT merupakan Badan Usaha Milik Negara (BUMN)?</p>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end border-t border-slate-100 pt-2.5">
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionD: 'ya' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionD === 'ya' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        YA
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionD: 'tidak' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionD === 'tidak' 
                            ? 'bg-slate-700 text-white border-slate-700' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        TIDAK
                      </button>
                    </div>
                  </div>

                  {/* Quest E */}
                  <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold rounded px-1.5 py-0.5 uppercase tracking-wide">Kuesioner E</span>
                      <p className="text-[11.5px] font-bold text-slate-800 mt-1 leading-tight">Apakah nilai aset PT sedikitnya berjumlah Rp. 50 Miliar?</p>
                      <p className="text-[9px] text-slate-400 mt-0.5Leading-normal">* Berdasarkan Laporan Posisi Keuangan (Neraca) tahun buku bersangkutan</p>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end border-t border-slate-100 pt-2.5">
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionE: 'ya' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionE === 'ya' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        YA
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionE: 'tidak' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionE === 'tidak' 
                            ? 'bg-slate-700 text-white border-slate-700' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        TIDAK
                      </button>
                    </div>
                  </div>

                  {/* Quest F */}
                  <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold rounded px-1.5 py-0.5 uppercase tracking-wide">Kuesioner F</span>
                      <p className="text-[11.5px] font-bold text-slate-800 mt-1 leading-tight">Apakah nilai omset/peredaran usaha PT berjumlah sedikitnya Rp. 50 Miliar?</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">* Berdasarkan Laporan Laba Rugi Komprehensif tahun buku bersangkutan</p>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end border-t border-slate-100 pt-2.5">
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionF: 'ya' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionF === 'ya' 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        YA
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateData({ rupstQuestionF: 'tidak' })}
                        className={`px-4 py-1.5 text-[11px] font-bold rounded transition-all flex items-center gap-1 border ${
                          data.rupstQuestionF === 'tidak' 
                            ? 'bg-slate-700 text-white border-slate-700' 
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        TIDAK
                      </button>
                    </div>
                  </div>

                </div>

                {/* Display calculated Audit Verdict */}
                {(() => {
                  const isAudited = 
                    data.rupstQuestionA === 'ya' || 
                    data.rupstQuestionB === 'ya' || 
                    data.rupstQuestionC === 'ya' || 
                    data.rupstQuestionD === 'ya' || 
                    data.rupstQuestionE === 'ya' || 
                    data.rupstQuestionF === 'ya';

                  const anyUnselected = 
                    !data.rupstQuestionA || 
                    !data.rupstQuestionB || 
                    !data.rupstQuestionC || 
                    !data.rupstQuestionD || 
                    !data.rupstQuestionE || 
                    !data.rupstQuestionF;

                  if (anyUnselected) return (
                    <div className="p-3 rounded bg-slate-100 text-slate-650 text-[11px] border border-slate-200 mt-2 font-bold uppercase flex items-center gap-2">
                      <Bot className="w-4 h-4 text-slate-550 shrink-0" />
                      Sila tentukan semua pilihan di atas untuk melihat kesimpulan kewajiban audit PT Anda ...
                    </div>
                  );
                  
                  return (
                    <div className={`p-4 rounded-lg flex items-center gap-3 mt-3 border transition-colors ${
                      isAudited 
                        ? 'bg-red-50 text-red-800 border-red-200' 
                        : 'bg-green-50 text-green-800 border-green-200'
                    }`}>
                      <CheckCircle2 className={`w-6 h-6 shrink-0 ${isAudited ? 'text-red-500' : 'text-green-500'}`} />
                      <div>
                        <div className="text-[12.5px] font-black uppercase tracking-wider">
                          KESIMPULAN: {isAudited ? 'LAPORAN KEUANGAN WAJIB DIAUDIT' : 'LAPORAN KEUANGAN TIDAK WAJIB DIAUDIT'}
                        </div>
                        <p className="text-[10.5px] font-normal leading-relaxed text-slate-600 mt-0.5/initial">
                          {isAudited 
                            ? 'Berdasarkan Pasal 68 UU PT No.40/2007, dikarenakan ada satu atau lebih jawaban kuesioner bernilai "YA", maka Laporan Keuangan Perseroan ini wajib diaudit oleh Kantor Akuntan Publik (KAP).' 
                            : 'Dikarenakan semua instrumen pengisian kuesioner bernilai "TIDAK", maka Perseroan Anda dibebaskan dari audit akuntan publik untuk laporan tahunan bersangkutan.'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* STEP 11: DETAIL PELAKSANAAN RAPAT */}
            {currentStep === 11 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Calendar className="text-[#3b5998] w-4.5 h-4.5" />
                  <h4 className="font-bold text-[13px] text-slate-800 uppercase">Detail Penyelenggaraan Rapat</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tanggal Rapat <span className="text-red-500">*</span></label>
                      <input 
                        type="date"
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 font-bold"
                        value={data.signingDate || ''}
                        onChange={e => updateData({ signingDate: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Jam Mulai <span className="text-red-500">*</span></label>
                        <input 
                          type="time"
                          className="w-full border border-slate-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 font-bold"
                          value={data.meetingStartTime || ''}
                          onChange={e => updateData({ meetingStartTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Jam Selesai <span className="text-red-500">*</span></label>
                        <input 
                          type="time"
                          className="w-full border border-slate-300 rounded px-3 py-1.5 text-[12px] focus:border-blue-500 font-bold"
                          value={data.rupstMeetingEndTime || ''}
                          onChange={e => updateData({ rupstMeetingEndTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Tempat Penyelenggaraan Rapat <span className="text-red-500">*</span></label>
                      <textarea 
                        className="w-full border border-slate-300 rounded px-3 py-2 text-[12px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-h-[100px]"
                        placeholder="Contoh: Kantor Perseroan, Jalan Asia Afrika No. 123, Bandung"
                        value={data.signingPlace || ''}
                        onChange={e => updateData({ signingPlace: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Lower Navigation Controls inside Wizard Card */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 pt-4 mt-6">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`w-full sm:w-auto px-6 py-2.5 text-[12px] font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
              currentStep === 1 
                ? 'text-slate-300 cursor-not-allowed bg-slate-50 border border-slate-100' 
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200/80 active:scale-95 border border-slate-200'
            }`}
          >
            <ChevronLeft size={16} /> Sebelumnya
          </button>
          
          <div className="hidden sm:block text-[11px] text-slate-400 font-bold uppercase tracking-widest">
            PROGRES: {currentStep} / {totalSteps}
          </div>
          <div className="sm:hidden text-[10px] text-slate-400 font-bold uppercase tracking-widest -mt-2">
            Langkah {currentStep} dari {totalSteps}
          </div>
 
          <button
            type="button"
            onClick={currentStep === totalSteps ? undefined : handleNext}
            className={`w-full sm:w-auto px-8 py-2.5 text-[12px] font-black rounded-md flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm ${
              currentStep === totalSteps
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default font-extrabold'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {currentStep === totalSteps ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" /> SIAP DOWNLOAD!
              </>
            ) : (
              <>
                Selanjutnya <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
