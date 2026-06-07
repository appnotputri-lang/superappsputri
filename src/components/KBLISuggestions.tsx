import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Info, LayoutGrid, Printer, FileDown, Loader2 } from 'lucide-react';
import kbli2025Data from '../../kbli_2025.json';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface KbliItem {
  kode: string;
  judul: string;
  uraian: string;
  ruang_lingkup?: string;
  tingkat_risiko?: string;
  perizinan_berusaha?: string;
  skala_usaha?: string;
  jangka_waktu?: string;
  kewajiban?: string;
  kewenangan?: string;
  ketentuan_khusus?: string;
}

interface ScopeItem {
  id: string;
  ruangLingkup: string;
  tingkatResiko: string;
  izin: string;
}

interface SelectedKbli extends KbliItem {
  scopes: ScopeItem[];
}

const RISK_LEVELS = [
  { value: 'Rendah', label: 'Rendah', permit: 'NIB' },
  { value: 'Menengah Rendah', label: 'Menengah Rendah', permit: 'NIB dan Sertifikat Standar Self Declare' },
  { value: 'Menengah Tinggi', label: 'Menengah Tinggi', permit: 'NIB dan Sertifikat Standar yang harus dipenuhi' },
  { value: 'Tinggi', label: 'Tinggi', permit: 'NIB dan IZIN' }
];

