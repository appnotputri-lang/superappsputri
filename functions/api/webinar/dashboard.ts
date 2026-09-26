import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { getWebinarStatsD1, getAllWebinarParticipantsD1 } from '../../../src/lib/d1WebinarRepository';

export const onRequestGet = async (context: any) => {
  const { env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const stats = await getWebinarStatsD1(db, 'default');
    const { participants: recentParticipants } = await getAllWebinarParticipantsD1(db, {
      webinarId: 'default',
      limit: 10
    });

    return createJsonResponse({
      success: true,
      stats,
      recentParticipants
    });
  } catch (error: any) {
    console.error("[CF Webinar Dashboard API] Error:", error);
    return createErrorResponse(error?.message || "Failed to fetch webinar dashboard", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
