import React from 'react';
import { Shareholder } from '../types';
import { User, Banknote, Globe, ShieldCheck, MapPin, Coins, History, Zap, Info, Briefcase, UserPlus, ArrowRightLeft, Users } from 'lucide-react';
import { formatCurrency, numberToWords, formatInputNumber, parseFormattedNumber } from '../utils/formatters';
import { IndoRegionSelector } from './AddressFields';

interface Props {
  shareholder: Shareholder;
  onChange: (updates: Partial<Shareholder>) => void;
  globalSharePrice: number;
  totalSharesAllowed: number;
  otherAllocated: number;
  existingData?: any[];
  allShareholders?: Shareholder[];
  oldSharesOwned?: number;
  hideManagement?: boolean;
  hideFinancials?: boolean;
  isOld?: boolean;
  hasTransferAgenda?: boolean;
  hasManagementAgenda?: boolean;
  hasCapitalChange?: boolean;
}

const ShareholderForm: React.FC<Props> = ({ 
  shareholder, 
  onChange, 
  globalSharePrice, 
  totalSharesAllowed,
  otherAllocated,
  existingData = [],
  allShareholders = [],
  oldSharesOwned = 0,
  hideManagement = false,
  hideFinancials = false,
  isOld = false,
  hasTransferAgenda = false,
  hasManagementAgenda = false,
  hasCapitalChange = false
}) => {
  const [showLookup, setShowLookup] = React.useState(false);
  const maxPossible = totalSharesAllowed - otherAllocated;
  
  const currentShares = shareholder.sharesOwned || 0;
  const transferAmount = Math.max(0, currentShares - oldSharesOwned);
  const isAcquisitionPossible = currentShares > oldSharesOwned || !shareholder.isExistingParty;

  // Derive disabled states
  const disableManagement = !isOld && !hasManagementAgenda;
  const disableFinancials = !isOld && !hasTransferAgenda && !hasCapitalChange;

  const handleLookupSelect = (item: any) => {
    onChange({
      ...shareholder,
      name: (item.name || '').toUpperCase(),
      salutation: item.salutation || 'Tuan',
      birthCity: item.birthCity || '',
      birthDate: item.birthDate || '',
      nationalityType: item.nationalityType || 'WNI',
      nationality: item.nationality || 'WNI',
      occupation: item.occupation || '',
      address: item.address ? { ...item.address } : {
        province: '',
        city: '',
        fullAddress: '',
        rt: '',
        rw: '',
        kelurahan: '',
        kecamatan: ''
      },
      nik: item.nik || '',
      passportNumber: item.passportNumber || '',
      managementPosition: item.position || item.managementPosition || 'Direktur',
      isManagement: item.isManagement || (item.position ? true : false),
      linkedPartyId: item.id,
      isExistingParty: true,
      sharesOwned: disableFinancials ? 0 : shareholder.sharesOwned
    });
    setShowLookup(false);
  };
  const currentTotalValue = shareholder.sharesOwned * globalSharePrice;
  const canQuickFill = totalSharesAllowed > 0 && shareholder.sharesOwned < maxPossible && !disableFinancials;
  const isWna = shareholder.nationalityType === 'WNA' || shareholder.isForeign;
  const isBadanHukum = shareholder.shareholderType === 'BADAN_HUKUM';

  const handleSharesChange = (inputValue: string) => {
    let val = parseFormattedNumber(inputValue);
    if (totalSharesAllowed === 0) {
      alert("Harap isi Jumlah Lembar Modal Disetor di tab Profil terlebih dahulu.");
      return;
    }
    if (val > maxPossible) {
      val = maxPossible;
      alert(`Batas Terlampaui! Maksimal sisa lembar yang tersedia adalah ${maxPossible.toLocaleString('id-ID')} lembar.`);
    }
    onChange({ sharesOwned: val });
  };

  const quickFillRemaining = () => {
    onChange({ sharesOwned: maxPossible });
  };

  const updateAddress = (updates: Partial<Shareholder['address']>) => {
    onChange({ address: { ...shareholder.address, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* Quick Lookup Button */}
      {existingData.length > 0 && (
        <div className="relative mb-4">
          <button 
            type="button"
            onClick={() => setShowLookup(!showLookup)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded font-bold text-xs hover:bg-amber-100 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Ambil Data dari Pengurus/Pihak Tersedia
          </button>
          
          {showLookup && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded shadow-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {existingData.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => handleLookupSelect(item)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-indigo-50 border-b border-slate-100 last:border-0 text-left"
                  >
                    <div className="p-1.5 bg-slate-100 rounded">
                      <User className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-700 truncate">{item.name || '(Tanpa Nama)'}</div>
                      <div className="text-[10px] text-slate-500 uppercase truncate">{item.position || item.managementPosition || 'PIHAK'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-red-500">Kotak isian yang bertanda * wajib diisi</p>

      <label className="flex items-center gap-2 cursor-pointer mt-4">
        <input 
          type="checkbox" 
          checked={!!shareholder.isForeign || isWna}
          onChange={e => onChange({ 
            isForeign: e.target.checked,
            nationalityType: e.target.checked ? 'WNA' : 'WNI', 
            nationality: e.target.checked ? '' : 'WNI' 
          })}
          className="rounded border-slate-300 text-teal-500 focus:ring-teal-500"
        />
        <span className="text-sm text-slate-700 font-bold">Asing</span>
      </label>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Pemegang Saham</label>
        <select 
          value={shareholder.shareholderType || 'PERORANGAN'}
          onChange={e => onChange({ shareholderType: e.target.value as any })}
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        >
          <option value="PERORANGAN">PERORANGAN</option>
          <option value="BADAN_HUKUM">BADAN HUKUM</option>
        </select>
      </div>

      {isBadanHukum && !isWna && (
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Badan Hukum</label>
          <select 
            value={shareholder.legalEntityType || 'PT Persekutuan Modal'} 
            onChange={e => onChange({ legalEntityType: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-white"
          >
            <option value="PT Persekutuan Modal">PT Persekutuan Modal</option>
            <option value="PT Perorangan">PT Perorangan</option>
            <option value="Koperasi">Koperasi</option>
            <option value="Yayasan">Yayasan</option>
            <option value="CV">CV</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">Nama <span className="text-red-500">*</span></label>
        <div className="flex gap-2">
          {!isBadanHukum && (
            <select 
              value={shareholder.salutation || 'Tuan'} 
              onChange={e => onChange({ salutation: e.target.value as any })}
              className="w-24 px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="Tuan">Tuan</option>
              <option value="Nyonya">Nyonya</option>
              <option value="Nona">Nona</option>
            </select>
          )}
          <input 
            type="text"
            value={shareholder.name || ''}
            onChange={e => onChange({ name: e.target.value.toUpperCase() })}
            className="flex-1 w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-bold"
          />
        </div>
      </div>

      {!isBadanHukum && (
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input type="checkbox" className="rounded border-slate-300 text-teal-500 focus:ring-teal-500" />
            <span className="text-sm text-slate-600">Di bawah umur</span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {isBadanHukum ? (
          isWna ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Negara <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={shareholder.foreignCountry || shareholder.nationality || ''} 
                  onChange={e => onChange({ foreignCountry: e.target.value, nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Pengesahan</label>
                <input 
                  type="text" 
                  value={shareholder.skNumber || ''} 
                  onChange={e => onChange({ skNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pengesahan</label>
                <input 
                  type="date" 
                  value={shareholder.skDate || ''} 
                  onChange={e => onChange({ skDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pihak yang Mengeluarkan</label>
                <input 
                  type="text" 
                  value={shareholder.skIssuer || ''} 
                  onChange={e => onChange({ skIssuer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor SK</label>
                <input 
                  type="text" 
                  value={shareholder.skNumber || ''} 
                  onChange={e => onChange({ skNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal SK</label>
                <input 
                  type="date" 
                  value={shareholder.skDate || ''} 
                  onChange={e => onChange({ skDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-slate-50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">NPWP <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={shareholder.npwp || ''} 
                  onChange={e => onChange({ npwp: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
            </>
          )
        ) : (
          isWna ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Negara <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={shareholder.nationality || ''} 
                  onChange={e => onChange({ nationality: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Passport <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={shareholder.passportNumber || ''} 
                  onChange={e => onChange({ passportNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Izin Tinggal (Kitas Nomor)</label>
                <input 
                  type="text" 
                  value={shareholder.kitasNumber || ''} 
                  onChange={e => onChange({ kitasNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                  placeholder="Contoh: 24E28A410488"
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Izin Tinggal</label>
                  <select 
                    value={shareholder.kitasType || 'NONE'}
                    onChange={e => onChange({ 
                      kitasType: e.target.value as any, 
                      hasKitas: e.target.value !== 'NONE' 
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="NONE">-- Opsional --</option>
                    <option value="KITAS">KITAS</option>
                    <option value="KITAP">KITAP</option>
                  </select>
                </div>
                {shareholder.kitasType && shareholder.kitasType !== 'NONE' && (
                  <div>
                     <label className="block text-xs font-bold text-slate-700 mb-1">Nomor {shareholder.kitasType}</label>
                     <input 
                      type="text" 
                      value={shareholder.kitasNumber || ''} 
                      onChange={e => onChange({ kitasNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">NIK <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={shareholder.nik || ''} 
                onChange={e => onChange({ nik: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Sebagai <span className="text-red-500">*</span></label>
          <div className="space-y-3 pl-2">
            {!hideFinancials && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  disabled={disableFinancials}
                  checked={disableFinancials ? false : (shareholder.sharesOwned > 0)} 
                  onChange={e => {
                    if (!e.target.checked) {
                      onChange({ sharesOwned: 0 });
                    } else if (shareholder.sharesOwned <= 0) {
                      onChange({ sharesOwned: 1 });
                    }
                  }}
                  className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 disabled:opacity-50"
                />
                <span className={`text-sm ${disableFinancials ? 'text-slate-400' : 'text-slate-700'}`}>Pemegang Saham</span>
              </label>
            )}
            {!hideManagement && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  disabled={disableManagement}
                  checked={shareholder.isManagement || false}
                  onChange={e => onChange({ isManagement: e.target.checked, managementPosition: e.target.checked ? (shareholder.managementPosition || 'Direktur') : undefined })}
                  className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 disabled:opacity-50"
                />
                <span className={`text-sm ${disableManagement ? 'text-slate-400' : 'text-slate-700'}`}>Direksi/Komisaris</span>
              </label>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!hideFinancials && (shareholder.sharesOwned > 0 || disableFinancials) && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Klasifikasi Saham <span className="text-red-500">*</span></label>
                <select disabled={disableFinancials} className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100 disabled:opacity-50">
                  <option>Tanpa Klasifikasi</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700">Lembar Saham <span className="text-red-500">*</span></label>
                  {canQuickFill && isOld && (
                    <button 
                      onClick={quickFillRemaining}
                      className="text-[10px] text-teal-600 hover:underline"
                    >
                      (Ambil Sisa Saldo)
                    </button>
                  )}
                </div>
                <input 
                  type="text" 
                  disabled={totalSharesAllowed === 0 || disableFinancials || !isOld}
                  value={disableFinancials ? '0' : formatInputNumber(shareholder.sharesOwned)} 
                  onChange={e => handleSharesChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm disabled:bg-slate-100 disabled:opacity-50"
                />
                {!disableFinancials && (
                <div className="mt-1 flex flex-col gap-1 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-800 font-bold italic">{formatCurrency(currentTotalValue)}</span>
                  </div>
                  {!isOld && (hasTransferAgenda || hasCapitalChange) && (
                    <div className="text-blue-600 font-medium bg-blue-50 p-1.5 rounded border border-blue-100 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Gunakan bagian <strong>Peralihan</strong> atau <strong>Setor Modal Baru</strong> di bawah untuk mengubah jumlah saham.
                    </div>
                  )}
                </div>
                )}
              </div>

              {/* Transfer Details Section */}
              {!isOld && hasTransferAgenda && !disableFinancials && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={shareholder.isAcquisition || false}
                    onChange={e => onChange({ isAcquisition: e.target.checked, acquisitionShares: e.target.checked ? shareholder.acquisitionShares : 0, sharesOwned: oldSharesOwned + (e.target.checked ? (shareholder.acquisitionShares || 0) : 0) + (shareholder.newDepositShares || 0) })}
                    className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-tight flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Dapat Saham dari Peralihan
                  </span>
                </label>

                {shareholder.isAcquisition && (
                  <div className="bg-amber-50 rounded p-3 space-y-3 border border-amber-100">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Jenis Peralihan <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input 
                            type="radio" 
                            name="acqType"
                            checked={shareholder.acquisitionType === 'AJB'} 
                            onChange={() => onChange({ acquisitionType: 'AJB' })} 
                          />
                          <span>AJB (Jual Beli)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input 
                            type="radio" 
                            name="acqType"
                            checked={shareholder.acquisitionType === 'HIBAH'} 
                            onChange={() => onChange({ acquisitionType: 'HIBAH' })} 
                          />
                          <span>HIBAH</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {shareholder.acquisitionType === 'AJB' ? 'Penjual' : 'Pemberi'} Saham <span className="text-red-500">*</span>
                      </label>
                      <select 
                        value={shareholder.acquisitionSourceId || ''}
                        onChange={e => onChange({ acquisitionSourceId: e.target.value })}
                        className="w-full px-2 py-1.5 border border-amber-200 rounded text-xs bg-white outline-none focus:border-amber-400"
                      >
                        <option value="">-- Pilih {shareholder.acquisitionType === 'AJB' ? 'Penjual' : 'Pemberi'} --</option>
                        {allShareholders
                          .filter(s => s.id !== shareholder.id && (s.sharesOwned > 0 || (s as any).oldSharesOwned > 0))
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.name} (Tersedia: {formatInputNumber(s.sharesOwned)} lembar)</option>
                          ))
                        }
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-1">
                        Jumlah Peralihan <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formatInputNumber(shareholder.acquisitionShares || 0)} 
                        onChange={e => {
                          const val = parseFormattedNumber(e.target.value);
                          const sourceSh = allShareholders.find(s => s.id === shareholder.acquisitionSourceId);
                          let safeVal = val;
                          if (sourceSh && safeVal > sourceSh.sharesOwned) {
                            alert("Jumlah peralihan tidak boleh melebihi saham yang dimiliki " + (shareholder.acquisitionType === 'AJB' ? 'penjual' : 'pemberi'));
                            safeVal = sourceSh.sharesOwned;
                          }
                          onChange({ 
                            acquisitionShares: safeVal, 
                            sharesOwned: oldSharesOwned + safeVal + (shareholder.newDepositShares || 0)
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-amber-200 rounded text-xs bg-white outline-none focus:border-amber-400"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* New Deposit Details Section */}
              {!isOld && hasCapitalChange && !disableFinancials && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={shareholder.isNewDeposit || false}
                    onChange={e => onChange({ isNewDeposit: e.target.checked, newDepositShares: e.target.checked ? shareholder.newDepositShares : 0, sharesOwned: oldSharesOwned + (shareholder.acquisitionShares || 0) + (e.target.checked ? (shareholder.newDepositShares || 0) : 0) })}
                    className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-tight flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Setor Modal Baru
                  </span>
                </label>

                {shareholder.isNewDeposit && (
                  <div className="bg-blue-50 rounded p-3 space-y-3 border border-blue-100">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-800 uppercase mb-1 flex items-center gap-1">
                        Jumlah Setoran (Lembar Saham) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formatInputNumber(shareholder.newDepositShares || 0)} 
                        onChange={e => {
                          const val = parseFormattedNumber(e.target.value);
                          onChange({ 
                            newDepositShares: val,
                            sharesOwned: oldSharesOwned + (shareholder.acquisitionShares || 0) + val
                          });
                        }}
                        className="w-full px-2 py-1.5 border border-blue-200 rounded text-xs bg-white outline-none focus:border-blue-400"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>
              )}
            </>
          )}

          {shareholder.isManagement && !hideManagement && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan Pengurus <span className="text-red-500">*</span></label>
              <select 
                disabled={disableManagement}
                value={shareholder.managementPosition || 'Direktur'}
                onChange={e => onChange({ managementPosition: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100 disabled:opacity-50"
              >
                <option value="Direktur Utama">DIREKTUR UTAMA</option>
                <option value="Direktur">DIREKTUR</option>
                <option value="Komisaris Utama">KOMISARIS UTAMA</option>
                <option value="Komisaris">KOMISARIS</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {!isBadanHukum && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tempat Lahir <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={shareholder.birthCity || ''} 
              onChange={e => onChange({ birthCity: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Lahir <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              value={shareholder.birthDate || ''} 
              onChange={e => onChange({ birthDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pekerjaan <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={shareholder.occupation || ''} 
              onChange={e => onChange({ occupation: e.target.value.toUpperCase() })}
              placeholder="CONTOH: WIRASWASTA"
              className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
            />
          </div>
        </div>
      )}

      {!(isBadanHukum && isWna) && (
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 mb-1">Alamat <span className="text-red-500">*</span></label>
          <textarea 
            value={shareholder.address.fullAddress || ''} 
            onChange={e => updateAddress({ fullAddress: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm min-h-[80px]"
          />
        </div>
      )}

      {!(isBadanHukum && isWna) && !isWna && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rt</label>
              <input 
                type="text" 
                value={shareholder.address.rt || ''} 
                onChange={e => updateAddress({ rt: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rw</label>
              <input 
                type="text" 
                value={shareholder.address.rw || ''} 
                onChange={e => updateAddress({ rw: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          <div className="mt-2">
            <IndoRegionSelector 
              address={shareholder.address} 
              onUpdate={updateAddress} 
              hideStreetAndRT={true}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ShareholderForm;
