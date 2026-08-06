import React from 'react';
import { QuotationGenerator } from '../components/quotation/QuotationGenerator';
import { PublicQuotationViewer } from '../components/quotation/PublicQuotationViewer';

export const renderQuotationRoute = (isPublic = false) => {
  if (isPublic) {
    return <PublicQuotationViewer />;
  }
  return <QuotationGenerator />;
};
