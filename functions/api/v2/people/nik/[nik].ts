import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../../src/runtime/response';
import { requireAuth, checkRole } from '../../../../_lib/authGuard';
import { resolvePeopleD1 } from '../../../../../src/lib/d1Client';
import { PeopleD1Repository, cleanNikInput } from '../../../../../src/services/peopleD1Repository';

export const onRequestOptions = async () => handleOptions();

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  const authRes = await requireAuth(request, env);
  if (authRes instanceof Response) return authRes;

  const roleCheck = checkRole(authRes.user, ['Super Admin', 'Admin', 'Staff']);
  if (roleCheck) return roleCheck;

  try {
    const db = resolvePeopleD1(context);
    const cleanNik = cleanNikInput(params.nik);
    if (!cleanNik) {
      return createErrorResponse('NIK parameter harus berupa string angka valid', 400);
    }

    const person = await PeopleD1Repository.getPersonByNik(db, cleanNik);
    if (!person) {
      return createErrorResponse(`Person not found for NIK: ${cleanNik}`, 404);
    }

    return createJsonResponse({ success: true, person });
  } catch (err: any) {
    return createErrorResponse(err.message || 'Lookup by NIK failed', err.statusCode || 500);
  }
};
