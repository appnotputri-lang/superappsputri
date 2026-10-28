import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime/response';
import { requireAuth, checkRole } from '../../../_lib/authGuard';
import { resolvePeopleD1 } from '../../../../src/lib/d1Client';
import { PeopleD1Repository } from '../../../../src/services/peopleD1Repository';

export const onRequestOptions = async () => handleOptions();

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const authRes = await requireAuth(request, env);
  if (authRes instanceof Response) return authRes;

  const roleCheck = checkRole(authRes.user, ['Super Admin', 'Admin', 'Staff']);
  if (roleCheck) return roleCheck;

  try {
    const db = resolvePeopleD1(context);
    const body = await request.json();
    const result = await PeopleD1Repository.linkCompany(db, authRes.user, body);
    return createJsonResponse({ success: true, ...result });
  } catch (err: any) {
    return createErrorResponse(err.message || 'Link company failed', err.statusCode || 500);
  }
};
