/**
 * People D1 Repository
 * Single Source of Truth implementation for Master People in Cloudflare D1.
 * Provides atomic passport renewals (db.batch), cross-person passport conflict checks,
 * strict server-side RBAC, and detailed audit trails.
 */

import crypto from 'crypto';
import { ensureD1TablesExist } from './d1MigrationService';
import { parsePersonName, evaluateNameCompatibility } from '../utils/nameResolution';

export interface UserContext {
  uid: string;
  role: 'Super Admin' | 'Admin' | 'Staff' | string;
  email?: string;
}

export function cleanNikInput(nik?: any): string | null {
  if (!nik) return null;
  const str = String(nik).trim().replace(/\D/g, '');
  return str.length > 0 ? str : null;
}

export function cleanPassportInput(passport?: any): string | null {
  if (!passport) return null;
  const str = String(passport).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return str.length > 0 ? str : null;
}

export function maskNik(nik?: any): string {
  if (!nik) return '';
  const str = String(nik).trim();
  if (str.length <= 6) return '******';
  return `${str.slice(0, 4)}********${str.slice(-4)}`;
}

export function maskPassportNumber(passport?: any): string {
  if (!passport) return '';
  const str = String(passport).trim();
  if (str.length <= 4) return '***';
  return `${str.slice(0, 2)}***${str.slice(-2)}`;
}

export class PeopleD1Repository {
  /**
   * Helper to fetch identity documents for a person
   */
  static async getPersonDocuments(db: any, personId: string) {
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
  static async getPersonRoles(db: any, personId: string) {
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
   * Helper to format SQLite person row into Person domain model
   */
  static mapPersonRow(row: any, documents: any[] = [], companyRoles: any[] = []) {
    let rawData: any = {};
    try { if (row.raw_data) rawData = JSON.parse(row.raw_data); } catch (e) {}

    const activePassport = documents.find(d => d.docType === 'PASSPORT' && d.isActive);

    return {
      ...rawData,
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
      updatedAt: row.updated_at
    };
  }

  /**
   * Retrieves person by permanent personId
   */
  static async getPersonById(db: any, personId: string) {
    await ensureD1TablesExist(db);
    const row = await db.prepare(`SELECT * FROM people WHERE person_id = ? LIMIT 1`).bind(personId).get();
    if (!row) return null;

    const documents = await this.getPersonDocuments(db, personId);
    const roles = await this.getPersonRoles(db, personId);
    return this.mapPersonRow(row, documents, roles);
  }

  /**
   * Retrieves person by 16-digit NIK
   */
  static async getPersonByNik(db: any, nik: string) {
    await ensureD1TablesExist(db);
    const cleanNik = cleanNikInput(nik);
    if (!cleanNik) return null;

    const row = await db.prepare(`SELECT * FROM people WHERE nik = ? LIMIT 1`).bind(cleanNik).get();
    if (!row) return null;

    const documents = await this.getPersonDocuments(db, row.person_id);
    const roles = await this.getPersonRoles(db, row.person_id);
    return this.mapPersonRow(row, documents, roles);
  }

  /**
   * Retrieves person by passport number (searches both active and historical documents)
   */
  static async getPersonByPassport(db: any, passportNumber: string) {
    await ensureD1TablesExist(db);
    const cleanPassport = cleanPassportInput(passportNumber);
    if (!cleanPassport) return null;

    const docRow = await db.prepare(`
      SELECT * FROM person_identity_documents
      WHERE doc_type = 'PASSPORT' AND UPPER(doc_number) = ?
      ORDER BY is_active DESC, created_at DESC
      LIMIT 1
    `).bind(cleanPassport).get();

    if (!docRow) return null;

    const personRow = await db.prepare(`SELECT * FROM people WHERE person_id = ? LIMIT 1`).bind(docRow.person_id).get();
    if (!personRow) return null;

    const documents = await this.getPersonDocuments(db, personRow.person_id);
    const roles = await this.getPersonRoles(db, personRow.person_id);
    return {
      person: this.mapPersonRow(personRow, documents, roles),
      matchedDocument: {
        docNumber: docRow.doc_number,
        isActive: Boolean(docRow.is_active),
        issuingCountry: docRow.issuing_country,
        expiryDate: docRow.expiry_date
      }
    };
  }

  /**
   * Search people with pagination and filter
   */
  static async searchPeople(db: any, options: {
    search?: string;
    limit?: number;
    offset?: number;
    nationalityType?: string;
  }) {
    await ensureD1TablesExist(db);
    const limitVal = Math.min(Math.max(1, options.limit || 20), 100);
    const offsetVal = Math.max(0, options.offset || 0);
    const searchVal = options.search ? options.search.trim() : '';
    const nationalityType = options.nationalityType ? options.nationalityType.toUpperCase() : null;

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
      const docs = await this.getPersonDocuments(db, row.person_id);
      return this.mapPersonRow(row, docs, []);
    }));

