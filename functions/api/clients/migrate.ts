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
        const clientId = doc.clientId || docId;
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

    // 5. Query D1 to confirm migration count
    const d1AllRowsQuery = await db.prepare("SELECT * FROM client_directory ORDER BY id ASC").all();
    const d1Rows = d1AllRowsQuery.results || [];

    // Order Firestore list identically
    allFirestoreDocs.sort((a, b) => a.id.localeCompare(b.id));

    // 6. Execute sample comparison (10 first, 10 random, 10 last)
    const totalCount = allFirestoreDocs.length;
    const first10Indices = Array.from({ length: Math.min(10, totalCount) }, (_, i) => i);
    const last10Indices = Array.from({ length: Math.min(10, totalCount) }, (_, i) => totalCount - 1 - i)
      .filter(i => !first10Indices.includes(i))
      .reverse();

    const remainingIndices = Array.from({ length: totalCount }, (_, i) => i)
      .filter(i => !first10Indices.includes(i) && !last10Indices.includes(i));

    const random10Indices: number[] = [];
    while (random10Indices.length < Math.min(10, remainingIndices.length)) {
      const randIdx = remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
      if (!random10Indices.includes(randIdx)) {
        random10Indices.push(randIdx);
      }
    }
    random10Indices.sort((a, b) => a - b);

    const samplesToCompare = [
      ...first10Indices.map(i => ({ index: i, type: 'FIRST' })),
      ...random10Indices.map(i => ({ index: i, type: 'RANDOM' })),
      ...last10Indices.map(i => ({ index: i, type: 'LAST' }))
    ];

    const comparisons = samplesToCompare.map(({ index, type }) => {
      const fDoc = allFirestoreDocs[index];
      const dRow = d1Rows.find((r: any) => r.id === fDoc.id);

      if (!dRow) {
        return {
          index,
          type,
          id: fDoc.id,
          match: false,
          reason: "Row not found in D1"
        };
      }

      let dSearchTokens = [];
      try { dSearchTokens = JSON.parse(dRow.search_tokens || '[]'); } catch (e) {}
      let dKbliItems = [];
      try { dKbliItems = JSON.parse(dRow.kbli_items || '[]'); } catch (e) {}

      const fSearchTokens = fDoc.searchTokens || [];
      const fKbliItems = fDoc.kbliItems || [];

      const fields = [
        { field: 'clientId', f: fDoc.clientId || fDoc.id, d: dRow.client_id },
        { field: 'companyName', f: fDoc.companyName || '', d: dRow.company_name },
        { field: 'searchName', f: fDoc.searchName || '', d: dRow.search_name },
        { field: 'clientType', f: fDoc.clientType || '', d: dRow.client_type },
        { field: 'companyType', f: fDoc.companyType || '', d: dRow.company_type },
        { field: 'domicile', f: fDoc.domicile || '', d: dRow.domicile },
        { field: 'establishmentDeedDate', f: fDoc.establishmentDeedDate || '', d: dRow.establishment_deed_date },
        { field: 'establishmentYear', f: fDoc.establishmentYear || '', d: dRow.establishment_year },
        { field: 'updatedAt', f: fDoc.updatedAt || '', d: dRow.updated_at },
        { field: 'isArchived', f: fDoc.isArchived ? 1 : 0, d: dRow.is_archived },
        { field: 'npwp', f: fDoc.npwp || '', d: dRow.npwp },
        { field: 'searchTokens', f: JSON.stringify(fSearchTokens), d: JSON.stringify(dSearchTokens) },
        { field: 'kbliItems', f: JSON.stringify(fKbliItems), d: JSON.stringify(dKbliItems) }
      ];

      const mismatches = fields.filter(f => f.f !== f.d);

      return {
        index,
        type,
        id: fDoc.id,
        match: mismatches.length === 0,
        mismatches: mismatches.map(m => ({ field: m.field, firestore: m.f, d1: m.d }))
      };
    });

    const isSuccess = comparisons.every(c => c.match) && (allFirestoreDocs.length === d1Rows.length);

    return createJsonResponse({
      success: isSuccess,
      firestoreCount: allFirestoreDocs.length,
      d1Count: d1Rows.length,
      firestoreReadCount,
      sampleComparisons: comparisons
    });
  } catch (error: any) {
    console.error("[Migration API] Fatal error during migration:", error);
    return createErrorResponse(error?.message || "Migration process failed", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
