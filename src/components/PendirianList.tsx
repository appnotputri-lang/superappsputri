import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, LayoutGrid, FileText, ArrowLeft, Edit, FileDown, ChevronDown } from 'lucide-react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase'; // Adjust if path is different
import { DocumentStatusBadge } from '../../components/DocumentStatusBadge';

const PendirianList: React.FC<{
  onEdit: (record: any) => void;
  onAdd: () => void;
  onDownload: (record: any) => void;
}> = ({ onEdit, onAdd, onDownload }) => {
  const [listSearch, setListSearch] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [dropdownId, setDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'pendirian_projects'));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() });
      });

      const getDocTime = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'object' && val.seconds !== undefined) {
          return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
        }
        if (val instanceof Date) {
          return val.getTime();
        }
        const parsed = Date.parse(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      loaded.sort((a, b) => {
        const timeA = Math.max(
          getDocTime(a.updatedAt),
          getDocTime(a.createdAt),
          getDocTime(a.signingDate),
          getDocTime(a.establishmentDeedDate)
        );
        const timeB = Math.max(
          getDocTime(b.updatedAt),
          getDocTime(b.createdAt),
          getDocTime(b.signingDate),
          getDocTime(b.establishmentDeedDate)
        );
        return timeB - timeA;
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
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Status</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Tanggal Dibuat</th>
                  <th className="px-4 py-3 text-center w-[150px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                      {listSearch ? 'Data tidak ditemukan.' : 'Belum ada data pendirian.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => onEdit(rec)}>
                      <td className="px-4 py-3.5 text-center border-r border-slate-200 text-slate-500 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3.5 border-r border-slate-200 font-bold text-[#0c2444] uppercase">{rec.namaPt || rec.companyName || '-'}</td>
                      <td className="px-4 py-3.5 border-r border-slate-200">{rec.kotaKedudukan || rec.domicile || '-'}</td>
                      <td className="px-4 py-3.5 border-r border-slate-200 text-center">
                        <DocumentStatusBadge status={rec.documentStatus || "DRAFTING"} />
                      </td>
                      <td className="px-4 py-3.5 border-r border-slate-200 text-center text-slate-400 font-mono text-[11px]">
                        {rec.updatedAt && !isNaN(new Date(rec.updatedAt).getTime()) ? new Date(rec.updatedAt).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownId(dropdownId === rec.id ? null : rec.id);
                            }}
                            className={`px-3 py-1.5 rounded-md border text-[11px] font-bold uppercase transition-all shadow-sm flex items-center gap-1.5 ${
                              dropdownId === rec.id ? 'bg-[#0c2444] text-white border-[#0c2444]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                          >
                            <FileDown className="w-[14px] h-[14px] stroke-[2.25px]" /> Download <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownId === rec.id ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {dropdownId === rec.id && (
                          <div className="absolute right-4 top-13 bg-white border border-slate-200 shadow-xl rounded-xl py-1.5 w-[220px] z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownId(null);
                                onDownload(rec);
                              }}
                              className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100"
                            >
                              <FileText className="w-[15px] h-[15px] text-blue-500 shrink-0" />
                              <div className="flex flex-col text-left">
                                <span className="leading-tight">Akta Pendirian</span>
                                <span className="text-[9px] text-slate-400 lowercase font-medium mt-0.5">.docx</span>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownId(null);
                                onEdit(rec);
                              }}
                              className="w-full px-4 py-2 text-slate-700 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide border-b border-slate-100"
                            >
                              <Edit className="w-[15px] h-[15px] text-indigo-500 shrink-0" />
                              <span className="leading-tight">Edit Data</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownId(null);
                                handleDelete(rec.id);
                              }}
                              className="w-full px-4 py-2 text-red-600 hover:bg-red-50 text-[11px] font-bold flex items-center gap-2.5 uppercase tracking-wide"
                            >
                              <Trash2 className="w-[15px] h-[15px] text-red-500 shrink-0" />
                              <span className="leading-tight">Hapus Data</span>
                            </button>
                          </div>
                        )}
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
