import React, { useState, useMemo } from 'react';
import { 
  X, 
  GitMerge, 
  AlertTriangle, 
  Building, 
  Check, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  Search, 
  Trash2,
  FileText
} from 'lucide-react';
import { CompanyProfile } from '../../../types';

interface MergeClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: CompanyProfile[];
  onMerge: (targetId: string, sourceIds: string[]) => Promise<void>;
  onMergeMultiple?: (groups: { targetId: string; sourceIds: string[] }[]) => Promise<void>;
}

export const MergeClientsModal: React.FC<MergeClientsModalProps> = ({
  isOpen,
  onClose,
  profiles,
  onMerge,
  onMergeMultiple,
}) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Manual Merge state
  const [manualTargetId, setManualTargetId] = useState<string>('');
  const [manualSourceIds, setManualSourceIds] = useState<string[]>([]);
  const [manualSearchQuery, setManualSearchQuery] = useState<string>('');

  // Auto-merge selection/confirmation state
  const [selectedAutoGroup, setSelectedAutoGroup] = useState<any | null>(null);
  const [customPrimaryId, setCustomPrimaryId] = useState<string>('');
  const [customSourceIds, setCustomSourceIds] = useState<string[]>([]);

  // Bulk merge confirmation state
  const [isBulkMergeConfirmOpen, setIsBulkMergeConfirmOpen] = useState<boolean>(false);

  // Filter out archived profiles and sort alphabetically
  const activeProfiles = useMemo(() => {
    return profiles
      .filter(p => !p.isArchived)
      .sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
  }, [profiles]);

  // 1. AUTO DETECT ENGINE
  const autoDuplicateGroups = useMemo(() => {
    const groups: { [key: string]: CompanyProfile[] } = {};
    
    const normalize = (name: string) => {
      if (!name) return '';
      return name
        .toUpperCase()
        .replace(/\b(PT|CV|PERSEROAN TERBATAS|TBK|UD|FIRM|FIRMA|YAYASAN|KOPERASI)\b/gi, '')
        .replace(/[^A-Z0-9]/gi, '')
        .trim();
    };

    activeProfiles.forEach(p => {
      const normName = normalize(p.companyName || '');
      const npwp = (p.npwp || '').replace(/[^0-9]/g, '');
      const email = (p.email || '').toLowerCase().trim();

      let groupKey = '';
      
      if (normName && normName.length > 3) {
        groupKey = `name_${normName}`;
      } else if (npwp && npwp.length > 5) {
        groupKey = `npwp_${npwp}`;
      } else if (email && email.includes('@')) {
        groupKey = `email_${email}`;
      }

      if (groupKey) {
        // Try to find if there is an existing key that matches this criteria
        let foundKey = Object.keys(groups).find(k => {
          const isNameMatch = k.startsWith('name_') && k === `name_${normName}`;
          const isNpwpMatch = npwp && k.startsWith('npwp_') && k === `npwp_${npwp}`;
          const isEmailMatch = email && k.startsWith('email_') && k === `email_${email}`;
          return isNameMatch || isNpwpMatch || isEmailMatch;
        });

        if (!foundKey) {
          foundKey = groupKey;
        }

        if (!groups[foundKey]) {
          groups[foundKey] = [];
        }
        groups[foundKey].push(p);
      }
    });

    // Return groups with more than 1 profile
    return Object.entries(groups)
      .filter(([_, list]) => list.length > 1)
      .map(([key, list]) => {
        // Evaluate score to choose best primary candidate
        const sortedList = [...list].sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;
          if (a.npwp) scoreA += 5;
          if (b.npwp) scoreB += 5;
          if (a.email) scoreA += 2;
          if (b.email) scoreB += 2;
          if (a.fullAddress) scoreA += 3;
          if (b.fullAddress) scoreB += 3;
          if (a.shareholders && a.shareholders.length > 0) scoreA += 4;
          if (b.shareholders && b.shareholders.length > 0) scoreB += 4;
          if (a.kbliItems && a.kbliItems.length > 0) scoreA += 4;
          if (b.kbliItems && b.kbliItems.length > 0) scoreB += 4;
          return scoreB - scoreA;
        });

        // Generate group name from primary or average name
        const groupName = sortedList[0].companyName || 'Grup Duplikat';

        return {
          id: key,
          groupName,
          suggestedPrimary: sortedList[0],
          duplicates: sortedList.slice(1),
          allProfiles: sortedList
        };
      });
  }, [activeProfiles]);

  // Profiles available to be selected as manual duplicates (excludes manual target)
  const manualAvailableSources = useMemo(() => {
    if (!manualTargetId) return [];
    return activeProfiles.filter(p => p.id !== manualTargetId);
  }, [activeProfiles, manualTargetId]);

  // Filter sources based on search query
  const manualFilteredSources = useMemo(() => {
    if (!manualSearchQuery.trim()) return manualAvailableSources;
    const query = manualSearchQuery.toLowerCase();
    return manualAvailableSources.filter(p => 
      (p.companyName || '').toLowerCase().includes(query) ||
      (p.id || '').toLowerCase().includes(query)
    );
  }, [manualAvailableSources, manualSearchQuery]);

  if (!isOpen) return null;

  // Handle manual merge submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTargetId) {
      setError('Silakan pilih Klien Utama terlebih dahulu.');
      return;
    }
    if (manualSourceIds.length === 0) {
      setError('Silakan pilih minimal satu Klien Duplikat yang akan digabungkan.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onMerge(manualTargetId, manualSourceIds);
      setManualTargetId('');
      setManualSourceIds([]);
      setManualSearchQuery('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menggabungkan klien.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle auto-merge action for a specific group
  const handleOpenAutoConfirm = (group: any) => {
    setSelectedAutoGroup(group);
    setCustomPrimaryId(group.suggestedPrimary.id);
    setCustomSourceIds(group.duplicates.map((d: any) => d.id));
  };

  const handleAutoSubmit = async () => {
    if (!customPrimaryId) {
      setError('Silakan pilih salah satu profil sebagai Klien Utama.');
      return;
    }
    if (customSourceIds.length === 0) {
      setError('Silakan pilih minimal satu profil duplikat untuk digabungkan.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onMerge(customPrimaryId, customSourceIds);
      setSelectedAutoGroup(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyatukan grup duplikat.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkMergeSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const groups = autoDuplicateGroups.map(group => ({
        targetId: group.suggestedPrimary.id,
        sourceIds: group.duplicates.map(d => d.id)
      }));

      if (onMergeMultiple) {
        await onMergeMultiple(groups);
      } else {
        // Fallback sequentially
        for (const g of groups) {
          await onMerge(g.targetId, g.sourceIds);
        }
      }
      setIsBulkMergeConfirmOpen(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menggabungkan semua klien.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedManualTarget = activeProfiles.find(p => p.id === manualTargetId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100 flex flex-col">
          
          {/* Header */}
          <div className="bg-[#0c2444] text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 text-amber-400 rounded-lg">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                  Rapikan Database Klien
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Deteksi otomatis & gabungkan profil ganda tanpa takut kehilangan data.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation (Only shown when not in deep confirmation state) */}
          {!selectedAutoGroup && !isBulkMergeConfirmOpen && (
            <div className="flex border-b border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => { setActiveTab('auto'); setError(null); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'auto' 
                    ? 'border-blue-600 text-blue-700 bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Pendeteksi Otomatis ({autoDuplicateGroups.length})</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('manual'); setError(null); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'manual' 
                    ? 'border-blue-600 text-blue-700 bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>Penyatuan Manual</span>
              </button>
            </div>
          )}

          {/* Main Error View */}
          {error && !selectedAutoGroup && !isBulkMergeConfirmOpen && (
            <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Modal Content container */}
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">

            {/* A: CONFIRMATION SCREEN (FOR AUTO-MERGE GROUP) */}
            {selectedAutoGroup && !isBulkMergeConfirmOpen && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Konfirmasi Penyatuan Grup: {selectedAutoGroup.groupName}
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      Sistem akan menyatukan seluruh data (proyek, akta, dan kelengkapan dokumen) milik profil-profil di bawah ini menjadi satu data utuh. Profil duplikat lainnya akan dihapus dari database.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 1. Select primary within the group */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Pilih Klien Utama (Data yang Dipertahankan)
                  </label>
                  <div className="space-y-2">
                    {selectedAutoGroup.allProfiles.map((p: any) => {
                      const isPrimary = customPrimaryId === p.id;
                      return (
                        <div 
                          key={p.id}
                          onClick={() => {
                            setCustomPrimaryId(p.id);
                            setCustomSourceIds(selectedAutoGroup.allProfiles.filter((item: any) => item.id !== p.id).map((item: any) => item.id));
                          }}
                          className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                            isPrimary 
                              ? 'border-blue-500 bg-blue-50/50 shadow-xs' 
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isPrimary ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isPrimary && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{p.companyName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                ID: {p.id.slice(0, 12)}... {p.npwp ? `• NPWP: ${p.npwp}` : ''} {p.email ? `• ${p.email}` : ''}
                              </p>
                            </div>
                          </div>
                          {isPrimary && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Rekomendasi Utama
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. List source profiles to be deleted */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-rose-700 uppercase tracking-wider">
                    Profil Duplikat yang Akan Dihapus ({customSourceIds.length})
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200">
                    {selectedAutoGroup.allProfiles
                      .filter((p: any) => p.id !== customPrimaryId)
                      .map((p: any) => (
                        <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-rose-500" />
                            <div>
                              <span className="font-semibold text-slate-800">{p.companyName}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                ID: {p.id.slice(0, 12)}...
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 italic">
                            Akan dipindahkan & dihapus
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Action controls for confirmation view */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    onClick={() => setSelectedAutoGroup(null)}
                    disabled={isSubmitting}
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoSubmit}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sedang Memproses...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Konfirmasi & Gabungkan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* A.2: CONFIRMATION SCREEN (FOR BULK AUTO-MERGE) */}
            {isBulkMergeConfirmOpen && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Konfirmasi Penyatuan Massal ({autoDuplicateGroups.length} Grup Klien)
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      Anda akan menyatukan <strong>seluruh</strong> grup duplikat yang terdeteksi secara otomatis di bawah ini. Sistem telah memilih profil terbaik sebagai <strong>Klien Utama</strong> untuk masing-masing grup berdasarkan kelengkapan datanya. Semua proyek, akta, dan dokumen akan dipindahkan secara aman.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {autoDuplicateGroups.map((group, index) => (
                    <div key={group.id} className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Grup {index + 1}: {group.groupName}</span>
                        <span className="text-[10px] bg-amber-50 text-amber-850 font-bold px-2 py-0.5 rounded-full">
                          {group.allProfiles.length} data ganda
                        </span>
                      </div>
                      <div className="text-[11px] leading-relaxed space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-700">Klien Utama (Rekomendasi):</span> 
                          <span className="text-blue-700 font-semibold">{group.suggestedPrimary.companyName}</span>
                        </div>
                        <div className="text-slate-500">
                          Akan digabung & dihapus: {group.duplicates.map(d => d.companyName).join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action controls for bulk confirmation view */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    onClick={() => setIsBulkMergeConfirmOpen(false)}
                    disabled={isSubmitting}
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkMergeSubmit}
                    className="px-4 py-2 bg-blue-750 hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sedang Memproses Penyatuan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-350 animate-pulse" />
                        <span>Gabung Semua Duplikat</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* B: TAB AUTO-DETECTED GROUPS LIST */}
            {activeTab === 'auto' && !selectedAutoGroup && !isBulkMergeConfirmOpen && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex gap-3">
                  <Building className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    Sistem mendeteksi data duplikat berdasarkan kemiripan nama perusahaan, kecocokan NPWP, atau email yang identik secara cerdas.
                  </div>
                </div>

                {autoDuplicateGroups.length === 0 ? (
                  <div className="border border-emerald-100 bg-emerald-50/50 rounded-2xl p-8 text-center space-y-3 flex flex-col items-center">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Keren! Database Sangat Rapi</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Tidak ada profil klien ganda atau serupa yang terdeteksi secara otomatis saat ini.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="text-xs text-blue-700 font-bold hover:underline"
                    >
                      Butuh menggabungkan secara manual? Klik disini &rarr;
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 border border-blue-100 p-4 rounded-xl shadow-xs">
                      <div className="space-y-0.5">
                        <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Daftar Grup Duplikat ({autoDuplicateGroups.length})
                        </span>
                        <p className="text-[10px] text-slate-500">
                          Sistem mendeteksi kelompok data ganda/serupa dalam database Anda.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBulkMergeConfirmOpen(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3.5 py-2 rounded-lg flex items-center justify-center gap-1.5 uppercase tracking-wider transition-all shrink-0 shadow-sm cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                        <span>Gabung Semua Sekaligus</span>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {autoDuplicateGroups.map((group) => (
                        <div 
                          key={group.id}
                          className="border border-slate-200/80 rounded-xl bg-white hover:border-slate-300 transition-all hover:shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800">{group.groupName}</span>
                              <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                                {group.allProfiles.length} data ganda
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 space-y-0.5">
                              <p className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700">Klien Utama (Rekomendasi):</span> 
                                <span className="text-blue-700 font-medium">{group.suggestedPrimary.companyName}</span>
                              </p>
                              <p className="text-slate-400">
                                Duplikat: {group.duplicates.map(d => d.companyName).join(', ')}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenAutoConfirm(group)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3.5 py-1.8 rounded-lg flex items-center gap-1 uppercase tracking-wider transition-colors shrink-0 cursor-pointer self-start md:self-center"
                          >
                            <span>Tinjau & Gabungkan</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* C: TAB MANUAL MERGE */}
            {activeTab === 'manual' && !selectedAutoGroup && (
              <form onSubmit={handleManualSubmit} className="space-y-5">
                {/* Manual step 1 */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Pilih Klien Utama (Profil yang Tetap Aktif)
                  </label>
                  <select
                    value={manualTargetId}
                    onChange={(e) => {
                      setManualTargetId(e.target.value);
                      setManualSourceIds([]); // reset selection
                    }}
                    className="w-full py-2.5 px-3 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all bg-white"
                  >
                    <option value="">-- Pilih Klien Utama --</option>
                    {activeProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.companyName} {p.clientType ? `(${p.clientType})` : ''} - {p.id.slice(0, 8)}...
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Profil ini akan menjadi satu-satunya profil yang tetap aktif. Data kosong di profil ini akan otomatis diisi oleh data dari klien duplikat yang digabungkan.
                  </p>
                </div>

                {/* Manual step 2 */}
                {manualTargetId && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        2. Pilih Klien Duplikat (Akan Digabungkan & Dihapus)
                      </label>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                        {manualSourceIds.length} terpilih
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Cari klien duplikat berdasarkan nama..."
                      value={manualSearchQuery}
                      onChange={(e) => setManualSearchQuery(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-slate-50/50 text-slate-800"
                    />

                    <div className="border border-slate-200/80 rounded-xl divide-y divide-slate-100 max-h-44 overflow-y-auto bg-white shadow-inner">
                      {manualFilteredSources.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          {manualSearchQuery ? 'Klien tidak ditemukan.' : 'Tidak ada klien lain yang tersedia.'}
                        </div>
                      ) : (
                        manualFilteredSources.map((p) => {
                          const isChecked = manualSourceIds.includes(p.id);
                          return (
                            <div 
                              key={p.id}
                              onClick={() => {
                                setManualSourceIds(prev => 
                                  prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                );
                              }}
                              className={`flex items-center justify-between p-3 text-xs cursor-pointer transition-colors ${
                                isChecked ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // handled by parent onClick
                                  className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300 cursor-pointer"
                                />
                                <div>
                                  <span className="font-semibold text-slate-800">{p.companyName}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    ID: {p.id.slice(0, 12)}... {p.clientType ? `• Tipe: ${p.clientType}` : ''}
                                  </span>
                                </div>
                              </div>
                              {isChecked && (
                                <span className="text-blue-600">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Final Confirm Banner for Manual Merge */}
                {manualSourceIds.length > 0 && selectedManualTarget && (
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                      <span className="text-xs font-bold uppercase tracking-wider">Konfirmasi Penyatuan Manual</span>
                    </div>
                    <div className="text-[11px] text-amber-900 leading-relaxed">
                      Seluruh proyek, akta, dan dokumen dari klien yang terpilih akan dipindahkan ke <strong>{selectedManualTarget.companyName}</strong>. Profil duplikat akan dihapus secara permanen.
                    </div>
                  </div>
                )}

                {/* Manual Footer control buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 bg-blue-750 hover:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      (!manualTargetId || manualSourceIds.length === 0 || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={!manualTargetId || manualSourceIds.length === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sedang Memproses...</span>
                      </>
                    ) : (
                      <>
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>Satukan Secara Manual</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
