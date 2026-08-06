import { renderDashboardRoute } from './dashboard.routes';
import { renderCompanyRoute } from './company.routes';
import { renderClientRoute } from './client.routes';
import { renderDocumentRoute } from './document.routes';
import { renderKbliRoute } from './kbli.routes';
import { renderReportRoute } from './report.routes';
import { renderSettingsRoute } from './settings.routes';
import { renderTrackingRoute } from './tracking.routes';
import { renderSharedRoute } from './shared.routes';
import { renderNotaryReportRoute } from './notaryReport.routes';
import { renderInvoiceRoute } from './invoice.routes';
import { renderQuotationRoute } from './quotation.routes';
import { renderNotaryBookRoute } from './notaryBooks.routes';

export const renderAppRoute = (currentTab: string, props: any) => {
  if (currentTab === 'deeds' || currentTab === 'private_deeds' || currentTab === 'outgoing_mail' || currentTab === 'incoming_mail') {
    return renderNotaryBookRoute(currentTab);
  }

  if (currentTab === 'notary_reports') {
    return renderNotaryReportRoute();
  }

  if (currentTab === 'invoice') {
    return renderInvoiceRoute(props?.isPublic || false);
  }

  if (currentTab === 'quotation') {
    return renderQuotationRoute(props?.isPublic || false);
  }

  if (currentTab === 'user_management' || currentTab === 'whatsapp_settings' || currentTab === 'stamp_settings') {
    return renderSettingsRoute(currentTab, props);
  }

  if (currentTab === 'beranda') {
    return renderDashboardRoute(props);
  }

  if (currentTab === 'company_profile') {
    return renderCompanyRoute(props);
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
