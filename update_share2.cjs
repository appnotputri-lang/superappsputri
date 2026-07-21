const fs = require('fs');
const file = 'src/features/project-engine/components/ProjectDocumentUpload.tsx';
let content = fs.readFileSync(file, 'utf8');

// I need to add Send, Copy to lucide-react if they aren't there
if (!content.includes('Send } from')) {
  content = content.replace("Share2 } from 'lucide-react';", "Share2, Copy, Send } from 'lucide-react';");
}

const stateCode = `
  const [shareDoc, setShareDoc] = useState<UploadedDocument | null>(null);
  const [shareNumber, setShareNumber] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareSuccess, setShareSuccess] = useState('');

  const handleShareWhatsApp = async () => {
    if (!shareDoc || !shareNumber) return;
    setSharing(true);
    setShareError('');
    setShareSuccess('');
    try {
      const link = \`https://drive.google.com/file/d/\${shareDoc.driveFileId}/view\`;
      const message = \`Berikut adalah link dokumen proyek "\${project.nama}":\\n\\n\${shareDoc.title}\\n\${link}\`;
      
      const auth = AuthService.getInstance();
      const userToken = await auth.getCurrentUser()?.getIdToken();
      const headers: any = { 'Content-Type': 'application/json' };
      if (userToken) {
        headers['Authorization'] = \`Bearer \${userToken}\`;
      }
      
      const response = await fetch(getApiUrl('/api/send-whatsapp'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target: shareNumber,
          message: message
        })
      });
      
      const resText = await response.text();
      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        throw new Error("Respon server tidak valid.");
      }
      
      if (response.ok && resData.success) {
        setShareSuccess('Berhasil mengirim link dokumen ke WhatsApp!');
        setTimeout(() => {
          setShareDoc(null);
          setShareNumber('');
          setShareSuccess('');
        }, 2000);
      } else {
        setShareError(resData.error || 'Server menolak mengirim pesan.');
      }
    } catch (err: any) {
      setShareError(err.message || 'Terjadi kesalahan saat mengirim.');
    } finally {
      setSharing(false);
    }
  };
`;

if (!content.includes('const [shareDoc')) {
  content = content.replace(
    "const [activeMenuId, setActiveMenuId] = useState<string | null>(null);",
    "const [activeMenuId, setActiveMenuId] = useState<string | null>(null);" + stateCode
  );
}

const shareModalCode = `
      {/* WhatsApp Share Modal */}
      {shareDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Bagikan ke WhatsApp</h3>
              <button 
                onClick={() => { setShareDoc(null); setShareNumber(''); setShareError(''); setShareSuccess(''); }}
                className="text-slate-400 hover:text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {shareError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {shareError}
                </div>
              )}
              {shareSuccess && (
                <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">
                  {shareSuccess}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nomor WhatsApp Tujuan</label>
                <input
                  type="text"
                  value={shareNumber}
                  onChange={(e) => setShareNumber(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  disabled={sharing}
                />
                <p className="text-xs text-slate-500">
                  Link Google Drive dari dokumen <strong>{shareDoc.title}</strong> akan dikirimkan ke nomor ini melalui Fonnte.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => { setShareDoc(null); setShareNumber(''); setShareError(''); setShareSuccess(''); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                disabled={sharing}
              >
                Batal
              </button>
              <button
                onClick={handleShareWhatsApp}
                disabled={!shareNumber || sharing || !!shareSuccess}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sharing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
`;

if (!content.includes('WhatsApp Share Modal')) {
  content = content.replace(
    "{/* Replace Confirmation Modal */}",
    shareModalCode + "\n\n      {/* Replace Confirmation Modal */}"
  );
}

// Modify button in grid/list
// Find the exact block we modified previously:
content = content.replace(
  /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*const link = `https:\/\/drive\.google\.com\/file\/d\/\$\{docObj\.driveFileId\}\/view`;\s*navigator\.clipboard\.writeText\(link\);\s*alert\('Link Google Drive disalin ke clipboard!'\);\s*\}\}/g,
  `onClick={(e) => {
    e.stopPropagation();
    setShareDoc(docObj);
  }}`
);

content = content.replace(
  /onClick=\{\(\) => \{\s*const link = `https:\/\/drive\.google\.com\/file\/d\/\$\{docObj\.driveFileId\}\/view`;\s*navigator\.clipboard\.writeText\(link\);\s*alert\('Link Google Drive disalin ke clipboard!'\);\s*setActiveMenuId\(null\);\s*\}\}/g,
  `onClick={() => {
    setShareDoc(docObj);
    setActiveMenuId(null);
  }}`
);

// We should also add back the copy functionality in the menu since they wanted to share "link google drive saja", but adding a copy button is nice.
// Let's check if the button we replaced was actually Share2 for copy.
// I will just add the WhatsApp sharing logic.
content = content.replace(
  /<span>Bagikan Link Drive<\/span>/g,
  `<span>Kirim via WhatsApp</span>`
);
content = content.replace(
  /title="Bagikan Link Drive"/g,
  `title="Kirim via WhatsApp"`
);

// Add "Salin Link" to the menu
const salinLinkMenu = `
                              <button
                                onClick={() => {
                                  const link = \`https://drive.google.com/file/d/\${docObj.driveFileId}/view\`;
                                  navigator.clipboard.writeText(link);
                                  alert('Link Google Drive disalin ke clipboard!');
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                              >
                                <Copy className="w-4 h-4 text-slate-400" />
                                <span>Salin Link</span>
                              </button>
`;

if (!content.includes('<span>Salin Link</span>')) {
  content = content.replace(
    /<span>Kirim via WhatsApp<\/span>\s*<\/button>/,
    `<span>Kirim via WhatsApp</span>\n                              </button>\n${salinLinkMenu}`
  );
}

fs.writeFileSync(file, content);
