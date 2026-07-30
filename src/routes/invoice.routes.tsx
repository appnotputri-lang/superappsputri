import React from 'react';
import { InvoiceGenerator } from '../components/invoice/InvoiceGenerator';
import { PublicInvoiceViewer } from '../components/invoice/PublicInvoiceViewer';

export const renderInvoiceRoute = (isPublic = false) => {
  if (isPublic) {
    return <PublicInvoiceViewer />;
  }
  return <InvoiceGenerator />;
};
