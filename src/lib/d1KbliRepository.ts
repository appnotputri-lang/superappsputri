import { ensureD1TablesExist } from '../services/d1MigrationService';

export function formatD1RowToKbliRecord(row: any, recordType: 'mapping' | 'suggestion') {
  if (!row) return null;

  let rawData: any = {};
  if (row.raw_data) {
    try {
      rawData = JSON.parse(row.raw_data);
    } catch (e) {}
  }

  let selectedItems: any[] = [];
  try {
    if (typeof row.selected_items === 'string') {
      selectedItems = JSON.parse(row.selected_items);
    } else if (Array.isArray(row.selected_items)) {
      selectedItems = row.selected_items;
    }
  } catch (e) {
    selectedItems = rawData.selectedItems || rawData.selectedMappings || rawData.selectedKblis || [];
  }

  return {
    ...rawData,
    id: String(row.id || rawData.id),
    nama: String(row.nama || rawData.nama || ''),
    type: recordType,
    kelompokUsaha: row.kelompok_usaha || rawData.kelompokUsaha || 'Mikro',
    selectedItems,
    updatedAt: row.updated_at || rawData.updatedAt || new Date().toISOString(),
    createdAt: row.created_at || rawData.createdAt || row.updated_at || new Date().toISOString(),
    userId: row.user_id !== undefined ? row.user_id : (rawData.userId !== undefined ? rawData.userId : null)
  };
}

export function formatKbliToD1Params(payload: any, recordType: 'mapping' | 'suggestion') {
  const nowIso = new Date().toISOString();
  const id = String(payload.id || `${recordType}-${Date.now()}`);
  const nama = String(payload.nama || payload.name || '').toUpperCase().trim();
  const kelompokUsaha = String(payload.kelompokUsaha || payload.kelompok_usaha || 'Mikro');
  
  const rawItems = payload.selectedItems || payload.selectedMappings || payload.selectedKblis || [];
  const selectedItemsJson = typeof rawItems === 'string' ? rawItems : JSON.stringify(rawItems);
  
  const updatedAt = String(payload.updatedAt || nowIso);
  const createdAt = String(payload.createdAt || payload.updatedAt || nowIso);
  const userId = payload.userId !== undefined ? payload.userId : null;

  const fullPayload = {
    ...payload,
    id,
    nama,
    type: recordType,
    kelompokUsaha,
    selectedItems: Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'string' ? JSON.parse(rawItems) : []),
    updatedAt,
    createdAt,
    userId
  };

  return {
    id,
    nama,
    kelompok_usaha: kelompokUsaha,
    selected_items: selectedItemsJson,
    updated_at: updatedAt,
    user_id: userId,
    created_at: createdAt,
    raw_data: JSON.stringify(fullPayload)
  };
}

// ==================================================
// KBLI MAPPING REPOSITORIES
// ==================================================

