import React from 'react';
import { DataTerpusatPage } from '../features/centralized-data';

export const renderCentralizedDataRoute = (props?: any) => {
  return <DataTerpusatPage setIsSidebarOpen={props?.setIsSidebarOpen} />;
};
