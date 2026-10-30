import React from 'react';
import { useLocation } from 'react-router-dom';
import { PATH_TO_TAB, isReservedPath, resolveSidebarTab } from '../constants/tabs';
import { useAuthContext } from '../contexts/AuthContext';
import { useCompanyContext } from '../contexts/CompanyContext';
import { useProjectContext } from '../contexts/ProjectContext';
import { renderAppRoute } from '../routes';

export interface AppRoutesProps {
  activeSidebarTab?: string;
  userProfile?: any;
  user?: any;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (v: boolean) => void;
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
  saveCompany?: (...args: any[]) => Promise<any>;
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

class AppRouteErrorBoundary extends React.Component<
  { children: React.ReactNode; tabName?: string },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error(`[AppRouteErrorBoundary] Crash on tab "${this.props.tabName}":`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-xl border border-red-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-2">Terjadi Kesalahan pada Halaman Ini</h2>
          <p className="text-xs text-slate-500 mb-4">
            Aplikasi mendeteksi error pada komponen. Data Anda tetap tersimpan dengan aman.
          </p>
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-mono text-left overflow-auto max-h-40 mb-6 border border-red-100">
            {this.state.error?.message || String(this.state.error)}
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#3b5998] hover:bg-[#2d4373] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Muat Ulang Halaman
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
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

  const isSingleSegmentPath = /^\/[A-Za-z0-9_-]+\/?$/.test(location.pathname) && location.pathname !== '/';
  const isPossibleTokenRoute = isSingleSegmentPath && !isReservedPath(location.pathname);
  const isLegacyInvRoute = /^\/inv\/[A-Za-z0-9_-]+\/?$/i.test(location.pathname);
  const isPublicQuotation = /^\/q\/[A-Za-z0-9_-]+\/?$/i.test(location.pathname);
  const isPublicDoc = /^\/doc\/[A-Za-z0-9_-]+\/?$/i.test(location.pathname);

  if (isPublicQuotation) {
    return renderAppRoute('quotation', { ...props, isPublic: true });
  }

  if (isPublicDoc) {
    return renderAppRoute('delivery', { ...props, isPublic: true });
  }

  const isWebinarPublicRoute =
    location.pathname === '/webinar' ||
    (location.pathname.startsWith('/webinar/') && !location.pathname.startsWith('/webinar/dashboard') && !location.pathname.startsWith('/webinar/peserta') && !location.pathname.startsWith('/webinar/pengaturan')) ||
    (window.location.hash && (window.location.hash.includes('/webinar') || window.location.hash.includes('#/webinar')) && !window.location.hash.includes('dashboard') && !window.location.hash.includes('peserta') && !window.location.hash.includes('pengaturan'));

  if (isWebinarPublicRoute) {
    return renderAppRoute('webinar_public', { ...props, isPublic: true });
  }

  const isSuratBoRoute =
    location.pathname === '/surat-bo' ||
    location.pathname === '/surat_bo' ||
    location.pathname.startsWith('/surat-bo') ||
    (window.location.hash && (window.location.hash.includes('/surat-bo') || window.location.hash.includes('/surat_bo')));

  if (isSuratBoRoute) {
    return renderAppRoute('surat_bo', { ...props, isPublic: !user });
  }

  const isPublicInvoice =
    location.pathname.includes('/invoice/public') ||
    (window.location.hash && window.location.hash.includes('/invoice/public')) ||
    isPossibleTokenRoute ||
    isLegacyInvRoute;

  if (isPublicInvoice) {
    return renderAppRoute('invoice', { ...props, isPublic: true });
  }

  const resolvedTab = resolveSidebarTab(location.pathname);
  const currentTab = resolvedTab || props.activeSidebarTab || 'beranda';

  return (
    <AppRouteErrorBoundary tabName={currentTab}>
      {renderAppRoute(currentTab, {
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
      })}
    </AppRouteErrorBoundary>
  );
};

export default AppRoutes;
