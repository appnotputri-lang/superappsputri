import { PpatDeed, PpatProfileConfig } from '../types/ppat';

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

export async function getPpatSettingsD1(db: any): Promise<PpatProfileConfig> {
  const row = await db.prepare('SELECT * FROM ppat_settings LIMIT 1').first();
  if (row) {
    return {
      id: row.id,
      ppatName: row.ppat_name || 'PUTRI, S.H., M.Kn.',
      skNumber: row.sk_number || 'SK Kepala BPN RI No. 12-X-2020',
      workingArea: row.working_area || 'Kabupaten Sleman',
      officeAddress: row.office_address || 'Jl. Kaliurang Km 5.5 No. 88, Sleman, D.I. Yogyakarta',
      city: row.city || 'Sleman',
      phone: row.phone || '0274-889900',
      updatedAt: row.updated_at
    };
  }

  // Default fallback
  return {
    ppatName: 'PUTRI, S.H., M.Kn.',
    skNumber: 'SK Kepala BPN RI No. 12-X-2020',
    workingArea: 'Kabupaten Sleman',
    officeAddress: 'Jl. Kaliurang Km 5.5 No. 88, Sleman, D.I. Yogyakarta',
    city: 'Sleman',
    phone: '0274-889900'
  };
}

export async function updatePpatSettingsD1(db: any, config: Partial<PpatProfileConfig>): Promise<PpatProfileConfig> {
  const now = new Date().toISOString();
  const existing = await db.prepare('SELECT id FROM ppat_settings LIMIT 1').first();

  if (existing) {
    await db.prepare(`
      UPDATE ppat_settings SET
        ppat_name = ?, sk_number = ?, working_area = ?, office_address = ?, city = ?, phone = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      config.ppatName || '',
      config.skNumber || '',
      config.workingArea || '',
      config.officeAddress || '',
      config.city || '',
      config.phone || '',
      now,
      existing.id
    ).run();
  } else {
    const id = `ppat_cfg_${Date.now()}`;
    await db.prepare(`
      INSERT INTO ppat_settings (id, ppat_name, sk_number, working_area, office_address, city, phone, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      config.ppatName || 'PUTRI, S.H., M.Kn.',
      config.skNumber || 'SK Kepala BPN RI No. 12-X-2020',
      config.workingArea || 'Kabupaten Sleman',
      config.officeAddress || 'Jl. Kaliurang Km 5.5 No. 88, Sleman, D.I. Yogyakarta',
      config.city || 'Sleman',
      config.phone || '0274-889900',
      now
    ).run();
  }

  return getPpatSettingsD1(db);
}