export async function getAllKbliMappingD1(db: any, params: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  await ensureD1TablesExist(db);

  let limitVal = 500;
  if (typeof params.limit !== 'undefined') {
    const parsed = parseInt(String(params.limit), 10);
    if (!isNaN(parsed) && parsed > 0) {
      limitVal = Math.min(parsed, 1000);
    }
  }

  const offsetVal = Math.max(0, parseInt(String(params.offset || '0'), 10));
  const searchVal = params.search ? String(params.search).trim().toLowerCase() : '';

  let sql = `SELECT * FROM kbli_mapping_records`;
  const conditions: string[] = [];
  const queryParams: any[] = [];

  if (searchVal) {
    const words = searchVal.split(/\s+/).filter(Boolean);
    for (const word of words) {
      conditions.push(`(LOWER(nama) LIKE ? OR LOWER(selected_items) LIKE ? OR LOWER(kelompok_usaha) LIKE ?)`);
      queryParams.push(`%${word}%`, `%${word}%`, `%${word}%`);
    }
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  sql += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
  queryParams.push(limitVal, offsetVal);

  const res = await db.prepare(sql).bind(...queryParams).all();
  const rows = res.results || [];
  const records = rows.map((r: any) => formatD1RowToKbliRecord(r, 'mapping'));

  return {
    success: true,
    count: records.length,
    limit: limitVal,
    offset: offsetVal,
    records
  };
}

export async function getKbliMappingByIdD1(db: any, id: string) {
  await ensureD1TablesExist(db);

  const row = await db.prepare(`SELECT * FROM kbli_mapping_records WHERE id = ? LIMIT 1`).bind(id).first();
  if (!row) {
    return { success: false, error: 'Record mapping not found', record: null };
  }

  return {
    success: true,
    record: formatD1RowToKbliRecord(row, 'mapping')
  };
}

export async function createKbliMappingD1(db: any, payload: any) {
  await ensureD1TablesExist(db);

  const p = formatKbliToD1Params(payload, 'mapping');

  const sql = `
    INSERT INTO kbli_mapping_records (
      id, nama, kelompok_usaha, selected_items, updated_at, user_id, created_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      nama=excluded.nama,
      kelompok_usaha=excluded.kelompok_usaha,
      selected_items=excluded.selected_items,
      updated_at=excluded.updated_at,
      user_id=excluded.user_id,
      created_at=excluded.created_at,
      raw_data=excluded.raw_data
  `;

  await db.prepare(sql).bind(
    p.id, p.nama, p.kelompok_usaha, p.selected_items, p.updated_at, p.user_id, p.created_at, p.raw_data
  ).run();

  const createdRow = await db.prepare(`SELECT * FROM kbli_mapping_records WHERE id = ? LIMIT 1`).bind(p.id).first();
  return {
    success: true,
    id: p.id,
    record: formatD1RowToKbliRecord(createdRow, 'mapping')
  };
}

export async function updateKbliMappingD1(db: any, id: string, payload: any) {
  await ensureD1TablesExist(db);

  const existingRes = await getKbliMappingByIdD1(db, id);
  const existingRecord = existingRes.record || {};

  const merged = {
    ...existingRecord,
    ...payload,
    id,
    updatedAt: payload.updatedAt || new Date().toISOString()
  };

  const p = formatKbliToD1Params(merged, 'mapping');

  const sql = `
    UPDATE kbli_mapping_records SET
      nama=?, kelompok_usaha=?, selected_items=?, updated_at=?, user_id=?, created_at=?, raw_data=?
    WHERE id=?
  `;

  await db.prepare(sql).bind(
    p.nama, p.kelompok_usaha, p.selected_items, p.updated_at, p.user_id, p.created_at, p.raw_data,
    id
  ).run();

  const updatedRow = await db.prepare(`SELECT * FROM kbli_mapping_records WHERE id = ? LIMIT 1`).bind(id).first();
  return {
    success: true,
    id,
    record: formatD1RowToKbliRecord(updatedRow, 'mapping')
  };
}

export async function deleteKbliMappingD1(db: any, id: string) {
  await ensureD1TablesExist(db);

  await db.prepare(`DELETE FROM kbli_mapping_records WHERE id = ?`).bind(id).run();
  return {
    success: true,
    id,
    message: 'KBLI mapping record deleted successfully'
  };
}

// ==================================================
// KBLI SUGGESTION REPOSITORIES
// ==================================================

export async function getAllKbliSuggestionsD1(db: any, params: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  await ensureD1TablesExist(db);

  let limitVal = 500;
  if (typeof params.limit !== 'undefined') {
    const parsed = parseInt(String(params.limit), 10);
    if (!isNaN(parsed) && parsed > 0) {
      limitVal = Math.min(parsed, 1000);
    }
  }

  const offsetVal = Math.max(0, parseInt(String(params.offset || '0'), 10));
  const searchVal = params.search ? String(params.search).trim().toLowerCase() : '';

  let sql = `SELECT * FROM kbli_suggestion_records`;
  const conditions: string[] = [];
  const queryParams: any[] = [];

  if (searchVal) {
    const words = searchVal.split(/\s+/).filter(Boolean);
    for (const word of words) {
      conditions.push(`(LOWER(nama) LIKE ? OR LOWER(selected_items) LIKE ? OR LOWER(kelompok_usaha) LIKE ?)`);
      queryParams.push(`%${word}%`, `%${word}%`, `%${word}%`);
    }
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  sql += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
  queryParams.push(limitVal, offsetVal);

  const res = await db.prepare(sql).bind(...queryParams).all();
  const rows = res.results || [];
  const records = rows.map((r: any) => formatD1RowToKbliRecord(r, 'suggestion'));

  return {
    success: true,
    count: records.length,
    limit: limitVal,
    offset: offsetVal,
    records
  };
}

export async function getKbliSuggestionByIdD1(db: any, id: string) {
  await ensureD1TablesExist(db);

  const row = await db.prepare(`SELECT * FROM kbli_suggestion_records WHERE id = ? LIMIT 1`).bind(id).first();
  if (!row) {
    return { success: false, error: 'Record suggestion not found', record: null };
  }

  return {
    success: true,
    record: formatD1RowToKbliRecord(row, 'suggestion')
  };
}

export async function createKbliSuggestionD1(db: any, payload: any) {
  await ensureD1TablesExist(db);

  const p = formatKbliToD1Params(payload, 'suggestion');

  const sql = `
    INSERT INTO kbli_suggestion_records (
      id, nama, kelompok_usaha, selected_items, updated_at, user_id, created_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      nama=excluded.nama,
      kelompok_usaha=excluded.kelompok_usaha,
      selected_items=excluded.selected_items,
      updated_at=excluded.updated_at,
      user_id=excluded.user_id,
      created_at=excluded.created_at,
      raw_data=excluded.raw_data
  `;

  await db.prepare(sql).bind(
    p.id, p.nama, p.kelompok_usaha, p.selected_items, p.updated_at, p.user_id, p.created_at, p.raw_data
  ).run();

  const createdRow = await db.prepare(`SELECT * FROM kbli_suggestion_records WHERE id = ? LIMIT 1`).bind(p.id).first();
  return {
    success: true,
    id: p.id,
    record: formatD1RowToKbliRecord(createdRow, 'suggestion')
  };
}

export async function updateKbliSuggestionD1(db: any, id: string, payload: any) {
  await ensureD1TablesExist(db);

  const existingRes = await getKbliSuggestionByIdD1(db, id);
  const existingRecord = existingRes.record || {};

  const merged = {
    ...existingRecord,
    ...payload,
    id,
    updatedAt: payload.updatedAt || new Date().toISOString()
  };

  const p = formatKbliToD1Params(merged, 'suggestion');

  const sql = `
    UPDATE kbli_suggestion_records SET
      nama=?, kelompok_usaha=?, selected_items=?, updated_at=?, user_id=?, created_at=?, raw_data=?
    WHERE id=?
  `;

  await db.prepare(sql).bind(
    p.nama, p.kelompok_usaha, p.selected_items, p.updated_at, p.user_id, p.created_at, p.raw_data,
    id
  ).run();

  const updatedRow = await db.prepare(`SELECT * FROM kbli_suggestion_records WHERE id = ? LIMIT 1`).bind(id).first();
  return {
    success: true,
    id,
    record: formatD1RowToKbliRecord(updatedRow, 'suggestion')
  };
}

export async function deleteKbliSuggestionD1(db: any, id: string) {
  await ensureD1TablesExist(db);

  await db.prepare(`DELETE FROM kbli_suggestion_records WHERE id = ?`).bind(id).run();
  return {
    success: true,
    id,
    message: 'KBLI suggestion record deleted successfully'
  };
}
