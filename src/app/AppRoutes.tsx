import React from 'react';
import { useLocation } from 'react-router-dom';
import { PATH_TO_TAB } from '../constants/tabs';
import { useAuthContext } from '../contexts/AuthContext';
import { useCompanyContext } from '../contexts/CompanyContext';
import { useProjectContext } from '../contexts/ProjectContext';
import { renderAppRoute } from '../routes';

export interface AppRoutesProps {
  activeSidebarTab?: string;
  userProfile?: any;
  user?: any;
  profiles?: any[];
  projects?: any[];
  rupstProjects?: any[];
  pendirianProjects?: any[];
  compiledActivities?: any[];
  compiledDocuments?: any[];
  setActiveSidebarTab?: (tab: any) => void;
  setEditingProjectId?: (id: any) => void;
  setEditingRupstId?: (id: any) => void;
  setEditingPendirianId?: (id: any) => void;
  editingCvProfileId?: any;
  setEditingCvProfileId?: (id: any) => void;
  isProfilePreview?: boolean;
  setIsProfilePreview?: (v: boolean) => void;
  updateData?: (d: any) => void;
  resetData?: () => void;
  data?: any;
  setData?: (d: any) => void;
  mergedData?: any;
  isSaving?: boolean;
  setIsSaving?: (v: boolean) => void;
  isSyncing?: boolean;
  handleManualSync?: () => void;
  recordNotification?: (...args: any[]) => void;
  saveCompany?: (...args: any[]) => Promise<void>;
  deleteCompany?: (...args: any[]) => Promise<void>;
  cvProfiles?: any[];
  cvProfileSearchQuery?: string;
  setCvProfileSearchQuery?: (q: string) => void;
  cvProfileCurrentPage?: number;
  setCvProfileCurrentPage?: (p: number) => void;
  openShareholderEditor?: (...args: any[]) => void;
  deleteShareholder?: (...args: any[]) => void;
  setIsAddKbliModalOpen?: (v: boolean) => void;
  editingProjectId?: any;
  editingRupstId?: any;
  editingPendirianId?: any;
  activeProjectContext?: any;
  setActiveProjectContext?: (id: any) => void;
  setSelectedProjectId?: (id: any) => void;
  selectedProjectId?: any;
  handleDownloadProject?: (...args: any[]) => void;
  rupslbProps?: any;
  rupstProps?: any;
  pendirianProps?: any;
  [key: string]: any;
}

export const AppRoutes: React.FC<AppRoutesProps> = (props) => {
  const location = useLocation();
  const authCtx = useAuthContext();
  const companyCtx = useCompanyContext() as any;
  const projectCtx = useProjectContext();

  const user = props.user ?? authCtx.user;
  const userProfile = props.userProfile ?? authCtx.userProfile;
  const profiles = props.profiles ?? companyCtx.profiles;
  const cvProfiles = props.cvProfiles ?? companyCtx.cvProfiles;
  const projects = props.projects ?? projectCtx.projects;
  const rupstProjects = props.rupstProjects ?? projectCtx.rupstProjects;
  const pendirianProjects = props.pendirianProjects ?? projectCtx.pendirianProjects;
  const data = props.data ?? (companyCtx.companyData || {});
  const updateData = props.updateData ?? (companyCtx.updateCompanyData || (() => {}));
  const resetData = props.resetData ?? (companyCtx.resetCompanyData || (() => {}));
  const saveCompany = props.saveCompany ?? companyCtx.save;
  const deleteCompany = props.deleteCompany ?? companyCtx.delete;

  const currentTab = props.activeSidebarTab || PATH_TO_TAB[location.pathname] || 'beranda';

  return renderAppRoute(currentTab, {
    ...props,
    user,
    userProfile,
    profiles,
    cvProfiles,
    projects,
    rupstProjects,
    pendirianProjects,
    data,
    updateData,
    resetData,
    saveCompany,
    deleteCompany
  });
};

export default AppRoutes;
