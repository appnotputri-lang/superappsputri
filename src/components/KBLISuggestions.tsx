import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Info, LayoutGrid, Printer, FileDown, Loader2, Save, History } from 'lucide-react';
import kbli2025Data from '../../kbli_2025.json';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

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

interface DpbScopeData {
  ruangLingkup: string;
  skalaUsaha: string;
  tingkatRisiko: string;
  izin: string;
}

interface SelectedKbli extends KbliItem {
  scopes: ScopeItem[];
  dpbScopes?: DpbScopeData[];
  catatan?: string;
}

const RISK_LEVELS = [
  { value: 'Rendah', label: 'Rendah', permit: 'NIB' },
  { value: 'Menengah Rendah', label: 'Menengah Rendah', permit: 'NIB dan Sertifikat Standar Self Declare' },
  { value: 'Menengah Tinggi', label: 'Menengah Tinggi', permit: 'NIB dan Sertifikat Standar yang harus dipenuhi' },
  { value: 'Tinggi', label: 'Tinggi', permit: 'NIB dan IZIN' }
];

const getAutoIzin = (tingkatRisiko: string) => {
  const norm = (tingkatRisiko || '').toLowerCase().trim();
  if (norm === 'rendah') return 'NIB';
  if (norm === 'menengah rendah') return 'SERTIFIKAT STANDAR SELEF DECLARE';
  if (norm === 'menengah tinggi') return 'SERTIFIKAT STANDAR PEMENUHAN KOMITMEN';
  if (norm === 'tinggi') return 'IZIN';
  return '-';
};

const translateBusinessScale = (scale: string, isEn: boolean) => {
  if (!isEn) return scale || '-';
  const norm = (scale || '').toLowerCase().trim();
  if (norm === 'mikro') return 'Micro';
  if (norm === 'kecil') return 'Small';
  if (norm === 'menengah') return 'Medium';
  if (norm === 'besar') return 'Large';
  return scale || '-';
};

const translateRiskLevel = (risk: string, isEn: boolean) => {
  if (!isEn) return risk || '-';
  const norm = (risk || '').toLowerCase().trim();
  if (norm === 'rendah') return 'Low';
  if (norm === 'menengah rendah') return 'Medium Low';
  if (norm === 'menengah tinggi') return 'Medium High';
  if (norm === 'tinggi') return 'High';
  return risk || '-';
};

const translateIzinValue = (izin: string, isEn: boolean) => {
  if (!isEn) return izin || '-';
  const norm = (izin || '').toLowerCase().trim();
  if (norm === 'nib') return 'NIB';
  if (norm === 'sertifikat standar') return 'Standard Certificate';
  if (norm === 'izin') return 'License';
  if (norm === 'sertifikat standar dan izin') return 'Standard Certificate and License';
  
  let translated = izin || '-';
  translated = translated.replace(/sertifikat standar/gi, 'Standard Certificate');
  translated = translated.replace(/izin/gi, 'License');
  translated = translated.replace(/menengah tinggi/gi, 'Medium-High');
  translated = translated.replace(/menengah rendah/gi, 'Medium-Low');
  translated = translated.replace(/tinggi/gi, 'High');
  translated = translated.replace(/rendah/gi, 'Low');
  return translated;
};

const getEnAutoIzin = (tingkatRisiko: string) => {
  const norm = (tingkatRisiko || '').toLowerCase().trim();
  if (norm === 'rendah') return 'NIB';
  if (norm === 'menengah rendah') return 'STANDARD CERTIFICATE (SELF-DECLARE)';
  if (norm === 'menengah tinggi') return 'STANDARD CERTIFICATE (COMMITMENT)';
  if (norm === 'tinggi') return 'LICENSE';
  return '-';
};

