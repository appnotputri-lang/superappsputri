import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { initialData, FormData } from './constants';
import { FormContent } from './FormContent';
import { DocumentPreview } from './DocumentPreview';
import { Download, Eye, X } from 'lucide-react';
import { generateDocx, generateDocxBlob } from './lib/generateDocxJualBeli';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CompanyData, ShareTransfer } from '../types';
import { toTitleCase } from '../utils/formatters';

interface DraftAktaAppProps {
  companyData?: CompanyData;
  onUpdateShareTransfer?: (transferId: string, updatedFields: Record<string, any>) => void;
}

export interface DraftAktaAppRef {
  handleDownloadAll: () => Promise<void>;
  handleDownloadSingle: (transferId: string) => Promise<void>;
  hasTransfers: boolean;
}

export const getTransferData = (transfer: ShareTransfer, companyData: CompanyData, baseData: FormData): FormData => {
  const nextData = { ...baseData };
  const rawType = (transfer.type || (transfer as any).transferType || '').toString().toLowerCase();
  const isHibah = rawType.includes('hibah');

  nextData.tipeAkta = isHibah ? 'Hibah' : 'Jual Beli';
  nextData.judulAkta = isHibah ? 'Akta Hibah Saham' : 'Akta Jual Beli Saham';

  if (transfer.sharesTransferred) {
    nextData.jumlahSahamHibah = transfer.sharesTransferred.toString();
  }

  const allCandidates: any[] = [
    ...(companyData.shareholders || []),
    ...(companyData.finalShareholders || []),
    ...((companyData as any).initialShareholders || []),
    ...((companyData as any).parties || []),
    ...(companyData.oldManagementItems || []),
    ...(companyData.newManagementItems || []),
  ];

  let fromSh = allCandidates.find(s => transfer.fromShareholderId && (s.id === transfer.fromShareholderId || (s.linkedPartyId && s.linkedPartyId === transfer.fromShareholderId))) ||
               (transfer as any).fromDetail;
  if (!fromSh && transfer.fromName) {
    const fromUpper = transfer.fromName.trim().toUpperCase();
    fromSh = allCandidates.find(s => s.name && s.name.trim().toUpperCase() === fromUpper);
  }

  let toSh = allCandidates.find(s => transfer.toShareholderId && (s.id === transfer.toShareholderId || (s.linkedPartyId && s.linkedPartyId === transfer.toShareholderId))) ||
             transfer.toDetail;
  if (!toSh && transfer.toName) {
    const toUpper = transfer.toName.trim().toUpperCase();
    toSh = allCandidates.find(s => s.name && s.name.trim().toUpperCase() === toUpper);
  }

  if (fromSh) {
    const addr = fromSh.address || {};
    nextData.pihak1Gelar = fromSh.salutation || nextData.pihak1Gelar;
    nextData.pihak1Nama = fromSh.name || nextData.pihak1Nama;
    nextData.pihak1TempatLahir = fromSh.birthCity || fromSh.tempatLahir || nextData.pihak1TempatLahir;
    nextData.pihak1TanggalLahir = fromSh.birthDate || fromSh.tanggalLahir || nextData.pihak1TanggalLahir;
    nextData.pihak1Pekerjaan = fromSh.occupation || fromSh.pekerjaan || nextData.pihak1Pekerjaan;
    nextData.pihak1AlamatJalan = addr.fullAddress || fromSh.fullAddress || fromSh.alamat || nextData.pihak1AlamatJalan;
    nextData.pihak1RT = addr.rt || fromSh.rt || nextData.pihak1RT;
    nextData.pihak1RW = addr.rw || fromSh.rw || nextData.pihak1RW;
    nextData.pihak1Provinsi = toTitleCase(addr.province || fromSh.province || nextData.pihak1Provinsi || '');
    nextData.pihak1Kota = toTitleCase(addr.city || fromSh.city || nextData.pihak1Kota || '');
    nextData.pihak1Kecamatan = toTitleCase(addr.kecamatan || fromSh.kecamatan || nextData.pihak1Kecamatan || '');
    nextData.pihak1Kelurahan = toTitleCase(addr.kelurahan || fromSh.kelurahan || nextData.pihak1Kelurahan || '');
    nextData.pihak1NIK = fromSh.nik || nextData.pihak1NIK;
    nextData.pihak1SahamDimiliki = fromSh.sharesOwned != null
      ? fromSh.sharesOwned.toString()
      : nextData.pihak1SahamDimiliki;
  } else if (transfer.fromName) {
    nextData.pihak1Nama = transfer.fromName;
  }

  if (toSh) {
    const addr = toSh.address || {};
    nextData.pihak2Gelar = toSh.salutation || nextData.pihak2Gelar;
    nextData.pihak2Nama = toSh.name || nextData.pihak2Nama;
    nextData.pihak2TempatLahir = toSh.birthCity || toSh.tempatLahir || nextData.pihak2TempatLahir;
    nextData.pihak2TanggalLahir = toSh.birthDate || toSh.tanggalLahir || nextData.pihak2TanggalLahir;
    nextData.pihak2Pekerjaan = toSh.occupation || toSh.pekerjaan || nextData.pihak2Pekerjaan;
    nextData.pihak2AlamatJalan = addr.fullAddress || toSh.fullAddress || toSh.alamat || nextData.pihak2AlamatJalan;
    nextData.pihak2RT = addr.rt || toSh.rt || nextData.pihak2RT;
    nextData.pihak2RW = addr.rw || toSh.rw || nextData.pihak2RW;
    nextData.pihak2Provinsi = toTitleCase(addr.province || toSh.province || nextData.pihak2Provinsi || '');
    nextData.pihak2Kota = toTitleCase(addr.city || toSh.city || nextData.pihak2Kota || '');
    nextData.pihak2Kecamatan = toTitleCase(addr.kecamatan || toSh.kecamatan || nextData.pihak2Kecamatan || '');
    nextData.pihak2Kelurahan = toTitleCase(addr.kelurahan || toSh.kelurahan || nextData.pihak2Kelurahan || '');
    nextData.pihak2NIK = toSh.nik || nextData.pihak2NIK;
  } else if (transfer.toName) {
    nextData.pihak2Nama = transfer.toName;
    if ((transfer as any).toSalutation) nextData.pihak2Gelar = (transfer as any).toSalutation;
    if ((transfer as any).toNik) nextData.pihak2NIK = (transfer as any).toNik;
  }

  const getSpouseValue = (key: string, defVal: any = '') => {
    if (transfer && (transfer as any)[key] !== undefined) return (transfer as any)[key];
    if (companyData && (companyData as any)[key] !== undefined) return (companyData as any)[key];
    if (baseData && (baseData as any)[key] !== undefined) return (baseData as any)[key];
    return defVal;
  };

  // Spouse / Approval Status overrides from transfer or companyData or baseData if present
  let statusPersetujuan = getSpouseValue('pihak1StatusPersetujuan', '');

  const hasSpouseData = getSpouseValue('suamiNama', '') !== '';
  if (!statusPersetujuan && hasSpouseData) {
    if (getSpouseValue('tglSuratKuasa', '') !== '') {
      statusPersetujuan = 'Kuasa';
    } else {
      const p1Gelar = nextData.pihak1Gelar || '';
      if (p1Gelar === 'Nyonya' || p1Gelar === 'Nona') {
        statusPersetujuan = 'Suami';
      } else if (p1Gelar === 'Tuan') {
        statusPersetujuan = 'Istri';
      } else {
        statusPersetujuan = 'Suami';
      }
    }
  }

  nextData.pihak1StatusPersetujuan = statusPersetujuan;
  nextData.suamiNama = getSpouseValue('suamiNama', '');
  nextData.suamiTempatLahir = getSpouseValue('suamiTempatLahir', '');
  nextData.suamiTanggalLahir = getSpouseValue('suamiTanggalLahir', '');
  nextData.suamiPekerjaan = getSpouseValue('suamiPekerjaan', '');
  nextData.suamiNIK = getSpouseValue('suamiNIK', '');
  nextData.suamiAlamatSama = getSpouseValue('suamiAlamatSama', true);
  nextData.suamiAlamatJalan = getSpouseValue('suamiAlamatJalan', '');
  nextData.suamiRT = getSpouseValue('suamiRT', '');
  nextData.suamiRW = getSpouseValue('suamiRW', '');
  nextData.suamiProvinsi = getSpouseValue('suamiProvinsi', '');
  nextData.suamiKota = getSpouseValue('suamiKota', '');
  nextData.suamiKecamatan = getSpouseValue('suamiKecamatan', '');
  nextData.suamiKelurahan = getSpouseValue('suamiKelurahan', '');
  nextData.tglPersetujuanSuami = getSpouseValue('tglPersetujuanSuami', '');
  nextData.tglSuratKuasa = getSpouseValue('tglSuratKuasa', '');

  // Calculate harga jual if Jual Beli
  if (nextData.tipeAkta === 'Jual Beli') {
    const qty = parseFloat(nextData.jumlahSahamHibah) || 0;
    const price = parseFloat(nextData.nilaiNominalSaham) || 0;
    nextData.hargaJualSaham = (qty * price).toString();
  }

  return nextData;
};

