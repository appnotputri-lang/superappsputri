import React from 'react';
import { AhuSection, AhuLabel, AhuInput } from '../components/CompanyForm';

interface AddressSectionProps {
  data: any;
  updateData: (fields: any) => void;
}

export const AddressSection: React.FC<AddressSectionProps> = ({ data, updateData }) => {
  return (
    <AhuSection title="DATA DOMISILI">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Kedudukan (Kab/Kota)" />
          <div className="md:col-span-3 flex gap-4 items-center">
            <div className="flex-1">
              <AhuInput 
                placeholder="Contoh: Kota Bandung atau Kabupaten Bandung Barat"
                value={data.domicile || ''}
                onChange={e => updateData({ domicile: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    </AhuSection>
  );
};
