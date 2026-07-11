import React from 'react';
import RUPSLBPage, { RUPSLBPageProps } from './RUPSLBPage';
import RUPSTPage, { RUPSTPageProps } from './RUPSTPage';
// ...

import PendirianPage, { PendirianPageProps } from './PendirianPage';

export interface DocumentGeneratorPageProps {
  activeSidebarTab: 'notulen' | 'rupst' | 'pendirian';
  rupslbProps: RUPSLBPageProps;
  rupstProps: RUPSTPageProps;
  pendirianProps: PendirianPageProps;
}

export const DocumentGeneratorPage: React.FC<DocumentGeneratorPageProps> = ({
  activeSidebarTab,
  rupslbProps,
  rupstProps,
  pendirianProps
}) => {
  if (activeSidebarTab === 'notulen') {
    return <RUPSLBPage {...rupslbProps} />;
  }
  if (activeSidebarTab === 'rupst') {
    return <RUPSTPage {...rupstProps} />;
  }
  if (activeSidebarTab === 'pendirian') {
    return <PendirianPage {...pendirianProps} />;
  }
  return null;
};

export default DocumentGeneratorPage;
