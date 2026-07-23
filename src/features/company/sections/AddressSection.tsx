import React from 'react';
import { AhuSection, AhuLabel, AhuInput } from '../components/CompanyForm';
import { extractStreetAddress } from '../../../lib/formatter';

interface AddressSectionProps {
  data: any;
  updateData: (fields: any) => void;
}

export const AddressSection: React.FC<AddressSectionProps> = ({ data, updateData }) => {
  const rawAddress = data.newAddress?.fullAddress || data.fullAddress || '';
  const currentFullAddress = extractStreetAddress(rawAddress);
  const newAddr = data.newAddress || {};

  const handleFullAddressChange = (val: string) => {
    updateData({
      fullAddress: val,
      newAddress: {
        ...newAddr,
        fullAddress: val,
      },
    });
  };

  const handleAddressDetailChange = (key: string, val: string) => {
    const updatedNewAddr = {
      ...newAddr,
      [key]: val,
    };
    updateData({
      newAddress: updatedNewAddr,
    });
  };

  return (
    <AhuSection title="DATA DOMISILI & ALAMAT PERSEROAN">
      <div className="space-y-4">
        {/* KEDUDUKAN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Kedudukan (Kab/Kota)" />
          <div className="md:col-span-3 flex gap-4 items-center">
            <div className="flex-1">
              <AhuInput 
                placeholder="Contoh: Kota Bandung atau Kabupaten Bandung Barat"
                value={data.domicile || ''}
                onChange={e => updateData({ domicile: e.target.value, newAddress: { ...newAddr, city: e.target.value } })}
              />
            </div>
          </div>
        </div>

        {/* ALAMAT UTAMA / JALAN */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
          <AhuLabel label="Alamat Utama / Jalan" />
          <div className="md:col-span-3">
            <AhuInput 
              placeholder="Contoh: Jl. Asia Afrika No. 123"
              value={currentFullAddress}
              onChange={e => handleFullAddressChange(e.target.value)}
            />
          </div>
        </div>

        {/* RINCIAN ALAMAT */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
          <AhuLabel label="Rincian Alamat (RT/RW/Kel/Kec/Pos)" />
          <div className="md:col-span-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <AhuLabel label="RT" />
                <AhuInput 
                  placeholder="001" 
                  value={newAddr.rt || ''} 
                  onChange={e => handleAddressDetailChange('rt', e.target.value)} 
                />
              </div>
              <div>
                <AhuLabel label="RW" />
                <AhuInput 
                  placeholder="002" 
                  value={newAddr.rw || ''} 
                  onChange={e => handleAddressDetailChange('rw', e.target.value)} 
                />
              </div>
              <div>
                <AhuLabel label="Kelurahan" />
                <AhuInput 
                  placeholder="Kelurahan" 
                  value={newAddr.kelurahan || ''} 
                  onChange={e => handleAddressDetailChange('kelurahan', e.target.value)} 
                />
              </div>
              <div>
                <AhuLabel label="Kecamatan" />
                <AhuInput 
                  placeholder="Kecamatan" 
                  value={newAddr.kecamatan || ''} 
                  onChange={e => handleAddressDetailChange('kecamatan', e.target.value)} 
                />
              </div>
            </div>
            <div className="w-1/2 pr-1">
              <AhuLabel label="Kode Pos" />
              <AhuInput 
                placeholder="40111" 
                value={newAddr.postalCode || ''} 
                onChange={e => handleAddressDetailChange('postalCode', e.target.value)} 
              />
            </div>
          </div>
        </div>
      </div>
    </AhuSection>
  );
};

