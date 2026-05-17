import fs from 'fs';

let code = fs.readFileSync('App.tsx', 'utf8');

const oldTabs = `          <div className="flex border-b border-slate-100 sticky top-0 bg-white z-10 overflow-x-auto">
            <button onClick={() => setActiveTab('general')} className={\`flex-1 min-w-[80px] py-4 text-xs font-bold uppercase transition-all tracking-wider \${activeTab === 'general' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-400 hover:text-slate-600'}\`}>Profil</button>
            <button onClick={() => setActiveTab('shareholders')} className={\`flex-1 min-w-[80px] py-4 text-xs font-bold uppercase transition-all tracking-wider \${activeTab === 'shareholders' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-400 hover:text-slate-600'}\`}>Pihak</button>
            <button onClick={() => setActiveTab('representative')} className={\`flex-1 min-w-[80px] py-4 text-xs font-bold uppercase transition-all tracking-wider \${activeTab === 'representative' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-400 hover:text-slate-600'}\`}>Kuasa</button>
            <button onClick={() => setActiveTab('agenda')} className={\`flex-1 min-w-[80px] py-4 text-xs font-bold uppercase transition-all tracking-wider \${activeTab === 'agenda' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-400 hover:text-slate-600'}\`}>Agenda</button>
            {data.resolutions.kbli && (
              <button onClick={() => setActiveTab('kbli')} className={\`flex-1 min-w-[80px] py-4 text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-top duration-300 \${activeTab === 'kbli' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-600 bg-amber-50 hover:bg-amber-100'}\`}>KBLI</button>
            )}
            {data.resolutions.management && (
              <button onClick={() => setActiveTab('management')} className={\`flex-1 min-w-[100px] py-4 text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-top duration-300 \${activeTab === 'management' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-600 bg-purple-50 hover:bg-purple-100'}\`}>Pengurus</button>
            )}
            {data.resolutions.domicile && (
              <button onClick={() => setActiveTab('domicile')} className={\`flex-1 min-w-[100px] py-4 text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-top duration-300 \${activeTab === 'domicile' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-600 bg-teal-50 hover:bg-teal-100'}\`}>Kedudukan</button>
            )}
            {data.resolutions.address && (
              <button onClick={() => setActiveTab('address')} className={\`flex-1 min-w-[100px] py-4 text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-top duration-300 \${activeTab === 'address' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-600 bg-blue-50 hover:bg-blue-100'}\`}>Alamat</button>
            )}
            {data.resolutions.capitalBase && (
              <button onClick={() => setActiveTab('capitalBase')} className={\`flex-1 min-w-[100px] py-4 text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-top duration-300 \${activeTab === 'capitalBase' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-600 bg-orange-50 hover:bg-orange-100'}\`}>M. Dasar</button>
            )}
            {data.resolutions.capitalPaid && (
              <button onClick={() => setActiveTab('capitalPaid')} className={\`flex-1 min-w-[100px] py-4 text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-top duration-300 \${activeTab === 'capitalPaid' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-600 bg-rose-50 hover:bg-rose-100'}\`}>M. Disetor</button>
            )}
            {data.resolutions.shareholders && (
              <button onClick={() => setActiveTab('stockTransfer')} className={\`flex-1 min-w-[100px] py-4 text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-top duration-300 \${activeTab === 'stockTransfer' ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}\`}>Peralihan</button>
            )}
          </div>`;

const newTabs = `          <div className="flex items-center gap-2 p-4 border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur-md z-10 overflow-x-auto scrollbar-hide shadow-sm">
            <button onClick={() => setActiveTab('general')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider \${activeTab === 'general' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}\`}>Profil</button>
            <button onClick={() => setActiveTab('shareholders')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider \${activeTab === 'shareholders' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}\`}>Pihak</button>
            <button onClick={() => setActiveTab('representative')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider \${activeTab === 'representative' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}\`}>Kuasa</button>
            <button onClick={() => setActiveTab('agenda')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider \${activeTab === 'agenda' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}\`}>Agenda</button>
            {data.resolutions.kbli && (
              <button onClick={() => setActiveTab('kbli')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-right duration-300 \${activeTab === 'kbli' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}\`}>KBLI</button>
            )}
            {data.resolutions.management && (
              <button onClick={() => setActiveTab('management')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-right duration-300 \${activeTab === 'management' ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}\`}>Pengurus</button>
            )}
            {data.resolutions.domicile && (
              <button onClick={() => setActiveTab('domicile')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-right duration-300 \${activeTab === 'domicile' ? 'bg-teal-600 text-white shadow-md' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'}\`}>Kedudukan</button>
            )}
            {data.resolutions.address && (
              <button onClick={() => setActiveTab('address')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-right duration-300 \${activeTab === 'address' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}\`}>Alamat</button>
            )}
            {data.resolutions.capitalBase && (
              <button onClick={() => setActiveTab('capitalBase')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-right duration-300 \${activeTab === 'capitalBase' ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}\`}>M. Dasar</button>
            )}
            {data.resolutions.capitalPaid && (
              <button onClick={() => setActiveTab('capitalPaid')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-right duration-300 \${activeTab === 'capitalPaid' ? 'bg-rose-500 text-white shadow-md' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}\`}>M. Disetor</button>
            )}
            {data.resolutions.shareholders && (
              <button onClick={() => setActiveTab('stockTransfer')} className={\`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all tracking-wider animate-in slide-in-from-right duration-300 \${activeTab === 'stockTransfer' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}\`}>Peralihan</button>
            )}
          </div>`;

code = code.replace(oldTabs, newTabs);
fs.writeFileSync('App.tsx', code);
console.log('App.tsx updated tabs');
