import { renderDashboardRoute } from './dashboard.routes';
import { renderCompanyRoute } from './company.routes';
import { renderClientRoute } from './client.routes';
import { renderDocumentRoute } from './document.routes';
import { renderKbliRoute } from './kbli.routes';
import { renderReportRoute } from './report.routes';
import { renderSettingsRoute } from './settings.routes';
import { renderTrackingRoute } from './tracking.routes';
import { renderSharedRoute } from './shared.routes';

export const renderAppRoute = (currentTab: string, props: any) => {
  if (currentTab === 'user_management' || currentTab === 'whatsapp_settings') {
    return renderSettingsRoute(currentTab, props);
  }

  if (currentTab === 'beranda') {
    return renderDashboardRoute(props);
  }

  if (currentTab === 'company_profile') {
    return renderCompanyRoute();
  }

  if (currentTab === 'cv_profile') {
    return renderClientRoute(props);
  }

  if (currentTab === 'notulen' || currentTab === 'rupst' || currentTab === 'pendirian' || currentTab === 'perbaikan') {
    return renderDocumentRoute(currentTab, props);
  }

  if (currentTab === 'kbli_mapping' || currentTab === 'saran_kbli' || currentTab === 'import_kbli') {
    return renderKbliRoute(currentTab);
  }

  if (currentTab === 'laporan') {
    return renderReportRoute(props);
  }

  if (currentTab === 'panduan') {
    return renderSharedRoute();
  }

  if (currentTab === 'projects' || currentTab === 'project_detail') {
    return renderTrackingRoute(currentTab, props);
  }

  return null;
};
