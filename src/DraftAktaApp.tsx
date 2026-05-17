import React, { useState, useEffect } from 'react';
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
}

const getTransferData = (transfer: ShareTransfer, companyData: CompanyData, baseData: FormData): FormData => {
  const nextData = { ...baseData };
  if (transfer.type) {
      nextData.tipeAkta = transfer.type === 'Hibah' ? 'Hibah' : 'Jual Beli';
  }
  if (transfer.sharesTransferred) {
      nextData.jumlahSahamHibah = transfer.sharesTransferred.toString();
  }

  const fromSh = companyData.shareholders.find(s => s.id === transfer.fromShareholderId);
  const toSh = companyData.shareholders.find(s => s.id === transfer.toShareholderId) || companyData.finalShareholders?.find(s => s.id === transfer.toShareholderId);

  if (fromSh) {
    nextData.pihak1Gelar = fromSh.salutation || nextData.pihak1Gelar;
    nextData.pihak1Nama = fromSh.name || nextData.pihak1Nama;
    nextData.pihak1TempatLahir = fromSh.birthCity || nextData.pihak1TempatLahir;
    nextData.pihak1TanggalLahir = fromSh.birthDate || nextData.pihak1TanggalLahir;
    nextData.pihak1Pekerjaan = fromSh.occupation || nextData.pihak1Pekerjaan;
    nextData.pihak1AlamatJalan = fromSh.address?.fullAddress || nextData.pihak1AlamatJalan;
    nextData.pihak1RT = fromSh.address?.rt || nextData.pihak1RT;
    nextData.pihak1RW = fromSh.address?.rw || nextData.pihak1RW;
    nextData.pihak1Provinsi = toTitleCase(fromSh.address?.province || nextData.pihak1Provinsi || '');
    nextData.pihak1Kota = toTitleCase(fromSh.address?.city || nextData.pihak1Kota || '');
    nextData.pihak1Kecamatan = toTitleCase(fromSh.address?.kecamatan || nextData.pihak1Kecamatan || '');
    nextData.pihak1Kelurahan = toTitleCase(fromSh.address?.kelurahan || nextData.pihak1Kelurahan || '');
    nextData.pihak1NIK = fromSh.nik || nextData.pihak1NIK;
  }

  if (toSh) {
    nextData.pihak2Gelar = toSh.salutation || nextData.pihak2Gelar;
    nextData.pihak2Nama = toSh.name || nextData.pihak2Nama;
    nextData.pihak2TempatLahir = toSh.birthCity || nextData.pihak2TempatLahir;
    nextData.pihak2TanggalLahir = toSh.birthDate || nextData.pihak2TanggalLahir;
    nextData.pihak2Pekerjaan = toSh.occupation || nextData.pihak2Pekerjaan;
    nextData.pihak2AlamatJalan = toSh.address?.fullAddress || nextData.pihak2AlamatJalan;
    nextData.pihak2RT = toSh.address?.rt || nextData.pihak2RT;
    nextData.pihak2RW = toSh.address?.rw || nextData.pihak2RW;
    nextData.pihak2Provinsi = toTitleCase(toSh.address?.province || nextData.pihak2Provinsi || '');
    nextData.pihak2Kota = toTitleCase(toSh.address?.city || nextData.pihak2Kota || '');
    nextData.pihak2Kecamatan = toTitleCase(toSh.address?.kecamatan || nextData.pihak2Kecamatan || '');
    nextData.pihak2Kelurahan = toTitleCase(toSh.address?.kelurahan || nextData.pihak2Kelurahan || '');
    nextData.pihak2NIK = toSh.nik || nextData.pihak2NIK;
  }

  // Calculate harga jual if Jual Beli
  if (nextData.tipeAkta === 'Jual Beli') {
    const qty = parseFloat(nextData.jumlahSahamHibah) || 0;
    const price = parseFloat(nextData.nilaiNominalSaham) || 0;
    nextData.hargaJualSaham = (qty * price).toString();
  }

  return nextData;
};

