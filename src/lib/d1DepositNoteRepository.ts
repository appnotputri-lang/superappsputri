import { DepositNote, DepositNoteItem } from '../../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

export function formatD1RowToDepositNote(row: any, itemsRows?: any[]): DepositNote {
  if (!row) return null as any;

  let base: any = {};
  if (row.raw_data) {
    try {
      base = JSON.parse(row.raw_data);
    } catch (e) {}
  }

  let items: DepositNoteItem[] = [];
  if (itemsRows && Array.isArray(itemsRows) && itemsRows.length > 0) {
    items = itemsRows.map((it: any, idx: number) => ({
      id: String(it.id || `dni_${idx}`),
      depositNoteId: String(it.deposit_note_id || row.id),
      description: String(it.description || ''),
      amount: Number(it.amount || 0),
      sortOrder: Number(it.sort_order ?? idx),
      createdAt: it.created_at || row.created_at
    }));
  } else if (base.items && Array.isArray(base.items)) {
    items = base.items;
  }

  const hideQr = row.hide_qr != null ? Boolean(row.hide_qr) : Boolean(base.hideQr);

  return {
    ...base,
    id: String(row.id || base.id),
    depositNumber: String(row.deposit_number || base.depositNumber || ''),
    date: String(row.date || base.date || new Date().toISOString().slice(0, 10)),
    clientId: row.client_id || base.clientId || undefined,
    clientName: String(row.client_name || base.clientName || ''),
    clientAddress: row.client_address || base.clientAddress || undefined,
    recipientName: row.recipient_name || base.recipientName || undefined,
    paymentMethod: row.payment_method || base.paymentMethod || undefined,
    totalAmount: Number(row.total_amount ?? base.totalAmount ?? 0),
    hideQr,
    notes: row.notes || base.notes || undefined,
    items,
    createdAt: row.created_at || base.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString()
  };
}

export async function fetchNextDepositNumberD1(db: any, year: number) {
  await ensureD1TablesExist(db);

  const prefix = `TTP/${year}/`;
  const res = await db.prepare(
    `SELECT deposit_number FROM deposit_notes WHERE deposit_number LIKE ?`
  ).bind(`${prefix}%`).all();

  const rows = res?.results || [];
  let maxSeq = 0;
  for (const row of rows) {
    const num = String(row.deposit_number || '');
    if (!num.startsWith(prefix)) continue;
    const suffix = num.slice(prefix.length);
    const digits = suffix.match(/^\d+/);
    if (digits) {
      const val = parseInt(digits[0], 10);
      if (!isNaN(val) && val > maxSeq) maxSeq = val;
    }
  }

  const nextSeq = maxSeq + 1;
  const nextDepositNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

  return { success: true, nextDepositNumber };
}

