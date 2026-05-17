import fs from 'fs';

let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Add preview state
code = code.replace(/const \[activeTab, setActiveTab\] = useState<TabId \| null>\(null\);/, 
  "const [activeTab, setActiveTab] = useState<TabId | null>(null);\n  const [isPreviewOpen, setIsPreviewOpen] = useState(false);");

// 2. Remove split screen layout from main div
code = code.replace(/<div className={`no-print transition-all duration-500 bg-white border-r border-slate-200 overflow-y-auto h-screen sticky top-0 flex flex-col text-slate-900 shadow-xl z-20 \${showPreview \? 'w-full lg:w-1\/2' : 'w-full'}`}>/, 
  "<div className=\"no-print bg-slate-50 overflow-y-auto h-screen flex flex-col text-slate-900 w-full\">");

// 3. Add Preview button to Dashboard header
code = code.replace(/<h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Dokumen<\/h2>/,
  `<div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Dokumen</h2>
                <button 
                  onClick={() => setIsPreviewOpen(true)} 
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  <Eye className="w-4 h-4" /> Lihat Preview Dokumen
                </button>
              </div>`);

// 4. Find the preview block and replace it with a Modal
const previewStart = code.lastIndexOf('{showPreview && (');
if (previewStart > -1) {
    // Find the end of that block
    const previewEnd = code.lastIndexOf('</div>\n      )}');
    
    const newPreviewModal = `
      <Modal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        title="Preview Dokumen"
        maxWidth="max-w-6xl"
        headerColor="bg-slate-900 text-white"
      >
        <div className="flex flex-col items-center py-6 bg-slate-100 rounded-2xl">
          <div className="no-print sticky top-0 mb-6 z-40 flex gap-4 bg-white/90 backdrop-blur-md p-2 rounded-full shadow-lg border border-slate-200">
            <button onClick={handlePrint} className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all"><Printer className="w-4 h-4" /> Cetak / PDF</button>
            <button onClick={handleExportWord} className="px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold text-xs flex items-center gap-2 hover:bg-emerald-700 transition-all"><FileCode className="w-4 h-4" /> Word</button>
          </div>
          <DocumentPreview data={data} showHeader={false} />
        </div>
      </Modal>`;

    code = code.substring(0, previewStart) + newPreviewModal + code.substring(previewEnd + 15);
}

// Ensure Eye icon is imported
if (!code.includes('Eye,')) {
    code = code.replace(/import \{ ([^{}]+) \} from 'lucide-react';/, "import { $1, Eye } from 'lucide-react';");
}

fs.writeFileSync('App.tsx', code);
console.log('App.tsx updated to use Modal for Preview');
