import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useDocumentRuntime } from '../company/useDocumentRuntime';
import { INITIAL_STATE } from '../company/initialCompanyData';
import { generatePendirianDocx } from '../../lib/generatePendirianDocx';
import { generateWordDoc } from '../../../utils/docxGenerator';

export interface ExportPipelineContextType {
  isExportingPendirian: boolean;
  handleExportWord: () => Promise<void>;
  handleDownloadProject: (item: any) => Promise<void>;
  handlePendirianExportWord: (d: any) => Promise<void>;
  handlePrint: () => void;
}

const ExportPipelineContext = createContext<ExportPipelineContextType | null>(null);

export function ExportPipelineProvider({ children }: { children: ReactNode }) {
  const { mergedData } = useDocumentRuntime();
  const location = useLocation();
  const [isExportingPendirian, setIsExportingPendirian] = useState(false);

  // Derive activeSidebarTab from URL
  const activeSidebarTab = useMemo(() => {
    if (location.pathname.startsWith('/rupst-public')) return 'rupst_public';
    if (location.pathname.startsWith('/rupst')) return 'rupst';
    if (location.pathname.startsWith('/sirkuler')) return 'sirkuler_laporan';
    if (location.pathname.startsWith('/kbli-mapping')) return 'kbli_mapping';
    if (location.pathname.startsWith('/saran-kbli')) return 'saran_kbli';
    if (location.pathname.startsWith('/import-kbli')) return 'import_kbli';
    if (location.pathname.startsWith('/laporan')) return 'laporan';
    if (location.pathname.startsWith('/whatsapp-gateway')) return 'whatsapp_settings';
    if (location.pathname.startsWith('/projects-detail')) return 'project_detail';
    if (location.pathname.startsWith('/projects')) return 'projects';
    if (location.pathname.startsWith('/company-profile')) return 'company_profile';
    if (location.pathname.startsWith('/cv-profile')) return 'cv_profile';
    if (location.pathname.startsWith('/akta')) return 'notulen';
    return 'beranda';
  }, [location.pathname]);

  // Validate completeness of manual inputs for replacements and recipients
  const validateFormCompleteness = useCallback((dataToValidate: any): boolean => {
    // 1. Validate Management Changelog Replaced detail
    if (dataToValidate.resolutions?.management && dataToValidate.managementDismissals) {
      for (const d of dataToValidate.managementDismissals) {
        if (d.replacementType === 'MANUAL' && d.replacedByName) {
          const det = d.replacedByDetail;
          if (!det || !det.birthCity || !det.birthDate || !det.occupation || !det.address?.fullAddress) {
            alert(`⚠ PENTING: Anda harus melengkapi Formulir Lengkap untuk Pengganti Pengurus (${d.replacedByName.toUpperCase()}) yang Anda input secara manual! Tidak bisa hanya mengisi Nama dan NIK saja.`);
            return false;
          }
        }
      }
    }

    // 2. Validate Share Transfers Recipient detail
    if (dataToValidate.resolutions?.shareholders && dataToValidate.shareTransfersNew) {
      for (const t of dataToValidate.shareTransfersNew) {
        if (t.toType === 'NEW' && t.toName) {
          const det = t.toDetail;
          if (!det || !det.birthCity || !det.birthDate || !det.occupation || !det.address?.fullAddress) {
            alert(`⚠ PENTING: Anda harus melengkapi Formulir Lengkap untuk Penerima Peralihan Saham Baru (${t.toName.toUpperCase()})! Tidak bisa hanya mengisi Nama dan NIK saja.`);
            return false;
          }
        }
      }
    }

    return true;
  }, []);

  const handleDownloadProject = useCallback(async (item: any) => {
    if (item.project) {
      if (item.type === 'rupst') {
        try {
          if (item.project.rupstType === 'sirkuler') {
            const { generateSirkulerLaporanDocx } = await import('../../lib/generateSirkulerLaporanDocx');
            await generateSirkulerLaporanDocx({ ...INITIAL_STATE, ...item.project });
          } else {
            const { generateRUPSTDocx } = await import('../../lib/generateRUPSTDocx');
            await generateRUPSTDocx({ ...INITIAL_STATE, ...item.project });
          }
        } catch (error) {
          console.error("RUPST Export Error:", error);
          alert("Gagal mengunduh RUPST.");
        }
      } else if (item.type === 'pendirian') {
        try {
          const d = item.project;
          const mappedData = {
            namaPt: d.companyName || d.namaPt || "",
            tanggal: d.signingDate || d.tanggal || "",
            waktu: d.aktaStartTime || d.waktu || "10:00",
            notarisNamaSurat: d.notaryName || d.notarisNamaSurat || "NUKANTINI PUTRI PARINCHA, SH., M.Kn.",
            notarisTempat: d.notaryDomicile || d.notarisTempat || "Kabupaten Bandung Barat",
            kotaKedudukan: d.newAddress?.city || d.domicile || "",
            alamatLengkapPT: d.newAddress?.fullAddress || d.fullAddress || "",
            modalDasar: d.modalDasar || d.targetCapitalBase || d.originalCapitalBase || 0,
            nilaiPerLembar: d.nilaiPerLembar || d.originalSharePrice || 0,
            modalDisetorPersen: d.modalDisetorPersen || (d.targetCapitalPaid / d.targetCapitalBase) * 100 || 25,
            kuotaWaktuDireksi: d.duration || "5",
            kbliItems: d.kbliItems || [],
            shareholders: d.shareholders || [],
            saksi1Nama: d.saksi1Nama || "",
            saksi1LahirTempat: d.saksi1Lahir || "",
            saksi1LahirTanggal: d.saksi1Lahir || "",
            saksi1Alamat: d.saksi1Alamat || "",
            saksi1NIK: d.saksi1NIK || "",
            saksi2Nama: d.saksi2Nama || "",
            saksi2LahirTempat: d.saksi2Lahir || "",
            saksi2LahirTanggal: d.saksi2Lahir || "",
            saksi2Alamat: d.saksi2Alamat || "",
            saksi2NIK: d.saksi2NIK || "",
          };
          await generatePendirianDocx(mappedData);
        } catch (e) {
          console.error(e);
          alert("Gagal mengunduh Pendirian.");
        }
      } else if (item.type === 'notulen') {
        try {
          await generateWordDoc({ ...INITIAL_STATE, ...item.project });
        } catch (error) {
          console.error("Export Word error:", error);
          alert("Gagal mengunduh dokumen Word.");
        }
      }
    } else {
      alert(`Simulasi pengunduhan akta "${item.name}" untuk "${item.sub}" berhasil.`);
    }
  }, []);

  const handlePendirianExportWord = useCallback(async (d: any) => {
    setIsExportingPendirian(true);
    try {
      // Map CompanyData to PendirianData expected by the generator
      const mappedData = {
        namaPt: d.companyName || d.namaPt || "",
        tanggal: d.signingDate || d.tanggal || "",
        waktu: d.aktaStartTime || d.waktu || "10:00",
        notarisNamaSurat: d.notaryName || d.notarisNamaSurat || "NUKANTINI PUTRI PARINCHA, SH., M.Kn.",
        notarisTempat: d.notaryDomicile || d.notarisTempat || "Kabupaten Bandung Barat",
        kotaKedudukan: d.newAddress?.city || d.domicile || "",
        alamatLengkapPT: d.newAddress?.fullAddress || d.fullAddress || "",
        modalDasar: (d.modalDasarLembar && d.nilaiPerLembar) ? (d.modalDasarLembar * d.nilaiPerLembar) : (d.modalDasar || d.targetCapitalBase || d.originalCapitalBase || 0),
        nilaiPerLembar: d.nilaiPerLembar || d.originalSharePrice || 0,
        modalDisetorPersen: (d.modalDisetorLembar && d.modalDasarLembar) ? ((d.modalDisetorLembar / d.modalDasarLembar) * 100) : (d.modalDisetorPersen || (d.targetCapitalPaid / d.targetCapitalBase) * 100 || 25),
        kuotaWaktuDireksi: d.duration || "5",
        kbliItems: d.kbliItems || [],
        shareholders: d.shareholders || [],
        saksi1Nama: d.saksi1Nama || "",
        saksi1LahirTempat: d.saksi1Lahir || "",
        saksi1LahirTanggal: d.saksi1Lahir || "",
        saksi1Alamat: d.saksi1Alamat || "",
        saksi1NIK: d.saksi1NIK || "",
        saksi2Nama: d.saksi2Nama || "",
        saksi2LahirTempat: d.saksi2Lahir || "",
        saksi2LahirTanggal: d.saksi2Lahir || "",
        saksi2Alamat: d.saksi2Alamat || "",
        saksi2NIK: d.saksi2NIK || "",
      };
      await generatePendirianDocx(mappedData);
    } catch (e: any) {
      console.error(e);
      alert("Error Exporting: " + (e.message || String(e)));
    } finally {
      setIsExportingPendirian(false);
    }
  }, []);

  const handlePrint = useCallback(() => {
    if (!validateFormCompleteness(mergedData)) {
      return;
    }
    const totalInputted = mergedData.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0);
    const targetShares = mergedData.originalSharePrice > 0 ? (mergedData.targetCapitalPaid / mergedData.originalSharePrice) : 0;
    const limit = (mergedData.resolutions.capitalPaid || mergedData.resolutions.capitalPaidDecrease) ? targetShares : mergedData.originalTotalShares;

    if (totalInputted !== limit && (mergedData.resolutions.capitalPaid || mergedData.resolutions.capitalPaidDecrease || mergedData.resolutions.shareholders)) {
      if (!confirm(`⚠ Perhatian: Total saham komposisi akhir (${totalInputted.toLocaleString('id-ID')}) tidak sama dengan target modal disetor (${limit.toLocaleString('id-ID')}). Lanjutkan cetak?`)) {
        return;
      }
    }
    window.print();
  }, [mergedData, validateFormCompleteness]);

  const handleExportWord = useCallback(async () => {
    if (!mergedData.companyName) {
      alert("Harap isi Nama Perusahaan terlebih dahulu.");
      return;
    }
    if (!validateFormCompleteness(mergedData)) {
      return;
    }
    const totalInputted = mergedData.finalShareholders.reduce((sum, s) => sum + s.sharesOwned, 0);
    const targetShares = mergedData.originalSharePrice > 0 ? (mergedData.targetCapitalPaid / mergedData.originalSharePrice) : 0;
    const limit = (mergedData.resolutions.capitalPaid || mergedData.resolutions.capitalPaidDecrease) ? targetShares : mergedData.originalTotalShares;

    if (totalInputted !== limit && (mergedData.resolutions.capitalPaid || mergedData.resolutions.capitalPaidDecrease || mergedData.resolutions.shareholders)) {
      if (!confirm(`⚠ Perhatian: Total saham komposisi akhir (${totalInputted.toLocaleString('id-ID')}) tidak sama dengan target modal disetor (${limit.toLocaleString('id-ID')}). Lanjutkan export?`)) {
        return;
      }
    }

    if (activeSidebarTab === 'rupst') {
      try {
        if (mergedData.rupstType === 'sirkuler') {
          const { generateSirkulerLaporanDocx } = await import('../../lib/generateSirkulerLaporanDocx');
          await generateSirkulerLaporanDocx(mergedData);
        } else {
          const { generateRUPSTDocx } = await import('../../lib/generateRUPSTDocx');
          await generateRUPSTDocx(mergedData);
        }
      } catch (error) {
        console.error("RUPST Export Error:", error);
        alert("Gagal mengunduh RUPST.");
      }
      return;
    }

    try {
      await generateWordDoc(mergedData);
    } catch (error) {
      console.error("Export Word error:", error);
      alert("Gagal mengunduh dokumen Word.");
    }
  }, [mergedData, activeSidebarTab, validateFormCompleteness]);

  return (
    <ExportPipelineContext.Provider value={{
      isExportingPendirian,
      handleExportWord,
      handleDownloadProject,
      handlePendirianExportWord,
      handlePrint
    }}>
      {children}
    </ExportPipelineContext.Provider>
  );
}

export function useExportPipeline() {
  const context = useContext(ExportPipelineContext);
  if (!context) {
    throw new Error('useExportPipeline must be used within an ExportPipelineProvider');
  }
  return context;
}
