import React from 'react';
import { CompanyPage } from '../features/company';

export const renderCompanyRoute = (props: any) => {
  return <CompanyPage setIsSidebarOpen={props?.setIsSidebarOpen} />;
};