export async function getAllDepositNotesD1(
  db: any,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    clientId?: string;
  } = {}
) {
  await ensureD1TablesExist(db);

  const limit = Math.min(Math.max(options.limit || 20, 1), 100);
  const offset = Math.max(options.offset || 0, 0);

  const conditions: string[] = [];
  const params: any[] = [];

  if (options.clientId) {
    conditions.push(`client_id = ?`);
    params.push(options.clientId);
  }

  if (options.search) {
    const term = `%${options.search.trim()}%`;
    conditions.push(`(deposit_number LIKE ? OR client_name LIKE ? OR recipient_name LIKE ? OR payment_method LIKE ?)`);
    params.push(term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countSql = `SELECT COUNT(*) as count FROM deposit_notes ${whereClause}`;
  const countRes = await db.prepare(countSql).bind(...params).first();
  const total = Number(countRes?.count || 0);

  // Get paginated rows
  const querySql = `
    SELECT * FROM deposit_notes
    ${whereClause}
    ORDER BY date DESC, created_at DESC
    LIMIT ? OFFSET ?
  `;
  const queryParams = [...params, limit, offset];
  const rowsRes = await db.prepare(querySql).bind(...queryParams).all();
  const rows = rowsRes?.results || [];

  const depositNotes: DepositNote[] = [];

  for (const row of rows) {
    // Fetch items for this deposit note
    const itemsRes = await db.prepare(
      `SELECT * FROM deposit_note_items WHERE deposit_note_id = ? ORDER BY sort_order ASC`
    ).bind(row.id).all();
    const itemRows = itemsRes?.results || [];
    depositNotes.push(formatD1RowToDepositNote(row, itemRows));
  }

  return {
    success: true,
    depositNotes,
    total,
    limit,
    offset
  };
}

export async function getDepositNoteByIdD1(db: any, id: string) {
  await ensureD1TablesExist(db);

  const row = await db.prepare(`SELECT * FROM deposit_notes WHERE id = ? LIMIT 1`).bind(id).first();
  if (!row) {
    return { success: false, error: 'Gagal memuat data titipan: Data tidak ditemukan' };
  }

  const itemsRes = await db.prepare(
    `SELECT * FROM deposit_note_items WHERE deposit_note_id = ? ORDER BY sort_order ASC`
  ).bind(id).all();
  const itemRows = itemsRes?.results || [];

  const depositNote = formatD1RowToDepositNote(row, itemRows);
  return {
    success: true,
    depositNote
  };
}

export async function createDepositNoteD1(db: any, payload: Partial<DepositNote>) {
  await ensureD1TablesExist(db);

  const nowIso = new Date().toISOString();
  const currentYear = new Date().getFullYear();
  const id = payload.id || `dep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  let depositNumber = (payload.depositNumber || '').trim();
  if (!depositNumber) {
    const nextRes = await fetchNextDepositNumberD1(db, currentYear);
    depositNumber = nextRes.nextDepositNumber;
  }

  const items: DepositNoteItem[] = payload.items || [];
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const depositNote: DepositNote = {
    id,
    depositNumber,
    date: payload.date || nowIso.slice(0, 10),
    clientId: payload.clientId,
    clientName: payload.clientName || 'Klien Baru',
    clientAddress: payload.clientAddress,
    recipientName: payload.recipientName || 'Staff Notaris',
    paymentMethod: payload.paymentMethod || 'Transfer',
    totalAmount,
    hideQr: Boolean(payload.hideQr),
    notes: payload.notes,
    items,
    createdAt: payload.createdAt || nowIso,
    updatedAt: nowIso
  };

  const rawData = JSON.stringify(depositNote);

  // Insert into deposit_notes
  await db.prepare(`
    INSERT INTO deposit_notes (
      id, deposit_number, date, client_id, client_name, client_address,
      recipient_name, payment_method, total_amount, hide_qr, notes,
      created_at, updated_at, raw_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    depositNote.id,
    depositNote.depositNumber,
    depositNote.date,
    depositNote.clientId || null,
    depositNote.clientName,
    depositNote.clientAddress || null,
    depositNote.recipientName || null,
    depositNote.paymentMethod || null,
    depositNote.totalAmount,
    depositNote.hideQr ? 1 : 0,
    depositNote.notes || null,
    depositNote.createdAt,
    depositNote.updatedAt,
    rawData
  ).run();

  // Insert item rows into deposit_note_items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = item.id || `dni_${Date.now()}_${i}`;
    await db.prepare(`
      INSERT INTO deposit_note_items (
        id, deposit_note_id, description, amount, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      itemId,
      depositNote.id,
      item.description || '',
      Number(item.amount) || 0,
      i,
      nowIso
    ).run();
  }

  return {
    success: true,
    id: depositNote.id,
    depositNote
  };
}

export async function updateDepositNoteD1(db: any, id: string, payload: Partial<DepositNote>) {
  await ensureD1TablesExist(db);

  const existingRes = await getDepositNoteByIdD1(db, id);
  if (!existingRes.success) {
    return existingRes;
  }

  const existing = existingRes.depositNote;
  const nowIso = new Date().toISOString();

  const items: DepositNoteItem[] = payload.items || existing.items || [];
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const updatedNote: DepositNote = {
    ...existing,
    ...payload,
    id,
    totalAmount,
    items,
    updatedAt: nowIso
  };

  const rawData = JSON.stringify(updatedNote);

  // Update deposit_notes table
  await db.prepare(`
    UPDATE deposit_notes SET
      deposit_number = ?,
      date = ?,
      client_id = ?,
      client_name = ?,
      client_address = ?,
      recipient_name = ?,
      payment_method = ?,
      total_amount = ?,
      hide_qr = ?,
      notes = ?,
      updated_at = ?,
      raw_data = ?
    WHERE id = ?
  `).bind(
    updatedNote.depositNumber,
    updatedNote.date,
    updatedNote.clientId || null,
    updatedNote.clientName,
    updatedNote.clientAddress || null,
    updatedNote.recipientName || null,
    updatedNote.paymentMethod || null,
    updatedNote.totalAmount,
    updatedNote.hideQr ? 1 : 0,
    updatedNote.notes || null,
    updatedNote.updatedAt,
    rawData,
    id
  ).run();

  // Delete existing items
  await db.prepare(`DELETE FROM deposit_note_items WHERE deposit_note_id = ?`).bind(id).run();

  // Insert new items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = item.id || `dni_${Date.now()}_${i}`;
    await db.prepare(`
      INSERT INTO deposit_note_items (
        id, deposit_note_id, description, amount, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      itemId,
      id,
      item.description || '',
      Number(item.amount) || 0,
      i,
      nowIso
    ).run();
  }

  return {
    success: true,
    id,
    depositNote: updatedNote
  };
}

export async function deleteDepositNoteD1(db: any, id: string) {
  await ensureD1TablesExist(db);

  await db.prepare(`DELETE FROM deposit_note_items WHERE deposit_note_id = ?`).bind(id).run();
  await db.prepare(`DELETE FROM deposit_notes WHERE id = ?`).bind(id).run();

  return {
    success: true,
    id,
    message: 'Data titipan berhasil dihapus'
  };
}
