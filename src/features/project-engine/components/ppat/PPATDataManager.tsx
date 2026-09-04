import React, { useState } from 'react';
import { 
  Users, Building2, MapPin, Landmark, Plus, Trash2, 
  Save, CheckCircle2, AlertCircle, FileText, ChevronDown, 
  ChevronUp, Edit3, UserCheck, Shield, ArrowLeft, Calendar,
  Heart, Compass, FileCheck, ArrowUp, ArrowDown, Sparkles
} from 'lucide-react';
import { Project, PPATData, PPATParty, PPATObjectData, PPATAttachmentItem } from '../../../../domain/project/Project';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { ProjectService } from '../../../../services/ProjectService';
import { PPAT_TRANSACTION_TYPES } from '../../../../constants/appConstants';
import { formatFullPartyAddress, isCityKota, formatFullObjectAddress } from './ppatAddressUtils';

interface PPATDataManagerProps {
  project: Project;
  currentUser?: any;
  onUpdateProject?: (updated: Project) => void;
  onBack?: () => void;
}

export const PPATDataManager: React.FC<PPATDataManagerProps> = ({
  project,
  currentUser,
  onUpdateProject,
  onBack
}) => {
  // Initialize internal state from project.ppatData or default
  const [ppatData, setPpatData] = useState<PPATData>(() => {
    if (project.ppatData) {
      return {
        transactionType: project.ppatData.transactionType || project.projectType || 'Akta Jual Beli (AJB)',
        firstParties: project.ppatData.firstParties?.length > 0 ? project.ppatData.firstParties : [createDefaultParty('Pihak Pertama')],
        secondParties: project.ppatData.secondParties?.length > 0 ? project.ppatData.secondParties : [createDefaultParty('Pihak Kedua')],
        object: project.ppatData.object || createDefaultObject(),
        notes: project.ppatData.notes || '',
        nomorAkta: project.ppatData.nomorAkta || '',
        tahunAkta: project.ppatData.tahunAkta || String(new Date().getFullYear()),
        tanggalAkta: project.ppatData.tanggalAkta || '',
        nomorSuratKuasa: project.ppatData.nomorSuratKuasa || '',
        tanggalSuratKuasa: project.ppatData.tanggalSuratKuasa || '',
        permohonanNomor: project.ppatData.permohonanNomor || '',
        permohonanLampiran: project.ppatData.permohonanLampiran || '',
        permohonanPerihal: project.ppatData.permohonanPerihal || 'Permohonan PERALIHAN HAK',
        permohonanTempat: project.ppatData.permohonanTempat || 'Padalarang',
        permohonanTanggal: project.ppatData.permohonanTanggal || '',
        tandaBatas: project.ppatData.tandaBatas || 'PATOK',
        landUse: project.ppatData.landUse || 'TANAH KOSONG',
        attachments: project.ppatData.attachments || [],
        documents: project.ppatData.documents || []
      };
    }

    // Pre-populate if clientSnapshot exists
    const snap = project.clientSnapshot as any;
    const isCorporate = snap?.companyType && snap.companyType !== 'PERORANGAN';
    const initFirstParty: PPATParty = {
      id: 'party_1_' + Math.random().toString(36).substring(7),
      name: snap?.companyName || project.title || '',
      isLegalEntity: Boolean(isCorporate),
      companyName: isCorporate ? snap?.companyName : undefined,
      companyAddress: isCorporate ? (snap?.fullAddress || '') : undefined,
      companyNib: isCorporate ? (snap?.npwp || '') : undefined,
      companyNpwp: isCorporate ? (snap?.npwp || '') : undefined,
      address: snap?.fullAddress || '',
      phone: snap?.phoneNumber || '',
      rt: snap?.newAddress?.rt || snap?.oldAddress?.rt || '',
      rw: snap?.newAddress?.rw || snap?.oldAddress?.rw || '',
      village: snap?.newAddress?.kelurahan || snap?.oldAddress?.kelurahan || '',
      district: snap?.newAddress?.kecamatan || snap?.oldAddress?.kecamatan || '',
      city: snap?.domicile || 'Bandung Barat',
      representativeName: isCorporate && snap?.shareholders && snap.shareholders.length > 0
        ? snap.shareholders[0].name
        : '',
      representativeTitle: isCorporate ? 'Direktur' : ''
    };

    return {
      transactionType: project.projectType || 'Akta Jual Beli (AJB)',
      firstParties: [initFirstParty],
      secondParties: [createDefaultParty('Pihak Kedua')],
      object: createDefaultObject(),
      notes: '',
      nomorAkta: '',
      tahunAkta: String(new Date().getFullYear()),
      tanggalAkta: '',
      nomorSuratKuasa: '',
      tanggalSuratKuasa: '',
      permohonanNomor: '',
      permohonanLampiran: '1 Berkas',
      permohonanPerihal: 'Permohonan PERALIHAN HAK',
      permohonanTempat: 'Padalarang',
      permohonanTanggal: '',
      tandaBatas: 'PATOK',
      landUse: 'TANAH KOSONG',
      attachments: []
    };
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'parties' | 'object' | 'permohonan' | 'settings'>('parties');

  // Handlers for first parties
  const handleAddFirstParty = () => {
    setPpatData(prev => ({
      ...prev,
      firstParties: [...prev.firstParties, createDefaultParty(`Pihak Pertama ${prev.firstParties.length + 1}`)]
    }));
  };

  const handleUpdateFirstParty = (index: number, fields: Partial<PPATParty>) => {
    setPpatData(prev => {
      const updated = [...prev.firstParties];
      updated[index] = { ...updated[index], ...fields };
      return { ...prev, firstParties: updated };
    });
  };

  const handleRemoveFirstParty = (index: number) => {
    if (ppatData.firstParties.length <= 1) return;
    setPpatData(prev => ({
      ...prev,
      firstParties: prev.firstParties.filter((_, i) => i !== index)
    }));
  };

  // Handlers for second parties
  const handleAddSecondParty = () => {
    setPpatData(prev => ({
      ...prev,
      secondParties: [...prev.secondParties, createDefaultParty(`Pihak Kedua ${prev.secondParties.length + 1}`)]
    }));
  };

  const handleUpdateSecondParty = (index: number, fields: Partial<PPATParty>) => {
    setPpatData(prev => {
      const updated = [...prev.secondParties];
      updated[index] = { ...updated[index], ...fields };
      return { ...prev, secondParties: updated };
    });
  };

  const handleRemoveSecondParty = (index: number) => {
    if (ppatData.secondParties.length <= 1) return;
    setPpatData(prev => ({
      ...prev,
      secondParties: prev.secondParties.filter((_, i) => i !== index)
    }));
  };

  // Handlers for object data
  const handleUpdateObject = (fields: Partial<PPATObjectData>) => {
    setPpatData(prev => ({
      ...prev,
      object: { ...prev.object, ...fields }
    }));
  };

  // Handlers for dynamic attachments (Permohonan Lampiran 13)
  const handleAddAttachment = () => {
    const newAtt: PPATAttachmentItem = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(7),
      name: '',
      documentNumber: '',
      documentDate: ''
    };
    setPpatData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAtt]
    }));
  };

  const handleUpdateAttachment = (index: number, fields: Partial<PPATAttachmentItem>) => {
    setPpatData(prev => {
      const list = [...(prev.attachments || [])];
      list[index] = { ...list[index], ...fields };
      return { ...prev, attachments: list };
    });
  };

  const handleDeleteAttachment = (index: number) => {
    setPpatData(prev => {
      const list = [...(prev.attachments || [])];
      list.splice(index, 1);
      return { ...prev, attachments: list };
    });
  };

  const handleMoveAttachment = (index: number, direction: 'up' | 'down') => {
    setPpatData(prev => {
      const list = [...(prev.attachments || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, attachments: list };
    });
  };

  const handleLoadDefaultAttachments = () => {
    const certTypeDisplay = ppatData.object.certificateType ? ppatData.object.certificateType.replace("Hak ", "M ").toUpperCase() : "M";
    const certNo = ppatData.object.certificateNumber || "651";
    const rawVillage = ppatData.object.village || "MEKARWANGI";
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
        documentNumber: ppatData.nomorSuratKuasa || '',
        documentDate: ppatData.tanggalSuratKuasa || ''
      },
      {
        id: 'att_ajb_' + (Date.now() + 2),
        name: `AJB ${ppatData.nomorAkta ? `${ppatData.nomorAkta}/${ppatData.tahunAkta || new Date().getFullYear()}` : '01/2026'}`,
        documentNumber: '',
        documentDate: ppatData.tanggalAkta || ''
      }
    ];

    setPpatData(prev => ({
      ...prev,
      attachments: defaults
    }));
  };

  // Save to Firestore
  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const projectRef = doc(db, 'office_projects', project.projectId);
      const cleanData = JSON.parse(JSON.stringify(ppatData));

      await updateDoc(projectRef, {
        ppatData: cleanData,
        projectType: ppatData.transactionType,
        updatedAt: new Date()
      });

      // Add project timeline log
      try {
        await ProjectService.addTimeline(project.projectId, {
          status: 'Updated',
          title: 'Data PPAT Diperbarui',
          description: `Data para pihak dan objek transaksi (${ppatData.transactionType}) berhasil diperbarui.`,
          createdBy: currentUser?.displayName || 'Petugas PPAT'
        });
      } catch (err) {
        console.warn('Could not add timeline log', err);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);

      if (onUpdateProject) {
        onUpdateProject({
          ...project,
          ppatData: cleanData,
          projectType: ppatData.transactionType,
          updatedAt: new Date()
        });
      }
    } catch (err: any) {
      console.error('Error saving PPAT data:', err);
      setErrorMessage(err.message || 'Gagal menyimpan data PPAT.');
    } finally {
      setSaving(false);
    }
  };

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
                Data Dasar Proyek PPAT (Pihak & Objek)
              </h3>
            </div>
            <p className="text-xs text-amber-100 mt-0.5">
              Kelola data para pihak (Perorangan/Badan Hukum), data objek sertipikat, serta nilai transaksi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/30 text-white border border-emerald-300/40 px-3 py-1.5 rounded-lg animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              Tersimpan
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-amber-50 text-amber-700 font-bold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Data PPAT'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Sub-Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-6">
        <button
          onClick={() => setActiveTab('parties')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'parties'
              ? 'border-amber-500 text-amber-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Data Para Pihak</span>
          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px]">
            {ppatData.firstParties.length + ppatData.secondParties.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('object')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'object'
              ? 'border-amber-500 text-amber-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Data Objek & Transaksi</span>
          {ppatData.object.nop && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('permohonan')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'permohonan'
              ? 'border-amber-500 text-amber-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Permohonan BPN (Lampiran 13)</span>
          {ppatData.attachments && ppatData.attachments.length > 0 && (
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px]">
              {ppatData.attachments.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-amber-500 text-amber-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Jenis Peralihan Hak</span>
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

        {/* TAB 1: PARA PIHAK */}
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
                      Pihak yang mengalihkan hak atas tanah/bangunan. Dapat berupa Perorangan atau Badan Usaha (PT/CV/dsb).
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
                {ppatData.firstParties.map((party, idx) => (
                  <PartyFormCard
                    key={party.id || idx}
                    party={party}
                    index={idx}
                    label="Pihak Pertama"
                    canDelete={ppatData.firstParties.length > 1}
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
                      Pihak yang menerima peralihan hak atas tanah/bangunan. Dapat berupa Perorangan atau Badan Usaha.
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
                {ppatData.secondParties.map((party, idx) => (
                  <PartyFormCard
                    key={party.id || idx}
                    party={party}
                    index={idx}
                    label="Pihak Kedua"
                    canDelete={ppatData.secondParties.length > 1}
                    onUpdate={(fields) => handleUpdateSecondParty(idx, fields)}
                    onDelete={() => handleRemoveSecondParty(idx)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA OBJEK & TRANSAKSI */}
        {activeTab === 'object' && (
          <div className="space-y-6">
            {/* Card 1: Sertipikat & SPPT PBB */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Landmark className="w-4 h-4 text-amber-600" />
                Data Sertipikat & Objek Pajak (SPPT PBB)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nomor Objek Pajak (NOP)</label>
                  <input
                    type="text"
                    value={ppatData.object.nop || ''}
                    onChange={(e) => handleUpdateObject({ nop: e.target.value })}
                    placeholder="Contoh: 32.17.010.001.002-0003.0"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    Nomor Identifikasi Bidang (NIB)
                  </label>
                  <input
                    type="text"
                    value={ppatData.object.nib || ''}
                    onChange={(e) => handleUpdateObject({ nib: e.target.value })}
                    placeholder="Contoh: 10.08.01.05.00123"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">SPPT PBB Atas Nama</label>
                  <input
                    type="text"
                    value={ppatData.object.spptName || ''}
                    onChange={(e) => handleUpdateObject({ spptName: e.target.value })}
                    placeholder="Nama yang tercantum pada SPPT PBB"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Jenis Dokumen Kepemilikan</label>
                  <select
                    value={ppatData.object.documentType || 'SHM'}
                    onChange={(e) => handleUpdateObject({ documentType: e.target.value, certificateType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white cursor-pointer font-medium"
                  >
                    <option value="SHM">Sertifikat Hak Milik (SHM)</option>
                    <option value="HGB">Hak Guna Bangunan (HGB)</option>
                    <option value="Hak Pakai">Hak Pakai</option>
                    <option value="Hak Pengelolaan">Hak Pengelolaan (HPL)</option>
                    <option value="Girik / Letter C">Girik / Letter C / Warkah</option>
                    <option value="Lainnya">Dokumen Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nomor Sertifikat / Warkah</label>
                  <input
                    type="text"
                    value={ppatData.object.certificateNumber || ''}
                    onChange={(e) => handleUpdateObject({ certificateNumber: e.target.value })}
                    placeholder="Nomor sertifikat / bukti kepemilikan"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Luas Tanah (m²)</label>
                  <input
                    type="number"
                    value={ppatData.object.landArea || ''}
                    onChange={(e) => handleUpdateObject({ landArea: Number(e.target.value) || 0 })}
                    placeholder="Contoh: 150"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Luas Bangunan (m²)</label>
                  <input
                    type="number"
                    value={ppatData.object.buildingArea || ''}
                    onChange={(e) => handleUpdateObject({ buildingArea: Number(e.target.value) || 0 })}
                    placeholder="Contoh: 80 (0 bila tanah kosong)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Surat Ukur / Gambar Situasi */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                Data Pengukuran Tanah (Surat Ukur / Gambar Situasi)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Pilih Jenis Dokumen Pengukuran</label>
                  <select
                    value={ppatData.object.measurementDocType || 'Surat Ukur'}
                    onChange={(e) => handleUpdateObject({ measurementDocType: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white cursor-pointer font-medium text-slate-800"
                  >
                    <option value="Surat Ukur">Surat Ukur (SU)</option>
                    <option value="Gambar Situasi">Gambar Situasi (GS)</option>
                    <option value="Peta Bidang / NIB">Peta Bidang / NIB</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    Nomor {ppatData.object.measurementDocType || 'Surat Ukur'}
                  </label>
                  <input
                    type="text"
                    value={ppatData.object.measurementDocNumber || ''}
                    onChange={(e) => handleUpdateObject({ measurementDocNumber: e.target.value })}
                    placeholder="Contoh: 00123/Lembang/2023"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    Tanggal {ppatData.object.measurementDocType || 'Surat Ukur'}
                  </label>
                  <input
                    type="date"
                    value={ppatData.object.measurementDocDate || ''}
                    onChange={(e) => handleUpdateObject({ measurementDocDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:bg-white font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Lokasi & Wilayah */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Letak Tanah / Bangunan
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600">Alamat / Letak Tanah</label>
                  <input
                    type="text"
                    value={ppatData.object.location || ''}
                    onChange={(e) => handleUpdateObject({ location: e.target.value })}
                    placeholder="Jalan, Blok, Nomor"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">RT / RW</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ppatData.object.rt || ''}
                      onChange={(e) => handleUpdateObject({ rt: e.target.value })}
                      placeholder="RT"
                      className="w-1/2 px-2 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                    />
                    <input
                      type="text"
                      value={ppatData.object.rw || ''}
                      onChange={(e) => handleUpdateObject({ rw: e.target.value })}
                      placeholder="RW"
                      className="w-1/2 px-2 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    {isCityKota(ppatData.object.city) ? 'Kelurahan' : 'Desa'}
                  </label>
                  <input
                    type="text"
                    value={ppatData.object.village || ''}
                    onChange={(e) => handleUpdateObject({ village: e.target.value })}
                    placeholder={isCityKota(ppatData.object.city) ? 'Nama Kelurahan' : 'Nama Desa'}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Kecamatan</label>
                  <input
                    type="text"
                    value={ppatData.object.district || ''}
                    onChange={(e) => handleUpdateObject({ district: e.target.value })}
                    placeholder="Kecamatan"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={ppatData.object.city || 'Bandung Barat'}
                    onChange={(e) => handleUpdateObject({ city: e.target.value })}
                    placeholder="Contoh: Kabupaten Bandung Barat atau Kota Bandung"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                {formatFullObjectAddress(ppatData.object) && (
                  <div className="sm:col-span-2 lg:col-span-3 text-[11.5px] bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-slate-700">
                    <span className="font-semibold text-slate-900">Format Akta & Dokumen: </span>
                    {formatFullObjectAddress(ppatData.object)}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Persil (Bila Girik)</label>
                  <input
                    type="text"
                    value={ppatData.object.persil || ''}
                    onChange={(e) => handleUpdateObject({ persil: e.target.value })}
                    placeholder="Nomor Persil"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Kohir (Bila Girik)</label>
                  <input
                    type="text"
                    value={ppatData.object.kohir || ''}
                    onChange={(e) => handleUpdateObject({ kohir: e.target.value })}
                    placeholder="Nomor Kohir / C"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Nilai Transaksi & NJOP */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Nilai Transaksi & NJOP PBB
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Status Transaksi PPAT</label>
                  <select
                    value={ppatData.object.transactionStatus || 'telah'}
                    onChange={(e) => handleUpdateObject({ transactionStatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:bg-white font-semibold text-slate-800 bg-white"
                  >
                    <option value="telah">Telah Melakukan Transaksi (Telah)</option>
                    <option value="akan">Akan Melakukan Transaksi (Akan)</option>
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Otomatis diterapkan pada klausul Pakta Integritas ("Kami <span className="font-bold">{ppatData.object.transactionStatus === 'akan' ? 'akan' : 'telah'}</span>...")
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tanggal Transaksi / Perolehan</label>
                  <input
                    type="date"
                    value={ppatData.object.transactionDate || ''}
                    onChange={(e) => handleUpdateObject({ transactionDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nilai NJOP PBB (Rp)</label>
                  <input
                    type="number"
                    value={ppatData.object.njop || ''}
                    onChange={(e) => handleUpdateObject({ njop: Number(e.target.value) || 0 })}
                    placeholder="Contoh: 350000000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-500">
                    Rp {(ppatData.object.njop || 0).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">
                    Nilai Transaksi / Perolehan (Rp)
                  </label>
                  <input
                    type="number"
                    value={ppatData.object.transactionValue || ''}
                    onChange={(e) => handleUpdateObject({ transactionValue: Number(e.target.value) || 0 })}
                    placeholder="Contoh: 500000000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 focus:bg-white font-semibold text-emerald-700"
                  />
                  <p className="text-[10px] font-bold text-emerald-600">
                    Rp {(ppatData.object.transactionValue || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            {/* Data Akta PPAT */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Data Akta PPAT (Akta Jual Beli / Dasar Perolehan)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Nomor Akta</label>
                  <input
                    type="text"
                    value={ppatData.nomorAkta || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, nomorAkta: e.target.value }))}
                    placeholder="Contoh: 01"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:bg-white font-semibold text-slate-900"
                  />
                  <p className="text-[10px] text-slate-500">
                    Akta Jual Beli Nomor <span className="font-bold text-slate-800">{ppatData.nomorAkta || '...'}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tahun Akta</label>
                  <input
                    type="text"
                    value={ppatData.tahunAkta || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, tahunAkta: e.target.value }))}
                    placeholder="Contoh: 2026"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:bg-white font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Tanggal Akta</label>
                  <input
                    type="date"
                    value={ppatData.tanggalAkta || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, tanggalAkta: e.target.value }))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-purple-500 focus:bg-white font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PERMOHONAN BPN (LAMPIRAN 13) */}
        {activeTab === 'permohonan' && (
          <div className="space-y-6">
            {/* Informasi Aturan Template */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <FileCheck className="w-4 h-4 text-blue-700" />
                <span>Ketentuan Pemetaan Formulir Lampiran 13 – Peralihan Hak BPN</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 text-[11px]">
                <li><strong>Pemohon Permohonan:</strong> Tetap 100% menggunakan data <strong>NENDI SUHENDI</strong> (Umur 32 Tahun, KTP 3217011507910016, Jl. Sukaresmi V No.17, Mekarwangi, Lembang, Bandung Barat, HP 08111301991).</li>
                <li><strong>Bagian &quot;Selaku Kuasa&quot;:</strong> Diisi otomatis dari <strong>Data Pembeli</strong> (Pihak Kedua) pada tab Data Para Pihak.</li>
                <li><strong>Data Tanah &amp; Sertipikat:</strong> Diisi otomatis dari <strong>Data Objek &amp; Transaksi</strong>.</li>
                <li><strong>Daftar Lampiran:</strong> Bersifat dinamis, dapat ditambah, diubah nama/nomor/tanggal, diatur urutan, atau dimuat otomatis.</li>
              </ul>
            </div>

            {/* 1. KARTU SURAT KUASA & AKTA */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Dasar Permohonan: Surat Kuasa</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Nomor Surat Kuasa</label>
                  <input
                    type="text"
                    value={ppatData.nomorSuratKuasa || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, nomorSuratKuasa: e.target.value }))}
                    placeholder="Contoh: 01/SK-PPAT/I/2026 (atau kosongkan untuk titik-titik)"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Jika dikosongkan, di dokumen akan tercetak garis titik-titik.</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600">Tanggal Surat Kuasa</label>
                    {ppatData.tanggalSuratKuasa && (
                      <button
                        type="button"
                        onClick={() => setPpatData(prev => ({ ...prev, tanggalSuratKuasa: '' }))}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold underline"
                      >
                        Kosongkan Tanggal (...)
                      </button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={ppatData.tanggalSuratKuasa || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, tanggalSuratKuasa: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Jika dikosongkan, di formulir &amp; dokumen tercetak garis titik-titik (...................................................).</p>
                </div>
              </div>
            </div>

            {/* 2. KARTU SURAT PERMOHONAN */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Header Permohonan Kantor Pertanahan</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Nomor Permohonan</label>
                  <input
                    type="text"
                    value={ppatData.permohonanNomor || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, permohonanNomor: e.target.value }))}
                    placeholder="Contoh: 12/BPN-KBB/2026 (opsional)"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Lampiran</label>
                  <input
                    type="text"
                    value={ppatData.permohonanLampiran || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, permohonanLampiran: e.target.value }))}
                    placeholder="Contoh: 1 Berkas"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Perihal</label>
                  <input
                    type="text"
                    value={ppatData.permohonanPerihal || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, permohonanPerihal: e.target.value }))}
                    placeholder="Permohonan PERALIHAN HAK"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Tempat Surat / Kantor BPN</label>
                  <input
                    type="text"
                    value={ppatData.permohonanTempat || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, permohonanTempat: e.target.value }))}
                    placeholder="Contoh: Padalarang"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Tanggal Permohonan</label>
                  <input
                    type="date"
                    value={ppatData.permohonanTanggal || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, permohonanTanggal: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Tanda Batas Tanah</label>
                  <input
                    type="text"
                    value={ppatData.tandaBatas || ''}
                    onChange={(e) => setPpatData(prev => ({ ...prev, tandaBatas: e.target.value }))}
                    placeholder="PATOK / PATOK BETON"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-3 sm:col-span-2 lg:col-span-3 pt-1">
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Penggunaan Tanah (Pilihan Coretan &amp; Uraian Berupa):
                    </label>
                    <span className="text-[10px] text-slate-500 italic">*) Coret yang tidak perlu</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPpatData(prev => ({ ...prev, landUseType: 'non_pertanian' }))}
                      className={`px-3 py-2 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                        ppatData.landUseType !== 'pertanian'
                          ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="landUseTypeMaster"
                        checked={ppatData.landUseType !== 'pertanian'}
                        onChange={() => {}}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-xs">Non Pertanian (Coret Pertanian)</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Menyoret kata "Pertanian" sehingga berlaku "Non Pertanian".
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPpatData(prev => ({ ...prev, landUseType: 'pertanian' }))}
                      className={`px-3 py-2 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                        ppatData.landUseType === 'pertanian'
                          ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="landUseTypeMaster"
                        checked={ppatData.landUseType === 'pertanian'}
                        onChange={() => {}}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-bold text-xs">Pertanian (Coret Non Pertanian)</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Menyoret kata "Non Pertanian" sehingga berlaku "Pertanian".
                        </p>
                      </div>
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Berupa (Uraian Fisik Objek):
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {[
                        'TANAH KOSONG',
                        'BANGUNAN RUMAH TINGGAL',
                        'BANGUNAN RUMAH TOKO (RUKO)',
                        'BANGUNAN GEDUNG / KANTOR',
                        'KAVLING SIAP BANGUN'
                      ].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPpatData(prev => ({ ...prev, landUse: preset }))}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                            (ppatData.landUse || 'TANAH KOSONG').toUpperCase() === preset
                              ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={ppatData.landUse || ''}
                      onChange={(e) => setPpatData(prev => ({ ...prev, landUse: e.target.value.toUpperCase() }))}
                      placeholder="Contoh: TANAH KOSONG / BANGUNAN RUMAH TINGGAL"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none font-bold uppercase"
                    />
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Hasil Cetak di Dokumen:</p>
                    <p className="text-slate-800 font-serif">
                      Penggunaan Tanah : {ppatData.landUseType === 'pertanian' ? (
                        <>Pertanian / <span className="line-through text-slate-400">Non Pertanian</span> *) berupa <strong className="uppercase">{ppatData.landUse || 'TANAH KOSONG'}</strong></>
                      ) : (
                        <><span className="line-through text-slate-400">Pertanian</span> / Non Pertanian *) berupa <strong className="uppercase">{ppatData.landUse || 'TANAH KOSONG'}</strong></>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. DAFTAR LAMPIRAN PERMOHONAN DINAMIS */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Daftar Lampiran Berkas Permohonan (Dinamis)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Berkas yang dilampirkan pada Lampiran 13. Anda dapat menambah, menghapus, mengubah, atau mengatur urutannya.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDefaultAttachments}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold transition-all shadow-xs"
                    title="Muat rekomendasi lampiran otomatis berdasarkan Sertipikat, Surat Kuasa, dan Akta Jual Beli"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Muat Rekomendasi Otomatis</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Lampiran</span>
                  </button>
                </div>
              </div>

              {(!ppatData.attachments || ppatData.attachments.length === 0) ? (
                <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 space-y-3">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Belum ada lampiran kustom yang ditambahkan.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dokumen Lampiran 13 akan menggunakan 3 rekomendasi standar (Sertipikat Asli, Surat Kuasa, AJB) atau klik tombol di bawah.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadDefaultAttachments}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Muat Rekomendasi Lampiran Standar</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {ppatData.attachments.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs flex flex-wrap items-center gap-3 transition-all"
                    >
                      <div className="flex items-center gap-1">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveAttachment(idx, 'up')}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Pindah ke atas"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (ppatData.attachments?.length || 1) - 1}
                            onClick={() => handleMoveAttachment(idx, 'down')}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                            title="Pindah ke bawah"
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
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold"
                        />
                      </div>

                      <div className="w-36 space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">No. Dokumen</label>
                        <input
                          type="text"
                          value={att.documentNumber || ''}
                          onChange={(e) => handleUpdateAttachment(idx, { documentNumber: e.target.value })}
                          placeholder="Nomor (opsional)"
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                      </div>

                      <div className="w-36 space-y-0.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tanggal</label>
                        <input
                          type="date"
                          value={att.documentDate || ''}
                          onChange={(e) => handleUpdateAttachment(idx, { documentDate: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500"
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
        )}

        {/* TAB 4: JENIS PERALIHAN HAK */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                Pilih Jenis Peralihan Hak PPAT
              </label>
              <select
                value={ppatData.transactionType}
                onChange={(e) => setPpatData(prev => ({ ...prev, transactionType: e.target.value }))}
                className="w-full max-w-xl px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              >
                {PPAT_TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-2">
                Format dokumen seperti Pakta Integritas, Surat Pernyataan, dan Akta PPAT akan secara otomatis menyesuaikan klausul dan dasar hukum sesuai jenis peralihan ini.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
                Catatan Tambahan Proyek PPAT
              </label>
              <textarea
                value={ppatData.notes || ''}
                onChange={(e) => setPpatData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Catatan mengenai riwayat warkah, kesepakatan khusus, tenggat waktu pajak, dll."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
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
                  ? 'bg-amber-500 text-white shadow-xs'
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
                  ? 'bg-blue-600 text-white shadow-xs'
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
            <label className="text-[11px] font-bold text-slate-600">Nama Lengkap (Sesuai KTP) *</label>
            <input
              type="text"
              value={party.name || ''}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Nama lengkap tanpa singkatan"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">Nomor Induk Kependudukan (NIK)</label>
            <input
              type="text"
              value={party.nik || ''}
              onChange={(e) => onUpdate({ nik: e.target.value })}
              placeholder="16 digit NIK KTP"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-amber-500 font-mono"
            />
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
              placeholder="Karyawan Swasta / Wiraswasta / PNS"
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
              placeholder="Contoh: Kabupaten Bandung Barat atau Kota Bandung"
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
              <div className="mt-3 p-3.5 bg-white rounded-xl border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>Data Pasangan Yang Memberikan Persetujuan</span>
                  </div>
                  {/* Pilihan Suami Sah / Istri Sah */}
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
                      placeholder="Mengurus Rumah Tangga / Karyawan / dll"
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

function createDefaultParty(name: string): PPATParty {
  return {
    id: 'party_' + Math.random().toString(36).substring(7),
    name: '',
    nik: '',
    birthPlace: '',
    birthDate: '',
    job: '',
    address: '',
    rt: '',
    rw: '',
    village: '',
    district: '',
    city: 'Bandung Barat',
    phone: '',
    isLegalEntity: false,
    hasSpouseConsent: false,
    spouseConsentType: 'istri',
    spouseName: '',
    spouseNik: '',
    spouseBirthPlace: '',
    spouseBirthDate: '',
    spouseJob: '',
    spouseAddress: '',
    spousePhone: ''
  };
}

function createDefaultObject(): PPATObjectData {
  return {
    nop: '',
    nib: '',
    spptName: '',
    location: '',
    rt: '',
    rw: '',
    village: '',
    district: '',
    city: 'Bandung Barat',
    documentType: 'SHM',
    certificateType: 'SHM',
    certificateNumber: '',
    measurementDocType: 'Surat Ukur',
    measurementDocNumber: '',
    measurementDocDate: '',
    landArea: 0,
    buildingArea: 0,
    njop: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    transactionValue: 0
  };
}
