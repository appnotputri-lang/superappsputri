import { createJsonResponse, createErrorResponse, handleOptions } from '../../src/runtime';
import { requireAuth } from '../_lib/authGuard';

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
}

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    await ensureTableExists(db);

    const url = new URL(request.url);
    const limitVal = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '15')), 10000);
    const offsetVal = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
    const clientType = url.searchParams.get('clientType');
    const archived = url.searchParams.get('archived');
    const searchVal = url.searchParams.get('search') || url.searchParams.get('q');

    let sql = `SELECT * FROM client_directory`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (clientType) {
      conditions.push(`client_type = ?`);
      params.push(clientType);
    }

    if (archived === 'false') {
      conditions.push(`is_archived = 0`);
    } else if (archived === 'true') {
      conditions.push(`is_archived = 1`);
    }

    if (searchVal) {
      const words = searchVal.trim().toLowerCase().split(/\s+/).filter(Boolean);
      for (const word of words) {
        conditions.push(`(LOWER(company_name) LIKE ? OR LOWER(search_name) LIKE ? OR LOWER(client_type) LIKE ?)`);
        params.push(`%${word}%`, `%${word}%`, `%${word}%`);
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    let totalCount = 0;
    try {
      let countSql = `SELECT COUNT(*) as total FROM client_directory`;
      if (conditions.length > 0) {
        countSql += ` WHERE ` + conditions.join(' AND ');
      }
      const countRes = await db.prepare(countSql).bind(...params).first();
      totalCount = countRes ? (countRes.total || 0) : 0;
    } catch (countErr) {
      console.error("[Clients API GET] Count query failed:", countErr);
    }

    sql += ` ORDER BY company_name ASC LIMIT ? OFFSET ?`;
    params.push(limitVal, offsetVal);

    const queryRes = await db.prepare(sql).bind(...params).all();
    const rows = queryRes.results || [];

    // Format fields (like JSON strings back to arrays/objects)
    const formattedRows = rows.map((row: any) => {
      let searchTokens = [];
      try {
        if (row.search_tokens) {
          searchTokens = JSON.parse(row.search_tokens);
        }
      } catch (e) {}

      let kbliItems = [];
      try {
        if (row.kbli_items) {
          kbliItems = JSON.parse(row.kbli_items);
        }
      } catch (e) {}

      return {
        id: row.id,
        clientId: row.client_id,
        companyName: row.company_name,
        searchName: row.search_name,
        searchTokens,
        clientType: row.client_type,
        companyType: row.company_type,
        domicile: row.domicile,
        establishmentDeedDate: row.establishment_deed_date,
        establishmentYear: row.establishment_year,
        updatedAt: row.updated_at,
        isArchived: row.is_archived === 1,
        npwp: row.npwp,
        kbliItems
      };
    });

    return createJsonResponse({
      success: true,
      count: formattedRows.length,
      total: totalCount,
      limit: limitVal,
      offset: offsetVal,
      clients: formattedRows
    });
  } catch (error: any) {
    console.error("[Clients API] Error querying D1 client_directory:", error);
    return createErrorResponse(error?.message || "Database query failed", 500);
  }
};

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    await ensureTableExists(db);
    const entry = await request.json();

    const docId = entry.id;
    const clientId = docId; // Must be identical 100% as per strict requirement
    const companyName = entry.companyName || "";
    const searchName = entry.searchName || "";
    const searchTokens = Array.isArray(entry.searchTokens) ? JSON.stringify(entry.searchTokens) : JSON.stringify([]);
    const clientType = entry.clientType || "";
    const companyType = entry.companyType || "";
    const domicile = entry.domicile || "";
    const establishmentDeedDate = entry.establishmentDeedDate || "";
    const establishmentYear = entry.establishmentYear || "";
    const updatedAt = entry.updatedAt || "";
    const isArchived = entry.isArchived ? 1 : 0;
    const npwp = entry.npwp || "";
    const kbliItems = Array.isArray(entry.kbliItems) ? JSON.stringify(entry.kbliItems) : JSON.stringify([]);

    await db.prepare(`
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
    ).run();

    return createJsonResponse({ success: true, message: "Client synced to D1 successfully" });
  } catch (error: any) {
    console.error("[Clients API POST] Sync error:", error);
    return createErrorResponse(error?.message || "Sync failed", 500);
  }
};

export const onRequestDelete = async (context: any) => {
  const { request, env } = context;
  const authResult = await requireAuth(request, env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const db = env.DB;
  if (!db) {
    return createErrorResponse("Cloudflare D1 binding (env.DB) is not configured.", 500);
  }

  try {
    await ensureTableExists(db);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return createErrorResponse("Missing 'id' query parameter", 400);
    }

    await db.prepare(`DELETE FROM client_directory WHERE id = ?`).bind(id).run();

    return createJsonResponse({ success: true, message: "Client deleted from D1 successfully" });
  } catch (error: any) {
    console.error("[Clients API DELETE] error:", error);
    return createErrorResponse(error?.message || "Deletion failed", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
