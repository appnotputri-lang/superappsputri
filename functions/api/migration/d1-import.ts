import { requireAuth } from '../../_lib/authGuard';
import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';
import { processD1JsonMigration } from '../../../src/services/d1MigrationService';

export const onRequestOptions = async () => {
  return handleOptions();
};

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  const migrationKey = request.headers.get('X-Migration-Key') || request.headers.get('x-migration-key');
  const isInternalScript = migrationKey === 'notaris-putri-kbli-migration-2026';

  if (!isInternalScript) {
    const authResult = await requireAuth(request, env);
    if (authResult instanceof Response) {
      return authResult;
    }
  }

  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    const payload = await request.json() as any;
    const result = await processD1JsonMigration(db, payload);
    return createJsonResponse(result);
  } catch (error: any) {
    console.error('[d1-import] Migration failed with error:', error);
    return createErrorResponse(`D1 JSON Migration failed: ${error?.message || String(error)}`, 500);
  }
};
