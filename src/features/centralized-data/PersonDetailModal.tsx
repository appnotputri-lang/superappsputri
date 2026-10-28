import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  UserCheck, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Briefcase, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Loader2,
  PieChart,
  Coins,
  Globe2,
  CreditCard,
  Info
} from 'lucide-react';
import { PersonService } from '../../services/PersonService';
import { formatCurrency, formatInputNumber } from '../../../utils/formatters';

interface PersonDetailModalProps {
  person: any | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onIdentityVerified?: (updatedPerson: any) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  person,
  isOpen,
  onClose,
  currentUser,
  onIdentityVerified
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [personDetails, setPersonDetails] = useState<any | null>(null);
  const [companyRoles, setCompanyRoles] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyNotes, setVerifyNotes] = useState<string>('');
  const [showVerifyConfirm, setShowVerifyConfirm] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !person?.personId) {
      setPersonDetails(null);
      setCompanyRoles([]);
      setShowVerifyConfirm(false);
      setVerifyError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const [fullPerson, roles] = await Promise.all([
          PersonService.getPersonById(person.personId),
          PersonService.getPersonRoles(person.personId)
        ]);

        if (isMounted) {
          setPersonDetails(fullPerson || person);
          setCompanyRoles(roles || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading person detail:', err);
        if (isMounted) {
          setPersonDetails(person);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, person]);

  if (!isOpen || !person) return null;

  const currentPerson = personDetails || person;
  const isWna = currentPerson.nationalityType === 'WNA';
  const isVerified = currentPerson.identityStatus === 'VERIFIED';
  const canVerify = (currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') && !isVerified;

  // Handle identity verification by Notary/Admin
  const handleVerifyIdentity = async () => {
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const res = await PersonService.verifyIdentity(currentPerson.personId, verifyNotes);
      const updated = {
        ...currentPerson,
        identityStatus: 'VERIFIED',
        verifiedAt: res?.verifiedAt || new Date().toISOString()
      };
      setPersonDetails(updated);
      setShowVerifyConfirm(false);
      onIdentityVerified?.(updated);
    } catch (err: any) {
      setVerifyError(err?.message || 'Gagal memverifikasi identitas');
    } finally {
      setIsVerifying(false);
    }
  };

  // Ownership aggregation calculations
  const totalCompaniesCount = new Set(companyRoles.map(r => r.companyId)).size;
  const rolesWithShares = companyRoles.filter(r => r.shareCount != null && r.shareCount > 0);
  const allSharesSynced = companyRoles.length > 0 && companyRoles.every(r => r.shareCount !== null);
  
  const totalSharesSum = rolesWithShares.reduce((acc, r) => acc + Number(r.shareCount || 0), 0);
  const totalShareValueSum = rolesWithShares.reduce((acc, r) => acc + (r.shareValue != null ? Number(r.shareValue) : 0), 0);
  const hasRecordedShareValue = rolesWithShares.some(r => r.shareValue != null && r.shareValue > 0);

  // Masking helpers
  const maskDocNumber = (num?: string) => {
    if (!num) return '-';
    if (num.length <= 4) return '***';
    return `${num.slice(0, 3)}****${num.slice(-2)}`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0">
              {currentPerson.name ? currentPerson.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {currentPerson.salutation ? `${currentPerson.salutation} ` : ''}{currentPerson.name}
                </h2>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Terverifikasi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Provisional
                  </span>
                )}
                {isWna ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    <Globe2 className="w-3.5 h-3.5" />
                    WNA ({currentPerson.nationality || 'Asing'})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    WNI
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                ID: {currentPerson.personId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Memuat profil lengkap & data relasi...</p>
            </div>
          ) : (
            <>
              {/* SECTION A: Identitas Orang */}
              <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200/70 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                      Informasi Identitas & Kependudukan
                    </h3>
                  </div>
                  {canVerify && !showVerifyConfirm && (
                    <button
                      onClick={() => setShowVerifyConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Verifikasi Identitas Resmi
                    </button>
                  )}
                </div>

                {/* Verification Confirmation Box */}
                {showVerifyConfirm && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900">Verifikasi Resmi Identitas</h4>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          Tindakan ini menetapkan status identitas menjadi <b>VERIFIED</b> (Terverifikasi). Pastikan dokumen fisik KTP atau Paspor asli telah diperiksa oleh Notaris/Admin.
                        </p>
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Catatan verifikasi (opsional, misal: 'Telah dicocokkan dengan e-KTP fisik')"
                        value={verifyNotes}
                        onChange={(e) => setVerifyNotes(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    {verifyError && (
                      <p className="text-xs text-rose-600 font-medium">{verifyError}</p>
                    )}
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setShowVerifyConfirm(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/50 rounded-lg font-medium"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleVerifyIdentity}
                        disabled={isVerifying}
                        className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                      >
                        {isVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Konfirmasi Verifikasi
                      </button>
                    </div>
                  </div>
                )}

                {/* Grid Identitas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Nomor Induk Kependudukan (NIK)</span>
                    <span className="text-slate-800 font-semibold text-sm mt-0.5 block font-mono">
                      {currentPerson.nik || (isWna ? 'Tidak memiliki NIK (WNA)' : 'Belum tersedia')}
                    </span>
                  </div>

                  {isWna && (
                    <div>
                      <span className="text-slate-400 font-medium block">Nomor Paspor (WNA)</span>
                      <span className="text-slate-800 font-semibold text-sm mt-0.5 block font-mono">
                        {currentPerson.passportNumber ? maskDocNumber(currentPerson.passportNumber) : 'Belum terdata'}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 font-medium block">Kewarganegaraan</span>
                    <span className="text-slate-800 font-semibold mt-0.5 block">
                      {currentPerson.nationality || (isWna ? 'WNA' : 'INDONESIA')}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">Tempat, Tanggal Lahir</span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {[currentPerson.birthCity || currentPerson.birthPlace, currentPerson.birthDate].filter(Boolean).join(', ') || 'Belum tersedia'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">Pekerjaan</span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {currentPerson.occupation || 'Belum tersedia'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block">NPWP</span>
                    <span className="text-slate-800 font-mono mt-0.5 block">
                      {currentPerson.npwp || 'Belum terdata'}
                    </span>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <span className="text-slate-400 font-medium block">Alamat Domisili KTP/Paspor</span>
                    <span className="text-slate-800 font-medium mt-0.5 block">
                      {typeof currentPerson.address === 'string'
                        ? currentPerson.address
                        : [
                            currentPerson.address?.fullAddress,
                            currentPerson.address?.rt ? `RT ${currentPerson.address.rt}` : '',
                            currentPerson.address?.rw ? `RW ${currentPerson.address.rw}` : '',
                            currentPerson.address?.kelurahan,
                            currentPerson.address?.kecamatan,
                            currentPerson.address?.city,
                            currentPerson.address?.province,
                            currentPerson.address?.postalCode
                          ].filter(Boolean).join(', ') || 'Belum tersedia'}
                    </span>
                  </div>
                </div>

                {/* Dokumen Identitas Terdaftar */}
                {Array.isArray(currentPerson.documents) && currentPerson.documents.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/50">
                    <span className="text-xs font-semibold text-slate-600 block mb-2">
                      Dokumen Identitas Terdaftar ({currentPerson.documents.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentPerson.documents.map((doc: any, idx: number) => (
                        <div key={doc.id || idx} className="p-2.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800 block">
                              {doc.docType}: {maskDocNumber(doc.docNumber)}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              Negara: {doc.issuingCountry || 'IDN'} {doc.expiryDate ? `• Berlaku s/d: ${doc.expiryDate}` : ''}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {doc.isActive ? 'AKTIF' : 'RIWAYAT'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION B: Relasi Perusahaan & Kepemilikan Saham */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                      Relasi Perusahaan & Jabatan ({companyRoles.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    Sumber: Cloudflare D1 Role Index & Firestore Profile
                  </span>
                </div>

                {companyRoles.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Belum ada relasi badan usaha yang terdaftar untuk individu ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Badan Usaha / Perusahaan</th>
                          <th className="py-3 px-4">Bentuk</th>
                          <th className="py-3 px-4">Jabatan / Peran</th>
                          <th className="py-3 px-4 text-right">Jumlah Lembar Saham</th>
                          <th className="py-3 px-4 text-right">Nilai Saham (Rp)</th>
                          <th className="py-3 px-4 text-right">Persentase (%)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {companyRoles.map((role: any, idx: number) => {
                          const hasShareRecorded = role.shareCount !== null && role.shareCount !== undefined;
                          const hasValueRecorded = role.shareValue !== null && role.shareValue !== undefined;

                          return (
                            <tr key={role.id || idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {role.companyName}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {role.clientType || 'PT'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-700 font-medium">
                                {role.positionTitle || role.roleCategory}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {hasShareRecorded ? (
                                  `${formatInputNumber(role.shareCount)} lbr`
                                ) : (
                                  <span className="text-slate-400 italic">Belum tersinkronisasi</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-medium">
                                {hasValueRecorded ? (
                                  formatCurrency(Number(role.shareValue))
                                ) : (
                                  <span className="text-slate-400 italic">Belum tersinkronisasi</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {role.ownershipPercentage != null ? (
                                  `${Number(role.ownershipPercentage).toFixed(2)}%`
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {role.relationStatus || 'AKTIF'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION C: Ringkasan Kepemilikan & Disclaimer */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                    Ringkasan Kepemilikan Saham & Posisi
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium block">Total Badan Usaha Terkait</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-900">{totalCompaniesCount}</span>
                      <span className="text-xs text-slate-500">Perusahaan</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium block">Total Lembar Saham Tercatat</span>
                    <div className="mt-1 flex items-baseline gap-1">
                      {allSharesSynced && rolesWithShares.length > 0 ? (
                        <>
                          <span className="text-2xl font-bold text-blue-700 font-mono">
                            {formatInputNumber(totalSharesSum)}
                          </span>
                          <span className="text-xs text-slate-500">lembar</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-slate-400 italic">
                          Belum tersinkronisasi penuh
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                    <span className="text-xs text-slate-500 font-medium block">Akumulasi Nilai Nominal Saham</span>
                    <div className="mt-1">
                      {hasRecordedShareValue ? (
                        <span className="text-xl font-bold text-emerald-700 font-mono block truncate" title={formatCurrency(totalShareValueSum)}>
                          {formatCurrency(totalShareValueSum)}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-slate-400 italic">
                          Belum tersinkronisasi
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Important Audit & Legal Disclaimer */}
                <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-blue-900 text-xs leading-relaxed">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Ketentuan Validitas Data Legal:</span> Nilai nominal per lembar saham dapat berbeda pada tiap badan usaha berdasarkan Anggaran Dasar yang sah. Ringkasan di atas mencerminkan data terverifikasi yang telah tersimpan pada sistem Notaris Putri Office System.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Terakhir diperbarui: {currentPerson.updatedAt ? new Date(currentPerson.updatedAt).toLocaleString('id-ID') : '-'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
