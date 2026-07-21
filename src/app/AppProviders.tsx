import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { CompanyProvider } from '../contexts/CompanyContext';
import { ProjectProvider } from '../contexts/ProjectContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ProjectSessionProvider } from '../domain/project/useProjectSession';
import { DocumentRuntimeProvider } from '../domain/company/useDocumentRuntime';
import { ExportPipelineProvider } from '../domain/project/useExportPipeline';

export interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <CompanyProvider>
        <ProjectProvider>
          <NotificationProvider>
            <ProjectSessionProvider>
              <DocumentRuntimeProvider>
                <ExportPipelineProvider>
                  {children}
                </ExportPipelineProvider>
              </DocumentRuntimeProvider>
            </ProjectSessionProvider>
          </NotificationProvider>
        </ProjectProvider>
      </CompanyProvider>
    </AuthProvider>
  );
};

export default AppProviders;
