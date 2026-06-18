import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, setDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Upload, Star, Trash2, FileText, CheckCircle2 } from 'lucide-react';

export interface AktaTemplate {
  id: string;
  name: string;
  type: string;
  base64Data: string;
  isActive: boolean;
  uploadedAt: string;
}

export const TemplateAktaManager: React.FC = () => {
  const [templates, setTemplates] = useState<AktaTemplate[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'akta_templates'), orderBy('uploadedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: AktaTemplate[] = [];
      snapshot.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() } as AktaTemplate);
      });
      setTemplates(loaded);
    }, (error) => {
      console.error("Firestore Error in TemplateAktaManager:", error);
    });
    return () => unsub();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.docx')) {
      alert("Hanya file DOCX yang diperbolehkan!");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Data = event.target?.result as string;
        const newId = crypto.randomUUID();
        
        // if no active templates exist for this type, make it active
        const hasActive = templates.some(t => t.type === 'PENDIRIAN_NEW' && t.isActive);
        
        const newTemplate: AktaTemplate = {
          id: newId,
          name: file.name,
          type: 'PENDIRIAN_NEW', // currently only pendirian new
          base64Data,
          isActive: !hasActive,
          uploadedAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'akta_templates', newId), newTemplate);
        alert("Template berhasil diupload!");
      } catch (err) {
        console.error("Gagal upload template:", err);
        alert("Gagal mengupload template.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSetActive = async (id: string, type: string) => {
    if (!confirm('Jadikan template ini sebagai template aktif utama?')) return;
    
    try {
      // Deactivate all
      const batchPromises = templates.filter(t => t.type === type && t.isActive).map(t => 
        updateDoc(doc(db, 'akta_templates', t.id), { isActive: false })
      );
      await Promise.all(batchPromises);
      
      // Activate selected
      await updateDoc(doc(db, 'akta_templates', id), { isActive: true });
    } catch(err) {
      console.error(err);
      alert('Gagal mengaktifkan template.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus template ini?')) return;
    try {
      await deleteDoc(doc(db, 'akta_templates', id));
    } catch(err) {
      console.error(err);
      alert('Gagal menghapus template.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 rounded-sm p-6 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#0c2444] p-3 rounded-2xl shadow-md">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">Template Akta</h1>
            <p className="text-slate-500 text-xs">Kelola template asli Microsoft Word (DOCX) untuk generasi dokumen DOCX Engine.</p>
          </div>
        </div>
        
        <div>
           <input 
              type="file" 
              accept=".docx" 
              id="upload-template" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={isUploading}
           />
           <label 
             htmlFor="upload-template"
             className={`px-5 py-2.5 bg-[#0c2444] hover:bg-[#16365f] text-white text-[13px] font-bold rounded-sm shadow-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wide shrink-0 cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
             <Upload className="w-4 h-4" />
             {isUploading ? 'Mengupload...' : 'Upload Template DOCX'}
           </label>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
         <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Riwayat Template (Pendirian NEW)</h2>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
               <thead>
                 <tr className="bg-[#fcfcfc] border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                   <th className="px-4 py-3 border-r border-slate-200">Nama File</th>
                   <th className="px-4 py-3 border-r border-slate-200 text-center">Tipe</th>
                   <th className="px-4 py-3 border-r border-slate-200 text-center">Tanggal Diupload</th>
                   <th className="px-4 py-3 border-r border-slate-200 text-center">Status</th>
                   <th className="px-4 py-3 text-center w-[150px]">Aksi</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-200">
                 {templates.filter(t => t.type === 'PENDIRIAN_NEW').length === 0 ? (
                   <tr>
                     <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                       Belum ada template yang diupload. Silakan upload template format DOCX.
                     </td>
                   </tr>
                 ) : (
                   templates.filter(t => t.type === 'PENDIRIAN_NEW').map(t => (
                     <tr key={t.id} className="hover:bg-slate-50">
                       <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            {t.name}
                          </div>
                       </td>
                       <td className="px-4 py-3 border-r border-slate-100 text-center text-slate-600">
                         {t.type}
                       </td>
                       <td className="px-4 py-3 border-r border-slate-100 text-center text-slate-600">
                         {new Date(t.uploadedAt).toLocaleString('id-ID')}
                       </td>
                       <td className="px-4 py-3 border-r border-slate-100 text-center">
                         {t.isActive ? (
                           <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-[11px] font-bold">
                             <CheckCircle2 className="w-3 h-3" /> AKTIF
                           </span>
                         ) : (
                           <span className="text-slate-400 text-[11px] font-medium">-</span>
                         )}
                       </td>
                       <td className="px-4 py-3 text-center">
                         <div className="flex items-center justify-center gap-2">
                           {!t.isActive && (
                             <button
                               onClick={() => handleSetActive(t.id, t.type)}
                               className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                               title="Jadikan Template Aktif"
                             >
                               <Star className="w-4 h-4" />
                             </button>
                           )}
                           <button
                             onClick={() => handleDelete(t.id)}
                             className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                             title="Hapus"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
