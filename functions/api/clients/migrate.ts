import { requireAuth } from '../../_lib/authGuard';
import { firestoreRest } from '../../../src/lib/firestore-rest';
import { createJsonResponse, createErrorResponse, handleOptions } from '../../../src/runtime';

async function ensureTableExists(db: any) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS client_directory (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      search_name TEXT,
      search_tokens TEXT,
      client_type TEXT,
      company_type TEXT,
      domicile TEXT,
      establishment_deed_date TEXT,
      establishment_year TEXT,
      updated_at TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      npwp TEXT,
      kbli_items TEXT
    );
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_client_dir_company_name ON client_directory(company_name);
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_client_dir_client_type ON client_directory(client_type);
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_client_dir_is_archived ON client_directory(is_archived);
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_client_dir_establishment_year ON client_directory(establishment_year);
  `).run();
}

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  // 1. Perform authentication check
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    // 2. Setup D1 schema if empty
    await ensureTableExists(db);

    // 3. Load all clients from Firestore client_directory (using REST api in batches)
    console.log("[Migration] Fetching client_directory from Firestore...");
    const allFirestoreDocs: any[] = [];
    let pageToken: string | undefined = undefined;
    let hasMore = true;

    // Measure Firestore READ counts
    let firestoreReadCount = 0;

    while (hasMore) {
      const response = await firestoreRest.listDocuments("client_directory", 100, pageToken, env);
      if (response && response.documents) {
        allFirestoreDocs.push(...response.documents);
        firestoreReadCount += response.documents.length;
      }
      pageToken = response.nextPageToken;
      hasMore = !!pageToken;
    }

    console.log(`[Migration] Loaded ${allFirestoreDocs.length} documents from Firestore. Total READS: ${firestoreReadCount}`);

    // 4. Batch migrate into D1
    const chunkSize = 50;
    let migratedCount = 0;

    for (let i = 0; i < allFirestoreDocs.length; i += chunkSize) {
      const chunk = allFirestoreDocs.slice(i, i + chunkSize);
      const statements = chunk.map(doc => {
        const docId = doc.id;
        const clientId = docId; // Enforce identical 100% as per strict requirement
        const companyName = doc.companyName || "";
        const searchName = doc.searchName || "";
        const searchTokens = Array.isArray(doc.searchTokens) ? JSON.stringify(doc.searchTokens) : JSON.stringify([]);
        const clientType = doc.clientType || "";
        const companyType = doc.companyType || "";
        const domicile = doc.domicile || "";
        const establishmentDeedDate = doc.establishmentDeedDate || "";
        const establishmentYear = doc.establishmentYear || "";
        const updatedAt = doc.updatedAt || "";
        const isArchived = doc.isArchived ? 1 : 0;
        const npwp = doc.npwp || "";
        const kbliItems = Array.isArray(doc.kbliItems) ? JSON.stringify(doc.kbliItems) : JSON.stringify([]);

        return db.prepare(`
          INSERT INTO client_directory (
            id, client_id, company_name, search_name, search_tokens, client_type,
            company_type, domicile, establishment_deed_date, establishment_year,
            updated_at, is_archived, npwp, kbli_items
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            client_id=excluded.client_id,
            company_name=excluded.company_name,
            search_name=excluded.search_name,
            search_tokens=excluded.search_tokens,
            client_type=excluded.client_type,
            company_type=excluded.company_type,
            domicile=excluded.domicile,
            establishment_deed_date=excluded.establishment_deed_date,
            establishment_year=excluded.establishment_year,
            updated_at=excluded.updated_at,
            is_archived=excluded.is_archived,
            npwp=excluded.npwp,
            kbli_items=excluded.kbli_items
        `).bind(
          docId,
          clientId,
          companyName,
          searchName,
          searchTokens,
          clientType,
          companyType,
          domicile,
          establishmentDeedDate,
          establishmentYear,
          updatedAt,
          isArchived,
          npwp,
          kbliItems
        );
      });

      await db.batch(statements);
      migratedCount += chunk.length;
      console.log(`[Migration] Migrated: ${migratedCount}/${allFirestoreDocs.length}`);
    }

    // 4b. Remove extra records from D1 that are not in Firestore
    const d1AllRowsQueryBeforeDelete = await db.prepare("SELECT id FROM client_directory").all();
    const d1AllRowsBeforeDelete = d1AllRowsQueryBeforeDelete.results || [];
    const firestoreIds = new Set(allFirestoreDocs.map(doc => doc.id));
    const extraD1Ids = d1AllRowsBeforeDelete.map((r: any) => r.id).filter((id: string) => !firestoreIds.has(id));

    if (extraD1Ids.length > 0) {
      console.log(`[Migration] Deleting ${extraD1Ids.length} extra/orphan records from D1 client_directory...`);
      const deleteChunks: any[] = [];
      const delChunkSize = 50;
      for (let i = 0; i < extraD1Ids.length; i += delChunkSize) {
        const chunk = extraD1Ids.slice(i, i + delChunkSize);
        deleteChunks.push(
          db.prepare(`DELETE FROM client_directory WHERE id IN (${chunk.map(() => '?').join(',')})`).bind(...chunk)
        );
      }
      if (deleteChunks.length > 0) {
        await db.batch(deleteChunks);
      }
    }

    // 5. Query D1 to confirm migration count
    const d1AllRowsQuery = await db.prepare("SELECT * FROM client_directory ORDER BY id ASC").all();
    const d1Rows = d1AllRowsQuery.results || [];

    // Order Firestore list identically
    allFirestoreDocs.sort((a, b) => a.id.localeCompare(b.id));

    // 6. Execute 100% full ID and field reconciliation comparison
    const onlyInFirestore: string[] = [];
    const onlyInD1: string[] = [];
    const idMismatches: Array<{ id: string; type: 'FIRESTORE' | 'D1'; detail: string }> = [];
    const fieldMismatches: Array<{ id: string; field: string; firestoreValue: any; d1Value: any }> = [];

    const fIdSet = new Set(allFirestoreDocs.map(d => d.id));
    const dIdSet = new Set(d1Rows.map(r => r.id));

    allFirestoreDocs.forEach(doc => {
      if (!dIdSet.has(doc.id)) {
        onlyInFirestore.push(doc.id);
      }
      if (doc.id !== doc.clientId) {
        idMismatches.push({
          id: doc.id,
          type: 'FIRESTORE',
          detail: `CLIENT_ID_MISMATCH: Document ID [${doc.id}] does not match clientId property [${doc.clientId}]`
        });
      }
    });

    d1Rows.forEach(row => {
      if (!fIdSet.has(row.id)) {
        onlyInD1.push(row.id);
      }
      if (row.id !== row.client_id) {
        idMismatches.push({
          id: row.id,
          type: 'D1',
          detail: `CLIENT_ID_MISMATCH: D1 id [${row.id}] does not match client_id property [${row.client_id}]`
        });
      }
    });

    // Full Field Comparison for matching entries
    allFirestoreDocs.forEach(fDoc => {
      const dRow = d1Rows.find((r: any) => r.id === fDoc.id);
      if (dRow) {
        let dSearchTokens = [];
        try { dSearchTokens = JSON.parse(dRow.search_tokens || '[]'); } catch (e) {}
        let dKbliItems = [];
        try { dKbliItems = JSON.parse(dRow.kbli_items || '[]'); } catch (e) {}

        const fSearchTokens = fDoc.searchTokens || [];
        const fKbliItems = fDoc.kbliItems || [];

        const fieldsToCompare = [
          { field: 'companyName', f: fDoc.companyName || '', d: dRow.company_name || '' },
          { field: 'searchName', f: fDoc.searchName || '', d: dRow.search_name || '' },
          { field: 'clientType', f: fDoc.clientType || '', d: dRow.client_type || '' },
          { field: 'companyType', f: fDoc.companyType || '', d: dRow.company_type || '' },
          { field: 'domicile', f: fDoc.domicile || '', d: dRow.domicile || '' },
          { field: 'establishmentDeedDate', f: fDoc.establishmentDeedDate || '', d: dRow.establishment_deed_date || '' },
          { field: 'establishmentYear', f: fDoc.establishmentYear || '', d: dRow.establishment_year || '' },
          { field: 'updatedAt', f: fDoc.updatedAt || '', d: dRow.updated_at || '' },
          { field: 'isArchived', f: fDoc.isArchived ? 1 : 0, d: dRow.is_archived ? 1 : 0 },
          { field: 'npwp', f: fDoc.npwp || '', d: dRow.npwp || '' },
          { field: 'searchTokens', f: JSON.stringify(fSearchTokens), d: JSON.stringify(dSearchTokens) },
          { field: 'kbliItems', f: JSON.stringify(fKbliItems), d: JSON.stringify(dKbliItems) }
        ];

        fieldsToCompare.forEach(f => {
          if (f.f !== f.d) {
            fieldMismatches.push({
              id: fDoc.id,
              field: f.field,
              firestoreValue: f.f,
              d1Value: f.d
            });
          }
        });
      }
    });

    const isFullyInSync = 
      onlyInFirestore.length === 0 && 
      onlyInD1.length === 0 && 
      idMismatches.length === 0 && 
      fieldMismatches.length === 0 && 
      allFirestoreDocs.length === d1Rows.length;

    const status = isFullyInSync ? 'IN_SYNC' : 'NOT_IN_SYNC';
    const message = isFullyInSync ? '✓ CLIENT DIRECTORY FULLY IN SYNC' : '✗ CLIENT DIRECTORY MISMATCH DETECTED';

    return createJsonResponse({
      success: isFullyInSync,
      status,
      message,
      firestoreCount: allFirestoreDocs.length,
      d1Count: d1Rows.length,
      firestoreReadCount,
      onlyInFirestore,
      onlyInD1,
      idMismatches,
      fieldMismatchesCount: fieldMismatches.length,
      fieldMismatches: fieldMismatches.slice(0, 100) // limit output list for safety
    });
  } catch (error: any) {
    console.error("[Migration API] Fatal error during migration:", error);
    return createErrorResponse(error?.message || "Migration process failed", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
