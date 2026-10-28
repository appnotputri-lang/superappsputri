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

  // In isolated test environments (NODE_ENV === 'test'), permit test user injection
  if (process.env.NODE_ENV === 'test' && env?.TEST_AUTH_USER) {
    return { user: env.TEST_AUTH_USER };
  }

  try {
    const verifiedUser = await verifyIdToken(token, env);
    return { user: verifiedUser };
  } catch (error: any) {
    // Sanitize log: do not log token or sensitive headers
    console.error('[AuthGuard] Verification failed:', error?.name || 'AuthenticationError');
    // Sanitize client error: never leak stack traces, tokens, or raw library error strings
    return createErrorResponse('Unauthorized: Invalid or expired authentication token', 401);
  }
}

export function checkRole(user: any, allowedRoles: string[]): Response | null {
  const role = user?.role;
  if (!role) {
    return createErrorResponse('FORBIDDEN: Pengguna tidak memiliki peran (role) yang terdaftar.', 403);
  }
  if (!allowedRoles.includes(role)) {
    return createErrorResponse('FORBIDDEN: Akses ditolak. Kewenangan peran tidak memadai.', 403);
  }
  return null;
}