export const getCompanyBaseData = (companyData: any, initialData: any) => {
  return {
    ...initialData,
    notarisNama: companyData?.notaryName || initialData.notarisNama,
    notarisKedudukan: companyData?.notaryDomicile || initialData.notarisKedudukan,
    namaPT: companyData?.targetCompanyName || companyData?.companyName || initialData.namaPT,
    kedudukanPT: toTitleCase(companyData?.newAddress?.city || companyData?.domicile || initialData.kedudukanPT || ''),
    tglPendirianPT: companyData?.establishmentDeedDate || initialData.tglPendirianPT,
    nomorPendirian: companyData?.establishmentDeedNumber || initialData.nomorPendirian,
    notarisPT: companyData?.establishmentNotary || initialData.notarisPT,
    notarisPTTitle: companyData?.establishmentNotaryTitle || initialData.notarisPTTitle,
    kedudukanNotarisPT: companyData?.establishmentNotaryDomicile || initialData.kedudukanNotarisPT,
    skPengesahan: companyData?.establishmentSkNumber || initialData.skPengesahan,
    tglSKPengesahan: companyData?.establishmentSkDate || initialData.tglSKPengesahan,
    jumlahSahamPT: companyData?.originalAuthorizedShares ? companyData.originalAuthorizedShares.toString() : (companyData?.originalTotalShares ? companyData.originalTotalShares.toString() : initialData.jumlahSahamPT),
    nilaiNominalSaham: companyData?.originalSharePrice ? companyData.originalSharePrice.toString() : initialData.nilaiNominalSaham,
    tglSirkuler: companyData?.signingDate || initialData.tglSirkuler,
    aktaPerubahan: companyData?.amendmentDeeds && companyData.amendmentDeeds.length > 0 
      ? (companyData.amendmentDeeds || []).map((deed: any) => {
          const sk = deed.skSpDocuments?.[0];
          return {
            id: deed.id,
            tglRapat: deed.date,
            nomorRapat: deed.number,
            notaris: deed.notary,
            notarisTitle: deed.notaryTitle || '',
            kedudukanNotaris: deed.notaryDomicile || '',
            skPerubahan: sk?.number || deed.skNumber || '',
            tglSKPerubahan: sk?.date || deed.skDate || '',
            jenisSK: (sk?.type === 'SK' ? 'SK' : sk?.type === 'SP' ? 'SP' : 'Penerimaan Pemberitahuan') as any
          }
        })
      : initialData.aktaPerubahan,
  };
};

