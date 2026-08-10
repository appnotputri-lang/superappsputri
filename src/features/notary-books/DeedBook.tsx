import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageLayout';
import { Deed, DeedAppearer, DeedGrantor } from '../../../types';
import { NotaryService } from '../../services/NotaryService';
import { isRecordLocked, getLockDeadlineMessage, isSuperAdmin } from '../../utils/lockUtils';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Edit2, Trash2, Lock, RefreshCw, X, FileText, Check, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper to auto-generate monthly deed number
function getAutoDeedNumber(dateStr: string, excludeId: string | null, allDeeds: Deed[]): string {
  if (!dateStr || dateStr.length < 7) return '01';
  const yearMonth = dateStr.substring(0, 7);
  const monthDeeds = allDeeds.filter(d => d.id !== excludeId && d.date && d.date.startsWith(yearMonth));

  let maxNum = 0;
  monthDeeds.forEach(d => {
    const digits = d.number ? d.number.replace(/\D/g, '') : '';
    if (digits) {
      const val = parseInt(digits, 10);
      if (!isNaN(val) && val > maxNum) {
        maxNum = val;
      }
    }
  });

  const nextNum = maxNum + 1;
  return nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
}

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
  const [deeds, setDeeds] = useState<Deed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Form Panel State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDeedId, setEditingDeedId] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

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

  // Subscribe to deeds collection
  useEffect(() => {
    setLoading(true);
    const unsubscribe = NotaryService.subscribeDeeds((data) => {
      setDeeds(data || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    deeds.forEach((d) => {
      if (d.date && d.date.length >= 4) {
        yearsSet.add(d.date.substring(0, 4));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [deeds]);

  // Filtered Deeds
  const filteredDeeds = useMemo(() => {
    return deeds.filter((deed) => {
      // Filter Year
      if (selectedYear !== 'ALL') {
        if (!deed.date || !deed.date.startsWith(selectedYear)) return false;
      }

      // Filter Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNumber = deed.number?.toLowerCase().includes(query);
        const matchOrderNumber = deed.orderNumber?.toLowerCase().includes(query);
        const matchTitle = deed.title?.toLowerCase().includes(query);
        const matchCategory = deed.category?.toLowerCase().includes(query);
        const matchClient = deed.clientName?.toLowerCase().includes(query);
        const matchNotes = deed.notes?.toLowerCase().includes(query);
        const matchAppearers = deed.appearers?.some(
          (a) =>
            a.name?.toLowerCase().includes(query) ||
            a.position?.toLowerCase().includes(query) ||
            a.grantors?.some((g) => g.name?.toLowerCase().includes(query))
        );
        const matchGrantors = deed.grantors?.some((g) => g.name?.toLowerCase().includes(query));

        return matchNumber || matchOrderNumber || matchTitle || matchCategory || matchClient || matchNotes || matchAppearers || matchGrantors;
      }

      return true;
    });
  }, [deeds, selectedYear, searchTerm]);

  // Grouped Deeds by Month
  const groupedDeeds = useMemo(() => {
    const groups: { [key: string]: { year: number; month: number; monthName: string; deeds: Deed[] } } = {};

    filteredDeeds.forEach((deed) => {
      if (!deed.date) return;
      const parts = deed.date.split('-');
      if (parts.length < 2) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const groupKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          year,
          month,
          monthName: MONTH_NAMES[month - 1] || `Bulan ${month}`,
          deeds: []
        };
      }
      groups[groupKey].deeds.push(deed);
    });

    const sortedKeys = Object.keys(groups).sort().reverse();

    return sortedKeys.map((key) => {
      const grp = groups[key];
      grp.deeds.sort((a, b) => {
        // Sort by date descending (latest date first)
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        // Secondary sort: order number descending
        const ordA = parseInt(a.orderNumber || '0', 10);
        const ordB = parseInt(b.orderNumber || '0', 10);
        if (!isNaN(ordA) && !isNaN(ordB) && ordA !== ordB) {
          return ordB - ordA;
        }
        // Tertiary sort: deed number descending
        const numA = parseInt(a.number, 10) || 0;
        const numB = parseInt(b.number, 10) || 0;
        return numB - numA;
      });
      return grp;
    });
  }, [filteredDeeds]);

  // Auto collapse locked months by default
  useEffect(() => {
    if (groupedDeeds.length === 0) return;
    setCollapsedMonths((prev) => {
      let updated = false;
      const next = { ...prev };
      groupedDeeds.forEach((group) => {
        const groupKey = `${group.year}-${String(group.month).padStart(2, '0')}`;
        if (next[groupKey] === undefined) {
          // Check if the month is locked (using first day of that month and passing null for userEmail so we check standard deadline)
          const testDate = `${group.year}-${String(group.month).padStart(2, '0')}-01`;
          const isLocked = isRecordLocked(testDate, null);
          if (isLocked) {
            next[groupKey] = true;
            updated = true;
          }
        }
      });
      return updated ? next : prev;
    });
  }, [groupedDeeds]);

  // Open Form Panel for Create / Edit
  const handleOpenModal = (deed?: Deed) => {
    if (!superAdmin) {
      alert('Hanya Super Admin yang dapat mengubah data akta.');
      return;
    }
    if (deed) {
      setEditingDeedId(deed.id);
      setDeedNumber(deed.number || '');
      setOrderNumber(deed.orderNumber || '');
      setDeedDate(deed.date || new Date().toISOString().split('T')[0]);
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

      const { warning } = calculateOrderNumber(deed.number || '', deed.date || '', deed.id, deeds);
      setOrderWarning(warning);
    } else {
      const defaultDate = new Date().toISOString().split('T')[0];
      setEditingDeedId(null);
      setDeedDate(defaultDate);

      const autoNum = getAutoDeedNumber(defaultDate, null, deeds);
      setDeedNumber(autoNum);

      const { calculatedOrder, warning } = calculateOrderNumber(autoNum, defaultDate, null, deeds);
      setOrderNumber(calculatedOrder);
      setOrderWarning(warning);

      setDeedTitle('');
      setCategory('');
      setClientName('');
      setPicName('');
      setNotes('');
      setAppearers([{ name: '', role: 'Self', position: '' }]);
    }
    setIsModalOpen(true);
  };

  // Date Change Handler
  const handleDateChange = (newDate: string) => {
    setDeedDate(newDate);
    if (!newDate) return;

    const autoNum = getAutoDeedNumber(newDate, editingDeedId, deeds);
    setDeedNumber(autoNum);

    const { calculatedOrder, warning } = calculateOrderNumber(autoNum, newDate, editingDeedId, deeds);
    setOrderNumber(calculatedOrder);
    setOrderWarning(warning);
  };

  // Number Change Handler
  const handleNumberChange = (newNum: string) => {
    setDeedNumber(newNum);
    if (!deedDate) return;

    const { calculatedOrder, warning } = calculateOrderNumber(newNum, deedDate, editingDeedId, deeds);
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

    const sameMonthConflict = deeds.filter((d) => {
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
      const sameMonthDeeds = deeds.filter((d) => {
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
        const hasCollision = deeds.some((d) => {
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

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save deed:', err);
      alert('Gagal menyimpan data akta.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Deed
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
      try {
        await NotaryService.deleteDeed(deed.id);
      } catch (err) {
        console.error('Failed to delete deed:', err);
        alert('Gagal menghapus data akta.');
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
        const allSorted = [...deeds];
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
        const yearDeeds = deeds.filter((d) => d.date && d.date.startsWith(yearToOrder));
        yearDeeds.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0);
        });

        // Find the maximum order number from previous deeds (dated before yearToOrder-01-01)
        const priorDeeds = deeds.filter((d) => d.date && d.date < `${yearToOrder}-01-01`);
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
      {/* Top Header & Actions */}
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
                    disabled={isFormLocked}
                    value={deedNumber}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    placeholder="Contoh: 01, 02, 10"
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
                    value={orderNumber}
                    placeholder="Otomatis terhitung"
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
                disabled={isSaving || isFormLocked}
                className="px-5 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Check size={18} />
                {isSaving ? 'Menyimpan...' : 'Simpan Akta'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
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
            <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200">
              Memuat data buku akta...
            </div>
          ) : groupedDeeds.length === 0 ? (
            <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200 italic">
              Tidak ada data akta ditemukan.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedDeeds.map((group) => {
                const groupKey = `${group.year}-${group.month}`;
                const isCollapsed = collapsedMonths[groupKey];
                const toggleCollapse = () => {
                  setCollapsedMonths((prev) => ({
                    ...prev,
                    [groupKey]: !prev[groupKey],
                  }));
                };

                return (
                  <div key={groupKey} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Month Group Header */}
                    <div
                      onClick={toggleCollapse}
                      className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-700 select-none transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {isCollapsed ? (
                          <ChevronRight size={18} className="text-slate-300" />
                        ) : (
                          <ChevronDown size={18} className="text-slate-300" />
                        )}
                        <span className="font-bold text-sm tracking-wide uppercase">
                          {group.monthName} {group.year}
                        </span>
                      </div>
                      <span className="text-xs bg-slate-700/80 px-2.5 py-1 rounded-full text-slate-200 font-medium">
                        {group.deeds.length} Akta
                      </span>
                    </div>

                    {/* Table */}
                    {!isCollapsed && (
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
                            {group.deeds.map((deed, idx) => {
                              const locked = !superAdmin || isRecordLocked(deed.date, user?.email);
                              const lockMsg = !superAdmin
                                ? 'Hanya Super Admin yang dapat mengubah data'
                                : (isRecordLocked(deed.date, user?.email) ? `Terkunci otomatis setelah ${getLockDeadlineMessage(deed.date)}` : '');

                              return (
                                <tr key={deed.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3 text-center border-r border-slate-200 font-medium text-slate-600">
                                    {deed.orderNumber || idx + 1}
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
