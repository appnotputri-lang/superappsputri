import React from 'react';
import { PpatCalculator } from '../features/ppat/PpatCalculator';

export const renderPpatCalculatorRoute = (props?: any) => {
  return <PpatCalculator setActiveSidebarTab={props?.setActiveSidebarTab} />;
};
