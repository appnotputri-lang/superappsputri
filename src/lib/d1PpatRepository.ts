import { PpatDeed, PpatProfileConfig, DEFAULT_PPAT_PROFILE } from '../types/ppat';

export async function getAllPpatDeedsD1(db: any, options?: { year?: number; month?: number }): Promise<PpatDeed[]> {
  let query = 'SELECT * FROM ppat_deeds';
  const params: any[] = [];

  if (options?.year && options?.month) {
    const monthStr = options.month.toString().padStart(2, '0');
    const prefix = `${options.year}-${monthStr}%`;
    query += ' WHERE date LIKE ?';
    params.push(prefix);
  } else if (options?.year) {
    const prefix = `${options.year}-%`;
    query += ' WHERE date LIKE ?';
    params.push(prefix);
  }

  query += ' ORDER BY date ASC, order_number ASC, deed_number ASC';

  const rows = await db.prepare(query).bind(...params).all();
  return (rows.results || []).map((r: any) => ({
    id: r.id,
    orderNumber: r.order_number,
    deedNumber: r.deed_number,
    date: r.date,
    legalActType: r.legal_act_type || 'Jual Beli',
    grantorName: r.grantor_name || '',
    grantorAddress: r.grantor_address || '',
    grantorNpwp: r.grantor_npwp || '',
    transfereeName: r.transferee_name || '',
    transfereeAddress: r.transferee_address || '',
    transfereeNpwp: r.transferee_npwp || '',
    rightTypeAndNumber: r.right_type_and_number || '',
    landLocation: r.land_location || '',
    landArea: r.land_area ?? 0,
    buildingArea: r.building_area ?? 0,
    transactionValue: r.transaction_value ?? 0,
    spptPbbNopYear: r.sppt_pbb_nop_year || '',
    spptPbbNjop: r.sppt_pbb_njop ?? 0,
    sspDate: r.ssp_date || '',
    sspAmount: r.ssp_amount ?? 0,
    ssbDate: r.ssb_date || '',
    ssbAmount: r.ssb_amount ?? 0,
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

export async function getPpatDeedByIdD1(db: any, id: string): Promise<PpatDeed | null> {
  const r = await db.prepare('SELECT * FROM ppat_deeds WHERE id = ?').bind(id).first();
  if (!r) return null;
  return {
    id: r.id,
    orderNumber: r.order_number,
    deedNumber: r.deed_number,
    date: r.date,
    legalActType: r.legal_act_type || 'Jual Beli',
    grantorName: r.grantor_name || '',
    grantorAddress: r.grantor_address || '',
    grantorNpwp: r.grantor_npwp || '',
    transfereeName: r.transferee_name || '',
    transfereeAddress: r.transferee_address || '',
    transfereeNpwp: r.transferee_npwp || '',
    rightTypeAndNumber: r.right_type_and_number || '',
    landLocation: r.land_location || '',
    landArea: r.land_area ?? 0,
    buildingArea: r.building_area ?? 0,
    transactionValue: r.transaction_value ?? 0,
    spptPbbNopYear: r.sppt_pbb_nop_year || '',
    spptPbbNjop: r.sppt_pbb_njop ?? 0,
    sspDate: r.ssp_date || '',
    sspAmount: r.ssp_amount ?? 0,
    ssbDate: r.ssb_date || '',
    ssbAmount: r.ssb_amount ?? 0,
    notes: r.notes || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export async function createPpatDeedD1(db: any, data: Partial<PpatDeed>): Promise<PpatDeed> {
  const id = data.id || `ppat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO ppat_deeds (
      id, order_number, deed_number, date, legal_act_type,
      grantor_name, grantor_address, grantor_npwp,
      transferee_name, transferee_address, transferee_npwp,
      right_type_and_number, land_location, land_area, building_area,
      transaction_value, sppt_pbb_nop_year, sppt_pbb_njop,
      ssp_date, ssp_amount, ssb_date, ssb_amount,
      notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `).bind(
    id,
    data.orderNumber || '',
    data.deedNumber || '',
    data.date || '',
    data.legalActType || 'Jual Beli',
    data.grantorName || '',
    data.grantorAddress || '',
    data.grantorNpwp || '',
    data.transfereeName || '',
    data.transfereeAddress || '',
    data.transfereeNpwp || '',
    data.rightTypeAndNumber || '',
    data.landLocation || '',
    Number(data.landArea) || 0,
    Number(data.buildingArea) || 0,
    Number(data.transactionValue) || 0,
    data.spptPbbNopYear || '',
    Number(data.spptPbbNjop) || 0,
    data.sspDate || '',
    Number(data.sspAmount) || 0,
    data.ssbDate || '',
    Number(data.ssbAmount) || 0,
    data.notes || '',
    now,
    now
  ).run();

  return {
    id,
    orderNumber: data.orderNumber || '',
    deedNumber: data.deedNumber || '',
    date: data.date || '',
    legalActType: data.legalActType || 'Jual Beli',
    grantorName: data.grantorName || '',
    grantorAddress: data.grantorAddress || '',
    grantorNpwp: data.grantorNpwp || '',
    transfereeName: data.transfereeName || '',
    transfereeAddress: data.transfereeAddress || '',
    transfereeNpwp: data.transfereeNpwp || '',
    rightTypeAndNumber: data.rightTypeAndNumber || '',
    landLocation: data.landLocation || '',
    landArea: Number(data.landArea) || 0,
    buildingArea: Number(data.buildingArea) || 0,
    transactionValue: Number(data.transactionValue) || 0,
    spptPbbNopYear: data.spptPbbNopYear || '',
    spptPbbNjop: Number(data.spptPbbNjop) || 0,
    sspDate: data.sspDate || '',
    sspAmount: Number(data.sspAmount) || 0,
    ssbDate: data.ssbDate || '',
    ssbAmount: Number(data.ssbAmount) || 0,
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now
  };
}

export async function updatePpatDeedD1(db: any, id: string, data: Partial<PpatDeed>): Promise<PpatDeed | null> {
  const now = new Date().toISOString();

  await db.prepare(`
    UPDATE ppat_deeds SET
      order_number = ?, deed_number = ?, date = ?, legal_act_type = ?,
      grantor_name = ?, grantor_address = ?, grantor_npwp = ?,
      transferee_name = ?, transferee_address = ?, transferee_npwp = ?,
      right_type_and_number = ?, land_location = ?, land_area = ?, building_area = ?,
      transaction_value = ?, sppt_pbb_nop_year = ?, sppt_pbb_njop = ?,
      ssp_date = ?, ssp_amount = ?, ssb_date = ?, ssb_amount = ?,
      notes = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    data.orderNumber || '',
    data.deedNumber || '',
    data.date || '',
    data.legalActType || 'Jual Beli',
    data.grantorName || '',
    data.grantorAddress || '',
    data.grantorNpwp || '',
    data.transfereeName || '',
    data.transfereeAddress || '',
    data.transfereeNpwp || '',
    data.rightTypeAndNumber || '',
    data.landLocation || '',
    Number(data.landArea) || 0,
    Number(data.buildingArea) || 0,
    Number(data.transactionValue) || 0,
    data.spptPbbNopYear || '',
    Number(data.spptPbbNjop) || 0,
    data.sspDate || '',
    Number(data.sspAmount) || 0,
    data.ssbDate || '',
    Number(data.ssbAmount) || 0,
    data.notes || '',
    now,
    id
  ).run();

  return getPpatDeedByIdD1(db, id);
}

export async function deletePpatDeedD1(db: any, id: string): Promise<boolean> {
  await db.prepare('DELETE FROM ppat_deeds WHERE id = ?').bind(id).run();
  return true;
}

export function ensurePpatTablesD1(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ppat_deeds (
      id TEXT PRIMARY KEY,
      order_number INTEGER,
      deed_number TEXT,
      deed_date TEXT,
      legal_act_type TEXT,
      first_party_name TEXT,
      first_party_address TEXT,
      first_party_npwp TEXT,
      second_party_name TEXT,
      second_party_address TEXT,
      second_party_npwp TEXT,
      land_right_type TEXT,
      land_right_number TEXT,
      location TEXT,
      land_area REAL,
      building_area REAL,
      transaction_price REAL,
      sppt_nop TEXT,
      sppt_njop REAL,
      ssp_date TEXT,
      ssp_amount REAL,
      ssb_date TEXT,
      ssb_amount REAL,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ppat_settings (
      id TEXT PRIMARY KEY,
      ppat_name TEXT,
      sk_number TEXT,
      working_area TEXT,
      office_address TEXT,
      city TEXT,
      phone TEXT,
      npwp TEXT,
      report_recipients TEXT,
      updated_at TEXT
    );
  `);
}

export async function getPpatSettingsD1(db: any): Promise<PpatProfileConfig> {
  // Ensure columns exist
  try {
    await db.prepare('ALTER TABLE ppat_settings ADD COLUMN npwp TEXT').run();
  } catch (_) {}
  try {
    await db.prepare('ALTER TABLE ppat_settings ADD COLUMN report_recipients TEXT').run();
  } catch (_) {}

  const row = await db.prepare('SELECT * FROM ppat_settings LIMIT 1').first();
  if (row) {
    const rawSk = row.sk_number || '';
    const cleanSk = rawSk.includes('12-X-2020') ? '' : rawSk;
    const cleanNpwp = (!row.npwp || row.npwp === '24.150.722.7-421.001') ? '3217015610760002' : row.npwp;
    const cleanCity = (!row.city || row.city === 'Sleman' || row.city === 'Lembang') ? 'Bandung Barat' : row.city;
    const cleanWorkingArea = (!row.working_area || row.working_area === 'Kabupaten Sleman') ? 'KABUPATEN BANDUNG BARAT' : row.working_area;
    const cleanOfficeAddress = (!row.office_address || row.office_address.includes('Kaliurang')) ? 'Komp. PPR-ITB Kav. F-5 Dago Bengkok, Lembang' : row.office_address;
    const cleanPpatName = (!row.ppat_name || row.ppat_name.includes('PUTRI, S.H.')) ? 'R.A. NUKANTINI PUTRI PARINCHA, SH, M.Kn' : row.ppat_name;

    return {
      id: row.id,
      ppatName: cleanPpatName,
      skNumber: cleanSk,
      workingArea: cleanWorkingArea,
      officeAddress: cleanOfficeAddress,
      city: cleanCity,
      phone: row.phone || DEFAULT_PPAT_PROFILE.phone,
      npwp: cleanNpwp,
      reportRecipients: row.report_recipients || DEFAULT_PPAT_PROFILE.reportRecipients,
      updatedAt: row.updated_at
    };
  }

  // Default fallback
  return { ...DEFAULT_PPAT_PROFILE };
}

export async function updatePpatSettingsD1(db: any, config: Partial<PpatProfileConfig>): Promise<PpatProfileConfig> {
  const now = new Date().toISOString();
  // Ensure columns exist
  try {
    await db.prepare('ALTER TABLE ppat_settings ADD COLUMN npwp TEXT').run();
  } catch (_) {}
  try {
    await db.prepare('ALTER TABLE ppat_settings ADD COLUMN report_recipients TEXT').run();
  } catch (_) {}

  const rawSk = config.skNumber || '';
  const cleanSk = rawSk.includes('12-X-2020') ? '' : rawSk;
  const ppatName = config.ppatName || DEFAULT_PPAT_PROFILE.ppatName;
  const workingArea = config.workingArea || DEFAULT_PPAT_PROFILE.workingArea;
  const officeAddress = config.officeAddress || DEFAULT_PPAT_PROFILE.officeAddress;
  const city = config.city || DEFAULT_PPAT_PROFILE.city;
  const phone = config.phone || DEFAULT_PPAT_PROFILE.phone;
  const npwp = config.npwp || DEFAULT_PPAT_PROFILE.npwp;
  const reportRecipients = config.reportRecipients || DEFAULT_PPAT_PROFILE.reportRecipients;

  const existing = await db.prepare('SELECT id FROM ppat_settings LIMIT 1').first();

  if (existing) {
    await db.prepare(`
      UPDATE ppat_settings SET
        ppat_name = ?, sk_number = ?, working_area = ?, office_address = ?, city = ?, phone = ?, npwp = ?, report_recipients = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      ppatName,
      cleanSk,
      workingArea,
      officeAddress,
      city,
      phone,
      npwp,
      reportRecipients,
      now,
      existing.id
    ).run();
  } else {
    const id = `ppat_cfg_${Date.now()}`;
    await db.prepare(`
      INSERT INTO ppat_settings (id, ppat_name, sk_number, working_area, office_address, city, phone, npwp, report_recipients, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      ppatName,
      cleanSk,
      workingArea,
      officeAddress,
      city,
      phone,
      npwp,
      reportRecipients,
      now
    ).run();
  }

  return getPpatSettingsD1(db);
}