const KBLISuggestions: React.FC = () => {
  const [namaPT, setNamaPT] = useState('');
  const [kelompokUsaha, setKelompokUsaha] = useState('Mikro');
  const [kbliSearch, setKbliSearch] = useState('');
  const [selectedKblis, setSelectedKblis] = useState<SelectedKbli[]>([]);
  const [kbliResults, setKbliResults] = useState<KbliItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<string | null>(null);

  const parseScaleProperty = (propertyValue: string | undefined, scale: string, defaultValue: string) => {
    if (!propertyValue) return defaultValue;
    const val = propertyValue.trim();
    const lVal = val.toLowerCase();
    
    const scaleKeywords: Record<string, string[]> = {
      'Mikro': ['mikro', 'micro'],
      'Kecil': ['kecil', 'small'],
      'Menengah': ['menengah', 'medium'],
      'Besar': ['besar', 'large']
    };

    const currentKws = scaleKeywords[scale] || [];
    
    // Split by common separators (semicolons, newlines)
    const segments = val.split(/[;|\n]/);
    
    if (segments.length > 1) {
      for (const segment of segments) {
        const lSegment = segment.toLowerCase();
        if (currentKws.some(kw => lSegment.includes(kw))) {
           // Found relevant segment, extract value after colon or dash
           const parts = segment.split(/[:|-]/);
           return parts.length > 1 ? parts.slice(1).join(':').trim() : segment.trim();
        }
      }
    }

    // Fallback search for scale keyword
    let earliestPos = -1;
    for (const kw of currentKws) {
      const pos = lVal.indexOf(kw);
      if (pos !== -1 && (earliestPos === -1 || pos < earliestPos)) earliestPos = pos;
    }

    if (earliestPos !== -1) {
       const afterScale = val.substring(earliestPos);
       const nextSeparator = afterScale.search(/[;|\n]/);
       const relevantPart = nextSeparator !== -1 ? afterScale.substring(0, nextSeparator) : afterScale;
       const parts = relevantPart.split(/[:|-]/);
       return parts.length > 1 ? parts.slice(1).join(':').trim() : relevantPart.trim();
    }

    return val;
  };

  const calculateRisk = (tingkatRisiko: string | undefined, scale: string) => {
    const rawMatch = parseScaleProperty(tingkatRisiko, scale, 'Rendah').toLowerCase();
    
    if (rawMatch.includes('menengah rendah')) return 'Menengah Rendah';
    if (rawMatch.includes('menengah tinggi')) return 'Menengah Tinggi';
    if (rawMatch.includes('tinggi')) return 'Tinggi';
    if (rawMatch.includes('rendah')) return 'Rendah';

    if (scale === 'Menengah' || scale === 'Besar') return 'Menengah Tinggi';
    return 'Rendah';
  };

  const calculateScope = (ruangLingkup: string | undefined, scale: string) => {
    return parseScaleProperty(ruangLingkup, scale, '');
  };

  // Re-sync risks and scopes when scale changes
  useEffect(() => {
    setSelectedKblis(prev => prev.map(kbli => {
      const defaultRisk = calculateRisk(kbli.tingkat_risiko, kelompokUsaha);
      const defaultScope = calculateScope(kbli.ruang_lingkup, kelompokUsaha);
      const riskLevel = RISK_LEVELS.find(r => r.value === defaultRisk);
      
      return {
        ...kbli,
        scopes: kbli.scopes.map((s, index) => ({
          ...s,
          // Only auto-update the first scope's ruang lingkup if it matches either empty or old default
          ruangLingkup: index === 0 ? (defaultScope || s.ruangLingkup) : s.ruangLingkup,
          tingkatResiko: defaultRisk,
          izin: riskLevel?.permit || s.izin
        }))
      };
    }));
  }, [kelompokUsaha]);

  const performSearch = () => {
    if (!kbliSearch.trim()) {
      setKbliResults([]);
      setHasSearched(false);
      return;
    }

    const searchStr = kbliSearch.toLowerCase().trim();
    const keywords = searchStr.split(/\s+/).filter(k => k.length > 0);

    const filtered = (kbli2025Data.data as KbliItem[]).filter(item => {
      const kodeMatch = item.kode.includes(searchStr);
      const judul = item.judul.toLowerCase();
      const uraian = item.uraian.toLowerCase();

      // If it's a numeric search, check if code starts with it
      if (/^\d+$/.test(searchStr)) {
        return item.kode.startsWith(searchStr);
      }

      // Check if all search keywords appear in either the title or description
      const keywordMatch = keywords.every(kw => 
        judul.includes(kw) || uraian.includes(kw)
      );

      return kodeMatch || keywordMatch;
    }).slice(0, 100); // Increased slice for better visibility

    setKbliResults(filtered);
    setHasSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const addKbli = async (item: KbliItem) => {
    if (selectedKblis.find(k => k.kode === item.kode)) return;

    setIsLoadingDetails(item.kode);
    let enrichedData = { ...item };
    
    try {
      // Try fetching enriched details from Firestore
      const docRef = doc(db, 'kbli_2025', item.kode);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        enrichedData = {
          ...item,
          ruang_lingkup: firestoreData.ruang_lingkup || item.ruang_lingkup,
          tingkat_risiko: firestoreData.tingkat_risiko || item.tingkat_risiko,
          uraian: firestoreData.uraian || item.uraian,
          judul: firestoreData.judul || item.judul
        };
      }
    } catch (error) {
      console.warn("Silent ignore: Error fetching KBLI details from Firestore:", error);
      // We don't call handleFirestoreError here to avoid crashing the search UI
    } finally {
      setIsLoadingDetails(null);
    }

    const defaultRisk = calculateRisk(enrichedData.tingkat_risiko, kelompokUsaha);
    const riskLevel = RISK_LEVELS.find(r => r.value === defaultRisk);

    setSelectedKblis([...selectedKblis, { 
      ...enrichedData, 
      scopes: [{ 
        id: Math.random().toString(36).substr(2, 9), 
        ruangLingkup: calculateScope(enrichedData.ruang_lingkup, kelompokUsaha), 
        tingkatResiko: defaultRisk, 
        izin: riskLevel?.permit || 'NIB' 
      }] 
    }]);

    setKbliSearch('');
    setKbliResults([]);
    setHasSearched(false);
  };

  const removeKbli = (kode: string) => {
    setSelectedKblis(selectedKblis.filter(k => k.kode !== kode));
  };

  const updateKbliScopes = (kode: string, num: number) => {
    setSelectedKblis(prev => prev.map(kbli => {
      if (kbli.kode === kode) {
        const currentScopes = kbli.scopes;
        const defaultRisk = calculateRisk(kbli.tingkat_risiko, kelompokUsaha);
        const riskLevel = RISK_LEVELS.find(r => r.value === defaultRisk);

        if (num > currentScopes.length) {
          const newScopes = [...currentScopes];
          for (let i = currentScopes.length; i < num; i++) {
            newScopes.push({
              id: Math.random().toString(36).substr(2, 9),
              ruangLingkup: '',
              tingkatResiko: defaultRisk,
              izin: riskLevel?.permit || 'NIB'
            });
          }
          return { ...kbli, scopes: newScopes };
        } else if (num < currentScopes.length && num >= 1) {
          return { ...kbli, scopes: currentScopes.slice(0, num) };
        }
      }
      return kbli;
    }));
  };

  const updateScope = (kbliKode: string, scopeId: string, field: keyof ScopeItem, value: string) => {
    setSelectedKblis(prev => prev.map(kbli => {
      if (kbli.kode === kbliKode) {
        return {
          ...kbli,
          scopes: kbli.scopes.map(s => {
            if (s.id === scopeId) {
              if (field === 'tingkatResiko') {
                const riskLevel = RISK_LEVELS.find(r => r.value === value);
                return { ...s, [field]: value, izin: riskLevel?.permit || '' };
              }
              return { ...s, [field]: value };
            }
            return s;
          })
        };
      }
      return kbli;
    }));
  };

  const handlePrint = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('DAFTAR KBLI & RUANG LINGKUP USAHA', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Nama PT: ${namaPT || '-'}`, 14, 32);
    doc.text(`Kelompok Usaha: ${kelompokUsaha}`, 14, 38);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 44);

    let currentY = 55;

    selectedKblis.forEach((kbli) => {
      // Add KBLI Info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`KBLI ${kbli.kode}: ${kbli.judul}`, 14, currentY);
      currentY += 6;

      // Add Enriched Details if available
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      
      const details = [];
      if (kbli.uraian) details.push(`Uraian: ${kbli.uraian.substring(0, 150)}${kbli.uraian.length > 150 ? '...' : ''}`);
      if (kbli.tingkat_risiko) details.push(`Tingkat Risiko: ${kbli.tingkat_risiko}`);
      if (kbli.perizinan_berusaha) details.push(`Perizinan: ${kbli.perizinan_berusaha}`);
      
      details.forEach(detail => {
        const lines = doc.splitTextToSize(detail, 180);
        doc.text(lines, 14, currentY);
        currentY += (lines.length * 5);
      });

      doc.setTextColor(0);
      currentY += 2;

      const body = kbli.scopes.map((s, index) => [
        index + 1,
        s.ruangLingkup || '-',
        s.tingkatResiko,
        s.izin
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Ruang Lingkup Usaha', 'Tingkat Resiko', 'Izin']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 80 },
          2: { cellWidth: 40 },
          3: { cellWidth: 50 },
        },
      });

      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 15;

      // Check if we need a new page
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
    });

    doc.save(`KBLI_${namaPT.replace(/\s+/g, '_') || 'Saran'}.pdf`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Search Header Section */}
      <div className="text-center py-12 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
            <LayoutGrid className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">KBLI 2025 Search</h1>
          <p className="text-slate-500 max-w-md mx-auto">Cari Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) terbaru dan tentukan ruang lingkup usaha Anda.</p>
        </div>

        {/* Google-like Search Bar */}
        <div className="max-w-2xl mx-auto relative group">
          <div className="relative flex items-center">
            <div className="absolute left-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Masukan Kode atau Judul KBLI..."
              className="w-full pl-14 pr-32 py-4 shadow-xl shadow-slate-200/50 border border-slate-200 rounded-full text-lg focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
              value={kbliSearch}
              onChange={(e) => setKbliSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button 
              onClick={performSearch}
              className="absolute right-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-sm transition-all shadow-md shadow-indigo-200"
            >
              Cari KBLI
            </button>
          </div>
        </div>

        {/* Secondary Configs */}
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama PT:</span>
            <input
              type="text"
              placeholder="PT MAJU MUNDUR"
              className="text-sm font-bold text-slate-700 outline-none border-b border-transparent focus:border-indigo-500 uppercase min-w-[200px]"
              value={namaPT}
              onChange={(e) => setNamaPT(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Skala:</span>
            <select
              className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              value={kelompokUsaha}
              onChange={(e) => setKelompokUsaha(e.target.value)}
            >
              <option value="Mikro">Mikro</option>
              <option value="Kecil">Kecil</option>
              <option value="Menengah">Menengah</option>
              <option value="Besar">Besar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Results List */}
      {hasSearched && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-500">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ditemukan {kbliResults.length} Hasil</span>
            <button onClick={() => setHasSearched(false)} className="text-slate-400 hover:text-slate-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {kbliResults.length > 0 ? (
              kbliResults.map((item) => (
                <div key={item.kode} className="p-4 hover:bg-indigo-50/30 transition-colors flex items-center justify-between group">
                  <div className="flex gap-4 items-start">
                    <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded text-xs mt-0.5">{item.kode}</span>
                    <div>
                      <h4 className="text-[14px] font-bold text-slate-800 mb-1">{item.judul}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.uraian}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => addKbli(item)}
                    disabled={isLoadingDetails === item.kode}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 group-hover:border-indigo-500 group-hover:text-indigo-600 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                  >
                    {isLoadingDetails === item.kode ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Pilih KBLI
                  </button>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-slate-400 italic">
                Pencarian tidak ditemukan. Silahkan coba kata kunci lain.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected KBLIs and their Scopes */}
      <div className="space-y-6">
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Daftar KBLI & Ruang Lingkup Terpilih</h2>
          <div className="flex items-center gap-3">
             {selectedKblis.length > 0 && (
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-all border border-indigo-100 shadow-sm"
                >
                  <FileDown className="w-4 h-4" />
                  Cetak PDF
                </button>
             )}
            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-500">{selectedKblis.length} KBLI</span>
          </div>
        </div>
        {selectedKblis.map((kbli) => (
          <div key={kbli.kode} className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
            {/* KBLI Title Bar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 text-white font-bold px-3 py-1 rounded text-[14px]">
                  {kbli.kode}
                </div>
                <h3 className="text-[15px] font-bold text-slate-800">{kbli.judul}</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-sm">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Ruang Lingkup?</span>
                  <input
                    type="number"
                    min="1"
                    className="w-10 text-center text-[13px] font-bold text-indigo-600 focus:outline-none"
                    value={kbli.scopes.length}
                    onChange={(e) => updateKbliScopes(kbli.kode, parseInt(e.target.value) || 1)}
                  />
                </div>
                <button 
                  onClick={() => removeKbli(kbli.kode)}
                  className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scopes Table for this KBLI */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100">
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">No</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ruang Lingkup (Ketik Manual)</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-64">Tingkat Resiko (Drop Down)</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-72">Izin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {kbli.scopes.map((scope, index) => (
                    <tr key={scope.id} className="group">
                      <td className="px-6 py-4 align-top">
                        <span className="text-[13px] font-medium text-slate-300">{index + 1}</span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <textarea
                          placeholder="Input manual ruang lingkup..."
                          className="w-full px-3 py-2 border border-slate-100 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none h-20 group-hover:border-slate-200"
                          value={scope.ruangLingkup}
                          onChange={(e) => updateScope(kbli.kode, scope.id, 'ruangLingkup', e.target.value)}
                        />
                      </td>
                      <td className="px-6 py-4 align-top">
                        <select
                          className="w-full px-2 py-2 border border-slate-100 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all bg-white group-hover:border-slate-200"
                          value={scope.tingkatResiko}
                          onChange={(e) => updateScope(kbli.kode, scope.id, 'tingkatResiko', e.target.value)}
                        >
                          {RISK_LEVELS.map(level => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-sm text-[12px] text-slate-600 min-h-[40px] flex items-center leading-relaxed">
                          {scope.izin}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {selectedKblis.length === 0 && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-sm p-12 text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-600 mb-1">Belum Ada KBLI</h3>
            <p className="text-[13px] text-slate-400">Gunakan kolom pencarian di atas untuk menambahkan KBLI dan mengatur ruang lingkupnya.</p>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-sm flex gap-3 items-start shadow-sm">
        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-800 leading-relaxed font-sans">
          <p className="font-bold mb-1 uppercase tracking-tight">Catatan Verifikasi:</p>
          Simulasi ini mengacu pada aturan **OSS RBA**. Pastikan Ruang Lingkup yang diketik sesuai dengan kegiatan usaha yang akan dijalankan. Penentuan tingkat resiko ditetapkan secara sistem oleh OSS berdasarkan KBLI dan parameter skala usaha.
        </div>
      </div>
    </div>
  );
};

export default KBLISuggestions;
