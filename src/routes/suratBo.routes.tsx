import React from 'react';
import { SuratBoGenerator } from '../components/surat-bo/SuratBoGenerator';

export const renderSuratBoRoute = (props?: any) => {
  return <SuratBoGenerator isPublic={props?.isPublic} user={props?.user} />;
};
