import { requireAuth } from '../_lib/authGuard';
import { getFonnteToken } from '../_lib/fonnteToken';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../src/runtime';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) return authResult;

  const token = await getFonnteToken(env);
  if (!token) return createErrorResponse('Token Fonnte belum diatur di Pengaturan.', 400);

  try {
    const res = await fetch('https://api.fonnte.com/fetch-group', {
      method: 'POST',
      headers: { Authorization: token },
    });
    const data = (await res.json()) as any;

    return createJsonResponse({
      success: data.status === true,
      message: data.status === true ? 'Sinkronisasi berhasil.' : (data.detail || 'Sinkronisasi gagal.'),
    });
  } catch (err: any) {
    console.error('[WhatsApp Groups Sync] Error:', err);
    return createErrorResponse('Gagal menghubungi server Fonnte.', 500);
  }
};

export const onRequestOptions = async () => handleOptions();
