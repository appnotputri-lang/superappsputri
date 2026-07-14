import { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from '../runtime/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    email_verified?: boolean;
    role?: string;
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const verifiedUser = await verifyIdToken(token, process.env);
    req.user = verifiedUser;
    next();
  } catch (error: any) {
    console.error('[AuthMiddleware] Verification failed:', error);
    return res.status(401).json({ 
      error: `Invalid or expired Firebase ID token: ${error.message || String(error)}`, 
      details: error.message || String(error)
    });
  }
}
