import { Product } from '../types';
import { ensureD1TablesExist } from '../services/d1MigrationService';

export function formatD1RowToProduct(row: any): Product {
  if (!row) return null as any;
  let base: any = {};
  if (row.raw_data) {
    try {
      base = JSON.parse(row.raw_data);
    } catch (e) {}
  }

  return {
    ...base,
    id: String(row.id || base.id),
    name: String(row.name || base.name || ''),
    unitPrice: Number(row.unit_price ?? base.unitPrice ?? 0),
    description: row.description || base.description || undefined,
    isTaxed: row.is_taxed === 1 || !!base.isTaxed,
    category: row.category || base.category || undefined,
    createdAt: row.created_at || base.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString(),
  };
}

export async function getAllProductsD1(db: any, params: {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
}) {
  await ensureD1TablesExist(db);

  let limitVal = 10;
  if (typeof params.limit !== 'undefined') {
    const parsed = parseInt(String(params.limit), 10);
    if (!isNaN(parsed) && parsed > 0) {
      limitVal = Math.min(parsed, 500);
    }
  }

  const offsetVal = Math.max(0, parseInt(String(params.offset || '0'), 10));
  const searchVal = params.search ? String(params.search).trim().toLowerCase() : '';
  const categoryVal = params.category ? String(params.category).trim() : 'ALL';

  let sql = `SELECT * FROM products`;
  let countSql = `SELECT COUNT(*) as total FROM products`;
  const conditions: string[] = [];
  const queryParams: any[] = [];

  if (categoryVal && categoryVal !== 'ALL') {
    conditions.push(`category = ?`);
    queryParams.push(categoryVal);
  }

  if (searchVal) {
    conditions.push(`(LOWER(name) LIKE ? OR LOWER(description) LIKE ?)`);
    queryParams.push(`%${searchVal}%`, `%${searchVal}%`);
  }

  if (conditions.length > 0) {
    const whereClause = ` WHERE ` + conditions.join(' AND ');
    sql += whereClause;
    countSql += whereClause;
  }

  sql += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
  const selectParams = [...queryParams, limitVal, offsetVal];

  const countStmt = db.prepare(countSql);
  const selectStmt = db.prepare(sql);

  const [countRes, selectRes] = await Promise.all([
    queryParams.length > 0 ? countStmt.bind(...queryParams).first() : countStmt.first(),
    selectStmt.bind(...selectParams).all()
  ]);

  const total = Number(countRes?.total || 0);
  const rows = selectRes?.results || [];
  const products = rows.map((r: any) => formatD1RowToProduct(r));

  return {
    success: true,
    products,
    total
  };
}

export async function getProductByIdD1(db: any, id: string): Promise<Product | null> {
  await ensureD1TablesExist(db);
  try {
    const row = await db.prepare(`SELECT * FROM products WHERE id = ?`).bind(id).first();
    return row ? formatD1RowToProduct(row) : null;
  } catch (err) {
    console.error('[d1ProductRepository] Error in getProductByIdD1:', err);
    return null;
  }
}

export async function createProductD1(db: any, data: Product): Promise<any> {
  await ensureD1TablesExist(db);
  const now = new Date().toISOString();
  const id = data.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const name = data.name || '';
  const unitPrice = Number(data.unitPrice || 0);
  const description = data.description || null;
  const isTaxed = data.isTaxed ? 1 : 0;
  const category = data.category || null;
  const createdAt = data.createdAt || now;
  const updatedAt = now;

  const rawData = JSON.stringify({
    ...data,
    id,
    createdAt,
    updatedAt
  });

  await db.prepare(`
    INSERT INTO products (id, name, unit_price, description, is_taxed, category, created_at, updated_at, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, name, unitPrice, description, isTaxed, category, createdAt, updatedAt, rawData).run();

  return { success: true, id };
}

export async function updateProductD1(db: any, id: string, data: Partial<Product>): Promise<any> {
  await ensureD1TablesExist(db);
  const now = new Date().toISOString();
  const existing = await getProductByIdD1(db, id);
  if (!existing) {
    throw new Error(`Product not found with id ${id}`);
  }

  const merged = { ...existing, ...data, id, updatedAt: now };
  const name = merged.name || '';
  const unitPrice = Number(merged.unitPrice || 0);
  const description = merged.description || null;
  const isTaxed = merged.isTaxed ? 1 : 0;
  const category = merged.category || null;
  const rawData = JSON.stringify(merged);

  await db.prepare(`
    UPDATE products
    SET name = ?, unit_price = ?, description = ?, is_taxed = ?, category = ?, updated_at = ?, raw_data = ?
    WHERE id = ?
  `).bind(name, unitPrice, description, isTaxed, category, now, rawData, id).run();

  return { success: true };
}

export async function deleteProductD1(db: any, id: string): Promise<any> {
  await ensureD1TablesExist(db);
  await db.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
  return { success: true };
}
