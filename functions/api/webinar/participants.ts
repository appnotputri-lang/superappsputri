import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import {
  getAllWebinarParticipantsD1,
  createWebinarParticipantD1
} from '../../../src/lib/d1WebinarRepository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const url = new URL(request.url);
    const webinarId = url.searchParams.get('webinarId') || 'all';
    const search = url.searchParams.get('search') || url.searchParams.get('q') || undefined;
    const leadStatus = url.searchParams.get('leadStatus') || undefined;
    const attendance = url.searchParams.get('attendance') || undefined;
    const companyNeed = url.searchParams.get('companyNeed') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 50;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : 0;

    const result = await getAllWebinarParticipantsD1(db, {
      webinarId,
      search,
      leadStatus,
      attendance,
      companyNeed,
      limit,
      offset
    });

    return createJsonResponse({
      success: true,
      participants: result.participants,
      total: result.total,
      limit,
      offset
    });
  } catch (error: any) {
    console.error("[CF Webinar Participants API] Error:", error);
    return createErrorResponse(error?.message || "Failed to fetch webinar participants", 500);
  }
};

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const body = await request.json();
    const result = await createWebinarParticipantD1(db, body);
    return createJsonResponse({
      success: true,
      participant: result
    }, 201);
  } catch (error: any) {
    console.error("[CF Webinar Create Participant API] Error:", error);
    return createErrorResponse(error?.message || "Failed to create participant", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
