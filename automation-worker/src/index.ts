import { Env, AutomationRule, AutomationLog } from './types';
import { fetchActiveProjectReports } from './services/firestoreService';
import { generateActiveProjectsPdf } from './services/pdfService';
import { uploadPdfToGoogleDrive } from './services/driveService';
import {
  getAutomationRecipient,
  buildWhatsAppReportMessage,
  sendWhatsAppViaFonnte
} from './services/whatsappService';
import {
  getJakartaDateString,
  getJakartaFormattedDate,
  formatJakartaPrintDate
} from './dateUtils';

export {
  getJakartaDateString,
  getJakartaFormattedDate,
  formatJakartaPrintDate
};

/**
 * Mendapatkan waktu ISO lengkap dalam format string
 */
export function getNowIsoString(): string {
  return new Date().toISOString();
}

/**
 * Runner logic untuk eksekusi automation project-report-daily
 * 08:00 WIB (Cron: 0 1 * * *)
 * 1. Ambil data project dari Firestore (office_projects)
 * 2. Buat laporan "LAPORAN PROYEK AKTIF"
 * 3. Generate Landscape A4 PDF
 * 4. Upload PDF ke Google Drive & dapatkan link
 * 5. Kirim ringkasan & link PDF ke WhatsApp melalui Fonnte
 * 6. Simpan hasil eksekusi ke D1 automation_logs
 */
