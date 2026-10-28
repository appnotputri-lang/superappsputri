import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../../src/runtime/response';
import { requireAuth, checkRole } from '../../../../_lib/authGuard';
import { resolvePeopleD1 } from '../../../../../src/lib/d1Client';
import { PeopleD1Repository } from '../../../../../src/services/peopleD1Repository';

export const onRequestOptions = async () => handleOptions();

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const authRes = await requireAuth(request, env);
  if (authRes instanceof Response) return authRes;

  // Restricted to Admin and Super Admin
  const roleCheck = checkRole(authRes.user, ['Super Admin', 'Admin']);
  if (roleCheck) return roleCheck;

  try {
    const db = resolvePeopleD1(context);
    const conflicts = await PeopleD1Repository.getConflicts(db, authRes.user);
    return createJsonResponse({ success: true, conflicts });
  } catch (err: any) {
    return createErrorResponse(err.message || 'Get conflicts failed', err.statusCode || 500);
  }
};
