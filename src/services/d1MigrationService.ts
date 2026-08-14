export async function ensureD1TablesExist(db: any) {
  // 1. Invoices table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      client_id TEXT,
      client_name TEXT NOT NULL,
      client_source TEXT DEFAULT 'local',
      client_email TEXT,
      client_phone TEXT,
      client_address TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'UNPAID',
      items TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      tax_rate REAL,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      balance_due REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'IDR',
      project_id TEXT,
      project_title TEXT,
      project_ids TEXT,
      project_titles TEXT,
      quotation_id TEXT,
      quotation_number TEXT,
      language TEXT DEFAULT 'id',
      notes TEXT,
      terms TEXT,
      bank_details TEXT,
      payment_history TEXT,
      public_token TEXT,
      legacy_public_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_client_name ON invoices(client_name);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);`).run();

  // 2. Quotations table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quotation_number TEXT NOT NULL,
      date TEXT NOT NULL,
      valid_until TEXT,
      client_id TEXT,
      client_name TEXT NOT NULL,
      client_address TEXT,
      client_phone TEXT,
      client_email TEXT,
      client_source TEXT DEFAULT 'local',
      items TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_rate REAL,
      discount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      notes TEXT,
      job_title TEXT,
      public_token TEXT,
      invoice_id TEXT,
      invoice_number TEXT,
      project_id TEXT,
      project_title TEXT,
      project_ids TEXT,
      project_titles TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_client_name ON quotations(client_name);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(date);`).run();

  // 3. Products table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit_price REAL NOT NULL DEFAULT 0,
      description TEXT,
      is_taxed INTEGER NOT NULL DEFAULT 0,
      category TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`).run();

  // 4. Client directory table
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

  // 5. KBLI Mapping Records table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS kbli_mapping_records (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      kelompok_usaha TEXT,
      selected_items TEXT NOT NULL,
      updated_at TEXT,
      user_id TEXT,
      created_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_kbli_mapping_nama ON kbli_mapping_records(nama);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_kbli_mapping_updated_at ON kbli_mapping_records(updated_at);`).run();

  // 6. KBLI Suggestion Records table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS kbli_suggestion_records (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      kelompok_usaha TEXT,
      selected_items TEXT NOT NULL,
      updated_at TEXT,
      user_id TEXT,
      created_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_kbli_suggestion_nama ON kbli_suggestion_records(nama);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_kbli_suggestion_updated_at ON kbli_suggestion_records(updated_at);`).run();

  // 7. General Documents table (Surat Jalan & Tanda Terima)
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS general_documents (
      id TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL,
      reference_no TEXT,
      date TEXT,
      client_id TEXT,
      client_name TEXT,
      client_source TEXT,
      client_pic TEXT,
      client_address TEXT,
      client_contact TEXT,
      officer_name TEXT,
      destination TEXT,
      delivery_method TEXT,
      tracking_number TEXT,
      notes TEXT,
      items TEXT,
      public_token TEXT,
      created_at TEXT,
      updated_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_doc_type ON general_documents(doc_type);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_reference_no ON general_documents(reference_no);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_client_id ON general_documents(client_id);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_date ON general_documents(date);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_public_token ON general_documents(public_token);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_docs_created_at ON general_documents(created_at);`).run();

  // 8. Deeds table (Buku Daftar Akta Notaris)
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS deeds (
      id TEXT PRIMARY KEY,
      order_number TEXT,
      number TEXT,
      date TEXT,
      title TEXT,
      category TEXT,
      client_id TEXT,
      client_name TEXT,
      job_name TEXT,
      pic_name TEXT,
      notes TEXT,
      appearers TEXT,
      grantors TEXT,
      created_at TEXT,
      updated_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_deeds_date ON deeds(date);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_deeds_order_number ON deeds(order_number);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_deeds_number ON deeds(number);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_deeds_client_id ON deeds(client_id);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_deeds_created_at ON deeds(created_at);`).run();

  // 9. Private Deeds table (Buku Daftar Akta Di Bawah Tangan / Legalisasi & Waarmerking)
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS private_deeds (
      id TEXT PRIMARY KEY,
      number TEXT,
      registration_date TEXT,
      type TEXT,
      description TEXT,
      parties TEXT,
      pic_name TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_private_deeds_reg_date ON private_deeds(registration_date);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_private_deeds_number ON private_deeds(number);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_private_deeds_type ON private_deeds(type);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_private_deeds_created_at ON private_deeds(created_at);`).run();

  // 10. Incoming Mails table (Buku Surat Masuk)
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS incoming_mails (
      id TEXT PRIMARY KEY,
      date TEXT,
      mail_number TEXT,
      sender TEXT,
      subject TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_incoming_mails_date ON incoming_mails(date);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_incoming_mails_mail_number ON incoming_mails(mail_number);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_incoming_mails_created_at ON incoming_mails(created_at);`).run();

  // 11. Outgoing Mails table (Buku Surat Keluar)
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS outgoing_mails (
      id TEXT PRIMARY KEY,
      date TEXT,
      mail_number TEXT,
      recipient TEXT,
      subject TEXT,
      attachment_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_outgoing_mails_date ON outgoing_mails(date);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_outgoing_mails_mail_number ON outgoing_mails(mail_number);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_outgoing_mails_created_at ON outgoing_mails(created_at);`).run();

  // 12. Protest Cheques table
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS protest_cheques (
      id TEXT PRIMARY KEY,
      number TEXT,
      protest_date TEXT,
      bank_name TEXT,
      cheque_number TEXT,
      amount REAL DEFAULT 0,
      applicant_name TEXT,
      drawer_name TEXT,
      reason TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      raw_data TEXT
    );
  `).run();

  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_protest_cheques_date ON protest_cheques(protest_date);`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_protest_cheques_number ON protest_cheques(number);`).run();
}

export function selectValidationIndices(totalCount: number): { index: number; type: 'FIRST' | 'RANDOM' | 'LAST' }[] {
  if (totalCount <= 0) return [];
  if (totalCount <= 30) {
    return Array.from({ length: totalCount }, (_, i) => ({
      index: i,
      type: i < 10 ? 'FIRST' : i >= totalCount - 10 ? 'LAST' : 'RANDOM'
    }));
  }

  const first10 = Array.from({ length: 10 }, (_, i) => i);
  const last10 = Array.from({ length: 10 }, (_, i) => totalCount - 10 + i);

  const middlePool = Array.from({ length: totalCount - 20 }, (_, i) => i + 10);
  const random10: number[] = [];
  while (random10.length < 10 && middlePool.length > 0) {
    const r = Math.floor(Math.random() * middlePool.length);
    const [val] = middlePool.splice(r, 1);
    random10.push(val);
  }
  random10.sort((a, b) => a - b);

  return [
    ...first10.map(i => ({ index: i, type: 'FIRST' as const })),
    ...random10.map(i => ({ index: i, type: 'RANDOM' as const })),
    ...last10.map(i => ({ index: i, type: 'LAST' as const }))
  ];
}

export async function processD1JsonMigration(db: any, payload: {
  invoices?: any[];
  quotations?: any[];
  products?: any[];
  kbliMappings?: any[];
  kbli_mappings?: any[];
  kbliSuggestions?: any[];
  kbli_suggestions?: any[];
  generalDocuments?: any[];
  general_documents?: any[];
  documents?: any[];
  deeds?: any[];
  privateDeeds?: any[];
  private_deeds?: any[];
  incomingMails?: any[];
  incoming_mails?: any[];
  outgoingMails?: any[];
  outgoing_mails?: any[];
  protestCheques?: any[];
  protest_cheques?: any[];
}) {
  const rawInvoices = Array.isArray(payload.invoices) ? payload.invoices : [];
  const rawQuotations = Array.isArray(payload.quotations) ? payload.quotations : [];
  const rawProducts = Array.isArray(payload.products) ? payload.products : [];
  const rawKbliMappings = Array.isArray(payload.kbliMappings) ? payload.kbliMappings : (Array.isArray(payload.kbli_mappings) ? payload.kbli_mappings : []);
  const rawKbliSuggestions = Array.isArray(payload.kbliSuggestions) ? payload.kbliSuggestions : (Array.isArray(payload.kbli_suggestions) ? payload.kbli_suggestions : []);
  const rawGeneralDocuments = Array.isArray(payload.generalDocuments) 
    ? payload.generalDocuments 
    : (Array.isArray(payload.general_documents) ? payload.general_documents : (Array.isArray(payload.documents) ? payload.documents : []));
  const rawDeeds = Array.isArray(payload.deeds) ? payload.deeds : [];
  const rawPrivateDeeds = Array.isArray(payload.privateDeeds) ? payload.privateDeeds : (Array.isArray(payload.private_deeds) ? payload.private_deeds : []);
  const rawIncomingMails = Array.isArray(payload.incomingMails) ? payload.incomingMails : (Array.isArray(payload.incoming_mails) ? payload.incoming_mails : []);
  const rawOutgoingMails = Array.isArray(payload.outgoingMails) ? payload.outgoingMails : (Array.isArray(payload.outgoing_mails) ? payload.outgoing_mails : []);
  const rawProtestCheques = Array.isArray(payload.protestCheques) ? payload.protestCheques : (Array.isArray(payload.protest_cheques) ? payload.protest_cheques : []);

  await ensureD1TablesExist(db);

  const nowIso = new Date().toISOString();
  const CHUNK_SIZE = 50;

  // 1. INVOICES UPSERT
  let invoicesMigrated = 0;
  let invoicesFailed = 0;
  const invoiceUpsertSql = `
    INSERT INTO invoices (
      id, invoice_number, client_id, client_name, client_source, client_email, client_phone, client_address,
      issue_date, due_date, status, items, subtotal, tax_amount, tax_rate, discount, total_amount, paid_amount, balance_due,
      currency, project_id, project_title, project_ids, project_titles, quotation_id, quotation_number,
      language, notes, terms, bank_details, payment_history, public_token, legacy_public_url, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      invoice_number=excluded.invoice_number,
      client_id=excluded.client_id,
      client_name=excluded.client_name,
      client_source=excluded.client_source,
      client_email=excluded.client_email,
      client_phone=excluded.client_phone,
      client_address=excluded.client_address,
      issue_date=excluded.issue_date,
      due_date=excluded.due_date,
      status=excluded.status,
      items=excluded.items,
      subtotal=excluded.subtotal,
      tax_amount=excluded.tax_amount,
      tax_rate=excluded.tax_rate,
      discount=excluded.discount,
      total_amount=excluded.total_amount,
      paid_amount=excluded.paid_amount,
      balance_due=excluded.balance_due,
      currency=excluded.currency,
      project_id=excluded.project_id,
      project_title=excluded.project_title,
      project_ids=excluded.project_ids,
      project_titles=excluded.project_titles,
      quotation_id=excluded.quotation_id,
      quotation_number=excluded.quotation_number,
      language=excluded.language,
      notes=excluded.notes,
      terms=excluded.terms,
      bank_details=excluded.bank_details,
      payment_history=excluded.payment_history,
      public_token=excluded.public_token,
      legacy_public_url=excluded.legacy_public_url,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawInvoices.length; i += CHUNK_SIZE) {
    const chunk = rawInvoices.slice(i, i + CHUNK_SIZE);
    for (const inv of chunk) {
      try {
        const id = String(inv.id || inv._id);
        const invoiceNumber = inv.invoiceNumber || inv.invoice_number || '';
        const clientId = inv.clientId || inv.client_id || null;
        const clientName = inv.clientName || inv.client_name || '';
        const clientSource = inv.clientSource || inv.client_source || 'local';
        const clientEmail = inv.clientEmail || inv.client_email || null;
        const clientPhone = inv.clientPhone || inv.client_phone || null;
        const clientAddress = inv.clientAddress || inv.client_address || null;
        const issueDate = inv.issueDate || inv.issue_date || inv.date || nowIso.slice(0, 10);
        const dueDate = inv.dueDate || inv.due_date || null;
        const status = inv.status || 'UNPAID';
        const items = typeof inv.items === 'string' ? inv.items : JSON.stringify(inv.items || []);
        const subtotal = Number(inv.subtotal || 0);
        const taxAmount = Number(inv.taxAmount || inv.tax_amount || 0);
        const taxRate = inv.taxRate !== undefined ? Number(inv.taxRate) : (inv.tax_rate !== undefined ? Number(inv.tax_rate) : null);
        const discount = Number(inv.discount || 0);
        const totalAmount = Number(inv.totalAmount || inv.total_amount || 0);
        const paidAmount = Number(inv.paidAmount || inv.paid_amount || 0);
        const balanceDue = Number(inv.balanceDue || inv.balance_due || 0);
        const currency = inv.currency || 'IDR';
        const projectId = inv.projectId || inv.project_id || null;
        const projectTitle = inv.projectTitle || inv.project_title || null;
        const projectIds = inv.projectIds ? (typeof inv.projectIds === 'string' ? inv.projectIds : JSON.stringify(inv.projectIds)) : (inv.project_ids ? (typeof inv.project_ids === 'string' ? inv.project_ids : JSON.stringify(inv.project_ids)) : null);
        const projectTitles = inv.projectTitles ? (typeof inv.projectTitles === 'string' ? inv.projectTitles : JSON.stringify(inv.projectTitles)) : (inv.project_titles ? (typeof inv.project_titles === 'string' ? inv.project_titles : JSON.stringify(inv.project_titles)) : null);
        const quotationId = inv.quotationId || inv.quotation_id || null;
        const quotationNumber = inv.quotationNumber || inv.quotation_number || null;
        const language = inv.language || 'id';
        const notes = inv.notes || null;
        const terms = inv.terms || null;
        const bankDetails = inv.bankDetails ? (typeof inv.bankDetails === 'string' ? inv.bankDetails : JSON.stringify(inv.bankDetails)) : (inv.bank_details ? (typeof inv.bank_details === 'string' ? inv.bank_details : JSON.stringify(inv.bank_details)) : null);
        const paymentHistory = inv.paymentHistory ? (typeof inv.paymentHistory === 'string' ? inv.paymentHistory : JSON.stringify(inv.paymentHistory)) : (inv.payment_history ? (typeof inv.payment_history === 'string' ? inv.payment_history : JSON.stringify(inv.payment_history)) : null);
        const publicToken = inv.publicToken || inv.public_token || null;
        const legacyPublicUrl = inv.legacyPublicUrl || inv.legacy_public_url || null;
        const createdAt = inv.createdAt || inv.created_at || nowIso;
        const updatedAt = inv.updatedAt || inv.updated_at || nowIso;
        const rawData = JSON.stringify(inv);

        await db.prepare(invoiceUpsertSql).bind(
          id, invoiceNumber, clientId, clientName, clientSource, clientEmail, clientPhone, clientAddress,
          issueDate, dueDate, status, items, subtotal, taxAmount, taxRate, discount, totalAmount, paidAmount, balanceDue,
          currency, projectId, projectTitle, projectIds, projectTitles, quotationId, quotationNumber,
          language, notes, terms, bankDetails, paymentHistory, publicToken, legacyPublicUrl, String(createdAt), String(updatedAt), rawData
        ).run();
        invoicesMigrated++;
      } catch (err) {
        console.error(`Failed to upsert invoice ${inv.id}:`, err);
        invoicesFailed++;
      }
    }
  }

  // 2. QUOTATIONS UPSERT
  let quotationsMigrated = 0;
  let quotationsFailed = 0;
  const quotationUpsertSql = `
    INSERT INTO quotations (
      id, quotation_number, date, valid_until, client_id, client_name, client_address,
      client_phone, client_email, client_source, items, subtotal, tax_amount, tax_rate,
      discount, total_amount, status, notes, job_title, public_token, invoice_id,
      invoice_number, project_id, project_title, project_ids, project_titles, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      quotation_number=excluded.quotation_number,
      date=excluded.date,
      valid_until=excluded.valid_until,
      client_id=excluded.client_id,
      client_name=excluded.client_name,
      client_address=excluded.client_address,
      client_phone=excluded.client_phone,
      client_email=excluded.client_email,
      client_source=excluded.client_source,
      items=excluded.items,
      subtotal=excluded.subtotal,
      tax_amount=excluded.tax_amount,
      tax_rate=excluded.tax_rate,
      discount=excluded.discount,
      total_amount=excluded.total_amount,
      status=excluded.status,
      notes=excluded.notes,
      job_title=excluded.job_title,
      public_token=excluded.public_token,
      invoice_id=excluded.invoice_id,
      invoice_number=excluded.invoice_number,
      project_id=excluded.project_id,
      project_title=excluded.project_title,
      project_ids=excluded.project_ids,
      project_titles=excluded.project_titles,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawQuotations.length; i += CHUNK_SIZE) {
    const chunk = rawQuotations.slice(i, i + CHUNK_SIZE);
    for (const quot of chunk) {
      try {
        const id = String(quot.id || quot._id);
        const quotationNumber = quot.quotationNumber || quot.quotation_number || '';
        const date = quot.date || nowIso.slice(0, 10);
        const validUntil = quot.validUntil || quot.valid_until || null;
        const clientId = quot.clientId || quot.client_id || null;
        const clientName = quot.clientName || quot.client_name || '';
        const clientAddress = quot.clientAddress || quot.client_address || null;
        const clientPhone = quot.clientPhone || quot.client_phone || null;
        const clientEmail = quot.clientEmail || quot.client_email || null;
        const clientSource = quot.clientSource || quot.client_source || 'local';
        const items = typeof quot.items === 'string' ? quot.items : JSON.stringify(quot.items || []);
        const subtotal = Number(quot.subtotal || 0);
        const taxAmount = Number(quot.taxAmount || quot.tax_amount || 0);
        const taxRate = quot.taxRate !== undefined ? Number(quot.taxRate) : (quot.tax_rate !== undefined ? Number(quot.tax_rate) : null);
        const discount = Number(quot.discount || 0);
        const totalAmount = Number(quot.totalAmount || quot.total_amount || 0);
        const status = quot.status || 'DRAFT';
        const notes = quot.notes || null;
        const jobTitle = quot.jobTitle || quot.job_title || null;
        const publicToken = quot.publicToken || quot.public_token || null;
        const invoiceId = quot.invoiceId || quot.invoice_id || null;
        const invoiceNumber = quot.invoiceNumber || quot.invoice_number || null;
        const projectId = quot.projectId || quot.project_id || null;
        const projectTitle = quot.projectTitle || quot.project_title || null;
        const projectIds = quot.projectIds ? (typeof quot.projectIds === 'string' ? quot.projectIds : JSON.stringify(quot.projectIds)) : (quot.project_ids ? (typeof quot.project_ids === 'string' ? quot.project_ids : JSON.stringify(quot.project_ids)) : null);
        const projectTitles = quot.projectTitles ? (typeof quot.projectTitles === 'string' ? quot.projectTitles : JSON.stringify(quot.projectTitles)) : (quot.project_titles ? (typeof quot.project_titles === 'string' ? quot.project_titles : JSON.stringify(quot.project_titles)) : null);
        const createdAt = quot.createdAt || quot.created_at || nowIso;
        const updatedAt = quot.updatedAt || quot.updated_at || nowIso;
        const rawData = JSON.stringify(quot);

        await db.prepare(quotationUpsertSql).bind(
          id, quotationNumber, date, validUntil, clientId, clientName, clientAddress,
          clientPhone, clientEmail, clientSource, items, subtotal, taxAmount, taxRate,
          discount, totalAmount, status, notes, jobTitle, publicToken, invoiceId,
          invoiceNumber, projectId, projectTitle, projectIds, projectTitles, String(createdAt), String(updatedAt), rawData
        ).run();
        quotationsMigrated++;
      } catch (err) {
        console.error(`Failed to upsert quotation ${quot.id}:`, err);
        quotationsFailed++;
      }
    }
  }

  // 3. PRODUCTS UPSERT
  let productsMigrated = 0;
  let productsFailed = 0;
  const productUpsertSql = `
    INSERT INTO products (
      id, name, unit_price, description, is_taxed, category, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      unit_price=excluded.unit_price,
      description=excluded.description,
      is_taxed=excluded.is_taxed,
      category=excluded.category,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawProducts.length; i += CHUNK_SIZE) {
    const chunk = rawProducts.slice(i, i + CHUNK_SIZE);
    for (const prod of chunk) {
      try {
        const id = String(prod.id || prod._id);
        const name = prod.name || '';
        const unitPrice = Number(prod.unitPrice || prod.unit_price || 0);
        const description = prod.description || null;
        const isTaxed = (prod.isTaxed || prod.is_taxed) ? 1 : 0;
        const category = prod.category || null;
        const createdAt = prod.createdAt || prod.created_at || nowIso;
        const updatedAt = prod.updatedAt || prod.updated_at || nowIso;
        const rawData = JSON.stringify(prod);

        await db.prepare(productUpsertSql).bind(
          id, name, unitPrice, description, isTaxed, category, String(createdAt), String(updatedAt), rawData
        ).run();
        productsMigrated++;
      } catch (err) {
        console.error(`Failed to upsert product ${prod.id}:`, err);
        productsFailed++;
      }
    }
  }

  // 4. KBLI MAPPINGS UPSERT
  let kbliMappingsMigrated = 0;
  let kbliMappingsFailed = 0;
  const kbliMapUpsertSql = `
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

  for (let i = 0; i < rawKbliMappings.length; i += CHUNK_SIZE) {
    const chunk = rawKbliMappings.slice(i, i + CHUNK_SIZE);
    for (const km of chunk) {
      try {
        const id = String(km.id || km._id);
        const nama = km.nama || km.name || km.namaPT || '';
        const kelompokUsaha = km.kelompokUsaha || km.kelompok_usaha || null;
        const selectedItems = typeof km.selectedItems === 'string' ? km.selectedItems : (typeof km.selected_items === 'string' ? km.selected_items : JSON.stringify(km.selectedItems || km.selected_items || []));
        const updatedAt = km.updatedAt || km.updated_at || nowIso;
        const userId = km.userId || km.user_id || null;
        const createdAt = km.createdAt || km.created_at || nowIso;
        const rawData = JSON.stringify(km);

        await db.prepare(kbliMapUpsertSql).bind(
          id, nama, kelompokUsaha, selectedItems, String(updatedAt), userId, String(createdAt), rawData
        ).run();
        kbliMappingsMigrated++;
      } catch (err) {
        console.error(`Failed to upsert kbli mapping ${km.id}:`, err);
        kbliMappingsFailed++;
      }
    }
  }

  // 5. KBLI SUGGESTIONS UPSERT
  let kbliSuggestionsMigrated = 0;
  let kbliSuggestionsFailed = 0;
  const kbliSuggUpsertSql = `
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

  for (let i = 0; i < rawKbliSuggestions.length; i += CHUNK_SIZE) {
    const chunk = rawKbliSuggestions.slice(i, i + CHUNK_SIZE);
    for (const ks of chunk) {
      try {
        const id = String(ks.id || ks._id);
        const nama = ks.nama || ks.name || ks.namaPT || '';
        const kelompokUsaha = ks.kelompokUsaha || ks.kelompok_usaha || null;
        const selectedItems = typeof ks.selectedItems === 'string' ? ks.selectedItems : (typeof ks.selected_items === 'string' ? ks.selected_items : JSON.stringify(ks.selectedItems || ks.selected_items || []));
        const updatedAt = ks.updatedAt || ks.updated_at || nowIso;
        const userId = ks.userId || ks.user_id || null;
        const createdAt = ks.createdAt || ks.created_at || nowIso;
        const rawData = JSON.stringify(ks);

        await db.prepare(kbliSuggUpsertSql).bind(
          id, nama, kelompokUsaha, selectedItems, String(updatedAt), userId, String(createdAt), rawData
        ).run();
        kbliSuggestionsMigrated++;
      } catch (err) {
        console.error(`Failed to upsert kbli suggestion ${ks.id}:`, err);
        kbliSuggestionsFailed++;
      }
    }
  }

  // 6. GENERAL DOCUMENTS UPSERT
  let generalDocsMigrated = 0;
  let generalDocsFailed = 0;
  const genDocUpsertSql = `
    INSERT INTO general_documents (
      id, doc_type, reference_no, date, client_id, client_name, client_source,
      client_pic, client_address, client_contact, officer_name, destination,
      delivery_method, tracking_number, notes, items, public_token, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      doc_type=excluded.doc_type,
      reference_no=excluded.reference_no,
      date=excluded.date,
      client_id=excluded.client_id,
      client_name=excluded.client_name,
      client_source=excluded.client_source,
      client_pic=excluded.client_pic,
      client_address=excluded.client_address,
      client_contact=excluded.client_contact,
      officer_name=excluded.officer_name,
      destination=excluded.destination,
      delivery_method=excluded.delivery_method,
      tracking_number=excluded.tracking_number,
      notes=excluded.notes,
      items=excluded.items,
      public_token=excluded.public_token,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawGeneralDocuments.length; i += CHUNK_SIZE) {
    const chunk = rawGeneralDocuments.slice(i, i + CHUNK_SIZE);
    for (const gd of chunk) {
      try {
        const id = String(gd.id || gd._id);
        const docType = gd.docType || gd.doc_type || 'RECEIPT';
        const referenceNo = gd.referenceNo || gd.reference_no || '';
        const date = gd.date || '';
        const clientId = gd.clientId || gd.client_id || null;
        const clientName = gd.clientName || gd.client_name || '';
        const clientSource = gd.clientSource || gd.client_source || 'local';
        const clientPic = gd.clientPic || gd.client_pic || null;
        const clientAddress = gd.clientAddress || gd.client_address || null;
        const clientContact = gd.clientContact || gd.client_contact || null;
        const officerName = gd.officerName || gd.officer_name || '';
        const destination = gd.destination || null;
        const deliveryMethod = gd.deliveryMethod || gd.delivery_method || null;
        const trackingNumber = gd.trackingNumber || gd.tracking_number || null;
        const notes = gd.notes || null;
        const items = typeof gd.items === 'string' ? gd.items : JSON.stringify(gd.items || []);
        const publicToken = gd.publicToken || gd.public_token || null;
        const createdAt = gd.createdAt || gd.created_at || nowIso;
        const updatedAt = gd.updatedAt || gd.updated_at || nowIso;
        const rawData = JSON.stringify(gd);

        await db.prepare(genDocUpsertSql).bind(
          id, docType, referenceNo, date, clientId, clientName, clientSource,
          clientPic, clientAddress, clientContact, officerName, destination,
          deliveryMethod, trackingNumber, notes, items, publicToken, String(createdAt), String(updatedAt), rawData
        ).run();
        generalDocsMigrated++;
      } catch (err) {
        console.error(`Failed to upsert general doc ${gd.id}:`, err);
        generalDocsFailed++;
      }
    }
  }

  // 7. DEEDS UPSERT
  let deedsMigrated = 0;
  let deedsFailed = 0;
  const deedUpsertSql = `
    INSERT INTO deeds (
      id, order_number, number, date, title, category, client_id, client_name, job_name,
      pic_name, notes, appearers, grantors, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      order_number=excluded.order_number,
      number=excluded.number,
      date=excluded.date,
      title=excluded.title,
      category=excluded.category,
      client_id=excluded.client_id,
      client_name=excluded.client_name,
      job_name=excluded.job_name,
      pic_name=excluded.pic_name,
      notes=excluded.notes,
      appearers=excluded.appearers,
      grantors=excluded.grantors,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawDeeds.length; i += CHUNK_SIZE) {
    const chunk = rawDeeds.slice(i, i + CHUNK_SIZE);
    for (const d of chunk) {
      try {
        const id = String(d.id || d._id);
        const orderNumber = d.orderNumber || d.order_number || '';
        const number = d.number || d.deedNumber || d.deed_number || '';
        const date = d.date || d.deedDate || d.deed_date || '';
        const title = d.title || d.deedTitle || d.deed_title || '';
        const category = d.category || '';
        const clientId = d.clientId || d.client_id || null;
        const clientName = d.clientName || d.client_name || null;
        const jobName = d.jobName || d.job_name || null;
        const picName = d.picName || d.pic_name || null;
        const notes = d.notes || null;
        const appearers = typeof d.appearers === 'string' ? d.appearers : JSON.stringify(d.appearers || []);
        const grantors = typeof d.grantors === 'string' ? d.grantors : JSON.stringify(d.grantors || []);
        const createdAt = d.createdAt || d.created_at || nowIso;
        const updatedAt = d.updatedAt || d.updated_at || nowIso;
        const rawData = JSON.stringify(d);

        await db.prepare(deedUpsertSql).bind(
          id, orderNumber, number, date, title, category, clientId, clientName, jobName,
          picName, notes, appearers, grantors, String(createdAt), String(updatedAt), rawData
        ).run();
        deedsMigrated++;
      } catch (err) {
        console.error(`Failed to upsert deed ${d.id}:`, err);
        deedsFailed++;
      }
    }
  }

  // 8. PRIVATE DEEDS UPSERT
  let privateDeedsMigrated = 0;
  let privateDeedsFailed = 0;
  const privateDeedUpsertSql = `
    INSERT INTO private_deeds (
      id, number, registration_date, type, description, parties, pic_name, notes, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      number=excluded.number,
      registration_date=excluded.registration_date,
      type=excluded.type,
      description=excluded.description,
      parties=excluded.parties,
      pic_name=excluded.pic_name,
      notes=excluded.notes,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawPrivateDeeds.length; i += CHUNK_SIZE) {
    const chunk = rawPrivateDeeds.slice(i, i + CHUNK_SIZE);
    for (const pd of chunk) {
      try {
        const id = String(pd.id || pd._id);
        const number = pd.number || '';
        const regDate = pd.registrationDate || pd.registration_date || pd.date || '';
        const type = pd.type || 'Legalisasi';
        const description = pd.description || '';
        const parties = typeof pd.parties === 'string' ? pd.parties : JSON.stringify(pd.parties || []);
        const picName = pd.picName || pd.pic_name || null;
        const notes = pd.notes || null;
        const createdAt = pd.createdAt || pd.created_at || nowIso;
        const updatedAt = pd.updatedAt || pd.updated_at || nowIso;
        const rawData = JSON.stringify(pd);

        await db.prepare(privateDeedUpsertSql).bind(
          id, number, regDate, type, description, parties, picName, notes, String(createdAt), String(updatedAt), rawData
        ).run();
        privateDeedsMigrated++;
      } catch (err) {
        console.error(`Failed to upsert private deed ${pd.id}:`, err);
        privateDeedsFailed++;
      }
    }
  }

  // 9. INCOMING MAILS UPSERT
  let incomingMailsMigrated = 0;
  let incomingMailsFailed = 0;
  const inMailUpsertSql = `
    INSERT INTO incoming_mails (
      id, date, mail_number, sender, subject, notes, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      date=excluded.date,
      mail_number=excluded.mail_number,
      sender=excluded.sender,
      subject=excluded.subject,
      notes=excluded.notes,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawIncomingMails.length; i += CHUNK_SIZE) {
    const chunk = rawIncomingMails.slice(i, i + CHUNK_SIZE);
    for (const im of chunk) {
      try {
        const id = String(im.id || im._id);
        const date = im.date || '';
        const mailNumber = im.mailNumber || im.mail_number || '';
        const sender = im.sender || '';
        const subject = im.subject || '';
        const notes = im.notes || null;
        const createdAt = im.createdAt || im.created_at || nowIso;
        const updatedAt = im.updatedAt || im.updated_at || nowIso;
        const rawData = JSON.stringify(im);

        await db.prepare(inMailUpsertSql).bind(
          id, date, mailNumber, sender, subject, notes, String(createdAt), String(updatedAt), rawData
        ).run();
        incomingMailsMigrated++;
      } catch (err) {
        console.error(`Failed to upsert incoming mail ${im.id}:`, err);
        incomingMailsFailed++;
      }
    }
  }

  // 10. OUTGOING MAILS UPSERT
  let outgoingMailsMigrated = 0;
  let outgoingMailsFailed = 0;
  const outMailUpsertSql = `
    INSERT INTO outgoing_mails (
      id, date, mail_number, recipient, subject, attachment_count, notes, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      date=excluded.date,
      mail_number=excluded.mail_number,
      recipient=excluded.recipient,
      subject=excluded.subject,
      attachment_count=excluded.attachment_count,
      notes=excluded.notes,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawOutgoingMails.length; i += CHUNK_SIZE) {
    const chunk = rawOutgoingMails.slice(i, i + CHUNK_SIZE);
    for (const om of chunk) {
      try {
        const id = String(om.id || om._id);
        const date = om.date || '';
        const mailNumber = om.mailNumber || om.mail_number || '';
        const recipient = om.recipient || '';
        const subject = om.subject || '';
        const attachmentCount = Number(om.attachmentCount || om.attachment_count || 0);
        const notes = om.notes || null;
        const createdAt = om.createdAt || om.created_at || nowIso;
        const updatedAt = om.updatedAt || om.updated_at || nowIso;
        const rawData = JSON.stringify(om);

        await db.prepare(outMailUpsertSql).bind(
          id, date, mailNumber, recipient, subject, attachmentCount, notes, String(createdAt), String(updatedAt), rawData
        ).run();
        outgoingMailsMigrated++;
      } catch (err) {
        console.error(`Failed to upsert outgoing mail ${om.id}:`, err);
        outgoingMailsFailed++;
      }
    }
  }

  // 11. PROTEST CHEQUES UPSERT
  let protestChequesMigrated = 0;
  let protestChequesFailed = 0;
  const protestUpsertSql = `
    INSERT INTO protest_cheques (
      id, number, protest_date, bank_name, cheque_number, amount, applicant_name, drawer_name, reason, notes, created_at, updated_at, raw_data
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      number=excluded.number,
      protest_date=excluded.protest_date,
      bank_name=excluded.bank_name,
      cheque_number=excluded.cheque_number,
      amount=excluded.amount,
      applicant_name=excluded.applicant_name,
      drawer_name=excluded.drawer_name,
      reason=excluded.reason,
      notes=excluded.notes,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      raw_data=excluded.raw_data
  `;

  for (let i = 0; i < rawProtestCheques.length; i += CHUNK_SIZE) {
    const chunk = rawProtestCheques.slice(i, i + CHUNK_SIZE);
    for (const pc of chunk) {
      try {
        const id = String(pc.id || pc._id);
        const number = pc.number || '';
        const protestDate = pc.protestDate || pc.protest_date || '';
        const bankName = pc.bankName || pc.bank_name || '';
        const chequeNumber = pc.chequeNumber || pc.cheque_number || '';
        const amount = Number(pc.amount || 0);
        const applicantName = pc.applicantName || pc.applicant_name || '';
        const drawerName = pc.drawerName || pc.drawer_name || '';
        const reason = pc.reason || null;
        const notes = pc.notes || null;
        const createdAt = pc.createdAt || pc.created_at || nowIso;
        const updatedAt = pc.updatedAt || pc.updated_at || nowIso;
        const rawData = JSON.stringify(pc);

        await db.prepare(protestUpsertSql).bind(
          id, number, protestDate, bankName, chequeNumber, amount, applicantName, drawerName, reason, notes, String(createdAt), String(updatedAt), rawData
        ).run();
        protestChequesMigrated++;
      } catch (err) {
        console.error(`Failed to upsert protest cheque ${pc.id}:`, err);
        protestChequesFailed++;
      }
    }
  }

  // READ ALL FROM D1 FOR VERIFICATION
  const d1InvoicesAll = (await db.prepare("SELECT * FROM invoices ORDER BY id ASC").all())?.results || [];
  const d1QuotationsAll = (await db.prepare("SELECT * FROM quotations ORDER BY id ASC").all())?.results || [];
  const d1ProductsAll = (await db.prepare("SELECT * FROM products ORDER BY id ASC").all())?.results || [];
  const d1KbliMappingsAll = (await db.prepare("SELECT * FROM kbli_mapping_records ORDER BY id ASC").all())?.results || [];
  const d1KbliSuggestionsAll = (await db.prepare("SELECT * FROM kbli_suggestion_records ORDER BY id ASC").all())?.results || [];
  const d1GeneralDocsAll = (await db.prepare("SELECT * FROM general_documents ORDER BY id ASC").all())?.results || [];
  const d1DeedsAll = (await db.prepare("SELECT * FROM deeds ORDER BY id ASC").all())?.results || [];
  const d1PrivateDeedsAll = (await db.prepare("SELECT * FROM private_deeds ORDER BY id ASC").all())?.results || [];
  const d1IncomingMailsAll = (await db.prepare("SELECT * FROM incoming_mails ORDER BY id ASC").all())?.results || [];
  const d1OutgoingMailsAll = (await db.prepare("SELECT * FROM outgoing_mails ORDER BY id ASC").all())?.results || [];
  const d1ProtestChequesAll = (await db.prepare("SELECT * FROM protest_cheques ORDER BY id ASC").all())?.results || [];

  // Helper validation comparator
  const runValidation = (rawList: any[], d1List: any[], matchFn: (jItem: any, dRow: any, diffs: any[]) => void) => {
    const sortedJson = [...rawList].sort((a, b) => String(a.id || a._id).localeCompare(String(b.id || b._id)));
    const samples = selectValidationIndices(sortedJson.length);
    return samples.map(({ index, type }) => {
      const jItem = sortedJson[index];
      const jId = String(jItem.id || jItem._id);
      const dRow = d1List.find((r: any) => r.id === jId);
      if (!dRow) {
        return { index, type, id: jId, match: false, reason: "Row not found in D1", mismatches: [{ field: 'id', json: jId, d1: 'MISSING' }] };
      }
      const diffs: any[] = [];
      matchFn(jItem, dRow, diffs);
      return { index, type, id: jId, match: diffs.length === 0, mismatches: diffs };
    });
  };

  const deedsComparisons = runValidation(rawDeeds, d1DeedsAll, (jItem, dRow, diffs) => {
    const jNum = String(jItem.number || jItem.deedNumber || '').trim();
    const dNum = String(dRow.number || '').trim();
    if (jNum && dNum && jNum !== dNum) diffs.push({ field: 'number', json: jNum, d1: dNum });
  });

  const privateDeedsComparisons = runValidation(rawPrivateDeeds, d1PrivateDeedsAll, (jItem, dRow, diffs) => {
    const jNum = String(jItem.number || '').trim();
    const dNum = String(dRow.number || '').trim();
    if (jNum && dNum && jNum !== dNum) diffs.push({ field: 'number', json: jNum, d1: dNum });
  });

  const incomingMailsComparisons = runValidation(rawIncomingMails, d1IncomingMailsAll, (jItem, dRow, diffs) => {
    const jNum = String(jItem.mailNumber || jItem.mail_number || '').trim();
    const dNum = String(dRow.mail_number || '').trim();
    if (jNum && dNum && jNum !== dNum) diffs.push({ field: 'mailNumber', json: jNum, d1: dNum });
  });

  const outgoingMailsComparisons = runValidation(rawOutgoingMails, d1OutgoingMailsAll, (jItem, dRow, diffs) => {
    const jNum = String(jItem.mailNumber || jItem.mail_number || '').trim();
    const dNum = String(dRow.mail_number || '').trim();
    if (jNum && dNum && jNum !== dNum) diffs.push({ field: 'mailNumber', json: jNum, d1: dNum });
  });

  const genDocComparisons = runValidation(rawGeneralDocuments, d1GeneralDocsAll, (jItem, dRow, diffs) => {
    const jRef = String(jItem.referenceNo || jItem.reference_no || '').trim();
    const dRef = String(dRow.reference_no || '').trim();
    if (jRef && dRef && jRef !== dRef) diffs.push({ field: 'referenceNo', json: jRef, d1: dRef });
  });

  const deedsValid = rawDeeds.length === 0 || deedsComparisons.every(c => c.match);
  const privateDeedsValid = rawPrivateDeeds.length === 0 || privateDeedsComparisons.every(c => c.match);
  const inMailsValid = rawIncomingMails.length === 0 || incomingMailsComparisons.every(c => c.match);
  const outMailsValid = rawOutgoingMails.length === 0 || outgoingMailsComparisons.every(c => c.match);
  const genDocsValid = rawGeneralDocuments.length === 0 || genDocComparisons.every(c => c.match);

  const isAllSuccessful = (deedsFailed + privateDeedsFailed + incomingMailsFailed + outgoingMailsFailed + generalDocsFailed + invoicesFailed + quotationsFailed + productsFailed + kbliMappingsFailed + kbliSuggestionsFailed) === 0;

  return {
    success: isAllSuccessful,
    deeds: {
      jsonCount: rawDeeds.length,
      d1Count: d1DeedsAll.length,
      migrated: deedsMigrated,
      failed: deedsFailed,
      validatedCount: `${deedsComparisons.filter(c => c.match).length} / ${deedsComparisons.length} samples`,
      isValid: deedsValid,
      samples: deedsComparisons
    },
    privateDeeds: {
      jsonCount: rawPrivateDeeds.length,
      d1Count: d1PrivateDeedsAll.length,
      migrated: privateDeedsMigrated,
      failed: privateDeedsFailed,
      validatedCount: `${privateDeedsComparisons.filter(c => c.match).length} / ${privateDeedsComparisons.length} samples`,
      isValid: privateDeedsValid,
      samples: privateDeedsComparisons
    },
    incomingMails: {
      jsonCount: rawIncomingMails.length,
      d1Count: d1IncomingMailsAll.length,
      migrated: incomingMailsMigrated,
      failed: incomingMailsFailed,
      validatedCount: `${incomingMailsComparisons.filter(c => c.match).length} / ${incomingMailsComparisons.length} samples`,
      isValid: inMailsValid,
      samples: incomingMailsComparisons
    },
    outgoingMails: {
      jsonCount: rawOutgoingMails.length,
      d1Count: d1OutgoingMailsAll.length,
      migrated: outgoingMailsMigrated,
      failed: outgoingMailsFailed,
      validatedCount: `${outgoingMailsComparisons.filter(c => c.match).length} / ${outgoingMailsComparisons.length} samples`,
      isValid: outMailsValid,
      samples: outgoingMailsComparisons
    },
    generalDocuments: {
      jsonCount: rawGeneralDocuments.length,
      d1Count: d1GeneralDocsAll.length,
      migrated: generalDocsMigrated,
      failed: generalDocsFailed,
      validatedCount: `${genDocComparisons.filter(c => c.match).length} / ${genDocComparisons.length} samples`,
      isValid: genDocsValid,
      samples: genDocComparisons
    }
  };
}
