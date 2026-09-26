import React from 'react';
import { WebinarDashboard } from '../components/webinar/admin/WebinarDashboard';
import { WebinarParticipants } from '../components/webinar/admin/WebinarParticipants';
import { WebinarSettingsView } from '../components/webinar/admin/WebinarSettings';
import { PublicWebinarPage } from '../components/webinar/PublicWebinarPage';

export const renderWebinarRoute = (tabId: string, props?: any) => {
  if (props?.isPublic || tabId === 'webinar_public') {
    return <PublicWebinarPage />;
  }

  if (tabId === 'webinar_participants') {
    return <WebinarParticipants />;
  }

  if (tabId === 'webinar_settings') {
    return <WebinarSettingsView />;
  }

  return <WebinarDashboard onNavigateTab={props?.setActiveSidebarTab} />;
};
