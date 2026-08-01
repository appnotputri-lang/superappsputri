import React from 'react';
import DeedAlphabeticalReportMain from '../DeedAlphabeticalReport';
import { Deed } from '../../types';

interface DeedAlphabeticalReportProps {
  month: number;
  year: number;
  deeds: Deed[];
  signatureDate: string;
  showStamp?: boolean;
}

export const DeedAlphabeticalReport: React.FC<DeedAlphabeticalReportProps> = ({
  month,
  year,
  deeds,
  signatureDate,
  showStamp
}) => {
  return (
    <DeedAlphabeticalReportMain
      month={month}
      year={year}
      deeds={deeds}
      signatureDate={signatureDate}
      showStamp={showStamp}
    />
  );
};

export default DeedAlphabeticalReport;
