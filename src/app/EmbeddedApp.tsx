import React from 'react';
import AppProviders from './AppProviders';
import AppRoutes from './AppRoutes';

export const EmbeddedApp: React.FC = () => {
  return (
    <AppProviders>
      <div className="w-full h-full bg-[#f8fafc]">
        <AppRoutes />
      </div>
    </AppProviders>
  );
};

export default EmbeddedApp;
