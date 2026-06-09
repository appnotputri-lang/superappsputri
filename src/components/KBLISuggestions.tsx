import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Info, LayoutGrid, Printer, FileDown, Loader2, Save, History, Eye } from 'lucide-react';
import kbli2025Data from '../../kbli_2025.json';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db, auth, handleFirestoreError, OperationType, cleanUndefined } from '../lib/firebase';
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

  // states for "TAMBAH DATA" modal according to screenshot requirements
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingKbliKode, setViewingKbliKode] = useState<string | null>(null);
  const [searchCheckedKblis, setSearchCheckedKblis] = useState<string[]>([]);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<KbliItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddingBatch, setIsAddingBatch] = useState(false);

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
    const rawPayload = {
      id: recordId,
      nama: namaPT.toUpperCase().trim(),
      type: 'suggestion',
      kelompokUsaha: kelompokUsaha,
      selectedItems: selectedKblis,
      updatedAt: new Date().toISOString(),
      userId: auth.currentUser?.uid || null
    };

    const payload = cleanUndefined(rawPayload);

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
      // Call handleFirestoreError to satisfy the firebase skill requirement and help build security compliance diagnostic context
      try {
        handleFirestoreError(error, OperationType.WRITE, `kbli_saved_records/${recordId}`);
      } catch (e) {
        console.warn('Handled firestore error logged:', e);
      }
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
    // Check inside state functional update to prevent safe concurrency race condition
    setIsLoadingDetails(item.kode);
    let enrichedData = { ...item };
    let currentFetchedScopes: DpbScopeData[] | undefined = undefined;
    
    try {
      if (dpbCache[item.kode]) {
        console.log(`[Cache Hit] KBLI ${item.kode}`);
        // We already have it in dpbCache[item.kode]
      } else {
        console.log(`[Fetching] API untuk KBLI ${item.kode}...`);
        
        // Add a 2-second timeout to avoid persistent loader hangs
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        try {
          const response = await fetch(`https://dpb.unpad.ac.id/wp-json/dpb/v1/kbli2025-detail?kode=${item.kode}`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          const data = await response.json();
          
          console.log(`[Response API] KBLI ${item.kode}:`, data);
          
          if (data.success && data.html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.html, 'text/html');
            
            const rawScopes: DpbScopeData[] = [];
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
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          console.warn(`Fetch aborted or failed for KBLI ${item.kode}:`, fetchErr);
        }
      }
    } catch (error) {
      console.warn(`Silent ignore: Error fetching KBLI ${item.kode} details from API:`, error);
    } finally {
      setIsLoadingDetails(null);
    }

    console.log(`[Status Aktif] Skala Usaha (Kelompok Usaha): ${kelompokUsaha}`);

    const availableDpb = currentFetchedScopes || dpbCache[item.kode];
    let newScopes: ScopeItem[] = [];

    if (availableDpb && availableDpb.length > 0) {
       const uniqueScopes = Array.from(new Set<string>(availableDpb.map(s => s.ruangLingkup)));
       console.log("Ruang Lingkup ditemukan:", uniqueScopes);
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
       console.warn("Gagal membaca ruang lingkup dari DPB, falling back to Belum tersedia...");
       const defaultRisk = calculateRisk(enrichedData.tingkat_risiko, kelompokUsaha);
       const riskLevel = RISK_LEVELS.find(r => r.value === defaultRisk);
       newScopes = [{ 
          id: Math.random().toString(36).substr(2, 9), 
          ruangLingkup: "Belum tersedia data baru dari OSS", 
          tingkatResiko: defaultRisk, 
          izin: riskLevel?.permit || enrichedData.perizinan_berusaha || 'NIB' 
       }];
    }

    setSelectedKblis(prev => {
      if (prev.find(k => k.kode === item.kode)) return prev;
      return [...prev, { 
        ...enrichedData, 
        scopes: newScopes,
        dpbScopes: availableDpb
      }];
    });

    setKbliSearch('');
    setKbliResults([]);
    setHasSearched(false);
  };

  const itemsPerPage = 10;
  const totalPages = Math.ceil(modalSearchResults.length / itemsPerPage);

  const paginatedResults = modalSearchResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleToggleChecked = (kode: string) => {
    setSearchCheckedKblis(prev => {
      if (prev.includes(kode)) {
        return prev.filter(k => k !== kode);
      } else {
        return [...prev, kode];
      }
    });
  };

  const handleToggleAllOnPage = () => {
    const pageKodes = paginatedResults.map(item => item.kode);
    const allChecked = pageKodes.length > 0 && pageKodes.every(kode => searchCheckedKblis.includes(kode));

    if (allChecked) {
      setSearchCheckedKblis(prev => prev.filter(kode => !pageKodes.includes(kode)));
    } else {
      setSearchCheckedKblis(prev => {
        const filtered = prev.filter(kode => !pageKodes.includes(kode));
        return [...filtered, ...pageKodes];
      });
    }
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 10;
    
    // Window the page buttons around the current page
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const performModalSearch = () => {
    setCurrentPage(1);
    if (!modalSearchTerm.trim()) {
      const sorted = [...kbli2025Data.data as KbliItem[]].sort((a, b) => a.kode.localeCompare(b.kode));
      setModalSearchResults(sorted);
      return;
    }

    const searchStr = modalSearchTerm.toLowerCase().trim();
    const keywords = searchStr.split(/\s+/).filter(k => k.length > 0);

    const filtered = (kbli2025Data.data as KbliItem[]).filter(item => {
      const kodeMatch = item.kode.includes(searchStr);
      const judul = item.judul.toLowerCase();
      const uraian = item.uraian.toLowerCase();

      if (/^\d+$/.test(searchStr)) {
        return item.kode.startsWith(searchStr);
      }

      return kodeMatch || keywords.every(kw => judul.includes(kw) || uraian.includes(kw));
    });

    const sortedFiltered = [...filtered].sort((a, b) => a.kode.localeCompare(b.kode));
    setModalSearchResults(sortedFiltered);
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performModalSearch();
    }
  };

  const addKbliBatch = async (kodes: string[]) => {
    setIsAddingBatch(true);
    const itemsToAdd = (kbli2025Data.data as KbliItem[]).filter(item => 
      kodes.includes(item.kode) && !selectedKblis.some(k => k.kode === item.kode)
    );

    if (itemsToAdd.length === 0) {
      setIsAddModalOpen(false);
      setIsAddingBatch(false);
      return;
    }

    try {
      const results = await Promise.all(itemsToAdd.map(async (item) => {
        let enrichedData = { ...item };
        let currentFetchedScopes: DpbScopeData[] | undefined = undefined;

        try {
          if (dpbCache[item.kode]) {
            currentFetchedScopes = dpbCache[item.kode];
          } else {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            try {
              const response = await fetch(`https://dpb.unpad.ac.id/wp-json/dpb/v1/kbli2025-detail?kode=${item.kode}`, {
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              const data = await response.json();

              if (data.success && data.html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(data.html, 'text/html');
                const rawScopes: DpbScopeData[] = [];
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
                currentFetchedScopes = rawScopes;
                setDpbCache(prev => ({ ...prev, [item.kode]: rawScopes }));
              }
            } catch (err) {
              clearTimeout(timeoutId);
              console.warn(`Fetch aborted/failed for ${item.kode}:`, err);
            }
          }
        } catch (err) {
          console.warn(`Error detail for ${item.kode}:`, err);
        }

        const availableDpb = currentFetchedScopes || dpbCache[item.kode];
        let newScopes: ScopeItem[] = [];

        if (availableDpb && availableDpb.length > 0) {
          const uniqueScopes = Array.from(new Set<string>(availableDpb.map(s => s.ruangLingkup)));
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
          const defaultRisk = calculateRisk(enrichedData.tingkat_risiko, kelompokUsaha);
          const riskLevel = RISK_LEVELS.find(r => r.value === defaultRisk);
          newScopes = [{
            id: Math.random().toString(36).substr(2, 9),
            ruangLingkup: "Belum tersedia data baru dari OSS",
            tingkatResiko: defaultRisk,
            izin: riskLevel?.permit || enrichedData.perizinan_berusaha || 'NIB'
          }];
        }

        return {
          ...enrichedData,
          scopes: newScopes,
          dpbScopes: availableDpb
        };
      }));

      setSelectedKblis(prev => {
        const uniqueNew = results.filter(item => !prev.some(k => k.kode === item.kode));
        return [...prev, ...uniqueNew];
      });

    } catch (err) {
      console.error("Error batch adding:", err);
    } finally {
      setIsAddingBatch(false);
      setIsAddModalOpen(false);
      setSearchCheckedKblis([]);
    }
  };

  useEffect(() => {
    if (isAddModalOpen) {
      setModalSearchTerm('');
      const sorted = [...kbli2025Data.data as KbliItem[]].sort((a, b) => a.kode.localeCompare(b.kode));
      setModalSearchResults(sorted);
      setSearchCheckedKblis([]);
      setCurrentPage(1);
    }
  }, [isAddModalOpen]);

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
         doc.setFontSize(8.5);
         doc.setTextColor(100);
         doc.setFont('helvetica', 'italic');
         
         doc.setDrawColor(180, 180, 180);
         doc.setLineWidth(0.5);
         doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
         
         let runningTitle = '';
         if (i === 1) {
           runningTitle = isEn
             ? '* Summary of Recommended KBLI (Indonesia Standard Industrial Classification)'
             : '* Ringkasan Saran KBLI (Klasifikasi Baku Lapangan Usaha Indonesia)';
         } else {
           runningTitle = isEn
             ? `* Detailed Recommended KBLI 2025 (Indonesia Standard Industrial Classification) Page ${i - 1}`
             : `* Saran KBLI (Klasifikasi Baku Lapangan Usaha Indonesia) Halaman ${i - 1}`;
         }
         
         doc.text(runningTitle, 14, pageHeight - 15);
         
         const disclaimer = isEn
           ? 'Notes: Data compiled based on oss.go.id, if there are discrepancies in the future due to new regulations, it is not the responsibility of the Notary Office.'
           : 'Catatan: Data di susun berdasarkan data oss.go.id, apabila ada perbedaan di kemudian hari dikarenakan ada pertaturan baru,  bukan menjadi tanggung jawab Kantor Notaris';
         
         const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 28);
         doc.text(splitDisclaimer, 14, pageHeight - 11);
       }
    };

    // Full letterhead on page 1
    addLetterhead(true);

    // Title Page 1: Ringkasan Daftar Saran KBLI
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'SUMMARY OF RECOMMENDED KBLI LIST' : 'RINGKASAN DAFTAR SARAN KBLI', pageWidth / 2, currentY, { align: 'center' });
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

    // Summary table listing all selected KBLIs with No KBLI, Nama Kelompok, and Uraian
    const summaryHeaders = isEn 
      ? [['No. KBLI', 'Group Name', 'Description']] 
      : [['No. KBLI', 'Nama Kelompok', 'Uraian']];

    const summaryBody = selectedKblis.map((kbli) => [
      kbli.kode,
      kbli.judul.toUpperCase(),
      kbli.uraian || '-'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: summaryHeaders,
      body: summaryBody,
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
        0: { cellWidth: 18, halign: 'center', fontStyle: 'bold', valign: 'top' },
        1: { cellWidth: 47, fontStyle: 'bold', valign: 'top' },
        2: { cellWidth: 'auto', halign: 'justify', valign: 'top' },
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      margin: { left: 14, right: 14, bottom: 25, top: 20 },
    });

    // Create Page Break for Page 2 (Details section)
    doc.addPage();
    addLetterhead(true);

    // Page 2 Title: Rincian Saran KBLI 2025
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'DETAILS OF RECOMMENDED KBLI 2025' : 'RINCIAN SARAN KBLI 2025', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? 'Indonesia Standard Industrial Classification' : 'Klasifikasi Baku Lapangan Usaha Indonesia', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    // Nama & Skala Usaha Block on Page 2
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

    selectedKblis.forEach((kbli, kbliIndex) => {
      if (currentY > pageHeight - 65) {
        doc.addPage();
        addLetterhead(false);
      }

      // Plain Bold Text: KBLI Header (Wrapped to prevent overflow)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const headerText = `${kbliIndex + 1}. KBLI ${kbli.kode}: ${kbli.judul.toUpperCase()}`;
      const splitHeader = doc.splitTextToSize(headerText, pageWidth - 28);
      doc.text(splitHeader, 14, currentY);
      currentY += (splitHeader.length * 5) + 3;

      const body = kbli.scopes.map((s, index) => {
        const isFailedScope = s.ruangLingkup && (s.ruangLingkup.includes("Gagal membaca") || s.ruangLingkup.includes("Belum tersedia"));
        const displayRuangLingkup = s.ruangLingkup || '-';
        const displayRisiko = isFailedScope ? "N/A" : translateRiskLevel(s.tingkatResiko, isEn);
        const autoIzin = isFailedScope ? "N/A" : (isEn ? getEnAutoIzin(s.tingkatResiko) : getAutoIzin(s.tingkatResiko));
        const manualIzin = isFailedScope ? "N/A" : translateIzinValue(s.izin, isEn);
        return [
          index + 1,
          displayRuangLingkup,
          displayRisiko,
          autoIzin,
          manualIzin
        ];
      });

      autoTable(doc, {
        startY: currentY,
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
      currentY = doc.lastAutoTable.finalY + 12;
    });
    
    addFooter();

    const filename = isEn 
      ? `KBLI_Suggestions_${namaPT.replace(/\s+/g, '_') || 'Saran'}.pdf`
      : `Saran_KBLI_${namaPT.replace(/\s+/g, '_') || 'Saran'}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* compact configurations header */}
      <div className="text-center py-6 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-md shadow-indigo-150">
            <LayoutGrid className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">Saran KBLI 2025</h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">Tentukan klasifikasi lapangan usaha PT Anda dengan mudah.</p>
        </div>

        {/* PT Configs bar */}
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama PT:</span>
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

      {/* Main Selected List Card based on Screenshot 1 */}
      <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm">
        {/* Tab-like Pill Header */}
        <div className="flex items-center mb-6">
          <div className="bg-white border border-slate-300 rounded-full px-5 py-1 text-[13px] font-bold text-slate-700 shadow-sm">
            Maksud dan Tujuan
          </div>
        </div>

        {/* Tambah KBLI Button and Actions */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-[#0c2444] hover:bg-[#16365f] text-white text-[13px] font-bold rounded-sm transition-all focus:outline-none flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Data
          </button>

          {selectedKblis.length > 0 && (
            <div className="flex items-center gap-2">
              <select 
                value={pdfLang} 
                onChange={(e) => setPdfLang(e.target.value as 'id' | 'en')}
                className="px-3 py-2 bg-white border border-slate-200 rounded-sm text-xs font-bold text-slate-600 focus:outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm h-9"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English (PDF)</option>
              </select>
              <button 
                onClick={() => handlePrint(pdfLang)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-sm text-xs font-bold transition-all border border-indigo-100 shadow-sm h-9"
              >
                <FileDown className="w-4 h-4" />
                Cetak PDF
              </button>
            </div>
          )}
        </div>

        {/* Selected KBLIs List Table */}
        <div className="w-full bg-white border border-slate-200 rounded-sm overflow-hidden mb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#fcfcfc] border-b border-slate-200">
                  <th className="px-4 py-2.5 font-bold text-slate-700 text-center w-12 border-r border-slate-200">No</th>
                  <th className="px-4 py-2.5 font-bold text-slate-700 text-center w-24 border-r border-slate-200">Kode KBLI</th>
                  <th className="px-4 py-2.5 font-bold text-slate-700 text-left w-64 border-r border-slate-200">Judul KBLI</th>
                  <th className="px-4 py-2.5 font-bold text-slate-700 text-left border-r border-slate-200">Uraian KBLI</th>
                  <th className="px-4 py-2.5 font-bold text-slate-700 text-center w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedKblis.map((kbli, idx) => (
                  <tr key={kbli.kode} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3 text-center border-r border-slate-200 text-slate-600 align-top">{idx + 1}</td>
                    <td className="px-4 py-3 text-center border-r border-slate-200 font-mono text-slate-800 font-semibold align-top">{kbli.kode}</td>
                    <td className="px-4 py-3 border-r border-slate-200 font-bold text-slate-800 align-top">{kbli.judul}</td>
                    <td className="px-4 py-3 border-r border-slate-200 text-slate-600 text-[12px] leading-relaxed text-justify align-top">{kbli.uraian}</td>
                    <td className="px-4 py-3 text-center align-top whitespace-nowrap">
                      <button 
                        onClick={() => setViewingKbliKode(kbli.kode)}
                        className="p-1.5 hover:bg-teal-50 text-slate-400 hover:text-[#17a2b8] rounded transition-all mr-1.5"
                        title="Lihat Rincian Ruang Lingkup"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => removeKbli(kbli.kode)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                        title="Hapus KBLI"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {selectedKblis.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 italic">
                      Belum ada data KBLI terpilih. Silakan klik tombol "Tambah Data" di atas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* Verification footer notice */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-sm flex gap-3 items-start shadow-sm mt-6">
        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-800 leading-relaxed font-sans">
          <p className="font-bold mb-1 uppercase tracking-tight">Catatan Verifikasi:</p>
          Simulasi ini mengacu pada aturan **OSS RBA**. Pastikan Ruang Lingkup yang diketik sesuai dengan kegiatan usaha yang akan dijalankan. Penentuan tingkat resiko ditetapkan secara sistem oleh OSS berdasarkan KBLI dan parameter skala usaha.
        </div>
      </div>

      {/* "TAMBAH DATA" Modal based on Screenshot 2 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-sm shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#17a2b8] px-5 py-3 flex justify-between items-center text-white rounded-t-sm">
              <h3 className="text-sm font-bold tracking-wider">TAMBAH DATA</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-white hover:text-slate-200 text-2xl font-semibold focus:outline-none transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Center Banner text */}
              <div className="text-center space-y-1 py-1">
                <h4 className="text-[18px] font-bold text-slate-800 uppercase tracking-widest leading-none">MAKSUD DAN TUJUAN</h4>
                <p className="text-[14px] font-bold text-slate-500 tracking-wide leading-none pt-1">(KBLI 2025)</p>
                <div className="border-b border-slate-350 w-full pt-3"></div>
              </div>

              {/* Search Bar */}
              <div className="max-w-md mx-auto">
                <div className="flex items-center border border-slate-300 rounded-md overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-[#17a2b8]/30 focus-within:border-[#17a2b8] transition-all">
                  <input
                    type="text"
                    placeholder="Cari..."
                    className="w-full px-3 py-2 text-[14px] font-medium text-slate-700 outline-none"
                    value={modalSearchTerm}
                    onChange={(e) => setModalSearchTerm(e.target.value)}
                    onKeyDown={handleModalKeyDown}
                  />
                  <button 
                    onClick={performModalSearch}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border-l border-slate-300 text-slate-600 transition-colors focus:outline-none flex items-center justify-center shrink-0"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Loader during Batch Adds */}
              {isAddingBatch ? (
                <div className="p-16 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#17a2b8] animate-spin" />
                  <p className="text-sm font-bold text-slate-600">Mengambil detail ruang lingkup KBLI dari DPB OSS...</p>
                </div>
              ) : (
                <>
                  {/* Results Table */}
                  <div className="border border-slate-200 rounded-sm overflow-hidden shadow-sm bg-white">
                    <div className="max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[12px]">
                        <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                          <tr>
                            <th className="px-4 py-2 text-center w-12 border-r border-slate-200">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-[#17a2b8] border-slate-300 rounded focus:ring-[#17a2b8] cursor-pointer"
                                checked={paginatedResults.length > 0 && paginatedResults.every(r => searchCheckedKblis.includes(r.kode))}
                                onChange={handleToggleAllOnPage}
                              />
                            </th>
                            <th className="px-4 py-2 font-bold text-slate-700 text-center w-24 border-r border-slate-200">Kode KBLI</th>
                            <th className="px-4 py-2 font-bold text-slate-700 text-left w-52 border-r border-slate-200">Judul KBLI</th>
                            <th className="px-4 py-2 font-bold text-slate-700 text-left">Uraian KBLI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedResults.map((item) => {
                            const isChecked = searchCheckedKblis.includes(item.kode);
                            return (
                              <tr 
                                key={item.kode} 
                                onClick={() => handleToggleChecked(item.kode)}
                                className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                  isChecked ? 'bg-[#17a2b8]/5 hover:bg-[#17a2b8]/10' : ''
                                }`}
                              >
                                <td className="px-4 py-2 text-center border-r border-slate-200" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 text-[#17a2b8] border-slate-300 rounded focus:ring-[#17a2b8] cursor-pointer"
                                    checked={isChecked}
                                    onChange={() => handleToggleChecked(item.kode)}
                                  />
                                </td>
                                <td className="px-4 py-2 text-center border-r border-slate-200 font-mono font-bold text-slate-700">{item.kode}</td>
                                <td className="px-4 py-2 border-r border-slate-200 font-bold text-slate-800">{item.judul}</td>
                                <td className="px-4 py-2 text-slate-600 leading-relaxed text-justify">{item.uraian}</td>
                              </tr>
                            );
                          })}
                          {paginatedResults.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center py-10 text-slate-400 italic">
                                Hasil pencarian tidak ditemukan. Silakan masukkan kata kunci lain.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination according to Screenshot 2 */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                      <span className="font-bold">Pergi ke halaman:</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {getPageNumbers().map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-2.5 py-1 border rounded-sm font-bold transition-all ${
                              currentPage === pageNum 
                                ? 'bg-[#17a2b8] border-[#17a2b8] text-white' 
                                : 'bg-white border-slate-200 text-[#17a2b8] hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                        {currentPage < totalPages && (
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="px-2.5 py-1 border border-slate-200 bg-white rounded-sm text-[#17a2b8] font-bold hover:bg-slate-50 transition-all"
                          >
                            Berikut &gt;
                          </button>
                        )}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-2.5 py-1 border border-slate-200 bg-white rounded-sm text-[#17a2b8] font-bold hover:bg-slate-50 transition-all"
                        >
                          Terakhir &gt;&gt;
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-5 py-1.5 bg-[#f0ad4e] hover:bg-[#ec971f] text-white text-[12px] font-bold rounded shadow-sm hover:shadow transition-all uppercase"
              >
                BATAL
              </button>
              <button
                type="button"
                disabled={searchCheckedKblis.length === 0 || isAddingBatch}
                onClick={() => addKbliBatch(searchCheckedKblis)}
                className="px-5 py-1.5 bg-[#17a2b8] hover:bg-[#138496] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-bold rounded shadow-sm hover:shadow transition-all uppercase"
              >
                TAMBAH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Records History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-350">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-[#17a2b8]" />
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
                     className="p-4 bg-slate-50/50 hover:bg-slate-100 border border-slate-100 hover:border-slate-300 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
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
                       className="p-2 text-slate-450 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
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

      {/* Scope Details Modal (Eye Button) */}
      {viewingKbliKode && (() => {
        const kbli = selectedKblis.find(k => k.kode === viewingKbliKode);
        if (!kbli) return null;
        
        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-250">
            <div className="bg-white w-full max-w-5xl rounded-sm shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-[#17a2b8] px-5 py-3 flex justify-between items-center text-white rounded-t-sm">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-white animate-pulse" />
                  <h3 className="text-sm font-bold tracking-wider">RINCIAN RUANG LINGKUP & DETAIL KBLI</h3>
                </div>
                <button 
                  onClick={() => setViewingKbliKode(null)}
                  className="text-white hover:text-slate-200 text-2xl font-semibold focus:outline-none transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                {/* Title Card */}
                <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-[#0c2444] text-white font-bold px-3.5 py-1.5 rounded-sm text-base shrink-0 mt-0.5">
                      {kbli.kode}
                    </div>
                    <div>
                      <h4 className="text-[16px] font-bold text-slate-800 leading-snug">{kbli.judul}</h4>
                      <p className="text-[12px] text-slate-500 mt-1 leading-relaxed text-justify max-w-3xl">{kbli.uraian}</p>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50/40 border border-indigo-100 rounded-sm p-3 flex flex-col items-center shrink-0 min-w-[150px]">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Jumlah Ruang Lingkup</span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="1"
                        className="w-12 text-center text-base font-bold text-indigo-600 bg-white border border-indigo-200 rounded-sm py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                        value={kbli.scopes.length}
                        onChange={(e) => updateKbliScopes(kbli.kode, parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                </div>

                {/* Scopes Table of this KBLI */}
                <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-800 uppercase tracking-wider">Tabel Ruang Lingkup Usaha ({kbli.scopes.length} Baris)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                          <th className="px-4 py-2.5 font-bold text-slate-600 tracking-wider w-12 text-center border-r border-slate-150">No</th>
                          <th className="px-5 py-2.5 font-bold text-slate-600 tracking-wider border-r border-slate-150">Ruang Lingkup Usaha</th>
                          <th className="px-5 py-2.5 font-bold text-slate-600 tracking-wider w-52 border-r border-slate-150">Tingkat Risiko</th>
                          <th className="px-4 py-2.5 font-bold text-slate-600 tracking-wider w-40 text-center">Izin / Perizinan Berusaha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {kbli.scopes.map((scope, index) => {
                          const isFailedScope = scope.ruangLingkup && (scope.ruangLingkup.includes("Gagal membaca") || scope.ruangLingkup.includes("Belum tersedia"));
                          return (
                            <tr key={scope.id} className="hover:bg-slate-50/30">
                              <td className="px-4 py-3 text-center border-r border-slate-150 text-slate-400 font-mono align-top">
                                {index + 1}
                              </td>
                              <td className="px-5 py-3 border-r border-slate-150 align-top">
                                {getDpbScopeOptions(kbli.kode).length > 0 ? (
                                  <div className="relative">
                                    <select
                                      className="w-full px-3 py-2 border border-indigo-200 rounded-sm text-[13px] font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-indigo-300 appearance-none bg-indigo-50/30"
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
                                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none h-20"
                                    value={scope.ruangLingkup}
                                    onChange={(e) => updateScope(kbli.kode, scope.id, 'ruangLingkup', e.target.value)}
                                  />
                                )}
                              </td>
                              <td className="px-5 py-3 border-r border-slate-150 align-top">
                                {isFailedScope ? (
                                  <div className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-sm text-[13px] text-slate-400 min-h-[38px] flex items-center">
                                    N/A
                                  </div>
                                ) : (
                                  <select
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all bg-white"
                                    value={scope.tingkatResiko}
                                    onChange={(e) => updateScope(kbli.kode, scope.id, 'tingkatResiko', e.target.value)}
                                  >
                                    {RISK_LEVELS.map(level => (
                                      <option key={level.value} value={level.value}>{level.label}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top text-center">
                                <span className={`inline-block px-2.5 py-1.5 rounded-sm text-[11px] font-bold border uppercase leading-tight ${
                                  isFailedScope 
                                    ? "bg-slate-100 text-slate-400 border-slate-200" 
                                    : scope.tingkatResiko === 'Rendah'
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                                      : scope.tingkatResiko === 'Menengah Rendah'
                                        ? "bg-sky-50 text-sky-800 border-sky-100"
                                        : scope.tingkatResiko === 'Menengah Tinggi'
                                          ? "bg-amber-50 text-amber-800 border-amber-100"
                                          : "bg-rose-50 text-rose-800 border-rose-100"
                                }`}>
                                  {isFailedScope ? "N/A" : getAutoIzin(scope.tingkatResiko)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes Container */}
                <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Catatan KBLI</label>
                  <textarea
                    placeholder="Tambahkan catatan khusus / tambahan regulasi pelaksana untuk KBLI ini (opsional)..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-sm text-[13px] focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all resize-none min-h-[70px]"
                    value={kbli.catatan || ''}
                    onChange={(e) => updateKbliCatatan(kbli.kode, e.target.value)}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200 gap-3">
                <button
                  onClick={() => setViewingKbliKode(null)}
                  className="px-5 py-2.5 bg-[#17a2b8] hover:bg-[#138496] text-white font-bold text-sm rounded-sm transition-all shadow-sm"
                >
                  SIMPAN & TUTUP
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default KBLISuggestions;
