/**
 * Centralized People Database V2 Express API Routes
 * Implements strict security, RBAC, WNA Passport tracking, and Conflict Quarantine.
 * Single Source of Truth for Master Identity: Cloudflare D1 via resolvePeopleD1 adapter.
 */

import { Router, Response, NextFunction } from 'express';
import { resolvePeopleD1 } from '../lib/d1Client';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { PeopleD1Repository, cleanNikInput, cleanPassportInput } from '../services/peopleD1Repository';

export const peopleV2Router = Router();

// Apply authMiddleware to all /api/v2/people routes
peopleV2Router.use(authMiddleware);

/**
 * RBAC Helper Middleware
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN: Pengguna tidak memiliki peran (role) yang terdaftar.'
      });
    }
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `FORBIDDEN: Akses ditolak. Kewenangan peran tidak memadai.`
      });
    }
    next();
  };
}

// ============================================================================
// 1. GET /api/v2/people/nik/:nik
// Allowed: Staff, Admin, Super Admin
// ============================================================================
peopleV2Router.get('/nik/:nik', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const cleanNik = cleanNikInput(req.params.nik);
    if (!cleanNik) {
      return res.status(400).json({ success: false, error: 'NIK parameter harus berupa string angka' });
    }

    const person = await PeopleD1Repository.getPersonByNik(db, cleanNik);
    if (!person) {
      return res.status(404).json({ success: false, error: `Person not found for NIK: ${cleanNik}` });
    }

    res.json({ success: true, person });
  } catch (err: any) {
    console.error('[PeopleV2 API] Lookup by NIK failed:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err?.message || 'Lookup by NIK failed' });
  }
});

// ============================================================================
// 2. GET /api/v2/people/passport/:docNumber
// Allowed: Staff, Admin, Super Admin
// ============================================================================
peopleV2Router.get('/passport/:docNumber', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const cleanPassport = cleanPassportInput(req.params.docNumber);
    if (!cleanPassport) {
      return res.status(400).json({ success: false, error: 'Nomor paspor tidak valid' });
    }

    const result = await PeopleD1Repository.getPersonByPassport(db, cleanPassport);
    if (!result) {
      return res.status(404).json({ success: false, error: `Person not found for Passport: ${cleanPassport}` });
    }

    res.json({
      success: true,
      matchedDocument: result.matchedDocument,
      person: result.person
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Lookup by Passport failed:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err?.message || 'Lookup by Passport failed' });
  }
});

// ============================================================================
// 3. GET /api/v2/people and GET /api/v2/people/search
// Allowed: Staff, Admin, Super Admin
// ============================================================================
const handlePeopleSearch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const result = await PeopleD1Repository.searchPeople(db, {
      search: (req.query.q || req.query.search) as string,
      limit: parseInt(String(req.query.limit || '20')),
      offset: parseInt(String(req.query.offset || '0')),
      nationalityType: req.query.nationalityType as string,
      identityStatus: req.query.identityStatus as string,
      hasCompany: req.query.hasCompany as string,
      roleCategory: req.query.roleCategory as string,
      includeSummary: req.query.includeSummary !== 'false'
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[PeopleV2 API] Search failed:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err?.message || 'Search failed' });
  }
};

peopleV2Router.get('/', requireRoles('Super Admin', 'Admin', 'Staff'), handlePeopleSearch);
peopleV2Router.get('/search', requireRoles('Super Admin', 'Admin', 'Staff'), handlePeopleSearch);

// ============================================================================
// 4. GET /api/v2/people/:personId/roles
// Allowed: Staff, Admin, Super Admin
// ============================================================================
peopleV2Router.get('/:personId/roles', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const personId = String(req.params.personId);
    const roles = await PeopleD1Repository.getPersonRoles(db, personId);

    res.json({ success: true, personId, roles });
  } catch (err: any) {
    console.error('[PeopleV2 API] Get roles failed:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err?.message || 'Get roles failed' });
  }
});

// ============================================================================
// 5. GET /api/v2/people/:personId
// Allowed: Staff, Admin, Super Admin
// ============================================================================
peopleV2Router.get('/:personId', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const personId = String(req.params.personId);
    const person = await PeopleD1Repository.getPersonById(db, personId);
    if (!person) {
      return res.status(404).json({ success: false, error: `Person not found: ${personId}` });
    }

    res.json({ success: true, person });
  } catch (err: any) {
    console.error('[PeopleV2 API] Get person failed:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err?.message || 'Get person failed' });
  }
});

// ============================================================================
// 6. POST /api/v2/people
// Registration & Updates
// ============================================================================
peopleV2Router.post('/', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const user = {
      uid: req.user?.uid || 'system',
      role: req.user?.role || 'Staff',
      email: req.user?.email
    };

    const result = await PeopleD1Repository.savePerson(db, user, req.body || {});
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[PeopleV2 API] Save failed:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err?.message || 'Save person failed',
      ...(err.conflictId ? { conflictId: err.conflictId } : {})
    });
  }
});

// ============================================================================
// 7. POST /api/v2/people/:personId/passport/renew
// WNA Passport Renewal (Atomic via db.batch)
// ============================================================================
peopleV2Router.post('/:personId/passport/renew', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const user = {
      uid: req.user?.uid || 'system',
      role: req.user?.role || 'Staff',
      email: req.user?.email
    };

    const personId = String(req.params.personId);
    const result = await PeopleD1Repository.renewPassport(db, user, personId, req.body || {});

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[PeopleV2 API] Passport renewal failed:', err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: err?.message || 'Passport renewal failed',
      ...(err.conflictId ? { conflictId: err.conflictId } : {})
    });
  }
});

// ============================================================================
// 8. POST /api/v2/people/verify-identity
// Verify identity (Admin & Super Admin only)
// ============================================================================
peopleV2Router.post('/verify-identity', requireRoles('Super Admin', 'Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const user = {
      uid: req.user?.uid || 'admin',
      role: req.user?.role || 'Admin',
      email: req.user?.email
    };

    const { personId, notes } = req.body || {};
    if (!personId) {
      return res.status(400).json({ success: false, error: 'personId wajib disertakan' });
    }

    const result = await PeopleD1Repository.verifyIdentity(db, user, personId, notes);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[PeopleV2 API] Verify identity failed:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err?.message || 'Verify identity failed' });
  }
});

// ============================================================================
// 9. GET /api/v2/people/conflicts
// List unresolved identity conflicts (Admin & Super Admin only)
// ============================================================================
peopleV2Router.get('/conflicts', requireRoles('Super Admin', 'Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const user = {
      uid: req.user?.uid || 'admin',
      role: req.user?.role || 'Admin'
    };

    const conflicts = await PeopleD1Repository.getConflicts(db, user);
    res.json({ success: true, conflicts });
  } catch (err: any) {
    console.error('[PeopleV2 API] Get conflicts failed:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err?.message || 'Get conflicts failed' });
  }
});

// ============================================================================
// 10. POST /api/v2/people/conflicts/:conflictId/resolve
// Resolve an identity conflict (Admin & Super Admin only)
// ============================================================================
peopleV2Router.post('/conflicts/:conflictId/resolve', requireRoles('Super Admin', 'Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const user = {
      uid: req.user?.uid || 'admin',
      role: req.user?.role || 'Admin'
    };

    const result = await PeopleD1Repository.resolveConflict(db, user, String(req.params.conflictId), req.body || {});
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[PeopleV2 API] Resolve conflict failed:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err?.message || 'Resolve conflict failed' });
  }
});

// ============================================================================
// 11. POST /api/v2/people/link-company
// Link a person to a company (Proyeksi Indeks Relasi Turunan)
// ============================================================================
peopleV2Router.post('/link-company', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = resolvePeopleD1(req);
    const user = {
      uid: req.user?.uid || 'system',
      role: req.user?.role || 'Staff'
    };

    const body = req.body || {};
    if (Array.isArray(body) || (body && Array.isArray(body.roles))) {
      const rolesList = Array.isArray(body) ? body : body.roles;
      const result = await PeopleD1Repository.linkCompanyBatch(db, user, rolesList);
      return res.json({ success: true, ...result });
    }

    const result = await PeopleD1Repository.linkCompany(db, user, body);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[PeopleV2 API] Link company failed:', err);
    res.status(err.statusCode || 500).json({ success: false, error: err?.message || 'Link company failed' });
  }
});