const KBLISuggestions: React.FC = () => {
  const [namaPT, setNamaPT] = useState('');
  const [kelompokUsaha, setKelompokUsaha] = useState('Mikro');
  const [pdfLang, setPdfLang] = useState<'id' | 'en'>('id');
  const [kbliSearch, setKbliSearch] = useState('');
  const [selectedKblis, setSelectedKblis] = useState<SelectedKbli[]>([]);
  const [kbliResults, setKbliResults] = useState<KbliItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<string | null>(null);
  const [dpbCache, setDpbCache] = useState<Record<string, DpbScopeData[]>>({});

  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    let localRecs: any[] = [];
    try {
      const stored = localStorage.getItem('kbli_suggestions_local_records');
      if (stored) {
        localRecs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Storage reading error:", e);
    }

    const q = query(
      collection(db, 'kbli_saved_records'),
      where('type', '==', 'suggestion')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const dbRecords: any[] = [];
      snapshot.forEach((doc) => {
        dbRecords.push({ id: doc.id, ...doc.data() });
      });
      
      const combinedMap = new Map();
      localRecs.forEach(r => combinedMap.set(r.id, r));
      dbRecords.forEach(r => combinedMap.set(r.id, r));
      
      const records = Array.from(combinedMap.values());
      records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSavedRecords(records);
    }, (error) => {
      console.error("Error listening to saved suggestions:", error);
      localRecs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSavedRecords(localRecs);
    });
    return () => unsub();
  }, []);

  const handleSaveToFirestore = async () => {
    if (!namaPT.trim() || selectedKblis.length === 0) {
      alert('Harap masukkan Nama dan pilih minimal 1 KBLI terlebih dahulu.');
      return;
    }
    setIsSavingRecord(true);
    const recordId = `suggestion-${namaPT.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '_')}`;
    const payload = {
      id: recordId,
      nama: namaPT.toUpperCase().trim(),
      type: 'suggestion',
      kelompokUsaha: kelompokUsaha,
      selectedItems: selectedKblis,
      updatedAt: new Date().toISOString(),
      userId: auth.currentUser?.uid || null
    };

    try {
      const stored = localStorage.getItem('kbli_suggestions_local_records');
      const currentLocals = stored ? JSON.parse(stored) : [];
      const updatedLocals = [payload, ...currentLocals.filter((item: any) => item.id !== recordId)];
      localStorage.setItem('kbli_suggestions_local_records', JSON.stringify(updatedLocals));
    } catch (e) {
      console.warn('Error saving to localStorage:', e);
    }

    try {
      await setDoc(doc(db, 'kbli_saved_records', recordId), payload);
      alert('Data Saran KBLI berhasil disimpan ke database!');
    } catch (error) {
      console.error('Error saving suggestion:', error);
      alert('Data Saran KBLI disimpan secara lokal di perangkat ini (Gagal sinkronisasi awan, silakan hubungi admin atau periksa koneksi Anda jika ingin menyimpan ke cloud database).');
      try {
        const stored = localStorage.getItem('kbli_suggestions_local_records');
        if (stored) {
          const recs = JSON.parse(stored);
          recs.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setSavedRecords(recs);
        }
      } catch (err) {}
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (recordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus riwayat saran ini?')) return;
    
    try {
      const stored = localStorage.getItem('kbli_suggestions_local_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = parsed.filter((item: any) => item.id !== recordId);
        localStorage.setItem('kbli_suggestions_local_records', JSON.stringify(filtered));
      }
    } catch (err) {
      console.warn('LocalStorage delete error:', err);
    }

    try {
      await deleteDoc(doc(db, 'kbli_saved_records', recordId));
      alert('Riwayat saran KBLI berhasil dihapus.');
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Riwayat saran KBLI dihapus secara lokal dari perangkat ini.');
      try {
        const stored = localStorage.getItem('kbli_suggestions_local_records');
        const recs = stored ? JSON.parse(stored) : [];
        recs.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setSavedRecords(recs);
      } catch (err) {}
    }
  };

  const handleLoadRecord = (record: any) => {
    setNamaPT(record.nama || '');
    setKelompokUsaha(record.kelompokUsaha || 'Mikro');
    setSelectedKblis(record.selectedItems || []);
    setShowHistoryModal(false);
    alert(`Data saran untuk "${record.nama}" berhasil dimuat!`);
  };

  const getDpbScopeOptions = (kbliKode: string): string[] => {
    const scopes = dpbCache[kbliKode] || [];
    const unique = Array.from(new Set<string>(scopes.map(s => s.ruangLingkup)));
    return unique;
  };

  const calculateScopeData = (ruangLingkup: string, skalaUsaha: string, kbliKode: string) => {
    const dpb = dpbCache[kbliKode];
    if (dpb && dpb.length > 0) {
      let match = dpb.find(d => 
        d.ruangLingkup === ruangLingkup && 
        d.skalaUsaha.toLowerCase() === skalaUsaha.toLowerCase()
      );
      
      // Fallback: If specific scale not found, look for "Seluruh" or "Semua"
      if (!match) {
         match = dpb.find(d => d.ruangLingkup === ruangLingkup && 
            (d.skalaUsaha.toLowerCase().includes('seluruh') || d.skalaUsaha.toLowerCase().includes('semua'))
         );
      }

      // Fallback: Try any scope match if risk is just globally applied
      if (!match) {
         match = dpb.find(d => d.ruangLingkup === ruangLingkup);
      }

      if (match) {
        return { tingkatResiko: match.tingkatRisiko, izin: match.izin };
      }
    }
    // Fallback logic
    const defaultRisk = calculateRisk('', skalaUsaha);
    const riskLevel = RISK_LEVELS.find(r => r.value === defaultRisk);
    return { tingkatResiko: defaultRisk, izin: riskLevel?.permit || 'NIB' };
  };

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

  useEffect(() => {
    setSelectedKblis(prev => prev.map(kbli => {
      return {
        ...kbli,
        scopes: kbli.scopes.map((s) => {
          const autoData = calculateScopeData(s.ruangLingkup, kelompokUsaha, kbli.kode);
          return {
            ...s,
            tingkatResiko: autoData.tingkatResiko,
            izin: autoData.izin
          };
        })
      };
    }));
  }, [kelompokUsaha, dpbCache]);

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
    let currentFetchedScopes: DpbScopeData[] | undefined = undefined;
    
    try {
      if (dpbCache[item.kode]) {
        console.log(`[Cache Hit] KBLI ${item.kode}`);
        // We already have it in dpbCache[item.kode]
      } else {
        console.log(`[Fetching] API untuk KBLI ${item.kode}...`);
        const response = await fetch(`https://dpb.unpad.ac.id/wp-json/dpb/v1/kbli2025-detail?kode=${item.kode}`);
        const data = await response.json();
        
        console.log(`[Response API] KBLI ${item.kode}:`, data);
        
        if (data.success && data.html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.html, 'text/html');
          
          const rawScopes: DpbScopeData[] = [];
          
          const tables = Array.from(doc.querySelectorAll('table'));
          
          const sections = Array.from(doc.querySelectorAll('.dpb-oss-section'));
          const rlSection = sections.find(sec => {
              const title = sec.querySelector('.dpb-oss-section-title');
              return title && title.textContent?.trim().toLowerCase() === 'ruang lingkup';
          });

          if (rlSection) {
              const accordions = Array.from(rlSection.querySelectorAll('.dpb-oss-accordion-item'));
              const cards = Array.from(rlSection.querySelectorAll('.dpb-oss-scope-card'));

              if (accordions.length > 0) {
                  accordions.forEach(acc => {
                      const titleSpan = acc.querySelector('.dpb-oss-accordion-head span');
                      const ruangLingkup = titleSpan ? titleSpan.textContent?.trim() || '' : '';

                      const panels = acc.querySelectorAll('.dpb-oss-tab-panel');
                      if (panels.length > 0) {
                          panels.forEach(panel => {
                             let skala = 'Semua';
                             const dataPanel = panel.getAttribute('data-panel') || '';
                             if (dataPanel.includes('mikro')) skala = 'Mikro';
                             else if (dataPanel.includes('kecil')) skala = 'Kecil';
                             else if (dataPanel.includes('menengah')) skala = 'Menengah';
                             else if (dataPanel.includes('besar')) skala = 'Besar';

                             const infoItems = panel.querySelectorAll('.dpb-oss-info-item');
                             let risiko = '';
                             let izin = '';

                             infoItems.forEach(item => {
                                 const label = item.querySelector('.dpb-oss-info-label')?.textContent?.trim();
                                 const value = item.querySelector('.dpb-oss-info-value')?.textContent?.trim();
                                 if (label === 'Tingkat Risiko') risiko = value || '';
                                 if (label === 'Perizinan Berusaha') izin = value || '';
                             });

                             if (ruangLingkup) {
                               rawScopes.push({ ruangLingkup, skalaUsaha: skala, tingkatRisiko: risiko, izin });
                             }
                          });
                      } else {
                         if (ruangLingkup) {
                           rawScopes.push({ ruangLingkup, skalaUsaha: "Semua", tingkatRisiko: "", izin: "" });
                         }
                      }
                  });
              } else if (cards.length > 0) {
                  cards.forEach(card => {
                      const ruangLingkup = card.textContent?.trim();
                      if (ruangLingkup) {
                          rawScopes.push({ ruangLingkup, skalaUsaha: "Semua", tingkatRisiko: "", izin: "" });
                      }
                  });
              }
          }
          
          console.log(`[Hasil Parsing DPB Scopes] HTML KBLI ${item.kode}:`, rawScopes);
          currentFetchedScopes = rawScopes;
          
          setDpbCache(prev => ({ ...prev, [item.kode]: rawScopes }));
        }
      }
    } catch (error) {
      console.warn(`Silent ignore: Error fetching KBLI ${item.kode} details from API:`, error);
    } finally {
      setIsLoadingDetails(null);
    }

    console.log(`[Status Aktif] Skala Usaha (Kelompok Usaha): ${kelompokUsaha}`);

    // If we have DPB scopes fetched OR cached, auto-populate the available unique scopes!
    // Important: dpbCache might not be updated in this render cycle, use currentFetchedScopes as well!
    const availableDpb = currentFetchedScopes || dpbCache[item.kode];
    let newScopes: ScopeItem[] = [];

    if (availableDpb && availableDpb.length > 0) {
       const uniqueScopes = Array.from(new Set<string>(availableDpb.map(s => s.ruangLingkup)));
       console.log("Ruang Lingkup ditemukan:", uniqueScopes);
       // Pre-fill the dropdown with ALL unique scopes for this KBLI so the user doesn't have to manually click 'add'
       newScopes = uniqueScopes.map(scopeName => {
         const match = availableDpb.find(d => d.ruangLingkup === scopeName && d.skalaUsaha.toLowerCase() === kelompokUsaha.toLowerCase());
         const defaultMatch = match || availableDpb.find(d => d.ruangLingkup === scopeName);
         
         const riskLevel = RISK_LEVELS.find(r => r.value === calculateRisk('', kelompokUsaha));
         
         return {
           id: Math.random().toString(36).substr(2, 9),
           ruangLingkup: scopeName,
           tingkatResiko: defaultMatch ? defaultMatch.tingkatRisiko : calculateRisk('', kelompokUsaha),
           izin: defaultMatch ? defaultMatch.izin : (riskLevel?.permit || 'NIB')
         };
       });
    } else {
       console.warn("Gagal membaca ruang lingkup dari DPB");
       const defaultRisk = calculateRisk(enrichedData.tingkat_risiko, kelompokUsaha);
       const riskLevel = RISK_LEVELS.find(r => r.value === defaultRisk);
       newScopes = [{ 
          id: Math.random().toString(36).substr(2, 9), 
          ruangLingkup: "Gagal membaca ruang lingkup dari DPB", 
          tingkatResiko: defaultRisk, 
          izin: riskLevel?.permit || enrichedData.perizinan_berusaha || 'NIB' 
       }];
    }

    setSelectedKblis([...selectedKblis, { 
      ...enrichedData, 
      scopes: newScopes,
      dpbScopes: availableDpb
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
              if (field === 'ruangLingkup') {
                const autoData = calculateScopeData(value, kelompokUsaha, kbliKode);
                return { 
                  ...s, 
                  [field]: value, 
                  tingkatResiko: autoData.tingkatResiko, 
                  izin: autoData.izin 
                };
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

  const updateKbliCatatan = (kbliKode: string, value: string) => {
    setSelectedKblis(prev => prev.map(kbli => {
      if (kbli.kode === kbliKode) {
        return { ...kbli, catatan: value };
      }
      return kbli;
    }));
  };

  const handlePrint = (lang: 'id' | 'en' = 'id') => {
    const isEn = lang === 'en';
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    let currentY = 0;

    const addLetterhead = (isFirstPage: boolean = false) => {
       if (isFirstPage) {
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.text('NOTARIS/PPAT', 14, 15);
          
          doc.setLineWidth(0.5);
          doc.setDrawColor(0, 0, 0);
          doc.line(14, 17, pageWidth - 14, 17);
          
          doc.setFontSize(11);
          doc.text('NUKANTINI PUTRI PARINCHA, SH., M.Kn.', 14, 22);
          
          doc.setFontSize(8.5);
          doc.text('SK MENTERI HUKUM DAN HAK ASASI MANUSIA REPUBLIK INDONESIA', 14, 26.5);
          doc.text('NO. C-309.HT 03.01-Th. 2007, Tanggal 23 Agustus 2007', 14, 30.5);
          doc.text('SK. KEPALA BADAN PERTANAHAN NASIONAL REPUBLIK INDONESIA', 14, 34.5);
          doc.text('NO. 1 - XVI I- PPAT - 2009, Tanggal 12 Februari 2009', 14, 38.5);
          
          doc.setFont('helvetica', 'normal');
          doc.text('Kantor', 14, 43.5);
          doc.text(':', 32, 43.5);
          doc.text('Komp. PPR-ITB Kav. F-5 Dago Giri, Lembang, Kab. Bandung Barat', 34, 43.5);
          
          doc.text('Telp/Fax', 14, 47.5);
          doc.text(':', 32, 47.5);
          doc.text('08112007061', 34, 47.5);
          
          // Double lines under letterhead
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1.0);
          doc.line(14, 51, pageWidth - 14, 51);
          doc.setLineWidth(0.3);
          doc.line(14, 52, pageWidth - 14, 52);
          
          currentY = 60;
       } else {
          // Minimal header running line for pages after page 1
          doc.setLineWidth(0.3);
          doc.setDrawColor(180, 180, 180);
          doc.line(14, 12, pageWidth - 14, 12);
          
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text('NOTARIS/PPAT NUKANTINI PUTRI PARINCHA, SH., M.Kn.', 14, 9);
          
          currentY = 20;
       }
    };

    const addFooter = () => {
       const pageCount = doc.getNumberOfPages();
       for (let i = 1; i <= pageCount; i++) {
         doc.setPage(i);
         doc.setFontSize(9);
         doc.setTextColor(100);
         doc.setFont('helvetica', 'italic');
         
         doc.setDrawColor(180, 180, 180);
         doc.setLineWidth(0.5);
         doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
         
         const runningTitle = isEn 
           ? '* Recommended KBLI (Indonesia Standard Industrial Classification)' 
           : '* Saran KBLI (Klasifikasi Baku Lapangan Usaha Indonesia)';
         const pageText = isEn ? `Page ${i}` : `Halaman ${i}`;
         
         doc.text(`${runningTitle} ${pageText}`, 14, pageHeight - 15);
         
         const disclaimer = isEn
           ? 'Notes: Data compiled based on oss.go.id, if there are discrepancies in the future due to new regulations, it is not the responsibility of the Notary Office.'
           : 'Catatan: Data di susun berdasarkan data oss.go.id, apabila ada perbedaan di kemudian hari dikarenakan ada pertaturan baru,  bukan menjadi tanggung jawab Kantor Notaris';
         
         const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 28);
         doc.text(splitDisclaimer, 14, pageHeight - 11);
       }
    };

    // Full letterhead on page 1
    addLetterhead(true);

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'RECOMMENDED KBLI LIST' : 'DAFTAR SARAN KBLI', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? 'Indonesia Standard Industrial Classification' : 'Klasifikasi Baku Lapangan Usaha Indonesia', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // Nama & Skala Usaha Block (Plain text layout with perfect alignment)
    autoTable(doc, {
      startY: currentY,
      theme: 'plain',
      body: [
        [
          { content: isEn ? 'Name' : 'Nama', styles: { fontStyle: 'normal', cellWidth: 30 } },
          { content: `: ${namaPT || '–'}`, styles: { fontStyle: 'bold' } }
        ],
        [
          { content: isEn ? 'Business Scale' : 'Skala Usaha', styles: { fontStyle: 'normal', cellWidth: 30 } },
          { content: `: ${translateBusinessScale(kelompokUsaha, isEn)}`, styles: { fontStyle: 'bold' } }
        ]
      ],
      styles: { fontSize: 11, textColor: [0, 0, 0], minCellHeight: 6, cellPadding: 1 },
      margin: { left: 14, right: 14 },
    });
    
    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 10;

    selectedKblis.forEach((kbli) => {
      if (currentY > pageHeight - 80) {
        doc.addPage();
        addLetterhead(false);
      }

      // Plain Bold Text: KBLI Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`KBLI ${kbli.kode}: ${kbli.judul.toUpperCase()}`, 14, currentY);
      currentY += 5;

      let blockY = currentY;

      const bodyData: any[] = [
        [{ content: isEn ? 'Description:' : 'Uraian:', styles: { fontStyle: 'bold', textColor: [0, 0, 0], cellPadding: { top: 4, left: 4, right: 4, bottom: 2 } } }],
        [{ content: kbli.uraian || '-', styles: { halign: 'justify', cellPadding: { top: 0, left: 4, right: 4, bottom: 4 } } }]
      ];
      
      if (kbli.tingkat_risiko) {
          bodyData.push([{ content: isEn ? 'Risk Level:' : 'Tingkat Risiko:', styles: { fontStyle: 'bold', textColor: [0, 0, 0], cellPadding: { top: 4, left: 4, right: 4, bottom: 2 } } }]);
          bodyData.push([{ content: translateRiskLevel(kbli.tingkat_risiko, isEn), styles: { halign: 'justify', cellPadding: { top: 0, left: 4, right: 4, bottom: 4 } } }]);
      }
      
      if (kbli.perizinan_berusaha) {
          bodyData.push([{ content: isEn ? 'Business Licensing:' : 'Perizinan Berusaha:', styles: { fontStyle: 'bold', textColor: [0, 0, 0], cellPadding: { top: 4, left: 4, right: 4, bottom: 2 } } }]);
          bodyData.push([{ content: translateIzinValue(kbli.perizinan_berusaha, isEn), styles: { halign: 'justify', cellPadding: { top: 0, left: 4, right: 4, bottom: 4 } } }]);
      }

      // Uraian Box (Styled as structured grid with warm grey fill)
      autoTable(doc, {
         startY: blockY,
         theme: 'grid', 
         head: [],
         body: bodyData,
         styles: { fontSize: 9, textColor: [0, 0, 0], fillColor: [248, 249, 250], lineColor: [150, 150, 150], lineWidth: 0.2 },
         margin: { left: 14, right: 14, bottom: 25, top: 20 }
      });
      
      // @ts-ignore
      blockY = doc.lastAutoTable.finalY + 8;

      if (blockY > pageHeight - 55) {
         doc.addPage();
         addLetterhead(false);
         blockY = currentY;
      }

      // Label "Business Scope" as simple elegant header
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(isEn ? 'Business Scope' : 'Ruang Lingkup Usaha', 14, blockY);
      blockY += 5;

      const body = kbli.scopes.map((s, index) => [
        index + 1,
        s.ruangLingkup || '-',
        translateRiskLevel(s.tingkatResiko, isEn),
        isEn ? getEnAutoIzin(s.tingkatResiko) : getAutoIzin(s.tingkatResiko),
        translateIzinValue(s.izin, isEn)
      ]);

      autoTable(doc, {
        startY: blockY,
        head: [isEn ? ['No', 'Business Scope', 'Risk Level', 'License', 'License Type'] : ['No', 'Ruang Lingkup Usaha', 'Tingkat Risiko', 'Izin', 'Jenis Izin']],
        body: body,
        theme: 'grid',
        headStyles: { 
          fillColor: [225, 228, 232], 
          textColor: [0, 0, 0], 
          fontStyle: 'bold', 
          halign: 'center', 
          valign: 'middle',
          lineColor: [150, 150, 150],
          lineWidth: 0.2
        },
        styles: { 
          fontSize: 9, 
          cellPadding: 4, 
          lineColor: [150, 150, 150], 
          lineWidth: 0.2, 
          textColor: [0, 0, 0] 
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 80 },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' },
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        margin: { left: 14, right: 14, bottom: 25, top: 20 },
      });

      // @ts-ignore
      let tableEndY = doc.lastAutoTable.finalY + 8;

      if (kbli.catatan) {
        if (tableEndY > pageHeight - 45) {
          doc.addPage();
          addLetterhead(false);
          tableEndY = currentY;
        }
        
        autoTable(doc, {
          startY: tableEndY,
          theme: 'grid',
          head: [],
          body: [
            [{ content: isEn ? 'Notes:' : 'Catatan:', styles: { fontStyle: 'bold', textColor: [0, 0, 0], cellPadding: { top: 4, left: 4, right: 4, bottom: 2 } } }],
            [{ content: kbli.catatan, styles: { halign: 'justify', cellPadding: { top: 0, left: 4, right: 4, bottom: 4 } } }]
          ],
           styles: { fontSize: 9, textColor: [30, 30, 30], fillColor: [248, 249, 250], lineColor: [150, 150, 150], lineWidth: 0.2 },
           margin: { left: 14, right: 14, bottom: 25, top: 20 }
        });
        
        // @ts-ignore
        currentY = doc.lastAutoTable.finalY + 12;
      } else {
        currentY = tableEndY + 4;
      }
    });
    
    addFooter();

    const filename = isEn 
      ? `KBLI_Suggestions_${namaPT.replace(/\s+/g, '_') || 'Saran'}.pdf`
      : `Saran_KBLI_${namaPT.replace(/\s+/g, '_') || 'Saran'}.pdf`;
    doc.save(filename);
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
        <div className="flex flex-wrap justify-center gap-4 pt-2 col-span-full">
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama:</span>
            <input
              type="text"
              placeholder="MASUKKAN NAMA"
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
          <div className="flex gap-2">
            <button
              onClick={handleSaveToFirestore}
              disabled={isSavingRecord || !namaPT.trim() || selectedKblis.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all border border-emerald-755 shadow-sm uppercase shrink-0"
            >
              {isSavingRecord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan
            </button>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 shadow-sm uppercase shrink-0"
            >
              <History className="w-3.5 h-3.5" />
              Riwayat ({savedRecords.length})
            </button>
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
                <div className="flex items-center gap-2">
                  <select 
                    value={pdfLang} 
                    onChange={(e) => setPdfLang(e.target.value as 'id' | 'en')}
                    className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm"
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English (PDF)</option>
                  </select>
                  <button 
                    onClick={() => handlePrint(pdfLang)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-all border border-indigo-100 shadow-sm"
                  >
                    <FileDown className="w-4 h-4" />
                    Cetak PDF
                  </button>
                </div>
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
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ruang Lingkup Usaha</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-56">Tingkat Risiko</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-64">Izin</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-72">Jenis Izin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {kbli.scopes.map((scope, index) => (
                    <tr key={scope.id} className="group">
                      <td className="px-6 py-4 align-top">
                        <span className="text-[13px] font-medium text-slate-300">{index + 1}</span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        {getDpbScopeOptions(kbli.kode).length > 0 ? (
                          <div className="relative">
                            <select
                              className="w-full px-3 py-2 border border-indigo-200 rounded-md text-[13px] font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-indigo-300 appearance-none bg-indigo-50/30"
                              value={scope.ruangLingkup}
                              onChange={(e) => updateScope(kbli.kode, scope.id, 'ruangLingkup', e.target.value)}
                            >
                              <option value="">-- Pilih Ruang Lingkup --</option>
                              {getDpbScopeOptions(kbli.kode).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-500">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        ) : (
                          <textarea
                            placeholder="Input manual ruang lingkup..."
                            className="w-full px-3 py-2 border border-slate-100 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none h-20 group-hover:border-slate-200"
                            value={scope.ruangLingkup}
                            onChange={(e) => updateScope(kbli.kode, scope.id, 'ruangLingkup', e.target.value)}
                          />
                        )}
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
                        <div className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-sm text-[11px] font-bold min-h-[40px] flex items-center leading-relaxed uppercase">
                          {getAutoIzin(scope.tingkatResiko)}
                        </div>
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
            
            {/* Notes Section */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Catatan</label>
              <textarea
                placeholder="Tambahkan catatan untuk KBLI ini (opsional)..."
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none min-h-[60px]"
                value={kbli.catatan || ''}
                onChange={(e) => updateKbliCatatan(kbli.kode, e.target.value)}
              />
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

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-350">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Riwayat Saran Tersimpan
              </h3>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto space-y-3">
              {savedRecords.length === 0 ? (
                <div className="text-center py-8 text-slate-400 italic text-sm">
                  Belum ada riwayat saran yang disimpan.
                </div>
              ) : (
                savedRecords.map(rec => (
                  <div 
                    key={rec.id}
                    onClick={() => handleLoadRecord(rec)}
                    className="p-4 bg-slate-50/50 hover:bg-indigo-50/40 border border-slate-100 hover:border-indigo-200 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-800 uppercase mb-0.5">{rec.nama}</div>
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span>Skala: <strong className="text-slate-700">{rec.kelompokUsaha}</strong></span>
                        <span>•</span>
                        <span>{rec.selectedItems?.length || 0} KBLI</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Disimpan: {new Date(rec.updatedAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteRecord(rec.id, e)}
                      className="p-2 text-slate-350 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      title="Hapus Riwayat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg uppercase tracking-wide transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KBLISuggestions;
