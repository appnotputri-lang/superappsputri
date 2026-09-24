import React from 'react';
import { PpatDeedBook } from '../features/ppat/PpatDeedBook';
import { PageContainer } from '../components/ui/PageLayout';
import { SidebarTabId } from '../../types';

export const renderPpatDeedBookRoute = (props?: { setActiveSidebarTab?: (tab: SidebarTabId) => void }) => {
  return (
    <PageContainer>
      <PpatDeedBook setActiveSidebarTab={props?.setActiveSidebarTab} />
    </PageContainer>
  );
};
