import React from 'react';
import { WhatsAppSettings } from '../components/WhatsAppSettings';
import { UserManagement } from '../components/UserManagement';

export const renderSettingsRoute = (currentTab: string, props: any) => {
  if (currentTab === 'user_management' && props.userProfile?.role === 'Super Admin') {
    return <UserManagement currentUser={props.userProfile} />;
  }

  if (currentTab === 'whatsapp_settings') {
    return <WhatsAppSettings />;
  }

  return null;
};
