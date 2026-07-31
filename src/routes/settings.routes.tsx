import React from 'react';
import { WhatsAppSettings } from '../components/WhatsAppSettings';
import { UserManagement } from '../components/UserManagement';
import { StampSettings } from '../components/StampSettings';

export const renderSettingsRoute = (currentTab: string, props: any) => {
  if (currentTab === 'user_management' && props.userProfile?.role === 'Super Admin') {
    return <UserManagement currentUser={props.userProfile} />;
  }

  if (currentTab === 'whatsapp_settings') {
    return <WhatsAppSettings />;
  }

  if (currentTab === 'stamp_settings') {
    return <StampSettings />;
  }

  return null;
};
