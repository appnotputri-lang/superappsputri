import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime';
import {
  getWebinarSettingsD1,
  createWebinarParticipantD1
} from '../../../../src/lib/d1WebinarRepository';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const body = await request.json().catch(() => ({}));

    // Honeypot check
    if (body.website || body.fax || body.hp_check || body.address_extra || body.company_url_hp) {
      return createJsonResponse({
        success: true,
        message: "Pendaftaran berhasil"
      });
    }

    const name = String(body.name || '').trim();
    if (!name || name.length < 2) {
      return createErrorResponse("Nama lengkap wajib diisi (minimal 2 karakter)", 400);
    }

    const rawWhatsapp = String(body.whatsapp || '').trim();
    const cleanWhatsapp = rawWhatsapp.replace(/[^0-9]/g, '');
    if (!cleanWhatsapp || cleanWhatsapp.length < 8) {
      return createErrorResponse("Nomor WhatsApp tidak valid (minimal 8 digit angka)", 400);
    }

    const email = body.email ? String(body.email).trim() : undefined;
    if (email && (email.length > 120 || !email.includes('@'))) {
      return createErrorResponse("Format email tidak valid", 400);
    }

    const attendance = String(body.attendance || 'Ya, mengikuti').trim();
    const webinarId = String(body.webinarId || 'default').trim();
    const settings = await getWebinarSettingsD1(db, webinarId);

    if (!settings.isActive) {
      return createErrorResponse("Pendaftaran untuk webinar ini telah ditutup.", 400);
    }

    const topics = Array.isArray(body.topics)
      ? body.topics.map((t: any) => String(t).slice(0, 100)).slice(0, 20)
      : [];

    const participant = await createWebinarParticipantD1(db, {
      webinarId,
      name: name.slice(0, 100),
      whatsapp: cleanWhatsapp.slice(0, 20),
      email: email ? email.slice(0, 120) : undefined,
      company: body.company ? String(body.company).slice(0, 120).trim() : undefined,
      position: body.position ? String(body.position).slice(0, 100).trim() : undefined,
      city: body.city ? String(body.city).slice(0, 100).trim() : undefined,
      attendance: attendance === 'Tidak' ? 'Tidak' : 'Ya, mengikuti',
      duration: attendance === 'Ya, mengikuti' && body.duration ? String(body.duration).slice(0, 50) : undefined,
      companyNeed: body.companyNeed ? String(body.companyNeed).slice(0, 100) : undefined,
      topics,
      followUp: body.followUp === 'Tidak untuk saat ini' ? 'Tidak untuk saat ini' : 'Ya, silakan hubungi saya',
      preferredContactTime: body.followUp === 'Ya, silakan hubungi saya' && body.preferredContactTime 
        ? String(body.preferredContactTime).slice(0, 50) 
        : undefined,
      leadStatus: 'baru',
      ipAddress: clientIp.slice(0, 60),
      userAgent: (request.headers.get('user-agent') || '').slice(0, 200)
    });

    const materialUrl = settings.materialUrl?.trim() || 'https://drive.google.com';

    return createJsonResponse({
      success: true,
      message: "Pendaftaran berhasil disimpan",
      participantId: participant.id,
      materialUrl
    }, 201);
  } catch (error: any) {
    console.error("[CF Webinar Register API] Error:", error);
    return createErrorResponse(error?.message || "Gagal memproses pendaftaran", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
