import { firestoreRest } from '../lib/firestore-rest';

export const WEBINAR_ADMIN_WHATSAPP_TARGET = '628122174848';

export interface WebinarNotificationPayload {
  name: string;
  whatsapp: string;
  email?: string;
  company?: string;
  position?: string;
  city?: string;
  attendance?: string;
  duration?: string;
  companyNeed?: string;
  topics?: string[] | string;
  followUp?: string;
  preferredContactTime?: string;
  createdAt?: string;
}

/**
 * Helper to fetch Fonnte Token from Firestore settings/whatsapp or environment variable
 */
export async function getFonnteTokenNode(env: any = process.env): Promise<string | null> {
  try {
    const doc = await firestoreRest.getDocument('settings', 'whatsapp', env);
    const token = doc?.token;
    if (token && typeof token === 'string' && token.trim()) {
      return token.trim();
    }
  } catch (err) {
    console.warn('[Fonnte] Gagal baca settings/whatsapp dari Firestore:', err);
  }
  return env?.FONNTE_TOKEN || null;
}

/**
 * Builds formatted plain-text WhatsApp message for Webinar Admin Notification
 */
export function buildWebinarAdminWhatsAppMessage(data: WebinarNotificationPayload): string {
  const name = data.name?.trim() || '-';
  const whatsapp = data.whatsapp?.trim() || '-';
  const email = data.email?.trim() || '-';
  const company = data.company?.trim() || '-';
  const position = data.position?.trim() || '-';
  const city = data.city?.trim() || '-';

  const attendance = data.attendance?.trim() || '-';
  const duration = data.duration?.trim() || '-';

  const companyNeed = data.companyNeed?.trim() || '-';

  let topicsStr = '-';
  if (Array.isArray(data.topics)) {
    topicsStr = data.topics.filter(Boolean).join(', ') || '-';
  } else if (typeof data.topics === 'string' && data.topics.trim()) {
    try {
      const parsed = JSON.parse(data.topics);
      if (Array.isArray(parsed)) {
        topicsStr = parsed.filter(Boolean).join(', ') || '-';
      } else {
        topicsStr = data.topics;
      }
    } catch {
      topicsStr = data.topics;
    }
  }

  const followUp = data.followUp?.trim() || '-';
  const preferredContactTime = data.preferredContactTime?.trim() || '-';

  let dateStr = '-';
  try {
    const d = data.createdAt ? new Date(data.createdAt) : new Date();
    dateStr = d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  } catch {
    dateStr = data.createdAt || '-';
  }

  return `🔔 PESERTA WEBINAR BARU

Nama: ${name}
WhatsApp: ${whatsapp}
Email: ${email}
Perusahaan: ${company}
Jabatan: ${position}
Kota: ${city}

KEHADIRAN
Status: ${attendance}
Durasi: ${duration}

KEBUTUHAN
${companyNeed}

TOPIK YANG DIMINATI
${topicsStr}

FOLLOW-UP
Bersedia dihubungi: ${followUp}
Waktu yang nyaman: ${preferredContactTime}

Tanggal Daftar:
${dateStr}`;
}

/**
 * Sends WhatsApp notification to admin after participant is successfully stored in Cloudflare D1.
 * Failure does NOT throw or interrupt participant registration.
 */
export async function sendWebinarAdminNotification(
  data: WebinarNotificationPayload,
  env: any = process.env
): Promise<void> {
  try {
    const FONNTE_TOKEN = await getFonnteTokenNode(env);
    if (!FONNTE_TOKEN) {
      console.warn('[WEBINAR] FONNTE_TOKEN tidak ditemukan. Melewati pengiriman WhatsApp admin.');
      return;
    }

    const message = buildWebinarAdminWhatsAppMessage(data);

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: WEBINAR_ADMIN_WHATSAPP_TARGET,
        message
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[WEBINAR] Gagal mengirim notifikasi WhatsApp:', errText);
    } else {
      const resJson: any = await response.json().catch(() => ({}));
      if (resJson?.status === false) {
        console.error('[WEBINAR] Gagal mengirim notifikasi WhatsApp (Fonnte status false):', resJson?.reason || resJson?.detail);
      }
    }
  } catch (error: any) {
    console.error('[WEBINAR] Gagal mengirim notifikasi WhatsApp:', error);
  }
}
