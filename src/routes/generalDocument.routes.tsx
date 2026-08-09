import React from 'react';
import { GeneralDocumentGenerator } from '../components/documents/GeneralDocumentGenerator';
import { PublicGeneralDocumentViewer } from '../components/documents/PublicGeneralDocumentViewer';
import { SidebarTabId } from '../../types';

export const renderGeneralDocumentRoute = (tab: 'delivery' | 'receipt' | string, props: any) => {
  if (props?.isPublic) {
    return <PublicGeneralDocumentViewer />;
  }

  const docType = tab === 'receipt' ? 'RECEIPT' : 'DELIVERY';

  return (
    <GeneralDocumentGenerator
      docType={docType}
      setActiveSidebarTab={props?.setActiveSidebarTab}
    />
  );
};
