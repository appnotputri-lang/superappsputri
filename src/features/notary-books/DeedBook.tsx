import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageLayout';
import { MobileHeader, MobileEmptyState } from '../../components/ui/MobileHeader';
import { Deed, DeedAppearer, DeedGrantor } from '../../../types';
import { NotaryService } from '../../services/NotaryService';
import { isRecordLocked, getLockDeadlineMessage, isSuperAdmin } from '../../utils/lockUtils';
import { useAuth } from '../../hooks/useAuth';
import { fetchLatestDeedNumbers } from '../../lib/deedUtils';
import { Plus, Search, Edit2, Trash2, Lock, RefreshCw, X, FileText, Check, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

// Deeds list cache: kept in-memory for instant SPA tab-switches, and
// mirrored to localStorage so the FIRST load of this page in a brand new
// tab/session (or after a hard refresh) can also show the last-known data
// immediately instead of a blank loading state — the list is still always
// re-fetched from D1 in the background afterward, so this only affects how
// fast something appears, never what ends up saved/shown as final truth.
const DEED_LIST_CACHE_KEY = 'superapp:deedbook:list-cache:v1';
const DEED_LIST_CACHE_MAX_ENTRIES = 12;
const DEED_LIST_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h — purely a "don't show ancient data" cap, not a freshness guarantee

type DeedCacheEntry = { records: Deed[]; total: number; ts: number };

const deedCache = new Map<string, DeedCacheEntry>();

// Hydrate the in-memory cache from localStorage once, at module load.
try {
  const raw = localStorage.getItem(DEED_LIST_CACHE_KEY);
  if (raw) {
    const parsed: Record<string, DeedCacheEntry> = JSON.parse(raw);
    const now = Date.now();
    Object.entries(parsed).forEach(([key, entry]) => {
      if (entry && now - entry.ts < DEED_LIST_CACHE_MAX_AGE_MS) {
        deedCache.set(key, entry);
      }
    });
  }
} catch (err) {
  console.error('Failed to hydrate deed list cache from localStorage:', err);
}

function persistDeedCache() {
  try {
    // Cap how many entries we persist — keep the most recently written ones.
    const entries = Array.from(deedCache.entries()).sort((a, b) => b[1].ts - a[1].ts);
    const capped = entries.slice(0, DEED_LIST_CACHE_MAX_ENTRIES);
    const obj: Record<string, DeedCacheEntry> = {};
    capped.forEach(([key, val]) => { obj[key] = val; });
    localStorage.setItem(DEED_LIST_CACHE_KEY, JSON.stringify(obj));
  } catch (err) {
    // Quota exceeded / privacy mode / etc. — non-fatal, in-memory cache still works.
    console.error('Failed to persist deed list cache to localStorage:', err);
  }
}

function setDeedCacheEntry(key: string, records: Deed[], total: number) {
  deedCache.set(key, { records, total, ts: Date.now() });
  persistDeedCache();
}

function clearDeedCache() {
  deedCache.clear();
  try {
    localStorage.removeItem(DEED_LIST_CACHE_KEY);
  } catch (err) {
    console.error('Failed to clear persisted deed list cache:', err);
  }
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// NOTE: the old client-side "auto-generate monthly deed number" helper that
// used to live here was removed — it computed the default number for a NEW
// deed from `allLoadedDeeds` (a partial, lazily-populated local cache), which
// was both stale (read one render before an in-flight fetch resolved) and
// incomplete (only ever held whichever months an admin had manually browsed).
// New-deed defaults now come from the authoritative /api/deeds/next-numbers
// endpoint via applyServerDeedNumbers(). See that function above.

// Helper to calculate order number via "closest neighbor" algorithm
function calculateOrderNumber(
  targetNumStr: string,
  targetDateStr: string,
  excludeId: string | null,
  allDeeds: Deed[]
): { calculatedOrder: string; warning: string | null } {
  if (!targetDateStr) return { calculatedOrder: '', warning: null };
  const targetNum = parseInt(targetNumStr.replace(/\D/g, ''), 10) || 1;
  const yearMonth = targetDateStr.substring(0, 7);

  const monthDeeds = allDeeds.filter(d => d.id !== excludeId && d.date && d.date.startsWith(yearMonth));

  let lowerSibling: Deed | null = null;
  let lowerSiblingNum = -1;

  let upperSibling: Deed | null = null;
  let upperSiblingNum = Infinity;

  monthDeeds.forEach(d => {
    const num = parseInt(d.number ? d.number.replace(/\D/g, '') : '', 10);
    if (isNaN(num)) return;

    if (num < targetNum) {
      if (num > lowerSiblingNum) {
        lowerSiblingNum = num;
        lowerSibling = d;
      }
    } else if (num > targetNum) {
      if (num < upperSiblingNum) {
        upperSiblingNum = num;
        upperSibling = d;
      }
    }
  });

  let candidate = 0;

  if (lowerSibling && (lowerSibling as Deed).orderNumber) {
    const lowerOrder = parseInt((lowerSibling as Deed).orderNumber!.replace(/\D/g, ''), 10) || 0;
    candidate = lowerOrder + (targetNum - lowerSiblingNum);
  } else if (upperSibling && (upperSibling as Deed).orderNumber) {
    const upperOrder = parseInt((upperSibling as Deed).orderNumber!.replace(/\D/g, ''), 10) || 0;
    candidate = upperOrder - (upperSiblingNum - targetNum);
  } else {
    let maxOrderAll = 0;
    allDeeds.forEach(d => {
      if (d.id === excludeId) return;
      if (d.orderNumber) {
        const ord = parseInt(d.orderNumber.replace(/\D/g, ''), 10);
        if (!isNaN(ord) && ord > maxOrderAll) {
          maxOrderAll = ord;
        }
      }
    });

    if (targetDateStr >= '2025-11-01' && maxOrderAll < 1300) {
      candidate = 1300;
    } else {
      candidate = maxOrderAll + 1;
    }
  }

  if (candidate < 1) candidate = 1;

  const formattedOrder = candidate < 1000 ? String(candidate).padStart(3, '0') : String(candidate);

  let warning: string | null = null;
  if (lowerSibling && (lowerSibling as Deed).orderNumber) {
    const lowerOrder = parseInt((lowerSibling as Deed).orderNumber!.replace(/\D/g, ''), 10) || 0;
    if (candidate <= lowerOrder) {
      warning = `Nomor urut Akta No. ${targetNumStr} tidak konsisten dengan Akta No. ${(lowerSibling as Deed).number} (urut ${lowerOrder}). Periksa kembali nomor akta atau tanggal.`;
    }
  }
  if (!warning && upperSibling && (upperSibling as Deed).orderNumber) {
    const upperOrder = parseInt((upperSibling as Deed).orderNumber!.replace(/\D/g, ''), 10) || 0;
    if (candidate >= upperOrder) {
      warning = `Nomor urut Akta No. ${targetNumStr} tidak konsisten dengan Akta No. ${(upperSibling as Deed).number} (urut ${upperOrder}). Periksa kembali nomor akta atau tanggal.`;
    }
  }

  return { calculatedOrder: formattedOrder, warning };
}

export const DeedBook: React.FC = () => {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user?.email);

  const currentDate = useMemo(() => new Date(), []);
  const currentYearNum = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentMonthKey = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;

  const [selectedYear, setSelectedYear] = useState<string>(currentYearNum.toString());
  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalDeedsCount, setTotalDeedsCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | string>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [monthCache, setMonthCache] = useState<Record<string, Deed[]>>({});
  const [loadingMonths, setLoadingMonths] = useState<Record<string, boolean>>({});
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({ [currentMonthKey]: true });

  // Form Panel State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDeedId, setEditingDeedId] = useState<string | null>(null);

  // Form Fields
  const [deedNumber, setDeedNumber] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [orderWarning, setOrderWarning] = useState<string | null>(null);
  const [deedDate, setDeedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deedTitle, setDeedTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [picName, setPicName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [appearers, setAppearers] = useState<DeedAppearer[]>([{ name: '', role: 'Self', position: '' }]);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isOrdering, setIsOrdering] = useState<boolean>(false);
  const [isFetchingNumber, setIsFetchingNumber] = useState<boolean>(false);

  // Short-lived (15s) prefetch cache for the "next deed number" server call,
  // keyed by date. Populated proactively as soon as this page mounts (for
  // today's date, the overwhelmingly common case) so that opening "Tambah
  // Akta Baru" can show a number instantly instead of always waiting for a
  // fresh round-trip — closer to how the old Firestore-cached version felt.
  // A background re-fetch still always runs to reconcile against the
  // freshest data before the admin is allowed to save.
  const numberPrefetchCache = useRef<{ date: string; numbers: { nextDeedNumber: string; nextOrderNumber: string }; ts: number } | null>(null);
  const PREFETCH_TTL_MS = 15000;

  const prefetchDeedNumbers = async (targetDate: string) => {
    try {
      const numbers = await fetchLatestDeedNumbers(targetDate);
      numberPrefetchCache.current = { date: targetDate, numbers, ts: Date.now() };
    } catch (err) {
      // Silent — this is just a warm-up. applyServerDeedNumbers() below will
      // surface a real error to the user if the on-demand fetch also fails.
      console.error('Prefetch of next deed numbers failed (will retry on demand):', err);
    }
  };

  // Warm the cache for today's date as soon as the page loads.
  useEffect(() => {
    prefetchDeedNumbers(new Date().toISOString().split('T')[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Authoritative source of truth for "No. Akta" / "No. Urut" on a NEW deed —
  // queries the D1-backed /api/deeds/next-numbers endpoint directly instead of
  // computing from `allLoadedDeeds` (which is only ever a partial, lazily-loaded
  // subset of months and — due to how React state updates work — was also being
  // read one render too early, before the freshly-fetched month data had landed).
  // That combination was why the field always defaulted to '01' / '1300'
  // (the client-side fallback values) regardless of what was actually next.
  const applyServerDeedNumbers = async (targetDate: string) => {
    const cached = numberPrefetchCache.current;
    const hasFreshCache = cached && cached.date === targetDate && (Date.now() - cached.ts) < PREFETCH_TTL_MS;

    if (hasFreshCache) {
      // Show the recently-prefetched value immediately — no loading flicker.
      setDeedNumber(cached!.numbers.nextDeedNumber);
      setOrderNumber(cached!.numbers.nextOrderNumber);
      setOrderWarning(null);
    } else {
      setIsFetchingNumber(true);
      setDeedNumber('');
      setOrderNumber('');
      setOrderWarning(null);
    }

    try {
      // Always reconcile against the server, even when we showed a cached
      // value instantly — this is what keeps the fast path safe: nothing
      // is ever saved on the strength of the cache alone, only on this
      // confirmed (or freshly-fetched) result.
      const numbers = await fetchLatestDeedNumbers(targetDate);
      numberPrefetchCache.current = { date: targetDate, numbers, ts: Date.now() };
      setDeedNumber(numbers.nextDeedNumber);
      setOrderNumber(numbers.nextOrderNumber);
    } catch (err) {
      console.error('Error fetching next deed numbers from server:', err);
      if (!hasFreshCache) {
        setOrderWarning('Gagal mengambil No. Akta/No. Urut berikutnya dari server. Klik tombol muat ulang atau ganti tanggal untuk mencoba lagi sebelum menyimpan.');
      }
      // If we already showed a fresh cached value, leave it displayed — it
      // was confirmed by the server only seconds ago — but don't silently
      // treat it as re-verified for THIS save; isFetchingNumber below
      // reflects whether a confirmed-fresh value is currently in hand.
    } finally {
      setIsFetchingNumber(false);
    }
  };

  // Load deeds server-side with local memory cache fallback
  useEffect(() => {
    let active = true;
    const cleanSearch = searchTerm.trim();
    const cacheKey = `deeds:page=${currentPage}:size=${pageSize}:search=${cleanSearch}:year=${selectedYear}`;
    
    const cached = deedCache.get(cacheKey);
    if (cached) {
      setDeeds(cached.records);
      setTotalDeedsCount(cached.total);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadData = async () => {
      try {
        const res = await NotaryService.getDeedsPaginated({
          page: currentPage,
          pageSize,
          search: cleanSearch,
          year: selectedYear
        });
        if (active && res.success) {
          setDeeds(res.records);
          setTotalDeedsCount(res.total);
          setDeedCacheEntry(cacheKey, res.records, res.total);
        }
      } catch (err) {
        console.error('Failed to load paginated deeds:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      loadData();
    }, cleanSearch ? 350 : 0);

    return () => {
      active = false;
      clearTimeout(debounceTimer);
    };
  }, [currentPage, pageSize, searchTerm, selectedYear]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedYear]);

  // Combine all loaded deeds from monthCache into a single list for helper calculations
  const allLoadedDeeds = useMemo(() => {
    return Object.values(monthCache).flat();
  }, [monthCache]);

  // Available Years dropdown choices
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(currentYearNum.toString());
    yearsSet.add((currentYearNum - 1).toString());
    yearsSet.add((currentYearNum - 2).toString());
    Object.keys(monthCache).forEach((k) => {
      const y = k.split('-')[0];
      if (y) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort().reverse();
  }, [currentYearNum, monthCache]);

  // Month groups to render for the selected year
  const monthGroupsToDisplay = useMemo(() => {
    const groups: { groupKey: string; year: number; month: number; monthName: string }[] = [];

    if (selectedYear !== 'ALL') {
      const y = parseInt(selectedYear, 10);
      if (!isNaN(y)) {
        const maxM = y === currentYearNum ? currentMonthNum : 12;
        for (let m = maxM; m >= 1; m--) {
          const groupKey = `${y}-${String(m).padStart(2, '0')}`;
          groups.push({
            groupKey,
            year: y,
            month: m,
            monthName: MONTH_NAMES[m - 1] || `Bulan ${m}`
          });
        }
      }
    } else {
      const keysSet = new Set<string>();
      Object.keys(monthCache).forEach((k) => keysSet.add(k));
      keysSet.add(currentMonthKey);

      const sorted = Array.from(keysSet).sort().reverse();
      sorted.forEach((key) => {
        const parts = key.split('-');
        if (parts.length === 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(y) && !isNaN(m)) {
            groups.push({
              groupKey: key,
              year: y,
              month: m,
              monthName: MONTH_NAMES[m - 1] || `Bulan ${m}`
            });
          }
        }
      });
    }

    return groups;
  }, [selectedYear, currentYearNum, currentMonthNum, currentMonthKey, monthCache]);

  // Toggle month accordion and lazy load from Firestore if not cached
  const handleToggleMonth = async (groupKey: string) => {
    const isOpen = !!openMonths[groupKey];
    if (isOpen) {
      setOpenMonths((prev) => ({ ...prev, [groupKey]: false }));
      return;
    }

    setOpenMonths((prev) => ({ ...prev, [groupKey]: true }));

    // If already cached, do not query Firestore again
    if (groupKey in monthCache) {
      return;
    }

    const parts = groupKey.split('-');
    if (parts.length < 2) return;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(y) || isNaN(m)) return;

    setLoadingMonths((prev) => ({ ...prev, [groupKey]: true }));
    try {
      const data = await NotaryService.getDeedsByMonth(y, m);
      setMonthCache((prev) => ({ ...prev, [groupKey]: data || [] }));
    } catch (err) {
      console.error(`Error loading deeds for ${groupKey}:`, err);
    } finally {
      setLoadingMonths((prev) => ({ ...prev, [groupKey]: false }));
    }
  };

  // Helper to ensure target date's month is loaded in cache
  const ensureMonthLoaded = async (dateStr: string) => {
    if (!dateStr || dateStr.length < 7) return;
    const ymKey = dateStr.substring(0, 7);
    if (ymKey in monthCache) return;
    const parts = ymKey.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(y) && !isNaN(m)) {
      try {
        const monthData = await NotaryService.getDeedsByMonth(y, m);
        setMonthCache((prev) => ({ ...prev, [ymKey]: monthData || [] }));
      } catch (err) {
        console.error(`Error loading month data for ${ymKey}:`, err);
      }
    }
  };

  // Open Form Panel for Create / Edit
  const handleOpenModal = async (deed?: Deed) => {
    if (!superAdmin) {
      alert('Hanya Super Admin yang dapat mengubah data akta.');
      return;
    }
    if (deed) {
      setEditingDeedId(deed.id);
      setDeedNumber(deed.number || '');
      setOrderNumber(deed.orderNumber || '');
      const dDate = deed.date || new Date().toISOString().split('T')[0];
      setDeedDate(dDate);
      await ensureMonthLoaded(dDate);

      setDeedTitle(deed.title || '');
      setCategory(deed.category || '');
      setClientName(deed.clientName || '');
      setPicName(deed.picName || '');
      setNotes(deed.notes || '');

      if (deed.appearers && deed.appearers.length > 0) {
        setAppearers(
          deed.appearers.map((a) => {
            const hasGrantors = a.grantors && a.grantors.length > 0;
            const isBothRole = a.role === 'Both' || a.role === 'SelfAndProxy' || (a.bertindakSebagai && a.bertindakSebagai.toLowerCase().includes('diri sendiri') && a.bertindakSebagai.toLowerCase().includes('kuasa'));
            const isProxyRole = a.role === 'Proxy' || (a.bertindakSebagai && a.bertindakSebagai.toLowerCase().includes('kuasa') && !isBothRole);
            const role: 'Self' | 'Proxy' | 'Both' = isBothRole ? 'Both' : (isProxyRole ? 'Proxy' : (a.role as any || (hasGrantors ? 'Proxy' : 'Self')));
            return {
              ...a,
              role,
              grantors: (role === 'Proxy' || role === 'Both')
                ? (hasGrantors ? a.grantors : [{ name: '' }])
                : undefined
            };
          })
        );
      } else {
        setAppearers([{ name: '', role: 'Self', position: '' }]);
      }

      const { warning } = calculateOrderNumber(deed.number || '', dDate, deed.id, allLoadedDeeds);
      setOrderWarning(warning);
    } else {
      const defaultDate = new Date().toISOString().split('T')[0];
      setEditingDeedId(null);
      setDeedDate(defaultDate);
      // Fire-and-forget local cache warm-up (used only for the manual-edit
      // sibling warning in handleNumberChange) — the actual default numbers
      // now come from the authoritative server call below.
      ensureMonthLoaded(defaultDate);
      await applyServerDeedNumbers(defaultDate);

      setDeedTitle('');
      setCategory('');
      setClientName('');
      setPicName('');
      setNotes('');
      setAppearers([{ name: '', role: 'Self', position: '' }]);
    }
    setIsModalOpen(true);
  };

  const location = useLocation();
  const directActionHandledRef = useRef<string | null>(null);

  useEffect(() => {
    const isDirectAction = (location.state as any)?.openCreateModal || location.search.includes('action=new') || location.search.includes('create=true');
    const actionKey = `${location.pathname}_${location.search}_${location.key}`;
    if (isDirectAction && directActionHandledRef.current !== actionKey) {
      directActionHandledRef.current = actionKey;
      handleOpenModal();
    }
  }, [location, superAdmin]);

  // Date Change Handler
  const handleDateChange = async (newDate: string) => {
    setDeedDate(newDate);
    if (!newDate) return;

    ensureMonthLoaded(newDate);

    if (!editingDeedId) {
      // New deed: ask the server for the authoritative next number for the
      // new month/date, same as when the form first opens.
      await applyServerDeedNumbers(newDate);
      return;
    }

    // Editing an existing deed: keep the existing local "closest neighbor"
    // consistency check against whatever siblings are currently loaded —
    // this only drives an advisory warning, not the saved value, so it's
    // fine for it to rely on the partial local cache.
    await ensureMonthLoaded(newDate);
    const { warning } = calculateOrderNumber(deedNumber, newDate, editingDeedId, allLoadedDeeds);
    setOrderWarning(warning);
  };

  // Number Change Handler
  const handleNumberChange = (newNum: string) => {
    setDeedNumber(newNum);
    if (!deedDate) return;

    const { calculatedOrder, warning } = calculateOrderNumber(newNum, deedDate, editingDeedId, allLoadedDeeds);
    setOrderNumber(calculatedOrder);
    setOrderWarning(warning);
  };

  // Appearer Role Change Handler (Supports 'Self' | 'Proxy' | 'Both')
  const handleRoleChange = (index: number, role: 'Self' | 'Proxy' | 'Both') => {
    const updated = [...appearers];
    updated[index].role = role;
    if (role === 'Proxy' || role === 'Both') {
      if (!updated[index].grantors || updated[index].grantors!.length === 0) {
        updated[index].grantors = [{ name: '' }];
      }
    } else {
      updated[index].grantors = undefined;
    }
    setAppearers(updated);
  };

  // Grantor sub-list handlers
  const handleAddGrantor = (appearerIndex: number) => {
    const updated = [...appearers];
    const current = updated[appearerIndex].grantors || [];
    updated[appearerIndex].grantors = [...current, { name: '' }];
    setAppearers(updated);
  };

  const handleUpdateGrantor = (appearerIndex: number, grantorIndex: number, name: string) => {
    const updated = [...appearers];
    if (!updated[appearerIndex].grantors) {
      updated[appearerIndex].grantors = [];
    }
    updated[appearerIndex].grantors![grantorIndex] = { ...updated[appearerIndex].grantors![grantorIndex], name };
    setAppearers(updated);
  };

  const handleRemoveGrantor = (appearerIndex: number, grantorIndex: number) => {
    const updated = [...appearers];
    if (updated[appearerIndex].grantors) {
      updated[appearerIndex].grantors = updated[appearerIndex].grantors!.filter((_, i) => i !== grantorIndex);
      if (updated[appearerIndex].grantors!.length === 0) {
        updated[appearerIndex].grantors = [{ name: '' }];
      }
    }
    setAppearers(updated);
  };


  // Function to shift numbers forward when inserting/editing with a conflict
  const shiftDeedsForInsert = async (targetNumber: number, targetDate: string, excludeId: string | null) => {
    if (!targetDate || targetDate.length < 7) return;
    const yearMonth = targetDate.substring(0, 7);

    const sameMonthConflict = allLoadedDeeds.filter((d) => {
      if (d.id === excludeId) return false;
      if (!d.date || !d.date.startsWith(yearMonth)) return false;
      const n = parseInt(d.number, 10);
      return !isNaN(n) && n >= targetNumber;
    });

    if (sameMonthConflict.length === 0) return;

    // Sort from largest to smallest to avoid collisions during sequential updates
    sameMonthConflict.sort((a, b) => parseInt(b.number, 10) - parseInt(a.number, 10));

    for (const d of sameMonthConflict) {
      const oldNum = parseInt(d.number, 10);
      const newNum = String(oldNum + 1).padStart(d.number.length >= 2 ? 2 : 1, '0');
      const oldOrder = parseInt(d.orderNumber || '0', 10);
      const newOrder = String(oldOrder + 1);
      await NotaryService.updateDeed(d.id, { number: newNum, orderNumber: newOrder });
    }
  };

  // Save Deed
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdmin) {
      alert('Hanya Super Admin yang dapat mengubah data akta.');
      return;
    }
    if (isRecordLocked(deedDate, user?.email)) {
      alert(`Data akta untuk tanggal ${deedDate} dalam keadaan terkunci (melewati tanggal 20 bulan berikutnya).`);
      return;
    }

    if (!deedNumber.trim() || !deedDate || !deedTitle.trim()) {
      alert('Nomor Akta, Tanggal, dan Judul Akta wajib diisi!');
      return;
    }

    // Validation for appearers
    for (let i = 0; i < appearers.length; i++) {
      const app = appearers[i];
      if (!app.name.trim()) {
        alert(`Nama penghadap #${i + 1} wajib diisi!`);
        return;
      }
      if (app.role === 'Proxy' || app.role === 'Both' || (app.role as any) === 'SelfAndProxy') {
        const validGrantors = (app.grantors || []).filter((g) => g.name.trim() !== '');
        if (validGrantors.length === 0) {
          alert(`Untuk penghadap "${app.name}" (${app.role === 'Both' ? 'Diri Sendiri & Kuasa' : 'Kuasa'}), mohon isi minimal 1 nama pemberi kuasa.`);
          return;
        }
      }
    }

    const cleanAppearers: DeedAppearer[] = appearers
      .filter((a) => a.name.trim() !== '')
      .map((a) => {
        if (a.role === 'Proxy' || a.role === 'Both') {
          const validGrantors = (a.grantors || []).filter((g) => g.name.trim() !== '');
          return {
            ...a,
            role: a.role,
            grantors: validGrantors
          };
        }
        return {
          ...a,
          role: 'Self',
          grantors: undefined
        };
      });

    // Create top-level grantors array for backward compatibility
    const cleanTopGrantors: DeedGrantor[] = [];
    cleanAppearers.forEach((a) => {
      if ((a.role === 'Proxy' || a.role === 'Both') && a.grantors) {
        a.grantors.forEach((g) => {
          if (g.name.trim() !== '') {
            cleanTopGrantors.push({ name: g.name.trim() });
          }
        });
      }
    });

    // Chronological validation within the same month and year
    const targetNumVal = parseInt(deedNumber, 10);
    if (!isNaN(targetNumVal)) {
      const yearMonth = deedDate.substring(0, 7);
      
      // Find deeds in the same month/year
      const sameMonthDeeds = allLoadedDeeds.filter((d) => {
        if (d.id === editingDeedId) return false;
        return d.date && d.date.startsWith(yearMonth);
      });

      // 1) Check for any deed with smaller number that has a later date
      const smallerNumberViolator = sameMonthDeeds.find((d) => {
        const num = parseInt(d.number, 10);
        return !isNaN(num) && num < targetNumVal && d.date > deedDate;
      });

      if (smallerNumberViolator) {
        alert(
          `Kesalahan penanggalan: Akta No. ${targetNumVal} (tanggal ${deedDate}) tidak boleh mendahului tanggal Akta No. ${smallerNumberViolator.number} (${smallerNumberViolator.date}).`
        );
        return;
      }

      // 2) Check for any deed with greater number that has an earlier date
      const greaterNumberViolator = sameMonthDeeds.find((d) => {
        const num = parseInt(d.number, 10);
        return !isNaN(num) && num > targetNumVal && d.date < deedDate;
      });

      if (greaterNumberViolator) {
        alert(
          `Kesalahan penanggalan: Akta No. ${targetNumVal} (tanggal ${deedDate}) tidak boleh melewati tanggal Akta No. ${greaterNumberViolator.number} (${greaterNumberViolator.date}).`
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      // Check for conflicts and shift if necessary
      const targetNum = parseInt(deedNumber, 10);
      if (!isNaN(targetNum)) {
        const yearMonth = deedDate.substring(0, 7);
        const hasCollision = allLoadedDeeds.some((d) => {
          if (d.id === editingDeedId) return false;
          if (!d.date || !d.date.startsWith(yearMonth)) return false;
          return parseInt(d.number, 10) === targetNum;
        });
        
        if (hasCollision) {
          await shiftDeedsForInsert(targetNum, deedDate, editingDeedId);
        }
      }

      const deedData: Omit<Deed, 'id'> = {
        number: deedNumber.trim(),
        orderNumber: orderNumber.trim() || undefined,
        date: deedDate,
        title: deedTitle.trim(),
        category: category.trim() || undefined,
        clientName: clientName.trim() || undefined,
        picName: picName.trim() || undefined,
        notes: notes.trim() || undefined,
        appearers: cleanAppearers,
        grantors: cleanTopGrantors
      };

      if (editingDeedId) {
        await NotaryService.updateDeed(editingDeedId, deedData);
      } else {
        await NotaryService.addDeed(deedData);
      }

      // Refresh cache for affected month
      const ymKey = deedDate.substring(0, 7);
      const [yS, mS] = ymKey.split('-');
      const y = parseInt(yS, 10);
      const m = parseInt(mS, 10);
      if (!isNaN(y) && !isNaN(m)) {
        const fresh = await NotaryService.getDeedsByMonth(y, m);
        setMonthCache((prev) => ({ ...prev, [ymKey]: fresh || [] }));
      }

      // The deed number(s) just used are now taken — drop the prefetch
      // cache and warm it again in the background so the NEXT "Tambah
      // Akta Baru" click (same session) reflects this save immediately
      // instead of momentarily offering an already-used number.
      numberPrefetchCache.current = null;
      prefetchDeedNumbers(deedDate);

      // The paginated list cache (including its localStorage mirror) is now
      // stale for whichever page/filter combos include this deed — clear it,
      // then refetch the currently-visible page so the table reflects this
      // save immediately instead of only on the next full navigation.
      clearDeedCache();
      try {
        const cleanSearch = searchTerm.trim();
        const refreshed = await NotaryService.getDeedsPaginated({
          page: currentPage,
          pageSize,
          search: cleanSearch,
          year: selectedYear
        });
        if (refreshed.success) {
          setDeeds(refreshed.records);
          setTotalDeedsCount(refreshed.total);
          const cacheKey = `deeds:page=${currentPage}:size=${pageSize}:search=${cleanSearch}:year=${selectedYear}`;
          setDeedCacheEntry(cacheKey, refreshed.records, refreshed.total);
        }
      } catch (refreshErr) {
        console.error('Failed to refresh deed list after save:', refreshErr);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save deed:', err);
      alert('Gagal menyimpan data akta.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Deed with Optimistic local state update and snapshot rollback
  const handleDelete = async (deed: Deed) => {
    if (!superAdmin) {
      alert('Hanya Super Admin yang dapat menghapus data akta.');
      return;
    }
    if (isRecordLocked(deed.date, user?.email)) {
      alert(`Record ini terkunci secara otomatis setelah tanggal ${getLockDeadlineMessage(deed.date)}.`);
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus akta No. ${deed.number} - "${deed.title}"?`)) {
      console.log(`[DEED DELETE START]\nid: ${deed.id}\ndeed number: ${deed.number || deed.deedNumber || '-'}`);

      // 1. Take snapshot of current state for rollback
      const backupDeeds = [...deeds];
      const backupTotal = totalDeedsCount;
      const backupMonthCache = { ...monthCache };

      // 2. Optimistically update local UI state immediately
      const remainingDeeds = deeds.filter(d => d.id !== deed.id);
      setDeeds(remainingDeeds);
      setTotalDeedsCount(prev => Math.max(0, prev - 1));

      // Optimistically update monthCache locally without re-fetching 1000 records
      if (deed.date && deed.date.length >= 7) {
        const ymKey = deed.date.substring(0, 7);
        setMonthCache(prev => {
          if (!prev[ymKey]) return prev;
          return {
            ...prev,
            [ymKey]: prev[ymKey].filter(d => d.id !== deed.id)
          };
        });
      }

      // Invalidate caches
      clearDeedCache();
      numberPrefetchCache.current = null;
      if (deed.date) {
        prefetchDeedNumbers(deed.date);
      }

      // If the current page became empty after deleting the last item, adjust page
      if (remainingDeeds.length === 0 && currentPage > 1) {
        setCurrentPage(prev => Math.max(1, prev - 1));
      }

      // 3. Perform delete on backend in the background
      try {
        await NotaryService.deleteDeed(deed.id);
      } catch (err: any) {
        console.log('[ROLLBACK START]');
        const errMsg = err?.message || 'Terjadi kesalahan sistem saat menghapus akta.';
        console.error(`[ROLLBACK RESULT]\nsuccess/failure: failure\nerror: ${errMsg}`);

        // Restore state from snapshot (NO full refetch / sync)
        setDeeds(backupDeeds);
        setTotalDeedsCount(backupTotal);
        setMonthCache(backupMonthCache);

        alert(`Akta gagal dihapus: ${errMsg}`);
      }
    }
  };

  // Rapikan Nomor Urut
  const handleReorder = async () => {
    if (!superAdmin) {
      alert('Hanya Super Admin yang dapat merapikan nomor urut.');
      return;
    }
    const isAll = selectedYear === 'ALL';
    const yearToOrder = isAll ? 'ALL' : selectedYear;
    
    const confirmMessage = isAll 
      ? `Proses ini akan merapikan Nomor Urut (orderNumber) untuk SEMUA Akta secara kronologis lintas tahun (melanjut terus tanpa reset di awal tahun). Lanjutkan?`
      : `Proses ini akan merapikan Nomor Urut (orderNumber) untuk Akta tahun ${yearToOrder} dengan MELANJUTKAN nomor urut dari tahun sebelumnya (tidak mereset ke 1). Lanjutkan?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsOrdering(true);
    try {
      if (isAll) {
        // Tidy up all deeds in the database chronologically
        const allDeeds = await NotaryService.getAllDeedsForReorder();
        const allSorted = [...allDeeds];
        allSorted.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
        });

        let currentOrder = 1;
        if (allSorted.length > 0 && allSorted[0].date && allSorted[0].date >= '2025-11-01') {
          currentOrder = 1300;
        }

        let updatedCount = 0;
        for (let i = 0; i < allSorted.length; i++) {
          const newOrder = String(currentOrder + i);
          if (allSorted[i].orderNumber !== newOrder) {
            await NotaryService.updateDeed(allSorted[i].id, { orderNumber: newOrder });
            updatedCount++;
          }
        }
        alert(`Berhasil merapikan nomor urut untuk ${allSorted.length} akta (diperbarui: ${updatedCount}).`);
      } else {
        // Tidy up only the selected year
        const yearDeeds = await NotaryService.getDeedsByYear(parseInt(yearToOrder, 10));
        yearDeeds.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
        });

        const allForPrior = await NotaryService.getAllDeedsForReorder();
        const priorDeeds = allForPrior.filter((d) => d.date && d.date < `${yearToOrder}-01-01`);
        let maxPriorOrder = 0;
        priorDeeds.forEach((d) => {
          if (d.orderNumber) {
            const ord = parseInt(d.orderNumber.replace(/\D/g, ''), 10);
            if (!isNaN(ord) && ord > maxPriorOrder) {
              maxPriorOrder = ord;
            }
          }
        });

        let startOrder = maxPriorOrder > 0 ? maxPriorOrder + 1 : 1;
        if (maxPriorOrder === 0 && yearToOrder >= '2025') {
          startOrder = 1300;
        }

        let updatedCount = 0;
        for (let i = 0; i < yearDeeds.length; i++) {
          const newOrder = String(startOrder + i);
          if (yearDeeds[i].orderNumber !== newOrder) {
            await NotaryService.updateDeed(yearDeeds[i].id, { orderNumber: newOrder });
            updatedCount++;
          }
        }
        alert(`Berhasil merapikan nomor urut untuk ${yearDeeds.length} akta tahun ${yearToOrder} (diperbarui: ${updatedCount}).`);
      }

      // Refresh currently open/cached months
      for (const ymKey of Object.keys(monthCache)) {
        const parts = ymKey.split('-');
        if (parts.length === 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (!isNaN(y) && !isNaN(m)) {
            const fresh = await NotaryService.getDeedsByMonth(y, m);
            setMonthCache((prev) => ({ ...prev, [ymKey]: fresh || [] }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to reorder deeds:', err);
      alert('Terjadi kesalahan saat merapikan nomor urut.');
    } finally {
      setIsOrdering(false);
    }
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      const d = parts[2];
      return `${d} ${MONTH_NAMES[m] || ''} ${y}`;
    }
    return dateStr;
  };

  const isFormLocked = !superAdmin || isRecordLocked(deedDate, user?.email);

  return (
    <div className="space-y-6">
      {!isModalOpen && (
        <MobileHeader
          title="Buku Akta"
          onOpenSidebar={() => {
            if (typeof window !== 'undefined') {
              const btn = document.querySelector('button[aria-label="Toggle sidebar"]') as HTMLButtonElement;
              if (btn) btn.click();
            }
          }}
          onAdd={() => handleOpenModal()}
          addTooltip="Buat Akta Baru"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Cari no. akta, judul, penghadap..."
          totalItems={totalDeedsCount}
          totalLabel="Akta"
        />
      )}

      {/* Top Header & Actions (DESKTOP) */}
      <div className="hidden md:block">
        <PageHeader
          title="Buku Daftar Akta Notaris"
          description="Pencatatan harian akta-akta notaris resmi dan penomoran urut bulanan."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {!isModalOpen && superAdmin && (
                <>
                  <button
                    onClick={handleReorder}
                    disabled={isOrdering}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    title="Urutkan ulang nomor urut akta secara berurutan berdasarkan tanggal"
                  >
                    <RefreshCw size={14} className={isOrdering ? 'animate-spin' : ''} />
                    {isOrdering ? 'Merapikan...' : 'Rapikan No. Urut'}
                  </button>

                  <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={16} />
                    Buat Akta Baru
                  </button>
                </>
              )}
            </div>
          }
        />
      </div>

      {/* Main Content Area: Inline Form Panel OR Deed Book List */}
      {isModalOpen ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50/80">
            <h3 className="font-bold text-slate-900 text-base">
              {editingDeedId ? 'Edit Data Akta' : 'Input Akta Baru'}
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Tutup Form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6 text-xs sm:text-sm">
            {/* Lock Banner */}
            {isFormLocked && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start gap-3">
                <Lock className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="font-bold text-amber-900">
                    Data Akta Terkunci — Batas Edit Terlampaui
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Pengeditan data akta untuk tanggal <strong>{deedDate}</strong> telah dikunci secara otomatis setelah tanggal <strong>{getLockDeadlineMessage(deedDate)}</strong> (setelah tanggal 20 bulan berikutnya).
                  </p>
                  <p className="text-amber-700 italic">
                    Hanya Super Admin (rdyndi@gmail.com) yang dapat mengedit data akta ini.
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 1: DATA KLIEN & PEKERJAAN (OPSIONAL) */}
            <div className="space-y-3 border-b border-slate-200 pb-5">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
                DATA KLIEN & PEKERJAAN (OPSIONAL)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Nama Klien
                  </label>
                  <input
                    type="text"
                    disabled={isFormLocked}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Contoh: PT ABC / Nama Pemohon"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Kategori Pekerjaan
                  </label>
                  <input
                    type="text"
                    disabled={isFormLocked}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Contoh: Pendirian / RUPS / Jual Beli"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Nama PIC / Staf
                  </label>
                  <input
                    type="text"
                    disabled={isFormLocked}
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    placeholder="Nama penanggung jawab"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: DATA DOKUMEN */}
            <div className="space-y-4 border-b border-slate-200 pb-5">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
                DATA DOKUMEN
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    No. Akta / Bulanan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isFormLocked || isFetchingNumber}
                    value={isFetchingNumber ? '' : deedNumber}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    placeholder={isFetchingNumber ? 'Memuat nomor...' : 'Contoh: 01, 02, 10'}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 font-semibold text-xs sm:text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Otomatis reset ke 1 tiap ganti bulan.</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    No. Urut (Buku Besar)
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={isFetchingNumber ? '' : orderNumber}
                    placeholder={isFetchingNumber ? 'Memuat nomor...' : 'Otomatis terhitung'}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed font-semibold text-xs sm:text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Otomatis mengikuti No. Akta &amp; Tanggal — tidak bisa diedit manual.</p>
                  {orderWarning && (
                    <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-1">
                      <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                      <span>{orderWarning}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Tanggal Akta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isFormLocked}
                    value={deedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Sifat / Judul Akta <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isFormLocked}
                  value={deedTitle}
                  onChange={(e) => setDeedTitle(e.target.value)}
                  placeholder="Contoh: PERNYATAAN KEPUTUSAN PARA PEMEGANG SAHAM..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none uppercase disabled:bg-slate-100 disabled:text-slate-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* SECTION 3: PARA PENGHADAP */}
            <div className="space-y-4 border-b border-slate-200 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
                    PARA PENGHADAP / PARA PIHAK <span className="text-red-500">*</span>
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih peran "Diri Sendiri", "Kuasa", atau "Diri Sendiri & Kuasa" untuk tiap penghadap.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isFormLocked}
                  onClick={() => setAppearers([...appearers, { name: '', role: 'Self', position: '' }])}
                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 text-xs disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                >
                  <Plus size={15} /> Tambah Penghadap
                </button>
              </div>

              <div className="space-y-3">
                {appearers.map((app, appIdx) => {
                  const hasGrantors = app.role === 'Proxy' || app.role === 'Both';
                  return (
                    <div key={appIdx} className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-1 uppercase">
                            BERTINDAK SEBAGAI
                          </label>
                          <select
                            disabled={isFormLocked}
                            value={app.role || 'Self'}
                            onChange={(e) => handleRoleChange(appIdx, e.target.value as 'Self' | 'Proxy' | 'Both')}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none text-xs font-semibold bg-white text-slate-800 disabled:bg-slate-100"
                          >
                            <option value="Self">Diri Sendiri</option>
                            <option value="Proxy">Kuasa</option>
                            <option value="Both">Diri Sendiri & Kuasa</option>
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-1 uppercase">
                            NAMA PENGHADAP *
                          </label>
                          <input
                            type="text"
                            disabled={isFormLocked}
                            placeholder={`Nama Lengkap Penghadap #${appIdx + 1}`}
                            value={app.name}
                            onChange={(e) => {
                              const updated = [...appearers];
                              updated[appIdx].name = e.target.value;
                              setAppearers(updated);
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none text-xs bg-white disabled:bg-slate-100"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-1 uppercase">
                            JABATAN / STATUS
                          </label>
                          <input
                            type="text"
                            disabled={isFormLocked}
                            placeholder="misal: QQ DICKY"
                            value={app.position || ''}
                            onChange={(e) => {
                              const updated = [...appearers];
                              updated[appIdx].position = e.target.value;
                              setAppearers(updated);
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none text-xs bg-white disabled:bg-slate-100"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end pt-2 sm:pt-4">
                          {appearers.length > 1 && (
                            <button
                              type="button"
                              disabled={isFormLocked}
                              onClick={() => setAppearers(appearers.filter((_, i) => i !== appIdx))}
                              className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-colors"
                              title="Hapus Penghadap"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Nested Grantors list if Proxy or Both */}
                      {hasGrantors && (
                        <div className="ml-1 pl-3 border-l-2 border-blue-500 space-y-2.5 pt-2 bg-blue-50/60 p-3 rounded-r-xl">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-blue-900 text-xs">
                              Pemberi Kuasa (Yang Memberi Kuasa Kepada {app.name || 'Penghadap Ini'}):
                            </span>
                            <button
                              type="button"
                              disabled={isFormLocked}
                              onClick={() => handleAddGrantor(appIdx)}
                              className="text-blue-700 hover:text-blue-900 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              + Tambah Pemberi Kuasa
                            </button>
                          </div>

                          {(app.grantors || [{ name: '' }]).map((grantor, gIdx) => (
                            <div key={gIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                disabled={isFormLocked}
                                placeholder={`Nama Pemberi Kuasa #${gIdx + 1} *`}
                                value={grantor.name}
                                onChange={(e) => handleUpdateGrantor(appIdx, gIdx, e.target.value)}
                                className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-none text-xs bg-white disabled:bg-slate-100"
                              />
                              {(app.grantors || []).length > 1 && (
                                <button
                                  type="button"
                                  disabled={isFormLocked}
                                  onClick={() => handleRemoveGrantor(appIdx, gIdx)}
                                  className="text-red-500 hover:text-red-700 p-1.5 cursor-pointer disabled:opacity-50"
                                  title="Hapus Pemberi Kuasa"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: CATATAN / KETERANGAN TAMBAHAN */}
            <div>
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">
                CATATAN / KETERANGAN TAMBAHAN
              </span>
              <textarea
                rows={3}
                disabled={isFormLocked}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan internal opsional..."
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 text-xs sm:text-sm"
              />
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving || isFormLocked || isFetchingNumber || !deedNumber || !orderNumber}
                title={isFetchingNumber ? 'Menunggu verifikasi No. Akta/No. Urut dari server...' : (!deedNumber || !orderNumber) ? 'No. Akta/No. Urut belum terisi — coba ganti tanggal untuk memuat ulang.' : undefined}
                className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Check size={18} />
                {isSaving ? 'Menyimpan...' : isFetchingNumber ? 'Memuat nomor...' : 'Simpan Akta'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Filter & Search Bar (DESKTOP) */}
          <div className="hidden md:flex bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nomor akta, judul, penghadap..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 font-medium">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-700 bg-white"
              >
                <option value="ALL">Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deed Book List */}
          {loading ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-500 font-medium">Memuat data akta resmi...</span>
              </div>
            </div>
          ) : deeds.length === 0 ? (
            <MobileEmptyState
              message='Belum ada data akta ditemukan.'
              actionText="Buat Akta Baru"
              onAction={() => handleOpenModal()}
            />
          ) : (
            <>
              {/* MOBILE CARDS VIEW */}
              <div className="md:hidden space-y-3">
                {deeds.map((deed, idx) => {
                  const locked = !superAdmin || isRecordLocked(deed.date, user?.email);
                  return (
                    <div
                      key={deed.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            Akta No. {deed.number}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1 leading-snug">
                            {deed.title}
                          </h4>
                          {deed.clientName && (
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                              Klien: {deed.clientName}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">
                          No. {deed.orderNumber || idx + 1}
                        </span>
                      </div>

                      {deed.appearers && deed.appearers.length > 0 && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Penghadap:</span>
                          {deed.appearers.map((app, i) => (
                            <p key={i} className="text-xs font-medium text-slate-800">
                              • {app.name} {app.position && <span className="text-slate-500 font-normal">({app.position})</span>}
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">{formatDateIndo(deed.date)}</span>
                        {locked ? (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                            <Lock size={12} className="text-amber-600" /> Terkunci
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(deed)}
                              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(deed)}
                              className="px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse table-fixed min-w-[1000px]">
                  <colgroup>
                    <col className="w-[80px]" />
                    <col className="w-[85px]" />
                    <col className="w-[130px]" />
                    <col className="w-[36%]" />
                    <col className="w-[36%]" />
                    <col className="w-[90px]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px]">
                      <th className="p-3 text-center border-r border-slate-200">NO. URUT</th>
                      <th className="p-3 text-center border-r border-slate-200">NO. AKTA</th>
                      <th className="p-3 text-center border-r border-slate-200">TANGGAL</th>
                      <th className="p-3 border-r border-slate-200">SIFAT / JUDUL AKTA</th>
                      <th className="p-3 border-r border-slate-200">NAMA PENGHADAP / PARA PIHAK</th>
                      <th className="p-3 text-center">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {deeds.map((deed, idx) => {
                      const locked = !superAdmin || isRecordLocked(deed.date, user?.email);
                      const lockMsg = !superAdmin
                        ? 'Hanya Super Admin yang dapat mengubah data'
                        : (isRecordLocked(deed.date, user?.email) ? `Terkunci otomatis setelah ${getLockDeadlineMessage(deed.date)}` : '');

                      return (
                        <tr key={deed.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center border-r border-slate-200 font-medium text-slate-600">
                            {deed.orderNumber || idx + 1 + (currentPage - 1) * (typeof pageSize === 'string' ? deeds.length : pageSize)}
                          </td>
                          <td className="p-3 text-center border-r border-slate-200 font-bold text-slate-900">
                            {deed.number}
                          </td>
                          <td className="p-3 text-center border-r border-slate-200 text-slate-600 whitespace-nowrap">
                            {formatDateIndo(deed.date)}
                          </td>
                          <td className="p-3 border-r border-slate-200 font-medium text-slate-900 leading-snug break-words">
                            {deed.title}
                            {deed.category && (
                              <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded border border-blue-200 font-normal">
                                {deed.category}
                              </span>
                            )}
                            {deed.clientName && (
                              <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                Klien: {deed.clientName}
                              </div>
                            )}
                          </td>
                          <td className="p-3 border-r border-slate-200 text-slate-800 leading-snug break-words">
                            {deed.appearers && deed.appearers.length > 0 ? (
                              <div className="space-y-1">
                                {deed.appearers.map((app, i) => (
                                  <div key={i} className="text-slate-900 font-medium">
                                    • {app.name}
                                    {app.position && <span className="text-slate-500 font-normal text-[11px]"> ({app.position})</span>}
                                    {(app.role === 'Proxy' || app.role === 'Both') && app.grantors && app.grantors.length > 0 && (
                                      <div className="ml-3 text-[11px] text-slate-600 font-normal italic">
                                        {app.role === 'Both'
                                          ? `Bertindak untuk diri sendiri dan selaku kuasa dari: ${app.grantors.map((g) => g.name).join(', ')}`
                                          : `Selaku kuasa dari: ${app.grantors.map((g) => g.name).join(', ')}`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {locked ? (
                              <div className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-1 rounded text-[11px]" title={lockMsg}>
                                <Lock size={12} className="text-amber-600" />
                                <span>Terkunci</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenModal(deed)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                  title="Edit Akta"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(deed)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                  title="Hapus Akta"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Tampilkan</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      const val = e.target.value === 'Semua' ? 'Semua' : Number(e.target.value);
                      setPageSize(val);
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                    <option value="Semua">Semua</option>
                  </select>
                  <span>baris. Menampilkan {deeds.length === 0 ? 0 : Math.min(totalDeedsCount, (currentPage - 1) * (typeof pageSize === 'string' ? totalDeedsCount : pageSize) + 1)}-{Math.min(totalDeedsCount, currentPage * (typeof pageSize === 'string' ? totalDeedsCount : pageSize))} dari {totalDeedsCount} akta.</span>
                </div>

                {totalDeedsCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Sebelumnya
                    </button>
                    <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                      Halaman {currentPage} dari {Math.ceil(totalDeedsCount / (typeof pageSize === 'string' ? 500 : pageSize)) || 1}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalDeedsCount / (typeof pageSize === 'string' ? 500 : pageSize)) || 1, prev + 1))}
                      disabled={currentPage >= (Math.ceil(totalDeedsCount / (typeof pageSize === 'string' ? 500 : pageSize)) || 1)}
                      className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      Berikutnya
                    </button>
                  </div>
                )}
              </div>
            </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
