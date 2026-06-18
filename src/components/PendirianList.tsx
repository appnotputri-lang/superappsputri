import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, LayoutGrid, FileText, ArrowLeft, Edit, FileDown } from 'lucide-react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase'; // Adjust if path is different

const PendirianList: React.FC<{
  onEdit: (record: any) => void;
  onAdd: () => void;
}> = ({ onEdit, onAdd }) => {
  const [listSearch, setListSearch] = useState('');
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'pendirian_projects'));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() });
      });
      setRecords(loaded);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus data ini?')) {
      const record = records.find(r => r.id === id);
      const targetCompanyName = record?.companyName || record?.namaPt || 'PT Baru';
      await deleteDoc(doc(db, 'pendirian_projects', id));
      
      try {
        const notifId = crypto.randomUUID();
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          title: 'Pendirian PT Dihapus',
          description: `Data Pendirian PT untuk perusahaan "${targetCompanyName}" telah berhasil dihapus.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'delete_pendirian'
        });
      } catch (err) {
        console.error("Gagal membuat notifikasi hapus pendirian PT:", err);
      }
    }
  };

  const filtered = records.filter(rec => 
    !listSearch.trim() || (rec.namaPt || rec.companyName)?.toLowerCase().includes(listSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 rounded-sm p-6 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#0c2444] p-3 rounded-2xl shadow-md">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">Pendirian PT</h1>
            <p className="text-slate-500 text-xs">Kelola data pendirian PT secara terstruktur.</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="px-5 py-2.5 bg-[#0c2444] hover:bg-[#16365f] text-white text-[13px] font-bold rounded-sm shadow-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wide shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Pendirian
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Tabel Data Pendirian PT</h2>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari nama PT..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-250 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="w-full bg-white border border-slate-100 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#fcfcfc] border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
                  <th className="px-4 py-3 text-center w-12 border-r border-slate-200">No</th>
                  <th className="px-4 py-3 border-r border-slate-200">Nama PT</th>
                  <th className="px-4 py-3 border-r border-slate-200">Kedudukan</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Tanggal Dibuat</th>
                  <th className="px-4 py-3 text-center w-[150px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 italic">
                      {listSearch ? 'Data tidak ditemukan.' : 'Belum ada data pendirian.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3.5 text-center border-r border-slate-200 text-slate-500 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3.5 border-r border-slate-200 font-bold text-[#0c2444] uppercase">{rec.namaPt || rec.companyName || '-'}</td>
                      <td className="px-4 py-3.5 border-r border-slate-200">{rec.kotaKedudukan || rec.domicile || '-'}</td>
                      <td className="px-4 py-3.5 border-r border-slate-200 text-center text-slate-400 font-mono text-[11px]">
                        {rec.updatedAt && !isNaN(new Date(rec.updatedAt).getTime()) ? new Date(rec.updatedAt).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-center flex items-center justify-center gap-2">
                        <button onClick={() => onEdit(rec)} className="p-1 px-2 bg-indigo-50 text-indigo-700 rounded text-xs font-bold border border-indigo-100 flex items-center gap-1">
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => handleDelete(rec.id)} className="p-1.5 bg-red-50 text-red-650 rounded border border-red-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendirianList;
