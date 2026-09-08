import React, { useState, useMemo, useEffect } from 'react';
import {
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  X,
  Loader2,
  Building,
  MapPin,
  Briefcase,
  Coins,
  Users,
  UserCheck,
  FileText,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CompanyProfile } from '../../../types';
import {
  ClientSyncSelection,
  SYNC_CATEGORIES,
  getAllSelectedSync,
  getNoneSelectedSync
} from '../../services/ClientProjectSyncService';

interface PullClientDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: ClientSyncSelection) => Promise<void>;
  isLoading: boolean;
  clientName?: string;
  freshClient?: CompanyProfile | null;
  currentData?: any;
}

export const PullClientDataModal: React.FC<PullClientDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  clientName,
  freshClient,
  currentData
}) => {
  // Initialize selection with all selected by default
  const [selection, setSelection] = useState<ClientSyncSelection>(() => getAllSelectedSync());
  const [activeTab, setActiveTab] = useState<'selection' | 'preview'>('selection');

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSelection(getAllSelectedSync());
      setActiveTab('selection');
    }
  }, [isOpen]);

  // Toggle single field
  const toggleField = (key: keyof ClientSyncSelection) => {
    setSelection(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Select all / Deselect all
  const handleSelectAll = () => {
    setSelection(getAllSelectedSync());
  };

  const handleDeselectAll = () => {
    setSelection(getNoneSelectedSync());
  };

  // Category toggle: if any item in category is selected, deselect category; otherwise select all in category
  const toggleCategory = (categoryId: string) => {
    const category = SYNC_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    const allCategoryKeys = category.fields.map(f => f.key as keyof ClientSyncSelection);
    const areAllSelected = allCategoryKeys.every(k => !!selection[k]);

    setSelection(prev => {
      const next = { ...prev };
      allCategoryKeys.forEach(k => {
        next[k] = !areAllSelected;
      });
      return next;
    });
  };

  // Realtime counters
  const totalFieldsSelected = useMemo(() => {
    return Object.values(selection).filter(Boolean).length;
  }, [selection]);

  const selectedCategoriesCount = useMemo(() => {
    return SYNC_CATEGORIES.filter(cat =>
      cat.fields.some(f => !!selection[f.key as keyof ClientSyncSelection])
    ).length;
  }, [selection]);

  const totalCategories = SYNC_CATEGORIES.length;
  const isAllSelected = totalFieldsSelected === Object.keys(getAllSelectedSync()).length;
  const isNoneSelected = totalFieldsSelected === 0;

  // Helper to extract field preview strings
  const getFieldPreview = (key: string): { current: string; fresh: string; isDifferent: boolean } => {
    let current = '-';
    let fresh = '-';

    switch (key) {
      case 'companyName':
        current = currentData?.companyName || currentData?.namaPt || currentData?.namaCV || '-';
        fresh = freshClient?.companyName || '-';
        break;
      case 'companyShortName':
        current = currentData?.companyShortName || '-';
        fresh = freshClient?.companyShortName || '-';
        break;
      case 'companyType':
        current = currentData?.companyType || currentData?.clientType || 'PT';
        fresh = freshClient?.companyType || freshClient?.clientType || 'PT';
        break;
      case 'npwp':
        current = currentData?.npwp || '-';
        fresh = freshClient?.npwp || '-';
        break;
      case 'email':
        current = currentData?.email || '-';
        fresh = freshClient?.email || '-';
        break;
      case 'phoneNumber':
        current = currentData?.phoneNumber || '-';
        fresh = freshClient?.phoneNumber || '-';
        break;
      case 'status':
        current = currentData?.status || '-';
        fresh = freshClient?.status || '-';
        break;
      case 'duration':
        current = currentData?.duration || '-';
        fresh = freshClient?.duration || '-';
        break;
      case 'address':
        current = currentData?.fullAddress || currentData?.alamatLengkapPT || currentData?.alamatLengkapCV || currentData?.newAddress?.fullAddress || '-';
        fresh = freshClient?.fullAddress || freshClient?.oldFullAddress || freshClient?.newAddress?.fullAddress || '-';
        break;
      case 'rtRw':
        current = currentData?.newAddress?.rt || currentData?.newAddress?.rw ? `RT ${currentData.newAddress.rt || '-'}/RW ${currentData.newAddress.rw || '-'}` : '-';
        fresh = freshClient?.newAddress?.rt || freshClient?.newAddress?.rw ? `RT ${freshClient.newAddress.rt || '-'}/RW ${freshClient.newAddress.rw || '-'}` : '-';
        break;
      case 'kelurahan':
        current = currentData?.newAddress?.kelurahan || '-';
        fresh = freshClient?.newAddress?.kelurahan || '-';
        break;
      case 'kecamatan':
        current = currentData?.newAddress?.kecamatan || '-';
        fresh = freshClient?.newAddress?.kecamatan || '-';
        break;
      case 'city':
        current = currentData?.newAddress?.city || currentData?.city || currentData?.domicile || '-';
        fresh = freshClient?.newAddress?.city || (freshClient as any)?.city || freshClient?.domicile || '-';
        break;
      case 'province':
        current = currentData?.newAddress?.province || currentData?.province || '-';
        fresh = freshClient?.newAddress?.province || '-';
        break;
      case 'postalCode':
        current = currentData?.newAddress?.postalCode || '-';
        fresh = freshClient?.newAddress?.postalCode || '-';
        break;
      case 'domicile':
        current = currentData?.domicile || currentData?.kotaKedudukan || currentData?.newAddress?.city || '-';
        fresh = freshClient?.domicile || freshClient?.oldDomicile || freshClient?.newAddress?.city || '-';
        break;
      case 'oldDomicile':
        current = currentData?.oldDomicile || '-';
        fresh = freshClient?.oldDomicile || freshClient?.domicile || '-';
        break;
      case 'kbli': {
        const cLen = (currentData?.kbliItems || []).length;
        const fLen = (freshClient?.kbliItems || []).length;
        current = cLen > 0 ? `${cLen} KBLI: ${(currentData.kbliItems || []).map((k: any) => k.code || k.kode).filter(Boolean).slice(0, 2).join(', ')}${cLen > 2 ? '...' : ''}` : '0 KBLI (Kosong)';
        fresh = fLen > 0 ? `${fLen} KBLI: ${(freshClient?.kbliItems || []).map((k: any) => k.code || k.kode).filter(Boolean).slice(0, 2).join(', ')}${fLen > 2 ? '...' : ''}` : '0 KBLI (Kosong)';
        break;
      }
      case 'modalDasar':
        current = `Rp ${(currentData?.originalCapitalBase || currentData?.modalDasar || currentData?.authorizedCapital || 0).toLocaleString('id-ID')}`;
        fresh = `Rp ${(freshClient?.originalCapitalBase || freshClient?.targetCapitalBase || 0).toLocaleString('id-ID')}`;
        break;
      case 'modalDitempatkan':
      case 'modalDisetor':
        current = `Rp ${(currentData?.originalCapitalPaid || currentData?.paidUpCapital || 0).toLocaleString('id-ID')}`;
        fresh = `Rp ${(freshClient?.originalCapitalPaid || freshClient?.targetCapitalPaid || 0).toLocaleString('id-ID')}`;
        break;
      case 'shareholders': {
        const cCount = (currentData?.shareholders || currentData?.peseros || []).length;
        const fCount = (freshClient?.shareholders || (freshClient as any)?.peseros || []).length;
        current = `${cCount} entitas`;
        fresh = `${fCount} entitas`;
        break;
      }
      case 'direksi':
      case 'komisaris':
      case 'oldManagement': {
        const cCount = (currentData?.oldManagementItems || currentData?.managementItems || []).length;
        const fCount = (freshClient?.oldManagementItems || (freshClient as any)?.managementItems || []).length;
        current = `${cCount} orang`;
        fresh = `${fCount} orang`;
        break;
      }
      case 'newManagement': {
        const cCount = (currentData?.newManagementItems || []).length;
        const fCount = (freshClient?.newManagementItems || []).length;
        current = `${cCount} orang`;
        fresh = `${fCount} orang`;
        break;
      }
      case 'establishmentDeed':
        current = currentData?.establishmentDeedNumber ? `No. ${currentData.establishmentDeedNumber} (${currentData.establishmentDeedDate || '-'})` : 'Belum ada';
        fresh = freshClient?.establishmentDeedNumber ? `No. ${freshClient.establishmentDeedNumber} (${freshClient.establishmentDeedDate || '-'})` : 'Belum ada';
        break;
      case 'amendmentHistory': {
        const cCount = (currentData?.amendmentDeeds || []).length;
        const fCount = (freshClient?.amendmentDeeds || []).length;
        current = `${cCount} akta`;
        fresh = `${fCount} akta`;
        break;
      }
      case 'latestAmendment':
        current = currentData?.latestAmendmentDeedNumber ? `No. ${currentData.latestAmendmentDeedNumber} (${currentData.latestAmendmentDeedDate || '-'})` : 'Belum ada';
        fresh = freshClient?.latestAmendmentDeedNumber ? `No. ${freshClient.latestAmendmentDeedNumber} (${freshClient.latestAmendmentDeedDate || '-'})` : 'Belum ada';
        break;
      default:
        break;
    }

    const isDifferent = String(current).trim().toLowerCase() !== String(fresh).trim().toLowerCase();
    return { current, fresh, isDifferent };
  };

  // Calculate preview data for each selected category
  const previewSummary = useMemo(() => {
    return SYNC_CATEGORIES.map(category => {
      const selectedFields = category.fields.filter(f => !!selection[f.key as keyof ClientSyncSelection]);
      if (selectedFields.length === 0) return null;

      const fieldDiffs = selectedFields.map(field => {
        const diff = getFieldPreview(field.key);
        return {
          key: field.key,
          label: field.label,
          ...diff
        };
      });

      const hasAnyChange = fieldDiffs.some(d => d.isDifferent);

      return {
        category,
        fields: fieldDiffs,
        hasAnyChange
      };
    }).filter(Boolean);
  }, [selection, currentData, freshClient]);

  const handleSubmit = async () => {
    if (isNoneSelected || isLoading) return;
    await onConfirm(selection);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building':
        return <Building className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'MapPin':
        return <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'Briefcase':
        return <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'Coins':
        return <Coins className="w-4 h-4 text-purple-600 shrink-0" />;
      case 'Users':
        return <Users className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'UserCheck':
        return <UserCheck className="w-4 h-4 text-cyan-600 shrink-0" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-rose-600 shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">Tarik Data Klien Terbaru</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih data dari Master Client yang ingin diperbarui ke project ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toolbar: Select All / Deselect All & Indicator */}
        <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isAllSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>☑ Pilih Semua</span>
            </button>

            <button
              type="button"
              onClick={handleDeselectAll}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            >
              <span>Hapus Pilihan</span>
            </button>
          </div>

          {/* Realtime Category & Fields Counter Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                selectedCategoriesCount > 0
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-slate-200 text-slate-500 border border-slate-300'
              }`}
            >
              <span className="font-extrabold text-blue-900">{selectedCategoriesCount}</span> kategori data akan diperbarui ({totalFieldsSelected} item)
            </div>

            {/* View Tab Switcher */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('selection')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'selection' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pilihan Data
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === 'preview' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Preview Perubahan
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: SELECTION VIEW */}
          {activeTab === 'selection' && (
            <div className="space-y-4">
              {/* Informative banners */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 flex items-start gap-2.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Project-Specific Data Aman:</span>
                    <p className="text-emerald-800/90 mt-0.5 text-[11.5px] leading-relaxed">
                      Nomor akta, tanggal rapat, agenda, resolusi, saksi, dan catatan minuta <strong>tidak akan pernah tertimpa</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Selective Sync Presisi:</span>
                    <p className="text-blue-800/90 mt-0.5 text-[11.5px] leading-relaxed">
                      Hanya item yang Anda centang yang akan ditarik dari Master Client. Data project lain tetap utuh.
                    </p>
                  </div>
                </div>
              </div>

              {/* Categories & Checkboxes */}
              <div className="space-y-4">
                {SYNC_CATEGORIES.map(category => {
                  const categoryFields = category.fields;
                  const selectedInCat = categoryFields.filter(f => !!selection[f.key as keyof ClientSyncSelection]).length;
                  const isCatAllSelected = selectedInCat === categoryFields.length;
                  const isCatPartial = selectedInCat > 0 && !isCatAllSelected;

                  return (
                    <div
                      key={category.id}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs transition-all hover:border-slate-300"
                    >
                      {/* Category Header */}
                      <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category.icon)}
                          <span className="font-bold text-xs text-slate-800 tracking-wider">
                            {category.title}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            ({selectedInCat}/{categoryFields.length} terpilih)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCategory(category.id)}
                          disabled={isLoading}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          {isCatAllSelected ? 'Batalkan Kategori' : 'Pilih Semua'}
                        </button>
                      </div>

                      {/* Category Fields Checkbox Grid */}
                      <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {categoryFields.map(field => {
                          const isChecked = !!selection[field.key as keyof ClientSyncSelection];
                          return (
                            <label
                              key={field.key}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                                isChecked
                                  ? 'bg-blue-50/60 border-blue-300/80 text-blue-950 font-medium'
                                  : 'bg-slate-50/50 border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleField(field.key as keyof ClientSyncSelection)}
                                disabled={isLoading}
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                                  isChecked
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && <CheckSquare className="w-3.5 h-3.5" />}
                              </div>
                              <div className="flex-1 leading-tight">
                                <span className={isChecked ? 'font-semibold text-blue-950' : 'text-slate-700'}>
                                  {field.label}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW PERUBAHAN */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200/70 p-3 rounded-xl text-xs text-indigo-950">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold">
                    Ringkasan Perbandingan: Project Saat Ini vs Master Client Terbaru
                  </span>
                </div>
                <span className="text-[11px] text-indigo-700">
                  {selectedCategoriesCount} kategori terpilih
                </span>
              </div>

              {isNoneSelected ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Tidak ada data yang dipilih</p>
                  <p className="text-xs text-slate-500">
                    Silakan centang kategori pada tab &quot;Pilihan Data&quot; untuk melihat preview perbedaan.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {previewSummary.map(item => {
                    if (!item) return null;
                    const { category, fields, hasAnyChange } = item;

                    return (
                      <div
                        key={category.id}
                        className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                      >
                        {/* Category Header */}
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(category.icon)}
                            <span>{category.title}</span>
                          </div>
                          {!hasAnyChange ? (
                            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                              ✓ Tidak ada perubahan pada kategori ini
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-semibold bg-amber-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                              Ada perbedaan data
                            </span>
                          )}
                        </div>

                        {/* Table Diff */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100/60 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                                <th className="py-2 px-3 w-[25%]">Data</th>
                                <th className="py-2 px-3 w-[37.5%]">Project Saat Ini</th>
                                <th className="py-2 px-3 w-[37.5%]">Master Client Terbaru</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {fields.map(field => {
                                return (
                                  <tr
                                    key={field.key}
                                    className={`hover:bg-slate-50/80 transition-colors ${
                                      field.isDifferent ? 'bg-amber-50/40' : ''
                                    }`}
                                  >
                                    <td className="py-2 px-3 font-semibold text-slate-700">
                                      {field.label}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 truncate max-w-[220px]" title={field.current}>
                                      {field.current}
                                    </td>
                                    <td className="py-2 px-3 font-medium">
                                      <div className="flex items-center gap-1.5 truncate max-w-[220px]" title={field.fresh}>
                                        {field.isDifferent && (
                                          <ArrowRight className="w-3 h-3 text-blue-600 shrink-0" />
                                        )}
                                        <span className={field.isDifferent ? 'text-blue-700 font-bold' : 'text-slate-600'}>
                                          {field.fresh}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {isNoneSelected ? (
              <span className="text-amber-600 font-medium">Pilih minimal 1 data untuk ditarik.</span>
            ) : (
              <span>
                <strong className="text-slate-800">{totalFieldsSelected} item data</strong> akan disinkronkan ke project ini.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isNoneSelected || isLoading}
              className="px-5 py-2 font-bold rounded-lg text-xs text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menarik Data Terpilih...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tarik Data Terpilih ({totalFieldsSelected})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
