import React, { useState } from 'react';
import { 
  Users, Building2, MapPin, Landmark, Plus, Trash2, 
  Save, CheckCircle2, AlertCircle, FileText, ChevronDown, 
  ChevronUp, Edit3, UserCheck, Shield, ArrowLeft, Calendar,
  Heart, Compass, FileCheck, ArrowUp, ArrowDown, Sparkles,
  Receipt, DollarSign, FileSignature, Layers
} from 'lucide-react';
import { Project, PPATData, PPATParty, PPATAttachmentItem } from '../../../../domain/project/Project';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { ProjectService } from '../../../../services/ProjectService';
import { PPAT_TRANSACTION_TYPES } from '../../../../constants/appConstants';
import { 
  formatFullPartyAddress, 
  isCityKota, 
  getPersonHonorific, 
  formatRupiah, 
  terbilang, 
  normalizePPATData, 
  createDefaultParty, 
  createDefaultObject,
  formatFullObjectLocationString
} from './ppatAddressUtils';

interface PPATDataManagerProps {
  project: Project;
  currentUser?: any;
  onUpdateProject?: (updated: Project) => void;
  onBack?: () => void;
}

export type PPATMasterTab = 'parties' | 'certificate' | 'pbb' | 'propertyLocation' | 'transaction' | 'akta' | 'bpnApplication';

