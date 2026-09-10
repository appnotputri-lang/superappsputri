import React from 'react';
import { AgendaPage } from '../pages/AgendaPage';

export const renderAgendaRoute = (props: any) => {
  return (
    <AgendaPage
      projects={props.projects || []}
      setActiveSidebarTab={props.setActiveSidebarTab}
      onNavigateToDashboard={() => {
        if (props.setActiveSidebarTab) {
          props.setActiveSidebarTab('beranda');
        }
      }}
    />
  );
};
