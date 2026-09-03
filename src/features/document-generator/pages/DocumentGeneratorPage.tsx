import React from 'react';
import RUPSLBPage, { RUPSLBPageProps } from './RUPSLBPage';
import RUPSTPage, { RUPSTPageProps } from './RUPSTPage';
import PendirianPage, { PendirianPageProps } from './PendirianPage';
import PPATPage, { PPATPageProps } from './PPATPage';

export interface DocumentGeneratorPageProps {
  activeSidebarTab: 'notulen' | 'rupst' | 'pendirian' | 'ppat';
  rupslbProps: RUPSLBPageProps;
  rupstProps: RUPSTPageProps;
  pendirianProps: PendirianPageProps;
  ppatProps?: PPATPageProps;
}

export const DocumentGeneratorPage: React.FC<DocumentGeneratorPageProps> = ({
  activeSidebarTab,
  rupslbProps,
  rupstProps,
  pendirianProps,
  ppatProps
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
  if (activeSidebarTab === 'ppat') {
    return <PPATPage {...(ppatProps || {})} />;
  }
  return null;
};

export default DocumentGeneratorPage;