export async function runDailyProjectReportAutomation(
  env: Env,
  force: boolean = false
): Promise<{
  success: boolean;
  skipped?: boolean;
  runKey?: string;
  pdfUrl?: string;
  recipient?: string | null;
  message: string;
  error?: string;
}> {
  if (!env.DB) {
    throw new Error('D1 database binding (env.DB) is not configured in Worker.');
  }

  // 1. Baca automation_rules untuk 'project-report-daily'
  const rule = await env.DB.prepare(
    'SELECT * FROM automation_rules WHERE id = ?'
  )
    .bind('project-report-daily')
    .first<AutomationRule>();

  if (!rule) {
    const msg = '[Automation] Rule project-report-daily tidak ditemukan di database D1.';
    console.warn(msg);
    return { success: false, message: msg };
  }

  // 2. Pastikan rule aktif (enabled = 1)
  if (Number(rule.enabled) !== 1) {
    const msg = `[Automation] Rule project-report-daily dinonaktifkan (enabled = ${rule.enabled}). Eksekusi dibatalkan.`;
    console.log(msg);
    return { success: true, skipped: true, message: msg };
  }

  // 3. Buat run_key berdasarkan ID automation + tanggal WIB (Asia/Jakarta)
  const executionDate = new Date();
  const jakartaDate = getJakartaDateString(executionDate);
  const runKey = `${rule.id}:${jakartaDate}`;

  console.log(`[Automation] Starting ${rule.id} (run_key: ${runKey}, force: ${force})`);

  // 4. Cek automation_logs berdasarkan run_key untuk idempotensi
  const existingLog = await env.DB.prepare(
    'SELECT id, status, started_at FROM automation_logs WHERE run_key = ?'
  )
    .bind(runKey)
    .first<AutomationLog>();

  if (existingLog && existingLog.status === 'SUCCESS' && !force) {
    const msg = `[Automation] Skipped: run_key ${runKey} sudah pernah sukses diproses pada ${existingLog.started_at}.`;
    console.log(msg);
    return { success: true, skipped: true, runKey, message: msg };
  }

  // 5. Buat atau perbarui log dengan status RUNNING
  const logId = existingLog ? existingLog.id : crypto.randomUUID();
  const startedAt = getNowIsoString();

  if (existingLog) {
    await env.DB.prepare(
      `UPDATE automation_logs 
       SET status = 'RUNNING', started_at = ?, error_message = NULL 
       WHERE id = ?`
    )
      .bind(startedAt, logId)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO automation_logs (
        id, automation_id, run_key, started_at, status
      ) VALUES (?, ?, ?, ?, 'RUNNING')`
    )
      .bind(logId, rule.id, runKey, startedAt)
      .run();
  }

  let logStatus = 'SUCCESS';
  let errorMessage: string | null = null;
  let targetRecipient: string | null = null;
  let sentMessageText: string | null = null;
  let providerResponseStr: string | null = null;
  let drivePdfUrl: string | null = null;

  try {
    // Step 1: Ambil data proyek aktif dari Firestore (office_projects)
    console.log('[Automation] Step 1: Fetching active projects from Firestore collection office_projects...');
    const activeReports = await fetchActiveProjectReports(env);
    console.log(`[Automation] Retrieved ${activeReports.length} active project records.`);

    // Step 2: Generate Landscape A4 PDF
    console.log('[Automation] Step 2: Generating official Landscape A4 PDF report...');
    const pdfResult = await generateActiveProjectsPdf(activeReports, executionDate);
    console.log(`[Automation] Generated PDF "${pdfResult.fileName}" (${pdfResult.arrayBuffer.byteLength} bytes, ${pdfResult.totalClients} clients).`);

    // Step 3: Upload PDF ke Google Drive
    console.log('[Automation] Step 3: Uploading PDF to Google Drive...');
    const driveResult = await uploadPdfToGoogleDrive(pdfResult.fileName, pdfResult.base64, env);
    drivePdfUrl = driveResult.webViewLink;
    console.log(`[Automation] Uploaded to Google Drive successfully. Link: ${drivePdfUrl}`);

    // Step 4: Tentukan penerima WhatsApp
    targetRecipient = await getAutomationRecipient(rule.recipient, env);
    if (!targetRecipient) {
      throw new Error(
        'WhatsApp recipient target is not configured. Set recipient in automation_rules table, in Firestore settings/whatsapp (nomorTujuanDefault / nomorAdmin), or via AUTOMATION_WHATSAPP_TARGET env var.'
      );
    }

    // Step 5: Bangun pesan WhatsApp terstruktur dengan link PDF
    console.log(`[Automation] Step 5: Preparing WhatsApp message for recipient ${targetRecipient}...`);
    sentMessageText = buildWhatsAppReportMessage(activeReports, drivePdfUrl, executionDate);

    // Step 6: Kirim WhatsApp melalui Fonnte Gateway
    console.log('[Automation] Step 6: Dispatching message via Fonnte Gateway...');
    const waResult = await sendWhatsAppViaFonnte(targetRecipient, sentMessageText, env);
    providerResponseStr = JSON.stringify(waResult.responseRaw || {});

    if (!waResult.success) {
      throw new Error(`Fonnte send error: ${waResult.error || 'Pesan gagal dikirim oleh gateway'}`);
    }

    console.log(`[Automation] WhatsApp report sent successfully to ${targetRecipient}!`);
  } catch (err: any) {
    logStatus = 'FAILED';
    errorMessage = err?.message || String(err);
    console.error(`[Automation] Execution FAILED for ${runKey}:`, err);
  }

  // 6. Update status akhir pada automation_logs
  const finishedAt = getNowIsoString();
  await env.DB.prepare(
    `UPDATE automation_logs 
     SET status = ?, finished_at = ?, recipient = ?, message = ?, provider = 'fonnte', provider_response = ?, error_message = ? 
     WHERE id = ?`
  )
    .bind(
      logStatus,
      finishedAt,
      targetRecipient,
      sentMessageText,
      providerResponseStr,
      errorMessage,
      logId
    )
    .run();

  // 7. Update last_run_at dan last_status pada automation_rules
  await env.DB.prepare(
    `UPDATE automation_rules 
     SET last_run_at = ?, last_status = ?, updated_at = ? 
     WHERE id = ?`
  )
    .bind(finishedAt, logStatus, finishedAt, rule.id)
    .run();

  if (logStatus === 'SUCCESS') {
    return {
      success: true,
      runKey,
      pdfUrl: drivePdfUrl || undefined,
      recipient: targetRecipient,
      message: `[Automation] SUCCESS for ${runKey}. PDF uploaded & WhatsApp delivered to ${targetRecipient}.`
    };
  } else {
    return {
      success: false,
      runKey,
      recipient: targetRecipient,
      error: errorMessage || undefined,
      message: `[Automation] FAILED for ${runKey}: ${errorMessage}`
    };
  }
}

export default {
  /**
   * Scheduled Cron Handler
   * Dijalankan otomatis setiap hari pukul 01:00 UTC (08:00 WIB)
   * Cron Trigger: "0 1 * * *"
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(runDailyProjectReportAutomation(env));
  },

  /**
   * HTTP Fetch Handler
   * Health check, status monitoring, dan manual test trigger
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(
        JSON.stringify(
          {
            service: 'superapps-putri-automation',
            stage: 'Stage 3 — Automated PDF Report → Google Drive → WhatsApp',
            status: 'healthy',
            cronSchedule: '0 1 * * * (08:00 WIB)',
            timezone: 'Asia/Jakarta',
            todayWIB: getJakartaDateString(),
            timestampUTC: getNowIsoString(),
            pipeline: [
              '1. Ambil data project dari Firestore (office_projects)',
              '2. Format laporan PROYEK AKTIF',
              '3. Generate Landscape A4 PDF',
              '4. Upload PDF ke Google Drive & dapatkan link',
              '5. Kirim WhatsApp melalui Fonnte',
              '6. Catat log eksekusi ke D1 automation_logs'
            ]
          },
          null,
          2
        ),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Status inspection endpoint: inspect rule and last 10 logs from D1 (Protected)
    if (url.pathname === '/status') {
      const authHeader = request.headers.get('Authorization');
      const secretParam = url.searchParams.get('secret');
      const isAuthorized = env.CRON_SECRET
        ? authHeader === `Bearer ${env.CRON_SECRET}` || secretParam === env.CRON_SECRET
        : false;

      if (!isAuthorized) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized. Endpoint /status is protected. Provide Bearer token or ?secret=<CRON_SECRET>.'
          }, null, 2),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        const rule = await env.DB.prepare('SELECT * FROM automation_rules WHERE id = ?')
          .bind('project-report-daily')
          .first<AutomationRule>();

        const logs = await env.DB.prepare(
          'SELECT * FROM automation_logs ORDER BY started_at DESC LIMIT 10'
        ).all<AutomationLog>();

        return new Response(
          JSON.stringify(
            {
              rule,
              recentLogs: logs.results || []
            },
            null,
            2
          ),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || String(err) }, null, 2),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Manual trigger endpoint: test automation without waiting for 08:00 WIB (Strictly Protected)
    // Requires Bearer <CRON_SECRET> or ?secret=<CRON_SECRET> to prevent unauthorized public execution
    if (url.pathname === '/test-cron' || url.pathname === '/trigger') {
      const authHeader = request.headers.get('Authorization');
      const secretParam = url.searchParams.get('secret');
      const isAuthorized = env.CRON_SECRET
        ? authHeader === `Bearer ${env.CRON_SECRET}` || secretParam === env.CRON_SECRET
        : false;

      if (!isAuthorized) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Endpoint is protected. Set CRON_SECRET in Worker Secret and pass Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.'
          }, null, 2),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const force = url.searchParams.get('force') === 'true';
      try {
        const result = await runDailyProjectReportAutomation(env, force);
        return new Response(JSON.stringify(result, null, 2), {
          status: result.success ? 200 : 500,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify(
            {
              success: false,
              error: err?.message || String(err)
            },
            null,
            2
          ),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
