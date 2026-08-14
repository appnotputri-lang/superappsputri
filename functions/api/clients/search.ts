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
    const searchVal = url.searchParams.get('q') || url.searchParams.get('search') || '';
    const limitVal = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '15')), 10000);
    const offsetVal = Math.max(0, parseInt(url.searchParams.get('offset') || '0'));
    const clientType = url.searchParams.get('clientType');
    const archived = url.searchParams.get('archived');

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
      console.error("[Search API GET] Count query failed:", countErr);
    }

    sql += ` ORDER BY company_name ASC LIMIT ? OFFSET ?`;
    params.push(limitVal, offsetVal);

    const queryRes = await db.prepare(sql).bind(...params).all();
    const rows = queryRes.results || [];

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
      q: searchVal,
      clients: formattedRows
    });
  } catch (error: any) {
    console.error("[Search API] Error querying D1 client_directory:", error);
    return createErrorResponse(error?.message || "Search query failed", 500);
  }
};

export const onRequestOptions = async () => {
  return handleOptions();
};
