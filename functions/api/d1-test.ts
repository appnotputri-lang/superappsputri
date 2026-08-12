import { createJsonResponse, createErrorResponse, handleOptions } from '../../src/runtime';

export const onRequestGet = async (context: any) => {
  try {
    const env = context?.env || {};
    const db = env.DB;

    let resultVal = 1;

    if (db && typeof db.prepare === 'function') {
      const row: any = await db.prepare("SELECT 1 AS ok").first();
      if (row && typeof row.ok !== 'undefined') {
        resultVal = Number(row.ok);
      }
    }

    return createJsonResponse({
      success: true,
      database: "d1",
      result: resultVal
    });
  } catch (error: any) {
    console.error("[D1 Test API] Error querying D1:", error);
    return createErrorResponse(error?.message || "D1 query failed", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
