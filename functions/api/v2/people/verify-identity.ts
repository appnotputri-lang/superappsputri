import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../src/runtime/response';
import { requireAuth, checkRole } from '../../../_lib/authGuard';
import { resolvePeopleD1 } from '../../../../src/lib/d1Client';
import { PeopleD1Repository } from '../../../../src/services/peopleD1Repository';

export const onRequestOptions = async () => handleOptions();

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const authRes = await requireAuth(request, env);
  if (authRes instanceof Response) return authRes;

  // Strictly restricted to Admin and Super Admin
  const roleCheck = checkRole(authRes.user, ['Super Admin', 'Admin']);
  if (roleCheck) return roleCheck;

  try {
    const db = resolvePeopleD1(context);
    const body = await request.json();
    const { personId, notes } = body || {};

    if (!personId) {
      return createErrorResponse('personId wajib disertakan', 400);
    }

    const result = await PeopleD1Repository.verifyIdentity(db, authRes.user, personId, notes);
    return createJsonResponse({ success: true, ...result });
  } catch (err: any) {
    return createErrorResponse(err.message || 'Verify identity failed', err.statusCode || 500);
  }
};
