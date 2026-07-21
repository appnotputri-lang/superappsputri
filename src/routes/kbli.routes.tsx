import React from 'react';
import { KbliTools } from '../pages/KbliTools';

export const renderKbliRoute = (currentTab: string) => {
  return <KbliTools activeKbliTab={currentTab} />;
};