export default function DraftAktaApp({ companyData }: DraftAktaAppProps) {
  const [transferDataMap, setTransferDataMap] = useState<Record<string, FormData>>({});
  const [selectedTransferId, setSelectedTransferId] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (companyData && companyData.shareTransfers) {
      setTransferDataMap(prevMap => {
        const newMap = { ...prevMap };
        let hasChanges = false;
        
        // Base structure from company
        const baseCompanyData = {
          ...initialData,
          notarisNama: companyData.notaryName || initialData.notarisNama,
          notarisKedudukan: companyData.notaryDomicile || initialData.notarisKedudukan,
          namaPT: companyData.targetCompanyName || companyData.companyName || initialData.namaPT,
          kedudukanPT: toTitleCase(companyData.newAddress?.city || companyData.domicile || initialData.kedudukanPT || ''),
          tglPendirianPT: companyData.establishmentDeedDate || initialData.tglPendirianPT,
          nomorPendirian: companyData.establishmentDeedNumber || initialData.nomorPendirian,
          notarisPT: companyData.establishmentNotary || initialData.notarisPT,
          notarisPTTitle: companyData.establishmentNotaryTitle || initialData.notarisPTTitle,
          kedudukanNotarisPT: companyData.establishmentNotaryDomicile || initialData.kedudukanNotarisPT,
          skPengesahan: companyData.establishmentSkNumber || initialData.skPengesahan,
          tglSKPengesahan: companyData.establishmentSkDate || initialData.tglSKPengesahan,
          jumlahSahamPT: companyData.originalAuthorizedShares ? companyData.originalAuthorizedShares.toString() : (companyData.originalTotalShares ? companyData.originalTotalShares.toString() : initialData.jumlahSahamPT),
          nilaiNominalSaham: companyData.originalSharePrice ? companyData.originalSharePrice.toString() : initialData.nilaiNominalSaham,
          tglSirkuler: companyData.signingDate || initialData.tglSirkuler,
          aktaPerubahan: companyData.amendmentDeeds && companyData.amendmentDeeds.length > 0 
            ? companyData.amendmentDeeds.map((deed) => {
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

        for (const transfer of companyData.shareTransfers) {
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
  }, [companyData]);

  useEffect(() => {
    if (companyData?.shareTransfers && companyData.shareTransfers.length > 0) {
      if (!selectedTransferId || !companyData.shareTransfers.find(t => t.id === selectedTransferId)) {
        setSelectedTransferId(companyData.shareTransfers[0].id);
      }
    } else {
      setSelectedTransferId('');
    }
  }, [companyData, selectedTransferId]);

  const handleChange = (e: { target: { name: string; value: any } }) => {
    if (!selectedTransferId) return;

    setTransferDataMap(prev => {
      const currentData = prev[selectedTransferId];
      if (!currentData) return prev;

      const nextData = {
        ...currentData,
        [e.target.name]: e.target.value
      };

      // Auto-calculate Harga Jual Beli Saham if in AJB mode
      if (nextData.tipeAkta === 'Jual Beli' && (e.target.name === 'jumlahSahamHibah' || e.target.name === 'nilaiNominalSaham' || e.target.name === 'tipeAkta')) {
        const qty = parseFloat(nextData.jumlahSahamHibah) || 0;
        const price = parseFloat(nextData.nilaiNominalSaham) || 0;
        nextData.hargaJualSaham = (qty * price).toString();
      }

      return {
        ...prev,
        [selectedTransferId]: nextData
      };
    });
  };

  const handleDownload = async () => {
    if (selectedTransferId && transferDataMap[selectedTransferId]) {
      await generateDocx(transferDataMap[selectedTransferId]);
    }
  };

  const handleDownloadAll = async () => {
      if (!companyData || !companyData.shareTransfers) return;
      
      const zip = new JSZip();
      
      for (const transfer of companyData.shareTransfers) {
          const transferData = transferDataMap[transfer.id];
          if (!transferData) continue;
          
          const blob = await generateDocxBlob(transferData);
          const fileName = transferData.tipeAkta === "Hibah" 
            ? `Akta_Hibah_Saham_${transferData.nomorAkta}_${transfer.id}.docx`
            : `Akta_Jual_Beli_Saham_${transferData.nomorAkta}_${transfer.id}.docx`;
          zip.file(fileName, blob);
      }
      
      const content = await zip.generateAsync({type: "blob"});
      saveAs(content, "semua_draft_akta.zip");
  };

  const currentData = transferDataMap[selectedTransferId] || initialData;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6">
        {companyData?.shareTransfers && companyData.shareTransfers.length > 0 ? (
           <div className="flex items-center gap-3">
             <label className="text-sm font-semibold text-slate-700">Pilih Peralihan Saham:</label>
             <select 
               className="border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white min-w-[250px]"
               value={selectedTransferId}
               onChange={(e) => setSelectedTransferId(e.target.value)}
             >
               {companyData.shareTransfers.map(t => {
                 const fromName = companyData.shareholders.find(s => s.id === t.fromShareholderId)?.name || 'Unknown';
                 const toName = companyData.shareholders.find(s => s.id === t.toShareholderId)?.name || companyData.finalShareholders?.find(s => s.id === t.toShareholderId)?.name || 'Unknown';
                 return (
                   <option key={t.id} value={t.id}>
                     {t.type} - {fromName} kepada {toName} ({t.sharesTransferred} saham)
                   </option>
                 );
               })}
             </select>
           </div>
        ) : (
           <div />
        )}

        <div className="flex gap-3">
          <button onClick={() => setIsPreviewOpen(true)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold shadow-sm">
            <Eye size={16} className="text-blue-600" /> Pratinjau Dokumen
          </button>
          
          {companyData?.shareTransfers && companyData.shareTransfers.length > 1 && (
            <button onClick={handleDownloadAll} className="bg-[#3b5998] hover:bg-[#2c4073] text-white transition-colors px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold shadow-sm">
              <Download size={16} /> Download Semua (.zip)
            </button>
          )}

          <button onClick={handleDownload} className="bg-[#3b5998] hover:bg-[#2c4073] text-white transition-colors px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold shadow-sm">
            <Download size={16} /> Download DOCX
          </button>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto">
        <FormContent data={currentData} onChange={handleChange} integrated={true} />
      </div>

      {/* Modal Pratinjau */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-100 w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-4 border-b flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                 <Eye size={20} className="text-blue-600"/> Pratinjau Dokumen
              </h2>
              <button onClick={() => setIsPreviewOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-500 hover:text-slate-900">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 md:p-0 flex justify-center bg-slate-200">
               <DocumentPreview data={currentData} />
            </div>
            <div className="bg-white border-t p-4 flex justify-end px-6 shrink-0 gap-3">
               <button onClick={() => setIsPreviewOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Tutup</button>
               <button onClick={handleDownload} className="px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors">
                  <Download size={16}/> Download DOCX
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