export const PPATDataManager: React.FC<PPATDataManagerProps> = ({
  project,
  currentUser,
  onUpdateProject,
  onBack
}) => {
  // Initialize normalized internal state from project.ppatData
  const [ppatData, setPpatData] = useState<PPATData>(() => {
    return normalizePPATData(project.ppatData || {
      transactionType: project.projectType || 'Akta Jual Beli (AJB)'
    });
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active sub-tab (7 Structured Sections)
  const [activeTab, setActiveTab] = useState<PPATMasterTab>('parties');

  // --- Handlers for Para Pihak ---
  const handleAddFirstParty = () => {
    setPpatData(prev => {
      const updatedFirst = [...(prev.firstParties || []), createDefaultParty(`Pihak Pertama ${(prev.firstParties?.length || 0) + 1}`)];
      return normalizePPATData({ ...prev, firstParties: updatedFirst });
    });
  };

  const handleUpdateFirstParty = (index: number, fields: Partial<PPATParty>) => {
    setPpatData(prev => {
      const updatedFirst = [...(prev.firstParties || [])];
      updatedFirst[index] = { ...updatedFirst[index], ...fields };
      return normalizePPATData({ ...prev, firstParties: updatedFirst });
    });
  };

  const handleRemoveFirstParty = (index: number) => {
    if ((ppatData.firstParties?.length || 0) <= 1) return;
    setPpatData(prev => {
      const updatedFirst = (prev.firstParties || []).filter((_, i) => i !== index);
      return normalizePPATData({ ...prev, firstParties: updatedFirst });
    });
  };

  const handleAddSecondParty = () => {
    setPpatData(prev => {
      const updatedSecond = [...(prev.secondParties || []), createDefaultParty(`Pihak Kedua ${(prev.secondParties?.length || 0) + 1}`)];
      return normalizePPATData({ ...prev, secondParties: updatedSecond });
    });
  };

  const handleUpdateSecondParty = (index: number, fields: Partial<PPATParty>) => {
    setPpatData(prev => {
      const updatedSecond = [...(prev.secondParties || [])];
      updatedSecond[index] = { ...updatedSecond[index], ...fields };
      return normalizePPATData({ ...prev, secondParties: updatedSecond });
    });
  };

  const handleRemoveSecondParty = (index: number) => {
    if ((ppatData.secondParties?.length || 0) <= 1) return;
    setPpatData(prev => {
      const updatedSecond = (prev.secondParties || []).filter((_, i) => i !== index);
      return normalizePPATData({ ...prev, secondParties: updatedSecond });
    });
  };

  // --- Handlers for Sub-Objects ---
  const handleUpdateCertificate = (fields: Partial<any>) => {
    setPpatData(prev => {
      const updatedCert = { ...(prev.certificate || {}), ...fields };
      return normalizePPATData({ ...prev, certificate: updatedCert });
    });
  };

  const handleUpdatePbb = (fields: Partial<any>) => {
    setPpatData(prev => {
      const updatedPbb = { ...(prev.pbb || {}), ...fields };
      return normalizePPATData({ ...prev, pbb: updatedPbb });
    });
  };

  const handleUpdateLocation = (fields: Partial<any>) => {
    setPpatData(prev => {
      const updatedLoc = { ...(prev.propertyLocation || {}), ...fields };
      return normalizePPATData({ ...prev, propertyLocation: updatedLoc });
    });
  };

  const handleUpdateTransaction = (fields: Partial<any>) => {
    setPpatData(prev => {
      const updatedTrans = { ...(prev.transaction || {}), ...fields };
      return normalizePPATData({ ...prev, transaction: updatedTrans });
    });
  };

  const handleUpdateAkta = (fields: Partial<any>) => {
    setPpatData(prev => {
      const updatedAkta = { ...(prev.akta || {}), ...fields };
      return normalizePPATData({
        ...prev,
        akta: updatedAkta,
        transactionType: updatedAkta.jenisAkta || prev.transactionType
      });
    });
  };

  const handleUpdateBpnApplication = (fields: Partial<any>) => {
    setPpatData(prev => {
      const updatedBpn = { ...(prev.bpnApplication || {}), ...fields };
      return normalizePPATData({ ...prev, bpnApplication: updatedBpn });
    });
  };

  // --- Handlers for Lampiran Permohonan BPN ---
  const handleAddAttachment = () => {
    const newAtt: PPATAttachmentItem = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(7),
      name: '',
      documentNumber: '',
      documentDate: ''
    };
    const currentList = ppatData.bpnApplication?.attachments || ppatData.attachments || [];
    handleUpdateBpnApplication({ attachments: [...currentList, newAtt] });
  };

  const handleUpdateAttachment = (index: number, fields: Partial<PPATAttachmentItem>) => {
    const currentList = [...(ppatData.bpnApplication?.attachments || ppatData.attachments || [])];
    currentList[index] = { ...currentList[index], ...fields };
    handleUpdateBpnApplication({ attachments: currentList });
  };

  const handleDeleteAttachment = (index: number) => {
    const currentList = [...(ppatData.bpnApplication?.attachments || ppatData.attachments || [])];
    currentList.splice(index, 1);
    handleUpdateBpnApplication({ attachments: currentList });
  };

  const handleMoveAttachment = (index: number, direction: 'up' | 'down') => {
    const currentList = [...(ppatData.bpnApplication?.attachments || ppatData.attachments || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;
    const temp = currentList[index];
    currentList[index] = currentList[targetIndex];
    currentList[targetIndex] = temp;
    handleUpdateBpnApplication({ attachments: currentList });
  };

  const handleLoadDefaultAttachments = () => {
    const certTypeDisplay = ppatData.certificate?.certificateType ? ppatData.certificate.certificateType.replace("Hak ", "M ").toUpperCase() : "M";
    const certNo = ppatData.certificate?.certificateNumber || "651";
    const rawVillage = ppatData.propertyLocation?.village || "MEKARWANGI";
    const certDesa = rawVillage.replace(/^(desa|kelurahan)\s+/i, '').toUpperCase();
    
    const defaults: PPATAttachmentItem[] = [
      {
        id: 'att_cert_' + Date.now(),
        name: `ASLI ${certTypeDisplay} ${certNo}/DESA ${certDesa}`,
        documentNumber: '',
        documentDate: ''
      },
      {
        id: 'att_kuasa_' + (Date.now() + 1),
        name: 'ASLI SURAT KUASA',
        documentNumber: ppatData.bpnApplication?.nomorSuratKuasa || ppatData.nomorSuratKuasa || '',
        documentDate: ppatData.bpnApplication?.tanggalSuratKuasa || ppatData.tanggalSuratKuasa || ''
      },
      {
        id: 'att_ajb_' + (Date.now() + 2),
        name: `AJB ${ppatData.akta?.nomorAkta ? `${ppatData.akta.nomorAkta}/${ppatData.akta.tahunAkta || new Date().getFullYear()}` : '01/2026'}`,
        documentNumber: '',
        documentDate: ppatData.akta?.tanggalAkta || ''
      }
    ];

    handleUpdateBpnApplication({ attachments: defaults });
  };

  // --- Save to Firestore ---
  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const targetProjectId = project.projectId;
      if (!targetProjectId) {
        throw new Error('ID Proyek tidak valid.');
      }
      const normalizedData = normalizePPATData(ppatData);
      const projectRef = doc(db, 'office_projects', targetProjectId);
      const projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        throw new Error(`Dokumen proyek (${targetProjectId}) tidak ditemukan di database.`);
      }
      const cleanData = JSON.parse(JSON.stringify(normalizedData));

      await setDoc(projectRef, {
        ppatData: cleanData,
        projectType: normalizedData.transactionType || project.projectType || 'Akta Jual Beli (AJB)',
        updatedAt: new Date()
      }, { merge: true });

      // Add timeline log
      try {
        await ProjectService.addTimeline(targetProjectId, {
          status: 'Updated',
          title: 'Master Data PPAT Diperbarui',
          description: `Master Data PPAT (${normalizedData.transactionType}) berhasil diperbarui dan disinkronkan.`,
          createdBy: currentUser?.displayName || 'Petugas PPAT'
        });
      } catch (err) {
        console.warn('Could not add timeline log', err);
      }

      setPpatData(normalizedData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);

      if (onUpdateProject) {
        onUpdateProject({
          ...project,
          ppatData: cleanData,
          projectType: normalizedData.transactionType,
          updatedAt: new Date()
        });
      }
    } catch (err: any) {
      console.error('Error saving PPAT master data:', err);
      setErrorMessage(err.message || 'Gagal menyimpan Master Data PPAT.');
    } finally {
      setSaving(false);
    }
  };

  const firstParties = ppatData.firstParties || [];
  const secondParties = ppatData.secondParties || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-colors flex items-center justify-center shrink-0"
              title="Kembali ke Dokumen Proyek"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-amber-100" />
              <h3 className="text-base font-bold tracking-tight">
                Master Data PPAT Proyek
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-700/60 border border-amber-300/40 rounded-full text-amber-100">
                Single Source of Truth
              </span>
            </div>
            <p className="text-xs text-amber-100 mt-0.5">
              Kelola data utama secara terstruktur. Seluruh dokumen PPAT akan bersumber langsung dari data master ini.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/30 text-white border border-emerald-300/40 px-3 py-1.5 rounded-lg animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              Master Data Tersimpan
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-amber-50 text-amber-700 font-bold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Master Data PPAT'}</span>
          </button>
        </div>
      </div>

      {/* 7 STRUCTURED TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 bg-slate-50/90 px-4 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setActiveTab('parties')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'parties'
              ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>1. Data Para Pihak</span>
          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-[10px]">
            {firstParties.length + secondParties.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('certificate')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'certificate'
              ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 text-amber-600" />
          <span>2. Data Sertipikat</span>
          {ppatData.certificate?.certificateNumber && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('pbb')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'pbb'
              ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span>3. Data PBB</span>
          {ppatData.pbb?.nop && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('propertyLocation')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'propertyLocation'
              ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-indigo-600" />
          <span>4. Letak Objek</span>
          {ppatData.propertyLocation?.village && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('transaction')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'transaction'
              ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>5. Data Transaksi</span>
          {Boolean(ppatData.transaction?.transactionValue) && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('akta')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'akta'
              ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSignature className="w-4 h-4 text-amber-600" />
          <span>6. Data Akta PPAT</span>
          {ppatData.akta?.nomorAkta && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('bpnApplication')}
          className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'bpnApplication'
              ? 'border-amber-500 text-amber-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-purple-600" />
          <span>7. BPN / Permohonan</span>
          {Boolean(ppatData.bpnApplication?.attachments?.length) && (
            <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full text-[10px]">
              {ppatData.bpnApplication?.attachments?.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: DATA PARA PIHAK */}
        {activeTab === 'parties' && (
          <div className="space-y-8">
            {/* PIHAK PERTAMA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    I
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Pihak Pertama (Penjual / Pelepas Hak / Pewaris)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pihak yang mengalihkan hak atas tanah/bangunan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddFirstParty}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pihak Pertama</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {firstParties.map((party, idx) => (
                  <PartyFormCard
                    key={party.id || idx}
                    party={party}
                    index={idx}
                    label="Pihak Pertama"
                    canDelete={firstParties.length > 1}
                    onUpdate={(fields) => handleUpdateFirstParty(idx, fields)}
                    onDelete={() => handleRemoveFirstParty(idx)}
                  />
                ))}
              </div>
            </div>

            {/* PIHAK KEDUA */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    II
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Pihak Kedua (Pembeli / Penerima Hak / Ahli Waris)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pihak yang menerima peralihan hak atas tanah/bangunan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddSecondParty}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Pihak Kedua</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {secondParties.map((party, idx) => (
                  <PartyFormCard
                    key={party.id || idx}
                    party={party}
                    index={idx}
                    label="Pihak Kedua"
                    canDelete={secondParties.length > 1}
                    onUpdate={(fields) => handleUpdateSecondParty(idx, fields)}
                    onDelete={() => handleRemoveSecondParty(idx)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA SERTIPIKAT */}
        {activeTab === 'certificate' && (
          <div className="space-y-6">
            <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-600" />
                    DATA SERTIPIKAT & HAK ATAS TANAH
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Informasi hak atas tanah, nomor sertipikat, dan data surat ukur resmi dari Buku Tanah.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* FIELD MASTER MANDATORY: namaDalamSertipikat */}
                <div className="sm:col-span-2 lg:col-span-3 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 space-y-1">
                  <label className="text-xs font-bold text-amber-900 uppercase tracking-wide block">
                    Nama Pemegang Hak Sesuai Sertipikat / Buku Tanah *
                  </label>
                  <p className="text-[11px] text-amber-700 mb-1.5">
                    Field Master Tersendiri. Nama yang tercantum pada Sertipikat dapat berbeda dengan KTP (misal ada gelar / ejaan lama / perubahan nama).
                  </p>
                  <input
                    type="text"
                    value={ppatData.certificate?.namaDalamSertipikat || ''}
                    onChange={(e) => handleUpdateCertificate({ namaDalamSertipikat: e.target.value })}
                    placeholder="Masukkan nama persis seperti tertulis di Sertipikat / Buku Tanah..."
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Jenis Hak atas Tanah *</label>
                  <select
                    value={ppatData.certificate?.certificateType || 'SHM'}
                    onChange={(e) => handleUpdateCertificate({ certificateType: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold"
                  >
                    <option value="SHM">Hak Milik (SHM)</option>
                    <option value="HGB">Hak Guna Bangunan (HGB)</option>
                    <option value="Hak Pakai">Hak Pakai (HP)</option>
                    <option value="Hak Pengelolaan">Hak Pengelolaan (HPL)</option>
                    <option value="Girik / Warkah">Girik / Letter C / Warkah</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Nomor Sertipikat / Nomor Hak *</label>
                  <input
                    type="text"
                    value={ppatData.certificate?.certificateNumber || ''}
                    onChange={(e) => handleUpdateCertificate({ certificateNumber: e.target.value })}
                    placeholder="Contoh: 00651 atau 1234/Mekarwangi"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Jenis Dokumen Ukur</label>
                  <select
                    value={ppatData.certificate?.measurementDocType || 'Surat Ukur'}
                    onChange={(e) => handleUpdateCertificate({ measurementDocType: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold"
                  >
                    <option value="Surat Ukur">Surat Ukur</option>
                    <option value="Gambar Situasi">Gambar Situasi</option>
                    <option value="NIB / Peta Bidang">NIB / Peta Bidang</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Nomor Surat Ukur / GS</label>
                  <input
                    type="text"
                    value={ppatData.certificate?.nomorSuratUkur || ppatData.certificate?.measurementDocNumber || ''}
                    onChange={(e) => handleUpdateCertificate({ 
                      nomorSuratUkur: e.target.value,
                      measurementDocNumber: e.target.value 
                    })}
                    placeholder="Contoh: 00557/Cikahuripan/2019"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Tanggal Surat Ukur</label>
                  <input
                    type="date"
                    value={ppatData.certificate?.measurementDocDate || ''}
                    onChange={(e) => handleUpdateCertificate({ measurementDocDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Luas Tanah (m²)</label>
                  <input
                    type="number"
                    value={ppatData.certificate?.landArea || ''}
                    onChange={(e) => handleUpdateCertificate({ landArea: Number(e.target.value) })}
                    placeholder="Luas m2"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">NIB (Nomor Identifikasi Bidang)</label>
                  <input
                    type="text"
                    value={ppatData.certificate?.nib || ''}
                    onChange={(e) => handleUpdateCertificate({ nib: e.target.value })}
                    placeholder="Nomor NIB BPN"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Catatan Sertipikat / Nomor Hak Lainnya</label>
                  <input
                    type="text"
                    value={ppatData.certificate?.notes || ''}
                    onChange={(e) => handleUpdateCertificate({ notes: e.target.value })}
                    placeholder="Catatan tambahan sertipikat..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DATA PBB */}
        {activeTab === 'pbb' && (
          <div className="space-y-6">
            <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="border-b border-slate-200 pb-2.5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  DATA PBB (PAJAK BUMI DAN BANGUNAN)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Data NOP, SPPT PBB, dan NJOP. Data PBB berdiri sendiri sebagai objek data khusus.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700">NOP (Nomor Objek Pajak) 18 Digit</label>
                  <input
                    type="text"
                    value={ppatData.pbb?.nop || ''}
                    onChange={(e) => handleUpdatePbb({ nop: e.target.value })}
                    placeholder="32.17.xxx.xxx.xxx-xxxx.x"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">SPPT PBB Atas Nama</label>
                  <input
                    type="text"
                    value={ppatData.pbb?.spptName || ''}
                    onChange={(e) => handleUpdatePbb({ spptName: e.target.value })}
                    placeholder="Nama Wajib Pajak pada SPPT"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Tahun Pajak SPPT</label>
                  <input
                    type="text"
                    value={ppatData.pbb?.taxYear || String(new Date().getFullYear())}
                    onChange={(e) => handleUpdatePbb({ taxYear: e.target.value })}
                    placeholder="Tahun SPPT"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">NJOP Tanah (Rp / m²)</label>
                  <input
                    type="number"
                    value={ppatData.pbb?.njopLand || ''}
                    onChange={(e) => handleUpdatePbb({ njopLand: Number(e.target.value) })}
                    placeholder="NJOP Tanah per m2"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">NJOP Bangunan (Rp / m²)</label>
                  <input
                    type="number"
                    value={ppatData.pbb?.njopBuilding || ''}
                    onChange={(e) => handleUpdatePbb({ njopBuilding: Number(e.target.value) })}
                    placeholder="NJOP Bangunan per m2"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Total NJOP / NJOP PBB (Rp)</label>
                  <input
                    type="number"
                    value={ppatData.pbb?.totalNjop || ppatData.pbb?.njop || ''}
                    onChange={(e) => handleUpdatePbb({ 
                      totalNjop: Number(e.target.value),
                      njop: Number(e.target.value)
                    })}
                    placeholder="Total NJOP"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Catatan PBB / Bukti Lunas STTS</label>
                  <input
                    type="text"
                    value={ppatData.pbb?.notes || ''}
                    onChange={(e) => handleUpdatePbb({ notes: e.target.value })}
                    placeholder="Catatan tunggakan / status lunas PBB..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DATA LETAK OBJEK */}
        {activeTab === 'propertyLocation' && (
          <div className="space-y-6">
            <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="border-b border-slate-200 pb-2.5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  DATA LETAK OBJEK TRANSAKSI
                </h4>
                <p className="text-[11px] text-slate-500">
                  Rincian alamat fisik, lokasi administratif desa/kecamatan, dan peruntukan tanah.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Alamat / Jalan / Blok / No *</label>
                  <input
                    type="text"
                    value={ppatData.propertyLocation?.address || ''}
                    onChange={(e) => handleUpdateLocation({ address: e.target.value })}
                    placeholder="Contoh: KO. PPR ITB BL. L"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">RT / RW</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ppatData.propertyLocation?.rt || ''}
                      onChange={(e) => handleUpdateLocation({ rt: e.target.value })}
                      placeholder="RT (002)"
                      className="w-1/2 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={ppatData.propertyLocation?.rw || ''}
                      onChange={(e) => handleUpdateLocation({ rw: e.target.value })}
                      placeholder="RW (007)"
                      className="w-1/2 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Desa / Kelurahan *</label>
                  <input
                    type="text"
                    value={ppatData.propertyLocation?.village || ''}
                    onChange={(e) => handleUpdateLocation({ village: e.target.value })}
                    placeholder="Nama Desa / Kelurahan"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Kecamatan *</label>
                  <input
                    type="text"
                    value={ppatData.propertyLocation?.district || ''}
                    onChange={(e) => handleUpdateLocation({ district: e.target.value })}
                    placeholder="Nama Kecamatan"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Kabupaten / Kota *</label>
                  <input
                    type="text"
                    value={ppatData.propertyLocation?.city || 'Bandung Barat'}
                    onChange={(e) => handleUpdateLocation({ city: e.target.value })}
                    placeholder="Kabupaten Bandung Barat / Kota Bandung"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Provinsi</label>
                  <input
                    type="text"
                    value={ppatData.propertyLocation?.province || 'Jawa Barat'}
                    onChange={(e) => handleUpdateLocation({ province: e.target.value })}
                    placeholder="Jawa Barat"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Persil (Girik/Warkah)</label>
                  <input
                    type="text"
                    value={ppatData.propertyLocation?.persil || ''}
                    onChange={(e) => handleUpdateLocation({ persil: e.target.value })}
                    placeholder="Nomor Persil"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Kohir (Girik/Warkah)</label>
                  <input
                    type="text"
                    value={ppatData.propertyLocation?.kohir || ''}
                    onChange={(e) => handleUpdateLocation({ kohir: e.target.value })}
                    placeholder="Nomor Kohir"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Kategori Peruntukan Tanah</label>
                  <select
                    value={ppatData.propertyLocation?.landUseType || 'non_pertanian'}
                    onChange={(e) => handleUpdateLocation({ landUseType: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="non_pertanian">Non Pertanian (Perumahan/Pekarangan/Dsb)</option>
                    <option value="pertanian">Pertanian (Sawah/Ladang/Perkebunan)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Penggunaan Tanah Spesifik</label>
                  <input
                    type="text"
                    value={ppatData.propertyLocation?.landUse || 'TANAH KOSONG'}
                    onChange={(e) => handleUpdateLocation({ landUse: e.target.value })}
                    placeholder="TANAH KOSONG / RUMAH TINGGAL / RUHO"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 uppercase font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Luas Bangunan (m²)</label>
                  <input
                    type="number"
                    value={ppatData.propertyLocation?.buildingArea || ''}
                    onChange={(e) => handleUpdateLocation({ buildingArea: Number(e.target.value) })}
                    placeholder="Luas Bangunan m2"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>

                {/* GENERATED FORMAT ALAMAT AKTA DISPLAY */}
                <div className="sm:col-span-2 lg:col-span-3 bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 space-y-1">
                  <span className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wide block">
                    Format Alamat Akta (Preview Generated):
                  </span>
                  <p className="text-xs font-semibold text-slate-800 bg-white p-2.5 rounded-lg border border-indigo-100 shadow-2xs font-mono">
                    {formatFullObjectLocationString(ppatData.propertyLocation) || <span className="text-slate-400 italic font-sans">Lengkapi alamat objek di atas...</span>}
                  </p>
                  <p className="text-[10px] text-indigo-700">
                    * Format di atas dihasilkan secara otomatis dari field letak objek dan akan dimasukkan ke dalam klausul akta/surat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DATA TRANSAKSI */}
        {activeTab === 'transaction' && (
          <div className="space-y-6">
            <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="border-b border-slate-200 pb-2.5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  DATA TRANSAKSI PPAT
                </h4>
                <p className="text-[11px] text-slate-500">
                  Status transaksi, tanggal perolehan, dan nilai transaksi (disimpan dalam bentuk numerik).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Status Transaksi PPAT *</label>
                  <select
                    value={ppatData.transaction?.transactionStatus || 'telah'}
                    onChange={(e) => handleUpdateTransaction({ transactionStatus: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="telah">Telah Melakukan Transaksi (Lunas)</option>
                    <option value="akan">Akan Melakukan Transaksi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Tanggal Transaksi / Perolehan</label>
                  <input
                    type="date"
                    value={ppatData.transaction?.transactionDate || ''}
                    onChange={(e) => handleUpdateTransaction({ transactionDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Nilai Transaksi / Perolehan (Angka IDR) *</label>
                  <input
                    type="number"
                    value={ppatData.transaction?.transactionValue || ''}
                    onChange={(e) => handleUpdateTransaction({ transactionValue: Number(e.target.value) })}
                    placeholder="Masukkan angka contoh: 1500000000"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Metode / Cara Pembayaran</label>
                  <input
                    type="text"
                    value={ppatData.transaction?.paymentMethod || 'Tunai'}
                    onChange={(e) => handleUpdateTransaction({ paymentMethod: e.target.value })}
                    placeholder="Tunai / Transfer Bank / KPR / Bertahap"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Keterangan Transaksi</label>
                  <input
                    type="text"
                    value={ppatData.transaction?.notes || ''}
                    onChange={(e) => handleUpdateTransaction({ notes: e.target.value })}
                    placeholder="Catatan pembayaran / kwitansi..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* FORMAT DISPLAY PREVIEW: RUPIAH & TERBILANG */}
                <div className="sm:col-span-2 lg:col-span-3 bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                  <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wide block">
                    Tampilan Output Format Dokumen:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-emerald-100 shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Format Angka Rupiah:</span>
                      <span className="text-sm font-extrabold text-emerald-700 font-mono">
                        {formatRupiah(ppatData.transaction?.transactionValue || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Format Terbilang:</span>
                      <span className="text-xs font-bold text-slate-800 capitalize italic">
                        ({terbilang(ppatData.transaction?.transactionValue || 0)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: DATA AKTA PPAT */}
        {activeTab === 'akta' && (
          <div className="space-y-6">
            <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="border-b border-slate-200 pb-2.5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-amber-600" />
                  DATA AKTA PPAT
                </h4>
                <p className="text-[11px] text-slate-500">
                  Rincian jenis, nomor, tahun, dan tanggal Akta PPAT yang menjadi rujukan utama seluruh dokumen proyek.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700">Jenis Akta PPAT *</label>
                  <select
                    value={ppatData.akta?.jenisAkta || ppatData.transactionType || 'Akta Jual Beli (AJB)'}
                    onChange={(e) => handleUpdateAkta({ jenisAkta: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-bold text-slate-800"
                  >
                    {PPAT_TRANSACTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Nomor Akta *</label>
                  <input
                    type="text"
                    value={ppatData.akta?.nomorAkta || ppatData.nomorAkta || ''}
                    onChange={(e) => handleUpdateAkta({ nomorAkta: e.target.value })}
                    placeholder="Contoh: 01"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Tahun Akta *</label>
                  <input
                    type="text"
                    value={ppatData.akta?.tahunAkta || ppatData.tahunAkta || String(new Date().getFullYear())}
                    onChange={(e) => handleUpdateAkta({ tahunAkta: e.target.value })}
                    placeholder="2026"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Tanggal Akta</label>
                  <input
                    type="date"
                    value={ppatData.akta?.tanggalAkta || ppatData.tanggalAkta || ''}
                    onChange={(e) => handleUpdateAkta({ tanggalAkta: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Dasar Perolehan</label>
                  <input
                    type="text"
                    value={ppatData.akta?.dasarPerolehan || ''}
                    onChange={(e) => handleUpdateAkta({ dasarPerolehan: e.target.value })}
                    placeholder="Dasar Hukum / Perolehan"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Keterangan Akta</label>
                  <input
                    type="text"
                    value={ppatData.akta?.notes || ''}
                    onChange={(e) => handleUpdateAkta({ notes: e.target.value })}
                    placeholder="Catatan khusus mengenai register akta..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: DATA BPN / PERMOHONAN */}
        {activeTab === 'bpnApplication' && (
          <div className="space-y-6">
            <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="border-b border-slate-200 pb-2.5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  DATA BPN / PERMOHONAN
                </h4>
                <p className="text-[11px] text-slate-500">
                  Kelola data permohonan Kantor Pertanahan (BPN) dan daftar lampiran berkas resmi (Lampiran 13).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Nomor Surat Kuasa</label>
                  <input
                    type="text"
                    value={ppatData.bpnApplication?.nomorSuratKuasa || ppatData.nomorSuratKuasa || ''}
                    onChange={(e) => handleUpdateBpnApplication({ nomorSuratKuasa: e.target.value })}
                    placeholder="Nomor Surat Kuasa Pengurusan"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Tanggal Surat Kuasa</label>
                  <input
                    type="date"
                    value={ppatData.bpnApplication?.tanggalSuratKuasa || ppatData.tanggalSuratKuasa || ''}
                    onChange={(e) => handleUpdateBpnApplication({ tanggalSuratKuasa: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Jenis Permohonan BPN</label>
                  <input
                    type="text"
                    value={ppatData.bpnApplication?.jenisPermohonan || ppatData.permohonanPerihal || 'Permohonan PERALIHAN HAK'}
                    onChange={(e) => handleUpdateBpnApplication({ jenisPermohonan: e.target.value })}
                    placeholder="Permohonan PERALIHAN HAK / Pengecekan / ZNT"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Nomor Permohonan</label>
                  <input
                    type="text"
                    value={ppatData.bpnApplication?.permohonanNomor || ppatData.permohonanNomor || ''}
                    onChange={(e) => handleUpdateBpnApplication({ permohonanNomor: e.target.value })}
                    placeholder="Nomor berkas permohonan"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Lokasi Kantor BPN / Wilayah</label>
                  <input
                    type="text"
                    value={ppatData.bpnApplication?.permohonanTempat || ppatData.permohonanTempat || 'Padalarang'}
                    onChange={(e) => handleUpdateBpnApplication({ permohonanTempat: e.target.value })}
                    placeholder="Padalarang / Bandung Barat"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Tanggal Permohonan</label>
                  <input
                    type="date"
                    value={ppatData.bpnApplication?.permohonanTanggal || ppatData.permohonanTanggal || ''}
                    onChange={(e) => handleUpdateBpnApplication({ permohonanTanggal: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700">Tanda Batas Fisik Objek Tanah</label>
                  <input
                    type="text"
                    value={ppatData.bpnApplication?.tandaBatas || ppatData.tandaBatas || 'PATOK'}
                    onChange={(e) => handleUpdateBpnApplication({ tandaBatas: e.target.value })}
                    placeholder="PATOK BETON BPN / TEMBOK"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-bold uppercase"
                  />
                </div>
              </div>

              {/* SECTION: DAFTAR BERKAS / LAMPIRAN (LAMPIRAN 13) */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Daftar Lampiran / Berkas Resmi (Lampiran 13 BPN)
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Lampiran berkas resmi yang diserahkan ke Kantor Pertanahan. Data sertipikat, objek, dan akta otomatis terhubung dari master data di atas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadDefaultAttachments}
                      className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all"
                    >
                      Muat Lampiran Standar BPN
                    </button>
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Lampiran</span>
                    </button>
                  </div>
                </div>

                {(!ppatData.bpnApplication?.attachments || ppatData.bpnApplication.attachments.length === 0) ? (
                  <div className="text-center py-6 bg-white border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                    Belum ada lampiran berkas yang ditambahkan. Klik "Muat Lampiran Standar BPN" untuk generate otomatis.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ppatData.bpnApplication.attachments.map((att, idx) => (
                      <div key={att.id || idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="text-[11px] font-bold w-5 text-center">{idx + 1}.</span>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveAttachment(idx, 'up')}
                              className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === (ppatData.bpnApplication?.attachments?.length || 1) - 1}
                              onClick={() => handleMoveAttachment(idx, 'down')}
                              className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 min-w-[200px] space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Nama / Jenis Lampiran *</label>
                          <input
                            type="text"
                            value={att.name}
                            onChange={(e) => handleUpdateAttachment(idx, { name: e.target.value })}
                            placeholder="Contoh: ASLI M 651/DESA MEKARWANGI atau ASLI SURAT KUASA"
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-semibold text-slate-800"
                          />
                        </div>

                        <div className="w-36 space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">No. Dokumen</label>
                          <input
                            type="text"
                            value={att.documentNumber || ''}
                            onChange={(e) => handleUpdateAttachment(idx, { documentNumber: e.target.value })}
                            placeholder="Nomor (opsional)"
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 font-mono"
                          />
                        </div>

                        <div className="w-36 space-y-0.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tanggal</label>
                          <input
                            type="date"
                            value={att.documentDate || ''}
                            onChange={(e) => handleUpdateAttachment(idx, { documentDate: e.target.value })}
                            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(idx)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                          title="Hapus lampiran ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface PartyFormCardProps {
  party: PPATParty;
  index: number;
  label: string;
  canDelete: boolean;
  onUpdate: (fields: Partial<PPATParty>) => void;
  onDelete: () => void;
}

const PartyFormCard: React.FC<PartyFormCardProps> = ({
  party,
  index,
  label,
  canDelete,
  onUpdate,
  onDelete
}) => {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700">
            {label} #{index + 1}
          </span>
          {/* Toggle Perorangan / Badan Usaha */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => onUpdate({ isLegalEntity: false })}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                !party.isLegalEntity
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Perorangan
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ isLegalEntity: true })}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                party.isLegalEntity
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Badan Hukum (PT/CV)
            </button>
          </div>
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
            title="Hapus pihak ini"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {party.isLegalEntity ? (
        /* Form Badan Usaha */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Nama Perusahaan / Badan Hukum</label>
            <input
              type="text"
              value={party.companyName || party.name || ''}
              onChange={(e) => onUpdate({ companyName: e.target.value, name: e.target.value })}
              placeholder="Contoh: PT Sumber Rezeki Makmur"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">NIB / NPWP Perusahaan</label>
            <input
              type="text"
              value={party.companyNpwp || party.companyNib || ''}
              onChange={(e) => onUpdate({ companyNpwp: e.target.value, companyNib: e.target.value })}
              placeholder="Nomor Induk Berusaha / NPWP"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Nama Penandatangan (Wakil Sah)</label>
            <input
              type="text"
              value={party.representativeName || ''}
              onChange={(e) => onUpdate({ representativeName: e.target.value })}
              placeholder="Nama Direktur / Penandatangan"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Jabatan Penandatangan</label>
            <input
              type="text"
              value={party.representativeTitle || 'Direktur'}
              onChange={(e) => onUpdate({ representativeTitle: e.target.value })}
              placeholder="Direktur Utama / Direktur / Kuasa"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Alamat Lengkap Perusahaan</label>
            <input
              type="text"
              value={party.companyAddress || party.address || ''}
              onChange={(e) => onUpdate({ companyAddress: e.target.value, address: e.target.value })}
              placeholder="Alamat kantor sesuai Akta / NIB"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      ) : (
        /* Form Perorangan */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Nama Pokok *</label>
            <input
              type="text"
              value={party.name || ''}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Nama lengkap pokok"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">
              Nama dalam KTP
            </label>
            <input
              type="text"
              value={party.ktpName || ''}
              onChange={(e) => onUpdate({ ktpName: e.target.value })}
              placeholder="Sesuai KTP (jika beda)"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">NIK / No. KTP</label>
            <input
              type="text"
              value={party.nik || ''}
              onChange={(e) => onUpdate({ nik: e.target.value })}
              placeholder="16 digit NIK KTP"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-600">Jenis Kelamin *</label>
              {getPersonHonorific(party) && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                  {getPersonHonorific(party)}
                </span>
              )}
            </div>
            <select
              value={party.jenisKelamin || 'Laki-laki'}
              onChange={(e) => onUpdate({ jenisKelamin: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-medium text-slate-800"
            >
              <option value="Laki-laki">Laki-laki (Tuan)</option>
              <option value="Perempuan">Perempuan (Nona / Nyonya)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Status Perkawinan *</label>
            <select
              value={party.statusPerkawinan || (party.hasSpouseConsent ? 'Menikah' : 'Belum Menikah')}
              onChange={(e) => onUpdate({ statusPerkawinan: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-medium text-slate-800"
            >
              <option value="Belum Menikah">Belum Menikah</option>
              <option value="Menikah">Menikah (Kawin)</option>
              <option value="Cerai Hidup">Cerai Hidup</option>
              <option value="Cerai Mati">Cerai Mati</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Tempat Lahir</label>
            <input
              type="text"
              value={party.birthPlace || ''}
              onChange={(e) => onUpdate({ birthPlace: e.target.value })}
              placeholder="Kota / Kabupaten Tempat Lahir"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Tanggal Lahir</label>
            <input
              type="date"
              value={party.birthDate || ''}
              onChange={(e) => onUpdate({ birthDate: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Pekerjaan</label>
            <input
              type="text"
              value={party.job || ''}
              onChange={(e) => onUpdate({ job: e.target.value })}
              placeholder="Swasta / PNS / Wiraswasta"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Kewarganegaraan</label>
            <input
              type="text"
              value={party.citizenship || 'Indonesia'}
              onChange={(e) => onUpdate({ citizenship: e.target.value })}
              placeholder="Indonesia"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">No. Telepon / HP</label>
            <input
              type="text"
              value={party.phone || ''}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Alamat Tempat Tinggal (KTP)</label>
            <input
              type="text"
              value={party.address || ''}
              onChange={(e) => onUpdate({ address: e.target.value })}
              placeholder="Jalan, Blok, Nomor Rumah"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">RT / RW</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={party.rt || ''}
                onChange={(e) => onUpdate({ rt: e.target.value })}
                placeholder="RT"
                className="w-1/2 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
              />
              <input
                type="text"
                value={party.rw || ''}
                onChange={(e) => onUpdate({ rw: e.target.value })}
                placeholder="RW"
                className="w-1/2 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">
              {isCityKota(party.city) ? 'Kelurahan' : 'Desa'}
            </label>
            <input
              type="text"
              value={party.village || ''}
              onChange={(e) => onUpdate({ village: e.target.value })}
              placeholder={isCityKota(party.city) ? 'Nama Kelurahan' : 'Nama Desa'}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Kecamatan</label>
            <input
              type="text"
              value={party.district || ''}
              onChange={(e) => onUpdate({ district: e.target.value })}
              placeholder="Kecamatan"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Kota / Kabupaten</label>
            <input
              type="text"
              value={party.city || 'Bandung Barat'}
              onChange={(e) => onUpdate({ city: e.target.value })}
              placeholder="Contoh: Kabupaten Bandung Barat"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Provinsi</label>
            <input
              type="text"
              value={party.province || 'Jawa Barat'}
              onChange={(e) => onUpdate({ province: e.target.value })}
              placeholder="Jawa Barat"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {formatFullPartyAddress(party) && (
            <div className="sm:col-span-2 lg:col-span-3 text-[11px] bg-amber-50/70 border border-amber-200/70 rounded-lg p-2 text-slate-700">
              <span className="font-semibold text-amber-900">Format Alamat Lengkap: </span>
              {formatFullPartyAddress(party)}
            </div>
          )}

          {/* Section: Persetujuan Suami / Istri */}
          <div className="sm:col-span-2 lg:col-span-3 mt-2 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    Persetujuan Suami / Istri (Harta Bersama / Perkawinan)
                  </span>
                  <span className="text-[11px] text-amber-700">
                    Aktifkan jika pihak ini memerlukan persetujuan pasangan sah (gono-gini)
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(party.hasSpouseConsent)}
                  onChange={(e) => onUpdate({ hasSpouseConsent: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {party.hasSpouseConsent && (
              <div className="mt-3 p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>Data Pasangan Yang Memberikan Persetujuan</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name={`spouseType_${party.id || index}`}
                        checked={party.spouseConsentType !== 'suami'}
                        onChange={() => onUpdate({ spouseConsentType: 'istri' })}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Istri Sah</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name={`spouseType_${party.id || index}`}
                        checked={party.spouseConsentType === 'suami'}
                        onChange={() => onUpdate({ spouseConsentType: 'suami' })}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Suami Sah</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Nama Lengkap Pasangan *</label>
                    <input
                      type="text"
                      value={party.spouseName || ''}
                      onChange={(e) => onUpdate({ spouseName: e.target.value })}
                      placeholder="Nama lengkap suami / istri"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">NIK Pasangan (16 Digit)</label>
                    <input
                      type="text"
                      value={party.spouseNik || ''}
                      onChange={(e) => onUpdate({ spouseNik: e.target.value })}
                      placeholder="16 Digit NIK KTP Pasangan"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Tempat Lahir</label>
                    <input
                      type="text"
                      value={party.spouseBirthPlace || ''}
                      onChange={(e) => onUpdate({ spouseBirthPlace: e.target.value })}
                      placeholder="Kota / Kabupaten Lahir"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={party.spouseBirthDate || ''}
                      onChange={(e) => onUpdate({ spouseBirthDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Pekerjaan Pasangan</label>
                    <input
                      type="text"
                      value={party.spouseJob || ''}
                      onChange={(e) => onUpdate({ spouseJob: e.target.value })}
                      placeholder="Mengurus Rumah Tangga / Swasta"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">No. Telepon / HP</label>
                    <input
                      type="text"
                      value={party.spousePhone || ''}
                      onChange={(e) => onUpdate({ spousePhone: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600">Alamat Tempat Tinggal Pasangan</label>
                      <button
                        type="button"
                        onClick={() => onUpdate({ spouseAddress: party.address || '' })}
                        className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold underline"
                      >
                        Samakan dengan Alamat KTP Utama
                      </button>
                    </div>
                    <input
                      type="text"
                      value={party.spouseAddress || ''}
                      onChange={(e) => onUpdate({ spouseAddress: e.target.value })}
                      placeholder="Alamat tempat tinggal suami / istri"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
