import React, { useState, useEffect } from 'react';
import { 
    FileText, ArrowLeft, HeadphonesIcon, HelpCircle, 
    CheckCircle2, Navigation, LogOut, Lock, ShieldCheck, 
    Clock, BookOpen, Building2, Map, Users, AlertCircle, Phone, FileBox,
    Sparkles, Bot, Trash2, Plus, Eye, History, ChevronDown, ChevronRight,
    Printer, FileCode, FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RupstInteractiveAssistant } from './RupstInteractiveAssistant';
import ShareholderForm from '../../components/ShareholderForm';
import ProxyInputModal from '../../components/ProxyInputModal';
import { formatInputNumber, parseFormattedNumber } from '../../utils/formatters';

const STEPS = [
    { id: 1, title: "Identitas Perseroan" },
    { id: 2, title: "Modal & Struktur Saham" },
    { id: 3, title: "Akta Pendirian" },
    { id: 4, title: "Akta Perubahan" },
    { id: 5, title: "Peserta Rapat (Kuorum)" },
    { id: 6, title: "Ketentuan Kuorum" },
    { id: 7, title: "Ketentuan Pimpinan Rapat" },
    { id: 8, title: "Penentuan Pimpinan Rapat" },
    { id: 9, title: "Agenda & Keuangan" },
    { id: 10, title: "Kuesioner Audit" },
    { id: 11, title: "Penyelenggaraan Rapat" }
];

const FORM_SECTIONS = [
    { id: "sec_identitas", title: "Data Utama Perseroan" },
    { id: "sec_akta", title: "Akta Pendirian & Perubahan" },
    { id: "sec_peserta", title: "Peserta Rapat" },
    { id: "sec_agenda", title: "Agenda & Keuangan" },
    { id: "sec_penyelenggaraan", title: "Penyelenggaraan Rapat" },
    { id: "sec_kehadiran", title: "Kehadiran Pemegang Saham" },
    { id: "sec_kuasa", title: "Kuasa Notaril" }
];

