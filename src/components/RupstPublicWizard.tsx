import React, { useState } from 'react';
import { 
    FileText, ArrowLeft, HeadphonesIcon, HelpCircle, 
    CheckCircle2, Navigation, LogOut, Lock, ShieldCheck, 
    Clock, BookOpen, Building2, Map, Users, AlertCircle, Phone, FileBox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RupstInteractiveAssistant } from './RupstInteractiveAssistant';

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

export const RupstPublicWizard = ({ data, updateData, isSaving, handleSave, goBack, openShareholderEditor, deleteShareholder }: any) => {
    const [currentStep, setCurrentStep] = useState<number>(0); // 0 = welcome screen

    const calculateProgress = () => {
        if (currentStep === 0) return 0;
        return Math.round(((currentStep - 1) / STEPS.length) * 100);
    };

    return (
        <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-800 overflow-hidden relative">
            
            {/* LEFT SIDEBAR */}
            <div className="w-[300px] bg-white border-r border-slate-200 shadow-sm flex flex-col shrink-0 z-10">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                        <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800 text-[14px]">RUPST PUBLIC</h2>
                        <p className="text-[12px] text-slate-500">Rapat Umum Pemegang<br/>Saham Tahunan</p>
                    </div>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <button 
                        onClick={goBack}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-[13px] font-medium transition-colors border border-blue-100"
                    >
                        <FileBox className="w-4 h-4" /> Lihat Notulen Sebelumnya
                    </button>
                    
                    <div className="mt-6">
                        <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3">PROGRES PENGISIAN</h3>
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-3xl font-extrabold text-blue-600">{calculateProgress()}%</span>
                            <span className="text-[12px] text-slate-500 font-medium mb-1">Langkah {currentStep === 0 ? 1 : currentStep} dari 11</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${calculateProgress()}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3">DAFTAR LANGKAH</h3>
                    <div className="space-y-1 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 before:-z-10 z-0">
                        {STEPS.map((step) => {
                            const isPast = step.id < (currentStep === 0 ? 1 : currentStep);
                            const isCurrent = step.id === (currentStep === 0 ? 1 : currentStep);
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => currentStep !== 0 && setCurrentStep(step.id)}
                                    // disabled={currentStep === 0}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left group ${
                                        isCurrent && currentStep !== 0 ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shadow-sm transition-colors ${
                                        isCurrent && currentStep !== 0 ? 'bg-blue-600 text-white border-2 border-blue-600' : 
                                        isPast ? 'bg-white text-slate-500 border-2 border-slate-200' : 'bg-white text-slate-400 border-2 border-slate-100'
                                    }`}>
                                        {step.id}
                                    </div>
                                    <span className={`text-[13px] font-medium transition-colors ${
                                        isCurrent && currentStep !== 0 ? 'text-blue-700 font-bold' : 
                                        isPast ? 'text-slate-700' : 'text-slate-500'
                                    }`}>
                                        {step.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 text-slate-700 mb-3">
                        <HeadphonesIcon className="w-5 h-5 text-blue-500" />
                        <div>
                            <h4 className="font-bold text-[13px]">Butuh bantuan?</h4>
                            <p className="text-[11px] text-slate-500">Tim kami siap membantu Anda.</p>
                        </div>
                    </div>
                    <button className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-md text-[12px] font-bold text-slate-600 flex justify-center items-center gap-2 shadow-sm transition-colors">
                        <Phone className="w-3.5 h-3.5" /> Hubungi Support
                    </button>
                </div>
            </div>

            {/* MIDDLE AND RIGHT COLUMNS WRAPPER */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar relative">
                <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                    
                    {/* MIDDLE COLUMN (Wizard Main Form / Welcome Screen) */}
                    <div className="xl:col-span-2 flex flex-col space-y-6">
                        
                        {/* Horizontal Stepper (Only visible on Welcome or Steps) */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-hidden hidden md:block">
                            <div className="flex items-center justify-between relative px-4">
                                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 -z-10"></div>
                                {STEPS.map((step) => {
                                    const isCurrent = step.id === (currentStep === 0 ? 1 : currentStep);
                                    const isPast = step.id < (currentStep === 0 ? 1 : currentStep);
                                    return (
                                        <div key={step.id} className="flex flex-col items-center gap-2 z-0 relative group">
                                            <div className="absolute left-0 right-1/2 top-[13px] -translate-y-1/2 h-0.5 bg-blue-500 -z-10" style={{ display: isPast || isCurrent ? 'block' : 'none' }}></div>
                                            <div className="absolute left-1/2 right-0 top-[13px] -translate-y-1/2 h-0.5 bg-blue-500 -z-10" style={{ display: isPast ? 'block' : 'none' }}></div>
                                            
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors border-[3px] box-content ${
                                                isCurrent && currentStep !== 0 ? 'bg-blue-600 text-white border-blue-100 shadow-sm' : 
                                                isPast ? 'bg-slate-100 text-slate-500 border-white' : 'bg-slate-50 text-slate-400 border-white'
                                            }`}>
                                                {step.id}
                                            </div>
                                            <div className="text-[10px] font-semibold text-center whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5 text-slate-500">
                                                {step.title}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {currentStep === 0 ? (
                                <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full"
                                >
                                    <div className="p-8 md:p-10 flex-1 relative flex flex-col justify-center min-h-[400px]">
                                        {/* Background pattern layer */}
                                        <div className="absolute inset-0 z-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
                                        
                                        <div className="z-10 max-w-lg mb-8">
                                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-2">Selamat datang!</h1>
                                            <h2 className="text-2xl md:text-3xl font-medium text-slate-700 tracking-tight mb-4">Mari mulai membuat <br/><span className="text-blue-600 font-black">Notulen RUPST.</span></h2>
                                            <p className="text-[14px] text-slate-600 mb-8 leading-relaxed">
                                                Ikuti langkah-langkah berikut secara berurutan. Data yang Anda isi akan digunakan untuk membuat draft notulen secara otomatis.
                                            </p>
                                            
                                            <div className="space-y-5">
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-[14px] text-slate-800 mb-1">Aman & Terjaga</h4>
                                                        <p className="text-[12px] text-slate-500 leading-relaxed">Data Anda disimpan dengan aman dan hanya dapat diakses oleh Anda.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                                                        <Clock className="w-5 h-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-[14px] text-slate-800 mb-1">Mudah & Cepat</h4>
                                                        <p className="text-[12px] text-slate-500 leading-relaxed">Isi data secara bertahap dengan panduan di setiap langkah.</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                                                        <FileText className="w-5 h-5 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-[14px] text-slate-800 mb-1">Hasil Akurat</h4>
                                                        <p className="text-[12px] text-slate-500 leading-relaxed">Draft notulen disesuaikan dengan ketentuan AD dan peraturan yang berlaku.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stylized Building Illustration Area */}
                                        <div className="hidden lg:block absolute bottom-10 right-10 w-[240px] opacity-90 pointer-events-none">
                                            {/* Using Lucide Building as a placeholder for the illustration */}
                                            <div className="relative w-full aspect-square">
                                                <div className="absolute inset-0 bg-blue-50 rounded-full blur-3xl opacity-60 mix-blend-multiply"></div>
                                                <Building2 className="w-full h-full text-slate-200" strokeWidth={0.5} />
                                                <div className="absolute bottom-5 -left-10 bg-white/90 backdrop-blur border border-slate-200 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-blue-600 rounded-sm flex items-center text-white font-bold justify-center text-[10px]">M</div>
                                                    <span className="text-[11px] font-bold text-slate-700 tracking-wider">PT MAJU BERSAMA</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-blue-50/50 border-t border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="flex items-start gap-3 bg-white p-3 rounded-md border border-blue-100 shadow-sm flex-1">
                                            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                            <div>
                                                <h5 className="text-[13px] font-bold text-slate-700 mb-0.5">Catatan</h5>
                                                <p className="text-[12px] text-slate-500">Pastikan data yang Anda masukkan sesuai dengan dokumen resmi perusahaan.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 shrink-0">
                                            <button onClick={goBack} className="px-5 py-2.5 rounded-md text-[13px] font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 transition-colors flex items-center gap-2">
                                                <ArrowLeft className="w-4 h-4" /> Keluar
                                            </button>
                                            <button onClick={() => setCurrentStep(1)} className="px-5 py-2.5 rounded-md text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all flex items-center gap-2">
                                                Mulai Pengisian <Navigation className="w-4 h-4 rotate-90" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="form" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="h-full">
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hidden">
                                        {/* We keep the assistant component but override styling if needed, or simply render it. */}
                                    </div>
                                    
                                    {/* Instead, we re-render the existing component structure but tailored for wizard flow */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                                        <div className="flex-1 p-6">
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
                                            <button onClick={() => setCurrentStep(prev => prev > 1 ? prev - 1 : 0)} className="px-4 py-2 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-[13px] font-bold text-slate-600">Sebelumnya</button>
                                            
                                            {currentStep < 11 ? (
                                                <button onClick={() => setCurrentStep(prev => Math.min(11, prev + 1))} className="px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-sm transition-colors">Selanjutnya</button>
                                            ) : (
                                                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[13px] font-bold shadow-sm transition-colors">
                                                    {isSaving ? 'Menyimpan...' : 'Simpan Notulen'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT COLUMN (Info Cards) */}
                    <div className="xl:col-span-1 space-y-6">
                        
                        {/* Ringkasan RUPST Card */}
                        <div className="bg-[#fffdf7] border border-[#fef0bc] rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-[#fef0bc]/60 flex items-center gap-2">
                                <FileText className="w-4.5 h-4.5 text-amber-500" />
                                <h3 className="font-bold text-[14px] text-amber-900">Ringkasan RUPST</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-[11px] text-amber-700/80 font-bold uppercase tracking-wider mb-1 block">Jenis Rapat</label>
                                    <div className="bg-white border border-[#fef0bc]/60 px-3 py-2 rounded-md text-[13px] font-medium text-slate-700 w-max shadow-sm">
                                        RUPST - Tahunan
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[11px] text-amber-700/80 font-bold uppercase tracking-wider mb-1 block">Tahun Buku</label>
                                    <div className="text-[14px] font-bold text-amber-900 border-b border-amber-200/50 pb-2">
                                        {data.rupstFiscalYear || '2024'}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] text-amber-700/80 font-bold uppercase tracking-wider mb-1 block">Perkiraan Tanggal Rapat</label>
                                    <div className="text-[13px] font-medium text-amber-900 border-b border-amber-200/50 pb-2">
                                        {data.rupstMeetingDate ? new Date(data.rupstMeetingDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '--'}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] text-amber-700/80 font-bold uppercase tracking-wider mb-1 block">Tempat Rapat</label>
                                    <div className="text-[13px] font-medium text-amber-900 border-b border-amber-200/50 pb-2">
                                        {data.rupstMeetingLocation || '--'}
                                    </div>
                                </div>
                                
                                {data.companyName && (
                                    <div className="mt-4 pt-4 border-t border-amber-200/50">
                                        <label className="text-[10px] text-amber-700/80 font-bold uppercase tracking-wider mb-1.5 block">Perseroan:</label>
                                        <div className="font-black text-amber-900 text-[14px] uppercase">{data.companyName}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Panduan Pengisian Card */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                                <BookOpen className="w-4.5 h-4.5 text-blue-600" />
                                <h3 className="font-bold text-[14px] text-slate-800">Panduan Pengisian</h3>
                            </div>
                            <div className="p-5 space-y-5">
                                <div className="flex gap-3 items-start">
                                    <div className="mt-0.5 shrink-0">
                                        <FileBox className="w-4.5 h-4.5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-slate-800 mb-0.5">Siapkan dokumen perusahaan</h4>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">Seperti Akta Pendirian, Akta Perubahan, dan data pemegang saham.</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                    <div className="mt-0.5 shrink-0">
                                        <AlertCircle className="w-4.5 h-4.5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-slate-800 mb-0.5">Isi data sesuai urutan langkah</h4>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">Setiap langkah saling terhubung dan mempengaruhi hasil akhir.</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                    <div className="mt-0.5 shrink-0">
                                        <FileText className="w-4.5 h-4.5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-bold text-slate-800 mb-0.5">Simpan secara berkala</h4>
                                        <p className="text-[11px] text-slate-500 leading-relaxed">Data yang sudah diisi akan tersimpan otomatis jika menekan simpan.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Notice */}
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm overflow-hidden p-4 flex gap-3 items-center">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
                                <Lock className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="text-[13px] font-bold text-emerald-800 mb-0.5">Data Anda aman</h4>
                                <p className="text-[11px] text-emerald-600 leading-relaxed">Kami tidak menyimpan informasi tanpa izin Anda.</p>
                            </div>
                        </div>
                    </div>
                </main>
                
                <footer className="text-center py-6 text-[11px] text-slate-400 font-medium">
                    <Lock className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Data Anda aman. Kami tidak menyimpan informasi tanpa izin Anda.
                </footer>
            </div>
        </div>
    );
};

