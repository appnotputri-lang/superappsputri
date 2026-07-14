import { getEnv, createErrorResponse, createJsonResponse, handleOptions } from '../../src/runtime';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return createErrorResponse('Invalid JSON body', 400);
  }

  const { target, message } = body;
  const FONNTE_TOKEN = getEnv(env, 'FONNTE_TOKEN');

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
    return createJsonResponse(data);
  } catch (error: any) {
    console.error("WhatsApp Send Error:", error);
    return createErrorResponse("Failed to send WhatsApp message", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
