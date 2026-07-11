import React from 'react';
import { AhuSection, AhuLabel, AhuInput } from '../components/CompanyForm';

interface GeneralInformationSectionProps {
  data: any;
  updateData: (fields: any) => void;
}

export const GeneralInformationSection: React.FC<GeneralInformationSectionProps> = ({
  data,
  updateData,
}) => {
  return (
    <AhuSection title="General Information">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Nama Perseroan" required />
          <div className="md:col-span-3">
            <AhuInput 
              value={data.companyName || ''} 
              onChange={e => updateData({ companyName: e.target.value })} 
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Nama Singkat" />
          <div className="md:col-span-3">
            <AhuInput 
              value={data.companyShortName || ''} 
              onChange={e => updateData({ companyShortName: e.target.value })} 
              placeholder="Contoh: PT ABC"
            />
          </div>
        </div>
      </div>
    </AhuSection>
  );
};