    return {
      count: people.length,
      limit: limitVal,
      offset: offsetVal,
      people
    };
  }

  /**
   * Saves a person to D1 with cross-person NIK check, conservative name compatibility,
   * and role-based provisional/verified status assignment.
   */
  static async savePerson(db: any, user: UserContext, body: any) {
    await ensureD1TablesExist(db);
    const rawName = String(body.name || '').trim();
    if (!rawName) {
      throw new Error('Nama lengkap wajib diisi');
    }

    const cleanNik = cleanNikInput(body.nik);
    const nationalityType = body.nationalityType === 'WNA' ? 'WNA' : (cleanNik ? 'WNI' : (body.nationalityType || 'WNI'));
    const nationality = body.nationality || (nationalityType === 'WNA' ? '' : 'INDONESIA');

    if (nationalityType === 'WNI' && cleanNik && cleanNik.length !== 16) {
      throw new Error(`NIK harus tepat 16 digit angka (diterima: ${cleanNik.length} digit)`);
    }

    const personId = body.personId || crypto.randomUUID();
    const now = new Date().toISOString();

    const existingRow = await db.prepare(`SELECT * FROM people WHERE person_id = ?`).bind(personId).get();

    // Check NIK uniqueness against different person_id
    if (cleanNik) {
      const nikRow: any = await db.prepare(`SELECT * FROM people WHERE nik = ?`).bind(cleanNik).get();
      if (nikRow && nikRow.person_id !== personId) {
        const comp = evaluateNameCompatibility(nikRow.name, rawName);
        if (comp.spellingMismatch || (nikRow.birth_date && body.birthDate && nikRow.birth_date !== body.birthDate)) {
          const conflictId = crypto.randomUUID();
          const sanitizedNikConflictPayload = {
            targetPersonId: personId,
            incomingName: rawName,
            existingName: nikRow.name,
            nikMasked: maskNik(cleanNik),
            submittedBy: user.uid,
            submittedRole: user.role,
            timestamp: now
          };
          await db.prepare(`
            INSERT INTO people_migration_conflicts (
              conflict_id, doc_type, doc_number, conflict_type,
              existing_person_id, incoming_payload, incoming_source,
              resolution_status, created_at
            ) VALUES (?, 'NIK', ?, 'NIK_NAME_MISMATCH', ?, ?, ?, 'PENDING', ?)
          `).bind(
            conflictId, cleanNik, nikRow.person_id, JSON.stringify(sanitizedNikConflictPayload),
            `API_${user.role}_${user.uid}`, now
          ).run();

          const err: any = new Error(`CRITICAL_CONFLICT: NIK ${cleanNik} telah terdaftar atas nama '${nikRow.name}', berbeda dengan '${rawName}'. Data dikarantina untuk peninjauan manual Notaris.`);
          err.statusCode = 409;
          err.conflictId = conflictId;
          throw err;
        }
      }
    }

    // Determine identity verification status
    let identityStatus = 'PROVISIONAL';
    if (user.role === 'Super Admin' || user.role === 'Admin') {
      identityStatus = body.identityStatus === 'PROVISIONAL' ? 'PROVISIONAL' : 'VERIFIED';
    } else {
      if (existingRow && existingRow.identity_status === 'VERIFIED') {
        identityStatus = 'VERIFIED';
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

    const auditHistory = existingRow?.raw_data ? (JSON.parse(existingRow.raw_data)._auditHistory || []) : [];
    auditHistory.push({
      action: existingRow ? 'UPDATE' : 'CREATE',
      byUid: user.uid,
      byRole: user.role,
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
      // Check cross-person collision
      const collisionDoc: any = await db.prepare(`
        SELECT person_id FROM person_identity_documents
        WHERE doc_type = 'PASSPORT' AND UPPER(doc_number) = ? AND is_active = 1 AND person_id != ?
      `).bind(cleanPassport, personId).get();

      if (collisionDoc) {
        const conflictId = crypto.randomUUID();
        const sanitizedPassportCollisionPayload = {
          targetPersonId: personId,
          passportNumberMasked: maskPassportNumber(cleanPassport),
          issuingCountry: body.issuingCountry || nationality || 'WNA',
          submittedBy: user.uid,
          submittedRole: user.role,
          timestamp: now
        };
        await db.prepare(`
          INSERT INTO people_migration_conflicts (
            conflict_id, doc_type, doc_number, conflict_type,
            existing_person_id, incoming_payload, incoming_source,
            resolution_status, created_at
          ) VALUES (?, 'PASSPORT', ?, 'CROSS_PERSON_PASSPORT_COLLISION', ?, ?, ?, 'PENDING', ?)
        `).bind(
          conflictId, cleanPassport, collisionDoc.person_id,
          JSON.stringify(sanitizedPassportCollisionPayload), `API_${user.role}_${user.uid}`, now
        ).run();

        const err: any = new Error(`PASSPORT_COLLISION: Nomor paspor ${cleanPassport} telah aktif untuk individu lain (${collisionDoc.person_id}). Perubahan paspor ditolak dan masuk karantina peninjauan Notaris.`);
        err.statusCode = 409;
        err.conflictId = conflictId;
        throw err;
      }

      const existingDoc = await db.prepare(`
        SELECT id FROM person_identity_documents
        WHERE person_id = ? AND doc_type = 'PASSPORT' AND is_active = 1
      `).bind(personId).get();

      if (!existingDoc) {
        const docId = crypto.randomUUID();
        try {
          await db.prepare(`
            INSERT INTO person_identity_documents (
              id, person_id, doc_type, doc_number, issuing_country,
              issue_date, expiry_date, is_active, verified_status,
              verified_by_uid, verified_at, notes, created_at, updated_at
            ) VALUES (?, ?, 'PASSPORT', ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
          `).bind(
            docId, personId, cleanPassport, body.issuingCountry || nationality || 'WNA',
            body.issueDate || null, body.expiryDate || null, identityStatus,
            identityStatus === 'VERIFIED' ? user.uid : null,
            identityStatus === 'VERIFIED' ? now : null,
            'Initial passport registration', now, now
          ).run();
        } catch (insertErr: any) {
          const insertMsg = String(insertErr?.message || insertErr);
          if (insertMsg.includes('UNIQUE constraint') || insertMsg.includes('idx_docs_active_passport_unique')) {
            const conflictId = crypto.randomUUID();
            const racePayload = {
              targetPersonId: personId,
              passportNumberMasked: maskPassportNumber(cleanPassport),
              issuingCountry: body.issuingCountry || nationality || 'WNA',
              submittedBy: user.uid,
              timestamp: now,
              errorType: 'DATABASE_UNIQUE_CONSTRAINT_VIOLATION'
            };
            await db.prepare(`
              INSERT INTO people_migration_conflicts (
                conflict_id, doc_type, doc_number, conflict_type,
                existing_person_id, incoming_payload, incoming_source,
                resolution_status, created_at
              ) VALUES (?, 'PASSPORT', ?, 'CONCURRENT_PASSPORT_COLLISION', ?, ?, ?, 'PENDING', ?)
            `).bind(
              conflictId, cleanPassport, 'UNKNOWN_CONCURRENT_TRANSACTION',
              JSON.stringify(racePayload), `API_CONCURRENT_${user.role}_${user.uid}`, now
            ).run().catch(() => {});

            const raceErr: any = new Error(`PASSPORT_COLLISION: Kondisi balapan (race condition) terdeteksi. Nomor paspor ${cleanPassport} baru saja didaftarkan oleh transaksi konkuren lain.`);
            raceErr.statusCode = 409;
            raceErr.conflictId = conflictId;
            throw raceErr;
          }
          throw insertErr;
        }
      }
    }

    const savedDocs = await this.getPersonDocuments(db, personId);
    const savedRoles = await this.getPersonRoles(db, personId);
    const savedPersonRow = await db.prepare(`SELECT * FROM people WHERE person_id = ?`).bind(personId).get();

    return {
      personId,
      isNew: !existingRow,
      person: this.mapPersonRow(savedPersonRow, savedDocs, savedRoles)
    };
  }

  /**
   * Renews a WNA passport atomically with strict cross-person conflict detection.
   * Uses db.batch() for true transactional execution.
   */
  static async renewPassport(
    db: any,
    user: UserContext,
    personId: string,
    payload: {
      newPassportNumber: string;
      issuingCountry?: string;
      issueDate?: string;
      expiryDate?: string;
      notes?: string;
    }
  ) {
    await ensureD1TablesExist(db);
    const personRow = await db.prepare(`SELECT * FROM people WHERE person_id = ?`).bind(personId).get();
    if (!personRow) {
      const err: any = new Error(`Person ${personId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const cleanNewPassport = cleanPassportInput(payload.newPassportNumber);
    if (!cleanNewPassport) {
      const err: any = new Error('Nomor paspor baru wajib diisi dan berupa alfanumerik valid');
      err.statusCode = 400;
      throw err;
    }

    const now = new Date().toISOString();

    // 1. Cross-person conflict check: Ensure passport is not registered/active for ANY other person
    const conflictDoc: any = await db.prepare(`
      SELECT person_id FROM person_identity_documents
      WHERE doc_type = 'PASSPORT' AND UPPER(doc_number) = ? AND is_active = 1 AND person_id != ?
    `).bind(cleanNewPassport, personId).get();

    if (conflictDoc) {
      const conflictId = crypto.randomUUID();
      const sanitizedRenewalConflictPayload = {
        personId,
        passportNumberMasked: maskPassportNumber(cleanNewPassport),
        issuingCountry: payload.issuingCountry || personRow.nationality || 'WNA',
        submittedBy: user.uid,
        submittedRole: user.role,
        timestamp: now
      };

      await db.prepare(`
        INSERT INTO people_migration_conflicts (
          conflict_id, doc_type, doc_number, conflict_type,
          existing_person_id, incoming_payload, incoming_source,
          resolution_status, created_at
        ) VALUES (?, 'PASSPORT', ?, 'CROSS_PERSON_PASSPORT_COLLISION', ?, ?, ?, 'PENDING', ?)
      `).bind(
        conflictId, cleanNewPassport, conflictDoc.person_id,
        JSON.stringify(sanitizedRenewalConflictPayload), `RENEWAL_${user.role}_${user.uid}`, now
      ).run();

      const err: any = new Error(`PASSPORT_COLLISION: Nomor paspor ${cleanNewPassport} telah terdaftar dan aktif untuk individu lain (${conflictDoc.person_id}). Pembaruan dibatalkan dan kasus diarahkan ke antrean peninjauan Notaris.`);
      err.statusCode = 409;
      err.conflictId = conflictId;
      throw err;
    }

    // 2. Prepare atomic batch statements
    const newDocId = crypto.randomUUID();
    const verifiedStatus = (user.role === 'Super Admin' || user.role === 'Admin') ? 'VERIFIED' : 'PROVISIONAL';
    const auditNote = payload.notes || `Passport renewal submitted by ${user.role} (${user.uid})`;

    const stmtDeactivate = db.prepare(`
      UPDATE person_identity_documents
      SET is_active = 0, updated_at = ?
      WHERE person_id = ? AND doc_type = 'PASSPORT' AND is_active = 1
    `).bind(now, personId);

    const stmtInsertNew = db.prepare(`
      INSERT INTO person_identity_documents (
        id, person_id, doc_type, doc_number, issuing_country,
        issue_date, expiry_date, is_active, verified_status,
        verified_by_uid, verified_at, notes, created_at, updated_at
      ) VALUES (?, ?, 'PASSPORT', ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
    `).bind(
      newDocId, personId, cleanNewPassport,
      payload.issuingCountry || personRow.nationality || 'WNA',
      payload.issueDate || null,
      payload.expiryDate || null,
      verifiedStatus,
      verifiedStatus === 'VERIFIED' ? user.uid : null,
      verifiedStatus === 'VERIFIED' ? now : null,
      auditNote,
      now, now
    );

    const stmtTouchPerson = db.prepare(`
      UPDATE people SET updated_at = ? WHERE person_id = ?
    `).bind(now, personId);

    // 3. Execute atomically via db.batch() with race-condition constraint handling
    try {
      await db.batch([stmtDeactivate, stmtInsertNew, stmtTouchPerson]);
    } catch (batchErr: any) {
      const errMsg = String(batchErr?.message || batchErr);
      const isConstraint = errMsg.includes('UNIQUE constraint') || 
                           errMsg.includes('idx_docs_active_passport_unique') ||
                           errMsg.includes('SQLITE_CONSTRAINT');

      if (isConstraint) {
        const conflictId = crypto.randomUUID();
        const sanitizedRacePayload = {
          personId,
          passportNumberMasked: maskPassportNumber(cleanNewPassport),
          issuingCountry: payload.issuingCountry || personRow.nationality || 'WNA',
          submittedBy: user.uid,
          timestamp: now,
          errorType: 'DATABASE_UNIQUE_CONSTRAINT_VIOLATION'
        };

        await db.prepare(`
          INSERT INTO people_migration_conflicts (
            conflict_id, doc_type, doc_number, conflict_type,
            existing_person_id, incoming_payload, incoming_source,
            resolution_status, created_at
          ) VALUES (?, 'PASSPORT', ?, 'CONCURRENT_PASSPORT_COLLISION', ?, ?, ?, 'PENDING', ?)
        `).bind(
          conflictId, cleanNewPassport, 'UNKNOWN_CONCURRENT_TRANSACTION',
          JSON.stringify(sanitizedRacePayload), `RACE_CONDITION_${user.role}_${user.uid}`, now
        ).run().catch(() => {});

        const conflictErr: any = new Error(
          `PASSPORT_COLLISION: Kondisi balapan konkuren (race condition) terdeteksi. Nomor paspor ${cleanNewPassport} baru saja didaftarkan oleh transaksi aktif lain. Transaksi pembaruan dibatalkan secara atomik oleh constraint database.`
        );
        conflictErr.statusCode = 409;
        conflictErr.conflictId = conflictId;
        throw conflictErr;
      }

      // Re-throw if it's another non-constraint failure
      throw batchErr;
    }

    const allDocs = await this.getPersonDocuments(db, personId);
    const roles = await this.getPersonRoles(db, personId);

    return {
      message: `Paspor baru ${cleanNewPassport} berhasil didaftarkan untuk personId ${personId}. Paspor lama telah diarsipkan sebagai riwayat historis secara atomik.`,
      personId,
      newDocumentId: newDocId,
      documents: allDocs,
      person: this.mapPersonRow(personRow, allDocs, roles)
    };
  }

  /**
   * Verifies identity status (KTP / Passport)
   * Strictly restricted to Admin and Super Admin
   */
  static async verifyIdentity(db: any, user: UserContext, personId: string, notes?: string) {
    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      const err: any = new Error(`FORBIDDEN: Peran '${user.role}' tidak memiliki wewenang untuk memverifikasi identitas. Hanya Admin dan Super Admin.`);
      err.statusCode = 403;
      throw err;
    }

    await ensureD1TablesExist(db);
    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE people
      SET identity_status = 'VERIFIED', updated_at = ?
      WHERE person_id = ?
    `).bind(now, personId).run();

    await db.prepare(`
      UPDATE person_identity_documents
      SET verified_status = 'VERIFIED', verified_by_uid = ?, verified_at = ?, updated_at = ?
      WHERE person_id = ? AND is_active = 1
    `).bind(user.uid, now, now, personId).run();

    return {
      message: `Status identitas personId ${personId} berhasil diverifikasi oleh ${user.role}.`,
      personId,
      identityStatus: 'VERIFIED',
      verifiedAt: now,
      verifiedByUid: user.uid
    };
  }

  /**
   * Lists unresolved identity conflicts
   * Strictly restricted to Admin and Super Admin
   */
  static async getConflicts(db: any, user: UserContext) {
    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      const err: any = new Error(`FORBIDDEN: Peran '${user.role}' tidak diizinkan mengakses antrean konflik identitas.`);
      err.statusCode = 403;
      throw err;
    }

    await ensureD1TablesExist(db);
    const queryRes = await db.prepare(`
      SELECT * FROM people_migration_conflicts
      WHERE resolution_status = 'PENDING'
      ORDER BY created_at DESC
    `).all();

    return (queryRes.results || []).map((row: any) => ({
      conflictId: row.conflict_id,
      docType: row.doc_type,
      docNumber: row.doc_number,
      conflictType: row.conflict_type,
      existingPersonId: row.existing_person_id,
      incomingPayload: row.incoming_payload,
      incomingSource: row.incoming_source,
      resolutionStatus: row.resolution_status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      resolvedByUid: row.resolved_by_uid,
      resolutionNotes: row.resolution_notes
    }));
  }

  /**
   * Resolves an identity conflict
   * Strictly restricted to Admin and Super Admin
   */
  static async resolveConflict(db: any, user: UserContext, conflictId: string, payload: {
    resolutionStatus: 'RESOLVED' | 'REJECTED' | 'IGNORED';
    resolutionNotes: string;
  }) {
    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      const err: any = new Error(`FORBIDDEN: Peran '${user.role}' tidak memiliki wewenang untuk menyelesaikan konflik identitas.`);
      err.statusCode = 403;
      throw err;
    }

    if (!payload.resolutionStatus || !['RESOLVED', 'REJECTED', 'IGNORED'].includes(payload.resolutionStatus)) {
      const err: any = new Error("resolutionStatus harus bernilai 'RESOLVED', 'REJECTED', atau 'IGNORED'");
      err.statusCode = 400;
      throw err;
    }

    await ensureD1TablesExist(db);
    const now = new Date().toISOString();

    await db.prepare(`
      UPDATE people_migration_conflicts
      SET resolution_status = ?,
          resolved_by_uid = ?,
          resolved_by_role = ?,
          resolution_notes = ?,
          resolved_at = ?
      WHERE conflict_id = ?
    `).bind(
      payload.resolutionStatus, user.uid, user.role,
      payload.resolutionNotes || 'Resolved by authority', now, conflictId
    ).run();

    return {
      conflictId,
      resolutionStatus: payload.resolutionStatus,
      resolvedAt: now,
      resolvedBy: `${user.role} (${user.uid})`
    };
  }

  /**
   * Links a person to a company (Proyeksi Indeks Relasi Turunan)
   */
  static async linkCompany(db: any, user: UserContext, payload: any) {
    await ensureD1TablesExist(db);
    const { personId, companyId, clientType, companyName, roleCategory, positionTitle, sourceRecordId } = payload || {};
    if (!personId || !companyId || !companyName || !roleCategory) {
      const err: any = new Error('personId, companyId, companyName, dan roleCategory wajib diisi');
      err.statusCode = 400;
      throw err;
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

    return {
      roleId,
      personId,
      companyId
    };
  }
}
