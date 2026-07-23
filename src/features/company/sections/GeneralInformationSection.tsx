import React from 'react';
import { AhuSection, AhuLabel, AhuInput, AhuSelect } from '../components/CompanyForm';
import { cleanCompanyName } from '../../../lib/formatter';

interface GeneralInformationSectionProps {
  data: any;
  updateData: (fields: any) => void;
}

export const GeneralInformationSection: React.FC<GeneralInformationSectionProps> = ({
  data,
  updateData,
}) => {
  return (
    <AhuSection title="INFORMASI UMUM">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Jenis Badan Usaha" required />
          <div className="md:col-span-3">
            <AhuSelect 
              value={data.clientType || 'PT'} 
              onChange={e => {
                const val = e.target.value;
                updateData({ 
                  clientType: val,
                  companyType: val === 'CV' ? 'CV' : (val === 'PT' ? 'PT_LOKAL' : val)
                });
              }}
            >
              <option value="PT">PT</option>
              <option value="CV">CV</option>
              <option value="YAYASAN">Yayasan</option>
              <option value="PERKUMPULAN">Perkumpulan</option>
              <option value="PERSEKUTUAN_FIRMA">Persekutuan Firma</option>
              <option value="PERSEKUTUAN_PERDATA">Persekutuan Perdata</option>
              <option value="KOPERASI">Koperasi</option>
              <option value="PMA">PMA</option>
              <option value="PERORANGAN">Perorangan</option>
              <option value="LAINNYA">Lainnya</option>
            </AhuSelect>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Nama Perseroan" required />
          <div className="md:col-span-3">
            <AhuInput 
              value={data.companyName || ''} 
              onChange={e => updateData({ companyName: e.target.value })} 
              onBlur={e => updateData({ companyName: cleanCompanyName(e.target.value) })}
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
