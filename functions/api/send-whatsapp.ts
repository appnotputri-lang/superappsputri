import { requireAuth } from '../_lib/authGuard';
import { getFonnteToken } from '../_lib/fonnteToken';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../src/runtime';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  // 1. Perform authentication
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return createErrorResponse('Invalid JSON body', 400);
  }

  const { target, message } = body;
  const FONNTE_TOKEN = await getFonnteToken(env);

  if (!FONNTE_TOKEN) {
    return createErrorResponse('FONNTE_TOKEN is not configured', 500);
  }


  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        message,
      }),
    });

    const data = await response.json();
    return createJsonResponse({
      success: data.status === true,
      error: data.status === true ? undefined : (data.reason || data.detail || 'Gagal mengirim pesan.'),
      detail: data.detail,
      id: data.id,
      target: data.target,
      raw: data, // simpan raw response asli buat debugging jika diperlukan
    });
  } catch (error: any) {
    console.error("WhatsApp Send Error:", error);
    return createErrorResponse("Failed to send WhatsApp message", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
