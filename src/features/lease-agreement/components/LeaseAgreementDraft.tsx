import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db, cleanUndefined } from '../../../lib/firebase';
import { LeaseProjectData, LeaseParty, LeaseObject, LeasePayment } from '../types';
import { CompanyProfile } from '../../../../types';
import { 
  Users, Building, Calendar, DollarSign, CreditCard, Clock, FileText, CheckSquare, 
  Settings, HelpCircle, Eye, Printer, Plus, Trash2, Edit2, AlertCircle, Save, 
  ArrowLeft, RefreshCw, ChevronRight, X, Heart, ShieldAlert, Ban, Receipt, CheckCircle,
  Loader2, Download
} from 'lucide-react';
import { formatCurrency, formatInputNumber, parseFormattedNumber, numberToWords, formatDateIndo } from '../../../../utils/formatters';
import { generateLeaseDocx } from '../../../lib/generateLeaseDocx';

interface LeaseAgreementDraftProps {
  projectId: string;
  project: any;
  currentUser: any;
  onCancel: () => void;
}

export default function LeaseAgreementDraft({ projectId, project, currentUser, onCancel }: LeaseAgreementDraftProps) {
  const [activeTab, setActiveTab] = useState<string>('para_pihak');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [leaseData, setLeaseData] = useState<LeaseProjectData | null>(null);

  // Load clients & lease agreement draft data from Firestore
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch Master Clients (profiles)
        const profileSnap = await getDocs(collection(db, 'profiles'));
        const clientProfiles = profileSnap.docs.map(d => ({ id: d.id, ...d.data() } as CompanyProfile));
        setProfiles(clientProfiles);

        // Fetch existing Lease Agreement data from 'lease_projects'
        const leaseDocRef = doc(db, 'lease_projects', projectId);
        const leaseSnap = await getDoc(leaseDocRef);

        if (leaseSnap.exists()) {
          setLeaseData(leaseSnap.data() as LeaseProjectData);
        } else {
          // Initialize with default template data
          const initData = getInitialLeaseData(projectId);
          // If project has client, pre-populate Pihak Kedua with project's client data
          if (project && project.clientId) {
            const clientProf = clientProfiles.find(p => p.id === project.clientId);
            if (clientProf) {
              initData.parties = initData.parties.map((p, idx) => {
                if (idx === 1) { // Pihak Kedua
                  return {
                    ...p,
                    clientId: clientProf.id,
                    name: clientProf.companyName || '',
                    clientType: clientProf.clientType || clientProf.companyType || 'PERORANGAN',
                    alamat: clientProf.fullAddress || '',
                    nik: clientProf.establishmentDeedNumber || '', // default map
                    npwp: clientProf.npwp || ''
                  };
                }
                return p;
              });
            }
          }
          setLeaseData(initData);
        }
      } catch (err) {
        console.error('Error loading Lease Agreement data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, project]);

  const getInitialLeaseData = (pId: string): LeaseProjectData => ({
    id: pId,
    projectId: pId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parties: [
      {
        id: crypto.randomUUID(),
        role: 'Pihak Pertama',
        clientId: '',
        name: '',
        clientType: 'PERORANGAN',
        alamat: '',
        nik: '',
        npwp: '',
        maritalStatus: 'Belum Kawin',
        position: 'Pemilik',
        authorityBasis: 'Sertifikat Hak Milik (SHM) selaku pemilik sah',
        representative: '',
        spouseApproval: ''
      },
      {
        id: crypto.randomUUID(),
        role: 'Pihak Kedua',
        clientId: '',
        name: '',
        clientType: 'PERORANGAN',
        alamat: '',
        nik: '',
        npwp: '',
        maritalStatus: 'Belum Kawin',
        position: 'Penyewa',
        authorityBasis: 'Bertindak untuk diri sendiri',
        representative: '',
        spouseApproval: ''
      }
    ],
    leaseObject: {
      objectType: 'Bangunan',
      objectName: 'Bangunan Ruko 4 Lantai',
      alamat: '',
      landArea: '350',
      buildingArea: '1000',
      shm: '',
      nib: '',
      surveyCertificate: '',
      imb: '',
      spptPbb: '',
      ownerName: '',
      attachments: []
    },
    startDate: '',
    endDate: '',
    durationYears: 0,
    durationMonths: 0,
    durationDays: 0,
    annualPrice: 0,
    totalPrice: 0,
    depositAmount: 0,
    bankName: '',
    bankAccountNumber: '',
    bankAccountOwner: '',
    notaryFeeResponsible: 'Kedua Belah Pihak',
    payments: [],
    handoverDate: '',
    buildingCondition: 'Baik dan Layak Pakai',
    handoverNotes: '',
    firstPartyObligations: [
      'Menjamin Pihak Kedua bahwa Obyek Sewa adalah betul-betul hak milik Pihak Pertama, tidak dalam sengketa, dan bebas dari sitaan.',
      'Menyerahkan Obyek Sewa kepada Pihak Kedua dalam keadaan kosong dan bersih serta siap digunakan pada tanggal serah terima.',
      'Membantu memberikan salinan dokumen legalitas (SHM, IMB/PBG, SPPT PBB) guna kepentingan pembuatan perizinan usaha Pihak Kedua.'
    ],
    secondPartyObligations: [
      'Membayar harga sewa secara tepat waktu sesuai jadwal pembayaran yang disetujui.',
      'Memelihara Obyek Sewa dengan sebaik-baiknya atas biaya sendiri.',
      'Membayar seluruh biaya pemakaian utilitas (listrik, air, telepon, internet, iuran kebersihan/lingkungan).'
    ],
    maintenanceClauses: [
      'Pihak Kedua wajib memelihara dan memperbaiki kerusakan kecil pada obyek sewa atas biaya sendiri.',
      'Kerusakan struktural utama (kebocoran atap besar, retak konstruksi, atau kerusakan pipa utama) yang bukan kelalaian Pihak Kedua menjadi tanggung jawab Pihak Pertama.'
    ],
    allowTransfer: false,
    transferConditions: 'Pihak Kedua tidak diperbolehkan mengalihkan hak sewa baik sebagian maupun seluruhnya kepada pihak ketiga tanpa persetujuan tertulis dari Pihak Pertama.',
    terminationReasons: [
      'Pihak Kedua lalai melunasi kewajiban pembayaran sewa setelah lewat waktu yang ditentukan.',
      'Pihak Kedua menggunakan obyek sewa untuk kegiatan yang bertentangan dengan hukum dan kesusilaan.',
      'Salah satu pihak melanggar ketentuan pokok perjanjian ini dan tidak melakukan perbaikan setelah dikirimkan somasi tertulis.'
    ],
    pphAmount: 0,
    pphResponsible: 'Pihak Kedua',
    pbbResponsible: 'Pihak Kedua',
    otherTaxes: 'Pajak-pajak lainnya yang timbul di kemudian hari terkait pemanfaatan obyek sewa diselesaikan berdasarkan ketentuan hukum perpajakan.',
    hasOptionRight: true,
    optionRightSettings: 'Pihak Kedua diberikan hak opsi utama untuk memperpanjang jangka waktu sewa dengan ketentuan harga dan syarat baru yang disepakati bersama sekurang-kurangnya 3 bulan sebelum sewa berakhir.',
    returnConditions: 'Pihak Kedua wajib menyerahkan kembali obyek sewa kepada Pihak Pertama dalam keadaan kosong, bersih, terawat baik, dan seluruh tunggakan iuran utilitas telah dilunasi sepenuhnya.',
    fineAmountPerDay: 2000000,
    fineMaxAmount: 20000000,
    delayDurationLimitDays: 10,
    useForceMajeure: true,
    forceMajeureEvents: [
      'Bencana alam (gempa bumi, banjir, tanah longsor, angin puting beliung).',
      'Keadaan darurat nasional, perang, huru-hara, aksi terorisme.',
      'Perubahan regulasi pemerintah yang secara langsung menghalangi pemanfaatan obyek sewa.'
    ],
    additionalClauses: [
      'Apabila salah satu pihak meninggal dunia, perjanjian ini diteruskan oleh ahli waris sah masing-masing sampai masa sewa berakhir.',
      'Para Pihak sepakat mengesampingkan berlakunya ketentuan Pasal 1266 dan Pasal 1267 Kitab Undang-Undang Hukum Perdata.'
    ],
    disputeResolution: 'Musyawarah'
  });

  // Automatically calculate duration
  useEffect(() => {
    if (!leaseData) return;
    const { startDate, endDate } = leaseData;
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end > start) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const years = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      const months = Math.floor(remainingDays / 30);
      const days = remainingDays % 30;

      setLeaseData(prev => prev ? {
        ...prev,
        durationYears: years,
        durationMonths: months,
        durationDays: days,
        totalPrice: prev.annualPrice * (years + (months / 12) + (days / 365))
      } : null);
    }
  }, [leaseData?.startDate, leaseData?.endDate, leaseData?.annualPrice]);

  const handleSave = async () => {
    if (!leaseData) return;
    setSaving(true);
    try {
      // Save data under 'lease_projects' collection
      await setDoc(doc(db, 'lease_projects', projectId), cleanUndefined(leaseData));
      
      // Update Project list details as well (such as metadata link or status update)
      const docName = `Draft Perjanjian Sewa - ${leaseData.leaseObject.objectName || 'Obyek Sewa'}`;
      
      // Add a Document reference if it does not exist
      const existingDocs = project.documents || [];
      const hasLeaseDoc = existingDocs.some((d: any) => d.url === `/lease-draft`);
      
      if (!hasLeaseDoc) {
        await updateDoc(doc(db, 'office_projects', projectId), {
          documents: [
            ...existingDocs,
            {
              id: crypto.randomUUID(),
              name: docName,
              type: 'form',
              url: `/lease-draft`,
              refId: projectId,
              uploadedBy: currentUser.email || 'system',
              uploadedAt: new Date().toISOString()
            }
          ]
        });
      }
      
      alert('Draft Perjanjian Sewa Menyewa berhasil disimpan ke database!');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan draft perjanjian.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section: string, field: string, value: any) => {
    setLeaseData(prev => {
      if (!prev) return null;
      if (section === 'root') {
        return { ...prev, [field]: value };
      }
      return {
        ...prev,
        [section]: {
          ...(prev as any)[section],
          [field]: value
        }
      };
    });
  };

  const handlePartySelect = (partyIndex: number, clientProfileId: string) => {
    if (!leaseData) return;
    const clientProfile = profiles.find(p => p.id === clientProfileId);
    if (!clientProfile) return;

    setLeaseData(prev => {
      if (!prev) return null;
      const updatedParties = [...prev.parties];
      updatedParties[partyIndex] = {
        ...updatedParties[partyIndex],
        clientId: clientProfile.id,
        name: clientProfile.companyName || '',
        clientType: clientProfile.clientType || clientProfile.companyType || 'PERORANGAN',
        alamat: clientProfile.fullAddress || '',
        nik: clientProfile.establishmentDeedNumber || '',
        npwp: clientProfile.npwp || ''
      };
      return { ...prev, parties: updatedParties };
    });
  };

  const handleAddParty = () => {
    setLeaseData(prev => {
      if (!prev) return null;
      const newParty: LeaseParty = {
        id: crypto.randomUUID(),
        role: 'Pihak Ketiga',
        clientId: '',
        name: '',
        clientType: 'PERORANGAN',
        alamat: '',
        nik: '',
        npwp: '',
        maritalStatus: '',
        position: '',
        authorityBasis: '',
        representative: '',
        spouseApproval: ''
      };
      return { ...prev, parties: [...prev.parties, newParty] };
    });
  };

  const handleRemoveParty = (id: string) => {
    setLeaseData(prev => {
      if (!prev) return null;
      return { ...prev, parties: prev.parties.filter(p => p.id !== id) };
    });
  };

  const handleUpdatePartyField = (partyId: string, field: keyof LeaseParty, value: any) => {
    setLeaseData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        parties: prev.parties.map(p => p.id === partyId ? { ...p, [field]: value } : p)
      };
    });
  };

  const handleAddPayment = () => {
    setLeaseData(prev => {
      if (!prev) return null;
      const newPayment: LeasePayment = {
        id: crypto.randomUUID(),
        amount: 0,
        paymentDate: '',
        paymentType: 'Cicilan',
        description: ''
      };
      return { ...prev, payments: [...prev.payments, newPayment] };
    });
  };

  const handleRemovePayment = (id: string) => {
    setLeaseData(prev => {
      if (!prev) return null;
      return { ...prev, payments: prev.payments.filter(p => p.id !== id) };
    });
  };

  const handleUpdatePayment = (id: string, field: keyof LeasePayment, value: any) => {
    setLeaseData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        payments: prev.payments.map(p => p.id === id ? { ...p, [field]: value } : p)
      };
    });
  };

  const handleAddList = (listField: 'firstPartyObligations' | 'secondPartyObligations' | 'maintenanceClauses' | 'terminationReasons' | 'forceMajeureEvents' | 'additionalClauses', defaultValue: string = '') => {
    setLeaseData(prev => {
      if (!prev) return null;
      return { ...prev, [listField]: [...(prev as any)[listField], defaultValue] };
    });
  };

  const handleRemoveList = (listField: 'firstPartyObligations' | 'secondPartyObligations' | 'maintenanceClauses' | 'terminationReasons' | 'forceMajeureEvents' | 'additionalClauses', index: number) => {
    setLeaseData(prev => {
      if (!prev) return null;
      return { ...prev, [listField]: (prev as any)[listField].filter((_: any, idx: number) => idx !== index) };
    });
  };

  const handleUpdateList = (listField: 'firstPartyObligations' | 'secondPartyObligations' | 'maintenanceClauses' | 'terminationReasons' | 'forceMajeureEvents' | 'additionalClauses', index: number, value: string) => {
    setLeaseData(prev => {
      if (!prev) return null;
      const newList = [...(prev as any)[listField]];
      newList[index] = value;
      return { ...prev, [listField]: newList };
    });
  };

  if (loading || !leaseData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl shadow-xs">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-slate-400 text-[13px] mt-2">Menyiapkan form draft Sewa Menyewa...</span>
      </div>
    );
  }

  // Define tabs metadata
  const tabs = [
    { id: 'para_pihak', label: 'Para Pihak', icon: Users, color: 'text-blue-500 bg-blue-50 border-blue-100' },
    { id: 'obyek_sewa', label: 'Obyek Sewa', icon: Building, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
    { id: 'pasal2', label: 'Pasal 2 - Jangka Waktu', icon: Calendar, color: 'text-purple-500 bg-purple-50 border-purple-100' },
    { id: 'pasal3', label: 'Pasal 3 - Harga', icon: DollarSign, color: 'text-amber-500 bg-amber-50 border-amber-100' },
    { id: 'pasal4', label: 'Pasal 4 - Pembayaran', icon: CreditCard, color: 'text-rose-500 bg-rose-50 border-rose-100' },
    { id: 'pasal5', label: 'Pasal 5 - Serah Terima', icon: Clock, color: 'text-teal-500 bg-teal-50 border-teal-100' },
    { id: 'pasal6', label: 'Pasal 6 - Kewajiban Pihak I', icon: CheckSquare, color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
    { id: 'pasal7', label: 'Pasal 7 - Kewajiban Pihak II', icon: CheckSquare, color: 'text-sky-500 bg-sky-50 border-sky-100' },
    { id: 'pasal8', label: 'Pasal 8 - Pemeliharaan', icon: Settings, color: 'text-pink-500 bg-pink-50 border-pink-100' },
    { id: 'pasal9', label: 'Pasal 9 - Pengalihan Hak', icon: ChevronRight, color: 'text-cyan-500 bg-cyan-50 border-cyan-100' },
    { id: 'pasal10', label: 'Pasal 10 - Pemutusan', icon: ShieldAlert, color: 'text-red-500 bg-red-50 border-red-100' },
    { id: 'pasal11', label: 'Pasal 11 - Pajak', icon: Receipt, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
    { id: 'pasal12', label: 'Pasal 12 - Hak Opsi', icon: Plus, color: 'text-orange-500 bg-orange-50 border-orange-100' },
    { id: 'pasal13', label: 'Pasal 13 - Penyerahan', icon: FileText, color: 'text-slate-500 bg-slate-50 border-slate-100' },
    { id: 'pasal14', label: 'Pasal 14 - Denda', icon: ShieldAlert, color: 'text-red-600 bg-red-50 border-red-100' },
    { id: 'pasal15', label: 'Pasal 15 - Force Majeure', icon: Ban, color: 'text-zinc-500 bg-zinc-50 border-zinc-100' },
    { id: 'pasal16', label: 'Pasal 16 - Ketentuan Lain', icon: Plus, color: 'text-gray-600 bg-gray-50 border-gray-100' },
    { id: 'pasal17', label: 'Pasal 17 - Perselisihan', icon: HelpCircle, color: 'text-teal-600 bg-teal-50 border-teal-100' },
    { id: 'preview', label: 'Preview Dokumen', icon: Eye, color: 'text-violet-600 bg-violet-50 border-violet-100 font-bold' }
  ];

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[650px]">
      {/* Top Banner Control */}
      <div className="bg-slate-900 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
        <div>
          <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            PROSES PENYUSUNAN DRAF AKTA PERJANJIAN SEWA MENYEWA
          </h2>
          <p className="text-[12px] text-slate-400">Kerjakan formulir dan hasilkan draft hukum yang tervalidasi secara instan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[13px] font-semibold transition-all border border-slate-700"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[13px] font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Progress</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left vertical navigation tabs panel */}
        <div className="lg:w-80 bg-white border-r border-slate-200 p-4 space-y-1 overflow-y-auto max-h-[650px] lg:max-h-none">
          <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase px-3 mb-2">NAVIGASI PASAL</div>
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12.5px] transition-all text-left border ${
                  isActive 
                    ? 'bg-slate-100 border-slate-200 text-slate-900 font-bold shadow-xs' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-md border ${tab.color} shrink-0`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Active Form Workspace */}
        <div className="flex-1 bg-white p-6 md:p-8 overflow-y-auto max-h-[650px] lg:max-h-[850px]">
          
          {/* Tab 1: Para Pihak */}
          {activeTab === 'para_pihak' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PARA PIHAK PERJANJIAN</h3>
                <p className="text-[12px] text-slate-500">Kelola daftar pihak penyewa dan yang menyewakan secara dinamis.</p>
              </div>

              {leaseData.parties.map((party, idx) => (
                <div key={party.id} className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4 relative">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <span className="text-[13px] font-bold text-slate-700 uppercase tracking-tight">
                        {party.role}
                      </span>
                    </div>
                    {idx >= 2 && (
                      <button
                        onClick={() => handleRemoveParty(party.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Hapus Pihak"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">PILIH DARI MASTER KLIEN</label>
                      <select
                        value={party.clientId || ''}
                        onChange={(e) => handlePartySelect(idx, e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white text-slate-800"
                      >
                        <option value="">-- Pilih dari Master Klien --</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.companyName} ({p.clientType || p.companyType || 'PT'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">ROLE AKTA</label>
                      <select
                        value={party.role}
                        onChange={(e) => handleUpdatePartyField(party.id, 'role', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white text-slate-800"
                      >
                        <option value="Pihak Pertama">Pihak Pertama (Yang Menyewakan)</option>
                        <option value="Pihak Kedua">Pihak Kedua (Penyewa)</option>
                        <option value="Pihak Ketiga">Pihak Ketiga (Opsional/Penjamin)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">NAMA PIHAK</label>
                      <input
                        type="text"
                        value={party.name}
                        onChange={(e) => handleUpdatePartyField(party.id, 'name', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                        placeholder="Contoh: NYONYA MIRA ARIYANTI"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">JENIS KLIEN</label>
                      <select
                        value={party.clientType}
                        onChange={(e) => handleUpdatePartyField(party.id, 'clientType', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="PERORANGAN">Perorangan</option>
                        <option value="PT">Perseroan Terbatas (PT)</option>
                        <option value="CV">Persekutuan Komanditer (CV)</option>
                        <option value="YAYASAN">Yayasan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">NIK / NOMOR IDENTITAS</label>
                      <input
                        type="text"
                        value={party.nik}
                        onChange={(e) => handleUpdatePartyField(party.id, 'nik', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                        placeholder="NIK KTP 16 Digit"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">NPWP</label>
                      <input
                        type="text"
                        value={party.npwp}
                        onChange={(e) => handleUpdatePartyField(party.id, 'npwp', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                        placeholder="NPWP Pihak"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">ALAMAT LENGKAP</label>
                      <textarea
                        value={party.alamat}
                        onChange={(e) => handleUpdatePartyField(party.id, 'alamat', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white h-16 resize-none"
                        placeholder="Alamat domisili KTP"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">STATUS PERKAWINAN</label>
                      <select
                        value={party.maritalStatus}
                        onChange={(e) => handleUpdatePartyField(party.id, 'maritalStatus', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="Belum Kawin">Belum Kawin</option>
                        <option value="Kawin">Kawin</option>
                        <option value="Cerai Hidup">Cerai Hidup</option>
                        <option value="Cerai Mati">Cerai Mati</option>
                        <option value="">Tidak Ditentukan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">JABATAN (JIKA BADAN HUKUM)</label>
                      <input
                        type="text"
                        value={party.position}
                        onChange={(e) => handleUpdatePartyField(party.id, 'position', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                        placeholder="Contoh: Direktur Utama"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">DASAR KEWENANGAN / REPRESENTASI</label>
                      <input
                        type="text"
                        value={party.authorityBasis}
                        onChange={(e) => handleUpdatePartyField(party.id, 'authorityBasis', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                        placeholder="Contoh: Akta Pendirian nomor 12 tanggal 10 Juni 2020"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">PERSYARATAN PERSETUJUAN PASANGAN (SUAMI/ISTRI)</label>
                      <input
                        type="text"
                        value={party.spouseApproval}
                        onChange={(e) => handleUpdatePartyField(party.id, 'spouseApproval', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                        placeholder="Contoh: Telah mendapat persetujuan suaminya, Tuan Ichwan"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddParty}
                className="w-full py-3.5 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl text-slate-400 hover:text-blue-500 text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all uppercase tracking-wider"
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Pihak Baru</span>
              </button>
            </div>
          )}

          {/* Tab 2: Obyek Sewa */}
          {activeTab === 'obyek_sewa' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">OBYEK SEWA</h3>
                <p className="text-[12px] text-slate-500">Form detail aset tanah/bangunan yang disewakan.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">JENIS OBYEK</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.objectType}
                    onChange={(e) => updateField('leaseObject', 'objectType', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Contoh: Bangunan Ruko, Rumah Tinggal, Tanah, Gudang"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NAMA / DESKRIPSI OBYEK</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.objectName}
                    onChange={(e) => updateField('leaseObject', 'objectName', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Contoh: Gedung Perkantoran 4 Lantai"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">ALAMAT LENGKAP OBYEK</label>
                  <textarea
                    value={leaseData.leaseObject.alamat}
                    onChange={(e) => updateField('leaseObject', 'alamat', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white h-16"
                    placeholder="Alamat lengkap obyek"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">LUAS TANAH (M²)</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.landArea}
                    onChange={(e) => updateField('leaseObject', 'landArea', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Contoh: 347"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">LUAS BANGUNAN (M²)</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.buildingArea}
                    onChange={(e) => updateField('leaseObject', 'buildingArea', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Contoh: 1000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NOMOR SERTIFIKAT (SHM / SHGB)</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.shm}
                    onChange={(e) => updateField('leaseObject', 'shm', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Sertifikat Hak Milik Nomor 1449/Kebonlega"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NIB</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.nib}
                    onChange={(e) => updateField('leaseObject', 'nib', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="NIB Obyek"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">SURAT UKUR NOMOR & TANGGAL</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.surveyCertificate}
                    onChange={(e) => updateField('leaseObject', 'surveyCertificate', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Nomor 1323/1995 tanggal 09-05-1995"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">IMB / PBG NOMOR & TANGGAL</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.imb}
                    onChange={(e) => updateField('leaseObject', 'imb', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Nomor IMB"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">SPPT PBB NOMOR OBJEK PAJAK (NOP)</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.spptPbb}
                    onChange={(e) => updateField('leaseObject', 'spptPbb', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Contoh: 73.040.005.003-0414.0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NAMA PEMILIK SERTIFIKAT</label>
                  <input
                    type="text"
                    value={leaseData.leaseObject.ownerName}
                    onChange={(e) => updateField('leaseObject', 'ownerName', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Tertulis dan tercatat atas nama..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Pasal 2 - Jangka Waktu */}
          {activeTab === 'pasal2' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 2 - JANGKA WAKTU SEWA</h3>
                <p className="text-[12px] text-slate-500">Tentukan periode awal dan akhir penyewaan objek.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL MULAI</label>
                  <input
                    type="date"
                    value={leaseData.startDate}
                    onChange={(e) => updateField('root', 'startDate', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL BERAKHIR</label>
                  <input
                    type="date"
                    value={leaseData.endDate}
                    onChange={(e) => updateField('root', 'endDate', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-4 space-y-2">
                <h4 className="text-[13px] font-bold text-blue-800 uppercase tracking-tight flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Kalkulasi Durasi Sewa Otomatis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                    <div className="text-xl font-black text-blue-700">{leaseData.durationYears}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Tahun</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                    <div className="text-xl font-black text-blue-700">{leaseData.durationMonths}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Bulan</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs">
                    <div className="text-xl font-black text-blue-700">{leaseData.durationDays}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Hari</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Pasal 3 - Harga */}
          {activeTab === 'pasal3' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 3 - HARGA SEWA</h3>
                <p className="text-[12px] text-slate-500">Tentukan tarif sewa tahunan dan hitung total sewa.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">HARGA SEWA PER TAHUN (RP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp.</span>
                    <input
                      type="text"
                      value={leaseData.annualPrice === 0 ? '' : formatInputNumber(leaseData.annualPrice)}
                      onChange={(e) => updateField('root', 'annualPrice', parseFormattedNumber(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                      placeholder="Contoh: 200.000.000"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-4 space-y-3">
                  <div className="flex justify-between items-center text-[13px] border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-600">LAMA SEWA</span>
                    <span className="font-mono text-slate-800 font-bold">{leaseData.durationYears} Tahun</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black pt-1">
                    <span className="text-slate-700">TOTAL HARGA SEWA</span>
                    <span className="text-emerald-600 text-base">{formatCurrency(leaseData.totalPrice)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    Terbilang: {numberToWords(leaseData.totalPrice)} Rupiah
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Pasal 4 - Pembayaran */}
          {activeTab === 'pasal4' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 4 - ALUR PEMBAYARAN & REKENING</h3>
                <p className="text-[12px] text-slate-500">Tambahkan info denda deposit, detail bank, dan cicilan dinamis.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">UANG DEPOSIT (RP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp.</span>
                    <input
                      type="text"
                      value={leaseData.depositAmount === 0 ? '' : formatInputNumber(leaseData.depositAmount)}
                      onChange={(e) => updateField('root', 'depositAmount', parseFormattedNumber(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                      placeholder="Contoh: 25.000.000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NAMA BANK PENERIMA</label>
                  <input
                    type="text"
                    value={leaseData.bankName}
                    onChange={(e) => updateField('root', 'bankName', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Contoh: Bank BCA (Bank Central Asia)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NOMOR REKENING</label>
                  <input
                    type="text"
                    value={leaseData.bankAccountNumber}
                    onChange={(e) => updateField('root', 'bankAccountNumber', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Contoh: 3461073415"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">PEMEGANG REKENING</label>
                  <input
                    type="text"
                    value={leaseData.bankAccountOwner}
                    onChange={(e) => updateField('root', 'bankAccountOwner', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Contoh: ICHWAN SUSANTO CHAHYADI"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">BIAYA NOTARIS MENJADI TANGGUNG JAWAB</label>
                  <select
                    value={leaseData.notaryFeeResponsible}
                    onChange={(e) => updateField('root', 'notaryFeeResponsible', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Pihak Pertama">Pihak Pertama (Yang Menyewakan)</option>
                    <option value="Pihak Kedua">Pihak Kedua (Penyewa)</option>
                    <option value="Kedua Belah Pihak">Kedua Belah Pihak (Proporsional / Setengah-Setengah)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Payments Schedule list */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-[13px] font-bold text-slate-700 uppercase">Jadwal / Rincian Cicilan Pembayaran</h4>
                  <button
                    onClick={handleAddPayment}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    TAMBAH PEMBAYARAN
                  </button>
                </div>

                {leaseData.payments.map((p, idx) => (
                  <div key={p.id} className="bg-slate-50 rounded-lg border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center relative">
                    <button
                      onClick={() => handleRemovePayment(p.id)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">TANGGAL PEMBAYARAN</label>
                      <input
                        type="date"
                        value={p.paymentDate}
                        onChange={(e) => handleUpdatePayment(p.id, 'paymentDate', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">NILAI PEMBAYARAN (RP)</label>
                      <input
                        type="text"
                        value={p.amount === 0 ? '' : formatInputNumber(p.amount)}
                        onChange={(e) => handleUpdatePayment(p.id, 'amount', parseFormattedNumber(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        placeholder="Rp. 50.000.000"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">TIPE PEMBAYARAN</label>
                      <select
                        value={p.paymentType}
                        onChange={(e) => handleUpdatePayment(p.id, 'paymentType', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                      >
                        <option value="Deposit">Uang Deposit</option>
                        <option value="Cicilan">Cicilan Tahunan</option>
                        <option value="Pelunasan">Pelunasan</option>
                        <option value="Uang Muka">Uang Muka (DP)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">KETERANGAN / CATATAN</label>
                      <input
                        type="text"
                        value={p.description}
                        onChange={(e) => handleUpdatePayment(p.id, 'description', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        placeholder="Contoh: Pembayaran Cicilan I"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 6: Pasal 5 - Serah Terima */}
          {activeTab === 'pasal5' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 5 - SERAH TERIMA OBYEK</h3>
                <p className="text-[12px] text-slate-500">Tentukan tanggal penyerahan kunci, kondisi fisik, dan catatan serah terima.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">TANGGAL SERAH TERIMA</label>
                  <input
                    type="date"
                    value={leaseData.handoverDate}
                    onChange={(e) => updateField('root', 'handoverDate', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">KONDISI BANGUNAN SAAT SERAH TERIMA</label>
                  <input
                    type="text"
                    value={leaseData.buildingCondition}
                    onChange={(e) => updateField('root', 'buildingCondition', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                    placeholder="Contoh: Baik, terpelihara, dan kosong dari penghuni"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">CATATAN KHUSUS SERAH TERIMA</label>
                  <textarea
                    value={leaseData.handoverNotes}
                    onChange={(e) => updateField('root', 'handoverNotes', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white h-24"
                    placeholder="Catatan inventaris barang atau kelengkapan jika ada..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Pasal 6 - Kewajiban Pihak Pertama */}
          {activeTab === 'pasal6' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 6 - KEWAJIBAN PIHAK PERTAMA</h3>
                <p className="text-[12px] text-slate-500">Atur butir-butir kewajiban yang ditanggung oleh Pihak Pertama (Lessor).</p>
              </div>

              <div className="space-y-3">
                {leaseData.firstPartyObligations.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-slate-400 w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateList('firstPartyObligations', index, e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-[13px]"
                    />
                    <button
                      onClick={() => handleRemoveList('firstPartyObligations', index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => handleAddList('firstPartyObligations', '')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> TAMBAH KEWAJIBAN
                </button>
              </div>
            </div>
          )}

          {/* Tab 8: Pasal 7 - Kewajiban Pihak Kedua */}
          {activeTab === 'pasal7' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 7 - KEWAJIBAN PIHAK KEDUA</h3>
                <p className="text-[12px] text-slate-500">Atur butir-butir kewajiban yang harus dipenuhi oleh Pihak Kedua (Lessee).</p>
              </div>

              <div className="space-y-3">
                {leaseData.secondPartyObligations.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-slate-400 w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateList('secondPartyObligations', index, e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-[13px]"
                    />
                    <button
                      onClick={() => handleRemoveList('secondPartyObligations', index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => handleAddList('secondPartyObligations', '')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> TAMBAH KEWAJIBAN
                </button>
              </div>
            </div>
          )}

          {/* Tab 9: Pasal 8 - Pemeliharaan */}
          {activeTab === 'pasal8' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 8 - PEMELIHARAAN OBYEK</h3>
                <p className="text-[12px] text-slate-500">Atur pembagian tanggung jawab pemeliharaan bangunan dan kerusakan.</p>
              </div>

              <div className="space-y-3">
                {leaseData.maintenanceClauses.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-slate-400 w-6">{index + 1}.</span>
                    <textarea
                      value={item}
                      onChange={(e) => handleUpdateList('maintenanceClauses', index, e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-[13px] h-16 resize-none"
                    />
                    <button
                      onClick={() => handleRemoveList('maintenanceClauses', index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => handleAddList('maintenanceClauses', '')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> TAMBAH KLAUSUL PEMELIHARAAN
                </button>
              </div>
            </div>
          )}

          {/* Tab 10: Pasal 9 - Pengalihan Hak */}
          {activeTab === 'pasal9' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 9 - PENGALIHAN HAK</h3>
                <p className="text-[12px] text-slate-500">Atur perizinan pengalihan sewa ke pihak lain (sublease).</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="allowTransfer"
                    checked={leaseData.allowTransfer}
                    onChange={(e) => updateField('root', 'allowTransfer', e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="allowTransfer" className="text-[13px] font-bold text-slate-700 select-none cursor-pointer uppercase">
                    Izinkan Pengalihan Hak Sewa (Sublease)
                  </label>
                </div>

                {leaseData.allowTransfer && (
                  <div className="space-y-1 transition-all animate-[fadeIn_0.2s_ease-out]">
                    <label className="block text-xs font-bold text-slate-500 mb-1">KETENTUAN / SYARAT TAMBAHAN PENGALIHAN HAK</label>
                    <textarea
                      value={leaseData.transferConditions}
                      onChange={(e) => updateField('root', 'transferConditions', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] h-32"
                      placeholder="Tuliskan syarat tambahan pengalihan sewa..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 11: Pasal 10 - Pemutusan */}
          {activeTab === 'pasal10' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 10 - PEMUTUSAN SEBELUM JANGKA BERAKHIR</h3>
                <p className="text-[12px] text-slate-500">Tentukan alasan-alasan syah pemutusan perjanjian.</p>
              </div>

              <div className="space-y-3">
                {leaseData.terminationReasons.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <span className="text-xs font-bold text-slate-400 w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleUpdateList('terminationReasons', index, e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-[13px]"
                    />
                    <button
                      onClick={() => handleRemoveList('terminationReasons', index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => handleAddList('terminationReasons', '')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> TAMBAH ALASAN PEMUTUSAN
                </button>
              </div>
            </div>
          )}

          {/* Tab 12: Pasal 11 - Pajak */}
          {activeTab === 'pasal11' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 11 - TANGGUNG JAWAB PAJAK</h3>
                <p className="text-[12px] text-slate-500">Form pengalihan PPh sewa, PBB objek, dan beban pajak lainnya.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">PAJAK PBB DITANGGUNG OLEH</label>
                  <select
                    value={leaseData.pbbResponsible}
                    onChange={(e) => updateField('root', 'pbbResponsible', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Pihak Pertama">Pihak Pertama (Lessor)</option>
                    <option value="Pihak Kedua">Pihak Kedua (Lessee)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">PAJAK PPH DITANGGUNG OLEH</label>
                  <select
                    value={leaseData.pphResponsible}
                    onChange={(e) => updateField('root', 'pphResponsible', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Pihak Pertama">Pihak Pertama (Lessor)</option>
                    <option value="Pihak Kedua">Pihak Kedua (Lessee)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">ESTIMASI NOMINAL PPH (RP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp.</span>
                    <input
                      type="text"
                      value={leaseData.pphAmount === 0 ? '' : formatInputNumber(leaseData.pphAmount)}
                      onChange={(e) => updateField('root', 'pphAmount', parseFormattedNumber(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-[13px]"
                      placeholder="Contoh: 20.000.000"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">PAJAK-PAJAK LAINNYA</label>
                  <textarea
                    value={leaseData.otherTaxes}
                    onChange={(e) => updateField('root', 'otherTaxes', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] h-20"
                    placeholder="Ketentuan PPN atau retribusi lainnya..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 13: Pasal 12 - Hak Opsi */}
          {activeTab === 'pasal12' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 12 - HAK OPSI PERPANJANGAN</h3>
                <p className="text-[12px] text-slate-500">Atur hak opsi Pihak Kedua untuk menyewa kembali obyek sewa.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="hasOptionRight"
                    checked={leaseData.hasOptionRight}
                    onChange={(e) => updateField('root', 'hasOptionRight', e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="hasOptionRight" className="text-[13px] font-bold text-slate-700 select-none cursor-pointer uppercase">
                    Gunakan Hak Opsi Sewa Kembali
                  </label>
                </div>

                {leaseData.hasOptionRight && (
                  <div className="space-y-1 transition-all animate-[fadeIn_0.2s_ease-out]">
                    <label className="block text-xs font-bold text-slate-500 mb-1">KETENTUAN / PENGATURAN HAK OPSI</label>
                    <textarea
                      value={leaseData.optionRightSettings}
                      onChange={(e) => updateField('root', 'optionRightSettings', e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] h-32"
                      placeholder="Ketentuan pengajuan perpanjangan sewa..."
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 14: Pasal 13 - Penyerahan Kembali */}
          {activeTab === 'pasal13' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 13 - PENYERAHAN KEMBALI DI AKHIR SEWA</h3>
                <p className="text-[12px] text-slate-500">Form penyerahan kembali kunci dan pengosongan gedung.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">KETENTUAN PENYERAHAN KEMBALI</label>
                <textarea
                  value={leaseData.returnConditions}
                  onChange={(e) => updateField('root', 'returnConditions', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] h-48"
                  placeholder="Klausul penyerahan kembali obyek sewa..."
                />
              </div>
            </div>
          )}

          {/* Tab 15: Pasal 14 - Denda */}
          {activeTab === 'pasal14' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 14 - DENDA KETERLAMBATAN PENYERAHAN</h3>
                <p className="text-[12px] text-slate-500">Tentukan tarif denda harian apabila penyewa lalai mengosongkan aset.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">NOMINAL DENDA HARIAN (RP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp.</span>
                    <input
                      type="text"
                      value={leaseData.fineAmountPerDay === 0 ? '' : formatInputNumber(leaseData.fineAmountPerDay)}
                      onChange={(e) => updateField('root', 'fineAmountPerDay', parseFormattedNumber(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-[13px]"
                      placeholder="Contoh: 2.000.000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">MAKSIMAL DENDA (RP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp.</span>
                    <input
                      type="text"
                      value={leaseData.fineMaxAmount === 0 ? '' : formatInputNumber(leaseData.fineMaxAmount)}
                      onChange={(e) => updateField('root', 'fineMaxAmount', parseFormattedNumber(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-[13px]"
                      placeholder="Contoh: 20.000.000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">MAKSIMAL KETERLAMBATAN (HARI)</label>
                  <input
                    type="number"
                    value={leaseData.delayDurationLimitDays}
                    onChange={(e) => updateField('root', 'delayDurationLimitDays', parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px]"
                    placeholder="Contoh: 10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 16: Pasal 15 - Force Majeure */}
          {activeTab === 'pasal15' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 15 - FORCE MAJEURE</h3>
                <p className="text-[12px] text-slate-500">Atur keadaan kahar / darurat yang membebaskan denda.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="useForceMajeure"
                    checked={leaseData.useForceMajeure}
                    onChange={(e) => updateField('root', 'useForceMajeure', e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="useForceMajeure" className="text-[13px] font-bold text-slate-700 select-none cursor-pointer uppercase">
                    Gunakan Keadaan Force Majeure
                  </label>
                </div>

                {leaseData.useForceMajeure && (
                  <div className="space-y-3 transition-all animate-[fadeIn_0.2s_ease-out]">
                    <label className="block text-xs font-bold text-slate-500 mb-1">DAFTAR KEADAAN KAHAR</label>
                    {leaseData.forceMajeureEvents.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <span className="text-xs font-bold text-slate-400 w-6">{index + 1}.</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => handleUpdateList('forceMajeureEvents', index, e.target.value)}
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-[13px]"
                        />
                        <button
                          onClick={() => handleRemoveList('forceMajeureEvents', index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => handleAddList('forceMajeureEvents', '')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> TAMBAH KEADAAN KAHAR
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 17: Pasal 16 - Ketentuan Lain */}
          {activeTab === 'pasal16' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 16 - KETENTUAN LAIN-LAIN</h3>
                <p className="text-[12px] text-slate-500">Tambahkan klausul tambahan bebas menggunakan butir-butir dinamis.</p>
              </div>

              <div className="space-y-3">
                {leaseData.additionalClauses.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <span className="text-xs font-bold text-slate-400 w-6 pt-2">{index + 1}.</span>
                    <textarea
                      value={item}
                      onChange={(e) => handleUpdateList('additionalClauses', index, e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-[13px] h-16 resize-none"
                    />
                    <button
                      onClick={() => handleRemoveList('additionalClauses', index)}
                      className="text-red-500 hover:text-red-700 p-1 pt-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => handleAddList('additionalClauses', '')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> TAMBAH KLAUSUL TAMBAHAN
                </button>
              </div>
            </div>
          )}

          {/* Tab 18: Pasal 17 - Penyelesaian Perselisihan */}
          {activeTab === 'pasal17' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-bold text-slate-800 uppercase">PASAL 17 - PENYELSAIAN SENGKETA</h3>
                <p className="text-[12px] text-slate-500">Pilih yurisdiksi penyelesaian apabila terjadi sengketa.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">METODE PENYELESAIAN</label>
                <select
                  value={leaseData.disputeResolution}
                  onChange={(e) => updateField('root', 'disputeResolution', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Musyawarah">Musyawarah untuk mufakat</option>
                  <option value="Pengadilan Negeri">Yurisdiksi Kantor Panitera Pengadilan Negeri Bale Bandung</option>
                  <option value="Arbitrase">Arbitrase (BANI)</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab 19: Preview Dokumen */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-800 uppercase">PREVIEW DRAFT PERJANJIAN</h3>
                  <p className="text-[12px] text-slate-500">Format akta otentik notaris hasil susunan pasal otomatis.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateLeaseDocx(leaseData)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Generate & Unduh Word (.docx)</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak / PDF</span>
                  </button>
                </div>
              </div>

              {/* Legal Authentic preview draft box */}
              <div className="bg-white border border-slate-300 rounded-lg p-10 font-mono text-[12px] leading-relaxed text-slate-900 shadow-md max-w-3xl mx-auto space-y-6 select-text overflow-x-auto print:border-none print:shadow-none print:p-0">
                <div className="text-center font-bold uppercase tracking-wide">
                  PERJANJIAN SEWA MENYEWA
                  <br />
                  Nomor : [Draf Akta]
                </div>

                <div className="space-y-4 text-justify">
                  <p>
                    Pada hari ini, ___________, Tanggal ______________, Pukul ___________ WIB.
                    <br />
                    Berhadapan dengan saya, <b>NUKANTINI PUTRI PARINCHA, Sarjana Hukum, Magister Kenotariatan</b>, Notaris di Kabupaten Bandung Barat, dengan dihadiri oleh saksi-saksi...
                  </p>

                  {leaseData.parties.map((p, idx) => (
                    <div key={p.id} className="pl-4">
                      <p>
                        <b>{idx === 0 ? 'PIHAK PERTAMA' : idx === 1 ? 'PIHAK KEDUA' : `PIHAK KETIGA (${p.role})`}:</b>
                        <br />
                        Nama: {p.name || '____________'} ({p.clientType})
                        <br />
                        Alamat: {p.alamat || '____________'}
                        <br />
                        NIK: {p.nik || '____________'} | NPWP: {p.npwp || '____________'}
                        {p.maritalStatus && <><br />Status Perkawinan: {p.maritalStatus}</>}
                        {p.position && <><br />Jabatan: {p.position}</>}
                        {p.authorityBasis && <><br />Kewenangan: {p.authorityBasis}</>}
                        {p.spouseApproval && <><br />Persetujuan Pasangan: {p.spouseApproval}</>}
                      </p>
                    </div>
                  ))}

                  <p className="pt-2">
                    Para Pihak dengan ini menerangkan terlebih dahulu bahwa Pihak Pertama sepakat untuk menyewakan kepada Pihak Kedua dan Pihak Kedua sepakat untuk menerima sewa dari Pihak Pertama, selanjutnya Para Pihak sepakat untuk melangsungkan Perjanjian ini dengan syarat-syarat dan ketentuan-ketentuan sebagai berikut :
                  </p>
                </div>

                {/* Dynamic articles rendering */}
                {(() => {
                  const articles: { title: string, content: React.ReactNode }[] = [];

                  // Pasal 1 - Obyek Sewa
                  articles.push({
                    title: 'OBYEK SEWA',
                    content: (
                      <div className="space-y-2 text-justify">
                        <p>
                          Obyek Sewa yang dimaksud dalam akta Perjanjian ini adalah sebuah {leaseData.leaseObject.objectType} bernama <b>{leaseData.leaseObject.objectName}</b> dengan luas bangunan sekitar <b>{leaseData.leaseObject.buildingArea} m²</b>, berdasarkan Sertifikat Hak Milik (SHM) Nomor <b>{leaseData.leaseObject.shm || '__________'}</b> dengan luas tanah sekitar <b>{leaseData.leaseObject.landArea} m²</b>.
                        </p>
                        <p>
                          Obyek terletak di alamat: {leaseData.leaseObject.alamat || '__________'}
                          <br />
                          Nomor Identifikasi Bidang (NIB): {leaseData.leaseObject.nib || '__________'}
                          <br />
                          Surat Ukur: {leaseData.leaseObject.surveyCertificate || '__________'}
                          <br />
                          IMB/PBG: {leaseData.leaseObject.imb || '__________'}
                          <br />
                          SPPT PBB: {leaseData.leaseObject.spptPbb || '__________'}
                          <br />
                          Tercatat atas nama Pemilik: <b>{leaseData.leaseObject.ownerName || '__________'}</b>
                        </p>
                      </div>
                    )
                  });

                  // Pasal 2 - Jangka Waktu
                  articles.push({
                    title: 'JANGKA WAKTU SEWA',
                    content: (
                      <p className="text-justify">
                        Perjanjian ini dilangsungkan untuk jangka waktu <b>{leaseData.durationYears} tahun {leaseData.durationMonths} bulan</b>, yang dimulai pada tanggal <b>{leaseData.startDate ? formatDateIndo(leaseData.startDate) : '__________'}</b> dan akan berakhir pada tanggal <b>{leaseData.endDate ? formatDateIndo(leaseData.endDate) : '__________'}</b>.
                      </p>
                    )
                  });

                  // Pasal 3 - Harga
                  articles.push({
                    title: 'HARGA SEWA',
                    content: (
                      <div className="space-y-2 text-justify">
                        <p>
                          Harga sewa disepakati sebesar <b>{formatCurrency(leaseData.annualPrice)}</b> ({numberToWords(leaseData.annualPrice)} rupiah) per tahun.
                        </p>
                        <p>
                          Dengan total harga sewa untuk jangka waktu sewa keseluruhan sebesar <b>{formatCurrency(leaseData.totalPrice)}</b> ({numberToWords(leaseData.totalPrice)} rupiah).
                        </p>
                      </div>
                    )
                  });

                  // Pasal 4 - Pembayaran
                  articles.push({
                    title: 'PEMBAYARAN HARGA SEWA',
                    content: (
                      <div className="space-y-2 text-justify">
                        <p>
                          Jumlah Harga Sewa sebagaimana dimaksud dalam Pasal sebelumnya akan dibayarkan oleh Pihak Kedua kepada Pihak Pertama dengan ketentuan rincian pembayaran sebagai berikut:
                        </p>
                        {leaseData.payments.map((pm, pmIdx) => (
                          <div key={pm.id} className="pl-4">
                            - Pembayaran {pmIdx + 1} ({pm.paymentType}): Sebesar <b>{formatCurrency(pm.amount)}</b> paling lambat dibayarkan pada tanggal <b>{pm.paymentDate ? formatDateIndo(pm.paymentDate) : '__________'}</b>. ({pm.description})
                          </div>
                        ))}
                        <p className="pt-2">
                          Pihak Kedua juga memberikan uang deposit sebesar <b>{formatCurrency(leaseData.depositAmount)}</b> kepada Pihak Pertama sebagai jaminan kelalaian perbaikan aset atau tunggakan di akhir sewa.
                        </p>
                        <p>
                          Pembayaran dilakukan melalui transfer rekening ke Bank: <b>{leaseData.bankName || '__________'}</b>, Nomor Rekening: <b>{leaseData.bankAccountNumber || '__________'}</b>, atas nama: <b>{leaseData.bankAccountOwner || '__________'}</b>.
                        </p>
                        <p>
                          Pembayaran biaya jasa notaris penyusunan akta ini sepenuhnya menjadi tanggung jawab: <b>{leaseData.notaryFeeResponsible}</b>.
                        </p>
                      </div>
                    )
                  });

                  // Pasal 5 - Serah Terima
                  articles.push({
                    title: 'SERAH TERIMA OBYEK SEWA',
                    content: (
                      <div className="space-y-2 text-justify">
                        <p>
                          1) Pihak Pertama menyerahkan kunci dan Obyek Sewa kepada Pihak Kedua pada tanggal <b>{leaseData.handoverDate ? formatDateIndo(leaseData.handoverDate) : '__________'}</b> dalam keadaan {leaseData.buildingCondition}.
                        </p>
                        <p>
                          2) Pihak Kedua dengan ini menyatakan menerima penyerahan kunci obyek sewa tersebut. Catatan tambahan penyerahan: {leaseData.handoverNotes || 'Tidak ada catatan khusus.'}
                        </p>
                      </div>
                    )
                  });

                  // Pasal 6 - Kewajiban Pihak Pertama
                  articles.push({
                    title: 'KEWAJIBAN PIHAK PERTAMA',
                    content: (
                      <div className="space-y-1 text-justify">
                        {leaseData.firstPartyObligations.map((ob, obIdx) => (
                          <p key={obIdx}>({obIdx + 1}) {ob}</p>
                        ))}
                      </div>
                    )
                  });

                  // Pasal 7 - Kewajiban Pihak Kedua
                  articles.push({
                    title: 'KEWAJIBAN PIHAK KEDUA',
                    content: (
                      <div className="space-y-1 text-justify">
                        {leaseData.secondPartyObligations.map((ob, obIdx) => (
                          <p key={obIdx}>({obIdx + 1}) {ob}</p>
                        ))}
                      </div>
                    )
                  });

                  // Pasal 8 - Pemeliharaan
                  articles.push({
                    title: 'KEWAJIBAN MEMELIHARA DAN MEMPERBAIKI OBYEK SEWA',
                    content: (
                      <div className="space-y-1 text-justify">
                        {leaseData.maintenanceClauses.map((mc, mcIdx) => (
                          <p key={mcIdx}>({mcIdx + 1}) {mc}</p>
                        ))}
                      </div>
                    )
                  });

                  // Pasal 9 - Pengalihan Hak (Optional)
                  if (leaseData.allowTransfer) {
                    articles.push({
                      title: 'PENGALIHAN HAK SEWA',
                      content: (
                        <p className="text-justify">{leaseData.transferConditions}</p>
                      )
                    });
                  }

                  // Pasal 10 - Pemutusan
                  articles.push({
                    title: 'PEMUTUSAN PERJANJIAN SEWA MENYEWA',
                    content: (
                      <div className="space-y-1 text-justify">
                        {leaseData.terminationReasons.map((tr, trIdx) => (
                          <p key={trIdx}>({trIdx + 1}) {tr}</p>
                        ))}
                      </div>
                    )
                  });

                  // Pasal 11 - Pajak
                  articles.push({
                    title: 'PAJAK-PAJAK',
                    content: (
                      <div className="space-y-2 text-justify">
                        <p>
                          Pajak Bumi dan Bangunan (PBB) selama masa sewa berlangsung menjadi tanggung jawab: <b>{leaseData.pbbResponsible}</b>.
                        </p>
                        <p>
                          Pajak Penghasilan (PPh) atas sewa bangunan ini ditanggung oleh: <b>{leaseData.pphResponsible}</b> dengan nominal sebesar <b>{formatCurrency(leaseData.pphAmount)}</b>.
                        </p>
                        <p>
                          Ketentuan pajak lainnya: {leaseData.otherTaxes}
                        </p>
                      </div>
                    )
                  });

                  // Pasal 12 - Hak Opsi (Optional)
                  if (leaseData.hasOptionRight) {
                    articles.push({
                      title: 'HAK OPSI UNTUK MENYEWA KEMBALI',
                      content: (
                        <p className="text-justify">{leaseData.optionRightSettings}</p>
                      )
                    });
                  }

                  // Pasal 13 - Penyerahan Kembali
                  articles.push({
                    title: 'PENYERAHAN KEMBALI OBYEK SEWA PADA SAAT PERJANJIAN BERAKHIR',
                    content: (
                      <p className="text-justify">{leaseData.returnConditions}</p>
                    )
                  });

                  // Pasal 14 - Denda
                  articles.push({
                    title: 'DENDA PENYERAHAN OBYEK SEWA',
                    content: (
                      <div className="space-y-2 text-justify">
                        <p>
                          1) Pihak Kedua berkewajiban mengosongkan obyek sewa tepat waktu di akhir masa sewa.
                        </p>
                        <p>
                          2) Apabila terlambat melakukan pengosongan, Pihak Kedua dikenakan denda harian sebesar <b>{formatCurrency(leaseData.fineAmountPerDay)}</b> per hari keterlambatan, dengan batas akumulasi maksimal denda sebesar <b>{formatCurrency(leaseData.fineMaxAmount)}</b> atau batas keterlambatan hingga <b>{leaseData.delayDurationLimitDays} hari</b>.
                        </p>
                        <p>
                          3) Jika keterlambatan melewati batas hari yang diperbolehkan, Pihak Pertama berhak melakukan pengosongan sepihak secara sah.
                        </p>
                      </div>
                    )
                  });

                  // Pasal 15 - Force Majeure (Optional)
                  if (leaseData.useForceMajeure) {
                    articles.push({
                      title: 'FORCE MAJEUR',
                      content: (
                        <div className="space-y-1 text-justify">
                          {leaseData.forceMajeureEvents.map((fm, fmIdx) => (
                            <p key={fmIdx}>({fmIdx + 1}) {fm}</p>
                          ))}
                        </div>
                      )
                    });
                  }

                  // Pasal 16 - Ketentuan Lain
                  articles.push({
                    title: 'KETENTUAN LAIN-LAIN',
                    content: (
                      <div className="space-y-1 text-justify">
                        {leaseData.additionalClauses.map((ac, acIdx) => (
                          <p key={acIdx}>({acIdx + 1}) {ac}</p>
                        ))}
                      </div>
                    )
                  });

                  // Pasal 17 - Penyelesaian Perselisihan
                  articles.push({
                    title: 'PENYELESAIAN PERSELISIHAN',
                    content: (
                      <p className="text-justify">
                        Apabila terjadi perselisihan di antara kedua belah pihak, maka kedua belah pihak sepakat untuk menyelesaikan secara kekeluargaan atau musyawarah. Apabila tidak tercapai mufakat, maka penyelesaian sengketa diselesaikan melalui <b>{leaseData.disputeResolution}</b>.
                      </p>
                    )
                  });

                  return articles.map((art, artIdx) => (
                    <div key={artIdx} className="space-y-2">
                      <div className="text-center font-bold uppercase pt-4">
                        Pasal {artIdx + 1}
                        <br />
                        {art.title}
                      </div>
                      {art.content}
                    </div>
                  ));
                })()}

                <div className="pt-8 text-center font-bold uppercase">
                  DEMIKIANLAH AKTA INI
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
