import React from 'react';
import { AhuSection, AhuLabel, AhuInput, AhuSelect } from '../components/CompanyForm';

interface CompanyIdentitySectionProps {
  data: any;
  updateData: (fields: any) => void;
}

export const CompanyIdentitySection: React.FC<CompanyIdentitySectionProps> = ({
  data,
  updateData,
}) => {
  return (
    <AhuSection title="IDENTITAS PERSEROAN">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Tipe Perseroan" />
          <div className="md:col-span-3">
            <AhuSelect 
              value={data.companyType || 'SWASTA NASIONAL'} 
              onChange={e => updateData({ companyType: e.target.value })}
            >
              <option value="SWASTA NASIONAL">SWASTA NASIONAL</option>
              <option value="CV">CV</option>
              <option value="PMA">PMA</option>
            </AhuSelect>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="NPWP" />
          <div className="md:col-span-3">
            <AhuInput 
              value={data.npwp || ''} 
              onChange={e => updateData({ npwp: e.target.value })} 
              placeholder="00.000.000.0-000.000"
            />
          </div>
        </div>
      </div>
    </AhuSection>
  );
};
