import React from 'react';
import { DepositNoteManager } from '../components/deposit-note/DepositNoteManager';

export const renderDepositNoteRoute = (props: any) => {
  return (
    <DepositNoteManager
      setActiveSidebarTab={props?.setActiveSidebarTab}
    />
  );
};
