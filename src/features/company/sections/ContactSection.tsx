import React from 'react';
import { AhuSection, AhuLabel, AhuInput } from '../components/CompanyForm';

interface ContactSectionProps {
  data: any;
  updateData: (fields: any) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  data,
  updateData,
}) => {
  return (
    <AhuSection title="KONTAK PERUSAHAAN">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Email PT" />
          <div className="md:col-span-3">
            <AhuInput 
              type="email"
              value={data.email || ''} 
              onChange={e => updateData({ email: e.target.value })} 
              placeholder="Contoh: info@perusahaan.com"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Nomor Telepon PT" />
          <div className="md:col-span-3">
            <AhuInput 
              type="text"
              value={data.phoneNumber || ''} 
              onChange={e => updateData({ phoneNumber: e.target.value })} 
              placeholder="Contoh: 021-12345678 atau 08123456789"
            />
          </div>
        </div>
      </div>
    </AhuSection>
  );
};

