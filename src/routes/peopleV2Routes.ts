/**
 * Centralized People Database V2 API Routes
 * Implements strict security, RBAC, WNA Passport tracking, and Conflict Quarantine.
 * Single Source of Truth for Master Identity: Cloudflare D1.
 */

import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getLocalD1Database } from '../lib/sqlite-d1';
import { ensureD1TablesExist } from '../services/d1MigrationService';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { parsePersonName, evaluateNameCompatibility } from '../utils/nameResolution';

export const peopleV2Router = Router();

// Apply authMiddleware to all /api/v2/people routes
peopleV2Router.use(authMiddleware);

/**
 * RBAC Helper Middleware
 */
export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role || 'Staff';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `FORBIDDEN: Peran '${userRole}' tidak diizinkan mengakses resource ini. Diperlukan peran: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
}

/**
 * Normalizes NIK into pure numeric string
 */
function cleanNikInput(nik?: any): string | null {
  if (!nik) return null;
  const str = String(nik).trim().replace(/\D/g, '');
  return str.length > 0 ? str : null;
}

/**
 * Normalizes Passport Number
 */
function cleanPassportInput(passport?: any): string | null {
  if (!passport) return null;
  const str = String(passport).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return str.length > 0 ? str : null;
}

/**
 * Helper to fetch documents for a person
 */
async function getPersonDocuments(db: any, personId: string) {
  const queryRes = await db.prepare(`
    SELECT * FROM person_identity_documents
    WHERE person_id = ?
    ORDER BY is_active DESC, created_at DESC
  `).bind(personId).all();

  return (queryRes.results || []).map((row: any) => ({
    id: row.id,
    personId: row.person_id,
    docType: row.doc_type,
    docNumber: row.doc_number,
    issuingCountry: row.issuing_country,
    issueDate: row.issue_date,
    expiryDate: row.expiry_date,
    isActive: Boolean(row.is_active),
    verifiedStatus: row.verified_status,
    verifiedByUid: row.verified_by_uid,
    verifiedAt: row.verified_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * Helper to fetch company roles for a person
 */
async function getPersonRoles(db: any, personId: string) {
  const queryRes = await db.prepare(`
    SELECT * FROM company_person_roles
    WHERE person_id = ?
    ORDER BY updated_at DESC
  `).bind(personId).all();

  return (queryRes.results || []).map((row: any) => ({
    id: row.id,
    personId: row.person_id,
    companyId: row.company_id,
    clientType: row.client_type,
    companyName: row.company_name,
    roleCategory: row.role_category,
    positionTitle: row.position_title,
    sourceRecordId: row.source_record_id,
    updatedAt: row.updated_at
  }));
}

/**
 * Helper to map SQLite row to Person object
 */
function mapPersonRow(row: any, documents: any[] = [], companyRoles: any[] = []) {
  let rawData: any = {};
  try { if (row.raw_data) rawData = JSON.parse(row.raw_data); } catch (e) {}

  const activePassport = documents.find(d => d.docType === 'PASSPORT' && d.isActive);

  return {
    personId: row.person_id,
    nik: row.nik,
    identityStatus: row.identity_status || 'PROVISIONAL',
    nationalityType: row.nationality_type || (row.nik ? 'WNI' : 'WNA'),
    nationality: row.nationality || (row.nationality_type === 'WNA' ? '' : 'INDONESIA'),
    name: row.name,
    salutation: row.salutation || 'Tuan',
    sapaan: row.salutation || 'Tuan',
    birthCity: row.birth_city || '',
    birthPlace: row.birth_city || '',
    birthDate: row.birth_date || '',
    occupation: row.occupation || '',
    passportNumber: activePassport ? activePassport.docNumber : (row.passport_number || rawData.passportNumber || ''),
    address: {
      fullAddress: row.full_address || '',
      rt: row.rt || '',
      rw: row.rw || '',
      kelurahan: row.kelurahan || '',
      kecamatan: row.kecamatan || '',
      city: row.city || '',
      province: row.province || '',
      postalCode: row.postal_code || ''
    },
    rt: row.rt || '',
    rw: row.rw || '',
    village: row.kelurahan || '',
    district: row.kecamatan || '',
    regency: row.city || '',
    province: row.province || '',
    postalCode: row.postal_code || '',
    npwp: row.npwp || '',
    documents,
    companyReferences: companyRoles.map(r => ({
      companyId: r.companyId,
      companyName: r.companyName,
      clientType: r.clientType || '',
      role: r.positionTitle || r.roleCategory
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...rawData
  };
}

// ============================================================================
// 1. GET /api/v2/people/nik/:nik
// Allowed: Staff, Admin, Super Admin
// ============================================================================
peopleV2Router.get('/nik/:nik', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const cleanNik = cleanNikInput(req.params.nik);
    if (!cleanNik) {
      return res.status(400).json({ success: false, error: 'NIK parameter harus berupa string angka' });
    }

    const row = await db.prepare(`SELECT * FROM people WHERE nik = ? LIMIT 1`).bind(cleanNik).get();
    if (!row) {
      return res.status(404).json({ success: false, error: `Person not found for NIK: ${cleanNik}` });
    }

    const documents = await getPersonDocuments(db, row.person_id);
    const roles = await getPersonRoles(db, row.person_id);
    const person = mapPersonRow(row, documents, roles);

    res.json({
      success: true,
      person
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Lookup by NIK failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lookup by NIK failed' });
  }
});

// ============================================================================
// 2. GET /api/v2/people/passport/:docNumber
// Allowed: Staff, Admin, Super Admin
// Searches both current active passports and historical passports
// ============================================================================
peopleV2Router.get('/passport/:docNumber', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const cleanPassport = cleanPassportInput(req.params.docNumber);
    if (!cleanPassport) {
      return res.status(400).json({ success: false, error: 'Nomor paspor tidak valid' });
    }

    const docRow = await db.prepare(`
      SELECT * FROM person_identity_documents
      WHERE doc_type = 'PASSPORT' AND UPPER(doc_number) = ?
      ORDER BY is_active DESC, created_at DESC
      LIMIT 1
    `).bind(cleanPassport).get();

    if (!docRow) {
      return res.status(404).json({ success: false, error: `Person not found for Passport: ${cleanPassport}` });
    }

    const personRow = await db.prepare(`SELECT * FROM people WHERE person_id = ? LIMIT 1`).bind(docRow.person_id).get();
    if (!personRow) {
      return res.status(404).json({ success: false, error: 'Person record missing for identity document' });
    }

    const documents = await getPersonDocuments(db, personRow.person_id);
    const roles = await getPersonRoles(db, personRow.person_id);
    const person = mapPersonRow(personRow, documents, roles);

    res.json({
      success: true,
      matchedDocument: {
        docNumber: docRow.doc_number,
        isActive: Boolean(docRow.is_active),
        issuingCountry: docRow.issuing_country,
        expiryDate: docRow.expiry_date
      },
      person
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Lookup by Passport failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Lookup by Passport failed' });
  }
});

// ============================================================================
// 3. GET /api/v2/people/search
// Allowed: Staff, Admin, Super Admin
// ============================================================================
peopleV2Router.get('/search', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const limitVal = Math.min(Math.max(1, parseInt(String(req.query.limit || '20'))), 100);
    const offsetVal = Math.max(0, parseInt(String(req.query.offset || '0')));
    const searchVal = (req.query.q || req.query.search) ? String(req.query.q || req.query.search).trim() : '';
    const nationalityType = req.query.nationalityType ? String(req.query.nationalityType).toUpperCase() : null;

    let sql = `SELECT * FROM people`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (searchVal) {
      const words = searchVal.toLowerCase().split(/\s+/).filter(Boolean);
      for (const word of words) {
        conditions.push(`(
          LOWER(name) LIKE ? OR
          nik LIKE ? OR
          LOWER(birth_city) LIKE ? OR
          LOWER(occupation) LIKE ? OR
          person_id IN (
            SELECT person_id FROM person_identity_documents
            WHERE LOWER(doc_number) LIKE ?
          )
        )`);
        params.push(`%${word}%`, `%${word}%`, `%${word}%`, `%${word}%`, `%${word}%`);
      }
    }

    if (nationalityType && (nationalityType === 'WNI' || nationalityType === 'WNA')) {
      conditions.push(`nationality_type = ?`);
      params.push(nationalityType);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
    params.push(limitVal, offsetVal);

    const queryRes = await db.prepare(sql).bind(...params).all();
    const rows = queryRes.results || [];

    const people = await Promise.all(rows.map(async (row: any) => {
      const docs = await getPersonDocuments(db, row.person_id);
      return mapPersonRow(row, docs, []);
    }));

    res.json({
      success: true,
      count: people.length,
      limit: limitVal,
      offset: offsetVal,
      people
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Search failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Search failed' });
  }
});

// ============================================================================
// 4. GET /api/v2/people/:personId/roles
// Allowed: Staff, Admin, Super Admin
// ============================================================================
peopleV2Router.get('/:personId/roles', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const personId = String(req.params.personId);
    const roles = await getPersonRoles(db, personId);

    res.json({
      success: true,
      personId,
      roles
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Get roles failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Get roles failed' });
  }
});

// ============================================================================
// 5. GET /api/v2/people/:personId
// Allowed: Staff, Admin, Super Admin
// ============================================================================
peopleV2Router.get('/:personId', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const personId = String(req.params.personId);
    const row = await db.prepare(`SELECT * FROM people WHERE person_id = ? LIMIT 1`).bind(personId).get();
    if (!row) {
      return res.status(404).json({ success: false, error: `Person not found: ${personId}` });
    }

    const documents = await getPersonDocuments(db, personId);
    const roles = await getPersonRoles(db, personId);
    const person = mapPersonRow(row, documents, roles);

    res.json({
      success: true,
      person
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Get person failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Get person failed' });
  }
});

// ============================================================================
// 6. POST /api/v2/people
// Registration & Updates
// Staff: Can draft provisional records and update existing unverified records.
// Admin/Super Admin: Can create/update verified records.
// ============================================================================
peopleV2Router.post('/', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const body = req.body || {};
    const userRole = req.user?.role || 'Staff';
    const userUid = req.user?.uid || 'system';

    const rawName = String(body.name || '').trim();
    if (!rawName) {
      return res.status(400).json({ success: false, error: 'Nama lengkap wajib diisi' });
    }

    const parsedName = parsePersonName(rawName);
    const cleanNik = cleanNikInput(body.nik);
    const nationalityType = body.nationalityType === 'WNA' ? 'WNA' : (cleanNik ? 'WNI' : (body.nationalityType || 'WNI'));
    const nationality = body.nationality || (nationalityType === 'WNA' ? '' : 'INDONESIA');

    // WNI validation
    if (nationalityType === 'WNI' && cleanNik && cleanNik.length !== 16) {
      return res.status(400).json({ success: false, error: `NIK harus tepat 16 digit angka (diterima: ${cleanNik.length} digit)` });
    }

    const personId = body.personId || crypto.randomUUID();
    const now = new Date().toISOString();

    // Check if person exists
    const existingRow = await db.prepare(`SELECT * FROM people WHERE person_id = ?`).bind(personId).get();

    // Check NIK uniqueness against other person_id
    if (cleanNik) {
      const nikRow: any = await db.prepare(`SELECT * FROM people WHERE nik = ?`).bind(cleanNik).get();
      if (nikRow && nikRow.person_id !== personId) {
        // Evaluate name compatibility
        const comp = evaluateNameCompatibility(nikRow.name, rawName);
        if (comp.spellingMismatch || (nikRow.birth_date && body.birthDate && nikRow.birth_date !== body.birthDate)) {
          // Critical conflict! Log to people_migration_conflicts
          const conflictId = crypto.randomUUID();
          await db.prepare(`
            INSERT INTO people_migration_conflicts (
              conflict_id, doc_type, doc_number, conflict_type,
              existing_person_id, incoming_payload, incoming_source,
              resolution_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
          `).bind(
            conflictId, 'NIK', cleanNik, 'NIK_NAME_MISMATCH',
            nikRow.person_id, JSON.stringify(body), `API_${userRole}_${userUid}`,
            now
          ).run();

          return res.status(409).json({
            success: false,
            error: `CRITICAL_CONFLICT: NIK ${cleanNik} telah terdaftar atas nama '${nikRow.name}', berbeda dengan '${rawName}'. Data dikarantina untuk peninjauan manual Notaris.`,
            conflictId
          });
        }
      }
    }

    // Determine identity verification status based on role and previous state
    let identityStatus = 'PROVISIONAL';
    if (userRole === 'Super Admin' || userRole === 'Admin') {
      identityStatus = body.identityStatus === 'PROVISIONAL' ? 'PROVISIONAL' : 'VERIFIED';
    } else {
      // Staff can never force VERIFIED status
      if (existingRow && existingRow.identity_status === 'VERIFIED') {
        identityStatus = 'VERIFIED'; // preserve existing verification
      } else {
        identityStatus = 'PROVISIONAL';
      }
    }

    const salutation = body.salutation || body.sapaan || 'Tuan';
    const birthCity = (body.birthCity || body.birthPlace || '').trim().toUpperCase();
    const birthDate = body.birthDate || '';
    const occupation = (body.occupation || '').trim().toUpperCase();
    const addr = body.address || {};
    const fullAddress = addr.fullAddress || body.fullAddress || '';
    const rt = addr.rt || body.rt || '';
    const rw = addr.rw || body.rw || '';
    const kelurahan = addr.kelurahan || addr.village || body.village || '';
    const kecamatan = addr.kecamatan || addr.district || body.district || '';
    const city = addr.city || addr.regency || body.regency || '';
    const province = addr.province || body.province || '';
    const postalCode = addr.postalCode || body.postalCode || '';
    const npwp = body.npwp || '';

    // Audit log embedded in raw_data
    const auditHistory = existingRow?.raw_data ? (JSON.parse(existingRow.raw_data)._auditHistory || []) : [];
    auditHistory.push({
      action: existingRow ? 'UPDATE' : 'CREATE',
      byUid: userUid,
      byRole: userRole,
      timestamp: now,
      identityStatus
    });

    const rawData = JSON.stringify({
      ...body,
      _auditHistory: auditHistory.slice(-20)
    });

    await db.prepare(`
      INSERT INTO people (
        person_id, nik, identity_status, nationality_type, nationality,
        salutation, name, birth_city, birth_date, occupation,
        full_address, rt, rw, kelurahan, kecamatan, city, province,
        postal_code, npwp, raw_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(person_id) DO UPDATE SET
        nik = excluded.nik,
        identity_status = excluded.identity_status,
        nationality_type = excluded.nationality_type,
        nationality = excluded.nationality,
        salutation = excluded.salutation,
        name = excluded.name,
        birth_city = excluded.birth_city,
        birth_date = excluded.birth_date,
        occupation = excluded.occupation,
        full_address = excluded.full_address,
        rt = excluded.rt,
        rw = excluded.rw,
        kelurahan = excluded.kelurahan,
        kecamatan = excluded.kecamatan,
        city = excluded.city,
        province = excluded.province,
        postal_code = excluded.postal_code,
        npwp = excluded.npwp,
        raw_data = excluded.raw_data,
        updated_at = excluded.updated_at
    `).bind(
      personId, cleanNik, identityStatus, nationalityType, nationality,
      salutation, rawName.toUpperCase(), birthCity, birthDate, occupation,
      fullAddress, rt, rw, kelurahan, kecamatan, city, province,
      postalCode, npwp, rawData, existingRow?.created_at || now, now
    ).run();

    // Register Passport if provided (especially for WNA)
    const cleanPassport = cleanPassportInput(body.passportNumber);
    if (cleanPassport) {
      // Check if passport already active for this person
      const existingDoc = await db.prepare(`
        SELECT id FROM person_identity_documents
        WHERE person_id = ? AND doc_type = 'PASSPORT' AND is_active = 1
      `).bind(personId).get();

      if (!existingDoc) {
        const docId = crypto.randomUUID();
        await db.prepare(`
          INSERT INTO person_identity_documents (
            id, person_id, doc_type, doc_number, issuing_country,
            issue_date, expiry_date, is_active, verified_status,
            verified_by_uid, verified_at, notes, created_at, updated_at
          ) VALUES (?, ?, 'PASSPORT', ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
        `).bind(
          docId, personId, cleanPassport, body.issuingCountry || nationality || 'WNA',
          body.issueDate || null, body.expiryDate || null, identityStatus,
          identityStatus === 'VERIFIED' ? userUid : null,
          identityStatus === 'VERIFIED' ? now : null,
          'Initial passport registration', now, now
        ).run();
      }
    }

    const savedDocs = await getPersonDocuments(db, personId);
    const savedRoles = await getPersonRoles(db, personId);
    const savedPersonRow = await db.prepare(`SELECT * FROM people WHERE person_id = ?`).bind(personId).get();

    res.json({
      success: true,
      personId,
      isNew: !existingRow,
      person: mapPersonRow(savedPersonRow, savedDocs, savedRoles)
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Save failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Save person failed' });
  }
});

// ============================================================================
// 7. POST /api/v2/people/:personId/passport/renew
// WNA Passport Renewal
// Allowed: Staff, Admin, Super Admin
// Preserves permanent person_id, deactivates old active passport (is_active = 0),
// inserts new active passport (is_active = 1), stores audit log.
// ============================================================================
peopleV2Router.post('/:personId/passport/renew', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const personId = String(req.params.personId);
    const body = req.body || {};
    const userRole = req.user?.role || 'Staff';
    const userUid = req.user?.uid || 'system';

    const personRow = await db.prepare(`SELECT * FROM people WHERE person_id = ?`).bind(personId).get();
    if (!personRow) {
      return res.status(404).json({ success: false, error: `Person ${personId} not found` });
    }

    const cleanNewPassport = cleanPassportInput(body.newPassportNumber || body.passportNumber);
    if (!cleanNewPassport) {
      return res.status(400).json({ success: false, error: 'Nomor paspor baru wajib diisi' });
    }

    const now = new Date().toISOString();

    // 1. Deactivate current active passport(s) for this person
    await db.prepare(`
      UPDATE person_identity_documents
      SET is_active = 0, updated_at = ?
      WHERE person_id = ? AND doc_type = 'PASSPORT' AND is_active = 1
    `).bind(now, personId).run();

    // 2. Insert new active passport
    const newDocId = crypto.randomUUID();
    const verifiedStatus = (userRole === 'Super Admin' || userRole === 'Admin') ? 'VERIFIED' : 'PROVISIONAL';

    await db.prepare(`
      INSERT INTO person_identity_documents (
        id, person_id, doc_type, doc_number, issuing_country,
        issue_date, expiry_date, is_active, verified_status,
        verified_by_uid, verified_at, notes, created_at, updated_at
      ) VALUES (?, ?, 'PASSPORT', ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
    `).bind(
      newDocId, personId, cleanNewPassport,
      body.issuingCountry || personRow.nationality || 'WNA',
      body.issueDate || null,
      body.expiryDate || null,
      verifiedStatus,
      verifiedStatus === 'VERIFIED' ? userUid : null,
      verifiedStatus === 'VERIFIED' ? now : null,
      body.notes || `Passport renewal submitted by ${userRole} (${userUid})`,
      now, now
    ).run();

    // 3. Touch updated_at in master people
    await db.prepare(`UPDATE people SET updated_at = ? WHERE person_id = ?`).bind(now, personId).run();

    const allDocs = await getPersonDocuments(db, personId);
    const roles = await getPersonRoles(db, personId);

    res.json({
      success: true,
      message: `Paspor baru ${cleanNewPassport} berhasil didaftarkan untuk personId ${personId}. Paspor lama telah diarsipkan sebagai riwayat historis.`,
      personId,
      newDocumentId: newDocId,
      documents: allDocs,
      person: mapPersonRow(personRow, allDocs, roles)
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Passport renewal failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Passport renewal failed' });
  }
});

// ============================================================================
// 8. POST /api/v2/people/verify-identity
// Verify identity (KTP / Passport)
// Allowed: Super Admin, Admin (Staff receives 403 Forbidden)
// ============================================================================
peopleV2Router.post('/verify-identity', requireRoles('Super Admin', 'Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const { personId, notes } = req.body || {};
    if (!personId) {
      return res.status(400).json({ success: false, error: 'personId wajib disertakan' });
    }

    const now = new Date().toISOString();
    const userUid = req.user?.uid || 'admin';

    await db.prepare(`
      UPDATE people
      SET identity_status = 'VERIFIED', updated_at = ?
      WHERE person_id = ?
    `).bind(now, personId).run();

    await db.prepare(`
      UPDATE person_identity_documents
      SET verified_status = 'VERIFIED', verified_by_uid = ?, verified_at = ?, updated_at = ?
      WHERE person_id = ? AND is_active = 1
    `).bind(userUid, now, now, personId).run();

    res.json({
      success: true,
      message: `Status identitas personId ${personId} berhasil diverifikasi oleh ${req.user?.role}.`,
      verifiedAt: now,
      verifiedByUid: userUid
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Verify identity failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Verify identity failed' });
  }
});

// ============================================================================
// 9. GET /api/v2/people/conflicts
// List unresolved identity conflicts
// Allowed: Super Admin, Admin (Staff receives 403 Forbidden)
// ============================================================================
peopleV2Router.get('/conflicts', requireRoles('Super Admin', 'Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const queryRes = await db.prepare(`
      SELECT * FROM people_migration_conflicts
      WHERE resolution_status = 'PENDING'
      ORDER BY created_at DESC
    `).all();

    res.json({
      success: true,
      conflicts: queryRes.results || []
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Get conflicts failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Get conflicts failed' });
  }
});

// ============================================================================
// 10. POST /api/v2/people/conflicts/:conflictId/resolve
// Resolve an identity conflict
// Allowed: Super Admin, Admin (Staff receives 403 Forbidden)
// ============================================================================
peopleV2Router.post('/conflicts/:conflictId/resolve', requireRoles('Super Admin', 'Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const conflictId = req.params.conflictId;
    const { resolutionStatus, resolutionNotes } = req.body || {};

    if (!resolutionStatus || !['RESOLVED', 'REJECTED', 'IGNORED'].includes(resolutionStatus)) {
      return res.status(400).json({ success: false, error: "resolutionStatus harus bernilai 'RESOLVED', 'REJECTED', atau 'IGNORED'" });
    }

    const now = new Date().toISOString();
    const userUid = req.user?.uid || 'admin';
    const userRole = req.user?.role || 'Admin';

    await db.prepare(`
      UPDATE people_migration_conflicts
      SET resolution_status = ?,
          resolved_by_uid = ?,
          resolved_by_role = ?,
          resolution_notes = ?,
          resolved_at = ?
      WHERE conflict_id = ?
    `).bind(
      resolutionStatus, userUid, userRole, resolutionNotes || 'Resolved by authority', now, conflictId
    ).run();

    res.json({
      success: true,
      conflictId,
      resolutionStatus,
      resolvedAt: now,
      resolvedBy: `${userRole} (${userUid})`
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Resolve conflict failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Resolve conflict failed' });
  }
});

// ============================================================================
// 11. POST /api/v2/people/link-company
// Link a person to a company (Proyeksi Indeks Relasi Turunan)
// Allowed: Staff, Admin, Super Admin
// ============================================================================
peopleV2Router.post('/link-company', requireRoles('Super Admin', 'Admin', 'Staff'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getLocalD1Database();
    await ensureD1TablesExist(db);

    const { personId, companyId, clientType, companyName, roleCategory, positionTitle, sourceRecordId } = req.body || {};
    if (!personId || !companyId || !companyName || !roleCategory) {
      return res.status(400).json({ success: false, error: 'personId, companyId, companyName, dan roleCategory wajib diisi' });
    }

    const now = new Date().toISOString();
    const roleId = `${companyId}_${personId}_${roleCategory}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    await db.prepare(`
      INSERT INTO company_person_roles (
        id, person_id, company_id, client_type, company_name,
        role_category, position_title, source_record_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        company_name = excluded.company_name,
        position_title = excluded.position_title,
        updated_at = excluded.updated_at
    `).bind(
      roleId, personId, companyId, clientType || 'PT', companyName,
      roleCategory, positionTitle || roleCategory, sourceRecordId || null, now
    ).run();

    res.json({
      success: true,
      roleId,
      personId,
      companyId
    });
  } catch (err: any) {
    console.error('[PeopleV2 API] Link company failed:', err);
    res.status(500).json({ success: false, error: err?.message || 'Link company failed' });
  }
});
