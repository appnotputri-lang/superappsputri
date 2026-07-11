import React from 'react';
import { AhuSection, AhuLabel, AhuInput } from '../components/CompanyForm';
import { formatInputNumber, parseFormattedNumber } from '../../../../utils/formatters';

interface CapitalSectionProps {
  data: any;
  updateData: (fields: any) => void;
}

export const CapitalSection: React.FC<CapitalSectionProps> = ({ data, updateData }) => {
  const isCv = data.companyType === 'CV';

  if (isCv) {
    return (
      <AhuSection title="DATA MODAL CV">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
            <AhuLabel label="Modal CV (Total)" />
            <div className="md:col-span-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
                <AhuInput 
                  className="pl-10"
                  value={data.originalCapitalPaid === 0 || !data.originalCapitalPaid ? '' : formatInputNumber(data.originalCapitalPaid)} 
                  onChange={e => updateData({ originalCapitalPaid: parseFormattedNumber(e.target.value) })} 
                />
              </div>
            </div>
          </div>
        </div>
      </AhuSection>
    );
  }

  return (
    <AhuSection title="MODAL PERSEROAN">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Harga per Lembar" />
          <div className="md:col-span-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
              <AhuInput 
                className="pl-10"
                value={data.originalSharePrice === 0 || !data.originalSharePrice ? '' : formatInputNumber(data.originalSharePrice)} 
                onChange={e => updateData({ originalSharePrice: parseFormattedNumber(e.target.value) })} 
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Modal Dasar (Lembar)" required />
          <div className="md:col-span-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <AhuInput 
                  value={data.originalAuthorizedShares === 0 || !data.originalAuthorizedShares ? '' : formatInputNumber(data.originalAuthorizedShares)} 
                  onChange={e => updateData({ originalAuthorizedShares: parseFormattedNumber(e.target.value) })} 
                />
              </div>
              <div className="text-[13px] font-bold text-slate-500 w-48">
                Rp. {formatInputNumber(data.targetCapitalBase || 0)}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Modal Ditempatkan & Disetor (Lembar)" required />
          <div className="md:col-span-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <AhuInput 
                  value={data.originalTotalShares === 0 || !data.originalTotalShares ? '' : formatInputNumber(data.originalTotalShares)} 
                  onChange={e => updateData({ originalTotalShares: parseFormattedNumber(e.target.value) })} 
                />
              </div>
              <div className="text-[13px] font-bold text-slate-500 w-48">
                Rp. {formatInputNumber(data.targetCapitalPaid || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AhuSection>
  );
};
