import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { getVapidKeys } from '../../../src/services/pushBackend';

export const onRequestGet = async (context: any) => {
  const { env } = context;
  try {
    const vapid = getVapidKeys(env);
    if (!vapid?.publicKey) {
      return createErrorResponse("Push notification service is not configured", 500);
    }
    return createJsonResponse({ publicKey: vapid.publicKey });
  } catch (error: any) {
    console.error("[CF Push API] Error getting VAPID public key:", error);
    return createErrorResponse("Push notification service is not configured", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
