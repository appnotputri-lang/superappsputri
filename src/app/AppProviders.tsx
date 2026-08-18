import React from 'react';
import { LoadingProvider } from '../contexts/LoadingContext';
import { AuthProvider } from '../contexts/AuthContext';
import { CompanyProvider } from '../contexts/CompanyContext';
import { ProjectProvider } from '../contexts/ProjectContext';
import { ProjectSessionProvider } from '../domain/project/useProjectSession';
import { DocumentRuntimeProvider } from '../domain/company/useDocumentRuntime';
import { ExportPipelineProvider } from '../domain/project/useExportPipeline';

export interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <LoadingProvider>
      <AuthProvider>
        <CompanyProvider>
          <ProjectProvider>
            <ProjectSessionProvider>
              <DocumentRuntimeProvider>
                <ExportPipelineProvider>
                  {children}
                </ExportPipelineProvider>
              </DocumentRuntimeProvider>
            </ProjectSessionProvider>
          </ProjectProvider>
        </CompanyProvider>
      </AuthProvider>
    </LoadingProvider>
  );
};

export default AppProviders;
