import fs from 'fs';

let code = fs.readFileSync('App.tsx', 'utf8');

// Update imports
if (!code.includes("import { Modal }")) {
  code = code.replace(/import \{ ([^{}]+) \} from 'lucide-react';/, "import { $1, ChevronRight, CheckCircle2 } from 'lucide-react';\nimport { Modal } from './components/Modal';");
}

// Ensure activeTab can be null
code = code.replace(/useState<TabId>\('general'\)/, "useState<TabId | null>(null)");

// Find the horizontal menu
const menuStart = code.indexOf('<div className="flex items-center gap-2 p-4 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10 overflow-x-auto scrollbar-hide shadow-sm">');
const menuEndMatch = code.substring(menuStart).indexOf('</div>') + menuStart + 6;

const dashboardHtml = `
          <div className="p-8 space-y-8 max-w-5xl mx-auto w-full">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Dokumen</h2>
              <p className="text-slate-500 mt-2">Lengkapi data pada modul di bawah ini. Modul dengan centang hijau menandakan data sudah diisi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button onClick={() => setActiveTab('general')} className="flex flex-col text-left p-6 bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start w-full mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform"><Building2 className="w-6 h-6" /></div>
                  {data.companyName ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-amber-400 mt-2" />}
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Profil Perseroan</h3>
                <p className="text-slate-500 text-xs mt-2 line-clamp-2">{data.companyName ? \`PT \${data.companyName}\` : 'Identitas dasar PT'}</p>
              </button>

              <button onClick={() => setActiveTab('shareholders')} className="flex flex-col text-left p-6 bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start w-full mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform"><Users className="w-6 h-6" /></div>
                  {data.shareholders.length > 0 ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-amber-400 mt-2" />}
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Pemegang Saham</h3>
                <p className="text-slate-500 text-xs mt-2 line-clamp-2">{data.shareholders.length} Pihak terdaftar</p>
              </button>

              <button onClick={() => setActiveTab('representative')} className="flex flex-col text-left p-6 bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start w-full mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform"><FileSignature className="w-6 h-6" /></div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">Pemberian Kuasa</h3>
                <p className="text-slate-500 text-xs mt-2 line-clamp-2">Penerima kuasa Notaril</p>
              </button>

              <div className="col-span-full mt-4">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ListChecks className="w-5 h-5 text-indigo-500"/> Agenda Rapat & Perubahan</h3>
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                  <button onClick={() => setActiveTab('agenda')} className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-all border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl"><Plus className="w-5 h-5" /></div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-800">Pilih Agenda</h4>
                        <p className="text-slate-500 text-xs mt-1">Checklist agenda perubahan anggaran dasar atau pengurus</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </button>

                  <div className="divide-y divide-slate-100">
                    {data.resolutions.kbli && (
                      <button onClick={() => setActiveTab('kbli')} className="w-full flex items-center justify-between p-6 hover:bg-amber-50/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl"><ListChecks className="w-5 h-5" /></div>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-800">Perubahan KBLI</h4>
                            <p className="text-slate-500 text-xs mt-1">{data.kbliItems.length} Maksud & Tujuan dikonfigurasi</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    )}
                    {data.resolutions.management && (
                      <button onClick={() => setActiveTab('management')} className="w-full flex items-center justify-between p-6 hover:bg-purple-50/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl"><Users className="w-5 h-5" /></div>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-800">Susunan Pengurus</h4>
                            <p className="text-slate-500 text-xs mt-1">Direksi & Komisaris</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    )}
                    {data.resolutions.domicile && (
                      <button onClick={() => setActiveTab('domicile')} className="w-full flex items-center justify-between p-6 hover:bg-teal-50/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl"><Map className="w-5 h-5" /></div>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-800">Perubahan Kedudukan</h4>
                            <p className="text-slate-500 text-xs mt-1">{data.domicile || 'Belum diisi'}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    )}
                    {data.resolutions.address && (
                      <button onClick={() => setActiveTab('address')} className="w-full flex items-center justify-between p-6 hover:bg-blue-50/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl"><Navigation className="w-5 h-5" /></div>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-800">Perubahan Alamat</h4>
                            <p className="text-slate-500 text-xs mt-1">Alamat domisili lengkap</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    )}
                    {data.resolutions.capitalBase && (
                      <button onClick={() => setActiveTab('capitalBase')} className="w-full flex items-center justify-between p-6 hover:bg-orange-50/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-orange-100 text-orange-700 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-800">Penyetoran Modal Dasar</h4>
                            <p className="text-slate-500 text-xs mt-1">Peningkatan Modal Dasar</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    )}
                    {data.resolutions.capitalPaid && (
                      <button onClick={() => setActiveTab('capitalPaid')} className="w-full flex items-center justify-between p-6 hover:bg-rose-50/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl"><PieChart className="w-5 h-5" /></div>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-800">Modal Disetor</h4>
                            <p className="text-slate-500 text-xs mt-1">Peningkatan Modal Ditempatkan/Disetor</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    )}
                    {data.resolutions.shareholders && (
                      <button onClick={() => setActiveTab('stockTransfer')} className="w-full flex items-center justify-between p-6 hover:bg-indigo-50/50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl"><RefreshCw className="w-5 h-5" /></div>
                          <div className="text-left">
                            <h4 className="font-bold text-slate-800">Peralihan Saham</h4>
                            <p className="text-slate-500 text-xs mt-1">Jual Beli / Hibah</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
`;

code = code.substring(0, menuStart) + dashboardHtml + code.substring(menuEndMatch);

// Now wrap the forms inside a Modal
const formAreaStart = code.indexOf('<div className="p-8 space-y-10 pb-32 max-w-7xl mx-auto w-full">');

// I need to replace that layout with:
let newFormArea = `
          <Modal 
            isOpen={activeTab !== null} 
            onClose={() => setActiveTab(null)} 
            title={activeTab === 'general' ? 'Profil Perseroan' : activeTab === 'shareholders' ? 'Pemegang Saham' : activeTab === 'agenda' ? 'Pilih Agenda' : 'Pengisian Data'}
            maxWidth="max-w-4xl"
          >
            <div className="space-y-6 w-full">
`;

// Replace `<div className="p-8 space-y-10 pb-32 max-w-7xl mx-auto w-full">` with string
code = code.replace('<div className="p-8 space-y-10 pb-32 max-w-7xl mx-auto w-full">', newFormArea);

// The end of the form area
// We look for `              </section>\n            )}\n          </div>`
const formAreaEnd = code.lastIndexOf('</section>\n            )}\n          </div>');
if (formAreaEnd > -1) {
  code = code.substring(0, formAreaEnd) + '</section>\n            )}\n            </div>\n          </Modal>' + code.substring(formAreaEnd + 41);
}

// We also need to strip out `<section className="space-y-8 animate-in slide-in-from-left duration-300">` and `</section>` 
// Actually they are fine inside the root.
fs.writeFileSync('App.tsx', code);
console.log('App.tsx modified');

