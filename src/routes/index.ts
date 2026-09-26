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
import { renderPpatReportRoute } from './ppatReport.routes';
import { renderPpatDeedBookRoute } from './ppatDeedBook.routes';
import { renderPpatCalculatorRoute } from './ppatCalculator.routes';
import { renderInvoiceRoute } from './invoice.routes';
import { renderProductRoute } from './products.routes';
import { renderQuotationRoute } from './quotation.routes';
import { renderNotaryBookRoute } from './notaryBooks.routes';
import { renderGeneralDocumentRoute } from './generalDocument.routes';
import { renderDepositNoteRoute } from './depositNote.routes';
import { renderAgendaRoute } from './agenda.routes';
import { renderSuratBoRoute } from './suratBo.routes';
import { renderWebinarRoute } from './webinar.routes';

export const renderAppRoute = (currentTab: string, props: any) => {
  if (currentTab === 'webinar' || currentTab === 'webinar_dashboard' || currentTab === 'webinar_participants' || currentTab === 'webinar_settings' || currentTab === 'webinar_public') {
    return renderWebinarRoute(currentTab, props);
  }

  if (currentTab === 'surat_bo') {
    return renderSuratBoRoute(props);
  }

  if (currentTab === 'agenda') {
    return renderAgendaRoute(props);
  }

  if (currentTab === 'delivery' || currentTab === 'receipt') {
    return renderGeneralDocumentRoute(currentTab, props);
  }

  if (currentTab === 'deposit_note') {
    return renderDepositNoteRoute(props);
  }

  if (currentTab === 'deeds' || currentTab === 'private_deeds' || currentTab === 'outgoing_mail' || currentTab === 'incoming_mail') {
    return renderNotaryBookRoute(currentTab);
  }

  if (currentTab === 'notary_reports') {
    return renderNotaryReportRoute();
  }

  if (currentTab === 'laporan_ppat') {
    return renderPpatReportRoute();
  }

  if (currentTab === 'ppat_deeds') {
    return renderPpatDeedBookRoute(props);
  }

  if (currentTab === 'kalkulator_ppat') {
    return renderPpatCalculatorRoute(props);
  }

  if (currentTab === 'invoice') {
    return renderInvoiceRoute(props?.isPublic || false);
  }

  if (currentTab === 'products') {
    return renderProductRoute();
  }

  if (currentTab === 'quotation') {
    return renderQuotationRoute(props?.isPublic || false);
  }

  if (currentTab === 'settings' || currentTab === 'user_management' || currentTab === 'whatsapp_settings' || currentTab === 'stamp_settings') {
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

  if (currentTab === 'notulen' || currentTab === 'rupst' || currentTab === 'pendirian' || currentTab === 'perbaikan' || currentTab === 'ppat') {
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
