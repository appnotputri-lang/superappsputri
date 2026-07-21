import React from 'react';
import { LaporanList } from '../components/LaporanList';

export const renderReportRoute = (props: any) => {
  return (
    <LaporanList
      projects={props.projects}
      rupstProjects={props.rupstProjects}
      pendirianProjects={props.pendirianProjects}
    />
  );
};