// Compact AHU Style Helper Components
const AhuSection = ({ id, title, children }: { id?: string, title: string, children: React.ReactNode }) => {
    const [open, setOpen] = useState(true);
    return (
        <div id={id} className="bg-white border border-slate-200 rounded-sm mb-4 shadow-sm scroll-mt-6">
            <div 
                onClick={() => setOpen(!open)}
                className="bg-[#f5f5f5] px-4 py-2 flex justify-between items-center cursor-pointer border-b border-slate-200 group"
            >
                <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#3b5998]"></span>
                    {title}
                </h3>
                {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
            {open && <div className="p-4 md:p-5 text-[13px]">{children}</div>}
        </div>
    );
};

const AhuLabel = ({ label, required = false }: { label: string, required?: boolean }) => (
    <label className="block text-[12px] font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
    </label>
);

const AhuInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
        {...props} 
        className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[12px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 ${className}`} 
    />
);

const AhuSelect = ({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select 
        {...props} 
        className={`w-full border border-[#ccc] rounded-sm px-3 py-1.5 text-[12px] outline-none focus:border-[#66afe9] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,.075),0_0_8px_rgba(102,175,233,.6)] transition-all bg-white text-slate-800 appearance-none ${className}`}
    >
        {children}
    </select>
);

export const RupstPublicWizard = ({ data, updateData, isSaving, handleSave, goBack, openShareholderEditor, deleteShareholder }: any) => {
    const [currentStep, setCurrentStep] = useState<number>(0); // 0 = welcome screen
    const [rupstInputMode, setRupstInputMode] = useState<'form' | 'assistant'>('assistant');
    const [proxyModalOpenId, setProxyModalOpenId] = useState<string | null>(null);
    const [isReadyToDownload, setIsReadyToDownload] = useState<boolean>(false);

    useEffect(() => {
        if (rupstInputMode === 'assistant' && currentStep < 11) {
            setIsReadyToDownload(false);
        }
    }, [currentStep, rupstInputMode]);

    const calculateProgress = () => {
        if (currentStep === 0) return 0;
        return Math.round(((currentStep - 1) / STEPS.length) * 100);
    };

    const handleQuestionChange = (questionKey: string, answer: 'ya' | 'tidak') => {
        const updatedAnswers = {
            rupstQuestionA: data.rupstQuestionA,
            rupstQuestionB: data.rupstQuestionB,
            rupstQuestionC: data.rupstQuestionC,
            rupstQuestionD: data.rupstQuestionD,
            rupstQuestionE: data.rupstQuestionE,
            rupstQuestionF: data.rupstQuestionF,
            [questionKey]: answer
        };

        const isAudited = Object.values(updatedAnswers).some(val => val === 'ya');

        const updates: any = {
            [questionKey]: answer,
            rupstIsAudited: isAudited,
            rupstAlasanAuditA: isAudited ? (updatedAnswers.rupstQuestionA === 'ya') : true,
            rupstAlasanAuditB: isAudited ? (updatedAnswers.rupstQuestionB === 'ya') : true,
            rupstAlasanAuditC: isAudited ? (updatedAnswers.rupstQuestionC === 'ya') : true,
            rupstAlasanAuditD: isAudited ? (updatedAnswers.rupstQuestionD === 'ya') : true,
            rupstAlasanAuditE: isAudited ? (updatedAnswers.rupstQuestionE === 'ya') : true,
            rupstAlasanAuditF: isAudited ? (updatedAnswers.rupstQuestionF === 'ya') : true,
        };

        if (isAudited) {
            updates.rupstStatementNeraca = true;
            updates.rupstStatementLabaRugi = true;
            updates.rupstStatementPerubahanEkuitas = true;
            updates.rupstStatementArusKas = true;
            updates.rupstStatementCatatan = true;
            updates.rupstStatementNamaAnggota = true;
            updates.rupstStatementGaji = true;
        }

        updateData(updates);
    };

    const handleDownloadNotulen = async () => {
        try {
            const { generateRUPSTDocx } = await import('../lib/generateRUPSTDocx');
            await generateRUPSTDocx(data);
        } catch (err) {
            console.error(err);
            alert('Gagal menghasilkan RUPST DOCX.');
        }
    };

    const handleDownloadPernyataan = async () => {
        try {
            const { generateRUPSTPernyataanDocx } = await import('../lib/generateRUPSTPernyataanDocx');
            await generateRUPSTPernyataanDocx(data);
        } catch (err) {
            console.error(err);
            alert('Gagal menghasilkan Surat Pernyataan DOCX.');
        }
    };

    return (
        <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-800 overflow-hidden relative">
            
            {/* LEFT SIDEBAR NAVBAR */}
            <div className="w-[280px] bg-white border-r border-slate-200 shadow-sm flex flex-col shrink-0 z-10">
                <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="w-9 h-9 rounded-md bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                        <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-[13px] uppercase tracking-wide">RUPST Public</h2>
                        <p className="text-[11px] text-slate-500 leading-none mt-1">Saran KBLI & Notulen</p>
                    </div>
                </div>

                <div className="p-4 border-b border-slate-100 bg-white">
                    <button 
                        onClick={goBack}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[12px] font-semibold transition-colors border border-blue-100"
                    >
                        <FileBox className="w-4 h-4" /> Lihat Notulen Sebelumnya
                    </button>
                    
                    {currentStep !== 0 && rupstInputMode === 'assistant' && (
                        <div className="mt-4">
                            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">PROGRES PENGISIAN</h3>
                            <div className="flex items-end justify-between mb-1">
                                <span className="text-2xl font-extrabold text-blue-600">{calculateProgress()}%</span>
                                <span className="text-[11px] text-slate-500 font-medium mb-0.5">Langkah {currentStep} dari 11</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${calculateProgress()}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* SIDEBAR NAVIGATION LIST (Contextual based on Active Mode) */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {currentStep === 0 ? (
                        <div className="space-y-4 text-slate-500">
                            <p className="text-[12px]">Silakan klik tombol <b>Mulai Pengisian</b> untuk membuka isian Notulen RUPST dengan lengkap.</p>
                            <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded text-[11px] text-amber-800 space-y-1.5">
                                <span className="font-bold block uppercase tracking-wider">Info Penting:</span>
                                <div>KBLI yang dimasukkan dapat sama dengan Saran KBLI / RUPS LB Anda.</div>
                            </div>
                        </div>
                    ) : rupstInputMode === 'assistant' ? (
                        <>
                            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">DAFTAR LANGKAH</h3>
                            <div className="space-y-0.5">
                                {STEPS.map((step) => {
                                    const isPast = step.id < currentStep;
                                    const isCurrent = step.id === currentStep;
                                    return (
                                        <button
                                            key={step.id}
                                            onClick={() => setCurrentStep(step.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded transition-colors text-left ${
                                                isCurrent ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                                                isCurrent ? 'bg-blue-600 text-white border-blue-600' :
                                                isPast ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white text-slate-400 border-slate-200'
                                            }`}>
                                                {step.id}
                                            </div>
                                            <span className="text-[12px] truncate">{step.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">NAVIGASI FORMULIR</h3>
                            <div className="space-y-0.5">
                                {FORM_SECTIONS.map((sec) => (
                                    <button
                                        key={sec.id}
                                        onClick={() => {
                                            document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        className="w-full text-left px-3 py-1.5 rounded text-[12px] text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-all"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        <span className="truncate">{sec.title}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2.5 text-slate-700 mb-2">
                        <HeadphonesIcon className="w-4 h-4 text-blue-500" />
                        <div>
                            <h4 className="font-bold text-[11px]">Butuh bantuan?</h4>
                            <p className="text-[10px] text-slate-500">Hubungi CS Nukantini Putri</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTAINER */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar bg-[#f1f5f9]">
                
                {/* TOP MODE TOGGLE HEADER Bar */}
                {currentStep !== 0 && (
                    <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-3 sticky top-0 z-20 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 animate-pulse text-blue-500" />
                            <div>
                                <span className="text-[12px] font-extrabold text-slate-800 uppercase block">Mode Input Terinteraksi</span>
                                <span className="text-[10px] text-slate-500 block">Samakan dengan format RUPST logged-in</span>
                            </div>
                        </div>
                        
                        <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setRupstInputMode('assistant')}
                                className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                                    rupstInputMode === 'assistant'
                                        ? 'bg-white text-[#3b5998] shadow-sm'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                <Bot className="w-3.5 h-3.5" /> Asisten Interaktif
                            </button>
                            <button
                                type="button"
                                onClick={() => setRupstInputMode('form')}
                                className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                                    rupstInputMode === 'form'
                                        ? 'bg-white text-[#3b5998] shadow-sm'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5" /> Formulir Lengkap
                            </button>
                        </div>
                    </div>
                )}

                <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                    
                    {/* MIDDLE INPUT AREA */}
                    <div className="xl:col-span-2 flex flex-col space-y-4">
                        
                        <AnimatePresence mode="wait">
                            {currentStep === 0 ? (
                                <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                                    className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full"
                                >
                                    <div className="p-8 flex-1 relative flex flex-col justify-center min-h-[400px]">
                                        <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
                                        <div className="z-10 max-w-md">
                                            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight mb-2">Memulai RUPST Public</h1>
                                            <p className="text-[13px] text-slate-600 mb-6 leading-relaxed">
                                                Layanan pembuatan Notulen Rapat Umum Pemegang Saham Tahunan (RUPST) mandiri tanpa login. Hasil input data aman dan dapat langsung diekspor ke Microsoft Word (.docx).
                                            </p>
                                            
                                            <div className="space-y-4 mb-6">
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-bold text-[12px]">✓</div>
                                                    <div>
                                                        <h4 className="font-bold text-[13px] text-slate-800 leading-none">Format Input Sama dengan Versi Login</h4>
                                                        <p className="text-[11px] text-slate-500 mt-1">Dapat diinput via Asisten Interaktif ataupun pengisian Formulir Lengkap sekaligus.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600 font-bold text-[12px]">✓</div>
                                                    <div>
                                                        <h4 className="font-bold text-[13px] text-slate-800 leading-none">Mendukung Ekspor Word Mandiri</h4>
                                                        <p className="text-[11px] text-slate-500 mt-1">Gunakan template resmi dari Notaris Nukantini Putri secara gratis dan instan.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button onClick={() => setCurrentStep(1)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[12px] flex items-center gap-1.5 shadow-md">
                                                    Mulai Pengisian RUPST <Navigation className="w-3.5 h-3.5 rotate-90" />
                                                </button>
                                                <button onClick={goBack} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 font-semibold text-[12px]">
                                                    Keluar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : rupstInputMode === 'assistant' ? (
                                <motion.div key="assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="flex-1 p-5">
                                        <RupstInteractiveAssistant 
                                            data={data}
                                            updateData={updateData}
                                            openShareholderEditor={openShareholderEditor} 
                                            deleteShareholder={deleteShareholder}
                                            externalStep={currentStep}
                                            setExternalStep={setCurrentStep}
                                            hideHeader={true}
                                        />
                                    </div>
                                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <button onClick={() => setCurrentStep(prev => prev > 1 ? prev - 1 : 0)} className="px-4 py-2 border border-slate-200 rounded bg-white hover:bg-slate-50 text-[12px] font-bold text-slate-600">Sebelumnya</button>
                                        
                                        {currentStep < 11 ? (
                                            <button onClick={() => setCurrentStep(prev => prev + 1)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[12px] font-bold shadow">Selanjutnya</button>
                                        ) : (
                                            <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[12px] font-bold shadow">
                                                {isSaving ? 'Menyimpan...' : 'Kirim dan Simpan ke Notaris'}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                    
                                    {/* FORM SECTION 1: DATA UTAMA PERSEROAN */}
                                    <AhuSection id="sec_identitas" title="DATA UTAMA PERSEROAN">
                                        <div className="space-y-3.5">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                <AhuLabel label="Nama PT (Perseroan)" required />
                                                <div className="md:col-span-3">
                                                    <AhuInput 
                                                        placeholder="Contoh: PT SARANA MAKMUR SEJAHTERA"
                                                        value={data.companyName || ''} 
                                                        onChange={e => updateData({ companyName: e.target.value.toUpperCase() })} 
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                <AhuLabel label="Kedudukan PT (Kab/Kota)" required />
                                                <div className="md:col-span-3">
                                                    <AhuInput 
                                                        placeholder="Contoh: KOTA BANDUNG atau KABUPATEN INDRAMAYU"
                                                        value={data.domicile || ''} 
                                                        onChange={e => updateData({ domicile: e.target.value.toUpperCase() })} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start mt-2">
                                                <AhuLabel label="Detail Alamat PT" required />
                                                <div className="md:col-span-3 space-y-3">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama Jalan / Blok / Nomor Rumah</span>
                                                        <AhuInput 
                                                            placeholder="Contoh: Jalan Asia Afrika Nomor 123"
                                                            value={data.rupstStreet || ''} 
                                                            onChange={e => updateData({ rupstStreet: e.target.value })} 
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">RT</span>
                                                            <AhuInput placeholder="001" value={data.rupstRt || ''} onChange={e => updateData({ rupstRt: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">RW</span>
                                                            <AhuInput placeholder="005" value={data.rupstRw || ''} onChange={e => updateData({ rupstRw: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kelurahan / Desa</span>
                                                            <AhuInput placeholder="Braga" value={data.rupstKelurahan || ''} onChange={e => updateData({ rupstKelurahan: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kecamatan</span>
                                                            <AhuInput placeholder="Sumur Bandung" value={data.rupstKecamatan || ''} onChange={e => updateData({ rupstKecamatan: e.target.value })} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                <AhuLabel label="Nilai Nominal Per Saham" required />
                                                <div className="md:col-span-3 relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]">Rp.</span>
                                                    <AhuInput 
                                                        className="pl-10"
                                                        placeholder="Contoh: 100.000"
                                                        value={data.originalSharePrice === 0 ? '' : formatInputNumber(data.originalSharePrice)} 
                                                        onChange={e => updateData({ originalSharePrice: parseFormattedNumber(e.target.value) })} 
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                <AhuLabel label="Total Modal Dasar (Lembar)" required />
                                                <div className="md:col-span-3 flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <AhuInput 
                                                            placeholder="Contoh: 10.000"
                                                            value={data.originalAuthorizedShares === 0 ? '' : formatInputNumber(data.originalAuthorizedShares)} 
                                                            onChange={e => updateData({ originalAuthorizedShares: parseFormattedNumber(e.target.value) })} 
                                                        />
                                                    </div>
                                                    <div className="text-[12px] font-bold text-slate-500 w-36">
                                                        Rp. {formatInputNumber((data.originalAuthorizedShares || 0) * (data.originalSharePrice || 0))}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                <AhuLabel label="Total Modal Disetor (Lembar)" required />
                                                <div className="md:col-span-3 flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <AhuInput 
                                                            placeholder="Contoh: 2.500"
                                                            value={data.originalTotalShares === 0 ? '' : formatInputNumber(data.originalTotalShares)} 
                                                            onChange={e => updateData({ originalTotalShares: parseFormattedNumber(e.target.value) })} 
                                                        />
                                                    </div>
                                                    <div className="text-[12px] font-bold text-slate-500 w-36">
                                                        Rp. {formatInputNumber((data.originalTotalShares || 0) * (data.originalSharePrice || 0))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </AhuSection>

                                    {/* FORM SECTION 2: AKTA PENDIRIAN DAN PERUBAHAN */}
                                    <AhuSection id="sec_akta" title="AKTA PENDIRIAN DAN PERUBAHAN">
                                        <div className="space-y-4">
                                            <div className="border border-slate-100 rounded-sm p-4 space-y-3 bg-white/50">
                                                <h3 className="font-bold text-[12px] text-slate-800">Akta Pendirian</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                    <AhuLabel label="Nomor Akta" />
                                                    <div className="md:col-span-3">
                                                        <AhuInput value={data.establishmentDeedNumber || ''} onChange={e => updateData({ establishmentDeedNumber: e.target.value })} placeholder="Contoh: 12" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                    <AhuLabel label="Tanggal Akta" />
                                                    <div className="md:col-span-3">
                                                        <AhuInput type="date" value={data.establishmentDeedDate || ''} onChange={e => updateData({ establishmentDeedDate: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                    <AhuLabel label="Nama Notaris Pendirian" />
                                                    <div className="md:col-span-3">
                                                        <AhuInput value={data.establishmentNotary || ''} onChange={e => updateData({ establishmentNotary: e.target.value })} placeholder="Nama Notaris" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                    <AhuLabel label="Kedudukan Notaris" />
                                                    <div className="md:col-span-3">
                                                        <AhuInput value={data.establishmentNotaryDomicile || ''} onChange={e => updateData({ establishmentNotaryDomicile: e.target.value })} placeholder="Kedudukan" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                    <AhuLabel label="Nomor SK" />
                                                    <div className="md:col-span-3">
                                                        <AhuInput value={data.establishmentSkNumber || ''} onChange={e => updateData({ establishmentSkNumber: e.target.value })} placeholder="Nomor SK Kemenkumham" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                                    <AhuLabel label="Tanggal SK" />
                                                    <div className="md:col-span-3">
                                                        <AhuInput type="date" value={data.establishmentSkDate || ''} onChange={e => updateData({ establishmentSkDate: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dynamic Amendment Deeds list */}
                                            {(data.amendmentDeeds || []).map((deed: any, index: number) => (
                                                <div key={deed.id} className="border border-slate-100 rounded-sm p-4 space-y-3 bg-[#fafafa] relative">
                                                    <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-2">
                                                        <h3 className="font-bold text-[12px] text-slate-800 uppercase tracking-tight">Akta Perubahan {index + 1}</h3>
                                                        <button 
                                                            onClick={() => {
                                                                const newList = (data.amendmentDeeds || []).filter((d: any) => d.id !== deed.id);
                                                                updateData({ amendmentDeeds: newList });
                                                            }}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                        <div className="md:col-span-2">
                                                            <AhuLabel label="Nomor Akta" />
                                                            <AhuInput value={deed.number || ''} onChange={e => {
                                                                const newList = [...(data.amendmentDeeds || [])];
                                                                newList[index] = { ...deed, number: e.target.value };
                                                                updateData({ amendmentDeeds: newList });
                                                            }} />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <AhuLabel label="Tanggal Akta" />
                                                            <AhuInput type="date" value={deed.date || ''} onChange={e => {
                                                                const newList = [...(data.amendmentDeeds || [])];
                                                                newList[index] = { ...deed, date: e.target.value };
                                                                updateData({ amendmentDeeds: newList });
                                                            }} />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                                        <div className="md:col-span-2">
                                                            <AhuLabel label="Nama Notaris" />
                                                            <AhuInput value={deed.notary || ''} onChange={e => {
                                                                const newList = [...(data.amendmentDeeds || [])];
                                                                newList[index] = { ...deed, notary: e.target.value };
                                                                updateData({ amendmentDeeds: newList });
                                                            }} />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <AhuLabel label="Kedudukan Notaris" />
                                                            <AhuInput value={deed.notaryDomicile || ''} onChange={e => {
                                                                const newList = [...(data.amendmentDeeds || [])];
                                                                newList[index] = { ...deed, notaryDomicile: e.target.value };
                                                                updateData({ amendmentDeeds: newList });
                                                            }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    const newDeed = { id: crypto.randomUUID(), number: '', date: '', notary: '', skSpDocuments: [] };
                                                    updateData({ amendmentDeeds: [...(data.amendmentDeeds || []), newDeed] });
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded text-slate-400 hover:border-[#3b5998] hover:text-[#3b5998] hover:bg-slate-50 transition-all text-[12px] font-bold uppercase tracking-wider"
                                            >
                                                <Plus size={15} /> Tambah Akta Perubahan (Opsional)
                                            </button>
                                        </div>
                                    </AhuSection>

                                    {/* FORM SECTION 3: PESERTA RAPAT */}
                                    <AhuSection id="sec_peserta" title="PESERTA RAPAT (PEMEGANG SAHAM & PENGURUS)">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-200 gap-4">
                                                <div>
                                                    <div className="text-[12px] font-bold text-[#3b5998] uppercase">Peserta Rapat & Pemegang Saham</div>
                                                    <p className="text-[11px] text-slate-500">Mendukung input pemegang saham individu, direksi, maupun komisaris.</p>
                                                </div>
                                                <button 
                                                    onClick={() => openShareholderEditor('lama')} 
                                                    className="bg-[#3b5998] text-white px-3 py-1.5 rounded text-[11px] font-bold shadow hover:bg-black transition-colors flex items-center gap-1 shrink-0"
                                                >
                                                    <Plus size={13} /> TAMBAH PESERTA
                                                </button>
                                            </div>

                                            <div className="border border-slate-200 overflow-x-auto rounded">
                                                <table className="w-full text-left text-[11px]">
                                                    <thead className="bg-[#f9f9f9] border-b border-slate-200 font-bold uppercase">
                                                        <tr>
                                                            <th className="p-2 border-r border-slate-200">Nama</th>
                                                            <th className="p-2 border-r border-slate-200">Saham (Lembar)</th>
                                                            <th className="p-2 border-r border-slate-200">Jabatan</th>
                                                            <th className="p-2 border-r border-slate-200">Nominal</th>
                                                            <th className="p-2 text-center w-28">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(data.shareholders || []).map((s: any) => (
                                                            <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 text-[11px]">
                                                                <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.name}</td>
                                                                <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned)}</td>
                                                                <td className="p-2 border-r border-slate-200 font-bold uppercase">{s.isManagement ? (s.managementPosition || 'DS') : '-'}</td>
                                                                <td className="p-2 border-r border-slate-200">Rp. {formatInputNumber(s.sharesOwned * data.originalSharePrice)}</td>
                                                                <td className="p-2 text-center flex items-center justify-center gap-2">
                                                                    <button onClick={() => openShareholderEditor('lama', s)} className="text-blue-600 hover:underline flex items-center gap-0.5"><Eye size={12} /> Edit</button>
                                                                    <span className="text-slate-200">|</span>
                                                                    <button onClick={() => deleteShareholder(s.id, 'lama')} className="text-red-500 hover:underline flex items-center gap-0.5"><Trash2 size={12} /> Hapus</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {(data.shareholders || []).length === 0 && (
                                                            <tr>
                                                                <td colSpan={5} className="p-4 text-center text-slate-400 italic">Belum ada data pengurus/pemegang saham. Silakan klik tombol "TAMBAH PESERTA".</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </AhuSection>

                                    {/* FORM SECTION 4: AGENDA DAN KEUANGAN RUPST */}
                                    <AhuSection id="sec_agenda" title="AGENDA DAN KEUANGAN RUPST">
                                        <div className="space-y-4">
                                            {/* AUDIT KUESIONER */}
                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
                                                <div className="border-b border-slate-200 pb-1.5">
                                                    <span className="text-[12px] font-bold text-[#3b5998]">📋 KUESIONER KEWAJIBAN AUDIT LAPORAN KEUANGAN</span>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">Silakan isi kuesioner berikut untuk menentukan status wajib audit secara otomatis.</p>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    {[
                                                        { key: 'rupstQuestionA', text: 'a. Apakah Kegiatan Usaha Perseroan menghimpun dan/atau mengelola dana masyarakat?' },
                                                        { key: 'rupstQuestionB', text: 'b. Apakah Perseroan menerbitkan surat pengakuan utang kepada masyarakat?' },
                                                        { key: 'rupstQuestionC', text: 'c. Apakah Perseroan merupakan Perseroan Terbuka (Tbk)?' },
                                                        { key: 'rupstQuestionD', text: 'd. Apakah Perseroan merupakan Perseroan?' },
                                                        { key: 'rupstQuestionE', text: 'e. Apakah nilai Aset dan/atau jumlah peredaran usaha Perseroan lebih dari Rp 50 Milyar?' },
                                                        { key: 'rupstQuestionF', text: 'f. Apakah Perseroan diwajibkan audit oleh peraturan perundang-undangan?' }
                                                    ].map((q) => (
                                                        <div key={q.key} className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-[12px] border-b border-dashed border-slate-100 pb-2.5 last:border-0 last:pb-0">
                                                            <span className="font-medium text-slate-600 flex-1">{q.text}</span>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuestionChange(q.key, 'ya')}
                                                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded border ${
                                                                        (data as any)[q.key] === 'ya'
                                                                            ? 'bg-red-500 text-white border-red-500'
                                                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    Ya
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleQuestionChange(q.key, 'tidak')}
                                                                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded border ${
                                                                        (data as any)[q.key] === 'tidak'
                                                                            ? 'bg-slate-700 text-white border-slate-700'
                                                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                                    }`}
                                                                >
                                                                    Tidak
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className={`mt-3 p-3 rounded border flex items-center justify-between transition-all ${
                                                    data.rupstIsAudited 
                                                        ? 'bg-red-50 border-red-200 text-red-800' 
                                                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                }`}>
                                                    <span className="font-bold flex items-center gap-1">
                                                        STATUS AUDIT: &nbsp;
                                                        <span className={`px-2 py-0.5 rounded text-[10px] text-white font-extrabold uppercase ${data.rupstIsAudited ? 'bg-red-600' : 'bg-emerald-600'}`}>
                                                            {data.rupstIsAudited ? 'Wajib Audit' : 'Tidak Wajib Audit'}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* FINANCIAL YEARS & COGNATES */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-3">
                                                    <div>
                                                        <AhuLabel label="Tahun Buku" required />
                                                        <AhuInput value={data.rupstFiscalYear || ''} onChange={e => updateData({ rupstFiscalYear: e.target.value })} placeholder="Contoh: 2025" />
                                                    </div>
                                                    <div>
                                                        <AhuLabel label="Nomor Laporan Keuangan" />
                                                        <AhuInput value={data.rupstFinancialReportNumber || ''} onChange={e => updateData({ rupstFinancialReportNumber: e.target.value })} placeholder="Contoh: LP/25/2025" />
                                                    </div>
                                                    <div>
                                                        <AhuLabel label="Tanggal Laporan Keuangan" />
                                                        <AhuInput type="date" value={data.rupstFinancialReportDate || ''} onChange={e => updateData({ rupstFinancialReportDate: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <AhuLabel label="Laba Bersih (Rp)" />
                                                        <AhuInput value={formatInputNumber(data.rupstNetProfit)} onChange={e => updateData({ rupstNetProfit: parseFormattedNumber(e.target.value) })} />
                                                    </div>
                                                    <div>
                                                        <AhuLabel label="Dividen Dibagikan (Rp)" />
                                                        <AhuInput value={formatInputNumber(data.rupstDividendAmount)} onChange={e => updateData({ rupstDividendAmount: parseFormattedNumber(e.target.value) })} />
                                                    </div>
                                                    <div>
                                                        <AhuLabel label="Saldo Laba/Rugi Ditahan Tahun Sebelumnya (Rp)" />
                                                        <AhuInput value={formatInputNumber(data.rupstRetainedProfit)} onChange={e => updateData({ rupstRetainedProfit: parseFormattedNumber(e.target.value) })} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </AhuSection>

                                    {/* FORM SECTION 5: DATA PENYELENGGARAAN RAPAT */}
                                    <AhuSection id="sec_penyelenggaraan" title="DATA PENYELENGGARAAN RAPAT">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <AhuLabel label="Nomor Pemanggilan RUPST" />
                                                    <AhuInput value={data.rupstInvitationNumber || ''} onChange={e => updateData({ rupstInvitationNumber: e.target.value })} />
                                                </div>
                                                <div>
                                                    <AhuLabel label="Tanggal Pemanggilan RUPST" />
                                                    <AhuInput type="date" value={data.rupstInvitationDate || ''} onChange={e => updateData({ rupstInvitationDate: e.target.value })} />
                                                </div>
                                                <div>
                                                    <AhuLabel label="Tempat Penyelenggaraan" />
                                                    <AhuInput value={data.signingPlace || ''} onChange={e => updateData({ signingPlace: e.target.value })} />
                                                </div>
                                                <div>
                                                    <AhuLabel label="Hari/Tanggal Penandatangan / Rapat" />
                                                    <AhuInput type="date" value={data.signingDate || ''} onChange={e => updateData({ signingDate: e.target.value })} />
                                                </div>
                                                <div>
                                                    <AhuLabel label="Jam Mulai" />
                                                    <AhuInput type="time" value={data.meetingStartTime || ''} onChange={e => updateData({ meetingStartTime: e.target.value })} />
                                                </div>
                                                <div>
                                                    <AhuLabel label="Jam Selesai" />
                                                    <AhuInput type="time" value={data.rupstMeetingEndTime || ''} onChange={e => updateData({ rupstMeetingEndTime: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </AhuSection>

                                    {/* FORM SECTION 6: KEHADIRAN PEMEGANG SAHAM */}
                                    <AhuSection id="sec_kehadiran" title="KEHADIRAN PEMEGANG SAHAM">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center bg-slate-50 p-2 border border-slate-200 rounded">
                                                <span className="font-bold">Kehadiran Daftar Pemegang Saham</span>
                                                <button 
                                                    onClick={() => {
                                                        const newList = (data.shareholders || []).map((s: any) => ({ ...s, isPresent: true }));
                                                        updateData({ shareholders: newList });
                                                    }}
                                                    className="bg-[#3b5998] hover:bg-blue-800 text-white font-bold px-3 py-1 rounded text-[11px]"
                                                >
                                                    Tandai Semua Hadir
                                                </button>
                                            </div>

                                            <div className="border border-slate-200 rounded overflow-hidden">
                                                <table className="w-full text-left text-[11px]">
                                                    <thead className="bg-[#f9f9f9] border-b border-sidebar-200 font-bold uppercase">
                                                        <tr>
                                                            <th className="p-2 border-r border-slate-200">Nama</th>
                                                            <th className="p-2 border-r border-slate-200">Saham</th>
                                                            <th className="p-2 border-r border-slate-200 text-center w-16">Hadir</th>
                                                            <th className="p-2 border-r border-slate-200 text-center w-24">Dikuasakan</th>
                                                            <th className="p-2 text-center">Penerima Kuasa</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(data.shareholders || []).map((s: any) => (
                                                            <tr key={s.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50">
                                                                <td className="p-2 border-r border-slate-200 font-medium uppercase">{s.name}</td>
                                                                <td className="p-2 border-r border-slate-200">{formatInputNumber(s.sharesOwned)} Saham</td>
                                                                <td className="p-2 text-center border-r border-slate-200">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={s.isPresent || false} 
                                                                        onChange={e => {
                                                                            const newList = data.shareholders.map((item: any) =>
                                                                                item.id === s.id ? { ...item, isPresent: e.target.checked, isProxy: e.target.checked ? item.isProxy : false, proxyData: e.target.checked ? item.proxyData : undefined } : item
                                                                            );
                                                                            updateData({ shareholders: newList });
                                                                        }} 
                                                                    />
                                                                </td>
                                                                <td className="p-2 text-center border-r border-slate-200">
                                                                    {s.isPresent && (
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={s.isProxy || false} 
                                                                            onChange={e => {
                                                                                const newList = data.shareholders.map((item: any) =>
                                                                                    item.id === s.id ? { ...item, isProxy: e.target.checked, proxyData: e.target.checked ? item.proxyData : undefined } : item
                                                                                );
                                                                                updateData({ shareholders: newList });
                                                                            }} 
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    {s.isPresent && s.isProxy && (
                                                                        s.proxyData?.name ? (
                                                                            <div className="flex items-center justify-between px-1">
                                                                                <span className="font-bold uppercase truncate max-w-28">{s.proxyData.salutation} {s.proxyData.name}</span>
                                                                                <button onClick={() => setProxyModalOpenId(s.id)} className="text-blue-600 hover:underline">Ubah</button>
                                                                            </div>
                                                                        ) : (
                                                                            <button onClick={() => setProxyModalOpenId(s.id)} className="bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-bold hover:bg-orange-600 shadow-sm">+ Isi Data Kuasa</button>
                                                                        )
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </AhuSection>

                                    {/* FORM SECTION 7: KUASA NOTARIL */}
                                    <AhuSection id="sec_kuasa" title="Kuasa">
                                        <div className="space-y-4">
                                            <AhuLabel label="Pemberian Kuasa Notaril" required />
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        checked={data.representativeType === 'EXISTING'} 
                                                        onChange={() => updateData({ representativeType: 'EXISTING' })} 
                                                    />
                                                    <span>Dari Pemegang Saham</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        disabled
                                                        checked={data.representativeType === 'MANUAL'} 
                                                        onChange={() => updateData({ representativeType: 'MANUAL' })} 
                                                    />
                                                    <span className="text-slate-400">Input Manual (Khusus Login)</span>
                                                </label>
                                            </div>

                                            {data.representativeType === 'EXISTING' && (
                                                <div className="mt-3">
                                                    <AhuLabel label="Pilih Pemegang Saham" />
                                                    <AhuSelect 
                                                        value={data.authorizedRepresentativeId || ''} 
                                                        onChange={e => updateData({ authorizedRepresentativeId: e.target.value })}
                                                    >
                                                        <option value="">-- Pilih --</option>
                                                        {(data.shareholders || []).map((s: any) => (
                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                        ))}
                                                    </AhuSelect>
                                                </div>
                                            )}
                                        </div>
                                    </AhuSection>
                                    
                                    {/* SAVING / SUBMIT ACTION MODULE */}
                                    <div className="flex gap-4 p-4 bg-white border border-slate-200 rounded justify-end shadow-sm">
                                        <button onClick={handleSave} disabled={isSaving} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded text-[12px] shadow uppercase flex items-center gap-1.5 transition-colors">
                                            <CheckCircle2 size={15} /> {isSaving ? 'Menyimpan...' : 'Simpan dan Kirim ke Notaris'}
                                        </button>
                                    </div>

                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT COLUMN (Word Generation Action Panel & Ringkasan) */}
                    <div className="xl:col-span-1 space-y-4 shrink-0">
                        
                        {/* Word Exporter Card (Mandiri Export) */}
                        {currentStep !== 0 && (
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-gradient-to-r from-blue-50 to-white">
                                    <FileCode className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-extrabold text-[13px] text-slate-800 uppercase tracking-tight">Unduh Dokumen Mandiri</h3>
                                </div>
                                <div className="p-4 space-y-3.5">
                                    {!isReadyToDownload ? (
                                        <div className="text-center py-2 space-y-3">
                                            <p className="text-[12px] text-slate-500 leading-normal">
                                                {rupstInputMode === 'assistant' && currentStep < 11 
                                                    ? "Selesaikan pengisiar asisten interaktif hingga Langkah 11 untuk membuka tombol unduh." 
                                                    : "Jika semua data telah lengkap diisi, silakan klik tombol di bawah untuk bersiap mengunduh."}
                                            </p>
                                            {(rupstInputMode === 'form' || currentStep === 11) && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsReadyToDownload(true)}
                                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[12px] shadow-sm transition-all uppercase flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    <CheckCircle2 size={15} /> Siap Download (.docx)
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-[11.5px] text-slate-500 leading-normal">
                                                Tanpa harus login, Anda dipersilakan mengunduh draft resmi dari Nukantini Putri, SH., M.Kn secara langsung:
                                            </p>
                                            
                                            <button 
                                                onClick={handleDownloadNotulen}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded font-bold text-[12px] shadow-sm transition-all uppercase"
                                            >
                                                <FileCode size={16} /> Unduh Notulen RUPST (.doc)
                                            </button>

                                            <button 
                                                onClick={handleDownloadPernyataan}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[12px] shadow-sm transition-all uppercase"
                                            >
                                                <FileCheck size={16} /> Unduh Surat Pernyataan (.doc)
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setIsReadyToDownload(false)}
                                                className="w-full py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded font-semibold text-[11px] transition-all uppercase text-center mt-1 cursor-pointer block"
                                            >
                                                Ubah Data / Kembali
                                            </button>
                                        </>
                                    )}

                                    <div className="p-3 bg-blue-50 rounded text-[11px] text-blue-800 leading-normal border border-blue-100/50">
                                        💡 <b>Saran:</b> Pastikan semua isian PT dan Kuorum pemegang saham terisi dengan lengkap sebelum mengunduh.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-[#fffdf7] border border-[#fef0bc] rounded-lg shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-[#fef0bc]/60 flex items-center gap-2 bg-[#fffdf0]">
                                <FileText className="w-4 h-4 text-amber-500" />
                                <h3 className="font-bold text-[13px] text-amber-900 uppercase">Ringkasan Notulen</h3>
                            </div>
                            <div className="p-4 space-y-3 text-[12px]">
                                <div>
                                    <label className="text-[10px] text-amber-700/80 font-bold uppercase tracking-wider block mb-0.5">Nama Perseroan</label>
                                    <p className="font-black text-amber-900 uppercase truncate text-[13px]">{data.companyName || 'Belum diisi'}</p>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] text-amber-700/80 font-bold uppercase tracking-wider block mb-0.5">Tahun Buku</label>
                                    <p className="font-bold text-amber-900">{data.rupstFiscalYear || 'Belum diisi'}</p>
                                </div>

                                <div>
                                    <label className="text-[10px] text-amber-700/80 font-bold uppercase tracking-wider block mb-0.5">Audit Laporan Keuangan</label>
                                    <p className="font-semibold text-amber-950">
                                        {data.rupstIsAudited ? '⚠️ WAJIB AUDIT' : '✅ TIDAK WAJIB AUDIT'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Security Notice */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg shadow-sm p-4 flex gap-3 items-center">
                            <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div>
                                <h4 className="text-[12px] font-bold text-emerald-800">Aman & Terenkripsi</h4>
                                <p className="text-[10.5px] text-emerald-600 leading-tight">Data diisi langsung di peramban pribadi Anda.</p>
                            </div>
                        </div>
                    </div>
                </main>
                
                <footer className="text-center py-4 text-[11px] text-slate-400 font-medium">
                    <Lock className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Workspace Terlindungi Notaris Nukantini Putri Parincha
                </footer>
            </div>

            {/* Proxy Input Modal Render block */}
            {proxyModalOpenId && (() => {
                const sh = data.shareholders.find((s: any) => s.id === proxyModalOpenId);
                if (!sh) return null;

                const rawParties = [
                    ...(data.shareholders || []).map((s: any) => ({
                        name: s.name,
                        salutation: s.salutation || 'Tuan',
                        nik: s.nik || '',
                        birthCity: s.birthCity || '',
                        birthDate: s.birthDate || '',
                        occupation: s.occupation || '',
                        address: s.address,
                        nationalityType: s.nationalityType || 'WNI',
                        isForeign: s.isForeign || false,
                        nationality: s.nationality || '',
                        passportNumber: s.passportNumber || '',
                        kitasNumber: s.kitasNumber || '',
                        kitasType: s.kitasType || 'NONE',
                        hasKitas: s.hasKitas || false
                    })),
                ];

                const availableParties = rawParties.filter((item, index, self) => 
                    item.name && 
                    item.name.trim() !== '' &&
                    self.findIndex(t => t.name.trim().toUpperCase() === item.name.trim().toUpperCase()) === index
                );

                return (
                    <ProxyInputModal
                        isOpen={true}
                        shareholderName={`${sh.salutation || 'Tuan'} ${sh.name}`}
                        initialData={sh.proxyData}
                        availableParties={availableParties}
                        shareholder={sh}
                        profiles={[]}
                        onSave={(proxyData) => {
                            const newList = data.shareholders.map((item: any) =>
                                item.id === proxyModalOpenId ? { ...item, proxyData } : item
                            );
                            updateData({ shareholders: newList });
                            setProxyModalOpenId(null);
                        }}
                        onClose={() => setProxyModalOpenId(null)}
                    />
                );
            })()}

        </div>
    );
};
