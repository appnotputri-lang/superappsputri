import { PpatCalculationRecord, DEFAULT_CALCULATION, DEFAULT_ADMIN_COSTS } from '../types/ppatCalculator';
import { ensureD1TablesExist } from '../services/d1MigrationService';

export function formatD1RowToPpatCalculation(row: any): PpatCalculationRecord {
  let adminCosts = DEFAULT_ADMIN_COSTS;
  if (row.admin_costs) {
    try {
      const parsed = typeof row.admin_costs === 'string' ? JSON.parse(row.admin_costs) : row.admin_costs;
      if (Array.isArray(parsed)) {
        adminCosts = parsed;
      }
    } catch (_) {}
  }

  let rawDataObj: any = {};
  if (row.raw_data) {
    try {
      rawDataObj = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
    } catch (_) {}
  }

  return {
    ...DEFAULT_CALCULATION,
    ...rawDataObj,
    id: row.id,
    title: row.title || rawDataObj.title || 'PERHITUNGAN PPAT',
    transactionType: row.transaction_type || rawDataObj.transactionType || 'AJB',
    certificateType: row.certificate_type || rawDataObj.certificateType || 'SHM',
    certificateNumber: row.certificate_number || rawDataObj.certificateNumber || '',
    village: row.village || rawDataObj.village || '',
    nop: row.nop || rawDataObj.nop || '',
    landArea: Number(row.land_area ?? rawDataObj.landArea ?? 0),
    landNjopPerM2: Number(row.land_njop_per_m2 ?? rawDataObj.landNjopPerM2 ?? 0),
    buildingArea: Number(row.building_area ?? rawDataObj.buildingArea ?? 0),
    buildingNjopPerM2: Number(row.building_njop_per_m2 ?? rawDataObj.buildingNjopPerM2 ?? 0),
    useMarketEstimation: Boolean(row.use_market_estimation ?? rawDataObj.useMarketEstimation),
    transactionValue: Number(row.transaction_value ?? rawDataObj.transactionValue ?? 0),
    partyCount: String(row.party_count ?? rawDataObj.partyCount ?? '1'),
    npoptkp: Number(row.npoptkp ?? rawDataObj.npoptkp ?? 80000000),
    pphRate: Number(row.pph_rate ?? rawDataObj.pphRate ?? 2.5),
    adminCosts: adminCosts,
    createdAt: row.created_at || rawDataObj.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || rawDataObj.updatedAt || new Date().toISOString()
  };
}

export async function getAllPpatCalculationsD1(db: any): Promise<PpatCalculationRecord[]> {
  await ensureD1TablesExist(db);
  const rows = await db.prepare(
    'SELECT * FROM ppat_calculations ORDER BY updated_at DESC, created_at DESC'
  ).all();

  return (rows.results || []).map(formatD1RowToPpatCalculation);
}

export async function getPpatCalculationByIdD1(db: any, id: string): Promise<PpatCalculationRecord | null> {
  await ensureD1TablesExist(db);
  const row = await db.prepare('SELECT * FROM ppat_calculations WHERE id = ?').bind(id).first();
  if (!row) return null;
  return formatD1RowToPpatCalculation(row);
}

export async function createPpatCalculationD1(db: any, data: Partial<PpatCalculationRecord>): Promise<PpatCalculationRecord> {
  await ensureD1TablesExist(db);
  const id = data.id || `calc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const createdAt = data.createdAt || now;
  const updatedAt = now;

  const adminCostsJson = JSON.stringify(data.adminCosts || DEFAULT_ADMIN_COSTS);
  const rawDataJson = JSON.stringify({
    ...data,
    id,
    createdAt,
    updatedAt
  });

  await db.prepare(`
    INSERT INTO ppat_calculations (
      id, title, transaction_type, certificate_type, certificate_number, village, nop,
      land_area, land_njop_per_m2, building_area, building_njop_per_m2,
      use_market_estimation, transaction_value, party_count, npoptkp, pph_rate,
      admin_costs, grand_total, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `).bind(
    id,
    data.title || 'PERHITUNGAN PPAT',
    data.transactionType || 'AJB',
    data.certificateType || 'SHM',
    data.certificateNumber || '',
    data.village || '',
    data.nop || '',
    Number(data.landArea) || 0,
    Number(data.landNjopPerM2) || 0,
    Number(data.buildingArea) || 0,
    Number(data.buildingNjopPerM2) || 0,
    data.useMarketEstimation ? 1 : 0,
    Number(data.transactionValue) || 0,
    String(data.partyCount || '1'),
    Number(data.npoptkp) || 80000000,
    Number(data.pphRate) || 2.5,
    adminCostsJson,
    0,
    createdAt,
    updatedAt,
    rawDataJson
  ).run();

  const created = await getPpatCalculationByIdD1(db, id);
  return created || {
    ...DEFAULT_CALCULATION,
    ...data,
    id,
    createdAt,
    updatedAt
  } as PpatCalculationRecord;
}

export async function updatePpatCalculationD1(
  db: any,
  id: string,
  data: Partial<PpatCalculationRecord>
): Promise<PpatCalculationRecord | null> {
  await ensureD1TablesExist(db);
  const now = new Date().toISOString();
  const adminCostsJson = JSON.stringify(data.adminCosts || DEFAULT_ADMIN_COSTS);
  
  const existing = await getPpatCalculationByIdD1(db, id);
  const createdAt = existing?.createdAt || data.createdAt || now;

  const rawDataJson = JSON.stringify({
    ...existing,
    ...data,
    id,
    createdAt,
    updatedAt: now
  });

  await db.prepare(`
    UPDATE ppat_calculations SET
      title = ?,
      transaction_type = ?,
      certificate_type = ?,
      certificate_number = ?,
      village = ?,
      nop = ?,
      land_area = ?,
      land_njop_per_m2 = ?,
      building_area = ?,
      building_njop_per_m2 = ?,
      use_market_estimation = ?,
      transaction_value = ?,
      party_count = ?,
      npoptkp = ?,
      pph_rate = ?,
      admin_costs = ?,
      updated_at = ?,
      raw_data = ?
    WHERE id = ?
  `).bind(
    data.title || 'PERHITUNGAN PPAT',
    data.transactionType || 'AJB',
    data.certificateType || 'SHM',
    data.certificateNumber || '',
    data.village || '',
    data.nop || '',
    Number(data.landArea) || 0,
    Number(data.landNjopPerM2) || 0,
    Number(data.buildingArea) || 0,
    Number(data.buildingNjopPerM2) || 0,
    data.useMarketEstimation ? 1 : 0,
    Number(data.transactionValue) || 0,
    String(data.partyCount || '1'),
    Number(data.npoptkp) || 80000000,
    Number(data.pphRate) || 2.5,
    adminCostsJson,
    now,
    rawDataJson,
    id
  ).run();

  return getPpatCalculationByIdD1(db, id);
}

export async function deletePpatCalculationD1(db: any, id: string): Promise<boolean> {
  await ensureD1TablesExist(db);
  await db.prepare('DELETE FROM ppat_calculations WHERE id = ?').bind(id).run();
  return true;
}
