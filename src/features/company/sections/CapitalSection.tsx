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
                onChange={e => {
                  const newPrice = parseFormattedNumber(e.target.value);
                  const curBase = data.targetCapitalBase || data.originalCapitalBase || 0;
                  const curPaid = data.targetCapitalPaid || data.originalCapitalPaid || 0;
                  updateData({ 
                    originalSharePrice: newPrice,
                    originalAuthorizedShares: newPrice > 0 ? Math.floor(curBase / newPrice) : (data.originalAuthorizedShares || 0),
                    originalTotalShares: newPrice > 0 ? Math.floor(curPaid / newPrice) : (data.originalTotalShares || 0),
                  });
                }} 
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Modal Dasar (Rp)" required />
          <div className="md:col-span-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
                <AhuInput 
                  className="pl-10"
                  placeholder="0"
                  value={data.targetCapitalBase === 0 || !data.targetCapitalBase ? (data.originalCapitalBase ? formatInputNumber(data.originalCapitalBase) : '') : formatInputNumber(data.targetCapitalBase)} 
                  onChange={e => {
                    const rpVal = parseFormattedNumber(e.target.value);
                    const price = data.originalSharePrice || 0;
                    const lembar = price > 0 ? Math.floor(rpVal / price) : 0;
                    updateData({ 
                      targetCapitalBase: rpVal, 
                      originalCapitalBase: rpVal,
                      originalAuthorizedShares: lembar 
                    });
                  }} 
                />
              </div>
              <div className="text-[13px] font-bold text-slate-600 w-full sm:w-48 shrink-0 flex items-center">
                {formatInputNumber(data.originalAuthorizedShares || 0)} Lembar
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <AhuLabel label="Modal Ditempatkan & Disetor (Rp)" required />
          <div className="md:col-span-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">Rp.</span>
                <AhuInput 
                  className="pl-10"
                  placeholder="0"
                  value={data.targetCapitalPaid === 0 || !data.targetCapitalPaid ? (data.originalCapitalPaid ? formatInputNumber(data.originalCapitalPaid) : '') : formatInputNumber(data.targetCapitalPaid)} 
                  onChange={e => {
                    const rpVal = parseFormattedNumber(e.target.value);
                    const price = data.originalSharePrice || 0;
                    const lembar = price > 0 ? Math.floor(rpVal / price) : 0;
                    updateData({ 
                      targetCapitalPaid: rpVal, 
                      originalCapitalPaid: rpVal,
                      originalTotalShares: lembar 
                    });
                  }} 
                />
              </div>
              <div className="text-[13px] font-bold text-slate-600 w-full sm:w-48 shrink-0 flex items-center">
                {formatInputNumber(data.originalTotalShares || 0)} Lembar
              </div>
            </div>
          </div>
        </div>
      </div>
    </AhuSection>
  );
};
