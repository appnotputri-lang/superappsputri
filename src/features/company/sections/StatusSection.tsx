import React from 'react';
import { AhuSection, AhuLabel, AhuSelect } from '../components/CompanyForm';

interface StatusSectionProps {
  data: any;
  updateData: (fields: any) => void;
}

export const StatusSection: React.FC<StatusSectionProps> = ({
  data,
  updateData,
}) => {
  return (
    <AhuSection title="STATUS PERSEROAN">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Status Perseroan" />
          <div className="md:col-span-3">
            <AhuSelect 
              value={data.status || 'tertutup'} 
              onChange={e => updateData({ status: e.target.value })}
            >
              <option value="tertutup">Tertutup</option>
              <option value="terbuka">Terbuka</option>
            </AhuSelect>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Jangka Waktu Berdiri" />
          <div className="md:col-span-3">
            <AhuSelect 
              value={data.duration || 'TIDAK TERBATAS'} 
              onChange={e => updateData({ duration: e.target.value })}
            >
              <option value="TIDAK TERBATAS">Tidak Terbatas</option>
              <option value="TERBATAS">Terbatas</option>
            </AhuSelect>
          </div>
        </div>
      </div>
    </AhuSection>
  );
};
