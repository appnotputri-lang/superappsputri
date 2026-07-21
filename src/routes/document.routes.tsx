import React from 'react';
import { DocumentGeneratorPage } from '../features/document-generator';
import { DataCorrectionLetter } from '../components/editors/DataCorrectionLetter';

export const renderDocumentRoute = (currentTab: string, props: any) => {
  if (currentTab === 'perbaikan') {
    return <DataCorrectionLetter />;
  }

  return (
    <DocumentGeneratorPage
      activeSidebarTab={currentTab as any}
      rupslbProps={props.rupslbProps}
      rupstProps={props.rupstProps}
      pendirianProps={props.pendirianProps}
    />
  );
};
