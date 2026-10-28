import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime/response';
import { requireAuth, checkRole } from '../../../_lib/authGuard';
import { resolvePeopleD1 } from '../../../../src/lib/d1Client';
import { PeopleD1Repository } from '../../../../src/services/peopleD1Repository';

export const onRequestOptions = async () => handleOptions();

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const authRes = await requireAuth(request, env);
  if (authRes instanceof Response) return authRes;

  const roleCheck = checkRole(authRes.user, ['Super Admin', 'Admin', 'Staff']);
  if (roleCheck) return roleCheck;

  try {
    const db = resolvePeopleD1(context);
    const url = new URL(request.url);
    const search = url.searchParams.get('q') || url.searchParams.get('search') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const nationalityType = url.searchParams.get('nationalityType') || undefined;

    const result = await PeopleD1Repository.searchPeople(db, { search, limit, offset, nationalityType });
    return createJsonResponse({ success: true, ...result });
  } catch (err: any) {
    return createErrorResponse(err.message || 'Search failed', err.statusCode || 500);
  }
};
