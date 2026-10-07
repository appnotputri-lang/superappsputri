import { getApiUrl, getAuthHeaders } from '../lib/api';

/**
 * Target WhatsApp Group ID untuk notifikasi proyek selesai:
 * Nama grup: KANTOR NOTARIS/PPAT
 */
export const COMPLETED_PROJECT_WA_TARGET = '120363295728301990@g.us';

export class ProjectNotificationService {
  /**
   * Menyusun pesan WhatsApp notifikasi penyelesaian proyek sesuai format resmi SuperApps Putri:
   *
   * 🤖 Halo Team 👋
   *
   * ✅ Proyek *[Nama Proyek]* – *[Nama Klien]* telah selesai.
   *
   * 📂 Selanjutnya segera masuk ke pemberkasan minuta.
   *
   * — SuperApps Putri
   */
  static buildCompletedProjectMessage(projectName: string, clientName: string): string {
    const cleanProject = (projectName || 'Proyek').trim();
    const cleanClient = (clientName || 'Klien').trim();

    return [
      '🤖 Halo Team 👋',
      '',
      `✅ Proyek *${cleanProject}* – *${cleanClient}* telah selesai.`,
      '',
      '📂 Selanjutnya segera masuk ke pemberkasan minuta.',
      '',
      '— SuperApps Putri'
    ].join('\n');
  }

  /**
   * Mengirim notifikasi WhatsApp ke WhatsApp Group Kantor (120363295728301990@g.us)
   * menggunakan backend endpoint `/api/send-whatsapp` yang terintegrasi dengan Fonnte secara aman.
   *
   * Karakteristik:
   * - Aman (Fonnte token tidak diekspos ke client)
   * - Non-blocking / Safe failure (kegagalan tidak membuat aplikasi crash atau menggagalkan status proyek)
   * - Logging yang jelas untuk kemudahan troubleshooting
   */
  static async notifyProjectCompleted(project: {
    projectId?: string;
    title?: string;
    projectName?: string;
    clientSnapshot?: any;
    clientName?: string;
    metadata?: any;
    status?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const projectName = (project.title || project.projectName || 'Proyek Tanpa Judul').trim();
      const clientName = (
        project.clientSnapshot?.companyName ||
        project.clientSnapshot?.name ||
        project.clientName ||
        project.metadata?.clientName ||
        'Klien'
      ).trim();

      const message = this.buildCompletedProjectMessage(projectName, clientName);
      const headers = await getAuthHeaders();

      console.log(`[ProjectNotificationService] Mengirim notifikasi WA proyek selesai untuk "${projectName}" – "${clientName}" ke grup: ${COMPLETED_PROJECT_WA_TARGET}`);

      const response = await fetch(getApiUrl('/api/send-whatsapp'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target: COMPLETED_PROJECT_WA_TARGET,
          message: message,
        }),
      });

      const resText = await response.text();
      let resData: any = {};
      try {
        resData = JSON.parse(resText);
      } catch (parseErr) {
        // Output non-JSON
      }

      if (!response.ok || (resData && resData.success === false)) {
        const errorMsg = resData?.error || resData?.message || `HTTP ${response.status}: ${resText}`;
        console.warn(`[ProjectNotificationService] Gagal mengirim notifikasi WhatsApp untuk proyek ${project.projectId || projectName}:`, errorMsg);
        return { success: false, error: errorMsg };
      }

      console.log(`[ProjectNotificationService] Sukses mengirim notifikasi WhatsApp proyek selesai ke ${COMPLETED_PROJECT_WA_TARGET}`);
      return { success: true };
    } catch (error: any) {
      console.error('[ProjectNotificationService] Terjadi kesalahan saat mengirim notifikasi WhatsApp proyek selesai:', error);
      return { success: false, error: error?.message || String(error) };
    }
  }
}
