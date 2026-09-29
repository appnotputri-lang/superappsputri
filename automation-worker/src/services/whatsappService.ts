import { Env, ProjectReportItem } from '../types';
import { getDocumentFromFirestore, getGroupedReports, getStatusCategory, formatAgendaLabel, getProjectStatusDisplay } from './firestoreService';
import { getJakartaFormattedDate } from '../dateUtils';

export async function getFonnteToken(env: Env): Promise<string | null> {
  // 1. Priority: Cloudflare Worker Secret (FONNTE_TOKEN)
  if (env.FONNTE_TOKEN && typeof env.FONNTE_TOKEN === 'string' && env.FONNTE_TOKEN.trim()) {
    return env.FONNTE_TOKEN.trim();
  }

  // 2. Fallback: Firestore document settings/whatsapp
  try {
    const doc = await getDocumentFromFirestore('settings', 'whatsapp', env);
    if (doc?.token && typeof doc.token === 'string' && doc.token.trim()) {
      return doc.token.trim();
    }
  } catch (err) {
    console.warn('[WhatsAppService] Could not read settings/whatsapp from Firestore:', err);
  }

  return null;
}

export async function getAutomationRecipient(ruleRecipient: string | null | undefined, env: Env): Promise<string | null> {
  if (ruleRecipient && ruleRecipient.trim()) {
    return ruleRecipient.trim();
  }

  try {
    const doc = await getDocumentFromFirestore('settings', 'whatsapp', env);
    if (doc?.nomorTujuanDefault && typeof doc.nomorTujuanDefault === 'string' && doc.nomorTujuanDefault.trim()) {
      return doc.nomorTujuanDefault.trim();
    }
    if (doc?.nomorAdmin && typeof doc.nomorAdmin === 'string' && doc.nomorAdmin.trim()) {
      return doc.nomorAdmin.trim();
    }
  } catch (err) {
    console.warn('[WhatsAppService] Could not read recipient from settings/whatsapp:', err);
  }

  return env.AUTOMATION_WHATSAPP_TARGET?.trim() || null;
}

/**
 * Builds formatted plain-text WhatsApp message with Google Drive PDF link
 * mengikuti format baku yang ditentukan.
 */
export function buildWhatsAppReportMessage(
  reports: ProjectReportItem[],
  drivePdfUrl: string,
  date: Date = new Date()
): string {
  // Hitung tanggal WIB menggunakan sumber kebenaran timezone Asia/Jakarta
  const todayStr = getJakartaFormattedDate(date);

  // Hitung jumlah berkas aktual & jumlah klien aktual
  const totalBerkas = reports.length;
  const groupedClients = getGroupedReports(reports);
  const totalKlien = groupedClients.length;

  let msg = `📋 LAPORAN PROYEK AKTIF\n\n`;
  msg += `🏢 Kantor Notaris Nukantini Putri Parincha SH., M.Kn.\n\n`;
  msg += `📅 ${todayStr}\n`;
  msg += `⏰ Update 08.00 WIB\n\n`;
  msg += `📊 RINGKASAN\n`;
  msg += `• ${totalKlien} Klien\n`;
  msg += `• ${totalBerkas} Berkas\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `📄 LAPORAN LENGKAP\n\n`;
  msg += `Laporan proyek aktif hari ini sudah tersedia.\n\n`;
  msg += `🔗 Buka PDF:\n`;
  msg += `${drivePdfUrl}\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;
  msg += `🤖 Dikirim otomatis oleh\n`;
  msg += `SuperApps Putri`;

  return msg.trim();
}

export interface SendWhatsAppResult {
  success: boolean;
  target: string;
  responseRaw?: any;
  error?: string;
}

/**
 * Sends formatted WhatsApp message via Fonnte Gateway
 */
export async function sendWhatsAppViaFonnte(
  target: string,
  message: string,
  env: Env
): Promise<SendWhatsAppResult> {
  const token = await getFonnteToken(env);
  if (!token) {
    throw new Error('FONNTE_TOKEN is not configured in Firestore settings/whatsapp or environment.');
  }

  const cleanTarget = target.trim();
  const response = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      target: cleanTarget,
      message
    })
  });

  const resText = await response.text();
  let resData: any;
  try {
    resData = JSON.parse(resText);
  } catch (e) {
    resData = { error: resText };
  }

  // Sanitize any sensitive fields if present in provider response
  const sanitizedResponse = typeof resData === 'object' && resData !== null
    ? {
        status: resData.status,
        target: resData.target,
        id: resData.id,
        detail: resData.detail,
        reason: resData.reason,
        message: resData.message
      }
    : { raw: String(resData).slice(0, 200) };

  const isSuccess = response.ok && resData?.status === true;
  return {
    success: isSuccess,
    target: cleanTarget,
    responseRaw: sanitizedResponse,
    error: isSuccess ? undefined : (resData?.reason || resData?.detail || resData?.message || `HTTP ${response.status}`)
  };
}
