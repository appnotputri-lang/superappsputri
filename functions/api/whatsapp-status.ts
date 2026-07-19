import { requireAuth } from '../_lib/authGuard';
import { getFonnteToken } from '../_lib/fonnteToken';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../src/runtime';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) return authResult;

  let body: any = {};
  try {
    body = await request.json();
  } catch (err) {
    // Ignore body parse error as body/token might be optional if already saved
  }

  let token = body?.token;
  if (!token || typeof token !== 'string' || !token.trim()) {
    token = await getFonnteToken(env);
  }

  if (!token) {
    return createErrorResponse('Token Fonnte belum diatur di Pengaturan.', 400);
  }

  try {
    const res = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: token },
    });
    const data = (await res.json()) as any;

    if (data.status !== true) {
      return createJsonResponse({ 
        connected: false, 
        message: data.reason || 'Token tidak valid atau device tidak ditemukan.' 
      });
    }

    return createJsonResponse({
      connected: data.device_status === 'connect',
      device_status: data.device_status,
      message: data.device_status === 'connect' 
        ? `Terhubung sebagai ${data.device || data.name}` 
        : 'Device terputus, scan ulang QR di dashboard Fonnte.',
    });
  } catch (err: any) {
    console.error('[WhatsApp Status] Error:', err);
    return createErrorResponse('Gagal menghubungi server Fonnte.', 500);
  }
};

export const onRequestOptions = async () => handleOptions();
