import { createJsonResponse, createErrorResponse, handleOptions } from '../../../../../src/runtime/response';
import { requireAuth, checkRole } from '../../../../_lib/authGuard';
import { resolvePeopleD1 } from '../../../../../src/lib/d1Client';
import { PeopleD1Repository, cleanPassportInput } from '../../../../../src/services/peopleD1Repository';

export const onRequestOptions = async () => handleOptions();

export const onRequestGet = async (context: any) => {
  const { request, env, params } = context;
  const authRes = await requireAuth(request, env);
  if (authRes instanceof Response) return authRes;

  const roleCheck = checkRole(authRes.user, ['Super Admin', 'Admin', 'Staff']);
  if (roleCheck) return roleCheck;

  try {
    const db = resolvePeopleD1(context);
    const cleanPassport = cleanPassportInput(params.docNumber);
    if (!cleanPassport) {
      return createErrorResponse('Nomor paspor tidak valid', 400);
    }

    const result = await PeopleD1Repository.getPersonByPassport(db, cleanPassport);
    if (!result) {
      return createErrorResponse(`Person not found for Passport: ${cleanPassport}`, 404);
    }

    return createJsonResponse({
      success: true,
      matchedDocument: result.matchedDocument,
      person: result.person
    });
  } catch (err: any) {
    return createErrorResponse(err.message || 'Lookup by Passport failed', err.statusCode || 500);
  }
};