const DraftAktaApp = forwardRef<DraftAktaAppRef, DraftAktaAppProps>(({ companyData, onUpdateShareTransfer }, ref) => {
  const [transferDataMap, setTransferDataMap] = useState<Record<string, FormData>>({});
  const [previewTransferId, setPreviewTransferId] = useState<string | null>(null);

  const activeTransfers = (companyData?.shareTransfersNew && companyData.shareTransfersNew.length > 0)
    ? companyData.shareTransfersNew
    : (companyData?.shareTransfers || []);

  useEffect(() => {
    if (companyData && activeTransfers.length > 0) {
      setTransferDataMap(prevMap => {
        const newMap = { ...prevMap };
        let hasChanges = false;
        
        // Base structure from company
        const baseCompanyData = getCompanyBaseData(companyData, initialData);

        for (const transfer of activeTransfers) {
          if (!newMap[transfer.id]) {
            newMap[transfer.id] = getTransferData(transfer, companyData, baseCompanyData);
            hasChanges = true;
          } else {
            // Update existing data with latest company details but preserve manual edits
            const currentData = newMap[transfer.id];
            
            // Only update read-only or base fields
            const updatedData = getTransferData(transfer, companyData, {
               ...currentData,
               namaPT: baseCompanyData.namaPT,
               kedudukanPT: baseCompanyData.kedudukanPT,
               tglPendirianPT: baseCompanyData.tglPendirianPT,
               nomorPendirian: baseCompanyData.nomorPendirian,
               notarisPT: baseCompanyData.notarisPT,
               notarisPTTitle: baseCompanyData.notarisPTTitle,
               kedudukanNotarisPT: baseCompanyData.kedudukanNotarisPT,
               skPengesahan: baseCompanyData.skPengesahan,
               tglSKPengesahan: baseCompanyData.tglSKPengesahan,
               jumlahSahamPT: baseCompanyData.jumlahSahamPT,
               nilaiNominalSaham: baseCompanyData.nilaiNominalSaham,
               tglSirkuler: currentData.tglSirkuler, // Preserve manual edit
               aktaPerubahan: baseCompanyData.aktaPerubahan
            });
            
            if (JSON.stringify(currentData) !== JSON.stringify(updatedData)) {
              newMap[transfer.id] = updatedData;
              hasChanges = true;
            }
          }
        }
        return hasChanges ? newMap : prevMap;
      });
    }
  }, [companyData, activeTransfers]);

  const handleChange = (
    transferId: string, 
    e: { target: { name: string; value: any } },
    batchUpdates?: Record<string, any>
  ) => {
    const currentData = transferDataMap[transferId] || initialData;

    const updates: Record<string, any> = {
      [e.target.name]: e.target.value,
      ...(batchUpdates || {})
    };

    const nextData = {
      ...currentData,
      ...updates
    };

    // Auto-calculate Harga Jual Beli Saham if in AJB mode
    if (nextData.tipeAkta === 'Jual Beli' && (updates.jumlahSahamHibah !== undefined || updates.nilaiNominalSaham !== undefined || updates.tipeAkta !== undefined)) {
      const qty = parseFloat(nextData.jumlahSahamHibah) || 0;
      const price = parseFloat(nextData.nilaiNominalSaham) || 0;
      nextData.hargaJualSaham = (qty * price).toString();
    }

    setTransferDataMap(prev => ({
      ...prev,
      [transferId]: nextData
    }));

    if (onUpdateShareTransfer) {
      onUpdateShareTransfer(transferId, {
        pihak1StatusPersetujuan: nextData.pihak1StatusPersetujuan,
        suamiNama: nextData.suamiNama,
        suamiTempatLahir: nextData.suamiTempatLahir,
        suamiTanggalLahir: nextData.suamiTanggalLahir,
        suamiPekerjaan: nextData.suamiPekerjaan,
        suamiAlamatJalan: nextData.suamiAlamatJalan,
        suamiRT: nextData.suamiRT,
        suamiRW: nextData.suamiRW,
        suamiProvinsi: nextData.suamiProvinsi,
        suamiKota: nextData.suamiKota,
        suamiKecamatan: nextData.suamiKecamatan,
        suamiKelurahan: nextData.suamiKelurahan,
        suamiNIK: nextData.suamiNIK,
        suamiAlamatSama: nextData.suamiAlamatSama,
        tglPersetujuanSuami: nextData.tglPersetujuanSuami,
        tglSuratKuasa: nextData.tglSuratKuasa,
        hargaJualSaham: nextData.hargaJualSaham,
        jumlahSahamHibah: nextData.jumlahSahamHibah,
        tipeAkta: nextData.tipeAkta,
        transferType: nextData.tipeAkta === 'Hibah' ? 'HIBAH' : 'AJB'
      });
    }
  };

  const handleDownloadSingle = async (transferId: string) => {
    if (transferDataMap[transferId]) {
      await generateDocx(transferDataMap[transferId]);
    }
  };

  const handleDownloadAll = async () => {
      if (!activeTransfers || activeTransfers.length === 0) return;
      
      if (activeTransfers.length === 1) {
          const transferId = activeTransfers[0].id;
          if (transferDataMap[transferId]) {
             await generateDocx(transferDataMap[transferId]);
          }
          return;
      }

      const zip = new JSZip();
      
      for (const transfer of activeTransfers) {
          const transferData = transferDataMap[transfer.id];
          if (!transferData) continue;
          
          const blob = await generateDocxBlob(transferData);
          const fileName = transferData.tipeAkta === "Hibah" 
            ? `Akta Hibah Saham ${transferData.nomorAkta || transfer.id}.docx`
            : `Akta Jual Beli Saham ${transferData.nomorAkta || transfer.id}.docx`;
          zip.file(fileName, blob);
      }
      
      const content = await zip.generateAsync({type: "blob"});
      saveAs(content, "Sebagian Draft Akta Peralihan Saham.zip");
  };

  useImperativeHandle(ref, () => ({
    handleDownloadAll,
    handleDownloadSingle,
    hasTransfers: activeTransfers.length > 0
  }));

  if (!activeTransfers || activeTransfers.length === 0) {
    return <div className="text-sm text-slate-500 italic p-4">Tidak ada data peralihan saham.</div>;
  }

  const previewData = previewTransferId ? transferDataMap[previewTransferId] : null;

  return (
    <div className="w-full flex flex-col gap-8">
      {activeTransfers.map((transfer, index) => {
        const currentData = transferDataMap[transfer.id] || initialData;
        const fromName = transfer.fromName || companyData.shareholders.find(s => s.id === transfer.fromShareholderId)?.name || 'Pemilik Saham';
        const toName = transfer.toName || companyData.shareholders.find(s => s.id === transfer.toShareholderId)?.name || companyData.finalShareholders?.find(s => s.id === transfer.toShareholderId)?.name || 'Penerima Saham';
        
        return (
          <div key={transfer.id} className="w-full pb-8 border-b border-slate-200 last:border-b-0">
            <div className="flex justify-between items-center mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-700 text-[14px] flex items-center gap-2">
                 <span className="bg-[#3b5998] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{index + 1}</span>
                 {transfer.type} - {fromName} kepada {toName}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setPreviewTransferId(transfer.id)} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors px-3 py-1.5 rounded-lg flex items-center gap-2 text-[12px] font-bold shadow-sm">
                  <Eye size={14} className="text-blue-600" /> Pratinjau
                </button>
                <button onClick={() => handleDownloadSingle(transfer.id)} className="bg-[#3b5998] hover:bg-[#2c4073] text-white transition-colors px-3 py-1.5 rounded-lg flex items-center gap-2 text-[12px] font-bold shadow-sm">
                  <Download size={14} /> Download DOCX
                </button>
              </div>
            </div>
            
            <div className="w-full max-w-4xl mx-auto pl-4">
              <FormContent 
                data={currentData} 
                onChange={(e, batchUpdates) => handleChange(transfer.id, e, batchUpdates)} 
                integrated={true} 
                companyData={companyData}
                transferId={transfer.id}
              />
            </div>
          </div>
        );
      })}

      {/* Modal Pratinjau */}
      {previewTransferId && previewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-100 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-4 border-b flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                 <Eye size={20} className="text-blue-600"/> Pratinjau Dokumen 
              </h2>
              <button onClick={() => setPreviewTransferId(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-500 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 md:p-0 flex justify-center bg-slate-200">
               <DocumentPreview data={previewData} />
            </div>
            <div className="bg-white border-t p-4 flex justify-end px-6 shrink-0 gap-3">
               <button onClick={() => setPreviewTransferId(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Tutup</button>
               <button onClick={() => handleDownloadSingle(previewTransferId)} className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors">
                  <Download size={16}/> Download DOCX
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DraftAktaApp;
