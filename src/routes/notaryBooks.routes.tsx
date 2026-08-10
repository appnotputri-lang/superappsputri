import React from 'react';
import { DeedBook } from '../features/notary-books/DeedBook';
import { PrivateDeedBook } from '../features/notary-books/PrivateDeedBook';
import { OutgoingMailBook } from '../features/notary-books/OutgoingMailBook';
import { IncomingMailBook } from '../features/notary-books/IncomingMailBook';
import { PageContainer } from '../components/ui/PageLayout';

export const renderNotaryBookRoute = (currentTab: string) => {
  const renderContent = () => {
    switch (currentTab) {
      case 'deeds':
        return <DeedBook />;
      case 'private_deeds':
        return <PrivateDeedBook />;
      case 'outgoing_mail':
        return <OutgoingMailBook />;
      case 'incoming_mail':
        return <IncomingMailBook />;
      default:
        return null;
    }
  };

  return <PageContainer>{renderContent()}</PageContainer>;
};
