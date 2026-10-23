import React from 'react';
import { InvoiceGenerator } from '../components/invoice/InvoiceGenerator';
import { PublicInvoiceViewer } from '../components/invoice/PublicInvoiceViewer';
import { FinancialReport } from '../components/invoice/FinancialReport';

export const renderInvoiceRoute = (currentTab = 'invoice', isPublic = false) => {
  if (isPublic) {
    return <PublicInvoiceViewer />;
  }
  if (currentTab === 'financial_report') {
    return <FinancialReport />;
  }
  return <InvoiceGenerator />;
};
