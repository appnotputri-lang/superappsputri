import { requireAuth, checkRole } from '../_lib/authGuard';
import { createErrorResponse, createJsonResponse, handleOptions } from '../../src/runtime';
import { ensurePublicFormSubmissionsTable, listPublicFormSubmissions } from '../../src/lib/d1PublicFormRepository';

export const onRequestGet = async ({ request, env }: any) => {
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) return authResult;

  const roleError = checkRole(authResult.user, ['Super Admin', 'Admin', 'Staff']);
  if (roleError) return roleError;
  if (!env?.DB) return createErrorResponse('Penyimpanan formulir sedang tidak tersedia.', 503);

  try {
    await ensurePublicFormSubmissionsTable(env.DB);
    const url = new URL(request.url);
    const result = await listPublicFormSubmissions(env.DB, {
      search: url.searchParams.get('search') || '',
      limit: Number(url.searchParams.get('limit') || 50),
      offset: Number(url.searchParams.get('offset') || 0)
    });
    return createJsonResponse({ success: true, ...result });
  } catch (error: any) {
    console.error('[PublicForm] Failed to list submissions:', error?.name || 'StorageError');
    return createErrorResponse('Gagal memuat hasil formulir.', 500);
  }
};

export const onRequestOptions = async () => handleOptions();
