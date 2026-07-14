import { extractBearerToken, verifyIdToken } from '../../src/runtime/auth';
import { createErrorResponse } from '../../src/runtime/response';

export async function requireAuth(request: Request, env: any): Promise<{ user: any } | Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Missing or invalid Authorization header', 401);
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return createErrorResponse('Missing or invalid Authorization header', 401);
  }

  try {
    const verifiedUser = await verifyIdToken(token, env);
    return { user: verifiedUser };
  } catch (error: any) {
    console.error('[AuthGuard] Verification failed:', error);
    return createErrorResponse(
      `Invalid or expired Firebase ID token: ${error.message || String(error)}`,
      401,
      error.message || String(error)
    );
  }
}
