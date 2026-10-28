import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../../../src/runtime/response';
import { requireAuth, checkRole } from '../../../../../_lib/authGuard';
import { resolvePeopleD1 } from '../../../../../../src/lib/d1Client';
import { PeopleD1Repository } from '../../../../../../src/services/peopleD1Repository';

export const onRequestOptions = async () => handleOptions();

export const onRequestPost = async (context: any) => {
  const { request, env, params } = context;
  const authRes = await requireAuth(request, env);
  if (authRes instanceof Response) return authRes;

  const roleCheck = checkRole(authRes.user, ['Super Admin', 'Admin', 'Staff']);
  if (roleCheck) return roleCheck;

  try {
    const db = resolvePeopleD1(context);
    const personId = String(params.personId);
    const body = await request.json();

    const result = await PeopleD1Repository.renewPassport(db, authRes.user, personId, body);
    return createJsonResponse({ success: true, ...result });
  } catch (err: any) {
    return createErrorResponse(
      err.message || 'Passport renewal failed',
      err.statusCode || 500,
      err.conflictId ? `conflictId:${err.conflictId}` : undefined
    );
  }
};
