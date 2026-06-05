const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

// Insert the Pendirian block below the RUPST block
const target = `                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>`;

if (!content.includes('Pendirian PT Terbaru')) {
  const customBlock = `
                {/* Recent Pendirian PT Drafts */}
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[14px] font-bold text-slate-700 uppercase tracking-tight flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-teal-500 font-bold"></span> Pendirian PT Terbaru
                    </h3>
                    <button onClick={() => setActiveSidebarTab('pendirian')} className="text-[#3b5998] hover:underline text-[12px] font-bold uppercase">Semua Pendirian</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {pendirianProjects.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6 border border-dashed border-slate-200 rounded">
                        <FileCode className="w-8 h-8 opacity-40 mb-2" />
                        <span className="text-[12px]">Belum ada draft Pendirian PT di sistem</span>
                      </div>
                    ) : (
                      pendirianProjects.slice(0, 5).map(p => (
                        <div key={p.id} className="p-3 border border-slate-100 hover:border-teal-300 rounded-sm bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[#3b5998] text-[13px] truncate">{p.companyName}</h4>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 font-mono text-teal-600 font-semibold bg-teal-50 px-1.5 rounded-sm">Draft {p.companyName || 'PT'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setEditingPendirianId(p.id);
                              updateData({ ...INITIAL_STATE, ...p } as any);
                              setActiveSidebarTab('pendirian');
                            }}
                            className="bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-600 px-3 py-1.5 rounded-sm font-bold text-[11px] uppercase transition-all shrink-0 shadow-sm"
                          >
                            Edit
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>`;

  content = content.replace(target, customBlock);
}

fs.writeFileSync('App.tsx', content);

