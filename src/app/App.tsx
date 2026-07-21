import React from 'react';
import AppProviders from './AppProviders';
import AppShell from './AppShell';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
};

export default App;
