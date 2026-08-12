import React from 'react';
import { Settings } from '../components/Settings';

export const renderSettingsRoute = (currentTab: string, props: any) => {
  if (
    currentTab === 'settings' ||
    currentTab === 'whatsapp_settings' ||
    currentTab === 'stamp_settings' ||
    currentTab === 'user_management'
  ) {
    return (
      <Settings 
        currentUser={props.userProfile} 
        activeSidebarTab={currentTab}
        setActiveSidebarTab={props.setActiveSidebarTab}
      />
    );
  }

  return null;
};
