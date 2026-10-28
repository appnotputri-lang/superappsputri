import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../../src/runtime/response';
import { requireAuth, checkRole } from '../../../../_lib/authGuard';
import { resolvePeopleD1 } from '../../../../../src/lib/d1Client';
import { PeopleD1Repository } from '../../../../../src/services/peopleD1Repository';

export const onRequestOptions = async () => handleOptions();

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  const authRes = await requireAuth(request, env);
  if (authRes instanceof Response) return authRes;

  const roleCheck = checkRole(authRes.user, ['Super Admin', 'Admin', 'Staff']);
  if (roleCheck) return roleCheck;

  try {
    const db = resolvePeopleD1(context);
    const personId = String(params.personId);
    const roles = await PeopleD1Repository.getPersonRoles(db, personId);

    return createJsonResponse({ success: true, personId, roles });
  } catch (err: any) {
    return createErrorResponse(err.message || 'Get roles failed', err.statusCode || 500);
  }
};
